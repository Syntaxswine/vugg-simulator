# PROPOSAL: Gibbs-Thompson Dissolution Cycling — Quality Control for Crystal Habits

**Date:** 2026-04-22
**Triggered by:** Reddit r/crystalgrowing thread — IHTFPhD (author of the paper) explaining that brief dissolution pulses during growth eliminate defects via the Gibbs-Thompson effect. High-curvature areas dissolve first (higher chemical potential/solubility), smoothing the crystal before growth resumes.

---

## The Physics

**Gibbs-Thompson effect:** The solubility of a crystal surface depends on its curvature. Convex tips (high curvature) are more soluble than flat faces (low curvature). During a brief undersaturation event:

1. High-curvature defects (rough tips, hopper edges, dendrite branches) dissolve first
2. Flat faces and well-formed edges survive
3. When supersaturation returns, growth resumes on a smoother substrate
4. Repeated cycles → progressively better-formed crystals

This is NOT just theory — the dolomite implementation already uses it. Kim et al. (2023) showed that dolomite's ordered Ca-Mg layering requires repeated dissolution-reprecipitation cycles. The Sabkha scenario naturally produces pulsed supersaturation through evaporation cycling.

**The proposal:** Make Gibbs-Thompson a universal simulation mechanic, not just a dolomite special case.

---

## Current State

- **Constant supersaturation** → habit depends only on σ magnitude (low σ = euhedral, high σ = skeletal/dendritic)
- **Dolomite** uses dissolution cycling for ordering (special case)
- **Sabkha** naturally oscillates (evaporation events), but the habit improvement is incidental, not modeled
- No general mechanism links dissolution cycling to crystal quality

---

## Proposed Mechanic

### `crystal_quality` per-crystal metric

Every crystal gains a quality score (0.0–1.0) that affects habit selection and visual rendering:

```python
crystal.quality = 0.5  # default at nucleation

# Each growth step:
if sigma > 0:  # growing
    crystal.quality *= 0.999  # slight degradation from continuous growth (defects accumulate)
    
# Each dissolution pulse (sigma < 0):
    defect_removal = abs(sigma) * GIBBS_THOMPSON_FACTOR * crystal.curvature
    crystal.quality = min(1.0, crystal.quality + defect_removal)
```

### Quality affects habit selection

Higher quality → more euhedral habits. Lower quality → more skeletal/hopper:

| Quality | Habit tendency |
|---|---|
| 0.8–1.0 | Pristine euhedral (sharp terminations, flat faces) |
| 0.5–0.8 | Well-formed but with minor imperfections |
| 0.2–0.5 | Skeletal, hopper, stepped |
| 0.0–0.2 | Dendritic, spherulitic, massive |

Existing habits map to quality ranges. A calcite crystal at quality 0.9 grows as a sharp scalenohedron. The same mineral at quality 0.3 grows as a hopper scalenohedron with stepped faces.

### Quality affects edge textures

The edge texture system (Stages 0–5) already renders habit-specific edges. Quality could modulate:
- **High quality:** crisp, clean edges with sharp terminations
- **Low quality:** rougher edges, more ragged, stepped appearance
- **Visual signal:** players can SEE which crystals grew under oscillating conditions vs constant supersaturation

---

## How Scenarios Trigger It

### Existing scenarios that naturally cycle

- **Cooling:** temperature drops → σ rises → crystal grows → temperature stabilizes → σ drops → brief dissolution → repeat
- **Pulse:** already oscillates by design — should produce the best-formed crystals in the game
- **Sabkha:** evaporation cycles naturally pulse σ — dolomite already benefits, other minerals should too
- **Reactive wall:** acid pulses create alternating dissolution/growth windows

### Scenarios that would need cycling added

- **MVT, Porphyry, Gem pegmatite, Ouro Preto, Bisbee, Deccan, Supergene, Radioactive pegmatite:** currently steady-state or stepwise. Adding minor σ oscillations (±5–10%) would simulate natural fluid pulsing and produce more realistic crystal assemblages.

### New event type: `dissolution_pulse`

```python
{
    "name": "Brief Undersaturation",
    "sigma_modifier": -0.3,  # temporary undersaturation
    "duration_steps": 3,     # short — just enough to smooth defects
    "description": "Fluid chemistry shifts briefly, dissolving high-curvature defects."
}
```

This is the geological equivalent of a quick etch — remove the ugly bits, keep the good stuff, then grow again.

---

## Implementation Phases

### Phase 1: Crystal quality metric (data model only)
- Add `quality` field to crystal objects (default 0.5)
- Track quality changes during growth/dissolution steps
- No visual changes yet — just data gathering

### Phase 2: Quality → habit dispatch
- Quality gates habit selection within existing grow functions
- High-quality crystals select euhedral habits; low-quality select skeletal
- Existing habit triggers (σ-based) become secondary to quality-based selection
- Narrative text reflects quality ("pristine scalenohedron" vs "ragged hopper crystal")

### Phase 3: Quality → edge texture modulation
- Edge texture amplitude and crispness scale with quality
- Visual difference between pulsed-growth and constant-growth crystals
- Players learn to recognize quality at a glance

### Phase 4: Universal dissolution pulse events
- Add minor σ oscillations to all scenarios (±5–10%, 2–5 step duration)
- Scenarios that already oscillate (pulse, sabkha) get the benefit automatically
- Scenarios that don't oscillate gain more realistic crystal assemblages

### Phase 5: Player-facing mechanic
- Creative mode slider: "Dissolution cycling intensity" (0 = constant growth, 1 = aggressive cycling)
- Higher cycling = fewer crystals but better-formed ones
- Lower cycling = more crystals but ragged/skeletal
- Tradeoff: quantity vs quality (same real-world tradeoff mineral collectors make)

---

## Why This Matters

1. **Geological accuracy.** Real crystals don't grow under constant conditions. Fluid pulsing, temperature oscillation, and intermittent undersaturation are the norm, not the exception. The simulator currently treats steady-state as default and cycling as special — it should be the other way around.

2. **Gameplay depth.** The quantity/quality tradeoff gives players a meaningful choice. Aggressive cycling produces display-grade specimens. Constant growth produces industrial-grade. The collector's eye matters.

3. **Visual payoff.** Quality-modulated edge textures would make the wall profile genuinely beautiful in a way that constant supersaturation never can. The best-looking runs should be the ones with the most realistic chemistry.

4. **Connects to existing work.** Dolomite's dissolution-cycle kinetics, Sabkha's evaporation pulses, the edge texture system, the habit dispatch — all of these are already in place. Gibbs-Thompson is the unifying principle that makes them work together.

---

## Open Questions

1. **Should quality affect growth rate?** Higher-quality crystals might grow slower (more ordered addition of growth units). Or quality and rate could be independent.
2. **How many dissolution cycles per scenario?** Too many = no crystals survive. Too few = no visible quality improvement. Probably 2–5 per run is the sweet spot.
3. **Should quality be visible in the Library?** A "crystal grade" indicator (A/B/C/D) next to each saved specimen would give the completionist view another dimension.

---

*Source: Reddit r/crystalgrowing, user IHTFPhD (paper author), April 2026. Gibbs-Thompson effect: high-curvature surfaces have higher solubility → dissolution preferentially removes defects → growth resumes on smoother substrate. "After two centuries of failed attempts, scientists finally grow the crystal."*
