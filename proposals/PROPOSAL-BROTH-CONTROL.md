# PROPOSAL: Broth Control — Six Verbs That Touch the Physics

**Author:** Rock Bot + Professor
**Date:** 2026-05-06
**Status:** Proposal for builder (updated — replaces Inject Species with Replenish, Advance now restores broth)
**Companion to:** `PROPOSAL-HOST-ROCK.md`, `PROPOSAL-GEOLOGICAL-ACCURACY.md`

---

## Overview

The creative-mode broth control buttons were designed for a simpler simulation. Since then, mass balance, carbonate speciation, redox chemistry, and host rock profiles have been implemented. The old controls reference concepts that no longer map cleanly to what the engine actually does.

This proposal replaces the 12-button layout with 6 controls that target the actual state variables: temperature, water level, pH, and fluid composition. Every button does something physically real. No manual chemistry injection.

---

## Current Buttons (to be replaced)

| Button | What it did | Why it's stale |
|--------|------------|----------------|
| Advance step | Tick the clock + refresh broth | Still valid — now also restores fluid to starting concentrations |
| Heat | Raise temperature | Still valid |
| Cool | Lower temperature | Still valid |
| Inject silica | Add Si to fluid | Removed — scenario setup + advance handles this |
| Inject metals | Add Fe/Mn/etc | Removed — same reason |
| Mix brine | Fill vug with starter fluid | Merged into Advance and Replenish |
| Add fluorine | Add F to fluid | Removed |
| Inject copper | Add Cu to fluid | Removed |
| Oxidize | Raise Eh | Absorbed by Drain |
| Tectonic shock | Fracture cavity | Still valid |
| Flood | Raise water level | Paired with Drain |
| Acidify | Lower pH | Still valid |
| Alkalinize | Raise pH | Still valid |

---

## Proposed Buttons

Every control has two scales: a gentle step (nudge) and a large step (shove). Players choose their tempo — careful microscope work or fast-forwarding to see what happens.

### 1. Advance 1 / Advance 10 (paired)
Tick the clock AND replenish the broth. Each advance step tops up the fluid toward the scenario's starting concentrations — this is the natural behavior of a vug with fluid flowing through it. Fresh groundwater arrives, bringing the chemistry back toward baseline.

Advance 1 for careful observation (one step of growth + one dose of replenishment). Advance 10 to fast-forward (ten steps + ten doses).

This is how the old advance button worked before the refactor — it naturally refreshed the broth as part of each time step. Restoring that behavior.

### 2. Warm / Heat  ·  Cool / Quench (paired, two scales)
Temperature drives solubility, reaction rates, polymorph selection (aragonite vs calcite at high T, wurtzite vs sphalerite on quench), and evaporation rate. Warm/Cool for gentle adjustments, Heat/Quench for dramatic shifts.

### 3. Seep / Flood  ·  Drain / Evaporate (paired, two scales)
**Seep/Flood** raises the water level. Seep adds a small amount, Flood is a deluge. The composition of the incoming fluid is determined by the host rock profile (see PROPOSAL-HOST-ROCK.md).

**Drain/Evaporate** lowers the water level. Drain is gradual, Evaporate is rapid. Exposing crystals above the meniscus to air activates vadose zone chemistry:
- Oxidative dissolution (pyrite → goethite, uraninite → secondary U minerals)
- Dehydration (borax → tincalconite, mirabilite → thenardite)
- Ceased growth (no fluid to grow from)

### 4. Tweak pH / Shift pH (paired, acidify and alkalinize as two scales)
Tweak for small adjustments, Shift for dramatic ones. pH drives carbonate speciation (Bjerrum diagram — H₂CO₃ / HCO₃⁻ / CO₃²⁻ shift), controls which minerals dissolve vs precipitate, and sets the Eh-pH stability field.

### 5. Replenish (standalone)
Restore the broth to the vug's starting concentrations WITHOUT advancing time. Use this when the fluid is depleted but you don't want crystals to grow yet — you're just refilling the tank.

This is the "fresh groundwater pulse" button. The fluid returns to whatever the scenario sliders were set to at the start. Mass balance will debit it again as crystals grow.

### 6. Tap / Shock (paired, two scales)
**Tap** — small seismic event, adds a few new nucleation sites. Gentle.
**Shock** — catastrophic fracture of the cavity. Creates many new nucleation sites on fresh fracture surfaces. Opens new fluid pathways. The violent reset.

---

## What Gets Removed

- **Inject silica / inject metals / add fluorine / inject copper** — gone. The scenario setup sliders determine what's available. Advance naturally replenishes. Replenish tops up without advancing. If the player wants different chemistry, they change the starter sliders and restart.
- **Mix brine** — merged into Advance (time + replenish) and the standalone Replenish button.
- **Oxidize** — absorbed by Drain.

---

## Why No Inject Species

The original proposal included an "Inject Species" picker for manually adding individual elements. On reflection, this is unnecessary:

1. **The starter sliders already set the chemistry.** The player chose their starting concentrations when they set up the scenario.
2. **Advance naturally replenishes.** Each time step refreshes the broth toward those starting values.
3. **Replenish handles the "I need more fluid" case.** No need to pick individual species.
4. **The player shouldn't be choosing elements.** They should be choosing conditions. The minerals are the result, not the input.

If a player wants to experiment with unusual chemistry (uranium in a limestone cave), they change the starter sliders. That's the right place for that control — setup, not mid-game injection.

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

Events are scenario-appropriate. The host rock profile gates which events can occur.

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
│  [ 💧 Replenish ]                       │
│  [ 👆 Tap ]  [ ⚡ Shock ]              │
│                                         │
│  ── Random Events ──                    │
│  (appear as they happen, dismissable)   │
└─────────────────────────────────────────┘
```

Paired buttons share a row. Each pair is one control axis with two scales — gentle and aggressive. The player thinks in terms of "hotter/colder," "wetter/drier," "more acidic/more basic." Two scales let them choose their tempo without cluttering the interface.

---

## Implementation

**Files touched:**
- `js/97-ui-fortress.ts` — remove Inject Species modal, add Replenish handler, update Advance to replenish broth
- `index.html` — remove inject-species modal markup, add Replenish button, update action grid
- `data/scenarios.json5` — ensure `initial_fluid` field stores starting concentrations for Replenish to reference

**Migration:** Keep old event IDs as aliases during transition. The inject_species modal code can be removed. Legacy `silica`, `metals`, `fluorine`, `copper` actions alias to Replenish (since they were adding species that the starting broth already contains).

---

## The Key Insight

The player should never choose what grows. They choose the conditions and discover what emerges. The controls are verbs that act on the physics, not on the minerals. The minerals are the *result* — the player's reward for getting the conditions right, or their lesson for getting them wrong.

Six verbs. Three control axes (temperature, water, pH) plus time-with-replenish, standalone replenish, and seismic. Two scales each — gentle and aggressive. Everything else emerges.
