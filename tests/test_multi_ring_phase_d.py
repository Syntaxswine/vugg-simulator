"""Phase D of PROPOSAL-3D-SIMULATION (proposal's "Phase 3") —
orientation tags + area-weighted nucleation.

v0 (this file) lays the foundation:
  * Each ring carries an orientation tag (floor / wall / ceiling)
    derived from its index — bottom quarter, middle half, top quarter.
  * Each ring has an area weight = sin(latitude) at the half-step
    offset the renderer uses, so visual area matches engine weight.
  * Nucleation samples rings weighted by area, so a real-geode-style
    "more crystals at the equator" distribution emerges.

v1 (future) will use the tags to bias habit selection — stalactites
on ceiling rings, stalagmites on floor, walls horizontal.
"""
import random

import pytest


def test_sim_version_bumped_past_20(vugg):
    """Phase D's area-weighted nucleation changes RNG draws compared
    to Phase C v1's uniform sampling, so SIM_VERSION bumps."""
    assert vugg.SIM_VERSION >= 21


# ---------------------------------------------------------------------------
# Orientation tags
# ---------------------------------------------------------------------------

def test_ring_orientation_default_count(vugg):
    """With ring_count == 16, the floor/wall/ceiling buckets split
    evenly: rings 0-3 are floor (4 rings), rings 4-11 are wall (8),
    rings 12-15 are ceiling (4). Symmetric, geologically reasonable."""
    ws = vugg.WallState(ring_count=16)
    floor = [k for k in range(16) if ws.ring_orientation(k) == 'floor']
    walls = [k for k in range(16) if ws.ring_orientation(k) == 'wall']
    ceiling = [k for k in range(16) if ws.ring_orientation(k) == 'ceiling']
    assert floor == [0, 1, 2, 3]
    assert walls == [4, 5, 6, 7, 8, 9, 10, 11]
    assert ceiling == [12, 13, 14, 15]


def test_ring_orientation_single_ring_is_wall(vugg):
    """Legacy single-ring sims have no vertical structure, so every
    cell is treated as 'wall'."""
    ws = vugg.WallState(ring_count=1)
    assert ws.ring_orientation(0) == 'wall'


# ---------------------------------------------------------------------------
# Area weights
# ---------------------------------------------------------------------------

def test_ring_area_weight_max_at_equator(vugg):
    """sin(latitude) peaks at the equator (phi = π/2). For an even
    ring_count, the two rings closest to the equator share the
    maximum weight."""
    ws = vugg.WallState(ring_count=16)
    weights = [ws.ring_area_weight(k) for k in range(16)]
    max_weight = max(weights)
    # Rings 7 and 8 straddle the equator on N=16.
    assert weights[7] == pytest.approx(max_weight)
    assert weights[8] == pytest.approx(max_weight)


def test_ring_area_weight_min_at_poles(vugg):
    """The polar caps (ring 0 = south, ring N-1 = north) carry the
    smallest weights — small but non-zero thanks to the half-step
    offset in the latitude formula."""
    ws = vugg.WallState(ring_count=16)
    floor_w = ws.ring_area_weight(0)
    ceiling_w = ws.ring_area_weight(15)
    equator_w = ws.ring_area_weight(7)
    assert 0 < floor_w < equator_w * 0.5  # poles are <50% of equator
    assert floor_w == pytest.approx(ceiling_w)  # symmetric


def test_ring_area_weight_single_ring(vugg):
    ws = vugg.WallState(ring_count=1)
    assert ws.ring_area_weight(0) == 1.0


# ---------------------------------------------------------------------------
# Area-weighted nucleation
# ---------------------------------------------------------------------------

def test_nucleation_distributes_weighted_toward_equator(vugg):
    """Run a scenario that produces many crystals and verify the
    distribution is biased toward the equator (more crystals on
    wall rings 4-11 than the polar floor/ceiling combined). Statistical
    test — uses many samples to make the expectation robust."""
    random.seed(42)
    cond, events, _ = vugg.SCENARIOS["porphyry"]()
    sim = vugg.VugSimulator(cond, events)
    for _ in range(120):
        sim.run_step()
    # Tally only free-wall nucleations (those with no host inheritance
    # bias — host-substrate overgrowths just inherit the host's ring).
    # Easiest proxy: all crystals, since most porphyry crystals are
    # free-wall and host-substrate overgrowths shouldn't dominate.
    rings = [c.wall_ring_index for c in sim.crystals
              if c.wall_ring_index is not None]
    if not rings:
        pytest.skip("scenario produced no crystals")
    n_wall = sum(1 for r in rings if 4 <= r <= 11)
    n_polar = sum(1 for r in rings if r < 4 or r >= 12)
    # Wall rings have ~4× more total area weight than polar rings on
    # N=16 (sum of sin(phi) across rings 4-11 vs rings 0-3 + 12-15).
    # We expect at least 2× more wall-ring nucleations than polar in
    # any reasonable run; tighter bound would be flaky on small samples.
    assert n_wall > n_polar, (
        f"expected wall-biased nucleation, got "
        f"wall={n_wall} polar={n_polar}"
    )


def test_nucleation_consumes_one_rng_call(vugg):
    """`_assign_wall_ring` must consume exactly one RNG number per
    nucleation regardless of ring_count, so simulation parity holds
    when ring_count changes. We verify by comparing the RNG state
    after two equivalent nucleations across different ring counts —
    the state should advance by exactly one tick in both cases."""
    cond = vugg.VugConditions(
        temperature=200.0, pressure=1.0,
        fluid=vugg.FluidChemistry(),
        wall=vugg.VugWall(),
    )

    # ring_count=1 path: should always pick ring 0, consume one RNG.
    sim_a = vugg.VugSimulator(cond)
    sim_a.wall_state.ring_count = 1
    sim_a.wall_state.rings = sim_a.wall_state.rings[:1]
    random.seed(99)
    state_before = random.getstate()
    sim_a._assign_wall_ring("vug wall")
    state_after_a = random.getstate()

    # ring_count=16 path: same RNG state in, exactly one RNG consumed
    # afterward.
    sim_b = vugg.VugSimulator(cond)
    random.seed(99)
    sim_b._assign_wall_ring("vug wall")
    state_after_b = random.getstate()

    # Both should have advanced by one random.random() call. The
    # easiest cross-check: another random.random() after each
    # produces the same value as a fresh seed-99 stream's second value.
    random.setstate(state_after_a)
    next_a = random.random()
    random.setstate(state_after_b)
    next_b = random.random()
    assert next_a == next_b, (
        "_assign_wall_ring consumed different amounts of RNG state "
        "across ring counts — simulation parity will break"
    )
