#!/usr/bin/env node
/**
 * probe-cation-gate.mjs — the previewed changes against a second commissioned gate of `npm run ci`
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4).
 *
 * `npm run audit:cations` is tools/cation-sink-audit.mjs on schneeberg at seed 42. Besides its
 * zero-Zn checks it holds that one run to two commissioned numbers (SCHNEEBERG_SEED42_COMMISSIONING
 * in the tool's source):
 *
 *   pharmacolite_crystals                          the pharmacolite crystals on record, exactly
 *   final_pharmacolite_Ca_molar_fraction_proxy     at run end, calcium's molar share of the six
 *                                                  cations that compete for arsenate (Ca, Cu, Pb, Zn,
 *                                                  Co, Ni; js/30-supersat-arsenate.ts), read on the
 *                                                  bulk handle, within the tool's tolerance
 *
 * Lead is one of the six, and the uraninite block writes its radiogenic lead to the bulk handle
 * (js/85-simulator.ts, `conditions.fluid.Pb += 0.1 * u_size`). So a change that moves the size of
 * schneeberg's uraninites, or what becomes of their lead, moves the second number.
 *
 * This probe runs schneeberg at seed 42 as shipped and under each previewed change that reaches it,
 * reads the two numbers the way the audit reads them, and compares them with the commissioned
 * values, which it takes from the audit tool's source. The interventions are written as
 * tools/sim-side-ab.mjs and probe-lead-choices.mjs write them:
 *
 *   SC1 written into the engines   the rate of feldspar and albite clamped, k·min(σ − 1, 7) (`rclamp=7`).
 *                                  SC1 as recommended is authored on gem_pegmatite alone, and
 *                                  schneeberg then runs as shipped.
 *   SC2, m = 1 and m = 3           every positive zone of galena, molybdenite and uraninite rescaled by
 *                                  m·(σ − 1)/σ (`excess=1`, `excess=3`)
 *   SC3, every step                the block's increment also goes to every voxel (`pb`)
 *   SC3, held                      the increment is kept back and released, to the bulk handle and to
 *                                  every voxel, on the next step on which a uraninite takes a negative
 *                                  zone (`held` of probe-lead-choices.mjs)
 *   no radiogenic lead             the increment is kept out of every fluid (`nopb`): what today's
 *                                  lead on the bulk handle contributes to the number
 *   SC2, m = 1, with SC3 held      the two recommended changes that reach this scenario, together
 *
 * (SC1 to SC3 are the document's proposed changes: a bound on the feldspar pair, the three k·σ
 * engines on σ − 1, and the radiogenic lead carried to the voxels.)
 *
 * Every SIM bump has to add a commissioning entry, because the audit looks its entry up by SIM
 * version and model digest. What this probe answers is whether the commissioned VALUES carry over.
 *
 * It also reads why pharmacolite moves when the lead reaches the cells. supersaturation_pharmacolite
 * returns 0 while calcium's share is under 0.3 and carries a factor of 1.3 while it is 0.6 or more.
 * A pass-through on pharmacolite's engine counts, in every run, the calls on which the share on the
 * fluid the engine is about to read (the crystal's own cell) is on either side of those two steps.
 * The shipped run carries the pass-through too, and still has to reproduce the baseline. The gate
 * runs seed 42 only; a last block repeats that count at seeds 1 and 2.
 *
 * Three more readings per arm, on what else follows the uraninites and the lead:
 *   uraninites   only an active uraninite writes lead; per uraninite, the steps it ended active
 *                and the first step it ended enclosed, with what enclosed it
 *   radiation    the same block of run_step gives every other active crystal a dose of 0.02 of
 *                each uraninite's size a step; the run's total dose, and the crystals past the
 *                smoky (0.3, quartz) and metamict (0.8) thresholds
 *   shown as     the name and colour the game gives each mineral's crystals (crystalDisplayName,
 *                crystalColor, js/12-mineral-art.ts), where they differ from the shipped run's
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports tools/_harness.mjs and node builtins.
 * Controls: the shipped run is compared with the committed baseline, and it has to read exactly the
 * commissioned count and a share within the tolerance; the tree's model digest has to be the
 * commissioned one.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-cation-gate.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MODEL_DIGEST, MINERAL_ENGINES, arsenateCompetingCationMolarFraction, crystalDisplayName, crystalColor } = await harness.loadSimBundle({
  toolName: 'probe-cation-gate', extraExports: ['MINERAL_ENGINES', 'arsenateCompetingCationMolarFraction', 'crystalDisplayName', 'crystalColor'],
});
const BASELINE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`), 'utf8'));
const NAME = 'schneeberg', SEED = 42;
const mm = (um) => (um / 1000).toFixed(um < 1000 ? 3 : 1);

// The commissioned values, from the audit tool's own source (the entry for the running SIM version).
const auditSource = fs.readFileSync(path.join(ROOT, 'tools', 'cation-sink-audit.mjs'), 'utf8');
const entry = new RegExp(`sim_version:\\s*${SIM_VERSION},\\s*model_digest_sha256:\\s*'([0-9a-f]{64})',\\s*pharmacolite_crystals:\\s*(\\d+),\\s*final_pharmacolite_Ca_molar_fraction_proxy:\\s*([0-9.eE+-]+),\\s*proxy_tolerance:\\s*([0-9.eE+-]+)`).exec(auditSource);
if (!entry) throw new Error(`tools/cation-sink-audit.mjs holds no commissioning entry for SIM ${SIM_VERSION}`);
const COMMISSIONED = { digest: entry[1], count: Number(entry[2]), share: Number(entry[3]), tolerance: Number(entry[4]) };
const modelDigest = crypto.createHash('sha256').update(MODEL_DIGEST).digest('hex');

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

// tools/cation-sink-audit.mjs bookedInventory(), copied: what the solids still hold of one species.
function booked(sim, species) {
  let total = 0;
  for (const crystal of sim.crystals) {
    for (const zone of crystal.zones || []) {
      const remaining = Number.isFinite(Number(zone._remaining_solid_um)) ? Math.max(0, Number(zone._remaining_solid_um)) : Math.max(0, Number(zone.thickness_um) || 0);
      total += remaining * Math.max(0, Number(zone._budget_inventory_per_um?.[species]) || 0);
    }
  }
  return total;
}

// What the game shows for each mineral: the distinct name and colour of its crystals that hold solid
// (crystalDisplayName and crystalColor, js/12-mineral-art.ts, which the lists, the cards and the
// narrators read).
function shownAs(sim) {
  const out = {};
  for (const c of sim.crystals) {
    if (!(c.total_growth_um > 0)) continue;
    (out[c.mineral] ||= new Set()).add(`${crystalDisplayName(c)} ${crystalColor(c)}`);
  }
  return Object.fromEntries(Object.entries(out).map(([m, s]) => [m, [...s].sort()]));
}
function shownDifferently(A, B) {
  return Object.keys(A).filter(m => B[m] && JSON.stringify(A[m]) !== JSON.stringify(B[m])).sort()
    .map(m => `${m}: ${A[m].join(', ')} → ${B[m].join(', ')}`);
}

// One run. engines: { minerals, excess, rclamp } wraps those growth engines as the A/B tool does.
function run({ engines = [], timing = 'shipped' } = {}, seed = SEED) {
  const saved = {};
  try {
    for (const arm of engines) {
      for (const m of arm.minerals) {
        if (!(m in saved)) saved[m] = MINERAL_ENGINES[m];
        const orig = MINERAL_ENGINES[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          const s = conditions['supersaturation_' + m]();           // read before the engine runs; draws no random number
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          let f = 1;
          if (arm.excess != null) f *= s > 0 ? arm.excess * Math.max(0, s - 1) / s : 0;
          if (arm.rclamp != null && s - 1 > arm.rclamp) f *= arm.rclamp / (s - 1);
          if (f !== 1) {
            zone.thickness_um *= f;
            if (typeof zone.growth_rate === 'number') zone.growth_rate *= f;
          }
          return zone;
        };
      }
    }
    // A pass-through on pharmacolite's engine, in every run: calcium's share on the fluid the engine
    // is about to read, which is the crystal's own cell. supersaturation_pharmacolite returns 0
    // under a share of 0.3 and carries a factor of 1.3 from 0.6 up (js/30-supersat-arsenate.ts).
    const shareAtEngine = { calls: 0, bonus: 0, zero: 0 };
    {
      if (!('pharmacolite' in saved)) saved.pharmacolite = MINERAL_ENGINES.pharmacolite;
      const orig = MINERAL_ENGINES.pharmacolite;
      MINERAL_ENGINES.pharmacolite = (crystal, conditions, step) => {
        const x = arsenateCompetingCationMolarFraction(conditions.fluid, 'Ca');
        shareAtEngine.calls++;
        if (x >= 0.6) shareAtEngine.bonus++;
        if (x < 0.3) shareAtEngine.zero++;
        return orig(crystal, conditions, step);
      };
    }
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[NAME]();
    const sim = new VugSimulator(conditions, events);
    const grid = sim.wall_state.voxelGridFor(sim);
    const mesh = sim.wall_state.meshFor(sim);
    let before = null, store = 0, releases = 0;
    if (timing !== 'shipped') {
      // The uraninite block sits between a call of _sealVugIfFilled and the one call of _check_enclosure.
      // The bulk handle's Pb is read after the first and again before the second.
      const origSeal = sim._sealVugIfFilled;
      sim._sealVugIfFilled = function (...a) { const out = origSeal.apply(this, a); before = Number(this.conditions.fluid.Pb); return out; };
      const origEnclosure = sim._check_enclosure;
      sim._check_enclosure = function () {
        if (before != null) {
          const inc = Number(this.conditions.fluid.Pb) - before;
          if (timing === 'pb') {
            if (inc > 0) for (const v of grid.voxels) v.fluid.Pb += inc;
          } else if (timing === 'nopb') {
            this.conditions.fluid.Pb = before;                       // restored, not subtracted
          } else {
            store += Math.max(0, inc);
            this.conditions.fluid.Pb = before;                       // restored, not subtracted
            const altered = this.crystals.some(c => c.mineral === 'uraninite' && c.zones.some(z => z.step === this.step && z.thickness_um < 0));
            if (altered && store > 0) {
              this.conditions.fluid.Pb = before + store;
              for (const v of grid.voxels) v.fluid.Pb += store;
              releases++; store = 0;
            }
          }
          before = null;
        }
        return origEnclosure.call(this);
      };
    }
    const steps = defaultSteps ?? 160;
    let peakZn = 0;
    const zn = () => {
      peakZn = Math.max(peakZn, Math.abs(Number(sim.conditions.fluid.Zn) || 0));
      for (const v of grid.voxels) { const x = Math.abs(Number(v.fluid.Zn) || 0); if (x > peakZn) peakZn = x; }
    };
    zn();
    // Only an active uraninite writes lead (js/85-simulator.ts, the uraninite block). Per uraninite:
    // the steps it ended active, and the first step it ended enclosed, with what enclosed it.
    const activeSteps = new Map(), enclosedAt = new Map();
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      zn();
      for (const c of sim.crystals) {
        if (c.mineral !== 'uraninite') continue;
        if (c.active) activeSteps.set(c.crystal_id, (activeSteps.get(c.crystal_id) || 0) + 1);
        if (c.enclosed_by != null && !enclosedAt.has(c.crystal_id)) enclosedAt.set(c.crystal_id, { step: sim.step, by: c.enclosed_by });
      }
    }
    // the audit's count: crystals on record, by the mineral they were born as
    const pharmacolite = sim.crystals.filter(c => (c.paramorph_origin || c.mineral) === 'pharmacolite');
    const solid = pharmacolite.filter(c => c.total_growth_um > 0);
    const uraninite = sim.crystals.filter(c => c.mineral === 'uraninite');
    const byId = new Map(sim.crystals.map(c => [c.crystal_id, c]));
    const uraninites = uraninite.map(c => {
      const e = enclosedAt.get(c.crystal_id), host = e ? byId.get(e.by) : null;
      return `#${c.crystal_id} active on ${activeSteps.get(c.crystal_id) || 0} steps${e ? `, enclosed from step ${e.step} by ${host ? host.mineral : '#' + e.by}` : ', never enclosed'}`;
    });
    // The same block gives every other active crystal a dose of 0.02 × the uraninite's size a step.
    const quartz = sim.crystals.filter(c => c.mineral === 'quartz' && c.total_growth_um > 0);
    const radiation = {
      dose: Number(sim.radiation_dose) || 0,
      smoky: quartz.filter(c => (c.radiation_damage || 0) > 0.3).length, quartz: quartz.length,
      metamict: sim.crystals.filter(c => c.total_growth_um > 0 && (c.radiation_damage || 0) > 0.8).length,
      withSolid: sim.crystals.filter(c => c.total_growth_um > 0).length,
    };
    const cellShares = solid.map(c => { const cell = mesh.cellOf(c, sim.wall_state); return cell?.fluid ? arsenateCompetingCationMolarFraction(cell.fluid, 'Ca') : null; }).filter(x => x != null).sort((a, b) => a - b);
    let voxPb = 0;
    for (const v of grid.voxels) voxPb += Number(v.fluid.Pb) || 0;
    return {
      summary: summarize(sim),
      count: pharmacolite.length, solid: solid.length, largest: solid.length ? Math.max(...solid.map(c => c.total_growth_um)) : 0,
      share: arsenateCompetingCationMolarFraction(sim.conditions.fluid, 'Ca'),
      cellShares, shareAtEngine,
      bulkPb: Number(sim.conditions.fluid.Pb), voxPb: voxPb / grid.voxels.length,
      uraninite: uraninite.length ? Math.max(...uraninite.map(c => c.total_growth_um)) : 0,
      uraninites, radiation, shown: shownAs(sim),
      peakZn, bookedZn: booked(sim, 'Zn'), releases, held: store,
    };
  } finally {
    for (const m of Object.keys(saved)) MINERAL_ENGINES[m] = saved[m];
  }
}

const PAIR = ['feldspar', 'albite'], THREE = ['galena', 'molybdenite', 'uraninite'];
const ARMS = [
  ['shipped', {}],
  ['SC1 written into the engines (rclamp=7)', { engines: [{ minerals: PAIR, rclamp: 7 }] }],
  ['SC2, same constant (excess=1)', { engines: [{ minerals: THREE, excess: 1 }] }],
  ['SC2, three times the constant (excess=3)', { engines: [{ minerals: THREE, excess: 3 }] }],
  ['SC3, every step (pb)', { timing: 'pb' }],
  ['SC3, held until alteration (held)', { timing: 'held' }],
  ['no radiogenic lead (nopb)', { timing: 'nopb' }],
  ['SC2, same constant, with SC3 held', { engines: [{ minerals: THREE, excess: 1 }], timing: 'held' }],
];

console.log(`probe-cation-gate — SIM ${SIM_VERSION}; ${NAME}, seed ${SEED}: the one run \`npm run audit:cations\` makes`);
console.log(`commissioned for SIM ${SIM_VERSION} (tools/cation-sink-audit.mjs): pharmacolite crystals ${COMMISSIONED.count}; final Ca share on the bulk handle ${COMMISSIONED.share} within ${COMMISSIONED.tolerance}`);
console.log(`model digest of this tree: ${modelDigest === COMMISSIONED.digest ? 'the commissioned one' : 'NOT THE COMMISSIONED ONE'} (${modelDigest.slice(0, 12)})`);
const results = ARMS.map(([label, arm]) => [label, run(arm)]);
const shipped = results[0][1];
console.log(`the shipped run ${JSON.stringify(shipped.summary) === JSON.stringify(BASELINE[NAME]) ? 'reproduces the baseline' : 'DOES NOT REPRODUCE THE BASELINE'}, and it ${shipped.count === COMMISSIONED.count && Math.abs(shipped.share - COMMISSIONED.share) <= COMMISSIONED.tolerance ? 'reads the commissioned values' : 'DOES NOT READ THE COMMISSIONED VALUES'} (count ${shipped.count}, share ${shipped.share}, difference ${(shipped.share - COMMISSIONED.share).toExponential(1)})`);
console.log('');
for (const [label, r] of results) {
  const off = r.share - COMMISSIONED.share;
  const countOk = r.count === COMMISSIONED.count, shareOk = Math.abs(off) <= COMMISSIONED.tolerance;
  const zinc = r.peakZn <= 1e-9 && r.bookedZn <= 1e-9;
  console.log(`  ${label}`);
  console.log(`      pharmacolite on record ${r.count}${countOk ? '' : ` (commissioned ${COMMISSIONED.count})`}; with solid ${r.solid}, largest ${r.largest.toFixed(1)} µm; uraninite largest ${mm(r.uraninite)} mm`);
  console.log(`      bulk Pb at run end ${r.bulkPb.toFixed(4)} ppm, voxel mean ${r.voxPb.toFixed(2)}${r.releases ? `; ${r.releases} releases, ${r.held.toFixed(4)} ppm still held at run end` : ''}`);
  console.log(`      final Ca share on the bulk handle ${r.share.toFixed(12)}: ${shareOk ? 'within the tolerance' : `off the commissioned value by ${off >= 0 ? '+' : ''}${off.toFixed(6)}, ${Math.round(Math.abs(off) / COMMISSIONED.tolerance).toLocaleString('en-US')} times the tolerance`}`);
  console.log(`      Ca share on the cells of the pharmacolites that hold solid, at run end: ${r.cellShares.length ? `${r.cellShares[0].toFixed(3)} to ${r.cellShares[r.cellShares.length - 1].toFixed(3)}` : 'none'}`);
  console.log(`      pharmacolite's engine ran ${r.shareAtEngine.calls} times; the Ca share on the cell it read was 0.6 or more (the factor of 1.3) on ${r.shareAtEngine.bonus} of them, and under 0.3 (sigma 0) on ${r.shareAtEngine.zero}`);
  console.log(`      Zn: ${zinc ? 'none in any fluid at any step, none booked' : `PEAK ${r.peakZn} ppm, booked ${r.bookedZn}`}`);
  console.log(`      uraninites: ${r.uraninites.join('; ') || 'none'}`);
  console.log(`      radiation: total dose ${r.radiation.dose.toFixed(1)}; quartz with solid past the smoky threshold (0.3) ${r.radiation.smoky} of ${r.radiation.quartz}; crystals with solid past the metamict threshold (0.8) ${r.radiation.metamict} of ${r.radiation.withSolid}`);
  if (r !== shipped) {
    const d = shownDifferently(shipped.shown, r.shown);
    console.log(`      minerals shown under another name or colour than as shipped: ${d.length ? d.join('; ') : 'none'}`);
  }
  console.log(`      the gate's commissioned values: ${countOk && shareOk ? 'carry over' : `do not carry over (${[countOk ? null : 'count', shareOk ? null : 'share'].filter(Boolean).join(' and ')})`}; the scenario's baseline summary ${JSON.stringify(r.summary) === JSON.stringify(shipped.summary) ? 'is as shipped' : 'differs from shipped'}`);
}

// ---- pharmacolite's factor at the other two seeds (the gate itself runs seed 42 only) ----
console.log(`\npharmacolite and the factor of 1.3 at seeds 1 and 2 (${NAME}; no gate reads these seeds)`);
for (const seed of [1, 2]) {
  for (const [label, arm] of [ARMS[0], ARMS[4], ARMS[5], ARMS[7]]) {
    const r = run(arm, seed);
    console.log(`  seed ${seed}  ${label.padEnd(36)} pharmacolite on record ${r.count}, with solid ${r.solid}, largest ${r.largest.toFixed(1)} µm; engine calls ${r.shareAtEngine.calls}, Ca share 0.6 or more on ${r.shareAtEngine.bonus}; share on their cells at run end ${r.cellShares.length ? `${r.cellShares[0].toFixed(3)} to ${r.cellShares[r.cellShares.length - 1].toFixed(3)}` : '—'}`);
  }
}
