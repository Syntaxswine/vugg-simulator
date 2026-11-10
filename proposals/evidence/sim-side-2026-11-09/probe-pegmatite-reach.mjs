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
 * Random Vugg's page has a Cavity size select of its own (index.html, #random-size-class), whose
 * value runRandomVugg hands to the builder (js/96-ui-random.ts). It opens on "Any size", for which
 * the builder draws a class from vug, pocket, pocket, cave. So the same eight seeds are run again
 * at the settings vug, cave and any, shipped and with the clamp; and the vug setting once more
 * with the clamp at 0, under which every positive zone of the pair is rescaled to nothing, to see
 * whether any bound on the pair could hold a cavity of that class. The select's own labels are
 * printed beside the range each class is drawn from.
 * The eight seeds draw pockets of 34 mm and more, and the pocket class is drawn from 25 mm up. So
 * every seed from 1 to 400 whose pocket is under 40 mm is run as well, shipped and with the clamp
 * at 7, and the mineral that holds the largest share of each at the end is printed.
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
 * Part 4. Simulation mode's own form (index.html, #legends-controls; js/91-ui-legends.ts,
 * runSimulation). Besides the scenario and the growth seed it has three boxes that reach the run:
 * Time Steps (probe-clamp-horizon.mjs steps the run on), Cavity Size and Shape Seed. Both of the
 * last two become overrides on the scenario's wall, handed to the scenario's factory by
 * startSimulationCommandRuntime (js/85l-simulation-command-protocol.ts), and the probe builds each
 * run through that function with the overrides the form builds:
 *   Cavity Size   vug, pocket or cave: { wall: { size_class, vug_diameter_mm } }, the diameter from
 *                 resolveSizeClassToMm (js/22-geometry-wall.ts), the midpoint of the class's range.
 *                 Shipped and with the rate clamp at 7, seeds 42, 1 and 2.
 *   Shape Seed    { wall: { shape_seed } }, which the form's Random button draws afresh for every
 *                 run. Ten shape seeds at growth seed 42, shipped and with the clamp.
 *   The vug again, with the clamp at 3, at 1 and at 0. Under the clamp at 0 every positive zone
 *                 of the pair is rescaled to nothing, so the pair holds no solid: what the vug
 *                 does then is what no bound on the pair can change. Like the clamp at 1 of
 *                 probe-clamp-horizon.mjs, the arms at 1 and 0 preview no value of the bound
 *                 (the engine still draws its inclusion roll on the rate it proposed). Each run
 *                 also gives every mineral's share of the cavity's volume at the end, summed
 *                 the way get_vug_fill sums the fill.
 *   SC1's other courses in the vug: the fill switch, the change to the broth that
 *                 ab-gem-broth previews (SiO2 × 0.1 and Al × 0.15, with no bound) and the
 *                 rind at 5 mm. Each is a change made between the scenario's factory and the
 *                 simulator's constructor, so these runs are built through the factory with
 *                 the form's overrides, which is what the command runtime calls. Two controls:
 *                 the vug built that way has to be the run the command runtime builds, and the
 *                 change to the broth in the scenario's own cavity has to reach the largest
 *                 fill of the committed A/B run (ab-gem-broth.json in this folder is read).
 *   Pairs of those changes in the vug: the change to the broth with the pair's rate clamped as
 *                 well, at 7, 3, 2, 1.5, 1 and 0; the fill switch with the clamp at 7; the rind
 *                 with the clamp at 7. And the one pair that keeps the vug under 0.7 full, run
 *                 again in the scenario's own cavity. The clamp wrapper rescales the zone an
 *                 engine returns, after the engine has made its own tests on the rate it
 *                 proposed. Feldspar's rate is 3·(σ − 1)·u with u between 0.7 and 1.3, and it
 *                 rolls for an inclusion above a rate of 4 (js/59-engines-silicate.ts); albite's
 *                 is 4·(σ − 1)·u with u between 0.8 and 1.2, and it rolls for a platy habit
 *                 below a rate of 3 at under 350 °C. A clamp inside the engine at 2 leaves both
 *                 tests where the wrapper leaves them (feldspar 4.2 to 7.8, albite 6.4 to 9.6).
 *                 At 1.5 feldspar's clamped rate would be 3.15 to 5.85 and at 1 it would be 2.1
 *                 to 3.9, so the engine would make the inclusion roll sometimes or never, where
 *                 under the wrapper it always makes it. Those arms are not a preview of a value.
 * The runs are stepped with run_step, as every run of this probe is. Simulation mode steps through
 * applySimulationCommand, one step to a command; a control makes the seed-42 run that way and
 * compares it with the baseline and with the run stepped by run_step.
 *
 * Readings per run: fill at run end and the largest fill of the run; the first step at fill >= 0.7
 * and at >= 0.999; the last step on which any crystal stored a positive zone; the largest crystal
 * with solid left of each species named. A species is present when one of its crystals has solid.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes, and throws if one of
 * the game's constructors leaves no simulator under the harness. Imports tools/_harness.mjs and
 * node builtins.
 * Controls: at seed 42 gem_pegmatite's shipped run is compared with the committed baseline, at the
 * start and again after Part 3 with the time scale read back; the run with the switch set to false
 * explicitly, and the run with the clamp at Infinity, have to be the shipped run; and the first
 * Zen run is made again after the others and has to be the same run. Part 4 has its own (above).
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
  startSimulationCommandRuntime, makeSimulationStartCommand, makeSimulationAdvanceCommand, applySimulationCommand,
  resolveSizeClassToMm, _crystalSolidVolumeMm3,
} = await harness.loadSimBundle({
  toolName: 'probe-pegmatite-reach',
  extraExports: ['MINERAL_ENGINES', 'buildRandomScenario', 'idleCreateSim', 'fortressBeginFromScenario',
    'fortressBeginFromStarterFluid', 'setSimulationTimeScale', 'getSimulationTimeScale', 'switchMode',
    'startSimulationCommandRuntime', 'makeSimulationStartCommand', 'makeSimulationAdvanceCommand', 'applySimulationCommand',
    'resolveSizeClassToMm', '_crystalSolidVolumeMm3'],
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
//   localFill   sets the wall's per_cell_local_fill
//   clamp       the pair's rate becomes k·min(σ − 1, clamp)
//   rind        the pair stores no positive zone once a crystal has reached this size, µm (the
//               `rind` arm of tools/sim-side-ab.mjs, written the same way)
//   mul         [[field, factor], …]: the scenario's initial fluid, multiplied before the simulator
//               is built (the `mul` arm of that tool, written the same way)
function run(seed, make, { localFill = null, clamp = null, rind = null, mul = null } = {}) {
  const saved = {};
  try {
    if (clamp != null || rind != null) {
      for (const m of PAIR) {
        const orig = saved[m] = MINERAL_ENGINES[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + m]();           // read before the engine runs; draws no random number
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          if (rind != null && crystal.total_growth_um >= rind) return null;
          if (clamp != null && s - 1 > clamp) {
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
    if (mul) {
      if (made.sim) throw new Error('a change to the broth has to be made before the simulator is built');
      for (const [field, x] of mul) {
        if (typeof conditions.fluid[field] !== 'number') throw new Error(`fluid has no numeric field ${field}`);
        conditions.fluid[field] *= x;
      }
    }
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
    // each mineral's share of the cavity's volume, summed as get_vug_fill sums the fill
    const capacityMm3 = Number(sim.conditions.wall.cavity_capacity_volume_mm3);
    const volume = {};
    for (const c of sim.crystals) {
      if (c.dissolved === true) continue;
      volume[c.mineral] = (volume[c.mineral] || 0) + _crystalSolidVolumeMm3(c);
    }
    const share = Object.entries(volume).map(([m, v]) => [m, v / capacityMm3]).sort((a, b) => b[1] - a[1]);
    return { start, steps, fill: sim.get_vug_fill(), maxFill, first70, full, lastGrowth, species, summary: summarize(sim), fills, share,
      sizeClass: made.sizeClass ?? null,                                         // the class Random Vugg's builder drew
      capacity: Number(sim.conditions.wall.cavity_capacity_volume_mm3),          // what get_vug_fill divides by, mm3
      shapeSeed: sim.conditions.wall.shape_seed ?? null,
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

// Random Vugg's own Cavity size select: the settings other than pocket.
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const select = /<select id="random-size-class"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  const options = select ? [...select[1].matchAll(/<option value="([^"]*)"([^>]*)>([^<]*)<\/option>/g)] : [];
  console.log(`\n  Random Vugg's own Cavity size select (index.html, #random-size-class), its options in order: ${options.map(o => `${o[1]} "${o[3].trim()}"`).join(', ') || 'NOT FOUND'}; marked selected: ${options.filter(o => /\bselected\b/.test(o[2])).map(o => o[1]).join(', ') || 'none, so the page opens on the first'}`);
  console.log(`  the range each class is drawn from (resolveSizeClassToMm at a draw of 0 and of 1): ${['vug', 'pocket', 'cave'].map(c => `${c} ${resolveSizeClassToMm(c, 0)} to ${resolveSizeClassToMm(c, 1)} mm`).join('; ')}`);
  for (const size of ['vug', 'cave', 'any']) {
    const make = () => buildRandomScenario('pegmatite', size);
    const arms = [['shipped', RANDOM_SEEDS.map(seed => run(seed, make))], ['rate clamp at 7', RANDOM_SEEDS.map(seed => run(seed, make, { clamp: 7 }))]];
    if (size === 'vug') arms.push(['rate clamp at 0 (the pair holds no solid)', RANDOM_SEEDS.map(seed => run(seed, make, { clamp: 0 }))]);
    const first = arms[0][1];
    console.log(`\n  size setting ${size}, seeds ${RANDOM_SEEDS.join(' / ')}: class drawn ${first.map(r => r.sizeClass).join(' / ')}; cavity, mm ${first.map(r => r.start.diameter.toFixed(0)).join(' / ')}; steps ${first.map(r => r.steps).join(' / ')}; SiO2 ${first.map(r => r.start.SiO2.toFixed(0)).join(' / ')}`);
    for (const [label, runs] of arms) {
      const each = (f) => runs.map(f).join(' / ');
      console.log(`    ${label}`);
      console.log(`      fill at run end, % ${each(r => (r.fill * 100).toFixed(0))}; first step at fill >= 0.7 ${each(r => r.first70 ?? '—')}; at >= 0.999 ${each(r => r.full ?? '—')}`);
      console.log(`      feldspar ${each(r => mm(r.species.feldspar?.max_um))} mm; albite ${each(r => mm(r.species.albite?.max_um))}; quartz ${each(r => mm(r.species.quartz?.max_um))}; tourmaline ${each(r => mm(r.species.tourmaline?.max_um))}`);
      console.log(`      reaches fill >= 0.999 at ${runs.filter(r => r.full != null).length} of ${runs.length} seeds; passes 0.7 at ${runs.filter(r => r.first70 != null).length}`);
    }
  }
}

// The small end of the pocket class. The eight seeds above draw pockets of 34 mm and more, and the
// class is drawn from 25 mm up. Every seed from 1 to SMALL_UP_TO whose pocket is under SMALL_MM is
// run, shipped and with the clamp.
{
  const SMALL_MM = 40, SMALL_UP_TO = 400;
  const small = [];
  for (let seed = 1; seed <= SMALL_UP_TO; seed++) {
    setSeed(seed);
    if (Number(buildRandomScenario('pegmatite', 'pocket').conditions.wall.vug_diameter_mm) < SMALL_MM) small.push(seed);
  }
  const s = small.map(seed => run(seed, random)), c = small.map(seed => run(seed, random, { clamp: 7 }));
  const top = (r) => (r.share.length ? `${r.share[0][0]} ${(r.share[0][1] * 100).toFixed(0)} %` : 'nothing');
  console.log(`\n  the small end of the pocket class: of seeds 1 to ${SMALL_UP_TO}, ${small.length} draw a pocket under ${SMALL_MM} mm (seeds ${small.join(', ')}); cavities ${Math.min(...s.map(r => r.start.diameter)).toFixed(1)} to ${Math.max(...s.map(r => r.start.diameter)).toFixed(1)} mm`);
  console.log(`    shipped: reaches fill >= 0.999 at ${s.filter(r => r.full != null).length} of ${s.length}; passes 0.7 at ${s.filter(r => r.first70 != null).length}`);
  console.log(`    rate clamp at 7: reaches fill >= 0.999 at ${c.filter(r => r.full != null).length} of ${c.length}; passes 0.7 at ${c.filter(r => r.first70 != null).length}`);
  for (let i = 0; i < small.length; i++) {
    console.log(`      seed ${String(small[i]).padStart(3)}: ${c[i].start.diameter.toFixed(1)} mm, ${c[i].steps} steps; shipped full at step ${s[i].full ?? '—'}; under the clamp fill at run end ${(c[i].fill * 100).toFixed(0)} %, past 0.7 at step ${c[i].first70 ?? '—'}, full at step ${c[i].full ?? '—'}; largest share at the end: ${top(c[i])}`);
  }
  const fillers = {};
  for (const r of c) if (r.full != null && r.share.length) fillers[r.share[0][0]] = (fillers[r.share[0][0]] || 0) + 1;
  console.log(`    the mineral with the largest share of the pockets that fill under the clamp: ${Object.entries(fillers).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} in ${n}`).join(', ') || 'none fills'}`);
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

// ---- part 4 ----
console.log(`\nPART 4 — Simulation mode's own form: the Cavity Size select and the Shape Seed box, through the game's command runtime; time scale ${getSimulationTimeScale()}`);
{
  // The run as runSimulation builds it (js/91-ui-legends.ts): the form's overrides go to the
  // scenario's factory through startSimulationCommandRuntime (js/85l-simulation-command-protocol.ts).
  const viaForm = (overrides) => (seed) => {
    const runtime = startSimulationCommandRuntime(makeSimulationStartCommand('gem_pegmatite', seed, overrides));
    return { sim: runtime.sim, defaultSteps: runtime.scenarioData.defaultSteps };
  };
  // SC1's first acceptance line, read against the shipped run in the same cavity at the same seed.
  const firstLine = (r, base) => r.maxFill < 0.7 && r.lastGrowth > 215
    && (r.species.tourmaline?.max_um || 0) >= 5000 && (r.species.topaz?.max_um || 0) >= 1000
    && Object.keys(base.species).every(m => r.species[m]);
  const cm3 = (r) => (r.capacity / 1000).toFixed(r.capacity < 1e7 ? 1 : 0);
  const show = (label, runs) => {
    const each = (f) => runs.map(f).join(' / ');
    console.log(`      ${label.padEnd(16)} largest fill of the run ${each(r => (r.maxFill * 100).toFixed(1))} %; first step at fill >= 0.7 ${each(r => r.first70 ?? '—')}; at >= 0.999 ${each(r => r.full ?? '—')}; last step anything grew ${each(r => r.lastGrowth)}`);
    console.log(`      ${''.padEnd(16)} feldspar ${each(r => mm(r.species.feldspar?.max_um))} mm; albite ${each(r => mm(r.species.albite?.max_um))}; quartz ${each(r => mm(r.species.quartz?.max_um))}; tourmaline ${each(r => mm(r.species.tourmaline?.max_um))}; topaz ${each(r => mm(r.species.topaz?.max_um))}`);
  };

  // controls: the form's path with no override is the baseline's run, however it is stepped
  const plain = run(42, viaForm({}));
  let commanded;
  {
    const runtime = startSimulationCommandRuntime(makeSimulationStartCommand('gem_pegmatite', 42, {}));
    for (let i = 0; i < runtime.scenarioData.defaultSteps; i++) applySimulationCommand(runtime, makeSimulationAdvanceCommand(1));
    commanded = summarize(runtime.sim);
  }
  console.log(`  controls at seed 42, no override: the run built by startSimulationCommandRuntime and stepped with run_step ${JSON.stringify(plain.summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; stepped through applySimulationCommand, one step to a command, it ${JSON.stringify(commanded) === JSON.stringify(plain.summary) ? 'is the same run' : 'IS A DIFFERENT RUN'}; scenario object on the conditions: ${plain.start.scenario ? 'present' : 'ABSENT at some seed'}; ${plain.steps} steps; the cavity holds ${cm3(plain)} cm3 (shape seed ${plain.shapeSeed})`);

  console.log(`\n  Cavity Size, seeds ${OTHER_SEEDS.join(' / ')}. The scenario's own cavity is in Part 1.`);
  const kept = {};
  for (const size of ['vug', 'pocket', 'cave']) {
    const diameter = resolveSizeClassToMm(size);
    const overrides = { wall: { size_class: size, vug_diameter_mm: diameter } };      // what the form adds for a choice of size
    const s = OTHER_SEEDS.map(seed => run(seed, viaForm(overrides)));
    const c = OTHER_SEEDS.map(seed => run(seed, viaForm(overrides), { clamp: 7 }));
    kept[size] = { overrides, s, c };
    console.log(`    ${size}: resolveSizeClassToMm gives ${diameter} mm; the cavity holds ${s.map(cm3).join(' / ')} cm3; scenario object ${s.every(r => r.start.scenario) ? 'present at every seed' : 'ABSENT at some seed'}`);
    show('shipped', s);
    show('rate clamp at 7', c);
    console.log(`      ${''.padEnd(16)} SC1's first acceptance line under the clamp holds at ${c.filter((r, i) => firstLine(r, s[i])).length} of ${c.length} seeds`);
  }

  const SHAPE_SEEDS = [1, 2, 3, 7, 13, 42, 99, 2024, 123456789, 987654321];
  console.log(`\n  Shape Seed, growth seed 42, shape seeds ${SHAPE_SEEDS.join(' / ')} (the scenario's own is ${plain.shapeSeed})`);
  {
    const s = SHAPE_SEEDS.map(shape => run(42, viaForm({ wall: { shape_seed: shape } })));
    const c = SHAPE_SEEDS.map(shape => run(42, viaForm({ wall: { shape_seed: shape } }), { clamp: 7 }));
    console.log(`    the cavity holds ${s.map(cm3).join(' / ')} cm3; the shape seed on the wall is ${s.every((r, i) => r.shapeSeed === SHAPE_SEEDS[i]) ? 'the one asked for in every run' : 'NOT THE ONE ASKED FOR in some run'}`);
    show('shipped', s);
    show('rate clamp at 7', c);
    console.log(`      ${''.padEnd(16)} SC1's first acceptance line under the clamp holds at ${c.filter((r, i) => firstLine(r, s[i])).length} of ${c.length} shape seeds`);
  }

  // The vug again: is it the value of the bound that fails there, or is it the cavity?
  console.log(`\n  The vug under tighter bounds, seeds ${OTHER_SEEDS.join(' / ')}. At 0 every positive zone of the pair is rescaled to nothing. The arms at 1 and 0 preview no value of the bound.`);
  {
    const { overrides, s, c } = kept.vug;
    const shares = (runs) => runs.map(r => r.share.slice(0, 3).map(([m, x]) => `${m} ${(x * 100).toFixed(1)}`).join(', ')).join(' / ');
    console.log(`      ${'shipped'.padEnd(16)} share of the cavity's volume at run end, %, the three largest: ${shares(s)}`);
    for (const clamp of [7, 3, 1, 0]) {
      const runs = clamp === 7 ? c : OTHER_SEEDS.map(seed => run(seed, viaForm(overrides), { clamp }));
      show(`rate clamp at ${clamp}`, runs);
      console.log(`      ${''.padEnd(16)} share of the cavity's volume at run end, %, the three largest: ${shares(runs)}`);
      console.log(`      ${''.padEnd(16)} fill at run end ${runs.map(r => (r.fill * 100).toFixed(1)).join(' / ')} %; the pair holds solid at ${runs.filter(r => r.species.feldspar || r.species.albite).length} of ${runs.length} seeds; SC1's first acceptance line holds at ${runs.filter((r, i) => firstLine(r, s[i])).length} of ${runs.length}`);
    }

    // SC1's other courses in the same vug (§4, SC1): the fill switch, the change to the broth and
    // the rind. Each is a change made between the scenario's factory and the simulator's
    // constructor, so these runs are built through the factory, which is what the command runtime
    // calls with the form's overrides (js/85l-simulation-command-protocol.ts).
    const viaFactory = (o) => () => SCENARIOS.gem_pegmatite(JSON.parse(JSON.stringify(o)));
    const BROTH = [['SiO2', 0.1], ['Al', 0.15]];                       // the first arm of ab-gem-broth
    console.log(`\n  SC1's other courses in the vug, seeds ${OTHER_SEEDS.join(' / ')}: the fill switch (per_cell_local_fill: true), the change to the broth (SiO2 × 0.1 and Al × 0.15, no bound) and the rind (no thickness past 5 mm on the pair)`);
    const again = OTHER_SEEDS.map(seed => run(seed, viaFactory(overrides)));
    const ab = JSON.parse(fs.readFileSync(path.join(ROOT, 'proposals', 'evidence', 'sim-side-2026-11-09', 'ab-gem-broth.json'), 'utf8'));
    const committed = OTHER_SEEDS.map(seed => ab.runs.find(r => r.scenario === 'gem_pegmatite' && r.seed === seed).B['mul=SiO2:0.1,mul=Al:0.15'].maxFill);
    const own = OTHER_SEEDS.map(seed => run(seed, viaFactory({}), { mul: BROTH }));
    console.log(`  controls: the vug built through the scenario's factory ${again.every((r, i) => JSON.stringify(r.summary) === JSON.stringify(s[i].summary)) ? 'is the run the command runtime builds, at every seed' : 'IS A DIFFERENT RUN'}; the change to the broth in the scenario's own cavity ends ${own.map(r => (r.fill * 100).toFixed(1)).join(' / ')} % full, and its largest fill ${own.every((r, i) => Math.abs(r.maxFill - committed[i]) < 1e-12) ? 'is that of the committed A/B run at every seed (ab-gem-broth.json)' : 'IS NOT THAT OF THE COMMITTED A/B RUN'}`);
    for (const [label, options] of [['the fill switch', { localFill: true }], ['the broth change', { mul: BROTH }], ['the rind at 5 mm', { rind: 5000 }]]) {
      const runs = OTHER_SEEDS.map(seed => run(seed, viaFactory(overrides), options));
      show(label, runs);
      console.log(`      ${''.padEnd(16)} share of the cavity's volume at run end, %, the three largest: ${shares(runs)}`);
      console.log(`      ${''.padEnd(16)} fill at run end ${runs.map(r => (r.fill * 100).toFixed(1)).join(' / ')} %; SC1's first acceptance line holds at ${runs.filter((r, i) => firstLine(r, s[i])).length} of ${runs.length}`);
    }

    // Pairs of those changes, made together in the same vug.
    console.log(`\n  Pairs of courses in the vug, seeds ${OTHER_SEEDS.join(' / ')}: the change to the broth with the pair's rate clamped as well, at six values; the fill switch with the clamp at 7; the rind with the clamp at 7. The wrapper is what a clamp in the engine would be at 2 and above, and not at 1.5, 1 or 0 (see the header).`);
    const PAIRS_OF_COURSES = [
      ['broth, clamp 7', { mul: BROTH, clamp: 7 }], ['broth, clamp 3', { mul: BROTH, clamp: 3 }], ['broth, clamp 2', { mul: BROTH, clamp: 2 }],
      ['broth, clamp 1.5', { mul: BROTH, clamp: 1.5 }], ['broth, clamp 1', { mul: BROTH, clamp: 1 }], ['broth, clamp 0', { mul: BROTH, clamp: 0 }],
      ['switch, clamp 7', { localFill: true, clamp: 7 }], ['rind, clamp 7', { rind: 5000, clamp: 7 }],
    ];
    const quartzSolid = (r) => r.species.quartz ? `${r.species.quartz.n} of ${mm(r.species.quartz.max_um)} mm` : 'none';
    for (const [label, options] of PAIRS_OF_COURSES) {
      const runs = OTHER_SEEDS.map(seed => run(seed, viaFactory(overrides), options));
      show(label, runs);
      console.log(`      ${''.padEnd(16)} share of the cavity's volume at run end, %, the three largest: ${shares(runs)}`);
      console.log(`      ${''.padEnd(16)} fill at run end ${runs.map(r => (r.fill * 100).toFixed(1)).join(' / ')} %; quartz crystals with solid: ${runs.map(quartzSolid).join(' / ')}; SC1's first acceptance line holds at ${runs.filter((r, i) => firstLine(r, s[i])).length} of ${runs.length}`);
    }
    // What the pair that keeps the vug under 0.7 does in the scenario's own cavity.
    console.log(`\n  The same two changes in the scenario's own cavity (the change to the broth with the pair's rate clamped at 1), seeds ${OTHER_SEEDS.join(' / ')}`);
    {
      const base = OTHER_SEEDS.map(seed => run(seed, viaFactory({})));
      const runs = OTHER_SEEDS.map(seed => run(seed, viaFactory({}), { mul: BROTH, clamp: 1 }));
      show('broth, clamp 1', runs);
      console.log(`      ${''.padEnd(16)} share of the cavity's volume at run end, %, the three largest: ${shares(runs)}`);
      console.log(`      ${''.padEnd(16)} fill at run end ${runs.map(r => (r.fill * 100).toFixed(1)).join(' / ')} %; quartz crystals with solid: ${runs.map(quartzSolid).join(' / ')}; SC1's first acceptance line holds at ${runs.filter((r, i) => firstLine(r, base[i])).length} of ${runs.length}; control: the factory's run with no change ${JSON.stringify(base[0].summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline at seed 42' : 'DOES NOT REPRODUCE THE BASELINE'}`);
    }
  }
}
console.log(`\ncontrols after Part 4: the time scale reads ${getSimulationTimeScale()}; gem_pegmatite's shipped run at seed 42 ${JSON.stringify(run(42, gem).summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
