#!/usr/bin/env node
/**
 * probe-clamp-value.mjs — SC1's acceptance lines read at the clamp values between the ones the A/B
 * tool ran (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC1; §6 decision 1).
 *
 * The A/B outputs run the clamp on the feldspar pair's rate at 3, 7, 11, 15, 23 and 47
 * (ab-gem-clamp-sensitivity). Of those, 7 is the one value that meets the acceptance lines of SC1's
 * bump, and the document recommends 7. That does not say which values the lines admit. This probe
 * runs every whole value from 3 to 11 in gem_pegmatite's own cavity, at the three seeds the lines
 * are read at, and reads the three lines on each:
 *   the first line   the fill stays under 0.7 for the scenario's own 230 steps; some crystal stores a
 *                    positive zone after step 215; tourmaline 5 mm or more; topaz 1 mm or more; and
 *                    every species that has solid in the shipped run at that seed still has it
 *   the quartz line  a quartz crystal of 5 mm or more
 *   the pair line    the largest feldspar 15 mm or more and the largest albite 20 mm or more
 * Each run is then stepped on until its fill reaches 0.7 or 400 steps have run, which gives the
 * margin: how many steps past the scenario's own length the pocket stays under 0.7.
 *
 * The lowest and the highest value that meet all three lines at all three seeds are then run at
 * the eight further seeds probe-pegmatite-reach.mjs uses (3, 4, 5, 7, 13, 99, 2024, 17).
 *
 * The clamp is written inside the engine, as probe-clamp-in-engine.mjs writes it: for the length
 * of the engine's call and no longer, the mineral's σ method on the conditions returns
 * min(σ, E + 1), so the engine computes rate = k·min(σ − 1, E)·u and makes its own tests on that
 * rate. (At these values the previews' wrapper gives the same sizes and fill; that probe shows it
 * at 2, 3, 7 and 11.)
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes. Imports
 * tools/_harness.mjs and node builtins.
 * Controls: gem_pegmatite's shipped run at seed 42 is compared with the committed baseline, at the
 * start and at the end; the clamp at Infinity has to be the shipped run.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-clamp-value.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, getSimulationTimeScale } = await harness.loadSimBundle({
  toolName: 'probe-clamp-value',
  extraExports: ['MINERAL_ENGINES', 'getSimulationTimeScale'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const PAIR = ['feldspar', 'albite'];
const SEEDS = [42, 1, 2];
const FURTHER_SEEDS = [3, 4, 5, 7, 13, 99, 2024, 17];
const VALUES = [3, 4, 5, 6, 7, 8, 9, 10, 11];
const STEP_ON_TO = 400;
const FLOOR_UM = { tourmaline: 5000, topaz: 1000, quartz: 5000, feldspar: 15000, albite: 20000 };
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

// One run of gem_pegmatite in its own cavity. E: the clamp's value; null for the shipped run.
function run(seed, E = null) {
  const saved = {};
  try {
    if (E != null) {
      for (const m of PAIR) {
        const orig = saved[m] = MINERAL_ENGINES[m];
        const name = 'supersaturation_' + m;
        // the clamp inside the engine: for this call alone the engine reads min(σ, E + 1)
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const own = Object.prototype.hasOwnProperty.call(conditions, name);
          const shipped = conditions[name];
          conditions[name] = function () { const s = shipped.call(this); return s - 1 > E ? E + 1 : s; };
          try { return orig(crystal, conditions, step); }
          finally { if (own) conditions[name] = shipped; else delete conditions[name]; }
        };
      }
    }
    setSeed(seed);
    const made = SCENARIOS.gem_pegmatite({});
    const sim = new VugSimulator(made.conditions, made.events);
    const steps = made.defaultSteps;
    let maxFill = 0, first70 = null;
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      if (fill > maxFill) maxFill = fill;
      if (first70 == null && fill >= 0.7) first70 = sim.step;
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
    const out = { steps, fill: sim.get_vug_fill(), maxFill, first70, lastGrowth, species, summary: JSON.stringify(summarize(sim)) };
    // stepped on past the run's own length, to the step at which the fill first reaches 0.7
    let first70On = first70;
    while (E != null && first70On == null && sim.step < STEP_ON_TO) {
      sim.run_step();
      if (sim.get_vug_fill() >= 0.7) first70On = sim.step;
    }
    out.first70On = first70On;
    return out;
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

const size = (r, m) => r.species[m]?.max_um || 0;
const firstLine = (r, base) => r.maxFill < 0.7 && r.lastGrowth > 215
  && size(r, 'tourmaline') >= FLOOR_UM.tourmaline && size(r, 'topaz') >= FLOOR_UM.topaz
  && Object.keys(base.species).every(m => r.species[m]);
const quartzLine = (r) => size(r, 'quartz') >= FLOOR_UM.quartz;
const pairLine = (r) => size(r, 'feldspar') >= FLOOR_UM.feldspar && size(r, 'albite') >= FLOOR_UM.albite;
const each = (runs, f) => runs.map(f).join(' / ');
const range = (list) => {
  const v = list.filter(x => x != null);
  if (!v.length) return '—';
  return (Math.min(...v) === Math.max(...v) ? `${v[0]}` : `${Math.min(...v)} to ${Math.max(...v)}`) + (v.length < list.length ? ' (NOT REACHED AT SOME SEED)' : '');
};
// the smallest and the largest of a mineral's largest crystals over some runs, in mm
const rangeMm = (runs, m) => {
  const v = runs.map(r => size(r, m));
  const lo = mm(Math.min(...v)), hi = mm(Math.max(...v));
  return lo === hi ? lo : `${lo} to ${hi}`;
};
// how many steps after the run's last step the fill first reaches 0.7; negative when it does so inside the run
const margin = (r) => (r.first70On == null ? null : r.first70On - r.steps);

function block(E, runs, bases) {
  const lines = { first: runs.map((r, i) => firstLine(r, bases[i])), quartz: runs.map(quartzLine), pair: runs.map(pairLine) };
  console.log(`  E = ${String(E).padEnd(3)} largest fill of the run ${each(runs, r => (r.maxFill * 100).toFixed(1))} %; fill >= 0.7 first at step ${each(runs, r => r.first70On ?? `not by ${STEP_ON_TO}`)}, which is ${each(runs, r => margin(r) ?? '—')} steps after the run's last, ${runs[0].steps} (a negative number is inside the run)`);
  console.log(`          feldspar ${each(runs, r => mm(r.species.feldspar?.max_um))} mm; albite ${each(runs, r => mm(r.species.albite?.max_um))}; quartz ${each(runs, r => mm(r.species.quartz?.max_um))}; tourmaline ${each(runs, r => mm(r.species.tourmaline?.max_um))}; topaz ${each(runs, r => mm(r.species.topaz?.max_um))}; last step anything grew ${each(runs, r => r.lastGrowth)}`);
  const count = (list) => `${list.filter(Boolean).length} of ${list.length}`;
  console.log(`          the first line is met at ${count(lines.first)} seeds; the quartz line at ${count(lines.quartz)}; the pair line at ${count(lines.pair)}`);
  return lines;
}

console.log(`probe-clamp-value — SIM ${SIM_VERSION}; gem_pegmatite in its own cavity; the clamp written inside the engine; time scale ${getSimulationTimeScale()}`);
const shipped = SEEDS.map(seed => run(seed));
console.log(`controls at seed 42: the shipped run ${shipped[0].summary === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; the clamp at Infinity ${run(42, Infinity).summary === shipped[0].summary ? 'is the shipped run' : 'MOVES THE RUN'}`);
console.log(`floors of the lines: tourmaline ${mm(FLOOR_UM.tourmaline)} mm, topaz ${mm(FLOOR_UM.topaz)}, quartz ${mm(FLOOR_UM.quartz)}, feldspar ${mm(FLOOR_UM.feldspar)}, albite ${mm(FLOOR_UM.albite)}`);

console.log(`\nA — every whole value from ${VALUES[0]} to ${VALUES.at(-1)}, seeds ${SEEDS.join(' / ')}; each run stepped on until its fill reaches 0.7 or ${STEP_ON_TO} steps have run`);
const verdict = {};
const kept = {};
for (const E of VALUES) {
  const runs = SEEDS.map(seed => run(seed, E));
  const lines = block(E, runs, shipped);
  verdict[E] = { first: lines.first.every(Boolean), quartz: lines.quartz.every(Boolean), pair: lines.pair.every(Boolean) };
  kept[E] = runs;
}
const all3 = VALUES.filter(E => verdict[E].first && verdict[E].quartz && verdict[E].pair);
const says = (list) => list.join(', ') || 'none';
console.log(`\n  values that meet all three lines at all three seeds: ${says(all3)}`);
console.log(`  values that fail the first line at some seed: ${says(VALUES.filter(E => !verdict[E].first))}; the quartz line: ${says(VALUES.filter(E => !verdict[E].quartz))}; the pair line: ${says(VALUES.filter(E => !verdict[E].pair))}`);
if (all3.length) {
  for (const E of all3) {
    const runs = kept[E];
    console.log(`    E = ${E}: ${range(runs.map(margin))} steps of margin; the pocket ${range(runs.map(r => Math.round(r.maxFill * 100)))} % full at its fullest; feldspar ${rangeMm(runs, 'feldspar')} mm, albite ${rangeMm(runs, 'albite')} mm`);
  }
  const gems = all3.flatMap(E => kept[E]);
  console.log(`  over those values: tourmaline ${rangeMm(gems, 'tourmaline')} mm, topaz ${rangeMm(gems, 'topaz')} mm, quartz ${rangeMm(gems, 'quartz')} mm`);

  const ends = [...new Set([all3[0], all3.at(-1)])];
  console.log(`\nB — the lowest and the highest of those values at eight further seeds (${FURTHER_SEEDS.join(' / ')})`);
  const shippedFurther = FURTHER_SEEDS.map(seed => run(seed));
  console.log(`  shipped: full at every one of them: ${shippedFurther.every(r => r.maxFill >= 0.999) ? 'yes' : 'NO'}; species with solid ${each(shippedFurther, r => Object.keys(r.species).length)}`);
  for (const E of ends) {
    const runs = FURTHER_SEEDS.map(seed => run(seed, E));
    const lines = block(E, runs, shippedFurther);
    console.log(`          all three lines are met at ${runs.filter((_, i) => lines.first[i] && lines.quartz[i] && lines.pair[i]).length} of ${runs.length} of these seeds; margin ${range(runs.map(margin))} steps`);
  }
}
console.log(`\ncontrol at the end: gem_pegmatite's shipped run at seed 42 ${run(42).summary === JSON.stringify(BASELINE.gem_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
