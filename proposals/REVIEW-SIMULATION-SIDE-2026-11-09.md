# Simulation-side review: what ends a crystal's growth (2026-11-09)

**Status:** a review and five passive instruments. Nothing under `js/`, `data/` or `tests-js/`
changes, no baseline or receipt moves, and SIM stays 286.
**Base:** `origin/main` `e86ba58a`. `canonical/main` (`915ed33a`) is a merge whose tree is identical
to that of `c2651d4f`, an ancestor of this base, so it holds no change this base lacks.
**Asked by the boss, 2026-11-09:** "take a look at vugg simulator and see if you see any improvements
of the simulation side of things."
**Awaits the boss:** the five decisions in §6. No fix is applied here. Each one is a SIM bump with a
shape to choose, and §4 gives each a measured preview.

Terms used throughout. *σ* is the simulator's supersaturation ratio for a mineral; 1 is saturation.
The *bulk handle* is `conditions.fluid`, the one fluid object that events write and nucleation reads.
The *voxel field* is the 7,680 fluid cells (16 rings × 120 cells × 4 depths) that crystals grow from.
A *zone* is one step's growth layer on one crystal. A crystal is *surviving* when the baseline's own
split does not count it as dissolved, which since `js/27` recomputes the flag on every negative zone
means it has solid left.

## 0. Summary

The summer's reviews examined which minerals may form. This review looked at the other half: once a
crystal is admitted, what makes it grow, and what makes it stop.

Almost nothing in the simulator makes a crystal stop. The fluid does not run short (§2.1), so a
crystal grows until the run ends, the pocket is full, or an event moves the chemistry (§2.2).
Scenarios therefore pile up at two extremes: six pockets end more than 70 % full, packed by whichever
phase carried the largest σ, and 28 of the 41 end less than 10 % full. Three defects sit on or beside
that gap (§3), and each has an A/B.

| | Finding | Measured (seed 42 unless said) | § |
|---|---|---|---|
| S1 | The fluid's supply shapes almost no growth | The surviving crystals hold a median 0.008 % of the most the fluid ever held of each solute, and at most 1.7 %. Of 78,431 stored growth zones, supply cut back 275, and 268 of those are two gold tellurides sharing Au. | 2.1 |
| S2 | Growth ends by the clock, the cavity or an event | 321 of the 568 surviving crystals ≥ 1 mm (56.5 %) are still growing on the final step. 17 of 41 pockets end ≤ 1 % full and 6 end > 70 % full. | 2.2 |
| S3 | `flow_rate` is authored and not read by growth | 103 assignments in 22 event files, 11 event lines of scenario data and a Creative slider; no engine, supply or nucleation code reads it. | 2.5 |
| F1 | The pegmatite pocket plugs | `gem_pegmatite` is full at step 9–10 of 230 at seeds 42, 1 and 2; 7 of its 8 events fire into a full pocket. With feldspar and albite bounded, tourmaline reaches 12 mm and topaz appears. Ten times the boron changes nothing. | 3.1 |
| F2 | Three engines propose growth at saturation | Of 183 engines, 171 propose a rate that vanishes at σ = 1; galena, molybdenite and uraninite propose half their σ = 2 rate. `reactive_wall`'s galena put on 88 % of its 3.9 mm below σ 1.05. | 3.2 |
| F3 | Radiogenic lead reaches only the bulk handle | Bulk Pb climbs 30 → 147 ppm (`radioactive_pegmatite`) and 5 → 179 ppm (`schneeberg`); every voxel stays at 30.00 and 5.00. Latent until F1 is cured. | 3.3 |
| — | Counts are authored; a seed changes little | Known (story-pocket WP7, WP9; PR #45). Re-measured in §2.3 and §2.4 because they have the same cause. | 2.3, 2.4 |

§4 proposes an order: bound the feldspar pair (cures F1), put the three engines on σ − 1 (F2), keep
radiogenic lead in the uraninite and release it on alteration (F3), and pilot a supply that can run
short, fed by the `flow_rate` the events already author (S1–S3).

**Corrections to the first reading.** A first reading was given in conversation on 2026-11-09, before
the instruments existed. Three of its statements are superseded here.

- It said supply had shaped 321 of 78,431 zones, 313 of them gold tellurides. That counted a zone
  twice when it was both rationed and budget-cut. The count is 275, of which 268 are the two gold
  tellurides (§2.1).
- It put 174 of 183 engines on σ − 1, from a reading of the source text. The engine probe reads 171
  whose rate vanishes at saturation, 3 whose rate does not, and 9 it cannot drive (§3.2).
- It recommended factor caps for the feldspar pair. The A/B refused that shape (§4, R1), and the
  recommendation is now a clamp.

## 1. What was run

Runtime: Windows x64, Node 24.15.0, the commissioned formation. The change adds files under `tools/`
and `proposals/` and edits two documents; nothing under `js/`, `data/` or `tests-js/` changes. §8
lists the gates that were run and says what was not.

| Instrument | What it reads | Integrity and controls |
|---|---|---|
| `tools/sim-side-census.mjs` | One pass per scenario: fill per step, what ended each crystal's growth, what the supply shaped, the bulk handle against the voxel field, the count rules, and a physical-unit restatement of what was grown. Three static readings of the source. | At seed 42 all 41 runs reproduce `tests-js/baselines/seed42_v286.json` with the instrument attached. Six controls, four positive and two negative, all passing at seeds 42, 1 and 2. |
| `tools/sim-side-census-mutations.mjs` | Eight broken copies of the census, one line changed in each, run on the scenarios the guarded control needs. | Every control passes on the census as committed and fails on its mutant. |
| `tools/sim-side-ab.mjs` | Shipped arm against an arm with a named intervention applied in-process: a feldspar rind, a σ clamp, factor caps, a per-factor root, a k·(σ−1) rescale, radiogenic Pb to the voxels, or a multiplied broth field. | The shipped arm reproduces the baseline at seed 42. Five neutral knobs (`rind=Infinity`, `cap=Infinity`, `fcap=Infinity`, `root=1`, `mul=Ca:1`) reproduce the shipped arm exactly, on `schneeberg` at seed 42, before every batch. |
| `tools/rate-at-saturation-census.mjs` | Each growth engine called directly with σ forced to 1.0005 … 3 and the rng re-seeded before every call; then, for the engines that propose a rate at saturation, the σ at which they actually grew. | Quartz and fluorite, k·excess laws by inspection, read "vanishes". All 8 scenario runs reproduce the baseline. |
| `tools/seed-variety-census.mjs` | One stratum of the nightly canary (55 seeds). No simulation. | None of its own: it restates the canary's committed per-species spine and, where the machine holds it, the per-seed tier. |

Seeds: the census ran at 42, 1 and 2; the A/Bs at 42, 1 and 2 where said; the canary stratum is
`2026-11-04/v286` (55 seeds, vugg `e86ba58a`).

A control that passes proves little until it has been seen to fail. The mutation tool breaks the
census eight ways: the step log read once instead of every step; the competition receipt ignored;
the voxel mean read from the bulk handle; the gap computed as the bulk value; the fill recorded as 0,
and as 1; the stop never recorded; the pocket-full test removed. Each control fails on its mutant.

Three statements rest on small probes instead, committed beside their outputs in
`proposals/evidence/sim-side-2026-11-09/`: the largest σ each scenario's bulk fluid reaches for
feldspar, albite and quartz (§3.1); the history of a few headline crystals across the 258 committed
baselines (§3.1, §3.4); and whether a wrapped σ method stays in force during nucleation (§7).

## 2. The structural reading

### 2.1 Supply does not bind

Growth debits the fluid through the ledger of `js/19` and `js/18`: 0.00008 mmol of formula per kg of
solvent for every micrometre a crystal advances, whatever the crystal's size. The source says so in
its own disclosure (`STOICHIOMETRIC_GROWTH_BUDGET_DISCLOSURE`: "not physical solid mass or volume;
demand is independent of crystal size, habit, density, and rendered shell volume"). At that price
`mvt`'s 34.6 mm calcite costs its cell 111 ppm of Ca over the whole run, and diffusion from the other
7,679 voxels replaces it: no wall cell ends below 395 ppm of the 400 it started with.

Measured over the fleet, in the ledger's own unit (ppm of one voxel):

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, species) pairs with booked solids | 321 | 320 | 320 |
| What the surviving solids hold ÷ the most the voxel field ever held, median | 0.0081 % | 0.0073 % | 0.0082 % |
| … 90th percentile | 0.14 % | 0.16 % | 0.16 % |
| … largest | 1.7 % | 1.7 % | 1.7 % |
| Stored positive zones | 78,431 | 79,984 | 78,993 |
| … scaled below 1 by graduated competition (`js/44`) | 275 | 208 | 422 |
| … cut by the formula budget (`js/19`) | 46 | 51 | 19 |
| … either (a zone is counted once) | 275 (0.35 %) | 208 (0.26 %) | 422 (0.53 %) |
| Zones rationed to zero (never stored) | 313 | 313 | 313 |

The largest share at every seed is uranium in `colorado_plateau`. Mercury in `sulphur_bank` and
molybdenum in `supergene_oxidation` are the only other pairs above 1 %.

The zones that supply did shape are almost all one case: sylvanite and calaverite sharing 25 ppm of
Au in `epithermal_telluride` (268 / 206 / 414 zones at the three seeds). Even there the scarcity is
local to the crystals' own cells: at seed 42 the scenario's solids booked 0.4 % of the gold the voxel
field held. Outside that pair the supply shaped 7 / 2 / 8 zones in the whole fleet. The zones
rationed to zero are exactly the R9 fahlore defect of the recipe review
(`REVIEW-MINERAL-RECIPES-2026-10-21.md`; 64 / 64 / 60 / 60 / 65 at every seed), which is a booking
error, not scarcity.

So the ledger closes, and it is exact for what it books, but it does not constrain. Whatever stops a
crystal, it is not that the fluid ran out.

### 2.2 What ends growth instead

The census records, for every surviving crystal, the state on the first step it stored no positive
zone after its last one (read at the end of that step; the order of the tests is in the tool's header).

| State on the first step with no positive zone | seed 42: all | ≥ 1 mm | seed 1: all | ≥ 1 mm | seed 2: all | ≥ 1 mm |
|---|---:|---:|---:|---:|---:|---:|
| still growing on the final step | 429 (37.6 %) | 321 (56.5 %) | 430 (39.1 %) | 316 (54.6 %) | 430 (36.0 %) | 321 (56.1 %) |
| pocket full | 30 (2.6 %) | 22 (3.9 %) | 31 (2.8 %) | 22 (3.8 %) | 35 (2.9 %) | 21 (3.7 %) |
| undersaturated, bulk too | 289 (25.3 %) | 138 (24.3 %) | 302 (27.4 %) | 150 (25.9 %) | 320 (26.8 %) | 144 (25.2 %) |
| undersaturated at its cell only | 23 (2.0 %) | 7 (1.2 %) | 22 (2.0 %) | 6 (1.0 %) | 19 (1.6 %) | 6 (1.0 %) |
| at or above saturation, no zone stored | 32 (2.8 %) | 8 (1.4 %) | 28 (2.5 %) | 10 (1.7 %) | 27 (2.3 %) | 10 (1.7 %) |
| enclosed | 213 (18.7 %) | 8 (1.4 %) | 154 (14.0 %) | 8 (1.4 %) | 232 (19.4 %) | 7 (1.2 %) |
| dissolving | 61 (5.3 %) | 41 (7.2 %) | 62 (5.6 %) | 42 (7.3 %) | 60 (5.0 %) | 40 (7.0 %) |
| size cap | 17 (1.5 %) | 17 (3.0 %) | 19 (1.7 %) | 19 (3.3 %) | 19 (1.6 %) | 19 (3.3 %) |
| never grew | 42 (3.7 %) | 0 | 47 (4.3 %) | 0 | 46 (3.9 %) | 0 |
| no σ method | 6 (0.5 %) | 6 (1.1 %) | 6 (0.5 %) | 6 (1.0 %) | 6 (0.5 %) | 4 (0.7 %) |
| all surviving crystals | 1,142 | 568 | 1,101 | 579 | 1,194 | 572 |

Three things end growth.

**The clock.** More than half of the surviving crystals of 1 mm or more stored a positive zone on the
last step of the run. The largest crystal of the scenario is still growing on the final step in
26 / 25 / 27 of the 40 scenarios with crystals. For those crystals the size in the baseline is the rate
multiplied by the number of steps the scenario was given.

**The cavity.** At all three seeds the pocket ends ≤ 1 % full in 17 scenarios, 1–10 % in 11, 10–70 %
in 7 and > 70 % in 6. Three reach fill ≥ 0.999: `gem_pegmatite` at step 9–10 of 230,
`radioactive_pegmatite` at step 55–61 of 120, and `searles_lake` at step 134–188 of 300 (an evaporite
that re-dissolves and refills; it ends 88–91 % full). The other three above 70 % at seed 42 are
`bisbee` (96 %), `shigar_pegmatite` (92 %) and `sunnyside_american_tunnel` (85 %), where the fill
dampener of `js/85d` (it starts at fill 0.7) is slowing growth and has not yet stopped it.

**An event.** "Undersaturated, bulk too" is a crystal whose σ fell below 1 on the bulk handle as well
as on its own cell: an event, a movement or cooling moved the chemistry. "Dissolving" is the same
thing carried further. That is the authored paragenesis working as designed.

"Undersaturated at its cell only" is the one state that would mean a crystal exhausted its own
supply. It holds 7 / 6 / 6 crystals ≥ 1 mm. Six of them, at every seed, are arsenates of
`supergene_oxidation` (one mimetite, five scorodite) that stop together at step 160, the step on
which that scenario's Eh gap between the bulk handle and the voxels is largest (§3.3). The seventh,
at seed 42 only, is a 1.8 mm anhydrite in `reactivated_fluorite_vein`. The census does not separate a
cell that ran out of a solute from a cell that differs from the bulk in Eh or temperature, so the
class is an upper bound on exhaustion: about 1 % of the crystals ≥ 1 mm. The mechanism exists. The
comment above `_wallStrangledFor` in `js/85b` describes strangulation, "where consumption outpaces
the diffusive supply", as what its arc was built for. At the ledger's price it is rare.

The smaller classes are authored too. "Size cap" is the audited dimensional cap of `js/85`: the three
tellurides of `epithermal_telluride`, powellite and conichalcite in `supergene_oxidation`,
haidingerite in `wittichen`. "At or above saturation, no zone stored" is an engine's own threshold
or window above σ = 1. "No σ method" is the pararealgar of `sulphur_bank`, a transformation product.

### 2.3 Count is authored

This is known (the story-pocket proposal of PR #26, WP7) and is re-measured here because it has the
same cause. A
nucleation function admits a crystal when the bulk σ passes a threshold, subject to a fixed per-step
probability, the species' `max_nucleation_count`, and for 81 of the 169 functions a one-at-a-time gate
(`!existing.length`: no new crystal while one is active). No function computes its probability from
σ: of the 489 `rng.random()` comparisons in the nucleation files, 487 are against a numeric literal
and two against one named constant. Where σ enters past the threshold it switches between literals,
as quartz's second-crystal door does at σ > 2.

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, species) pairs | 351 | 350 | 348 |
| … with exactly one crystal | 119 (33.9 %) | 118 (33.7 %) | 114 (32.8 %) |
| … with at least `max_nucleation_count` crystals born | 172 (49.0 %) | 177 (50.6 %) | 182 (52.3 %) |
| Species-steps with the bulk fluid past σ_crit, for species with a crystal in that scenario | 33,195 | 32,981 | 32,865 |
| … the count cap was binding | 43.2 % | 43.6 % | 42.8 % |
| … the species had an active crystal and a one-at-a-time gate | 40.3 % | 39.8 % | 40.3 % |
| … neither | 16.6 % | 16.7 % | 16.9 % |

On five of every six species-steps with the bulk fluid past σ_crit, one of the two authored rules
stood in the way.

With no supply to exhaust, nothing but these authored rules can end a nucleation burst, so they have
to exist. A σ-dependent nucleation rate (story-pocket WP7's "count lever") needs §4's R4 first.

### 2.4 A seed changes little

Also known (the story-pocket proposal, §2.5 and WP9, at 21 seeds; PR #45). The canary's 55 seeds
agree:

| Reading (canary stratum `2026-11-04/v286`, 55 seeds) | Value |
|---|---:|
| Scenarios that grow one and the same species set in every seed | 30 of 41 |
| (scenario, species) pairs present in every seed | 334 of 356 (94 %) |
| … of those, with the same crystal count in every seed | 174 (52 %) |
| Scenarios whose largest crystal is the same species in every seed | 31 of 40 |

A seed moves where crystals sit and which few probability rolls pass. It does not move the fluid, the
events or the cavity, and §2.1–2.2 show those are what decide the outcome.

### 2.5 The input that growth does not read

`conditions.flow_rate` is assigned 103 times in 22 event files and named on 11 event lines of
`data/scenarios.json5`. The player has a Flow slider in Creative mode and several actions that set it
(seep, flood, drain and evaporate among them). `gem_pegmatite`'s events walk it down from 1.0 to 0.1
as the pocket seals; `ouro_preto`'s end at 0.05. It changes during the run in 34 of 41 scenarios.

The census lists every other non-comment line of `js/` that names it (32 lines; Appendix A). Outside
its declaration, the event and movement machinery, the save and command formats and the UI, it is
read in two places: the pH-boundary exchange rate (`js/85d-simulator-step.ts:438`) and the wall's
scallop record (`js/85d-simulator-step.ts:263`), which the renderer uses. One more line decays it by
a tenth a step while it is above 1.0 (`:443`). No engine, no supply code and no nucleation function
reads it.

The authors have been writing the throughput story for the life of the project. The growth model has
no place to put it.

### 2.6 The same thing in physical units

This is an order-of-magnitude restatement, not an error count. The simulator does not claim physical
mass conservation, and several broths are deliberate abstractions (the rung-5 banner in `BACKLOG.md`
records Searles at 1,500 ppm Na for a brine of about 110,000).

For each scenario the census takes the booked volume of the surviving crystals, a handbook density
and an explicit composition, and asks how many cavity-volumes of the scenario's own richest broth
(ppm read as mg/kg, water at 1 g/cm³) would hold that much of each element. A closed pocket can
deliver one.

| Cavity-volumes of the richest broth held in the surviving solids, binding element | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| more than 1 | 30 | 30 | 30 |
| more than 10 | 28 | 28 | 27 |
| more than 100 | 23 | 23 | 23 |
| more than 1,000 | 17 | 17 | 16 |
| less than 0.01 | 6 | 4 | 5 |

Of 41 scenarios; one (`marble_contact_metamorphism`) grows nothing. A few rows at seed 42:

| scenario | cavity, cm³ | solids, cm³ | binding element (richest broth; mostly in) | cavity-volumes |
|---|---:|---:|---|---:|
| sulphur_bank | 33.0 | 10.3 | Hg (15 ppm; metacinnabar) | 30,400 |
| radioactive_pegmatite | 62.1 | 62.1 | Al (30 ppm; feldspar) | 8,500 |
| epithermal_telluride | 28.4 | 2.7 | Ag (90 ppm; hessite) | 4,500 |
| gem_pegmatite | 69.3 | 69.3 | K (80 ppm; feldspar) | 4,400 |
| bisbee | 66.4 | 63.4 | Cu (770 ppm; malachite) | 2,400 |
| shigar_pegmatite | 6,030 | 5,576 | K (80 ppm; feldspar) | 1,900 |
| mvt | 68.2 | 5.9 | CO3 (250 ppm; calcite) | 520 |
| naica_geothermal | 63.0 | 0.013 | Sr (6 ppm; celestine) | 35 |
| great_salt_plains | 306 | 17.5 | Ca (1,800 ppm; selenite) | 17 |
| wittichen | 3,162 | 0.16 | Co (35 ppm; erythrite) | 0.6 |

The full table is in Appendix A. The spread is the point: with no throughput in the model, the
throughput the crystals imply runs from under a hundredth of a cavity-volume to more than a thousand.
A sealed pegmatite pocket holds thousands of pocket-volumes of its potassium and aluminium. Naica's
selenite, in a cave that was fed for about half a million years, holds under a tenth of one
cavity-volume of its calcium (0.09; its sulfur, with the celestine's, 0.24).

The two units can be put side by side on one mineral pair. The ledger books 0.4 % of
`epithermal_telluride`'s gold into its solids (§2.1). At handbook density its two gold tellurides
alone hold 2,200 cavity-volumes of it.

This is the quantity the reservoir preflight of PR #39 met from the other side. It computed that the
ledger's one reference kilogram per represented MVT cavity is 14,657 kg of solvent per m³ of cavity
(`HANDOFF-MVT-RESERVOIR-REFERENCE-PREFLIGHT-V1.md`; a conditional quotient, it says, not a
measurement), about 14.7 times what that volume of water weighs. It named three ways out, the third
being "if the legacy reference kilogram represents a larger connected reservoir, name and conserve
that reservoir". The census says the crystals of that same cavity hold about 520 cavity-volumes of
its carbonate. Both numbers say the unit that is missing is throughput.

## 3. Findings

### 3.1 F1 — the pegmatite pocket plugs

`gem_pegmatite` (Cruzeiro) runs 230 steps and authors eight events:

    5 Outer Shell | 30 Schorl Arrives | 60 Albitization | 90 Be Saturation | 130 Li Phase |
    160 Late Hydrothermal | 190 Clay Softening | 215 Final Cooling

| | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| First step at fill ≥ 0.999 | 9 | 10 | 10 |
| Last step any crystal stored a positive zone | 9 | 10 | 10 |
| Largest feldspar, mm | 31.7 | 33.4 | 36.8 |
| Largest tourmaline, mm | 0.29 | 0.37 | 0.39 |

At seed 42 feldspar is 67.5 of the pocket's 69.3 cm³ and albite the rest. Seven of the eight events
fire into a pocket that is already solid, and the narration of each plays over a simulation that
stopped at step 9. Across the canary's 55 seeds tourmaline is 0.19 / 0.36 / 0.67 mm (minimum / median /
maximum) and feldspar is never under 30.8 mm. Across all 258 committed baselines that carry the
scenario (v26 to v286) tourmaline has never exceeded 2.4 mm and feldspar has never been under
30.7 mm: the plug is older than every baseline.

**Cause.** `supersaturation_feldspar` and `supersaturation_albite`
(`js/39-supersat-silicate.ts:600`, `:640`) are uncapped products, (K/40)(Al/10)(SiO2/400) and
(Na/35)(Al/10)(SiO2/400), with a decay below 300 °C, an acid term and the activity correction. Of the
41 supersaturation functions in that file, 33 cap their concentration factors with `Math.min`
(ceilings from 1.8 to 12.0: tourmaline 6.8, topaz 4.5, spodumene 4.5, lepidolite 9.1), three read a
silica solubility ratio, and beryl's base term is capped in a shared helper. Four are uncapped
products: feldspar, albite, apophyllite and chrysoprase. On the bulk fluid of the three pegmatites,
which carries 8,000 to 15,000 ppm SiO2, the two products reach 552 to 676 (`gem_pegmatite`,
`shigar_pegmatite`) and 150 to 209 (`radioactive_pegmatite`). In every other scenario they are 35 or
less (`probe-sigma-maxima.txt`). The engine's rate is 3·(σ − 1) µm with ±30 % noise, times the time
scale of 5: about 10 mm in one step. Nothing limits it but the cavity.

**A/B** (`tools/sim-side-ab.mjs`; the interventions are diagnostics):

| Arm (values at seeds 42 / 1 / 2) | Fill at end, % | First step at fill ≥ 0.999 | Last step anything grew | Feldspar, mm | Tourmaline, mm | Topaz, mm | Spodumene, mm | Lepidolite, mm |
|---|---|---|---|---|---|---|---|---|
| shipped | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `rind=5000`: feldspar and albite stop adding thickness at 5 mm | 21.6 / 22.6 / 19.7 | never | 230 | 10.0 / 10.6 / 7.2 | 12.1 / 11.9 / 11.9 | 2.5 | 3.7 / 1.9 / 5.1 | 4.7 / 4.0 / 3.4 |
| `cap=8`: their σ clamped at 8 | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `fcap=2`: each factor of their σ capped at 2 | 27.2 / 27.0 / 25.9 | never | 230 | 14.3 / 14.4 / 14.6 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `root=3`: their σ replaced by its cube root | 38.8 / 38.5 / 37.2 | never | 230 | 21.6 / 21.8 / 21.7 | 12.0 / 12.0 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `mul=B:10`: ten times the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |

Three readings follow.

1. *The gems are short of room, not of chemistry.* With the feldspar pair bounded in any of four
   ways, the pocket ends 20 to 42 % full and grows to step 230. Tourmaline reaches 12 mm and grows
   until step 197; topaz appears (six crystals, 2.5 mm) and grows until step 215, through the Late
   Hydrothermal event that narrates it; spodumene and lepidolite reach 2 to 5 mm. Quartz, held to
   1.7 mm by the plug, becomes the largest crystal at 37 mm. The broth and the events were always
   able to grow tourmaline, topaz, spodumene and lepidolite.
2. *It is not boron.* The story-pocket proposal's WP8(b) names boron starvation as "the hypothesis to
   test first": "if boron never concentrates in the late fluid, the tourmaline is starved". With ten
   times the boron and the shipped feldspar (`mul=B:10`), no species moves at any of the three seeds
   and tourmaline is identical to the third decimal. A residual-concentration term tested on this
   scenario before the plug is cured would read "no effect" for the wrong reason.
3. *Beryl is a separate defect.* No arm grows beryl. That is the Wise review's W1 (the Cr/V fence),
   untouched here.

**The other two pegmatites.**

- `radioactive_pegmatite` is full at step 55 to 61 of 120, before its events at 80 (Oxidizing Fluids)
  and 100 (Final Cooling). Bounding the feldspar pair alone moves the plug to quartz: the pocket ends
  98 % full with a 53 to 55 mm quartz, because quartz's σ climbs to 245 as the fluid cools to 100 °C
  with 15,000 ppm of SiO2 on the bulk handle that nothing draws down. With quartz bounded as well the
  pocket ends 11 to 18 % full, grows to step 120, opal reaches 1.8 mm, and autunite — the scenario's
  one aspirational species — appears at all three seeds.
- `shigar_pegmatite` was cured of the same plug at v241 by enlarging its cavity from 140 to 220 mm
  (`js/15-version.ts`: "the corrected ledger exposed Shigar's 140 mm authored cavity sealing before
  its documented late F-rich topaz pulse"). It ends 92 % full with a 270 mm albite. With the feldspar
  pair bounded it ends 0 % full, and its tourmaline (1.8 mm) and topaz (0.6 mm) do not move: Shigar's
  gems are small for their own reasons. Its aquamarine has been absent since SIM 272 and is absent in
  all 55 canary seeds; no arm here restores it.

### 3.2 F2 — three engines propose growth at saturation

The engine probe forces σ and reads what each engine proposes:

| | engines |
|---|---:|
| Proposed rate vanishes at saturation (under 1 % of the σ = 2 rate at σ = 1.0005) | 171 |
| Proposes a rate at saturation | 3 |
| Not driven by the probe | 9 |

The three are galena, molybdenite and uraninite, each at exactly 50.0 %: their engines return nothing
below σ = 1 and `rate = k·σ` from there on (`js/61-engines-sulfide.ts:410` for galena), where the
other 171 driven engines propose nothing, or next to nothing, at saturation. At σ = 1.0005 galena
proposes 12 µm, which the time scale makes 60 µm in one step. Of the nine not driven, three proposed
the same thickness at every forced σ (calcite, aragonite, dolomite: their kinetics read the driving
force elsewhere), and six proposed nothing at σ = 2 in any context tried (HMC, and the dehydration
products haidingerite, meta-autunite, metatorbernite, metazeunerite and tincalconite).

Where it matters (seed 42; σ read at the crystal's own cell when the engine ran):

| scenario | mineral | largest, mm | σ while it grew (min / median / max) | proposed below σ 1.05 | k·(σ−1) at the same k would propose |
|---|---|---:|---|---:|---:|
| reactive_wall | galena | 3.89 | 1.000 / 1.013 / 1.114 | 88 % | 2 % |
| sunnyside_american_tunnel | galena | 15.45 | 1.000 / 1.028 / 6.578 | 48 % | 36 % |
| reactivated_fluorite_vein | galena | 8.48 | 1.140 / 1.153 / 1.317 | 0 % | 14 % |
| mvt | galena | 11.53 | 1.404 / 1.536 / 1.571 | 0 % | 34 % |
| porphyry | galena | 11.11 | 1.225 / 2.945 / 4.486 | 0 % | 63 % |
| roughten_gill | galena | 14.68 | 2.765 / 2.971 / 7.942 | 0 % | 68 % |
| schneeberg | uraninite | 8.27 | 1.333 / 2.519 / 2.767 | 0 % | 58 % |
| radioactive_pegmatite | uraninite | 6.95 | 3.775 / 3.906 / 4.155 | 0 % | 75 % |
| porphyry | molybdenite | 33.44 | 10.860 / 13.543 / 20.161 | 0 % | 93 % |

A growth rate has to vanish with its driving force: at σ = 1 there is none. `reactive_wall`'s galena
grew 3.9 mm in a fluid that was, at the median, 1.3 % past saturation.

### 3.3 F3 — radiogenic lead reaches only the bulk handle

`js/85-simulator.ts:1276` adds radiogenic Pb to the fluid once per step per active uraninite:

    this.conditions.fluid.Pb += 0.1 * u_size;

The other writes to the bulk handle that this review traced in `run_step` (events, movements, the
open-atmosphere equilibration, wall dissolution, ambient cooling) are each wrapped in
`_snapshotGlobal` and `_propagateGlobalDelta`, which carries the change to the voxels. This one is
not: it follows the growth loop, and the next snapshot is taken after it. The census's
bulk-against-voxel reading finds it:

| Scenario (seeds 42 / 1 / 2) | Bulk Pb at run end, ppm | Voxel-mean Pb, ppm | Lowest wall cell, ppm | Largest gap, ppm (at step) |
|---|---|---|---|---|
| `radioactive_pegmatite` (starts at 30) | 146.8 / 127.7 / 147.2 | 30.00 | 30.00 | 117 (80) / 98 (81) / 117 (94) |
| `schneeberg` (starts at 5) | 179.0 / 221.8 / 217.5 | 5.00 | 5.00 | 174 / 217 / 213 (all at 160) |

The same reading shows two other kinds of gap, and neither is a write outside the pair. One is
authored zone chemistry (`stalactite_demo`'s Ca and CO3, `zoned_dripstone_cave`'s Mg), which is
largest at step 0, before anything has run. The other is oxygen consumed at the crystals' own cells
by the redox bookkeeping of `js/19` and `js/20c`, and the Eh that follows it, in `wittichen`,
`roughten_gill`, `supergene_oxidation` and `schneeberg`: there the lowest wall cell sits below the
voxel mean and the bulk handle above both. Radiogenic Pb is the only gap in which every voxel still
holds its starting value.

The bulk handle is what the broth panel shows and what nucleation gates read, so the scenario looks
lead-rich while no crystal can reach the lead. `_wallStrangledFor` then blocks births that the bulk σ
admits, because no wall cell clears the threshold.

**A/B** (`pb`: the same increment also lands on every voxel):

| Scenario, arm (seeds 42 / 1 / 2) | Bulk Pb, ppm | Voxel-mean Pb, ppm | Species moved against shipped | Lead minerals |
|---|---|---|---|---|
| `radioactive_pegmatite`, shipped | 146.8 / 127.7 / 147.2 | 30.00 | — | plumbogummite ×2–3 at 0.000 mm; no galena |
| … `pb` | 146.7 / 129.3 / 158.7 | equal to bulk | 1 / 0 / 1 | plumbogummite at 0.000 mm; no galena |
| … `cap=8,pb` (pocket open and lead in the voxels) | 185.0 / 173.8 / 167.1 | equal to bulk | 9 / 12 / 10 | plumbogummite ×3 at 0.053 / 0.047 / 0.048 mm, growing to step 120; no galena |
| `schneeberg`, shipped | 179.0 / 221.8 / 217.5 | 5.00 | — | none |
| … `pb` | 178.9 / 221.7 / 217.4 | equal to bulk | 2 / 1 / 0 | none |

So the defect is real and at present latent. In `radioactive_pegmatite` the pocket is already full
when the lead would matter, and the late fluid is oxidizing (+181 mV), above the +100 mV ceiling that
rung 4b put on primary sulfides: galena cannot form there whatever the lead does. The scenario's own
description still promises it ("late-stage galena from radiogenic Pb"; "Final cooling (step 100):
system approaches ambient, galena precipitates from the radiogenic Pb"). The reachable sink is
plumbogummite, which the scenario lists as a deterministic species and which is a zero-size ghost in
all 55 canary seeds. With the pocket open *and* the lead in the voxels (`cap=8,pb`) it grows, to
0.05 mm.

**The science.** Radiogenic lead is not released to the fluid as it forms. It is held in the
uraninite (about 19 wt % PbO in unaltered 2 Ga uraninite at Oklo) and leaves when the uraninite is
altered or heated; where reduced sulfur is present it is fixed as galena (Janeczek & Ewing 1995;
Evins, Jensen & Ewing 2005 — both read at abstract level only). The simulator's continuous release
has the mechanism backwards; the event that should release the lead is the one that attacks the
uraninite.

### 3.4 Two notes

**Naica.** `naica_geothermal`'s selenite is 2.75 / 2.81 / 2.87 mm over the canary's 55 seeds. It was
64 mm through v243 and became 1.4 mm at v244, the release that gave the scenario published Ca and
SO4 concentrations and the shared CaSO4 evaluator. On the bulk handle σ is now 1.33 from the first
step to the last (`probe-sigma-maxima-naica.txt`): a fluid barely past saturation, as the release
note intends. The scenario's own sources supply a rate and a duration: 1.4 ± 0.2 × 10⁻⁵ nm/s at 55 °C
(Van Driessche et al. 2011, verified this session) and about 500,000 years of stable growth
(García-Ruiz et al. 2007, as the scenario cites it). Together those give 0.22 m per face. The
simulator's 320 steps give 2.8 mm, and `js/13-runtime-state.ts` calls a step "~50,000 years". The
chemistry is honest; the scenario has no way to be given time. Naica is the one scenario where a
physical clock can be pinned to a measurement.

**When a star was lost.** The committed baselines date the loss of several headline crystals, which
is a lead for story-pocket WP1: Naica's selenite at v244; Shigar's aquamarine at v272 (38 mm → none);
`amethyst_geode`'s quartz at v243 and v246 (16.7 → 2.7 → 0.85 mm). `gem_pegmatite`'s tourmaline was
never lost: it was never there.

## 4. What I would change, and in what order

Every item is a SIM bump and takes the two-commit pattern (instrument or wiring first, byte-identical;
then the bump). Acceptance is pre-registered here.

### R1 — bound the feldspar pair (cures F1)

Three shapes were previewed on all 13 scenarios that grow feldspar or albite (seed 42; the three
pegmatites also at seeds 1 and 2). All three cure `gem_pegmatite`'s plug with the same gem
assemblage. They differ in what else they move:

| Shape | What it is | Scenarios moved (of 13) | Species lost |
|---|---|---:|---|
| clamp, σ ≤ 8 (`cap=8`) | The product is capped as a whole. Only fluids already past 8 feel it; the saturation boundary and every σ under 8 are untouched. | 7: the three pegmatites, `schneeberg`, `tormiq_alpine_cleft`, `ouro_preto`, `jeffrey_mine` | none |
| factor caps at 2 (`fcap=2`) | Each concentration factor is capped, as the sister silicates' are. Ceiling 8. | 13 | albite and feldspar in `grimsel_alpine_cleft` (6.5 and 5.3 mm shipped) and in `chiastolite_hornfels` (0.7 mm feldspar); `deccan_zeolite`'s feldspar, which never grew |
| per-factor root (`root=3`) | σ → σ^(1/3): the per-ion convention S = (IAP/K)^(1/ν) of the electrolyte crystal-growth literature (Nielsen 1981, read at abstract level), applied to the proxy's three factors. Keeps the saturation boundary. | 13 | none, but `ouro_preto` falls from 28.8 % to 0.3 % full and `bisbee` re-deals 8 species |

A scenario is "moved" when a species' count changes or its largest crystal changes by more than
25 %.

I expected to recommend factor caps, the convention the file already follows. The preview refused:
where one ingredient is scarce and another abundant, the uncapped product clears σ = 1 only because
the abundant factor carries it, and a factor cap takes that away. It deletes both feldspars from the
Grimsel cleft, a 6.5 mm albite and a 5.3 mm K-feldspar. Factor caps move the saturation boundary;
for a mineral already calibrated without them, that is a different mineral.

**Recommendation: the clamp**, and applied to the rate inside `grow_feldspar` and `grow_albite`
(`3·min(σ − 1, E)`; E = 7 is the previewed σ ≤ 8) so that σ itself keeps reporting what the proxy
says. The preview clamps the σ method, which births read as well; a clamp on the rate leaves births
on the unclamped σ, so R1's bump re-measures this table. The clamp has a physical reading: far from
saturation, growth is limited by transport and stops scaling with σ. Its value is still a
calibration constant, and the outcome is sensitive to it (`gem_pegmatite`, seed 42):

| σ ≤ | fill at end | first step at fill ≥ 0.999 | tourmaline, mm | topaz, mm |
|---:|---:|---:|---:|---:|
| 4 | 21 % | — | 12.0 | 2.5 |
| 8 | 42 % | — | 12.0 | 2.5 |
| 12 | 90 % | — | 12.0 | 2.5 |
| 16 | 99 % | — | 9.4 | 0.87 |
| 24 | 100 % | 113 | 6.1 | 0.007 |
| 48 | 100 % | 55 | 2.8 | none |
| shipped (552–672) | 100 % | 9 | 0.29 | none |

A clamp does not make feldspar stop. It slows feldspar enough that this scenario's 230 steps end
before the pocket fills, which is the argument for R4. A fourth shape, enlarging the cavity as v241
did for Shigar, was not previewed: feldspar still adds about 10 mm a step, any cavity fills in time,
and no locality's pocket should be sized to fit its feldspar.

Pre-registered acceptance for R1's bump:

- `gem_pegmatite` at seeds 42, 1 and 2: fill never reaches 0.999; some crystal stores a positive
  zone after step 215; tourmaline ≥ 5 mm; topaz present.
- The census control `space+end` (positive) fails, and the same commit rewrites it as a negative.
- Movers are a subset of the 13 scenarios that grow feldspar or albite; no contracted species lost.
- Shigar is re-run at its sourced 140 mm cavity. If it no longer seals, v241's enlargement is
  reverted in the same commit or a follow-up.

`radioactive_pegmatite` will still plug, on quartz. That is not a reason to cap quartz: its σ is a
solubility ratio, and 245 is what that ratio is in a fluid that cools to 100 °C still holding
15,000 ppm of silica. It is the clearest single case for R4.

### R2 — put the three engines on σ − 1 (cures F2)

Replace `k·σ` by `k'·(σ − 1)` in the three engines. Previewed by rescaling every positive zone of the
three by m·(σ − 1)/σ (seed 42; largest crystal, mm):

| scenario | mineral | shipped | same constant (m = 1) | three times the constant (m = 3) |
|---|---|---:|---:|---:|
| reactive_wall | galena | 3.9 | 0.74 | 1.6 |
| reactivated_fluorite_vein | galena | 8.5 | 2.0 | 4.9 |
| mvt | galena | 11.5 | 5.0 | 11.8 |
| sunnyside_american_tunnel | galena | 15.4 | 9.3 | 15.4 |
| porphyry | galena | 11.1 | 7.3 | 13.8 |
| roughten_gill | galena | 14.7 | 12.8 | 18.9 |
| schneeberg | uraninite | 8.3 | 5.1 | 11.8 |
| radioactive_pegmatite | uraninite | 6.9 | 5.3 | 13.8 |
| porphyry | molybdenite | 33.4 | 32.1 | 58.2 |

Beyond the mineral itself, one species moves in two of the eight scenarios (argentite in
`sunnyside_american_tunnel`; uranophane in `schneeberg` at m = 3) and none is lost. Raising the
constant is not free: at m = 3 `porphyry`'s molybdenite takes its pocket from 12 % to 48 % full.

`reactive_wall` teaches something. With the same constant its galena keeps 19 % of its size, not the
2 % that §3.2's last column predicts. The bulk fluid there is 12 % past saturation for galena
(median σ 1.119), but the galena's own cell sat at a median 1.004: under k·σ the crystal grew at full
rate at saturation and drew its cell down until nothing was left to draw. Under σ − 1 it slows as it
nears saturation, the cell is drawn down less, and its σ settles at a median 1.094 (`--trace galena`).
That is supply and growth regulating each other, in one of the few places in the fleet where they
can, and the k·σ law was hiding it.

Acceptance: the engine probe reads "vanishes" for all 174 driven engines; movers are a subset of the
eight scenarios above. Trap: retuning each scenario's Pb or S until galena is its old size is tuning
to a seed. Where galena becomes small, the question is whether that pocket's fluid is really that
close to saturation, which is a question for its sources.

### R3 — keep radiogenic lead in the uraninite (cures F3)

Book the lead in the uraninite as it accrues, and return it to the crystal's own cell when a
dissolution zone removes that shell — the path `applyStoichiometricGrowthBudget` already walks for
every booked species. Correct the two sentences of the scenario description. Propagating the bulk
write to the voxels instead is a one-line change that fixes the bookkeeping and keeps the wrong
mechanism; the A/B shows it changes almost nothing today.

Acceptance: the census control `two-fluids` (positive) fails and is rewritten as a negative; bulk Pb
and voxel-mean Pb stay within 1 % of the field's scale of each other in both uraninite scenarios (the
bound the negative control puts on `mvt`'s Ca); `schneeberg` re-deals within the movement the `pb`
arm shows.

### R4 — let supply bind (S1, S2, S3; the larger direction)

Not a fix; a pilot to decide on. Three pieces, each of which exists in part:

1. **A feed.** Each step the voxel field relaxes toward the bulk handle by a fraction set by
   `flow_rate`. A flushed vug stays at its feed composition, as every vug does today. A sealed one
   (`flow_rate` near 0) keeps only what it holds. The events already author the number.
2. **A debit that scales with what is deposited.** A zone's cost becomes the volume it adds times a
   density over a formula mass, against the water its voxel holds, in place of a constant per
   micrometre. The census carries the first 60 densities and compositions; the reservoir work of
   PRs #36–#39 and #42 carries the unit discipline.
3. **A clock.** With a feed in cavity-volumes per step and a rate in metres per second, a step
   acquires a duration. Naica pins it.

What it would buy, if it works: a phase stops when it has taken what its fluid held, without a cap
and without the cavity having to fill; what it did not take is left for the next phase (story-pocket
WP8(b)); a nucleation rate can depend on σ because the burst ends itself (WP7); `flow_rate` and the
sealing events mean something; and quartz in `radioactive_pegmatite` stops when the silica is gone.

What may make it fail: several broths are abstractions that a physical debit would starve, so the
pilot's first output is a list of the scenarios whose broth cannot be read at face value. It moves
every scenario (a flood, in the word of `PROPOSAL-O5-SPLITTING-LADDER-2026-07-10.md`), so it is
piloted on one scenario behind a per-scenario flag, byte-identical elsewhere. `gem_pegmatite` is the natural first: after R1 it has an
open pocket, eight authored flow values and a closed-system story to earn.

Pre-registered acceptance for the pilot: in the piloted scenario the census reads "undersaturated at
its cell only" for the feldspar pair instead of "pocket full" or "still growing"; the fleet outside the
flag is byte-identical; the neutral setting (flow high enough that the feed replaces every debit)
reproduces the unpiloted run.

### R5 — keep the census

Run `tools/sim-side-census.mjs` at each SIM bump, as `baseline-diff` is. It takes about 20 minutes a
seed and answers what the baselines cannot: not what grew, but why it stopped.

## 5. Traps

1. **Do not fix F3 by debiting or re-syncing the bulk handle.** The bulk handle is deliberately not
   debited by growth (`js/85b`, the comment above `_wallStrangledFor`); nucleation reads it as the
   feed. F3 is one write outside the propagate pair, not a reason to merge the two fluids.
2. **A feldspar cap is a calibration constant, not physics.** It removes a runaway; it does not make
   feldspar stop for a reason. R4 does.
3. **Bounding feldspar moves the plug to quartz in `radioactive_pegmatite`** (98 % full, a 53 to
   55 mm quartz).
4. **Test residual concentration (WP8(b)) only after R1.** Before it, the tourmaline cannot respond.
5. **The two positive controls on today's defects flip.** The commit that cures F1 or F3 must
   rewrite the control, or the census will report a regression that is the fix.
6. **Beryl stays absent after R1** (W1). Do not count it against R1.
7. **"Dissolving" in §2.2 is not "dissolved".** A crystal that took a negative zone and kept solid is
   still surviving, and is filed under "dissolving" if it never grew again. The `dissolved` flag
   means no solid is left (`js/27`); at seed 42 all 70 crystals that carry it hold under 1 µm.

## 6. Decisions for the boss

1. **R1's shape:** the clamp (recommended), factor caps, or the per-factor root; and the clamp's
   value, which the outcome is sensitive to (§4, R1).
2. **R2's constant:** keep each k and let galena shrink where its fluid is barely saturated, or
   re-fit k at one reference scenario. And whether the galena of `reactive_wall` and
   `sunnyside_american_tunnel` should then be grown by a sourced change to the fluid or accepted
   small.
3. **R3's mechanism:** book-and-release (recommended) or propagate; and the wording of
   `radioactive_pegmatite`'s description.
4. **R4:** whether to pilot it, and who owns it. It overlaps the reservoir arc of PRs #35–#39 and
   #42, and one finding should have one owner.
5. **Order against the open ladders.** My proposal: R1 before story-pocket WP8(b), because WP8(b)'s
   first test depends on it; R2 beside the recipe ladder's R2 → R9; R3 with R1 (same scenario); R4
   after the boss's ruling on 4.

## 7. Limits

- **Seeds.** The census ran at three seeds; the fleet-wide counts are quoted at 42 and tabulated at
  all three. The canary's 55 seeds are used only where its committed spine carries the reading.
- **The END reading is taken at the end of the step.** The engine ran earlier in that step, before
  that step's cooling and diffusion. A crystal that stopped for a reason gone by the step's end is
  misfiled; the partition is a census, not a per-crystal diagnosis.
- **The one-at-a-time attribution in §2.3 is a static reading of the source.** Some of those 81
  functions keep a probabilistic side door (quartz admits a second crystal at σ > 2 with probability
  0.3), so that share is an upper bound. The cap share and the single-crystal count are exact. Above
  fill 0.7 `_atNucleationCap` also refuses births with a probability set by the fill dampener; the
  census does not attribute a species-step to it.
- **The engine probe calls engines outside `run_step`.** That isolates the engine's own law, which is
  the point, and means it says nothing about what competition, the dampener or the time scale do
  afterwards. §3.2's second table does.
- **The supply share is measured against a peak.** "The most the voxel field ever held" is the
  largest end-of-step sum over all voxels. A fluid that events refill can pass more of a solute
  through than it ever held at once, so a share could exceed 100 %. None exceeds 2 %.
- **Throughput is order-of-magnitude.** Densities are entered by hand; ppm are taken at face value;
  the water is 1 g/cm³ and fills the cavity; the volume is the booked `_volume_mm3`, the fill
  authority, not the renderer's completed solid. Sulfur is read from the total `S` field. A mineral
  without an entry is not priced (the report gives the priced share of each scenario's volume;
  native gold is one such).
- **The interventions are diagnostics, not proposed rules.** `cap`, `fcap` and `root` wrap a σ method
  on the scenario's conditions object. Growth, the nucleation gates and the strangulation test all
  read that method. So does the localized-nucleation envelope of `js/85b`, which captures whatever
  method it finds there when a nucleation pass starts. Four scenarios install that envelope at
  seed 42 (`naica_geothermal`, `stalactite_demo`, `wittichen`, `zoned_dripstone_cave`), and none
  grows a mineral that an arm of this review wraps. In three of them, pass-through wrappers on
  minerals they do grow were called under the envelope 192,000 to 576,000 times and the runs still
  reproduced the baseline (`probe-nucleation-envelope.txt`, `-per-vertex.txt`). `fcap` is exact for
  the product and does not re-derive the functions' subtractive acid term. `excess` and `pb` have
  no neutral setting to self-check against.
- **Not examined:** the carbonate and sulfate solubility kernels, the thermal field, physical
  dissolution, the cavity geometry, the renderer, the agent API.
- **Citations.** The rate and temperature quoted from Van Driessche et al. 2011 were checked
  against the paper's abstract. Janeczek & Ewing 1995, Evins et al. 2005 and Nielsen 1981 were read
  at abstract level through search results, not in full. García-Ruiz et al. 2007 is cited as the
  scenario cites it.

## 8. Reproduce

Windows x64, Node 24.15.0, from the repository root, after `npm ci` and `npm run build`. The heavy
runs are independent and can run side by side.

```text
node tools/sim-side-census.mjs                       # seed 42, about 20 min; report in .local-evidence/sim-side-census/seed-42/
node tools/sim-side-census.mjs --seed 1
node tools/sim-side-census.mjs --seed 2
node tools/sim-side-census-mutations.mjs             # about 10 min
node tools/rate-at-saturation-census.mjs             # a few minutes
node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/2026-11-04/v286

node tools/sim-side-ab.mjs --arm rind=5000 --arm cap=8 --seeds 42,1,2 gem_pegmatite radioactive_pegmatite shigar_pegmatite
node tools/sim-side-ab.mjs --arm fcap=2 --arm root=3 --arm mul=B:10 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm cap=8 --arm fcap=2 --arm root=3 bisbee chiastolite_hornfels deccan_zeolite epithermal_telluride gem_pegmatite grimsel_alpine_cleft jeffrey_mine ouro_preto porphyry radioactive_pegmatite schneeberg shigar_pegmatite tormiq_alpine_cleft
node tools/sim-side-ab.mjs --arm cap=8 --minerals feldspar,albite,quartz --seeds 42,1,2 radioactive_pegmatite gem_pegmatite
node tools/sim-side-ab.mjs --arm pb --arm cap=8,pb --seeds 42,1,2 radioactive_pegmatite schneeberg
node tools/sim-side-ab.mjs --arm excess=1 --arm excess=3 --minerals galena,molybdenite,uraninite mvt porphyry radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill schneeberg sunnyside_american_tunnel
node tools/sim-side-ab.mjs --arm cap=4 --arm cap=8 --arm cap=12 --arm cap=16 --arm cap=24 --arm cap=48 gem_pegmatite
node tools/sim-side-ab.mjs --arm excess=1 --minerals galena --trace galena reactive_wall

node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs
node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs --minerals selenite,celestine naica_geothermal
node proposals/evidence/sim-side-2026-11-09/probe-baseline-history.mjs <vugg-canary>/logs/2026-11-04/v286
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs --minerals selenite,celestine,calcite,aragonite,anhydrite naica_geothermal stalactite_demo zoned_dripstone_cave

npm run audit:runtime
npm run typecheck
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
```

The five tools write only under `.local-evidence/`, the directory the test identity guard excludes,
and exit 0 whatever they find. The three probes print and write nothing. The outputs quoted in this
document are committed in `proposals/evidence/sim-side-2026-11-09/`.

The six gates pass on this tree. **Not run: the full suite** (`npm run ci`, about 2.5 hours cold).
The repository's chip selector (`tools/test-chip-check.mjs`) has none of this change's paths in its
authored map, so it offers no bounded test set for it; its own answer for such a change is a full
check. No file the suite reads is changed, and no test was added.

## References

- Evins, L.Z., Jensen, K.A., Ewing, R.C. (2005). Uraninite recrystallization and Pb loss in the Oklo
  and Bangombé natural fission reactors, Gabon. *Geochimica et Cosmochimica Acta* 69(6). (Abstract.)
- García-Ruiz, J.M., Villasuso, R., Ayora, C., Canals, A., Otálora, F. (2007). Formation of natural
  gypsum megacrystals in Naica, Mexico. *Geology* 35, 327. (As cited by `naica_geothermal`.)
- Janeczek, J., Ewing, R.C. (1995). Mechanisms of lead release from uraninite in the natural fission
  reactors in Gabon. *Geochimica et Cosmochimica Acta* 59(10), 1917–1931. (Abstract.)
- Nielsen, A.E. (1981). Theory of electrolyte crystal growth: the parabolic rate law. *Pure and
  Applied Chemistry* 53(11), 2025. (Search summary.)
- Van Driessche, A.E.S., García-Ruiz, J.M., Tsukamoto, K., Patiño-López, L.D., Satoh, H. (2011).
  Ultraslow growth rates of giant gypsum crystals. *PNAS* 108(38), 15721–15726.

## Appendix A — census tables (generated, seed 42)

Copied from `proposals/evidence/sim-side-2026-11-09/census-seed-42.md` and `census-seed-42.json`
(census v3, SIM 286; 41 of 41 runs reproduce the baseline).

#### Space and time

| scenario | steps | fill at end | first step at fill ≥ 0.7 | ≥ 0.999 | last step any crystal grew | largest crystal | what ended its growth |
|---|---:|---:|---:|---:|---:|---|---|
| amethyst_geode | 240 | 0.0 % | — | — | 213 | quartz 0.85 mm | at or above saturation, no zone stored (step 214) |
| asbestos_hills_crack_seal | 110 | 0.2 % | — | — | 110 | siderite 7.5 mm | dissolving (step 58) |
| asbestos_hills_surficial_alteration | 120 | 0.3 % | — | — | 120 | siderite 7.1 mm | dissolving (step 58) |
| bisbee | 340 | 95.6 % | 204 | — | 340 | malachite 66.0 mm | undersaturated, bulk too (step 265) |
| chiastolite_hornfels | 120 | 0.0 % | — | — | 120 | andalusite 1.2 mm | the run ended |
| colorado_plateau | 180 | 1.1 % | — | — | 180 | uranophane 12.6 mm | the run ended |
| cooling | 100 | 0.0 % | — | — | 100 | quartz 0.57 mm | the run ended |
| deccan_zeolite | 200 | 0.2 % | — | — | 200 | quartz 8.3 mm | undersaturated, bulk too (step 160) |
| elmwood | 200 | 1.1 % | — | — | 200 | calcite 14.3 mm | the run ended |
| epithermal_telluride | 180 | 9.6 % | — | — | 180 | hessite 17.2 mm | size cap (step 69) |
| gem_pegmatite | 230 | 100.0 % | 6 | 9 | 9 | feldspar 31.7 mm | pocket full (step 10) |
| great_salt_plains | 250 | 5.7 % | — | — | 250 | selenite 40.8 mm | the run ended |
| grimsel_alpine_cleft | 200 | 0.1 % | — | — | 200 | calcite 13.0 mm | the run ended |
| jeffrey_mine | 200 | 1.2 % | — | — | 200 | vesuvianite 13.1 mm | the run ended |
| marble_contact_metamorphism | 180 | 0.0 % | — | — | 0 | — | — |
| mvt | 120 | 8.7 % | — | — | 120 | calcite 34.6 mm | the run ended |
| naica_geothermal | 320 | 0.0 % | — | — | 320 | selenite 2.8 mm | the run ended |
| ouro_preto | 260 | 28.8 % | — | — | 260 | albite 39.6 mm | the run ended |
| porphyry | 120 | 11.6 % | — | — | 120 | molybdenite 33.4 mm | dissolving (step 85) |
| pulse | 100 | 0.0 % | — | — | 80 | siderite 0.12 mm | undersaturated, bulk too (step 81) |
| radioactive_pegmatite | 120 | 100.0 % | 37 | 61 | 80 | albite 61.4 mm | pocket full (step 62) |
| reactivated_fluorite_vein | 160 | 22.8 % | — | — | 160 | calcite 38.4 mm | undersaturated, bulk too (step 124) |
| reactive_wall | 120 | 0.1 % | — | — | 120 | sphalerite 6.6 mm | the run ended |
| roughten_gill | 240 | 15.0 % | — | — | 240 | galena 14.7 mm | undersaturated, bulk too (step 60) |
| sabkha_dolomitization | 260 | 2.7 % | — | — | 260 | celestine 10.7 mm | the run ended |
| schneeberg | 160 | 11.1 % | — | — | 160 | feldspar 27.6 mm | the run ended |
| searles_lake | 300 | 87.9 % | 127 | 134 | 300 | thenardite 46.0 mm | pocket full (step 245) |
| shigar_pegmatite | 70 | 92.5 % | 56 | — | 70 | albite 269.8 mm | the run ended |
| sicily_solfifera | 200 | 2.9 % | — | — | 200 | celestine 9.1 mm | the run ended |
| stalactite_demo | 100 | 0.0 % | — | — | 100 | calcite 0.75 mm | the run ended |
| sulphur_bank | 200 | 31.3 % | — | — | 200 | marcasite 39.3 mm | the run ended |
| sunnyside_american_tunnel | 200 | 85.4 % | 196 | — | 200 | calcite 74.4 mm | the run ended |
| supergene_oxidation | 200 | 41.3 % | — | — | 200 | malachite 45.6 mm | the run ended |
| tn457_barite_pulses | 110 | 2.2 % | — | — | 110 | sphalerite 6.0 mm | the run ended |
| tormiq_alpine_cleft | 200 | 7.7 % | — | — | 200 | albite 65.8 mm | the run ended |
| tutorial_first_crystal | 30 | 0.0 % | — | — | 7 | quartz 0.01 mm | dissolving (step 8) |
| tutorial_mn_calcite | 30 | 0.0 % | — | — | 30 | calcite 1.9 mm | the run ended |
| tutorial_travertine | 60 | 0.0 % | — | — | 60 | aragonite 2.5 mm | the run ended |
| ultramafic_supergene | 200 | 1.2 % | — | — | 200 | opal 8.4 mm | the run ended |
| wittichen | 220 | 0.0 % | — | — | 220 | erythrite 8.3 mm | the run ended |
| zoned_dripstone_cave | 150 | 0.0 % | — | — | 150 | aragonite 1.6 mm | the run ended |

#### What ended growth

| state on the first step with no positive zone | surviving crystals | of those ≥ 1 mm |
|---|---:|---:|
| still growing on the final step | 429 (37.6 %) | 321 (56.5 %) |
| pocket full | 30 (2.6 %) | 22 (3.9 %) |
| undersaturated, bulk too | 289 (25.3 %) | 138 (24.3 %) |
| undersaturated at its cell only | 23 (2.0 %) | 7 (1.2 %) |
| at or above saturation, no zone stored | 32 (2.8 %) | 8 (1.4 %) |
| enclosed | 213 (18.7 %) | 8 (1.4 %) |
| dissolving | 61 (5.3 %) | 41 (7.2 %) |
| size cap | 17 (1.5 %) | 17 (3.0 %) |
| never grew | 42 (3.7 %) | 0 (0.0 %) |
| no sigma method | 6 (0.5 %) | 6 (1.1 %) |
| all | 1142 | 568 |

#### Two fluids

| scenario | field | largest gap between the bulk handle and the voxel mean | at step | at run end: bulk | voxel mean | wall minimum |
|---|---|---:|---:|---:|---:|---:|
| schneeberg | Pb | 174 (97.2 %) | 160 | 179 | 5.00 | 5.00 |
| radioactive_pegmatite | Pb | 117 (79.6 %) | 80 | 147 | 30.0 | 30.0 |
| stalactite_demo | Ca | 425 (41.5 %) | 0 | 600 | 1025 | 600 |
| stalactite_demo | CO3 | 425 (41.5 %) | 0 | 600 | 1025 | 600 |
| wittichen | O2 | 0.26 (14.6 %) | 183 | 1.80 | 1.54 | 0.64 |
| wittichen | Eh | 46.0 (14.3 %) | 170 | 322 | 284 | 143 |
| roughten_gill | O2 | 0.23 (12.5 %) | 183 | 1.20 | 0.97 | 0.75 |
| roughten_gill | Eh | 39.9 (12.4 %) | 215 | 252 | 212 | 170 |
| zoned_dripstone_cave | Mg | 95.6 (8.7 %) | 0 | 1000 | 1096 | 30.0 |
| supergene_oxidation | Eh | 26.2 (7.4 %) | 160 | 220 | 194 | 160 |
| schneeberg | O2 | 0.11 (6.3 %) | 113 | 1.80 | 1.69 | 1.50 |
| supergene_oxidation | O2 | 0.13 (6.0 %) | 174 | 1.00 | 0.87 | 0.71 |

#### Throughput (order of magnitude; broth ppm at face value)

| scenario | cavity cm³ | solids cm³ | priced | binding element: cavity-volumes (richest broth ppm; mostly in) | next |
|---|---:|---:|---:|---|---|
| sulphur_bank | 33.0 | 10.310 | 100 % | Hg 30425 (15.0 ppm; metacinnabar) | Fe 9999 (55.0 ppm; marcasite) |
| radioactive_pegmatite | 62.1 | 62.121 | 100 % | Al 8498 (30.0 ppm; feldspar) | K 2703 (80.0 ppm; feldspar) |
| supergene_oxidation | 62.7 | 25.887 | 99 % | Mo 7034 (40.0 ppm; ferrimolybdite) | Cu 4637 (105 ppm; malachite) |
| roughten_gill | 9.8 | 1.476 | 100 % | Pb 6967 (95.0 ppm; galena) | Cu 668 (150 ppm; malachite) |
| epithermal_telluride | 28.4 | 2.729 | 100 % | Ag 4473 (90.0 ppm; hessite) | Te 2760 (113 ppm; hessite) |
| gem_pegmatite | 69.3 | 69.264 | 100 % | K 4382 (80.0 ppm; feldspar) | Al 1554 (160 ppm; feldspar) |
| sunnyside_american_tunnel | 64.0 | 54.621 | 100 % | Ca 3804 (240 ppm; calcite) | CO3 2280 (600 ppm; calcite) |
| porphyry | 79.0 | 9.193 | 100 % | Mo 3590 (80.0 ppm; molybdenite) | As 1104 (15.0 ppm; arsenopyrite) |
| ouro_preto | 68.5 | 19.718 | 100 % | Al 3222 (23.0 ppm; albite) | K 1283 (40.0 ppm; feldspar) |
| bisbee | 66.4 | 63.445 | 100 % | Cu 2426 (770 ppm; malachite) | CO3 2366 (260 ppm; malachite) |
| shigar_pegmatite | 6029.9 | 5576.353 | 100 % | K 1906 (80.0 ppm; feldspar) | Al 1601 (150 ppm; albite) |
| tormiq_alpine_cleft | 532.7 | 41.282 | 100 % | Al 1321 (16.0 ppm; albite) | SiO2 95.5 (1420 ppm; albite) |
| searles_lake | 25.7 | 22.601 | 100 % | S 1315 (400 ppm; thenardite) | Na 503 (1500 ppm; thenardite) |
| colorado_plateau | 75.1 | 0.826 | 100 % | U 1308 (18.0 ppm; uranophane) | SiO2 28.9 (200 ppm; uranophane) |
| reactivated_fluorite_vein | 86.9 | 19.816 | 100 % | CO3 1268 (280 ppm; calcite) | Ca 557 (450 ppm; calcite) |
| sabkha_dolomitization | 41.6 | 1.121 | 100 % | Sr 1210 (30.0 ppm; celestine) | Ca 11.3 (600 ppm; anhydrite) |
| sicily_solfifera | 15.2 | 0.447 | 100 % | Sr 1086 (45.0 ppm; celestine) | S 36.2 (700 ppm; celestine) |
| mvt | 68.2 | 5.928 | 100 % | CO3 517 (250 ppm; calcite) | Pb 297 (65.0 ppm; galena) |
| schneeberg | 81.4 | 9.024 | 100 % | K 486 (30.0 ppm; feldspar) | Al 402 (25.0 ppm; feldspar) |
| tn457_barite_pulses | 8.9 | 0.195 | 100 % | Ba 274 (180 ppm; barite) | S 78.7 (200 ppm; barite) |
| asbestos_hills_crack_seal | 91.2 | 0.193 | 100 % | CO3 252 (5.00 ppm; siderite) | SiO2 4.40 (650 ppm; opal) |
| asbestos_hills_surficial_alteration | 79.3 | 0.233 | 100 % | CO3 243 (5.00 ppm; siderite) | SiO2 4.44 (1000 ppm; opal) |
| elmwood | 70.8 | 0.805 | 100 % | Sr 223 (30.0 ppm; celestine) | F 106 (30.0 ppm; fluorite) |
| ultramafic_supergene | 36.4 | 0.427 | 100 % | SiO2 58.7 (400 ppm; opal) | Ca 3.7e-10 (30.0 ppm; calcite) |
| reactive_wall | 37.7 | 0.046 | 100 % | Pb 44.8 (30.0 ppm; galena) | Zn 11.0 (250 ppm; sphalerite) |
| jeffrey_mine | 329.2 | 4.029 | 99 % | SiO2 43.9 (480 ppm; diopside) | Ca 13.6 (570 ppm; diopside) |
| naica_geothermal | 63.0 | 0.013 | 100 % | Sr 35.0 (6.00 ppm; celestine) | S 0.24 (500 ppm; celestine) |
| great_salt_plains | 306.3 | 17.548 | 100 % | Ca 17.1 (1800 ppm; selenite) | S 9.48 (2600 ppm; selenite) |
| deccan_zeolite | 70.5 | 0.168 | 99 % | SiO2 6.15 (950 ppm; quartz) | Al 2.28 (30.0 ppm; albite) |
| grimsel_alpine_cleft | 600.4 | 0.469 | 100 % | Al 4.56 (6.00 ppm; albite) | Ca 2.65 (200 ppm; calcite) |
| chiastolite_hornfels | 24.3 | 0.001 | 100 % | Al 0.88 (45.0 ppm; andalusite) | SiO2 0.14 (350 ppm; andalusite) |
| wittichen | 3161.7 | 0.158 | 100 % | Co 0.62 (35.0 ppm; erythrite) | As 0.40 (120 ppm; erythrite) |
| tutorial_mn_calcite | 72.9 | 0.002 | 100 % | CO3 0.20 (250 ppm; calcite) | Ca 0.11 (300 ppm; calcite) |
| tutorial_travertine | 65.4 | 0.002 | 100 % | CO3 0.13 (522 ppm; aragonite) | Ca 0.13 (350 ppm; aragonite) |
| amethyst_geode | 59.3 | 0.000 | 100 % | SiO2 0.0084 (400 ppm; quartz) | — |
| zoned_dripstone_cave | 273.8 | 0.002 | 100 % | CO3 0.0053 (2200 ppm; aragonite) | Ca 0.0039 (2000 ppm; aragonite) |
| stalactite_demo | 124.6 | 0.000 | 100 % | CO3 0.0032 (600 ppm; calcite) | Ca 0.0021 (600 ppm; calcite) |
| cooling | 64.4 | 0.000 | 100 % | SiO2 0.0024 (260 ppm; quartz) | — |
| pulse | 69.8 | 0.000 | 100 % | Fe 0.00095 (15.0 ppm; siderite) | CO3 0.00013 (120 ppm; siderite) |
| tutorial_first_crystal | 66.0 | 0.000 | 100 % | SiO2 2.1e-9 (600 ppm; quartz) | — |
| marble_contact_metamorphism | 36.0 | 0.000 | 100 % | — | — |

#### Every non-comment line of `js/` that names `flow_rate`, outside the assignments in the event files

```text
js/25-chemistry-conditions.ts:23  this.flow_rate = opts.flow_rate ?? 1.0;
js/70-events.ts:19  const allowedKeys = new Set(['multiply', 'add', 'pH_delta', 'flow_rate']);
js/70-events.ts:70  if (Object.prototype.hasOwnProperty.call(transform, 'flow_rate')) {
js/70-events.ts:71  if (!Number.isFinite(Number(transform.flow_rate)) || Number(transform.flow_rate) < 0) {
js/70-events.ts:72  throw new Error(`${kind} has invalid flow_rate`);
js/70-events.ts:74  nextFlowRate = Number(transform.flow_rate);
js/85c-simulator-state.ts:2226  flow_rate: cnd.flow_rate,
js/85d-simulator-step.ts:263  wall.paleo_flow_accum += this.conditions.flow_rate * result.rate_mm;
js/85d-simulator-step.ts:417  const authoredFlow = draw(pulseFluid.flow_rate, NaN);
js/85d-simulator-step.ts:419  this.conditions.flow_rate = Math.max(0, authoredFlow);
js/85d-simulator-step.ts:420  added.push(`flow=${this.conditions.flow_rate.toFixed(2)}`);
js/85d-simulator-step.ts:438  pHBoundary.rate_per_step * Math.min(Math.max(this.conditions.flow_rate, 0), 2),
js/85d-simulator-step.ts:443  if (this.conditions.flow_rate > 1.0) this.conditions.flow_rate *= 0.9;
js/85j-movements.ts:683  if (path === 'flow_rate' || path === 'fluid_surface_height_mm') {
js/85l-simulation-command-protocol.ts:253  flowRate: Number(sim?.conditions?.flow_rate) || 0,
js/97-ui-fortress.ts:888  ...(flowRate == null ? {} : { flow_rate: flowRate }),
js/97-ui-fortress.ts:900  flow_rate: _creativeControlNumber('f-flow-rate', 10, 1),
js/97-ui-fortress.ts:1546  c.flow_rate = Math.max(c.flow_rate, 1.5);
js/97-ui-fortress.ts:1570  c.flow_rate = 5.0;
js/97-ui-fortress.ts:1595  c.flow_rate = Math.max(c.flow_rate * 0.5, 0.2);
js/97-ui-fortress.ts:1604  c.flow_rate = Math.max(c.flow_rate * 0.2, 0.05);
js/97-ui-fortress.ts:1808  c.flow_rate = 4.0;
js/97-ui-fortress.ts:2152  flow_rate: snapCnd.flow_rate,
js/97-ui-fortress.ts:2168  document.getElementById('f-stat-flow').textContent = c.flow_rate.toFixed(1);
js/97a-ui-broth.ts:85  path: 'flow_rate',
js/97a-ui-broth.ts:86  get: () => fortressSim.conditions.flow_rate,
js/97a-ui-broth.ts:87  set: v => { fortressSim.conditions.flow_rate = v; },
js/97a-ui-broth.ts:422  path: 'wall.thermal_pulse_fluid.flow_rate',
js/97a-ui-broth.ts:423  get: () => fortressSim.conditions.wall.thermal_pulse_fluid?.flow_rate ?? -1,
js/97a-ui-broth.ts:426  if (Number(v) < 0) delete contract.flow_rate;
js/97a-ui-broth.ts:427  else contract.flow_rate = Number(v);
js/97b-ui-geology.ts:24  ['flow_rate', 'Flow rate'],
```

## Appendix B — the evidence files

The instruments' outputs are committed unedited in `proposals/evidence/sim-side-2026-11-09/`
(`README.md` there lists each file with the command that produced it):

| File | What it backs |
|---|---|
| `ab-pegmatites-rind-clamp.txt` | §3.1 A/B table (rind, clamp); the other two pegmatites |
| `ab-gem-factor-caps-root-boron.txt` | §3.1 A/B table (factor caps, root, ten times the boron) |
| `ab-feldspar-13-scenarios.txt` | §4 R1: what each shape moves in the 13 scenarios that grow feldspar or albite |
| `ab-quartz-also-clamped.txt` | §3.1: radioactive_pegmatite with quartz bounded as well |
| `ab-radiogenic-lead.txt` | §3.3 A/B table |
| `ab-rate-on-excess.txt` | §4 R2 preview table |
| `ab-gem-clamp-sensitivity.txt` | §4 R1: sensitivity to the clamp value |
| `ab-reactive-wall-trace.txt` | §4 R2: galena sigma on the bulk handle and on its own cell |
| `census-seed-42.txt`, `census-seed-1.txt`, `census-seed-2.txt` | §2 and §3.3 |
| `census-mutations.txt` | §1 |
| `rate-at-saturation.txt` | §3.2 |
| `seed-variety.txt` | §2.4 |
| `probe-sigma-maxima.txt`, `probe-sigma-maxima-naica.txt` | §3.1 (cause), §3.4 |
| `probe-baseline-history.txt` | §3.1, §3.4 |
| `probe-nucleation-envelope.txt`, `probe-nucleation-envelope-per-vertex.txt` | §7 |
