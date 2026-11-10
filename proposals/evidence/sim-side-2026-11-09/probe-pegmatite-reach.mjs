#!/usr/bin/env node
/**
 * probe-pegmatite-reach.mjs — where the feldspar runaway of F1 lives besides the three seeds of
 * gem_pegmatite that the A/B outputs cover, and what reaches it
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1, §4 SC1).
 *
 * Part 1. gem_pegmatite at eleven seeds (42, 1 and 2, and eight more), three ways:
 *   shipped
 *   local fill   the scenario's wall opts in to `per_cell_local_fill`, a switch the tree already
 *                has (js/22-geometry-wall.ts, js/85-simulator.ts; shipped at v77 as Proposal E of
 *                the high-fill research, and used by no scenario): the fill dampener reads the
 *                fill of the crystal's own cell where it has one, not the cavity's
 *   rate clamp   the rate of feldspar and albite clamped, k·min(σ − 1, 7), written as the
 *                `rclamp=7` arm of tools/sim-side-ab.mjs writes it. This is SC1 as recommended.
 * For each arm it also counts the seeds at which the first of SC1's pre-registered acceptance lines
 * holds: fill under 0.7 for the whole run, a positive zone stored after step 215, tourmaline of
 * 5 mm or more, topaz of 1 mm or more, and no species that has solid as shipped left without it.
 *
 * Part 2. Random Vugg's `pegmatite` archetype (js/96-ui-random.ts, buildRandomScenario), size class
 * pocket, at eight seeds, shipped and with the same rate clamp. That builder makes no scenario
 * object, so a bound carried on one cannot reach it. The clamp is applied here in process, to show
 * what a bound would do in that mode if it were authored there too.
 *
 * Part 3. Three other ways the game starts a run on a pegmatite's fluid, at seeds 42, 1 and 2,
 * each through the game's own constructor, shipped and with the same clamp in process.
 *   Creative, a scenario   fortressBeginFromScenario('gem_pegmatite', seed) (js/94-ui-menu.ts). It
 *                keeps the scenario object and gives the run a conserved carbonate boundary where
 *                the scenario authors none, so it is not the run the baseline pins. 230 steps.
 *   Creative, a starter    fortressBeginFromStarterFluid('radioactive', seed): that scenario's fluid
 *                at 200 °C in a 50 mm limestone cavity, no events, no scenario object. 120 steps.
 *   Zen mode     idleCreateSim('gem_pegmatite') (js/98a-ui-zen.ts). It copies the scenario's
 *                temperature, pressure, fluid and wall onto new conditions, and passes no events
 *                and no scenario object. It takes its seed from the clock, so the clock is held at
 *                the seed for the length of that one call. The game enters Zen through
 *                switchMode('idle'), which sets the time scale to 1 where the other modes set 5
 *                (js/94-ui-menu.ts); a stored zone is the engine's proposal times that scale. So
 *                the Zen runs are made at a time scale of 1, set through setSimulationTimeScale
 *                (js/13-runtime-state.ts), and the scale is put back to 5 afterwards. (switchMode
 *                itself is called once for each of four modes, only to print the scale it leaves.)
 *                Zen has no
 *                end, so the simulator is stepped 400 times with run_step alone. Zen's own drift
 *                (idleApplyDrift: a random walk on temperature, nine fluid species and pH, and a
 *                2 % chance a step of a random event) is not reproduced here. A run without the
 *                scenario object has none of the scenario's license or exclusions, so the minerals
 *                on record that the scenario does not license are listed.
 * The two Creative constructors and Zen's write to the page's in-memory state (a visible simulator,
 * a strip recorder, an autosave record) and to no file.
 *
 * Readings per run: fill at run end and the largest fill of the run; the first step at fill >= 0.7
 * and at >= 0.999; the last step on which any crystal stored a positive zone; the largest crystal
 * with solid left of each species named. A species is present when one of its crystals has solid.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports tools/_harness.mjs and node builtins.
 * Controls: at seed 42 gem_pegmatite's shipped run is compared with the committed baseline, at the
 * start and again after Part 3 with the time scale read back; the run with the switch set to false
 * explicitly, and the run with the clamp at Infinity, have to be the shipped run; and the first
 * Zen run is made again after the others and has to be the same run.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-pegmatite-reach.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, buildRandomScenario,
  idleCreateSim, fortressBeginFromScenario, fortressBeginFromStarterFluid,
  setSimulationTimeScale, getSimulationTimeScale, switchMode,
} = await harness.loadSimBundle({
  toolName: 'probe-pegmatite-reach',
  extraExports: ['MINERAL_ENGINES', 'buildRandomScenario', 'idleCreateSim', 'fortressBeginFromScenario',
    'fortressBeginFromStarterFluid', 'setSimulationTimeScale', 'getSimulationTimeScale', 'switchMode'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const PAIR = ['feldspar', 'albite'];
const GEM_SEEDS = [42, 1, 2, 3, 4, 5, 7, 13, 99, 2024, 17];
const RANDOM_SEEDS = [42, 1, 2, 3, 4, 5, 6, 7];
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

// One run. make(seed) is called after the seed is set and returns { conditions, events,
// defaultSteps }, or { sim, defaultSteps } where the game's own constructor built the simulator.
function run(seed, make, { localFill = null, clamp = null } = {}) {
  const saved = {};
  try {
    if (clamp != null) {
      for (const m of PAIR) {
        const orig = saved[m] = MINERAL_ENGINES[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + m]();           // read before the engine runs; draws no random number
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          if (s - 1 > clamp) {
            const f = clamp / (s - 1);
            zone.thickness_um *= f;
            if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
          }
          return zone;
        };
      }
    }
    setSeed(seed);
    const made = make(seed);
    const conditions = made.sim ? made.sim.conditions : made.conditions;
    if (localFill != null) conditions.wall.per_cell_local_fill = localFill;
    const start = {
      diameter: Number(conditions.wall.vug_diameter_mm), scenario: conditions._scenario != null,
      events: made.sim ? (made.sim.events || []).length : (made.events || []).length,
      temperature: conditions.temperature,
      SiO2: conditions.fluid.SiO2, K: conditions.fluid.K, Na: conditions.fluid.Na, Al: conditions.fluid.Al,
      feldspar: conditions.supersaturation_feldspar(), albite: conditions.supersaturation_albite(),
    };
    const sim = made.sim || new VugSimulator(conditions, made.events);
    const steps = made.defaultSteps ?? 100;
    let maxFill = 0, first70 = null, full = null;
    const fills = [];                                               // fill after each step
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      const fill = sim.get_vug_fill();
      fills.push(fill);
      if (fill > maxFill) maxFill = fill;
      if (first70 == null && fill >= 0.7) first70 = sim.step;
      if (full == null && fill >= 0.999) full = sim.step;
    }
    const species = {};
    let lastGrowth = 0;
    for (const c of sim.crystals) {
      for (const z of c.zones) if (z.thickness_um > 0 && z.step > lastGrowth) lastGrowth = z.step;
      if (!(c.total_growth_um > 0)) continue;
      const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
    }
    return { start, steps, fill: sim.get_vug_fill(), maxFill, first70, full, lastGrowth, species, summary: summarize(sim), fills,
      boundary: !!sim._carbonateBoundaryState,                                   // a carbonate boundary on the simulator
      records: [...new Set(sim.crystals.map(c => c.mineral))].sort() };          // every mineral with a crystal on record at run end
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

console.log(`probe-pegmatite-reach — SIM ${SIM_VERSION}`);

// ---- part 1 ----
const gem = () => SCENARIOS.gem_pegmatite();
const same = (a, b) => JSON.stringify(a.summary) === JSON.stringify(b.summary);
const shipped = GEM_SEEDS.map(seed => run(seed, gem));
console.log(`\nPART 1 — gem_pegmatite, seeds ${GEM_SEEDS.join(' / ')}`);
console.log(`controls at seed 42: the shipped run ${JSON.stringify(shipped[0].summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; `
  + `per_cell_local_fill set to false ${same(shipped[0], run(42, gem, { localFill: false })) ? 'is the shipped run' : 'MOVES THE RUN'}; `
  + `the clamp at Infinity ${same(shipped[0], run(42, gem, { clamp: Infinity })) ? 'is the shipped run' : 'MOVES THE RUN'}`);
const ARMS = [
  ['shipped', shipped],
  ['local fill (per_cell_local_fill: true)', GEM_SEEDS.map(seed => run(seed, gem, { localFill: true }))],
  ['rate clamp at 7 (SC1 as recommended)', GEM_SEEDS.map(seed => run(seed, gem, { clamp: 7 }))],
];
for (const [label, runs] of ARMS) {
  const each = (f) => runs.map(f).join(' / ');
  const accepted = runs.filter((r, i) => r.maxFill < 0.7 && r.lastGrowth > 215
    && (r.species.tourmaline?.max_um || 0) >= 5000 && (r.species.topaz?.max_um || 0) >= 1000
    && Object.keys(shipped[i].species).every(m => r.species[m]));
  console.log(`\n  ${label}`);
  console.log(`    largest fill of the run, %     ${each(r => (r.maxFill * 100).toFixed(0))}`);
  console.log(`    first step at fill >= 0.7      ${each(r => r.first70 ?? '—')}`);
  console.log(`    first step at fill >= 0.999    ${each(r => r.full ?? '—')}`);
  console.log(`    last step anything grew        ${each(r => r.lastGrowth)}`);
  for (const m of ['tourmaline', 'topaz', 'spodumene', 'lepidolite', 'quartz', 'feldspar', 'albite']) {
    console.log(`    ${(m + ', mm').padEnd(30)} ${each(r => mm(r.species[m]?.max_um))}`);
  }
  console.log(`    reaches fill >= 0.999 at ${runs.filter(r => r.full != null).length} of ${runs.length} seeds; passes 0.7 at ${runs.filter(r => r.first70 != null).length}; topaz has solid at ${runs.filter(r => r.species.topaz).length}; SC1's first acceptance line holds at ${accepted.length}`);
}

// ---- part 2 ----
console.log(`\nPART 2 — Random Vugg, archetype pegmatite, size class pocket, seeds ${RANDOM_SEEDS.join(' / ')}`);
const random = () => buildRandomScenario('pegmatite', 'pocket');
const rShipped = RANDOM_SEEDS.map(seed => run(seed, random));
const rClamp = RANDOM_SEEDS.map(seed => run(seed, random, { clamp: 7 }));
console.log(`  scenario object on the conditions: ${rShipped.some(r => r.start.scenario) ? 'PRESENT at some seed' : 'absent at every seed'}`);
{
  const each = (f) => rShipped.map(f).join(' / ');
  console.log(`  steps ${each(r => r.steps)}; cavity, mm ${each(r => r.start.diameter.toFixed(0))}`);
  console.log(`  broth: SiO2 ${each(r => r.start.SiO2.toFixed(0))}; K ${each(r => r.start.K.toFixed(0))}; Na ${each(r => r.start.Na.toFixed(0))}; Al ${each(r => r.start.Al.toFixed(0))}`);
  console.log(`  sigma on the bulk fluid at the start: feldspar ${each(r => r.start.feldspar.toFixed(0))}; albite ${each(r => r.start.albite.toFixed(0))}`);
}
for (const [label, runs] of [['shipped', rShipped], ['rate clamp at 7', rClamp]]) {
  const each = (f) => runs.map(f).join(' / ');
  console.log(`\n  ${label}`);
  console.log(`    fill at run end, %             ${each(r => (r.fill * 100).toFixed(0))}`);
  console.log(`    largest fill of the run, %     ${each(r => (r.maxFill * 100).toFixed(0))}`);
  console.log(`    first step at fill >= 0.7      ${each(r => r.first70 ?? '—')}`);
  console.log(`    first step at fill >= 0.999    ${each(r => r.full ?? '—')}`);
  console.log(`    last step anything grew        ${each(r => r.lastGrowth)}`);
  for (const m of ['feldspar', 'albite', 'quartz', 'tourmaline', 'topaz']) {
    console.log(`    ${(m + ', mm').padEnd(30)} ${each(r => mm(r.species[m]?.max_um))}`);
  }
  console.log(`    reaches fill >= 0.999 at ${runs.filter(r => r.full != null).length} of ${runs.length} seeds; passes 0.7 at ${runs.filter(r => r.first70 != null).length}`);
}

// ---- part 3 ----
const OTHER_SEEDS = [42, 1, 2];
const ZEN_STEPS = 400;
console.log(`\nPART 3 — three other ways the game starts a run on a pegmatite's fluid, seeds ${OTHER_SEEDS.join(' / ')}`);
{
  // What the game's own mode switch leaves the time scale at (js/94-ui-menu.ts, switchMode). The
  // scale is put back to its value at load before anything is run.
  const atLoad = getSimulationTimeScale();
  const after = [];
  for (const [mode, name] of [['legends', 'Simulation'], ['fortress', 'Creative'], ['random', 'Random Vugg'], ['idle', 'Zen']]) {
    let threw = '';
    try { switchMode(mode); } catch (e) { threw = ` (the call threw: ${String(e && e.message).slice(0, 60)})`; }
    after.push(`${name} ${getSimulationTimeScale()}${threw}`);
  }
  setSimulationTimeScale(atLoad);
  console.log(`  time scale at load, which every run above uses: ${atLoad}; after the game's own switchMode into each mode: ${after.join(', ')}`);
}
function report(label, runs, at = null) {
  const each = (f) => runs.map(f).join(' / ');
  console.log(`      ${label.padEnd(16)} largest fill of the run ${each(r => (r.maxFill * 100).toFixed(0))} %${at ? `, fill at step ${at} ${each(r => (r.fills[at - 1] * 100).toFixed(0))} %` : ''}; first step at fill >= 0.7 ${each(r => r.first70 ?? '—')}; at >= 0.999 ${each(r => r.full ?? '—')}; last step anything grew ${each(r => r.lastGrowth)}`);
  console.log(`      ${''.padEnd(16)} feldspar ${each(r => mm(r.species.feldspar?.max_um))} mm; albite ${each(r => mm(r.species.albite?.max_um))}; quartz ${each(r => mm(r.species.quartz?.max_um))}; tourmaline ${each(r => mm(r.species.tourmaline?.max_um))}; topaz ${each(r => mm(r.species.topaz?.max_um))}`);
}

console.log('\n  A scenario opened in Creative mode: fortressBeginFromScenario(\'gem_pegmatite\', seed) itself (js/94-ui-menu.ts); 230 steps of run_step alone');
{
  const creative = (seed) => {
    const launch = fortressBeginFromScenario('gem_pegmatite', seed);
    if (!launch || !launch.sim) throw new Error('fortressBeginFromScenario returned no simulator under the harness');
    return { sim: launch.sim, defaultSteps: 230 };
  };
  const cShipped = OTHER_SEEDS.map(seed => run(seed, creative));
  const cClamp = OTHER_SEEDS.map(seed => run(seed, creative, { clamp: 7 }));
  console.log(`      scenario object on the conditions: ${cShipped.every(r => r.start.scenario) ? 'present at every seed' : 'ABSENT at some seed'}; a carbonate boundary on the simulator: ${cShipped.every(r => r.boundary) ? 'at every seed' : cShipped.some(r => r.boundary) ? 'at some seeds' : 'at none'} (the scenario's own run, Part 1: ${shipped.slice(0, 3).some(r => r.boundary) ? 'has one' : 'has none'})`);
  console.log(`      the seed-42 run ${JSON.stringify(cShipped[0].summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'is the baseline\'s run' : 'is not the baseline\'s run'}`);
  report('shipped', cShipped);
  report('rate clamp at 7', cClamp);
}

console.log('\n  Creative mode, starter fluid "Radioactive Pegmatite": fortressBeginFromStarterFluid(\'radioactive\', seed) itself (js/94-ui-menu.ts); 120 steps of run_step alone');
{
  const starter = (seed) => {
    fortressBeginFromStarterFluid('radioactive', seed);
    const sim = globalThis.window?.vugg?.fortressSim;
    if (!sim) throw new Error('fortressBeginFromStarterFluid left no simulator under the harness');
    return { sim, defaultSteps: 120 };
  };
  const sShipped = OTHER_SEEDS.map(seed => run(seed, starter));
  const sClamp = OTHER_SEEDS.map(seed => run(seed, starter, { clamp: 7 }));
  const each = (f) => sShipped.map(f).join(' / ');
  setSeed(42);
  const own = SCENARIOS.radioactive_pegmatite().conditions;
  console.log(`      scenario object on the conditions: ${sShipped.some(r => r.start.scenario) ? 'PRESENT at some seed' : 'absent at every seed'}; cavity ${each(r => r.start.diameter.toFixed(0))} mm; SiO2 ${each(r => r.start.SiO2.toFixed(0))} (the scenario's own: ${own.fluid.SiO2.toFixed(0)})`);
  console.log(`      sigma on the bulk fluid when the constructor returns: feldspar ${each(r => r.start.feldspar.toFixed(1))}, albite ${each(r => r.start.albite.toFixed(1))} (the scenario's own at its start: ${own.supersaturation_feldspar().toFixed(1)}, ${own.supersaturation_albite().toFixed(1)})`);
  report('shipped', sShipped);
  report('rate clamp at 7', sClamp);
}

// Zen mode goes last, at Zen's own time scale.
console.log(`\n  Zen mode: idleCreateSim('gem_pegmatite') itself (js/98a-ui-zen.ts), the clock held at the seed, at Zen's time scale of 1; ${ZEN_STEPS} steps of run_step alone. Zen's own drift is not reproduced.`);
setSimulationTimeScale(1);
try {
  setSeed(42);
  const own = SCENARIOS.gem_pegmatite();
  const zen = (seed) => {
    const clock = Date.now;
    Date.now = () => seed;                       // idleCreateSim seeds from the clock
    try { return { sim: idleCreateSim('gem_pegmatite'), defaultSteps: ZEN_STEPS }; } finally { Date.now = clock; }
  };
  const zShipped = OTHER_SEEDS.map(seed => run(seed, zen));
  const zClamp = OTHER_SEEDS.map(seed => run(seed, zen, { clamp: 7 }));
  const each = (f) => zShipped.map(f).join(' / ');
  console.log(`      time scale during these runs: ${getSimulationTimeScale()}`);
  console.log(`      scenario object on the conditions: ${zShipped.some(r => r.start.scenario) ? 'PRESENT at some seed' : 'absent at every seed'} (on the scenario's own conditions: ${own.conditions._scenario != null ? 'present' : 'absent'}); events ${each(r => r.start.events)} (the scenario's own: ${own.events.length})`);
  console.log(`      sigma on the bulk fluid at the start: feldspar ${each(r => r.start.feldspar.toFixed(0))}, albite ${each(r => r.start.albite.toFixed(0))} (the scenario's own: ${own.conditions.supersaturation_feldspar().toFixed(0)}, ${own.conditions.supersaturation_albite().toFixed(0)})`);
  report('shipped', zShipped, 230);
  report('rate clamp at 7', zClamp, 230);
  // Without the scenario object the run has none of the scenario's license or exclusions
  // (js/85j-movements.ts, _scenarioPositiveLicenseBlock and _scenarioSpeciesExclusion).
  const s = own.conditions._scenario || {};
  const licensed = new Set([s.expects_species, s.deterministic_species, s.statistical_species, s.aspirational_species]
    .flatMap(list => (Array.isArray(list) ? list : []).map(e => (typeof e === 'string' ? e : e?.mineral))).filter(Boolean));
  const excluded = new Set(Object.keys(s.excluded_species || {}));
  console.log(`      minerals on record, shipped, that the scenario does not license: ${zShipped.map(r => r.records.filter(m => !licensed.has(m))
    .map(m => `${m}${excluded.has(m) ? ' (excluded by the scenario)' : ''}`).join(', ') || 'none').join(' / ')}`);
  console.log(`      control: the first Zen run, made again after the other five, ${JSON.stringify(run(OTHER_SEEDS[0], zen).summary) === JSON.stringify(zShipped[0].summary) ? 'is the same run' : 'IS A DIFFERENT RUN'}`);
} finally {
  setSimulationTimeScale(5);
}
console.log(`\ncontrols after Part 3: the time scale reads ${getSimulationTimeScale()}; gem_pegmatite's shipped run at seed 42 ${JSON.stringify(run(42, gem).summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
