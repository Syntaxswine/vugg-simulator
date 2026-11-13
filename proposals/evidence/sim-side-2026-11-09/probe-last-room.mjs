#!/usr/bin/env node
/**
 * probe-last-room.mjs — the layer a full cavity hands out and the enclosures it licenses, in each
 * scenario's own cavity and at the vug setting of Simulation mode's form
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the sixth note; §6, decision 7).
 *
 * probe-enclosure-floor.mjs --fleet counts the enclosures whose host layer is under 10^-6 µm, in
 * each scenario's own cavity. This probe reads three things more, of every scenario as shipped at
 * seeds 42 / 1 / 2:
 *   - how thick the host's layer is in every enclosure, so that it can be seen where a floor on
 *     that layer could sit (the simulator's receipt for each enclosure gives the layer);
 *   - what the growth loop's fill read when it accepted the host's layer, and whether the cavity
 *     clamp had cut the layer. A layer accepted while the fill reads under 1 by a billionth or
 *     less is called here a layer "in the last room";
 *   - with --vug, the same at the vug setting of the form's Cavity Size select, 15 mm, where many
 *     more pockets fill (probe-form-vug-fleet.mjs), and there also what four nudges of every
 *     growth engine's positive zones move. That is the comparison probe-rounding-reach.mjs makes
 *     in each scenario's own cavity, with the same four factors.
 *
 * How the fill is read. The growth loop's fill is a local of run_step (`currentFill`,
 * js/85-simulator.ts:683). Every value it takes is a return of the simulator's
 * _refreshVugFillAndSeal (:628, :734, :1025, :1028, :1257), which nothing else calls. The loop
 * calls _applyZoneGrowthBudget on a zone (:1006) after the cavity clamp (:947) and before the zone
 * is stored (:1022). The probe puts a wrapper on those two methods of the one simulator: the first
 * remembers its last return; the second reads it and, once the shipped method has run, keeps the
 * thickness the zone is stored with and whether the clamp wrote its note on the zone
 * ("cavity ceiling", :980). The wrappers return what the shipped methods return.
 *
 * Each run is built as the form builds it, by the game's command runtime
 * (startSimulationCommandRuntime, js/85l-simulation-command-protocol.ts), with no override for the
 * scenario's own cavity and { wall: { size_class: 'vug', vug_diameter_mm: 15 } } for the vug, and
 * stepped with run_step for the scenario's own length.
 *
 * What a nudged run is compared in (--vug), against the shipped run of the same scenario and seed:
 *   a size or the bulk fluid   the baseline-style summary differs; or some crystal's size at the end
 *                        differs by more than a billionth of itself, or the crystals are not the
 *                        same ones; or some number of the bulk handle's fluid at the end differs
 *                        by more than a billionth of itself (and by more than 10^-12); or the
 *                        comparison tools/sim-side-ab.mjs makes of an arm with the shipped run
 *                        (species moved, lost, gained) finds a species
 *   an enclosure alone   none of the above, and some crystal is enclosed at another step, by
 *                        another host, or in one run and not in the other
 * "Reached" counts the nudged runs that differ from the shipped run in any binary place of a
 * crystal's size, the fill at the end or the bulk fluid.
 *
 * The scenarios are run in child processes of this file (--one and the scenario's name), six at a
 * time, and their reports are printed in the order of the scenario list.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 a run without the two wrappers has to be the wrapped run to the last binary
 * place; for every enclosure, the host's positive zones of that step as the probe keeps them have
 * to add up to the layer on the simulator's receipt; in each scenario's own cavity the seed-42 run
 * is compared with the committed baseline; with --vug a nudge of exactly 1 has to be the shipped
 * run to the last binary place.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-last-room.mjs
 *   node proposals/evidence/sim-side-2026-11-09/probe-last-room.mjs --vug
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale, startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm,
} = await harness.loadSimBundle({
  toolName: 'probe-last-room',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale', 'startSimulationCommandRuntime', 'makeSimulationStartCommand', 'resolveSizeClassToMm'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const AT_VUG = process.argv.includes('--vug');
const VUG_MM = resolveSizeClassToMm('vug');
const OVERRIDES = AT_VUG ? { wall: { size_class: 'vug', vug_diameter_mm: VUG_MM } } : {};      // what the form adds for that choice
const RESIDUE_UM = 1e-6;     // probe-enclosure-floor.mjs's test: a host layer thinner than this
const LAST_ROOM = 1e-9;      // a layer accepted while the loop's fill reads under 1 by this or less
const BINS = [[RESIDUE_UM, 'under 1e-6'], [1e-3, '1e-6 to 0.001'], [0.1, '0.001 to 0.1'], [1, '0.1 to 1'], [5, '1 to 5'], [Infinity, '5 or more']];
const NUDGES = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);
const micron = (t) => (Math.abs(t) >= 0.01 ? `${t.toFixed(2)} µm` : `${t.toExponential(1)} µm`);
const under1 = (f) => (f >= 1 ? f.toPrecision(17) : `1 − ${(1 - f).toExponential(2)}`);

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

// One run. nudge: every positive zone of every growth engine is multiplied by it (null for the
// shipped run). traced: the two wrappers are put on the simulator.
function run(name, seed, { nudge = null, traced = true } = {}) {
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
    const open = !!sim.conditions.wall.open_system;
    // every positive zone the growth loop accepts: the step, the crystal, the thickness it is stored
    // with, the loop's fill when it was accepted, and whether the cavity clamp had cut it
    const accepted = [];
    if (traced) {
      let last = null;
      const refresh = sim._refreshVugFillAndSeal, apply = sim._applyZoneGrowthBudget;
      const put = (key, value) => Object.defineProperty(sim, key, { value, writable: true, configurable: true, enumerable: false });
      put('_refreshVugFillAndSeal', function (...args) { const fill = refresh.apply(this, args); last = fill; return fill; });
      put('_applyZoneGrowthBudget', function (crystal, zone) {
        const fill = last;
        const out = apply.call(this, crystal, zone);
        if (zone && zone.thickness_um > 0 && !zone.is_phantom) accepted.push({ step: this.step, id: crystal.crystal_id, um: zone.thickness_um, fill, cut: /cavity ceiling/.test(zone.note || '') });
        return out;
      });
    }
    const steps = runtime.scenarioData.defaultSteps ?? 100;
    let maxFill = 0, firstFull = null;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (fill > maxFill) maxFill = fill;
      if (firstFull == null && fill >= 1 - 1e-9) firstFull = sim.step;
    }
    // the simulator's own receipts for the enclosures of the run, each with the host's kept zones of that step
    const receipts = (Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : []).filter(r => r && r.event === 'enclosed').map(r => ({
      step: r.step, host: `${r.host_mineral} #${r.host_crystal_id}`, guest: `${r.guest_mineral} #${r.guest_crystal_id}`,
      layer: Number(r.host_same_step_positive_growth_um), hostMm: Number(r.host_physical_size_at_enclosure_um) / 1000, guestMm: Number(r.guest_remaining_growth_um) / 1000,
      zones: accepted.filter(z => z.step === r.step && z.id === r.host_crystal_id).map(z => ({ um: z.um, fill: z.fill, cut: z.cut })),
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
    return { steps, open, fill, maxFill, firstFull, summary: JSON.stringify(summarize(sim)), sizes, species, fluid, receipts,
      zonesAccepted: accepted.length, zonesCut: accepted.filter(z => z.cut).length,
      zonesLastRoom: accepted.filter(z => z.fill != null && z.fill < 1 && 1 - z.fill <= LAST_ROOM).length,
      exact: JSON.stringify([sizes, fill, fluid]),
      hostKey: byGuest.map(r => `${r.guest} by ${r.host} at step ${r.step} on ${r.layer}`).join('; ') };
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
// the enclosures of a run by guest, host and step, without the layer (a layer may differ in its last places alone)
const hosts = (r) => [...r.receipts].sort((a, b) => (a.guest < b.guest ? -1 : a.guest > b.guest ? 1 : a.step - b.step)).map(x => `${x.guest} by ${x.host} at step ${x.step}`).join('; ');
// What differs between a nudged run and the shipped run (the header says what each word means).
function compare(base, r) {
  const size = base.sizes.length !== r.sizes.length || base.sizes.some(([who, um], i) => r.sizes[i][0] !== who || !near(um, r.sizes[i][1]));
  const fluid = base.fluid.length !== r.fluid.length || base.fluid.some(([k, v], i) => r.fluid[i][0] !== k || !(near(v, r.fluid[i][1]) || Math.abs(v - r.fluid[i][1]) <= 1e-12));
  const verdict = against(base, r);
  const d = { reached: base.exact !== r.exact, summary: base.summary !== r.summary, size, fluid, species: verdict.any, verdict: verdict.text, enclosure: hosts(base) !== hosts(r) };
  d.reading = d.summary || d.size || d.fluid || d.species;
  d.enclosureAlone = !d.reading && d.enclosure;
  return d;
}
// One scenario: the shipped run at the three seeds, each with its nudged runs when at the vug.
function scenario(name) {
  const out = { name, open: false, untraced: false, reproduced: null, unity: null, cells: [] };
  for (const seed of SEEDS) {
    const base = run(name, seed);
    out.open = base.open;
    if (seed === SEEDS[0]) {
      const bare = run(name, seed, { traced: false });
      out.untraced = bare.exact === base.exact && hosts(bare) === hosts(base) && bare.receipts.every((x, i) => x.layer === base.receipts[i].layer);
      if (!AT_VUG) out.reproduced = base.summary === JSON.stringify(BASELINE[name]);
      if (AT_VUG) { const one = run(name, seed, { nudge: 1 }); out.unity = one.exact === base.exact && one.hostKey === base.hostKey; }
    }
    const ds = AT_VUG ? NUDGES.map(nudge => ({ nudge, d: compare(base, run(name, seed, { nudge })) })) : [];
    out.cells.push({ seed, steps: base.steps, maxFill: base.maxFill, firstFull: base.firstFull, receipts: base.receipts,
      zonesAccepted: base.zonesAccepted, zonesCut: base.zonesCut, zonesLastRoom: base.zonesLastRoom, ds });
  }
  return out;
}
// What the kept zones say of one enclosure.
const sumOf = (x) => x.zones.reduce((sum, z) => sum + z.um, 0);
const kept = (x) => x.zones.length > 0 && sumOf(x) === x.layer;
const cut = (x) => x.zones.length > 0 && x.zones.every(z => z.cut);
const lastRoom = (x) => x.zones.length > 0 && x.zones.every(z => z.fill != null && z.fill < 1 && 1 - z.fill <= LAST_ROOM);
const line = (name, seed, x) => `${name}, seed ${seed}, step ${x.step}: ${x.host} (${x.hostMm.toFixed(2)} mm) encloses ${x.guest} (${x.guestMm.toFixed(3)} mm) on ${micron(x.layer)}; the layer was accepted with the fill at ${x.zones.map(z => `${under1(z.fill)}${z.cut ? ', cut by the clamp' : ''}`).join('; ') || '(no zone kept)'}`;

if (process.argv.includes('--one')) {
  // One scenario, for the run below: its report, as one line of JSON.
  console.log('ONE ' + JSON.stringify(scenario(process.argv[process.argv.indexOf('--one') + 1])));
} else {
  const NAMES = Object.keys(SCENARIOS);
  const where = AT_VUG ? `at the vug setting of the form (${VUG_MM} mm)` : 'each in its own cavity';
  console.log(`probe-last-room — SIM ${SIM_VERSION}; ${NAMES.length} scenarios as shipped, ${where}; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`each line gives the three seeds. "cut" is an enclosure whose host layer of that step the cavity clamp had cut; "under 1e-6" one whose host layer is under ${RESIDUE_UM} µm; "last room" one whose host layer was accepted while the loop's fill read under 1 by ${LAST_ROOM} or less`);
  if (AT_VUG) console.log(`${NUDGES.length} nudges of every growth engine's positive zones (${NUDGES.map(label).join(', ')}); the last three counts of a line are of the ${NUDGES.length} nudged runs at each seed`);
  console.log(`each scenario is run in a process of its own, this probe started with --one and the scenario's name, ${JOBS} at a time\n`);
  const { spawn } = await import('node:child_process');
  const inChild = (name) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--one', name, ...(AT_VUG ? ['--vug'] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
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

  const all = [];                       // every enclosure, with its scenario and seed
  let untraced = 0, reproduced = 0, unity = 0;
  let runs = 0, reached = 0, reading = 0, alone = 0;
  const moved = [], cellsMoved = new Set(), scenariosMoved = new Set();
  for (const report of reports) {
    if (report.untraced) untraced++;
    if (report.reproduced) reproduced++;
    if (report.unity) unity++;
    const cells = report.cells;
    for (const cell of cells) {
      for (const x of cell.receipts) all.push({ name: report.name, seed: cell.seed, x });
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
    const nudged = AT_VUG ? `; reached ${each(cells, c => c.ds.filter(x => x.d.reached).length)}; a size or the bulk fluid differs in ${each(cells, c => c.ds.filter(x => x.d.reading).length)}; an enclosure alone in ${each(cells, c => c.ds.filter(x => x.d.enclosureAlone).length)}` : '';
    console.log(`  ${report.name.padEnd(36)} ${cells[0].steps} steps; largest fill ${each(cells, c => (c.maxFill * 100).toFixed(1))} %, first 1 to a billionth at step ${each(cells, c => c.firstFull ?? '—')}; enclosures ${each(cells, c => c.receipts.length)}, cut ${each(cells, c => c.receipts.filter(cut).length)}, under 1e-6 ${each(cells, c => c.receipts.filter(x => x.layer < RESIDUE_UM).length)}, last room ${each(cells, c => c.receipts.filter(lastRoom).length)}${nudged}${report.open ? ' | AN OPEN SYSTEM: the step reads this fill as 0' : ''}`);
  }

  const bySeed = (test) => each(SEEDS, seed => all.filter(e => e.seed === seed && test(e.x)).length);
  const total = (test) => all.filter(e => test(e.x)).length;
  const inScenarios = (test) => {
    const names = [...new Set(all.filter(e => test(e.x)).map(e => e.name))];
    return names.map(n => `${n} (${each(SEEDS, seed => all.filter(e => e.name === n && e.seed === seed && test(e.x)).length)})`).join(', ') || 'none';
  };
  const residue = (x) => x.layer < RESIDUE_UM;
  console.log(`\n${all.length} enclosures in the ${NAMES.length * SEEDS.length} runs (${bySeed(() => true)} at the three seeds)`);
  console.log(`  on a host layer under ${RESIDUE_UM} µm: ${total(residue)} (${bySeed(residue)}), in ${inScenarios(residue)}`);
  console.log(`  on a host layer in the last room: ${total(lastRoom)} (${bySeed(lastRoom)}), in ${inScenarios(lastRoom)}`);
  console.log(`  in the last room and on a layer of ${RESIDUE_UM} µm or more: ${total(x => lastRoom(x) && !residue(x))}; under ${RESIDUE_UM} µm and not in the last room: ${total(x => residue(x) && !lastRoom(x))}`);
  console.log(`  on a host layer that the cavity clamp had cut: ${total(cut)} (${bySeed(cut)}), in ${inScenarios(cut)}`);
  const spectrum = (list) => BINS.map(([edge, text], i) => `${text}: ${list.filter(e => e.x.layer < edge && (i === 0 || e.x.layer >= BINS[i - 1][0])).length}`).join('; ');
  console.log(`\nthe host's layer, µm, over all ${all.length} enclosures — ${spectrum(all)}`);
  console.log(`  of the ${total(cut)} on a layer the clamp had cut — ${spectrum(all.filter(e => cut(e.x)))}`);
  console.log(`  of the ${all.length - total(cut)} others — ${spectrum(all.filter(e => !cut(e.x)))}`);
  const thin = all.filter(e => residue(e.x) || lastRoom(e.x));
  console.log(`\nthe ${thin.length} enclosures on a host layer under ${RESIDUE_UM} µm or in the last room:`);
  for (const e of thin) console.log(`  ${line(e.name, e.seed, e.x)}`);
  const rest = all.filter(e => !residue(e.x) && !lastRoom(e.x)).sort((a, b) => a.x.layer - b.x.layer);
  console.log(`the six thinnest host layers among the other ${rest.length}:`);
  for (const e of rest.slice(0, 6)) console.log(`  ${line(e.name, e.seed, e.x)}`);

  if (AT_VUG) {
    console.log(`\n${reading} of ${runs} nudged runs differ from the shipped run in a size or the bulk fluid, at ${cellsMoved.size} of the ${NAMES.length * SEEDS.length} scenario-seeds, in ${scenariosMoved.size} of the ${NAMES.length} scenarios: ${[...scenariosMoved].join(', ') || 'none'}`);
    console.log(`${alone} more differ in an enclosure alone; the nudge reached ${reached} of the ${runs}`);
    for (const text of moved) console.log(`  ${text}`);
  }
  const keptAll = all.filter(e => kept(e.x)).length;
  console.log(`\ncontrol: the host's positive zones of the step, as this probe keeps them, add up to the layer on the simulator's receipt in ${keptAll} of ${all.length} enclosures${keptAll === all.length ? '' : ' — THE KEPT ZONES ARE NOT THE RECEIPT\'S LAYER'}`);
  console.log(`control: at seed ${SEEDS[0]} a run without the two wrappers ${untraced === NAMES.length ? `is the wrapped run, to the last binary place of every size, the fill, the bulk fluid and every enclosure's layer, for all ${NAMES.length} scenarios` : `IS NOT THE WRAPPED RUN for ${NAMES.length - untraced} of ${NAMES.length} scenarios`}`);
  if (!AT_VUG) console.log(`control: at seed ${SEEDS[0]} the run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}`);
  if (AT_VUG) console.log(`control: at seed ${SEEDS[0]} a nudge of exactly 1 ${unity === NAMES.length ? `is the shipped run, to the last binary place of every size, the fill and the bulk fluid, and in every enclosure, for all ${NAMES.length} scenarios` : `IS NOT THE SHIPPED RUN for ${NAMES.length - unity} of ${NAMES.length} scenarios`}`);
}
