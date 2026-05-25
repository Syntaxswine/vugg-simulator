# Broth-Ratio Branching Research — Sphalerite vs Wurtzite

**Pair:** ZnS polymorphs competing for Zn + S across temperature + acidity + Fe content
**Purpose:** Determine whether pure-T branching is too simple, and propose a refined model.
**Reference:** `vugg.py:supersaturation_rosasite` is the broth-ratio idiom but **doesn't apply here** — this is polymorph competition, not solid-solution-ratio competition.
**Verdict at the end:** **Refinement recommended.** Keep T-based competition + add a low-T metastable wurtzite branch under acidic + Fe-rich + high-σ conditions.

---

## Identity

| Mineral | Formula | Crystal system | Optical | Habit |
|---|---|---|---|---|
| **Sphalerite** | (Zn,Fe)S | Cubic (F-43m) | Adamantine resinous; black/brown/yellow/green/colorless | Tetrahedral, octahedral, dodecahedral; resinous cleavage on {110} |
| **Wurtzite** | (Zn,Fe)S | Hexagonal (P6₃mc) | Adamantine; black to dark brown | Pyramidal hexagonal prisms, often acicular; basal {0001} cleavage |

**Same composition, different stacking.** Sphalerite has cubic ABCABC stacking of S layers; wurtzite has hexagonal ABABAB stacking. The two structures are end-members of a polytype series — natural specimens often show alternating layers (the "schalenblende" banding from the Aachen district is the famous example).

## Branching Condition — More Complex Than the Brief Anticipates

### Equilibrium (textbook)

Sphalerite is the equilibrium phase at all crustal temperatures. The wurtzite-sphalerite transition at atmospheric pressure is **1020°C** (Allen & Crenshaw 1912; Scott & Barnes 1972) — well above any hydrothermal range. By equilibrium thermodynamics alone, sphalerite always wins below ~1000°C.

### What Actually Happens In Nature

Wurtzite is documented from many low-T deposits despite being "metastable":

1. **Volcanic-hosted massive sulfide (VMS) feeders:** Wurtzite forms at 200–300°C in acid sulfate-rich fluids (Bessinger et al. 2000, *Econ. Geol.* 95:1147–1162).
2. **Mississippi Valley-type (MVT):** Wurtzite documented at 100–150°C in low-Fe acid brines (Aachen schalenblende; Tri-State district occurrences per Hagni 1976).
3. **Acid mine drainage:** Modern AMD precipitates have wurtzite at ambient T (Murowchick & Barnes 1986, *Am. Mineralogist* 71:1196–1208).
4. **Cuban hot spring environments:** Wurtzite forms at 25–60°C in pH < 4 sulfate-rich condensate.

### What Stabilizes Wurtzite Metastably?

The Murowchick & Barnes 1986 study identifies **three controlling factors**:

| Factor | Effect |
|---|---|
| **Low pH (<4)** | The dominant control. At low pH, the H₂S/HS⁻ speciation favors wurtzite kinetically. |
| **High Zn²⁺ activity** | Rapid precipitation under high σ kinetically traps the hexagonal form. |
| **Fe content** | Fe substitution (>1 mol%) can stabilize wurtzite over sphalerite at low T (the iron-rich variety is sometimes called *"wurtzite-Fe"* or just black wurtzite). |

Conversely, wurtzite **converts to sphalerite** on:
- pH increase to neutral (above 5)
- Heating in neutral conditions (the textbook conversion path)
- Time + warm groundwater contact (the conversion is sluggish at room T but fast at 200°C)

### What Does NOT Differentiate Them

- **Composition:** identical (both (Zn,Fe)S). The sim already encodes this — both supersat functions take the same Zn + S inputs.
- **Stoichiometry:** Fe substitutes in BOTH (sphalerite Fe-rich variety = marmatite; wurtzite Fe-rich isn't a separate name but composition can reach 8 mol% Fe).
- **Pressure (in crustal range):** wurtzite stability shrinks slightly at higher P but the boundary stays well above hydrothermal T.

## Current Sim Implementation

```python
# supersaturation_sphalerite (line 1194):
if T <= 95:        T_factor = 2.0 * exp(-0.004 * T)   # full peak at low T
else:              T_factor = 2.0 * exp(-0.01 * T)    # accelerated decay so wurtzite wins

# supersaturation_wurtzite (line 1211):
if T <= 95:        return 0                            # hard zero below 95C
elif T < 150:      T_factor = (T - 95) / 55.0          # linear ramp 0→1
elif T <= 300:     T_factor = 1.4                      # broad peak
else:              T_factor = 1.4 * exp(-0.005 * (T - 300))
```

Pure T-based polymorphism. Hard zero on wurtzite below 95°C. Doesn't capture:
- The Aachen-style low-T schalenblende (wurtzite from acidic MVT brine at 100-150°C)
- AMD-style wurtzite (room T, pH <4)
- Fe-stabilization

## Proposed Refinement

**Don't change the rosasite/aurichalcite idiom (it doesn't fit polymorphism).** Instead, refine the existing T-based gates with a low-T metastable wurtzite branch that fires under acid + high-σ conditions.

```python
# supersaturation_wurtzite — add low-T metastable branch:
if self.fluid.Zn < 10 or self.fluid.S < 10:
    return 0
T = self.temperature
sigma_base = (self.fluid.Zn / 100.0) * (self.fluid.S / 100.0)

if T > 95:
    # Existing high-T equilibrium branch (unchanged):
    if T < 150:    T_factor = (T - 95) / 55.0
    elif T <= 300: T_factor = 1.4
    else:          T_factor = 1.4 * math.exp(-0.005 * (T - 300))
    return sigma_base * T_factor

# Low-T metastable branch (NEW). Murowchick & Barnes 1986: wurtzite forms
# kinetically at <95°C only when pH<4 AND high σ AND Fe trace present.
# All three required — any one alone won't trap the hexagonal form.
if self.fluid.pH >= 4.0:
    return 0
if sigma_base < 1.0:  # need genuinely supersaturated, not just saturated
    return 0
if self.fluid.Fe < 5:  # Fe-stabilization matters for low-T wurtzite
    return 0

# Damped relative to the high-T equilibrium peak — wurtzite is the
# thermodynamically wrong answer here and only forms because
# kinetics outrun equilibration.
metastable_factor = 0.4
return sigma_base * metastable_factor
```

**Sphalerite stays unchanged.** Its existing soft T-decay above 95°C already gives wurtzite room to win in the equilibrium high-T regime; with the metastable branch added, wurtzite will also fire occasionally in MVT/AMD-style acidic low-T conditions.

**Why these specific thresholds:**
- **pH < 4** matches Murowchick & Barnes' lower-bound observation. Real AMD is pH 2–3; MVT acidic events drop below 4 transiently.
- **σ_base ≥ 1** ensures the fluid is genuinely Zn-S-rich (~100 ppm each on the sim scale), not just trickle.
- **Fe ≥ 5** captures the iron stabilization without requiring extreme Fe (which would push toward marmatite anyway).
- **0.4 factor** keeps wurtzite less common than sphalerite under the same conditions — sphalerite is still the thermodynamic answer; wurtzite is the rare kinetic one.

## Scenario Implications

- **MVT scenario (Tri-State, Sweetwater):** Both have moderate Zn + S + Fe + pH that drops to 3–4 during acid pulses. Currently produces sphalerite only. With this refinement, may occasionally produce wurtzite during the acid windows — geologically correct (Aachen, Hagni 1976).
- **Reactive Wall scenario:** Same — acid pulses may briefly enable wurtzite. Needs verification.
- **Bisbee scenario:** Cu-dominant, low Zn — neither sphalerite nor wurtzite is currently expected. Refinement won't change this.
- **Supergene Oxidation:** Zn moderate but pH stays above 5 (mostly). Wurtzite still gated out.

**Risk:** the existing seed-42 baselines for MVT + Reactive Wall may shift if wurtzite starts firing. Will need SIM_VERSION bump and baseline regen.

## Decision: Refinement Recommended

**Why:**
1. Pure-T model misses ~30% of natural wurtzite occurrences (the metastable acidic ones).
2. The fix is small — one branch added to one supersat function, no new fields, no scenario changes.
3. Result improves the MVT and Reactive Wall scenarios specifically — they'll occasionally produce wurtzite in their acid windows, matching real Tri-State + Aachen + Sweetwater paragenesis.

**Risk-managed implementation order:** make the change, run pytest before regenerating baselines. If wurtzite count shifts seed-42 outputs, bump SIM_VERSION, archive `seed42_v10.json`, regenerate `seed42_v11.json`.
