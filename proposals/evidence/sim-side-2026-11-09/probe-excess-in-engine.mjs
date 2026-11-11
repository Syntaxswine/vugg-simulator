#!/usr/bin/env node
/**
 * probe-excess-in-engine.mjs — SC2's preview beside SC2 as it would be written into the three
 * engines (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC2; §7).
 *
 * SC2 puts galena, molybdenite and uraninite on rate = m·k·(σ − 1). The `excess` arm of
 * tools/sim-side-ab.mjs previews it with a WRAPPER round the engine: the engine runs as shipped
 * (rate = k·σ·u), and the positive zone it returns is rescaled by m·(σ − 1)/σ. Each of the three
 * engines makes one test on its own rate, `if (rate < 0.1) return null` (js/61-engines-sulfide.ts,
 * grow_molybdenite and grow_galena; js/57-engines-oxide.ts, grow_uraninite). Under the wrapper
 * that test has been made on the shipped rate, which is 6.4 or more wherever σ is 1 or more, so it
 * never fires. With the law written INSIDE the engine the test would be made on the new rate, and
 * a zone that the wrapper stores at under 0.1 µm would not be returned at all.
 *
 * The three engines read σ once, draw no random number after that test, and use the rate for
 * nothing but the thickness of the zone they return. So the law inside the engine gives the
 * wrapper's zone, or nothing where the rescaled thickness is under 0.1. A call that returns
 * nothing there has also not set the crystal's habit and forms, which the shipped engine sets
 * just after the test. This probe makes both runs: the wrapper as the A/B tool writes it, and
 * the same with those zones refused and the crystal's habit and forms put back.
 *
 * Runs: the eight scenarios SC2 moves, at seeds 42, 1 and 2: as shipped, and under each form at
 * m = 1 (the same constant) and at m = 3.
 *
 * Readings per run: the largest crystal with solid of each of the three minerals; the fill at the
 * end of the run; the bulk handle's Pb at the end; the positive zones the three engines returned,
 * and how many of them were under 0.1 µm after the rescale, with their steps. The two forms have
 * "the same sizes and fill" when their baseline-style summaries are equal and their fill after
 * every step agrees to a billionth of the cavity. Where the summaries differ, the species whose
 * entry differs are listed with both sizes. Each form is also compared with the shipped
 * run the way tools/sim-side-ab.mjs compares an arm: a species is present when one of its
 * crystals has solid; it is moved when its count of crystals with solid changes, or its largest
 * crystal changes by a factor of more than 1.25 (on the sizes plus one micrometre). The last
 * lines count the pairs in which the two forms give that comparison the same answer, and those
 * in which they leave the same lead on the bulk handle.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins. For one control it reads a committed A/B output,
 * ab-rate-on-excess.json in this folder.
 * Controls: at seed 42 every scenario's shipped run is compared with the committed baseline; and
 * the wrapper's largest fill of the run has to be that of the committed A/B run, for every
 * scenario, seed and m.
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

// One run. form: null for the shipped run, 'wrapper' for the A/B tool's `excess` arm, 'engine' for
// the law inside the engine. m: the multiple of the shipped constant.
function run(name, seed, form = null, m = 1) {
  const saved = {};
  const count = { positive: 0, under: 0, steps: [] };
  try {
    if (form != null) {
      for (const mineral of THREE) {
        const orig = saved[mineral] = MINERAL_ENGINES[mineral];
        MINERAL_ENGINES[mineral] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + mineral]();      // read before the engine runs; draws no random number
          const habit = crystal.habit, forms = crystal.dominant_forms;
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          const f = s > 0 ? m * Math.max(0, s - 1) / s : 0;           // tools/sim-side-ab.mjs, `excess`
          if (f !== 1) {
            zone.thickness_um *= f;
            if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
          }
          count.positive++;
          if (zone.thickness_um < 0.1) {
            count.under++;
            count.steps.push(step);
            if (form === 'engine') {
              // the engine's own test would have returned before it set the habit and the forms
              crystal.habit = habit;
              crystal.dominant_forms = forms;
              return null;
            }
          }
          return zone;
        };
      }
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const steps = defaultSteps ?? 100;
    let maxFill = 0;
    const fills = [];
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      fills.push(fill);
      if (fill > maxFill) maxFill = fill;
    }
    // presence as tools/sim-side-ab.mjs reads it: a species is present when one of its crystals has solid left
    const species = {};
    for (const c of sim.crystals) {
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    return { steps, fills, fill: sim.get_vug_fill(), maxFill, species, summary: JSON.stringify(summarize(sim)), bulkPb: Number(sim.conditions.fluid.Pb), count };
  } finally {
    for (const mineral of Object.keys(saved)) MINERAL_ENGINES[mineral] = saved[mineral];
  }
}

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

console.log(`probe-excess-in-engine — SIM ${SIM_VERSION}; ${NAMES.length} scenarios; seeds ${SEEDS.join(' / ')}; m = ${MULTIPLES.join(' and ')}; time scale ${getSimulationTimeScale()}`);
console.log('each line gives the three seeds; "under 0.1" are positive zones of the three minerals whose thickness is under 0.1 µm after the rescale\n');
const tally = {};          // m -> { pairs, same, under, parted: [text] }
let reproduced = 0, committed = 0, checked = 0;
for (const name of NAMES) {
  const shipped = SEEDS.map(seed => run(name, seed));
  if (shipped[0].summary === JSON.stringify(BASELINE[name])) reproduced++;
  const each = (runs, f) => runs.map(f).join(' / ');
  const sizes = (runs) => THREE.filter(mineral => runs.some(r => r.species[mineral])).map(mineral => `${mineral} ${each(runs, r => mm(r.species[mineral]?.max_um))} mm`).join('; ') || 'none of the three holds solid';
  console.log(`  ${name}, ${shipped[0].steps} steps`);
  console.log(`    ${'shipped'.padEnd(22)} ${sizes(shipped)}; fill at the end ${each(shipped, r => (r.fill * 100).toFixed(1))} %; Pb on the bulk handle at the end ${each(shipped, r => r.bulkPb.toFixed(1))}`);
  for (const m of MULTIPLES) {
    const w = SEEDS.map(seed => run(name, seed, 'wrapper', m));
    const e = SEEDS.map(seed => run(name, seed, 'engine', m));
    const t = (tally[m] ||= { pairs: 0, same: 0, under: 0, underPairs: 0, parted: [], sameVerdict: 0, samePb: 0 });
    for (let i = 0; i < SEEDS.length; i++) {
      checked++;
      if (against(shipped[i], w[i]) === against(shipped[i], e[i])) t.sameVerdict++;
      if (w[i].bulkPb === e[i].bulkPb) t.samePb++;
      const ab = AB.runs.find(r => r.scenario === name && r.seed === SEEDS[i]);
      if (ab && ab.B[`excess=${m}`] && Math.abs(ab.B[`excess=${m}`].maxFill - w[i].maxFill) < 1e-12) committed++;
      t.pairs++;
      if (same(w[i], e[i])) t.same++;
      else t.parted.push(`${name} at seed ${SEEDS[i]} (fill at the end ${(w[i].fill * 100).toFixed(1)} % under the wrapper, ${(e[i].fill * 100).toFixed(1)} % in the engine; summary ${w[i].summary === e[i].summary ? 'equal' : `differs, wrapper against engine: ${differing(w[i], e[i])}`}; fill apart at some step by ${fillApart(w[i], e[i]) < 1e-4 ? `${fillApart(w[i], e[i]).toExponential(1)} of the cavity` : `${(fillApart(w[i], e[i]) * 100).toFixed(2)} points`} at most; against shipped, wrapper: ${against(shipped[i], w[i])}; in the engine: ${against(shipped[i], e[i])})`);
      if (e[i].count.under > 0) { t.under += e[i].count.under; t.underPairs++; }
    }
    const line = (runs) => `${sizes(runs)}; fill at the end ${each(runs, r => (r.fill * 100).toFixed(1))} %; Pb on the bulk handle at the end ${each(runs, r => r.bulkPb.toFixed(1))}; under 0.1: ${each(runs, r => `${r.count.under} of ${r.count.positive}${r.count.under ? ` (${stepsOf(r.count.steps)})` : ''}`)}`;
    console.log(`    ${`m = ${m}, wrapper`.padEnd(22)} ${line(w)}`);
    console.log(`    ${`m = ${m}, in the engine`.padEnd(22)} ${line(e)}`);
    const sameAt = SEEDS.map((_, i) => same(w[i], e[i]));
    console.log(`    ${''.padEnd(22)} the two forms: ${sameAt.every(Boolean) ? 'the same sizes and fill at every seed' : `the same sizes and fill at ${sameAt.filter(Boolean).length} of ${sameAt.length} seeds`}; against shipped, wrapper: ${each(w, (r, i) => against(shipped[i], r))} | in the engine: ${each(e, (r, i) => against(shipped[i], r))}`);
  }
}

console.log('');
for (const m of MULTIPLES) {
  const t = tally[m];
  console.log(`m = ${m}: the two forms have the same sizes and fill in ${t.same} of ${t.pairs} pairs; the engine would refuse ${t.under} zone${t.under === 1 ? '' : 's'}, in ${t.underPairs} pair${t.underPairs === 1 ? '' : 's'}`);
  for (const text of t.parted) console.log(`    they part in ${text}`);
  console.log(`    against the shipped run the two forms move, lose and gain the same species in ${t.sameVerdict} of ${t.pairs} pairs; the bulk handle's Pb at the end is the same number under both in ${t.samePb}`);
}
console.log(`\ncontrols: at seed ${SEEDS[0]} the shipped run ${reproduced === NAMES.length ? `reproduces the baseline for all ${NAMES.length} scenarios` : `DOES NOT REPRODUCE THE BASELINE for ${NAMES.length - reproduced} of ${NAMES.length} scenarios`}; the wrapper's largest fill of the run ${committed === checked ? `is that of the committed A/B run in all ${checked} runs (ab-rate-on-excess.json)` : `IS NOT THAT OF THE COMMITTED A/B RUN in ${checked - committed} of ${checked} runs`}`);
