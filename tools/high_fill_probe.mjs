#!/usr/bin/env node
/**
 * tools/high_fill_probe.mjs — characterize crystal growth as vugs approach
 * complete filling. Companion to tools/stale_mineral_probe.mjs.
 *
 * For each scenario, samples per-step:
 *   * vugFill (the simulator's current geometric measure)
 *   * active crystal count
 *   * total growth zones added this step
 *   * mean / max zone thickness this step
 *   * how many distinct minerals grew zones this step
 *
 * Reports per scenario:
 *   * peak vugFill — did this scenario ever approach 1.0?
 *   * step at which vugFill first crossed 0.50, 0.75, 0.90, 0.95, 0.99
 *   * growth-rate trajectory across those bins (mean zone thickness)
 *   * "vug sealed" event occurrence
 *
 * Aggregate report:
 *   * which scenarios actually exercise the high-fill regime
 *   * does growth rate slow as fill rises? (with what curve shape?)
 *   * are habit transitions correlated with fill level?
 *
 * Reads everything from the live bundle. No code changes.
 *
 * Usage: `node tools/high_fill_probe.mjs [seed]`
 *   seed: integer, default 42
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

// --- jsdom + fetch mock + DOM stub ---

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
  console.error(`[high_fill_probe] dist/ is empty — run \`npm run build\` first`);
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

// --- Probe ---

const seed = parseInt(process.argv[2] ?? '42', 10);
const scenarioNames = Object.keys(SCENARIOS).sort();

console.log(`[high_fill_probe] SIM_VERSION ${SIM_VERSION}, seed ${seed}\n`);
console.log('Per-scenario trajectory of vugFill, growth activity, and seal-event:\n');

// Format:
// scenario_name    peak_fill   crossed_0.50  0.75  0.90  0.95  0.99   sealed?   nucleation_after_0.95
const ROW_FORMAT = '  %-36s  peak %5s  cross 50/75/90/95/99 = %s   sealed=%s   nuc>.95=%d';

const summary = [];

for (const name of scenarioNames) {
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  const sim = new VugSimulator(conditions, events);
  const steps = defaultSteps ?? 100;

  const trajectory = [];   // [{ step, vugFill, activeCount, zoneThicknesses, nucleations }]
  const sealStep = { step: null };
  const crossings = { 0.50: null, 0.75: null, 0.90: null, 0.95: null, 0.99: null };
  let lastCrystalCount = 0;
  let nucAfter95 = 0;

  for (let i = 0; i < steps; i++) {
    const preCount = sim.crystals.length;
    sim.run_step();
    const f = sim.get_vug_fill();
    const nucs = sim.crystals.length - preCount;
    if (i > 0 && f >= 0.95 && trajectory[trajectory.length - 1].vugFill < 0.95) {
      // First crossing of 0.95 — count nucleations from here onward
    }
    if (f >= 0.95) nucAfter95 += nucs;

    // Cross thresholds
    for (const t of [0.50, 0.75, 0.90, 0.95, 0.99]) {
      if (crossings[t] === null && f >= t) crossings[t] = i;
    }
    if (sealStep.step === null && sim._vug_sealed) sealStep.step = i;

    // Per-step zone thicknesses for active crystals (just the most recent zone)
    const zoneThicknesses = [];
    for (const c of sim.crystals) {
      if (!c.active || !c.zones || !c.zones.length) continue;
      const lastZone = c.zones[c.zones.length - 1];
      if (lastZone && typeof lastZone.thickness_um === 'number' && lastZone.thickness_um > 0) {
        // Only count zones added in the current step. zone.step matches sim.step.
        if (lastZone.step === sim.step) zoneThicknesses.push(lastZone.thickness_um);
      }
    }
    trajectory.push({
      step: i,
      vugFill: f,
      activeCount: sim.crystals.filter(c => c.active).length,
      zoneThicknesses,
      nucleations: nucs,
    });
  }

  const peak = Math.max(...trajectory.map(t => t.vugFill));
  summary.push({ name, peak, crossings, sealStep: sealStep.step, trajectory, nucAfter95 });

  // Print top line
  const c2s = (v) => v === null ? '--' : String(v).padStart(3);
  console.log(
    `  ${name.padEnd(36)} peak ${peak.toFixed(3)}  ` +
    `cross ${c2s(crossings[0.50])}/${c2s(crossings[0.75])}/${c2s(crossings[0.90])}/${c2s(crossings[0.95])}/${c2s(crossings[0.99])}  ` +
    `sealed=${sealStep.step ?? '--'}  nuc>.95=${nucAfter95}`
  );
}

// --- Aggregate analysis: growth rate vs fill ---

console.log(`\n${'='.repeat(98)}\nGrowth-rate trajectory: mean zone thickness (µm) binned by vugFill\n`);
const bins = [
  { name: '0.00–0.10', lo: 0.00, hi: 0.10 },
  { name: '0.10–0.25', lo: 0.10, hi: 0.25 },
  { name: '0.25–0.50', lo: 0.25, hi: 0.50 },
  { name: '0.50–0.75', lo: 0.50, hi: 0.75 },
  { name: '0.75–0.90', lo: 0.75, hi: 0.90 },
  { name: '0.90–0.95', lo: 0.90, hi: 0.95 },
  { name: '0.95–0.99', lo: 0.95, hi: 0.99 },
  { name: '0.99–1.00', lo: 0.99, hi: 1.001 },
];

for (const b of bins) {
  let sumThick = 0, countZones = 0, countSteps = 0, sumActive = 0, sumNucs = 0;
  for (const s of summary) {
    for (const t of s.trajectory) {
      if (t.vugFill >= b.lo && t.vugFill < b.hi) {
        countSteps++;
        sumActive += t.activeCount;
        sumNucs += t.nucleations;
        for (const z of t.zoneThicknesses) {
          sumThick += z;
          countZones++;
        }
      }
    }
  }
  const meanThick = countZones > 0 ? (sumThick / countZones) : 0;
  const meanActive = countSteps > 0 ? (sumActive / countSteps) : 0;
  const meanNucs = countSteps > 0 ? (sumNucs / countSteps) : 0;
  console.log(
    `  ${b.name.padEnd(11)}  ` +
    `n=${String(countSteps).padStart(4)} (seed-step pairs)  ` +
    `mean zone thickness=${meanThick.toFixed(1).padStart(8)} µm  ` +
    `mean active=${meanActive.toFixed(1).padStart(5)}  ` +
    `nuc/step=${meanNucs.toFixed(3).padStart(5)}  ` +
    `zones=${countZones}`
  );
}

console.log(`\n${'='.repeat(98)}`);
console.log('Scenarios that approach complete filling (peak vugFill > 0.90):\n');
const highFill = summary.filter(s => s.peak >= 0.90).sort((a, b) => b.peak - a.peak);
for (const s of highFill) {
  console.log(`  ${s.name.padEnd(36)}  peak=${s.peak.toFixed(3)}  sealed_step=${s.sealStep ?? 'not sealed'}`);
}

console.log(`\nScenarios with low peak vugFill (vugs stayed mostly open — < 0.50):\n`);
const lowFill = summary.filter(s => s.peak < 0.50).sort((a, b) => b.peak - a.peak);
for (const s of lowFill) {
  console.log(`  ${s.name.padEnd(36)}  peak=${s.peak.toFixed(3)}`);
}

console.log('\nDiagnosis notes:');
console.log('  * Steep growth-rate drop in 0.90→0.99 bin → simulator IS slowing growth (geometric clip on c_length / a_width)');
console.log('  * No drop in 0.90→0.99 bin → growth rate is constant up to seal — unrealistic vs DLA / Tsumeb succession');
console.log('  * nuc/step bumps post-0.95 → fill_exempt minerals firing (Backlog K working)');
