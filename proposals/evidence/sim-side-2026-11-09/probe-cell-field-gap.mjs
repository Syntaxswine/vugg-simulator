#!/usr/bin/env node
/**
 * probe-cell-field-gap.mjs — one fluid field on a mineral's own cells against the bulk handle, at
 * the moment the engines run (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.1).
 *
 * The census attributes a cell that reads far below the bulk handle to the mineral's ingredients or
 * to one further field. This probe shows the values behind one such attribution. On every step, at
 * the dry run of the engines (a wrapper on _computeGraduatedZones, js/85b), for every active crystal
 * of the mineral it reads the field on the bulk handle and on the crystal's own cell, and the
 * mineral's sigma on the cell and on the bulk handle's fluid at the cell's temperature. It prints
 * the range of each, and how many crystal-steps have the cell on one side of an edge and the bulk
 * handle on the other, when an edge is given.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports only tools/_harness.mjs and node
 * builtins. At seed 42 the run is compared with tests-js/baselines/seed42_v<SIM>.json.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-cell-field-gap.mjs schneeberg uranophane pH 6.0
 *   node proposals/evidence/sim-side-2026-11-09/probe-cell-field-gap.mjs supergene_oxidation ferrimolybdite O2
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [scenario, mineral, field, edgeText] = process.argv.slice(2);
if (!scenario || !mineral || !field) throw new Error('usage: probe-cell-field-gap.mjs <scenario> <mineral> <fluid field> [edge]');
const edge = edgeText === undefined ? null : Number(edgeText);
if (edge !== null && !Number.isFinite(edge)) throw new Error(`bad edge ${edgeText}`);
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, temperatureAtMeshVertex } = await harness.loadSimBundle({
  toolName: 'probe-cell-field-gap', extraExports: ['temperatureAtMeshVertex'] });
if (!SCENARIOS[scenario]) throw new Error(`unknown scenario ${scenario}`);
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));

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
const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);
const range = (a, d) => (a.length ? `${Math.min(...a).toFixed(d)} to ${Math.max(...a).toFixed(d)}` : '—');

console.log(`${scenario}, ${mineral}: ${field} on the bulk handle and on each active crystal's own cell, read when the engines run — SIM ${SIM_VERSION}`);
for (const seed of [42, 1, 2]) {
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[scenario]();
  const sim = new VugSimulator(conditions, events);
  const mesh = sim.wall_state.meshFor(sim);
  const fn = sim.conditions['supersaturation_' + mineral];
  if (typeof fn !== 'function') throw new Error(`no supersaturation_${mineral}`);
  const sigmaWith = (fluid, temperature) => {
    const sf = sim.conditions.fluid, st = sim.conditions.temperature, direct = !!sim._localNucleationDirectEvaluation;
    try {
      sim._localNucleationDirectEvaluation = true;
      sim.conditions.fluid = fluid; sim.conditions.temperature = temperature;
      const v = fn.call(sim.conditions);
      return Number.isFinite(v) ? v : 0;
    } finally { sim.conditions.fluid = sf; sim.conditions.temperature = st; sim._localNucleationDirectEvaluation = direct; }
  };
  const bulkField = [], cellField = [], sigmaBulk = [], sigmaCell = [];
  let across = 0, first = null, last = null;
  const orig = sim._computeGraduatedZones;
  sim._computeGraduatedZones = function (...a) {
    const out = orig.apply(this, a);
    const bulk = this.conditions.fluid;
    for (const c of this.crystals) {
      if (c.mineral !== mineral || !c.active) continue;
      const chem = this.wall_state.chemistryAddressForCrystal(c), cell = mesh.cellOf(c, this.wall_state);
      if (!chem || !cell || !cell.fluid) continue;
      const T = temperatureAtMeshVertex(this, mesh, chem.vertexIndex);
      const b = Number(bulk[field]), v = Number(cell.fluid[field]);
      bulkField.push(b); cellField.push(v);
      sigmaBulk.push(sigmaWith(bulk, T)); sigmaCell.push(sigmaWith(cell.fluid, T));
      if (edge !== null && ((b >= edge) !== (v >= edge))) across++;
      if (first == null) first = this.step;
      last = this.step;
    }
    return out;
  };
  const steps = defaultSteps ?? 100;
  for (let i = 0; i < steps; i++) sim.run_step();
  const same = seed === 42 ? JSON.stringify(summarize(sim)) === JSON.stringify(BASELINE[scenario]) : null;
  const gap = bulkField.map((b, i) => b - cellField[i]);
  console.log(`  seed ${String(seed).padStart(2)}${same == null ? '' : same ? ' (reproduces the baseline)' : ' (DOES NOT REPRODUCE THE BASELINE)'}: ${bulkField.length} crystal-steps, steps ${first ?? '—'} to ${last ?? '—'}`);
  console.log(`           ${field} on the bulk handle ${range(bulkField, 4)}; on the cell ${range(cellField, 4)}; bulk minus cell ${range(gap, 6)}, median ${median(gap).toFixed(6)}`);
  console.log(`           sigma on the bulk handle's fluid at the cell's temperature: median ${median(sigmaBulk).toFixed(2)}; on the cell: median ${median(sigmaCell).toFixed(2)}`);
  if (edge !== null) console.log(`           the cell and the bulk handle are on opposite sides of ${field} = ${edge} on ${across} of ${bulkField.length} crystal-steps`);
}
