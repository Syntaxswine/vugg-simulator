#!/usr/bin/env node
/**
 * probe-sigma-maxima.mjs — how far past saturation does the bulk fluid of each scenario sit for a
 * mineral? (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1 and §3.4.)
 *
 * For each scenario at seed 42 it reads supersaturation_<mineral> on the bulk handle at construction
 * and at the end of every step, and prints the starting value, the smallest and the largest with
 * their steps, and the value at the end of the run.
 * It observes only: each run is compared with tests-js/baselines/seed42_v<SIM>.json.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports only tools/_harness.mjs and node builtins.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs                 # feldspar, albite, quartz; every scenario
 *   node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs --minerals selenite,celestine naica_geothermal
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } = await harness.loadSimBundle({ toolName: 'probe-sigma-maxima', extraExports: [] });
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const argv = process.argv.slice(2);
const mi = argv.indexOf('--minerals');
const MINERALS = mi >= 0 ? argv.splice(mi, 2)[1].split(',') : ['feldspar', 'albite', 'quartz'];
const names = argv.length ? argv : Object.keys(SCENARIOS).sort();
for (const n of names) if (!SCENARIOS[n]) throw new Error(`unknown scenario ${n}`);

// tools/gen-js-baseline.mjs summarize(), copied.
function summarize(sim) {
  const out = {};
  for (const c of sim.crystals) {
    out[c.mineral] ||= { active: 0, dissolved: 0, total: 0, max_um: 0 };
    out[c.mineral].total++;
    if (c.dissolved) out[c.mineral].dissolved++; else out[c.mineral].active++;
    if (c.total_growth_um > out[c.mineral].max_um) out[c.mineral].max_um = Math.round(c.total_growth_um * 10) / 10;
  }
  const sorted = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted;
}
const fx = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));

console.log(`bulk supersaturation, SIM ${SIM_VERSION}, seed 42 — start / smallest (step) / largest (step) / at run end; "grows" is the largest crystal in mm`);
console.log(`scenario                               SiO2 ppm at start   ${MINERALS.map(m => `${m}: start / min (step) / max (step) / end`.padEnd(52)).join('  ')}  grows`);
let ok = 0;
for (const name of names) {
  setSeed(42);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  const sim = new VugSimulator(conditions, events);
  const read = (m) => {
    const fn = sim.conditions['supersaturation_' + m];
    if (typeof fn !== 'function') return 0;
    const v = fn.call(sim.conditions);
    return Number.isFinite(v) ? v : 0;
  };
  const start = MINERALS.map(read), max = start.slice(), at = MINERALS.map(() => 0), min = start.slice(), atMin = MINERALS.map(() => 0);
  let end = start.slice();
  const si0 = Number(sim.conditions.fluid.SiO2);
  const steps = defaultSteps ?? 100;
  for (let i = 0; i < steps; i++) {
    sim.run_step();
    MINERALS.forEach((m, k) => {
      const v = read(m);
      if (v > max[k]) { max[k] = v; at[k] = sim.step; }
      if (v < min[k]) { min[k] = v; atMin[k] = sim.step; }
      end[k] = v;
    });
  }
  const sum = summarize(sim);
  const same = JSON.stringify(sum) === JSON.stringify(BASELINE[name]);
  if (same) ok++;
  const grows = MINERALS.filter(m => sum[m]).map(m => `${m} ${(sum[m].max_um / 1000).toFixed(1)}`).join(', ') || '—';
  console.log(`${name.padEnd(38)} ${String(si0).padStart(10)}          ${MINERALS.map((m, k) => `${fx(start[k]).padStart(7)} / ${fx(min[k]).padStart(7)} (${String(atMin[k]).padStart(3)}) / ${fx(max[k]).padStart(7)} (${String(at[k]).padStart(3)}) / ${fx(end[k]).padStart(7)}`.padEnd(52)).join('  ')}  ${grows}${same ? '' : '   RUN DOES NOT REPRODUCE THE BASELINE'}`);
}
console.log(`integrity: ${ok} of ${names.length} runs reproduce tests-js/baselines/seed42_v${SIM_VERSION}.json with the reader attached`);
