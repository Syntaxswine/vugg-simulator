#!/usr/bin/env node
/**
 * probe-bound-nudge.mjs — SC1's previewed bound under a nudge, in gem_pegmatite's own cavity and
 * at the vug setting of Simulation mode's form
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the sixth note, which cites it; the
 * readings it puts to a nudge are those of §4, SC1 and §6, decision 1).
 *
 * The sixth note of §3.4 finds that a pocket which is full hands the next crystal whatever room is
 * left, and that a nudge of one part in 10^13 can then move a run. The readings this document
 * gives for SC1's preview (the pair's rate clamped at E = 7) were made without a nudge. This probe
 * puts them to one: gem_pegmatite with the clamp written inside the engine, as
 * probe-clamp-in-engine.mjs writes it, at seeds 42 / 1 / 2, in the scenario's own cavity and in
 * the form's vug (15 mm), each run made again with every positive zone of every growth engine
 * multiplied by one of the twelve factors probe-rounding-twelve.mjs uses. Under the bound the own
 * cavity does not fill in the run's length and the vug fills near step 98.
 *
 * For each run it reads what the document quotes: the largest fill, the first step at a fill of
 * 0.7 and of 0.999, and the largest quartz, tourmaline, topaz, feldspar and albite with solid.
 * A nudged run is compared with the un-nudged run of the same cavity and seed in:
 *   reached     some binary place of a crystal's size or of the fill at the end differs;
 *   the steps   the first step at a fill of 0.7, or of 0.999, or of 1 to a billionth, is another;
 *   a crystal   some crystal's size at the end differs by more than a billionth of itself, or its
 *               active flag or host differs, or the runs hold other crystals;
 *   the summary the baseline-style summary differs.
 *
 * Each cavity and seed is run in a child process of this file (--one, the cavity and the seed),
 * six at a time, and the reports are printed in a fixed order.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: a nudge of exactly 1 has to be the un-nudged run to the last binary place, in each
 * cavity at each seed; with the clamp at Infinity and no nudge the own cavity's seed-42 run has to
 * reproduce the committed baseline. The un-nudged readings are printed in the form
 * probe-clamp-in-engine.txt prints them for the clamp "in the engine", for the two outputs to be
 * held together.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-bound-nudge.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale, startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm,
} = await harness.loadSimBundle({
  toolName: 'probe-bound-nudge',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale', 'startSimulationCommandRuntime', 'makeSimulationStartCommand', 'resolveSizeClassToMm'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const NAME = 'gem_pegmatite';
const PAIR = ['feldspar', 'albite'];
const E = 7;
const SEEDS = [42, 1, 2];
const VUG_MM = resolveSizeClassToMm('vug');
const CAVITIES = [['own', 'the scenario\'s own cavity', {}], ['vug', `the form's vug (${VUG_MM} mm)`, { wall: { size_class: 'vug', vug_diameter_mm: VUG_MM } }]];
// the twelve factors of probe-rounding-twelve.mjs
const NUDGES = [1 + 2.220446049250313e-16, 1 - 1.1102230246251565e-16, 1 + 4e-16, 1 - 4e-16, 1 + 1e-15, 1 - 1e-15,
  1 + 1e-14, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13, 1 + 1e-12, 1 - 1e-12];
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);
const mm = (um) => (um == null ? '—' : (um / 1000).toFixed(um < 1000 ? 2 : 1));      // probe-clamp-in-engine.mjs's
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));

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

// One run. bound: the clamp's value on the pair, written inside the engine (for the engine's call
// alone its σ method on the conditions returns min(σ, bound + 1)), as probe-clamp-in-engine.mjs
// writes it. nudge: every positive zone of every growth engine is multiplied by it; null for none.
function run(overrides, seed, { bound = E, nudge = null } = {}) {
  const saved = {};
  try {
    for (const mineral of Object.keys(MINERAL_ENGINES)) {
      const orig = MINERAL_ENGINES[mineral];
      let engine = orig;
      if (PAIR.includes(mineral)) {
        const name = 'supersaturation_' + mineral, inner = engine;
        engine = (crystal, conditions, step) => {
          const own = Object.prototype.hasOwnProperty.call(conditions, name);
          const shipped = conditions[name];
          conditions[name] = function () { const s = shipped.call(this); return s - 1 > bound ? bound + 1 : s; };
          try { return inner(crystal, conditions, step); } finally { if (own) conditions[name] = shipped; else delete conditions[name]; }
        };
      }
      if (nudge != null) {
        const inner = engine;
        engine = (crystal, conditions, step) => {
          const zone = inner(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0) || nudge === 1) return zone;
          zone.thickness_um *= nudge;
          if (typeof zone.growth_rate === 'number') zone.growth_rate *= nudge;
          return zone;
        };
      }
      if (engine !== orig) { saved[mineral] = orig; MINERAL_ENGINES[mineral] = engine; }
    }
    const runtime = startSimulationCommandRuntime(makeSimulationStartCommand(NAME, seed, overrides));
    const sim = runtime.sim;
    const steps = runtime.scenarioData.defaultSteps ?? 100;
    let maxFill = 0, first70 = null, full = null, firstFull = null;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (fill > maxFill) maxFill = fill;
      if (first70 == null && fill >= 0.7) first70 = sim.step;
      if (full == null && fill >= 0.999) full = sim.step;
      if (firstFull == null && fill >= 1 - 1e-9) firstFull = sim.step;
    }
    const species = {};
    for (const c of sim.crystals) {
      if (!(c.total_growth_um > 0)) continue;
      if (!(c.total_growth_um <= species[c.mineral])) species[c.mineral] = c.total_growth_um;
    }
    const crystals = sim.crystals.map(c => ({ who: `${c.mineral} #${c.crystal_id}`, um: c.total_growth_um, active: c.active, by: c.enclosed_by ?? null }));
    const fill = sim.get_vug_fill();
    return { steps, maxFill, fill, first70, full, firstFull, species, crystals, summary: JSON.stringify(summarize(sim)), exact: JSON.stringify([crystals, fill]) };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
// What differs between a nudged run and the un-nudged one (the header says what each word means).
function compare(base, r) {
  const other = base.crystals.length !== r.crystals.length;
  const apart = other ? [] : base.crystals.map((x, j) => ({ x, y: r.crystals[j] })).filter(({ x, y }) => x.who !== y.who || !near(x.um, y.um) || x.active !== y.active || x.by !== y.by);
  const worst = apart.slice().sort((p, q) => Math.abs(q.x.um - q.y.um) - Math.abs(p.x.um - p.y.um))[0];
  return { reached: base.exact !== r.exact, step70: base.first70 !== r.first70, step999: base.full !== r.full, stepFull: base.firstFull !== r.firstFull,
    crystal: other || apart.length > 0, differing: apart.length, other,
    worst: worst ? `${worst.x.who} (${worst.x.um.toPrecision(7)} against ${worst.y.um.toPrecision(7)} µm${worst.x.active !== worst.y.active || worst.x.by !== worst.y.by ? ', and its active flag or host' : ''})` : null,
    summary: base.summary !== r.summary, first70: r.first70, full: r.full };
}
// One cavity at one seed: the un-nudged run under the bound, and the twelve nudged ones.
function cell(cavity, seed) {
  const overrides = CAVITIES.find(([key]) => key === cavity)[2];
  const base = run(overrides, seed);
  const out = { cavity, seed, steps: base.steps, maxFill: base.maxFill, fill: base.fill, first70: base.first70, full: base.full, firstFull: base.firstFull, species: base.species, count: base.crystals.length,
    unity: run(overrides, seed, { nudge: 1 }).exact === base.exact,
    baseline: cavity === 'own' && seed === SEEDS[0] ? run(overrides, seed, { bound: Infinity }).summary === JSON.stringify(BASELINE[NAME]) : null,
    ds: NUDGES.map(nudge => ({ nudge, d: compare(base, run(overrides, seed, { nudge })) })) };
  return out;
}

if (process.argv.includes('--one')) {
  // One cavity at one seed, for the run below: its report, as one line of JSON.
  const at = process.argv.indexOf('--one');
  console.log('ONE ' + JSON.stringify(cell(process.argv[at + 1], Number(process.argv[at + 2]))));
} else {
  console.log(`probe-bound-nudge — SIM ${SIM_VERSION}; ${NAME} with the rate of ${PAIR.join(' and ')} clamped inside the engine at E = ${E}; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`${NUDGES.length} nudges of every growth engine's positive zones (${NUDGES.map(label).join(', ')})`);
  console.log(`each cavity and seed is run in a process of its own, this probe started with --one, the cavity and the seed, ${JOBS} at a time`);
  const { spawn } = await import('node:child_process');
  const inChild = (cavity, seed) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--one', cavity, String(seed)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const found = text.split(/\r?\n/).find(l => l.startsWith('ONE '));
      if (code !== 0 || !found) reject(new Error(`${cavity}, seed ${seed}: its process exited ${code}${found ? '' : ' and printed no report'}`));
      else resolve(JSON.parse(found.slice('ONE '.length)));
    });
  });
  const jobs = CAVITIES.flatMap(([key]) => SEEDS.map(seed => [key, seed]));
  const reports = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < jobs.length) { const i = next++; reports[i] = await inChild(...jobs[i]); }
  }));

  let unity = 0, runs = 0, moved = 0;
  for (const [key, text] of CAVITIES) {
    const cells = reports.filter(r => r.cavity === key);
    for (const c of cells) if (c.unity) unity++;
    console.log(`\n${text}, ${cells[0].steps} steps`);
    console.log(`  the bound, no nudge   largest fill of the run ${each(cells, c => (c.maxFill * 100).toFixed(1))} %, at its end ${each(cells, c => (c.fill * 100).toFixed(1))} %; first step at fill >= 0.7 ${each(cells, c => c.first70 ?? '—')}; at >= 0.999 ${each(cells, c => c.full ?? '—')}; quartz ${each(cells, c => mm(c.species.quartz))} mm, tourmaline ${each(cells, c => mm(c.species.tourmaline))}, topaz ${each(cells, c => mm(c.species.topaz))}, feldspar ${each(cells, c => mm(c.species.feldspar))}, albite ${each(cells, c => mm(c.species.albite))}; first step at a fill of 1 to a billionth ${each(cells, c => c.firstFull ?? '—')}; crystals ${each(cells, c => c.count)}`);
    const n = (test) => each(cells, c => c.ds.filter(x => test(x.d)).length);
    console.log(`  the ${NUDGES.length} nudged runs at each seed: reached ${n(d => d.reached)}; the first step at a fill of 0.7 is another in ${n(d => d.step70)}, at 0.999 in ${n(d => d.step999)}, at 1 to a billionth in ${n(d => d.stepFull)}; a crystal's size, active flag or host differs at the end in ${n(d => d.crystal)}; the summary differs in ${n(d => d.summary)}`);
    for (const c of cells) {
      for (const { nudge, d } of c.ds) {
        runs++;
        if (!(d.step70 || d.step999 || d.stepFull || d.crystal || d.summary)) continue;
        moved++;
        const what = [d.step70 && `0.7 at step ${d.first70 ?? '—'}`, d.step999 && `0.999 at step ${d.full ?? '—'}`, d.stepFull && 'another step at 1 to a billionth',
          d.crystal && (d.other ? 'the runs hold other crystals' : `${d.differing} crystal${d.differing === 1 ? ' differs' : 's differ'}, most ${d.worst}`), d.summary && 'the summary'].filter(Boolean);
        console.log(`    seed ${c.seed}, × (${label(nudge)}): ${what.join('; ')}`);
      }
    }
  }
  console.log(`\n${moved} of the ${runs} nudged runs differ from the un-nudged run of their cavity and seed in a step, a crystal or the summary`);
  const baseline = reports.find(r => r.baseline != null);
  console.log(`control: a nudge of exactly 1 ${unity === reports.length ? `is the un-nudged run, to the last binary place of every size and of the fill, in both cavities at the three seeds` : `IS NOT THE UN-NUDGED RUN in ${reports.length - unity} of ${reports.length} cells`}`);
  console.log(`control: with the clamp at Infinity and no nudge, the own cavity's run at seed ${SEEDS[0]} ${baseline && baseline.baseline ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
}
