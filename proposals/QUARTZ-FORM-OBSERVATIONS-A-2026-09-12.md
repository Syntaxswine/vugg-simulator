# Quartz form observations — increment A

Implementation follows [growth-front audit Part 4, increment A](growth-front-audit/04-implementation-gate.md).
Baseline: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`, SIM 285.

## What is recorded

The [recorder](../js/44e-quartz-form-history.ts) observes quartz immediately
after the simulator's final classifiers and before optional strip capture in
[run_step](../js/85-simulator.ts). It records existing simulator descriptors:
habit, dominant forms, twin state/law, polymorph/display labels, sceptre and
gwindel parameters, growth environment, and presence witnesses for split and
surface-growth descriptors. It also observes steps with no positive growth.

This is **model state observed at a finalized step**, not a measurement of
natural face velocity or an inferred physical onset time. For example, a sceptre
classifier's recorded boundary may precede its qualification; its observation
starts only when the classifier actually reports it. A changing gwindel winner
records the old winner's null descriptor as well as the new winner. The
[producer inventory](growth-front-audit/01-producers.md) and
[quartz science audit](growth-front-audit/02-quartz-physics.md) retain the pinned
source and primary literature supporting that distinction. No new kinetic law
or calibration is introduced.

## Coverage and ownership

Each crystal has a recorder-owned, non-enumerable `_quartzFormHistory` getter.
The ledger and every retained record/array/descriptor are frozen. Its private
owner is tied to the originating simulator run; a transferred object cannot
quietly continue the same history under a new run budget. Existing
[engine transactions](../js/85b-simulator-nucleate.ts) enumerate and deep-copy
ordinary fields; this dedicated property is deliberately outside that path.

The first snapshot is the first actual observation, never automatically a
birth snapshot. Subsequent snapshots record only changes; unchanged observations
extend `observed_through_step` and the accepted zone count. Absence, null and
deletion are distinct. Retrying an identical finalized step is idempotent.

Gaps, conflicting retries, unsupported mineral identity, identity/run changes,
duplicate identities, malformed descriptors and resource limits close coverage.
Backdated zone additions close it at the first contradicted cursor. A damaged
unobserved suffix cannot invalidate the accepted prefix. Descriptor and zone
coordinate reads reject accessors without invoking them. If invalid identity,
a sealed object or an occupied property prevents attaching any ledger, a
private failure latch preserves the explicit diagnostic reason; later repair
does not silently restart recording.

`validateQuartzFormHistory` checks descriptor shape, ordering and coordinates;
it does **not authenticate testimony**. Object member order is irrelevant.
`quartzFormObservationAtStep` is a diagnostic projection: it returns only a
recorded snapshot within uninterrupted coverage and otherwise reports an
unavailable reason. It supplies no fallback from the crystal's latest form.

## Deliberate boundary

This increment is in-memory observation only. Generic spread/JSON copies,
existing collection producers, strip/file/IndexedDB/archive channels and the
allowlisted scientific fingerprint do not yet include this ledger. A caller
must read it explicitly. Run-scoped source identity is not a collection ID.
None of the new records drives production geometry, cloudy zones or population
placement yet. [Part 4 B and C](growth-front-audit/04-implementation-gate.md)
remain separate preservation/authentication and renderer-consumption work.

## Validation and engineering limits

The [focused suite](../tests-js/quartz-form-history.test.ts) includes real
sceptre/gwindel classifiers, a production simulator without a strip recorder,
rejected engine candidates, unchanged/zero-growth observations, null/deleted
descriptors, immutable snapshots, coverage conflicts, malformed accessors,
run transfer and resource limits.

The reproducible [census tool](../tools/quartz-form-observer-audit.mjs) runs the
41 authored scenarios at seed 42 in serial isolated ON/OFF processes. Test-only
instrumentation replaces exactly one finalized observer call. At every cursor
it hashes the existing scientific fingerprint (including recorded RNG state)
and every enumerable crystal/zone/classifier field. It binds the compiled source
and fetched data tree, checks identical scenario durations, and reports missing
eligible ledgers and closed histories. Instrumented and ordinary harness loads
cannot share a memoized bundle. This diagnostic does not replace commissioned
science/release evidence.

Quotas count retained UTF-8 JSON record bytes: 1,024 records or 256 KiB per
crystal, 16 MiB across one run, and 8 KiB per descriptor snapshot. They do not
measure JS heap; fixed ledger metadata and current comparison strings have
additional cost. Reaching a quota preserves the accepted prefix and marks
subsequent coverage unavailable.

The completed [production census](growth-front-audit/evidence/quartz-observer-census.json)
passed all **41 scenarios and 7,100 finalized steps in each mode**, with identical
scientific fingerprints and enumerable crystal/zone state at every cursor.
There are **42 quartz ledgers, 573 snapshots, zero missing ledgers and zero
closed histories**. Across the fleet, records occupy 259,692 UTF-8 JSON bytes.

| Resource | Largest observed value | Engineering cap |
| --- | ---: | ---: |
| Records in one crystal | 107 | 1,024 |
| Record bytes in one crystal | 52,778 | 262,144 |
| Record bytes in one run | 116,275 (Grimsel) | 16,777,216 |

Grimsel's complete ledger JSON, including fixed metadata, occupies 117,291
bytes. These are storage measurements, not JS heap measurements. The caps
provide roughly 9.6 times the observed per-crystal record count, 5 times its
record bytes and 144 times the largest authored run's record bytes. They are
finite engineering limits with explicit unavailable coverage when reached,
not a guarantee of unlimited custom-run history.
The separate 8 KiB snapshot cap bounds descriptor input; this census does not
report the largest individual snapshot or quantify headroom for that cap.

In this single serial sample, observer calls totaled **194.8 ms** across
7,100 steps; the largest whole-scenario total was **17.9 ms** (gem pegmatite).
These times measure observer execution, exclude diagnostic hashing, and do
not establish a slower-device frame rate or isolate all later GC cost. The
independent ON/OFF state comparison establishes unchanged trajectories; the
timing sample does not establish a universal speed claim.

## Hostile review

Aquinas initially held implementation at **3/5**. Corrections bound owners to
their run, accepted semantic object-key reordering, guarded zone accessors,
latched failed first attachment/identity, rejected backdated additions, and
preserved valid earlier observations when a later zone is malformed.
On 2026-09-13 the corrected code earned **4/5 PASS**. Aquinas independently
reproduced both a malformed zone-entry getter and a malformed step getter:
earlier coverage remained recorded, later coverage was unavailable, validation
passed, and no getter ran. The final focused suite passes **16 tests**, including
independent snapshot, per-crystal record/byte and shared-run byte-limit cases.
The bounded regression workflow passes **111 tests across 11 files**, covering
habit stability, R4 quartz, replay, collection, surface history and strip storage.
The owned browser workflow passes **17 checks**, its receipt tests pass **9
tests**, and the normal science rebake passes **55 tests across 7 files** plus
evidence, provenance and locality validation. The normal release audit and
build-drift check pass. Fresh-dependency validation also passes as recorded below.

The separate [release comparison guard](../tools/quartz-form-observer-release-check.mjs)
also earned **4/5 PASS** after a 3/5 HOLD. It now checks the pinned file inventory
before comparing contents, verifies each permitted receipt identity against
the current runtime/producer, and requires all 41 unique census scenarios with
valid coverage and no missing eligible ledgers. It binds census source/data to
the final compiled candidate.

The completed census evidence earned a separate **4/5 PASS** on 2026-09-13.
Aquinas independently compared every combined row with the raw ON and OFF
outputs: all 41 scenario names, 7,100 observer calls, durations, crystal counts,
trajectory digests, and source/data/Node identities agreed. The reviewer also
recomputed the candidate source/data hashes and confirmed the pinned strip
inventory. This acceptance covers recorded coverage and trajectory invariance;
it does not turn the timing sample into a heap or device-performance benchmark.

The first post-rebake comparison correctly stopped on the whole-data-tree hash:
`data/generated/science-provenance-manifest.json` is inside that tree, and the
normal rebake updates its receipt/runtime/producer hashes. Aquinas independently
reconstructed the original census hash by replacing **only that file** with its
raw bytes from `f7ca38c4`. No source under `js/` consumes this manifest, and the
[offline input list](../tools/file-bundle-assets.mjs) excludes it. Every changed
manifest field is an evidence identity; scenarios, support envelopes, model,
schema and other provenance are unchanged.

The [release comparison](growth-front-audit/evidence/quartz-observer-release-comparison.json)
preserves the original census JSON/hash, records the current data hash separately,
and documents this one derived-output bridge. It requires the exact compiled
runtime whose manifest dependencies were audited, reconstructs the original
whole-tree hash from the one pinned file, rejects all other data/inventory/byte
changes, permits only four declared evidence-identity members, and independently
recomputes the complete current manifest with the normal generator's `--check`.
This is not an exception for changed simulation inputs. The implemented bridge
and evidence output earned **4/5 PASS**: the reviewer independently recomputed
the recorded hashes and confirmed that unrelated input edits, additions and
deletions fail reconstruction. No load-bearing bridge finding remains.

The comparison now passes: **126 baseline/archive/card files are unchanged**
(three baselines, 41 strips, 82 claim-card files), as are mechanism-witness and
browser-journey payloads. Their permitted execution/producer identity updates
bind to the actual current runtime and producer. No scientific receipt was
edited by hand. The initial pipeline failure and the narrow correction above
are retained here rather than calling the first run uninterruptedly green.
The audit's citation verifier also passes: 77 code citations bound to 23 pinned
files, plus 20 local links across six audit documents.

## Fresh-dependency delivery validation

On 2026-09-13, candidate `68b7782f98d08daf88d13d23cf5a16e74d1da3dc`
passed an isolated detached-checkout run under Windows x64 / Node 24.15.0,
with fresh `npm ci` installs for both the root and `agent-api`:

- Typecheck, build and generated-artifact drift checks.
- The checked-in CI audit sequence: science, evidence, release, locality,
  scenario, narrative, tutorial, accessibility, Creative, BIF and cation checks.
- The targeted `supergene_oxidation` calibration sentinel: one test passed,
  with the six other tests deliberately skipped by the CI selector.
- All 111 relevant regression tests across 11 memory-bounded file batches.
- The agent API's JSON help smoke test and a clean final checkout.

This is **fresh-dependency local CI**, not a claim that the entire repository
test suite or a hosted GitHub Actions job ran. The validation script follows
[the checked-in CI workflow](../.github/workflows/ci.yml), adds the recorder's
relevant regression set, and performs no rebake in the isolated checkout.
The final delivery gate permits only this report to differ from the tested
candidate, then requires clean build/science/evidence/release identity checks
before publication. The runtime, tests, producers and evidence stay identical
to the candidate that passed the cold run.

Aquinas gave the final increment A delivery gate **4/5 PASS**, independently
checking the cold logs, 111-test total, targeted sentinel, authenticated evidence,
clean candidate checkout and report-only difference. No load-bearing finding
remains; persistence/authentication and production rendering are still B and C.

Reproduce the diagnostic census after building, then run the comparison after
the commissioned science/browser evidence has been regenerated:

```powershell
node tools/quartz-form-observer-audit.mjs
node tools/quartz-form-observer-release-check.mjs
```
