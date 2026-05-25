# PROPOSAL: Volatile Gases — Bubbles, Redox, and Vesicle Formation

**Author:** Rock Bot
**Date:** 2026-05-04
**Status:** Proposal for builder + Professor review
**Companion to:** `PROPOSAL-EVAPORITE-WATER-LEVELS.md`, `PROPOSAL-3D-SIMULATION.md`

---

## Overview

The simulator currently tracks dissolved species (Ca, Fe, Cu, S, etc.) but has no representation of **volatile gases** — the CO₂, H₂S, SO₂, H₂O vapor, and O₂ that drive some of the most important geological processes in vugs. Adding a gas phase creates three new mechanics:

1. **Vesicle formation** — gas bubbles trapped in the vug wall become the nucleation chambers for minerals (Deccan Traps amygdale story)
2. **Redox control** — O₂ and H₂S availability determines whether minerals form sulfides (reduced) or oxides/sulfates (oxidized)
3. **Acid generation** — CO₂ and SO₂ dissolve into fluid, lowering pH, driving dissolution events

---

## The Gas Model

### New data fields

```python
class VugConditions:
    # EXISTING fields unchanged
    # ...

    # NEW gas fields
    gas_pressure_atm: float = 1.0       # total gas pressure in vug headspace
    volatiles: dict = {                   # partial pressures in atm
        'CO2': 0.01,    # carbon dioxide — pH control, dissolution driver
        'H2S': 0.00,    # hydrogen sulfide — sulfide mineral formation
        'SO2': 0.00,    # sulfur dioxide — acid gas, high-T volcanic
        'O2': 0.21,     # oxygen — oxidation control
        'H2O_vapor': 0.02,  # water vapor — humidity in vadose zone
        'N2': 0.76,     # nitrogen — inert filler, atmospheric baseline
    }
    humidity_pct: float = 100.0          # vadose zone humidity (100% = submerged)
```

### Partial pressures sum to total pressure

```
gas_pressure_atm = sum(volatiles.values())
```

If the vug is fully submerged, gas_pressure = hydrostatic pressure at depth (solubility is pressure-dependent). If partially filled (evaporite mode), the headspace has its own gas composition.

---

## Gas Sources and Sinks

### Sources (gas entering the vug)

| Source | Gases Added | Trigger |
|--------|------------|---------|
| **Magmatic degassing** | CO₂, SO₂, H₂S | High-T events, geothermal pulse |
| **Fresh infiltration** | CO₂ (dissolved, from groundwater) | Water level rise |
| **Bacterial reduction** | H₂S (from sulfate-reducing bacteria) | Low-T, organic-rich scenarios |
| **Atmospheric exchange** | O₂ (diffusion through fractures) | Vadose zone, slow |
| **Decomposition** | CO₂ (from organic matter breakdown) | Near-surface scenarios |

### Sinks (gas consumed or lost)

| Sink | Gases Removed | Mechanism |
|------|--------------|-----------|
| **Sulfide precipitation** | H₂S consumed | Fe + H₂S → pyrite (FeS₂) + H⁺ |
| **Carbonate precipitation** | CO₂ consumed (shifts equilibrium) | Ca²⁺ + CO₂ + H₂O → calcite |
| **Oxidation reactions** | O₂ consumed | Fe²⁺ + O₂ → Fe³⁺ (goethite, hematite) |
| **Venting** | All gases | Fracture opens, pressure equalizes |
| **Dissolution** | CO₂, SO₂ dissolve into fluid | Lowers pH, drives acid dissolution |

---

## Mechanic 1: Redox Windows

The O₂/H₂S ratio determines which minerals are stable:

```
if O2 >> H2S:  # oxidizing environment
    → oxides (hematite, goethite, cuprite)
    → sulfates (barite, gypsum, jarosite)
    → carbonates (calcite, malachite, azurite)
    → native metals unstable (gold excepted)

if H2S >> O2:  # reducing environment
    → sulfides (pyrite, galena, sphalerite, chalcopyrite)
    → native metals possible (copper, silver)
    → oxides unstable (dissolve)
    → sulfates unstable (reduce)

if balanced:  # redox boundary — the most interesting zone
    → BOTH assemblages compete
    → Secondary minerals form (e.g., chalcocite replacing bornite)
    → Uranium mineralization peaks at this boundary
```

### Implementation

```python
def redox_state(self):
    """Returns 'reducing', 'oxidizing', or 'boundary' based on O2/H2S ratio."""
    ratio = self.volatiles['O2'] / max(self.volatiles['H2S'], 0.001)
    if ratio > 10: return 'oxidizing'
    if ratio < 0.1: return 'reducing'
    return 'boundary'
```

The redox state gates mineral formation:
- Pyrite requires `reducing` or `boundary` + sufficient Fe + H₂S
- Malachite requires `oxidizing` + Cu + CO₂
- Uraninite requires `reducing` + U; secondary U minerals require `oxidizing` (the water level drop exposes uraninite → autunite)

This is the chemistry behind the uranium matrix fork (Cu × Ca × PO₄ × AsO₄ × VO₄) — now the gas phase drives whether U stays reduced (uraninite) or oxidizes (secondaries).

---

## Mechanic 2: CO₂ and pH

CO₂ dissolves into the fluid phase and lowers pH:

```
CO₂ + H₂O → H₂CO₃ → H⁺ + HCO₃⁻
```

Higher CO₂ partial pressure → more dissolved CO₂ → lower pH → **more acidic fluid** → **more dissolution of existing minerals**.

### The dissolution-precipitation cycle

```
1. Magmatic CO₂ pulse enters vug → pH drops to 4-5
2. Existing calcite dissolves (releases Ca²⁺ into fluid)
3. CO₂ slowly vents or is consumed → pH rises back to 7-8
4. Ca²⁺ is now available in solution at higher concentration
5. New calcite precipitates (possibly with different trace elements)
6. Repeat with each CO₂ pulse
```

This creates **dissolution-reprecipitation events** — the mechanism behind epimorphs, skeletal crystals, and paragenetic layering.

### Game implementation

```python
def effective_pH(self):
    """pH driven by CO₂ partial pressure (simplified)."""
    # Base pH from rock chemistry (~8 for basalt, ~6 for granite)
    base_pH = 7.5
    # CO₂ acidification: more CO₂ = lower pH
    co2_effect = -2.0 * math.log10(max(self.volatiles['CO2'], 0.0001) / 0.01)
    return base_pH + co2_effect
```

---

## Mechanic 3: Vesicle Formation (the Deccan story)

When basalt (or any volcanic rock) hosts the vug, the vug itself may have started as a gas bubble. But more importantly, **gas bubbles in the wall** create future mineralization sites.

### Vesicle creation

During high-temperature volcanic events:
- Gas exsolves from cooling magma
- Bubbles form in the wall rock
- Bubble size depends on gas pressure and magma viscosity
- Bubbles are approximately spherical (minimum energy)

### Vesicle filling (later, lower temperature)

After the wall rock cools, fluid percolates into vesicles:
- Fluid chemistry determines what grows (zeolites from alkaline fluids, chalcedony from silica-rich fluids)
- Spherical void constrains crystal habit → radiating, botryoidal, spherulitic
- Multi-stage filling: zeolites first, then silica, then carbonates

### For the simulator

The vug already has bubble-shaped irregularities in the wall profile. The gas mechanic makes those bubbles *geological* — they formed because gas was trapped. The mineral that fills them depends on the fluid chemistry at the time of filling, which depends on the gas composition.

**Future extension:** vesicle wall cells could have a `vesicle: True` flag, and the renderer could show them as small round voids in the cavity wall that fill with minerals over time. Each vesicle is a tiny sub-vug with its own crystal growth.

---

## Mechanic 4: Vadose Zone Humidity

With the water level mechanic implemented, the vadose zone (above water) now has a humidity parameter:

```
humidity_pct = 100.0   # at meniscus (capillary fringe)
humidity_pct = ~80-95%  # near meniscus (moist air)
humidity_pct = ~20-40%  # high vadose (dry air from fracture openings)
humidity_pct = ~5-10%   # arid vadose (desert scenario)
```

Humidity controls:
- **Borax → tincalconite** dehydration (below 40% humidity, borax effloresces)
- **Gypsum stability** (dry air accelerates dehydration to anhydrite at elevated T)
- **Efflorescent crusts** (chalcanthite, melanterite form in humid vadose; dehydrate in dry)
- **Crystal growth in vadose zone** (thin film deposition — slower but produces different habits)

---

## Interaction with Water Levels

The gas phase and water level are deeply connected:

```
FULLY SUBMERGED (phreatic):
  - No headspace → gases are dissolved in fluid
  - Redox controlled by dissolved O₂ and H₂S
  - CO₂ drives pH directly
  - No humidity mechanic needed

PARTIALLY FILLED:
  - Headspace above water level has gas composition
  - Gas exchange at meniscus (dissolution/degassing)
  - Vadose zone humidity from H₂O_vapor partial pressure
  - Evaporation concentrates dissolved species

FULLY DRAINED (dry vug):
  - All gas, no liquid
  - Atmospheric composition dominates (high O₂)
  - Oxidation of everything
  - Dehydration of hydrous minerals
  - No new crystallization (except sublimation, rare)
```

---

## Scenarios Enabled

### Deccan Traps Zeolite Vug
- Basaltic host, alkaline fluid, low-T
- High CO₂ from magmatic degassing
- Spherical vesicles fill with zeolites
- Multi-generation: apophyllite → stilbite → calcite

### Volcanogenic Massive Sulfide (VMS)
- High H₂S from magmatic source, reducing
- Massive sulfide precipitation (pyrite, chalcopyrite, sphalerite)
- When O₂ intrudes: supergene oxidation (chalcocite, native copper)
- Redox boundary is the mineralization front

### Acid Mine Drainage (anthropogenic, if we want it)
- Pyrite exposed to O₂ + H₂O → sulfuric acid
- pH drops to 2-3
- Dissolves everything, precipitates jarosite/ferrihydrite
- Demonstrates why sulfide mines are environmentally damaging

### Mexican Amethyst Vug (Professor's flat)
- Volcanic amygdale in basalt
- CO₂-charged alkaline fluid
- Quartz (amethyst) precipitates as fluid cools
- Later calcite from CO₂ loss (pH rises)
- Cherry-red MW fluorescence from Mn²⁺ in calcite (Fe already spent in amethyst phase)

---

## Implementation Priority

| Phase | Feature | Lines Est. |
|-------|---------|-----------|
| 1 | `volatiles` dict on VugConditions + redox_state() | ~80 |
| 2 | CO₂ → pH calculation + dissolution effect | ~60 |
| 3 | Gas source/sink events (magmatic degassing, venting) | ~100 |
| 4 | Redox-gated mineral formation (update existing nucleation checks) | ~200 |
| 5 | Vadose humidity (tie to water level mechanic) | ~40 |
| 6 | Vesicle flag on wall cells (future, cosmetic) | ~50 |

Phase 1-3 are the foundation. Phase 4 retrofits existing minerals to care about redox. Phase 5 connects to the water level system. Phase 6 is future eye candy.

---

## The Key Insight

Gases are the **invisible chemistry**. The minerals are what you see. The gases are *why you see them* — or why you don't. A vug full of H₂S produces a completely different assemblage than a vug open to the atmosphere. The same rock, the same temperature, the same trace elements — just different gas, different world.

The calcite in Professor's amethyst flat glows cherry red under MW because the gas changed. The iron was consumed during the amethyst phase (reducing conditions, Fe²⁺ incorporated into quartz). By the time calcite grew, the iron was gone and only Mn²⁺ remained to activate fluorescence. The gas wrote that story. The minerals just recorded it.
