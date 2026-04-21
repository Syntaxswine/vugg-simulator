# Vugg Simulator — Builder Task Brief #3

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Spec: `data/minerals.json` (single source of truth)
Web UI: `web/index.html` (vanilla JavaScript)
Docs/Docs UI: `docs/index.html`

## Overview
Three interrelated goals: standardize all runtime targets, make the spec the single source of truth everywhere, and add a new Library mode for learning about minerals.

## Task 1: Unified Mineral Template — Single Source of Truth

**Reference:** `data/minerals.json` IS the template. Every field declared for every mineral.

**Problem:** The three runtime targets (`vugg.py`, `web/index.html`, `agent-api/vugg-agent.js`) have drifted. The `_audit_summary` in minerals.json shows which minerals are missing from which target. Minerals added to vugg.py may not exist in the web UI or agent API.

**Fix:**
1. For each mineral in `data/minerals.json`, verify it exists in ALL three targets:
   - `vugg.py`: growth engine in mineral registry + `_narrate_*` function
   - `web/index.html`: supersaturation function + growth logic + UI slider (if applicable)
   - `agent-api/vugg-agent.js`: mineral definition
2. Any mineral missing from a target gets added with the same data from the spec
3. Remove any hardcoded mineral data that duplicates what's in minerals.json — the spec should be the ONLY place mineral constants live
4. Update `_audit_summary` to reflect all minerals present everywhere

**Rule going forward:** When adding a new mineral, you add ONE entry to minerals.json. Code reads from there. No more copy-pasting constants across three files.

## Task 2: Cross-Mode Consistency

**Problem:** The web UI (`web/index.html`), the docs site (`docs/index.html`), and the Python engine (`vugg.py`) don't always agree on:
- Which minerals exist
- What supersaturation formula they use
- What temperature ranges they grow in
- What their habits and colors are
- Scenario definitions (event timing, fluid chemistry)

**Fix:**
1. `web/index.html` should load `data/minerals.json` at startup and build its mineral list from there (not from hardcoded arrays)
2. `docs/index.html` should do the same for any mineral reference data it displays
3. Scenario definitions should be consistent across targets — if vugg.py's MVT scenario has F=40 and Pb=25, the web UI's MVT should match
4. After this task, `data/minerals.json` is the single source of truth. Everything else reads from it.

## Task 3: Library Mode

**New feature:** A separate section/tab in `web/index.html` (and optionally `docs/index.html`) where users can browse and learn about each mineral.

### Requirements:
1. **Mineral cards** — one card per mineral, loaded from `data/minerals.json`
2. Each card shows:
   - Mineral name, formula, habit(s)
   - Temperature range for growth (with visual indicator)
   - Supersaturation requirement
   - Required ingredients (what needs to be in the broth)
   - Trace ingredients and their effects (color, fluorescence)
   - Fluorescence info (activator, color, quencher)
   - Twin laws
   - Acid dissolution behavior
   - Thermal decomposition
   - Which scenarios this mineral can appear in
   - A brief geological description (can come from the spec's `narrate_function` text or a new `description` field)
3. **Filtering** — filter by:
   - Fluorescent / non-fluorescent
   - Primary / secondary / oxide / sulfide / carbonate / silicate / sulfate
   - Temperature range (high-T vs low-T)
   - Contains element (e.g., "show me all Pb minerals")
4. **"What grows here?" mode** — pick a scenario, see which minerals are possible and what conditions each needs
5. **"Recipe finder"** — pick a mineral, see exactly what broth conditions and temperature you need to make it grow

### Implementation notes:
- Read from `data/minerals.json` — do NOT duplicate mineral data in the library code
- Add a `description` field to each mineral in the spec if it doesn't exist — a 2-3 sentence geological description suitable for learning
- Add a `class` field (e.g., "sulfide", "carbonate", "oxide", "silicate", "sulfate", "phosphate", "hydroxide") for filtering
- Use the same web UI styling — keep it consistent with the simulator view
- Library is read-only — no simulation, just reference

### Spec additions needed:
Add these fields to each mineral in `data/minerals.json`:
```json
"description": "Brief geological description for library mode.",
"class": "sulfide | carbonate | oxide | silicate | sulfate | phosphate | hydroxide | native",
"scenarios": ["list of scenario IDs where this mineral can nucleate"]
```

## Task 4: Test

After all changes:
1. Run each scenario in vugg.py — no errors
2. Open `web/index.html` in browser — all minerals appear in library, simulator works
3. Verify `data/minerals.json` is the ONLY place mineral constants are defined
4. Verify all three targets (vugg.py, web, agent-api) show the same mineral list

## Design Rules
- `data/minerals.json` is the single source of truth. NO mineral constants anywhere else.
- New minerals = one JSON entry. Code adapts automatically.
- Library mode is for learning. Simulator mode is for growing. Same data, different views.
- Keep the web UI lightweight — no frameworks, vanilla JS.

## After Completion
Commit with descriptive message. Do NOT push — I'll review and merge.
