#!/usr/bin/env node
/**
 * probe-nucleation-envelope.mjs — does a supersaturation method wrapped on a scenario's conditions
 * object stay in force during nucleation? (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §7; the
 * `cap`, `fcap` and `root` interventions of tools/sim-side-ab.mjs are such wrappers.)
 *
 * Where per-vertex nucleation or the thermal field is active, js/85b installs a temporary envelope
 * around every supersaturation method for the length of a nucleation pass. If that envelope called
 * the production method directly, a wrapper would govern growth and not births. This probe wraps
 * supersaturation_<mineral> with a pass-through that counts its calls, split by whether the envelope
 * was evaluating, was bypassed (direct evaluation), or was not involved; and counts the nucleation
 * passes on which the envelope was installed. A pass-through may not move a run: each run is compared
 * with tests-js/baselines/seed42_v<SIM>.json.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports only tools/_harness.mjs and node builtins.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs            # the six minerals of the review; every scenario
 *   node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs --minerals selenite,celestine,calcite,aragonite,anhydrite naica_geothermal stalactite_demo zoned_dripstone_cave
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } = await harness.loadSimBundle({ toolName: 'probe-nucleation-envelope', extraExports: [] });
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const argv = process.argv.slice(2);
const mi = argv.indexOf('--minerals');
const MINERALS = mi >= 0 ? argv.splice(mi, 2)[1].split(',') : ['feldspar', 'albite', 'quartz', 'galena', 'uraninite', 'molybdenite'];
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

console.log(`localized-nucleation envelope, SIM ${SIM_VERSION}, seed 42 — pass-through wrappers on supersaturation_{${MINERALS.join(', ')}}`);
console.log('scenario                               per-vertex  thermal field  passes with the envelope / steps   wrapped calls: under the envelope / envelope bypassed / no envelope');
let ok = 0;
const installed = [];
for (const name of names) {
  setSeed(42);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  let simRef = null;
  const calls = { envelope: 0, direct: 0, outside: 0 };
  for (const m of MINERALS) {
    const orig = conditions['supersaturation_' + m];
    if (typeof orig !== 'function') continue;
    conditions['supersaturation_' + m] = function (...a) {
      if (simRef && simRef._localNucleationEnvelopeEvaluating) calls.envelope++;
      else if (simRef && simRef._localNucleationDirectEvaluation) calls.direct++;
      else calls.outside++;
      return orig.apply(this, a);
    };
  }
  const sim = new VugSimulator(conditions, events);
  simRef = sim;
  if (typeof sim._installLocalizedNucleationEnvelope !== 'function') throw new Error('VugSimulator._installLocalizedNucleationEnvelope is gone: the probe cannot count envelope passes');
  let passes = 0;
  const origInstall = sim._installLocalizedNucleationEnvelope;
  sim._installLocalizedNucleationEnvelope = function () {
    const restore = origInstall.call(this);
    if (restore) passes++;
    return restore;
  };
  const steps = defaultSteps ?? 100;
  let thermal = !!sim._thermalFieldActivated;
  for (let i = 0; i < steps; i++) { sim.run_step(); thermal ||= !!sim._thermalFieldActivated; }
  const same = JSON.stringify(summarize(sim)) === JSON.stringify(BASELINE[name]);
  if (same) ok++;
  if (passes) installed.push(name);
  console.log(`${name.padEnd(38)} ${String(!!sim.wall_state.per_vertex_nucleation).padStart(10)} ${String(thermal).padStart(14)}  ${String(passes).padStart(12)} / ${String(steps).padEnd(5)}              ${String(calls.envelope).padStart(9)} / ${String(calls.direct).padStart(7)} / ${String(calls.outside).padStart(8)}${same ? '' : '   RUN DOES NOT REPRODUCE THE BASELINE'}`);
}
console.log(`scenarios that installed the envelope: ${installed.join(', ') || 'none'}`);
console.log(`integrity: ${ok} of ${names.length} runs reproduce tests-js/baselines/seed42_v${SIM_VERSION}.json with the wrappers attached`);
