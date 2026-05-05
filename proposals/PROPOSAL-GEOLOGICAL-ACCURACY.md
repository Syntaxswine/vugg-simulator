# PROPOSAL: Geological Accuracy — Closing the Formal Gaps

**Date:** 2026-05-05
**Author / triggered by:** session asking "what's left between the current sim
and *actually-correct* geochemistry?" after the v17 chemistry-audit rounds, the
B1–B20 modular refactor, and the 3D-SIMULATION Phase A/B/C work all landed.

**Scope:** JS-only. The Python harness is no longer canonical in this repo;
all references and code touches below are to `js/`.

---

## What the simulator already gets right

Worth saying out loud before listing what's missing. None of this needs to
change.

- **Polymorphic & dehydration paramorphs** with zone preservation
  (`75-transitions.ts`): argentite ↔ acanthite at 173 °C, borax → tincalconite,
  anhydrite ↔ gypsum.
- **Pseudomorphism by dissolution + reprecipitation** with the original
  external form preserved (siderite → goethite via O₂ in `52-engines-carbonate.ts`,
  pyrite → goethite, etc.).
- **Vadose-zone oxidation override** when fluid level drops past a ring
  (`85c-simulator-state.ts:_applyVadoseOxidationOverride`) — supergene
  oxidation engines fire naturally above the meniscus while floor stays
  reducing.
- **Per-ring chemistry + diffusion** (3D-SIMULATION Phase C is shipped):
  each ring carries its own `FluidChemistry`; an inter-ring Laplacian
  diffuses solutes step-by-step.
- **Trace-element partitioning** with rate-dependent partition coefficients
  (`grow_calcite`: `Mn_partition = 0.1 * (1 + excess * 0.5)`), and
  per-zone `trace_Mn` / `trace_Fe` for cathodoluminescent zoning narratives.
- **Solid-solution awareness in narration** ("pinkish-white kutnohorite-
  dolomite intermediate", "Ca-bearing intermediate toward ankerite").
- **Broth-ratio branching** for genuine paragenetic forks
  (rosasite/aurichalcite, descloizite/mottramite, olivenite/adamite,
  torbernite/zeunerite).
- **Kim 2023 dolomite-cycle ordering** — `f_ord = 1 - exp(-N/7)` with
  cycle counter in `VugConditions.update_dol_cycles`.
- **Mg poisoning of calcite** (`supersaturation_calcite`), citing Davis 2000 / Nielsen 2013.
- **Habit dispatch by T and excess σ** (calcite scalenohedral > 200 °C →
  rhombohedral; aragonite acicular vs flos-ferri vs cyclic-twin by σ + Fe).
- **Provenance tracking** (Ca-from-wall vs Ca-from-fluid, fed by acid
  dissolution of host rock).
- **Heterogeneous nucleation preferences** (siderite on pyrite, malachite
  on chalcopyrite, smithsonite on dissolved sphalerite, rhodochrosite on
  goethite drips).
- **Radiation damage cascade** (uraninite → smoky quartz, metamictization,
  ²³⁸U → ²⁰⁶Pb chain feeding galena).
- **Effective temperature** flux booster (Mo > 20 ppm broadens what
  high-T minerals can grow at — corundum-flux convention).
- **Twin-law rolling** at nucleation, calibrated against literature
  prevalence (deferred retune on backlog).

The point: none of this is hand-wavy. Where it lands short of real
geochemistry, it lands short *consistently* in a few specific ways.

---

## What's still wrong (the formal gaps)

### Gap 1 — Fluid mass balance is asymmetric

Engines reliably **credit** the fluid on dissolution
(`conditions.fluid.Ca += dissolved_um * 0.5`) but only some of them
**debit** the fluid on precipitation. Concrete count of `conditions.fluid.X -=`
calls in the precipitation branches of each `5x-engines-*.ts`:

| Class      | Debits | Engines in class | Coverage |
|------------|-------:|-----------------:|---------:|
| arsenate   |      5 |                6 |    ~83 % |
| borate     |      0 |                2 |     0 %  |
| carbonate  |      3 |               11 |    27 %  |
| halide     |      0 |                3 |     0 %  |
| hydroxide  |      0 |                3 |     0 %  |
| molybdate  |      2 |                4 |    ~50 % |
| native     |      0 |                7 |     0 %  |
| oxide      |      1 |                7 |    ~14 % |
| phosphate  |      0 |               11 |     0 %  |
| silicate   |      4 |               14 |    ~30 % |

Roughly half the engines treat the fluid as an infinite reservoir for
precipitation. Calcite that grows for 100 steps in a dilute fluid keeps
growing with no fall in `fluid.Ca` — the Ca it's locking into the lattice
isn't coming out of solution. This is the single biggest divergence
from real mass-action chemistry, and it suppresses an entire family of
emergent behaviors:

- **Saturation collapse** when a mineral exhausts its limiting solute
- **Co-mineral competition** (calcite vs aragonite both drinking the same Ca)
- **Anti-correlated zoning** in solid solutions as the fluid composition
  drifts during growth
- **Realistic vug-fill endpoints** — currently the only stop conditions
  are size-cap and geometric fill

### Gap 2 — Saturation is `min(Ca, CO3)`, not `[Ca]·[CO3]`

90+ supersat methods follow the pattern:

```js
const ca_co3 = Math.min(this.fluid.Ca, this.fluid.CO3);
let sigma = ca_co3 / eq;
```

Treating the binary salt's saturation as a Liebig limiting-reagent rule
(`min`) rather than a thermodynamic ion-activity product is plausible
when one solute is in extreme deficit, but it diverges sharply from the
real Q/K relationship in two regimes:

1. **Both ions plentiful, one mildly limiting**: `min(200, 100)/eq = 100/eq`,
   but the real `Q = 200·100 = 20 000`, so the simulator under-predicts σ.
2. **Asymmetric stoichiometric salts** (Pb(VO₄)₃Cl, PbMoO₄, Cu₅FeS₄): the
   true Q is a weighted product like `[Pb]³·[VO₄]³·[Cl]`. Currently each
   of these is hand-computed differently (some use min, some product,
   some weighted-sum), with no shared kernel.

There is also **no ionic-strength correction** anywhere. Activity ≈
concentration is fine for I < 0.05 mol/kg; halite-saturated brines hit
I ≈ 5–6 mol/kg, where γ for divalent ions falls below 0.4. Evaporite
scenarios (`70k-evaporite.ts`) are exactly the ones where this matters
most — and exactly the ones where `concentration` (the v27 evaporative
multiplier) is doing the work that real activity-coefficient corrections
should be doing.

### Gap 3 — Carbonate speciation is collapsed; CO₂ degassing is absent

`fluid.CO3` is one number. The real dissolved-inorganic-carbon pool
(DIC) is partitioned among H₂CO₃\*, HCO₃⁻, and CO₃²⁻ by pH (the
Bjerrum diagram). At pH 6, only ~0.1 % of DIC is carbonate ion; at pH 9,
~30 %. The current code papers over this with a pH-multiplier hack:

```js
if (this.fluid.pH > 7.5) sigma *= 1.0 + (this.fluid.pH - 7.5) * 0.15;
```

The bigger miss: **CO₂ degassing as a precipitation driver**. Travertine,
flowstone, the entire calcite mass at every hot spring on Earth — those
deposits form because rising or boiling fluid loses CO₂, which strips
H⁺-equivalents and supersaturates the system w.r.t. calcite. The sim
has no event type for this. It can simulate a fluid pulse, a temperature
spike, a tectonic event — but not the most common precipitation
mechanism in real cavities.

### Gap 4 — pH and Eh are set by events, not driven by reactions

`fluid.pH` is treated as input state. Events change it; reactions don't.
But every carbonate dissolution **consumes acid** (CaCO₃ + 2H⁺ → Ca²⁺ +
H₂CO₃), every pyrite oxidation **produces acid** (FeS₂ + 7/2 O₂ + H₂O
→ Fe²⁺ + 2H₂SO₄), and the feedback between these is what makes
acid-mine-drainage scenarios self-amplify until either the pyrite
runs out or the host rock's carbonate buffer kicks in.

Eh is worse: it doesn't exist as a state variable at all. `fluid.O2` is
the redox proxy used by 8 of the 12 supersat classes, but the relationship
between O₂ and Eh is mineral-specific (Mn²⁺ → Mn⁴⁺ at ~+0.3 V, Fe²⁺ →
Fe³⁺ at ~+0.7 V, U⁴⁺ → U⁶⁺ at ~+0.2 V). Encoding all of this through
a single oxygen number papers over the redox couple structure that
makes supergene mineralogy interesting.

### Gap 5 — Solid solutions are species-typed, not composition-tracked

The simulator narrates solid solutions ("pinkish-white kutnohorite-
dolomite intermediate") but doesn't *compute* them. A Fe-rich sphalerite
and an Fe-poor sphalerite are both "sphalerite" with no field
distinguishing them; their color, density, optical properties, and
photoluminescence are therefore identical, when in reality Fe content
controls all of them. Same for:

- **Calcite ↔ magnesite ↔ siderite ↔ rhodochrosite** (rhomb carbonate
  series, full continuous solid solutions in pairs)
- **Plagioclase** (albite ↔ anorthite)
- **Olivine** (forsterite ↔ fayalite)
- **Tourmaline** (schorl ↔ elbaite ↔ dravite)
- **Garnet** (pyrope ↔ almandine ↔ spessartine ↔ grossular)
- **Sphalerite** (Zn ↔ Fe; up to ~25 % Fe, with iron content controlling
  the red-brown to black color gradient)

The broth-ratio branching mechanic (rosasite/aurichalcite,
descloizite/mottramite) approximates the *naming* outcome of solid
solutions by picking one end-member and skipping the other when ratios
cross a threshold. That works for the discrete naming question — but it
discards the continuous composition, which is what the trace-element
zoning already half-tracks per zone.

### Gap 6 — Nucleation gates are sharp σ thresholds, not rate functions

```js
if (sigma_c > 1.3 && !existing_calcite.length && !sim._atNucleationCap('calcite')) {
  sim.nucleate('calcite', 'vug wall', sigma_c);
}
```

Classical Nucleation Theory predicts a rate `J ∝ exp(-ΔG\*/kT)` where
`ΔG\* ∝ γ³/(kT·ln σ)²`. Three consequences the current model misses:

1. **Induction time** — quartz at σ = 5 doesn't nucleate instantly; the
   system can sit metastably for a long time. The current `> 1.3` gate
   nucleates immediately on the first step σ crosses the threshold.
2. **Burst nucleation** — once σ exceeds the critical value, J jumps
   five orders of magnitude over a narrow σ range. The current model
   nucleates one crystal per call, then waits for the existing one to
   die before starting the next.
3. **Heterogeneous nucleation reduces ΔG\*** by a factor of `f(θ) =
   (2 - cos θ)(1 + cos θ)²/4` where θ is the contact angle. The
   simulator already encodes "prefers to nucleate on chalcopyrite"
   stochastically, but the strength of that preference is hand-tuned
   per pair rather than derived from a single contact-angle parameter.

This is the lowest-priority gap because the visible-payoff-per-effort
ratio is the worst — the current "sharp threshold + cap" model is
already adequate for game-feel pacing. Listed here because a serious
geochemist would call it out, not because it's the biggest hole.

---

## Proposed phases

Each phase is independently shippable. None blocks any of the
3D-SIMULATION phases or the Gibbs-Thompson proposal (in fact Phase 1
strengthens both). Order is by leverage × tractability.

### Phase 1 — Fluid mass balance: close the leak

**Goal.** Every precipitation step debits the fluid for what it locks into
the crystal. Every dissolution step credits the fluid for what it returns.
The same kernel handles both directions.

**Mechanism.**

1. Add a `MINERAL_STOICHIOMETRY` table (one row per mineral) that lists
   the moles of each fluid species consumed per µm of c-axis growth.
   Calibrate from `data/minerals.json` density + formula:
   ```js
   MINERAL_STOICHIOMETRY['calcite'] = { Ca: 1.0, CO3: 1.0 };
   MINERAL_STOICHIOMETRY['dolomite'] = { Ca: 0.5, Mg: 0.5, CO3: 1.0 };
   MINERAL_STOICHIOMETRY['gypsum'] = { Ca: 1.0, S: 1.0 };
   ```
   Coefficients are normalized against an empirical `MASS_BALANCE_SCALE`
   (likely ~0.005 ppm/µm for typical fluid concentrations) calibrated so
   that the v17 baseline scenarios still produce roughly today's
   crystal counts when seeded identically. The goal here is "now mass
   balances and the late-game runs out of feedstock," not "today's
   scenarios suddenly produce nothing."

2. In `_runEngineForCrystal` (or wrapping it), after the engine returns a
   `GrowthZone` with `thickness_um > 0`, debit the fluid by stoichiometry.
   On `thickness_um < 0`, credit the fluid (engines already do this
   per-mineral; centralizing means the per-engine `+= dissolved_um *
   0.5` lines can be deleted).

3. Floor each species at 0; add a `LOG_DEPLETION` flag so the player
   sees "Ca²⁺ depleted in ring 4 — calcite growth halted" narratives.

4. Existing trace-element partitioning (`trace_Mn = fluid.Mn *
   Mn_partition`) becomes an actual debit too — the partition-coefficient
   value transfers to the crystal *and out of the fluid*, rather than
   being a copy.

**Files touched.** New `js/19-mineral-stoichiometry.ts`. Changes in
`js/85-simulator.ts` (`_runEngineForCrystal` wrapper) and one-line
deletions in each `5x-engines-*.ts` where a per-mineral debit already
exists. Calibration test: `tests/test_mass_balance_baseline_byte_match.js`
asserts the v17 baseline scenarios at seed 42 match within ±5 %
crystal count vs pre-Phase-1.

**Visible payoff.**
- Late-stage scenarios stop spawning crystals when the limiting solute
  runs out, instead of running forever.
- Mineral assemblages compete: calcite + aragonite scenarios show one
  winning the Ca pool, the other stalling.
- Solid-solution composition drift becomes possible — Fe-content of
  late sphalerite zones can fall as Fe leaves the fluid.
- "Recycling" provenance gets sharper: you can show the player that the
  later calcite zones are entirely wall-derived because the original
  fluid Ca is gone.

**Risk.** Recalibration of every scenario is the work. Many gates and
caps were tuned against the infinite-reservoir assumption; a 5–20 %
crystal count delta is plausible. Mitigation: keep `MASS_BALANCE_SCALE`
behind a global with a "v0" mode that disables debiting, ship Phase 1
with the mode initially off, run the baseline scenarios, tune scale
until the deltas are acceptable, then flip on by default. The
`SIM_VERSION` gets a 17 → 18 bump.

### Phase 2 — Saturation Index reform

**Goal.** Replace the `Math.min` Liebig pattern with the correct
multiplicative ion-activity product, with a Davies-equation activity
correction that activates at high ionic strength.

**Mechanism.**

1. New module `js/20a-chemistry-activity.ts` exporting:
   ```js
   function ionicStrength(fluid) { ... }           // I = 1/2 Σ mᵢ zᵢ²
   function davies(z, I) { ... }                   // log γ = -A z²(√I/(1+√I) - 0.3I)
   function activity(fluid, species) { ... }      // wraps both
   ```
   `A = 0.509` at 25 °C with mild T-correction. Davies is good to I ≈
   0.5 mol/kg; for the brine scenarios that hit higher we add a
   "saturation soft cap" rather than going full Pitzer (out of scope —
   see "Out of scope" below).

2. New helper `saturationIndex(activities, mineral)` that returns
   `log10(Q/K)`. `Q` is a true product weighted by formula
   stoichiometry, looked up from the same `MINERAL_STOICHIOMETRY`
   table as Phase 1.

3. Each `supersaturation_<mineral>` method becomes a thin wrapper:
   ```js
   const omega = Math.pow(10, saturationIndex(this.fluidActivities(), 'calcite'));
   // existing kinetic modifiers (Mg poisoning, pH gating) keep their
   // shape and apply on top
   return omega * mg_poisoning_factor * pH_factor;
   ```
   The kinetic modifiers stay as-is — they're not thermodynamic anyway,
   they're empirical step-rate inhibitors / promoters and they're
   already calibrated.

4. Ksp values currently buried as `300.0 * Math.exp(-0.005 * T)` move
   to `data/minerals.json` as `solubility_product: { K_25: 1e-8.48,
   delta_H_kJ: -10.5 }` so van't Hoff temperature dependence is
   declarative.

**Files touched.** New `js/20a-chemistry-activity.ts` (~150 lines). New
field in `data/minerals.json` per mineral. Each `3x-supersat-*.ts`
loses its hand-coded equilibrium constants and gains a one-line
delegation. `data/minerals.json` schema additions are validated in
`tools/sync-spec.js`.

**Visible payoff.**
- Brine scenarios behave correctly: halite saturates at the right
  concentration instead of needing the v27 evaporation multiplier to
  paper over activity effects.
- Stoichiometric formulas drive Q correctly: pyromorphite (Pb₅(PO₄)₃Cl)
  becomes far more saturation-sensitive to Pb depletion than its
  current `Math.min` formula suggests.
- T-dependence becomes declarative — adding a new mineral no longer
  requires inventing new equilibrium-fit-coefficient pairs in TypeScript.

**Risk.** Same as Phase 1 — recalibration. The saturation envelope of
every scenario is going to shift. Same mitigation: feature flag,
baseline sweep, calibrate, flip.

### Phase 3 — Carbonate speciation and CO₂ degassing

**Goal.** Make CO₂ a first-class precipitation driver, like temperature
and fluid mixing already are. Travertine deposits, cave flowstone, the
entire boiling-driven-precipitation regime.

**Mechanism.**

1. Add `fluid.fCO2` (CO₂ fugacity, in bar) and `fluid.DIC` (total
   dissolved inorganic carbon, ppm). The legacy `fluid.CO3` becomes a
   *derived* quantity: `CO3²⁻ = DIC × α₂(pH)` where α₂ is the carbonate-
   ion fraction from the standard Bjerrum partition.
2. Backwards compatibility shim: scenarios that set `fluid.CO3 = 100`
   directly continue to work; the loader splits 100 ppm CO₃²⁻ into the
   appropriate DIC + fCO₂ at the scenario's initial pH. SIM_VERSION
   bump catches saved games.
3. New event type in `EVENT_REGISTRY`:
   ```json5
   { "type": "co2_degas", "step": 200, "fugacity_drop": 0.3,
     "duration_steps": 5,
     "description": "Fluid rises into low-pressure cavity; CO₂ escapes." }
   ```
4. Reciprocal: a `co2_charge` event for new fluid pulses with elevated
   pCO₂ (deep magmatic source).
5. Mass balance: Phase 1's `_runEngineForCrystal` wrapper extends to
   debit/credit DIC on carbonate growth/dissolution, with the H+
   produced/consumed feeding into Phase 4's pH dynamics.

**New scenario.** `tutorial_travertine` — slow boil-driven calcite
buildup, narrating the CO₂ → pH → σ → growth cascade. Maps cleanly
onto the existing tutorial machinery.

**Files touched.** `js/20-chemistry-fluid.ts` (DIC/fCO2 fields,
derivation logic). `js/25-chemistry-conditions.ts` (Bjerrum partition
helper). `js/70-events.ts` + new module `js/70l-degassing.ts` (the
`co2_degas` and `co2_charge` event handlers). `data/scenarios.json5`
(new tutorial; optionally the existing reactive-wall + supergene get
fugacity hints). All carbonate engines drop their hand-coded
`pH > 7.5 ? sigma *= ... ` modifier — DIC/pH coupling now produces it
naturally.

**Visible payoff.** This is *the* scenario-renaissance phase. Boiling
geyser deposits, cave flowstone, the slow expulsion of CO₂ from a
cooling vein — every classic vug-genesis story unlocks. Players see
the pH rising as CO₂ escapes, calcite popping into supersaturation
without any other change, the cycle inverting when the cavity reseals.

**Risk.** Bjerrum is well-behaved and the math is textbook; risk is
purely scenario recalibration (Phase 2 mitigation applies again).

### Phase 4 — pH and Eh as dynamic state variables

**Goal.** pH responds to dissolved/precipitated minerals. O₂ stops
being the universal redox proxy; Eh emerges from a small set of
explicit redox couples.

**Mechanism: pH.**

Each mineral's stoichiometry table from Phase 1 carries its
proton-balance coefficient: precipitating 1 mol calcite from
`Ca²⁺ + HCO₃⁻ → CaCO₃ + H⁺` releases 1 mol H⁺. The
`_runEngineForCrystal` wrapper applies this delta to a per-ring
alkalinity budget, with H⁺ then redistributed against the
carbonate-system buffer (Phase 3 dependency) to recompute pH.
Out-of-buffer rings change pH faster; well-buffered rings barely
budge.

**Mechanism: Eh.**

1. New `fluid.Eh` (mV, default +200 mV oxidizing). `fluid.O2` becomes
   derived for backwards compatibility (rough mapping: O₂ > 1.0 →
   Eh > +500, O₂ < 0.3 → Eh < +50).
2. Three explicit redox couples participate in stepwise re-equilibration:
   - **Fe³⁺/Fe²⁺** (E° = +0.77 V)
   - **Mn⁴⁺/Mn²⁺** (E° = +1.23 V at low pH; pH-dependent)
   - **SO₄²⁻/HS⁻** (E° = -0.22 V at neutral pH)
   The Nernst equation says: at the current Eh and pH, what fraction of
   each couple sits in each oxidation state? That fraction gates which
   minerals can grow (e.g. siderite needs Fe²⁺ dominance; jarosite
   needs Fe³⁺ dominance and low pH).
3. Engines stop checking `fluid.O2 > X`; they check `fluid.Eh > X` or
   `redoxFraction('Fe', 'oxidized') > X`. The conversion is mechanical
   per-engine; the geological meaning sharpens.

**Visible payoff.**
- Acid-mine-drainage scenarios *self-amplify*: pyrite oxidizes →
  H₂SO₄ → pH drops → galena solubility rises → Pb²⁺ in solution → next
  pyrite oxidation pulse → ratchet downward until the carbonate buffer
  runs out.
- Jarosite/goethite competition becomes meaningful: jarosite at pH < 4,
  goethite above.
- Native silver appears below Eh = +50 mV (genuinely reducing); above,
  it converts to acanthite. The current "S < 2 AND O₂ < 0.3"
  depletion-gate becomes a single Eh check.

**Risk.** Higher than Phases 1–3. Eh is interconnected — every redox
mineral's gate has to be ported, and the coupled system can oscillate
if alkalinity and Eh feedback both run at full speed. Mitigate by
running Eh updates with a damping factor (∂Eh/∂step < 50 mV per step).

### Phase 5 — Solid-solution composition tracking

**Goal.** A single `composition` field per crystal, populated zone-by-
zone, that determines color/density/optical properties for solid-
solution minerals. Replaces the discrete broth-ratio gating with a
continuous representation.

**Mechanism.**

1. Each crystal gains `composition: { 'Ca': 0.95, 'Mg': 0.05 }` (mole
   fractions, must sum to 1). For pure end-members it's `{ 'Ca': 1.0 }`
   and ignored.
2. Solid-solution minerals declare their site occupancy in
   `data/minerals.json`:
   ```json5
   sphalerite: {
     solid_solution: { site: 'M', endmembers: ['Zn', 'Fe', 'Mn', 'Cd'],
                       max_Fe_fraction: 0.25 }
   }
   ```
3. During growth, the new growth-zone's composition is computed from
   fluid composition via partition coefficients (already in the
   trace-element machinery). The crystal's overall composition is the
   volume-weighted mean of all its zones — and zones already exist.
4. Color/density/optical/UV-fluorescence fields in `data/minerals.json`
   become piecewise-linear over composition: pure ZnS = pale yellow,
   25 % Fe = black "marmatite". The renderer interpolates.
5. The broth-ratio branching machinery (`9a`/`9b`/`9c` rounds) collapses
   into a single `compositional_branch` declaration: instead of
   "rosasite when Cu/Zn > 0.5, aurichalcite when Zn/Cu > 0.5" we get
   "this is `(Cu,Zn)₅(CO₃)₂(OH)₆` and the mineral name dispatches off
   the realized composition."

**Visible payoff.**
- Sphalerite zoning becomes visible — early Fe-rich (dark) growth
  followed by late Fe-poor (gold-orange) growth tells the same story
  as a real Tri-State sphalerite specimen.
- Calcite-magnesite-siderite-rhodochrosite series simplifies: one
  engine, parameterized by composition.
- The narration loop already knows how to talk about this ("Fe-rich,
  approaching ankerite") — Phase 5 just makes the narration
  *measure-driven* instead of pattern-matching on fluid.

**Risk.** This is the most architecturally invasive phase, but the
existing zone-trace infrastructure already does 80 % of the work.
Unification work, not new physics.

### Phase 6 — Classical-Nucleation-Theory rate gates (optional)

**Goal.** Replace `if (sigma > 1.3) nucleate(...)` with a Boltzmann
nucleation rate.

**Mechanism.** New module `js/79-nucleation-cnt.ts`:

```js
function nucleationRate(sigma, T, gamma_J_per_m2, fHet) {
  // J = K · exp(-ΔG*/kT), ΔG* ∝ γ³ / (kT · ln σ)²
  if (sigma <= 1.0) return 0;
  const k_B = 1.38e-23;
  const kT = k_B * (T + 273);
  const denom = kT * Math.log(sigma);
  const dG_star = (16 / 3) * Math.PI * gamma_J_per_m2 ** 3 / (denom * denom);
  return Math.exp(-dG_star / kT) * fHet;
}
```

Each `_nuc_<mineral>` becomes:
```js
const J = nucleationRate(sigma_c, T_K, INTERFACIAL_ENERGY['calcite'],
                         heterogeneousFactor(substrate));
if (rng.random() < 1 - Math.exp(-J * dt)) sim.nucleate(...);
```

Per-mineral interfacial energies γ go into `data/minerals.json` (most
are tabulated in the literature: calcite ~70 mJ/m², quartz ~370,
gypsum ~50). The substrate-dependent `fHet` is one number per
substrate-overgrowth pair — currently a stochastic rng-roll, becomes
an explicit table.

**Visible payoff.** Realistic burst nucleation, induction times, and
metastable persistence. A high-σ pulse spawns five crystals in one
step; a marginal-σ window can sit empty for 50 steps before something
finally nucleates.

**Risk.** Tuning γ values to make the existing scenarios produce
similar crystal counts requires a calibration sweep. Lowest priority
because the current sharp-threshold model is adequate for game pacing.

---

## Adjacent angles (not phases, just signposts)

These are smaller add-ons that compose well with the phases above
but don't justify their own phase block.

- **Stable-isotope tracking** (δ¹⁸O, δ¹³C). One float per zone for
  each isotope, partition-coefficient-driven. The narration loop can
  describe isotope shifts ("step 230 — pulse of meteoric water shifted
  the calcite δ¹⁸O 12 ‰ negative; the next zone records the change")
  without any rendering work. Naturally piggybacks on Phase 5's
  composition tracking.

- **Fluid inclusion homogenization temperature.** Crystals already get
  fluid inclusions stochastically; storing T at the moment of
  entrapment lets the simulator narrate "fluid inclusion thermometry
  on this calcite crystal would record the 320 °C → 180 °C cooling
  history of the vug". Two extra fields per inclusion.

- **Ostwald ripening.** Already proposed in PROPOSAL-GIBBS-THOMPSON;
  worth re-mentioning that Phase 1 (mass balance) is its prerequisite
  — without fluid debiting, there's no driving gradient for small
  crystals to dissolve into. Phase 1 unblocks Gibbs-Thompson.

- **Pitzer equations for high-salinity brines.** Davies (Phase 2) is
  good to I ≈ 0.5 mol/kg. Halite-saturated brines are 5–6 mol/kg. A
  full Pitzer parameterization is a months-of-work undertaking; the
  pragmatic substitute is a per-mineral "high-salinity correction"
  curve fit to experimental data, which keeps the math tractable while
  closing the worst evaporite-scenario gap.

- **Boiling-driven precipitation.** Phase 3's `co2_degas` event is a
  start, but a true boiling event would also degass H₂S (sulfide
  precipitation in the residual fluid → gold from Au-bisulfide
  complexes), and would couple to a sudden cooling pulse from
  evaporative heat loss. Mostly composable from Phase 3 + Phase 4
  primitives; needs a new event type and one calibrated tutorial
  scenario.

- **Density-driven flow** (PROPOSAL-3D-SIMULATION Phase 6). Phases 1
  and 2 sharpen the per-ring chemistry differences enough that
  density-driven convection between rings has something real to
  redistribute.

---

## Sequencing and interactions with the existing roadmap

Phases 1 and 2 are foundational — they enable everything downstream
without requiring it. Recommended order:

```
Phase 1 (mass balance) ─┬─> Phase 2 (Q, activity) ─┬─> Phase 3 (CO₂)
                        │                          │
                        └─> Gibbs-Thompson         └─> Phase 4 (pH/Eh)
                            (proposal, separate)         │
                                                         └─> Phase 5 (solid sols)
                                                                │
                                                                └─> Phase 6 (CNT)
```

- **3D-SIMULATION Phase D** (orientation tags, habit bias) is parallel
  to all of this. Phase 4 (Eh) is *especially* synergistic with
  per-ring chemistry from 3D Phase C, since vadose oxidation is
  exactly an Eh gradient.
- **Twin-probability retune** (BACKLOG) wants Phase 5 first — once
  composition is tracked, twin laws can be dispatched off composition
  zones (Carlsbad twins in K-feldspar vs Na-feldspar end-members).
- **Gibbs-Thompson** (PROPOSAL-GIBBS-THOMPSON.md) needs Phase 1 to
  produce a real driving gradient for ripening.

---

## Open questions

1. **Calibration baseline.** Should the v17 baseline scenarios be the
   target ("sims look the same after Phase 1, just with proper
   accounting"), or should we accept that better physics produces
   different outcomes ("Phase 1 ships SIM_VERSION 18, scenarios are
   re-tuned, replays in v17 saved games are gracefully degraded")? My
   default: target-the-baseline through a `MASS_BALANCE_SCALE` knob,
   then re-tune scenarios deliberately as a separate pass.

2. **Evaporite mass balance vs. `concentration` multiplier.** The v27
   `fluid.concentration` evaporative multiplier explicitly scales every
   solute. Once Phase 1 lands, evaporite scenarios can model evaporation
   as *removing solvent* (concentrations rise mechanically). Does the
   `concentration` multiplier stay as a v17-compat shim or get removed?

3. **Phase 6 gating per mineral.** Some minerals genuinely *do* nucleate
   at sharp thresholds in nature (galena, fluorite). Others have
   notorious induction problems (quartz, dolomite). Should Phase 6 be
   per-mineral opt-in rather than blanket?

4. **Renderer impact of solid-solution colors.** Phase 5's
   composition-driven colors need the Canvas/3D renderers to
   interpolate between two colormaps. Trivial for the topo strip;
   non-trivial for the 3D viewer.

---

## Out of scope (deliberately)

- **Full geochemical-modeling-software equivalence (PHREEQC, Geochemist's
  Workbench).** The simulator is a game and a teaching tool, not a
  research tool. Aim is a player-visible bar of "real enough that the
  geology rings true under inspection," not "publishable-grade
  thermodynamics."
- **Surface-area kinetics with face-specific growth rates.** Crystals
  grow as `c_length_mm` and `a_width_mm` — face-specific kinetics
  would require a face-resolved geometry model. Big rewrite for
  marginal visible payoff. Defer.
- **Metamictization beyond uraninite + neighbors.** The existing
  cascade is sufficient; modeling lattice-damage healing on heating is
  a niche concern.
- **Reaction-path modeling / pH-Eh phase diagrams as canonical state.**
  Phases 3 and 4 give us a forward-stepping pH and Eh; we don't need
  to compute the fully-equilibrated stability surface every step.
- **A separate "research mode" with PHREEQC-grade fidelity.** If the
  appetite ever materializes, it lives behind a flag and shares zero
  kernel with the game-mode engines. Out of scope for this proposal.

---

## State this proposal targets

After all phases ship, a player running the sabkha or AMD scenarios
should see the simulator do, on its own, what a geochemistry student
would predict on a napkin: solutes deplete, pH self-amplifies in
acid-mine systems, brines saturate halite at the right concentration,
travertine deposits form when CO₂ degasses, sphalerite zones from
black-rim to honey-core as the fluid evolves. None of this is invented
physics — it's the sim *doing what its existing comments already
describe* but with the math underneath those comments matching what
the comments say.
