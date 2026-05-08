// ============================================================
// js/37-supersat-oxide.ts — supersaturation methods for oxide minerals
// ============================================================
// Mirror of vugg/chemistry/supersat/oxide.py. Minerals (7): corundum, cuprite, hematite, magnetite, ruby, sapphire, uraninite.
//
// Methods are attached to VugConditions.prototype after the class is
// defined in 25-chemistry-conditions.ts, so call sites
// (cond.supersaturation_calcite(), etc.) keep working unchanged.
//
// Phase B7 of PROPOSAL-MODULAR-REFACTOR.

Object.assign(VugConditions.prototype, {
  supersaturation_hematite() {
  if (this.fluid.Fe < 20 || !oxideRedoxAvailable(this.fluid, 0.5)) return 0;
  let sigma = (this.fluid.Fe / 100.0) * oxideRedoxFactor(this.fluid, 1.0) * Math.exp(-0.002 * this.temperature);
  if (this.fluid.pH < 3.5) {
    sigma -= (3.5 - this.fluid.pH) * 0.3;
  }
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'hematite');
  return Math.max(sigma, 0);
},

  supersaturation_uraninite() {
  // Reconciled to Python canonical (v12, May 2026). Pre-v12 JS used a
  // T-only formula with no O2 gate — uraninite would form even in
  // oxidizing conditions, contradicting research-uraninite.md.
  // Now: needs reducing + U + (slight high-T preference).
  if (this.fluid.U < 5 || !oxideRedoxAnoxic(this.fluid, 0.3)) return 0;
  let sigma = (this.fluid.U / 20.0) * oxideRedoxAnoxicFactor(this.fluid, 0.5);
  if (this.temperature > 200) sigma *= 1.3;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'uraninite');
  return Math.max(sigma, 0);
},

  supersaturation_magnetite() {
  if (this.fluid.Fe < 25 || !oxideRedoxWindow(this.fluid, 0.1, 1.0)) return 0;
  const fe_f = Math.min(this.fluid.Fe / 60.0, 2.0);
  const o_f = oxideRedoxTent(this.fluid, 0.4, 1.5, 0.4);
  let sigma = fe_f * o_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 300 && T <= 600) T_factor = 1.0;
  else if (T >= 100 && T < 300) T_factor = 0.5 + 0.0025 * (T - 100);
  else if (T > 600 && T <= 800) T_factor = Math.max(0.4, 1.0 - 0.003 * (T - 600));
  else T_factor = 0.2;
  sigma *= T_factor;
  if (this.fluid.pH < 2.5) sigma -= (2.5 - this.fluid.pH) * 0.3;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'magnetite');
  return Math.max(sigma, 0);
},

  supersaturation_cuprite() {
  if (this.fluid.Cu < 20 || !oxideRedoxWindow(this.fluid, 0.3, 1.2)) return 0;
  const cu_f = Math.min(this.fluid.Cu / 50.0, 2.0);
  const o_f = oxideRedoxTent(this.fluid, 0.7, 1.4, 0.3);
  let sigma = cu_f * o_f;
  if (this.temperature > 100) sigma *= Math.exp(-0.03 * (this.temperature - 100));
  if (this.fluid.pH < 3.5) sigma -= (3.5 - this.fluid.pH) * 0.3;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'cuprite');
  return Math.max(sigma, 0);
},

  supersaturation_corundum() {
  const f = this.fluid;
  if (f.Cr >= 2.0) return 0;  // ruby priority
  if (f.Fe >= 5) return 0;    // sapphire priority
  return this._corundum_base_sigma();
},

  supersaturation_ruby() {
  if (this.fluid.Cr < 2.0) return 0;
  const base = this._corundum_base_sigma();
  if (base <= 0) return 0;
  const cr_f = Math.min(this.fluid.Cr / 5.0, 2.0);
  return base * cr_f;
},

  supersaturation_sapphire() {
  const f = this.fluid;
  if (f.Cr >= 2.0) return 0;  // ruby priority
  if (f.Fe < 5) return 0;
  const base = this._corundum_base_sigma();
  if (base <= 0) return 0;
  let chrom_f = Math.min(f.Fe / 15.0, 1.5);
  if (f.Ti >= 0.5) chrom_f *= Math.min(f.Ti / 1.5, 1.3);
  return base * chrom_f;
},

  // v63 brief-19: TiO2 — tetragonal Ti oxide. The 'needle' mineral. Trace
  // Ti is the gating element; chemically inert otherwise (no acid attack,
  // any redox). Inclusion-in-quartz is the iconic habit.
  supersaturation_rutile() {
    if (this.fluid.Ti < 25) return 0;
    let sigma = (this.fluid.Ti / 60.0);
    const T = this.temperature;
    if (T < 200 || T > 1000) return 0;
    let T_factor = 1.0;
    if (T >= 300 && T <= 700) T_factor = 1.2;
    else if (T < 300) T_factor = Math.max(0.5, 0.6 + 0.006 * (T - 200));
    else T_factor = Math.max(0.6, 1.2 - 0.002 * (T - 700));
    sigma *= T_factor;
    // Titanite (CaTiSiO5) competes when Ca + SiO2 are both available
    if (this.fluid.Ca > 50 && this.fluid.SiO2 > 200 && T < 700) {
      sigma *= Math.max(0.5, 1.0 - 0.001 * (this.fluid.Ca - 50));
    }
    if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'rutile');
    return Math.max(sigma, 0);
  },

  // v63 brief-19: FeCr2O4 — magmatic spinel. Atypical vug mineral; included
  // for cataloging completeness. Requires very high T (>1000°C) which no
  // existing scenario delivers — engine stays dormant until a layered-mafic-
  // intrusion scenario lands.
  supersaturation_chromite() {
    if (this.fluid.Fe < 100 || this.fluid.Cr < 30) return 0;
    if (this.fluid.O2 > 1.0) return 0;
    let sigma = (this.fluid.Fe / 200.0) * (this.fluid.Cr / 80.0);
    const T = this.temperature;
    if (T < 800) return 0;
    let T_factor = 1.0;
    if (T >= 1200 && T <= 1400) T_factor = 1.3;
    else if (T < 1200) T_factor = Math.max(0.4, 0.5 + 0.0015 * (T - 800));
    else T_factor = Math.max(0.5, 1.3 - 0.002 * (T - 1400));
    sigma *= T_factor;
    if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'chromite');
    return Math.max(sigma, 0);
  },
});
