#!/usr/bin/env node
/**
 * probe-lead-choices.mjs — the two choices SC3 leaves to the owner, run together, and one side
 * effect of SC3 that a species table cannot show
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4 SC3, §6).
 *
 * SC3 carries the radiogenic lead of the uraninite block (js/85-simulator.ts,
 * `conditions.fluid.Pb += 0.1 * u_size`) to the voxels as well as the bulk handle. Two things are
 * left to the owner: WHEN the lead is released, and whether radioactive_pegmatite LICENSES the
 * galena its description promises. They are not independent, and this probe runs every combination.
 *
 *   timing    shipped  today's tree: the lead goes to the bulk handle alone, on every step
 *             pb       the same increment also goes to every voxel, on every step (the `pb` arm of
 *                      tools/sim-side-ab.mjs, written the same way)
 *             held     the increment is kept back in a store, and the whole store is released, to
 *                      the bulk handle and to every voxel, on the next step on which a uraninite
 *                      takes a negative zone: lead held in the uraninite until it is altered
 *   license   as shipped (galena is not licensed), or with galena added to this run's license in
 *             process (one more aspirational_species entry on conditions._scenario; no file changes)
 *   pocket    as shipped, or held open (sigma of feldspar, albite and quartz capped at 8, as the
 *             A/B tool's `cap=8 --minerals feldspar,albite,quartz` does)
 *
 * Per run: the steps on which galena and plumbogummite are past sigma_crit on the bulk handle when
 * the nucleation pass starts; the galena and plumbogummite that hold solid at run end; bulk Pb at
 * run end; the uraninites' negative zones and the steps they fall on; what `held` released.
 *
 * Second part. Both timings in the two scenarios that grow uraninite, pocket as shipped and galena
 * not licensed, against the shipped run and read the way tools/sim-side-ab.mjs reads an arm:
 * species moved, gained and lost, whether the baseline's summary would differ, and whether any
 * mineral has a crystal on record in one run and not the other (what the locality gate asks, read
 * at run end). With them, a
 * change no species table shows: grow_feldspar notes a microcline zone "amazonite" when its own
 * cell holds more than 10 ppm of Pb (js/59-engines-silicate.ts, `trace_Pb > 0.1` with
 * trace_Pb = 0.01 Pb). The game reads that note, or the zone's trace lead, at more than one
 * grain, and the probe runs four of its readers: the run's own step log, and three on each
 * feldspar crystal that holds solid:
 *   step log       the line run_step returns for every zone of more than 0.5 µm
 *                  (js/85-simulator.ts, through describe_latest_zone of js/27-geometry-crystal.ts),
 *                  which prints the zone's note: per zone, as text. The probe counts the feldspar
 *                  lines that say "amazonite", twice: all that run_step returns, which is what
 *                  Creative mode prints (js/97-ui-fortress.ts, _advanceOneStep), and those on the
 *                  steps Simulation mode prints. Simulation mode keeps a step's lines on every
 *                  fifth step and on a step with an event, a nucleation or a wall line
 *                  (js/91-ui-legends.ts, `show`); the test is copied here.
 *   name, colour   crystalDisplayName and crystalColor (js/12-mineral-art.ts): per crystal. A
 *                  microcline is named "amazonite" and coloured green when ANY one of its zones
 *                  carries the note.
 *   zone bar       groupZonesByChemistry (js/98c-ui-zone-bars.ts), which the Zone History bar
 *                  draws: per zone, by thickness. Each zone is coloured as a one-zone crystal and
 *                  consecutive zones of one colour are merged; the probe prints the share of the
 *                  bar's thickness under each colour.
 *   body colour    resolveBodyColour (js/12a-colour-lexicon.ts), the base colour the cavity view
 *                  starts a crystal's body from. With it, what that colour's rule reads for
 *                  lead, _bodyFieldVal(crystal, 'Pb'): the crystal's trace lead weighted by zone
 *                  thickness. Feldspar's amazonite variant asks for more than 5 of it.
 * Other lines of js/ that read the note (the fluorescence line of js/27-geometry-crystal.ts, the
 * feldspar narrator of js/92i-narrators-silicate.ts) use the per-crystal test and are not run.
 * Others print whatever note a zone carries, zone by zone (the Zone History tooltip and zone list
 * of js/97d-ui-zone-modal.ts, the Record Player of js/98-ui-groove.ts, the collection record of
 * js/93-ui-collection.ts, the agent interface's specimen dump of js/99z-agent-interface.ts), and
 * are not run either: the count of noted zones is what they have to print.
 * It also counts, for every run of this part, what tools/sim-side-ab.mjs
 * counts to see whether an arm tripped one of the simulator's own audits: CO2 or carbonate events
 * that say they were paused or refused, failed carbonate-boundary transactions, and entries of
 * the three violation ledgers.
 *
 * Third part. SC2 and SC3 both reach radioactive_pegmatite: SC2 puts uraninite on σ − 1, the
 * uraninites end smaller, and the block's lead is a tenth of their size a step. So the pocket held
 * open is run again under both timings with SC2 applied as the A/B tool applies it (`excess=1` on
 * galena, molybdenite and uraninite: every positive zone rescaled by (σ − 1)/σ), to see what SC3
 * delivers if SC2 lands first.
 *
 * Fourth part. The same three timings in three places where the game runs a fluid that grows
 * uraninite without the scenario's events, each through the game's own code:
 *   Creative, a starter    fortressBeginFromStarterFluid('radioactive', seed) (js/94-ui-menu.ts):
 *                radioactive_pegmatite's fluid at 200 °C in a limestone cavity, no events, no
 *                scenario object. 120 steps of run_step alone, at the time scale of 5 that
 *                Creative mode sets. Run four times: left to itself; with one Drain after step
 *                60, made by the page's own fortressStep('drain') (js/97-ui-fortress.ts), which
 *                lowers the water level, sets O2 on the bulk handle to at least 0.6 and advances
 *                no step; with one Evaporate after step 60 instead (fortressStep('evaporate'):
 *                O2 to at least 1.5, the water level further down, eight species concentrated
 *                by 1.4 and the fluid 10 °C cooler); and with the Drain after step 30. Drain
 *                and Evaporate are buttons of that mode, and the two cases of fortressStep
 *                behind a button that write O2.
 *   Random Vugg  buildRandomScenario('pegmatite', 'pocket') (js/96-ui-random.ts), which draws
 *                uranium into about a third of its fluids and builds no scenario object. The
 *                eight seeds of probe-pegmatite-reach.mjs; those whose shipped run puts a
 *                uraninite on record are run under the other two timings, for the length the
 *                builder drew.
 *   Zen mode     radioactive_pegmatite by the game's own loop, as probe-clamp-horizon.mjs Part C
 *                drives it: a real <select id="idle-scenario"> holding the scenario is put on
 *                the page; switchMode('idle'), which sets the time scale to 1; idleTogglePlay()
 *                with the clock held at the seed, which builds the simulator; idleTogglePause();
 *                and idleDoStep() 600 times (Zen's drift, then run_step, then the page's drawing).
 *                Then the same loop on schneeberg, the other scenario whose own run grows a
 *                uraninite: Zen offers every scenario, and probe-zen-drift.mjs (Part 3) finds
 *                which of the 41 Zen simulators put a uraninite on record.
 * The held timing releases its store on a step on which a uraninite takes a negative zone, and
 * grow_uraninite takes one only below saturation with O2 above 0.3 (js/57-engines-oxide.ts). In
 * the scenario's own run an event brings that about. This part reads whether anything does where
 * there are no events: per run, the first steps at which the fill passes 0.7 and reaches 0.999,
 * the uraninites' negative zones, the bulk handle's Pb beside the lowest and highest voxel, O2
 * the same way, what `held` kept back and what it released, the galena and plumbogummite on
 * record with the step of the galena's last zone, and whether the baseline-style summary is the
 * shipped run's. None of these runs has a scenario object, so none has a license.
 *
 * The values are restored, never subtracted (the bulk handle's Pb before the block is read at the
 * _sealVugIfFilled call that precedes it and put back at _check_enclosure, the first call after it).
 *
 * PASSIVE: prints to stdout and writes nothing. It exits 0 when it finishes, and throws if the
 * game's code leaves no simulator or a step does not advance it by one. Imports tools/_harness.mjs
 * and node builtins. The game's own functions of the fourth part write to the page's in-memory
 * state (a visible simulator, a strip recorder, an autosave record) and to no file.
 * At seed 42 the shipped run of each scenario is compared with the committed baseline, at the start
 * and again at the end with the time scale read back; the first Zen run is made again after the
 * others and has to be the same run.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-lead-choices.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const {
  SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_GATES_REGISTRY, MINERAL_ENGINES, crystalDisplayName, crystalColor,
  groupZonesByChemistry, resolveBodyColour, _bodyFieldVal, MINERAL_SPEC,
  fortressBeginFromStarterFluid, fortressStep, buildRandomScenario, setSimulationTimeScale, getSimulationTimeScale, switchMode,
  idleTogglePlay, idleTogglePause, idleDoStep, idleStop, idlePickScenario,
} = await harness.loadSimBundle({
  toolName: 'probe-lead-choices',
  extraExports: ['MINERAL_GATES_REGISTRY', 'MINERAL_ENGINES', 'crystalDisplayName', 'crystalColor', 'groupZonesByChemistry', 'resolveBodyColour', '_bodyFieldVal', 'MINERAL_SPEC',
    'fortressBeginFromStarterFluid', 'fortressStep', 'buildRandomScenario', 'setSimulationTimeScale', 'getSimulationTimeScale', 'switchMode',
    'idleTogglePlay', 'idleTogglePause', 'idleDoStep', 'idleStop', 'idlePickScenario'],
});
// tools/sim-side-ab.mjs REFUSAL, copied: a CO2 or carbonate event of js/70l that says it was paused or refused.
const REFUSAL = /(CO₂|Carbonate) [a-z₂ ]*(paused|refused): /;
// The step log's line for a feldspar zone that grew (js/85-simulator.ts: "▲ Feldspar #N: " and then
// describe_latest_zone, which ends with the zone's note), where the note says amazonite.
const AMAZONITE_LINE = /▲ Feldspar #\d+: .*amazonite/;
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const SEEDS = [42, 1, 2];
const mm = (um) => (um / 1000).toFixed(um < 1000 ? 3 : 1);

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

const SC2_MINERALS = ['galena', 'molybdenite', 'uraninite'];

function run(name, seed, options = {}) {
  if (!options.sc2) return runOnce(name, seed, options);
  // SC2 as tools/sim-side-ab.mjs previews it (`excess=1`): every positive zone of the three engines
  // rescaled by (sigma − 1)/sigma, sigma read on the conditions the engine is about to read.
  const saved = {};
  try {
    for (const m of SC2_MINERALS) {
      const orig = saved[m] = MINERAL_ENGINES[m];
      MINERAL_ENGINES[m] = (crystal, conditions, step) => {
        const s = conditions['supersaturation_' + m]();
        const zone = orig(crystal, conditions, step);
        if (!zone || !(zone.thickness_um > 0)) return zone;
        const f = s > 0 ? Math.max(0, s - 1) / s : 0;
        if (f !== 1) {
          zone.thickness_um *= f;
          if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
        }
        return zone;
      };
    }
    return runOnce(name, seed, options);
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

// The timing of the radiogenic lead, installed on one simulator. `pb` carries each step's increment
// to every voxel as well; `held` keeps it back in a store and releases the whole store, to the bulk
// handle and to every voxel, on a step on which a uraninite takes a negative zone. Returns the
// counts, which the wrappers keep up to date.
function leadTiming(sim, grid, timing) {
  const lead = { store: 0, releases: 0, released: 0, first: null };
  let before = null;
  if (timing !== 'shipped') {
    const origSeal = sim._sealVugIfFilled;
    sim._sealVugIfFilled = function (...a) { const out = origSeal.apply(this, a); before = Number(this.conditions.fluid.Pb); return out; };
    const origEnclosure = sim._check_enclosure;
    sim._check_enclosure = function () {
      if (before != null) {
        const inc = Number(this.conditions.fluid.Pb) - before;
        if (timing === 'pb') {
          if (inc > 0) for (const v of grid.voxels) v.fluid.Pb += inc;
        } else {
          lead.store += Math.max(0, inc);
          this.conditions.fluid.Pb = before;                       // restored, not subtracted
          const altered = this.crystals.some(c => c.mineral === 'uraninite' && c.zones.some(z => z.step === this.step && z.thickness_um < 0));
          if (altered && lead.store > 0) {
            this.conditions.fluid.Pb = before + lead.store;
            for (const v of grid.voxels) v.fluid.Pb += lead.store;
            if (lead.first == null) lead.first = { step: this.step, ppm: lead.store };
            lead.releases++; lead.released += lead.store; lead.store = 0;
          }
        }
        before = null;
      }
      return origEnclosure.call(this);
    };
  }
  return lead;
}

// What a mineral left in a run: nothing, records with no solid, or its crystals with solid.
function left(sim, m) {
  const all = sim.crystals.filter(c => c.mineral === m), solid = all.filter(c => c.total_growth_um > 0);
  if (!all.length) return 'none';
  if (!solid.length) return `no solid (${all.length} record${all.length === 1 ? '' : 's'})`;
  return `×${solid.length} @ ${mm(Math.max(...solid.map(c => c.total_growth_um)))} mm, born at step ${Math.min(...solid.map(c => c.nucleation_step))}`;
}

function runOnce(name, seed, { timing = 'shipped', license = false, open = false } = {}) {
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  if (license) {
    conditions._scenario = { ...conditions._scenario,
      aspirational_species: [...(conditions._scenario.aspirational_species || []), { mineral: 'galena', reason: 'probe-lead-choices: licensed in process' }] };
  }
  if (open) {
    for (const m of ['feldspar', 'albite', 'quartz']) {
      const orig = conditions['supersaturation_' + m];
      conditions['supersaturation_' + m] = function (...a) { return Math.min(orig.apply(this, a), 8); };
    }
  }
  const sim = new VugSimulator(conditions, events);
  const grid = sim.wall_state.voxelGridFor(sim);
  const lead = leadTiming(sim, grid, timing);
  const crit = { galena: MINERAL_GATES_REGISTRY.galena.sigma_crit, plumbogummite: MINERAL_GATES_REGISTRY.plumbogummite.sigma_crit };
  const past = { galena: 0, plumbogummite: 0 };
  const origNucleation = sim.check_nucleation;
  sim.check_nucleation = function (...a) {
    for (const m of Object.keys(past)) if (this.conditions['supersaturation_' + m]() > crit[m]) past[m]++;
    return origNucleation.apply(this, a);
  };
  const steps = defaultSteps ?? 100;
  let eventRefusals = 0, amazoniteLogLines = 0, amazoniteLogShown = 0, stepsShown = 0;
  for (let i = 0; i < steps; i++) {
    const log = sim.run_step();
    // js/91-ui-legends.ts, runSimulation: the steps whose lines Simulation mode prints (s is this index)
    const show = (i % 5 === 0) || log.some(l => l.includes('EVENT') || l.includes('NUCLEATION') || l.includes('🧱'));
    const shown = show && log.length > 0;
    if (shown) stepsShown++;
    for (const line of log) {
      if (REFUSAL.test(line)) eventRefusals++;
      if (AMAZONITE_LINE.test(line)) { amazoniteLogLines++; if (shown) amazoniteLogShown++; }
    }
  }
  const audit = {
    eventRefusals,
    failedCarbonateTransactions: (sim._carbonateBoundaryState?.transactions || []).filter(t => t && t.ok === false).length,
    ledgerViolations: (sim._sulfurPropagationViolations || []).length + (sim._carbonPropagationViolations || []).length
      + (sim._fluidBoundaryViolations || []).length,
  };
  // what three of the game's readers give for each feldspar crystal that holds solid
  const withSolid = sim.crystals.filter(c => c.mineral === 'feldspar' && c.total_growth_um > 0);
  const feldsparShown = withSolid.map(c => `${mm(c.total_growth_um)} mm ${crystalDisplayName(c)} ${crystalColor(c)}`);
  const feldsparBar = withSolid.map(c => {
    // the Zone History bar's segments: share of the bar's thickness under each colour
    const segs = groupZonesByChemistry(c.zones, c.mineral, c);
    const total = segs.reduce((s, g) => s + g.totalThickness, 0) || 1;
    const by = {};
    for (const g of segs) { const k = g.isDissolution ? 'dissolution' : g.color; by[k] = (by[k] || 0) + g.totalThickness; }
    return `${mm(c.total_growth_um)} mm: ` + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, t]) => `${k} ${(t / total * 100).toFixed(1)} %`).join(', ');
  });
  const feldsparBody = withSolid.map(c => `${mm(c.total_growth_um)} mm ${resolveBodyColour(c, MINERAL_SPEC.feldspar)}`);
  const feldsparBodyLead = withSolid.map(c => `${mm(c.total_growth_um)} mm ${Number(_bodyFieldVal(c, 'Pb')).toFixed(3)}`);
  const of = (m) => left(sim, m);
  const uraninite = sim.crystals.filter(c => c.mineral === 'uraninite');
  const negative = uraninite.flatMap(c => c.zones.filter(z => z.thickness_um < 0).map(z => z.step));
  const feldspar = sim.crystals.filter(c => c.mineral === 'feldspar').flatMap(c => c.zones.filter(z => z.thickness_um > 0));
  const amazonite = feldspar.filter(z => /^amazonite/.test(z.note || ''));
  // presence as tools/sim-side-ab.mjs reads it: a species is present when one of its crystals has solid left
  const species = {};
  for (const c of sim.crystals) {
    if (!(c.total_growth_um > 0)) continue;
    const o = (species[c.mineral] ||= { n: 0, max_um: 0 });
    o.n++;
    if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
  }
  let voxPb = 0;
  for (const v of grid.voxels) voxPb += Number(v.fluid.Pb) || 0;
  return {
    species, voxPb: voxPb / grid.voxels.length,
    records: [...new Set(sim.crystals.map(c => c.mineral))].sort(),     // every mineral with a crystal on record at run end
    summary: summarize(sim), fill: sim.get_vug_fill(), bulkPb: Number(sim.conditions.fluid.Pb), past,
    galena: of('galena'), plumbogummite: of('plumbogummite'),
    uraniniteMm: uraninite.length ? Math.max(...uraninite.map(c => c.total_growth_um)) / 1000 : 0,
    negativeZones: negative.length, negativeFrom: negative.length ? Math.min(...negative) : null,
    releases: lead.releases, released: lead.released, audit, feldsparShown, feldsparBar, feldsparBody, feldsparBodyLead, amazoniteLogLines, amazoniteLogShown, stepsShown, steps,
    feldsparZones: feldspar.length, amazoniteZones: amazonite.length,
    feldsparMm: feldspar.reduce((s, z) => s + z.thickness_um, 0) / 1000, amazoniteMm: amazonite.reduce((s, z) => s + z.thickness_um, 0) / 1000,
  };
}

console.log(`probe-lead-choices — SIM ${SIM_VERSION}; seeds ${SEEDS.join(' / ')}; sigma_crit: galena ${MINERAL_GATES_REGISTRY.galena.sigma_crit}, plumbogummite ${MINERAL_GATES_REGISTRY.plumbogummite.sigma_crit}`);
const shipped = {};
for (const name of ['radioactive_pegmatite', 'schneeberg']) {
  shipped[name] = SEEDS.map(seed => run(name, seed));
  console.log(`${name}, seed 42: the shipped run ${JSON.stringify(shipped[name][0].summary) === JSON.stringify(BASELINE[name]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}`);
}

console.log('\nradioactive_pegmatite — when the lead is released, and whether galena is licensed');
for (const open of [false, true]) {
  console.log(`\n  ${open ? 'pocket held open (sigma of feldspar, albite and quartz capped at 8)' : 'pocket as shipped'}`);
  for (const license of [false, true]) {
    for (const timing of ['shipped', 'pb', 'held']) {
      const runs = (!open && !license && timing === 'shipped') ? shipped.radioactive_pegmatite : SEEDS.map(seed => run('radioactive_pegmatite', seed, { timing, license, open }));
      const each = (f) => runs.map(f).join(' / ');
      console.log(`    ${timing.padEnd(7)} ${license ? 'galena licensed    ' : 'galena not licensed'}  fill ${each(r => (r.fill * 100).toFixed(1))} %; bulk Pb at run end ${each(r => r.bulkPb.toFixed(1))}; uraninite negative zones ${each(r => r.negativeZones)}${runs.some(r => r.negativeFrom != null) ? ` (from step ${each(r => r.negativeFrom ?? '—')})` : ''}${timing === 'held' ? `; released ${each(r => r.released.toFixed(1))} ppm in ${each(r => r.releases)} release(s)` : ''}`);
      console.log(`    ${''.padEnd(27)}  past sigma_crit on the bulk handle: galena on ${each(r => r.past.galena)} steps, plumbogummite on ${each(r => r.past.plumbogummite)}`);
      console.log(`    ${''.padEnd(27)}  galena: ${each(r => r.galena)}`);
      console.log(`    ${''.padEnd(27)}  plumbogummite: ${each(r => r.plumbogummite)}`);
    }
  }
}

// The comparison tools/sim-side-ab.mjs makes, copied: moved is a change in the number of crystals
// with solid or in the largest by a factor of more than 1.25 (on the sizes plus one micrometre).
function compare(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  // what the locality gate asks: does a mineral have a crystal on record in one run and not the other
  const appeared = B.records.filter(m => !A.records.includes(m)), vanished = A.records.filter(m => !B.records.includes(m));
  return { moved, gained, lost, appeared, vanished, same: JSON.stringify(A.summary) === JSON.stringify(B.summary) };
}

console.log('\nboth timings in the two scenarios that grow uraninite, pocket as shipped, galena not licensed, against the shipped run');
console.log('(amazonite: grow_feldspar notes a microcline zone "amazonite" when the crystal\'s own cell holds more than 10 ppm of Pb)');
for (const name of ['radioactive_pegmatite', 'schneeberg']) {
  for (const timing of ['shipped', 'pb', 'held']) {
    const runs = timing === 'shipped' ? shipped[name] : SEEDS.map(seed => run(name, seed, { timing }));
    const each = (f) => runs.map(f).join(' / ');
    const c = runs.map((r, i) => compare(shipped[name][i], r));
    console.log(`  ${name.padEnd(22)} ${timing.padEnd(8)} bulk Pb ${each(r => r.bulkPb.toFixed(1))}, voxel mean ${each(r => r.voxPb.toFixed(1))}${timing === 'held' ? `; released ${each(r => r.released.toFixed(1))} ppm in ${each(r => r.releases)} release(s)` : ''}`);
    if (timing !== 'shipped') console.log(`  ${''.padEnd(31)} species moved ${c.map(x => x.moved.length ? `${x.moved.length} (${x.moved.join(', ')})` : '0').join(' / ')}; gained ${c.map(x => x.gained.join('+') || 'none').join(' / ')}; lost ${c.map(x => x.lost.join('+') || 'none').join(' / ')}; the baseline differs ${c.map(x => (x.same ? 'no' : 'yes')).join(' / ')}; minerals on record under the arm and not as shipped ${c.map(x => x.appeared.join('+') || 'none').join(' / ')}, and the reverse ${c.map(x => x.vanished.join('+') || 'none').join(' / ')}`);
    console.log(`  ${''.padEnd(31)} feldspar zones noted amazonite: ${each(r => `${r.amazoniteZones} of ${r.feldsparZones} (${r.amazoniteMm.toFixed(1)} of ${r.feldsparMm.toFixed(1)} mm)`)}`);
    console.log(`  ${''.padEnd(31)} the run's own step log, lines for a feldspar zone that say amazonite (run_step's returned lines): ${each(r => r.amazoniteLogLines)}`);
    console.log(`  ${''.padEnd(31)} … of those, on the steps Simulation mode prints (${each(r => r.stepsShown)} of ${each(r => r.steps)} steps): ${each(r => r.amazoniteLogShown)}`);
    console.log(`  ${''.padEnd(31)} feldspar crystals with solid, name and colour (crystalDisplayName, crystalColor): ${each(r => r.feldsparShown.join(', ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} … their Zone History bar, share of thickness under each colour (groupZonesByChemistry): ${each(r => r.feldsparBar.join('; ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} … their body colour in the cavity view (resolveBodyColour): ${each(r => r.feldsparBody.join(', ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} … the trace lead that colour's rule reads, weighted by zone thickness (_bodyFieldVal; the amazonite variant asks for more than 5): ${each(r => r.feldsparBodyLead.join(', ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} the simulator's own audits: event refusals ${each(r => r.audit.eventRefusals)}; failed carbonate transactions ${each(r => r.audit.failedCarbonateTransactions)}; ledger violations ${each(r => r.audit.ledgerViolations)}${timing === 'shipped' ? '' : runs.every((r, i) => JSON.stringify(r.audit) === JSON.stringify(shipped[name][i].audit)) ? ' (as shipped at every seed)' : ' (DIFFERS FROM SHIPPED)'}`);
  }
}

console.log('\nif SC2 lands first: radioactive_pegmatite, pocket held open, galena not licensed, with galena, molybdenite and uraninite on sigma − 1 (excess=1)');
for (const sc2 of [false, true]) {
  for (const timing of ['pb', 'held']) {
    const runs = SEEDS.map(seed => run('radioactive_pegmatite', seed, { timing, open: true, sc2 }));
    const each = (f) => runs.map(f).join(' / ');
    console.log(`  ${(sc2 ? 'with SC2' : 'today\'s law').padEnd(11)} ${timing.padEnd(5)} uraninite largest ${each(r => r.uraniniteMm.toFixed(1))} mm; bulk Pb at run end ${each(r => r.bulkPb.toFixed(1))}${timing === 'held' ? `; released ${each(r => r.released.toFixed(1))} ppm in ${each(r => r.releases)} release(s)` : ''}; fill ${each(r => (r.fill * 100).toFixed(1))} %`);
    console.log(`  ${''.padEnd(17)} plumbogummite: ${each(r => r.plumbogummite)}`);
  }
}

// ---- fourth part ----
const STARTER_STEPS = 120, ACTION_AFTER = 60, ZEN_STEPS = 600;
// Advance a simulator and note the first steps at which the fill passes 0.7 and reaches 0.999.
function advance(sim, steps, step, track) {
  for (let i = 0; i < steps; i++) {
    step();
    const fill = sim.get_vug_fill();
    if (track.first70 == null && fill >= 0.7) track.first70 = sim.step;
    if (track.full == null && fill >= 0.999) track.full = sim.step;
  }
}
// What one run left, read the same way for every entry. `start` is read before the first step.
function readElsewhere(sim, grid, lead, start, track) {
  const uraninite = sim.crystals.filter(c => c.mineral === 'uraninite');
  const negative = uraninite.flatMap(c => c.zones.filter(z => z.thickness_um < 0).map(z => z.step));
  const galenaGrowth = sim.crystals.filter(c => c.mineral === 'galena').flatMap(c => c.zones.filter(z => z.thickness_um > 0).map(z => z.step));
  let pbLow = Infinity, pbHigh = -Infinity, o2High = -Infinity;
  for (const v of grid.voxels) {
    const p = Number(v.fluid.Pb), o = Number(v.fluid.O2);
    if (p < pbLow) pbLow = p;
    if (p > pbHigh) pbHigh = p;
    if (o > o2High) o2High = o;
  }
  return {
    ...start, steps: sim.step - start.step, fill: sim.get_vug_fill(), first70: track.first70, full: track.full,
    uraninites: uraninite.length, uraniniteMm: uraninite.length ? Math.max(...uraninite.map(c => c.total_growth_um)) / 1000 : 0,
    negative: negative.length, negativeFrom: negative.length ? Math.min(...negative) : null,
    bulkPb: Number(sim.conditions.fluid.Pb), pbLow, pbHigh, bulkO2: Number(sim.conditions.fluid.O2), o2High,
    store: lead.store, releases: lead.releases, released: lead.released, firstRelease: lead.first,
    galena: left(sim, 'galena'), galenaLast: galenaGrowth.length ? Math.max(...galenaGrowth) : null,
    plumbogummite: left(sim, 'plumbogummite'),
    records: [...new Set(sim.crystals.map(c => c.mineral))].sort(), summary: summarize(sim),
  };
}
const startOf = (sim) => ({ step: sim.step, pb0: Number(sim.conditions.fluid.Pb), scenario: sim.conditions._scenario != null, events: (sim.events || []).length });
function printElsewhere(timing, runs, asShipped) {
  const each = (f) => runs.map(f).join(' / ');
  console.log(`    ${timing.padEnd(8)} fill ${each(r => (r.fill * 100).toFixed(0))} % (past 0.7 at step ${each(r => r.first70 ?? '—')}, full at step ${each(r => r.full ?? '—')}); uraninites on record ${each(r => r.uraninites)}, largest ${each(r => r.uraniniteMm.toFixed(1))} mm, their negative zones ${each(r => r.negative)}${runs.some(r => r.negativeFrom != null) ? ` (from step ${each(r => r.negativeFrom ?? '—')})` : ''}; O2 on the bulk handle at the end ${each(r => r.bulkO2.toFixed(2))}, highest voxel ${each(r => r.o2High.toFixed(2))}`);
  console.log(`    ${''.padEnd(8)} Pb on the bulk handle, start → end: ${each(r => `${r.pb0.toFixed(1)} → ${r.bulkPb.toFixed(1)}`)}; lowest..highest voxel at the end: ${each(r => `${r.pbLow.toFixed(2)}..${r.pbHigh.toFixed(2)}`)}${timing === 'held' ? `; kept back and not released ${each(r => r.store.toFixed(1))} ppm; released ${each(r => r.released.toFixed(1))} ppm in ${each(r => r.releases)} release(s)${runs.some(r => r.firstRelease) ? `, the first at step ${each(r => (r.firstRelease ? `${r.firstRelease.step} (${r.firstRelease.ppm.toFixed(1)} ppm)` : '—'))}` : ''}` : ''}`);
  console.log(`    ${''.padEnd(8)} galena: ${each(r => r.galena)}${runs.some(r => r.galenaLast != null) ? `, its last zone at step ${each(r => r.galenaLast ?? '—')}` : ''}; plumbogummite: ${each(r => r.plumbogummite)}${timing === 'shipped' ? '' : `; minerals on record under the arm and not as shipped ${runs.map((r, i) => r.records.filter(m => !asShipped[i].records.includes(m)).join('+') || 'none').join(' / ')}, and the reverse ${runs.map((r, i) => asShipped[i].records.filter(m => !r.records.includes(m)).join('+') || 'none').join(' / ')}; the baseline-style summary ${runs.map((r, i) => (JSON.stringify(r.summary) === JSON.stringify(asShipped[i].summary) ? 'as shipped' : 'differs')).join(' / ')}`}`);
}

console.log('\nwhere the game runs a fluid that grows uraninite without the scenario\'s events: the three timings; no scenario object in any of these runs, and so no license');
console.log(`\n  Creative mode, starter fluid "Radioactive Pegmatite": fortressBeginFromStarterFluid('radioactive', seed) itself (js/94-ui-menu.ts); ${STARTER_STEPS} steps of run_step alone; time scale ${getSimulationTimeScale()}`);
{
  // action: null for a run left to itself, or one of the page's own Creative actions, made once
  // after `after` steps through fortressStep (js/97-ui-fortress.ts), which advances no step.
  const EARLY = 30;
  const starter = (seed, timing, action = null, after = ACTION_AFTER) => {
    setSeed(seed);
    fortressBeginFromStarterFluid('radioactive', seed);
    const sim = globalThis.window?.vugg?.fortressSim;
    if (!sim) throw new Error('fortressBeginFromStarterFluid left no simulator under the harness');
    const grid = sim.wall_state.voxelGridFor(sim);
    const start = startOf(sim);
    const lead = leadTiming(sim, grid, timing);
    const track = { first70: null, full: null };
    // The run as it stands after EARLY and after ACTION_AFTER steps, read before any action made at
    // that step: what a run with an action has to share with the one left to itself.
    const stamps = {};
    let act = null, done = 0;
    for (const mark of [...new Set([EARLY, ACTION_AFTER, after])].sort((a, b) => a - b)) {
      advance(sim, mark - done, () => sim.run_step(), track);
      done = mark;
      stamps[mark] = JSON.stringify(summarize(sim)) + ' ' + Number(sim.conditions.fluid.Pb) + ' ' + lead.store;
      if (action != null && mark === after) {
        const o2Before = Number(sim.conditions.fluid.O2), tBefore = Number(sim.conditions.temperature);
        fortressStep(action);
        if (sim.step !== start.step + after) throw new Error(`fortressStep('${action}') moved the simulator to step ${sim.step}`);
        let voxelHigh = -Infinity;
        for (const v of grid.voxels) if (Number(v.fluid.O2) > voxelHigh) voxelHigh = Number(v.fluid.O2);
        act = { o2Before, o2After: Number(sim.conditions.fluid.O2), voxelHigh, tBefore, tAfter: Number(sim.conditions.temperature) };
      }
    }
    advance(sim, STARTER_STEPS - done, () => sim.run_step(), track);
    const out = readElsewhere(sim, grid, lead, start, track);
    out.act = act;
    out.before = stamps[ACTION_AFTER];
    out.stamps = stamps;
    return out;
  };
  const all = {};
  for (const timing of ['shipped', 'pb', 'held']) {
    all[timing] = SEEDS.map(seed => starter(seed, timing));
    printElsewhere(timing, all[timing], all.shipped);
  }
  const every = Object.values(all).flat();
  console.log(`    controls over the ${every.length} starter runs: scenario object ${every.some(r => r.scenario) ? 'PRESENT at some seed' : 'absent in every run'}; events ${every.every(r => r.events === 0) ? 'none in every run' : 'SOME'}; steps run: ${every.every(r => r.steps === STARTER_STEPS) ? `${STARTER_STEPS} in every run` : 'NOT THE NUMBER ASKED FOR'}`);

  // A player can alter the uraninite. Creative mode's Drain action lowers the water level and sets
  // O2 on the bulk handle to at least 0.6 (js/97-ui-fortress.ts, case 'drain').
  console.log(`\n  the same starter fluid with one Drain after step ${ACTION_AFTER}: the page's own fortressStep('drain') (js/97-ui-fortress.ts), called once between two steps`);
  const drained = {};
  for (const timing of ['shipped', 'pb', 'held']) {
    drained[timing] = SEEDS.map(seed => starter(seed, timing, 'drain'));
    if (timing === 'shipped') console.log(`    the action: O2 on the bulk handle ${drained.shipped.map(r => `${r.act.o2Before.toFixed(2)} → ${r.act.o2After.toFixed(2)}`).join(' / ')}; highest voxel right after it ${drained.shipped.map(r => r.act.voxelHigh.toFixed(2)).join(' / ')}`);
    printElsewhere(timing, drained[timing], drained.shipped);
  }
  const everyDrained = Object.values(drained).flat();
  const sameBefore = ['shipped', 'pb', 'held'].every(timing => drained[timing].every((r, i) => r.before === all[timing][i].before));
  console.log(`    controls over the ${everyDrained.length} drained runs: steps run: ${everyDrained.every(r => r.steps === STARTER_STEPS) ? `${STARTER_STEPS} in every run` : 'NOT THE NUMBER ASKED FOR'}; the action raised O2 on the bulk handle ${everyDrained.every(r => r.act.o2After > r.act.o2Before) ? 'in every run' : 'IN NOT EVERY RUN'}; before the action each drained run ${sameBefore ? 'is the run left to itself, at every seed and timing' : 'IS A DIFFERENT RUN'}`);

  // Two more of the same kind: the page's other button that raises O2 (Evaporate sets it to at
  // least 1.5, and also drops the water level further, concentrates eight species by 1.4 and cools
  // the fluid by 10 °C), and the same Drain made earlier in the run.
  for (const [label, action, after] of [['one Evaporate after step 60', 'evaporate', ACTION_AFTER], ['one Drain after step 30', 'drain', EARLY]]) {
    console.log(`\n  the same starter fluid with ${label}: the page's own fortressStep('${action}') (js/97-ui-fortress.ts), called once between two steps`);
    const acted = {};
    for (const timing of ['shipped', 'pb', 'held']) {
      acted[timing] = SEEDS.map(seed => starter(seed, timing, action, after));
      if (timing === 'shipped') console.log(`    the action: O2 on the bulk handle ${acted.shipped.map(r => `${r.act.o2Before.toFixed(2)} → ${r.act.o2After.toFixed(2)}`).join(' / ')}; highest voxel right after it ${acted.shipped.map(r => r.act.voxelHigh.toFixed(2)).join(' / ')}; the conditions' temperature ${acted.shipped.map(r => `${r.act.tBefore.toFixed(0)} → ${r.act.tAfter.toFixed(0)}`).join(' / ')} °C`);
      printElsewhere(timing, acted[timing], acted.shipped);
    }
    const everyActed = Object.values(acted).flat();
    const sameUntil = ['shipped', 'pb', 'held'].every(timing => acted[timing].every((r, i) => r.stamps[after] === all[timing][i].stamps[after]));
    console.log(`    controls over these ${everyActed.length} runs: steps run: ${everyActed.every(r => r.steps === STARTER_STEPS) ? `${STARTER_STEPS} in every run` : 'NOT THE NUMBER ASKED FOR'}; the action raised O2 on the bulk handle ${everyActed.every(r => r.act.o2After > r.act.o2Before) ? 'in every run' : 'IN NOT EVERY RUN'}; before the action each run ${sameUntil ? 'is the run left to itself, at every seed and timing' : 'IS A DIFFERENT RUN'}`);
  }
}

// Random Vugg's pegmatite archetype draws uranium in some runs (js/96-ui-random.ts) and builds no
// scenario object. The seeds are the eight of probe-pegmatite-reach.mjs; those whose shipped run
// puts a uraninite on record are run under the other two timings.
{
  const RV_SEEDS = [42, 1, 2, 3, 4, 5, 6, 7];
  const rv = (seed, timing) => {
    setSeed(seed);
    const { conditions, events, defaultSteps } = buildRandomScenario('pegmatite', 'pocket');
    const draw = { U: Number(conditions.fluid.U) || 0, Pb: Number(conditions.fluid.Pb) || 0, S: Number(conditions.fluid.S) || 0, P: Number(conditions.fluid.P) || 0, mm: Number(conditions.wall.vug_diameter_mm), steps: defaultSteps };
    const sim = new VugSimulator(conditions, events);
    const grid = sim.wall_state.voxelGridFor(sim);
    const start = startOf(sim);
    const lead = leadTiming(sim, grid, timing);
    const track = { first70: null, full: null };
    advance(sim, defaultSteps, () => sim.run_step(), track);
    const out = readElsewhere(sim, grid, lead, start, track);
    out.draw = draw;
    return out;
  };
  const shippedRv = RV_SEEDS.map(seed => rv(seed, 'shipped'));
  const kept = RV_SEEDS.filter((seed, i) => shippedRv[i].uraninites > 0);
  console.log(`\n  Random Vugg, archetype pegmatite, size class pocket (buildRandomScenario, js/96-ui-random.ts), seeds ${RV_SEEDS.join(' / ')}: uranium in the draw, ppm ${shippedRv.map(r => r.draw.U.toFixed(0)).join(' / ')}; a uraninite on record at seeds ${kept.join(', ') || 'none'}; scenario object ${shippedRv.some(r => r.scenario) ? 'PRESENT at some seed' : 'absent at every seed'}`);
  if (kept.length) {
    const keptShipped = kept.map(seed => shippedRv[RV_SEEDS.indexOf(seed)]);
    console.log(`    those seeds (${kept.join(' / ')}): cavity ${keptShipped.map(r => r.draw.mm.toFixed(0)).join(' / ')} mm; ${keptShipped.map(r => r.draw.steps).join(' / ')} steps; in the draw Pb ${keptShipped.map(r => r.draw.Pb.toFixed(0)).join(' / ')}, S ${keptShipped.map(r => r.draw.S.toFixed(0)).join(' / ')}, P ${keptShipped.map(r => r.draw.P.toFixed(0)).join(' / ')} ppm`);
    printElsewhere('shipped', keptShipped, keptShipped);
    for (const timing of ['pb', 'held']) printElsewhere(timing, kept.map(seed => rv(seed, timing)), keptShipped);
  }
}

console.log(`\n  Zen mode by the game's own loop: switchMode('idle'), idleTogglePlay(), idleTogglePause(), then idleDoStep() ${ZEN_STEPS} times (Zen's drift, then run_step, then the page's drawing)`);
{
  // The harness's page has no scenario picker; idleTogglePlay reads the scenario from this element.
  const select = document.createElement('select');
  select.id = 'idle-scenario';
  const option = document.createElement('option');
  option.value = 'radioactive_pegmatite';
  option.textContent = 'radioactive_pegmatite';
  select.appendChild(option);
  document.body.appendChild(select);
  select.value = 'radioactive_pegmatite';

  const zen = async (seed, timing, name = 'radioactive_pegmatite') => {
    select.value = name;
    if (select.value !== name) throw new Error(`the scenario picker does not hold ${name}`);
    let threw = '';
    try { switchMode('idle'); } catch (e) { threw = String(e && e.message).slice(0, 80); }
    const scaleAtStart = getSimulationTimeScale();
    const clock = Date.now;
    Date.now = () => seed;                         // idleCreateSim seeds from the clock
    try { await idleTogglePlay(); } finally { Date.now = clock; }
    idleTogglePause();                             // the page's timer is cancelled before it has fired
    const sim = globalThis.window?.vugg?.idleSim;
    if (!sim) throw new Error(`the game left no Zen simulator under the harness${threw ? ` (switchMode threw: ${threw})` : ''}`);
    const grid = sim.wall_state.voxelGridFor(sim);
    const start = startOf(sim);
    const lead = leadTiming(sim, grid, timing);
    let drawingThrew = 0;
    const track = { first70: null, full: null };
    advance(sim, ZEN_STEPS, () => {
      const before = sim.step;
      try { idleDoStep(); } catch (e) { if (sim.step === before) throw e; drawingThrew++; }   // the physics ran; the page's drawing threw
      if (sim.step !== before + 1) throw new Error(`one idleDoStep moved the simulator from step ${before} to step ${sim.step}`);
    }, track);
    const out = readElsewhere(sim, grid, lead, start, track);
    Object.assign(out, { scaleAtStart, scaleAtEnd: getSimulationTimeScale(), drawingThrew, switchThrew: threw });
    idleStop();
    try { idlePickScenario(name); } catch (e) { out.pickThrew = String(e && e.message).slice(0, 60); }
    out.left = globalThis.window.vugg.idleSim == null ? 'none' : 'A SIMULATOR';
    return out;
  };
  const all = {};
  for (const timing of ['shipped', 'pb', 'held']) {
    all[timing] = [];
    for (const seed of SEEDS) all[timing].push(await zen(seed, timing));
    printElsewhere(timing, all[timing], all.shipped);
  }
  const again = await zen(SEEDS[0], 'shipped');
  const every = Object.values(all).flat();
  console.log(`    controls over the ${every.length} Zen runs: the simulator's step before the first idleDoStep ${every.every(r => r.step === 0) ? 'is 0 in every run' : 'IS NOT 0 IN SOME RUN'}; time scale after switchMode('idle') ${every.every(r => r.scaleAtStart === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}, and at the end of the run ${every.every(r => r.scaleAtEnd === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}; scenario object ${every.some(r => r.scenario) ? 'PRESENT in some run' : 'absent in every run'}; events ${every.every(r => r.events === 0) ? 'none in every run' : 'SOME'}; switchMode ${every.some(r => r.switchThrew) ? 'THREW in some run' : 'threw in none'}; idleDoStep calls whose drawing threw after the physics had run: ${every.reduce((a, r) => a + r.drawingThrew, 0)}; Zen simulator left on the page after a run was ended: ${every.every(r => r.left === 'none') ? 'none' : 'ONE WAS LEFT'}${every.some(r => r.pickThrew) ? '; idlePickScenario THREW in some run' : ''}; the first run, made again after the other eight, ${JSON.stringify(again.summary) === JSON.stringify(all.shipped[0].summary) && again.bulkPb === all.shipped[0].bulkPb ? 'is the same run' : 'IS A DIFFERENT RUN'}`);

  // Zen offers every scenario. schneeberg is the other scenario whose own run grows a uraninite, and
  // its Zen simulator grows one too (probe-zen-drift.mjs, Part 3). The same loop, the same timings.
  {
    const other = 'schneeberg';
    const second = document.createElement('option');
    second.value = other;
    second.textContent = other;
    select.appendChild(second);
    console.log(`\n  the same loop on ${other}, ${ZEN_STEPS} steps`);
    const runs = {};
    for (const timing of ['shipped', 'pb', 'held']) {
      runs[timing] = [];
      for (const seed of SEEDS) runs[timing].push(await zen(seed, timing, other));
      printElsewhere(timing, runs[timing], runs.shipped);
      // every mineral on record under the arm and not as shipped, with its count and its largest crystal
      if (timing !== 'shipped') console.log(`    ${''.padEnd(8)} on record under the arm and not as shipped, with the largest crystal: ${runs[timing].map((r, i) => r.records.filter(m => !runs.shipped[i].records.includes(m)).map(m => `${m} ×${r.summary[m].total} @ ${mm(r.summary[m].max_um)} mm`).join(', ') || 'none').join(' / ')}`);
    }
    const repeat = await zen(SEEDS[0], 'shipped', other);
    const each = Object.values(runs).flat();
    console.log(`    controls over the ${each.length} Zen runs of ${other}: the simulator's step before the first idleDoStep ${each.every(r => r.step === 0) ? 'is 0 in every run' : 'IS NOT 0 IN SOME RUN'}; time scale after switchMode('idle') ${each.every(r => r.scaleAtStart === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}, and at the end of the run ${each.every(r => r.scaleAtEnd === 1) ? '1 in every run' : 'NOT 1 IN SOME RUN'}; scenario object ${each.some(r => r.scenario) ? 'PRESENT in some run' : 'absent in every run'}; events ${each.every(r => r.events === 0) ? 'none in every run' : 'SOME'}; switchMode ${each.some(r => r.switchThrew) ? 'THREW in some run' : 'threw in none'}; idleDoStep calls whose drawing threw after the physics had run: ${each.reduce((a, r) => a + r.drawingThrew, 0)}; Zen simulator left on the page after a run was ended: ${each.every(r => r.left === 'none') ? 'none' : 'ONE WAS LEFT'}${each.some(r => r.pickThrew) ? '; idlePickScenario THREW in some run' : ''}; the first run, made again after the other eight, ${JSON.stringify(repeat.summary) === JSON.stringify(runs.shipped[0].summary) && repeat.bulkPb === runs.shipped[0].bulkPb ? 'is the same run' : 'IS A DIFFERENT RUN'}`);
  }
  setSimulationTimeScale(5);
}

{
  const again = run('radioactive_pegmatite', 42);
  console.log(`\ncontrols at the end: the time scale reads ${getSimulationTimeScale()}; radioactive_pegmatite's shipped run at seed 42 ${JSON.stringify(again.summary) === JSON.stringify(BASELINE.radioactive_pegmatite) ? 'still reproduces the baseline' : 'NO LONGER REPRODUCES THE BASELINE'}`);
}
// The page's code may leave a timer behind; leave once the output is written.
process.stdout.write('', () => process.exit(0));
