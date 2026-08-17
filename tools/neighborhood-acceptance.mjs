/**
 * The Phase 1 acceptance tests, as an instrument rather than a checklist.
 *
 * Each test below is one of the ten conditions the neighborhood atlas was
 * specified against. A test that cannot be decided from the artefacts SKIPS
 * loudly and says why - it never passes by silence. Phase 2 conditions
 * (executed locality order) are declared PENDING here on purpose, so the
 * count never implies coverage this build does not have.
 *
 *   node tools/neighborhood-acceptance.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TREE = path.join(ROOT, 'data', 'generated', 'crystal-flow-tree.json');
const PAGE = path.join(ROOT, 'docs', 'crystal-neighborhoods.html');

const flow = JSON.parse(fs.readFileSync(TREE, 'utf8'));
const page = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, 'utf8') : null;
const node = id => flow.nodes.find(n => n.id === id);
const edges = (from, to, relation) => flow.edges.filter(e =>
  (from == null || e.from === from) && (to == null || e.to === to)
  && (relation == null || e.relation === relation));

const results = [];
const test = (n, title, fn) => {
  try {
    const note = fn();
    results.push({ n, title, state: 'PASS', note: note || '' });
  } catch (error) {
    results.push({ n, title, state: error.pending ? 'PENDING' : 'FAIL', note: error.message });
  }
};
const pending = reason => { const e = new Error(reason); e.pending = true; throw e; };
const ok = (cond, message) => { if (!cond) throw new Error(message); };

test(1, 'azurite shows cuprite/native copper as preferences, not requirements', () => {
  for (const host of ['cuprite', 'native_copper']) {
    const pref = edges(host, 'azurite', 'preferred_substrate');
    ok(pref.length, `${host} -> azurite is not a preferred_substrate edge`);
    ok(pref.every(e => e.mode === 'growth'), `${host} -> azurite is not in growth mode`);
    ok(!edges(host, 'azurite', 'required_prerequisite').length,
      `${host} -> azurite is wrongly marked required`);
  }
  return 'both hosts present, both growth-mode';
});

test(2, 'chrysocolla shows an azurite replacement AND a bare-wall escape at once', () => {
  ok(edges('azurite', 'chrysocolla', 'replacement_opportunity').length,
    'no azurite -> chrysocolla replacement_opportunity');
  ok(node('chrysocolla')?.bare_wall === 'observed',
    `chrysocolla bare_wall is ${node('chrysocolla')?.bare_wall}, not observed`);
  return 'replacement + escape coexist, which is the whole point';
});

test(3, "tiger's-eye shows crocidolite as a true required precursor", () => {
  const e = edges('crocidolite', 'tigers_eye', 'required_prerequisite');
  ok(e.length === 1, `expected 1 required_prerequisite edge, found ${e.length}`);
  ok(e[0].mode === 'strict', 'the edge is not in strict mode');
  ok(e[0].evidence.certainty === 'proved', 'the edge is not proved');
  return e[0].evidence.cites.join(', ');
});

test(4, 'birnessite -> todorokite appears once, as a transformation carrying required_precursor', () => {
  const all = edges('birnessite', 'todorokite');
  ok(all.length === 1, `expected exactly 1 edge, found ${all.length}`);
  ok(all[0].relation === 'transformation', `relation is ${all[0].relation}`);
  ok(all[0].required_precursor === true, 'required_precursor metadata is missing');
  return 'recorded once, not duplicated as two unrelated facts';
});

test(5, 'runtime edges expose scenario, seed, step and position', () => {
  const runtime = flow.edges.filter(e => e.evidence.runtime_sightings);
  ok(runtime.length, 'no edge carries runtime sightings at all');
  const withReceipts = runtime.filter(e => (e.evidence.runtime || []).length);
  ok(withReceipts.length,
    `${runtime.length} edges carry a sighting COUNT but none carries receipts - `
    + 'a count is not a receipt (run tools/substrate-escape-census.mjs)');
  for (const e of withReceipts) {
    for (const r of e.evidence.runtime) {
      for (const field of ['scenario', 'seed', 'step', 'position']) {
        ok(r[field] !== undefined && r[field] !== null,
          `${e.from} -> ${e.to} receipt is missing ${field}`);
      }
    }
  }
  const total = withReceipts.reduce((n, e) => n + e.evidence.runtime.length, 0);
  return `${withReceipts.length}/${runtime.length} runtime edges carry ${total} full receipts`;
});

test(6, 'an unsupported mineral returns "no supported relationship"', () => {
  const touched = new Set();
  for (const e of flow.edges) { touched.add(e.from); touched.add(e.to); }
  const isolated = flow.nodes.filter(n => !touched.has(n.id));
  ok(isolated.length, 'no isolated species exists to exercise the empty state');
  ok(page, 'docs/crystal-neighborhoods.html has not been generated yet');
  ok(page.includes('no supported relationship'),
    'the page has no empty-state copy for an unsupported mineral');
  return `${isolated.length} isolated species, e.g. ${isolated.slice(0, 3).map(n => n.id).join(', ')}`;
});

test(7, 'disabling co-observed edges cannot disturb causal relations', () => {
  const co = flow.edges.filter(e => e.relation === 'co_presence');
  ok(co.length, 'no co_presence edges exist to filter');
  ok(co.every(e => e.mode === 'growth'),
    'a co_presence edge is marked strict, so hiding it would change the causal graph');
  const strict = flow.edges.filter(e => e.mode === 'strict');
  ok(strict.every(e => e.relation !== 'co_presence'), 'a strict edge is a co-observation');
  return `${co.length} co-observations, all growth-mode; ${strict.length} strict edges untouched by the filter`;
});

test(8, 'locality order comes from executed or authored stages', () => {
  pending('Phase 2. This build ships no locality timeline, and the page must not '
    + 'imply one. Asserted here so the gap stays visible.');
});

test(9, 'every visible edge opens a provenance receipt', () => {
  const naked = flow.edges.filter(e => !(e.evidence?.cites || []).length);
  ok(!naked.length, `${naked.length} edge(s) carry no citation, e.g. `
    + (naked[0] ? `${naked[0].from} -> ${naked[0].to}` : ''));
  return `all ${flow.edges.length} edges cite source`;
});

test(10, 'the page states that runtime observations describe Vugg runs', () => {
  ok(page, 'docs/crystal-neighborhoods.html has not been generated yet');
  ok(/describe <i>Vugg runs<\/i>, not how often minerals occur together/.test(page)
    || /not how often minerals occur/.test(page),
    'the page does not disclaim global occurrence rates');
  ok(/not thereby impossible/.test(page),
    'the page does not say that an unobserved pairing is not an impossible one');
  return 'both disclaimers present';
});

/* Not one of the ten. A regression guard for a bug the ten did not catch: the
 * receipt read "azurite may replace chrysocolla" when the stored edge means the
 * opposite. Every edge is source-first (substrate, dissolving host, precursor),
 * so a predicate written guest-first silently reverses the paragenesis - which
 * is the single worst thing this atlas could tell a collector. */
test(11, 'GUARD: direction predicates read source-first', () => {
  ok(page, 'docs/crystal-neighborhoods.html has not been generated yet');
  ok(/reads: 'may host'/.test(page),
    'preferred_substrate no longer reads host-first; "may grow on" reverses it');
  ok(/reads: 'may be replaced by'/.test(page),
    'replacement_opportunity no longer reads source-first; "may replace" reverses it');
  ok(!/reads: 'may grow on'/.test(page), 'a guest-first substrate predicate is back');
  ok(!/reads: 'may replace'/.test(page), 'a guest-first replacement predicate is back');
  return 'substrate and replacement both read from source to target';
});

const width = Math.max(...results.map(r => r.title.length));
let failed = 0;
for (const r of results) {
  if (r.state === 'FAIL') failed++;
  process.stdout.write(`  ${String(r.n).padStart(2)}. ${r.title.padEnd(width)}  ${r.state.padEnd(7)}  ${r.note}\n`);
}
const pass = results.filter(r => r.state === 'PASS').length;
const pend = results.filter(r => r.state === 'PENDING').length;
process.stdout.write(`\n[acceptance] ${pass} pass, ${failed} fail, ${pend} pending of ${results.length}\n`);
process.exit(failed ? 1 : 0);
