# PROPOSAL: Broth Control — Six Verbs That Touch the Physics

**Author:** Rock Bot + Professor
**Date:** 2026-05-06
**Status:** Proposal for builder
**Companion to:** `PROPOSAL-HOST-ROCK.md`, `PROPOSAL-GEOLOGICAL-ACCURACY.md`

---

## Overview

The creative-mode broth control buttons were designed for a simpler simulation. Since then, mass balance, carbonate speciation, redox chemistry, and host rock profiles have been implemented. The old controls reference concepts that no longer map cleanly to what the engine actually does.

This proposal replaces the 12-button layout with 6 controls that target the actual state variables: temperature, water level, pH, and fluid composition.

---

## Current Buttons (to be replaced)

| Button | What it did | Why it's stale |
|--------|------------|----------------|
| Advance step | Tick the clock | Still valid |
| Heat | Raise temperature | Still valid |
| Cool | Lower temperature | Still valid |
| Inject silica | Add Si to fluid | Too specific — sim tracks 20+ species now |
| Inject metals | Add Fe/Mn/etc | Same problem |
| Mix brine | Fill vug with starter fluid | This is scenario setup, not a mid-game action |
| Add fluorine | Add F to fluid | Too specific |
| Inject copper | Add Cu to fluid | Too specific |
| Oxidize | Raise Eh | Absorbed by flood/drain and pH mechanics |
| Tectonic shock | Fracture cavity | Still valid |
| Flood | Raise water level | Should be paired with drain |
| Acidify | Lower pH | Still valid |
| Alkalinize | Raise pH | Still valid |

---

## Proposed Buttons

Every control has two scales: a gentle step (nudge) and a large step (shove). Players choose their tempo — careful microscope work or fast-forwarding to see what happens.

### 1. Advance 1 / Advance 10 (paired)
Tick the clock. Pure time. No side effects. Advance 1 for careful observation, Advance 10 to fast-forward.

### 2. Warm / Heat  ·  Cool / Quench (paired, two scales)
Temperature drives solubility, reaction rates, polymorph selection (aragonite vs calcite at high T, wurtzite vs sphalerite on quench), and evaporation rate. Warm/Cool for gentle adjustments, Heat/Quench for dramatic shifts.

### 3. Seep / Flood  ·  Drain / Evaporate (paired, two scales)
Replaces old Flood + Oxidize.

**Seep/Flood** introduces fresh fluid from outside the vug. Seep adds a small amount, Flood is a deluge. The composition of the incoming fluid is determined by the host rock profile (see PROPOSAL-HOST-ROCK.md). High-permeability rocks (limestone) flood with carbonate-rich water. Low-permeability rocks (pegmatite) barely flood at all.

**Drain/Evaporate** lowers the water level. Drain is gradual, Evaporate is rapid. Exposing crystals above the meniscus to air activates vadose zone chemistry:
- Oxidative dissolution (pyrite → goethite, uraninite → secondary U minerals)
- Dehydration (borax → tincalconite, mirabilite → thenardite)
- Ceased growth (no fluid to grow from)

This replaces the old "oxidize" button with the actual physical mechanism: take the water away and the air does the rest.

### 4. Tweak pH / Shift pH (paired, acidify and alkalinize as two scales)
Tweak for small adjustments, Shift for dramatic ones. pH drives carbonate speciation (Bjerrum diagram — H₂CO₃ / HCO₃⁻ / CO₃²⁻ shift), controls which minerals dissolve vs precipitate, and sets the Eh-pH stability field. Each direction (acidify/alkalinize) has both a gentle and aggressive option.

### 5. Inject Species (single button, opens picker)
Replaces inject silica / inject metals / add fluorine / inject copper. One button that opens a dropdown or modal where the player selects which species to add and how much.

Available species should include all tracked fluid species:
- **Major:** Si, Al, Fe, Ca, Mg, Na, K, CO₃, S, Cl, P
- **Minor:** Mn, F, B, Ba, Sr, Zn, Cu, Pb
- **Trace:** Li, Be, Nb, U, As, Cr, V, Mo

Each injection adds the chosen amount (slider: 1-100 ppm) to the fluid. The mass balance system debits the fluid as crystals grow — so injecting copper doesn't just "enable chalcopyrite," it adds Cu to the pool that ALL copper-bearing minerals compete for.

### 6. Tap / Shock (paired, two scales)
**Tap** — small seismic event, adds a few new nucleation sites. Gentle.
**Shock** — catastrophic fracture of the cavity. Creates many new nucleation sites on fresh fracture surfaces. Opens new fluid pathways (increases effective permeability temporarily). The violent reset.

---

## What Gets Removed

- **Inject silica / inject metals / add fluorine / inject copper** → collapsed into Inject Species picker
- **Mix brine** → becomes the "start scenario" button (set initial fluid from scenario preset or custom sliders). Not a mid-game action.
- **Oxidize** → absorbed by Drain (lowering water level exposes crystals to oxidizing conditions)

---

## Expanded Random Events

The existing random event system should be expanded to complement the manual controls. Events the player doesn't choose — they just happen.

| Event | Effect | Trigger conditions |
|-------|--------|-------------------|
| **CO₂ pulse** | Lowers pH via carbonate speciation shift | Limestone scenarios, high overburden CO₂ |
| **Magmatic intrusion** | Sudden heat spike + volatile injection (S, F, Cl) | Basalt/granite/pegmatite scenarios, deep settings |
| **Earthquake swarm** | Multiple small shocks, each adding nucleation sites | Any scenario, rare |
| **Evaporation event** | Rapid water loss, concentrates brine, drives evaporite crystallization | Evaporite basin scenarios, high temperature |
| **Bacterial bloom** | Biological sulfate reduction, lowers Eh | Near-surface scenarios, organic-rich environments |
| **Flash flood** | Massive fluid influx, dilutes existing chemistry, resets saturation | High-permeability scenarios |
| **Mineral discovery** | Narrative event — "You found a pseudomorph!" or "This crystal has inclusions!" | Triggered by paragenesis system |

Events are scenario-appropriate. An evaporite basin shouldn't get magmatic intrusions. A pegmatite pocket shouldn't get bacterial blooms. The host rock profile gates which events can occur.

---

## UI Layout

```
┌─────────────────────────────────────────┐
│  [ Advance 1 ]  [ Advance 10 ]         │
│                                         │
│  [ Warm ]  [ Heat ]  /  [ Cool ]  [ Quench ]
│  [ Seep ]  [ Flood ] /  [ Drain ] [ Evaporate ]
│  [ Tweak ↓pH ] [ Shift ↓pH ]           │
│  [ Tweak ↑pH ] [ Shift ↑pH ]           │
│                                         │
│  [ 💧 Inject Species... ]               │
│  [ 👆 Tap ]  [ ⚡ Shock ]              │
│                                         │
│  ── Random Events ──                    │
│  (appear as they happen, dismissable)   │
└─────────────────────────────────────────┘
```

Paired buttons share a row. Each pair is one control axis with two scales — gentle and aggressive. The player thinks in terms of "hotter/colder," "wetter/drier," "more acidic/more basic" — not "inject element #4." Two scales let them choose their tempo without cluttering the interface.

---

## Implementation

**Files touched:**
- `js/70-events.ts` — add new event types, remove old inject/flood/oxidize events
- `js/85-simulator.ts` — update `_applyEvent` dispatch for new event schema
- `js/99e-renderer-topo-2d.ts` — update button panel HTML
- `js/99i-renderer-three.ts` — species picker UI (modal/dropdown)
- `data/scenarios.json5` — add `initial_fluid` field (replaces `mix_brine`)

**Migration:** Keep old event IDs as aliases during transition. A scenario that references `inject_silica` maps to `inject_species(Si, 50)` internally. No scenarios break.

---

## The Key Insight

The player should never choose what grows. They choose the conditions and discover what emerges. The controls are verbs that act on the physics, not on the minerals. The minerals are the *result* — the player's reward for getting the conditions right, or their lesson for getting them wrong.

Six verbs. Three control axes (temperature, water, pH) plus time, chemistry injection, and catastrophe. Two scales each — gentle and aggressive. Everything else emerges.
