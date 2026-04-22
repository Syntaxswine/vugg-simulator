# TASK-BRIEF: Ground Every Scenario in a Real Locality

**Priority:** Audit fix — no new minerals, no new engines, no new mechanics. Tightens the fluid-chemistry honesty layer.

**Why now:** Round 3 (carbonates) surfaced that most scenarios run with `Mg = 0` (the FluidChemistry default), which is geologically wrong — meteoric water is ~5 ppm Mg, marine brines 1300 ppm, hydrothermal fluids 50–500 ppm. The Mg/Ca ratio is the dominant control on calcite vs aragonite vs dolomite (Folk 1974, Morse et al. 1997). Without realistic Mg, aragonite and dolomite nucleate empirically zero times across the existing scenarios. The same gap exists for several other elements: V is set only when an event explicitly bumps it; trace REE / Li / B / Be are set only in `gem_pegmatite`; Co/Ni only in `supergene_oxidation` (after the round-2 fix). The default-zero pattern produces sterile chemistry that no real locality matches.

The fix is to anchor each scenario to a **specific named locality**, look up published fluid-inclusion or geothermometer data for that locality, and seed the initial broth (and event pulses) with the real numbers — within the precision available.

---

## What to Build

### 1. Locality Anchors

Each scenario currently has a generic name. Replace with a **named real-world reference locality** in the docstring. Existing scenarios already have implicit anchors (Bisbee for `bisbee`, Ouro Preto for `ouro_preto`, Minas Gerais for `gem_pegmatite`); generic ones don't:

| Scenario | Suggested anchor | Why |
|---|---|---|
| `cooling` | Herkimer "diamond" pocket, NY (Lockport Dolostone) | The textbook clear-quartz-in-vug locality; cooling is the only mechanic |
| `pulse` | Vermont quartz vein (Mt. Holly schist) | Fluid-pulse Alpine-style cleft |
| `mvt` | Tri-State district (Joplin / Picher) — Sr-Pb-Zn | Type MVT, well-characterized brine chemistry |
| `porphyry` | Bingham Canyon, Utah | Type porphyry, fluid-inclusion data extensively published |
| `reactive_wall` | Sweetwater Mine, MO (Viburnum Trend) | Acid-into-limestone, sphalerite-galena-marcasite paragenesis |
| `radioactive_pegmatite` | Spruce Pine, NC (or alternative Be/U pegmatite) | Smoky/morion quartz with U-bearing accessories |
| `supergene_oxidation` | Tsumeb, Namibia (1st-stage gossan) | World-class supergene with ~30 minerals already in our pipeline |
| `ouro_preto` | Topázio Imperial mine, Ouro Preto, MG | (Already anchored — verify chemistry) |
| `gem_pegmatite` | Cruzeiro mine, Doce Valley, MG | (Already anchored — verify chemistry) |
| `bisbee` | Copper Queen mine, Warren District | (Already anchored — verify chemistry) |
| `deccan_zeolite` | Nashik / Aurangabad basalt vesicle | (Already anchored — verify chemistry) |

### 2. Per-Locality Fluid Chemistry

For each anchored locality, do a literature pass. **Required references** for each scenario:
- One peer-reviewed paper with fluid-inclusion microthermometry (T, salinity, often P)
- One paper or compendium with fluid-composition data (ICP-MS of inclusions, or compositional bulk analysis of vein fluids)
- One geological-survey or museum mineralogical-summary describing the paragenesis

Bake the numbers into the scenario's `FluidChemistry(...)` initializer — every field a named locality has data for. Where data is sparse, document the gap in the docstring rather than silently defaulting to zero.

### 3. Per-Event Chemistry Calibration

The events in each scenario apply chemistry deltas (e.g. `cond.fluid.Cu += 50`). These were originally tuned by feel. Re-tune each delta against published fluid-evolution sequences for the anchored locality (e.g. for Bisbee, which Cu-pulse magnitudes match the ratio of primary-sulfide-stage to oxidation-stage Cu²⁺ in the literature?). Comments in the event functions should cite the source.

### 4. Mg/Ca Specifically

Even before the broader audit, every scenario should at minimum have a defensible non-zero Mg value. As a baseline:
- **Marine / sedimentary brine** (mvt, reactive_wall, supergene): Mg = 80–1300 ppm depending on dilution
- **Magmatic / hydrothermal** (porphyry, gem_pegmatite, radioactive_pegmatite): Mg = 10–60 ppm
- **Meteoric / supergene oxidizing** (deccan_zeolite, ouro_preto): Mg = 5–20 ppm
- **Cooling / pulse** (generic): Mg = 5–10 ppm

This is the minimum to make Mg-dependent minerals (aragonite, dolomite, talc, chlorite, serpentine) reachable.

### 5. Documentation Trail

Each scenario's docstring should include:
- The anchor locality with one-line geological summary
- Bracketed citation tags for every fluid-chemistry value (e.g. `Cu=400  # [Roedder & Bodnar 1997 — porphyry Cu fluid inclusion compendium]`)
- Any data gaps explicitly noted

---

## What NOT to Change

- **Engine code** — supersaturation functions, growth functions, narrators stay untouched.
- **Event sequences and timing** — keep the existing dramatic arc; only retune the magnitude of each fluid-chemistry delta.
- **Mineral list per scenario** — scenarios should still produce the same dominant species; only the quantitative chemistry shifts.
- **Random seed reproducibility** — the seed-42 species lists may shift slightly post-audit; that's expected and acceptable, but the *character* of each scenario must be preserved.

## Verification

For each scenario:
1. Pre-audit: run seed 42, capture species count + key fluid values at end.
2. Post-audit: re-run seed 42, capture same. Diff should show realistic chemistry shifts (Mg present, trace elements present, ratios match literature) without losing the scenario's signature minerals.
3. Document each scenario's pre→post change in a short table.

Bonus: the `random` archetype generator should sample fluid chemistry from the same per-archetype distributions, so procedural scenarios also reflect real geology.

---

## Files to Touch

- `vugg.py` — every `scenario_*` function definition
- `web/index.html` — every JS scenario mirror
- `docs/index.html` — sync mirror
- (Optional) `proposals/SCENARIO-LOCALITIES.md` — separate file collecting the per-locality literature reviews, so the docstrings can reference shorter tags

## Out of Scope

- Adding new scenarios (covered by separate `SCENARIO-LOCATIONS.md`)
- Adding new minerals (covered by `MINERALS-ROUNDS-3-6.md`)
- Adding new FluidChemistry fields (none needed; all chemistry uses existing broth)

---

Commit per scenario (one scenario, one commit) — this is auditable work where the literature trail matters more than speed. Do NOT push — boss reviews and merges.
