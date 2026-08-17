/**
 * Build the crystal relationship graph: every mineral in the catalog, plus the
 * relations the ENGINE actually enforces or merely prefers — kept apart.
 *
 * The first version of this tool drew "must have" and "likes to sit on" as one
 * arrow and then computed roots, depth and reach on the mixture. Measurement
 * (tools/substrate-escape-census.mjs) showed 129 of 137 observed species
 * nucleate on the bare wall at least once, so almost none of that was
 * dependency. The schema below keeps the two apart by construction.
 *
 * TWO MODES
 *   strict  — absence-blocking or state-changing edges only. A species cannot
 *             appear without its source, or it IS its source, transformed.
 *             Roots, depth and reach are meaningful here and nowhere else.
 *   growth  — preference and opportunity: where a crystal likes to sit, and
 *             whose dissolution it can exploit. Counts here are "observed
 *             relationships", never dependencies.
 *
 * EVERY EDGE CARRIES ITS EVIDENCE
 *   relation      required_prerequisite | transformation | preferred_substrate
 *                 | replacement_opportunity | co_presence
 *   source_state  active | dissolving | either | present | transformed
 *   evidence.basis      code-guard | transition-function | code-reference
 *   evidence.cite       exact file:line, or the transition function
 *   evidence.certainty  proved    — the engine blocks, or transforms, in code
 *                       observed  — the runtime census actually saw this pairing
 *                       inferred  — the code names it, no run confirmed it
 *
 *   node tools/gen-crystal-flow-tree.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'data', 'generated', 'crystal-flow-tree.json');
const CENSUS = path.join(ROOT, 'data', 'generated', 'substrate-escape-census.json');
const CHECK = process.argv.includes('--check');

const NUCLEATION_FILES = fs.readdirSync(path.join(ROOT, 'js'))
  .filter(f => /^(8[0-9][a-z]?|9[01])-nucleation-.*\.ts$/.test(f))
  .sort();

/* ------------------------------------------------------------------ *
 * Hard gates are DECLARED, then verified against the source.
 * There are two in the whole engine set. Finding them by pattern proved
 * unreliable (a filter bound on one line and tested three lines later defeats
 * a regex, and that failure silently produced "0 hard gates"), so they are
 * named here and the tool refuses to run if the guard text has moved.
 * ------------------------------------------------------------------ */
const HARD_GATES = [
  {
    from: 'crocidolite', to: 'tigers_eye', relation: 'required_prerequisite',
    source_state: 'active', file: 'js/89-nucleation-silicate.ts',
    guard: 'if (!substrates.length) return;',
    note: 'The gate filters for crocidolite and gives up when none is present — '
      + 'the rung-3 ruling, enforced.',
  },
  {
    from: 'birnessite', to: 'todorokite', relation: 'transformation',
    source_state: 'transformed', required_precursor: true,
    file: 'js/87-nucleation-oxide.ts',
    guard: 'if (!precursor) return; // no scientifically licensed bare-wall fallback',
    transition: 'applyBirnessiteTodorokiteTransition (js/75-transitions.ts)',
    note: 'A transformation that also blocks without its precursor — recorded once, '
      + 'as a transformation carrying required_precursor, not as two unrelated facts.',
  },
];

/* Transformations: one crystal becoming another, read from js/75-transitions.ts. */
const TRANSITION_FILE = 'js/75-transitions.ts';
function readTransformations(known) {
  const src = fs.readFileSync(path.join(ROOT, TRANSITION_FILE), 'utf8');
  const lineOf = (needle) => src.slice(0, src.indexOf(needle)).split('\n').length;
  const edges = [];
  const table = (name, mechanism) => {
    const start = src.indexOf(`const ${name} = {`);
    if (start < 0) throw new Error(`transition table missing: ${name}`);
    const body = src.slice(start, src.indexOf('};', start));
    const base = src.slice(0, start).split('\n').length;
    for (const m of body.matchAll(/^\s*([a-z_]+):\s*\['([a-z_-]+)'/gm)) {
      edges.push({
        from: m[1], to: m[2], mechanism,
        cite: `${TRANSITION_FILE}:${base + body.slice(0, m.index).split('\n').length - 1}`,
      });
    }
  };
  table('PARAMORPH_TRANSITIONS', 'paramorph inversion');
  table('DEHYDRATION_TRANSITIONS', 'dehydration');
  table('LIGHT_TRANSITIONS', 'light exposure');

  // The CaSO4 pair is written as a ternary, not a table, and runs both ways.
  const caso4 = "const to = from === 'selenite' ? 'anhydrite' : 'selenite';";
  if (!src.includes(caso4)) throw new Error('CaSO4 phase transition shape changed');
  const caLine = `${TRANSITION_FILE}:${lineOf(caso4)}`;
  edges.push({ from: 'selenite', to: 'anhydrite', mechanism: 'CaSO4 phase change', cite: caLine, reversible: true });
  edges.push({ from: 'anhydrite', to: 'selenite', mechanism: 'CaSO4 phase change', cite: caLine, reversible: true });

  return edges.filter(e => {
    if (known.has(e.from) && known.has(e.to)) return true;
    console.error(`[crystal-flow-tree] transformation skipped, species not in catalogue: ${e.from} -> ${e.to}`);
    return false;
  });
}

/* ------------------------------------------------------------------ */
const SEGMENT_MARKERS = [
  /function\s+_nuc_([a-z0-9_]+)\s*\(/g,
  /supersaturation_([a-z0-9_]+)\s*\(/g,
  /sim\.nucleate\(\s*'([a-z0-9_]+)'/g,
];
const REFERENCE = /c\.mineral\s*(===|!==)\s*'([a-z0-9_]+)'/g;

function classify(source, index) {
  const start = source.lastIndexOf('\n', index) + 1;
  let end = source.indexOf('\n', index);
  end = source.indexOf('\n', end + 1);
  const window = source.slice(start, end === -1 ? source.length : end);
  const dissolved = /c\.dissolved/.test(window);
  const active = /c\.active/.test(window);
  if (dissolved && active) return 'either';
  if (dissolved) return 'replaces';
  if (active) return 'substrate';
  return 'presence';
}

function segmentsFor(source, known) {
  const marks = [];
  for (const pattern of SEGMENT_MARKERS) {
    pattern.lastIndex = 0;
    for (const m of source.matchAll(pattern)) if (known.has(m[1])) marks.push({ index: m.index, mineral: m[1] });
  }
  return marks.sort((a, b) => a.index - b.index);
}

function attribute(marks, index) {
  let found = null;
  for (const mark of marks) { if (mark.index > index) break; found = mark.mineral; }
  return found;
}

const RELATION_OF = {
  substrate: ['preferred_substrate', 'active'],
  replaces: ['replacement_opportunity', 'dissolving'],
  either: ['preferred_substrate', 'either'],
  presence: ['co_presence', 'present'],
};

function main() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8'));
  const minerals = catalog.minerals;
  const known = new Set(Object.keys(minerals));

  // Runtime evidence: which species were seen on the bare wall, and on whom.
  let census = null;
  if (fs.existsSync(CENSUS)) census = JSON.parse(fs.readFileSync(CENSUS, 'utf8'));
  const observedHosts = new Map();   // "host>guest" seen at runtime
  const observedRuns = new Map();    // "host>guest" -> [{scenario, seed, step, position}]
  const wallSeen = new Map();        // species -> true/false
  for (const row of census?.species || []) {
    wallSeen.set(row.mineral, row.bare > 0);
    for (const host of Object.keys(row.hosts || {})) observedHosts.set(`${host}>${row.mineral}`, row.hosts[host]);
    // The census records one receipt per sighting. Carry them through so an
    // "observed" edge can name the run it was observed in, rather than asking
    // the reader to take a tally on faith.
    for (const s of row.sightings || []) {
      const key = `${s.host}>${row.mineral}`;
      if (!observedRuns.has(key)) observedRuns.set(key, []);
      observedRuns.get(key).push({
        scenario: s.scenario, seed: s.seed, step: s.step, position: s.position,
      });
    }
  }

  const nodes = Object.entries(minerals).map(([id, m]) => ({
    id,
    class: m.class,
    formula: m.formula,
    habit: m.habit,
    t_range_c: m.T_range_C,
    t_optimum_c: m.T_optimum_C,
    redox: m.redox_requirement,
    requires: m.required_ingredients || {},
    traces: Object.keys(m.trace_ingredients || {}),
    scenarios: m.scenarios || [],
    max_size_cm: m.max_size_cm,
    description: m.description,
    // Asymmetric on purpose. One bare-wall sighting PROVES an escape route;
    // never seeing one proves nothing, so it is 'unresolved', never 'gated'.
    bare_wall: !census ? 'unmeasured'
      : wallSeen.get(id) === true ? 'observed'
      : wallSeen.has(id) ? 'unresolved'
      : 'not-observed',
  })).sort((a, b) => a.id.localeCompare(b.id));

  /* verify each declared hard gate still exists where it is claimed */
  const hardIndex = new Map();
  for (const gate of HARD_GATES) {
    const src = fs.readFileSync(path.join(ROOT, gate.file), 'utf8');
    const at = src.indexOf(gate.guard);
    if (at < 0) throw new Error(`declared hard gate no longer present in ${gate.file}: ${gate.guard}`);
    gate.cite = `${gate.file}:${src.slice(0, at).split('\n').length}`;
    hardIndex.set(`${gate.from}>${gate.to}`, gate);
  }

  const edges = [];
  const unattributed = [];
  let referencesSeen = 0;

  for (const file of NUCLEATION_FILES) {
    const relative = `js/${file}`;
    const source = fs.readFileSync(path.join(ROOT, 'js', file), 'utf8');
    const marks = segmentsFor(source, known);
    REFERENCE.lastIndex = 0;
    for (const match of source.matchAll(REFERENCE)) {
      referencesSeen++;
      const negated = match[1] === '!==';
      const from = match[2];
      const legacy = negated ? 'substrate' : classify(source, match.index);
      const to = attribute(marks, match.index);
      const line = source.slice(0, match.index).split('\n').length;
      if (!to || !known.has(from)) {
        unattributed.push({ from, at: `${relative}:${line}`, reason: to ? 'unknown mineral' : 'no gate marker' });
        continue;
      }
      if (to === from) continue;
      const key = `${from}>${to}`;
      const hard = hardIndex.get(key);
      const [relation, state] = RELATION_OF[legacy];
      const seen = observedHosts.get(key);
      edges.push({
        from, to,
        relation: hard ? hard.relation : relation,
        mode: hard ? 'strict' : 'growth',
        source_state: hard ? hard.source_state : state,
        ...(hard?.required_precursor ? { required_precursor: true } : {}),
        kind: legacy,                                   // legacy field: the plate reads this
        evidence: {
          basis: hard ? 'code-guard' : 'code-reference',
          cite: hard ? hard.cite : `${relative}:${line}`,
          certainty: hard ? 'proved' : (seen ? 'observed' : 'inferred'),
          ...(seen ? { runtime_sightings: seen } : {}),
          ...(observedRuns.has(key) ? { runtime: observedRuns.get(key) } : {}),
        },
        ...(hard?.note ? { note: hard.note } : {}),
      });
    }
  }

  /* collapse duplicates, keeping every citation */
  const merged = new Map();
  for (const e of edges) {
    const key = `${e.from} ${e.to} ${e.relation} ${e.source_state}`;
    if (!merged.has(key)) merged.set(key, { ...e, evidence: { ...e.evidence, cites: [e.evidence.cite] } });
    else {
      const kept = merged.get(key);
      if (!kept.evidence.cites.includes(e.evidence.cite)) kept.evidence.cites.push(e.evidence.cite);
    }
  }
  for (const e of merged.values()) delete e.evidence.cite;

  /* A declared hard gate must appear even when the reference scan cannot see it.
     The todorokite gate tests isTodorokiteBirnessitePrecursor(c), not
     `c.mineral === 'birnessite'`, so the scan misses it entirely — exactly the
     kind of silent omission that made the first version of this graph wrong. */
  for (const gate of HARD_GATES) {
    const already = [...merged.values()].some(e => e.from === gate.from && e.to === gate.to);
    if (already) continue;
    merged.set(`${gate.from} ${gate.to} ${gate.relation} ${gate.source_state}`, {
      from: gate.from, to: gate.to,
      relation: gate.relation, mode: 'strict', source_state: gate.source_state,
      ...(gate.required_precursor ? { required_precursor: true } : {}),
      kind: null,
      evidence: { basis: 'code-guard', cites: [gate.cite], certainty: 'proved' },
      ...(gate.note ? { note: gate.note } : {}),
    });
  }

  /* transformations — a separate source entirely, and strict by nature */
  for (const t of readTransformations(known)) {
    const hard = hardIndex.get(`${t.from}>${t.to}`);
    const key = `${t.from} ${t.to} transformation transformed`;
    merged.set(key, {
      from: t.from, to: t.to,
      relation: 'transformation', mode: 'strict', source_state: 'transformed',
      mechanism: t.mechanism,
      ...(t.reversible ? { reversible: true } : {}),
      ...(hard?.required_precursor ? { required_precursor: true } : {}),
      kind: null,
      evidence: {
        basis: 'transition-function',
        cites: [hard ? hard.cite : t.cite, ...(hard ? [t.cite] : [])],
        certainty: 'proved',
      },
      ...(hard?.note ? { note: hard.note } : {}),
    });
  }

  const edgeList = [...merged.values()].sort((a, b) =>
    a.to.localeCompare(b.to) || a.from.localeCompare(b.from) || a.relation.localeCompare(b.relation));

  const classes = {};
  for (const n of nodes) (classes[n.class] ||= []).push(n.id);
  const tally = (field, value) => edgeList.filter(e => e[field] === value).length;

  const document = {
    _generator: 'tools/gen-crystal-flow-tree.mjs',
    _note: 'Two modes. STRICT = required_prerequisite + transformation: the only edges that may '
      + 'support roots, depth or reach. GROWTH = preferred_substrate / replacement_opportunity / '
      + 'co_presence: preference and opportunity, counted as observed relationships, never as '
      + 'dependencies. Every edge carries evidence.basis, evidence.cites and evidence.certainty.',
    sim_version: catalog.$schema_version ?? null,
    census: census ? { seeds: census.seeds, runs: census.runs, observed: census.counts.observed } : null,
    counts: {
      minerals: nodes.length,
      classes: Object.keys(classes).length,
      edges: edgeList.length,
      strict: tally('mode', 'strict'),
      growth: tally('mode', 'growth'),
      required_prerequisite: tally('relation', 'required_prerequisite'),
      transformation: tally('relation', 'transformation'),
      preferred_substrate: tally('relation', 'preferred_substrate'),
      replacement_opportunity: tally('relation', 'replacement_opportunity'),
      co_presence: tally('relation', 'co_presence'),
      proved: edgeList.filter(e => e.evidence.certainty === 'proved').length,
      observed: edgeList.filter(e => e.evidence.certainty === 'observed').length,
      inferred: edgeList.filter(e => e.evidence.certainty === 'inferred').length,
      bare_wall_observed: nodes.filter(n => n.bare_wall === 'observed').length,
      bare_wall_unresolved: nodes.filter(n => n.bare_wall === 'unresolved').length,
      // legacy tallies the plate still reads
      substrate: tally('kind', 'substrate'),
      replaces: tally('kind', 'replaces'),
      either: tally('kind', 'either'),
      presence: tally('kind', 'presence'),
      references_seen: referencesSeen,
      references_used: edges.length,
      unattributed: unattributed.length,
    },
    classes,
    nodes,
    edges: edgeList,
    unattributed,
  };

  if (CHECK) {
    const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = existing && JSON.stringify(existing) === JSON.stringify(document);
    console.error(same
      ? `[crystal-flow-tree] PASS: ${document.counts.minerals} minerals, ${document.counts.edges} edges — current`
      : '[crystal-flow-tree] FAIL: data/generated/crystal-flow-tree.json is missing or stale');
    if (!same) process.exitCode = 1;
    return document;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(document, null, 2)}\n`);
  const c = document.counts;
  console.error(`[crystal-flow-tree] ${c.minerals} minerals; ${c.edges} edges = `
    + `STRICT ${c.strict} (${c.required_prerequisite} required + ${c.transformation} transformation) `
    + `+ GROWTH ${c.growth} (${c.preferred_substrate} substrate, ${c.replacement_opportunity} replacement, ${c.co_presence} co-presence)`);
  console.error(`[crystal-flow-tree] certainty: ${c.proved} proved, ${c.observed} observed, ${c.inferred} inferred; `
    + `bare wall observed for ${c.bare_wall_observed} species, unresolved for ${c.bare_wall_unresolved}`);
  return document;
}

const document = main();
export default document;
