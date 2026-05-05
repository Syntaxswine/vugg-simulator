"""v29 mirabilite + thenardite — Na-sulfate evaporite pair with
mirabilite → thenardite dehydration paramorph at 32.4°C eutectic.

Three things to verify:
1. Mirabilite supersaturation: Na + S + low T (<32°C) + concentration
2. Thenardite supersaturation: Na + S + warm T (>25°C) + concentration
3. Heat-path dehydration: warming a mirabilite past 32.4°C converts
   it to thenardite via DEHYDRATION_TRANSITIONS' heat path.
"""
import random


def test_mirabilite_dormant_above_eutectic(vugg):
    """Above 32.4°C the decahydrate isn't stable — mirabilite refuses
    to nucleate even with everything else right."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 3.0
    cond.temperature = 35
    assert cond.supersaturation_mirabilite() == 0


def test_mirabilite_fires_in_cold_drained_brine(vugg):
    """Cold (<32°C) Na-S-rich brine with concentration boost should
    fire mirabilite."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 3.0
    cond.temperature = 15
    assert cond.supersaturation_mirabilite() > 1.0


def test_thenardite_dormant_below_25c(vugg):
    """Below 25°C mirabilite is the stable phase — thenardite gate
    closes."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 3.0
    cond.temperature = 15
    assert cond.supersaturation_thenardite() == 0


def test_thenardite_fires_in_warm_drained_brine(vugg):
    """Warm Na-S-rich brine with concentration boost fires thenardite
    directly."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 3.0
    cond.temperature = 40
    assert cond.supersaturation_thenardite() > 1.0


def test_eutectic_window_neither_fires(vugg):
    """Between the mirabilite-vadose ceiling (32°C) and the thenardite
    floor (25°C), there's a narrow band where neither fires. Real
    geology has metastability here; we keep it simple."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 3.0
    # T=32 — at the edge; mirabilite's T>32 cap and thenardite's T<25
    # both close. The result is no immediate nucleation.
    cond.temperature = 32.5
    assert cond.supersaturation_mirabilite() == 0
    cond.temperature = 24
    assert cond.supersaturation_thenardite() == 0


def test_concentration_hard_gate(vugg):
    """Both minerals require concentration ≥ 1.5 (active evaporation).
    Submerged rings stay at concentration=1 and never fire."""
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 8.0
    cond.fluid.concentration = 1.0
    cond.temperature = 15
    assert cond.supersaturation_mirabilite() == 0
    cond.temperature = 40
    assert cond.supersaturation_thenardite() == 0


def test_mirabilite_paramorphs_to_thenardite_on_warming(vugg):
    """Heat path: warming a mirabilite crystal past 32.4°C (T_max in
    DEHYDRATION_TRANSITIONS) fires the dehydration with 80% probability
    per step. After a few steps at high T, virtually every mirabilite
    should have transitioned."""
    random.seed(42)
    crystal = vugg.Crystal(
        mineral='mirabilite', crystal_id=1, nucleation_step=0,
        nucleation_temp=15, position='vug wall')
    fluid = vugg.FluidChemistry()
    fluid.concentration = 1.0
    # T = 40 is well above 32.4 → heat path fires.
    fired_at = None
    for step in range(1, 10):
        result = vugg.apply_dehydration_transitions(
            crystal, fluid, 'submerged', T=40, step=step)
        if result is not None:
            fired_at = step
            break
    assert fired_at is not None
    assert crystal.mineral == 'thenardite'
    assert crystal.paramorph_origin == 'mirabilite'


def test_mirabilite_in_cold_vadose_ring_slowly_dehydrates(vugg):
    """Slow path: even at cold T (well below the eutectic), mirabilite
    in a vadose ring slowly loses water via the dry_exposure_steps
    counter (threshold 30). Captures cold-cave / dry-valley dehydration."""
    random.seed(42)
    crystal = vugg.Crystal(
        mineral='mirabilite', crystal_id=1, nucleation_step=0,
        nucleation_temp=15, position='vug wall')
    fluid = vugg.FluidChemistry()
    fluid.concentration = 1.0
    fired_at = None
    for step in range(1, 60):
        result = vugg.apply_dehydration_transitions(
            crystal, fluid, 'vadose', T=15, step=step)  # cold but vadose
        if result is not None:
            fired_at = step
            break
    assert fired_at is not None
    assert fired_at == 30  # threshold
    assert crystal.mineral == 'thenardite'
    assert crystal.paramorph_origin == 'mirabilite'


def test_dehydration_table_has_mirabilite(vugg):
    """Sanity: DEHYDRATION_TRANSITIONS now has both borax and mirabilite,
    each with the expected dehydrated-form mapping."""
    table = vugg.DEHYDRATION_TRANSITIONS
    assert 'borax' in table
    assert 'mirabilite' in table
    new_mineral, threshold, conc_min, T_max = table['mirabilite']
    assert new_mineral == 'thenardite'
    assert T_max == 32.4  # eutectic temperature
    assert threshold > 0


def test_water_state_preference_includes_new_evaporites(vugg):
    """Mirabilite, thenardite, borax all join halite/selenite/anhydrite
    on the meniscus-preference list."""
    pref = vugg.WATER_STATE_PREFERENCE
    for m in ('mirabilite', 'thenardite', 'borax'):
        assert m in pref
        state, strength = pref[m]
        assert state == 'meniscus'
        assert strength > 1.0


def test_cold_brine_grows_mirabilite_then_warms_to_thenardite(vugg):
    """End-to-end: a cold drained Na-S brine grows mirabilite, then a
    temperature spike paramorphs them to thenardite. Verifies the
    full pair-chemistry workflow."""
    random.seed(42)
    cond = vugg.VugConditions()
    cond.fluid.Na = 800
    cond.fluid.S = 200
    cond.fluid.O2 = 1.5
    cond.fluid.pH = 7.5
    cond.temperature = 15
    cond.fluid_surface_ring = 8.0
    sim = vugg.VugSimulator(cond, [])
    for r in range(9, 16):
        sim.ring_fluids[r].concentration = 3.0
    for _ in range(60):
        sim.run_step()
    mirab_cold = [c for c in sim.crystals if c.mineral == 'mirabilite']
    assert len(mirab_cold) >= 1
    # Now warm above the eutectic.
    cond.temperature = 40
    for k in range(len(sim.ring_temperatures)):
        sim.ring_temperatures[k] = 40
    for _ in range(20):
        sim.run_step()
    paramorphs = [c for c in sim.crystals
                  if c.mineral == 'thenardite' and c.paramorph_origin == 'mirabilite']
    assert len(paramorphs) >= 1, (
        f"warming past 32.4°C should paramorph at least one mirabilite "
        f"to thenardite; got 0. Initial mirabilite count: {len(mirab_cold)}")
