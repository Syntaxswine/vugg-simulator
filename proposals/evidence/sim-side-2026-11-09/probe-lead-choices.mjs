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
 * grain, and the probe runs three of its readers on each feldspar crystal that holds solid:
 *   name, colour   crystalDisplayName and crystalColor (js/12-mineral-art.ts): per crystal. A
 *                  microcline is named "amazonite" and coloured green when ANY one of its zones
 *                  carries the note.
 *   zone bar       groupZonesByChemistry (js/98c-ui-zone-bars.ts), which the Zone History bar
 *                  draws: per zone, by thickness. Each zone is coloured as a one-zone crystal and
 *                  consecutive zones of one colour are merged; the probe prints the share of the
 *                  bar's thickness under each colour.
 *   body colour    resolveBodyColour (js/12a-colour-lexicon.ts), the base colour the cavity view
 *                  starts a crystal's body from.
 * Other lines of js/ that read the note (the fluorescence line of js/27-geometry-crystal.ts, the
 * feldspar narrator of js/92i-narrators-silicate.ts) use the per-crystal test and are not run.
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
 * The values are restored, never subtracted (the bulk handle's Pb before the block is read at the
 * _sealVugIfFilled call that precedes it and put back at _check_enclosure, the first call after it).
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports tools/_harness.mjs and node builtins.
 * At seed 42 the shipped run of each scenario is compared with the committed baseline.
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
  groupZonesByChemistry, resolveBodyColour, MINERAL_SPEC,
} = await harness.loadSimBundle({
  toolName: 'probe-lead-choices',
  extraExports: ['MINERAL_GATES_REGISTRY', 'MINERAL_ENGINES', 'crystalDisplayName', 'crystalColor', 'groupZonesByChemistry', 'resolveBodyColour', 'MINERAL_SPEC'],
});
// tools/sim-side-ab.mjs REFUSAL, copied: a CO2 or carbonate event of js/70l that says it was paused or refused.
const REFUSAL = /(CO₂|Carbonate) [a-z₂ ]*(paused|refused): /;
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
  let before = null, store = 0, releases = 0, released = 0;
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
          store += Math.max(0, inc);
          this.conditions.fluid.Pb = before;                       // restored, not subtracted
          const altered = this.crystals.some(c => c.mineral === 'uraninite' && c.zones.some(z => z.step === this.step && z.thickness_um < 0));
          if (altered && store > 0) {
            this.conditions.fluid.Pb = before + store;
            for (const v of grid.voxels) v.fluid.Pb += store;
            releases++; released += store; store = 0;
          }
        }
        before = null;
      }
      return origEnclosure.call(this);
    };
  }
  const crit = { galena: MINERAL_GATES_REGISTRY.galena.sigma_crit, plumbogummite: MINERAL_GATES_REGISTRY.plumbogummite.sigma_crit };
  const past = { galena: 0, plumbogummite: 0 };
  const origNucleation = sim.check_nucleation;
  sim.check_nucleation = function (...a) {
    for (const m of Object.keys(past)) if (this.conditions['supersaturation_' + m]() > crit[m]) past[m]++;
    return origNucleation.apply(this, a);
  };
  const steps = defaultSteps ?? 100;
  let eventRefusals = 0;
  for (let i = 0; i < steps; i++) {
    for (const line of sim.run_step()) if (REFUSAL.test(line)) eventRefusals++;
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
  const of = (m) => {
    const all = sim.crystals.filter(c => c.mineral === m), solid = all.filter(c => c.total_growth_um > 0);
    if (!all.length) return 'none';
    if (!solid.length) return `no solid (${all.length} record${all.length === 1 ? '' : 's'})`;
    return `×${solid.length} @ ${mm(Math.max(...solid.map(c => c.total_growth_um)))} mm, born at step ${Math.min(...solid.map(c => c.nucleation_step))}`;
  };
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
    releases, released, audit, feldsparShown, feldsparBar, feldsparBody,
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
    console.log(`  ${''.padEnd(31)} feldspar crystals with solid, name and colour (crystalDisplayName, crystalColor): ${each(r => r.feldsparShown.join(', ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} … their Zone History bar, share of thickness under each colour (groupZonesByChemistry): ${each(r => r.feldsparBar.join('; ') || 'none')}`);
    console.log(`  ${''.padEnd(31)} … their body colour in the cavity view (resolveBodyColour): ${each(r => r.feldsparBody.join(', ') || 'none')}`);
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
