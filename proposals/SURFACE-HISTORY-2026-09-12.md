# Dated coating and buried-surface history

This tranche extends R7's recorded-history contract with observations of the
existing O5 coating model. It does not introduce coating mass, new kinetics,
grain adhesion, transport, or a law for foreign-mineral dissolution.

## Scientific boundary

Coatings can mark former crystal surfaces when later host growth envelops them.
Koivula's Raman-identified wurtzite forming a three-sided phantom in quartz is a
direct example: [GIA, Summer 2018](https://www.gia.edu/gems-gemology/summer-2018-microworld-quarterly-crystal-wurtzite-phantom-in-quartz).
Those are adjacent faces of an earlier growth form, not evidence of three
separate deposition cycles. The observation supports deposition followed by enclosure. It does not supply
a law for whether grains remain attached when the host dissolves back to them.

Accordingly, host retreat produces **boundary reached** or **no longer enclosed**
testimony. The coating grains' subsequent fate is explicitly unrecorded. A
crossing never restores `_film`, reactivates masking, or paints a new exterior
coating. Regrowth does not resurrect that earlier buried shell.

## Recorded operations

`surface-history-v1` is a separate per-crystal ledger. Its initial observation
records the then-current coating and accepted-zone count; it does not turn an
undated legacy film into a dated deposition event. Each later event has a
sequence number, simulation step, accepted-zone count and axial growth depth.
Sequence disambiguates repeated operations within one step, including identical
dusting source IDs.

- Dusting retains the actual MAX operation and effective coverage change,
  including zero change. A requested amount is not claimed as added coverage.
- Front coating retains the accepted enclosure contribution and its source.
- Burial occurs only after final positive accepted growth. The full ordered
  coating composition is recoverable from the preceding events. A zero-growth
  state overprint or rejected growth candidate cannot clear or bury the film.
- Liberation removes only its active enclosure contribution. A missing active
  contribution after burial does not erase that older buried boundary.
- Negative accepted zones record every crossed/reached known horizon. No new
  shared random draws, crystal births, material quantities or fluid fluxes are
  introduced by these observers.

The persistent growth-zone and current-film formats remain unchanged. The
temporary accepted-burial handoff is removed synchronously by `add_zone`.

Validation checks event ordering, timestamps, accepted thickness, burial-zone
mineral/coverage/origin fields, operation algebra and necessary retreat events.
Missing operations cannot silently reconstruct a stale coating after retreat.
At the 20,000-event limit, or after an unobserved state discontinuity, a bounded
raw prefix is retained with an explicit unavailable marker. It supplies no
reconstructed chronology, including earlier cursors, until the gap can be
resolved from authoritative evidence.

## Display and retention

Historical exterior coatings now read the recorded prefix at the replay cursor.
Supported particulate palettes remain qualitative. Nominal operation colors
are mixed per face class; overlapping contributors do not prove exact exposed
patch positions. Unsupported or clear-mineral mixtures are withheld from this
opaque-film treatment.

Buried coatings retain contributors and termination/prism coverage. Similar,
base-anchored shells approximate the former surfaces; the simulator did not
record their exact per-face outlines. Screen-door sampling integrates class
coverage into Three's transmission buffer, with different sampling phases for
different interfaces to avoid coincident coverage masks. Its pixels are a display device,
not measured positions of individual grains. Reached/crossed boundaries are
explained in the specimen's coating-history panel, not rendered as a surviving
surface deposit.

New collections use `crystal-history-v2`, which deeply retains and authenticates
the ledger. The legacy and `crystal-history-v1` producers remain frozen for
already-issued save/finish receipts. Missing history stays unavailable.
Strip archives gain an optional versioned surface-history testimony channel
with an exact ledger and indexed accepted-zone witnesses; older archives omit
it without acquiring synthetic events.

## Validation record

The hostile subagent awarded **4/5 PASS** for this declared increment after
two rounds of causal/authentication corrections and actual renderer review.
Fixed findings covered future initial timestamps, contradictory accepted burial
zones, forged guest liberation of a dusting directive, and unnecessary rescans
during ordinary uncoated growth. Independent saved-command replay rejects both
self-rehashed changes to the ledger and deletion of the ledger.

The expanded regression run passed 84 checks across seven serial files. All
eight final renderer controls have empty exception arrays and no shot errors.
Their projected/rendered horizon counts are 0/0/1/1/2/1/0/0. The hero camera is
fixed across the sequence; profile views use a consistent angle but reframe
their changing physical size. The review gallery is
`.local-evidence/surface-gallery.html`; images and manifests live under
`.local-evidence/photos/surface-final-{1..8}`.

The reviewer retained a material limitation: at stage 5 the brown outer coating
dominates, and the simultaneous inner green horizon is difficult to read.
The replay sequence and dated panel carry the order more clearly than that
single frame. This is not a claim of completed two-generation specimen optics.
The separate display-mask phases fix coincident sampling; they do not calibrate
grain scattering, measured patch layouts or per-face growth-front geometry.

The alpha-tier control also renders two horizons with no exceptions or shot
errors. A further 66 checks passed across the observer suite, full O5 film
scenarios, strip bedrock and strip storage. Each observed film-bearing scenario
has a valid ledger, no unavailable marker, and a final coating matching the
existing current-state model. These counts overlap the earlier run.

The owned browser workflow passed all 17 checks, followed by its receipt audit
and nine receipt tests. No browser journey pin needed changing. The fresh
three-seed frequency baseline retains the accepted R7 contents. All 41 freshly
generated strip archives retain every prior scientific field after removing
only the new optional surface-history channel for comparison. That channel
contains 30 crystal records and 185 ordered events: 20 dustings, 78 front
coatings, 85 burials, one boundary crossing and one liberation. None is marked
incomplete. These are actual canonical scenario records, distinct from the
prescribed renderer controls.

The commissioned Node 24.15.0 science rebake passed, including all 55 science
tests across seven files. Aggregate evidence authenticates 128 artifacts;
locality classification has zero unclassified products and zero contract
violations. All three scientific baselines retain the accepted R7 contents.
The 41 JSON and Markdown claim cards change only archive hash links, each
verified against its actual new archive. Mechanism-witness payloads and all
browser journey outcomes remain unchanged; their differences are exact runtime
and producer fingerprints. Release generation/check and generated-build checks
pass. The independent hostile evidence review retained **4/5 PASS**, cross-linking
all front-coating, burial, crossing and liberation events to the unchanged
accepted zones or enclosure receipts.

Fresh production captures passed for Elmwood (200 steps) and
`tn457_barite_pulses` (110 steps), seed 42: four images each, no exceptions and
no shot errors. All four hero PNGs are byte-identical to the accepted R7 control
captures. The new captures preserve those existing forms and materials; they
are regression controls, not claims of a new visual improvement in those frames.
Contact sheets are `.local-evidence/photos/surface-production-elmwood/contact-sheet.html`
and `.local-evidence/photos/surface-production-tn457_barite_pulses/contact-sheet.html`.
Build/cached-redraw measurements were 464/14.2 ms and 336/8.3 ms on this
workstation; these small scenes do not establish slower-device performance.

An isolated checkout of candidate `6105b4d7` passed fresh `npm ci` for both
runtimes, typecheck, build, the full checked-in CI audit sequence, the calibrated
supergene sentinel, **199 regression tests across 14 serial files**, and the
agent CLI help smoke. The checkout remained clean. This is local cold CI,
not the all-files test suite or a hosted GitHub Actions run. The subsequent
amendment records only validation results in this document; executable, test,
producer and evidence contents remain identical to that tested candidate.
Final-tree build, science, evidence and release identity are checked again
before push. GitHub's configured workflow runs on main pushes or pull requests;
this feature-branch delivery does not itself trigger deployment.

Controlled
`surface-1-quartz` through `surface-8-quartz` photo fixtures
use actual coating and accepted-zone writers with prescribed growth amounts;
they are diagnostic experiments, not claimed natural scenario outcomes.

Execution evidence: `.local-evidence/surface-science.log`,
`.local-evidence/surface-release-audit.log`,
`.local-evidence/surface-artifact-diff-fixed.log`, and
`.local-evidence/surface-production-photos.log`. The local comparison helper
initially omitted the necessary changed archive-hash field; its corrected
check permits only that field and verifies the actual archive digest. No
runtime, baseline, receipt or claim-card contents were edited to resolve it.
Cold-checkout logs: `.local-evidence/surface-cold-ci.log` and the corresponding
`.local-evidence/surface-cold-*.log` files. Final commit identity is recorded in
`.local-evidence/surface-final-identity.log`.
