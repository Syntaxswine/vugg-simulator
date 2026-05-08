// ============================================================
// js/92c-narrators-halide.ts — VugSimulator._narrate_<mineral> (halide)
// ============================================================
// Per-mineral narrators for halide-class minerals. Mirror of B7's
// supersat-mixin split. Methods attach to VugSimulator.prototype via
// Object.assign so direct calls (this._narrate_calcite(c)) and dynamic
// dispatch (this[`_narrate_${c.mineral}`]) keep working unchanged.
//
// Minerals (1): fluorite.
//
// Phase B16 of PROPOSAL-MODULAR-REFACTOR.

Object.assign(VugSimulator.prototype, {
  _narrate_fluorite(c) {
  // Prose lives in narratives/fluorite.md.
  const parts = [`Fluorite #${c.crystal_id} grew as ${c.habit} crystals to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.zones.length) {
    const colors = new Set();
    for (const z of c.zones) {
      if (z.note && z.note.includes('color zone:')) {
        colors.add(z.note.split('color zone:')[1].trim());
      }
    }
    if (colors.size > 1) {
      parts.push(narrative_variant('fluorite', 'color_zoning_multi', { colors_list: [...colors].join(', ') }) || `Color zoning present: ${[...colors].join(', ')} zones reflecting changing trace element chemistry during growth.`);
    } else if (colors.size === 1) {
      parts.push(narrative_variant('fluorite', 'color_zoning_single', { color: [...colors][0] }) || `Uniformly ${[...colors][0]}.`);
    }
  }
  if (c.twinned) parts.push(narrative_variant('fluorite', 'twinned', { twin_law: c.twin_law }) || `Shows ${c.twin_law} twinning — two interpenetrating cubes.`);
  const fl = c.predict_fluorescence();
  if (fl !== 'non-fluorescent') parts.push(narrative_variant('fluorite', 'fluorescence', { fl }) || `Would show ${fl} under UV excitation.`);
  return parts.filter(p => p).join(' ');
},

  // v64 brief-19 narrator.
  _narrate_atacamite(c) {
    const parts = [`Atacamite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push('Cu₂Cl(OH)₃ — emerald-green Cu²⁺ chromophore on a chloride-hydroxyl backbone. Fired in the arid supergene window where chloride beat carbonate (malachite) and sulfate (brochantite) to the copper. Atacama Desert is the type aesthetic; bronze artifacts at the bottom of the sea make this same crystal because seawater is salty enough.');
    if (c.habit === 'fibrous_acicular') parts.push('Habit shifted to fibrous-acicular under high σ — radiating green needles.');
    else if (c.habit === 'botryoidal_crust') parts.push('Botryoidal mammillary crust — high σ + space-constrained.');
    if (c.dissolved) parts.push('Dissolved by a CO₂ pulse or pH drop — atacamite is the chloride end of a Cu-supergene fork that can revert when the anion balance shifts.');
    return parts.join(' ');
  },

  _narrate_sylvite(c) {
    const parts = [`Sylvite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push('KCl — the late-stage potash that crystallizes from residual brine after halite has consumed most of the sodium and chloride. Even more soluble than its sibling rock-salt; deliquescent in humid air.');
    if (c.habit === 'hopper_cube') parts.push('Hopper-cube habit — rapid evaporation produced stepped, terraced faces.');
    if (c.dissolved) parts.push('Meteoric dilution dissolved it — sylvite is the first phase to go when fresh water reaches the evaporite sequence.');
    return parts.join(' ');
  },
});
