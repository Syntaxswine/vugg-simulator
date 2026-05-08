// ============================================================
// js/53-engines-halide.ts — halide-class crystal-growth engines
// ============================================================
// Mirror of vugg/engines/halide.py. Minerals (2): fluorite, halite.
//
// Each grow_<mineral>(crystal, conditions, step) is a pure function:
// reads VugConditions / Crystal state, mutates the crystal in place,
// returns the GrowthZone produced (or null to skip the step).
//
// Phase B8 of PROPOSAL-MODULAR-REFACTOR.

function grow_fluorite(crystal, conditions, step) {
  const sigma = conditions.supersaturation_fluorite();
  if (sigma < 1.0) {
    // Acid dissolution: CaF₂ + 2HCl → CaCl₂ + 2HF (releases hydrofluoric acid!)
    if (crystal.total_growth_um > 5 && conditions.fluid.pH < 4.0) {
      crystal.dissolved = true;
      const dissolved_um = Math.min(6.0, crystal.total_growth_um * 0.12);
      // Phase 1e: Ca + F credits handled by applyMassBalance via MINERAL_DISSOLUTION_RATES.fluorite.
      return new GrowthZone({
        step, temperature: conditions.temperature,
        thickness_um: -dissolved_um, growth_rate: -dissolved_um,
        note: `acid dissolution (pH ${conditions.fluid.pH.toFixed(1)}) — CaF₂ + 2H⁺ → Ca²⁺ + 2HF (⚠️ releases hydrofluoric acid)`
      });
    }
    return null;
  }

  const excess = sigma - 1.0;
  let rate = 7.0 * excess * rng.uniform(0.8, 1.2);

  crystal.habit = 'cubic';
  crystal.dominant_forms = ['{100} cube'];

  let color;
  if (conditions.fluid.Fe > 10) color = 'green';
  else if (conditions.fluid.Mn > 5) color = 'purple';
  else if (conditions.temperature > 200) color = 'colorless';
  else color = 'blue-violet';

  // Twin rolling moved to nucleation (Round 9 bug fix Apr 2026).

  return new GrowthZone({
    step, temperature: conditions.temperature,
    thickness_um: rate, growth_rate: rate,
    trace_Fe: conditions.fluid.Fe * 0.02,
    trace_Mn: conditions.fluid.Mn * 0.05,
    note: `color zone: ${color}`
  });
}

function grow_halite(crystal, conditions, step) {
  const sigma = conditions.supersaturation_halite();
  if (sigma < 1.0) {
    if (crystal.total_growth_um > 5 && conditions.fluid.concentration < 1.5) {
      crystal.dissolved = true;
      const dissolved_um = Math.min(8.0, crystal.total_growth_um * 0.20);
      // Phase 1e: Na + Cl credits handled by applyMassBalance via MINERAL_DISSOLUTION_RATES.halite.
      return new GrowthZone({
        step, temperature: conditions.temperature,
        thickness_um: -dissolved_um, growth_rate: -dissolved_um,
        note: `meteoric flush — halite redissolves (concentration ${conditions.fluid.concentration.toFixed(1)})`,
      });
    }
    return null;
  }
  const excess = sigma - 1.0;
  const rate = 8.0 * excess * (0.85 + rng.random() * 0.30);
  if (rate < 0.1) return null;
  if (sigma > 5.0) {
    crystal.habit = 'hopper_growth';
    crystal.dominant_forms = ['{100} cube with pyramidal hopper hollows'];
  } else {
    crystal.habit = 'cubic';
    crystal.dominant_forms = ['{100} cube'];
  }
  conditions.fluid.Na = Math.max(conditions.fluid.Na - rate * 0.05, 0);
  conditions.fluid.Cl = Math.max(conditions.fluid.Cl - rate * 0.08, 0);
  let color_note;
  if (conditions.fluid.Fe > 30) color_note = 'rose-pink halite (Fe inclusions)';
  else if (conditions.fluid.K > 200) color_note = 'blue halite (K-induced color centers)';
  else color_note = 'colorless cubic halite';
  return new GrowthZone({
    step, temperature: conditions.temperature,
    thickness_um: rate, growth_rate: rate,
    note: color_note,
  });
}

// v63 brief-19: atacamite Cu2Cl(OH)3 — emerald supergene chloride.
function grow_atacamite(crystal, conditions, step) {
  const sigma = conditions.supersaturation_atacamite();
  if (sigma < 1.0) {
    if (crystal.total_growth_um > 3 && (conditions.fluid.pH < 5.0 || conditions.fluid.CO3 > 200)) {
      crystal.dissolved = true;
      const dissolved_um = Math.min(4.0, crystal.total_growth_um * 0.12);
      return new GrowthZone({
        step, temperature: conditions.temperature,
        thickness_um: -dissolved_um, growth_rate: -dissolved_um,
        note: conditions.fluid.CO3 > 200
          ? 'CO3 rises — atacamite reverts to malachite chemistry'
          : `acid attack (pH ${conditions.fluid.pH.toFixed(1)}) — Cu2Cl(OH)3 + 3H+ -> 2Cu2+ + Cl- + 3H2O`,
      });
    }
    return null;
  }
  const excess = sigma - 1.0;
  let rate = 4.0 * excess * rng.uniform(0.8, 1.2);
  if (rate < 0.1) return null;
  if (sigma > 2.5) { crystal.habit = 'fibrous_acicular'; crystal.dominant_forms = ['radiating green needles']; }
  else { crystal.habit = 'prismatic_striated'; crystal.dominant_forms = ['striated emerald prism along [001]']; }
  return new GrowthZone({
    step, temperature: conditions.temperature,
    thickness_um: rate, growth_rate: rate,
    trace_Cu: conditions.fluid.Cu * 0.01,
    note: `emerald-green Cu2Cl(OH)3 — Cu ${conditions.fluid.Cu.toFixed(0)} Cl ${conditions.fluid.Cl.toFixed(0)} ppm, σ=${sigma.toFixed(2)}`,
  });
}

// v63 brief-19: sylvite KCl — late-stage evaporite K halide.
function grow_sylvite(crystal, conditions, step) {
  const sigma = conditions.supersaturation_sylvite();
  if (sigma < 1.0) {
    if (crystal.total_growth_um > 5 && conditions.fluid.concentration < 1.5) {
      crystal.dissolved = true;
      const dissolved_um = Math.min(8.0, crystal.total_growth_um * 0.22);
      return new GrowthZone({
        step, temperature: conditions.temperature,
        thickness_um: -dissolved_um, growth_rate: -dissolved_um,
        note: `meteoric dilution (concentration ${conditions.fluid.concentration.toFixed(1)}) — sylvite is even more soluble than halite, dissolves first`,
      });
    }
    return null;
  }
  const excess = sigma - 1.0;
  let rate = 7.0 * excess * rng.uniform(0.85, 1.15);
  if (rate < 0.1) return null;
  if (sigma > 4.0) { crystal.habit = 'hopper_cube'; crystal.dominant_forms = ['{100} cube with stepped hopper faces']; }
  else { crystal.habit = 'cubic'; crystal.dominant_forms = ['{100} cube']; }
  let color_note;
  if (conditions.fluid.Fe > 30) color_note = 'red-orange sylvite (Fe staining — commercial potash aesthetic)';
  else color_note = 'colorless cubic sylvite, vitreous luster';
  return new GrowthZone({
    step, temperature: conditions.temperature,
    thickness_um: rate, growth_rate: rate,
    note: color_note,
  });
}
