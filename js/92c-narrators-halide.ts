// ============================================================
// js/92c-narrators-halide.ts — VugSimulator._narrate_<mineral> (halide)
// ============================================================
// Per-mineral narrators for halide-class minerals. Mirror of B7's
// supersat-mixin split. Methods attach to VugSimulator.prototype via
// Object.assign so direct calls (this._narrate_calcite(c)) and dynamic
// dispatch (this[`_narrate_${c.mineral}`]) keep working unchanged.
//
// Minerals (3): fluorite, atacamite (v64), sylvite (evaporite),
//               halite (Tier 1 A port).
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

  // Tier 1 A port (post-v69): halite was on the BACKLOG.md L34 list of
  // 5 unported narrators after the Python tree deletion 2026-05-07.
  // Authored fresh from the data/minerals.json description block —
  // canonical pin (per stored memory feedback_narrative_canonical_richer:
  // when JS and Python diverged the richer narrator wins, which here
  // means the JS author gets to set the canon since Python is gone).
  _narrate_halite(c) {
    const parts = [`Halite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push('NaCl — rock salt, the canonical chloride evaporite. Crystallizes from concentrating brine in closed-basin playas, sabkhas, and drained vugs in the supergene zone. The mineral that built the salt mines of Wieliczka and Khewra and carved cathedrals out of itself underground.');

    if (c.habit === 'hopper_growth' || c.habit === 'hopper_cube') {
      parts.push('Hopper-growth habit — high supersaturation produced a skeletal cube with stepped pyramidal hollows on each face. Edge-growth outraced face-growth and left the centers concave, the signature of a brine driven hard enough to nucleate faster than it could fill in. Searles Lake evaporation ponds make these in summer.');
    } else if (c.habit === 'cubic') {
      parts.push('Clean cubic habit — slow evaporation, low supersaturation. The brine concentrated patiently enough for the (100) faces to fill in flat. This is the Wieliczka habit, the cathedral-cube halite that meter-scale specimens come from.');
    } else if (c.habit === 'fibrous_coating') {
      parts.push('Fibrous efflorescent crust — the brine reached the wall already at saturation, so halite nucleated as a fine fibrous coating instead of discrete crystals. Standard on dry-lake margins and concrete walls in coastal cellars.');
    } else if (c.habit === 'stalactitic_speleothem') {
      parts.push('Stalactitic salt speleothem — drip-deposition in a dry underground salt void. As brine dripped from the ceiling and the carrier water flashed off, halite deposited layer by layer into a fibrous columnar "saltcicle." The Sicilian and Iranian salt-glacier caves grow these meters long.');
    }

    // Color zones — pull from c.zones notes (the same plumbing every
    // narrator uses). Halite's diagnostic colors come from radiation
    // damage (Stassfurt blue), halobacteria (Searles pink), and Fe /
    // hematite inclusions (yellow / red).
    const colors = new Set<string>();
    for (const z of (c.zones || [])) {
      if (z.note && z.note.includes('color zone:')) {
        colors.add(z.note.split('color zone:')[1].trim());
      }
    }
    if (colors.has('blue_purple')) {
      parts.push('Blue-to-purple color — Na⁰ F-centers (radiation-trapped electrons in chloride vacancies). The Stassfurt habit. Forms only where the salt bed has been exposed to gamma radiation from nearby potash horizons over geologic time; bleaches in sunlight, which is how museum collectors know to keep these in the dark.');
    }
    if (colors.has('rose_pink') || colors.has('bacterial_pink')) {
      parts.push('Pink color — at Searles Lake and Lake Magadi the halobacterial carotenoids pigment the brine, and the carotenoid layer gets entombed in the precipitating cube. The pink is biological, not crystallographic.');
    }
    if (colors.has('yellow')) {
      parts.push('Yellow tint — trace Fe³⁺ in the lattice, the same chromophore that makes citrine yellow. Common in halite from oxidized red-bed evaporite sequences.');
    }
    if (colors.has('red_hematite_inclusion')) {
      parts.push('Red coloration from hematite inclusions — micron-scale Fe-oxide platelets entrained as the halite grew through an oxidized brine. The "red salt" of the Khewra and Punjab mines.');
    }

    if (c.twinned && (c.twin_law || '').includes('spinel')) {
      parts.push(`Spinel-law twin (${c.twin_law}) — extremely rare for halite. The two cubes interpenetrate on a (111) plane, a habit much more familiar from fluorite and magnetite. A field-grade halite specimen with a verified spinel-law twin is a museum piece.`);
    }

    if (c.dissolved) {
      parts.push('Dissolved. Halite needs almost nothing — a single drop of fresh water at the wall, a humidity excursion, a meteoric pulse — and the crystal goes back into solution. The most soluble common evaporite, and the first phase to disappear when fresh water reaches an exposed salt bed.');
    }

    return parts.filter(p => p).join(' ');
  },
});
