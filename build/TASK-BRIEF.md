# Vugg Simulator — Builder Task Brief for Claude Code

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Web UI: `web/index.html` (vanilla JavaScript, no framework)

## Reference Documents (READ THESE FIRST)
1. `AUDIT-existing-minerals.md` — full audit of 18 existing minerals, what's missing
2. `../../proposals/vugg-mineral-template.md` — target template every mineral should match
3. `../../proposals/vugg-mineral-library.md` — library architecture (data-only, no functions)
4. `BUG-vug-fill-overflow.md` — critical bug: `_vug_sealed` never resets, causing 321,248% fill
5. `BUG-crystal-list.md` — secondary bug: crystal list pie chart rendering issue
6. `ARCHITECTURE.md` — overall project architecture

## Task Order

### Task 1: Fix Critical Bug (do this FIRST)
**File:** `BUG-vug-fill-overflow.md`
- `_vug_sealed` flag never resets to `False` once set to `True`
- This causes crystals to keep growing past the vug boundary (321,248% fill reported)
- **Fix:** Reset `_vug_sealed = False` when vug fill drops below 0.95 (allows re-sealing if fill rises again)
- Also add **max crystal size caps** for all minerals (this is the other root cause — crystals grow without limit)

### Task 2: Fix Secondary Bug
**File:** `BUG-crystal-list.md`
- Crystal list pie chart has rendering issues
- Read the bug report and fix

### Task 3: Standardize All 18 Minerals
Using `vugg-mineral-template.md` as the target schema, update every mineral in `vugg.py` to have:
- **`max_length_mm`** — real-world maximum crystal size (e.g., quartz=1000, fluorite=300, calcite=500)
- **`decomp_temp`** — temperature where mineral decomposes/oxidizes (null if stable)
- **`decomp_products`** — what it becomes (null if N/A)
- **`fluorescence`** — UV response with activator + wavelength + color (null if none)
- **`twin_law`** — common twin type (null if rare/none)
- **`acid_reaction`** — behavior in acid (null if resistant)
- **`habits`** — array of 2-4 common habits (engine picks based on conditions)
- **`_narrate_*` function** — every mineral gets a proper narration function (not inline strings)

**Minerals needing the most work:**
- **Goethite** — ghost mineral, no engine at all. Implement fully or remove from legend.
- **Uraninite, Galena, Molybdenite** — use inline flavor text, need `_narrate_*` functions
- **Fluorite** — missing cleavage, twin law, fluorescence (should have all three)
- **Adamite, Mimetite** — missing fluorescence (adamite=green LW, mimetite=yellow-orange)

### Design Rules
- **Library is data-only** — no functions in the mineral data definitions. Growth logic stays in engines.
- **Null = not applicable** — every field exists on every mineral, even if null. This prevents audit gaps.
- **Habits as arrays** — most minerals have 2-4 common habits
- **Library must load before any code that references it** (plain JS object, no async)

### Test After Changes
- Run the simulator and verify it completes without errors
- Check that vug fill stays under 100%
- Check that crystal list renders correctly
- Verify all 18 minerals still nucleate and grow

## Notes
- This is a hobby project. Keep the code readable and well-commented.
- The mineral data is educational — accuracy matters.
- When in doubt about mineral properties, check the audit file for what's documented.
