// ============================================================
// js/33-supersat-halide.ts — supersaturation methods for halide minerals
// ============================================================
// Mirror of vugg/chemistry/supersat/halide.py. Minerals (2): fluorite, halite.
//
// Methods are attached to VugConditions.prototype after the class is
// defined in 25-chemistry-conditions.ts, so call sites
// (cond.supersaturation_calcite(), etc.) keep working unchanged.
//
// Phase B7 of PROPOSAL-MODULAR-REFACTOR.

Object.assign(VugConditions.prototype, {
  supersaturation_fluorite() {
  if (this.fluid.Ca < 10 || this.fluid.F < 5) return 0;
  let product = (this.fluid.Ca / 200.0) * (this.fluid.F / 20.0);
  // 5-tier T window per Richardson & Holland 1979 + MVT deposit
  // studies showing 50-152°C formation range. Solubility increases
  // with T below 100°C (kinetically slow precipitation), passes
  // through max around 100-250°C, declines above 350°C.
  let T_factor = 1.0;
  if (this.temperature < 50) T_factor = this.temperature / 50.0;
  else if (this.temperature < 100) T_factor = 0.8;
  else if (this.temperature <= 250) T_factor = 1.2;
  else if (this.temperature <= 350) T_factor = 1.0;
  else T_factor = Math.max(0.1, 1.0 - (this.temperature - 350) / 200);
  let sigma = product * T_factor;
  // v17: fluoro-complex penalty (ported from Python canonical, May 2026).
  // Per Manning 1979 — at very high F, Ca²⁺ + nF⁻ → CaFₙ complexes
  // re-dissolve fluorite. Secondary effect at T<300°C, real.
  if (this.fluid.F > 80) {
    const complex_penalty = (this.fluid.F - 80) / 200.0;
    sigma -= complex_penalty;
  }
  // Acid dissolution — fluorite dissolves in strong acid
  if (this.fluid.pH < 5.0) {
    const acid_attack = (5.0 - this.fluid.pH) * 0.4;
    sigma -= acid_attack;
  }
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'fluorite');
  return Math.max(sigma, 0);
},

  supersaturation_halite() {
  // v27 chloride evaporite. Quadratic in concentration so halite
  // stays dormant at scenario baseline (concentration=1) and fires
  // sharply when a vadose-transition concentration spike kicks in.
  // Mirror of supersaturation_halite in vugg.py.
  if (this.fluid.Na < 5 || this.fluid.Cl < 50) return 0;
  const c = this.fluid.concentration ?? 1.0;
  let sigma = (this.fluid.Na / 100.0) * (this.fluid.Cl / 500.0) * c * c;
  if (this.temperature > 100) sigma *= 0.7;
  if (this.fluid.pH < 4.0) sigma *= 0.5;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'halite');
  return Math.max(sigma, 0);
},

  // v63 brief-19: arid Cu-supergene chloride.
  // Cu2Cl(OH)3 — wins over malachite/brochantite/chrysocolla when Cl is the
  // dominant Cu-pairing anion (Atacama-style aridity). Strict supergene T
  // and oxidizing-only redox.
  supersaturation_atacamite() {
    if (this.fluid.Cu < 10 || this.fluid.Cl < 30) return 0;
    if (this.fluid.O2 < 0.5) return 0;
    let sigma = (this.fluid.Cu / 80.0) * (this.fluid.Cl / 200.0);
    const T = this.temperature;
    if (T < 5 || T > 200) return 0;
    if (T > 100) sigma *= Math.exp(-0.04 * (T - 100));
    else if (T > 40) sigma *= 1.0 - 0.005 * (T - 40);
    if (this.fluid.pH > 7.0) sigma *= Math.max(0.2, 1.0 - 0.25 * (this.fluid.pH - 7.0));
    if (this.fluid.pH < 5.0) sigma *= Math.max(0.3, 1.0 - 0.3 * (5.0 - this.fluid.pH));
    if (this.fluid.CO3 > 100) sigma *= Math.max(0.3, 1.0 - 0.005 * (this.fluid.CO3 - 100));
    if (this.fluid.S > 100) sigma *= Math.max(0.4, 1.0 - 0.003 * (this.fluid.S - 100));
    if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'atacamite');
    return Math.max(sigma, 0);
  },

  // v63 brief-19: late-stage evaporite K-Cl. Quadratic in concentration
  // (like halite) — stays dormant at scenario baseline, fires sharply
  // when a vadose-transition concentration spike kicks in. Carnallite
  // competes for K when Mg is high.
  supersaturation_sylvite() {
    if (this.fluid.K < 50 || this.fluid.Cl < 100) return 0;
    const c = this.fluid.concentration ?? 1.0;
    let sigma = (this.fluid.K / 200.0) * (this.fluid.Cl / 800.0) * c * c;
    if (this.temperature > 100) sigma *= Math.exp(-0.02 * (this.temperature - 100));
    if (this.fluid.Mg > 500) sigma *= Math.max(0.4, 1.0 - 0.001 * (this.fluid.Mg - 500));
    if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'sylvite');
    return Math.max(sigma, 0);
  },
});
