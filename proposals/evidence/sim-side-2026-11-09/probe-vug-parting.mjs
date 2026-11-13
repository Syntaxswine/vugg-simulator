#!/usr/bin/env node
/**
 * probe-vug-parting.mjs — where a nudged run parts from the shipped run at the vug setting of
 * Simulation mode's form, what differs there, and by how much the two end apart
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.4, the sixth note).
 *
 * probe-last-room.mjs --vug finds nine scenarios in which one of four nudges of every growth
 * engine's positive zones moves the shipped run at that setting, and prints what kind of thing
 * differs at the end. This probe makes those nine scenarios' runs again, at seeds 42 / 1 / 2 under
 * the same four factors, keeps every crystal at every step, and prints for each nudged run that
 * differs:
 *   - the first step at which some crystal's size differs by more than a billionth of itself, or
 *     its active flag or its host differs, or the two runs hold other crystals ("the parting");
 *   - the step at which the shipped run's pocket first reads full (a fill of 1 to a billionth
 *     after the step), to see whether the parting comes before it;
 *   - what differs at the parting step. When it is an enclosure (a crystal has a host in one run
 *     and none, or another, in the other), the simulator's receipt in the run that has it is read
 *     as probe-last-room-routes.mjs reads it: "host" when the host's layer of that step was
 *     accepted in the last room; "guest" when one or more of the guest's last three zones is from
 *     the last room and, those set aside, the guest has fewer than three zones or its last three
 *     add up to 3 µm or more; otherwise "neither";
 *   - the calls the growth loop made on a zone at the parting step (its _applyZoneGrowthBudget,
 *     js/85-simulator.ts:1006) that differ between the two runs: a call differs when the other run
 *     has no call for that crystal at that step, or the thickness the zone is stored with differs
 *     by more than a billionth of itself. Counted: how many of them were made with the loop's fill
 *     under 1 by a billionth or less ("in the last room"), and what the others are;
 *   - at the end, among the crystals the two runs SHARE, how many differ and the largest
 *     difference in size; how many crystals of each run have no counterpart in the other; the
 *     mineral whose largest crystal differs most between the two runs; and the minerals that have
 *     solid left in one run alone. Two runs share a crystal
 *     when it carries the same number in both and was born as the same mineral, at the same step,
 *     in the same place (position and wall anchor). A number alone does not pair two crystals:
 *     once the runs have parted they number their crystals apart, and one number can name two
 *     different crystals.
 * For each shipped run whose pocket reads full it also prints whether the first full step has a
 * zone accepted in the last room, and how many of the steps after it have one: the rates against
 * which the partings are to be read.
 *
 * The scenarios are run in child processes of this file (--one and the scenario's name), six at a
 * time, and their reports are printed in a fixed order.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: at seed 42 a nudge of exactly 1 has to be the shipped run at every step. For every run
 * that parts, every crystal the two runs held before the parting step, when they were still alike,
 * has to be one they share by the test above. In the shipped runs the guest's last three zones as
 * summed here have to be the figure on the simulator's receipt for every enclosure.
 * The runs that differ are to be the ones probe-last-room-vug.txt lists: this
 * probe prints the count for each scenario and seed in that probe's form, for the two outputs to
 * be held together. (At that setting there is no baseline to compare with; probe-last-room.mjs's
 * default mode, which builds its runs the same way but for the form's override, reproduces it.)
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
const SLOWING_UM = 3.0;      // the simulator's test of the guest's last three zones (js/85c-simulator-state.ts:2569)
const UNIT = 2 ** -53;       // one unit of the last binary place of a number just under 1
const NUDGES = [1 - 1.1102230246251565e-16, 1 - 1e-14, 1 + 1e-13, 1 - 1e-13];
const JOBS = 6;
const each = (list, f) => list.map(f).join(' / ');
const label = (x) => (x > 1 ? `1 + ${(x - 1).toExponential(1)}` : `1 − ${(1 - x).toExponential(1)}`);
const size = (um) => (Math.abs(um) >= 0.01 ? um.toPrecision(4) : um.toExponential(1));
const inLastRoom = (fill) => fill != null && fill < 1 && 1 - fill <= LAST_ROOM;
// the simulator's sum of a guest's last three zones (js/85c-simulator-state.ts:2563–2568), copied
const sum3 = (zones) => zones.slice(-3).reduce((sum, zone) => {
  const t = Number(zone?.thickness_um);
  if (!Number.isFinite(t)) return sum;
  if (t > 0 && zone?.is_phantom) return sum;
  return sum + t;
}, 0);

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
    const calls = {};                         // by step: the loop's calls on a positive zone, or on one the clamp cut to nothing
    const tagged = new Set();                 // the zone objects accepted in the last room
    let last = null;
    const refresh = sim._refreshVugFillAndSeal, apply = sim._applyZoneGrowthBudget;
    const put = (key, value) => Object.defineProperty(sim, key, { value, writable: true, configurable: true, enumerable: false });
    put('_refreshVugFillAndSeal', function (...args) { const fill = refresh.apply(this, args); last = fill; return fill; });
    put('_applyZoneGrowthBudget', function (crystal, zone) {
      const fill = last;
      const out = apply.call(this, crystal, zone);
      if (!zone || zone.is_phantom) return out;
      const cut = /cavity ceiling/.test(zone.note || '');
      if (zone.thickness_um > 0 || (Number(zone.thickness_um) === 0 && cut)) {
        const lastRoom = inLastRoom(fill);
        if (lastRoom) tagged.add(zone);
        (calls[this.step] ||= []).push({ id: crystal.crystal_id, who: `${crystal.mineral} #${crystal.crystal_id}`, um: Number(zone.thickness_um), under: fill == null ? null : 1 - fill, cut, lastRoom,
          units: lastRoom ? Math.round((1 - fill) / UNIT) : null });
      }
      return out;
    });
    const steps = runtime.scenarioData.defaultSteps ?? 100;
    const history = [], enclosed = {};        // enclosed: by step, the simulator's receipts of that step as read here
    const births = new Map();                 // by crystal id: what the crystal was born as (the end of the step it first appears in)
    let firstFull = null, seen = 0;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (firstFull == null && fill >= 1 - 1e-9) firstFull = sim.step;
      for (const c of sim.crystals) {
        if (!births.has(c.crystal_id)) births.set(c.crystal_id, [c.crystal_id, c.mineral, c.nucleation_step, c.position, c.wall_anchor ? `${c.wall_anchor.phi},${c.wall_anchor.theta}` : ''].join('|'));
      }
      history.push({ step: sim.step, fill, crystals: sim.crystals.map(c => ({ id: c.crystal_id, mineral: c.mineral, who: `${c.mineral} #${c.crystal_id}`, um: c.total_growth_um, active: c.active, by: c.enclosed_by ?? null,
        inWindow: (Array.isArray(c.zones) ? c.zones : []).slice(-3).filter(z => tagged.has(z)).length })) });
      const receipts = Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : [];
      for (; seen < receipts.length; seen++) {
        const r = receipts[seen];
        if (!r || r.event !== 'enclosed') continue;
        const guest = sim.crystals.find(c => c.crystal_id === r.guest_crystal_id);
        const zones = Array.isArray(guest?.zones) ? guest.zones : [];
        const others = zones.filter(z => !tagged.has(z));
        const hostCalls = (calls[r.step] || []).filter(z => z.id === r.host_crystal_id && z.um > 0);
        (enclosed[r.step] ||= []).push({ guest: r.guest_crystal_id, host: r.host_crystal_id, layer: Number(r.host_same_step_positive_growth_um),
          byHost: hostCalls.length > 0 && hostCalls.every(z => z.lastRoom),
          byGuest: zones.slice(-3).some(z => tagged.has(z)) && (others.length < 3 || !(sum3(others) < SLOWING_UM)),
          recentHeld: sum3(zones) === Number(r.guest_recent_growth_um) });
      }
    }
    return { sim, steps, firstFull, history, calls, enclosed, births, summary: JSON.stringify(summarize(sim)) };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const near = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const differs = (x, y) => x.who !== y.who || !near(x.um, y.um) || x.active !== y.active || x.by !== y.by;
// The crystals whose calls at one step differ between two runs (the header says when a call
// differs), each with its calls of that step in both runs.
function callsApart(A, B, step) {
  const group = (list) => { const m = new Map(); for (const c of list || []) (m.get(c.id) || m.set(c.id, []).get(c.id)).push(c); return m; };
  const a = group(A.calls[step]), b = group(B.calls[step]);
  const out = [];
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(id) || [], y = b.get(id) || [];
    if (x.length === y.length && x.every((c, i) => near(c.um, y[i].um))) continue;
    out.push({ id, calls: [...x, ...y] });
  }
  return out;
}
// Where a nudged run B parts from the shipped run A, what differs there, and how far apart the
// two end. null when no crystal differs at any step.
function parting(A, B) {
  for (let i = 0; i < A.history.length; i++) {
    const a = A.history[i].crystals, b = B.history[i].crystals;
    const other = a.length !== b.length;
    const apart = a.slice(0, Math.min(a.length, b.length)).map((x, j) => ({ x, y: b[j] })).filter(({ x, y }) => differs(x, y));
    if (!other && !apart.length) continue;
    const step = A.history[i].step;
    const worst = apart.slice().sort((p, q) => Math.abs(q.x.um - q.y.um) - Math.abs(p.x.um - p.y.um))[0];
    // what differs: an enclosure, read in the run that has it
    const hosted = apart.filter(({ x, y }) => x.by !== y.by);
    let byHost = false, byGuest = false, unread = 0, otherWindow = false;
    for (const { x, y } of hosted) {
      for (const [R, c, o] of [[A, x, y], [B, y, x]]) {
        if (c.by == null) { if (c.inWindow > 0) otherWindow = true; continue; }
        const receipt = (R.enclosed[step] || []).find(e => e.guest === c.id && e.host === c.by);
        if (!receipt) { if (o.by !== c.by) unread++; continue; }
        if (receipt.byHost) byHost = true;
        if (receipt.byGuest) byGuest = true;
      }
    }
    const what = !hosted.length ? (apart.some(({ x, y }) => x.active !== y.active) ? 'flag' : (apart.length ? 'size' : 'other'))
      : byHost && byGuest ? 'host and guest' : byHost ? 'host' : byGuest ? 'guest' : 'neither';
    // for an enclosure that is neither: where the crystal was born, and what became at that step
    // of the crystals whose calls differ (their host in each run, and whether that step enclosed them)
    const gotNow = (R, id) => (R.enclosed[step] || []).some(e => e.guest === id);
    // the distance between two crystals' anchors on the wall, as the simulator measures it for an
    // enclosure (js/85c-simulator-state.ts:2542); anchors are fixed when a crystal is born
    const apartMm = (i, j) => {
      const find = (id) => A.sim.crystals.find(c => c.crystal_id === id);
      const p = find(i) && A.sim.wall_state._resolveAnchor(find(i)), q = find(j) && A.sim.wall_state._resolveAnchor(find(j));
      return p && q ? `${A.sim.wall_state.anchorDistanceMm(p, q).toFixed(2)} mm` : 'no anchor';
    };
    const detail = what !== 'neither' ? null : {
      born: hosted.map(({ x, y }) => `${x.who} was born at "${String(A.births.get(x.id)).split('|')[3]}"${(x.by ?? y.by) != null ? `, ${apartMm(x.id, x.by ?? y.by)} by the wall's anchors from the host it has in one run` : ''}`),
      callers: callsApart(A, B, step).map(c => {
        const x = a.find(k => k.id === c.id), y = b.find(k => k.id === c.id);
        return `${(x || y).who}: host ${x?.by ?? 'none'} against ${y?.by ?? 'none'}, enclosed at that step ${gotNow(A, c.id) ? 'yes' : 'no'} against ${gotNow(B, c.id) ? 'yes' : 'no'}${hosted.map(({ x: g }) => `, ${apartMm(c.id, g.id)} from ${g.who}`).join('')}`;
      }),
    };
    // the crystals whose calls differ at that step, and the calls among them made outside the last room
    const callList = callsApart(A, B, step);
    const outside = callList.flatMap(c => c.calls).filter(c => !c.lastRoom).sort((p, q) => (q.under ?? 0) - (p.under ?? 0));
    // the end: the crystals the two runs share (the same number, born as the same mineral at the
    // same step in the same place), and the rest by mineral
    const endA = A.history.at(-1).crystals, endB = B.history.at(-1).crystals;
    const inB = new Map(endB.map(c => [c.id, c]));
    const pairs = endA.filter(x => inB.has(x.id) && A.births.get(x.id) === B.births.get(x.id)).map(x => ({ x, y: inB.get(x.id) }));
    const before = i > 0 ? A.history[i - 1].crystals : [];
    const end = pairs.filter(({ x, y }) => differs(x, y)).sort((p, q) => Math.abs(q.y.um - q.x.um) - Math.abs(p.y.um - p.x.um));
    const largest = (crystals) => { const m = {}; for (const c of crystals) if (!(c.um <= m[c.mineral])) m[c.mineral] = c.um; return m; };
    const mA = largest(endA), mB = largest(endB);
    const minerals = [...new Set([...Object.keys(mA), ...Object.keys(mB)])].map(k => ({ mineral: k, a: mA[k] ?? null, b: mB[k] ?? null, apart: Math.abs((mA[k] ?? 0) - (mB[k] ?? 0)) }))
      .filter(m => m.a == null || m.b == null || !near(m.a, m.b)).sort((p, q) => q.apart - p.apart);
    // the minerals with solid left in one run and in no crystal of the other (presence as
    // tools/sim-side-ab.mjs reads it), each with its largest crystal in the run that has it
    const solid = (m) => Object.keys(m).filter(k => m[k] > 0);
    const alone = (m, other) => solid(m).filter(k => !(other[k] > 0)).sort().map(k => `${k} (${size(m[k])} µm)`);
    return { step, other, differing: apart.length, at: worst ? { who: worst.x.who, a: worst.x.um, b: worst.y.um, flag: worst.x.active !== worst.y.active || worst.x.by !== worst.y.by } : null,
      what, hosted: hosted.map(({ x, y }) => `${x.who}: host ${x.by ?? 'none'} against ${y.by ?? 'none'}`), unread, otherWindow, detail,
      calls: callList.length, callsLastRoom: callList.filter(c => c.calls.every(z => z.lastRoom)).length, callsNothing: callList.filter(c => c.calls.some(z => z.um === 0)).length,
      callOutside: outside[0] ? { who: outside[0].who, um: outside[0].um, under: outside[0].under, cut: outside[0].cut } : null,
      // the furthest under 1 the fill read at any call that differs and was made in the last room, in units
      callsUnits: Math.max(0, ...callList.flatMap(c => c.calls).filter(c => c.lastRoom).map(c => c.units)),
      lastA: (A.calls[step] || []).filter(c => c.lastRoom).length, lastB: (B.calls[step] || []).filter(c => c.lastRoom).length,
      shared: pairs.length, sharedHeld: before.every(c => A.births.get(c.id) === B.births.get(c.id) && inB.has(c.id)), endDiffering: end.length,
      endWorst: end[0] ? { whoA: end[0].x.who, whoB: end[0].y.who, a: end[0].x.um, b: end[0].y.um } : null,
      aloneA: endA.length - pairs.length, aloneB: endB.length - pairs.length,
      mineral: minerals[0] || null, solidA: alone(mA, mB), solidB: alone(mB, mA),
      sameFull: A.firstFull === B.firstFull, summary: A.summary !== B.summary };
  }
  return null;
}
// One scenario: the shipped run at the three seeds, each with its four nudged runs.
function scenario(name) {
  const out = { name, unity: false, cells: [] };
  for (const seed of SEEDS) {
    const base = run(name, seed);
    if (seed === SEEDS[0]) out.unity = parting(base, run(name, seed, 1)) == null;
    // how common the last room is in the shipped run: whether the first full step has a zone
    // accepted there, and how many of the steps after it have one
    const from = base.firstFull;
    const has = (step) => (base.calls[step] || []).some(c => c.lastRoom);
    const after = from == null ? [] : base.history.map(h => h.step).filter(step => step > from);
    const nudged = NUDGES.map(nudge => { const r = run(name, seed, nudge); return { nudge, p: parting(base, r), sameFull: r.firstFull === base.firstFull }; });
    out.cells.push({ seed, steps: base.steps, firstFull: from, atFull: from == null ? null : has(from), stepsAfter: after.length, stepsAfterLastRoom: after.filter(has).length,
      // for each parting, whether the SHIPPED run has a zone accepted in the last room at that step
      runs: nudged.map(({ nudge, p, sameFull }) => ({ nudge, p, sameFull, shippedHas: p ? has(p.step) : null })),
      recentHeld: Object.values(base.enclosed).flat().every(e => e.recentHeld) });
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

  const WHAT = { size: 'a crystal\'s size alone', flag: 'a crystal\'s active flag', other: 'the runs hold other crystals', host: 'an enclosure, host', guest: 'an enclosure, guest', 'host and guest': 'an enclosure, host and guest', neither: 'an enclosure, neither' };
  let runs = 0, parted = 0, unity = 0, sameFull = 0;
  const all = [];
  for (const report of reports) {
    if (report.unity) unity++;
    console.log(`\n${report.name}: ${report.cells[0].steps} steps; the shipped run's pocket first reads full at step ${each(report.cells, c => c.firstFull ?? '—')}; a zone accepted in the last room at that step ${each(report.cells, c => (c.atFull == null ? '—' : c.atFull ? 'yes' : 'no'))}; steps after it ${each(report.cells, c => c.stepsAfter)}, of them with a zone accepted in the last room ${each(report.cells, c => c.stepsAfterLastRoom)}; nudged runs that part ${each(report.cells, c => c.runs.filter(r => r.p).length)}`);
    for (const cell of report.cells) {
      for (const { nudge, p, sameFull: same, shippedHas } of cell.runs) {
        runs++;
        if (same) sameFull++;
        if (!p) continue;
        parted++;
        const when = cell.firstFull == null ? 'the pocket never reads full' : p.step < cell.firstFull ? `BEFORE the pocket first reads full, at step ${cell.firstFull}` : p.step === cell.firstFull ? 'the step at which the pocket first reads full' : `${p.step - cell.firstFull} steps after the pocket first reads full`;
        const atStep = `${p.differing} crystal${p.differing === 1 ? ' differs' : 's differ'}${p.other ? ' and the runs hold other crystals' : ''}${p.at ? `, most ${p.at.who} (${size(p.at.a)} against ${size(p.at.b)} µm${p.at.flag ? ', and its active flag or host' : ''})` : ''}`;
        const whatText = `${WHAT[p.what]}${p.hosted.length ? ` (${p.hosted.join('; ')}${p.what === 'neither' && p.otherWindow ? '; in the run without it the crystal has a last-room zone among its last three' : ''}${p.unread ? `; ${p.unread} not read: no receipt of that step` : ''}${p.detail ? `; ${p.detail.born.join('; ')}; the crystals whose calls differ — ${p.detail.callers.join('; ') || 'none'}` : ''})` : ''}`;
        const callText = `the loop's calls differ at that step for ${p.calls} crystal${p.calls === 1 ? '' : 's'}, for ${p.callsLastRoom} of them in the last room alone${p.callsNothing ? ` (for ${p.callsNothing} a zone cut to nothing)` : ''}${p.callOutside ? `; outside it ${p.callOutside.who}, ${size(p.callOutside.um)} µm accepted at a fill of 1 − ${p.callOutside.under == null ? '?' : p.callOutside.under.toExponential(2)}${p.callOutside.cut ? ', cut by the clamp' : ''}` : ''}`;
        const endShared = p.endDiffering ? `${p.endDiffering} of the ${p.shared} crystals the two runs share differ${p.endDiffering === 1 ? 's' : ''}, most ${p.endWorst.whoA}${p.endWorst.whoB === p.endWorst.whoA ? '' : ` (in the nudged run ${p.endWorst.whoB})`} (${size(p.endWorst.a)} against ${size(p.endWorst.b)} µm, ${size(Math.abs(p.endWorst.a - p.endWorst.b))} µm apart)` : `none of the ${p.shared} crystals the two runs share differs`;
        const endMineral = (p.mineral ? `; the mineral whose largest crystal differs most is ${p.mineral.mineral} (${p.mineral.a == null ? 'none' : size(p.mineral.a)} against ${p.mineral.b == null ? 'none' : size(p.mineral.b)} µm)` : '; no mineral\'s largest crystal differs')
          + (p.solidA.length || p.solidB.length ? `; with solid in the shipped run alone ${p.solidA.join(', ') || 'no mineral'}, in the nudged run alone ${p.solidB.join(', ') || 'no mineral'}` : '');
        console.log(`  seed ${cell.seed}, × (${label(nudge)}): parts at step ${p.step}, ${when}; ${atStep}; what differs: ${whatText}; ${callText}; zones accepted in the last room at that step ${p.lastA} against ${p.lastB}; at the end ${endShared}; crystals with no counterpart in the other run ${p.aloneA} against ${p.aloneB}${endMineral}; the summary ${p.summary ? 'DIFFERS' : 'is the same'}`);
        all.push({ name: report.name, seed: cell.seed, firstFull: cell.firstFull, p, shippedHas });
      }
    }
  }
  const full = all.filter(e => e.firstFull != null);
  const count = (list, test) => list.filter(test).length;
  console.log(`\n${parted} of ${runs} nudged runs part from the shipped run; ${full.length} of them in a pocket that reads full in the shipped run`);
  console.log(`  of those ${full.length}: ${count(full, e => e.p.step < e.firstFull)} part before the step at which the pocket first reads full, ${count(full, e => e.p.step === e.firstFull)} at that step and ${count(full, e => e.p.step > e.firstFull)} after it`);
  {
    // the rates: how common a zone in the last room is in the shipped runs, at the first full step and after it
    const cells = reports.flatMap(r => r.cells).filter(c => c.firstFull != null);
    const sum = (f) => cells.reduce((n, c) => n + f(c), 0);
    const at = full.filter(e => e.p.step === e.firstFull), later = full.filter(e => e.p.step > e.firstFull);
    console.log(`  the ${at.length} at that step: the shipped run has a zone accepted in the last room at it in ${count(at, e => e.shippedHas)}, and one run or the other in ${count(at, e => e.p.lastA + e.p.lastB > 0)}; of the ${cells.length} shipped runs whose pocket reads full, ${count(cells, c => c.atFull)} have such a zone at their first full step`);
    console.log(`  the ${later.length} after it: the shipped run has a zone accepted in the last room at the parting step in ${count(later, e => e.shippedHas)}, and one run or the other in ${count(later, e => e.p.lastA + e.p.lastB > 0)}; of the ${sum(c => c.stepsAfter)} steps after the first full one in those ${cells.length} shipped runs, ${sum(c => c.stepsAfterLastRoom)} have such a zone`);
  }
  console.log(`  of those ${full.length}, what differs at the parting step — ${['size', 'flag', 'other', 'host', 'guest', 'host and guest', 'neither'].map(k => `${WHAT[k]}: ${count(full, e => e.p.what === k)}`).join('; ')}`);
  console.log(`  of those ${full.length}: every call of the loop that differs at the parting step, in either run, was made in the last room in ${count(full, e => e.p.calls > 0 && e.p.callsLastRoom === e.p.calls)} (a zone cut to nothing among them in ${count(full, e => e.p.calls > 0 && e.p.callsLastRoom === e.p.calls && e.p.callsNothing > 0)}); some call that differs was made outside it in ${count(full, e => e.p.callsLastRoom < e.p.calls)}; no call differs in ${count(full, e => e.p.calls === 0)}`);
  console.log(`  of those ${full.length}: the furthest under 1 the loop's fill read at any call that differs at the parting step and was made in the last room is ${Math.max(0, ...full.map(e => e.p.callsUnits))} units of its last binary place; it is 1 or 2 units in ${count(full, e => e.p.callsUnits >= 1 && e.p.callsUnits <= 2)}, 3 to 9 in ${count(full, e => e.p.callsUnits >= 3 && e.p.callsUnits <= 9)} and 10 or more in ${count(full, e => e.p.callsUnits >= 10)}`);
  console.log(`  the step at which the pocket first reads full is the shipped run's in ${sameFull} of the ${runs} nudged runs`);
  // a difference is banded as it is printed, to four significant digits, so that a difference of
  // 100.0 µm is counted at 100 or more whatever its further digits are
  const bands = [[1e-3, 'under 0.001'], [1, '0.001 to 1'], [100, '1 to 100'], [Infinity, '100 or more']];
  const printed = (um) => Number(um.toPrecision(4));
  const banded = (list, value) => bands.map(([edge, text], i) => `${text}: ${count(list, e => printed(value(e)) < edge && (i === 0 || printed(value(e)) >= bands[i - 1][0]))}`).join('; ');
  const sharedApart = (e) => (e.p.endWorst ? Math.abs(e.p.endWorst.a - e.p.endWorst.b) : 0);
  const ended = all.filter(e => e.p.endDiffering > 0), byMineral = all.filter(e => e.p.mineral);
  console.log(`  of the ${all.length} that part, ${all.length - ended.length} end with none of the crystals the two runs share differing; in the other ${ended.length} the largest difference in such a crystal's size at the end, µm — ${banded(ended, sharedApart)}`);
  console.log(`  of the ${all.length} that part, ${all.length - byMineral.length} end with every mineral's largest crystal the same; in the other ${byMineral.length} the largest difference in a mineral's largest crystal, µm — ${banded(byMineral, e => e.p.mineral.apart)}; a crystal of one run has no counterpart in the other in ${count(all, e => e.p.aloneA + e.p.aloneB > 0)}; a mineral has solid in one run alone in ${count(all, e => e.p.solidA.length + e.p.solidB.length > 0)}; the summary differs in ${count(all, e => e.p.summary)}`);
  console.log(`  by scenario, the runs that end with a shared crystal differing at seeds ${SEEDS.join(' / ')}: ${reports.map(r => `${r.name} ${each(r.cells, c => c.runs.filter(x => x.p && x.p.endDiffering > 0).length)}`).join('; ')}`);
  console.log(`  by scenario, the runs that part at seeds ${SEEDS.join(' / ')}: ${reports.map(r => `${r.name} ${each(r.cells, c => c.runs.filter(x => x.p).length)}`).join('; ')}`);
  const held = count(all, e => e.p.sharedHeld), recent = count(reports.flatMap(r => r.cells), c => c.recentHeld);
  console.log(`control: at seed ${SEEDS[0]} a nudge of exactly 1 ${unity === NAMES.length ? `is the shipped run at every step, in every crystal's size, active flag and host, for the ${NAMES.length} scenarios` : `IS NOT THE SHIPPED RUN for ${NAMES.length - unity} of ${NAMES.length} scenarios`}`);
  console.log(`control: every crystal the runs held before the parting step, when they were still alike, is one the two runs share by that test in ${held} of the ${all.length} runs that part${held === all.length ? '' : ' — THE PAIRING TEST DOES NOT HOLD FOR CRYSTALS KNOWN TO BE THE SAME'}`);
  console.log(`control: in the shipped runs, the guest's last three zones as summed here are the guest_recent_growth_um on the simulator's receipt for every enclosure in ${recent} of the ${reports.length * SEEDS.length} runs${recent === reports.length * SEEDS.length ? '' : ' — THE GUEST\'S ZONES ARE NOT THE ONES THE TEST READ'}`);
}
