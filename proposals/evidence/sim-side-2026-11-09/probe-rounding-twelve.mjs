#!/usr/bin/env node
/**
 * probe-rounding-twelve.mjs — twelve factors where probe-rounding-reach.mjs applies four
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the last two notes).
 *
 * probe-rounding-reach.mjs multiplies every positive zone of every growth engine by one of four
 * factors and compares each run with the shipped run. Four factors are a sample: a run that none
 * of the four moves may move under a fifth. This probe applies the twelve factors of
 * probe-enclosure-floor.mjs (which nudges three minerals) to every growth engine, in
 * radioactive_pegmatite and wittichen as shipped, each in its own cavity, at seeds 42 / 1 / 2.
 * Those are the two scenarios in which the four factors moved something that matters.
 *
 * Each nudged run is compared with the shipped run of the same scenario and seed, as
 * probe-rounding-reach.mjs compares them:
 *   a size or the bulk fluid   the baseline-style summary differs; or some crystal's size at the end
 *                        differs by more than a billionth of itself, or the crystals are not the
 *                        same ones; or some number of the bulk handle's fluid at the end differs
 *                        by more than a billionth of itself (and by more than 10^-12); or the
 *                        comparison tools/sim-side-ab.mjs makes of an arm with the shipped run
 *                        (species moved, lost, gained) finds a species
 *   an enclosure alone   none of the above, and some crystal is enclosed at another step, by
 *                        another host, or in one run and not in the other
 * For wittichen it also prints, for every run, the precursor the scenario's first product born on
 * a weathering precursor is born on, and how far apart in release the first two candidates are,
 * ordered by the three keys of weatheringNucleationContext (js/44e-weathering-epilogue.ts:320:
 * the latest negative zone, then the release, then the lowest crystal id). The release is summed as
 * probe-rounding-detail.mjs sums it.
 *
 * Each scenario-seed is run in a child process of this file (--one, the scenario's name and the
 * seed), six at a time, and the reports are printed in a fixed order.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 each shipped run is compared with the committed baseline, and a nudge of
 * exactly 1 has to be the shipped run to the last binary place; in every wittichen run the crystal
 * the three keys put first has to be the precursor on the product's receipt, with the release this
 * probe sums for it equal to the receipt's.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-rounding-twelve.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-rounding-twelve',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const NAMES = ['radioactive_pegmatite', 'wittichen'];
const SEEDS = [42, 1, 2];
// probe-enclosure-floor.mjs's twelve, and the four of them that probe-rounding-reach.mjs uses
const NUDGES = [1 + 2.220446049250313e-16, 1 - 1.1102230246251565e-16, 1 + 4e-16, 1 - 4e-16, 1 + 1e-15, 1 - 1e-15,
  1 + 1e-14, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13, 1 + 1e-12, 1 - 1e-12];
const FOUR = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];
const SMALL = 1.5e-14;       // the eight factors within 10^-14 of 1 are under this
const JOBS = 6;
const label = (x) => `${x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`}${FOUR.includes(x) ? ' *' : ''}`;

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
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
// What a crystal had released of the species on a product's receipt when the product was born, as
// probe-rounding-detail.mjs sums it: each species over the crystal's negative zones since the
// epilogue began and before the product's step, then the species added together.
function released(sim, crystal, species, bornAt) {
  const start = Number(sim._weatheringEpilogueState?.config?.start_step);
  const each = {};
  for (const zone of crystal.zones) {
    if (!(Number(zone.step) >= start && Number(zone.step) < bornAt && Number(zone.thickness_um) < 0)) continue;
    const returned = zone._returned_budget_inventory || {};
    for (const s of species) each[s] = (each[s] || 0) + Math.max(0, Number(returned[s]) || 0);
  }
  return { total: species.reduce((sum, s) => sum + (each[s] || 0), 0), every: species.every(s => (each[s] || 0) > 0) };
}
// The first product of a run born on a weathering precursor, and the first two crystals it could
// have been born on, ordered by the function's three keys. null when the run has no such product.
function firstProduct(sim) {
  const product = sim.crystals.filter(c => c.weathering_precursor_receipt).sort((a, b) => a.nucleation_step - b.nucleation_step || a.crystal_id - b.crystal_id)[0];
  if (!product) return null;
  const receipt = product.weathering_precursor_receipt, config = sim._weatheringEpilogueState.config;
  const species = Object.keys(receipt.releasedInventory), parents = config.parent_minerals[product.mineral], start = Number(config.start_step);
  const rows = sim.crystals.filter(c => parents.includes(c.mineral)).map((c) => {
    const zones = c.zones.filter(z => Number(z.step) >= start && Number(z.step) < product.nucleation_step && Number(z.thickness_um) < 0);
    return { who: `${c.mineral} #${c.crystal_id}`, id: c.crystal_id, latest: zones.reduce((m, z) => Math.max(m, Number(z.step) || 0), -Infinity), ...released(sim, c, species, product.nucleation_step) };
  }).filter(r => r.every);
  rows.sort((a, b) => b.latest - a.latest || b.total - a.total || a.id - b.id);
  const onReceipt = species.reduce((n, s) => n + receipt.releasedInventory[s], 0);
  return { product: `${product.mineral} #${product.crystal_id}`, bornAt: product.nucleation_step, parent: `${receipt.parentMineral} #${receipt.parentCrystalId}`, candidates: rows.length,
    first: rows[0] ? { who: rows[0].who, total: rows[0].total, latest: rows[0].latest } : null, second: rows[1] ? { who: rows[1].who, total: rows[1].total, latest: rows[1].latest } : null,
    keysNameTheParent: !!rows[0] && rows[0].who === `${receipt.parentMineral} #${receipt.parentCrystalId}`, sumIsTheReceipts: !!rows[0] && rows[0].total === onReceipt };
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
    for (let i = 0; i < steps; i++) sim.run_step();
    const receipts = (Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : []).filter(r => r && r.event === 'enclosed').map(r => ({
      step: r.step, host: `${r.host_mineral} #${r.host_crystal_id}`, guest: `${r.guest_mineral} #${r.guest_crystal_id}`,
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
    return { steps, summary: JSON.stringify(summarize(sim)), sizes, species, fluid, exact: JSON.stringify([sizes, fill, fluid]),
      hostKey: byGuest.map(r => `${r.guest} by ${r.host} at step ${r.step}`).join('; '), product: firstProduct(sim) };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
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
// One scenario at one seed: the shipped run and the twelve nudged runs.
function cell(name, seed) {
  const base = run(name, seed);
  const out = { name, seed, steps: base.steps, product: base.product, reproduced: null, unity: null, runs: [] };
  if (seed === SEEDS[0]) {
    out.reproduced = base.summary === JSON.stringify(BASELINE[name]);
    const one = run(name, seed, 1);
    out.unity = one.exact === base.exact && one.hostKey === base.hostKey;
  }
  for (const nudge of NUDGES) {
    const r = run(name, seed, nudge);
    out.runs.push({ nudge, d: compare(base, r), product: r.product });
  }
  return out;
}

if (process.argv.includes('--one')) {
  // One scenario-seed, for the run below: its report, as one line of JSON.
  const at = process.argv.indexOf('--one');
  console.log('ONE ' + JSON.stringify(cell(process.argv[at + 1], Number(process.argv[at + 2]))));
} else {
  console.log(`probe-rounding-twelve — SIM ${SIM_VERSION}; ${NAMES.join(' and ')} as shipped, each in its own cavity; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`${NUDGES.length} factors on every growth engine's positive zones; the ${FOUR.length} that probe-rounding-reach.mjs uses are marked *`);
  console.log(`each scenario-seed is run in a process of its own, this probe started with --one, the scenario's name and the seed, ${JOBS} at a time`);
  const { spawn } = await import('node:child_process');
  const inChild = (name, seed) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--one', name, String(seed)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      const found = text.split(/\r?\n/).find(l => l.startsWith('ONE '));
      if (code !== 0 || !found) reject(new Error(`${name} at seed ${seed}: its process exited ${code}${found ? '' : ' and printed no report'}`));
      else resolve(JSON.parse(found.slice('ONE '.length)));
    });
  });
  const jobs = NAMES.flatMap(name => SEEDS.map(seed => [name, seed]));
  const reports = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (next < jobs.length) { const i = next++; reports[i] = await inChild(...jobs[i]); }
  }));

  const what = (d) => [d.summary && 'the summary', d.size && 'some crystal\'s size', d.fluid && 'the bulk fluid', d.species && `species (${d.verdict})`, d.enclosure && 'an enclosure'].filter(Boolean).join('; ');
  const apart = (p) => (p.second ? `${p.first.latest === p.second.latest ? '' : `at steps ${p.first.latest} and ${p.second.latest}, `}${p.first.total === p.second.total ? 'an exact tie' : `apart by ${(p.first.total - p.second.total).toExponential(1)}`}` : 'one candidate');
  let runs = 0, reading = 0, alone = 0, reading4 = 0, alone4 = 0, checked = 0, keysHeld = 0, sumsHeld = 0, ties = 0, reproduced = 0, unity = 0, seed42 = 0;
  for (const report of reports) {
    if (report.seed === SEEDS[0]) { seed42++; if (report.reproduced) reproduced++; if (report.unity) unity++; }
    const R = report.runs;
    const count = (test, list = R) => list.filter(test).length;
    const four = R.filter(x => FOUR.includes(x.nudge));
    runs += R.length; reading += count(x => x.d.reading); alone += count(x => x.d.enclosureAlone);
    reading4 += count(x => x.d.reading, four); alone4 += count(x => x.d.enclosureAlone, four);
    const base = report.product;
    console.log(`\n${report.name}, seed ${report.seed}; ${report.steps} steps${base ? `. As shipped ${base.product} is born at step ${base.bornAt} on ${base.parent}; ${base.candidates} candidate${base.candidates === 1 ? '' : 's'}${base.second ? `, the first two ${base.first.who} ${base.first.total.toPrecision(17)} and ${base.second.who} ${base.second.total.toPrecision(17)}, ${apart(base)}` : ''}` : ''}`);
    for (const p of [base, ...R.map(x => x.product)]) {
      if (!p) continue;
      checked++;
      if (p.keysNameTheParent) keysHeld++;
      if (p.sumIsTheReceipts) sumsHeld++;
      if (p.second && p.first.latest === p.second.latest && p.first.total === p.second.total) ties++;
    }
    for (const x of R) {
      const p = x.product;
      const born = base ? (p ? `${p.product} on ${p.parent}${p.parent === base.parent && p.product === base.product ? '' : '  <- NOT THE SHIPPED RUN\'S'}; ${apart(p)}; ` : 'no product born on a precursor; ') : '';
      console.log(`  × (${label(x.nudge)}): ${born}${x.d.reading ? `a size or the bulk fluid differs (${what(x.d)})` : x.d.enclosureAlone ? 'an enclosure alone differs' : x.d.reached ? 'nothing differs but last binary places' : 'the shipped run to the last binary place'}`);
    }
    const names = (list) => list.map(x => label(x.nudge)).join(', ') || 'none';
    console.log(`  a size or the bulk fluid differs in ${count(x => x.d.reading)} of the ${R.length} (${names(R.filter(x => x.d.reading))}); an enclosure alone in ${count(x => x.d.enclosureAlone)} (${names(R.filter(x => x.d.enclosureAlone))}); under the ${four.length} marked factors: ${count(x => x.d.reading, four)} and ${count(x => x.d.enclosureAlone, four)}`);
    if (base) {
      const other = R.filter(x => !x.product || x.product.parent !== base.parent || x.product.product !== base.product);
      const small = R.filter(x => Math.abs(x.nudge - 1) < SMALL);
      console.log(`  the product is born on another precursor in ${other.length} of the ${R.length} (${names(other)}); among the ${small.length} factors within 1e-14 of 1 in ${other.filter(x => small.includes(x)).length}`);
    }
  }
  console.log(`\nover the ${reports.length} scenario-seeds: a size or the bulk fluid differs in ${reading} of ${runs} nudged runs and an enclosure alone in ${alone}; of the ${reports.length * FOUR.length} runs under the ${FOUR.length} marked factors, in ${reading4} and ${alone4}`);
  console.log(`control: at seed ${SEEDS[0]} the shipped run ${reproduced === seed42 ? `reproduces the baseline for the ${seed42} scenarios` : 'DOES NOT REPRODUCE THE BASELINE'}`);
  console.log(`control: at seed ${SEEDS[0]} a nudge of exactly 1 ${unity === seed42 ? `is the shipped run, to the last binary place of every size, the fill and the bulk fluid, and in every enclosure, for the ${seed42} scenarios` : 'IS NOT THE SHIPPED RUN'}`);
  console.log(`control: in ${keysHeld} of the ${checked} runs with a product born on a precursor, the crystal the three keys put first is the precursor on the receipt${keysHeld === checked ? '' : ' — THE ORDERING IS NOT THE SIMULATOR\'S'}; in ${sumsHeld} of them its release as summed here is the receipt's${sumsHeld === checked ? '' : ' — THE SUM IS NOT THE SIMULATOR\'S'}; exact ties between the first two: ${ties}`);
}
