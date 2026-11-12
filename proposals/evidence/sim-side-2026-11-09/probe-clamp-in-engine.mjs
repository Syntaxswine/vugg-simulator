#!/usr/bin/env node
/**
 * probe-clamp-in-engine.mjs — the rate clamp as this review's previews write it, beside the clamp as
 * SC1 would write it into the two engines (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC1; §7).
 *
 * Every preview of the clamp in this review is a WRAPPER round the engine (the `rclamp` arm of
 * tools/sim-side-ab.mjs, probe-pegmatite-reach.mjs, probe-clamp-horizon.mjs and the rest): σ is read
 * before the engine runs, the engine runs as shipped, and the positive zone it returns is rescaled
 * by E/(σ − 1) wherever σ − 1 is above E. By then the engine has made its own tests on the rate it
 * proposed (js/59-engines-silicate.ts):
 *   grow_feldspar   rate = 3·(σ − 1)·u, u between 0.7 and 1.3. It returns nothing below a rate of
 *                   0.1, takes the adularia habit under 250 °C at a rate under 2, and rolls for a
 *                   fluid inclusion at a rate above 4.
 *   grow_albite     rate = 4·(σ − 1)·u, u between 0.8 and 1.2. It returns nothing below a rate of
 *                   0.1, and rolls for the platy habit under 350 °C at a rate under 3.
 * grow_albite uses its rate once more. It debits Na, Al and SiO2 from the fluid it was handed by
 * its rate (the simulator puts those debits back, since formula species are booked by the ledger:
 * _runEngineFluidTransaction, js/85b-simulator-nucleate.ts), and it records the zone's trace Al
 * from the aluminium that is left.
 * SC1 recommends the clamp INSIDE the engine: rate = k·min(σ − 1, E)·u, with each of those tests
 * and writes made on the clamped rate. This probe makes that run too. For the length of the
 * engine's call and no longer, the mineral's σ method on the conditions returns min(σ, E + 1).
 * Each engine reads σ once, tests it against 1 and takes σ − 1 for its rate, so the call is the
 * engine with rate = k·min(σ − 1, E)·u. σ is as shipped for every other reader.
 *
 * Where the clamp is active the rate the engine proposes is above 2.1·E for feldspar and 3.2·E for
 * albite, with the clamp inside the engine or without it. So from E = 2 up (2.1·E is then 4.2 or
 * more) every one of those tests falls on the same side under both forms, every zone should have
 * the same thickness, and the two runs should have the same sizes and the same fill. They are not
 * the same record: an albite zone carries another trace Al under each form, and the step log
 * prints it. Below about 1.9, feldspar's clamped rate can be under 4: the engine then makes no
 * inclusion roll where under the wrapper it makes one, a random draw is not taken, and the two runs
 * part from there. At 0 the engine returns nothing where the wrapper returns a zone of no thickness.
 * The probe runs both forms side by side and prints how far apart they end.
 *
 * Runs. gem_pegmatite at seeds 42, 1 and 2 unless said; 230 steps unless said.
 *   A  the scenario's own cavity: E = 7 (SC1 as recommended) and E = 1, each stepped on until the
 *      pocket is full or 400 steps have run (what probe-clamp-horizon.mjs Part A reads); E = 3 and
 *      E = 11 at seed 42
 *   B  the clamp in other places it has been previewed, E = 7: schneeberg at seeds 42 and 1 and
 *      tormiq_alpine_cleft at seed 42 (the general clamp), and two of Random Vugg's small pockets
 *      (buildRandomScenario('pegmatite', 'pocket') at seeds 15 and 235)
 *   C  the 15 mm vug of Simulation mode's Cavity Size select, the scenario's own broth: E = 7, 1, 0
 *   D  the same vug with the broth changed as ab-gem-broth changes it (SiO2 × 0.1, Al × 0.15):
 *      E = 7, 3, 2, 1.5 and 1
 *   E  the scenario's own cavity with that broth, E = 1
 * The vug and the changed broth are built through the scenario's factory, as Part 4 of
 * probe-pegmatite-reach.mjs builds them.
 *
 * Readings per run: the largest fill of the run and the fill at its end; the first step at fill
 * >= 0.7 and at >= 0.999; the largest quartz, tourmaline and topaz with solid; SC1's first acceptance
 * line, read against the shipped run in the same cavity at the same seed; the positive zones the
 * pair's engines returned, and how many carry a fluid inclusion. Two runs have "the same sizes and
 * fill" when their baseline-style summaries are equal and their fill after every step agrees to a
 * billionth of the cavity. (They are not the same arithmetic: the wrapper stores
 * k·(σ − 1)·u·E/(σ − 1) where the engine stores k·E·u, and the two can differ in the last binary
 * place.) Where two runs have the same sizes and fill, they are also compared crystal by crystal
 * and zone by zone, field by field, and step-log line by step-log line: two numbers have to agree
 * to a billionth of the larger of them, whatever their size, and everything else has to be equal.
 * A crystal that stores another number of zones under one form has the zones both forms store
 * compared, and the others are listed with their step and thickness. For each zone field that
 * differs the probe prints on how many zones, by how much where the field is a number, under
 * which form the number is the higher, at which steps, and how thick the thickest of those zones
 * is: a field that differs only on a zone of 10^-11 µm at the step that seals the cavity is
 * rounding, and one that differs on zones of 100 µm through the run is not.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: gem_pegmatite's shipped run at seed 42 is compared with the committed baseline, at the
 * start and at the end, and schneeberg's and tormiq_alpine_cleft's once; each form at E = Infinity
 * has to be the shipped run; the vug built through the factory has to be the run the game's command
 * runtime builds; at every E of 2 or more the two forms have to have the same sizes and fill; and
 * the clamp in the engine at 7, made twice, has to differ in no zone field, no crystal field and
 * no step-log line.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-clamp-in-engine.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, buildRandomScenario,
  startSimulationCommandRuntime, makeSimulationStartCommand, resolveSizeClassToMm, getSimulationTimeScale,
} = await harness.loadSimBundle({
  toolName: 'probe-clamp-in-engine',
  extraExports: ['MINERAL_ENGINES', 'buildRandomScenario', 'startSimulationCommandRuntime', 'makeSimulationStartCommand',
    'resolveSizeClassToMm', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const PAIR = ['feldspar', 'albite'];
const SEEDS = [42, 1, 2];
const mm = (um) => (um == null ? '—' : (um / 1000).toFixed(um < 1000 ? 2 : 1));

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

// One run. make(seed) is called after the seed is set and returns { conditions, events, defaultSteps }.
//   form     'wrapper' or 'engine': which of the two clamps is installed on the pair; null for neither
//   E        the clamp's value
//   mul      [[field, factor], …]: the initial fluid, multiplied before the simulator is built
//   horizon  after the run's own steps, step on until the fill reaches 0.999 or this many steps have run
function run(seed, make, { form = null, E = null, mul = null, horizon = null } = {}) {
  const saved = {};
  const count = { zones: 0, inclusions: 0 };
  const tally = (zone) => {
    if (zone && zone.thickness_um > 0) { count.zones++; if (zone.fluid_inclusion) count.inclusions++; }
    return zone;
  };
  try {
    if (form != null) {
      for (const m of PAIR) {
        const orig = saved[m] = MINERAL_ENGINES[m];
        const name = 'supersaturation_' + m;
        MINERAL_ENGINES[m] = form === 'wrapper'
          // the wrapper, as probe-pegmatite-reach.mjs and the `rclamp` arm of tools/sim-side-ab.mjs write it
          ? (crystal, conditions, step) => {
            const s = conditions[name]();                           // read before the engine runs; draws no random number
            const zone = orig(crystal, conditions, step);
            if (!zone || !(zone.thickness_um > 0)) return zone;
            if (s - 1 > E) {
              const f = E / (s - 1);
              zone.thickness_um *= f;
              if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
            }
            return tally(zone);
          }
          // the clamp inside the engine: for this call alone the engine reads min(σ, E + 1)
          : (crystal, conditions, step) => {
            const own = Object.prototype.hasOwnProperty.call(conditions, name);
            const shipped = conditions[name];
            conditions[name] = function () { const s = shipped.call(this); return s - 1 > E ? E + 1 : s; };
            try {
              return tally(orig(crystal, conditions, step));
            } finally {
              if (own) conditions[name] = shipped; else delete conditions[name];
            }
          };
      }
    }
    setSeed(seed);
    const made = make(seed);
    const conditions = made.conditions;
    if (mul) {
      for (const [field, x] of mul) {
        if (typeof conditions.fluid[field] !== 'number') throw new Error(`fluid has no numeric field ${field}`);
        conditions.fluid[field] *= x;
      }
    }
    const sim = new VugSimulator(conditions, made.events);
    const steps = made.defaultSteps ?? 100;
    let maxFill = 0, first70 = null, full = null;
    const fills = [];
    const logs = [];                                                // the lines each step returns
    const keep = (lines) => logs.push(Array.isArray(lines) ? lines.slice() : []);
    for (let i = 0; i < steps; i++) {
      keep(sim.run_step());
      const fill = sim.get_vug_fill();
      fills.push(fill);
      if (fill > maxFill) maxFill = fill;
      if (first70 == null && fill >= 0.7) first70 = sim.step;
      if (full == null && fill >= 0.999) full = sim.step;
    }
    // the readings of the run's own length
    const species = {};
    let lastGrowth = 0;
    for (const c of sim.crystals) {
      for (const z of c.zones) if (z.thickness_um > 0 && z.step > lastGrowth) lastGrowth = z.step;
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    const out = { steps, fill: sim.get_vug_fill(), maxFill, first70, full, lastGrowth, species, fills, summary: JSON.stringify(summarize(sim)),
      zones: count.zones, inclusions: count.inclusions, diameter: Number(sim.conditions.wall.vug_diameter_mm),
      crystals: sim.crystals, logs };                               // kept until the two forms have been compared, then dropped
    // stepped on past the run's own length
    if (horizon != null) {
      let first70On = first70, fullOn = full;
      while (sim.step < horizon && fullOn == null) {
        keep(sim.run_step());
        const fill = sim.get_vug_fill();
        out.fills.push(fill);
        if (first70On == null && fill >= 0.7) first70On = sim.step;
        if (fullOn == null && fill >= 0.999) fullOn = sim.step;
      }
      Object.assign(out, { first70On, fullOn, steppedTo: sim.step, summaryOn: JSON.stringify(summarize(sim)) });
    }
    return out;
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

// SC1's first acceptance line, as probe-pegmatite-reach.mjs reads it: against the shipped run in the
// same cavity at the same seed.
const firstLine = (r, base) => r.maxFill < 0.7 && r.lastGrowth > 215
  && (r.species.tourmaline?.max_um || 0) >= 5000 && (r.species.topaz?.max_um || 0) >= 1000
  && Object.keys(base.species).every(m => r.species[m]);
// The largest difference between two runs' fill, over every step. The two forms are not the same
// arithmetic: the wrapper stores k·(σ − 1)·u·E/(σ − 1) and the engine k·E·u, which can differ in the
// last binary place, so "the same sizes and fill" allows the fill a billionth of the cavity.
const fillApart = (a, b) => {
  if (a.fills.length !== b.fills.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.fills.length; i++) worst = Math.max(worst, Math.abs(a.fills[i] - b.fills[i]));
  return worst;
};
const SAME_FILL = 1e-9;
const sameSizesAndFill = (a, b) => a.summary === b.summary && (a.summaryOn ?? '') === (b.summaryOn ?? '') && fillApart(a, b) < SAME_FILL;

// Two runs compared crystal by crystal, zone by zone, field by field, and step-log line by step-log
// line. Two numbers agree when they are equal or within a billionth of the larger of them, whatever
// their size; anything else has to be equal. An object already visited, or nested more than twelve
// deep, is taken as agreeing, which cuts a cycle. A crystal that stores more zones under one form
// than under the other has the zones both forms store compared, and the others listed.
// A is the wrapper's run and B the engine's wherever the two forms are compared.
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
  // "mineral.field" -> the zones on which the field differs; of those that are numbers, the largest
  // relative difference and how many are the higher in B; the steps of those zones; the thickest of them
  const fields = {};
  const crystalFields = {};                // "mineral.field" -> the crystals on which a field other than the zones differs
  const extras = [];                       // the crystals that store another number of zones
  let zones = 0, sizes = 0;
  const n = Math.min(A.crystals.length, B.crystals.length);
  for (let i = 0; i < n; i++) {
    const ca = A.crystals[i], cb = B.crystals[i];
    if (ca.mineral !== cb.mineral || ca.habit !== cb.habit || !near(ca.total_growth_um, cb.total_growth_um)) sizes++;
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
        const o = (fields[`${ca.mineral}.${k}`] ||= { zones: 0, numeric: 0, worst: 0, higherB: 0, lowStep: Infinity, highStep: -Infinity, thickest: 0 });
        o.zones++;
        if (typeof za[k] === 'number' && typeof zb[k] === 'number') {
          o.numeric++;
          o.worst = Math.max(o.worst, Math.abs(za[k] - zb[k]) / Math.max(Math.abs(za[k]), Math.abs(zb[k])));
          if (zb[k] > za[k]) o.higherB++;
        }
        o.lowStep = Math.min(o.lowStep, za.step);
        o.highStep = Math.max(o.highStep, za.step);
        o.thickest = Math.max(o.thickest, Math.abs(za.thickness_um), Math.abs(zb.thickness_um));
      }
    }
  }
  let logLines = 0, logTotal = 0;
  for (let s = 0; s < Math.max(A.logs.length, B.logs.length); s++) {
    const la = A.logs[s] || [], lb = B.logs[s] || [];
    logTotal += la.length;
    logLines += Math.abs(la.length - lb.length);
    for (let j = 0; j < Math.min(la.length, lb.length); j++) if (la[j] !== lb[j]) logLines++;
  }
  return { fields, crystalFields, extras, zones, zoneCounts: extras.length + Math.abs(A.crystals.length - B.crystals.length), sizes, logLines, logTotal };
}
// What is known of one field over some comparisons of records: the size of the difference where the
// field is a number, which form holds the higher value, the steps, and the thickest zone concerned.
const microns = (t) => (t >= 0.1 ? `${t.toFixed(1)} µm` : `${t.toExponential(1)} µm`);
function fieldDetail(k, recs) {
  const of = (f, start) => recs.reduce((acc, r) => (r.fields[k] ? f(acc, r.fields[k]) : acc), start);
  const worst = of((a, o) => Math.max(a, o.worst), 0), numeric = of((a, o) => a + o.numeric, 0), higher = of((a, o) => a + o.higherB, 0);
  const lo = of((a, o) => Math.min(a, o.lowStep), Infinity), hi = of((a, o) => Math.max(a, o.highStep), -Infinity);
  return [
    numeric ? `by ${(worst * 100).toFixed(1)} % at most` : null,
    numeric ? `the higher value in the engine on ${higher} of ${numeric}` : null,
    lo === hi ? `at step ${lo}` : `at steps ${lo} to ${hi}`,
    `the thickest of those zones ${microns(of((a, o) => Math.max(a, o.thickest), 0))}`,
  ].filter(Boolean).join('; ');
}
const listed = (o) => Object.entries(o).map(([k, n]) => `${k} ×${n}`).join(', ') || 'none';
// A run's crystals and step log are dropped once they have been compared.
const lighten = (r) => { delete r.crystals; delete r.logs; return r; };

const comparisons = [];     // one entry for each call of compare()
function compare(label, E, seeds, make, options, bases) {
  const w = seeds.map(seed => run(seed, make, { ...options, form: 'wrapper', E }));
  const e = seeds.map(seed => run(seed, make, { ...options, form: 'engine', E }));
  const each = (runs, f) => runs.map(f).join(' / ');
  const line = (runs) => `largest fill of the run ${each(runs, r => (r.maxFill * 100).toFixed(1))} %, at its end ${each(runs, r => (r.fill * 100).toFixed(1))} %; first step at fill >= 0.7 ${each(runs, r => r.first70 ?? '—')}; at >= 0.999 ${each(runs, r => r.full ?? '—')}`
    + (options.horizon != null ? `; stepped on to ${options.horizon} at most: >= 0.7 at ${each(runs, r => r.first70On ?? '—')}, >= 0.999 at ${each(runs, r => r.fullOn ?? '—')}` : '')
    + `; quartz ${each(runs, r => mm(r.species.quartz?.max_um))} mm, tourmaline ${each(runs, r => mm(r.species.tourmaline?.max_um))}, topaz ${each(runs, r => mm(r.species.topaz?.max_um))}, feldspar ${each(runs, r => mm(r.species.feldspar?.max_um))}, albite ${each(runs, r => mm(r.species.albite?.max_um))}`
    + (bases ? `; SC1's first acceptance line holds at ${runs.filter((r, i) => firstLine(r, bases[i])).length} of ${runs.length}` : '');
  console.log(`    ${label}, E = ${E}${seeds.length === SEEDS.length ? '' : ` (seed${seeds.length === 1 ? '' : 's'} ${seeds.join(' / ')})`}`);
  console.log(`      wrapper        ${line(w)}`);
  console.log(`      in the engine  ${line(e)}`);
  const same = w.map((r, i) => sameSizesAndFill(r, e[i]));
  const fillGap = Math.max(...w.map((r, i) => Math.abs(r.fill - e[i].fill) * 100));
  console.log(`      the two forms: ${same.every(Boolean) ? 'the same sizes and fill at every seed' : same.some(Boolean) ? `the same sizes and fill at ${same.filter(Boolean).length} of ${same.length} seeds` : 'other sizes or another fill at every seed'}; positive zones of the pair ${each(w, r => r.zones)} against ${each(e, r => r.zones)}, with a fluid inclusion ${each(w, r => r.inclusions)} against ${each(e, r => r.inclusions)}${same.every(Boolean) ? '' : `; fill at the end apart by ${fillGap.toFixed(2)} points at most`}`);
  // Where the two forms have the same sizes and fill: are they the same record?
  let recs = null;
  if (same.every(Boolean)) {
    recs = w.map((r, i) => records(r, e[i]));
    const names = [...new Set(recs.flatMap(r => Object.keys(r.fields)))].sort();
    console.log(`      their records: ${each(recs, r => r.zones)} zones compared; crystals whose size or habit differs ${each(recs, r => r.sizes)}, whose count of zones differs ${each(recs, r => r.zoneCounts)}${recs.some(r => r.extras.length) ? ` (${recs.flatMap(r => r.extras).join('; ')})` : ''}; `
      + `crystal fields that differ: ${each(recs, r => listed(r.crystalFields))}; `
      + (names.length ? `zone fields that differ: ${names.map(k => `${k} on ${each(recs, r => r.fields[k]?.zones ?? 0)} zone${recs.length === 1 && recs[0].fields[k]?.zones === 1 ? '' : 's'} (${fieldDetail(k, recs)})`).join('; ')}` : 'no zone field differs')
      + `; step-log lines that differ ${each(recs, r => r.logLines)} of ${each(recs, r => r.logTotal)}`);
  }
  w.forEach(lighten); e.forEach(lighten);
  comparisons.push({ label, E, w, e, same, recs, lines: bases ? w.map((r, i) => [firstLine(r, bases[i]), firstLine(e[i], bases[i])]) : null, horizon: options.horizon ?? null });
  return { w, e };
}

console.log(`probe-clamp-in-engine — SIM ${SIM_VERSION}; seeds ${SEEDS.join(' / ')}; time scale ${getSimulationTimeScale()}`);
const VUG = { wall: { size_class: 'vug', vug_diameter_mm: resolveSizeClassToMm('vug') } };      // what the form adds for that choice
const BROTH = [['SiO2', 0.1], ['Al', 0.15]];                                                    // the first arm of ab-gem-broth
const viaFactory = (o) => () => SCENARIOS.gem_pegmatite(JSON.parse(JSON.stringify(o)));
const own = viaFactory({}), vug = viaFactory(VUG);

const shippedOwn = SEEDS.map(seed => lighten(run(seed, own)));
const shippedVug = SEEDS.map(seed => lighten(run(seed, vug)));
{
  const viaRuntime = startSimulationCommandRuntime(makeSimulationStartCommand('gem_pegmatite', 42, VUG));
  for (let i = 0; i < viaRuntime.scenarioData.defaultSteps; i++) viaRuntime.sim.run_step();
  console.log(`controls at seed 42: gem_pegmatite's shipped run ${shippedOwn[0].summary === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; `
    + `the wrapper at Infinity ${sameSizesAndFill(shippedOwn[0], run(42, own, { form: 'wrapper', E: Infinity })) ? 'is the shipped run' : 'MOVES THE RUN'}; `
    + `the clamp in the engine at Infinity ${sameSizesAndFill(shippedOwn[0], run(42, own, { form: 'engine', E: Infinity })) ? 'is the shipped run' : 'MOVES THE RUN'}; `
    + `the vug built through the scenario's factory ${shippedVug[0].summary === JSON.stringify(summarize(viaRuntime.sim)) ? 'is the run the command runtime builds' : 'IS A DIFFERENT RUN'} `
    + `(${shippedVug[0].diameter.toFixed(1)} mm; full at step ${shippedVug.map(r => r.full ?? '—').join(' / ')})`);
}

console.log('\nA — the scenario\'s own cavity, the scenario\'s own broth');
compare('the recommended bound', 7, SEEDS, own, { horizon: 400 }, shippedOwn);
compare('a tighter bound', 1, SEEDS, own, { horizon: 400 }, shippedOwn);
compare('another value', 3, [42], own, {}, [shippedOwn[0]]);
compare('another value', 11, [42], own, {}, [shippedOwn[0]]);

console.log('\nB — the clamp at 7 in other places it has been previewed');
for (const [name, seeds] of [['schneeberg', [42, 1]], ['tormiq_alpine_cleft', [42]]]) {
  const make = () => SCENARIOS[name]();
  console.log(`    ${name}: the shipped run at seed 42 ${run(42, make).summary === JSON.stringify(BASELINE[name]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
  compare(`${name}, the general clamp`, 7, seeds, make, {}, null);
}
for (const seed of [15, 235]) compare('Random Vugg, archetype pegmatite, size class pocket', 7, [seed], () => buildRandomScenario('pegmatite', 'pocket'), {}, null);

console.log(`\nC — the form's vug, the scenario's own broth`);
for (const E of [7, 1, 0]) compare('the vug', E, SEEDS, vug, {}, shippedVug);

console.log(`\nD — the form's vug, the changed broth (SiO2 × 0.1, Al × 0.15)`);
for (const E of [7, 3, 2, 1.5, 1]) compare('the vug, changed broth', E, SEEDS, vug, { mul: BROTH }, shippedVug);

console.log(`\nE — the scenario's own cavity, the changed broth`);
compare('own cavity, changed broth', 1, SEEDS, own, { mul: BROTH }, shippedOwn);

// What the comparisons show, over all of them.
{
  const from2 = comparisons.filter(c => c.E >= 2), below = comparisons.filter(c => c.E < 2);
  const runs = (list) => list.reduce((n, c) => n + c.same.length, 0);
  const sameRuns = (list) => list.reduce((n, c) => n + c.same.filter(Boolean).length, 0);
  console.log(`\nover the ${comparisons.length} comparisons (${runs(comparisons)} pairs of runs):`);
  const apart2 = Math.max(...from2.flatMap(c => c.w.map((r, i) => fillApart(r, c.e[i]))));
  console.log(`  at E of 2 or more (${[...new Set(from2.map(c => c.E))].sort((a, b) => a - b).join(', ')}): ${sameRuns(from2) === runs(from2) ? `the two forms have the same sizes and fill in all ${runs(from2)} pairs` : `THE TWO FORMS PART in ${runs(from2) - sameRuns(from2)} of ${runs(from2)} pairs`}; the same baseline-style summary in ${from2.reduce((n, c) => n + c.w.filter((r, i) => r.summary === c.e[i].summary && (r.summaryOn ?? '') === (c.e[i].summaryOn ?? '')).length, 0)}; the fill after any step apart by ${apart2.toExponential(2)} of the cavity at most`);
  {
    // the same sizes and fill is not the same record
    const recs = from2.flatMap(c => c.recs || []);
    const sum = (f) => recs.reduce((n, r) => n + f(r), 0);
    const names = [...new Set(recs.flatMap(r => Object.keys(r.fields)))].sort();
    const crystalFields = {};
    for (const r of recs) for (const [k, n] of Object.entries(r.crystalFields)) crystalFields[k] = (crystalFields[k] || 0) + n;
    console.log(`  at E of 2 or more, the records of the ${recs.length} pairs with the same sizes and fill (${sum(r => r.zones)} zones compared): `
      + (names.length ? names.map(k => {
        const inPairs = recs.filter(r => r.fields[k]).length, onZones = sum(r => r.fields[k]?.zones ?? 0);
        return `${k} differs in ${inPairs} pair${inPairs === 1 ? '' : 's'}, on ${onZones} zone${onZones === 1 ? '' : 's'} (${fieldDetail(k, recs)})`;
      }).join('; ') : 'no zone field differs')
      + `; the step log differs in ${recs.filter(r => r.logLines > 0).length} pairs, on ${sum(r => r.logLines)} of ${sum(r => r.logTotal)} lines; a crystal's count of zones differs in ${recs.filter(r => r.zoneCounts > 0).length} pair${recs.filter(r => r.zoneCounts > 0).length === 1 ? '' : 's'}${recs.some(r => r.extras.length) ? ` (${recs.flatMap(r => r.extras).join('; ')})` : ''}; a crystal's size or habit differs in ${recs.filter(r => r.sizes > 0).length}; crystal fields that differ: ${listed(crystalFields)}`);
  }
  const gap = (f) => Math.max(...below.flatMap(c => c.w.map((r, i) => f(r, c.e[i]))));
  const stepGap = (key) => {
    let worst = 0, oneSided = 0;
    for (const c of below) c.w.forEach((r, i) => {
      const a = r[key], b = c.e[i][key];
      if ((a == null) !== (b == null)) oneSided++;
      else if (a != null && Math.abs(a - b) > worst) worst = Math.abs(a - b);
    });
    return `${worst} step${worst === 1 ? '' : 's'} at most${oneSided ? `, and in ${oneSided} pair${oneSided === 1 ? '' : 's'} ONE FORM REACHES IT AND THE OTHER DOES NOT` : ''}`;
  };
  const verdicts = below.filter(c => c.lines).flatMap(c => c.lines);
  console.log(`  below 2 (${[...new Set(below.map(c => c.E))].sort((a, b) => a - b).join(', ')}): the same sizes and fill in ${sameRuns(below)} of ${runs(below)} pairs; the fill at the end of the run's own length apart by ${gap((a, b) => Math.abs(a.fill - b.fill) * 100).toFixed(4)} points at most, and the largest fill by ${gap((a, b) => Math.abs(a.maxFill - b.maxFill) * 100).toFixed(4)}; the first step at fill >= 0.7 apart by ${stepGap('first70')}, and at >= 0.999 by ${stepGap('full')}`);
  const horizons = below.filter(c => c.horizon != null);
  if (horizons.length) {
    const hGap = (key) => Math.max(...horizons.flatMap(c => c.w.map((r, i) => (r[key] == null || c.e[i][key] == null ? Infinity : Math.abs(r[key] - c.e[i][key])))));
    console.log(`  below 2, stepped on: the first step at fill >= 0.7 apart by ${hGap('first70On')} steps at most, and at >= 0.999 by ${hGap('fullOn')}`);
  }
  console.log(`  below 2, SC1's first acceptance line: ${verdicts.every(([a, b]) => a === b) ? `the same verdict under both forms in all ${verdicts.length} pairs of runs it was read on` : `A DIFFERENT VERDICT in ${verdicts.filter(([a, b]) => a !== b).length} of ${verdicts.length} pairs`}`);
}
{
  // the record comparison finds nothing between a run and the same run made again
  const r = records(run(42, own, { form: 'engine', E: 7 }), run(42, own, { form: 'engine', E: 7 }));
  console.log(`\ncontrol: the clamp in the engine at 7, seed 42, made twice ${Object.keys(r.fields).length === 0 && Object.keys(r.crystalFields).length === 0 && r.logLines === 0 && r.zoneCounts === 0 && r.sizes === 0 ? `differs in no field of ${r.zones} zones, in no crystal field and in none of ${r.logTotal} step-log lines` : 'DIFFERS FROM ITSELF'}`);
}
console.log(`control at the end: gem_pegmatite's shipped run at seed 42 ${run(42, own).summary === JSON.stringify(BASELINE.gem_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
