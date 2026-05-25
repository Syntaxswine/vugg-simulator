# HANDOFF: Path C — per-vertex cavity chemistry

> **Authored:** 2026-05-11 by Claude (Sonnet 4.5, vugg session) at end of the Path C campaign.
> **Status:** Closure doc for the Phase 4 cavity-mesh work. The chemistry side shipped end-to-end; three tranches deferred per §14 of PROPOSAL-CAVITY-MESH.

---

## 1. TL;DR for the next agent

The vugg-simulator's cavity chemistry used to be per-ring (one FluidChemistry instance shared by all ~120 cells in each of 16 height bands). After Phase 4 of the cavity-mesh proposal, it's per-vertex (one FluidChemistry per cell on the cavity mesh — 1920 independent instances on the default lat-long tessellation). Each crystal nucleates with its own local broth; chemistry evolves under mesh-edge Laplacian diffusion; events propagate through every cell.

**SIM_VERSION 68** captures this baseline. The previous baseline (v67) is the per-ring world; v68 is the per-vertex world. The simulation behavior shifted across 14 of 23 scenarios (5 produce fewer crystals, 5 more, 13 unchanged) — geologically interpretable as "crystals no longer share local Ca/SiO2 pools with co-ring siblings."

Tonight's seven Path-C tranches (commits `93fcc2d` → today) landed without a calibration drift fight: Tranches 1-3 + 4b + 4c were byte-identical refactors, Tranche 4a was the deliberate science-shift commit, and the v68 baseline was regenerated cleanly. The chemistry foundation is now the science-grounded one the boss asked for ("foundation based on the science").

---

## 2. What shipped this campaign

Seven commits on the cavity-mesh Phase 4 (Path C) decomposition, plus the three earlier phases (1-3) that built the runway:

| commit | tranche | what |
|--------|---------|------|
| `bada9a4` | Phase 1 | Crystal anchor abstraction — `wall_anchor: {phi, theta, ringIdx, cellIdx}` replaces direct ring/cell reads |
| `3d32e09` | Phase 2 | `WallMesh` class — cavity geometry centralizes; Three.js reads from `wall.meshFor(sim)` |
| `1f9bf99` | Phase 3 | Zone chemistry opt-in — `wall.zone_chemistry: {floor, wall, ceiling}` + tunable diffusion rate |
| `93fcc2d` | Phase 4 T1 | `mesh.cells[]` container + growth swap; cells aliased to `ring_fluids[r]` (byte-identical) |
| `8ef6a40` | Phase 4 T2 | Mesh-edge Laplacian via `mesh.diffuse()`; `mesh.propagateDelta()` for events; dedup-by-fluid-identity preserved ring behavior |
| `7a5bb75` | Phase 4 T3 | `fluid_surface_height_mm` canonical name; legacy `fluid_surface_ring` is a get/set alias |
| `3987a92` | Phase 4 T4a | **Un-alias cells (per-vertex chemistry live, SIM_VERSION 67→68)** |
| `a30d032` | Phase 4 T4b | Crystal legacy fields dropped (`wall_ring_index`, `wall_center_cell`) — Phase 1's deprecation completes |
| HEAD (this commit) | Phase 4 T4c | Unified storage — `mesh.cells[i]` IS `wall.rings[r][c]` (shared references); WallCell carries `fluid` + `temperature_ring` directly; dead fallback paths removed |

Deferred (per §14 of PROPOSAL-CAVITY-MESH):
- Tranche 5 — snapshot schema flatten (`rings: [r][c]` → `cells: [i]`). Cosmetic until Phase 2.5 ships a non-lat-long tessellation.
- Tranche 6 — per-vertex nucleation engines. Awaits a scenario that wants zone_chemistry to bias nucleation placement.
- Tranche 7 — 2D-strip renderer disposition. Policy call (retire 99b or keep as fallback). Default: keep.

---

## 3. State of the code

### Authoritative storage (post-Tranche 4c)

| where | what |
|-------|------|
| `wall.rings[r][c]` (= `mesh.cells[r * N + c]`) | WallCell with `wall_depth`, `crystal_id`, `mineral`, `thickness_um`, `base_radius_mm`, `fluid`, `temperature_ring`. ONE object accessed via two patterns. |
| `sim.ring_fluids[r]` | Legacy per-ring array. `ring_fluids[equator] === conditions.fluid` (alias for event handlers). The cells own independent clones cloned at `bindRingChemistry` time. |
| `sim.conditions.fluid` | "Global broth" handle. Events mutate it; `mesh.propagateDelta` distributes to every cell. |
| `sim.ring_temperatures[r]` | Per-ring temperature. Still ring-scoped (temperature_ring on each cell points here); a future tranche could migrate to per-vertex. |

### Chemistry flow

- **Init:** `VugSimulator` constructor builds `ring_fluids[]` (with zone_chemistry overrides applied), then calls `wall.meshFor(this)` → `mesh.bindRingChemistry(ring_fluids, ring_temperatures)` which clones each cell's fluid independently.
- **Per-step growth:** `_runEngineForCrystal` swaps `conditions.fluid` to the crystal's own cell.fluid via `mesh.cellOf(crystal, wall)`. Engine mutations hit only that cell's storage.
- **Per-step diffusion:** `_diffuseRingState` delegates to `mesh.diffuse(rate, fieldNames, ringTemps)` — true per-vertex Laplacian over the mesh adjacency.
- **Event propagation:** `_propagateGlobalDelta` delegates to `mesh.propagateDelta(preFluid, fieldNames, equatorFluid)` — applies the delta to every cell.
- **Vadose oxidation:** `_applyVadoseOxidationOverride` iterates cells in transitioning rings, mutates each cell's fluid.
- **Dehydration:** the loop in `run_step` reads each crystal's own `cell.fluid` for the dehydration check.

### Geometry / rendering flow (unchanged from Phases 1-3)

- `WallMesh.recompute(wall, sim)` produces `mesh.positions / colors / normals / indices` from the WallCell `base_radius_mm + wall_depth` values.
- `_topoBuildCavityGeometry` in Three.js renderer reads from `wall.meshFor(sim).{positions, colors, normals, indices}`.
- Crystal placement reads `wall._resolveAnchor(crystal)` → ring/cell pair → `wall.rings[r][c]` (= cell) for `base_radius_mm + wall_depth`.

### Test surface

122/122 tests green at SIM_VERSION 68:
- `tests-js/calibration.test.ts` — seed-42 baselines for all 23 scenarios (v68 baseline regenerated in commit `3987a92`).
- `tests-js/determinism.test.ts` — same seed produces same output.
- `tests-js/smoke.test.ts` — bundle loads, basic mineral spec sanity.
- `tests-js/anchor.test.ts` — Phase 1 anchor helpers; 5 cases including the now-current "no legacy fallback" contract.
- `tests-js/mesh.test.ts` — Phase 2 cavity geometry; 9 cases.
- `tests-js/mesh-cells.test.ts` — Phase 4 per-vertex chemistry; 14 cases including aliasing → un-aliasing transition pins.
- `tests-js/zones.test.ts` — Phase 3 zone chemistry; 7 cases.
- `tests-js/habit-bias.test.ts` — Phase 3.5 stalactite/stalagmite c-axis bias; 15 cases.
- `tests-js/redox.test.ts` — Phase 4b redox infrastructure (unchanged).

---

## 4. What a future agent should know

### The science is in mesh.diffuse + cell.fluid

If you're working on chemistry, the per-vertex model is the canonical one. Don't reach for `ring_fluids[r]` — that's legacy storage that survives only because (a) the equator-alias to `conditions.fluid` lets events propagate to a single object that propagateDelta then distributes, and (b) the zone_chemistry init writes to ring_fluids before bindRingChemistry clones into cells. Both are transitional; a future tranche could collapse ring_fluids[] entirely.

### wall.rings and mesh.cells are the SAME OBJECTS

Tranche 4c made this explicit: `mesh.cells[r * N + c]` IS `wall.rings[r][c]`. Mutations through either path hit the same WallCell. Choose the access pattern that's clearer for the code site (mesh-flat for chemistry, ring-grid for geometry/legacy).

### The equator alias is load-bearing for events

`ring_fluids[equator] === conditions.fluid` (set in VugSimulator constructor). Event handlers mutate `conditions.fluid`; `_propagateGlobalDelta` then propagates the delta to every cell. If you ever need to change how events distribute, look at `mesh.propagateDelta` — the dedup-by-identity-then-iterate-all-cells pattern.

### SIM_VERSION 68 is the per-vertex baseline

Tonight's regenerated baseline at `tests-js/baselines/seed42_v68.json` captures the post-Tranche-4a output for all 23 scenarios. If you change chemistry behavior (engines, diffusion, event handlers), the calibration test will catch it — either intentionally (bump SIM_VERSION + regenerate via `tools/gen-js-baseline.mjs`) or as a regression flag.

### Three tranches are deferred but reachable

- **Tranche 5** (snapshot schema flatten) — defer until Phase 2.5 tessellations.
- **Tranche 6** (per-vertex nucleation) — defer until a scenario needs zone_chemistry to bias nucleation placement.
- **Tranche 7** (2D-strip retirement) — policy call; no engineering blocker.

Each is independently revertable starting from this checkpoint; each is documented in §14 of PROPOSAL-CAVITY-MESH.

---

## 5. Adjacent work that could build on this foundation

The per-vertex chemistry model unlocks several deferred features that previously had no home:

- **PROPOSAL-3D-SIMULATION Phase 5** (multi-ring vertical crystals) — needs per-vertex orientation tagging, which cells already have via `temperature_ring` and the mesh's `vertices[i].orientation`.
- **PROPOSAL-3D-SIMULATION Phase 6** (density-driven convection) — would replace `mesh.diffuse`'s plain Laplacian with a buoyancy-aware advection-diffusion. The mesh adjacency + cell.fluid storage is the substrate.
- **Heterogeneous wall dissolution** (per-cell etching rates, surface roughness) — already specced out-of-scope in PROPOSAL-CAVITY-MESH §9; the per-cell `wall_depth` storage is in place to support it.
- **Stalactite-with-zoned-chemistry tutorial** (PROPOSAL-HABIT-BIAS would extend) — Tranche 6 lands first so the zone_chemistry actually drives where crystals nucleate.

---

## 6. Files touched this campaign

The Path C campaign touched these files (sorted by frequency):

| file | tranches | what |
|------|----------|------|
| `js/23-geometry-wall-mesh.ts` | 1, 2, 4a, 4c | WallMesh class — cells container, bindRingChemistry, diffuse, propagateDelta, cellOf, _buildAdjacency |
| `js/85b-simulator-nucleate.ts` | 1, 4b | `_runEngineForCrystal` reads cell.fluid; legacy field writes dropped |
| `js/85c-simulator-state.ts` | 2, 4a, 4c | `_diffuseRingState` and `_propagateGlobalDelta` delegate to mesh; vadose oxidation iterates cells |
| `js/22-geometry-wall.ts` | 1, 4b, 4c | `_resolveAnchor`, `_anchorFromRingCell`, `WallCell` carries fluid + temperature_ring |
| `js/27-geometry-crystal.ts` | 1, 4b | Crystal carries `wall_anchor` only |
| `js/85-simulator.ts` | 1, 4a | mesh.bindRingChemistry call; dehydration loop reads cell.fluid |
| `js/25-chemistry-conditions.ts` | 3 | `fluid_surface_height_mm` canonical accessor |
| `js/99i-renderer-three.ts`, `99e`, `99b` | 1, 4b | Anchor reads simplified |
| `js/15-version.ts` | 4a | SIM_VERSION 67→68 with rationale block |
| `tests-js/mesh-cells.test.ts` | 1, 2, 3, 4a, 4b, 4c | The per-vertex chemistry test bed (14 cases) |
| `tests-js/zones.test.ts`, `anchor.test.ts`, `determinism.test.ts` | 4a, 4b | Migrated to wall_anchor + mesh.cells |
| `tests-js/baselines/seed42_v68.json` | 4a | New ground-truth baseline |
| `proposals/PROPOSAL-CAVITY-MESH.md` | every tranche | Living tracker; §13 tranche table, §14 deferred-tranches disposition |

---

## 7. Closing notes — observations worth carrying forward

1. **Math equivalence as a refactor anchor.** Tranche 2 introduced the mesh-edge Laplacian via dedup-by-fluid-identity. Same-ring neighbors of aliased cells cancel out in the Laplacian sum, recovering ring-Laplacian behavior byte-identically. That math-first proof made the subsequent un-aliasing (Tranche 4a) a single-flag flip rather than a behavior-rewrite battle. Future tranches that introduce new storage models should look for a similar identity-recovery proof.

2. **RNG order is fragile.** During Tranche 4b I caught a near-miss where my first draft swapped `_assignWallCell` and `_assignWallRing` in the nucleate function. Both consume from the shared seed; the swap shifted every downstream nucleation anchor. The fix is one line; the lesson is that any RNG-touching refactor needs explicit order-preservation comments.

3. **SIM_VERSION bumps cost a baseline regen, not a fight.** When the chemistry model shifted in Tranche 4a, regenerating `seed42_v68.json` from `tools/gen-js-baseline.mjs` was a five-minute task. The bigger work was DOCUMENTING the shift (commit message inventory of which scenarios moved up/down, why). Future versions: the doc is the load-bearing artifact; the file regen is mechanical.

4. **Defer cosmetic schema changes.** Tranche 5 (snapshot rings → cells flatten) is purely a naming refactor that doesn't move any data. Deferring it kept tonight focused on the science change. Cosmetic schema bumps should ship when they unblock real work (e.g., Phase 2.5 tessellation), not because the proposal originally numbered them.

5. **The proposal's living-doc structure paid off.** PROPOSAL-CAVITY-MESH §13 grew from a 4-row Phase tracker (Phase 0/1/2/3/4) into a 7-row tranche table for Phase 4 alone. Each tranche entry has commit SHA, byte-identical claim, risk, and a one-line summary. Future agents can read §13 and know exactly what they're stepping into. Keep this pattern.

6. **Cross-renderer drift is real and worth auditing.** The wireframe renderer (99d) had air-mode gravity logic since v24; the Three.js renderer (99i) never picked it up until habit-bias Slice 1 this evening. Now they agree. Future renderer changes should explicitly note "did both renderers get this?" — drift is silent.

7. **`Auto mode` lets a multi-tranche campaign actually ship.** Eleven commits across three proposals in a single evening would be impossible without trusted autonomy. The boss's `the sediment builds` framing was both license and instruction. Future high-trust sessions: keep proposals as living docs, keep commits dense + observational, push to main as review.
