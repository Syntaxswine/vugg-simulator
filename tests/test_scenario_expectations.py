"""Scenario species-expectation regression tests.

For each scenario in `data/scenarios.json5` that declares an
`expects_species` array, asserts that every species in that array
appears in the seed-42 baseline (whether active or dissolved).

The point: each scenario is *designed* to fire a specific cast of
minerals. Schneeberg promises torbernite + zeunerite + autunite +
uranospinite. Colorado Plateau promises carnotite + tyuyamunite. If
some future engine change silently stops one of these from nucleating,
the baseline-diff would catch it eventually — but only after a human
notices the mineral-count change. This test catches it immediately
and tells you exactly which scenario is broken.

`expects_species` is intentionally CONSERVATIVE — it lists the
species that are central to the scenario's design intent, not every
mineral that happens to nucleate by RNG. Adding more species to the
expectation list is a deliberate "this is now a guaranteed feature
of this scenario" commitment.

How to add expectations to a new scenario:
1. Run the scenario at seed-42 (gen_baselines.py captures this)
2. Identify which species the scenario is *designed* to produce
   (named in anchor / description / mechanic notes)
3. Add `"expects_species": [...]` field to the scenario in
   data/scenarios.json5
4. This test verifies the scenario fires those species

How to handle aspirational expectations (scenario anchor promises a
species that doesn't currently fire — e.g., deccan_zeolite is named
for apophyllite but doesn't fire it at seed-42):
- Don't list aspirational species in expects_species (this test would
  fail on every run)
- Either fix the scenario chemistry, or document the gap in the
  scenario notes and leave expects_species at the species that DO fire
"""
import json
from pathlib import Path

import pytest

from tests.gen_baselines import BASELINES_DIR, SEED


REPO = Path(__file__).resolve().parent.parent
SCENARIOS_PATH = REPO / "data" / "scenarios.json5"


def _load_scenario_expectations() -> dict[str, list[str]]:
    """Read expects_species from each scenario callable's attached spec.

    `_build_scenario_from_spec` (vugg.py) attaches the JSON5 spec to
    each scenario callable as `._json5_spec` for inspection. We read
    the expects_species field from there. Returns {scenario_id:
    [species, ...]} for scenarios that declare expects_species; omits
    scenarios that don't (e.g., 'random').
    """
    import sys
    if str(REPO) not in sys.path:
        sys.path.insert(0, str(REPO))
    import vugg
    out: dict[str, list[str]] = {}
    for scen_id, scen_callable in vugg.SCENARIOS.items():
        spec = getattr(scen_callable, "_json5_spec", None)
        if spec is None:
            continue
        expects = spec.get("expects_species")
        if expects:
            out[scen_id] = list(expects)
    return out


SCENARIO_EXPECTATIONS = _load_scenario_expectations()


def _baseline_path(sim_version: int) -> Path:
    return BASELINES_DIR / f"seed{SEED}_v{sim_version}.json"


def test_all_scenarios_have_expectations(vugg):
    """Every scenario in vugg.SCENARIOS (except 'random') should declare
    an expects_species array.

    Adding a new scenario without declaring expectations is allowed
    short-term but should be filed as a follow-up — the whole point of
    this test layer is to make scenario design intent explicit.
    """
    scenarios = set(vugg.SCENARIOS.keys()) - {"random"}
    declared = set(SCENARIO_EXPECTATIONS.keys())
    missing = scenarios - declared
    if missing:
        # Not a hard failure — just a soft warning via pytest.fail
        pytest.fail(
            f"Scenarios missing expects_species declaration: {sorted(missing)}. "
            f"Add `expects_species: [...]` to data/scenarios.json5 for each."
        )


@pytest.mark.parametrize(
    "scenario_name",
    sorted(SCENARIO_EXPECTATIONS.keys()),
    ids=sorted(SCENARIO_EXPECTATIONS.keys()),
)
def test_scenario_fires_expected_species(vugg, scenario_name):
    """Each scenario must fire every species in its expects_species list.

    Reads from the seed-42 baseline (which is regenerated whenever
    SIM_VERSION bumps). A species "fires" if it has any total > 0 in
    the baseline — active or dissolved both count, since some species
    are designed to grow then dissolve (uraninite weathering in the
    radioactive_pegmatite scenario is the canonical example).

    Failure modes:
      - "X scenario should fire <species>" — engine change silently
        broke a species the scenario was designed to produce. Regression.
        Either revert the engine change, adjust scenario chemistry to
        restore the species, or remove the species from expects_species
        if the design intent has changed.
    """
    bp = _baseline_path(vugg.SIM_VERSION)
    if not bp.exists():
        pytest.skip(f"No baseline for SIM_VERSION={vugg.SIM_VERSION}")
    with open(bp, encoding="utf-8") as f:
        baseline = json.load(f)

    if scenario_name not in baseline:
        pytest.skip(
            f"{scenario_name!r} not in baseline (regenerate via "
            f"gen_baselines.py)"
        )

    expected = SCENARIO_EXPECTATIONS[scenario_name]
    scenario_baseline = baseline[scenario_name]

    for species in expected:
        if species not in scenario_baseline:
            pytest.fail(
                f"Scenario {scenario_name!r} should fire {species!r} per "
                f"data/scenarios.json5 expects_species, but the seed-42 "
                f"baseline shows it never nucleated. "
                f"Either: (1) the scenario chemistry shifted and broke "
                f"this mineral's gates, (2) the engine for {species!r} "
                f"changed in a way that prevents nucleation in this "
                f"scenario, or (3) the design intent has changed and "
                f"expects_species should be updated. "
                f"Baseline shows: {sorted(scenario_baseline.keys())}"
            )
        # Species in baseline — already counts as "fired" (gen_baselines
        # only records species with total > 0)
