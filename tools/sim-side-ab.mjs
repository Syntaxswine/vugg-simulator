#!/usr/bin/env node
/**
 * tools/sim-side-ab.mjs — A/B runs behind proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md.
 *
 * Arm A is the shipped simulator. Arm B is the same scenario and seed with one or more INTERVENTIONS
 * applied in this process only; nothing in js/, data/ or dist/ is touched. The interventions are
 * diagnostics that isolate a cause or preview the size of a change. None is a proposed rule or
 * constant.
 *
 *   rind=<µm>      The growth engines of --minerals add no thickness once a crystal's total_growth_um has
 *                  reached <µm>: wall-zone feldspar as a bounded rind. The engine still runs, and a
 *                  dissolution zone passes through.
 *   cap=<σ>        conditions.supersaturation_<mineral> is clamped to <σ> for --minerals, on the
 *                  scenario's own conditions object (growth, nucleation and the strangulation gate all
 *                  read that method).
 *   rclamp=<E>     The growth engines of --minerals have every positive zone scaled by
 *                  min(σ − 1, E)/(σ − 1): a rate k·(σ − 1) turned into k·min(σ − 1, E). The σ method is
 *                  left alone, so births, the competition and the strangulation gate read the unclamped
 *                  σ. σ is read on the conditions the engine is about to read, BEFORE the engine runs:
 *                  an engine may write provisional debits into the fluid inside its call (grow_albite
 *                  does), and a reading taken afterwards is a reading of a debited fluid.
 *   fcap=<c>       feldspar and albite only: each concentration factor of their supersaturation product
 *                  is capped at <c>, as the factor-capped silicates of js/39 are. Applied as
 *                  σ × Π min(x, c)/x with the factors spelled out in FACTORS below (K/40 or Na/35,
 *                  Al/10, SiO2/400 — js/39-supersat-silicate.ts supersaturation_feldspar/_albite). Exact
 *                  for the product; the subtractive low-pH term of those functions is not re-derived.
 *   root=<n>       σ → σ^(1/n) for --minerals: the per-ion convention S = (IAP/K)^(1/ν) of the
 *                  electrolyte crystal-growth literature, applied to the proxy's n factors. It keeps
 *                  the saturation boundary (1 → 1) and the ordering.
 *   excess=<m>     The growth engines of --minerals have every positive zone scaled by m·(σ−1)/σ, σ read
 *                  as for rclamp, before the engine runs: a k·σ law turned into m·k·(σ−1).
 *   pb             The radiogenic Pb the uraninite block adds to the bulk handle (js/85-simulator.ts,
 *                  `conditions.fluid.Pb += 0.1 * u_size`) is also added to every voxel, the way
 *                  _propagateGlobalDelta carries an event's change. Applied by wrapping _check_enclosure,
 *                  the first call after that block; the increment is the change in the bulk handle's
 *                  Pb across the block.
 *   nopb           The bulk handle's Pb is put back, in the same place, to the value it had just before
 *                  the uraninite block ran (read at the _sealVugIfFilled call that precedes the block):
 *                  radiogenic lead that reaches no fluid at all. The value is RESTORED, not subtracted.
 *                  (30 + a + b + c) − (a + b + c) need not be 30, and several sigma functions switch
 *                  on a field being below a threshold (supersaturation_plumbogummite returns 0 when
 *                  Pb < 30, and that broth starts at exactly 30). The arm reports how many negative
 *                  zones the uraninites took, which is how often an alteration could release lead.
 *   mul=<F>:<x>    The scenario's initial fluid field <F> is multiplied by <x> before the simulator is
 *                  built (every voxel is cloned from it).
 *   refund=<f>     Every positive zone's debit is returned, times <f>, to the cell it was taken from as
 *                  soon as it is booked: the fields and amounts the ledger recorded for that zone
 *                  (js/19, zone._budget_inventory_per_um × its thickness), through the path a dissolution
 *                  zone's return takes. refund=1 is growth that never draws its own cell down, an
 *                  unlimited local source: the solid keeps its booked inventory, so the arm is not a
 *                  closed system. Under a carbonate boundary the ledger writes a receipt for the
 *                  carbonate each accepted zone took (js/19) and the step's audit matches the field
 *                  against the receipts (js/85c); the arm rewrites the receipt of a refunded zone to
 *                  the change its cell now shows (withdrawn when that is none), as the ledger itself
 *                  would have written it. Without that the audit fails and pauses the scenario's CO2
 *                  events, which is an effect of the arm and not of supply. At refund=1 a field that
 *                  the return brings back to within rounding of its value before the debit is set to
 *                  that value exactly, for the reason given under nopb. refund=0 is the neutral
 *                  setting. It applies to every mineral and ignores --minerals.
 *
 * Each B arm is `--arm <intervention>[,<intervention>…]`; several --arm flags give several B arms.
 * --minerals defaults to feldspar,albite.
 *
 * --trace <mineral> adds, for every arm, the median over the run of that mineral's sigma on the bulk
 * handle and on the own cell of its oldest surviving crystal (the fluid and temperature swap
 * _runEngineForCrystal makes), read on every step when the engines run (after the dry run of
 * js/85b; at the end of a step diffusion has refilled the cell). It shows whether a crystal sits near
 * saturation because the whole fluid does or because it has drawn its own cell down. The traced
 * shipped arm is still compared with the baseline at seed 42, so the trace is shown not to move a run.
 *
 * Reported per scenario and seed, for A and each B: cavity fill at run end, the largest fill of the
 * run with its step, the first steps at fill >= 0.7 and >= 0.999, the last step on which any crystal
 * stored a positive zone, and each species' crystals. A species is PRESENT in a run when at least
 * one of its crystals has solid left at run end (total_growth_um > 0). A crystal that dissolved away,
 * or was born and never grew, is a record with no solid: its mineral is listed apart ("no solid
 * left: <mineral> (n records)") and is not presence. For each present species: the number of
 * crystals with solid left, the largest, and the last step it grew.
 * Against A: species LOST (present in A, not in B, whether or not records
 * remain), GAINED (the reverse), and MOVED (present in both, and the number of crystals with solid
 * changed or the largest changed by a factor of more than 1.25 either way, so a shrink of a fifth
 * counts; the factor is taken on the sizes plus one micrometre, so that two specks do not count).
 * Each arm's line also says whether "the baseline summary" is unchanged or differs: the per-species
 * summary that tests-js/baselines stores (active, dissolved and total counts, and the largest size
 * to 0.1 µm; summarize() below), compared whole with arm A's. That is the stricter question. An
 * arm can move no species by the test above and still change it.
 * With `pb` or `nopb`, bulk and voxel-mean Pb at run end and the uraninites' negative zones.
 *
 * AUDIT. An intervention may trip one of the simulator's own audits, and an audit that fails can
 * cancel an authored event: the run then differs for a reason that is not the intervention's subject.
 * Every run counts the step-log lines in which a CO2 or carbonate event reports itself paused or
 * refused (js/70l, the only events that do), the failed transactions of the carbonate boundary, and
 * the entries of the three violation ledgers
 * (sulfur and carbon propagation, fluid boundary). An arm whose counts differ from arm A's is
 * flagged on its own line and in the JSON. Beside the audit, each run records the steps on which
 * the wall's dissolution was withheld as too small to resolve (js/85d). That is a notice, not a
 * failure: it follows how much acid reaches the wall and how much of the wall the crystals cover,
 * so an arm that grows more or less may change it. It is reported and not flagged.
 *
 * Integrity and self-check:
 *   - at seed 42 arm A is compared with tests-js/baselines/seed42_v<SIM>.json (the summary of
 *     tools/gen-js-baseline.mjs, copied);
 *   - the NEUTRAL knobs rind=Infinity, cap=Infinity, rclamp=Infinity, root=1, mul=Ca:1 and refund=0
 *     must each reproduce arm A exactly: a wrapper that only passes through may not move a run.
 *     fcap=Infinity joins them when --minerals is feldspar and albite only, the two minerals fcap
 *     knows. Run on --selfcheck-scenario (default schneeberg, which grows feldspar) before anything
 *     else; --no-selfcheck skips it. (`excess`, `pb` and `nopb` have no neutral setting.)
 *   - when an arm carries `refund`, refund=1 is also run on tutorial_travertine, a scenario with a
 *     carbonate boundary: its audit counts must equal the shipped arm's.
 *   The engine table is restored in a finally block after every run.
 *   Where a scenario installs a localized-nucleation envelope (per-vertex nucleation or an active
 *   thermal field, js/85b), that envelope captures whatever supersaturation method it finds on the
 *   conditions object when a nucleation pass starts — the wrapped one — so cap, fcap and root govern
 *   births there as well as growth. proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs
 *   counts those calls.
 *
 * PASSIVE instrument: exits 0 whatever the runs show (it throws on a bad argument or an unknown
 * scenario or mineral); imports only tools/_harness.mjs and node builtins; writes only
 * .local-evidence/sim-side-ab/.
 *
 * Usage:
 *   node tools/sim-side-ab.mjs --arm rind=5000 --arm fcap=2 --seeds 42,1,2 gem_pegmatite
 *   node tools/sim-side-ab.mjs --arm rclamp=7 --arm cap=8 --seeds 42,1,2 gem_pegmatite
 *   node tools/sim-side-ab.mjs --arm pb --arm nopb --seeds 42,1,2 radioactive_pegmatite schneeberg
 *   node tools/sim-side-ab.mjs --arm excess=1 --arm excess=3 --minerals galena,molybdenite,uraninite mvt
 *   node tools/sim-side-ab.mjs --arm mul=B:10 gem_pegmatite
 *   node tools/sim-side-ab.mjs --arm refund=1 mvt reactive_wall
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, '.local-evidence', 'sim-side-ab');
const FULL_FILL = 0.999;
const HIGH_FILL = 0.7;          // _fillDampenerFor (js/85d) starts to bite here
// js/39-supersat-silicate.ts: sigma = (K/40)(Al/10)(SiO2/400) for feldspar, (Na/35)(Al/10)(SiO2/400)
// for albite. Spelled out here: if those functions change, `fcap` no longer previews them.
const FACTORS = { feldspar: [['K', 40], ['Al', 10], ['SiO2', 400]], albite: [['Na', 35], ['Al', 10], ['SiO2', 400]] };
// A step-log line in which an event says it did not act. Only the CO2 and carbonate events of
// js/70l do ("CO₂ vent paused: …", "Heated CO₂ vent paused: …", "CO₂ charge refused: …",
// "Carbonate recharge paused: …"). The pattern names them, so that narration which happens to
// contain "refused:" is not counted. Counted for the AUDIT comparison.
const REFUSAL = /(CO₂|Carbonate) [a-z₂ ]*(paused|refused): /;
// The wall's notice that a dissolution step was too small to resolve (js/85d). Counted beside the
// audit, not in it.
const WITHHELD = /WALL DISSOLUTION WITHHELD/;
const auditText = (a) => `event refusals ${a.eventRefusals}, failed carbonate transactions ${a.failedCarbonateTransactions}, ledger violations ${a.ledgerViolations}`;
const sameAudit = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- arguments ----
const opts = { arms: [], seeds: [42], minerals: ['feldspar', 'albite'], scenarios: [], selfcheck: true, selfcheckScenario: 'schneeberg', trace: null };
function parseArm(text) {
  const arm = { label: text, rind: null, cap: null, rclamp: null, fcap: null, root: null, excess: null, refund: null, pb: false, nopb: false, mul: [] };
  for (const part of text.split(',')) {
    const [k, v] = part.split('=');
    if (['rind', 'cap', 'rclamp', 'fcap', 'root', 'excess'].includes(k)) {
      const n = v === 'Infinity' ? Infinity : Number(v);
      if (!(n > 0)) throw new Error(`bad ${k} in --arm ${text}`);
      arm[k] = n;
    } else if (k === 'refund') {
      const n = Number(v);
      if (v === undefined || !(n >= 0)) throw new Error(`bad refund in --arm ${text}`);
      arm.refund = n;
    } else if (k === 'pb' && v === undefined) arm.pb = true;
    else if (k === 'nopb' && v === undefined) arm.nopb = true;
    else if (k === 'mul') {
      const [field, x] = String(v).split(':');
      if (!field || !(Number(x) >= 0)) throw new Error(`bad mul in --arm ${text} (mul=<Field>:<factor>)`);
      arm.mul.push([field, Number(x)]);
    } else throw new Error(`unknown intervention "${part}" in --arm ${text}`);
  }
  if (arm.pb && arm.nopb) throw new Error(`--arm ${text}: pb and nopb are two different destinations for the same lead`);
  return arm;
}
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--arm') opts.arms.push(parseArm(argv[++i]));
    else if (a === '--seeds') opts.seeds = argv[++i].split(',').map(s => { const n = Number(s); if (!Number.isInteger(n)) throw new Error(`bad seed ${s}`); return n; });
    else if (a === '--minerals') opts.minerals = argv[++i].split(',');
    else if (a === '--no-selfcheck') opts.selfcheck = false;
    else if (a === '--selfcheck-scenario') opts.selfcheckScenario = argv[++i];
    else if (a === '--trace') opts.trace = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('node tools/sim-side-ab.mjs --arm <rind=µm|cap=σ|rclamp=E|fcap=c|root=n|excess=m|refund=f|pb|nopb|mul=Field:x>[,…] [--arm …] [--seeds 42,1,2] [--minerals feldspar,albite] [--trace <mineral>] [--no-selfcheck] [scenario …]');
      process.exit(0);
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts.scenarios.push(a);
  }
  if (!opts.arms.length) throw new Error('give at least one --arm');
  if (!opts.scenarios.length) throw new Error('name at least one scenario');
  if (opts.arms.some(a => a.fcap != null) && opts.minerals.some(m => !FACTORS[m])) throw new Error('fcap knows only feldspar and albite');
}

const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_ENGINES, temperatureAtMeshVertex, syncExplicitSulfurTotal } = await harness.loadSimBundle({
  toolName: 'sim-side-ab', extraExports: ['MINERAL_ENGINES', 'temperatureAtMeshVertex', 'syncExplicitSulfurTotal'],
});
for (const n of [...opts.scenarios, ...(opts.selfcheck ? [opts.selfcheckScenario] : [])]) if (!SCENARIOS[n]) throw new Error(`unknown scenario ${n}`);
for (const m of opts.minerals) if (typeof MINERAL_ENGINES[m] !== 'function') throw new Error(`no growth engine named ${m}`);
if (opts.trace && typeof MINERAL_ENGINES[opts.trace] !== 'function') throw new Error(`--trace: no growth engine named ${opts.trace}`);
const baselineFile = path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`);
const BASELINE = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;

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

// One run. `arm` null = shipped.
function run(name, seed, arm) {
  const saved = {};
  for (const m of opts.minerals) saved[m] = MINERAL_ENGINES[m];
  try {
    if (arm && (arm.rind != null || arm.excess != null || arm.rclamp != null)) {
      for (const m of opts.minerals) {
        const orig = saved[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          // sigma on the conditions the engine is about to read, taken before it runs (see `rclamp`
          // in the header). The sigma methods draw no random number.
          const s = arm.excess != null || arm.rclamp != null ? conditions['supersaturation_' + m]() : null;
          const zone = orig(crystal, conditions, step);
          if (!zone || !(zone.thickness_um > 0)) return zone;
          if (arm.rind != null && crystal.total_growth_um >= arm.rind) return null;
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
    setSeed(seed);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    if (arm) {
      for (const [field, x] of arm.mul) {
        if (typeof conditions.fluid[field] !== 'number') throw new Error(`fluid has no numeric field ${field}`);
        conditions.fluid[field] *= x;
      }
      if (arm.cap != null || arm.fcap != null || arm.root != null) {
        for (const m of opts.minerals) {
          const orig = conditions['supersaturation_' + m];
          if (typeof orig !== 'function') throw new Error(`conditions has no supersaturation_${m}`);
          conditions['supersaturation_' + m] = function (...a) {
            let s = orig.apply(this, a);
            if (arm.fcap != null && s > 0) {
              for (const [field, ref] of FACTORS[m]) {
                const x = Number(this.fluid[field]) / ref;
                if (x > arm.fcap) s *= arm.fcap / x;
              }
            }
            if (arm.root != null && s > 0) s = Math.pow(s, 1 / arm.root);
            if (arm.cap != null) s = Math.min(s, arm.cap);
            return s;
          };
        }
      }
    }
    const sim = new VugSimulator(conditions, events);
    const grid = sim.wall_state.voxelGridFor(sim);
    if (arm && (arm.pb || arm.nopb)) {
      // The uraninite block of run_step sits between a call of _sealVugIfFilled and the one call of
      // _check_enclosure (js/85-simulator.ts). The bulk handle's Pb is read after the first and
      // again before the second: the difference is exactly what the block added.
      let before = null;
      const origSeal = sim._sealVugIfFilled;
      sim._sealVugIfFilled = function (...a) {
        const out = origSeal.apply(this, a);
        before = Number(this.conditions.fluid.Pb);
        return out;
      };
      const orig = sim._check_enclosure;
      sim._check_enclosure = function () {
        if (before != null) {
          const inc = Number(this.conditions.fluid.Pb) - before;
          if (inc > 0 && arm.pb) for (const v of grid.voxels) v.fluid.Pb += inc;
          if (arm.nopb) this.conditions.fluid.Pb = before;     // restored, not subtracted (see the header)
          before = null;
        }
        return orig.call(this);
      };
    }
    const mesh = sim.wall_state.meshFor(sim);
    if (arm && arm.refund != null) {
      const orig = sim._applyZoneGrowthBudget;
      sim._applyZoneGrowthBudget = function (crystal, zone) {
        const receiptsBefore = (this.conditions._pending_carbonate_boundary_transfers || []).length;
        // The fluid the ledger is about to debit: the crystal's own cell, with the fallbacks of js/85b.
        const chem = this.wall_state.chemistryAddressForCrystal(crystal);
        const ringIdx = chem ? chem.ringIdx : null;
        let fluid = this.conditions.fluid;
        if (ringIdx != null && ringIdx >= 0 && ringIdx < this.ring_fluids.length) {
          const cell = mesh.cellOf(crystal, this.wall_state);
          fluid = (cell && cell.fluid) ? cell.fluid : this.ring_fluids[ringIdx];
        }
        // Every numeric field of that fluid as it stands before the debit, for the exact return below.
        let pre = null;
        if (arm.refund === 1 && zone && zone.thickness_um > 0) {
          pre = {};
          for (const k of Object.keys(fluid)) if (typeof fluid[k] === 'number') pre[k] = fluid[k];
        }
        const out = orig.call(this, crystal, zone);
        const inv = zone && zone.thickness_um > 0 ? zone._budget_inventory_per_um : null;
        if (!inv) return out;
        let returnedCarbon = 0;
        for (const sp in inv) {
          const amount = arm.refund * zone.thickness_um * inv[sp];
          if (!(amount > 0) || typeof fluid[sp] !== 'number') continue;
          if (sp === 'SiO2' && typeof fluid.addReactiveSilica === 'function') fluid.addReactiveSilica(amount);
          else fluid[sp] += amount;
          if (sp === 'CO3') returnedCarbon += amount;
        }
        if (fluid.sulfurPoolsExplicit) syncExplicitSulfurTotal(fluid);
        // (x − d) + d need not be x. A field the return has brought back to within rounding of its
        // value before the debit is set to that value exactly, so that the round trip cannot carry a
        // cell across a threshold a sigma function tests. A field the zone changed for another
        // reason (an engine's own pH or redox term) is further off than rounding and is left alone.
        if (pre) {
          for (const k in pre) {
            const now = fluid[k];
            if (typeof now === 'number' && now !== pre[k] && Math.abs(now - pre[k]) <= 1e-9 * Math.max(1, Math.abs(pre[k]))) fluid[k] = pre[k];
          }
        }
        // The carbonate receipt the ledger wrote for this zone (js/19) records the change in the
        // cell's CO3 before the refund. Bring it into line with what the cell shows now: add the
        // carbonate returned, and withdraw the receipt when nothing is left of it, as the ledger
        // writes none for a zone that changed nothing.
        const receipts = this.conditions._pending_carbonate_boundary_transfers;
        if (returnedCarbon > 0 && Array.isArray(receipts) && receipts.length === receiptsBefore + 1) {
          const receipt = receipts[receiptsBefore];
          receipt.localAqueousCarbonDeltaPpm += returnedCarbon;
          if (Math.abs(receipt.localAqueousCarbonDeltaPpm) <= 1e-12 * returnedCarbon) receipts.length = receiptsBefore;
        }
        return out;
      };
    }
    const steps = defaultSteps ?? 100;
    let full = null, first70 = null, maxFill = 0, maxFillStep = 0;
    let eventRefusals = 0, wallDissolutionWithheld = 0;
    const traced = { bulk: [], cell: [] };
    const traceStep = () => {
      // The oldest crystal of the traced mineral: its sigma on the bulk handle and on its own cell
      // (the swap _runEngineForCrystal makes), read when the engines run.
      const c = sim.crystals.find(x => x.mineral === opts.trace && !x.dissolved);
      const fn = sim.conditions['supersaturation_' + opts.trace];
      if (!c || typeof fn !== 'function') return;
      const direct = !!sim._localNucleationDirectEvaluation;
      const sf = sim.conditions.fluid, st = sim.conditions.temperature;
      sim._localNucleationDirectEvaluation = true;
      try {
        traced.bulk.push(fn.call(sim.conditions));
        const chem = sim.wall_state.chemistryAddressForCrystal(c), cell = mesh.cellOf(c, sim.wall_state);
        if (cell?.fluid) sim.conditions.fluid = cell.fluid;
        if (chem) sim.conditions.temperature = temperatureAtMeshVertex(sim, mesh, chem.vertexIndex);
        traced.cell.push(fn.call(sim.conditions));
      } finally { sim.conditions.fluid = sf; sim.conditions.temperature = st; sim._localNucleationDirectEvaluation = direct; }
    };
    if (opts.trace) {
      // The trace is taken at the dry run of every active crystal's engine (js/85b), which is when a
      // crystal's cell is read. At the end of the step diffusion has refilled the cell.
      const origDryRun = sim._computeGraduatedZones;
      sim._computeGraduatedZones = function (...a) {
        const out = origDryRun.apply(this, a);
        traceStep();
        return out;
      };
    }
    for (let i = 0; i < steps; i++) {
      const log = sim.run_step();
      for (const line of log) {
        if (REFUSAL.test(line)) eventRefusals++;
        if (WITHHELD.test(line)) wallDissolutionWithheld++;
      }
      const fill = sim.get_vug_fill();
      if (fill > maxFill) { maxFill = fill; maxFillStep = sim.step; }
      if (first70 == null && fill >= HIGH_FILL) first70 = sim.step;
      if (full == null && fill >= FULL_FILL) full = sim.step;
    }
    const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
    // A species is present when one of its crystals has solid left. `species` holds the present ones;
    // `noSolid` the minerals that left records only (dissolved away, or born and never grown).
    const species = {}, records = {};
    let lastGrowth = 0, uraniniteNegativeZones = 0;
    for (const c of sim.crystals) {
      records[c.mineral] = (records[c.mineral] || 0) + 1;
      const o = c.total_growth_um > 0 ? (species[c.mineral] ||= { n: 0, max_um: 0, last: 0 }) : null;
      if (o) { o.n++; if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um; }
      for (const z of c.zones) {
        if (z.thickness_um > 0) { if (o && z.step > o.last) o.last = z.step; if (z.step > lastGrowth) lastGrowth = z.step; }
        else if (z.thickness_um < 0 && c.mineral === 'uraninite') uraniniteNegativeZones++;
      }
    }
    const noSolid = Object.fromEntries(Object.entries(records).filter(([m]) => !species[m]).sort());
    let pbVox = 0;
    for (const v of grid.voxels) pbVox += Number(v.fluid.Pb) || 0;
    const audit = {
      eventRefusals,
      failedCarbonateTransactions: (sim._carbonateBoundaryState?.transactions || []).filter(t => t && t.ok === false).length,
      ledgerViolations: (sim._sulfurPropagationViolations || []).length + (sim._carbonPropagationViolations || []).length
        + (sim._fluidBoundaryViolations || []).length,
    };
    return { steps, fill: sim.get_vug_fill(), maxFill, maxFillStep, first70, full, lastGrowth, species, noSolid, summary: summarize(sim), audit, wallDissolutionWithheld, uraniniteNegativeZones,
      bulkPb: Number(sim.conditions.fluid.Pb) || 0, voxPb: pbVox / grid.voxels.length,
      trace: opts.trace ? { mineral: opts.trace, steps: traced.bulk.length, sigmaBulkMedian: median(traced.bulk), sigmaCellMedian: median(traced.cell) } : null,
      events: events.map(e => `${e.step} ${e.name}`) };
  } finally {
    for (const m of opts.minerals) MINERAL_ENGINES[m] = saved[m];
  }
}

const T = [];
const say = (s = '') => { T.push(s); console.log(s); };
const mm = (um) => (um / 1000).toFixed(um < 1000 ? 3 : 1);
const fmt = (r) => (Object.entries(r.species).sort((a, b) => b[1].max_um - a[1].max_um)
  .map(([m, v]) => `${m} ×${v.n} @ ${mm(v.max_um)} (→${v.last})`).join(', ') || 'no species has solid left')
  + (Object.keys(r.noSolid).length ? `\n      no solid left: ${Object.entries(r.noSolid).map(([m, n]) => `${m} (${n} record${n === 1 ? '' : 's'})`).join(', ')}` : '');
// Presence is solid left at run end (see the header). `sameAsShipped` is the stricter question a
// baseline asks: is the per-species summary that tests-js/baselines stores unchanged?
function compare(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  return { speciesCount: keys.length, gained, lost, moved, sameAsShipped: JSON.stringify(A.summary) === JSON.stringify(B.summary) };
}

say(`sim-side A/B — SIM ${SIM_VERSION}; arms ${opts.arms.map(a => a.label).join(' | ')}; minerals ${opts.minerals.join(', ')}; seeds ${opts.seeds.join(', ')}`);
const J = { sim_version: SIM_VERSION, arms: opts.arms.map(a => a.label), minerals: opts.minerals, seeds: opts.seeds, selfcheck: null, runs: [] };

if (opts.selfcheck) {
  const A = run(opts.selfcheckScenario, 42, null);
  const neutral = ['rind=Infinity', 'cap=Infinity', 'rclamp=Infinity', 'root=1', 'mul=Ca:1', 'refund=0'];
  if (opts.minerals.every(m => FACTORS[m])) neutral.push('fcap=Infinity');
  const checks = neutral.map(label => [label, JSON.stringify(run(opts.selfcheckScenario, 42, parseArm(label)).summary) === JSON.stringify(A.summary)]);
  const base = BASELINE ? JSON.stringify(A.summary) === JSON.stringify(BASELINE[opts.selfcheckScenario]) : null;
  J.selfcheck = { scenario: opts.selfcheckScenario, neutral: Object.fromEntries(checks), shippedReproducesBaseline: base };
  say(`self-check on ${opts.selfcheckScenario}, seed 42: shipped arm ${base == null ? 'has no baseline' : base ? 'reproduces the baseline' : 'DOES NOT reproduce the baseline'}; neutral knobs — ${checks.map(([l, ok]) => `${l} ${ok ? 'ok' : 'MOVES THE RUN'}`).join('; ')}`);
  if (opts.arms.some(a => a.refund != null)) {
    // A refund must not leave the carbonate boundary's audit failing: that pauses the scenario's CO2
    // events, and the arm would then measure a cancelled event. tutorial_travertine has that boundary.
    const scenario = 'tutorial_travertine';
    const shipped = run(scenario, 42, null), refunded = run(scenario, 42, parseArm('refund=1'));
    const ok = sameAudit(shipped.audit, refunded.audit);
    J.selfcheck.refundAudit = { scenario, shipped: shipped.audit, refund1: refunded.audit, ok };
    say(`self-check on ${scenario}, seed 42: refund=1 ${ok ? 'leaves the simulator\'s audits as the shipped arm has them' : 'CHANGES WHAT THE AUDITS REPORT'} (shipped: ${auditText(shipped.audit)}; refund=1: ${auditText(refunded.audit)})`);
  }
}

for (const name of opts.scenarios) {
  for (const seed of opts.seeds) {
    const A = run(name, seed, null);
    if (seed === opts.seeds[0]) say(`\n### ${name} — ${A.steps} steps — events: ${A.events.join(' | ')}`);
    const base = seed === 42 && BASELINE ? JSON.stringify(A.summary) === JSON.stringify(BASELINE[name]) : null;
    say(`seed ${seed}${base == null ? '' : base ? ' (shipped arm reproduces the baseline)' : ' (SHIPPED ARM DOES NOT REPRODUCE THE BASELINE)'}`);
    const lead = opts.arms.some(a => a.pb || a.nopb);
    const line = (label, r) => `  ${label.padEnd(16)} fill ${(r.fill * 100).toFixed(1).padStart(5)} % (largest ${(r.maxFill * 100).toFixed(1)} % at step ${r.maxFillStep}; first >= 0.7 at step ${r.first70 ?? '—'})  full at step ${String(r.full ?? '—').padStart(3)}  last growth at step ${String(r.lastGrowth).padStart(3)}${lead ? `  Pb bulk ${r.bulkPb.toFixed(1)} / voxel mean ${r.voxPb.toFixed(2)}  uraninite negative zones ${r.uraniniteNegativeZones}` : ''}${r.trace && r.trace.steps ? `  ${r.trace.mineral} sigma, median over ${r.trace.steps} steps: bulk ${r.trace.sigmaBulkMedian.toFixed(3)}, own cell ${r.trace.sigmaCellMedian.toFixed(3)}` : ''}\n      ${fmt(r)}`;
    const keep = (r) => ({ fill: r.fill, maxFill: r.maxFill, maxFillStep: r.maxFillStep, first70: r.first70, full: r.full, lastGrowth: r.lastGrowth, species: r.species, noSolid: r.noSolid,
      bulkPb: r.bulkPb, voxPb: r.voxPb, uraniniteNegativeZones: r.uraniniteNegativeZones, audit: r.audit, wallDissolutionWithheld: r.wallDissolutionWithheld, trace: r.trace });
    say(line('A shipped', A));
    const rec = { scenario: name, seed, shippedReproducesBaseline: base, A: keep(A), B: {} };
    for (const arm of opts.arms) {
      const B = run(name, seed, arm);
      const c = compare(A, B);
      const auditMoved = !sameAudit(A.audit, B.audit);
      say(line(`B ${arm.label}`, B));
      say(`      against A: ${c.speciesCount} species present in either arm; moved ${c.moved.length}${c.moved.length ? ' (' + c.moved.join(', ') + ')' : ''}; gained ${c.gained.join(', ') || 'none'}; lost ${c.lost.map(k => `${k}${B.noSolid[k] ? ` (${B.noSolid[k]} record${B.noSolid[k] === 1 ? '' : 's'}, no solid)` : ''}`).join(', ') || 'none'}; ${c.sameAsShipped ? 'the baseline summary is unchanged' : 'the baseline summary differs'}`);
      if (auditMoved) say(`      AUDIT — the simulator's own audits read differently under this arm: A ${auditText(A.audit)}; B ${auditText(B.audit)}`);
      if (B.wallDissolutionWithheld !== A.wallDissolutionWithheld) say(`      wall dissolution withheld as too small to resolve: on ${A.wallDissolutionWithheld} steps in A, ${B.wallDissolutionWithheld} in B`);
      rec.B[arm.label] = { ...keep(B), auditMoved, ...c };
    }
    J.runs.push(rec);
  }
}
J.auditMoved = J.runs.flatMap(r => Object.entries(r.B).filter(([, b]) => b.auditMoved).map(([arm]) => `${r.scenario} seed ${r.seed} ${arm}`));
say(`\naudits: ${J.auditMoved.length ? `${J.auditMoved.length} arm run(s) read differently from the shipped arm — ${J.auditMoved.join('; ')}` : 'every arm run reads the simulator\'s audits as the shipped arm does'}`);

fs.mkdirSync(OUT, { recursive: true });
// One file per distinct invocation: arms, minerals, seeds, trace and scenarios all name it, and a name
// too long for the file system keeps its head and takes a digest of the whole.
const fullTag = `${opts.arms.map(a => a.label.replace(/[^A-Za-z0-9=.,]+/g, '_')).join('+')}__${opts.minerals.join('+')}__s${opts.seeds.join('+')}${opts.trace ? `__trace-${opts.trace.replace(/[^A-Za-z0-9_]+/g, '_')}` : ''}__${opts.scenarios.join('+')}`;
const tag = fullTag.length <= 150 ? fullTag : `${fullTag.slice(0, 140)}~${crypto.createHash('sha256').update(fullTag).digest('hex').slice(0, 8)}`;
fs.writeFileSync(path.join(OUT, `${tag}.txt`), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(J, null, 1) + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/${tag}.{txt,json}`);
