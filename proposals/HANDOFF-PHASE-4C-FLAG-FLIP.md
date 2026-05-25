# HANDOFF: Phase 4c — flip EH_DYNAMIC_ENABLED, calibrate the drift

**Author:** Claude (Opus 4.7), end of 2026-05-05 session
**Audience:** the next session that picks this up cold
**Status:** drift surveyed; calibration strategy specified; not started

---

## TL;DR

Phase 4b shipped: 127 fluid.O2 sites migrated across 10 supersat
classes with byte-identical baselines from v26 (infrastructure
landing) through v37 (final native-class migration). With the flag
still off, all helpers passthrough to fluid.O2 — every engine is
now class-named-helper-mediated and Phase 4c can flip the switch.

Phase 4c is the "flip the flag and calibrate" phase. A speculative
flag flip during the 4b session revealed substantial drift across
20 scenarios (table below). Tuning will need:

* a damping term (`EH_DAMPING`, mirror of `ACTIVITY_DAMPING` /
  `BJERRUM_DAMPING`) so the impact can be dialed in gradually
* per-class Eh-threshold tuning where a scenario shifts beyond the
  ±20% band the prior calibration phases adopted

The user's "fix bugs when seen" rule applies: any scenario that
**stops nucleating its diagnostic mineral entirely** is a bug, not
a calibration shift, and gets fixed in-session. Drift inside the
±20% band is calibration and ships as-is.

---

## Drift survey from the speculative flag flip

Captured at the end of v37 by flipping EH_DYNAMIC_ENABLED→true,
running the baseline generator, then reverting (no commit). All
20 scenarios at seed 42:

| Scenario                    | v37 (off) | flag-on | Δ     | %      |
|---|---|---|---|---|
| bisbee                      |        75 |      79 |  +4   |  +5%   |
| colorado_plateau            |        12 |      12 |   0   |   0%   |
| cooling                     |         3 |       3 |   0   |   0%   |
| deccan_zeolite              |        10 |      14 |  +4   | +40%   |
| gem_pegmatite               |        21 |      21 |   0   |   0%   |
| marble_contact_metamorphism |         4 |       4 |   0   |   0%   |
| mvt                         |        25 |      34 |  +9   | +36%   |
| naica_geothermal            |        11 |      12 |  +1   |  +9%   |
| ouro_preto                  |        19 |      14 |  -5   | -26%   |
| porphyry                    |        33 |      31 |  -2   |  -6%   |
| pulse                       |         5 |       2 |  -3   | -60%   |
| radioactive_pegmatite       |        15 |      29 | +14   | +93%   |
| reactive_wall               |        33 |      40 |  +7   | +21%   |
| sabkha_dolomitization       |         5 |       8 |  +3   | +60%   |
| schneeberg                  |        31 |      27 |  -4   | -13%   |
| searles_lake                |        15 |      16 |  +1   |  +7%   |
| supergene_oxidation         |        87 |      65 | -22   | -25%   |
| tutorial_first_crystal      |         6 |       3 |  -3   | -50%   |
| tutorial_mn_calcite         |         3 |       3 |   0   |   0%   |
| tutorial_travertine         |        10 |      16 |  +6   | +60%   |

RMS Δ ≈ 33% across 20 scenarios. 6 within ±5%, 11 within ±20%, 9
outside ±20%. Not catastrophic but not a quick ship either.

### Pattern reading

* **Scenarios that GAIN crystals**: chemistry sits at default
  Eh=200 mV (mildly oxidizing), and the `o2FromEh` synthetic O2
  derivation lands at ~0.89 — higher than several legacy O2 thresholds
  in those scenarios' input fluid. Engines that previously just-barely-
  failed their O2 gate now pass on the synthetic value. *radioactive
  pegmatite* (+93%) and *tutorial_travertine* (+60%) are the loudest
  signals.

* **Scenarios that LOSE crystals**: input fluid sets `O2 > 0.89`
  explicitly (high-oxic scenarios), so the synthetic O2 from default
  Eh=200 is LESS oxidizing than the scenario specified — and engines
  that needed O2≥1.0 or O2≥1.5 stop passing. *supergene_oxidation*
  (-25%, with 22 fewer crystals) is the worst case — supergene fluid
  is by definition fully aerobic, but `ehFromO2(O2≥1.0)` returns Eh
  ≥ 500 mV which the default Eh=200 doesn't satisfy.

* **Diagnosis**: scenarios are still passing fluid.O2 directly; they
  haven't been migrated to set fluid.Eh. The default Eh=200 is too
  reducing for supergene scenarios and too oxidizing for MVT-style
  reduced-side scenarios. **Phase 4c must thread Eh into scenario
  inputs alongside O2** before the flag flips cleanly.

---

## Recommended Phase 4c sequencing

### Step 1: Add EH_DAMPING + threading helper (no flag flip)

Mirror of `ACTIVITY_DAMPING` (Phase 2b/c) and `BJERRUM_DAMPING`
(Phase 3c). A single damping factor in [0, 1] that interpolates
between flag-OFF behavior (0.0 = pure fluid.O2 read) and full
flag-ON behavior (1.0 = pure Eh read). Each helper's flag-ON
branch becomes a weighted average:

```ts
const result_off = legacy_O2_form;
const result_on  = eh_based_form;
return result_off * (1 - EH_DAMPING) + result_on * EH_DAMPING;
```

Ship at `EH_DAMPING = 0.0` first — byte-identical to v37. SIM_VERSION
38, baseline confirms zero drift. This is the dial-it-in rig.

### Step 2: Audit scenarios for Eh values

Cross-check each of the 20 scenarios in `data/scenarios.json5` —
do they specify `Eh` directly, or only `O2`? For O2-only
scenarios, infer the right Eh from the legacy O2 via `ehFromO2`
and set it in the scenario's initial fluid. This is a one-time
data migration, not engine work.

After the audit, every scenario should have a defensible Eh that
makes the legacy O2 path and the new Eh path produce comparable
gating decisions.

### Step 3: Bump EH_DAMPING gradually

First try `EH_DAMPING = 0.25` (matching ACTIVITY_DAMPING's land
point). Diff baseline; expect modest shifts. Check that the
worst-case scenarios from Step 1's drift table stay within ±20%.

Then 0.5 → 0.75 → 1.0 in subsequent commits, recalibrating
per-class Eh thresholds at the helper level if specific scenarios
are still drifting too much.

### Step 4: Tune per-class thresholds where needed

Each `*RedoxAvailable(fluid, X)` helper currently uses
`ehFromO2(X)` as its flag-ON threshold. For specific classes where
the calibration sweep shows persistent drift, replace the
ehFromO2 call with a hand-tuned constant. This is the "playbook
the original handoff doc described" — per-class, surgical.

### Step 5: Bug fixes for diagnostic-mineral disappearances

If any scenario stops nucleating its diagnostic mineral entirely
(e.g., supergene_oxidation losing all malachite), that's a bug.
Trace which engine's gate is now failing under the new Eh regime
and adjust either the scenario's initial Eh, the engine's
threshold, or the helper's mapping. Don't accept that as
"calibration shift."

---

## What's already in place (do not redo)

| Artifact | Path | Notes |
|---|---|---|
| All 10 class helpers | `js/20c-chemistry-redox.ts` | sulfate/hydroxide/oxide/arsenate/carbonate/sulfide/molybdate/phosphate/silicate/native (~30 helpers total) |
| Master flag | `js/20c-chemistry-redox.ts:39` | `EH_DYNAMIC_ENABLED = false` |
| Eh field on FluidChemistry | `js/20-chemistry-fluid.ts:62` | `this.Eh = opts.Eh ?? 200.0` |
| ehFromO2 / o2FromEh | `js/20c-chemistry-redox.ts` | piecewise log-linear anchors |
| 11 baselines | `tests-js/baselines/seed42_v{26..37}.json` | each version-bump preserved |
| Calibration sweep test | `tests-js/calibration.test.ts` | auto-loads baseline matching SIM_VERSION |
| Redox unit tests | `tests-js/redox.test.ts` | 23 parity tests across all class helpers |
| Baseline regen tool | `tools/gen-js-baseline.mjs` | `node tools/gen-js-baseline.mjs` after each bump |

`npm test` should be 63/63 green at the start of the session. If
not, something else broke — debug that before touching Phase 4c.

---

## Files to read first (in order)

1. `proposals/PROPOSAL-GEOLOGICAL-ACCURACY.md` lines 472–531 — Phase 4 spec
2. `proposals/HANDOFF-PHASE-4B-SULFATE.md` — predecessor handoff (now stale; sulfate complete)
3. `js/15-version.ts` — v26→v37 history including this drift survey
4. `js/20c-chemistry-redox.ts` — all 10 class helpers + the flag
5. `tests-js/baselines/seed42_v37.json` — the byte-identical-since-v26 reference

---

## Things that can change between now and pickup

* The `o2FromEh` / `ehFromO2` anchor mapping is conservative and
  piecewise-linear. If Phase 4c calibration looks too coarse, a
  smoother mapping (continuous Henderson-Hasselbalch via the O₂/H₂O
  half-cell at pH-dependent slope) is a refinement worth considering.
* The proposal's Phase 4d (per-mineral pH dynamics) is independent
  of 4c and could happen first if the user prefers. Both blocks
  the "real chemistry" feel of the sim.
* The session's auto-spawned localStorage stub fix (commit c18a6bc)
  removed a noisy stack trace from baseline generation. If new noise
  appears, check what's broken before chasing it as a Phase 4c issue.

---

*This handoff captures one focused next-session entry point. Future-me
should feel free to redirect if user priorities have shifted.*
