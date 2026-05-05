// ============================================================
// js/20b-chemistry-carbonate-system.ts — DIC + Bjerrum speciation
// ============================================================
// PROPOSAL-GEOLOGICAL-ACCURACY Phase 3a: aqueous-side carbonate
// system. Splits the simulator's single `fluid.CO3` field into the
// proper DIC partition (H₂CO₃*, HCO₃⁻, CO₃²⁻) using the Bjerrum
// equations from the carbonate dissociation constants K₁ and K₂.
//
// Couples deliberately with PROPOSAL-VOLATILE-GASES (Rock Bot,
// 2026-05-04, on canonical) — that proposal owns the multi-species
// headspace state vector (volatiles['CO2'] partial pressure +
// gas sources/sinks). This module owns the aqueous-side speciation
// that turns CO₂ partial pressure into actual carbonate-system
// chemistry. When VOLATILE-GASES lands, it consumes
// `equilibriumPCO2(fluid)` from here to set its volatiles['CO2'];
// scenarios with degassing events use `setDICAndPH` to update the
// carbonate state in a Bjerrum-consistent way.
//
// Default state: CARBONATE_SPECIATION_ACTIVE = false. Nothing in
// existing scenarios uses this module yet — Phase 3b will migrate
// the carbonate supersat methods and add a co2_degas event handler.
// Until then, this is callable infrastructure that narrators and
// future scenarios can use.
//
// Conventions:
//   - fluid.CO3 in the simulator carries TOTAL dissolved inorganic
//     carbon (DIC) by convention, in ppm. Pre-Phase-3 supersat
//     methods that read fluid.CO3 are reading DIC, not just CO₃²⁻.
//     This module's bjerrumPartition(fluid) extracts the correct
//     CO₃²⁻ fraction at the current pH for thermodynamic Q
//     calculation (Phase 3b will use it).
//   - DIC is in ppm (as CO3 mass-equivalent). Real DIC measurements
//     usually report mg/L of carbon, not carbonate; the conversion
//     factor is 60 g/mol CO3 vs 12 g/mol C (factor 5). The
//     simulator's per-species ppm convention treats CO3 as the
//     species, so DIC here is in those units.
//   - K₁ and K₂ from Plummer & Busenberg 1982 / Millero 1995. T in
//     °C. Pressure correction for moderate pressures (<1 kbar)
//     is small; ignore for now.

const CARBONATE_SPECIATION_ACTIVE = false;

// Carbonate dissociation constants. pK at temperature, returned as
// -log₁₀(K). Values from Stumm & Morgan, Aquatic Chemistry (3rd ed.),
// linearized fits valid 0–80 °C, anchor at 25 °C with experimentally-
// confirmed values:
//   pK₁ ≈ 6.35  (H₂CO₃* ⇌ H⁺ + HCO₃⁻)
//   pK₂ ≈ 10.33 (HCO₃⁻ ⇌ H⁺ + CO₃²⁻)
//   pKH ≈ 1.47  (CO₂(g) ⇌ H₂CO₃* in mol/(kg·atm))
// T-coefficients linearized from the full Plummer-Busenberg integrals
// across the natural-water temperature range; departure from the full
// PB formulas is < 0.05 pK units up to 60 °C.
function pK1Carbonate(T_celsius: number): number {
  const T = Math.max(0, Math.min(80, T_celsius));
  return 6.352 - 0.0007 * (T - 25);
}

function pK2Carbonate(T_celsius: number): number {
  const T = Math.max(0, Math.min(80, T_celsius));
  return 10.329 - 0.0029 * (T - 25);
}

// Henry's-Law constant for CO₂ at temperature, mol/(kg·atm).
// CO₂ solubility decreases with T (gas escapes from warm fluid).
function pKH_CO2(T_celsius: number): number {
  const T = Math.max(0, Math.min(80, T_celsius));
  return 1.464 + 0.005 * (T - 25);
}

// Bjerrum partition: given the fluid's total DIC (= fluid.CO3 in ppm)
// and pH, return the mole-fraction split among H₂CO₃*, HCO₃⁻, CO₃²⁻.
// At pH 6: ~95% H₂CO₃*, ~5% HCO₃⁻, <0.1% CO₃²⁻.
// At pH 8: ~3% H₂CO₃*, ~96% HCO₃⁻, ~1% CO₃²⁻.
// At pH 10: <0.1% H₂CO₃*, ~70% HCO₃⁻, ~30% CO₃²⁻.
//
// Used by Phase 3b's carbonate supersat methods to extract the
// thermodynamically correct CO₃²⁻ activity for Q calculation,
// instead of treating fluid.CO3 as the carbonate ion directly.
function bjerrumFractions(pH: number, T_celsius: number): { H2CO3: number; HCO3: number; CO3: number } {
  const H = Math.pow(10, -pH);
  const K1 = Math.pow(10, -pK1Carbonate(T_celsius));
  const K2 = Math.pow(10, -pK2Carbonate(T_celsius));
  // f(H2CO3) : f(HCO3) : f(CO3) = H² : H·K1 : K1·K2
  // Normalize so they sum to 1.
  const f0 = H * H;          // H2CO3*
  const f1 = H * K1;         // HCO3-
  const f2 = K1 * K2;        // CO3^2-
  const total = f0 + f1 + f2;
  return {
    H2CO3: f0 / total,
    HCO3: f1 / total,
    CO3: f2 / total,
  };
}

// Convenience: extract the actual CO₃²⁻ activity (in ppm-equivalent)
// at the fluid's current pH and temperature. The aqueous Q for, say,
// calcite uses this rather than fluid.CO3 directly.
function carbonateIonPpm(fluid: any, T_celsius: number): number {
  if (!fluid || typeof fluid.CO3 !== 'number' || fluid.CO3 <= 0) return 0;
  const pH = typeof fluid.pH === 'number' ? fluid.pH : 7.0;
  const fractions = bjerrumFractions(pH, T_celsius);
  return fluid.CO3 * fractions.CO3;
}

// Compute the equilibrium pCO₂ (bar) consistent with the fluid's
// current DIC and pH. This is the "aqueous-side answer" that
// PROPOSAL-VOLATILE-GASES would set its `volatiles['CO2']` to,
// so the headspace and aqueous side stay in equilibrium. When there
// is no headspace (submerged ring), the pCO₂ is hypothetical — what
// CO₂ would degas if the cavity opened to that ring.
//
// pCO2 = [H2CO3*] / KH_CO2  (Henry's-Law inversion)
function equilibriumPCO2(fluid: any, T_celsius: number): number {
  if (!fluid || typeof fluid.CO3 !== 'number' || fluid.CO3 <= 0) return 0;
  const pH = typeof fluid.pH === 'number' ? fluid.pH : 7.0;
  const fractions = bjerrumFractions(pH, T_celsius);
  // DIC ppm → mol/kg (assume CO3 as ~60 g/mol surrogate)
  const DIC_molal = fluid.CO3 / (1000 * 60.01);
  const H2CO3_molal = DIC_molal * fractions.H2CO3;
  const KH = Math.pow(10, -pKH_CO2(T_celsius));
  return KH > 0 ? H2CO3_molal / KH : 0;
}
