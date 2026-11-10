# Simulation-side review: what ends a crystal's growth (2026-11-09)

**Status:** a review and five passive instruments. Nothing under `js/`, `data/` or `tests-js/`
changes, no baseline or receipt moves, and SIM stays 286.
**Base:** `origin/main` `e86ba58a`. `canonical/main` (`915ed33a`) is a merge whose tree is identical
to that of `c2651d4f`, an ancestor of this base, so it holds no change this base lacks.
**Asked by the boss, 2026-11-09:** "take a look at vugg simulator and see if you see any improvements
of the simulation side of things."
**Awaits the boss:** the six decisions in §6. No fix is applied here. C1, C2 and C3 are each a SIM
bump with a shape to choose. §4 previews C1 and C2 by A/B and says where a preview is missing.

Terms used throughout. *σ* is the simulator's supersaturation ratio for a mineral; 1 is saturation,
and σ − 1 is the *excess*. *σ_crit* is the registry's nucleation threshold for a mineral
(`MINERAL_GATES_REGISTRY`). The *bulk handle* is `conditions.fluid`, the one fluid object that events
write and nucleation reads. The *voxel field* is the 7,680 fluid cells (16 rings × 120 cells × 4
depths) that crystals grow from, and a crystal's *own cell* is the wall voxel it sits on. A mineral's
*ingredients* are the formula species the ledger debits for it. A *zone* is one step's growth layer
on one crystal. A crystal is *surviving* when the baseline's own split does not count it as
dissolved, which since `js/27` recomputes the flag on every negative zone means it has solid left.
In an A/B a species is *moved* when its crystal count changes or its largest crystal changes by more
than 25 %, and a scenario is moved when any of its species is. The changes proposed in §4 are
numbered C1 to C5; "R" numbers in this document are always the rungs of the mineral-recipe review.

## 0. Summary

The summer's reviews examined which minerals may form. This review looked at the other half: once a
crystal is admitted, what makes it grow, and what makes it stop.

A crystal draws on one cell of the fluid, the voxel it sits on, and diffusion refills that cell from
its neighbours. That is the only supply limit the simulator has, and it works: about a tenth of the
crystals of 1 mm or more put on most of their growth on a cell drawn down to under half the bulk
fluid's excess, and returning every debit to its cell moves 27 of the 41 scenarios (§2.1). Nothing
above the cell binds. The cavity's inventory is never dented, the bulk handle that nucleation reads
is never debited, and the flow rate the events author feeds nothing. So a crystal that is slowed is
seldom stopped. It grows until the run ends, the pocket fills, an event moves the chemistry or a
neighbour buries it (§2.2), and scenarios pile up at two extremes: six pockets end more than 70 %
full and 28 of the 41 end less than 10 % full. Three defects sit on that structure (§3), and each
has an A/B.

| | Finding | Measured (seed 42 unless said) | § |
|---|---|---|---|
| S1 | Supply binds at the crystal's own cell and nowhere above it | In 13 of the 40 scenarios that grow anything, more than a tenth of the stored thickness was put on at a cell under half the bulk fluid's excess; in 25, under 1 %. 56 of the 568 surviving crystals ≥ 1 mm stored most of their growth that way. The surviving solids hold a median 0.008 % of the most the whole field ever held of each solute (0.6 of one voxel's worth), and at most 1.7 %. | 2.1 |
| S2 | Growth ends by the clock, the cavity, an event or burial | 321 of the 568 surviving crystals ≥ 1 mm (56.5 %) are still growing on the final step, and 4 made their last stop because their cell ran short. 17 of 41 pockets end ≤ 1 % full and 6 end > 70 % full. | 2.2 |
| S3 | `flow_rate` is authored and feeds nothing | 103 assignments in 22 event files, 11 event lines of scenario data and a Creative slider. No engine, supply or nucleation code reads it. In the 41 scenarios its one reader is the wall's scallop record. | 2.5 |
| F1 | The pegmatite pocket plugs | `gem_pegmatite` is full at step 9–10 of 230 at seeds 42, 1 and 2; 7 of its 8 events fire into a full pocket. With feldspar and albite bounded, tourmaline reaches 12 mm and topaz appears. Boron is not the lever: tourmaline's boron factor is already at its cap. | 3.1 |
| F2 | Three engines propose growth at saturation | Of 183 engines, 171 propose a rate that vanishes at σ = 1; galena, molybdenite and uraninite propose half their σ = 2 rate. `reactive_wall`'s galena put on 88 % of its 3.9 mm below σ 1.05. | 3.2 |
| F3 | Radiogenic lead reaches only the bulk handle | Bulk Pb climbs 30 → 147 ppm (`radioactive_pegmatite`) and 5 → 179 ppm (`schneeberg`); every voxel stays at 30.00 and 5.00. Latent until F1 is cured. The galena that `radioactive_pegmatite`'s description promises is not among the species the scenario licenses. | 3.3 |
| — | Counts are authored; a seed changes sizes more than species | Known (story-pocket WP7 and WP9; PR #45). Re-measured in §2.3 and §2.4 because they belong to the same structure. | 2.3, 2.4 |

§4 proposes an order: bound the feldspar pair (C1, cures F1); put the three engines on σ − 1 (C2,
F2); keep radiogenic lead in the uraninite and release it on alteration (C3, F3); and pilot a supply
with a scale above the cell — a physical debit, a feed from the `flow_rate` the events already
author, and a clock (C4; S1–S3).

**Corrections to the first reading.** A first reading was given in conversation on 2026-11-09, before
the instruments existed. Three of its statements are superseded here.

- It said supply had shaped 321 of 78,431 zones, 313 of them gold tellurides. That counted a zone
  twice when it was both rationed and budget-cut. The count is 275, of which 268 are the two gold
  tellurides (§2.1).
- It put 174 of 183 engines on σ − 1, from a reading of the source text. The engine probe reads 171
  whose rate vanishes at saturation, 3 whose rate does not, and 9 it cannot drive (§3.2).
- It recommended factor caps for the feldspar pair. The A/B refused that shape (§4, C1), and the
  recommendation is now a clamp.

**Corrections to the first version of this document** (commit `dd2346c5`). Its first review round
found five statements wrong. Each was re-measured, and the instruments now carry the reading that
would have caught it.

- It said supply does not bind ("the fluid does not run short"). Its supply reading counted the
  zones the ledger refused and the field's total, and could not see a crystal slowed through the σ
  of its own cell. Supply binds at the cell (§2.1).
- It called "undersaturated at its cell only" an upper bound on exhaustion, about 1 % of the
  crystals ≥ 1 mm. That state was read at the end of the step, after diffusion had refilled the
  cell. It is now read when the engine runs and split by cause (§2.2).
- It read "ten times the boron changes nothing" as showing that the plug hides a boron effect. The
  arm could not have moved anything: tourmaline's boron factor saturates at 30 ppm and the broth
  holds 35 (§3.1).
- It said galena cannot form in `radioactive_pegmatite` because the late fluid is too oxidizing. The
  scenario does not license galena, and an unlicensed species' nucleation function never runs
  (§3.3).
- It put the O2 and Eh gaps between the bulk handle and the voxels down to oxygen consumed at the
  crystals' cells. They are the vadose override, which writes the dried rings and the bulk handle.
  It also missed `concentration`, a field the census did not sample (§3.3).

## 1. What was run

Runtime: Windows x64, Node 24.15.0, the commissioned formation. The change adds files under `tools/`
and `proposals/` and edits two documents; nothing under `js/`, `data/` or `tests-js/` changes. §8
lists the gates that were run and says what was not.

| Instrument | What it reads | Integrity and controls |
|---|---|---|
| `tools/sim-side-census.mjs` | One pass per scenario: fill per step; what each crystal's engine read on its own cell when it ran; what ended each crystal's growth, and every pause on the way; what the ledger refused outright; the bulk handle against the voxel field; the vadose override; the count rules; and a physical-unit restatement of what was grown. Three static readings of the source. | At seed 42 all 41 runs reproduce `tests-js/baselines/seed42_v286.json` with the instrument attached. Fourteen controls, nine positive and five negative, all passing at seeds 42, 1 and 2. |
| `tools/sim-side-census-mutations.mjs` | Nineteen broken copies of the census, one line changed in each, run on the scenarios the guarded control needs. | Every control passes on the census as committed and fails on each of its mutants. |
| `tools/sim-side-ab.mjs` | Shipped arm against an arm with a named intervention applied in-process: a feldspar rind, a σ clamp, factor caps, a per-factor root, a k·(σ−1) rescale, radiogenic Pb to the voxels, a multiplied broth field, or every debit returned to its cell. | The shipped arm reproduces the baseline at seed 42. The neutral knobs (`rind=Infinity`, `cap=Infinity`, `root=1`, `mul=Ca:1`, `refund=0`, and `fcap=Infinity` where the minerals are feldspar and albite) reproduce the shipped arm exactly, on `schneeberg` at seed 42, before every batch. |
| `tools/rate-at-saturation-census.mjs` | Each growth engine called directly with σ forced to 1.0005 … 3 and the rng re-seeded before every call; then, for the engines that propose a rate at saturation, the σ at which they actually grew. | Quartz and fluorite, k·excess laws by inspection, read "vanishes". All 8 scenario runs reproduce the baseline. |
| `tools/seed-variety-census.mjs` | One stratum of the nightly canary (55 seeds). No simulation. | None of its own: it restates the canary's committed per-species spine and, where the machine holds it, the per-seed tier. |

Seeds: the census and every A/B ran at 42, 1 and 2; the canary stratum is `2026-11-04/v286`
(55 seeds, vugg `e86ba58a`).

A control that passes proves little until it has been seen to fail. The mutation tool breaks the
census nineteen ways. Among them: the step log read once instead of every step; the competition
receipt, and the budget receipt, ignored; the voxel mean read from the bulk handle; the fill
recorded as 0, and as 1; the stop never recorded; the crystal's own cell read from the bulk handle;
the ingredients never restored; the license never asked; and the engine's view read after the
step's diffusion instead of at the dry run, which is the error the first version of this census
made. Each control fails on its mutant. Three readings have no control: the throughput restatement
(§2.6 checks its arithmetic by hand on one row), the births that never grew, and the static
readings of the source.

Four small probes are committed beside their outputs in `proposals/evidence/sim-side-2026-11-09/`.
Three carry statements of their own: the range of σ each scenario's bulk fluid covers for feldspar,
albite and quartz (§3.1); the history of a few headline crystals across the 258 committed baselines
(§3.1, §3.4); and whether a wrapped σ method stays in force during nucleation (§7). The fourth runs
nothing: it reads the A/B outputs in that folder and prints the counts this document draws from
them.

## 2. The structural reading

### 2.1 Supply binds at the crystal's own cell, and nowhere above it

Growth debits the fluid through the ledger of `js/19` and `js/18`: 0.00008 mmol of formula per kg of
solvent for every micrometre a crystal advances, whatever the crystal's size. The source says so in
its own disclosure (`STOICHIOMETRIC_GROWTH_BUDGET_DISCLOSURE`: "not physical solid mass or volume;
demand is independent of crystal size, habit, density, and rendered shell volume").

The debit lands on one voxel, the wall cell the crystal sits on, and that cell is the fluid the
crystal's engine reads on the next step (`_dryRunEngineForCrystal` and `_applyZoneGrowthBudget`,
`js/85b`). At the end of every step diffusion relaxes each voxel toward its neighbours
(`_diffuseRingState`, `js/85c`). A crystal that takes an ingredient faster than its neighbours
return it therefore grows on a poorer fluid than the scenario shows, and an engine whose rate
follows σ − 1 slows with it. The comment above `_wallStrangledFor` in `js/85b` states the design:
"growth budget debits the d=0 wall cell; diffusion spreads the depletion laterally across the wall
mesh and radially inward, while the interior reservoir (d=1,2,3) replenishes from the other side."

How much the debit matters depends on how scarce the ingredient is. `mvt`'s 34.6 mm calcite costs
its cell 111 ppm of Ca over the whole run and no wall cell ends below 395 ppm of the 400 it started
with. The same scenario's five greenockites sit on 2 ppm of Cd and hold 38 voxels' worth of it
between them; the lowest wall cell ends at 0.93 ppm.

**It is common.** The census reads each crystal's σ on its own cell when its engine runs, against
the σ the bulk handle's fluid gives at that cell's temperature, and files every stored zone by its
thickness.

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| Scenarios that stored growth | 40 | 40 | 40 |
| … with more than a tenth of the stored thickness put on at a cell under half the bulk fluid's excess | 13 | 11 | 11 |
| … with more than half of it | 3 | 2 | 1 |
| … with under 1 % of it | 25 | 25 | 26 |
| Surviving crystals ≥ 1 mm | 568 | 579 | 572 |
| … that stored most of their growth that way | 56 (9.9 %) | 52 (9.0 %) | 55 (9.6 %) |
| Times a growing crystal paused (a step with no positive zone after a step with one) | 1,427 | 1,225 | 1,276 |
| … because its cell ran short of an ingredient | 222 (15.6 %) | 100 (8.2 %) | 38 (3.0 %) |

Some rows at seed 42 (Appendix A has all 40):

| scenario | stored, mm | on a cell under half the bulk fluid's excess | … through its ingredients | drawn down through | crystals ≥ 1 mm mostly grown that way |
|---|---:|---:|---:|---|---|
| shigar_pegmatite | 782 | 83.1 % | 83.1 % | Na (albite), K (feldspar) | 4 of 8 |
| epithermal_telluride | 154 | 54.1 % | 54.1 % | Ag (hessite), Au (calaverite, sylvanite) | 7 of 22 |
| radioactive_pegmatite | 292 | 50.3 % | 50.3 % | Al (feldspar, albite) | 6 of 18 |
| colorado_plateau | 71.5 | 36.7 % | 36.7 % | U (uranophane) | 3 of 13 |
| gem_pegmatite | 107 | 31.4 % | 31.4 % | K (feldspar), Na (albite) | 0 of 5 |
| roughten_gill | 147 | 26.5 % | 26.5 % | Pb (galena) | 4 of 32 |
| supergene_oxidation | 464 | 24.0 % | 9.1 % | Mo (ferrimolybdite) | 6 of 66 |
| porphyry | 232 | 22.8 % | 22.8 % | Mo (molybdenite, ferrimolybdite) | 5 of 29 |
| sunnyside_american_tunnel | 142 | 21.4 % | 21.4 % | Pb (galena) | 5 of 16 |
| mvt | 85.7 | 9.3 % | 9.3 % | Cd (greenockite) | 4 of 15 |
| tn457_barite_pulses | 31.2 | 0.0 % | 0.0 % | — | 0 of 7 |

"Through its ingredients" means that setting the mineral's ingredient fields in the cell to the bulk
handle's values restores at least 0.9 of the bulk fluid's excess. Where that fails the cell differs
from the bulk handle in something else, and §3.3 takes that up: it is 14.9 / 8.1 / 9.7 % of
`supergene_oxidation`'s stored thickness, about 2 % of `schneeberg`'s, and under 1 % everywhere
else. The pauses in the last row of the first table depend on the seed because most of them belong
to one mineral in one scenario, the galenas of `sunnyside_american_tunnel` (156 / 64 / 4), which
§3.2 explains.

**The test.** If supply did not bind, returning every debit would change nothing. The `refund=1` arm
of the A/B tool returns each positive zone's debit to its cell as soon as it is booked. It moves
27 / 28 / 26 of the 41 scenarios. In 22 / 22 / 19 of them a crystal of 1 mm or more changes size by
more than a quarter, and in 7 the fill rises by more than ten points (`probe-ab-digest.txt`). At
seed 42:

- Crystals on a scarce ingredient grow: `mvt`'s greenockite from 2.4 to 7.3 mm, `colorado_plateau`'s
  uranophane from 12.6 to 25.7 mm, `reactive_wall`'s galena from 3.9 to 7.0 mm.
- Pockets that the draw-down was keeping open fill: `porphyry` ends 82 % full where it ends 12 %,
  `roughten_gill` 98 % where it ends 15 %, `supergene_oxidation` 98 % where it ends 41 %,
  `sulphur_bank` 72 % where it ends 31 %.
- The pegmatites plug sooner. `shigar_pegmatite`, which ends 92 % full as shipped, is full at step
  23 (26 at the other two seeds) and loses its topaz. `gem_pegmatite` is full at step 5 and not 9,
  `radioactive_pegmatite` at step 17 and not 61.

The 14 scenarios it leaves alone at seed 42 store under 1 % of their growth on a cell under half
the bulk fluid's excess (one grows nothing). It also moves 12 scenarios that the passive reading
files under 1 %, so the 0.5 threshold is a coarse cut: 36 % of `bisbee`'s stored thickness sits
between 0.5 and 0.9 of the bulk fluid's excess, and the arm moves 23 of its 31 species.

**Nothing above the cell binds.** The same ledger, read at the scale of the cavity:

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, species) pairs with booked solids | 321 | 320 | 320 |
| What the surviving solids hold ÷ the most the voxel field ever held, median | 0.0081 % | 0.0073 % | 0.0082 % |
| … 90th percentile | 0.14 % | 0.16 % | 0.16 % |
| … largest | 1.7 % | 1.7 % | 1.7 % |
| The same in voxels' worth of that peak (the field is 7,680 voxels), median | 0.63 | 0.56 | 0.63 |
| … 90th percentile | 11 | 12 | 12 |
| … largest | 129 | 127 | 130 |
| Stored positive zones | 78,431 | 79,984 | 78,993 |
| … scaled below 0.999 by graduated competition (`js/44`) | 275 | 208 | 422 |
| … cut by the formula budget (`js/19`) | 46 | 51 | 19 |
| … either (a zone is counted once) | 275 (0.35 %) | 208 (0.26 %) | 422 (0.53 %) |
| Zones rationed to zero (never stored) | 313 | 313 | 313 |

- *The cavity's inventory.* For the median (scenario, species) pair the surviving solids hold about
  0.6 of one voxel's worth, out of 7,680 voxels. The largest share at every seed is uranium in
  `colorado_plateau`, 1.7 % of the field; mercury in `sulphur_bank` and molybdenum in
  `supergene_oxidation` are the only other pairs above 1 %. The depletion is a halo round a crystal.
  No scenario uses up what its pocket holds.
- *Outright refusal.* Graduated competition and the formula budget are the two places the ledger
  cuts a zone, and they cut few. Almost all are one case: sylvanite and calaverite sharing 25 ppm of
  Au in `epithermal_telluride` (268 / 206 / 414 zones). Outside that pair they shaped 7 / 2 / 8
  zones in the whole fleet. The zones rationed to zero are exactly the R9 fahlore defect of the
  recipe review (`REVIEW-MINERAL-RECIPES-2026-10-21.md`; 64 / 64 / 60 / 60 / 65 at every seed),
  which is a booking error, not scarcity.
- *The bulk handle.* Events write it and nucleation gates read it, and growth does not debit it
  (`js/85b`: "the BULK view … is NOT debited by growth budget — it's the flow-fed cavity average").
  The one field that follows the voxels, carbonate under a carbonate boundary, is in §5. §2.3
  describes the one gate that joins the two fluids.
- *A feed.* Nothing feeds the field from outside except the events and movements, whose changes
  land on every voxel alike. `flow_rate` is not read (§2.5).

So the ledger closes and is exact for what it books. It regulates the rate of a crystal on a scarce
ingredient, at a price its own disclosure calls not physical. It sets no limit on the total.

### 2.2 What ends growth

The census records, for every surviving crystal, the state on the first step it stored no positive
zone after its last one. Fill, enclosure and activity are read at the end of that step. σ is what
the crystal's engine read at that step's dry run, on its own cell and on the bulk handle. The order
of the tests is in the tool's header.

| State on the first step with no positive zone | seed 42: all | ≥ 1 mm | seed 1: all | ≥ 1 mm | seed 2: all | ≥ 1 mm |
|---|---:|---:|---:|---:|---:|---:|
| still growing on the final step | 429 (37.6 %) | 321 (56.5 %) | 430 (39.1 %) | 316 (54.6 %) | 430 (36.0 %) | 321 (56.1 %) |
| pocket full | 30 (2.6 %) | 22 (3.9 %) | 31 (2.8 %) | 22 (3.8 %) | 35 (2.9 %) | 21 (3.7 %) |
| undersaturated on its cell and on the bulk handle | 288 (25.2 %) | 138 (24.3 %) | 302 (27.4 %) | 150 (25.9 %) | 320 (26.8 %) | 144 (25.2 %) |
| its cell ran short of an ingredient | 17 (1.5 %) | 4 (0.7 %) | 15 (1.4 %) | 0 | 10 (0.8 %) | 0 |
| undersaturated on its cell only, not through its ingredients | 10 (0.9 %) | 6 (1.1 %) | 7 (0.6 %) | 6 (1.0 %) | 9 (0.8 %) | 6 (1.0 %) |
| at or above saturation on its cell, nothing proposed | 27 (2.4 %) | 4 (0.7 %) | 26 (2.4 %) | 9 (1.6 %) | 25 (2.1 %) | 10 (1.7 %) |
| a zone proposed and not stored | 2 (0.2 %) | 1 (0.2 %) | 2 (0.2 %) | 1 (0.2 %) | 2 (0.2 %) | 0 |
| enclosed | 213 (18.7 %) | 8 (1.4 %) | 154 (14.0 %) | 8 (1.4 %) | 232 (19.4 %) | 7 (1.2 %) |
| dissolving | 61 (5.3 %) | 41 (7.2 %) | 62 (5.6 %) | 42 (7.3 %) | 60 (5.0 %) | 40 (7.0 %) |
| size cap | 17 (1.5 %) | 17 (3.0 %) | 19 (1.7 %) | 19 (3.3 %) | 19 (1.6 %) | 19 (3.3 %) |
| never grew | 42 (3.7 %) | 0 | 47 (4.3 %) | 0 | 46 (3.9 %) | 0 |
| no σ method | 6 (0.5 %) | 6 (1.1 %) | 6 (0.5 %) | 6 (1.0 %) | 6 (0.5 %) | 4 (0.7 %) |
| all surviving crystals | 1,142 | 568 | 1,101 | 579 | 1,194 | 572 |

Four things end growth, and supply is seldom one of them.

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

**An event.** "Undersaturated on its cell and on the bulk handle" is a crystal whose σ fell below 1
on both fluids: an event, a movement or cooling moved the chemistry. "Dissolving" is the same thing
carried further. That is the authored paragenesis working as designed.

**Burial.** "Enclosed" is a crystal overgrown by a neighbour (`enclosed_by`). It is the third-largest
class, 213 / 154 / 232 crystals, and nearly all of them are small: 8 / 8 / 7 are 1 mm or more.
At seed 42 the commonest buriers are anhydrite, celestine and sphalerite (39, 34 and 24 crystals).

**Supply, seldom.** "Its cell ran short of an ingredient" is the last state of 17 / 15 / 10
crystals. Of those ≥ 1 mm it is only the four galenas of `sunnyside_american_tunnel` at seed 42,
which starve on lead at step 149, one step before the event that would have stopped them. As a
pause it is common (§2.1): the draw-down slows a crystal many times for every time it ends one.

"Undersaturated on its cell only, not through its ingredients" is six crystals ≥ 1 mm at every
seed, all of them arsenates of `supergene_oxidation` (one mimetite, five scorodite) that stop
together at step 160. That is the step of the scenario's last event, in a pocket whose floor and
bulk handle have differed in O2 since the water level dropped at step 70 (§3.3). It is a redox gap
between the two fluids, not exhaustion.

The smaller classes are authored. "Size cap" is the audited dimensional cap of `js/85`: the three
tellurides of `epithermal_telluride`, powellite and conichalcite in `supergene_oxidation`,
haidingerite in `wittichen`. "At or above saturation on its cell, nothing proposed" is an engine
that declined a fluid past saturation, as anhydrite does in `reactivated_fluorite_vein` and
nickeline in `wittichen`: a window or a threshold of its own. "No σ method" is the pararealgar of
`sulphur_bank`, a transformation product.

### 2.3 Count is authored

This is known (WP7 of the story-pocket proposal, which lives on the branch of PR #26) and is
re-measured here because it belongs to the same structure.

A species' nucleation function runs only if the scenario lets it. `_runNuc` (`js/85j`) returns
first when the scenario excludes the species, does not list it in one of its four license tiers,
has it outside an authored nucleation window, or lacks a prerequisite event. Inside the function a
crystal is admitted when the bulk σ passes a threshold, subject to a fixed per-step probability, the
species' `max_nucleation_count`, and the function's own count gate. Of the 169 functions, 86 refuse
a new crystal while one of their species is active (62 of those keep a side door, a roll on the
same line), 22 tolerate two or more, 15 also limit the crystals ever born, and 61 show no such gate
in the forms the census recognizes. No function computes its probability from σ: of the 489
`rng.random()` comparisons in the nucleation files, 487 are against a numeric literal and two
against one named constant. Where σ enters past the threshold it switches between literals, as
quartz's second-crystal door does at σ > 2.

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, species) pairs | 351 | 350 | 348 |
| … with exactly one crystal | 119 (33.9 %) | 118 (33.7 %) | 114 (32.8 %) |
| … with at least `max_nucleation_count` crystals born | 172 (49.0 %) | 177 (50.6 %) | 182 (52.3 %) |
| Species-steps with the bulk fluid past σ_crit when the nucleation pass starts | 38,017 | 38,060 | 38,020 |
| … the scenario excludes the species | 2,499 (6.6 %) | 2,500 (6.6 %) | 2,516 (6.6 %) |
| … the scenario does not license it | 1,398 (3.7 %) | 1,410 (3.7 %) | 1,450 (3.8 %) |
| … it is outside its authored nucleation window | 504 (1.3 %) | 504 (1.3 %) | 504 (1.3 %) |
| … its prerequisite event has not fired | 0 | 0 | 0 |
| … the species' function is reached | 33,616 (88.4 %) | 33,646 (88.4 %) | 33,550 (88.2 %) |
| …… and the count cap was binding | 14,761 (43.9 %) | 14,849 (44.1 %) | 14,585 (43.5 %) |
| …… and the function's own count gate was binding | 15,073 (44.8 %) | 15,176 (45.1 %) | 15,192 (45.3 %) |
| …… and neither was | 3,782 (11.3 %) | 3,621 (10.8 %) | 3,773 (11.2 %) |
| Births `_wallStrangledFor` refused | 48 | 27 | 47 |

On about one in nine of those species-steps the function was never reached. The windows are
`deccan_zeolite`'s zeolites, `porphyry`'s native gold, `roughten_gill`'s plumbogummite and one step
of `wittichen`'s erythrite. Where the function was reached, the count cap or the function's own
gate stood in the way on eight of every nine.

One gate in this chain is not authored. `_wallStrangledFor` (`js/85b`) refuses a birth that the bulk
σ admits when no wall cell clears σ_crit: it is where the two fluids of §2.1 meet. It refused
48 / 27 / 47 births, azurite in `supergene_oxidation` 39 / 18 / 39 times and plumbogummite in
`radioactive_pegmatite` 6 / 7 / 7 times (the bulk-only lead of §3.3). The gate fires only when no
wall cell clears the threshold, so it is rare: 48 of 10,382 calls at seed 42. The census counts its
verdicts and does not say which difference between the two fluids produced each one. In practice
the authored rules end a nucleation burst. My reading, not a measurement: a
σ-dependent nucleation rate (story-pocket WP7's "count lever") would run into those same caps
unless the cavity as a whole could be drawn down, which is C4.

### 2.4 What a seed changes

Also known (the story-pocket proposal, §2.5 and WP9, at 21 seeds; PR #45 is a brief for an
experiment on it). The canary's 55 seeds agree:

| Reading (canary stratum `2026-11-04/v286`, 55 seeds) | Value |
|---|---:|
| Scenarios that grow one and the same species set in every seed | 30 of 41 (one of them grows nothing) |
| (scenario, species) pairs present in every seed | 334 of 356 (94 %) |
| … of those, with the same crystal count in every seed | 174 (52 %) |
| Scenarios whose largest crystal is the same species in every seed | 31 of 40 |
| Size spread, median over the 35 scenarios that have one | 38 % |
| … scenarios where it is 50 % or more | 15 |

The size spread is taken over the species present in every seed whose median largest crystal is at
least 1 mm: (largest − smallest) ÷ median of that largest crystal across the 55 seeds, and for a
scenario the median over those species. The count and largest-species rows come from the canary's
per-seed tier, which is local to this machine; the others from its committed spine.

So a seed seldom changes which minerals a scenario grows. It changes how many crystals of each in
about half the pairs, and in half of the 35 scenarios it moves the leading sizes by 38 % or more.
What it moves is where crystals sit, which probability rolls pass, the noise on each engine's rate and
the cooling path (a seed-derived stream sets the cooling increments and the thermal pulses,
`js/85d`). It does not move the broth, the events or the cavity.

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
reads it. No scenario in `data/scenarios.json5` authors a `pH_boundary` either (the Creative broth
panel sets one), so in the 41 scenarios the scallop record is its only reader.

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

One row by hand, since this reading has no control: `gem_pegmatite`'s 67.5 cm³ of feldspar at
2.56 g/cm³ and 278.3 g/mol is 0.621 mol of potassium; 69.3 g of water at 80 ppm holds 0.000142 mol;
the quotient is 4,380.

The full table is in Appendix A. The spread is the point: with no throughput in the model, the
throughput the crystals imply runs from under a hundredth of a cavity-volume to more than a thousand.
A sealed pegmatite pocket holds thousands of pocket-volumes of its potassium and aluminium. Naica's
selenite, in a cave that was fed for about half a million years, holds under a tenth of one
cavity-volume of its calcium (0.09; its sulfur, with the celestine's, 0.24).

The two units can be put side by side on one mineral pair. The ledger books 0.4 % of the gold in
`epithermal_telluride`'s voxel field into its solids. At handbook density its two gold tellurides
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
less (`probe-sigma-maxima.txt`). The feldspar engine's rate is 3·(σ − 1) µm with ±30 % noise
(albite's is 4·(σ − 1) with ±20 %), times the time scale of 5: about 8 mm in one step at σ = 552,
6 to 11 with the noise. The draw-down of §2.1 reaches the pair (31 % of this pocket's stored
thickness was put on at a cell under half the bulk fluid's excess) and does not stop it. The pocket
is full first.

**A/B** (`tools/sim-side-ab.mjs`; the interventions are diagnostics):

| Arm (values at seeds 42 / 1 / 2) | Fill at end, % | First step at fill ≥ 0.999 | Last step anything grew | Feldspar, mm | Tourmaline, mm | Topaz, mm | Spodumene, mm | Lepidolite, mm |
|---|---|---|---|---|---|---|---|---|
| shipped | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `rind=5000`: feldspar and albite stop adding thickness at 5 mm | 21.6 / 22.6 / 19.7 | never | 230 | 10.0 / 10.6 / 7.2 | 12.1 / 11.9 / 11.9 | 2.5 | 3.7 / 1.9 / 5.1 | 4.7 / 4.0 / 3.4 |
| `cap=8`: their σ clamped at 8 | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `fcap=2`: each factor of their σ capped at 2 | 27.2 / 27.0 / 25.9 | never | 230 | 14.3 / 14.4 / 14.6 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `root=3`: their σ replaced by its cube root | 38.8 / 38.5 / 37.2 | never | 230 | 21.6 / 21.8 / 21.7 | 12.0 / 12.0 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `mul=B:10`: ten times the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `mul=B:0.5`: half the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.14 / 0.17 / 0.18 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.017 / 0.013 |
| `cap=8,mul=B:10`: the clamp, and ten times the boron | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `cap=8,mul=B:0.5`: the clamp, and half the boron | 40.5 / 39.9 / 39.5 | never | 230 | 23.9 / 24.4 / 24.5 | 5.6 / 5.6 / 5.4 | 2.5 / 2.5 / 2.4 | 4.2 / 4.9 / 5.1 | 3.7 / 4.5 / 4.0 |

Under `rind=5000` the pair ends at 5.3 to 10.6 mm and not at 5: the engine is refused once a
crystal has reached 5 mm, and the zone that took it there is a whole step's growth.

Three readings follow.

1. *The gems are short of room, not of chemistry.* With the feldspar pair bounded in any of four
   ways, the pocket ends 20 to 42 % full and grows to step 230. Tourmaline reaches 12 mm and grows
   until step 197; topaz appears (six crystals, 2.5 mm) and grows until step 215, through the Late
   Hydrothermal event that narrates it; spodumene and lepidolite reach 2 to 5 mm. Quartz, held to
   1.7 mm by the plug, becomes the largest crystal at 37 mm. The broth and the events were always
   able to grow tourmaline, topaz, spodumene and lepidolite.
2. *It is not boron, and the plug is not what hides it.* The story-pocket proposal's WP8(b) names
   boron starvation as "the hypothesis to test first": "if boron never concentrates in the late
   fluid, the tourmaline is starved". `supersaturation_tourmaline` caps its boron factor at
   `min(B/15, 2.0)` (`js/39-supersat-silicate.ts:869`), so it stops responding at 30 ppm. This broth
   starts at 35 and no event changes it. Ten times the boron therefore moves nothing, in the
   plugged pocket (`mul=B:10`: no species moves at any seed) or in the open one (`cap=8,mul=B:10`:
   every size as with `cap=8` alone). Less boron does move it. At half the boron tourmaline is
   0.14 / 0.17 / 0.18 mm in the plugged pocket and 5.6 / 5.6 / 5.4 mm in the open one; at a quarter
   (`mul=B:0.25`) the plugged pocket keeps one crystal of 0.02 mm. All four of tourmaline's
   concentration factors sit at their caps in this broth (Na 40, B 35, Al 150, SiO2 8,000 ppm
   against ceilings reached at 30, 30, 22.5 and 600), so a residual-concentration term cannot raise
   its σ here, before or after the plug is cured. WP8(b) needs a species whose factor is below its
   cap.
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
  its documented late F-rich topaz pulse"). It ends 92 % full with a 270 mm albite. What keeps the
  larger cavity from sealing is the draw-down of §2.1: 83 % of this pocket's stored thickness is put
  on at a cell under half the bulk fluid's excess, and with every debit returned (`refund=1`) it is
  full at step 23 to 26 and its topaz is gone. With the feldspar pair bounded it ends 0 % full. Its
  tourmaline stays at 1.8 mm and its topaz at 0.6 to 0.7 mm (two more topaz crystals appear at
  seeds 42 and 1): Shigar's gems are small for their own reasons. Its aquamarine has been absent
  since SIM 272 and is absent in all 55 canary seeds; no arm here restores it.

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
proposes about 15 µm (12 to 18 with its ±20 % noise), which the time scale makes about 75 µm in one
step. Of the nine not driven, three proposed the same thickness at every forced σ (calcite,
aragonite, dolomite: their kinetics read the driving force elsewhere), and six proposed nothing at
σ = 2 in any context tried (HMC, and the dehydration products haidingerite, meta-autunite,
metatorbernite, metazeunerite and tincalconite).

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

The census shows what such an engine does to its own cell. It grows at full rate until the cell is
below saturation, stops dead, and resumes when diffusion has refilled it. The galenas of
`sunnyside_american_tunnel` paused that way 156 / 64 / 4 times at the three seeds, and
`reactive_wall`'s 24 / 1 / 0 times. At seeds 42 and 1 they are most of the "cell ran short" pauses
of §2.1.

### 3.3 F3 — radiogenic lead reaches only the bulk handle

`js/85-simulator.ts:1276` adds radiogenic Pb to the fluid once per step per active uraninite:

    this.conditions.fluid.Pb += 0.1 * u_size;

Events, movements, the open-atmosphere equilibration, wall dissolution and ambient cooling write the
bulk handle inside a `_snapshotGlobal` / `_propagateGlobalDelta` pair, which carries the change to
the voxels. This write is outside any pair: it follows the growth loop, and the next snapshot is
taken after it. (The vadose override below is outside a pair as well, but it writes the voxels it
means to change itself.) The census's bulk-against-voxel reading finds it:

| Scenario (seeds 42 / 1 / 2) | Bulk Pb at run end, ppm | Voxel-mean Pb, ppm | Lowest wall cell, ppm | Largest gap, ppm (at step) |
|---|---|---|---|---|
| `radioactive_pegmatite` (starts at 30) | 146.8 / 127.7 / 147.2 | 30.00 | 30.00 | 117 (80) / 98 (81) / 117 (94) |
| `schneeberg` (starts at 5) | 179.0 / 221.8 / 217.5 | 5.00 | 5.00 | 174 / 217 / 212 (all at 160) |

The same reading shows three other kinds of gap. None of them is a write that should have been
carried to the voxels and was not.

- *Authored zone chemistry* (`stalactite_demo`'s Ca and CO3, `zoned_dripstone_cave`'s Mg). It is
  largest at step 0, before anything has run.
- *The vadose override.* When the water level drops, `_applyVadoseOxidationOverride` (`js/85c`)
  raises O2 to at least its target (1.8 by default) and multiplies `concentration` in every voxel
  of the rings that dried, and in each of those rings' own fluid. The equator ring's fluid is the bulk handle. In `wittichen`,
  `roughten_gill`, `supergene_oxidation`, `schneeberg` and `searles_lake` the equator ring dries
  while rings below it stay wet, so the bulk handle takes the dried rings' oxygen and the floor
  keeps its own: `wittichen`'s bulk O2 goes from 0.40 to 1.80 at step 170, and at run end its
  voxel-mean O2 runs from 0.54 in the floor ring to 1.80 in the upper eight. Eh follows O2. This is
  deliberate (the comment there records why the ring's fluid is written as well). It means the bulk
  handle is the equator ring, not a cavity average, wherever the water level has dropped part-way.
  In the four other scenarios where the override fires it dries all 16 rings at once and leaves no
  gap.
- *`concentration` itself.* The simulator keeps that field out of diffusion and out of event
  propagation on purpose (`js/85-simulator.ts`, where `_fluidFieldNames` is built: it is per-ring
  evaporative state). One event writes it on the bulk handle all the same: `event_sabkha_evap`
  (`js/70k-evaporite.ts`) sets it to 7.1 and names it among its replacement fields. In
  `sabkha_dolomitization` the bulk handle reads 7.1 from step 20, through each evaporation phase
  and at run end, while every voxel stays at 1.0. The five minerals whose σ reads `concentration`
  (halite, sylvite, borax, mirabilite, thenardite) are not licensed in that scenario, so nothing
  grows differently for it today: halite, mirabilite and thenardite each sit past σ_crit on the
  bulk handle for 131 steps and read "not licensed".

Radiogenic Pb is the one write to the bulk handle alone that licensed minerals read. The bulk
handle is what the broth panel shows and what nucleation gates read, so the scenario looks
lead-rich while no crystal can reach the lead. `_wallStrangledFor` then blocks births that the bulk
σ admits, because no wall cell clears the threshold.

**A/B** (`pb`: the same increment also lands on every voxel):

| Scenario, arm (seeds 42 / 1 / 2) | Bulk Pb, ppm | Voxel-mean Pb, ppm | Species moved against shipped | Lead minerals |
|---|---|---|---|---|
| `radioactive_pegmatite`, shipped | 146.8 / 127.7 / 147.2 | 30.00 | — | plumbogummite ×2–3 at 0.000 mm; no galena |
| … `pb` | 146.7 / 129.3 / 158.7 | equal to bulk | 1 / 0 / 1 | plumbogummite at 0.000 mm; no galena |
| … `cap=8,pb` (pocket open and lead in the voxels) | 185.0 / 173.8 / 167.1 | equal to bulk | 9 / 12 / 10 | plumbogummite ×3 at 0.053 / 0.047 / 0.048 mm, growing to step 120; no galena |
| `schneeberg`, shipped | 179.0 / 221.8 / 217.5 | 5.00 | — | none |
| … `pb` | 178.9 / 221.7 / 217.4 | equal to bulk | 2 / 1 / 0 | none |

So the defect is real and at present latent. In `radioactive_pegmatite` the pocket is full by step
61 at the latest, and the mineral the lead is meant for cannot form at all. The scenario's
description promises it ("late-stage galena from radiogenic Pb"; "Final cooling (step 100): system
approaches ambient, galena precipitates from the radiogenic Pb"). Galena is not among the 13
species the scenario licenses (albite, autunite, cassiterite, feldspar, lepidolite, morganite, opal,
plumbogummite, quartz, spodumene, topaz, tourmaline, uraninite), and `_runNuc` returns before an
unlicensed species' function runs (§2.3). On the bulk handle galena is past its σ_crit on
33 / 30 / 30 steps of the shipped run, and every one of them reads "not licensed". The licensed
sink is plumbogummite, a deterministic species of the scenario. `_wallStrangledFor` refuses it
6 / 7 / 7 times, and the crystals that are born stay dust: it is present in all 55 canary seeds and
never larger than 0.6 µm. With the pocket open *and* the lead in the voxels (`cap=8,pb`) it grows,
to 0.05 mm.

`schneeberg` licenses no lead mineral. There the radiogenic lead takes plumbogummite and anglesite
past σ_crit on the bulk handle for 72 and 69 steps, neither of them licensed. The σ functions of
several minerals that hold no lead read Pb as well, as a suppression or a competition term, which
is why the `pb` arm still moves 2 / 1 / 0 species there.

**The science.** Radiogenic lead is not released to the fluid as it forms. It is held in the
uraninite (about 19 wt % PbO in unaltered 2 Ga uraninite at Oklo) and leaves when the uraninite is
altered or heated; where reduced sulfur is present it is fixed as galena (Janeczek & Ewing 1995;
Evins, Jensen & Ewing 2005 — both read at abstract level only). The simulator's continuous release
has the mechanism backwards; the event that should release the lead is the one that attacks the
uraninite.

### 3.4 Two notes

**Naica.** `naica_geothermal`'s selenite is 2.75 / 2.81 / 2.87 mm over the canary's 55 seeds. It was
64 mm through v243 and became 1.4 mm at v244, the release that gave the scenario published Ca and
SO4 concentrations and the shared CaSO4 evaluator. On the bulk handle σ now starts at 1.33 and
falls to 1.20 by the last step (`probe-sigma-maxima-naica.txt`): a fluid barely past saturation, as
the release note intends. The scenario's own sources supply a rate and a duration:
1.4 ± 0.2 × 10⁻⁵ nm/s at 55 °C (Van Driessche et al. 2011; checked against the paper's abstract)
and about 500,000 years of stable growth
(García-Ruiz et al. 2007, as the scenario cites it). Together those give 0.22 m per face. The
simulator's 320 steps give 2.8 mm, and `js/13-runtime-state.ts` calls a step "~50,000 years". The
chemistry is honest; the scenario has no way to be given time. Naica is the one scenario where a
physical clock can be pinned to a measurement.

**When a star was lost.** The committed baselines date the loss of several headline crystals, which
is a lead for story-pocket WP1: Naica's selenite at v244; Shigar's aquamarine at v272 (38 mm → none);
`amethyst_geode`'s quartz at v243 and v246 (16.7 → 2.7 → 0.85 mm). `gem_pegmatite`'s tourmaline was
never lost: it was never there.

## 4. What I would change, and in what order

C1, C2 and C3 are SIM bumps and take the two-commit pattern (instrument or wiring first,
byte-identical; then the bump). C4 is a pilot to decide on and C5 a habit. Acceptance is
pre-registered here.

### C1 — bound the feldspar pair (cures F1)

Three shapes were previewed on all 13 scenarios that grow feldspar or albite, at seeds 42, 1 and 2.
All three cure `gem_pegmatite`'s plug with the same gem assemblage. They differ in what else they
move. The table is seed 42. The counts, the scenarios and the species lost are the same at seeds 1
and 2, where under the root `ouro_preto` falls from 32.3 to 0.3 % and from 22.8 to 0.2 % full and
`bisbee` re-deals 7 and 17 species:

| Shape | What it is | Scenarios moved (of 13) | Species lost |
|---|---|---:|---|
| clamp, σ ≤ 8 (`cap=8`) | The product is capped as a whole. Only fluids already past 8 feel it; the saturation boundary and every σ under 8 are untouched. | 7: the three pegmatites, `schneeberg`, `tormiq_alpine_cleft`, `ouro_preto`, `jeffrey_mine` | none |
| factor caps at 2 (`fcap=2`) | Each concentration factor is capped, as the sister silicates' are. Ceiling 8. | 13 | albite and feldspar in `grimsel_alpine_cleft` (6.5 and 5.3 mm shipped) and in `chiastolite_hornfels` (0.7 mm feldspar); `deccan_zeolite`'s feldspar, which never grew |
| per-factor root (`root=3`) | σ → σ^(1/3): the per-ion convention S = (IAP/K)^(1/ν) of the electrolyte crystal-growth literature (Nielsen 1981, read at abstract level), applied to the proxy's three factors. Keeps the saturation boundary. | 13 | none, but `ouro_preto` falls from 28.8 % to 0.3 % full and `bisbee` re-deals 8 species |

I expected to recommend factor caps, the convention the file already follows. The preview refused:
where one ingredient is scarce and another abundant, the uncapped product clears σ = 1 only because
the abundant factor carries it, and a factor cap takes that away. It deletes both feldspars from the
Grimsel cleft, a 6.5 mm albite and a 5.3 mm K-feldspar. Factor caps move the saturation boundary;
for a mineral already calibrated without them, that is a different mineral. The preview used one
ceiling for every factor. Separate ceilings were not tried.

**Recommendation: the clamp**, and applied to the rate inside `grow_feldspar` and `grow_albite`
(`k·min(σ − 1, E)` with each engine's own k, 3 and 4; E = 7 is the previewed σ ≤ 8) so that σ
itself keeps reporting what the proxy says. The preview clamps the σ method, which births read as
well; a clamp on the rate leaves births on the unclamped σ, so C1's bump re-measures this table.
The clamp has a physical reading: far from saturation, growth is limited by transport and stops
scaling with σ. Its value is still a calibration constant, and the outcome is sensitive to it
(`gem_pegmatite`, seed 42; seeds 1 and 2 differ by at most 0.2 mm and three steps):

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
before the pocket fills, which is the argument for C4. A fourth shape, enlarging the cavity as v241
did for Shigar, was not previewed: feldspar still adds about 8 mm a step, any cavity fills in time,
and no locality's pocket should be sized to fit its feldspar.

Pre-registered acceptance for C1's bump:

- `gem_pegmatite` at seeds 42, 1 and 2: fill stays under 0.7 for the whole run, so the fill
  dampener never engages; some crystal stores a positive zone after step 215; tourmaline ≥ 5 mm;
  topaz ≥ 1 mm. (In the table above σ ≤ 4 and σ ≤ 8 meet the fill, tourmaline and topaz bounds;
  σ ≤ 12 and looser do not.)
- The census controls `space+end` (positive) and `time` (negative) fail, and the same commit
  rewrites them.
- Movers are a subset of the 13 scenarios that grow feldspar or albite, and no scenario loses a
  species it grows at seeds 42, 1 or 2 today.
- `shigar_pegmatite` is also run at the 140 mm cavity it had before v241, to learn whether the
  clamp alone keeps that pocket open. That is a measurement, not a reversion: 220 mm is the
  source-bounded cavity (`js/15-version.ts`, v241).

`radioactive_pegmatite` will still plug, on quartz. That is not a reason to cap quartz: its σ is a
solubility ratio, and 245 is what that ratio is in a fluid that cools to 100 °C still holding
15,000 ppm of silica. It is the clearest single case for C4.

### C2 — put the three engines on σ − 1 (cures F2)

Replace `k·σ` by `k'·(σ − 1)` in the three engines. Previewed by rescaling every positive zone of the
three by m·(σ − 1)/σ (largest crystal, mm, at seeds 42 / 1 / 2):

| scenario | mineral | shipped | same constant (m = 1) | three times the constant (m = 3) |
|---|---|---|---|---|
| reactive_wall | galena | 3.9 / 1.1 / 1.1 | 0.74 / 0.72 / 0.69 | 1.6 / 0.39 / 0.39 |
| reactivated_fluorite_vein | galena | 8.5 / 8.5 / 8.5 | 2.0 / 2.0 / 2.0 | 4.9 / 5.0 / 4.9 |
| mvt | galena | 11.5 / 11.7 / 11.6 | 5.0 / 5.1 / 5.1 | 11.8 / 12.0 / 11.9 |
| sunnyside_american_tunnel | galena | 15.4 / 23.2 / 23.1 | 9.3 / 12.5 / 12.3 | 15.4 / 23.7 / 23.3 |
| porphyry | galena | 11.1 / 11.1 / 11.0 | 7.3 / 7.3 / 4.9 | 13.8 / 13.8 / 13.7 |
| roughten_gill | galena | 14.7 / 23.6 / 23.8 | 12.8 / 20.6 / 20.8 | 18.9 / 31.9 / 28.7 |
| schneeberg | uraninite | 8.3 / 7.8 / 7.8 | 5.1 / 4.8 / 4.8 | 11.8 / 12.0 / 11.7 |
| radioactive_pegmatite | uraninite | 6.9 / 5.7 / 6.6 | 5.3 / 4.3 / 4.9 | 13.8 / 11.5 / 13.3 |
| porphyry | molybdenite | 33.4 / 30.9 / 32.9 | 32.1 / 29.7 / 31.5 | 58.2 / 54.2 / 56.9 |

Beyond the three minerals themselves, the same constant moves 1 / 5 / 1 other species across the
eight scenarios and loses none. Raising the constant is not free. At m = 3 `porphyry`'s molybdenite
takes its pocket from 12 % to 48 % full (14 to 54 and 12 to 48 at seeds 1 and 2), and
`roughten_gill`'s galena, 32 and 29 mm at seeds 1 and 2, re-deals 19 and 18 of that scenario's
species and at seed 2 costs it its mottramite.

`reactive_wall` teaches something. With the same constant its galena keeps 19 % of its size at
seed 42, not the 2 % that §3.2's last column predicts. The bulk fluid there is 12 % past saturation
for galena (median σ 1.119), but the galena's own cell sat at a median 1.004: under k·σ the crystal
grew at full rate at saturation and drew its cell down until nothing was left to draw. Under σ − 1
it slows as it nears saturation, the cell is drawn down less, and its σ settles at a median 1.094
(`--trace galena`). That is supply and growth regulating each other, the mechanism of §2.1, and the
k·σ law was replacing it with stop and start. At seeds 1 and 2 the same galena is 1.1 mm as
shipped, on a cell at a median σ of 1.08, and 0.7 mm under σ − 1.

Acceptance: the engine probe reads "vanishes" for all 174 driven engines, and for the three it
reads the shape of a law linear in σ − 1, as it does today for 169 of the 174 (the proposed
thickness at σ = 1.1 and at σ = 1.5 is 0.10 and 0.50 of that at σ = 2, within 0.005); movers are a
subset of the eight scenarios above. Trap: retuning each scenario's Pb or S until galena is its old
size is tuning to a seed. Where galena becomes small, the question is whether that pocket's fluid
is really that close to saturation, which is a question for its sources.

### C3 — keep radiogenic lead in the uraninite (cures F3)

Book the lead in the uraninite as it accrues, and return it to the crystal's own cell when a
dissolution zone removes that shell, which is the path `applyStoichiometricGrowthBudget` already
walks for every booked species. Propagating the bulk write to the voxels instead is a one-line
change that fixes the bookkeeping and keeps the wrong mechanism.

Neither has a preview that fits. The `pb` arm of §3.3 previews the propagation, the mechanism this
recommendation turns down; book-and-release takes the 98 to 217 ppm of radiogenic lead off the
bulk handle altogether, which no arm here does.

The description of `radioactive_pegmatite` needs a ruling with it. It promises galena, and the
scenario does not license galena (§3.3). Either the license gains galena, with a source for galena
in that pocket, or the two sentences go.

Acceptance: the census control `two-fluids` (positive) fails and is rewritten as a negative; bulk Pb
and voxel-mean Pb stay within 1 % of the field's scale of each other in both uraninite scenarios (the
bound the negative control puts on `mvt`'s Ca); and no lead mineral is born that never stores a
positive zone, where today plumbogummite is.

### C4 — give supply a scale above the cell (S1, S2, S3; the larger direction)

Not a fix; a pilot to decide on. Today supply acts at one scale, the cell, at a price the source
calls not physical, and it regulates rate without ever limiting a total (§2.1). Three pieces would
give it the scales above, and each exists in part:

1. **A debit that scales with what is deposited.** A zone's cost becomes the volume it adds times a
   density over a formula mass, against the water its voxel holds, in place of a constant per
   micrometre. At that price the cavity's inventory matters: §2.6 has today's crystals holding up
   to thousands of cavity-volumes of their binding element. The census carries the first 60
   densities and compositions; the reservoir work of PRs #35–#39 and #42 carries the unit
   discipline.
2. **A feed.** Each step the voxel field relaxes toward a feed composition by a fraction set by
   `flow_rate`. With a physical debit a sealed pocket (`flow_rate` near 0) runs down what it holds,
   and a flushed one is held near its feed. Today nothing refills the field and nothing needs to.
   The events already author the number.
3. **A clock.** With a feed in cavity-volumes per step and a rate in metres per second, a step
   acquires a duration. Naica pins it.

What it would buy, if it works: a phase stops when it has taken what its pocket held and was fed,
without a cap and without the cavity having to fill; what it did not take is left for the next
phase (story-pocket WP8(b)); `flow_rate` and the sealing events mean something; and quartz in
`radioactive_pegmatite` stops when the silica is gone.

What may make it fail: several broths are abstractions that a physical debit would starve, so the
pilot's first output is a list of the scenarios whose broth cannot be read at face value. It moves
every scenario (a flood, in the word of `PROPOSAL-O5-SPLITTING-LADDER-2026-07-10.md`), so it is
piloted on one scenario behind a per-scenario flag, byte-identical elsewhere. `gem_pegmatite` is
the natural first: after C1 it has an open pocket, eight authored flow values and a closed-system
story to earn.

Pre-registered acceptance for the pilot:

- With the feed off and the price at today's constant, the piloted scenario reproduces the unpiloted
  run, and the fleet outside the flag is byte-identical.
- With the pilot on, the census's cavity-scale share (what the solids hold ÷ the most the field ever
  held, §2.1) passes 10 % for at least one ingredient. The largest in `gem_pegmatite` today is
  potassium's 0.03 %, 2.4 voxels' worth.
- The feldspar pair's pauses read "its cell ran short of an ingredient", and no crystal reads
  "pocket full".

### C5 — keep the census

Run `tools/sim-side-census.mjs` at each SIM bump, as `baseline-diff` is. It takes about 25 minutes
a seed and answers what the baselines cannot: not what grew, but what slowed it and why it
stopped. It is worth keeping only as far as its readings are guarded: the mutation tool runs with
it, and a reading without a control (§1 names three) stays labelled as one.

## 5. Traps

1. **Do not fix F3 by debiting or re-syncing the bulk handle.** The bulk handle is deliberately not
   debited by growth (`js/85b`, the comment above `_wallStrangledFor`); nucleation reads it as the
   feed. The one field that does follow the voxels is deliberate too: under a carbonate boundary the
   bulk handle's CO3 and pH are set each step to the mean over the wet voxels (`js/85c`). F3 is one
   write to the bulk handle alone, not a reason to merge the two fluids.
2. **A feldspar cap is a calibration constant, not physics.** It removes a runaway; it does not make
   feldspar stop for a reason. C4 would.
3. **Bounding feldspar moves the plug to quartz in `radioactive_pegmatite`** (98 % full, a 53 to
   55 mm quartz).
4. **Boron is not the lever in `gem_pegmatite`.** Tourmaline's boron factor is at its cap before and
   after C1 (§3.1). A residual-concentration test (WP8(b)) run on that tourmaline reads "no effect"
   whatever the mechanism does.
5. **Four controls sit on today's defects, and flip.** The commit that cures F1 rewrites
   `space+end` (positive) and `time` (negative). The one that cures F3 rewrites `two-fluids`
   (positive), and `count` (positive) too if galena is licensed. Otherwise the census reports a
   regression that is the fix.
6. **Beryl stays absent after C1** (W1). Do not count it against C1.
7. **"Dissolving" in §2.2 is not "dissolved".** A crystal that took a negative zone and kept solid is
   still surviving, and is filed under "dissolving" if it never grew again. The `dissolved` flag
   means no solid is left (`js/27`); at seed 42 the 70 crystals that carry it hold nothing.
8. **A cell read after the step is a cell that has been refilled.** Diffusion runs at the end of
   every step. The first version of this census read a stopped crystal's σ then, and filed starved
   crystals as saturated. The engine's view has to be read at the dry run.
9. **The bulk handle is the equator ring.** After a partial drop in water level its O2, Eh and
   `concentration` are those of the dried rings, not a cavity average (§3.3).

## 6. Decisions for the boss

1. **C1's shape:** the clamp (recommended), factor caps, or the per-factor root; and the clamp's
   value, which the outcome is sensitive to (§4, C1).
2. **C2's constant:** keep each k and let galena shrink where its fluid is barely saturated, or
   re-fit k at one reference scenario. And whether the galena of `reactive_wall` and
   `sunnyside_american_tunnel` should then be grown by a sourced change to the fluid or accepted
   small.
3. **C3's mechanism, and `radioactive_pegmatite`'s promise:** book-and-release (recommended) or
   propagate; and whether that scenario's license gains galena, with a source, or its description
   loses the two sentences that promise it.
4. **C4:** whether to pilot it, and who owns it. It overlaps the reservoir arc of PRs #35–#39 and
   #42, and one finding should have one owner.
5. **C5:** whether the census, with its mutation tool, joins the SIM-bump routine.
6. **Order against the open ladders.** My proposal: C1 first, because it is the one change that
   gives `gem_pegmatite` back seven of its eight events and four of its species (tourmaline, topaz,
   spodumene, lepidolite); C3 with it, since C1 also opens `radioactive_pegmatite`, where F3 is
   latent; C2 as a rung of its own beside the recipe review's R2 → R9; C4 after the ruling on 4.
   Story-pocket WP8(b) waits on none of them, and should not be tested on `gem_pegmatite`'s
   tourmaline (trap 4).

## 7. Limits

- **Seeds.** The census and the A/Bs ran at three seeds. Fleet-wide counts are quoted at 42 and
  tabulated at all three. The canary's 55 seeds are used for §2.4 and for the spread of a few named
  crystals.
- **Draw-down is read against the bulk handle.** The reference is the bulk handle's fluid at the
  cell's temperature, so the reading sees every way the two fluids differ, not only consumption.
  The ingredient test separates them: what it does not restore is filed apart (the "otherwise"
  share of §2.1, and 1,869 / 1,593 / 1,768 crystal-steps spent below saturation on such a cell,
  most of them in `searles_lake`, whose bulk handle and voxels differ in `concentration`). In
  `zoned_dripstone_cave` 81 / 53 / 78 % of the stored thickness grew where the bulk handle itself
  is at or under saturation, because its ceiling zone is authored richer than the bulk. The two
  thresholds, 0.5 and 0.9 of the reference's excess, are choices. The ingredients are the formula
  species only; a trace the ledger also debits is not restored.
- **The END reading files a crystal once.** σ is read at the dry run of the stop step; fill,
  enclosure and activity at the end of that step. A crystal that paused many times is filed under
  its last stop. The pauses are counted separately, one for every stop, so one mineral in one
  scenario can dominate them, as the galenas of §3.2 do.
- **The count reading.** It is taken when the nucleation pass starts, on the bulk fluid that pass is
  about to read. The four scenario tests are the simulator's own functions, called. The count-gate
  attribution is a static reading of the source, in the forms the tool's header lists: 61 of the
  169 functions show no gate in those forms, and a function that counts its own species another way
  is read as having none. Where a gate keeps a side door (62 functions) a species-step filed under
  it could still have rolled. The cap share and the single-crystal count are exact. Above fill 0.7
  `_atNucleationCap` also refuses births with a probability set by the fill dampener; the census
  does not attribute a species-step to it. The 15 species with no nucleation function of their own
  (the beryl and corundum families, which share a nucleator, and seven transformation products) are
  not in the reading.
- **The engine probe calls engines outside `run_step`.** That isolates the engine's own law, which is
  the point, and means it says nothing about what competition, the dampener or the time scale do
  afterwards. §3.2's second table does.
- **The supply share is measured against a peak.** "The most the voxel field ever held" is the
  largest end-of-step sum over all voxels. A fluid that events refill can pass more of a solute
  through than it ever held at once, so a share could exceed 100 %. None exceeds 2 %.
- **Throughput is order-of-magnitude, and has no control.** Densities are entered by hand; ppm are
  taken at face value; the water is 1 g/cm³ and fills the cavity; the volume is the booked
  `_volume_mm3`, the fill authority, not the renderer's completed solid. Sulfur is read from the
  total `S` field. A mineral without an entry is not priced (the report gives the priced share of
  each scenario's volume; native gold is one such).
- **The interventions are diagnostics, not proposed rules.** `refund` returns what the ledger booked
  for a zone, formula and trace species alike, and leaves the solid's booked inventory in place, so
  a crystal that later dissolves returns it a second time: the arm is an unlimited local source,
  not a closed system. `cap`, `fcap` and `root` wrap a σ method on the scenario's conditions
  object. Growth, the nucleation gates and the strangulation test all read that method. So does
  the localized-nucleation envelope of `js/85b`, which captures whatever method it finds there when
  a nucleation pass starts. Four scenarios install that envelope at seed 42 (`naica_geothermal`,
  `stalactite_demo`, `wittichen`, `zoned_dripstone_cave`), and none grows a mineral whose σ method
  an arm of this review wraps. In three of them, pass-through wrappers on minerals they do grow
  were called under the envelope 192,000 to 576,000 times and the runs still reproduced the
  baseline (`probe-nucleation-envelope.txt`, `-per-vertex.txt`). `fcap` is exact for the product
  and does not re-derive the functions' subtractive acid term. `excess` and `pb` have no neutral
  setting to self-check against.
- **Not examined:** which difference between the two fluids produced each `_wallStrangledFor`
  verdict; whether the bulk-only `concentration` of `sabkha_dolomitization` matters beyond the
  license check of §3.3; the carbonate and sulfate solubility kernels, the thermal field, physical
  dissolution, the cavity geometry, the renderer, the agent API.
- **Citations.** The rate and temperature quoted from Van Driessche et al. 2011 were checked
  against the paper's abstract. Janeczek & Ewing 1995, Evins et al. 2005 and Nielsen 1981 were read
  at abstract level through search results, not in full. García-Ruiz et al. 2007 is cited as the
  scenario cites it.

## 8. Reproduce

Windows x64, Node 24.15.0, from the repository root, after `npm ci` and `npm run build`. The heavy
runs are independent and can run side by side.

```text
node tools/sim-side-census.mjs                       # seed 42, about 25 min; report in .local-evidence/sim-side-census/seed-42/
node tools/sim-side-census.mjs --seed 1
node tools/sim-side-census.mjs --seed 2
node tools/sim-side-census-mutations.mjs             # about 20 min
node tools/rate-at-saturation-census.mjs             # a few minutes
node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/2026-11-04/v286

node tools/sim-side-ab.mjs --arm refund=1 --seeds 42 <all 41 scenarios>      # and --seeds 1, --seeds 2: three files
node tools/sim-side-ab.mjs --arm rind=5000 --arm cap=8 --seeds 42,1,2 gem_pegmatite radioactive_pegmatite shigar_pegmatite
node tools/sim-side-ab.mjs --arm fcap=2 --arm root=3 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm mul=B:10 --arm mul=B:0.5 --arm mul=B:0.25 --arm cap=8,mul=B:10 --arm cap=8,mul=B:0.5 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm cap=8 --arm fcap=2 --arm root=3 --seeds 42,1,2 bisbee chiastolite_hornfels deccan_zeolite epithermal_telluride gem_pegmatite grimsel_alpine_cleft jeffrey_mine ouro_preto porphyry radioactive_pegmatite schneeberg shigar_pegmatite tormiq_alpine_cleft
node tools/sim-side-ab.mjs --arm cap=8 --minerals feldspar,albite,quartz --seeds 42,1,2 radioactive_pegmatite gem_pegmatite
node tools/sim-side-ab.mjs --arm pb --arm cap=8,pb --seeds 42,1,2 radioactive_pegmatite schneeberg
node tools/sim-side-ab.mjs --arm excess=1 --arm excess=3 --minerals galena,molybdenite,uraninite --seeds 42,1,2 mvt porphyry radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill schneeberg sunnyside_american_tunnel
node tools/sim-side-ab.mjs --arm cap=4 --arm cap=8 --arm cap=12 --arm cap=16 --arm cap=24 --arm cap=48 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm excess=1 --minerals galena --trace galena --seeds 42,1,2 reactive_wall

node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs
node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs --minerals selenite,celestine naica_geothermal
node proposals/evidence/sim-side-2026-11-09/probe-baseline-history.mjs <vugg-canary>/logs/2026-11-04/v286
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs --minerals selenite,celestine,calcite,aragonite,anhydrite naica_geothermal stalactite_demo zoned_dripstone_cave
node proposals/evidence/sim-side-2026-11-09/probe-ab-digest.mjs      # reads the committed A/B outputs; runs nothing

npm run audit:runtime
npm run typecheck
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
```

The five tools write only under `.local-evidence/`, the directory the test identity guard excludes,
and exit 0 whatever they find. The four probes print and write nothing. The outputs quoted in this
document are committed in `proposals/evidence/sim-side-2026-11-09/`, and the README there gives the
exact command behind each file, the 41 scenario names of the `refund` runs included. The three
census reports and the mutation report each name the sha256 of `tools/sim-side-census.mjs` as it
ran, and it is the committed file's. A census row is cached under a digest that includes the text
of the code that produces it, so a row cannot outlive a change to that code.

The six gates pass on this tree. **The full suite** (`npm run ci`, about 2.5 hours cold) is not part
of this commit's evidence: it is run on the tip of the branch, and its verdict is recorded on the
pull request. The repository's chip selector (`tools/test-chip-check.mjs`) has none of this
change's paths in its authored map, so it offers no bounded test set for it; its own answer for
such a change is a full check. No file the suite reads is changed, and no test was added.

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
(census v4, SIM 286; 41 of 41 runs reproduce the baseline).

#### Space and time

| scenario | steps | fill at end | first step at fill ≥ 0.7 | ≥ 0.999 | last step any crystal grew | largest crystal | what ended its growth |
|---|---:|---:|---:|---:|---:|---|---|
| amethyst_geode | 240 | 0.0 % | — | — | 213 | quartz 0.85 mm | a zone proposed and not stored (step 214) |
| asbestos_hills_crack_seal | 110 | 0.2 % | — | — | 110 | siderite 7.5 mm | dissolving (step 58) |
| asbestos_hills_surficial_alteration | 120 | 0.3 % | — | — | 120 | siderite 7.1 mm | dissolving (step 58) |
| bisbee | 340 | 95.6 % | 204 | — | 340 | malachite 66.0 mm | undersaturated on its cell and on the bulk handle (step 265) |
| chiastolite_hornfels | 120 | 0.0 % | — | — | 120 | andalusite 1.2 mm | the run ended |
| colorado_plateau | 180 | 1.1 % | — | — | 180 | uranophane 12.6 mm | the run ended |
| cooling | 100 | 0.0 % | — | — | 100 | quartz 0.57 mm | the run ended |
| deccan_zeolite | 200 | 0.2 % | — | — | 200 | quartz 8.3 mm | undersaturated on its cell and on the bulk handle (step 160) |
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
| pulse | 100 | 0.0 % | — | — | 80 | siderite 0.12 mm | undersaturated on its cell and on the bulk handle (step 81) |
| radioactive_pegmatite | 120 | 100.0 % | 37 | 61 | 80 | albite 61.4 mm | pocket full (step 62) |
| reactivated_fluorite_vein | 160 | 22.8 % | — | — | 160 | calcite 38.4 mm | undersaturated on its cell and on the bulk handle (step 124) |
| reactive_wall | 120 | 0.1 % | — | — | 120 | sphalerite 6.6 mm | the run ended |
| roughten_gill | 240 | 15.0 % | — | — | 240 | galena 14.7 mm | undersaturated on its cell and on the bulk handle (step 60) |
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
| undersaturated on its cell and on the bulk handle | 288 (25.2 %) | 138 (24.3 %) |
| its cell ran short of an ingredient | 17 (1.5 %) | 4 (0.7 %) |
| undersaturated on its cell only, not through its ingredients | 10 (0.9 %) | 6 (1.1 %) |
| at or above saturation on its cell, nothing proposed | 27 (2.4 %) | 4 (0.7 %) |
| a zone proposed and not stored | 2 (0.2 %) | 1 (0.2 %) |
| enclosed | 213 (18.7 %) | 8 (1.4 %) |
| dissolving | 61 (5.3 %) | 41 (7.2 %) |
| size cap | 17 (1.5 %) | 17 (3.0 %) |
| never grew | 42 (3.7 %) | 0 (0.0 %) |
| no sigma method | 6 (0.5 %) | 6 (1.1 %) |
| all | 1142 | 568 |

#### Draw-down

| scenario | stored, mm | cell excess ≥ 0.9 of the reference's | 0.5–0.9 | under 0.5 | … through its ingredients | … otherwise | reference at or under saturation | starved crystal-steps | crystals ≥ 1 mm mostly grown under 0.5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| amethyst_geode | 1.2 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 0 |
| asbestos_hills_crack_seal | 56.4 | 81.4 % | 18.6 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 14 |
| asbestos_hills_surficial_alteration | 64.6 | 82.4 % | 17.6 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 17 |
| bisbee | 345.1 | 63.8 % | 36.2 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 2 | 0 of 40 |
| chiastolite_hornfels | 6.2 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 119 | 0 of 5 |
| colorado_plateau | 71.5 | 29.5 % | 33.8 % | 36.7 % | 36.7 % | 0.0 % | 0.0 % | 0 | 3 of 13: uranophane ×3 |
| cooling | 0.6 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 0 |
| deccan_zeolite | 52.7 | 87.1 % | 12.9 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 15 | 0 of 16 |
| elmwood | 71.8 | 77.2 % | 22.8 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 9 |
| epithermal_telluride | 154.1 | 40.4 % | 5.4 % | 54.1 % | 54.1 % | 0.0 % | 0.0 % | 27 | 7 of 22: sylvanite ×2, calaverite ×2, hessite ×3 |
| gem_pegmatite | 107.3 | 26.2 % | 42.4 % | 31.4 % | 31.4 % | 0.0 % | 0.0 % | 3 | 0 of 5 |
| great_salt_plains | 113.5 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 8 |
| grimsel_alpine_cleft | 75.7 | 56.1 % | 43.9 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 3 | 0 of 18 |
| jeffrey_mine | 144.8 | 67.8 % | 32.2 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 32 | 0 of 23 |
| mvt | 85.7 | 59.0 % | 31.8 % | 9.3 % | 9.3 % | 0.0 % | 0.0 % | 1 | 4 of 15: greenockite ×4 |
| naica_geothermal | 15.3 | 24.3 % | 75.7 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 7 |
| ouro_preto | 155.2 | 38.3 % | 61.7 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 8 | 0 of 15 |
| porphyry | 231.8 | 19.1 % | 58.2 % | 22.8 % | 22.8 % | 0.0 % | 0.0 % | 0 | 5 of 29: molybdenite ×2, ferrimolybdite ×3 |
| pulse | 0.2 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 8 | 0 of 0 |
| radioactive_pegmatite | 292.3 | 20.6 % | 29.1 % | 50.3 % | 50.3 % | 0.0 % | 0.0 % | 0 | 6 of 18: feldspar ×2, morganite ×3, albite ×1 |
| reactivated_fluorite_vein | 103.5 | 72.2 % | 14.2 % | 13.6 % | 13.6 % | 0.0 % | 0.0 % | 1 | 6 of 24: galena ×1, greenockite ×4, acanthite ×1 |
| reactive_wall | 11.3 | 66.4 % | 0.6 % | 33.0 % | 33.0 % | 0.0 % | 0.0 % | 30 | 1 of 2: galena ×1 |
| roughten_gill | 147.0 | 45.3 % | 28.2 % | 26.5 % | 26.5 % | 0.0 % | 0.0 % | 151 | 4 of 32: galena ×4 |
| sabkha_dolomitization | 122.9 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 15 |
| schneeberg | 217.0 | 56.2 % | 42.0 % | 1.8 % | 0.0 % | 1.8 % | 0.0 % | 126 | 3 of 25: uranophane ×3 |
| searles_lake | 160.8 | 97.8 % | 2.2 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 10 |
| shigar_pegmatite | 782.3 | 7.6 % | 9.3 % | 83.1 % | 83.1 % | 0.0 % | 0.0 % | 7 | 4 of 8: feldspar ×2, albite ×2 |
| sicily_solfifera | 71.9 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 15 |
| stalactite_demo | 0.9 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 0 |
| sulphur_bank | 186.5 | 21.1 % | 65.3 % | 13.6 % | 13.6 % | 0.0 % | 0.0 % | 0 | 1 of 26: metacinnabar ×1 |
| sunnyside_american_tunnel | 142.0 | 12.1 % | 66.5 % | 21.4 % | 21.4 % | 0.0 % | 0.0 % | 1062 | 5 of 16: tennantite ×1, galena ×4 |
| supergene_oxidation | 463.9 | 30.8 % | 45.2 % | 24.0 % | 9.1 % | 14.9 % | 0.0 % | 85 | 6 of 66: ferrimolybdite ×6 |
| tn457_barite_pulses | 31.2 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 7 |
| tormiq_alpine_cleft | 241.1 | 4.3 % | 77.3 % | 18.4 % | 18.4 % | 0.0 % | 0.0 % | 0 | 1 of 16: feldspar ×1 |
| tutorial_first_crystal | 0.1 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 0 |
| tutorial_mn_calcite | 2.7 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 1 |
| tutorial_travertine | 4.0 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 2 |
| ultramafic_supergene | 57.1 | 100.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 192 | 0 of 8 |
| wittichen | 67.7 | 76.6 % | 23.4 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 0 | 0 of 17 |
| zoned_dripstone_cave | 7.2 | 18.7 % | 0.0 % | 0.0 % | 0.0 % | 0.0 % | 81.3 % | 0 | 0 of 4 |

#### Two fluids

| scenario | field | largest gap between the bulk handle and the voxel mean | at step | at run end: bulk | voxel mean | wall minimum |
|---|---|---:|---:|---:|---:|---:|
| schneeberg | Pb | 174 (97.2 %) | 160 | 179 | 5.00 | 5.00 |
| sabkha_dolomitization | concentration | 6.10 (85.9 %) | 20 | 7.10 | 1.00 | 1.00 |
| radioactive_pegmatite | Pb | 117 (79.6 %) | 80 | 147 | 30.0 | 30.0 |
| stalactite_demo | Ca | 425 (41.5 %) | 0 | 600 | 1025 | 600 |
| stalactite_demo | CO3 | 425 (41.5 %) | 0 | 600 | 1025 | 600 |
| roughten_gill | concentration | 1.00 (33.3 %) | 180 | 3.00 | 2.00 | 1.00 |
| supergene_oxidation | concentration | 0.88 (29.2 %) | 70 | 3.00 | 2.13 | 1.00 |
| schneeberg | concentration | 0.75 (25.0 %) | 110 | 3.00 | 2.25 | 1.00 |
| searles_lake | concentration | 0.50 (16.7 %) | 30 | 3.00 | 2.50 | 1.00 |
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
| `census-seed-42.txt`, `census-seed-1.txt`, `census-seed-2.txt` | §2 and §3.3 |
| `census-mutations.txt` | §1 |
| `ab-refund-seed-42.txt`, `-seed-1.txt`, `-seed-2.txt` | §2.1: every debit returned to its cell, all 41 scenarios |
| `ab-pegmatites-rind-clamp.txt` | §3.1 A/B table (rind, clamp); the other two pegmatites |
| `ab-gem-factor-caps-root.txt` | §3.1 A/B table (factor caps, root) |
| `ab-gem-boron.txt` | §3.1: tourmaline against the boron, in the plugged pocket and the open one |
| `ab-feldspar-13-scenarios.txt` | §4 C1: what each shape moves in the 13 scenarios that grow feldspar or albite |
| `ab-quartz-also-clamped.txt` | §3.1: radioactive_pegmatite with quartz bounded as well |
| `ab-radiogenic-lead.txt` | §3.3 A/B table |
| `ab-rate-on-excess.txt` | §4 C2 preview table |
| `ab-gem-clamp-sensitivity.txt` | §4 C1: sensitivity to the clamp value |
| `ab-reactive-wall-trace.txt` | §4 C2: galena sigma on the bulk handle and on its own cell |
| `rate-at-saturation.txt` | §3.2; the shape test of §4 C2 |
| `seed-variety.txt` | §2.4 |
| `probe-sigma-maxima.txt`, `probe-sigma-maxima-naica.txt` | §3.1 (cause), §3.4 |
| `probe-baseline-history.txt` | §3.1, §3.4 |
| `probe-nucleation-envelope.txt`, `probe-nucleation-envelope-per-vertex.txt` | §7 |
| `probe-ab-digest.txt` | the counts §2.1, §3.1 and §4 draw from the A/B outputs |
