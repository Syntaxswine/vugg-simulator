# Authoritative open-improvements ledger — 2026-08-08

This file supersedes stale “open” labels in `BACKLOG.md`, old handoffs, and
individual proposals. Those documents remain historical evidence; this is the
single execution ledger for the science-first AAA completion branch.

## Already delivered — do not reimplement

- Creative mode exposes the full authored geological control surface; the audit
  currently covers 50 fields rather than hiding “advanced” chemistry.
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

- [x] **Instrument the cold run and publish its time profile** (2026-08-18,
  `ci/test-quarry`). `tools/test-workflow.mjs` records `wall_ms` +
  `started_iso`/`finished_iso` per batch; `tools/test-profile.mjs` publishes the
  distribution and REFUSES a shard plan on a partial record. Measured: a full cold
  CI is **3 h 28 m**, not the 2.4 h quoted (that stamp was a resumed SEGMENT) and
  never the 9 min in `tools/cold-ci.mjs:20`. p50 7.6 s, max 895.7 s, **10 files hold
  half the run**. Evidence: `proposals/PROPOSAL-TEST-QUARRY.md`,
  `proposals/HANDOFF-TEST-QUARRY-AND-FOREMAN-2026-08-18.md`.
- [x] **Process-hygiene enforcement** (2026-08-18). `tools/process-census.mjs`,
  `tools/host-sampler.mjs`, `tools/foreman.mjs` — atomic machine-wide directory
  lease held outside any checkout, token-authenticated release, telemetry bound to
  the run identity, postflight sweep in a `finally`. Wired into `test-workflow.mjs`
  and `cold-ci.mjs`; `--allow-busy` stamps the run CONTAMINATED everywhere
  downstream. Tests: `tests-js/foreman.test.ts` (24),
  `tests-js/process-census.test.ts` (9), both mutation-tested.
  **2026-08-19 — the two remaining defects closed** (`9d9c00a`, `017f426`):
  heartbeats moved to a token-keyed `hb-<token>.json` (a whole-record rewrite could
  resurrect a stale identity over a successor's); release is park-verify-delete with
  restore (was verify-then-`rmSync`); `cold-ci.mjs` and `concurrency-probe.mjs` await
  async spawns (spawnSync froze the event-loop-hosted heartbeat — the wrapper's claim
  read STALE from 90 s into every run; an external watcher across two full probe runs
  now measures max heartbeat age **15.1 s**). foreman tests 24→28, all mutation-tested.
- [ ] **Chip check** — fast tier over the 127 non-stepping files. Its lever is
  BATCHING: `DEFAULT_TEST_BATCH_SIZE = 1` costs 216 s of a 442 s tier, i.e. 3% of
  the cold run but **49% of a chip check**. Needs an authored changed-file →
  subsystem map; that map is the deliverable and it is authored, not derived.
- [x] **Split `calibration.test.ts`** (2026-08-19, the Flint PR #8 salvage): the
  745 s #3-heaviest file is now `calibration-lib.ts` + 8 name-hash-homed
  `calibration-shard-*.test.ts` stripes (4–9 scenarios each, 41 total) with the
  partition/coverage proof kept in `calibration.test.ts` — completeness and
  disjointness asserted, mutation-tested (a silently dropped scenario turns it RED).
  Authenticated fail-closed baseline loading preserved.
- [ ] **Split the two ~890 s test files** (`conichalcite`, `vanadate-v-economics`).
  PRECONDITION for any formation-check target under an hour: you cannot shard below
  your longest indivisible unit, and that unit is 893.8 s = 14.9 min.
- [ ] **Shard the full suite**, balanced from the recorded per-file durations, with
  concurrency set by `tools/concurrency-probe.mjs` rather than by the stale
  `vitest.config.ts` comment about eight workers consuming most system RAM (this
  host is 63.9 GB / 16 logical). **The probe has now answered** (2026-08-19, clean
  foreman-held runs, after fixing the rig — its first table was serial in every arm
  because an absent CLI flag inherited the config's `fileParallelism:false`): the
  six-file set runs 805.9 s serial → 251.6 s @8 workers (**3.20×**), floor set by
  the longest file. Receipt `concurrency-mt0cmetf`; never cite `mt0ai09y`'s
  multi-worker rows.
- [ ] **Equivalence proof** — the new tiered check must find every deliberately
  seeded failure the old cold check finds. Mutation-test the TIERING: a seeded break
  must turn its *chip* check red, not merely the formation check, or the fast tier is
  decoration.
- [ ] **Merge the duplicated `supergene_oxidation|42|200` call sites** — 283 s, the
  bulk of the declined trajectory cache's entire 432 s ceiling, for minutes of work.
- [ ] **Remove the duplicate `tsc`** (three invocations per cold run). Hygiene, ~8 s.
  Do it; do not bill it as speed.
- [ ] **RSS-sampler false-RED** — `tools/test-workflow.mjs` kills a batch after two
  consecutive `tasklist.exe` failures and reports FAIL, indistinguishable from a real
  failure (signature: `peak 0 MB RSS`, no vitest output, exit `4294967295`). Give
  `monitorError` its own outcome. NOT yet in `CATCHES.md`.
- [ ] **Windows Job Objects** — crash-safe owned-tree teardown. Deferred as separate
  NATIVE hardening: Node has no Job Object API, and `taskkill /T /F` cannot help with
  an abandoned parent, which is the exact case they exist for.

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

- [ ] **Split content currency from recorded environment in the evidence chain**
  (promoted from the BACKLOG Codex-integration debt item c on 2026-08-19, now with
  live evidence). `node_runtime_sha256` CONFLATES two different questions — "is
  this content current" and "was this the bake host's environment" — in one bound
  field, so every cross-OS verify fails as a matter of architecture, not content.
  Measured across three ubuntu adjudication rounds: content receipts verify with
  **ZERO violations on linux**; the only failures are the envelope —
  `audit:science` (run 32274501930), `audit:release` via `catalog_sha256` folding
  the fingerprint (32280067117), and `authenticated-evidence` `loadReceipt`
  refusing outright (32283445918), which also keeps the calibration sentinel
  canonical-box-only. The repair: receipts carry a content identity and a
  recorded-environment identity, verified separately — a content mismatch fails
  everywhere, an environment mismatch fails only checks that claim environment.
  Edits digest-pinned producers (`gen-science-provenance-manifest.mjs` at
  minimum), so it MUST ride a bake. When it lands, restore
  audit:science/audit:evidence/audit:release and the sentinel to
  `.github/workflows/ci.yml` — the exclusion comments there carry these run
  numbers.

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
- [ ] **Refresh `agent-api/vugg-agent.js` from its frozen SIM-237-era bundle to the
  current SIM.** The headless second runtime has not been rebuilt since the fork
  commit (`d4a6205`); it still ships the pre-267 engine while the web build is at
  SIM 271. Tracked INDEPENDENTLY of the environment/content split by explicit
  direction (2026-08-19) — this is a bundle-refresh/product item, not a receipts
  item, and neither blocks the other. Scope when taken: regenerate the bundle from
  the current build, re-verify the Node-24 canvas path (`npm ci --prefix
  agent-api`, help smoke, one rendered specimen run with PNG-magic assertions),
  and re-baseline the README example if the MVT seed-1234 roster moves with the
  engine.

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
