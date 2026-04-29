"""Paramorph transitions — in-place polymorph conversions on cooling.

Round 8a-2 introduces the first non-destructive polymorph mechanic in the
sim. apply_paramorph_transitions converts a crystal's `mineral` attribute
when the host fluid cools past a phase-transition T threshold, while
preserving habit + dominant_forms + zones (the external shape and growth
history). This is distinct from THERMAL_DECOMPOSITION which destroys the
crystal.

First entry, Round 8a-2:
    argentite (cubic Ag₂S, >173°C)  →  acanthite (monoclinic Ag₂S, <173°C)

Future entries should add their own dedicated tests in this module.
"""
import pytest


def _make_argentite_crystal(vugg, *, habit="cubic", T_nuc=300):
    """Construct a fresh argentite crystal with cubic habit at high T."""
    c = vugg.Crystal(
        mineral="argentite",
        crystal_id=1,
        nucleation_step=1,
        nucleation_temp=T_nuc,
        position="vug wall",
        habit=habit,
        dominant_forms=["{100} cube", "sharp isometric form"],
    )
    # Give it some growth so it's a believable crystal.
    z = vugg.GrowthZone(
        step=1, temperature=T_nuc,
        thickness_um=200.0, growth_rate=200.0,
        note="cubic argentite — Comstock Lode habit",
    )
    c.add_zone(z)
    return c


def test_paramorph_dict_present(vugg):
    """PARAMORPH_TRANSITIONS exists and has the argentite→acanthite entry."""
    assert hasattr(vugg, "PARAMORPH_TRANSITIONS")
    assert "argentite" in vugg.PARAMORPH_TRANSITIONS
    cool_mineral, T_thresh = vugg.PARAMORPH_TRANSITIONS["argentite"]
    assert cool_mineral == "acanthite"
    assert T_thresh == 173


def test_apply_paramorph_function_exists(vugg):
    """The hook function is exported."""
    assert hasattr(vugg, "apply_paramorph_transitions")
    assert callable(vugg.apply_paramorph_transitions)


def test_no_transition_above_threshold(vugg):
    """Argentite at T > 173°C stays argentite."""
    c = _make_argentite_crystal(vugg, T_nuc=300)
    result = vugg.apply_paramorph_transitions(c, T=300, step=10)
    assert result is None
    assert c.mineral == "argentite"
    assert c.paramorph_origin is None


def test_no_transition_at_threshold(vugg):
    """Argentite at exactly 173°C stays argentite (strict less-than)."""
    c = _make_argentite_crystal(vugg, T_nuc=300)
    result = vugg.apply_paramorph_transitions(c, T=173, step=10)
    assert result is None
    assert c.mineral == "argentite"


def test_transition_below_threshold(vugg):
    """Argentite at T < 173°C converts to acanthite, preserves habit."""
    c = _make_argentite_crystal(vugg, habit="cubic", T_nuc=300)
    pre_habit = c.habit
    pre_forms = list(c.dominant_forms)
    pre_zones = list(c.zones)
    pre_growth = c.total_growth_um

    result = vugg.apply_paramorph_transitions(c, T=150, step=42)

    # Transition fired.
    assert result == ("argentite", "acanthite")
    # mineral changed.
    assert c.mineral == "acanthite"
    # External form preserved — this is what makes a paramorph identifiable.
    assert c.habit == pre_habit
    assert c.dominant_forms == pre_forms
    # Growth history preserved.
    assert c.zones == pre_zones
    assert c.total_growth_um == pre_growth
    # Provenance recorded.
    assert c.paramorph_origin == "argentite"
    assert c.paramorph_step == 42


def test_octahedral_habit_preserved(vugg):
    """Other argentite habits (octahedral, arborescent) also preserve form."""
    for habit, forms in [
        ("octahedral", ["{111} octahedron", "modified by {100}"]),
        ("arborescent", ["dendritic Ag₂S branches"]),
    ]:
        c = _make_argentite_crystal(vugg, habit=habit, T_nuc=300)
        c.dominant_forms = list(forms)
        result = vugg.apply_paramorph_transitions(c, T=120, step=5)
        assert result == ("argentite", "acanthite")
        assert c.mineral == "acanthite"
        assert c.habit == habit
        assert c.dominant_forms == forms
        assert c.paramorph_origin == "argentite"


def test_idempotent_after_transition(vugg):
    """Once converted, calling again does nothing — acanthite is not in
    PARAMORPH_TRANSITIONS as a hot-side key, so there's no further
    conversion to fire."""
    c = _make_argentite_crystal(vugg, T_nuc=300)
    vugg.apply_paramorph_transitions(c, T=150, step=10)
    # Second call: still acanthite, nothing changes.
    result2 = vugg.apply_paramorph_transitions(c, T=80, step=11)
    assert result2 is None
    assert c.mineral == "acanthite"
    # paramorph_step should not be overwritten.
    assert c.paramorph_step == 10


def test_dissolved_crystal_skipped(vugg):
    """A dissolved argentite crystal does not paramorph — there's nothing
    left to convert. Similarly an inactive crystal is ignored."""
    c = _make_argentite_crystal(vugg, T_nuc=300)
    c.dissolved = True
    result = vugg.apply_paramorph_transitions(c, T=150, step=10)
    assert result is None
    assert c.mineral == "argentite"

    c2 = _make_argentite_crystal(vugg, T_nuc=300)
    c2.active = False
    result2 = vugg.apply_paramorph_transitions(c2, T=150, step=10)
    assert result2 is None
    assert c2.mineral == "argentite"


def test_non_paramorph_mineral_ignored(vugg):
    """Crystals of minerals not in PARAMORPH_TRANSITIONS are no-ops."""
    c = vugg.Crystal(
        mineral="quartz",
        crystal_id=1,
        nucleation_step=1,
        nucleation_temp=200,
        position="vug wall",
        habit="prismatic",
    )
    result = vugg.apply_paramorph_transitions(c, T=80, step=10)
    assert result is None
    assert c.mineral == "quartz"


def test_simulator_run_step_fires_paramorph(vugg):
    """Integration test: drop a VugSimulator's temperature past 173°C with
    an argentite crystal in the inventory, run a step, and confirm the
    crystal becomes acanthite while keeping its cubic habit."""
    # Build a minimal simulator with cooling-scenario conditions.
    conditions = vugg.VugConditions(
        temperature=150,
        fluid=vugg.FluidChemistry(Ag=2.0, S=20.0, O2=0.2, pH=6.0),
    )
    sim = vugg.VugSimulator(conditions)
    # Inject an argentite crystal directly.
    c = _make_argentite_crystal(vugg, habit="cubic", T_nuc=300)
    c.crystal_id = 999
    sim.crystals.append(c)
    # Run one step — the paramorph hook fires after grow loop.
    sim.run_step()
    # Crystal should now be acanthite with cubic habit preserved.
    assert c.mineral == "acanthite"
    assert c.habit == "cubic"
    assert c.paramorph_origin == "argentite"
    # Log should mention the paramorph event.
    log_text = "\n".join(sim.log)
    assert "PARAMORPH" in log_text or "paramorph" in log_text.lower()
