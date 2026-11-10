#!/usr/bin/env node
/**
 * tools/sim-side-census.mjs — what ends a crystal's growth, and what decides how many there are
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md).
 *
 * One pass per scenario at one seed. It reads nine things the baselines do not carry:
 *
 *   SPACE     the cavity fill each step (sim.get_vug_fill, recorded to four decimals), the first step
 *             whose recorded fill is >= 0.7 and >= 0.999, and the last step on which any crystal
 *             stored a positive zone.
 *   TIME      for each surviving crystal, whether it stored a positive zone on the FINAL step: a
 *             crystal still growing when the step counter stops owes its size to the run length.
 *   DRAW-     what the engine saw. Growth debits the crystal's own cell and diffusion refills it, so a
 *   DOWN      crystal can be throttled by its own consumption without one zone being rationed or cut.
 *             Read WHEN THE ENGINE RUNS (a wrapper on _computeGraduatedZones, the dry run of every
 *             active crystal against its own cell, js/85b): the crystal's supersaturation on its own
 *             cell (the fluid and temperature swap _runEngineForCrystal makes) against a REFERENCE,
 *             the bulk handle's fluid at that cell's temperature. Every positive zone stored that step
 *             is filed, by its thickness, under the cell's excess (sigma - 1) as a share of the
 *             reference's: at least 0.9, 0.5 to 0.9, or under 0.5; or under "reference at or under
 *             saturation". For the under-0.5 class one more evaluation attributes it: the cell's fluid
 *             with the mineral's INGREDIENT fields (the formula species js/19 debits, each mapped to
 *             its reservoir field) set to the bulk handle's values. If that restores at least 0.9 of
 *             the reference's excess the draw-down is through the ingredients, and the ingredient
 *             lowest against the bulk is named; otherwise the cell differs from the bulk handle in
 *             something else, and ONE FURTHER FIELD is looked for: every numeric field in which the
 *             two fluids differ is set in turn to the bulk's value on top of the ingredients (with
 *             the fields coupled to it: O2 with Eh, the sulfur pools, silica with its reactive
 *             share), and the one that raises sigma the most is named if it restores the 0.9; else
 *             "no one field". Also counted: STARVED crystal-steps, on which an active crystal's
 *             engine proposed nothing with its cell below saturation, the bulk handle at or above it,
 *             and its ingredients enough to restore it; and the same crystal-steps where the
 *             ingredients are not enough, by the one further field that is (or "temperature", when
 *             the bulk handle's own fluid is below saturation at the cell's temperature).
 *   END       for each surviving crystal that was NOT growing on the final step, the state on the first
 *             step it stored no positive zone after its last one, in this order: it took a negative
 *             zone or is marked dissolved (filed apart when the bulk handle read at or above
 *             saturation at that step's dry run); the pocket was full at the end of that step (fill
 *             >= 0.999, closed cavities only); it was enclosed (enclosed_by or currentEnclosureAuthority); it
 *             was inactive; it had reached its authored size cap; else what the dry run of THAT STEP
 *             read (above): rationed to zero; a zone proposed and not stored; at or above saturation
 *             on its cell with nothing proposed; below 1 on its cell and on the bulk handle; below 1
 *             on its cell only and restored by its ingredients (its cell ran short); below 1 on its
 *             cell only and not restored by them. A crystal that resumes clears the record; one that
 *             never stored a positive zone is "never grew". Every such stop, final or not, is also
 *             counted as a PAUSE under the same reason.
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
 *   FLUIDS    minimum over the wall slab), every step, for every numeric fluid field the simulator
 *             diffuses and propagates (sim._fluidFieldNames) and for `concentration`, the one numeric
 *             field it leaves out of both. Events write the bulk handle and _propagateGlobalDelta
 *             carries the change to the voxels; growth debits the crystal's own cell. A field whose
 *             bulk value leaves the voxel mean was written to one fluid only, or is spatially authored
 *             (zone_chemistry), or differs by ring (the vadose override), or was drawn down locally.
 *             The vadose override (js/85c) is followed too: the rings it dries on each step, the bulk
 *             handle's O2 and concentration before and after, and the bulk handle's O2 beside each
 *             ring's voxel-mean O2 at run end. (Each ring keeps a legacy fluid slot beside its voxels,
 *             the override writes that slot as well, and the equator ring's slot is the bulk handle.)
 *   COUNT     per (scenario, species): crystals born against the species' max_nucleation_count; and,
 *             on every step WHEN THE NUCLEATION PASS STARTS (a wrapper on check_nucleation), for every
 *             species with a nucleation function and a registry sigma_crit whose sigma, AS THAT PASS
 *             WILL READ IT, is past sigma_crit, the first of these that applies, in the order the
 *             simulator tests them: the scenario excludes the species, does not license it, has it
 *             outside its authored nucleation window, or lacks its prerequisite event (the four tests
 *             _runNuc makes before the species' function runs, js/85j — called here, not copied); the
 *             spec cap is binding (the count test of _atNucleationCap: exposed crystals >=
 *             max_nucleation_count); the function's own count gate is binding (as many active
 *             crystals, or crystals ever, of its species as it tolerates — a STATIC reading of the
 *             js/8x–91 sources, see staticReadings), noted apart when that gate keeps a side door; or
 *             none of them. The sigma the pass reads is the bulk handle's, except where the scenario
 *             installs the localized-nucleation envelope (js/85b), under which every sigma method
 *             returns the maximum over the boundary cells: the reading puts the simulator's own
 *             envelope up, reads through it and takes it down, and counts the species-steps on which
 *             the envelope and the bulk handle disagree. Also the verdicts of _wallStrangledFor
 *             (js/85b), which refuses a birth the sigma it is handed admits when no wall cell clears
 *             sigma_crit; each refusal is attributed on the wall cell that came nearest to clearing
 *             (its temperature, the mineral's ingredients, or one further field). Minerals with no
 *             `_nuc_<species>` function of their own are listed by the report and are not in this
 *             reading.
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
 * It also prints three STATIC readings of the source: the count gate each nucleation function keeps
 * on its own species (below); what every `rng.random()` comparison in the nucleation files is compared
 * with (a numeric literal, or something else); and every non-comment line that mentions `flow_rate`,
 * split into the event files that assign it and everything else. Each run also records the flow_rate
 * it started with, ended with, and its range.
 *
 * The count gate is read from the text of each `_nuc_<species>` function. A list of the function's own
 * species is recognized in one form, `const X = sim.crystals.filter(c => c.mineral === '<species>' …`,
 * active (the filter names c.active) or of every crystal ever, a list or its `.length`. On it:
 * `!X.length`, `if (X.length) return`, `if (X.length || …` and `if (X.length && !(…` are a gate at 1;
 * `X.length < N` is a gate at N; `X.length >= N` at N; `X.length > N` at N + 1; the smallest wins. A
 * side door is a roll on the same line as a gate at 1 (`!X.length || (… rng.random() < p)`). A function
 * that counts its own species another way is read as having no gate.
 *
 * Controls (CONTROLS below), each evaluated when its scenarios are in the run and printed with the
 * report. A positive control shows the reading can see the thing; a negative one that it does not see
 * it everywhere:
 *   + competition log   the five R9 fahlores (mineral-recipe review R9) each show skip lines.
 *   + supply            epithermal_telluride's gold tellurides are rationed on Au.
 *   + supply share      colorado_plateau's solids hold more than 1 % of the uranium its field held.
 *   + two fluids        radiogenic Pb (js/85-simulator.ts, the uraninite block) stays on the bulk handle.
 *   - two fluids        mvt's Ca does not leave the voxel mean.
 *   + space, end        gem_pegmatite is full early, nothing grows afterwards, and the crystals that
 *                       grew read "pocket full".
 *   - space, end        mvt never reaches fill 0.7, is still growing on its final step, and no crystal
 *                       reads "pocket full".
 *   + time              mvt's largest crystal is still growing on the final step.
 *   - time              no crystal of gem_pegmatite is.
 *   + draw-down         colorado_plateau grows over a quarter of its thickness on cells drawn down
 *                       through their ingredients. (It grows no feldspar or albite: the control does
 *                       not sit on the feldspar pair, whose runaway makes the largest shares.)
 *   - draw-down         tn457_barite_pulses grows nothing that way.
 *   + pause             sunnyside_american_tunnel's crystals pause because their cell ran short, not on
 *                       a cell that reads saturated — which is what a reading taken after the step's
 *                       diffusion reports.
 *   + count             radioactive_pegmatite's galena is past sigma_crit and not licensed.
 *   - count             mvt's galena is licensed, and never reads otherwise.
 *   + count-excluded    great_salt_plains' calcite is past sigma_crit and excluded by the scenario.
 *   + count-window      porphyry's native gold is past sigma_crit and outside its nucleation window.
 *   + count-cap         tormiq_alpine_cleft's titanite is past sigma_crit and at its count cap.
 *   + count-gate        cooling's quartz is past sigma_crit and at its function's own gate, which
 *                       keeps a side door.
 *   + count-envelope    zoned_dripstone_cave's aragonite is past sigma_crit on the envelope the pass
 *                       reads and not on the bulk handle.
 *   - count-envelope    mvt installs no envelope on any pass.
 *   + strangled         _wallStrangledFor refuses radioactive_pegmatite's plumbogummite for want of
 *                       lead in the wall cells.
 *   - strangled         it is called in mvt and refuses nothing.
 *   + enclosed          mvt's enclosed crystals read "enclosed" and name what enclosed them.
 *   + vadose            the override dries schneeberg's equator ring and the bulk handle's O2 rises.
 *   - vadose            it dries no ring in mvt.
 *   + draw-down-other   schneeberg's uranophane is held down through pH, not its ingredients.
 * Five controls sit on today's defects — two fluids (+) and strangled (+) on the radiogenic Pb,
 * space/end (+) and time (−) on gem_pegmatite's plug, count (+) on the galena radioactive_pegmatite
 * does not license. The commit that changes one of those turns its control around, and must say so.
 * NO CONTROL: THROUGHPUT, BORN, the three static readings; within END the classes "undersaturated
 * on its cell and on the bulk handle", "dissolving" (both), "size cap", "at or above saturation on
 * its cell, nothing proposed" and "a zone proposed and not stored"; within COUNT the "prerequisite"
 * test (it is zero in every run) and, of the _wallStrangledFor attribution, every branch but the
 * ingredient one; within DRAW-DOWN, of the one-further-field search, every answer but pH.
 *
 * Integrity: at seed 42 every run is compared with tests-js/baselines/seed42_v<SIM>.json through the
 * per-species summary of tools/gen-js-baseline.mjs (copied, not imported: that file is an evidence
 * producer and runs on import). The wrappers observe only; a run that does not reproduce is reported.
 *
 * PASSIVE instrument: reads, reports, and exits 0 whatever the readings and controls say (it throws
 * on a bad argument or an unknown scenario). Imports only tools/_harness.mjs and node builtins and
 * writes only under .local-evidence/ (default .local-evidence/sim-side-census/seed-<N>/:
 * rows/<scenario>.json, report.txt, report.json, report.md). A row is reused unless --fresh when
 * the input digest matches and the row is of the seed asked for. The digest covers the seed, the
 * runtime formation, dist, data, the harness, the js/ sources the static readings parse, the
 * dependency lock, the seed-42 reference, and the TEXT of the code that produces a row (runScenario,
 * the static readings, summarize) with the constants it reads. So a change to how a row is made
 * re-runs it, and the report half can change without a re-run. The digest does not cover code
 * outside those functions: a modified copy of this file that changes a run from elsewhere must
 * write to a directory of its own. Every report names the sha256 of this file as it ran.
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
const CENSUS_VERSION = 5;
const RUNTIME = Object.freeze({ node: process.version, v8: process.versions.v8, icu: process.versions.icu,
  platform: process.platform, arch: process.arch });
const FULL_FILL = 0.999;
const HIGH_FILL = 0.7;          // _fillDampenerFor (js/85d) starts to bite here
const MM = 1000;                // µm per mm
const DRAW_HALF = 0.5;          // DRAW-DOWN: the cell's excess as a share of the reference's
const DRAW_NEAR = 0.9;
// The method whose return is the dry run of every active crystal's engine (js/85b). The engine's view
// has to be read here: later in the step growth has debited the cell and diffusion has refilled it.
const DRY_RUN_METHOD = '_computeGraduatedZones';
// Fluid fields that move together when one of them is set to another fluid's value: the redox pair
// (js/85 keeps Eh in step with O2), the sulfur pools with their total, silica with its reactive share.
const COUPLED = [['O2', 'Eh'], ['S', 'S_sulfide', 'S_sulfate', 'S_elemental'], ['SiO2', 'reactiveSilicaFraction']];
// The three engines whose rate does not vanish at saturation (tools/rate-at-saturation-census.mjs).
// Named here only so that the report can show how many of the "cell ran short" pauses are theirs.
const RATE_AT_SATURATION = ['galena', 'molybdenite', 'uraninite'];

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

const END_REASONS = ['still growing on the final step', 'pocket full', 'undersaturated on its cell and on the bulk handle',
  'its cell ran short of an ingredient', 'undersaturated on its cell only, not through its ingredients',
  'at or above saturation on its cell, nothing proposed', 'a zone proposed and not stored', 'rationed to zero',
  'enclosed', 'dissolving', 'dissolving while the bulk handle reads at or above saturation', 'inactive', 'size cap',
  'never grew', 'no sigma method', 'no dry run on record', 'unclassified'];
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
  { id: 'supply-share', kind: 'positive', needs: ['colorado_plateau'],
    label: "colorado_plateau's surviving solids hold more than 1 % of the most uranium its voxel field ever held",
    test: (R) => {
      const r = R.colorado_plateau, f = r.fields.U;
      const share = f && f.voxSumMax > 0 ? (r.solids.U || 0) / f.voxSumMax : 0;
      return { pass: share > 0.01, detail: `${(share * 100).toFixed(2)} %` };
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
  { id: 'time', kind: 'positive', needs: ['mvt'],
    label: "mvt's largest surviving crystal reads \"still growing on the final step\"",
    test: (R) => {
      const top = R.mvt.crystals.filter(c => !c.dissolved).sort((a, b) => b.g - a.g)[0];
      return { pass: !!top && endOf(top) === END_REASONS[0], detail: top ? `${top.m} ${(top.g / MM).toFixed(1)} mm: ${endOf(top)}` : 'no crystal' };
    } },
  { id: 'time', kind: 'negative', needs: ['gem_pegmatite'],
    label: 'no crystal of gem_pegmatite reads "still growing on the final step"',
    test: (R) => {
      const n = R.gem_pegmatite.crystals.filter(c => !c.dissolved && endOf(c) === END_REASONS[0]).length;
      return { pass: n === 0, detail: `${n} crystal(s)` };
    } },
  { id: 'draw-down', kind: 'positive', needs: ['colorado_plateau'],
    label: "colorado_plateau stores more than a quarter of its growth on a cell under half the reference's excess, drawn down through its ingredients",
    test: (R) => {
      const r = R.colorado_plateau, d = r.draw, all = d.t + d.unread;
      const through = Object.entries(d.lowBy).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, um]) => `${k} ${(um / MM).toFixed(1)} mm`);
      return { pass: all > 0 && d.halfIng / all > 0.25,
        detail: `${(d.halfIng / Math.max(1e-9, all) * 100).toFixed(1)} % of ${(all / MM).toFixed(1)} mm stored; through ${through.join(', ') || 'nothing'}` };
    } },
  { id: 'draw-down', kind: 'negative', needs: ['tn457_barite_pulses'],
    label: "tn457_barite_pulses stores under 1 % of its growth on a cell under half the reference's excess",
    test: (R) => {
      const d = R.tn457_barite_pulses.draw;
      return { pass: d.t > 0 && d.half / d.t < 0.01, detail: `${(d.half / Math.max(1e-9, d.t) * 100).toFixed(2)} % of ${(d.t / MM).toFixed(1)} mm stored` };
    } },
  { id: 'pause', kind: 'positive', needs: ['sunnyside_american_tunnel'],
    label: "sunnyside_american_tunnel's crystals pause at least 5 times because their cell ran short of an ingredient, and more often than they pause on a cell that reads saturated (a cell read after the step's diffusion has been refilled, and reads saturated)",
    test: (R) => {
      const short = 'its cell ran short of an ingredient', sat = 'at or above saturation on its cell, nothing proposed';
      const sum = (why) => Object.values(R.sunnyside_american_tunnel.pauses).reduce((a, p) => a + (p[why] || 0), 0);
      const by = Object.entries(R.sunnyside_american_tunnel.pauses).map(([m, p]) => [m, p[short] || 0]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      const n = sum(short), k = sum(sat);
      return { pass: n >= 5 && n > k, detail: `${n} pauses on a cell run short${by.length ? ' (' + by.slice(0, 3).map(([m, c]) => `${m} ×${c}`).join(', ') + ')' : ''}; ${k} on a cell that reads saturated` };
    } },
  { id: 'count', kind: 'positive', needs: ['radioactive_pegmatite'],
    label: "radioactive_pegmatite's galena is past sigma_crit on the bulk handle on at least 10 steps, and every one of them reads \"not licensed\"",
    test: (R) => {
      const g = R.radioactive_pegmatite.rule.galena;
      return { pass: !!g && g.unlicensed >= 10 && g.unlicensed === g.want, detail: g ? `${g.want} steps past sigma_crit, ${g.unlicensed} not licensed` : 'never past sigma_crit' };
    } },
  { id: 'count', kind: 'negative', needs: ['mvt'],
    label: "mvt's galena is past sigma_crit on the bulk handle and never reads \"not licensed\"",
    test: (R) => {
      const g = R.mvt.rule.galena;
      return { pass: !!g && g.want > 0 && g.unlicensed === 0, detail: g ? `${g.want} steps past sigma_crit, ${g.unlicensed} not licensed` : 'never past sigma_crit' };
    } },
  { id: 'count-excluded', kind: 'positive', needs: ['great_salt_plains'],
    label: "great_salt_plains' calcite is past sigma_crit on at least 100 steps, and every one of them reads \"excluded by the scenario\"",
    test: (R) => {
      const g = R.great_salt_plains.rule.calcite;
      return { pass: !!g && g.excluded >= 100 && g.excluded === g.want, detail: g ? `${g.want} steps past sigma_crit, ${g.excluded} excluded` : 'never past sigma_crit' };
    } },
  { id: 'count-window', kind: 'positive', needs: ['porphyry'],
    label: "porphyry's native gold is past sigma_crit and reads \"outside its nucleation window\" on at least 30 steps",
    test: (R) => {
      const g = R.porphyry.rule.native_gold;
      return { pass: !!g && g.window >= 30, detail: g ? `${g.want} steps past sigma_crit, ${g.window} outside its window` : 'never past sigma_crit' };
    } },
  { id: 'count-cap', kind: 'positive', needs: ['tormiq_alpine_cleft'],
    label: "tormiq_alpine_cleft's titanite is past sigma_crit and reads \"count cap\" on at least 100 steps",
    test: (R) => {
      const g = R.tormiq_alpine_cleft.rule.titanite;
      return { pass: !!g && g.cap >= 100, detail: g ? `${g.want} steps past sigma_crit, ${g.cap} at the count cap` : 'never past sigma_crit' };
    } },
  { id: 'count-gate', kind: 'positive', needs: ['cooling'],
    label: "cooling's quartz is past sigma_crit and reads \"the function's own count gate\" on at least 50 steps, every one of them on a gate that keeps a side door",
    test: (R) => {
      const g = R.cooling.rule.quartz;
      return { pass: !!g && g.gate >= 50 && g.gateDoor === g.gate, detail: g ? `${g.want} steps past sigma_crit, ${g.gate} at its own gate, ${g.gateDoor} of them with a side door` : 'never past sigma_crit' };
    } },
  { id: 'count-envelope', kind: 'positive', needs: ['zoned_dripstone_cave'],
    label: "zoned_dripstone_cave installs the localized-nucleation envelope on every pass, and on at least 20 steps its aragonite is past sigma_crit on the envelope and not on the bulk handle",
    test: (R) => {
      const r = R.zoned_dripstone_cave, g = r.rule.aragonite;
      return { pass: r.envelopePasses === r.steps && !!g && g.envelopeOnly >= 20,
        detail: `${r.envelopePasses} of ${r.steps} passes under the envelope; aragonite past sigma_crit on the envelope only on ${g ? g.envelopeOnly : 0} steps` };
    } },
  { id: 'count-envelope', kind: 'negative', needs: ['mvt'],
    label: 'mvt installs no localized-nucleation envelope: none of its nucleation passes is read under one',
    test: (R) => ({ pass: R.mvt.envelopePasses === 0, detail: `${R.mvt.envelopePasses} of ${R.mvt.steps} passes under an envelope` }) },
  { id: 'strangled', kind: 'positive', needs: ['radioactive_pegmatite'],
    label: "_wallStrangledFor refuses radioactive_pegmatite's plumbogummite at least 3 times, each for want of an ingredient (the lead that reaches only the bulk handle); FLIPS when that lead reaches the voxels or leaves the bulk handle",
    test: (R) => {
      const o = R.radioactive_pegmatite.strangled.plumbogummite;
      const ing = o ? Object.entries(o.why).filter(([k]) => k.startsWith('ingredient ')).reduce((s, [, n]) => s + n, 0) : 0;
      return { pass: !!o && o.blocked >= 3 && ing === o.blocked, detail: o ? `${o.blocked} of ${o.calls} calls refused; ${Object.entries(o.why).map(([k, n]) => `${k} ×${n}`).join(', ') || 'no cause on record'}` : 'never called' };
    } },
  { id: 'strangled', kind: 'negative', needs: ['mvt'],
    label: '_wallStrangledFor is called at least 100 times in mvt and refuses nothing',
    test: (R) => {
      const calls = Object.values(R.mvt.strangled).reduce((s, o) => s + o.calls, 0), blocked = Object.values(R.mvt.strangled).reduce((s, o) => s + o.blocked, 0);
      return { pass: calls >= 100 && blocked === 0, detail: `${blocked} of ${calls} calls refused` };
    } },
  { id: 'enclosed', kind: 'positive', needs: ['mvt'],
    label: 'at least 20 of mvt\'s surviving crystals read "enclosed", and each names the mineral that enclosed it',
    test: (R) => {
      const e = R.mvt.crystals.filter(c => !c.dissolved && endOf(c) === 'enclosed');
      const named = e.filter(c => c.enclosedBy && c.enclosedBy !== '?').length;
      return { pass: e.length >= 20 && named === e.length, detail: `${e.length} enclosed, ${named} with the encloser named` };
    } },
  { id: 'vadose', kind: 'positive', needs: ['schneeberg'],
    label: "the vadose override dries rings in schneeberg, the equator ring among them, and the bulk handle's O2 rises by at least 0.2 ppm on that step",
    test: (R) => {
      const e = R.schneeberg.vadose.events.find(x => x.equator);
      return { pass: !!e && e.bulkO2[1] - e.bulkO2[0] >= 0.2, detail: e ? `step ${e.step}: ${e.rings} rings from ring ${e.lowest} up; bulk O2 ${e.bulkO2[0].toFixed(2)} → ${e.bulkO2[1].toFixed(2)}` : 'the equator ring never dried' };
    } },
  { id: 'vadose', kind: 'negative', needs: ['mvt'],
    label: 'the vadose override dries no ring in mvt',
    test: (R) => ({ pass: R.mvt.vadose.events.length === 0, detail: `${R.mvt.vadose.events.length} step(s) on which a ring dried` }) },
  { id: 'draw-down-other', kind: 'positive', needs: ['schneeberg'],
    label: "schneeberg stores at least 0.5 mm on a cell under half the reference's excess that its ingredients do not explain, and pH restores at least nine tenths of it",
    test: (R) => {
      const by = R.schneeberg.draw.otherBy, total = Object.values(by).reduce((a, b) => a + b, 0);
      const pH = Object.entries(by).filter(([k]) => k.endsWith(':pH')).reduce((s, [, um]) => s + um, 0);
      return { pass: total >= 500 && pH >= 0.9 * total, detail: `${(total / MM).toFixed(2)} mm not through the ingredients; ${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, um]) => `${k} ${(um / MM).toFixed(2)} mm`).join(', ') || 'none'}` };
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
  // (1) the count gate each nucleation function keeps on its own species (the header gives the forms)
  const nucFiles = all.filter(f => /^(8\d[a-z]?|9[01])-nucleation-.*\.ts$/.test(f));
  const fns = [];
  const least = (cur, n) => (cur == null || n < cur ? n : cur);
  for (const f of nucFiles) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const re = /^function _nuc_([A-Za-z0-9_]+)\(sim\) \{/gm;
    const starts = [];
    let m;
    while ((m = re.exec(src))) starts.push({ name: m[1], idx: m.index });
    for (let i = 0; i < starts.length; i++) {
      const body = src.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
      const code = body.split('\n').filter(t => !/^\s*\/\//.test(t)).join('\n');
      let actN = null, totN = null, sideDoor = false;
      for (const d of code.matchAll(/const (\w+) = sim\.crystals\.filter\(c => c\.mineral === '([A-Za-z0-9_]+)'([^\n]*)/g)) {
        if (d[2] !== starts[i].name) continue;
        const isCount = /\)\.length;/.test(d[3]);
        const V = isCount ? `\\b${d[1]}\\b` : `\\b${d[1]}\\.length\\b`;
        let n = null;
        if (!isCount) {
          if (new RegExp(`!${d[1]}\\.length\\b`).test(code)) n = least(n, 1);
          if (new RegExp(`if \\(${d[1]}\\.length(\\) return|\\s*\\|\\||\\s*&&\\s*!\\()`).test(code)) n = least(n, 1);
          if (new RegExp(`!${d[1]}\\.length\\s*\\|\\|[^\\n]*rng\\.random\\(\\)`).test(code)
            || new RegExp(`if \\(${d[1]}\\.length\\s*&&\\s*!\\([^\\n]*rng\\.random\\(\\)`).test(code)) sideDoor = true;
        }
        for (const t of code.matchAll(new RegExp(`${V}\\s*(<=|<|>=|>)\\s*(\\d+)`, 'g'))) {
          n = least(n, Number(t[2]) + (t[1] === '>' || t[1] === '<=' ? 1 : 0));
        }
        if (n == null) continue;
        if (/c\.active/.test(d[3])) actN = least(actN, n); else totN = least(totN, n);
      }
      fns.push({ name: starts[i].name, file: f, actN, totN, sideDoor, usesCap: code.includes('_atNucleationCap(') });
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
  h.update(`seed ${opts.seed}\0`);
  h.update(ROW_SOURCE).update('\0');
  for (const f of files) {
    h.update(path.relative(ROOT, f).replaceAll('\\', '/')).update('\0');
    h.update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).update('\0');
  }
  return h.digest('hex');
}

// ---- bundle ----
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, MINERAL_SPEC, MINERAL_GATES_REGISTRY, MINERAL_STOICHIOMETRY,
  SPECIES_PROPERTIES, currentEnclosureAuthority, temperatureAtMeshVertex, stoichiometricReservoirSpecies,
  _scenarioSpeciesExclusion, _scenarioPositiveLicenseBlock, _scenarioNucleationWindowBlock,
  _scenarioNucleationPrerequisiteBlock } = await harness.loadSimBundle({
  toolName: 'sim-side-census',
  extraExports: ['MINERAL_SPEC', 'MINERAL_GATES_REGISTRY', 'MINERAL_STOICHIOMETRY', 'SPECIES_PROPERTIES',
    'currentEnclosureAuthority', 'temperatureAtMeshVertex', 'stoichiometricReservoirSpecies',
    '_scenarioSpeciesExclusion', '_scenarioPositiveLicenseBlock', '_scenarioNucleationWindowBlock',
    '_scenarioNucleationPrerequisiteBlock'],
});
const STATIC = staticReadings();
const GATE = Object.fromEntries(STATIC.fns.map(f => [f.name, f]));
const NUC_MINERALS = STATIC.fns.map(f => f.name);
// The code that produces a row, as text: part of the digest, so a row cannot outlive a change to it.
const ROW_SOURCE = [runScenario, staticReadings, codeLines, summarize].map(fn => fn.toString()).join('\n')
  + JSON.stringify({ FULL_FILL, HIGH_FILL, DRAW_HALF, DRAW_NEAR, DRY_RUN_METHOD, COUPLED });
const INPUTS = inputDigest(SIM_VERSION);
const SELF_SHA256 = crypto.createHash('sha256')
  .update(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
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
  // The fields the simulator diffuses and propagates, and `concentration`, which it leaves out of both
  // (js/85-simulator.ts, where _fluidFieldNames is built).
  const F = [...sim._fluidFieldNames, 'concentration'];
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

  // Direct evaluation (js/85b): with the flag set, a sigma method answers for the fluid on the
  // conditions object even while a localized-nucleation envelope is installed. _wallStrangledFor sets
  // the same flag for its scan of the wall cells.
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
  // A mineral's sigma on a given fluid at a given temperature: the swap _runEngineForCrystal makes.
  const sigmaWith = (mineral, fluid, temperature) => {
    const sf = sim.conditions.fluid, stT = sim.conditions.temperature;
    try {
      sim.conditions.fluid = fluid;
      sim.conditions.temperature = temperature;
      return sigmaOf(mineral);
    } finally { sim.conditions.fluid = sf; sim.conditions.temperature = stT; }
  };
  // The crystal's own cell: the fluid and the temperature its engine reads.
  const cellOf = (c) => {
    const chem = sim.wall_state.chemistryAddressForCrystal(c);
    const cell = mesh.cellOf(c, sim.wall_state);
    return {
      fluid: cell?.fluid || sim.conditions.fluid,
      temperature: chem ? temperatureAtMeshVertex(sim, mesh, chem.vertexIndex) : sim.conditions.temperature,
    };
  };
  // The fluid fields the ledger debits for a crystal's formula (js/19): the zone's own formula for a
  // solid solution, else MINERAL_STOICHIOMETRY, each species mapped to its reservoir field.
  const ingredientsFor = (mineral, own, fluid) => {
    const st = (own && typeof own === 'object' && Object.keys(own).length ? own : MINERAL_STOICHIOMETRY[mineral]) || null;
    return st ? [...new Set(Object.keys(st).map(sp => stoichiometricReservoirSpecies(mineral, sp, fluid)))] : [];
  };
  const ingredientsOf = (c, zone, fluid) => ingredientsFor(c.mineral, zone && zone.formula_stoichiometry, fluid);
  // A copy of the cell's fluid with those fields set to the bulk handle's values. The sulfur pools
  // move together with their total, and silica with its reactive fraction.
  const restored = (cellFluid, bulk, keys) => {
    const h = Object.assign(Object.create(Object.getPrototypeOf(cellFluid)), cellFluid);
    const set = new Set(keys);
    if (keys.some(k => k === 'S' || k.startsWith('S_'))) for (const k of ['S', 'S_sulfide', 'S_sulfate', 'S_elemental']) set.add(k);
    if (set.has('SiO2')) set.add('reactiveSilicaFraction');
    for (const k of set) if (typeof bulk[k] === 'number' && typeof h[k] === 'number') h[k] = bulk[k];
    return h;
  };
  const lowestIngredient = (cellFluid, bulk, keys) => {
    let field = null, ratio = Infinity;
    for (const k of keys) {
      const b = Number(bulk[k]), v = Number(cellFluid[k]);
      if (b > 0 && Number.isFinite(v) && v / b < ratio) { ratio = v / b; field = k; }
    }
    return field;
  };
  // Where the ingredients do not explain a cell's sigma: the ONE further numeric field (with the
  // fields coupled to it, COUPLED) whose bulk value, set in the cell on top of the ingredients,
  // raises the mineral's sigma the most. Every numeric field in which the two fluids differ is tried.
  const otherField = (mineral, cellFluid, bulk, temperature, keys) => {
    const base = restored(cellFluid, bulk, keys);
    const tried = new Set();
    let best = null;
    for (const k of Object.keys(bulk)) {
      if (tried.has(k) || typeof bulk[k] !== 'number' || typeof base[k] !== 'number' || base[k] === bulk[k]) continue;
      const group = COUPLED.find(g => g.includes(k)) || [k];
      for (const g of group) tried.add(g);
      const h = Object.assign(Object.create(Object.getPrototypeOf(base)), base);
      for (const g of group) if (typeof bulk[g] === 'number' && typeof h[g] === 'number') h[g] = bulk[g];
      const s = sigmaWith(mineral, h, temperature);
      if (s != null && (!best || s > best.sigma)) best = { field: group[0], sigma: s };
    }
    return best;
  };

  // DRAW-DOWN and END: what each active crystal's engine saw, read when the dry run is taken.
  const dry = new Map();             // crystal -> this step's reading
  let dryRuns = 0;
  const starved = {};                // mineral -> crystal-steps starved on its own cell
  let starvedOther = 0;              // … below 1 on its cell only, and not restored by its ingredients
  const starvedOtherBy = {};         // 'mineral:field' -> those crystal-steps, by what does restore the cell
  const origDryRun = sim[DRY_RUN_METHOD];
  sim[DRY_RUN_METHOD] = function (...args) {
    const logFrom = this.log.length;
    const returned = origDryRun.apply(this, args);
    const out = returned instanceof Map ? returned : new Map();   // crystal_id -> the zone its engine proposed
    dryRuns++;
    dry.clear();
    const rationedToZero = new Set();
    for (let i = logFrom; i < this.log.length; i++) {
      const m = /◌ \S+ #(\d+): edge-of-gate skip/.exec(this.log[i]);
      if (m) rationedToZero.add(Number(m[1]));
    }
    withDirect(() => {
      const bulk = sim.conditions.fluid, bulkT = sim.conditions.temperature;
      const onBulk = new Map();      // mineral -> sigma on the bulk handle
      for (const c of this.crystals) {
        if (!c.active) continue;
        const z = out.get(c.crystal_id);
        const kind = rationedToZero.has(c.crystal_id) ? 'rationed' : z && z.thickness_um > 0 ? 'positive' : 'none';
        if (!onBulk.has(c.mineral)) onBulk.set(c.mineral, sigmaOf(c.mineral));
        const sb = onBulk.get(c.mineral);
        if (sb == null) { dry.set(c, { kind, noSigma: true }); continue; }
        const at = cellOf(c);
        const d = { kind, bulk: sb, cell: sigmaWith(c.mineral, at.fluid, at.temperature),
          ref: at.temperature === bulkT ? sb : sigmaWith(c.mineral, bulk, at.temperature), ing: null, low: null, other: null };
        const drawnDown = kind === 'positive' && d.ref > 1 && d.cell - 1 < DRAW_HALF * (d.ref - 1);
        const cellOnly = kind === 'none' && d.cell < 1 && d.bulk >= 1;
        if (drawnDown || cellOnly) {
          const keys = ingredientsOf(c, z, at.fluid);
          if (keys.length) {
            d.ing = sigmaWith(c.mineral, restored(at.fluid, bulk, keys), at.temperature);
            d.low = lowestIngredient(at.fluid, bulk, keys);
          }
          // What the ingredients have to restore: 0.9 of the reference's excess for a zone that was
          // stored, saturation for a crystal that proposed nothing. Where they do not, one more
          // field is looked for; a bulk fluid that is itself below saturation at the cell's
          // temperature is named first, since no field can restore that.
          const need = drawnDown ? 1 + DRAW_NEAR * (d.ref - 1) : 1;
          if (!(d.ing != null && d.ing >= need)) {
            if (cellOnly && d.ref < 1) d.other = 'temperature';
            else {
              const o = otherField(c.mineral, at.fluid, bulk, at.temperature, keys);
              d.other = o && o.sigma >= need ? o.field : 'no one field';
            }
          }
          if (cellOnly) {
            if (d.ing != null && d.ing >= 1) starved[c.mineral] = (starved[c.mineral] || 0) + 1;
            else {
              starvedOther++;
              starvedOtherBy[`${c.mineral}:${d.other}`] = (starvedOtherBy[`${c.mineral}:${d.other}`] || 0) + 1;
            }
          }
        }
        dry.set(c, d);
      }
    });
    return returned;
  };

  // END: what the crystal's state was on the first step it stored no positive zone
  const track = new Map();           // crystal -> { grewPrev, stop }
  const storedThisStep = (c) => {
    let t = 0;
    for (let i = c.zones.length - 1; i >= 0 && c.zones[i].step === sim.step; i--) if (c.zones[i].thickness_um > 0) t += c.zones[i].thickness_um;
    return t;
  };
  const tookNegativeThisStep = (c) => {
    for (let i = c.zones.length - 1; i >= 0 && c.zones[i].step === sim.step; i--) if (c.zones[i].thickness_um < 0) return true;
    return false;
  };
  const whyStopped = (c) => {
    const d = dry.get(c);
    if (tookNegativeThisStep(c) || c.dissolved) {
      // A crystal that dissolves where the bulk handle reads at or above saturation is not following
      // the chemistry the scenario shows: its cell differs from the bulk handle, or its engine
      // dissolves on a test of its own (an acid, a temperature).
      const bulkOver = !!d && !d.noSigma && d.bulk >= 1;
      return { why: bulkOver ? 'dissolving while the bulk handle reads at or above saturation' : 'dissolving' };
    }
    if (!openSystem && sim.get_vug_fill() >= FULL_FILL) return { why: 'pocket full' };
    if (c.enclosed_by != null || currentEnclosureAuthority(sim, c)) return { why: 'enclosed' };
    if (!c.active) return { why: 'inactive' };
    if (c._size_capped) return { why: 'size cap' };
    if (!d) return { why: 'no dry run on record' };
    if (d.noSigma) return { why: 'no sigma method' };
    if (d.kind === 'rationed') return { why: 'rationed to zero' };
    if (d.kind === 'positive') return { why: 'a zone proposed and not stored' };
    if (d.cell >= 1) return { why: 'at or above saturation on its cell, nothing proposed' };
    if (d.bulk < 1) return { why: 'undersaturated on its cell and on the bulk handle' };
    if (d.ing != null && d.ing >= 1) return { why: 'its cell ran short of an ingredient', low: d.low };
    return { why: 'undersaturated on its cell only, not through its ingredients', other: d.other };
  };
  // DRAW-DOWN: every positive zone stored this step, filed by what its dry run read
  const draw = { t: 0, near: 0, mid: 0, half: 0, halfIng: 0, halfOther: 0, refUnder: 0, unread: 0 };
  const lowBy = {};                  // 'mineral:field' -> µm stored on a cell drawn down through its ingredients
  const otherBy = {};                // 'mineral:field' -> µm stored under half and NOT through the ingredients alone
  const perCrystal = new Map();      // crystal -> { t, half }
  const pauses = {};                 // mineral -> { reason: times a growing crystal stopped for it }
  const endCensus = () => {
    for (const c of sim.crystals) {
      let t = track.get(c);
      if (!t) { t = { grewPrev: false, stop: null }; track.set(c, t); }
      const stored = storedThisStep(c);
      if (stored > 0) { t.grewPrev = true; t.stop = null; }
      else if (t.grewPrev) {
        t.grewPrev = false;
        t.stop = { step: sim.step, ...whyStopped(c) };
        const p = (pauses[c.mineral] ||= {});
        p[t.stop.why] = (p[t.stop.why] || 0) + 1;
      }
      if (!(stored > 0)) continue;
      const pc = perCrystal.get(c) || { t: 0, half: 0 };
      perCrystal.set(c, pc);
      pc.t += stored;
      const d = dry.get(c);
      if (!d || d.noSigma || d.kind !== 'positive') { draw.unread += stored; continue; }
      draw.t += stored;
      if (!(d.ref > 1)) { draw.refUnder += stored; continue; }
      const share = (d.cell - 1) / (d.ref - 1);
      if (share >= DRAW_NEAR) draw.near += stored;
      else if (share >= DRAW_HALF) draw.mid += stored;
      else {
        draw.half += stored;
        pc.half += stored;
        if (d.ing != null && d.ing - 1 >= DRAW_NEAR * (d.ref - 1)) {
          draw.halfIng += stored;
          const k = `${c.mineral}:${d.low || '?'}`;
          lowBy[k] = (lowBy[k] || 0) + stored;
        } else {
          draw.halfOther += stored;
          const k = `${c.mineral}:${d.other || 'no one field'}`;
          otherBy[k] = (otherBy[k] || 0) + stored;
        }
      }
    }
  };

  // COUNT: read when the nucleation pass starts, on the sigma that pass is about to read. That is
  // the bulk handle's, except where the scenario installs the localized-nucleation envelope (js/85b:
  // per-vertex nucleation, or an active thermal field). There, for the length of the pass, every
  // sigma method returns the maximum over the boundary cells, and that maximum is what a nucleation
  // function tests against its threshold. So the reading puts the simulator's own envelope up,
  // reads through it, and takes it down again before the pass runs and puts up its own.
  const rule = {};
  let envelopePasses = 0;
  const ruleCensus = (enveloped) => {
    const exposed = {}, active = {}, ever = {};
    for (const c of sim.crystals) {
      ever[c.mineral] = (ever[c.mineral] || 0) + 1;
      if (c.active) active[c.mineral] = (active[c.mineral] || 0) + 1;
      if (c.dissolved || currentEnclosureAuthority(sim, c)) continue;
      exposed[c.mineral] = (exposed[c.mineral] || 0) + 1;
      if (c.paramorph_origin && c.paramorph_origin !== c.mineral) exposed[c.paramorph_origin] = (exposed[c.paramorph_origin] || 0) + 1;
    }
    const bulkSigma = withDirect(() => NUC_MINERALS.map(m => (typeof MINERAL_GATES_REGISTRY[m]?.sigma_crit === 'number' ? sigmaOf(m) : null)));
    for (let i = 0; i < NUC_MINERALS.length; i++) {
      const m = NUC_MINERALS[i], gate = MINERAL_GATES_REGISTRY[m], onBulk = bulkSigma[i];
      if (onBulk == null) continue;
      const s = enveloped ? sigmaOf(m) : onBulk;
      const past = s > gate.sigma_crit, pastOnBulk = onBulk > gate.sigma_crit;
      if (!past && !pastOnBulk) continue;
      const r = (rule[m] ||= { want: 0, excluded: 0, unlicensed: 0, window: 0, prerequisite: 0, cap: 0, gate: 0, gateDoor: 0, open: 0,
        envelopeOnly: 0, bulkOnly: 0, maxSigma: 0, sigmaCrit: gate.sigma_crit });
      if (!past) { r.bulkOnly++; continue; }        // past on the bulk handle, not on what the pass reads
      if (!pastOnBulk) r.envelopeOnly++;            // past on the envelope only
      r.want++;
      if (s > r.maxSigma) r.maxSigma = s;
      const cap = MINERAL_SPEC[m]?.max_nucleation_count, g = GATE[m];
      const everBinding = g.totN != null && (ever[m] || 0) >= g.totN;
      const activeBinding = g.actN != null && (active[m] || 0) >= g.actN;
      if (_scenarioSpeciesExclusion(sim, m)) r.excluded++;
      else if (_scenarioPositiveLicenseBlock(sim, m)) r.unlicensed++;
      else if (_scenarioNucleationWindowBlock(sim, m)) r.window++;
      else if (_scenarioNucleationPrerequisiteBlock(sim, m)) r.prerequisite++;
      else if (cap != null && (exposed[m] || 0) >= cap) r.cap++;
      else if (activeBinding || everBinding) {
        r.gate++;
        // A gate at one that keeps a side door (a roll on the same line) could still have rolled.
        const door = !everBinding && g.actN === 1 && g.sideDoor;
        if (door) r.gateDoor++;
      } else r.open++;
    }
  };
  let nucleationPasses = 0;
  const origCheckNucleation = sim.check_nucleation;
  sim.check_nucleation = function (...args) {
    nucleationPasses++;
    const peaks = this._localizedNucleationPeaks;
    const flags = [this._localNucleationDirectEvaluation, this._localNucleationEnvelopeEvaluating];
    const takeDown = this._installLocalizedNucleationEnvelope();
    try {
      if (takeDown) envelopePasses++;
      ruleCensus(!!takeDown);
    } finally {
      if (takeDown) {
        takeDown();
        this._localizedNucleationPeaks = peaks;
        [this._localNucleationDirectEvaluation, this._localNucleationEnvelopeEvaluating] = flags;
      }
    }
    return origCheckNucleation.apply(this, args);
  };
  // _wallStrangledFor (js/85b) refuses a birth the sigma it is handed admits when no wall cell clears
  // sigma_crit. The verdict is counted, and each refusal is attributed on the wall cell that came
  // nearest to clearing: the temperature there (the bulk handle's own fluid fails at it), the
  // mineral's ingredients (the lowest named), or one other field.
  const strangleCause = (mineral) => {
    const crit = MINERAL_GATES_REGISTRY[mineral]?.sigma_crit, bulk = sim.conditions.fluid;
    const nWallCells = (sim.wall_state.ring_count | 0) * (sim.wall_state.cells_per_ring | 0);
    let best = null;
    for (let v = 0; v < nWallCells; v++) {
      const fluid = mesh.cells[v]?.fluid;
      if (!fluid) continue;
      const temperature = temperatureAtMeshVertex(sim, mesh, v);
      const s = sigmaWith(mineral, fluid, temperature);
      if (s != null && (!best || s > best.s)) best = { s, fluid, temperature };
    }
    if (!best || typeof crit !== 'number') return 'not read';
    if (!(sigmaWith(mineral, bulk, best.temperature) > crit)) return 'temperature';
    const keys = ingredientsFor(mineral, null, best.fluid);
    if (keys.length && sigmaWith(mineral, restored(best.fluid, bulk, keys), best.temperature) > crit) {
      return `ingredient ${lowestIngredient(best.fluid, bulk, keys) || '?'}`;
    }
    const o = otherField(mineral, best.fluid, bulk, best.temperature, keys);
    return o && o.sigma > crit ? o.field : 'no one field';
  };
  const strangled = {};
  const origStrangled = sim._wallStrangledFor;
  sim._wallStrangledFor = function (mineral) {
    const verdict = origStrangled.call(this, mineral);
    const o = (strangled[mineral] ||= { calls: 0, blocked: 0, why: {} });
    o.calls++;
    if (verdict) {
      o.blocked++;
      const why = withDirect(() => strangleCause(mineral));
      o.why[why] = (o.why[why] || 0) + 1;
    }
    return verdict;
  };
  // The vadose override (js/85c): the rings it dries, and what it does to the bulk handle. Each ring
  // keeps a legacy fluid slot beside its voxels (ring_fluids[r]) and the override writes that slot
  // too; the equator ring's slot IS the bulk handle (ring_fluids[equator] === conditions.fluid).
  const equator = Math.floor(sim.wall_state.ring_count / 2);
  const vadose = [];
  const origVadose = sim._applyVadoseOxidationOverride;
  sim._applyVadoseOxidationOverride = function (...args) {
    const b = this.conditions.fluid, o2 = Number(b.O2), conc = Number(b.concentration);
    const rings = origVadose.apply(this, args);
    if (Array.isArray(rings) && rings.length) {
      vadose.push({ step: this.step, rings: rings.length, lowest: Math.min(...rings), equator: rings.includes(equator),
        bulkO2: [o2, Number(b.O2)], bulkConcentration: [conc, Number(b.concentration)] });
    }
    return rings;
  };

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
  }
  const ms = Date.now() - t0;

  // ---- end of run ----
  const solids = {}, limBy = {}, volBy = {};
  const zones = { pos: 0, neg: 0, zero: 0, rationed: 0, capped: 0, shaped: 0 };
  let lastGrowthStep = 0;
  const byId = new Map(sim.crystals.map(c => [c.crystal_id, c]));
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
    const t = track.get(c), pc = perCrystal.get(c);
    const end = nPos === 0 ? 'never grew' : lastPos === steps ? 'still growing on the final step' : (t && t.stop ? t.stop.why : 'never grew');
    return { m: c.mineral, born: c.nucleation_step, g: c.total_growth_um, v: c._volume_mm3 || 0, nPos, lastPos,
      dissolved: !!c.dissolved, enclosed: c.enclosed_by != null, end, endStep: t && t.stop ? t.stop.step : null,
      endLow: t && t.stop && t.stop.low ? t.stop.low : null,
      endOther: t && t.stop && t.stop.other ? t.stop.other : null,
      enclosedBy: c.enclosed_by != null ? (byId.get(c.enclosed_by)?.mineral ?? '?') : null,
      // the share of this crystal's stored growth put on at a cell under half the reference's excess
      half: pc && pc.t > 0 ? Math.round(pc.half / pc.t * 1e4) / 1e4 : 0 };
  });
  const fields = {};
  for (let k = 0; k < F.length; k++) {
    if (!(st[k].scale > 0)) continue;
    fields[F[k]] = { bulkEnd: Number(sim.conditions.fluid[F[k]]) || 0, voxEnd: sumAll[k] / nVox, voxSumEnd: sumAll[k],
      wallEnd: sumWall[k] / nWall, wallMinEnd: minWall[k], ...st[k] };
  }
  const i70 = fill.findIndex(x => x >= HIGH_FILL), i100 = fill.findIndex(x => x >= FULL_FILL);
  // mean of a field over each ring's voxels, floor ring first
  const ringMeans = (field) => {
    const sum = {}, n = {};
    for (const v of grid.voxels) {
      const r = v.ringIdx;
      sum[r] = (sum[r] || 0) + (Number(v.fluid[field]) || 0);
      n[r] = (n[r] || 0) + 1;
    }
    return Object.keys(sum).map(Number).sort((a, b) => a - b).map(r => Math.round(sum[r] / n[r] * 1e4) / 1e4);
  };
  const row = {
    name, seed, steps, ms, nVox, openSystem,
    wall: { composition: conditions.wall.composition, diam_mm: conditions.wall.vug_diameter_mm, vol_mm3: conditions.wall.cavity_capacity_volume_mm3 },
    events: events.map(e => ({ step: e.step, name: e.name })),
    fill, fillEnd: sim.get_vug_fill(), first70: i70 < 0 ? null : i70 + 1, firstFull: i100 < 0 ? null : i100 + 1, lastGrowthStep, flow,
    fields, solids, zones: { ...zones, limBy }, skips, births, rule, crystals, volBy,
    draw: { ...draw, lowBy, otherBy, dryRuns, starved, starvedOther, starvedOtherBy }, pauses, strangled, nucleationPasses, envelopePasses,
    vadose: { equator, events: vadose, bulkO2End: Number(sim.conditions.fluid.O2), ringO2End: vadose.length ? ringMeans('O2') : null,
      ringConcentrationEnd: vadose.length ? ringMeans('concentration') : null },
    // what the scenario lets nucleate at all: the simulator's own tests, asked of every mineral
    license: {
      licensed: Object.keys(MINERAL_SPEC).filter(m => !_scenarioPositiveLicenseBlock(sim, m)).sort(),
      excluded: Object.keys(MINERAL_SPEC).filter(m => _scenarioSpeciesExclusion(sim, m)).sort(),
      windows: Object.keys(sim.conditions._scenario?.nucleation_windows || {}).sort(),
      prerequisites: Object.keys(sim.conditions._scenario?.nucleation_prerequisites || {}).sort(),
    },
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
    // The digest carries the seed, and the row is asked for its own as well: a directory shared by
    // two seeds (--out) must never hand one seed's row to the other.
    try { const saved = JSON.parse(fs.readFileSync(file, 'utf8')); if (saved.inputs === INPUTS && saved.row.seed === opts.seed) row = saved.row; } catch { row = null; }
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
const J = { census_version: CENSUS_VERSION, sim_version: SIM_VERSION, seed: opts.seed, inputs: INPUTS, tool_sha256: SELF_SHA256, scenarios: names.length };
const T = [];   // text lines
const M = [];   // markdown fragment
const say = (s = '') => T.push(s);

say(`sim-side census v${CENSUS_VERSION} — SIM ${SIM_VERSION}, seed ${opts.seed}, ${names.length} scenario(s); inputs ${INPUTS.slice(0, 12)}; tools/sim-side-census.mjs sha256 ${SELF_SHA256.slice(0, 12)}`);
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
  .map(c => `${r.name}/${c.m} ${(c.g / MM).toFixed(1)} mm (step ${c.endStep}${c.endLow ? ', ' + c.endLow : ''}${c.endOther ? ', restored by ' + c.endOther : ''})`));
J.end.ge1mmLists = {};
for (const [key, reason, label] of [
  ['ranShort', 'its cell ran short of an ingredient', 'its cell ran short of an ingredient'],
  ['cellOnlyOther', 'undersaturated on its cell only, not through its ingredients', 'undersaturated on its cell only, not through its ingredients'],
  ['dissolvingBulkOver', 'dissolving while the bulk handle reads at or above saturation', 'dissolving while the bulk handle reads at or above saturation'],
  ['nothingProposed', 'at or above saturation on its cell, nothing proposed', 'at or above saturation on its cell with nothing proposed'],
  ['notStored', 'a zone proposed and not stored', 'a zone proposed and not stored'],
  ['sizeCap', 'size cap', 'stopped by the authored size cap'],
  ['noSigmaMethod', 'no sigma method', 'with no sigma method'],
]) {
  J.end.ge1mmLists[key] = listEnd(reason);
  say(`  >= 1 mm and ${label}: ${J.end.ge1mmLists[key].join('; ') || 'none'}`);
}
// The `dissolved` flag means no solid left (js/27): the most any flagged crystal still holds.
const flagged = rows.flatMap(r => r.crystals.filter(c => c.dissolved));
J.end.dissolvedFlag = { crystals: flagged.length, largestRemaining_um: flagged.reduce((mx, c) => Math.max(mx, c.g), 0) };
say(`  crystals carrying the dissolved flag: ${flagged.length}; the most any of them still holds: ${J.end.dissolvedFlag.largestRemaining_um.toFixed(3)} µm`);
const pauseAll = {}, shortPauses = {};
for (const r of rows) for (const [m, p] of Object.entries(r.pauses || {})) for (const [why, n] of Object.entries(p)) {
  pauseAll[why] = (pauseAll[why] || 0) + n;
  if (why === 'its cell ran short of an ingredient') shortPauses[`${r.name}/${m}`] = n;
}
const nPauses = Object.values(pauseAll).reduce((a, b) => a + b, 0);
J.end.pauses = { all: nPauses, byReason: pauseAll, ranShortBy: shortPauses };
say(`PAUSES — every time a crystal that grew on one step stored no positive zone on the next (final stops included): ${nPauses}`);
for (const k of END_REASONS) if (pauseAll[k]) say(`  ${k.padEnd(62)} ${String(pauseAll[k]).padStart(6)} (${pct(pauseAll[k] / Math.max(1, nPauses)).padStart(6)})`);
say(`  "its cell ran short of an ingredient", by scenario and mineral: ${Object.entries(shortPauses).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => `${k} ×${n}`).join('; ') || 'none'}`);
{
  const nShort = pauseAll['its cell ran short of an ingredient'] || 0;
  const ofRate = Object.entries(shortPauses).filter(([k]) => RATE_AT_SATURATION.includes(k.split('/')[1])).reduce((s, [, n]) => s + n, 0);
  J.end.pauses.ranShort = { all: nShort, rateAtSaturationEngines: ofRate, others: nShort - ofRate };
  say(`  of those ${nShort}, ${ofRate} belong to ${RATE_AT_SATURATION.join(', ')} (the three engines whose rate does not vanish at saturation) and ${nShort - ofRate} to every other mineral (${pct((nShort - ofRate) / Math.max(1, nPauses))} of all pauses)`);
}
const encBy = {};
for (const r of rows) for (const c of r.crystals) if (!c.dissolved && endOf(c) === 'enclosed') encBy[c.enclosedBy || 'no encloser on record'] = (encBy[c.enclosedBy || 'no encloser on record'] || 0) + 1;
J.end.enclosedBy = encBy;
say(`  enclosed, by the mineral that enclosed them: ${Object.entries(encBy).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([m, n]) => `${m} ×${n}`).join(', ') || 'none'}`);
const flowMoved = rows.filter(r => r.flow && (r.flow.min !== r.flow.max));
J.end.flowAuthored = flowMoved.map(r => `${r.name} ${r.flow.start}→${r.flow.end} (range ${r.flow.min}–${r.flow.max})`);
say(`  scenarios whose flow_rate changed during the run: ${flowMoved.length} of ${rows.length}`);

// DRAW-DOWN
say('\nDRAW-DOWN — every stored positive zone, by thickness, under what its crystal\'s engine read at the dry run: the cell\'s excess (sigma − 1) as a share of the reference\'s (the bulk handle\'s fluid at the cell\'s temperature)');
say('scenario                               stored mm   >= 0.9   0.5–0.9   under 0.5 (through its ingredients / otherwise)   reference at or under saturation   not read   starved crystal-steps   crystals >= 1 mm mostly grown under 0.5');
M.push('', '### Draw-down', '', '| scenario | stored, mm | cell excess ≥ 0.9 of the reference\'s | 0.5–0.9 | under 0.5 | … through its ingredients | … otherwise | reference at or under saturation | starved crystal-steps | crystals ≥ 1 mm mostly grown under 0.5 |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
const drawRows = [];
let bigGrown = 0, bigHalf = 0, starvedAll = 0, starvedOtherAll = 0;
const lowAll = {}, starvedBy = {}, otherAll = {}, starvedOtherByAll = {};
for (const r of rows) {
  const d = r.draw, all = d.t + d.unread;
  const big = r.crystals.filter(c => !c.dissolved && c.g >= MM && c.nPos > 0);
  const mostly = big.filter(c => c.half > 0.5);
  bigGrown += big.length; bigHalf += mostly.length;
  const nStarved = Object.values(d.starved).reduce((a, b) => a + b, 0);
  starvedAll += nStarved; starvedOtherAll += d.starvedOther;
  for (const [k, um] of Object.entries(d.lowBy)) lowAll[`${r.name}/${k}`] = um;
  for (const [k, um] of Object.entries(d.otherBy)) otherAll[`${r.name}/${k}`] = um;
  for (const [k, n] of Object.entries(d.starvedOtherBy)) starvedOtherByAll[`${r.name}/${k}`] = n;
  for (const [m, n] of Object.entries(d.starved)) starvedBy[`${r.name}/${m}`] = n;
  const sh = (x) => (all > 0 ? x / all : 0);
  const mostlyText = mostly.length ? `${mostly.length} of ${big.length}: ` + Object.entries(mostly.reduce((o, c) => (o[c.m] = (o[c.m] || 0) + 1, o), {})).map(([m, n]) => `${m} ×${n}`).join(', ') : `0 of ${big.length}`;
  drawRows.push({ scenario: r.name, stored_mm: all / MM, near: sh(d.near), mid: sh(d.mid), half: sh(d.half), halfIngredients: sh(d.halfIng), halfOtherwise: sh(d.halfOther),
    referenceUnder: sh(d.refUnder), notRead: sh(d.unread), starved: nStarved, starvedOtherwise: d.starvedOther, ge1mm: big.length, ge1mmMostlyHalf: mostly.length, dryRuns: d.dryRuns });
  if (!(all > 0)) continue;
  say(`${r.name.padEnd(38)} ${(all / MM).toFixed(1).padStart(9)} ${pct(sh(d.near)).padStart(8)} ${pct(sh(d.mid)).padStart(9)} ${pct(sh(d.half)).padStart(9)} (${pct(sh(d.halfIng))} / ${pct(sh(d.halfOther))})`.padEnd(108)
    + `${pct(sh(d.refUnder)).padStart(8)} ${pct(sh(d.unread)).padStart(24)} ${String(nStarved).padStart(10)}             ${mostlyText}`);
  M.push(`| ${r.name} | ${(all / MM).toFixed(1)} | ${pct(sh(d.near))} | ${pct(sh(d.mid))} | ${pct(sh(d.half))} | ${pct(sh(d.halfIng))} | ${pct(sh(d.halfOther))} | ${pct(sh(d.refUnder))} | ${nStarved} | ${mostlyText} |`);
}
const grew = drawRows.filter(x => x.stored_mm > 0);
J.draw = { scenariosWithGrowth: grew.length, halfOver10pct: grew.filter(x => x.half > 0.1).length, halfOver50pct: grew.filter(x => x.half > 0.5).length,
  halfUnder1pct: grew.filter(x => x.half < 0.01).length,
  ge1mm: bigGrown, ge1mmMostlyHalf: bigHalf, starvedCrystalSteps: starvedAll, starvedBy, cellOnlyNotThroughIngredients: starvedOtherAll,
  drawnDownThrough_um: lowAll, underHalfNotThroughIngredients_um: otherAll, cellOnlyNotThroughIngredientsBy: starvedOtherByAll, scenarios: drawRows };
say(`scenarios that stored growth: ${grew.length}; stored on a cell under half the reference's excess: more than 10 % of the thickness in ${J.draw.halfOver10pct}, more than half of it in ${J.draw.halfOver50pct}, under 1 % in ${J.draw.halfUnder1pct}`);
say(`surviving crystals >= 1 mm: ${bigGrown}; more than half their growth stored that way: ${bigHalf} (${pct(bigHalf / Math.max(1, bigGrown))})`);
say(`  drawn down through (mm stored): ${Object.entries(lowAll).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, um]) => `${k} ${(um / MM).toFixed(2)}`).join('; ') || 'nothing'}`);
say(`starved crystal-steps (nothing proposed, the cell below saturation, the bulk handle at or above it, the ingredients enough to restore it): ${starvedAll}${starvedAll ? ' — ' + Object.entries(starvedBy).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, n]) => `${k} ×${n}`).join('; ') : ''}`);
say(`  under 0.5 and NOT through the ingredients alone, by the one further field whose bulk value, set in the cell with them, restores it (mm stored): ${Object.entries(otherAll).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, um]) => `${k} ${(um / MM).toFixed(2)}`).join('; ') || 'nothing'}`);
say(`  below saturation on the cell only and NOT restored by the ingredients: ${starvedOtherAll} crystal-steps${starvedOtherAll ? ' — by what does restore it: ' + Object.entries(starvedOtherByAll).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([k, n]) => `${k} ×${n}`).join('; ') : ''}`);
const noDry = rows.filter(r => r.zones.pos > 0 && !(r.draw.dryRuns > 0)).map(r => r.name);
if (noDry.length) say(`  NOT READ — no dry run was observed in: ${noDry.join(', ')}`);
const offDry = rows.filter(r => r.draw.dryRuns > 0 && r.draw.dryRuns !== r.steps).map(r => `${r.name} ${r.draw.dryRuns}/${r.steps}`);
J.draw.dryRunsPerStep = offDry.length ? offDry : (noDry.length ? 'not read everywhere' : 'one in every step of every run');
if (offDry.length) say(`  NOTE — dry runs differ from steps in: ${offDry.join(', ')}`);
else if (!noDry.length) say('  the dry run was read once in every step of every run');

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
    // The same solids in the unit a crystal draws on: one voxel's share of that peak.
    shares.push({ s: r.name, sp, share: sol / f.voxSumMax, voxels: sol / (f.voxSumMax / r.nVox), wallMinEnd: f.wallMinEnd, bulkEnd: f.bulkEnd });
  }
}
const sv = shares.map(x => x.share), vx = shares.map(x => x.voxels);
const overShare = shares.filter(x => x.share > 0.01).sort((a, b) => b.share - a.share);
J.supply = { pairs: shares.length, median: q(sv, 0.5), p90: q(sv, 0.9), max: sv.length ? Math.max(...sv) : null,
  over1pct: overShare.map(x => `${x.s}/${x.sp} ${pct(x.share, 1)}`), over10pct: overShare.filter(x => x.share > 0.1).length,
  inVoxels: { median: q(vx, 0.5), p90: q(vx, 0.9), max: vx.length ? Math.max(...vx) : null, overOne: vx.filter(v => v > 1).length },
  positiveZones: zp, rationed: zr, budgetCapped: zc, shapedBySupply: zs, limitedBy: limAll, rationedToZero: zskip, rationedToZeroBy: skipAll,
  shares: shares.slice().sort((a, b) => b.share - a.share).map(x => ({ scenario: x.s, species: x.sp, share: x.share, voxels: x.voxels, wallMinEnd: x.wallMinEnd, bulkEnd: x.bulkEnd })) };
say(`(scenario, solute) pairs with booked solids: ${shares.length}; solids / the most the voxel field ever held: median ${(J.supply.median * 100).toPrecision(2)} %, 90th percentile ${(J.supply.p90 * 100).toPrecision(2)} %`);
say(`  above 1 % (${overShare.length}; above 10 %: ${J.supply.over10pct}): ${J.supply.over1pct.join('; ') || 'none'}`);
say(`  the same solids in voxels' worth of that peak (the field is ${[...new Set(rows.map(r => r.nVox))].join(' / ')} voxels; a crystal debits one): median ${sig(J.supply.inVoxels.median)}, 90th percentile ${sig(J.supply.inVoxels.p90)}, largest ${sig(J.supply.inVoxels.max)}; more than one voxel's worth in ${J.supply.inVoxels.overOne} of ${shares.length} pairs`);
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
const dried = rows.filter(r => r.vadose && r.vadose.events.length);
J.vadose = dried.map(r => ({ scenario: r.name, equatorRing: r.vadose.equator, events: r.vadose.events, bulkO2End: r.vadose.bulkO2End, ringO2End: r.vadose.ringO2End, ringConcentrationEnd: r.vadose.ringConcentrationEnd }));
say(`the vadose override dried rings in ${dried.length} scenario(s); the equator ring, whose legacy fluid slot is the bulk handle itself, among them in ${dried.filter(r => r.vadose.events.some(e => e.equator)).length}`);
for (const r of dried) {
  for (const e of r.vadose.events.slice(0, 4)) {
    say(`  ${r.name.padEnd(34)} step ${String(e.step).padStart(3)}: ${e.rings} ring(s) from ring ${e.lowest} up${e.equator ? ', the equator ring among them' : ''}; bulk O2 ${sig(e.bulkO2[0])} → ${sig(e.bulkO2[1])}, bulk concentration ${sig(e.bulkConcentration[0])} → ${sig(e.bulkConcentration[1])}`);
  }
  if (r.vadose.events.length > 4) say(`  ${''.padEnd(34)} … and ${r.vadose.events.length - 4} more step(s)`);
  say(`  ${''.padEnd(34)} at run end the bulk handle's O2 is ${r.vadose.bulkO2End.toFixed(3)}; voxel-mean O2 by ring, floor first: ${r.vadose.ringO2End.map(x => x.toFixed(3)).join(' ')}`);
}

// COUNT
say('\nCOUNT');
let pairs = 0, single = 0, atCap = 0;
const RULES = ['excluded', 'unlicensed', 'window', 'prerequisite', 'cap', 'gate', 'open'];
const tot = Object.fromEntries(['want', ...RULES, 'gateDoor', 'envelopeOnly', 'bulkOnly'].map(k => [k, 0]));
const unlicensedBy = {}, windowBy = {}, envelopeOnlyBy = {}, bulkOnlyBy = {};
for (const r of rows) {
  for (const [m, v] of Object.entries(r.summary)) {
    pairs++;
    if (v.total === 1) single++;
    const cap = MINERAL_SPEC[m]?.max_nucleation_count;
    if (cap != null && v.total >= cap) atCap++;
  }
  for (const [m, ru] of Object.entries(r.rule)) {
    for (const k of Object.keys(tot)) tot[k] += ru[k];
    if (ru.unlicensed) unlicensedBy[`${r.name}/${m}`] = ru.unlicensed;
    if (ru.window) windowBy[`${r.name}/${m}`] = ru.window;
    if (ru.envelopeOnly) envelopeOnlyBy[`${r.name}/${m}`] = ru.envelopeOnly;
    if (ru.bulkOnly) bulkOnlyBy[`${r.name}/${m}`] = ru.bulkOnly;
  }
}
const barred = tot.excluded + tot.unlicensed + tot.window + tot.prerequisite, reach = tot.cap + tot.gate + tot.open;
const gates = { atOne: STATIC.fns.filter(f => f.actN === 1).length, atOneWithSideDoor: STATIC.fns.filter(f => f.actN === 1 && f.sideDoor).length,
  atMore: STATIC.fns.filter(f => f.actN != null && f.actN > 1).length, everLimit: STATIC.fns.filter(f => f.totN != null).length,
  none: STATIC.fns.filter(f => f.actN == null && f.totN == null).length };
let stCalls = 0, stBlocked = 0;
const strangledBy = {}, strangledWhy = {};
for (const r of rows) for (const [m, o] of Object.entries(r.strangled || {})) {
  stCalls += o.calls; stBlocked += o.blocked;
  if (o.blocked) strangledBy[`${r.name}/${m}`] = `${o.blocked} of ${o.calls} (${Object.entries(o.why).map(([k, n]) => `${k} ×${n}`).join(', ')})`;
  for (const [k, n] of Object.entries(o.why)) strangledWhy[k] = (strangledWhy[k] || 0) + n;
}
const enveloped = rows.filter(r => r.envelopePasses > 0);
const firm = tot.cap + tot.gate - tot.gateDoor;
const noOwnFunction = Object.keys(MINERAL_SPEC).filter(m => !GATE[m]).sort();
J.count = { pairs, single, atOrOverCap: atCap, speciesStepsPastSigmaCrit: tot.want, ...Object.fromEntries(RULES.map(k => [k, tot[k]])),
  neverReachTheirFunction: barred, reachTheirFunction: reach, gateWithSideDoor: tot.gateDoor, capOrGateWithNoSideDoor: firm,
  unlicensedBy, outsideWindowBy: windowBy,
  envelope: { scenarios: enveloped.map(r => `${r.name} ${r.envelopePasses}/${r.steps}`), pastOnEnvelopeOnly: tot.envelopeOnly, pastOnBulkOnly: tot.bulkOnly,
    envelopeOnlyBy, bulkOnlyBy },
  nucleationFunctions: STATIC.fns.length, ownCountGate: gates, callAtNucleationCap: STATIC.fns.filter(f => f.usesCap).length, noOwnFunction,
  wallStrangled: { calls: stCalls, refused: stBlocked, by: strangledBy, why: strangledWhy } };
J.license = Object.fromEntries(rows.map(r => [r.name, r.license]));
say(`(scenario, mineral) pairs ${pairs}: exactly one crystal ${single} (${pct(single / Math.max(1, pairs))}); crystals born >= max_nucleation_count ${atCap} (${pct(atCap / Math.max(1, pairs))})`);
say(`species-steps past sigma_crit on the sigma the nucleation pass is about to read: ${tot.want}`);
say(`  that sigma is the bulk handle's, except under the localized-nucleation envelope, where it is the maximum over the boundary cells: ${enveloped.length ? enveloped.map(r => `${r.name} (${r.envelopePasses} of ${r.steps} passes)`).join(', ') : 'no scenario in this run installs it'}`);
say(`  past sigma_crit on the envelope and not on the bulk handle (counted above): ${tot.envelopeOnly}${tot.envelopeOnly ? ' — ' + Object.entries(envelopeOnlyBy).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ×${n}`).join('; ') : ''}`);
say(`  past sigma_crit on the bulk handle and not on the envelope (not counted): ${tot.bulkOnly}${tot.bulkOnly ? ' — ' + Object.entries(bulkOnlyBy).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ×${n}`).join('; ') : ''}`);
say(`  never reach the species' function (the four tests of _runNuc): ${barred} (${pct(barred / Math.max(1, tot.want))}) — excluded by the scenario ${tot.excluded}, not licensed ${tot.unlicensed}, outside its nucleation window ${tot.window}, prerequisite event missing ${tot.prerequisite}`);
say(`  reach it: ${reach}; the spec cap was binding on ${tot.cap} (${pct(tot.cap / Math.max(1, reach))}); the function's own count gate on ${tot.gate} (${pct(tot.gate / Math.max(1, reach))}); neither on ${tot.open} (${pct(tot.open / Math.max(1, reach))})`);
say(`  of the ${tot.gate} at the function's own gate, ${tot.gateDoor} are at a gate that keeps a side door and could still have rolled; the cap or a gate with no side door stood on ${firm} (${pct(firm / Math.max(1, reach))} of those that reach the function)`);
say(`  scenarios with authored nucleation windows: ${rows.filter(r => r.license.windows.length).map(r => `${r.name} (${r.license.windows.join(', ')})`).join('; ') || 'none'}; with prerequisites: ${rows.filter(r => r.license.prerequisites.length).map(r => `${r.name} (${r.license.prerequisites.join(', ')})`).join('; ') || 'none'}`);
say(`  licensed species per scenario: ${rows.map(r => r.license.licensed.length).sort((a, b) => a - b).join(' ')}`);
say(`_wallStrangledFor refused ${stBlocked} births the sigma it was handed admitted (${stCalls} calls)${stBlocked ? ': ' + Object.entries(strangledBy).map(([k, v]) => `${k} ${v}`).join('; ') : ''}`);
say(`  on the wall cell that came nearest to clearing, what kept it under sigma_crit: ${Object.entries(strangledWhy).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join('; ') || 'no refusal'}`);
say(`minerals of the spec with no _nuc_<name> function of their own (not in this reading): ${noOwnFunction.join(', ') || 'none'}`);
const offPass = rows.filter(r => r.nucleationPasses !== r.steps).map(r => `${r.name} ${r.nucleationPasses}/${r.steps}`);
if (offPass.length) say(`  NOTE — nucleation passes differ from steps in: ${offPass.join(', ')}`);
say(`static: ${STATIC.fns.length} nucleation functions; own count gate at one active crystal ${gates.atOne} (${gates.atOneWithSideDoor} with a side door on the same line), at two or more ${gates.atMore}, a limit on crystals ever ${gates.everLimit}, none recognized ${gates.none}; ${J.count.callAtNucleationCap} call _atNucleationCap`);
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
  thr.push({ s: r.name, cav: r.wall.vol_mm3 / 1000, solid: vAll / 1000, priced: vAll > 0 ? vPriced / vAll : 1, per,
    byMineral: Object.fromEntries(Object.entries(r.volBy).sort((a, b) => b[1] - a[1]).map(([m, v]) => [m, v / 1000])) });
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
  rows: thr.map(x => ({ scenario: x.s, cavity_cm3: x.cav, solids_cm3: x.solid, priced: x.priced, binding: x.per[0] || null, next: x.per[1] || null, elements: x.per, solids_cm3_by_mineral: x.byMineral })) };
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
