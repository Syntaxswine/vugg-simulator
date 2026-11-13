# Simulation-side review: what ends a crystal's growth (2026-11-09)

**Status:** a review and five passive instruments. Nothing under `js/`, `data/` or `tests-js/`
changes, no baseline or receipt moves, and SIM stays 286.
**Base:** `origin/main` `e86ba58a`. `canonical/main` (`915ed33a`) is a merge whose tree is identical
to that of `c2651d4f`, an ancestor of this base, so it holds no change this base lacks.
**Asked by the boss, 2026-11-09:** "take a look at vugg simulator and see if you see any improvements
of the simulation side of things."
**Awaits the boss:** the eight decisions in §6. No fix is applied here. SC1, SC2 and SC3 are each a
SIM bump with a shape to choose. §4 previews each of them by A/B, and says where a preview is
missing.

Terms used throughout. *σ* is the simulator's supersaturation ratio for a mineral; 1 is saturation,
and σ − 1 is the *excess*. *σ_crit* is the registry's nucleation threshold for a mineral
(`MINERAL_GATES_REGISTRY`). The *bulk handle* is `conditions.fluid`, the one fluid object that events
write and nucleation reads. The *voxel field* is the 7,680 fluid cells (16 rings × 120 cells × 4
depths) that crystals grow from, and a crystal's *own cell* is the wall voxel it sits on. A mineral's
*ingredients* are the formula species the ledger debits for it. A *zone* is one step's growth layer
on one crystal. Each step the simulator first runs every active crystal's engine once on the
crystal's own cell to see what it proposes; that is the *dry run* (`_dryRunEngineForCrystal`,
`js/85b`), and it is when a cell is read as its crystal reads it. A stored zone's thickness is the
engine's proposal times a *time scale* (`js/13-runtime-state.ts:17`, applied in a run at
`js/85b-simulator-nucleate.ts:1382`). The scale is 5 in every run of this review but the Zen
runs of §3.1 and §4: the game sets 5 on entering Simulation, Creative and Random Vugg, and 1
on entering Zen (`js/94-ui-menu.ts:621` to `:647`; it sets 1 on entering the Record Player
too, where no run starts). Unless a section says otherwise, a run here is a scenario as
*Simulation mode* starts it with its form at the defaults, which at seed 42 is the run the
committed baselines pin. The game's other
modes start their runs differently (§3.1; §4, SC1), and Simulation mode's own form can change
a run's cavity and length (§4, SC1). The *scenario object* is `conditions._scenario`: a named
set of fields copied from the scenario's authored entry onto a run's conditions when the
scenario is built (`js/70-events.ts:963`). The license, the exclusions, the nucleation
windows and the fields an engine reads from the scenario are among them, and a field not
named there is not carried. *Zen's drift* is what Zen mode writes to the simulator's
conditions before each step in place of events: a random walk on temperature, nine fluid
species and pH, and a 2 % chance of a random event (`idleApplyDrift`,
`js/98a-ui-zen.ts:116`). §3.3 says what of it reaches a crystal. A *size class* is one of three ranges of cavity diameter a wall can be
given: vug (5 to 25 mm), pocket (25 to 300 mm) and cave (0.3 to 3 m;
`js/22-geometry-wall.ts:59`). Random Vugg draws a diameter inside the class. Simulation
mode's Cavity Size select and Creative mode's own setup take the middle of it: 15, 162.5 and
1,650 mm (`:70`). The *agent interface* is the page's own
(`js/99z-agent-interface.ts`). The *agent API* is a separate headless runtime with its own copy
of the engines (`agent-api/vugg-agent.js`). The *reference* for a cell is the bulk handle's fluid read at
that cell's temperature, so "the reference's excess" in the appendix and "the bulk fluid's
excess" in the text are one quantity. A crystal is *surviving* when the baseline's own split does
not count it as dissolved. `js/27` recomputes that flag on every negative zone, so a crystal that
has grown is surviving for as long as it has solid left. A crystal that was born and never grew
counts as surviving too (42 / 47 / 46 of them at the three seeds).
In an A/B a species is *present* in a run when at least one of its crystals has solid left at the
end. A crystal that dissolved away, or was born and never grew, leaves a record and no solid, and
a record is not presence. A species is *lost* when it is present as shipped and not under the arm,
and *gained* the other way round. It is *moved* when it is present in both and its number of
crystals with solid changes, or its largest crystal changes by a factor of more than 1.25 either
way (so a shrink of a fifth counts; the factor is taken on the sizes plus one micrometre, so that
two specks do not count). A scenario is moved when any of its species is moved, gained or lost.
That is a coarser test than a baseline's: a scenario's *baseline differs* when the per-species
summary the committed baseline stores (counts, and the largest size to 0.1 µm) is not the shipped
one, and the A/B tool reports both. The changes proposed in §4 are numbered SC1 to SC5, for
"simulation-side change". The first four versions of this document called them C1 to C5, which
are already the rungs of the nature roadmap's kinetics ladder
(`ROADMAP-BYTE-IDENTICAL-NATURE-2026-07-03.md` §4), so a "C" number here is always a rung of
that roadmap. "R" numbers are the rungs of the mineral-recipe review, and "WP" numbers the work
packages of the story-pocket proposal. The *canary* is the nightly regression sweep of all 41
scenarios over 55 seeds, kept in a repository of its own. A scenario's *license* is the union of
its four authored tiers of species (expected, deterministic, statistical, aspirational); a species
outside it cannot nucleate there. The *locality gate* is `npm run audit:localities`, a step of the
full suite, which holds every scenario to those tiers on seeds 1, 2 and 42. The *cation gate* is
`npm run audit:cations`, another step, which holds `schneeberg` at seed 42 to two commissioned
numbers (§4).

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
| S1 | Supply binds at the crystal's own cell and nowhere above it | In 13 of the 40 scenarios that grow anything, more than a tenth of the stored thickness was put on at a cell under half the bulk fluid's excess (four of them through the feldspar pair's own growth, which F1 is about; 12 would remain under the bound SC1 recommends, 9 if the pair were bounded in every scenario); in 25, under 1 %. 56 of the 568 surviving crystals ≥ 1 mm stored most of their growth that way; 8 of them are feldspars or albites, and for 9 a redox or pH gap is part of the cause. The surviving solids hold a median 0.008 % of the most the whole field ever held of each solute (0.6 of one voxel's worth), and at most 1.7 %. | 2.1 |
| S2 | Growth ends by the clock, the cavity, an event or burial | 321 of the 568 surviving crystals ≥ 1 mm (56.5 %) are still growing on the final step, and 4 made their last stop because their cell ran short. 17 of the 41 scenarios end ≤ 1 % full and 6 end > 70 % full. | 2.2 |
| S3 | `flow_rate` is authored and feeds nothing | 103 assignments in 22 event files, 11 event lines of scenario data and a Creative slider. No engine, supply or nucleation code reads it. In the 41 scenarios its one reader is the wall's scallop record. | 2.5 |
| F1 | The pegmatite pocket plugs | `gem_pegmatite` is full at step 9–10 of 230 at seeds 42, 1 and 2; 7 of its 8 events fire into a full pocket. With feldspar and albite bounded, tourmaline reaches 12 mm and topaz appears. Boron is not the lever: tourmaline's boron factor is already at its cap. The same fluid plugs a Zen run of the scenario. In Random Vugg a pegmatite's fluid fills 3 of 8 cavities of the pocket size class, all 8 of the vug class, and 4 of 8 at the size setting that page opens on. | 3.1 |
| F2 | Three engines propose growth at saturation | Of 183 engines the probe drives 174. Of those, 171 propose a rate that vanishes at σ = 1; galena, molybdenite and uraninite propose half their σ = 2 rate. `reactive_wall`'s galena put on 88 % of its 3.9 mm below σ 1.05. | 3.2 |
| F3 | Radiogenic lead reaches only the bulk handle | Bulk Pb climbs 30 → 147 ppm (`radioactive_pegmatite`) and 5 → 179 ppm (`schneeberg`); every voxel stays at 30.00 and 5.00. Latent while that pocket plugs. Outside the scenarios it is the same: 30 → 268–286 ppm in Creative mode's starter fluid of that broth, 30 → 621–682 ppm in a Zen run of the scenario and 5 → 1,015–1,035 ppm in a Zen run of `schneeberg` (seeds 42, 1 and 2), every voxel where it started. The galena that `radioactive_pegmatite` promises, in its description, its notes and the narration of its last event, is not among the species the scenario licenses. | 3.3 |
| — | Counts are authored; a seed changes sizes more than species | Known (story-pocket WP7 and WP9; PR #45). Re-measured in §2.3 and §2.4 because they belong to the same structure. | 2.3, 2.4 |

Most of these readings have ancestors in the tree, which the first four versions of this
document did not cite (§2.1, §2.2, §3.1, §3.3 say where each is).

- *The cell.* On 2026-07-07 the nature roadmap's rung C1, the local-σ depletion field, found a
  third of the fleet's crystals growing on a cell 10 % or more off the bulk fluid. The next day
  a probe on Shigar's aquamarine found that a change to the bulk fluid moved the crystal by
  nothing, and that its size was set by what its own cell held ("the wallet law").
- *The plug.* The owner reported a pegmatite feldspar larger than its vug on 2026-05-06. The
  high-fill research of 2026-05-16 had both pegmatite scenarios sealing early, and gave the
  simulator its fill dampener.
- *The galena.* The release note of v160 (2026-05-28) recorded that its strangulation gate
  took galena and plumbogummite out of `radioactive_pegmatite`, flagged that for review, and
  put it down to walls depleted by competing growth. The data review of 2026-07-14 judged
  galena the wrong lead mineral for that scenario, and the Wise review of 2026-08-05 noted
  that the scenario narrates a galena it does not expect.

What this review adds: how much the cell's draw-down decides outcomes across the fleet, and
where supply stops binding; the cause of the pegmatite fill and what it costs; and that the
radiogenic lead never reaches a crystal.

§4 proposes an order: bound the feldspar pair where the pegmatite pocket plugs (SC1, F1); put
the three engines on σ − 1 (SC2, F2); carry the radiogenic lead to the voxels (SC3, F3); and
pilot a supply with a scale above the cell — a physical debit, a feed from the `flow_rate` the
events already author, and a clock (SC4; S1–S3). Each of the first three has a cost that §4
sets out and §6 puts to the owner.

- *SC1* comes with a choice of where the bound lives, a value, a ruling, and a horizon.
  Authored on `gem_pegmatite` it changes one baseline, and it makes topaz appear, which
  that scenario lists as aspirational, so the locality gate needs topaz's tier changed in
  the same bump. Its value, 7, is the one this review previewed, and it is one of a range:
  in the scenario's own cavity the bump's acceptance lines are met by every whole value from
  5 to 9, with the same gems and with more or fewer steps to spare. In ten other cavities
  of that size, which the form's Shape Seed box draws, they are met by 5 to 8, and 9 fails
  in two (§4, SC1).

  It is a bound on a rate, so it buys steps and not an end, and how many depends on the
  cavity. In the scenario's own cavity, where Simulation mode and Creative mode start the
  scenario, it keeps the pocket open through the scenario's own 230 steps. Stepped on, the
  pocket passes 0.7 full 27 to 29 steps later and seals at step 304 to 306, on quartz, and
  Creative mode, where the Scenarios menu opens a scenario, has no last step. Simulation
  mode's form lets a player choose the cavity as well as the length. In its smallest
  cavity, a 15 mm vug, the bounded pocket seals at step 97 to 99, and no bound on the pair
  alone would keep it open: with the pair holding no solid at all, quartz and tourmaline
  seal that vug at step 174 to 176. That setting fills 15 or 16 of the 40 scenarios that
  have a pocket to fill, as shipped, where three fill in their own cavities (the
  forty-first is authored as an open surface).

  The bound does not reach Zen or Random Vugg. A Zen run of the same scenario leaves the
  scenario's entry behind and would plug as it does today, at step 32 or 33 on Zen's slower
  clock. Random Vugg's pegmatite archetype, where the owner first reported the plug, has no
  entry at all. Three of eight random cavities of its pocket size class fill completely,
  and four of eight at the size setting its page opens on. Written into the
  engines for every scenario the clamp reaches those too. In Random Vugg it keeps the eight
  pockets that were run from filling completely; ten of that class's 23 smallest pockets
  and six of eight vugs still fill under it. It then changes
  eight baselines,
  empties Shigar's pocket, and leaves `schneeberg` without solid native arsenic and native
  bismuth at seeds 1 and 2 and without solid cobaltite at seed 1, all three of them species
  that scenario expects.
- *SC2* has a cost outside its own three minerals. At the same constant `schneeberg`'s
  uraninites end at 5.1 mm, not 8.3, and their radiogenic lead falls with them (111 ppm on the
  bulk handle at run end, not 179). The cation gate commissions a number in that scenario that
  follows the lead, so SC2's bump has to commission a new one.
- *SC3* comes with two choices that are coupled. If the lead is held in the uraninite until it
  is altered, as the sources describe, no galena can form in `radioactive_pegmatite`, licensed
  or not. That timing is the one recommended, with the galena taken out of the scenario's own
  texts, one of them the narration the player reads. Under either timing `schneeberg`'s two
  largest crystals are named amazonite where they are named microcline today, though the
  cavity view draws them as before, while `radioactive_pegmatite` shows nothing until its
  pocket stays open. The timings also part where the game grows a uraninite with no event
  to alter it: in Creative mode's starter fluid of that broth and in Zen runs of the two
  uraninite scenarios, none of which has a license. Left to itself such a run does not
  alter its uraninite. Held, the lead is then not released, until a player oxidizes the
  pocket: a Drain or an Evaporate in Creative mode releases what is held by then. Released
  every step, it grows a galena of 8 to 10 mm in the starter fluid, one of half a
  millimetre in a Zen run of the scenario, whose pocket is full by step 200, and one of 21
  to 23 mm in a Zen run of `schneeberg`.

**This document has been corrected sixteen times, each time by its own review round.** The first
version said supply does not bind. The second costed the recommended fixes too lightly. The third
counted a crystal that had dissolved away as still present, and recommended a lead mechanism that
cannot work. The fourth left out a gate that the recommended change trips, and put two coupled
choices to the owner as if they were independent. The fifth counted two places where the galena
is promised, and gave as a reason for one timing a difference it had measured on one reader of
three. The sixth measured Zen mode on another mode's clock, counted the galena's places short
again, and said a save has to carry state that a save does not hold. The seventh read a bound
on a rate at one run length and called it a cure in modes that have no last step, and said
the two lead timings differ in one view when they differ wherever the game lists zones. The
eighth read that bound in the scenario's own cavity, when Simulation mode's form offers three
others, and counted lines of a step log that Simulation mode prints only in part. The ninth
said the bound is too loose for the form's smallest cavity, and left the owner to choose
another value for it, when no bound on the pair keeps that cavity open; and it counted
Random Vugg's plugs in one of that mode's three size classes. The tenth then said that no
course holds that cavity either, having run each course alone, when two of them together
do, at a price; it said of a size class what it had run on eight cavities of it; and it
read all of Zen's drift as written to the bulk handle, when one part of it is not. The
eleventh counted, among the pockets that fill in the form's smallest cavity, a scenario the
owner has authored as an open surface, which the game never seals; it said the preview
could not stand for the one pair of changes that holds that cavity, when a clamp written
into the engine gives the same result; and it carried a count of four scenarios from
Simulation mode into Zen, where it is two. From the fourth round to the tenth the measured
numbers held, and the source lines cited were the lines: what went wrong was what this
document says about the cost and the reach of its own proposals, and one reading. In the
eleventh a headline count was one too high as well, because a probe counted pockets by a
fill the game does not use, and one cited line was two lines out. The twelfth round found
nothing that had to be fixed and three statements wider than what stood behind them. The
document called the preview's wrapper and a clamp written into the engine one run, having
compared their sizes and their fill, when the two record another trace of aluminium on
6,908 albite zones. It had not run SC2's preview, a wrapper of the same
kind, against the law it stands for, and in one scenario at one seed the two are different
runs. And its acceptance lines for the bound refused a value that is too loose and none
that is too tight. The thirteenth round reviewed the one commit that answered the twelfth.
The rule that commit gave for the bound's value, the loosest that keeps the pocket open
for its run, does not give the 7 this document recommends: the acceptance lines admit
every whole value from 5 to 9 and pick none. Its probe for SC2 had not made an engine
compute the proposed law; it had refused the preview's zones where a reading of the
engines said the engine would. And a sentence about what differs between the two forms
of the clamp was contradicted by the probe's own output. The fourteenth round reviewed
the commit that answered the thirteenth, and again found nothing that had to be fixed and
three things left short. That commit reported that SC2's two forms part in one scenario
by rounding alone, said that the cause was not traced, and still gave the effect a
boundary, "at three times the constant". The round traced it: in a pocket that is full a
layer of 10⁻¹¹ µm licenses an enclosure, and it does so in the shipped run of that
scenario at two seeds of three (§3.4). The range of 5 to 9 had been read in the scenario's
own cavity alone. And one sentence still called 7 the loosest value run. Answering that
round, a run of the whole fleet found a second outcome that rounding picks, in `wittichen`
at the baseline's own seed (§3.4). The fifteenth round reviewed the two commits that
answered the fourteenth, and found one thing that had to be fixed. The reach of that
layer had been read in each scenario's own cavity and was written as the fleet's. In the
15 mm vug that Simulation mode's form offers it is in `supergene_oxidation` at all three
seeds, and there a nudge of a part in 10¹³ or less moves runs in nine scenarios (§3.4).
The sixteenth round reviewed the commit that answered the fifteenth, and found three
things that had to be fixed, all in what that commit had added. It had counted what such
a zone decides through the host of an enclosure, when the same function reads the
guest's last three zones and at that vug the guest's side decides more. Its example of
how far two runs end apart set a crystal of one run beside another crystal of the other
that carried the same number. And it said the host layers at that vug run without a gap,
when the output it cited shows one of six decades.
§9 lists every correction.

## 1. What was run

Runtime: Windows x64, Node 24.15.0, the runtime the committed baselines were made on. The change
adds files under `tools/` and `proposals/` and edits two documents; nothing under `js/`, `data/`
or `tests-js/` changes. §8 lists the gates that were run and says what was not.

| Instrument | What it reads | Integrity and controls |
|---|---|---|
| `tools/sim-side-census.mjs` | One pass per scenario: fill per step; what each crystal's engine read on its own cell when it ran, and which field holds a drawn-down cell down; what ended each crystal's growth, and every pause on the way; what the ledger refused outright; the bulk handle against the voxel field; the vadose override; the count rules, on the σ the nucleation pass reads; and a physical-unit restatement of what was grown. Three static readings of the source. | At seed 42 all 41 runs reproduce `tests-js/baselines/seed42_v286.json` with the instrument attached. Thirty-five controls, twenty-four positive and eleven negative, all passing at seeds 42, 1 and 2. |
| `tools/sim-side-census-mutations.mjs` | Forty-six broken copies of the census, one line changed in each, run on the scenarios the guarded control needs. | Every control passes on the census as committed and fails on each of its mutants, and no control is without a mutant. A mutant is judged on the one control it aims at (below). |
| `tools/sim-side-ab.mjs` | Shipped arm against an arm with a named intervention applied in-process: a feldspar rind, a clamp on σ, a clamp on the rate, factor caps, a per-factor root, a k·(σ−1) rescale, radiogenic Pb carried to the voxels or kept out of every fluid, a multiplied broth field, or every debit returned to its cell. For every arm: the species lost, gained and moved, whether the scenario's baseline would differ, and the largest fill of the run. | The shipped arm reproduces the baseline at seed 42. The neutral knobs (`rind=Infinity`, `cap=Infinity`, `rclamp=Infinity`, `root=1`, `mul=Ca:1`, `refund=0`, and `fcap=Infinity` where the minerals are feldspar and albite) reproduce the shipped arm exactly, on `schneeberg` at seed 42, before every batch. Every arm's audit counts are compared with the shipped arm's (§7). |
| `tools/rate-at-saturation-census.mjs` | Each growth engine called directly with σ forced to 1.0005 … 3 and the rng re-seeded before every call; then, for the engines that propose a rate at saturation, the σ at which they actually grew. | Quartz and fluorite, k·excess laws by inspection, read "vanishes". All 8 scenario runs reproduce the baseline. |
| `tools/seed-variety-census.mjs` | One night's run of the canary (55 seeds). No simulation. | None of its own: it restates the canary's committed summary, per species over its seeds, and, where this machine holds them, its per-seed records. |

Seeds: the census and every A/B ran at 42, 1 and 2; the canary run is `2026-11-04/v286`
(55 seeds, vugg `e86ba58a`).

A control that passes proves little until it has been seen to fail. The mutation tool breaks the
census forty-six ways. Among them: the step log read once instead of every step; the competition
receipt, and the budget receipt, ignored; the voxel mean read from the bulk handle; the fill
recorded as 0, and as 1; the stop never recorded; the crystal's own cell read from the bulk handle;
the ingredients never restored; the license, the exclusion list and the nucleation window never
asked; the localized-nucleation envelope not put up; and the engine's view read after the step's
diffusion instead of at the dry run (trap 8).
Each control fails on its mutant, and the tool lists any control no mutant aims at (none). The
tool has a limit of its own. It runs a mutant on the scenarios its one control needs and judges
that control alone, so it does not show what else a mutant breaks, or that a control fails for
the reason its label gives.

Six of the controls were added after the fourth review round, on readings this document had
quoted without one: the count of crystals of 1 mm or more grown mostly on a drawn-down cell; the
starved crystal-steps; the thickness stored between 0.5 and 0.9 of the bulk fluid's excess; the
thickness stored where the bulk handle is itself at or under saturation; the lowest wall cell of
a field; and the ring means of the vadose reading. The fourth review round had broken four of
those readings at once in a copy of the census (not committed), and the copy reproduced every
baseline and passed all 26 of the controls it then had.

The fifth round found those six to be floors. Each asked for "at least" so much, and its mutant
made the reading smaller, so a census that counted too many would have passed. The round built
such a copy (not committed). It over-counted three of the readings at once, and on the eight scenarios it was
run on it reproduced every baseline and passed every control they evaluate. Two of the six
are now closed from above. The count of crystals is exact (three of `colorado_plateau`'s
thirteen), and the ring means are held to a band, with a second ring read. A third, the lowest
wall cell, was a band already. The other three have a negative control beside the positive
one: `schneeberg` has crystal-steps below saturation on the cell that the ingredients do not
restore, and they have to be filed apart from the starved ones (34 / 70 / 12 at the three
seeds, against a floor of 10, which is thin at seed 2); `tn457_barite_pulses` stores nothing
in the band; and `mvt` stores nothing where the bulk handle is at or under saturation. Five
mutants that count too many, or read a gap too wide, were added, and each is caught.

Those three negatives catch a reading filed in the wrong class, which is what their mutants
do. They do not catch a multiple. The sixth round built a copy of the census (not committed)
that counts the
starved crystal-steps, the band and the thickness under a saturated bulk fluid twice. On the
14 scenarios the controls need, it reproduced every baseline and passed all 35 controls. So
those three readings are guarded on one side.

So are sixteen older positive controls, which makes nineteen of the twenty-four. Ten are
floors with no negative beside them: the competition log, the two supply readings, the pause,
four of the count readings (excluded, window, cap and gate), the enclosed crystals and the
draw-down through pH. Six are floors beside a negative that reads zero, and a negative at zero
passes a doubled reading as it passes a true one: `two-fluids`, `draw-down`, `count`,
`count-envelope`, `strangled` and `vadose`. The seventh round built a copy of the census (not
committed) that over-reads those six and moves nothing between classes. On the same 14
scenarios it reproduced every baseline and passed all 35 controls, one of them on a reading
of 300 steps in a run of 150. An
over-count in any of the nineteen would pass its control. Five positive controls are closed
from above: `big-drawn-down` is exact, `wall-min` and `ring-means` are bands, `time` reads the
class of one crystal, and `space+end` asks for a step no later than 15.

The census's own header still lists only the ten floors that have no negative beside them,
and the label of `space+end` says that it "FLIPS when the plug is cured", a word this document
no longer uses for the bound. The tool is left as it is: any edit to it changes the sha256
that the three census reports and the mutation report name, and they would have to be made
again. The header and the label are to be corrected in the commit that next changes the
tool. SC1's bump rewrites `space+end` in any case.

These readings have no control, and stay labelled so: the throughput restatement (§2.6 checks its
arithmetic by hand on one row); the births that never grew; the three static readings of the
source; within the END table of §2.2, the classes "undersaturated on its cell and on the bulk
handle", the two "dissolving" classes, "size cap", "at or above saturation on its cell, nothing
proposed" and "a zone proposed and not stored"; within the count reading of §2.3, the
prerequisite test, which reads zero in every run, and every cause the `_wallStrangledFor`
attribution can name except a missing ingredient; and, within the draw-down reading of §2.1,
every answer of the one-further-field search except pH.

Twenty-six small probes are committed beside their outputs in
`proposals/evidence/sim-side-2026-11-09/`. Twenty-four carry statements of their own: the range of σ
each scenario's bulk fluid covers for feldspar, albite and quartz (§3.1); the history of a few
headline crystals across the 258 committed baselines (§3.1, §3.4); whether a wrapped σ method
stays in force during nucleation (§7); one fluid field on a mineral's own cells against the
bulk handle (§2.1); what the side doors on the count gates are made of (§2.3); when radiogenic
lead is released against whether galena is licensed, in the scenario and in other places
where the game grows a uraninite (§4, SC3); which crystals of `schneeberg`
survive only inside another (§4, SC1); what each previewed change does to the two numbers the
cation gate commissions (§4); where else the game builds a pegmatite's fluid, and what a bound
does there, in other cavities and at eight more seeds (§3.1; §4, SC1); how many steps that bound buys before the
pocket fills, where the game lets a run go on past the scenario's length (§4, SC1); whether
the wrapper that previews that bound is the clamp an engine would apply, in sizes and fill
and in the record of each zone (§4, SC1; §7); which values of that bound the bump's
acceptance lines admit, in the scenario's own cavity and at ten other shape seeds (§4,
SC1; §6); whether the wrapper that previews SC2 is the
law its three engines would compute (§4, SC2; §7); what layer of a host licenses an
enclosure in a pocket that is full, and which runs a rounding then decides (§3.4; §4,
SC2); how thick the host's layer is in every enclosure of the fleet and what the growth
loop's fill read when the layer was accepted, in each scenario's own cavity and in the
form's smallest (§3.4); which shipped runs of the fleet a change of a part in 10¹³ or
less in every zone moves, in those two cavities, what differs in them, what twelve such
factors do where four were tried, and where the runs that move in the form's cavity part
from the shipped ones and by what (four probes more, and the one just named for the
form's cavity; §3.4); which enclosures of the fleet a zone from the cavity's last room
decides through the guest's own zones, and what the loop hands out there, in those two
cavities (§3.4); whether `gem_pegmatite`'s readings under the previewed bound move
under such a nudge, in its own cavity and in the form's (§3.4; §4, SC1); what
every scenario does, as shipped, in the smallest cavity Simulation mode's form offers (§3.1);
which of the writes Zen mode's drift makes reach the fluid a crystal grows from, and which
of Zen's 41 simulators put up the nucleation envelope or grow a uraninite (§3.3); and the
first-appearance windows the locality gate holds, under each previewed change (§4). Two run no simulation and read the A/B
outputs and census reports in that folder: one prints the counts this document draws from
them, the other holds each previewed change to the locality gate's tiers (§4).

One instrument is not this review's. `tools/c1-depletion-ev-probe.mjs`, the probe the roadmap's
rung C1 was decided on in July, was run unchanged at seed 42, and its output is in the same
folder (§2.1).

**Evidence that is not in the tree.** Each review round ran probes of its own, in the
author's working directory under `.local-evidence/review-rN/`, which the repository ignores.
Where this document cites one ("the sixth round ran", "by the seventh round's run"), the
number was checked against that round's output file, and it cannot be reproduced from the
committed tree: a reader has this document's word for it. In §1 to §8 each such statement
says *not committed* where it stands. §9 lists what each round found, and the runs it
cites there are the rounds' own unless an entry says a probe here now makes them. They are
of fourteen kinds: copies of the census that over-count
(above; trap 21); copies of the census with a proposed change installed (§4, SC2 and SC3;
trap 5; §7); a run of the agent API's fluid preset (§3.3); `schneeberg` opened in Creative
mode (§6, decision 3; §7); a looser clamp tried against an earlier acceptance line for Zen
(trap 22); runs of the trees of v70, v159 and v160 (§3.3); assertions of the test suite
run under a preview (§4, SC1; §7); a trace of how a fill passes 100 % (§3.4); the step at
which `schneeberg`'s uraninites are first altered (§4, SC3); what the game shows of an
albite under the two forms of the clamp (§7); two spellings of SC2's law run against
the probe's (§7); the fill followed through a step that hands out the cavity's last
room (§3.4); nudges made another way than a probe here makes them (§3.4); and a floor
put on the host's layer of an enclosure by a wrapper (§3.4). No
recommendation of §4 rests on one of them. The predictions of which census controls SC2
and SC3 flip do, and so does the direct evidence that the walls of v160 held no radiogenic
lead.

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

**This much was known.** That growth reads and depletes the crystal's own cell, and that a
diffusion pass refills it, was written down in early July 2026 in answer to a question from the
boss (`HANDOFF-FOUNDATIONS-2026-07-03.md`: "the broth is HALF-dynamic already"). The same note
named what was missing: the draw-down as a field, direction, and nucleation that reads the
field. On 2026-07-07 the nature roadmap's rung C1, the local-σ depletion field, measured it
(`ROADMAP-BYTE-IDENTICAL-NATURE-2026-07-03.md` §4; `tools/c1-depletion-ev-probe.mjs`). Its probe
found the solute books balanced and the field real: 34 % of 1,131 fluid-grown crystals had a
growth-weighted σ on their own cell 10 % or more off the bulk fluid's, and 31 % carried a
gradient from base to tip. The rung then shipped a render-only tranche that draws each crystal's
exposure from that field. Run unchanged on today's tree at seed 42, the same probe reads 24 %
of 1,040 crystals (247) for the first and 22 % of 1,039 (228) for the second
(`c1-depletion-ev-probe-seed-42.txt`). It samples a cell after the step, when diffusion has
refilled it (trap 8), and it asks how far σ is off, not how much of the excess is gone, so its
count and the tables below are two readings of one field.

The day after, the same structure was met as a law, on one crystal. A probe on Shigar's
aquamarine (`tools/shigar-aqua-growth-probe.mjs`, SIM 219) moved the bulk fluid's σ from 3.91 to
9.13 and the crystal "did not grow one micron more": the engines read the cell, and a change to
the bulk handle reaches the cells only through the event broadcast. What set that crystal's size
was what its cell held, "the wallet law", and the handoff drew the rule for anything grown:
before tuning a rate constant, census the budget (`HANDOFF-FOUNDATIONS-2026-07-03.md`, the
Door 1 addendum of 2026-07-08). This review is that census taken on every crystal of the fleet.
What it adds is how much the draw-down decides an outcome (the `refund` test below), which solute
does the drawing, and where supply stops binding. F3 is the same wiring met on one more write
(§3.3).

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

**How much of that is the feldspar pair.** Four of those scenarios at seeds 42 and 1, and three
at seed 2, owe their place in the first table to the two minerals of §3.1. All of
`gem_pegmatite`'s and `shigar_pegmatite`'s drawn-down thickness is feldspar and albite, and so are
130 of `radioactive_pegmatite`'s 147 mm and 37 of `tormiq_alpine_cleft`'s 44 mm (seed 42). An
engine at a σ in the hundreds draws its cell down because its rate is a runaway, and that runaway
is the defect of §3.1. How much of the reading survives a fix depends on where the pair is
bounded. Under the bound SC1 recommends, on `gem_pegmatite` alone, only that scenario leaves the
count: the second row of the first table reads 12 / 10 / 10 of 40 and the third stays 3 / 2 / 1.
With the pair's part taken out in every scenario the rows read 9 / 7 / 8 and 1 / 1 / 0. Both are
arithmetic on the committed table, not runs with the pair bounded (`probe-ab-digest.txt`). The
control that guards the draw-down reading sits on `colorado_plateau`'s uranophane, which neither
bound touches.

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

The arm is not a closed system, and it has to be shown to change nothing but what it names. An
arm of this kind can trip the carbonate boundary's audit and so cancel an authored event
(§5, trap 10). This one leaves every audit the tool reads as the shipped arm has it, in
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
- *A feed.* Nothing feeds the field at a rate set by flow. What enters from outside arrives with
  the events and movements, whose changes land on every voxel alike; with the wall, which
  releases Ca, Mg, CO3, Fe and Mn when an acid fluid dissolves a carbonate wall (`dissolve_wall`,
  `js/85d`, propagated the same way); and, where a scenario has one, through the carbonate
  boundary, which exchanges carbon every step (`js/85c`). `flow_rate` sets the size of none of
  them (§2.5).

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
dampener of `js/85d` (it starts at fill 0.7) is slowing growth and has not yet stopped it. One
of the 41 is not a pocket. `great_salt_plains` is authored as an open surface (`open_system`
on its wall, `data/scenarios.json5:1555`): the step reads its fill as 0, so its growth is never
dampened for fill and it is never sealed (`js/85-simulator.ts:501`, `:627`). Its 5 to 6 % in
this count is its crystals' volume over its basin's, a number the game does not use. The
split is an old observation. The high-fill research of May 2026 found 6 of its 24 scenarios
approaching a full pocket and 15 never passing a tenth full, and its proposals gave the
simulator the dampener (`RESEARCH-GROWTH-AT-HIGH-FILL.md` §2). Its last proposal, a fill read
per cell in place of one number for the cavity, shipped at v77 as a switch that a scenario's wall
can set (`per_cell_local_fill`; `js/22-geometry-wall.ts:282`, read at `js/85-simulator.ts:921`).
No scenario sets it. §4 tries it on `gem_pegmatite` (SC1).

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

**Four scenarios do not read the bulk handle.** Where a wall nucleates per vertex or a thermal
field is active, `check_nucleation` wraps every σ method for the length of the pass so that
it returns the maximum over the wall cells (`_installLocalizedNucleationEnvelope`, `js/85b`). That
holds on every step of `zoned_dripstone_cave` and `stalactite_demo`, whose walls author
per-vertex nucleation, and on 61 of `naica_geothermal`'s 320 steps and 51 of `wittichen`'s
220: the steps of their weathering epilogues, which switch per-vertex nucleation on when
they begin (`js/44e-weathering-epilogue.ts:242`). No scenario authors a thermal field
(`probe-zen-drift.txt`, its third part). The census puts the same envelope up for its reading and
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
into those same caps unless the cavity as a whole could be drawn down, which is SC4.

### 2.4 What a seed changes

Also known (the story-pocket proposal, §2.5 and WP9, at 21 seeds; PR #45 is a brief for an
experiment on it). The canary's 55 seeds agree:

| Reading (canary run `2026-11-04/v286`, 55 seeds) | Value |
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
per-seed files, which exist only on this machine; the other rows from the summary it commits.

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
panel sets one), so in the 41 scenarios the scallop record is its only reader. That reader was
added on 2026-07-07, when the wall-texture work went looking for a flow velocity and found that
`flow_rate` "already carries rich signal (0.05–5.0, dynamic)" (`HANDOFF-FOUNDATIONS-2026-07-03.md`,
the V1b-flow continuation).

The authors have been writing the throughput story for the life of the project. The growth model has
no place to put it.

### 2.6 The same thing in physical units

This is an order-of-magnitude restatement, not an error count. The simulator does not claim physical
mass conservation, and several broths are deliberate abstractions (the `BACKLOG.md` banner for
rung 5 of the fix ladder, SIM 234, records Searles at 1,500 ppm Na for a brine of about 110,000).

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

The fill itself is not news. The owner reported it first, on 2026-05-06 at SIM 53: a feldspar
of 37 by 55 mm in a 50 mm pegmatite vug, 91.2 % of the cavity by the simulator's own formula,
in a Quick Play run of the `pegmatite` archetype (`BUG-CRYSTALS-CLIP-VUG-WALL.md`). Quick Play
then launched what is now the Random Vugg mode (`js/94-ui-menu.ts:355`). The report was taken
as a crystal drawn through its wall. v59 capped a crystal's length at its cavity's radius and
its width at the diameter, the renderer was given a clip at the wall (commit `4fb128f`), and
v61 removed the cap, on the directive "when in doubt,
defer to the actual geology". The report was closed on 2026-06-15 as by design: a crystal may
exceed its wall in the model, and the renderer clips it. The high-fill research of 2026-05-16
(`RESEARCH-GROWTH-AT-HIGH-FILL.md` §2; `tools/high_fill_probe.mjs`, on the 24 scenarios of the
time at seed 42) had `gem_pegmatite` sealed at step 13 and `radioactive_pegmatite` at step 55,
both then overshooting a fill of 1. Its proposals A to D, all shipped, made growth slow as a
pocket fills and stopped the overshoot. They dealt with what happens at the seal. The data
review of 2026-07-14 (`DATA-HOSTILE-REVIEW-2026-07-14.json`, at SIM 226) came at the same
scenario from the births: seven of its eight species were born at step 0, and it called the
staged events "decorative for nucleation ordering". Why this pocket reaches its seal in the
first tenth of its run, and what that costs the scenario, is what is added here: the events are
decorative for growth as well.

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
is full first. The proxy itself has been questioned before: W21 of the Wise review
(`PROPOSAL-HOSTILE-REVIEW-WISE-2026-08-05.md`) calls wall-zone feldspar grown from a ppm aqueous
broth "thermodynamically fictional as written", acceptable under the project's abstraction
charter. Nothing proposed here changes that.

**A/B** (`tools/sim-side-ab.mjs`; the interventions are diagnostics):

| Arm (values at seeds 42 / 1 / 2) | Fill at end, % | First step at fill ≥ 0.999, of the run's 230 | Last step anything grew | Feldspar, mm | Tourmaline, mm | Topaz, mm | Spodumene, mm | Lepidolite, mm |
|---|---|---|---|---|---|---|---|---|
| shipped | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `rind=5000`: feldspar and albite stop adding thickness at 5 mm | 22.9 / 22.7 / 19.6 | not in its 230 steps | 230 | 10.0 / 10.6 / 7.2 | 12.0 / 11.9 / 12.0 | 2.4 / 2.5 / 2.5 | 4.2 / 2.2 / 5.1 | 4.9 / 4.0 / 3.5 |
| `cap=8`: their σ clamped at 8 | 42.1 / 41.4 / 41.0 | not in its 230 steps | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `rclamp=7`: their rate clamped at k·7, σ untouched | 42.1 / 41.4 / 41.0 | not in its 230 steps | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `fcap=2`: each factor of their σ capped at 2 | 27.2 / 27.0 / 25.9 | not in its 230 steps | 230 | 14.3 / 14.4 / 14.6 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `root=3`: their σ replaced by its cube root | 38.8 / 38.5 / 37.2 | not in its 230 steps | 230 | 21.6 / 21.8 / 21.7 | 12.0 / 12.0 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `mul=B:10`: ten times the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.29 / 0.37 / 0.39 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.016 / 0.012 |
| `mul=B:0.5`: half the boron, shipped feldspar | 100 / 100 / 100 | 9 / 10 / 10 | 9 / 10 / 10 | 31.7 / 33.4 / 36.8 | 0.14 / 0.17 / 0.18 | none | 0.13 / 0.20 / 0.13 | 0.007 / 0.017 / 0.013 |
| `cap=8,mul=B:10`: the clamp, and ten times the boron | 42.1 / 41.4 / 41.0 | not in its 230 steps | 230 | 24.1 / 24.7 / 24.7 | 12.0 / 11.9 / 12.0 | 2.5 | 4.2 / 2.2 / 5.1 | 4.7 / 4.0 / 3.4 |
| `cap=8,mul=B:0.5`: the clamp, and half the boron | 40.5 / 39.9 / 39.5 | not in its 230 steps | 230 | 23.9 / 24.4 / 24.5 | 5.6 / 5.6 / 5.4 | 2.5 / 2.5 / 2.4 | 4.2 / 4.9 / 5.1 | 3.7 / 4.5 / 4.0 |

Under `rind=5000` the pair ends at 7.2 to 10.6 mm and not at 5: a positive zone is refused once a
crystal has reached 5 mm, and the zone that took it there is a whole step's growth.

Every row is a run of the scenario's own 230 steps in the scenario's own cavity. "Not in its
230 steps" says no more than that. Stepped on, the `rclamp=7` pocket is full at step 306 /
305 / 306, and in the smallest cavity Simulation mode offers it is full at step 97 / 99 / 99
(§4, SC1). The other arms were not stepped on or run in another cavity.

Three readings follow.

1. *The gems are short of room, not of chemistry.* With the feldspar pair bounded in any of five
   ways, the pocket ends 20 to 42 % full and grows to step 230. Tourmaline reaches 12 mm and grows
   until step 197; topaz appears (six crystals, 2.5 mm) and grows until step 215, through the Late
   Hydrothermal event that narrates it; spodumene and lepidolite reach 2 to 5 mm. Quartz, held to
   1.7 mm by the plug, becomes the largest crystal at 37 mm. The broth and the events were always
   able to grow tourmaline, topaz, spodumene and lepidolite. (Those are the scenario's own
   230 steps. A run that goes on past them fills on that quartz, §4, SC1.)
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
   term cannot raise its σ here, with the pocket plugged or open. WP8(b) needs a species whose
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
- `shigar_pegmatite` had its cavity enlarged at v241, from 140 to 220 mm, to keep the same plug
  out of its 70 steps (`js/15-version.ts`: "the corrected ledger exposed Shigar's 140 mm authored
  cavity sealing before its documented late F-rich topaz pulse"). It passes 0.7 full at step 56
  and ends 92 % full with a 270 mm albite. What keeps the
  larger cavity from sealing is the draw-down of §2.1: 83 % of this pocket's stored thickness is put
  on at a cell under half the bulk fluid's excess, and with every debit returned (`refund=1`) it is
  full at step 23 to 26 and its topaz is gone. With the feldspar pair clamped as `gem_pegmatite`'s
  is above, its albite is 9.7 to 9.9 mm where it is 270 as shipped, and the 220 mm pocket ends
  0.0 % full (§4, SC1). Its tourmaline stays at 1.8 mm and its topaz at 0.6 to 0.7 mm (two more
  topaz crystals appear at seeds 42 and 1): Shigar's gems are small for their own reasons. Its
  aquamarine has been absent since SIM 272 and is absent in all 55 canary seeds; no arm here
  restores it.

**The same fluid in the game's other modes.** Every number above is a scenario as Simulation
mode starts it with its form left at the defaults. The game starts a run on a pegmatite's
fluid in other ways, and five were run, each through the game's own builder or constructor
(`probe-pegmatite-reach.txt`). Zen was also run through the game's own step loop
(`probe-clamp-horizon.txt`).

- *Simulation mode with another cavity.* The mode's own form has a Cavity Size select, which
  puts a 15 mm vug, a 162.5 mm pocket or a 1.65 m cave in place of the scenario's cavity of
  69 cm³ (`js/91-ui-legends.ts:217`). As shipped the pocket is full at step 2 in the vug and
  at step 37 to 38 in the pocket. In the cave it is 3.7 to 3.9 % full at step 230: tourmaline
  reaches 12 mm and topaz 2.5 mm with no bound at all, beside feldspars of 460 to 475 mm.
  That is reading 1 again, from the other side. The gems are short of room, and a cavity
  with room enough for 230 steps is one sized for half-metre feldspars.
- *The same vug for every scenario.* The form offers its sizes to every scenario, so all 41
  were run at the vug setting as shipped, through the same command runtime
  (`probe-form-vug-fleet.txt`; seeds 42 / 1 / 2). The setting does not build one cavity.
  The simulator sets the wall's diameter to that of a sphere of the built cavity's volume
  (`js/85-simulator.ts:109`; `js/22-geometry-wall.ts:476`), and the architectures build
  different volumes from the same 15 mm: across the fleet the wall is built 9.3 to 16.8 mm across and holds 0.42 to
  2.49 cm³, the two clefts and the three basins the least (15.3 mm and 1.87 cm³ for
  `gem_pegmatite`). One of the 41 has no pocket to fill. `great_salt_plains` is authored
  as an open surface, and the step reads its fill as 0 (§2.2; §3.4). Of the other 40,
  15 / 16 / 15 reach fill ≥ 0.999 inside their own length and 18 / 19 / 19 pass 0.7, where
  3 and 6 do in their own cavities at every seed. Every one of the 55 runs that reaches
  0.999 is a run the simulator itself sealed, and none of the other 185 is. Fourteen fill
  at all three seeds. In six of them the largest share of the vug at seed 42 is feldspar's
  or albite's: the three pegmatites, `ouro_preto`, `schneeberg` and `tormiq_alpine_cleft`.
  In the other eight it is another mineral's: calcite in `reactivated_fluorite_vein` and
  `sunnyside_american_tunnel`, molybdenite in `porphyry`, thenardite in `searles_lake`,
  chalcopyrite in `bisbee`, malachite in `supergene_oxidation`, hessite in
  `epithermal_telluride` and marcasite in `sulphur_bank`. So a pocket that fills in that
  vug is not this scenario's matter alone, and not the pair's alone.
- *Random Vugg*, the mode of the first report. Its `pegmatite` archetype draws a broth at random
  (SiO2 4,000 to 14,000 ppm, K 50 to 130, Na 35 to 90, Al 20 to 50; `buildRandomScenario`,
  `js/96-ui-random.ts:71`) and a cavity from the size class, and makes no scenario object. On
  eight seeds of the size class pocket (cavities of 34 to 285 mm) the bulk fluid starts at a σ
  of 45 to 179 for feldspar and 21 to 221 for albite. Three of the eight pockets reach fill
  ≥ 0.999, at steps 32, 47 and 125, and five pass 0.7; the largest feldspar is 23 to 180 mm and
  the largest albite 27 to 160 mm. With the pair's rate clamped at 7 none reaches 0.999, and the
  pair's largest crystals are 12.5 to 23.3 mm. One pocket, the 34 mm one, still ends 98 % full,
  on a 36 mm quartz.

  That is one size class of three. Random Vugg's page has a Cavity size select of its own
  (`index.html:5032`; its value goes to the builder, `js/96-ui-random.ts:387`). It opens on
  "Any size", for which the builder draws vug, pocket, pocket or cave (`:41`). The same
  eight seeds at the other settings:

  | Size setting | Cavities drawn | As shipped: reach fill ≥ 0.999; pass 0.7 | Pair clamped at 7: reach 0.999; pass 0.7 |
  |---|---|---|---|
  | pocket (above) | 34 to 285 mm | 3 of 8; 5 | none; 1 |
  | vug | 6 to 24 mm | 8 of 8, at steps 4 to 86; 8 | 6 of 8, at steps 33 to 100; 8 |
  | cave | 385 to 2,851 mm | none; none (0 to 10 % full, behind feldspars of 50 to 209 mm and albites of 31 to 324 mm) | none; none |
  | any, the setting the page opens on | six pockets, a cave and a vug, with other broths than the rows above | 4 of 8; 5 | 1 of 8, the vug; 2 |

  In the vug class the value of the clamp is not what fails. With the clamp at 0, under
  which the pair holds no solid, five of the eight vugs still reach 0.999 and seven pass
  0.7 (their largest quartz is 2.5 to 27 mm; each mineral's share of those vugs was not
  read). So on these eight seeds a bound on the pair, in the engines or in that builder,
  keeps the pockets from filling completely in their own runs and does not do that for the
  vugs.

  The eight pockets are 34 mm and larger, and the class is drawn from 25 mm up. Of seeds 1
  to 400, 23 draw a pocket under 40 mm (26 to 38 mm), and they were run as well. All 23
  fill as shipped. With the pair clamped at 7, ten still reach 0.999, at steps 63 to 140,
  and nineteen pass 0.7. In six of the ten the largest share of the cavity at the end is
  quartz's (43 to 87 %), and in four it is morganite's (75 to 95 %). So in the pocket class
  what the clamp does depends on the cavity drawn, and the pair is not the only mineral
  that fills one.
  Every run here is the length the builder drew, 120 to 176 steps. (The select's own labels give
  other ranges than the classes are drawn from: "5–50mm", "50–500mm" and "0.5–5m", where
  the builder draws 5 to 25 mm, 25 to 300 mm and 0.3 to 3 m.)
- *`gem_pegmatite` opened in Creative mode* (`fortressBeginFromScenario`,
  `js/94-ui-menu.ts:244`), which is where the Scenarios menu opens a scenario (`:132`,
  `:473`). The scenario object is kept, and the constructor gives the run a conserved
  carbonate boundary, which the scenario does not author. So this is not the run the baseline
  pins: its seed-42 summary differs from the baseline's. The plug is the same, full at step
  9 / 10 / 10. With the clamp the pocket is 42 / 42 / 41 % full at step 230, with tourmaline
  at 12.0 / 11.9 / 12.0 mm and topaz at 2.5 mm. Creative mode has no last step, and what the
  pocket does after step 230 is in §4 (SC1).
- *Creative mode's starter fluid "Radioactive Pegmatite"* (`fortressBeginFromStarterFluid`,
  `js/94-ui-menu.ts:162`) is that scenario's fluid at 200 °C in a limestone cavity of about
  50 mm, with no events and no scenario object. At 200 °C the pair's σ starts at 62 and 44. In
  120 steps the pocket reaches 67 / 82 / 69 % full behind feldspars of 56 to 59 mm and albites
  of 55 to 57 mm. With the clamp it is 2 to 3 % full.
- *Zen mode* copies a scenario's temperature, pressure, fluid and wall onto new conditions, and
  leaves the scenario object and the events behind (`idleCreateSim`, `js/98a-ui-zen.ts:75`).
  It also runs on another clock. The game's mode switch sets the time scale to 1 on entering
  Zen, where it sets 5 for Simulation, Creative and Random Vugg (`js/94-ui-menu.ts:621` to
  `:647`), so a Zen step stores a fifth of the thickness. And it has no end: the page steps
  it once a second by default and ten times a second at its fastest (`js/98a-ui-zen.ts:35`,
  `:56`), until the player stops it. Run by the game's own loop, which applies the mode's
  drift, a Zen run of `gem_pegmatite` is full at step 32 / 33 / 32
  (`probe-clamp-horizon.txt`). By `run_step` alone, without the drift, it is full at step
  31 / 33 / 33 (`probe-pegmatite-reach.txt`), so the drift is not what plugs it. The drift
  hardly reaches a crystal. Its writes to the species and to pH stay on the bulk handle,
  which births read, and are not carried to the cells; its temperature write is undone by
  the next step; only its pressure write reaches a crystal, and not in this scenario
  (§3.3). Silica shows the first. In the
  runs clamped at 7 the bulk handle's silica ends at 32 / 3,800 / 293 ppm after 2,400 steps,
  while the mean over the voxels, which growth reads, ends at 7,999. With the clamp the game's loop fills the pocket later:
  it is 18 / 20 / 24 % full after 400 steps and 30 / 31 / 31 % after 1,150, it passes 0.7
  at step 1872 / 1849 / 2104, and it is 94 / 94 / 86 % full at step 2,400, where the runs
  were stopped.

Zen mode's missing scenario object is wider than this finding. A Zen run of a scenario has none
of its license, exclusion list, nucleation windows, movements or weathering epilogue, nor
would it have a thermal field if a scenario authored one
(`js/85j-movements.ts:174`, `:179`; `js/44e-weathering-epilogue.ts:17`;
`js/85-simulator.ts:247`, `:565`). In the Zen runs of
`gem_pegmatite` made by `run_step` alone, emerald is on record at all three seeds, and that
scenario excludes emerald by name; so is opal, which it does not license. In the game's own
loop the emerald is on record at all three seeds by the time the pocket is full. Whether Zen
is meant to run so was not asked (§7). A scenario opened in Creative mode differs from its Simulation-mode run for a
related reason, the added boundary, and that was looked at for `gem_pegmatite` only.

### 3.2 F2 — three engines propose growth at saturation

The engine probe forces σ and reads what each engine proposes:

| | engines |
|---|---:|
| Proposed rate vanishes at saturation (under 1 % of the σ = 2 rate at σ = 1.0005) | 171 |
| Proposes a rate at saturation | 3 |
| Not driven by the probe | 9 |

The three are galena, molybdenite and uraninite, each at exactly 50.0 %: their engines return nothing
below σ = 1 and `rate = k·σ` from there on (`js/61-engines-sulfide.ts:410` for galena), where the
other 171 driven engines propose nothing, or next to nothing, at saturation. The repository's
own template for a new mineral writes the rate on the excess (`rate = 3.5 * excess`, with
`excess = sigma - 1.0`; `proposals/vugg-mineral-template.md:168` and `:169`). At σ = 1.0005 galena
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
means to change itself.) The rule it breaks was written down on 2026-07-08, when the Shigar
probe found that "bulk mutations never couple in" and that deliveries reach the cells only
through the broadcast (`HANDOFF-FOUNDATIONS-2026-07-03.md`, the Door 1 addendum; §2.1). This is
one write that was never moved onto that path. The census's bulk-against-voxel reading finds it:

| Scenario (seeds 42 / 1 / 2) | Bulk Pb at run end, ppm | Voxel-mean Pb, ppm | Lowest wall cell, ppm | Largest gap, ppm (at step) |
|---|---|---|---|---|
| `radioactive_pegmatite` (starts at 30) | 146.8 / 127.7 / 147.2 | 30.00 | 30.00 | 117 (80) / 98 (81) / 117 (94) |
| `schneeberg` (starts at 5) | 179.0 / 221.8 / 217.5 | 5.00 | 5.00 | 174 / 217 / 212 (all at 160) |

(In `radioactive_pegmatite` the lead stops climbing when the last uraninite is enclosed,
at step 80, 81 or 94. At seeds 1 and 2 that step, and the lead with it, is one outcome of
several that rounding chooses between; §3.4, the sixth note.)

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

In the 41 scenario runs the census reads, radiogenic Pb is the one write to the bulk handle
alone that licensed minerals read. The bulk
handle is what the broth panel shows and what nucleation gates read, so the scenario looks
lead-rich while no crystal can reach the lead. `_wallStrangledFor` then blocks births that the bulk
σ admits, because no wall cell clears the threshold.

The write is in the simulator's step, which every mode shares, so it is made wherever a
uraninite is active, and not only in those 41 runs. Where else the game grows a uraninite
was looked for by search and by run. What follows is a list, not a count, and a place it
misses is not covered.

- *Zen mode* offers every scenario and leaves its events behind. Of its 41 simulators at
  seed 42, stepped for the scenario's own length without the drift, two put a uraninite on
  record, `radioactive_pegmatite` and `schneeberg`, and in the other 39 the bulk handle's
  lead ends where it started (`probe-zen-drift.txt`, its third part). (Three scenarios
  author uranium in their fluid. The third, `colorado_plateau`, is among the 39.) By the game's own
  loop, with the drift, the bulk handle's lead climbs from 30 to 621 to 682 ppm in 600
  steps of the first, and from 5 to 1,015 to 1,035 ppm in 600 steps of the second.
- *Creative mode.* Of its seven starter fluids one carries uranium, the one synced to
  `radioactive_pegmatite` (`js/97-ui-fortress.ts:37` to `:73`). Started from the Scenarios
  picker, it takes the bulk handle's lead from 30 to 268 to 286 ppm in 120 steps. The same
  entry is a preset on that mode's setup panel, and the panel has a uranium slider of its
  own, as the live broth panel has (`index.html:4015`, `:4121`; `js/97-ui-fortress.ts:160`,
  `:997`). So a player can put uranium into any run built there, with no events, at
  whatever temperature and in whatever cavity the panel holds. Those were read and not run.
- *Random Vugg.* Its builder draws uranium in one of its seven archetypes, the pegmatite,
  into about a third of that archetype's fluids (`js/96-ui-random.ts:77`). Two of the eight
  seeds run grew a uraninite, and the bulk handle's lead went from 0 to 132 and to 173 ppm.
- *A scenario's own run, stopped early.* The form's Time Steps box and the agent
  interface's `steps` can end either uraninite scenario before the event that oxidizes it,
  at step 80 and at step 85. Such a run has its uraninite and nothing that alters it. It
  was not run (§4, SC3).

In every one of these runs that was made, each voxel ends with the lead it started with
(§4, SC3; `probe-lead-choices.txt`).

Zen mode also has writes of this kind, at the scale of the whole mode. Its drift is
applied to the simulator's conditions before each step, outside any snapshot and propagate
pair (`js/98a-ui-zen.ts:116` to `:198`): the walk on nine species and on pH, the walk on
temperature, and the four of its five random events that write anything, which are a
thermal pulse, an injection that sets one species to 2 to 6 times the larger of its value
and 10 ppm, a shift of pH with a drop of pressure, and a cooling that cuts silica to 0.6 of
its value. What becomes of each
kind of write was measured on Zen's own simulator for three scenarios, `mvt`,
`gem_pegmatite` and `radioactive_pegmatite`, at seeds 42, 1 and 2 (`probe-zen-drift.txt`).
The pH, temperature and pressure writes were made about as large as one random event makes
them. The species write is larger than any one event: it multiplies all nine species at
once, where an event multiplies one.

- *Species and pH stay on the bulk handle.* With each of the nine species set to four times
  the larger of its value and 10 ppm, as the injection sets one of them, or with the pH
  lowered by 0.75, the σ that a crystal's engine reads on its own cell changes for
  none of the 4 to 33 active crystals in any of the nine simulators. On the bulk handle the
  species write changes σ for every one of their minerals but one, and the pH write for up
  to three of them. One step later the bulk handle still holds the write and the voxels
  hold what they held: in `mvt`, silica 400 ppm on the handle and 100.000 in the voxels.
  Over a long run the two part. After 2,400 steps of Zen's own loop on `gem_pegmatite` the
  bulk handle holds 32 / 3,800 / 293 ppm of silica and the voxels a mean of 7,999 (§3.1).
- *Temperature is put back.* A crystal's engine reads its cell's temperature, so a write of
  −50 °C to the conditions changes no σ on a cell. One step later the conditions'
  temperature is where a step with no write leaves it (148.4 °C in `mvt`, after a write
  from 150 to 100).
- *Pressure reaches the crystals.* The pressure the crack event lowers (`:184`) is not a
  fluid field. A crystal's engine is called with its cell's fluid and temperature swapped
  in and the conditions' pressure left as it is (`js/85b-simulator-nucleate.ts:1349`), and
  the write is still there a step later. Among the σ functions that read it are thirteen
  carbonates', quartz's solubility and apophyllite's (`js/32-supersat-carbonate.ts`;
  `js/25-chemistry-conditions.ts:216`; `js/39-supersat-silicate.ts:635`). In `mvt` a drop of
  0.5 kbar, which is the whole of that scenario's 0.3, takes the calcite's σ on its own cell
  from 2.54 to 4.74. In the two pegmatites it changes no σ, on a cell or on the handle.

So in these Zen simulators the species and the pH of the bulk handle drift, and those of
the cells that crystals grow from do not. Births read the bulk handle, except where a
simulator puts up the envelope under which a birth reads the wall cells (§2.3). Four
scenarios put it up in their own runs. In Zen two of the 41 do, `stalactite_demo` and
`zoned_dripstone_cave`, whose walls author per-vertex nucleation, and on every step. The
other two, `naica_geothermal` and `wittichen`, owe it to their weathering epilogues, which
switch per-vertex nucleation on when they begin (§2.3). An epilogue is read from the
scenario object (`js/44e-weathering-epilogue.ts:17`), which Zen leaves behind. In Zen no
epilogue begins, and those two put the envelope up on no step (seed 42, the scenario's own
length, without the drift; `probe-zen-drift.txt`, its third part). So in 39 of Zen's 41 simulators births read the bulk handle, which is where
the drift's writes to the species and to pH stay; and in the three simulators read above no
crystal reads them. That is F3's defect, by design or not, and it is put to the owner with
the rest of what this review met in Zen (§6, decision 8).

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

One thing in the first two rows is not the lead's doing. In the full pocket a layer of
10⁻¹¹ µm decides the step at which a neighbour encloses each uraninite and ends its
alteration, and twelve nudges of a zone's last binary places move the shipped run's 6 and
29 negative zones over 3 to 15 and 17 to 48, and its lead with them (§3.4, the sixth note).
So at seeds 1 and 2 the difference between the shipped arm and `pb`, in that column and in
the bulk Pb, does not measure what carrying the lead to the voxels does. At seed 42 the
shipped run moved in no size and in no lead under any factor tried (§3.4). The `pb` and
`nopb` arms were not themselves put to a nudge at any seed, so that the seed-42 rows
compare as they stand is a reading from the shipped arm and was not run. The pocket held
open, 11 to 18 % full, has no last room to hand out.

So the defect is real and at present latent. In `radioactive_pegmatite` the pocket is full by step
61 at the latest, and the mineral the lead is meant for cannot form at all. The scenario's own
texts promise it. A search of its entry in `data/scenarios.json5` and of its event file finds
galena on three lines: the description ("late-stage galena from radiogenic Pb"); the notes
("Final cooling (step 100): system approaches ambient, galena precipitates from the
radiogenic Pb"); and the narration that the step-100 event writes into the player's log
("…and galena crystallized from the lead that uranium became",
`js/70d-pegmatite-radioactive.ts:32`), which is code.

Galena is named for this scenario in other places too. What follows was found by search and
is a list, not a count. The search is over the tracked tree, for files that name both the scenario
and galena, leaving out `proposals/`, `archive/`, the committed baselines and what a build
writes (`index.html`, `dist/`). Of the files it returns, these tie the two together. The
mineral data lists the scenario under galena (`data/minerals.json`, galena's
`scenarios`), and the Library shows that list on galena's card and filters by it
(`js/95-ui-library.ts:68`, `:300`). That list is stale in general: eight of the fifteen
minerals it names for this scenario are not licensed there. The same file's audit summary
names galena for the scenario. A generated copy of the list is in
`data/generated/crystal-flow-tree.json` (galena's node), and three pages under `docs/` embed
that file: `crystal-flow-tree.html`, `crystal-enables.html` and `crystal-causation.html`. The closing
narration of any run has a sentence of its own,
"The galena in this assemblage crystallized in part from lead produced by uraninite decay",
printed when a galena and a uraninite are both on record (`js/85-simulator.ts:1602`). No
scenario's seed-42 baseline holds both: only the two uraninite scenarios hold a uraninite, and
neither holds a galena. Where it did print, in this runtime, it would be untrue, since that
lead reaches no cell.

The agent API is another matter. It is a separate runtime (`agent-api/vugg-agent.js`) with
one fluid, no voxel field and no license. Its uraninite block writes the same lead to that
one fluid (`:2149`), and its galena nucleates on σ alone (`:1930`), so there the lead can
reach a galena. That is a reading of its source. It carries a copy of the closing sentence
(`:2402`). It also carries a copy of the step-100 narration (`:1732`), inside a scenario
function that no command of its CLI runs: `start` takes a fluid preset (`:3466`), and the
table of scenarios is only exported (`:3602`). The sixth review round ran the CLI's
`radioactive` fluid preset (not committed), not the scenario: 20 ppm of lead to start with,
300 and 450 °C, 200 waits and no events. It reports galena of 12 to 15 mm there, beside the
uraninites. So in
a preset game the lead does reach a galena, which is what the closing sentence says. Nobody
has run the scenario function that holds the narration, and this review ran neither.

The same search returns a test and two older probes that tie the two.
`tests-js/cascade-gate-audit.test.ts:107` lists `radioactive_pegmatite` and `schneeberg`
among six scenarios it calls canonical for primary galena, and asks for a galena on record in
at least four of them at seed 42. It passes today with nothing to spare: the galena is in
exactly the other four (`mvt`, `porphyry`, `reactive_wall`, `roughten_gill`;
`seed42_v286.json`). Its own comment says that after the repair it was written for galena
"fires in all 6", and that the floor of four is there to leave room for chemistry to
move. With both uraninite scenarios out of the count since v160 (next paragraph), no more
than four of the six can have had one since. `tools/v160_gate_ab_probe.mjs` and `tools/v160_triage_probe.mjs` list
galena and plumbogummite as this scenario's strangled minerals (next paragraph). The search
also returns this review's own two tools, and files that name the two without tying them:
another test, two generated files and two files of `js/`, read at the matching lines only.
And it returns the version notes of `js/15-version.ts`, of which the v160 note is quoted
next and the rest was not read for this.

**The symptom is older than the diagnosis.** The committed baselines hold it
(`probe-baseline-history.txt`; a baseline row counts a mineral's crystals whether or not
they grew). `radioactive_pegmatite` has galena on record in each of the 89 baselines from
v70 to v159, and its largest crystal is 0 µm in all 89. `schneeberg`'s galena is on record
at 0 µm in the same 89, its anglesite in the 91 from v68, its duftite in the 62 from v97
and its plumbogummite in the 51 from v108, each of them at 0 µm in every one.
(`radioactive_pegmatite`'s plumbogummite, from v108, reaches 0.8 µm. The committed set has
no baseline for v127, v249 or v265, and only the first falls inside these spans.) The bulk
handle admitted the births, and the cells had no lead to
grow them on. The two releases at which that begins are on record. From v68 each cell of
the wall carries a fluid of its own (its note, `js/15-version.ts:1156`), and v70 repaired a
suppression of galena's σ (`:1255`), which is the repair the test above was written for.
The release of v160 added the strangulation gate, which refuses a birth when no wall cell
clears the threshold, and every one of those minerals left the record at once:
`radioactive_pegmatite`'s plumbogummite until v181, the others to this day. The v160 note
lists the firings ("radioactive_pegmatite galena 2→0, plumbogummite 2→0", and anglesite,
plumbogummite, duftite and galena in `schneeberg`), flags them for review, and puts them
down to "walls already depleted by competing growth" (`js/15-version.ts`; the two probes
above are its own). The walls were not depleted. They were never supplied.

This review's own evidence for that is indirect: on today's tree the census reads those
walls at 30.00 and 5.00 ppm of lead at the end of the run, where they started, and the line
that writes the lead is older than v160, in the first commit of `js/85-simulator.ts`
(2026-05-05). The ninth review round ran the old trees themselves (not committed): the
bundles of v70, v159 and v160, cut from each commit's `index.html`, each of which
reproduced its own committed baseline rows for both scenarios. In v160's
`radioactive_pegmatite` every wall cell holds 30.000 ppm at every step while the bulk
handle ends at 176.7. Galena is past σ_crit on the bulk handle on 70 steps, no wall cell
clears the threshold on any of them, and the gate refuses it 17 times. In v159 the cells
hold 29.98 to 30.00 ppm, and four galenas are born at steps 49 to 70 and store no zone. In
v70 one is born, at step 45, and stores none. `schneeberg`'s walls hold 5.000 ppm
throughout in all three trees.

Uraninite's own entry in
`data/minerals.json` says of the mineral in general that it "accumulates radiogenic lead that
eventually precipitates as nearby galena". The project's canonical note on uraninite, which that
entry cites, has the lead accumulate in the crystal and reach "galena or cerussite in extreme
cases" (`research/minerals/research-uraninite.md`). Galena is not among the 13
species the scenario licenses (albite, autunite, cassiterite, feldspar, lepidolite, morganite, opal,
plumbogummite, quartz, spodumene, topaz, tourmaline, uraninite), and `_runNuc` returns before an
unlicensed species' function runs (§2.3). The mismatch is on record: the Wise review of
2026-08-05 lists among its bookkeeping items that the scenario "narrates galena as a headline
but doesn't expect it". On the bulk handle galena is past its σ_crit on
33 / 30 / 30 steps of the shipped run, and every one of them reads "not licensed". The licensed
sink is plumbogummite, a deterministic species of the scenario. `_wallStrangledFor` refuses it
6 / 7 / 7 times, and the crystals that are born do not grow: at these three seeds they hold no
solid at all, and across the canary's 55 seeds the mineral is on record in every one and never
larger than 0.6 µm. With the pocket held open *and* the lead in the voxels it grows, to 0.7 mm.
With no radiogenic lead in any fluid it is born once where it is born two or three times as
shipped, and it holds as little. What the lead on the bulk handle buys today is one or two extra
births that cannot grow.

`schneeberg` licenses no lead mineral. There the radiogenic lead takes plumbogummite, anglesite
and duftite past σ_crit on the bulk handle for 72, 69 and 20 steps, none of them licensed. The σ
functions of several minerals that hold no lead read Pb as well, as a suppression or a
competition term, which is why the `pb` arm still moves 3 / 2 / 1 species there (goethite,
pharmacolite and proustite). `nopb` leaves its baseline summary unchanged at all three seeds.
The lead on the bulk handle does set one number that the full suite reads. The cation gate
commissions calcium's molar share of the cations that compete for arsenate, read on that handle
at the end of the seed-42 run. It is 0.582 there, it would be 0.724 without the radiogenic lead,
and on the cells where the pharmacolites grow it is 0.72 to 0.73 (§4; `probe-cation-gate.txt`).
One engine reads lead for something a species table does not show: `grow_feldspar` notes a
microcline zone as amazonite when its own cell holds more than 10 ppm of Pb
(`js/59-engines-silicate.ts:304`), and the game names and colours the whole crystal by that note.
`schneeberg`'s cells hold 5, so its two feldspars are shown as plain microcline as shipped
(§4, SC3).

**The science.** Radiogenic lead is not released to the fluid as it forms. It is held in the
uraninite (about 19 wt % PbO in unaltered 2 Ga uraninite at Oklo) and leaves when the uraninite is
altered or heated; where reduced sulfur is present it is fixed as galena (Janeczek & Ewing 1995;
Evins, Jensen & Ewing 2005 — both read at abstract level only). The simulator's continuous release
has the mechanism backwards; the event that should release the lead is the one that attacks the
uraninite. The data review of 2026-07-14 had already judged this scenario's lead on the same
lines: plumbogummite, formed once the meteoric oxygen arrives, is "correctly favoured over the
author's intended galena, which the final +181 mV Eh would destabilise"
(`DATA-HOSTILE-REVIEW-2026-07-14.json`, the verdict on `radioactive_pegmatite`). It read the
births, and did not see that the plumbogummite holds no solid.

### 3.4 Seven notes

**Three authored values sit exactly on an edge.** Several σ functions change abruptly at a
threshold: they return zero on one side of it, or switch multiplier. Where an authored value is
the threshold itself, which side a fluid falls on is decided by a rounding error or by the last
decimal of a neighbouring cell. Three such places turned up, each because a reading went wrong
there.

| Scenario | The authored value | The edge it sits on | What follows |
|---|---|---|---|
| `radioactive_pegmatite` | the broth's Pb, 30 ppm | `supersaturation_plumbogummite` returns 0 when Pb is under 30 (`js/38-supersat-phosphate.ts:268`) | With no radiogenic lead the bulk handle holds exactly 30 and plumbogummite is still born, once at each seed (`nopb`, §3.3). An arm that added the lead and subtracted it again left the handle a rounding error under 30 and no plumbogummite at two seeds of three (trap 12). |
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

The class is older than this review, and three is not a census. The data review of 2026-07-14
noted a fourth: `chiastolite_hornfels` authors its sodium at 10 ppm, and
`supersaturation_albite` returns 0 under 10 (`js/39-supersat-silicate.ts:641`). The value's own
comment in the scenario data reads "low alkali … not a pegmatite". That review's objection was
to the albite itself, and its second reader refuted it: a hornfels may hold sodic plagioclase.
The observation about the edge stands, and the value is still there. A fifth turned up in this
round's previews, on a derived quantity: with SC2 and SC3 both applied, calcium's share on the
cell of `schneeberg`'s pharmacolite at seed 1 is 0.61, a hundredth above a step in that
mineral's σ at 0.6 (§4, SC3). The fleet was not scanned for others.

That an event's write reaches the voxels as a change is not new either. SIM 220 (2026-07-08)
found "the additive broadcast" driving concentrations negative in drained cells and floored
them at zero (`tools/negative-fluid-census.mjs`; the Door 1 banner in `BACKLOG.md`).

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
physical clock can be pinned to a measurement. (The same sentence about a step's length has
been challenged from the other end: W23 of the Wise review notes that Shigar's own source,
London, Hunt & Duval 2020, puts pocket growth at days to years. The high-fill research quoted
the Naica rate in May, §3.5 there.)

**When a star was lost.** The committed baselines date the loss of several headline crystals, which
is a lead for story-pocket WP1: Naica's selenite at v244; Shigar's aquamarine at v272 (38 mm → none);
`amethyst_geode`'s quartz at v243 and v246 (16.7 → 2.7 → 0.85 mm). `gem_pegmatite`'s tourmaline was
never lost: it was never there.

**Almost every crystal beside a uraninite is counted as metamict.** The block that writes the
radiogenic lead also adds a fiftieth of each uraninite's size to the radiation damage of every
other active crystal, every step. The run's closing narration counts a crystal as metamict
once its damage passes 0.8, and says of those that "the crystal structure itself is destroyed
by accumulated radiation damage" (`js/85-simulator.ts:1283`, `:1591`, `:1597`). In `schneeberg`
at seed 42, 71 of the 74 crystals that hold solid are past that threshold
(`probe-cation-gate.txt`). Whether a feldspar or a carbonate beside a uraninite should read as
metamict is a question for the sources. This was read in one run, on the way to following what
SC2 moves (§4), and nothing is proposed for it.

**A fill above 100 %.** The step clamps a zone to the room the cavity has left
(`js/85-simulator.ts:947`), and two readings here pass 100 % all the same. They are not one
thing. The first is by design. `great_salt_plains` is authored as an open surface, a salt
plain that "never runs out of room" (`open_system`, `data/scenarios.json5:1550`; the
owner's directive of 2026-06-22). The step reads the fill of such a cavity as 0
(`js/85-simulator.ts:501`), so the clamp sizes every zone to the whole cavity and never to
the room left. At the vug setting of Simulation mode's form its crystals come to
2,834 / 2,877 / 2,711 % of the capacity of a wall built 10 mm across (0.60 cm³), and the
plain is never sealed, grows to its last step and goes on nucleating
(`probe-form-vug-fleet.txt`). That is the open system doing what it is authored to do, in
a cavity the form let a player shrink. The second is an overshoot. In
`gem_pegmatite`'s vug the fill switch and the rind end 113 % full at seed 42 (§4, SC1). The
tenth review round traced it (not committed): the clamp sized a new feldspar's first zone
under the habit the crystal was born with, and the zone was stored under another. No run of
the other 40 scenarios as shipped passes 100.5 %, in its own cavity or in the form's vug,
at these three seeds. Nothing is proposed for either.

**The last room of a full pocket.** Since SIM 275 a crystal may enclose a neighbour only
on a step on which it stored a layer of its own: `_check_enclosure` asks that the host's
growth of the step be above zero (`js/85c-simulator-state.ts:2466`). Of the guest it asks
that it have three zones and that its last three add up to under 3 µm, which is how it
reads a crystal as slowing (`:2562`, `:2569`). None of the three asks that a zone be of
any size before it counts, and a pocket that is full hands out zones that are not zones.
The step clamps a zone to the
room the cavity has left (`js/85-simulator.ts:947`) and drops a positive zone once the
fill reads 1 or more (`:705`). At any fill under 1 the next crystal in the loop is let
through and is given what is left. Once a zone has taken the room, that is little or
nothing. In the runs made here the loop then let the next crystal through with the fill
one to nine units of its last binary place under 1 (below), and cut its zone to that
residue, or to exactly nothing. The crystal stores it either way
(`js/27-geometry-crystal.ts:442`). Such a zone is a layer for the host's test and one of
the last three for the guest's.

The fourteenth review round followed the fill through one such step (its trace is not
committed). `probe-last-room.txt` and `probe-last-room-routes.txt` now follow it through
every run of the fleet: they read the loop's fill at the moment each zone is accepted,
and whether the clamp had cut the zone. They call a zone "in the last room" when the fill
then read under 1 by a billionth or less. In the scenarios' own cavities the 123 runs
have 27 such zones. Each was accepted with the fill one to five units under 1; two were
cut to nothing and the others are 7 × 10⁻¹² to 5 × 10⁻⁴ µm thick. No other positive zone
was accepted with the fill nearer to 1 than 1 − 2.7 × 10⁻⁶.

On a feldspar of 43 to 47 mm the residue comes to 7.1 × 10⁻¹² or 1.4 × 10⁻¹¹ µm. That is
one or two units in the last binary place of the host's own size in millimetres. The
clamp gets the zone as a difference of two sizes in millimetres, a cube root less the
size the crystal has (`js/85-simulator.ts:970`, `:974`), so the residue is a whole number
of those units, and no law of the host proposes it. In the 23 enclosures on such a layer
that this note counts in the two cavity settings below, the layer is one or two units in
16 and ten, twelve or thirteen in 7 (`probe-last-room-routes.txt`,
`probe-last-room-routes-vug.txt`). The simulator writes the host's layer on its own
receipt for each enclosure, and `probe-enclosure-floor.txt` reads the receipts.

It decides something in `radioactive_pegmatite`. That pocket reads full from step 61, 55
and 59 at seeds 42, 1 and 2. From step 80 the oxidizing fluid takes 20 µm a step off each
uraninite, which reopens a sliver of room that the growth loop refills, until a neighbour
encloses the uraninite. An enclosed crystal is inactive: it is altered no further, and the
block that writes the radiogenic lead reads the active uraninites
(`js/85-simulator.ts:1263`). It would be freed only if its host dissolved back to under
seven tenths of the size it had at the enclosure (`js/85c-simulator-state.ts:2715`), and in
these runs none is: each uraninite's negative zones end at the step of its enclosure. So
the step of the enclosure sets the uraninite's size, the
count of its negative zones and the lead on the bulk handle. As shipped, at seed 42 a
feldspar encloses all three uraninites at step 80, on a layer of 0.60 µm. At seed 1 a
feldspar encloses all three at step 81, on a layer of 7.1 × 10⁻¹² µm. At seed 2 an albite
encloses one at step 80 on 1.72 µm, and two feldspars enclose the others at steps 92 and
94, each on 1.4 × 10⁻¹¹ µm. The five residues were accepted with the loop's fill one unit
under 1 at seed 1 and two units under at seed 2. In the fleet's own cavities nine
enclosures are on a host layer that the clamp had cut, all in this scenario, three at
each seed: five layers under 10⁻⁶ µm, three between 0.1 and 1 µm and one between 1 and
5 µm (`probe-last-room.txt`), which are the sizes of the nine above. So the 0.60 and the
1.72 µm are also what room the cavity had left, and not what the host's law proposed.

What such a layer decides, rounding decides. The probe multiplies every positive zone of
the three minerals SC2 moves, of which this scenario grows uraninite, by a number within
10⁻¹² of 1, twelve ways, from the smallest change a multiplication can make upwards. It
compares each run with the same run un-nudged:

| As shipped | Seed 42 | Seed 1 | Seed 2 |
|---|---|---|---|
| Nudged runs of 12 in which a size or the lead differs | 0 | 6 | 9 |
| Lead on the bulk handle at the end, ppm: un-nudged; over the twelve | 146.8; 146.8 | 127.7; 126.1 to 132.5 | 147.2; 140.9 to 154.7 |
| Largest uraninite, mm: un-nudged; over the twelve | 6.95; 6.95 | 5.73; 5.67 to 5.75 | 6.56; 6.44 to 6.74 |
| Negative zones on the uraninites: un-nudged; over the twelve | 3; 3 | 6; 3 to 15 | 29; 17 to 48 |

At seed 2 the run moves under the smallest of the twelve, a multiplication by
1 − 1.1 × 10⁻¹⁶, and two of the twelve end with an opal that has solid, where the un-nudged
run has none. Under SC2's preview it is the same: at the same constant a size or the lead
differs in 0, 4 and 5 of the twelve at the three seeds, and at three times the constant in
0, 11 and 12. At seed 42 no size and no lead moves under any of them. There the host of an
enclosure alone differs in 4, 3 and 1 of the twelve, under the three kinds of run: in each
of those eight runs one enclosure has another host at the same step, and in seven of the
eight the new host's layer of that step is a residue. With the same twelve factors
applied to every growth engine and not to three minerals', the shipped run differs in a
size or the bulk fluid in 0, 6 and 11 of the twelve, and at seed 42 in an enclosure alone
in 6 (`probe-rounding-twelve.txt`).

So what this document reports for `radioactive_pegmatite` at seeds 1 and 2 while its
pocket is full is in each case one run of several that the last binary place of a zone
chooses between. That covers the shipped run (the lead of §3.3 at those seeds, the
entries of SC3's table for the pocket as shipped, and the counts of negative zones in §4,
SC3) and SC2's preview at either constant (§4, SC2). At seed 42, which the committed
baseline pins, no size and no lead moved under any factor tried here.

How far it reaches was read four ways, at seeds 42, 1 and 2. Each is a count of what
was run, under the factors named, and none is a bound.

*In each scenario's own cavity, as shipped.* 5 of the 914 enclosures of the 41 scenarios
are on a layer under 10⁻⁶ µm, and they are the five above
(`probe-enclosure-floor-fleet.txt`). Reading the loop's fill gives the same five: they
are the enclosures whose host layer was accepted with the fill within a billionth of 1
(`probe-last-room.txt`). Nothing lies between them and the thinnest host layer of the
other 909, which is 0.13 µm. The guest's two tests decide none of the 914 there: one
guest has a zone from the last room among its last three, and it passes without it
(`probe-last-room-routes.txt`).

*The seven other scenarios SC2 moves*, in their own cavities, were put to four of the
twelve nudges, as shipped and under SC2's preview at both constants. None of the 252
nudged runs differs from its un-nudged run in a size, in the lead or in an enclosure, and
none of the 63 un-nudged runs has an enclosure on such a layer
(`probe-enclosure-floor-sc2.txt`). In 12 of the 252 the nudged run is the un-nudged one
to the last binary place, so the nudge tested nothing there. Eleven of the twelve are
runs under a preview, where the probe multiplies the preview's own factor by the nudge
and not the zone. (The fifteenth review round nudged the zone in one of those cells and
reached all four runs; its run, not committed.) Two of those pockets read full,
`roughten_gill`'s at seeds 1 and 2 under three times the constant, and nothing moved in
them, so a full pocket is not enough by itself. `schneeberg` is among the seven: the lead
and the share that SC2's bump would commission there (§4) did not move under these four
factors.

*The whole fleet in its own cavities.* `probe-rounding-reach.txt` takes every scenario
as shipped and applies those four factors to every positive zone that a growth engine
returns, and not to three minerals'. A size or the bulk fluid then differs from the
shipped run in 11 of the 492 nudged runs, at 5 of the 123 scenario-seeds, in three
scenarios. (In 14 of the 492 the nudge changed no binary place: 12 of them are
`marble_contact_metamorphism`, whose baseline holds no crystal, and the others are one
run each of `cooling` and `tutorial_first_crystal` at seed 2.) `radioactive_pegmatite` is
one, at seeds 1 and 2 again, in 2 and 4 of the four runs. `searles_lake` at seed 42 is
the second, in 3 of the four, with nothing hanging on it. The two runs part at step 134,
at which that pocket first reads full: the fill then reads 1.0000000000000002 in one run
and 1 in the other, one calcite's size differs by 0.0005 µm at that step, and it ends
0.0004 µm apart, with the same summary and no enclosure changed
(`probe-rounding-detail.txt`). (By the fifteenth round's trace, which is not committed,
that calcite is handed the last room in the shipped run and nothing in the nudged one.)
`wittichen` at seeds 42 and 2 is the third, and its pocket is empty: it is another thing,
the next note. `gem_pegmatite`, the third scenario whose own pocket fills, did not move
at any seed under the four.

Four factors are a sample, and a zero under them is not an absence.
`probe-rounding-twelve.txt` applies all twelve to every engine in `radioactive_pegmatite`
and `wittichen`. At `radioactive_pegmatite`'s seed 42, where the four find nothing, six
of the other eight change an enclosure and nothing else. `wittichen` at seed 2 turns
under one factor of the twelve, and that one happens to be among the four.

*At the vug setting of Simulation mode's form*, 15 mm, where 15 or 16 pockets fill
(§3.1), it reaches further, and by more than the host's layer. The 123 shipped runs
there have 163 zones in the last room. 151 were accepted with the fill one to nine
units under 1: 12 of them cut to nothing, the others from 9 × 10⁻¹³ µm on a feldspar of
7.7 mm to 0.15 µm on a crystal with no size yet. The other 12, in `supergene_oxidation`
and `schneeberg` at seed 2, were accepted with the fill between 1 − 1.6 × 10⁻¹¹ and
1 − 8.4 × 10⁻¹⁰ and are 4 × 10⁻⁶ to 3.2 µm thick. What opened those rooms was not read.
They stand apart from the residues: no zone was accepted with the fill between 9 and
142,307 units under 1. The billionth itself is not in a gap at this setting, since the
nearest fill outside it is 1 − 1.3 × 10⁻⁹ (`probe-last-room-routes-vug.txt`).

As shipped, 18 of the 1,285 enclosures there are on a host layer under 10⁻⁶ µm, each
accepted with the fill one unit under 1: 1, 3 and 12 in `supergene_oxidation` at the
three seeds, and one each in `radioactive_pegmatite` at seeds 1 and 2
(`probe-last-room-vug.txt`). Eleven of `supergene_oxidation`'s twelve at seed 2 are at
step 160, the step of the seal that decision 7 begins with, and three of their guests
are azurites. The guest's two tests decide more. In 32 enclosures a zone from the last
room is among the guest's last three, and in 24 of those the guest passes only for it:
with those zones set aside its last three add up to 3 µm or more in 23, and it has fewer
than three zones in one. They are 2, 0 and 1 in `reactivated_fluorite_vein` at the three
seeds, 0, 1 and 0 in `searles_lake` and 8, 5 and 7 in `supergene_oxidation`. Seven of the
24 are among the 18. So a zone from the last room decides 35 of the 1,285 enclosures as
shipped, 11, 8 and 16 at the three seeds, in four scenarios, and 17 of the 35 are on a
host layer that is no residue, of 4 × 10⁻⁵ to 2,031 µm. With only the zones accepted
within nine units of 1 counted, the 24 are 23. In `reactivated_fluorite_vein` at seed 42
an anhydrite of 1.18 mm is handed such a zone at step 62, the step at which that pocket
first reads full. Its last three zones then add up to 2.45 µm, where its last three
before it add up to 3.49, and a calcite encloses it on a layer of 14.4 µm.

That count is a reading of the zone lists of the shipped runs. No run was made without
those zones, and a receipt cannot show the other case, in which such a zone pushes a
negative zone out of the three and a guest fails for it. What the reading comes to is
this. A crystal that a full pocket gives nothing, and that is not dissolving, keeps the
last three zones it had when the pocket filled, and reads as slowing or not by those. A
crystal that is handed a residue reads as slowing after one to three of them. Which of
the two a crystal gets is the residue's doing.

Under the four factors on every engine, a size or the bulk fluid differs from the
shipped run in 51 of the 492 nudged runs at that setting, at 20 of the 123
scenario-seeds, in nine scenarios: `reactivated_fluorite_vein`, `searles_lake`, `bisbee`,
`supergene_oxidation`, `gem_pegmatite`, `shigar_pegmatite`, `radioactive_pegmatite`,
`schneeberg` and `wittichen`. In 27 of the 51 the baseline-style summary differs, and in
17 a species is moved or lost by the A/B tool's test: four species in `bisbee` at seed
42, and in `searles_lake` at seed 1 the halite, whose largest crystal is 0.16 µm, under
the smallest factor. Eight of the nine are pockets that fill there. In
four of the eight a zone from the last room decides an enclosure of the shipped run, by
the host's test or the guest's; `bisbee`, `gem_pegmatite`, `shigar_pegmatite` and
`schneeberg` have no such enclosure. `wittichen`'s two runs are the next note's.

`probe-vug-parting.txt` looks for where those runs part, and for what parts them. It
makes the nine scenarios' runs again, keeps every crystal at every step, and finds the
first step at which a nudged run differs from the shipped one. 55 of the 108 nudged
runs part: the 51 above, the two that differ in an enclosure alone, and two in
`radioactive_pegmatite` at seed 42 that part and end with no crystal differing. All but
`wittichen`'s two are in a pocket that reads full, and of those 53 none parts before
the step at which the pocket first reads full: 20 part at that step and 33 after it.

At the parting step the probe compares the calls the growth loop makes on a zone in the
two runs. In 51 of the 53, every call that differs was made in the last room, with the
fill 13 units under 1 at the furthest. In the other two, both in `supergene_oxidation`
at seed 1, a zone the clamp had cut at a fill of 1 − 4.2 × 10⁻⁶ differs as well. How
rare such a step is depends on which step. The first full step has a zone in the last
room in 19 of the 24 shipped runs whose pocket reads full, so the 20 partings at that
step fall where such a zone is the rule: 17 of them at a step where the shipped run
has one. After it such a zone is rare. 76 of the 3,602 later steps of those 24 runs
have one, and of the 33 later partings 18 are on one in the shipped run and all 33 on
one in one run or the other.

What differs at the parting step is one of three things. In 23 of the 53 it is a
crystal's size alone: a crystal is handed a residue in one run and nothing, or another
residue, in the other. In 30 it is an enclosure. In 8 of the 30 the host's layer was
accepted in the last room (in 3 of them the guest's zones decide as well). In 20 the
host's layer is an ordinary one, and the guest passes its two tests only for the zones
it was handed in the last room. The last two are `searles_lake` at seed 42, and there
it is the host's test again, with a turn. The nudged run hands a residue to a
thenardite. That gives it a layer, so it can take the calcite beside it, 1.8 mm away,
which the shipped run gives to a thenardite 9.1 mm away. By its own text the function
takes the nearer host for a guest (`js/85c-simulator-state.ts:2611`), works through its
guests in the order of their numbers, and passes over a host that has itself just been
enclosed (`:2621`, `:2627`). The nearer thenardite is enclosed at that step in both
runs, and its number is the lower. So the calcite is left out: the function does not go
back to the host it had passed over. The last room is where these runs part, by all
three roads.

How far apart they end was read on the crystals the two runs share: those that carry
the same number in both and were born as the same mineral, at the same step, in the
same place. A number alone does not pair them, since runs that have parted number their
crystals apart. Of the 55 that part, 2 end with no shared crystal differing. In the
other 53 the largest difference in a shared crystal's size is under 0.001 µm in 13,
under 1 µm in 14 more, under 100 µm in 17 more, and 100 µm or more in 9, two of which
are `wittichen`'s. In 13 runs a crystal of one run has no counterpart in the other. In
`bisbee` at seed 42, under three of the four factors, 25 of the 36 crystals the two
runs share end differing, a turquoise at 477 µm in the shipped run and at 15 µm in the
nudged one, and 43 crystals of the shipped run and 47 of the nudged have no
counterpart.

That bears on what else this document reports at that setting, and two of those
readings were put to a nudge. Which pockets fill there, and when (§0; §3.1), are
readings of the shipped runs. In the nine scenarios that move, the step at which the
pocket first reads full is the shipped run's in all 108 nudged runs
(`probe-vug-parting.txt`). The other 32 were not read for it; no size of theirs moved
under the four factors. `gem_pegmatite`'s readings under the previewed bound (§4, SC1;
§6, decision 1) were made again with twelve factors on every engine, in the scenario's
own cavity and in the vug, at the three seeds. None of the 72 nudged runs differs from
its un-nudged run in the step at which the fill passes 0.7 or 0.999, in a crystal's
size, active flag or host, or in the summary (`probe-bound-nudge.txt`). Under the bound
the own cavity does not fill, and the vug first reads full at step 98, 100 and 99.

Not run: other seeds; the two larger cavities the form offers, and other shape seeds;
Zen mode, Creative mode and Random Vugg; more than four factors on a shipped run at the
vug, or in the own cavities outside the two scenarios above; and any previewed change
but SC1's bound in `gem_pegmatite` and SC2, which was nudged in its eight scenarios' own
cavities only.

Nothing is proposed. A zone from the last room reaches an outcome by three roads: the
host's test, the guest's two tests, and the size of the crystal that is handed it or is
not. A floor on the host's layer is the change that first suggests itself, and it was
not previewed. By the committed outputs there is room for one in both settings. No host
layer lies between the residues and 0.13 µm in the own cavities, or between the residues
and 4 × 10⁻⁵ µm at the vug, where the 18 residues are 1.8 × 10⁻¹² to 1.2 × 10⁻¹¹ µm.
What differs at the vug is what lies above that gap. 87 enclosures there are on a layer
the clamp had cut: the 18, then 5 up to 0.001 µm, 13 up to 0.1, 39 up to 1, and 12
above. The own cavities have four such layers above their residues, of 0.60 and
1.72 µm. And a floor on the host's layer leaves the other two roads open. 17 of the 35
enclosures above are on a host layer that is no residue, and of the 53 partings the
host's layer is from the last room in 8. (The sixteenth review round put a floor of
10⁻⁶ µm on the host's layer by a wrapper, in two scenario-seeds at the vug, and the
nudged runs parted at the same steps as without it; its run, not committed.) Nor does a
thickness sort the zones themselves: those accepted in the last room at the vug run
from 10⁻¹² to 3.2 µm, and the residues among them to 0.15 µm. In the shipped runs made
here the fill does sort them, at one to nine units under 1 against 142,307 or more.
The simulator has a smallest resolvable solid of its own, 5 µm, which it applies to
what a dissolving crystal has left (`js/18-constants.ts:110`). 76 of the 914 enclosures
in the own cavities and 254 of the 1,285 at the vug are on a host layer under it. A
remedy could sit at the host's test (`js/85c-simulator-state.ts:2466`), at the guest's
(`:2562`, `:2569`), or in the loop that lets the zone through and stores it
(`js/85-simulator.ts:705`, `:947`, `:1022`). Only the last comes before all three
roads. None was previewed. The question goes to the owner with the three values on an
edge (decision 7), as one more place where an outcome hangs on a last binary place.

**A precursor chosen in the fourteenth digit.** The fleet-wide run just described found a
second place where rounding picks an outcome, and this one needs no full pocket.
`wittichen`'s weathering epilogue lets an erythrite be born only on a cobalt mineral that
the weathering is dissolving (skutterudite, safflorite or cobaltite,
`data/scenarios.json5:2935`). Where there are several it takes the one whose latest negative
zone is the most recent, then the one that has released the most cobalt and arsenic, then
the lowest crystal id (`weatheringNucleationContext`,
`js/44e-weathering-epilogue.ts:320`). The near-tie on the first two keys comes with the
scenario. The epilogue begins at step 170 and the erythrite's window opens at step 171
(`data/scenarios.json5:2930`, `:2925`), so when the first erythrite is born each candidate
has one negative zone since the epilogue began. The two engines take min(3.0, 0.1 × size)
off a dissolving crystal of more than 10 µm, times the time scale of 5
(`js/61-engines-sulfide.ts:1109`, `:1111`; `:1151`, `:1153`). So every candidate of
30 µm or more loses the same 15 µm, and at the three seeds the ten candidates are 57 to
758 µm: each of those zones took off the same 15 µm. A release is summed over the shells
that thickness came off: for each shell, the thickness taken times the number the shell
booked per micrometre when it grew (`js/19-mineral-stoichiometry.ts:955`, `:980`), which
is what the fluid lost to the shell divided by the shell's thickness (`:1125`). Those
numbers differ from shell to shell by parts in 10¹³. Skutterudite #1's 15 µm came off
seven shells that had booked seven different numbers for cobalt, from
0.0047143999999988 to 0.0047144000000011. So two crystals of one mineral release
amounts that differ by parts in 10¹⁴, by what their shells had booked, and the second
key is decided there (`probe-rounding-detail.txt`). The third key was not reached in any
of the 39 runs made here: in none are the first two candidates' releases exactly equal
(`probe-rounding-twelve.txt`). At seed 42
there are four candidates, two skutterudites that have released 0.340428 and two
safflorites 0.250524. The skutterudites differ by 1.2 × 10⁻¹⁴ and the erythrite goes to
#1. With every zone multiplied by 1 − 10⁻¹³ they differ by 4.4 × 10⁻¹⁵ the other way, and
it goes to #2 (`probe-rounding-detail.txt`).

What follows is not small. The erythrite encloses the skutterudite it sits on at that
step, on a layer of 192 µm, and later another arsenide: a safflorite at step 180 in the
shipped run, a nickeline at step 194 in the nudged one. An enclosed arsenide keeps its
size and the others go on weathering. The two runs end 563 µm apart in that safflorite
(572 against 8.5 µm), 325 µm apart in the nickeline, with the two skutterudites exchanged
(the enclosed one 60 or 61 µm, the other 8), and with another baseline-style summary.
Seed 2 does the same between two other skutterudites, and ends 275 µm apart in each of
two native arsenics.

It takes more than a last binary place to turn it. Of twelve factors applied to every
growth engine's zones, three turn seed 42 and one turns seed 2, and each of those is
10⁻¹³ or 10⁻¹² away from 1. None of the eight within 10⁻¹⁴ of 1 turns either seed
(`probe-rounding-twelve.txt`). At seed 1 nothing is close: its candidates are one
skutterudite and one safflorite, 0.09 apart. A second skutterudite, of 93 µm, and a
second safflorite have no negative zone when the erythrite is born, and at seed 2 a
third skutterudite, of 16 µm, has none. Why those had not begun to dissolve was not
followed (`probe-rounding-detail.txt`).

Seed 42 is the seed the committed baseline pins. The shipped run reproduces that
baseline, as every probe here checks, and `wittichen`'s entry in it rests on a lead of
1.2 × 10⁻¹⁴ in a sum of 0.34. The entry holds the safflorites' largest size, 572 µm, and
the skutterudites', 60.2 µm, and both turn with the choice
(`tests-js/baselines/seed42_v286.json`). The calibration tests compare the entry exactly
(`tests-js/calibration-shard-*.test.ts`), and the strip digest of the same run is
compared too (`tests-js/strip-digest-wittichen.test.ts`; what in it would turn was not
read). The two tests named for the scenario do not hold the choice: one asks for a living
skutterudite and safflorite, the other for an erythrite on one of the three parent
minerals (`tests-js/wittichen.test.ts:58`, `tests-js/weathering-epilogues.test.ts:288`).
Nine other test files name the scenario, and they were not read. What a change to the
code would do to those last places was not run. The factors here
multiply every zone of a run by one number, and an edit does not. The one size this
document quotes from that scenario, the erythrite's 8.3 mm, is the same in both runs.

Nothing is proposed. Comparing the two releases to a tolerance, so that the crystal id
settles a pair that is equal in all but rounding, is the change that suggests itself, and
it was not previewed. By the committed output it would leave seed 42 as it is, where the
lower id of the pair is the one chosen today, and it would turn seed 2, where it is not.
Other choices in the simulator are made by a comparison of the same shape, a computed
number and then an id: todorokite's precursor by its local σ
(`js/87-nucleation-oxide.ts:192`), the gwindel among the quartz crystals by size
(`js/45-morphology.ts:641`), three orderings of the wall's geometry
(`js/23-geometry-wall-mesh.ts:1029`, `:1048`; `js/23a-geometry-cavity-field.ts:922`), and
the host an enclosure goes to where two can take the guest, by the distance between
their anchors and then by the ratio of their sizes
(`js/85c-simulator-state.ts:2611`, `:2612`). The wall is repainted in the order of the
crystals' sizes, with no second key (`:2096`). None of them was examined. The fleet-wide
run would show one only where one of its four factors turned it. The question goes to
the owner with the note above (decision 7).

## 4. What I would change, and in what order

SC1, SC2 and SC3 are SIM bumps and take the two-commit pattern (instrument or wiring first,
byte-identical; then the bump). SC4 is a pilot to decide on and SC5 a habit. Acceptance is
pre-registered here, and every bump is also held to the full suite, `npm run ci`: twelve checks,
then the tests. Three of the twelve hold a contract that a change proposed here can break, and
each was read against the previews.

- *The locality gate* (`npm run audit:localities`) fails when a species leaves the tier its
  scenario gives it: an aspirational or excluded species that appears, a deterministic one that
  does not appear at all three seeds, a statistical one that appears at none or at all three,
  or a product that no tier and no exclusion names
  (`tools/locality-envelope-audit.mjs`). `probe-appearance-contract.txt` reads every previewed
  arm against those rules at the gate's own three seeds. SC2 at the same constant and SC3 change
  no species' standing. SC1 changes one, and so needs a ruling with it (below). The gate has
  two rules that probe does not read. The first is on timing. A deterministic or statistical
  entry may author the earliest and the latest step at which its species first appears, and
  the gate fails outside that window. Three scenarios author such windows on entries the gate
  checks: `bisbee` (26 entries), `porphyry` (17) and `roughten_gill` (1).
  `probe-appearance-windows.txt` holds each to its windows under every previewed change that
  reaches it, at the gate's three seeds, and none is violated. Under SC2 at the same constant
  no windowed species' first step moves. At three times the constant `roughten_gill`'s
  mimetite first appears at step 180 / 188 / 187, where it appears at 180 today and may not
  before 100. SC1 as recommended and SC3 reach no scenario with a checked window. The second
  rule is on wording: a deterministic entry's rationale may not hold one of five phrases that
  contradict its tier (SC1, below).
- *The cation gate* (`npm run audit:cations`) runs `schneeberg` at seed 42 and holds it to two
  commissioned numbers: five pharmacolite crystals on record, and calcium's molar share of the
  six cations that compete for arsenate, read on the bulk handle at run end, 0.581977988 to
  within 5 × 10⁻⁷ (`tools/cation-sink-audit.mjs`; the six are named at
  `js/30-supersat-arsenate.ts:195`). Lead is one of the six, and the bulk handle is where the
  uraninite block writes its lead, so the share follows whatever becomes of that lead: with no
  radiogenic lead at all it would be 0.724. `probe-cation-gate.txt` makes that one run under
  each change that reaches the scenario. Every bump adds an entry to this gate, which looks its
  numbers up by SIM version and model digest, and by the tool's own account the bumps since
  SIM 275 have restated the same two. SC1 as recommended leaves `schneeberg` as shipped, and SC3
  under the held release ends with the same lead on the bulk handle, so both would restate them
  again. SC2, and SC3 under the continuous release, would have to commission a new share (below).
  The count stays at five under every one of them. The gate's other checks (no zinc in any fluid
  or solid at any step, at least one pharmacolite, a share of 0.3 or more) hold in every preview.
- *The Creative lever audit* (`npm run audit:creative`) fails on a scenario field, or a field
  of a scenario's wall, that it holds no class for (`tools/creative-lever-audit.mjs:545`,
  `:547`). SC1 as recommended authors one. The audit's
  causal probes go through the σ methods, the ledger and the sphalerite and fluorite engines
  (`js/97-ui-fortress.ts:320`, `:372`), none of which SC1 to SC3 changes.

Of the other nine, `audit:bif` runs the two Asbestos Hills scenarios at seed 42, which grow none
of the five minerals whose engines SC1 and SC2 change, uraninite among them. Five read no
simulated outcome: the runtime's identity, the type check, the tutorial lint, the accessibility
audit and the scenario schema. Three bind the bytes of the build, the release manifest and the
provenance manifest, and any bump regenerates them. That is a reading of the twelve tools'
sources, not a run of them on a changed tree. The tests were not read against any change,
but for one that the search for galena returned (§3.3; §7).

The agent API (`agent-api/vugg-agent.js`), a separate headless runtime, carries its own copies
of the three laws, among them the feldspar rate at line 1371, a k·σ rate at line 1202 and the
lead write at line 2149. It has one fluid and no voxel field, so F3 does not arise there
(§3.3). Whether a change extends to it is part of that bump's scope. It was read where this
document says so, and not run.

### SC1 — bound the feldspar pair in `gem_pegmatite` (F1)

Three things have to be chosen: the shape of the bound, where it lives (in the two engines, for
every scenario, or authored on the one scenario that plugs), and its value. The previews settle
the first two.

**The shape.** Four shapes were run on all 13 scenarios that grow feldspar or albite, at seeds 42,
1 and 2. All four keep `gem_pegmatite`'s pocket open through its 230 steps, with the same gem
assemblage, topaz included, so
all four need the ruling on topaz's tier that the recommendation needs (below). They differ in
what else they do (`probe-ab-digest.txt`; three numbers are seeds 42 / 1 / 2):

| Shape | What it is | Scenarios moved; scenarios whose baseline would differ (of 13) | Species lost |
|---|---|---|---|
| clamp on the rate, σ − 1 ≤ 7 (`rclamp=7`) | The engine's rate becomes k·min(σ − 1, 7). σ itself is untouched, so births, the saturation boundary and every reading of σ are as shipped. Only growth in a fluid past σ = 8 feels it. | 7 at every seed: the three pegmatites, `schneeberg`, `tormiq_alpine_cleft`, `ouro_preto`, `jeffrey_mine`; 8, those and `bisbee` | none at seed 42; at seed 1 `schneeberg`'s cobaltite, native arsenic, native bismuth and cuprite; at seed 2 its native arsenic, native bismuth and naumannite |
| clamp on σ, σ ≤ 8 (`cap=8`) | The σ method is capped as a whole, for growth and for births alike. | the same 7; the same 8 | the same; no species differs from the clamp on the rate in any of the 39 runs |
| factor caps at 2 (`fcap=2`) | Each concentration factor is capped, as the sister silicates' are. Ceiling 8. | 13; 13 | at every seed, albite and feldspar in `grimsel_alpine_cleft` (6.5 and 5.3 mm shipped) and in `chiastolite_hornfels` (0.7 mm feldspar); in `schneeberg`, four species at seeds 42 and 1 and three at seed 2, native arsenic at all three |
| per-factor root (`root=3`) | σ → σ^(1/3): the per-ion convention S = (IAP/K)^(1/ν) of the electrolyte crystal-growth literature (Nielsen 1981, read at abstract level), applied to the proxy's three factors. Keeps the saturation boundary. | 13; 13 | in `schneeberg`, three species at seeds 42 and 2 and four at seed 1, native arsenic at all three; `bisbee`'s alunite at seed 1 |

I expected to recommend factor caps, the convention the file already follows. The preview refused:
where one ingredient is scarce and another abundant, the uncapped product clears σ = 1 only because
the abundant factor carries it, and a factor cap takes that away. It deletes both feldspars from the
Grimsel cleft, a 6.5 mm albite and a 5.3 mm K-feldspar. Those are not crystals that dissolved
away: in `grimsel_alpine_cleft`, `chiastolite_hornfels` and `deccan_zeolite` five expected
feldspars and albites are no longer born at any seed, which the locality gate would fail
(`probe-appearance-contract.txt`). Factor caps move the saturation boundary;
for a mineral already calibrated without them, that is a different mineral. The preview used one
ceiling for every factor. Separate ceilings were not tried. The root keeps the boundary and moves
every one of the 13: `ouro_preto` falls from 28.8 to 0.3 % full (32.3 to 0.3 and 22.8 to 0.2 at
seeds 1 and 2), and `bisbee` has 9 / 6 / 17 species moved.

**The shape is the clamp on the rate**, inside `grow_feldspar` and `grow_albite`
(`k·min(σ − 1, E)` with each engine's own k, 3 and 4; `js/59-engines-silicate.ts:220`, `:348`),
so that σ itself keeps reporting what the proxy says. The shape has a physical reading: far from
saturation, growth is limited by transport and stops scaling with σ. Its value has none. E is a
calibration constant (trap 2).

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

1. *No value both keeps `gem_pegmatite` open through its run and leaves the others as they
   are.* E = 7 is the loosest of the four values of this table
   that keeps that pocket under 0.7 full; E = 11 passes 0.7 at step 185 to 188 and ends
   it 90 % full. (Of the values between them, 8 and 9 keep it under 0.7 as well and 10 does
   not; SC1's acceptance, below.) Written into the engines, E = 7 changes 8 of the 13 baselines. It takes
   `tormiq_alpine_cleft`'s albite from 66 mm to 27 and `schneeberg`'s feldspar from 28 mm to 10.
   And it leaves `schneeberg` without solid cobaltite, native arsenic, native bismuth and cuprite
   at seed 1, and without native arsenic, native bismuth and naumannite at seed 2. Cobaltite,
   native arsenic and native bismuth are three of the twelve species that scenario lists as
   expected. The crystals are small, 0.06 to 0.25 mm as shipped (cuprite 0.004 mm). The cause is
   enclosure. As shipped, seven of the eight crystals of those species that keep their solid at
   seeds 1 and 2 are crystals another has overgrown: a 27 mm feldspar in six cases and an
   arsenopyrite in one, most of them at steps 89 to 91, just after the oxidizing water of step 85
   arrives. Under the clamp the feldspar is 10 mm and none of them is enclosed: six lose their
   last solid between steps 93 and 111, and the seventh, a native arsenic at seed 2, is not
   born at all (`probe-enclosed-survivors.txt`). At seed 42 nothing is
   lost and several species shrink to almost nothing: proustite from 0.80 to 0.007 mm, cobaltite
   from three crystals of 0.09 mm to one of 0.02, acanthite from 1.2 to 0.73 mm. None of this
   shows in the repository's own contract. A species that is born and then dissolves away still
   counts as having appeared, so the locality gate stays green on every one of these runs
   (`probe-appearance-contract.txt`). The loss is of solid at the end of the run, which no gate
   reads. One test does pin a burial there, at seed 42:
   `tests-js/bismuth-morphology.test.ts:122` asks that every native bismuth of `schneeberg`
   end the run enclosed, inactive and with solid left. By the ninth review round's run (not
   committed) it holds under the general clamp at 7 and at 11, where that seed's one
   bismuth ends enclosed by another crystal than as shipped. The losses are at seeds 1 and
   2, which the test does not run. The values that leave the cleft alone, E = 23 and
   E = 47, lose nothing and leave the pocket plugged. The cleft's and `schneeberg`'s bulk σ for
   the pair peaks at 30 and 35 (`probe-sigma-maxima.txt`), three times and more the σ of 6
   to 10 at which a clamp of 5 to 9 opens the pegmatite.
2. *Shigar's pocket empties.* At every value its albite is a quarter of its shipped 270 mm or
   less. At E = 7 it is 9.7 mm in a 220 mm cavity that ends 0.0 % full, with its tourmaline and
   topaz barely changed (1.8 and 0.7 mm). Shigar runs 70 steps to `gem_pegmatite`'s 230, so a
   clamp that suits one gives the other a third as much feldspar. The shipped pocket is 92 % full
   of the same two minerals: v241 enlarged the cavity to keep them from sealing it, and the clamp
   takes that reason away. Shigar is also one of the five scenarios that carry a guided
   tutorial, which would then be narrating another pocket.
3. *`radioactive_pegmatite` fills on quartz at every value.* It ends 98 to 100 % full. That is
   not a reason to cap quartz: its σ is a solubility ratio, and 245 is what that ratio is in a
   fluid that cools to 100 °C still holding 15,000 ppm of silica. It is the clearest single case
   for SC4.

**Recommendation: the clamp authored on `gem_pegmatite` alone, at E = 7.** The scenario's entry
in `data/scenarios.json5` names the bound. The scenario object carries it to the engines, as it
carries `tiger_eye_stage` and `open_to_atmosphere` today (`js/70-events.ts:963`, read at
`js/59-engines-silicate.ts:1717` and `js/19-mineral-stoichiometry.ts:996`). The two engines apply
it where it is present and run as shipped where it is not. The `rclamp=7` arm on `gem_pegmatite`
is its preview, since an arm is applied to one scenario's run. The pocket ends 42.1 / 41.4 /
41.0 % full, which is also the largest fill of the run, and grows to step 230. Tourmaline reaches
12.0 / 11.9 / 12.0 mm, six topaz crystals of 2.5 mm appear, spodumene and lepidolite reach 2 to
5 mm, and no species is lost (§3.1). The pair itself comes out differently, not simply smaller:
feldspar ends at 24 to 25 mm where it ends at 32 to 37 as shipped, and albite, which now has
230 steps to grow in, ends larger, 32 mm against 24 to 30. Three seeds are few, so the same
arm was run at eight more
(3, 4, 5, 7, 13, 99, 2024 and 17). It holds at all eleven: the largest fill of the run is 36 to
42 %, tourmaline 11.8 to 12.3 mm, topaz 2.2 to 2.5 mm, and the first acceptance line is
met at every one (`probe-pegmatite-reach.txt`). That line is the first of the acceptance
lines at the end of this section, and the rest of the section uses it as its test of a run:
fill under 0.7 for the whole run, a positive zone stored after step 215, tourmaline of 5 mm
or more, topaz of 1 mm or more, and no species that has solid as shipped left without it.

**A bound on a rate buys steps, not an end, and how many depends on the cavity.** Past the
clamp a crystal adds k·E·(time scale) micrometres on every step a run has, and nothing
proposed here short of SC4 makes the fluid run out. So what the bound sets is the step at
which the pocket fills, and that depends on how long the run is and how large the pocket.
Everything above is the scenario's own 230 steps in the scenario's own cavity. The game
lets a player change both. In Simulation mode the Time Steps box replaces the scenario's
length (`js/91-ui-legends.ts:249`) and the Cavity Size select replaces its cavity (`:217`).
Creative mode has no length: the player presses Wait (`js/97-ui-fortress.ts:1191`), and the
Scenarios menu opens a scenario there (`js/94-ui-menu.ts:132`, `:473`). Zen has no end.
`probe-clamp-horizon.txt` steps the bounded pocket on in each, at seeds 42 / 1 / 2.

| `gem_pegmatite` at time scale 5 | Fill at step 230, % | First step at fill ≥ 0.7 | First step at fill ≥ 0.999 | Share of the cavity's volume three steps after it seals, % |
|---|---|---|---|---|
| Simulation mode, the bound as recommended (E = 7), stepped on | 42.1 / 41.4 / 41.0 | 258 / 258 / 259 | 306 / 305 / 306 | quartz 67 to 68, feldspar about 18, albite about 13 |
| … the pair's rate clamped at 1 instead | 20.2 / 19.7 / 18.6 | 273 / 273 / 274 | 310 / 310 / 311 | quartz 98, feldspar and albite 0.1 together |
| Creative mode, E = 7, the player still pressing Wait | 42.4 / 42.0 / 41.4 | 257 / 257 / 258 | 306 / 304 / 306 | quartz 67 to 68, feldspar 17 to 18, albite about 13 |

| `gem_pegmatite` in Zen, by the game's own loop, at time scale 1 | Fill at step 400, % | Fill at step 1,150, % | First step at fill ≥ 0.7 |
|---|---|---|---|
| shipped | full at step 32 / 33 / 32 | | 22 / 23 / 22 |
| E = 7 | 18.1 / 19.7 / 23.9 | 29.5 / 31.1 / 31.0 | 1872 / 1849 / 2104; 94 / 94 / 86 % full at step 2,400, where the runs were stopped |
| E = 11 | 19.5 / 21.1 / 24.9 | 62.8 / 64.1 / 52.6 | not by step 1,150, where the runs were stopped |
| E = 23 | 35.6 / 37.1 / 40.9 | run stopped at fill 0.7 | 603 / 599 / 584 |

The Cavity Size select offers three sizes besides the scenario's own, each the middle of a
size class, and Quick Play starts its run with whatever the select holds
(`js/94-ui-menu.ts:387`). `probe-pegmatite-reach.txt` builds those runs through the game's
own command runtime, for the scenario's 230 steps.

| Cavity Size on the form | The cavity | As shipped | Under the bound, E = 7 | SC1's first acceptance line under the bound |
|---|---|---|---|---|
| scenario default | 69.3 cm³ | full at step 9 / 10 / 10 | 42.1 / 41.4 / 41.0 % full at step 230 | met at 3 seeds of 3 |
| vug, 15 mm | 1.9 cm³ | full at step 2 | passes 0.7 at step 62 / 64 / 64 and is full at step 97 / 99 / 99; tourmaline 5.0 / 5.1 / 5.1 mm; topaz absent, or under 0.01 mm at seed 1 | met at none |
| pocket, 162.5 mm | 2,378 cm³ | full at step 38 / 37 / 38, behind feldspars of 99 to 104 mm | 1.2 % full at step 230 | met at 3 |
| cave, 1,650 mm | 2.5 m³ | 3.8 / 3.9 / 3.7 % full at step 230; tourmaline 12.0 mm, topaz 2.5 mm, feldspars of 460 to 475 mm | 0.0 % full at step 230 | met at 3 |

The form's Shape Seed box, which its Random button redraws for every run, changes the
cavity's shape and with it the volume: 62.9 to 78.3 cm³ at ten shape seeds, against the
scenario's 69.3. Under the bound the largest fill of those ten runs is 36.8 to 45.9 %, and
the first acceptance line is met at all ten.

The vug was run again with the pair bound more tightly, to see whether it is the value of
the bound that fails there; then under SC1's other courses (below), each without the
clamp; and then under eight pairs of those changes made together.

| The 15 mm vug under | First step at fill ≥ 0.7 | First step at fill ≥ 0.999 | Largest shares of the vug's volume at the end of the run, % | First acceptance line |
|---|---|---|---|---|
| the bound as recommended, the pair's rate clamped at 7 | 62 / 64 / 64 | 97 / 99 / 99 | feldspar 50 to 52, quartz 35 to 39, albite 8 | met at none |
| the rate clamped at 3 | 81 / 82 / 83 | 166 / 163 / 166 | quartz 75 to 79, feldspar 9 to 10, tourmaline 9 to 12.5 | met at none |
| the rate clamped at 1 | 84 / 84 / 86 | 174 / 173 / 177 | quartz 83 to 87, tourmaline 12 to 16 | met at none |
| the rate clamped at 0, under which the pair holds no solid | 84 / 84 / 86 | 174 / 174 / 176 | quartz 83 to 87, tourmaline 12.5 to 16 | met at none |
| the fill switch | 2 / 1 / 4 | 2 / 66 / 6 | feldspar and albite 113 and 100 together at seeds 42 and 2; feldspar 76 and quartz 22 at seed 1 | met at none |
| the change to the broth (SiO2 × 0.1, Al × 0.15) | 91 / 90 / 93 | 134 / 132 / 138 | feldspar 75 to 76, albite 13 to 15.5, tourmaline 8 to 11; no quartz | met at none |
| the rind at 5 mm | 2 / 1 / 65 | 2 / not by step 230, where it is 96 % full / 177 | feldspar 112 at seed 42; feldspar 85 at seed 1; quartz 52 and feldspar 37 at seed 2 | met at none |
| the changed broth with the rate clamped at 7 | 93 / 92 / 95 | 141 / 138 / 144 | feldspar 80 to 83, tourmaline 9 to 12 | met at none |
| the changed broth with the rate clamped at 3 | 153 / 144 / 144 | not by step 230, where it is 90 to 92 % full | tourmaline 40 to 51, feldspar 32 to 37 | met at none |
| the changed broth with the rate clamped at 2 | not at seed 42, which ends 65 % full; 171 / 173 at seeds 1 and 2 | not by step 230 | tourmaline 45 to 61, feldspar 11 to 12 | met at seed 42 |
| the changed broth with the rate clamped at 1.5 | not at seed 42, which ends 54 % full; 201 / 210 at seeds 1 and 2 | not by step 230 | tourmaline 45 to 61, feldspar 5 | met at seed 42 |
| the changed broth with the rate clamped at 1 | at no seed: the vug ends 49 / 66 / 67 % full | not by step 230 | tourmaline 46 to 62 | met at all three |
| the changed broth with the rate clamped at 0 | at no seed: the vug ends 48 / 65 / 65 % full | not by step 230 | tourmaline 46 to 62 | met at none: the pair holds no solid |
| the fill switch with the rate clamped at 7 | 93 / 100 / 104 | not by step 230 at seeds 42 and 1, which end 92 and 98 % full; 152 at seed 2 | quartz 48 to 60 | met at none |
| the rind with the rate clamped at 7 | 76 / 77 / 79 | 177 / 172 / 175 | quartz 70 to 74, feldspar 16 to 17 | met at none |

Every clamp in this table is made by a wrapper round the engine, which rescales the zone
the engine returns. SC1 would write the clamp inside the engine. `probe-clamp-in-engine.txt`
makes both runs side by side, in 17 comparisons and 40 pairs of runs: the scenario's own
cavity under the recommended bound, under a clamp of 1, of 3 and of 11, and with the
changed broth; eight of this table's twelve clamped rows; and three other places the clamp
at 7 has been previewed.

At 2 and above the two have the same sizes and the same fill, in all 22 pairs made: the
same baseline-style summary, and a fill that agrees after every step to within 2.3e-16 of
the cavity. They do not leave the same record. Albite's engine debits the fluid at its
rate and then writes the zone's trace aluminium from what is left
(`js/59-engines-silicate.ts:370` to `:377`), so the wrapper, under which that engine runs
unclamped, records less of it than a clamp in the engine does. Of the 84,244 zones
compared in those 22 pairs, 6,908 albite zones in 20 pairs differ in that trace, by 13.8 %
of the larger value at most, and on every one of them the value is the higher with the
clamp in the engine. The step log prints a zone's trace Al where it is above 1 ppm, and
3,522 of its 86,229 lines differ, in 10 pairs. (The two pairs with no difference are
`schneeberg`'s, which has no albite.) One pair differs in something more, at the step that
seals it. In the form's vug at seed 42, at step 98, one albite zone of 9e-12 µm has
another thickness under each form, and a tourmaline stores one more zone, of 2e-11 µm,
under the wrapper. That is rounding in a cavity that is full to the last binary place, and
no size or fill shows it. So SC1's bump will give albite other trace-Al values than its
preview does, and that is to be expected of it (§7).

At 1.5, 1 and 0 they are different runs, in all 18 pairs. At 1 a clamp in the engine puts
feldspar's rate under the 4 at which the engine rolls for an inclusion, and at 1.5 it does
so on part of the run (in the vug with the changed broth, 57 / 58 / 62 inclusions where the
wrapper's run has 90 / 101 / 88).
Under the wrapper the roll is made as shipped. At 0 the engine returns nothing, where
under the wrapper it runs as shipped and its zone is rescaled to nothing. They end close.
The fill at the end of the run is within 0.65 of a point (0.6412 at the most), the step at
which the fill passes 0.7 within 10 steps, the step at which
the pocket is full within 3, and the first acceptance line has the same verdict under both
forms in all 18 pairs. So the rows at 1.5 and at 1 stand for a clamp in the engine at those
values to within those margins, and the rows at 0 show the vug without the pair (§7). A
share above 100 % is growth that overshot the cavity in the step that sealed it. The eight
pairs in the table are the pairs that were run; no other pair was, and no three changes
together.

Five things follow.

1. *The margin is 27 to 29 steps.* The recommended bound meets its first acceptance line, fill
   under 0.7 for the whole run, by that much. A player who lengthens the run in the Steps
   box, or keeps pressing Wait in Creative mode, has a sealed pocket at step 304 to 306.
2. *What seals it is quartz, which a bound on the pair does not reach.* After its last event
   the fluid goes on cooling, from 276 °C at step 230 to about 158 °C by the time the pocket
   has sealed, on a bulk handle whose silica nothing draws down, and quartz grows from 37 mm
   to 53 or 54. With the pair held to 4 to 6 mm (E = 1) the pocket passes 0.7 only 15 steps later and
   seals 4 or 5 steps later, 98 % of it quartz. The pair is then a thousandth of the pocket,
   so a tighter bound has nothing more to give: about 15 steps is all the margin a bound on
   the pair can add. (A clamp of 1 written inside the engine passes 0.7 at the same three
   steps and seals within a step of the wrapper's; `probe-clamp-in-engine.txt`.) This is
   `radioactive_pegmatite`'s quartz again (§3.1). It is SC4's case, not SC1's.
3. *In Zen the horizon is the pair's, and it is minutes long.* There quartz stops at about
   25 mm: it is that size after 400 steps without the drift and after 2,400 with it, by
   which time the fluid is at 25 °C. The pair goes on at the clamped rate, 21 and 28 µm a
   step, which is the 8.5 and 11.1 mm it has after 400 steps. At step 2,400 feldspar and
   albite are 44 to 49 and 59 to 65 mm and together hold 61 to 71 % of the pocket, where
   quartz holds 7 to 9 %. So in Zen a looser clamp fills the pocket sooner, roughly in
   proportion: E = 23 passes 0.7 at about step 600. At Zen's default speed the 1,850 to
   2,100 steps that E = 7 takes to fill 0.7 are 31 to 35 minutes. At its fastest setting,
   ten steps a second, they are three to four minutes if the page keeps that pace.
4. *In the form's smallest cavity no one course holds the line. One pair of the courses
   run does, at a price.* In the 15 mm vug the bounded pocket passes 0.7 at step 62 to 64
   and is full at step 97 to 99, inside the scenario's 230 steps, and the first acceptance
   line fails at every seed. That is not the value of the bound. With the pair holding no
   solid at all the vug passes 0.7 at step 84 to 86 and is full at step 174 to 176 (83 to
   87 and 173 to 179 with the pair switched off inside the engine): a 19 mm quartz and
   tourmalines of 7.3 to 7.7 mm fill 1.9 cm³ between them. So the bound as
   recommended costs that vug 20 to 22 steps to 0.7 and 75 to 77 to the seal, against no
   feldspar at all. Each other course of this section, taken alone, leaves the vug past 0.7
   too: the fill switch by step 4; the rind by step 65, and at two seeds by step 2; and the
   change to the broth, which grows no quartz, by step 93, with the pair sealing the vug at
   step 132 to 138. Two changes together can keep it open. With the broth changed and the
   pair's rate clamped at 1 the vug ends 49 / 66 / 67 % full, most of that tourmaline, and
   the first acceptance line is met at all three seeds, by 3.5 points of fill at the
   nearest. A clamp of 1 written inside the engine gives the same verdict: the vug ends
   49 / 66 / 66 % full and the line is met at all three seeds, by 3.8 points at the nearest
   (`probe-clamp-in-engine.txt`). The value is a narrow one. At 1.5 and at 2 the line is
   met at seed 42 alone, under either form of the clamp: at seeds 1 and 2 the vug passes 0.7
   between steps 171 and 220. And the pair has a price in two parts. The pocket is left one
   quartz crystal of 0.01 mm, and quartz is the one species this scenario calls
   deterministic. The first acceptance line asks only that a species which has solid as
   shipped still has some, so that speck passes it. And in the scenario's own cavity the
   same two changes leave the pocket 1.3 / 1.8 / 1.8 % full. A larger cavity is not a cure
   for the plug either: as shipped
   the 162.5 mm pocket is full at step 37 to 38, and the 1.65 m cave is open at step 230
   only because nothing fills 2.5 m³ in that time. Its feldspars are 460 to 475 mm.
5. *That vug is not this scenario's matter alone.* The form offers it to every scenario.
   One of the 41 is an open surface with no pocket to fill. Of the other 40, as shipped,
   15 / 16 / 15 are full inside their own length there, where three are in their own
   cavities, and in eight of the fourteen that fill at every seed the mineral with the
   largest share is not feldspar or albite (§3.1). So what happens at that size is a
   question about the form's setting as much as about this bound.

So the bound is not a cure, in any mode. It gives the scenario's own run, in the scenario's
own cavity, an open pocket. It gives a longer run a later seal. In the form's smallest
cavity it seals the pocket at step 97 to 99, 75 to 77 steps before quartz and tourmaline
would by themselves, and no bound on the pair alone would prevent that seal.
That is S2 read forward (§2.2): a crystal that is still growing on a run's last
step goes on growing if the run does. The recommendation stands on the first of those: for
230 steps all eight events fire into an open pocket and four species grow to millimetres.

What it costs.

- *One baseline changes*, `gem_pegmatite`'s. Nineteen test files name that scenario. Which of
  them pin the plugged pocket was not checked here; the bump's full suite will say. (The
  ninth review round ran the assertions of seven of them under the preview, not committed,
  and all passed; §7.)
- *One tier has to change with it.* Topaz is an aspirational species of `gem_pegmatite`: the
  scenario's entry calls it "absent from the release seed audit; retained as a future F-Al
  pocket-stage tuning target rather than a deterministic promise". Under the bound, six topaz
  crystals appear at each of the locality gate's three seeds. The gate fails on an aspirational
  species that appears, both in the scenario's claim card, which is the committed record of
  its seed-42 run, and in the three-seed panel
  (`tools/locality-envelope-audit.mjs:182`, `:265`; `probe-appearance-contract.txt`). So the
  bump has to move topaz to the deterministic tier, and that is the owner's ruling to make. The
  entry's rationale has to be rewritten by hand with it. The gate will not ask: its rule against
  a deterministic rationale that contradicts its tier looks for five phrases (`:50`), and "absent
  from the release seed audit … rather than a deterministic promise" holds none of them, so the
  entry would pass with that sentence still on it. The ruling binds what comes after: once topaz
  is promised at every seed, a later change that loses it fails the same gate, and SC4's pilot
  with the bound lifted is such a change.
- *The new field needs a class.* The Creative lever audit fails on a scenario field it holds no
  class for. `tiger_eye_stage` is classed there as a process input, not a Creative control, and
  the bound would be classed the same way in the same commit.
- *The simulator gains a constant* that is there because this scenario's fluid takes the feldspar
  proxy to a σ in the hundreds, where every scenario but the three pegmatites keeps it at 35 or
  less (§3.1). It does not make feldspar stop for a reason. It slows feldspar enough that this
  scenario's 230 steps end with the pocket 41 to 42 % full, 27 to 29 steps before it would
  pass 0.7 (above). That is the argument for SC4, whose third
  acceptance line is that the pocket stays open with this bound lifted. The owner's directive of
  2026-05-06, "when in doubt, defer to the actual geology", was given against a cap on a
  crystal's size (under the rind, below). A bound on a rate is not that cap, but it is authored
  and not derived, and the owner may weigh it the same way.
- *It reaches the runs that carry the scenario object, and no others.* The page's code
  constructs a simulator in eight places. Three pass the scenario object on, and `gem_pegmatite`
  was run through two of them:

  | Constructor | What starts a run there | Scenario object | `gem_pegmatite`'s plug and the bound |
  |---|---|---|---|
  | `js/85l-simulation-command-protocol.ts:329` | Simulation mode, Quick Play | kept | the scenario's own run, when the form is left at its defaults: every number of §3.1 and §4, and at growth seed 42 the run the baseline pins. An empty seed box draws a seed (`js/91-ui-legends.ts:199`), and Quick Play empties it and draws the scenario as well (`js/94-ui-menu.ts:380` to `:385`), so its run is not the baseline's. The form's Time Steps, Cavity Size and Shape Seed boxes change the run (above) |
  | `js/94-ui-menu.ts:281` | a scenario opened in Creative mode, which is what the Scenarios menu does | kept, with a carbonate boundary added | run: the same plug, and under the bound the same 42 % at step 230 (§3.1). No last step |
  | `js/99z-agent-interface.ts:301` | the agent interface's headless run | kept | read, not run. It takes a step count and a shape seed (`:285`) |
  | `js/98a-ui-zen.ts:102` | Zen mode | left behind, with the events | run by the game's own loop: plugs at step 32 / 33 / 32 at Zen's time scale; the bound would not apply. No last step |
  | `js/96-ui-random.ts:427` | Random Vugg | there is none | run on its pegmatite archetype: 3 cavities of 8 fill in the pocket size class, all 8 in the vug class, none in the cave class (§3.1) |
  | `js/94-ui-menu.ts:187` | a Creative starter fluid | there is none | run on the radioactive starter: 67 to 82 % full after 120 steps, the scenario's length. No last step |
  | `js/97-ui-fortress.ts:1087` | a custom Creative run | the player's own options | not run |
  | `js/97-ui-fortress.ts:493` | a probe inside Creative mode | none | not a run a player sees |

  So the bound as recommended reaches the scenario where the baseline, Quick Play and Creative
  mode start it. In the scenario's own cavity it keeps the pocket under 0.7 full there for
  the scenario's 230 steps and 27 to 29 more; in the form's smallest cavity the pocket does
  not last the 230, with this bound or with any other on the pair alone. It does not reach
  a Zen run of the same scenario, or Random Vugg's pegmatite
  archetype, the mode of the owner's first report. Two ways to widen it were not previewed.
  A field authored under the scenario's wall rides into Zen, which passes the wall through
  (`js/98a-ui-zen.ts:99`), as `per_cell_local_fill` would; a wall field needs a class in the
  Creative lever audit as a scenario field does. Random Vugg has no scenario to author
  anything on, and would need the constant a second time, in its builder. On the seeds run
  it kept that mode's larger pockets from filling completely there, and did not do that
  for its smallest pockets or for its vugs (§3.1).

It leaves Shigar's 270 mm albite, `radioactive_pegmatite`'s plug, the pegmatite pockets of
Random Vugg, of Zen and of Creative mode's starter fluid, and the uncapped product in every
other scenario exactly as they are.

The owner may prefer one of five other courses. Each is read below at the scenario's 230
steps and in the scenario's own cavity, as the recommendation was. How long a course holds
past them was read for the clamp alone (above). Three of them were also run in the form's
15 mm vug, where none keeps the pocket open by itself (the table above, which also has the
pairs of changes that were run there); the general clamp is the recommended bound there,
and with no bound the vug is full at step 2.

- *The general clamp*, for the sake of one rule in the engines, and because a rule in the
  engines reaches every one of those constructors. Applied in process it slows the pair in
  each mode that was run, for the length that was run: a Zen run of `gem_pegmatite` by the
  game's own loop is 18 / 20 / 24 % full after 400 steps and passes 0.7 at step
  1872 / 1849 / 2104 (above); the radioactive starter is 2 to 3 % full after 120 steps; and
  of Random Vugg's eight cavities of the pocket size class none fills completely in its own
  run, though one ends 98 % full on quartz. That is one size class of that mode's three,
  and the larger end of it: the eight are 34 mm and more, and of the 23 pockets under 40 mm
  that seeds 1 to 400 draw, ten still fill under the clamp, with quartz holding the largest
  share of six and morganite of four.
  At its vug setting six of the eight cavities still fill under the clamp and all eight
  pass 0.7, and five still fill with the pair holding no solid, so on those eight seeds no
  value of the clamp alone keeps that class open. At its cave setting none fills with the
  clamp or without it. At the setting the
  page opens on, which draws a class, one of eight fills where four do as shipped (§3.1).
  Its cost is the E = 7
  column above, with
  Shigar's pocket to be decided in the same change and `schneeberg`'s lost solids accepted or
  cured. It needs the same ruling on topaz. It also moves the share the cation gate
  commissions, from 0.582 to 0.521. Under it, at seed 42, `schneeberg`'s bulk handle ends with
  284 ppm of lead, not 179, although its uraninites are smaller (6.9 mm against 8.3). Only an
  active uraninite writes lead (`js/85-simulator.ts:1263`). As shipped the 27 mm feldspars
  enclose two of the three uraninites at step 90, and they stop writing. Under the clamp none is
  enclosed and all three write to the end of the run (`probe-cation-gate.txt`). It is the same
  burial that keeps the small sulfides and native elements alive.
- *The switch the tree already has.* The high-fill work left an opt-in on a scenario's wall,
  `per_cell_local_fill`, under which the fill dampener reads the fill of a crystal's own cell
  and not the cavity's (§2.2). No scenario uses it. On `gem_pegmatite` it needs no constant.
  It does need a class in the Creative lever audit, as the recommended bound's field does:
  the audit holds no class for that wall field and fails on one it holds none for
  (`tools/creative-lever-audit.mjs:51`, `:547`). At seeds 42, 1 and 2 it looks as the bound
  does: the largest fill of the run is
  37 / 41 / 55 %, tourmaline 11.9 / 12.0 / 11.3 mm, topaz 2.1 / 2.5 / 2.4 mm. At eight further
  seeds the pocket reaches fill ≥ 0.999 in six, between steps 24 and 187, behind an albite of
  57 to 87 mm; the first acceptance line is met at 5 seeds of the 11, where the clamp
  meets it at all 11 (`probe-pegmatite-reach.txt`). The switch changes where the dampener
  looks. It does not bound the pair. In the form's vug it ends 113 % full at seed 42, past
  the cavity's own ceiling (§3.4). I do not recommend it for this, and it needs the same
  ruling on topaz where it works.
- *A change to the fluid in place of a bound.* The constant is there because of this scenario's
  broth, so the broth could be changed and the engines left alone: no constant, one baseline.
  With SiO2 cut from 8,000 to 800 ppm and Al from 150 to 22.5, values that still hold all four
  of tourmaline's factors at their caps, the pocket ends 19.4 / 21.1 / 15.5 % full with
  tourmaline at 11.6 / 11.5 / 11.3 mm and six topaz crystals of 2.5 to 2.6 mm (`ab-gem-broth`).
  It costs the pocket its quartz: one crystal of 0.007 mm, where the bounded pocket grows three
  of 37 mm. At 1,200 ppm of SiO2 the quartz is 0.5 mm and the pocket ends 49 to 68 % full.
  Quartz is the one species this scenario calls deterministic, "fundamental miarolitic pegmatite
  gangue at Cruzeiro", and a broth value changed to make feldspar behave is a calibration
  constant too, only less visible. I do not recommend it. It needs the same ruling on topaz.
  (A changed broth would follow the scenario into Zen mode, which copies the fluid. That was
  not run.)
- *The rind.* §3.1 previewed the pair as a wall-zone rind: no thickness past 5 mm. As a rule for
  every scenario it changes ten of the 13 baselines. It stops every feldspar and albite at the
  first zone that takes it past 5 mm, which is 5.0 to 5.3 mm outside the pegmatites and up to
  10.6 mm in them (`tormiq_alpine_cleft`'s albite from 66 mm, and `ouro_preto`'s from 40 mm,
  whose pocket falls from 29 % to under 1 % full). It empties Shigar, and leaves `schneeberg`
  without solid of three to five species at every seed (`ab-rind-13-scenarios`). A size at which a
  mineral stops is a cap, not a rate law, and SC4 exists to avoid caps. The owner has ruled on
  a milder one. After the report of 2026-05-06, v59 capped a crystal's length at its cavity's
  radius and its width at the diameter. v61 took the cap out again, when it touched only the
  size a crystal was drawn at, on
  the directive "when in doubt, defer to the actual geology": real crystals in a tight cavity
  "don't magically halt at the wall" (`js/15-version.ts`, the v59 and v61 notes;
  `BUG-CRYSTALS-CLIP-VUG-WALL.md`). A rind is that halt, put into the growth itself. I do not
  recommend it, on one scenario or on all.
- *No bound.* F1 then waits for SC4, and until SC4 lands seven of `gem_pegmatite`'s eight events
  fire into a solid pocket.

Not previewed: the general clamp at any value between 11 and 23, where one that spares
`schneeberg` might be found (none of them would keep the pocket under 0.7 full). Enlarging
the cavity, as v241 did for Shigar, is not a sixth course. The form's two larger settings are
that preview (the table above): at 162.5 mm the shipped pocket is full at step 37 to 38, and
at 1.65 m it is open at step 230 behind feldspars of 460 to 475 mm. No locality's pocket
should be sized to fit its feldspar.

Pre-registered acceptance for SC1's bump, as recommended:

- `gem_pegmatite` at seeds 42, 1 and 2, as Simulation mode starts it with its form at the
  defaults (the scenario's own cavity, shape seed and 230 steps): fill stays under 0.7 for the
  whole run, so the fill
  dampener never engages; some crystal stores a positive zone after step 215; tourmaline ≥ 5 mm;
  topaz ≥ 1 mm; and no species that has solid today is without it. (The preview meets this line
  at those three seeds, at eight more, and at ten other shape seeds. At the three it meets
  the fill by 28 or 29 steps: stepped on, the pocket passes 0.7 at step 258 or 259. As a
  report and not a test, the bump gives that step for its own run, so that the margin is on
  record.)
- Quartz, the one species the scenario calls deterministic, has a crystal of 5 mm or more
  at each of those seeds. The line above does not ask for that. It asks that a species with
  solid today still has some, and one quartz crystal of 0.01 mm meets it, as the changed
  broth shows (above). The preview grows quartz of 36.7 to 37.5 mm at those three seeds,
  and of 36.6 mm or more at the eight others and at the ten shape seeds. Wherever this
  section says a run meets or fails "the first acceptance line", it is the line above and
  not this one or the next.
- The pair is bounded and not removed: at each of those seeds the largest feldspar is
  15 mm or more and the largest albite 20 mm or more. The two lines above refuse a bound
  that is too loose and none that is too tight. A clamp of 1 meets both at all three
  seeds, with feldspars of 3.4 to 3.5 mm and albites of 4.4 to 4.7 mm
  (`probe-clamp-in-engine.txt`). The two floors are choices, as the others are. They sit
  at about three fifths of what the preview at 7 grows, 24.0 to 24.7 mm and 31.4 to
  32.7 mm at the eleven seeds (`probe-pegmatite-reach.txt`), and they decide where the
  range of values these lines admit begins (below).
- *A report, not a test.* The bump says what the bound does at the form's three other
  cavity sizes. In the preview the first line is met at the pocket and cave sizes and fails
  at the vug size, where the pocket is full at step 97 to 99. This bump is not asked to
  hold the vug size to the line, because no bound on the pair alone can: with the pair
  holding no solid, that vug passes 0.7 at step 84 to 86. What becomes of that size is put
  to the owner (decision 1).
- *A report, not a test.* The bump gives the verdict of the three lines above at the ten
  shape seeds of `probe-clamp-value.mjs --shape-seeds`, at growth seed 42. Those are other
  shapes of the scenario's own cavity, holding 63 to 78 cm³ where its own holds 69. The
  lines above are read at the scenario's own shape seed and name no other, so they do not
  ask for this. In the preview all three are met at the ten at every value from 5 to 8,
  and at 9 the first fails at two of them (below).
- The census controls `space+end` (positive) and `time` (negative) fail, and the same commit
  rewrites them.
- No other scenario's entry in the regenerated seed-42 baseline differs from today's. The bound
  is absent everywhere else, and the engines have to run as shipped where it is absent.
- `npm run audit:localities` passes, with topaz's tier in `gem_pegmatite` changed by the owner's
  ruling and no other tier touched. Topaz's rationale is rewritten with its tier; the gate does
  not check that sentence, so a reviewer has to.
- `npm run audit:creative` passes with the bound's field classed as a process input, and
  `npm run audit:cations` passes with its two numbers restated unchanged.
- *A report, and a test only if Zen is to carry the bound.* The bump says which of the
  game's other entry points carry it. If Zen mode is to, the
  simulator that `idleCreateSim('gem_pegmatite')` builds reads it, and in a Zen run made by
  the game's own loop the fill stays under 0.7 through step 1,150 at seeds 42, 1 and 2. That
  is the scenario's 230 steps at a fifth of the thickness a step. The shipped arm of
  `probe-clamp-horizon.mjs` reads the line on a changed tree: it applies no clamp of its own
  and steps to 1,150 unless the pocket fills first. Today the pocket fills, and passes 0.7 at
  step 22 or 23. With the clamp at 7 in process it is 30 or 31 % full at step 1,150. With the
  clamp at 23, a value that leaves the pocket plugged in Simulation mode, it passes 0.7 at
  step 584 to 603, and the line fails. The line is weaker than the first one, though. A
  clamp of 11 meets it, at 62.8 / 64.1 / 52.6 % full at step 1,150, and the first line
  refuses 11 (fill 0.7 at step 185 to 188 in Simulation mode). In Zen quartz stops at 25 mm
  where the scenario's reaches 37, so the same thickness of feldspar fills less of the
  pocket. So this line shows that the bound is carried into Zen and holds there for a stated
  horizon. It does not choose E, and neither do the other lines (below). Zen has no last
  step, so a line there can hold a horizon and nothing more.

**The lines admit a range of values and do not pick one.** The A/B outputs run the clamp
at 3, 7, 11, 15, 23 and 47, and of those 7 alone meets the first line, the quartz line and
the line on the pair. `probe-clamp-value.txt` runs every whole value from 3 to 11 at seeds
42, 1 and 2, with the clamp written inside the engine. The first line refuses 10 and 11,
where the fill passes 0.7 at step 212 to 215 and 185 to 188. The line on the pair refuses 3
and 4, which leave feldspars of 10.4 to 14.1 mm. Every value from 5 to 9 meets all three
lines at all three seeds, and the two ends of that range, 5 and 9, meet them at the eight
further seeds as well. Across the range the gems do not change: tourmaline is 11.9 to
12.0 mm, topaz 2.5 mm and quartz 36.7 to 37.5 mm at those three seeds. What the value
sets is the size of the pair and how much room is left:

| E | Largest fill of the run, % | The fill passes 0.7 at step | Steps to spare after the run's 230 | Largest feldspar, mm | Largest albite, mm |
|---|---|---|---|---|---|
| 5 | 27.8 / 27.7 / 27.1 | 267 / 268 / 268 | 37 / 38 / 38 | 17.3 / 17.6 / 17.6 | 23.1 / 23.0 / 23.2 |
| 6 | 33.8 / 33.5 / 32.9 | 264 / 264 / 264 | 34 / 34 / 34 | 20.7 / 21.1 / 21.1 | 27.7 / 27.6 / 27.9 |
| 7 | 42.1 / 41.4 / 41.0 | 258 / 258 / 259 | 28 / 28 / 29 | 24.1 / 24.7 / 24.7 | 32.3 / 32.2 / 32.5 |
| 8 | 53.2 / 53.0 / 51.7 | 249 / 249 / 251 | 19 / 19 / 21 | 27.6 / 28.2 / 28.2 | 36.9 / 36.9 / 37.2 |
| 9 | 67.5 / 66.9 / 65.8 | 233 / 234 / 235 | 3 / 4 / 5 | 31.0 / 31.6 / 31.5 | 41.5 / 41.5 / 42.0 |

At the eight further seeds a clamp of 5 has 37 to 41 steps to spare and one of 9 has 4 to
17.

That range is read where the lines are read, at the scenario's own shape seed. Simulation
mode's form has a Shape Seed box, and another shape seed is another cavity. The ten at
which the preview at 7 was held to the first line hold 62.9 to 78.3 cm³, where the
scenario's own holds 69.3. `probe-clamp-value-shape-seeds.txt` takes the five values to
those ten, at growth seed 42:

| E | Largest fill of the run at the ten shape seeds, % | Steps to spare after the run's 230 | All three lines met at |
|---|---|---|---|
| 5 | 24.2 to 30.2 | 34 to 42 | 10 of 10 |
| 6 | 29.5 to 36.8 | 30 to 39 | 10 of 10 |
| 7 | 36.8 to 45.9 | 24 to 33 | 10 of 10 |
| 8 | 46.6 to 58.0 | 13 to 26 | 10 of 10 |
| 9 | 59.2 to 73.3 | −3 to 14 | 8 of 10 |

At 9 the first line fails in the two smallest of the ten cavities (63.2 and 62.9 cm³),
where the fill passes 0.7 at step 227, three steps inside the run. The quartz line and the
line on the pair are met at all ten at every value. So the lines admit 5 to 9 as they are
written, because they name the scenario's own shape seed and no other, and 5 to 8 if they
are read at these ten as well. The acceptance asks the bump to report that read and does
not make it a test.

So within the range the value is a choice between a larger pair in a fuller pocket and
more steps before the pocket fills, and the lines as written do not make it. This review
recommends 7, and not because a rule picks it. The loosest whole value the lines admit is
9, with three to five steps to spare at the acceptance seeds and none at two of the ten
shape seeds. Seven is the value at which this document's other previews of the recommended
bump were made: the form's other cavities, the eight further seeds, the horizon in
Simulation mode, in Creative mode and in Zen, and the reach into the other modes. It sits
in the middle of the range, with 28 or 29 steps to spare, and 24 to 33 at the ten shape
seeds. A bump that takes another value of the range would have those previews to make
again, and the Zen line has been run at 7, at 11 and at 23 and at no value between 7 and
11. Which value is the owner's to say (decision 1).

If the owner chooses the general clamp, four things in those lines change. The line on the
other scenarios' baselines ("No other scenario's entry … differs from today's") is replaced
by this one: the scenarios whose baseline changes are a subset of the 13 that grow the
pair, the pair's largest crystals land within a tenth of the table's column for the value
chosen, and Shigar's outcome is decided before the bump. (The table has a column for 7, 11,
23 and 47. Another value needs its own run first.) In the line on the two audits, the
cation gate's share is commissioned anew (0.521 by the preview at 7) and not restated, and
there is no scenario field for the Creative lever audit to class. And the last line's
report becomes a test: a clamp in the engines is carried into every entry, Zen among them,
so the Zen bar applies. The first line, the line on quartz, the line on the pair, the two
census controls that sit on `gem_pegmatite` and the ruling on topaz stand. Which other census controls the general
clamp flips, on the seven other scenarios whose baseline it changes, was not predicted.
A line that no scenario loses a species cannot be met at E = 7.

### SC2 — put the three engines on σ − 1 (F2)

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

The preview is a wrapper round the engine, as SC1's is: the engine runs as shipped and the
zone it returns is rescaled. Each of the three engines refuses a rate under 0.1
(`js/61-engines-sulfide.ts:391`, `:415`; `js/57-engines-oxide.ts:95`), a test it makes on
the thickness it proposes, before the simulator's time scale and its allocation. With the
law written inside the engine that test falls on the new rate, so a zone the wrapper
rescales to under a tenth of a micrometre would not be returned at all.
`probe-excess-in-engine.txt` runs the wrapper beside the law computed by the engines
themselves, for the eight scenarios at the three seeds and at both constants. No line of
an engine is edited for it. For the length of an engine's call its σ method returns a
value that reads as σ where the engine tests it against 1 and as m·(σ − 1) where the
engine computes its rate. So the engine's own statements compute the proposed law, make
their own test on it, and set the habit or do not. The probe stops if an engine uses σ any
other number of times.

At the same constant the two have the same sizes and the same fill in 22 of the 24 pairs,
and in those 22 no field of a crystal or of a zone and no line of the step log differs.
The two that part are `sunnyside_american_tunnel`'s, where the engine refuses five calls:
four at step 39 of seed 42 and one at step 34 of seed 2. Galena is the one mineral of the
three that grows there. At seed 2 no summary changes, and the fill differs by under a
millionth of the cavity. At seed 42 the two are different runs. The pocket ends 86.5 %
full with the law in the engine and 83.1 % under the wrapper (85.4 % as shipped), calcite
is 74.9 mm against 73.9, galena 9.32 against 9.30, and six more species differ by 0.04 mm
or less.

At three times the constant they have the same sizes and fill in 21 of the 24. One
refused call parts `sunnyside_american_tunnel` at seed 2, again by under a millionth of
the cavity. The other two are `radioactive_pegmatite` at seeds 1 and 2, where the engine
refuses nothing. That pocket has been sealed since step 55 or 59. The two forms run alike
until step 86 or 89, after the event of step 80 has begun to alter the uraninites. There
one quartz crystal's size differs by 0.3 % between them, and from that step the runs
separate. They end with uraninites of 11.5 against 11.4 mm and of 13.3 against 13.4 mm,
and with 240 against 256 ppm and 289 against 285 ppm of lead on the bulk handle. That is
the arithmetic and not the law. The wrapper's own run, made again with each of its zones
multiplied by 1 + 10⁻¹⁵, separates from the wrapper's run in the same way: at seed 1 it is
the engine's run at every step, and at seed 2 it is a third run, with a uraninite of
13.5 mm and 277 ppm of lead.

The cause is an enclosure, and it is neither SC2's nor this constant's. In a pocket that
is full, a host layer of 10⁻¹¹ µm, which is what the cavity's last room comes to on a
feldspar of that scenario's size, licenses
a crystal to enclose its neighbour, and an enclosed uraninite is altered no further and
writes no more lead (§3.4). The two forms differ in the last binary places of the zones
they return, and in this scenario at these two seeds that is enough to move the step at
which a feldspar encloses a uraninite. `probe-enclosure-floor.txt` nudges the wrapper's
zones twelve ways, from the smallest change a multiplication can make to one part in
10¹². At three times the constant a size or the lead differs from the un-nudged run in 11
and 12 of the twelve at seeds 1 and 2, with 230.5 to 259.3 ppm and 243.7 to 283.3 ppm of
lead on the bulk handle. At the same constant it is 4 and 5 of the twelve. As shipped, with no
preview at all, it is 6 and 9. At seed 42 no size and no lead differs in any of the 36.
So every cell of this scenario at seeds 1 and 2, in all three columns of the table, is one
run of several that rounding chooses between, and the shipped column is among them.

Against the shipped run the two forms move, lose and gain the same species in all 48
pairs. In `radioactive_pegmatite` at seed 2 that is true of these two runs and not of the
run a rounding away. At three times the constant both forms gain an opal with solid, and
five of the twelve nudged runs gain none; at the same constant neither form gains a
species, and two of the twelve gain that opal. The lead on the bulk handle is the same
under both forms in the 24 pairs at the same constant, `schneeberg`'s 111.2 / 136.0 /
133.3 ppm included, and in 22 of the 24 at three times it. So the table above, the share
of 0.630 and decision 2 stand for the law written in the engine, with two exceptions.
One cell is a preview of that law to within the sizes given above, and not the run
itself: `sunnyside_american_tunnel` at seed 42 under the same constant. And the cells of
`radioactive_pegmatite` at seeds 1 and 2 are as the last paragraph says: 11.5 and 13.3 mm
in the table at three times the constant, 11.4 and 13.4 with the law in the engine, and
11.3 to 11.5 and 13.0 to 13.5 over the twelve nudged runs.

The uraninite's law carries a second quantity with it. Each active uraninite writes a tenth of
its size in lead to the bulk handle every step (`js/85-simulator.ts:1276`), so a smaller
uraninite writes less. At the same constant the bulk handle ends with 111 / 136 / 133 ppm of
lead in `schneeberg`, where it ends with 179 / 222 / 217 today, and with 119 / 105 / 120 in
`radioactive_pegmatite`, where it ends with 147 / 128 / 147 (`probe-ab-digest.txt`; in that
second scenario the numbers at seeds 1 and 2 are each one of a range, above). The cells
never see that lead (F3). Even with all of it kept out of every fluid no species is moved,
gained or lost in either scenario (the `nopb` arm, under SC3 below), so a species table does
not show the change. One gate does. The cation gate reads calcium's share on that same bulk
handle, and with less lead there the share is 0.630, not the commissioned 0.582
(`probe-cation-gate.txt`). So SC2's bump has to commission a new share for that gate and say
why it moved. Eighty-five of the 303 test files name one of the eight scenarios; which of them
pin a size that moves was not checked.

The same block writes a third quantity. It gives every other active crystal a radiation dose
of a fiftieth of each uraninite's size a step (`js/85-simulator.ts:1283`), and keeps a total
for the run. The closing narration shows the total (`:1592`) and a crystal's card its own dose
(`js/97c-ui-crystal-card.ts:161`); a search finds more readers of both, which were not
followed. Smaller uraninites dose less: at the same constant `schneeberg`'s total at seed 42
is 10.6, where it is 17.4 today. All three quartz crystals stay past the smoky threshold, 69
of the 74 crystals with solid are past the metamict one where 71 are today, and no mineral
has another card name or colour (`probe-cation-gate.txt`). The dose was read in that one run
only.

SC2 and SC3 both reach the two uraninite scenarios, so the two were also run together. In
`radioactive_pegmatite` with the pocket held open and the lead carried to the cells, SC2 takes
the uraninites from 11.5 / 11.1 / 11.2 mm to 8.5 / 8.2 / 8.3 and the lead on the bulk handle at
run end from 312.6 / 299.2 / 287.9 ppm to 243.3 / 233.2 / 224.6 (the held release; the
continuous one ends 0.1 ppm lower). Plumbogummite is 0.71 / 0.70 / 0.69 mm with SC2 and without
it, so the size SC3's acceptance asks of it does not depend on which lands first
(`probe-lead-choices.txt`). In `schneeberg` the amount of lead does matter, to pharmacolite
(SC3 below; trap 16).

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
subset of the eight scenarios above; and the locality gate passes. At the same constant no
species of the eight scenarios changes whether it appears, and no species with a
first-appearance window in `porphyry` or `roughten_gill` first appears on another step
(`probe-appearance-windows.txt`). At three times the constant
`roughten_gill`'s mottramite, which that scenario expects, appears at two seeds of three and the
gate would fail (`probe-appearance-contract.txt`). The cation gate passes with five pharmacolite
crystals, as today, and a share commissioned anew (0.630 by the preview at the same constant).
No census control is expected to flip. The sixth and seventh review rounds ran census copies
of their own with SC2 installed at the same constant: at seed 42 on six scenarios, five of
them scenarios whose baseline SC2 changes, where the 22 controls evaluated all passed, and
at seeds 1 and 2 on those five, where 20 of the 22 were evaluated and passed
(`competition-log` and `band` need `bisbee`, which was not run at those seeds). `pause`,
which rests on galena's stop and start in `sunnyside_american_tunnel`, read 23 / 14 / 12 in
those copies, where it reads 175 / 74 / 12 as shipped; its floor is 5. Those copies
installed the wrapper, and that scenario is the one in which the wrapper and the law in
the engine part at the same constant. The thirteenth review round ran copies with the law
computed by the engine on that scenario and read the same 23 / 14 / 12. None of these
copies is committed. A control that fails on the changed tree is a finding to explain.
The table, the windows and the dose of this section were measured under the wrapper too.
At the same constant the law computed by the engine gives the wrapper's sizes, its fill
and its records in every pair but `sunnyside_american_tunnel`'s, so they hold for it
there. In that scenario
the species that move are the same and the sizes are within those given above; it has no
uraninite to dose anything, and it authors no first-appearance window
(`probe-appearance-windows.txt`).
One test of the suite stands at its floor on galena. `tests-js/cascade-gate-audit.test.ts:107`
asks for a galena on record in at least four of six scenarios at seed 42 and finds exactly
four today (§3.3). At the same constant the preview keeps a galena with solid in each of the
four (the table above), so that count does not move. The test asks for a record, not for
solid: a galena that was born and has dissolved away still counts (trap 11, from the other
side). So what would fail the suite is a constant, or a change of fluid made to restore
galena's size, under which the galena of one of the four is never born.
Trap: retuning each scenario's Pb or S until galena is its old size is tuning to a seed. Where
galena becomes small, the question is whether that pocket's fluid is really that close to
saturation, which is a question for its sources.

### SC3 — carry the radiogenic lead to the fluid the crystals read (F3)

Make the uraninite block's lead reach the voxels as well as the bulk handle, the way
`_propagateGlobalDelta` carries an event's change. The constraint on any fix is that the lead has
to reach both fluids. Births read the bulk handle (§2.3) and growth reads the crystal's own cell
(§2.1). Lead on the bulk handle alone admits crystals that cannot grow, which is F3. The
opposite arrangement, lead booked in the uraninite and returned to the uraninite's own cell,
does not work either: a write to one cell never reaches the bulk handle, so it changes no
birth (trap 13).

Two things are then to choose, and they are coupled: when the lead is released, and whether
`radioactive_pegmatite` licenses the galena it promises (§3.3). `probe-lead-choices.txt`
runs every combination, in the pocket as shipped and in the pocket held open (σ of feldspar,
albite and quartz capped at 8, which leaves it 11 to 18 % full). Three numbers are seeds
42 / 1 / 2.

| | Every step, as today (`pb`) | Held until a uraninite is altered (`held`) |
|---|---|---|
| What it is | The block's increment goes to the bulk handle and to every voxel on every step. | The increment is kept back, and the store is released to the bulk handle and to every voxel on the next step on which a uraninite takes a negative zone. |
| `radioactive_pegmatite`, pocket as shipped | No species moves; opal gains solid at seed 2. Plumbogummite holds no solid. | No species moves, gains or loses solid. Plumbogummite holds no solid. The lead is released on 1 / 2 / 15 steps from step 80 on, 117 / 98 / 117 ppm in all. |
| … pocket held open: plumbogummite | ×3 at 0.71 / 0.70 / 0.69 mm | ×3 at 0.71 / 0.70 / 0.69 mm |
| … galena past σ_crit on the bulk handle (pocket as shipped; 33 / 31 / 30 with it held open) | on 33 / 30 / 30 steps | on none |
| … galena, if licensed | Pocket as shipped: one crystal of 0.16 mm / none / one of 0.04 mm. Pocket held open: four of 5.1 / 5.0 / 4.6 mm, born at steps 47 to 50. | none, in either pocket |
| `schneeberg` | 3 / 2 / 1 species moved, none lost | 2 / 1 / 1 species moved, none lost |
| … its two feldspars, 26 to 28 mm: zones that carry the amazonite note (none as shipped) | 213 of 319 zones, 15.4 of 54 mm (214 of 318 and 214 of 317 at seeds 1 and 2) | 144 of 319 zones, 2.1 of 54 mm (144 of 318 and 144 of 317) |
| … the step log's lines that name a feldspar zone amazonite (none as shipped): all that the steps return, and those on the steps Simulation mode prints | 213 / 214 / 214, and 103 / 100 / 92 | 144 / 144 / 144, and 74 / 74 / 64 |
| … the name and colour the game gives each crystal (microcline, `#a09080`, as shipped) | amazonite, `#44bb88`, both crystals at every seed | amazonite, `#44bb88`, both crystals at every seed |
| … the share of each crystal's Zone History bar drawn in that green (none as shipped) | 27.6 to 29.6 % | 3.8 to 4.3 % |
| … the body colour the cavity view starts from (`#dcb59e` as shipped) | `#dcb59e` | `#dcb59e` |
| … pharmacolite at seed 42 (five crystals, the largest 1.09 mm, as shipped) | five, the largest 0.80 mm | five, the largest 0.80 mm |
| … the cation gate's share at seed 42 (0.581978 commissioned) | 0.582009: off by 62 times the gate's tolerance | 0.581978: the commissioned value |

The table's entries for `radioactive_pegmatite`'s pocket as shipped are of a pocket that
is full, and at seeds 1 and 2 each is one run of several that rounding chooses between
(§3.4, the sixth note). The opal that gains solid at seed 2 under the continuous
timing is one the shipped run itself gains under two of twelve nudges of a zone's last
places (`probe-enclosure-floor.txt`), so that entry is not shown to be the lead's doing.
The 2 and 15 steps and the 98 and 117 ppm of the held release at those seeds, and the
galena of 0.04 mm at seed 2, are of the same kind. No arm of this table was itself put
to a nudge.

Five things follow.

1. *Plumbogummite does not depend on the timing.* It is born at step 100, by which time either
   release has delivered the lead. What SC3 does for the species the scenario licenses is the same
   either way, and it shows only once the pocket stays open: 0.7 mm, against 0.005 mm today.
2. *Galena does.* Under today's timing galena is past σ_crit while the fluid is still reducing,
   and with a license it is born from step 47: before any uraninite has been altered, and half a
   run before the "final cooling (step 100)" at which the scenario's note has it precipitate.
   Held until alteration, the lead arrives with the oxidizing fluid of step 80. Galena is then
   past σ_crit on no step, and a license could not be used. So "hold the lead and license
   galena" is not on offer. The two coherent pairs are to hold the lead and take the galena out
   of the scenario's texts, or to keep today's timing and license galena.
3. *Licensing galena on today's tree does nothing.* With the lead on the bulk handle alone no
   galena is born at any seed, in either pocket. The wall cells hold 30 ppm.
4. *Lead in the cells renames `schneeberg`'s two largest crystals under either timing, and
   leaves them drawn as before in the cavity.* `grow_feldspar` notes a microcline zone as
   amazonite when its own cell holds more than 10 ppm of Pb (`js/59-engines-silicate.ts:304`;
   W12 of `PROPOSAL-HOSTILE-REVIEW-WISE-2026-08-05.md` is that this gate reads lead alone).
   `schneeberg`'s cells hold 5 ppm as shipped. The note is read at more than one grain. Two
   searches of `js/` found the readers below: one for the note's text and for the zone's
   trace lead, and one for every read of a zone's `note`, which is how the lines that print
   whatever a zone's note says are found. Four readers were run through the game's own code
   (`probe-lead-choices.txt`).
   - *Per crystal.* One noted zone is enough for `crystalDisplayName` and `crystalColor` to
     call the crystal amazonite and give it `#44bb88` (`js/12-mineral-art.ts:304`, `:225`).
     Both feldspars change, at all three seeds, under either timing. Three more lines use the
     same test and were read, not run: the narrator's "green from Pb²⁺ substitution"
     (`js/85a-simulator-narrators.ts:218`), the feldspar narrative's amazonite paragraph
     (`js/92i-narrators-silicate.ts:115`), and the fluorescence line
     (`js/27-geometry-crystal.ts:673`).
   - *Per zone.* Wherever the game shows a crystal zone by zone, the two timings differ. Two
     such readers were run. The Zone History bar colours each zone as a crystal of that one
     zone (`groupZonesByChemistry`, `js/98c-ui-zone-bars.ts:81`) and weighs it by thickness:
     27.6 to 29.6 % of each feldspar's bar is in that green under the continuous release and
     3.8 to 4.3 % under the held one. The step log has a line for every zone of more than
     0.5 µm, and the line ends with the zone's note (`js/85-simulator.ts:1031`, through
     `describe_latest_zone`). `run_step` returns 213 / 214 / 214 such lines that name a
     feldspar zone amazonite under the continuous release, 144 at every seed under the held
     one, and none as shipped. How many of them a player sees depends on the mode. Creative
     mode prints every line a step returns (`js/97-ui-fortress.ts:1191`; read, not run).
     Simulation mode, which is the run measured, prints a step's lines on every fifth step
     and on a step with an event, a nucleation or a wall line (`js/91-ui-legends.ts:349`).
     That is about half the steps of this run, and 103 / 100 / 92 of those lines against
     74 / 74 / 64.
     Three more places list every zone with its note, and were read, not run: the
     zone-by-zone list under the Zone History bar (`js/97d-ui-zone-modal.ts:294`, `:319`),
     the record of a collected crystal (`js/93-ui-collection.ts:306`) and the agent
     interface's specimen dump (`js/99z-agent-interface.ts:229`). What they have to print is
     the count in the table: the note on 213 of the two feldspars' 319 zones, or on 144. The
     Record Player's detail window prints a card for each zone of the stretch it shows, with
     the note on the card and in the card's tooltip (`js/98-ui-groove.ts:685`, `:701`). Two
     places show the note of the one zone under the pointer: the tooltip of the six-lane bar
     in the same modal (`:273`) and the Record Player's own tooltip
     (`js/98-ui-groove.ts:42`).
   - *Not at all.* The body the cavity view draws starts from `resolveBodyColour`
     (`js/12a-colour-lexicon.ts:207`), which gives `#dcb59e` as shipped and under both timings,
     for two reasons. The feldspar's colour rule for amazonite names a variant that the colour
     lexicon has no entry for. And the rule's trigger is "Pb > 5 and radiation", read on the
     crystal's trace lead weighted by zone thickness, which is a hundredth of the lead in its
     cell. That reading is 0.05 as shipped, 0.33 to 0.36 under the continuous release and
     0.11 to 0.12 under the held one (`_bodyFieldVal`, in `probe-lead-choices.txt`), so an
     entry in the lexicon would not by itself draw them green.
   - *Found and not followed.* The record of a collected crystal stores each zone's trace lead
     (`js/93-ui-collection.ts:300`).

   A reader that both searches miss is not covered here (trap 17). The baseline's summary
   records none of this,
   so no gate sees it. `radioactive_pegmatite`'s broth holds 30 ppm already: its feldspars are
   named amazonite as shipped, with 1.4 to 4.5 % of their bars in green and 25 / 12 / 19
   such lines returned by its steps, 9 / 4 / 5 of them on steps Simulation mode prints.
   Neither timing changes the name or the bar (the continuous release returns 18 lines at
   seed 2, and 4 of them are printed). Those counts are of the full pocket, and at seeds 1
   and 2 each is one run of several that rounding chooses between (§3.4, the sixth note):
   the 19 against 18 at seed 2 is not shown to be the timing's doing.
5. *Lead in the cells costs `schneeberg`'s pharmacolite a factor.* Lead is one of the six
   cations that pharmacolite's σ counts as competing for arsenate, and that σ carries a factor
   of 1.3 while calcium's molar share of the six is 0.6 or more
   (`js/30-supersat-arsenate.ts:387`). At seed 42 pharmacolite's engine runs 68 times. As
   shipped, the share on the cell it reads is 0.6 or more on all 68 (0.72 to 0.73 at run end).
   With the lead in the cells it is under 0.6 on all 68, under either timing (0.58 at run end),
   and the largest crystal ends at 0.80 mm where it ends at 1.09 mm as shipped. With SC2 landed
   as well there is less lead, the share is 0.6 or more on all 68 again (0.63 at run end), and
   the crystal ends at 1.08 mm. Seed 1 repeats it on its one pharmacolite with solid: 0.46 mm
   as shipped, 0.34 mm with the lead in the cells, 0.46 mm with SC2 as well, where the share
   ends at 0.61, a hundredth above the step. Seed 2 grows no pharmacolite
   (`probe-cation-gate.txt`). This is the pharmacolite among the species moved, and it is the
   species the cation gate was built around.

**Recommendation: hold the lead until a uraninite is altered, release it to both fluids, and take
the galena out of the scenario's own texts.** It is what the sources describe: the
project's own note on uraninite has the lead accumulate in the crystal, and the data review of
July had already judged galena the wrong lead mineral for that pocket's oxidizing end (§3.3). It
gives the licensed species exactly what the continuous release gives it. And in the preview it
leaves the cation gate's two numbers as commissioned. (That holds because every uraninite's lead
has been released by the end of that run. A fix that books the lead crystal by crystal could end
with some still held.) For `schneeberg` both timings rename that scenario's two feldspars and
cost its pharmacolite the same factor. They differ wherever the game shows a feldspar zone by
zone: under the held release about two thirds as many zones carry the note, in the step log
as far as a mode prints it and in the zone lists named above, and the Zone History bars
carry a seventh as much green.

It costs more than the continuous release in two ways.

- *The scenario's texts have to change, and one of them is code.* The scenario's own entry and
  event file say it on three lines (§3.3): the description and the notes in
  `data/scenarios.json5`, and the narration of the step-100 event in
  `js/70d-pegmatite-radioactive.ts`. Under this timing no license can make those true. Other
  places tie galena to this scenario as well (§3.3): the mineral data's list, which the
  Library shows; a generated copy of that list and three pages built from it; a test that
  counts the scenario among six for galena; and the agent API's copy of the narration. What
  the pocket does grow from the lead, once it stays open, is the plumbogummite the scenario
  already licenses.
- *The held lead is one more field in the simulator.* The continuous release needs none. It is
  not a cost to saves: a save here is a recipe that is replayed from the seed, not a snapshot
  (`js/93a-ui-saves.ts:13`), so a field the simulator computes is rebuilt on load. Whether the
  replay fingerprint should list it is a choice; it does not list the same block's radiation
  dose or damage today (`js/85l-simulation-command-protocol.ts:170`). That is about the field
  only. A save does not survive the bump itself: it records the SIM version it was made on,
  and replay is refused on any other (`js/93a-ui-saves.ts:1463`), which is true of SC1, SC2
  and SC3 alike, as of every SIM bump before them.

The preview is coarser than the fix would be: it keeps one store for all the uraninites and
releases it when any of them takes a negative zone, where the fix would book the lead crystal by
crystal.

If the owner would rather keep a galena in that pocket, the other coherent pair does it: today's
timing, with galena licensed. The scenario's texts then stand, with the notes' step 100 corrected,
since the galena is born at steps 47 to 54. It needs a source for galena in a pocket of that kind
(the scenario declares itself generic, "not anchored to a specific locality"), and a new share
for the cation gate. The closing narration's own sentence about galena from uraninite's lead
(§3.3) would then print in that scenario, and with the lead in the cells it would be true.
The test that counts galena in six scenarios (§3.3) would find five where it finds four.
That timing also grows a galena where there is no license to consult: 8.3 to 9.7 mm in
Creative mode's starter fluid of the same name, about half a millimetre in a Zen run of
the scenario, and 21.5 to 22.5 mm in a Zen run of `schneeberg` (below).

Under either pair the same thing happens to `schneeberg`, and the owner should see it before
choosing to land SC3 at all: its two largest crystals are named amazonite where they are named
microcline today, on their cards and in the narration, while the cavity view draws them as
before. Whether the name is right for an Erzgebirge vein is a question for W12, which asks that
the amazonite gate read irradiation as well as lead. `schneeberg` has both.

How much a held release delivers depends on how often the uraninite is altered. `schneeberg`'s
uraninites take 79 / 149 / 149 negative zones. `radioactive_pegmatite`'s take 3 / 6 / 29 as
shipped, 11 / 9 / 9 with the feldspar pair clamped (that pocket then fills on quartz, §3.1), and
123 at every seed with quartz bounded as well. In that scenario the first falls at step 80, with
the oxidizing fluid. The 6 and the 29 are each one outcome of several. In that full pocket
an enclosure on a layer of 10⁻¹¹ µm ends a uraninite's alteration, and with a zone nudged
in its last binary places the same two runs take 3 to 15 and 17 to 48 (§3.4). The counts
with the pair clamped were not put to that nudge.

Where nothing alters the uraninite, a held release delivers nothing. `grow_uraninite` takes
a negative zone only below saturation with O2 above 0.3 (`js/57-engines-oxide.ts:79`), and
in the scenario's own run it is an event that brings the oxygen. The game also grows
uraninite where no such event comes; §3.3 lists the places that were found. The timings
were run in the ones that list has a run for, each through the game's own code
(`probe-lead-choices.txt`, its last part): Creative mode's starter fluid of this scenario's broth; Random Vugg's pegmatite
archetype, whose one event is a cooling (`js/96-ui-random.ts:81`); and Zen runs of the two
scenarios whose Zen simulators grow a uraninite, `radioactive_pegmatite` and `schneeberg`.
None of these runs has a scenario object, so none has a license. Three numbers are seeds
42 / 1 / 2. Random Vugg's two are seeds 42 and 5, the two of the eight run whose fluid grew
a uraninite.

| | As shipped | Every step (`pb`) | Held (`held`) |
|---|---|---|---|
| Creative mode's starter fluid "Radioactive Pegmatite", 120 steps, left to itself | bulk Pb 30 → 286 / 275 / 268 ppm; every voxel at 30.00; no galena | voxels at 250 to 287 ppm; four galenas at each seed, the largest 9.7 / 8.9 / 8.3 mm, born from step 53 / 56 / 66 and still growing at step 120 | nothing released; 256 / 245 / 238 ppm kept back; the run's summary is the shipped run's |
| … with one Drain after step 60, which takes O2 on the bulk handle from 0.00 to 0.60 (the highest voxel reads 0.60 right after it) | the uraninites take 46 / 12 / 3 negative zones, from step 61 / 95 / 61; bulk Pb ends at 253 / 220 / 213 ppm, every voxel at 30.00 | one galena of 0.63 mm, whose last zone is at step 60 / one of 8.6 mm / none | released on 46 / 9 / 3 steps, 185 / 168 / 62 ppm in all, the first at step 61 / 95 / 61; 38 / 22 / 120 ppm still held at step 120; no lead mineral on record |
| … with one Evaporate after step 60 instead, which takes O2 to 1.50 and cools the fluid by 10 °C | the uraninites take 36 / 67 / 32 negative zones, all from step 61; bulk Pb ends at 185.5 / 193.7 / 168.5 ppm, every voxel at 30.00 | one galena of 0.63 mm, whose last zone is at step 60 / one of 6.3 mm / none | released on 33 / 36 / 29 steps, 121.8 / 134.1 / 101.7 ppm in all, the first at step 61 at every seed; 33.7 / 29.5 / 36.9 ppm still held at step 120; no lead mineral on record |
| … with the Drain after step 30 instead | the uraninites take 78 / 79 / 3 negative zones, from step 31 / 66 / 31; bulk Pb ends at 226.3 / 200.9 / 194.5 ppm, every voxel at 30.00 | no galena at any seed | released on 78 / 42 / 3 steps, 164.8 / 153.5 / 15.2 ppm in all, the first at step 31 / 66 / 31; 31.5 / 17.4 / 149.2 ppm still held at step 120; no lead mineral on record |
| Random Vugg, archetype pegmatite, pocket class, 155 and 167 steps | bulk Pb 0 → 132 / 173 ppm; every voxel at 0.00 | voxels at the bulk handle's value; no lead mineral on record | nothing released; 132 / 173 ppm kept back; the run's summary is the shipped run's |
| A Zen run of the scenario, by the game's own loop, 600 steps | bulk Pb 30 → 682 / 621 / 652 ppm; every voxel at 30.00; no galena | voxels at the bulk handle's value; two, four and four galenas, the largest 0.61 / 0.41 / 0.55 mm, born from step 102 / 105 / 103, their last zone at step 202 / 199 / 198 | nothing released; 652 / 591 / 622 ppm kept back; the run's summary is the shipped run's |
| A Zen run of `schneeberg`, by the same loop, 600 steps | bulk Pb 5 → 1,035 / 1,021 / 1,015 ppm; every voxel at 5.00; no galena; the pocket 6 % full | voxels at 1,002 to 1,034 ppm; four galenas at each seed, the largest 22.5 / 21.8 / 21.5 mm, born from step 152 / 156 / 165 and still growing at step 600; the pocket 12 / 11 / 9 % full | nothing released; 1,030 / 1,016 / 1,010 ppm kept back; the run's summary is the shipped run's |

In the 33 runs left to themselves (every row but the three with an action) no uraninite
takes a negative zone, and O2 at the end is under 0.3 on the bulk handle and in every
voxel: 0.00 in the starter fluid and in both Zen simulators, 0.10 and 0.06 in the two
Random Vugg runs. Four things follow.

1. *F3 is not confined to the two scenarios.* In each of these runs, as shipped, the
   uraninites' lead goes to the bulk handle alone (§3.3). In the Zen run of `schneeberg`
   that is a thousand parts per million in 600 steps, with every voxel at 5.
2. *Held, a run that nothing oxidizes keeps its lead.* That is what the sources describe
   for a uraninite that nothing alters, and the run is then the shipped run: its
   baseline-style summary is the same, and only the lead on the bulk handle differs. A
   player can oxidize it. Two of Creative mode's buttons, Drain and Evaporate, raise O2 on
   the bulk handle (`js/97-ui-fortress.ts:1596`, `:1605`). In each of the three rows with
   an action the uraninites are altered and the store is released to the bulk handle and
   the cells alike, at all three seeds: at the step after the action, or at seed 1 under a
   Drain 35 or 36 steps after it. What is released is what the store holds at each
   alteration. The uraninites go on making lead, and what they make after their last
   alteration is held again: 17 to 149 ppm at step 120. At seed 2 a Drain alters them on
   three steps only, and most of that run's lead is still held at its end. So in the
   starter fluid, as in the scenario, held lead is released when the uraninite is altered.
   In none of the nine held runs with an action is a galena, a plumbogummite or any mineral
   on record at step 120 that the same run lacks as shipped.
3. *Released every step, the lead reaches the cells of runs that have no license to
   consult, and what grows there depends on the pocket.* In the starter fluid a galena
   grows to 8 to 10 mm, larger than the 5 mm the licensed scenario grows in a pocket held
   open. An action can stop it or forestall it: with a Drain or an Evaporate after step 60
   the galena of seed 42 stops at 0.63 mm, and with a Drain after step 30 no galena is born
   at any seed. In a Zen run of `radioactive_pegmatite` it reaches about half a millimetre
   and stores its last zone at step 198 to 202, which is where that pocket is full (it
   passes 0.7 at step 80 to 94 and is full at step 198 to 201), so the figure is a plugged
   pocket's. In a Zen run of `schneeberg`, whose pocket is 9 to 12 % full at step 600, four
   galenas are born at step 152 to 165 and are 21.5 to 22.5 mm and still growing at step
   600. That is the largest galena that radiogenic lead grows in any run of this review,
   and `schneeberg` licenses no lead mineral. (At seeds 1 and 2 that run also lacks the
   opal the shipped Zen run has on record.) In Random Vugg's two runs, whose draws hold no
   sulfur and no phosphorus, no lead mineral is on record under either timing.
4. *So the choice of timing is also a choice of whether Creative mode's starter fluid and
   Zen runs of the two uraninite scenarios grow a galena that no scenario licenses.*

Not run: any other way a Creative player has of oxidizing a pocket. A search of
`fortressStep` for writes of O2 finds, besides the two buttons, two actions that no button
of the page calls. `'oxidize'` (`:1812`) sets it to 1.8. `'copper'` (`:1806`) sets it to
0.3, and the uraninite engine alters a crystal of more than 3 µm whose σ is under 1 where
O2 is above 0.3 (`js/57-engines-oxide.ts:81`), so by that line a pocket this action has
just set is not altered and one a hair above it is. That is a value on an edge, of the kind §3.4 lists. The
live broth panel has an oxygen control
(`js/97-ui-fortress.ts:192`; `js/97a-ui-broth.ts:462`). That search is not a list of
everything that can raise O2 there. Nor were two actions made in one run. Nor was a run
built on Creative mode's setup panel, from the preset of this broth or with the panel's own
uranium slider (§3.3), at whatever temperature and in whatever cavity the panel holds. Nor
was a run of either uraninite scenario stopped short of the event that oxidizes it (step 80
and step 85; `data/scenarios.json5:2657`, `:2879`), as the form's Time Steps box and the
agent interface's `steps` allow (`index.html:3689`; `js/99z-agent-interface.ts:286`). The
agent interface builds the same simulator and steps it fewer times (`:297` to `:323`), and
in the full runs of `radioactive_pegmatite` no uraninite takes a negative zone before step
80 at any seed (`probe-lead-choices.txt`). In `schneeberg` the first is at step 88 at
seeds 42, 1 and 2, by the thirteenth review round's run, which is not committed. So held,
such a run of either scenario would release nothing, as the runs above that nothing
oxidizes release nothing. That is a reading.

The `nopb` arm of the A/B tool keeps the radiogenic lead out of every fluid, and shows what the
lead on the bulk handle does today. In the pocket as shipped plumbogummite is then born once at
each seed, where it is born 2 / 3 / 3 times with the lead, and it holds no solid either way. With
the pocket held open it is one crystal of 0.006 / 0.003 / 0.004 mm, where with the lead it is
three of 0.006 / 0.005 / 0.005 mm. `schneeberg`'s baseline summary does not change at any seed.
So what today's lead on the bulk handle buys is one or two extra births of plumbogummite, which
hold no solid in the pocket as shipped and a few micrometres in the open one.

Acceptance, under either timing unless said:

- The census controls `two-fluids` (positive) and `strangled` (positive) fail, and the same
  commit rewrites them. Under the held release `count` (positive) fails as well, and is rewritten
  with them. One more is expected to fail, at seed 2 only: the negative `starved` control
  reads `schneeberg`, where it stands 2 above its floor as shipped. The sixth review round ran
  census copies of its own with each timing installed and read 0 there, against a floor of 10
  (those copies are not committed here). Any other control that fails on the changed tree is a
  finding to explain, not a control to rewrite.
- Bulk Pb and voxel-mean Pb stay within 1 % of the field's scale of each other at every step in
  both uraninite scenarios (the bound the negative control puts on `mvt`'s Ca).
- The scenarios whose baseline changes are a subset of `radioactive_pegmatite` and `schneeberg`.
- In `radioactive_pegmatite` with the pocket held open (the `cap=8` arm on feldspar, albite and
  quartz, run on the changed tree), plumbogummite's largest crystal is 0.5 mm or more at seeds
  42, 1 and 2. Today's tree gives 0.005 to 0.006 mm under that arm and both previews give 0.69
  to 0.71 mm, with SC2 applied first as well as without it, so the line fails without the change,
  and a birth that never grows cannot meet it.
- The locality gate passes with no tier changed. In the pocket as shipped the continuous release
  makes no species appear or stop appearing (`probe-appearance-contract.txt`). Under either
  timing, in both scenarios and at all three seeds, no mineral has a crystal on record at run
  end in one run and not in the shipped one (`probe-lead-choices.txt`). (With the pocket held
  open autunite appears, which that scenario lists as aspirational: a ruling for whichever
  change opens that pocket, not for SC3.)
- The cation gate passes with five pharmacolite crystals, as today. Under the held release its
  share is restated as commissioned, if the fix ends the run with the lead released as the
  preview does. Under the continuous release a new share is commissioned (0.582009 by the
  preview).
- Expected collateral in `schneeberg`'s Simulation-mode run, so that a reviewer of the bump
  does not read it as a regression: both feldspars are named amazonite, their zones carry
  the note in the step log, and pharmacolite's largest crystal is about a quarter smaller at
  seeds 42 and 1 unless SC2 has landed. The simulator's own audits read as they do on the
  shipped run (event refusals, failed carbonate transactions and ledger violations, counted
  for both timings in `probe-lead-choices.txt`).
- *A report, not a test.* The bump says what its timing does where the game grows a
  uraninite with no event to alter it. By the preview, in Creative mode's starter fluid
  and in Zen runs of `radioactive_pegmatite` and `schneeberg`, each left to itself, the
  held release releases nothing and the run's summary is today's; the continuous release
  grows galena in all three.
- *A report for a reviewer to check, not a test that can fail.* Under the held release, the
  galena is gone from the scenario by a search of the tree, not
  by a list. The search is the one of §3.3: tracked files that name both the scenario and
  galena, leaving out `proposals/`, `archive/`, the committed baselines and what a build
  writes. The bump lists what the search returns and says of each file whether it ties the
  two, and where it does, that the tie is gone or why it stays. That takes in the scenario's
  entry and event file, the mineral data and the files generated from it, the test that
  counts the scenario among galena's six, the agent API's copy, and anything the search
  returns that §3.3 does not name. Lists of those places have come up short before (§9),
  which is why the line is a search.

### SC4 — give supply a scale above the cell (S1, S2, S3; the larger direction)

Not a fix; a pilot to decide on. Today supply acts at one scale, the cell, at a price the source
calls not physical. Over a run it regulates rate and rarely limits a total, though the cell's
own stock can set a crystal's size where little refills it, as Shigar's aquamarine showed in
July (§2.1). Three pieces would
give it the scales above, and each exists in part:

1. **A debit that scales with what is deposited.** A zone's cost becomes the volume it adds times a
   density over a formula mass, against the water its voxel holds, in place of a constant per
   micrometre. At that price the cavity's inventory matters: §2.6 has today's crystals holding up
   to thousands of cavity-volumes of their binding element. The census carries the first 60
   densities and compositions; the reservoir work of PRs #35–#39 and #42 carries the unit
   discipline.
2. **A feed.** Each step the voxel field relaxes toward a feed composition by a fraction set by
   `flow_rate`. With a physical debit a sealed pocket (`flow_rate` near 0) runs down what it holds,
   and a flushed one is held near its feed. Today nothing refills the field in proportion to
   flow, and nothing needs to.
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
closed-system story to earn, and after SC1 it has an open pocket to compare against.

Pre-registered acceptance for the pilot. Unless a line says otherwise, it is read on the
piloted scenario at seeds 42, 1 and 2, as Simulation mode starts it with its form at the
defaults: the scenario's own cavity and shape seed, and its own 230 steps.

- With the feed off and the price at today's constant, the piloted scenario reproduces the unpiloted
  run, and the fleet outside the flag is byte-identical.
- With the pilot on, the census's cavity-scale share (what the solids hold ÷ the most the field ever
  held, §2.1) passes 10 % for at least one formula ingredient of feldspar, albite or quartz, the
  minerals that hold the pocket's volume (K, Na, Al or SiO2; a trace solute does not count). The
  largest in `gem_pegmatite` today is potassium's 0.03 %, 2.4 voxels' worth.
- With the pilot on and SC1's bound lifted in the piloted scenario, the pocket does not plug: its
  fill stays under 0.7 for the whole run and no crystal reads "pocket full", and it stays under
  0.7 when the run is stepped on to twice its length, 460 steps. Both of those are horizons. A
  pilot that only slowed growth further would pass them: SC1's bound passes the first, and
  seals at step 304 to 306, on quartz (trap 22). The next line asks for more.
- It stops for want of supply. With the pilot on, the bound lifted, and the feed shut at the
  scenario's last step (`flow_rate` 0 from step 230 on), the fill at step 460 is no more than
  one percentage point above the fill at step 230. This line is read at a step as well, so
  it is not free of a horizon. What differs is what can pass it. A pilot that only slowed
  growth would have to slow it to under a point in 230 steps; under SC1's bound the fill
  adds 58 or 59 points in the 76 steps after step 230 (41 or 42 % there, 100 % by step
  306). A sealed pocket at a physical price can add only what its own fluid still holds. By
  the census's own row, the solids of today's full pocket hold 208 cavity-volumes of the
  broth's silica, 1,554 of its aluminium and 4,382 of its potassium (`census-seed-42.json`,
  the throughput rows; §2.6), so one cavity-volume of that broth is under half a percent of
  the cavity as solid. That is the claim SC4 makes for itself, that a phase stops for want
  of supply and needs no cap. The one point and the 230 steps are choices. (A line that
  asks the feldspar pair's pauses to read "its cell ran short" would not do: an engine
  linear in σ − 1 slows on a drawn-down cell and does not pause.)
- It does not starve. With the pilot on and the bound lifted, fed as the scenario's events
  author it, the run meets SC1's floors at seeds 42, 1 and 2: tourmaline ≥ 5 mm, topaz
  ≥ 1 mm, and no species that holds solid under SC1's bound is without it. No other line
  here asks for that. A pilot whose debit used up the potassium, the aluminium or the silica
  in its first steps would keep the fill under 0.7, could pass the cavity-scale share, and
  would pass the locality gate, which reads records and not solid (trap 14), and it would
  grow no gem. A pilot that fails this line has found a broth that cannot be read at face
  value. That is the pilot's first output, as said above, and it is not a pass. The floors
  are SC1's, and are choices. SC1's lines on quartz and on the pair are not carried over.
  How much quartz, feldspar and albite a pocket with a real supply leaves is one of the
  things the pilot is run to find out, so the pilot reports the largest of each at each
  seed, and a speck of one is a finding to explain and not a failure of this line.
- The locality gate passes on the piloted scenario. If SC1 has promoted topaz by then, topaz has
  to appear at all three of the gate's seeds with the bound lifted, or the pilot fails the gate
  for a reason that is its own.
- *A report, not a test.* The pilot is run once more with the bound lifted, in the 15 mm vug
  of Simulation mode's Cavity Size select, at the same seeds and for 230 steps, and says
  whether SC1's first acceptance line holds there. The line's clause on species is read as
  this review's probes read it in that vug: against the species that hold solid in the
  shipped run in the same cavity, and not in the scenario's own. Under a bound on the
  pair's rate the line does
  not hold: that vug is full at step 97 to 99, and at step 174 to 176 with the pair holding no
  solid (§4, SC1). SC4 is the one proposal here in whose design a cavity's volume enters,
  through the water each voxel holds, so this is the run in which a supply with a scale
  above the cell and a slower rate can be told apart. It is a report because nothing in
  this review previews it.

### SC5 — keep the census

Run `tools/sim-side-census.mjs` at each SIM bump, as `baseline-diff` is. It takes about 20 minutes
a seed and answers what the baselines cannot: not what grew, but what slowed it and why it
stopped. It is worth keeping only as far as its readings are guarded: the mutation tool runs with
it (12 minutes at its last run, 49 when other heavy work shared the machine), and a reading
without a control (§1 lists them) stays labelled as one.

## 5. Traps

1. **Do not fix F3 by debiting or re-syncing the bulk handle.** The bulk handle is deliberately not
   debited by growth (`js/85b`, the comment above `_wallStrangledFor`); nucleation reads it as the
   feed. The one field that does follow the voxels is deliberate too: under a carbonate boundary the
   bulk handle's CO3 and pH are set each step to the mean over the wet voxels (`js/85c`). F3 is one
   write to the bulk handle alone, not a reason to merge the two fluids.
2. **A feldspar clamp is a calibration constant, not physics.** It removes a runaway; it does not
   make feldspar stop for a reason, and no one value suits every scenario (§4, SC1). SC4 would.
3. **Bounding feldspar hands `radioactive_pegmatite`'s pocket to quartz.** It ends 98 % full
   with a 53 to 55 mm quartz.
4. **Boron is not the lever in `gem_pegmatite`.** Tourmaline's boron factor is at its cap before and
   after SC1 (§3.1). A residual-concentration test (WP8(b)) run on that tourmaline reads "no effect"
   whatever the mechanism does.
5. **Five controls sit on today's defects, and flip.** The commit that opens `gem_pegmatite`'s
   pocket for its run rewrites
   `space+end` (positive) and `time` (negative), which sit on that scenario. The one that cures
   F3 by carrying the lead to the voxels rewrites `two-fluids` (positive) and `strangled`
   (positive). `count` (positive) rests on galena being past σ_crit on the bulk handle and
   unlicensed. It flips if galena is licensed, and it flips if the lead is held until the
   uraninite is altered, because galena is then past σ_crit on no step at all (§4, SC3). Otherwise
   the census reports a regression that is the fix. Five more controls read `schneeberg`
   (`competition-log`, `draw-down-other`, the negative `starved`, `vadose` and `ring-means`),
   and SC2 and SC3 both change that run. This review has no instrument that runs the census
   under a change. The sixth review round built one for itself (not committed). Under SC2 its
   copy evaluated all five at seed 42 and four at seeds 1 and 2, and none flipped. Under SC3
   its copies evaluated four at each seed, and the negative `starved` flipped at seed 2, where
   it stands 2 above its floor as shipped (§4, SC3). The one left out is `competition-log`,
   which also needs `bisbee` and `porphyry`. The seventh round ran SC2 on three more
   scenarios at seeds 1 and 2 (not committed), and none flipped (§4, SC2). A control that sits that close to its floor on a scenario a proposed change
   reaches should be moved before that change lands.
6. **Beryl stays absent after SC1.** `gem_pegmatite` does not license it (§3.1). Do not count it
   against SC1.
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
    losing none (§4, SC1).
12. **Adding and then subtracting is not restoring.** (30 + a) − a need not be 30, and three σ
    functions here have an authored value sitting exactly on their threshold (§3.4). An arm, or a
    fix, that undoes a write has to put the old value back.
13. **Lead has to reach both fluids.** Births read the bulk handle and growth reads the cell
    (§2.3, §2.1). Lead on the bulk handle alone admits crystals that cannot grow, which is F3.
    Lead put into one cell changes no birth: a release into the uraninite's own cell, which the
    third version recommended, never reaches the fluid that births read (§4, SC3).
14. **A species that newly appears can fail the locality gate.** The gate holds each scenario to
    its tiers, and an aspirational species is one the scenario says it does not grow. A fix that
    makes one appear is doing what was hoped for and fails the gate until the tier is changed:
    topaz in `gem_pegmatite` under SC1, autunite in `radioactive_pegmatite` once its pocket stays
    open. The gate reads appearance, not solid, so it is silent about the opposite case, a
    species that is born and dissolves away (trap 11). It is silent about a stale rationale too:
    its test of a deterministic entry's rationale looks for five phrases, and topaz's "absent
    from the release seed audit" is not one of them.
15. **A number commissioned on the bulk handle follows the lead.** The cation gate reads
    calcium's share of six cations on `schneeberg`'s bulk handle, and lead is one of the six.
    Whatever changes the uraninites' size, how long they stay active or where their lead goes
    moves that share: SC2, the continuous release of SC3 and the general clamp of SC1 all do (§4).
    That is not the regression the gate was built to catch, and the gate cannot tell the
    difference. The bump has to commission the new number and say why it moved.
16. **SC2 and SC3 meet in `schneeberg`.** SC2 sets how much radiogenic lead there is, and SC3 where
    it goes. Pharmacolite's σ carries a factor of 1.3 while calcium's share on its cell is 0.6
    or more. At seed 42, with SC3 alone the share falls to 0.58 and the largest crystal ends at
    0.80 mm, not 1.09; with SC2 as well it is 0.63 and the crystal ends at 1.08 mm (§4, SC3).
    At seed 1 the share with both is 0.61, a hundredth above the step, so a small change to
    either could put it back under. Whichever of the two lands second has to be previewed on
    the tree the first leaves, and neither's acceptance should pin that crystal's size.
17. **A value has more than one reader, and they read at different grains. Search for reads
    of the field, not for the value's text.** The feldspar engine notes a zone as amazonite.
    The card names the whole crystal by any one noted zone; the Zone History bar colours each
    zone by its own note; the step log and five lists of zones print whatever note a zone
    carries; the cavity view's body colour does not read it at all (§4, SC3). The fifth
    version of this document counted millimetres, the sixth looked at the card and the seventh
    at the bar, and each called what it had looked at what the player sees. The seventh had
    searched for the word "amazonite", which cannot find a line that prints any note. List
    the readers by a search for reads of the field, run each through the game's own code, and
    say which were only read.
18. **A count of the places that say a thing is the first claim to go wrong.** This document
    has said that `radioactive_pegmatite` promises galena in two places, then in four, and both
    counts were short (§3.3). Give the list a search finds, say it is a list, and make the
    change's acceptance a search and not a tally.
19. **A bound carried on the scenario object goes only where that object goes, and the modes
    are not one simulator.** Zen mode rebuilds a scenario's conditions without the object, and
    runs at a fifth of the time scale. Random Vugg builds a fluid with no scenario at all. A
    scenario opened in Creative mode keeps the object and gains a carbonate boundary (§3.1;
    §4, SC1). The sixth version measured Zen at Simulation mode's clock and drew a conclusion
    from it that the right clock reverses. Before measuring a mode, read what its entry
    sets, what ends its runs, and every box on its form that reaches the constructor.
    Simulation mode's form has a Cavity Size select beside its Time Steps box. The seventh
    version of this document read neither and the eighth read one. Random Vugg's page has a
    size select of its own, which opens on a setting that draws the class, and the ninth
    version had run one class of its three.
20. **Shrinking a large crystal un-buries its neighbours.** `schneeberg`'s 27 mm feldspars
    enclose small sulfides and native elements, which keep their solid inside them, and two of
    the three uraninites, which stop writing lead once enclosed. A clamp that makes the
    feldspars 10 mm lets the first dissolve and the second go on writing to the end of the run
    (§4, SC1). A change to one mineral's size has to be read on what that mineral encloses.
21. **A floor passes a census that counts too many, and a negative at zero passes one that
    counts twice.** A control that asks for "at least" so much is seen to fail only by a mutant
    that makes the reading smaller. Six controls of this review were of that kind, and a copy
    of the census that over-counted three of their readings passed every control it was put
    to. The negatives added in answer catch a reading filed in the wrong class. They do not
    catch one that is doubled: the sixth round's copy counted three classes twice and passed
    all 35 controls. The same holds for the older pairs. The seventh round's copy over-read
    six older positives that sit beside a negative at zero, and passed all 35 again. (Neither
    copy is committed.) Nineteen
    of the twenty-four positive controls are open from above (§1). Only an exact control, or
    a band, closes a count from above.
22. **A bound on a rate buys steps, not an end. Read it at every run length and in every
    cavity the game allows.** Past the clamp a crystal grows by a constant each step for as
    long as the run goes on, and the pocket it grows into may be another size. Under the
    recommended bound `gem_pegmatite` is 41 to 42 % full at its last step, passes 0.7 full 28
    or 29 steps later and seals at step 305 or 306. In the smallest cavity Simulation mode
    offers it seals at step 97 to 99, inside the scenario's own length. Simulation mode's
    Time Steps box can lengthen a run, Creative mode has no last step, and Zen has no end.
    The seventh version of this document read the clamp at 230 steps and at 400, and wrote
    "cure" and "never fills". The eighth read it in one cavity. An acceptance line for such a
    bound has to be one that a loose value fails: the seventh version's line for Zen was met
    by a clamp of 95 (the seventh review round's run, not committed), and the eighth's is
    still met by one of 11, which the first line refuses. Give the horizon, and say what sets it. Here that is quartz in the scenario's
    own modes and the pair in Zen (§4, SC1). And before the value is blamed for a failure,
    run a tighter one. The ninth version saw the bound fail in the 15 mm vug and called it
    too loose for that cavity. With the pair holding no solid at all the vug seals at step
    174 to 176, on quartz and tourmaline: no value of the bound alone was there to find.
    The tenth version then wrote that no course would hold that vug either, having run each
    course alone. A pair of them does, at a price (§4, SC1). "Nothing does" is a claim
    about every run that was not made. Write what was run. The eleventh version said of
    that pair that the preview could not stand for its clamp, from a reading of the engine.
    Run beside a clamp written into the engine, the preview ends within a point of it and
    reaches the same verdict (§7). A preview that is doubted has to be run against the
    thing it stands for. The twelfth version then called the two forms "one run" at 2 and
    above, having compared their sizes and their fill. Compared zone by zone they differ in
    albite's trace Al. Say what was compared. That version also left SC2's preview, a
    wrapper of the same kind, unrun against its law; run, it parts from it in one scenario
    (§4, SC2). And its acceptance lines refused a bound that was too loose and none that
    was too tight: a clamp of 1, which leaves feldspars of 3.5 mm, met them all. A line for
    a bound has to fail on both sides of the value. The thirteenth version added a floor
    for the pair and wrote a rule for the value, "the loosest that keeps the pocket open
    for its run", with no value run between 7 and 11. Run at every whole value, the rule
    gives 9, and the lines admit 5 to 9. A rule for a value is a claim about the values
    between the ones that were run. And its probe for SC2 had not run the law. It took the
    preview's zones and refused them where a reading of the engines said the engine would.
    An emulation built from a reading is still the reading. The engine now computes the
    law itself, and made that way two more pairs part, by rounding alone. The fourteenth
    version reported that parting, wrote that its cause "was not traced", and bounded it
    all the same: "at three times the constant". Traced, the cause is an enclosure that a
    layer of 10⁻¹¹ µm licenses in a full pocket, and it decides the shipped run of that
    scenario at the same two seeds (§3.4). An effect whose cause is not known has no
    boundary to state. That version also wrote the range, 5 to 9, from runs in the
    scenario's own cavity, when the value it widened, 7, had been held to ten other shape
    seeds. At those ten, 9 fails at two (§4, SC1). A range for a value is read wherever the
    value was read. The fifteenth version then counted how far that enclosure reaches in
    each scenario's own cavity, and wrote the count as the fleet's. In the form's 15 mm
    vug the layer is in another scenario at all three seeds, and four nudges move 51 runs
    where in the own cavities they move 11 (§3.4). A count is of the cavities it was made
    in, which is this trap's own title. That version also read zeros under four factors as
    absences, and twelve factors find what the four miss. The sixteenth version counted
    what such a zone decides through the host of an enclosure, when the function that
    reads the host reads the guest's zones too, and at that vug the guest's side decides
    more (§3.4). A test reads everything it reads: count each. It also set two runs'
    crystals side by side by their place in a list, which names two different crystals
    once the runs have parted, and it read "no gap" from bins when all of one bin sat at
    its bottom. Pair things by what they are, and look inside a bin before saying what
    lies between two of them.
23. **One scenario has no pocket to fill.** `great_salt_plains` authors an open system, and
    the step reads its fill as 0: it is never dampened for fill and never sealed
    (`js/85-simulator.ts:501`). `get_vug_fill` still returns its crystals' volume over the
    wall's capacity, so a count of pockets taken from that number takes the plain for a
    full one as soon as its crystals outgrow the wall, which at the form's vug setting they
    do 27 to 29 times over. The census leaves an open system out of "pocket full"
    (`tools/sim-side-census.mjs:890`). The fleet probe of the eleventh version did not, and
    its headline count was one too high. Count a pocket as full by the fill the step reads.

## 6. Decisions for the boss

1. **SC1: whether to bound the feldspar pair now, where the bound lives, its value, and topaz's
   tier.** Recommended: a clamp on the rate authored on `gem_pegmatite` alone, at E = 7. It
   changes one baseline and leaves every other scenario as it is, Shigar's 270 mm albite and
   `radioactive_pegmatite`'s plug included. It is a calibration constant on one scenario, and SC4
   is what would remove the need for it. It comes with a ruling: topaz, aspirational in that
   scenario today, appears at all three of the locality gate's seeds, so the bump has to promote
   it and rewrite its rationale, and a promoted topaz binds later changes.

   The value is a choice inside a range. In the scenario's own cavity the acceptance lines
   of §4 are met by every whole value from 5 to 9, and they pick none. At 5 the pocket has
   37 or 38 steps to spare after its 230 and its largest feldspar is 17 mm; at 9 it has
   three to five steps and a feldspar of 31 mm, close to the 32 to 37 mm the feldspar
   reaches as shipped; the tourmaline, the topaz and the quartz are the same from 5 to 9.
   The top of that range does not hold in every cavity of that size. The form's Shape Seed
   box draws another shape, and at ten shape seeds, whose cavities hold 63 to 78 cm³ where
   the scenario's own holds 69, the values 5 to 8 meet the lines at all ten, with 13 to 26
   steps to spare at 8. At 9 the pocket passes 0.7 full three steps inside the run in the
   two smallest of the ten. The acceptance as written is read at the scenario's own shape
   seed, so it passes any whole value from 5 to 9, and it asks a bump only to report the
   read at the ten. Seven is the value this review previewed everywhere else, with 28 or
   29 steps to spare, and 24 to 33 at the ten shape seeds, and is what it recommends.
   Another value of the range is the owner's to take. Its previews at the form's other
   cavity sizes, in Zen and stepped on would then have to be made, and 9 would not pass a
   line read at those shape seeds (§4, SC1).

   It also has a horizon and a reach to decide. A bound on a rate buys steps, not an end.
   Authored on the scenario, it keeps the pocket under 0.7 full through the scenario's own
   230 steps where Simulation mode, Quick Play and Creative mode start it, with 27 to 29
   steps to spare. A run that goes on, by the Steps box or by a player pressing Wait in
   Creative mode, which is where the Scenarios menu opens a scenario, seals at step 304 to
   306. Quartz does that. A bound on the pair seven times tighter passes 0.7 only 15 steps
   later and seals 4 or 5 steps later, so the margin is not E's to widen.

   All of that is in the scenario's own cavity. Simulation mode's form lets a player pick
   another. In its 15 mm vug the bounded
   pocket is full at step 97 to 99, with tourmaline at 5 mm and next to no topaz, and the
   first acceptance line fails; in its two larger cavities the line is met. Another value
   alone does not mend the vug: with the pair holding no solid at all, quartz and
   tourmaline fill it by step 174 to 176. Nor does another course alone: the fill switch,
   the rind and the change to the broth each leave it past 0.7 full by step 93 at the
   latest. Of the eight pairs of those changes that were run, one keeps that vug under 0.7:
   the changed broth with the pair's rate clamped at 1, with the clamp made by the
   preview's wrapper or written inside the engine (at 1.5 and at 2 the line fails at two
   seeds of three). Its price is the pocket's quartz, which is left one crystal of 0.01 mm,
   and in the scenario's own cavity a pocket 1 to 2 % full. It also leaves the pair at 3.4
   to 3.5 mm of feldspar and 4.5 to 4.6 mm of albite. So it fails two of the lines §4 sets
   for the recommended bump, the floor for quartz and the floor for the pair, and a bump
   that took this course would need acceptance lines of its own. That vug is hard on the
   fleet as well. One of the 41 scenarios is authored as an open surface, with no pocket to
   fill. Of the other 40, as shipped, 15 / 16 / 15 are full in that vug inside their own length, where
   three are in their own cavities (§3.1; §4, SC1). The recommendation does not hold that
   size. What could be done about it includes these, and the list is open: accept it, as
   one more of the pockets that fill at that setting today; take that pair, at its price;
   leave it to SC4, the one proposal here in whose design a cavity's volume enters, which
   has no preview and whose pilot is asked to report on this vug; or treat it as a matter
   of the form, which offers a 15 mm cavity to every scenario. I would accept it in SC1's
   bump and put the question to SC4's pilot. That second half hangs on decision 4: if no
   pilot is built, the course is to accept it and nothing more. Whether an open
   pocket for the authored run in the authored cavity is enough is the question.

   The bound does not reach a Zen run of the same scenario, which plugs at step 32 or 33 on
   Zen's slower clock, unless the bump carries it there. Carried there it would hold the
   fill under 0.7 for 1,850 to 2,100 steps, which is about half an hour at Zen's default
   speed. And it
   does not reach Random Vugg's pegmatite archetype, where the owner first reported the
   plug: three of eight cavities of its pocket size class fill, all eight of its vug class,
   and four of eight at the size setting its page opens on. (Zen mode drops the scenario
   object whole, its exclusions included: an emerald appears in its `gem_pegmatite`. That is
   decision 8.)

   The alternatives are the same clamp written into the two engines
   for every scenario, which reaches all of those and slows the pair in each that was run
   (in Random Vugg's vug class six cavities of eight still fill under it, and five with the
   pair holding no solid),
   changes eight baselines, empties Shigar's pocket and
   leaves `schneeberg` without solid of three of the species it expects at seed 1 and two at
   seed 2; the fill switch the tree already has, which keeps the pocket open at five seeds of
   eleven; a change to the scenario's broth, which costs the pocket its quartz; the rind; or no
   bound, with F1 left for SC4. Every one that opens the pocket needs the same ruling on topaz.
   Factor caps and the per-factor root are refused by the preview. The owner's directive of
   2026-05-06, "when in doubt, defer to the actual geology", took a cap on a crystal's size out
   of the simulator. Whether a bound on a rate falls under it is the owner's to say (§4, SC1).
2. **SC2's constant:** keep each k and let galena shrink where its fluid is barely saturated, or
   re-fit k at one reference scenario. And whether the galena of `reactive_wall` and
   `sunnyside_american_tunnel` should then be grown by a sourced change to the fluid or accepted
   small. Unless the constant leaves `schneeberg`'s uraninites exactly as they are, the lead they
   write changes with them and the bump commissions a new share for the cation gate (§4, SC2).
3. **SC3: whether to land it before `radioactive_pegmatite`'s pocket stays open; when the lead
   is released; and with that the scenario's promise of galena.** Recommended timing: hold the
   lead until a uraninite is altered, release it to the bulk handle and the voxels alike, and
   take the galena out of the scenario's own texts (the description, the notes, and the
   step-100 narration in `js/70d`, which is code), because under that timing no license can
   produce it. Other places name galena for the scenario too, and the bump finds them by
   search (§3.3). It is what the sources describe, it gives plumbogummite exactly what a
   continuous release gives it, and in the preview it leaves the cation gate's two numbers as
   commissioned. It adds one field to the simulator; saves replay a run and need no new
   field (as after any SIM bump, a save made before it no longer replays).
   The other coherent pair keeps today's timing and licenses galena, with a source: galena then
   grows to 5 mm in an open pocket, born before any uraninite is altered. Licensing galena on
   today's tree, or with the held release, produces none. The two timings also part where
   the game grows a uraninite with no event to alter it: in Creative mode's starter fluid
   of this broth and in Zen runs of the two uraninite scenarios, none of which has a
   license. Left to itself such a run does not alter its uraninite, so the held release
   releases nothing and the run is the one it is today; a Drain or an Evaporate by the
   player in Creative mode alters the uraninite and releases what is held by then. The
   continuous release grows galena in all three: 8 to 10 mm in the starter fluid, about
   half a millimetre in a Zen run of this scenario, whose pocket is full by step 200, and
   21 to 23 mm in a Zen run of `schneeberg`, which licenses no lead mineral and whose
   pocket stays open. Under either pair `schneeberg`'s two
   largest crystals are named amazonite where they are named microcline today, and the cavity
   view draws them as before. In the scenario's Simulation-mode run its pharmacolite also
   loses a quarter of its size unless SC2 has landed. (Opened from the Scenarios menu, which
   starts it in Creative mode, that scenario has no pharmacolite on record as shipped, by the
   seventh review round's run, which is not committed; the renaming carries over there. This
   review did not run it.)
   `radioactive_pegmatite` shows nothing until its pocket stays open. So SC3 changes what one
   scenario's cards and logs say at once and pays back in another only later, and whether to
   wait for that is part of the decision (§4, SC3).
4. **SC4:** whether to pilot it, and who owns it. It overlaps the reservoir arc of PRs #35–#39 and
   #42, and one finding should have one owner. A no here takes one course off decision 1's
   list for the 15 mm vug, the one that leaves it to the pilot, and it cuts this review's
   own pick there down to accepting that vug. The list's other courses stand as they are.
5. **SC5:** whether the census, with its mutation tool, joins the SIM-bump routine.
6. **Order against the open ladders.** My proposal: SC1 first, because it is the one change that
   gives `gem_pegmatite` back seven of its eight events and grows four of its species to
   millimetres (tourmaline, topaz, spodumene, lepidolite); SC2 as a rung of its own beside the
   recipe review's R2 → R9; SC3 last of the three. It waits on nothing, and it is a small
   change to the simulator, but under the timing recommended it also changes what the scenario
   says of itself, in data and in code. It shows in `radioactive_pegmatite` only
   once that pocket stays open, which needs its quartz dealt with (trap 3), and it renames
   `schneeberg`'s feldspars at once (decision 3). SC2 and SC3 both reach the two uraninite
   scenarios, so the second of them to land is previewed on the tree the first leaves
   (trap 16). SC4 after the ruling on 4.
   Story-pocket WP8(b) waits on none of them, and should not be tested on `gem_pegmatite`'s
   tourmaline (trap 4).
7. **Three authored values on an edge, and two outcomes that rounding picks (§3.4).** Whether the step-160 seal of
   `supergene_oxidation` is meant to leave the wall cells below azurite's redox minimum while the
   bulk handle sits on it, which starts four azurites of 2.5 to 3.3 mm dissolving and stops six
   arsenates; and whether `radioactive_pegmatite`'s broth Pb of 30 and `schneeberg`'s pH of 6.0
   are meant to sit exactly on a threshold. Nothing is proposed for them here. The data review
   of July found a fourth of the kind, `chiastolite_hornfels`'s sodium on albite's floor, and the
   fleet has not been scanned for more. And what a full pocket should hand the next
   crystal. Today the growth loop lets a crystal through at any fill under 1 and cuts its
   zone to the room left, down to 10⁻¹² µm or to nothing, and the crystal stores it. Such
   a zone licenses its crystal to enclose a neighbour, since any layer above zero does,
   and it counts among a guest's last three zones, by which a guest reads as slowing. In
   the scenarios' own cavities it decides something in `radioactive_pegmatite` at seeds 1
   and 2, through the host: how long the uraninites are altered, and with that their size
   and the lead they write. At the vug setting of Simulation mode's form it decides 35 of
   the 1,285 enclosures of the shipped runs, in four scenarios: 18 through the host's
   layer, with eleven enclosures on such a layer at step 160 of seed 2 in
   `supergene_oxidation`, the step of the seal this decision began with, and 24 through
   the guest's zones, seven of them through both. Four nudges of a part in 10¹³ or less
   move 51 of 492 runs there, in nine scenarios. In the eight whose pocket fills, every
   run that moves parts from the shipped one on a step at which the loop handed out its
   last room: 23 in a crystal's size alone, 8 in an enclosure by the host's layer, 20 in
   one by the guest's zones, and 2 in one that a residue withheld. They end up to hundreds
   of micrometres apart in the crystals the two runs share: in `bisbee` at seed 42 a
   turquoise ends at 477 µm or at 15. A floor on the host's layer has room in both
   settings, since in the own cavities nothing lies between the residues and 0.13 µm, and
   at the vug nothing between them and 4 × 10⁻⁵ µm; it would leave the guest's side and
   the sizes as they are. The host's test, the guest's tests and the loop that stores the
   zone are the three places a remedy could go, and only the loop comes before all of
   them. And whether the weathering epilogue
   should choose between two precursors that have released
   the same amount by the fourteenth digit of a sum, as it does today, or by the crystal
   id, which is its last key and was reached in no run made here: in `wittichen` at seed
   42, the baseline's seed, that digit decides which skutterudite the erythrite encloses
   and whether a safflorite ends at 572 µm or at 8.5. The id would leave that choice as it
   is and turn seed 2's. Neither a floor nor a tolerance was previewed, and nothing is
   proposed for either.
8. **Zen mode, as this review met it.** Three things, none of which this review set out to
   examine, and nothing is proposed for them here. A Zen run of a scenario leaves the
   scenario object behind, and with it the license, the exclusions, the nucleation windows,
   the movements and the weathering epilogue: an emerald is on record in its
   `gem_pegmatite` at
   every seed run, and that scenario excludes emerald by name (§3.1). Without their
   weathering epilogues, which ride on the scenario object, `naica_geothermal` and
   `wittichen` never put up the envelope under which their births read the wall cells in
   their own runs, so births read the bulk handle in 39 of Zen's 41 simulators (§3.3). Of Zen's drift, the writes to the species and to pH stay on
   that handle and reach no crystal in the three simulators read, which is F3's defect at
   the scale of a mode; the temperature write is undone by the next step; and the pressure
   write does reach a crystal whose σ reads pressure, as the calcite of a Zen run of `mvt`
   shows (§3.3). What the drift does to a run's births was not measured. And the changes proposed
   here each do something of their own there: SC1's bound does not reach a Zen run unless
   the bump carries it (decision 1), SC3's held release released nothing in the Zen runs
   made, of the two scenarios whose Zen simulators grow a uraninite, and its continuous
   release grew a galena in both that no scenario licensed, of 21 to 23 mm in `schneeberg`
   (decision 3). Whether Zen is
   meant to run a scenario this way is the owner's to say. If it is not, that is work of
   its own, and one finding should have one owner.

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
  that value exactly (trap 12). The neutral setting `refund=0` does not exercise that step, and
  nothing self-checks it. `rclamp`, like the rate clamp of every probe here but one, is a
  wrapper round the engine: σ is read before the engine runs, the engine runs as shipped, and a positive
  zone it returns is rescaled by E/(σ − 1) where σ − 1 is above E. The σ method is left
  alone. SC1 recommends the clamp written inside the engine, where the five tests the two
  engines make on their own rates would be made on the clamped rate: each that its rate is
  0.1 or more, each for a habit, and feldspar for an inclusion roll
  (`js/59-engines-silicate.ts:221`, `:245`, `:293`, `:349`, `:358`). Albite's engine uses
  its rate once more after those tests. It debits Na, Al and SiO2 by it and then records
  the zone's trace Al from the aluminium that is left (`:370` to `:372`, `:377`). The
  simulator throws the three debits away, because they are albite's ledger species
  (`js/85b-simulator-nucleate.ts:103` to `:161`, `:211`), and the zone keeps the trace.
  `probe-clamp-in-engine.txt` makes both runs side by side, in 40 pairs. At each
  value of 2 or more that was run (2, 3, 7 and 11) the two have the same sizes and the same
  fill in all 22 pairs: the same baseline-style summary and a fill that agrees after every
  step to within 2.3e-16 of the cavity. That is what "the same sizes and fill" means
  wherever this document says it of two forms, and it is a coarse test: the summary holds
  each mineral's count and its largest crystal, so two runs can pass it and differ in a
  smaller crystal or in the lead on the bulk handle. `radioactive_pegmatite` as shipped at
  seed 2 shows it. Of nine nudged copies of that run whose lead differs from its own,
  six have its summary (`probe-enclosure-floor.txt`). The comparison of records, which
  follows, is what catches such a difference. The recommended bound in the scenario's own cavity
  is among them, stepped on to the seal, and so are `schneeberg` and `tormiq_alpine_cleft`
  under the general clamp and two of Random Vugg's small pockets. The records of those 22
  pairs were then compared crystal by crystal, zone by zone and log line by log line, each
  number to a billionth of itself. Of 84,244 zones, 6,908 albite zones differ in their
  trace Al, by 13.8 % of the larger value at most, in the 20 pairs that have an albite,
  and the value is the higher with the clamp in the engine on every one. The same zones
  differ in their record of the engine's own debits, which the simulator does not apply.
  The step log prints a zone's trace Al where it is above 1 ppm
  (`js/27-geometry-crystal.ts:539`), and 3,522 of its 86,229 lines differ, in 10 pairs.
  One pair has four differences more, all at step 98 of the form's vug at seed 42, the
  last step on which anything grows in that vug, which is 99.9 % full from step 97
  (`probe-pegmatite-reach.txt`). One
  albite zone of 9e-12 µm differs there in its thickness, in what is left of it and in its
  booked inventory, and a tourmaline stores one more zone, of 2e-11 µm, under the wrapper.
  Zones of that size are what the last room of a full cavity comes to on crystals of
  millimetres (§3.4).
  No crystal's size or habit differs in any pair, and no field of a crystal other than
  its zones. A run made twice differs in nothing. So a bump that writes the clamp into the
  engine reproduces the preview's sizes, fills and summaries, and records more trace Al
  on albite than the preview does. That is collateral to expect of the bump, and not a
  fault in it. A search finds these places that read a zone's trace Al. Five print or store
  the number: the step log, the zone modal (`js/97d-ui-zone-modal.ts:264`, `:309`), the
  Groove view's axis and text (`js/98-ui-groove.ts:29`, `:192`, `:651`, `:682`, `:697`,
  `:748`), the collection, which checks the field on import and saves it
  (`js/93-ui-collection.ts:109`, `:298`), and the agent interface's zone dump
  (`js/99z-agent-interface.ts:223`). The body-colour rules can read it by name
  (`js/12a-colour-lexicon.ts:133`). Two lines read it into a variable that nothing uses
  (`js/12-mineral-art.ts:58`, `js/98c-ui-zone-bars.ts:194`). The thirteenth review round
  read an albite's name, colour and bars in two of the pairs and found none changed (its
  run, not committed), so what a player would see differently is the number where it is
  printed. Where the clamp is active feldspar's clamped rate is
  at least 2.1·E and albite's 3.2·E, so every value of the A/B outputs (3 to 47) is on that
  side. Below 2 (1.5, 1 and 0 were run) the two are different runs in all 18 pairs. At 1 a
  clamp in the engine puts feldspar's rate under the 4 at which it rolls for an inclusion,
  and at 1.5 it does so on part of the run; under the wrapper the roll is made as shipped.
  At 0 the engine returns nothing,
  where under the wrapper it runs as shipped. They end within 0.65 of a point of fill,
  pass 0.7 within 10 steps of each other and fill within 3, and SC1's first acceptance line
  has the same verdict under both in all 18 pairs. So the wrapper's arms at 1.5 and at 1,
  in `probe-clamp-horizon.mjs` and in the 15 mm vug of `probe-pegmatite-reach.mjs`, stand
  for a clamp in the engine to within those margins. Its arms at 0, in that vug and in
  Random Vugg's vug class, show a cavity without the pair. `rind` drops
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
  `pb` and `nopb` have no neutral setting to self-check against. `excess` is a wrapper of the
  same kind as `rclamp`: the engine runs as shipped and a positive zone it returns is
  rescaled by m·(σ − 1)/σ. SC2 would write the law inside the three engines, where the one
  test each makes on its own rate, that it is 0.1 or more, would be made on the new rate
  (`js/61-engines-sulfide.ts:391`, `:415`; `js/57-engines-oxide.ts:95`). By a reading of
  the three, none draws a random number after that test or uses its rate for anything but
  the zone's thickness and growth rate, so the law in the engine should give the wrapper's
  zone, or none where the rescaled thickness is under 0.1 µm. `probe-excess-in-engine.txt`
  does not rest on that reading. Each engine reads σ into a local, tests it against 1 and
  uses it once more, in its rate. For the length of an engine's call the probe has the σ
  method return an object that reads as σ the first time it is used as a number and as
  m·(σ − 1) the second, so the engine's own statements compute the law and make their own
  test on it. The probe throws if an engine uses σ any other number of times, and none
  did. That is an engine's code with one operand changed from outside. It is not an edited
  engine, which a bump would be. In 43 of the 48 pairs the two forms have the same sizes
  and the same fill, and their records were then compared as SC1's were. In 42 of the 43
  no field of a crystal or a zone and no line of the step log differs. The other is
  `roughten_gill` at seed 1 under three times the constant, whose pocket first reads full
  at step 59 (`probe-enclosure-floor-sc2.txt`) and ends 99.9 % full:
  a chalcocite zone of 10⁻⁹ µm at step 59, a galena's extra zone of 10⁻¹¹ µm at that
  step, and the solid left of two zones that had dissolved away, 2 × 10⁻¹⁴ and
  6 × 10⁻¹³ µm. Five
  pairs part. Three are `sunnyside_american_tunnel`'s, on six refused calls, and one of
  those is a different run. Two are `radioactive_pegmatite`'s at three times the constant,
  where nothing is refused and the two forms differ by rounding alone. In that scenario
  at seeds 1 and 2 an enclosure on a layer of 10⁻¹¹ µm decides how long the uraninites
  are altered, as shipped and under either constant (§3.4). A nudge of one part in 10^15
  to the wrapper's own zones moves its run too: at seed 1 onto the engine's run, and at
  seed 2 onto a third, which ends farther from the wrapper's than the engine's does (§4,
  SC2). Against the shipped run the two forms move, lose and gain the same species in all
  48, which at that scenario's seed 2 is true of the two forms and not of a run a
  rounding away. How a bump spells the law could matter to those last places as well. The
  fourteenth review round took two spellings a bump could use, the constant as one number
  times (σ − 1)·1000·u and a thousand times that constant times (σ − 1)·u, and set each of
  the uraninite engine's zones to what the spelling computes from that call's σ and its
  random draw. In that scenario, at the three seeds and both constants, each gave the
  probe's engine form at every step (its run, not committed). `held` is an arm of three
  probes (`probe-lead-choices`, `probe-cation-gate`, `probe-appearance-windows`) and not of the
  A/B tool. It keeps the block's increments in one store for all the uraninites
  and releases the store, to the bulk handle and to every voxel, on the next step on which any
  of them takes a negative zone.
- **What the A/B tool calls present.** A species is present while one of its crystals has solid
  left, and a mineral whose crystals all dissolved away or never grew is listed apart as a record
  (trap 11). The "moved" test is coarse on purpose: a change of count, or of the largest crystal
  by a factor of more than 1.25. The stricter line the tool prints, whether the baseline's
  summary would differ, is the one a SIM bump is held to. The tool calls a crystal solid when
  its `total_growth_um` is above zero; the simulator's own flag draws the line at 10⁻⁹ µm
  (`js/27-geometry-crystal.ts:469`). No species in the committed outputs sits between the two:
  the smallest largest-crystal on file is 0.24 µm. The locality gate asks a third question,
  whether a crystal of the species ever existed (trap 14), and `probe-appearance-contract.mjs`
  answers it from the records left at run end, which misses a mineral whose every crystal was
  transformed into another.
- **What an arm may break.** An arm can move a run by tripping one of the simulator's own audits
  (trap 10). The A/B tool therefore counts, for every run, the step-log lines in which a CO2 or
  carbonate event of `js/70l` says it was paused or refused, the failed transactions of the
  carbonate boundary and the entries of the three violation ledgers, and flags an arm whose
  counts differ from the shipped arm's. (The sabkha events of `js/70k` say "carbonate transaction
  BLOCKED" in their own words, which the line count does not match; a blocked transaction is a
  failed one, and the second count has it.) No
  arm run in the committed outputs is flagged (`probe-ab-digest.txt` lists every file). The tool
  also reports the steps on which the wall's dissolution was withheld as too small to resolve.
  That is a notice and not a failure, and it follows how much of the wall the crystals cover: it
  falls under `refund` in `bisbee` and `supergene_oxidation`, whose pockets fill, and shifts by
  one to five steps in four other arm runs. The comparison covers the audits named here. It does
  not show that an arm has no other side effect.
- **The gates were read against the changes, not run on them.** §4 holds each proposed change
  to the twelve steps of the full suite that precede the tests. For the two that commission an
  outcome, the locality gate and the cation gate, probes make the gate's own readings under
  each previewed arm (`probe-appearance-contract.mjs` and `probe-appearance-windows.mjs` for
  the first, `probe-cation-gate.mjs` for the second). The windows probe reads a first
  appearance as the gate's three-seed panel does. The claim card takes the first appearance
  from the nucleation events of the recorder behind the game's strip view, and no probe here
  reproduces that reading. The gate also fails,
  run as a check, on a product that no tier and no exclusion of its scenario names. The
  contract probe looks for one among the records at run end, under every arm, and finds none.
  For the other
  ten the statement rests on the tool's source. No gate was run on a changed tree, because no
  tree here is changed. The tests were not read against any change. Of the 303 test files, 19
  name `gem_pegmatite`, 85 name one of the eight scenarios SC2 moves, and 20 name
  `radioactive_pegmatite` or `schneeberg`; which of them pin a number that would move was not
  checked. One test was read, because the search for galena returned it: it stands at its
  floor, and SC2 and SC3 both bear on it (§3.3; §4). The ninth review round went further,
  in runs that are not committed. It copied the assertions of seven of the nineteen files
  that name `gem_pegmatite` and ran them on that scenario under SC1's preview, at seed 42
  for all but one, and all passed. It found a second test at its floor:
  `tests-js/o3-selection.test.ts:153` asks that `gem_pegmatite` bury at least one crystal
  when crystal selection is on, and it buries exactly one today, a spodumene (fourteen
  under the preview). And it found a test that pins a burial in `schneeberg`
  (`tests-js/bismuth-morphology.test.ts:122`; §4, SC1). The other twelve files were not
  read.
- **One mode, one clock, one cavity.** Every run in this review is a scenario as Simulation
  mode starts it with its form at the defaults (the scenario's own cavity, shape seed and
  length), at that mode's time scale of 5. The exceptions are these, and each says so where
  it stands: the runs of §3.1's last part (`gem_pegmatite`, Random Vugg's pegmatite
  archetype, Creative mode's "Radioactive Pegmatite" starter fluid, and every scenario at
  the form's vug setting); the horizon and cavity tables of §4 (`gem_pegmatite`); the lead
  timings of §3.3 and §4 in that starter fluid, in Zen runs of `radioactive_pegmatite` and
  `schneeberg` and in Random Vugg's archetype; the Zen simulators of three scenarios on
  which §3.3 reads the drift; and Zen's simulators of all 41, stepped without the drift at
  seed 42, in which §3.3 counts the nucleation envelope and the uraninites. The game's other modes
  differ in what this review found by reading their entry points: Zen sets the time scale to
  1 and leaves the scenario object and the events behind; a scenario opened in Creative mode
  gains a carbonate boundary; Random Vugg and the Creative starter fluids have no scenario
  object. Apart from those exceptions, nothing in §2, §3.2, §3.3 or §3.4 was measured in
  those modes, and no claim is made for them there. The sixth review round reports that a scenario opened in Creative mode can
  differ widely from its Simulation-mode run (in `schneeberg`, 21 of 30 baseline rows at seed
  42; not committed). That was not run here beyond `gem_pegmatite`.
- **Where a change reaches.** SC1's reach was read on the eight places the page's code
  constructs a simulator (§4, SC1). A pegmatite's fluid was run through four of them
  besides the baseline's own: Creative mode's scenario constructor, its starter-fluid
  constructor, Zen's constructor and Random Vugg's builder. Zen was stepped at its own time
  scale: by `run_step` alone, without its drift, and by the game's own loop with it. How long
  the bound holds was read on `gem_pegmatite` alone, at three seeds: to the seal in
  Simulation and Creative mode, and to 2,400 steps in Zen, where every seed had passed 0.7
  and none had sealed. It was not read for Random Vugg, for the starter fluid, for any other course
  under SC1, or for the general clamp in the other twelve scenarios that grow the pair.
  Random Vugg was run at each of its page's four size settings, on one archetype and eight
  seeds, and in the 23 pockets under 40 mm that seeds 1 to 400 draw, for the length its
  builder drew; its other archetypes were not run. The
  form's Cavity Size and Shape Seed boxes were read for SC1 on `gem_pegmatite` and for
  nothing else, and one box at a time, with the others at their defaults. Tighter values
  of the bound were run in the form's vug and in no other cavity but the scenario's own.
  SC1's other courses were run in that vug one at a time, and eight pairs of changes
  together; one of those pairs was run in the scenario's own cavity, and no pair in any
  other. Every scenario was run as shipped at the form's vug setting, and at no other of
  its settings. No scenario but `gem_pegmatite`
  was run at another length, and neither SC2 nor SC3 was previewed in another cavity or
  at another length. What a player's own actions in Creative mode do to a bounded pocket (heating,
  cooling, injecting) was not run. A
  custom Creative run and the agent interface's headless run were read, not run. SC2 and
  SC3 are written into engines or the simulator's step, which every mode shares. For SC2
  the question of what it does in another mode was not asked. SC3's two timings were run
  in Creative mode's "Radioactive Pegmatite" starter fluid, left to itself and with one
  action (a Drain after step 60 or after step 30, or an Evaporate after step 60); in Zen
  runs of `radioactive_pegmatite` and `schneeberg`; and in two runs of Random Vugg's
  pegmatite archetype (§4, SC3). They were not run in a scenario opened in Creative mode,
  in a run built on Creative mode's setup panel, under two actions, or under any other
  action of a player. The agent API is a
  second copy of the engines; it was read where §3.3 and §4 say so and not run.
- **Which readers were followed.** For the lead that SC2 and SC3 move, the readers followed
  are the σ functions, through the species tables; the cation gate's share; the radiation
  dose; and four readers of the amazonite note (§4, SC3). The name and colour of every
  mineral's crystals were compared with the shipped run in `schneeberg` at seed 42. The four
  readers of the note were run in both uraninite scenarios at all three seeds: three on each
  feldspar, and the step log's lines for feldspar zones. They were found by two searches,
  the second for reads of a zone's `note`. Five places that print a zone's note were read and
  not run. The rest of what a run narrates was not compared, no other zone note was followed,
  and a reader both searches missed is not covered. All of it is the scenario's
  Simulation-mode run.
- **The mutation tool judges one control per mutant.** It runs a mutant on the scenarios its
  control needs and reads that control. It does not report what else the mutant breaks, and a
  control that fails for another reason than its label would still count as caught. Nineteen
  of the twenty-four positive controls are guarded on one side only (§1): ten floors with no
  negative beside them, and nine beside a negative that catches a misfiling and not a
  multiple.
- **The census cannot be run under a proposed change.** Which controls a change flips is a
  prediction here (trap 5), except where the sixth and seventh review rounds' own copies of
  the census are cited. Those copies are not committed.
- **Not examined:** whether the bulk-only `concentration` of `sabkha_dolomitization` matters beyond
  the license check of §3.3; the carbonate and sulfate solubility kernels, the thermal field,
  physical dissolution, the cavity geometry, the renderer, the agent API; and what else a Zen
  run does differently for having no scenario object, beyond the one excluded species seen in
  §3.1, and whether that mode is meant to run without one.
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
node tools/sim-side-census-mutations.mjs             # 12 min at its last run; 49 when other heavy work shared the machine
node tools/rate-at-saturation-census.mjs             # a few minutes
node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/2026-11-04/v286
node tools/c1-depletion-ev-probe.mjs --seed 42       # the repository's own probe of 2026-07-07, unchanged (§2.1)

node tools/sim-side-ab.mjs --arm refund=1 --seeds 42 <all 41 scenarios>      # and --seeds 1, --seeds 2: three files
node tools/sim-side-ab.mjs --arm rind=5000 --arm cap=8 --arm rclamp=7 --seeds 42,1,2 gem_pegmatite radioactive_pegmatite shigar_pegmatite
node tools/sim-side-ab.mjs --arm fcap=2 --arm root=3 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm mul=B:10 --arm mul=B:0.5 --arm mul=B:0.25 --arm cap=8,mul=B:10 --arm cap=8,mul=B:0.5 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm cap=8 --arm rclamp=7 --arm fcap=2 --arm root=3 --seeds 42,1,2 bisbee chiastolite_hornfels deccan_zeolite epithermal_telluride gem_pegmatite grimsel_alpine_cleft jeffrey_mine ouro_preto porphyry radioactive_pegmatite schneeberg shigar_pegmatite tormiq_alpine_cleft
node tools/sim-side-ab.mjs --arm rclamp=3 --arm rclamp=7 --arm rclamp=11 --arm rclamp=15 --arm rclamp=23 --arm rclamp=47 --arm cap=4 --arm cap=8 --arm cap=12 --arm cap=16 --arm cap=24 --arm cap=48 --seeds 42,1,2 gem_pegmatite
node tools/sim-side-ab.mjs --arm rclamp=11 --arm rclamp=23 --arm rclamp=47 --seeds 42,1,2 <the same 13 scenarios>
node tools/sim-side-ab.mjs --arm rind=5000 --seeds 42,1,2 <the same 13 scenarios>
node tools/sim-side-ab.mjs --arm mul=SiO2:0.1,mul=Al:0.15 --arm mul=SiO2:0.15,mul=Al:0.15 --seeds 42,1,2 gem_pegmatite
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
node proposals/evidence/sim-side-2026-11-09/probe-lead-choices.mjs   # both uraninite scenarios; then the starter fluid (left to itself and with one action), Random Vugg, and Zen runs of the two by the game's own loop; 52 min at its last run, with three or four other probes on the machine
node proposals/evidence/sim-side-2026-11-09/probe-cation-gate.mjs    # schneeberg: eight runs at seed 42, four each at seeds 1 and 2
node proposals/evidence/sim-side-2026-11-09/probe-enclosed-survivors.mjs
node proposals/evidence/sim-side-2026-11-09/probe-pegmatite-reach.mjs       # gem_pegmatite at eleven seeds; Random Vugg at its four size settings; Creative (scenario and starter); Zen at its own time scale; Simulation mode's Cavity Size and Shape Seed boxes, and its vug under tighter bounds, under SC1's other courses and under pairs of them; 30 min at its last run, with one or two other probes on the machine, and 40 at the one before, with three or four
node proposals/evidence/sim-side-2026-11-09/probe-clamp-horizon.mjs         # gem_pegmatite under the bound, stepped past its 230 steps: Simulation, Creative, and Zen by the game's own loop; 30 min at its last run, 53 at the one before; run it after probe-pegmatite-reach.mjs
node proposals/evidence/sim-side-2026-11-09/probe-clamp-in-engine.mjs       # the wrapper that previews the clamp beside a clamp written inside the engine, 40 pairs of runs, sizes and fill and then the records; 30 min at its last run, with two other probes on the machine, and 13 to 18 before
node proposals/evidence/sim-side-2026-11-09/probe-clamp-value.mjs           # SC1's three acceptance lines at every whole clamp value from 3 to 11, and the two ends of the range they admit at eight further seeds; 14 min at its last run and 25 at the one before, each with two or three other probes on the machine
node proposals/evidence/sim-side-2026-11-09/probe-clamp-value.mjs --shape-seeds   # the five values those lines admit, at ten other shape seeds of the scenario's cavity; 16 min, with two or three other probes on the machine
node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs       # radioactive_pegmatite: the host layer of each uraninite's enclosure, then twelve nudges of the run as shipped and under SC2's preview at both constants; 18 min, beside the two runs below
node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs --sc2     # the other seven scenarios SC2 moves under four of the nudges, each scenario in a process of its own, the seven side by side; 26 min, beside the runs above and below
node proposals/evidence/sim-side-2026-11-09/probe-enclosure-floor.mjs --fleet   # every scenario as shipped at three seeds: the enclosures on a host layer under 10^-6 µm; 40 min, 26 of them beside the two runs above
node proposals/evidence/sim-side-2026-11-09/probe-rounding-reach.mjs        # every scenario as shipped at three seeds, with every mineral's zones nudged four ways; the scenarios in processes of their own, six at a time; 40 min
node proposals/evidence/sim-side-2026-11-09/probe-rounding-detail.mjs       # what differs in the three pairs of runs that probe finds outside radioactive_pegmatite, what wittichen's epilogue has to choose between at each seed, and the shells each candidate's release came off; 4 min, beside three other probes
node proposals/evidence/sim-side-2026-11-09/probe-rounding-twelve.mjs       # twelve factors on every engine where that probe applies four, in radioactive_pegmatite and wittichen, each scenario-seed in a process of its own; 8 min, beside the two runs below
node proposals/evidence/sim-side-2026-11-09/probe-last-room.mjs             # every scenario as shipped at three seeds: the host's layer in every enclosure, and the loop's fill when it was accepted; six processes at a time; 18 min, beside the run below and the two above
node proposals/evidence/sim-side-2026-11-09/probe-last-room.mjs --vug       # the same at the form's 15 mm vug, and there four nudges of every engine's zones; six processes at a time; 43 min, 18 of them beside the run above
node proposals/evidence/sim-side-2026-11-09/probe-last-room-routes.mjs      # every scenario as shipped at three seeds: every zone the loop accepts in the last room, and the enclosures such a zone decides through the host's layer or the guest's last three zones; six processes at a time; 21 min, beside the run below and, for 9 of them, the parting probe
node proposals/evidence/sim-side-2026-11-09/probe-last-room-routes.mjs --vug  # the same at the form's 15 mm vug; 20 min, beside the run above (13 and 12 min at an earlier run of the two side by side)
node proposals/evidence/sim-side-2026-11-09/probe-vug-parting.mjs           # the nine scenarios that run finds a nudge to move, made again with every crystal kept at every step: where each nudged run parts from the shipped one, what differs there, how far apart they end, and how often a full pocket hands out its last room at all; six processes at a time; 18 min, 9 of them beside the two runs above
node proposals/evidence/sim-side-2026-11-09/probe-bound-nudge.mjs           # gem_pegmatite under SC1's bound, in its own cavity and the form's vug, with twelve nudges of every engine's zones; each cavity and seed in a process of its own; 8 min, beside three other probes
node proposals/evidence/sim-side-2026-11-09/probe-excess-in-engine.mjs      # the wrapper that previews SC2 beside the law computed by the three engines themselves, 48 pairs of runs, sizes and fill and then the records; 21 min at its last run, alone, and 42 with two other probes on the machine
node proposals/evidence/sim-side-2026-11-09/probe-form-vug-fleet.mjs        # every scenario at the form's vug setting and in its own cavity, three seeds; 44 min at its last run, with three or four other probes on the machine
node proposals/evidence/sim-side-2026-11-09/probe-zen-drift.mjs             # which of Zen's drift writes reach a crystal's own cell, then each of the 41 scenarios in Zen's own simulator; about 7 min
node proposals/evidence/sim-side-2026-11-09/probe-appearance-windows.mjs    # bisbee, porphyry, roughten_gill under each change that reaches them; about 7 min
node proposals/evidence/sim-side-2026-11-09/probe-appearance-contract.mjs   # reads the committed A/B outputs and the scenarios' tiers
node proposals/evidence/sim-side-2026-11-09/probe-ab-digest.mjs      # reads the committed A/B outputs and census reports; runs nothing

npm run audit:runtime          # the twelve steps of `npm run ci` that precede the tests, in its order
npm run typecheck
npm run build:check
npm run audit:tutorials
npm run audit:a11y
npm run audit:scenarios
npm run audit:release
npm run audit:creative
npm run audit:cations
npm run audit:bif
npm run audit:science
npm run audit:localities
npm run audit:evidence         # not a step of `npm run ci`
```

The five tools write only under `.local-evidence/`, the directory the test identity guard excludes.
They exit 0 whatever their readings and controls say; they throw on a bad argument, and the
mutation tool throws if a mutant no longer matches the census. The twenty-six probes print and
write nothing. Four of them call functions of the game's own page code that change the
page's state.
`probe-pegmatite-reach.mjs` calls four: Zen mode's constructor, with the clock held still for
the length of the call; the two Creative constructors; and the mode switch, once for each of
four modes, to read the time scale it leaves. It also builds runs through Simulation mode's
command runtime, with the overrides that mode's form builds; the form itself is not driven.
For one control it reads a committed A/B output, `ab-gem-broth.json`.
`probe-clamp-horizon.mjs` calls Zen's
constructor and the Creative scenario constructor the same way, and drives Zen's own loop:
the mode switch into Zen, then the page's play, pause and step functions, and its stop and
scenario-pick functions to end a run. It puts a scenario picker on the harness's page for the
play function to read, since that page has none. `probe-lead-choices.mjs` calls Creative
mode's starter-fluid constructor and two of that mode's actions (`fortressStep('drain')`
and `fortressStep('evaporate')`), and drives Zen's loop the same way, in its last part.
`probe-zen-drift.mjs` calls Zen's constructor, for three scenarios and then for all 41.
These calls change the page's state in
memory (a visible simulator, a strip recorder, an autosave record) and write no file. Each
of the four probes ends with the time scale read back at 5 and the baseline reproduced.
`probe-form-vug-fleet.mjs` builds every one of its runs through Simulation mode's command
runtime, as Part 4 of `probe-pegmatite-reach.mjs` does, and compares each scenario's
seed-42 run in its own cavity with the baseline. `probe-clamp-in-engine.mjs` builds its
runs through the scenarios' factories and Random Vugg's builder, and one control run
through that command runtime. For the length of one engine call at a time it replaces a σ
method on the run's conditions, and puts it back when the call returns.
`probe-clamp-value.mjs` does the same, in `gem_pegmatite`'s own cavity, and with
`--shape-seeds` in that cavity built from the scenario's factory with another shape seed
on the wall.
`probe-excess-in-engine.mjs` builds its runs through the scenarios' factories and wraps the
three engines for the length of a run. Under its second form it also replaces a σ method
for the length of each engine call, with one that returns an object in place of a number
(§7), and puts it back when the call returns. It reads one committed A/B
output, `ab-rate-on-excess.json`, for a control. `probe-enclosure-floor.mjs` builds its
runs the same way and wraps the same three engines. What it reads of an enclosure is the
receipt the simulator keeps for it. With `--sc2` it starts seven processes of itself, one
for each scenario, runs them side by side and prints their reports in a fixed order.
`probe-rounding-reach.mjs` wraps every growth engine for the length of a run, and starts a
process of itself for each of the 41 scenarios, six at a time. `probe-rounding-detail.mjs`
wraps the engines the same way and reads the returned inventory on a crystal's negative
zones, the number each positive zone booked per micrometre when it grew, and the
simulator's receipt for a weathering precursor, and
`probe-rounding-twelve.mjs` reads the first and the last of those, with a process of
itself for each of six
scenario-seeds. `probe-last-room.mjs` builds every run through Simulation mode's command
runtime, as `probe-form-vug-fleet.mjs` does, with the form's override for the vug under
`--vug`, and starts a process of itself for each scenario, six at a time. On each
simulator it builds it puts a wrapper on two of the simulator's own methods, the one
that returns the fill to the growth loop and the one that debits a zone's growth budget,
to read the first's last return when the second is called. The wrappers return what the
shipped methods return, and at seed 42 the probe makes each scenario's run without them
and holds the two to the same last binary place. Under `--vug` it has no baseline to
compare with. Its default mode, which is the same code but for the override, reproduces
the baseline for all 41 scenarios. `probe-last-room-routes.mjs` builds its runs the
same way in both modes and puts the same two wrappers on each simulator. After every
step it reads the zone list of each crystal that step enclosed, and it holds what it
reads to the simulator's own receipt. Its default mode reproduces the baseline for all
41 scenarios, and the enclosures it counts are the ones `probe-last-room.txt` and
`probe-last-room-vug.txt` count, scenario by scenario. `probe-vug-parting.mjs` builds
its runs as the `--vug` mode does, with the same two wrappers and the same four
factors, for nine scenarios. It keeps every crystal's size, active flag and host at
every step, every call the loop makes on a zone, and the simulator's receipts, and for
four runs it asks the simulator's wall for the distance between two crystals' anchors.
It has no baseline either; the runs it finds to differ at the end are the ones
`probe-last-room-vug.txt` lists, scenario by scenario and seed by seed.
`probe-bound-nudge.mjs` builds its runs through the same command runtime. It writes the
clamp inside the two engines as `probe-clamp-in-engine.mjs` does, by replacing a σ
method for the length of each engine call, and wraps every engine for the nudge. With
the clamp at Infinity its seed-42 run in the scenario's own cavity reproduces the
baseline, and without a nudge its readings are the ones `probe-clamp-in-engine.txt`
prints for the clamp in the engine. `probe-zen-drift.mjs`
reads one committed census report, `census-seed-42.json`, for a control.
Two probes also call functions of the page that only read a crystal: `probe-lead-choices.mjs`
(`crystalDisplayName`, `crystalColor`, `groupZonesByChemistry`, `resolveBodyColour`,
`_bodyFieldVal`) and `probe-cation-gate.mjs` (the first two, and the page's function for
calcium's share of the cations that compete for arsenate). The
outputs quoted in this document are committed in
`proposals/evidence/sim-side-2026-11-09/`, and the README there gives the exact command behind each
file, the 41 scenario names of the `refund` runs included. The three census reports and the
mutation report each name the sha256 of `tools/sim-side-census.mjs` as it ran, and it is the
committed file's. A census row is cached under a digest that includes the seed and the text of
the code that produces the row, so a row cannot outlive a change to that code or be handed to
another seed. The digest does not cover the rest of the file: the controls and the report are
recomputed from the rows on every run. The A/B outputs carry no such digest. Every one of them
was produced by the code of `tools/sim-side-ab.mjs` as it stands at commit `0b243e32`: all but
two in one re-run after the last change to what the tool does, and the two batches the fourth
review round asked for (`ab-rind-13-scenarios`, `ab-gem-broth`) afterwards. Later commits change
only comment lines of that file, which `git diff 0b243e32 HEAD -- tools/sim-side-ab.mjs` shows.

Four probes had comment lines edited after the run that made their committed output:
`probe-clamp-horizon.mjs`, `probe-form-vug-fleet.mjs`, `probe-lead-choices.mjs` and
`probe-rounding-reach.mjs`. Nothing
but comment lines was changed in them. The script that assembles this folder holds each to
a copy saved before the edit, comment lines apart. Those copies are not committed, so that
the code of these four is the code that ran rests on that check and on this sentence.

The twelve steps of `npm run ci` that precede the tests pass on this tree, and so does
`npm run audit:evidence`. They read the tree as it is and say nothing about the changes proposed
here; §4 says what each change would do to three of them. **The full suite** (`npm run ci` with
its tests, two hours and more on this machine) is not part of this commit's evidence, and
it has not been run on this tip. It was last run two commits back, on `db5dd3df`, and
passed: 303 test files in 303 batches, one uninterrupted pass under
`node tools/cold-ci.mjs`, in 9,501 s on a machine that other work shared. It passed the
same way on `c08c9d47`, in 7,955 s. Both are local results, and a comment on the pull
request gives each in full. This commit and the one before it, `72c6d7a8`, change files
under `proposals/` only. The
suite is to be run again on the final tip of the branch, and its verdict recorded in
another comment there. The repository's chip
selector (`tools/test-chip-check.mjs`) has none of this change's paths in its authored map, so it
offers no bounded test set for it; its own answer for such a change is a full check. No file the
suite reads is changed, and no test was added.

## 9. Corrections to earlier versions

Each version of this document has been reviewed, and each review found statements that were
wrong. They are listed here in full, oldest first, so that a reader of an earlier version can see
what changed and why.

**Corrections to the first reading.** A first reading was given in conversation on 2026-11-09, before
the instruments existed. Three of its statements are superseded here.

- It said supply had shaped 321 of 78,431 zones, 313 of them gold tellurides. That counted a zone
  twice when it was both rationed and budget-cut. The count is 275, of which 268 are the two gold
  tellurides (§2.1).
- It put 174 of 183 engines on σ − 1, from a reading of the source text. The engine probe reads 171
  whose rate vanishes at saturation, 3 whose rate does not, and 9 it cannot drive (§3.2).
- It recommended factor caps for the feldspar pair. The A/B refused that shape (§4, SC1), and the
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
- SC1's clamp was said to move seven scenarios and lose nothing. It shrinks the feldspar pair
  wherever their σ passes the clamp: `tormiq_alpine_cleft`'s albite from 66 to 27 mm,
  `schneeberg`'s feldspar from 28 to 10 mm, Shigar's albite from 270 to 10 mm. §4 tabulates that,
  and previews the clamp on the rate, which is the shape recommended; the first two versions
  previewed a clamp on σ. (The third version still said the clamp loses no species. It does; see
  below.)
- SC3 had no preview. The third version added one, and both the preview and the mechanism it was
  attached to were wrong (below).
- SC4's third acceptance line was posed on pauses, which an engine linear in σ − 1 does not take.
  It is restated (§4, SC4).
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
  expects. The same reading corrects what was said of the root, of factor caps and of SC2's larger
  constant (§4). The tool now reports presence as solid left, and says for every arm whether the
  scenario's baseline would differ.
- The cost given for SC3 was an artefact. The `nopb` arm took the radiogenic lead off the bulk
  handle by subtracting it again; (30 + a) − a came out a rounding error under 30, and
  plumbogummite's σ is zero below 30. With the value restored exactly the mineral is not lost
  (§3.3, §3.4).
- SC3's recommended mechanism could not have worked. Lead returned to the uraninite's own cell
  never reaches the bulk handle, and births read the bulk handle. SC3 is now the write that was
  previewed, with its timing left as a choice (§4, SC3).
- SC1 recommended one clamp for every scenario and named a bound on `gem_pegmatite` alone as a
  fallback, with no mechanism and no cost. The scoped bound is now the recommendation, and the
  general clamp's cost is set out beside it (§4, SC1; §6).
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

**Corrections to the fourth version** (commit `4d1e5340`). Its fourth review round found the
numbers and source references right, and one recommendation that could not land as costed.

- SC1 was costed as "one baseline changes". The recommended bound makes topaz appear in
  `gem_pegmatite` at seeds 42, 1 and 2, and topaz is an aspirational species there. The
  repository's locality gate, a step of the full suite, fails on an aspirational species that
  appears. So the bump needs a ruling on topaz's tier, and that ruling is now in the cost, the
  acceptance and §6 (§4, SC1).
- The review round checked one step of the full suite against the recommendations. The same
  question was then put to the other eleven, and two more answers were missing. SC2 shrinks the
  uraninites, their radiogenic lead falls with them, and the cation gate commissions a share in
  `schneeberg` that follows that lead; the continuous release of SC3 moves it too, and the held
  release does not. And the field SC1 authors on `gem_pegmatite` needs a class in the Creative
  lever audit. Both are now in §4, with a probe for the first.
- No version cited the earlier work in this repository that the findings rest on. The nature
  roadmap's rung C1 had shown in July that the growth rate reads the crystal's own cell, and
  that a third of the crystals grow on a cell well off the bulk fluid. The first version's
  headline, that supply does not bind, contradicted a measurement already in the tree. The
  high-fill research had both pegmatites sealing early in May. The data review of July had
  called `gem_pegmatite`'s events decorative for its births, and had judged galena the wrong
  lead mineral for `radioactive_pegmatite`; the Wise review of August had noted that the
  scenario narrates a galena it does not expect. Each is now cited where it applies (§0, §2.1,
  §2.2, §3.1, §3.2, §3.3, §3.4, and the list after the references).
- The proposed changes were labelled C1 to C5, which are that roadmap's rung names, and its C1
  is the nearest relative of this review. They are SC1 to SC5 from this version on, in the
  document, the banner, the ledger and the probes.
- SC3 left two choices to the owner as independent and unpreviewed: when the lead is released, and
  whether galena is licensed. They are coupled. If the lead is held until a uraninite is altered,
  galena is never past its threshold on the bulk handle, so a license could not be used. Every
  combination is now run, and the recommendation is the held release with the galena sentences
  dropped (§4, SC3).
- SC1's options left out a change to the scenario's fluid, and did not say why the rind was not
  carried forward. Both are now in the comparison with their costs (§4, SC1).
- Several readings quoted here had no control and were not listed as such, one of them the count
  of crystals grown mostly on a drawn-down cell in the S1 row. Six controls were added, each with
  a mutant (§1).
- "9 of 40 without the feldspar pair" described a bound on the pair in every scenario. Under the
  bound that is recommended, on `gem_pegmatite` alone, the count is 12 / 10 / 10 (§2.1).
- The general clamp's cost in `schneeberg` was given as species lost. At seed 42 none is lost and
  several shrink to almost nothing. And a species that loses its solid is still on record, so the
  locality gate does not see the loss (§4, SC1).
- SC3 carries lead into the cells that `schneeberg`'s feldspar grows from, and the feldspar engine
  notes a zone as amazonite when its cell holds lead. Two thirds of that feldspar's zones change
  their note under a continuous release, and under half under the held one (§4, SC3). Lead in
  the cells also takes a factor of 1.3 from `schneeberg`'s pharmacolite, which is why that
  species was among the ones moved.
- "Nothing feeds the field from outside except the events and movements" left out the wall, which
  releases its ions as it dissolves, and the carbonate boundary (§2.1).
- Smaller: a crystal that never grew counts as surviving; `schneeberg`'s radiogenic lead also takes
  duftite past its threshold; the sabkha events narrate a blocked carbonate transaction in other
  words than the ones the A/B tool looks for; the galena promise is one sentence of the
  description and one of the notes; the cause given for `schneeberg`'s losses rested on an
  uncommitted probe, and is now committed.

**Corrections to the fifth version** (commit `5e584b75`). Its fifth review round found the
numbers and the source references right. It found two statements wrong in what the owner is
asked to decide for SC3, one earlier mechanism misreported, and earlier work still uncited.

- The galena that `radioactive_pegmatite` promises was counted in two places, the description
  and the notes. It is in four: the narration of the step-100 event, which is code, and the
  agent API's copy of that narration as well. The fourth round had raised the count, and this
  document had answered by repeating it. The sixth version named all four. (Four was short
  too, and the fourth of them was misread; see the next list.)
- The held release was preferred in part because it notes 2 mm of `schneeberg`'s feldspar as
  amazonite where the continuous release notes 15. The game names a crystal by any one noted
  zone, so either timing renames both feldspars at every seed. The reason was withdrawn, and
  the renaming became a cost of SC3 under either timing. (The sixth version went further and
  said the two timings look the same. They do not, wherever the game shows a crystal zone by
  zone; see the next two lists.)
- §2.2 said the per-cell fill proposal of the high-fill research "was deferred". It shipped at
  v77, as a switch on a scenario's wall that no scenario sets. It is now a course under SC1,
  tried at eleven seeds and not recommended: it keeps `gem_pegmatite`'s pocket open at five of
  them (§4, SC1).
- Four more pieces of earlier work were uncited: the wallet law of 2026-07-08, which states
  for one crystal what S1 measures across the fleet; the additive broadcast established at
  SIM 220; the owner's report of 2026-05-06 of a pegmatite feldspar filling its vug, with the
  cap of v59 that v61 removed on the owner's directive; and the note of 2026-07-07 that
  `flow_rate` already carries a signal. Each is cited where it applies (§0, §2.1, §2.5, §3.1,
  §3.3, §3.4; §4, SC1).
- Where SC1's bound reaches was not said. Carried on the scenario object it does not reach
  Random Vugg's pegmatite archetype, the mode of the owner's first report, where three pockets
  of eight fill completely. The same question put to the game's other entry points found that
  Zen mode leaves the scenario object behind, and that a Creative starter fluid carries one of
  these broths (§3.1; §4, SC1; trap 19).
- The six controls added in the fourth round were floors, and a copy of the census that
  over-counted three of their readings passed every control it was put to. One count is now
  exact, three readings have a negative control, one is held to a band, and five mutants that
  over-count were added. Ten older positive controls remain floors and are listed as such
  (§1; trap 21). (Sixteen older ones are open from above, not ten; see the list after next.)
- The locality gate was described by its tiers alone. It also holds first-appearance windows,
  tests the wording of a deterministic rationale, and fails on a product no tier names. The
  windows are now previewed by a probe of their own, and none is violated. The wording test
  would not catch topaz's stale rationale, which the bump has to rewrite by hand (§4).
- SC3 was called small. The sixth version answered that the held release changes four
  statements and adds state that a save has to carry. Both halves of that answer were wrong
  in their own ways (the next list).
- Consequence 5 of SC3 and trap 16 were stated at seed 42 only. At seed 1 the share with both
  changes is 0.61, a hundredth above the step; seed 2 grows no pharmacolite.
- Smaller: the amazonite test is at line 304 of the feldspar engine; the chiastolite item sits
  in the July review's refuted bucket; under the general clamp `schneeberg`'s uraninites write
  lead for longer because the feldspars no longer enclose them, which had been left untraced;
  one of the seven un-buried crystals is never born; the cation gate also holds zero-zinc
  checks and two floors, which no preview trips; Shigar carries a guided tutorial; the held
  arm's audit counts are now printed; SC2 lowers `schneeberg`'s radiation dose as well as its
  lead; and "dry run", "time scale" and "reference" are defined.

**Corrections to the sixth version** (commit `e5e3f1b6`). Its sixth review round found the
numbers, the source references and the instruments right again, and SC1's and SC2's
recommendations standing. It found four statements wrong in what the owner is asked to act
on. All four were in text written to answer the fifth round, and three were the corrections
to that round's own findings.

- Zen mode was measured on another mode's clock. The game sets the time scale to 1 on
  entering Zen and to 5 elsewhere, and the probe ran Zen's simulator at 5. At Zen's own scale
  a Zen run of `gem_pegmatite` is full at step 31 / 33 / 33, not 9 / 10 / 10, and the general
  clamp keeps it open, where the sixth version had it failing at two seeds of three. ("Keeps
  it open" was a 400-step look at a mode with no end; see the next list.) The Zen
  runs of the other two pegmatites are withdrawn. The probe now sets Zen's scale, prints what
  the game's own mode switch leaves it at, and runs the two Creative constructors themselves
  (§3.1; §4, SC1; trap 19).
- The galena was counted in four places and the count was still short: the mineral data lists
  the scenario under galena, which the Library shows, and its audit summary names it. And one
  of the four, the agent API's copy, is in a runtime where the promise can be kept, since
  that runtime has one fluid and no license. (That was shown in a preset game, not in the
  scenario; see the next list.) §3.3 now gives what a search of the scenario's
  own entry and event file finds, lists the rest as found by search, and gives no total;
  SC3's acceptance is a search (trap 18).
- "Either timing turns `schneeberg`'s feldspars green" generalised from one reader of the
  amazonite note. The card's name and colour change under either timing. The crystal drawn in
  the cavity does not change under either. The Zone History bar shows 28 % of each feldspar
  in green under the continuous release and 4 % under the held one, so the difference the
  fifth version counted is drawn by the game, in one view. Three readers are now run
  (§4, SC3; trap 17). (Not in one view; see the next list.)
- "A save has to carry the held lead" was wrong. A save is a recipe that is replayed, and the
  replay fingerprint is a check, which does not list that block's radiation dose today. The
  acceptance line built on it could not have failed, and is removed (§4, SC3; §6).
- A scenario opened in Creative mode was called the scenario's own run. That constructor adds
  a carbonate boundary the scenario does not author, and the run differs from the baseline's.
  For `gem_pegmatite` the plug and the cure both hold there, which is now measured (§3.1;
  §4, SC1; §7). (The bound holds there for the scenario's 230 steps, and Creative mode has
  no last step; see the next list.)
- "Five of the six controls are closed from above" overstated three. A negative control at
  zero catches a misfiling and not a multiple, and the round's census copy that counts three
  classes twice passed all 35 controls. The text now says so, and no control was added
  (§1; trap 21).
- SC3's acceptance missed a control. Under either lead timing the negative `starved` control
  fails at seed 2, where it stood 2 above its floor. It is now named, with the round's own
  census copies as its source (§4, SC3; trap 5).
- Smaller: the time scale is applied in a run at `js/85b-simulator-nucleate.ts:1382`; v59
  capped length at the cavity's radius and width at its diameter, and the renderer's clip is
  commit `4fb128f`, not v60; the starter-fluid constructor does run under the harness, and
  the probe now calls it; `held` is an arm of three probes; under the recommended clamp
  albite ends larger than as shipped, which §4 had not said; a field under the scenario's
  wall would reach Zen, a third place the bound could live; the dose has more readers than
  the two named; and "agent interface", "agent API" and "claim card" are defined.

**Corrections to the seventh version** (commits `9e8540b1` and `b36dff13`). Its seventh review
round found the sixth round's eight findings fixed, and the numbers, the source references
and the instruments right again. It found two statements wrong in what the owner is asked to
decide. Both were written to answer the sixth round.

- A bound on a rate was read at one run length and called a cure. With the clamp, Zen's
  pocket was said never to fill, on a look of 400 steps at a mode that has no end. By the
  game's own loop it passes 0.7 full at step 1872 / 1849 / 2104, which is about half an hour
  at Zen's default speed. The scenario was said to be cured where Simulation mode and Creative mode
  start it. Stepped on past its 230 steps the bounded pocket passes 0.7 full 27 to 29 steps
  later and seals at step 304 to 306, and Creative mode, where the Scenarios menu opens a
  scenario, has no last step. What seals it is quartz, so a tighter bound does not widen the
  margin. §4 now gives the horizon in each mode from a probe of its own, decision 1 puts it
  to the owner, and the bound is no longer called a cure (§0; §3.1; §4, SC1; §6; trap 22).
- The acceptance line for Zen could not fail on a pocket that was nearly full. It asked that
  the pocket not reach 0.999 in 230 steps, which a clamp of 95 meets. It is now a bar of the
  kind the first line uses, fill under 0.7 through step 1,150 in the game's own Zen loop, and
  it is seen to fail at a clamp of 23 (§4, SC1).
- "The two timings differ in one view" was false. The list of readers came from a search for
  the note's text, which cannot find a line that prints whatever note a zone carries. The
  step log prints the note on the line of every zone of more than 0.5 µm, 213 lines against
  144, and five lists of zones print it as well. The fifth, sixth and seventh versions each
  took the readers they had found for all of them. The list is now taken by a search for
  reads of the field, the step log is run, and the text says where the timings differ:
  wherever the game shows a crystal zone by zone (§4, SC3; trap 17).
- Nineteen positive controls are guarded on one side, not thirteen. Six older positives sit
  beside a negative that reads zero, which passes a doubled reading. The round's copy of the
  census over-read all six and passed all 35 controls. No control was added (§1; §7; trap 21).
- The agent API was misattributed. The sixth round ran its CLI's `radioactive` fluid preset,
  not the scenario, and the copy of the step-100 narration sits in a scenario function that
  no CLI command runs. What was shown there is that the lead reaches a galena in a preset
  game (§3.3).
- SC2's acceptance named no census control. None is expected to flip, by the sixth and
  seventh rounds' own copies of the census, and the `pause` reading under SC2 is now given
  (§4, SC2).
- Two numbers were given without their scope. The Zen plug at "step 31 to 33" was three seeds
  without Zen's drift; the game's own loop is now run, and gives 32 / 33 / 32. "Its
  pharmacolite loses a quarter" is `schneeberg`'s Simulation-mode run; opened from the
  Scenarios menu that scenario has no pharmacolite on record as shipped, by the round's run
  (§3.1; §6).
- The fill switch was said to need no new field. It is a wall field with no class in the
  Creative lever audit, which fails on one, and so is a bound carried under the wall
  (§4, SC1).
- Smaller: the banner and the ledger said the bound reaches the scenario in three modes "and
  nowhere else", against the agent interface's headless run, which keeps the scenario object;
  `probe-lead-choices` takes about 6 minutes, not 8; the repeat control on the Zen runs showed
  that a run repeats, and the new probe makes the same runs before any other constructor is
  called and finds their lines, character for character, in the committed output; SC3's
  acceptance search now names the audit summary and the agent API; the cavity view's body
  colour has a second reason not to change; the Record Player also sets the time scale to 1;
  and "scenario object", "Zen's drift" and "size class" are defined.

**Corrections to the eighth version** (commit `50913722`). Its eighth review round found the
seventh round's findings fixed, and re-drove the new probe's Simulation and Zen arms to the
same numbers. It found one statement wrong in what the owner is asked to decide, of the same
family as the round before.

- The bound was read in one cavity. "Keeps the pocket open through the scenario's 230 steps
  where Simulation mode starts it" is true of the scenario's own cavity. Simulation mode's
  form has a Cavity Size select beside its Time Steps box, and Quick Play runs with whatever
  it holds. In its 15 mm vug the bounded pocket is full at step 97 to 99 and the first
  acceptance line fails; in its two larger cavities the line is met. As shipped, the 1.65 m
  cave grows the gems with no bound, beside half-metre feldspars. The form's Cavity Size and
  Shape Seed boxes are now run, through the game's command runtime (§0; §3.1; §4, SC1; §6;
  traps 19 and 22).
- The step log was counted as the simulator returns it. Simulation mode prints a step's
  lines on every fifth step and on a step with an event, a nucleation or a wall line:
  103 / 100 / 92 of
  the 213 / 214 / 214 lines, and 74 / 74 / 64 of the 144. The difference between the timings
  holds in both counts, and both are now given (§4, SC3).
- The acceptance line for Zen is weaker than the first line: a clamp of 11, which the first
  line refuses, meets it. The text now says so, and says what the line is for. The probe's
  shipped arm now reads the line on a changed tree, where before it stopped at 200 steps
  (§4, SC1).
- "Never" and "cured" were left standing in §3.1. The A/B table's "never" was a run of 230
  steps, and Shigar was called cured of a plug when it ends 92 % full.
- SC4's third acceptance line was read at one run length, which a pilot that only slowed
  growth would pass. It now asks for twice the length as well (§4, SC4).
- Statements that rest on a review round's own run said so in three places of twelve. §1 now
  says what such evidence is, and each place says "not committed". One of the twelve is now
  this review's own measurement: the trace lead that the cavity's body-colour rule reads.
- The list of places that tie galena to `radioactive_pegmatite` was short again: a generated
  copy of the mineral data's list, and three pages built from it. Reading every file that a
  search of the tree returns found two more things. A test counts the scenario among six for
  galena and passes with nothing to spare. And the release note of v160 recorded the
  strangulation gate removing this galena, and put it down to depleted walls. The committed
  baselines hold the galena on record, with no growth, from v70 to v159. This review's own
  probe had printed that since its first version, and the document had not used it. SC3's
  acceptance is now a search of the tree (§0; §3.3; §4, SC2 and SC3).
- Smaller: what Zen's drift reaches is now said, and its silica read; the E = 1 arm is not a
  preview of a value; the rounds' census copies with SC2 evaluated 20 of the 22 controls at
  seeds 1 and 2; the scenario object is a named set of fields; the tooltip and the Record
  Player show one zone's note, and three lists show every zone's; the starter-fluid row
  lacked its step count; "three to four minutes" assumed the page keeps pace; the new
  probe's header said it exits 0 where it can throw; the agent interface's headless run
  takes a step count and a shape seed; and the census's own header and one of its labels
  are stale, and are left so (§1).

**Corrections to the ninth version** (commit `bee0d77d`). Its ninth review round found every
item of the eighth round fixed with runs, and found that version's two new claims, the
galena's history and the test at its floor, to hold under runs of its own. It found one
statement wrong in what the owner is asked to decide. It was in the answer to the eighth
round's first finding.

- The vug's early seal was put down to the value of the bound: "in a smaller cavity the
  same bound is too loose", "E = 7 is sized to one cavity", and an acceptance line that left
  the owner to say "by what" that size was to be held. No tighter value had been run there.
  The round ran them, and this review now does. With the pair's rate clamped at 3, at 1 and
  at 0 the 15 mm vug passes 0.7 at step 81 to 86 and seals at step 163 to 177; with the pair
  holding no solid, quartz and tourmaline fill it. There was no value of the bound alone
  to choose. SC1's other courses were then run in that vug too, each alone, and none holds
  it alone (§0; §4, SC1; §6; trap 22). What the tenth version went on to say about that is
  corrected below.
- Random Vugg's plugs were counted in one of its three size classes. Its page has a Cavity
  size select of its own, which opens on a setting that draws the class. The pegmatite
  archetype is now run at all four settings: three of eight cavities fill in the pocket
  class, all eight in the vug class, none in the cave class, and four of eight at the
  setting the page opens on. Under the clamp six of the eight vugs still fill, and five do
  with the pair holding no solid. So where the general clamp was said to keep Random Vugg's
  cavities from filling, that was true of the pockets run and not of the vugs
  (§0; §3.1; §4, SC1; §6; trap 19).
- An ordinal went stale when the eighth version's corrections added an acceptance line.
  "The third line becomes" then pointed at the line on the census controls. The text now
  names the line it means, and says which other lines change under the general clamp
  (§4, SC1).
- SC4's acceptance was open on both sides. Its fill lines were horizons, which a pilot that
  only slowed growth further would pass, and no line failed for a pocket starved of supply.
  It now has a line with no horizon in it, the fill of a pocket whose feed is shut, and a
  line with SC1's floors (§4, SC4).
- The galena's history was argued from today's tree and from the age of one line. The round
  ran the trees of v70, v159 and v160 and found the argument's conclusion true; those runs
  are cited, as not committed. The step the argument skipped is given: each cell has had a
  fluid of its own since v68. And the committed probe now prints the baselines in which
  each lead mineral of the two uraninite scenarios is on record at no size. `schneeberg`'s
  four have the same history, and the document had not used them (§3.3).
- The recommended lead timing had not been read where nothing alters the uraninite, and of
  the other modes the text said the question was not asked. Both timings are now run in
  Creative mode's starter fluid and in a Zen run of the scenario, through the game's own
  code. Held, the lead is not released there in a run left to itself. Released every step,
  it grows a galena in both, in runs that have no license (§3.3; §4, SC3; §6; §7).
- Zen's drift was described through silica alone, in a parenthesis. It is written to the
  simulator's conditions outside a snapshot and propagate pair. That is
  now said where F3 is, and what this review met in Zen has a decision of its own, the
  eighth (§3.3; §6).
- Smaller: the Zen line was said not to fix E where "the first line does", and the first
  line only refuses loose values; "all of them `gem_pegmatite`" left out Random Vugg's
  archetype and the starter fluid; two of the Record Player's three reads of a zone's note
  print a card for each zone of a stretch, and are not the zone under the pointer; the
  galena test reads a record, so what fails it is a galena never born; three acceptance
  bullets that ask only for a report are labelled so; three probes change the page's state
  and two more call functions that only read a crystal; a SIM bump blocks the replay of
  earlier saves whatever becomes of the new field; Quick Play empties the seed box, so its
  run is not the baseline's; Appendix A's `flow_rate` lines are from the census's JSON
  report; the census's stale header and label are to be corrected by the commit that next
  changes the tool; and Random Vugg's size select is labelled with other ranges than its
  classes are drawn from (§3.1).

**Corrections to the tenth version** (commit `f6a264ee`). Its tenth review round found every
item of the ninth round answered with a run, and every new number it re-drove as committed.
It found one statement wrong in what the owner is asked to decide, again in the answer to
the round before, and of the same family: a statement true of the cases run, written as
general.

- Decision 1 closed the list of what can be chosen for the form's 15 mm vug: "there is no
  value and no course here to choose for that size", and three things that could be chosen
  instead. Each course had been run alone, and the text said in one place that
  combinations were not run. The round ran some. The changed broth with the pair's rate
  clamped at 1 keeps that vug under 0.7 full at all three seeds. Eight pairs of changes are
  now run and tabled, with what that one costs: a clamp the preview does not stand for,
  the pocket's quartz, and a pocket 1 to 2 % full in the scenario's own cavity. The
  document no longer says what can or cannot be chosen for that size. It says what was
  run (§4, SC1; §6; trap 22). (The first of those three costs was wrong, and "says what
  was run" left the owner no list at all; see the next list.)
- The vug was treated as this scenario's matter. The form offers it to every scenario, and
  the round ran the fleet there: 16 of 41 scenarios fill as shipped. That is now a
  committed probe at three seeds (§3.1; §4, SC1; §6). (Sixteen counted an open surface
  among the pockets; see the next list.)
- "The general clamp keeps Random Vugg's pocket class from filling completely" was true of
  the eight cavities run, which are 34 mm and larger. Of the 23 pockets under 40 mm that
  seeds 1 to 400 draw, ten still fill under it, four of them on morganite (§0; §3.1;
  §4, SC1).
- "Nothing alters the uraninite there" was true of a run left to itself. Creative mode
  has actions that raise O2. With one Drain the uraninites are altered and the held store
  is released, which is the mechanism working. That is now run (§0; §4, SC3; §6).
- "Every part of Zen's drift is written to the bulk handle" was wrong of one part. The
  crack event lowers the conditions' pressure, which a crystal's engine reads as it stands,
  and thirteen carbonates and quartz's solubility read it. What becomes of each kind of
  write is now measured by a probe of its own, which also replaces the eighth round's
  uncommitted trace of the temperature write (§3.1; §3.3; §6, decision 8).
- "The two places where the game starts this scenario's fluid without its events" was
  short by one, the preset of that broth on Creative mode's setup panel, which is now
  named as read and not run. Random Vugg's pegmatite archetype, which draws uranium, is
  now run under the timings as well (§3.3; §4, SC3).
- The Zen galena's half millimetre was given without saying that the pocket it grows in is
  full by step 200 (§0; §4, SC3; §6).
- Smaller: SC4's new line was called the one with no horizon in it, and it is read at a
  step; "three of those lines change" was three statements in two lines, and a fourth
  change was missing; two more versions have no committed baseline; a fill above 100 % is
  now a note of its own (§3.4), with the fleet's case beside it; the general clamp's
  acceptance named a "column for the value chosen" that exists for four values; and the
  history of earlier versions is taken out of the argument of §1 to §4, where §9 has it.
  (Three sentences of it were left there; see the next list.)

**Corrections to the eleventh version** (commit `ba02e86f`). Its eleventh review round found
every item of the tenth round answered with a committed run, and every number it re-drove
as committed. It found one headline count wrong by one, and four statements that said more
or less than their evidence.

- The fleet count took an open surface for a full pocket. `great_salt_plains` is authored
  as an open system, by the owner's directive of 2026-06-22: the step reads its fill as 0
  and never seals it. The fleet probe counted pockets by `get_vug_fill`, which for that
  scenario returns its crystals' volume over the wall's capacity, and so counted it among
  the scenarios that fill in the form's vug, at 2,834 %. §3.4 gave that figure as a fill
  the clamp had failed to stop, untraced, and the pull request listed it as a defect found
  on the way. This review's own census has the guard, and its probe did not. The probe
  now sets an open system aside and checks that every run it counts as full is a run the
  simulator sealed. Of the other 40 scenarios 15 / 16 / 15 fill in that vug, where the
  text had 16 / 17 / 16 of 41; fourteen fill at every seed, not fifteen; and in eight of
  them, not nine, the largest share is another mineral's than the pair's
  (§0; §2.2; §3.1; §3.4; §4, SC1; §6; trap 23).
- The one pair of changes that holds the form's vug was said to rest on a clamp the preview
  does not stand for. That was a reading of the engine. No clamp had been written into it.
  The round wrote one, and a probe here now does, in 40 pairs of runs. At 2 and above the
  preview's wrapper and a clamp in the engine are one run. At 1.5, 1 and 0 they end within
  0.6 of a point of fill of each other and reach the same verdict in every pair. So a
  clamp of 1 in the engine, with the changed broth, keeps that vug under 0.7 at all three
  seeds, at the price already given (§4, SC1; §6; §7; trap 22). ("One run" was said of
  sizes and fill, and the 0.6 is 0.6412 unrounded: both are corrected below.)
- "Births read the bulk handle in all but the four scenarios of §2.3" was Simulation mode's
  count carried into Zen. Two of the four owe their envelope to a weathering epilogue,
  which rides on the scenario object that Zen leaves behind. In Zen it is two of 41, which
  is now measured, and §2.3 now says what puts the envelope up in each of the four
  (§2.3; §3.3; §6, decision 8).
- The places where the game grows a uraninite with no event to alter it were counted
  again, and were short again: a Zen run of `schneeberg` was missing, and so was Creative
  mode's own uranium slider. §3.3 now gives a list by search and by run, and says it is a
  list. Both lead timings are now run in that Zen simulator. Released every step, the lead
  grows a galena of 21 to 23 mm there, the largest in any run of this review that
  radiogenic lead grows (§0; §3.3; §4, SC3; §6).
- The form's vug had been left with no proposal to answer for it, once the tenth version's
  closed list was cut. Decision 1 now gives an open list and says what this review would
  do, and SC4's pilot is asked to report on that vug. SC4's acceptance lines now say at
  which seeds, in which mode and in which cavity they are read (§4, SC4; §6).
- Smaller: the crack event's pressure write is at line 184 of `js/98a-ui-zen.ts`, not 186;
  three sentences of §1 to §3 still told what an earlier version had said, and are
  reworded (§1 still tells, round by round, how the census's controls came to be what they
  are); "each such statement says not committed where it stands" did not hold in §9, and
  is now scoped to §1 to §8; "no value mends that class" lacked "alone" and its eight
  seeds; §7 named two of the tests the two engines make on their own rates, and there are
  five; the "15 mm" setting
  builds walls of 9.3 to 16.8 mm, because the simulator sets the wall's diameter from the
  volume of the cavity it builds, which is now said; one Drain releases what is held by then, and at
  seed 2 most of that run's lead is made afterwards and held again; the species write of
  the Zen probe is larger than any one event's; the first acceptance line is met by a
  pocket whose quartz is a speck, so the bump's acceptance gains a floor for quartz;
  Evaporate and an earlier Drain, which the eleventh version listed as not run, are run;
  and Random Vugg's pegmatite archetype, which was listed among the runs "without the
  scenario's events", has one event of its own, a cooling that brings no oxygen.

**Corrections to the twelfth version** (commits `5dc074c4` and `6d4aba1b`). Its twelfth
review round found every finding of the eleventh answered. It re-ran two of the probes whole
and got the committed outputs back, and it found the cause this document gives for the two
scenarios that lose their envelope in Zen to be the right one. It found nothing that had to
be fixed. It found three statements wider than what stood behind them, and some smaller
things. The corrections below were made after that round. The thirteenth round reviewed
them alone, and found three of them wrong or short in their turn (the next block).

- "At 2 and above the two are one run" was true of what the probe compared, which was
  sizes and fill. Albite's engine debits the fluid at its rate before it records the zone's
  trace aluminium, so the wrapper, under which the engine runs unclamped, records less of
  it. The round compared the two forms zone by zone, and the probe here now does, for the
  22 pairs: 6,908 albite zones of 84,147 zones differ in their trace Al, by 13.8 % of the
  larger value at most, and 3,522 of 86,229 step-log lines differ. Sizes, fills, summaries
  and verdicts are as they were. The text now says "the same sizes and fill", §7 names
  albite's writes beside the five tests, and SC1's bump is told to expect other trace-Al
  values on albite than its preview gives (§4, SC1; §7; trap 22).
- SC2's preview is a wrapper too, and it had not been run against the law written into the
  three engines, which is what trap 22 asks of a preview. The round ran it in 14 pairs, and
  a probe here now does in 48. The two forms have the same sizes and fill in 45. In
  `sunnyside_american_tunnel` at seed 42, under the same constant, the engine would refuse
  four galena zones that the wrapper stores at under a tenth of a micrometre, and the two
  forms are different runs: the pocket ends 86.5 % full against 83.1 %. Against the shipped
  run both forms move, lose and gain the same species in all 48 pairs, so the table, the
  share of 0.630 and decision 2 stand (§4, SC2; §7). (That probe did not make an engine
  compute the law. It refused the wrapper's zones where a reading said the engine would;
  see the next block.)
- SC1's acceptance lines refused a bound that is too loose and none that is too tight. The
  round met them with a clamp of 0.1, which leaves feldspars a third of a millimetre across
  (its run, not committed), and a probe here has them met at a clamp of 1. The bump's
  acceptance gains a floor for the pair, 15 mm of feldspar and 20 mm of albite, and the
  text now gives a rule for the value: the loosest that keeps the pocket open for its run
  (§4, SC1; trap 22). (That rule does not give the value this document recommends; see
  the next block.)
- Smaller: "within 0.6 of a point" was a rounded print used as a bound, and is 0.64; at
  1.5 a clamp in the engine puts feldspar's rate under the inclusion roll on part of the
  run, not all of it; all 17 comparisons are now named; the fills agree to within 2.2e-16
  of the cavity and not "to the last binary place"; the quartz line said "keeps" of a
  crystal the shipped pocket does not have; a search of Creative mode's actions for writes
  of O2 also finds one that sets it to exactly 0.3, the edge of the uraninite engine's
  test; decision 1's course for the form's vug hangs on decision 4, which both now say;
  SC4's report on that vug now says which shipped run its clause on species is read
  against; §0 counted "17 of 41 pockets", and one of the 41 is not a pocket; a run of
  either uraninite scenario stopped short of its oxidizing event is added to what was not
  run; three probes had comment lines edited after the runs that made their outputs, which
  §8 now says; and the header of `probe-lead-choices.mjs` said Evaporate concentrates
  eight species, where it concentrates a ninth in a simulator with no carbonate boundary.
  Decision 1 and §0's item on SC1 are broken into paragraphs.

**Corrections to the thirteenth version** (commit `c08c9d47`). Its thirteenth review round
was limited to that one commit, the answer to the twelfth, which no round had seen. It ran
both of the commit's probes whole and got the committed outputs back, and it found every
number the commit added in the committed evidence. It found one statement that had to be
fixed, three that should be, and some smaller things. The fourteenth round reviewed the
corrections below, and found three of them short (the next block).

- "The rule this review would give for the value is that one: the loosest that keeps the
  pocket open for its run" does not give the value this document recommends. The clamp had
  been run in the scenario's own cavity at 1, 3, 7, 11, 15, 23 and 47, and at nothing
  between. The round ran the whole values between, and a probe here now does, from 3 to
  11. The three acceptance lines are met by every value from 5 to 9. The loosest of them
  is 9, with three to five steps to spare, and the gems are the same across the range. The
  text now says that the lines admit a range and pick no value, gives the table, says why
  this review recommends 7 (it is the value the other previews were made at, in the middle
  of the range) and puts the value to the owner in decision 1 (§0; §4, SC1; §6; trap 22).
- The probe that answered the twelfth round on SC2 did not write the law into an engine,
  and the document said it did. Its second form was the wrapper's zone, refused where its
  thickness was under 0.1 µm, which is what a reading of the three engines says the law
  would do. The round made the run that reading stands for, in 20 of the 48 pairs. The
  probe here now makes it in all 48: for the length of an engine's call its σ method
  returns a value that reads as σ at the engine's test and as m·(σ − 1) in its rate, so
  the engine computes the law itself. At the same constant every number is as it was. At
  three times the constant two more pairs part, `radioactive_pegmatite` at seeds 1 and 2,
  with no call refused, in a pocket sealed since step 55 or 59. A third run, the wrapper
  with its zones nudged by one part in 10^15, parts from the wrapper's run as well (at
  seed 1 it is the engine's run, and at seed 2 a third that ends farther off), so that
  parting is the arithmetic's and not the law's; it was new in that version and the round
  did not see it. (Its cause was not traced there, and the boundary it was given was
  wrong; see the next block.)
  The records of the pairs with the same sizes and fill are now compared, which §7 had
  said was not done. The census prediction for `pause` had been read under the wrapper;
  the round read it with the law computed by the engine and got the same 23 / 14 / 12 (its
  copies, not committed) (§4, SC2; §7; trap 22).
- §7 said that between the wrapper and a clamp in the engine, at 2 and above, no zone field
  differs but albite's trace Al and its record of the engine's debits. The probe's own
  output listed a third, on one zone. The comparison also skipped a crystal whose count of
  zones differed, and it allowed a number under 1 an absolute error and not a relative
  one, which hid a thickness. The probe now compares every zone both forms store, each
  number to a billionth of itself, and says where each difference is. The differences
  that are not albite's trace are all at the step that seals the form's vug at seed 42,
  on zones of about 10⁻¹¹ µm. The round also read what §7 had left unread, the readers of
  a zone's trace Al: no name, colour or bar of an albite changes, and the number changes
  where it is printed (§4, SC1; §7).
- Two sentences of §6 did not fit decision 1's open list. Decision 4 said that a no to the
  pilot settles the form's vug as accepted. It takes one course off the list and leaves
  the others. And the one pair of changes that holds that vug leaves the feldspar pair at
  3.4 to 4.6 mm, under the floor the twelfth round's answer had just added, as it leaves
  quartz under its floor; decision 1 now says so.
- Smaller: 0.64 of a point and 2.2e-16 were rounded prints used as bounds again (they are
  0.6412 and 2.22e-16, and the text now gives 0.65 and 2.3e-16); the engines' test is on
  the thickness an engine proposes, before the time scale, and not on what is stored;
  §7's list of readers gave the Groove view's lines loosely and left out the collection's
  check on import; the paragraph on the general clamp and SC4's line on SC1's floors did
  not name the line on the pair; the pull request's comment on the full suite called two
  tests "the two tightest wall-clock gates", which its log cannot show, since other
  tests have the same budget inside longer files (seventeen test files hold a budget of
  300 s); §8 still said the suite had not been run;
  the uraninite engine's alteration test also asks for a crystal of more than 3 µm; and
  §3.3's new item on a run stopped early was true of both uraninite scenarios, but only
  one had been read for it (the round ran the other: its first alteration is at step 88).

**Corrections to the fourteenth version** (commit `ab4b1f87`). Its fourteenth review round
was limited to that commit, the answer to the thirteenth. It ran the commit's three probes
whole and got the committed outputs back byte for byte, added the totals up again from the
lines they are made of, and found every number the commit added in the committed evidence.
It found nothing that had to be fixed, three things left short, and some smaller things.
The corrections below were made after that round, in two commits (`660f8d76` and
`db5dd3df`), which the fifteenth round then reviewed (the next block).

- The parting of SC2's two forms in `radioactive_pegmatite` had a cause, which the
  fourteenth version said was not traced, and a boundary, "at three times the constant",
  which it stated all the same. The round traced the cause. In a pocket that is full the
  growth loop hands the cavity's last room to the next crystal as a layer of about
  10⁻¹¹ µm; `_check_enclosure` licenses an enclosure on any layer above zero; and an
  enclosed uraninite is altered no further and writes no more lead. So the step at which
  a feldspar encloses the uraninites turns on the last binary place of a fill. It does so
  in the shipped run of that scenario at seeds 1 and 2 and under the same constant, and
  not only at three times it. A probe here now reads the simulator's own receipts for the
  enclosures and nudges the runs twelve ways. A size or the lead differs from the
  un-nudged run in 0, 6 and 9 of the twelve as shipped at seeds 42, 1 and 2, in 0, 4 and 5
  under the same constant, and in 0, 11 and 12 under three times it. The text now gives
  the cause as a sixth note of §3.4 and puts it to the owner in decision 7. It says that
  every number this document reports for that scenario at seeds 1 and 2 in its full pocket
  is one run of several: SC2's table in all three columns, the lead, the count of negative
  zones in SC3, and the two tables of §3.3. "Three cells" and "to within the sizes just
  given" are gone, and "the same species in all 48 pairs" is now said of the two forms and
  not of a run a rounding away. What holds was run as well: at seed 42 no size and no lead
  moves; in the seven other scenarios SC2 moves, none of 252 nudged runs differs from its
  un-nudged run; and of the fleet's 914 enclosures as shipped, the five on such a layer
  are all in this scenario (§3.3; §3.4; §4, SC2 and SC3; §6; §7; trap 22). That last
  count is of each scenario's own cavity, which this entry did not say; the next block
  corrects it.
- The author then re-read the first of the two commits before any round saw it, and found
  two things in it. Its sentence on seed 42 said that a residue hands one uraninite to
  another host. In one of the eight runs it speaks of, the residue is in the un-nudged
  run and the nudged run has none, and the committed output does not say that the crystal
  is a uraninite. And the reach of the finding had been read with three minerals nudged,
  in eight scenarios. A probe here now nudges every mineral's zones in all 41 scenarios as
  shipped, at three seeds. Besides `radioactive_pegmatite` it moves `searles_lake` at seed
  42, by 0.0004 µm of one calcite, and `wittichen` at seeds 42 and 2, by hundreds of
  micrometres. `wittichen`'s cause is not the enclosure test. Its weathering epilogue
  chooses the precursor of an erythrite between two skutterudites whose releases differ
  in the fourteenth digit, and seed 42 is the baseline's seed. That is a seventh note in
  §3.4 and a second question in decision 7 (§3.4; §6).
- "Every value from 5 to 9 meets all three lines" was read at the scenario's own shape
  seed, when the preview at 7 had been held to ten others. The round ran 8 and 9 at those
  ten, and a probe here now runs 5 to 9. The values 5 to 8 meet the lines at all ten. At 9
  the pocket passes 0.7 at step 227 in the two smallest of the ten cavities. The
  acceptance names no shape seed but the scenario's own, so as written it passes 9. The
  text now says so and gives the table, the acceptance asks the bump to report the read
  at the ten, and decision 1 says what 9 costs there (§0; §4, SC1; §6; trap 22).
- "E = 7 is the loosest value run that keeps that pocket under 0.7 full" was still
  standing in §4, the twin of the sentence the thirteenth round had quoted. It is the
  loosest of the four values of that table, which the sentence now says.
- Smaller: "the σ of 8 that opens the pegmatite" is a σ of 6 to 10 over the range; the
  fill at the step that seals the form's vug does not read 1 "to the last binary place
  under both forms" (the round read 1.0000000000000002 under the wrapper; its run, not
  committed); the two residues of solid in `roughten_gill` are 2 × 10⁻¹⁴ and
  6 × 10⁻¹³ µm, and not "10⁻¹³ µm or less"; that its pocket "seals at step 59" was in no
  committed output, and one now prints the step at which it first reads full; trap 22
  gave the values run before the rule as 3, 7 and 11, where §4 and this section give more,
  and now says that none was run between 7 and 11; "a third test has the same budget"
  counted short, since seventeen test files hold a budget of 300 s; the nudged third run
  "moves as far" was loose, since at seed 2 it ends farther off than the engine's; and
  "the same sizes and fill" is now defined in §7 as the coarse test it is. The round also
  ran two spellings a bump could use for SC2's law against the probe's engine form, and
  each gave that form's sizes and fill at every step (its runs, not committed; §7).

**Corrections to the fifteenth version** (commits `660f8d76` and `db5dd3df`). Its
fifteenth review round was limited to those two commits. It ran five of their outputs
again whole and got them back byte for byte, re-added the totals, checked the source
lines cited, and made traces of its own. It found one thing that had to be fixed, four
that should be, and some smaller things. The corrections below were made after that
round, in commit `72c6d7a8`, which the sixteenth round then reviewed (the next block).

- "Of the fleet's 914 enclosures as shipped, the five on such a layer are all in this
  scenario" was the reach in each scenario's own cavity, and it was written as the
  fleet's: in §3.4, in decision 7, in the banner, in the ledger and in the pull request.
  The round ran the vug setting of Simulation mode's form, where this document itself
  says 15 or 16 pockets fill. There `supergene_oxidation` has 1, 3 and 12 enclosures on
  such a layer at the three seeds, and a nudge moves that run. A probe here now runs
  every scenario at that setting. 18 of the 1,285 enclosures are on such a layer, in
  `supergene_oxidation` and `radioactive_pegmatite`, and four nudges move 51 of 492 runs,
  in nine scenarios, where they move 11 in three in the own cavities. Another probe
  finds where those runs part from the shipped ones: in the eight scenarios whose pocket
  fills, never before the pocket first reads full, and always on a step at which the
  loop handed out its last room. The text now says which cavity each count is of, gives
  the vug's counts as a fourth reading, lists what was not run, and puts
  `supergene_oxidation` in the vug into decision 7 (§0; §3.4; §6).
- Decision 7 put both new questions without what the evidence says about their answers.
  For the precursor: the committed output already showed that the crystal id would leave
  the baseline seed's choice as it is and turn seed 2's; the tie is built in, since each
  candidate has dissolved for one step and lost the same 15 µm; seed 1 does not move
  because it has one skutterudite; and it takes a factor of 10⁻¹³ or 10⁻¹² to turn the
  choice, where "a change that reorders the arithmetic … could turn it" had been run by
  no one. For the floor: the evidence counted layers under 10⁻⁶ µm and gave no sizes
  between. The probes here now print the candidates, the twelve factors, and every host
  layer's size, and the text says where a floor has room and where it has none, and
  names the second place a remedy could sit (§3.4; §6).
- Zeros under four factors were written as absences: "do not turn on a rounding", "does
  not move at any seed". The round put `radioactive_pegmatite` at seed 42 to 36 factors,
  and 17 of them change the host of an enclosure, none of them among the four. A probe
  here now applies twelve, and the text says "under these four factors" where it reports
  a zero (§3.4).
- SC3's table carried no word of the caveat. Its entries for `radioactive_pegmatite`'s
  pocket as shipped at seeds 1 and 2 are each one run of several, and the opal that
  gains solid at seed 2 under the continuous timing is one the shipped run gains under
  two of twelve nudges. The same holds for the counts of amazonite lines. "At seed 42 the
  rows compare as they stand" (§3.3) had not been run for the `pb` arm. All three now say
  so (§3.3; §4, SC3).
- The pull request's comment on the suite gave the load during the nearest miss as "49 to
  88 % for those five minutes". The 49 belongs to the half minute before the batch began.
  Over the batch the box was at 63 to 88 % for three and a half minutes and at 18 to 40 %
  for the rest. The comment also called that test the nearest to a wall-clock budget,
  which the log shows for one-test files only. The comment is corrected.
- Smaller: the residues were accepted with the fill one unit under 1 at seed 1 and two
  at seed 2, where the text said one; "a layer of about 10⁻¹¹ µm" is that layer on a
  feldspar of 43 to 47 mm, and the text now says what sets its size; the mechanism was
  stated as fact outside §3.4 on a trace that was not committed, and a probe here now
  follows the fill through every run; `searles_lake`'s "last room again" was in no
  committed output, and is now attributed to the round's trace; the output for
  `wittichen` printed the two skutterudites and not the four candidates or the first
  key; which runs the nudges did not reach was not said; "a change in the last binary
  places" was loose for `wittichen`, which takes a part in 10¹³; and §9 said the round
  "found them the same run" of two spellings whose sizes and fill it had compared.
- Four things the author had already listed for that round, which it confirmed or left
  as stated: "the third key is never reached" is shown only for the runs made; other
  comparisons of the same shape exist in the simulator and were not examined; "every
  mineral's zones" meant every positive zone a growth engine returns; and which tests
  hold `wittichen`'s seed-42 run had not been checked. The text now gives each (§3.4).

**Corrections to the sixteenth version** (commit `72c6d7a8`). Its sixteenth review round
was limited to that commit. It ran three of its probes again whole and got their outputs
back byte for byte, re-added the totals, checked the source lines cited, and made probes
of its own. It found three things that had to be fixed, four that should be, and some
smaller things. The corrections below were made after that round, and no round has
reviewed them.

- The commit counted what a zone from the last room decides through the host of an
  enclosure, and `_check_enclosure` reads the guest as well: a guest must have three
  zones, and its last three must add up to under 3 µm. A zone from the last room is one
  of the three. The round followed six partings to the step and counted the shipped
  runs. At the form's vug the guest passes only for such zones in 24 enclosures, 17 of
  them on a host layer that is no residue, so a zone from the last room decides 35 of
  the 1,285 and not 18, in four scenarios and not two. In the own cavities the count of
  five stands. Of the 53 partings in a full pocket it found 23 that are a crystal's size
  alone, 8 by the host's layer, 20 by the guest's zones and 2 it did not follow. It also
  put a floor of 10⁻⁶ µm on the host's layer by a wrapper, and two scenario-seeds parted
  at the same steps (its run, not committed). A probe here now counts the guest's side
  in every scenario at both settings, and the parting probe classes each parting; both
  give the round's counts. The two it did not follow are the host's test again: a
  residue makes a nearer crystal the guest's host, and that crystal is itself enclosed
  at that step. The text now gives the three roads with their counts, and no longer
  speaks of "the two places" a remedy could go (§0; §3.4; §6).
- "In `bisbee` at seed 42 a mimetite ends at 0.9 µm … and at 7.3 mm" set two different
  crystals side by side. The probe paired the crystals of two runs by their place in
  the list, and runs that have parted number their crystals apart: place 57 holds a
  mimetite in the shipped run and an atacamite in the nudged one. The probe now pairs a
  crystal with the one that carries the same number and was born as the same mineral,
  at the same step, in the same place, and says how many have no counterpart. In that
  run 25 of the 36 shared crystals differ, the largest a turquoise at 477 µm against
  15, and 43 and 47 crystals have no counterpart. The four bands of how far the runs
  end apart came out as they were but for one run, a difference printed as 100.0 µm
  that had been counted under 100, which the probe now counts as it prints it (§3.4;
  §6).
- "At the vug … those layers run without a gap from 10⁻¹² µm to more than 5 µm … so no
  thickness separates a residue from a thin layer" was contradicted by the output it
  cited, which lists the 18 residues at 1.8 × 10⁻¹² to 1.2 × 10⁻¹¹ µm and the thinnest
  other host layer at 4 × 10⁻⁵ µm. The bins hid it: all 18 sit at the bottom of theirs.
  A floor on the host's layer has room at both settings. What differs at the vug is the
  layers the clamp had cut above that gap, and that such a floor would not touch the
  guest's side (§3.4; §6).
- "Such a step is rare … 95 of the 3,626" was not the rate the 20 partings at the first
  full step are read against: 19 of the 24 shipped runs have a zone in the last room at
  that step. After it the rate is 76 of 3,602, and 18 of the 33 later partings fall on
  one in the shipped run. The conclusion holds on a finer test, which the round made
  and the probe now makes: in 51 of the 53, every call of the loop that differs at the
  parting step was made in the last room (§3.4).
- "One or two units in the last binary place of the host's own size" was true of 16 of
  the 23 residue enclosures; at the vug seven are on ten, twelve or thirteen. The probe
  now prints the units (§3.4).
- The seventh note gave the wrong rounding as the cause. Two candidates' releases
  differ by what their shells had booked per micrometre when they grew, which differs
  from shell to shell by parts in 10¹³, and not by the rounding of the sum. And the
  equal 15 µm holds because every candidate was over 30 µm. The detail probe now prints
  the shells (§3.4).
- The caveat on what else was measured at the vug could be discharged, and the round
  did so with runs of its own: the step at which a pocket first reads full did not move
  in 108 of 108 nudged runs, and `gem_pegmatite` under the bound did not move under
  twelve factors. The parting probe now prints the first, and a probe here makes the
  second in both cavities (§3.4).
- Smaller: the loop lets a crystal through at any fill under 1, and the shipped
  residues were accepted at up to nine units under; a zone from the last room is not
  always 10⁻¹¹ µm, and runs to 0.15 µm on a crystal with no size; "the halite is lost"
  is a crystal of 0.16 µm; two of the runs that end 100 µm or more apart are
  `wittichen`'s; at the vug no shipped run got more than four factors; the list of
  comparisons of the same shape left out the one inside `_check_enclosure` and the
  order the wall is repainted in; nine other test files name `wittichen`; and seed 1
  has two skutterudites, one of which had not begun to dissolve when the erythrite was
  born.
- One thing the probes made for this round turned up beyond its findings. The billionth
  that defines "the last room" in these probes takes in two kinds of zone at the vug:
  151 accepted with the fill one to nine units under 1, and 12 accepted far further
  under, with the nearest fill outside the billionth at 1 − 1.3 × 10⁻⁹. The text now
  says so, and gives the guest's count for the first kind alone (§3.4).

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

Earlier work in this repository that this review builds on:

- `proposals/ROADMAP-BYTE-IDENTICAL-NATURE-2026-07-03.md` §4, rung C1 (the local-σ depletion
  field), with `tools/c1-depletion-ev-probe.mjs` and the banner on the C1 directional-σ tranche
  in `proposals/BACKLOG.md` (2026-07-07).
- `proposals/HANDOFF-FOUNDATIONS-2026-07-03.md`: the row "Dynamic-broth census"; the Door 1
  addendum of 2026-07-08 with `tools/shigar-aqua-growth-probe.mjs` (SIM 219, "the wallet
  law"); and the V1b-flow continuation of 2026-07-07, on what `flow_rate` already carries.
- The Door 1 banner in `proposals/BACKLOG.md` with `tools/negative-fluid-census.mjs` (SIM 220,
  2026-07-08): an event's change is broadcast to the voxels as a difference.
- `proposals/BUG-CRYSTALS-CLIP-VUG-WALL.md`, the owner's report of 2026-05-06, with the v59 to
  v61 notes of `js/15-version.ts`.
- `proposals/RESEARCH-GROWTH-AT-HIGH-FILL.md` with `tools/high_fill_probe.mjs` (2026-05-16), and
  `proposals/HANDOFF-HIGH-FILL-ARC-COMPLETE.md`, which records the per-cell fill switch as
  shipped at v77.
- The v160 note of `js/15-version.ts` (2026-05-28), "STRANGULATION-GATE FIRINGS", with
  `tools/v160_gate_ab_probe.mjs` and `tools/v160_triage_probe.mjs`: the lead minerals the gate
  removed from the two uraninite scenarios.
- `research/minerals/research-uraninite.md`, the project's note on where radiogenic lead goes.
- `proposals/DATA-HOSTILE-REVIEW-2026-07-14.json`: the findings on `gem_pegmatite`'s step-0
  births and the verdict on `radioactive_pegmatite`'s lead.
- `proposals/PROPOSAL-HOSTILE-REVIEW-WISE-2026-08-05.md`: W12 (amazonite gated on lead alone),
  W21 (the feldspar's aqueous broth), W23 (the length of a step), and the bookkeeping item on
  `radioactive_pegmatite`'s galena.
- `proposals/vugg-mineral-template.md`, for the rate written on the excess.
- The story-pocket proposal (WP1, WP7, WP8, WP9), the mineral-recipe review of 2026-10-21, and
  the reservoir arc of PRs #35–#39 and #42, each cited where it is used.

## Appendix A — census tables (generated, seed 42)

The tables are copied from `proposals/evidence/sim-side-2026-11-09/census-seed-42.md`
(census v5, SIM 286; 41 of 41 runs reproduce the baseline). The
`flow_rate` lines at the end are from `census-seed-42.json` (`flow.otherLines`, 32 lines);
`census-seed-42.txt` prints the same lines, and the `.md` does not carry them.

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
| `ab-feldspar-13-scenarios.txt` | §4 SC1: what each shape moves in the 13 scenarios that grow feldspar or albite |
| `ab-quartz-also-clamped.txt` | §3.1: radioactive_pegmatite with quartz bounded as well |
| `ab-radiogenic-lead.txt` | §3.3 A/B table: radiogenic lead carried to the voxels, and kept out of every fluid |
| `ab-radiogenic-lead-open-pocket.txt` | §3.3 and §4 SC3: the same two arms with the pocket open (feldspar, albite and quartz clamped) |
| `ab-rate-on-excess.txt` | §4 SC2 preview table |
| `ab-gem-clamp-sensitivity.txt` | §4 SC1: sensitivity to the clamp value, on the rate and on sigma |
| `ab-clamp-values-13-scenarios.txt` | §4 SC1: three more clamp values on the same 13 scenarios (E = 7 is in `ab-feldspar-13-scenarios`) |
| `ab-rind-13-scenarios.txt` | §4 SC1: the rind (no thickness past 5 mm) on the same 13 scenarios |
| `ab-gem-broth.txt` | §4 SC1: a change to the broth in place of a bound |
| `ab-reactive-wall-trace.txt` | §4 SC2: galena sigma on the bulk handle and on its own cell |
| `rate-at-saturation.txt` | §3.2; the shape test of §4 SC2 |
| `seed-variety.txt` | §2.4 |
| `probe-sigma-maxima.txt`, `probe-sigma-maxima-naica.txt` | §3.1 (cause), §3.4 |
| `probe-baseline-history.txt` | §3.1, §3.3, §3.4 |
| `probe-nucleation-envelope.txt`, `probe-nucleation-envelope-per-vertex.txt` | §7 |
| `probe-cell-field-gap-uranophane-pH.txt`, `-ferrimolybdite-O2.txt`, `-ferrimolybdite-Mo.txt` | §2.1 |
| `probe-side-doors.txt` | §2.3 |
| `probe-lead-choices.txt` | §3.3 and §4 SC3: the lead timings in the two uraninite scenarios, and in Creative mode's starter fluid, Random Vugg's pegmatite archetype and Zen runs of the two |
| `probe-cation-gate.txt` | §4 SC1, SC2, SC3: the cation gate |
| `probe-enclosed-survivors.txt` | §4 SC1 |
| `probe-pegmatite-reach.txt` | §3.1 and §4 SC1: `gem_pegmatite` at eleven seeds under the bound and under the tree's fill switch; Random Vugg at its four size settings, Creative mode and Zen mode; the Cavity Size and Shape Seed boxes of Simulation mode's form, and its vug under tighter bounds, under SC1's other courses and under pairs of them |
| `probe-form-vug-fleet.txt` | §3.1, §3.4 and §6: every scenario at the form's vug setting, as shipped |
| `probe-clamp-in-engine.txt` | §4 SC1 and §7: the wrapper that previews the clamp, beside the clamp written inside the engine; sizes, fill and the record of each zone |
| `probe-excess-in-engine.txt` | §4 SC2 and §7: the wrapper that previews SC2, beside the law computed by the three engines themselves |
| `probe-clamp-value.txt`, `probe-clamp-value-shape-seeds.txt` | §4 SC1 and §6: the whole values of the clamp that SC1's acceptance lines admit, and the steps each leaves to spare, in the scenario's own cavity and at ten other shape seeds |
| `probe-enclosure-floor.txt`, `probe-enclosure-floor-sc2.txt`, `probe-enclosure-floor-fleet.txt` | §3.4, §4 SC2 and §7: the host layer that licenses an enclosure in a full pocket, and which runs a nudge of a zone's last binary places then moves |
| `probe-rounding-reach.txt`, `probe-rounding-detail.txt`, `probe-rounding-twelve.txt` | §3.4: which shipped runs of the fleet, each in its own cavity, a change of a part in 10^13 or less in every zone moves; what differs in them; and what twelve such factors do in two scenarios where four were tried |
| `probe-last-room.txt`, `probe-last-room-vug.txt` | §3.4 and §6: the host's layer in every enclosure of the fleet and the growth loop's fill when it was accepted, in each scenario's own cavity and at the form's vug setting; at that setting, which runs four nudges of every zone move |
| `probe-vug-parting.txt` | §3.4 and §6: where the runs that move at the form's vug setting part from the shipped ones, what differs there, and how far apart they end |
| `probe-last-room-routes.txt`, `probe-last-room-routes-vug.txt` | §3.4 and §6: every zone the growth loop accepts in the last room, and the enclosures such a zone decides through the host's layer or the guest's last three zones, in each scenario's own cavity and at the form's vug setting |
| `probe-bound-nudge.txt` | §3.4, §4 SC1 and §6: `gem_pegmatite` under the previewed bound, in its own cavity and the form's vug, with twelve nudges of every engine's zones |
| `probe-zen-drift.txt` | §3.3 and §6: which of Zen's drift writes reach a crystal's own cell; the envelope and the uraninites in Zen's 41 simulators |
| `probe-clamp-horizon.txt` | §3.1 and §4 SC1: how many steps the bound buys, in Simulation mode, Creative mode and Zen mode's own loop |
| `probe-appearance-contract.txt` | §4 SC1, SC2, SC3: the locality gate's tiers |
| `probe-appearance-windows.txt` | §4: the locality gate's first-appearance windows |
| `probe-ab-digest.txt` | the counts §2.1, §3.1, §3.3 and §4 draw from the A/B outputs and the census reports |
| `c1-depletion-ev-probe-seed-42.txt` | §2.1: the repository's July probe, run on this tree |
