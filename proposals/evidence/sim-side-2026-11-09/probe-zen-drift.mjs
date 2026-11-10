#!/usr/bin/env node
/**
 * probe-zen-drift.mjs — which of the writes Zen mode's drift makes reach the fluid a crystal
 * grows from (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1; §3.3; §6, decision 8).
 *
 * Zen mode has no events. Before each step idleApplyDrift (js/98a-ui-zen.ts) writes the
 * simulator's conditions directly: a walk on nine fluid species and on pH, a walk on temperature,
 * and with a 2 % chance one of five random events, four of which write something (a thermal
 * pulse; an injection that multiplies one species by 2 to 6; a "crack" that shifts pH and drops
 * the pressure; a cooling that also cuts silica to 0.6). None of these writes is made inside a
 * _snapshotGlobal / _propagateGlobalDelta pair, which is how an event's change is carried to the
 * cells. A crystal's engine does not read the conditions as they stand either:
 * _runEngineForCrystal (js/85b-simulator-nucleate.ts) puts the crystal's own cell's fluid and
 * temperature in place of the bulk handle's for the length of the call, and leaves the pressure.
 * So whether a write reaches a crystal depends on what kind of write it is.
 *
 * Part 1, no step run. A Zen simulator is built by the game's own constructor (idleCreateSim,
 * the clock held at the seed, at Zen's time scale of 1) and stepped 60 times with run_step alone,
 * so that it has crystals. Then one write at a time is made as the drift makes it; sigma is read
 * for every active crystal the way its engine would read it (the cell's fluid and temperature
 * swapped in, as _runEngineForCrystal does) and for the same minerals on the bulk handle; and
 * the write is put back. Four writes, each about as large as one random event makes it:
 *   species       each of the drift's nine species × 4 (the injection multiplies one by 2 to 6)
 *   pH            − 0.75 (the crack shifts it by up to 0.75 either way)
 *   temperature   − 50 °C (the cooling takes 30 to 80)
 *   pressure      − 0.5 kbar, clamped as the event clamps it (the crack takes 0.05 to 0.5)
 * Part 2, one step later, at seed 42. For each write a fresh simulator is built the same way, the
 * write is made and left in place, and run_step is called once. The probe prints what the bulk
 * handle and the cells hold before the write, after it and after the step, beside the same step
 * on a simulator with no write.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes, and throws if the
 * game's constructor leaves no simulator. Imports tools/_harness.mjs and node builtins. The
 * constructor writes to the page's in-memory state (a visible simulator) and to no file.
 * Controls: gem_pegmatite's shipped run at seed 42 is compared with the committed baseline at the
 * start and at the end, with the time scale read back; in Part 1 every sigma read again with
 * nothing applied has to be the same; in Part 2 every fresh simulator has to be the one Part 1
 * read at that seed (the same crystals and the same bulk fluid before the write).
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-zen-drift.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, VugSimulator, setSeed, SIM_VERSION, idleCreateSim, setSimulationTimeScale, getSimulationTimeScale,
  temperatureAtMeshVertex, clampFluidPressureKbar,
} = await harness.loadSimBundle({
  toolName: 'probe-zen-drift',
  extraExports: ['idleCreateSim', 'setSimulationTimeScale', 'getSimulationTimeScale', 'temperatureAtMeshVertex', 'clampFluidPressureKbar'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const NAMES = ['mvt', 'gem_pegmatite', 'radioactive_pegmatite'];
const SEEDS = [42, 1, 2];
const STEPS = 60;
const DRIFT_SPECIES = ['SiO2', 'Ca', 'CO3', 'Fe', 'Mn', 'F', 'Zn', 'S', 'Cu'];   // js/98a-ui-zen.ts, idleApplyDrift

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
function baselineCheck() {
  setSeed(42);
  const { conditions, events, defaultSteps } = SCENARIOS.gem_pegmatite();
  const sim = new VugSimulator(conditions, events);
  for (let i = 0; i < (defaultSteps ?? 100); i++) sim.run_step();
  return JSON.stringify(summarize(sim)) === JSON.stringify(BASELINE.gem_pegmatite);
}

// Zen's own simulator for a scenario, stepped without the drift.
function build(name, seed) {
  setSeed(seed);
  const clock = Date.now;
  Date.now = () => seed;                         // idleCreateSim seeds from the clock
  let sim;
  try { sim = idleCreateSim(name); } finally { Date.now = clock; }
  if (!sim) throw new Error(`idleCreateSim('${name}') returned no simulator under the harness`);
  for (let i = 0; i < STEPS; i++) sim.run_step();
  return sim;
}
// The state a fresh simulator has to share with the one Part 1 read.
const stamp = (sim) => JSON.stringify(summarize(sim)) + ' ' + DRIFT_SPECIES.map(k => sim.conditions.fluid[k]).join(',') + ' ' + sim.conditions.fluid.pH + ' ' + sim.conditions.temperature + ' ' + sim.conditions.pressure;

// Sigma as the crystal's engine would read it: the conditions set up as _runEngineForCrystal
// sets them up (js/85b-simulator-nucleate.ts), the method called, the conditions put back.
function sigmaOnCell(sim, crystal) {
  const cnd = sim.conditions;
  const fn = cnd['supersaturation_' + crystal.mineral];
  const chemistry = sim.wall_state.chemistryAddressForCrystal(crystal);
  const ringIdx = chemistry ? chemistry.ringIdx : null;
  if (ringIdx == null || ringIdx < 0 || ringIdx >= sim.ring_fluids.length) return fn.call(cnd);
  const mesh = sim.wall_state.meshFor(sim);
  const cell = mesh.cellOf(crystal, sim.wall_state);
  const savedFluid = cnd.fluid, savedTemp = cnd.temperature;
  cnd.fluid = (cell && cell.fluid) ? cell.fluid : sim.ring_fluids[ringIdx];
  cnd.temperature = temperatureAtMeshVertex(sim, mesh, chemistry.vertexIndex);
  try { return fn.call(cnd); } finally { cnd.fluid = savedFluid; cnd.temperature = savedTemp; }
}
const differs = (a, b) => Math.abs(a - b) > 1e-12 * Math.max(1, Math.abs(a));

// The four writes. Each returns a function that puts the old values back (restored, not subtracted).
const WRITES = [
  ['nine species × 4', (c) => {
    const old = DRIFT_SPECIES.map(k => c.fluid[k]);
    for (const k of DRIFT_SPECIES) c.fluid[k] = Math.max(c.fluid[k] || 0, 10) * 4;     // as the injection event writes one of them
    return () => DRIFT_SPECIES.forEach((k, i) => { c.fluid[k] = old[i]; });
  }],
  ['pH − 0.75', (c) => { const old = c.fluid.pH; c.fluid.pH = Math.max(3.0, Math.min(9.0, old - 0.75)); return () => { c.fluid.pH = old; }; }],
  ['temperature − 50 °C', (c) => { const old = c.temperature; c.temperature = Math.max(25, old - 50); return () => { c.temperature = old; }; }],
  ['pressure − 0.5 kbar', (c) => { const old = c.pressure; c.pressure = clampFluidPressureKbar(old - 0.5); return () => { c.pressure = old; }; }],
];

console.log(`probe-zen-drift — SIM ${SIM_VERSION}; seeds ${SEEDS.join(' / ')}; ${STEPS} steps of run_step before the readings`);
console.log(`control at the start: gem_pegmatite's shipped run at seed 42 ${baselineCheck() ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; time scale ${getSimulationTimeScale()}`);
setSimulationTimeScale(1);
const stamps = {};

console.log(`\nPART 1 — one write at a time, no step run; time scale ${getSimulationTimeScale()}`);
for (const name of NAMES) {
  const rows = SEEDS.map(seed => {
    const sim = build(name, seed);
    stamps[name + ' ' + seed] = stamp(sim);
    const c = sim.conditions;
    const active = sim.crystals.filter(x => x.active && typeof c['supersaturation_' + x.mineral] === 'function');
    const minerals = [...new Set(active.map(x => x.mineral))].sort();
    const base = active.map(x => sigmaOnCell(sim, x));
    const baseBulk = minerals.map(m => c['supersaturation_' + m]());
    const writes = WRITES.map(([label, apply]) => {
      const undo = apply(c);
      const after = active.map(x => sigmaOnCell(sim, x));
      const afterBulk = minerals.map(m => c['supersaturation_' + m]());
      const now = label.startsWith('pressure') ? c.pressure : null;
      undo();
      const changed = active.map((x, i) => (differs(base[i], after[i]) ? `${x.mineral} ${base[i].toFixed(3)} → ${after[i].toFixed(3)}` : null)).filter(Boolean);
      return { changed, bulkChanged: minerals.filter((m, i) => differs(baseBulk[i], afterBulk[i])), now };
    });
    const again = active.map(x => sigmaOnCell(sim, x));
    return { scenario: c._scenario != null, active: active.length, minerals: minerals.length, T: c.temperature, P: c.pressure, writes,
      same: again.every((v, i) => v === base[i]) && minerals.every((m, i) => c['supersaturation_' + m]() === baseBulk[i]) };
  });
  const each = (f) => rows.map(f).join(' / ');
  console.log(`\n  ${name}: scenario object ${rows.some(r => r.scenario) ? 'PRESENT at some seed' : 'absent at every seed'}; active crystals ${each(r => r.active)} of ${each(r => r.minerals)} minerals; conditions at ${each(r => r.T.toFixed(0))} °C and ${each(r => r.P)} kbar`);
  WRITES.forEach(([label], w) => {
    const example = rows[0].writes[w].changed[0];
    console.log(`    ${label.padEnd(20)} sigma on the crystal's own cell changes for ${each(r => r.writes[w].changed.length)} crystals; on the bulk handle for ${each(r => r.writes[w].bulkChanged.length)} minerals${rows[0].writes[w].now != null ? `; pressure then ${each(r => r.writes[w].now)} kbar` : ''}${example ? `; at seed ${SEEDS[0]}, ${rows[0].writes[w].changed.join('; ')}` : ''}`);
  });
  console.log(`    control: read again with nothing applied, ${rows.every(r => r.same) ? 'every sigma is the same at every seed' : 'SOME SIGMA DIFFERS'}`);
}

// ---- part 2 ----
console.log(`\nPART 2 — one step after the write, seed ${SEEDS[0]}; each line gives the value before the write → after it → after one run_step, and in brackets the value after the same step on a simulator with no write`);
const f = (x) => (Math.abs(x) >= 100 ? x.toFixed(1) : x.toFixed(3));
function reading(sim) {
  const c = sim.conditions;
  const grid = sim.wall_state.voxelGridFor(sim);
  let si = 0, ph = 0;
  for (const v of grid.voxels) { si += Number(v.fluid.SiO2) || 0; ph += Number(v.fluid.pH) || 0; }
  const rings = sim.ring_temperatures || [];
  return { bulkSiO2: Number(c.fluid.SiO2), voxelSiO2: si / grid.voxels.length, bulkPH: Number(c.fluid.pH), voxelPH: ph / grid.voxels.length,
    T: Number(c.temperature), ringT: rings.length ? rings.reduce((a, b) => a + b, 0) / rings.length : NaN, P: Number(c.pressure) };
}
const STEP_WRITES = [
  ['SiO2 × 4', (c) => { c.fluid.SiO2 = Math.max(c.fluid.SiO2 || 0, 10) * 4; }, [['SiO2 on the bulk handle', 'bulkSiO2'], ['mean SiO2 over the voxels', 'voxelSiO2']]],
  ['pH − 0.75', (c) => { c.fluid.pH = Math.max(3.0, Math.min(9.0, c.fluid.pH - 0.75)); }, [['pH on the bulk handle', 'bulkPH'], ['mean pH over the voxels', 'voxelPH']]],
  ['temperature − 50 °C', (c) => { c.temperature = Math.max(25, c.temperature - 50); }, [['the conditions\' temperature', 'T'], ['mean of the rings\' temperatures', 'ringT']]],
  ['pressure − 0.5 kbar', (c) => { c.pressure = clampFluidPressureKbar(c.pressure - 0.5); }, [['the conditions\' pressure', 'P']]],
];
let fresh = true;
for (const name of NAMES) {
  const seed = SEEDS[0];
  const plain = build(name, seed);
  if (stamp(plain) !== stamps[name + ' ' + seed]) fresh = false;
  plain.run_step();
  const control = reading(plain);
  console.log(`\n  ${name}`);
  for (const [label, apply, fields] of STEP_WRITES) {
    const sim = build(name, seed);
    if (stamp(sim) !== stamps[name + ' ' + seed]) fresh = false;
    const before = reading(sim);
    apply(sim.conditions);
    const written = reading(sim);
    sim.run_step();
    const after = reading(sim);
    console.log(`    ${label.padEnd(20)} ${fields.map(([text, key]) => `${text} ${f(before[key])} → ${f(written[key])} → ${f(after[key])} [${f(control[key])}]`).join('; ')}`);
  }
}
console.log(`\n  control: every simulator of Part 2 ${fresh ? 'is the one Part 1 read at that seed' : 'IS A DIFFERENT RUN'}`);

setSimulationTimeScale(5);
console.log(`\ncontrol at the end: the time scale reads ${getSimulationTimeScale()}; gem_pegmatite's shipped run at seed 42 ${baselineCheck() ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
// The page's code may leave a timer behind; leave once the output is written.
process.stdout.write('', () => process.exit(0));
