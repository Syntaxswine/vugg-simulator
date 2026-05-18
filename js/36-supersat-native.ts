// ============================================================
// js/36-supersat-native.ts — supersaturation methods for native minerals
// ============================================================
// Mirror of vugg/chemistry/supersat/native.py. Minerals (7): native_arsenic, native_bismuth, native_copper, native_gold, native_silver, native_sulfur, native_tellurium.
//
// Methods are attached to VugConditions.prototype after the class is
// defined in 25-chemistry-conditions.ts, so call sites
// (cond.supersaturation_calcite(), etc.) keep working unchanged.
//
// Phase B7 of PROPOSAL-MODULAR-REFACTOR.

Object.assign(VugConditions.prototype, {
  supersaturation_native_tellurium() {
  if (this.fluid.Te < 0.5) return 0;
  if (this.fluid.Au > 1.0) return 0;
  // Hg not currently tracked; coloradoite gate deferred.
  if (!nativeRedoxAnoxic(this.fluid, 0.5)) return 0;
  // Ag was a hard gate at > 5.0; stale-mineral retune (2026-05) replaced
  // it with a soft suppressor matching the engine's existing Pb / Bi
  // pattern. Why:
  //
  //   1. STRUCTURAL: Path C per-cell chemistry meant hessite's Ag
  //      consumption only debited local cell fluids, not the bulk-view
  //      `conditions.fluid = ring_fluids[equator]` that this σ engine
  //      reads. tools/stale_mineral_probe.mjs showed min Ag = 15.0 ppm
  //      (the scenario's initial value) across 540 (seed × step) pairs.
  //      The hard gate was structurally unreachable.
  //
  //   2. GEOLOGICAL: Cripple Creek's Cresson Vug bonanza pockets show
  //      hessite + native_Te coexistence — native_Te grains as inclusions
  //      WITHIN hessite (Saunders 1991; Spry & Thieben 1996 Mineralium
  //      Deposita 31). The strict 5 ppm gate encoded "Ag fully depleted
  //      before Te overflow" which is the simplified end-of-cascade story;
  //      reality has continuous Ag-Te coexistence as Ag locally drops.
  //
  //   3. CONSISTENT: the engine's other cation suppressors (Pb up to
  //      200 ppm, Bi up to 60 ppm) are soft. Treating Ag identically
  //      (capped at 25 ppm) matches the design pattern. Sister-cascade
  //      engines (calaverite/sylvanite) also use soft factors — see
  //      92b9f37 telluride retune from previous session.
  //
  // Denominator 75 tuned against the Cresson Vug coexistence range:
  // Saunders 2008 fluid inclusion data shows Ag 5-50 ppm in alkalic-Au-Te
  // bonanza pockets where hessite + native_Te coexist. At Ag=15 (scenario
  // initial) ag_suppr ≈ 0.8 — significant but not strangling suppression.
  // At Ag=50 (sylvite-coupled high-Ag regimes) ag_suppr ≈ 0.33 — Te
  // tellurides win cleanly. At Ag=0 (fully cascade-depleted) ag_suppr = 1.0.
  // Hessite's own σ formula (Ag/10 × Te/2) is much more Ag-sensitive than
  // native_Te's; in the firing order, hessite still leads, native_Te
  // emerges in parallel as paragenetically secondary.
  const ag_suppr = Math.max(0.0, 1.0 - this.fluid.Ag / 75.0);
  const te_f = Math.min(this.fluid.Te / 2.0, 3.5);
  const pb_suppr = Math.max(0.5, 1.0 - this.fluid.Pb / 200.0);
  const bi_suppr = Math.max(0.5, 1.0 - this.fluid.Bi / 60.0);
  const red_f = nativeRedoxLinearFactor(this.fluid, 1.0, 1.8, 0.4);
  let sigma = te_f * ag_suppr * pb_suppr * bi_suppr * red_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 150 && T <= 300) {
    T_factor = 1.2;
  } else if (T < 100) {
    T_factor = 0.3;
  } else if (T < 150) {
    T_factor = 0.3 + 0.018 * (T - 100);
  } else if (T <= 400) {
    T_factor = Math.max(0.4, 1.2 - 0.008 * (T - 300));
  } else {
    T_factor = 0.2;
  }
  sigma *= T_factor;
  if (this.fluid.pH < 3 || this.fluid.pH > 8) sigma *= 0.6;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_tellurium');
  return Math.max(sigma, 0);
},

  supersaturation_native_sulfur() {
  if (this.fluid.S < 100) return 0;
  if (!nativeRedoxWindow(this.fluid, 0.1, 0.7)) return 0;
  if (this.fluid.pH > 5) return 0;
  const metal_sum = this.fluid.Fe + this.fluid.Cu + this.fluid.Pb + this.fluid.Zn;
  if (metal_sum > 100) return 0;
  const s_f = Math.min(this.fluid.S / 200.0, 4.0);
  const eh_f = nativeRedoxTent(this.fluid, 0.4, 2.0, 0.4);
  const ph_f = Math.max(0.4, 1.0 - 0.15 * this.fluid.pH);
  let sigma = s_f * eh_f * ph_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 20 && T <= 95) {
    T_factor = 1.2;
  } else if (T < 20) {
    T_factor = 0.6;
  } else if (T <= 119) {
    T_factor = Math.max(0.5, 1.2 - 0.025 * (T - 95));
  } else if (T < 200) {
    T_factor = Math.max(0.3, 0.5 - 0.005 * (T - 119));
  } else {
    T_factor = 0.0;
  }
  sigma *= T_factor;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_sulfur');
  return Math.max(sigma, 0);
},

  supersaturation_native_arsenic() {
  // 2026-05 cascade-gate audit (Arc 2): both `S > 10` and `Fe > 50` hard
  // gates were structurally unreachable under bulk-view chemistry. Even
  // in schneeberg — the canonical five-element As-Co-Ni-Bi-U vein where
  // native_arsenic is supposed to fire — S stays at 30 ppm (the seeded
  // value, since the σ engine reads the equator ring fluid rather than
  // any local cell where arsenopyrite has consumed S). 480 (3 seeds ×
  // 160 steps) probe samples never saw S drop below 30. Same in porphyry
  // (S=60). Same as the native_tellurium Ag-gate problem documented in
  // HANDOFF-CALIBRATION-AND-COVERAGE.md §12.
  //
  // Fix: keep the lower-bound As gate, drop both hard upper gates, and
  // replace them with continuous suppressor factors (the soft-suppressor
  // pattern established by the native_tellurium retune, 2026-05). At
  // schneeberg (S=30, Fe=40):
  //   s_suppr = max(0, 1 - 30/60) = 0.5
  //   fe_suppr = max(0, 1 - 40/200) = 0.8
  // Combined ≈ 0.4× — significant but not strangling. At porphyry (S=60,
  // Fe=30):
  //   s_suppr = max(0, 1 - 60/60) = 0 → σ goes to zero regardless
  // which preserves the geological direction (porphyry brines too S-rich
  // for native arsenic; arsenopyrite + tetrahedrite consume As-S budget).
  //
  // Geological anchor: Cobalt district arsenide veins (Petruk 1971) and
  // Schneeberg five-element veins (Förster & Tischendorf 1989) document
  // native_arsenic — native_bismuth coexistence in the same paragenetic
  // band as arsenopyrite, in bulk fluids where S is present but
  // partitioned to arsenides locally.
  if (this.fluid.As < 5) return 0;
  if (!nativeRedoxAnoxic(this.fluid, 0.5)) return 0;
  // Tightened from (/30, cap 3.0) to (/15, cap 4.0) (2026-05): native_arsenic
  // is a residual-overflow mineral formed when As dominates the local broth,
  // so the "saturation unit" should sit at the geologically-realistic 15 ppm
  // for arsenide-rich veins (Cobalt district + Schneeberg fluid-inclusion
  // baseline) rather than at the diluted 30 ppm typical-hydrothermal level.
  // Cap bumped 3.0 → 4.0 so schneeberg's As=60 ppm can drive as_f to 4.0
  // and clear σ > 1.0 against the new soft S+Fe suppressors + ~0.8 activity
  // correction (calibration math worked out post-Arc-2 gate softening).
  const as_f = Math.min(this.fluid.As / 15.0, 4.0);
  const red_f = nativeRedoxLinearFactor(this.fluid, 1.0, 1.8, 0.4);
  // Denominators tuned to schneeberg (S=30 → s_suppr=0.5, Fe=40 →
  // fe_suppr=0.8). Lower floor 0.0 (not 0.4 as the pre-audit code had —
  // a 0.4 floor would re-create the structural problem the gate softening
  // was designed to fix).
  const s_suppr = Math.max(0.0, 1.0 - this.fluid.S / 60.0);
  const fe_suppr = Math.max(0.0, 1.0 - this.fluid.Fe / 200.0);
  let sigma = as_f * red_f * s_suppr * fe_suppr;
  const T = this.temperature;
  let T_factor;
  if (T >= 150 && T <= 300) {
    T_factor = 1.2;
  } else if (T < 100) {
    T_factor = 0.3;
  } else if (T < 150) {
    T_factor = 0.3 + 0.018 * (T - 100);
  } else if (T <= 350) {
    T_factor = Math.max(0.5, 1.2 - 0.014 * (T - 300));
  } else {
    T_factor = 0.3;
  }
  sigma *= T_factor;
  if (this.fluid.pH < 3 || this.fluid.pH > 8) sigma *= 0.6;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_arsenic');
  return Math.max(sigma, 0);
},

  supersaturation_native_silver() {
  if (this.fluid.Ag < 1.0) return 0;
  if (this.fluid.S > 2.0) return 0;
  if (!nativeRedoxAnoxic(this.fluid, 0.3)) return 0;
  const ag_f = Math.min(this.fluid.Ag / 2.0, 3.0);
  const red_f = nativeRedoxLinearFactor(this.fluid, 1.0, 2.5, 0.3);
  const s_f = Math.max(0.2, 1.0 - this.fluid.S / 4.0);
  let sigma = ag_f * red_f * s_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 100 && T <= 200) {
    T_factor = 1.2;
  } else if (T < 50) {
    T_factor = 0.4;
  } else if (T < 100) {
    T_factor = 0.4 + 0.016 * (T - 50);
  } else if (T <= 300) {
    T_factor = Math.max(0.4, 1.2 - 0.008 * (T - 200));
  } else {
    T_factor = 0.3;
  }
  sigma *= T_factor;
  if (this.fluid.pH < 4 || this.fluid.pH > 9) sigma *= 0.6;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_silver');
  return Math.max(sigma, 0);
},

  supersaturation_native_bismuth() {
  // 2026-05 cascade-gate audit (Arc 2): twin treatment to native_arsenic.
  // The `S > 12` hard gate was structurally unreachable in schneeberg
  // (S=30 — the canonical Bi-rich five-element-vein scenario explicitly
  // calls out "native_bismuth secondary phases" in its scenario notes)
  // and porphyry (S=60). 480 probe samples saw σ pinned at 0.0 in
  // schneeberg. Additionally, the `Bi < 15` lower gate didn't match
  // bismuthinite's `Bi < 5` lower gate even though native_bismuth is
  // bismuthinite's paragenetic step-down: a Bi-rich fluid that crosses
  // bismuthinite's threshold should also cross native_bismuth's after
  // local S depletion. Schneeberg seeds Bi=10 — historically a Bi-mining
  // district pre-uranium-era — and was unable to clear either gate.
  //
  // Fix: lower `Bi < 15` to `Bi < 5` (matches bismuthinite — bi_f scaling
  // naturally suppresses low-Bi fluids), drop `S > 12` hard gate, replace
  // the s_mask floor (0.4) with a true 0.0 floor so the soft suppressor
  // can actually go to zero in high-S brines.
  if (this.fluid.Bi < 5 || !nativeRedoxAnoxic(this.fluid, 0.6)) return 0;
  // Tightened from /25 to /15 (2026-05) for the same reason as
  // native_arsenic — native_bismuth is paragenetically a residual phase
  // and the saturation unit should reflect arsenide/bismuth-vein
  // realities (Schneeberg + Cobalt district fluid inclusions). Cap
  // bumped 2.0 → 3.0 to let Bi-rich Schneeberg-style fluids reach σ > 1
  // without forcing artificially high seeds.
  const bi_f = Math.min(this.fluid.Bi / 15.0, 3.0);
  // Denominator 80 (was /50 in initial Arc 2 commit, widened during
  // calibration): at schneeberg S=30 → s_mask=0.625 (moderate suppression
  // matching the "S present but partitioned to arsenide phases locally"
  // geology). At porphyry S=60 → s_mask=0.25 → mostly gated out. At
  // ultra-low-S environments (S<5) → s_mask≈0.94 (essentially passthrough).
  const s_mask = Math.max(0.0, 1.0 - this.fluid.S / 80.0);
  const red_f = nativeRedoxLinearFactor(this.fluid, 1.0, 1.5, 0.4);
  let sigma = bi_f * s_mask * red_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 100 && T <= 250) T_factor = 1.0;
  else if (T < 100) T_factor = 0.6;
  else if (T <= 270) T_factor = Math.max(0.3, 1.0 - 0.05 * (T - 250));
  else T_factor = 0.1;
  sigma *= T_factor;
  if (this.fluid.pH < 3.0) sigma -= (3.0 - this.fluid.pH) * 0.3;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_bismuth');
  return Math.max(sigma, 0);
},

  supersaturation_native_gold() {
  if (this.fluid.Au < 0.5) return 0;
  const au_f = Math.min(this.fluid.Au / 1.0, 4.0);
  const s_f = Math.max(0.2, 1.0 - this.fluid.S / 200.0);
  let sigma = au_f * s_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 20 && T <= 400) T_factor = 1.0;
  else if (T < 20) T_factor = 0.5;
  else if (T <= 700) T_factor = Math.max(0.5, 1.0 - 0.001 * (T - 400));
  else T_factor = 0.3;
  sigma *= T_factor;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_gold');
  return Math.max(sigma, 0);
},

  supersaturation_native_copper() {
  if (this.fluid.Cu < 50 || !nativeRedoxAnoxic(this.fluid, 0.4) || this.fluid.S > 30) return 0;
  const cu_f = Math.min(this.fluid.Cu / 80.0, 2.5);
  const red_f = nativeRedoxLinearFactor(this.fluid, 1.0, 2.0, 0.4);
  const s_f = Math.max(0.3, 1.0 - this.fluid.S / 40.0);
  let sigma = cu_f * red_f * s_f;
  const T = this.temperature;
  let T_factor;
  if (T >= 20 && T <= 150) T_factor = 1.0;
  else if (T < 20) T_factor = 0.7;
  else if (T <= 300) T_factor = Math.max(0.4, 1.0 - 0.004 * (T - 150));
  else T_factor = 0.2;
  sigma *= T_factor;
  if (this.fluid.pH < 4.0) sigma -= (4.0 - this.fluid.pH) * 0.3;
  if (ACTIVITY_CORRECTED_SUPERSAT) sigma *= activityCorrectionFactor(this.fluid, 'native_copper');
  return Math.max(sigma, 0);
},
});
