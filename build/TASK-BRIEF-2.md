# Vugg Simulator — Builder Task Brief #2

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Spec: `data/minerals.json` (single source of truth — READ THIS FIRST)
Web UI: `web/index.html` (vanilla JavaScript)

## Context
Phase 1 is done (commit `851dd2c`). The mineral spec JSON exists, goethite is implemented, max size caps are in, and 11 narrate functions were added. This is the follow-up.

## Task 1: Wire the Missing Minerals

The `_audit_summary` in `data/minerals.json` lists minerals still missing from `vugg.py`'s growth registry. For each mineral that has a spec entry but NO growth engine dispatch in the mineral registry:

1. Check if a `grow_<mineral>` function exists in vugg.py
2. If yes → add it to the mineral registry dict (the `"mineral_name": grow_mineral_name` mapping)
3. If no → write a growth engine following the pattern of existing minerals (supersaturation check, rate calc, fluid consumption, habit/color, return GrowthZone)

**Minerals that may need this:** adamite, mimetite, feldspar, albite, galena, smithsonite, wulfenite, selenite, uraninite, molybdenite, goethite. (Some were done in phase 1 — verify each one.)

## Task 2: Complete the Narrate Functions

The spec still marks 11 minerals with `"narrate_function": null`. For each:
1. Write a `_narrate_<mineral>` method in the Collector class
2. Follow existing narrate functions for style — they tell the crystal's story, mention habit/color/chemistry, reference real mineralogy
3. Update the spec's `narrate_function` field to the function name
4. The dispatch already exists (getattr lookup for `_narrate_<mineral>`) — just make sure the function is there

**Minerals needing narrate functions:** adamite, mimetite, feldspar, albite, uraninite, molybdenite, galena, smithsonite, wulfenite, selenite, goethite

## Task 3: Fix Remaining Audit Gaps

Check each mineral spec entry against reality:
- **Wulfenite** can't nucleate because porphyry scenario only cools to ~240°C and wulfenite needs <80°C. Add a lower-temperature scenario OR adjust wulfenite's T_range.
- **Habit variants** — most minerals have single habits. Add 2-3 common habits per mineral as arrays in the spec, wire the growth engine to pick based on conditions.
- **Acid dissolution** — fluorite, galena, smithsonite also dissolve in acids. Add `acid_dissolution` entries to their specs and wire into the dissolution check.

## Task 4: Test

After all changes:
1. Run `python vugg.py` with default settings — must complete without errors
2. Verify vug fill stays under 100%
3. Verify all 19 minerals can nucleate (check the crystal list output)
4. Verify collector narration works for every mineral

## Design Rules
- `data/minerals.json` is the single source of truth for all spec data
- Runtime code reads from spec, does not duplicate constants
- Every field exists on every mineral (null = not applicable, not missing)
- Growth engines consume from `conditions.fluid` — no infinite growth
- Narrate functions tell geological stories, not just stats

## After Completion
Commit with a descriptive message. Do NOT push — I'll review and merge.
