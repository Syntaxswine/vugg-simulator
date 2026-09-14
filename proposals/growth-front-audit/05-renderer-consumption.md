# Part 5 — Recorded quartz form selection in the renderer

Inspected base: `0f0be7f7f94c9f8d5b2f7806504914c818f2da93` (increment B delivered).
Inventory date: 2026-09-13. Immutable source links below refer to that base,
before the increment C edits. The implementation described separately below is
**provisional working-tree code**, pending tests, visual evidence and hostile
review. This document reports no completed C validation or release.

The purpose of C is to select an existing quartz display model from an observation
available at the replay cursor. It does not reconstruct measured natural growth
fronts, infer unobserved habit changes, or add a physical face-velocity model.
The [implementation gate](04-implementation-gate.md#c--consume-only-observations-available-at-the-cursor)
requires this dependency inventory before a mesh can receive recorded-form status.
An observation records finalized simulator state, not an exact within-step onset
or evidence that the classifier's implied growth mechanism occurred in nature.

## Dependency inventory

The route is larger than the quartz builder. A descriptor can change the earlier
mesh through parent inheritance, a generic special-form hook, placement, neighboring
contact geometry or population eligibility. Projection must therefore precede
the mesh signature, neighbor prepass, token resolution and special-form dispatch.

| Dependency | Inspected authority and consumers | Consequence for C |
| --- | --- | --- |
| Quartz identity, habit, forms and twin state | [Observer snapshot](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/44e-quartz-form-history.ts#L70-L101); [mineral/twin/token resolver](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L3241-L3315); [ordinary R4 gate](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8917-L8920). | Use the cursor snapshot, including absent/null/deleted fields. `dominant_forms` is retained testimony but is not a face-distance input to the ordinary builder. Require an explicit habit allowlist: the [token resolver defaults unknown names to prism](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L3161-L3167), so a prism token alone is not an eligibility test. |
| Preceding parent-form inheritance | [Birth-time CDR evidence and source pointer](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/85b-simulator-nucleate.ts#L472-L485); [renderer borrows the parent's latest habit](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8438-L8452). | CDR remains outside the supported envelope. The accepted dissolution evidence establishes the replacement relationship, not the parent's recorded outline at replacement. A standalone collection also need not contain the parent. |
| Split, surface fabric and environment | [Dated scope witnesses](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/44e-quartz-form-history.ts#L72-L101); [split parameter reads](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8714-L8752); [fabric suppresses parent representation](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L6128-L6134) and [emits swaths](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9269-L9277). | A present split/fabric descriptor is unsupported because its historical parameters are not recorded. A recorded absent/null witness clears later live parameters before routing and population. Require the observed environment to be exactly `fluid`; air and unknown environments are outside this first envelope. |
| Gwindel and sceptre precedence | [Current special dispatch and caches](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8643-L8663); [sceptre and gwindel builders](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L3631-L3707). | Read existence, twist and cap parameters from the selected observation. The old gwindel path has no date gate. Sceptre `boundaryStep` alone does not establish when the classifier first selected the form. Existing parameter defaults and quantization remain display conventions. Gwindel takes precedence over sceptre. |
| Deformation | [Tag-once deformation producer](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/45-morphology.ts#L665-L683); [bend dispatch](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8781-L8786); [bend builder](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L3709-L3740). | `atStep` records the authored event date, but the classifier also tests current size. A crystal can cross that size threshold later and receive a newly applied tag stamped with the older event date. Tag-once therefore does not establish first application time. C uniformly withholds `_deformation` in recorded mode; the earlier renderer's date gate is insufficient for the no-future-leakage guarantee. |
| Other quartz-capable generic hooks | [Sector hooks](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8794-L8871); [polar hook](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8890-L8892). Production [sector configuration](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/45-morphology.ts#L764-L769) and [polar configuration](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/45-morphology.ts#L891-L911) exclude quartz, while the renderer's generic hooks do not. | Uniformly withhold these unrecorded overprints in the supported quartz projection. Current presence must not decide past eligibility. `_wulffForm` and `_faceStep` dispatch is mineral-restricted and cannot steal the ordinary quartz route; [Wulff gates](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8527-L8580) must remain so. |
| Other habit routes | [Dendritic dispatch](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8637-L8638); [saddle geometry](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8762-L8771) reads all positive-zone temperatures. | Keep these outside the reviewed habit list. In particular, routing an old cursor to a saddle must not borrow future zone temperatures. |
| Dimensions, survival and dissolution casts | [Cursor-filtered signed-growth state and dimensions](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46l-replay-history.ts#L57-L87); [mesh survival/size selection](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8352-L8386); [display scale](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46i-display-scale.ts#L3-L19). | Preserve this separate authority. Positive zones use recorded aspect; legacy missing aspect uses explicitly named neutral display aspect. Signed dissolution changes survival and volume. The helper does not reconstruct historical split compaction. A retained cast has pre-loss size testimony but no general boundary-form observation, so it remains fallback. |
| Ordinary quartz geometry | [History-to-display mapping](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46a-quartz-render.ts#L26-L49), [fixed symmetry/face construction](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46a-quartz-render.ts#L9-L24), [face planes and mesh](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46a-quartz-render.ts#L51-L108), [final parameter/cache call](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9049-L9064). | Inputs are cursor-filtered positive-zone thicknesses, displayed width/length ratio, source-ID phase/accessory variation and exact double-termination selection. Fixed r/z/m and optional s/x planes remain an R4 morphology model. Positive-zone variability is a display mapping, not a surviving face-growth history after dissolution. The [intersection/mesh kernel](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46-wulff-geometry.ts#L469-L543) consumes those planes; it does not supply physical velocities. |
| Relief and finishing | [Quartz striations](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46a-quartz-render.ts#L111-L145); [face relief](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46f-form-finishing.ts#L87-L124); [chamfer](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46f-form-finishing.ts#L126-L205). | The shader uses normalized thickness contrasts, a fixed relief pitch, local position and rendered length. These are not physical sector boundaries. Chamfers derive deterministically from mesh geometry under fixed complexity/width guards. Geometry changes must refresh both derived mesh and shader uniforms. |
| Source identity | [Crystal ID constructor](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/27-geometry-crystal.ts#L224); [ID-derived yaw](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L5835-L5837); [collection display identity](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/93-ui-collection.ts#L724-L738) and [frozen source testimony](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/93-ui-collection.ts#L772-L790). | No later production ID reassignment was found in this inventory. Preserve the original source ID for display variation, separately from the remapped ID used for picking and current enclosure maps. Numeric IDs must preserve existing seeding; supported string IDs need an explicit deterministic hash. Neither is a measured crystallographic orientation. |
| Nucleation axis, anchor and wall | [Birth-time immutable attachment](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/85b-simulator-nucleate.ts#L309-L315); [birth-time tilt](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/85b-simulator-nucleate.ts#L489-L499); [axis selection](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L7940-L7956); [historical wall decision](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9856-L9894). | These are independent birth inputs; no later production tilt/anchor assignment was found. Axis also depends on the geometric-selection flag and the resolved local normal. Full scene placement requires the matching authenticated historical wall. A collection's old anchor stays source-scoped and inert; placement on a specimen stand is a display reconstruction. |
| Attachment depth | [Undated, re-evaluated/deletable classifier](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/45-morphology.ts#L939-L964); [attachment fraction read](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8467-L8473); [position offset](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9128-L9153). | Uniformly omit `_occlusion` from supported projection and disclose the base-at-anchor display convention. Current absence cannot establish historical absence, and current presence cannot supply its earlier depth. |
| Neighbor contact geometry | [Neighbor body prepass](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8038-L8083); [cursor-filtered growth weight](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46j-contact-history.ts#L3-L8); [clipping](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9182-L9227). | Growth weights are dated, but neighbor reach/center also uses habit, environment, tilt, attachment and enclosure. The prepass does not mirror CDR inheritance. Projecting only the target is insufficient. Supported C meshes omit these contact cuts rather than claiming a dated contact surface; ordinary current/fallback display retains its existing approximation. |
| Representative population | [Count thresholds](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L6014-L6025); [eligibility and placement](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L6986-L7253); [deterministic member sampling/signature](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46h-population-display.ts#L4-L29). | Inputs include projected twin/split gates, parent geometry and displayed dimensions, token pattern, source seed, local wall geometry, axis and attachment convention. Member sizes, radial offsets, tilt and yaw are representative display choices. They are explicitly not independently recorded births. Parent form status must propagate to members. |
| Enclosed guests | [Dated topology projection](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46l-replay-history.ts#L3-L49); [host-dependent placement and size cap](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9334-L9355); [convex-host fitting](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46l-replay-history.ts#L89-L136). | The relationship may be recorded while the host shape is unsupported. Position and display size depend on the whole rendered host chain. C therefore leaves enclosed quartz in explicit fallback. It does not claim recovered entrapment coordinates; the existing placement/fit approximation remains visible as such. |
| Etch, phase, film and cloudy material | [Accepted etch/regrowth projection](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/44d-physical-dissolution.ts#L245-L277); [dated phase lookup](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/75-transitions.ts#L423-L439); [late material lookup](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8964-L8998); [film/cloudy/chemistry consumption](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9291-L9320). | Retain these independent authorities and their display limits. Quartz does not enter the cube etch-geometry branch. A phase change used only for material cannot correct preceding form routing. C does not relocate clouds onto imagined growth faces or reinterpret film shells as observed face advance. |
| Clone and cache boundaries | [Enclosure spread clone](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/46l-replay-history.ts#L14-L23); [mesh signature](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L7971-L8028); [sync/early return](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L8283-L8296); [ordinary geometry/chamfer keys](https://github.com/Syntaxswine/vugg-simulator/blob/0f0be7f7f94c9f8d5b2f7806504914c818f2da93/js/99i-renderer-three.ts#L9049-L9071). | Read the original non-enumerable ledger before spread loses it. Include status, selected observation/parameters and source seed in identity. Special meshes must not borrow a mutable live crystal's geometry cache. Replay's outer forced refresh is not a substitute for a correct warm-cache contract. |

## Provisional consumer and limited envelope

The current implementation is in [46m-quartz-form-display.ts](../../js/46m-quartz-form-display.ts)
and [99i-renderer-three.ts](../../js/99i-renderer-three.ts), with projection support
in [44e-quartz-form-history.ts](../../js/44e-quartz-form-history.ts). These local
links identify evolving code, not a reviewed release revision.

`quartzFormObservationAtStep` selects the most recent observation at/before the
cursor only within validated uninterrupted coverage. It checks original source
identity and known birth chronology. Missing history, pre-observation cursors,
coverage gaps, invalid testimony and cursors after coverage return unavailable.
No observer is invoked by display. Unknown periods remain unknown.

`quartzFormRenderProjection` currently limits recorded selection to:

- An observed quartz snapshot with `twinned === false` and
  `growth_environment === 'fluid'`.
- Observed split and surface-growth witnesses that are absent or null, with
  no present unsupported descriptor.
- The explicit habit names `prismatic`, `doubly_terminated`,
  `scepter overgrowth possible`, `scepter_overgrowth`, and `gwindel`, with the
  required recorded special parameters for explicitly named special forms.
- No observed non-alpha polymorph label, no CDR parent dependency, no retained
  dissolution cast and no enclosed-host placement dependency.
- Ordinary R4 or double-ended R4 geometry, or ledger-selected sceptre/gwindel
  parameters. Deformation and generic sector/polar overprints are uniformly
  omitted from recorded mode. All enclosed quartz remains outside this initial
  envelope, regardless of host mineral or apparent host simplicity.

The route names describe the selected renderer. They do not turn sceptre or
gwindel parameters into measured physical growth-front history. Absence
of an optional observed polymorph label is preserved; C does not infer a missing
phase event. Existing phase/material helpers retain their separate meaning.

The renderer obtains the ledger from the original crystal, projects onto the
dated enclosure view, and supplies that view to the signature, neighbor prepass,
geometry dispatch and population. Supported special geometry uses explicit scene
cache keys. Source-scoped variation supplies phase, accessory-face choice, yaw,
sceptre eccentricity and representative population sampling; display IDs still
identify meshes for picking and enclosure maps. String identities have a declared
deterministic hash; numeric source identities retain the existing seed convention.

Supported meshes report `recorded-form-selection`, their observation/cursor,
selected route and the morphology-display basis. Their representative satellites
carry the same form status. A valid observation outside this limited route
envelope still reports `legacy-current-form` with the specific reason. That is a
latest-form display fallback, not a historically reconstructed mesh. Fallback
eligibility is distinct from whether the underlying observation itself is valid.

## Fixed display conventions and omitted dependencies

Supported selection uniformly omits undated `_occlusion` attachment depth,
neighbor-shape contact cuts and `_deformation` with unrecorded first application
time (`unrecorded-deformation-application-time`). Clearing attachment only when currently present
would not be sufficient: later additions/deletions could still change earlier
eligibility. The supported fluid prism uses the renderer's base-at-anchor
placement convention. Sector/polar and other unsupported generic overprints are
uniformly removed from the supported projection, rather than read from the
latest specimen. The same rule applies to deformation: an old event timestamp
must not allow a later size-triggered application to bend an earlier mesh.

Form selection is dated; all detailed geometry is not. Existing fixed plane
distances, width-ratio clamps/rounding, source-seeded accessory variation,
special-form quantization, chamfers, relief bands and representative population
distribution remain display models. A thickness-contrast band is not evidence
for an actual sector boundary. Positive-zone relief is not a reconstructed
facewise record of dissolved and regrown material. Legacy aspect fallback stays
identified by the separate dimensions helper.

World placement additionally requires the correctly authenticated historical
cavity and its resolved normal. The normal and the recorded birth tilt feed a
fixed axis rule; source-ID yaw remains a deterministic display convention.
Camera/scale preferences are display inputs, not new geological evidence.
Collection reconstruction keeps source identity, anchor and enclosure testimony
separate from its new stand context. The current collection UI adds a history
summary; it does not claim that the zone-based Record Player has become a
historical three-dimensional face-growth player.

Enclosed quartz remains a declared fallback even when enclosure receipts are
valid: existing placement uses the current rendered host bounds, a size cap and
convex-host fitting, and thus depends on unsupported host/ancestor forms. The
fallback does not erase the recorded relationship, but its placement is not a
recovered entrapment coordinate. Likewise, CDR and retained casts require their
own parent/boundary-form work before receiving recorded-form status.

## Evidence and review gate

This dependency inventory fixes the implementation boundary. Actual test,
capture, hostile-review, rebake and cold-CI results are recorded separately in
the [C delivery record](../QUARTZ-FORM-CONSUMER-C-2026-09-13.md); the inventory
alone does not establish acceptance.

The [photo-rig controls](../../tools/photo-rig.mjs) separate those
evidence sources. `--replay-step N` requires an exact production wall snapshot
and keeps the existing authenticated replay path active through camera refreshes.
`--fixture quartz-form-1` through `quartz-form-6` author six observations of fixed
quartz through the real observer on an isolated mock simulation. Assigned live
dimensions are 8 × 4 mm, but `add_zone` accepts aspect 0.4; the replay dimension
authority reconstructs 8 × 3.2 mm from that actual accepted zone. The manifest
reports both values separately, directly from their respective sources. Every
fixture retains the same complete ledger and latest gwindel state; only the
selected cursor changes. The final source cavity is a declared fixed display
substrate, not a cavity dated by the fixture cursor. The sceptre descriptor's
`masking` label is authored input and does not assert an actual masking event.
Roster/subject metadata exposes the selected form status. Separate mesh-sync
timings measure an explicitly emptied state geometry map, a warm forced rebuild,
and immediate cache reuse. Other scene/material/legacy caches remain warm;
these are not process-cold or GPU-compilation benchmarks. Full repeated replay
refresh is reported separately. Each hero camera fits its selected geometry.

The planned evidence must separate authored controls from production cases:

- Controlled fixtures must exercise observation start/change/removal, ordinary
  and double-ended routing, sceptre/gwindel parameters, withheld deformation, unsupported
  split/fabric/air intervals, identity mismatch, gaps and exhausted coverage.
  Their imposed descriptors demonstrate consumer behavior, not natural mineral
  formation or the frequency of those states in production.
- Actual mesh comparisons must vary later live habit, twins, special parameters,
  split/fabric/environment and later zones while keeping the earlier accepted
  record unchanged. Compare parent and satellites, including source-ID-preserving
  reconstruction, warm/cold cache, attachment changes and neighbor changes.
- A delayed deformation regression must add a tag after the original cursor
  while retaining an earlier event timestamp; the supported earlier mesh must
  remain unchanged. This distinguishes actual application chronology from the
  existing event-date field.
- CDR, cast, inclusion-host and unavailable-history fixtures must retain explicit
  fallback status. Malformed data must not silently become recorded geometry.
- Production captures must identify scenario, source crystal, cursor and observed
  route. They must disclose the authenticated historical wall, omitted attachment
  depth/contact cuts and any fallback. Fixed cameras where used must be stated
  accurately; frames with different fitting/scale are not identical-camera proof.
- Simulation invariance, regression checks, resource measurements, producer
  evidence/rebake and cold CI must use the repository's required serial Node 24
  workflow. Only after those results and independent hostile review at least 4/5
  may this increment be described as accepted.

Physical face advance remains the separate, uncalibrated gate in
[Part 4](04-implementation-gate.md#separate-gate-for-physical-face-advance).
