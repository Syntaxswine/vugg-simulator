#!/usr/bin/env node
/**
 * probe-rounding-reach.mjs — which shipped runs a change in the last binary places of a zone moves
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the last two notes).
 *
 * probe-enclosure-floor.mjs shows that in radioactive_pegmatite, whose pocket is full, a host layer
 * of about 10^-11 µm licenses an enclosure, and that a nudge of the uraninite engine's zones by a
 * factor within 10^-12 of 1 then moves the run at seeds 1 and 2. That probe nudges three minerals
 * and looks at eight scenarios. This one asks the same question of the whole fleet as shipped, with
 * every mineral nudged.
 *
 * For each of the 41 scenarios at seeds 42 / 1 / 2: the shipped run, and four runs in which every
 * positive zone that any growth engine returns is multiplied by one factor: 1 − 1.1e-16 (the
 * smallest change a multiplication can make), 1 − 1e-14, 1 + 1e-13 and 1 − 1e-13. Those are four
 * of the twelve factors of probe-enclosure-floor.mjs, the four its --sc2 run uses. Each nudged run
 * is compared with the shipped run of the same scenario and seed:
 *   a size or the bulk fluid   the baseline-style summary differs; or some crystal's size at the end
 *                        differs by more than a billionth of itself, or the crystals are not the
 *                        same ones; or some number of the bulk handle's fluid at the end differs
 *                        by more than a billionth of itself (and by more than 10^-12)
 *   species              the comparison tools/sim-side-ab.mjs makes of an arm with the shipped run
 *                        (species moved, lost, gained) finds one
 *   an enclosure alone   none of the above, and some crystal is enclosed at another step, by
 *                        another host, or in one run and not in the other
 * "Reached" counts the nudged runs that differ from the shipped run in any binary place of a
 * crystal's size, the fill at the end or the bulk fluid: a nudge that reaches no run tests nothing.
 *
 * The scenarios are run in child processes of this file (--one and the scenario's name), six at a
 * time, and their reports are printed in the order of the scenario list.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 every shipped run is compared with the committed baseline, and a nudge of
 * exactly 1 has to be the shipped run to the last binary place.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-rounding-reach.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-rounding-reach',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const RESIDUE_UM = 1e-6;     // a host layer thinner than this is taken for a rounding residue
const NUDGES = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);

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

// One run as shipped. nudge: every positive zone of every growth engine is multiplied by it; null
// for the shipped run itself.
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
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const steps = defaultSteps ?? 100;
    let maxFill = 0, firstFull = null;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (fill > maxFill) maxFill = fill;
      if (firstFull == null && fill >= 1 - 1e-9) firstFull = sim.step;
    }
    // the simulator's own receipts for the enclosures of the run
    const receipts = (Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : []).filter(r => r && r.event === 'enclosed').map(r => ({
      step: r.step, host: `${r.host_mineral} #${r.host_crystal_id}`, guest: `${r.guest_mineral} #${r.guest_crystal_id}`, layer: Number(r.host_same_step_positive_growth_um),
    }));
    const sizes = sim.crystals.map(c => [`${c.mineral} #${c.crystal_id}`, c.total_growth_um]);
    // presence as tools/sim-side-ab.mjs reads it: a species is present when one of its crystals has solid left
    const species = {};
    for (const c of sim.crystals) {
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    const fluid = Object.entries(sim.conditions.fluid).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1));
    const fill = sim.get_vug_fill();
    const byGuest = [...receipts].sort((a, b) => (a.guest < b.guest ? -1 : a.guest > b.guest ? 1 : a.step - b.step));
    return { steps, fill, maxFill, firstFull, summary: JSON.stringify(summarize(sim)), sizes, species, fluid,
      enclosures: receipts.length, onResidue: receipts.filter(x => x.layer < RESIDUE_UM).length,
      exact: JSON.stringify([sizes, fill, fluid]),
      hostKey: byGuest.map(r => `${r.guest} by ${r.host} at step ${r.step}`).join('; ') };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
// The comparison tools/sim-side-ab.mjs makes of an arm B with the shipped run A, as
// probe-excess-in-engine.mjs copies it.
function against(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  return { any: moved.length + lost.length + gained.length > 0, text: `moved ${moved.join(', ') || 'none'}; lost ${lost.join(', ') || 'none'}; gained ${gained.join(', ') || 'none'}` };
}
// What differs between a nudged run and the shipped run (the header says what each word means).
function compare(base, r) {
  const size = base.sizes.length !== r.sizes.length || base.sizes.some(([who, um], i) => r.sizes[i][0] !== who || !near(um, r.sizes[i][1]));
  const fluid = base.fluid.length !== r.fluid.length || base.fluid.some(([k, v], i) => r.fluid[i][0] !== k || !(near(v, r.fluid[i][1]) || Math.abs(v - r.fluid[i][1]) <= 1e-12));
  const verdict = against(base, r);
  const d = { reached: base.exact !== r.exact, summary: base.summary !== r.summary, size, fluid, species: verdict.any, verdict: verdict.text, enclosure: base.hostKey !== r.hostKey };
  d.reading = d.summary || d.size || d.fluid || d.species;
  d.enclosureAlone = !d.reading && d.enclosure;
  return d;
}
// One scenario: the shipped run at the three seeds, each with its nudged runs.
function scenario(name) {
  const out = { name, reproduced: false, unity: false, cells: [] };
  for (const seed of SEEDS) {
    const base = run(name, seed);
    if (seed === SEEDS[0]) {
      out.reproduced = base.summary === JSON.stringify(BASELINE[name]);
      const one = run(name, seed, 1);
      out.unity = one.exact === base.exact && one.hostKey === base.hostKey;
    }
    const ds = NUDGES.map(nudge => ({ nudge, d: compare(base, run(name, seed, nudge)) }));
    out.cells.push({ seed, steps: base.steps, maxFill: base.maxFill, firstFull: base.firstFull, enclosures: base.enclosures, onResidue: base.onResidue, ds });
  }
  return out;
}

if (process.argv.includes('--one')) {
  // One scenario, for the run below: its report, as one line of JSON.
  console.log('ONE ' + JSON.stringify(scenario(process.argv[process.argv.indexOf('--one') + 1])));
} else {
  const NAMES = Object.keys(SCENARIOS);
  console.log(`probe-rounding-reach — SIM ${SIM_VERSION}; ${NAMES.length} scenarios as shipped; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`${NUDGES.length} nudges of every growth engine's positive zones (${NUDGES.map(label).join(', ')}); each line gives the three seeds, and its counts are of the ${NUDGES.length} nudged runs at each seed`);
  console.log(`"on a residue" is an enclosure of the shipped run whose host layer of that step is under ${RESIDUE_UM} µm`);
  console.log(`each scenario is run in a process of its own, this probe started with --one and the scenario's name, ${JOBS} at a time\n`);
  const { spawn } = await import('node:child_process');
  const inChild = (name) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--one', name], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const line = text.split(/\r?\n/).find(l => l.startsWith('ONE '));
      if (code !== 0 || !line) reject(new Error(`${name}: its process exited ${code}${line ? '' : ' and printed no report'}`));
      else resolve(JSON.parse(line.slice('ONE '.length)));
    });
  });
  const reports = new Array(NAMES.length);
  let next = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < NAMES.length) { const i = next++; reports[i] = await inChild(NAMES[i]); }
  }));
  let runs = 0, reached = 0, reading = 0, alone = 0, reproduced = 0, unity = 0;
  const moved = [], cellsMoved = new Set(), scenariosMoved = new Set();
  for (const report of reports) {
    if (report.reproduced) reproduced++;
    if (report.unity) unity++;
    const cells = report.cells;
    for (const cell of cells) {
      for (const { nudge, d } of cell.ds) {
        runs++;
        if (d.reached) reached++;
        if (d.reading) { reading++; cellsMoved.add(`${report.name} at seed ${cell.seed}`); scenariosMoved.add(report.name); }
        if (d.enclosureAlone) alone++;
        if (d.reading || d.enclosureAlone) {
          const what = [d.summary && 'the summary', d.size && 'some crystal\'s size', d.fluid && 'the bulk fluid', d.species && `species (${d.verdict})`, d.enclosure && 'an enclosure'].filter(Boolean);
          moved.push(`${report.name}, seed ${cell.seed}, under ${label(nudge)}: ${what.join('; ')}`);
        }
      }
    }
    console.log(`  ${report.name.padEnd(36)} ${cells[0].steps} steps; largest fill ${each(cells, c => (c.maxFill * 100).toFixed(1))} %, first 1 to a billionth at step ${each(cells, c => c.firstFull ?? '—')}; enclosures ${each(cells, c => c.enclosures)}, on a residue ${each(cells, c => c.onResidue)}; reached ${each(cells, c => c.ds.filter(x => x.d.reached).length)}; a size or the bulk fluid differs in ${each(cells, c => c.ds.filter(x => x.d.reading).length)}; an enclosure alone in ${each(cells, c => c.ds.filter(x => x.d.enclosureAlone).length)}`);
  }
  console.log(`\n${reading} of ${runs} nudged runs differ from the shipped run in a size or the bulk fluid, at ${cellsMoved.size} of the ${NAMES.length * SEEDS.length} scenario-seeds, in ${scenariosMoved.size} of the ${NAMES.length} scenarios: ${[...scenariosMoved].join(', ') || 'none'}`);
  console.log(`${alone} more differ in an enclosure alone; the nudge reached ${reached} of the ${runs}`);
  for (const line of moved) console.log(`  ${line}`);
  console.log(`control: at seed ${SEEDS[0]} the shipped run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}`);
  console.log(`control: at seed ${SEEDS[0]} a nudge of exactly 1 ${unity === NAMES.length ? `is the shipped run, to the last binary place of every size, the fill and the bulk fluid, and in every enclosure, for all ${NAMES.length} scenarios` : `IS NOT THE SHIPPED RUN for ${NAMES.length - unity} of ${NAMES.length} scenarios`}`);
}
