#!/usr/bin/env node
/**
 * tools/rate-at-saturation-census.mjs — does each growth engine's proposed rate vanish as the driving
 * force does? (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md, finding F2.)
 *
 * PART 1, the engine probe. For every mineral with a growth engine (MINERAL_ENGINES) and a
 * supersaturation method, the method is replaced — on a throwaway conditions object — by one that
 * returns a FORCED sigma, and the engine is called on a fresh crystal at
 * sigma = 1.0005, 1.01, 1.1, 1.5, 2 and 3 with the shared rng re-seeded before every call, so the
 * engine's own noise draw is the same each time. The proposed thickness against sigma is the engine's
 * rate law as it runs, read from the engine rather than from its source text.
 *
 *   vanishes        thickness(1.0005) < 1 % of thickness(2): the rate goes to zero with the driving
 *                   force (k·(σ−σ0) and its relatives, or a growth floor that cuts the last step).
 *   FINITE          thickness(1.0005) >= 25 % of thickness(2): the engine proposes a rate at
 *                   saturation. k·σ gives 50 %.
 *   other           in between; the numbers are printed.
 *   not driven      the engine proposed nothing at sigma = 2 in any context tried, or its thickness did
 *                   not change with the forced sigma (it reads its driving force some other way).
 *
 * Contexts tried, in order, until one proposes a positive zone at sigma = 2: the constructor state of
 * each scenario whose seed-42 baseline holds the mineral, then of every other scenario; each at the
 * scenario's own temperature, then at the mineral's T_optimum_C / T_range_C midpoints
 * (data/minerals.json). The engine is called directly, outside run_step: no cell swap, no competition,
 * no time scale, no dampener. That is the point — it isolates the engine's own law.
 *
 * PART 2, where it matters. For each engine PART 1 reads FINITE, every scenario whose seed-42 baseline
 * holds that mineral is run once (seed 42) and sigma is read at the crystal's own cell at the moment
 * the engine's dry run is taken (_computeGraduatedZones, with the fluid/temperature swap the engine
 * saw). Reported per scenario: the sigma range while it grew, the share of its proposed thickness put
 * on below sigma 1.05 and 1.25, and what k·(σ−1) with the same k would have proposed.
 *
 * Controls: quartz and fluorite must read "vanishes" (their engines are k·excess laws by inspection:
 * js/59 grow_quartz, js/53 grow_fluorite). Integrity: each PART 2 run is compared with
 * tests-js/baselines/seed42_v<SIM>.json.
 *
 * PASSIVE instrument: exits 0 whatever it finds; imports only tools/_harness.mjs and node builtins;
 * writes only .local-evidence/rate-at-saturation-census/.
 *
 * Usage:
 *   node tools/rate-at-saturation-census.mjs            # both parts (a few minutes)
 *   node tools/rate-at-saturation-census.mjs --part 1   # the engine probe alone (seconds)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, '.local-evidence', 'rate-at-saturation-census');
const SIGMAS = [1.0005, 1.01, 1.1, 1.5, 2, 3];
const PROBE_SEED = 7;
let part = 0;
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--part') { part = Number(argv[++i]); if (part !== 1 && part !== 2) throw new Error('--part takes 1 or 2'); }
    else if (argv[i] === '--help' || argv[i] === '-h') { console.log('node tools/rate-at-saturation-census.mjs [--part 1|2]'); process.exit(0); }
    else throw new Error(`unknown argument ${argv[i]}`);
  }
}

const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, Crystal, setSeed, SIM_VERSION, MINERAL_ENGINES, MINERAL_SPEC, temperatureAtMeshVertex } =
  await harness.loadSimBundle({ toolName: 'rate-at-saturation-census', extraExports: ['Crystal', 'MINERAL_ENGINES', 'MINERAL_SPEC', 'temperatureAtMeshVertex'] });
const baselineFile = path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`);
const BASELINE = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : {};
const scenarioNames = Object.keys(SCENARIOS).sort();
const scenariosWith = (m) => scenarioNames.filter(s => BASELINE[s] && BASELINE[s][m]);

const T = [];
const say = (s = '') => { T.push(s); console.log(s); };
const J = { sim_version: SIM_VERSION, sigmas: SIGMAS, engines: {}, part2: [] };

// ---- PART 1 ----
function proposed(mineral, makeConditions, tempC, sigma) {
  const conditions = makeConditions();
  if (tempC != null) conditions.temperature = tempC;
  conditions['supersaturation_' + mineral] = () => sigma;
  const crystal = new Crystal({ mineral, crystal_id: 1, nucleation_step: 0, nucleation_temp: conditions.temperature,
    position: 'vug wall', vug_diameter_mm: 50 });
  setSeed(PROBE_SEED);
  const zone = MINERAL_ENGINES[mineral](crystal, conditions, 1);
  const t = zone && typeof zone.thickness_um === 'number' ? zone.thickness_um : 0;
  return t > 0 ? t : 0;
}
function probe(mineral) {
  const spec = MINERAL_SPEC[mineral] || {};
  const temps = [null];
  if (Number.isFinite(Number(spec.T_optimum_C))) temps.push(Number(spec.T_optimum_C));
  else if (Array.isArray(spec.T_optimum_C) && spec.T_optimum_C.length === 2) temps.push((Number(spec.T_optimum_C[0]) + Number(spec.T_optimum_C[1])) / 2);
  if (Array.isArray(spec.T_range_C) && spec.T_range_C.length === 2) temps.push((Number(spec.T_range_C[0]) + Number(spec.T_range_C[1])) / 2);
  const own = scenariosWith(mineral);
  const order = [...own, ...scenarioNames.filter(s => !own.includes(s))];
  let responded = null;
  for (const s of order) {
    for (const tempC of temps) {
      let t2 = 0;
      try { t2 = proposed(mineral, () => SCENARIOS[s]().conditions, tempC, 2); } catch { t2 = 0; }
      if (!(t2 > 0)) continue;
      const make = () => SCENARIOS[s]().conditions;
      const curve = SIGMAS.map(x => { try { return proposed(mineral, make, tempC, x); } catch { return 0; } });
      const context = `${s}${tempC == null ? '' : ` at ${tempC} °C`}`;
      if (new Set(curve.map(x => x.toPrecision(12))).size > 1) return { driven: true, context, curve };
      responded ||= { driven: false, context, curve, why: 'thickness did not change with the forced sigma' };
    }
  }
  return responded || { driven: false, context: null, curve: null, why: 'no context proposed a zone at sigma 2' };
}
function classify(curve) {
  const t2 = curve[SIGMAS.indexOf(2)], t0 = curve[0];
  const share = t0 / t2;
  return { share, verdict: share < 0.01 ? 'vanishes' : share >= 0.25 ? 'FINITE' : 'other' };
}

const FINITE = [];
if (part !== 2) {
  say(`rate-at-saturation census — SIM ${SIM_VERSION}; forced sigma ${SIGMAS.join(', ')}; rng re-seeded (${PROBE_SEED}) before every engine call`);
  const minerals = Object.keys(MINERAL_ENGINES).filter(m => typeof MINERAL_ENGINES[m] === 'function').sort();
  const by = { vanishes: [], FINITE: [], other: [], 'not driven': [] };
  for (const m of minerals) {
    const p = probe(m);
    if (!p.driven) { by['not driven'].push(m); J.engines[m] = { verdict: 'not driven', why: p.why, context: p.context }; continue; }
    const c = classify(p.curve);
    by[c.verdict].push(m);
    J.engines[m] = { verdict: c.verdict, share_at_saturation: c.share, context: p.context, proposed_um: p.curve };
  }
  say(`engines ${minerals.length}: rate vanishes at saturation ${by.vanishes.length}; FINITE at saturation ${by.FINITE.length}; other ${by.other.length}; not driven by the probe ${by['not driven'].length}`);
  const row = (m) => `  ${m.padEnd(16)} ${J.engines[m].proposed_um.map(x => x.toPrecision(3).padStart(9)).join('')}   ${(J.engines[m].share_at_saturation * 100).toFixed(1).padStart(5)} %   (${J.engines[m].context})`;
  say(`\nFINITE at saturation — proposed µm at sigma ${SIGMAS.join(' / ')}, then thickness(1.0005) / thickness(2):`);
  for (const m of by.FINITE) say(row(m));
  if (!by.FINITE.length) say('  none');
  if (by.other.length) { say('\nother:'); for (const m of by.other) say(row(m)); }
  say('\ncontrols (engines that are k·excess laws by inspection):');
  for (const m of ['quartz', 'fluorite']) {
    const e = J.engines[m];
    say(`  [${e && e.verdict === 'vanishes' ? 'PASS' : 'FAIL'}] ${m}: ${e ? e.verdict : 'no engine'}${e && e.proposed_um ? ' —' + e.proposed_um.map(x => ' ' + x.toPrecision(3)).join('') : ''}`);
  }
  say(`\nnot driven by the probe (${by['not driven'].length}): ${by['not driven'].map(m => `${m}${J.engines[m].why.startsWith('thickness') ? '*' : ''}`).join(', ') || 'none'}`);
  say('  (* the engine proposed a zone, but its thickness did not change with the forced sigma)');
  FINITE.push(...by.FINITE);
} else {
  const prior = path.join(OUT, 'report.json');
  if (!fs.existsSync(prior)) throw new Error('--part 2 reads the FINITE list from a previous run: run without --part first');
  const saved = JSON.parse(fs.readFileSync(prior, 'utf8'));
  Object.assign(J.engines, saved.engines);
  FINITE.push(...Object.keys(saved.engines).filter(m => saved.engines[m].verdict === 'FINITE'));
}

// ---- PART 2 ----
if (part !== 1 && FINITE.length) {
  const target = new Set(FINITE);
  const where = [...new Set(FINITE.flatMap(scenariosWith))].sort();
  say(`\nwhere it matters — ${FINITE.join(', ')} in ${where.length} scenario(s), seed 42; sigma read at the crystal's own cell when the engine's dry run is taken`);
  let runs = 0, reproduced = 0;
  for (const name of where) {
    setSeed(42);
    const { conditions, events, defaultSteps } = SCENARIOS[name]();
    const sim = new VugSimulator(conditions, events);
    const mesh = sim.wall_state.meshFor(sim);
    const rec = {};
    const orig = sim._computeGraduatedZones;
    if (typeof orig !== 'function') throw new Error('VugSimulator._computeGraduatedZones is gone: the dry-run stage cannot be read');
    sim._computeGraduatedZones = function () {
      const out = orig.call(this);
      for (const c of this.crystals) {
        if (!c.active || !target.has(c.mineral)) continue;
        const z = out.get(c.crystal_id);
        if (!z || !(z.thickness_um > 0)) continue;
        const chem = this.wall_state.chemistryAddressForCrystal(c);
        const cell = mesh.cellOf(c, this.wall_state);
        const sf = this.conditions.fluid, st = this.conditions.temperature;
        let s = NaN;
        try {
          if (cell?.fluid) this.conditions.fluid = cell.fluid;
          if (chem) this.conditions.temperature = temperatureAtMeshVertex(this, mesh, chem.vertexIndex);
          s = this.conditions['supersaturation_' + c.mineral]();
        } finally { this.conditions.fluid = sf; this.conditions.temperature = st; }
        (rec[c.mineral] ||= []).push({ sigma: s, t: z.thickness_um });
      }
      return out;
    };
    for (let i = 0; i < (defaultSteps ?? 100); i++) sim.run_step();
    const summary = {};
    for (const c of sim.crystals) {
      const o = (summary[c.mineral] ||= { active: 0, dissolved: 0, total: 0, max_um: 0 });
      o.total++; if (c.dissolved) o.dissolved++; else o.active++;
      if (c.total_growth_um > o.max_um) o.max_um = Math.round(c.total_growth_um * 10) / 10;
    }
    const sorted = {};
    for (const k of Object.keys(summary).sort()) sorted[k] = summary[k];
    const ok = JSON.stringify(sorted) === JSON.stringify(BASELINE[name]);
    runs++; if (ok) reproduced++;
    for (const [m, zs] of Object.entries(rec)) {
      const tot = zs.reduce((a, z) => a + z.t, 0);
      const below = (lim) => zs.filter(z => z.sigma < lim).reduce((a, z) => a + z.t, 0) / tot;
      const sg = zs.map(z => z.sigma).sort((a, b) => a - b);
      const excess = zs.reduce((a, z) => a + Math.max(0, z.sigma - 1) * (z.t / z.sigma), 0) / tot;
      const largest = Math.max(...sim.crystals.filter(c => c.mineral === m).map(c => c.total_growth_um)) / 1000;
      const r = { scenario: name, mineral: m, zones: zs.length, sigma_min: sg[0], sigma_median: sg[Math.floor(sg.length / 2)], sigma_max: sg[sg.length - 1],
        below_1_05: below(1.05), below_1_25: below(1.25), excess_law_share: excess, largest_mm: largest, reproducesBaseline: ok };
      J.part2.push(r);
      say(`  ${name.padEnd(28)} ${m.padEnd(12)} largest ${largest.toFixed(2).padStart(6)} mm  sigma ${r.sigma_min.toFixed(3)} / ${r.sigma_median.toFixed(3)} / ${r.sigma_max.toFixed(3)} (min / median / max)  proposed below 1.05: ${(r.below_1_05 * 100).toFixed(0).padStart(3)} %  below 1.25: ${(r.below_1_25 * 100).toFixed(0).padStart(3)} %  k·(σ−1) would propose ${(excess * 100).toFixed(0).padStart(3)} %${ok ? '' : '  RUN DOES NOT REPRODUCE THE BASELINE'}`);
    }
  }
  J.part2_integrity = { runs, reproduced };
  say(`integrity: ${reproduced} of ${runs} runs reproduce tests-js/baselines/seed42_v${SIM_VERSION}.json with the dry-run reader attached`);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.txt'), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(J, null, 1) + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/report.{txt,json}`);
