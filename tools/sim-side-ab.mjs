#!/usr/bin/env node
/**
 * tools/sim-side-ab.mjs — A/B runs behind proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md.
 *
 * Arm A is the shipped simulator. Arm B is the same scenario and seed with one or more INTERVENTIONS
 * applied in this process only; nothing in js/, data/ or dist/ is touched. The interventions are
 * diagnostics that isolate a cause or preview the size of a change. None is a proposed rule or
 * constant.
 *
 *   rind=<µm>      The growth engines of --minerals return no zone once a crystal's total_growth_um has
 *                  reached <µm>: wall-zone feldspar as a bounded rind.
 *   cap=<σ>        conditions.supersaturation_<mineral> is clamped to <σ> for --minerals, on the
 *                  scenario's own conditions object (growth, nucleation and the strangulation gate all
 *                  read that method).
 *   fcap=<c>       feldspar and albite only: each concentration factor of their supersaturation product
 *                  is capped at <c>, as the factor-capped silicates of js/39 are. Applied as
 *                  σ × Π min(x, c)/x with the factors spelled out in FACTORS below (K/40 or Na/35,
 *                  Al/10, SiO2/400 — js/39-supersat-silicate.ts supersaturation_feldspar/_albite). Exact
 *                  for the product; the subtractive low-pH term of those functions is not re-derived.
 *   root=<n>       σ → σ^(1/n) for --minerals: the per-ion convention S = (IAP/K)^(1/ν) of the
 *                  electrolyte crystal-growth literature, applied to the proxy's n factors. It keeps
 *                  the saturation boundary (1 → 1) and the ordering.
 *   excess=<m>     The growth engines of --minerals have every positive zone scaled by m·(σ−1)/σ, σ read
 *                  from the same conditions the engine just read: a k·σ law turned into m·k·(σ−1).
 *   pb             The radiogenic Pb the uraninite block adds to the bulk handle (js/85-simulator.ts,
 *                  `conditions.fluid.Pb += 0.1 * u_size`) is also added to every voxel, the way
 *                  _propagateGlobalDelta carries an event's change. Applied by wrapping _check_enclosure,
 *                  the first call after that block; the increment is recomputed from the same crystals.
 *   mul=<F>:<x>    The scenario's initial fluid field <F> is multiplied by <x> before the simulator is
 *                  built (every voxel is cloned from it).
 *   refund=<f>     Every positive zone's debit is returned, times <f>, to the cell it was taken from as
 *                  soon as it is booked: the fields and amounts the ledger recorded for that zone
 *                  (js/19, zone._budget_inventory_per_um × its thickness), through the path a dissolution
 *                  zone's return takes. refund=1 is growth that never draws its own cell down, an
 *                  unlimited local source: the solid keeps its booked inventory, so the arm is not a
 *                  closed system. refund=0 is the neutral setting. It applies to every mineral and
 *                  ignores --minerals.
 *
 * Each B arm is `--arm <intervention>[,<intervention>…]`; several --arm flags give several B arms.
 * --minerals defaults to feldspar,albite.
 *
 * --trace <mineral> adds, for every arm, the median over the run of that mineral's sigma on the bulk
 * handle and on the own cell of its oldest surviving crystal (the fluid and temperature swap
 * _runEngineForCrystal makes), read at the end of each step. It shows whether a crystal sits near
 * saturation because the whole fluid does or because it has drawn its own cell down. The traced
 * shipped arm is still compared with the baseline at seed 42, so the trace is shown not to move a run.
 *
 * Reported per scenario and seed, for A and each B: cavity fill at run end, the first step at
 * fill >= 0.999, the last step on which any crystal stored a positive zone, each species' count and
 * largest crystal with the last step it grew, and against A the species gained, lost and moved (count
 * changed, or largest crystal changed by more than 25 %). With `pb`, bulk and voxel-mean Pb at run end.
 *
 * Integrity and self-check:
 *   - at seed 42 arm A is compared with tests-js/baselines/seed42_v<SIM>.json (the summary of
 *     tools/gen-js-baseline.mjs, copied);
 *   - the NEUTRAL knobs rind=Infinity, cap=Infinity, root=1, mul=Ca:1 and refund=0 must each
 *     reproduce arm A exactly: a wrapper that only passes through may not move a run. fcap=Infinity
 *     joins them when --minerals is feldspar and albite only, the two minerals fcap knows. Run on
 *     --selfcheck-scenario (default schneeberg, which grows feldspar) before anything else;
 *     --no-selfcheck skips it. (`excess` and `pb` have no neutral setting.)
 *   The engine table is restored in a finally block after every run.
 *   Where a scenario installs a localized-nucleation envelope (per-vertex nucleation or an active
 *   thermal field, js/85b), that envelope captures whatever supersaturation method it finds on the
 *   conditions object when a nucleation pass starts — the wrapped one — so cap, fcap and root govern
 *   births there as well as growth. proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs
 *   counts those calls.
 *
 * PASSIVE instrument: exits 0 whatever it finds; imports only tools/_harness.mjs and node builtins;
 * writes only .local-evidence/sim-side-ab/.
 *
 * Usage:
 *   node tools/sim-side-ab.mjs --arm rind=5000 --arm fcap=2 --seeds 42,1,2 gem_pegmatite
 *   node tools/sim-side-ab.mjs --arm pb --seeds 42,1,2 radioactive_pegmatite schneeberg
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
// js/39-supersat-silicate.ts: sigma = (K/40)(Al/10)(SiO2/400) for feldspar, (Na/35)(Al/10)(SiO2/400)
// for albite. Spelled out here: if those functions change, `fcap` no longer previews them.
const FACTORS = { feldspar: [['K', 40], ['Al', 10], ['SiO2', 400]], albite: [['Na', 35], ['Al', 10], ['SiO2', 400]] };

// ---- arguments ----
const opts = { arms: [], seeds: [42], minerals: ['feldspar', 'albite'], scenarios: [], selfcheck: true, selfcheckScenario: 'schneeberg', trace: null };
function parseArm(text) {
  const arm = { label: text, rind: null, cap: null, fcap: null, root: null, excess: null, refund: null, pb: false, mul: [] };
  for (const part of text.split(',')) {
    const [k, v] = part.split('=');
    if (['rind', 'cap', 'fcap', 'root', 'excess'].includes(k)) {
      const n = v === 'Infinity' ? Infinity : Number(v);
      if (!(n > 0)) throw new Error(`bad ${k} in --arm ${text}`);
      arm[k] = n;
    } else if (k === 'refund') {
      const n = Number(v);
      if (v === undefined || !(n >= 0)) throw new Error(`bad refund in --arm ${text}`);
      arm.refund = n;
    } else if (k === 'pb' && v === undefined) arm.pb = true;
    else if (k === 'mul') {
      const [field, x] = String(v).split(':');
      if (!field || !(Number(x) >= 0)) throw new Error(`bad mul in --arm ${text} (mul=<Field>:<factor>)`);
      arm.mul.push([field, Number(x)]);
    } else throw new Error(`unknown intervention "${part}" in --arm ${text}`);
  }
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
      console.log('node tools/sim-side-ab.mjs --arm <rind=µm|cap=σ|fcap=c|root=n|excess=m|refund=f|pb|mul=Field:x>[,…] [--arm …] [--seeds 42,1,2] [--minerals feldspar,albite] [--trace <mineral>] [--no-selfcheck] [scenario …]');
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
    if (arm && (arm.rind != null || arm.excess != null)) {
      for (const m of opts.minerals) {
        const orig = saved[m];
        MINERAL_ENGINES[m] = (crystal, conditions, step) => {
          if (arm.rind != null && crystal.total_growth_um >= arm.rind) return null;
          const zone = orig(crystal, conditions, step);
          if (arm.excess != null && zone && zone.thickness_um > 0) {
            const s = conditions['supersaturation_' + m]();
            const f = s > 0 ? arm.excess * Math.max(0, s - 1) / s : 0;
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
    if (arm && arm.pb) {
      const orig = sim._check_enclosure;
      sim._check_enclosure = function () {
        let inc = 0;
        for (const c of this.crystals) if (c.mineral === 'uraninite' && c.active) inc += 0.1 * (c.total_growth_um / 1000);
        if (inc > 0) for (const v of grid.voxels) v.fluid.Pb += inc;
        return orig.call(this);
      };
    }
    const mesh = sim.wall_state.meshFor(sim);
    if (arm && arm.refund != null) {
      const orig = sim._applyZoneGrowthBudget;
      sim._applyZoneGrowthBudget = function (crystal, zone) {
        const out = orig.call(this, crystal, zone);
        const inv = zone && zone.thickness_um > 0 ? zone._budget_inventory_per_um : null;
        if (!inv) return out;
        // The fluid the ledger just debited: the crystal's own cell, with the fallbacks of js/85b.
        const chem = this.wall_state.chemistryAddressForCrystal(crystal);
        const ringIdx = chem ? chem.ringIdx : null;
        let fluid = this.conditions.fluid;
        if (ringIdx != null && ringIdx >= 0 && ringIdx < this.ring_fluids.length) {
          const cell = mesh.cellOf(crystal, this.wall_state);
          fluid = (cell && cell.fluid) ? cell.fluid : this.ring_fluids[ringIdx];
        }
        for (const sp in inv) {
          const amount = arm.refund * zone.thickness_um * inv[sp];
          if (!(amount > 0) || typeof fluid[sp] !== 'number') continue;
          if (sp === 'SiO2' && typeof fluid.addReactiveSilica === 'function') fluid.addReactiveSilica(amount);
          else fluid[sp] += amount;
        }
        if (fluid.sulfurPoolsExplicit) syncExplicitSulfurTotal(fluid);
        return out;
      };
    }
    const steps = defaultSteps ?? 100;
    let full = null;
    const traced = { bulk: [], cell: [] };
    const traceStep = () => {
      // The oldest crystal of the traced mineral: its sigma on the bulk handle and on its own cell
      // (the swap _runEngineForCrystal makes), read at the end of the step.
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
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      if (full == null && sim.get_vug_fill() >= FULL_FILL) full = sim.step;
      if (opts.trace) traceStep();
    }
    const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
    const species = {};
    let lastGrowth = 0;
    for (const c of sim.crystals) {
      const o = (species[c.mineral] ||= { n: 0, max_um: 0, last: 0 });
      o.n++;
      if (c.total_growth_um > o.max_um) o.max_um = c.total_growth_um;
      for (const z of c.zones) if (z.thickness_um > 0) { if (z.step > o.last) o.last = z.step; if (z.step > lastGrowth) lastGrowth = z.step; }
    }
    let pbVox = 0;
    for (const v of grid.voxels) pbVox += Number(v.fluid.Pb) || 0;
    return { steps, fill: sim.get_vug_fill(), full, lastGrowth, species, summary: summarize(sim),
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
const fmt = (sp) => Object.entries(sp).sort((a, b) => b[1].max_um - a[1].max_um)
  .map(([m, v]) => `${m} ×${v.n} @ ${mm(v.max_um)} (→${v.last})`).join(', ');
function compare(A, B) {
  const keys = [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].sort();
  const gained = keys.filter(k => !A.species[k]), lost = keys.filter(k => !B.species[k]);
  const moved = keys.filter(k => A.species[k] && B.species[k] && (A.species[k].n !== B.species[k].n
    || Math.abs(Math.log((B.species[k].max_um + 1) / (A.species[k].max_um + 1))) > Math.log(1.25)));
  return { speciesCount: keys.length, gained, lost, moved };
}

say(`sim-side A/B — SIM ${SIM_VERSION}; arms ${opts.arms.map(a => a.label).join(' | ')}; minerals ${opts.minerals.join(', ')}; seeds ${opts.seeds.join(', ')}`);
const J = { sim_version: SIM_VERSION, arms: opts.arms.map(a => a.label), minerals: opts.minerals, seeds: opts.seeds, selfcheck: null, runs: [] };

if (opts.selfcheck) {
  const A = run(opts.selfcheckScenario, 42, null);
  const neutral = ['rind=Infinity', 'cap=Infinity', 'root=1', 'mul=Ca:1', 'refund=0'];
  if (opts.minerals.every(m => FACTORS[m])) neutral.push('fcap=Infinity');
  const checks = neutral.map(label => [label, JSON.stringify(run(opts.selfcheckScenario, 42, parseArm(label)).summary) === JSON.stringify(A.summary)]);
  const base = BASELINE ? JSON.stringify(A.summary) === JSON.stringify(BASELINE[opts.selfcheckScenario]) : null;
  J.selfcheck = { scenario: opts.selfcheckScenario, neutral: Object.fromEntries(checks), shippedReproducesBaseline: base };
  say(`self-check on ${opts.selfcheckScenario}, seed 42: shipped arm ${base == null ? 'has no baseline' : base ? 'reproduces the baseline' : 'DOES NOT reproduce the baseline'}; neutral knobs — ${checks.map(([l, ok]) => `${l} ${ok ? 'ok' : 'MOVES THE RUN'}`).join('; ')}`);
}

for (const name of opts.scenarios) {
  for (const seed of opts.seeds) {
    const A = run(name, seed, null);
    if (seed === opts.seeds[0]) say(`\n### ${name} — ${A.steps} steps — events: ${A.events.join(' | ')}`);
    const base = seed === 42 && BASELINE ? JSON.stringify(A.summary) === JSON.stringify(BASELINE[name]) : null;
    say(`seed ${seed}${base == null ? '' : base ? ' (shipped arm reproduces the baseline)' : ' (SHIPPED ARM DOES NOT REPRODUCE THE BASELINE)'}`);
    const line = (label, r) => `  ${label.padEnd(16)} fill ${(r.fill * 100).toFixed(1).padStart(5)} %  full at step ${String(r.full ?? '—').padStart(3)}  last growth at step ${String(r.lastGrowth).padStart(3)}${opts.arms.some(a => a.pb) ? `  Pb bulk ${r.bulkPb.toFixed(1)} / voxel mean ${r.voxPb.toFixed(2)}` : ''}${r.trace && r.trace.steps ? `  ${r.trace.mineral} sigma, median over ${r.trace.steps} steps: bulk ${r.trace.sigmaBulkMedian.toFixed(3)}, own cell ${r.trace.sigmaCellMedian.toFixed(3)}` : ''}\n      ${fmt(r.species)}`;
    say(line('A shipped', A));
    const rec = { scenario: name, seed, shippedReproducesBaseline: base, A: { fill: A.fill, full: A.full, lastGrowth: A.lastGrowth, species: A.species, bulkPb: A.bulkPb, voxPb: A.voxPb, trace: A.trace }, B: {} };
    for (const arm of opts.arms) {
      const B = run(name, seed, arm);
      const c = compare(A, B);
      say(line(`B ${arm.label}`, B));
      say(`      against A: ${c.speciesCount} species; moved ${c.moved.length}${c.moved.length ? ' (' + c.moved.join(', ') + ')' : ''}; gained ${c.gained.join(', ') || 'none'}; lost ${c.lost.join(', ') || 'none'}`);
      rec.B[arm.label] = { fill: B.fill, full: B.full, lastGrowth: B.lastGrowth, species: B.species, bulkPb: B.bulkPb, voxPb: B.voxPb, trace: B.trace, ...c };
    }
    J.runs.push(rec);
  }
}

fs.mkdirSync(OUT, { recursive: true });
// One file per distinct invocation: arms, minerals, seeds, trace and scenarios all name it, and a name
// too long for the file system keeps its head and takes a digest of the whole.
const fullTag = `${opts.arms.map(a => a.label.replace(/[^A-Za-z0-9=.,]+/g, '_')).join('+')}__${opts.minerals.join('+')}__s${opts.seeds.join('+')}${opts.trace ? `__trace-${opts.trace}` : ''}__${opts.scenarios.join('+')}`;
const tag = fullTag.length <= 150 ? fullTag : `${fullTag.slice(0, 140)}~${crypto.createHash('sha256').update(fullTag).digest('hex').slice(0, 8)}`;
fs.writeFileSync(path.join(OUT, `${tag}.txt`), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify(J, null, 1) + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/${tag}.{txt,json}`);
