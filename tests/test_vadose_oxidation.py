"""v25 vadose-zone oxidation override.

When a ring transitions wet (submerged or meniscus) → dry (vadose),
its fluid is forced to oxidizing chemistry: O2 ≥ 1.8 and S ×= 0.3.
Submerged rings keep the scenario's chemistry, so the floor stays
reducing while the air-exposed ceiling oxidizes — matches real
supergene paragenesis where pyrite → limonite, galena → cerussite,
chalcopyrite → malachite/azurite all happen above the water table,
not below.

The existing supergene-oxidation engines fire naturally because they
already read each crystal's ring fluid via Phase C v1 plumbing.
"""
import random


def _make_sim(vugg, scenario="porphyry"):
    cond, events, _ = vugg.SCENARIOS[scenario]()
    sim = vugg.VugSimulator(cond, events)
    return sim, cond


def test_default_no_override_when_surface_unset(vugg):
    """fluid_surface_ring=None is the legacy default. The override
    helper should be a no-op — no rings classified as vadose, no
    chemistry mutated. Mirrors the v24 byte-equality invariant."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    pre_O2 = [rf.O2 for rf in sim.ring_fluids]
    pre_S = [rf.S for rf in sim.ring_fluids]
    became = sim._apply_vadose_oxidation_override()
    assert became == [], "no rings should transition under None surface"
    post_O2 = [rf.O2 for rf in sim.ring_fluids]
    post_S = [rf.S for rf in sim.ring_fluids]
    assert pre_O2 == post_O2
    assert pre_S == post_S


def test_dropping_surface_overrides_newly_vadose_rings(vugg):
    """Surface drops from None → 8.0 mid-run: rings 8..15 become
    vadose and get O2 = 1.8 + S ×= 0.3. Rings 0..7 stay submerged
    and keep scenario chemistry."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    # Seed with a fully-submerged starting state (so we have a defined
    # "old" surface other than None — the override will fire when we
    # then drop from 16 to 8).
    cond.fluid_surface_ring = 16.0
    sim._apply_vadose_oxidation_override()  # consume the prev=None step
    assert sim._prev_fluid_surface_ring == 16.0
    # Capture pre-drop chemistry on rings 0..7 (submerged-stays).
    pre_floor_O2 = [sim.ring_fluids[r].O2 for r in range(8)]
    pre_floor_S = [sim.ring_fluids[r].S for r in range(8)]
    # Seed S so we can verify the 0.3× depletion on vadose rings.
    for r in range(16):
        sim.ring_fluids[r].S = 100.0
    # Now drop the surface to 8 (rings 8..15 become vadose).
    cond.fluid_surface_ring = 8.0
    became = sim._apply_vadose_oxidation_override()
    assert sorted(became) == list(range(8, 16)), became
    # Vadose rings: O2 ≥ 1.8, S ≈ 30 (100 × 0.3).
    for r in range(8, 16):
        rf = sim.ring_fluids[r]
        assert rf.O2 >= 1.8, f"ring {r} O2 = {rf.O2}, expected ≥ 1.8"
        assert abs(rf.S - 30.0) < 0.01, f"ring {r} S = {rf.S}, expected ≈ 30"
    # Submerged rings: chemistry unchanged from pre-drop snapshot
    # (note: O2 unchanged means the override didn't fire; we set S=100
    # ourselves so check that wasn't depleted).
    for r in range(8):
        assert sim.ring_fluids[r].S == 100.0, (
            f"submerged ring {r} S = {sim.ring_fluids[r].S}, "
            f"expected 100 (no depletion)")


def test_rising_surface_does_not_re_apply_override(vugg):
    """Surface rising (refill) should NOT re-oxidize already-flooded
    rings. Real geology: re-flooding after oxidation doesn't UN-oxidize;
    it dissolves and transports the secondary minerals as solutes. We
    keep the override local to the wet→dry direction."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    # Drain to ring 4 first.
    cond.fluid_surface_ring = 4.0
    sim._apply_vadose_oxidation_override()
    # Reset O2 and S to scenario values so we can detect a re-application.
    for r in range(16):
        sim.ring_fluids[r].O2 = 0.5
        sim.ring_fluids[r].S = 100.0
    # Refill to ring 12.
    cond.fluid_surface_ring = 12.0
    became = sim._apply_vadose_oxidation_override()
    assert became == [], (
        f"refill from 4 to 12 shouldn't trigger overrides, got {became}")
    # Chemistry untouched.
    for r in range(16):
        assert sim.ring_fluids[r].O2 == 0.5
        assert sim.ring_fluids[r].S == 100.0


def test_meniscus_to_vadose_triggers_override(vugg):
    """A ring transitioning meniscus → vadose (not just submerged →
    vadose) also gets the override. Surface 8.5 puts ring 8 at the
    meniscus; surface 8.0 then makes ring 8 vadose."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 8.5
    sim._apply_vadose_oxidation_override()
    sim.ring_fluids[8].O2 = 0.5  # reset so we can detect the override
    sim.ring_fluids[8].S = 100.0
    cond.fluid_surface_ring = 8.0
    became = sim._apply_vadose_oxidation_override()
    assert 8 in became, (
        f"ring 8 should transition meniscus → vadose, got {became}")
    assert sim.ring_fluids[8].O2 >= 1.8


def test_oxidation_threshold_respects_already_oxidizing_rings(vugg):
    """If a ring's O2 is already above 1.8 (say a prior bisbee oxidation
    pulse already kicked it up to 2.0), the override only ratchets up,
    never down. max(rf.O2, 1.8) — not a clobber."""
    random.seed(42)
    sim, cond = _make_sim(vugg)
    cond.fluid_surface_ring = 16.0
    sim._apply_vadose_oxidation_override()  # establish prev=16
    # Set ring 12 to already-very-oxidizing.
    sim.ring_fluids[12].O2 = 2.5
    cond.fluid_surface_ring = 8.0
    sim._apply_vadose_oxidation_override()
    assert sim.ring_fluids[12].O2 == 2.5, (
        f"ring 12 O2 should stay 2.5 (already > 1.8), got {sim.ring_fluids[12].O2}")


def test_bisbee_final_drying_drains_the_vug(vugg):
    """The bisbee scenario's final-drying event sets fluid_surface_ring
    to 0 — a complete drain, every ring vadose. End-of-scenario state
    should reflect this."""
    random.seed(42)
    cond, events, steps = vugg.SCENARIOS["bisbee"]()
    sim = vugg.VugSimulator(cond, events)
    for _ in range(steps):
        sim.run_step()
    assert cond.fluid_surface_ring == 0.0, (
        f"bisbee should end fully drained, got "
        f"fluid_surface_ring = {cond.fluid_surface_ring}")
    # Every ring should have hit oxidizing O2 at some point — diffusion
    # may smear values back below 1.8, but no ring should still be at
    # the original reducing chemistry. Use a lenient threshold.
    for r in range(sim.wall_state.ring_count):
        assert sim.ring_fluids[r].O2 >= 1.0, (
            f"ring {r} O2 = {sim.ring_fluids[r].O2}, expected ≥ 1.0 "
            f"after full drainage")


def test_supergene_dry_spell_drops_to_mid_cavity(vugg):
    """The supergene_oxidation scenario's dry-spell event sets
    fluid_surface_ring to 8 — half-drained, ceiling vadose, floor
    submerged."""
    random.seed(42)
    cond, events, steps = vugg.SCENARIOS["supergene_oxidation"]()
    sim = vugg.VugSimulator(cond, events)
    for _ in range(steps):
        sim.run_step()
    assert cond.fluid_surface_ring == 8.0, (
        f"supergene_oxidation should end with surface at mid-cavity, "
        f"got fluid_surface_ring = {cond.fluid_surface_ring}")


def test_air_crystals_appear_after_drainage(vugg):
    """Once the bisbee scenario drains, subsequent nucleations should
    be stamped 'air'. The pre-drain crystal population is 'fluid';
    post-drain we expect a non-zero 'air' count."""
    random.seed(42)
    cond, events, steps = vugg.SCENARIOS["bisbee"]()
    sim = vugg.VugSimulator(cond, events)
    for _ in range(steps):
        sim.run_step()
    air_count = sum(1 for c in sim.crystals if c.growth_environment == 'air')
    fluid_count = sum(1 for c in sim.crystals if c.growth_environment == 'fluid')
    assert air_count > 0, (
        f"bisbee end-of-scenario should have air-stamped crystals "
        f"after final drain, got {air_count} air vs {fluid_count} fluid")
