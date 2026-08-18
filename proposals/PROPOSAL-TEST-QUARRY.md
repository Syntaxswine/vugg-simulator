# PROPOSAL — The Test Quarry: three cuts, and where the hours actually are

**Status:** census complete, instruments built, **first uninterrupted profile earned**.
**Date:** 2026-08-18. **SIM 267**, HEAD `b287741`.
**Origin:** the boss's Test Quarry brief — chip check / formation check / core sample,
with a seven-step repair contract opening on *"instrument the existing cold run and
publish its time profile"*, and Rock Bot's warning: *do not rerun the old opaque
instrument unchanged; measure the excavation while it happens.*

Every number below is measured on this host and re-earnable with the command beside it.
Nothing here is extrapolated from a comment.

---

## 0. The headline correction: the cold run is 3.4 hours, not 2.4

`.ci-stamp.json` said **8773 s**, and that figure has been quoted in handoffs and in
memory as the cost of a cold run. **It was never a full-suite time.** That run resumed
from a checkpoint and ran only the suffix — the runner said so at the time, in its own
words: *"no full-suite PASS was issued; rerun with `--fresh` for one uninterrupted
result."* The caveat was read as being about process purity. It was also about duration.

The first uninterrupted measurement, `npm test -- --fresh`, 2026-08-18:

| phase | measured |
|---|---|
| 232 test batches | **12 193 s** (203.2 min) |
| project-identity re-hash, 232 checks | 206 s |
| `npm run ci` gates before `npm test` | 56 s |
| **full cold CI** | **≈ 12 455 s ≈ 3 h 28 m** |

That is 42% more than the number the repository believed. Nothing in the tree could
have contradicted it, because until this week nothing in the tree recorded time.

---

## 1. Four of the brief's premises came back different

| brief says | tree says |
|---|---|
| "176 test files" | **232** test files. 176 is the count of `dist/*.js` — the compiled bundle modules |
| "60 seconds per test and 120 seconds per hook" | `testTimeout: 900_000` (**15 min**), `hookTimeout: 180_000` (**3 min**) — sized for one authored scenario, not inflated by contention |
| "Vitest initializes the bundle and jsdom per file" | true, and it costs **1.7 s per child** — the whole tax is ~6.6 min of 203 |
| "do not merely add more workers" | already the config: `maxWorkers: 1`, `fileParallelism: false`, one file per child. There is no parallelism left to stop adding |

The diagnosis was right in kind and off in size. Every structural inefficiency the brief
names, added together, is about eleven minutes of a two-hundred-minute run.

---

## 2. Where the time is — measured twice, by two methods

**By subtraction:** 12 193 s minus the gates (56 s), the per-child setup (232 × 1.7 s
≈ 394 s) and the identity re-hash (206 s) leaves ~11 537 s, or 94.6%, inside the test
bodies.

A subtraction inherits every error in its terms and can never be wrong out loud. So the
second instrument wraps `VugSimulator.prototype.run_step` and counts while it runs:

```
232 files   sum wall 11 681 s   sum run_step 9 787 s   =  83.8 %
95 560 run_step calls across 667 simulator instances
127 of 232 files never call run_step at all
```

Two independent methods, one answer: **the cold run is the simulator stepping.** The
remaining in-file time is dominated by simulator *construction*, not by harness overhead
— `anchor.test.ts` spends 2.1 s in one `runScenario` call of which only 0.83 s is
stepping.

### The distribution is savagely concentrated

```
min 2.1 s   p50 7.6 s   p90 113.5 s   p99 744.5 s   max 895.7 s

 10 files hold 50% of the run  (102.2 min)
 36 files hold 80%             (163.4 min)
 60 files hold 90%             (183.2 min)
→ the other 172 files share 10%  (~20 min, a quarter of it child-start tax)
```

| heaviest | s | share | peak MB |
|---|---|---|---|
| `conichalcite.test.ts` | 895.7 | 7.3% | 1465 |
| `vanadate-v-economics.test.ts` | 888.6 | 7.3% | 888 |
| `calibration.test.ts` | 744.5 | 6.1% | 1018 |
| `fortress-saves.test.ts` | 717.7 | 5.9% | 712 |
| `eh-subsumption.test.ts` | 567.6 | 4.7% | 913 |
| `fluid-spots.test.ts` | 546.8 | 4.5% | 894 |
| `calibration-assertions.test.ts` | 542.9 | 4.5% | 1045 |
| `o5-masking-gate.test.ts` | 517.1 | 4.2% | 895 |

---

## 3. The three cuts, priced

### Chip check — **under 3 min is reachable, and batch size is the lever**

127 files never step. Serially they cost **442 s (7.4 min)** — of which **216 s is pure
child-start tax**, because the runner spawns one Node process per file. Batched into
~8 children that set runs in **≈ 240 s**.

Here is the inversion worth noticing: **`DEFAULT_TEST_BATCH_SIZE = 1` is 3% of the full
run and 49% of a chip check.** The overhead the brief over-weighted for the cold run is
exactly the right thing to fix for the tier it proposes. Batching is a *chip-tier*
optimisation, and it was never a full-suite one.

Caveat before batching by memory: **the RSS manifest under-measures short batches.** The
sampler polls at 1 s, so a 2 s batch yields one or two samples; the 211 MB floor in the
record is an undersample. Raise the poll rate before trusting peak RSS as a batching
input.

### Formation check — **12–15 min is unreachable by sharding**

You cannot shard below your longest indivisible unit, and that unit is **893.8 s —
14.9 minutes** in one file.

| shards | wall clock |
|---|---|
| 2 | 97.3 min |
| 3 | 64.9 min |
| 4 | 48.7 min |
| 8 | 24.3 min |
| 14 | **14.9 min — floor, set by one file** |

RAM decides how many are real: p50 peak 618 MB, max 1676 MB, per-child ceiling 2048 MB,
and the config's own history records eight workers consuming most of system memory. Two
to three shards is what this workstation holds → **65–97 min**, not 12–15.

**To reach the brief's target the heavy files must be split, not merely distributed.**
`conichalcite` and `vanadate-v-economics` are 1784 s between them in two files. That is
the intervention the target implies, and it is not in the seven steps.

### Core sample — unchanged, and now honestly priced at 3 h 28 m

---

## 4. The trajectory cache: measured ceiling **432 seconds**

The brief calls this "the largest structural win" and expects it to "collapse a large
part" of the run. The census counted it:

```
69 runScenario calls in the entire suite      45 distinct triples      13 repeated
time in runScenario ................ 1 413 s  = 11.6 % of the run
recomputed duplicates .............. 432 s    =  3.5 % of the run
of which ONE triple (supergene_oxidation|42|200, twice) .... 283 s
```

Three things follow.

1. **88% of the run never enters the cacheable path at all.** 118 of 232 files build
   `new VugSimulator(...)` from hand-built conditions; only 5 use `runScenario`
   exclusively. `redox.test.ts` — 58 s, 4 sims, 94.1% of its wall inside `run_step` — is
   invisible to a scenario-keyed cache.
2. **A within-process memo saves almost nothing**, because batch size 1 puts duplicate
   callers in *different processes*. The cache would have to be on disk, which means
   serialising and rehydrating a live `VugSimulator` whose `crystals`, wall meshes,
   ledgers and strip recorder the assertions read all over. Any field that does not
   survive the round trip silently weakens every test that reads it — a large surface
   with a quiet failure mode, for 3.5%.
3. **Two thirds of the benefit is one edit.** 283 s of the 432 s is a single scenario run
   twice. Merging those two call sites costs minutes and needs no cache.

**Recommendation: do not build it.** Take the one edit; leave the machinery.

---

## 5. What was built

- **`tools/test-workflow.mjs`** now records `wall_ms` per batch, carried *explicitly*
  through `makeTestCheckpoint` — that mapper rebuilds every record on every write, and a
  field it does not name is dropped, which is how the runner came to hold 232 peak-RSS
  figures and not one timestamp. The identity re-hash is timed separately so the runner's
  own guard never gets charged to a test file.
- **`tools/test-profile.mjs`** publishes the distribution. Passive instrument, never a
  gate: exit 0 at any speed, the only non-zero exit being "I could not measure". Missing
  `wall_ms` reads as unknown, never zero; percentiles cover measured batches only; **a
  shard plan is refused outright on a partial record.**
- **`tests-js/setup.ts` + `tests-js/helpers.ts`** carry the excavation census, gated on
  `VUGG_SCENARIO_CENSUS`. Off — every ordinary run and all of CI — it is one env read and
  the prototype is never touched. SIM-neutral; nothing shipped. Measured A/B overhead:
  below run-to-run noise (60.3 s with, 61.2 s without).

### Two traps this run paid for

**Any repo write during `npm test` kills the run.** The identity guard hashes all 5990
files and aborts on change. Run 1 died at batch 3 because a proposal file was written
while it ran. This is why the census writes to `.local-evidence/` — the one directory
excluded from that hash. An instrument that lands anywhere else destroys the measurement
it is taking.

**Attribution is not decoration.** The first census could say
`supergene_oxidation|42|200` was excavated twice and could not say by whom, because the
scenario record carried no file — so the single edit worth two thirds of the cache's
entire benefit was not locatable from the receipt. Fixed; the next run names it.

---

## 6. The repair contract, reordered by what was measured

1. ✅ **Instrument.** Both instruments built; first uninterrupted profile published.
2. ✅ **Answer the cache question before building the cache.** Answered: ceiling 432 s.
3. **Chip check.** First structural work. Its lever is **batching**, worth ~200 s of a
   ~440 s tier — and worth ~3% of the full run, which is why it belongs here and not
   there. Needs an authored changed-file → subsystem map; that map is the deliverable.
4. **Split the heavy files.** A precondition for any formation-check target under an
   hour, and absent from the original seven steps. Start with the two ~890 s files.
5. **Shard, balanced from §2's durations, concurrency capped by RAM** (2–3, not "more
   workers"). Expect 65–97 min until step 4 lands.
6. **Remove the duplicate `tsc`** — it runs three times per cold run. Hygiene, **~8 s**.
   Do it; do not bill it as speed.
7. **Merge the duplicated `supergene_oxidation` call sites.** 283 s, minutes of work.
8. ~~Trajectory cache.~~ **Declined on measurement**, §4.
9. **Prove the new full check finds every deliberately seeded failure the old one finds.**
   Unchanged and non-negotiable. Mutation-test the tiering itself: a seeded break must
   turn its *chip* check red, not merely the formation check, or the fast tier is
   decoration.
10. **Replace the "9-minute" comment with a measured budget.** It lives at
    `tools/cold-ci.mjs:20` and in the `vugg-session-start` skill. The 570 s it descends
    from was earned at **SIM 237**. The true figure is **3 h 28 m** at SIM 267.

---

## 7. The disagreement, stated plainly

Rock Bot's instinct — eliminate repeated excavation rather than parallelise harder — is
right about method and wrong about this quarry's stratigraphy. The repeated excavation
that actually exists is **432 s of trajectory duplication plus ~650 s of harness
overhead: about 18 minutes of 203.** Eliminate every second of it and the cold run is
3 h 10 m instead of 3 h 28 m.

The other 94% is not repetition. It is 95 560 `run_step` calls doing the work the
assertions ask for, concentrated so hard that ten files hold half the clock. You get that
time back by **running it less often** (tiers), by **running it concurrently** (shards,
RAM-capped), and by **breaking up the ten files that own the run** — not by caching,
because the thing being computed is a live object graph the assertions read all over.

The three cuts are the right shape. The chip check is the win. 🪨
