# PROPOSAL — Overnight Inverse Crystal-Growth Pilot, in two stages

**Authors:** Professor + Rock Bot; two-stage revision drafted by Claude (Claude Code)
**Date:** 2026-10-31, revised 2026-11-03
**Status:** Proposed experiment; no production-physics changes authorized
**Stage A:** pipeline validation on repaired Searles halite. About 420 runs, no claim about optimizers.
**Stage B:** optimizer comparison, armed only after a target passes the preflight gate. Not armed: the first batch of five candidates (2026-11-03) had no pass.
**Purpose:** test whether a differentiable surrogate can work backward from a desired crystal phenotype to promising simulated growth conditions

---

## Revision 2026-11-03: why two stages

The first version fused two goals: proving that the overnight machinery works,
and comparing three search methods. Its preflight (the review on PR #46, run on
main `e86ba58a`) showed the Searles halite target can serve the first goal but
not the second. The target did not exist inside the search box, only one input
moved the result, and Sobol landed in the good band constantly. A comparison on
that target would most likely have reported "no optimizer beat Sobol", which
says nothing about surrogates.

So this revision splits the work:

- **Stage A** proves the machinery on a repaired halite target whose answer is
  already known: sealed seeds, checkpoints, worker recycling, scoring, finalist
  replay and the report.
- **Stage B** compares optimizers only on a target that has passed a
  preflight gate of about one CPU-hour per batch. The gate checks that the
  inputs survive the scenario's scripted events, that the phenotype occurs,
  that several inputs matter and interact, and that random search neither
  finds the good region constantly nor leaves no room above it. The comparison
  target is chosen by that gate, not by intuition.

What changed:

- the two stages;
- a repaired score: free crystals only, a minimum useful size, size × smooth
  on one crystal, and a 0.5–2 mm halite scale. Survival, selectivity and
  simplicity are now reported beside the score, not added into it;
- separate seed sets for choosing finalists and for judging them;
- the preflight gate and its tool;
- the smaller fixes from the review: a Phase 0 platform check, memory, the
  differential-evolution budget, defined terms, an exploit-check budget, a
  clean tree, and host timing.

What did not change: the simulator is the only judge, held-out seeds stay
sealed, morphology is read from each growth layer's own classification and
never from the final label, negative results are preserved, no production
physics changes, and the follow-on ladder.

The 2026-10-31 text is in this file's history at `00996055`.

---

## The negative result, preserved

The first preflight built the wrapper and score as literally as the 2026-10-31
text allowed and ran 192 Searles simulations on main `e86ba58a` (SIM 286),
Windows x64, Node 24.15.0, with no errors. The plain run reproduced the Searles
row of `tests-js/baselines/seed42_v286.json`.

| Check across all 192 runs | Result |
|---|---|
| Mostly smooth live halite of 0.5 mm or more | 0 runs |
| Largest mostly smooth live halite | 0.158 mm, against a 25 mm size scale |
| Any live halite of 0.5 mm or more | 16 runs, all hopper, dendritic or stepped |
| Best recipe score (old score) | 0.401, from about 15 smooth crystals of 0.05 mm |
| Runs whose largest "live" halite was 0 mm | 78 |

Why, in this scenario:

- **The events carry the chemistry.** The first flood (step 75) resets
  concentration to 1.0. The winter freeze (step 30) sets T to 8 °C and pH to
  9.5, and floors S at 250 and B at 100. Salinity persists, and so do the
  competing solutes (S and B keep part of their spread above those floors),
  but only salinity moved the score: no halite at 125 g/L, smooth at
  130–155, stepped at 160, no growth on live crystals from 170. Temperature and
  pH changed nothing.
- **Floods erase each season's growth.** Halite grows for about 15 steps per
  bake, to about 0.6 mm, and the next flood dissolves it in about 16 steps.
- **Thenardite fills the cavity.** In a traced run the fill went 0.05 → 0.90
  between steps 120 and 134 and reached 1.00 by step 194, so later bakes could
  grow nothing.
- **Nuclei are born at zero size.** Nucleation reads the equator ring's fluid
  but growth reads the crystal's own cell, and halite lands on floor rings that
  read concentration 1 in winter while the equator reads 3.

The wrapper-only repair: build the scenario with `{ wall: { open_system: true } }`
and add one more `searles_summer_bake` at step 271. Either change alone does
nothing useful. Together, at hold 100 on seeds 1–4, they grow 9–12 free
crystals, 100% smooth, with the largest at 0.48–0.50 mm (salinity 135),
1.13–1.19 mm (145) and 1.48–1.56 mm (150). 25 mm stays out of reach: at
15–20 µm a step it would take over 1,250 steps. The 16-run reproduction is
`tools/inverse-preflight-searles.mjs`.

This result is why Stage A exists and why Stage B has a gate.

---

## Executive decision

1. **Stage A:** run one short armed pipeline test on repaired Searles halite,
   with all three search methods at small budgets, about 420 runs in total. It
   passes or fails on the machinery (A1–A10 below). It makes no claim that any
   optimizer is better.
2. **Stage B:** compare Sobol, differential evolution and surrogate
   backpropagation at equal budgets (Phases 1–3 below), only on a target that
   has passed the preflight gate. Until one passes, Stage B stays unarmed.

Every proposed recipe is judged by the original Vugg Simulator across multiple
growth seeds. The surrogate is never allowed to certify its own answer.

This is an **inverse-Vugg test**, not yet a laboratory recipe generator. A
successful result means "the optimizer learned a reproducible implication of
the current simulator." Nature does not enter the training loop until measured
laboratory results are added later.

---

## Research question (Stage B)

Given a bounded family of starting states for a target that passed the
preflight gate, can a differentiable surrogate identify recipes that produce a
better held-out distribution of the target phenotype than:

- space-filling random search, and
- a competent derivative-free optimizer with the same evaluation budget?

"Better" is preregistered below. It cannot be redefined after the run.

### Hypotheses

- **H0:** surrogate-backprop candidates do not outperform the best control arm
  on unseen growth seeds.
- **H1:** surrogate-backprop candidates improve the preregistered held-out
  score, while remaining inside the declared physical bounds and retaining
  performance across unseen seeds.
- **Useful negative result:** if differential evolution wins, or no method
  clears random search, Vugg can still support black-box inverse design; the
  gradient layer simply has not earned its place.

---

## Why direct backpropagation through Vugg is not the first test

The current simulator includes hard nucleation thresholds, integer event
steps, discrete births and deaths, branching histories, and seeded random
draws. Literal end-to-end gradients would be zero, undefined, or misleading
at many important boundaries.

Instead:

```text
bounded recipe
    -> seeded Vugg runs
    -> measured phenotype distribution
    -> differentiable surrogate ensemble
    -> backpropagated candidate recipes
    -> held-out Vugg verification
```

The stone stays the judge; the neural model is only a map.

---

## The score (both stages)

The 2026-10-31 score added its components, so a cloud of dust could outscore a
real crystal: about 15 smooth crystals of 0.05 mm scored 0.40, a 2.03 mm
dendritic crystal 0.21. It also counted zero-size nuclei and crystals enclosed
by other crystals as "live", and scaled size to 25 mm. The repaired score:

**Free crystal:** a crystal of the target mineral that is not dissolved, not
enclosed by another crystal (`enclosed_by == null`), and has grown
(`total_growth_um > 0`). Zero-size nuclei and enclosed or dissolved crystals
never score. (`active` turns false only on enclosure or full dissolution, so
it adds nothing beyond those checks.)

**Useful crystal:** a free crystal at least `L_min` long (`c_length_mm`).

**Crystal score:** `size × smooth`, both in `[0, 1]`:

- `size = min(1, ln(L / L_min) / ln(L_target / L_min))`, so 0 at `L_min` and 1
  at `L_target`, on a log scale;
- `smooth` = the share of the crystal's remaining solid that grew in layers
  classified `spiral_smooth`. Each positive layer is weighted by what is left
  of it (`_remaining_solid_um`, the simulator's own inventory of each layer
  after later dissolution; the layer's thickness where that is absent).
  Unclassified layers count as not smooth, and a crystal with no remaining
  solid has `smooth = 0`. A layer that dissolved away no longer counts: a
  crystal that grew 1 mm hopper, dissolved to 0.1 mm and regrew 1 mm smooth is
  91% smooth, not 50%. A hopper body that is still there still counts, so a
  smooth skin cannot hide it.

**Seed score:** the best crystal score among useful crystals, or 0 if there is
none. Fifteen 0.05 mm crystals score 0, because none is useful; one 1.2 mm
smooth crystal scores 0.63.

**Recipe score:** `median(seed_scores) − 0.25 × IQR(seed_scores)`, as before.

**Scale:** for halite, `L_min = 0.5 mm` and `L_target = 2 mm`, the regime the
repaired wrapper actually grows. For other targets, `L_min` is the authored
scenario's median largest crystal over the canary's 64-seed sweep and
`L_target = 4 × L_min`, so the authored recipe scores about 0 and doubling it
while keeping it smooth scores 0.5. The first preflight batch shows this rule
can set `L_target` too low (see the cave calcites below); a target's scale is
checked by the gate's headroom test.

**Reported, not scored:** count of free and useful crystals, largest free
crystal and its smooth share, regime shares, survival fraction, competing
species and their volume (selectivity), target volume share, fill, runtime, and
any error. A scalar score must not hide a bad trade-off, so every report shows
these beside it.

**Hard penalties (unchanged):** an exception, NaN or invalid fluid state
scores 0 and is recorded; recipes outside the declared bounds are rejected, not
clamped; morphology from the final label alone is an invalid evaluator.

One caution for visual inspection: the renderer draws an unclassified layer as
smooth (`js/45-morphology.ts`), while the score counts it as not smooth.

---

## Seeds

Four sets, fixed before any search:

| Set | Size | Who sees it |
|---|---:|---|
| Training seeds | 4 | every search arm |
| Selection seeds | 8 | used only to pick each arm's representative |
| Comparison seeds | 32 | used only to judge the representatives; never used to pick them |
| Exploit-check seeds | 4 | only the exploit checks |

Stage A uses 2 of the 4 training seeds. Seeds 1–4 were spent by the first
preflight, seed 42 is the baseline seed of Phase 0 and G0, and seeds 101 and
102 were spent by the 2026-11-03 gate runs, so none of them may be selection,
comparison or exploit-check seeds; nor may any seed a later preflight uses. `prepare` draws
the three sealed sets from a hash of the commit, the preset name and a fixed
salt, and writes them to `seeds.sealed.json`. The manifest records that file's
SHA-256 before launch, and the report re-checks it.

The 2026-10-31 design chose each arm's top 8 on the same 32 seeds it then used
to compare the arms, which rewards luck twice. Choosing on selection seeds and
judging on comparison seeds removes that.

---

## Stage A — pipeline validation on repaired Searles halite

### Target

`searles_lake` built with `{ wall: { open_system: true } }`, plus one
`searles_summer_bake` at step 271 (the wrapper repair above). Run length is
step 270 plus the hold. Score as above, halite, `L_min = 0.5 mm`,
`L_target = 2 mm`. No edit to `data/scenarios.json5` or production physics.

### Inputs

The 2026-10-31 search space, unchanged, so the adapter and its bounds checks
all run:

| Input | Bounds | Meaning |
|---|---:|---|
| Initial salinity | 120–240 g/L | starting brine strength |
| Initial concentration | 0.80–1.60 | degree of pre-concentration |
| Initial temperature | 8–30 °C | cool-to-warm playa starting state |
| Initial pH | 7.5–10.0 | neutral-alkaline lake brine range |
| Competing-solute scale | 0.25–1.50× | jointly scales Ca, S, B, Mg, Sr; Na and Cl are not scaled |
| Final dry-hold duration | 20–100 steps | time after the authored final seasonal event |

### The known answer

On this target only salinity and the hold matter, and the 2026-11-03 gate run
measured that again. The best recipes sit high in the useful band (salinity
about 145–155 g/L) with a long hold: at salinity 153.8 g/L the score climbs
from 0 at a 20-step hold to 0.91 at 100. This is a positive control, not a
result.

### Budget, about 420 runs

| Part | Runs |
|---|---:|
| Phase 0: one recipe twice on one seed, plus the seed-42 Searles row | 3 |
| Shared foundation: 32 Sobol recipes × 2 training seeds | 64 |
| Sobol continuation: 32 recipes × 2 seeds | 64 |
| Differential evolution: 4 generations of 8 × 2 seeds (Stage B's settings, with `init` = the 8 best foundation recipes and `maxiter=4`) | 64 |
| Surrogate: 2 rounds of 16 × 2 seeds | 64 |
| Selection: each arm's top 4 × 4 selection seeds | 48 |
| Comparison: each arm's representative × 8 comparison seeds | 24 |
| Fresh-process replay: each representative × 2 seeds | 6 |
| Recycling identity: 16 evaluations re-run in one never-recycled worker | 16 |
| Resume reference: the killed arm re-run uninterrupted (32 × 2) | 64 |
| Injected failure: one recipe flagged to throw | 1 |
| **Total** | **418** |

Repaired Searles runs cost about 11 s each in the final 2026-11-03 gate run, at
below-normal priority on a shared desktop; the 2026-10-31 host measured 4.11 s
for the plain scenario. So Stage A
is a little over one CPU-hour here and less on an idle host. Stage A uses only
4 of the selection seeds and 8 of the comparison seeds, and the comparison
here is reported, never ranked.

### Pass criteria (all must hold)

- **A1 Phase 0:** clean tree, Node 24.x, `npm run typecheck` and
  `npm run build:check` pass, the same recipe on the same seed twice gives
  byte-identical summaries, and the seed-42 Searles row reproduces
  `seed42_v286.json` on the host.
- **A2 Completeness:** every scheduled search, selection and comparison
  evaluation appears in `evaluations.jsonl` exactly once. Phase 0, replay,
  identity and resume-reference runs go to their own logs. The injected
  failure appears as an error with score 0, and the batch continued past it.
- **A3 Resume:** the runner is killed once at a scripted point inside the
  Sobol-continuation arm. `resume` repeats no completed pair, and that arm's
  evaluations match the uninterrupted re-run of the arm byte for byte. (The
  surrogate arm checkpoints its proposal lists, so a resume inside it reuses
  them rather than retraining.)
- **A4 Recycling:** a recipe task is one recipe on all of its seeds in one
  phase. Workers recycle every 10 recipe tasks, about 14 times in Stage A, and
  the 16 identity evaluations match the recycled workers' results byte for
  byte.
- **A5 Sealed seeds:** a scan of every arm's logs finds no selection or
  comparison seed in training, and the seed file's SHA-256 matches the
  manifest.
- **A6 Scoring fixtures:** the evaluator, run on the 16 recipe/seed pairs of
  `tools/inverse-preflight-searles.mjs`, scores every as-written run 0, the
  repaired runs at salinity 135 within 0.01 of 0, at 145 between 0.58 and
  0.64, and at 150 between 0.77 and 0.83.
- **A7 Known answer:** the best recipe by training-seed recipe score, across
  the whole run, has salinity 140–160 g/L and a hold of at least 60. The best
  of the three representatives (by selection score) scores at least 0.5 on at
  least 6 of the 8 comparison seeds. At this budget a miss is not
  automatically a bug, but it must be explained before Stage B.
- **A8 Replay:** the fresh-process replays reproduce their logged scores
  exactly.
- **A9 Report:** every report section is present, and the verdict line names
  only the pipeline (**pipeline PASS** or **pipeline FAIL**), never an
  optimizer.
- **A10 Resources:** each worker runs with `--max-old-space-size=512`; peak
  RSS stays at or under 700 MB per worker and 1,500 MB for the whole run; every
  evaluation has a 300 s wall-clock timeout, and a timeout is recorded as an
  error.

A Stage A failure is a pipeline bug to fix, then Stage A runs again.

---

## Stage B — optimizer comparison, behind a preflight gate

### The gate

`tools/inverse-preflight.mjs` runs a batch of candidates serially in one
low-priority process: about 95 runs per candidate, plus about 90 for G4 when a
candidate gets that far. Every candidate is written into a dated candidates
file (the first batch is `tools/inverse-preflight-candidates-2026-11-03.mjs`)
before any of its runs, with its target, scale, inputs and bounds.

| Gate | Check | Pass |
|---|---|---|
| G0 platform | the scenario's seed-42 row reproduces `seed42_v286.json` | exact match |
| G1 survival | each input at its low and high bound, the rest authored; the gap is traced step by step at each cell where the target grows (fluids per cell; temperature from the bulk, which equalled each host cell's in this batch) | at least 3 inputs keep 10% of their gap, cell by cell, while at least half the target's growth happens; an input that sets several fields survives if any one of them does; a schedule input (the Searles hold) survives by definition, and the control's 3 of 6 counts it |
| G2 coverage | a 64-point Sobol sample of the whole box on seed A, the first 16 points also on seed B | every input spans its range, and at most 1 run errors |
| G3 existence | the phenotype occurs | at least 1 recipe scores 0.5 or more on both seeds |
| G5 rarity and headroom | how often Sobol lands in the good region (score ≥ 0.5), and how high it gets | at most 10% of the sample; the sample's best at most 0.75, so a better method has room to show it |
| G4 structure | run last, only for a candidate that passed the rest (below) | at least 3 inputs hold the score up across their range; interaction share at least 0.10 with F at least 2; no errored evaluation |

**G4 in detail** (`tools/inverse-preflight-lib.mjs`). It measures structure
where the good region is, around the best confirmed recipe:

1. **Profiles:** each input at 7 even levels across its range, the rest held at
   the base recipe, on seed A. The base itself is a point of every profile. An
   input matters only if leaving its best value costs 0.25 or more on at least
   4 of its 7 levels, and seed B, run at that profile's highest and lowest
   points, moves the score by 0.25 or more the same way. A cliff at one bound
   (one level of seven) does not count, because a random recipe avoids it most
   of the time. This count is a proxy for "constrains the good region", not
   the thing itself: it measures drops from the profile's best, not exits from
   the region. An input that only modulates the score inside the region can
   reach 4 of 7 without ever taking the score below 0.5 (round 1's
   (0.5 + 0.5 x3) does). New seeds will not resolve a case like that, so a G4
   count at exactly 4 of 7 is settled by reading the profile, not by a second
   preflight alone.
2. **Grid,** only if at least 3 inputs matter: a 5 × 5 grid of the two inputs
   that matter most, on seeds A and B. Each axis has 5 even levels, with the
   one nearest the base coordinate moved onto it, so a region narrower than
   the level spacing still has its base cell on the grid. On the two-seed mean
   grid, the interaction share is the variance left after an additive (row +
   column) fit. F compares that residual with the seed noise read from the
   A − B differences.

An errored evaluation scores 0, which G4 would read as a real drop, so any
error in G4's runs stops it from passing. The tool counts errors in every
phase (G0, G1, the sample, G3's confirmations, G4) and reports them.

A candidate passes only if all six pass. A gate result is a report; the tool
blocks nothing.

**The control.** The repaired Searles halite runs in every batch as a negative
control, with its expected failure written in the candidates file: it must pass
G0–G3 and G5, and fail G4 with salinity mattering, the hold allowed to, and no
other input. The tool checks that signature, and a batch whose control misses
it decides nothing. The control's hold sits exactly on the 4-of-7 edge (its
profile drops 0.25 below its best at 4 levels; at the fifth the margin is 0.01
in the other direction). That is why the signature only allows the hold
rather than requiring it. It also means the control does not test the edge,
since round 2 of review proposed 4 of 7 with this profile in view.

**Borderline passes.** A pass is borderline when a deciding value lies within
10% of its threshold, or a count sits at its minimum: 3 surviving inputs, 1
sample error, 3 inputs that matter, or an input that constrains at exactly 4
of 7 levels. The tool lists them, and lists a G4 input at exactly 4 of 7 even
when G4 fails. A borderline pass gets a second preflight with two new seeds
(`--seeds`) before Stage B is armed, and those seeds join the spent list.

**Checkpoints.** The tool's run log is keyed by one fingerprint per batch: a
hash of the tool's source, its library's, the candidates file's (which holds
the wrappers' constants), the simulator checkout's `tools/_harness.mjs`,
`data/` and `dist/`, its jsdom version, `SIM_VERSION` and the Node version.
`meta.json` records each hash. Any edit to any of them re-runs everything, and
neither G0 nor a run that errored is ever reused. The rest of `node_modules`
and the operating system are not covered. The default output lives under the
tool's own checkout, so pointing `--repo` at another checkout never writes
into it.

### How G4 got here

G4 changed three times on 2026-11-03, and the reasons belong in the record.

**The first version** decomposed the variance of the 64-point sample: binned
first-order shares (4 bins, bias-corrected), with the remainder called
interaction. It passed if the largest share was at most 0.60, at least 3
inputs reached 0.05, the remainder reached 0.10 and seed noise stayed under
0.50.

**The timeline,** local time:

- About 12:45 and 12:48–12:50: two smoke runs of the stalactite candidate went
  through the first version. The first was deleted when the G1 trace moved to
  the host cells, so only the second is on disk. Both failed G4 and G5 (pH
  0.70 of the variance, hit rate 15.6%).
- 12:50: the batch started.
- 13:06: the control's result came in. It failed the first version by a hair
  and for the wrong reason: salinity 0.04, "competitors" 0.06, remainder 0.81.
  One more hundredth for salinity and the control would have passed.
- 13:08: the known-answer test (below).
- About 13:10: the second version was written. It used profiles through the
  best recipe and a fixed 5 × 5 grid, with an interaction share of 0.20. The
  other four candidates' results had not been read yet: dripstone finished at
  13:12, and all four were first read at 13:30.
- 13:31: a diagnostic switch was added that runs G4 after an earlier failure.
  It cannot change a verdict.
- 13:32–13:53: the batch was re-analysed under the second version. The
  control failed it with salinity and the hold mattering.
- 14:40: after review round 1, the control's signature was written into the
  candidates file. So for this batch it was written after the re-analysis had
  shown which inputs mattered. It names the same two the PR #46 review had
  predicted on 2026-11-02. Apart from those lines, the candidates file is the
  one written at 12:41, before any run.

**Review round 1** found two flaws in the second version:

- **Its grid had fixed levels** and could miss a region narrower than their
  spacing, the same resolution limit as before. It passed an AND-shaped region
  at one position and failed it at two others.
- **Its noise check** used the sample's seed noise, measured where most scores
  are 0.

The third version put the base recipe on the grid's axes, added seed-B
replicates and an F test, and lowered the interaction share to 0.10, because
the textbook product x1·x2·x3 sat exactly on 0.20. It was tested on known
answers and re-run clean at 14:43–15:29, after a stalactite smoke run at
14:40–14:43. The tool's last edit for that run, to its summary line, was saved
at 14:43:35, after the smoke run and before the batch.

**Review round 2** found that the third version let one dominant input plus
cliffs at the bounds pass. A function with a narrow band in x1 that dies when
x2 or x3 passes 0.9 passed G4: those two inputs "moved the score" at one level
of seven, though a random recipe avoids them 81% of the time.

The fourth version, the one above, counts an input only if leaving its best
value costs 0.25 on at least 4 of 7 levels. It also counts errors in every
phase, and a G4 with an errored evaluation cannot pass. It was tested on known
answers including that cliff shape, smoke-run on stalactite at 16:10–16:13,
and re-run clean at 16:13–16:51.

**Review round 3** found nothing that must change, and several things worth
changing. G4's rule stayed as it is; the other changes were:

- the fingerprint now covers the simulator checkout's harness and jsdom
  version;
- a logged run that errored is never reused;
- the borderline report covers a G4 input at exactly 4 of 7 even when G4
  fails;
- the control's signature was loosened, because its hold sits on that edge
  (see the control, above);
- the known-answer file gained cases for the base point, the seed-B check, the
  share test, the grid's choice of inputs and F's formula.

The batch was then re-run clean at 17:25–18:15. That run is the evidence below.

**Why this is defensible.** Every verdict is the same under all four versions:
the control fails G4, the cave calcites fail G5, and MVT fluorite and
epithermal gold fail G3. The control forced the first change, the reviews
forced the rest, and each version was tested on functions with known answers.
No threshold was tuned on the four candidates. The control is a different
matter: the 4-of-7 edge was proposed with its profile in view, so the control
confirms that the gate rejects the Searles shape. It is not an independent
test of where the edge sits.

**What was dropped:** the first version's cap of 0.60 on the largest share.
"Rather than one dominant variable" now rests on "at least 3 inputs hold the
score up across their range", read from the profiles, plus the interaction
test.

**The known-answer test** is `proposals/evidence/inverse-design-g4-estimator-check.mjs`.
It runs in seconds, needs no simulator, and checks its true values by Monte
Carlo.

| Function on the gate's 64-point design | True first-order share of x1 | Binned (first version) | Rank estimator |
|---|---:|---:|---:|
| narrow band in x1 | 0.99 | 0.22 | 0.80 |
| band(x1) × x2 | 0.73 | 0.12 | 0.31 |
| Ishigami, x2 (true 0.44) | — | 0.00 | 0.25 |
| a pure-noise input (true 0) | — | 0.00 | 0.29 at p 0.009 |

The final G4 on functions whose structure is known. The file asserts each
verdict and the reason for it (which inputs matter, or which test fails it),
and exits non-zero if either goes the wrong way or an asserted case never
reaches G4:

| Function | Final G4 | Expected |
|---|---|---|
| narrow band in x1 | FAIL: only x1 matters | FAIL |
| band(x1) × x2, the Searles shape | FAIL: only x1 and x2 matter | FAIL |
| band(x1) × [x2 < 0.9] × [x3 < 0.9], three variants (round 2's cliff shape) | FAIL: only x1 matters; the cliffs drop it at 1 of 7 levels | FAIL |
| AND of bands in x1 and x2 × (0.2 + 0.8 x3), two positions | PASS, share 0.17 | PASS |
| the same AND region with x3 acting on seed A only | FAIL: seed B does not confirm x3 | FAIL |
| AND(x1, x2) × 0.7 + 0.3 p(x3): the interaction lives only between x1 and x2 | PASS, the grid picks x1 × x2 | PASS |
| the AND region at every position on a 0.05 lattice whose bands avoid the grid levels 0.25, 0.5 and 0.75 | 45 of 45 that reach G4 PASS | PASS |
| the AND region at every position on a 0.01 lattice whose bands avoid all 7 profile levels, so only the base point is inside | 61 of 61 that reach G4 PASS | PASS |
| (x1 + x2 + x3) / 3 | FAIL: no input holds the score up | FAIL |
| sum of three peaks, one per input | FAIL: share 0 | FAIL |
| the sum of peaks + 0.15 p(x1) p(x2), no noise (F is infinite) | FAIL: share 0.013, the share test alone | FAIL |
| `gridInteraction` on a fixed 5 × 5 pair of grids | share and F equal their definitions | equal |
| the sum of peaks + noise SD 0.10 / 0.15, 200 repeats each | 0 / 3 false passes | at most 10% |
| the AND region + noise SD 0.05, 200 repeats | 182 of 187 pass | at least 90% |

Nine mutants of the library, each applied to a scratch copy, make the file
fail:
- the base point left out of the profiles;
- no seed-B confirmation;
- an interaction share threshold of 0;
- F halved;
- the grid on the two weakest inputs;
- the round-2 cliff rule;
- grid axes that ignore the base;
- the F test off;
- two inputs enough.

Three cases are reported, not asserted:

- The product x1 · x2 · x3 passes (share 0.20), but its optimum is a corner.
- Round 1's AND region with x3 as (0.5 + 0.5 x3) passes, but there x3 never
  takes the score below 0.5, so it only modulates the score inside the region.
  It reaches exactly 4 of 7 levels, which the borderline rule flags (see the
  caution under G4 in detail).
- Ishigami (rescaled to about 0–1) fails with one input mattering. Its
  interaction is x1 × x3.

The grid tests only the two inputs that matter most, so G4 can miss an
interaction between other pairs. The cliff shape showed it could be fooled
toward passing; the 4-of-7 rule closed that case, and the file asserts it. The
known-answer file is the record of what G4 has been shown to get right.

### First batch, 2026-11-03: no candidate passed

Five candidates were written into
`tools/inverse-preflight-candidates-2026-11-03.mjs` before any of their runs:
the Searles control, and four targets. They were chosen from a census of all 41
scenarios (their events and starting states, where each morphology-classified
mineral grows and how big in the canary's 64-seed sweep, and what a run costs),
and from each target's supersaturation code.

The evidence comes from one clean run of the final tool: main `e86ba58a` on
Windows x64 with Node 24.15.0, one process at below-normal priority on a shared
desktop, 521 simulations and 49 CPU-minutes. It is in
`proposals/evidence/inverse-design-preflight-2026-11-03.json` and its
`-runs.jsonl`; the first analysis, under the first G4, is kept as
`-first-g4.json`.

| Candidate | Target, `L_min` → `L_target` | G1: inputs that survive | G3: best score, confirmed hits | G5: hit rate, best | G4 | Verdict |
|---|---|---|---|---|---|---|
| Searles halite, repaired (control) | 0.5 → 2 mm | salinity, competitors, hold (3 of 6) | 0.56, 2 | 3.1%, 0.56 | only salinity and the hold matter | **FAIL**, on its signature |
| Dripstone calcite (`zoned_dripstone_cave`) | 0.58 → 2.33 mm | all 5 (Ca and Mg at 79%) | 0.88, 10 | 15.6%, 0.88 | not run | FAIL (G5) |
| Stalactite calcite (`stalactite_demo`) | 0.77 → 3.08 mm | Mg, T, pH (3 of 5) | 0.89, 10 | 15.6%, 0.89 | not run | FAIL (G5) |
| MVT fluorite (`mvt`) | 13.1 → 52.6 mm | all 5 | 0.075, 0 | 0%, 0.075 | not run | FAIL (G3) |
| Epithermal gold (`epithermal_telluride`) | 3.1 → 12.4 mm | all 5 | 0, 0 | 0%, 0 | not run | FAIL (G3) |

G0 and G2 passed for all five, and no run errored in any phase. The borderline
notes are the survivor count at its minimum of 3 (the control and stalactite)
and the control's hold at exactly 4 of 7 levels; both candidates fail anyway.
The control cost the most, 25 CPU-minutes, because a repaired Searles run takes
about 11 s; the others cost 2–9 minutes each.

What each one says:

- **Searles, the control.** The survival trace found the first preflight's
  event reading on its own:
  - The winter freeze at step 30 resets temperature and pH, and pH stays
    reset.
  - Temperature comes back partly through the thermal pulses, whose ceiling is
    the starting temperature (`_startTemp`). Each bake resets it again, so it
    keeps its gap for only 17% of halite's growth.
  - The fresh pulse at step 75 erases concentration (10%).
  - Salinity, the competing solutes and the hold survive. All five solutes keep
    at least a tenth of their gap, S and B too, though the freeze floors them.

  Through the best recipe (salinity 153.8 g/L, hold 62.5), salinity scores 0
  at every one of its 7 levels, because the useful band lies between two of
  them. At 140 g/L the largest crystal is smooth but stops at 0.500 mm; at
  160 g/L it reaches 2.5 mm but has no smooth solid. The hold takes the score
  from 0 at 20 steps to 0.91 at 100. Salinity constrains the good region at
  all 7 levels and the hold at 4; the other four inputs move the score by 0.03
  or less.
- **The two caves.** Every recipe that scores at all has a low pH: below 7.94
  in dripstone's 7.4–9.4 box, below 7.71 in stalactite's 7.3–9.3. Ca,
  CO3, Mg and temperature span nearly their whole ranges among those recipes.
  The number of calcite crystals never changes (10 at seed 101 and 8 at seed
  102 in dripstone, 7 in stalactite), but their size does. In the lowest
  quarter of the pH range the largest free crystal averages 2.7 mm in
  dripstone and 3.2 mm in stalactite; in the highest quarter it averages
  0.16 mm. Lower pH means lower supersaturation and larger, smoother calcite.
  8 of each cave's top 10 crystals are longer than `L_target` (dripstone up to
  6.3 mm against 2.33, stalactite up to 4.9 mm against 3.08). Their size term
  is capped at 1, so the score is just their smooth share. The target was too
  easy: Sobol lands in the good region in one recipe in six, and its best
  already scores 0.88–0.89, above the 0.75 headroom limit.
- **Zone overrides, a wrapper lesson.** Both caves set chemistry per zone when
  the simulator is built.
  - In stalactite, the ceiling, floor and wall zones all fix Ca and CO3, so
    those two inputs never reach a cell: they are dead at step 0.
  - In dripstone, the floor zone fixes Ca at 3500 and Mg at 30. At 2 of the 10
    cells where calcite grew (21% of its growth) those inputs are dead, so G1
    reads them at 79%.

  A wrapper input has to change every place the scenario stores that
  chemistry.
- **MVT fluorite** grows to 22 mm (authored 12–13 mm), but the larger crystals
  are mostly stepped: the best score, 0.075, came from a 17.9 mm crystal only
  33% smooth. The authored fluorite already sits at the smooth edge (σ about
  4.96 against the 5.0 limit in `js/45-morphology.ts`), so in this box a larger
  crystal is a stepped one.
- **Epithermal gold** is a morphology tenant whose smooth band ends at σ 1.8.
  In this scenario neither its best useful crystal nor its largest free
  crystal had any smooth solid in 80 runs, and its largest free crystal stayed
  at 2.9–3.2 mm.

### Lessons for the next batch

These go into the next dated candidates file, before any of its runs:

1. **In vugg the events carry the chemistry.** Where events overwrite the
   starting state, the inputs worth searching are event parameters (a pulse's
   strength, a cooling step's size or timing), changed in the wrapper.
2. **A wrapper input changes every copy of that chemistry,** zone overrides
   included.
3. **Scale the target to what the box can reach, and keep the optimum off the
   bounds.** For the cave calcites, open pH downward (for example 6.4–8.4) and
   set `L_target` above the largest crystal the box already grows (6.3 mm in
   dripstone, 11 times its authored size). Then the size term stops capping,
   and the good region is interior and rarer than one recipe in six.
4. **Fluorite and gold need other phenotypes.** For fluorite, the largest
   crystal at a fixed smooth share; for gold, a scenario where it grows smooth
   at all.
5. **Pick targets whose crystal count moves.** In four of the five candidates
   the seed fixed the count of target crystals (one fluorite, four gold, seven
   to ten calcite). So the score's repair against dust, one good crystal
   beating many small ones, was never exercised there. Repaired Searles, where
   the count of free crystals runs from 0 to 12 across the sample, is the only
   candidate that tested it.

### If a candidate passes: the comparison

**Inputs:** only the inputs that survived G1, with the preflighted bounds.
**Seeds:** the four sets above.

**Phase 1, shared foundation.** 256 Sobol recipes over the inputs, each on the
4 training seeds. This set is visible to differential evolution and the
surrogate.

**Phase 2, three arms of 256 new recipes each,** each recipe on the 4 training
seeds:

- **A, Sobol continuation:** the next 256 points of the same sequence. This is
  the coverage baseline, so a sophisticated method is never compared with weak
  sampling.
- **B, differential evolution:** SciPy `differential_evolution` with
  `strategy='best1bin'`, a population of 16 given as `init` (the 16 best
  foundation recipes, so `popsize` is not used), `mutation=(0.5, 1)`,
  `recombination=0.7`, `updating='deferred'`, `polish=False` (polishing spends
  evaluations outside the budget), `tol=0` and `atol=0` (so convergence never
  ends it early), a fixed `seed`, and `maxiter=16`. SciPy re-evaluates the
  initial population; those 16 are exact duplicates served from the cache, so
  the arm's 256 new evaluations are 16 generations of 16. If the population
  ties exactly (all scores equal, which still stops SciPy), the arm's remaining
  budget goes to its own continuation of the Sobol sequence, and the report
  says so. Duplicates are found after quantizing each normalized input to
  `1e-5`.
- **C, surrogate backpropagation:** four active-learning rounds of 64:
  1. train a five-member small MLP ensemble on the surrogate arm's evidence so
     far, except a recipe-grouped 20% held out for success gate 3, with
     recipe-grouped train/validation splits;
  2. predict, per seed, the score and its parts (the size term, the smooth
     share and the number of useful crystals), plus their seed-to-seed spread;
  3. optimize bounded normalized inputs with Adam from at least 128 random
     starts, scoring each candidate as the predicted recipe score minus an
     ensemble-disagreement penalty;
  4. cluster and deduplicate, and keep 64 diverse recipes;
  5. evaluate them in Vugg, add the results to the training set, and repeat.

  The architecture, learning rate, epoch ceiling, early stopping and
  disagreement penalty go into the manifest before the first model is trained.
  The proposal lists are checkpointed with each round.

**Phase 3, finalists.** Each arm's top 8 recipes by training-seed recipe score
run on the 8 selection seeds. The top one by selection score is the arm's
representative, and only the representatives run on the 32 comparison seeds.
The bootstrap of the paired difference (resampling comparison seeds) uses those
seeds only. Duplicate recipes across arms are evaluated once and attributed to
each arm that proposed them.

**Headroom at the comparison's budget.** G5 caps the best of 64 recipes at
0.75, but the Sobol representative is picked from 512. If it scores above
1 / 1.1 ≈ 0.91 on the comparison seeds, success gate 4 cannot be met by any
arm. The verdict is then **inconclusive: no headroom**, and the target goes
back to the gate with a harder scale.

**Exploit checks,** for each representative:

- ±2% on each input on the 4 exploit-check seeds, against the unperturbed
  representative on the same 4 seeds;
- the second cavity shape seed, on 8 comparison seeds;
- a fresh-restart rerun on 4 seeds.

Nominal budget for a five-input target:

```text
shared foundation       256 recipes x 4 seeds   = 1,024 runs
three search arms     3 x 256 recipes x 4 seeds  = 3,072 runs
selection             3 x   8 recipes x 8 seeds  =   192 runs
comparison            3 x   1 recipe  x 32 seeds =    96 runs
exploit checks        3 x (10 x 4 + 4 + 8 + 4)   =   168 runs
                                                    --------
                                                     4,552 runs
```

Run time depends on the target scenario's cost per run, which the gate
records.

### If no candidate passes

Stage B stays unarmed. A new batch of candidates goes through the gate, written
into a new dated candidates file before any of its runs, with the lessons of
the last batch. A failed candidate is not re-scored with a friendlier
threshold.

---

## Phase 0 — provenance and deterministic canary (both stages)

Before spending the night:

1. require a clean, named git commit (`experiments/inverse-design/` is in
   `.gitignore`, so a run directory does not dirty the tree);
2. require Node 24.x: `AGENTS.md` records seed-42 counts that flip under Node
   20/22/23;
3. run `npm run typecheck` and `npm run build:check`;
4. run the existing agent-interface determinism test;
5. run one recipe twice with the same seed and byte-compare its compact summary;
6. reproduce the target scenario's seed-42 row of `seed42_v286.json` on the
   host. Comparing a recipe with itself cannot catch a platform shift; this
   can;
7. record the commit, `SIM_VERSION`, Node/Python versions, CPU count, and hashes
   of `data/*.json*` plus the built bundle;
8. refuse to continue if any of these differ.

---

## Phenotype extraction

The evaluator records compact summaries only; it does not retain the full wall
history or strip dataset for every run. For each seed it records:

- crystal counts by mineral: total, dissolved, enclosed, free, useful;
- the best crystal's length, smooth share and score, and the largest free
  crystal's length and smooth share;
- remaining solid by morphology regime over the target's free crystals;
- target volume share of all free crystals;
- competing-species count and volume;
- final fill and any invariant, NaN, timeout or error flags;
- exact recipe, seed, simulator commit, data hashes, and runtime.

Approximate crystal volume uses the engine's existing crystal dimensions. The
scoring path must not infer quality from rendered pixels.

---

## Overnight execution design

Each stage is a **one-shot armed run**, not a permanent nightly cron. Professor
chooses a night; the runner completes once and does not repeat.

### Operator surface

```bash
npm run inverse:prepare -- --preset halite-cubes-v2 --stage A
npm run inverse:overnight -- --preset halite-cubes-v2 --stage A --start-at 03:30
npm run inverse:status -- --preset halite-cubes-v2
npm run inverse:resume -- --preset halite-cubes-v2
npm run inverse:report -- --preset halite-cubes-v2
```

`prepare` performs Phase 0 and prints the exact budget and estimated finish
time. `overnight` arms one run. `resume` reads the checkpoint and never repeats
a completed recipe/seed pair. Stage B uses its own preset, named after the
target that passed the gate.

### Resource envelope

Run under a transient user systemd service (or equivalent wrapper) with:

- two persistent Node simulation workers maximum, each started with
  `--max-old-space-size=512`;
- `nice -n 15` and idle I/O priority;
- `CPUQuota=160%` so the desktop retains headroom;
- `MemoryMax=1500M`;
- six-hour runtime ceiling;
- a wall-clock timeout per evaluation (300 s), recorded as an error. In the
  final gate run the slowest single run, a repaired Searles recipe, took 175 s
  against a median of 4 s, and earlier that day an MVT recipe took 111 s once
  and 3.9 s in a later run. So the limit should be generous: it guards against
  a slow box as much as a slow recipe;
- no network requirement after start;
- worker recycle after 250 recipe tasks in Stage B (every 10 in Stage A, so
  recycling is exercised);
- checkpoint after every completed recipe;
- stop proposing new work if available memory drops below 1.0 GiB;
- stop cleanly at the runtime ceiling and leave a resumable checkpoint.

Memory, measured: one long-lived simulation process sat at 650–800 MB (plateau
by about 25 runs, peak 802 MB) on Windows with free RAM, not the 331 MB
measured for a single run. Recycling every 250 recipe tasks (1,000 runs) does
not lower that plateau. The heap cap should, but that is not measured yet;
Stage A measures it on the host (A10).

The host's login session currently reports only a lingering user, so
`loginctl IdleHint` is not trustworthy enough to decide whether Professor is
using the computer. The honest v1 mechanism is therefore explicit arming plus
low-priority resource controls. A later desktop-idle detector may pause between
recipe batches, but it must first be proven against real input activity.

The default suggested start is 03:30 local time on Rock Bot's four-core Linux
host, after the 02:15 catalog backup and the 03:00 research invitation. Because
DST changes on the night this proposal was written, the launcher must let
systemd resolve local civil time rather than manually converting it to UTC. If
either stage ever runs on the Windows calibration box instead, it must not
overlap the vugg-canary sweep, which runs there from 04:00 and fills the
window to about 09:00.

### Failure behavior

- A single simulation failure or timeout is recorded and scored zero; the batch
  continues.
- Three consecutive infrastructure failures stop the run.
- A determinism failure, provenance mismatch, NaN flood, or checkpoint write
  failure stops immediately.
- The original checkpoint is never rewritten in place: write temporary, fsync,
  rename.
- Morning notification contains only status, elapsed time, completed/total,
  and the report path. It does not claim scientific success before held-out
  validation completes.

---

## Artifacts

One versioned directory per run:

```text
experiments/inverse-design/<preset>/<run-id>/
  manifest.json
  seeds.sealed.json
  recipes.jsonl
  evaluations.jsonl
  phase0.json, replay.jsonl, identity.jsonl, resume-reference.jsonl
  checkpoint.json
  models/
  finalists.json
  report.md
  plots/
  logs/
```

`manifest.json` is immutable after launch except for a final completion block.
Large model files and raw run output remain experiment artifacts, not source
control. The proposal, evaluator, schemas, compact finalist data, preflight
summaries and final report may be committed after review.

The Stage A report covers provenance and completeness, wall-clock and resource
use, A1–A10 one by one, the known-answer check, and the fault drills. The
Stage B morning report must include:

- exact provenance and completeness;
- wall-clock and resource use;
- method-by-method held-out table;
- score component breakdown, not only the scalar rank;
- robustness distributions across unseen seeds;
- surrogate calibration/error and ensemble disagreement;
- best recipes plus nearest sampled neighbors;
- boundary-hugging and exploit checks;
- a plain-language verdict: **supports surrogate backprop**, **black-box only**,
  **inconclusive**, or **pipeline failure**.

---

## Success gates (Stage B)

The pilot supports continuing to a second target only if all are true:

1. Stage A passed on the same commit, and Phase 0 passes;
2. at least 99% of scheduled evaluations complete normally;
3. the surrogate predicts held-out phenotype components materially better than
   a mean-only baseline. Held out means the 20% of the surrogate arm's recipes,
   grouped by recipe, that no ensemble member trained on. Materially better
   means a root-mean-square error at least 30% below the mean-only baseline's,
   for the per-seed score and for at least two of its three parts (size term,
   smooth share, useful-crystal count);
4. the surrogate arm's representative scores at least 10% above the Sobol arm's
   representative on the comparison seeds, with a bootstrap 95% interval for
   the paired difference above 0;
5. the representative does not win solely by sitting on an input bound;
6. its 10th-percentile comparison seed still has a useful crystal (seed score
   above 0);
7. visual inspection agrees with the numerical morphology summary (see the
   renderer caution under the score).

If differential evolution wins but clears the same robustness gates, the
verdict is **black-box inverse design works; backpropagation has not yet earned
deployment**.

If no optimizer beats Sobol, preserve the full negative result. Do not tune the
score after seeing it.

---

## Exploit checks

Before treating a candidate as meaningful:

- perturb every input by ±2% and verify performance does not collapse, against
  the unperturbed recipe on the same seeds;
- compare it to its nearest real evaluated neighbors;
- inspect saturation and morphology histories, not only final crystals;
- rerun with a second fixed cavity shape seed as an out-of-distribution check;
- reject recipes whose advantage comes from an exception, empty assemblage,
  impossible fluid value, scoring bug, or renderer/serialization mismatch;
- list which input bounds were touched;
- rerun the top recipe after a fresh process restart.

These are in the Stage B budget above. The optimizer is expected to find cracks
in our model. Finding one is useful, but it is a simulator bug report, not a
crystal recipe.

---

## Implementation boundary

The first implementation may add:

- an experiment-only recipe adapter;
- compact phenotype extraction and the repaired score;
- an NDJSON persistent Node worker around the existing headless harness;
- a Python coordinator using installed NumPy/SciPy/scikit-learn/PyTorch;
- tests, schemas, checkpoint/resume, and report generation;
- a one-shot low-priority launcher;
- the preflight tool, its library and its candidate files (already here, under
  `tools/`).

It may **not**:

- retune mineral constants or scenario chemistry to improve the result;
- change production scenario output;
- add an automatic recurring cron;
- interpret simulator units as a direct lab protocol;
- introduce hazardous lab targets;
- publish or merge results without review.

---

## Follow-on ladder

Only after Stage B has run on a target that passed the gate:

1. repeat with a second morphology target, likely calcite form/habit;
2. test transfer to a nearby scenario or cavity seed;
3. add laboratory-measurable inputs and explicit uncertainty;
4. run a small real halite growth experiment;
5. use measured outcomes to calibrate the simulator/surrogate loop;
6. only then call the output a candidate physical growth recipe.

The long-term system is not "AI tells us how crystals grow." It is a closed
loop in which simulation proposes, experiment answers, and the model becomes
less wrong one night at a time.
