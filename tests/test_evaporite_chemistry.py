"""v27 evaporite chemistry — items 3-5 of PROPOSAL-EVAPORITE-WATER-LEVELS.

Three new mechanics:
1. FluidChemistry.concentration — per-ring evaporative multiplier.
   Boosted at wet → vadose transition by EVAPORATIVE_CONCENTRATION_FACTOR.
2. WATER_STATE_PREFERENCE — meniscus nucleation bias for evaporite minerals.
3. Halite (NaCl) — chloride evaporite with supersaturation_halite that
   reads the per-ring concentration multiplier.
"""
import random


def _make_sim(vugg, scenario="porphyry"):
    cond, events, _ = vugg.SCENARIOS[scenario]()
    return vugg.VugSimulator(cond, events), cond


# ---------------- concentration multiplier -------------------------------

def test_default_concentration_is_one(vugg):
    """Fresh fluids start at concentration=1.0 (no evaporative bias).
    Existing scenarios that don't set fluid_surface_ring stay byte-
    identical — every step's drift methods early-exit."""
    sim, cond = _make_sim(vugg)
    assert cond.fluid.concentration == 1.0
    for rf in sim.ring_fluids:
        assert rf.concentration == 1.0


def test_vadose_transition_boosts_concentration(vugg):
    """When a ring transitions wet → vadose, its concentration
    multiplies by EVAPORATIVE_CONCENTRATION_FACTOR (default 3×).
    Submerged rings stay at 1.0."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 16.0
    sim._apply_vadose_oxidation_override()  # establish prev=16
    # Drop to 8, rings 8..15 become vadose.
    cond.fluid_surface_ring = 8.0
    sim._apply_vadose_oxidation_override()
    for r in range(8, 16):
        assert sim.ring_fluids[r].concentration == vugg.EVAPORATIVE_CONCENTRATION_FACTOR, (
            f"vadose ring {r} concentration = {sim.ring_fluids[r].concentration}, "
            f"expected {vugg.EVAPORATIVE_CONCENTRATION_FACTOR}")
    for r in range(0, 8):
        assert sim.ring_fluids[r].concentration == 1.0, (
            f"submerged ring {r} concentration = {sim.ring_fluids[r].concentration}, "
            f"expected 1.0")


def test_repeated_drainage_compounds_concentration(vugg):
    """Two successive drains should compound the concentration boost.
    Drain to 12, then to 6 — rings 12..15 see one boost (they were
    transitioned in step one), rings 6..11 see one boost from step
    two. No ring should see a × ratio² unless it transitioned twice."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 16.0
    sim._apply_vadose_oxidation_override()
    cond.fluid_surface_ring = 12.0
    sim._apply_vadose_oxidation_override()
    for r in range(12, 16):
        assert abs(sim.ring_fluids[r].concentration - 3.0) < 1e-9
    cond.fluid_surface_ring = 6.0
    sim._apply_vadose_oxidation_override()
    # Rings 12..15 transitioned in step one only — still 3.0.
    for r in range(12, 16):
        assert abs(sim.ring_fluids[r].concentration - 3.0) < 1e-9
    # Rings 6..11 transitioned in step two — also 3.0 (from initial 1.0).
    for r in range(6, 12):
        assert abs(sim.ring_fluids[r].concentration - 3.0) < 1e-9


# ---------------- water-state preference / meniscus bonus -----------------

def test_water_state_preference_table_includes_evaporites(vugg):
    """Halite, selenite, anhydrite are evaporite-preference minerals
    that get a meniscus-zone weight bonus during nucleation."""
    table = vugg.WATER_STATE_PREFERENCE
    assert 'halite' in table
    assert 'selenite' in table
    assert 'anhydrite' in table
    # All target the meniscus state.
    for mineral, (state, strength) in table.items():
        assert state == 'meniscus', (
            f"{mineral} water-state preference = {state!r}, "
            f"expected 'meniscus' (bathtub-ring deposit)")
        assert strength > 1.0


def test_halite_prefers_meniscus_ring(vugg):
    """With fluid_surface_ring=8.5 (ring 8 = meniscus), halite
    nucleations should land disproportionately on ring 8 vs neutral
    sampling. Run many nucleations and check the meniscus share is
    elevated."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 8.5
    counts = {}
    for _ in range(600):
        ring = sim._assign_wall_ring("vug wall", "halite")
        counts[ring] = counts.get(ring, 0) + 1
    meniscus_share = counts.get(8, 0) / 600
    # With area weight ≈ 0.087 (ring 8 sin(π·8.5/16)·1) and 4× boost,
    # halite meniscus share should be substantially elevated.
    # Compare to a no-bias mineral on the same setup.
    random.seed(42)
    sim2, cond2 = _make_sim(vugg)
    cond2.fluid_surface_ring = 8.5
    neutral_counts = {}
    for _ in range(600):
        ring = sim2._assign_wall_ring("vug wall", "quartz")
        neutral_counts[ring] = neutral_counts.get(ring, 0) + 1
    neutral_share = neutral_counts.get(8, 0) / 600
    assert meniscus_share > neutral_share * 1.5, (
        f"halite meniscus share {meniscus_share:.2%} should exceed "
        f"neutral baseline {neutral_share:.2%} by > 1.5× "
        f"(4× weight should be obvious). "
        f"Counts: halite={counts}, neutral={neutral_counts}")


# ---------------- halite chemistry ---------------------------------------

def test_halite_dormant_at_baseline_concentration(vugg):
    """Without an evaporative concentration boost (concentration=1.0),
    typical scenario Na + Cl values shouldn't reach halite saturation.
    Confirms halite is a true evaporite — needs drying to fire."""
    cond, events, _ = vugg.SCENARIOS["mvt"]()  # MVT has Cl
    sim = vugg.VugSimulator(cond, events)
    # Default mvt fluid: Na ~80, Cl ~600 — these alone shouldn't saturate
    # halite. (Concentration=1.0 keeps the multiplier off.)
    sigma = cond.supersaturation_halite()
    assert sigma < 1.0, (
        f"halite at baseline mvt should not be supersaturated, "
        f"got σ={sigma:.2f} (Na={cond.fluid.Na}, Cl={cond.fluid.Cl}, "
        f"concentration={cond.fluid.concentration})")


def test_halite_fires_after_concentration_boost(vugg):
    """At concentration=3× (post-vadose-transition), realistic Na + Cl
    seeding should push halite into supersaturation."""
    cond, events, _ = vugg.SCENARIOS["porphyry"]()
    cond.fluid.Na = 50
    cond.fluid.Cl = 700
    cond.fluid.concentration = 3.0
    sigma = cond.supersaturation_halite()
    assert sigma > 1.0, (
        f"halite at concentration=3× should be supersaturated, got σ={sigma:.2f}")


def test_halite_engine_grows_consumes_na_cl(vugg):
    """grow_halite mass-balances Na + Cl out of the ring fluid as
    crystals grow. Two consecutive growth steps should leave Na and
    Cl strictly lower."""
    random.seed(42)
    cond = vugg.VugConditions()
    cond.fluid.Na = 200
    cond.fluid.Cl = 1500
    cond.fluid.concentration = 4.0
    crystal = vugg.Crystal(
        mineral='halite', crystal_id=1, nucleation_step=0,
        nucleation_temp=25, position='vug wall')
    pre_Na = cond.fluid.Na
    pre_Cl = cond.fluid.Cl
    zone = vugg.grow_halite(crystal, cond, step=1)
    assert zone is not None and zone.thickness_um > 0
    assert cond.fluid.Na < pre_Na, "halite growth should consume Na"
    assert cond.fluid.Cl < pre_Cl, "halite growth should consume Cl"


def test_halite_redissolves_on_meteoric_flush(vugg):
    """When concentration drops below 1.5 (refill / fresh meteoric
    pulse), existing halite re-dissolves quickly. Real rock salt is
    highly soluble."""
    random.seed(42)
    cond = vugg.VugConditions()
    cond.fluid.Na = 50
    cond.fluid.Cl = 200
    cond.fluid.concentration = 1.0  # below the 1.5 dissolution gate
    crystal = vugg.Crystal(
        mineral='halite', crystal_id=1, nucleation_step=0,
        nucleation_temp=25, position='vug wall')
    crystal.total_growth_um = 50
    crystal.c_length_mm = 0.05
    zone = vugg.grow_halite(crystal, cond, step=1)
    assert zone is not None
    assert zone.thickness_um < 0, (
        f"halite should re-dissolve at low concentration, got zone "
        f"thickness {zone.thickness_um}")
    assert crystal.dissolved


def test_drained_scenario_grows_halite(vugg):
    """End-to-end: a Na + Cl-bearing scenario drained mid-run should
    produce halite crystals from the evaporative concentration of
    its newly-vadose rings."""
    random.seed(42)
    cond, events, _ = vugg.SCENARIOS["mvt"]()
    cond.fluid.Na = 100  # pump up the chloride brine
    cond.fluid.Cl = 800
    cond.fluid_surface_ring = 8.0
    sim = vugg.VugSimulator(cond, events)
    for _ in range(80):
        sim.run_step()
    halite = [c for c in sim.crystals if c.mineral == 'halite']
    assert len(halite) > 0, (
        f"draining a Na-Cl-rich vug should grow halite, got 0 crystals "
        f"after 80 steps. Final concentration on a vadose ring: "
        f"{sim.ring_fluids[12].concentration:.2f}")
    # Most halite should be in upper rings (vadose / meniscus zone).
    rings = [c.wall_ring_index for c in halite]
    avg_ring = sum(rings) / len(rings)
    assert avg_ring > 6.0, (
        f"halite average ring = {avg_ring:.1f}, expected ≥ 6 (upper "
        f"hemisphere where evaporation is happening). Rings: {rings}")
