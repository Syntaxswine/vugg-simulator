# HANDOFF: Simulation UX polish landed — backlog options for next pickup

> **Authored:** 2026-05-12, late, by Claude (Sonnet 4.5)
> **State:** HEAD = `711cc0e` on `origin/main` (Syntaxswine). SIM_VERSION 69. 140/140 tests green. Eight commits landed since the previous handoff (`HANDOFF-PATH-C-SESSION-CLOSE.md`, commit `3119744`).
> **Audience:** next agent (post-compact or fresh session) AND the boss skimming options for the next pickup.

---

## 1. TL;DR

This session was a focused Simulation-mode UX campaign plus a foundational cavity-geometry rewrite. Eight commits in order:

| sha | one-liner |
|-----|-----------|
| `4780cb0` | Audit + integrate canonical/main v68 edits (Mo-flux removal + Deccan apophyllite) |
| `dffa947` | Sim mode: sync cavity + inventory to text-scroll tempo (boss bug report) |
| `5821e42` | 3D sphere-union cavity geometry — fix "laundry-bag" silhouette (v69) |
| `91d1313` | Two seeds: cavity shape AND crystal growth, independently controllable |
| `0f947f3` | Sim mode: sticky autoscroll — let the user scroll up while text streams |
| `a350171` | Sim tempo: cavity advances per line + cavity/text both visible |
| `29e3a69` | Legends layout: scenario controls above WALL PROFILE |
| `711cc0e` | Sticky autoscroll: **fix the column-reverse sign convention** (newest visible) |

The last one was the most important — `0f947f3` shipped sticky-autoscroll with the wrong sign for column-reverse scrollTop, which had been silently hiding all new lines off-screen above the visible panel. `711cc0e` corrects it; the user now actually sees what the sim emits.

No urgent open chips. Five sessions of work converged into a polished play loop.

---

## 2. State of the play loop

### Pre-Grow
Title → mode tabs → **scenario controls (Growth Seed + Shape Seed + Time Steps + Grow/Random/Copy)** → WALL PROFILE placeholder → output panel (welcome message).

### During playback (after click-to-begin)
- Controls hidden, WALL PROFILE moves up to where they were
- Cavity smoothly advances 1→2→3→...→N over the playback duration, interpolating through hidden snapshots between shown step-header text lines (cavity sync is *per-line*, not per-shown-step)
- Crystal Inventory tracks the same step
- New text appears at the panel's visible TOP (column-reverse + corrected sticky-autoscroll)
- Page scroll stays at y=0 throughout
- User can scroll up inside the output panel to re-read history; new appends preserve their reading position, then resume snapping when they scroll back to live

### Post-playback
Controls reappear, cavity sits at final state, inventory at full crystals, output text fully scrolled (newest at top), Collect buttons re-enable.

### The two seeds (`91d1313`)
- **Growth Seed** drives nucleation positions, growth randomness, per-step RNG
- **Shape Seed** drives the cavity's 3D sphere-union geometry (primary + secondaries + tertiaries)
- Independent: lock one, vary the other, study the cross-product
- Empty Shape Seed → scenario's authored shape_seed (locality-anchored cavities preserved)

### The 3D sphere-union cavity (`5821e42`, v69)
- Pre-v69 `_buildProfile` was 2D-extruded — same `rawRadii[c]` duplicated across every ring, producing the "laundry-bag silhouette converging to a point at the pole"
- v69 `_buildProfile3D` generates a true 3D sphere union per boss spec:
  - Primary at origin, radius R
  - Secondaries (count = `primary_bubbles`) on primary's surface, radii uniform `[R/3, 2R/3]`
  - Tertiaries (count = `secondary_bubbles`) on any existing sphere's surface, radii uniform `[0.08R, 0.12R]`
  - Each (ring, cell) raycasts the sphere union for a unique per-vertex `base_radius_mm`

---

## 3. Backlog — three tiers

### Tier 1 — small wins (≤ 1 hour each)

#### A. 5 narrator ports
**Status:** open. Source: `BACKLOG.md` L34-40.
**Why:** Python had narrators for borax, tincalconite, halite, mirabilite, thenardite. JS doesn't. `narrate()`'s dynamic dispatch falls through to `''` for these 5 minerals.
**What to build:**
- `js/92c-narrators-halide.ts` ← `_narrate_halite`
- `js/92j-narrators-sulfate.ts` ← `_narrate_mirabilite`, `_narrate_thenardite`
- new `js/92l-narrators-borate.ts` ← `_narrate_borax`, `_narrate_tincalconite`
**Note:** Python tree was deleted 2026-05-07 (per stored memory `project_vugg_python_dead`). The narratives have to be authored fresh; the file map at BACKLOG.md is still the right landing target.
**Effort:** ~1 hour mechanical work. Each narrator ~30 lines following the existing JS narrator pattern.

#### B. `runSimulation` async-load guard
**Status:** open. Source: `BACKLOG.md` L150-156 (data-as-truth Phase 2 follow-up).
**Why:** JS loads `data/scenarios.json5` asynchronously. If the user clicks Grow before the fetch completes, `SCENARIOS[scenarioName]` is undefined and `runSimulation` throws. Edge case on cold load.
**What to build:** in `runSimulation`, gate scenario execution on `_scenariosJson5Ready === true`. Either show a "loading scenarios..." status or disable Grow until ready.
**Effort:** ~15 min. Localized to `js/91-ui-legends.ts`.

#### C. Sharp-vs-smooth cavity material toggle
**Status:** open. Explicitly deferred in commit `5821e42` body.
**Why:** Boss spec for v69 cavity: "for some materials you may want the sharp edges of intersection, and for other materials you may want to smooth out the vugg." The sphere-union geometry has sharp ridges where spheres meet; `computeVertexNormals` smooths them visually but the underlying geometry is faceted. A per-scenario or per-archetype `cavity_render: 'sharp' | 'smooth'` flag would toggle Three.js material `flatShading` accordingly.
**What to build:**
1. Add `cavity_render: string` to scenario JSON5 schema (default `'smooth'`)
2. Pass through to `wall.cavity_render`
3. In `_topoBuildCavityGeometry` (js/99i-renderer-three.ts), set `cavityMat.flatShading = (wall.cavity_render === 'sharp')`
4. Note: `flatShading: true` requires `geometry.computeVertexNormals()` to be SKIPPED so face normals stay distinct per face.
**Effort:** ~1 hour including testing on 2-3 scenarios with different settings.

#### D. stalactite_demo visual verification
**Status:** open. Source: `HANDOFF-PATH-C-SESSION-CLOSE.md` §3.
**Why:** Habit-bias campaign shipped end-to-end (Slices 1-5, commits `27b44af..69191d7`) including the `stalactite_demo` scenario, with 18-case test suite proving the c-axis math + dripstone routing. But the actual "stalactites hang from the ceiling" visual moment was never confirmed in a browser. The screenshot for the visual record is missing.
**What to build:**
1. New Game → Simulation → pick `stalactite_demo` from scenarios.json5 (it's the showcase for `air_mode_default: true`)
2. Run the playback, screenshot mid-playback and at end
3. Orbit the camera (use the rotate button in WALL PROFILE) to confirm stalactites hang from ceiling cells, stalagmites stand on floor cells, wall crystals project radially
4. If visuals match the test claims, file the screenshot. If they don't, file a bug.
**Effort:** ~30 min if visuals work cleanly; longer if something needs fixing.

---

### Tier 2 — medium, real geological/visual payoff (2-4 hours each)

#### E. Brief-19 Section C — `MINERAL_DISSOLUTION_RATES` back-fill
**Status:** open. Source: `BACKLOG.md` L82 + `HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` Section C.
**Why:** Section A (`MINERAL_STOICHIOMETRY` for growth-side debits) shipped at v67. Today ~120 hand-coded `conditions.fluid.X += dissolved_um * coef` lines across ~10 engine files use per-mineral rates ~50× larger than `MASS_BALANCE_SCALE = 0.01`. Centralize them in a parallel `MINERAL_DISSOLUTION_RATES` table so the `applyMassBalance` wrapper owns BOTH directions of mass flux. Once unified, `MASS_BALANCE_SCALE` can rise back toward the originally-prototyped `0.05` with full bidirectional control.
**What to build:**
1. New `MINERAL_DISSOLUTION_RATES` table in `js/19-mineral-stoichiometry.ts` (or a sibling file)
2. For each engine file's dissolution branch, extract the per-mineral rates into the table
3. Extend `applyMassBalance` wrapper to credit fluid on negative thickness delta
4. Delete the hand-coded engine-internal credit lines (~120 sites)
5. Calibration drift expected — regenerate baseline at SIM_VERSION bump (v69 → v70)
**Effort:** ~3 hours. Mechanical per-mineral work + baseline regen.

#### F. Twin probability retune
**Status:** open. Source: `BACKLOG.md` L107-134.
**Why:** Current `data/minerals.json:twin_laws[].probability` values are derived from natural prevalence ("X% of natural specimens are twinned"). But the game rolls once per crystal at nucleation, so realized in-game twin frequency = per-roll value. Real-world prevalence partly reflects lifetime opportunity for stress/thermal twinning during growth, which the single-roll model doesn't capture. Different minerals get different growth-step counts, so the multiplier varies. The sequencing dependency ("after data-as-truth Option A") is satisfied.
**What to build:**
1. New `tools/twin_rate_check.mjs` (or extend an existing tool) — runs each baseline scenario at seed 42, counts twinned vs untwinned per mineral, reports observed in-game frequencies
2. Compare to literature targets — flag minerals where per-roll rate gives observed-zero despite "common-twinned in nature" status
3. Propose adjusted per-roll probabilities; commit retune
**Effort:** ~3 hours. Tool authoring + analysis + tuning.

#### G. Cavity-mesh Tranche 6 — per-vertex nucleation engines
**Status:** deferred. Source: `PROPOSAL-CAVITY-MESH.md` §14.
**Why:** Today nucleation engines compute σ against `conditions.fluid` (= ring_fluids[equator] alias). The first crystal of a mineral nucleates wherever `_assignWallRing` + `_assignWallCell` picks (area-weighted + orientation-biased), not where σ is highest. For zone-chemistry scenarios, this means engines only fire when the equator's σ exceeds threshold — even if floor or ceiling rings have higher σ. `stalactite_demo` opted out of zone_chemistry partly because of this gap. Tranche 6 closes it.
**What to build:**
1. Add opt-in `wall.per_vertex_nucleation: true` flag
2. When set, `_assignWallCell` weights candidate cells by per-cell σ for the firing mineral (one supersaturation call per cell per nucleation event — bounded cost)
3. Engines themselves don't need to change
4. Author a zone-chemistry scenario (e.g., a Searles-Lake-style salinity-stratified evaporite, or a chemistry-zoned stalactite cave) that demonstrates the feature
**Effort:** ~3 hours. ~30 lines of helper + flag plumbing + a demo scenario.

---

### Tier 3 — bigger architecture (≥ 1 day each)

#### H. Geological-accuracy Phase 3 — CO₂ degassing + travertine
**Status:** open. Source: `BACKLOG.md` Phases 3-6 section, plus `PROPOSAL-GEOLOGICAL-ACCURACY.md`.
**Why:** Phases 1+2 (mass balance + activity coefficients) shipped at SIM_VERSION 21. Phase 3 (carbonate speciation + CO₂ degassing as a first-class precipitation driver) is the highest-visible-payoff remaining phase. New `co2_degas` event type + travertine tutorial scenario. **Couples with `PROPOSAL-VOLATILE-GASES.md` Mechanic 2** — same gap, share the headspace state vector.
**Effort:** ~2 days. Two coupled proposals; scope is real.

#### I. Cavity-mesh Phase 2.5 — non-lat-long tessellation
**Status:** open (no proposal section yet). Inferred from `PROPOSAL-CAVITY-MESH.md` §14 Tranche 5 ("when Phase 2.5 ships a non-lat-long tessellation...").
**Why:** Lat-long tessellation has poles where cells get arbitrarily small + a seam at theta=0. Icosphere or geodesic gives uniform cell size, no seam, no poles. Would unblock Tranche 5 (snapshot schema flatten) and Tranche 6 (per-vertex nucleation engines).
**What to build:** the WallMesh factory becomes the swap point. New tessellation generators emit `vertices[]`, `cells[]`, `indices[]` in the same shape as the lat-long version. Renderer + chemistry are tessellation-agnostic by design (Path C per-vertex chemistry already pays this off).
**Effort:** ~2 days. Tessellation math + adjacency rebuild + cavity color/orientation rules for non-ring topology.

#### J. Brief-19 Section B — engine calibration sweep
**Status:** open. Source: `HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` Section B.
**Why:** All 19 brief-introduced minerals re-verified against literature ranges. Some engines have known drift from sim-version evolution (bornite, magnetite). A focused sweep would either confirm current behavior or surface tuning candidates.
**Effort:** ~1 day. Per-mineral research + comparison to current σ thresholds + recommendation report.

---

## 4. Sequencing recommendations

Tonight's thread suggests a natural extension into **Tier 1 D (stalactite_demo verification)** or **Tier 1 C (sharp-vs-smooth cavity)** — both close loose threads from recent commits.

If the next session wants geological depth, **Tier 2 E (`MINERAL_DISSOLUTION_RATES`)** is the most under-leveraged shipped infrastructure right now — Section A (growth) does its job, Section C (dissolution) is still hand-coded across the engines.

If appetite for architecture, **Tier 3 H (CO₂ degassing)** is the highest-impact remaining geological phase.

---

## 5. State files for the next agent

| file | purpose |
|------|---------|
| `proposals/BACKLOG.md` | Master backlog. Treat §-by-§ as truth. |
| `proposals/PROPOSAL-CAVITY-MESH.md` | §13 (tranche tracker, completed 1-4c) + §14 (deferred 5-7 with landing conditions) |
| `proposals/HANDOFF-PATH-C-SESSION-CLOSE.md` | Previous session's close (Path C campaign, habit-bias, audit work) |
| `proposals/HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` | Brief-19 campaign sections B-H still open |
| `proposals/HANDOFF-NARRATIVE-TEMPO-AND-POLISH.md` | Narrative-tempo campaign close (now extended through Phase 6 in tonight's commits) |
| `proposals/PROPOSAL-GEOLOGICAL-ACCURACY.md` | Phases 1+2 shipped; 3-6 open |
| `js/README.md` | Authoritative "where does X live" map (post-modular-refactor) |

---

## 6. Verification harness

- `npm run ci` → typecheck + build:check + 140/140 tests
- `npm test` → vitest only
- `node tools/gen-js-baseline.mjs` → regenerate calibration baseline at current SIM_VERSION
- Preview MCP for live UX verification (note: background tabs get setTimeout-throttled to ~1 Hz, so timing-sensitive tests should use the user's foreground browser)

---

## 7. Closing notes

The eight-commit sequence tonight tracks a single arc: the user reported "the simulation starts with all crystals grown" → I shipped inventory step-gating + topo floor bypass → user reported "auto-scroll to bottom" → I shipped sticky-autoscroll with the WRONG SIGN → user reported "still doesn't follow new text" → I found and fixed the sign-convention bug.

The lesson worth carrying: **column-reverse + overflow:auto in Chromium** has `scrollTop = 0` at the BOTTOM of layout (where the FIRST DOM child sits = oldest content). To pin to newest, set `scrollTop = -(scrollHeight - clientHeight)`. The negative-scrollTop range exists precisely for this. The earlier "sticky-autoscroll" commit (`0f947f3`) had been live for two intermediate commits before the symptom was visible, because content didn't overflow enough to expose the bug until many lines accumulated.

Good seat to compact from.
