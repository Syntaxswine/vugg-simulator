# Part 3 — Replay, collection and archive contracts

Base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`; SIM 285.
Scope: how the inspected quartz state would travel through existing history
consumers. Review: **4/5 PASS**, Aquinas, 2026-09-12, after adding the
IndexedDB boundary, selective strip-field limits and capture-failure handling.
The reviewer independently reproduced all history-probe hashes and results.

## Finding

**The existing stack preserves substantial recorded history, but neither a
collection snapshot nor the strip's latest habit record constitutes a dated
quartz habit trajectory.** Historical dimensions are already protected against
later habit changes. The renderer explicitly declares that its form chronology
is more limited. A new history producer needs a distinct, versioned contract
through all three paths; adding a field to a live crystal is insufficient.

## Observed contracts

| ID / boundary | Executed behavior and pinned evidence | Extension requirement (audit inference) |
| --- | --- | --- |
| H1 — Dimensions at replay cursor | `recordedGrowthState` integrates signed zone thickness and accepted aspect ratios only through the cursor. Missing legacy aspects use a declared neutral display ratio; historical split index remains unknown. [Projection](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46l-replay-history.ts#L53-L86). | Preserve this contract independently of shape history. Neither today's habit nor today's split index may rewrite an earlier shell. These are model dimensions, not historical measured face positions. |
| H2 — Form at replay cursor | Mesh dimensions come from the historical helper, but `habitForGeom` starts from current habit. The current gwindel descriptor has no cursor gate in its geometry route; the sceptre route gates on `boundaryStep` but uses current `capFrac`. Mesh metadata declares `current-form-with-recorded-etch-deformation-and-sceptre-gates`. [Dimensions](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8350-L8370), [habit](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8438-L8452), [special quartz routes](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L8643-L8663), [declaration](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L9238-L9244). | A future descriptor timeline must feed routing and its parameters, not merely an information panel. Existing event gates do not recover all past cap fractions or twists. This is a declared remaining approximation, not a claim that R7 stored no history. |
| H3 — Quartz relief | `quartzRenderHistory` selects positive zones, filters by cursor, then normalizes display bands against their cumulative positive thickness. Negative zones do not erase those bands. [Function and declared boundary](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46a-quartz-render.ts#L1-L48). | Do not repurpose this display mapping as a surviving growth-sector/front ledger. A physical surface-history model would need an independently defined rule for retreat and truncation. |
| H4 — Collection production and reconstruction | Modern collection records deeply copy all zones plus an allowlisted current crystal/source snapshot. V2 adds dated surface history; v1 remains separately supported. Reconstruction restores the snapshot for display while keeping old cavity relationships source-scoped. [Fields/version boundary](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L26-L63), [production](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L626-L657), [reconstruction](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L663-L723). | A new top-level live descriptor ledger will not automatically be copied. Adding it must not silently change the scientific projection of authenticated v1/v2 specimens. Full zone copies preserve what producers wrote; they cannot supply missing face history. |
| H5 — Authentication | The science digest includes record fields except collection ID/time and player name. Receipt authentication regenerates the expected specimen with the receipt's producer schema and compares science digests. [Projection](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93a-ui-saves.ts#L471-L486), [live replay comparison](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93a-ui-saves.ts#L559-L583). | Newly authenticated history needs producer-version semantics, not a self-consistent hash alone. Editing a ledger and recomputing its hash must still fail against regenerated accepted testimony. |
| H6 — Strip capture | New zones append to `layerGrowthTestimony` with zone index, simulator step and sample index. A map keyed by crystal identity overwrites `latestHabitMorphology`; export uses the map's latest values. [Layer capture](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L423-L479), [latest state](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L480-L496), [export](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L660-L675). | `habit_morphology_testimony` is a latest-state channel, not append-only transitions. Retain it unchanged and add a separate dated channel. A sample index must not masquerade as a simulator step or physical duration. |
| H7 — Strip persistence and archive | Serialization, deserialization and canonical archive construction enumerate the channels explicitly. Optional surface history already demonstrates absence-preserving handling. [Write](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85f-strip-dataset.ts#L538-L551), [read](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85f-strip-dataset.ts#L653-L681), [archive](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/tools/gen-strip-archive.mjs#L215-L237). | A field not projected through every boundary can disappear from durable evidence. Explicitly distinguish absent history from a recorded interval with no changes; preserve old archives as evidence of their original producer. |
| H8 — Validation and bounds | Collection copying bounds depth/nodes/arrays and rejects invalid values; surface-history strip validation checks identities, ordered zone witnesses and capture coordinates. These checks are specific to the current schema. [Collection bounds](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/93-ui-collection.ts#L67-L102), [strip validator](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85f-strip-dataset.ts#L309-L354). | A new ledger needs its own allowed fields, ordering, status semantics, capacity limits and cross-checks. Existing validation is not evidence that an arbitrary future ledger would be accepted safely or faithfully. |

The H6 layer projection is selective: it does **not** include `aspect_ratio`.
It cannot be treated as a complete collection-zone payload or, alone, reproduce
H1's historical volumes. The omission is visible in the complete field list at
[layer capture](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L435-L477).

H7 also has a separate **IndexedDB path**: conversion into stored records and
back enumerates the channels independently of binary serialization. Both must
preserve a new ledger; a successful file round trip does not establish durable
browser storage support.
[Stored-record projections](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85h-strip-storage.ts#L208-L248).

## Capture failure boundary

**H9 — Capture failures must not look like complete history.** The simulator
swallows errors from the optional strip recorder. The existing surface channel
therefore latches a failure instead of silently exporting stale testimony.
A new descriptor channel needs equivalent handling: either explicitly retained
partial/unknown coverage under its schema, or a failed finalization, never an
apparently complete earlier snapshot.
[Outer error handling](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1394-L1403),
[surface failure latch](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L514-L524),
[finalization guard](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85g-strip-recorder.ts#L638-L647).

## Controlled checks performed

[history-cursor.mjs](evidence/history-cursor.mjs) reads four source files directly
from the pinned commit and invokes their actual functions. The
[output](evidence/history-cursor.json) records each source hash and Node 24.15.0.
All three fixture groups passed:

- Earlier dimensions remain identical after a later zone is appended and current
  habit/split metadata changes.
- For +1,000, +2,000, then −1,500 µm, replay length is 1.5 mm. The quartz relief
  helper still reports 3,000 µm of positive growth and unchanged bands across the
  retreat. This confirms H3's display-history distinction.
- A legacy zone without an aspect produces `legacy-neutral-display`, retaining
  uncertainty instead of borrowing its crystal's current tabular habit.

These are deliberately synthetic function fixtures. No natural formation,
end-to-end collection round trip or full renderer was run for this audit.
Existing [replay tests](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/tests-js/replay-history-r7.test.ts#L11-L58)
and [collection tests](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/tests-js/collection-history-r7.test.ts#L98-L154)
were inspected as regression targets, not reported as freshly executed checks.

## Required distinctions for Part 4

1. **Occurrence, observation and surviving matter.** A descriptor observed after
   a step does not establish the instant it physically originated. A later
   dissolution event does not delete the fact that earlier growth occurred,
   but may remove material carrying its visible record. Keep both meanings.
2. **Birth versus first observation.** A recorder attached late cannot backdate
   its first snapshot to nucleation. Missing earlier state stays unknown.
3. **Within-step order.** A step can accept several zones and then classify the
   resulting crystal. A step-only timestamp cannot describe that internal
   order. Define an observation phase and stable sequence or explicitly promise
   only a finalized-step view. The registry example below is shared machinery,
   not a claim that quartz is a `MORPH_TH` tenant; quartz's separate classifiers
   also run after accepted growth.
   [Shared multiple-zone classification](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/45-morphology.ts#L1596-L1616),
   [quartz post-step calls](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1340-L1347).
4. **Physical clock versus story clock.** The simulator does have separate,
   explicitly authored physical-etch durations: `physicalEtchExposureDays`
   requires a positive `duration_days` and otherwise returns unavailable.
   That is not a calibrated duration for ordinary quartz precipitation.
   [Etch clock](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/44d-physical-dissolution.ts#L153-L156).

Decision: a bounded **recorded descriptor timeline** can close a real persistence
gap without inventing a face-growth law. Part 4 must specify its observation
boundary, legacy behavior and cross-consumer checks before implementation.
