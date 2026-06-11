// ============================================================
// js/45-morphology.ts — mineral-agnostic interface-morphology registry
// ============================================================
// Registry hoist (morphology-generalization arc, 2026-06-12): the
// calcite-morphology arc (2026-06-11, proposals/HANDOFF-CALCITE-
// MORPHOLOGY-2026-06-11.md) built a classification pipeline whose
// PHYSICS is universal — Sunagawa's driving-force ladder applies to any
// layer-growth mineral:
//
//   polyhedral/spiral → stepped → hopper/skeletal (instability ONSET,
//   hollow faces still faceted) → dendritic (instability furthered)
//
// (17th catch — peer-review corrected; never regress this order.)
// What is mineral-SPECIFIC is only the calibration: band edges,
// boundary-layer damping scale, impurity hooks, the form rule. This
// file holds the shared machinery + one threshold table per registered
// mineral; engines keep their own physics helpers and the per-mineral
// display flavor.
//
// Registry contract (MORPH_TH.<mineral>):
//   SPIRAL_MAX < STEP_MILD_MAX < STEP_MACRO_MAX < HOPPER_MAX
//     — band edges in Sunagawa order, in the MINERAL'S OWN σ units.
//     σ scales are NOT comparable across minerals (calcite's omega-like
//     supersaturation_calcite() measured 1.05–664; halite's quadratic-
//     in-concentration scale is different beast entirely). Every entry
//     must be calibrated on its own fleet survey — never transcribe
//     another mineral's edges, never transcribe paper thresholds
//     (research doc §5).
//   SIZE_HALF_UM, SIZE_DAMP_CAP_UM — boundary-layer damping (below).
//   sigma(conditions)        → bulk σ (the mineral's supersat method).
//   effSigmaMult(conditions) → OPTIONAL impurity multiplier applied
//                              before the regime cut (calcite: Mg
//                              step-edge pinning).
//   form(conditions)         → OPTIONAL crystallographic form tag
//                              (calcite: Mg/T → scalenohedral).
//
// Basis rule (18th catch — the basis ports WITH the thresholds): the
// pass runs at the END of run_step, AFTER growth + mass balance +
// diffusion, so zones are classified from the POST-STEP σ. The first
// calcite draft classified inside grow_calcite from the IN-STEP
// (pre-growth) σ; the --engine agreement check exposed 0% agreement on
// stalactite_demo — thin-film scenarios inject a σ spike each step that
// the crystal itself consumes within the step. The crystal's interface
// never sees that transient (boundary-layer buffering, Wolthers 2022),
// so the depleted post-step σ is the physical proxy for interface σ.
// Any mineral whose grow_* makes in-step habit decisions from in-step σ
// (the pre-hoist halite/sylvite/bismuth pattern) must have its band
// edges RE-CALIBRATED on the post-step basis, not copied.
//
// The pass is PURE TAGGING: no rng, no fluid mutation — chemistry is
// byte-identical whether or not a mineral is registered.

// Regime list in Sunagawa order (index = severity ordinal — strip chips
// record this ordinal; shared by every registered mineral so ordinals
// stay comparable across chips).
const MORPH_REGIMES = ['spiral_smooth', 'stepped_mild', 'stepped_macro', 'hopper_skeletal', 'dendritic'];

const MORPH_TH: Record<string, any> = {};

// ---- calcite — first tenant (the arc that built this machinery) ----
// Surface σ lags bulk σ on big slow crystals (boundary-layer damping,
// Wolthers 2022): surfσ = 1 + (bulkσ−1)/(1 + size/SIZE_HALF_UM).
// σ here is the sim's omega-like supersaturation_calcite() (measured
// 1.05–664), NOT the papers' reduced σ — do not transcribe paper
// thresholds (research doc §5).
MORPH_TH.calcite = {
  SIZE_HALF_UM: 80,
  // Phase 5 (2026-06-11): the boundary layer is BOUNDED. The original
  // proxy let damping grow linearly with crystal size forever, which
  // divided a 19 mm crystal's σ-excess by ~240 — no geologically sane
  // chemistry could ever step a cabinet-scale crystal, yet stepped
  // GIANTS are exactly what Elmwood grows (the locality ground truth
  // that exposed the flaw). Wolthers 2022's own model parameterizes a
  // FIXED boundary-layer thickness — δ saturates at the hydrodynamic
  // scale (~mm in still fluid), it does not track crystal size without
  // limit. min(size, SIZE_DAMP_CAP_UM) is the faithful proxy: crystals
  // under 2 mm behave exactly as before; giants damp at the δ ceiling
  // (factor 26) instead of without bound. Fleet consequence (measured,
  // recorded in the research doc §1): the sustained-high-σ big-crystal
  // scenarios (marble, deccan, jeffrey) pick up gentle stepped_mild
  // shares — Sunagawa-consistent for sustained driving force — while
  // every dramatic band (macro/hopper/dendrite) and every smooth
  // low-σ scenario (mvt q75 6.4 → surf 1.2, Tri-State spar stays
  // glass) holds. Chemistry-invisible by Phase 2's aspect-preserving
  // design (regime renames carry the parent form's aspect ratio).
  SIZE_DAMP_CAP_UM: 2000,
  SPIRAL_MAX: 2.0,      // < this → smooth spiral spar (BCF lateral growth)
  STEP_MILD_MAX: 8.0,   // 2–8 → gentle macrosteps (onset 2D nucleation)
  STEP_MACRO_MAX: 50.0, // 8–50 → pronounced macrostepped (step bunching)
  HOPPER_MAX: 200.0,    // 50–200 → hopper/skeletal (faces hollow, faceted)
  // ≥ HOPPER_MAX → dendritic (the instability branches)
  MG_SCALENO: 0.15,     // Mg:Ca above this → scalenohedral elongation
  // Phase 4 (Mg axis, 2026-06-11): Mg²⁺ pins step edges (growth
  // inhibition, GCA 2015 / AFM literature) → the same σ bunches HARDER
  // in Mg-rich fluid. Encoded as an effective-σ multiplier
  // (1 + MG_BUNCH·min(Mg:Ca, 1)) applied before the regime cut.
  // k=0.4 calibrated by fleet observation (tools/_probe-mg-axis sweep,
  // recorded in the research doc §4): Jeffrey Mine (Mg:Ca 0.84,
  // serpentinite water) shifts toward stepped — the §6.3 hook — while
  // every scenario's DOMINANT regime stays the validated one; k=0.8
  // over-steepened the dripstone family toward dendrite, against
  // ground truth.
  MG_BUNCH: 0.4,
  // KEEP THE THRESHOLDS IN SYNC with tools/calcite-morphology-map.mjs
  // (the transparent bench — its --engine mode cross-checks this table).
  sigma(conditions: any): number { return conditions.supersaturation_calcite(); },
  effSigmaMult(conditions: any): number {
    const f = conditions.fluid;
    const mgRatio = (f.Mg || 0) / Math.max(1e-6, f.Ca || 0);
    return 1 + MORPH_TH.calcite.MG_BUNCH * Math.min(mgRatio, 1);
  },
  form(conditions: any): string {
    const f = conditions.fluid;
    const mgRatio = (f.Mg || 0) / Math.max(1e-6, f.Ca || 0);
    return calciteMorphForm(mgRatio, conditions.temperature); // physics in js/52 (hoisted bundle-wide)
  },
};

function morphSurfaceSigma(th: any, bulkSigma: number, sizeUm: number): number {
  const effSize = Math.min(Math.max(0, sizeUm), th.SIZE_DAMP_CAP_UM);
  return 1 + (bulkSigma - 1) / (1 + effSize / th.SIZE_HALF_UM);
}

function morphRegime(th: any, surfSigma: number): string {
  if (surfSigma < th.SPIRAL_MAX) return 'spiral_smooth';
  if (surfSigma < th.STEP_MILD_MAX) return 'stepped_mild';
  if (surfSigma < th.STEP_MACRO_MAX) return 'stepped_macro';
  if (surfSigma < th.HOPPER_MAX) return 'hopper_skeletal';
  return 'dendritic';
}

// Morphology classification pass — called at the END of run_step (js/85),
// after the redox sync, before strip capture. Iterates the registry;
// each registered mineral's crystals get this step's zone tagged
// (morph_regime / morph_form / morph_surf_sigma) plus the live
// crystal._morphology summary that habit dispatch reads next step.
function classifyMorphologyStep(sim: any) {
  for (const mineral in MORPH_TH) {
    const th = MORPH_TH[mineral];
    let sigma;
    try { sigma = th.sigma(sim.conditions); } catch (_e) { continue; }
    if (!isFinite(sigma) || sigma < 1.0) continue;
    const mult = th.effSigmaMult ? th.effSigmaMult(sim.conditions) : 1;
    const form = th.form ? th.form(sim.conditions) : null;
    for (const c of sim.crystals) {
      if (!c || c.mineral !== mineral || c.dissolved) continue;
      const z = c.zones.length ? c.zones[c.zones.length - 1] : null;
      if (!z || z.step !== sim.step || z.thickness_um <= 0) continue;
      // Size BEFORE this zone — the map tool's sizeAcc semantics.
      const sizeBefore = Math.max(0, c.total_growth_um - z.thickness_um);
      const surf = morphSurfaceSigma(th, sigma, sizeBefore) * mult;
      const regime = morphRegime(th, surf);
      z.morph_regime = regime;
      if (form) z.morph_form = form;
      z.morph_surf_sigma = surf;
      c._morphology = { regime, form, surf_sigma: surf };
    }
  }
}
