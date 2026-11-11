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
 * Readings per run: the cavity's diameter and capacity as the simulator builds it, before any step
 * (the constructor sets the wall's diameter to that of a sphere of the built cavity's volume,
 * js/85-simulator.ts and VugWall.initializeCavityCapacity in js/22-geometry-wall.ts, so the
 * "15 mm" setting gives other diameters, by architecture); the largest fill of the run; the first step at fill >= 0.7 and at >= 0.999;
 * the first step that ends with the simulator's own seal latched (_vug_sealed, which the step sets
 * when the fill it reads is 1 or more, js/85-simulator.ts _sealVugIfFilled); at seed 42, the two
 * minerals that hold the largest share of the vug at the end, summed the way get_vug_fill sums the
 * fill.
 *
 * A scenario may author an open system (wall.open_system; data/scenarios.json5). The step reads
 * the fill of such a cavity as 0 (_refreshVugFillAndSeal, js/85-simulator.ts), so its growth is
 * never dampened for fill and it is never sealed, by the owner's directive of 2026-06-22 (the
 * comment beside the flag in data/scenarios.json5). get_vug_fill still returns its crystals' volume
 * over the wall's capacity. This probe prints that number for such a scenario, marks it, and leaves
 * the scenario out of every count of pockets that fill.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 every scenario's run in its own cavity is compared with the committed
 * baseline; and among the scenarios that author no open system, the runs that reach fill >= 0.999
 * are compared with the runs in which the simulator's own seal latched.
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
  const wall = sim.conditions.wall;
  // the cavity as built, before any step
  const built = { diameter: Number(wall.vug_diameter_mm), capacity: Number(wall.cavity_capacity_volume_mm3), open: !!wall.open_system, architecture: String(wall.architecture ?? 'unset') };
  const steps = runtime.scenarioData.defaultSteps ?? 100;
  let maxFill = 0, first70 = null, full = null, sealed = null, bornAfterFull = 0;
  let records = sim.crystals.length;
  for (let i = 0; i < steps; i++) {
    sim.run_step();
    const fill = sim.get_vug_fill();
    if (fill > maxFill) maxFill = fill;
    if (first70 == null && fill >= 0.7) first70 = sim.step;
    if (sealed == null && sim._vug_sealed === true) sealed = sim.step;
    if (full != null) bornAfterFull += sim.crystals.length - records;       // records are never removed
    records = sim.crystals.length;
    if (full == null && fill >= 0.999) full = sim.step;
  }
  let lastGrowth = 0;
  for (const c of sim.crystals) for (const z of c.zones) if (z.thickness_um > 0 && z.step > lastGrowth) lastGrowth = z.step;
  const capacity = Number(sim.conditions.wall.cavity_capacity_volume_mm3);
  const volume = {};
  for (const c of sim.crystals) {
    if (c.dissolved === true) continue;
    volume[c.mineral] = (volume[c.mineral] || 0) + _crystalSolidVolumeMm3(c);
  }
  const share = Object.entries(volume).map(([m, v]) => [m, v / capacity]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  return { steps, built, maxFill, first70, full, sealed, bornAfterFull, lastGrowth, share, summary: JSON.stringify(summarize(sim)) };
}

const names = Object.keys(SCENARIOS);
console.log(`probe-form-vug-fleet — SIM ${SIM_VERSION}; ${names.length} scenarios; seeds ${SEEDS.join(' / ')}; the form's vug setting is ${VUG_MM} mm; time scale ${getSimulationTimeScale()}`);
console.log('each scenario: its own cavity, then the vug, each with the diameter and capacity of the wall as built; three numbers are the three seeds\n');
const rows = [];
let reproduced = 0;
for (const name of names) {
  const own = SEEDS.map(seed => run(name, seed, {}));
  const vug = SEEDS.map(seed => run(name, seed, VUG));
  if (own[0].summary === JSON.stringify(BASELINE[name])) reproduced++;
  const open = own[0].built.open;
  if ([...own, ...vug].some(r => r.built.open !== open)) throw new Error(`${name}: open_system differs between its runs`);
  rows.push({ name, own, vug, open });
  const pct = (runs) => runs.map(r => (r.maxFill * 100).toFixed(0)).join(' / ');
  const at = (runs, key) => runs.map(r => r[key] ?? '—').join(' / ');
  const cavity = (r) => `${r.built.diameter.toFixed(0)} mm, ${(r.built.capacity / 1000).toFixed(2)} cm3`;
  console.log(`  ${name.padEnd(36)} own ${cavity(own[0])}: largest fill ${pct(own)} %, >= 0.7 at ${at(own, 'first70')}, >= 0.999 at ${at(own, 'full')} | vug ${cavity(vug[0])}: largest fill ${pct(vug)} %, >= 0.7 at ${at(vug, 'first70')}, >= 0.999 at ${at(vug, 'full')}, sealed by the simulator at ${at(vug, 'sealed')}, of ${vug[0].steps} steps; largest shares at seed ${SEEDS[0]}: ${vug[0].share.map(([m, x]) => `${m} ${(x * 100).toFixed(0)}`).join(', ') || 'nothing'}${open ? ' | AN OPEN SYSTEM: the step reads this fill as 0' : ''}`);
}

// Scenarios that author an open system: printed, and left out of the counts.
const openRows = rows.filter(r => r.open), closed = rows.filter(r => !r.open);
console.log(`\n${openRows.length} of the ${rows.length} scenarios author${openRows.length === 1 ? 's' : ''} an open system (wall.open_system): ${openRows.map(r => r.name).join(', ') || 'none'}`);
for (const r of openRows) {
  const each = (runs, f) => runs.map(f).join(' / ');
  console.log(`  ${r.name}: the fill above is its crystals' volume over the wall's capacity, which the step does not read. Largest in its own cavity ${each(r.own, x => (x.maxFill * 100).toFixed(0))} %, and at the vug setting ${each(r.vug, x => (x.maxFill * 100).toFixed(0))} %. The simulator's seal latched in ${[...r.own, ...r.vug].filter(x => x.sealed != null).length} of its ${r.own.length + r.vug.length} runs. At the vug setting the last positive zone is stored at step ${each(r.vug, x => x.lastGrowth)} of ${r.vug[0].steps}, and ${each(r.vug, x => x.bornAfterFull)} crystals are born after that volume passed 0.999 of the capacity.`);
}

const count = (key, which) => SEEDS.map((_, i) => closed.filter(r => r[which][i][key] != null).length).join(' / ');
console.log(`\nof the other ${closed.length} scenarios, at seeds ${SEEDS.join(' / ')}:`);
console.log(`  in the scenario's own cavity   ${count('full', 'own')} reach fill >= 0.999 inside their own length, and ${count('first70', 'own')} pass 0.7`);
console.log(`  at the form's vug setting      ${count('full', 'vug')} reach fill >= 0.999 inside their own length, and ${count('first70', 'vug')} pass 0.7`);
const every = (key, which) => closed.filter(r => r[which].every(x => x[key] != null));
const some = (key, which) => closed.filter(r => r[which].some(x => x[key] != null) && !r[which].every(x => x[key] != null));
const list = (found) => found.map(r => r.name).join(', ') || 'none';
const fullVug = every('full', 'vug');
console.log(`  full in the vug at all three seeds (${fullVug.length}): ${list(fullVug)}`);
{
  // of those, by the mineral that holds the largest share of the vug at the end of the seed-42 run
  const byPair = fullVug.filter(r => ['feldspar', 'albite'].includes(r.vug[0].share[0]?.[0]));
  const byOther = fullVug.filter(r => !byPair.includes(r));
  const grouped = {};
  for (const r of byOther) (grouped[r.vug[0].share[0]?.[0] ?? 'nothing'] ||= []).push(r.name);
  console.log(`    the mineral with the largest share of the vug at seed ${SEEDS[0]}: feldspar or albite in ${byPair.length} (${list(byPair)}); another mineral in ${byOther.length} (${Object.entries(grouped).map(([m, ns]) => `${m}: ${ns.join(', ')}`).join('; ') || 'none'})`);
}
console.log(`  full in the vug at one or two seeds (${some('full', 'vug').length}): ${list(some('full', 'vug'))}`);
console.log(`  full in their own cavity at all three seeds (${every('full', 'own').length}): ${list(every('full', 'own'))}; at one or two seeds (${some('full', 'own').length}): ${list(some('full', 'own'))}`);
const over = closed.flatMap(r => ['own', 'vug'].flatMap(which => r[which].map((x, i) => (x.maxFill > 1.005 ? `${r.name} (${which === 'own' ? 'its own cavity' : 'the vug'}, seed ${SEEDS[i]}): ${(x.maxFill * 100).toFixed(0)} %` : null)))).filter(Boolean);
console.log(`  runs whose largest fill is above 100 %: ${over.join('; ') || 'none'}`);
{
  // "full" here is fill >= 0.999; the simulator seals at a fill of 1 or more. Do the two agree?
  const all = closed.flatMap(r => ['own', 'vug'].flatMap(which => r[which].map((x, i) => ({ x, tag: `${r.name} (${which === 'own' ? 'its own cavity' : 'the vug'}, seed ${SEEDS[i]})` }))));
  const reach = all.filter(a => a.x.full != null), rest = all.filter(a => a.x.full == null);
  const unsealed = reach.filter(a => a.x.sealed == null), sealedShort = rest.filter(a => a.x.sealed != null);
  console.log(`  the simulator's own seal: latched in ${reach.length - unsealed.length} of the ${reach.length} runs that reach fill >= 0.999${unsealed.length ? ` (NOT IN: ${unsealed.map(a => a.tag).join('; ')})` : ''}, and in ${sealedShort.length} of the ${rest.length} that do not${sealedShort.length ? ` (${sealedShort.map(a => a.tag).join('; ')})` : ''}`);
}

{
  const range = (xs, digits) => `${Math.min(...xs).toFixed(digits)} to ${Math.max(...xs).toFixed(digits)}`;
  const vugs = rows.map(r => r.vug[0]);
  const byArch = {};
  for (const v of vugs) (byArch[v.built.architecture] ||= []).push(v);
  console.log(`\nthe wall at the form's vug setting, as built, over the ${rows.length} scenarios: ${range(vugs.map(v => v.built.diameter), 1)} mm across and ${range(vugs.map(v => v.built.capacity / 1000), 2)} cm3; by architecture: ${Object.entries(byArch).map(([a, vs]) => `${a} (${vs.length}) ${range(vs.map(v => v.built.diameter), 1)} mm, ${range(vs.map(v => v.built.capacity / 1000), 2)} cm3`).join('; ')}`);
}
console.log(`\ncontrol: at seed ${SEEDS[0]} the run in the scenario's own cavity ${reproduced === rows.length ? `reproduces the baseline for all ${rows.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${rows.length - reproduced} of ${rows.length} scenarios`}`);
