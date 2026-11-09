#!/usr/bin/env node
/**
 * tools/sim-side-census.mjs — what ends a crystal's growth, and what decides how many there are
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md).
 *
 * One pass per scenario at one seed. It reads eight things the baselines do not carry:
 *
 *   SPACE     the cavity fill each step (sim.get_vug_fill, recorded to four decimals), the first step
 *             whose recorded fill is >= 0.7 and >= 0.999, and the last step on which any crystal
 *             stored a positive zone.
 *   TIME      for each surviving crystal, whether it stored a positive zone on the FINAL step: a
 *             crystal still growing when the step counter stops owes its size to the run length.
 *   END       for each surviving crystal that was NOT growing on the final step, the state on the first
 *             step it stored no positive zone after its last one, read at the end of that step, in
 *             this order: it took a negative zone or is marked dissolved; the pocket was full
 *             (fill >= 0.999, closed cavities only); it was enclosed (enclosed_by or
 *             currentEnclosureAuthority); it was inactive; it had reached its authored size cap; else
 *             its own supersaturation method, evaluated on its own cell (the fluid and temperature
 *             swap _runEngineForCrystal makes) and on the bulk handle — below 1 on both, below 1 on
 *             its cell only, or still at or above 1 with no zone stored. A crystal that resumes clears
 *             the record; one that never stored a positive zone is "never grew".
 *   SUPPLY    (a) per fluid species, what the surviving solids hold of it (each stored zone's
 *             _budget_inventory_per_um x _remaining_solid_um, the ledger js/19 books) as a fraction of
 *             the MOST the voxel field ever held of it (the largest sum over all voxels at the end of
 *             any step: an event may empty the fluid late, so the end value would flatter the solids)
 *             — both in the ledger's own unit, ppm of one voxel. Above 1 the field was refilled and
 *             the solids kept more than it ever held at once.
 *             (b) the stored zones the supply shaped: scaled below 1 by graduated
 *             competition (zone.competition_allocation.scaling, js/44) or cut by the formula budget
 *             (zone._stoichiometric_budget_cap, js/19), a zone that is both counted once; (c) zones
 *             rationed to ZERO, which are never stored — read from the "edge-of-gate skip" log lines
 *             after every step (run_step resets the log).
 *   TWO       the bulk handle (conditions.fluid) against the voxel field (mean over all voxels, mean and
 *   FLUIDS    minimum over the wall slab) for every numeric fluid field, every step. Events write the
 *             bulk handle and _propagateGlobalDelta carries the change to the voxels; growth debits the
 *             crystal's own cell. A field whose bulk value leaves the voxel mean was written outside
 *             that pair, or is spatially authored (zone_chemistry), or was drawn down locally.
 *   COUNT     per (scenario, species): crystals born against the species' max_nucleation_count; and,
 *             on every step, for every species with a nucleation function and a registry sigma_crit,
 *             whether the bulk fluid was past sigma_crit and — if so — whether the spec cap was
 *             binding (the test _atNucleationCap applies: exposed crystals >= cap), or the species
 *             already had an active crystal and its nucleation function carries a one-at-a-time gate
 *             (`!existing.length`, read from the js/8x–91 sources: a STATIC reading, and some of those
 *             functions keep a probabilistic side door), or neither.
 *   BORN      crystals that never stored a positive zone; births whose landing-cell sigma
 *             (crystal.nucleation_sigma) was below 0.9x the sigma that admitted them.
 *   THROUGH-  ORDER OF MAGNITUDE. The moles of each element locked in the surviving solids (booked
 *   PUT       crystal volume x a handbook density / the formula mass of an explicit composition, both
 *             in PHYS below) against the moles one cavity-volume of water (1 g/cm3) holds at the
 *             HIGHEST bulk concentration that species reached in the run, ppm read as mg/kg as js/20
 *             defines it. A closed pocket can deliver at most one such volume. The simulator does not
 *             claim physical mass conservation (js/18 STOICHIOMETRIC_GROWTH_BUDGET_DISCLOSURE) and
 *             several broths are deliberately abstracted, so this is not an error count: it restates
 *             what is grown in the unit a water/rock ratio is quoted in.
 *
 * It also prints three STATIC readings of the source: which nucleation functions carry a one-at-a-time
 * gate; what every `rng.random()` comparison in the nucleation files is compared with (a numeric
 * literal, or something else); and every non-comment line that mentions `flow_rate`, split into the
 * event files that assign it and everything else. Each run also records the flow_rate it started
 * with, ended with, and its range.
 *
 * Controls (CONTROLS below), each evaluated when its scenarios are in the run and printed with the
 * report. A positive control shows the reading can see the thing; a negative one that it does not see
 * it everywhere:
 *   + competition log   the five R9 fahlores (mineral-recipe review R9) each show skip lines.
 *   + supply            epithermal_telluride's gold tellurides are rationed on Au.
 *   + two fluids        radiogenic Pb (js/85-simulator.ts, the uraninite block) stays on the bulk handle.
 *   - two fluids        mvt's Ca does not leave the voxel mean.
 *   + space, end        gem_pegmatite is full early, nothing grows afterwards, and the crystals that
 *                       grew read "pocket full".
 *   - space, end        mvt never reaches fill 0.7, is still growing on its final step, and no crystal
 *                       reads "pocket full".
 * The positive controls on Pb and gem_pegmatite are today's defects: the commit that fixes either one
 * turns its control around, and must say so.
 *
 * Integrity: at seed 42 every run is compared with tests-js/baselines/seed42_v<SIM>.json through the
 * per-species summary of tools/gen-js-baseline.mjs (copied, not imported: that file is an evidence
 * producer and runs on import). The wrappers observe only; a run that does not reproduce is reported.
 *
 * PASSIVE instrument: reads, reports, exits 0 whatever it finds. Imports only tools/_harness.mjs and
 * node builtins and writes only under .local-evidence/ (default .local-evidence/sim-side-census/seed-<N>/:
 * rows/<scenario>.json, report.txt, report.json, report.md). A row is reused unless --fresh when
 * CENSUS_VERSION and the input digest match: runtime formation, dist, data, the harness, the js/
 * sources the static readings parse, the dependency lock and the seed-42 reference. This file is NOT
 * in the digest, so the report half can change without a re-run: BUMP CENSUS_VERSION WHENEVER
 * runScenario OR staticReadings CHANGES.
 *
 * Usage:
 *   node tools/sim-side-census.mjs                 # every scenario, seed 42 (about 20 min)
 *   node tools/sim-side-census.mjs mvt bisbee      # a subset
 *   node tools/sim-side-census.mjs --seed 1        # another seed (no baseline to compare with)
 *   node tools/sim-side-census.mjs --fresh         # ignore the rows on disk
 *   node tools/sim-side-census.mjs --out <dir>     # another directory under .local-evidence/
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CENSUS_VERSION = 3;
const RUNTIME = Object.freeze({ node: process.version, v8: process.versions.v8, icu: process.versions.icu,
  platform: process.platform, arch: process.arch });
const FULL_FILL = 0.999;
const HIGH_FILL = 0.7;          // _fillDampenerFor (js/85d) starts to bite here
const MM = 1000;                // µm per mm

// ---- arguments ----
const opts = { seed: 42, fresh: false, scenarios: [], out: null };
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') {
      opts.seed = Number(argv[++i]);
      if (!Number.isInteger(opts.seed)) throw new Error('--seed takes one integer');
    } else if (a === '--fresh') opts.fresh = true;
    else if (a === '--out') opts.out = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('node tools/sim-side-census.mjs [scenario …] [--seed 42] [--fresh] [--out <dir under .local-evidence>]');
      process.exit(0);
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts.scenarios.push(a);
  }
}
const EVIDENCE = path.join(ROOT, '.local-evidence');
const OUT = opts.out || path.join(EVIDENCE, 'sim-side-census', `seed-${opts.seed}`);
if (path.relative(EVIDENCE, OUT).startsWith('..') || path.isAbsolute(path.relative(EVIDENCE, OUT))) {
  throw new Error('--out must lie under .local-evidence/ (the one directory the test identity guard excludes)');
}

// ---- THROUGHPUT: explicit compositions and handbook densities ----
// Atomic masses (IUPAC, rounded). The formula mass is summed from the composition, never typed.
const ATOM = { H: 1.008, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, O: 15.999, F: 18.998, Na: 22.990,
  Mg: 24.305, Al: 26.982, Si: 28.086, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, V: 50.942,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, As: 74.922, Sr: 87.62,
  Mo: 95.95, Ag: 107.868, Te: 127.60, Ba: 137.327, Au: 196.967, Hg: 200.592, Pb: 207.2, U: 238.029 };
// [density g/cm3, composition]. Densities are rounded handbook values entered by hand (measured
// densities as tabulated in the Handbook of Mineralogy; a 10 % error moves no entry across a decade).
// Solid solutions and variable hydrates take one stated composition. Only the minerals that carry
// volume in the fleet are priced; the report states the share of each scenario's volume it priced.
const PHYS = {
  albite: [2.62, { Na: 1, Al: 1, Si: 3, O: 8 }], feldspar: [2.56, { K: 1, Al: 1, Si: 3, O: 8 }],
  quartz: [2.65, { Si: 1, O: 2 }], chalcedony: [2.60, { Si: 1, O: 2 }], chrysoprase: [2.60, { Si: 1, O: 2 }],
  tigers_eye: [2.65, { Si: 1, O: 2 }], opal: [2.10, { Si: 1, O: 2.33, H: 0.66 }],
  calcite: [2.71, { Ca: 1, C: 1, O: 3 }], aragonite: [2.95, { Ca: 1, C: 1, O: 3 }],
  siderite: [3.96, { Fe: 1, C: 1, O: 3 }], rhodochrosite: [3.70, { Mn: 1, C: 1, O: 3 }],
  malachite: [4.00, { Cu: 2, C: 1, O: 5, H: 2 }], fluorite: [3.18, { Ca: 1, F: 2 }],
  atacamite: [3.76, { Cu: 2, Cl: 1, O: 3, H: 3 }],
  galena: [7.58, { Pb: 1, S: 1 }], sphalerite: [4.05, { Zn: 1, S: 1 }], chalcopyrite: [4.20, { Cu: 1, Fe: 1, S: 2 }],
  pyrite: [5.01, { Fe: 1, S: 2 }], marcasite: [4.89, { Fe: 1, S: 2 }], molybdenite: [4.70, { Mo: 1, S: 2 }],
  arsenopyrite: [6.07, { Fe: 1, As: 1, S: 1 }], cinnabar: [8.18, { Hg: 1, S: 1 }], metacinnabar: [7.65, { Hg: 1, S: 1 }],
  nickeline: [7.78, { Ni: 1, As: 1 }], hessite: [8.30, { Ag: 2, Te: 1 }], sylvanite: [8.16, { Au: 1, Ag: 1, Te: 4 }],
  calaverite: [9.20, { Au: 1, Te: 2 }], native_silver: [10.5, { Ag: 1 }], native_sulfur: [2.07, { S: 1 }],
  native_arsenic: [5.70, { As: 1 }],
  selenite: [2.31, { Ca: 1, S: 1, O: 6, H: 4 }], anhydrite: [2.97, { Ca: 1, S: 1, O: 4 }],
  barite: [4.48, { Ba: 1, S: 1, O: 4 }], celestine: [3.97, { Sr: 1, S: 1, O: 4 }], thenardite: [2.66, { Na: 2, S: 1, O: 4 }],
  brochantite: [3.97, { Cu: 4, S: 1, O: 10, H: 6 }],
  hematite: [5.26, { Fe: 2, O: 3 }], goethite: [4.28, { Fe: 1, O: 2, H: 1 }], uraninite: [10.0, { U: 1, O: 2 }],
  powellite: [4.26, { Ca: 1, Mo: 1, O: 4 }], wulfenite: [6.80, { Pb: 1, Mo: 1, O: 4 }],
  ferrimolybdite: [3.00, { Fe: 2, Mo: 3, O: 20, H: 16 }],
  pyromorphite: [7.04, { Pb: 5, P: 3, O: 12, Cl: 1 }], apatite: [3.19, { Ca: 5, P: 3, O: 12, F: 1 }],
  uranophane: [3.90, { Ca: 1, U: 2, Si: 2, O: 17, H: 12 }], tyuyamunite: [3.80, { Ca: 1, U: 2, V: 2, O: 18, H: 12 }],
  erythrite: [3.06, { Co: 3, As: 2, O: 16, H: 16 }], annabergite: [3.07, { Ni: 3, As: 2, O: 16, H: 16 }],
  haidingerite: [2.95, { Ca: 1, As: 1, O: 5, H: 3 }], pharmacolite: [2.68, { Ca: 1, As: 1, O: 6, H: 5 }],
  chrysocolla: [2.20, { Cu: 2, Si: 2, O: 9, H: 6 }],
  diopside: [3.30, { Ca: 1, Mg: 1, Si: 2, O: 6 }], grossular: [3.59, { Ca: 3, Al: 2, Si: 3, O: 12 }],
  vesuvianite: [3.35, { Ca: 10, Mg: 2, Al: 4, Si: 9, O: 38, H: 4 }],
  actinolite: [3.10, { Ca: 2, Mg: 2.5, Fe: 2.5, Si: 8, O: 24, H: 2 }],
  epidote: [3.40, { Ca: 2, Al: 2, Fe: 1, Si: 3, O: 13, H: 1 }], andalusite: [3.15, { Al: 2, Si: 1, O: 5 }],
  morganite: [2.80, { Be: 3, Al: 2, Si: 6, O: 18 }], crocidolite: [3.30, { Na: 2, Fe: 5, Si: 8, O: 24, H: 2 }],
  heulandite: [2.20, { Ca: 2.5, Al: 5, Si: 13, O: 48, H: 24 }],
};
// The fluid field that carries each element (js/19's conventions: Si as SiO2, C as CO3).
const FIELD_OF = (el) => (el === 'Si' ? 'SiO2' : el === 'C' ? 'CO3' : el);
const formulaMass = (comp) => Object.entries(comp).reduce((s, [el, n]) => {
  if (!(ATOM[el] > 0)) throw new Error(`no atomic mass for ${el}`);
  return s + ATOM[el] * n;
}, 0);

const END_REASONS = ['still growing on the final step', 'pocket full', 'undersaturated, bulk too',
  'undersaturated at its cell only', 'at or above saturation, no zone stored', 'enclosed', 'dissolving',
  'inactive', 'size cap', 'never grew', 'no sigma method', 'unclassified'];
// A crystal that stored a positive zone, was not growing on the final step, and has no stop on
// record would be a failure of the tracking, not a class: it is reported as 'unclassified', never
// folded into 'never grew'.
const endOf = (c) => (c.end === 'never grew' && c.nPos > 0 ? 'unclassified' : c.end);
const endShare = (r, reason) => {
  const grew = r.crystals.filter(c => !c.dissolved && c.nPos > 0);
  return grew.length ? grew.filter(c => endOf(c) === reason).length / grew.length : 0;
};

const CONTROLS = [
  { id: 'competition-log', kind: 'positive', needs: ['bisbee', 'porphyry', 'schneeberg'],
    label: 'the five R9 fahlores each show at least 10 "edge-of-gate skip" lines (recipe review R9: 64/64/60/60/65 at seed 42)',
    test: (R) => {
      const pairs = [['bisbee', 'tetrahedrite'], ['bisbee', 'tennantite'], ['porphyry', 'tetrahedrite'],
        ['porphyry', 'tennantite'], ['schneeberg', 'tennantite']];
      const n = pairs.map(([s, m]) => R[s].skips[m] || 0);
      return { pass: n.every(x => x >= 10), detail: n.join('/') + ` = ${n.reduce((a, b) => a + b, 0)}` };
    } },
  { id: 'supply', kind: 'positive', needs: ['epithermal_telluride'],
    label: 'the supply reading finds scarcity where it exists: in epithermal_telluride at least 100 zones of the gold tellurides are shaped on Au, some rationed and some budget-cut',
    test: (R) => {
      const z = R.epithermal_telluride.zones;
      const n = Object.entries(z.limBy).filter(([k]) => /^(sylvanite|calaverite):Au$/.test(k)).reduce((s, [, v]) => s + v, 0);
      return { pass: n >= 100 && z.rationed >= 100 && z.capped >= 1, detail: `${n} zones on Au; scenario-wide ${z.rationed} rationed, ${z.capped} budget-cut` };
    } },
  { id: 'two-fluids', kind: 'positive', needs: ['radioactive_pegmatite', 'schneeberg'],
    label: 'radiogenic Pb stays on the bulk handle (bulk − voxel mean >= 50 ppm at run end); FLIPS when that write reaches the voxels',
    test: (R) => {
      const d = ['radioactive_pegmatite', 'schneeberg'].map(s => R[s].fields.Pb.bulkEnd - R[s].fields.Pb.voxEnd);
      return { pass: d.every(x => x >= 50), detail: d.map(x => x.toFixed(1)).join(' / ') + ' ppm' };
    } },
  { id: 'two-fluids', kind: 'negative', needs: ['mvt'],
    label: "mvt's Ca never leaves the voxel mean by more than 1 % of its scale",
    test: (R) => {
      const f = R.mvt.fields.Ca;
      return { pass: f.maxDiv / f.scale <= 0.01, detail: `${(f.maxDiv / f.scale * 100).toFixed(3)} %` };
    } },
  { id: 'space+end', kind: 'positive', needs: ['gem_pegmatite'],
    label: 'gem_pegmatite reaches fill >= 0.999 by step 15, stores no positive zone afterwards, and at least 80 % of its crystals that grew read "pocket full"; FLIPS when the plug is cured',
    test: (R) => {
      const r = R.gem_pegmatite, share = endShare(r, 'pocket full');
      return { pass: r.firstFull != null && r.firstFull <= 15 && r.lastGrowthStep <= r.firstFull + 1 && share >= 0.8,
        detail: `full at step ${r.firstFull}, last growth at step ${r.lastGrowthStep} of ${r.steps}, "pocket full" ${(share * 100).toFixed(0)} %` };
    } },
  { id: 'space+end', kind: 'negative', needs: ['mvt'],
    label: 'mvt never reaches fill 0.7, is still growing on its final step, and no crystal reads "pocket full"',
    test: (R) => {
      const r = R.mvt, share = endShare(r, 'pocket full');
      return { pass: r.first70 == null && r.lastGrowthStep === r.steps && share === 0,
        detail: `first step at fill >= 0.7: ${r.first70 ?? 'never'}; fill at end ${(r.fillEnd * 100).toFixed(1)} %, last growth at step ${r.lastGrowthStep} of ${r.steps}, "pocket full" ${(share * 100).toFixed(0)} %` };
    } },
];

// ---- static readings of the source ----
function codeLines(file) {
  // [lineNo, text] of lines that are not comment-only. Block comments in js/ are line-prefixed (// or *).
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n')
    .map((t, i) => [i + 1, t]).filter(([, t]) => !/^\s*(\/\/|\*|\/\*)/.test(t));
}
function staticReadings() {
  const dir = path.join(ROOT, 'js');
  const all = fs.readdirSync(dir).filter(f => f.endsWith('.ts')).sort();
  // (1) one-at-a-time gates
  const nucFiles = all.filter(f => /^(8\d[a-z]?|9[01])-nucleation-.*\.ts$/.test(f));
  const LIST = /const (\w+) = sim\.crystals\.filter\(c => c\.mineral === '([A-Za-z0-9_]+)'/g;
  const fns = [];
  for (const f of nucFiles) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const re = /^function _nuc_([A-Za-z0-9_]+)\(sim\) \{/gm;
    const starts = [];
    let m;
    while ((m = re.exec(src))) starts.push({ name: m[1], idx: m.index });
    for (let i = 0; i < starts.length; i++) {
      const body = src.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
      const code = body.split('\n').filter(t => !/^\s*\/\//.test(t)).join('\n');
      let serial = false;
      LIST.lastIndex = 0;
      let s;
      while ((s = LIST.exec(code))) if (s[2] === starts[i].name && code.includes('!' + s[1] + '.length')) serial = true;
      fns.push({ name: starts[i].name, file: f, serial, usesCap: code.includes('_atNucleationCap(') });
    }
  }
  // (2) flow_rate
  const isEvent = (f) => /^70[a-z]?-/.test(f);
  const assigns = {}, reads = [];
  for (const f of all) {
    if (f === '15-version.ts') continue;          // release notes
    for (const [n, t] of codeLines(path.join(dir, f))) {
      if (!t.includes('flow_rate')) continue;
      if (isEvent(f) && /\bflow_rate\s*=(?!=)/.test(t)) assigns[f] = (assigns[f] || 0) + 1;
      else reads.push({ file: f, line: n, text: t.trim().slice(0, 150) });
    }
  }
  // declarative event transforms may carry it too (js/70-events.ts allowedKeys)
  const dataLines = codeLines(path.join(ROOT, 'data', 'scenarios.json5')).filter(([, t]) => t.includes('"flow_rate"')).length;
  // (3) what a nucleation roll is compared with
  const rolls = { total: 0, literal: 0, other: {} };
  for (const f of nucFiles) {
    for (const [, t] of codeLines(path.join(dir, f))) {
      for (const m of t.matchAll(/rng\.random\(\)\s*(?:<=|>=|<|>)\s*([A-Za-z_0-9.]+)/g)) {
        rolls.total++;
        if (/^[0-9.]+$/.test(m[1])) rolls.literal++; else rolls.other[m[1]] = (rolls.other[m[1]] || 0) + 1;
      }
    }
  }
  return { fns, flow: { assigns, reads, dataLines }, rolls };
}

function inputDigest(simVersion) {
  const files = [path.join(ROOT, 'tools', '_harness.mjs'), path.join(ROOT, 'package-lock.json')];
  const walk = (dir, ext) => {
    for (const n of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, n);
      if (fs.statSync(p).isDirectory()) walk(p, ext);
      else if (n.endsWith(ext)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'dist'), '.js');
  walk(path.join(ROOT, 'js'), '.ts');
  for (const n of fs.readdirSync(path.join(ROOT, 'data')).sort()) {
    if (/\.json5?$/.test(n)) files.push(path.join(ROOT, 'data', n));
  }
  const baselineFile = path.join(ROOT, 'tests-js', 'baselines', `seed42_v${simVersion}.json`);
  if (fs.existsSync(baselineFile)) files.push(baselineFile);
  const h = crypto.createHash('sha256');
  h.update(`census-${CENSUS_VERSION}\0`).update(JSON.stringify(RUNTIME)).update('\0');
  for (const f of files) {
    h.update(path.relative(ROOT, f).replaceAll('\\', '/')).update('\0');
    h.update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).update('\0');
  }
  return h.digest('hex');
}

// ---- bundle ----
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_SPEC, MINERAL_GATES_REGISTRY,
  SPECIES_PROPERTIES, currentEnclosureAuthority, temperatureAtMeshVertex } = await harness.loadSimBundle({
  toolName: 'sim-side-census',
  extraExports: ['MINERAL_SPEC', 'MINERAL_GATES_REGISTRY', 'SPECIES_PROPERTIES', 'currentEnclosureAuthority', 'temperatureAtMeshVertex'],
});
const STATIC = staticReadings();
const SERIAL = new Set(STATIC.fns.filter(f => f.serial).map(f => f.name));
const NUC_MINERALS = STATIC.fns.map(f => f.name);
const INPUTS = inputDigest(SIM_VERSION);
const baselineFile = path.join(ROOT, 'tests-js', 'baselines', `seed42_v${SIM_VERSION}.json`);
const BASELINE = opts.seed === 42 && fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;

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

function runScenario(name, seed) {
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  const sim = new VugSimulator(conditions, events);
  const steps = defaultSteps ?? 100;
  const grid = sim.wall_state.voxelGridFor(sim);
  const mesh = sim.wall_state.meshFor(sim);
  const F = sim._fluidFieldNames.slice();
  const D = grid.depth_count;
  const nVox = grid.voxels.length, nWall = nVox / D;
  const openSystem = !!(conditions.wall && conditions.wall.open_system);

  // births: observe the return value only
  const births = [];
  const origNucleate = sim.nucleate;
  sim.nucleate = function (mineral, position = 'vug wall', sigma = 1.0) {
    const c = origNucleate.call(this, mineral, position, sigma);
    births.push({ step: this.step, mineral, sigmaBulk: sigma, sigmaLocal: c.nucleation_sigma });
    return c;
  };

  // per-step field statistics
  const st = F.map(() => ({ maxDiv: 0, maxDivStep: 0, scale: 0, bulkMax: 0, voxSumMax: 0 }));
  const sumAll = new Float64Array(F.length), sumWall = new Float64Array(F.length), minWall = new Float64Array(F.length);
  const sample = (step) => {
    sumAll.fill(0); sumWall.fill(0); minWall.fill(Infinity);
    for (let i = 0; i < nVox; i++) {
      const fl = grid.voxels[i].fluid, wall = (i % D) === 0;
      for (let k = 0; k < F.length; k++) {
        const v = Number(fl[F[k]]) || 0;
        sumAll[k] += v;
        if (wall) { sumWall[k] += v; if (v < minWall[k]) minWall[k] = v; }
      }
    }
    const b = sim.conditions.fluid;
    for (let k = 0; k < F.length; k++) {
      const bulk = Number(b[F[k]]) || 0, mean = sumAll[k] / nVox, s = st[k];
      s.scale = Math.max(s.scale, Math.abs(bulk), Math.abs(mean));
      if (bulk > s.bulkMax) s.bulkMax = bulk;
      if (sumAll[k] > s.voxSumMax) s.voxSumMax = sumAll[k];
      const d = Math.abs(bulk - mean);
      if (d > s.maxDiv) { s.maxDiv = d; s.maxDivStep = step; }
    }
  };

  // Bulk sigma the way _wallStrangledFor reads it (js/85b): the flag keeps a localized-nucleation
  // envelope, where one is installed, from answering for the bulk.
  const withDirect = (fn) => {
    const saved = !!sim._localNucleationDirectEvaluation;
    sim._localNucleationDirectEvaluation = true;
    try { return fn(); } finally { sim._localNucleationDirectEvaluation = saved; }
  };
  const sigmaOf = (mineral) => {
    const fn = sim.conditions['supersaturation_' + mineral];
    if (typeof fn !== 'function') return null;
    try { const v = fn.call(sim.conditions); return Number.isFinite(v) ? v : 0; } catch { return 0; }
  };
  // The crystal's own cell, with the swap _runEngineForCrystal makes.
  const sigmaAtCell = (c) => {
    const chem = sim.wall_state.chemistryAddressForCrystal(c);
    const cell = mesh.cellOf(c, sim.wall_state);
    const sf = sim.conditions.fluid, stT = sim.conditions.temperature;
    try {
      if (cell?.fluid) sim.conditions.fluid = cell.fluid;
      if (chem) sim.conditions.temperature = temperatureAtMeshVertex(sim, mesh, chem.vertexIndex);
      return sigmaOf(c.mineral);
    } finally { sim.conditions.fluid = sf; sim.conditions.temperature = stT; }
  };

  // END: what the crystal's state was on the first step it stored no positive zone
  const track = new Map();           // crystal -> { grewPrev, stop }
  const grewThisStep = (c) => {
    for (let i = c.zones.length - 1; i >= 0 && c.zones[i].step === sim.step; i--) if (c.zones[i].thickness_um > 0) return true;
    return false;
  };
  const tookNegativeThisStep = (c) => {
    for (let i = c.zones.length - 1; i >= 0 && c.zones[i].step === sim.step; i--) if (c.zones[i].thickness_um < 0) return true;
    return false;
  };
  const whyStopped = (c) => withDirect(() => {
    if (tookNegativeThisStep(c) || c.dissolved) return 'dissolving';
    if (!openSystem && sim.get_vug_fill() >= FULL_FILL) return 'pocket full';
    if (c.enclosed_by != null || currentEnclosureAuthority(sim, c)) return 'enclosed';
    if (!c.active) return 'inactive';
    if (c._size_capped) return 'size cap';
    const bulk = sigmaOf(c.mineral);
    if (bulk == null) return 'no sigma method';
    const cell = sigmaAtCell(c);
    if (cell >= 1) return 'at or above saturation, no zone stored';
    return bulk >= 1 ? 'undersaturated at its cell only' : 'undersaturated, bulk too';
  });
  const endCensus = () => {
    for (const c of sim.crystals) {
      let t = track.get(c);
      if (!t) { t = { grewPrev: false, stop: null }; track.set(c, t); }
      if (grewThisStep(c)) { t.grewPrev = true; t.stop = null; }
      else if (t.grewPrev) { t.grewPrev = false; t.stop = { step: sim.step, why: whyStopped(c) }; }
    }
  };

  // COUNT: read at the end of each step on the bulk fluid
  const rule = {};
  const ruleCensus = () => withDirect(() => {
    const exposed = {}, active = {};
    for (const c of sim.crystals) {
      if (c.active) active[c.mineral] = (active[c.mineral] || 0) + 1;
      if (c.dissolved || currentEnclosureAuthority(sim, c)) continue;
      exposed[c.mineral] = (exposed[c.mineral] || 0) + 1;
      if (c.paramorph_origin && c.paramorph_origin !== c.mineral) exposed[c.paramorph_origin] = (exposed[c.paramorph_origin] || 0) + 1;
    }
    for (const m of NUC_MINERALS) {
      const gate = MINERAL_GATES_REGISTRY[m];
      if (!gate || typeof gate.sigma_crit !== 'number') continue;
      const s = sigmaOf(m);
      if (s == null || !(s > gate.sigma_crit)) continue;
      const r = (rule[m] ||= { want: 0, cap: 0, serial: 0, open: 0, maxSigma: 0, sigmaCrit: gate.sigma_crit });
      r.want++;
      if (s > r.maxSigma) r.maxSigma = s;
      const cap = MINERAL_SPEC[m]?.max_nucleation_count;
      if (cap != null && (exposed[m] || 0) >= cap) r.cap++;
      else if (SERIAL.has(m) && (active[m] || 0) >= 1) r.serial++;
      else r.open++;
    }
  });

  const fill = [], skips = {};
  const flow = { start: Number(sim.conditions.flow_rate), min: Number(sim.conditions.flow_rate), max: Number(sim.conditions.flow_rate), end: null };
  const t0 = Date.now();
  sample(0);
  for (let i = 0; i < steps; i++) {
    const log = sim.run_step();
    const fr = Number(sim.conditions.flow_rate);
    if (fr < flow.min) flow.min = fr;
    if (fr > flow.max) flow.max = fr;
    flow.end = fr;
    for (const line of log) {
      const m = /◌ (\S+) #\d+: edge-of-gate skip/.exec(line);
      if (m) { const k = m[1].toLowerCase(); skips[k] = (skips[k] || 0) + 1; }
    }
    fill.push(Math.round(sim.get_vug_fill() * 1e4) / 1e4);
    sample(sim.step);
    endCensus();
    ruleCensus();
  }
  const ms = Date.now() - t0;

  // ---- end of run ----
  const solids = {}, limBy = {}, volBy = {};
  const zones = { pos: 0, neg: 0, zero: 0, rationed: 0, capped: 0, shaped: 0 };
  let lastGrowthStep = 0;
  const crystals = sim.crystals.map(c => {
    let nPos = 0, lastPos = null;
    for (const z of c.zones || []) {
      const t = Number(z.thickness_um) || 0;
      if (t > 0) {
        nPos++; zones.pos++;
        lastPos = z.step;
        const rem = Number.isFinite(Number(z._remaining_solid_um)) ? Math.max(0, Number(z._remaining_solid_um)) : t;
        const inv = z._budget_inventory_per_um || {};
        for (const sp in inv) solids[sp] = (solids[sp] || 0) + rem * (Number(inv[sp]) || 0);
        const a = z.competition_allocation;
        const rationed = !!(a && typeof a === 'object' && a.scaling < 0.999);
        const capped = !!z._stoichiometric_budget_cap;
        if (rationed) zones.rationed++;
        if (capped) zones.capped++;
        if (rationed || capped) {
          // One zone, one entry: a zone both rationed and budget-cut is named by its ration.
          zones.shaped++;
          const species = rationed ? a.limiting_species : z._stoichiometric_budget_cap.limiting_species;
          const k = `${c.mineral}:${species || '?'}`;
          limBy[k] = (limBy[k] || 0) + 1;
        }
      } else if (t < 0) zones.neg++; else zones.zero++;
    }
    if (lastPos != null && lastPos > lastGrowthStep) lastGrowthStep = lastPos;
    if (!c.dissolved && c._volume_mm3 > 0) volBy[c.mineral] = (volBy[c.mineral] || 0) + c._volume_mm3;
    const t = track.get(c);
    const end = nPos === 0 ? 'never grew' : lastPos === steps ? 'still growing on the final step' : (t && t.stop ? t.stop.why : 'never grew');
    return { m: c.mineral, born: c.nucleation_step, g: c.total_growth_um, v: c._volume_mm3 || 0, nPos, lastPos,
      dissolved: !!c.dissolved, enclosed: c.enclosed_by != null, end, endStep: t && t.stop ? t.stop.step : null };
  });
  const fields = {};
  for (let k = 0; k < F.length; k++) {
    if (!(st[k].scale > 0)) continue;
    fields[F[k]] = { bulkEnd: Number(sim.conditions.fluid[F[k]]) || 0, voxEnd: sumAll[k] / nVox, voxSumEnd: sumAll[k],
      wallEnd: sumWall[k] / nWall, wallMinEnd: minWall[k], ...st[k] };
  }
  const i70 = fill.findIndex(x => x >= HIGH_FILL), i100 = fill.findIndex(x => x >= FULL_FILL);
  const row = {
    name, seed, steps, ms, nVox, openSystem,
    wall: { composition: conditions.wall.composition, diam_mm: conditions.wall.vug_diameter_mm, vol_mm3: conditions.wall.cavity_capacity_volume_mm3 },
    events: events.map(e => ({ step: e.step, name: e.name })),
    fill, fillEnd: sim.get_vug_fill(), first70: i70 < 0 ? null : i70 + 1, firstFull: i100 < 0 ? null : i100 + 1, lastGrowthStep, flow,
    fields, solids, zones: { ...zones, limBy }, skips, births, rule, crystals, volBy,
    summary: summarize(sim),
  };
  if (BASELINE) row.matchesBaseline = JSON.stringify(row.summary) === JSON.stringify(BASELINE[name]);
  return row;
}

// ---- run (rows are reused when their inputs match) ----
fs.mkdirSync(path.join(OUT, 'rows'), { recursive: true });
const names = (opts.scenarios.length ? opts.scenarios : Object.keys(SCENARIOS).sort());
for (const n of names) if (!SCENARIOS[n]) throw new Error(`unknown scenario ${n}`);
const R = {};
for (const name of names) {
  const file = path.join(OUT, 'rows', `${name}.json`);
  let row = null;
  if (!opts.fresh && fs.existsSync(file)) {
    try { const saved = JSON.parse(fs.readFileSync(file, 'utf8')); if (saved.inputs === INPUTS) row = saved.row; } catch { row = null; }
  }
  const reused = !!row;
  if (!row) { row = runScenario(name, opts.seed); fs.writeFileSync(file, JSON.stringify({ inputs: INPUTS, row })); }
  R[name] = row;
  console.log(`  ${name.padEnd(38)} ${String(row.steps).padStart(3)} steps ${String(row.crystals.length).padStart(4)} crystals  fill ${(row.fillEnd * 100).toFixed(1).padStart(5)} %${row.matchesBaseline === undefined ? '' : row.matchesBaseline ? '  baseline ok' : '  BASELINE MISMATCH'}${reused ? '  [reused]' : ''}`);
}

// ---- report ----
const pct = (x, d = 1) => (x * 100).toFixed(d) + ' %';
const q = (arr, p) => { if (!arr.length) return NaN; const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const sig = (x) => !Number.isFinite(x) ? 'inf' : x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2);
const rows = names.map(n => R[n]);
const J = { census_version: CENSUS_VERSION, sim_version: SIM_VERSION, seed: opts.seed, inputs: INPUTS, scenarios: names.length };
const T = [];   // text lines
const M = [];   // markdown fragment
const say = (s = '') => T.push(s);

say(`sim-side census v${CENSUS_VERSION} — SIM ${SIM_VERSION}, seed ${opts.seed}, ${names.length} scenario(s); inputs ${INPUTS.slice(0, 12)}`);
if (BASELINE) {
  const bad = rows.filter(r => !r.matchesBaseline).map(r => r.name);
  J.baseline = { reproduced: rows.length - bad.length, of: rows.length, mismatches: bad };
  say(`integrity: ${rows.length - bad.length} of ${rows.length} runs reproduce tests-js/baselines/seed42_v${SIM_VERSION}.json${bad.length ? ' — MISMATCH: ' + bad.join(', ') : ''}`);
} else say('integrity: no seed-42 baseline applies to this seed; the runs are not compared');

// controls
say('\nCONTROLS');
J.controls = [];
for (const c of CONTROLS) {
  if (!c.needs.every(n => R[n])) { say(`  [not run] ${c.kind} ${c.id}: needs ${c.needs.join(', ')}`); continue; }
  const res = c.test(R);
  J.controls.push({ id: c.id, kind: c.kind, label: c.label, ...res });
  say(`  [${res.pass ? 'PASS' : 'FAIL'}] ${c.kind} ${c.id}: ${c.label} — ${res.detail}`);
}

// SPACE and TIME
say('\nSPACE and TIME');
say('scenario                               steps  cavity mm  fill at end  first step fill>=0.7 / >=0.999  last growth  largest crystal, and what ended its growth');
M.push('### Space and time', '', '| scenario | steps | fill at end | first step at fill ≥ 0.7 | ≥ 0.999 | last step any crystal grew | largest crystal | what ended its growth |', '|---|---:|---:|---:|---:|---:|---|---|');
let withCrystals = 0, topGrowing = 0;
for (const r of rows) {
  const surv = r.crystals.filter(c => !c.dissolved);
  const top = surv.slice().sort((a, b) => b.g - a.g)[0] || null;
  if (top) { withCrystals++; if (endOf(top) === END_REASONS[0]) topGrowing++; }
  const topText = top ? `${top.m} ${(top.g / MM).toFixed(top.g < MM ? 2 : 1)} mm` : '—';
  const ended = top ? (endOf(top) === END_REASONS[0] ? 'the run ended' : `${endOf(top)} (step ${top.endStep ?? top.lastPos})`) : '—';
  say(`${r.name.padEnd(38)} ${String(r.steps).padStart(5)} ${r.wall.diam_mm.toFixed(0).padStart(9)} ${pct(r.fillEnd).padStart(11)}   ${String(r.first70 ?? '-').padStart(12)} / ${String(r.firstFull ?? '-').padStart(4)}             ${String(r.lastGrowthStep).padStart(4)}       ${topText}: ${ended}`);
  M.push(`| ${r.name} | ${r.steps} | ${pct(r.fillEnd)} | ${r.first70 ?? '—'} | ${r.firstFull ?? '—'} | ${r.lastGrowthStep} | ${topText} | ${ended} |`);
}
const fe = rows.map(r => r.fillEnd);
J.space = { le1: fe.filter(x => x <= 0.01).length, le10: fe.filter(x => x > 0.01 && x <= 0.1).length,
  le70: fe.filter(x => x > 0.1 && x <= 0.7).length, gt70: fe.filter(x => x > 0.7).length,
  full: rows.filter(r => r.firstFull != null).map(r => `${r.name}@${r.firstFull}/${r.steps}`) };
say(`fill at run end: <= 1 % in ${J.space.le1}, 1–10 % in ${J.space.le10}, 10–70 % in ${J.space.le70}, > 70 % in ${J.space.gt70}; reached fill >= 0.999: ${J.space.full.join(', ') || 'none'}`);

// END
say('\nEND — what ended the growth of each surviving crystal');
const endAll = Object.fromEntries(END_REASONS.map(k => [k, 0])), endBig = Object.fromEntries(END_REASONS.map(k => [k, 0]));
let surviving = 0, big = 0;
for (const r of rows) for (const c of r.crystals) {
  if (c.dissolved) continue;
  surviving++; endAll[endOf(c)] = (endAll[endOf(c)] || 0) + 1;
  if (c.g >= MM) { big++; endBig[endOf(c)] = (endBig[endOf(c)] || 0) + 1; }
}
J.end = { surviving, ge1mm: big, all: endAll, ge1mmBy: endBig, scenariosWithCrystals: withCrystals, largestStillGrowing: topGrowing };
M.push('', '### What ended growth', '', '| state on the first step with no positive zone | surviving crystals | of those ≥ 1 mm |', '|---|---:|---:|');
for (const k of END_REASONS) {
  if (!endAll[k] && !endBig[k]) continue;
  say(`  ${k.padEnd(42)} ${String(endAll[k]).padStart(5)} (${pct(endAll[k] / Math.max(1, surviving)).padStart(6)})   >= 1 mm: ${String(endBig[k]).padStart(4)} (${pct(endBig[k] / Math.max(1, big)).padStart(6)})`);
  M.push(`| ${k} | ${endAll[k]} (${pct(endAll[k] / Math.max(1, surviving))}) | ${endBig[k]} (${pct(endBig[k] / Math.max(1, big))}) |`);
}
say(`  surviving crystals ${surviving}; >= 1 mm ${big}; the largest crystal is still growing on the final step in ${topGrowing} of ${withCrystals} scenarios with crystals`);
M.push(`| all | ${surviving} | ${big} |`);
const listEnd = (reason) => rows.flatMap(r => r.crystals.filter(c => !c.dissolved && c.g >= MM && endOf(c) === reason)
  .map(c => `${r.name}/${c.m} ${(c.g / MM).toFixed(1)} mm (step ${c.endStep})`));
J.end.cellOnlyGe1mm = listEnd('undersaturated at its cell only');
J.end.sizeCapGe1mm = listEnd('size cap');
say(`  >= 1 mm and undersaturated at its cell only: ${J.end.cellOnlyGe1mm.join('; ') || 'none'}`);
say(`  >= 1 mm and stopped by the authored size cap: ${J.end.sizeCapGe1mm.join('; ') || 'none'}`);
const flowMoved = rows.filter(r => r.flow && (r.flow.min !== r.flow.max));
J.end.flowAuthored = flowMoved.map(r => `${r.name} ${r.flow.start}→${r.flow.end} (range ${r.flow.min}–${r.flow.max})`);
say(`  scenarios whose flow_rate changed during the run: ${flowMoved.length} of ${rows.length}`);

// SUPPLY
say('\nSUPPLY');
const shares = [];
let zp = 0, zr = 0, zc = 0, zs = 0, zskip = 0;
const limAll = {}, skipAll = {};
for (const r of rows) {
  zp += r.zones.pos; zr += r.zones.rationed; zc += r.zones.capped; zs += r.zones.shaped;
  for (const [k, v] of Object.entries(r.zones.limBy)) limAll[`${r.name}/${k}`] = v;
  for (const [k, v] of Object.entries(r.skips)) { zskip += v; skipAll[`${r.name}/${k}`] = v; }
  for (const [sp, sol] of Object.entries(r.solids)) {
    const f = r.fields[sp];
    if (!(sol > 0) || !f || !(f.voxSumMax > 0)) continue;
    // What the surviving solids hold, as a fraction of the most the voxel field held at the end of
    // any one step. Above 1 the field was refilled (events, dissolution) and the solids kept more
    // than it ever held at once.
    shares.push({ s: r.name, sp, share: sol / f.voxSumMax });
  }
}
const sv = shares.map(x => x.share);
const overShare = shares.filter(x => x.share > 0.01).sort((a, b) => b.share - a.share);
J.supply = { pairs: shares.length, median: q(sv, 0.5), p90: q(sv, 0.9), max: sv.length ? Math.max(...sv) : null,
  over1pct: overShare.map(x => `${x.s}/${x.sp} ${pct(x.share, 1)}`), over10pct: overShare.filter(x => x.share > 0.1).length,
  positiveZones: zp, rationed: zr, budgetCapped: zc, shapedBySupply: zs, limitedBy: limAll, rationedToZero: zskip, rationedToZeroBy: skipAll };
say(`(scenario, species) pairs with booked solids: ${shares.length}; solids / the most the voxel field ever held: median ${(J.supply.median * 100).toPrecision(2)} %, 90th percentile ${(J.supply.p90 * 100).toPrecision(2)} %`);
say(`  above 1 % (${overShare.length}; above 10 %: ${J.supply.over10pct}): ${J.supply.over1pct.join('; ') || 'none'}`);
say(`stored positive zones ${zp}; scaled below 1 by competition ${zr}; cut by the formula budget ${zc}; either ${zs} (${pct(zs / Math.max(1, zp), 2)})`);
say(`  limited by: ${Object.entries(limAll).map(([k, v]) => `${k} ×${v}`).join('; ') || 'nothing'}`);
say(`zones rationed to zero (never stored; "edge-of-gate skip" lines): ${zskip}${zskip ? ' — ' + Object.entries(skipAll).map(([k, v]) => `${k} ×${v}`).join('; ') : ''}`);

// TWO FLUIDS
say('\nTWO FLUIDS — fields whose bulk value left the voxel mean by more than 5 % of the field\'s scale');
const hits = [];
for (const r of rows) for (const [f, x] of Object.entries(r.fields)) {
  if (x.scale > 0 && x.maxDiv / x.scale > 0.05 && x.maxDiv > 0.05) hits.push({ s: r.name, f, ...x });
}
hits.sort((a, b) => b.maxDiv / b.scale - a.maxDiv / a.scale);
J.twoFluids = hits.map(h => ({ scenario: h.s, field: h.f, maxDiv: h.maxDiv, share: h.maxDiv / h.scale, step: h.maxDivStep, bulkEnd: h.bulkEnd, voxEnd: h.voxEnd, wallMinEnd: h.wallMinEnd }));
M.push('', '### Two fluids', '', '| scenario | field | largest gap between the bulk handle and the voxel mean | at step | at run end: bulk | voxel mean | wall minimum |', '|---|---|---:|---:|---:|---:|---:|');
for (const h of hits) {
  say(`  ${h.s.padEnd(34)} ${h.f.padEnd(6)} largest gap ${sig(h.maxDiv).padStart(7)} (${pct(h.maxDiv / h.scale)}) at step ${String(h.maxDivStep).padStart(3)}; at run end bulk ${sig(h.bulkEnd)}, voxel mean ${sig(h.voxEnd)}, wall minimum ${sig(h.wallMinEnd)}`);
  M.push(`| ${h.s} | ${h.f} | ${sig(h.maxDiv)} (${pct(h.maxDiv / h.scale)}) | ${h.maxDivStep} | ${sig(h.bulkEnd)} | ${sig(h.voxEnd)} | ${sig(h.wallMinEnd)} |`);
}
if (!hits.length) say('  none');

// COUNT
say('\nCOUNT');
let pairs = 0, single = 0, atCap = 0, want = 0, capS = 0, serS = 0, openS = 0;
for (const r of rows) for (const [m, v] of Object.entries(r.summary)) {
  pairs++;
  if (v.total === 1) single++;
  const cap = MINERAL_SPEC[m]?.max_nucleation_count;
  if (cap != null && v.total >= cap) atCap++;
  const ru = r.rule[m];
  if (ru) { want += ru.want; capS += ru.cap; serS += ru.serial; openS += ru.open; }
}
J.count = { pairs, single, atOrOverCap: atCap, speciesStepsPastSigmaCrit: want, capBinding: capS, oneAtATime: serS, neither: openS,
  nucleationFunctions: STATIC.fns.length, withOneAtATimeGate: SERIAL.size };
say(`(scenario, species) pairs ${pairs}: exactly one crystal ${single} (${pct(single / Math.max(1, pairs))}); crystals born >= max_nucleation_count ${atCap} (${pct(atCap / Math.max(1, pairs))})`);
say(`species-steps with the bulk fluid past sigma_crit, for species with a crystal in that scenario: ${want}; the spec cap was binding on ${capS} (${pct(capS / Math.max(1, want))}); the species had an active crystal and a one-at-a-time gate on ${serS} (${pct(serS / Math.max(1, want))}); neither on ${openS} (${pct(openS / Math.max(1, want))})`);
say(`static: ${STATIC.fns.length} nucleation functions; ${SERIAL.size} carry a one-at-a-time gate on their own species; ${STATIC.fns.filter(f => f.usesCap).length} call _atNucleationCap`);
J.count.rolls = STATIC.rolls;
say(`static: ${STATIC.rolls.total} rng.random() comparisons in the nucleation files; ${STATIC.rolls.literal} against a numeric literal; the rest: ${Object.entries(STATIC.rolls.other).map(([k, v]) => `${k} ×${v}`).join(', ') || 'none'}`);

// BORN
say('\nBORN, NEVER GREW');
let total = 0, never = 0, dust = 0, low = 0;
const ghosts = [];
for (const r of rows) {
  total += r.crystals.length;
  const g = r.crystals.filter(c => c.nPos === 0);
  never += g.length;
  dust += r.crystals.filter(c => c.nPos > 0 && c.g < 10).length;
  low += r.births.filter(b => Number.isFinite(b.sigmaLocal) && Number.isFinite(b.sigmaBulk) && b.sigmaLocal < 0.9 * b.sigmaBulk).length;
  if (g.length) ghosts.push(`${r.name}: ${Object.entries(g.reduce((o, c) => (o[c.m] = (o[c.m] || 0) + 1, o), {})).map(([m, k]) => `${m} ×${k}`).join(', ')}`);
}
J.born = { crystals: total, neverGrew: never, grewButUnder10um: dust, landedBelow90pctOfAdmittingSigma: low, byScenario: ghosts };
say(`crystals ${total}; never stored a positive zone ${never} (${pct(never / Math.max(1, total))}); grew and ended under 10 µm ${dust}; births whose landing-cell sigma was below 0.9× the sigma that admitted them ${low}`);
for (const g of ghosts) say('  ' + g);

// THROUGHPUT
say('\nTHROUGHPUT (order of magnitude; broth ppm at face value) — cavity-volumes of the richest broth held in the surviving solids');
M.push('', '### Throughput (order of magnitude; broth ppm at face value)', '', '| scenario | cavity cm³ | solids cm³ | priced | binding element: cavity-volumes (richest broth ppm; mostly in) | next |', '|---|---:|---:|---:|---|---|');
const thr = [];
for (const r of rows) {
  const waterKg = r.wall.vol_mm3 * 1e-6;
  const need = {}, where = {};
  let vAll = 0, vPriced = 0;
  for (const [m, v] of Object.entries(r.volBy)) {
    vAll += v;
    const p = PHYS[m];
    if (!p) continue;
    vPriced += v;
    const mol = v * 1e-3 * p[0] / formulaMass(p[1]);
    for (const [el, n] of Object.entries(p[1])) {
      if (el === 'O' || el === 'H') continue;
      const f = FIELD_OF(el);
      need[f] = (need[f] || 0) + mol * n;
      (where[f] ||= {})[m] = ((where[f] || {})[m] || 0) + mol * n;
    }
  }
  const per = [];
  for (const [f, mol] of Object.entries(need)) {
    const mm = SPECIES_PROPERTIES[f]?.molarMass, x = r.fields[f];
    if (!(mm > 0) || !x || !(x.bulkMax > 0)) continue;
    const perVolume = x.bulkMax * waterKg / (mm * 1000);      // mg/kg × kg / (g/mol × 1000 mg/g)
    const top = Object.entries(where[f]).sort((a, b) => b[1] - a[1])[0][0];
    per.push({ f, pv: mol / perVolume, ppm: x.bulkMax, top });
  }
  per.sort((a, b) => b.pv - a.pv);
  thr.push({ s: r.name, cav: r.wall.vol_mm3 / 1000, solid: vAll / 1000, priced: vAll > 0 ? vPriced / vAll : 1, per });
}
thr.sort((a, b) => (b.per[0]?.pv ?? -1) - (a.per[0]?.pv ?? -1));
const cellT = (p) => p ? `${p.f} ${sig(p.pv)} (${sig(p.ppm)} ppm; ${p.top})` : '—';
for (const x of thr) {
  say(`  ${x.s.padEnd(36)} cavity ${x.cav.toFixed(1).padStart(7)} cm3  solids ${x.solid.toFixed(3).padStart(9)} cm3 (${pct(x.priced, 0)} priced)  ${cellT(x.per[0]).padEnd(46)} ${cellT(x.per[1])}`);
  M.push(`| ${x.s} | ${x.cav.toFixed(1)} | ${x.solid.toFixed(3)} | ${pct(x.priced, 0)} | ${cellT(x.per[0])} | ${cellT(x.per[1])} |`);
}
const tops = thr.map(x => x.per[0]?.pv).filter(v => Number.isFinite(v));
const over = (t) => tops.filter(v => v > t).length;
J.throughput = { over1: over(1), over10: over(10), over100: over(100), over1000: over(1000), under0_01: tops.filter(v => v < 0.01).length,
  rows: thr.map(x => ({ scenario: x.s, cavity_cm3: x.cav, solids_cm3: x.solid, priced: x.priced, binding: x.per[0] || null, next: x.per[1] || null, elements: x.per })) };
say(`scenarios whose solids hold more of some element than one cavity-volume of their richest broth: ${over(1)} of ${thr.length}; more than 10: ${over(10)}; more than 100: ${over(100)}; more than 1,000: ${over(1000)}; less than a hundredth: ${J.throughput.under0_01}`);

// STATIC
say('\nSTATIC — flow_rate');
const fa = STATIC.flow.assigns, nAssign = Object.values(fa).reduce((a, b) => a + b, 0);
J.flow = { eventFilesAssigning: Object.keys(fa).length, assignments: nAssign, scenarioDataLines: STATIC.flow.dataLines, otherLines: STATIC.flow.reads };
say(`assigned ${nAssign} times in ${Object.keys(fa).length} event files (js/70*.ts), and named on ${STATIC.flow.dataLines} event lines of data/scenarios.json5. Every other non-comment line of js/ that names it:`);
for (const x of STATIC.flow.reads) say(`  js/${x.file}:${x.line}  ${x.text}`);

fs.writeFileSync(path.join(OUT, 'report.txt'), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(J, null, 1) + '\n');
fs.writeFileSync(path.join(OUT, 'report.md'), M.join('\n') + '\n');
console.log('\n' + T.join('\n'));
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/report.{txt,json,md}`);
