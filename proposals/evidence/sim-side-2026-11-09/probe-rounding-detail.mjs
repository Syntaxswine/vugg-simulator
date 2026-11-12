#!/usr/bin/env node
/**
 * probe-rounding-detail.mjs — what differs in the shipped runs that probe-rounding-reach.mjs finds
 * a nudge to move, outside radioactive_pegmatite
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the last two notes).
 *
 * probe-rounding-reach.mjs multiplies every positive zone of every growth engine by a factor within
 * 10^-13 of 1 and finds three scenarios in which a nudged run differs from the shipped run:
 * radioactive_pegmatite (probe-enclosure-floor.mjs), wittichen at seeds 42 and 2, and searles_lake
 * at seed 42. This probe makes the last three pairs of runs again, each under one of the factors
 * that moved it, and prints for each pair:
 *   - the first step at which some crystal's size differs by more than a billionth of itself, or
 *     its active flag or its host differs, with the fill after that step and after the one before;
 *   - the crystals that differ at the end, with the largest difference in µm, and whether the
 *     baseline-style summary differs;
 *   - the enclosure receipts that are in one run and not in the other;
 *   - for a crystal born on a weathering precursor (js/44e-weathering-epilogue.ts,
 *     weatheringNucleationContext) whose precursor differs between the two runs: the precursor in
 *     each run and, for every crystal of the precursor's mineral, what it had released when the
 *     product was born, summed as that function sums it (the returned inventory of the required
 *     species over the crystal's negative zones since the epilogue began). The function takes the
 *     candidate with the latest negative zone, then the one that has released the most, then the
 *     lowest crystal id (`candidates.sort`, :320).
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: wittichen's and searles_lake's shipped runs at seed 42 are compared with the committed
 * baseline; for each product whose precursor is printed, the release this probe sums for that
 * precursor has to be the one on the simulator's own receipt for the product.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-rounding-detail.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-rounding-detail',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
// the pairs probe-rounding-reach.txt lists outside radioactive_pegmatite, each with a factor that moved it
const PAIRS = [['wittichen', 42, 1 - 1e-13], ['wittichen', 2, 1 - 1e-13], ['searles_lake', 42, 1 - 1e-14]];
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

// One run as shipped, kept step by step. nudge: every positive zone of every growth engine is
// multiplied by it; null for the shipped run itself.
function run(name, seed, nudge = null) {
  const saved = {};
  try {
    if (nudge != null) {
      for (const mineral of Object.keys(MINERAL_ENGINES)) {
        const orig = saved[mineral] = MINERAL_ENGINES[mineral];
        MINERAL_ENGINES[mineral] = (crystal, conditions, step) => {
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          zone.thickness_um *= nudge;
          if (typeof zone.growth_rate === 'number') zone.growth_rate *= nudge;
          return zone;
        };
      }
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const history = [];
    for (let i = 0; i < (defaultSteps ?? 100); i++) {
      sim.run_step();
      history.push({ step: sim.step, fill: sim.get_vug_fill(), crystals: sim.crystals.map(c => ({ who: `${c.mineral} #${c.crystal_id}`, um: c.total_growth_um, active: c.active, by: c.enclosed_by ?? null })) });
    }
    const receipts = (Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : []).filter(r => r && r.event === 'enclosed')
      .map(r => `step ${r.step}: ${r.host_mineral} #${r.host_crystal_id} encloses ${r.guest_mineral} #${r.guest_crystal_id} on a layer of ${Number(r.host_same_step_positive_growth_um).toPrecision(4)} µm`);
    return { sim, history, receipts, summary: JSON.stringify(summarize(sim)) };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const differs = (x, y) => x.who !== y.who || !near(x.um, y.um) || x.active !== y.active || x.by !== y.by;
const host = (sim, id) => { const c = sim.crystals.find(k => k.crystal_id === id); return c ? `${c.mineral} #${id}` : 'none'; };
// What a crystal had released of the species on a product's receipt when the product was born, as
// weatheringNucleationContext sums it for a candidate precursor: each species over the crystal's
// negative zones since the epilogue began, then the species added together. A product is born
// before the growth of its own step, so the zones of that step are not yet there.
function released(sim, crystal, species, bornAt) {
  const start = Number(sim._weatheringEpilogueState?.config?.start_step);
  const each = {};
  for (const zone of crystal.zones) {
    if (!(Number(zone.step) >= start && Number(zone.step) < bornAt && Number(zone.thickness_um) < 0)) continue;
    const returned = zone._returned_budget_inventory || {};
    for (const s of species) each[s] = (each[s] || 0) + Math.max(0, Number(returned[s]) || 0);
  }
  return species.reduce((sum, s) => sum + (each[s] || 0), 0);
}

console.log(`probe-rounding-detail — SIM ${SIM_VERSION}; time scale ${getSimulationTimeScale()}; each pair is a shipped run and the same run with every growth engine's positive zones multiplied by one factor`);
let reproduced = 0, receiptsChecked = 0, receiptsHeld = 0;
const baselines = new Set();
for (const [name, seed, nudge] of PAIRS) {
  const A = run(name, seed), B = run(name, seed, nudge);
  if (seed === 42 && !baselines.has(name)) { baselines.add(name); if (A.summary === JSON.stringify(BASELINE[name])) reproduced++; }
  console.log(`\n${name}, seed ${seed}, × (${label(nudge)}); ${A.history.length} steps`);
  let first = null;
  for (let i = 0; i < A.history.length && !first; i++) {
    const a = A.history[i].crystals, b = B.history[i].crystals;
    if (a.length !== b.length) { first = { i, why: `the runs hold ${a.length} and ${b.length} crystals` }; break; }
    const k = a.findIndex((x, j) => differs(x, b[j]));
    if (k >= 0) first = { i, why: a.filter((x, j) => differs(x, b[j])).map((x) => { const y = b[a.indexOf(x)]; return `${x.who} ${x.um.toPrecision(10)} against ${y.um.toPrecision(10)} µm${x.active !== y.active ? `, active ${x.active} against ${y.active}` : ''}${x.by !== y.by ? `, enclosed by ${host(A.sim, x.by)} against ${host(B.sim, y.by)}` : ''}`; }).join('; ') };
  }
  if (!first) { console.log('  THE TWO RUNS DO NOT DIFFER'); continue; }
  const s = A.history[first.i].step;
  console.log(`  first step at which a crystal's size, its active flag or its host differs: ${s}. ${first.why}`);
  console.log(`  fill after step ${s - 1}: ${first.i ? A.history[first.i - 1].fill.toPrecision(17) : '—'} against ${first.i ? B.history[first.i - 1].fill.toPrecision(17) : '—'}; after step ${s}: ${A.history[first.i].fill.toPrecision(17)} against ${B.history[first.i].fill.toPrecision(17)}`);
  const endA = A.history.at(-1).crystals, endB = B.history.at(-1).crystals;
  const apart = endA.map((x, j) => ({ x, y: endB[j] })).filter(({ x, y }) => y && differs(x, y)).sort((p, q) => Math.abs(q.x.um - q.y.um) - Math.abs(p.x.um - p.y.um));
  console.log(`  at the end ${apart.length} of ${endA.length} crystals differ${endA.length !== endB.length ? ` (and the runs hold ${endA.length} and ${endB.length})` : ''}; the baseline-style summary ${A.summary === B.summary ? 'is the same' : 'DIFFERS'}; the largest difference in a crystal's size is ${apart.length ? Math.abs(apart[0].x.um - apart[0].y.um).toPrecision(3) : 0} µm`);
  for (const { x, y } of apart.slice(0, 8)) console.log(`    ${x.who}: ${x.um.toPrecision(7)} against ${y.um.toPrecision(7)} µm${x.by !== y.by ? `; enclosed by ${host(A.sim, x.by)} against ${host(B.sim, y.by)}` : ''}`);
  const inB = new Set(B.receipts), inA = new Set(A.receipts);
  const onlyA = A.receipts.filter(r => !inB.has(r)), onlyB = B.receipts.filter(r => !inA.has(r));
  console.log(`  enclosures in the shipped run alone: ${onlyA.join('; ') || 'none'}`);
  console.log(`  enclosures in the nudged run alone: ${onlyB.join('; ') || 'none'}`);
  // products born on a weathering precursor, where the precursor differs
  let products = 0;
  for (const c of A.sim.crystals) {
    const ra = c.weathering_precursor_receipt, d = B.sim.crystals.find(k => k.crystal_id === c.crystal_id), rb = d?.weathering_precursor_receipt;
    if (!ra || !rb || d.mineral !== c.mineral || ra.parentCrystalId === rb.parentCrystalId) continue;
    products++;
    const species = Object.keys(ra.releasedInventory);
    console.log(`  ${c.mineral} #${c.crystal_id}, born at step ${c.nucleation_step}: on ${ra.parentMineral} #${ra.parentCrystalId} in the shipped run and on ${rb.parentMineral} #${rb.parentCrystalId} in the nudged run. What each ${ra.parentMineral} had released of ${species.join(' + ')} by then:`);
    for (const [tag, sim, receipt] of [['shipped', A.sim, ra], ['nudged ', B.sim, rb]]) {
      const candidates = sim.crystals.filter(k => k.mineral === receipt.parentMineral).map(k => ({ id: k.crystal_id, total: released(sim, k, species, c.nucleation_step) })).filter(k => k.total > 0);
      const mine = candidates.find(k => k.id === receipt.parentCrystalId), onReceipt = species.reduce((n, sp) => n + receipt.releasedInventory[sp], 0);
      receiptsChecked++;
      if (mine && mine.total === onReceipt) receiptsHeld++;
      const most = Math.max(...candidates.map(k => k.total));
      console.log(`    ${tag}: ${candidates.map(k => `#${k.id} ${k.total.toPrecision(17)}`).join('; ')}; the most is #${candidates.filter(k => k.total === most).map(k => k.id).join(' and #')}${candidates.filter(k => k.total === most).length > 1 ? ', a tie that the lowest id takes' : ''}; apart by ${(most - Math.min(...candidates.map(k => k.total))).toExponential(1)}`);
    }
  }
  if (!products) console.log('  no crystal is born on another weathering precursor in the nudged run than in the shipped run');
}
console.log(`\ncontrol: at seed 42 the shipped run ${reproduced === baselines.size ? `reproduces the baseline for the ${baselines.size} scenarios read at that seed` : 'DOES NOT REPRODUCE THE BASELINE'}`);
console.log(`control: the release this probe sums for a product's precursor is the one on the simulator's receipt for the product in ${receiptsHeld} of ${receiptsChecked} cases${receiptsHeld === receiptsChecked ? '' : ' — THE SUM IS NOT THE SIMULATOR\'S'}`);
