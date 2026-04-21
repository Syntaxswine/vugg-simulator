# TASK-BRIEF: Library "Collected" Filter

**Priority:** Small UX addition — one filter toggle.

---

## What to Build

Add a **"Collected only"** toggle to the library filter bar. When active, the library grid shows only minerals the player has actually collected specimens of during gameplay. When inactive (default), it shows all minerals as normal.

### Implementation

1. **Add a filter control** to the existing `library-filters` div in `web/index.html`. Place it after the "Fluorescence" filter and before "Temperature":

```html
<div class="filter-group">
  <label for="lib-collected">Collected</label>
  <select id="lib-collected" onchange="libraryRender()">
    <option value="all">All minerals</option>
    <option value="yes">Collected only</option>
    <option value="no">Not yet collected</option>
  </select>
</div>
```

The "Not yet collected" option is useful — shows you what you haven't found yet, like a completion checklist.

2. **In `libraryRender()`**, add a filter step. Collected status is already tracked per-mineral in the card's collected specimens section. A mineral is "collected" if it has at least one saved specimen in localStorage (check the collection data — whatever structure stores per-crystal saves).

3. **Filter logic:**
   - `all` → show everything (no filter)
   - `yes` → only show minerals with ≥1 collected specimen
   - `no` → only show minerals with 0 collected specimens

4. **Visual indicator:** When "Collected only" is active, show a count badge on each card (already exists as `.collected` badge — just make sure it's visible in filtered view). When "Not yet collected" is active, show the card without the badge — the absence IS the information.

5. **Sync `docs/index.html`** — mirror the same changes.

---

## Files to Touch

- `web/index.html` — add filter dropdown + update `libraryRender()`
- `docs/index.html` — sync mirror

## Verification

1. Open Library with no collected specimens → "Collected only" shows empty state
2. "Not yet collected" shows all minerals
3. Play a scenario, collect a specimen, return to Library → "Collected only" now shows that mineral
4. "Not yet collected" no longer shows it
5. Other filters (class, fluorescence, etc.) still work alongside the collected filter
6. Reset button clears the collected filter back to "All minerals"

---

Commit. Do NOT push — I'll review and merge.
