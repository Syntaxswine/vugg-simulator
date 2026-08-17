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
 * The fluid that would dissolve/etch a mineral, taken from its own record.
 * Returns null when the catalogue does not say - an unknown, never an assumption.
 */
export function dissolutionEnvelope(species) {
  const rec = MINERALS[species];
  if (!rec) return null;
  const acid = rec.acid_dissolution;
  const below = rec.pH_dissolution_below;
  if (acid && acid.pH_threshold != null) {
    return {
      kind: 'fluid',
      pH_below: acid.pH_threshold,
      requires: acid.requires || null,
      reaction: acid.reaction || null,
      cite: 'data/minerals.json ' + species + '.acid_dissolution',
    };
  }
  if (below != null) {
    return {
      kind: 'fluid', pH_below: below, requires: null, reaction: null,
      cite: 'data/minerals.json ' + species + '.pH_dissolution_below',
    };
  }
  return null;
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
    const floor = rec.acid_dissolution?.pH_threshold ?? rec.pH_dissolution_below;
    if (floor == null) return null;
    // The event drives pH below envelope.pH_below. The mineral dissolves below
    // `floor`. It survives only if the fluid never gets under its own floor.
    const needsAgent = rec.acid_dissolution?.requires;
    if (needsAgent && !envelope.requires) {
      // The mineral only dissolves with an agent this event does not carry.
      return true;
    }
    // The event drove the fluid BELOW envelope.pH_below; the mineral dissolves
    // BELOW floor. So it survives only if its floor sits under the fluid's reach.
    // At an exact tie the data cannot separate them - refuse rather than guess.
    if (floor === envelope.pH_below) return null;
    return floor < envelope.pH_below;
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
  const base = {
    mineral: intact, event: event.label, contact,
    envelope: event.envelope, evidence: [event.envelope.cite],
  };
  if (lived === null) {
    const rec = MINERALS[intact] || {};
    const floor = rec.acid_dissolution?.pH_threshold ?? rec.pH_dissolution_below;
    const tie = event.envelope.kind === 'fluid'
      ? floor != null && floor === event.envelope.pH_below
      : rec.thermal_decomp_C != null && rec.thermal_decomp_C === event.envelope.T_above;
    return { ...base, verdict: VERDICT.ambiguous,
      because: tie
        ? intact + ' sits exactly on this envelope boundary, where the catalogue '
          + 'cannot separate survival from destruction. Kinetics and duration decide '
          + 'it, and neither is recorded.'
        : 'The catalogue records no survival limit for ' + intact
          + ', so this event constrains nothing. Absence of a datum is not survival.' };
  }
  if (lived === true) {
    return { ...base, verdict: VERDICT.compatible,
      because: intact + ' survives this envelope, so it may have been present '
        + 'before, during or after. No order is established.' };
  }
  const floor = MINERALS[intact].acid_dissolution?.pH_threshold
    ?? MINERALS[intact].pH_dissolution_below;
  const detail = event.envelope.kind === 'fluid'
    ? intact + ' dissolves below pH ' + floor + ', and this event ran below pH '
      + event.envelope.pH_below
    : intact + ' decomposes above ' + MINERALS[intact].thermal_decomp_C
      + ' C, and this event exceeded ' + event.envelope.T_above + ' C';
  base.evidence.push('data/minerals.json ' + intact
    + (event.envelope.kind === 'fluid' ? '.acid_dissolution' : '.thermal_decomp_C'));
  if (contact === 'enclosed-by') {
    return { ...base, verdict: VERDICT.contradicted,
      because: detail + ', yet it is reported enclosed by the altered crystal, '
        + 'which would place it earlier. One of the two observations is wrong.' };
  }
  return {
    ...base,
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
    line('      envelope: ' + (env.kind === 'fluid'
      ? 'pH < ' + env.pH_below + (env.requires ? ', requires ' + JSON.stringify(env.requires) : '')
        + (env.reaction ? ' [' + env.reaction + ']' : '')
      : 'T > ' + env.T_above + ' C'));
    line('      from:     ' + env.cite);
  });
  line('');
  line('ORDER CONSTRAINTS');
  const rank = { required: 0, 'strongly implied': 1, contradicted: 2, compatible: 3, ambiguous: 4 };
  const sorted = [...out.constraints].sort((a, b) => rank[a.verdict] - rank[b.verdict]);
  for (const c of sorted) {
    line('  [' + c.verdict.toUpperCase() + '] ' + c.event + '  ->  ' + c.mineral);
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
