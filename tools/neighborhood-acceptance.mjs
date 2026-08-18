/**
 * The Phase 1 acceptance tests, as an instrument rather than a checklist.
 *
 * Each numbered test below is one of the ten conditions the neighbourhood atlas
 * was specified against; 11+ are regression guards for bugs the ten did not
 * catch. A test that cannot be decided from the artefacts SKIPS loudly and says
 * why - it never passes by silence. Phase 2 conditions are declared PENDING on
 * purpose, so the count never implies coverage this build does not have.
 *
 * WHY THIS DRIVES THE PAGE. The first version asserted against the JSON and
 * grepped the HTML for source strings. That gate could not see a page whose
 * every relationship was reversed: the tree stayed correct, the strings stayed
 * present, and 10/10 went green while the plate told a collector that
 * chrysocolla hosts its own substrate. Strings are not behaviour. The tests that
 * make a claim about what a READER sees now boot the real page in jsdom, click
 * the real elements, and read the rendered text back.
 *
 *   node tools/neighborhood-acceptance.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TREE = path.join(ROOT, 'data', 'generated', 'crystal-flow-tree.json');
const PAGE = path.join(ROOT, 'docs', 'crystal-neighborhoods.html');

const flow = JSON.parse(fs.readFileSync(TREE, 'utf8'));
const pageHtml = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, 'utf8') : null;
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

/* ----------------------------- the live page ----------------------------- */

let dom = null;
let win = null;
let bootError = null;
if (pageHtml) {
  try {
    dom = new JSDOM(pageHtml, { runScripts: 'dangerously', pretendToBeVisual: true });
    win = dom.window;
    ok(typeof win.setCenter === 'function', 'the page exposes no setCenter()');
  } catch (error) { bootError = error; }
}

const livePage = () => {
  ok(pageHtml, 'docs/crystal-neighborhoods.html has not been generated yet');
  ok(!bootError, `the page threw while booting: ${bootError && bootError.message}`);
  ok(win, 'the page did not boot');
  return win;
};
const panelText = () => win.document.getElementById('panel').textContent;
const pretty = id => String(id).replace(/_/g, ' ');

/** Click the connector whose tooltip names this pairing, and return the receipt. */
function openEdge(from, to) {
  const wanted = `${pretty(from)} → ${pretty(to)}`;
  for (const hit of win.document.querySelectorAll('.hit')) {
    const title = hit.querySelector('title');
    if (title && title.textContent.startsWith(wanted)) {
      hit.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      return panelText();
    }
  }
  throw new Error(`no drawn edge ${from} -> ${to} to click`);
}

/* -------------------------------- the ten -------------------------------- */

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
  const naked = runtime.filter(e => !(e.evidence.runtime || []).length);
  ok(!naked.length, `${naked.length} of ${runtime.length} edges carry a sighting COUNT `
    + `with no receipts - a count is not a receipt (first: ${naked[0] && naked[0].from} -> `
    + `${naked[0] && naked[0].to}); run tools/substrate-escape-census.mjs`);
  for (const e of runtime) {
    for (const r of e.evidence.runtime) {
      for (const field of ['scenario', 'seed', 'step', 'position']) {
        ok(r[field] !== undefined && r[field] !== null,
          `${e.from} -> ${e.to} receipt is missing ${field}`);
      }
    }
  }
  const total = runtime.reduce((n, e) => n + e.evidence.runtime.length, 0);
  return `${runtime.length}/${runtime.length} runtime edges carry ${total} full receipts`;
});

test(6, 'an unsupported mineral returns "no supported relationship"', () => {
  livePage();
  const touched = new Set();
  for (const e of flow.edges) { touched.add(e.from); touched.add(e.to); }
  // Truly unsupported = no edges AND no bare-wall row, since the wall is drawn
  // as a relationship too. Counting bare-wall species here would let the empty
  // state rot untested while the precondition still looked satisfied.
  const isolated = flow.nodes.filter(n => !touched.has(n.id) && n.bare_wall !== 'observed');
  ok(isolated.length, 'no species is unsupported once bare-wall rows are counted, '
    + 'so the empty state cannot be exercised - assert it another way rather than '
    + 'letting this pass on a page nobody can reach');
  win.setCenter(isolated[0].id);
  const text = panelText();
  ok(/No supported relationship/.test(text),
    `centring ${isolated[0].id} did not render the empty state; panel said: ${text.slice(0, 120)}`);
  const plate = win.document.getElementById('plate').textContent;
  ok(/no supported relationship/.test(plate), 'the plate does not say so either');
  return `${isolated.length} truly unsupported species, rendered e.g. ${isolated[0].id}`;
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
  livePage();
  const text = win.document.body.textContent.replace(/\s+/g, ' ');
  ok(/describe Vugg runs, not how often minerals occur together in the ground/.test(text),
    'the page does not disclaim global occurrence rates in those terms');
  ok(/not thereby impossible/.test(text),
    'the page does not say that an unobserved pairing is not an impossible one');
  return 'both disclaimers present in the rendered text';
});

/* ------------------------------ the guards ------------------------------- */

test(11, 'GUARD: rendered direction sentences read source-first', () => {
  livePage();
  // The bug this guards was invisible to a source grep: the REL table was right
  // and the sentence that consumed it was reversed. So read the sentence.
  win.setCenter('azurite');
  const substrate = openEdge('cuprite', 'azurite');
  ok(/cuprite may host azurite/.test(substrate),
    `substrate direction is not host-first; receipt said: ${substrate.slice(0, 160)}`);
  ok(!/azurite may host cuprite/.test(substrate), 'the guest is hosting its own substrate');
  const replacement = openEdge('azurite', 'chrysocolla');
  ok(/azurite may be replaced by chrysocolla/.test(replacement),
    `replacement direction is not source-first; receipt said: ${replacement.slice(0, 160)}`);
  ok(!/chrysocolla may be replaced by azurite/.test(replacement),
    'the dissolving source is being replaced by the wrong species');
  return 'substrate and replacement sentences both read from source to target';
});

test(12, 'GUARD: the page ships the tree it is asserted against', () => {
  ok(pageHtml, 'docs/crystal-neighborhoods.html has not been generated yet');
  const match = pageHtml.match(/^const FLOW = (.+);$/m);
  ok(match, 'no FLOW payload found in the page');
  const shipped = JSON.parse(match[1]);
  // Without this, every data test above asserts on a file the reader never sees:
  // a stale or hand-edited page passes the whole suite.
  ok(shipped.edges.length === flow.edges.length,
    `the page ships ${shipped.edges.length} edges, the tree has ${flow.edges.length}`);
  ok(JSON.stringify(shipped.edges) === JSON.stringify(flow.edges),
    'the page payload differs from data/generated/crystal-flow-tree.json - regenerate it');
  ok(JSON.stringify(shipped.nodes) === JSON.stringify(flow.nodes),
    'the page nodes differ from the tree - regenerate it');
  return `${shipped.edges.length} edges and ${shipped.nodes.length} nodes match the tree byte for byte`;
});

test(13, 'GUARD: a merged edge does not list the same sighting twice', () => {
  livePage();
  // Two engine lines naming one pairing under different source_state each carry
  // the SAME census receipts. Merging them for display must not merge receipts.
  const key = e => `${e.from}>${e.to}>${e.relation}`;
  const counts = new Map();
  for (const e of flow.edges) counts.set(key(e), (counts.get(key(e)) || 0) + 1);
  const merged = flow.edges.filter(e => counts.get(key(e)) > 1
    && (e.evidence.runtime || []).length);
  ok(merged.length, 'no merged edge carries runtime receipts, so this cannot be exercised');
  const sample = merged[0];
  win.setCenter(sample.to);
  const receipt = openEdge(sample.from, sample.to);
  const shown = Number((receipt.match(/Runtime sightings\s*·\s*(\d+)/) || [])[1]);
  const truth = new Set(sample.evidence.runtime.map(r =>
    `${r.scenario}|${r.seed}|${r.step}|${r.position}`)).size;
  ok(Number.isFinite(shown), `could not read a sighting count from: ${receipt.slice(0, 160)}`);
  ok(shown === truth,
    `${sample.from} -> ${sample.to} reports ${shown} runtime sightings, truth is ${truth}`);
  return `${merged.length} merged edges carry receipts; ${sample.from} -> ${sample.to} reports ${shown}, matching the census`;
});

test(14, 'GUARD: a filtered-out species is not reported as having no relationships', () => {
  livePage();
  // "Nothing to show" and "nothing exists" are different claims.
  win.setCenter('quartz');
  for (const rel of ['required_prerequisite', 'transformation', 'replacement_opportunity',
    'preferred_substrate', 'co_presence', 'bare_wall']) {
    win.document.getElementById('f-' + rel)
      .dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  }
  const text = panelText();
  ok(!/No supported relationship/.test(text),
    'quartz with every filter off is reported as having no supported relationship at all');
  ok(/under these filters/.test(text),
    `the panel does not say the emptiness is the filters' doing: ${text.slice(-160)}`);
  win.document.getElementById('reset').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  return 'filters emptying the plate reads as hidden, not absent';
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
if (dom) dom.window.close();
process.exit(failed ? 1 : 0);
