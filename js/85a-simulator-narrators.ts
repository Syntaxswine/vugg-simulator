// ============================================================
// js/85a-simulator-narrators.ts — VugSimulator._narrate_<mineral> methods
// ============================================================
// 95 per-mineral narrators (the prose-generating "what just happened"
// methods) plus the 3 cross-cutting helpers (mixing_event, tectonic,
// collectors_view). Attached to VugSimulator.prototype after the class
// is defined in 85-simulator.ts, so:
//   * `this._narrate_calcite(c)` direct calls keep working
//   * `this[\`_narrate_${c.mineral}\`]` dynamic dispatch (in narrate())
//     keeps working
//
// Sorts after 85-simulator.ts so the class exists when we attach.
//
// Phase B13 of PROPOSAL-MODULAR-REFACTOR.

Object.assign(VugSimulator.prototype, {
  _narrate_calcite(c) {
  // Prose lives in narratives/calcite.md.
  const parts = [];
  if (c.zones.length) {
    const mn_zones = c.zones.filter(z => z.trace_Mn > 1.0 && z.trace_Fe < 2.0);
    const fe_zones = c.zones.filter(z => z.trace_Fe > 3.0);
    if (mn_zones.length && fe_zones.length) {
      const mn_end = mn_zones[mn_zones.length - 1].step;
      const fe_start = fe_zones[0].step;
      if (fe_start > mn_end - 5) {
        parts.push(narrative_variant('calcite', 'mn_fe_quench', { fe_start }) || `Early growth zones are manganese-rich and would fluoresce orange under UV light. After step ${fe_start}, iron flooded the system and quenched the fluorescence — later zones would appear dark under cathodoluminescence. The boundary between glowing and dark records the moment the fluid chemistry changed.`);
      }
    } else if (mn_zones.length) {
      parts.push(narrative_variant('calcite', 'mn_only') || `The crystal incorporated manganese throughout growth and would fluoresce orange under shortwave UV — a classic Mn²⁺-activated calcite.`);
    }
  }
  if (c.twinned) {
    parts.push(narrative_variant('calcite', 'twinned', { twin_law: c.twin_law }) || `The crystal is twinned on ${c.twin_law}, a common deformation twin in calcite that can form during growth or post-crystallization stress.`);
  }
  const size_desc = c.c_length_mm < 0.5 ? 'microscopic' : c.c_length_mm < 2 ? 'small' : 'well-developed';
  parts.push(narrative_variant('calcite', 'final_size', { size_desc, mm: c.c_length_mm.toFixed(1), habit: c.habit }) || `Final size: ${size_desc} (${c.c_length_mm.toFixed(1)} mm), ${c.habit} habit.`);
  return parts.filter(p => p).join(' ');
},

  _narrate_aragonite(c) {
  // Prose lives in narratives/aragonite.md.
  const parts = [`Aragonite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('aragonite') || "CaCO₃ — same composition as calcite, different crystal structure. The orthorhombic polymorph that exists by kinetic favor, not thermodynamic stability: at vug T/P, calcite is the ground-state phase. Folk 1974 / Morse 1997 — Mg/Ca ratio is the dominant control on which polymorph nucleates.");
  if (c.habit === 'acicular_needle') {
    parts.push(narrative_variant('aragonite', 'acicular_needle') || 'Acicular needles — the high-supersaturation form. Long thin prisms radiating from a common nucleation point, often forming sprays that look like frozen explosions in cabinet specimens.');
  } else if (c.habit === 'twinned_cyclic') {
    parts.push(narrative_variant('aragonite', 'twinned_cyclic') || 'Cyclic twin on {110} — three crystals interpenetrating at 120° to produce a pseudo-hexagonal six-pointed prism. This is the diagnostic aragonite habit, easily mistaken for a true hexagonal mineral until the re-entrant angles between the twin lobes give it away.');
  } else if (c.habit === 'flos_ferri') {
    parts.push(narrative_variant('aragonite', 'flos_ferri') || "'Flos ferri' — the iron flower variety. Fe-rich aragonite forms delicate dendritic / coral-like white branches, named for the famous Eisenerz, Austria specimens.");
  } else {
    parts.push(narrative_variant('aragonite', 'columnar_prisms') || 'Columnar prisms — the default low-σ habit. Transparent to white blades easily confused with calcite at first glance, until the chemistry (Mg/Ca, Sr/Pb signatures, lack of perfect rhombohedral cleavage) gives it away.');
  }
  if (c.dissolved) {
    const note = c.zones.length ? c.zones[c.zones.length - 1].note : '';
    if (note && note.includes('polymorphic conversion')) {
      parts.push(narrative_variant('aragonite', 'polymorphic_conversion') || 'The crystal underwent polymorphic conversion to calcite — the thermodynamic sink. Aragonite metastability has limits: above 100°C with water present, the structure inverts on geologic-short timescales (Bischoff & Fyfe 1968, half-life ~10³ yr at 80°C). What remains is a calcite pseudomorph after aragonite, preserving the original orthorhombic outline filled with trigonal cleavage.');
    } else {
      parts.push(narrative_variant('aragonite', 'acid_dissolution') || "Acid attack dissolved the crystal — aragonite shares calcite's vulnerability below pH 5.5. Ca²⁺ + CO₃²⁻ returned to the fluid.");
    }
  } else {
    parts.push(narrative_variant('aragonite', 'preserved') || 'The crystal is preserved at vug-scale geologic moment. In nature, aragonite from cold marine settings can survive millions of years; from hot springs it converts to calcite in centuries to millennia.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_dolomite(c) {
  // Prose lives in narratives/dolomite.md. Code keeps the
  // cycle_count → f_ord computation and threshold dispatch (Kim 2023
  // ordering tiers); markdown owns the words. Inline fallbacks for offline.
  const parts = [`Dolomite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  const cycle_count = this.conditions._dol_cycle_count;
  const f_ord = cycle_count > 0 ? 1.0 - Math.exp(-cycle_count / 7.0) : 0.0;
  parts.push(narrative_blurb('dolomite') || "CaMg(CO₃)₂ — the ordered double carbonate, with Ca and Mg in alternating cation layers (R3̄ space group, distinct from calcite's R3̄c). The host rock of MVT deposits and a major sedimentary carbonate. The 'dolomite problem' — that modern surface oceans should but don't precipitate it — was partly resolved by Kim, Sun et al. (2023, Science 382:915) who showed that periodic dissolution-precipitation cycles strip disordered Ca/Mg surface layers and ratchet ordering up over many cycles.");
  if (cycle_count > 0) {
    const ctx = { cycle_count, f_ord: f_ord.toFixed(2) };
    let variant, fallback;
    if (f_ord > 0.7) { variant = 'kim_ordered'; fallback = `The vug fluid cycled across dolomite saturation ${cycle_count} times during this crystal's growth (f_ord=${f_ord.toFixed(2)}). Each cycle stripped the disordered surface layer that steady precipitation would otherwise lock in, leaving an ordered Ca/Mg template for the next growth pulse. The result is true ordered dolomite, not a Mg-calcite intermediate.`; }
    else if (f_ord > 0.3) { variant = 'kim_partial'; fallback = `The vug fluid cycled ${cycle_count} times across saturation (f_ord=${f_ord.toFixed(2)}) — partially ordered. Some growth zones are well-ordered dolomite, others disordered HMC; X-ray diffraction would show a smeared peak rather than the sharp dolomite signature.`; }
    else { variant = 'kim_disordered'; fallback = `Only ${cycle_count} saturation cycle(s) (f_ord=${f_ord.toFixed(2)}) — most of this crystal is disordered high-Mg calcite, not true ordered dolomite. With more cycles it would have ratcheted up; the system sealed too quickly.`; }
    parts.push(narrative_variant('dolomite', variant, ctx) || fallback);
  } else {
    parts.push(narrative_variant('dolomite', 'no_cycling') || "No saturation cycles occurred — this is steady-state growth, which Kim 2023 predicts will be disordered Mg-calcite rather than true ordered dolomite. In nature the ratio of true dolomite to disordered HMC depends on how oscillatory the fluid history was.");
  }
  if (c.habit === 'saddle_rhomb') {
    parts.push(narrative_variant('dolomite', 'saddle_rhomb') || "Saddle-shaped curved rhombohedra — the most extreme example of the calcite-group curved-face signature. Each {104} face bows so sharply that the crystal looks twisted, which it isn't — it's the lattice strain from cation ordering expressed in surface geometry.");
  } else if (c.habit === 'coarse_rhomb') {
    parts.push(narrative_variant('dolomite', 'coarse_rhomb') || 'Coarse textbook rhombohedra — the slow-growth high-T form. Transparent to white, the crystal looks like calcite at first glance until you check the cleavage and density.');
  } else {
    parts.push(narrative_variant('dolomite', 'massive_granular') || 'Massive granular aggregate — the rock-forming form. White to gray sugary texture, no individual crystal faces visible.');
  }
  if (c.position && c.position.includes('calcite')) {
    parts.push(narrative_variant('dolomite', 'on_calcite') || `Growing on calcite — classic dolomitization texture, the Mg-bearing fluid converting earlier calcite to dolomite as the system evolves.`);
  }
  if (c.dissolved) {
    parts.push(narrative_variant('dolomite', 'dissolved') || 'Acid attack dissolved the crystal — dolomite is somewhat more acid-resistant than calcite (the Mg slows the reaction), but pH < 6 still releases Ca²⁺ + Mg²⁺ + 2 CO₃²⁻.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_siderite(c) {
  // Prose lives in narratives/siderite.md.
  const parts = [`Siderite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('siderite') || "FeCO₃ — the iron carbonate, a calcite-group mineral (R3̄c) with Fe²⁺ in the Ca site. Tan to deep brown, depending on Fe content and trace substitution. Forms only in REDUCING conditions because Fe²⁺ must stay reduced to be soluble; the moment O₂ rises above ~0.5, siderite begins converting to goethite/limonite.");
  if (c.habit === 'rhombohedral') {
    parts.push(narrative_variant('siderite', 'rhombohedral') || "Curved 'saddle' rhombohedra — the diagnostic siderite habit. The {104} faces aren't flat; they bow outward into a saddle shape, parallel to the curved-rhomb signature shared with rhodochrosite and dolomite.");
  } else if (c.habit === 'scalenohedral') {
    parts.push(narrative_variant('siderite', 'scalenohedral') || "Sharp scalenohedral 'dog-tooth' crystals — the high-σ habit. Less common than the rhombohedral form; sharp brown crystals that resemble brown calcite at distance.");
  } else if (c.habit === 'botryoidal') {
    parts.push(narrative_variant('siderite', 'botryoidal') || 'Botryoidal mammillary crusts — the colloidal habit, formed when supersaturation outruns ordered crystal growth. Tan-brown rounded aggregates, often coating fracture walls.');
  } else {
    parts.push(narrative_variant('siderite', 'spherulitic_concretion') || "Spherulitic concretions — sedimentary 'spherosiderite,' the concretionary habit found in coal seams and Fe-rich shales. Each sphere is a radial fibrous internal structure capped by a thin smooth surface.");
  }
  if (c.dissolved) {
    const note = c.zones.length ? c.zones[c.zones.length - 1].note : '';
    if (note && note.includes('oxidative breakdown')) {
      parts.push(narrative_variant('siderite', 'oxidative_breakdown') || "Oxidative breakdown destroyed the crystal — the textbook diagenetic story. Rising O₂ pushed Fe²⁺ → Fe³⁺, which is insoluble as carbonate; the lattice collapsed and Fe + CO₃ moved on to grow goethite/limonite elsewhere. In nature this is the mechanism behind the 'limonite cube after siderite' diagenetic pseudomorphs.");
    } else {
      parts.push(narrative_variant('siderite', 'acid_dissolution') || 'Acid attack dissolved the crystal — like all calcite-group carbonates, siderite fizzes in HCl. Fe²⁺ + CO₃²⁻ released.');
    }
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_rhodochrosite(c) {
  // Prose lives in narratives/rhodochrosite.md.
  const parts = [`Rhodochrosite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('rhodochrosite') || "MnCO₃ — the rosy manganese carbonate, structurally identical to calcite (R3̄c) but with Mn²⁺ replacing Ca²⁺. The pink-to-raspberry color is intrinsic to the Mn²⁺ chromophore, not a trace activator. Forms in epithermal Mn-bearing veins (Capillitas, Sweet Home), metamorphosed Mn sediments (N'Chwaning), and low-T carbonate replacement zones.");
  if (c.habit === 'rhombohedral') {
    parts.push(narrative_variant('rhodochrosite', 'rhombohedral') || "Curved 'button' rhombohedra — the diagnostic rhodochrosite habit. The {104} faces aren't quite flat; they bow outward, giving each crystal a domed, button-like profile that's hard to mistake for anything else.");
  } else if (c.habit === 'scalenohedral') {
    parts.push(narrative_variant('rhodochrosite', 'scalenohedral') || "Sharp scalenohedral 'dog-tooth' crystals — the high-σ habit. Deep-rose to raspberry-red where Mn is dominant. Visually similar to scalenohedral calcite at distance, but the color settles the identification.");
  } else if (c.habit === 'stalactitic') {
    parts.push(narrative_variant('rhodochrosite', 'stalactitic') || 'Stalactitic / mammillary aggregates — the famous Capillitas, Argentina habit. Concentric rose-pink banding when sliced; reflects rhythmic drip-water deposition over geologically short intervals.');
  } else {
    parts.push(narrative_variant('rhodochrosite', 'rhythmic_banding') || 'Rhythmic Mn/Ca banding — the agate-like layered cross-section. Each band records a slight shift in the Mn:Ca ratio of the incoming fluid, captured in the kutnohorite (CaMn carbonate) solid-solution series between rhodochrosite and calcite.');
  }
  if (c.position && (c.position.includes('sphalerite') || c.position.includes('pyrite') || c.position.includes('galena'))) {
    parts.push(narrative_variant('rhodochrosite', 'on_sulfide', { position: c.position }) || `Growing on ${c.position} — classic epithermal vein paragenesis: the carbonate fills space between earlier sulfides as the system cools, Mn-bearing fluids replacing or coating the sulfide phases.`);
  }
  if (c.dissolved) {
    const note = c.zones.length ? c.zones[c.zones.length - 1].note : '';
    if (note && note.includes('oxidative breakdown')) {
      parts.push(narrative_variant('rhodochrosite', 'oxidative_breakdown') || 'Oxidative breakdown destroyed the crystal — Mn²⁺ is unstable above O₂ ~1.0; it flips to Mn³⁺/Mn⁴⁺ and the surface converts to a black manganese-oxide rind (pyrolusite, psilomelane). The rosy crystal goes black from the outside in. This is why rhodochrosite specimens require careful storage.');
    } else {
      parts.push(narrative_variant('rhodochrosite', 'acid_dissolution') || 'Acid attack dissolved the crystal — like calcite, rhodochrosite fizzes in HCl, releasing Mn²⁺ and CO₃²⁻.');
    }
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_quartz(c) {
  // Prose lives in narratives/quartz.md. JS dispatches a subset of the
  // Python branches — radiation_damage variants are Python-only because
  // JS tracks radiation at the crystal level rather than zones.
  if (!c.zones.length) return narrative_variant('quartz', 'failed_to_develop', { crystal_id: c.crystal_id, nucleation_temp: c.nucleation_temp.toFixed(0) }) || `Quartz #${c.crystal_id} nucleated but failed to develop — growth kinetics were too slow at ${c.nucleation_temp.toFixed(0)}°C.`;
  const parts = [];
  const ti_vals = c.zones.filter(z => z.trace_Ti > 0).map(z => z.trace_Ti);
  if (ti_vals.length && Math.max(...ti_vals) > 0.01) {
    parts.push(narrative_variant('quartz', 'titanium_zoning', { max_ti: Math.max(...ti_vals).toFixed(3), min_ti: Math.min(...ti_vals).toFixed(3) }) || `Titanium incorporation decreases through the growth zones from ${Math.max(...ti_vals).toFixed(3)} to ${Math.min(...ti_vals).toFixed(3)} ppm.`);
  }
  const fi_zones = c.zones.filter(z => z.fluid_inclusion);
  if (fi_zones.length) {
    const fi_types = [...new Set(fi_zones.map(z => z.inclusion_type))];
    parts.push(narrative_variant('quartz', 'fluid_inclusions', { count: fi_zones.length, types: fi_types.join(', ') }) || `The crystal trapped ${fi_zones.length} fluid inclusions (${fi_types.join(', ')}).`);
  }
  if (c.twinned) {
    parts.push(narrative_variant('quartz', 'twinned', { twin_law: c.twin_law }) || `A ${c.twin_law} twin formed during growth.`);
  }
  const fast_zones = c.zones.filter(z => z.growth_rate > 15);
  const slow_zones = c.zones.filter(z => z.growth_rate > 0 && z.growth_rate < 2);
  if (fast_zones.length && slow_zones.length) {
    parts.push(narrative_variant('quartz', 'growth_oscillation', { max_rate: Math.max(...fast_zones.map(z => z.growth_rate)).toFixed(0) }) || 'Growth alternated between rapid pulses and slow, high-quality periods near equilibrium.');
  }
  const size_desc = c.c_length_mm < 0.5 ? 'microscopic' : c.c_length_mm < 5 ? 'thumbnail' : 'cabinet-sized';
  parts.push(narrative_variant('quartz', 'final_size', { size_desc, mm: c.c_length_mm.toFixed(1), a_width_mm: c.a_width_mm.toFixed(1) }) || `Final size: ${size_desc} (${c.c_length_mm.toFixed(1)} × ${c.a_width_mm.toFixed(1)} mm).`);
  return parts.filter(p => p).join(' ');
},

  _narrate_sphalerite(c) {
  // Prose lives in narratives/sphalerite.md. Code keeps the
  // Fe-zoning analysis (early/late thirds, ratio threshold) and
  // picks the matching named variant. Inline fallbacks preserve
  // offline/file:// boot.
  const parts = [`Sphalerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.zones.length) {
    const fe_vals = c.zones.filter(z => z.trace_Fe > 0).map(z => z.trace_Fe);
    if (fe_vals.length) {
      const max_fe = Math.max(...fe_vals), min_fe = Math.min(...fe_vals);
      if (max_fe > min_fe * 1.5) {
        const third = Math.max(Math.floor(c.zones.length / 3), 1);
        const early_fe = c.zones.slice(0, third).reduce((s, z) => s + z.trace_Fe, 0) / third;
        const late_fe = c.zones.slice(-third).reduce((s, z) => s + z.trace_Fe, 0) / third;
        const variant = (early_fe < late_fe) ? 'fe_zoning_increasing' : 'fe_zoning_decreasing';
        const fallback = (early_fe < late_fe)
          ? `Iron content increased through growth — early zones are pale (low Fe, cleiophane variety) grading to darker amber or brown as the fluid became more iron-rich. This color zoning would be visible in a polished cross-section.`
          : `Iron content decreased through growth — the crystal darkened early (higher Fe, approaching marmatite) then cleared as iron was depleted from the fluid.`;
        parts.push(narrative_variant('sphalerite', variant) || fallback);
      }
    }
  }
  if (c.twinned) {
    const v = narrative_variant('sphalerite', 'twinned', { twin_law: c.twin_law });
    parts.push(v || `Twinned on the ${c.twin_law} — a common growth twin in sphalerite that creates triangular re-entrant faces.`);
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_wurtzite(c) {
  // Prose lives in narratives/wurtzite.md.
  const parts = [`Wurtzite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.habit === 'hemimorphic_crystal') parts.push(narrative_variant('wurtzite', 'hemimorphic_crystal') || 'Hemimorphic hexagonal pyramid.');
  else if (c.habit === 'radiating_columnar') parts.push(narrative_variant('wurtzite', 'radiating_columnar') || 'Radiating hexagonal columns.');
  else if (c.habit === 'fibrous_coating') parts.push(narrative_variant('wurtzite', 'fibrous_coating') || "Fibrous crust on the wall.");
  else parts.push(narrative_variant('wurtzite', 'tabular_default') || 'Tabular {0001} plates.');
  if (c.zones && c.zones.length) {
    const fe_vals = c.zones.filter(z => z.trace_Fe > 0).map(z => z.trace_Fe);
    if (fe_vals.length) {
      const max_fe_pct = Math.max(...fe_vals) / 10.0;
      if (max_fe_pct > 10) {
        parts.push(narrative_variant('wurtzite', 'fe_content', { fe_pct: max_fe_pct.toFixed(0) }) || `Fe content up to ${max_fe_pct.toFixed(0)} mol%.`);
      }
    }
  }
  if (c.twinned) parts.push(narrative_variant('wurtzite', 'twinned', { twin_law: c.twin_law }) || `Shows the ${c.twin_law} twin.`);
  if (c.dissolved) parts.push(narrative_variant('wurtzite', 'polymorphic_inversion') || 'Polymorphic inversion destroyed the crystal.');
  else parts.push(narrative_variant('wurtzite', 'kept_hexagonal') || 'Kept hexagonal as long as fluid stayed above 95°C.');
  return parts.filter(p => p).join(' ');
},

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

  _narrate_pyrite(c) {
  // Prose lives in narratives/pyrite.md.
  const parts = [`Pyrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.habit === 'framboidal') {
    parts.push(narrative_variant('pyrite', 'framboidal') || 'The low temperature produced framboidal pyrite — microscopic raspberry-shaped aggregates of tiny crystallites, a texture common in sedimentary environments.');
  } else if (c.habit === 'pyritohedral') {
    parts.push(narrative_variant('pyrite', 'pyritohedral') || 'The crystal developed the characteristic pyritohedral habit — twelve pentagonal faces, a form unique to pyrite and one of nature\'s few non-crystallographic symmetries.');
  } else if (c.habit.includes('cubic')) {
    parts.push(narrative_variant('pyrite', 'cubic') || 'Clean cubic habit with bright metallic luster. The striations on each cube face (perpendicular on adjacent faces) are the fingerprint of pyrite\'s lower symmetry disguised as cubic.');
  }
  if (c.twinned) {
    parts.push(narrative_variant('pyrite', 'twinned', { twin_law: c.twin_law }) || `Twinned as an ${c.twin_law} — two crystals interpenetrating at 90°, one of the most recognizable twin forms in mineralogy.`);
  }
  if (c.dissolved) {
    parts.push(narrative_variant('pyrite', 'acid_oxidation') || 'Late-stage oxidation attacked the pyrite — in nature this would produce a limonite/goethite boxwork pseudomorph, the rusty ghost of the original crystal.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_marcasite(c) {
  // Prose lives in narratives/marcasite.md.
  const parts = [`Marcasite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.habit === 'cockscomb') {
    parts.push(narrative_variant('marcasite', 'cockscomb') || "The crystal developed the classic cockscomb habit — aggregated tabular plates on {010}, edges ridged like a rooster's comb. This shape is the diagnostic fingerprint: pyrite never crests like this.");
  } else if (c.habit === 'spearhead') {
    parts.push(narrative_variant('marcasite', 'spearhead') || 'Spearhead twins — paired tabular crystals tapered to pyramidal tips. The {101} twin law produces a swallowtail shape unique to marcasite.');
  } else if (c.habit === 'radiating_blade') {
    parts.push(narrative_variant('marcasite', 'radiating_blade') || 'Radiating blades sprayed outward from a common center — low-temperature, high-supersaturation growth in acid fluids, the same style that gives sedimentary marcasite nodules their stellate fracture patterns.');
  } else {
    parts.push(narrative_variant('marcasite', 'tabular_plates') || 'Flat tabular {010} plates — the slow-growth marcasite form, pale brass already starting to iridesce as surface sulfur oxidizes.');
  }
  if (c.twinned) {
    parts.push(narrative_variant('marcasite', 'twinned', { twin_law: c.twin_law }) || `Shows the ${c.twin_law} swallowtail twin, diagnostic of marcasite and absent from its cubic cousin pyrite.`);
  }
  if (c.dissolved) {
    parts.push(narrative_variant('marcasite', 'dissolved_inversion') || 'Metastable inversion or oxidative breakdown destroyed the crystal — marcasite is the unstable FeS₂ dimorph. Over geologic time it converts to pyrite; on museum shelves it rots to sulfuric acid and iron sulfate.');
  } else {
    parts.push(narrative_variant('marcasite', 'kept_orthorhombic') || 'The pH/T regime kept it in the orthorhombic field; given geologic time or a temperature excursion above 240°C, this crystal would invert to pyrite.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_chalcopyrite(c) {
  // Prose lives in narratives/chalcopyrite.md — code keeps the
  // conditional dispatch (which variants apply); markdown owns the
  // words. Fallback strings preserve the inline content when the
  // markdown fetch hasn't completed (rare; mostly file:// boot).
  const parts = [`Chalcopyrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  const blurb = narrative_blurb('chalcopyrite');
  parts.push(blurb || 'Brassy yellow with a greenish tint — distinguishable from pyrite by its deeper color and softer hardness (3.5 vs 6). The disphenoidal crystals often look tetrahedral, a common misidentification.');
  if (c.twinned) {
    const v = narrative_variant('chalcopyrite', 'twinned', { twin_law: c.twin_law });
    parts.push(v || `Shows ${c.twin_law} twinning — repeated twins create spinel-like star shapes.`);
  }
  if (c.dissolved) {
    const v = narrative_variant('chalcopyrite', 'dissolved', {});
    parts.push(v || 'Oxidation began converting the chalcopyrite — at the surface, this weathering produces malachite (green) and azurite (blue), the colorful signal that led ancient prospectors to copper deposits.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_hematite(c) {
  // Prose lives in narratives/hematite.md.
  const parts = [`Hematite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.habit === 'specular') {
    parts.push(narrative_variant('hematite', 'specular') || 'The high temperature produced specular hematite — brilliant metallic plates that flash like mirrors. The thin {001} basal plates grew parallel, creating the characteristic iron rose texture.');
    if (c.zones && c.zones.some(z => z.note && z.note.includes('iridescent'))) {
      parts.push(narrative_variant('hematite', 'specular_iridescent') || 'Some plates are thin enough to show iridescent interference colors — rainbow hematite, a collector favorite.');
    }
  } else if (c.habit === 'rhombohedral') {
    parts.push(narrative_variant('hematite', 'rhombohedral') || 'Moderate temperatures produced rhombohedral hematite — sharp-edged crystals with {101} faces, dark metallic gray with a red streak.');
  } else if (c.habit === 'botryoidal') {
    parts.push(narrative_variant('hematite', 'botryoidal') || 'Low-temperature growth produced botryoidal hematite — kidney-ore texture with smooth, rounded surfaces. Classic kidney iron ore mined since antiquity.');
  } else if (c.habit === 'earthy/massive') {
    parts.push(narrative_variant('hematite', 'earthy_massive') || 'Low supersaturation produced earthy, massive hematite — red microcrystalline aggregate. The red ochre pigment humans have used for 100,000 years.');
  }
  if (c.twinned) parts.push(narrative_variant('hematite', 'twinned', { twin_law: c.twin_law }) || `Shows a rare ${c.twin_law}.`);
  if (c.dissolved) parts.push(narrative_variant('hematite', 'acid_dissolution') || 'Late-stage acid attack dissolved some of the hematite, releasing iron back to the fluid.');
  return parts.filter(p => p).join(' ');
},

  _narrate_malachite(c) {
  // Prose lives in narratives/malachite.md.
  const parts = [`Malachite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.position.includes('chalcopyrite')) {
    parts.push(narrative_variant('malachite', 'on_chalcopyrite') || 'It nucleated directly on chalcopyrite — the classic oxidation paragenesis. As oxygenated water attacked the copper sulfide, Cu²⁺ combined with carbonate to form malachite. This is the green stain that led ancient prospectors to copper deposits.');
  }
  if (c.habit === 'banded') {
    parts.push(narrative_variant('malachite', 'banded') || 'The crystal developed the famous banded texture — concentric layers of alternating light and dark green, prized in decorative stonework since the Bronze Age.');
  } else if (c.habit === 'botryoidal') {
    parts.push(narrative_variant('malachite', 'botryoidal') || 'Botryoidal habit — smooth, rounded green masses. Cross-sections would reveal concentric banding.');
  } else if (c.habit === 'fibrous/acicular') {
    parts.push(narrative_variant('malachite', 'fibrous_acicular') || 'Rapid growth produced fibrous, acicular malachite — sprays of needle-like green crystals radiating from nucleation points.');
  }
  if (c.dissolved) parts.push(narrative_variant('malachite', 'acid_dissolution') || 'Acid attack dissolved some malachite — it fizzes in acid like calcite, releasing Cu²⁺ and CO₂.');
  const color = c.predict_color ? c.predict_color() : '';
  if (color) parts.push(narrative_variant('malachite', 'color', { color }) || `Color: ${color}.`);
  return parts.filter(p => p).join(' ');
},

  _narrate_smithsonite(c) {
  // Prose lives in narratives/smithsonite.md.
  const parts = [`Smithsonite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('smithsonite'));
  if (c.position.includes('sphalerite')) {
    const oxidized = c.position.includes('oxidized');
    if (oxidized) {
      parts.push(narrative_variant('smithsonite', 'on_sphalerite_oxidized') || 'It nucleated directly on oxidized sphalerite — the classic supergene paragenesis. As oxygenated groundwater destroyed the zinc sulfide, liberated Zn²⁺ combined with carbonate to precipitate smithsonite. The grape-like clusters grew from the corpse of the sphalerite that donated its zinc.');
    } else {
      parts.push(narrative_variant('smithsonite', 'on_sphalerite_fresh') || 'It nucleated on sphalerite, the zinc source mineral. Smithsonite is the oxidized alter ego of sphalerite — same zinc, different anion, different world.');
    }
  }
  if (c.habit === 'botryoidal' || c.habit === 'botryoidal/stalactitic') {
    parts.push(narrative_variant('smithsonite', 'botryoidal') || 'Botryoidal habit — grape-like clusters of rounded, bubbly masses. Cross-sections reveal concentric growth banding like tiny onions.');
  } else if (c.habit === 'rhombohedral') {
    parts.push(narrative_variant('smithsonite', 'rhombohedral') || 'Rhombohedral crystals with curved, pearly faces — the "dry bone" ore that frustrated miners who mistook it for calcite.');
  }
  const lastZone = c.zones.length ? c.zones[c.zones.length - 1] : null;
  if (lastZone && lastZone.note) {
    if (lastZone.note.includes('apple-green')) parts.push(narrative_variant('smithsonite', 'color_apple_green') || 'Copper impurities give it an apple-green color — smithsonite is a chameleon, its color entirely dependent on trace chemistry.');
    else if (lastZone.note.includes('pink')) parts.push(narrative_variant('smithsonite', 'color_pink') || 'Manganese impurities lend a rare pink color — among the most prized smithsonite varieties.');
    else if (lastZone.note.includes('blue-green')) parts.push(narrative_variant('smithsonite', 'color_blue_green') || 'A blue-green translucence that collectors prize — the kelly green of Tsumeb, the turquoise of Lavrion.');
  }
  if (c.dissolved) parts.push(narrative_variant('smithsonite', 'acid_dissolution') || 'Acid attack dissolved some of the smithsonite — it fizzes in hydrochloric acid, a quick field test to distinguish it from prehnite or hemimorphite.');
  return parts.filter(p => p).join(' ');
},

  _narrate_wulfenite(c) {
  // Prose lives in narratives/wulfenite.md. JS canonical for poetic
  // framings; gains acid_dissolution dispatch (Python had it).
  // Standardized opening to mm-pattern; the "collector's prize" line
  // is folded into the merged blurb.
  const parts = [`Wulfenite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('wulfenite'));
  if (c.position.includes('galena')) {
    const oxidized = c.position.includes('oxidized');
    if (oxidized) {
      parts.push(narrative_variant('wulfenite', 'on_oxidized_galena') || 'It nucleated on the ghosts of two sulfides — oxidized galena (Pb²⁺) and oxidized molybdenite (MoO₄²⁻). Lead molybdate born from the death of both parents.');
    } else {
      parts.push(narrative_variant('wulfenite', 'on_galena') || 'It grew on galena, drawing lead from the same source mineral. A secondary generation claiming the primary mineral as its substrate.');
    }
  }
  const lastZone = c.zones.length ? c.zones[c.zones.length - 1] : null;
  if (lastZone && lastZone.note) {
    if (lastZone.note.includes('honey')) parts.push(narrative_variant('wulfenite', 'color_honey') || 'Honey-orange and translucent — light passes through the plates like stained glass.');
    else if (lastZone.note.includes('red')) parts.push(narrative_variant('wulfenite', 'color_red_cloud') || 'Red-orange from chromium traces — the sought-after "Red Cloud" variety.');
  }
  if (c.twinned) {
    parts.push(narrative_variant('wulfenite', 'twinned', { twin_law: c.twin_law }) || `Penetration twinned (${c.twin_law}) — two plates interpenetrating at right angles, forming a cross or butterfly shape.`);
  }
  if (c.dissolved) parts.push(narrative_variant('wulfenite', 'acid_dissolution'));
  return parts.filter(p => p).join(' ');
},

  _narrate_feldspar(c) {
  // Prose lives in narratives/feldspar.md (boss-pushed 2026-04-30 commit
  // 34ed3e8). JS canonical, polymorph storytelling, per-twin-law prose.
  const polymorph = c.mineral_display || 'feldspar';
  const parts = [];
  parts.push(narrative_blurb('feldspar', { polymorph: capitalize(polymorph), crystal_id: c.crystal_id }));
  if (polymorph === 'sanidine') parts.push(narrative_variant('feldspar', 'sanidine'));
  else if (polymorph === 'orthoclase') parts.push(narrative_variant('feldspar', 'orthoclase'));
  else if (polymorph === 'microcline') parts.push(narrative_variant('feldspar', 'microcline'));
  else if (polymorph === 'adularia') parts.push(narrative_variant('feldspar', 'adularia'));
  if (c.zones.some(z => z.note && z.note.includes('amazonite'))) parts.push(narrative_variant('feldspar', 'amazonite'));
  if (c.zones.some(z => z.note && z.note.includes('perthite'))) parts.push(narrative_variant('feldspar', 'perthite'));
  if (c.twinned) {
    const tl = c.twin_law || '';
    if (tl.includes('Carlsbad')) parts.push(narrative_variant('feldspar', 'carlsbad_twin'));
    else if (tl.includes('Baveno')) parts.push(narrative_variant('feldspar', 'baveno_twin'));
    else if (tl.includes('cross-hatched')) parts.push(narrative_variant('feldspar', 'cross_hatch_twin'));
    else if (tl.includes('albite')) parts.push(narrative_variant('feldspar', 'albite_twin'));
    else parts.push(narrative_variant('feldspar', 'generic_twin', { twin_law: tl }));
  }
  if (c.dissolved) parts.push(narrative_variant('feldspar', 'dissolved'));
  parts.push(narrative_closing('feldspar'));
  return parts.filter(p => p).join(' ');
},

  _narrate_albite(c) {
  // Prose lives in narratives/albite.md.
  const parts = [`Albite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('albite') || "NaAlSi₃O₈ — sodium end-member of the plagioclase series. At T < 450°C, albite orders to 'low-albite' (fully ordered Al/Si). Platy cleavelandite habit is the pegmatite signature.");
  const peristerite = c.zones.some(z => (z.note || '').includes('peristerite'));
  if (peristerite) parts.push(narrative_variant('albite', 'peristerite') || 'Ca²⁺ intergrowth produced peristerite — fine albite/oligoclase exsolution lamellae that scatter light into blue-white adularescence. The moonstone shimmer.');
  if (c.habit && c.habit.includes('cleavelandite')) parts.push(narrative_variant('albite', 'cleavelandite') || 'Cleavelandite habit — platy, lamellar blades curved like book-pages, the low-T hydrothermal signature.');
  if (c.twinned) parts.push(narrative_variant('albite', 'twinned', { twin_law: c.twin_law }) || `Twinned on the ${c.twin_law} — polysynthetic albite twinning creates the characteristic striped appearance of plagioclase in thin section.`);
  if (c.dissolved) parts.push(narrative_variant('albite', 'dissolved') || 'Acid released Na⁺, Al³⁺, and SiO₂ — albite is slightly more resistant than K-feldspar but still weathers to kaolinite under persistent acid attack.');
  return parts.filter(p => p).join(' ');
},

  _narrate_topaz(c) {
  // Prose lives in narratives/topaz.md.
  const parts = [`Topaz #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('topaz') || 'Al₂SiO₄(F,OH)₂ — orthorhombic, prismatic with steep pyramidal terminations.');

  const imperial_pink = c.zones.some(z => (z.note || '').includes('pink imperial'));
  const imperial_gold = c.zones.some(z => (z.note || '').includes('imperial golden-orange'));
  const pale_blue = c.zones.some(z => (z.note || '').includes('pale blue'));
  const pale_yellow = c.zones.some(z => (z.note || '').includes('pale yellow'));

  if (imperial_pink) {
    parts.push(narrative_variant('topaz', 'pink_imperial') || "Pink imperial — the rarest topaz coloration.");
  } else if (imperial_gold) {
    parts.push(narrative_variant('topaz', 'imperial_gold') || 'Imperial golden-orange — Cr³⁺ substituting for Al³⁺ in the topaz structure. The chromium came not from the main fluid but from nearby ultramafic country rock dissolving in trace. This is the signature of Ouro Preto / Capão do Lana — the only place on Earth where it\u2019s a commercial color.');
  } else if (pale_blue) {
    parts.push(narrative_variant('topaz', 'pale_blue') || 'Pale blue, F-rich and Cr-starved. In nature this coloration is often enhanced by subsequent radiation exposure — the sky-blue topaz flooded onto the market after Iapetos-age pegmatites started being deliberately irradiated.');
  } else if (pale_yellow) {
    parts.push(narrative_variant('topaz', 'pale_yellow') || "Pale yellow from Fe³⁺ in the Al site — the common 'imperial' knockoff. Without the Cr chromophore, this color is merely pretty, not legendary.");
  } else {
    parts.push(narrative_variant('topaz', 'colorless_default') || 'Colorless — the default for topaz grown in a Cr-poor, Fe-poor fluid.');
  }

  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    const geothermometer = inclusion_zones.some(z => (z.inclusion_type || '').includes('geothermometer'));
    if (geothermometer) {
      const avg_T = inclusion_zones.reduce((s, z) => s + z.temperature, 0) / inclusion_zones.length;
      parts.push(narrative_variant('topaz', 'fluid_inclusions_geothermometer', { count: inclusion_zones.length, avg_T: avg_T.toFixed(0) }) || `${inclusion_zones.length} fluid inclusion horizons at ~${avg_T.toFixed(0)}°C.`);
    } else {
      parts.push(narrative_variant('topaz', 'fluid_inclusions', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons preserved.`);
    }
  }

  const avg_Ti = c.zones.reduce((s, z) => s + (z.trace_Ti || 0), 0) / Math.max(c.zones.length, 1);
  if (avg_Ti > 0.05) {
    parts.push(narrative_variant('topaz', 'trace_ti_rutile') || 'Trace Ti hints at microscopic rutile needles.');
  }

  if (c.phantom_count >= 1) {
    const phantomPhrase = `${c.phantom_count} phantom boundar${c.phantom_count > 1 ? 'ies' : 'y'}`;
    parts.push(narrative_variant('topaz', 'phantom_boundary', { phantom_phrase: phantomPhrase }) || `${phantomPhrase} preserved.`);
  }

  if (c.dissolved) {
    parts.push(narrative_variant('topaz', 'dissolved') || 'Strong acid attack etched the surface.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_tourmaline(c) {
  // Prose lives in narratives/tourmaline.md.
  const parts = [`Tourmaline #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('tourmaline') || 'Complex cyclosilicate, trigonal — elongated prisms.');
  const notes = c.zones.map(z => (z.note || '').toLowerCase());
  const varieties = new Set();
  for (const n of notes) {
    if (n.includes('schorl')) varieties.add('schorl');
    if (n.includes('rubellite')) varieties.add('rubellite');
    if (n.includes('verdelite')) varieties.add('verdelite');
    if (n.includes('indicolite')) varieties.add('indicolite');
    if (n.includes('paraíba') || n.includes('paraiba')) varieties.add('paraiba');
    if (n.includes('achroite')) varieties.add('achroite');
  }
  if (varieties.has('schorl') && varieties.size > 1) {
    const other = [...varieties].filter(v => v !== 'schorl').sort();
    parts.push(narrative_variant('tourmaline', 'color_zoned_schorl', { others: other.join(', ') }) || `Color-zoned: started as schorl and transitioned to ${other.join(', ')}.`);
  } else if (varieties.has('paraiba')) {
    parts.push(narrative_variant('tourmaline', 'paraiba') || 'Paraíba blue — the Cu²⁺-activated glow.');
  } else if (varieties.has('rubellite')) {
    parts.push(narrative_variant('tourmaline', 'rubellite') || "Rubellite — Li-rich elbaite with Mn²⁺.");
  } else if (varieties.has('verdelite')) {
    parts.push(narrative_variant('tourmaline', 'verdelite') || "Verdelite — green elbaite.");
  } else if (varieties.has('indicolite')) {
    parts.push(narrative_variant('tourmaline', 'indicolite') || 'Indicolite — blue elbaite.');
  } else if (varieties.has('schorl')) {
    parts.push(narrative_variant('tourmaline', 'schorl') || 'Schorl — the black Fe²⁺-dominant end-member.');
  } else if (varieties.has('achroite')) {
    parts.push(narrative_variant('tourmaline', 'achroite') || 'Achroite — colorless elbaite.');
  }
  parts.push(narrative_closing('tourmaline') || 'The cross-section reads like a tree-ring record.');
  return parts.filter(p => p).join(' ');
},

  _narrate_beryl(c) {
  // Prose lives in narratives/beryl.md. Goshenite / generic colorless
  // fallback; variety crystals are emerald/aquamarine/morganite/heliodor.
  const parts = [`Goshenite (beryl) #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('beryl') || "Be₃Al₂Si₆O₁₈ — hexagonal cyclosilicate, colorless variety. Beryllium is the most incompatible common element in magmatic systems: no rock-forming mineral will take it, so Be accumulates in residual pegmatite fluid until beryl finally nucleates at high threshold. That's why beryl crystals can be enormous — by the time the first crystal fires, there's a lot of beryllium waiting.");
  parts.push(narrative_variant('beryl', 'goshenite_clean') || 'Goshenite is the truly colorless beryl: no chromophore above the variety-gate thresholds (Cr < 0.5 ppm, Mn < 2 ppm, Fe < 8 ppm, V < 1 ppm).');
  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    parts.push(narrative_variant('beryl', 'fluid_inclusions', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons preserved at growth-zone boundaries — beryl is notorious for these, including the stepped "growth tubes" that make hexagonal cat's-eye chatoyancy possible.`);
  }
  parts.push(narrative_variant('beryl', 'c_axis_thermal_history') || 'If you sliced this goshenite perpendicular to the c-axis, the growth rings would map the pegmatite\'s thermal history. Wider bands mark warmer, faster growth; tight bands mark slow cool periods.');
  if (c.dissolved) {
    parts.push(narrative_variant('beryl', 'hf_dissolution') || 'HF-assisted dissolution etched the surface — beryl is very resistant, but fluoride-rich acid fluids will eventually eat it, releasing Be²⁺ and SiO₂ back to the pocket.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_emerald(c) {
  // Prose lives in narratives/emerald.md.
  const parts = [`Emerald #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('emerald') || "Be₃Al₂Si₆O₁₈ + Cr³⁺ (or V³⁺) — the chromium variety of beryl. The 'emerald paradox': Cr is an ultramafic element (peridotite/komatiite), Be is the most incompatible of common pegmatitic elements. These two chemistries almost never coexist in the same fluid.");
  const is_trapiche = c.zones.some(z => (z.note || '').includes('trapiche')) || c.habit === 'trapiche';
  if (is_trapiche) {
    parts.push(narrative_variant('emerald', 'trapiche') || 'Trapiche pattern — the 6-spoke wheel of dark inclusion rays between six green sector-crystals. A Colombian Muzo specialty.');
  }
  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    parts.push(narrative_variant('emerald', 'jardin', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons preserved — emerald is famous for its 'jardin' (French for garden), the dense field of primary 3-phase fluid inclusions that every natural emerald carries.`);
  }
  if (c.dissolved) {
    parts.push(narrative_variant('emerald', 'hf_dissolution') || 'HF-assisted dissolution etched the surface — emerald shares beryl\'s acid resistance and only dissolves under fluoride.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_aquamarine(c) {
  // Prose lives in narratives/aquamarine.md.
  const parts = [`Aquamarine #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('aquamarine') || 'Be₃Al₂Si₆O₁₈ + Fe²⁺ — the blue variety of beryl. Most abundant gem beryl variety; every gem-producing pegmatite yields aquamarine. Fe²⁺ substitutes in the channel sites and the Al octahedral site.');
  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    parts.push(narrative_variant('aquamarine', 'fluid_inclusions', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons at zone boundaries. Aquamarine's 'growth tubes' — stepped hexagonal negative-crystal voids — are what make the cat's-eye chatoyancy effect possible when the crystal is cut en cabochon.`);
  }
  if (c.habit === 'stubby_tabular') {
    parts.push(narrative_variant('aquamarine', 'stubby_tabular') || 'Stubby tabular habit — late-stage, T < 380°C. The flat basal pinacoid dominates over the hexagonal prism, making this crystal look more like a squat bar than the cigarette-shape of hotter Cruzeiro aquamarines.');
  } else if (c.habit === 'hex_prism_long') {
    parts.push(narrative_variant('aquamarine', 'hex_prism_long') || "Long hexagonal-prism habit — the Cruzeiro 'cigarette' shape. Classic higher-T (>400°C) pegmatite pocket signature, where the c-axis growth outpaces the a-axis by a factor of several.");
  }
  if (c.dissolved) {
    parts.push(narrative_variant('aquamarine', 'hf_dissolution') || 'HF-assisted dissolution etched the surface — aquamarine shares beryl\'s acid resistance.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_morganite(c) {
  // Prose lives in narratives/morganite.md.
  const parts = [`Morganite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('morganite') || 'Be₃Al₂Si₆O₁₈ + Mn²⁺ — the pink-to-peach variety of beryl. Mn²⁺ substitutes in the Al octahedral site; natural alpha-particle irradiation oxidizes Mn²⁺ to Mn³⁺ producing the pink hue. Named by George F. Kunz of Tiffany & Co (1911) after J.P. Morgan.');
  parts.push(narrative_variant('morganite', 'late_stage_pegmatite') || 'Morganite is late in the pegmatite sequence. Mn accumulates in residual fluid while earlier phases (feldspar, quartz, aquamarine) crystallize — when the pocket is finally late enough for Mn > 2 ppm, morganite fires. Pala District California, Madagascar, and Minas Gerais Brazil are the top gem sources.');
  if (c.habit === 'tabular_hex') {
    parts.push(narrative_variant('morganite', 'tabular_hex') || "Tabular hexagonal habit — morganite's signature flat pinacoid-dominated plate, unlike the prismatic habit of aquamarine and emerald. The Urucum pocket (Minas Gerais, 1995) yielded the largest gem morganite crystal at 35+ kg in this habit.");
  }
  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    parts.push(narrative_variant('morganite', 'fluid_inclusions', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons — morganite is usually cleaner than aquamarine or emerald because it grew so late in the pegmatite sequence.`);
  }
  if (c.dissolved) {
    parts.push(narrative_variant('morganite', 'hf_dissolution') || 'HF-assisted dissolution etched the surface. Unusual for morganite — the pocket must have received a late fluorine-rich acid pulse after the main morganite growth ceased.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_heliodor(c) {
  // Prose lives in narratives/heliodor.md.
  const parts = [`Heliodor #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('heliodor') || 'Be₃Al₂Si₆O₁₈ + Fe³⁺ — the yellow variety of beryl. Same iron as aquamarine but oxidized to the Fe³⁺ state; the aquamarine/heliodor split is the cleanest redox record in the gem world.');
  if (c.zones.some(z => (z.note || '').includes('Namibian'))) {
    parts.push(narrative_variant('heliodor', 'namibian_deep_yellow') || 'Namibian deep-yellow — high-Fe strongly-oxidizing pocket signature. The Volodarsk pegmatite cross-cuts Fe-rich country rock, delivering both the Fe source and the late oxidizing pulse that converts Fe²⁺ to Fe³⁺.');
  }
  const inclusion_zones = c.zones.filter(z => z.fluid_inclusion);
  if (inclusion_zones.length) {
    parts.push(narrative_variant('heliodor', 'fluid_inclusions', { count: inclusion_zones.length }) || `${inclusion_zones.length} fluid inclusion horizons — the oxidizing pocket often contains primary CO₂-rich 2-phase inclusions, distinguishing heliodor from the more aqueous-inclusion-rich aquamarine.`);
  }
  parts.push(narrative_variant('heliodor', 'color_stability') || 'Color stability note: natural heliodor is radiation-sensitive. Deep-yellow specimens often lose color on heating above 400°C, reverting to goshenite.');
  if (c.dissolved) {
    parts.push(narrative_variant('heliodor', 'hf_dissolution') || 'HF-assisted dissolution etched the surface — heliodor shares beryl\'s acid resistance; dissolution means a late fluorine-rich acid pulse.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_corundum(c) {
  // Prose lives in narratives/corundum.md.
  const parts = [`Corundum #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('corundum') || 'Al₂O₃ — trigonal close-packed oxide, hardness 9 (the benchmark below diamond). This is the colorless/generic variety: no chromophore trace above the ruby (Cr ≥ 2 ppm) or sapphire (Fe ≥ 5) gates.');
  if (c.habit === 'tabular') parts.push(narrative_variant('corundum', 'tabular') || 'Flat tabular hexagonal plate — the Mogok marble-hosted contact-metamorphic habit. Basal pinacoid dominates over the prism.');
  else if (c.habit === 'barrel') parts.push(narrative_variant('corundum', 'barrel') || 'Steep dipyramidal "barrel" — the high-T (>700°C) habit diagnostic of basalt-hosted xenocrysts. Thailand and Mozambique corundum most often takes this form.');
  const avg_Ti = c.zones.reduce((s, z) => s + (z.trace_Ti || 0), 0) / Math.max(c.zones.length, 1);
  if (avg_Ti > 0.05) {
    parts.push(narrative_variant('corundum', 'trace_ti') || "Trace Ti in the zones — microscale rutile partitioning that did not reach the asterism-inclusion threshold.");
  }
  if (c.dissolved) {
    parts.push(narrative_variant('corundum', 'dissolved') || 'Unusual — corundum is essentially acid-inert in all sim conditions.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_ruby(c) {
  // Prose lives in narratives/ruby.md.
  const parts = [`Ruby #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('ruby') || "Al₂O₃ + Cr³⁺ — the red chromium-bearing variety of corundum.");
  const notes = c.zones.map(z => (z.note || ''));
  if (notes.some(n => n.includes("pigeon"))) parts.push(narrative_variant('ruby', 'pigeons_blood') || "Pigeon's blood — the Mogok color grade.");
  else if (notes.some(n => n.includes('cherry'))) parts.push(narrative_variant('ruby', 'cherry') || "Cherry-red — deep Cr saturation, darker tone than Mogok 'pigeon's blood'. The Burma classical grade.");
  else if (notes.some(n => n.includes('pinkish'))) parts.push(narrative_variant('ruby', 'pinkish') || 'Pinkish ruby — Cr just above the 2 ppm gate.');
  if (c.habit === 'asterated') parts.push(narrative_variant('ruby', 'asterated') || '6-rayed asterism — rutile (TiO₂) needle inclusions aligned along the basal plane.');
  else if (c.habit === 'barrel') parts.push(narrative_variant('ruby', 'barrel') || 'Steep dipyramidal "barrel" — Mozambique/Madagascar basalt-hosted habit.');
  else if (c.habit === 'tabular') parts.push(narrative_variant('ruby', 'tabular') || 'Flat hexagonal plate — the Mogok marble-hosted signature.');
  return parts.filter(p => p).join(' ');
},

  _narrate_sapphire(c) {
  // Prose lives in narratives/sapphire.md. JS gains the violet (V³⁺
  // Tanzania) zone-note variant Python had — drift consolidation.
  const parts = [`Sapphire #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('sapphire') || 'Al₂O₃ with Fe/Ti/V trace — the non-red corundum varieties.');
  const notes = c.zones.map(z => (z.note || ''));
  if (notes.some(n => n.includes('cornflower'))) parts.push(narrative_variant('sapphire', 'cornflower') || "Cornflower blue — the Kashmir type.");
  else if (notes.some(n => n.includes('royal blue'))) parts.push(narrative_variant('sapphire', 'royal_blue') || 'Royal blue — deeper Fe than Kashmir cornflower.');
  else if (notes.some(n => n.includes('padparadscha'))) parts.push(narrative_variant('sapphire', 'padparadscha') || 'Padparadscha — the pink-orange corundum named for the Sinhalese word for lotus blossom.');
  else if (notes.some(n => n.includes('yellow'))) parts.push(narrative_variant('sapphire', 'yellow') || 'Yellow sapphire — Fe³⁺ in the Al site, no Ti partner.');
  else if (notes.some(n => n.includes('violet'))) parts.push(narrative_variant('sapphire', 'violet'));
  else if (notes.some(n => n.includes('pink'))) parts.push(narrative_variant('sapphire', 'pink') || 'Pink sapphire — Cr just below the 2 ppm ruby gate.');
  else if (notes.some(n => n.includes('green'))) parts.push(narrative_variant('sapphire', 'green') || 'Green sapphire — Fe alone, no Ti partner.');
  if (c.habit === 'asterated') parts.push(narrative_variant('sapphire', 'asterated') || '6-rayed star sapphire — rutile needles aligned along basal plane.');
  else if (c.habit === 'barrel') parts.push(narrative_variant('sapphire', 'barrel') || 'Steep dipyramidal "barrel" — basalt-hosted xenocryst signature.');
  else if (c.habit === 'tabular') parts.push(narrative_variant('sapphire', 'tabular') || 'Flat hexagonal plate — Mogok marble-hosted.');
  return parts.filter(p => p).join(' ');
},

  _narrate_spodumene(c) {
  // Prose lives in narratives/spodumene.md.
  const parts = [`Spodumene #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('spodumene') || "LiAlSi₂O₆ — monoclinic pyroxene. Two cleavage directions intersect at ~87°, and that's the diagnostic feature: when spodumene survives dissolution events, parting fragments from those cleavage planes litter the pocket floor. The 'book shape' flattened tabular habit is the signature. Can reach 14 meters in real pegmatites (Etta mine, South Dakota) — among the longest single crystals on Earth.");

  const notes = c.zones.map(z => (z.note || '').toLowerCase());
  const varieties = new Set();
  for (const n of notes) {
    if (n.includes('kunzite')) varieties.add('kunzite');
    if (n.includes('hiddenite')) varieties.add('hiddenite');
    if (n.includes('triphane')) varieties.add('triphane');
  }

  if (varieties.has('kunzite')) {
    parts.push(narrative_variant('spodumene', 'kunzite') || "Kunzite — the pink-lilac Mn²⁺ variety, named for George Kunz, Tiffany & Co.'s mineralogist who bought Minas Gerais specimens by the crate in the early 1900s. Kunzite fluoresces strongly pink-orange under SW UV, a diagnostic test no other pink gem material passes. Color depth correlates with growth rate — faster growth traps more color-causing impurity.");
  } else if (varieties.has('hiddenite')) {
    parts.push(narrative_variant('spodumene', 'hiddenite') || 'Hiddenite — the green Cr³⁺ variety, named for William Earl Hidden, who discovered the North Carolina locality in 1879. Much rarer than kunzite because Cr³⁺ needs to diffuse from country rock into the pegmatite fluid at just the right moment. Minas Gerais produces the world\u2019s best hiddenite.');
  } else if (varieties.has('triphane')) {
    parts.push(narrative_variant('spodumene', 'triphane') || "Triphane — pale yellow-green or colorless, the iron-trace end-member. The name means 'three-appearing' (Greek), for the dichroism that shifts the hue depending on viewing angle. The default spodumene species when no strong chromophore is present.");
  }

  parts.push(narrative_closing('spodumene') || 'A cross-section of this crystal perpendicular to the c-axis would show the pyroxene chain silicate structure: SiO₄ tetrahedra linked into single chains along c, with Li and Al occupying the M1 and M2 octahedral sites between them.');
  return parts.filter(p => p).join(' ');
},

  _narrate_anglesite(c) {
  // Prose lives in narratives/anglesite.md.
  const parts = [`Anglesite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('anglesite') || 'PbSO₄ — orthorhombic lead sulfate, brilliant adamantine luster. Intermediate step in the galena → anglesite → cerussite oxidation sequence. Named for Anglesey, the Welsh island where the type specimens were found in the 1830s.');
  if ((c.position || '').includes('galena')) {
    parts.push(narrative_variant('anglesite', 'on_galena') || 'This crystal grew directly on a dissolving galena — the classic pseudomorphic relationship.');
  }
  if (c.zones.some(z => (z.note || '').includes('→ cerussite'))) {
    parts.push(narrative_variant('anglesite', 'converting_to_cerussite') || "Converting to cerussite.");
  }
  if (c.dissolved) {
    // dissolved-fallback shortened slightly to avoid ’ mismatch in fallback text
    parts.push(narrative_variant('anglesite', 'dissolved') || 'The crystal has dissolved. If the pocket\u2019s chemistry continues to evolve the released Pb²⁺ will find a new home — cerussite if carbonate is present, pyromorphite if phosphate arrives.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_cerussite(c) {
  // Prose lives in narratives/cerussite.md.
  const parts = [`Cerussite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('cerussite') || "PbCO₃ — orthorhombic lead carbonate. Water-clear with adamantine luster and extreme birefringence — a thin slice doubles every image behind it. Final stable product of the lead oxidation sequence in carbonate-rich water. The Latin name 'cerussa' means 'white lead', a pigment used since antiquity (and poisonous — painters\u2019 death).");
  if (c.twinned && (c.twin_law || '').includes('sixling')) {
    parts.push(narrative_variant('cerussite', 'sixling_twin') || 'Six-ray stellate cyclic twin — three individuals intergrown at 120° on {110}. Among mineralogy\u2019s most iconic forms; a sharp cerussite star commands four-figure prices at a show. This twin happened because growth ran at moderate supersaturation for a sustained window — fast enough to initiate the twin, slow enough to let it develop cleanly.');
  }
  if ((c.position || '').includes('galena')) {
    parts.push(narrative_variant('cerussite', 'on_galena') || 'Pseudomorphs after galena — the cube outline survives as cerussite precipitates into it. Occasionally galena relics persist inside, slowly oxidizing.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('cerussite', 'acid_dissolution') || 'Acid dissolution — cerussite is a carbonate and fizzes in acid just like calcite: PbCO₃ + 2H⁺ → Pb²⁺ + H₂O + CO₂. Any released Pb may find pyromorphite or vanadinite if P or V is available.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_pyromorphite(c) {
  // Prose lives in narratives/pyromorphite.md.
  const parts = [`Pyromorphite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('pyromorphite') || "Pb₅(PO₄)₃Cl — hexagonal apatite-group phosphate. Barrel-shaped hexagonal prisms in olive-green, yellow, orange, or brown. Forms in supergene oxidation zones when phosphate-bearing meteoric water encounters a Pb-bearing horizon. The name is Greek 'pyros morphos' — 'fire form' — because the crystals re-form into a spherical droplet when melted.");
  if ((c.habit || '').includes('olive')) {
    parts.push(narrative_variant('pyromorphite', 'olive_classic') || 'Classic olive-green barrel crystals. Found at the type locality of Leadhills (Scotland), at Dognacska (Romania), and — best of all — at Les Farges (France) where millimeter-sharp brilliant-green crystals set the world standard.');
  } else if ((c.habit || '').includes('yellow') || (c.habit || '').includes('brown')) {
    parts.push(narrative_variant('pyromorphite', 'non_canonical_color') || 'Non-canonical color — the pocket fluid substituted Ca for some Pb (pale yellow-orange, phosphoapatite-adjacent) or carried Fe trace (brown-olive).');
  }
  parts.push(narrative_variant('pyromorphite', 'remediation_tail') || 'Pyromorphite is used in environmental remediation: dump phosphate fertilizer onto lead-contaminated soil and the toxic Pb precipitates as pyromorphite — stable, insoluble, and harmless. Mineralogy as a cleanup tool.');
  return parts.filter(p => p).join(' ');
},

  _narrate_vanadinite(c) {
  // Prose lives in narratives/vanadinite.md. JS gains the vanadate_companions
  // branch in this commit (drift consolidation — Python had it).
  const parts = [`Vanadinite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('vanadinite') || 'Pb₅(VO₄)₃Cl — hexagonal apatite-group vanadate. Bright red-orange prisms with flat basal terminations, sitting atop goethite-stained matrix. Vanadium-end-member of the pyromorphite–mimetite–vanadinite series, arguably mineralogy\u2019s most complete solid-solution triangle.');
  if ((c.habit || '').includes('endlichite')) {
    parts.push(narrative_variant('vanadinite', 'endlichite') || 'Endlichite — intermediate vanadinite-mimetite composition with significant As⁵⁺ substituting for V⁵⁺. The color shifts toward yellow as As dominates. The compositional series is continuous.');
  } else if ((c.habit || '').includes('red')) {
    parts.push(narrative_variant('vanadinite', 'red_signature') || "The signature red-orange. This is the chromophore pegged to V⁵⁺ in the crystal structure — no other common mineral produces this particular red. The Moroccan Mibladen and Touissit deposits have produced the world\u2019s finest specimens, growing on goethite crust in near-surface oxidation pockets.");
  }
  parts.push(narrative_variant('vanadinite', 'desert_tail') || "Classic desert mineral. V comes from oxidation of V-bearing red-bed sediments (roll-front uranium deposits, ironstones) — an arid-climate signature. The rock-shop cliché 'vanadinite on goethite' is geologically accurate.");
  const activeDes = (this && this.crystals) ? this.crystals.filter(dc => dc.mineral === 'descloizite' && dc.active) : [];
  const activeMot = (this && this.crystals) ? this.crystals.filter(mc => mc.mineral === 'mottramite' && mc.active) : [];
  if (activeDes.length || activeMot.length) {
    const companions = [];
    if (activeDes.length) companions.push(`descloizite #${activeDes[0].crystal_id}`);
    if (activeMot.length) companions.push(`mottramite #${activeMot[0].crystal_id}`);
    parts.push(narrative_variant('vanadinite', 'vanadate_companions', { companions: companions.join(' and ') }));
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_bornite(c) {
  // Prose lives in narratives/bornite.md.
  const parts = [`Bornite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('bornite') || "Cu₅FeS₄ — bronze-colored fresh, famous for the iridescent 'peacock ore' tarnish from thin-film interference on surface oxidation products. The 228°C order-disorder transition is one of mineralogy\u2019s cleanest structural changes: above, Cu and Fe randomly occupy the cation sites (pseudo-cubic); below, they order into the orthorhombic arrangement.");
  if ((c.habit || '').includes('pseudo_cubic')) {
    parts.push(narrative_variant('bornite', 'pseudo_cubic') || 'Grew at T > 228°C — crystal has the disordered pseudo-cubic structure preserved. If cooled slowly, the Cu and Fe will gradually order into orthorhombic domains, sometimes visible under reflected light.');
  } else if ((c.habit || '').includes('peacock')) {
    parts.push(narrative_variant('bornite', 'peacock') || 'Peacock iridescent — thin-film interference on an oxidation crust. Fresh bornite bronze under the film. Strike it with a steel hammer and the fresh surface shows through; leave it in air for a week and the rainbow comes back.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('bornite', 'oxidative_dissolution') || 'Oxidative dissolution — Cu²⁺ and Fe³⁺ went back to the fluid, probably to find malachite/azurite (for Cu) or goethite (for Fe).');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_chalcocite(c) {
  // Prose lives in narratives/chalcocite.md.
  const parts = [`Chalcocite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('chalcocite') || 'Cu₂S — 79.8% Cu by weight, one of the richest copper ores ever mined. Forms in the supergene enrichment blanket, where descending Cu²⁺-rich meteoric fluids meet reducing conditions at the water table. This is where mineable copper ore gets made.');
  if (c.twinned && (c.twin_law || '').includes('sixling')) {
    parts.push(narrative_variant('chalcocite', 'sixling_twin') || 'Pseudo-hexagonal cyclic sixling twin — chalcocite\u2019s collector habit. Three orthorhombic individuals intergrown at ~60° approximate a hexagonal symmetry the mineral doesn\u2019t actually have. Butte, Cornwall, and Bristol Cliff produced sharp sixlings.');
  }
  if ((c.habit || '').includes('pseudomorph')) {
    parts.push(narrative_variant('chalcocite', 'pseudomorph') || "Pseudomorph — this chalcocite replaced a primary sulfide (chalcopyrite or bornite) atom-by-atom while preserving the host's external form. Copper diffused in, iron and excess sulfur diffused out, leaving a ghost outline in dark gray Cu₂S.");
  }
  if ((c.habit || '').includes('sooty')) {
    parts.push(narrative_variant('chalcocite', 'sooty') || 'Sooty microcrystalline texture — rapid precipitation at the oxidation/reduction interface. The aggregate looks like black soot smeared on the host rock.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_covellite(c) {
  // Prose lives in narratives/covellite.md.
  const parts = [`Covellite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('covellite') || 'CuS — indigo-blue, the only common naturally blue mineral (azurite aside). Named for Niccolo Covelli, who first described the Vesuvius fumarole specimens in 1833. Hexagonal, with perfect basal cleavage — the fresh plates peel like mica, and the cleavage surfaces flash purple-green iridescence from thin-film interference.');
  if ((c.habit || '').includes('iridescent')) {
    parts.push(narrative_variant('covellite', 'iridescent') || 'Iridescent coating — this covellite grew at the boundary between the oxidation and reduction zones. The fluid oscillated across the Eh boundary just enough to produce Cu²⁺ surface products on the forming crystal.');
  } else if ((c.habit || '').includes('rosette')) {
    parts.push(narrative_variant('covellite', 'rosette') || 'Radiating rosette — plates nucleating outward from a common center. High supersaturation triggered multiple nucleation sites on the substrate at once, and the crystals grew into each other until the void was paved blue.');
  }
  parts.push(narrative_variant('covellite', 'stoichiometry') || "S:Cu ratio = 1:1, twice that of chalcocite. Covellite forms where sulfur activity is high enough to push past chalcocite's stoichiometry — typically the transition layer between oxidized caprock and reduced primary sulfides below.");
  if (c.dissolved) parts.push(narrative_variant('covellite', 'oxidative_dissolution') || 'Oxidative dissolution — the Cu²⁺ will find malachite or azurite; the S oxidized to sulfate.');
  return parts.filter(p => p).join(' ');
},

  _narrate_cuprite(c) {
  // Prose lives in narratives/cuprite.md.
  const parts = [`Cuprite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('cuprite') || 'Cu₂O — 88.8% Cu by weight, dark red with ruby-red internal reflections in thin slices. Forms at the Eh boundary between more-reducing native copper and more-oxidizing malachite/tenorite. The window is narrow, which is why cuprite tends to appear as thin layers between native Cu and green malachite coats.');
  if (c.habit === 'chalcotrichite') {
    parts.push(narrative_variant('cuprite', 'chalcotrichite') || 'Chalcotrichite — hair-like plush texture. Rapid directional growth in open fracture space produced whisker crystals instead of octahedra. Morenci (Arizona) and Chessy (France) produced the best specimens.');
  } else if ((c.habit || '').includes('massive')) {
    parts.push(narrative_variant('cuprite', 'massive') || "Massive 'tile ore' — dark red-brown rapidly-precipitated cuprite filling tight pore space.");
  } else if (c.twinned && (c.twin_law || '').includes('spinel')) {
    parts.push(narrative_variant('cuprite', 'spinel_twin') || 'Spinel-law penetration twin — two octahedra intergrown with a {111} reentrant angle between them. Rare.');
  } else {
    parts.push(narrative_variant('cuprite', 'octahedral_default') || 'Classic octahedral habit, dark red with glassy-to-adamantine luster. Tsumeb (Namibia) and Mashamba West mine (Congo) produced gem-grade octahedra to 15+ cm.');
  }
  if (c.dissolved) parts.push(narrative_variant('cuprite', 'eh_dissolution') || 'Crystal dissolved — the Eh window shifted out from under it.');
  return parts.filter(p => p).join(' ');
},

  _narrate_azurite(c) {
  // Prose lives in narratives/azurite.md. Code dispatches on habit
  // + paramorph-conversion zone-note signal. Inline fallbacks are the
  // existing (shorter) JS strings; markdown is canonical and matches
  // Python's longer version, so live runtime now converges on the
  // canonical text — fixes a small Python/JS drift in this narrator.
  const parts = [`Azurite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('azurite') || "Cu₃(CO₃)₂(OH)₂ — the deepest blue in the common mineral kingdom. Requires high pCO₂ groundwater — typically a limestone-hosted supergene system. Chessy-les-Mines (France) gave us 'chessylite', an old synonym; Tsumeb and Bisbee (Arizona) produced the showpiece blue prisms.");
  if (c.habit === 'azurite_sun') {
    parts.push(narrative_variant('azurite', 'azurite_sun') || 'Azurite-sun — radiating flat disc, grown in a narrow fracture where the c-axis was forced perpendicular to the fracture plane. The Malbunka (Australia) azurite-suns in siltstone are the classic.');
  } else if (c.habit === 'rosette_bladed') {
    parts.push(narrative_variant('azurite', 'rosette_bladed') || 'Radiating rosette — multiple blades nucleating at a common center.');
  } else {
    parts.push(narrative_variant('azurite', 'monoclinic_prismatic') || 'Monoclinic prismatic — the flagship azurite habit. Deep blue trending to midnight-blue in thick crystals.');
  }
  const has_conversion = c.zones.some(z => (z.note || '').includes('→ malachite'));
  if (has_conversion) {
    parts.push(narrative_variant('azurite', 'malachite_conversion') || "Azurite → malachite conversion — CO₂ has been escaping from the pocket fluid and the CO₃ inventory dropped below azurite's stability. The crystal shape will persist (pseudomorph after azurite) but fill with the green lower-carbonate mineral. Most Chessy and Morenci azurite sits frozen mid-conversion — half blue, half green — the geochemist's equivalent of a butterfly emerging.");
  }
  if (c.dissolved && !has_conversion) {
    parts.push(narrative_variant('azurite', 'dissolved') || 'Acid dissolution — fizzes like calcite. Cu²⁺ and CO₃²⁻ released.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_chrysocolla(c) {
  // Prose lives in narratives/chrysocolla.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Chrysocolla #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('chrysocolla'));
  if (c.habit === 'pseudomorph_after_azurite') parts.push(narrative_variant('chrysocolla', 'pseudomorph_after_azurite'));
  else if (c.habit === 'enamel_on_cuprite') parts.push(narrative_variant('chrysocolla', 'enamel_on_cuprite'));
  else if (c.habit === 'botryoidal_crust') parts.push(narrative_variant('chrysocolla', 'botryoidal_crust'));
  else if (c.habit === 'reniform_globules') parts.push(narrative_variant('chrysocolla', 'reniform_globules'));
  else parts.push(narrative_variant('chrysocolla', 'silica_gel_default'));
  if (c.dissolved) parts.push(narrative_variant('chrysocolla', 'dissolved'));
  return parts.filter(p => p).join(' ');
},

  _narrate_native_copper(c) {
  // Prose lives in narratives/native_copper.md.
  const parts = [`Native copper #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_copper') || 'Cu — elemental copper. Only forms when the fluid is strongly reducing AND low in sulfur. The Michigan Keweenaw peninsula basalt vesicles produced 500-ton masses — the Ontonagon boulder, now at the Smithsonian, is 1.7 tons. Copper-red fresh, tarnishes brown (cuprite surface film), eventually green (malachite patina).');
  if (c.habit === 'massive_sheet') {
    parts.push(narrative_variant('native_copper', 'massive_sheet') || 'Massive sheet copper — the Lake Superior basin signature. Rapid precipitation in open basalt vesicles produced sheets tens of centimeters thick. This is where industrial copper mining began in the Western hemisphere, ~5000 BC with the Old Copper Culture.');
  } else if (c.habit === 'arborescent_dendritic') {
    parts.push(narrative_variant('native_copper', 'arborescent_dendritic') || "Arborescent dendritic — tree-like branching, the collector's ideal. Each branch is a single crystal oriented along {100}.");
  } else if (c.habit === 'wire_copper') {
    parts.push(narrative_variant('native_copper', 'wire_copper') || 'Wire copper — filamentary growth in narrow channels. Ray and Chino (Arizona) produced the delicate wires.');
  } else {
    parts.push(narrative_variant('native_copper', 'cubic_dodecahedral') || 'Cubic/dodecahedral well-formed crystal — rare for native copper, which usually grows as dendrites.');
  }
  parts.push(narrative_variant('native_copper', 'statue_of_liberty_tail') || "The Statue of Liberty's iconic green patina is malachite growing on native copper — the mineralogical fate of most surface copper, given enough time and rain.");
  return parts.filter(p => p).join(' ');
},

  _narrate_native_gold(c) {
  // Prose lives in narratives/native_gold.md. JS narrator added in this
  // commit to close the JS-side gap (Python had a narrator; JS dispatch
  // would silently emit nothing for native gold). Mirrors Python's blurb +
  // 3-way habit + 2-way alloy + noble_tail structure.
  const parts = [`Native gold #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_gold'));
  if (c.habit === 'nugget') {
    parts.push(narrative_variant('native_gold', 'nugget'));
  } else if (c.habit === 'dendritic') {
    parts.push(narrative_variant('native_gold', 'dendritic'));
  } else {
    parts.push(narrative_variant('native_gold', 'octahedral_default'));
  }
  if (c.dominant_forms && c.dominant_forms.some(f => (f || '').toLowerCase().includes('electrum'))) {
    parts.push(narrative_variant('native_gold', 'alloy_electrum'));
  } else if (c.dominant_forms && c.dominant_forms.some(f => { const lo = (f || '').toLowerCase(); return lo.includes('cuproauride') || lo.includes('rose-gold'); })) {
    parts.push(narrative_variant('native_gold', 'alloy_cuproauride'));
  }
  parts.push(narrative_variant('native_gold', 'noble_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_magnetite(c) {
  // Prose lives in narratives/magnetite.md.
  const parts = [`Magnetite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('magnetite') || "Fe₃O₄ — the mixed-valence Fe²⁺Fe³⁺₂O₄ spinel oxide. Black, strongly magnetic (lodestone is natural permanent-magnet magnetite — the first compass). Sits at the HM (hematite-magnetite) redox buffer; cross that buffer and entire mineral assemblages shift. Streak is black, not red like hematite's.");
  if (c.habit === 'octahedral') parts.push(narrative_variant('magnetite', 'octahedral') || 'Octahedral {111} — the classic magnetite habit, sharp on matrix from Cerro Huanaquino (Bolivia) and Binn Valley (Switzerland).');
  else if (c.habit === 'rhombic_dodecahedral') parts.push(narrative_variant('magnetite', 'rhombic_dodecahedral') || 'Rhombic dodecahedral {110} — high-T mineralizer-assisted habit. Cl-bearing fluids promote this form over simple octahedra.');
  else parts.push(narrative_variant('magnetite', 'granular_massive') || 'Granular massive — rapid precipitation, aggregate of tiny individual crystals.');
  if (c.dissolved) parts.push(narrative_variant('magnetite', 'martite_pseudomorph') || 'Dissolving to hematite (martite pseudomorph) as O₂ climbed past the HM buffer.');
  return parts.filter(p => p).join(' ');
},

  _narrate_lepidocrocite(c) {
  // Prose lives in narratives/lepidocrocite.md.
  const parts = [`Lepidocrocite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('lepidocrocite') || 'γ-FeOOH — the ruby-red platy dimorph of goethite. Same formula, different crystal structure: goethite is a 3D framework (yellow-brown needles), lepidocrocite is layered (ruby-red platy, peels like mica). Kinetically favored when Fe²⁺ oxidizes FAST.');
  if (c.habit === 'platy_scales') parts.push(narrative_variant('lepidocrocite', 'platy_scales') || "Platy scales — the default habit. 'Lithium quartz' sold in rock shops is quartz with nanoscale lepidocrocite inclusions that scatter pink-mauve through the clear host.");
  else if (c.habit === 'plumose_rosette') parts.push(narrative_variant('lepidocrocite', 'plumose_rosette') || 'Plumose rosette — radiating platy blades. Cornwall and Siegerland (Germany) produced the best.');
  else parts.push(narrative_variant('lepidocrocite', 'fibrous_micaceous') || 'Fibrous micaceous — very rapid growth, coarser particle size, rust-brown color.');
  parts.push(narrative_variant('lepidocrocite', 'conversion_tail') || 'Given geological time, lepidocrocite converts to goethite (the thermodynamically stable dimorph).');
  return parts.filter(p => p).join(' ');
},

  _narrate_arsenopyrite(c) {
  // Prose lives in narratives/arsenopyrite.md.
  const parts = [`Arsenopyrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('arsenopyrite') || "FeAsS — the most common arsenic mineral and a primary mesothermal sulfide.");
  const trappedAu = (c.zones || []).reduce((s, z) => s + (z.trace_Au || 0), 0);
  if (trappedAu > 0.01) parts.push(narrative_variant('arsenopyrite', 'invisible_gold', { trapped_au: trappedAu.toFixed(3) }) || `Invisible gold — ${trappedAu.toFixed(3)} ppm Au trapped structurally in the arsenopyrite lattice.`);
  if (c.habit === 'striated_prism') parts.push(narrative_variant('arsenopyrite', 'striated_prism') || 'Striated prismatic — the display habit.');
  else if (c.habit === 'rhombic_blade') parts.push(narrative_variant('arsenopyrite', 'rhombic_blade') || 'Rhombic blade.');
  else if (c.habit === 'acicular') parts.push(narrative_variant('arsenopyrite', 'acicular') || 'Acicular.');
  else parts.push(narrative_variant('arsenopyrite', 'massive_default') || 'Massive granular.');
  if (c.dissolved) parts.push(narrative_variant('arsenopyrite', 'oxidation_front') || "Oxidation front — arsenopyrite + O₂ + H₂O → Fe³⁺ + AsO₄³⁻ + H₂SO₄.");
  return parts.filter(p => p).join(' ');
},

  _narrate_stibnite(c) {
  // Prose lives in narratives/stibnite.md.
  const parts = [`Stibnite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('stibnite') || 'Sb₂S₃ — orthorhombic antimony sulfide, same structure as bismuthinite.');
  if (c.habit === 'elongated_prism_blade') parts.push(narrative_variant('stibnite', 'elongated_prism_blade') || 'Elongated sword-blade.');
  else if (c.habit === 'radiating_spray') parts.push(narrative_variant('stibnite', 'radiating_spray') || 'Radiating spray.');
  else parts.push(narrative_variant('stibnite', 'massive_default') || 'Massive granular.');
  return parts.filter(p => p).join(' ');
},

  _narrate_bismuthinite(c) {
  // Prose lives in narratives/bismuthinite.md.
  const parts = [`Bismuthinite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('bismuthinite') || 'Bi₂S₃ — orthorhombic bismuth sulfide, same structure as stibnite.');
  if ((c.habit || '').includes('stout')) parts.push(narrative_variant('bismuthinite', 'stout') || 'Stout prismatic.');
  else if ((c.habit || '').includes('radiating')) parts.push(narrative_variant('bismuthinite', 'radiating') || 'Radiating cluster of needles.');
  else parts.push(narrative_variant('bismuthinite', 'acicular_default') || 'Acicular needles.');
  return parts.filter(p => p).join(' ');
},

  _narrate_native_bismuth(c) {
  // Prose lives in narratives/native_bismuth.md.
  const parts = [`Native bismuth #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_bismuth') || "Bi — elemental bismuth.");
  if (c.habit === 'arborescent_dendritic') parts.push(narrative_variant('native_bismuth', 'arborescent_dendritic') || 'Arborescent dendritic.');
  else if (c.habit === 'rhombohedral_crystal') parts.push(narrative_variant('native_bismuth', 'rhombohedral_crystal') || 'Rhombohedral crystal — RARE.');
  else parts.push(narrative_variant('native_bismuth', 'massive_default') || 'Massive granular.');
  return parts.filter(p => p).join(' ');
},

  _narrate_clinobisvanite(c) {
  // Prose lives in narratives/clinobisvanite.md.
  const parts = [`Clinobisvanite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('clinobisvanite') || 'BiVO₄ — bright yellow to orange-yellow monoclinic Bi-vanadate.');
  parts.push(narrative_closing('clinobisvanite') || 'BiVO₄ is a photocatalyst for solar-driven water splitting.');
  return parts.filter(p => p).join(' ');
},

  _narrate_acanthite(c) {
  // Prose lives in narratives/acanthite.md.
  const parts = [`Acanthite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('acanthite') || 'Ag₂S — monoclinic silver sulfide, the most important silver ore on Earth.');
  if (c.paramorph_origin === 'argentite') {
    const stepPhrase = c.paramorph_step ? ` at step ${c.paramorph_step}` : '';
    const habitPretty = (c.habit || '').replace('_', ' ');
    parts.push(narrative_variant('acanthite', 'paramorph', { step_phrase: stepPhrase, habit_pretty: habitPretty }));
    return parts.filter(p => p).join(' ');
  }
  if (c.habit === 'thorn') parts.push(narrative_variant('acanthite', 'thorn') || "Thorn-habit.");
  else if (c.habit === 'prismatic') parts.push(narrative_variant('acanthite', 'prismatic') || 'Elongated prismatic.');
  else parts.push(narrative_variant('acanthite', 'massive_default') || 'Massive granular.');
  if (c.dissolved) parts.push(narrative_variant('acanthite', 'oxidative_dissolution') || 'Oxidative dissolution.');
  else if (c.zones && c.zones.length > 15) parts.push(narrative_variant('acanthite', 'tarnish') || 'Tarnish.');
  return parts.filter(p => p).join(' ');
},

  _narrate_descloizite(c) {
  // Prose lives in narratives/descloizite.md. Drift consolidation: JS
  // habit branches were shorter; live JS now matches the longer Python text.
  const parts = [`Descloizite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('descloizite') || "Pb(Zn,Cu)VO₄(OH) — orthorhombic Pb-Zn vanadate, the Zn end of the descloizite-mottramite series. Cherry-red to brown-red, Mohs 3-3.5; the Tsumeb display standard. Forms in supergene oxidation zones where Pb-Zn sulfide ore (galena + sphalerite) has weathered AND V is delivered by groundwater. When Cu > Zn, mottramite (the olive-green Cu sibling) takes priority instead.");
  if (c.habit === 'botryoidal') parts.push(narrative_variant('descloizite', 'botryoidal') || 'Botryoidal mammillary crust — Mibladen / Berg-Aukas habit.');
  else if (c.habit === 'prismatic') parts.push(narrative_variant('descloizite', 'prismatic') || 'Prismatic — the Tsumeb display habit.');
  else parts.push(narrative_variant('descloizite', 'tabular_default') || 'Tabular — late-stage low-σ habit.');
  return parts.filter(p => p).join(' ');
},

  _narrate_mottramite(c) {
  // Prose lives in narratives/mottramite.md.
  const parts = [`Mottramite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('mottramite') || "Pb(Cu,Zn)VO₄(OH) — orthorhombic Pb-Cu vanadate, the Cu end of the descloizite-mottramite series. Olive-green to yellowish-green from the Cu chromophore. Type locality: Mottram St. Andrew, Cheshire (England), 1876. Tsumeb produces the museum specimens. When Zn ≥ Cu, descloizite takes priority.");
  if (c.habit === 'botryoidal') parts.push(narrative_variant('mottramite', 'botryoidal') || 'Botryoidal — Mottram St Andrew habit.');
  else if (c.habit === 'prismatic') parts.push(narrative_variant('mottramite', 'prismatic') || "Prismatic — Tsumeb's olive-green crystals.");
  else parts.push(narrative_variant('mottramite', 'tabular_default') || 'Tabular — late-stage habit.');
  return parts.filter(p => p).join(' ');
},

  _narrate_raspite(c) {
  // Prose lives in narratives/raspite.md.
  const parts = [`Raspite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('raspite') || "PbWO₄ — monoclinic lead tungstate, RARE. Same composition as stolzite but a different crystal system; stolzite (tetragonal) is favored ~90% of the time. Honey-yellow tabular crystals with perfect {100} cleavage. Type locality: Broken Hill, NSW, Australia.");
  return parts.filter(p => p).join(' ');
},

  _narrate_stolzite(c) {
  // Prose lives in narratives/stolzite.md.
  const parts = [`Stolzite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('stolzite') || "PbWO₄ — tetragonal lead tungstate, the lead analog of scheelite. Honey-yellow to orange-yellow Mohs 2.5-3 tetragonal crystals; the dominant PbWO₄ polymorph (~90% over raspite). Type locality: Cínovec (Czech Republic). Broken Hill (Australia) and Tsumeb (Namibia) produce museum specimens.");
  if (c.habit === 'dipyramidal') parts.push(narrative_variant('stolzite', 'dipyramidal') || 'Dipyramidal — {101} faces, Broken Hill / Tsumeb display habit.');
  else parts.push(narrative_variant('stolzite', 'tabular_default') || 'Tabular — {001} plates, late-stage habit.');
  return parts.filter(p => p).join(' ');
},

  _narrate_olivenite(c) {
  // Prose lives in narratives/olivenite.md.
  const parts = [`Olivenite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('olivenite') || "Cu₂AsO₄(OH) — orthorhombic Cu arsenate, the Cu end of the olivenite-adamite series. Olive-green to grayish-green (the Cu chromophore — olive in name and color), Mohs 3-4. Cornwall is the type locality; Tsumeb and Bisbee produce showcase modern specimens. When Zn > Cu, adamite takes priority.");
  if (c.habit === 'fibrous') parts.push(narrative_variant('olivenite', 'fibrous') || "Fibrous — radiating acicular bundles, the Cornish 'wood-copper' silky habit.");
  else if (c.habit === 'prismatic') parts.push(narrative_variant('olivenite', 'prismatic') || 'Prismatic — the Cornwall display habit.');
  else parts.push(narrative_variant('olivenite', 'globular_default') || 'Globular — Tsumeb / Bisbee secondary habit.');
  return parts.filter(p => p).join(' ');
},

  _narrate_nickeline(c) {
  // Prose lives in narratives/nickeline.md.
  const parts = [`Nickeline #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('nickeline') || "NiAs — hexagonal nickel arsenide.");
  if (c.habit === 'reniform') parts.push(narrative_variant('nickeline', 'reniform') || 'Reniform / botryoidal.');
  else if (c.habit === 'columnar') parts.push(narrative_variant('nickeline', 'columnar') || 'Columnar.');
  else parts.push(narrative_variant('nickeline', 'massive_default') || 'Massive granular.');
  if (c.dissolved) parts.push(narrative_variant('nickeline', 'oxidative_dissolution') || 'Oxidative dissolution.');
  else if (c.zones && c.zones.length > 12) parts.push(narrative_variant('nickeline', 'tarnish') || 'Tarnish.');
  return parts.filter(p => p).join(' ');
},

  _narrate_millerite(c) {
  // Prose lives in narratives/millerite.md.
  const parts = [`Millerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('millerite') || "NiS — trigonal nickel sulfide.");
  if (c.habit === 'capillary') parts.push(narrative_variant('millerite', 'capillary') || 'Capillary.');
  else if (c.habit === 'acicular') parts.push(narrative_variant('millerite', 'acicular') || 'Acicular.');
  else parts.push(narrative_variant('millerite', 'massive_default') || 'Massive granular.');
  if (c.dissolved) parts.push(narrative_variant('millerite', 'oxidative_dissolution') || 'Oxidative dissolution.');
  return parts.filter(p => p).join(' ');
},

  _narrate_cobaltite(c) {
  // Prose lives in narratives/cobaltite.md. JS gains glaucodot_series
  // dispatch (Python had it; trace_Fe avg threshold).
  const parts = [`Cobaltite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('cobaltite') || "CoAsS — orthorhombic cobalt sulfarsenide.");
  if (c.habit === 'pyritohedral') parts.push(narrative_variant('cobaltite', 'pyritohedral') || 'Pyritohedral.');
  else if (c.habit === 'reniform') parts.push(narrative_variant('cobaltite', 'reniform') || 'Reniform.');
  else parts.push(narrative_variant('cobaltite', 'massive_default') || 'Massive granular.');
  const avgFe = c.zones.reduce((s, z) => s + (z.trace_Fe || 0), 0) / Math.max(c.zones.length, 1);
  if (avgFe > 0.3) parts.push(narrative_variant('cobaltite', 'glaucodot_series'));
  if (c.dissolved) parts.push(narrative_variant('cobaltite', 'oxidative_dissolution') || 'Oxidative dissolution.');
  return parts.filter(p => p).join(' ');
},

  _narrate_native_tellurium(c) {
  // Prose lives in narratives/native_tellurium.md.
  const parts = [`Native tellurium #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_tellurium') || 'Te — elemental tellurium.');
  if (c.habit === 'prismatic_hex') parts.push(narrative_variant('native_tellurium', 'prismatic_hex') || 'Hexagonal prismatic.');
  else if (c.habit === 'reticulated') parts.push(narrative_variant('native_tellurium', 'reticulated') || 'Reticulated.');
  else parts.push(narrative_variant('native_tellurium', 'granular_default') || 'Granular massive.');
  if ((c.position || '').includes('native_gold')) parts.push(narrative_variant('native_tellurium', 'on_native_gold') || 'Note position — nucleated on native gold.');
  if (c.dissolved) parts.push(narrative_variant('native_tellurium', 'oxidative_dissolution') || 'Oxidative dissolution.');
  else if (c.zones && c.zones.length > 6) parts.push(narrative_variant('native_tellurium', 'tellurite_tarnish') || 'Tellurite tarnish.');
  return parts.filter(p => p).join(' ');
},

  _narrate_native_sulfur(c) {
  // Prose lives in narratives/native_sulfur.md.
  const parts = [`Native sulfur #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_sulfur') || 'S — elemental sulfur.');
  if (c.habit === 'bipyramidal_alpha') parts.push(narrative_variant('native_sulfur', 'bipyramidal_alpha') || 'α-Sulfur bipyramidal.');
  else if (c.habit === 'prismatic_beta') parts.push(narrative_variant('native_sulfur', 'prismatic_beta') || 'β-Sulfur prismatic.');
  else if (c.habit === 'sublimation_crust') parts.push(narrative_variant('native_sulfur', 'sublimation_crust') || 'Sublimation crust.');
  if ((c.position || '').includes('celestine')) parts.push(narrative_variant('native_sulfur', 'on_celestine') || 'Nucleated on celestine.');
  else if ((c.position || '').includes('aragonite') || (c.position || '').includes('selenite')) parts.push(narrative_variant('native_sulfur', 'biogenic_caprock') || 'Sedimentary biogenic context.');
  if (c.dissolved) parts.push(narrative_variant('native_sulfur', 'oxidative_dissolution') || 'Oxidative dissolution.');
  return parts.filter(p => p).join(' ');
},

  _narrate_native_arsenic(c) {
  // Prose lives in narratives/native_arsenic.md.
  const parts = [`Native arsenic #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_arsenic') || 'As — elemental arsenic, the pariah of the periodic table.');
  if (c.habit === 'reniform') parts.push(narrative_variant('native_arsenic', 'reniform') || 'Reniform / botryoidal.');
  else if (c.habit === 'rhombohedral_crystal') parts.push(narrative_variant('native_arsenic', 'rhombohedral_crystal') || 'Rhombohedral crystal — RARE.');
  else if (c.habit === 'arsenolamprite') parts.push(narrative_variant('native_arsenic', 'arsenolamprite') || 'Arsenolamprite — Bi-rich variety.');
  else parts.push(narrative_variant('native_arsenic', 'massive_default') || 'Massive granular — the Freiberg ore form.');
  if (c.dissolved) parts.push(narrative_variant('native_arsenic', 'oxidative_dissolution') || 'Oxidative dissolution.');
  else if (c.zones && c.zones.length > 8) parts.push(narrative_variant('native_arsenic', 'arsenolite_tarnish') || 'Arsenolite tarnish.');
  return parts.filter(p => p).join(' ');
},

  _narrate_native_silver(c) {
  // Prose lives in narratives/native_silver.md.
  const parts = [`Native silver #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('native_silver') || "Ag — elemental silver, the only native element bright enough to make you rich just by looking at it wrong. Cubic isometric (Fm3̄m), Mohs 2.5-3, specific gravity 10.5 (one of the heaviest native metals). The chemistry novelty: native silver only forms where every sulfur atom is already claimed and the fluid is strongly reducing — the inverse of normal supersaturation logic. Every Kongsberg wire grew in a calcite-vein basement pocket where no sulfide source was anywhere nearby.");
  if (c.habit === 'wire') {
    parts.push(narrative_variant('native_silver', 'wire') || "Wire silver — the collector's prize. Epithermal, low-T, open-vug habit; the thread of metal curls through the void as the depletion-driven supersaturation is exhausted along the growth front. Kongsberg's wires reach 30+ cm (Bjørlykke 1959).");
  } else if (c.habit === 'dendritic') {
    parts.push(narrative_variant('native_silver', 'dendritic') || 'Dendritic silver — fern-like plates, the Cobalt-Ontario habit. Branching emerges when diffusion-limited growth outruns the depletion zone, splits, and self-replicates in two dimensions.');
  } else if (c.habit === 'cubic_crystal') {
    parts.push(narrative_variant('native_silver', 'cubic_crystal') || "Cubic crystal — RARE habit. Native silver almost never grows as well-formed isometric crystals; the diffusion-limited geometry of low-S reducing fluid favors wires and dendrites.");
  } else {
    parts.push(narrative_variant('native_silver', 'massive') || 'Massive native silver — hackly metallic mass, the Keweenaw nugget habit. Forms when Ag concentration is high enough that the depletion zone is locally exhausted before delicate morphologies develop.');
  }
  if (c.twinned && (c.twin_law || '').includes('{111}')) {
    parts.push(narrative_variant('native_silver', 'penetration_twin') || '{111} penetration twin — two cubes interlocked along a {111} composition plane. Diagnostic when present, rare in nature.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('native_silver', 'tarnishing_full') || 'Tarnishing — S has returned to the fluid and is skinning the surface with acanthite. Geologically inevitable.');
  } else if (c.zones && c.zones.length > 20) {
    parts.push(narrative_variant('native_silver', 'tarnishing_early') || 'The fresh-broken metallic luster has begun to dull — atmospheric S is reaching the surface and the first molecular layer of acanthite is forming.');
  }
  if ((c.position || '').includes('acanthite')) {
    parts.push(narrative_variant('native_silver', 'on_acanthite') || "Note position — this crystal nucleated on a dissolving acanthite. That's the supergene Ag-enrichment cycle: primary acanthite oxidizes, releases Ag⁺, the Ag⁺ migrates down the redox gradient and re-precipitates as native silver in a deeper reducing pocket. Same Ag atoms, different mineral, same vug.");
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_barite(c) {
  // Prose lives in narratives/barite.md. JS narrator added in this
  // commit to close a JS-side gap (Python had a narrator; JS dispatch
  // would silently emit nothing for barite).
  const parts = [`Barite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('barite'));
  if (c.habit === 'tabular') parts.push(narrative_variant('barite', 'tabular'));
  else if (c.habit === 'bladed') parts.push(narrative_variant('barite', 'bladed'));
  else if (c.habit === 'cockscomb') parts.push(narrative_variant('barite', 'cockscomb'));
  else if (c.habit === 'prismatic') parts.push(narrative_variant('barite', 'prismatic'));
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  if (anyNote.includes('celestobarite')) parts.push(narrative_variant('barite', 'celestobarite'));
  if (anyNote.includes('honey-yellow')) parts.push(narrative_variant('barite', 'honey_yellow'));
  parts.push(narrative_variant('barite', 'industrial_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_celestine(c) {
  // Prose lives in narratives/celestine.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Celestine #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('celestine'));
  if (c.habit === 'nodular') parts.push(narrative_variant('celestine', 'nodular'));
  else if (c.habit === 'fibrous') parts.push(narrative_variant('celestine', 'fibrous'));
  else if (c.habit === 'bladed') parts.push(narrative_variant('celestine', 'bladed'));
  else parts.push(narrative_variant('celestine', 'tabular_default'));
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  if (anyNote.includes('barytocelestine')) parts.push(narrative_variant('celestine', 'barytocelestine'));
  if (anyNote.includes('Sicilian') || anyNote.includes('sulfur-vug')) parts.push(narrative_variant('celestine', 'sicilian_paragenesis'));
  parts.push(narrative_variant('celestine', 'industrial_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_anhydrite(c) {
  // Prose lives in narratives/anhydrite.md. JS narrator added in this
  // commit to close a JS-side gap. The massive_granular branch splits
  // at c_length_mm < 100 into sabkha vs porphyry sub-variants.
  const parts = [`Anhydrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('anhydrite'));
  if (c.habit === 'massive_granular') {
    parts.push(narrative_variant('anhydrite', c.c_length_mm < 100 ? 'massive_granular_sabkha' : 'massive_granular_porphyry'));
  } else if (c.habit === 'prismatic') {
    parts.push(narrative_variant('anhydrite', 'prismatic'));
  } else if (c.habit === 'fibrous') {
    parts.push(narrative_variant('anhydrite', 'fibrous'));
  } else {
    parts.push(narrative_variant('anhydrite', 'tabular_default'));
  }
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  if (anyNote.includes('angelite')) parts.push(narrative_variant('anhydrite', 'angelite'));
  if (c.dissolved) parts.push(narrative_variant('anhydrite', 'rehydration_to_gypsum'));
  parts.push(narrative_variant('anhydrite', 'industrial_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_argentite(c) {
  // Prose lives in narratives/argentite.md.
  const parts = [`Argentite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('argentite') || "Ag₂S — body-centered cubic silver sulfide, the high-T polymorph stable only above 173°C.");
  if (c.habit === 'cubic') parts.push(narrative_variant('argentite', 'cubic') || 'Cubic — sharp {100} faces.');
  else if (c.habit === 'octahedral') parts.push(narrative_variant('argentite', 'octahedral') || 'Octahedral — {111} faces dominant.');
  else if (c.habit === 'arborescent') parts.push(narrative_variant('argentite', 'arborescent') || 'Arborescent — dendritic / wire-like aggregates.');
  if (c.twinned && (c.twin_law || '').includes('spinel')) {
    parts.push(narrative_variant('argentite', 'spinel_twin') || 'Spinel-law penetration twin.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_jarosite(c) {
  // Prose lives in narratives/jarosite.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Jarosite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('jarosite'));
  if (c.habit === 'earthy_crust') parts.push(narrative_variant('jarosite', 'earthy_crust'));
  else if (c.habit === 'druzy') parts.push(narrative_variant('jarosite', 'druzy'));
  else parts.push(narrative_variant('jarosite', 'pseudocubic_default'));
  if (c.dissolved) parts.push(narrative_variant('jarosite', 'alkaline_shift'));
  parts.push(narrative_variant('jarosite', 'mars_connection'));
  return parts.filter(p => p).join(' ');
},

  _narrate_alunite(c) {
  // Prose lives in narratives/alunite.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Alunite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('alunite'));
  if (c.habit === 'earthy') parts.push(narrative_variant('alunite', 'earthy'));
  else if (c.habit === 'fibrous') parts.push(narrative_variant('alunite', 'fibrous'));
  else if (c.habit === 'tabular') parts.push(narrative_variant('alunite', 'tabular'));
  else parts.push(narrative_variant('alunite', 'pseudocubic_default'));
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  if (anyNote.includes('pinkish') || anyNote.includes('natroalunite')) parts.push(narrative_variant('alunite', 'pinkish_natroalunite'));
  if (c.dissolved) parts.push(narrative_variant('alunite', 'dissolved_alkaline_thermal'));
  parts.push(narrative_variant('alunite', 'ar_ar_geochronology'));
  return parts.filter(p => p).join(' ');
},

  _narrate_brochantite(c) {
  // Prose lives in narratives/brochantite.md. JS narrator added in this
  // commit to close a JS-side gap. Note the dissolved branch interpolates
  // a computed {cause} string (alkalinization vs acidification).
  const parts = [`Brochantite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('brochantite'));
  if (c.habit === 'drusy_crust') parts.push(narrative_variant('brochantite', 'drusy_crust'));
  else if (c.habit === 'acicular_tuft') parts.push(narrative_variant('brochantite', 'acicular_tuft'));
  else if (c.habit === 'short_prismatic') parts.push(narrative_variant('brochantite', 'short_prismatic'));
  else parts.push(narrative_variant('brochantite', 'botryoidal_default'));
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  if (anyNote.includes('Cl-rich')) parts.push(narrative_variant('brochantite', 'cl_rich'));
  if (c.dissolved) {
    const cause = (c.zones || []).some(z => (z.note || '').includes('pH > 7'))
      ? 'alkalinization (pH > 7) → tenorite/malachite stable'
      : 'acidification (pH < 3) → antlerite stable';
    parts.push(narrative_variant('brochantite', 'dissolved_pH_fork', { cause }));
  }
  parts.push(narrative_variant('brochantite', 'patina_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_antlerite(c) {
  // Prose lives in narratives/antlerite.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Antlerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('antlerite'));
  if (c.habit === 'granular') parts.push(narrative_variant('antlerite', 'granular'));
  else if (c.habit === 'acicular') parts.push(narrative_variant('antlerite', 'acicular'));
  else if (c.habit === 'short_prismatic') parts.push(narrative_variant('antlerite', 'short_prismatic'));
  else parts.push(narrative_variant('antlerite', 'drusy_default'));
  if (c.dissolved) parts.push(narrative_variant('antlerite', 'dissolved_neutralization'));
  const anyNote = (c.zones || []).map(z => z.note || '').join(' ');
  const onBrochantite = (c.zones || []).some(z => (z.note || '').includes('on dissolving brochantite')) || anyNote.includes('pH-fork');
  if (onBrochantite) parts.push(narrative_variant('antlerite', 'on_dissolving_brochantite'));
  parts.push(narrative_variant('antlerite', 'pragmatic_tail'));
  return parts.filter(p => p).join(' ');
},

  _narrate_chalcanthite(c) {
  // Prose lives in narratives/chalcanthite.md. JS narrator added in this
  // commit to close a JS-side gap.
  const parts = [`Chalcanthite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('chalcanthite'));
  if (c.habit === 'stalactitic') parts.push(narrative_variant('chalcanthite', 'stalactitic'));
  else if (c.habit === 'tabular') parts.push(narrative_variant('chalcanthite', 'tabular'));
  else parts.push(narrative_variant('chalcanthite', 'efflorescent_default'));
  if (c.twinned && (c.twin_law || '').includes('cruciform')) parts.push(narrative_variant('chalcanthite', 'cruciform_twin'));
  if (c.dissolved) parts.push(narrative_variant('chalcanthite', 'cyclic_dissolution'));
  return parts.filter(p => p).join(' ');
},

  _narrate_scorodite(c) {
  // Prose lives in narratives/scorodite.md. JS narrator added in this
  // commit. Dipyramidal habit splits at avg trace_Fe > 0.15 into Fe-rich
  // vs pale sub-variants (matches Python).
  const parts = [`Scorodite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('scorodite'));
  if (c.habit === 'dipyramidal') {
    const avgFe = (c.zones || []).reduce((s, z) => s + (z.trace_Fe || 0), 0) / Math.max((c.zones || []).length, 1);
    parts.push(narrative_variant('scorodite', avgFe > 0.15 ? 'dipyramidal_fe_rich' : 'dipyramidal_pale'));
  } else {
    parts.push(narrative_variant('scorodite', 'earthy_default'));
  }
  if (c.dissolved) parts.push(narrative_variant('scorodite', 'dissolved_arsenic_remobilization'));
  return parts.filter(p => p).join(' ');
},

  _narrate_ferrimolybdite(c) {
  // Prose lives in narratives/ferrimolybdite.md. JS narrator added in this
  // commit. Habit strings 'acicular tuft' and 'fibrous mat' have spaces —
  // preserved as-is.
  const parts = [`Ferrimolybdite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('ferrimolybdite'));
  if (c.habit === 'acicular tuft') parts.push(narrative_variant('ferrimolybdite', 'acicular_tuft'));
  else if (c.habit === 'fibrous mat') parts.push(narrative_variant('ferrimolybdite', 'fibrous_mat'));
  else parts.push(narrative_variant('ferrimolybdite', 'powdery_default'));
  if (c.dissolved) parts.push(narrative_variant('ferrimolybdite', 'dehydration'));
  return parts.filter(p => p).join(' ');
},

  _narrate_selenite(c) {
  // Prose lives in narratives/selenite.md. JS canonical with Python
  // branches added (cathedral_blade habit, swallowtail_twin variant,
  // dissolved variant). User direction 2026-04-30: keep JS poetry,
  // fold Python branches on top.
  const parts = [`Selenite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_variant('selenite', 'epigraph') || 'The crystal that grows when everything else is ending.');
  if (c.habit === 'rosette') {
    parts.push(narrative_variant('selenite', 'rosette') || 'Desert rose form — lenticular plates radiating from a center, trapping sand between the blades. Not a flower, but a crystal that grew through sand, incorporating the ground into itself.');
  } else if (c.habit && c.habit.includes('fibrous')) {
    parts.push(narrative_variant('selenite', 'fibrous') || "Satin spar habit — parallel fibers with a chatoyant sheen that catches light like cat's-eye. The crystals grew in a confined vein, forced into alignment by the narrow space.");
  } else if (c.habit === 'cathedral_blade') {
    parts.push(narrative_variant('selenite', 'cathedral_blade'));
  } else {
    parts.push(narrative_variant('selenite', 'blades_default', { mm: c.c_length_mm.toFixed(1) }) || `Transparent blades (${c.c_length_mm.toFixed(1)} mm) with perfect cleavage — so clear you can read through them. Selenite is named for Selene, the moon, for its soft pearly luster.`);
  }
  if (c.position.includes('pyrite') || c.position.includes('chalcopyrite')) {
    parts.push(narrative_variant('selenite', 'on_sulfide') || 'It nucleated on an oxidized sulfide surface — the sulfur that once locked up iron now combines with calcium as sulfate. Gypsum is the gravestone of pyrite. The same sulfur, a different life.');
  }
  if (c.twinned && (c.twin_law || '').includes('swallowtail')) {
    parts.push(narrative_variant('selenite', 'swallowtail_twin', { twin_law: c.twin_law }) || `Swallow-tail twinned (${c.twin_law}) — two blades meeting at an acute angle, like a bird frozen in flight. One of the most recognizable twin forms in mineralogy.`);
  }
  if (c.c_length_mm > 10) {
    parts.push(narrative_variant('selenite', 'giant_naica') || 'Large selenite crystals are among the biggest in nature — the Cave of Crystals in Naica, Mexico holds selenite beams 11 meters long, grown over 500,000 years in water just 2°C above saturation. Patience beyond patience.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('selenite', 'dissolved'));
  }
  parts.push(narrative_variant('selenite', 'epilogue_tail') || "Selenite forms in the last stage of a vug's life — when the fluid cools, the sulfides oxidize, and the water begins to evaporate. It is the epilogue crystal.");
  return parts.filter(p => p).join(' ');
},

  _narrate_adamite(c) {
  // Prose lives in narratives/adamite.md (boss-pushed canonical 2026-04-30).
  // Boss direction: JS tone + Python facts blend. Use Python's avg_Cu
  // dispatch logic (more precise than JS FLUORESCENT-note check), keep
  // JS-derived prose in markdown variants. Blurb is the opening line;
  // closing is always-emitted tail.
  const parts = [];
  parts.push(narrative_blurb('adamite', { crystal_id: c.crystal_id }));
  const avgCu = c.zones.reduce((s, z) => s + (z.trace_Cu || 0), 0) / Math.max(c.zones.length, 1);
  const cuproNote = c.zones.some(z => (z.note || '').includes('cuproadamite'));
  if (avgCu > 0.5 || cuproNote) parts.push(narrative_variant('adamite', 'fluorescent'));
  else parts.push(narrative_variant('adamite', 'non_fluorescent'));
  if (c.position.includes('goethite') || c.position.includes('hematite')) {
    parts.push(narrative_variant('adamite', 'on_goethite'));
  }
  if (c.habit === 'acicular sprays') parts.push(narrative_variant('adamite', 'acicular'));
  const activeOli = (this && this.crystals) ? this.crystals.filter(oc => oc.mineral === 'olivenite' && oc.active) : [];
  if (activeOli.length) parts.push(narrative_variant('adamite', 'olivenite_companion'));
  if (c.dissolved) parts.push(narrative_variant('adamite', 'dissolved'));
  parts.push(narrative_closing('adamite'));
  return parts.filter(p => p).join(' ');
},

  _narrate_mimetite(c) {
  // Prose lives in narratives/mimetite.md. Drift consolidation: JS-side
  // dispatch (3-way habit + tail) was richer than Python's; Python now
  // matches JS. JS gains a unified opening line that includes mm size
  // (matches Python pattern) and the on_galena variant uses Python's
  // chemistry-focused prose. Acid_dissolution is preserved (was Python-only).
  const parts = [`Mimetite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('mimetite'));
  if (c.habit && c.habit.includes('campylite')) {
    parts.push(narrative_variant('mimetite', 'campylite') || 'Campylite variety — the hexagonal prisms have curved, barrel-shaped faces from iron substituting for lead. The name comes from the Greek "kampylos" (bent). These are among the most sought-after mimetite specimens: orange-brown barrels with an almost waxy luster.');
  } else if (c.habit === 'prismatic') {
    parts.push(narrative_variant('mimetite', 'prismatic') || 'Hexagonal prisms — the classic apatite supergroup habit. Mimetite, pyromorphite, and vanadinite are all Pb₅(XO₄)₃Cl where X is As, P, or V respectively. Same structure, different chemistry, all beautiful.');
  } else {
    parts.push(narrative_variant('mimetite', 'tabular_default') || 'Tabular crystals with a resinous to adamantine luster. The lead gives them density — you can feel the weight of a mimetite specimen in your hand.');
  }
  if (c.position.includes('galena')) {
    parts.push(narrative_variant('mimetite', 'on_galena') || 'Growing on galena — its parent mineral. Galena (PbS) oxidizes, liberating lead into solution. That lead meets arsenic and chlorine in the oxidation zone and reprecipitates as mimetite.');
  }
  if (c.dissolved) parts.push(narrative_variant('mimetite', 'acid_dissolution'));
  parts.push(narrative_variant('mimetite', 'imitator_tail') || 'Mimetite\'s name means "imitator" — it was confused with pyromorphite for centuries because they\'re isostructural. Only chemistry tells them apart.');
  return parts.filter(p => p).join(' ');
},

  _narrate_apophyllite(c) {
  // Prose lives in narratives/apophyllite.md.
  const parts = [`Apophyllite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('apophyllite') || "KCa₄Si₈O₂₀(F,OH)·8H₂O — a tetragonal sheet silicate, technically a phyllosilicate that's classed with the zeolites because of its hydrated, vesicle-filling behavior. Stage III Deccan Traps mineral.");
  if (c.habit === 'prismatic_tabular') parts.push(narrative_variant('apophyllite', 'prismatic_tabular') || 'Pseudo-cubic tabular habit — the hallmark apophyllite block.');
  else if (c.habit === 'hopper_growth') parts.push(narrative_variant('apophyllite', 'hopper_growth') || 'Stepped/terraced faces — high-supersaturation hopper habit.');
  else if (c.habit === 'druzy_crust') parts.push(narrative_variant('apophyllite', 'druzy_crust') || 'Fine-grained drusy coating — the very-high-σ form.');
  else parts.push(narrative_variant('apophyllite', 'chalcedony_pseudomorph') || "Chalcedony pseudomorph — at low σ the crystal grew over an earlier zeolite blade.");
  const hematite_zones = c.zones.filter(z => z.note && z.note.includes('hematite needle phantom'));
  if (hematite_zones.length) {
    parts.push(narrative_variant('apophyllite', 'bloody_phantoms', { count: hematite_zones.length }) || `${hematite_zones.length} growth zones carry hematite needle phantoms — this is the 'bloody apophyllite' variety from Nashik.`);
  }
  if (c.position && c.position.includes('hematite')) {
    parts.push(narrative_variant('apophyllite', 'on_hematite') || 'Nucleated directly on a pre-existing hematite — the iron oxide became the seed for vesicle filling.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('apophyllite', 'dissolved') || 'Acid attack dissolved the crystal — apophyllite is an alkaline-stable phase.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_tetrahedrite(c) {
  // Prose lives in narratives/tetrahedrite.md.
  const parts = [`Tetrahedrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('tetrahedrite') || "Cu₁₂Sb₄S₁₃ — steel-gray metallic, the Sb-endmember of the fahlore solid-solution series.");
  if (c.habit === 'tetrahedral') parts.push(narrative_variant('tetrahedrite', 'tetrahedral') || 'Classic {111} tetrahedra — the namesake habit.');
  else if (c.habit === 'crustiform') parts.push(narrative_variant('tetrahedrite', 'crustiform') || 'Crustiform banding on the fracture wall.');
  else if (c.habit === 'druzy_coating') parts.push(narrative_variant('tetrahedrite', 'druzy_coating') || 'Fine-grained drusy surface.');
  else parts.push(narrative_variant('tetrahedrite', 'massive_default') || 'Massive granular aggregates.');
  if (c.position && c.position.includes('chalcopyrite')) parts.push(narrative_variant('tetrahedrite', 'on_chalcopyrite') || 'Growing on chalcopyrite.');
  if (c.dissolved) parts.push(narrative_variant('tetrahedrite', 'oxidative_dissolution') || 'Oxidative dissolution.');
  return parts.filter(p => p).join(' ');
},

  _narrate_tennantite(c) {
  // Prose lives in narratives/tennantite.md.
  const parts = [`Tennantite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('tennantite') || "Cu₁₂As₄S₁₃ — the As counterpart to tetrahedrite.");
  if (c.habit === 'tetrahedral') parts.push(narrative_variant('tennantite', 'tetrahedral') || 'Classic {111} tetrahedra.');
  else if (c.habit === 'crustiform') parts.push(narrative_variant('tennantite', 'crustiform') || 'Crustiform banded crust.');
  else if (c.habit === 'druzy_coating') parts.push(narrative_variant('tennantite', 'druzy_coating') || 'Fine-grained drusy surface.');
  else parts.push(narrative_variant('tennantite', 'massive_default') || 'Massive granular.');
  if (c.position && c.position.includes('tetrahedrite')) parts.push(narrative_variant('tennantite', 'alongside_tetrahedrite') || 'Growing alongside tetrahedrite.');
  if (c.dissolved) parts.push(narrative_variant('tennantite', 'oxidative_dissolution') || 'Oxidative dissolution.');
  return parts.filter(p => p).join(' ');
},

  _narrate_erythrite(c) {
  // Prose lives in narratives/erythrite.md. JS gains paragenetic_source_cobaltite
  // dispatch (Python had it; sim crystal scan).
  const parts = [`Erythrite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('erythrite') || "Co₃(AsO₄)₂·8H₂O — the crimson-pink cobalt arsenate, known to medieval miners as 'cobalt bloom.' A supergene product: primary cobalt arsenides (cobaltite, skutterudite) oxidized in surface waters, releasing Co²⁺ and arsenate that recombined in damp fractures.");
  if (c.habit === 'radiating_fibrous') {
    parts.push(narrative_variant('erythrite', 'radiating_fibrous') || 'Radiating fibrous sprays directly on a primary Co-arsenide substrate — the classic Schneeberg and Bou Azzer habit: the outer shell of an oxidizing cobaltite or skutterudite vein blooms pink.');
  } else if (c.habit === 'bladed_crystal') {
    parts.push(narrative_variant('erythrite', 'bladed_crystal') || 'Striated prismatic {010} blades, transparent crimson — the rare and prized erythrite crystal form, sharp enough to be mistaken for a kämmererite until the pink hue settles the identification.');
  } else if (c.habit === 'botryoidal_crust') {
    parts.push(narrative_variant('erythrite', 'botryoidal_crust') || 'Botryoidal rounded aggregates — high-supersaturation coating, mineral grape clusters spreading across the fracture wall.');
  } else {
    parts.push(narrative_variant('erythrite', 'earthy_default') || "Earthy pink crust — the classic 'cobalt bloom' field appearance, the first hint to a prospector that a cobalt arsenide is weathering nearby.");
  }
  if (c.position && (c.position.includes('cobaltite') || c.position.includes('arsenide'))) {
    parts.push(narrative_variant('erythrite', 'on_substrate', { position: c.position }) || `Growing on ${c.position} — direct replacement texture, the cobalt is moving centimeters at a time from primary sulfide to secondary arsenate.`);
  }
  const dissolvingCob = (this && this.crystals) ? this.crystals.filter(cb => cb.mineral === 'cobaltite' && cb.dissolved) : [];
  if (dissolvingCob.length && !(c.position || '').includes('cobaltite')) {
    parts.push(narrative_variant('erythrite', 'paragenetic_source_cobaltite', { cobaltite_id: dissolvingCob[0].crystal_id }));
  }
  if (c.dissolved) {
    parts.push(narrative_variant('erythrite', 'dehydration') || 'Dehydration or acid dissolution broke down the crystal — erythrite holds eight waters of crystallization in its structure, and they go first: above 200°C or below pH 4.5, the lattice collapses.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_annabergite(c) {
  // Prose lives in narratives/annabergite.md. JS gains paragenetic_source_*
  // dispatch (Python had it; sim crystal scan for nickeline + millerite).
  const parts = [`Annabergite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('annabergite') || "Ni₃(AsO₄)₂·8H₂O — 'nickel bloom,' the pale apple-green counterpart to erythrite. Same vivianite-group structure, nickel substitutes for cobalt, and the color shifts from crimson to green. Formed by oxidation of primary Ni-arsenides like niccolite and gersdorffite.");
  if (c.habit === 'cabrerite') {
    parts.push(narrative_variant('annabergite', 'cabrerite') || 'Mg substituted for Ni — this is cabrerite, the pale-green to white variety, named for the Sierra Cabrera in Spain. The Mg content bleaches the color toward off-white.');
  } else if (c.habit === 'co_bearing') {
    parts.push(narrative_variant('annabergite', 'co_bearing') || 'Co was also present in the fluid — the crystal shifted toward a pinkish-green intermediate, physically tracking the Ni/Co ratio along the erythrite-annabergite solid solution.');
  } else if (c.habit === 'capillary_crystal') {
    parts.push(narrative_variant('annabergite', 'capillary_crystal') || "Capillary hair-like fibers — the rare high-σ habit. Silky sprays of apple-green filaments, a collector's prize when intact.");
  } else {
    parts.push(narrative_variant('annabergite', 'earthy_default') || 'Earthy apple-green crust — the field appearance, an unmistakable green stain in the oxidation zone of any nickel-arsenide deposit.');
  }
  const dissolvingNik = (this && this.crystals) ? this.crystals.filter(nk => nk.mineral === 'nickeline' && nk.dissolved) : [];
  const dissolvingMil = (this && this.crystals) ? this.crystals.filter(ml => ml.mineral === 'millerite' && ml.dissolved) : [];
  if (dissolvingNik.length) {
    parts.push(narrative_variant('annabergite', 'paragenetic_source_nickeline', { nickeline_id: dissolvingNik[0].crystal_id }));
  } else if (dissolvingMil.length) {
    parts.push(narrative_variant('annabergite', 'paragenetic_source_millerite', { millerite_id: dissolvingMil[0].crystal_id }));
  }
  if (c.dissolved) {
    parts.push(narrative_variant('annabergite', 'dehydration') || 'Dehydration or acid dissolution consumed the crystal — like erythrite, annabergite is a hydrated arsenate with eight lattice waters and little stability outside a narrow T/pH window.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_goethite(c) {
  // Prose lives in narratives/goethite.md.
  const parts = [`Goethite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  if (c.position.includes('pseudomorph after pyrite')) {
    parts.push(narrative_variant('goethite', 'pseudomorph_after_pyrite') || "It replaced pyrite atom-for-atom — the classic boxwork pseudomorph. What looks like a rusty pyrite cube is actually goethite that has inherited the sulfide's habit while the Fe-S lattice dissolved and Fe-O-OH precipitated in its place. The Egyptian Prophecy Stones' cousin — the rusty ghost of a crystal that was.");
  } else if (c.position.includes('pseudomorph after chalcopyrite')) {
    parts.push(narrative_variant('goethite', 'pseudomorph_after_chalcopyrite') || "Chalcopyrite oxidized and goethite took its place — a copper sulfide's iron heir. The copper went to malachite; the iron stayed here.");
  } else if (c.position.includes('hematite')) {
    parts.push(narrative_variant('goethite', 'on_hematite') || 'Nucleated on hematite — the hydrated/anhydrous iron oxide pair coexist in oxidation zones, separated only by how much water the fluid carried.');
  }
  if (c.habit === 'botryoidal/stalactitic') {
    parts.push(narrative_variant('goethite', 'botryoidal_stalactitic') || "Built up into stalactitic, botryoidal masses — the velvety black surfaces that collectors call 'black goethite.' Each layer a separate pulse of Fe-saturated water.");
  } else if (c.habit === 'fibrous_acicular') {
    parts.push(narrative_variant('goethite', 'fibrous_acicular') || 'Radiating needle habit — the fibrous goethite that grows as velvet crusts on cavity walls when Fe³⁺-rich fluid seeps slowly.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('goethite', 'acid_dissolution') || 'Acid attack released Fe³⁺ back to the fluid. Goethite survives oxidation but not strong acid — the rusty armor has a pH floor.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_uraninite(c) {
  // Prose lives in narratives/uraninite.md.
  const parts = [`Uraninite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm ☢️.`];
  parts.push(narrative_blurb('uraninite') || "UO₂ — pitch-black, submetallic, one of Earth's densest oxides.");
  if (c.nucleation_temp > 400) parts.push(narrative_variant('uraninite', 'pegmatite_high_t') || 'Nucleated at high temperature — a pegmatite-scale uraninite.');
  else parts.push(narrative_variant('uraninite', 'roll_front_low_t') || 'Low-T uraninite — the sedimentary / roll-front style.');
  if (c.dissolved) parts.push(narrative_variant('uraninite', 'oxidative_dissolution') || 'Partial dissolution as O₂ invaded the system.');
  return parts.filter(p => p).join(' ');
},

  _narrate_galena(c) {
  // Prose lives in narratives/galena.md.
  const parts = [`Galena #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('galena') || "PbS — the densest common sulfide (SG 7.6), perfect cubic cleavage, bright lead-gray metallic luster. Pick up a piece and it's surprisingly heavy; tap it and it cleaves into perfect little cubes.");
  if (c.twinned) {
    parts.push(narrative_variant('galena', 'spinel_twin', { twin_law: c.twin_law }) || `Twinned on the ${c.twin_law} — spinel-law twins create striking interpenetrating cubes in galena, rare but diagnostic.`);
  }
  const hasAg = c.zones.some(z => (z.note || '').includes('Ag'));
  if (hasAg) {
    parts.push(narrative_variant('galena', 'argentiferous') || "The fluid carried silver — argentiferous galena, the historic source of most of the world's silver (Potosí, Leadville, Broken Hill).");
  }
  if (c.dissolved) {
    parts.push(narrative_variant('galena', 'oxidative_breakdown') || 'Oxidation attacked the galena — Pb²⁺ went into solution and can reprecipitate as cerussite (PbCO₃), anglesite (PbSO₄), or — if Mo is present — wulfenite (PbMoO₄).');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_molybdenite(c) {
  // Prose lives in narratives/molybdenite.md.
  const parts = [`Molybdenite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('molybdenite') || 'MoS₂ — soft hexagonal platy crystals, bluish-gray metallic, greasy to the touch. Softest metallic mineral on Mohs (1–1.5); leaves a mark on paper like graphite.');
  if (c.nucleation_temp >= 300 && c.nucleation_temp <= 500) {
    parts.push(narrative_variant('molybdenite', 'porphyry_sweet_spot') || 'Nucleated in the porphyry sweet spot — Mo arrived in a separate pulse from Cu (Seo et al. 2012, Bingham Canyon), a late magmatic fluid delivering molybdenum on its own timeline.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('molybdenite', 'oxidative_dissolution') || 'Oxidation dissolved the molybdenite, releasing MoO₄²⁻ into solution. If Pb is also present in the oxidation zone, the combination becomes wulfenite — the sunset mineral.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_rosasite(c) {
  // Prose lives in narratives/rosasite.md (mirror of aurichalcite).
  const parts = [`Rosasite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('rosasite') || "(Cu,Zn)₂(CO₃)(OH)₂ — monoclinic supergene carbonate, the Cu-dominant member of the rosasite-aurichalcite pair. Velvety blue-green spheres on the weathered face of Cu-Zn sulfide deposits. The crystal exists because chalcopyrite and sphalerite weathered together upstream and released their metals into the same carbonate-rich groundwater — and at the moment of nucleation, the fluid carried more Cu than Zn. A single ratio decides which species forms; the same broth with reversed proportions would have produced aurichalcite instead. Mohs 4, blue-green streak.");
  if (c.habit === 'acicular_radiating') {
    parts.push(narrative_variant('rosasite', 'acicular_radiating') || "Acicular radiating habit — the slow-grown, low-T form. Needle-like aggregates fanning out from a common origin, fibrous internal structure visible under magnification.");
  } else if (c.habit === 'botryoidal') {
    parts.push(narrative_variant('rosasite', 'botryoidal') || "Botryoidal habit — the diagnostic rosasite form. Velvety spherical aggregates, mammillary crusts; the textbook specimens from Mapimi (Mexico) are sky-blue spheres on red limonite that look like planets in a rusted solar system.");
  } else {
    parts.push(narrative_variant('rosasite', 'encrusting_mammillary') || "Encrusting mammillary habit — thin crust at low supersaturation. Less aesthetic than the diagnostic spheres but more abundant in the field.");
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_torbernite(c) {
  // Prose lives in narratives/torbernite.md.
  const parts = [`Torbernite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('torbernite') || "Cu(UO₂)₂(PO₄)₂·12H₂O — tetragonal uranyl phosphate, the phosphate branch of the autunite-group anion-competition trio (with zeunerite for arsenate and carnotite for vanadate). Emerald-green tabular plates that look like green mica; non-fluorescent because the Cu²⁺ in the lattice quenches the uranyl emission that would otherwise make this mineral glow. The crystal exists because uraninite weathered upstream, releasing mobile U⁶⁺ into oxidizing groundwater that also carried Cu and phosphate — and at the moment of nucleation, phosphate dominated arsenate in the local fluid. Mohs 2-2.5, ☢️ radioactive (the U⁶⁺ decays slowly inside the crystal lattice it builds).");
  if (c.habit === 'micaceous_book') parts.push(narrative_variant('torbernite', 'micaceous_book') || "Micaceous book habit — stacked subparallel plates, the high-σ Musonoi (Katanga, DRC) form. Looks like someone pressed sheets of green glass into a single specimen.");
  else if (c.habit === 'tabular_plates') parts.push(narrative_variant('torbernite', 'tabular_plates') || "Tabular plates flattened on {001} — the diagnostic Schneeberg habit. Square or octagonal outlines, thin enough to flake, the textbook torbernite specimen.");
  else parts.push(narrative_variant('torbernite', 'earthy_crust') || "Earthy crust — low-σ encrustation on fracture surfaces. Less aesthetic than the diagnostic plates but more abundant in the field.");
  if (c.nucleation_temp > 60) {
    parts.push(narrative_variant('torbernite', 'metatorbernite_warning') || "Note: this crystal grew near the metatorbernite transition temperature (~75°C). Continued heat would drive irreversible dehydration to the 8-H₂O metatorbernite form — a one-way conversion.");
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_zeunerite(c) {
  // Prose lives in narratives/zeunerite.md.
  const parts = [`Zeunerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('zeunerite') || "Cu(UO₂)₂(AsO₄)₂·(10-16)H₂O — tetragonal uranyl arsenate, the arsenate branch of the autunite-group trio. Visually almost indistinguishable from torbernite — same emerald-green color, same square tabular habit, same micaceous cleavage — distinguishable in the field only by chemistry. The arsenic is the giveaway: zeunerite localities are almost always former mining districts with arsenopyrite or tennantite as primary As-bearing ores. The fluid that grew this crystal carried more arsenate than phosphate at the moment of nucleation; in a parallel run with the ratio inverted, this same broth would have grown torbernite instead. Mohs 2.5, ☢️ radioactive (U + As both decay-active).");
  if (c.habit === 'micaceous_book') parts.push(narrative_variant('zeunerite', 'micaceous_book') || "Micaceous book habit — stacked subparallel plates, the high-σ Schneeberg form. Type-locality material.");
  else if (c.habit === 'tabular_plates') parts.push(narrative_variant('zeunerite', 'tabular_plates') || "Tabular plates flattened on {001} — the diagnostic Schneeberg/Cínovec habit. Identical in shape to torbernite; chemistry is the only discriminator.");
  else parts.push(narrative_variant('zeunerite', 'scaly_encrustation') || "Scaly encrustation — low-σ thin overlapping plates coating fracture surfaces.");
  return parts.filter(p => p).join(' ');
},

  _narrate_carnotite(c) {
  // Prose lives in narratives/carnotite.md.
  const parts = [`Carnotite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('carnotite') || "K₂(UO₂)₂(VO₄)₂·3H₂O — monoclinic uranyl vanadate, the vanadate branch of the autunite-group anion-competition trio (with torbernite for phosphate and zeunerite for arsenate). The mineral that paints the desert: bright canary-yellow, so chromatically aggressive that one percent of it stains an entire Jurassic sandstone outcrop the color of school buses and hazard tape. The Colorado Plateau uranium districts were prospected by following yellow stains across mesa tops decades before scintillometers existed. Mohs ~2 (soft, earthy), ☢️ radioactive, non-fluorescent (the vanadate matrix quenches the uranyl emission that would otherwise make this mineral glow).");
  if (c.habit === 'tabular_plates') parts.push(narrative_variant('carnotite', 'tabular_plates') || "Rare crystalline habit — diamond-shaped plates flattened on {001}, the collector's prize. Crystalline carnotite is genuinely uncommon; almost all carnotite in nature is the earthy/powdery form.");
  else if (c.habit === 'earthy_crust') parts.push(narrative_variant('carnotite', 'earthy_crust') || "Canary-yellow earthy crust — the diagnostic Colorado Plateau habit. Forms as crusts on sandstone, often concentrated around petrified wood and carbonaceous shales where ancient organic matter trapped uranium from circulating groundwater.");
  else parts.push(narrative_variant('carnotite', 'powdery_disseminated') || "Powdery yellow disseminations — the sandstone-stain form. Doesn't crystallize so much as it stains; the stain is the habit.");
  if (c.nucleation_temp < 30) {
    parts.push(narrative_variant('carnotite', 'roll_front') || "Cool nucleation (~ambient surface temperatures) — consistent with the roll-front geological setting where oxidizing meteoric water encounters a reducing barrier and drops both U and V into the same yellow precipitate.");
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_autunite(c) {
  // Prose lives in narratives/autunite.md. Round 9d (May 2026) Ca-cation
  // analog of torbernite — the cation fork's narrative payoff is the
  // fluorescence (Ca²⁺ doesn't quench like Cu²⁺ does).
  const parts = [`Autunite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm ☢️.`];
  parts.push(narrative_blurb('autunite') || "Ca(UO₂)₂(PO₄)₂·11H₂O — same parent fluid as torbernite, opposite cation. Where torbernite's Cu²⁺ quenches the uranyl emission cold, autunite's Ca²⁺ leaves it alone. Bright canary-yellow tabular plates that glow intense apple-green under longwave UV.");
  if (c.habit === 'micaceous_book') {
    parts.push(narrative_variant('autunite', 'micaceous_book') || "Stacked subparallel plates — the Margnac and Spruce Pine book habit. High σ pushes successive {001} layers to nucleate atop each other rather than spreading laterally.");
  } else if (c.habit === 'tabular_plates') {
    parts.push(narrative_variant('autunite', 'tabular_plates') || "The default Saint-Symphorien habit — thin square yellow plates flattened on {001}, looking like uranium-saturated mica. Brongniart described these from Autun in 1852.");
  } else {
    parts.push(narrative_variant('autunite', 'encrusting') || "Earthy yellow staining — the 'yellow uranium ore' appearance prospectors used to track on sandstone outcrops.");
  }
  if ((c.position || '').includes('uraninite')) {
    parts.push(narrative_variant('autunite', 'on_weathering_uraninite') || 'This autunite grew on a dissolving uraninite — the canonical paragenesis. Reducing fluid put the U⁴⁺ down as primary uraninite; meteoric oxidation flipped U⁴⁺ to mobile UO₂²⁺ and the dissolving uraninite released its uranyl directly into local Ca + PO₄-bearing groundwater.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('autunite', 'acid_dissolution') || 'Acid attack — pH below 4.5 destabilizes uranyl phosphates. Ca²⁺ floats free, the uranyl ion goes back into solution, the phosphate joins the broth.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_uranospinite(c) {
  // Prose lives in narratives/uranospinite.md. Round 9e (May 2026)
  // Ca-cation analog of zeunerite. The cation fork's narrative payoff
  // on the As-branch — Ca²⁺ doesn't quench like Cu²⁺ does in zeunerite.
  const parts = [`Uranospinite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm ☢️.`];
  parts.push(narrative_blurb('uranospinite') || "Ca(UO₂)₂(AsO₄)₂·10H₂O — same chemistry stage as zeunerite, opposite cation. Yellow tabular plates that glow yellow-green under longwave UV.");
  if (c.habit === 'micaceous_book') {
    parts.push(narrative_variant('uranospinite', 'micaceous_book') || "Stacked subparallel plates — high σ at cool T pushes successive {001} layers into a stacked book.");
  } else if (c.habit === 'tabular_plates') {
    parts.push(narrative_variant('uranospinite', 'tabular_plates') || "The default Schneeberg habit — thin square plates flattened on {001}, looking like a yellow autunite.");
  } else {
    parts.push(narrative_variant('uranospinite', 'encrusting') || "Earthy yellow encrustation — low σ, thin yellow surface staining on the host rock.");
  }
  if ((c.position || '').includes('uraninite')) {
    parts.push(narrative_variant('uranospinite', 'on_weathering_uraninite') || 'Grew on a dissolving uraninite — the canonical paragenesis.');
  } else if ((c.position || '').includes('arsenopyrite')) {
    parts.push(narrative_variant('uranospinite', 'on_weathering_arsenopyrite') || 'Grew adjacent to a dissolving arsenopyrite — the As source.');
  } else if ((c.position || '').includes('zeunerite')) {
    parts.push(narrative_variant('uranospinite', 'on_zeunerite') || 'Adjacent to active zeunerite — the Cu-cation partner. Where Cu dominates the pore, zeunerite plates; where Ca dominates, uranospinite.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('uranospinite', 'acid_dissolution') || 'Acid attack — pH below 4.5 destabilizes the autunite-group framework.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_tyuyamunite(c) {
  // Prose lives in narratives/tyuyamunite.md. Round 9e (May 2026)
  // Ca-cation analog of carnotite — orthorhombic instead of monoclinic.
  const parts = [`Tyuyamunite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm ☢️.`];
  parts.push(narrative_blurb('tyuyamunite') || "Ca(UO₂)₂(VO₄)₂·5-8H₂O — same chemistry stage as carnotite, opposite cation. Two species, one mechanism, drawn apart by which alkaline-earth/alkali metal happens to dominate the local groundwater.");
  if (c.habit === 'tabular_plates') {
    parts.push(narrative_variant('tyuyamunite', 'tabular_plates') || "Rare crystalline tyuyamunite — diamond-shaped plates flattened on {001}, the Tyuya-Muyun form.");
  } else if (c.habit === 'earthy_crust') {
    parts.push(narrative_variant('tyuyamunite', 'earthy_crust') || "Canary-yellow earthy crust — the standard sandstone-staining habit.");
  } else {
    parts.push(narrative_variant('tyuyamunite', 'powdery_disseminated') || "Powdery yellow disseminations — the sandstone-stain form.");
  }
  if ((c.position || '').includes('carnotite')) {
    parts.push(narrative_variant('tyuyamunite', 'carnotite_companion') || 'This tyuyamunite is the calcium twin to a carnotite growing in the same pocket. The fluid Ca/K ratio decided which one each grain became.');
  } else if ((c.position || '').includes('uraninite')) {
    parts.push(narrative_variant('tyuyamunite', 'on_weathering_uraninite') || 'Grew on a dissolving uraninite — the canonical paragenetic chain.');
  } else if ((c.position || '').includes('roll-front')) {
    parts.push(narrative_variant('tyuyamunite', 'roll_front') || 'Roll-front position — concentrated around organic carbon.');
  }
  if (c.dissolved) {
    parts.push(narrative_variant('tyuyamunite', 'acid_dissolution') || 'Acid attack — pH below 5 destabilizes the uranyl-vanadate framework.');
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_aurichalcite(c) {
  // Prose lives in narratives/aurichalcite.md. Code dispatches on
  // habit; markdown owns the words. Inline fallbacks for offline.
  const parts = [`Aurichalcite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
  parts.push(narrative_blurb('aurichalcite') || "(Zn,Cu)₅(CO₃)₂(OH)₆ — monoclinic supergene carbonate, the Zn-dominant mirror of rosasite. Pale blue-green tufted sprays so delicate that hardness 2 means a fingernail scratches them. Named for orichalcum, the mythical gold-alloy of Atlantis. The crystal formed because the weathering fluid happened to carry more Zn than Cu at the moment of nucleation; in a parallel run with the ratio inverted, this same broth would have grown rosasite instead. The two species are typically intergrown wherever both elements are present, the ratio drawing a chemical boundary through the mineral assemblage.");
  if (c.habit === 'tufted_spray') {
    parts.push(narrative_variant('aurichalcite', 'tufted_spray') || "Tufted divergent sprays — the diagnostic aurichalcite habit. Acicular crystals fanning out from a common origin, looking like frozen fireworks or sea anemones; the type material from Loktevskoye (1839) and the most aesthetic specimens from Mapimi are this form.");
  } else if (c.habit === 'radiating_columnar') {
    parts.push(narrative_variant('aurichalcite', 'radiating_columnar') || "Radiating spherical aggregates — denser than the default sprays, formed at higher supersaturation.");
  } else {
    parts.push(narrative_variant('aurichalcite', 'laminar_crust') || "Thin laminar crust — low-σ encrusting habit, common on mine walls where weathering supplied a steady but modest flux of Zn + Cu + CO₃.");
  }
  return parts.filter(p => p).join(' ');
},

  _narrate_mixing_event(batch, event) {
  const mineral_names = new Set(batch.map(c => c.mineral));
  const parts = [];
  if (mineral_names.has('sphalerite') && mineral_names.has('fluorite')) {
    parts.push("When metal-bearing brine met sulfur-bearing groundwater, sphalerite (ZnS) and fluorite (CaF₂) nucleated simultaneously — a classic Mississippi Valley-type precipitation event. The zinc and sulfur couldn't coexist in solution; they combined on contact and the minerals fell out of the fluid like rain.");
  } else if (mineral_names.has('sphalerite')) {
    parts.push("Sphalerite nucleated as zinc-bearing brine mixed with sulfur-rich groundwater. The two fluids were stable apart; together, ZnS became insoluble.");
  }
  return parts.join(' ');
},

  _narrate_tectonic(batch) {
  const twinned = this.crystals.filter(c => c.twinned);
  if (twinned.length) {
    const names = twinned.map(c => `${c.mineral} #${c.crystal_id}`);
    return ` The stress may have induced twinning in ${names.join(', ')}. Twin planes formed as the crystal lattice accommodated the sudden strain — a record of the event frozen in the structure.`;
  }
  return ' No visible twinning resulted, but the pressure change altered subsequent growth conditions.';
},

  _narrate_collectors_view() {
  const parts = ['A collector examining this specimen would find:'];
  for (const c of this.crystals) {
    if (c.total_growth_um < 10 && !c.zones.length) continue;

    if (c.mineral === 'quartz') {
      if (c.c_length_mm > 2) {
        let desc = `a ${c.c_length_mm.toFixed(1)}mm quartz crystal`;
        if (c.twinned) desc += ` (${c.twin_law} twinned)`;
        const fi_count = c.zones.filter(z => z.fluid_inclusion).length;
        if (fi_count > 3) desc += ' with visible fluid inclusions';
        parts.push(`  • ${desc}`);
      } else if (c.c_length_mm > 0.1) {
        parts.push('  • tiny quartz crystals on the vug wall');
      }
    } else if (c.mineral === 'calcite') {
      const fl = c.predict_fluorescence();
      let desc = `a ${c.c_length_mm.toFixed(1)}mm ${c.habit} calcite`;
      if (c.twinned) desc += ' (twinned)';
      if (fl.includes('orange')) desc += ' — glows orange under UV';
      else if (fl.includes('quenched')) desc += " — patchy UV response (Mn zones glow, Fe zones dark)";
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'aragonite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm aragonite`;
      if (c.habit === 'twinned_cyclic') desc += ' six-pointed cyclic twin';
      else if (c.habit === 'acicular_needle') desc = `acicular aragonite spray, ${c.c_length_mm.toFixed(1)}mm`;
      else if (c.habit === 'flos_ferri') desc = `flos ferri aragonite — dendritic 'iron flower', ${c.c_length_mm.toFixed(1)}mm`;
      else desc += ' columnar prism';
      if (c.twinned && c.habit !== 'twinned_cyclic') desc += ` (${c.twin_law})`;
      desc += ' — orthorhombic CaCO₃';
      if (c.dissolved) desc += ', converted to calcite (pseudomorph)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'rhodochrosite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm rhodochrosite`;
      if (c.habit === 'rhombohedral') desc += " 'button' rhombohedron";
      else if (c.habit === 'scalenohedral') desc += " scalenohedral 'dog-tooth'";
      else if (c.habit === 'stalactitic') desc = `stalactitic rhodochrosite, ${c.c_length_mm.toFixed(1)}mm — concentric rose-pink banding`;
      else desc += ' banded crust';
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — pink to raspberry-red MnCO₃';
      if (c.dissolved) desc += ', oxidized to black Mn-oxide rind';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'dolomite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm dolomite`;
      if (c.habit === 'saddle_rhomb') desc += ' saddle-shaped curved rhomb';
      else if (c.habit === 'coarse_rhomb') desc += ' coarse rhombohedron';
      else desc += ' massive granular';
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — white CaMg(CO₃)₂';
      if (c.dissolved) desc += ', acid-dissolved';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'siderite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm siderite`;
      if (c.habit === 'rhombohedral') desc += " 'saddle' rhombohedron";
      else if (c.habit === 'scalenohedral') desc += " scalenohedral";
      else if (c.habit === 'spherulitic') desc = `spherosiderite concretion, ${c.c_length_mm.toFixed(1)}mm`;
      else desc += ' botryoidal crust';
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — tan to brown FeCO₃';
      if (c.dissolved) desc += ', oxidized to goethite/limonite (diagenetic pseudomorph)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'sphalerite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm sphalerite`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.zones.length) {
        const last_note = c.zones[c.zones.length - 1].note;
        if (last_note.includes('color:')) {
          const color = last_note.split('color:')[1].split(',')[0].trim();
          desc += `, ${color}`;
        }
      }
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'wurtzite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm wurtzite`;
      if (c.habit === 'hemimorphic_crystal') desc += ' hexagonal pyramid';
      else if (c.habit === 'radiating_columnar') desc = `radiating wurtzite columns, ${c.c_length_mm.toFixed(1)}mm across`;
      else if (c.habit === 'fibrous_coating') desc = `fibrous wurtzite crust, ${c.c_length_mm.toFixed(1)}mm thick`;
      else desc += ' tabular plate';
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — hexagonal (Zn,Fe)S, darker than cubic sphalerite';
      if (c.dissolved) desc += ', inverted to sphalerite on cooling';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'fluorite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm fluorite cube`;
      if (c.twinned) desc += ' (penetration twin)';
      const fl = c.predict_fluorescence();
      if (fl !== 'non-fluorescent' && !fl.includes('opaque')) desc += ` — fluoresces ${fl.split('(')[0].trim()}`;
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'pyrite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm pyrite`;
      if (c.habit === 'framboidal') {
        desc = 'framboidal pyrite aggregate';
      } else if (c.habit === 'pyritohedral') {
        desc += ' pyritohedron';
      } else {
        desc += ' cube';
      }
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — bright metallic luster';
      if (c.dissolved) desc += ', partially oxidized (limonite staining)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'marcasite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm marcasite`;
      if (c.habit === 'cockscomb') {
        desc += ' cockscomb';
      } else if (c.habit === 'spearhead') {
        desc += ' spearhead';
      } else if (c.habit === 'radiating_blade') {
        desc = `radiating marcasite blades, ${c.c_length_mm.toFixed(1)}mm across`;
      } else {
        desc += ' tabular plate';
      }
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — pale brass, iridescent tarnish';
      if (c.dissolved) desc += ', partially replaced by pyrite (metastable inversion)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'chalcopyrite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm chalcopyrite`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      desc += ' — brassy yellow, greenish tint';
      if (c.dissolved) desc += ', oxidation rind (green Cu carbonate staining)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'hematite') {
      let desc;
      if (c.habit === 'specular') {
        desc = `a ${c.c_length_mm.toFixed(1)}mm specular hematite`;
        if (c.zones.some(z => z.note && z.note.includes('iridescent'))) {
          desc += ' — iridescent rainbow plates';
        } else {
          desc += ' — brilliant metallic silver-black plates';
        }
      } else if (c.habit === 'botryoidal') {
        desc = `a ${c.c_length_mm.toFixed(1)}mm botryoidal hematite — kidney-ore, dark metallic`;
      } else if (c.habit === 'rhombohedral') {
        desc = `a ${c.c_length_mm.toFixed(1)}mm rhombohedral hematite — sharp dark crystals`;
      } else {
        desc = 'earthy red hematite mass';
      }
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.dissolved) desc += ', partially dissolved';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'malachite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm malachite`;
      if (c.habit === 'banded') {
        desc += ' — banded green, concentric layers';
      } else if (c.habit === 'fibrous/acicular') {
        desc += ' — sprays of acicular green needles';
      } else {
        desc += ' — botryoidal green masses';
      }
      if (c.dissolved) desc += ', partially dissolved (acid attack)';
      if (c.position.includes('chalcopyrite')) desc += ' (on chalcopyrite — oxidation paragenesis)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'uraninite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm uraninite cube — dense, black, radioactive`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      parts.push(`  • ☢️ ${desc}`);
    } else if (c.mineral === 'galena') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm galena — lead-gray, perfect cubic cleavage`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.dissolved) desc += ', partially oxidized';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'smithsonite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm smithsonite`;
      const lastNote = c.zones.length ? c.zones[c.zones.length - 1].note : '';
      if (lastNote.includes('blue-green')) desc += ' — blue-green (Cu impurity)';
      else if (lastNote.includes('pink')) desc += ' — pink (Mn impurity)';
      else if (lastNote.includes('yellow')) desc += ' — yellow-brown (Fe impurity)';
      else desc += ' — white to pale blue';
      if (c.position.includes('sphalerite')) desc += ' (on oxidized sphalerite)';
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'wulfenite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm wulfenite — bright orange tabular plates`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.position.includes('galena')) desc += ' (on galena)';
      parts.push(`  • 🟠 ${desc}`);
    } else if (c.mineral === 'selenite') {
      const dName = crystalDisplayName(c);
      let desc = `a ${c.c_length_mm.toFixed(1)}mm ${dName}`;
      if (c.habit === 'rosette') desc += ' — lenticular plates with sand inclusions';
      else if (c.habit && c.habit.includes('fibrous')) desc += ' — chatoyant silky fibers';
      else desc += ' — transparent blades, pearly luster';
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.position.includes('pyrite') || c.position.includes('chalcopyrite')) desc += ' (on oxidized sulfide surface)';
      parts.push(`  • 💎 ${desc}`);
    } else if (c.mineral === 'feldspar') {
      const dName = crystalDisplayName(c);
      let desc = `a ${c.c_length_mm.toFixed(1)}mm ${dName}`;
      if (dName === 'amazonite') desc += ' — green from Pb²⁺ substitution';
      else if (c.mineral_display === 'albite' && c.habit.includes('cleavelandite')) desc += ' — platy white blades';
      else if (c.mineral_display === 'sanidine') desc += ' — glassy, high-temperature';
      else if (c.mineral_display === 'adularia') desc += ' — pseudo-orthorhombic, alpine habit';
      else if (c.mineral_display === 'orthoclase') desc += ' — prismatic, partially ordered';
      else if (c.mineral_display === 'microcline') desc += ' — fully ordered, triclinic';
      if (c.twinned) desc += ` (${c.twin_law})`;
      if (c.zones.some(z => z.note && z.note.includes('perthite'))) desc += ' with perthite exsolution (possible moonstone)';
      parts.push(`  • 🏔️ ${desc}`);
    } else if (c.mineral === 'goethite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm goethite — earthy brown-yellow`;
      parts.push(`  • ${desc}`);
    } else if (c.mineral === 'adamite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm adamite`;
      const isFluorescent = c.zones.some(z => z.note && z.note.includes('FLUORESCENT') && !z.note.includes('NON-'));
      if (isFluorescent) desc += ' — vivid green (cuproadamite), UV-fluorescent 💚';
      else desc += ' — yellow-green, non-fluorescent';
      if (c.habit === 'acicular sprays') desc += ', fan-shaped sprays';
      if (c.position.includes('goethite') || c.position.includes('hematite')) desc += ' (on iron oxide)';
      if (c.dissolved) desc += ', partially dissolved';
      parts.push(`  • 💚 ${desc}`);
    } else if (c.mineral === 'mimetite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm mimetite`;
      if (c.habit && c.habit.includes('campylite')) desc += ' — orange-brown barrel-shaped campylite!';
      else desc += ' — yellow-orange hexagonal prisms';
      if (c.position.includes('galena')) desc += ' (on galena — child on parent)';
      if (c.dissolved) desc += ', partially dissolved';
      parts.push(`  • 🟡 ${desc}`);
    } else if (c.mineral === 'molybdenite') {
      let desc = `a ${c.c_length_mm.toFixed(1)}mm molybdenite`;
      desc += ' — bluish-gray hexagonal plates, soft and sectile';
      if (c.dissolved) desc += ', oxidized — MoO₄²⁻ released to fluid';
      else desc += '. The Mo source for wulfenite if conditions oxidize.';
      parts.push(`  • ${desc}`);
    } else {
      // Catch-all for any future minerals
      let desc = `a ${c.c_length_mm.toFixed(1)}mm ${c.mineral}`;
      if (c.twinned) desc += ` (${c.twin_law})`;
      parts.push(`  • ${desc}`);
    }
  }

  if (parts.length === 1) return "The vug produced only microscopic crystals — a thin crust on the cavity wall.";
  return parts.join('\n');
},
});
