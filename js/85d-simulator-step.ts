// ============================================================
// js/85d-simulator-step.ts — VugSimulator methods (Object.assign mixin)
// ============================================================
// Methods attached to VugSimulator.prototype after the class is defined
// in 85-simulator.ts, so direct calls and dynamic dispatch keep working.
//
// Methods here (4): apply_events, dissolve_wall, ambient_cooling, check_nucleation.
//
// Phase B20 of PROPOSAL-MODULAR-REFACTOR.

// Backlog K (2026-05): cached lookup over MINERAL_SPEC for fill_exempt:true
// entries. Returns true if ANY mineral is fill_exempt, false otherwise.
//
// The cache key is the MINERAL_SPEC object reference itself — when the async
// _loadSpec() in 00-mineral-spec.ts replaces MINERAL_SPEC with the live JSON
// (the FALLBACK→full transition), the cached result auto-invalidates and we
// re-scan once. Without this, a check_nucleation call that races ahead of
// _loadSpec would memoize `false` from the bare FALLBACK and never see the
// fill_exempt entries the JSON adds.
//
// Used by check_nucleation to preserve the legacy short-circuit when no
// fill-exempt minerals exist (e.g. test harnesses with synthetic specs).
let _fillExemptCachedFor: any = null;
let _fillExemptCachedResult = false;
function _anyFillExemptInSpec(): boolean {
  if (typeof MINERAL_SPEC !== 'object' || !MINERAL_SPEC) return false;
  if (_fillExemptCachedFor === MINERAL_SPEC) return _fillExemptCachedResult;
  let any = false;
  for (const k in MINERAL_SPEC) {
    if (MINERAL_SPEC[k] && MINERAL_SPEC[k].fill_exempt === true) { any = true; break; }
  }
  _fillExemptCachedFor = MINERAL_SPEC;
  _fillExemptCachedResult = any;
  return any;
}

Object.assign(VugSimulator.prototype, {
  apply_events() {
  for (const event of this.events) {
    if (event.step === this.step) {
      const result = event.apply_fn(this.conditions);
      this.log.push('');
      this.log.push(`  ⚡ EVENT: ${event.name}`);
      this.log.push(`     ${result}`);
      this.log.push('');
    }
  }
},

  dissolve_wall() {
  const wall = this.conditions.wall;
  // Acid strength = how far below the carbonate-attack threshold pH we
  // are. Negative when pH ≥ 5.5; clipped to 0 inside wall.dissolve().
  const acid_strength = Math.max(0.0, 5.5 - this.conditions.fluid.pH);
  // Skip the call entirely when there's no work to do — neutral fluid
  // AND default reactivity. Avoids logging noise.
  if (acid_strength <= 0.0 && wall.reactivity <= 1.0) return;

  const pre_sigma_cal = this.conditions.supersaturation_calcite();
  const pre_Ca = this.conditions.fluid.Ca;

  const result = wall.dissolve(acid_strength, this.conditions.fluid);

  if (result.dissolved) {
    // Distribute the erosion per-cell. Cells shielded by acid-resistant
    // crystals don't budge, concentrating the attack elsewhere — the
    // vug grows lopsided in whatever direction the deposit left bare.
    const blocked = this._wallCellsBlockedByCrystals();
    this.wall_state.erodeCells(result.rate_mm, blocked);
    const post_sigma_cal = this.conditions.supersaturation_calcite();

    this.log.push(`  🧱 WALL DISSOLUTION: ${result.rate_mm.toFixed(2)} mm of ${wall.composition} dissolved`);
    if (blocked.size) {
      this.log.push(`     ${blocked.size} cell${blocked.size === 1 ? '' : 's'} shielded by acid-resistant crystal growth`);
    }
    this.log.push(`     pH ${result.ph_before.toFixed(1)} → ${result.ph_after.toFixed(1)} (carbonate buffering)`);
    this.log.push(`     Released: Ca²⁺ +${result.ca_released.toFixed(0)} ppm, CO₃²⁻ +${result.co3_released.toFixed(0)} ppm, Fe +${result.fe_released.toFixed(1)}, Mn +${result.mn_released.toFixed(1)}`);
    this.log.push(`     Vug diameter: ${result.vug_diameter.toFixed(1)} mm (+${result.total_dissolved.toFixed(1)} mm total enlargement)`);

    if (post_sigma_cal > pre_sigma_cal * 1.3 && post_sigma_cal > 1.0) {
      this.log.push(`     ⚡ SUPERSATURATION SPIKE: σ(Cal) ${pre_sigma_cal.toFixed(2)} → ${post_sigma_cal.toFixed(2)} — rapid calcite growth expected!`);
    }
  }
},

  ambient_cooling(rate = 1.5) {
  this.conditions.temperature -= rate * rng.uniform(0.8, 1.2);
  this.conditions.temperature = Math.max(this.conditions.temperature, 25);

  // ---- Thermal pulses: episodic fluid injection ----
  // Real hydrothermal systems don't cool monotonically. Hot fluid pulses
  // arrive through fractures — fast, dramatic, then bleed heat back out.
  // Probability scales with how far we've cooled (more fractures open as
  // rock contracts) and inversely with how hot we still are (already-hot
  // systems don't notice small pulses).
  const cooledFraction = 1 - (this.conditions.temperature - 25) / Math.max(this._startTemp || 400, 100);
  const pulseChance = 0.04 + cooledFraction * 0.06; // 4-10% per step
  if (rng.random() < pulseChance && this.conditions.temperature < (this._startTemp || 400) * 0.8) {
    // Spike: 30-150°C above current, but not above original start temp
    const spike = rng.uniform(30, 150);
    const newTemp = Math.min(this.conditions.temperature + spike, (this._startTemp || 400) * 0.95);
    const actualSpike = newTemp - this.conditions.temperature;
    if (actualSpike > 15) {
      this.conditions.temperature = newTemp;
      // Fresh fluid pulse brings chemistry
      this.conditions.fluid.SiO2 += rng.uniform(50, 300);
      this.conditions.fluid.Fe += rng.uniform(2, 15);
      this.conditions.fluid.Mn += rng.uniform(1, 5);
      this.conditions.flow_rate = rng.uniform(1.5, 3.0);
      // pH shift from new fluid (slightly acidic hydrothermal)
      this.conditions.fluid.pH = Math.max(4.0, this.conditions.fluid.pH - rng.uniform(0.3, 1.0));
      this.log.push(`  🌡️ THERMAL PULSE: +${actualSpike.toFixed(0)}°C — hot fluid injection through fracture! T=${newTemp.toFixed(0)}°C`);
      this.log.push(`     Fresh fluid: SiO₂↑, Fe↑, Mn↑, pH↓ — new growth expected`);
    }
  }

  // pH recovery toward equilibrium — scaled by flow rate.
  // Fresh fluid flushing through the vug dilutes acid and restores
  // pH; a sealed pocket can't exchange fluid, so acidity persists
  // until mineral reactions buffer it. Recovery 0.1/step at
  // flow_rate=1.0, near-zero at flow_rate~0.1 (sealed pocket).
  if (this.conditions.fluid.pH < 6.5) {
    const recovery = 0.1 * Math.min(this.conditions.flow_rate / 1.0, 2.0);
    this.conditions.fluid.pH += recovery;
  }

  if (this.conditions.flow_rate > 1.0) this.conditions.flow_rate *= 0.9;
  const active_quartz = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
  if (active_quartz.length) {
    const depletion = active_quartz.reduce((s, c) => s + (c.zones.length ? c.zones[c.zones.length - 1].thickness_um : 0), 0) * 0.1;
    this.conditions.fluid.SiO2 = Math.max(this.conditions.fluid.SiO2 - depletion, 10);
  }

  // Sulfide growth depletes Fe, S, Cu, Zn
  const active_sulfides = this.crystals.filter(c => (c.mineral === 'pyrite' || c.mineral === 'chalcopyrite' || c.mineral === 'sphalerite') && c.active);
  for (const c of active_sulfides) {
    if (c.zones.length) {
      const dep = c.zones[c.zones.length - 1].thickness_um * 0.05;
      this.conditions.fluid.S = Math.max(this.conditions.fluid.S - dep, 0);
      this.conditions.fluid.Fe = Math.max(this.conditions.fluid.Fe - dep * 0.5, 0);
      if (c.mineral === 'chalcopyrite') {
        this.conditions.fluid.Cu = Math.max(this.conditions.fluid.Cu - dep * 0.8, 0);
      }
      if (c.mineral === 'sphalerite') {
        this.conditions.fluid.Zn = Math.max(this.conditions.fluid.Zn - dep * 0.8, 0);
      }
    }
  }
},

  check_nucleation(vugFill) {
  // Backlog K (2026-05): the global vugFill >= 0.95 cutoff used to
  // short-circuit ALL nucleation engines once the cavity hit 95%
  // fill — including paragenetically-late efflorescent crusts
  // (borax, mirabilite, thenardite, sylvite) that geologically
  // grow ON existing crystal cover, not in competition with it.
  // Stack the fill-cap state instead and let _atNucleationCap
  // do the per-mineral check (consulting MINERAL_SPEC[m].fill_exempt).
  //
  // Engines that already gate on _atNucleationCap (~all of them) get
  // the new behavior for free with no call-site changes; fill-exempt
  // minerals pass through, non-exempt minerals are blocked at the
  // cap helper exactly as if they'd hit max_nucleation_count.
  //
  // Fast path: if no mineral in the spec is fill_exempt AND we're
  // capped, the legacy short-circuit still applies (saves running 12
  // class dispatchers when nothing useful can come of it).
  const capped = (vugFill !== undefined && vugFill >= 0.95);
  this._fillCapped = capped;
  if (capped && !_anyFillExemptInSpec()) return;

  _nucleateClass_arsenate(this);
  _nucleateClass_borate(this);
  _nucleateClass_carbonate(this);
  _nucleateClass_halide(this);
  _nucleateClass_hydroxide(this);
  _nucleateClass_molybdate(this);
  _nucleateClass_native(this);
  _nucleateClass_oxide(this);
  _nucleateClass_phosphate(this);
  _nucleateClass_silicate(this);
  _nucleateClass_sulfate(this);
  _nucleateClass_sulfide(this);
},
});
