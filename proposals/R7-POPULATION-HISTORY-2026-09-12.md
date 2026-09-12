# R7a — recorded populations and surviving phantom surfaces

This first R7 increment improves ordinary representative clusters and the
historical film display. It does not close the whole R7 section or the
formation-memory HOLD.

## Science and the display contract

Actual crystal identities, dimensions, nucleation steps, nucleation tilts,
attachments, growth records and simulation counts remain untouched. No birth
cohort is called a geological generation, and age does not cause staining.
The new variation affects only existing representative satellite meshes.

Natural crystal-size distributions depend on mechanism: calcite experiments
produced multiple distribution shapes under different conditions. A universal
lognormal transformation of the recorded population would therefore be
unjustified. See [Kile et al. (2000)](https://www.usgs.gov/publications/assessment-calcite-crystal-growth-mechanisms-based-crystal-size-distributions).
Our bounded log-space distribution is explicitly display-only. It creates more
small representatives and occasional larger ones without claiming a measured CSD.
Each descriptor depends on parent identity and member index, never member count,
camera, age or the simulation RNG. Surviving members retain their position,
scale and orientation when the display budget changes.
The display footprint follows the rendered cross-section and each member's size,
keeping a local druse patch with partial overlaps instead of scattering the newly
smaller members across the old large footprint. This does not infer a common
nucleus or write new attachment records.

The parent retains its recorded nucleation axis. Representatives follow that
axis resolved on their display substrate, with limited tilt and related roll.
This is an aggregate representation, not measured misorientation, new epitaxy
or an independently nucleated population. Recorded air-growth rules still win.
Selenite sprays, barite crests, twins and split forms retain their own routes.

## Historical films

The simulator marks masked_horizon on the first accepted positive growth that
breaks through a previously deposited film. The buried surface therefore lies
BEFORE that growth increment. The previous display placed it after the increment.
The corrected helper filters by replay cursor, removes a surface when dissolution
reaches it, and never resurrects it on later regrowth. A partially removed
overgrowth can still preserve the older film. An unnamed old film stays unnamed;
a later live film label cannot supply its identity.

A real phantom can preserve a former host surface after inclusion deposition
and renewed growth; [Koivula (2018)](https://www.gia.edu/gems-gemology/summer-2018-microworld-quarterly-crystal-wurtzite-phantom-in-quartz)
documents such a case. The simulator's axial depth and film identity support
ordering and conditional presence. The similar, base-anchored shell geometry,
film palette and opacity remain display approximations, not per-face front
reconstruction or a calibrated optical model.

Buried film meshes enter Three's opaque transmission buffer when the host uses
transmission. Under alpha fallback they draw before the depth-writing translucent
host. Opaque hosts retain ordinary depth occlusion. Generic representatives show
the same surviving record as their parent, not independent film events. Rebuilds
dispose descendant film and depth materials once, preserving shared geometry.

## Review and validation

The hostile review progressed from 2/5 (incorrect breakthrough depth, film
visibility and descendant cleanup) to 3/5 (newly smaller members scattered across
the old footprint). Correcting the footprint using rendered geometry, including
the isometric scale rule, earned **4/5 PASS for this increment**. The reviewer
inspected the compact quartz and exposed cubic fluorite representatives, paired
film controls and the 18-file regression log. Whole R7 and completed formation
memory remain HOLD.

Typecheck, build and 225 tests across 18 serial files passed, including 16 R7
tests and the existing O5 masking/film, R4 form, optics, contact and inclusion
checks. The official owned-browser workflow, its receipt audit and nine receipt
tests also passed. Its recorded journeys were unchanged; only the runtime byte
fingerprints changed. The full required science rebake passed, including 55
science tests across seven files, exact authentication of 128 artifacts and the
41-scenario locality envelope. The freshly generated locality receipt (seeds
1, 2 and 42), seed-42 baseline, strip digests, all growth-history archives and
all 41 claim cards are byte-identical. Mechanism and browser evidence changed
only their runtime fingerprints, with the aggregate receipts following those
hash changes. Release generation/audit and the final build check passed.

A fresh-checkout CI run is the final delivery gate before pushing; its outcome
is reported in the accompanying delivery message. Local verification logs use
the `.local-evidence/r7-` prefix.

Final controlled film-on/off pairs use identical cameras and an explicitly
modified quartz history fixture, not a claimed natural outcome. Mean absolute
RGB differences (0–255 channel units) in hero / isolated / side views were
1.269 / 0.192 / 0.063 for transmission and 1.408 / 0.414 / 0.750 for alpha.
Genuinely opaque controls were pixel-identical in all three views. Thus film
contribution is conditional on host optics and view; these numbers do not
calibrate real film coverage or colour. All final photo manifests recorded zero
runtime exceptions. One photo child exited before emitting output; its retry
and all remaining controls completed successfully.

Local photo evidence: `.local-evidence/photos/r7-quartz-final`, `r7-elmwood`,
`r7-tn457`, `r7-film-on`, `r7-film-off`, `r7-alpha-on`, `r7-alpha-off`,
`r7-solid-on`, `r7-solid-off`, `r7-selenite`, and `r7-barite`. Elmwood and
tn457_barite_pulses include the handoff's cavity/hero/druse gates. Earlier
`r7-history-3`, `r7-opaque-*` and `r7-quartz-population` are superseded diagnostics.

## Remaining R7 work

Actual-scale macro presentation and further O2 contact emphasis remain open.
The existing overview size floor is unchanged by this increment. Richer chemistry
zoning, calibrated refraction and per-face growth history are not claimed complete.
Collection reconstruction also omits orientation and several history/relationship
fields; preserving those requires a versioned, source-scoped migration compatible
with authenticated old saves. This increment does not modify that record format.
Graphics settings and progressive rendering remain deferred final polish.
