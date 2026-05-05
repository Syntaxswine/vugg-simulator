// ============================================================
// js/85-simulator.ts — VugSimulator class + small utilities
// ============================================================
// The run-loop class. Mirror of vugg.VugSimulator (Phase A8 of the
// Python refactor would split this further; for now it lives whole).
//
// Reads from VugConditions / FluidChemistry / WallState, dispatches to
// MINERAL_ENGINES per crystal per step, applies events, runs paramorph
// + dehydration transitions, snapshots wall_state for replay.
//
// Includes the tiny UTILITY block (capitalize) that immediately follows
// the class — too small to warrant its own module yet.
//
// Phase B10 of PROPOSAL-MODULAR-REFACTOR.

class VugSimulator {
  constructor(conditions, events) {
    this.conditions = conditions;
    this._startTemp = conditions.temperature; // remember initial T for thermal pulse ceiling
    this.events = (events || []).slice().sort((a, b) => a.step - b.step);
    this.crystals = [];
    this.crystal_counter = 0;
    this.step = 0;
    this.log = [];
    // Unwrapped topo-map state. v1 uses ring[0] only; the multi-ring
    // structure is in place so future depth-slice rendering doesn't
    // require reshaping storage. initial_radius_mm is frozen at sim
    // start so later per-cell wall_depth reads as "this slice retreated
    // N mm from where it started."
    const d0 = this.conditions.wall.vug_diameter_mm;
    this.wall_state = new WallState({
      vug_diameter_mm: d0,
      initial_radius_mm: d0 / 2,
      // Phase-1 two-stage bubble-merge void shape. Scenarios set these
      // on VugWall; defaults (3 primary, 6 secondary) give a cohesive
      // main cavity with satellite alcoves so scenarios that don't opt
      // in still get an organic dissolution profile.
      primary_bubbles: this.conditions.wall.primary_bubbles,
      secondary_bubbles: this.conditions.wall.secondary_bubbles,
      shape_seed: this.conditions.wall.shape_seed,
    });
    // Per-step snapshot of ring[0] for the Replay button. Captured at
    // the end of each step; small (~120 cells × ~4 numbers × 100-200
    // steps), so the memory cost of a whole run is trivial.
    this.wall_state_history = [];

    // Phase C of PROPOSAL-3D-SIMULATION: per-ring fluid + temperature.
    // Phase C v1 hooks up: each ring has its own FluidChemistry, the
    // growth loop swaps conditions.fluid to ring_fluids[k] for the
    // engine call, and diffusion at end of step equilibrates them.
    // The "equator" ring (index ring_count/2) is aliased to
    // conditions.fluid so events that mutate conditions.fluid hit
    // the equator's ring_fluids slot, and diffusion then spreads
    // them outward to floor and ceiling rings.
    const nRings = this.wall_state.ring_count;
    const equator = Math.floor(nRings / 2);
    this.ring_fluids = [];
    for (let r = 0; r < nRings; r++) {
      this.ring_fluids.push(_cloneFluid(this.conditions.fluid));
    }
    // Alias the equator ring to conditions.fluid so events propagate.
    this.ring_fluids[equator] = this.conditions.fluid;
    this.ring_temperatures = new Array(nRings).fill(this.conditions.temperature);
    this.inter_ring_diffusion_rate = DEFAULT_INTER_RING_DIFFUSION_RATE;
    // Cache the FluidChemistry numeric field names once for the
    // diffusion loop. Pulled from a fresh instance so any future field
    // additions to FluidChemistry pick up automatically — no separate
    // list to keep in sync. Filtered to numeric fields (the only kind
    // FluidChemistry currently has, but defensive).
    this._fluidFieldNames = Object.keys(new FluidChemistry()).filter(
      k => typeof (new FluidChemistry()[k]) === 'number' && k !== 'concentration'
    );
    // v25 vadose-zone oxidation: track previous fluid_surface_ring so
    // we can detect rings that just transitioned wet → dry. Null at
    // construction means "no surface set yet"; first run_step compares
    // against this and applies the override to whatever rings are
    // currently vadose.
    this._prevFluidSurfaceRing = null;
  }

  // Phase C v1: snapshot conditions.fluid + temperature before a
  // global-mutating block (events, wall dissolution, ambient cooling).
  // Pair with _propagateGlobalDelta to apply the same delta to all
  // non-equator rings. Mirrors VugSimulator._snapshot_global in vugg.py.
  _snapshotGlobal() {
    return [_cloneFluid(this.conditions.fluid), this.conditions.temperature];
  }

  // Phase C v1: apply the delta between current conditions and the
  // pre-block snapshot to all non-equator ring_fluids and
  // ring_temperatures. The equator ring is aliased to conditions.fluid
  // so it already reflects the new value — skip it.
  _propagateGlobalDelta(snap) {
    const [preFluid, preTemp] = snap;
    const equator = Math.floor(this.wall_state.ring_count / 2);
    const equatorFluid = this.ring_fluids[equator];  // = conditions.fluid (aliased)
    for (const fname of this._fluidFieldNames) {
      const delta = this.conditions.fluid[fname] - preFluid[fname];
      if (delta === 0) continue;
      for (const rf of this.ring_fluids) {
        if (rf === equatorFluid) continue;
        rf[fname] = rf[fname] + delta;
      }
    }
    const deltaT = this.conditions.temperature - preTemp;
    if (deltaT !== 0) {
      for (let k = 0; k < this.ring_temperatures.length; k++) {
        if (k === equator) {
          this.ring_temperatures[k] = this.conditions.temperature;
        } else {
          this.ring_temperatures[k] += deltaT;
        }
      }
    }
  }

  // v26: drain `porosity × WATER_LEVEL_DRAIN_RATE` rings per step
  // when the water-level mechanic is active. No-op when
  // fluid_surface_ring is null, porosity is 0 (sealed default), or
  // surface is already at 0. Asymmetric: porosity is a pure sink, not
  // a balance term — refilling stays event-driven. Refill events that
  // snap fluid_surface_ring above ring_count get clamped here on the
  // next step (so events can write a sentinel like 1e6 to mean
  // "fill to ceiling" without needing to know ring_count themselves).
  // Mirror of VugSimulator._apply_water_level_drift in vugg.py.
  _applyWaterLevelDrift() {
    let s = this.conditions.fluid_surface_ring;
    if (s === null || s === undefined) return 0;
    const n = this.wall_state.ring_count;
    if (s > n) {
      this.conditions.fluid_surface_ring = n;
      s = n;
    }
    const p = this.conditions.porosity;
    if (p <= 0 || s <= 0) return 0;
    const delta = -p * WATER_LEVEL_DRAIN_RATE;
    const newS = Math.max(0, s + delta);
    this.conditions.fluid_surface_ring = newS;
    return newS - s;
  }

  // v25: detect rings that just transitioned wet → dry (submerged or
  // meniscus → vadose) and force their fluid to oxidizing chemistry.
  // Submerged rings keep the scenario's chemistry, so the cavity floor
  // stays reducing while the now-exposed ceiling oxidizes — matches
  // real-world supergene paragenesis (galena → cerussite, chalcopyrite
  // → malachite/azurite, pyrite → limonite, all in the air zone).
  // Mirror of VugSimulator._apply_vadose_oxidation_override in vugg.py.
  _applyVadoseOxidationOverride() {
    const n = this.wall_state.ring_count;
    const newSurface = this.conditions.fluid_surface_ring;
    const oldSurface = this._prevFluidSurfaceRing;
    this._prevFluidSurfaceRing = newSurface;
    if (newSurface === null || newSurface === undefined) return [];
    if (oldSurface !== null && oldSurface !== undefined && newSurface >= oldSurface) {
      return [];
    }
    const becameVadose = [];
    for (let r = 0; r < n; r++) {
      const was = VugConditions._classifyWaterState(oldSurface, r, n);
      const now = VugConditions._classifyWaterState(newSurface, r, n);
      if (now === 'vadose' && was !== 'vadose') {
        const rf = this.ring_fluids[r];
        if (rf.O2 < 1.8) rf.O2 = 1.8;
        rf.S *= 0.3;
        // v27 evaporative concentration boost (mirror of vugg.py).
        rf.concentration *= EVAPORATIVE_CONCENTRATION_FACTOR;
        becameVadose.push(r);
      }
    }
    return becameVadose;
  }

  // Phase C inter-ring homogenization. One discrete-Laplacian step per
  // fluid component and per temperature, with Neumann (no-flux)
  // boundary conditions at the floor and ceiling rings.
  //
  // Uniform rings → no-op (Laplacian of a constant is zero), which
  // preserves byte-equality for default scenarios. Non-uniform rings
  // relax the gradient by `rate * (neighbor sum - 2*self)` per step.
  //
  // Old values are read into a snapshot before any writes so each
  // ring's update sees the pre-step state of its neighbors —
  // otherwise ring k+1's update would already see ring k's new value
  // and the diffusion would be asymmetric.
  _diffuseRingState(rate) {
    if (rate == null) rate = this.inter_ring_diffusion_rate;
    if (!(rate > 0)) return;
    const n = this.ring_fluids.length;
    if (n <= 1) return;
    for (const fname of this._fluidFieldNames) {
      const old = this.ring_fluids.map(rf => rf[fname]);
      for (let k = 0; k < n; k++) {
        const kp = k > 0 ? k - 1 : 0;
        const kn = k < n - 1 ? k + 1 : n - 1;
        this.ring_fluids[k][fname] = old[k] + rate * (old[kp] + old[kn] - 2 * old[k]);
      }
    }
    const oldT = this.ring_temperatures.slice();
    for (let k = 0; k < n; k++) {
      const kp = k > 0 ? k - 1 : 0;
      const kn = k < n - 1 ? k + 1 : n - 1;
      this.ring_temperatures[k] = oldT[k] + rate * (oldT[kp] + oldT[kn] - 2 * oldT[k]);
    }
  }

  nucleate(mineral, position = 'vug wall', sigma = 1.0) {
    this.crystal_counter++;
    const crystal = new Crystal({
      mineral, crystal_id: this.crystal_counter,
      nucleation_step: this.step,
      nucleation_temp: this.conditions.temperature,
      position
    });

    // Pick a growth-vector variant from the spec. Its name sets the habit
    // and its wall_spread/void_reach/vector populate the topo-map
    // footprint. Falls back to legacy defaults below if the mineral has
    // no variant objects in the spec.
    const variant = selectHabitVariant(
      mineral, sigma, this.conditions.temperature, this._spaceIsCrowded()
    );
    if (variant) {
      crystal.habit = variant.name || crystal.habit;
      crystal.wall_spread = Number(variant.wall_spread ?? 0.5);
      crystal.void_reach = Number(variant.void_reach ?? 0.5);
      crystal.vector = variant.vector || 'equant';
    }

    // Anchor on the wall. Crystals that nucleated on another crystal
    // (position "on <mineral> #<id>") inherit the host's cell + ring
    // so pseudomorphs/overgrowths paint alongside it. Free-wall
    // nucleations get a random ring (Phase C v1: scatter across the
    // sphere wall; Phase D will weight by orientation).
    crystal.wall_center_cell = this._assignWallCell(position);
    crystal.wall_ring_index = this._assignWallRing(position, mineral);

    // v24 water-level: stamp growth_environment from the ring's
    // water state. Submerged or meniscus = wet = 'fluid'; vadose
    // (above the meniscus) = 'air'. Mirrors vugg.py.
    {
      const wstate = this.conditions.ringWaterState(
        crystal.wall_ring_index, this.wall_state.ring_count);
      crystal.growth_environment = (wstate === 'vadose') ? 'air' : 'fluid';
    }

    // Dominant-form strings describe crystallographic faces and aren't
    // governed by the habit variant; keep per-mineral defaults.
    if (mineral === 'quartz') {
      crystal.dominant_forms = ['m{100} prism', 'r{101} rhombohedron'];
    } else if (mineral === 'calcite') {
      crystal.dominant_forms = ['e{104} rhombohedron'];
    } else if (mineral === 'aragonite') {
      crystal.dominant_forms = ['columnar prisms', '{110} cyclic twin (six-pointed)'];
    } else if (mineral === 'rhodochrosite') {
      crystal.dominant_forms = ["e{104} curved 'button' rhombohedron", 'rose-pink'];
    } else if (mineral === 'siderite') {
      crystal.dominant_forms = ["e{104} curved 'saddle' rhombohedron", 'tan to brown'];
    } else if (mineral === 'dolomite') {
      crystal.dominant_forms = ['e{104} saddle-shaped curved rhombohedron', 'white to colorless'];
    } else if (mineral === 'sphalerite') {
      crystal.dominant_forms = ['{111} tetrahedron'];
    } else if (mineral === 'wurtzite') {
      crystal.dominant_forms = ['hemimorphic hexagonal pyramid', '{0001} + {101̄1}'];
    } else if (mineral === 'fluorite') {
      crystal.dominant_forms = ['{100} cube'];
    } else if (mineral === 'pyrite') {
      crystal.dominant_forms = ['{100} cube'];
    } else if (mineral === 'marcasite') {
      crystal.dominant_forms = ['cockscomb aggregate', '{010} tabular crests'];
    } else if (mineral === 'chalcopyrite') {
      crystal.dominant_forms = ['{112} disphenoid'];
    } else if (mineral === 'hematite') {
      crystal.dominant_forms = ['{001} basal plates'];
    } else if (mineral === 'malachite') {
      crystal.dominant_forms = ['botryoidal masses'];
    } else if (mineral === 'uraninite') {
      crystal.dominant_forms = ['{100} cube', '{111} octahedron'];
    } else if (mineral === 'galena') {
      crystal.dominant_forms = ['{100} cube', '{111} octahedron'];
    } else if (mineral === 'selenite') {
      crystal.dominant_forms = ['{010} blades', '{110} prism'];
    } else if (mineral === 'halite') {
      crystal.dominant_forms = ['{100} cube', 'hopper-growth pyramidal hollows'];
    } else if (mineral === 'borax') {
      crystal.dominant_forms = ['{100} pinacoid', '{110} monoclinic prism', 'vitreous to resinous luster'];
    } else if (mineral === 'tincalconite') {
      crystal.dominant_forms = ['paramorph after borax', 'white powdery crust'];
    } else if (mineral === 'mirabilite') {
      crystal.dominant_forms = ['{010} pinacoid', '{110} monoclinic prism', 'Glauber salt'];
    } else if (mineral === 'thenardite') {
      crystal.dominant_forms = ['orthorhombic dipyramid', '{111} dominant', '{010} pinacoid'];
    } else if (mineral === 'feldspar') {
      crystal.dominant_forms = ['{010} pinacoid', '{110} prism'];
    } else if (mineral === 'topaz') {
      crystal.dominant_forms = ['m{110} prism', 'y{041} pyramid', 'c{001} basal cleavage'];
    } else if (mineral === 'tourmaline') {
      crystal.dominant_forms = ['m{10̄10} trigonal prism', 'striated faces', 'slightly rounded triangular cross-section'];
    } else if (mineral === 'beryl' || mineral === 'emerald' || mineral === 'aquamarine' || mineral === 'morganite' || mineral === 'heliodor') {
      crystal.dominant_forms = ['m{10̄10} hex prism', 'c{0001} flat basal pinacoid'];
    } else if (mineral === 'corundum' || mineral === 'ruby' || mineral === 'sapphire') {
      crystal.dominant_forms = ['c{0001} flat basal pinacoid', 'n{22̄43} steep dipyramid', 'hexagonal prism or barrel'];
    } else if (mineral === 'spodumene') {
      crystal.dominant_forms = ['m{110} prism', 'a{100} + b{010} pinacoids', '~87° pyroxene cleavages'];
    } else if (mineral === 'anglesite') {
      crystal.dominant_forms = ['b{010} pinacoid', 'm{110} prism', 'o{011} orthorhombic dome'];
    } else if (mineral === 'cerussite') {
      crystal.dominant_forms = ['b{010} pinacoid', 'm{110} prism', 'pseudo-hexagonal if twinned'];
    } else if (mineral === 'pyromorphite') {
      crystal.dominant_forms = ['{10̄10} hexagonal prism', 'c{0001} pinacoid', 'barrel profile'];
    } else if (mineral === 'vanadinite') {
      crystal.dominant_forms = ['{10̄10} hexagonal prism', 'c{0001} pinacoid', 'flat basal termination'];
    } else if (mineral === 'erythrite') {
      crystal.dominant_forms = ['earthy crimson-pink crust', 'cobalt bloom'];
    } else if (mineral === 'annabergite') {
      crystal.dominant_forms = ['apple-green earthy crust', 'nickel bloom'];
    } else if (mineral === 'tetrahedrite') {
      crystal.dominant_forms = ['{111} tetrahedron', 'steel-gray metallic'];
    } else if (mineral === 'tennantite') {
      crystal.dominant_forms = ['{111} tetrahedron', 'gray-black metallic with cherry-red transmission'];
    } else if (mineral === 'apophyllite') {
      crystal.dominant_forms = ['pseudo-cubic tabular {001} + {110}', 'transparent to pearly'];
    } else if (mineral === 'bornite') {
      crystal.dominant_forms = ['massive granular', 'iridescent tarnish'];
    } else if (mineral === 'chalcocite') {
      crystal.dominant_forms = ['{110} prism', 'pseudo-hexagonal if twinned'];
    } else if (mineral === 'covellite') {
      crystal.dominant_forms = ['{0001} basal plate', 'perfect basal cleavage'];
    } else if (mineral === 'cuprite') {
      crystal.dominant_forms = ['{111} octahedron', 'dark red with ruby internal reflections'];
    } else if (mineral === 'azurite') {
      crystal.dominant_forms = ['monoclinic prism', 'deep azure-blue'];
    } else if (mineral === 'chrysocolla') {
      crystal.dominant_forms = ['botryoidal crust', 'cyan-blue cryptocrystalline enamel'];
    } else if (mineral === 'native_copper') {
      crystal.dominant_forms = ['arborescent branching', 'copper-red metallic'];
    } else if (mineral === 'magnetite') {
      crystal.dominant_forms = ['{111} octahedron', 'black metallic, strongly magnetic'];
    } else if (mineral === 'lepidocrocite') {
      crystal.dominant_forms = ['{010} platy scales', 'ruby-red micaceous'];
    } else if (mineral === 'stibnite') {
      crystal.dominant_forms = ['elongated {110} prism', 'lead-gray sword-blade'];
    } else if (mineral === 'bismuthinite') {
      crystal.dominant_forms = ['acicular {110} needle', 'lead-gray metallic'];
    } else if (mineral === 'native_bismuth') {
      crystal.dominant_forms = ['arborescent silver-white', 'iridescent oxide tarnish'];
    } else if (mineral === 'clinobisvanite') {
      crystal.dominant_forms = ['micro-platy {010}', 'bright yellow'];
    }

    // Twin roll — once at nucleation per declared twin_laws (Round 9
    // bug fix Apr 2026). Pre-fix, each grow_*() function rolled per
    // growth step, giving ~92% twinning rate after 30 zones at p=0.1.
    // Post-fix the roll happens once here per twin_law in
    // data/minerals.json, matching declared probability semantics.
    this._rollSpontaneousTwin(crystal);

    this.crystals.push(crystal);
    return crystal;
  }

  _rollSpontaneousTwin(crystal) {
    // Mirror of vugg.py VugSimulator._roll_spontaneous_twin.
    // Triggers containing 'thermal_shock' or 'tectonic' are skipped —
    // those remain in their grow functions as event-conditional logic
    // (currently only quartz Dauphiné). First law to fire wins; later
    // laws of the same mineral don't compound onto an already-twinned
    // crystal.
    if (crystal.twinned) return;
    const spec = MINERAL_SPEC[crystal.mineral];
    if (!spec) return;
    const twinLaws = spec.twin_laws || [];
    for (const law of twinLaws) {
      if (!law || typeof law !== 'object') continue;
      const prob = law.probability;
      if (typeof prob !== 'number' || prob <= 0) continue;
      const trigger = (law.trigger || '').toLowerCase();
      if (trigger.includes('thermal_shock') || trigger.includes('tectonic')) continue;
      if (rng.random() < prob) {
        crystal.twinned = true;
        crystal.twin_law = law.name || 'twin';
        return;
      }
    }
  }

  _spaceIsCrowded() {
    // Fraction of ring-0 cells already claimed. Habit selection uses
    // this to penalize projecting variants when the vug is filling up.
    const ring0 = this.wall_state?.rings?.[0];
    if (!ring0 || !ring0.length) return false;
    const occupied = ring0.reduce((n, c) => n + (c.crystal_id != null ? 1 : 0), 0);
    return (occupied / ring0.length) >= 0.5;
  }

  _atNucleationCap(mineral) {
    // True if the mineral has hit its spec max_nucleation_count for
    // crystals *still exposed on the wall* — enclosed and dissolved
    // crystals don't count toward the cap because the surface they
    // held is effectively gone (buried by the host, or etched away).
    //
    // This is what lets a classic MVT calcite accumulate dense
    // chalcopyrite inclusion trails: the sulfide nucleates, grows a
    // little, gets enveloped, and fresh bare wall from the host's
    // advancing front becomes available for another sulfide to
    // nucleate. Real specimens can carry hundreds of inclusions.
    const cap = MINERAL_SPEC[mineral]?.max_nucleation_count;
    if (cap == null) return false;
    let n = 0;
    for (const c of this.crystals) {
      if (c.mineral !== mineral) continue;
      if (c.enclosed_by != null || c.dissolved) continue;
      n++;
      if (n >= cap) return true;
    }
    return false;
  }

  _assignWallCell(position) {
    // Host-substrate overgrowths inherit the host's cell; free-wall
    // nucleations claim a random empty cell (or a random cell at all
    // if the wall is full — overlaps paint the larger crystal on top).
    let hostId = null;
    const hashIdx = position.indexOf(' #');
    if (hashIdx >= 0) {
      const num = parseInt(position.slice(hashIdx + 2), 10);
      if (!Number.isNaN(num)) hostId = num;
    }
    if (hostId != null) {
      const host = this.crystals.find(c => c.crystal_id === hostId);
      if (host && host.wall_center_cell != null) return host.wall_center_cell;
    }
    const N = this.wall_state.cells_per_ring;
    const ring0 = this.wall_state.rings[0];
    const empty = [];
    for (let i = 0; i < ring0.length; i++) {
      if (ring0[i].crystal_id == null) empty.push(i);
    }
    if (empty.length) return empty[Math.floor(rng.random() * empty.length)];
    return Math.floor(rng.random() * N);
  }

  // Phase C v1: run a mineral growth engine for a crystal, swapping
  // conditions.fluid + temperature to the crystal's ring's values
  // for the duration of the call. Engines never see ring_fluids
  // directly — they observe "the fluid" via conditions, the same
  // interface as before. Mass-balance side effects (consumption,
  // byproduct release) hit ring_fluids[k] because that's the object
  // swapped in. Restore globals afterward so subsequent code (events,
  // narrators, log) sees the bulk-fluid view. Mirrors the equivalent
  // try/finally block in VugSimulator.run_step (vugg.py).
  _runEngineForCrystal(engine, crystal) {
    const ringIdx = crystal.wall_ring_index;
    let savedFluid = null;
    let savedTemp = null;
    if (ringIdx != null && ringIdx >= 0 && ringIdx < this.ring_fluids.length) {
      savedFluid = this.conditions.fluid;
      savedTemp = this.conditions.temperature;
      this.conditions.fluid = this.ring_fluids[ringIdx];
      this.conditions.temperature = this.ring_temperatures[ringIdx];
    }
    try {
      return engine(crystal, this.conditions, this.step);
    } finally {
      if (savedFluid != null) {
        this.conditions.fluid = savedFluid;
      }
      if (savedTemp != null) {
        this.ring_temperatures[ringIdx] = this.conditions.temperature;
        this.conditions.temperature = savedTemp;
      }
    }
  }

  // Phase C v1: pick a ring for a nucleating crystal. Host-substrate
  // overgrowths inherit the host's ring (so pseudomorphs land on
  // the same latitude); free-wall nucleations get a random ring.
  // Phase D v2: per-mineral orientation bias (see ORIENTATION_PREFERENCE
  // module-level table). Spatially neutral minerals stay area-weighted.
  // Mirrors VugSimulator._assign_wall_ring in vugg.py.
  _assignWallRing(position, mineral) {
    let hostId = null;
    const hashIdx = position.indexOf(' #');
    if (hashIdx >= 0) {
      const num = parseInt(position.slice(hashIdx + 2), 10);
      if (!Number.isNaN(num)) hostId = num;
    }
    if (hostId != null) {
      const host = this.crystals.find(c => c.crystal_id === hostId);
      if (host && host.wall_ring_index != null) return host.wall_ring_index;
    }
    // Phase D: area-weighted sample (equator gets more nucleations
    // than polar caps). Always consumes one RNG number so parity
    // holds across ring counts. Mirrors VugSimulator._assign_wall_ring
    // in vugg.py — same algorithm so both runtimes pick the same
    // ring for the same RNG state.
    const n = Math.max(1, this.wall_state.ring_count);
    const weights = [];
    let total = 0;
    for (let k = 0; k < n; k++) {
      const w = this.wall_state.ringAreaWeight(k);
      weights.push(w);
      total += w;
    }
    // Phase D v2: per-mineral preferred-orientation bias.
    const pref = mineral ? ORIENTATION_PREFERENCE[mineral] : null;
    if (pref && n > 1) {
      const [target, strength] = pref;
      total = 0;
      for (let k = 0; k < n; k++) {
        if (this.wall_state.ringOrientation(k) === target) weights[k] *= strength;
        total += weights[k];
      }
    }
    // v27: per-mineral water-state bias for evaporite minerals.
    // Mirror of _assign_wall_ring in vugg.py.
    const wpref = mineral ? WATER_STATE_PREFERENCE[mineral] : null;
    if (wpref && n > 1) {
      const [targetState, strength] = wpref;
      total = 0;
      for (let k = 0; k < n; k++) {
        if (this.conditions.ringWaterState(k, n) === targetState) weights[k] *= strength;
        total += weights[k];
      }
    }
    if (total <= 0) total = 1;
    let r = rng.random() * total;
    for (let k = 0; k < n; k++) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return n - 1;
  }

  _repaintWallState() {
    // Rebuild ring-0 occupancy from the crystal list. Cheap (~120 × ~20)
    // and keeps per-cell thickness consistent with dissolution / enclosure.
    this.wall_state.updateDiameter(this.conditions.wall.vug_diameter_mm);
    this.wall_state.clear();
    // Paint smallest-first so biggest crystals win overlaps — that's
    // what a viewer would see from outside the vug.
    const sorted = [...this.crystals].sort((a, b) => a.total_growth_um - b.total_growth_um);
    for (const crystal of sorted) {
      if (crystal.dissolved) continue;
      this.wall_state.paintCrystal(crystal);
    }
    // Snapshot ring[0] for the Replay button. Shallow clone of each
    // cell's render-relevant fields — including base_radius_mm so the
    // Phase-1 Fourier profile is preserved across replay frames.
    const snap = new Array(this.wall_state.rings[0].length);
    for (let i = 0; i < snap.length; i++) {
      const c = this.wall_state.rings[0][i];
      snap[i] = {
        wall_depth: c.wall_depth,
        crystal_id: c.crystal_id,
        mineral: c.mineral,
        thickness_um: c.thickness_um,
        base_radius_mm: c.base_radius_mm,
      };
    }
    this.wall_state_history.push(snap);
  }

  _wallCellsBlockedByCrystals() {
    // Which ring-0 cells are shielded from wall dissolution. A cell
    // blocks when it holds a non-dissolved crystal whose mineral is
    // stable at the current pH — either permanently acid-stable
    // (acid_dissolution == null, e.g. uraninite/molybdenite) or the
    // current pH is above its threshold.
    const ph = this.conditions.fluid.pH;
    const byId = new Map(this.crystals.map(c => [c.crystal_id, c]));
    const blocked = new Set();
    const ring0 = this.wall_state.rings[0];
    for (let i = 0; i < ring0.length; i++) {
      const cell = ring0[i];
      if (cell.crystal_id == null) continue;
      const crystal = byId.get(cell.crystal_id);
      if (!crystal || crystal.dissolved) continue;
      const acid = MINERAL_SPEC[crystal.mineral]?.acid_dissolution;
      if (acid == null) { blocked.add(i); continue; }
      const threshold = acid.pH_threshold;
      if (threshold == null || ph >= threshold) blocked.add(i);
    }
    return blocked;
  }

  get_vug_fill() {
    const vugR = this.conditions.wall.vug_diameter_mm / 2;
    const vugVol = (4 / 3) * Math.PI * Math.pow(vugR, 3);
    if (vugVol <= 0) return 0;
    let crystalVol = 0;
    for (const c of this.crystals) {
      if (!c.active) continue;
      const a = c.c_length_mm / 2;
      const b = c.a_width_mm / 2;
      crystalVol += (4 / 3) * Math.PI * a * b * b;
    }
    return crystalVol / vugVol;
  }

  check_nucleation(vugFill) {
    // No new crystals if vug is full
    if (vugFill !== undefined && vugFill >= 0.95) return;
    const sigma_q = this.conditions.supersaturation_quartz();
    const existing_quartz = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
    if (sigma_q > 1.2 && existing_quartz.length < 3 && !this._atNucleationCap('quartz')) {
      if (!existing_quartz.length || (sigma_q > 2.0 && rng.random() < 0.3)) {
        const c = this.nucleate('quartz', 'vug wall', sigma_q);
        this.log.push(`  ✦ NUCLEATION: Quartz #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_q.toFixed(2)})`);
      }
    }

    const sigma_c = this.conditions.supersaturation_calcite();
    const existing_calcite = this.crystals.filter(c => c.mineral === 'calcite' && c.active);
    if (sigma_c > 1.3 && !existing_calcite.length && !this._atNucleationCap('calcite')) {
      const c = this.nucleate('calcite', 'vug wall', sigma_c);
      this.log.push(`  ✦ NUCLEATION: Calcite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_c.toFixed(2)})`);
    }

    // Aragonite nucleation — Mg/Ca + T + Ω + trace Sr/Pb/Ba favorability.
    const sigma_arag = this.conditions.supersaturation_aragonite();
    const existing_arag = this.crystals.filter(c => c.mineral === 'aragonite' && c.active);
    if (sigma_arag > 1.0 && !existing_arag.length && !this._atNucleationCap('aragonite')) {
      let pos = 'vug wall';
      const existing_goe_a = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      const existing_hem_a = this.crystals.filter(c => c.mineral === 'hematite' && c.active);
      if (existing_goe_a.length && rng.random() < 0.4) pos = `on goethite #${existing_goe_a[0].crystal_id}`;
      else if (existing_hem_a.length && rng.random() < 0.3) pos = `on hematite #${existing_hem_a[0].crystal_id}`;
      const mg_ratio = this.conditions.fluid.Mg / Math.max(this.conditions.fluid.Ca, 0.01);
      const c = this.nucleate('aragonite', pos, sigma_arag);
      this.log.push(`  ✦ NUCLEATION: Aragonite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, Mg/Ca=${mg_ratio.toFixed(2)}, σ=${sigma_arag.toFixed(2)})`);
    }

    // Dolomite nucleation — Ca-Mg carbonate, needs both cations + T > 50°C.
    const sigma_dol = this.conditions.supersaturation_dolomite();
    const existing_dol = this.crystals.filter(c => c.mineral === 'dolomite' && c.active);
    if (sigma_dol > 1.0 && !existing_dol.length && !this._atNucleationCap('dolomite')) {
      let pos = 'vug wall';
      const existing_cal_d = this.crystals.filter(c => c.mineral === 'calcite' && c.active);
      if (existing_cal_d.length && rng.random() < 0.4) pos = `on calcite #${existing_cal_d[0].crystal_id}`;
      const mg_ratio = this.conditions.fluid.Mg / Math.max(this.conditions.fluid.Ca, 0.01);
      const c = this.nucleate('dolomite', pos, sigma_dol);
      this.log.push(`  ✦ NUCLEATION: Dolomite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, Mg/Ca=${mg_ratio.toFixed(2)}, σ=${sigma_dol.toFixed(2)})`);
    }

    // Siderite nucleation — Fe carbonate, brown rhomb. Reducing only.
    const sigma_sid = this.conditions.supersaturation_siderite();
    const existing_sid = this.crystals.filter(c => c.mineral === 'siderite' && c.active);
    if (sigma_sid > 1.0 && !existing_sid.length && !this._atNucleationCap('siderite')) {
      let pos = 'vug wall';
      const existing_py_s = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
      const existing_sph_s = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
      if (existing_py_s.length && rng.random() < 0.4) pos = `on pyrite #${existing_py_s[0].crystal_id}`;
      else if (existing_sph_s.length && rng.random() < 0.3) pos = `on sphalerite #${existing_sph_s[0].crystal_id}`;
      const c = this.nucleate('siderite', pos, sigma_sid);
      this.log.push(`  ✦ NUCLEATION: Siderite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, Fe=${this.conditions.fluid.Fe.toFixed(0)}, σ=${sigma_sid.toFixed(2)})`);
    }

    // Rhodochrosite nucleation — Mn carbonate, the pink mineral.
    const sigma_rho = this.conditions.supersaturation_rhodochrosite();
    const existing_rho = this.crystals.filter(c => c.mineral === 'rhodochrosite' && c.active);
    if (sigma_rho > 1.0 && !existing_rho.length && !this._atNucleationCap('rhodochrosite')) {
      let pos = 'vug wall';
      const existing_goe_r = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      const existing_py_r = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
      const existing_sph_r = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
      if (existing_goe_r.length && rng.random() < 0.5) pos = `on goethite #${existing_goe_r[0].crystal_id}`;
      else if (existing_sph_r.length && rng.random() < 0.4) pos = `on sphalerite #${existing_sph_r[0].crystal_id}`;
      else if (existing_py_r.length && rng.random() < 0.3) pos = `on pyrite #${existing_py_r[0].crystal_id}`;
      const c = this.nucleate('rhodochrosite', pos, sigma_rho);
      this.log.push(`  ✦ NUCLEATION: Rhodochrosite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, Mn=${this.conditions.fluid.Mn.toFixed(0)}, σ=${sigma_rho.toFixed(2)})`);
    }

    const sigma_s = this.conditions.supersaturation_sphalerite();
    const existing_sph = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
    if (sigma_s > 1.0 && !existing_sph.length && !this._atNucleationCap('sphalerite')) {
      const c = this.nucleate('sphalerite', 'vug wall', sigma_s);
      this.log.push(`  ✦ NUCLEATION: Sphalerite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_s.toFixed(2)})`);
    }

    // Wurtzite nucleation — T>95°C hexagonal ZnS dimorph
    const sigma_wz = this.conditions.supersaturation_wurtzite();
    const existing_wz = this.crystals.filter(c => c.mineral === 'wurtzite' && c.active);
    if (sigma_wz > 1.0 && !existing_wz.length && !this._atNucleationCap('wurtzite')) {
      const c = this.nucleate('wurtzite', 'vug wall', sigma_wz);
      this.log.push(`  ✦ NUCLEATION: Wurtzite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_wz.toFixed(2)})`);
    }

    const sigma_f = this.conditions.supersaturation_fluorite();
    const existing_fl = this.crystals.filter(c => c.mineral === 'fluorite' && c.active);
    if (sigma_f > 1.2 && !existing_fl.length && !this._atNucleationCap('fluorite')) {
      const c = this.nucleate('fluorite', 'vug wall', sigma_f);
      this.log.push(`  ✦ NUCLEATION: Fluorite #${c.crystal_id} on ${c.position}`);
    }

    // Pyrite nucleation
    const sigma_py = this.conditions.supersaturation_pyrite();
    const existing_py = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
    if (sigma_py > 1.0 && !existing_py.length && !this._atNucleationCap('pyrite')) {
      let pos = 'vug wall';
      const existing_sph2 = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
      if (existing_sph2.length && rng.random() < 0.5) {
        pos = `on sphalerite #${existing_sph2[0].crystal_id}`;
      }
      const c = this.nucleate('pyrite', pos, sigma_py);
      this.log.push(`  ✦ NUCLEATION: Pyrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_py.toFixed(2)})`);
    }

    // Marcasite nucleation — pH<5, T<240. The acidic dimorph.
    const sigma_mc = this.conditions.supersaturation_marcasite();
    const existing_mc = this.crystals.filter(c => c.mineral === 'marcasite' && c.active);
    if (sigma_mc > 1.0 && !existing_mc.length && !this._atNucleationCap('marcasite')) {
      let pos = 'vug wall';
      const existing_sph3 = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
      const existing_gal = this.crystals.filter(c => c.mineral === 'galena' && c.active);
      if (existing_sph3.length && rng.random() < 0.5) {
        pos = `on sphalerite #${existing_sph3[0].crystal_id}`;
      } else if (existing_gal.length && rng.random() < 0.4) {
        pos = `on galena #${existing_gal[0].crystal_id}`;
      }
      const c = this.nucleate('marcasite', pos, sigma_mc);
      this.log.push(`  ✦ NUCLEATION: Marcasite #${c.crystal_id} on ${c.position} (pH=${this.conditions.fluid.pH.toFixed(1)}, σ=${sigma_mc.toFixed(2)})`);
    }

    // Chalcopyrite nucleation
    const sigma_cp = this.conditions.supersaturation_chalcopyrite();
    const existing_cp = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
    if (sigma_cp > 1.0 && !existing_cp.length && !this._atNucleationCap('chalcopyrite')) {
      let pos = 'vug wall';
      if (existing_py.length && rng.random() < 0.4) {
        pos = `on pyrite #${existing_py[0].crystal_id}`;
      }
      const c = this.nucleate('chalcopyrite', pos, sigma_cp);
      this.log.push(`  ✦ NUCLEATION: Chalcopyrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cp.toFixed(2)})`);
    }

    // Tetrahedrite nucleation — Sb-endmember fahlore, Cu-Sb-S hydrothermal.
    const sigma_td = this.conditions.supersaturation_tetrahedrite();
    const existing_td = this.crystals.filter(c => c.mineral === 'tetrahedrite' && c.active);
    if (sigma_td > 1.0 && !existing_td.length && !this._atNucleationCap('tetrahedrite')) {
      let pos = 'vug wall';
      const existing_cp2 = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
      const existing_py2 = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
      if (existing_cp2.length && rng.random() < 0.5) pos = `on chalcopyrite #${existing_cp2[0].crystal_id}`;
      else if (existing_py2.length && rng.random() < 0.3) pos = `on pyrite #${existing_py2[0].crystal_id}`;
      const c = this.nucleate('tetrahedrite', pos, sigma_td);
      this.log.push(`  ✦ NUCLEATION: Tetrahedrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_td.toFixed(2)})`);
    }

    // Tennantite nucleation — As-endmember fahlore.
    const sigma_tn = this.conditions.supersaturation_tennantite();
    const existing_tn = this.crystals.filter(c => c.mineral === 'tennantite' && c.active);
    if (sigma_tn > 1.0 && !existing_tn.length && !this._atNucleationCap('tennantite')) {
      let pos = 'vug wall';
      const existing_cp3 = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
      const existing_td3 = this.crystals.filter(c => c.mineral === 'tetrahedrite' && c.active);
      if (existing_cp3.length && rng.random() < 0.4) pos = `on chalcopyrite #${existing_cp3[0].crystal_id}`;
      else if (existing_td3.length && rng.random() < 0.3) pos = `alongside tetrahedrite #${existing_td3[0].crystal_id}`;
      const c = this.nucleate('tennantite', pos, sigma_tn);
      this.log.push(`  ✦ NUCLEATION: Tennantite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_tn.toFixed(2)})`);
    }

    // Apophyllite nucleation — alkaline silicate, low-T zeolite vesicle filling.
    const sigma_ap = this.conditions.supersaturation_apophyllite();
    const existing_ap = this.crystals.filter(c => c.mineral === 'apophyllite' && c.active);
    if (sigma_ap > 1.0 && !existing_ap.length && !this._atNucleationCap('apophyllite')) {
      let pos = 'vug wall';
      const existing_q_ap = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
      const existing_hem_ap = this.crystals.filter(c => c.mineral === 'hematite' && c.active);
      if (existing_hem_ap.length && rng.random() < 0.4) {
        pos = `on hematite #${existing_hem_ap[0].crystal_id}`;
      } else if (existing_q_ap.length && rng.random() < 0.3) {
        pos = `on quartz #${existing_q_ap[0].crystal_id}`;
      }
      const c = this.nucleate('apophyllite', pos, sigma_ap);
      this.log.push(`  ✦ NUCLEATION: Apophyllite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ap.toFixed(2)})`);
    }

    // Hematite nucleation — needs sigma > 1.2 (harder to nucleate)
    const sigma_hem = this.conditions.supersaturation_hematite();
    const existing_hem = this.crystals.filter(c => c.mineral === 'hematite' && c.active);
    const total_hem = this.crystals.filter(c => c.mineral === 'hematite').length;
    if (sigma_hem > 1.2 && !existing_hem.length && total_hem < 3 && !this._atNucleationCap('hematite')) {
      let pos = 'vug wall';
      if (existing_quartz.length && rng.random() < 0.4) {
        pos = `on quartz #${existing_quartz[0].crystal_id}`;
      }
      const c = this.nucleate('hematite', pos, sigma_hem);
      this.log.push(`  ✦ NUCLEATION: Hematite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_hem.toFixed(2)})`);
    }

    // Malachite nucleation — needs sigma > 1.0
    const sigma_mal = this.conditions.supersaturation_malachite();
    const existing_mal = this.crystals.filter(c => c.mineral === 'malachite' && c.active);
    const total_mal = this.crystals.filter(c => c.mineral === 'malachite').length;
    if (sigma_mal > 1.0 && !existing_mal.length && total_mal < 3 && !this._atNucleationCap('malachite')) {
      let pos = 'vug wall';
      // Preference for chalcopyrite surface (classic oxidation paragenesis!)
      const dissolving_cp = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
      const active_cp_all = this.crystals.filter(c => c.mineral === 'chalcopyrite');
      if (dissolving_cp.length && rng.random() < 0.7) {
        pos = `on chalcopyrite #${dissolving_cp[0].crystal_id}`;
      } else if (active_cp_all.length && rng.random() < 0.4) {
        pos = `on chalcopyrite #${active_cp_all[0].crystal_id}`;
      } else if (existing_hem.length && rng.random() < 0.3) {
        pos = `on hematite #${existing_hem[0].crystal_id}`;
      }
      const c = this.nucleate('malachite', pos, sigma_mal);
      this.log.push(`  ✦ NUCLEATION: Malachite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mal.toFixed(2)})`);
    }

    // Uraninite nucleation — needs sigma > 1.5, max 3 active / 5 total
    const sigma_urn = this.conditions.supersaturation_uraninite();
    const existing_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.active);
    const total_urn = this.crystals.filter(c => c.mineral === 'uraninite').length;
    if (sigma_urn > 1.5 && existing_urn.length < 3 && total_urn < 5 && !this._atNucleationCap('uraninite')) {
      if (!existing_urn.length || (sigma_urn > 2.5 && rng.random() < 0.3)) {
        const c = this.nucleate('uraninite', 'vug wall', sigma_urn);
        this.log.push(`  ✦ NUCLEATION: ☢️ Uraninite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_urn.toFixed(2)}) — radioactive!`);
      }
    }

    // Smithsonite nucleation — needs sigma > 1.0, oxidized Zn environment
    const sigma_sm = this.conditions.supersaturation_smithsonite();
    const existing_sm = this.crystals.filter(c => c.mineral === 'smithsonite' && c.active);
    const total_sm = this.crystals.filter(c => c.mineral === 'smithsonite').length;
    if (sigma_sm > 1.0 && !existing_sm.length && total_sm < 3 && !this._atNucleationCap('smithsonite')) {
      let pos = 'vug wall';
      // Prefers to nucleate on dissolved sphalerite — classic oxidation zone paragenesis
      const dissolved_sph = this.crystals.filter(c => c.mineral === 'sphalerite' && c.dissolved);
      const any_sph = this.crystals.filter(c => c.mineral === 'sphalerite');
      if (dissolved_sph.length && rng.random() < 0.7) {
        pos = `on sphalerite #${dissolved_sph[0].crystal_id} (oxidized)`;
      } else if (any_sph.length && rng.random() < 0.3) {
        pos = `on sphalerite #${any_sph[0].crystal_id}`;
      }
      const c = this.nucleate('smithsonite', pos, sigma_sm);
      this.log.push(`  ✦ NUCLEATION: Smithsonite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_sm.toFixed(2)}) — zinc carbonate from oxidized sphalerite`);
    }

    // Wulfenite nucleation — needs sigma > 1.2, RARE: requires both Pb and Mo
    const sigma_wulf = this.conditions.supersaturation_wulfenite();
    const existing_wulf = this.crystals.filter(c => c.mineral === 'wulfenite' && c.active);
    const total_wulf = this.crystals.filter(c => c.mineral === 'wulfenite').length;
    if (sigma_wulf > 1.2 && !existing_wulf.length && total_wulf < 2 && !this._atNucleationCap('wulfenite')) {
      let pos = 'vug wall';
      // Prefers to nucleate on dissolved galena AND/OR dissolved molybdenite
      // Wulfenite = Pb²⁺ (from oxidized galena) + MoO₄²⁻ (from oxidized molybdenite)
      const dissolved_gal = this.crystals.filter(c => c.mineral === 'galena' && c.dissolved);
      const dissolved_moly = this.crystals.filter(c => c.mineral === 'molybdenite' && c.dissolved);
      const any_gal = this.crystals.filter(c => c.mineral === 'galena');
      const any_moly = this.crystals.filter(c => c.mineral === 'molybdenite');
      if (dissolved_moly.length && dissolved_gal.length && rng.random() < 0.7) {
        pos = `on molybdenite #${dissolved_moly[0].crystal_id} (oxidized, near galena #${dissolved_gal[0].crystal_id})`;
      } else if (dissolved_gal.length && rng.random() < 0.6) {
        pos = `on galena #${dissolved_gal[0].crystal_id} (oxidized)`;
      } else if (dissolved_moly.length && rng.random() < 0.5) {
        pos = `on molybdenite #${dissolved_moly[0].crystal_id} (oxidized)`;
      } else if (any_gal.length && rng.random() < 0.3) {
        pos = `on galena #${any_gal[0].crystal_id}`;
      }
      const c = this.nucleate('wulfenite', pos, sigma_wulf);
      this.log.push(`  ✦ NUCLEATION: 🟠 Wulfenite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_wulf.toFixed(2)}) — the collector's prize!`);
    }

    // Ferrimolybdite nucleation — the no-lead Mo-oxidation fork.
    // Lower σ threshold (1.0 vs wulfenite's 1.2) + higher per-check
    // probability (0.18) reflect its faster, less-picky growth. Substrate:
    // dissolving molybdenite (direct oxidation product) > active
    // molybdenite > free vug wall. Coexists with wulfenite; both draw
    // on the MoO₄²⁻ pool but ferrimolybdite wins the early window.
    const sigma_fmo = this.conditions.supersaturation_ferrimolybdite();
    if (sigma_fmo > 1.0 && !this._atNucleationCap('ferrimolybdite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const dissolving_mol = this.crystals.filter(c => c.mineral === 'molybdenite' && c.dissolved);
        const active_mol = this.crystals.filter(c => c.mineral === 'molybdenite' && c.active);
        if (dissolving_mol.length && rng.random() < 0.7) {
          pos = `on dissolving molybdenite #${dissolving_mol[0].crystal_id}`;
        } else if (active_mol.length && rng.random() < 0.4) {
          pos = `on molybdenite #${active_mol[0].crystal_id}`;
        }
        const c = this.nucleate('ferrimolybdite', pos, sigma_fmo);
        this.log.push(`  ✦ NUCLEATION: 🟡 Ferrimolybdite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_fmo.toFixed(2)}, Mo=${this.conditions.fluid.Mo.toFixed(0)}, Fe=${this.conditions.fluid.Fe.toFixed(0)}) — canary-yellow tufts on oxidizing molybdenite`);
      }
    }

    // Arsenopyrite nucleation — mesothermal primary sulfide, reducing
    // Fe+As+S. Substrate preference: pyrite (orogenic-gold co-precipitation
    // habit — arsenopyrite rhombs on pyrite cubes) > chalcopyrite > vug
    // wall. σ threshold 1.2 reflects mesothermal pickiness. Au-trapping
    // (in grow_arsenopyrite) competes with native_gold for the fluid Au
    // pool when both are forming.
    const sigma_apy = this.conditions.supersaturation_arsenopyrite();
    if (sigma_apy > 1.2 && !this._atNucleationCap('arsenopyrite')) {
      if (rng.random() < 0.12) {
        let pos = 'vug wall';
        const active_py_apy = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
        const active_cp_apy = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        if (active_py_apy.length && rng.random() < 0.5) {
          pos = `on pyrite #${active_py_apy[0].crystal_id}`;
        } else if (active_cp_apy.length && rng.random() < 0.3) {
          pos = `on chalcopyrite #${active_cp_apy[0].crystal_id}`;
        }
        const c = this.nucleate('arsenopyrite', pos, sigma_apy);
        this.log.push(`  ✦ NUCLEATION: ⚪ Arsenopyrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_apy.toFixed(2)}, Fe=${this.conditions.fluid.Fe.toFixed(0)}, As=${this.conditions.fluid.As.toFixed(0)}, Au=${this.conditions.fluid.Au.toFixed(2)} ppm) — striated diamond-section prisms; will trap invisible-gold`);
      }
    }

    // Scorodite nucleation — the arsenate supergene gateway; classic
    // "crystallized on dissolving arsenopyrite" habit. σ threshold 1.0
    // + per-check 0.20 reflect supergene speed. Substrate priority:
    // dissolving arsenopyrite (direct parent — the famous habit) >
    // active arsenopyrite > dissolving pyrite (often co-occurs) > vug
    // wall.
    const sigma_sco = this.conditions.supersaturation_scorodite();
    if (sigma_sco > 1.0 && !this._atNucleationCap('scorodite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const diss_apy_sco = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.dissolved);
        const active_apy_sco = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.active);
        const diss_py_sco = this.crystals.filter(c => c.mineral === 'pyrite' && c.dissolved);
        if (diss_apy_sco.length && rng.random() < 0.8) {
          pos = `on dissolving arsenopyrite #${diss_apy_sco[0].crystal_id}`;
        } else if (active_apy_sco.length && rng.random() < 0.5) {
          pos = `on arsenopyrite #${active_apy_sco[0].crystal_id}`;
        } else if (diss_py_sco.length && rng.random() < 0.4) {
          pos = `on dissolving pyrite #${diss_py_sco[0].crystal_id}`;
        }
        const c = this.nucleate('scorodite', pos, sigma_sco);
        this.log.push(`  ✦ NUCLEATION: 💎 Scorodite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_sco.toFixed(2)}, Fe=${this.conditions.fluid.Fe.toFixed(0)}, As=${this.conditions.fluid.As.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — pale blue-green dipyramids, sequesters arsenic`);
      }
    }

    // Barite nucleation — the Ba sequestration mineral. σ threshold 1.0
    // + per-check 0.15. Wide-T habit; substrate-agnostic but in MVT often
    // perches near galena/sphalerite (co-precipitation paragenesis).
    const sigma_brt = this.conditions.supersaturation_barite();
    if (sigma_brt > 1.0 && !this._atNucleationCap('barite')) {
      if (rng.random() < 0.15) {
        let pos = 'vug wall';
        const active_gal_brt = this.crystals.filter(c => c.mineral === 'galena' && c.active);
        const active_sph_brt = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
        if (active_gal_brt.length && rng.random() < 0.3) {
          pos = `near galena #${active_gal_brt[0].crystal_id}`;
        } else if (active_sph_brt.length && rng.random() < 0.2) {
          pos = `near sphalerite #${active_sph_brt[0].crystal_id}`;
        }
        const c = this.nucleate('barite', pos, sigma_brt);
        this.log.push(`  ✦ NUCLEATION: ⚪ Barite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_brt.toFixed(2)}, Ba=${this.conditions.fluid.Ba.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(2)}) — heavy spar, MVT gangue`);
      }
    }

    // Celestine nucleation — the Sr sequestration mineral; pale celestial
    // blue. Substrate priority: existing barite (celestobarite-barytocelestine
    // pair) > vug wall.
    const sigma_cel = this.conditions.supersaturation_celestine();
    if (sigma_cel > 1.0 && !this._atNucleationCap('celestine')) {
      if (rng.random() < 0.15) {
        let pos = 'vug wall';
        const active_brt_cel = this.crystals.filter(c => c.mineral === 'barite' && c.active);
        if (active_brt_cel.length && rng.random() < 0.25) {
          pos = `on barite #${active_brt_cel[0].crystal_id} (celestobarite-barytocelestine pair)`;
        }
        const c = this.nucleate('celestine', pos, sigma_cel);
        this.log.push(`  ✦ NUCLEATION: 🟦 Celestine #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cel.toFixed(2)}, Sr=${this.conditions.fluid.Sr.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(2)}) — pale celestial blue, Sr sulfate`);
      }
    }

    // Jarosite nucleation — the AMD-yellow Fe sulfate. Substrate prefers
    // dissolving pyrite/marcasite (the diagnostic yellow rim).
    const sigma_jar = this.conditions.supersaturation_jarosite();
    if (sigma_jar > 1.0 && !this._atNucleationCap('jarosite')) {
      // v5: per-check 0.45 (was 0.18) so jarosite fires reliably (~95%)
      // during brief acid windows in carbonate-buffered systems like
      // Tsumeb (where ev_supergene_acidification holds pH near 4 for
      // only ~15 steps before meteoric flush neutralizes).
      if (rng.random() < 0.45) {
        let pos = 'vug wall';
        const diss_py_jar = this.crystals.filter(c => c.mineral === 'pyrite' && c.dissolved);
        const diss_mar_jar = this.crystals.filter(c => c.mineral === 'marcasite' && c.dissolved);
        const active_py_jar = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
        if (diss_py_jar.length && rng.random() < 0.7) {
          pos = `on dissolving pyrite #${diss_py_jar[0].crystal_id}`;
        } else if (diss_mar_jar.length && rng.random() < 0.6) {
          pos = `on dissolving marcasite #${diss_mar_jar[0].crystal_id}`;
        } else if (active_py_jar.length && rng.random() < 0.4) {
          pos = `on pyrite #${active_py_jar[0].crystal_id}`;
        }
        const c = this.nucleate('jarosite', pos, sigma_jar);
        this.log.push(`  ✦ NUCLEATION: 🟡 Jarosite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_jar.toFixed(2)}, K=${this.conditions.fluid.K.toFixed(0)}, Fe=${this.conditions.fluid.Fe.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — AMD yellow, Mars-class mineral`);
      }
    }

    // Alunite nucleation — advanced argillic alteration; substrate prefers
    // dissolving feldspar (the wall-leaching origin of Al).
    const sigma_alu = this.conditions.supersaturation_alunite();
    if (sigma_alu > 1.0 && !this._atNucleationCap('alunite')) {
      // v5: per-check 0.45 (was 0.15) — same rationale as jarosite,
      // tighter alunite window (Al/25 cap means only 3 of 4 acid
      // pulses cross threshold).
      if (rng.random() < 0.45) {
        let pos = 'vug wall';
        const diss_fel_alu = this.crystals.filter(c => c.mineral === 'feldspar' && c.dissolved);
        const active_fel_alu = this.crystals.filter(c => c.mineral === 'feldspar' && c.active);
        if (diss_fel_alu.length && rng.random() < 0.7) {
          pos = `on dissolving feldspar #${diss_fel_alu[0].crystal_id}`;
        } else if (active_fel_alu.length && rng.random() < 0.4) {
          pos = `on feldspar #${active_fel_alu[0].crystal_id}`;
        }
        const c = this.nucleate('alunite', pos, sigma_alu);
        this.log.push(`  ✦ NUCLEATION: ⚪ Alunite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_alu.toFixed(2)}, K=${this.conditions.fluid.K.toFixed(0)}, Al=${this.conditions.fluid.Al.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — advanced argillic alteration index`);
      }
    }

    // Brochantite nucleation — wet-supergene Cu sulfate (pH 4-7 fork end).
    // Substrate priority: dissolving Cu sulfides > active Cu sulfides > vug wall.
    const sigma_brn_sulf = this.conditions.supersaturation_brochantite();
    if (sigma_brn_sulf > 1.0 && !this._atNucleationCap('brochantite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const diss_chc_brn = this.crystals.filter(c => c.mineral === 'chalcocite' && c.dissolved);
        const diss_cov_brn = this.crystals.filter(c => c.mineral === 'covellite' && c.dissolved);
        const active_chc_brn = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
        if (diss_chc_brn.length && rng.random() < 0.7) {
          pos = `on dissolving chalcocite #${diss_chc_brn[0].crystal_id}`;
        } else if (diss_cov_brn.length && rng.random() < 0.6) {
          pos = `on dissolving covellite #${diss_cov_brn[0].crystal_id}`;
        } else if (active_chc_brn.length && rng.random() < 0.4) {
          pos = `on chalcocite #${active_chc_brn[0].crystal_id}`;
        }
        const c = this.nucleate('brochantite', pos, sigma_brn_sulf);
        this.log.push(`  ✦ NUCLEATION: 🟢 Brochantite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_brn_sulf.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — emerald-green Cu sulfate`);
      }
    }

    // Antlerite nucleation — dry-acid Cu sulfate (pH 1-3.5 fork end).
    // Substrate-prefers dissolving brochantite (pH-fork conversion).
    const sigma_ant = this.conditions.supersaturation_antlerite();
    if (sigma_ant > 1.0 && !this._atNucleationCap('antlerite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const diss_brn_ant = this.crystals.filter(c => c.mineral === 'brochantite' && c.dissolved);
        const diss_chc_ant = this.crystals.filter(c => c.mineral === 'chalcocite' && c.dissolved);
        if (diss_brn_ant.length && rng.random() < 0.8) {
          pos = `on dissolving brochantite #${diss_brn_ant[0].crystal_id} (pH-fork conversion)`;
        } else if (diss_chc_ant.length && rng.random() < 0.5) {
          pos = `on dissolving chalcocite #${diss_chc_ant[0].crystal_id}`;
        }
        const c = this.nucleate('antlerite', pos, sigma_ant);
        this.log.push(`  ✦ NUCLEATION: 🟢 Antlerite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ant.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — dry-acid Chuquicamata Cu sulfate`);
      }
    }

    // Anhydrite nucleation — high-T or saline-low-T Ca sulfate.
    // Substrate-agnostic; in Bingham deep-zone often co-precipitates
    // with chalcopyrite (porphyry deep-brine paragenesis).
    const sigma_anh = this.conditions.supersaturation_anhydrite();
    if (sigma_anh > 1.0 && !this._atNucleationCap('anhydrite')) {
      if (rng.random() < 0.16) {
        let pos = 'vug wall';
        const active_cp_anh = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        if (active_cp_anh.length && this.conditions.temperature > 200 && rng.random() < 0.3) {
          pos = `near chalcopyrite #${active_cp_anh[0].crystal_id} (porphyry deep-brine paragenesis)`;
        }
        const c = this.nucleate('anhydrite', pos, sigma_anh);
        this.log.push(`  ✦ NUCLEATION: ⚪ Anhydrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_anh.toFixed(2)}, Ca=${this.conditions.fluid.Ca.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, salinity=${this.conditions.fluid.salinity.toFixed(0)}‰)`);
      }
    }

    // Selenite nucleation — low temperature, oxidized sulfate environment
    // The crystal that grows when everything else is ending
    const sigma_sel = this.conditions.supersaturation_selenite();
    const existing_sel = this.crystals.filter(c => c.mineral === 'selenite' && c.active);
    const total_sel = this.crystals.filter(c => c.mineral === 'selenite').length;
    if (sigma_sel > 1.0 && existing_sel.length < 2 && total_sel < 4 && !this._atNucleationCap('selenite')) {
      if (!existing_sel.length || (sigma_sel > 1.8 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        // Prefers to grow on dissolved sulfide surfaces — the oxidation zone paragenesis
        const dissolved_py = this.crystals.filter(c => c.mineral === 'pyrite' && c.dissolved);
        const dissolved_cp = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
        if (dissolved_py.length && rng.random() < 0.6) {
          pos = `on pyrite #${dissolved_py[0].crystal_id} (oxidized)`;
        } else if (dissolved_cp.length && rng.random() < 0.5) {
          pos = `on chalcopyrite #${dissolved_cp[0].crystal_id} (oxidized)`;
        }
        const c = this.nucleate('selenite', pos, sigma_sel);
        this.log.push(`  ✦ NUCLEATION: 💎 Selenite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_sel.toFixed(2)}) — gypsum blades forming in the cooling, oxidizing fluid`);
      }
    }

    // Halite nucleation — chloride evaporite, fires when a vadose-
    // transition concentration boost pushes Na × Cl × concentration²
    // into supersaturation. v27 mirror of vugg.py.
    const sigma_hal = this.conditions.supersaturation_halite();
    if (sigma_hal > 1.0 && !this._atNucleationCap('halite') && rng.random() < 0.15) {
      const c = this.nucleate('halite', 'vug wall', sigma_hal);
      this.log.push(`  ✦ NUCLEATION: 🧂 Halite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_hal.toFixed(2)}, concentration=${this.conditions.fluid.concentration.toFixed(1)}) — bathtub-ring NaCl precipitating from the evaporating brine`);
    }

    // Mirabilite nucleation — cold-side Na-sulfate evaporite. v29.
    const sigma_mirab = this.conditions.supersaturation_mirabilite();
    if (sigma_mirab > 1.0 && !this._atNucleationCap('mirabilite') && rng.random() < 0.13) {
      const c = this.nucleate('mirabilite', 'vug wall', sigma_mirab);
      this.log.push(`  ✦ NUCLEATION: ❄️ Mirabilite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mirab.toFixed(2)}, concentration=${this.conditions.fluid.concentration.toFixed(1)}) — Glauber salt from the cold playa brine`);
    }

    // Thenardite nucleation — warm-side Na-sulfate evaporite. v29.
    const sigma_then = this.conditions.supersaturation_thenardite();
    if (sigma_then > 1.0 && !this._atNucleationCap('thenardite') && rng.random() < 0.13) {
      const c = this.nucleate('thenardite', 'vug wall', sigma_then);
      this.log.push(`  ✦ NUCLEATION: 🌫️ Thenardite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_then.toFixed(2)}, concentration=${this.conditions.fluid.concentration.toFixed(1)}) — anhydrous Na₂SO₄ from the warm playa surface`);
    }

    // Borax nucleation — alkaline-brine borate evaporite, v28 mirror
    // of vugg.py. Needs Na + B + alkaline pH + low T + concentration
    // boost. Stays dormant in scenarios that don't drain.
    const sigma_brx = this.conditions.supersaturation_borax();
    if (sigma_brx > 1.0 && !this._atNucleationCap('borax') && rng.random() < 0.12) {
      const c = this.nucleate('borax', 'vug wall', sigma_brx);
      this.log.push(`  ✦ NUCLEATION: 💎 Borax #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_brx.toFixed(2)}, concentration=${this.conditions.fluid.concentration.toFixed(1)}, pH=${this.conditions.fluid.pH.toFixed(1)}) — alkaline-brine evaporite from the playa-lake chemistry of this drained vug`);
    }

    // Feldspar nucleation — needs sigma > 1.0, K or Na + Al + Si
    const sigma_feld = this.conditions.supersaturation_feldspar();
    const existing_feld = this.crystals.filter(c => c.mineral === 'feldspar' && c.active);
    const total_feld = this.crystals.filter(c => c.mineral === 'feldspar').length;
    if (sigma_feld > 1.0 && existing_feld.length < 3 && total_feld < 6 && !this._atNucleationCap('feldspar')) {
      if (!existing_feld.length || (sigma_feld > 1.8 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        // Can nucleate on quartz in pegmatite conditions
        if (existing_quartz.length && rng.random() < 0.3) {
          pos = `on quartz #${existing_quartz[0].crystal_id}`;
        }
        const c = this.nucleate('feldspar', pos, sigma_feld);
        const T = this.conditions.temperature;
        const polyName = T > 500 ? 'sanidine' : (T > 300 ? 'orthoclase' : 'microcline');
        c.mineral_display = polyName;
        this.log.push(`  ✦ NUCLEATION: Feldspar #${c.crystal_id} (${polyName}) on ${c.position} (T=${T.toFixed(0)}°C, σ=${sigma_feld.toFixed(2)}) — ${T > 500 ? 'disordered high-T form' : T > 300 ? 'partially ordered' : 'fully ordered triclinic'}`);
      }
    }

    // Albite nucleation — Na-feldspar, often co-occurs with K-feldspar in pegmatites.
    const sigma_alb = this.conditions.supersaturation_albite();
    const existing_alb = this.crystals.filter(c => c.mineral === 'albite' && c.active);
    const total_alb = this.crystals.filter(c => c.mineral === 'albite').length;
    if (sigma_alb > 1.0 && existing_alb.length < 2 && total_alb < 4 && !this._atNucleationCap('albite')) {
      if (!existing_alb.length || (sigma_alb > 1.5 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        // Classic perthite association — albite on feldspar host
        if (existing_feld.length && rng.random() < 0.5) pos = `on feldspar #${existing_feld[0].crystal_id}`;
        else if (existing_quartz.length && rng.random() < 0.3) pos = `on quartz #${existing_quartz[0].crystal_id}`;
        const c = this.nucleate('albite', pos, sigma_alb);
        this.log.push(`  ✦ NUCLEATION: Albite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_alb.toFixed(2)})`);
      }
    }

    // Galena nucleation — needs sigma > 1.0, max 4 active / 8 total
    const sigma_gal = this.conditions.supersaturation_galena();
    const existing_gal = this.crystals.filter(c => c.mineral === 'galena' && c.active);
    const total_gal = this.crystals.filter(c => c.mineral === 'galena').length;
    if (sigma_gal > 1.0 && existing_gal.length < 4 && total_gal < 8 && !this._atNucleationCap('galena')) {
      if (!existing_gal.length || (sigma_gal > 2.0 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const existing_sph3 = this.crystals.filter(c => c.mineral === 'sphalerite' && c.active);
        if (existing_sph3.length && rng.random() < 0.4) {
          pos = `on sphalerite #${existing_sph3[0].crystal_id}`;
        }
        const c = this.nucleate('galena', pos, sigma_gal);
        this.log.push(`  ✦ NUCLEATION: Galena #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_gal.toFixed(2)})`);
      }
    }

    // Molybdenite nucleation — Mo + S at high T (porphyry), max 3 active / 6 total
    const sigma_moly = this.conditions.supersaturation_molybdenite();
    const existing_moly = this.crystals.filter(c => c.mineral === 'molybdenite' && c.active);
    const total_moly = this.crystals.filter(c => c.mineral === 'molybdenite').length;
    if (sigma_moly > 1.0 && existing_moly.length < 3 && total_moly < 6 && !this._atNucleationCap('molybdenite')) {
      if (!existing_moly.length || (sigma_moly > 1.5 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        // Often associates with chalcopyrite or pyrite in porphyry systems
        const existing_cp2 = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        const existing_py2 = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
        if (existing_cp2.length && rng.random() < 0.4) {
          pos = `on chalcopyrite #${existing_cp2[0].crystal_id}`;
        } else if (existing_py2.length && rng.random() < 0.3) {
          pos = `on pyrite #${existing_py2[0].crystal_id}`;
        }
        const c = this.nucleate('molybdenite', pos, sigma_moly);
        this.log.push(`  ✦ NUCLEATION: Molybdenite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_moly.toFixed(2)}) — Mo pulse arriving`);
      }
    }

    // Goethite nucleation — the ghost mineral, now real.
    // Classic pseudomorph after pyrite/marcasite; also forms on dissolving chalcopyrite.
    const sigma_goe = this.conditions.supersaturation_goethite();
    const existing_goe_active = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
    const total_goe = this.crystals.filter(c => c.mineral === 'goethite').length;
    if (sigma_goe > 1.0 && !existing_goe_active.length && total_goe < 3 && !this._atNucleationCap('goethite')) {
      let pos = 'vug wall';
      const dissolving_py = this.crystals.filter(c => c.mineral === 'pyrite' && c.dissolved);
      const dissolving_cp = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
      const active_hem = this.crystals.filter(c => c.mineral === 'hematite' && c.active);
      if (dissolving_py.length && rng.random() < 0.7) {
        pos = `pseudomorph after pyrite #${dissolving_py[0].crystal_id}`;
      } else if (dissolving_cp.length && rng.random() < 0.5) {
        pos = `pseudomorph after chalcopyrite #${dissolving_cp[0].crystal_id}`;
      } else if (active_hem.length && rng.random() < 0.3) {
        pos = `on hematite #${active_hem[0].crystal_id}`;
      }
      const c = this.nucleate('goethite', pos, sigma_goe);
      this.log.push(`  ✦ NUCLEATION: Goethite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_goe.toFixed(2)})`);
    }

    // Adamite nucleation — Zn + As + O₂, low T oxidation zone
    const sigma_adam = this.conditions.supersaturation_adamite();
    const existing_adam = this.crystals.filter(c => c.mineral === 'adamite' && c.active);
    const total_adam = this.crystals.filter(c => c.mineral === 'adamite').length;
    if (sigma_adam > 1.0 && !existing_adam.length && total_adam < 4 && !this._atNucleationCap('adamite')) {
      let pos = 'vug wall';
      const existing_goe = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      if (existing_goe.length && rng.random() < 0.6) {
        pos = `on goethite #${existing_goe[0].crystal_id}`;
      } else if (existing_hem.length && rng.random() < 0.4) {
        pos = `on hematite #${existing_hem[0].crystal_id}`;
      }
      const c = this.nucleate('adamite', pos, sigma_adam);
      this.log.push(`  ✦ NUCLEATION: Adamite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_adam.toFixed(2)})`);
      // Second crystal — fluorescent/non-fluorescent pair
      if (sigma_adam > 1.3 && rng.random() < 0.5 && !this._atNucleationCap('adamite')) {
        const c2 = this.nucleate('adamite', pos, sigma_adam);
        this.log.push(`  ✦ NUCLEATION: Adamite #${c2.crystal_id} alongside #${c.crystal_id} — will one fluoresce and the other stay dark?`);
      }
    }

    // Mimetite nucleation — Pb + As + Cl + O₂, oxidation zone
    const sigma_mim = this.conditions.supersaturation_mimetite();
    const existing_mim = this.crystals.filter(c => c.mineral === 'mimetite' && c.active);
    const total_mim = this.crystals.filter(c => c.mineral === 'mimetite').length;
    if (sigma_mim > 1.0 && !existing_mim.length && total_mim < 3 && !this._atNucleationCap('mimetite')) {
      let pos = 'vug wall';
      const existing_gal2 = this.crystals.filter(c => c.mineral === 'galena');
      const existing_goe2 = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      if (existing_gal2.length && rng.random() < 0.6) {
        pos = `on galena #${existing_gal2[0].crystal_id}`;
      } else if (existing_goe2.length && rng.random() < 0.3) {
        pos = `on goethite #${existing_goe2[0].crystal_id}`;
      }
      const c = this.nucleate('mimetite', pos, sigma_mim);
      this.log.push(`  ✦ NUCLEATION: Mimetite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mim.toFixed(2)})`);
    }

    // Erythrite nucleation — the cobalt bloom, low-T oxidation of Co arsenides.
    const sigma_ery = this.conditions.supersaturation_erythrite();
    const existing_ery = this.crystals.filter(c => c.mineral === 'erythrite' && c.active);
    if (sigma_ery > 1.0 && !existing_ery.length && !this._atNucleationCap('erythrite')) {
      let pos = 'vug wall';
      const existing_goe_e = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      const existing_adam_e = this.crystals.filter(c => c.mineral === 'adamite' && c.active);
      if (existing_goe_e.length && rng.random() < 0.5) {
        pos = `on goethite #${existing_goe_e[0].crystal_id}`;
      } else if (existing_adam_e.length && rng.random() < 0.3) {
        pos = `on adamite #${existing_adam_e[0].crystal_id}`;
      }
      const c = this.nucleate('erythrite', pos, sigma_ery);
      this.log.push(`  ✦ NUCLEATION: Erythrite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ery.toFixed(2)})`);
    }

    // Annabergite nucleation — the nickel bloom, Ni equivalent of erythrite.
    const sigma_ann = this.conditions.supersaturation_annabergite();
    const existing_ann = this.crystals.filter(c => c.mineral === 'annabergite' && c.active);
    if (sigma_ann > 1.0 && !existing_ann.length && !this._atNucleationCap('annabergite')) {
      let pos = 'vug wall';
      const existing_goe_a = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
      const existing_ery_a = this.crystals.filter(c => c.mineral === 'erythrite' && c.active);
      if (existing_goe_a.length && rng.random() < 0.5) {
        pos = `on goethite #${existing_goe_a[0].crystal_id}`;
      } else if (existing_ery_a.length && rng.random() < 0.3) {
        pos = `alongside erythrite #${existing_ery_a[0].crystal_id}`;
      }
      const c = this.nucleate('annabergite', pos, sigma_ann);
      this.log.push(`  ✦ NUCLEATION: Annabergite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ann.toFixed(2)})`);
    }

    // Magnetite nucleation — Fe + moderate O2 (HM buffer).
    const sigma_mag = this.conditions.supersaturation_magnetite();
    const existing_mag = this.crystals.filter(c => c.mineral === 'magnetite' && c.active);
    if (sigma_mag > 1.0 && !this._atNucleationCap('magnetite')) {
      if (!existing_mag.length || (sigma_mag > 1.7 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_hem_mag = this.crystals.filter(c => c.mineral === 'hematite' && c.active);
        if (active_hem_mag.length && rng.random() < 0.3) pos = `on hematite #${active_hem_mag[0].crystal_id}`;
        const c = this.nucleate('magnetite', pos, sigma_mag);
        this.log.push(`  ✦ NUCLEATION: Magnetite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mag.toFixed(2)}, Fe=${this.conditions.fluid.Fe.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(2)})`);
      }
    }

    // Lepidocrocite nucleation — Fe + rapid oxidation at low T.
    const sigma_lep = this.conditions.supersaturation_lepidocrocite();
    const existing_lep = this.crystals.filter(c => c.mineral === 'lepidocrocite' && c.active);
    if (sigma_lep > 1.1 && !this._atNucleationCap('lepidocrocite')) {
      if (!existing_lep.length || (sigma_lep > 1.7 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const dissolving_py_lep = this.crystals.filter(c => c.mineral === 'pyrite' && c.dissolved);
        const active_qtz_lep = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        if (dissolving_py_lep.length && rng.random() < 0.6) pos = `on pyrite #${dissolving_py_lep[0].crystal_id}`;
        else if (active_qtz_lep.length && rng.random() < 0.3) pos = `on quartz #${active_qtz_lep[0].crystal_id}`;
        const c = this.nucleate('lepidocrocite', pos, sigma_lep);
        this.log.push(`  ✦ NUCLEATION: Lepidocrocite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_lep.toFixed(2)}, Fe=${this.conditions.fluid.Fe.toFixed(0)})`);
      }
    }

    // Stibnite nucleation — Sb + S + moderate T + reducing.
    const sigma_stb = this.conditions.supersaturation_stibnite();
    const existing_stb = this.crystals.filter(c => c.mineral === 'stibnite' && c.active);
    if (sigma_stb > 1.2 && !this._atNucleationCap('stibnite')) {
      if (!existing_stb.length || (sigma_stb > 1.8 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_qtz_stb = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        if (active_qtz_stb.length && rng.random() < 0.4) pos = `on quartz #${active_qtz_stb[0].crystal_id}`;
        const c = this.nucleate('stibnite', pos, sigma_stb);
        this.log.push(`  ✦ NUCLEATION: Stibnite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_stb.toFixed(2)}, Sb=${this.conditions.fluid.Sb.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Bismuthinite nucleation — Bi + S + high T + reducing.
    const sigma_bmt = this.conditions.supersaturation_bismuthinite();
    const existing_bmt = this.crystals.filter(c => c.mineral === 'bismuthinite' && c.active);
    if (sigma_bmt > 1.3 && !this._atNucleationCap('bismuthinite')) {
      if (!existing_bmt.length || (sigma_bmt > 1.8 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_qtz_bmt = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        const active_cp_bmt = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        if (active_qtz_bmt.length && rng.random() < 0.3) pos = `on quartz #${active_qtz_bmt[0].crystal_id}`;
        else if (active_cp_bmt.length && rng.random() < 0.3) pos = `on chalcopyrite #${active_cp_bmt[0].crystal_id}`;
        const c = this.nucleate('bismuthinite', pos, sigma_bmt);
        this.log.push(`  ✦ NUCLEATION: Bismuthinite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_bmt.toFixed(2)}, Bi=${this.conditions.fluid.Bi.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Native bismuth nucleation — Bi + very low S + reducing.
    const sigma_nbi = this.conditions.supersaturation_native_bismuth();
    const existing_nbi = this.crystals.filter(c => c.mineral === 'native_bismuth' && c.active);
    if (sigma_nbi > 1.4 && !this._atNucleationCap('native_bismuth')) {
      if (!existing_nbi.length || (sigma_nbi > 2.0 && rng.random() < 0.15)) {
        let pos = 'vug wall';
        const dissolving_bmt = this.crystals.filter(c => c.mineral === 'bismuthinite' && c.dissolved);
        if (dissolving_bmt.length && rng.random() < 0.5) pos = `on bismuthinite #${dissolving_bmt[0].crystal_id}`;
        const c = this.nucleate('native_bismuth', pos, sigma_nbi);
        this.log.push(`  ✦ NUCLEATION: Native bismuth #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nbi.toFixed(2)}, Bi=${this.conditions.fluid.Bi.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Argentite nucleation — Ag + S + reducing + T > 173°C.
    // High-T sibling of acanthite. Will paramorph on cooling
    // (handled by applyParamorphTransitions in run_step).
    const sigma_arg = this.conditions.supersaturation_argentite();
    if (sigma_arg > 1.0 && !this._atNucleationCap('argentite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_galena_arg = this.crystals.filter(c => c.mineral === 'galena' && c.active);
        if (active_galena_arg.length && rng.random() < 0.4) pos = `on galena #${active_galena_arg[0].crystal_id}`;
        const c = this.nucleate('argentite', pos, sigma_arg);
        this.log.push(`  ✦ NUCLEATION: Argentite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_arg.toFixed(2)}, Ag=${this.conditions.fluid.Ag.toFixed(2)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Chalcanthite nucleation — Cu + S + acidic + oxidizing + concentrated.
    const sigma_cha = this.conditions.supersaturation_chalcanthite();
    if (sigma_cha > 1.0 && !this._atNucleationCap('chalcanthite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const dissolving_brh_cha = this.crystals.filter(c => c.mineral === 'brochantite' && c.dissolved);
        const dissolving_atl_cha = this.crystals.filter(c => c.mineral === 'antlerite' && c.dissolved);
        if (dissolving_brh_cha.length && rng.random() < 0.5) pos = `on brochantite #${dissolving_brh_cha[0].crystal_id}`;
        else if (dissolving_atl_cha.length && rng.random() < 0.4) pos = `on antlerite #${dissolving_atl_cha[0].crystal_id}`;
        const c = this.nucleate('chalcanthite', pos, sigma_cha);
        this.log.push(`  ✦ NUCLEATION: Chalcanthite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cha.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)}, pH=${this.conditions.fluid.pH.toFixed(1)}, salinity=${this.conditions.fluid.salinity.toFixed(1)})`);
      }
    }

    // Descloizite nucleation — Pb + Zn + V + oxidizing.
    const sigma_des = this.conditions.supersaturation_descloizite();
    if (sigma_des > 1.0 && !this._atNucleationCap('descloizite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_van_des = this.crystals.filter(c => c.mineral === 'vanadinite' && c.active);
        if (active_van_des.length && rng.random() < 0.4) pos = `on vanadinite #${active_van_des[0].crystal_id}`;
        const c = this.nucleate('descloizite', pos, sigma_des);
        this.log.push(`  ✦ NUCLEATION: Descloizite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_des.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, Zn=${this.conditions.fluid.Zn.toFixed(0)}, V=${this.conditions.fluid.V.toFixed(1)})`);
      }
    }

    // Mottramite nucleation — Pb + Cu + V + oxidizing.
    const sigma_mot = this.conditions.supersaturation_mottramite();
    if (sigma_mot > 1.0 && !this._atNucleationCap('mottramite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_van_mot = this.crystals.filter(c => c.mineral === 'vanadinite' && c.active);
        if (active_van_mot.length && rng.random() < 0.4) pos = `on vanadinite #${active_van_mot[0].crystal_id}`;
        const c = this.nucleate('mottramite', pos, sigma_mot);
        this.log.push(`  ✦ NUCLEATION: Mottramite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mot.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, V=${this.conditions.fluid.V.toFixed(1)})`);
      }
    }

    // Tungstate pair — raspite + stolzite both PbWO4, kinetic preference
    // dispatcher gives stolzite ~90% of the time.
    let sigma_rasp = this.conditions.supersaturation_raspite();
    const sigma_stol = this.conditions.supersaturation_stolzite();
    if (sigma_rasp > 1.4 && sigma_stol > 1.0 && rng.random() < 0.9) {
      sigma_rasp = 0;
    }
    if (sigma_rasp > 1.4 && !this._atNucleationCap('raspite')) {
      if (rng.random() < 0.16) {
        const c = this.nucleate('raspite', 'vug wall', sigma_rasp);
        this.log.push(`  ✦ NUCLEATION: Raspite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_rasp.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, W=${this.conditions.fluid.W.toFixed(1)})`);
      }
    }
    if (sigma_stol > 1.0 && !this._atNucleationCap('stolzite')) {
      if (rng.random() < 0.18) {
        const c = this.nucleate('stolzite', 'vug wall', sigma_stol);
        this.log.push(`  ✦ NUCLEATION: Stolzite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_stol.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, W=${this.conditions.fluid.W.toFixed(1)})`);
      }
    }

    // Olivenite nucleation — Cu + As + oxidizing.
    const sigma_oli = this.conditions.supersaturation_olivenite();
    if (sigma_oli > 1.0 && !this._atNucleationCap('olivenite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_mal_oli = this.crystals.filter(c => c.mineral === 'malachite' && c.active);
        if (active_mal_oli.length && rng.random() < 0.3) pos = `on malachite #${active_mal_oli[0].crystal_id}`;
        const c = this.nucleate('olivenite', pos, sigma_oli);
        this.log.push(`  ✦ NUCLEATION: Olivenite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_oli.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, As=${this.conditions.fluid.As.toFixed(0)})`);
      }
    }

    // Nickeline nucleation — Ni + As + reducing + high T.
    const sigma_nik = this.conditions.supersaturation_nickeline();
    if (sigma_nik > 1.0 && !this._atNucleationCap('nickeline')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_apy_nik = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.active);
        if (active_apy_nik.length && rng.random() < 0.4) pos = `on arsenopyrite #${active_apy_nik[0].crystal_id}`;
        const c = this.nucleate('nickeline', pos, sigma_nik);
        this.log.push(`  ✦ NUCLEATION: Nickeline #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nik.toFixed(2)}, Ni=${this.conditions.fluid.Ni.toFixed(0)}, As=${this.conditions.fluid.As.toFixed(0)})`);
      }
    }

    // Millerite nucleation — Ni + S + reducing + As-poor.
    const sigma_mil = this.conditions.supersaturation_millerite();
    if (sigma_mil > 1.0 && !this._atNucleationCap('millerite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_pyr_mil = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
        if (active_pyr_mil.length && rng.random() < 0.3) pos = `on pyrite #${active_pyr_mil[0].crystal_id}`;
        const c = this.nucleate('millerite', pos, sigma_mil);
        this.log.push(`  ✦ NUCLEATION: Millerite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_mil.toFixed(2)}, Ni=${this.conditions.fluid.Ni.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Cobaltite nucleation — three-element gate Co+As+S + reducing + high T.
    const sigma_cob = this.conditions.supersaturation_cobaltite();
    if (sigma_cob > 1.2 && !this._atNucleationCap('cobaltite')) {
      if (rng.random() < 0.16) {
        let pos = 'vug wall';
        const active_apy_cob = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.active);
        if (active_apy_cob.length && rng.random() < 0.5) pos = `on arsenopyrite #${active_apy_cob[0].crystal_id}`;
        const c = this.nucleate('cobaltite', pos, sigma_cob);
        this.log.push(`  ✦ NUCLEATION: Cobaltite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cob.toFixed(2)}, Co=${this.conditions.fluid.Co.toFixed(0)}, As=${this.conditions.fluid.As.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Native tellurium nucleation — Te + reducing + telluride-metal-poor.
    const sigma_nte = this.conditions.supersaturation_native_tellurium();
    if (sigma_nte > 1.0 && !this._atNucleationCap('native_tellurium')) {
      if (rng.random() < 0.16) {
        let pos = 'vug wall';
        const active_au_nte = this.crystals.filter(c => c.mineral === 'native_gold' && c.active);
        if (active_au_nte.length && rng.random() < 0.4) pos = `on native_gold #${active_au_nte[0].crystal_id}`;
        const c = this.nucleate('native_tellurium', pos, sigma_nte);
        this.log.push(`  ✦ NUCLEATION: Native tellurium #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nte.toFixed(2)}, Te=${this.conditions.fluid.Te.toFixed(2)}, Au=${this.conditions.fluid.Au.toFixed(2)})`);
      }
    }

    // Native sulfur nucleation — synproportionation Eh window + acidic + low base metals.
    const sigma_nsu = this.conditions.supersaturation_native_sulfur();
    if (sigma_nsu > 1.0 && !this._atNucleationCap('native_sulfur')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_cel_nsu = this.crystals.filter(c => c.mineral === 'celestine' && c.active);
        const active_arag_nsu = this.crystals.filter(c => c.mineral === 'aragonite' && c.active);
        const active_gyp_nsu = this.crystals.filter(c => c.mineral === 'selenite' && c.active);
        if (active_cel_nsu.length && rng.random() < 0.5) pos = `on celestine #${active_cel_nsu[0].crystal_id}`;
        else if (active_arag_nsu.length && rng.random() < 0.4) pos = `on aragonite #${active_arag_nsu[0].crystal_id}`;
        else if (active_gyp_nsu.length && rng.random() < 0.3) pos = `on selenite #${active_gyp_nsu[0].crystal_id}`;
        const c = this.nucleate('native_sulfur', pos, sigma_nsu);
        this.log.push(`  ✦ NUCLEATION: Native sulfur #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nsu.toFixed(2)}, S=${this.conditions.fluid.S.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(2)}, pH=${this.conditions.fluid.pH.toFixed(1)})`);
      }
    }

    // Native arsenic nucleation — As + strongly_reducing + S<10 + Fe<50.
    // The residual-overflow mineral.
    const sigma_nas = this.conditions.supersaturation_native_arsenic();
    if (sigma_nas > 1.0 && !this._atNucleationCap('native_arsenic')) {
      if (rng.random() < 0.16) {
        let pos = 'vug wall';
        const dissolving_apy_nas = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.dissolved);
        if (dissolving_apy_nas.length && rng.random() < 0.5) pos = `on arsenopyrite #${dissolving_apy_nas[0].crystal_id}`;
        const c = this.nucleate('native_arsenic', pos, sigma_nas);
        this.log.push(`  ✦ NUCLEATION: Native arsenic #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nas.toFixed(2)}, As=${this.conditions.fluid.As.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(1)}, Fe=${this.conditions.fluid.Fe.toFixed(0)})`);
      }
    }

    // Native silver nucleation — Ag + strongly_reducing + S < 2.
    // The depletion mineral. Substrate preferences track the geological
    // pathway: dissolving acanthite (supergene Ag-enrichment route at
    // Tsumeb), dissolving tetrahedrite, or native_copper (Keweenaw
    // co-precipitation in S-poor basalt amygdules).
    const sigma_nag = this.conditions.supersaturation_native_silver();
    if (sigma_nag > 1.2 && !this._atNucleationCap('native_silver')) {
      if (rng.random() < 0.16) {
        let pos = 'vug wall';
        const dissolving_aca_nag = this.crystals.filter(c => c.mineral === 'acanthite' && c.dissolved);
        const dissolving_tet_nag = this.crystals.filter(c => c.mineral === 'tetrahedrite' && c.dissolved);
        const active_ncopper_nag = this.crystals.filter(c => c.mineral === 'native_copper' && c.active);
        if (dissolving_aca_nag.length && rng.random() < 0.6) pos = `on acanthite #${dissolving_aca_nag[0].crystal_id}`;
        else if (dissolving_tet_nag.length && rng.random() < 0.5) pos = `on tetrahedrite #${dissolving_tet_nag[0].crystal_id}`;
        else if (active_ncopper_nag.length && rng.random() < 0.4) pos = `on native_copper #${active_ncopper_nag[0].crystal_id}`;
        const c = this.nucleate('native_silver', pos, sigma_nag);
        this.log.push(`  ✦ NUCLEATION: Native silver #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nag.toFixed(2)}, Ag=${this.conditions.fluid.Ag.toFixed(2)}, S=${this.conditions.fluid.S.toFixed(1)})`);
      }
    }

    // Acanthite nucleation — Ag + S + reducing + T < 173°C.
    // Substrate preference: galena (the classic Ag-bearing parent),
    // dissolving tetrahedrite (often the supergene Ag source), or bare wall.
    // First Ag mineral in the sim — paragenetic successor to galena/
    // tetrahedrite/proustite, predecessor to native_silver in S-depleted pockets.
    const sigma_aca = this.conditions.supersaturation_acanthite();
    if (sigma_aca > 1.0 && !this._atNucleationCap('acanthite')) {
      if (rng.random() < 0.18) {
        let pos = 'vug wall';
        const active_galena_aca = this.crystals.filter(c => c.mineral === 'galena' && c.active);
        const dissolving_tet_aca = this.crystals.filter(c => c.mineral === 'tetrahedrite' && c.dissolved);
        if (active_galena_aca.length && rng.random() < 0.4) pos = `on galena #${active_galena_aca[0].crystal_id}`;
        else if (dissolving_tet_aca.length && rng.random() < 0.6) pos = `on tetrahedrite #${dissolving_tet_aca[0].crystal_id}`;
        const c = this.nucleate('acanthite', pos, sigma_aca);
        this.log.push(`  ✦ NUCLEATION: Acanthite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_aca.toFixed(2)}, Ag=${this.conditions.fluid.Ag.toFixed(2)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Clinobisvanite nucleation — Bi + V + oxidizing + low T.
    const sigma_cbv = this.conditions.supersaturation_clinobisvanite();
    const existing_cbv = this.crystals.filter(c => c.mineral === 'clinobisvanite' && c.active);
    if (sigma_cbv > 1.5 && !this._atNucleationCap('clinobisvanite')) {
      if (!existing_cbv.length || (sigma_cbv > 2.0 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const dissolving_nbi = this.crystals.filter(c => c.mineral === 'native_bismuth' && c.dissolved);
        const dissolving_bmt_cbv = this.crystals.filter(c => c.mineral === 'bismuthinite' && c.dissolved);
        if (dissolving_nbi.length && rng.random() < 0.5) pos = `on native_bismuth #${dissolving_nbi[0].crystal_id}`;
        else if (dissolving_bmt_cbv.length && rng.random() < 0.4) pos = `on bismuthinite #${dissolving_bmt_cbv[0].crystal_id}`;
        const c = this.nucleate('clinobisvanite', pos, sigma_cbv);
        this.log.push(`  ✦ NUCLEATION: Clinobisvanite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cbv.toFixed(2)}, Bi=${this.conditions.fluid.Bi.toFixed(1)}, V=${this.conditions.fluid.V.toFixed(1)})`);
      }
    }

    // Cuprite nucleation — Cu + narrow O₂ window (Eh-boundary mineral).
    const sigma_cpr = this.conditions.supersaturation_cuprite();
    const existing_cpr = this.crystals.filter(c => c.mineral === 'cuprite' && c.active);
    if (sigma_cpr > 1.2 && !this._atNucleationCap('cuprite')) {
      if (!existing_cpr.length || (sigma_cpr > 1.8 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_nc_cpr = this.crystals.filter(c => c.mineral === 'native_copper' && c.active);
        const active_chc_cpr = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
        if (active_nc_cpr.length && rng.random() < 0.6) pos = `on native_copper #${active_nc_cpr[0].crystal_id}`;
        else if (active_chc_cpr.length && rng.random() < 0.3) pos = `on chalcocite #${active_chc_cpr[0].crystal_id}`;
        const c = this.nucleate('cuprite', pos, sigma_cpr);
        this.log.push(`  ✦ NUCLEATION: Cuprite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cpr.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(1)})`);
      }
    }

    // Azurite nucleation — Cu + high CO₃ + O₂ (limestone-hosted Cu deposit).
    const sigma_azr = this.conditions.supersaturation_azurite();
    const existing_azr = this.crystals.filter(c => c.mineral === 'azurite' && c.active);
    if (sigma_azr > 1.4 && !this._atNucleationCap('azurite')) {
      if (!existing_azr.length || (sigma_azr > 2.0 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const active_cpr_azr = this.crystals.filter(c => c.mineral === 'cuprite' && c.active);
        const active_nc_azr = this.crystals.filter(c => c.mineral === 'native_copper' && c.active);
        if (active_cpr_azr.length && rng.random() < 0.4) pos = `on cuprite #${active_cpr_azr[0].crystal_id}`;
        else if (active_nc_azr.length && rng.random() < 0.3) pos = `on native_copper #${active_nc_azr[0].crystal_id}`;
        const c = this.nucleate('azurite', pos, sigma_azr);
        this.log.push(`  ✦ NUCLEATION: Azurite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_azr.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, CO₃=${this.conditions.fluid.CO3.toFixed(0)})`);
      }
    }

    // Chrysocolla nucleation — Cu²⁺ + SiO₂ at low-T oxidation, the
    // cyan finale of the copper paragenesis. Pseudomorphs azurite when
    // the pCO₂ drop arrives with silica — the Bisbee signature.
    const sigma_chry = this.conditions.supersaturation_chrysocolla();
    const existing_chry = this.crystals.filter(c => c.mineral === 'chrysocolla' && c.active);
    if (sigma_chry > 1.2 && !this._atNucleationCap('chrysocolla')) {
      if (!existing_chry.length || (sigma_chry > 1.8 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const active_azr_chry = this.crystals.filter(c => c.mineral === 'azurite' && c.active);
        const dissolving_azr_chry = this.crystals.filter(c => c.mineral === 'azurite' && c.dissolved);
        const active_cpr_chry = this.crystals.filter(c => c.mineral === 'cuprite' && c.active);
        const active_nc_chry = this.crystals.filter(c => c.mineral === 'native_copper' && c.active);
        if (dissolving_azr_chry.length && rng.random() < 0.6) pos = `pseudomorph after azurite #${dissolving_azr_chry[0].crystal_id}`;
        else if (active_azr_chry.length && rng.random() < 0.3) pos = `on azurite #${active_azr_chry[0].crystal_id}`;
        else if (active_cpr_chry.length && rng.random() < 0.5) pos = `on cuprite #${active_cpr_chry[0].crystal_id}`;
        else if (active_nc_chry.length && rng.random() < 0.4) pos = `on native_copper #${active_nc_chry[0].crystal_id}`;
        const c = this.nucleate('chrysocolla', pos, sigma_chry);
        this.log.push(`  ✦ NUCLEATION: Chrysocolla #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_chry.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, SiO₂=${this.conditions.fluid.SiO2.toFixed(0)}, CO₃=${this.conditions.fluid.CO3.toFixed(0)})`);
      }
    }

    // Native copper nucleation — Cu + strongly reducing + low S.
    const sigma_nc = this.conditions.supersaturation_native_copper();
    const existing_nc_nuc = this.crystals.filter(c => c.mineral === 'native_copper' && c.active);
    if (sigma_nc > 1.6 && !this._atNucleationCap('native_copper')) {
      if (!existing_nc_nuc.length || (sigma_nc > 2.2 && rng.random() < 0.15)) {
        let pos = 'vug wall';
        const active_chc_nc = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
        const active_brn_nc = this.crystals.filter(c => c.mineral === 'bornite' && c.active);
        if (active_chc_nc.length && rng.random() < 0.4) pos = `on chalcocite #${active_chc_nc[0].crystal_id}`;
        else if (active_brn_nc.length && rng.random() < 0.3) pos = `on bornite #${active_brn_nc[0].crystal_id}`;
        const c = this.nucleate('native_copper', pos, sigma_nc);
        this.log.push(`  ✦ NUCLEATION: Native copper #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_nc.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, O₂=${this.conditions.fluid.O2.toFixed(2)})`);
      }
    }

    // Native gold nucleation — Au + tolerant of both Eh regimes.
    // Substrate preference: chalcocite (supergene Au-on-chalcocite,
    // Bisbee enrichment-blanket habit) > pyrite (orogenic gold-on-pyrite)
    // > bornite > free vug wall.
    const sigma_au = this.conditions.supersaturation_native_gold();
    const existing_au = this.crystals.filter(c => c.mineral === 'native_gold' && c.active);
    if (sigma_au > 1.0 && !this._atNucleationCap('native_gold')) {
      if (!existing_au.length || (sigma_au > 1.5 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_chc_au = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
        const active_py_au = this.crystals.filter(c => c.mineral === 'pyrite' && c.active);
        const active_brn_au = this.crystals.filter(c => c.mineral === 'bornite' && c.active);
        if (active_chc_au.length && rng.random() < 0.4) pos = `on chalcocite #${active_chc_au[0].crystal_id}`;
        else if (active_py_au.length && rng.random() < 0.25) pos = `on pyrite #${active_py_au[0].crystal_id}`;
        else if (active_brn_au.length && rng.random() < 0.2) pos = `on bornite #${active_brn_au[0].crystal_id}`;
        const c = this.nucleate('native_gold', pos, sigma_au);
        this.log.push(`  ✦ NUCLEATION: Native gold #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_au.toFixed(2)}, Au=${this.conditions.fluid.Au.toFixed(2)} ppm)`);
      }
    }

    // Bornite nucleation — Cu + Fe + S, Cu:Fe > 2:1.
    const sigma_brn = this.conditions.supersaturation_bornite();
    const existing_brn = this.crystals.filter(c => c.mineral === 'bornite' && c.active);
    if (sigma_brn > 1.0 && !this._atNucleationCap('bornite')) {
      if (!existing_brn.length || (sigma_brn > 1.7 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const dissolving_cp_brn = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
        const active_cp_brn = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        if (dissolving_cp_brn.length && rng.random() < 0.5) pos = `on chalcopyrite #${dissolving_cp_brn[0].crystal_id}`;
        else if (active_cp_brn.length && rng.random() < 0.3) pos = `on chalcopyrite #${active_cp_brn[0].crystal_id}`;
        const c = this.nucleate('bornite', pos, sigma_brn);
        this.log.push(`  ✦ NUCLEATION: Bornite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_brn.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, Fe=${this.conditions.fluid.Fe.toFixed(0)})`);
      }
    }

    // Chalcocite nucleation — Cu-rich + S + low T + reducing.
    const sigma_chc = this.conditions.supersaturation_chalcocite();
    const existing_chc = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
    if (sigma_chc > 1.1 && !this._atNucleationCap('chalcocite')) {
      if (!existing_chc.length || (sigma_chc > 1.7 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const dissolving_cp_chc = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
        const active_cp_chc = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        const dissolving_brn = this.crystals.filter(c => c.mineral === 'bornite' && c.dissolved);
        const active_brn = this.crystals.filter(c => c.mineral === 'bornite' && c.active);
        if (dissolving_cp_chc.length && rng.random() < 0.6) pos = `on chalcopyrite #${dissolving_cp_chc[0].crystal_id}`;
        else if (active_cp_chc.length && rng.random() < 0.4) pos = `on chalcopyrite #${active_cp_chc[0].crystal_id}`;
        else if (dissolving_brn.length && rng.random() < 0.6) pos = `on bornite #${dissolving_brn[0].crystal_id}`;
        else if (active_brn.length && rng.random() < 0.4) pos = `on bornite #${active_brn[0].crystal_id}`;
        const c = this.nucleate('chalcocite', pos, sigma_chc);
        this.log.push(`  ✦ NUCLEATION: Chalcocite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_chc.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Covellite nucleation — Cu + S-rich + low T (transition zone).
    const sigma_cov = this.conditions.supersaturation_covellite();
    const existing_cov = this.crystals.filter(c => c.mineral === 'covellite' && c.active);
    if (sigma_cov > 1.2 && !this._atNucleationCap('covellite')) {
      if (!existing_cov.length || (sigma_cov > 1.7 && rng.random() < 0.2)) {
        let pos = 'vug wall';
        const active_chc_cov = this.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
        const active_cp_cov = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.active);
        if (active_chc_cov.length && rng.random() < 0.5) pos = `on chalcocite #${active_chc_cov[0].crystal_id}`;
        else if (active_cp_cov.length && rng.random() < 0.3) pos = `on chalcopyrite #${active_cp_cov[0].crystal_id}`;
        const c = this.nucleate('covellite', pos, sigma_cov);
        this.log.push(`  ✦ NUCLEATION: Covellite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cov.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Anglesite nucleation — Pb + oxidized S + O₂ (supergene).
    const sigma_ang = this.conditions.supersaturation_anglesite();
    const existing_ang = this.crystals.filter(c => c.mineral === 'anglesite' && c.active);
    if (sigma_ang > 1.1 && !this._atNucleationCap('anglesite')) {
      if (!existing_ang.length || (sigma_ang > 1.8 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const dissolving_gal = this.crystals.filter(c => c.mineral === 'galena' && (c.dissolved || rng.random() < 0.6));
        const active_gal_ang = this.crystals.filter(c => c.mineral === 'galena' && c.active);
        if (dissolving_gal.length && rng.random() < 0.6) pos = `on galena #${dissolving_gal[0].crystal_id}`;
        else if (active_gal_ang.length && rng.random() < 0.4) pos = `on galena #${active_gal_ang[0].crystal_id}`;
        const c = this.nucleate('anglesite', pos, sigma_ang);
        this.log.push(`  ✦ NUCLEATION: Anglesite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ang.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, S=${this.conditions.fluid.S.toFixed(0)})`);
      }
    }

    // Cerussite nucleation — Pb + CO₃ (supergene).
    const sigma_cer = this.conditions.supersaturation_cerussite();
    const existing_cer = this.crystals.filter(c => c.mineral === 'cerussite' && c.active);
    if (sigma_cer > 1.0 && !this._atNucleationCap('cerussite')) {
      if (!existing_cer.length || (sigma_cer > 1.8 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const dissolving_ang = this.crystals.filter(c => c.mineral === 'anglesite' && c.dissolved);
        const dissolving_gal_c = this.crystals.filter(c => c.mineral === 'galena' && c.dissolved);
        const active_gal_c = this.crystals.filter(c => c.mineral === 'galena' && c.active);
        if (dissolving_ang.length && rng.random() < 0.7) pos = `on anglesite #${dissolving_ang[0].crystal_id}`;
        else if (dissolving_gal_c.length && rng.random() < 0.5) pos = `on galena #${dissolving_gal_c[0].crystal_id}`;
        else if (active_gal_c.length && rng.random() < 0.3) pos = `on galena #${active_gal_c[0].crystal_id}`;
        const c = this.nucleate('cerussite', pos, sigma_cer);
        this.log.push(`  ✦ NUCLEATION: Cerussite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cer.toFixed(2)}, Pb=${this.conditions.fluid.Pb.toFixed(0)}, CO3=${this.conditions.fluid.CO3.toFixed(0)})`);
      }
    }

    // Pyromorphite nucleation — Pb + P + Cl (supergene, P-gated).
    const sigma_pyr = this.conditions.supersaturation_pyromorphite();
    const existing_pyr = this.crystals.filter(c => c.mineral === 'pyromorphite' && c.active);
    if (sigma_pyr > 1.2 && !this._atNucleationCap('pyromorphite')) {
      if (!existing_pyr.length || (sigma_pyr > 1.8 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const dissolving_cer_p = this.crystals.filter(c => c.mineral === 'cerussite' && c.dissolved);
        const active_cer_p = this.crystals.filter(c => c.mineral === 'cerussite' && c.active);
        const existing_goe_pyr = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
        if (dissolving_cer_p.length && rng.random() < 0.6) pos = `on cerussite #${dissolving_cer_p[0].crystal_id}`;
        else if (active_cer_p.length && rng.random() < 0.3) pos = `on cerussite #${active_cer_p[0].crystal_id}`;
        else if (existing_goe_pyr.length && rng.random() < 0.3) pos = `on goethite #${existing_goe_pyr[0].crystal_id}`;
        const c = this.nucleate('pyromorphite', pos, sigma_pyr);
        this.log.push(`  ✦ NUCLEATION: Pyromorphite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_pyr.toFixed(2)}, P=${this.conditions.fluid.P.toFixed(1)}, Cl=${this.conditions.fluid.Cl.toFixed(0)})`);
      }
    }

    // Vanadinite nucleation — Pb + V + Cl (supergene, V-gated).
    const sigma_vnd = this.conditions.supersaturation_vanadinite();
    const existing_vnd = this.crystals.filter(c => c.mineral === 'vanadinite' && c.active);
    if (sigma_vnd > 1.3 && !this._atNucleationCap('vanadinite')) {
      if (!existing_vnd.length || (sigma_vnd > 1.8 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const existing_goe_vnd = this.crystals.filter(c => c.mineral === 'goethite' && c.active);
        const dissolving_cer_v = this.crystals.filter(c => c.mineral === 'cerussite' && c.dissolved);
        if (existing_goe_vnd.length && rng.random() < 0.7) pos = `on goethite #${existing_goe_vnd[0].crystal_id}`;
        else if (dissolving_cer_v.length && rng.random() < 0.4) pos = `on cerussite #${dissolving_cer_v[0].crystal_id}`;
        const c = this.nucleate('vanadinite', pos, sigma_vnd);
        this.log.push(`  ✦ NUCLEATION: Vanadinite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_vnd.toFixed(2)}, V=${this.conditions.fluid.V.toFixed(1)}, Pb=${this.conditions.fluid.Pb.toFixed(0)})`);
      }
    }

    // Spodumene nucleation — Li + Al + SiO₂ (Li-gated, σ > 1.5).
    // Lithium competes with elbaite tourmaline for the same fluid Li —
    // spodumene also needs a hotter fluid (T > 400°C), so pocket
    // paragenesis tends to see schorl → spodumene → elbaite as the
    // fluid cools and Li remains. max_nucleation_count=4.
    const sigma_spd = this.conditions.supersaturation_spodumene();
    const existing_spd = this.crystals.filter(c => c.mineral === 'spodumene' && c.active);
    if (sigma_spd > 1.5 && !this._atNucleationCap('spodumene')) {
      if (!existing_spd.length || (sigma_spd > 2.5 && rng.random() < 0.15)) {
        let pos = 'vug wall';
        const existing_qtz_spd = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        const existing_feld_spd = this.crystals.filter(c => c.mineral === 'feldspar' && c.active);
        if (existing_qtz_spd.length && rng.random() < 0.35) {
          pos = `on quartz #${existing_qtz_spd[0].crystal_id}`;
        } else if (existing_feld_spd.length && rng.random() < 0.35) {
          pos = `on feldspar #${existing_feld_spd[0].crystal_id}`;
        }
        const c = this.nucleate('spodumene', pos, sigma_spd);
        const f = this.conditions.fluid;
        let tag;
        if (f.Cr > 0.5) tag = 'hiddenite';
        else if (f.Mn > 2.0) tag = 'kunzite';
        else if (f.Fe > 10) tag = 'triphane-yellow';
        else tag = 'triphane';
        this.log.push(`  ✦ NUCLEATION: Spodumene #${c.crystal_id} (${tag}) on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_spd.toFixed(2)}, Li=${f.Li.toFixed(0)} ppm, Mn=${f.Mn.toFixed(1)}, Cr=${f.Cr.toFixed(2)})`);
      }
    }

    // Beryl family nucleation — Be + Al + SiO₂ with chromophore dispatch.
    // Post-Round-7: 5 species (emerald/morganite/heliodor/aquamarine/
    // goshenite(beryl)) each nucleate via their own supersaturation
    // function, which encodes the priority chain through exclusion
    // preconditions. Dispatch evaluates each in priority order and fires
    // AT MOST ONE per step — the shared Be pool would otherwise let two
    // siblings over-nucleate.
    const beryl_family_candidates = [
      ['emerald', this.conditions.supersaturation_emerald(), 1.4],
      ['morganite', this.conditions.supersaturation_morganite(), 1.4],
      ['heliodor', this.conditions.supersaturation_heliodor(), 1.4],
      ['aquamarine', this.conditions.supersaturation_aquamarine(), 1.3],
      ['beryl', this.conditions.supersaturation_beryl(), 1.8],
    ];
    const existing_qtz_ber = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
    const existing_feld_ber = this.crystals.filter(c => c.mineral === 'feldspar' && c.active);
    for (const [species, sigma_bf, threshold] of beryl_family_candidates) {
      if (sigma_bf <= threshold) continue;
      if (this._atNucleationCap(species)) continue;
      const existing_sp = this.crystals.filter(c => c.mineral === species && c.active);
      if (existing_sp.length && !(sigma_bf > threshold + 0.7 && rng.random() < 0.15)) continue;
      let pos = 'vug wall';
      if (existing_qtz_ber.length && rng.random() < 0.4) {
        pos = `on quartz #${existing_qtz_ber[0].crystal_id}`;
      } else if (existing_feld_ber.length && rng.random() < 0.4) {
        pos = `on feldspar #${existing_feld_ber[0].crystal_id}`;
      }
      const c = this.nucleate(species, pos, sigma_bf);
      const f = this.conditions.fluid;
      const speciesCap = species.charAt(0).toUpperCase() + species.slice(1);
      this.log.push(`  ✦ NUCLEATION: ${speciesCap} #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_bf.toFixed(2)}, Be=${f.Be.toFixed(0)} ppm, Cr=${f.Cr.toFixed(2)}, Fe=${f.Fe.toFixed(0)}, Mn=${f.Mn.toFixed(2)})`);
      break;  // only one beryl-family nucleation per step
    }

    // Corundum family nucleation — Al₂O₃ with SiO₂-undersaturation upper gate.
    // Priority: ruby > sapphire > corundum. One per step (shared Al pool).
    const corundum_family_candidates = [
      ['ruby', this.conditions.supersaturation_ruby(), 1.5],
      ['sapphire', this.conditions.supersaturation_sapphire(), 1.4],
      ['corundum', this.conditions.supersaturation_corundum(), 1.3],
    ];
    for (const [species, sigma_cf, threshold] of corundum_family_candidates) {
      if (sigma_cf <= threshold) continue;
      if (this._atNucleationCap(species)) continue;
      const existing_sp = this.crystals.filter(c => c.mineral === species && c.active);
      if (existing_sp.length && !(sigma_cf > threshold + 0.5 && rng.random() < 0.2)) continue;
      const pos = 'vug wall';
      const c = this.nucleate(species, pos, sigma_cf);
      const f = this.conditions.fluid;
      const speciesCap = species.charAt(0).toUpperCase() + species.slice(1);
      this.log.push(`  ✦ NUCLEATION: ${speciesCap} #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_cf.toFixed(2)}, Al=${f.Al.toFixed(0)}, SiO2=${f.SiO2.toFixed(0)}, Cr=${f.Cr.toFixed(2)}, Fe=${f.Fe.toFixed(1)}, Ti=${f.Ti.toFixed(2)})`);
      break;  // only one corundum-family nucleation per step
    }

    // Tourmaline nucleation — Na + B + Al + SiO₂ (B-gated, σ=1.3).
    // Schorl (Fe²⁺-dominant black) early, elbaite varieties (rubellite,
    // verdelite, indicolite, Paraíba) late as Fe depletes and Li
    // accumulates. Nucleation label previews the variety likely to grow.
    const sigma_tml = this.conditions.supersaturation_tourmaline();
    const existing_tml = this.crystals.filter(c => c.mineral === 'tourmaline' && c.active);
    if (sigma_tml > 1.3 && !this._atNucleationCap('tourmaline')) {
      if (!existing_tml.length || (sigma_tml > 2.0 && rng.random() < 0.25)) {
        let pos = 'vug wall';
        const existing_qtz_tml = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        const existing_feldspar_tml = this.crystals.filter(c => c.mineral === 'feldspar' && c.active);
        if (existing_qtz_tml.length && rng.random() < 0.4) {
          pos = `on quartz #${existing_qtz_tml[0].crystal_id}`;
        } else if (existing_feldspar_tml.length && rng.random() < 0.4) {
          pos = `on feldspar #${existing_feldspar_tml[0].crystal_id}`;
        }
        const c = this.nucleate('tourmaline', pos, sigma_tml);
        const f = this.conditions.fluid;
        let tag;
        if (f.Cu > 1.0) tag = 'Paraíba';
        else if (f.Li > 10 && f.Mn > 0.3) tag = 'rubellite';
        else if (f.Li > 10 && (f.Cr > 0.5 || f.V > 1.0)) tag = 'verdelite';
        else if (f.Fe > 15 && f.Li < 5) tag = 'schorl';
        else if (f.Li > 10) tag = 'elbaite';
        else tag = 'mixed';
        this.log.push(`  ✦ NUCLEATION: Tourmaline #${c.crystal_id} (${tag}) on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_tml.toFixed(2)}, B=${f.B.toFixed(0)} ppm, Fe=${f.Fe.toFixed(0)}, Li=${f.Li.toFixed(0)})`);
      }
    }

    // Topaz nucleation — Al + SiO₂ + F (F-gated, nucleation_sigma=1.4).
    // Threshold is the Ouro Preto gate: early quartz grows alone while
    // fluorine accumulates; topaz appears only when F crosses saturation.
    // Often grows on quartz (vein-lining paragenesis).
    const sigma_tpz = this.conditions.supersaturation_topaz();
    const existing_tpz = this.crystals.filter(c => c.mineral === 'topaz' && c.active);
    if (sigma_tpz > 1.4 && !this._atNucleationCap('topaz')) {
      if (!existing_tpz.length || (sigma_tpz > 2.0 && rng.random() < 0.3)) {
        let pos = 'vug wall';
        const existing_qtz_tpz = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
        if (existing_qtz_tpz.length && rng.random() < 0.5) {
          pos = `on quartz #${existing_qtz_tpz[0].crystal_id}`;
        }
        const c = this.nucleate('topaz', pos, sigma_tpz);
        const imperial = this.conditions.fluid.Cr > 3.0;
        const flag = imperial ? ' ✨ imperial color window open' : '';
        this.log.push(`  ✦ NUCLEATION: Topaz #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_tpz.toFixed(2)}, F=${this.conditions.fluid.F.toFixed(0)} ppm, Cr=${this.conditions.fluid.Cr.toFixed(1)} ppm)${flag}`);
      }
    }

    // Rosasite nucleation — Cu-dominant supergene carbonate (Round 9a).
    // The broth-ratio gate (Cu/(Cu+Zn) > 0.5) is enforced inside
    // supersaturation_rosasite, so we don't double-check here. Substrate
    // preference: weathering chalcopyrite (Cu source) or weathering
    // sphalerite (Zn co-source), or bare wall.
    const sigma_ros = this.conditions.supersaturation_rosasite();
    if (sigma_ros > 1.0 && !this._atNucleationCap('rosasite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_cpy = this.crystals.filter(c => c.mineral === 'chalcopyrite' && c.dissolved);
        const weathering_sph = this.crystals.filter(c => c.mineral === 'sphalerite' && c.dissolved);
        if (weathering_cpy.length && rng.random() < 0.4) {
          pos = `on weathering chalcopyrite #${weathering_cpy[0].crystal_id}`;
        } else if (weathering_sph.length && rng.random() < 0.3) {
          pos = `on weathering sphalerite #${weathering_sph[0].crystal_id}`;
        }
        const c = this.nucleate('rosasite', pos, sigma_ros);
        const cu_zn = this.conditions.fluid.Cu + this.conditions.fluid.Zn;
        const cu_pct = cu_zn > 0 ? (this.conditions.fluid.Cu / cu_zn * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Rosasite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_ros.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, Zn=${this.conditions.fluid.Zn.toFixed(0)}, Cu-fraction=${cu_pct.toFixed(0)}%) — broth-ratio branch: Cu-dominant`);
      }
    }

    // Aurichalcite nucleation — Zn-dominant supergene carbonate (Round 9a).
    // Mirror of rosasite. Substrate preference: weathering sphalerite or
    // adjacent active rosasite (the two species are commonly intergrown).
    const sigma_aur = this.conditions.supersaturation_aurichalcite();
    if (sigma_aur > 1.0 && !this._atNucleationCap('aurichalcite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_sph = this.crystals.filter(c => c.mineral === 'sphalerite' && c.dissolved);
        const active_ros = this.crystals.filter(c => c.mineral === 'rosasite' && c.active);
        if (weathering_sph.length && rng.random() < 0.4) {
          pos = `on weathering sphalerite #${weathering_sph[0].crystal_id}`;
        } else if (active_ros.length && rng.random() < 0.4) {
          pos = `adjacent to rosasite #${active_ros[0].crystal_id}`;
        }
        const c = this.nucleate('aurichalcite', pos, sigma_aur);
        const cu_zn = this.conditions.fluid.Cu + this.conditions.fluid.Zn;
        const zn_pct = cu_zn > 0 ? (this.conditions.fluid.Zn / cu_zn * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Aurichalcite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_aur.toFixed(2)}, Cu=${this.conditions.fluid.Cu.toFixed(0)}, Zn=${this.conditions.fluid.Zn.toFixed(0)}, Zn-fraction=${zn_pct.toFixed(0)}%) — broth-ratio branch: Zn-dominant`);
      }
    }

    // Torbernite nucleation — P-branch of the uranyl anion-competition
    // trio (Round 9b). Substrate preference: weathering uraninite or wall.
    const sigma_tor = this.conditions.supersaturation_torbernite();
    if (sigma_tor > 1.0 && !this._atNucleationCap('torbernite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        if (weathering_urn.length && rng.random() < 0.5) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        }
        const c = this.nucleate('torbernite', pos, sigma_tor);
        const p_as = this.conditions.fluid.P + this.conditions.fluid.As;
        const p_pct = p_as > 0 ? (this.conditions.fluid.P / p_as * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Torbernite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_tor.toFixed(2)}, U=${this.conditions.fluid.U.toFixed(2)}, P=${this.conditions.fluid.P.toFixed(1)}, As=${this.conditions.fluid.As.toFixed(1)}, P-fraction=${p_pct.toFixed(0)}%) — anion-competition branch: P-dominant`);
      }
    }

    // Zeunerite nucleation — As-branch of the uranyl anion-competition trio.
    const sigma_zeu = this.conditions.supersaturation_zeunerite();
    if (sigma_zeu > 1.0 && !this._atNucleationCap('zeunerite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        const weathering_apy = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.dissolved);
        const active_tor = this.crystals.filter(c => c.mineral === 'torbernite' && c.active);
        if (weathering_urn.length && rng.random() < 0.4) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        } else if (weathering_apy.length && rng.random() < 0.4) {
          pos = `on weathering arsenopyrite #${weathering_apy[0].crystal_id}`;
        } else if (active_tor.length && rng.random() < 0.3) {
          pos = `adjacent to torbernite #${active_tor[0].crystal_id}`;
        }
        const c = this.nucleate('zeunerite', pos, sigma_zeu);
        const p_as = this.conditions.fluid.P + this.conditions.fluid.As;
        const as_pct = p_as > 0 ? (this.conditions.fluid.As / p_as * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Zeunerite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_zeu.toFixed(2)}, U=${this.conditions.fluid.U.toFixed(2)}, P=${this.conditions.fluid.P.toFixed(1)}, As=${this.conditions.fluid.As.toFixed(1)}, As-fraction=${as_pct.toFixed(0)}%) — anion-competition branch: As-dominant`);
      }
    }

    // Carnotite nucleation — V-branch of the uranyl anion-competition trio (Round 9c).
    // Substrate preference: weathering uraninite (U source) or "organic-rich" position
    // via Fe>5 + low-T proxy (real carnotite famously concentrates around petrified
    // wood; sim doesn't track organic matter as a separate species).
    const sigma_car = this.conditions.supersaturation_carnotite();
    if (sigma_car > 1.0 && !this._atNucleationCap('carnotite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        if (weathering_urn.length && rng.random() < 0.5) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        } else if (this.conditions.fluid.Fe > 5 && this.conditions.temperature < 30 && rng.random() < 0.3) {
          pos = 'around organic carbon (roll-front position)';
        }
        const c = this.nucleate('carnotite', pos, sigma_car);
        const anion_total = this.conditions.fluid.P + this.conditions.fluid.As + this.conditions.fluid.V;
        const v_pct = anion_total > 0 ? (this.conditions.fluid.V / anion_total * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Carnotite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_car.toFixed(2)}, K=${this.conditions.fluid.K.toFixed(0)}, U=${this.conditions.fluid.U.toFixed(2)}, V=${this.conditions.fluid.V.toFixed(1)}, V-fraction=${v_pct.toFixed(0)}%) — anion-competition branch: V-dominant`);
      }
    }

    // Autunite nucleation — Ca-branch of the uranyl cation+anion fork
    // (Round 9d, May 2026). Substrate preference: weathering uraninite
    // (canonical paragenesis). The cation fork (Ca/(Cu+Ca)>0.5) is enforced
    // inside supersaturation_autunite — we don't double-check here.
    const sigma_aut = this.conditions.supersaturation_autunite();
    if (sigma_aut > 1.0 && !this._atNucleationCap('autunite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        if (weathering_urn.length && rng.random() < 0.5) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        }
        const c = this.nucleate('autunite', pos, sigma_aut);
        const cation_total = this.conditions.fluid.Cu + this.conditions.fluid.Ca;
        const ca_pct = cation_total > 0 ? (this.conditions.fluid.Ca / cation_total * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Autunite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_aut.toFixed(2)}, Ca=${this.conditions.fluid.Ca.toFixed(0)}, U=${this.conditions.fluid.U.toFixed(2)}, P=${this.conditions.fluid.P.toFixed(1)}, Ca-fraction=${ca_pct.toFixed(0)}%) — cation+anion fork: Ca-dominant on the P-branch`);
      }
    }

    // Uranospinite nucleation — Ca-branch / As-anion of the autunite-
    // group fork (Round 9e). Substrate preference: weathering uraninite
    // OR weathering arsenopyrite OR active zeunerite (the Cu-cation
    // partner often co-mineralizes at Schneeberg).
    const sigma_uros = this.conditions.supersaturation_uranospinite();
    if (sigma_uros > 1.0 && !this._atNucleationCap('uranospinite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        const weathering_apy = this.crystals.filter(c => c.mineral === 'arsenopyrite' && c.dissolved);
        const active_zeu = this.crystals.filter(c => c.mineral === 'zeunerite' && c.active);
        if (weathering_urn.length && rng.random() < 0.4) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        } else if (weathering_apy.length && rng.random() < 0.4) {
          pos = `on weathering arsenopyrite #${weathering_apy[0].crystal_id}`;
        } else if (active_zeu.length && rng.random() < 0.3) {
          pos = `adjacent to zeunerite #${active_zeu[0].crystal_id}`;
        }
        const c = this.nucleate('uranospinite', pos, sigma_uros);
        const cation_total = this.conditions.fluid.Cu + this.conditions.fluid.Ca;
        const ca_pct = cation_total > 0 ? (this.conditions.fluid.Ca / cation_total * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Uranospinite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_uros.toFixed(2)}, Ca=${this.conditions.fluid.Ca.toFixed(0)}, U=${this.conditions.fluid.U.toFixed(2)}, As=${this.conditions.fluid.As.toFixed(1)}, Ca-fraction=${ca_pct.toFixed(0)}%) — cation+anion fork: Ca-dominant on the As-branch`);
      }
    }

    // Tyuyamunite nucleation — Ca-branch / V-anion of the autunite-group
    // fork (Round 9e). Substrate preference: weathering uraninite OR
    // active carnotite (the K-cation partner often intergrown in Colorado
    // Plateau and Tyuya-Muyun deposits) OR roll-front position.
    const sigma_tyu = this.conditions.supersaturation_tyuyamunite();
    if (sigma_tyu > 1.0 && !this._atNucleationCap('tyuyamunite')) {
      if (rng.random() < 0.20) {
        let pos = 'vug wall';
        const weathering_urn = this.crystals.filter(c => c.mineral === 'uraninite' && c.dissolved);
        const active_car = this.crystals.filter(c => c.mineral === 'carnotite' && c.active);
        if (weathering_urn.length && rng.random() < 0.4) {
          pos = `on weathering uraninite #${weathering_urn[0].crystal_id}`;
        } else if (active_car.length && rng.random() < 0.4) {
          pos = `adjacent to carnotite #${active_car[0].crystal_id}`;
        } else if (this.conditions.fluid.Fe > 5 && this.conditions.temperature < 30 && rng.random() < 0.3) {
          pos = 'around organic carbon (roll-front position)';
        }
        const c = this.nucleate('tyuyamunite', pos, sigma_tyu);
        const cation_total = this.conditions.fluid.K + this.conditions.fluid.Ca;
        const ca_pct = cation_total > 0 ? (this.conditions.fluid.Ca / cation_total * 100) : 0;
        this.log.push(`  ✦ NUCLEATION: Tyuyamunite #${c.crystal_id} on ${c.position} (T=${this.conditions.temperature.toFixed(0)}°C, σ=${sigma_tyu.toFixed(2)}, Ca=${this.conditions.fluid.Ca.toFixed(0)}, U=${this.conditions.fluid.U.toFixed(2)}, V=${this.conditions.fluid.V.toFixed(1)}, Ca-fraction=${ca_pct.toFixed(0)}%) — cation+anion fork: Ca-dominant on the V-branch`);
      }
    }
  }

  apply_events() {
    for (const event of this.events) {
      if (event.step === this.step) {
        const result = event.apply_fn(this.conditions);
        this.log.push('');
        this.log.push(`  ⚡ EVENT: ${event.name}`);
        this.log.push(`     ${result}`);
        this.log.push('');
      }
    }
  }

  dissolve_wall() {
    const wall = this.conditions.wall;
    // Acid strength = how far below the carbonate-attack threshold pH we
    // are. Negative when pH ≥ 5.5; clipped to 0 inside wall.dissolve().
    const acid_strength = Math.max(0.0, 5.5 - this.conditions.fluid.pH);
    // Skip the call entirely when there's no work to do — neutral fluid
    // AND default reactivity. Avoids logging noise.
    if (acid_strength <= 0.0 && wall.reactivity <= 1.0) return;

    const pre_sigma_cal = this.conditions.supersaturation_calcite();
    const pre_Ca = this.conditions.fluid.Ca;

    const result = wall.dissolve(acid_strength, this.conditions.fluid);

    if (result.dissolved) {
      // Distribute the erosion per-cell. Cells shielded by acid-resistant
      // crystals don't budge, concentrating the attack elsewhere — the
      // vug grows lopsided in whatever direction the deposit left bare.
      const blocked = this._wallCellsBlockedByCrystals();
      this.wall_state.erodeCells(result.rate_mm, blocked);
      const post_sigma_cal = this.conditions.supersaturation_calcite();

      this.log.push(`  🧱 WALL DISSOLUTION: ${result.rate_mm.toFixed(2)} mm of ${wall.composition} dissolved`);
      if (blocked.size) {
        this.log.push(`     ${blocked.size} cell${blocked.size === 1 ? '' : 's'} shielded by acid-resistant crystal growth`);
      }
      this.log.push(`     pH ${result.ph_before.toFixed(1)} → ${result.ph_after.toFixed(1)} (carbonate buffering)`);
      this.log.push(`     Released: Ca²⁺ +${result.ca_released.toFixed(0)} ppm, CO₃²⁻ +${result.co3_released.toFixed(0)} ppm, Fe +${result.fe_released.toFixed(1)}, Mn +${result.mn_released.toFixed(1)}`);
      this.log.push(`     Vug diameter: ${result.vug_diameter.toFixed(1)} mm (+${result.total_dissolved.toFixed(1)} mm total enlargement)`);

      if (post_sigma_cal > pre_sigma_cal * 1.3 && post_sigma_cal > 1.0) {
        this.log.push(`     ⚡ SUPERSATURATION SPIKE: σ(Cal) ${pre_sigma_cal.toFixed(2)} → ${post_sigma_cal.toFixed(2)} — rapid calcite growth expected!`);
      }
    }
  }

  ambient_cooling(rate = 1.5) {
    this.conditions.temperature -= rate * rng.uniform(0.8, 1.2);
    this.conditions.temperature = Math.max(this.conditions.temperature, 25);

    // ---- Thermal pulses: episodic fluid injection ----
    // Real hydrothermal systems don't cool monotonically. Hot fluid pulses
    // arrive through fractures — fast, dramatic, then bleed heat back out.
    // Probability scales with how far we've cooled (more fractures open as
    // rock contracts) and inversely with how hot we still are (already-hot
    // systems don't notice small pulses).
    const cooledFraction = 1 - (this.conditions.temperature - 25) / Math.max(this._startTemp || 400, 100);
    const pulseChance = 0.04 + cooledFraction * 0.06; // 4-10% per step
    if (rng.random() < pulseChance && this.conditions.temperature < (this._startTemp || 400) * 0.8) {
      // Spike: 30-150°C above current, but not above original start temp
      const spike = rng.uniform(30, 150);
      const newTemp = Math.min(this.conditions.temperature + spike, (this._startTemp || 400) * 0.95);
      const actualSpike = newTemp - this.conditions.temperature;
      if (actualSpike > 15) {
        this.conditions.temperature = newTemp;
        // Fresh fluid pulse brings chemistry
        this.conditions.fluid.SiO2 += rng.uniform(50, 300);
        this.conditions.fluid.Fe += rng.uniform(2, 15);
        this.conditions.fluid.Mn += rng.uniform(1, 5);
        this.conditions.flow_rate = rng.uniform(1.5, 3.0);
        // pH shift from new fluid (slightly acidic hydrothermal)
        this.conditions.fluid.pH = Math.max(4.0, this.conditions.fluid.pH - rng.uniform(0.3, 1.0));
        this.log.push(`  🌡️ THERMAL PULSE: +${actualSpike.toFixed(0)}°C — hot fluid injection through fracture! T=${newTemp.toFixed(0)}°C`);
        this.log.push(`     Fresh fluid: SiO₂↑, Fe↑, Mn↑, pH↓ — new growth expected`);
      }
    }

    // pH recovery toward equilibrium — scaled by flow rate.
    // Fresh fluid flushing through the vug dilutes acid and restores
    // pH; a sealed pocket can't exchange fluid, so acidity persists
    // until mineral reactions buffer it. Recovery 0.1/step at
    // flow_rate=1.0, near-zero at flow_rate~0.1 (sealed pocket).
    if (this.conditions.fluid.pH < 6.5) {
      const recovery = 0.1 * Math.min(this.conditions.flow_rate / 1.0, 2.0);
      this.conditions.fluid.pH += recovery;
    }

    if (this.conditions.flow_rate > 1.0) this.conditions.flow_rate *= 0.9;
    const active_quartz = this.crystals.filter(c => c.mineral === 'quartz' && c.active);
    if (active_quartz.length) {
      const depletion = active_quartz.reduce((s, c) => s + (c.zones.length ? c.zones[c.zones.length - 1].thickness_um : 0), 0) * 0.1;
      this.conditions.fluid.SiO2 = Math.max(this.conditions.fluid.SiO2 - depletion, 10);
    }

    // Sulfide growth depletes Fe, S, Cu, Zn
    const active_sulfides = this.crystals.filter(c => (c.mineral === 'pyrite' || c.mineral === 'chalcopyrite' || c.mineral === 'sphalerite') && c.active);
    for (const c of active_sulfides) {
      if (c.zones.length) {
        const dep = c.zones[c.zones.length - 1].thickness_um * 0.05;
        this.conditions.fluid.S = Math.max(this.conditions.fluid.S - dep, 0);
        this.conditions.fluid.Fe = Math.max(this.conditions.fluid.Fe - dep * 0.5, 0);
        if (c.mineral === 'chalcopyrite') {
          this.conditions.fluid.Cu = Math.max(this.conditions.fluid.Cu - dep * 0.8, 0);
        }
        if (c.mineral === 'sphalerite') {
          this.conditions.fluid.Zn = Math.max(this.conditions.fluid.Zn - dep * 0.8, 0);
        }
      }
    }
  }

  run_step() {
    this.log = [];
    this.step++;
    // Phase C v1: events apply to conditions.fluid (= equator ring
    // fluid via aliasing). Snapshot before and propagate the delta to
    // non-equator rings — otherwise a global event pulse never reaches
    // the rings where crystals are actually growing. Same wrap on
    // dissolve_wall and ambient_cooling. Mirrors vugg.py.
    let snap = this._snapshotGlobal();
    this.apply_events();
    this._propagateGlobalDelta(snap);
    // v26: continuous drainage from host-rock porosity. Runs before
    // the vadose override so a porosity-driven drift-out gets caught
    // as a transition on the same step it dries.
    this._applyWaterLevelDrift();
    // v25: events may have dropped fluid_surface_ring. Detect rings
    // that just transitioned wet → vadose and force their fluid to
    // oxidizing chemistry. Lets the existing supergene-oxidation
    // engines fire naturally in the air-exposed rings while the floor
    // stays reducing.
    const newlyVadose = this._applyVadoseOxidationOverride();
    if (newlyVadose.length) {
      this.log.push(
        `  ☁ Vadose oxidation: rings ${newlyVadose.join(',')} now exposed `
        + `to air — O₂ rises, sulfides become unstable`);
    }
    // Track dolomite saturation crossings for the Kim 2023 cycle mechanism.
    this.conditions.update_dol_cycles();
    snap = this._snapshotGlobal();
    this.dissolve_wall();
    this._propagateGlobalDelta(snap);

    // Calculate vug fill percentage — stop growth when full
    const vugFill = this.get_vug_fill();

    if (vugFill >= 1.0 && !this._vug_sealed) {
      this._vug_sealed = true;
      // Determine dominant mineral
      const mineralVols = {};
      for (const c of this.crystals) {
        if (!c.active) continue;
        const a = c.c_length_mm / 2, b = c.a_width_mm / 2;
        const v = (4/3) * Math.PI * a * b * b;
        mineralVols[c.mineral] = (mineralVols[c.mineral] || 0) + v;
      }
      const sorted = Object.entries(mineralVols).sort((a,b) => b[1] - a[1]);
      const dominant = sorted[0] ? sorted[0][0] : 'mineral';
      let sealMsg = `🪨 VUG SEALED — cavity completely filled after ${this.step} steps`;
      if (dominant === 'quartz' && sorted[0][1] / Object.values(mineralVols).reduce((a,b)=>a+b,0) > 0.8) {
        sealMsg += ` — AGATE (>80% quartz)`;
      } else if (sorted.length > 1) {
        sealMsg += ` — dominant: ${dominant}, with ${sorted.slice(1).map(s=>s[0]).join(', ')}`;
      }
      this.log.push(sealMsg);
    }

    this.check_nucleation(vugFill);
    let currentFill = vugFill; // Track fill dynamically during growth loop
    for (const crystal of this.crystals) {
      if (!crystal.active) continue;
      // If vug is full, no more growth (dissolution still allowed)
      if (currentFill >= 1.0) {
        // Still allow dissolution (negative zones)
        const engine = MINERAL_ENGINES[crystal.mineral];
        if (!engine) continue;
        const zone = this._runEngineForCrystal(engine, crystal);
        if (zone && zone.thickness_um < 0) {
          crystal.add_zone(zone);
          currentFill = this.get_vug_fill(); // Update after dissolution
          this.log.push(`  ⬇ ${capitalize(crystal.mineral)} #${crystal.crystal_id}: DISSOLUTION ${zone.note}`);
        }
        continue;
      }
      // Universal max-size cap — 2× world record per MINERAL_SPEC.
      // Closes the 321,248% runaway growth bug.
      const capCm = maxSizeCm(crystal.mineral);
      if (capCm != null && crystal.c_length_mm / 10.0 >= capCm) {
        crystal.active = false;
        this.log.push(`  ⛔ ${capitalize(crystal.mineral)} #${crystal.crystal_id}: reached size cap (${capCm} cm = 2× world record) — growth halts`);
        continue;
      }
      const engine = MINERAL_ENGINES[crystal.mineral];
      if (!engine) continue;
      const zone = this._runEngineForCrystal(engine, crystal);
      if (zone) {
        crystal.add_zone(zone);
        // Re-check fill after each crystal grows to prevent >100% overshoot
        if (zone.thickness_um > 0) {
          currentFill = this.get_vug_fill();
        }
        if (zone.thickness_um < 0) {
          currentFill = this.get_vug_fill();
          this.log.push(`  ⬇ ${capitalize(crystal.mineral)} #${crystal.crystal_id}: DISSOLUTION ${zone.note}`);
        } else if (Math.abs(zone.thickness_um) > 0.5) {
          this.log.push(`  ▲ ${capitalize(crystal.mineral)} #${crystal.crystal_id}: ${crystal.describe_latest_zone()}`);
        }
      }
    }

    // Paramorph transitions — convert crystals whose host fluid has cooled
    // past their phase-transition T (Round 8a-2: argentite → acanthite at
    // 173°C). Preserves habit + dominant_forms + zones; only crystal.mineral
    // changes. First non-destructive polymorph mechanic in the sim.
    for (const crystal of this.crystals) {
      const transition = applyParamorphTransitions(crystal, this.conditions.temperature, this.step);
      if (transition) {
        const [oldM, newM] = transition;
        this.log.push(
          `  ↻ PARAMORPH: ${capitalize(oldM)} #${crystal.crystal_id} → ${newM} ` +
          `(T dropped to ${this.conditions.temperature.toFixed(0)}°C, crossed ${oldM}/${newM} ` +
          `phase boundary; cubic external form preserved)`
        );
      }
    }

    // v28: dehydration paramorphs — environment-triggered counterpart
    // to PARAMORPH_TRANSITIONS. Borax left in a vadose ring loses
    // water and pseudomorphs to tincalconite. Mirror of vugg.py.
    {
      const nRings = this.wall_state.ring_count;
      for (const crystal of this.crystals) {
        if (!DEHYDRATION_TRANSITIONS[crystal.mineral]) continue;
        const ringIdx = crystal.wall_ring_index;
        if (ringIdx == null || ringIdx < 0 || ringIdx >= nRings) continue;
        const ringFluid = this.ring_fluids[ringIdx];
        const ringState = this.conditions.ringWaterState(ringIdx, nRings);
        const Tlocal = this.ring_temperatures[ringIdx];
        const transition = applyDehydrationTransitions(
          crystal, ringFluid, ringState, Tlocal, this.step);
        if (transition) {
          const [oldM, newM] = transition;
          this.log.push(
            `  ☼ DEHYDRATION: ${capitalize(oldM)} #${crystal.crystal_id} → ${newM} ` +
            `(vadose exposure ${crystal.dry_exposure_steps} steps, ring ${ringIdx} ` +
            `concentration=${ringFluid.concentration.toFixed(1)}); external ` +
            `crystal form preserved as a ${newM} pseudomorph`
          );
        }
      }
    }

    // Water-solubility metastability — Round 8e (Apr 2026). Chalcanthite
    // re-dissolves when fluid.salinity < 4 OR fluid.pH > 5. The geological
    // truth: every chalcanthite is a temporary victory over entropy.
    for (const crystal of this.crystals) {
      if (crystal.mineral !== 'chalcanthite' || crystal.dissolved || !crystal.active) continue;
      if (this.conditions.fluid.salinity < 4.0 || this.conditions.fluid.pH > 5.0) {
        // 40%/step decay, with a 0.5-µm absolute floor below which we
        // collapse to full dissolution (asymptotic decay otherwise).
        let dissolved_um = Math.min(5.0, crystal.total_growth_um * 0.4);
        if (crystal.total_growth_um < 0.5) dissolved_um = crystal.total_growth_um;
        crystal.total_growth_um -= dissolved_um;
        crystal.c_length_mm = Math.max(crystal.total_growth_um / 1000.0, 0);
        this.conditions.fluid.Cu += dissolved_um * 0.5;
        this.conditions.fluid.S += dissolved_um * 0.5;
        if (crystal.total_growth_um <= 0) {
          crystal.dissolved = true;
          crystal.active = false;
          this.log.push(
            `  💧 RE-DISSOLVED: Chalcanthite #${crystal.crystal_id} ` +
            `completely returned to solution (salinity=${this.conditions.fluid.salinity.toFixed(1)}, ` +
            `pH=${this.conditions.fluid.pH.toFixed(1)}) — Cu²⁺ + SO₄²⁻ back in fluid`
          );
        } else {
          this.log.push(
            `  💧 Chalcanthite #${crystal.crystal_id}: re-dissolving ` +
            `(${dissolved_um.toFixed(1)} µm lost; salinity=${this.conditions.fluid.salinity.toFixed(1)}, ` +
            `pH=${this.conditions.fluid.pH.toFixed(1)})`
          );
        }
      }
    }

    // Check for vug seal after growth loop (may cross 1.0 during crystal growth)
    if (currentFill >= 1.0 && !this._vug_sealed) {
      this._vug_sealed = true;
      const mineralVols = {};
      for (const c of this.crystals) {
        if (!c.active) continue;
        const a = c.c_length_mm / 2, b = c.a_width_mm / 2;
        const v = (4/3) * Math.PI * a * b * b;
        mineralVols[c.mineral] = (mineralVols[c.mineral] || 0) + v;
      }
      const sorted = Object.entries(mineralVols).sort((a,b) => b[1] - a[1]);
      const dominant = sorted[0] ? sorted[0][0] : 'mineral';
      let sealMsg = `🪨 VUG SEALED — cavity completely filled after ${this.step} steps`;
      if (dominant === 'quartz' && sorted[0][1] / Object.values(mineralVols).reduce((a,b)=>a+b,0) > 0.8) {
        sealMsg += ` — AGATE (>80% quartz)`;
      } else if (sorted.length > 1) {
        sealMsg += ` — dominant: ${dominant}, with ${sorted.slice(1).map(s=>s[0]).join(', ')}`;
      }
      this.log.push(sealMsg);
    }
    // ---- Radiation damage processing ----
    const active_uraninite = this.crystals.filter(c => c.mineral === 'uraninite' && c.active);
    if (active_uraninite.length) {
      if (!this.radiation_dose) this.radiation_dose = 0;
      if (!this._smoky_logged) this._smoky_logged = false;
      if (!this._metamict_logged) this._metamict_logged = false;

      for (const u_crystal of active_uraninite) {
        const u_size = u_crystal.c_length_mm;
        // Uraninite produces Pb into fluid via radioactive decay
        this.conditions.fluid.Pb += 0.1 * u_size;
        this.radiation_dose += 0.01 * u_size;

        // Radiation damages all OTHER crystals
        for (const other of this.crystals) {
          if (other === u_crystal || !other.active) continue;
          if (!other.radiation_damage) other.radiation_damage = 0;
          other.radiation_damage += 0.02 * u_size;

          // Smoky quartz check
          if (other.mineral === 'quartz' && other.radiation_damage > 0.3 && !this._smoky_logged) {
            this.log.push(`  ☢️ Quartz #${other.crystal_id} is turning smoky — radiation damage from nearby uraninite is displacing Al³⁺ in the lattice, creating color centers`);
            this._smoky_logged = true;
          }

          // Metamictization check
          if (other.radiation_damage > 0.8 && !this._metamict_logged) {
            this.log.push(`  ☢️ ${capitalize(other.mineral)} #${other.crystal_id} is becoming metamict — alpha radiation is destroying the crystal lattice`);
            this._metamict_logged = true;
          }
        }
      }
    }

    // Enclosure / liberation — bigger crystals swallow adjacent smaller
    // ones; dissolving hosts can free what they held.
    this._check_enclosure();
    this._check_liberation();

    // Refresh the topo-map wall state from the current crystal list.
    this._repaintWallState();

    // Ambient cooling — propagate the temperature drop to all rings
    // so non-equator rings cool too.
    {
      const coolSnap = this._snapshotGlobal();
      this.ambient_cooling();
      this._propagateGlobalDelta(coolSnap);
    }

    // Phase C: inter-ring fluid/temperature diffusion runs at the
    // very end of the step so chemistry exchanges happen against a
    // stable post-events post-growth state. No-op when all rings
    // carry identical values (Laplacian of a constant is zero) —
    // this preserves byte-equality for default scenarios.
    this._diffuseRingState();

    return this.log;
  }

  // When a big crystal grows past an adjacent smaller one that's stopped
  // growing, the smaller crystal becomes an inclusion inside the bigger
  // one. Classic "Sweetwater mechanism" — pyrite first, then calcite
  // grows around it. Ports check_enclosure from vugg.py 1:1.
  _check_enclosure() {
    for (const grower of this.crystals) {
      if (!grower.active || grower.c_length_mm < 0.5) continue;
      if (grower.enclosed_by != null) continue;
      for (const candidate of this.crystals) {
        if (candidate.crystal_id === grower.crystal_id) continue;
        if (candidate.enclosed_by != null) continue;
        if (grower.enclosed_crystals.includes(candidate.crystal_id)) continue;

        const sizeRatio = grower.c_length_mm / Math.max(candidate.c_length_mm, 0.001);
        const adjacent = (
          candidate.position === grower.position
          || candidate.position.includes(`#${grower.crystal_id}`)
        );
        // Require the candidate to have actually lived a bit before it
        // can be swallowed. Without this, a just-nucleated crystal with
        // zero zones qualifies on step 1 and gets enveloped before it
        // grows a single face — 600 inclusions pile up in a loop of
        // nucleate-then-instantly-enclose. Real Sweetwater-style
        // pyrite needs time to exhaust its chemistry and stop growing
        // before the calcite takes it.
        if (!candidate.zones || candidate.zones.length < 3) continue;
        const recent = candidate.zones.slice(-3).reduce((s, z) => s + z.thickness_um, 0);
        const slowing = recent < 3.0;
        if (sizeRatio > 3.0 && adjacent && slowing) {
          grower.enclosed_crystals.push(candidate.crystal_id);
          grower.enclosed_at_step.push(this.step);
          candidate.enclosed_by = grower.crystal_id;
          candidate.active = false;
          this.log.push(
            `  💎 ENCLOSURE: ${capitalize(grower.mineral)} #${grower.crystal_id} ` +
            `(${grower.c_length_mm.toFixed(1)}mm) has grown around ` +
            `${candidate.mineral} #${candidate.crystal_id} (${candidate.c_length_mm.toFixed(2)}mm). ` +
            `The ${candidate.mineral} is now an inclusion inside the ${grower.mineral}.`
          );
        }
      }
    }
  }

  // When the host crystal is dissolving back past the point it enclosed
  // a neighbor, the neighbor is freed. Ports check_liberation from
  // vugg.py 1:1.
  _check_liberation() {
    for (const host of this.crystals) {
      if (!host.enclosed_crystals.length) continue;
      if (!host.dissolved) continue;
      const freed = [];
      for (let i = 0; i < host.enclosed_crystals.length; i++) {
        const encId = host.enclosed_crystals[i];
        const encStep = host.enclosed_at_step[i];
        const enc = this.crystals.find(c => c.crystal_id === encId);
        if (!enc) continue;
        let hostSizeAtEnc = 0;
        for (const z of host.zones) if (z.step <= encStep) hostSizeAtEnc += z.thickness_um;
        if (host.total_growth_um < hostSizeAtEnc * 0.7) {
          freed.push(i);
          enc.enclosed_by = null;
          enc.active = true;
          this.log.push(
            `  🔓 LIBERATION: ${enc.mineral} #${encId} freed from ` +
            `dissolving ${host.mineral} #${host.crystal_id}! ` +
            `The inclusion is exposed again and can resume growth.`
          );
        }
      }
      for (const i of freed.sort((a, b) => b - a)) {
        host.enclosed_crystals.splice(i, 1);
        host.enclosed_at_step.splice(i, 1);
      }
    }
  }

  format_header() {
    const c = this.conditions;
    const sigma_q = c.supersaturation_quartz();
    const sigma_c = c.supersaturation_calcite();
    let wall_info = '';
    if (c.wall.total_dissolved_mm > 0) {
      wall_info = ` │ Vug: ${c.wall.vug_diameter_mm.toFixed(0)}mm (+${c.wall.total_dissolved_mm.toFixed(1)})`;
    }
    return `═══ Step ${String(this.step).padStart(3)} │ T=${this.conditions.temperature.toFixed(1).padStart(6)}°C │ P=${c.pressure.toFixed(2)} kbar │ pH=${c.fluid.pH.toFixed(1)} │ σ(Qz)=${sigma_q.toFixed(2)} σ(Cal)=${sigma_c.toFixed(2)}${wall_info} │ Fluid: ${c.fluid.describe()}`;
  }

  format_summary() {
    const lines = [];
    lines.push('');
    const yearsPerStep = timeScale * 10000;
    const totalYears = this.step * yearsPerStep;
    const timeStr = totalYears >= 1e6 ? `~${(totalYears / 1e6).toFixed(1)} million years` : `~${(totalYears / 1000).toFixed(0)},000 years`;
    lines.push('═'.repeat(70));
    lines.push(`FINAL VUG INVENTORY — ${this.step} steps (${timeStr})`);
    lines.push('═'.repeat(70));

    // Vug wall stats if dissolution occurred
    const w = this.conditions.wall;
    if (w.total_dissolved_mm > 0) {
      const orig_diam = w.vug_diameter_mm - w.total_dissolved_mm * 2;
      lines.push('');
      lines.push('VUG CAVITY');
      lines.push(`  Host rock: ${w.composition}`);
      lines.push(`  Original diameter: ${orig_diam.toFixed(0)} mm`);
      lines.push(`  Final diameter: ${w.vug_diameter_mm.toFixed(0)} mm`);
      lines.push(`  Total wall dissolved: ${w.total_dissolved_mm.toFixed(1)} mm`);
      lines.push('  The acid made the room. The room grew the crystals.');
    }

    for (const c of this.crystals) {
      lines.push('');
      lines.push(`${c.mineral.toUpperCase()} #${c.crystal_id}`);
      lines.push(`  Nucleated: step ${c.nucleation_step} at ${c.nucleation_temp.toFixed(0)}°C`);
      lines.push(`  Position: ${c.position}`);
      lines.push(`  Morphology: ${c.describe_morphology()}`);
      lines.push(`  Growth zones: ${c.zones.length}`);
      lines.push(`  Total growth: ${c.total_growth_um.toFixed(0)} µm (${c.c_length_mm.toFixed(1)} mm)`);

      const fi_count = c.zones.filter(z => z.fluid_inclusion).length;
      if (fi_count) {
        const fi_types = [...new Set(c.zones.filter(z => z.fluid_inclusion).map(z => z.inclusion_type))];
        lines.push(`  Fluid inclusions: ${fi_count} (${fi_types.join(', ')})`);
      }
      if (c.twinned) lines.push(`  Twinning: ${c.twin_law}`);
      if (c.dissolved) lines.push(`  Note: partially dissolved (late-stage undersaturation)`);
      if (c.phantom_count > 0) {
        lines.push(`  Phantom boundaries: ${c.phantom_count} (dissolution surfaces preserved inside crystal)`);
      }

      // Provenance (for calcite with wall dissolution)
      if (c.mineral === 'calcite' && c.zones.length) {
        const wall_zones = c.zones.filter(z => z.ca_from_wall > 0.1);
        if (wall_zones.length) {
          const avg_wall = wall_zones.reduce((s, z) => s + z.ca_from_wall, 0) / wall_zones.length;
          const max_wall = Math.max(...wall_zones.map(z => z.ca_from_wall));
          lines.push(`  Provenance: ${wall_zones.length}/${c.zones.length} zones contain wall-derived Ca²⁺`);
          lines.push(`    Average wall contribution: ${(avg_wall * 100).toFixed(0)}%, peak: ${(max_wall * 100).toFixed(0)}%`);
          const first_wall_zone = c.zones.find(z => z.ca_from_wall > 0.1);
          if (first_wall_zone) {
            lines.push(`    Wall-derived Ca first appears at step ${first_wall_zone.step} (T=${first_wall_zone.temperature.toFixed(0)}°C)`);
          }
        }
      }

      const fl = c.predict_fluorescence();
      if (fl !== 'non-fluorescent') lines.push(`  Predicted UV fluorescence: ${fl}`);

      if (c.zones.length) {
        const temps = c.zones.map(z => z.temperature);
        const minT = Math.min(...temps), maxT = Math.max(...temps);
        lines.push(`  Growth temperature range: ${minT.toFixed(0)}–${maxT.toFixed(0)}°C`);
        if (c.mineral === 'quartz') {
          const ti_vals = c.zones.filter(z => z.trace_Ti > 0).map(z => z.trace_Ti);
          if (ti_vals.length) {
            const avg_ti = ti_vals.reduce((a, b) => a + b, 0) / ti_vals.length;
            lines.push(`  Avg Ti-in-quartz: ${avg_ti.toFixed(3)} ppm (TitaniQ range: ${minT.toFixed(0)}–${maxT.toFixed(0)}°C)`);
          }
        }
      }
    }

    lines.push('');
    lines.push('═'.repeat(70));

    const narrative = this.narrate();
    if (narrative) {
      lines.push('');
      lines.push('GEOLOGICAL HISTORY');
      lines.push('─'.repeat(70));
      lines.push(narrative);
      lines.push('═'.repeat(70));
    }

    return lines;
  }

  narrate() {
    if (!this.crystals.length) return 'The vug remained empty. No minerals precipitated under these conditions. The fluid passed through without leaving a trace — still too hot, too undersaturated, or too brief. Given more time, this story might begin differently.';

    const totalGrowth = this.crystals.reduce((sum, c) => sum + c.total_growth_um, 0);
    if (totalGrowth < 5) {
      return `The vug barely began its story. Over ${this.step} steps, conditions shifted but nothing had time to grow beyond a thin film on the cavity wall. This is the very beginning — the fluid is still finding its equilibrium. Run more steps to see what this vug becomes.`;
    }

    const paragraphs = [];
    const first_crystal = this.crystals[0];
    const start_T = first_crystal.nucleation_temp;
    const mineral_names = [...new Set(this.crystals.map(c => c.mineral))];

    let setting;
    if (start_T > 300) setting = 'deep hydrothermal';
    else if (start_T > 150) setting = 'moderate-temperature hydrothermal';
    else setting = 'low-temperature';

    let vug_growth = '';
    if (this.conditions.wall.total_dissolved_mm > 0) {
      const w = this.conditions.wall;
      vug_growth = ` The cavity itself expanded from ${(w.vug_diameter_mm - w.total_dissolved_mm * 2).toFixed(0)}mm to ${w.vug_diameter_mm.toFixed(0)}mm diameter as acid pulses dissolved ${w.total_dissolved_mm.toFixed(1)}mm of the ${w.composition} host rock.`;
    }

    const yearsPerStep = timeScale * 10000;
    const totalYears = this.step * yearsPerStep;
    const timeStr = totalYears >= 1e6 ? `${(totalYears / 1e6).toFixed(1)} million years` : `${(totalYears / 1000).toFixed(0)},000 years`;
    paragraphs.push(
      `This vug records a ${setting} crystallization history spanning approximately ${timeStr}, beginning at ${start_T.toFixed(0)}°C. ${this.crystals.length} crystals grew across ${this.step} time steps (~${(yearsPerStep/1000).toFixed(0)},000 years each), producing an assemblage of ${mineral_names.join(', ')}.${vug_growth}`
    );

    const first_step = Math.min(...this.crystals.map(c => c.nucleation_step));
    const first_minerals = this.crystals.filter(c => c.nucleation_step === first_step);

    for (const c of first_minerals) {
      if (c.mineral === 'calcite') {
        paragraphs.push(
          `Calcite was the first mineral to crystallize, nucleating on the vug wall at ${c.nucleation_temp.toFixed(0)}°C. ` + this._narrate_calcite(c)
        );
      } else if (c.mineral === 'quartz') {
        paragraphs.push(
          `Quartz nucleated first at ${c.nucleation_temp.toFixed(0)}°C on the vug wall. ` + this._narrate_quartz(c)
        );
      } else {
        paragraphs.push(`${capitalize(c.mineral)} nucleated at ${c.nucleation_temp.toFixed(0)}°C.`);
      }
    }

    const later_crystals = this.crystals.filter(c => c.nucleation_step > first_step);
    if (later_crystals.length) {
      const triggeringEvent = (step) => {
        for (const e of this.events) {
          if (Math.abs(e.step - step) <= 2) return e;
        }
        return null;
      };

      // Event-triggered batches come out step-by-step. Untriggered
      // nucleations defer and get consolidated per-mineral so a mineral
      // that re-nucleates dozens of times in a stable brine reads as one
      // sentence instead of thirty repeating lines.
      const nuc_steps = [...new Set(later_crystals.map(c => c.nucleation_step))].sort((a, b) => a - b);
      const untriggeredByMineral = {};
      for (const ns of nuc_steps) {
        const batch = later_crystals.filter(c => c.nucleation_step === ns);
        const batch_names = batch.map(c => c.mineral);
        const triggering_event = triggeringEvent(ns);

        if (triggering_event) {
          const name = triggering_event.name.toLowerCase();
          if (name.includes('mixing')) {
            paragraphs.push(
              `A fluid mixing event at step ${triggering_event.step} transformed the vug's chemistry. ` + this._narrate_mixing_event(batch, triggering_event)
            );
          } else if (name.includes('pulse')) {
            paragraphs.push(
              `A fresh pulse of hydrothermal fluid at step ${triggering_event.step} introduced new chemistry. ${[...new Set(batch_names)].map(capitalize).join(', ')} nucleated in response.`
            );
          } else if (name.includes('tectonic')) {
            paragraphs.push(
              `A tectonic event at step ${triggering_event.step} produced a pressure spike.` + this._narrate_tectonic(batch)
            );
          } else {
            for (const c of batch) (untriggeredByMineral[c.mineral] ||= []).push(c);
          }
        } else {
          for (const c of batch) (untriggeredByMineral[c.mineral] ||= []).push(c);
        }
      }

      const ref_T = first_minerals.length ? first_minerals[0].nucleation_temp : null;

      for (const [mineral, crystals] of Object.entries(untriggeredByMineral)) {
        crystals.sort((a, b) => a.nucleation_step - b.nucleation_step);
        const temps = crystals.map(c => c.nucleation_temp);
        const t_min = Math.min(...temps), t_max = Math.max(...temps);
        const s_min = crystals[0].nucleation_step;
        const s_max = crystals[crystals.length - 1].nucleation_step;
        const mineralCap = capitalize(mineral);

        if (crystals.length === 1) {
          const c = crystals[0];
          if (ref_T !== null && Math.abs(c.nucleation_temp - ref_T) <= 2) {
            paragraphs.push(
              `At ${c.nucleation_temp.toFixed(0)}°C, ${mineral} nucleated at step ${c.nucleation_step} — the brine had held its window long enough for saturation to tip over.`
            );
          } else if (ref_T !== null && c.nucleation_temp < ref_T - 2) {
            paragraphs.push(
              `As temperature continued to fall, ${mineral} nucleated at step ${c.nucleation_step} (${c.nucleation_temp.toFixed(0)}°C).`
            );
          } else {
            paragraphs.push(
              `${mineralCap} nucleated at step ${c.nucleation_step} (${c.nucleation_temp.toFixed(0)}°C).`
            );
          }
          continue;
        }

        if (t_max - t_min <= 4) {
          paragraphs.push(
            `Between step ${s_min} and step ${s_max}, ${mineral} nucleated ${crystals.length} times as conditions held steady around ${t_min.toFixed(0)}°C — the window stayed open.`
          );
        } else {
          const direction = crystals[0].nucleation_temp > crystals[crystals.length - 1].nucleation_temp ? 'cooled' : 'warmed';
          paragraphs.push(
            `${mineralCap} nucleated ${crystals.length} times between step ${s_min} (${crystals[0].nucleation_temp.toFixed(0)}°C) and step ${s_max} (${crystals[crystals.length - 1].nucleation_temp.toFixed(0)}°C) as the fluid ${direction} through its window.`
          );
        }
      }
    }

    // Dispatch via this['_narrate_' + mineral] — spec says every mineral has one.
    const significant = this.crystals.filter(c => c.total_growth_um > 100);
    for (const c of significant) {
      const fn = this[`_narrate_${c.mineral}`];
      const story = typeof fn === 'function' ? fn.call(this, c) : '';
      if (story && !first_minerals.includes(c)) paragraphs.push(story);
    }

    // Phantom growth narrative
    const phantom_crystals = this.crystals.filter(c => c.phantom_count > 0);
    for (const c of phantom_crystals) {
      if (c.phantom_count >= 2) {
        paragraphs.push(
          `${capitalize(c.mineral)} #${c.crystal_id} shows ${c.phantom_count} phantom boundaries — internal surfaces where acid dissolved the crystal before new growth covered the damage. Each phantom preserves the shape of the crystal at the moment the acid arrived. In a polished section, these appear as ghost outlines nested inside the final crystal — the crystal's autobiography, written in dissolution and regrowth.`
        );
      } else if (c.phantom_count === 1) {
        paragraphs.push(
          `${capitalize(c.mineral)} #${c.crystal_id} contains a single phantom surface — a dissolution boundary where the crystal was partially eaten and then regrew over the wound. The phantom preserves the crystal's earlier shape as a ghost outline inside the final form.`
        );
      }
    }

    // Provenance narrative for calcite
    for (const c of this.crystals) {
      if (c.mineral === 'calcite' && c.zones.length) {
        const wall_zones = c.zones.filter(z => z.ca_from_wall > 0.3);
        const fluid_zones = c.zones.filter(z => z.ca_from_wall < 0.1 && z.thickness_um > 0);
        if (wall_zones.length && fluid_zones.length) {
          paragraphs.push(
            `The calcite tells two stories in one crystal. Early growth zones are built from the original fluid — Ca²⁺ that traveled through the basin. Later zones are built from recycled wall rock — limestone that was dissolved by acid and reprecipitated. The trace element signature shifts at the boundary: wall-derived zones carry the host rock's Fe and Mn signature, distinct from the fluid-derived zones. A microprobe traverse across this crystal would show the moment the vug started eating itself to feed its children.`
          );
        }
      }
    }

    // Radiation narrative
    if (this.radiation_dose > 0) {
      const smoky_crystals = this.crystals.filter(c => c.mineral === 'quartz' && c.radiation_damage > 0.3);
      const metamict_crystals = this.crystals.filter(c => c.radiation_damage > 0.8);
      let rad_text = `☢️ Radiation has left its mark on this vug. Total accumulated dose: ${this.radiation_dose.toFixed(2)}.`;
      if (smoky_crystals.length) {
        rad_text += ` ${smoky_crystals.length} quartz crystal${smoky_crystals.length > 1 ? 's have' : ' has'} turned smoky — aluminum impurities in the lattice were knocked loose by alpha particles from nearby uraninite, creating the color centers that give smoky quartz its signature darkness.`;
      }
      if (metamict_crystals.length) {
        rad_text += ` ${metamict_crystals.length} crystal${metamict_crystals.length > 1 ? 's have' : ' has'} become metamict — the crystal structure itself is destroyed by accumulated radiation damage, leaving an amorphous glass where ordered atoms once stood.`;
      }
      const uraninite_crystals = this.crystals.filter(c => c.mineral === 'uraninite');
      const galena_from_decay = this.crystals.filter(c => c.mineral === 'galena');
      if (uraninite_crystals.length && galena_from_decay.length) {
        rad_text += ` The galena in this assemblage crystallized in part from lead produced by uraninite decay — U-238 → Pb-206, the same chain used to date the age of rocks.`;
      }
      paragraphs.push(rad_text);
    }

    paragraphs.push(this._narrate_collectors_view());
    return paragraphs.join('\n\n');
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  _narrate_magnetite(c) {
    // Prose lives in narratives/magnetite.md.
    const parts = [`Magnetite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('magnetite') || "Fe₃O₄ — the mixed-valence Fe²⁺Fe³⁺₂O₄ spinel oxide. Black, strongly magnetic (lodestone is natural permanent-magnet magnetite — the first compass). Sits at the HM (hematite-magnetite) redox buffer; cross that buffer and entire mineral assemblages shift. Streak is black, not red like hematite's.");
    if (c.habit === 'octahedral') parts.push(narrative_variant('magnetite', 'octahedral') || 'Octahedral {111} — the classic magnetite habit, sharp on matrix from Cerro Huanaquino (Bolivia) and Binn Valley (Switzerland).');
    else if (c.habit === 'rhombic_dodecahedral') parts.push(narrative_variant('magnetite', 'rhombic_dodecahedral') || 'Rhombic dodecahedral {110} — high-T mineralizer-assisted habit. Cl-bearing fluids promote this form over simple octahedra.');
    else parts.push(narrative_variant('magnetite', 'granular_massive') || 'Granular massive — rapid precipitation, aggregate of tiny individual crystals.');
    if (c.dissolved) parts.push(narrative_variant('magnetite', 'martite_pseudomorph') || 'Dissolving to hematite (martite pseudomorph) as O₂ climbed past the HM buffer.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_lepidocrocite(c) {
    // Prose lives in narratives/lepidocrocite.md.
    const parts = [`Lepidocrocite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('lepidocrocite') || 'γ-FeOOH — the ruby-red platy dimorph of goethite. Same formula, different crystal structure: goethite is a 3D framework (yellow-brown needles), lepidocrocite is layered (ruby-red platy, peels like mica). Kinetically favored when Fe²⁺ oxidizes FAST.');
    if (c.habit === 'platy_scales') parts.push(narrative_variant('lepidocrocite', 'platy_scales') || "Platy scales — the default habit. 'Lithium quartz' sold in rock shops is quartz with nanoscale lepidocrocite inclusions that scatter pink-mauve through the clear host.");
    else if (c.habit === 'plumose_rosette') parts.push(narrative_variant('lepidocrocite', 'plumose_rosette') || 'Plumose rosette — radiating platy blades. Cornwall and Siegerland (Germany) produced the best.');
    else parts.push(narrative_variant('lepidocrocite', 'fibrous_micaceous') || 'Fibrous micaceous — very rapid growth, coarser particle size, rust-brown color.');
    parts.push(narrative_variant('lepidocrocite', 'conversion_tail') || 'Given geological time, lepidocrocite converts to goethite (the thermodynamically stable dimorph).');
    return parts.filter(p => p).join(' ');
  }

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
  }

  _narrate_stibnite(c) {
    // Prose lives in narratives/stibnite.md.
    const parts = [`Stibnite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('stibnite') || 'Sb₂S₃ — orthorhombic antimony sulfide, same structure as bismuthinite.');
    if (c.habit === 'elongated_prism_blade') parts.push(narrative_variant('stibnite', 'elongated_prism_blade') || 'Elongated sword-blade.');
    else if (c.habit === 'radiating_spray') parts.push(narrative_variant('stibnite', 'radiating_spray') || 'Radiating spray.');
    else parts.push(narrative_variant('stibnite', 'massive_default') || 'Massive granular.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_bismuthinite(c) {
    // Prose lives in narratives/bismuthinite.md.
    const parts = [`Bismuthinite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('bismuthinite') || 'Bi₂S₃ — orthorhombic bismuth sulfide, same structure as stibnite.');
    if ((c.habit || '').includes('stout')) parts.push(narrative_variant('bismuthinite', 'stout') || 'Stout prismatic.');
    else if ((c.habit || '').includes('radiating')) parts.push(narrative_variant('bismuthinite', 'radiating') || 'Radiating cluster of needles.');
    else parts.push(narrative_variant('bismuthinite', 'acicular_default') || 'Acicular needles.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_native_bismuth(c) {
    // Prose lives in narratives/native_bismuth.md.
    const parts = [`Native bismuth #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('native_bismuth') || "Bi — elemental bismuth.");
    if (c.habit === 'arborescent_dendritic') parts.push(narrative_variant('native_bismuth', 'arborescent_dendritic') || 'Arborescent dendritic.');
    else if (c.habit === 'rhombohedral_crystal') parts.push(narrative_variant('native_bismuth', 'rhombohedral_crystal') || 'Rhombohedral crystal — RARE.');
    else parts.push(narrative_variant('native_bismuth', 'massive_default') || 'Massive granular.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_clinobisvanite(c) {
    // Prose lives in narratives/clinobisvanite.md.
    const parts = [`Clinobisvanite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('clinobisvanite') || 'BiVO₄ — bright yellow to orange-yellow monoclinic Bi-vanadate.');
    parts.push(narrative_closing('clinobisvanite') || 'BiVO₄ is a photocatalyst for solar-driven water splitting.');
    return parts.filter(p => p).join(' ');
  }

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
  }

  _narrate_descloizite(c) {
    // Prose lives in narratives/descloizite.md. Drift consolidation: JS
    // habit branches were shorter; live JS now matches the longer Python text.
    const parts = [`Descloizite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('descloizite') || "Pb(Zn,Cu)VO₄(OH) — orthorhombic Pb-Zn vanadate, the Zn end of the descloizite-mottramite series. Cherry-red to brown-red, Mohs 3-3.5; the Tsumeb display standard. Forms in supergene oxidation zones where Pb-Zn sulfide ore (galena + sphalerite) has weathered AND V is delivered by groundwater. When Cu > Zn, mottramite (the olive-green Cu sibling) takes priority instead.");
    if (c.habit === 'botryoidal') parts.push(narrative_variant('descloizite', 'botryoidal') || 'Botryoidal mammillary crust — Mibladen / Berg-Aukas habit.');
    else if (c.habit === 'prismatic') parts.push(narrative_variant('descloizite', 'prismatic') || 'Prismatic — the Tsumeb display habit.');
    else parts.push(narrative_variant('descloizite', 'tabular_default') || 'Tabular — late-stage low-σ habit.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_mottramite(c) {
    // Prose lives in narratives/mottramite.md.
    const parts = [`Mottramite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('mottramite') || "Pb(Cu,Zn)VO₄(OH) — orthorhombic Pb-Cu vanadate, the Cu end of the descloizite-mottramite series. Olive-green to yellowish-green from the Cu chromophore. Type locality: Mottram St. Andrew, Cheshire (England), 1876. Tsumeb produces the museum specimens. When Zn ≥ Cu, descloizite takes priority.");
    if (c.habit === 'botryoidal') parts.push(narrative_variant('mottramite', 'botryoidal') || 'Botryoidal — Mottram St Andrew habit.');
    else if (c.habit === 'prismatic') parts.push(narrative_variant('mottramite', 'prismatic') || "Prismatic — Tsumeb's olive-green crystals.");
    else parts.push(narrative_variant('mottramite', 'tabular_default') || 'Tabular — late-stage habit.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_raspite(c) {
    // Prose lives in narratives/raspite.md.
    const parts = [`Raspite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('raspite') || "PbWO₄ — monoclinic lead tungstate, RARE. Same composition as stolzite but a different crystal system; stolzite (tetragonal) is favored ~90% of the time. Honey-yellow tabular crystals with perfect {100} cleavage. Type locality: Broken Hill, NSW, Australia.");
    return parts.filter(p => p).join(' ');
  }

  _narrate_stolzite(c) {
    // Prose lives in narratives/stolzite.md.
    const parts = [`Stolzite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('stolzite') || "PbWO₄ — tetragonal lead tungstate, the lead analog of scheelite. Honey-yellow to orange-yellow Mohs 2.5-3 tetragonal crystals; the dominant PbWO₄ polymorph (~90% over raspite). Type locality: Cínovec (Czech Republic). Broken Hill (Australia) and Tsumeb (Namibia) produce museum specimens.");
    if (c.habit === 'dipyramidal') parts.push(narrative_variant('stolzite', 'dipyramidal') || 'Dipyramidal — {101} faces, Broken Hill / Tsumeb display habit.');
    else parts.push(narrative_variant('stolzite', 'tabular_default') || 'Tabular — {001} plates, late-stage habit.');
    return parts.filter(p => p).join(' ');
  }

  _narrate_olivenite(c) {
    // Prose lives in narratives/olivenite.md.
    const parts = [`Olivenite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('olivenite') || "Cu₂AsO₄(OH) — orthorhombic Cu arsenate, the Cu end of the olivenite-adamite series. Olive-green to grayish-green (the Cu chromophore — olive in name and color), Mohs 3-4. Cornwall is the type locality; Tsumeb and Bisbee produce showcase modern specimens. When Zn > Cu, adamite takes priority.");
    if (c.habit === 'fibrous') parts.push(narrative_variant('olivenite', 'fibrous') || "Fibrous — radiating acicular bundles, the Cornish 'wood-copper' silky habit.");
    else if (c.habit === 'prismatic') parts.push(narrative_variant('olivenite', 'prismatic') || 'Prismatic — the Cornwall display habit.');
    else parts.push(narrative_variant('olivenite', 'globular_default') || 'Globular — Tsumeb / Bisbee secondary habit.');
    return parts.filter(p => p).join(' ');
  }

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
  }

  _narrate_millerite(c) {
    // Prose lives in narratives/millerite.md.
    const parts = [`Millerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('millerite') || "NiS — trigonal nickel sulfide.");
    if (c.habit === 'capillary') parts.push(narrative_variant('millerite', 'capillary') || 'Capillary.');
    else if (c.habit === 'acicular') parts.push(narrative_variant('millerite', 'acicular') || 'Acicular.');
    else parts.push(narrative_variant('millerite', 'massive_default') || 'Massive granular.');
    if (c.dissolved) parts.push(narrative_variant('millerite', 'oxidative_dissolution') || 'Oxidative dissolution.');
    return parts.filter(p => p).join(' ');
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  _narrate_uraninite(c) {
    // Prose lives in narratives/uraninite.md.
    const parts = [`Uraninite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm ☢️.`];
    parts.push(narrative_blurb('uraninite') || "UO₂ — pitch-black, submetallic, one of Earth's densest oxides.");
    if (c.nucleation_temp > 400) parts.push(narrative_variant('uraninite', 'pegmatite_high_t') || 'Nucleated at high temperature — a pegmatite-scale uraninite.');
    else parts.push(narrative_variant('uraninite', 'roll_front_low_t') || 'Low-T uraninite — the sedimentary / roll-front style.');
    if (c.dissolved) parts.push(narrative_variant('uraninite', 'oxidative_dissolution') || 'Partial dissolution as O₂ invaded the system.');
    return parts.filter(p => p).join(' ');
  }

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
  }

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
  }

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
  }

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
  }

  _narrate_zeunerite(c) {
    // Prose lives in narratives/zeunerite.md.
    const parts = [`Zeunerite #${c.crystal_id} grew to ${c.c_length_mm.toFixed(1)} mm.`];
    parts.push(narrative_blurb('zeunerite') || "Cu(UO₂)₂(AsO₄)₂·(10-16)H₂O — tetragonal uranyl arsenate, the arsenate branch of the autunite-group trio. Visually almost indistinguishable from torbernite — same emerald-green color, same square tabular habit, same micaceous cleavage — distinguishable in the field only by chemistry. The arsenic is the giveaway: zeunerite localities are almost always former mining districts with arsenopyrite or tennantite as primary As-bearing ores. The fluid that grew this crystal carried more arsenate than phosphate at the moment of nucleation; in a parallel run with the ratio inverted, this same broth would have grown torbernite instead. Mohs 2.5, ☢️ radioactive (U + As both decay-active).");
    if (c.habit === 'micaceous_book') parts.push(narrative_variant('zeunerite', 'micaceous_book') || "Micaceous book habit — stacked subparallel plates, the high-σ Schneeberg form. Type-locality material.");
    else if (c.habit === 'tabular_plates') parts.push(narrative_variant('zeunerite', 'tabular_plates') || "Tabular plates flattened on {001} — the diagnostic Schneeberg/Cínovec habit. Identical in shape to torbernite; chemistry is the only discriminator.");
    else parts.push(narrative_variant('zeunerite', 'scaly_encrustation') || "Scaly encrustation — low-σ thin overlapping plates coating fracture surfaces.");
    return parts.filter(p => p).join(' ');
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  _narrate_mixing_event(batch, event) {
    const mineral_names = new Set(batch.map(c => c.mineral));
    const parts = [];
    if (mineral_names.has('sphalerite') && mineral_names.has('fluorite')) {
      parts.push("When metal-bearing brine met sulfur-bearing groundwater, sphalerite (ZnS) and fluorite (CaF₂) nucleated simultaneously — a classic Mississippi Valley-type precipitation event. The zinc and sulfur couldn't coexist in solution; they combined on contact and the minerals fell out of the fluid like rain.");
    } else if (mineral_names.has('sphalerite')) {
      parts.push("Sphalerite nucleated as zinc-bearing brine mixed with sulfur-rich groundwater. The two fluids were stable apart; together, ZnS became insoluble.");
    }
    return parts.join(' ');
  }

  _narrate_tectonic(batch) {
    const twinned = this.crystals.filter(c => c.twinned);
    if (twinned.length) {
      const names = twinned.map(c => `${c.mineral} #${c.crystal_id}`);
      return ` The stress may have induced twinning in ${names.join(', ')}. Twin planes formed as the crystal lattice accommodated the sudden strain — a record of the event frozen in the structure.`;
    }
    return ' No visible twinning resulted, but the pressure change altered subsequent growth conditions.';
  }

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
  }
}

// ============================================================
// UTILITY
// ============================================================

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
