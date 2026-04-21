# TASK-BRIEF: Improved Naturalistic Void Shape

**Priority:** Replace Fourier profile with bubble-merge algorithm for more realistic vug shape.
**Replaces:** The Fourier-harmonic approach from Phase 1.

---

## What to Change

Replace the current Fourier-based irregular profile with a **bubble-merge** algorithm that produces botryoidal dissolution cavities.

### Algorithm

1. **Plot N random seed points** (N = 4–12, configurable per scenario via `bubble_count` parameter) within a bounding circle of diameter `vug_diameter_mm`
2. **Grow a circle around each seed point** to a random radius (range: 20–60% of vug diameter, configurable via `bubble_size_range`)
3. **Union all circles** — the void is the combined area of all overlapping circles
4. **Sample the union boundary** at `cells_per_ring` (120) evenly-spaced angles to produce per-cell wall distances

The result: a lumpy, botryoidal void that looks like dissolution bubbles merging — not a wobbly circle.

### Why This Works

- Real vugs form by dissolution — acidic fluids eat cavities that grow and merge
- The botryoidal shape has **alcoves** (where circles overlap from inside) and **promontories** (where circles meet from outside), creating natural micro-environments for crystal growth
- Crystal growth geometry still works — each cell just has a different distance to the wall, same as now
- The shape is **seed-locked** (same seed = same random points + radii = same void)
- Still purely visual in Phase 1 — engines keep reading `mean_diameter_mm`

### Parameters

Add to scenario definitions:

```python
"bubble_count": 6,           # number of seed points (4-12)
"bubble_size_range": [0.2, 0.6],  # min/max radius as fraction of vug diameter
```

Suggested defaults by scenario:
- Cooling/pulse: bubble_count=4, tight range (near-spherical gas bubble)
- MVT: bubble_count=8, wide range (dissolution cavities in limestone)
- Porphyry: bubble_count=6, moderate range (stockwork veins merging)
- Pegmatite: bubble_count=5, moderate range (fracture-controlled pocket)
- Reactive wall: bubble_count=10, wide range (aggressive acid dissolution)
- Supergene: bubble_count=7, wide range (complex oxidation front)
- Ouro Preto: bubble_count=5, tight range (hydrothermal vein in quartzite)

### Implementation

**In `WallState` constructor:**
1. Generate N random points (seed-locked) within bounding circle
2. Generate N random radii (seed-locked)
3. For each of 120 cell angles θ:
   - Cast a ray from center at angle θ
   - Find the intersection with the union boundary of all circles
   - That intersection distance = wall distance for that cell
4. Store per-cell radius in `rings[0][cell_idx].depth_mm`

**Ray-circle intersection:** For each ray at angle θ, find the maximum distance where the ray exits any circle. The outermost boundary point is the wall. This is standard computational geometry.

### What NOT to Change

- Growth engines (visual-only change)
- `mean_diameter_mm` calculation (still used by engines)
- Any mineral data
- The multi-ring data model
- Scenario event sequences

---

## Files to Touch

- `vugg.py` — replace Fourier profile in `WallState.__init__()` with bubble-merge
- `web/index.html` — mirror the same change
- `docs/index.html` — sync
- Scenario definitions — add `bubble_count` and `bubble_size_range` parameters

## Verification

1. Any scenario — void should be lumpy, botryoidal, with visible alcoves and promontories
2. Same seed = same shape (reproducible)
3. Crystals still grow correctly on irregular wall
4. Topo map renders the new shape
5. `bubble_count=1, bubble_size_range=[0.5, 0.5]` → perfect circle (backward compatible)
6. All 10 scenarios produce visually distinct void shapes

---

Commit. Do NOT push — I'll review and merge.
