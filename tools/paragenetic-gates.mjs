/**
 * Paragenetic Constraint Solver - the "diagenetic logic gates", prototype.
 *
 * The question is not "which minerals occur together" but "given what survived
 * intact, what must have happened first". An alteration event carries a fluid or
 * thermal envelope. A mineral observed INTACT could not have been sitting there
 * while an envelope outside its own survival limits passed through. That is the
 * whole engine; everything else is bookkeeping and honesty.
 *
 * The envelopes are NOT invented here. They are read from data/minerals.json,
 * which already separates two different things:
 *
 *   GROWTH   T_range_C, T_optimum_C, MINERAL_GATES  - where a crystal can form
 *   SURVIVAL pH_dissolution_below/_above,           - where a crystal is destroyed
 *            acid_dissolution, thermal_decomp_C
 *
 * Conflating those two is the single easiest way to produce a confident wrong
 * answer, so this tool reads only the survival fields and says so in every
 * receipt. A mineral that merely *grows* hot is not thereby destroyed when cold.
 *
 *   node paragenetic-gates.mjs                 # the worked example
 *   node paragenetic-gates.mjs --spec s.json   # a specimen of your own
 *   node paragenetic-gates.mjs --coverage      # how much of the catalogue can answer
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MINERALS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;

/* ------------------------------------------------------------------ *
 * VERDICTS - never yes/no. Rock Bot's ladder, in strength order.
 * ------------------------------------------------------------------ */
const VERDICT = {
  required: 'required',
  strongly_implied: 'strongly implied',
  compatible: 'compatible',
  ambiguous: 'ambiguous',
  contradicted: 'contradicted',
};

/* ------------------------------------------------------------------ *
 * ENVELOPES
 * ------------------------------------------------------------------ */

/**
 * The pH window a mineral survives in, read ONLY from the two fields whose
 * names state their own direction.
 *
 * `acid_dissolution.pH_threshold` is deliberately NOT trusted for a bound. It
 * usually duplicates pH_dissolution_below, but for jarosite, alunite, antlerite
 * and scorodite it carries an UPPER bound while pH_dissolution_below is absent
 * entirely - those records say so in a note ("Inverse of typical
 * acid_dissolution semantics"). Reading the threshold as a floor turns an
 * acid-loving mineral into one destroyed by acid, which is not a rounding
 * error: it manufactures a paragenesis out of the mineral's home turf. The
 * threshold is still used for the reagent it names (HF etching needs F) and for
 * its reaction text, never for a direction.
 *
 *   acidLimit   destroyed when pH falls BELOW this  (pH_dissolution_below)
 *   alkaliLimit destroyed when pH rises ABOVE this  (pH_dissolution_above)
 */
export function stabilityWindow(species) {
  const rec = MINERALS[species];
  if (!rec) return null;
  const acidLimit = rec.pH_dissolution_below ?? null;
  const alkaliLimit = rec.pH_dissolution_above ?? null;
  if (acidLimit == null && alkaliLimit == null) return null;
  return { acidLimit, alkaliLimit, agent: rec.acid_dissolution?.requires ?? null };
}

/**
 * The fluid that would dissolve a mineral, taken from its own record.
 * Returns null when the catalogue does not say - an unknown, never an assumption.
 *
 * A record carrying BOTH bounds describes a two-sided fork (brochantite is
 * stable pH 3-7 and dissolves either way out). Which way the fluid actually
 * went is not recoverable from the fact of dissolution, so the event is marked
 * `fork` and constrains nothing until an observer says which limb it took.
 */
export function dissolutionEnvelope(species) {
  const rec = MINERALS[species];
  const window = stabilityWindow(species);
  if (!window) return null;
  const requires = rec.acid_dissolution?.requires || null;
  const reaction = rec.acid_dissolution?.reaction || null;
  const field = f => 'data/minerals.json ' + species + '.' + f;
  if (window.acidLimit != null && window.alkaliLimit != null) {
    return {
      kind: 'fluid', direction: 'fork',
      pH_acid: window.acidLimit, pH_alkali: window.alkaliLimit,
      requires, reaction,
      cite: field('pH_dissolution_below') + ' + ' + field('pH_dissolution_above'),
    };
  }
  if (window.acidLimit != null) {
    return {
      kind: 'fluid', direction: 'acid', pH: window.acidLimit, requires, reaction,
      cite: field('pH_dissolution_below'),
    };
  }
  return {
    kind: 'fluid', direction: 'alkaline', pH: window.alkaliLimit, requires, reaction,
    cite: field('pH_dissolution_above'),
  };
}

/** The heating event a mineral's own decomposition implies. */
export function thermalEnvelope(species) {
  const rec = MINERALS[species];
  if (!rec || rec.thermal_decomp_C == null) return null;
  return {
    kind: 'thermal',
    T_above: rec.thermal_decomp_C,
    reaction: rec.thermal_decomp_reaction || null,
    cite: 'data/minerals.json ' + species + '.thermal_decomp_C',
  };
}

/**
 * Could `species` sit intact through `envelope`?
 *   true  - survives
 *   false - destroyed
 *   null  - the catalogue does not say
 */
export function survives(species, envelope) {
  const rec = MINERALS[species];
  if (!rec || !envelope) return null;
  if (envelope.kind === 'fluid') {
    // A fork event has no known direction, so it cannot test anything.
    if (envelope.direction === 'fork') return null;
    if (envelope.direction === 'acid') {
      // The mineral only dissolves with a reagent this event does not carry.
      if (rec.acid_dissolution?.requires && !envelope.requires) return true;
      const limit = rec.pH_dissolution_below;
      if (limit == null) return true;          // no acid-side limit to breach
      if (limit === envelope.pH) return null;  // exact tie - refuse, don't guess
      return limit < envelope.pH;
    }
    const limit = rec.pH_dissolution_above;
    if (limit == null) return true;            // no alkaline-side limit to breach
    if (limit === envelope.pH) return null;
    return limit > envelope.pH;
  }
  if (envelope.kind === 'thermal') {
    const ceiling = rec.thermal_decomp_C;
    if (ceiling == null) return null;
    if (ceiling === envelope.T_above) return null;
    return envelope.T_above < ceiling;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * THE GATE
 * ------------------------------------------------------------------ */

/**
 * `intact` was observed whole. `event` happened. Did `intact` come after?
 * `contact` is what the collector could actually see:
 *   'on-altered-surface' - it sits on the altered face (physical superposition)
 *   'same-specimen'      - merely present
 *   'enclosed-by'        - it is inside the altered crystal (predates it)
 */
export function orderConstraint(intact, event, contact = 'same-specimen') {
  const lived = survives(intact, event.envelope);
  // `order` is stated, never implied by the verdict. Enclosure can make an order
  // REQUIRED in the opposite direction to everything else this tool derives, and
  // a strength that does not say which way round is not an answer.
  const base = {
    mineral: intact, event: event.label, contact, order: 'none',
    envelope: event.envelope, evidence: [event.envelope.cite],
  };
  const rec = MINERALS[intact] || {};
  const env = event.envelope;
  // The field that actually supplied the mineral's limit, so the receipt cites
  // the number it used rather than a plausible-looking neighbour.
  const limitField = env.kind !== 'fluid' ? 'thermal_decomp_C'
    : env.direction === 'acid' ? 'pH_dissolution_below' : 'pH_dissolution_above';
  const limit = rec[limitField];

  if (lived === null) {
    const tie = limit != null
      && limit === (env.kind === 'fluid' ? env.pH : env.T_above);
    let why;
    if (env.direction === 'fork') {
      why = 'The record for this event describes a two-sided pH fork, so which way the '
        + 'fluid went is not recoverable from the fact of dissolution. Until an observer '
        + 'says which limb it took, it constrains nothing.';
    } else if (tie) {
      why = intact + ' sits exactly on this envelope boundary, where the catalogue '
        + 'cannot separate survival from destruction. Kinetics and duration decide it, '
        + 'and neither is recorded.';
    } else {
      why = 'The catalogue records no ' + (env.kind === 'fluid'
        ? (env.direction === 'acid' ? 'acid-side' : 'alkaline-side') + ' pH limit'
        : 'thermal limit') + ' for ' + intact
        + ', so this event constrains nothing. Absence of a datum is not survival.';
    }
    return { ...base, verdict: VERDICT.ambiguous, because: why };
  }
  if (lived === true) {
    // Enclosure is a PHYSICAL order, independent of any envelope: an inclusion
    // predates the zone that wraps it. Survival does not erase that.
    if (contact === 'enclosed-by') {
      return { ...base, verdict: VERDICT.required, order: 'predates',
        because: intact + ' survives this envelope, so the fluid settles nothing - but it '
          + 'is reported enclosed by the altered crystal, and an inclusion predates the '
          + 'zone that wraps it. The order comes from the enclosure, not the chemistry.' };
    }
    return { ...base, verdict: VERDICT.compatible,
      because: intact + ' survives this envelope, so it may have been present '
        + 'before, during or after. No order is established.' };
  }
  const detail = env.kind === 'fluid'
    ? (env.direction === 'acid'
      ? intact + ' dissolves below pH ' + limit + ', and this event ran below pH ' + env.pH
      : intact + ' dissolves above pH ' + limit + ', and this event ran above pH ' + env.pH)
    : intact + ' decomposes above ' + limit + ' C, and this event exceeded '
      + env.T_above + ' C';
  base.evidence.push('data/minerals.json ' + intact + '.' + limitField);
  if (contact === 'enclosed-by') {
    return { ...base, verdict: VERDICT.contradicted, order: 'conflict',
      because: detail + ', yet it is reported enclosed by the altered crystal, '
        + 'which would place it earlier. One of the two observations is wrong.' };
  }
  return {
    ...base,
    order: 'postdates',
    verdict: contact === 'on-altered-surface' ? VERDICT.required : VERDICT.strongly_implied,
    because: detail + '. Intact ' + intact + ' therefore postdates it'
      + (contact === 'on-altered-surface'
        ? ', and it sits on the altered surface, which fixes the order physically.'
        : '. It is only "strongly implied" because nothing was reported about where '
          + 'on the specimen the two sit relative to each other.'),
  };
}

/* ------------------------------------------------------------------ *
 * SPECIMEN -> PARTIAL ORDER
 * ------------------------------------------------------------------ */

export function solve(spec) {
  const events = [];
  const caveats = [];
  for (const alt of spec.alterations || []) {
    if (alt.kind === 'dissolution') {
      if (!alt.texture_observed) {
        caveats.push('Dissolution of ' + alt.of + ' was asserted without a texture '
          + 'observation. Skeletal or hopper growth looks similar and is not '
          + 'dissolution; this event was NOT used.');
        continue;
      }
      const envelope = dissolutionEnvelope(alt.of);
      if (!envelope) {
        caveats.push('No dissolution envelope recorded for ' + alt.of
          + '; this event was NOT used.');
        continue;
      }
      events.push({ label: 'dissolution of ' + alt.of, of: alt.of, envelope });
      if (/skeletal|hopper/.test(alt.texture_observed)) {
        caveats.push('The texture on ' + alt.of + ' was logged as "' + alt.texture_observed
          + '", which is a growth texture, not a dissolution one. Verify before trusting '
          + 'any order below.');
      }
    }
    if (alt.kind === 'heating') {
      // An observer-supplied heating with no temperature is not a weak event, it
      // is no event: T_above would be undefined and every comparison against it
      // returns false, which reads as "destroyed" and condemns the whole specimen.
      if (!alt.of && !Number.isFinite(alt.T_C)) {
        caveats.push('A heating event was declared with neither a mineral to derive it '
          + 'from nor a numeric T_C; there is no envelope to test, so it was NOT used.');
        continue;
      }
      const envelope = alt.of
        ? thermalEnvelope(alt.of)
        : { kind: 'thermal', T_above: alt.T_C, reaction: null, cite: 'observer-supplied' };
      if (!envelope) {
        caveats.push('No thermal decomposition datum for ' + alt.of + '; event NOT used.');
        continue;
      }
      events.push({ label: 'heating past ' + envelope.T_above + ' C', of: alt.of, envelope });
      caveats.push('Thermal survival ignores exposure duration, pressure and fluid. '
        + 'A decomposition temperature is a threshold, not a stopwatch.');
    }
  }

  const constraints = [];
  for (const event of events) {
    for (const m of spec.minerals || []) {
      if (!m.intact) continue;
      if (m.species === event.of) continue;
      constraints.push(orderConstraint(m.species, event, m.contact));
    }
  }
  return { events, constraints, caveats };
}

/* ------------------------------------------------------------------ *
 * REPORT
 * ------------------------------------------------------------------ */

function report(spec, out) {
  const line = s => process.stdout.write(s + '\n');
  line('');
  line('SPECIMEN: ' + (spec.label || 'unnamed'));
  line('  observed: ' + (spec.minerals || []).map(m =>
    m.species + (m.intact ? ' (intact' : ' (altered')
      + (m.contact ? ', ' + m.contact : '') + ')').join(', '));
  line('');
  line('DERIVED EVENTS');
  if (!out.events.length) line('  none usable');
  out.events.forEach((e, i) => {
    line('  E' + (i + 1) + '  ' + e.label);
    const env = e.envelope;
    const fluidText = env.direction === 'fork'
      ? 'pH < ' + env.pH_acid + ' OR pH > ' + env.pH_alkali + ' (two-sided fork, direction unknown)'
      : env.direction === 'acid' ? 'pH < ' + env.pH : 'pH > ' + env.pH;
    line('      envelope: ' + (env.kind === 'fluid'
      ? fluidText + (env.requires ? ', requires ' + JSON.stringify(env.requires) : '')
        + (env.reaction ? ' [' + env.reaction + ']' : '')
      : 'T > ' + env.T_above + ' C'));
    line('      from:     ' + env.cite);
  });
  line('');
  line('ORDER CONSTRAINTS');
  const rank = { required: 0, 'strongly implied': 1, contradicted: 2, compatible: 3, ambiguous: 4 };
  const sorted = [...out.constraints].sort((a, b) => rank[a.verdict] - rank[b.verdict]);
  for (const c of sorted) {
    const arrow = { postdates: '  ->  ', predates: '  <-  ', conflict: '  ><  ', none: '   ?  ' }[c.order];
    const gloss = {
      postdates: c.mineral + ' postdates the event',
      predates: c.mineral + ' predates the event',
      conflict: 'the two observations disagree',
      none: 'no order established',
    }[c.order];
    line('  [' + c.verdict.toUpperCase() + '] ' + c.event + arrow + c.mineral + '   (' + gloss + ')');
    line('      ' + c.because);
    for (const cite of c.evidence) line('      cite: ' + cite);
  }
  if (out.caveats.length) {
    line('');
    line('CAVEATS');
    for (const c of out.caveats) line('  - ' + c);
  }
  line('');
}

/* ------------------------------------------------------------------ *
 * COVERAGE - an instrument must be able to say "I cannot answer".
 * ------------------------------------------------------------------ */

function coverage() {
  const all = Object.keys(MINERALS);
  const fluid = all.filter(m => dissolutionEnvelope(m));
  const thermal = all.filter(m => thermalEnvelope(m));
  const both = all.filter(m => dissolutionEnvelope(m) && thermalEnvelope(m));
  const neither = all.filter(m => !dissolutionEnvelope(m) && !thermalEnvelope(m));
  process.stdout.write('\nGATE COVERAGE over ' + all.length + ' species\n');
  process.stdout.write('  fluid/pH envelope:   ' + fluid.length + '\n');
  process.stdout.write('  thermal envelope:    ' + thermal.length + '\n');
  process.stdout.write('  both:                ' + both.length + '\n');
  process.stdout.write('  neither (mute):      ' + neither.length + '\n');
  process.stdout.write('  mute species: ' + neither.slice(0, 14).join(', ')
    + (neither.length > 14 ? ', ...' : '') + '\n\n');
}

/* ------------------------------------------------------------------ *
 * The worked example: the Professor's specimen.
 * ------------------------------------------------------------------ */
const WORKED = {
  label: "etched quartz with intact calcite (the Professor's specimen)",
  minerals: [
    { species: 'quartz', intact: false },
    { species: 'calcite', intact: true, contact: 'on-altered-surface' },
    { species: 'fluorite', intact: true, contact: 'same-specimen' },
    { species: 'pyrite', intact: true, contact: 'same-specimen' },
  ],
  alterations: [
    { kind: 'dissolution', of: 'quartz', texture_observed: 'etch pits, frosted faces' },
  ],
};

const argv = process.argv.slice(2);
if (argv.includes('--coverage')) {
  coverage();
} else {
  const i = argv.indexOf('--spec');
  const spec = i >= 0 ? JSON.parse(fs.readFileSync(argv[i + 1], 'utf8')) : WORKED;
  report(spec, solve(spec));
}
