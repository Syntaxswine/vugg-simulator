// ============================================================
// js/07-habit-variant.ts — Habit-variant picker
// ============================================================
// selectHabitVariant — scores each habit_variants[] entry of MINERAL_SPEC[mineral] by trigger keywords (low/moderate/high σ, T) and vector vs. space constraint, then weighted-randoms a pick. Mirrors select_habit_variant in vugg.py. Reads the global rng (declared later in 99-legacy-bundle.ts).
//
// Phase B3 of PROPOSAL-MODULAR-REFACTOR. SCRIPT-mode TS (no import/export);
// every top-level declaration is a global available to later modules.

// Pick a habit variant for a nucleating crystal based on current σ / T / space.
// Mirrors select_habit_variant in vugg.py: triggers like "low σ" / "high σ" /
// "moderate T" are matched against current conditions; vectors ("coating"
// vs "projecting") are weighed against how crowded the vug is. Returns
// the chosen variant dict, or null if the mineral has no variant objects.
function selectHabitVariant(mineral, sigma, temperature, spaceConstrained) {
  const entry = MINERAL_SPEC[mineral];
  if (!entry) return null;
  const variants = (entry.habit_variants || []).filter(v => v && typeof v === 'object');
  if (!variants.length) return null;

  const score = (v) => {
    const trig = (v.trigger || '').toLowerCase();
    let s = 1.0;
    if (trig.includes('very high σ')) s += sigma > 4.0 ? 2.0 : -1.5;
    else if (trig.includes('high σ')) s += sigma > 3.0 ? 1.5 : -1.0;
    else if (trig.includes('moderate-high σ') || trig.includes('moderate σ')) s += (sigma >= 1.5 && sigma <= 3.5) ? 1.5 : -0.5;
    else if (trig.includes('low-moderate σ')) s += (sigma >= 1.0 && sigma <= 2.2) ? 1.2 : -0.4;
    else if (trig.includes('low σ')) s += sigma < 2.0 ? 1.2 : -0.8;

    if (trig.includes('high t')) s += temperature > 300 ? 1.0 : -0.6;
    else if (trig.includes('moderate t')) s += (temperature >= 150 && temperature <= 300) ? 1.0 : -0.4;
    else if (trig.includes('low t')) s += temperature < 150 ? 1.0 : -0.6;

    const vec = (v.vector || '').toLowerCase();
    if (spaceConstrained) {
      if (vec === 'projecting') s -= 0.8;
      else if (vec === 'coating') s += 0.6;
      else if (vec === 'tabular') s += 0.3;
    }
    if (trig.startsWith('default')) s += 0.3;

    return Math.max(s, 0.05);
  };

  const weights = variants.map(v => {
    const sc = score(v);
    return sc * sc;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return variants[0];
  let r = rng.random() * total;
  for (let i = 0; i < variants.length; i++) {
    r -= weights[i];
    if (r <= 0) return variants[i];
  }
  return variants[variants.length - 1];
}

