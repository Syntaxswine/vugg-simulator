# Corrections to earlier versions of the simulation-side review (2026-11-09)

This file is §9 of `REVIEW-SIMULATION-SIDE-2026-11-09.md`, which stands beside it. It was moved out
of that document whole after the twenty-seventh review round, and its last block says what was
changed in it then. "This document" below is that review, and a section number (§0 to §8) is one of
its sections.

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
smaller things. The corrections below were made after that round, in commit `87ec532b`,
which the seventeenth round then reviewed (the next block).

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

**Corrections to the seventeenth version** (commit `87ec532b`). Its seventeenth review
round was limited to that commit. It ran four of its probes again whole and got their
outputs back byte for byte, re-added the totals, checked the source lines cited, and
made probes of its own. It found two things that had to be fixed, two that should be,
and some smaller things. The corrections below were made after that round, in commit
`1a6cd00a`, which the eighteenth round then reviewed (the next block).

- The end comparison paired a crystal of one run with the crystal of the other that
  carried the same number and the same birth, and called every other crystal one "with
  no counterpart". Runs that have parted number their crystals apart, as that version's
  own text said. In `bisbee` at seed 42, 38 of the crystals the two runs share carry
  another number in the nudged run, and the pairing left them out. By birth alone 63 of
  74 differ and not 25 of 36, and 5 and 9 have no counterpart and not 43 and 47. The
  largest difference is an atacamite at 1.07 mm against 7.33, 6.3 mm apart, where the
  text had "hundreds of micrometres" and a turquoise 462 µm apart. The probe now pairs
  by birth alone, reads a host by its birth, and prints both numbers and the largest
  crystals with no counterpart. The four bands of how far the runs end apart came out
  as they were (§3.4; §6).
- The key's place is now the cell of the wall the anchor is filed under, and the output
  counts the pairs whose anchors are the same point to the last digit: all 2,911
  (§3.4). The entry that stood here gave a reason for that change which was false. The
  next block withdraws it.
- "A zone from the last room reaches an outcome by three roads" listed the three things
  the parting probe compares. A zone that is accepted with a thickness other than zero
  also puts on the crystal what its engine had written there
  (`js/85b-simulator-nucleate.ts:89`), and a zone cut to exactly nothing does not. The
  round counted it in the shipped runs at the vug: 20 of the 151 positive zones of the
  last room carry such fields, ten crystals change habit on one, and four zones cut to
  nothing drop a habit the engine had written. It also found a nudged run that the
  probes count as unmoved and that ends with a quartz in another habit, twinned. The
  routes probe now counts the fields in every scenario at both settings, the parting
  probe reads habit, forms and twin beside its test, and both give the round's counts.
  The parting probe adds 4 runs in which a habit differs before the step at which the
  run parts, and 18 that end with a shared crystal in another habit, forms or twin. The
  text gives four things that were followed, and no longer says that they are all
  (§3.4; §6).
- "Only the last comes before all three roads" pointed at the growth loop as the place
  for a remedy. The loop is one of three readers of the fill. The round cut the fill two
  ways by wrappers (not committed; made again here with its scripts, line for line).
  Read as 1 within a billionth of it by the loop alone, 30 of 96 nudged runs still part,
  each by a crystal born in one run and not the other. Read so by every reader, none
  parts. The sentence is gone, the text names the fill's readers, and neither cut is
  proposed (§3.4; §6).
- What "differs" meant was in the probes' headers only: a size by more than a billionth
  of itself, and beside the sizes the summary, the bulk fluid and the enclosures. The
  text now says so where the first nudge is made, and that all 23 partings on a size
  alone are on crystals of 24 µm or less. The sentence on `gem_pegmatite` under the
  bound said that no run differs "in a crystal's size", of a probe that reads the end
  of a run and three steps. It now says what the probe reads (§3.4).
- Smaller: "every run that moves", in decision 7 and the banner, was the 53 runs of 96
  that part, and not the 51 of 492; "in the runs made here … one to nine units" is the
  shipped runs, and nudged runs reach 13; a zone cut to nothing is no layer for the
  host's test; "the 24 shipped runs whose pocket reads full" are those of the eight
  scenarios the probe makes, and 46 of the 76 later steps with such a zone are
  `supergene_oxidation`'s; the bounded vug "first reads full at step 98, 100 and 99"
  stood beside 97, 99 and 99 elsewhere, which is the step at a fill of 0.999; "has room"
  for a floor was read on the shipped runs alone; "residue" meant two things in one
  paragraph, and now means one; a comment in the routes probe gave a reason that was
  beside the point; §1 and the table of evidence cited §4 and §6 for a probe those
  sections do not mention; and the round followed the two idle crystals of the seventh
  note to the oxygen on their cells. The message of commit `87ec532b` says the detail
  probe's first 71 lines came back byte for byte. It is 70.

**Corrections to the eighteenth version** (commit `1a6cd00a`). Its eighteenth review
round was limited to that commit. It ran the parting probe and one mode of the routes
probe again whole and got their outputs back byte for byte, re-added the totals, checked
the source lines cited, and made probes of its own. It found one thing that had to be
fixed, two that should be, and some smaller things. The corrections below were made
after that round, in commits `768c08e2` and `44f94545`, which the nineteenth round then
reviewed (the next block).

- That version reported "a second fault" in the pairing key of the version before it:
  that the part naming the place read `phi` and `theta` off a crystal's wall anchor,
  that the anchor has no such fields, and that no place had been compared, in the probe
  and in the seventeenth round's copy of it. The key did read those two fields. The
  rest is not so. The anchor carries both as getters that are not enumerable
  (`js/23c-geometry-surface-anchor.ts:208` to `:227`), so a listing of its keys shows
  neither, and the author had read the listing and not the value. In the round's nine
  runs both are finite numbers on every crystal and name the wall cell one to one, and
  the old key and the round's copy did compare the place. The entry is withdrawn from
  the block above and from trap 22, and the message of commit `1a6cd00a`, which reports
  the fault too, is wrong on it. No count changes. The key that commit put in its place
  reads the same cell, and "all 2,911 pairs at the same point" stands (§5, trap 22).
- "Of the 53 nudged runs that do not part, one differs" counted a crystal's habit, forms
  and twin, and none of the other fields the routes probe finds staged (radiation
  damage, a polymorph, a display name, a diagenesis stage), and the text did not say so.
  The round read more of a crystal's record in the same runs (not committed; run again
  here, line for line). Of the 53, 12 differ in a crystal's number of zones, 3 in its
  late-interlocking flag and 2 in its radiation damage. Of the 55 that part, 18 differ
  in a zone count before the step at which they part, none of them before the pocket
  first reads full. It also found that a residue clears a film in one nudged run. The
  text now says what the probe reads and what it does not, gives the round's counts as
  the round's, and says that the step at which a run parts is not the first at which
  the two runs differ (§3.4; §6).
- "The clamp and the crystal take the volume of every later zone from it" was true of
  the lines it cited and implied an effect that no run shows. The round measured it (not
  committed): the habit's aspect ratio is another on two of the ten crystals, and after
  its first such zone neither of the two grows by more than 5 × 10⁻⁸ µm. What the order
  of the code does is size the residue under the old habit and store it under the new,
  as in the fifth note's overshoot. The text now says that. The sentence that commit put
  after it, that no run had followed a habit into a fill, was false (the next block).
- The cut of the fill for every reader was said to change the shipped run "at seeds 1
  and 2", which is what it does in `radioactive_pegmatite`'s own cavity. By the
  seventeenth round's output it changes shipped runs at the vug as well, and the text
  now gives `supergene_oxidation`'s enclosures under it (§3.4).
- Cut, as the round suggested: the paragraph of rates (how often a full pocket hands out
  its last room at its first full step and after it), which the probe still prints and
  decision 7 does not use; the sentences on the simulator's 5 µm floor; and the
  sixteenth round's floor by a wrapper, which its own block above records (§3.4).
- Smaller: the banner still said "the enclosure test that has no floor"; the bounded
  vug "seals at step 97 to 99" stood in three places, where 97 to 99 is the first step
  at a fill of 0.999 and the round found the seal latching a step later at two seeds
  (its run, not committed), so those now say "is full"; in decision 7 "such a zone
  licenses" followed "or to nothing", "each on a step at which the loop handed out its
  last room" is in one run or the other (the shipped run has such a zone at 35 of the
  53), and "left none" had lost its test and its four factors; "was not previewed"
  stood without "in a committed run" in two places; three counts of 53 stood within
  sixty lines and two of 151, which are now told apart (139 of the 151 positive zones
  of the last room are residues); "residue" was used before it was defined, and its
  nine units are the shipped runs'; "each of the 23 is on a crystal of 24 µm or less"
  is of the crystal that differs most; the comparison of a pair does not read the
  mineral a crystal has become; the acceptance test also takes a zone of no thickness
  that marks a change of state; the bound probe's header cited two sections that do not
  cite it; and the timing given for the `--vug` run left out a probe it overlapped. The
  round also found, outside this commit, that the quartz engine caps a quartz's
  radiation damage where the block that adds to it does not (§3.4, the note on metamict
  crystals).

**Corrections to the nineteenth version** (commits `768c08e2` and `44f94545`). Its
nineteenth review round was limited to those two commits, which changed text and one
header comment. It ran six of the earlier rounds' probes again and got their outputs
back line for line, re-added the totals, checked the source lines cited, and made
probes of its own. It found one thing that had to be fixed, one that should be, and
some smaller things. The corrections below were made after that round, in commits
`a51a1686` and `3abbfc80`, which the twentieth round then reviewed (the next block).

- "No run here followed a habit that a residue set into a later zone, a fill or a size"
  was false. The eighteenth round's run reads, for each of the 15 zones, the volume the
  zone is stored with and the fill the loop reads next, and the author had made that run
  again before writing the sentence. Six of the 15 change the habit's aspect ratio and
  are stored with 11.1 times the room the clamp saw, with 0.09 of it or with nothing.
  The fill the loop reads next is then from one unit under 1 to twenty of the same units
  over, and at the step at which a feldspar's residue is stored with nothing an opal is
  handed the room. The nineteenth round made the eight runs again with each such zone
  stored under the habit the clamp had read (not committed; run again here, line for
  line): the opal gets nothing, and an anglesite that a malachite encloses in the
  shipped run stays free. The text now gives both readings as the rounds' own (§3.4).
  The message of commit `768c08e2` repeats the sentence and is wrong on it.
- "Four probes had comment lines edited after the run that made their committed output"
  was five once `768c08e2` had edited the header of `probe-bound-nudge.mjs` (§8).
- Smaller: "leaves the other three open" stood after a fifth thing had been named, and
  the eighteenth round's run has a sixth, the loop's late-interlocking flag, so the text
  no longer numbers them; decision 7, the banner and the ledger gave closed lists of
  what such a zone does and of what a floor would leave, and now say that the lists are
  of what was followed; the table of evidence still said that the parting probe finds
  "the first step at which each nudged run differs"; "seals at step 174 to 176" stood in
  trap 22, the banner and the ledger after §0 and §4 had been reworded; "24 µm or less"
  is 24.2; in the block above "none of that is so" covered a clause that is so, and one
  correction had no entry; trap 22 did not say which round's key had made 74 pairs; and
  two sentences repeated what earlier paragraphs say and are cut (the sizes of the
  twelve zones further under 1, and "no remedy was previewed in a committed run"). From
  the eighteenth round's output the text now also gives 35 and 18: of the 53 runs that
  do not part, 35 end with a crystal's zones not the shipped run's, and 18 end as the
  shipped run in what the round's probe reads at the end (§3.4). It gave the 35 as
  ending "with some zone of another thickness", which is more than that probe shows (the
  next block).
- These corrections were made in two commits, and the second corrects sentences of the
  first, `a51a1686`, which the author found on reading them against the rounds' outputs
  and the source once more. It said that those 18 "are the shipped run in every field of
  every crystal". The round's probe reads at the end the fields that a listing of a
  crystal's record shows, and what is nested in them to five levels, without the wall
  anchor and with a zone's thickness alone, and the text now says that. It said that the
  eighteenth round's run "shows two such fields" in nudged runs, a film and the
  late-interlocking flag, where that run's output names more, which the text now lists.
  It gave the flag as differing "in five of the nudged runs", which is three that do not
  part and two before they part, and it gave one of the two lines at which the loop sets
  it (`js/85-simulator.ts:979`; the other is `:991`). And it gave the fill after the
  mimetite's zones as "up to ten units over 1", where one of the five readings is one
  unit under. And the first entry of this list said that six of the 15 zones "are stored
  with another volume than the room the clamp saw", where the other nine are stored with
  the room to a thousandth and not exactly. The message of `a51a1686` is wrong on the
  first of these. Decision 7 now carries what a habit does to the fill, which that
  commit had put in §3.4 alone.

**Corrections to the twentieth version** (commits `a51a1686` and `3abbfc80`). Its
twentieth review round was limited to those two commits, which changed text alone. It
ran two of the earlier rounds' probes and one committed probe again and got their
outputs back line for line, re-added the totals, checked the source lines cited, and
made probes of its own. It found nothing that had to be fixed, three things that should
be, and some smaller things. The corrections below were made after that round, in
commits `346dd818` and `b4ff9849`, which the twenty-first round then reviewed (the next
block).

- "In two of the eight shipped runs" a habit that a residue brings decides another
  crystal's outcome: that is the count by the volume the zone is stored with, the one
  thing the nineteenth round's wrapper changes. A habit is also read as a habit. The
  round took the staged habit off the crystal at each of the 15 zones (not committed;
  run again here, line for line), and a third run then ends otherwise: in
  `reactivated_fluorite_vein` at seed 2 the acid wash of step 118 etches a fluorite
  that the shipped run leaves whole, because the etch has a rate for a cubic fluorite
  alone and a residue had made this one a hopper cube. The text now says which route
  the two is counted by and gives the third run (§3.4; §6, decision 7), and says that no
  search was made for other readers of a habit (§3.4).
- "35 end with some zone of another thickness" said more than the eighteenth round's
  probe shows. It pairs a crystal's zones by their place in the list, so a list that is
  one zone longer sets that field by itself. By its output 12 of the 35 end with a
  crystal that holds another number of zones, and the other 23 with a zone of another
  thickness in a list of the same length, which is what the text now gives. The
  twentieth round paired the zones by their step (not committed; run again here, line
  for line): a zone that both runs hold is of another thickness in 28 of the 35, and in
  the other 7 one run holds zones the other lacks. The message of `a51a1686` has the 35
  as the text had it.
- "Five probes had comment lines edited after the run that made their committed output"
  counted five where six probes were newer than that run. `probe-enclosed-survivors.mjs`
  is newer than its run by the files' times, with no copy kept and nothing in the
  history, since both were first committed together, so that what was edited in it
  cannot be shown. Every earlier count in that sentence was one short for it. The probe
  was run again and its output came back byte for byte, so five probes are now newer
  than the run behind their output, and the script that assembles the folder now holds
  every probe's time against its runs (§8).
- Smaller: the fill after the mimetite's zones was given as "one unit under 1 to ten
  over", in the eighteenth round's print, whose unit over 1 is twice its unit under 1;
  in one unit it is one under to twenty over. "Stored with nothing" now has its cause,
  from the round's trace. "Its phantom surfaces", in the list of fields, is the place of
  a phantom among a crystal's zones. The second of the two tests that lead the loop to
  set the late-interlocking flag also asks that the dampener be under 1. "A seventh is
  stored with 0.999 of it" was the print's three digits (above). Trap 22 gave a scratch
  run for the seventeenth round's 74 pairs, which are in that round's own output. "On
  nine" stood sixteen lines under "nine of the ten" and is another nine. §0 cited a
  round's run without saying that it is not committed. The cut of two sentences on the
  sizes of the last room's zones had taken an inference with it, that a floor on
  thickness in the loop cannot tell a residue from the other twelve, and two sentences
  give it back. The banner and the ledger did not carry what a habit does. And the
  message of `3abbfc80` calls a residue a zone "of the second kind", where one that the
  clamp has cut is of both.
- Added from the round's runs: of the 18 runs that end as the shipped one in what the
  eighteenth round's probe reads, 8 differ in what it leaves out (§3.4).
- These corrections were made in two commits, and the second corrects sentences of the
  first, `346dd818`, which the author found on reading them against the round's outputs
  once more. Between the two the full suite was run on `346dd818` and passed (§8). The
  first said that the eighteenth round's listing leaves out "the wall anchor and, of a
  zone, everything but its thickness", where a listing also does not show every field a
  crystal holds, and the twentieth round had found one that none shows. It said that 8
  of the 18 differ in what the listing leaves out, "each in a zone's
  `_remaining_solid_um`", where one of the 8 also differs in its anchors' signatures of
  the wall. It gave "a third run then ends otherwise" without its test, which is that of
  size, flag and host; in the habit itself all eight end otherwise, the habit being what
  was withheld. It gave the files' times without saying what a run's time is. The third
  entry above said "was six" of probes whose comment lines had been edited, where what
  was edited in the sixth cannot be shown. The message of `346dd818` says "was six" too.
  Two wordings of the entry on smaller things were put right as well: the loop has two
  tests that lead to the one line that sets the flag, and it takes two sentences to give
  the inference back. And §8 said "No file the suite reads is changed", as the document
  had since its first commit: the suite fingerprints the tree it ran on, all but seven
  folders and its stamp, and what holds is that nothing under `js/`, `data/` or
  `tests-js/` is changed and that no test names a document, a script or the evidence
  folder of this change.

**Corrections to the twenty-first version** (commits `346dd818` and `b4ff9849`). Its
twenty-first review round was limited to those two commits, which changed text alone. It
ran two of the twentieth round's probes whole, a third for three of its nine scenarios,
and one committed probe again and got their outputs back line for line, re-added the
totals, checked the source lines cited, and made probes of its own. It found nothing
that had to be fixed, three things that should be, and some smaller things. The
corrections below were made after that round, in commits `f422564f` and `207dc2da`,
which the twenty-second round then reviewed (the next block).

- "At the vug ... it is cubic at seed 1 and is etched, and at seed 42 it is a hopper
  cube from an ordinary zone" gave the etch at seed 1 without its cause, and the cause
  belongs to this note. The round followed the fluorite step by step (not committed; run
  again here, line for line). At the vug the engine writes a hopper cube with each zone
  it proposes from step 61 to step 117. At seed 1 the pocket first reads full at step
  60, the loop drops the zone at each of the 57 steps from 61 to 117, the habit does not
  reach the crystal before the wash, and the wash etches a cube. The run with the habit
  withheld rests on the same thing: the engine writes the habit again at each of the 56
  steps from 62 to 117, and the full pocket drops it. So a zone that is dropped decides
  that wash as well, in a shipped run that is not among the eight, and no count of this
  note holds it. The text now says so (§3.4; §6, decision 7).
- "8 of the 18 differ there, each in a zone's `_remaining_solid_um`, and one of the 8,
  `bisbee`'s, also in the signatures of the wall" counted differences that are far under
  the billionth by which this note counts a size as differing. The round sized them (not
  committed; run again here, line for line): 17 zones on crystals that have dissolved
  away in both runs, with values of nothing to 1.6 × 10⁻¹³ µm, and a digest of wall
  depths that differ by 2 × 10⁻¹⁶ mm. The text now gives the sizes and why they count,
  and the size of the thicknesses that differ, which the twentieth round had given and
  the text had not taken (§3.4).
- The pull request's comments and description carried sentences that the commit before
  this one had withdrawn from the document, among them "No file the suite reads is
  changed" in both earlier comments on the suite. They are corrected there.
- Smaller: "at each of the 15 zones" is 13 in the runs with the habit withheld, which
  differ from the shipped runs after the first such zone and have other such zones. The
  etch's refusal of a hopper cube is on purpose, which the text did not say. The test
  lines cited for the stepped cube were a directive that the test calls by hand at step
  117, and the lines now cited are the scenario's own wash at step 118. §8 did not say
  that neither the logs nor the files' times are in the tree, or that one test lists the
  tree's files by name, and the block above said "the whole tree" of a fingerprint that
  leaves out seven folders and the stamp. Trap 22 gave the seventeenth round's 74 pairs
  as its own output without saying that it is not committed. The first entry of the
  block above cited decision 7 for a sentence that §3.4 alone has. The last entry of
  that block left out two wordings it had changed, and that the message of `346dd818`
  repeats "was six".
- Not taken up: a count of the habits that a full pocket drops in the other scenarios;
  and a comment in `data/scenarios.json5` (lines 613 to 615), which says that the broth
  keeps seed 42 off a stepped surface, where the scenario's own note (line 606) and the
  test say that it does not. That file is not this change's to edit.
- These corrections were made in two commits, and the second corrects sentences of the
  first, `f422564f`, which the author found on reading them against the outputs again,
  before any round had. The first gave the step from which the pocket "reads full" as
  63, 62 and 61 at seeds 42, 2 and 1, which is the first step that starts full. This
  note's "first reads full" is the committed probe's, the step by whose end the fill
  reads 1, and by it the steps are 62, 61 and 60. It gave the wall's depths as differing
  "by 2 × 10⁻¹⁶ mm at most at the end of the run" and not what the round's run has for
  the second step. It gave no size for the 22 zones that one run holds alone. Decision 7
  said "the same habit reaches no zone" of a habit that no accepted zone carries. And
  the dropped zone at seed 1 stood on a trace and the source: a scratch run now gives
  that fluorite the habit after step 61, with no zone, and the wash takes nothing off it
  (not committed). Between the two the full suite was run on `f422564f` and passed (§8).

**Corrections to the twenty-second version** (commits `f422564f` and `207dc2da`). Its
twenty-second review round was limited to those two commits, which changed text alone.
It ran both of the twenty-first round's traces and the author's scratch run again and
got their outputs back line for line, checked the source lines cited and the pull
request's text, and made probes of its own. It found nothing that had to be fixed, six
things that should be, and some smaller things. The corrections below were made after
that round, in commits `4500240f` and `56d9f479`, which the twenty-third round then
reviewed (the next block).

- "At the vug the engine writes a hopper cube on the fluorite with each zone it proposes
  from step 61 to step 117" gave the engine's habit without its cause, and the cause
  belongs to this note. The engine writes from a growth regime that is read anew only at
  the end of a step in which the crystal stored a positive zone, so in a full pocket it
  writes from the last reading made before the pocket filled. By the round's run (not
  committed; run again here, line for line) the regime that the fluorite carries at the
  vug is not the one a fresh reading would give from the end of step 78 on, and at seed
  1 the reading that set it was made on a residue. The text now says so, and counts the
  reading among the things a stored zone does (§3.4; §6, decision 7).
- "The habit never reaches it" and "no zone is accepted to carry the same habit" were
  not so after the wash. At seed 1 the habit lands at step 119, on a zone of 0.0096 µm,
  and is gone at step 120, as the twenty-first round's own output has it. The text now
  says "before the wash" (§3.4; §6, decision 7; the block above).
- "No count was made of what a full pocket drops elsewhere" named the larger side and
  left it there. The round counted it (not committed; run again here, the same but for
  the seconds it prints): 49,289 positive zones at the vug in the 17 scenarios whose
  pocket fills, 20,844 of them carrying something their engine wrote for the crystal,
  and 262 crystals that end without the habit their engine last wrote; 12,799, 8,919 and
  49 in the three own cavities that fill. The text now gives the count, a quartz in
  `gem_pegmatite` at the baseline's seed, and what the count does not show (§3.4; §6,
  decision 7; the banner and the ledger).
- What the two cuts of the fill that were tried do to that acid wash was not said. Under
  either the fluorite is etched at seed 2 as it is at seed 1 (the round's run, not
  committed; run again here, line for line). The text now says so (§3.4; §6, decision
  7).
- The pull request: the hosted check on its tip had failed, at `npm ci` and before any
  test, and nothing said so; and an edit to its third comment had put one file's times
  after the sentence on another file. Both are put right there, and §8 now says that the
  hosted runs are no part of this evidence.
- The banner in `proposals/BACKLOG.md` said that this review "has been corrected fifteen
  times" and that the corrections made after round 15 had had no review round, as it had
  since the sixteenth version. Its history is cut to a pointer to §0 and to this
  section.
- Smaller: three sizes given as "at most" were rounded down, and they are now 1.1 and
  2.2 × 10⁻¹⁶ mm and, for the 22 zones that one run holds alone, 4.0 × 10⁻⁹ µm, which is
  above the 2 × 10⁻⁹ µm that the block above gave for the 20 whose size the twentieth
  round's output prints. "17 zones" are 13 zones, two of them counted in three runs
  each. One sentence still said "reads full from". §8 marked two of the three runs on a
  shared machine. And "seven folders" are folders of seven names.
- Not taken up: a floor on a zone's thickness was not run against that wash; no reader
  of a dropped field but the etch was followed; the 24 scenarios whose pocket does not
  fill at the vug, other seeds and other cavities were not counted; and the sizes of
  what differs outside a listing stay in prose, where the round suggested a table.
- These corrections were made in two commits, and the second corrects sentences of the
  first, `4500240f`, which the author found on reading them against the outputs and the
  source again, before a round had reviewed that commit. The first said that a stored
  zone has "the crystal's growth regime" read anew, where the simulator classifies a
  regime for eight minerals. It set 262 crystals without their engine's last habit
  against the nine that end with one from the last room and did not say that 181 of the
  262 have no solid at the end; and its "in 11 of the scenarios" could be read of the
  262, which are in 16. It gave the quartz of `gem_pegmatite` as "the bipyramid of
  β-quartz it was" and not the names the simulator gives it, a paramorph and "quartz
  (β→α)". And "either cut changes the acid wash" is so at seed 2. Between the two
  commits the full suite was run twice on `4500240f`, and both runs stopped at one
  wall-clock budget (§8).

**Corrections to the twenty-third version** (commits `4500240f` and `56d9f479`). Its
twenty-third review round was limited to those two commits, which changed text alone. It
read the twenty-second round's outputs and the author's re-runs of them against the text
and the source, read the pull request's text and its comments against the suite's logs,
and made probes of its own, one of them a recount of the twenty-second round's count. It
found nothing that had to be fixed, five things that should be, and some smaller things.
The corrections below were made after that round, in commits `aca59ede` and `0dd41cb0`,
which the twenty-fourth round then reviewed (the next block).

- "Beyond that wash, the count does not show that any of this changes a size, a flag or
  a host. It followed no reader of those fields but the etch" stopped one reader short
  of an answer. One of the dropped fields is a sum, a quartz's dose from its wall, and a
  dose that is dropped does not come back with the next zone, as a habit does. The round
  put the dropped doses on their crystals (not committed; run again here):
  `gem_pegmatite`'s eight quartz, and some of the quartz at the vug, are then named and
  coloured smoky quartz, and nothing that this note's tests read changes. The text now
  says so (§3.4; decision 7). The round's count at the vug was of six scenarios;
  `porphyry`, the seventh there whose wall doses its quartz, was run here with the
  round's script, and the text gives the seven.
- That finding bears on decision 1. Under SC1's bound the pocket stays open, its quartz
  goes on taking the dose, to the engine's cap, and the game shows all nine as smoky
  quartz (the round's run with the clamp written in the engines, not committed). §4
  lists that among what SC1 brings, and decision 1 names it; neither had.
- "The 17 scenarios whose pocket reaches a fill of 1 at some seed" were 16 and the open
  surface, `great_salt_plains`, which the simulator never seals: the eleventh round's
  miscount made again, and the author's check held the text to it, by the column of the
  fleet probe's output that counts a fill by volume (trap 23). The three runs of the
  open surface drop nothing, so no count moved. The text now gives the 46 runs of 16
  scenarios that the simulator seals.
- "The loop drops 49,289 positive zones" counted what engines proposed. 1,103 of those
  were never handed to the loop: 802 on crystals at their authored size cap and 301 on
  tetrahedrites and tennantites whose fluid held no zinc, at a fill of 1 or more and by
  tests that do not read it. By what the loop was handed the figures are 48,186 zones,
  20,510 carrying a field, 454 crystals, and 251 that end without their engine's last
  habit where the text had 262 (the round's recount, not committed; run again here). The
  text now gives those, and decision 7, the banner and the ledger the 251 among them.
  The 81 with solid and their 11 scenarios stand, and so do the own cavities' figures.
- The regime that a stored zone has read anew had been added to the list of what such a
  zone does and not to the note's counts. The round counted it, and the text now gives
  the count (§3.4).
- The pull request's two comments on the suite's red runs put them down to the machine
  that evening. The suite's logs do not show that: the eleven readings of the rebuild
  fall in two groups with nothing between them, the test file's own comments name a
  pause as what such a reading may hold, and the second red run had a near miss in the
  same file that its comment did not report. Both comments now carry a dated note. §8
  said "the same tree gave both verdicts", which is so of the file run alone and not of
  the suite, and it left out the stamp; it now says both.
- Smaller: "their engines write the next steps' habits from that reading" is now "read
  it when they write", since three of the eight engines weigh it with other things; "a
  remedy that takes the last room away puts them on this side" was from no run and is
  cut; the quartz's twin is one draw made again at each step, which the text now says;
  and the sentence on the engine's comment about that twin is cut, since the code under
  that comment acts only in a call that proposes growth.
- Not taken up: a stale regime's habit that lands in an own cavity (a halite of
  `searles_lake` at seed 2, by the twenty-second round's output); what the form drawn
  for a quartz does with a dropped habit, twin or polymorph; readers of the other
  dropped fields; a split of the fluorite's paragraph and a table for the count, which
  the round suggested; and the narrator's smoky and morion sentences, a fault of the
  shipped narrator and outside this change.
- These corrections were made in two commits, and the second corrects sentences of the
  first, `aca59ede`, which the author found on reading them against the outputs and the
  source again, before a round had reviewed that commit. The first said of the zones
  that the loop is never handed that "no fill decides those", and "not because of it";
  what was read is that neither test reads the fill, and the text now says that. It had
  SC1's quartz take the dose "to the end of the run" and "to the last step", where the
  run shows a dose that stops at the engine's cap. It gave a quartz "the name it had
  then" beside the name the game shows, and those are two names: the first is the
  display name that the engine writes. It did not say that the engine's comment has the
  dose accrue at every step in the host. Its "24 scenarios whose pocket does not fill"
  are the 24 whose pocket never reaches a fill of 1, which leaves the open surface as
  the forty-first. Its header named three of the four files that main's move changed and
  this document cites by line, and not the two committed probes that call into them. And
  §8 did not say that pull request 40 changes the test that stopped the suite.

**Corrections to the twenty-fourth version** (commits `aca59ede` and `0dd41cb0`). Its
twenty-fourth review round was limited to those two commits, which changed text alone.
It ran the twenty-third round's scripts again and got their outputs back the same but
for the seconds they print, read the source lines cited, the pull request's text and its
comments, and made probes of its own. It found nothing that had to be fixed, six things
that should be, and some smaller things. The corrections below were made after that
round, in commit `c3fbb548`, which the twenty-fifth round then reviewed (the next
block).

- "It also changes what the pocket's quartz is shown as" named one of two. The function
  that the text cited for the quartz's name gives a feldspar the polymorph its engine
  wrote with the crystal's last stored zone, and a full pocket drops that field as well.
  The round read every crystal's name and card colour under SC1's clamp, at 5, 7 and 9
  (not committed; run again here, the same but for the seconds it prints): the two
  feldspars that the bound is put on are named albite at each seed, where the game names
  them sanidine. A scratch run has them store a zone at every step to the last under the
  clamp (not committed). §4 and decision 1 now name both, §0, the banner and the ledger
  carry them, §7 says what was compared, and the bump is asked to report the names.
- "One dropped field is a sum, and it reaches what a player is shown" was short twice.
  The engine's write is a sum under a cap, and in `radioactive_pegmatite`, where
  uraninites take a quartz past the cap, most of the writes lower the damage: what that
  pocket drops is the cap, and with it given the run's narrative counts three fewer
  metamict crystals at one seed and two fewer at another. And the feldspar's polymorph
  is a second such field, beside the habit that the card prints. The text now gives the
  three (§3.4; decision 7).
- The text set the engine's comment, "every step the crystal sits in the host", beside
  "only with a zone that is accepted", and then counted what a full pocket drops. A call
  that returns no zone loses the write as well, in any pocket. The round counted 1,399
  such calls beside 2,060 that a full pocket dropped, and the text now gives both.
- The pull request's last section still gave 262 crystals without their engine's last
  habit, which the recount had made 251. It is corrected there.
- The dated note under the pull request's fifth comment said that "the logs show a pause
  that falls inside the timed rebuild or does not". They show two groups of readings and
  no cause for the second, since the test prints its timings only when it passes. The
  note is corrected there.
- "Rationed to nothing in the competition for their fluid", written in the second of the
  two commits, is not what the 301 zones are. By the round's run (not committed; run
  again here, the same but for the seconds it prints) all 301 are on tetrahedrites and
  tennantites whose fluid held no zinc, which their formulas take, and 65 of them were
  alone in their budget group. The block above now says so, and the parenthesis that
  carried the phrase is cut from §3.4.
- Smaller: the quartz's display name, "quartz (β→α)", is cut from §3.4, since the
  engine's branch for α-quartz does not write it and it is the same in an open pocket;
  "the darker of its two smoky colours" is the card's, and §4 now says what the cavity
  view's table has; §4 says what the backlog's words are quoted for, and why nine quartz
  are set against eight; decision 1 says what the fill switch does to the same names;
  decision 7 asks about the dropped side as well, gives three of its counts where it
  gave five, and is six paragraphs where it was one; and the block above said that the
  banner and the ledger give all of the recount's figures, where they give two.
- Not taken up: what followed the four readings that changed a regime; the size cap's
  test, which reads a crystal's habit and extent kind, two fields that a full pocket
  drops (by the round's run at the vug, in two scenarios and not committed, 33 of the
  1,419 positive zones proposed for a crystal at its size cap staged one of the two, and
  under none would the crystal be off its cap); what the cavity view and the quartz form
  draw; and readers of the other dropped fields. Main's pull request 49 makes a
  fluorite's shown name and colour a reading of its accepted zones' notes, which is one
  more reader of that list, and nothing was run on main.

**Corrections to the twenty-fifth version** (commit `c3fbb548`). Its twenty-fifth review
round was limited to that commit, which changed text alone. It compared the
twenty-fourth round's outputs with the author's re-runs of them, read the source lines
cited, the pull request's text, its comments and its hosted runs, and made probes of its
own, some of them written apart from that round's to re-derive its figures. It found
nothing that had to be fixed, eight things that should be, and some smaller things. The
corrections below were made after that round, in commit `91047d2b`, which the
twenty-sixth round then reviewed (the next block).

- "Under the fill switch two or three of the pocket's quartz at each seed are named
  smoky quartz as well, and the feldspars keep the name sanidine, since they store no
  zone there after step 20" was three seeds' run, written after "five seeds of eleven".
  The round ran the eleven (not committed; run again here, the same but for the seconds
  it prints). Two or three holds at four of them. The pocket fills under the switch at
  six, a feldspar stores a zone after step 20 at five, and at one a feldspar born after
  the Albitization event is named albite. Decision 1 now gives the eleven, and what the
  rind, the changed broth and the clamp for every scenario do to the same names.
- "The cavity view takes its colour from another table" was read and not run, and the
  places that sum SC1 up gave the card's name alone. The round read that table's colour
  for every crystal: each quartz under the clamp reads as morion, where the shipped ones
  read clear. A scratch run of the narrative itself (not committed) has it print the
  shipped narrator's morion sentence, with its uraninite and its unfilled placeholders,
  for each of the nine quartz, where the shipped narrative prints it for none at the
  form's defaults. §4 and decision 1 now say so, §0, the banner and the ledger give the
  colour, and §7 says what was run.
- The two renamings stood under "What it costs" with no word of where they come from.
  The round ran the form's three other cavities, the scenario stepped on, a Zen run and
  eight more seeds. In the cave setting, where the shipped pocket does not fill, the
  game shows the same names and colours today, so neither is the bound's own doing. And
  "today" was the default cavity at three seeds: one of the 26 shipped quartz at the
  eleven seeds is an amethyst, and in the form's pocket setting all nine are. §4 has an
  item for it, with the eleven seeds, at which the renamings hold without exception.
- "Of the eight minerals that hold solid under the clamp the other five are named and
  coloured as today" could not have come out otherwise: the two readers that the round
  compared return the mineral's own name and one colour for those five, whatever a run
  did. The sentence is cut. What the card prints beside the name does change for two of
  them, and §4 now says so; the bump's report line asks for the habit and the twin law
  as well.
- "As albite where the crystal's fluid holds less K than Na" gave half of the rule that
  names a feldspar. Where K is not under Na the engine names a K-feldspar by
  temperature, and eight of the vug's 14 feldspars that end under another name than
  their engine last wrote are of that half or go the other way: two are sanidine for
  microcline and six albite for orthoclase. §3.4 gives the rule and the three kinds, and
  §4 now says that the renamed feldspars go on debiting potassium.
- Decision 7's new question, what should become of what an engine writes for a crystal
  that is handed nothing, stood on gives of one field each, and "each of the 27 runs
  with the dropped writes given ends as shipped" could be read as saying that what is
  dropped can be kept at no cost to the runs. The round gave every dropped field to its
  crystal (not committed; run again here, the same but for the seconds it prints): 5 of
  the 48 runs at the vug then end otherwise in a size, each through a habit. §3.4 and
  decision 7 say so, and decision 7 says that nothing was previewed for that side.
- "Three ways were followed" left out the run's narrative, and "no search was made for
  other readers of a dropped field" could be a search. The round counted the crystals
  whose own paragraph a narrator would write otherwise. The narrative does not print
  that paragraph for every crystal, so a scratch run read the narrative itself (not
  committed), and the text gives its counts, beside the round's for the card's first
  form and twin. The round's search of the tree is in the text too, made again here for
  the seven fields with no reader in the game.
- The pull request said that the hosted run on its tip was still in progress and gave 31
  green runs of 33; the run had finished green, which makes 32 of 34. It is corrected
  there. And "leaves its placeholders unfilled, as it does in shipped runs today" is
  true of other scenarios: at the form's defaults this scenario's shipped narrative does
  not print that sentence, so the bound would bring the fault into it. Pull request 50
  mends the sentence; §4 names it and decision 6 puts it before SC1's bump.
- Smaller: the transaction's two lines are cited where one was; the count of the quartz
  engine's calls says how many landed and in how many of the eleven scenarios they are;
  "912 of the engine's 1,054 writes bring a quartz back down to 0.7" counted writes
  inside the engine's transaction, of which 415 reach the crystal, and the text now says
  so; the metamict count has its third seed; "polymorph" named two fields in one note,
  and the feldspar's is now its display name; the ninth quartz of §4 is set beside the
  shipped run's, which holds no solid; §1 said "there" of a trace made in the shipped
  run; the engine's comment on the dose, the backlog's words and decision 7's second
  telling of the three ways are cut; §0's sentence on the twenty-fourth round had the
  bound rename "by a second dropped field", where under the bound nothing is dropped;
  the block above did not list four things that its commit changed, the kind added to
  §1, a parenthesis on `porphyry` cut from §3.4, "where the wall doses its quartz" and
  §8's counts, and its entry on the size cap's test said "no proposal" where it now
  gives the round's figures; and in this commit §1 has a kind for the round's runs and
  the two scratch runs, §8's counts are one commit further on, and the note on metamict
  crystals no longer says of the engine's cap on a quartz's damage that it "was not
  followed", which the last two rounds' counts had made untrue.
- Not taken up: §0's history of the rounds, which the round suggested cutting to a
  pointer as the banner's was; which reader of a habit moves four of the five runs; the
  renderer, the zone bars and the quartz form, which were read and not run; the names
  under SC2, SC3 and SC4, under the clamp's other values beyond the three seeds, and at
  the ten shape seeds; and anything on main.

**Corrections to the twenty-sixth version** (commit `91047d2b`). Its twenty-sixth review
round was limited to that commit, which changed text alone. It ran the author's two
scratch scripts again and got their logs back the same but for the seconds they print,
compared the twenty-fifth round's outputs with the author's re-runs of them, read the
source lines cited, the pull request's text, its comments and its hosted runs, and made
probes of its own. It found nothing that had to be fixed, ten things that should be, and
some smaller things. The corrections below were made after that round, in commit
`a7f27257`, which the twenty-seventh round then reviewed (the next block).

- "Under the same clamp for every scenario the quartz and the feldspars of the seven
  other scenarios whose baseline it changes carry the names they carry as shipped" was
  true of each mineral's set of names and false of two crystals. The comparison under it
  read, for each mineral of a run, the set of names its crystals carry, and a set does
  not say which crystal carries which. The round paired the two runs' crystals one by
  one (not committed; run again here, the same but for the seconds it prints): of the
  805 that hold solid in both, two quartz of `ouro_preto` are renamed smoky quartz and
  two more go to morion in the cavity view. The twenty-fifth round's own output had the
  colour, in later clauses of its totals line, of which the author's checker read the
  first. Decision 1 now gives the pairs.
- "The run's narrative reads those fields too", with 65 of the vug's 128 crystals and 19
  of the own cavities' 39, was counted through the narrative. Simulation mode prints the
  simulator's summary at the end of a run: a block for every crystal on record, with its
  habit, its forms and its twin law, and the narrative under them. The round read that
  summary with the same swaps (not committed; run again here, the same but for the
  seconds it prints): the part above the narrative reads otherwise for 111 of the 128
  and for 32 of the 39, and for every crystal with no solid whose last write was
  dropped. §3.4 gives those, and names the summary among the readers.
- That count was wrong in kind for a quartz's dose, and stood under the wrong field. It
  put the engine's last write on a copy at the end of the run, where the next paragraph
  gives each dropped write in the run, after which the uraninites add to it: two quartz
  of `radioactive_pegmatite` at seed 2 were counted as changing a narrative that, with
  the doses given, counts "38 at seed 2 either way", and nine quartz of `schneeberg` at
  the vug the same way. In `gem_pegmatite`'s own cavity the copy carries a dose of 0.04
  to 0.08 and changes nothing, where the give takes each quartz to the cap. And it was
  given under the habit, with the dose and the display name among its fields. The count
  is withdrawn: §3.4 now counts the narrative by the habit, the forms and the twin
  alone, keeps the give for the dose, and has a count of its own for the display name.
- "So what a full pocket drops cannot be kept at no cost to the runs" was a general
  sentence, and the paragraph's own runs bear it out for a habit, at the vug, in five
  runs. In the own cavities everything dropped was given and each run ended as shipped.
  The round ran the habits alone and the forms alone in `radioactive_pegmatite`, where
  the text had the two together (not committed; run again here, the same but for the
  seconds it prints): the habits alone part the three runs, and the forms alone part
  none. The sentence now says that much, and the paragraph says that 45 of the 48 runs
  had something to give, which side of each pair of sizes is the give, and what the test
  does not read.
- The count "at 7 the set of habits differs from the shipped run's in 13 of the 24
  mineral-runs at the three seeds, and the set of twin laws in 7" took in topaz, which
  the shipped run does not hold, three times in each: a set against none, as in the
  sentence that this one had replaced. §4 now counts the crystals that hold solid in
  both runs. And "The quartz are prismatic with the Dauphiné twin of the inversion" was
  three seeds': that twin is a draw, and §4 gives the eight further seeds.
- Decision 7 said "which neither is today" of what `gem_pegmatite`'s quartz and
  feldspars would be shown as, in a paragraph whose second sentence opens "At the vug".
  The crystals are the own cavity's, and in the form's cave setting the game shows both
  today. It now says "in `gem_pegmatite`'s own cavity" and "at the form's defaults", and
  says which give is which.
- "Neither renaming is the bound's own doing" gave the cave setting as its run and drew
  nothing from it. The rind and a Zen run are the two that could have refuted it and do
  not, and §4 now says so. What follows is that no course which opens the pocket avoids
  both renamings, and that they leave the owner a question about the scenario's script.
  Decision 1 now puts it, with what two comments in the feldspar engine say of the fork
  that names a feldspar albite. The round also ran what the author had doubted, that the
  renamed feldspars go on debiting potassium (not committed; run again here, the same
  but for the seconds it prints): under the bound each is named albite at each of the
  171 steps from 60 and every zone it stores then books potassium.
- Three sentences stood beside what the commit had changed. "No search was made for
  others" in §3.4, "it made no search for more" in decision 7 and "searched for no more"
  in the banner and on the pull request were left after a search by name had been
  reported. "All of it is the scenario's Simulation-mode run" in §7 stood eight lines
  under a Zen run. And the card's lines were "read, not run" in one paragraph of §3.4
  and "were run" in another. Each is corrected. A card also prints the damage itself,
  which §3.4 and §4 now say.
- The report line added to SC1's acceptance asked the bump for four readings and named
  no instrument. No committed probe reads a name, a base colour or the narrative in this
  scenario, and the line now says so; it also asks for what the narrative says of the
  feldspars as well as of the quartz.
- On the pull request, two entries shortened for room had lost a qualifier: the
  fifteenth round's, that the runs which part on such a step are those of the eight
  scenarios whose pocket fills, and the seventeenth's, that the ten crystals change
  habit on a zone of the last room. Both are restored there.
- Smaller: the Zen run that carries the bound was read at step 1,150 and the shipped one
  at its seal, and §4 gives both, with the steps at which the feldspars' names turn; the
  narrative's closing list names both feldspars, where the text had a paragraph for one;
  in the cave setting the shipped narrative prints the narrator's faulty sentence today;
  "of no mineral differ" there was a comparison of sets, and is now a count of crystals;
  the 33 quartz are set against the 26 that hold solid as shipped; "Stepped on to the
  seal" was to step 310, past it; the pocket setting's amethysts have their cause;
  "stands above 0.8 again" has lost its "again", six of the 415 writes having landed on
  a quartz that did not stand above it; nucleation writes a feldspar's display name
  before the engine does, and the game calls some microcline amazonite; "The other eight
  have many" was two for the quartz's stored polymorph; §1's kind for the twenty-fifth
  round's runs said "the same pocket" of runs made in other scenarios; decision 6 says
  that pull request 50 was read and not run; decision 1 says that the rind and the broth
  are three seeds'; the block above said that five places carry the narrator's sentence,
  where two do, that the card's other lines change for the five other minerals, where
  they change for two, and did not say that the report line had come to ask for the base
  colour and the narrative; the pull request's note on main did not have this tip's run;
  and in this commit §1 has a kind for the round's runs, §7 says what the round paired
  crystal by crystal, and §8's counts are one commit further on.
- Not taken up: §0's history of the rounds and §1's list of kinds, which the round
  suggested cutting; a committed probe for the report line's readings; why a bound on
  the pair moves `ouro_preto`'s quartz; which reader of a habit parts the runs in
  `radioactive_pegmatite` and `supergene_oxidation`; the renderer, the zone bars and the
  quartz form, which were read and not run; the names under SC2, SC3 and SC4, under the
  clamp's other values beyond the three seeds, and at the ten shape seeds; and anything
  on main.

**Corrections to the twenty-seventh version** (commit `a7f27257`). Its twenty-seventh
review round was limited to that commit, which changed text alone. It compared the
twenty-sixth round's outputs, and those of the twenty-fifth that the commit cites again,
with the author's re-runs of them, read the source lines cited, the pull request's text,
its comments and its hosted runs, and made probes of its own. It found nothing that had
to be fixed, six things that should be, and some smaller things. The corrections below
were made after that round, and no round has reviewed them. More was cut this time than
was added.

- Decision 1 put its new question of "this pocket" and of "the scenario's script". The
  two rules behind the renamings are the engines', and the shipped game shows both at
  the form's defaults in other scenarios. The round ran the fleet as shipped (not
  committed; run again here, the same but for the seconds it prints): each of the 18
  crystals of the feldspar engine with solid in `shigar_pegmatite`, `ouro_preto` and
  `bisbee` ends named albite, each of the 2,088 zones they stored under that name booked
  to potassium, and `ouro_preto` holds quartz that read morion with no uraninite on
  record. The twenty-fifth round's output already had those feldspars' names, and the
  text had not drawn on it. Nor had it cited the script's own words for the event,
  "K-feldspar -> albite replacement cascade". Decision 1 now puts three questions in a
  paragraph of their own, two about the engines' rules and one about the script; §4's
  item on the cause is rewritten around the two rules; and the decision's heading, §0,
  the banner, the ledger and the pull request carry a line of it.
- Decision 1 gave a comment in the feldspar engine, "the K-or-Na fork here was a pre-v17
  artifact", as said of the fork that names a feldspar. The commit that wrote the
  comment (`7904894f`, found by `git log -S`) put it where it had taken a K-or-Na fork
  out of the engine's own debits, and that is the fork it speaks of. The fork that names
  is still in the code. Decision 1's two sentences on the engine's comments are cut.
- Decision 1's count "of the 805 crystals that hold solid in both runs" left the other
  side uncounted. 231 crystals hold solid in one run alone, eleven of them quartz of
  `ouro_preto`, and counted by pocket that scenario shows nine smoky quartz under the
  clamp as it does shipped. The round listed every quartz and feldspar of the two runs
  (not committed; run again here, the same but for the seconds it prints). Decision 1
  now gives the pocket's counts first and the pairs after them, with the 231.
- The counts for the twin, "the twin for two" with "six" in the own cavities and the
  narrative's "six of the 39", put a crystal's last dropped call on a copy, as the count
  for the dose had (the block above). In a full pocket the quartz engine draws that twin
  again at each step, so the last call's draw is one of many: with each dropped write
  given when it was made, every one of the eight quartz of `gem_pegmatite`'s own cavity
  ends twinned (the round's run, not committed; run again here, the same but for the
  seconds it prints). Those counts are cut, the card's count of first forms with them,
  and §3.4 says what a last call understates. The listing's 111 and 32 stand: the round
  made them again for every crystal, each by the habit, the forms or the twin.
- "That twin is a draw (§3.4), and at the eight further seeds 15 of the 24 quartz under
  the clamp carry it" sent the reader to a draw made again at each step, which is the
  full pocket's. Under the clamp a quartz stores a zone at every step and draws once, at
  step 30. §4 now says so, with the count at the eleven seeds.
- Decision 1's "no course below that opens the pocket avoids both" was true of the two
  taken together, and reads as if each course showed both. Three of the four other
  courses avoid one. Decision 1 now says that each shows one of the two renamings, or
  both.
- Smaller: the text that Simulation mode shows at the end of a run is shown once the
  player clicks to read it, and §3.4 says so; that text is no longer called "the
  summary", which this document uses for the per-species summary a baseline stores; a
  card prints the damage of any crystal that has some, not a quartz's alone; the three
  runs at the vug with nothing to give are said by kind; the narrative's count of
  metamict crystals differs in two of the five runs that part, which the paragraph had
  left out; what was compared for the card is what it reads and the two functions it
  calls, and its own code was not run; a display name given when it was written ends as
  the name the copy carries, which the round ran for the fourteen and the six; a quartz
  reaches the cap with its ninety-eighth zone, whatever the step; under the rind each
  feldspar stores one zone, where the text had "within four steps"; one crystal holds
  solid as shipped alone in the scenario's own cavity, a spodumene of 0.01 mm, and 53
  hold it in one run alone in the cave setting; the block above said "in a column" of
  the twenty-fifth round's totals line and "a paragraph that opens" of a paragraph whose
  second sentence does, and did not list three things its commit changed ("by name" with
  the sentence on a reader that takes a crystal whole, the 24 quartz at eight more
  seeds, and decision 6 among what rests on runs that are not committed); and in this
  commit §7 says what the round read, and §8's counts are one commit further on.
- Cut: §0's history of the rounds, which this section holds; §1's list of the kinds of
  run that are not in the tree, with its count of twenty-nine; from §3.4, the 9,362
  calls of the quartz engine sorted four ways, the counts of its lowering writes, the
  counts of first forms and of twins, the narrative's count by the habit, forms and
  twin, and the two mimetites; from §4, the pocket setting's amethysts, the run stepped
  on to step 310 and the steps at which a Zen run's feldspars turn. None is a count that
  a decision of §6 uses, and the rounds' outputs still hold each. This section was moved
  to a file of its own in the same commit, with nothing in it changed but the opening of
  the block above and the two phrases named under "Smaller"; and on the pull request the
  list of what each round found gave way to a pointer here.
- Not taken up: a committed probe for the report line's readings and for the fleet's
  names; whose debit draws the potassium down at a feldspar's cell before the event, in
  the cave setting and in Shigar; why a bound on the pair moves `ouro_preto`'s quartz;
  which reader of a habit parts the runs in `radioactive_pegmatite` and
  `supergene_oxidation`; the renderer, the zone bars, the quartz form and the card's own
  code, which were read and not run; the names under SC2, SC3 and SC4, under the clamp's
  other values beyond the three seeds and at the ten shape seeds; the three other
  scenarios' feldspars and `ouro_preto`'s quartz in any cavity, mode or seed but the
  form's defaults and the three seeds; and anything on main.
