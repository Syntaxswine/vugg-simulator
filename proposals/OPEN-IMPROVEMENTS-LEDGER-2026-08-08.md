# Authoritative open-improvements ledger — 2026-08-08

This file supersedes stale “open” labels in `BACKLOG.md`, old handoffs, and
individual proposals. Those documents remain historical evidence; this is the
single execution ledger for the science-first AAA completion branch.

## Already delivered — do not reimplement

- Creative mode exposes the full authored geological control surface; the
  canonical registry and audit cover 48 chemistry levers rather than hiding
  “advanced” chemistry. Boundary-authority toggles remain separately audited.
- The nucleation hover explains saturation, limiting inventory, T/pH/redox gates,
  substrate, competition, and survival/dissolution reversal.
- Scenario geometry uses each scenario's authored `shape_seed`; deterministic
  test runs use run seed 42.
- Pressure and differential stress are distinct controls; quartz pressure
  solubility uses the researched Manning correction.
- Explicit sulfur pools, silica provenance, stoichiometric growth inventories,
  authoritative gypsum/anhydrite selection, carbonate ledgers for Sicily, surface
  coating fabrics, and broad Mn/oxide coatings have shipped with tests.
- Sunnyside, Tsumeb, gypsum/anhydrite replacement, Deccan chalcedony testimony,
  and the v247 surface-fabric tranche passed the previous AI Dr. Wise review.
- The former Python/runtime parity backlog is obsolete: the browser TypeScript
  runtime and JSON5 content are authoritative.

## P0 — simulation integrity and architecture

- [x] Conserved DIC / reduced alkalinity / CO2-headspace boundary with explicit
  open, closed, charge, vent, recharge, and uncertainty semantics. Evidence:
  `research/arcs/research-carbonate-boundary-science-2026-08-08.md`,
  `tools/carbonate-boundary-observe.mjs`, 39 regenerated v254 strips, and
  `proposals/HOSTILE-REVIEW-DR-WISE-SIM254-2026-08-08.md`.
- [x] Retire every fixed-DIC pH-only atmospheric consumer. Open reservoirs now
  fail closed without conserved DIC + reduced alkalinity, and Creative always
  constructs the conserved state; the false “solver off” control is gone.
  Initialization/configuration failures remain permanently blocked through the
  real run loop. Evidence: SIM 254,
  `tests-js/carbonate-boundary-conservation.test.ts`,
  `tests-js/carbonate-localization-equilibration.test.ts`, and
  `tests-js/creative-controls.test.ts`.
- [x] Immutable, serializable simulation commands and snapshots; worker-compatible
  progressive execution, cancellation, deterministic parity, and recovery.
  Evidence: `js/85l-simulation-command-protocol.ts` and
  `tests-js/simulation-command-protocol.test.ts` (one-shot/chunk/replay parity,
  cancellation/resume, tamper rejection, two-generation corrupt-save recovery).
- [x] One generated science/provenance manifest that rejects missing citations,
  unsupported ranges, unregistered handlers, and stale scenario metadata.
  Evidence: `tools/gen-science-provenance-manifest.mjs`,
  `data/generated/science-provenance-manifest.json` (39 scenarios, 220 citations),
  and `tests-js/science-provenance-manifest.test.ts`.

## P1 — remaining scientific mechanisms

- [x] Carbonate and sulfate pressure corrections on evidence-backed thermodynamic
  grids; no constant reaction-volume shortcut outside a demonstrated envelope.
  Evidence: `research/arcs/research-thermo-pressure-grid-2026-08-08.md`,
  the digest-pinned generated artifact, Node-only `tools/check-pressure-grid.mjs`,
  bounded runtime consumers, `tests-js/thermo-pressure-grid.test.ts`, and AI Dr.
  Wise `SATISFIED` after the pinned-environment reproducibility rerun on
  2026-08-08.
- [x] Physical etch/dissolution: mass-balanced solid loss, surface retreat/pits,
  solution return, habit-specific kinetics, and reversible visual history.
  Evidence: `research/arcs/research-physical-dissolution-2026-08-08.md`,
  `js/44d-physical-dissolution.ts`, `tools/physical-etch-observe.mjs`,
  `tests-js/etch-overprint.test.ts`, v253 seed-42 baseline/strip/digest/claim-card
  archives, and AI Dr. Wise `SATISFIED` after the ΔG, surface-state,
  bath-protocol, mass-closure, Creative-duration, and schematic-relief hostile
  review loop on 2026-08-08.
- [x] Mixed-carbonate solid solutions with composition-dependent activity and
  recorded zoning where evidence supports it. HMC now uses parent-fluid-bounded
  Mucci partitioning, metastable nonideal calcite–disordered-dolomite component
  activities, exact per-zone `Ca(1-x)Mg(x)CO3` booking/dissolution, and explicit
  unknown Creative verdicts outside measured domains. Rosasite and aurichalcite
  remain Tier-C empirical/observer models because the reviewed evidence does not
  license aqueous-to-solid Cu/Zn partition inference. Evidence:
  `research/arcs/research-mixed-carbonate-solid-solutions-2026-08-08.md`,
  `tests-js/hmc-solid-solution.test.ts`, SIM 255 seed-42 baseline/digest/39-story
  archive, and `proposals/HOSTILE-REVIEW-DR-WISE-SIM255-2026-08-08.md`.
- [x] Thermal field localization: geometry-weighted per-voxel LTE transport,
  finite-volume conservative conduction, explicit rock/source/advection and
  one-way ambient boundaries, immutable source/configuration commands, and
  local nucleation/growth/morphology/diagnosis consumption. Reproducibility
  fingerprints cover voxel fluids/temperatures, dedicated RNG cursors,
  nucleation seed, movement state, and complete zone ledgers. Evidence:
  `research/arcs/research-thermal-field-localization-2026-08-08.md`,
  `research/arcs/research-aragonite-sr-and-ambient-boundaries-2026-08-08.md`,
  `tests-js/thermal-localization.test.ts`, SIM 256 seed-42 baseline,
  39-story archive, 12-story digest, 39 claim cards, and
  `proposals/HOSTILE-REVIEW-DR-WISE-SIM256-2026-08-08.md`.
- [x] Complete open-system carbonate migration for travertine and sabkha.
  Travertine pins its initial DIC/alkalinity and authored vent receipts; sabkha
  runs 24 explicit replacement-water transactions with no unresolved transfer,
  while `salinity_model_missing` keeps its high-salinity results qualitative.
  Evidence: `tools/carbonate-boundary-observe.mjs`,
  `tools/sabkha-carbonate-observe.mjs`, and
  `tests-js/carbonate-boundary-conservation.test.ts`; AI Dr. Wise returned
  `SATISFIED` after the permanent fail-closed and raw-salinity review loop.

## P2 — scenario and content science

- [x] Weathering/vadose epilogues with explicit O2, CO2, drainage, light, and
  dissolution/replacement histories rather than final-state labels. SIM 258
  gives Wittichen a same-site, accepted-shell Co-arsenide weathering history
  before erythrite/Co-aragonite and gives Naica a sulfur-conserving documented
  drain/recharge interval without invented residual-brine salts or imported Las
  Velas facies. The normalized declaration schema fails closed before and after
  activation, every consumer shares one inclusive start/end window, all-depth
  voxel O2 imports are receipted separately from compatibility mirrors, and Co
  uptake books the declared effective DCo=0.1 across the supported domain.
  Evidence: `research/arcs/research-weathering-vadose-epilogues-2026-08-08.md`,
  `tools/weathering-epilogue-observe.mjs`,
  `tests-js/weathering-epilogues.test.ts`, the current SIM 258 baseline,
  39-story archive, 12-story digest, 39 JSON + 39 Markdown claim cards, and
  39-scenario provenance manifest. AI Dr. Wise returned `SATISFIED` after the
  malformed-schema, bounded-window, pre-activation, coefficient-receipt, and
  release-identity hostile-review loop.
- [x] Roughton Gill primary-stage reconstruction before its supergene sequence.
  The mine-specific Bridges et al. hierarchy now replaces the old linarite
  headline with a seed-42 110–130°C quartz–calcite + galena–sphalerite–
  chalcopyrite primary stage, declared open-fluid replacements, conserved
  sulfide-to-sulfate oxidation, carbonate-buffered malachite/cerussite,
  silica-fed hemimorphite, and pyromorphite/plumbogummite. Evidence:
  `research/scenarios/roughten_gill/research-roughton-gill-reconciliation-2026-08-08.md`,
  `tools/roughten-gill-reconciliation-observe.mjs`, and
  `tests-js/roughten-gill.test.ts`; the SIM 257 seed-42 baseline, 39-story
  archive, 12-story digest, and 39 claim cards are current, and AI Dr. Wise
  returned `SATISFIED` after the signed-boundary, honest-encrustation, and
  scenario-local RNG review loop.
- [x] Zn/cation competition sinks and remaining orphaned analytical solutes.
  SIM259 removes phantom Schneeberg Zn, converts pharmacolite and köttigite
  competition selectors from mass ppm to disclosed molar proxies, enforces the
  Tsumeb locality exclusion at runtime, and fails closed across 161 × 7,680
  Zn control volumes. Full local CI passed 203 files/2,744 tests; the AI Dr.
  Michael Wise hostile review returned `SATISFIED` after the dimensional,
  trajectory-integrity, provenance, and generated-artifact review loop.
- [x] BIF/crocidolite/tiger's-eye scenarios built from locality-grade evidence.
  SIM 260 represents both the Heaney–Fisher antitaxial crack-seal model and the
  competing Gutzmer et al. surficial-alteration model, with physical BIF host
  gating, booked amphibole growth/dissolution, zero-framework oxidation state
  overprints, local tiger-iron substrate, and Creative causal diagnosis.
  Evidence: `research/arcs/research-bif-crocidolite-tigers-eye-2026-08-09.md`,
  `tools/asbestos-hills-observe.mjs`, `tests-js/bif-tigers-eye.test.ts`, the
  SIM 260 baseline/digest/41-story archive/41 claim cards, and
  `proposals/HOSTILE-REVIEW-DR-WISE-SIM260-2026-08-09.md`. Full local CI passed
  204 files/2,770 tests; 0/39 pre-existing scenarios moved, and AI Dr. Wise
  returned `SATISFIED`.
- [x] Re-run every locality envelope and negative-evidence constraint against the
  current engine; resolve Bingham/Bisbee and any remaining species mismatches.
  SIM 261 evaluates all 41 authored scenarios at three deterministic science
  seeds against four-tier locality contracts, including explicit negative
  evidence. The rerun found and corrected the Bingham/Bisbee mismatches, then
  closed at 0 envelope failures and 0 negative-evidence failures. Evidence:
  `tools/scenario-locality-rerun.mjs`, `tests-js/scenario-locality-contracts.test.ts`,
  the SIM 261 evidence archive, local commit `325a598`, and an AI Dr. Michael
  Wise hostile-review verdict of `SATISFIED`.
- [x] Retire stale inline narrative fallbacks and generate the narrative manifest.
  The Node-only narrative workflow now generates the manifest from 94 canonical
  Markdown sources and statically validates 589 narrator references with zero
  dynamic variants,
  rejects orphaned files, missing sections, registry mismatches, generated drift,
  and every inline `||` prose fallback. Startup fails closed unless all 94 files
  load, and the formerly implicit quartz Gwindel, sceptre, bent, and Tessin prose
  is now canonical data. Evidence: `tools/narrative-workflow.mjs`,
  `js/04-narrative-manifest.generated.ts`,
  `tests-js/narrative-integrity.test.ts`, an AI Dr. Michael Wise hostile-review
  verdict of `SATISFIED`, and complete local `npm test` coverage of 207 files /
  2,803 tests. The tested resume protocol completed the unchanged game-code
  baseline in memory-bounded batches after finite slow-scenario timeout repairs;
  the observed peak remained below the 2 GB RSS watchdog.

## P3 — product quality gates that can be completed locally

- [x] Establish the topology-independent cavity foundation without changing
  simulation authority: deterministic Cartesian exact-bubble-union field with
  immutable authored elongation/cleft/basin masks, indexed
  shared-face-decided and manifold-validated shadow extraction, default-off
  renderer adapter, 48³/64³
  benchmark receipt, and mutation/determinism tests. Evidence:
  `proposals/PROPOSAL-MARCHING-CUBES-CAVITY.md`,
  `tests-js/cavity-scalar-field.test.ts`, `tests-js/marching-cubes.test.ts`,
  `tests-js/marching-cubes-cavity-integration.test.ts`, and
  `tests-js/marching-cubes-performance.test.ts` (the original 25-test gate plus
  the SIM 262 authored-mask parity, immutability, pole, and benchmark cases),
  plus complete local `npm test` coverage of 211 files / 2,834 tests. The AI
  Dr. Michael Wise hostile-review role returned `SATISFIED` after the original
  four correction rounds covering topology, normals, caching, atomic flags,
  and local winding, then a SIM 262 reconciliation round covering origin
  continuity, immutable mask authority, analytic pole caps, tabular coverage,
  bounded science drift, deterministic build evidence, and desktop/mobile
  browser receipts.
- [x] Establish topology-independent crystal surface anchors before any
  non-star-shaped production opt-in. SIM 264 separates exact physical
  position/void-normal/source identity from the nearest-WallMesh chemistry
  projection, authenticates WallMesh and Cartesian-field triangle/barycentric
  caches, upgrades legacy fixtures only at boundaries, and migrates rendering,
  hit testing, morphology, local chemistry, geodesic occupancy, shielding,
  competition, and architecture placement. Evidence:
  `proposals/PROPOSAL-CAVITY-SURFACE-ANCHORS-2026-08-12.md`,
  `tests-js/cavity-surface-anchor.test.ts`, the v264 science archive, the
  memory-bounded automated test workflow, and desktop/390x844 local-browser
  receipts. The exact-execution evidence receipt authenticates 126 generated
  artifacts; `science:verify` passes 41 scenarios, 236 citations, zero locality
  violations, and 40 focused science tests; the resumed bounded sweep covers
  all 217 test files. Evidence-consuming tests now fail closed against that
  aggregate receipt, O3 determinism uses an independent replay, and the
  vanadate locality pin retains its multi-seed final alive/grown contract. The
  AI Dr. Michael Wise hostile-review role returned `SATISFIED` after
  simulation-authority, evidence-reproducibility, and post-bake test-integrity
  rounds.
  The scalar provider remained default-off until the production promotion below.
- [x] Promote Cartesian cavity geometry after mass-balanced wall evolution joins
  the reconciled authored-mask scalar oracle, with crystal clipping, surface
  anchors, replay, matrix materials, and water appearance consuming the same
  topology. SIM 266 makes the fixed 48³, zero-isovalue Cartesian contract the
  default authority before water, chemistry, or nucleation; erosion preflights
  exact extracted volume and 64³ convergence atomically; replay and unsupported
  rendering fail closed; and geometry/voxel/thermal/fluid caches are sealed from
  public mutation. The optimized Bisbee and memory budgets, the complete
  225-file serial regression sweep, the exact 126-artifact science receipt, 41
  deterministic strips and 82 claim-card files, zero locality violations, and
  repeated AI Dr. Wise `SATISFIED` verdicts close the production gate. Evidence:
  `proposals/PROPOSAL-MARCHING-CUBES-CAVITY.md`,
  `archive/evidence/v266.json`, and local commit `c5b2622`.
- [x] Browser automation for start/run/pause/cancel/save/reload/replay, scenario
  selection, Creative edits, hover diagnosis, keyboard use, and reduced motion.
  `tools/browser-workflow.mjs` now authenticates every restored replay frame,
  requires a visible production cavity, records the exact save-name dialog,
  exercises the causal formation-diagnosis pointer path, and owns browser,
  server, profile, stderr, timeout, and Windows process-tree cleanup. Evidence:
  `tests-js/browser-workflow-cleanup.test.ts` and the local 11/11 workflow receipt.
- [x] Responsive UI repair across narrow/tall and landscape phone viewports;
  touch targets, safe-area insets, no clipped controls, readable overlays.
  The browser matrix covers 320x568, 390x844, 844x390, and 768x1024 title,
  setup, and live-workspace states; it checks viewport fit, 44 px controls,
  safe-area reapplication, and overlay readability.
- [x] Performance and memory budgets with repeatable traces; no orphaned local
  server or worker processes. Evidence: `tools/bisbee-production-budget.mjs`,
  `tools/cavity-production-memory-budget.mjs`, the production cavity benchmark
  suite, the memory-bounded `tools/test-workflow.mjs` watchdog, and the browser
  workflow's failure-path cleanup regressions.
- [x] Save migration, corrupt-save recovery, deterministic replay digests, and
  crash-safe local persistence. Format-v3 recipes fail closed, legacy v1/v2
  bytes remain exportable but cannot masquerade as current replay, and
  generation journals, quarantine, finish/collection WALs, local export/import,
  inert import-close markers, Library provenance, and lifetime counters are
  authenticated and idempotent. Evidence: `js/93a-ui-saves.ts` and
  `tests-js/fortress-saves.test.ts`.
- [x] Progression/tutorial pass that teaches causal geology while preserving the
  complete Creative laboratory. Grand Tour steps now point at the live causal
  formation diagnosis, action/follow-up triggers are linted, and the full
  Creative lever surface remains available. Evidence: `js/70a-tutorial-overlay.ts`,
  `tools/tutorial-lint.mjs`, and the browser workflow.
- [x] Accessible audiovisual controls, captioned/visual event equivalents,
  contrast/focus audits, and scalable text. The local settings contract includes
  100/125/150% text, explicit reduced motion, keyboard-safe dialogs and backup
  import, visible tutorial announcements, and visual equivalents for scientific
  audio. Evidence: `tools/accessibility-audit.mjs`,
  `tests-js/settings-accessibility.test.ts`, and the responsive browser matrix.
- [x] Scenario-authoring validation, preview, deterministic fixture generation,
  provenance fields, and content regression receipts. The tool validates exact
  runtime fluid fields and authored domains, citations, claims, exclusions,
  event order, pressure, and every authored `shape_seed`; previews use seed 42
  by default, bind the exact signed-int32 seed and execution/producer/runtime
  identities, and re-execute the trusted current source before acceptance.
  Evidence: `tools/scenario-authoring.mjs` and
  `tests-js/scenario-authoring.test.ts`.

- [ ] **Visual realism to 7/10 — render rungs R1–R7** (2026-09-04, branch
  `review/visual-realism-2026-09-04`; `proposals/PROPOSAL-HOSTILE-REVIEW-VISUAL-REALISM-2026-09-04.md`).
  Measured today at 2/10 with `tools/photo-rig.mjs` (the review's instrument — headless Chrome
  photographs of the shipped bundle with per-frame luminance statistics and prototype
  experiments): highlight fraction 0 in 40/40 frames vs 0.010 median in the boss's specimen
  photographs; edge fraction 0.009 vs 0.081. Fixed on sight in that commit: euhedral-not-crust
  classification + mass-floored coverage + physically sized coating instances (F1), the
  sphalerite tetrahedron and cubic-name routing (F3), the stale shape audit (F4). **Decided
  2026-09-05 (doc §10):** D1 transmission YES, D2 lustre YES, D3 specimen view beside the orb,
  D4 4096 desktop as an adaptive ceiling / 384 mobile, D5 cave mood in process view + restrained
  studio in specimen view; **order R1 → R2 → R6 → R5 → R3 → R4 → R7**; transplanted onto
  canonical `a9d32a53` (SIM 285) as `review/visual-realism-canonical`, rebaked there, cold CI
  run there — the stale-based tip is not to be merged. Rungs: R1 env-map + shadows + ACES
  (1–2 d), R2 lustre/transmission materials (3–5 d), R6 specimen view (2 d), R5 rock wall
  (2–3 d), R3 coatings at physical scale (2–4 d), R4 Wulff quartz/sphalerite/pyrite/gypsum/
  dolomite/aragonite (4–6 d), R7 aggregate history (3–5 d). Every rung must show a photo-rig
  before/after, its numbers, and an eye-check against the fixed whole-vug photo set.
  Science gap surfaced by the mass floor: amethyst-geode and deccan chalcedony rinds are
  booked too thin to be fabrics (scenario tuning, not render).
  **R1 ✅ 2026-09-05** (same branch, on the cold-CI-green transplant `6a82949b`): PMREM room
  environment (small hot lamp + soft fill; `cave` default / `studio` for R6), ACES + exposure,
  camera-frame shadow key (2048²/1024², step-down gate), exposure-scaled inside/outside; and
  **F14** — the interior wall was culled from inside the cavity (outward normals vs FrontSide;
  every zoomed view was void; hero L 46 → 106). Fleet sweep 41 scenarios vs legacy lights on
  one build: orb subject luminance ×0.88–1.53 (median 1.14), edges up on 39/41. Acceptance
  restated: highlights need R2's materials (alpha caps a clipped reflection near L 200); under
  `--experiment opaque,polish` hero highlights 0.0023, mirror ball 0.016. Doc §5 R1, §3.4, F14.
  **R2 ✅ 2026-09-06** (branch `render/r2-materials`, stacked on R1): materials that behave like
  minerals — `optics.ior` (85 species, mean principal index, webmineral-verified by
  `tools/optics-ior-verify.mjs`) drives real transmission with Beer–Lambert body colour over the
  crystal's own extent; `optics.lustre` (95 species) reaches the pixels through one table
  (metallic → metalness 1 at the measured reflectance `optics.reflectance`, Handbook-of-Mineralogy
  R tables via `tools/optics-reflectance-verify.mjs`; adamantine/vitreous/resinous → roughness
  0.06/0.09/0.22 with F0 from the IOR; pearly → sheen); Depth-A's alpha survives as the
  low-performance tier (mobile, lighting fallback, the step-down gate's second rung). Glass
  needs an opaque backdrop in three's transmission buffer, so the ACTIVE tier follows the wall
  (orb view alpha, inside/specimen view glass). Elmwood hero frames on one build, R2 vs the
  legacy heuristics: edges ×1.5–5.5, inside-silhouette luminance 0.65–0.75× (a clear crystal
  shows its attenuated, refracted shadowed wall, not a 50 % ghost), fluorite hero highlights
  0 → 0.0009; galena inside-silhouette L 11 → 37 in the cave room (0.0068 highlights under the
  studio mood — the R6 number). Doc §5 R2, §3.5.
  **R6 ✅ 2026-09-06** (branch `render/r6-specimen`, stacked on R2): the specimen view beside the
  orb (D3) — a BROKEN geode on a photographer's cloth, as catalog 851 is: a ragged cut facing
  the camera (one uint hash, bit-exact CPU/GLSL), the wall and coating swaths cut per fragment,
  crystal bodies culled whole by anchor (rim crystals stand proud), a rind from the cavity surface
  (weathered lithology skin; edge = the wall's by source vertex) and a fracture face one quad per
  crossed triangle (lining band + fresh-break brown), cloth + contact shadow + cyclorama + fog,
  studio mood, ½-EV exposure, HDR post pass (ACES, grain, vignette; refused honestly without
  float buffers), no DoF by reference. Edges in the photograph band on elmwood (0.041) and mvt
  (0.032), tn457 0.028 (content); galena/pyrite highlights 0.020 / 0.015 at +1 EV (≥ 0.01 met).
  Doc §5 R6, §3.6, F9 FIXED. Next: R5 (the wall), then R3.
  **R5 ✅ 2026-09-07** (branch `render/r5-wall`, stacked on R6): a wall that is rock — F8 re-diagnosed
  (relief families tiled up the shell + a hard-coded orange orientation palette, not the mesh); the
  palette decoded to a shade, triplanar object-mm for both surfaces, two-scale anti-tiling, a spectral
  grain under the genesis relief, per-lithology roughness and iron stain; `--probe wallperiod` (the
  whitened wall-only power spectrum; photographs 1.19–1.48): elmwood druse wall 9.1 → 1.25, specimen
  1.34 / edges 0.056; macro-wall edges honestly under 0.02 (R3's crust). Doc §5 R5, §3.7, F8 FIXED.
  **R3a implemented 2026-09-07** (`codex/visual-realism-r3`, based on R5 `939e483e`):
  continuous, physical-thickness laminated linings replace overlapping plates; exact patch
  area, shared displacement, fine grain, specimen cut/shadows, raycasting and owned-geometry
  cleanup. Deccan's three chalcedony linings photographed before/after; focused 42 tests pass.
  Browser receipt and rebake PASS: 128 artifacts, 55 science tests, all stories and
  simulation baselines unchanged. Cold CI gates publication of the frozen evidence commit.
  **R3b implemented 2026-09-07:** botryoidal films ≤60 µm become continuous normal-grained
  skins; thicker crusts use overlapping, deterministic lognormal lobes capped at 5 mm.
  Mobile count no longer inflates lobes; relief and layer underburden follow the physical
  thickness bound and replay maturity. Bisbee's plate carpet is removed in the production
  photo pair; Deccan and Elmwood photographed as controls. Patch seams remain visible.
  All 44 focused surface/specimen tests pass. The browser rerun and science rebake passed
  (55 science tests, 128 artifacts, zero locality violations); all stories/baselines are
  unchanged. F13's two renderer-allocation-dependent UI IDs are re-pinned from the real
  journey. Cold CI gates publication of the frozen evidence commit.
  **R3c hostile-review PASS 2026-09-07:** connected basal skin with
  merged mound relief replaces thick-crust ellipsoids. Actual contact triangulations carry
  later coats across troughs and partial footprints; local curvature limits prevent folded
  offsets, and microscopic film-edge risers receive explicit connecting faces. Target
  thickness and measured representative relief are reported separately. Independent review
  passed V11 after Bisbee/Deccan/Elmwood production captures and 48 focused tests; Bisbee
  has zero measured top-face folds and zero uncovered paired film steps. Source faceting
  and patch borders remain. Bisbee rebuild is still 10.972 s (R3b: 1.859 s), despite 14.5 ms
  warm reuse and 6.7 ms GPU frame median on RTX 3080; mobile timing is unproven. The browser
  journey and receipt audit pass unchanged, including UI IDs and geology fingerprints.
  Fresh science rebake passes: 128 artifacts, zero locality violations, 55 focused science
  tests. Stories, baselines, digest, mechanism testimony and claim cards are unchanged;
  only executable-bound evidence hashes/links change. Uninterrupted cold CI gates publication
  of the frozen delivery commit.
  R3 remains open for mass-sized druse teeth with the approved adaptive instance ceiling.
  **2026-09-07 delivery:** R3c `f1440235` passed all 276 files in one uninterrupted
  cold CI run and was pushed. User-directed next tranche: R4 crystal forms, starting
  with quartz; the remaining R3 druse work stays open.
  **R4a first quartz pass, 2026-09-07** (`codex/visual-realism-r4`): separate
  point-group-32 m/r/z geometry, unequal termination-face areas, displaced apex,
  and prism striations with stronger bands derived from recorded growth changes.
  Uniform parent/satellite scaling preserves face angles; live history invalidation
  and replay filtering keep the texture current without reading future episodes.
  The scalar-history-to-face mapping is representative, not measured per-face kinetics.
  Cooling before/after photos and Grimsel specialty controls captured; 42 focused
  quartz/alpine/deformation/specimen tests pass. **Validation complete 2026-09-08:**
  97 focused tests including contact/cluster/mesh and browser receipt contracts;
  browser rerun/audit PASS after the proven F13 collection-ID re-pin; fresh science
  rebake PASS (128 artifacts, 55 tests, zero locality violations). Both baselines
  and all 41 stories are byte-identical; claim cards only update evidence links.
  Build/typecheck/release audits pass. No new all-files cold CI run is claimed.
  Other R4 tenants and the wider acceptance target remain open.
  **R4b sulfide pass, 2026-09-08:** sphalerite's distinct positive/negative
  tetrahedra plus {110}; pyrite's cube/octahedron/twelve-face pyritohedron
  combinations with fine symmetry-directed striations. Uniform scale preserves
  angles; attachment and neighbor contacts stay smooth. Etches, iron-cross
  twins, surface growth and recorded skeletal terraces retain precedence.
  Representative face distances are not new per-face kinetic measurements.
  109 focused tests pass; final MVT pyrite captures have no exceptions or failed
  shots. Sphalerite geometry is confirmed in explicitly isolated diagnostics;
  surrounding crystals still obscure it in the normal scene. Full browser journey
  and receipt audit pass with an identical payload and no expectation re-pin;
  9 receipt tests bring focused validation to 118. Fresh science rebake PASS:
  128 artifacts, zero locality violations, 55 science tests. Both baselines,
  all 41 stories, strip digest, mechanism testimony and claim cards are unchanged;
  only executable-bound hashes and evidence links change. No new all-files cold
  CI run is claimed. Typecheck, exact build and release audits pass.
  Remaining R4 species and fleet gate stay open.
  **R4c gypsum/selenite and dolomite, 2026-09-08:** consistent monoclinic
  {010}/{120}/{-111}/{011} blade geometry, and dolomite's six {10-14} planes
  with the `coarse_rhomb` routing defect fixed. Fixed face normals, uniform
  parent/satellite scaling, exact attachment scar placement, width-sensitive
  live invalidation, and a full-rhomb neighbor bound. Special forms and air-mode
  routing retain priority; scientific dimensions and growth records are untouched.
  Naica/sabkha production captures reviewed, zero exceptions/failed shots;
  116 focused tests pass. Full browser journey passes with identical testimony;
  receipt audit and 9 contract tests pass (125 focused tests total).
  Fresh science rebake passes: 55 tests in 7 files, 128 authenticated artifacts,
  zero locality-contract violations. Frequencies, canonical seed-42 baselines,
  all 41 stories, strip digest, mechanism testimony and claim cards are unchanged;
  only executable-bound hashes and evidence links change. No new all-files cold
  CI run is claimed. Typecheck, exact build and release audits pass.
  Remaining R4 species and fleet acceptance stay open.
  **R4c selenite recognition correction, 2026-09-08:** Rock Bot rejected the
  original blocky, isolated appearance. Tighten ordinary blades into thin
  elongated lamellae. The user's natural photo 4 supersedes the regular fan:
  radial intergrowth with related orientation groups, upright and low blades,
  unequal sizes/end-face development/burial, and a compact cloudy basal mass.
  Restrained satin cleavage highlights, lengthwise optical veils and root warmth;
  actual blade thickness feeds optics, alpha depth policy survives tier/helix
  changes, and the basal material participates in helix reveal. Preserve recorded
  special forms and the one-selenite, six-celestine Naica population. Broader wall
  warmth/contact shading and surface damage/encrustations stay open.
  Reviewed capture `naica-s42-r4c-spray-v10` (original hero camera plus full-cluster
  broadside diagnostic), zero exceptions/failed shots. 145 focused tests pass;
  owned-browser validation and its exact receipt audit pass. Fresh science rebake
  passes: 55 science tests, 128 authenticated artifacts, all 41 scenarios and zero
  locality-contract violations. Frequencies, canonical counts, stories, strip
  digest, mechanism testimony and claim cards are unchanged; only executable-bound
  hashes and evidence links change. No new all-files cold CI run is claimed.
  Typecheck, exact build and release audits pass.
  The earlier fan rebake was intentionally interrupted when the user's references
  changed the target. Surface weathering and full specimen fidelity remain open.

  **R4c interpenetration follow-up, 2026-09-08:** User feedback rejected root-only
  joining as insufficient. Blades now cross through the parent body at multiple
  heights, with oblique subsidiary axes/cleavage faces interrupting larger faces.
  No new simulation records or formal twin laws. Capture
  `naica-s42-r4c-penetration-v4`; strict shared-volume regression covers multiple
  identities and tabular/prismatic proportions. User accepted the increment;
  reusable personal `mineral-intergrowth` skill created with the before/after
  case and adaptation guidance for suitable barite/calcite forms. Validation:
  146 focused tests, owned-browser validation and fresh science rebake pass;
  55 science tests, 128 authenticated artifacts, all 41 scenarios, zero locality
  contract violations. Simulation baselines/stories/digest, mechanism testimony
  and claim cards are unchanged. Only executable hashes/evidence references change.
  No new all-files cold CI run is claimed. Typecheck, exact build and release
  audits pass.
  Surface weathering and complete specimen fidelity remain open.

  **R4d barite, 2026-09-09:** Preserve the user's habit distinction: no universal
  selenite-like spray. Ordinary fallback tablets/blades/prisms receive metric
  orthorhombic faces; only `cockscomb` receives a compact overlapping crest.
  Used Wulff, twins, deformation, split forms and snowballs retain priority.
  Correct the generic-prism fallback on cockscombs with unused Wulff tags.
  Capture `wittichen-s42-r4d-final` uses crystal 39 and the before manifest camera;
  MVT tabular and Elmwood snowball controls retained. TN457's prismatic specimen
  is specialized and is only a preservation control. Ordinary prism proportions
  are geometry-tested; broader visual acceptance and weathering remain open.
  158 focused renderer/receipt tests and 55 science tests pass. Fresh browser
  evidence and full science rebake pass (128 artifacts; zero locality violations).
  Baselines, growth archives and strip digest are unchanged; claim cards only
  relink evidence hashes after Chrome's .76 → .83 environment-pin update.
  Release audit, typecheck and exact build check pass. All-files cold CI is not
  claimed; the full R4 tranche remains open.

  **R4e aragonite cyclic twin, 2026-09-09:** Three.js now constructs adjoining
  metric {110} sectors with stepped {001} terminations instead of exact-60-degree
  crossed boxes. Derived orientations use the existing orthorhombic cell; sector
  overlap and heights are representative display development. Recorded fluid
  cyclic twins alone use it; ordinary habits, contact twins, cave frostwork and
  the 2D schematic retain their routes. Final photos use an explicitly labeled
  controlled trilling fixture, plus unmodified travertine/cave controls; no natural
  trilling simulation outcome is claimed. 185 focused tests and 55 science tests
  pass, with fresh browser evidence and full science rebake (128 artifacts; zero
  locality violations). Baselines, archives, claim cards and scientific payloads
  are unchanged. Release audit, typecheck and exact build check pass; all-files
  cold CI is not claimed. Ordinary aragonite forms and wider specimen fidelity
  remain open.

  **R4e recognition correction, 2026-09-10:** User review rejected the preceding
  tall, deeply notched twin. The display body is now 40% shorter and broader,
  with shallow cap steps and metric {011} terminal faces. Aspect-aware geometry
  with uniform scaling preserves inclined normals. Only the exposed union of
  its three sectors is emitted; volume and buried-face tests cover overlap and
  shared-base clipping. The controlled `aragonite-compact-v3` fixture documents
  the change, without claiming a natural simulation outcome or user acceptance.
  Validation: 179 renderer/geometry, 9 browser-receipt and 55 science tests pass;
  fresh browser evidence and full Node 24.15.0 rebake authenticate 128 artifacts
  with zero locality violations. Scientific baselines, archives and payloads are
  unchanged. Release audit, typecheck and exact build check pass. R4 remains
  open; all-files cold CI is not claimed.

  **R4f topaz/apatite, 2026-09-10:** The compact aragonite base was accepted by
  the user. Next, ordinary topaz gains metric prism/dome/cap faces and two
  stable terminal developments; apatite gains sixfold prism/pyramid faces with
  broad caps and recorded prismatic/tabular aspect. Both use uniform scaling
  and closed attachment scars. Shigar topaz and Grimsel apatite before/after
  photos match saved cameras by crystal identity, with isolated diagnostics.
  These are unmodified scenario records. Topaz striations and growth figures,
  broader habit coverage and user visual acceptance remain open.
  Validation: 182 geometry/renderer/scenario tests, 9 browser-receipt tests and
  55 science tests pass, with fresh browser evidence and full Node 24.15.0
  rebake (128 authenticated artifacts; zero locality violations). Scientific
  baselines and growth archives are unchanged. The observed collection-ID
  suffix was re-pinned for renderer allocations; claim-card changes are only
  linked receipt hashes. Release audit, typecheck and exact 183-module build
  check pass. R4 remains open; all-files cold CI is not claimed.

  **R4g form finishing, 2026-09-10:** Topaz gains a continuous prism root and
  shallower terminal shoulders (user acceptance still open). Explicit doubly
  terminated quartz records now have both r/z ends; ordinary/contact aragonite
  uses one/two orthorhombic domains with shared c, retaining the accepted cyclic
  three-domain default. Fifteen needle/fibre fallbacks become system-aware;
  cobaltite/awaruite defaults become cubic and native silver wire becomes curved.
  Existing native dendrites stay branching. Default-habit audit: 21 to 4 nonhex
  flags, 5 to 0 cubic-prism flags, two unknown fabrics. This is a routing audit,
  not visual acceptance of every habit. Closed convex bodies gain cached 0.5%
  short-axis chamfers; complex/open/concave bodies and inclusions are excluded.
  Bisbee: 10.665 s cold / 13.6 ms cached / 6.7 ms median frame on RTX 3080.
  Controlled quartz/aragonite fixture photos are labeled as such. Optional s/x,
  crust/replacement forms, wider chamfers and visual acceptance remain open;
  cloudy zones and inclusions follow stable forms.
  Validation: 180 geometry/renderer, nine browser-receipt and 55 science tests
  pass; fresh Node 24.15.0 browser evidence and full science rebake authenticate
  128 artifacts with zero locality violations. Scientific baselines, growth
  archives and strip digest are unchanged; claim-card changes are only linked
  receipt hashes. Release audit, typecheck and exact 184-module build check pass.
  R4 remains open; all-files cold CI and user visual acceptance are not claimed.

  **R4h topaz body correction, 2026-09-10:** Follow-up to the rejected R4g body.
  Visibility-enlarged topaz now has 40% more straight prism body with preserved
  terminal geometry, a closed root and no transverse junction bevel strip.
  Coarse O2 contact clipping is bypassed only for these enlarged topaz displays;
  actual-size contacts and scientific records remain unchanged. Original-camera
  images and explicitly labeled side profiles are retained for crystals 13/15
  in `r4h-topaz-final`. The user accepted the geometry in `60fafb7a` on
  2026-09-10: coherent orthorhombic body and continuous parallel prism edges.
  The prism-edge debt is closed; preserve this morphology.
  Remaining topaz material polish: distort/refract the background rock texture
  instead of transmitting its diagonal stripes almost unchanged, improve
  vitreous highlights and internal depth, and clarify terminal-face contrast.
  This feedback is queued as material work, not another morphology pass.
  Validation: 78 renderer, nine browser-receipt and 55 science tests pass (142
  total), with fresh browser generation and full Node 24.15.0 science rebake.
  All 128 artifacts authenticate with zero locality violations. Scientific
  baselines, archives and strip digest are unchanged; claim-card differences
  are linked receipt hashes only. Release audit, typecheck and exact 184-module
  build check pass. All-files cold CI is not claimed.

- [ ] **Final visual polish — graphics quality and progressive refinement**
  (user decision 2026-09-07; defer implementation until the realism tranches finish).
  Add an Options quality control for slower computers and render a coarse, usable
  specimen first, refining geometry and lighting in waves. Quality sets the final
  detail level; refinement controls how it arrives. Preserve silhouettes, connected
  coating contacts, mineral colors, populations, growth history and scientific results
  across tiers. Chunk expensive work or use suitable background workers so refinement
  stays interactive; cancel obsolete builds and avoid successive main-thread freezes.
  Optimize cold rebuilds independently, measure slower hardware, and retain a stable
  low-detail tier. R3c Bisbee baseline: 10.972 s cold rebuild / 14.5 ms warm reuse on
  RTX 3080. This is a final-step backlog item, not part of the current R4 work.

## P4 — release systems that can be prepared locally

- [x] Versioned content packs, changelog/migration policy, telemetry-free local
  diagnostics, export/import, and stewardship documentation. Evidence:
  `release/content-pack-manifest.json`, `CHANGELOG.md`,
  `docs/RELEASE-MIGRATION-POLICY.md`, `docs/LOCAL-DIAGNOSTICS.md`,
  `docs/SCIENTIFIC-STEWARDSHIP.md`, and `tools/local-diagnostics.mjs`.
- [x] Production asset manifest, level-of-detail policy, audio mix states, and
  art-direction briefs for the remaining human-made assets. The manifest reads
  save, scientific cavity, presentation LOD, and audio values from the immutable
  `RELEASE_RUNTIME_CONTRACT` executed by the built game; media rights and final
  human art remain explicit external gates. Evidence:
  `release/asset-manifest.json`, `tools/release-audit.mjs`,
  `tests-js/release-systems.test.ts`, and
  `docs/ASSET-LOD-AUDIO-ART-DIRECTION.md`.

## External gates — evidence can be prepared, certification cannot be invented

- [ ] Real iOS/Android device, browser, thermal, battery, and assistive-technology
  matrix performed by humans on physical hardware.
- [ ] Human causality/usability study with representative players.
- [ ] Review/sign-off by an actual mineralogist/geochemist; the AI “Dr. Michael
  Wise” is a hostile-review role, not the real scientist or Smithsonian.
- [ ] Human art direction, licensed final assets, store/legal/privacy review, and
  deployment approval.

## Definition of planned-complete

All local P0–P4 boxes are checked with linked tests/receipts and repeated AI Dr.
Wise review returns `SATISFIED`. External gates must have a runnable protocol and
evidence pack, but remain honestly marked external until humans execute them.
