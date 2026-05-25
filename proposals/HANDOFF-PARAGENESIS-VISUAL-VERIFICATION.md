# HANDOFF: Paragenesis visual verification — Q3a / Q4 / Q5 confirmed end-to-end

**Session date:** 2026-05-06
**Author:** Claude (Opus 4.7)
**Status:** Q3a outline-inheritance, Q4 perimorph cast, Q5 snowball-as-sphere all verified at the **renderer mesh-dispatch level** in seed-42 runs of mvt + bisbee + supergene_oxidation. One real bug surfaced (cavity-clip leak — second instance of BUG-CRYSTALS-CLIP-VUG-WALL).

The previous handoff ([HANDOFF-PARAGENESIS-CAMPAIGN.md](HANDOFF-PARAGENESIS-CAMPAIGN.md)) flagged "visual verification" as the highest-priority pending item and said Q4 perimorph cast was *untested* in any seed-42 scenario. This pass shows it actually fires twice in bisbee — the handoff was wrong about that.

---

## Method

In-browser, deterministic. The harness runs a named scenario with `rng = new SeededRandom(42)`, plants the resulting sim into `fortressSim`, switches into Three.js renderer mode, and probes both:

1. **Sim-side**: `crystal.cdr_replaces_crystal_id`, `crystal.perimorph_eligible`, `crystal.dissolved`, `crystal.habit === 'snowball'`, host-substrate `position` strings.
2. **Renderer-side**: walk `_topoThreeState.scene` and check the `THREE.Mesh.geometry.type` and `material.transparent` for each `userData.crystal_id`.

Bug found mid-pass: I initially thought the renderer was leaking stale meshes across sim swaps (327 meshes for a 40-crystal sim). Investigation showed each crystal is rendered as 7–12 sub-meshes (body + faces + cluster satellites — see `_emitClusterSatellites` in [99i-renderer-three.ts:955](js/99i-renderer-three.ts:955)), all sharing the same `crystal_id` userData. Not a leak — by design. Retracted.

---

## Per-scenario results

### mvt @ seed 42 (default 120 steps)

| Metric | Value |
|---|---|
| Total crystals | 40 |
| Total barite | 12 |
| Snowball-habit barite | **9** |
| Snowball substrates | pyrite #6 (×5) + sphalerite #29 (×4) |
| CDR pseudomorphs | 0 (mvt isn't a CDR scenario; correct) |
| Substrate-affinity hits (`on X #N`) | 11 |

**Q5 dispatch verified:** all 9 snowball-habit barite meshes use `THREE.SphereGeometry` (vert count 221 — full sphere); the 3 non-snowball barite meshes use `BufferGeometry` (96 verts — tabular). Dispatch in [99i-renderer-three.ts:1235](js/99i-renderer-three.ts:1235) is correct.

### bisbee @ seed 42 (~95 steps)

| Metric | Value |
|---|---|
| Total crystals | 80 |
| CDR pseudomorphs | **3** |
| chrysocolla #35 ← cuprite #23 | perimorph_eligible, **dissolved** |
| chrysocolla #70 ← cuprite #23 | perimorph_eligible, **dissolved** |
| lepidocrocite #69 ← pyrite #3 | perimorph_eligible, alive |
| Substrate-affinity hits | 28 |

**Q4 perimorph cast verified end-to-end.** Walked the scene: 12 translucent meshes (`material.transparent === true`), all 12 belong to crystals #35 + #70 (6 sub-meshes each = 12). Crystal #69 (alive lepidocrocite-after-pyrite) is correctly opaque. Translucent material is set in [99i-renderer-three.ts:1207](js/99i-renderer-three.ts:1207).

The previous handoff said *"Q4 perimorph mechanic untested in any seed-42 scenario — none of the existing scenarios produce a CDR crystal that LATER dissolves."* — that's wrong. **Bisbee fires the A→B→B-dissolves chain twice with seed 42.** Both products are chrysocolla-after-cuprite via the Cu-bearing CDR route, both dissolve in later supergene-stage events.

### supergene_oxidation @ seed 42 (~110 steps)

| Metric | Value |
|---|---|
| Total crystals | 83 |
| CDR pseudomorphs | 1 |
| smithsonite #21 ← sphalerite #17 | perimorph_eligible, alive |
| Substrate-affinity hits | 15 |

**Q3a outline inheritance verified at the geometry level:**
- Smithsonite #21 has `habit: 'botryoidal'` but its rendered meshes use **54 verts each** (10 meshes).
- Sphalerite #17 (parent) has `habit: 'tetrahedral'` and uses **54 verts each** — exact match.
- A control non-CDR smithsonite (#31, also `habit: 'botryoidal'`, no parent) uses **1200 verts** (the bumpy-spherical botryoidal default).

So the renderer is correctly walking up to `cdr_replaces_crystal_id` and pulling the parent's habit token for the geometry primitive (logic at [99i-renderer-three.ts:1145](js/99i-renderer-three.ts:1145)). The 22× vertex-count drop confirms the dispatch fires.

---

## Bug surfaced — cavity-clip leak (second instance)

Supergene_oxidation at seed 42 produces **selenite #6 with `c_length_mm = 56.7` and `a_width_mm = 28.3`** in a vug whose `vug_diameter_mm = 61.1` (radius ~30.5mm, max-seen-radius after dissolution = 63.8mm). Selenite #20 is similarly oversized at 51.0×25.5mm. These are rosette-habit gypsum and they render as huge pink slabs visibly extending past the cavity wall in the 3D view.

This is the same bug class as **feldspar #7** in [BUG-CRYSTALS-CLIP-VUG-WALL.md](BUG-CRYSTALS-CLIP-VUG-WALL.md) — the cavity-clip shader (added in commit `e6bb0a1`) was always a band-aid; the real fix is sim-side.

**What's interesting about this one:** the renderer-clip *does* fire — the clip uniform `uVugRadius` reads 51.5 (matching the cavity hull's max vertex distance) — but the visible artifact persists because:

1. The cavity hull mesh is built from `(cell.base_radius_mm + cell.wall_depth) × polarProfileFactor(phi)` — capped by the polar profile at the equator.
2. Crystal anchors use the same formula, so anchors should never exceed `uVugRadius`.
3. **But the cluster satellites in `_emitClusterSatellites` ([99i-renderer-three.ts:955](js/99i-renderer-three.ts:955)) emit meshes at `anchor + tangent × spread` where `spread = parentAWid × 1.5 × pattern.spreadMul`.** For selenite (rosette pattern, `parentAWid = 28.3`, large `spreadMul`), satellites end up at lateral offsets pushing their world position past the clip radius. The shader *does* discard those fragments — but the body of the parent rosette mesh, scaled by `aWid=28.3` laterally and `cLen=56.7` along the normal, has fragments that pass through the clip threshold from the inside (where the clip lets them through) and out the other side at radii > 51.5 (where it discards them) — leaving the visible "extending past wall" appearance.

The right fix is the sim-side per-crystal cap (Tier 2 of BUG-CRYSTALS-CLIP-VUG-WALL.md) — halt growth in `_update_dimensions` when `c_length_mm` or `a_width_mm × 0.5` would exceed `vug_diameter / 2`. That's a baseline shift (calibration sweep needed) so it's queued, not done in this pass.

**New canonical case for the bug report:** supergene_oxidation seed 42, selenite #6 (56.7×28.3 mm in 61.1 mm cavity, 93% of diameter).

---

## What this pass corrects in the prior handoff

| Prior claim | Reality |
|---|---|
| "Q4 perimorph mechanic untested in any seed-42 scenario" | Bisbee seed 42 fires it twice (chrysocolla #35 + #70 after cuprite #23) |
| "Snowball barite count in mvt is ~doubled (6→12)" | 12 barite total of which 9 are snowball habit, on pyrite #6 + sphalerite #29 — both expected MVT seed minerals |
| Visual verification "low effort" | Sim-side verification was easy; getting at the Three.js scene needed `topoToggleThreeRenderer()` plus `_topoTiltX/Y` to be set manually since the page boots in 2D mode |

---

## Reproducer for future regression checks

Drop this in the dev console after the page loads:

```js
function runAndRender(name, seed) {
  const make = SCENARIOS[name];
  const { conditions, events, defaultSteps } = make();
  rng = new SeededRandom(seed);
  const sim = new VugSimulator(conditions, events);
  for (let i = 0; i < (defaultSteps || 100); i++) sim.run_step();
  fortressSim = sim; fortressActive = true; currentGameMode = 'fortress';
  document.getElementById('fortress-setup').style.display = 'none';
  document.getElementById('fortress-status').style.display = 'block';
  document.getElementById('fortress-actions').style.display = 'block';
  document.getElementById('fortress-main').style.display = 'flex';
  switchMode('fortress');
  if (!_topoUseThreeRenderer) topoToggleThreeRenderer();
  _topoTiltX = -0.6; _topoTiltY = 0.3;
  topoRender();
  return sim;
}
function paragenesisSummary(sim) {
  const cdr = sim.crystals.filter(c => c.cdr_replaces_crystal_id != null);
  const dissolvedPerimorph = cdr.filter(c => c.perimorph_eligible && c.dissolved);
  const snowballs = sim.crystals.filter(c => c.habit === 'snowball');
  let translucent = 0;
  _topoThreeState?.scene?.traverse(o => { if (o.userData?.crystal_id != null && o.material?.transparent) translucent++; });
  return { total: sim.crystals.length, cdr: cdr.length, dissolvedPerimorph: dissolvedPerimorph.length, snowballs: snowballs.length, translucentMeshes: translucent };
}

// mvt: 9 snowballs, 0 cdr, 0 dissolvedPerimorph, 0 translucent
// bisbee: 3 cdr, 2 dissolvedPerimorph, 12 translucent
// supergene_oxidation: 1 cdr, 0 dissolvedPerimorph
const sim = runAndRender('bisbee', 42);
console.log(paragenesisSummary(sim));
```

The expected counts above can serve as a regression baseline. Any drift means either chemistry shifted or paragenesis/renderer dispatch broke.

A page reload is needed between scenario runs (state in `_topoThreeState` persists across `runAndRender` calls and inflates mesh counts).

---

## Pending after this pass

1. **Sim-level cavity cap** (was already pending; now has a second canonical case to test against — supergene_oxidation seed 42 selenite #6).
2. **Q3b encrustation shell** as separate translucent mesh — still optional.
3. **Phase 4c / 4d / Phase 3 follow-up** — chemistry track, unchanged from prior handoff.
4. **Tutorial rework** — separate work package, unchanged.

The paragenesis campaign (Q1–Q5) is now genuinely shipped + visually verified end-to-end. Time to either fix the cavity cap or move into Phase 4c.

🪨
