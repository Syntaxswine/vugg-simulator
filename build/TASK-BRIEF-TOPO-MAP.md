# Vugg Simulator — Topographic Map + Growth Vectors

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Spec: `data/minerals.json` (single source of truth)
Web UI: `web/index.html` (vanilla JavaScript)
Mineral template: `proposals/vugg-mineral-template.md`

## Overview
Three related features: growth vector logic for habit selection, a topographic line visualization of the vug wall, and record mode playback. The topo line is v1 of a 3D visualization system — design decisions must be future-proofed for multiple concentric rings representing depth slices through the vug.

## Part 1: Growth Vector System

**Status:** Data already exists. All 83 habit variants across 19 minerals in `data/minerals.json` have `wall_spread`, `void_reach`, `vector`, and `trigger` fields. Schema updated.

### Habit Selection Logic
Each mineral's growth engine needs condition-based habit selection:

```
PSEUDOCODE for habit selection:
1. Get current σ (supersaturation), T (temperature), and available wall space
2. Look up this mineral's habit_variants from minerals.json
3. Score each habit:
   - If trigger mentions "low σ" and σ < 2.0 → higher score
   - If trigger mentions "high σ" and σ > 3.0 → higher score
   - If trigger mentions "high T" and T > 300 → higher score
   - If trigger mentions "low T" and T < 150 → higher score
   - If space is constrained and vector is "projecting" → lower score
   - If space is constrained and vector is "coating" → higher score
4. Pick highest-scoring habit (with some randomness)
5. Store selected habit's wall_spread and void_reach on the crystal
```

### Crystal Footprint
After habit selection:
```
footprint_cells = crystal.total_growth_um * habit.wall_spread / cell_size_mm
height_cells = crystal.total_growth_um * habit.void_reach / cell_size_mm
```

### Update Mineral Template
**Important:** Update `proposals/vugg-mineral-template.md` to include growth vector fields as REQUIRED for all future minerals. Every habit variant must declare:
- `wall_spread` (0.0-1.0): lateral spread on wall surface
- `void_reach` (0.0-1.0): projection into the vug void
- `vector`: one of "projecting", "coating", "tabular", "equant", "dendritic"
- `trigger`: conditions that favor this habit (e.g., "high σ, rapid deposition")

## Part 2: Topographic Map Visualization

### Concept
A single continuous line tracing the vug wall circumference (unwrapped to 1D). Where the wall is bare → thin amber line. Where crystals grow → line changes to the mineral's class color and thickens proportionally.

### Future-Proofing: Multi-Ring Data Model
v1 renders one ring (the wall surface). But the data model must support **multiple concentric rings** representing depth slices through the 3D vug:

```
// Future-proof structure:
// wall_state is a 2D array: wall_state[ring_index][cell_index]
// v1 only uses ring[0] (wall surface)
// When 3D arrives, each ring is a topo line at a different depth
// Crystals that project inward (high void_reach) appear on multiple rings

const wall_state = {
  rings: [],        // array of ring arrays
  ring_count: 1,    // v1 = 1, future = N
  cells_per_ring: 120,
  vug_diameter_mm: 50
};

// Each cell:
{
  wall_depth: 0,        // how much wall has dissolved (negative = dissolved)
  crystal_id: null,      // which crystal occupies this cell
  mineral_type: null,    // for color lookup
  thickness: 0           // crystal thickness at this position
}
```

Crystal footprint should store both its wall_spread AND which ring(s) it occupies. void_reach determines how many rings deep it projects. When a crystal has void_reach=0.9, it shows on the wall ring AND extends across multiple inner rings.

### Color System: 12-Hue Wheel
All mineral colors come from the `class_color` field in `data/minerals.json` — do NOT hardcode a color map in rendering code. The 12-class color wheel is already baked into the spec:

| Class | Hue | Hex |
|-------|-----|-----|
| Oxide | 0° | #eb1313 |
| Carbonate | 30° | #eb7f13 |
| Arsenate | 60° | #ebeb13 |
| Sulfide | 90° | #7feb13 |
| Uranium | 120° | #13eb13 |
| Phosphate | 150° | #13eb7f |
| Hydroxide | 180° | #13ebeb |
| Molybdate | 210° | #137feb |
| Silicate | 240° | #1313eb |
| Halide | 270° | #7f13eb |
| Native | 300° | #eb13eb |
| Sulfate | 330° | #eb137f |

**Wall/matrix** = `#D2691E` (warm amber) — NOT a mineral class. The wall is always the warmest color on screen. No mineral class color should approach amber.

**Color ambiguity is resolved by:**
1. Crystal inventory list on the same screen (full mineral details)
2. Hover on any colored section of the line → tooltip with mineral name, size, habit, twin status

### Rendering (canvas)
1. Create a canvas element for the topo map
2. Unwrap the vug wall circumference to a 1D array (120 cells for ~50mm vug at ~0.4mm resolution)
3. Draw the line left-to-right:
   - Each cell: stroke color = amber if bare, class_color if crystal
   - Stroke width proportional to crystal thickness at that position
   - Smooth transitions between sections (don't hard-step)
4. Add scale bar showing mm
5. Add color legend for the 12 mineral classes (small squares with class name)
6. Hover interaction: show mineral name + size on mouseover

### Display Location
New panel below simulation controls or as a tab. Label: "Wall Profile" or "Topographic Map."

## Part 3: Record Mode Playback

- **Same screen** as the simulation — not a separate view or mode
- During simulation, the topo line builds live as crystals grow
- After clicking "Finish" and the narration runs, a **▶ button appears** on the topo panel
- Clicking ▶ replays the entire history: the amber line evolves, mineral colors bloom as crystals nucleate and grow, step by step
- This IS the groove mode — watching geological time unfold on a line
- Use the same wall_state history that the simulation already tracks

## Design Rules
- The line IS the cave. v1 = one line. Future = concentric rings.
- Color and thickness carry all the information at a glance. Hover + inventory for details.
- Record mode is the killer feature — watching the line evolve IS watching the vug crystallize.
- Vanilla JS + canvas only. No libraries.
- All mineral colors from `class_color` in minerals.json. No hardcoded color maps.
- Wall amber is sacred territory. No mineral touches it.
- Data model uses `rings[ring_index][cell_index]` even though v1 only renders ring 0.
- When 3D arrives, crystals with high void_reach span multiple rings naturally.

## After Completion
Commit with descriptive message. Do NOT push — I'll review and merge.
