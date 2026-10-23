# Canonical Chrome startup diagnostics

Repair base: `f3d1384af266cd6a08a9b24491442204523e2213`.
Canonical [PR #11 changes-requested review](https://github.com/StonePhilosopher/vugg-simulator/pull/11#pullrequestreview-5629930756)
supersedes its earlier exact-head approval. It is a startup compatibility hold,
not merely a workflow-admission hold. Canonical merge remains withheld.

## Evidence and limits

Canonical run `39520388428`, attempts 2 and 3, failed its first recovery case:
the detached launcher exited zero; `DevToolsActivePort` was absent after 10 s.
Both artifacts identify Chrome executable SHA-256
`480f275b63d1ea39113cbc8344ac395578acc25b432bd39af5fbc77005179aca`.
They tested synthetic merge `1d68d337d7610f332ed2ad750ba9498f4c78db99`,
whose tree `3a4511010bcd445dc5d91043497a3c65193be506` equals the reviewed head.

The same executable hash later passed all six cases in Syntaxswine run
`39913620611`; its artifact ZIP SHA-256 is
`13f7497a0f8ce95b41b0b1105c5243414c0bf2250237bd17dd6461305e6adbc3`.
This prevents treating a changed hash alone as proof of a universally invalid
flag. Old failure artifacts discarded browser stderr, did not record a native
file/product version, and cannot resolve the cause retrospectively.

## Bounded patch

Only the existing engineering probe/launcher, focused tests and CI test command
change. `browser-workflow.mjs`, native ownership acquisition/termination,
simulation/rendering/data, generated bundle, scientific producers, baselines,
receipts and release manifests remain unchanged. No rebake is needed: exact
execution/producer authentication checks the original committed receipts.

The detached browser now inherits a stderr **file handle**, so diagnostics survive
the intentional launcher exit. Artifact JSON retains a bounded 64 KiB tail with
byte counts/truncation, native PE file/product versions, runner image metadata,
exact arguments, executable identity, spawn time, readiness duration, and a
diagnostic-only observation of the reported PID. Reading PE metadata does not
launch `chrome --version`. Source snapshots include the diagnostic helper.

The flags and **10,000 ms acceptance budget are unchanged**. If readiness fails,
a separate bounded 20,000 ms observation can identify late readiness; it never
changes the original failed verdict or exit 1. A late receipt grants cleanup
authority only after the existing exact nonce endpoint check and stable native
PID/creation/executable/TCP-bind proof. No receipt or identity proof means no
termination and no profile deletion. No probe case, negative identity test or
ownership safety check is suppressed. The added unit cases cover a hung late
observation and explicitly forbid late readiness from becoming acceptance.

The root cause of the old failures is **not claimed**. Current-runner receipts
must show which version/flags ran, readiness timings, stderr and all six existing
case outcomes. Passing one local executable does not prove the failing CI binary
works; if CI fails again, its new diagnostics are the evidence for the next fix.

## Validation and delivery

Windows x64, Node 24.15.0. Local focused tests: **62 passed** (20 startup
diagnostics + 21 workflow cleanup + 21 benchmark cleanup). Typecheck, exact
build/drift and unchanged science/evidence/release audits pass. All six real
Chrome cases pass locally with independent final cleanup, Chrome
`155.0.8059.41`, executable hash
`9ca2beaa7a9fd1109f01e562788c22e045a01cec0f6015ade689325af7f8a521`.
Final readiness observations were approximately 182–192 ms. This different
binary is labeled local evidence only. The initial passing local run was
superseded when the bounded late-diagnostic path and its tests were added.

```text
npm test -- --file tests-js/browser-startup-evidence.test.ts --file tests-js/browser-workflow-cleanup.test.ts --file tests-js/benchmark-browser-cleanup.test.ts
npm run typecheck
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
node tools/benchmark-browser-cleanup-probe.mjs
git diff --check
git diff --name-only f3d1384a -- js data archive release index.html
```

Exact local commands, UTC intervals, source hashes, versions, measured cases and
cleanup outcomes are in the [local receipt](evidence/canonical-chrome-startup-local.json).
CI run/attempt/artifact hashes and the final source SHA belong in the delivery PR.
Local dependencies reuse the identical lockfile's installed packages via an
ignored junction; GitHub CI performs its own clean `npm ci`.

The source promotion branch is separate from Syntaxswine main, preserving the
already-delivered calcite/quartz layers. Updating it creates a new canonical
review boundary; this patch does not authorize or perform a canonical merge.
The ordinary review queue remains **#27 → #28 → #26**. Already-present older
renderer tranches are not reintroduced or queued again.
