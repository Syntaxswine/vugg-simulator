# Vugg Simulator — Mineral Expansion Batch

## Project Location
`/home/professor/.openclaw/workspace/projects/vugg-simulator/`
Main file: `vugg.py`
Spec: `data/minerals.json` (single source of truth)
Research files: `memory/research-*.md`

## Overview
Add ~15 new mineral species to the simulator. Each has a full research file following the mineral template with all formation parameters, habits, fluorescence, twin laws, paragenesis, and implementation pseudocode.

## How to Add Each Mineral

For each mineral below:
1. Read the research file at `memory/research-[name].md` for full details
2. Add an entry to `data/minerals.json` following the existing schema (every field declared, null where not applicable)
3. Add a growth engine function `grow_[name]()` to `vugg.py` following existing patterns
4. Add a `_narrate_[name]()` method for the collector's view
5. Add to the mineral registry dict in `vugg.py`
6. Wire into appropriate scenario(s) based on temperature/chemistry requirements
7. Run `node tools/sync-spec.js` to verify no drift

**Required fields per mineral (from minerals.json schema):**
- `formula`, `crystal_system`, `nucleation_sigma`, `max_size_cm`, `growth_rate_mult`
- `T_range_C`, `T_optimum_C`, `T_behavior`
- `required_ingredients`, `trace_ingredients`
- `thermal_decomp_C`, `fluorescence`, `twin_laws`, `acid_dissolution`
- `habit_variants`, `class`, `description`, `scenarios`
- `color_rules`, `narrate_function`, `runtimes_present`, `audit_status`

**New broth parameters needed** (check which already exist):
- `Sb` (antimony) — for stibnite
- `Bi` (bismuth) — for bismuthinite, native bismuth
- `V` (vanadium) — for vanadinite, clinobisvanite

## Minerals to Add (grouped by paragenetic sequence)

### Copper Sulfide Sequence (primary → supergene)
1. **Bornite** (Cu₅FeS₄) — `memory/research-bornite.md`
   - Orthorhombic, "peacock ore," iridescent tarnish
   - Primary: 200-400°C, moderate sulfur, with chalcopyrite
   - Order-disorder transition at 228°C (could affect habit/color)
   - Tarnish = surface oxidation, not fluorescence

2. **Chalcocite** (Cu₂S) — `memory/research-chalcocite.md`
   - Supergene enrichment, nearly 80% Cu by weight
   - Pseudomorphs after other minerals (preserves crystal shape)
   - Stellate sixling twins
   - Low nucleation_sigma — forms easily when Cu is high

3. **Covellite** (CuS) — `memory/research-covellite.md`
   - Indigo blue, perfect micaceous cleavage, flexible sheets
   - Forms at the knife-edge between reducing and oxidizing
   - Only common naturally blue mineral
   - Requires both Cu and S at specific Eh conditions

### Apatite Group (supergene oxidation zone, Pb end-members)
4. **Pyromorphite** (Pb₅(PO₄)₃Cl) — `memory/research-pyromorphite.md`
   - Green barrels, insanely low Ksp (10⁻⁸⁴)
   - Needs P in the fluid — competes with mimetite for Pb
   - The "lead vacuum" — if P is present, pyromorphite wins

5. **Vanadinite** (Pb₅(VO₄)₃Cl) — `memory/research-vanadinite.md`
   - Blood-red hexagonal prisms, desert mineral
   - Vanadium leaches away in wet climates — only crystallizes in arid zones
   - Needs a new scenario constraint: arid/evaporite setting

### Antimony-Bismuth Sequence (low-temp hydrothermal → supergene)
6. **Stibnite** (Sb₂S₃) — `memory/research-stibnite.md`
   - Bladed metallic crystals, up to 60cm
   - Low-temp hydrothermal: 100-350°C, reducing
   - New event: `event_antimony_pulse`
   - Three variants: classic blades, iridescent tarnish, kermesite ghost

7. **Bismuthinite** (Bi₂S₃) — `memory/research-bismuthinite.md`
   - Acicular needles, similar conditions to stibnite but higher T
   - Often occurs with native bismuth when sulfur is depleted

8. **Native Bismuth** (Bi⁰) — `memory/research-native-bismuth.md`
   - Trigonal, melts at 271.5°C, gravity 9.8 (very heavy!)
   - Forms when sulfur runs out but Bi remains
   - Could melt back into fluid if temperature rises above 271.5°C

### Iron Oxide Sequence (redox-controlled)
9. **Hematite** (Fe₂O₃) — `memory/research-hematite.md`
   - Five variants: specularite, kidney ore, iron rose, martite, rainbow
   - Arrives when fO₂ crosses the HM buffer
   - Acidifies fluid on nucleation (Fe²⁺ oxidation releases H⁺)

10. **Magnetite** (Fe₃O₄) — `memory/research-magnetite.md`
    - Inverse spinel, requires BOTH Fe²⁺ and Fe³⁺
    - Oxidizes to hematite when oxygen rises — HM buffer crossing should be visible
    - Four variants: octahedral, lodestone, titanomagnetite, martite transformation

### Sphalerite Group (sulfide → supergene)
11. **Wurtzite** (ZnS, hexagonal) — `memory/research-sphalerite.md`
    - High-T polymorph of sphalerite (>1020°C, but also metastable at low T)
    - Rare (~5% spawn chance alongside sphalerite)

**Note:** Smithsonite is already in the game. The research file `memory/research-sphalerite.md` covers the full paragenetic chain sphalerite → wurtzite → smithsonite.

## Priority Order
1. Bornite, chalcocite, covellite (copper sequence — closes the supergene copper gap)
2. Pyromorphite, vanadinite (apatite group — closes the Pb oxidation suite)
3. Stibnite, bismuthinite, native bismuth (adds new hydrothermal assemblage)
4. Hematite, magnetite (iron oxide redox — foundational geochemistry)
5. Wurtzite (polymorph — adds variety to existing sphalerite)

## Design Rules
- `data/minerals.json` is the single source of truth
- Every field exists on every mineral (null = not applicable)
- New broth parameters (Sb, Bi, V) need to be added to FluidChemistry class
- Run `node tools/sync-spec.js` after adding each mineral batch
- Growth engines consume from `conditions.fluid` — no infinite growth
- Narrate functions tell geological stories

## Test
After adding minerals:
1. Run each scenario — no errors
2. Verify new minerals can nucleate in appropriate scenarios
3. Run `node tools/sync-spec.js` — zero drift
4. Test supergene_oxidation — malachite, chalcocite, and covellite should all appear

## After Completion
Commit with descriptive message. Do NOT push — I'll review and merge.
