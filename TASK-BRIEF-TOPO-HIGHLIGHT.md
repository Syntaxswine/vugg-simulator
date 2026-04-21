# TASK-BRIEF: Topo Map Transparency + Selective Highlight

**Priority:** UX improvement — solves color ambiguity without sidebar clutter.

---

## What to Build

### 1. Default State: Ghosted Topo

All crystal arcs render at **25% opacity** (use `ctx.globalAlpha = 0.25` before stroking crystal arcs, reset to 1.0 after). The wall arc stays **fully opaque amber** — it's the substrate, not a mineral.

The effect: a ghostly color map where you see shape and distribution clearly, but no single mineral dominates visually.

### 2. Hover Highlight

When the mouse hovers over a crystal arc (or its inclusion dots):
- **That mineral species** jumps to **100% opacity** across ALL its crystals — every instance of that mineral on the map lights up simultaneously
- **All other minerals** stay at 25%
- **Wall** remains 100%
- **Inclusion dots** belonging to the highlighted mineral also go to 100% (even if they're inside a different host)

This lets you read one species at a time across the whole assemblage.

### 3. Legend Highlight (Easier Target)

Same effect when hovering a legend entry. The legend entries are bigger click targets than small crystal arcs — essential for tiny crystals or dense assemblages.

### 4. Click-to-Lock

Clicking a legend entry or crystal arc **locks** the highlight on. It stays highlighted until:
- You click the same entry again (toggle off)
- You click a different entry (switch)
- You click empty space (deselect all)

This is important for touch/mobile where hover doesn't exist.

### 5. Inclusion Interaction

When a host mineral is highlighted:
- Its crystal arcs at 100%
- **Inclusion dots inside it** from OTHER minerals stay at 25% (they're passengers, not the host)
- But if you highlight the inclusion's mineral species, those dots go to 100% everywhere they appear — including inside hosts

This lets you read poikilitic textures: highlight sphalerite and see all its inclusions scattered inside calcite, or highlight calcite and see the host without the inclusion noise.

---

## Implementation Notes

- Track `highlightedMineral` as a string (mineral name) or null. Set on hover/click.
- In the topo render loop, before stroking each crystal arc:
  ```
  if (highlightedMineral === null) {
    ctx.globalAlpha = 1.0;  // no highlight = full normal view
  } else if (crystal.mineral === highlightedMineral) {
    ctx.globalAlpha = 1.0;  // highlighted species
  } else {
    ctx.globalAlpha = 0.25; // everything else ghosted
  }
  ```
- Same logic for inclusion dots — compare `inclusion.mineral` against `highlightedMineral`
- Wall arc: always `ctx.globalAlpha = 1.0`, color always amber
- Hover detection on legend: add `mouseenter`/`mouseleave` listeners to each legend entry (they already exist in the DOM). Set `highlightedMineral` on enter, clear on leave.
- Click detection: `click` listener on legend entries + canvas. Toggle logic as described above.
- When no mineral is highlighted (`highlightedMineral === null`), render everything at **full opacity** — normal behavior, no ghosting. Ghosting only activates when a highlight is active.

### Important Edge Cases

- **Multiple habits of same mineral:** all habits of "quartz" highlight together (match by mineral name, not habit variant)
- **Dissolved crystals:** if dissolved crystals are shown on the topo, they should follow the same transparency rules
- **Record mode playback:** transparency state should persist during replay — if you lock a highlight and hit play, it stays locked
- **Legend hover + canvas hover conflict:** canvas hover should take priority over legend hover (the canvas is the primary interaction surface)

---

## Files to Touch

- `web/index.html` — all changes in the topo map render section + legend event listeners
- `docs/index.html` — sync mirror

No changes to `data/minerals.json`, `vugg.py`, or the sim engine. This is purely a rendering/UX change.

## Verification

1. Load any scenario with 3+ mineral species
2. Default view: all minerals at full opacity, no ghosting
3. Hover a legend entry → that mineral lights up, others ghost
4. Move mouse off legend → back to normal
5. Hover a crystal arc on the topo map → same effect
6. Click a legend entry → locks highlight
7. Click same entry → unlocks
8. Click empty canvas space → unlocks
9. Verify inclusion dots follow their own mineral's highlight, not the host's
10. Hit play/record mode → highlight persists

---

Commit. Do NOT push — I'll review and merge.
