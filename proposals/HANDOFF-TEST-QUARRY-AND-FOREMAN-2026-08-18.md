# HANDOFF — The Test Quarry, and the foreman (2026-08-18)

**Branch:** `ci/test-quarry` → [PR #2](https://github.com/Syntaxswine/vugg-simulator/pull/2), 4 commits, cleanly on `main`.
**SIM 267, unchanged.** No `js/` edit, no `SIM_VERSION` bump, no baseline regen owed — every commit here is instrumentation.
**Companion:** [PR #1](https://github.com/Syntaxswine/vugg-simulator/pull/1) (`atlas/crystal-neighborhoods`) is independent; either may merge first.

Built on the boss's Test Quarry brief (chip / formation / core sample) and Rock Bot's
review passes. The three-cut architecture survived every measurement. The causal story
underneath it did not, twice.

---

## 1. THE NUMBER THAT CHANGED, AND WHY IT WAS WRONG

**A full cold CI is 3 h 28 m, not 2.4 h, and never was 9 minutes.**

| phase | measured |
|---|---|
| 232 test batches | **12 193 s** (203.2 min) |
| project-identity re-hash, 232 checks | 206 s |
| `npm run ci` gates before `npm test` | 56 s |
| **total** | **≈ 12 455 s ≈ 3 h 28 m** |

The 8773 s in `.ci-stamp.json` was a **resumed segment**, not a full suite. The runner said
so at the time — *"no full-suite PASS was issued; rerun with `--fresh`"* — and that caveat
was read as being about process purity. **It was also about duration. A resumed run's
duration is a segment, never a total.** The 570 s the `vugg-session-start` skill descends
from was earned at SIM 237.

Nothing in the tree could have contradicted any of this, because until this week
`test-workflow.mjs` recorded peak RSS for every batch and **not one timestamp**.

---

## 2. WHERE THE TIME ACTUALLY IS

Measured twice, by two methods, because a subtraction inherits every error in its terms
and can never be wrong out loud.

```
by subtraction   12 193 s minus gates, per-child setup and identity re-hash → ~94.6% in test bodies
by measurement   run_step wrapped and counted: 9 787 s of 11 681 s in-file  →   83.8%
                 95 560 run_step calls across 667 simulator instances
                 127 of 232 files never call run_step at all
```

**The distribution is savagely concentrated:**

```
min 2.1 s   p50 7.6 s   p90 113.5 s   p99 744.5 s   max 895.7 s

 10 files hold 50% of the run     36 hold 80%     60 hold 90%
→ the other 172 files share 10%
```

`conichalcite` 895.7 s · `vanadate-v-economics` 888.6 s · `calibration` 744.5 s ·
`fortress-saves` 717.7 s · `eh-subsumption` 567.6 s · `fluid-spots` 546.8 s

Run `node tools/test-profile.mjs --top 20` for the live table. It reads the last run's
record; it never re-runs anything.

---

## 3. WHAT THE MEASUREMENTS DECIDED

### The trajectory cache is DECLINED — ceiling 432 s (3.5%)

The brief called it "the largest structural win." The census priced it:

```
69 runScenario calls in the whole suite   45 distinct triples   13 repeated
time in runScenario ......... 1413 s  = 11.6 % of the run
recomputed duplicates ....... 432 s   =  3.5 %
of which ONE triple ......... 283 s   (supergene_oxidation|42|200, twice)
```

88% of the run never enters the cacheable path — **118 of 232 files build
`new VugSimulator(...)` from hand-built conditions**; only 5 use `runScenario`
exclusively. And with batch size 1 the duplicate callers sit in different *processes*, so
an in-process memo saves nothing: the cache would have to serialise a live simulator whose
crystals, wall meshes, ledgers and strip recorder the assertions read all over.

**Two thirds of its whole benefit is one edit** — merge the duplicated
`supergene_oxidation` call sites. Take that; leave the machinery.

### The formation check cannot reach 12–15 min by sharding

You cannot shard below your longest indivisible unit, and that unit is **893.8 s = 14.9
minutes in one file**.

| shards | wall clock |
|---|---|
| 2 | 97.3 min |
| 3 | 64.9 min |
| 4 | 48.7 min |
| 8 | 24.3 min |
| 14 | **14.9 min — floor, set by one file** |

**Reaching the target means SPLITTING the heavy files, not distributing them.** That step
was not in the original seven and is now a precondition. `conichalcite` and
`vanadate-v-economics` are 1784 s between them, in two files.

### Batch size is a CHIP-tier lever, not a full-suite one

The 127 non-stepping files cost **442 s serially, of which 216 s is pure child-start tax**.
Batched into ~8 children: ~240 s. So `DEFAULT_TEST_BATCH_SIZE = 1` is **3% of the cold run
and 49% of a chip check** — the overhead the brief over-weighted for the full run is
exactly the right fix for the tier it proposes.

---

## 4. THE FOREMAN — process hygiene as a separate defect

Leakage and duration are different defects; the tooling keeps them apart. It measures the
population and never blames the suite.

**What the first look found.** No sedimentary layer: 6 JS processes, oldest 1.77 h, against
39.8 h of uptime. The 12 193 s run took its tools home. But it caught, live, **another
agent running a full cold suite out of `AI\GTP\Vugg-Simulator` for 1.77 hours**, overlapping
a benchmark launched 17 minutes earlier. Nothing refused it. That collision cost ~5%
(1030.4 s vs 990.4 s on the same six files) — which bounds *that* collision and not
contention in general.

### The tools

| tool | what it does |
|---|---|
| `tools/process-census.mjs` | `--preflight` (refuses, exit 1), `--postflight <pid>`, `--hygiene` (never kills, never exits non-zero) |
| `tools/host-sampler.mjs` | free RAM + aggregate CPU every 1 s in-process; competitor identity every 10 s |
| `tools/foreman.mjs` | preflight + machine-wide lease + telemetry + postflight, as one lifecycle |
| `tools/concurrency-probe.mjs` | the 1/2/4/8-worker experiment, under the foreman |
| `tools/test-profile.mjs` | publishes the per-file profile; passive, exit 0 at any speed |

### Where it is wired

- `test-workflow.mjs` — full-suite runs only. Targeted `--file` runs are **exempt on
  purpose**: refusing a developer checking one thing teaches people to type `--allow-busy`
  by reflex until the refusal means nothing.
- `cold-ci.mjs` — owns the lease for the **whole wrapper** and hands the token down, so the
  nested workflow *adopts* rather than deadlocking against its own parent.
- Postflight runs in a `finally`, on the failing path too: a crash is when workers are
  likeliest to be orphaned.

### Ownership is atomic; release is authenticated

The claim is a **directory** — `mkdir` is the atomic primitive. Stale takeover is
rename-aside compare-and-swap. Every acquisition mints a token; heartbeat and release both
verify it. Holder identity is `(pid, startedIso)` because **PIDs are recycled**.

### Contamination is visible or it is nothing

`--allow-busy` proceeds and stamps: `full_suite_pass` → **false**, `trust` reads
`CONTAMINATED-…`, `.ci-stamp.json` verdict reads `CONTAMINATED`, and `test-profile` leads
with it. A run carrying **no** foreman record reports cleanliness **UNKNOWN** — including
the 12 193 s profile in the tree, which predates the wiring and now says so itself.

---

## 5. TRAPS, KEYED BY WHAT YOU WILL SEE

| you see | it is |
|---|---|
| `project identity changed during the test run` at batch 3 | **You wrote a file into the repo while `npm test` ran.** The guard hashes all ~5990 files. Instruments must write to `.local-evidence/` — the one excluded directory — or they destroy the measurement they are taking |
| `[foreman] REFUSING to start` | Working as designed. Another checkout's worker or a live lease. `node tools/process-census.mjs --preflight` names it |
| a batch FAILs with `peak 0 MB RSS`, no vitest output, exit `4294967295` | The runner's **own RSS sampler** died (`tasklist.exe`, 2 consecutive failures kill the batch). Not your code. Still unfixed: `monitorError` needs its own outcome |
| `NaN h` or `undefined s` in any report | An instrument that cannot measure and is not saying so. Both were real bugs here; the rule is **null, never NaN; "?" and "UNKNOWN", never a number** |
| a benchmark that produced a plausible number on a busy machine | The reason the foreman exists. **A contended benchmark does not report an error, it reports a NUMBER**, and the number goes into a proposal and then into a design decision |
| `test-profile` says *"cleanliness is UNKNOWN"* | The record predates foreman wiring. Not a clean run; not a dirty one either |
| a python heredoc failing on `C:\Users\...` | `\U` is a unicode escape. Use raw strings, or write the block to a file and splice |
| a multi-line patch that silently does not match | `tools/*.mjs` are **CRLF**. Use the Edit tool, not `\n`-based patterns |

---

## 6. OPEN WORK, IN THE ORDER THE MEASUREMENTS SUGGEST

1. **Chip check.** First structural work; its lever is **batching** (~200 s of a ~440 s
   tier). Needs an authored changed-file → subsystem map — that map *is* the deliverable,
   and it is authored, not derived.
2. **Split the heavy files.** Precondition for any formation target under an hour. Start
   with the two ~890 s files.
3. **Shard, balanced from the recorded durations.** Concurrency capped by what the
   concurrency probe says, not by the old comment.
4. **Merge the duplicated `supergene_oxidation|42|200` call sites** — 283 s, minutes of
   work. One is in `calibration-assertions.test.ts`; the other is now attributable because
   scenario records carry `file` (the first census could not say).
5. **Remove the duplicate `tsc`** — three invocations per cold run. Hygiene, **~8 s**. Do
   it; do not bill it as speed.
6. **Equivalence proof.** Non-negotiable: the new full check must find every deliberately
   seeded failure the old one finds. **Mutation-test the tiering itself** — a seeded break
   must turn its *chip* check red, not merely the formation check, or the fast tier is
   decoration.
7. **Windows Job Objects.** Honestly deferred as separate **native** hardening: Node has no
   Job Object API. `taskkill /T /F` tears down a *known* tree but cannot help with an
   abandoned parent, which is the exact case they exist for.
8. **RSS-sampler false-RED.** Give `monitorError` its own outcome so "I could not measure"
   stops being indistinguishable from "your code is broken." Not in `CATCHES.md` yet.

---

## 7. THINGS I GOT WRONG, SO YOU DO NOT INHERIT THEM

- **"2–3 shards is what RAM holds."** Wrong. This host is **63.9 GB / 8 physical / 16
  logical** (Ryzen 7 5800X) against a 1676 MB worst-case child. RAM was never the
  constraint; **cores are**. Corrected in the proposal.
- **"94 MB peak page-file use proves there was no memory pressure at any point."** Too
  strong. It rules out meaningful **paging** only — Windows trims working sets and evicts
  standby cache without touching the page file. Physical pressure is the sampler's job.
- **"5% bounds the contention effect."** It bounds *that* collision: two serial suites on
  sixteen threads, about the friendliest overlap this box produces. Says nothing about
  agent forests.
- **The lease rebuilt the race it was built to prevent.** Read → decide-free → write, plus
  an unconditional delete. Repaired, and both defects mutation-tested (4 RED / 1 RED) so
  the tests are known not to be decorative.

The pattern in all four: **a plausible number is more dangerous than a missing one.**

---

## 8. HOW TO RUN THE THINGS

```bash
node tools/process-census.mjs --preflight    # is the site clear? exit 1 if not
node tools/process-census.mjs --hygiene      # old JS processes, report only
node tools/test-profile.mjs --top 20         # last run's profile; never re-runs
node tools/concurrency-probe.mjs             # 1/2/4/8 workers, under the foreman
node tools/cold-ci.mjs                       # 3.5 h. Check --check first
VUGG_SCENARIO_CENSUS=1 npm test -- --fresh   # profile + excavation census
```

The censuses are **off** unless `VUGG_SCENARIO_CENSUS` is set: one env read, prototype
never touched, nothing shipped.

**Budget 3.5 hours for a cold run and start it when you can leave the machine alone** — and
now you do not have to remember, because it will refuse.

---

## 9. WHAT THIS WAS BUILT ON

None of this is a fresh start. `test-workflow.mjs` already had the memory-bounded batching,
the untrusted-checkpoint discipline, and the whole-repo identity hash that caught my own
mid-run write within three batches. The RSS manifest was already there for all 232 batches;
only the time half was missing. The honest-dependency rebuild (`420bf22`) and the atlas work
are what made a SIM-neutral instrumentation branch possible at all. This session added
timestamps, a foreman, and a set of corrections — on a floor somebody else had already
poured.
