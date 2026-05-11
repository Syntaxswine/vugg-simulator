// ============================================================
// js/27-geometry-crystal.ts — GrowthZone + Crystal
// ============================================================
// Mirror of vugg/geometry/crystal.py. GrowthZone is one annotated
// growth ring (per step the crystal grew); Crystal owns the list of
// zones plus identity / habit / dominant_forms / dissolved flags.
//
// Phase B6 of PROPOSAL-MODULAR-REFACTOR.

// ============================================================
// CRYSTAL MODELS
// ============================================================

class GrowthZone {
  // Dynamic dataclass-style fields — runtime untouched.
  [key: string]: any;
  constructor(opts: any = {}) {
    this.step = opts.step ?? 0;
    this.temperature = opts.temperature ?? 0;
    this.thickness_um = opts.thickness_um ?? 0;
    this.growth_rate = opts.growth_rate ?? 0;
    this.trace_Fe = opts.trace_Fe ?? 0;
    this.trace_Mn = opts.trace_Mn ?? 0;
    this.trace_Al = opts.trace_Al ?? 0;
    this.trace_Ti = opts.trace_Ti ?? 0;
    this.trace_Pb = opts.trace_Pb ?? 0;
    this.trace_Au = opts.trace_Au ?? 0;  // invisible-gold trace (arsenopyrite)
    this.fluid_inclusion = opts.fluid_inclusion ?? false;
    this.inclusion_type = opts.inclusion_type ?? '';
    this.note = opts.note ?? '';
    this.ca_from_wall = opts.ca_from_wall ?? 0.0;
    this.ca_from_fluid = opts.ca_from_fluid ?? 0.0;
    this.is_phantom = opts.is_phantom ?? false;
    this.dissolution_depth_um = opts.dissolution_depth_um ?? 0.0;
    // Phase 1e completion: which dissolution mode the engine chose
    // (e.g. 'oxidative' | 'acid' | 'polymorph' | 'inversion' | 'low_co3' | 'thermal'
    // | 'dehydration'). Read by applyMassBalance to dispatch the credit
    // through MINERAL_DISSOLUTION_RATES[mineral].__modes[mode]. Optional —
    // single-mode (legacy) entries don't need it; the wrapper falls
    // through to the first declared mode when missing.
    if (opts.dissolutionMode) this.dissolutionMode = opts.dissolutionMode;
  }
}

class Crystal {
  // Dynamic dataclass-style fields — runtime untouched.
  [key: string]: any;
  constructor(opts: any = {}) {
    this.mineral = opts.mineral ?? '';
    this.crystal_id = opts.crystal_id ?? 0;
    this.nucleation_step = opts.nucleation_step ?? 0;
    this.nucleation_temp = opts.nucleation_temp ?? 0;
    this.position = opts.position ?? 'vug wall';
    this.c_length_mm = 0;
    this.a_width_mm = 0;
    this.habit = opts.habit ?? 'prismatic';
    this.dominant_forms = opts.dominant_forms ? [...opts.dominant_forms] : [];
    this.twinned = false;
    this.twin_law = '';
    // Growth-vector footprint (chosen from MINERAL_SPEC habit_variants at
    // nucleation time). Drives the topo map: wall_spread = lateral coverage,
    // void_reach = projection into the vug interior. vector is the
    // categorical style (projecting / coating / tabular / equant / dendritic).
    this.wall_spread = opts.wall_spread ?? 0.5;
    this.void_reach = opts.void_reach ?? 0.5;
    this.vector = opts.vector ?? 'equant';
    // Anchor cell on the wall where this crystal nucleated.
    // WallState paints outward from here by wall_spread ×
    // total_growth. null for crystals that haven't been anchored yet.
    //
    // PHASE-1-CAVITY-MESH (PROPOSAL-CAVITY-MESH §5): wall_center_cell
    // and wall_ring_index are now LEGACY fields kept in sync with
    // wall_anchor.{cellIdx,ringIdx}. New code should call
    // WallState._resolveAnchor(crystal) → {ringIdx, cellIdx} instead
    // of reading them directly. Slated for removal in Phase 4 once
    // every touchpoint has migrated. During Phase 1 both routes return
    // byte-identical values (no SIM_VERSION bump).
    this.wall_center_cell = opts.wall_center_cell ?? null;
    this.wall_ring_index = opts.wall_ring_index ?? null;
    // PHASE-1-CAVITY-MESH: spherical-coordinate anchor on the cavity
    // wall. Truth-bearing field for the crystal's position; legacy
    // (wall_ring_index, wall_center_cell) are derived caches. Shape:
    //   { phi: number, theta: number, ringIdx: number, cellIdx: number }
    // where phi ∈ [0,π] (south pole 0, north pole π) and theta ∈ [0,2π).
    // null = pre-Phase-1 saves or tests; consumers fall back to legacy
    // fields in that case. See WallState._anchorFromRingCell /
    // WallState._resolveAnchor.
    this.wall_anchor = opts.wall_anchor ?? null;
    // Environment at nucleation time. 'fluid' (the dominant case —
    // vug fluid-filled, geometric-selection orientation along the
    // substrate normal) or 'air' (drained / cave-style cavity,
    // gravity-driven orientation: stalactite c-axis points world-
    // down regardless of substrate normal). Default 'fluid' for
    // legacy / unset; air-mode currently never triggers (no scenario
    // sets it yet). Companion: σ=12° Gaussian c-axis scatter in
    // _renderCrystalWireframe (geometric-selection literature).
    this.growth_environment = opts.growth_environment ?? 'fluid';
    this.zones = [];
    this.total_growth_um = 0;
    this.active = true;
    this.dissolved = false;
    this.phantom_surfaces = [];
    this.phantom_count = 0;
    // Enclosure: crystals this one has swallowed, and the host that
    // swallowed this one (if any). Drives the topo map's inclusion
    // dots and the Sweetwater-style narration.
    this.enclosed_crystals = [];
    this.enclosed_at_step = [];
    this.enclosed_by = null;
    // Paramorph tracking — set by applyParamorphTransitions when the crystal
    // crosses a phase-transition T (Round 8a-2: argentite → acanthite at 173°C).
    // Stores the *original* (pre-transition) mineral name so library + narrator
    // can flag the cubic-acanthite-after-argentite case.
    this.paramorph_origin = opts.paramorph_origin ?? null;
    this.paramorph_step = opts.paramorph_step ?? null;
    // v28 dehydration tracking — counts steps in a dry environment
    // for crystals listed in DEHYDRATION_TRANSITIONS.
    this.dry_exposure_steps = opts.dry_exposure_steps ?? 0;
    // Q2a paragenesis tracking — set by sim.nucleate when this
    // crystal is born via a CDR (coupled dissolution-precipitation)
    // route per Putnis 2002/2009. cdr_replaces_crystal_id points to
    // the parent crystal whose dissolution fed this nucleation;
    // perimorph_eligible flags shape_preserved=true routes (per
    // boss directive 2026-05-06: schema anticipates Q4 perimorph
    // mechanic even before renderer wires it). Q3 renderer reads
    // cdr_replaces_crystal_id to inherit parent outline; Q4 renderer
    // uses perimorph_eligible to decide if the crystal should
    // persist as a hollow cast when later dissolved.
    this.cdr_replaces_crystal_id = opts.cdr_replaces_crystal_id ?? null;
    this.perimorph_eligible = opts.perimorph_eligible ?? false;
    // Cavity diameter at nucleation time, used by add_zone to cap
    // c_length / a_width so individual crystals can't grow past the
    // cavity walls. See BUG-CRYSTALS-CLIP-VUG-WALL.md (Tier 2 fix). The
    // cap is the spatial counterpart to the existing global vug-fill
    // check (which limits TOTAL volume across all crystals, but doesn't
    // prevent any single crystal from being oversized). Set by
    // sim.nucleate() at construction; 0 means "no cap" for crystals
    // loaded from legacy saves or constructed in tests.
    this.vug_diameter_mm = opts.vug_diameter_mm ?? 0;
  }

  add_zone(zone) {
    // Apply time compression — more geological time per step = thicker zones
    zone.thickness_um *= timeScale;
    zone.growth_rate *= timeScale;
    // Detect phantom boundaries
    if (zone.thickness_um < 0) {
      zone.is_phantom = true;
      zone.dissolution_depth_um = Math.abs(zone.thickness_um);
      this.phantom_surfaces.push(this.zones.length);
      this.phantom_count++;
    } else if (this.zones.length && this.zones[this.zones.length - 1].thickness_um < 0 && zone.thickness_um > 0) {
      zone.note = (zone.note + ' [phantom boundary — growing over dissolution surface]').trim();
    }
    this.zones.push(zone);
    this.total_growth_um += zone.thickness_um;
    this.c_length_mm = this.total_growth_um / 1000.0;
    if (this.habit === 'prismatic') this.a_width_mm = this.c_length_mm * 0.4;
    else if (this.habit === 'tabular') this.a_width_mm = this.c_length_mm * 1.5;
    else if (this.habit === 'acicular') this.a_width_mm = this.c_length_mm * 0.15;
    else if (this.habit === 'rhombohedral') this.a_width_mm = this.c_length_mm * 0.8;
    // Q5 — snowball habit (Sweetwater-style barite radiating from a
    // sulfide seed): rendered as a sphere primitive. a_width_mm =
    // c_length_mm so the volume formula (4/3)π × c × a² produces an
    // approximately spherical volume (off by 2× from a true sphere
    // but consistent with how cubic habits are accounted; refine in
    // v2 if vug-fill calibration shifts too far).
    else if (this.habit === 'snowball') this.a_width_mm = this.c_length_mm;
    else this.a_width_mm = this.c_length_mm * 0.5;
    // No size cap. Crystals grow to chemistry-true size (boss directive
    // "defer to actual geology" 2026-05-06): in real cavities a crystal
    // that outgrows its container either competes for space, deforms,
    // or extends into surrounding rock — it doesn't get clamped at the
    // wall. The renderer-side per-cell cavity clip (commit 4fb128f)
    // handles the visual: fragments past the local wall radius are
    // discarded per-fragment, so a 60 mm crystal in a 50 mm vug renders
    // its inside-cavity portion and the wall slices the rest invisibly.
    // The earlier v59 sim-side cap (`c_length <= vug_radius`,
    // `a_width <= vug_diameter`) was over-cautious — it predates the
    // per-cell clip and was carrying the load the shader now does.
    // Removed in v61.
  }

  describe_morphology() {
    const forms = this.dominant_forms.length ? this.dominant_forms.join(', ') : this.habit;
    const twin_str = this.twinned ? `, ${this.twin_law} twin` : '';
    // Show in µm if crystal is < 0.1mm, otherwise mm
    let size;
    if (this.c_length_mm < 0.05) {
      const c_um = this.total_growth_um;
      const a_um = c_um * (this.a_width_mm / (this.c_length_mm || 1));
      size = `${c_um.toFixed(1)} × ${(isFinite(a_um) ? a_um : 0).toFixed(1)} µm`;
    } else if (this.c_length_mm < 1.0) {
      size = `${this.c_length_mm.toFixed(2)} × ${this.a_width_mm.toFixed(2)} mm`;
    } else {
      size = `${this.c_length_mm.toFixed(1)} × ${this.a_width_mm.toFixed(1)} mm`;
    }
    return `${this.habit} [${forms}]${twin_str}, ${size}`;
  }

  describe_latest_zone() {
    if (!this.zones.length) return 'no growth';
    const z = this.zones[this.zones.length - 1];
    const parts = [`+${z.thickness_um.toFixed(1)} µm`];
    const traces = [];
    if (z.trace_Fe > 1) traces.push(`Fe ${z.trace_Fe.toFixed(1)}`);
    if (z.trace_Mn > 0.5) traces.push(`Mn ${z.trace_Mn.toFixed(1)}`);
    if (z.trace_Ti > 0.1) traces.push(`Ti ${z.trace_Ti.toFixed(2)}`);
    if (z.trace_Al > 1) traces.push(`Al ${z.trace_Al.toFixed(1)}`);
    if (traces.length) parts.push(`traces: ${traces.join(', ')} ppm`);
    if (z.fluid_inclusion) parts.push(`fluid inclusion (${z.inclusion_type})`);
    if (z.note) parts.push(z.note);
    return parts.join('; ');
  }

  predict_fluorescence() {
    const n = Math.max(this.zones.length, 1);
    const avg_Mn = this.zones.reduce((s, z) => s + z.trace_Mn, 0) / n;
    const avg_Fe = this.zones.reduce((s, z) => s + z.trace_Fe, 0) / n;

    if (this.mineral === 'calcite') {
      if (avg_Mn > 2 && avg_Fe < 10) return 'orange-red (Mn²⁺ activated)';
      if (avg_Mn > 2 && avg_Fe > 10) return 'weak/quenched (Fe²⁺ quenching Mn²⁺ emission)';
      return 'non-fluorescent';
    }
    if (this.mineral === 'fluorite') return 'blue-violet (REE/defect centers)';
    if (this.mineral === 'quartz') {
      const avg_Al = this.zones.reduce((s, z) => s + z.trace_Al, 0) / n;
      if (avg_Al > 5) return 'weak blue (Al-related defects)';
      return 'non-fluorescent';
    }
    if (this.mineral === 'sphalerite' || this.mineral === 'wurtzite') {
      // Mn activates, Fe quenches — same as calcite
      if (avg_Mn > 5 && avg_Fe < 10) return 'orange or blue (Mn²⁺-activated; color varies by site)';
      if (avg_Mn > 5 && avg_Fe > 10) return 'quenched (Fe²⁺ masks Mn²⁺ emission)';
      return 'non-fluorescent';
    }
    if (this.mineral === 'pyrite' || this.mineral === 'marcasite' || this.mineral === 'chalcopyrite' || this.mineral === 'galena' || this.mineral === 'molybdenite' || this.mineral === 'tetrahedrite' || this.mineral === 'tennantite') {
      return 'non-fluorescent (opaque sulfide)';
    }
    if (this.mineral === 'hematite') {
      return 'non-fluorescent (opaque oxide)';
    }
    if (this.mineral === 'goethite') {
      return 'non-fluorescent (opaque hydroxide)';
    }
    if (this.mineral === 'malachite') {
      return 'non-fluorescent';
    }
    if (this.mineral === 'uraninite') {
      return 'weak green-yellow (U) — daughter autunite/torbernite would glow brightly';
    }
    if (this.mineral === 'smithsonite') {
      if (avg_Mn > 2) return 'pink under LW UV (Mn²⁺-activated)';
      return 'blue-green to pale blue (SW UV)';
    }
    if (this.mineral === 'wulfenite') {
      return 'non-fluorescent (typical)';
    }
    if (this.mineral === 'selenite') {
      return 'non-fluorescent (typical gypsum)';
    }
    if (this.mineral === 'adamite') {
      // Cu trace: low Cu → strong SW fluorescence; heavy Cu quenches
      const avg_Cu = this.zones.reduce((s, z) => s + (z.trace_Cu || 0), 0) / n;
      if (avg_Cu > 10) return 'quenched (heavy Cu turns off SW emission)';
      if (avg_Cu > 0.5) return 'bright apple-green under SW UV (cuproadamite)';
      return 'green-yellow under SW UV (intrinsic adamite)';
    }
    if (this.mineral === 'mimetite') {
      return 'orange under SW UV (intrinsic emission)';
    }
    if (this.mineral === 'feldspar') {
      if (this.zones.some(z => (z.note || '').includes('amazonite'))) {
        return 'yellow-green under LW UV (Pb²⁺ activator in amazonite)';
      }
      return 'non-fluorescent or weak white under SW';
    }
    return 'unknown';
  }
}

