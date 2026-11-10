#!/usr/bin/env node
/**
 * probe-appearance-windows.mjs — the locality gate's first-appearance windows under each previewed
 * change (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4).
 *
 * `npm run audit:localities` (tools/locality-envelope-audit.mjs) holds a species to more than its
 * tier. A deterministic or statistical entry of a scenario may author `first_step_min` and
 * `first_step_max`, and the gate fails when the species first appears before the one or after the
 * other, at any seed of its panel (1, 2 and 42). probe-appearance-contract.mjs reads the tiers and
 * not these windows. This probe reads the windows.
 *
 * First it lists every scenario that authors a window, and in which tier. The gate checks a window
 * only on a deterministic or statistical entry; an aspirational entry must not appear at all, which
 * is the other probe's reading.
 *
 * Then, for each scenario with a window the gate checks, it runs the shipped scenario and each
 * previewed change that can reach it, at the gate's three seeds, and holds every such window to the
 * step the species first appears. The first step is read as tools/gen-locality-frequency-baseline.mjs
 * reads it for the gate's panel: after each run_step, the step number at which a crystal of the
 * mineral is first on record. The gate's seed-42 claim card takes its first step from the strip
 * recorder's nucleation events, which is not reproduced here.
 *
 * The changes are written as tools/sim-side-ab.mjs and probe-cation-gate.mjs write them:
 *   SC1 written into the engines   the rate of feldspar and albite clamped, k·min(σ − 1, 7) (`rclamp=7`)
 *   SC2, m = 1 and m = 3           every positive zone of galena, molybdenite and uraninite rescaled
 *                                  by m·(σ − 1)/σ (`excess=1`, `excess=3`)
 *   SC3, every step and held       the uraninite block's lead carried to every voxel each step
 *                                  (`pb`), or kept back and released on the next step a uraninite
 *                                  takes a negative zone (`held`)
 * An arm is run on a scenario only where the shipped run, at some seed, has a crystal on record of
 * a mineral the arm acts on. Where it has none the arm's code never runs and the run is the shipped
 * one. SC1 as recommended is authored on gem_pegmatite alone, and the listing says whether that
 * scenario authors a window.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports tools/_harness.mjs and node builtins.
 * Controls: at seed 42 every shipped run is compared with the committed baseline; the shipped runs
 * have to violate no window, since the gate passes on this tree; an arm with the clamp at Infinity
 * has to be the shipped run; and the check is seen to fail, on a window moved to close one step
 * before its species first appears.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-appearance-windows.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES } = await harness.loadSimBundle({
  toolName: 'probe-appearance-windows', extraExports: ['MINERAL_ENGINES'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const PANEL = [42, 1, 2];
const PAIR = ['feldspar', 'albite'], THREE = ['galena', 'molybdenite', 'uraninite'];

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

// ---- the authored windows ----
const entriesOf = (list) => (Array.isArray(list) ? list : []).map(e => (typeof e === 'string' ? { mineral: e } : e)).filter(e => e && e.mineral);
const windowed = (list) => entriesOf(list).filter(e => e.first_step_min != null || e.first_step_max != null);
const WINDOWS = {};                                  // scenario -> { checked: [entry], aspirational: [entry] }
for (const id of Object.keys(SCENARIOS).sort()) {
  setSeed(42);
  const s = SCENARIOS[id]().conditions._scenario || {};
  const checked = [...windowed(s.expects_species), ...windowed(s.deterministic_species), ...windowed(s.statistical_species)];
  const aspirational = windowed(s.aspirational_species);
  if (checked.length || aspirational.length) WINDOWS[id] = { checked, aspirational };
}
const windowText = (e) => `${e.first_step_min != null ? `not before step ${e.first_step_min}` : ''}${e.first_step_min != null && e.first_step_max != null ? ', ' : ''}${e.first_step_max != null ? `not after step ${e.first_step_max}` : ''}`;
const violates = (e, first) => first != null && ((e.first_step_min != null && first < e.first_step_min) || (e.first_step_max != null && first > e.first_step_max));

// ---- one run ----
// engines: [{ minerals, excess, rclamp }] wraps those growth engines as the A/B tool does.
function run(name, seed, { engines = [], timing = 'shipped' } = {}) {
  const saved = {};
  try {
    for (const arm of engines) {
      for (const m of arm.minerals) {
        if (!(m in saved)) saved[m] = MINERAL_ENGINES[m];
        const orig = MINERAL_ENGINES[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + m]();           // read before the engine runs; draws no random number
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          let f = 1;
          if (arm.excess != null) f *= s > 0 ? arm.excess * Math.max(0, s - 1) / s : 0;
          if (arm.rclamp != null && s - 1 > arm.rclamp) f *= arm.rclamp / (s - 1);
          if (f !== 1) {
            zone.thickness_um *= f;
            if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
          }
          return zone;
        };
      }
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    if (timing !== 'shipped') {
      // The uraninite block sits between a call of _sealVugIfFilled and the one call of _check_enclosure.
      // The bulk handle's Pb is read after the first and again before the second (probe-cation-gate.mjs).
      const grid = sim.wall_state.voxelGridFor(sim);
      let before = null, store = 0;
      const origSeal = sim._sealVugIfFilled;
      sim._sealVugIfFilled = function (...a) { const out = origSeal.apply(this, a); before = Number(this.conditions.fluid.Pb); return out; };
      const origEnclosure = sim._check_enclosure;
      sim._check_enclosure = function () {
        if (before != null) {
          const inc = Number(this.conditions.fluid.Pb) - before;
          if (timing === 'pb') {
            if (inc > 0) for (const v of grid.voxels) v.fluid.Pb += inc;
          } else {
            store += Math.max(0, inc);
            this.conditions.fluid.Pb = before;                       // restored, not subtracted
            const altered = this.crystals.some(c => c.mineral === 'uraninite' && c.zones.some(z => z.step === this.step && z.thickness_um < 0));
            if (altered && store > 0) {
              this.conditions.fluid.Pb = before + store;
              for (const v of grid.voxels) v.fluid.Pb += store;
              store = 0;
            }
          }
          before = null;
        }
        return origEnclosure.call(this);
      };
    }
    const first = new Map();
    for (let i = 0; i < (defaultSteps ?? 100); i++) {
      sim.run_step();
      for (const c of sim.crystals) {                                // as the frequency baseline's generator reads it
        const mineral = String(c?.mineral || '');
        if (mineral && !first.has(mineral)) first.set(mineral, Number(sim.step));
      }
    }
    return { first, summary: summarize(sim) };
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

const ARMS = [
  ['SC1 written into the engines (rclamp=7)', { engines: [{ minerals: PAIR, rclamp: 7 }] }, PAIR],
  ['SC2, same constant (excess=1)', { engines: [{ minerals: THREE, excess: 1 }] }, THREE],
  ['SC2, three times the constant (excess=3)', { engines: [{ minerals: THREE, excess: 3 }] }, THREE],
  ['SC3, every step (pb)', { timing: 'pb' }, ['uraninite']],
  ['SC3, held until alteration (held)', { timing: 'held' }, ['uraninite']],
];

console.log(`probe-appearance-windows — SIM ${SIM_VERSION}; the locality gate's first-appearance windows on its seed panel ${PANEL.join(' / ')}`);
console.log('\nscenarios that author a first-appearance window');
for (const [id, w] of Object.entries(WINDOWS)) {
  console.log(`  ${id.padEnd(22)} on deterministic or statistical entries (checked by the gate): ${w.checked.length}${w.checked.length ? ` (${w.checked.map(e => e.mineral).join(', ')})` : ''}`);
  console.log(`  ${''.padEnd(22)} on aspirational entries (must not appear at all): ${w.aspirational.length}${w.aspirational.length ? ` (${w.aspirational.map(e => e.mineral).join(', ')})` : ''}`);
}
console.log(`  gem_pegmatite, the one scenario SC1 as recommended reaches: ${WINDOWS.gem_pegmatite ? 'AUTHORS A WINDOW' : 'authors none'}`);
console.log(`  radioactive_pegmatite, which SC2 and SC3 reach: ${WINDOWS.radioactive_pegmatite ? 'AUTHORS A WINDOW' : 'authors none'}`);

let violations = 0, shippedViolations = 0, armsRun = 0, runsMoved = 0;
for (const [id, w] of Object.entries(WINDOWS)) {
  if (!w.checked.length) continue;
  const shipped = PANEL.map(seed => run(id, seed));
  console.log(`\n${id} — ${w.checked.length} checked window${w.checked.length === 1 ? '' : 's'}; seed 42: the shipped run ${JSON.stringify(shipped[0].summary) === JSON.stringify(BASELINE[id]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
  const report = (label, runs, isShipped) => {
    const bad = [], moved = [];
    for (const e of w.checked) {
      const steps = runs.map(r => r.first.get(e.mineral) ?? null);
      steps.forEach((s, i) => {
        if (violates(e, s)) bad.push(`${e.mineral} first appears at step ${s} at seed ${PANEL[i]} (${windowText(e)})`);
      });
      if (!isShipped) {
        const was = shipped.map(r => r.first.get(e.mineral) ?? null);
        if (steps.some((s, i) => s !== was[i])) moved.push(`${e.mineral} ${was.map(x => x ?? '—').join(' / ')} → ${steps.map(x => x ?? '—').join(' / ')} (${windowText(e)})`);
      }
    }
    const differs = isShipped ? null : runs.map((r, i) => (JSON.stringify(r.summary) === JSON.stringify(shipped[i].summary) ? 'no' : 'yes')).join(' / ');
    console.log(`  ${label}`);
    if (!isShipped) console.log(`      the baseline summary differs from shipped: ${differs}; windowed species whose first step moves: ${moved.length ? moved.join('; ') : 'none'}`);
    console.log(`      windows violated: ${bad.length ? bad.join('; ') : 'none'}`);
    return { bad: bad.length, moved: moved.length };
  };
  shippedViolations += report('shipped', shipped, true).bad;
  for (const [label, arm, acts] of ARMS) {
    const reached = shipped.some(r => acts.some(m => r.first.has(m)));
    if (!reached) { console.log(`  ${label}\n      not run: no ${acts.join(', ')} on record in the shipped run at any seed, so the arm's code never runs`); continue; }
    const runs = PANEL.map(seed => run(id, seed, arm));
    armsRun++;
    const r = report(label, runs, false);
    violations += r.bad;
    if (r.moved) runsMoved++;
  }
}

// ---- controls ----
const [cId, cW] = Object.entries(WINDOWS).find(([, w]) => w.checked.some(e => e.first_step_max != null));
const cEntry = cW.checked.find(e => e.first_step_max != null);
const cShipped = run(cId, 42);
const cFirst = cShipped.first.get(cEntry.mineral);
const neutral = run(cId, 42, { engines: [{ minerals: PAIR, rclamp: Infinity }, { minerals: THREE, rclamp: Infinity }] });
console.log('\ncontrols');
console.log(`  shipped runs: ${shippedViolations === 0 ? 'no window violated at any seed, as the gate reads the shipped tree' : `${shippedViolations} WINDOW VIOLATION(S) AS SHIPPED`}`);
console.log(`  the clamp at Infinity on all five engines, ${cId} at seed 42: ${JSON.stringify(neutral.summary) === JSON.stringify(cShipped.summary) && JSON.stringify([...neutral.first]) === JSON.stringify([...cShipped.first]) ? 'is the shipped run, first steps included' : 'MOVES THE RUN'}`);
console.log(`  the check seen to fail: ${cId}'s ${cEntry.mineral} first appears at step ${cFirst} as shipped; held to a window closing at step ${cFirst - 1} the check ${violates({ first_step_max: cFirst - 1 }, cFirst) ? 'reports a violation' : 'REPORTS NOTHING'}, and to its authored window (${windowText(cEntry)}) it ${violates(cEntry, cFirst) ? 'REPORTS A VIOLATION' : 'reports none'}`);
console.log(`\narms run: ${armsRun}; arms under which a windowed species' first step moves: ${runsMoved}; window violations under the arms: ${violations}`);
