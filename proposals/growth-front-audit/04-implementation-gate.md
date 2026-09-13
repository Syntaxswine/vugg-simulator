# Part 4 — Smallest justified implementation

Base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`; SIM 285.
Review: **4/5 PASS**, Aquinas, 2026-09-12, following a 3/5 HOLD and revision
for twin-state dependencies and observer failure/duplicate-step semantics.
See the [review record](review-log.md). Everything below is a **proposal**, not
implemented behavior or newly validated mineral physics.

## Recommendation

**Record finalized quartz descriptor observations first. Defer a production
face-velocity model.** The simulator already changes habit and structural
descriptors but does not retain their general chronology ([Part 1](01-producers.md),
[Part 3 H2/H4/H6](03-history-contract.md)). This is a concrete information loss
we can prevent without inventing rates. The inspected literature supports
anisotropic quartz growth, but does not yet calibrate this simulator's inputs
to normal velocities across its scenarios ([Part 2 Q1–Q6](02-quartz-physics.md)).

The initial feature should be called **recorded quartz form observations**.
It records what the model reported at a declared observation boundary. It must
not claim measured natural growth fronts, exact onset of a habit within a step,
or a newly solved growth mechanism.

## Three implementation increments, each with its own hostile review

### A — Observe without changing growth

Introduce a dedicated, optional crystal-owned ledger. Observe quartz after the
step's accepted growth and all classifiers/overprints have finished, immediately
before optional strip capture. This is deliberately a **finalized-step view**;
transient within-step changes are outside its promise. Capture even a step with
no positive zone if a tracked descriptor changed. Do not make observation depend
on opening the renderer or attaching a strip recorder.
[Accepted growth](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1004-L1021),
[quartz classifiers](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1332-L1347),
[end-of-step capture](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1386-L1403).

Proposed minimal contract:

| Member | Meaning and constraint |
| --- | --- |
| `schema`, `observation_basis` | Versioned ledger; basis explicitly `simulator-state-at-finalized-step`. |
| `source_crystal_id` | Original run-scoped identity. Reconstructed collection specimens keep this source-scoped. |
| `initial` | First actually observed step, zone count and immutable descriptor snapshot. It is not automatically a birth snapshot. |
| `changes[]` | Only changed snapshots, ordered by simulator step; at most one finalized observation per step. Record its zone count without treating that count as proof of causation. |
| `observed_through_step` | Last successful observation, including unchanged steps. Needed to distinguish a quiet interval from stopped recording. |
| `coverage` / unavailable boundary | Explicit first observation and any gap, limit or unsupported interval. An absent ledger is unknown, not an empty but complete history. |

Start with `habit`, `dominant_forms`, `twinned`, `twin_law`, polymorph/display
labels and the quartz `_sceptre`/`_gwindel` geometry descriptors. Twin state is
load-bearing: the engine changes it, and it controls ordinary R4 eligibility
and population routing. Recording habit alone would leave that route dependent
on future state.
[Twin producer](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/59-engines-silicate.ts#L139-L153),
[R4 gate](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8917-L8920),
[population gate](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L7004-L7008).
Validate only their documented scalar,
text and form-list members; do not serialize geometry caches or executable
objects. Preserve absent/null/deleted states explicitly so a removed descriptor
does not persist through replay. Existing etch, deformation, film and enclosure
histories remain under their own authorities. The fact a classifier selected a
sceptre is model testimony, not proof of the mechanism described in its comment.

First observation after nucleation may document a finalized birth-step state,
but says nothing about unobserved stages earlier in that step. If recording
starts later, the preceding interval remains unknown. If a crystal changes out
of the supported quartz identity, close that interval explicitly; do not carry
the last quartz shape across a replacement or invent its missing transitions.

The observer must not read/advance RNG, recalculate an engine or mutate any
existing scientific field. Deep-copy observations and compare stable allowed
values. Use a bounded record count and byte/node budget; if either is reached,
retain the valid prefix and mark the rest unavailable. Determine and publish
the actual budget from a production census before release; this audit supplies
no measured memory or frame-time claim.

The always-on observer needs failure semantics of its own. A malformed descriptor,
copy failure or skipped finalized step leaves an explicit unavailable suffix;
it must not advance `observed_through_step` beyond the last successful observation.
Keep the simulator's remaining bookkeeping intact. Retrying the same finalized
step is idempotent only when snapshot and coverage agree; a different second
snapshot must not overwrite accepted testimony. Reject the conflict and mark
the affected coverage unavailable. These rules apply even with no strip recorder.

### B — Preserve and authenticate those observations

Add the ledger to a **new collection producer generation**, with explicit old
generation projections. Leave v1/v2 snapshot fields and their old zones intact.
In particular, putting new observation members into every `GrowthZone` would
also affect legacy collection projections because they copy entire zone arrays.
A separate ledger makes preservation of old projection bytes feasible; it still
needs regression proof.
[Current field/version rules](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L26-L63),
[whole-zone copies](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L626-L657),
[schema-specific authentication](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93a-ui-saves.ts#L559-L573).

For strips, add a separate optional dated channel through capture, binary
serialization/deserialization, IndexedDB stored-record conversions, shape
validation, archive generation and evidence identity. Keep
`habit_morphology_testimony` as the existing latest-state channel.
Freeze captured values, preserve absence, and verify final snapshots against
the observed live state. Capture failures must either prevent finalization or
carry an explicit partial-history status that consumers honor; the outer
simulator currently swallows optional recorder exceptions
([Part 3 H6–H9](03-history-contract.md)). Do not retrofit fabricated observations
into old archives. New producer evidence must be generated by the normal rebake.

### C — Consume only observations available at the cursor

Use a single projection helper for the ledger's supported range: select the last
observation at or before the cursor, but only when uninterrupted coverage reaches
that cursor. Drive both quartz habit routing and the stored sceptre/gwindel
parameters from this projection. Keep recorded dimensions, existing dated etch/
deformation gates, chemistry and enclosure topology under their current helpers.
Include the projected descriptor in geometry/cache identity.
[Current routing/descriptor reads](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8438-L8452),
[special routes](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8643-L8663).

**Required route-dependency inventory:** before a mesh receives a recorded-form
status, list every input that can select its route or change its geometry or
population. Each must be supplied by this ledger, an independently cursor-filtered
authority, or an explicit unsupported/fallback result. Start consumer eligibility
with the ordinary, untwinned, fluid-grown R4 prism; include special or twinned
routes only after their dependency inventory passes the same gate.

| Dependency class | Initial treatment |
| --- | --- |
| Habit/forms, twin state, quartz structural descriptors | Dated ledger snapshots, including explicit absence/removal. |
| Recorded size, dated etch/deformation, enclosure and contact | Use their existing cursor projections within their documented limits; verify all parameter reads in the selected route. |
| `_split`, `_surfaceGrowth`, `growth_environment` | Record scope witnesses at observation time: whether split/surface-growth descriptors exist and the environment value. Initially declare split, surface-growth and air-grown intervals outside consumer eligibility; do not borrow their latest parameters. Extending them requires dated parameters or a demonstrated independent history. |
| Other route/mesh inputs discovered in the inventory | Demonstrate immutable run-scoped identity, provide a dated authority, or keep that route outside the supported envelope. Parent-form inheritance and special populations must be included in this check. |

The scope witnesses are part of the versioned observation snapshot even when
the full excluded descriptor is not. They prevent a future `_split` or fabric
from retroactively selecting a different route. This table is a starting
classification, not a claim that a complete renderer-dependency inventory has
already been performed by this audit.
[Split parameters](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8715-L8717),
[surface-growth eligibility](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8917-L8920),
[environment-dependent attachment](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8466-L8473).

Outside recorded coverage, retain a clearly declared legacy/current-form display
or withhold the unsupported feature; never label a fallback as historical fact.
Use equally explicit status in collection views. Do not turn normalized quartz
relief bands into physical sector boundaries or relocate cloudy material to
imagined faces. The displayed form remains a morphology model even when the
selection of that model is historically recorded.

## Acceptance gates for the implementation, not claims of tests run here

| Gate | Required evidence |
| --- | --- |
| Observation fidelity | Actual before/after model state equals each snapshot; unchanged steps extend coverage; zero-growth descriptor changes are retained; rejected candidate mutations do not appear as accepted growth. Test late start, descriptor removal, unsupported transitions, capacity exhaustion, malformed/copy failures, skipped observation and conflicting duplicate-step calls. Failure must preserve prior testimony and remaining simulation bookkeeping without falsely extending coverage. |
| No future leakage | Within the declared supported envelope, appending later zones or changing live habit, twin state, cap fraction, twist, split, fabric or environment cannot change any earlier recorded projection **or rendered mesh**. Test step-before/at/after boundaries, capture gaps and replay beyond the last observation. Uncovered dependencies must return an explicit fallback/unsupported status. |
| Persistence | Round-trip exact ledger values through collection, strip import/export and IndexedDB reload; archive includes them; old schemas retain their original projection. Invalid order, mismatched identities/zone counts and malformed descriptors fail validation. |
| Authentication | Modified, deleted or self-rehashed new testimony fails against command-replayed producer state. Missing old testimony remains absent. |
| Simulation invariance | At identical seeds, compare preexisting zones, dimensions, fluid/solid budgets, identities and RNG outcomes before/after. Separate intended new metadata/digest changes from unchanged dynamics; do not promise the full serialized model remains byte-identical. |
| Visual and resource review | Production quartz cases and controlled habit-transition fixtures at several replay cursors; report which are authored fixtures. Measure cold/cached rendering, record counts and storage costs. No unsupported grain-level detail introduced to improve appearance. |
| Delivery | Applicable Node 24 checks, fresh producer evidence/rebake and cold CI under repository rules; independently review each increment at ≥4/5 before declaring it complete. [Verification rules](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/AGENTS.md#L48-L65). |

## Separate gate for physical face advance

After A–C, a physical prototype remains a separate task. Before production,
require: one experimental envelope with inspected methods/data and uncertainty;
explicit face indices and setting; initial planes and length units; independent
physical exposure time; supersaturation convention and supported chemistry;
growth versus dissolution rules; a conserved volume/inventory conversion;
contact and face-disappearance semantics; and validation against observations
outside the fitting cases. Neither the ellipsoid budget nor the display-plane
kernel supplies that validation ([Part 1 P4–P6](01-producers.md),
[Part 2](02-quartz-physics.md)).

The geometry-prose correction from Part 2 is a small documentation cleanup to
include in that future change. The working intersection kernel does not need
replacement on the evidence of this audit.

Audit outcome: **ready to implement recorded form observations in small reviewed
increments; physical face kinetics remain uncalibrated.** No runtime changes,
new rate constants, production images or release claims are delivered here.
