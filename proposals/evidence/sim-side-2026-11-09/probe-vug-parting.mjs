#!/usr/bin/env node
/**
 * probe-vug-parting.mjs — where a nudged run parts from the shipped run at the vug setting of
 * Simulation mode's form, and by how much it ends apart
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the sixth note).
 *
 * probe-last-room.mjs --vug finds nine scenarios in which one of four nudges of every growth
 * engine's positive zones moves the shipped run at that setting, and prints what kind of thing
 * differs at the end. Only two of the nine have an enclosure on a residue in the shipped run. This
 * probe makes those nine scenarios' runs again, at seeds 42 / 1 / 2 under the same four factors,
 * keeps every crystal at every step, and prints for each nudged run that differs:
 *   - the first step at which some crystal's size differs by more than a billionth of itself, or
 *     its active flag or its host differs, or the two runs hold other crystals ("the parting");
 *   - the step at which the shipped run's pocket first reads full (a fill of 1 to a billionth
 *     after the step), to see whether the parting comes before it;
 *   - at the parting step, in each of the two runs, how many positive zones the growth loop
 *     accepted that the cavity clamp had cut, and how many it accepted while its fill read under
 *     1 by a billionth or less (the reading probe-last-room.mjs makes, with the same two wrappers);
 *   - at the end, how many crystals differ, the largest difference in a crystal's size, and
 *     whether the baseline-style summary differs.
 * For each shipped run whose pocket reads full it also prints how many of the steps from the first
 * full one on have a zone accepted in the last room, and how many a zone the clamp had cut: the
 * rate against which the partings are to be read.
 *
 * The scenarios are run in child processes of this file (--one and the scenario's name), six at a
 * time, and their reports are printed in a fixed order.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 a nudge of exactly 1 has to be the shipped run at every step. The runs that
 * differ are to be the ones probe-last-room-vug.txt lists: this probe prints the count for each
 * scenario and seed in that probe's form, for the two outputs to be held together. (At that
 * setting there is no baseline to compare with; probe-last-room.mjs's default mode, which builds
 * its runs the same way but for the form's override, reproduces it.)
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-vug-parting.mjs
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale, startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm,
} = await harness.loadSimBundle({
  toolName: 'probe-vug-parting',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale', 'startSimulationCommandRuntime', 'makeSimulationStartCommand', 'resolveSizeClassToMm'],
});
// the nine scenarios probe-last-room-vug.txt names, in its order
const NAMES = ['reactivated_fluorite_vein', 'searles_lake', 'bisbee', 'supergene_oxidation', 'gem_pegmatite', 'shigar_pegmatite', 'radioactive_pegmatite', 'schneeberg', 'wittichen'];
const SEEDS = [42, 1, 2];
const VUG_MM = resolveSizeClassToMm('vug');
const OVERRIDES = { wall: { size_class: 'vug', vug_diameter_mm: VUG_MM } };      // what the form adds for that choice
const LAST_ROOM = 1e-9;
const NUDGES = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);
const size = (um) => (Math.abs(um) >= 0.01 ? um.toPrecision(4) : um.toExponential(1));

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

// One run at the vug, kept step by step. nudge: every positive zone of every growth engine is
// multiplied by it; null for the shipped run itself. The two wrappers are probe-last-room.mjs's.
function run(name, seed, nudge = null) {
  const saved = {};
  try {
    if (nudge != null) {
      for (const mineral of Object.keys(MINERAL_ENGINES)) {
        const orig = saved[mineral] = MINERAL_ENGINES[mineral];
        MINERAL_ENGINES[mineral] = (crystal, conditions, step) => {
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0) || nudge === 1) return zone;
          zone.thickness_um *= nudge;
          if (typeof zone.growth_rate === 'number') zone.growth_rate *= nudge;
          return zone;
        };
      }
    }
    const runtime = startSimulationCommandRuntime(makeSimulationStartCommand(name, seed, OVERRIDES));
    const sim = runtime.sim;
    const cut = {}, lastRoom = {};           // by step: positive zones the clamp had cut; positive zones accepted in the last room
    let last = null;
    const refresh = sim._refreshVugFillAndSeal, apply = sim._applyZoneGrowthBudget;
    const put = (key, value) => Object.defineProperty(sim, key, { value, writable: true, configurable: true, enumerable: false });
    put('_refreshVugFillAndSeal', function (...args) { const fill = refresh.apply(this, args); last = fill; return fill; });
    put('_applyZoneGrowthBudget', function (crystal, zone) {
      const fill = last;
      const out = apply.call(this, crystal, zone);
      if (zone && zone.thickness_um > 0 && !zone.is_phantom) {
        if (/cavity ceiling/.test(zone.note || '')) cut[this.step] = (cut[this.step] || 0) + 1;
        if (fill != null && fill < 1 && 1 - fill <= LAST_ROOM) lastRoom[this.step] = (lastRoom[this.step] || 0) + 1;
      }
      return out;
    });
    const steps = runtime.scenarioData.defaultSteps ?? 100;
    const history = [];
    let firstFull = null;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (firstFull == null && fill >= 1 - 1e-9) firstFull = sim.step;
      history.push({ step: sim.step, fill, crystals: sim.crystals.map(c => ({ who: `${c.mineral} #${c.crystal_id}`, um: c.total_growth_um, active: c.active, by: c.enclosed_by ?? null })) });
    }
    return { steps, firstFull, history, cut, lastRoom, summary: JSON.stringify(summarize(sim)) };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const differs = (x, y) => x.who !== y.who || !near(x.um, y.um) || x.active !== y.active || x.by !== y.by;
// Where a nudged run B parts from the shipped run A, and how far apart the two end. null when no
// crystal differs at any step.
function parting(A, B) {
  for (let i = 0; i < A.history.length; i++) {
    const a = A.history[i].crystals, b = B.history[i].crystals;
    const other = a.length !== b.length;
    const apart = other ? [] : a.map((x, j) => ({ x, y: b[j] })).filter(({ x, y }) => differs(x, y));
    if (!other && !apart.length) continue;
    const step = A.history[i].step;
    const worst = apart.slice().sort((p, q) => Math.abs(q.x.um - q.y.um) - Math.abs(p.x.um - p.y.um))[0];
    const endA = A.history.at(-1).crystals, endB = B.history.at(-1).crystals;
    const end = endA.map((x, j) => ({ x, y: endB[j] })).filter(({ x, y }) => !y || differs(x, y)).sort((p, q) => Math.abs((q.y?.um ?? 0) - q.x.um) - Math.abs((p.y?.um ?? 0) - p.x.um));
    return { step, other, differing: apart.length, at: worst ? { who: worst.x.who, a: worst.x.um, b: worst.y.um, flag: worst.x.active !== worst.y.active || worst.x.by !== worst.y.by } : null,
      cutA: A.cut[step] || 0, cutB: B.cut[step] || 0, lastA: A.lastRoom[step] || 0, lastB: B.lastRoom[step] || 0,
      endDiffering: end.length, endTotal: endA.length, endOther: endA.length !== endB.length,
      endWorst: end[0] ? { who: end[0].x.who, a: end[0].x.um, b: end[0].y ? end[0].y.um : null } : null, summary: A.summary !== B.summary };
  }
  return null;
}
// One scenario: the shipped run at the three seeds, each with its four nudged runs.
function scenario(name) {
  const out = { name, unity: false, cells: [] };
  for (const seed of SEEDS) {
    const base = run(name, seed);
    if (seed === SEEDS[0]) out.unity = parting(base, run(name, seed, 1)) == null;
    // how common the last room is in the shipped run: of the steps from the first full one on, those
    // on which the loop accepted a zone in the last room, and those on which the clamp had cut one
    const from = base.firstFull, later = from == null ? [] : base.history.map(h => h.step).filter(step => step >= from);
    out.cells.push({ seed, steps: base.steps, firstFull: base.firstFull, stepsFull: later.length,
      stepsLastRoom: later.filter(step => base.lastRoom[step] > 0).length, stepsCut: later.filter(step => base.cut[step] > 0).length,
      runs: NUDGES.map(nudge => ({ nudge, p: parting(base, run(name, seed, nudge)) })) });
  }
  return out;
}

if (process.argv.includes('--one')) {
  // One scenario, for the run below: its report, as one line of JSON.
  console.log('ONE ' + JSON.stringify(scenario(process.argv[process.argv.indexOf('--one') + 1])));
} else {
  console.log(`probe-vug-parting — SIM ${SIM_VERSION}; ${NAMES.length} scenarios as shipped at the vug setting of the form (${VUG_MM} mm); seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`${NUDGES.length} nudges of every growth engine's positive zones (${NUDGES.map(label).join(', ')}). A run "parts" at the first step at which a crystal's size differs from the shipped run's by more than a billionth of itself, or its active flag or host differs`);
  console.log(`each scenario is run in a process of its own, this probe started with --one and the scenario's name, ${JOBS} at a time`);
  const { spawn } = await import('node:child_process');
  const inChild = (name) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--one', name], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const found = text.split(/\r?\n/).find(l => l.startsWith('ONE '));
      if (code !== 0 || !found) reject(new Error(`${name}: its process exited ${code}${found ? '' : ' and printed no report'}`));
      else resolve(JSON.parse(found.slice('ONE '.length)));
    });
  });
  const reports = new Array(NAMES.length);
  let next = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < NAMES.length) { const i = next++; reports[i] = await inChild(NAMES[i]); }
  }));

  let runs = 0, parted = 0, unity = 0;
  const all = [];
  for (const report of reports) {
    if (report.unity) unity++;
    console.log(`\n${report.name}: ${report.cells[0].steps} steps; the shipped run's pocket first reads full at step ${each(report.cells, c => c.firstFull ?? '—')}; steps from that one on ${each(report.cells, c => c.stepsFull)}, of them with a zone accepted in the last room ${each(report.cells, c => c.stepsLastRoom)} and with a zone the clamp had cut ${each(report.cells, c => c.stepsCut)}; nudged runs that part ${each(report.cells, c => c.runs.filter(r => r.p).length)}`);
    for (const cell of report.cells) {
      for (const { nudge, p } of cell.runs) {
        runs++;
        if (!p) continue;
        parted++;
        const when = cell.firstFull == null ? 'the pocket never reads full' : p.step < cell.firstFull ? `BEFORE the pocket first reads full, at step ${cell.firstFull}` : p.step === cell.firstFull ? 'the step at which the pocket first reads full' : `${p.step - cell.firstFull} steps after the pocket first reads full`;
        const atStep = p.other ? 'the runs hold other crystals' : `${p.differing} crystal${p.differing === 1 ? '' : 's'} differ, most ${p.at.who} (${size(p.at.a)} against ${size(p.at.b)} µm${p.at.flag ? ', and its active flag or host' : ''})`;
        const end = p.endDiffering ? `${p.endDiffering} of ${p.endTotal} crystals differ${p.endOther ? ' (and the runs hold other crystals)' : ''}, most ${p.endWorst.who} (${size(p.endWorst.a)} against ${p.endWorst.b == null ? 'none' : size(p.endWorst.b)} µm, ${p.endWorst.b == null ? '' : `${size(Math.abs(p.endWorst.a - p.endWorst.b))} µm apart`})` : 'no crystal differs';
        console.log(`  seed ${cell.seed}, × (${label(nudge)}): parts at step ${p.step}, ${when}; ${atStep}; zones the clamp had cut at that step ${p.cutA} against ${p.cutB}, zones accepted in the last room ${p.lastA} against ${p.lastB}; at the end ${end}; the summary ${p.summary ? 'DIFFERS' : 'is the same'}`);
        all.push({ name: report.name, seed: cell.seed, firstFull: cell.firstFull, p });
      }
    }
  }
  const full = all.filter(e => e.firstFull != null);
  const count = (list, test) => list.filter(test).length;
  console.log(`\n${parted} of ${runs} nudged runs part from the shipped run; ${full.length} of them in a pocket that reads full in the shipped run`);
  console.log(`  of those ${full.length}: ${count(full, e => e.p.step < e.firstFull)} part before the step at which the pocket first reads full, ${count(full, e => e.p.step === e.firstFull)} at that step and ${count(full, e => e.p.step > e.firstFull)} after it`);
  console.log(`  of those ${full.length}: at the parting step the clamp had cut a zone in one run or the other in ${count(full, e => e.p.cutA + e.p.cutB > 0)}, and a zone was accepted in the last room in one run or the other in ${count(full, e => e.p.lastA + e.p.lastB > 0)}; in the shipped run itself in ${count(full, e => e.p.lastA > 0)}`);
  {
    // the base rate: how many steps of a full pocket have such a zone at all, in the shipped runs
    const cells = reports.flatMap(r => r.cells).filter(c => c.firstFull != null);
    const sum = (f) => cells.reduce((n, c) => n + f(c), 0);
    console.log(`  in the ${cells.length} shipped runs whose pocket reads full, of the ${sum(c => c.stepsFull)} steps from the first full one on, the loop accepted a zone in the last room on ${sum(c => c.stepsLastRoom)} and the clamp had cut a zone on ${sum(c => c.stepsCut)}`);
  }
  const apart = (e) => (e.p.endWorst && e.p.endWorst.b != null ? Math.abs(e.p.endWorst.a - e.p.endWorst.b) : e.p.endWorst ? Math.abs(e.p.endWorst.a) : 0);
  const bands = [[1e-3, 'under 0.001'], [1, '0.001 to 1'], [100, '1 to 100'], [Infinity, '100 or more']];
  const ended = all.filter(e => e.p.endDiffering > 0);
  console.log(`  of the ${all.length} that part, ${all.length - ended.length} end with no crystal differing; in the other ${ended.length} the largest difference in a crystal's size at the end, µm — ${bands.map(([edge, text], i) => `${text}: ${count(ended, e => apart(e) < edge && (i === 0 || apart(e) >= bands[i - 1][0]))}`).join('; ')}; the summary differs in ${count(all, e => e.p.summary)}`);
  console.log(`  by scenario, the runs that end with a crystal differing at seeds ${SEEDS.join(' / ')}: ${reports.map(r => `${r.name} ${each(r.cells, c => c.runs.filter(x => x.p && x.p.endDiffering > 0).length)}`).join('; ')}`);
  console.log(`  by scenario, the runs that part at seeds ${SEEDS.join(' / ')}: ${reports.map(r => `${r.name} ${each(r.cells, c => c.runs.filter(x => x.p).length)}`).join('; ')}`);
  console.log(`control: at seed ${SEEDS[0]} a nudge of exactly 1 ${unity === NAMES.length ? `is the shipped run at every step, in every crystal's size, active flag and host, for the ${NAMES.length} scenarios` : `IS NOT THE SHIPPED RUN for ${NAMES.length - unity} of ${NAMES.length} scenarios`}`);
}
