#!/usr/bin/env node
/**
 * tools/twin_rate_check.mjs — observed twin-frequency report.
 *
 * Tier 2 F from HANDOFF-SIMULATION-UX-AND-BACKLOG.md §3, BACKLOG.md L107-134.
 *
 * The simulator rolls each crystal's twin law once at nucleation
 * (VugSimulator._rollSpontaneousTwin). The per-roll probability lives
 * in data/minerals.json:twin_laws[].probability. With a single roll,
 * observed in-game twin frequency converges to that probability —
 * which can mismatch the AUTHOR'S INTENT if the probability number
 * was originally derived from "% of natural specimens are twinned"
 * (a lifetime-opportunity statistic that includes stress/thermal
 * twinning during years of growth, not just nucleation-instant
 * twinning).
 *
 * This tool measures: for each mineral, across every baseline scenario
 * at multiple seeds, what's the observed twin-occurrence ratio?
 * Compare to the authored per-roll probability — they should match
 * within statistical noise IF the calibration is honest. Big gaps mean
 * either (a) a mineral never nucleates so we have no signal, or (b)
 * a mineral nucleates fine but the roll consistently goes the wrong
 * way (which would mean a bug, not a tuning issue).
 *
 * The retune target is different: minerals where the AUTHORED
 * probability is geologically low (so observed is correctly low) BUT
 * the natural prevalence is high. Those are the ones where the
 * single-roll model under-shoots reality. Authoring the right number
 * is a literature question; the tool surfaces the candidates.
 *
 * Usage: `node tools/twin_rate_check.mjs [seeds]`
 *   seeds: comma-separated integer list, defaults to 10 seeds
 *
 * Output: one row per (mineral, twin_law) with:
 *   nucleations  — total crystals across all (scenario, seed) runs
 *   twinned       — total twinned crystals via this law
 *   observed      — twinned / nucleations
 *   authored_p    — the probability field in data/minerals.json
 *   diff          — observed − authored_p (negative = under-shooting)
 *
 * Followed by a "candidates for retune" section listing minerals
 * where the in-game rate looks visibly broken at human-scale viewing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

// --- jsdom + fetch mock + DOM stub (verbatim with gen-js-baseline.mjs) ---

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;

globalThis.fetch = async (url) => {
  let rel = String(url);
  if (rel.startsWith('./')) rel = rel.slice(2);
  else if (rel.startsWith('../')) rel = rel.slice(3);
  else if (rel.startsWith('/')) rel = rel.slice(1);
  else if (rel.startsWith('http')) return new Response('', { status: 404 });
  const filePath = path.join(ROOT, rel);
  try {
    return new Response(fs.readFileSync(filePath, 'utf8'), {
      status: 200, headers: { 'content-type': 'text/plain' },
    });
  } catch {
    return new Response('', { status: 404 });
  }
};

const realGetById = document.getElementById.bind(document);
const stub = () => new Proxy(function () { return stub(); }, {
  get(t, p) {
    if (p in t) return t[p];
    if (typeof p === 'string' && /^[a-z]/i.test(p)) return stub();
    return undefined;
  },
  set(t, p, v) { t[p] = v; return true; },
});
document.getElementById = (id) => realGetById(id) || stub();
document.querySelector = () => stub();
document.querySelectorAll = () => [];

// --- Walk dist/ and concat ---

function walkSorted(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d).sort(); }
    catch { continue; }
    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (name.endsWith('.js')) out.push(p);
    }
  }
  return out.sort((a, b) =>
    path.relative(DIST, a).split(path.sep).join('/').localeCompare(
      path.relative(DIST, b).split(path.sep).join('/'),
    ),
  );
}

const files = walkSorted(DIST);
if (!files.length) {
  console.error(`[twin_rate_check] dist/ is empty — run \`npm run build\` first`);
  process.exit(1);
}
const concat = files.map(f => fs.readFileSync(f, 'utf8')).join('\n\n');
const epilogue = 'function setSeed(seed) { rng = new SeededRandom(seed | 0); }';
const exportNames = ['SIM_VERSION', 'SCENARIOS', 'VugSimulator', 'setSeed', 'SeededRandom'];
const expr = '{ ' + exportNames.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') + ' }';
const fn = new Function(`${concat}\n${epilogue}\n;return ${expr};`);
const exports = fn();
for (const k of exportNames) globalThis[k] = exports[k];

async function waitForScenarios() {
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    if (SCENARIOS && Object.keys(SCENARIOS).length > 0) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('SCENARIOS never populated');
}
await waitForScenarios();

// Authored twin-law reference is read DIRECTLY from data/minerals.json
// rather than the bundle's MINERAL_SPEC global, because MINERAL_SPEC is
// loaded asynchronously inside the bundle (let MINERAL_SPEC =
// MINERAL_SPEC_FALLBACK; later, fetch resolves with the full data and
// reassigns). The bundle's IIFE returns the FALLBACK reference at eval
// time — there's no clean way to pull the post-fetch live spec back
// out across the eval boundary. Reading the JSON directly here gives
// the full 116-mineral spec without that dance.
const MINERALS_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;

// --- Sweep ---

const args = process.argv.slice(2);
const seeds = args[0]
  ? args[0].split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n))
  : [42, 1, 7, 13, 23, 99, 314, 1729, 8675309, 137];

console.log(`[twin_rate_check] sweeping ${seeds.length} seeds × ${Object.keys(SCENARIOS).length} scenarios at SIM_VERSION ${SIM_VERSION}\n`);

// Per-mineral aggregates.
const counts = {};  // { mineral: { nucleations, twinned, byLaw: { name: count } } }

function bump(mineral) {
  if (!counts[mineral]) counts[mineral] = { nucleations: 0, twinned: 0, byLaw: {} };
  return counts[mineral];
}

const scenarioNames = Object.keys(SCENARIOS).sort();
for (const seed of seeds) {
  for (const name of scenarioNames) {
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const steps = defaultSteps ?? 100;
    for (let i = 0; i < steps; i++) sim.run_step();
    for (const c of sim.crystals) {
      const m = bump(c.mineral);
      m.nucleations++;
      if (c.twinned) {
        m.twinned++;
        const lawName = c.twin_law || '<unspecified>';
        m.byLaw[lawName] = (m.byLaw[lawName] || 0) + 1;
      }
    }
  }
}

// Reference: authored per-roll probabilities from data/minerals.json.
// Mirrors the engine's filter at _rollSpontaneousTwin: skip laws whose
// trigger contains 'thermal_shock' or 'tectonic' (those fire on
// EVENTS, not the per-nucleation roll). The engine breaks on first
// match, so probability accumulates as 1 − ∏(1−p_i) across listed laws.
function authoredLaws(mineral) {
  const spec = MINERALS_JSON[mineral];
  if (!spec || !Array.isArray(spec.twin_laws)) return [];
  return spec.twin_laws
    .filter(l => l && typeof l.probability === 'number' && l.probability > 0)
    .filter(l => {
      const t = (l.trigger || '').toLowerCase();
      return !t.includes('thermal_shock') && !t.includes('tectonic');
    });
}

// --- Report ---

// 1) Per-mineral table: nucleations, twin rate, expected sum-of-twin-law-probs.
const minerals = Object.keys(counts).sort();
console.log('Per-mineral observed twin frequency vs authored per-roll probability:');
console.log('-'.repeat(98));
console.log(
  'mineral'.padEnd(20) +
  'nuclei'.padStart(8) +
  '  twinned'.padStart(10) +
  '   obs%'.padStart(9) +
  '   exp%'.padStart(9) +
  '   diff'.padStart(9) +
  '   sig'.padStart(7) +
  '   primary_law',
);
console.log('-'.repeat(98));

// Candidates for retune: any mineral where observed under-shoots
// authored by more than 50% AND has at least 5 nucleations (noise
// floor). These get flagged after the table.
const retuneCandidates = [];

for (const m of minerals) {
  const c = counts[m];
  const obs = c.nucleations > 0 ? c.twinned / c.nucleations : 0;
  const laws = authoredLaws(m);
  // Expected per-crystal twin-occurrence under the first-match-wins
  // loop (engine reads laws in array order, breaks on first hit).
  // Sum of probabilities × probability-not-yet-broken — equivalent to
  // 1 − ∏ (1 − p_i) for the bounded-above approximation.
  let pNone = 1;
  for (const l of laws) pNone *= (1 - l.probability);
  const exp = 1 - pNone;
  const diff = obs - exp;
  // Crude significance: standard error of an observed Bernoulli is
  // √(p(1−p)/n). If |diff| > 2σ, flag it as statistically
  // distinguishable from authored at this sample size.
  const se = c.nucleations > 0 ? Math.sqrt(Math.max(1e-9, exp * (1 - exp)) / c.nucleations) : Infinity;
  const sig = c.nucleations >= 5 && Math.abs(diff) > 2 * se ? '!' : ' ';
  const primaryLaw = laws.length ? `${laws[0].name} (p=${laws[0].probability.toFixed(3)})` : '—';
  console.log(
    m.padEnd(20) +
    String(c.nucleations).padStart(8) +
    String(c.twinned).padStart(10) +
    `${(obs * 100).toFixed(1)}%`.padStart(9) +
    `${(exp * 100).toFixed(1)}%`.padStart(9) +
    `${((diff) * 100 >= 0 ? '+' : '')}${(diff * 100).toFixed(1)}%`.padStart(9) +
    sig.padStart(7) +
    `   ${primaryLaw}`,
  );

  // Retune-candidate logic: mineral has authored expected ≥ 5% twin
  // rate, has ≥ 10 nucleations in the sweep, but observed twin count
  // is zero. That's the "geologically common, never seen in-game"
  // failure mode the backlog called out.
  if (exp >= 0.05 && c.nucleations >= 10 && c.twinned === 0) {
    retuneCandidates.push({ mineral: m, nucleations: c.nucleations, exp, primaryLaw });
  }
}

// 2) Minerals authored with twin laws but ZERO nucleations across the
// whole sweep (so the calibration question can't even be asked).
console.log('\nAuthored-but-unobserved minerals (no nucleations across sweep — no calibration signal):');
console.log('-'.repeat(98));
const allAuthored = Object.keys(MINERALS_JSON).filter(m => authoredLaws(m).length > 0).sort();
const unobserved = allAuthored.filter(m => !counts[m] || counts[m].nucleations === 0);
for (const m of unobserved) {
  const laws = authoredLaws(m);
  const lawSummary = laws.map(l => `${l.name}=${l.probability.toFixed(3)}`).join(', ');
  console.log(`  ${m.padEnd(20)} ${lawSummary}`);
}

// 3) Retune candidates: high authored, zero observed.
console.log('\nRetune candidates (observed-zero despite authored ≥5%, ≥10 nucleations):');
console.log('-'.repeat(98));
if (retuneCandidates.length === 0) {
  console.log('  (none — every mineral with enough nucleations registered at least one twin)');
} else {
  for (const c of retuneCandidates) {
    console.log(`  ${c.mineral.padEnd(20)} n=${String(c.nucleations).padStart(4)}  expected ${(c.exp * 100).toFixed(1)}%  primary: ${c.primaryLaw}`);
  }
}

// 4) Total counts.
const totalNuclei = minerals.reduce((s, m) => s + counts[m].nucleations, 0);
const totalTwinned = minerals.reduce((s, m) => s + counts[m].twinned, 0);
console.log(`\nTotal: ${totalNuclei} crystals nucleated, ${totalTwinned} twinned (${(100 * totalTwinned / totalNuclei).toFixed(2)}% overall) across ${seeds.length} seeds × ${scenarioNames.length} scenarios.`);
