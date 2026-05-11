# PROPOSAL: Habit-Bias — gravity-aware crystal orientation (stalactites, stalagmites)

> **Status:** Active. Slice 1 (Three.js c-axis bias for `growth_environment === 'air'`) landed 2026-05-11.
> **Origin:** 3D-Vugg Vision plan Phase D (`~/.claude/plans/i-have-a-much-soft-stonebraker.md`) + PROPOSAL-3D-SIMULATION Phase 3 (stalactite paragenesis, never shipped). Cavity-mesh Phases 1–3 (commit `1f9bf99`, 2026-05-11) cleared the runway by abstracting crystal anchors and adding `wall.zoneOf(crystal)` for per-orientation chemistry.
> **Living doc:** Future agents — append observations to §11, decisions to §12. Update the slice tracker in §1 when you ship. Don't delete prior content.

---

## 1. Slice tracker

| slice | name | status | shipped commits | notes |
|-------|------|--------|-----------------|-------|
| 0     | This proposal | landed | (this commit) | The plan itself. |
| 1     | Three.js c-axis bias for air crystals | landed 2026-05-11 | (HEAD; previous = 1f9bf99) | `_topoCAxisForCrystal(crystal, nx, ny, nz)` pure helper; ceiling cells → world-down, floor cells → world-up, walls fall back to substrate-normal. 93/93 tests pass; calibration byte-identical (no shipping scenario produces air crystals at scale). |
| 2     | Scenario opt-in `wall.air_mode_default` | unstarted | — | Cave-style scenarios force `growth_environment = 'air'` at every nucleation regardless of water-level mechanic. Default false. |
| 3     | Cluster-satellite air-mode propagation | unstarted | — | Children of an air-mode parent inherit gravity bias. Visible payoff: druzy stalactite clusters with each child also hanging. |
| 4     | Air-mode mass-distribution bias | unstarted | — | Real stalactites have a teardrop profile (wider toward the apex, narrower toward the tip from accreted drips) — the renderer's primitive doesn't capture this. Hand-rolled PRIM_DRIPSTONE in 99d already handles it for the wireframe; port to Three.js. |
| 5     | Stalactite tutorial scenario | unstarted | — | Cave with a drained ceiling + Ca-rich floor (uses Phase-3 zone chemistry from cavity-mesh proposal). First scenario that PROVES the feature. |

Each slice ships independently. Slice 1 alone is invisible without a scenario that nucleates air crystals — but the foundation is in place for Slice 5 to deliver the visible payoff.

---

## 2. Why this matters

Stalactites and stalagmites are the single most iconic cavity-growth motif in geology — limestone caves, hot-spring travertine, lava-tube linings. Every kid who's seen Carlsbad Caverns knows what they look like. The vugg-simulator currently can't render them; every crystal grows radially inward from the wall regardless of orientation.

The cavity-mesh Phase 3 work landed the chemistry side (per-zone fluid composition). Habit-bias closes the loop: when a crystal nucleates in a drained ceiling, it should HANG, not project.

---

## 3. What the system already has

Pre-existing infrastructure makes habit-bias a smaller lift than it looks:

- **`growth_environment` field on Crystal** (`js/27-geometry-crystal.ts:97`). Set to `'air'` at nucleation when the ring is vadose; `'fluid'` otherwise. Wired since v24 but no shipping scenario triggers it at scale.
- **Wireframe renderer (99d) already gravity-aware.** `_renderWireframeInstance` overrides the c-axis to world-down/up for ceiling/floor cells in air mode. Slice 1 ports this to Three.js.
- **`PRIM_DRIPSTONE` primitive** (99d) — teardrop hanging-drip silhouette for air-mode crystals on dripstone-eligible canonicals (hex_prism, acicular, rhombohedron, scalenohedron, botryoidal). Slice 4 ports to Three.js.
- **Water-level events** in scenarios.json5 — Naica + playa scenarios already drain the cavity, which sets `fluid_surface_ring`. The vadose-state detection in `VugSimulator.nucleate` (`js/85b-simulator-nucleate.ts:55-59`) reads this and tags growth_environment.
- **`wall.zoneOf(crystal)`** (Phase 3 of cavity-mesh) — gives narrators / per-zone habit choice the orientation tag without re-implementing the orientation math.

---

## 4. Slice 1 — what shipped

**The fix:** Three.js renderer (`js/99i-renderer-three.ts` `_topoSyncCrystalMeshes`) used to align mesh +Y with the substrate normal unconditionally. Now it calls `_topoCAxisForCrystal(crystal, nx, ny, nz)` — a pure helper that returns `[0, -1, 0]` for air-mode ceiling cells, `[0, +1, 0]` for air-mode floor cells, and the substrate normal otherwise. Mesh position offset uses the same c-axis so the stalactite base stays attached to the ceiling anchor while the tip drops straight down.

**Cache invalidation:** `_topoCrystalsSignature` now includes a `growth_environment` discriminator (`f` / `a`) so any scenario or replay that flips a crystal's mode forces a re-build.

**Test coverage:** `tests-js/habit-bias.test.ts` pins the helper math at 6 cases — fluid passthrough, ceiling stalactite (3 tilts), floor stalagmite (3 tilts), wall fallback (3 cases), threshold edges at ±0.4, and null/missing growth_environment defaults to fluid.

**What didn't land in Slice 1:**
- The cluster-satellite system (`_emitClusterSatellites`) still uses the un-biased substrate normal, so druzy children of a stalactite stay radial. Geologically wrong (children of a stalactite hang too), but the parent stalactite reads correctly which is the visible win.
- No shipping scenario produces stalactites yet because Naica's drainage only fires at step 260+ and the test minerals don't nucleate visually well in the brief vadose window. Slice 5 is the proof-by-tutorial.

---

## 5. Slice 2 — scenario opt-in `wall.air_mode_default`

For cave scenarios that should be in air mode from step 0 without faking a drainage event:

```json5
"wall": {
  "composition": "limestone",
  "air_mode_default": true,
}
```

When true, `VugSimulator.nucleate` stamps `crystal.growth_environment = 'air'` regardless of ring water state. The existing water-state branch still applies on top (a submerged ring in an air-default cavity is a contradiction — clamp to 'air' anyway).

Cost: ~5 lines in 85b + a flag on VugWall + a smoke test that a freshly-constructed sim with the flag has all-air crystals.

---

## 6. Slice 3 — cluster satellite air-mode

`_emitClusterSatellites` computes each satellite's substrate normal from its re-projected wall position. For an air-mode parent, the satellites are on the same ceiling/floor band as the parent and should also be gravity-biased.

Implementation: pass the parent's `growth_environment` into the satellite generator; for each satellite, call `_topoCAxisForCrystal(parent, satNx, satNy, satNz)` to get the satellite's c-axis instead of the raw substrate normal. The same +/-0.4 threshold applies per-satellite, so satellites that land on a wall slice stay radial even when the parent is gravity-biased.

Cost: ~10 lines in the satellite loop. Tests: extend `habit-bias.test.ts` to assert satellite c-axes when parent is air-mode.

---

## 7. Slice 4 — port PRIM_DRIPSTONE to Three.js

The wireframe renderer's PRIM_DRIPSTONE has a teardrop profile (wider near anchor, tapering to a point at the tip). The Three.js renderer currently uses the canonical habit primitive (hex_prism, acicular, etc.) even for air-mode crystals, which reads as "a vertical cone hanging from the ceiling" rather than "a stalactite."

Implementation: add a `DRIPSTONE` geom token to `_habitGeomToken` that fires when `crystal.growth_environment === 'air'` AND canonical primitive is dripstone-eligible (mirror `_isDripstoneEligibleCanonical` in 99d). New `_buildDripstoneGeom` builds a tapered cone primitive — wider base, point tip.

Cost: ~50 lines for the new primitive builder + dispatch wiring. Tests: visual confirmation only; the canvas-vector wireframe already has a stable PRIM_DRIPSTONE for reference.

---

## 8. Slice 5 — stalactite tutorial scenario

The proof that the whole stack works end-to-end. Scenario shape:

```json5
"stalactite_demo": {
  "anchor": "(generic dripstone-cave teaching scaffold)",
  "description": "Drained limestone cavity: ceiling drips Ca-rich, floor catches drops.",
  "expects_species": ["calcite", "aragonite"],
  "duration_steps": 100,
  "initial": {
    "fluid": { "Ca": 500, "CO3": 300, "pH": 7.2 },
    "temperature": 18, "pressure": 1,
    "wall": {
      "composition": "limestone",
      "air_mode_default": true,                    // Slice 2 flag
      "zone_chemistry": {                          // Phase 3 of cavity-mesh
        "ceiling": { "Ca": 500, "CO3": 300 },
        "floor":   { "Ca": 800, "CO3": 200 },
      },
      "inter_ring_diffusion_rate": 0,              // Phase 3 of cavity-mesh — pin zones
    },
    "fluid_surface_ring": 0,                       // drained
  },
  "events": [
    { "step": 30, "type": "ca_pulse", "name": "Drip event" },
  ],
}
```

Result: ceiling calcite hangs as stalactites; floor calcite stands as stalagmites; wall calcite (in the meniscus band, if any) stays radial. Tutorial overlay points out the three styles.

Cost: scenario block + 1 narrative paragraph + screenshot for the README. Slices 2 and 4 unblock the visible payoff; Slice 5 turns it into a teaching moment.

---

## 9. Out of scope (deliberately)

- **Sub-step drip dynamics.** Real stalactite growth is rate-limited by drip rate and CO₂ degassing. The sim's per-step model doesn't capture this; treating air-mode growth as "same rate as fluid mode but oriented by gravity" is a deliberate simplification. Revisit only if a scenario needs explicit drip-rate control.
- **Soda-straw stalactites.** Hollow tube-and-rim morphology of nascent dripstone. Beautiful but niche; PRIM_DRIPSTONE in Slice 4 captures the mature form which is what most viewers picture.
- **Helictites, popcorn, draperies, curtain stalactites.** Each is a separate paragenetic morphology. The current habit system can't express any of them; future "morphology" proposal can decide if/how to add.
- **Curved stalactites (gravity vs. capillarity).** Some dripstone curves due to airflow. Render-time perturbation only; skipped.

---

## 10. Cross-references

- `proposals/PROPOSAL-CAVITY-MESH.md` — Phases 1-3 (anchor abstraction + WallMesh + zone chemistry) shipped 2026-05-11. Phase 3 specifically opens the door for floor/ceiling chemistry that habit-bias needs.
- `proposals/PROPOSAL-3D-SIMULATION.md` — Phase 3 (orientation tags + habit bias) was the original target; Slice 1 here delivers the rendering side it never had.
- `~/.claude/plans/i-have-a-much-soft-stonebraker.md` — 3D Vugg vision plan. Phase D is the same campaign.
- `js/99d-renderer-wireframe.ts` — canvas-vector wireframe that already has air-mode logic. Slice 1 ports its c-axis math; Slice 4 ports its PRIM_DRIPSTONE.
- `js/27-geometry-crystal.ts:97` — `growth_environment` field, with the comment "no scenario sets it yet" (now slightly out of date — Naica/playa drainage events do set it for vadose-nucleated crystals).

---

## 11. Observations log — append as you work

### 2026-05-11 — Sonnet 4.5 (proposal author + Slice 1 implementer) — initial notes

- **The wireframe renderer (99d) and Three.js renderer (99i) had drifted apart on the air-mode story.** 99d implemented it years ago, 99i never picked it up. Slice 1's whole job was closing that gap. Future renderer changes that should be cross-cutting (water-state coloring, fluid-inclusion shading, etc.) deserve an explicit checklist — when one renderer ships a feature, the other should follow within a phase.

- **The Y-axis convention mismatch is a footgun.** Wireframe uses Z-up (gravity = +z, ceiling normals have z<0); Three.js uses Y-up (gravity = -y, ceiling normals have y<0). I made the mistake once during research and had to re-derive the sign. The Three.js helper has a comment block explaining the convention; the wireframe one already had its own. Future cross-renderer ports should triple-check the axis mapping.

- **`growth_environment` is set ONCE at nucleation — never updated.** A crystal that nucleates in fluid mode and survives a drainage event keeps its fluid-mode orientation. Real geology: a submerged calcite that's later exposed to air doesn't suddenly start growing as a stalactite — it just stops growing or starts dissolving. The sim's behavior is geologically defensible. But if anyone implements re-tagging in the future (e.g., for a "phantom drainage" effect), `_topoCrystalsSignature` already includes the env discriminator so the cache will bust on the flip.

- **No shipping scenario produces stalactites at scale.** Naica drainage at step 260 means only ~30 vadose-window steps before recharge, which isn't enough for visible crystals. The playa scenario has summer_bake drops but they're brief. Slice 5 is the proof-by-tutorial; without it, Slice 1's win is invisible to anyone not actively testing.

- **The +/-0.4 substrate-normal threshold is the wireframe renderer's choice.** Looking at the cavity geometry: ring_count=16 means floor rings 0-3 have ny components ≈ +0.98 to +0.56; ceiling rings 12-15 have ny ≈ -0.56 to -0.98; wall rings 4-11 have ny ≈ -0.42 to +0.42. So the 0.4 threshold neatly separates wall band from floor/ceiling band on the default 16-ring cavity. If `ring_count` ever changes (the 3D Vision plan toyed with 16-32), revisit this threshold.

### (next agent) — append here

---

## 12. Decisions log — append when you decide

### 2026-05-11 — Sonnet 4.5 — Slice 1 ships as a pure helper for unit-testability

Decided: extract the gravity-bias logic into `_topoCAxisForCrystal(crystal, nx, ny, nz)` as a pure function, not inline in `_topoSyncCrystalMeshes`. Reason: the helper is the entire contract; spinning up Three.js + WebGL for a unit test would be wasteful when the math is six lines. Inlining would have produced visible-only verification (look at the screen and trust). Future slices that change orientation logic should extend this helper; tests pin the math.

### 2026-05-11 — Sonnet 4.5 — Slice 1 only changes the parent mesh, not satellites

Decided: cluster satellites stay substrate-normal-driven even when the parent is air-mode. A stalactite with druzy children renders with a hanging parent and radial children. Reason: minimal-surface-area first. Slice 3 fixes the children; landing them in Slice 1 would have doubled the diff. The visual will look slightly off until Slice 3 lands — flagged in §11 as the known limitation.

### 2026-05-11 — Sonnet 4.5 — No SIM_VERSION bump for Slice 1

Decided: Slice 1 is a renderer-side change only. `growth_environment` is already in the snapshot schema (was added in v24); the engine emits the same field values as before. No SIM_VERSION bump needed. The calibration baseline (`tests-js/baselines/seed42_v67.json`) reproduces unchanged because shipping scenarios don't activate air-mode at scale.

### (next agent) — append here
