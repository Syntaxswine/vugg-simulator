#!/usr/bin/env node
/**
 * probe-enclosed-survivors.mjs — why schneeberg ends without some of its species when the feldspar
 * pair's rate is clamped in every scenario (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC1).
 *
 * tools/sim-side-ab.mjs reports the loss (ab-feldspar-13-scenarios, arm rclamp=7). This probe
 * follows the crystals behind it. For each seed it runs schneeberg as shipped and under the same
 * clamp, written the way the A/B tool writes it (every positive zone of grow_feldspar and
 * grow_albite scaled by min(sigma − 1, 7)/(sigma − 1), sigma read before the engine runs), finds the
 * minerals that hold solid at run end as shipped and none under the clamp, and prints every crystal
 * of those minerals in both runs: the step it was born, its size at run end, whether another
 * crystal enclosed it and when (crystal.enclosed_by, read after every step), and the step at which
 * it lost its last solid (crystal.dissolved, read after every step).
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports tools/_harness.mjs and node builtins.
 * The engine table is restored in a finally block. At seed 42 the shipped run is compared with the
 * committed baseline.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-enclosed-survivors.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES } = await harness.loadSimBundle({
  toolName: 'probe-enclosed-survivors', extraExports: ['MINERAL_ENGINES'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SCENARIO = 'schneeberg', PAIR = ['feldspar', 'albite'], E = 7;
const um = (x) => `${x.toFixed(x < 10 ? 1 : 0)} µm`;

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

function run(seed, clamp) {
  const saved = {};
  for (const m of PAIR) saved[m] = MINERAL_ENGINES[m];
  try {
    if (clamp != null) {
      for (const m of PAIR) {
        const orig = saved[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + m]();
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          if (s - 1 > clamp) {
            const f = clamp / (s - 1);
            zone.thickness_um *= f;
            if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
          }
          return zone;
        };
      }
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[SCENARIO]();
    const sim = new VugSimulator(conditions, events);
    const enclosed = new Map(), lost = new Map();
    for (let i = 0; i < (defaultSteps ?? 100); i++) {
      sim.run_step();
      for (const c of sim.crystals) {
        if (c.enclosed_by != null && !enclosed.has(c.crystal_id)) enclosed.set(c.crystal_id, { step: sim.step, by: c.enclosed_by });
        if (c.dissolved && !lost.has(c.crystal_id)) lost.set(c.crystal_id, sim.step);
      }
    }
    const byId = new Map(sim.crystals.map(c => [c.crystal_id, c]));
    const solid = new Set(sim.crystals.filter(c => c.total_growth_um > 0).map(c => c.mineral));
    const pair = PAIR.map(m => [m, Math.max(0, ...sim.crystals.filter(c => c.mineral === m).map(c => c.total_growth_um))]);
    const describe = (c) => {
      const e = enclosed.get(c.crystal_id), host = e ? byId.get(e.by) : null;
      return `${c.mineral} #${c.crystal_id}: born at step ${c.nucleation_step}; ${c.total_growth_um > 0 ? um(c.total_growth_um) + ' at run end' : 'no solid at run end'}`
        + (e ? `; enclosed from step ${e.step} by ${host ? `${host.mineral} #${e.by} (${(host.total_growth_um / 1000).toFixed(1)} mm at run end)` : `#${e.by}`}${c.enclosed_by != null ? ', still enclosed at run end' : ', no longer enclosed at run end'}` : '; never enclosed')
        + (lost.has(c.crystal_id) ? `; lost its last solid at step ${lost.get(c.crystal_id)}` : '');
    };
    return { sim, solid, pair, describe, summary: summarize(sim), events: events.map(e => `${e.step} ${e.name}`) };
  } finally {
    for (const m of PAIR) MINERAL_ENGINES[m] = saved[m];
  }
}

console.log(`probe-enclosed-survivors — ${SCENARIO}, SIM ${SIM_VERSION}; the feldspar pair's rate clamped at k·min(sigma − 1, ${E})`);
for (const seed of [42, 1, 2]) {
  const A = run(seed, null), B = run(seed, E);
  if (seed === 42) {
    console.log(`events: ${A.events.join(' | ')}`);
    console.log(`seed 42: the shipped run ${JSON.stringify(A.summary) === JSON.stringify(BASELINE[SCENARIO]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
  }
  const gone = [...A.solid].filter(m => !B.solid.has(m)).sort();
  const size = (r) => r.pair.filter(([, g]) => g > 0).map(([m, g]) => `${m} ${(g / 1000).toFixed(1)} mm`).join(', ');
  console.log(`\nseed ${seed}: largest of the pair, shipped ${size(A)}; under the clamp ${size(B)}`);
  console.log(`  minerals with solid at run end as shipped and none under the clamp: ${gone.join(', ') || 'none'}`);
  for (const m of gone) {
    console.log(`  ${m}, shipped:`);
    for (const c of A.sim.crystals.filter(x => x.mineral === m)) console.log(`      ${A.describe(c)}`);
    console.log(`  ${m}, under the clamp:`);
    for (const c of B.sim.crystals.filter(x => x.mineral === m)) console.log(`      ${B.describe(c)}`);
  }
}
