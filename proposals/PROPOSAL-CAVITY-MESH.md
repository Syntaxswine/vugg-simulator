# PROPOSAL: Cavity-Mesh Architecture (retiring the ring model)

> **Status:** Active. Phases 1, 2, 3 landed 2026-05-11.
> **Authored:** 2026-05-09 by Claude (Sonnet 4.5, vugg session continuation), at boss's direction after the v66 replay-in-3D landing made the redundancy of the ring grid visible.
> **Living doc:** Future agents — **append your observations to §11**, your decisions to §12. Update the phase tracker in §1 when you ship. Don't delete prior content; even wrong predictions are useful broth.

---

## 1. Phase tracker

| phase | name                                       | status      | shipped commits | notes |
|-------|--------------------------------------------|-------------|-----------------|-------|
| 0     | This proposal (read-only)                  | landed      | (this commit)   | The plan itself. |
| 1     | Crystal anchor decouples from ring index   | landed 2026-05-11 | (this branch HEAD; previous = 6c73201) | Pure refactor; calibration baseline byte-identical. 70/70 tests green incl. 5 new `anchor.test.ts`. SIM_VERSION held at 67. |
| 2     | Cavity mesh becomes optional               | landed 2026-05-11 | (this branch HEAD; previous = bada9a4) | `WallMesh` lives in `js/23-geometry-wall-mesh.ts`; Three.js renderer reads from `wall.meshFor(sim)` instead of computing vertices inline. Calibration baseline byte-identical. 79/79 tests green (5 Phase-1 + 9 new Phase-2 in `mesh.test.ts`). |
| 3     | Chemistry zones replace per-ring fluids    | landed 2026-05-11 (conservative variant) | (this branch HEAD; previous = 3d32e09) | Conservative shape: scenario `wall.zone_chemistry: { floor, wall, ceiling }` overrides per-orientation initial fluid; `wall.inter_ring_diffusion_rate` controls homogenization. Default = byte-identical legacy (no opt-in declared). Aggressive variant (collapse ring_fluids[] to a single global / drop ring_fluids[] + diffusion / SIM_VERSION bump) deferred to a future Phase 3.5 if appetite warrants. |
| 4     | Ring grid retires                          | unstarted   | —               | `WallState.rings` becomes a view (or disappears); 2D canvas-vector strip retires or becomes a fallback. Schedule the legacy `wall_ring_index` / `wall_center_cell` drop here. |

Each phase ships independently. No phase blocks the previous from being used in production. If the campaign stalls at Phase 2, Phases 0+1+2 still bought a cleaner anchor model.

---

## 2. Why retire the ring grid

The `WallState.rings[r][c]` grid is a discretization artifact left over from the 2D-strip era. When the only renderer was a 1100×120 canvas strip of the equator, a single ring of 120 cells WAS the cavity. PROPOSAL-3D-SIMULATION Phase 1 (`SIM_VERSION` 18, May 2026) stacked 16 such rings vertically, and PROPOSAL-3D-TOPO-VUG Phase E (`SIM_VERSION` 60-ish, Apr 2026) put a Three.js mesh renderer on top of that grid.

Today (v67, May 2026), the Three.js renderer is the default. It builds its cavity mesh by sampling `wall.rings[r][c].base_radius_mm + wall_depth` at every (ring, cell) pair — but **nothing about the ring grid is fundamental to the simulation any more.** Most of the things the grid was supposed to enable are either (a) already orientation-driven and don't care about the ring index, or (b) were never built because the ring grid turned out not to be the right place for them.

Boss directive 2026-05-09: "we are to the point with the 3D that we can start thinking about abandoning the ring model all together. it seems like doubling work with no benefit."

The "doubling work" specifically: every shape feature has to be coded twice — once for the 2D strip renderer (`js/99b-renderer-topo-2d.ts`) which is fundamentally ring-aligned, and once for the Three.js mesh renderer (`js/99i-renderer-three.ts`) which already projects ring/cell pairs onto a sphere. Future shape work (per-ring bubble profiles, asymmetric features, surface roughness, heterogeneous dissolution) compounds that doubling.

---

## 3. What's actually ring-bound today

Mapped from a `grep -E "rings\[|ring_fluids\[|ring_temperatures\[|wall_ring_index|wall_center_cell"` sweep on 2026-05-09. Numbers are approximate line counts of touched code; file:line refs are anchors for future agents to verify.

### 3.1 Genuinely ring-bound (the only places that care about the GRID, not just position)

| location                                          | what                                              | migration cost |
|---------------------------------------------------|---------------------------------------------------|----------------|
| `js/85-simulator.ts:55-68`                        | `ring_fluids[]`, `ring_temperatures[]` init       | medium |
| `js/85b-simulator-nucleate.ts:332-362`            | Per-step swap of `conditions.fluid` to `ring_fluids[ringIdx]` for growth/dissolution side-effects | medium |
| `js/85c-simulator-state.ts:39-58`                 | `_propagateGlobalDelta` walks all rings to apply event-driven fluid deltas | small |
| `js/85c-simulator-state.ts:117-150`               | `_diffuseRingState` Laplacian diffusion across rings | small (delete if Phase 3 collapses to global fluid) |
| `js/85c-simulator-state.ts:181-244`               | Snapshot writer iterates `wall_state.rings[r]` to push to `wall_state_history`. v66 schema. | medium (schema bump) |
| `js/22-geometry-wall.ts:243-320`                  | `WallState` constructor + `_buildProfile()` writes `rings[r][c].base_radius_mm` | large (this is the rebuild target for Phase 2) |
| `js/99b-renderer-topo-2d.ts` (entire file, 555 lines) | 2D canvas-vector strip — fundamentally ring-aligned (slice stepper picks ring N to display) | retire or fallback (Phase 4) |
| `js/99g-renderer-replay.ts:_topoReplayActiveSnap`  | The snapshot consumed during replay is a multi-ring object | follows snapshot writer (Phase 3 schema bump) |

### 3.2 Orientation-bound, not ring-bound (looks like rings, isn't)

These read ring index purely as a proxy for "where on the cavity" and convert via `WallState.ringOrientation(r)` or a phi calculation. None of them need a grid.

- `nucleation_bias` (`uniform`/`walls_only`/`floor_only`/`ceiling_only`) — checks `ringOrientation(ringIdx)`, which is just `r < count/4 ? 'floor' : r > 3*count/4 ? 'ceiling' : 'wall'`. Trivially swappable for `phi < π/4` / `phi > 3π/4` / else. (`js/85b-simulator-nucleate.ts`)
- `polarProfileFactor(phi)` — already φ-based, takes `phi` not `ringIdx`. (`js/22-geometry-wall.ts:426`)
- `ringTwistRadians(phi)` — already φ-based. (`js/22-geometry-wall.ts:471`)
- `_classifyWaterState(surface, r, n)` — height comparison; `surface` is already a fractional ring index that's equivalent to a height. Convert to absolute mm and the function gets simpler. (referenced in 85c)
- Per-cell `wall_depth` accumulation during dissolution — currently writes to `rings[0][cell]` only (Phase B of PROPOSAL-3D-SIMULATION never wired multi-ring dissolution); migration is "write to the mesh vertex" with no logic change.

### 3.3 Crystal-side anchor (~25 touchpoints)

Every crystal carries `wall_ring_index: number` and `wall_center_cell: number`. Set at nucleation, read by:

- `js/22-geometry-wall.ts:595-612` — `paintCrystal` reads both to write into the right cell
- `js/27-geometry-crystal.ts:70-75` — Crystal constructor defaults
- `js/85-simulator.ts:215` — growth loop uses `wall_ring_index` to pull the right `ring_fluids[r]`
- `js/85b-simulator-nucleate.ts:49-50, 304, 326, 383` — nucleation assigns; CDR / paramorph inherit from parent
- `js/99b-renderer-topo-2d.ts:481-501` — 2D hit-test
- `js/99e-renderer-topo-3d.ts:103-104` — old canvas-vector 3D path
- `js/99i-renderer-three.ts:1281, 1383-1389, 1447-1449` — Three.js renderer + crystals signature + per-frame anchor lookup

This is the **Phase 1 target**: replace `(wall_ring_index, wall_center_cell)` with a single `wall_anchor` that carries (phi, theta) directly, with the ring/cell pair derivable for backward compat during transition.

---

## 4. Target architecture

```
WallMesh {
  vertices: [{ phi, theta, x, y, z }, ...]    // N positions on the cavity surface
  cells:    [{ wall_depth, crystal_id, mineral, thickness_um, base_radius_mm, orientation }, ...]
  triangulation: Uint32Array                    // Indices for renderer + spatial queries
  bubbles:  [[cx, cy, cz, r], ...]              // 3D bubble-merge primitives (Phase 2; can stay 2D-equator-only initially)
  // — methods —
  cellAt(phi, theta) → cellIdx                  // O(log N) via kd-tree or grid hash
  ringOrientationAtPhi(phi) → 'floor' | 'wall' | 'ceiling'
  polarProfileFactor(phi) → number              // same signature as today, mesh-internal
  meanDiameterMm() → number
  max_seen_radius_mm: number
}

Crystal {
  wall_anchor: { phi: number, theta: number, cellIdx: number },  // cellIdx is a cache; phi/theta is truth
  // ... rest of Crystal unchanged
}
```

Why this shape:
- **`vertices` is opaque tessellation**: icosphere, geodesic, or irregular triangulation — the engine doesn't care. Default starts with the current 16×120 grid laid out as 1920 vertices on a sphere (zero behavioral change) and migrates to other tessellations under archetype control.
- **`cells` indexed by vertex** keeps the "one cell per anchor point" invariant the painting code assumes.
- **`phi/theta` is truth, `cellIdx` is cache**: crystals don't break when the mesh re-tessellates. Migration shim recomputes `cellIdx` from `(phi, theta)` after any topology change.
- **`bubbles` 3D-capable**: future archetypes (vesicle chains, fracture swarms) can place bubbles at arbitrary (x, y, z), not just on the equator plane.

---

## 5. Phase 1 — Decouple crystal anchors from ring index

**Goal:** Crystals stop carrying `wall_ring_index` / `wall_center_cell` as their identity. They carry a `wall_anchor: { phi, theta }`. The existing ring grid stays; the renderer and painter convert anchor → (ring, cell) at use-site. Zero functional change; pure refactor.

### 5.1 Scope

- Add `wall_anchor: { phi: number, theta: number, cellIdx: number | null }` to `Crystal`. The `cellIdx` is a derived index into `wall_state.rings[ringIdx]` — kept as a cache so existing code paths don't slow down.
- Add a helper `_anchorFromRingCell(ringIdx, cellIdx, wall)` that fills in `(phi, theta)` from a legacy assignment. Used during the transition by the nucleation code.
- Add a helper `_resolveAnchor(crystal, wall)` that returns `{ ringIdx, cellIdx }` for any consumer that needs the grid pair. Initially this just unpacks from the cached cellIdx; once the mesh exists (Phase 2), it'll do a kd-tree lookup.
- Update all 25 touchpoints to call `_resolveAnchor()` instead of reading `wall_ring_index`/`wall_center_cell` directly.
- Keep `wall_ring_index` and `wall_center_cell` as **legacy fields** on Crystal — kept in sync with `wall_anchor` by setters, so old code that still reads them works for one version. Mark deprecated in comments. Drop in Phase 4.

### 5.2 Files touched (estimated)

| file                                  | lines changed | nature |
|---------------------------------------|--------------:|--------|
| `js/27-geometry-crystal.ts`           | ~10           | Add `wall_anchor` field + sync setter for legacy fields |
| `js/22-geometry-wall.ts`              | ~30           | `paintCrystal` calls `_resolveAnchor`; add `_anchorFromRingCell` helper |
| `js/85b-simulator-nucleate.ts`        | ~25           | Set `wall_anchor` at nucleation; CDR/paramorph inherit |
| `js/85-simulator.ts`                  | ~5            | Growth-loop fluid swap uses `_resolveAnchor` |
| `js/99b-renderer-topo-2d.ts`          | ~10           | Hit-test reads anchor |
| `js/99i-renderer-three.ts`            | ~15           | Mesh placement reads anchor; signature key uses anchor |
| `js/99e-renderer-topo-3d.ts`          | ~5            | Same as 99i, fallback path |
| `tests-js/`                           | ~0            | No new tests needed — refactor is meant to be byte-identical |

**Total:** ~100 lines of touched code, no new files.

### 5.3 Verification

- `npm run build && npm test` — 65/65 should still pass with **byte-identical** baseline (no SIM_VERSION bump).
- Manual: load porphyry seed 42, run 150 steps, click replay — all behavior identical to v67.
- Add a unit test (small): `_resolveAnchor` of a freshly-set crystal returns the (ring, cell) it was set with.

### 5.4 Risk

- **Low.** Pure refactor with parallel old-API/new-API kept in sync. Worst case is a missed touchpoint reading stale `wall_ring_index`; mitigated by leaving the legacy field synced.

---

## 6. Phase 2 — Cavity mesh becomes optional

**Goal:** Introduce `WallMesh` as a new data structure that lives alongside `WallState` but isn't required. The Three.js renderer can opt in to reading from `WallMesh` instead of `WallState.rings`. Scenarios that opt in get a non-ring-aligned cavity.

### 6.1 What ships

- New class `WallMesh` in (probably) `js/23-geometry-wall-mesh.ts`. Holds the data structure from §4.
- New builder `WallMesh.fromArchetype(archetype, opts)` that generates the vertex set + triangulation from archetype parameters. Initial tessellation: icosphere subdivided to ~1920 vertices (matches current 16×120 grid count for a one-to-one perceived density).
- `WallState` gets a `mesh` field, populated lazily on first request, computed from `rings[r][c].base_radius_mm` (so existing data is the source until a scenario opts in to mesh-first).
- `_topoBuildCavityGeometry` (`js/99i-renderer-three.ts:317`) reads from `wall.mesh` when present, falls back to `wall.rings` otherwise.

### 6.2 What doesn't ship in Phase 2

- The engine still writes to `wall_state.rings[r][c]` for painting. The mesh is read-only during Phase 2; the ring grid is still the write target.
- Per-cell dissolution still happens on ring[0] only (the current behavior). Multi-ring dissolution is a separate question we'd answer in Phase 3 or later.
- No new tessellations beyond "icosphere replicating the current shape." That's a Phase 2.5 (per-ring independent bubble profiles, geodesic meshes, etc.).

### 6.3 Verification

- Byte-identical baseline if no scenario opts in.
- Manual visual: porphyry seed 42 with `architecture: 'spherical'` opt-in to mesh — renders identically to ring-grid version (within float epsilon for vertex positioning).

---

## 7. Phase 3 — Chemistry zones

**Goal:** Collapse `ring_fluids[16]` + `ring_temperatures[16]` to either ONE global fluid (the default, byte-identical to today's identical-rings behavior) or to a small set of NAMED zones (`floor` / `wall` / `ceiling`, or arbitrary zone tags per scenario).

### 7.1 The case for collapsing to global

PROPOSAL-3D-SIMULATION Phase 2 ("per-ring chemistry") was supposed to make rings differ. **It never shipped.** Every active scenario today seeds all 16 rings with identical chemistry. The Laplacian diffusion (`_diffuseRingState`) preserves identical-rings as a fixed point — it's a no-op on uniform input. So in practice, all the per-ring chemistry plumbing is doing zero work.

If we collapse to one global fluid, we delete `_diffuseRingState`, `_propagateGlobalDelta`, `ring_fluids[]`, `ring_temperatures[]`, and the per-ring fluid-swap in the growth loop. About 200 lines disappear.

### 7.2 The case for keeping zones (just fewer of them)

Stalactite/stalagmite paragenesis (PROPOSAL-3D-SIMULATION Phase 3, also never shipped) wanted floor vs. ceiling chemistry differences to drive habit bias. Three zones — `floor`, `wall`, `ceiling` — is enough for that. Per-vertex chemistry would be overkill.

Defer that decision to the agent who actually picks up Phase 3. Both options preserve the public API (`conditions.fluid` stays as a per-crystal-at-growth handle); the difference is internal.

### 7.3 Schema bump

- `SIM_VERSION` 67 → 68 (or whatever's current at Phase 3 land time).
- Wall_state_history snapshot drops the `rings` field, gains a `cells` field (flat array indexed by mesh vertex). Migration shim converts old `{ rings: [r][c] }` snapshots to the flat form for replay.
- Crystals drop `wall_ring_index` and `wall_center_cell`. `wall_anchor` is the only positional field.

### 7.4 Drift expectation

- Default behavior (global fluid, uniform rings): **byte-identical** to today. Confirmable.
- If a scenario opts in to zone chemistry, drift is expected and intentional.

---

## 8. Phase 4 — Ring grid retires

**Goal:** `WallState.rings[r][c]` is no longer a real grid. It's either deleted entirely or repurposed as a backward-compat view over the mesh for the 2D fallback renderer.

### 8.1 What retires

- `WallState.rings`, `WallState.ring_count`, `WallState.cells_per_ring`. Or rather: they become computed properties over the mesh, if the 2D fallback is kept.
- The canvas-vector 2D strip (`js/99b-renderer-topo-2d.ts`, ~555 lines) either:
  - **Option A:** Stays as a fallback renderer for low-power devices, reading a synthesized "equator slice" from the mesh. ~200 lines saved.
  - **Option B:** Retires entirely. The "🪨 topo strip" toggle button is removed. ~555 lines saved.
- Crystal's deprecated `wall_ring_index` and `wall_center_cell` fields are deleted.

### 8.2 What stays

- The `WallMesh` vertex grid still has a default tessellation that looks ring-like (a 16×120 lat-long sampling is just one valid mesh). Scenarios that opt out of explicit archetypes get exactly that default. So the "feel" of the existing scenarios is preserved even without literal rings.

---

## 9. Out of scope (deliberately)

These are tempting adjacent changes that this proposal **does not authorize.** Future proposals can pick them up; this one stays focused on the ring → mesh migration.

- **Heterogeneous dissolution rate** — per-cell dissolution rate variation (etching) is a separate feature flag. The mesh makes it cheaper to implement, but Phase 1-4 doesn't ship it.
- **Per-vertex crystallographic facets** — flat planar walls (host crystal faces in pegmatite pockets). Separate proposal.
- **Multi-pocket connected cavities** — the bubble model supports it in 2D; making it readable in 3D is a renderer pass, not a data-model change.
- **Surface micro-roughness** — sub-millimeter texture as a fine-grained noise layer. Renderer/shader work, separate proposal.
- **Replacing the Three.js renderer** — out of scope; the mesh is consumed by the existing renderer.

---

## 10. Cross-references

- `proposals/PROPOSAL-3D-SIMULATION.md` — defined the ring-stack model in Phase 1. Phases 2-6 (per-ring chemistry, orientation habits, multi-ring crystals, density convection) never shipped. Some get reconsidered in Phase 3 of THIS proposal.
- `proposals/PROPOSAL-3D-TOPO-VUG.md` — defined the renderer evolution. Phase F (irregular cavity profile via Fourier) DID ship and is the current ring-grid base_radius_mm pipeline. Phase F's "Fourier on the cross-section" becomes "Fourier on the mesh equator" trivially in the new model.
- `proposals/PROPOSAL-HOST-ROCK.md` — Mechanic 5 (cavity archetypes) shipped as Slice A+B. Five archetypes (spherical / irregular / tabular / pocket / basin) are the design vocabulary the mesh builder will consume.
- `proposals/HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` — most recent campaign-level handoff. Replay-in-3D landed there; this proposal is the next architectural beat.

---

## 11. Observations log — append as you work

Future agents: when you notice something while working in this codebase that informs this migration — a touchpoint we missed, a chemistry assumption that depends on ring index, a scenario file that hard-codes a ring count — add a dated entry below. Even speculative or wrong-in-hindsight observations are useful; they document the broth.

Format:
```
### YYYY-MM-DD — <agent or model> — <one-line summary>
<details, file:line if relevant>
```

### 2026-05-09 — Sonnet 4.5 (proposal author) — Initial survey notes

- The 2D canvas-vector renderer (99b) renders one ring at a time via `_topoActiveSlice` and the slice-stepper buttons. When rings retire, either the slice stepper retires too or it cycles through some other discretization (height bands?). The user-visible UX of the strip mode is "see one ring at a time"; preserving that UX requires picking what "one ring" means post-mesh.

- The replay snapshot writer (`js/85c-simulator-state.ts:_repaintWallState`) was extended in v66 to push multi-ring data plus a `conditions` block. Phase 3's schema bump should keep the conditions block as-is and just swap the rings array for a flat cells array. Confirm decimation policy (v67, `_replayStride`) still applies unchanged — it's step-keyed, not ring-keyed.

- `wall.max_seen_radius_mm` is a monotonic scale reference that only grows. It's currently seeded from the max `base_radius_mm` at init. Mesh version needs the same invariant — `max_seen_radius_mm` from the mesh's max vertex distance.

- Tutorial scenarios (`tutorial_first_crystal`, `tutorial_mn_calcite`, `tutorial_travertine`) are short-run and use default-spherical cavities. They're good Phase 1 verification candidates because their crystal counts are small and any anchor-translation bug shows up immediately.

- The slice stepper label format `"5/16 floor"` (ring 5 of 16, orientation 'floor') uses ring index. If Phase 4 collapses the ring count, this label needs to update — maybe `"floor 32°"` for the φ value or just `"floor"` as a single-zone indicator.

### 2026-05-11 — Sonnet 4.5 (Phase 1 implementer) — Phase 1 landed, byte-identical baseline confirmed

Phase 1 shipped today. Notes from the implementation pass that future phases should carry forward:

- **Touchpoints matched the §3.3 inventory exactly — 7 files, no surprises.** Crystal field, two helpers, paintCrystal, nucleation, _runEngineForCrystal, dehydration loop in 85-simulator.ts, three renderers (99i Three.js sig + mesh placement + satellite userData, 99e canvas-vector fallback, 99b 2D hit-test inclusion-host lookup), and two host-inheritance sites in `_assignWallCell` / `_assignWallRing`. Estimated ~100 lines touched; actual ~120 (the extra came from defensive null guards in `_resolveAnchor` for pre-Phase-1 saves).

- **Calibration baseline passed byte-identical.** `seed42_v67.json` regression suite (`tests-js/calibration.test.ts`) reproduced exactly with the migration in place. The proposal's "byte-identical" claim held: identical RNG sequence, identical mineral counts, identical max_um. SIM_VERSION held at 67 (no schema bump needed — `wall_anchor` is additive on Crystal).

- **Determinism test (`determinism.test.ts`) still reads `wall_ring_index` / `wall_center_cell` directly for its anti-degeneracy anchor comparison.** Left as-is — the legacy fields are kept synced through Phase 4, and the test's purpose is "different seeds give different anchors," which the legacy strings still capture. Worth migrating to `c.wall_anchor.cellIdx` when the legacy fields retire (Phase 4).

- **`_resolveAnchor` has three branches:** (a) `wall_anchor` present → preferred; (b) both legacy fields present → fallback; (c) only `wall_center_cell` (very old pre-Phase-C-v1 save) → ring 0. The third branch is dead in current code but kept defensive; if any pre-2026-05 save ever turns up in replay, it won't crash. Drop in Phase 4 with the legacy fields.

- **Three.js renderer signature builder (`_topoCrystalsSignature`) now keys on the wall_anchor pair.** This means cache busts the moment wall_anchor changes, which it never does today but will in Phase 2 if a mesh re-tessellation moves cellIdx caches. The cache layer is therefore Phase-2-ready already.

- **Satellite `userData.ringIdx` / `userData.cellIdx` aren't actually read anywhere else in the JS tree** (grepped for `userData.ringIdx` and `userData.cellIdx` — zero hits). They're defensive writes for future picking-precision work. Migrated to prefer wall_anchor anyway; the cost is one boolean check per satellite.

- **Phase 2 hot tip:** the kd-tree the proposal mentions for `_resolveAnchor` lookup is overkill while the mesh is a 16×120 lat-long grid. A direct `(phi, theta) → (ringIdx, cellIdx)` reverse map costs O(1): `ringIdx = round(phi/π × ring_count − 0.5)`, `cellIdx = round(theta/2π × cells_per_ring) mod cells_per_ring`. Only when Phase 2.5 introduces an irregular triangulation does the kd-tree become necessary.

### 2026-05-11 — Sonnet 4.5 (Phase 2 implementer) — Phase 2 landed same session

Phase 2 shipped a few hours after Phase 1. Notes:

- **Cavity-geometry math moved verbatim, no formula edits.** The vertex math in `_topoBuildCavityGeometry` (positions, vertex colors, triangulation, pole caps, polar-profile + twist) was lifted line-for-line into `WallMesh.recompute()`. The renderer's responsibility shrank to "ask the wall for its mesh, copy the buffers into a `THREE.BufferGeometry`, update clip uniforms." 79/79 tests pass, calibration baseline byte-identical — proved the lift was clean.

- **`WallMesh._signature` replaces `_topoCavitySignature` (renderer-side).** Renderer keeps a thin wrapper at the original call site so the abstraction lives entirely on the mesh; cache-hit semantics unchanged. Saves the renderer from having to re-derive a fingerprint when the mesh already knows when it's stale.

- **`maxRadiusByRing` is now baked into the mesh.** The renderer used to re-iterate positions to compute per-ring max for the clip-uniform array; now it reads `mesh.maxRadiusByRing[r]` directly. One less O(ring × cell) loop per cavity rebuild.

- **Signature-checksum fragility surfaced by mesh tests:** the cheap fingerprint formula `(base + depth) × (r * 31 + c)` gives weight 0 to cell (0, 0). A dissolution localized to that single cell would be invisible to the cache key. Not a production bug today (real erosion distributes across many cells via `erodeCells`), but Phase 3+ may want a real hash if per-cell dissolution becomes localized. Cost: changing the formula to `(base + depth) × (r * 31 + c + 1)` would fix it for free (no cache miss on existing scenarios since the formula evaluates to a different number across the board anyway, but the signature is local to each session so absolute values don't matter).

- **Renderer buffer copy: `mesh.positions.slice()` per cavity rebuild.** The renderer takes ownership of the buffer it passes to Three.js so subsequent `mesh.recompute()` doesn't mutate the geometry behind the GPU's back. At 16×120 the cost is ~75 KB per rebuild, fired once per dissolution event — within the budget. If Phase 2.5 lifts vertex counts an order of magnitude (e.g., 10× geodesic subdivision), evaluate buffer reuse via `geometry.attributes.position.needsUpdate = true` instead of geometry-swap.

- **Phase 3 wants `WallMesh.cells[]` indexed by vertex.** The mesh already has the `vertices[]` array with `{phi, theta, ringIdx, cellIdx, orientation}` — Phase 3 just adds a parallel `cells[]` slot for per-vertex chemistry state. Painter migrates from `wall.rings[r][c]` to `mesh.cells[i]` where `i = mesh.vertices.findIndex(v => v.ringIdx == r && v.cellIdx == c)` (or a precomputed `vertexIdxFromRingCell(r,c)` helper). Most painters already go through `_resolveAnchor`, so a tiny shim over the mesh would update them all.

### 2026-05-11 — Sonnet 4.5 (Phase 3 implementer) — Phase 3 landed as conservative variant

Phase 3 shipped the same day as Phases 1 & 2. The proposal §7 offered two routes — collapse `ring_fluids[]` to a single global fluid (aggressive), or keep it but layer a named-zone API on top (conservative). I shipped the conservative variant. Notes:

- **The aggressive variant deletes ~200 lines** (`_diffuseRingState`, `_propagateGlobalDelta`, `ring_fluids[]`, `ring_temperatures[]`, per-ring fluid-swap). The conservative variant deletes zero lines but adds a thin opt-in layer. Reason I chose conservative: stalactite/stalagmite paragenesis (the original motivation in PROPOSAL-3D-SIMULATION Phase 3) NEEDS zones. Deleting the plumbing only to reintroduce it under another name is the worst of both sequences.

- **What ships:** `wall.zone_chemistry: { floor: {...overrides}, wall: {...overrides}, ceiling: {...overrides} }` and `wall.inter_ring_diffusion_rate`. Each zone block field-by-field overrides the per-ring initial fluid (Ca, SiO2, pH, whatever) for rings whose `ringOrientation` matches the zone key. Diffusion-rate opt-in lets a scenario pin zones in place (rate=0) or pick a slower equilibration (e.g. 0.01 for ~100-step homogenization vs the default 20-step). Helper: `wall.zoneOf(crystal)` returns the zone tag a narrator can branch on.

- **`SIM_VERSION` held at 67.** Default scenarios (no zone_chemistry declared) produce byte-identical output to v66/Phase-2 — the calibration baseline confirmed this. Snapshot format also unchanged: scenarios that opt in to zones see their zone-tinted broth in the replay's `conditions.fluid` field naturally, but the snapshot schema is the same.

- **The equator-alias issue:** `ring_fluids[equator]` is aliased to `conditions.fluid`. If `wall.zone_chemistry.wall` overrides Ca, the wall-zone update lands on conditions.fluid too (via the alias). This is the right behavior — events that mutate conditions.fluid still propagate to non-equator rings via `_propagateGlobalDelta`, and the equator's Ca starts at the wall-zone value. Tested explicitly in `tests-js/zones.test.ts`.

- **Field-name discoverability:** scenarios pass `zone_chemistry` opaquely, so a typo (`Si: 200` when the real field is `SiO2`) silently writes a `Si` property onto the fluid object without affecting any engine. My initial test made exactly this mistake and burned 30 seconds. Worth a future helper that validates zone overrides against the canonical FluidChemistry field list at scenario-load time (defensive — surfaces typos at boot instead of after a 200-step run).

- **No scenario opts in yet.** Phase 3 ships the API; no shipping scenario uses it. The first natural fit is a stalactite/stalagmite tutorial scenario that demonstrates floor vs ceiling chemistry — but that's a content task best paired with the habit-bias work from the 3D Vugg vision plan (Phase D), not bolted on here. The API exists, ready when content lands.

### (next agent) — append here

---

## 12. Decisions log — append when you decide

Record material design decisions that future agents need to see, even if they seem obvious at the time. Especially: anything that closes a previously-open question, or anything where the "obvious" choice has a non-obvious downside someone else might re-litigate.

### 2026-05-09 — Boss + Sonnet 4.5 — Adopt phased migration, not flag-day swap

Decided: phases 1-4 ship independently. Each phase is independently revertable. No flag-day "delete rings and pray" commit. Reason: chemistry engines are stable post-v67 (mass balance landed); refactor-on-stable-content sequencing applies. Ring infra is "stable content" while it's still load-bearing.

### 2026-05-09 — Sonnet 4.5 — Crystal anchor is `(phi, theta)`, not vertex index

Decided: `wall_anchor` carries `phi` and `theta` directly. Vertex index is a derived cache. Reason: crystals should survive a mesh re-tessellation (e.g. if Phase 2 ships a Phase 2.5 with denser meshes, existing saves shouldn't break). Vertex indices change between tessellations; spherical coordinates don't.

### 2026-05-11 — Sonnet 4.5 — `wall_anchor` shape is `{ phi, theta, ringIdx, cellIdx }` (legacy caches included)

Decided: the new field carries BOTH spherical coordinates AND the cached `(ringIdx, cellIdx)` pair, not just `(phi, theta)`. Reason: every consumer in Phase 1 ultimately wants a ring/cell pair (renderers, painter, per-ring fluid swap), and re-deriving via `floor(phi × ring_count / π)` at every read site costs the migration nothing visible but adds rounding-error risk at ring boundaries. Storing the cache means `_resolveAnchor()` returns the same integers the legacy fields did — bit-for-bit equality on the calibration baseline. Phase 2 replaces the body of `_resolveAnchor` (kd-tree over a mesh), but `_anchorFromRingCell` stays as the constructor used during the ring-grid years.

### 2026-05-11 — Sonnet 4.5 — Phase 2 lifts the math verbatim; no formula edits during the move

Decided: when moving vertex math from `_topoBuildCavityGeometry` into `WallMesh.recompute`, copy-paste the formulas exactly — do not "improve" them mid-lift. Reason: the proposal promises byte-identical default behavior, and the only way to honor that under code review is to make the diff trivially auditable. Anything that LOOKS like a refactor opportunity (e.g., the cheap-signature cell (0,0) weighting that the mesh tests surfaced) gets logged in §11 for a follow-up rather than mixed into the migration commit. Test suite proved this approach worked: 79/79 green including the seed-42 calibration sweep.

### 2026-05-11 — Sonnet 4.5 — `WallMesh` is the cavity surface; per-cell state migration deferred to Phase 3

Decided: Phase 2 puts vertex GEOMETRY (positions, colors, normals, triangulation) on the mesh, but leaves per-cell STATE (`wall_depth`, `crystal_id`, `mineral`, `thickness_um`) on the legacy `wall.rings[r][c]` cells. Reason: keeping these split lets Phase 2 be a pure rendering-side refactor with byte-identical output, while Phase 3 can independently migrate writes (which is the riskier change — the painter touches every dissolution event). The mesh has a placeholder `vertices[]` array carrying the per-vertex *metadata* (phi/theta/ringIdx/cellIdx/orientation); a parallel `cells[]` slot is the natural Phase-3 extension.

### 2026-05-11 — Sonnet 4.5 — Phase 3 ships the conservative variant (zone API on top); aggressive variant deferred

Decided: Phase 3 keeps `ring_fluids[]` and `_diffuseRingState` and adds a thin opt-in named-zone API (`wall.zone_chemistry`, `wall.inter_ring_diffusion_rate`) rather than collapsing per-ring chemistry to a single global fluid. Reason: the original motivation for per-ring chemistry was stalactite/stalagmite paragenesis (PROPOSAL-3D-SIMULATION Phase 3, never shipped). Deleting that infrastructure now only to re-add it later is poor sequencing — keep the plumbing, give it a usable name. Aggressive variant (delete ~200 lines, bump SIM_VERSION) remains the right move IF stalactite paragenesis never ships; revisit in 2027 if zones still have zero adopters.

### 2026-05-11 — Sonnet 4.5 — Phase 3 doesn't ship a scenario opt-in

Decided: Phase 3 ships the API but no shipping scenario uses it. Reason: a stalactite/stalagmite tutorial is a CONTENT task that depends on habit-bias work (PROPOSAL-3D-SIMULATION Phase D, also never shipped). Pairing the two ships better than a half-finished tutorial that uses zones but has nowhere visible for them to land. The Phase 3 API is the prerequisite; the tutorial waits for habit-bias to follow.

### (next agent) — append here
