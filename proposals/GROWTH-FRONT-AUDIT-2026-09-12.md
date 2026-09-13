# Growth-front history audit

Audited base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab` (SIM 285).
Requested scope: divide the audit into independently reviewable parts, cite the
work, and revise each part until a hostile subagent awards at least 4/5.
This is an audit and implementation recommendation, not a new growth model.

**Complete: all four parts passed hostile review at 4/5.** The final proposal
was revised from a 3/5 HOLD before passing. The next recommended increment is
recorded quartz form observations; physical face kinetics remain uncalibrated.

| Part | Question | Deliverable | Review |
| --- | --- | --- | --- |
| [1 — Producers](growth-front-audit/01-producers.md) | What does the running model compute and accept? | Producer/record inventory with pinned code citations | 4/5 PASS — Aquinas |
| [2 — Quartz physics](growth-front-audit/02-quartz-physics.md) | Which published observations support a face model, in which conditions? | Primary-source evidence and applicability limits | 4/5 PASS — Aquinas |
| [3 — History contract](growth-front-audit/03-history-contract.md) | What survives replay, collection and archive, and what is missing? | Persistence and causality audit | 4/5 PASS — Aquinas |
| [4 — Implementation gate](growth-front-audit/04-implementation-gate.md) | What is the smallest supported next change? | Bounded recommendation, unknowns and acceptance checks | 3/5 HOLD → revised → 4/5 PASS — Aquinas |

Each finding distinguishes an executed code fact, a published observation, an
audit inference, or a proposed design. Repository comments and older proposals
are leads to verify, not independent scientific authorities. Citations to code
are pinned to the audited commit so later edits cannot silently move the evidence.
Scientific sources must identify the inspected material (full text, excerpt or
abstract), its conditions, and what it does **not** establish. A passing audit
does not turn a display convention into measured natural growth physics.

No runtime, calibration, receipt or production renderer edits belong to this audit.
The [review record](growth-front-audit/review-log.md) preserves scores, corrections
and the limits of each pass.

## Findings carried forward

- Accepted scalar growth and historical dimensions are available. `growth_rate`
  is not always the final accepted increment, and neither field is a measured
  m/r/z face velocity.
- Six primary sources support a condition-dependent quartz investigation. Their
  inspected scope does not establish universal production coefficients.
- Collection retains complete zone payloads plus current descriptors; strips
  retain selective layer testimony and latest habit snapshots. A dated
  descriptor ledger needs explicit collection, file, IndexedDB and archive paths.
- The proposed next work is a quartz descriptor recorder, preservation and
  authentication, then cursor-based consumption. These are separate increments.
  Physical face kinetics require a further calibration gate.

The detailed evidence and applicability limits are in the four linked parts.
The audit is intentionally narrower than a fleet-wide mineral-physics review.

## Reproducible evidence

Use Node 24.15.0 in this repository:

```powershell
node proposals/growth-front-audit/evidence/cube-octahedron.mjs
node proposals/growth-front-audit/evidence/history-cursor.mjs
node proposals/growth-front-audit/evidence/verify-citations.mjs
```

The first two scripts read source directly from the pinned Git commit, so they
do not depend on the current generated bundle. Outputs retain source SHA-256s,
runtime version and fixture results. The last script checks source existence,
commit pinning, line bounds and local links; it does not establish semantic
support for a claim. That was the separate hostile review's responsibility.

- [Geometry results](growth-front-audit/evidence/cube-octahedron.json): four
  cases passed; confirms a prose error while the existing geometry test is correct.
- [History results](growth-front-audit/evidence/history-cursor.json): three
  controlled fixture groups passed; neither a natural-formation experiment nor
  a full renderer/collection test.
- [Citation check](growth-front-audit/evidence/citation-check.json): mechanical
  result and source-hash register.

No fresh full CI or science rebake is claimed for this read-only audit. The
implementation gates describe future checks, separately from these executed
audit probes.

The subsequent [quartz form observation increment A](QUARTZ-FORM-OBSERVATIONS-A-2026-09-12.md)
has its own implementation, hostile review and execution evidence. Its results
do not retroactively change the scope of this audit.

[Persistence increment B](QUARTZ-FORM-PERSISTENCE-B-2026-09-13.md) carries those
recorded observations through versioned collections and strips, with separate
validation, authentication boundaries and execution evidence. Renderer consumers
remain increment C.
