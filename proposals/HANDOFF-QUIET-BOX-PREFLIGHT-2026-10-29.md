# Quiet-box preflight for full test runs

Base: Syntaxswine `main` at `e86ba58a` (PR #41 merged). Branch
`ci/quiet-box-preflight`. Tooling only: no scientific model, baseline,
receipt, generated runtime, or verdict rule changes; no rebake.

## Problem

The owner decided on 2026-10-28 that cold CI runs on a quiet box. Until now
that rule lived only in agents' notes: neither `npm test` nor
`node tools/cold-ci.mjs` looked at the box before a multi-hour run. On the
commissioning box (Windows x64, 16 logical CPUs) a busy box has cost runs
three ways:

- 2026-09-05: a cold CI launched at 03:56. The nightly vugg-canary sweep
  started four minutes later, and a seed sweep timed out at batch 193. Two
  hours were lost.
- 2026-10-28: PR #41's cold CI started at 11 % load and went red at batch
  216/302. `roughten-gill-brochantite-seeds` timed out at 300 s while another
  agent's `node --test --test-concurrency=2` run shared the box. Nothing in
  the record said so.
- PR #40: the 70 ms marching-cubes warm-frame target fails for all eight
  observations once sustained load reaches about 65 %. The owner kept the
  target and moved the requirement to the box.

## Behaviour

Full and resumed `npm test` runs (no `--file`, no `--chip-base`) and
`node tools/cold-ci.mjs` (not `--check`) take one reading before anything is
deleted, written, or launched. Cold CI passes
`VUGG_QUIET_BOX_PREFLIGHT=cold-ci` to its child, so the runner does not read
the box a second time. The reading has three parts:

1. **Whole-box CPU load** over 30 s, from `os.cpus()` deltas across all
   logical CPUs. Busy at 25 % or more.
2. **The process census.** It now also recognizes a vugg-canary sweep started
   by its full path (`…vugg-canary/src/sweep.mjs`, as the nightly task runs
   it). A running sweep is busy. Other recognized work outside the caller tree
   (another checkout's Vitest, a dev server) is listed but not refused; the
   load reading decides whether it matters.
3. **Scheduled tasks whose action mentions `vugg-canary`.** A running task is
   busy. So is one whose next start is overdue or inside 3.5 h, the length of a
   full run with margin. Disabled tasks and tasks with no next start do not
   count.

A busy box exits 3 and lists every reason, then both ways out: `--busy-ok`, and
`VUGG_QUIET_BOX_PREFLIGHT=busy-ok`, which also reaches `npm run ci`. A refusal
loses nothing:

- Cold CI leaves `.ci-stamp.json` byte for byte, so an earlier GREEN stays
  valid for its tree.
- The runner leaves the checkpoint and the quarry ledger alone, even under
  `--fresh`, whose deletions now come after the reading.
- With an invocation id, the runner writes outcome `quiet-box-refused`.

An override runs and keeps the reasons (`quiet_box.verdict: busy-override` in
the stamp). A signal that cannot be read goes under `issues` and never refuses
on its own. The verdict is then `unknown` ("PARTLY READ"), never `quiet`,
which needs all three readings, including a census that classified every
process. A preflight that throws lets the run start. Only positive evidence of
a busy box stops a launch.

The record:

- **The stamp:** `quiet_box` holds the launch reading.
- **The advisory file:** `.local-evidence/quiet-box-preflight-v1.json` holds
  the last reading, like the census report.
- **Each batch:** `box_load` = `{ mean_pct, max_pct, bucket_ms, buckets_pct }`.
  It is the whole-batch mean plus every full 30 s bucket, this run's own test
  child included (one worker, about 1-2 of 16 threads). It appears on the
  batch's result line and in the checkpoint and completion batch records. A
  failure also prints the bucket series, and the invocation result carries
  `failed_batch`, so a red stamp shows the failing file and the load it ran
  under.

`node tools/quiet-box.mjs [--json]` reads the box and starts nothing: exit 0
quiet, 3 busy, 2 when it cannot run.

## Measurements (Windows x64, Node 24.15.0, 16 logical CPUs, 2026-10-29)

- **Instrument control.** An `os.cpus()` delta and typeperf
  `\Processor(_Total)\% Processor Time`, read over the same 30 s, agreed within
  0.1-0.3 points in four windows: 67.3/67.0, 85.5/85.3, 69.6/69.5 and
  98.9/98.7 %. A fifth window drifted 7.5 points: at saturation, typeperf took
  44 s to collect its 30 samples, so the two windows came apart.
- **Known-load control.** On a busy box (67-70 %, from another agent's
  `node --test` pool, a game and Task Manager), a 4-thread burn added only
  16-18 points, because it competed for the few free threads. Repeated at
  12:02 on a quieter box, the same burn measured 46.4 % (typeperf 45.8 %),
  between baselines of 18.1 % and 13.5 %. That is about +30 points against an
  expected +25 (4/16), on a background that moved about 5 points between the
  two windows. The reading tracks real load and crosses the threshold as it
  should.
- **Threshold, 25 %.** Runs that sessions recorded as quiet sat at 0-24 %; two
  GREEN cold CIs ran at medians of 14 % and 24 %. Busy nights sat at 39-100 %.
  The most load-sensitive budget fails only from about 65 %. This is a launch
  threshold, not a guarantee for the whole run.
- **Horizon, 3.5 h.** The longest recent full run took 3.1 h (10-27). PR #41's
  two green cold CIs, with the raw-read change, took 2.6 h and 2.0 h.
- **Cost.** One launch reading took 30.2 s; the census (2.1 s) and the task
  query (1.1 s) run inside the window. Each batch adds two `os.cpus()` calls,
  plus one per 30 s bucket, at 0.55 ms per call: about 0.5 s across a 303-file
  run.
- **Live, `tools/quiet-box.mjs`, 11:42:48-11:43:18.** BUSY at 50.7 %, exit 3.
  The task query found `vugg-canary-nightly` Ready, next start 04:00 local.
- **Live, the real cold-CI entry point.** It ran in a throwaway Git checkout
  holding these tools and a two-file fake suite, so nothing heavy could start.
  - 12:01 (box at 19 %): QUIET. The child skipped a second reading, both files
    ran, and the stamp came out GREEN with `quiet_box` and per-batch loads of
    8.8 % and 9.1 %.
  - 12:04, under a 4-thread burn: BUSY at 43.2 %, exit 3, and the earlier stamp
    was unchanged byte for byte.

## Boundaries

- One non-atomic observation at launch. It is not a reservation or an
  admission ticket, and load that arrives later is recorded per batch, not
  prevented.
- It does not acquire the cooperative lease. The lease handoff's next work
  still stands: hold the lease across an asynchronous child lifecycle, and
  combine it with fresh census readings and, now, this one.
- Whole-box load has no owner. The record says how busy the box was, not who
  made it busy; that needs the ownership-aware telemetry the lease handoff
  describes.
- The census misses a canary sweep started by a relative path
  (`node src/sweep.mjs` inside vugg-canary). Its scheduled task and its load
  are still seen.
- Recognized but idle work, such as a dev server, does not refuse.
- Off Windows, the load reading works; the census and the task query report
  unavailable, which lists issues and refuses nothing.

## Validation

`npm test -- --chip-base origin/main` selects seven files: the new quiet-box
tests, the runner, cold CI, the census, the lease, the selector and the ledger.
It passes 365 tests in seven batches, with one worker and the RSS guard. Each
batch line now carries its load: 34-63 % during this run, from other work on
the box. Seventeen seeded defects were each caught by the test
written for them, and every source byte was restored (checked by SHA-256):

1. The gate moved after the `--fresh` deletions. The refusal test finds the
   checkpoint and ledger gone.
2. An unread load refuses.
3. `>= 25 %` weakened to `> 25 %`.
4. The horizon reduced to "overdue only".
5. The decision ignores `--busy-ok`.
6. Any `VUGG_QUIET_BOX_PREFLIGHT` value skips the reading.
7. A crashing preflight blocks the run.
8. The recorder's timer setup is left unguarded.
9. The recorder counts the trailing partial bucket.
10. Cold CI starts despite a refusal.
11. Cold CI's child reads the box again. The real-runner wiring tests then
    time out on a real 30 s reading.
12. The runner drops `--busy-ok`.
13. The invocation result leaves out the failed batch.
14. The checkpoint drops `box_load`.
15. The census no longer recognizes the canary sweep.
16. An unread signal is called quiet.
17. A census with unclassified processes counts as fully read.

`npm run typecheck`, `build:check`, `audit:runtime`, `audit:science`,
`audit:release` and `audit:evidence` (128 artifacts, exact execution +
producers) pass on Windows x64 / Node 24.15.0. No changed file is in the
evidence execution set or in any of the 12 producer closures; this was checked
by computing them. No full multi-hour suite or fresh GREEN cold-CI stamp is
claimed.

## Next unfinished work

- Lease admission can call `assessQuietBox()` with its own fresh readings
  rather than a second copy of these rules.
- Between-batch pausing when the box turns busy mid-run is not built. The
  per-batch load record is the evidence for deciding whether it is needed.
