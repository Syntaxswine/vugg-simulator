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
 * Then, for wittichen as shipped at seeds 42, 1 and 2, it prints what that function had to choose
 * between when the scenario's first product was born on a precursor: every crystal of the product's
 * parent minerals that had released each required species by then, with the number of its negative
 * zones since the epilogue began, the step of the latest, the thickness those zones took off and
 * the release; the crystal the function's three keys put first; and the lower crystal id of the
 * first two where they are at the same step and within a billionth of each other in release. (The
 * function also asks each candidate for a local σ of the product above the product's threshold,
 * :310. This probe does not read that σ: the control below shows the ordering names the receipt's
 * precursor without it.)
 * Last, for each of those candidates it prints the shells its negative zone came off and what each
 * shell had booked per micrometre for each required species when it grew. The release is the sum,
 * over those shells, of the thickness taken times the shell's booked number
 * (js/19-mineral-stoichiometry.ts:955–981; the number is booked at :1125), so two crystals that
 * lose the same thickness differ in release by what their shells booked. It prints each
 * candidate's size before the zone beside the engines' law for the thickness, min(3.0, 0.1 × size)
 * times the time scale (js/61-engines-sulfide.ts:1111, :1153), and the crystals of the parent
 * minerals that have no such zone, with their sizes (the engines dissolve a crystal of more than
 * 10 µm, :1109, :1151).
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: wittichen's and searles_lake's shipped runs at seed 42 are compared with the committed
 * baseline; for each product whose precursor is printed, the release this probe sums for that
 * precursor has to be the one on the simulator's own receipt for the product; where the candidates
 * are listed, the crystal the three keys put first has to be the precursor on the product's
 * receipt; and the release rebuilt from the shells has to be the one the simulator wrote on the
 * zone, to the last binary place.
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
const shipped = new Map();
for (const [name, seed, nudge] of PAIRS) {
  const A = run(name, seed), B = run(name, seed, nudge);
  shipped.set(`${name} ${seed}`, A);
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

// What the function had to choose between when wittichen's first product was born, as shipped.
console.log('\nwittichen as shipped, seeds 42 / 1 / 2: the crystals its first product born on a weathering precursor could have been born on');
let ordered = 0, orderedHeld = 0;
const kept = [];
for (const seed of [42, 1, 2]) {
  const sim = (shipped.get(`wittichen ${seed}`) ?? run('wittichen', seed)).sim;
  const product = sim.crystals.filter(c => c.weathering_precursor_receipt).sort((a, b) => a.nucleation_step - b.nucleation_step || a.crystal_id - b.crystal_id)[0];
  if (!product) { console.log(`  seed ${seed}: no crystal is born on a weathering precursor`); continue; }
  const receipt = product.weathering_precursor_receipt, config = sim._weatheringEpilogueState.config;
  const species = Object.keys(receipt.releasedInventory), parents = config.parent_minerals[product.mineral], start = Number(config.start_step);
  const rows = sim.crystals.filter(c => parents.includes(c.mineral)).map((c) => {
    const zones = c.zones.filter(z => Number(z.step) >= start && Number(z.step) < product.nucleation_step && Number(z.thickness_um) < 0);
    const every = species.every(s => zones.reduce((n, z) => n + Math.max(0, Number((z._returned_budget_inventory || {})[s]) || 0), 0) > 0);
    return { c, zones: zones.length, every, latest: zones.reduce((m, z) => Math.max(m, Number(z.step) || 0), -Infinity), lost: zones.reduce((n, z) => n - Number(z.thickness_um), 0), total: released(sim, c, species, product.nucleation_step) };
  }).filter(r => r.every);
  // the function's three keys (`candidates.sort`, :320)
  rows.sort((a, b) => b.latest - a.latest || b.total - a.total || a.c.crystal_id - b.c.crystal_id);
  console.log(`  seed ${seed}: ${product.mineral} #${product.crystal_id}, born at step ${product.nucleation_step} on ${receipt.parentMineral} #${receipt.parentCrystalId}; the epilogue began at step ${start}. Of ${parents.join(', ')}, ${rows.length} crystal${rows.length === 1 ? '' : 's'} had released ${species.join(' + ')} by then:`);
  for (const r of rows) console.log(`    ${r.c.mineral} #${r.c.crystal_id}: ${r.zones} negative zone${r.zones === 1 ? '' : 's'} since the epilogue began, the latest at step ${r.latest}, ${r.lost.toPrecision(6)} µm taken off; released ${r.total.toPrecision(17)}`);
  ordered++;
  const first = rows[0], second = rows[1];
  const held = first && first.c.crystal_id === receipt.parentCrystalId && first.c.mineral === receipt.parentMineral;
  if (held) orderedHeld++;
  console.log(`    by the function's three keys the first is ${first ? `${first.c.mineral} #${first.c.crystal_id}` : 'none'}, ${held ? 'the precursor on the receipt' : 'WHICH IS NOT THE PRECURSOR ON THE RECEIPT'}`);
  if (!second) console.log('    there is one such crystal, and nothing to choose between');
  else if (first.latest === second.latest && near(first.total, second.total)) {
    const lower = Math.min(first.c.crystal_id, second.c.crystal_id);
    console.log(`    the first two are at the same step and ${first.total === second.total ? 'released exactly the same' : `${(first.total - second.total).toExponential(1)} apart in release`}; the lower crystal id of the two is #${lower}, ${lower === first.c.crystal_id ? 'the one the function chose' : 'which is not the one the function chose'}`);
  } else console.log(`    the first two are ${first.latest === second.latest ? 'at the same step' : `at steps ${first.latest} and ${second.latest}`} and ${(first.total - second.total).toPrecision(3)} apart in release: not a pair that rounding decides`);
  kept.push({ seed, sim, product, species, parents, start, rows });
}

// Where the releases of two such candidates come to differ. A negative zone takes its thickness off
// the crystal's positive shells from the outermost inward, and returns for each shell the
// thickness taken times the number that shell booked for each species when it grew
// (js/19-mineral-stoichiometry.ts:955–981 reads z._budget_inventory_per_um; :1125 books it as what
// the fluid lost to the shell divided by the shell's thickness). This part rebuilds that for every
// candidate above and prints the shells and the numbers they booked.
console.log('\nwittichen as shipped, seeds 42 / 1 / 2: the shells each of those candidates\' negative zones came off, and what each shell had booked');
let rebuiltChecked = 0, rebuiltHeld = 0;
const sizeBefore = (c, step) => c.zones.filter(z => Number(z.step) < step).reduce((n, z) => n + Number(z.thickness_um), 0);
const spread = (list) => (list.length ? `${Math.min(...list).toPrecision(17)} to ${Math.max(...list).toPrecision(17)} (${new Set(list).size} distinct value${new Set(list).size === 1 ? '' : 's'} in ${list.length} shell${list.length === 1 ? '' : 's'})` : 'none booked');
for (const { seed, sim, product, species, parents, start, rows } of kept) {
  console.log(`  seed ${seed}:`);
  for (const r of rows) {
    // the crystal's positive shells with what is left of each, in the order they grew; each
    // negative zone takes from the last shell back (the simulator's loop, :938–952 and :955–960)
    const shells = [];
    for (const z of r.c.zones) {
      if (!z || !z.thickness_um) continue;
      if (z.thickness_um > 0) { shells.push({ z, left: z.thickness_um }); continue; }
      let toRemove = -z.thickness_um;
      const taken = [];
      for (let i = shells.length - 1; i >= 0 && toRemove > 0; i--) {
        const available = Math.max(0, shells[i].left), removed = Math.min(available, toRemove);
        shells[i].left = available - removed;
        toRemove -= removed;
        if (removed > 0) taken.push({ removed, booked: shells[i].z._budget_inventory_per_um || {} });
      }
      if (!(Number(z.step) >= start && Number(z.step) < product.nucleation_step)) continue;
      const before = sizeBefore(r.c, Number(z.step));
      const rebuilt = {};
      for (const t of taken) for (const s of species) rebuilt[s] = (rebuilt[s] || 0) + t.removed * Number(t.booked[s]);
      const returned = z._returned_budget_inventory || {};
      const held = species.every(s => rebuilt[s] === Number(returned[s]));
      rebuiltChecked++;
      if (held) rebuiltHeld++;
      console.log(`    ${r.c.mineral} #${r.c.crystal_id}: ${before.toPrecision(6)} µm before its zone of step ${z.step}, which took ${(-z.thickness_um).toPrecision(6)} µm off ${taken.length} shell${taken.length === 1 ? '' : 's'} (the engine takes min(3.0, 0.1 × size), ${Math.min(3.0, 0.1 * before).toPrecision(6)}, times the time scale of ${getSimulationTimeScale()})`);
      console.log(`      ${species.map(s => `booked ${s} per µm, ${spread(taken.map(t => Number(t.booked[s])))}`).join('; ')}; the release rebuilt from those shells ${held ? 'is the zone\'s own to the last binary place' : 'IS NOT THE ZONE\'S OWN'}`);
    }
  }
  const idle = sim.crystals.filter(c => parents.includes(c.mineral) && !rows.some(r => r.c === c));
  console.log(`    of ${parents.join(', ')}, the crystals with no such zone: ${idle.map(c => `${c.mineral} #${c.crystal_id} (${sizeBefore(c, product.nucleation_step).toPrecision(4)} µm when the product was born)`).join('; ') || 'none'}`);
}
console.log(`\ncontrol: where the candidates are listed, the crystal the three keys put first is the precursor on the product's receipt at ${orderedHeld} of ${ordered} seeds${orderedHeld === ordered ? '' : ' — THE ORDERING IS NOT THE SIMULATOR\'S'}`);
console.log(`control: the release rebuilt from the shells is the one the simulator wrote on the zone, to the last binary place of each species, for ${rebuiltHeld} of ${rebuiltChecked} zones${rebuiltHeld === rebuiltChecked ? '' : ' — THE SHELLS ARE NOT THE ONES THE SIMULATOR TOOK FROM'}`);
console.log(`control: at seed 42 the shipped run ${reproduced === baselines.size ? `reproduces the baseline for the ${baselines.size} scenarios read at that seed` : 'DOES NOT REPRODUCE THE BASELINE'}`);
console.log(`control: the release this probe sums for a product's precursor is the one on the simulator's receipt for the product in ${receiptsHeld} of ${receiptsChecked} cases${receiptsHeld === receiptsChecked ? '' : ' — THE SUM IS NOT THE SIMULATOR\'S'}`);
