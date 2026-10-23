# Canonical Chrome startup diagnostics

## Superseded for canonical integration

While this independent diagnostic patch was being prepared, StonePhilosopher
merged [canonical PR #12](https://github.com/StonePhilosopher/vugg-simulator/pull/12)
at `2026-10-23T16:03:59Z` (12:03:59 PM New York). Its exact head
`cdb3399cb3c32567d516cb68b7e3c9c60f4451b9` adds a **30-second** real-browser
startup receipt wait on top of `f3d1384a`; the native ownership proof is unchanged.
Canonical main is `b764b9d087b774422ca4dedcfe71da552cfad87b`. PR CI
`39982580879` and both main workflows `39983635012` / `39983635612` passed.
The owner-side merge also marked #11 merged, with its original pinned
`f3d1384a` included by ancestry. The original failed #11 runs remain failures;
they are not reclassified as green.

This fork's separate [PR #33](https://github.com/Syntaxswine/vugg-simulator/pull/33)
was tested at `439f3578e799851b656ba90869ce421b183d8ee5` and merged only into
the fork's historical promotion branch as `896df5bf745475a95e1e8f9106955dd6b8201f3d`.
It was **not** merged into canonical or Syntaxswine main. Its retained
10-second acceptance setting must **not** overwrite the owner's 30-second fix.
Do not promote this patch wholesale. Any future selective reuse of its version,
stderr or timing diagnostics must start from the owner-repaired baseline and
preserve that operational bound. No further canonical repair is requested here.

The historical investigation and local evidence below are retained for custody.
Fork CI `39984402214` passed on the originally failing executable hash
`480f275b…`, identified as Chrome 156.0.8078.48 on image `20261021.278.1`:
all 62 focused tests, six real-browser cases, audits and sentinel passed.
The first readiness wait was 6278 ms; subsequent waits were 160–206 ms.
This supports investigating cold-start cost; it does not prove the cause of the
old timeouts. Artifact `12515046916` was downloaded and verified, including ZIP
SHA-256 `0916f48f528c6d615076c2b9869bf938322a84a4aafbaf0078ae5e7afd3bce9d`
and source snapshots matching `439f3578`.

## Original bounded investigation

Repair base: `f3d1384af266cd6a08a9b24491442204523e2213`.
Canonical [PR #11 changes-requested review](https://github.com/StonePhilosopher/vugg-simulator/pull/11#pullrequestreview-5629930756)
superseded its earlier exact-head approval at the start of this investigation.
That was a startup compatibility hold, not merely a workflow-admission hold.
The later owner-side integration above has now closed the canonical gate.

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
already-delivered calcite/quartz layers. This patch did not authorize or perform
a canonical merge and is now superseded for canonical integration as noted above.
The ordinary review queue remains **#27 → #28 → #26**. Already-present older
renderer tranches are not reintroduced or queued again.
