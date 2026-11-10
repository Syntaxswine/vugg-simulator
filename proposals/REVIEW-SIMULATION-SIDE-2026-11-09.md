# Simulation-side review: what ends a crystal's growth (2026-11-09)

**Status:** a review and five passive instruments. Nothing under `js/`, `data/` or `tests-js/`
changes, no baseline or receipt moves, and SIM stays 286.
**Base:** `origin/main` `e86ba58a`. `canonical/main` (`915ed33a`) is a merge whose tree is identical
to that of `c2651d4f`, an ancestor of this base, so it holds no change this base lacks.
**Asked by the boss, 2026-11-09:** "take a look at vugg simulator and see if you see any improvements
of the simulation side of things."
**Awaits the boss:** the seven decisions in §6. No fix is applied here. C1, C2 and C3 are each a
SIM bump with a shape to choose. §4 previews each of them by A/B, and says where a preview is
missing.

Terms used throughout. *σ* is the simulator's supersaturation ratio for a mineral; 1 is saturation,
and σ − 1 is the *excess*. *σ_crit* is the registry's nucleation threshold for a mineral
(`MINERAL_GATES_REGISTRY`). The *bulk handle* is `conditions.fluid`, the one fluid object that events
write and nucleation reads. The *voxel field* is the 7,680 fluid cells (16 rings × 120 cells × 4
depths) that crystals grow from, and a crystal's *own cell* is the wall voxel it sits on. A mineral's
*ingredients* are the formula species the ledger debits for it. A *zone* is one step's growth layer
on one crystal. A crystal is *surviving* when the baseline's own split does not count it as
dissolved, which since `js/27` recomputes the flag on every negative zone means it has solid left.
In an A/B a species is *present* in a run when at least one of its crystals has solid left at the
end. A crystal that dissolved away, or was born and never grew, leaves a record and no solid, and
a record is not presence. A species is *lost* when it is present as shipped and not under the arm,
and *gained* the other way round. It is *moved* when it is present in both and its number of
crystals with solid changes, or its largest crystal changes by a factor of more than 1.25 either
way (so a shrink of a fifth counts; the factor is taken on the sizes plus one micrometre, so that
two specks do not count). A scenario is moved when any of its species is moved, gained or lost.
That is a coarser test than a baseline's: a scenario's *baseline differs* when the per-species
summary the committed baseline stores (counts, and the largest size to 0.1 µm) is not the shipped
one, and the A/B tool reports both. The changes proposed in §4 are numbered C1 to C5; "R" numbers
in this document are always the rungs of the mineral-recipe review.

## 0. Summary

The summer's reviews examined which minerals may form. This review looked at the other half: once a
crystal is admitted, what makes it grow, and what makes it stop.

A crystal draws on one cell of the fluid, the voxel it sits on, and diffusion refills that cell from
its neighbours. That is the only supply limit the simulator has, and it works: returning every
debit to its cell moves 26 of the 41 scenarios, and changes the baseline of 38 (§2.1). Nothing
above the cell binds. The cavity's inventory is never dented, the bulk handle that nucleation reads
is never debited, and the flow rate the events author feeds nothing. So a crystal that is slowed is
seldom stopped. It grows until the run ends, the pocket fills, an event moves the chemistry or a
neighbour buries it (§2.2), and scenarios pile up at two extremes: six pockets end more than 70 %
full and 28 of the 41 end less than 10 % full. Three defects sit on that structure (§3), and each
has an A/B.

| | Finding | Measured (seed 42 unless said) | § |
|---|---|---|---|
| S1 | Supply binds at the crystal's own cell and nowhere above it | In 13 of the 40 scenarios that grow anything, more than a tenth of the stored thickness was put on at a cell under half the bulk fluid's excess (9 without the feldspar pair's own growth, which F1 is about); in 25, under 1 %. 56 of the 568 surviving crystals ≥ 1 mm stored most of their growth that way; 8 of them are feldspars or albites, and for 9 a redox or pH gap is part of the cause. The surviving solids hold a median 0.008 % of the most the whole field ever held of each solute (0.6 of one voxel's worth), and at most 1.7 %. | 2.1 |
| S2 | Growth ends by the clock, the cavity, an event or burial | 321 of the 568 surviving crystals ≥ 1 mm (56.5 %) are still growing on the final step, and 4 made their last stop because their cell ran short. 17 of 41 pockets end ≤ 1 % full and 6 end > 70 % full. | 2.2 |
| S3 | `flow_rate` is authored and feeds nothing | 103 assignments in 22 event files, 11 event lines of scenario data and a Creative slider. No engine, supply or nucleation code reads it. In the 41 scenarios its one reader is the wall's scallop record. | 2.5 |
| F1 | The pegmatite pocket plugs | `gem_pegmatite` is full at step 9–10 of 230 at seeds 42, 1 and 2; 7 of its 8 events fire into a full pocket. With feldspar and albite bounded, tourmaline reaches 12 mm and topaz appears. Boron is not the lever: tourmaline's boron factor is already at its cap. | 3.1 |
| F2 | Three engines propose growth at saturation | Of 183 engines the probe drives 174. Of those, 171 propose a rate that vanishes at σ = 1; galena, molybdenite and uraninite propose half their σ = 2 rate. `reactive_wall`'s galena put on 88 % of its 3.9 mm below σ 1.05. | 3.2 |
| F3 | Radiogenic lead reaches only the bulk handle | Bulk Pb climbs 30 → 147 ppm (`radioactive_pegmatite`) and 5 → 179 ppm (`schneeberg`); every voxel stays at 30.00 and 5.00. Latent while that pocket plugs. The galena that `radioactive_pegmatite`'s description promises is not among the species the scenario licenses. | 3.3 |
| — | Counts are authored; a seed changes sizes more than species | Known (story-pocket WP7 and WP9; PR #45). Re-measured in §2.3 and §2.4 because they belong to the same structure. | 2.3, 2.4 |

§4 proposes an order: bound the feldspar pair in `gem_pegmatite` (C1, F1); put the three engines
on σ − 1 (C2, F2); carry the radiogenic lead to the voxels (C3, F3); and pilot a supply with a
scale above the cell — a physical debit, a feed from the `flow_rate` the events already author,
and a clock (C4; S1–S3). C1 comes with a choice that §4 tabulates and §6 puts to the owner. A
bound authored on that one scenario changes one baseline. The same bound written into the engines
for every scenario changes eight, empties Shigar's pocket, and leaves `schneeberg` without native
arsenic and native bismuth at seeds 1 and 2 and without cobaltite at seed 1, all three of them
species that scenario expects.

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

**Corrections to the second version** (commit `80310163`). Its second review round found one count
wrong and several statements incomplete, three of them in what the owner is asked to decide.

- The `refund` arm counted `tutorial_travertine` as moved by supply. The arm had tripped the
  carbonate boundary's audit, which paused that scenario's CO2 vent (§5, trap 10). With the arm
  repaired the scenario does not move, and the counts are 26 / 27 / 25 of 41, not 27 / 28 / 26.
- C1's clamp was said to move seven scenarios and lose nothing. It shrinks the feldspar pair
  wherever their σ passes the clamp: `tormiq_alpine_cleft`'s albite from 66 to 27 mm,
  `schneeberg`'s feldspar from 28 to 10 mm, Shigar's albite from 270 to 10 mm. §4 tabulates that,
  and previews the clamp on the rate, which is the shape recommended; the first two versions
  previewed a clamp on σ. (The third version still said the clamp loses no species. It does; see
  below.)
- C3 had no preview. The third version added one, and both the preview and the mechanism it was
  attached to were wrong (below).
- C4's third acceptance line was posed on pauses, which an engine linear in σ − 1 does not take.
  It is restated (§4, C4).
- "The cell differs from the bulk handle in something else, and §3.3 takes that up" was not
  checked. The census now names the field: oxygen for `supergene_oxidation`'s ferrimolybdite, and
  pH, across a hard edge in a σ function, for `schneeberg`'s uranophane (§2.1).
- The count reading was taken on the bulk handle in the four scenarios where the nucleation pass
  reads a maximum over the wall cells instead, and "eight of every nine" counted gates that keep a
  side door (§2.3).
- "Dissolving is the same thing carried further" was untested. Four crystals of 1 mm or more
  dissolve while the bulk handle reads past saturation (§2.2).
- The bulk handle was called "the equator ring". It is one fluid object that nothing diffuses
  (§3.3).

**Corrections to the third version** (commit `aed783b2`). Its third review round found that two of
the three recommended fixes went to the owner with wrong costs, and one of those with a mechanism
that cannot work.

- "The clamp loses no species" was false. The A/B tool counted a species as present while any
  record of it remained, and a crystal that has dissolved away leaves a record. Read as solid
  left, the clamp at E = 7 in every scenario leaves `schneeberg` without native arsenic and native
  bismuth at seeds 1 and 2, and without cobaltite at seed 1. All three are species that scenario
  expects. The same reading corrects what was said of the root, of factor caps and of C2's larger
  constant (§4). The tool now reports presence as solid left, and says for every arm whether the
  scenario's baseline would differ.
- The cost given for C3 was an artefact. The `nopb` arm took the radiogenic lead off the bulk
  handle by subtracting it again; (30 + a) − a came out a rounding error under 30, and
  plumbogummite's σ is zero below 30. With the value restored exactly the mineral is not lost
  (§3.3, §3.4).
- C3's recommended mechanism could not have worked. Lead returned to the uraninite's own cell
  never reaches the bulk handle, and births read the bulk handle. C3 is now the write that was
  previewed, with its timing left as a choice (§4, C3).
- C1 recommended one clamp for every scenario and named a bound on `gem_pegmatite` alone as a
  fallback, with no mechanism and no cost. The scoped bound is now the recommendation, and the
  general clamp's cost is set out beside it (§4, C1; §6).
- The clamp table gave four of its six values on seven scenarios only, and called `bisbee`
  unmoved at E = 7 where its baseline would differ. Every tabulated value is now run on all 13
  scenarios that grow the pair.
- The headline for S1 leaned on the defect of F1. Four of its 13 scenarios are there through the
  feldspar pair's own growth, and the control guarding the reading sat on Shigar's albite (§2.1).
- §2.3's "seven in ten" is a lower bound and its side-door share an upper bound: every side door
  is a roll behind a σ threshold of its own (§2.3).
- The four azurites of §2.2 were reported and not explained. An event's write lands the bulk
  handle exactly on azurite's redox minimum and the wall cells below it (§3.4), and that is now
  put to the owner (§6).
- The scenarios that `refund` moves though the passive reading files them under 1 % were put
  down to thickness stored between 0.5 and 0.9 of the bulk fluid's excess. Three scenarios with
  a tenth or more of their thickness in that band do not move (§2.1).
- Smaller: ferrimolybdite's share was quoted with other minerals' in it (14.6 / 7.7 / 9.5 %, not
  14.9 / 8.1 / 9.7); `gem_pegmatite` authors six flow values, not eight; no beryl grows there
  because none is licensed, not because of the broth's Cr and V; and `radioactive_pegmatite`
  under the clamp ends 98 % full on quartz without reaching 0.999, which this document had
  called plugging.

## 1. What was run

Runtime: Windows x64, Node 24.15.0, the commissioned formation. The change adds files under `tools/`
and `proposals/` and edits two documents; nothing under `js/`, `data/` or `tests-js/` changes. §8
lists the gates that were run and says what was not.

| Instrument | What it reads | Integrity and controls |
|---|---|---|
| `tools/sim-side-census.mjs` | One pass per scenario: fill per step; what each crystal's engine read on its own cell when it ran, and which field holds a drawn-down cell down; what ended each crystal's growth, and every pause on the way; what the ledger refused outright; the bulk handle against the voxel field; the vadose override; the count rules, on the σ the nucleation pass reads; and a physical-unit restatement of what was grown. Three static readings of the source. | At seed 42 all 41 runs reproduce `tests-js/baselines/seed42_v286.json` with the instrument attached. Twenty-six controls, eighteen positive and eight negative, all passing at seeds 42, 1 and 2. |
| `tools/sim-side-census-mutations.mjs` | Thirty-five broken copies of the census, one line changed in each, run on the scenarios the guarded control needs. | Every control passes on the census as committed and fails on each of its mutants, and no control is without a mutant. |
| `tools/sim-side-ab.mjs` | Shipped arm against an arm with a named intervention applied in-process: a feldspar rind, a clamp on σ, a clamp on the rate, factor caps, a per-factor root, a k·(σ−1) rescale, radiogenic Pb carried to the voxels or kept out of every fluid, a multiplied broth field, or every debit returned to its cell. For every arm: the species lost, gained and moved, whether the scenario's baseline would differ, and the largest fill of the run. | The shipped arm reproduces the baseline at seed 42. The neutral knobs (`rind=Infinity`, `cap=Infinity`, `rclamp=Infinity`, `root=1`, `mul=Ca:1`, `refund=0`, and `fcap=Infinity` where the minerals are feldspar and albite) reproduce the shipped arm exactly, on `schneeberg` at seed 42, before every batch. Every arm's audit counts are compared with the shipped arm's (§7). |
| `tools/rate-at-saturation-census.mjs` | Each growth engine called directly with σ forced to 1.0005 … 3 and the rng re-seeded before every call; then, for the engines that propose a rate at saturation, the σ at which they actually grew. | Quartz and fluorite, k·excess laws by inspection, read "vanishes". All 8 scenario runs reproduce the baseline. |
| `tools/seed-variety-census.mjs` | One stratum of the nightly canary (55 seeds). No simulation. | None of its own: it restates the canary's committed per-species spine and, where the machine holds it, the per-seed tier. |

Seeds: the census and every A/B ran at 42, 1 and 2; the canary stratum is `2026-11-04/v286`
(55 seeds, vugg `e86ba58a`).

A control that passes proves little until it has been seen to fail. The mutation tool breaks the
census thirty-five ways. Among them: the step log read once instead of every step; the competition
receipt, and the budget receipt, ignored; the voxel mean read from the bulk handle; the fill
recorded as 0, and as 1; the stop never recorded; the crystal's own cell read from the bulk handle;
the ingredients never restored; the license, the exclusion list and the nucleation window never
asked; the localized-nucleation envelope not put up; and the engine's view read after the step's
diffusion instead of at the dry run, which is the error the first version of this census made.
Each control fails on its mutant, and the tool lists any control no mutant aims at (none).

These readings have no control, and stay labelled so: the throughput restatement (§2.6 checks its
arithmetic by hand on one row); the births that never grew; the three static readings of the
source; within the END table of §2.2, the classes "undersaturated on its cell and on the bulk
handle", the two "dissolving" classes, "size cap", "at or above saturation on its cell, nothing
proposed" and "a zone proposed and not stored"; within the count reading of §2.3, the
prerequisite test, which reads zero in every run, and every cause the `_wallStrangledFor`
attribution can name except a missing ingredient; and, within the draw-down reading of §2.1,
every answer of the one-further-field search except pH.

Six small probes are committed beside their outputs in `proposals/evidence/sim-side-2026-11-09/`.
Five carry statements of their own: the range of σ each scenario's bulk fluid covers for feldspar,
albite and quartz (§3.1); the history of a few headline crystals across the 258 committed baselines
(§3.1, §3.4); whether a wrapped σ method stays in force during nucleation (§7); one fluid field
on a mineral's own cells against the bulk handle (§2.1); and what the side doors on the count
gates are made of (§2.3). The sixth runs nothing: it reads the A/B outputs and census reports in
that folder and prints the counts this document draws from them.

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
| …… galena, molybdenite or uraninite, the three engines of §3.2 | 180 | 65 | 4 |
| …… every other mineral | 42 (2.9 %) | 35 (2.9 %) | 34 (2.7 %) |

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

**How much of that is the feldspar pair.** Four of those scenarios owe their place in the first
table to the two minerals of §3.1. All of `gem_pegmatite`'s and `shigar_pegmatite`'s drawn-down
thickness is feldspar and albite, and so are 130 of `radioactive_pegmatite`'s 147 mm and 37 of
`tormiq_alpine_cleft`'s 44 mm (seed 42). An engine at a σ in the hundreds draws its cell down
because its rate is a runaway, and that runaway is the defect of §3.1. With the pair's part taken
out of each scenario's numerator, the second row of the first table reads 9 / 7 / 8 of 40 and the
third 1 / 1 / 0 (`probe-ab-digest.txt`; that is arithmetic on the committed table, not a run with
the pair bounded). So the supply reading that would survive a bound on the pair is the smaller
one. The control that guards the draw-down reading sits on `colorado_plateau`'s uranophane for
that reason. In the third version of this document it sat on Shigar's albite, which a bound on
the pair in every scenario would have turned around.

"Through its ingredients" means that setting the mineral's ingredient fields in the cell to the bulk
handle's values restores at least 0.9 of the bulk fluid's excess. Where that fails the cell differs
from the bulk handle in something else, and the census looks for it: every other field in which
the two fluids differ is set to the bulk handle's value, one at a time on top of the ingredients,
and the one that restores the excess is named. Two cases carry nearly all of it, and neither is
supply alone.

- *`supergene_oxidation`'s ferrimolybdite*: 67.5 / 36.8 / 44.8 mm of stored thickness, which is
  14.6 / 7.7 / 9.5 % of the scenario's. Its cells are short of molybdenum, by a median 17 ppm of
  the bulk handle's 15 to 40, and of oxygen as well, by up to 0.30: they sit on rings where the
  drop in water level left less O2 than the bulk handle carries (§3.3). The ingredients alone do
  not restore 0.9 of the excess; with the oxygen they do. That is draw-down and a redox gap
  together (`probe-cell-field-gap-ferrimolybdite-Mo.txt`, `-O2.txt`).
- *`schneeberg`'s three uranophanes*: 3.9 / 3.2 / 4.7 mm, about 2 % of the scenario's thickness.
  Setting their ingredients to the bulk handle's values restores nothing; setting the pH does.
  `supersaturation_uranophane` multiplies by 1.3 from pH 6.0 to 7.5 and by 0.625 just below 6.0
  (`js/39-supersat-silicate.ts:1002`). The bulk handle sits at exactly 6.0000 and the cells a
  hair under it (5.998 at the lowest at seed 42), so the cell and the bulk handle are on opposite
  sides of that edge on 112 / 165 / 163 of 165 crystal-steps
  (`probe-cell-field-gap-uranophane-pH.txt`). That is a hard edge in a σ function, not supply
  (§3.4).

Everywhere else the "otherwise" share is under 1 %. These two cases and the feldspar pair also
account for about a third of the crystals in the first table. Of the 56 / 52 / 55 crystals of
1 mm or more that stored most of their growth on a drawn-down cell, 9 / 8 / 9 are these
ferrimolybdites (six at every seed) and uranophanes, and 8 / 8 / 9 are feldspars and albites (the
last column of the draw-down table in `census-seed-*.txt` names the minerals). That leaves
39 / 36 / 37, about one crystal in fifteen, drawn down through its own ingredients by an engine
other than the feldspar pair's.

The pauses of the first table depend on the seed because most of them belong to one mineral in
one scenario, the galenas of `sunnyside_american_tunnel` (156 / 64 / 4), which §3.2 explains.
Outside the three engines of §3.2 a cell run short accounts for about 3 % of the pauses at every
seed.

**The test.** If supply did not bind, returning every debit would change nothing. The `refund=1` arm
of the A/B tool returns each positive zone's debit to its cell as soon as it is booked. It moves
26 / 27 / 25 of the 41 scenarios. In 21 / 21 / 18 of them the largest crystal of some species, 1 mm
or more in one arm or the other, changes size by a factor of more than 1.25, and in 7 the fill
rises by more than ten points. By the stricter test of a baseline it changes 38 of the 41 at
every seed (`probe-ab-digest.txt`). At seed 42:

- Crystals on a scarce ingredient grow: `mvt`'s greenockite from 2.4 to 7.3 mm, `colorado_plateau`'s
  uranophane from 12.6 to 25.7 mm, `reactive_wall`'s galena from 3.9 to 7.0 mm.
- Pockets that the draw-down was keeping open fill: `porphyry` ends 82 % full where it ends 12 %,
  `roughten_gill` 98 % where it ends 15 %, `supergene_oxidation` 98 % where it ends 41 %,
  `sulphur_bank` 72 % where it ends 31 %. Some of what grew in them is crowded out: `bisbee`
  loses five species, its 3.5 mm jarosite and 1.5 mm brochantite among them, and `roughten_gill`
  its 4.3 mm calcite and 1.1 mm mottramite.
- The pegmatites plug sooner. `shigar_pegmatite`, which ends 92 % full as shipped, is full at step
  23 (26 at the other two seeds) and loses its topaz. `gem_pegmatite` is full at step 5 and not 9,
  `radioactive_pegmatite` at step 17 and not 61.

The 15 scenarios it leaves alone at seed 42 store under 1 % of their growth on a cell under half
the bulk fluid's excess (one of them grows nothing). It also moves 11 scenarios that the passive
reading files under 1 %. So the passive table is a floor on where supply binds, and not a
predictor of what the refund moves. Three of the eleven carry starved crystal-steps and next to
no drawn-down thickness (`ultramafic_supergene` 192, `chiastolite_hornfels` 119, `pulse` 8): a
crystal that proposes nothing stores nothing, so a share weighted by thickness cannot count it.
Seven store a tenth or more of their thickness between 0.5 and 0.9 of the bulk fluid's excess;
`bisbee` has 36 % there, and the arm moves 19 of its 29 species and takes the solid of five more.
That band does not separate the two groups, though. Three of the scenarios the arm leaves alone
store a tenth or more there as well: `naica_geothermal` 76 %, `jeffrey_mine` 32 % and `elmwood`
23 %. In the eleventh, `sabkha_dolomitization`, only the counts of carbonates under 0.1 mm
change. The three scenarios whose baseline the arm leaves unchanged are `great_salt_plains`,
`tutorial_first_crystal`, and `marble_contact_metamorphism`, which grows nothing.

The arm is not a closed system, and it has to be shown to change nothing but what it names. The
first version of it tripped the carbonate boundary's audit and so cancelled an authored event
(§5, trap 10). The repaired arm leaves every audit the tool reads as the shipped arm has it, in
all 123 runs.

**Nothing above the cell binds.** The same ledger, read at the scale of the cavity:

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, solute) pairs with booked solids | 321 | 320 | 320 |
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

- *The cavity's inventory.* For the median (scenario, solute) pair the surviving solids hold about
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
| dissolving | 57 (5.0 %) | 37 (6.5 %) | 58 (5.3 %) | 38 (6.6 %) | 56 (4.7 %) | 36 (6.3 %) |
| dissolving while the bulk handle reads at or above saturation | 4 (0.4 %) | 4 (0.7 %) | 4 (0.4 %) | 4 (0.7 %) | 4 (0.3 %) | 4 (0.7 %) |
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
on both fluids: an event, a movement or cooling moved the chemistry. "Dissolving" is mostly the
same thing carried further, and that is the authored paragenesis working as designed. Four
crystals at every seed are not that: the four azurites of `supergene_oxidation`, 2.5 to 3.3 mm,
dissolve at step 160 while the bulk handle still reads at or above saturation for azurite.
Azurite's σ is zero below a redox minimum (`js/32-supersat-carbonate.ts:682`), the bulk handle
ends that run at O2 1.000, and every ring's voxel mean ends below it (§3.3). The same gap produces
every `_wallStrangledFor` refusal of azurite (§2.3) and stops the arsenates below. The minimum
is 1.0, and 1.0 is the value the scenario's last event writes; §3.4 takes that up.

**Burial.** "Enclosed" is a crystal overgrown by a neighbour (`enclosed_by`). It is the third-largest
class, 213 / 154 / 232 crystals, and nearly all of them are small: 8 / 8 / 7 are 1 mm or more.
At seed 42 the commonest buriers are anhydrite, celestine and sphalerite (39, 34 and 24 crystals).

**Supply, seldom.** "Its cell ran short of an ingredient" is the last state of 17 / 15 / 10
crystals. Of those ≥ 1 mm it is only the four galenas of `sunnyside_american_tunnel` at seed 42,
which starve on lead at step 149, one step before the event that would have stopped them. As a
pause it is more frequent (§2.1), though most of those pauses are the stop and start of the three
engines of §3.2, not a slow engine starving. What the draw-down does to an engine that follows
σ − 1 is slow it, and a slowed crystal is not in this table at all: it reads "still growing".

"Undersaturated on its cell only, not through its ingredients" is six crystals ≥ 1 mm at every
seed, all of them arsenates of `supergene_oxidation` (one mimetite, five scorodite) that stop
together at step 160. That is the step of the scenario's last event, in a pocket whose voxels and
bulk handle have differed in O2 since the water level dropped at step 70 (§3.3). Setting the
cell's oxygen to the bulk handle's restores every one of the six, so it is a redox gap between
the two fluids, not exhaustion.

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
crystal is admitted when σ passes a threshold, subject to a fixed per-step probability, the
species' `max_nucleation_count`, and the function's own count gate. That σ is the bulk handle's,
except in four scenarios (below). Of the 169 functions, 86 refuse a new crystal while one of
their species is active (62 of those keep a side door, a roll on the same line), 22 tolerate two
or more, 15 also limit the crystals ever born, and 61 show no such gate in the forms the census
recognizes. No function computes its probability from σ: of the 489 `rng.random()` comparisons in
the nucleation files, 487 are against a numeric literal and two against one named constant. Where
σ enters past the threshold it switches between literals, as quartz's second-crystal door does at
σ > 2.

| Reading | seed 42 | seed 1 | seed 2 |
|---|---:|---:|---:|
| (scenario, mineral) pairs | 351 | 350 | 348 |
| … with exactly one crystal | 119 (33.9 %) | 118 (33.7 %) | 114 (32.8 %) |
| … with at least `max_nucleation_count` crystals born | 172 (49.0 %) | 177 (50.6 %) | 182 (52.3 %) |
| Species-steps past σ_crit, on the σ the nucleation pass is about to read | 38,167 | 38,210 | 38,170 |
| … the scenario excludes the species | 2,499 (6.5 %) | 2,500 (6.5 %) | 2,516 (6.6 %) |
| … the scenario does not license it | 1,398 (3.7 %) | 1,410 (3.7 %) | 1,450 (3.8 %) |
| … it is outside its authored nucleation window | 504 (1.3 %) | 504 (1.3 %) | 504 (1.3 %) |
| … its prerequisite event has not fired | 0 | 0 | 0 |
| … the species' function is reached | 33,766 (88.5 %) | 33,796 (88.4 %) | 33,700 (88.3 %) |
| …… and the count cap was binding | 14,865 (44.0 %) | 14,960 (44.3 %) | 14,674 (43.5 %) |
| …… and the function's own count gate was binding | 15,104 (44.7 %) | 15,197 (45.0 %) | 15,239 (45.2 %) |
| ……… of those, at a gate that keeps a side door | 5,757 | 5,915 | 6,023 |
| …… and neither was | 3,797 (11.2 %) | 3,639 (10.8 %) | 3,787 (11.2 %) |
| …… the count cap, or a gate with no side door | 24,212 (71.7 %) | 24,242 (71.7 %) | 23,890 (70.9 %) |
| Births `_wallStrangledFor` refused | 48 | 27 | 47 |

On about one in nine of those species-steps the function was never reached. The windows are
`deccan_zeolite`'s zeolites, `porphyry`'s native gold, `roughten_gill`'s plumbogummite and one step
of `wittichen`'s erythrite. Where the function was reached, the count cap or a gate with no side
door stood in the way on about seven in ten, and on about one in nine neither did. The remaining
17 to 18 % stood at a gate that keeps a side door, and how many of those could have rolled is not
counted. A side door is not an open door. Each of the 62 is a roll behind a σ threshold of its
own (quartz's second crystal needs σ > 2.0, cerussite's σ > 1.8), and 35 of those functions also
keep a hard gate above one on the same list, which shuts the door once that many crystals are
active (`probe-side-doors.txt`). The census evaluates neither. So the side-door row is an upper
bound on the species-steps that could still have rolled, and "seven in ten" is a lower bound on
those where an authored count rule stood in the way.

**Four scenarios do not read the bulk handle.** Where a scenario nucleates per vertex or has an
active thermal field, `check_nucleation` wraps every σ method for the length of the pass so that
it returns the maximum over the wall cells (`_installLocalizedNucleationEnvelope`, `js/85b`). That
holds on every step of `zoned_dripstone_cave` and `stalactite_demo`, on 61 of `naica_geothermal`'s
320 and on 51 of `wittichen`'s 220. The census puts the same envelope up for its reading and
takes it down again. It changes the count in one place: `zoned_dripstone_cave`'s aragonite is
past σ_crit on the envelope and not on the bulk handle on all 150 steps, because its ceiling zone
is authored richer than the bulk. No species-step goes the other way.

One gate in this chain is not authored. `_wallStrangledFor` (`js/85b`) refuses a birth that the σ
it is handed admits when no wall cell clears σ_crit: it is where the two fluids of §2.1 meet. It
refused 48 / 27 / 47 births, and the census attributes each on the wall cell that came nearest to
clearing. Azurite in `supergene_oxidation` is refused 39 / 18 / 39 times, every time for want of
oxygen in the wall cells (§2.2). Plumbogummite in `radioactive_pegmatite` is refused 6 / 7 / 7
times, every time for want of lead, which reaches only the bulk handle (§3.3). The remaining
3 / 2 / 1 are a wall cell at another temperature than the bulk handle, where the bulk handle's own
fluid would fail too. The gate fires only when no wall cell clears the threshold, so it is rare:
48 of 10,382 calls at seed 42. In practice the authored rules end a nucleation burst. My reading,
not a measurement: a σ-dependent nucleation rate (story-pocket WP7's "count lever") would run
into those same caps unless the cavity as a whole could be drawn down, which is C4.

### 2.4 What a seed changes

Also known (the story-pocket proposal, §2.5 and WP9, at 21 seeds; PR #45 is a brief for an
experiment on it). The canary's 55 seeds agree:

| Reading (canary stratum `2026-11-04/v286`, 55 seeds) | Value |
|---|---:|
| Scenarios that grow one and the same species set in every seed | 30 of 41 (one of them grows nothing) |
| (scenario, mineral) pairs present in every seed | 334 of 356 (94 %) |
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
| `rind=5000`: feldspar and albite stop adding thickness at 5 mm | 22.9 / 22.7 / 19.6 | never | 230 | 10.0 / 10.6 / 7.2 | 12.0 / 11.9 / 12.0 | 2.4 / 2.5 / 2.5 | 4.2 / 2.2 / 5.1 | 4.9 / 4.0 / 3.5 |
| `cap=8`: their σ clamped at 8 | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `rclamp=7`: their rate clamped at k·7, σ untouched | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `fcap=2`: each factor of their σ capped at 2 | 27.2 / 27.0 / 25.9 | never | 230 | 14.3 / 14.4 / 14.6 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `root=3`: their σ replaced by its cube root | 38.8 / 38.5 / 37.2 | never | 230 | 21.6 / 21.8 / 21.7 | 12.0 / 12.0 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `mul=B:10`: ten times the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `mul=B:0.5`: half the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.14 / 0.17 / 0.18 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.017 / 0.013 |
| `cap=8,mul=B:10`: the clamp, and ten times the boron | 42.1 / 41.4 / 41.0 | never | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `cap=8,mul=B:0.5`: the clamp, and half the boron | 40.5 / 39.9 / 39.5 | never | 230 | 23.9 / 24.4 / 24.5 | 5.6 / 5.6 / 5.4 | 2.5 / 2.5 / 2.4 | 4.2 / 4.9 / 5.1 | 3.7 / 4.5 / 4.0 |

Under `rind=5000` the pair ends at 7.2 to 10.6 mm and not at 5: a positive zone is refused once a
crystal has reached 5 mm, and the zone that took it there is a whole step's growth.

Three readings follow.

1. *The gems are short of room, not of chemistry.* With the feldspar pair bounded in any of five
   ways, the pocket ends 20 to 42 % full and grows to step 230. Tourmaline reaches 12 mm and grows
   until step 197; topaz appears (six crystals, 2.5 mm) and grows until step 215, through the Late
   Hydrothermal event that narrates it; spodumene and lepidolite reach 2 to 5 mm. Quartz, held to
   1.7 mm by the plug, becomes the largest crystal at 37 mm. The broth and the events were always
   able to grow tourmaline, topaz, spodumene and lepidolite.
2. *It is not boron, and the plug is not what hides it.* The story-pocket proposal's WP8(b) names
   boron starvation as "the hypothesis to test first": "if boron never concentrates in the late
   fluid, the tourmaline is starved". `supersaturation_tourmaline` caps its boron factor at
   `min(B/15, 2.0)` (`js/39-supersat-silicate.ts:869`), so it stops responding at 30 ppm. This broth
   starts at 35 and no event lowers it. (One authored movement adds boron: from step 30 it feeds a
   halo at the cavity's feeder cell, `fluid.B` with `origin: "cell"` in `data/scenarios.json5`. That
   can only push the factor further past its cap.) Ten times the boron therefore moves nothing, in
   the plugged pocket (`mul=B:10`: no species moves at any seed) or in the open one
   (`cap=8,mul=B:10`: every size as with `cap=8` alone). Less boron does move it. At half the
   boron tourmaline is 0.14 / 0.17 / 0.18 mm in the plugged pocket and 5.6 / 5.6 / 5.4 mm in the
   open one; at a quarter (`mul=B:0.25`) the plugged pocket keeps one crystal of 0.02 mm. All four
   of tourmaline's concentration factors sit at their caps in this broth (Na 40, B 35, Al 150,
   SiO2 8,000 ppm against ceilings reached at 30, 30, 22.5 and 600), so a residual-concentration
   term cannot raise its σ here, before or after the plug is cured. WP8(b) needs a species whose
   factor is below its cap.
3. *Beryl is a separate defect.* No arm grows beryl, and none could. The scenario licenses eight
   species (albite, cassiterite, feldspar, lepidolite, quartz, spodumene, topaz, tourmaline) and
   excludes emerald by name. No member of the beryl family is among the eight, so the family's
   dispatcher skips each of them at the same exclusion and license tests
   (`js/89-nucleation-silicate.ts:188`), whatever the broth holds. The description still promises
   "schorl → beryl → spodumene + elbaite → late topaz", and the step-90 event narrates "Beryl
   finally nucleates". W1 of `PROPOSAL-HOSTILE-REVIEW-WISE-2026-08-05.md` found the same absence
   in August, when the cause was the broth's Cr and V; it is untouched here.

**The other two pegmatites.**

- `radioactive_pegmatite` is full at step 55 to 61 of 120, before its events at 80 (Oxidizing Fluids)
  and 100 (Final Cooling). Bounding the feldspar pair alone hands the pocket to quartz: it passes
  0.7 full at step 86 and ends 98 % full, just short of 0.999, with a 53 to 55 mm quartz, because
  quartz's σ climbs to 245 as the fluid cools to 100 °C
  with 15,000 ppm of SiO2 on the bulk handle that nothing draws down. With quartz bounded as well the
  pocket ends 11 to 18 % full, grows to step 120, opal reaches 1.8 mm, and autunite — the scenario's
  one aspirational species — appears at all three seeds.
- `shigar_pegmatite` was cured of the same plug at v241 by enlarging its cavity from 140 to 220 mm
  (`js/15-version.ts`: "the corrected ledger exposed Shigar's 140 mm authored cavity sealing before
  its documented late F-rich topaz pulse"). It ends 92 % full with a 270 mm albite. What keeps the
  larger cavity from sealing is the draw-down of §2.1: 83 % of this pocket's stored thickness is put
  on at a cell under half the bulk fluid's excess, and with every debit returned (`refund=1`) it is
  full at step 23 to 26 and its topaz is gone. With the feldspar pair clamped as `gem_pegmatite`'s
  is above, its albite is 9.7 to 9.9 mm where it is 270 as shipped, and the 220 mm pocket ends
  0.0 % full (§4, C1). Its tourmaline stays at 1.8 mm and its topaz at 0.6 to 0.7 mm (two more
  topaz crystals appear at seeds 42 and 1): Shigar's gems are small for their own reasons. Its
  aquamarine has been absent since SIM 272 and is absent in all 55 canary seeds; no arm here
  restores it.

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
  of the rings that dried. Each ring also keeps a legacy fluid slot beside its voxels
  (`ring_fluids[r]`), which the override writes as well, and the equator ring's slot is the bulk
  handle itself, by alias (`js/85-simulator.ts`). In `wittichen`, `roughten_gill`,
  `supergene_oxidation`, `schneeberg` and `searles_lake` the equator ring dries while rings below
  it stay wet, so the bulk handle takes the drying write and the floor keeps its own chemistry:
  `wittichen`'s bulk O2 goes from 0.40 to 1.80 at step 170, and at run end its voxel-mean O2 runs
  from 0.54 in the floor ring to 1.80 in the upper six. Eh follows O2. This is deliberate (the
  comment there records why the slot is written as well). After that write the bulk handle is on
  its own: the voxels it was written with diffuse into their neighbours and it does not. In
  `supergene_oxidation` it ends at O2 1.000 while every ring's voxel mean ends below it, from 0.707
  in the floor ring to 0.998 at the top. So wherever the water level has dropped part-way the bulk
  handle is neither a cavity average nor any ring's fluid. In the four other scenarios where the
  override fires it dries all 16 rings at once and leaves no gap.
- *`concentration` itself.* The simulator keeps that field out of diffusion and out of event
  propagation on purpose. `_fluidFieldNames` is built without it (`js/85-simulator.ts:353`), and
  the comment at `js/85c-simulator-state.ts:2044` gives the reason: it is "per-ring evaporative
  state owned by the vadose mechanic". One event writes it on the bulk handle all the same: `event_sabkha_evap`
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

**A/B.** Two arms send the lead somewhere else. `pb` also adds the same increment to every voxel,
as a propagated event would. `nopb` puts the bulk handle's Pb back to what it was before the
block ran, so that the lead reaches no fluid at all. Both are run in the pocket as shipped and in
the pocket held open (`cap=8` on feldspar, albite and quartz, which leaves it 11 to 18 % full).
No arm grows galena. In the table "no solid" is a mineral whose crystals were born and hold
nothing at the end of the run.

| Scenario, arm (seeds 42 / 1 / 2) | Bulk Pb at run end, ppm | Voxel-mean Pb, ppm | Plumbogummite | Uraninite negative zones |
|---|---|---|---|---|
| `radioactive_pegmatite`, shipped | 146.8 / 127.7 / 147.2 | 30.00 | no solid (2 / 3 / 3 records) | 3 / 6 / 29 |
| … `pb` | 146.7 / 129.3 / 158.7 | equal to bulk | no solid (3 records) | 3 / 9 / 54 |
| … `nopb` | 30.0 | 30.00 | no solid (1 record) | 3 / 6 / 29 |
| … pocket held open | 312.6 / 299.2 / 287.9 | 30.00 | ×3 at 0.006 / 0.005 / 0.005 mm | 123 at every seed |
| … pocket held open, `pb` | 312.5 / 299.1 / 287.8 | equal to bulk | ×3 at 0.71 / 0.70 / 0.69 mm, growing to step 120 | 123 |
| … pocket held open, `nopb` | 30.0 | 30.00 | ×1 at 0.006 / 0.003 / 0.004 mm | 123 |
| `schneeberg`, shipped | 179.0 / 221.8 / 217.5 | 5.00 | none (not licensed) | 79 / 149 / 149 |
| … `pb` | 178.9 / 221.7 / 217.4 | equal to bulk | none | 79 / 149 / 149 |
| … `nopb` | 5.0 | 5.00 | none | 79 / 149 / 149 |

So the defect is real and at present latent. In `radioactive_pegmatite` the pocket is full by step
61 at the latest, and the mineral the lead is meant for cannot form at all. The scenario's
description promises it ("late-stage galena from radiogenic Pb"; "Final cooling (step 100): system
approaches ambient, galena precipitates from the radiogenic Pb"). Galena is not among the 13
species the scenario licenses (albite, autunite, cassiterite, feldspar, lepidolite, morganite, opal,
plumbogummite, quartz, spodumene, topaz, tourmaline, uraninite), and `_runNuc` returns before an
unlicensed species' function runs (§2.3). On the bulk handle galena is past its σ_crit on
33 / 30 / 30 steps of the shipped run, and every one of them reads "not licensed". The licensed
sink is plumbogummite, a deterministic species of the scenario. `_wallStrangledFor` refuses it
6 / 7 / 7 times, and the crystals that are born do not grow: at these three seeds they hold no
solid at all, and across the canary's 55 seeds the mineral is on record in every one and never
larger than 0.6 µm. With the pocket held open *and* the lead in the voxels it grows, to 0.7 mm.
With no radiogenic lead in any fluid it is born once where it is born two or three times as
shipped, and it holds as little. What the lead on the bulk handle buys today is one or two extra
births that cannot grow.

`schneeberg` licenses no lead mineral. There the radiogenic lead takes plumbogummite and anglesite
past σ_crit on the bulk handle for 72 and 69 steps, neither of them licensed. The σ functions of
several minerals that hold no lead read Pb as well, as a suppression or a competition term, which
is why the `pb` arm still moves 3 / 2 / 1 species there (goethite, pharmacolite and proustite).
`nopb` leaves its baseline summary unchanged at all three seeds.

**The science.** Radiogenic lead is not released to the fluid as it forms. It is held in the
uraninite (about 19 wt % PbO in unaltered 2 Ga uraninite at Oklo) and leaves when the uraninite is
altered or heated; where reduced sulfur is present it is fixed as galena (Janeczek & Ewing 1995;
Evins, Jensen & Ewing 2005 — both read at abstract level only). The simulator's continuous release
has the mechanism backwards; the event that should release the lead is the one that attacks the
uraninite.

### 3.4 Three notes

**Three authored values sit exactly on an edge.** Several σ functions change abruptly at a
threshold: they return zero on one side of it, or switch multiplier. Where an authored value is
the threshold itself, which side a fluid falls on is decided by a rounding error or by the last
decimal of a neighbouring cell. Three such places turned up, each because a reading went wrong
there.

| Scenario | The authored value | The edge it sits on | What follows |
|---|---|---|---|
| `radioactive_pegmatite` | the broth's Pb, 30 ppm | `supersaturation_plumbogummite` returns 0 when Pb is under 30 (`js/38-supersat-phosphate.ts:268`) | With no radiogenic lead the bulk handle holds exactly 30 and plumbogummite is still born, once at each seed (`nopb`, §3.3). An arm that added the lead and subtracted it again left the handle a rounding error under 30 and no plumbogummite at two seeds of three. The third version of this document reported that as a cost of C3 (§0). |
| `schneeberg` | the step-85 event sets pH to 6.0 (`js/70d-pegmatite-radioactive.ts:72`) | `supersaturation_uranophane` multiplies by 1.3 from pH 6.0 to 7.5 and by 0.625 just under 6.0 (`js/39-supersat-silicate.ts:1002`) | The bulk handle reads 6.0000 on every step its uranophane grows and the cells sit a hair under it, so the two fluids are on opposite sides of the edge on 112 / 165 / 163 of 165 crystal-steps (§2.1). |
| `supergene_oxidation` | the step-160 event sets O2 to 1.0 (`js/70i-supergene.ts:173`) | azurite's σ is 0 below a redox minimum of 1.0 (`js/32-supersat-carbonate.ts:237`, `:682`) | The bulk handle lands on the minimum and every ring's voxel mean below it (§3.3). Four azurites of 2.5 to 3.3 mm start to dissolve at that step and six arsenates stop, while the bulk handle reads azurite at or above saturation (§2.2). Over the run `_wallStrangledFor` refuses azurite 39 / 18 / 39 times for want of oxygen in the wall cells (§2.3). |

In `supergene_oxidation` the mechanism is how an event's write reaches the voxels. The event sets
the bulk handle to a value, and the simulator carries the change, not the value, to every voxel
(`_propagateGlobalDelta`, `js/85c`). The voxels have sat below the bulk handle in O2 since the
water level dropped at step 70 (§3.3), and they sit below it by as much after the event. The
source has a path for a write that is meant as a value: a diffused field that an event names as
a replacement is set in every voxel (`js/85c-simulator-state.ts:1137`; the evaporite and Roughten
Gill events use it, the first with the comment "Absolute tidal-water replacement, not a relative
offset to preserve in each already-depleted voxel"). This event names none. Why `schneeberg`'s
cells sit under the bulk handle's pH was not examined.

No change is proposed for any of the three, and none was previewed. They go to the owner (§6)
because each is a place where a calibration hangs on a last decimal, and because the azurite case
decides how four crystals of 2.5 to 3.3 mm end.

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

### C1 — bound the feldspar pair in `gem_pegmatite` (F1)

Three things have to be chosen: the shape of the bound, where it lives (in the two engines, for
every scenario, or authored on the one scenario that plugs), and its value. The previews settle
the first two.

**The shape.** Four shapes were run on all 13 scenarios that grow feldspar or albite, at seeds 42,
1 and 2. All four cure `gem_pegmatite`'s plug with the same gem assemblage. They differ in what
else they do (`probe-ab-digest.txt`; three numbers are seeds 42 / 1 / 2):

| Shape | What it is | Scenarios moved; scenarios whose baseline would differ (of 13) | Species lost |
|---|---|---|---|
| clamp on the rate, σ − 1 ≤ 7 (`rclamp=7`) | The engine's rate becomes k·min(σ − 1, 7). σ itself is untouched, so births, the saturation boundary and every reading of σ are as shipped. Only growth in a fluid past σ = 8 feels it. | 7 at every seed: the three pegmatites, `schneeberg`, `tormiq_alpine_cleft`, `ouro_preto`, `jeffrey_mine`; 8, those and `bisbee` | none at seed 42; at seed 1 `schneeberg`'s cobaltite, native arsenic, native bismuth and cuprite; at seed 2 its native arsenic, native bismuth and naumannite |
| clamp on σ, σ ≤ 8 (`cap=8`) | The σ method is capped as a whole, for growth and for births alike. | the same 7; the same 8 | the same; no species differs from the clamp on the rate in any of the 39 runs |
| factor caps at 2 (`fcap=2`) | Each concentration factor is capped, as the sister silicates' are. Ceiling 8. | 13; 13 | at every seed, albite and feldspar in `grimsel_alpine_cleft` (6.5 and 5.3 mm shipped) and in `chiastolite_hornfels` (0.7 mm feldspar); in `schneeberg`, four species at seeds 42 and 1 and three at seed 2, native arsenic at all three |
| per-factor root (`root=3`) | σ → σ^(1/3): the per-ion convention S = (IAP/K)^(1/ν) of the electrolyte crystal-growth literature (Nielsen 1981, read at abstract level), applied to the proxy's three factors. Keeps the saturation boundary. | 13; 13 | in `schneeberg`, three species at seeds 42 and 2 and four at seed 1, native arsenic at all three; `bisbee`'s alunite at seed 1 |

I expected to recommend factor caps, the convention the file already follows. The preview refused:
where one ingredient is scarce and another abundant, the uncapped product clears σ = 1 only because
the abundant factor carries it, and a factor cap takes that away. It deletes both feldspars from the
Grimsel cleft, a 6.5 mm albite and a 5.3 mm K-feldspar. Factor caps move the saturation boundary;
for a mineral already calibrated without them, that is a different mineral. The preview used one
ceiling for every factor. Separate ceilings were not tried. The root keeps the boundary and moves
every one of the 13: `ouro_preto` falls from 28.8 to 0.3 % full (32.3 to 0.3 and 22.8 to 0.2 at
seeds 1 and 2), and `bisbee` has 9 / 6 / 17 species moved.

**The shape is the clamp on the rate**, inside `grow_feldspar` and `grow_albite`
(`k·min(σ − 1, E)` with each engine's own k, 3 and 4; `js/59-engines-silicate.ts:220`, `:348`),
so that σ itself keeps reporting what the proxy says. The clamp has a physical reading: far from
saturation, growth is limited by transport and stops scaling with σ.

**Where it lives.** Its value E is a calibration constant. In a fluid past the clamp a crystal
grows k·E micrometres a step, times the time scale of 5, whatever the fluid holds, so its size is
its step count times a constant. Written into the two engines for every scenario, one value has
to serve runs of 70 to 340 steps in cavities of very different sizes. The next table is that
general clamp at four values, on the same 13 scenarios (E = 7 from the run above; 11, 23 and 47
from a second). Sizes are the largest crystal in millimetres at seeds 42 / 1 / 2. A dash is a
scenario whose baseline that value leaves as shipped.

| | shipped | E = 7 | E = 11 | E = 23 | E = 47 |
|---|---|---|---|---|---|
| Scenarios whose baseline would differ, of 13 | | 8 | 5 | 4 | 3 |
| `gem_pegmatite`: fill at end | 100 %, full at step 9 / 10 / 10 | 42.1 / 41.4 / 41.0 % | 90.3 / 89.8 / 89.6 % | 100 %, full at step 113 / 115 / 116 | 100 %, full at step 55 / 56 / 57 |
| … tourmaline; topaz | 0.29 / 0.37 / 0.39; none | 12.0 / 11.9 / 12.0; 2.5 | 12.0; 2.5 / 2.4 / 2.5 | 6.1 / 6.2 / 6.2; 0.007 / 0.008 / 0.008 | 2.8 / 2.9 / 2.9; none |
| `tormiq_alpine_cleft`: albite; feldspar | 65.8 / 66.5 / 66.5; 36.5 / 37.2 / 37.4 | 26.7 / 26.5 / 26.3; 19.0 / 18.8 / 18.9 | 41.0 / 40.3 / 40.3; 27.3 / 27.7 / 28.1 | — | — |
| `schneeberg`: feldspar | 27.6 / 26.6 / 26.7 | 10.3 / 9.8 / 9.8 | 14.4 / 13.9 / 13.9 | 26.2 / 25.2 / 25.2 | — |
| … species lost | | none / cobaltite, native arsenic, native bismuth, cuprite / native arsenic, native bismuth, naumannite | none / cobaltite, native arsenic, native bismuth, cuprite / native bismuth | none | — |
| `ouro_preto`: albite | 39.6 / 41.3 / 36.8 | 30.7 / 31.8 / 27.9 | — | — | — |
| `jeffrey_mine`: albite | 11.0 / 10.4 / 11.2 | 8.4 / 8.2 / 8.6 | — | — | — |
| `bisbee`: albite | 8.2 / 8.0 / 8.5 | 8.1 / 7.9 / 8.3 | — | — | — |
| `shigar_pegmatite`: albite; fill at end | 270 / 268 / 277; 92.5 / 91.6 / 90.4 % | 9.7 / 9.7 / 9.9; 0.0 % | 15.3 / 15.2 / 15.5; 0.0 % | 32.0 / 31.7 / 32.4; 0.3 % | 65.4 / 64.8 / 66.1; 2.5 / 2.3 / 2.3 % |
| `radioactive_pegmatite`: fill at end | 100 %, full at step 61 / 55 / 59 | 98.3 / 98.6 / 98.7 % | 98.4 / 98.8 / 98.8 % | 99.2 / 99.8 / 99.5 % | 100 %, full at step 92 / 90 / 93 |

The five scenarios no value touches are `chiastolite_hornfels`, `deccan_zeolite`,
`epithermal_telluride`, `grimsel_alpine_cleft` and `porphyry`. No species is lost in any scenario
but `schneeberg` at any of the four values.

A clamp on σ at E + 1 gives `gem_pegmatite` the same fill and the same gems as the clamp on the
rate at E, at each value of a finer sweep on that scenario alone (E = 3, 7, 11, 15, 23 and 47;
`probe-ab-digest.txt`). Three things follow.

1. *No value both cures `gem_pegmatite` and leaves the others as they are.* E = 7 is the loosest
   value run that keeps that pocket under 0.7 full; E = 11 passes 0.7 at step 185 to 188 and ends
   it 90 % full. Written into the engines, E = 7 changes 8 of the 13 baselines. It takes
   `tormiq_alpine_cleft`'s albite from 66 mm to 27 and `schneeberg`'s feldspar from 28 mm to 10.
   And it leaves `schneeberg` without solid cobaltite, native arsenic, native bismuth and cuprite
   at seed 1, and without native arsenic, native bismuth and naumannite at seed 2. Cobaltite,
   native arsenic and native bismuth are three of the twelve species that scenario lists as
   expected. The crystals are small, 0.06 to 0.25 mm as shipped (cuprite 0.004 mm).
   At seed 1 the shipped survivors of native arsenic and native bismuth sit inside the 27 mm
   feldspar that has overgrown them, and the surviving cobaltite inside an arsenopyrite. They
   outlast the oxidizing water of step 85 only there. Under the clamp none of the three is
   enclosed, and each dissolves between steps 101 and 111. (That reading of the cause comes from
   a probe run for the third review round, at seed 1 only. It is not among the committed
   outputs, which show the loss.) The values that leave the cleft alone, E = 23 and
   E = 47, lose nothing and leave the pocket plugged. The cleft's and `schneeberg`'s bulk σ for
   the pair peaks at 30 and 35 (`probe-sigma-maxima.txt`), about four times the σ of 8 that cures
   the pegmatite.
2. *Shigar's pocket empties.* At every value its albite is a quarter of its shipped 270 mm or
   less. At E = 7 it is 9.7 mm in a 220 mm cavity that ends 0.0 % full, with its tourmaline and
   topaz barely changed (1.8 and 0.7 mm). Shigar runs 70 steps to `gem_pegmatite`'s 230, so a
   clamp that suits one gives the other a third as much feldspar. The shipped pocket is 92 % full
   of the same two minerals: v241 enlarged the cavity to keep them from sealing it, and the clamp
   takes that reason away.
3. *`radioactive_pegmatite` fills on quartz at every value.* It ends 98 to 100 % full. That is
   not a reason to cap quartz: its σ is a solubility ratio, and 245 is what that ratio is in a
   fluid that cools to 100 °C still holding 15,000 ppm of silica. It is the clearest single case
   for C4.

**Recommendation: the clamp authored on `gem_pegmatite` alone, at E = 7.** The scenario's entry
in `data/scenarios.json5` names the bound. The scenario object carries it to the engines, as it
carries `tiger_eye_stage` and `open_to_atmosphere` today (`js/70-events.ts:963`, read at
`js/59-engines-silicate.ts:1717` and `js/19-mineral-stoichiometry.ts:996`). The two engines apply
it where it is present and run as shipped where it is not. The `rclamp=7` arm on `gem_pegmatite`
is its preview, since an arm is applied to one scenario's run. The pocket ends 42.1 / 41.4 /
41.0 % full, which is also the largest fill of the run, and grows to step 230. Tourmaline reaches
12.0 / 11.9 / 12.0 mm, six topaz crystals of 2.5 mm appear, spodumene and lepidolite reach 2 to
5 mm, and no species is lost (§3.1).

What it costs: one baseline changes, and the simulator gains a constant that is there because
this scenario's fluid takes the feldspar proxy to a σ in the hundreds, where every scenario but
the three pegmatites keeps it at 35 or less (§3.1). It leaves Shigar's 270 mm albite,
`radioactive_pegmatite`'s plug and the uncapped product in every other scenario exactly as they
are. It does not make feldspar stop for a reason. It slows feldspar enough that this scenario's
230 steps end before the pocket fills. That is the argument for C4, whose third acceptance line
is that the pocket stays open with this bound lifted.

The owner may prefer one of two other courses.

- *The general clamp*, for the sake of one rule in the engines. Its cost is the E = 7 column
  above, with Shigar's pocket to be decided in the same change and `schneeberg`'s lost species
  accepted or cured.
- *No bound.* F1 then waits for C4, and until C4 lands seven of `gem_pegmatite`'s eight events
  fire into a solid pocket.

Not previewed: the general clamp at any value between 11 and 23, where one that spares
`schneeberg` might be found (none of them would keep the pocket under 0.7 full); and enlarging
the cavity, as v241 did for Shigar. Feldspar there still adds about 8 mm a step, any cavity
fills in time, and no locality's pocket should be sized to fit its feldspar.

Pre-registered acceptance for C1's bump, as recommended:

- `gem_pegmatite` at seeds 42, 1 and 2: fill stays under 0.7 for the whole run, so the fill
  dampener never engages; some crystal stores a positive zone after step 215; tourmaline ≥ 5 mm;
  topaz ≥ 1 mm; and no species that has solid today is without it.
- The census controls `space+end` (positive) and `time` (negative) fail, and the same commit
  rewrites them.
- No other scenario's entry in the regenerated seed-42 baseline differs from today's. The bound
  is absent everywhere else, and the engines have to run as shipped where it is absent.

If the owner chooses the general clamp, the last line becomes: the scenarios whose baseline
changes are a subset of the 13 that grow the pair, the pair's largest crystals land within a
tenth of the table's column for the value chosen, and Shigar's outcome is decided before the
bump. A line that no scenario loses a species cannot be met at E = 7.

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
eight scenarios, and no species is lost or gained. Raising the constant is not free. At m = 3
`porphyry`'s molybdenite takes its pocket from 12 % to 48 % full (14 to 54 and 12 to 48 at seeds 1
and 2). `roughten_gill`'s galena, 32 and 29 mm at seeds 1 and 2, moves 17 other species at each
of those seeds, takes the scenario's one calcite (3.9 and 3.7 mm as shipped) at both, and its
mottramite (1.2 mm) at seed 2.

`reactive_wall` teaches something. With the same constant its galena keeps 19 % of its size at
seed 42, not the 2 % that §3.2's last column predicts. The bulk fluid there is 12 % past saturation
for galena (median σ 1.121), but the galena's own cell sat at a median 1.005 when its engine ran:
under k·σ the crystal grew at full rate at saturation and drew its cell down until nothing was
left to draw. Under σ − 1 it slows as it nears saturation, the cell is drawn down less, and its σ
settles at a median 1.098 (`--trace galena`). That is supply and growth regulating each other, the
mechanism of §2.1, and the k·σ law was replacing it with stop and start. At seeds 1 and 2 the same
galena is 1.1 mm as shipped, on a cell at a median σ of 1.085, and 0.7 mm under σ − 1.

Acceptance: the engine probe reads "vanishes" for all 174 driven engines, and for the three it
reads the shape of a law linear in σ − 1, as it does today for 169 of the 174 (the proposed
thickness at σ = 1.1 and at σ = 1.5 is 0.10 and 0.50 of that at σ = 2, within 0.005); movers are a
subset of the eight scenarios above. Trap: retuning each scenario's Pb or S until galena is its old
size is tuning to a seed. Where galena becomes small, the question is whether that pocket's fluid
is really that close to saturation, which is a question for its sources.

### C3 — carry the radiogenic lead to the fluid the crystals read (F3)

Make the uraninite block's write reach the voxels as well as the bulk handle, the way
`_propagateGlobalDelta` carries an event's change. The `pb` arm previews exactly that (§3.3).

- In the pocket as shipped it changes little, because the pocket is full before the lead matters.
  `radioactive_pegmatite` moves no species at any seed and loses none; at seed 2 it gains opal,
  and its uraninites take 54 negative zones where they take 29 as shipped. `schneeberg` moves
  3 / 2 / 1 species and loses none; it licenses no lead mineral, and the species that move read
  Pb as a suppression or a competition term. Both baselines would differ.
- With the pocket held open, plumbogummite grows to 0.71 / 0.70 / 0.69 mm and is still growing
  at step 120. Without the change it is 0.006 / 0.005 / 0.005 mm in the same pocket.

The constraint on any fix is that the lead has to reach both fluids. Births read the bulk handle
(§2.3) and growth reads the crystal's own cell (§2.1). Lead on the bulk handle alone admits
crystals that cannot grow, which is F3. The third version of this document recommended the
opposite arrangement: book the lead in the uraninite and return it to the uraninite's own cell
when a dissolution zone removes that shell. That cannot work. A write to one cell never reaches
the bulk handle, so it changes no birth. The third round's reviewer ran such a release in a
probe of their own and reported a run no different from one with no radiogenic lead at all. That
probe is not among the committed outputs, and no arm here books lead into a crystal. The
mechanism is withdrawn.

What the science asks for (§3.3) is a different timing, not a different destination: the lead
leaves when the uraninite is altered. The same propagated write, made on a step when a uraninite
takes a negative zone in place of every step, would give that. It is not previewed here, and it
is the owner's choice (§6). How often it would fire is measured. `schneeberg`'s uraninites take
79 / 149 / 149 negative zones. `radioactive_pegmatite`'s take 3 / 6 / 29 as shipped,
11 / 9 / 9 with the feldspar pair clamped (that pocket then fills on quartz, §3.1), and
123 at every seed with quartz bounded as well. So in the one scenario that promises lead
minerals, a retimed release has almost nothing to act on while the pocket is full.

The `nopb` arm keeps the radiogenic lead out of every fluid, and shows what the lead on the
bulk handle does today. In the pocket as shipped plumbogummite is then born once at each seed,
where it is born 2 / 3 / 3 times with the lead, and it holds no solid either way. With the pocket
held open it is one crystal of 0.006 / 0.003 / 0.004 mm, where with the lead it is three of
0.006 / 0.005 / 0.005 mm. `schneeberg`'s baseline summary does not change at any seed. So what
today's lead on the bulk handle buys is one or two extra births of plumbogummite, which hold no
solid in the pocket as shipped and a few micrometres in the open one.

The description of `radioactive_pegmatite` needs a ruling with it. It promises galena, and the
scenario does not license galena (§3.3). Either the license gains galena, with a source for galena
in a pocket of that kind (the scenario declares itself generic, "not anchored to a specific
locality"), or the two sentences go. Whether galena would then form is not previewed: the A/B
tool has no arm that licenses a species.

Acceptance:

- The census controls `two-fluids` (positive) and `strangled` (positive) fail, and the same
  commit rewrites them.
- Bulk Pb and voxel-mean Pb stay within 1 % of the field's scale of each other at every step in
  both uraninite scenarios (the bound the negative control puts on `mvt`'s Ca).
- The scenarios whose baseline changes are a subset of `radioactive_pegmatite` and `schneeberg`.
- In `radioactive_pegmatite` with the pocket held open (the `cap=8` arm on feldspar, albite and
  quartz, run on the changed tree), plumbogummite's largest crystal is 0.5 mm or more at seeds
  42, 1 and 2. Today's tree gives 0.005 to 0.006 mm under that arm and the `pb` arm gives 0.69
  to 0.71 mm, so the line fails without the change, and a birth that never grows cannot meet it.

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
the natural first: six of its eight events author a flow value (1.0 falling to 0.1), it has a
closed-system story to earn, and after C1 it has an open pocket to compare against.

Pre-registered acceptance for the pilot:

- With the feed off and the price at today's constant, the piloted scenario reproduces the unpiloted
  run, and the fleet outside the flag is byte-identical.
- With the pilot on, the census's cavity-scale share (what the solids hold ÷ the most the field ever
  held, §2.1) passes 10 % for at least one formula ingredient of feldspar, albite or quartz, the
  minerals that hold the pocket's volume (K, Na, Al or SiO2; a trace solute does not count). The
  largest in `gem_pegmatite` today is potassium's 0.03 %, 2.4 voxels' worth.
- With the pilot on and C1's bound lifted in the piloted scenario, the pocket does not plug: its
  fill stays under 0.7 for the whole run and no crystal reads "pocket full". That is the claim C4
  makes for itself, that a phase stops for want of supply and needs no cap. (The second version of
  this document asked instead for the feldspar pair's pauses to read "its cell ran short". An
  engine linear in σ − 1 slows on a drawn-down cell and does not pause, so that line could have
  passed with no pause to read.)

### C5 — keep the census

Run `tools/sim-side-census.mjs` at each SIM bump, as `baseline-diff` is. It takes about 20 minutes
a seed and answers what the baselines cannot: not what grew, but what slowed it and why it
stopped. It is worth keeping only as far as its readings are guarded: the mutation tool runs with
it (about 25 minutes), and a reading without a control (§1 lists them) stays labelled as one.

## 5. Traps

1. **Do not fix F3 by debiting or re-syncing the bulk handle.** The bulk handle is deliberately not
   debited by growth (`js/85b`, the comment above `_wallStrangledFor`); nucleation reads it as the
   feed. The one field that does follow the voxels is deliberate too: under a carbonate boundary the
   bulk handle's CO3 and pH are set each step to the mean over the wet voxels (`js/85c`). F3 is one
   write to the bulk handle alone, not a reason to merge the two fluids.
2. **A feldspar clamp is a calibration constant, not physics.** It removes a runaway; it does not
   make feldspar stop for a reason, and no one value suits every scenario (§4, C1). C4 would.
3. **Bounding feldspar hands `radioactive_pegmatite`'s pocket to quartz.** It ends 98 % full
   with a 53 to 55 mm quartz.
4. **Boron is not the lever in `gem_pegmatite`.** Tourmaline's boron factor is at its cap before and
   after C1 (§3.1). A residual-concentration test (WP8(b)) run on that tourmaline reads "no effect"
   whatever the mechanism does.
5. **Five controls sit on today's defects, and flip.** The commit that cures F1 rewrites
   `space+end` (positive) and `time` (negative), which sit on `gem_pegmatite`. The one that cures
   F3 by carrying the lead to the voxels rewrites `two-fluids` (positive) and `strangled`
   (positive). `count` (positive) rests on galena being past σ_crit on the bulk handle and
   unlicensed: it flips if galena is licensed, and may flip if the lead's release is retimed,
   since that changes what the bulk handle holds. Otherwise the census reports a regression that
   is the fix.
6. **Beryl stays absent after C1.** `gem_pegmatite` does not license it (§3.1). Do not count it
   against C1.
7. **"Dissolving" in §2.2 is not "dissolved".** A crystal that took a negative zone and kept solid is
   still surviving, and is filed under "dissolving" if it never grew again. The `dissolved` flag
   means no solid is left (`js/27`); at seed 42 the 70 crystals that carry it hold nothing.
8. **A cell read after the step is a cell that has been refilled.** Diffusion runs at the end of
   every step. The first version of this census read a stopped crystal's σ then, and filed starved
   crystals as saturated. The engine's view has to be read at the dry run.
9. **The bulk handle is one fluid object, not a cavity average and not a ring.** It is aliased to
   the equator ring's legacy slot, so a partial drop in water level writes the drying chemistry to
   it once. Nothing diffuses it afterwards, and no ring's voxels need match it (§3.3).
10. **An intervention can cancel an authored event.** The first version of the `refund` arm
    returned carbonate after the ledger had written its receipt. The carbonate boundary's audit
    then failed and paused `tutorial_travertine`'s CO2 vent, and the arm counted that scenario as
    moved by supply. The arm now rewrites the receipt, and the A/B tool compares every arm's audit
    counts with the shipped arm's and flags a difference (§7).
11. **A record is not a crystal.** A crystal that has dissolved away stays in the crystal list,
    and the baseline's summary counts it. An A/B that asks whether a species is still there has
    to ask for solid. The third version of this document asked for a record, and reported a clamp
    that leaves `schneeberg` without three of its expected species at seed 1 and two at seed 2 as
    losing none (§4, C1).
12. **Adding and then subtracting is not restoring.** (30 + a) − a need not be 30, and three σ
    functions here have an authored value sitting exactly on their threshold (§3.4). An arm, or a
    fix, that undoes a write has to put the old value back.
13. **Lead has to reach both fluids.** Births read the bulk handle and growth reads the cell
    (§2.3, §2.1). Lead on the bulk handle alone admits crystals that cannot grow, which is F3.
    Lead put into one cell changes no birth: a release into the uraninite's own cell, which the
    third version recommended, never reaches the fluid that births read (§4, C3).

## 6. Decisions for the boss

1. **C1: whether to bound the feldspar pair now, where the bound lives, and its value.**
   Recommended: a clamp on the rate authored on `gem_pegmatite` alone, at E = 7. It changes one
   baseline and leaves every other scenario as it is, Shigar's 270 mm albite and
   `radioactive_pegmatite`'s plug included. It is a calibration constant on one scenario, and C4
   is what would remove the need for it. The alternatives are the same clamp written into the two
   engines for every scenario, which changes eight baselines, empties Shigar's pocket and leaves
   `schneeberg` without three of the species it expects at seed 1 and two at seed 2; or no bound,
   with F1 left for C4. Factor caps and the per-factor root are refused by the preview (§4, C1).
2. **C2's constant:** keep each k and let galena shrink where its fluid is barely saturated, or
   re-fit k at one reference scenario. And whether the galena of `reactive_wall` and
   `sunnyside_american_tunnel` should then be grown by a sourced change to the fluid or accepted
   small.
3. **C3: when the lead is released, and `radioactive_pegmatite`'s promise.** Recommended: carry
   the radiogenic lead to the voxels as it is written today, which is previewed. The open choice
   is whether to release it only on a step when a uraninite is altered. That is what the sources
   describe; it is not previewed, and in that scenario it has little to act on while the pocket
   is full. And whether the scenario's license gains galena, with a source, or its description
   loses the two sentences that promise it.
4. **C4:** whether to pilot it, and who owns it. It overlaps the reservoir arc of PRs #35–#39 and
   #42, and one finding should have one owner.
5. **C5:** whether the census, with its mutation tool, joins the SIM-bump routine.
6. **Order against the open ladders.** My proposal: C1 first, because it is the one change that
   gives `gem_pegmatite` back seven of its eight events and grows four of its species to
   millimetres (tourmaline, topaz, spodumene, lepidolite); C2 as a rung of its own beside the
   recipe review's R2 → R9; C3 whenever it is convenient, since it is small and waits on nothing,
   though it shows only once `radioactive_pegmatite`'s pocket stays open, which needs its quartz
   dealt with (trap 3); C4 after the ruling on 4. Story-pocket WP8(b) waits on none of them, and
   should not be tested on `gem_pegmatite`'s tourmaline (trap 4).
7. **Three authored values on an edge (§3.4).** Whether the step-160 seal of
   `supergene_oxidation` is meant to leave the wall cells below azurite's redox minimum while the
   bulk handle sits on it, which starts four azurites of 2.5 to 3.3 mm dissolving and stops six
   arsenates; and whether `radioactive_pegmatite`'s broth Pb of 30 and `schneeberg`'s pH of 6.0
   are meant to sit exactly on a threshold. Nothing is proposed for them here.

## 7. Limits

- **Seeds.** The census and the A/Bs ran at three seeds. Fleet-wide counts are quoted at 42 and
  tabulated at all three. The canary's 55 seeds are used for §2.4 and for the spread of a few named
  crystals.
- **Draw-down is read against the bulk handle.** The reference is the bulk handle's fluid at the
  cell's temperature, so the reading sees every way the two fluids differ, not only consumption.
  The ingredient test separates them: what it does not restore is filed apart (the "otherwise"
  share of §2.1, and 1,869 / 1,593 / 1,768 crystal-steps spent below saturation on such a cell),
  and the census names the one further field that does restore it. For those crystal-steps it is
  `concentration` on 1,447 / 1,064 / 1,334, nearly all of them `searles_lake`'s evaporites, and
  oxygen on 421 / 509 / 428. The search sets one field at a time, with the fields coupled to it
  (O2 with Eh, the sulfur pools, silica with its reactive share). A cell that needed two would be
  filed as "no one field"; none is, at these seeds. In
  `zoned_dripstone_cave` 81 / 53 / 78 % of the stored thickness grew where the bulk handle itself
  is at or under saturation, because its ceiling zone is authored richer than the bulk. The two
  thresholds, 0.5 and 0.9 of the reference's excess, are choices. The ingredients are the formula
  species only; a trace the ledger also debits is not restored.
- **The END reading files a crystal once.** σ is read at the dry run of the stop step; fill,
  enclosure and activity at the end of that step. A crystal that paused many times is filed under
  its last stop. The pauses are counted separately, one for every stop, so one mineral in one
  scenario can dominate them, as the galenas of §3.2 do.
- **The count reading.** It is taken when the nucleation pass starts, on the σ that pass is about
  to read: the bulk handle's, or the maximum over the wall cells where the scenario installs the
  localized-nucleation envelope (§2.3). The four scenario tests are the simulator's own functions,
  called. The count-gate attribution is a static reading of the source, in the forms the tool's
  header lists: 61 of the 169 functions show no gate in those forms, and a function that counts
  its own species another way is read as having none. Where a gate at one keeps a side door (62
  functions) a species-step filed under it could still have rolled; §2.3 counts those apart. The
  cap share and the single-crystal count are exact. Above fill 0.7 `_atNucleationCap` also refuses
  births with a probability set by the fill dampener; the census does not attribute a species-step
  to it. Fifteen minerals have no nucleation function of their own and are not in the reading: the
  beryl family (five) and the corundum family (three), which share a nucleator; six transformation
  products; and raspite, which stolzite's function nucleates. The attribution of a
  `_wallStrangledFor` refusal is read on one wall cell, the one that came nearest to clearing.
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
  not a closed system. Under a carbonate boundary it also rewrites the carbonate receipt of each
  refunded zone, so that the boundary's audit sees the cell as it now is (trap 10). At `refund=1`
  a field that the return brings back to within rounding of its value before the debit is set to
  that value exactly (trap 12). `rclamp` rescales a positive zone inside the engine's call, on a
  σ read before the engine runs, and leaves the σ method alone. It is the shape C1 recommends; at
  the values previewed, the tests the two engines make on their own rate (a habit, an inclusion
  roll) fall on the same side as they would with the clamp written into the engine. `rind` drops
  a positive zone once the crystal has reached the rind and lets a dissolution zone through. `pb`
  adds to every voxel the increment the uraninite block has just added to the bulk handle. `nopb`
  puts the bulk handle's Pb back to the value it had before that block ran; it restores the value
  and does not subtract the increment (trap 12). `cap`, `fcap` and `root` wrap a σ method on the
  scenario's conditions object. Growth, the nucleation gates and the strangulation test all read
  that method. So does the localized-nucleation envelope of `js/85b`, which captures whatever
  method it finds there when a nucleation pass starts. Four scenarios install that envelope
  (`naica_geothermal`, `stalactite_demo`, `wittichen`, `zoned_dripstone_cave`), and none grows a
  mineral whose σ method an arm of this review wraps. In three of them, pass-through wrappers on
  minerals they do grow were called under the envelope 192,000 to 576,000 times and the runs
  still reproduced the baseline (`probe-nucleation-envelope.txt`, `-per-vertex.txt`). `fcap` is
  exact for the product and does not re-derive the functions' subtractive acid term. `excess`,
  `pb` and `nopb` have no neutral setting to self-check against.
- **What the A/B tool calls present.** A species is present while one of its crystals has solid
  left, and a mineral whose crystals all dissolved away or never grew is listed apart as a record
  (trap 11). The "moved" test is coarse on purpose: a change of count, or of the largest crystal
  by a factor of more than 1.25. The stricter line the tool prints, whether the baseline's
  summary would differ, is the one a SIM bump is held to.
- **What an arm may break.** An arm can move a run by tripping one of the simulator's own audits
  (trap 10). The A/B tool therefore counts, for every run, the step-log lines in which an event
  says it was paused or refused, the failed transactions of the carbonate boundary and the entries
  of the three violation ledgers, and flags an arm whose counts differ from the shipped arm's. No
  arm run in the committed outputs is flagged (`probe-ab-digest.txt` lists every file). The tool
  also reports the steps on which the wall's dissolution was withheld as too small to resolve.
  That is a notice and not a failure, and it follows how much of the wall the crystals cover: it
  falls under `refund` in `bisbee` and `supergene_oxidation`, whose pockets fill, and shifts by
  one to five steps in four other arm runs. The comparison covers the audits named here. It does
  not show that an arm has no other side effect.
- **Not examined:** whether the bulk-only `concentration` of `sabkha_dolomitization` matters beyond
  the license check of §3.3; the carbonate and sulfate solubility kernels, the thermal field,
  physical dissolution, the cavity geometry, the renderer, the agent API.
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
node tools/sim-side-census-mutations.mjs             # about 25 min
node tools/rate-at-saturation-census.mjs             # a few minutes
node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/2026-11-04/v286

node tools/sim-side-ab.mjs --arm refund=1 --seeds 42 <all 41 scenarios>      # and --seeds 1, --seeds 2: three files
node tools/sim-side-ab.mjs --arm rind=5000 --arm cap=8 --arm rclamp=7 --seeds 42,1,2 gem_pegmatite radioactive_pegmatite shigar_pegmatite
node tools/sim-side-ab.mjs --arm fcap=2 --arm root=3 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm mul=B:10 --arm mul=B:0.5 --arm mul=B:0.25 --arm cap=8,mul=B:10 --arm cap=8,mul=B:0.5 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm cap=8 --arm rclamp=7 --arm fcap=2 --arm root=3 --seeds 42,1,2 bisbee chiastolite_hornfels deccan_zeolite epithermal_telluride gem_pegmatite grimsel_alpine_cleft jeffrey_mine ouro_preto porphyry radioactive_pegmatite schneeberg shigar_pegmatite tormiq_alpine_cleft
node tools/sim-side-ab.mjs --arm rclamp=3 --arm rclamp=7 --arm rclamp=11 --arm rclamp=15 --arm rclamp=23 --arm rclamp=47 --arm cap=4 --arm cap=8 --arm cap=12 --arm cap=16 --arm cap=24 --arm cap=48 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm rclamp=11 --arm rclamp=23 --arm rclamp=47 --seeds 42,1,2 <the same 13 scenarios>
node tools/sim-side-ab.mjs --arm cap=8 --minerals feldspar,albite,quartz --seeds 42,1,2 radioactive_pegmatite gem_pegmatite
node tools/sim-side-ab.mjs --arm pb --arm nopb --seeds 42,1,2 radioactive_pegmatite schneeberg
node tools/sim-side-ab.mjs --arm cap=8 --arm cap=8,pb --arm cap=8,nopb --minerals feldspar,albite,quartz --seeds 42,1,2 radioactive_pegmatite
node tools/sim-side-ab.mjs --arm excess=1 --arm excess=3 --minerals galena,molybdenite,uraninite --seeds 42,1,2 mvt porphyry radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill schneeberg sunnyside_american_tunnel
node tools/sim-side-ab.mjs --arm excess=1 --minerals galena --trace galena --seeds 42,1,2 reactive_wall

node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs
node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs --minerals selenite,celestine naica_geothermal
node proposals/evidence/sim-side-2026-11-09/probe-baseline-history.mjs <vugg-canary>/logs/2026-11-04/v286
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs
node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs --minerals selenite,celestine,calcite,aragonite,anhydrite naica_geothermal stalactite_demo zoned_dripstone_cave
node proposals/evidence/sim-side-2026-11-09/probe-cell-field-gap.mjs schneeberg uranophane pH 6.0
node proposals/evidence/sim-side-2026-11-09/probe-cell-field-gap.mjs supergene_oxidation ferrimolybdite O2      # and Mo
node proposals/evidence/sim-side-2026-11-09/probe-side-doors.mjs     # a static reading of the nucleation files
node proposals/evidence/sim-side-2026-11-09/probe-ab-digest.mjs      # reads the committed A/B outputs and census reports; runs nothing

npm run audit:runtime
npm run typecheck
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
```

The five tools write only under `.local-evidence/`, the directory the test identity guard excludes.
They exit 0 whatever their readings and controls say; they throw on a bad argument, and the
mutation tool throws if a mutant no longer matches the census. The six probes print and write
nothing. The outputs quoted in this document are committed in
`proposals/evidence/sim-side-2026-11-09/`, and the README there gives the exact command behind each
file, the 41 scenario names of the `refund` runs included. The three census reports and the
mutation report each name the sha256 of `tools/sim-side-census.mjs` as it ran, and it is the
committed file's. A census row is cached under a digest that includes the seed and the text of
the code that produces the row, so a row cannot outlive a change to that code or be handed to
another seed. The digest does not cover the rest of the file: the controls and the report are
recomputed from the rows on every run. The A/B outputs carry no such digest. Every one of them
was produced by `tools/sim-side-ab.mjs` as it stands at commit `0b243e32`, in one re-run after the
last change to what the tool does. The commit after that one corrects two sentences of the
tool's header comment and changes no line of code.

The six gates pass on this tree. **The full suite** (`npm run ci`, about 2.5 hours cold) is not part
of this commit's evidence, and it has not been run on this tip. It is to be run on the final tip
of the branch, and its verdict recorded in a comment on the pull request. The repository's chip
selector (`tools/test-chip-check.mjs`) has none of this change's paths in its authored map, so it
offers no bounded test set for it; its own answer for such a change is a full check. No file the
suite reads is changed, and no test was added.

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
(census v5, SIM 286; 41 of 41 runs reproduce the baseline).

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
| dissolving | 57 (5.0 %) | 37 (6.5 %) |
| dissolving while the bulk handle reads at or above saturation | 4 (0.4 %) | 4 (0.7 %) |
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
| `ab-pegmatites-rind-clamp.txt` | §3.1 A/B table (rind, the clamp on sigma, the clamp on the rate); the other two pegmatites |
| `ab-gem-factor-caps-root.txt` | §3.1 A/B table (factor caps, root) |
| `ab-gem-boron.txt` | §3.1: tourmaline against the boron, in the plugged pocket and the open one |
| `ab-feldspar-13-scenarios.txt` | §4 C1: what each shape moves in the 13 scenarios that grow feldspar or albite |
| `ab-quartz-also-clamped.txt` | §3.1: radioactive_pegmatite with quartz bounded as well |
| `ab-radiogenic-lead.txt` | §3.3 A/B table: radiogenic lead carried to the voxels, and kept out of every fluid |
| `ab-radiogenic-lead-open-pocket.txt` | §3.3 and §4 C3: the same two arms with the pocket open (feldspar, albite and quartz clamped) |
| `ab-rate-on-excess.txt` | §4 C2 preview table |
| `ab-gem-clamp-sensitivity.txt` | §4 C1: sensitivity to the clamp value, on the rate and on sigma |
| `ab-clamp-values-13-scenarios.txt` | §4 C1: three more clamp values on the same 13 scenarios (E = 7 is in `ab-feldspar-13-scenarios`) |
| `ab-reactive-wall-trace.txt` | §4 C2: galena sigma on the bulk handle and on its own cell |
| `rate-at-saturation.txt` | §3.2; the shape test of §4 C2 |
| `seed-variety.txt` | §2.4 |
| `probe-sigma-maxima.txt`, `probe-sigma-maxima-naica.txt` | §3.1 (cause), §3.4 |
| `probe-baseline-history.txt` | §3.1, §3.4 |
| `probe-nucleation-envelope.txt`, `probe-nucleation-envelope-per-vertex.txt` | §7 |
| `probe-cell-field-gap-uranophane-pH.txt`, `-ferrimolybdite-O2.txt`, `-ferrimolybdite-Mo.txt` | §2.1 |
| `probe-side-doors.txt` | §2.3 |
| `probe-ab-digest.txt` | the counts §2.1, §3.1, §3.3 and §4 draw from the A/B outputs and the census reports |
