#!/usr/bin/env node
/**
 * probe-excess-in-engine.mjs — SC2's preview beside SC2's law computed by the three engines
 * themselves (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC2; §7).
 *
 * SC2 puts galena, molybdenite and uraninite on rate = m·k·(σ − 1). The `excess` arm of
 * tools/sim-side-ab.mjs previews it with a WRAPPER round the engine: the engine runs as shipped
 * (rate = k·σ·u), and the positive zone it returns is rescaled by m·(σ − 1)/σ. Each of the three
 * engines makes one test on its own rate, `if (rate < 0.1) return null` (js/61-engines-sulfide.ts,
 * grow_molybdenite and grow_galena; js/57-engines-oxide.ts, grow_uraninite), and sets the crystal's
 * habit and forms after it. Under the wrapper that test has been made on the shipped rate, which is
 * 6.4 or more wherever σ is 1 or more, so it never fires.
 *
 * The two forms this probe runs:
 *   wrapper        the A/B tool's `excess` arm, copied.
 *   in the engine  the shipped engine computes the law itself. Each engine reads σ into a local,
 *                  tests it against 1, and uses it once more, in its rate (k·σ·1000·u). For the
 *                  length of the engine's call and no longer, the mineral's σ method on the
 *                  conditions returns an object that reads as σ the first time the engine uses
 *                  it as a number and as m·(σ − 1) the second time. So the engine's own
 *                  statements compute rate = m·k·(σ − 1)·u, apply their temperature factor, make
 *                  their own test on that rate, and set the habit and the forms or do not. No
 *                  line of an engine is edited. The probe throws if an engine uses σ as a number
 *                  any other number of times than twice at σ of 1 or more and once below 1, or
 *                  calls the σ method more than once.
 * An earlier version of this probe did not make the second run. It took the wrapper's zone and
 * refused it where its thickness was under 0.1, which is what a reading of the engines says the
 * law in the engine would do. This version makes the engine do it.
 *
 * Runs: the eight scenarios SC2 moves, at seeds 42, 1 and 2: as shipped, and under each form at
 * m = 1 (the same constant) and at m = 3.
 *
 * Readings per run: the largest crystal with solid of each of the three minerals; the fill at the
 * end of the run; the bulk handle's Pb at the end; the positive zones the three engines returned.
 * Under the wrapper, how many of those are under 0.1 µm after the rescale (the engine's test is
 * on the thickness it proposes, before the simulator's time scale and its allocation). In the
 * engine, how many calls at σ of 1 or more returned nothing, which is that test refusing.
 *
 * The two forms have "the same sizes and fill" when their baseline-style summaries are equal and
 * their fill after every step agrees to a billionth of the cavity. Where they do, their records
 * are compared as well: every crystal field by field, every zone field by field, and the step log
 * line by line. Two numbers agree when they are equal or within a billionth of the larger of them
 * (the two forms are not the same arithmetic, and differ in the last binary places). A zone field
 * that differs is listed with the steps of the zones it differs on, the thickness of the
 * thickest of them, and, where the field is a number, its largest value there: a difference on a
 * zone of 10^-9 µm, or in a value of 10^-13, is rounding. Where the summaries differ, the species
 * whose entry differs are listed with both sizes.
 *
 * A pair can part although the engine refuses no call. The two forms then differ only in the last
 * binary places of the zones they return, so the question is whether that alone moves the run.
 * For each such pair the probe makes both runs again step by step, and a third run: the wrapper
 * with each of its zones multiplied once more by 1 + 1e-15. It prints the step at which the
 * simulator's seal latches under each, the first step at which some crystal's size differs by
 * more than a billionth of itself for each pair of the three runs, and how each run ends. A run
 * that a nudge of that size moves as far as the other form does is a run that rounding moves.
 *
 * Each form is also compared with the shipped run the way tools/sim-side-ab.mjs compares an arm:
 * a species is present when one of its crystals has solid; it is moved when its count of crystals
 * with solid changes, or its largest crystal changes by a factor of more than 1.25 (on the sizes
 * plus one micrometre).
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins. For one control it reads a committed A/B output,
 * ab-rate-on-excess.json in this folder.
 * Controls: at seed 42 every scenario's shipped run is compared with the committed baseline; the
 * wrapper's run has to be the committed A/B run in its fill at the end, its largest fill, its bulk
 * Pb and every species' count and largest crystal, for every scenario, seed and m; and a run in
 * the engine made twice has to differ in no field and no step-log line.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-excess-in-engine.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-excess-in-engine',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const AB = JSON.parse(fs.readFileSync(path.join(ROOT, 'proposals', 'evidence', 'sim-side-2026-11-09', 'ab-rate-on-excess.json'), 'utf8'));
const THREE = ['galena', 'molybdenite', 'uraninite'];
const NAMES = ['reactive_wall', 'reactivated_fluorite_vein', 'mvt', 'sunnyside_american_tunnel', 'porphyry', 'roughten_gill', 'schneeberg', 'radioactive_pegmatite'];
const SEEDS = [42, 1, 2];
const MULTIPLES = [1, 3];
const mm = (um) => (um == null ? '—' : (um / 1000).toFixed(um < 1000 ? 2 : 1));
const sigmaReads = { atOrAbove: 0, below: 0 };      // calls of an engine under the second form, by which side of saturation σ was on

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

// One run. form: null for the shipped run, 'wrapper' for the A/B tool's `excess` arm, 'nudged' for
// that arm with each of its zones multiplied once more by NUDGE, 'engine' for the law computed by
// the engine. m: the multiple of the shipped constant. keepHistory: also keep, for every step, the
// fill, the seal latch, the bulk Pb and every crystal's size.
const NUDGE = 1 + 1e-15;
function run(name, seed, form = null, m = 1, keepHistory = false) {
  const saved = {};
  const count = { positive: 0, under: 0, refused: 0, steps: [] };
  try {
    if (form != null) {
      for (const mineral of THREE) {
        const orig = saved[mineral] = MINERAL_ENGINES[mineral];
        const method = 'supersaturation_' + mineral;
        MINERAL_ENGINES[mineral] = form !== 'engine'
          ? (crystal, conditions, step) => {
            const s = conditions[method]();                             // read before the engine runs; draws no random number
            const zone = orig(crystal, conditions, step);
            if (!zone || !(zone.thickness_um > 0)) return zone;
            let f = s > 0 ? m * Math.max(0, s - 1) / s : 0;               // tools/sim-side-ab.mjs, `excess`
            if (form === 'nudged') f *= NUDGE;
            if (f !== 1) {
              zone.thickness_um *= f;
              if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
            }
            count.positive++;
            if (zone.thickness_um < 0.1) { count.under++; count.steps.push(step); }
            return zone;
          }
          : (crystal, conditions, step) => {
            const own = Object.prototype.hasOwnProperty.call(conditions, method);
            const shipped = conditions[method];
            let s = null, reads = 0, calls = 0;
            conditions[method] = function () {
              calls++;
              s = shipped.call(this);
              // σ the first time the engine uses it as a number (its test against 1), m·(σ − 1) the second (its rate)
              return { valueOf() { return reads++ === 0 ? s : m * (s - 1); } };
            };
            let zone;
            try { zone = orig(crystal, conditions, step); }
            finally { if (own) conditions[method] = shipped; else delete conditions[method]; }
            if (calls !== 1) throw new Error(`${mineral}: the engine called its σ method ${calls} times`);
            if (s >= 1) {
              if (reads !== 2) throw new Error(`${mineral}: at σ of 1 or more the engine used σ as a number ${reads} times, not twice`);
              sigmaReads.atOrAbove++;
              if (!zone) { count.refused++; count.steps.push(step); }
            } else {
              if (reads !== 1) throw new Error(`${mineral}: below saturation the engine used σ as a number ${reads} times, not once`);
              sigmaReads.below++;
            }
            if (zone && zone.thickness_um > 0) count.positive++;
            return zone;
          };
      }
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const steps = defaultSteps ?? 100;
    let maxFill = 0;
    const fills = [], logs = [], history = [];
    for (let i = 0; i < steps; i++) {
      const lines = sim.run_step();
      logs.push(Array.isArray(lines) ? lines.slice() : []);
      const fill = sim.get_vug_fill();
      fills.push(fill);
      if (fill > maxFill) maxFill = fill;
      if (keepHistory) {
        history.push({ step: sim.step, fill, sealed: sim._vug_sealed === true, pb: Number(sim.conditions.fluid.Pb),
          sizes: sim.crystals.map(c => c.total_growth_um), who: sim.crystals.map(c => `${c.mineral} #${c.crystal_id}`) });
      }
    }
    // presence as tools/sim-side-ab.mjs reads it: a species is present when one of its crystals has solid left
    const species = {};
    for (const c of sim.crystals) {
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    return { steps, fills, fill: sim.get_vug_fill(), maxFill, species, summary: JSON.stringify(summarize(sim)), bulkPb: Number(sim.conditions.fluid.Pb), count, history,
      crystals: sim.crystals, logs };                                   // kept until the two forms have been compared, then dropped
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}
const lighten = (r) => { delete r.crystals; delete r.logs; delete r.history; return r; };

// The comparison tools/sim-side-ab.mjs makes, copied.
function against(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  return `moved ${moved.join(', ') || 'none'}; lost ${lost.join(', ') || 'none'}; gained ${gained.join(', ') || 'none'}`;
}
const fillApart = (a, b) => {
  if (a.fills.length !== b.fills.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.fills.length; i++) worst = Math.max(worst, Math.abs(a.fills[i] - b.fills[i]));
  return worst;
};
const SAME_FILL = 1e-9;
const same = (a, b) => a.summary === b.summary && fillApart(a, b) < SAME_FILL;

// Two records compared field by field. Two numbers agree when they are equal or within a billionth
// of the larger of them; anything else has to be equal. An object already visited, or nested more
// than twelve deep, is taken as agreeing, which cuts a cycle.
const near = (a, b) => a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
function equal(a, b, seen, depth = 0) {
  if (typeof a === 'number' && typeof b === 'number') return near(a, b) || (Number.isNaN(a) && Number.isNaN(b));
  if (a === b) return true;
  if (typeof a === 'function' && typeof b === 'function') return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (seen.has(a) || depth > 12) return true;
    seen.add(a);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!equal(a[k], b[k], seen, depth + 1)) return false;
    return true;
  }
  return false;
}
function records(A, B) {
  const zoneFields = {};       // "mineral.field" -> the zones on which it differs, their steps, and the thickest of them
  const crystalFields = {};    // "mineral.field" -> the crystals on which a field other than the zones differs
  const extras = [];           // the crystals that store another number of zones
  let zones = 0;
  const n = Math.min(A.crystals.length, B.crystals.length);
  for (let i = 0; i < n; i++) {
    const ca = A.crystals[i], cb = B.crystals[i];
    const seen = new WeakSet();
    for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      if (k === 'zones' || equal(ca[k], cb[k], seen)) continue;
      crystalFields[`${ca.mineral}.${k}`] = (crystalFields[`${ca.mineral}.${k}`] || 0) + 1;
    }
    const shared = Math.min(ca.zones.length, cb.zones.length);
    if (ca.zones.length !== cb.zones.length) {
      const more = ca.zones.length > cb.zones.length ? ca : cb;
      extras.push(`${ca.mineral} #${ca.crystal_id} stores ${ca.zones.length} zones against ${cb.zones.length}: ${more.zones.slice(shared).map(z => `one at step ${z.step}, ${Number(z.thickness_um).toExponential(1)} µm thick`).join('; ')}`);
    }
    for (let z = 0; z < shared; z++) {
      const za = ca.zones[z], zb = cb.zones[z];
      zones++;
      for (const k of new Set([...Object.keys(za), ...Object.keys(zb)])) {
        if (equal(za[k], zb[k], new WeakSet())) continue;
        const o = (zoneFields[`${ca.mineral}.${k}`] ||= { zones: 0, lowStep: Infinity, highStep: -Infinity, thickest: 0, numeric: 0, largest: 0 });
        o.zones++;
        if (typeof za[k] === 'number' && typeof zb[k] === 'number') { o.numeric++; o.largest = Math.max(o.largest, Math.abs(za[k]), Math.abs(zb[k])); }
        o.lowStep = Math.min(o.lowStep, za.step);
        o.highStep = Math.max(o.highStep, za.step);
        o.thickest = Math.max(o.thickest, Math.abs(za.thickness_um), Math.abs(zb.thickness_um));
      }
    }
  }
  const zoneCounts = extras.length;
  let logLines = 0, logTotal = 0;
  for (let s = 0; s < Math.max(A.logs.length, B.logs.length); s++) {
    const la = A.logs[s] || [], lb = B.logs[s] || [];
    logTotal += la.length;
    logLines += Math.abs(la.length - lb.length);
    for (let j = 0; j < Math.min(la.length, lb.length); j++) if (la[j] !== lb[j]) logLines++;
  }
  const crystals = Math.max(A.crystals.length, B.crystals.length);
  return { zoneFields, crystalFields, extras, zones, crystals, zoneCounts: zoneCounts + Math.abs(A.crystals.length - B.crystals.length), logLines, logTotal };
}
const clean = (r) => !Object.keys(r.zoneFields).length && !Object.keys(r.crystalFields).length && r.zoneCounts === 0 && r.logLines === 0;
const listed = (o) => Object.entries(o).map(([k, n]) => `${k} ×${n}`).join(', ') || 'none';
const microns = (t) => (t >= 0.1 ? `${t.toFixed(1)} µm` : `${t.toExponential(1)} µm`);
const listedZones = (o) => Object.entries(o).map(([k, d]) => `${k} ×${d.zones} (${d.lowStep === d.highStep ? `at step ${d.lowStep}` : `at steps ${d.lowStep} to ${d.highStep}`}; the thickest of those zones ${microns(d.thickest)}${d.numeric ? `; the field itself ${d.largest.toExponential(1)} at most` : ''})`).join(', ') || 'none';

// Two runs kept step by step: the first step at which some crystal's size differs by more than a
// billionth of itself, with the crystal and the two fills at that step; null if there is none.
function firstParting(A, B) {
  for (let i = 0; i < Math.min(A.history.length, B.history.length); i++) {
    const a = A.history[i], b = B.history[i];
    if (a.sizes.length !== b.sizes.length) return { step: a.step, who: 'the number of crystals', by: null, fills: [a.fill, b.fill] };
    let worst = 0, who = null;
    for (let k = 0; k < a.sizes.length; k++) {
      const x = a.sizes[k], y = b.sizes[k];
      const d = x === y ? 0 : Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y));
      if (d > worst) { worst = d; who = a.who[k]; }
    }
    if (worst > 1e-9) return { step: a.step, who, by: worst, fills: [a.fill, b.fill] };
  }
  return null;
}

// Two sizes in mm, to the first decimal place at which they differ (the summary rounds to 0.1 µm).
const apartMm = (x, y) => {
  for (const d of [1, 2, 3, 4]) {
    const a = (x / 1000).toFixed(d), b = (y / 1000).toFixed(d);
    if (a !== b) return `${a} against ${b} mm`;
  }
  return `${(x / 1000).toFixed(1)} mm under both`;
};
// The species whose baseline-style entry differs between two runs: the largest crystal of each, and
// the counts where those differ. The first run is named first.
const differing = (a, b) => {
  const A = JSON.parse(a.summary), B = JSON.parse(b.summary);
  const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
  return keys.filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k])).map(k => {
    if (!A[k] || !B[k]) return `${k} on record under ${A[k] ? 'the first only' : 'the second only'}`;
    const counts = A[k].total !== B[k].total || A[k].dissolved !== B[k].dissolved
      ? `, ×${A[k].total} (${A[k].dissolved} dissolved) against ×${B[k].total} (${B[k].dissolved} dissolved)` : '';
    return `${k} ${apartMm(A[k].max_um, B[k].max_um)}${counts}`;
  }).join('; ');
};
// "step 39" or "steps 34, 41": the distinct steps of a list
const stepsOf = (list) => { const d = [...new Set(list)]; return `step${d.length === 1 ? '' : 's'} ${d.join(', ')}`; };
// the wrapper's run against the committed A/B run of the same scenario, seed and m: every number that output holds for it
function isCommitted(name, seed, m, w) {
  const ab = AB.runs.find(r => r.scenario === name && r.seed === seed);
  const arm = ab && ab.B[`excess=${m}`];
  if (!arm) return false;
  if (!near(arm.fill, w.fill) || !near(arm.maxFill, w.maxFill) || !near(Number(arm.bulkPb), w.bulkPb)) return false;
  const keys = new Set([...Object.keys(arm.species), ...Object.keys(w.species)]);
  for (const k of keys) {
    if (!arm.species[k] || !w.species[k]) return false;
    if (arm.species[k].n !== w.species[k].n || !near(arm.species[k].max_um, w.species[k].max_um)) return false;
  }
  return true;
}

console.log(`probe-excess-in-engine — SIM ${SIM_VERSION}; ${NAMES.length} scenarios; seeds ${SEEDS.join(' / ')}; m = ${MULTIPLES.join(' and ')}; time scale ${getSimulationTimeScale()}`);
console.log('each line gives the three seeds; "under 0.1" are positive zones of the three minerals that the wrapper leaves under 0.1 µm; "refused" are calls at σ of 1 or more in which the engine, computing the law itself, returned nothing\n');
const tally = {};          // m -> counts over the pairs
const noRefusal = [];      // the pairs that part although the engine refuses no call and the wrapper leaves no zone under 0.1
let reproduced = 0, committed = 0, checked = 0;
for (const name of NAMES) {
  const shipped = SEEDS.map(seed => lighten(run(name, seed)));
  if (shipped[0].summary === JSON.stringify(BASELINE[name])) reproduced++;
  const each = (runs, f) => runs.map(f).join(' / ');
  const sizes = (runs) => THREE.filter(mineral => runs.some(r => r.species[mineral])).map(mineral => `${mineral} ${each(runs, r => mm(r.species[mineral]?.max_um))} mm`).join('; ') || 'none of the three holds solid';
  console.log(`  ${name}, ${shipped[0].steps} steps`);
  console.log(`    ${'shipped'.padEnd(22)} ${sizes(shipped)}; fill at the end ${each(shipped, r => (r.fill * 100).toFixed(1))} %; Pb on the bulk handle at the end ${each(shipped, r => r.bulkPb.toFixed(1))}`);
  for (const m of MULTIPLES) {
    const w = SEEDS.map(seed => run(name, seed, 'wrapper', m));
    const e = SEEDS.map(seed => run(name, seed, 'engine', m));
    const t = (tally[m] ||= { pairs: 0, same: 0, under: 0, underPairs: 0, refused: 0, refusedPairs: 0, parted: [], sameVerdict: 0, samePb: 0,
      compared: 0, cleanRecords: 0, zones: 0, crystals: 0, logTotal: 0, unclean: [] });
    const sameAt = SEEDS.map((_, i) => same(w[i], e[i]));
    const recs = SEEDS.map((_, i) => (sameAt[i] ? records(w[i], e[i]) : null));
    for (let i = 0; i < SEEDS.length; i++) {
      checked++;
      if (isCommitted(name, SEEDS[i], m, w[i])) committed++;
      if (against(shipped[i], w[i]) === against(shipped[i], e[i])) t.sameVerdict++;
      if (near(w[i].bulkPb, e[i].bulkPb)) t.samePb++;
      t.pairs++;
      if (sameAt[i]) t.same++;
      else {
        if (e[i].count.refused === 0 && w[i].count.under === 0) noRefusal.push({ name, seed: SEEDS[i], m });
        t.parted.push(`${name} at seed ${SEEDS[i]} (${e[i].count.refused ? `the engine refuses ${e[i].count.refused} call${e[i].count.refused === 1 ? '' : 's'} there` : 'the engine refuses no call there'}; fill at the end ${(w[i].fill * 100).toFixed(1)} % under the wrapper, ${(e[i].fill * 100).toFixed(1)} % in the engine; bulk Pb at the end ${w[i].bulkPb.toFixed(1)} against ${e[i].bulkPb.toFixed(1)}; summary ${w[i].summary === e[i].summary ? 'equal' : `differs, wrapper against engine: ${differing(w[i], e[i])}`}; fill apart at some step by ${fillApart(w[i], e[i]) < 1e-4 ? `${fillApart(w[i], e[i]).toExponential(1)} of the cavity` : `${(fillApart(w[i], e[i]) * 100).toFixed(2)} points`} at most; against shipped, wrapper: ${against(shipped[i], w[i])}; in the engine: ${against(shipped[i], e[i])})`);
      }
      if (w[i].count.under > 0) { t.under += w[i].count.under; t.underPairs++; }
      if (e[i].count.refused > 0) { t.refused += e[i].count.refused; t.refusedPairs++; }
      if (recs[i]) {
        t.compared++; t.zones += recs[i].zones; t.crystals += recs[i].crystals; t.logTotal += recs[i].logTotal;
        if (clean(recs[i])) t.cleanRecords++;
        else t.unclean.push(`${name} at seed ${SEEDS[i]}, where the pocket ends ${(w[i].fill * 100).toFixed(1)} % full (zone fields: ${listedZones(recs[i].zoneFields)}; crystal fields: ${listed(recs[i].crystalFields)}; crystals with another count of zones: ${recs[i].extras.join('; ') || 'none'}; step-log lines: ${recs[i].logLines})`);
      }
    }
    const head = (runs) => `${sizes(runs)}; fill at the end ${each(runs, r => (r.fill * 100).toFixed(1))} %; Pb on the bulk handle at the end ${each(runs, r => r.bulkPb.toFixed(1))}`;
    console.log(`    ${`m = ${m}, wrapper`.padEnd(22)} ${head(w)}; under 0.1: ${each(w, r => `${r.count.under} of ${r.count.positive}${r.count.under ? ` (${stepsOf(r.count.steps)})` : ''}`)}`);
    console.log(`    ${`m = ${m}, in the engine`.padEnd(22)} ${head(e)}; refused: ${each(e, r => `${r.count.refused}${r.count.refused ? ` (${stepsOf(r.count.steps)})` : ''}`)}; positive zones ${each(e, r => r.count.positive)}`);
    console.log(`    ${''.padEnd(22)} the two forms: ${sameAt.every(Boolean) ? 'the same sizes and fill at every seed' : `the same sizes and fill at ${sameAt.filter(Boolean).length} of ${sameAt.length} seeds`}; against shipped, wrapper: ${each(w, (r, i) => against(shipped[i], r))} | in the engine: ${each(e, (r, i) => against(shipped[i], r))}`);
    console.log(`    ${''.padEnd(22)} their records where the sizes and fill are the same: ${each(recs, r => (r ? `${r.zones} zones of ${r.crystals} crystals and ${r.logTotal} step-log lines, ${clean(r) ? 'no difference' : 'DIFFERENCES (listed below)'}` : 'not compared'))}`);
    w.forEach(lighten); e.forEach(lighten);
  }
}

console.log('');
for (const m of MULTIPLES) {
  const t = tally[m];
  console.log(`m = ${m}: the two forms have the same sizes and fill in ${t.same} of ${t.pairs} pairs; the wrapper leaves ${t.under} zone${t.under === 1 ? '' : 's'} under 0.1 µm, in ${t.underPairs} pair${t.underPairs === 1 ? '' : 's'}; the engine's own test refuses ${t.refused} call${t.refused === 1 ? '' : 's'}, in ${t.refusedPairs} pair${t.refusedPairs === 1 ? '' : 's'}`);
  for (const text of t.parted) console.log(`    they part in ${text}`);
  console.log(`    the records of the ${t.compared} pairs with the same sizes and fill (${t.zones} zones of ${t.crystals} crystals, ${t.logTotal} step-log lines): ${t.cleanRecords === t.compared ? 'no crystal field, zone field or step-log line differs in any of them' : `a difference in ${t.compared - t.cleanRecords} of them`}`);
  for (const text of t.unclean) console.log(`      differs in ${text}`);
  console.log(`    against the shipped run the two forms move, lose and gain the same species in ${t.sameVerdict} of ${t.pairs} pairs; the bulk handle's Pb at the end agrees to a billionth under both in ${t.samePb}`);
}
if (noRefusal.length) {
  // A pair that parts with no call refused: the two forms differ only in the last binary places of
  // the zones they return. Is that enough to move this run? Make the wrapper's run again with each
  // of its zones multiplied once more by 1 + 1e-15, and see where each pair of runs first differs.
  const mm2 = (um) => (um / 1000).toFixed(2);
  console.log(`\nthe ${noRefusal.length} pair${noRefusal.length === 1 ? '' : 's'} that part although the engine refuses no call, made again step by step, with a third run: the wrapper with each of its zones multiplied once more by 1 + 1e-15`);
  for (const { name, seed, m } of noRefusal) {
    const w = run(name, seed, 'wrapper', m, true), e = run(name, seed, 'engine', m, true), n = run(name, seed, 'nudged', m, true);
    const sealedAt = (r) => r.history.find(h => h.sealed)?.step ?? '—';
    const part = (a, b) => {
      const p = firstParting(a, b);
      return p ? `first at step ${p.step} (${p.who}${p.by == null ? '' : `, by ${(p.by * 100).toFixed(2)} % of its size`}; the fill after that step ${p.fills[0].toPrecision(17)} against ${p.fills[1].toPrecision(17)})` : 'at no step';
    };
    const end = (r) => `${THREE.filter(x => r.species[x]).map(x => `${x} ${mm2(r.species[x].max_um)} mm`).join(', ')}, bulk Pb ${r.bulkPb.toFixed(1)}, fill ${r.fill.toPrecision(17)}`;
    console.log(`  ${name}, seed ${seed}, m = ${m}: the simulator's seal latches at step ${sealedAt(w)} under the wrapper, ${sealedAt(e)} in the engine and ${sealedAt(n)} under the nudged wrapper`);
    console.log(`      a crystal's size differs by more than a billionth of itself, wrapper against engine: ${part(w, e)}`);
    console.log(`      … wrapper against nudged wrapper: ${part(w, n)}`);
    console.log(`      … engine against nudged wrapper: ${part(e, n)}`);
    console.log(`      at the end: wrapper ${end(w)}; engine ${end(e)}; nudged wrapper ${end(n)}`);
    console.log(`      summaries: the nudged wrapper's ${n.summary === w.summary ? 'is the wrapper\'s' : 'is not the wrapper\'s'} and ${n.summary === e.summary ? 'is the engine\'s' : 'is not the engine\'s'}`);
  }
}
{
  // the record comparison finds nothing between a run and the same run made again
  const a = run('reactive_wall', 42, 'engine', 1), b = run('reactive_wall', 42, 'engine', 1);
  const r = records(a, b);
  console.log(`\ncontrol: reactive_wall at seed 42 with the law in the engine, made twice, ${clean(r) && a.summary === b.summary ? `differs in no field of ${r.zones} zones and ${r.crystals} crystals and in none of ${r.logTotal} step-log lines` : 'DIFFERS FROM ITSELF'}`);
}
console.log(`controls: at seed ${SEEDS[0]} the shipped run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}; the wrapper's run ${committed === checked ? `is the committed A/B run in its fill at the end, its largest fill, its bulk Pb and every species' count and largest crystal, in all ${checked} runs (ab-rate-on-excess.json)` : `IS NOT THAT OF THE COMMITTED A/B RUN in ${checked - committed} of ${checked} runs`}`);
console.log(`control: with the law in the engine, the engine used σ as a number twice in each of its ${sigmaReads.atOrAbove} calls at σ of 1 or more and once in each of its ${sigmaReads.below} calls below 1 (the probe throws otherwise)`);
