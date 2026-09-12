# R4 form acceptance — SIM 285 — 2026-09-11

This review closes the remaining implementation and form-audit gates of R4.
It preserves the user-accepted topaz prism, ordinary selenite intergrowth,
barite habit distinctions and compact aragonite. It does not claim new user
visual approval or completion of the material/inclusion pass.

## Final changes

- Optional quartz s {11-21} and x {51-61} planes accompany the existing m/r/z
  families on a deterministic subset of ordinary crystals. The opposite end
  follows point group 32; the attachment scar is removed only for the true
  doubly terminated route. Distances are representative face development, not
  measured face velocities or inferred handedness. Indices: USGS Bulletin
  973-E, p.206, https://pubs.usgs.gov/bul/0973e/report.pdf.
- Chamfering now recognizes inward-wound convex primitives, welds signed zero
  consistently, and closes a missing planar bottom only when every open edge
  lies on that attachment plane. A legacy rhombohedron's equatorial tier is
  corrected so its six rhombs are planar. Width remains 0.5% of the shortest
  local extent. Concave intergrowths, curved forms and massive aggregates retain
  their construction; the topaz transverse-junction exception remains intact.
- A filtered, sub-micron face-normal perturbation supplies a sparse shallow
  hillock on eligible faceted bodies. Concentric ripples were rejected in the
  studio control. This is display relief, not a growth-history reconstruction.
- The executed fleet exposed two generic split shortcuts missed by a fresh-record
  census. Gypsum split aggregates now contain intersecting monoclinic plates,
  with a distinct compact rose arrangement. Existing hourglass intensity and
  flooding are carried into the plate colours. Acicular split aggregates use
  fine system-aware prisms with spread controlled by the recorded split index.
  Composite bodies scale uniformly and do not receive a second satellite forest.
- Named gypsum swallowtail twins now take priority over the generic split sphere.
  Their paired monoclinic plates retain the existing display twin separation and
  recorded hourglass appearance. Ordinary rose crossings do not acquire a twin law.
- Fibrous surface mats use closed parallel-sided display filaments instead of
  a cone. Their existing instance placement, coverage, relief and mineral
  quantities are unchanged. Filaments are not new simulated nucleations.
- Recorded borax cottonballs retain rounded aggregate form after dehydration
  to tincalconite. Prismatic borax pseudomorphs retain their precursor's system
  route only when the precursor is recorded; a name alone does not invent it.

Gypsum's tabular/rosette vocabulary is supported by the
[Handbook of Mineralogy](https://www.handbookofmineralogy.org/pdfs/gypsum.pdf).
The hourglass context is documented by
[USFWS Salt Plains](https://www.fws.gov/refuge/salt-plains).
The borate cottonball description is documented in the
[Ryan Historic District record](https://ohp.parks.ca.gov/pages/1067/files/CA_Inyo_RyanHistoricDistrict_REDACTED.pdf).
These references support form vocabulary, not an identity of growth mechanisms
or a quantitative calibration of the representative arrangements.

## Acceptance evidence

- 379 focused tests across 26 files pass, covering form construction, routing,
  contact/cluster behavior, split records, materials and surface representations.
- Fresh owned-browser verification and its audit pass; all nine receipt tests pass.
- Full Node 24.15.0 science rebake passes: 128 authenticated artifacts, 55 science
  tests, zero locality contract violations and zero unclassified products.
- Both numerical baselines, all 41 growth archives and the strip digest remain
  unchanged. All 41 claim cards differ only in linked artifact payload hashes.
- Release generation/audit, typecheck and exact 184-module build check pass.
- The 41-scenario photograph sweep and the final controlled probes have no browser
  exceptions. The final gypsum twin and split plates were inspected in two views.

These are 443 focused/receipt/science tests. This report does not claim the
repository's all-files test suite or a GitHub-hosted CI run. A clean-checkout
run of the configured CI checks gates the branch push.

The first browser run differed from the previous receipt only at six ID fields:
Creative and skip before/after run IDs, plus the two copies of the collection ID.
The geology fingerprints and every other journey value were identical. Exact
observed pins changed from save-16-33h to save-16-v6k, save-16-evi to save-16-idn,
and cry-16-yof to cry-16-ze5. This is the existing F13 allocation-stream coupling;
no comparison was weakened and no scientific baseline was redefined.

The passive morphology instrument still reports four non-hexagonal default-token
candidates, no cubic-prism candidates, and two unknown-system candidates. Four
is below R4's <=10 gate. The executed census resolves the four named defaults
(birnessite, hydrozincite, tyuyamunite and coffinite) to surface representations,
not free hexagonal prisms. Tiger's eye uses a preserved surface fabric; the
tincalconite case is reviewed through an executed Searles Lake precursor history.
This is not a claim that zero execution failures means zero visual defects.

The controlled census checks all 710 default/variant habit labels in the data
across 178 minerals, with no missing representations, nonfinite coordinates or
changes to the scientific fields it snapshots. It excludes transformation-only
products and fresh tincalconite because those require actual precursor histories.
Dynamic habits and recorded special states are separately covered by scenario
photographs and focused regression tests. The census is not a simulation result.

Local photos live under `.local-evidence/photos/r4i-*`; the full review index is
`.local-evidence/r4i-fleet-gallery.html`, with paginated captures
`.local-evidence/r4i-gallery-*.png`. Controlled fixtures are explicitly marked
in their manifests. `--probe isolated` hides other bodies for diagnosis and is
not a normal gameplay frame. The accepted topaz control retains its saved camera.

Reproduce the numerical census with `node tools/r4-morphology-census.mjs` after
`npm run build`. Reproduce ordinary fixture controls with `tools/photo-rig.mjs`
and its `quartz-double`, `quartz-accessory`, `aragonite-ordinary`,
`aragonite-contact` and `aragonite-trilling` fixture options. The aragonite
controls use `tutorial_travertine`; the quartz controls use `amethyst_geode`.

## Remaining realism work, outside the completed form gate

The next implementation is recorded in
[Cloudy growth zones](CLOUDY-GROWTH-ZONES-2026-09-11.md): surviving internal
cloud/clear growth for eligible convex bodies, preserving this form acceptance.

The former broad R4 residual note mixed missing form work with future scientific
and material work. Actual per-face advance histories are not reconstructed here:
the existing quartz bands use aggregate zone records, and the new relief is a
display convention. Richer special-quartz striation histories, inclusions,
cloudy/clear growth zones, staining, weathering and calibrated refraction still
belong to subsequent history/material work. No such work is silently marked done.

The 41-scenario review also shows residual generic split aggregates in celestine
and erythrite, plus sparse populations, clean faces and exposed
matrix limitations. R4 form acceptance does not turn those into a photorealism
claim. Graphics quality controls and progressive refinement remain the user's
deferred final-polish task.


Local RTX 3080 timing in the final 41-scene photos: Bisbee rebuilt in 9.956 s;
supergene oxidation was the slowest at 19.217 s. The largest cached redraw was
17.7 ms and largest median frame time 10.4 ms. These are measurements from this
workstation, not guarantees for slower hardware or evidence of a before/after
performance change. Cold rebuild cost remains part of the deferred performance work.
