"""v26 host-rock porosity → continuous water-level drainage.

Asymmetric mechanic: porosity is a pure sink (drains the vug at
porosity × WATER_LEVEL_DRAIN_RATE rings/step). Filling the cavity
stays event-driven (tectonic uplift breaches, aquifer recharge,
fresh infiltration). Default porosity=0.0 keeps existing scenarios
sealed and byte-identical to v25.

Pairs with v24 fluid_surface_ring + v25 vadose-oxidation override:
a scenario that sets porosity > 0 with the cavity full will see
gradual drainage, automatic ring-by-ring transition into the vadose
zone, and supergene-oxidation chemistry kicking in as each ring dries.
"""
import random


def _make_sim(vugg, scenario="porphyry"):
    cond, events, _ = vugg.SCENARIOS[scenario]()
    sim = vugg.VugSimulator(cond, events)
    return sim, cond


def test_default_porosity_no_drift(vugg):
    """Default porosity=0.0 → no drift even when fluid_surface_ring
    is set. Sealed cavity, water stays where the scenario put it."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 8.0
    assert cond.porosity == 0.0
    for _ in range(100):
        sim.run_step()
    assert cond.fluid_surface_ring == 8.0, (
        f"sealed cavity should hold surface at 8.0, got "
        f"{cond.fluid_surface_ring}")


def test_porosity_drains_at_constant_rate(vugg):
    """porosity=1.0 + WATER_LEVEL_DRAIN_RATE=0.05 should drop the
    surface by 0.05 rings every step. After 100 steps from surface=10
    we expect ≈ 5.0."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 10.0
    cond.porosity = 1.0
    for _ in range(100):
        sim.run_step()
    expected = 10.0 - 100 * vugg.WATER_LEVEL_DRAIN_RATE * 1.0
    assert abs(cond.fluid_surface_ring - expected) < 0.01, (
        f"porosity=1 over 100 steps should drop surface to ~{expected}, "
        f"got {cond.fluid_surface_ring}")


def test_porosity_half_rate(vugg):
    """porosity=0.5 should drain at half the porosity=1.0 rate."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 10.0
    cond.porosity = 0.5
    for _ in range(100):
        sim.run_step()
    expected = 10.0 - 100 * vugg.WATER_LEVEL_DRAIN_RATE * 0.5
    assert abs(cond.fluid_surface_ring - expected) < 0.01, (
        f"porosity=0.5 should drain at half rate, expected ~{expected}, "
        f"got {cond.fluid_surface_ring}")


def test_drainage_floors_at_zero(vugg):
    """Once the surface hits 0 (fully drained), drift stops — the
    cavity can't drain below empty. Important guard: without this the
    surface would go negative and ring_water_state would behave oddly."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 1.0  # very close to empty
    cond.porosity = 1.0
    for _ in range(50):
        sim.run_step()
    assert cond.fluid_surface_ring == 0.0, (
        f"drainage should stop at 0, got {cond.fluid_surface_ring}")


def test_porosity_with_unset_surface_no_op(vugg):
    """porosity > 0 with fluid_surface_ring=None means the water-level
    mechanic is OFF. Drift should not fire (if it did, it would have
    nothing to mutate; we check the surface stays None)."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.porosity = 1.0
    assert cond.fluid_surface_ring is None
    for _ in range(50):
        sim.run_step()
    assert cond.fluid_surface_ring is None, (
        f"None surface should remain None, got {cond.fluid_surface_ring}")


def test_drainage_triggers_vadose_oxidation_naturally(vugg):
    """As porosity drains the surface across ring boundaries, the
    vadose-oxidation override should fire on each transition. End-to-
    end: start full + porosity=1.0, run long enough for several rings
    to dry, verify their O2 ratcheted to oxidizing."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 16.0
    cond.porosity = 1.0
    # Initial O2 should be the scenario's reducing value.
    initial_O2 = sim.ring_fluids[15].O2
    assert initial_O2 < 1.0, f"porphyry start O2 = {initial_O2}, expected reducing"
    # Run enough steps to drain ~3 rings (60 steps at 0.05/step).
    for _ in range(60):
        sim.run_step()
    # Surface should be ~13.0; rings 13..15 should have hit oxidizing
    # at some point. Diffusion may smear values back toward 1.0; check
    # only that they're meaningfully above the scenario's reducing
    # baseline.
    assert cond.fluid_surface_ring < 14.0
    for r in (13, 14, 15):
        assert sim.ring_fluids[r].O2 > 1.0, (
            f"ring {r} O2 = {sim.ring_fluids[r].O2}, expected > 1.0 "
            f"after porosity-driven drainage exposed it to air")


def test_tectonic_uplift_event_drains_completely(vugg):
    """event_tectonic_uplift_drains snaps surface to 0 — every ring
    becomes vadose immediately, no drift required."""
    cond = vugg.VugConditions()
    cond.fluid_surface_ring = 12.0
    msg = vugg.event_tectonic_uplift_drains(cond)
    assert cond.fluid_surface_ring == 0.0
    assert cond.flow_rate == 0.05
    assert "drains" in msg.lower() or "fractures" in msg.lower()


def test_aquifer_recharge_event_floods_to_ceiling(vugg):
    """event_aquifer_recharge_floods writes a sentinel that gets
    clamped to ring_count by the simulator on the next step."""
    cond = vugg.VugConditions()
    cond.fluid_surface_ring = 4.0  # mostly drained
    msg = vugg.event_aquifer_recharge_floods(cond)
    # Event itself writes the sentinel and sets flow_rate. Sim drift
    # clamps to ring_count later (covered separately).
    assert cond.fluid_surface_ring == 1.0e6
    assert cond.flow_rate == 2.0
    assert "flood" in msg.lower() or "meteoric" in msg.lower()


def test_aquifer_sentinel_clamps_to_ring_count_in_drift(vugg):
    """The drift method's first job each step is to clamp out-of-range
    surface values. Aquifer recharge writes 1e6; drift clamps that to
    ring_count on the next step. With porosity=0 the clamp is the
    only thing that happens — surface lands cleanly at 16."""
    cond, events, _ = vugg.SCENARIOS["porphyry"]()
    sim = vugg.VugSimulator(cond, events)
    cond.fluid_surface_ring = 1.0e6
    cond.porosity = 0.0  # so we can see the clean clamp
    sim._apply_water_level_drift()
    assert cond.fluid_surface_ring == 16.0


def test_drain_then_flood_then_drain_cycle(vugg):
    """Full cycle: porosity slowly drains, aquifer recharge refills,
    porosity drains again. Tests the wet/dry cycle that PROPOSAL-
    EVAPORITE-WATER-LEVELS mentions for sabkha-style scenarios.

    Note: the refill step also runs drift, so an aquifer-recharge event
    on a porous cavity clamps from 1e6 → 16 → 15.95 in the same step
    (clamp first, then porosity drain). That's correct behaviour — the
    test asserts the surface lands at-or-just-below the ceiling."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 16.0
    cond.porosity = 1.0
    for _ in range(100):
        sim.run_step()
    # Down ~5 rings.
    drained_to = cond.fluid_surface_ring
    assert drained_to < 12.0
    # Refill (porosity stays > 0, so the same step's drift drains 0.05).
    vugg.event_aquifer_recharge_floods(cond)
    sim.run_step()
    assert 15.9 < cond.fluid_surface_ring <= 16.0, (
        f"refill should land at-or-just-below ceiling, got "
        f"{cond.fluid_surface_ring}")
    # Drain again.
    for _ in range(50):
        sim.run_step()
    assert cond.fluid_surface_ring < 14.0
