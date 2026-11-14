#!/usr/bin/env node
/**
 * probe-clamp-horizon.mjs — how many steps a clamp on the feldspar pair's rate buys before
 * gem_pegmatite's pocket fills, in the ways the game lets a run go on
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1; §4 SC1; §6, decision 1).
 *
 * A clamp on a rate does not end growth. Past the clamp a crystal adds k·E·(time scale)
 * micrometres on every step the run has, so what a clamp sets is the step at which the pocket
 * fills. The other probes read the bound at step 230, the scenario's own length. Three of the
 * game's ways of running the scenario do not stop there:
 *   Simulation mode   the Steps box replaces the scenario's length (js/91-ui-legends.ts, `totalSteps`)
 *   Creative mode     has no length: the player presses Wait (js/97-ui-fortress.ts, `_advanceOneStep`),
 *                     and the Scenarios menu opens a scenario there (js/94-ui-menu.ts,
 *                     `startScenarioInCreative`)
 *   Zen mode          has no end (js/99h-renderer-idle-chart.ts, `idleTick`)
 *
 * Part 0. Zen's constructor in a process that has called nothing else: no mode switch and no
 *   Creative constructor. The time scale is set to 1 through setSimulationTimeScale, the clock is
 *   held at the seed for the length of idleCreateSim('gem_pegmatite'), and the simulator is stepped
 *   400 times with run_step alone, shipped and with the rate clamp at 7. These are the Zen runs of
 *   probe-pegmatite-reach.mjs Part 3, which makes them after four mode switches and twelve Creative
 *   constructor calls. The two report lines of each arm are printed in that probe's format and
 *   looked up, character for character, in its committed output.
 *
 * Part A. gem_pegmatite as Simulation mode starts it, stepped on past its 230 steps with run_step,
 *   which is what the Steps box does:
 *     rate clamp at 7   SC1 as recommended
 *     rate clamp at 1   a far tighter bound, to see how much of the horizon is the pair's to give
 * Part B. gem_pegmatite opened in Creative mode (fortressBeginFromScenario itself), rate clamp at
 *   7, stepped on the same way: a player who keeps pressing Wait.
 * Part C. Zen mode by the game's own loop. A real <select id="idle-scenario"> holding the scenario
 *   is put on the page, since the harness's page has none; then switchMode('idle'), which sets the
 *   time scale to 1; idleTogglePlay() with the clock held at the seed, which builds the simulator;
 *   idleTogglePause(), so that the page's own timer does not step it; and idleDoStep() N times.
 *   idleDoStep is the function the game's timer calls: idleApplyDrift (a random walk on
 *   temperature, nine fluid species and pH, and a 2 % chance a step of a random event), then
 *   run_step, then the page's drawing. A run is ended the way the page ends one when a scenario is
 *   picked while stopped: idleStop, then idlePickScenario.
 *     shipped           until the pocket is full, or to step 1,150 if it does not fill. On today's
 *                       tree it fills. On a tree where Zen carries a bound this is the arm that
 *                       reads SC1's acceptance line for Zen, with no clamp applied by the probe.
 *     rate clamp at 7   2,400 steps
 *     rate clamp at 11  a clamp that SC1's first acceptance line refuses in Simulation mode
 *                       (§4, SC1), until the fill reaches 0.7 or 1,150 steps have run
 *     rate clamp at 23  a looser clamp, which leaves the pocket plugged in Simulation mode, the
 *                       same way
 *   1,150 is the scenario's 230 steps times five: Zen stores a fifth of the thickness a step, so
 *   it is the same span of growth at the clamped rate.
 *
 * Readings per run: the fill at named steps; the first step at fill >= 0.7 and at >= 0.999; the
 * last step on which any crystal stored a positive zone; the temperature at the scenario's last
 * step and at the end of the run; the largest crystal with solid left of five species; at the
 * end of the run, each mineral's share of the cavity's volume, summed the way get_vug_fill sums
 * it (js/85c-simulator-state.ts); and the bulk handle's SiO2 beside the mean over the voxels.
 *
 * The clamp is applied in process: the rate of feldspar and albite becomes k·min(σ − 1, E),
 * written as the `rclamp` arm of tools/sim-side-ab.mjs and probe-pegmatite-reach.mjs write it.
 * The wrapper rescales the zone the engine returns. The engine's own tests on its rate (feldspar
 * rolls for an inclusion at a rate above 4) have already been made on the unclamped rate. At
 * E = 7 and above the clamped rate passes those tests too, so the wrapper is what a clamp in the
 * engine would be. At E = 1 it is not: the wrapper's run is not the run a clamp inside the
 * engine would make. That arm shows the pocket with the pair nearly absent.
 * probe-clamp-in-engine.mjs makes both runs, here and at E = 7, and prints how far apart they end.
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes, and throws if the
 * game's code leaves no simulator or a step does not advance it by one. Imports tools/_harness.mjs
 * and node builtins.
 * The game's own functions write to the page's in-memory state (a visible simulator, a strip
 * recorder) and to no file. Controls: gem_pegmatite's shipped run at seed 42 is compared with the
 * committed baseline before Part A and again at the end, with the time scale read back; the clamp
 * at Infinity has to be the shipped run; Part A's fill at step 230 has to be the largest fill of a
 * 230-step run made beside it; each Zen run of Part C has to start at step 0, run at a time scale
 * of 1 and leave no simulator behind.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-clamp-horizon.mjs
 *
 * It took 30 minutes at its last run and 53 at the one before, nearly all of it Part C: the
 * game's own loop draws the page on every step. Run it after probe-pegmatite-reach.mjs, whose
 * output Part 0 reads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, _crystalSolidVolumeMm3,
  idleCreateSim, fortressBeginFromScenario, setSimulationTimeScale, getSimulationTimeScale, switchMode,
  idleTogglePlay, idleTogglePause, idleDoStep, idleStop, idlePickScenario,
} = await harness.loadSimBundle({
  toolName: 'probe-clamp-horizon',
  extraExports: ['MINERAL_ENGINES', '_crystalSolidVolumeMm3', 'idleCreateSim', 'fortressBeginFromScenario',
    'setSimulationTimeScale', 'getSimulationTimeScale', 'switchMode',
    'idleTogglePlay', 'idleTogglePause', 'idleDoStep', 'idleStop', 'idlePickScenario'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const PAIR = ['feldspar', 'albite'];
const SCENARIO_STEPS = 230;                 // gem_pegmatite's own length
const SIM_CAP = 400;                        // Parts A and B, rate clamp at 7
const TIGHT_CAP = 600;                      // Part A, rate clamp at 1
const ZEN_STEPS = 2400;                     // Part C, rate clamp at 7
const ZEN_BAR = SCENARIO_STEPS * 5;         // 1,150: the scenario's length at a fifth of the thickness a step
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

// The pair's rate clamped at k·min(σ − 1, clamp) while fn runs. fn may be async.
async function withClamp(clamp, fn) {
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
    return await fn();
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

// Advance a simulator up to `cap` times and record the fill after every step.
//   stop 'full'   three steps after the fill first reaches 0.999
//   stop '70'     three steps after it first reaches 0.7
//   stop 'never'  all `cap` steps
function follow(sim, cap, advance, stop = 'full') {
  const startStep = sim.step;
  const fillAt = {};
  let maxFill = 0, first70 = null, full = null, temperatureAtScenarioEnd = null;
  for (let i = 0; i < cap; i++) {
    const before = sim.step;
    advance();
    if (sim.step !== before + 1) throw new Error(`one advance moved the simulator from step ${before} to step ${sim.step}`);
    const fill = sim.get_vug_fill();
    fillAt[sim.step] = fill;
    if (sim.step === SCENARIO_STEPS) temperatureAtScenarioEnd = sim.conditions.temperature;
    if (fill > maxFill) maxFill = fill;
    if (first70 == null && fill >= 0.7) first70 = sim.step;
    if (full == null && fill >= 0.999) full = sim.step;
    if (stop !== 'never' && full != null && sim.step >= full + 3) break;
    if (stop === '70' && first70 != null && sim.step >= first70 + 3) break;
  }
  const size = {};
  let lastGrowth = 0;
  for (const c of sim.crystals) {
    for (const z of c.zones) if (z.thickness_um > 0 && z.step > lastGrowth) lastGrowth = z.step;
    if (!(c.total_growth_um > 0)) continue;
    if (!(size[c.mineral] >= c.total_growth_um)) size[c.mineral] = c.total_growth_um;
  }
  // each mineral's share of the cavity, summed as get_vug_fill sums the fill
  const capacity = Number(sim.conditions.wall.cavity_capacity_volume_mm3);
  const volume = {};
  for (const c of sim.crystals) {
    if (c.dissolved === true) continue;
    volume[c.mineral] = (volume[c.mineral] || 0) + _crystalSolidVolumeMm3(c);
  }
  const share = Object.entries(volume).map(([m, v]) => [m, v / capacity]).sort((a, b) => b[1] - a[1]);
  // silica on the bulk handle, which births read, and its mean over the voxels, which growth reads
  const grid = sim.wall_state.voxelGridFor(sim);
  let voxelSiO2 = 0;
  for (const v of grid.voxels) voxelSiO2 += Number(v.fluid.SiO2) || 0;
  voxelSiO2 /= grid.voxels.length;
  return {
    startStep, steps: sim.step, fillAt, maxFill, first70, full, lastGrowth, size, share,
    bulkSiO2: Number(sim.conditions.fluid.SiO2), voxelSiO2,
    fill: sim.get_vug_fill(), temperature: sim.conditions.temperature, temperatureAtScenarioEnd,
    scenario: sim.conditions._scenario != null, events: (sim.events || []).length,
    boundary: !!sim._carbonateBoundaryState,
    records: [...new Set(sim.crystals.map(c => c.mineral))].sort(), summary: summarize(sim),
  };
}

const each = (runs, f) => runs.map(f).join(' / ');
const pct = (x, d = 0) => (x == null ? '—' : (x * 100).toFixed(d));
function print(label, runs, marks) {
  console.log(`    ${label}`);
  // a dash is a run that had stopped before that step; a step no run reached is left out
  console.log(`      fill, % — ${marks.filter(m => runs.some(r => r.fillAt[m] != null)).map(m => `at step ${m}: ${each(runs, r => pct(r.fillAt[m], 1))}`).join('; ')}`);
  console.log(`      first step at fill >= 0.7: ${each(runs, r => r.first70 ?? '—')}; at >= 0.999: ${each(runs, r => r.full ?? '—')}; last step anything grew ${each(runs, r => r.lastGrowth)}; stepped to ${each(runs, r => r.steps)} (fill there ${each(runs, r => pct(r.fill, 1))} %, ${each(runs, r => r.temperature.toFixed(0))} °C)`);
  if (runs.some(r => r.temperatureAtScenarioEnd != null)) console.log(`      temperature at step ${SCENARIO_STEPS}, °C: ${each(runs, r => (r.temperatureAtScenarioEnd == null ? '—' : r.temperatureAtScenarioEnd.toFixed(0)))}`);
  console.log(`      largest crystals at the end, mm — feldspar ${each(runs, r => mm(r.size.feldspar))}; albite ${each(runs, r => mm(r.size.albite))}; quartz ${each(runs, r => mm(r.size.quartz))}; tourmaline ${each(runs, r => mm(r.size.tourmaline))}; topaz ${each(runs, r => mm(r.size.topaz))}`);
  console.log(`      share of the cavity's volume at the end, % — ${['quartz', 'feldspar', 'albite'].map(m => `${m} ${each(runs, r => pct((r.share.find(s => s[0] === m) || [m, 0])[1], 1))}`).join('; ')}; every other mineral together ${each(runs, r => pct(r.share.filter(s => !['quartz', 'feldspar', 'albite'].includes(s[0])).reduce((a, s) => a + s[1], 0), 1))}`);
  console.log(`      SiO2 at the end, ppm — on the bulk handle ${each(runs, r => r.bulkSiO2.toFixed(0))}; mean over the voxels ${each(runs, r => r.voxelSiO2.toFixed(0))}`);
}

console.log(`probe-clamp-horizon — SIM ${SIM_VERSION}; seeds ${SEEDS.join(' / ')}; time scale at load ${getSimulationTimeScale()}`);

// ---- part 0 ----
// Nothing of the game's page code has been called yet in this process but the bundle's own load.
console.log('\nPART 0 — Zen\'s constructor before any mode switch or Creative constructor is called in this process');
{
  const committedPath = path.join(HERE, 'probe-pegmatite-reach.txt');
  const committed = fs.existsSync(committedPath) ? fs.readFileSync(committedPath, 'utf8').replace(/\r\n/g, '\n') : null;
  // probe-pegmatite-reach.mjs report(), copied, so that the lines can be looked up in its output.
  const reportLines = (label, runs, at) => [
    `      ${label.padEnd(16)} largest fill of the run ${each(runs, r => (r.maxFill * 100).toFixed(0))} %, fill at step ${at} ${each(runs, r => (r.fillAt[at] * 100).toFixed(0))} %; first step at fill >= 0.7 ${each(runs, r => r.first70 ?? '—')}; at >= 0.999 ${each(runs, r => r.full ?? '—')}; last step anything grew ${each(runs, r => r.lastGrowth)}`,
    `      ${''.padEnd(16)} feldspar ${each(runs, r => mm(r.size.feldspar))} mm; albite ${each(runs, r => mm(r.size.albite))}; quartz ${each(runs, r => mm(r.size.quartz))}; tourmaline ${each(runs, r => mm(r.size.tourmaline))}; topaz ${each(runs, r => mm(r.size.topaz))}`,
  ];
  setSimulationTimeScale(1);
  try {
    console.log(`  time scale during these runs: ${getSimulationTimeScale()}; 400 steps of run_step alone, the clock held at the seed for idleCreateSim; Zen's own drift is not applied`);
    const zen = async (seed, clamp) => withClamp(clamp, () => {
      setSeed(seed);
      const clock = Date.now;
      Date.now = () => seed;                       // idleCreateSim seeds from the clock
      let sim;
      try { sim = idleCreateSim('gem_pegmatite'); } finally { Date.now = clock; }
      return follow(sim, 400, () => sim.run_step(), 'never');
    });
    for (const [label, clamp] of [['shipped', null], ['rate clamp at 7', 7]]) {
      const runs = [];
      for (const seed of SEEDS) runs.push(await zen(seed, clamp));
      const lines = reportLines(label, runs, 230);
      for (const line of lines) console.log(line);
      console.log(`      ${''.padEnd(16)} these two lines, one after the other, in probe-pegmatite-reach.txt, character for character: ${committed == null ? 'that file is not here' : committed.includes('\n' + lines.join('\n') + '\n') ? 'found' : 'NOT FOUND'}`);
    }
  } finally {
    setSimulationTimeScale(5);
  }
}

// ---- controls for parts A and B ----
const gem = () => { const made = SCENARIOS.gem_pegmatite(); return new VugSimulator(made.conditions, made.events); };
const simulation = async (seed, clamp, cap, stop) => withClamp(clamp, () => {
  setSeed(seed);
  const sim = gem();
  return follow(sim, cap, () => sim.run_step(), stop);
});
const shipped42 = await simulation(42, null, SCENARIO_STEPS, 'never');
const neutral42 = await simulation(42, Infinity, SCENARIO_STEPS, 'never');
console.log(`\ncontrols at seed 42, time scale ${getSimulationTimeScale()}: gem_pegmatite's shipped run of ${SCENARIO_STEPS} steps ${JSON.stringify(shipped42.summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}; the clamp at Infinity ${JSON.stringify(neutral42.summary) === JSON.stringify(shipped42.summary) ? 'is the shipped run' : 'MOVES THE RUN'}`);

// ---- part A ----
console.log(`\nPART A — gem_pegmatite as Simulation mode starts it, stepped on past its ${SCENARIO_STEPS} steps (what the Steps box does)`);
{
  const at230 = [];
  for (const seed of SEEDS) at230.push(await simulation(seed, 7, SCENARIO_STEPS, 'never'));
  console.log(`  the ${SCENARIO_STEPS}-step run under the rate clamp at 7, for comparison: largest fill of the run ${each(at230, r => pct(r.maxFill, 1))} %; last step anything grew ${each(at230, r => r.lastGrowth)}`);
  for (const [label, clamp, cap] of [['rate clamp at 7 (SC1 as recommended)', 7, SIM_CAP], ['rate clamp at 1', 1, TIGHT_CAP]]) {
    const runs = [];
    for (const seed of SEEDS) runs.push(await simulation(seed, clamp, cap, 'full'));
    print(`${label}, up to ${cap} steps`, runs, [SCENARIO_STEPS, 260, 300, 350, 400, 500, 600].filter(m => m <= cap));
    if (clamp === 7) {
      console.log(`      control: the fill at step ${SCENARIO_STEPS} ${runs.every((r, i) => r.fillAt[SCENARIO_STEPS] === at230[i].maxFill) ? 'is the largest fill of the 230-step run at every seed' : 'IS NOT THE LARGEST FILL OF THE 230-STEP RUN'}`);
      console.log(`      steps between the scenario's last step and fill 0.7: ${each(runs, r => (r.first70 == null ? '—' : r.first70 - SCENARIO_STEPS))}`);
    }
  }
}

// ---- part B ----
console.log('\nPART B — gem_pegmatite opened in Creative mode: fortressBeginFromScenario(\'gem_pegmatite\', seed) itself, then run_step for as long as a player presses Wait');
{
  const creative = async (seed, clamp, cap) => withClamp(clamp, () => {
    setSeed(seed);
    const launch = fortressBeginFromScenario('gem_pegmatite', seed);
    if (!launch || !launch.sim) throw new Error('fortressBeginFromScenario returned no simulator under the harness');
    return follow(launch.sim, cap, () => launch.sim.run_step(), 'full');
  });
  const runs = [];
  for (const seed of SEEDS) runs.push(await creative(seed, 7, SIM_CAP));
  console.log(`  scenario object on the conditions: ${runs.every(r => r.scenario) ? 'present at every seed' : 'ABSENT at some seed'}; a carbonate boundary on the simulator: ${runs.every(r => r.boundary) ? 'at every seed' : 'NOT AT EVERY SEED'}; time scale ${getSimulationTimeScale()}`);
  print(`rate clamp at 7, up to ${SIM_CAP} steps`, runs, [SCENARIO_STEPS, 260, 300, 350, 400]);
  console.log(`      steps between the scenario's last step and fill 0.7: ${each(runs, r => (r.first70 == null ? '—' : r.first70 - SCENARIO_STEPS))}`);
}

// ---- part C ----
console.log('\nPART C — Zen mode by the game\'s own loop: switchMode(\'idle\'), idleTogglePlay(), idleTogglePause(), then idleDoStep() (drift, then run_step, then the page\'s drawing)');
{
  // The harness's page has no scenario picker; idleTogglePlay reads the scenario from this element.
  const select = document.createElement('select');
  select.id = 'idle-scenario';
  const option = document.createElement('option');
  option.value = 'gem_pegmatite';
  option.textContent = 'gem_pegmatite';
  select.appendChild(option);
  document.body.appendChild(select);
  select.value = 'gem_pegmatite';

  const zenGame = async (seed, clamp, cap, stop) => withClamp(clamp, async () => {
    let threw = '';
    try { switchMode('idle'); } catch (e) { threw = String(e && e.message).slice(0, 80); }
    const scaleAtStart = getSimulationTimeScale();
    const clock = Date.now;
    Date.now = () => seed;                         // idleCreateSim seeds from the clock
    try { await idleTogglePlay(); } finally { Date.now = clock; }
    idleTogglePause();                             // the page's timer is cancelled before it has fired
    const sim = globalThis.window?.vugg?.idleSim;
    if (!sim) throw new Error(`the game left no Zen simulator under the harness${threw ? ` (switchMode threw: ${threw})` : ''}`);
    let drawingThrew = 0;
    const out = follow(sim, cap, () => {
      const before = sim.step;
      try { idleDoStep(); } catch (e) { if (sim.step === before) throw e; drawingThrew++; }   // the physics ran; the page's drawing threw
    }, stop);
    out.scaleAtStart = scaleAtStart;
    out.scaleAtEnd = getSimulationTimeScale();
    out.drawingThrew = drawingThrew;
    out.switchThrew = threw;
    idleStop();
    try { idlePickScenario('gem_pegmatite'); } catch (e) { out.pickThrew = String(e && e.message).slice(0, 60); }
    out.left = globalThis.window.vugg.idleSim == null ? 'none' : 'A SIMULATOR';
    return out;
  });

  setSeed(42);
  const own = SCENARIOS.gem_pegmatite().conditions._scenario || {};
  const licensed = new Set([own.expects_species, own.deterministic_species, own.statistical_species, own.aspirational_species]
    .flatMap(list => (Array.isArray(list) ? list : []).map(e => (typeof e === 'string' ? e : e?.mineral))).filter(Boolean));
  const excluded = new Set(Object.keys(own.excluded_species || {}));

  const ARMS = [
    [`shipped, until the pocket is full or ${ZEN_BAR} steps have run`, null, ZEN_BAR, 'full', [10, 20, 30, SCENARIO_STEPS, ZEN_BAR]],
    [`rate clamp at 7, ${ZEN_STEPS} steps`, 7, ZEN_STEPS, 'full', [SCENARIO_STEPS, 400, 800, ZEN_BAR, 1600, 2000, ZEN_STEPS]],
    [`rate clamp at 11, until the fill reaches 0.7 or ${ZEN_BAR} steps have run`, 11, ZEN_BAR, '70', [SCENARIO_STEPS, 400, 800, ZEN_BAR]],
    [`rate clamp at 23, until the fill reaches 0.7 or ${ZEN_BAR} steps have run`, 23, ZEN_BAR, '70', [SCENARIO_STEPS, 400, 800, ZEN_BAR]],
  ];
  const all = [];
  for (const [label, clamp, cap, stop, marks] of ARMS) {
    const runs = [];
    for (const seed of SEEDS) runs.push(await zenGame(seed, clamp, cap, stop));
    all.push(...runs);
    print(label, runs, marks);
    console.log(`      fill under 0.7 through step ${ZEN_BAR}: ${each(runs, r => (r.first70 != null && r.first70 <= ZEN_BAR ? `no (0.7 at step ${r.first70})` : r.steps >= ZEN_BAR ? 'yes' : `not run that far (stepped to ${r.steps})`))}`);
    if (clamp == null) {
      console.log(`      minerals on record that the scenario does not license: ${each(runs, r => r.records.filter(m => !licensed.has(m)).map(m => `${m}${excluded.has(m) ? ' (excluded by the scenario)' : ''}`).join(', ') || 'none')}`);
    }
  }
  console.log(`  controls over the ${all.length} Zen runs: the simulator's step before the first idleDoStep ${all.every(r => r.startStep === 0) ? 'is 0 in every run' : 'IS NOT 0 IN SOME RUN'}; time scale after switchMode('idle') ${all.every(r => r.scaleAtStart === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}, and at the end of the run ${all.every(r => r.scaleAtEnd === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}; scenario object ${all.some(r => r.scenario) ? 'PRESENT in some run' : 'absent in every run'}; events ${all.every(r => r.events === 0) ? 'none in every run' : 'SOME'}; switchMode ${all.some(r => r.switchThrew) ? 'THREW in some run' : 'threw in none'}; idleDoStep calls whose drawing threw after the physics had run: ${all.reduce((a, r) => a + r.drawingThrew, 0)}; Zen simulator left on the page after a run was ended: ${all.every(r => r.left === 'none') ? 'none' : 'ONE WAS LEFT'}${all.some(r => r.pickThrew) ? '; idlePickScenario THREW in some run' : ''}`);
  setSimulationTimeScale(5);
}

const again42 = await simulation(42, null, SCENARIO_STEPS, 'never');
console.log(`\ncontrols at the end: the time scale reads ${getSimulationTimeScale()}; gem_pegmatite's shipped run at seed 42 ${JSON.stringify(again42.summary) === JSON.stringify(BASELINE.gem_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
// The page's code may leave a timer behind; leave once the output is written.
process.stdout.write('', () => process.exit(0));
