# Cloudy growth zones

This pass follows the accepted R4 forms. It renders surviving growth history
inside ordinary convex quartz, topaz, apatite, barite and aragonite bodies.
It does not alter crystal dimensions, habits, growth kinetics, inclusion records,
or the simulation's random stream.

## Acceptance boundary

PASS as a declared visual-realism bridge; HOLD as completed formation memory.
The recorded-only correction removes all invented cloud density. Empty histories,
unflagged layers, and fully dissolved inclusion episodes contribute zero density.
Veils and windows only modulate recorded density; they cannot create a cloud event.
Without surviving inclusions, materials use catalog clarity, absorption and lustre,
without the cloudy transmission cap, alpha opacity floor or bulk blur. Replay uses
only the surviving history at its cursor, including for its material policy.

## What the records support

`GrowthZone.thickness_um` orders the surviving material and `fluid_inclusion`
identifies recorded trapped-fluid episodes. Dissolution removes the youngest
surviving layers first. Replay reads only the history at its cursor. Sixteen
area-averaged density bins retain contributions from thin episodes without an
unbounded shader array.

The records contain axial thickness, not reconstructed per-face growth fronts.
The display therefore maps surviving thickness to nested, geometrically similar
shells bounded by the body's actual convex faces. The shell mapping, density
weights and quiet clear windows are appearance conventions. There is no default core.
They are not measured inclusion concentrations, reconstructed fluid chemistry,
or evidence that an unrecorded inclusion event occurred.

This distinction follows the general use of inclusions as records of gemstone
growth and later history described in [GIA's introduction to gemstone inclusions](https://www.gia.edu/gems-gemology/summer-2022-colored-stones-unearthed).
That source does not calibrate this renderer's scattering constants.

## Rendering boundaries

- Volume scattering is available in the transmission tier. The alpha fallback
  keeps a 0.90 opacity floor only when surviving inclusions are recorded and does
  not resolve the internal shells. Unrecorded crystals retain catalog alpha clarity.
- Convex single bodies and eligible individual satellites each receive their own
  exit planes. Concave cyclic twins and fused intergrowth meshes are excluded;
  a convex approximation must not fill their real gaps with cloudy matter.
- Existing inclusion, sector-zone, hollow-cast, etched and surface-growth paths
  retain their own treatments. Calcite is outside this pass.
- Roughness inside the body is separate from the polished outer faces. This is
  a bounded scattering approximation, not a complete multiple-scattering solver.
- Rendering cache keys include the surviving cloud profile, including replay.
  Editing a flag on an existing layer therefore refreshes its appearance even
  when crystal size and zone count stay unchanged.

## Reproduction

The photo rig accepts `cloud-{core,band,clear}-{mineral}` fixtures. These replace
one existing same-mineral crystal with a controlled display record and explicitly
label the manifest as a fixture, not a simulated outcome. Core, buried-band and
clear controls share geometry, placement and growth thickness.

```sh
node tools/photo-rig.mjs --scenario amethyst_geode --seed 42 --fixture cloud-core-quartz --mineral quartz --shots hero --hero-n 1 --probe isolated,profile --mood studio
node tools/test-workflow.mjs --file tests-js/cloudy-growth.test.ts --file tests-js/gem-prism-r4.test.ts --file tests-js/optics-r2-materials.test.ts
```

## Initial bridge validation (before the recorded-only correction)

The final controlled photos live under
`.local-evidence/photos/cloud-final-{mineral}-{core,band,clear}`. Quartz has all
three history controls. Topaz, apatite, tabular barite and columnar aragonite have
core controls. Each includes the main view, an isolated body and a second angle.
Additional `cloud-actual-topaz` and `cloud-actual-quartz` sets retain the simulated
records, and `cloud-alpha-quartz` checks the fallback. All ten runs produced the
requested shot with zero runtime/console exceptions and zero shot errors.

The core control shows a soft buried veil; the band control redistributes it
around an older interior. Clearer windows remain quiet, and broad reflections
can still obscure them at some angles. This is not a claim that every cloud
boundary is legible in every view. The actual amethyst includes a special form
outside the ordinary convex route, which remains on its existing treatment.

The focused suite passed **172 tests in 14 serial files**, covering surviving
history, real production routes for the five species, cloud cache invalidation,
material tier changes, accepted forms, contact placement, existing inclusions,
band rendering, lighting and specimen presentation. The tests also reject cloud
volumes across the open gaps of concave cyclic twins.

The fresh owned-browser workflow and its **nine receipt tests** pass. Only two
allocation-derived identifiers changed: `cry-16-ze5` → `cry-16-w8g` and
`save-16-idn` → `save-16-jzb`, appearing in four journey fields. An exact candidate
comparison found no other journey differences; the strict producer/test pins
were updated and the browser workflow was rerun successfully.

The complete Node **24.15.0** science rebake passes, including **55 science tests**
and authentication of **128 artifacts**. Locality validation reports zero contract
violations and zero unclassified products. The three-seed locality baseline,
canonical seed-42 baseline, all **41 strip archives**, and the strip digest are
unchanged from the preceding commit. All **41 claim cards** differ only in their
artifact-payload hash links. No scientific result was repinned.

Release generation/audit, typecheck and the exact **185-module** build check pass.
The delivery uses a clean checkout with fresh dependencies for a further CI
check; no all-files test-suite or hosted GitHub Actions result is implied here.

## Recorded-only correction validation

Controlled clear/core pairs for quartz and topaz are in
`.local-evidence/photos/recorded-{quartz,topaz}-{clear,core}`. Geometry, lighting
and placement are held constant. Clear controls visibly transmit the background;
recorded cores retain internal scattering. This verifies the record-dependent
display distinction, not a calibrated physical inclusion concentration.

Validation passed: 176 renderer tests in 14 serial files, nine browser-receipt
tests, the fresh owned-browser journey, 55 science tests, release audits,
typecheck and exact build check. All four photo runs completed without runtime
exceptions. The three-seed locality baseline, canonical seed-42 baseline, all 41
strip archives, strip digest and all 41 claim cards are unchanged. Only runtime
bindings and their dependent evidence links changed. No browser expectation or scientific result was
repinned. These checks establish integration and unchanged science outputs;
they do not turn the visual bridge into completed formation memory.
