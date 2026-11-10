#!/usr/bin/env node
/**
 * probe-form-vug-fleet.mjs — every scenario at the vug setting of Simulation mode's Cavity Size
 * select, as shipped (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1; §4 SC1; §6, decision 1).
 *
 * Simulation mode's form offers every scenario three cavity sizes besides its own (index.html,
 * #cavity-size; js/91-ui-legends.ts, runSimulation). The smallest, "vug", is 15 mm across, the
 * midpoint of the vug size class (resolveSizeClassToMm, js/22-geometry-wall.ts).
 * probe-pegmatite-reach.mjs runs gem_pegmatite there, where no single course SC1 considers keeps
 * the pocket open. This probe runs every scenario there, with no change at all, to see whether a
 * pocket that fills in that vug is one scenario's matter or the setting's.
 *
 * Each run is built as the form builds it: startSimulationCommandRuntime with a start command
 * that carries the form's overrides (js/85l-simulation-command-protocol.ts), which are none for
 * the scenario's own cavity and { wall: { size_class: 'vug', vug_diameter_mm: 15 } } for the vug.
 * It is stepped with run_step for the scenario's own length. Seeds 42, 1 and 2.
 *
 * Readings per run: the cavity's diameter; the largest fill of the run; the first step at fill
 * >= 0.7 and at >= 0.999; at seed 42, the two minerals that hold the largest share of the vug at
 * the end, summed the way get_vug_fill sums the fill.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Control: at seed 42 every scenario's run in its own cavity is compared with the committed
 * baseline.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-form-vug-fleet.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, SIM_VERSION, startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm,
  _crystalSolidVolumeMm3, getSimulationTimeScale,
} = await harness.loadSimBundle({
  toolName: 'probe-form-vug-fleet',
  extraExports: ['startSimulationCommandRuntime', 'makeSimulationStartCommand', 'resolveSizeClassToMm', '_crystalSolidVolumeMm3', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const VUG_MM = resolveSizeClassToMm('vug');
const VUG = { wall: { size_class: 'vug', vug_diameter_mm: VUG_MM } };      // what the form adds for that choice

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

// One run, built by the game's command runtime. Nothing of the simulator is kept.
function run(name, seed, overrides) {
  const runtime = startSimulationCommandRuntime(makeSimulationStartCommand(name, seed, overrides));
  const sim = runtime.sim;
  const steps = runtime.scenarioData.defaultSteps ?? 100;
  let maxFill = 0, first70 = null, full = null;
  for (let i = 0; i < steps; i++) {
    sim.run_step();
    const fill = sim.get_vug_fill();
    if (fill > maxFill) maxFill = fill;
    if (first70 == null && fill >= 0.7) first70 = sim.step;
    if (full == null && fill >= 0.999) full = sim.step;
  }
  const capacity = Number(sim.conditions.wall.cavity_capacity_volume_mm3);
  const volume = {};
  for (const c of sim.crystals) {
    if (c.dissolved === true) continue;
    volume[c.mineral] = (volume[c.mineral] || 0) + _crystalSolidVolumeMm3(c);
  }
  const share = Object.entries(volume).map(([m, v]) => [m, v / capacity]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  return { steps, diameter: Number(sim.conditions.wall.vug_diameter_mm), maxFill, first70, full, share, summary: JSON.stringify(summarize(sim)) };
}

const names = Object.keys(SCENARIOS);
console.log(`probe-form-vug-fleet — SIM ${SIM_VERSION}; ${names.length} scenarios; seeds ${SEEDS.join(' / ')}; the form's vug setting is ${VUG_MM} mm; time scale ${getSimulationTimeScale()}`);
console.log('each scenario: its own cavity, then the vug; three numbers are the three seeds\n');
const rows = [];
let reproduced = 0;
for (const name of names) {
  const own = SEEDS.map(seed => run(name, seed, {}));
  const vug = SEEDS.map(seed => run(name, seed, VUG));
  if (own[0].summary === JSON.stringify(BASELINE[name])) reproduced++;
  rows.push({ name, own, vug });
  const pct = (runs) => runs.map(r => (r.maxFill * 100).toFixed(0)).join(' / ');
  const at = (runs, key) => runs.map(r => r[key] ?? '—').join(' / ');
  console.log(`  ${name.padEnd(36)} own ${own[0].diameter.toFixed(0)} mm: largest fill ${pct(own)} %, >= 0.7 at ${at(own, 'first70')}, >= 0.999 at ${at(own, 'full')} | vug ${vug[0].diameter.toFixed(0)} mm: largest fill ${pct(vug)} %, >= 0.7 at ${at(vug, 'first70')}, >= 0.999 at ${at(vug, 'full')}, of ${vug[0].steps} steps; largest shares at seed ${SEEDS[0]}: ${vug[0].share.map(([m, x]) => `${m} ${(x * 100).toFixed(0)}`).join(', ') || 'nothing'}`);
}

const count = (key, which) => SEEDS.map((_, i) => rows.filter(r => r[which][i][key] != null).length).join(' / ');
console.log(`\nof ${rows.length} scenarios, at seeds ${SEEDS.join(' / ')}:`);
console.log(`  in the scenario's own cavity   ${count('full', 'own')} reach fill >= 0.999 inside their own length, and ${count('first70', 'own')} pass 0.7`);
console.log(`  at the form's vug setting      ${count('full', 'vug')} reach fill >= 0.999 inside their own length, and ${count('first70', 'vug')} pass 0.7`);
const every = (key, which) => rows.filter(r => r[which].every(x => x[key] != null)).map(r => r.name);
const some = (key, which) => rows.filter(r => r[which].some(x => x[key] != null) && !r[which].every(x => x[key] != null)).map(r => r.name);
console.log(`  full in the vug at all three seeds (${every('full', 'vug').length}): ${every('full', 'vug').join(', ') || 'none'}`);
console.log(`  full in the vug at one or two seeds (${some('full', 'vug').length}): ${some('full', 'vug').join(', ') || 'none'}`);
console.log(`  full in their own cavity at all three seeds (${every('full', 'own').length}): ${every('full', 'own').join(', ') || 'none'}; at one or two seeds (${some('full', 'own').length}): ${some('full', 'own').join(', ') || 'none'}`);
const over = rows.flatMap(r => ['own', 'vug'].flatMap(which => r[which].map((x, i) => (x.maxFill > 1.005 ? `${r.name} (${which === 'own' ? 'its own cavity' : 'the vug'}, seed ${SEEDS[i]}): ${(x.maxFill * 100).toFixed(0)} %` : null)))).filter(Boolean);
console.log(`  runs whose largest fill is above 100 %: ${over.join('; ') || 'none'}`);
console.log(`\ncontrol: at seed ${SEEDS[0]} the run in the scenario's own cavity ${reproduced === rows.length ? `reproduces the baseline for all ${rows.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${rows.length - reproduced} of ${rows.length} scenarios`}`);
