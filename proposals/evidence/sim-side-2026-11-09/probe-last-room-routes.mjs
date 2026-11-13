#!/usr/bin/env node
/**
 * probe-last-room-routes.mjs — the two tests of an enclosure that a zone from the cavity's last
 * room can decide, and what the growth loop hands out there
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the sixth note; §6, decision 7).
 *
 * probe-last-room.mjs counts the enclosures whose HOST layer was accepted in the last room: the
 * simulator's test of the host is a positive layer in that step (js/85c-simulator-state.ts:2466).
 * The same function asks two things of the GUEST's own zones: that it has three (:2562), and that
 * its last three add up to under 3 µm (:2563–2569, "slowing"). The crystal stores every zone the
 * loop hands it (js/27-geometry-crystal.ts:442), so a zone from the last room takes one of those
 * three places and an older, thicker zone leaves them. This probe reads, of every scenario as
 * shipped at seeds 42 / 1 / 2, in its own cavity or (--vug) at the vug setting of Simulation
 * mode's form:
 *   - every zone the loop accepts in the last room: its thickness, how far under 1 the loop's fill
 *     read, whether the cavity clamp had cut it, and whether the clamp cut it to exactly nothing
 *     (such a zone is stored too, :1022, unless the formula budget had capped it, :1009);
 *   - for every enclosure, the host's layer as probe-last-room.mjs reads it, and the guest's last
 *     three zones: how many of them are from the last room, and what the last three of its OTHER
 *     zones add up to. An enclosure is counted "by the guest's zones" when one or more of the
 *     guest's last three zones is from the last room and, those zones set aside, the guest has
 *     fewer than three zones or its last three add up to 3 µm or more. That is a reading of the
 *     shipped run's own zone lists; no run is made without the zones;
 *   - for every enclosure on a host layer under 10^-6 µm, the layer in units of the last binary
 *     place of the host's size in millimetres (the clamp works in millimetres, :958–975);
 *   - the nearest the loop's fill comes to 1 when it accepts a zone OUTSIDE the last room, to see
 *     whether the billionth that defines the last room here falls in a gap;
 *   - how many units of its last binary place under 1 the fill read at each zone in the last room.
 *     A zone accepted with the fill fewer than 100 units under 1 is called here a zone "on a
 *     residue of the fill", and the count of enclosures by the guest's zones is given a second
 *     time with only such zones set aside.
 *
 * "In the last room" is probe-last-room.mjs's reading, made with the same two wrappers: the loop's
 * fill, a return of _refreshVugFillAndSeal, read under 1 by a billionth or less when the zone went
 * through _applyZoneGrowthBudget (js/85-simulator.ts:1006). Each run is built by the game's
 * command runtime as the form builds it and stepped with run_step for the scenario's own length.
 *
 * The scenarios are run in child processes of this file (--one and the scenario's name), six at a
 * time, and their reports are printed in the order of the scenario list.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: for every enclosure, the guest's last three zones as summed here have to be the
 * guest_recent_growth_um on the simulator's receipt, and the host's positive zones of the step as
 * kept here have to add up to the receipt's layer; at seed 42 a run without the two wrappers has
 * to be the wrapped run to the last binary place; in each scenario's own cavity the seed-42 run is
 * compared with the committed baseline. The enclosure counts are to be the ones
 * probe-last-room.txt and probe-last-room-vug.txt print, scenario by scenario.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-last-room-routes.mjs
 *   node proposals/evidence/sim-side-2026-11-09/probe-last-room-routes.mjs --vug
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, SIM_VERSION, getSimulationTimeScale, startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm,
} = await harness.loadSimBundle({
  toolName: 'probe-last-room-routes',
  extraExports: ['getSimulationTimeScale', 'startSimulationCommandRuntime', 'makeSimulationStartCommand', 'resolveSizeClassToMm'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const AT_VUG = process.argv.includes('--vug');
const VUG_MM = resolveSizeClassToMm('vug');
const OVERRIDES = AT_VUG ? { wall: { size_class: 'vug', vug_diameter_mm: VUG_MM } } : {};      // what the form adds for that choice
const RESIDUE_UM = 1e-6;     // probe-last-room.mjs's test of a host layer
const LAST_ROOM = 1e-9;      // a zone accepted while the loop's fill reads under 1 by this or less
const SLOWING_UM = 3.0;      // the simulator's test of the guest's last three zones (js/85c-simulator-state.ts:2569)
const UNIT = 2 ** -53;       // one unit of the last binary place of a number just under 1
const NEAR_UNITS = 100;      // a zone accepted with the fill fewer than this many units under 1 is called "on a residue of the fill"
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const micron = (t) => (Math.abs(t) >= 0.01 ? `${t.toPrecision(4)} µm` : `${t.toExponential(2)} µm`);
const inLastRoom = (fill) => fill != null && fill < 1 && 1 - fill <= LAST_ROOM;
// one unit of the last binary place of x
const ulp = (x) => 2 ** (Math.floor(Math.log2(x)) - 52);
// the simulator's sum of a guest's last three zones (js/85c-simulator-state.ts:2563–2568), copied
const sum3 = (zones) => zones.slice(-3).reduce((sum, zone) => {
  const t = Number(zone?.thickness_um);
  if (!Number.isFinite(t)) return sum;
  if (t > 0 && zone?.is_phantom) return sum;
  return sum + t;
}, 0);

// One run as shipped. traced: the two wrappers are put on the simulator.
function run(name, seed, traced = true) {
  const runtime = startSimulationCommandRuntime(makeSimulationStartCommand(name, seed, OVERRIDES));
  const sim = runtime.sim;
  const accepted = [];            // every positive zone the loop accepts, as probe-last-room.mjs keeps it
  const tagged = new Map();       // the zone objects accepted in the last room, positive or cut to nothing
  let zeroOutside = 0;            // zones the clamp cut to nothing while the fill read further under 1
  let nearest = null;             // the smallest 1 − fill at which a positive zone was accepted outside the last room
  if (traced) {
    let last = null;
    const refresh = sim._refreshVugFillAndSeal, apply = sim._applyZoneGrowthBudget;
    const put = (key, value) => Object.defineProperty(sim, key, { value, writable: true, configurable: true, enumerable: false });
    put('_refreshVugFillAndSeal', function (...args) { const fill = refresh.apply(this, args); last = fill; return fill; });
    put('_applyZoneGrowthBudget', function (crystal, zone) {
      const fill = last, before = crystal.total_growth_um;
      const out = apply.call(this, crystal, zone);
      if (!zone || zone.is_phantom) return out;
      const cut = /cavity ceiling/.test(zone.note || '');
      const who = `${crystal.mineral} #${crystal.crystal_id}`;
      if (zone.thickness_um > 0) {
        accepted.push({ step: this.step, id: crystal.crystal_id, um: zone.thickness_um, fill, cut, before });
        if (inLastRoom(fill)) tagged.set(zone, { step: this.step, who, um: zone.thickness_um, under: 1 - fill, cut, before });
        else if (fill != null && fill < 1 && (nearest == null || 1 - fill < nearest.under)) nearest = { step: this.step, who, um: zone.thickness_um, under: 1 - fill, cut };
      } else if (Number(zone.thickness_um) === 0 && cut) {
        if (inLastRoom(fill)) tagged.set(zone, { step: this.step, who, um: 0, under: 1 - fill, cut, before });
        else zeroOutside++;
      }
      return out;
    });
  }
  const steps = runtime.scenarioData.defaultSteps ?? 100;
  const enclosures = [];
  let seen = 0, firstFull = null;
  for (let i = 0; i < steps; i++) {
    sim.run_step();
    if (firstFull == null && sim.get_vug_fill() >= 1 - 1e-9) firstFull = sim.step;
    const receipts = Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : [];
    for (; seen < receipts.length; seen++) {
      const r = receipts[seen];
      if (!r || r.event !== 'enclosed') continue;
      // the guest was made inactive by its enclosure (js/85c-simulator-state.ts:2689), so the loop
      // has handed it nothing since the test read its zones; the first control holds this
      const guest = sim.crystals.find(c => c.crystal_id === r.guest_crystal_id);
      const zones = Array.isArray(guest?.zones) ? guest.zones : [];
      const others = zones.filter(z => !tagged.has(z));
      // the same reading with only the zones accepted on a residue of the fill set aside
      const onResidue = (z) => tagged.has(z) && Math.round(tagged.get(z).under / UNIT) < NEAR_UNITS;
      const othersNear = zones.filter(z => !onResidue(z));
      const hostZones = accepted.filter(z => z.step === r.step && z.id === r.host_crystal_id);
      const layer = Number(r.host_same_step_positive_growth_um);
      enclosures.push({
        step: r.step, host: `${r.host_mineral} #${r.host_crystal_id}`, guest: `${r.guest_mineral} #${r.guest_crystal_id}`,
        layer, hostMm: Number(r.host_physical_size_at_enclosure_um) / 1000, guestMm: Number(r.guest_remaining_growth_um) / 1000,
        recent: sum3(zones), recentHeld: sum3(zones) === Number(r.guest_recent_growth_um),
        layerHeld: hostZones.length > 0 && hostZones.reduce((sum, z) => sum + z.um, 0) === layer,
        hostInLastRoom: hostZones.length > 0 && hostZones.every(z => inLastRoom(z.fill)),
        // the host's layer in units of the last binary place of its size in millimetres before the layer
        hostUnits: hostZones.length === 1 && hostZones[0].before > 0 ? layer / 1000 / ulp(hostZones[0].before / 1000) : null,
        hostUnder: hostZones.length === 1 ? 1 - hostZones[0].fill : null,
        inWindow: zones.slice(-3).filter(z => tagged.has(z)).length,
        zeroInWindow: zones.slice(-3).filter(z => tagged.has(z) && Number(z.thickness_um) === 0).length,
        fewer: others.length < 3, without: sum3(others),
        inWindowNear: zones.slice(-3).filter(onResidue).length, fewerNear: othersNear.length < 3, withoutNear: sum3(othersNear),
      });
    }
  }
  const stored = new Set(sim.crystals.flatMap(c => (Array.isArray(c.zones) ? c.zones : [])));
  const lastRoomZones = [...tagged.entries()].map(([zone, t]) => ({ ...t, stored: stored.has(zone) }));
  const sizes = sim.crystals.map(c => [`${c.mineral} #${c.crystal_id}`, c.total_growth_um]);
  const fluid = Object.entries(sim.conditions.fluid).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1));
  const key = enclosures.map(x => `${x.guest} by ${x.host} at step ${x.step} on ${x.layer}`).join('; ');
  return { steps, firstFull, enclosures, lastRoomZones, zeroOutside, nearest, summary: JSON.stringify(summarize(sim)), exact: JSON.stringify([sizes, sim.get_vug_fill(), fluid, key]) };
}
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
// An enclosure by the guest's zones (the header says what that is), and one on a residue of a host layer.
const byGuest = (x) => x.inWindow > 0 && (x.fewer || !(x.without < SLOWING_UM));
const byHost = (x) => x.layer < RESIDUE_UM;
// The same, counting only the guest's zones accepted on a residue of the fill.
const byGuestNear = (x) => x.inWindowNear > 0 && (x.fewerNear || !(x.withoutNear < SLOWING_UM));

// One scenario: the shipped run at the three seeds, and at the first seed a run without the wrappers.
function scenario(name) {
  const out = { name, untraced: false, reproduced: null, cells: [] };
  for (const seed of SEEDS) {
    const r = run(name, seed);
    if (seed === SEEDS[0]) {
      out.untraced = run(name, seed, false).exact === r.exact;
      if (!AT_VUG) out.reproduced = r.summary === JSON.stringify(BASELINE[name]);
    }
    out.cells.push({ seed, steps: r.steps, firstFull: r.firstFull, enclosures: r.enclosures, lastRoomZones: r.lastRoomZones, zeroOutside: r.zeroOutside, nearest: r.nearest });
  }
  return out;
}

if (process.argv.includes('--one')) {
  // One scenario, for the run below: its report, as one line of JSON.
  console.log('ONE ' + JSON.stringify(scenario(process.argv[process.argv.indexOf('--one') + 1])));
} else {
  const NAMES = Object.keys(SCENARIOS);
  const where = AT_VUG ? `at the vug setting of the form (${VUG_MM} mm)` : 'each in its own cavity';
  console.log(`probe-last-room-routes — SIM ${SIM_VERSION}; ${NAMES.length} scenarios as shipped, ${where}; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
  console.log(`each line gives the three seeds. A zone is "in the last room" when the loop accepted it while its fill read under 1 by ${LAST_ROOM} or less. "host" is an enclosure whose host layer of that step is under ${RESIDUE_UM} µm; "guest" one in which one or more of the guest's last three zones is from the last room and, those zones set aside, the guest has fewer than three zones or its last three add up to ${SLOWING_UM} µm or more`);
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

  const all = [], zones = [];          // every enclosure and every last-room zone, with its scenario and seed
  let untraced = 0, reproduced = 0, zeroOutside = 0;
  let nearest = null;
  for (const report of reports) {
    if (report.untraced) untraced++;
    if (report.reproduced) reproduced++;
    const cells = report.cells;
    for (const cell of cells) {
      for (const x of cell.enclosures) all.push({ name: report.name, seed: cell.seed, x });
      for (const z of cell.lastRoomZones) zones.push({ name: report.name, seed: cell.seed, z });
      zeroOutside += cell.zeroOutside;
      if (cell.nearest && (nearest == null || cell.nearest.under < nearest.z.under)) nearest = { name: report.name, seed: cell.seed, z: cell.nearest };
    }
    console.log(`  ${report.name.padEnd(36)} first 1 to a billionth at step ${each(cells, c => c.firstFull ?? '—')}; zones in the last room ${each(cells, c => c.lastRoomZones.length)}, of them cut to nothing ${each(cells, c => c.lastRoomZones.filter(z => z.um === 0).length)}; enclosures ${each(cells, c => c.enclosures.length)}, host ${each(cells, c => c.enclosures.filter(byHost).length)}, with a last-room zone among the guest's last three ${each(cells, c => c.enclosures.filter(x => x.inWindow > 0).length)}, guest ${each(cells, c => c.enclosures.filter(byGuest).length)}, host and guest ${each(cells, c => c.enclosures.filter(x => byHost(x) && byGuest(x)).length)}`);
  }

  const bySeed = (test) => each(SEEDS, seed => all.filter(e => e.seed === seed && test(e.x)).length);
  const total = (test) => all.filter(e => test(e.x)).length;
  const inScenarios = (test) => {
    const names = [...new Set(all.filter(e => test(e.x)).map(e => e.name))];
    return names.map(n => `${n} (${each(SEEDS, seed => all.filter(e => e.name === n && e.seed === seed && test(e.x)).length)})`).join(', ') || 'none';
  };
  const either = (x) => byHost(x) || byGuest(x), both = (x) => byHost(x) && byGuest(x);
  console.log(`\n${all.length} enclosures in the ${NAMES.length * SEEDS.length} runs (${bySeed(() => true)} at the three seeds)`);
  console.log(`  host — on a host layer under ${RESIDUE_UM} µm: ${total(byHost)} (${bySeed(byHost)}), in ${inScenarios(byHost)}`);
  console.log(`  with a last-room zone among the guest's last three: ${total(x => x.inWindow > 0)} (${bySeed(x => x.inWindow > 0)}), in ${inScenarios(x => x.inWindow > 0)}`);
  console.log(`  guest — and the guest passes the simulator's two tests of its zones only for those: ${total(byGuest)} (${bySeed(byGuest)}), in ${inScenarios(byGuest)}`);
  console.log(`  guest, counting only zones accepted with the fill fewer than ${NEAR_UNITS} units of its last binary place under 1: ${total(byGuestNear)} (${bySeed(byGuestNear)}), in ${inScenarios(byGuestNear)}; of the ${total(byGuest)} above, ${total(x => byGuest(x) && x.inWindowNear === x.inWindow)} have no other last-room zone among the guest's last three`);
  console.log(`  host and guest: ${total(both)} (${bySeed(both)}); host or guest: ${total(either)} (${bySeed(either)}), in ${inScenarios(either)}`);
  const guestOnly = all.filter(e => byGuest(e.x) && !byHost(e.x));
  console.log(`  guest and not host: ${guestOnly.length}${guestOnly.length ? `, on host layers from ${micron(Math.min(...guestOnly.map(e => e.x.layer)))} to ${micron(Math.max(...guestOnly.map(e => e.x.layer)))}; ${guestOnly.filter(e => e.x.hostInLastRoom).length} of those layers were themselves accepted in the last room` : ''}`);

  const guests = all.filter(e => byGuest(e.x));
  console.log(`\nthe ${guests.length} enclosures by the guest's zones:`);
  for (const { name, seed, x } of guests) {
    console.log(`  ${name}, seed ${seed}, step ${x.step}: ${x.host} (its layer of the step ${micron(x.layer)}${byHost(x) ? ', a residue' : ''}) encloses ${x.guest} (${x.guestMm.toFixed(3)} mm): ${x.inWindow} of its last three zones ${x.inWindow === 1 ? 'is' : 'are'} from the last room${x.zeroInWindow ? ` (${x.zeroInWindow} of zero thickness)` : ''}${x.inWindowNear < x.inWindow ? ` (${x.inWindow - x.inWindowNear} accepted ${NEAR_UNITS} units or more under 1)` : ''}; the three add up to ${micron(x.recent)}; ${x.fewer ? 'without the last-room zones it has fewer than three zones' : `the last three of its other zones add up to ${micron(x.without)}`}`);
  }

  const residues = all.filter(e => byHost(e.x));
  const units = (e) => (e.x.hostUnits == null ? null : Math.round(e.x.hostUnits * 1000) / 1000);
  const tally = {};
  for (const e of residues) { const u = units(e); tally[u == null ? 'not one zone' : u] = (tally[u == null ? 'not one zone' : u] || 0) + 1; }
  console.log(`\nthe ${residues.length} enclosures on a host layer under ${RESIDUE_UM} µm, the layer in units of the last binary place of the host's size in millimetres before it — ${Object.keys(tally).sort((a, b) => Number(a) - Number(b)).map(k => `${k}: ${tally[k]}`).join('; ') || 'none'}`);
  for (const { name, seed, x } of residues) {
    console.log(`  ${name}, seed ${seed}, step ${x.step}: ${x.host} (${x.hostMm.toFixed(2)} mm) encloses ${x.guest} on ${micron(x.layer)}, ${x.hostUnits == null ? 'not one zone' : `${x.hostUnits.toFixed(3)} units`}; the fill read ${x.hostUnder == null ? '—' : `${Math.round(x.hostUnder / UNIT)} unit${Math.round(x.hostUnder / UNIT) === 1 ? '' : 's'} under 1`}`);
  }

  const positive = zones.filter(e => e.z.um > 0), nothing = zones.filter(e => e.z.um === 0);
  const BINS = [[1e-9, 'under 1e-9'], [1e-6, '1e-9 to 1e-6'], [1e-3, '1e-6 to 0.001'], [0.1, '0.001 to 0.1'], [1, '0.1 to 1'], [Infinity, '1 or more']];
  const UNITS = [[3, '1 or 2'], [10, '3 to 9'], [100, '10 to 99'], [Infinity, '100 or more']];
  const spectrum = (list, bins, value) => bins.map(([edge, text], i) => `${text}: ${list.filter(e => value(e) < edge && (i === 0 || value(e) >= bins[i - 1][0])).length}`).join('; ');
  console.log(`\n${zones.length} zones accepted in the last room in the ${NAMES.length * SEEDS.length} runs: ${positive.length} positive, ${nothing.length} cut to exactly nothing by the clamp; ${zones.filter(e => e.z.stored).length} of the ${zones.length} are in a crystal's zone list at the end (${nothing.filter(e => e.z.stored).length} of the ${nothing.length} cut to nothing); the clamp had cut ${zones.filter(e => e.z.cut).length}`);
  console.log(`  the positive ones, µm — ${spectrum(positive, BINS, e => e.z.um)}`);
  if (positive.length) {
    const thin = positive.reduce((a, b) => (b.z.um < a.z.um ? b : a)), thick = positive.reduce((a, b) => (b.z.um > a.z.um ? b : a));
    const was = (z) => (z.before > 0 ? `${micron(z.before)} before` : 'a crystal with no size before');
    console.log(`  thinnest ${micron(thin.z.um)} (${thin.name}, seed ${thin.seed}, step ${thin.z.step}, ${thin.z.who}, ${was(thin.z)}); thickest ${micron(thick.z.um)} (${thick.name}, seed ${thick.seed}, step ${thick.z.step}, ${thick.z.who}, ${was(thick.z)})`);
  }
  console.log(`  how far under 1 the fill read when each of the ${zones.length} was accepted, in units of the last binary place (${UNIT.toExponential(2)}) — ${spectrum(zones, UNITS, e => Math.round(e.z.under / UNIT))}`);
  if (zones.length) {
    const far = zones.reduce((a, b) => (b.z.under > a.z.under ? b : a));
    console.log(`  the furthest under 1: ${Math.round(far.z.under / UNIT)} units, 1 − ${far.z.under.toExponential(2)} (${far.name}, seed ${far.seed}, step ${far.z.step}, ${far.z.who}, a zone of ${micron(far.z.um)})`);
    const unitsOf = (e) => Math.round(e.z.under / UNIT);
    const residue = zones.filter(e => unitsOf(e) < NEAR_UNITS), beyond = zones.filter(e => unitsOf(e) >= NEAR_UNITS);
    const span = (list) => { const um = list.map(e => e.z.um).filter(t => t > 0); return um.length ? `${micron(Math.min(...um))} to ${micron(Math.max(...um))}` : 'none positive'; };
    const thickest = (list) => { const e = list.reduce((a, b) => (b.z.um > a.z.um ? b : a)); return `the thickest on ${e.z.who}, ${e.z.before > 0 ? `${micron(e.z.before)} before` : 'a crystal with no size before'}, in ${e.name} at seed ${e.seed}`; };
    console.log(`  the ${residue.length} accepted fewer than ${NEAR_UNITS} units under 1: the fill read 1 to ${Math.max(...residue.map(unitsOf))} units under 1; ${residue.filter(e => e.z.um === 0).length} of them were cut to nothing, and the positive zones are ${span(residue)} (${thickest(residue)})`);
    if (beyond.length) {
      const close = beyond.reduce((a, b) => (b.z.under < a.z.under ? b : a));
      const names = [...new Set(beyond.map(e => e.name))];
      console.log(`  the ${beyond.length} accepted ${NEAR_UNITS} units or more under 1: the nearest of them to 1 read 1 − ${close.z.under.toExponential(2)} (${unitsOf(close)} units; ${close.name}, seed ${close.seed}, step ${close.z.step}, ${close.z.who}); ${beyond.filter(e => e.z.um === 0).length} of them were cut to nothing, and the positive zones are ${span(beyond)}; in ${names.map(n => `${n} (${each(SEEDS, seed => beyond.filter(e => e.name === n && e.seed === seed).length)})`).join(', ')}`);
    }
  }
  console.log(`  outside the last room: the nearest the fill came to 1 when the loop accepted a positive zone is ${nearest ? `1 − ${nearest.z.under.toExponential(2)} (${nearest.name}, seed ${nearest.seed}, step ${nearest.z.step}, ${nearest.z.who}, a zone of ${micron(nearest.z.um)}${nearest.z.cut ? ', cut by the clamp' : ''})` : '— (no such zone)'}; zones the clamp cut to exactly nothing outside the last room: ${zeroOutside}`);

  const recentHeld = all.filter(e => e.x.recentHeld).length, layerHeld = all.filter(e => e.x.layerHeld).length;
  console.log(`\ncontrol: the guest's last three zones, as this probe sums them at the end of the step, are the guest_recent_growth_um on the simulator's receipt in ${recentHeld} of ${all.length} enclosures${recentHeld === all.length ? '' : ' — THE GUEST\'S ZONES ARE NOT THE ONES THE TEST READ'}`);
  console.log(`control: the host's positive zones of the step, as this probe keeps them, add up to the layer on the simulator's receipt in ${layerHeld} of ${all.length} enclosures${layerHeld === all.length ? '' : ' — THE KEPT ZONES ARE NOT THE RECEIPT\'S LAYER'}`);
  console.log(`control: at seed ${SEEDS[0]} a run without the two wrappers ${untraced === NAMES.length ? `is the wrapped run, to the last binary place of every size, the fill, the bulk fluid and every enclosure's layer, for all ${NAMES.length} scenarios` : `IS NOT THE WRAPPED RUN for ${NAMES.length - untraced} of ${NAMES.length} scenarios`}`);
  if (!AT_VUG) console.log(`control: at seed ${SEEDS[0]} the run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}`);
}
