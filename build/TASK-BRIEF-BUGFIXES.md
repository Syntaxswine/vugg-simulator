# Vugg Simulator — Bug Fixes

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Spec: `data/minerals.json`
Web UI: `web/index.html`

## Bug 1: Wulfenite Nucleation Spam in Supergene

**Problem:** Supergene oxidation scenario produces 40+ wulfenite crystals per run. Most are microscopic and get immediately swallowed by smithsonite. This is unrealistic — real vugs have a few well-formed wulfenite crystals, not dozens of specks.

**Fix:** Add a nucleation cap per mineral per scenario. Each mineral should have a `max_nucleation_count` (or use a runtime check against existing crystal count). Suggested caps:
- Wulfenite: max 5 crystals
- Most minerals: max 3-5 per vug
- Calcite, quartz, selenite: max 10 (common vug-liners)
- This value should live in `data/minerals.json` as a new field

**Test:** Run `--scenario supergene_oxidation` and verify wulfenite count ≤ 5. All should grow to meaningful size instead of being swallowed immediately.

## Bug 2: Narrative Repetition at Stable Temperature

**Problem:** When temperature is stable (e.g., supergene sits at 25°C for most of the run), the geological history repeats "As temperature continued to fall, [mineral] nucleated at step X (25°C)" for every single crystal. This reads wrong — the temperature ISN'T falling.

**Fix:** In the geological history generation:
- Track whether temperature actually changed between nucleation events
- If temperature is stable (±2°C), use different language: "At 25°C, [mineral] nucleated" or "In the cool, stable brine, [mineral] found its window"
- Group simultaneous nucleations: instead of 30 individual lines, say "Between steps 6 and 170, wulfenite nucleated repeatedly as Pb and Mo remained in solution" or similar consolidation
- The narrative should read naturally, not mechanically

## Bug 3: No Malachite in Supergene

**Problem:** Supergene oxidation scenario has Cu=25 ppm in initial fluid, but malachite never nucleates. This is wrong — malachite is THE supergene copper mineral.

**Likely cause:** Malachite's supersaturation function may not be reaching σ≥1 with the current fluid chemistry, OR malachite may not be registered in the mineral dispatch for this scenario.

**Fix:**
1. Check `supersaturation_malachite()` — does it account for Cu, CO₃, and O₂ correctly?
2. Check that malachite's nucleation sigma threshold is achievable with Cu=25, CO₃=80, O₂=1.8
3. If the formula is correct but the threshold is too high, lower malachite's `nucleation_sigma` in the spec
4. Verify malachite is in the mineral registry for the supergene scenario

**Test:** Run `--scenario supergene_oxidation` and verify malachite appears in the assemblage.

## Bug 4: No Smoky Quartz Near Uraninite

**Problem:** In the radioactive_pegmatite scenario, uraninite nucleates and grows, but quartz doesn't darken from radiation. Real pegmatites produce smoky quartz when uranium decay irradiates nearby quartz crystals.

**Current state:** Quartz has radiation coloring logic (smoky/amethyst) but it likely checks for trace Ti or radiation as a zone-level attribute, not proximity to uraninite crystals.

**Fix:**
1. After each growth step, check if any uraninite crystal exists in the vug
2. If uraninite is present and quartz is growing, add radiation damage to quartz growth zones
3. The effect should accumulate: quartz that grows while uraninite is present gets progressively darker
4. Smoky coloring should persist even if uraninite later dissolves — the damage is permanent

**Test:** Run `--scenario radioactive_pegmatite` and verify quartz shows smoky/radiation coloring in later growth zones.

## After Completion
Commit with descriptive message. Do NOT push — I'll review and merge.
