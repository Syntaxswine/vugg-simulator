#!/usr/bin/env node
/**
 * probe-enclosure-floor.mjs — the host layer that licenses an enclosure, and what a layer of
 * 10^-11 µm decides in a pocket that is full
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4; §4 SC2; §7).
 *
 * Since SIM 275 a crystal may enclose a neighbour only on a step on which it stored a host layer:
 * _check_enclosure asks that the host's positive growth of the step, and its net growth, be above
 * zero (js/85c-simulator-state.ts, `hostPositiveGrowthUm > 0 && hostNetGrowthUm > 0`). The test
 * has no floor. In a pocket that is full the growth loop's cavity clamp cuts a zone to the room
 * that is left (js/85-simulator.ts), and when the fill reads one unit in the last binary place
 * under 1 that room is a layer of about 10^-11 µm. Such a layer is a rounding residue and not a
 * layer of crystal, and it passes the test. The simulator records the layer on its own receipt for
 * each enclosure (`host_same_step_positive_growth_um`), which is what this probe reads.
 *
 * Default run: radioactive_pegmatite, seeds 42 / 1 / 2.
 *   A  As shipped: the step at which the pocket first reads full, the simulator's receipt for the
 *      enclosure of each uraninite (the step, the host, the host's layer of that step), each
 *      uraninite's negative zones, and the bulk handle's Pb at the end. An enclosed uraninite is
 *      inactive: it is altered no further and writes no more lead (js/85-simulator.ts, the
 *      radiation block reads the active ones).
 *   B  Twelve nudges. Every positive zone the galena, molybdenite and uraninite engines return is
 *      multiplied by a number within 10^-12 of 1 (uraninite is the one of the three this scenario
 *      grows), and the run is compared with the same run un-nudged. Three kinds of run are
 *      nudged: the shipped engines; SC2's preview at the same constant (the wrapper of the A/B
 *      tool's `excess` arm, m = 1); and at three times the constant (m = 3).
 *
 *      For each nudged run the probe also makes the comparison tools/sim-side-ab.mjs makes of an
 *      arm (species moved, lost and gained): of a nudged shipped run with the shipped run, and of
 *      a nudged preview with the shipped run, beside the same comparison for the un-nudged preview.
 *
 * With --sc2: the other seven scenarios SC2 moves, the same three kinds of run, four of the
 * twelve nudges (the smallest, and three of the sizes that move radioactive_pegmatite). Each
 * scenario is run in a child process of its own (this file with --sc2-one and the name), and
 * the seven run side by side.
 * With --fleet: every scenario as shipped, at seeds 42 / 1 / 2: the count of enclosure receipts
 * and those whose host layer is under 10^-6 µm, each of them listed.
 *
 * What is compared between a nudged run and its un-nudged run:
 *   a size or the lead   the baseline-style summary differs; or some crystal's size at the end
 *                        differs by more than a billionth of itself, or the crystals are not the
 *                        same ones; or the bulk Pb at the end differs by more than a billionth
 *   the step of an enclosure   some crystal is enclosed at another step, or enclosed in one run
 *                        and not in the other
 *   the host alone       every enclosure is at the same step, and one has another host
 * "Reached" counts the nudged runs that differ from the un-nudged run in any binary place of a
 * crystal's size, the fill at the end or the bulk Pb: a nudge that reaches no run tests nothing.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 the shipped run is compared with the committed baseline (for
 * radioactive_pegmatite, with --sc2 for the seven, with --fleet for every scenario); in the
 * default run a nudge of exactly 1 has to be the un-nudged run.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs
 *   node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs --sc2
 *   node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs --fleet
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-enclosure-floor',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const THREE = ['galena', 'molybdenite', 'uraninite'];
const SEEDS = [42, 1, 2];
const RESIDUE_UM = 1e-6;     // a host layer thinner than this is taken for a rounding residue
const NUDGES = [1 + 2.220446049250313e-16, 1 - 1.1102230246251565e-16, 1 + 4e-16, 1 - 4e-16, 1 + 1e-15, 1 - 1e-15,
  1 + 1e-14, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13, 1 + 1e-12, 1 - 1e-12];
const SC2_NUDGES = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];   // four of the twelve
// the scenarios SC2 moves (probe-excess-in-engine.mjs), less radioactive_pegmatite, which the default run takes
const SC2_OTHERS = ['reactive_wall', 'reactivated_fluorite_vein', 'mvt', 'sunnyside_american_tunnel', 'porphyry', 'roughten_gill', 'schneeberg'];
const KINDS = [['the shipped engines', null], ['SC2\'s preview at the same constant', 1], ['SC2\'s preview at three times the constant', 3]];
const mm = (um) => (um == null ? '—' : (um / 1000).toFixed(um < 1000 ? 2 : 1));
const each = (list, f) => list.map(f).join(' / ');

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

// One run. m: null for the shipped engines; 1 or 3 for SC2's preview, the wrapper that rescales
// each positive zone of the three minerals by m·(σ − 1)/σ. nudge: every positive zone of the
// three is multiplied by it once more; null for none.
function run(name, seed, { m = null, nudge = null } = {}) {
  const saved = {};
  try {
    if (m != null || nudge != null) {
      for (const mineral of THREE) {
        const orig = saved[mineral] = MINERAL_ENGINES[mineral];
        const method = 'supersaturation_' + mineral;
        MINERAL_ENGINES[mineral] = (crystal, conditions, step) => {
          const s = m != null ? conditions[method]() : null;          // read before the engine runs; draws no random number
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          let f = m != null ? (s > 0 ? m * Math.max(0, s - 1) / s : 0) : 1;   // tools/sim-side-ab.mjs, `excess`
          if (nudge != null) f *= nudge;
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
      step: r.step, host: `${r.host_mineral} #${r.host_crystal_id}`, guest: `${r.guest_mineral} #${r.guest_crystal_id}`, guestMineral: r.guest_mineral,
      layer: Number(r.host_same_step_positive_growth_um), hostSize: Number(r.host_physical_size_at_enclosure_um), guestSize: Number(r.guest_remaining_growth_um),
    }));
    const uraninites = sim.crystals.filter(c => c.mineral === 'uraninite').map(c => {
      const negative = c.zones.filter(z => z.thickness_um < 0);
      const cut = negative.map(z => z.thickness_um);
      return { who: `uraninite #${c.crystal_id}`, size: c.total_growth_um, negative: negative.length,
        from: negative.length ? negative[0].step : null, to: negative.length ? negative.at(-1).step : null,
        thinnest: cut.length ? Math.max(...cut) : null, thickest: cut.length ? Math.min(...cut) : null,
        receipt: receipts.find(r => r.guest === `uraninite #${c.crystal_id}`) || null };
    });
    const sizes = sim.crystals.map(c => [`${c.mineral} #${c.crystal_id}`, c.total_growth_um]);
    // presence as tools/sim-side-ab.mjs reads it: a species is present when one of its crystals has solid left
    const species = {};
    for (const c of sim.crystals) {
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    const fill = sim.get_vug_fill(), bulkPb = Number(sim.conditions.fluid.Pb);
    const byGuest = [...receipts].sort((a, b) => (a.guest < b.guest ? -1 : a.guest > b.guest ? 1 : a.step - b.step));
    return { steps, fill, maxFill, firstFull, summary: JSON.stringify(summarize(sim)), bulkPb, receipts, uraninites, sizes, species,
      exact: JSON.stringify([sizes, fill, bulkPb]),
      stepKey: byGuest.map(r => `${r.guest} at step ${r.step}`).join('; '),
      hostKey: byGuest.map(r => `${r.guest} by ${r.host} at step ${r.step}`).join('; '),
      negatives: uraninites.reduce((n, u) => n + u.negative, 0),
      largestUraninite: uraninites.length ? Math.max(...uraninites.map(u => u.size)) : 0 };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const microns = (t) => (Math.abs(t) >= 0.01 ? `${t.toFixed(2)} µm` : `${t.toExponential(1)} µm`);
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);
const span = (list, f = String) => { const lo = Math.min(...list), hi = Math.max(...list); return f(lo) === f(hi) ? f(lo) : `${f(lo)} to ${f(hi)}`; };

// What differs between a run and its un-nudged run (the header says what each word means).
function compare(base, r) {
  const size = base.sizes.length !== r.sizes.length || base.sizes.some(([who, um], i) => r.sizes[i][0] !== who || !near(um, r.sizes[i][1]));
  const d = { reached: base.exact !== r.exact, summary: base.summary !== r.summary, size, pb: !near(base.bulkPb, r.bulkPb),
    step: base.stepKey !== r.stepKey, host: base.stepKey === r.stepKey && base.hostKey !== r.hostKey };
  d.reading = d.summary || d.size || d.pb;
  d.enclosureAlone = !d.reading && (d.step || d.host);
  return d;
}
// the enclosures of a run that are not enclosures of its un-nudged run (another guest, host or step)
function notTheBaseRuns(base, r) {
  const key = (x) => `${x.guest} by ${x.host} at step ${x.step}`;
  const had = new Set(base.receipts.map(key));
  return r.receipts.filter(x => !had.has(key(x)));
}
// The comparison tools/sim-side-ab.mjs makes of an arm B with the shipped run A, as
// probe-excess-in-engine.mjs copies it: a species is moved when its count of crystals with solid
// changes, or its largest crystal changes by a factor of more than 1.25 (on the sizes plus 1 µm).
function against(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  return `moved ${moved.join(', ') || 'none'}; lost ${lost.join(', ') || 'none'}; gained ${gained.join(', ') || 'none'}`;
}
// One scenario of --sc2: the three kinds of run at the three seeds, each with its nudged runs.
function sc2Scenario(name) {
  const out = { name, reproduced: false, kinds: [] };
  for (const [kind, m] of KINDS) {
    const cells = SEEDS.map(seed => {
      const base = run(name, seed, m == null ? {} : { m });
      if (m == null && seed === SEEDS[0]) out.reproduced = base.summary === JSON.stringify(BASELINE[name]);
      const ds = SC2_NUDGES.map(nudge => ({ nudge, d: compare(base, run(name, seed, { m, nudge })) }));
      return { seed, maxFill: base.maxFill, firstFull: base.firstFull, enclosures: base.receipts.length,
        onResidue: base.receipts.filter(x => x.layer < RESIDUE_UM).length, ds };
    });
    out.kinds.push({ kind, cells });
  }
  return out;
}

if (process.argv.includes('--fleet')) {
  const NAMES = Object.keys(SCENARIOS);
  console.log(`probe-enclosure-floor --fleet — SIM ${SIM_VERSION}; ${NAMES.length} scenarios as shipped; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`each line gives the three seeds; "on a residue" is an enclosure whose host layer of that step, by the simulator's own receipt, is under ${RESIDUE_UM} µm\n`);
  let total = 0, onResidue = 0, reproduced = 0;
  const hit = new Set(), bySeed = SEEDS.map(() => ({ total: 0, residue: 0 }));
  for (const name of NAMES) {
    const runs = SEEDS.map(seed => run(name, seed));
    if (runs[0].summary === JSON.stringify(BASELINE[name])) reproduced++;
    const residues = runs.map(r => r.receipts.filter(x => x.layer < RESIDUE_UM));
    runs.forEach((r, i) => { total += r.receipts.length; onResidue += residues[i].length; bySeed[i].total += r.receipts.length; bySeed[i].residue += residues[i].length; if (residues[i].length) hit.add(`${name} at seed ${SEEDS[i]}`); });
    console.log(`  ${name.padEnd(36)} ${runs[0].steps} steps; largest fill ${each(runs, r => (r.maxFill * 100).toFixed(1))} %; enclosures ${each(runs, r => r.receipts.length)}; on a residue ${each(residues, x => x.length)}`);
    residues.forEach((list, i) => {
      for (const x of list) console.log(`      seed ${SEEDS[i]}, step ${x.step}: ${x.host} (${mm(x.hostSize)} mm), whose layer of that step is ${microns(x.layer)}, encloses ${x.guest} (${mm(x.guestSize)} mm)`);
    });
  }
  console.log(`\n${onResidue} of ${total} enclosures in ${NAMES.length * SEEDS.length} runs are on a residue: ${[...hit].join('; ') || 'none'}`);
  console.log(`by seed (${SEEDS.join(' / ')}): ${each(bySeed, x => `${x.residue} of ${x.total}`)}`);
  console.log(`control: at seed ${SEEDS[0]} the shipped run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}`);
} else if (process.argv.includes('--sc2-one')) {
  // One scenario of --sc2, for the run below: its report, as one line of JSON.
  console.log('SC2-ONE ' + JSON.stringify(sc2Scenario(process.argv[process.argv.indexOf('--sc2-one') + 1])));
} else if (process.argv.includes('--sc2')) {
  console.log(`probe-enclosure-floor --sc2 — SIM ${SIM_VERSION}; the other ${SC2_OTHERS.length} scenarios SC2 moves; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`${SC2_NUDGES.length} nudges of the three minerals' positive zones (${SC2_NUDGES.map(label).join(', ')}); each line gives the three seeds`);
  console.log(`"on a residue" is an enclosure of the un-nudged run whose host layer of that step is under ${RESIDUE_UM} µm; the counts after it are of the ${SC2_NUDGES.length} nudged runs at each seed`);
  console.log(`each scenario is run in a process of its own, this probe started with --sc2-one and the scenario's name, and the ${SC2_OTHERS.length} run side by side\n`);
  const { spawn } = await import('node:child_process');
  const inChild = (name) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--sc2-one', name], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const line = text.split(/\r?\n/).find(l => l.startsWith('SC2-ONE '));
      if (code !== 0 || !line) reject(new Error(`${name}: its process exited ${code}${line ? '' : ' and printed no report'}`));
      else resolve(JSON.parse(line.slice('SC2-ONE '.length)));
    });
  });
  const reports = await Promise.all(SC2_OTHERS.map(inChild));
  let runs = 0, reached = 0, reading = 0, alone = 0, reproduced = 0, residues = 0;
  const moved = [];
  for (const report of reports) {
    console.log(`  ${report.name}`);
    if (report.reproduced) reproduced++;
    for (const { kind, cells } of report.kinds) {
      for (const cell of cells) {
        residues += cell.onResidue;
        for (const { nudge, d } of cell.ds) {
          runs++;
          if (d.reached) reached++;
          if (d.reading) reading++;
          if (d.enclosureAlone) alone++;
          if (d.reading || d.enclosureAlone) {
            const what = [d.summary && 'the summary', d.size && 'some crystal\'s size', d.pb && 'bulk Pb', d.step && 'the step of an enclosure', d.host && 'the host of an enclosure'].filter(Boolean);
            moved.push(`${report.name}, ${kind}, seed ${cell.seed}, under ${label(nudge)}: ${what.join(', ')}`);
          }
        }
      }
      console.log(`    ${kind.padEnd(42)} largest fill ${each(cells, c => (c.maxFill * 100).toFixed(1))} %, first 1 to a billionth at step ${each(cells, c => c.firstFull ?? '—')}; enclosures ${each(cells, c => c.enclosures)}, on a residue ${each(cells, c => c.onResidue)}; reached ${each(cells, c => c.ds.filter(x => x.d.reached).length)}; a size or the lead differs in ${each(cells, c => c.ds.filter(x => x.d.reading).length)}; an enclosure alone in ${each(cells, c => c.ds.filter(x => x.d.enclosureAlone).length)}`);
    }
  }
  console.log(`\n${reading} of ${runs} nudged runs differ from their un-nudged run in a size or the lead, and ${alone} more in an enclosure alone; the nudge reached ${reached} of the ${runs}`);
  for (const line of moved) console.log(`  ${line}`);
  console.log(`${residues} enclosures of the ${SC2_OTHERS.length * KINDS.length * SEEDS.length} un-nudged runs are on a residue`);
  console.log(`control: at seed ${SEEDS[0]} the shipped run ${reproduced === SC2_OTHERS.length ? `reproduces the baseline for all ${SC2_OTHERS.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${SC2_OTHERS.length - reproduced} of ${SC2_OTHERS.length} scenarios`}`);
} else {
  const NAME = 'radioactive_pegmatite';
  console.log(`probe-enclosure-floor — SIM ${SIM_VERSION}; ${NAME}; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);

  console.log('\nA — as shipped: the simulator\'s own receipt for the enclosure of each uraninite');
  const shipped = SEEDS.map(seed => run(NAME, seed));
  console.log(`  control: the shipped run at seed ${SEEDS[0]} ${shipped[0].summary === JSON.stringify(BASELINE[NAME]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
  shipped.forEach((r, i) => {
    console.log(`  seed ${SEEDS[i]}: the fill first reads 1 to a billionth at step ${r.firstFull ?? '—'}, and at the end ${r.fill.toPrecision(17)}; Pb on the bulk handle at the end ${r.bulkPb.toFixed(1)}; ${r.receipts.length} enclosures in the run, ${r.receipts.filter(x => x.layer < RESIDUE_UM).length} of them on a host layer under ${RESIDUE_UM} µm`);
    for (const u of r.uraninites) {
      console.log(`      ${u.who} (${mm(u.size)} mm): ${u.negative} negative zone${u.negative === 1 ? '' : 's'}${u.negative ? `, at steps ${u.from} to ${u.to}, of ${span([u.thickest, u.thinnest], microns)}` : ''}; `
        + (u.receipt ? `enclosed at step ${u.receipt.step} by ${u.receipt.host} (${mm(u.receipt.hostSize)} mm), whose layer of that step is ${microns(u.receipt.layer)}` : 'not enclosed'));
    }
  });

  console.log(`\nB — twelve nudges of the three minerals' positive zones (${NUDGES.map(label).join(', ')})`);
  const tally = {};
  let unity = 0, unityOf = 0;
  const small = (x) => Math.abs(x - 1) < 2e-15;                      // the six smallest nudges
  for (const [kind, m] of KINDS) {
    console.log(`  ${kind}`);
    const t = (tally[kind] = { runs: 0, reached: 0, reading: 0, alone: 0, verdict: 0, small: 0, smallReading: 0, smallAlone: 0 });
    for (const seed of SEEDS) {
      const asShipped = shipped[SEEDS.indexOf(seed)];
      const base = m == null ? asShipped : run(NAME, seed, { m });
      const one = run(NAME, seed, { m, nudge: 1 });
      unityOf++;
      if (one.exact === base.exact && one.hostKey === base.hostKey) unity++;
      // the A/B tool's comparison: of a nudged shipped run with the shipped run, of a preview with the shipped run
      const verdictOf = (r) => against(m == null ? base : asShipped, r);
      const baseVerdict = verdictOf(base);
      const nudged = NUDGES.map(nudge => { const r = run(NAME, seed, { m, nudge }); return { nudge, r, d: compare(base, r), verdict: verdictOf(r) }; });
      const count = (f) => nudged.filter(f).length;
      const otherVerdict = count(x => x.verdict !== baseVerdict);
      t.runs += nudged.length; t.reached += count(x => x.d.reached); t.reading += count(x => x.d.reading); t.alone += count(x => x.d.enclosureAlone); t.verdict += otherVerdict;
      t.small += count(x => small(x.nudge)); t.smallReading += count(x => small(x.nudge) && x.d.reading); t.smallAlone += count(x => small(x.nudge) && x.d.enclosureAlone);
      const differing = nudged.filter(x => x.d.reading || x.d.enclosureAlone);
      const others = differing.flatMap(x => notTheBaseRuns(base, x.r));
      const largest = (r) => (r.largestUraninite / 1000).toFixed(2);
      console.log(`    seed ${String(seed).padEnd(2)} un-nudged: bulk Pb ${base.bulkPb.toFixed(1)}; largest uraninite ${largest(base)} mm; ${base.negatives} negative zones on the uraninites; `
        + base.uraninites.map(u => (u.receipt ? `${u.who} by ${u.receipt.host} at step ${u.receipt.step} on ${microns(u.receipt.layer)}` : `${u.who} not enclosed`)).join('; ')
        + (m == null ? '' : `; against the shipped run: ${baseVerdict}`));
      console.log(`            of the ${nudged.length} nudged runs (the nudge reached ${count(x => x.d.reached)}) a size or the lead differs in ${count(x => x.d.reading)}: the summary in ${count(x => x.d.summary)}, some crystal's size in ${count(x => x.d.size)}, bulk Pb in ${count(x => x.d.pb)}; the step of an enclosure differs in ${count(x => x.d.step)}; the host alone in ${count(x => x.d.host)}, with no size and no lead differing in ${count(x => x.d.host && !x.d.reading)} of those; `
        + (m == null ? `a species is moved, lost or gained against the un-nudged run in ${otherVerdict}` : `the species moved, lost and gained against the shipped run are not the un-nudged run's in ${otherVerdict}`));
      const verdicts = new Map();
      for (const x of nudged) if (x.verdict !== baseVerdict) verdicts.set(x.verdict, (verdicts.get(x.verdict) || 0) + 1);
      for (const [verdict, n] of verdicts) console.log(`              in ${n}: ${verdict}`);
      console.log(`            over the ${nudged.length}: bulk Pb ${span(nudged.map(x => x.r.bulkPb), v => v.toFixed(1))}; largest uraninite ${span(nudged.map(x => x.r.largestUraninite), v => (v / 1000).toFixed(2))} mm; negative zones on the uraninites ${span(nudged.map(x => x.r.negatives))}`
        + (differing.length ? `; enclosures in the ${differing.length} that differ which are not the un-nudged run's: ${others.length}, on a host layer under ${RESIDUE_UM} µm: ${others.filter(x => x.layer < RESIDUE_UM).length}; the ${differing.length} are those under ${differing.map(x => label(x.nudge)).join(', ')}` : ''));
    }
  }
  console.log('');
  for (const [kind, t] of Object.entries(tally)) {
    console.log(`  ${kind}: of ${t.runs} nudged runs (the nudge reached ${t.reached}) a size or the lead differs in ${t.reading}, and in ${t.alone} more an enclosure alone; the species moved, lost or gained differ in ${t.verdict}; of the ${t.small} nudged by less than 2e-15, a size or the lead differs in ${t.smallReading} and an enclosure alone in ${t.smallAlone}`);
  }
  console.log(`\ncontrol: a nudge of exactly 1 is the un-nudged run, to the last binary place of every size, the fill and the bulk Pb, and in every enclosure, in ${unity} of ${unityOf} cases`);
  console.log(`control at the end: the shipped run at seed ${SEEDS[0]} ${run(NAME, SEEDS[0]).summary === JSON.stringify(BASELINE[NAME]) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
}
