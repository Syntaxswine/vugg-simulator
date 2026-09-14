# Hostile review record

Reviewer: Aquinas (`r7_hostile_review`), independent subagent. Date: 2026-09-12.
Audited code base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`.
The scores below apply to audit quality and recommendation scope, not to
unimplemented physics or a new release.

| Part | Assessment | Changes made in response |
| --- | --- | --- |
| 1 — Producers | 4/5 PASS; no load-bearing factual correction | Added main-loop dispatch, scalar O5 masking, quartz's absence from the morphology registry and the gwindel call-site line. |
| 2 — Physics | 4/5 PASS; six primary-source entries checked; geometry independently reproduced | Clarified the direction of the dissolution/growth ratio and moved the test citation to include the correct geometric ratio. |
| 3 — History contracts | 4/5 PASS after scope clarifications; all fixture results independently reproduced | Added the separate IndexedDB field projections, the strip layer channel's missing aspect field, quartz-specific post-step calls, and capture-failure/finalization behavior. |
| 4 — Implementation gate, initial draft | **3/5 HOLD** | Reviewer identified omitted twin state and broader renderer dependencies, plus incomplete always-on observer failure and duplicate-step semantics. |
| 4 — Revised draft | **4/5 PASS**; no remaining blockers or nits | Added `twinned`/`twin_law`, a required route-dependency inventory, dated scope witnesses and an explicit initial consumer envelope. Added failed/skipped observation handling, coverage rules and conflicting duplicate-step tests. |

The root agent made the revisions. The reviewer did not edit runtime files.
The geometry and history probe results were reproduced read-only against pinned
source; the reviewer did not regenerate the output to make it agree.

## Consumer increment C — 2026-09-13

Implementation base: `0f0be7f7f94c9f8d5b2f7806504914c818f2da93`.
Reviewer: Aquinas (`r7_hostile_review`); dependency inventory: Zeno
(`r7_collection_history`). The inventory is [Part 5](05-renderer-consumption.md).

| Review | Assessment | Correction/evidence |
| --- | --- | --- |
| Bounded consumer design | **4/5 PASS**, provisional | Original-source projection before routing/caches; explicit casts/CDR/host limits, source seeds, zero-valued parameters and visible status required. |
| Initial consumer implementation | **3/5 HOLD** | Reviewer reproduced a delayed bend: current size first passes the threshold after the event, but the tag carries the old event date and changes earlier replay. |
| Revised consumer implementation | **4/5 PASS**, code gate | Uniformly withhold unrecorded deformation application; preserve source testimony; add actual classifier/mesh regression and enclosure/cast boundary tests. Reviewer independently rechecked earlier route/status/signature stability. |
| Regenerated visual and resource evidence | **4/5 PASS** | All 11 images/hashes/cursors/selections checked. Corrected assigned-vs-accepted fixture dimensions, measured empty state geometry map/warm/hit separately, and reported full repeat-refresh cost with fitted-camera and display-model limits. |
| Browser display-ID reconciliation | **4/5 PASS** | Independent deep comparison found exactly two UI-ID changes; scientific fingerprints and strip bytes unchanged. Exact pin updated and fresh owned-browser run passed. |
| Scientific comparison contract | **4/5 PASS** | Hash-verified receipt reference propagation only; remaining values strict. Added exact visual inventory, per-shot error checks and LF-normalized byte-equality wording. Normal rebake/comparison subsequently passed. |
| Final evidence acceptance | Pending | See the [C delivery record](../QUARTZ-FORM-CONSUMER-C-2026-09-13.md). |
