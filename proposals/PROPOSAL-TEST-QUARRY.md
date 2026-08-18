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

## 6b. Process hygiene — a separate defect from test duration

Added 2026-08-18 after the foreman brief. **Leakage and duration must not be diagnosed as
one thing**, and this section keeps them apart: the census measures the population and
never blames the suite.

### What the first look found

The brief asked for a pre-reboot receipt — JS processes by age and memory, preserved
before anything changes. Taken immediately, it found **no sedimentary layer**: 6 JS
processes, oldest 1.77 h, against 39.8 h of uptime. Nothing days old. The 12 193 s run did
not leak workers.

It found something live instead:

```
PID 10124  age 1.77 h   node tools/test-workflow.mjs --fresh
PID 24276     child     vitest ... AI\GTP\Vugg-Simulator\node_modules\vitest\vitest.mjs
```

**Another agent had been running a full cold suite out of the GTP checkout for 1.77
hours**, overlapping a serial-vs-parallel benchmark launched 17 minutes earlier. Nothing
refused it, nothing recorded it, and the only reason it was caught is that someone looked.
That is the whole argument for a preflight gate: *a benchmark on a contended machine does
not report an error, it reports a NUMBER* — and the number goes into a proposal and then
into a design decision.

The contaminated arm was killed by owned tree: children by PID and ancestry, then the
root, then verified zero descendants remained. Never by name.

### What the collision was worth measuring

The serial arm completed before the kill: **1030.4 s against 990.4 s** for the same six
files in the clean profile — and ~8.5 s of that gap is child-start tax the arm avoided by
running one child instead of six. **That collision cost roughly 5%.**

*Scope, corrected on review.* This bounds **that** collision — one other serial suite on a
16-thread host — and not contention in general. It says nothing about several agents each
launching parallel scenario runs, subagent fleets, or a browser job; two single-threaded
suites on sixteen threads is close to the friendliest overlap the machine can produce. The
honest claim is narrow: **ordinary two-suite overlap cannot by itself manufacture a
fifteen-minute file.** Anything larger is unmeasured, and now instrumented rather than
argued.

### Host facts, measured rather than assumed

| | |
|---|---|
| RAM / cores | **63.9 GB**, 8 physical / **16 logical** (Ryzen 7 5800X) |
| page file | 4096 MB allocated, **94 MB peak used since boot** |
| uptime at census | 39.8 h — **covers the 12 193 s run** |

Peak page-file usage of 94 MB across an uptime window containing the whole run rules out
**meaningful paging**. *Corrected on review — the first draft of this section said it
proved "no reclaim or memory pressure at any point", which is too strong.* Windows can
trim working sets and evict standby cache under physical-memory pressure without ever
growing page-file occupancy, so a small page file is evidence about paging and only about
paging. **Physical pressure must be adjudicated by the time-series sampler, not by that
historical number** — which is one more reason telemetry is now bound to the run rather
than left to be remembered.

**This corrects §3 of this document.** It priced the formation check at 65–97 min because
"2–3 shards is what RAM holds." RAM was never the constraint — 1676 MB worst case against
63.9 GB. **Cores are.** By the same table, 8 shards is **24.3 min**, before any file
splitting. The serial config's own justification — "eight workers consumed most system
RAM" — does not hold on this hardware, which makes re-measuring it the highest-value
experiment in the plan. **Still owed**: the machine has not been quiet since.

### Built, and honestly not built

| brief bullet | status |
|---|---|
| preflight census; refuse if unrelated Vugg workers exist | ✅ **wired.** `test-workflow.mjs` calls it on every full-suite run and `cold-ci.mjs` refuses before spending a minute on gates. Verified live: the runner refused while the GTP suite held the box |
| owned process trees, verify zero descendants | ✅ **wired**, in a `finally` so it runs on the failing path too — a crash is when workers are likeliest to be orphaned. It now *kills*, scoped strictly to our root's descendants |
| Windows Job Objects | ❌ **blocked, and named separately.** Node has no Job Object API; this needs a native addon. `taskkill /T /F` tears down a *known* tree but cannot help with an abandoned parent, which is the exact case Job Objects exist for. The owned-tree sweep covers polite and crashing exits; it does not cover an abandoned root |
| machine-wide lease / queue | ✅ **built**, at `%TEMP%/vugg-foreman/run-lease.json` — deliberately **outside any checkout**, because a lease under `.local-evidence/` cannot see a rival checkout's lease, and two working copies sharing one CPU is the exact collision this exists to stop. Holder identified by `(pid, startedIso)`: PIDs are recycled, and a lease naming only a PID is one reuse away from a stranger blocking every future run |
| run manifest with run ID, owner, PID, tier, heartbeat | ✅ the lease **is** the manifest; heartbeat every 15 s, stale at 90 s — far below a single batch's 900 s worst case, so a healthy 15-minute file never reads as abandoned |
| host telemetry started/stopped with the run | ✅ **in-process**, keyed to the run's identity hash and recorded *in the completion report*. A hygiene subsystem that spawns its own long-lived child is one crash from being the leak it was built to catch |
| batch↔telemetry correlation | ✅ every batch now carries `started_iso` / `finished_iso`, so "which file was running when the machine went busy" is answerable |
| contaminated runs visibly contaminated | ✅ `--allow-busy` proceeds but stamps the run; `full_suite_pass` goes **false**, `trust` reads `CONTAMINATED-…`, and `test-profile` leads with it. A run with no foreman record reports cleanliness **UNKNOWN** rather than clean |
| startup hygiene report | ✅ `--hygiene` — never kills, never exits non-zero |
| concurrency experiment on a clean host | ❌ **still owed.** The machine has not been clear since; preflight has refused every attempt, which is the system working |

Host telemetry is a separate instrument: `tools/host-sampler.mjs` records free RAM and
aggregate CPU every second in-process, with competitor identity on a 10 s cadence. The
slower cadence is deliberate — the runner's RSS watchdog already shells out every second
and two consecutive failures kill a batch, so a second per-second spawn would make it
likelier to false-RED a healthy run. Observing harder must not break the thing observed.
A missed scan is recorded as `top_error`, never omitted: a telemetry gap must look like a
gap and not like a quiet machine.

### The rule the tool enforces about accusation

**A name is not evidence.** OpenClaw, MCP servers, language servers and editors are all
`node.exe` with a long uptime. A process is a leak candidate only when its command line
points into a checkout **and** it is older than the threshold **and** it is not a
descendant of a live run — all three printed beside the verdict, so a reader can disagree
with the classification instead of trusting it.

### Two defects this tooling shipped, and then caught

1. **A leak detector that could never fire.** `ConvertTo-Json` renders a CIM date as
   `/Date(…)/`; `new Date()` gave NaN; `NaN >= STALE_HOURS` is false for every process
   ever examined. The tool printed a tidy table, exited 0, and meant nothing. Ages are now
   formatted to ISO inside PowerShell, an unreadable start time is `null` rather than NaN,
   and the report prints `?` with *"AGE UNKNOWN — cannot judge staleness"*.
2. **A rival checkout classified as our own.** Matching on basename made
   `GTP/Vugg-Simulator` indistinguishable from `vugg/vugg-simulator` — the one
   misclassification that would have waved a contended benchmark through as clean. Now
   matched on the full checkout path.

A third was caught by the tests rather than in use: `descendantsOf` returned the root as
its own descendant under a parent cycle, so a caller terminating "descendants, then the
root" would have counted the root as a survivor of itself. PIDs are recycled, so cycles
are not hypothetical.

`tests-js/process-census.test.ts` pins all three, and every staleness assertion has a
negative twin — a gate is only a gate if something proves it can say **both** yes and no.
9/9, and the file never touches `VugSimulator`, so it lands in the non-stepping tier where
the chip check will live.

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
