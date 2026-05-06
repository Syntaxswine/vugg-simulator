# BUG: Crystals can grow past the cavity wall (`feldspar #7` is bigger than its vug)

**Filed:** 2026-05-06
**Reporter:** boss (visual catch — "I mistook the vug for an overgrowth")
**Severity:** content + visual; not a crash
**Status:** open

---

## Summary

In a 50 mm pegmatite vug, `feldspar #7` (tabular habit) grew to
`37.0 × 55.5 mm`. Its **a-axis is 5.5 mm wider than the cavity's
diameter**, and the crystal alone occupies **91.2% of the vug volume**
(by the simulator's own `(4/3)π × c × a²` formula). The mesh literally
bursts through the cavity wall — the renderer faithfully draws the
out-of-bounds geometry, and to the eye the feldspar tablet looks like
the host structure with the vug embedded inside it.

This is the diagnostic visual report — the cavity and the crystal
should not be confusable.

## Repro

| Parameter | Value |
|---|---|
| `SIM_VERSION` | 53 |
| `archetype` | `pegmatite` |
| `seed` | `1778042424470` |
| Steps run | 175 |
| `vug_diameter_mm` | 50.0 |
| Total crystals | 23 |

Steps:
1. Reload the page (`http://localhost:8000/index.html`).
2. Quick Play: pick the Quick Play button on the Home screen with the
   default scenario (this run picked `pegmatite` archetype, seed
   `1778042424470`).
3. Switch to 3D view (the `⬚` button in the topo controls).
4. Zoom out to ~33–47% to see the whole cavity.

Observed: a large blue tabular crystal (feldspar #7) larger than the
cavity, with the cavity surface visible through it.

## Diagnostic numbers

```
feldspar #7 — tabular habit
  c_length_mm      = 37.01
  a_width_mm       = 55.51                  (= 1.5 × c, per habit dispatch)
  total_growth_um  = 37005.59
  zones            = 99                     (kept growing for 99 steps)
  ring             = 11
  cell             = 32

vug
  vug_diameter_mm  = 50.0
  vug_radius_mm    = 25.0
  vug_volume_mm³   = 65,450

feldspar #7 volume (ellipsoid (4/3)π × c × a²)
                  = 59,701 mm³           (91.2% of cavity volume)

bursting checks
  c_length > vug_diameter      ? false  (37 < 50)
  a_width  > vug_diameter      ? TRUE   (55 > 50)
  a_width × 0.5 > vug_radius   ? TRUE   (27.7 > 25.0)
```

The lateral extent of the tablet bursts through the wall. The c-length
also exceeds the vug radius (would clear the wall on the opposite side
of a perfectly inward growth direction), but the immediate visible
issue is the lateral burst.

## Root cause

Two layered issues, both real:

### 1. (sim) No per-crystal cavity-bound check

`get_vug_fill()` in [js/85c-simulator-state.ts:190-202](js/85c-simulator-state.ts:190-202)
sums all crystal volumes and halts ALL growth at the global 100% mark.
But individual crystals can grow past the wall before the global cap
trips, and once they're over they stay over. There is no per-crystal
size cap derived from the cavity geometry.

For tabular crystals specifically, [js/27-geometry-crystal.ts:118](js/27-geometry-crystal.ts:118)
sets `a_width_mm = c_length_mm × 1.5`. So a tabular crystal whose
c-length exceeds `vug_radius / 0.75` (≈ 33 mm in a 50 mm cavity) will
have its lateral extent clip the wall, regardless of cavity-volume
budget.

### 2. (renderer) No clip volume against cavity

[js/99i-renderer-three.ts:1116-1122](js/99i-renderer-three.ts:1116-1122)
positions and orients each crystal mesh using the wall-anchor cell, the
substrate normal, and the crystal's c/a dimensions. There is no test
against the cavity geometry — if the scaled mesh extent exceeds the
cavity boundary, the mesh draws outside the cavity surface. The
cavity mesh itself doesn't act as a stencil/clip volume.

## Severity & user-facing impact

- **Geological honesty:** broken. A real crystal cannot grow past its
  container — it self-terminates against the opposite wall. The sim
  produces shapes that don't exist in nature.
- **Player legibility:** broken in the way the reporter caught — the
  cavity becomes visually subordinate to its largest crystal. New
  players cannot tell which surface is the host vug and which is a
  guest crystal.
- **Volume accounting:** silently wrong. `get_vug_fill()` returns
  values consistent with the (oversize) crystal volumes, so the seal
  event fires correctly even though the geometry has already failed.
- **Affected scenarios:** any scenario with high-growth-rate engines
  in small cavities — pegmatite (kunzite, tourmaline, beryl,
  feldspar), porphyry quartz cores, single-large-crystal habits like
  selenite swords. Multi-crystal cluster scenarios less affected
  because volume budget gets eaten by many small crystals before any
  one bursts.

## Proposed fix (separate work item)

User-directed fix from the conversation: **the vug acts as a natural
slice — clip every crystal mesh against the cavity volume in the
renderer**. Anything past the wall is invisible.

Implementation tier preferred:

**Renderer-level clip via stencil buffer** — render the cavity inner-
surface mesh into the stencil buffer, then crystals only draw where
stencil = 1 (inside the cavity). Three.js supports
`THREE.AlwaysStencilFunc / THREE.ReplaceStencilOp` on materials. The
crystal data stays correct (still 37 × 55 mm in the model); the
visible portion is the in-bounds intersection. This matches the
reporter's natural-slice request — the cavity is the cleaver, the
crystal is what gets sliced.

This does not address the underlying sim issue (crystals shouldn't
grow this large in the first place), but it stops the visual lie and
restores cavity legibility immediately.

A follow-up sim-level fix should still cap individual crystal growth
when its bounding ellipsoid would push past the cavity wall — that
needs a SIM_VERSION bump (54+) and per-scenario calibration, since
limiting crystals' max size will redistribute fluid budget into other
crystals and shift baselines.

## Related files

| File | Role |
|---|---|
| [js/27-geometry-crystal.ts:117-121](js/27-geometry-crystal.ts:117) | habit→aspect-ratio dispatch (tabular = 1.5× elongation) |
| [js/85c-simulator-state.ts:190-202](js/85c-simulator-state.ts:190-202) | `get_vug_fill` global volume check |
| [js/85-simulator.ts:115-137](js/85-simulator.ts:115) | vug-sealed event trigger |
| [js/99i-renderer-three.ts:1075-1099](js/99i-renderer-three.ts:1075) | per-crystal mesh scale + position + orient |
| [js/99i-renderer-three.ts:935-947](js/99i-renderer-three.ts:935) | cluster satellite mesh same |
