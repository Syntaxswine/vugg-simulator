# HANDOFF: Brief-19 minerals + 3D-default + replay-in-3D

**Session ended:** 2026-05-08
**Author:** Claude (Opus 4.7, 1M context)
**Status of campaign:** v62 → v64 + 3D-default shipped & pushed to Syntaxswine `main`. Catalog 97 → 116 minerals; 19 new minerals fire / grow / dissolve / narrate. Three.js renderer now default; replay button works in 3D.

---

## What landed (head → origin/main)

```
12c329e  3D-by-default + replay button works in Three.js mode
9fee9c2  Brief-19 narrators: 19 _narrate_<mineral>(c) functions (7 class files)
5b5c1c5  v64 — Brief-19 engines: 19 supersat + grow + nucleation + MINERAL_ENGINES
32282df  v63 — Brief-19 plumbing: scenario broth bumps + 2 new scenarios
9d2316a  v62 (boss-promoted) — brief-19 overlap backfill + Cd-field rebaseline
48cfa3e  Brief-16 minerals: spec entries (100 → 116)
2492eb5  Retire dead Python engine (-52,488 lines)
7588a9c  Priority-three minerals: rutile, turquoise, chrysoprase (research + spec)
```

The 19 new minerals (by class):
| class       | minerals                                                                          |
|-------------|-----------------------------------------------------------------------------------|
| phosphate   | apatite, turquoise                                                                |
| halide      | atacamite, sylvite                                                                |
| carbonate   | strontianite, witherite                                                           |
| molybdate   | scheelite, powellite, wolframite                                                  |
| oxide       | rutile, chromite                                                                  |
| silicate    | chrysoprase                                                                       |
| sulfide     | calaverite, sylvanite, hessite, naumannite, clausthalite, greenockite, hawleyite |

Plus two new scenarios — `epithermal_telluride` (Cripple Creek anchor) and `ultramafic_supergene` (Marlborough anchor) — and one new FluidChemistry field, `Cd`.

---

## Open scope — by priority

### A. Engine calibration sweep (highest priority, estimated 2–4 hours)

The 19 new engines are MVP — chemistry-faithful but uncalibrated. Each entry's `audit_status` field documents the broth gap that should let it fire; the v63 plumbing pass closed those gaps; v64 wired the engines. But nobody has eyeballed whether the per-scenario counts match the documented mineralogy.

Do this for each of the 7 scenarios that bumped:

| scenario                | expected new minerals firing                                    | check for                                                 |
|-------------------------|-----------------------------------------------------------------|-----------------------------------------------------------|
| bisbee                  | atacamite                                                       | should appear alongside chrysocolla / malachite, not dominate them |
| mvt                     | greenockite (+ hawleyite at low T)                              | yellow Cd-coatings on existing sphalerite; substrate logs in 91-nucleation-sulfide |
| porphyry                | rutile                                                          | a few needles; if 50+ specimens, drop sigma threshold     |
| supergene_oxidation     | apatite, powellite, atacamite, greenockite/hawleyite, turquoise | 4-axis Cu split (chrysocolla / malachite / atacamite / turquoise) should look balanced |
| schneeberg              | clausthalite (+ naumannite if Ag rises)                         | selenide trio with existing autunite/zeunerite/torbernite |
| sabkha_dolomitization   | sylvite                                                         | should fire late (post-halite); the K=380 brine eventually concentrates enough |
| searles_lake            | sylvite                                                         | similar — fires from the K-rich evaporite brine           |
| epithermal_telluride    | calaverite, sylvanite, hessite + native_gold + native_tellurium | the Au:Ag ratio should drive calaverite → sylvanite → hessite as Ag rises during cooling |
| ultramafic_supergene    | chrysoprase                                                     | should be the only crystalline phase besides quartz; Ni=200 + alkaline + low T window |

Tools:
- `node tools/gen-js-baseline.mjs` regenerates `tests-js/baselines/seed42_v64.json` after any tuning
- `npm test` re-runs the calibration sweep against the baseline
- The per-scenario crystal counts in the baseline are the readout — compare to the table above

If sigma thresholds need tweaking, the supersat methods are at:
- `js/3x-supersat-<class>.ts` (each is in its class file, named `supersaturation_<mineral>`)
- The pattern is `if (sigma < 1.0) return 0;` then T-window decay + pH penalties + competition penalties
- Lower the per-class divisor (e.g., `Cu / 80.0` → `Cu / 60.0`) to make sigma climb faster ↔ more nucleation

### B. Multi-ring history schema (medium priority, estimated 4–6 hours)

**The replay-in-3D fix shipped, but the underlying data is still flat.**

`wall_state_history` snapshots are flat ring[0] arrays per the v60-era schema (see `js/85c-simulator-state.ts:153-164`). The 3D replay path projects the snapshot's ring[0] cells across all 16 rings, producing a vertically-uniform cavity column — the wall-depth profile is historically accurate but the per-ring variance is lost. Crystals stay LIVE during replay because snapshots don't carry historical crystal sizes either.

Both caveats are inherent to the snapshot schema. The honest fix is:

1. **Multi-ring snapshot writer** — `_snapshotWallState()` in `85c-simulator-state.ts` should iterate all rings, not just `rings[0]`. Storage cost: 16× current. Two hundred-step run goes from ~24 KB → ~384 KB per scenario; acceptable.

2. **Historical crystal-size lookup** — each Crystal already has `zones[]` with per-step thickness. `_topoSyncCrystalMeshes()` in `99i-renderer-three.ts:1312` should accept an optional `replayStep` parameter and:
   - Skip crystals where no `zone.step <= replayStep` (didn't exist yet)
   - Mark dissolved crystals that re-existed in history (replay should show them alive)
   - Sum `zones[k].thickness_um` for `k` where `zones[k].step <= replayStep` to get historical `c_length_mm`

3. **Replay timer plumbing** — `topoReplay()` in `99g-renderer-replay.ts:9` already tracks `idx` (the step). Pass it to `topoRender(history[idx], idx)` and let `topoRender` forward to `_topoRenderThree(sim, wall, snapshot, replayStep)`.

4. **SIM_VERSION bump** — schema change is a baseline-busting shift. Bump to v65, regenerate `seed42_v65.json`. Old saved games carry the flat schema; add a migration shim in `loadGame()` that wraps a flat snapshot in a single-ring multi-ring shape.

### C. MINERAL_DISSOLUTION_RATES backfill (low priority, estimated 30 min)

Several of the 19 new engines have non-null `acid_dissolution` in their spec but no entry in `MINERAL_DISSOLUTION_RATES` (the Phase 1e mass-balance table). When these crystals dissolve, the released species don't credit back to the fluid.

Affected minerals:
- atacamite, sylvite (the dissolution branch logs the chemistry but doesn't apply mass balance)
- apatite, turquoise, strontianite, witherite (carbonate/phosphate dissolution)
- powellite, scheelite (acid_dissolution is null actually — these are stable; skip)
- calaverite, hessite, naumannite, clausthalite (oxidative dissolution releases metals)
- greenockite, hawleyite (CdS oxidation → Cd²⁺ + SO₄²⁻; should credit Cd back)

`MINERAL_DISSOLUTION_RATES` lives in `js/85c-simulator-state.ts` (or near it — search for the constant). Each entry maps mineral → `{ species: rate_per_um }` so dissolution credits scale with thickness lost. Use the spec entries' `acid_dissolution.products` field as the rate map.

### D. Custom event handlers for new scenarios (low priority, estimated 1–2 hours)

`epithermal_telluride` and `ultramafic_supergene` use generic events (`fluid_pulse`, `cooling_pulse`, `aquifer_recharge_floods`, `tectonic_uplift_drains`, `alkalinize`) — see `data/scenarios.json5` events arrays.

Custom handlers would give the scenarios more thematic chemistry pulses:
- `epithermal_telluride_recharge` — bump Au + Ag + Te together, knock down S
- `epithermal_telluride_late_silica` — SiO2 pulse for the late quartz cap
- `ultramafic_supergene_ni_pulse` — Ni + Mg + SiO2 from olivine breakdown
- `ultramafic_supergene_dry_season` — concentration multiplier rises for the seasonal evaporative pulse

Pattern: add `function event_<name>(conditions) { ... return 'log line'; }` in `js/70-events.ts` (or a new `js/70m-epithermal.ts` and `js/70n-ultramafic.ts` if you want the scenario-family split — see existing 70b through 70k for the pattern). Then register in `EVENT_REGISTRY` at the bottom of `js/70-events.ts`. Replace the generic event types in `data/scenarios.json5` with the new names.

### E. Activity-correction stoichiometry table (low priority, estimated 30 min)

The 19 new minerals lack entries in `MINERAL_STOICHIOMETRY` (used by `activityCorrectionFactor` for ionic-strength correction). Currently `activityCorrectionFactor` returns 1.0 for them — no correction. Real chemistry would apply Davies-equation activity coefficients.

Lives in `js/20a-chemistry-activity.ts`. Pattern:
```ts
MINERAL_STOICHIOMETRY['atacamite'] = { Cu: 2, Cl: 1, OH: 3 };  // Cu2Cl(OH)3
```

Each entry maps the dissociation stoichiometry (atom counts) per mineral. Scan the existing entries (calcite, fluorite, halite, etc.) for the format.

### F. narrate_function metadata cleanup (cosmetic, estimated 15 min)

All 19 minerals have `narrate_function: null` in `data/minerals.json`. The narrators ARE wired (in `js/92x-narrators-<class>.ts`); JS dispatch finds them dynamically by name. The metadata is documentation, not gating.

Update each entry: `"narrate_function": "_narrate_<mineral>"`.

### G. Class-color drift residue (cosmetic, estimated 5 min)

In v64 I aligned scheelite + powellite + wolframite to the canonical molybdate `class_color: '#eb13eb'`. Existing molybdate-class drifters that the boss may want to normalize:
- ferrimolybdite — `#f5dc14` (yellow drift)
- wulfenite — `#137feb` (blue drift)

Bumping these would change the topo-map color of those minerals. Boss may want to keep them per-mineral for visual distinction; that's a design call, not a bug. Listed here in case the v64 normalization round wants completion.

### H. Test coverage for new engines (medium priority, estimated 1–2 hours)

`tests-js/calibration.test.ts` covers per-scenario per-mineral COUNTS via baseline diff. It does NOT assert specific firing conditions. There's no test that says e.g. "atacamite fires only when Cl ≥ 30 ppm" — if a future tweak accidentally drops the Cl threshold to 0, the test suite wouldn't catch it (counts would just shift, baseline would update, no alarm).

Pattern to add (see `tests-js/redox.test.ts` for the shape): per-mineral assertion tests against synthetic FluidChemistry instances, calling `supersaturation_<mineral>()` and checking the gate.

---

## Acknowledged design caveats (intentional, not bugs)

These are documented explicitly so a future agent doesn't try to "fix" them without checking with the boss:

1. **The 3D replay's vertically-uniform cavity** is the snapshot-schema limitation, see B above. Boss is aware (commit `12c329e` message).

2. **Crystals stay live during replay.** Same root cause as 1. Same fix path.

3. **Chromite is in the catalog but won't fire in any current scenario.** It's a magmatic >1000°C mineral — no scenario delivers that T. Logged in its `audit_status`. Listed for cataloging completeness; would need a `layered_mafic_intrusion` scenario to actually crystallize.

4. **The Au-Ag-Te trio is currently parked in `gem_pegmatite` + `porphyry` as scenario placeholders.** Both broths now carry Te + Au, but the chemistry niche is properly epithermal — see the new `epithermal_telluride` scenario. The placeholder scenarios will fire calaverite / sylvanite / hessite at low rates; that's geologically plausible (porphyries do carry trace tellurides at the upper levels) but feels off in `gem_pegmatite`. Leave the scenarios listing in the spec unless you want to remove pegmatite from those three minerals' `scenarios` array.

5. **`scheelite` and `wolframite` are classed `molybdate` despite being tungstates.** This matches the existing convention (raspite + stolzite + wulfenite are all classed molybdate). The class enum is misleadingly named but the file structure is consistent. Don't reclass without checking with the boss — class is what drives `js/3x-supersat-<class>.ts` file location.

6. **Three.js renderer Phase E1 only ships cavity wireframe + crystal meshes.** Phase E2 is forward-looking: better lighting (specular highlights on crystal faces), texture-painted habits (botryoidal / saddle-rhomb etc. via shaders), water-line / fluid-surface visualization as a translucent disc, fluorescence under simulated UV (post-process bloom on emissive materials). Not in scope of this campaign; flagged so an agent doesn't redo Phase E1.

---

## Critical files for the next agent

### Engine wiring (where to add or tune)
- `data/minerals.json` — spec entries (single source of truth for spec-side decisions)
- `data/scenarios.json5` — initial fluid + events per scenario
- `js/3x-supersat-<class>.ts` — `supersaturation_<mineral>()` methods
- `js/5x-engines-<class>.ts` — `grow_<mineral>(crystal, conditions, step)` functions
- `js/65-mineral-engines.ts` — `MINERAL_ENGINES` dispatch table
- `js/8x-nucleation-<class>.ts` — `_nuc_<mineral>(sim)` gates + `_nucleateClass_<klass>(sim)` dispatcher
- `js/92x-narrators-<class>.ts` — `_narrate_<mineral>(c)` prose

### Renderer (3D-default + replay path)
- `js/99i-renderer-three.ts:27` — `_topoUseThreeRenderer = true` initial value (3D-default)
- `js/99i-renderer-three.ts:1690` — `_topoApplyThreeDefaultOnce()` one-shot init
- `js/99i-renderer-three.ts:1740` — `_topoSnapshotWall()` builds replay-cavity
- `js/99i-renderer-three.ts:1773` — `_topoRenderThree(sim, wall, optOverrideRing)` — the `optOverrideRing` is the snapshot
- `js/99b-renderer-topo-2d.ts:283` — forwards `optOverrideRing` from `topoRender(snapshot)`
- `js/99g-renderer-replay.ts` — replay timer; calls `topoRender(history[idx])` per frame
- `js/85c-simulator-state.ts:153-164` — snapshot writer (flat ring[0]; needs multi-ring extension for B)

### Tests + baselines
- `tests-js/baselines/seed42_v64.json` — current calibration baseline (regen after any chemistry tuning)
- `tools/gen-js-baseline.mjs` — baseline regenerator (run after build)
- `tests-js/calibration.test.ts` — per-scenario baseline diff
- `npm test` — run the full vitest suite

### Documentation
- `js/README.md` — canonical "where does X live" map (every numeric prefix annotated)
- `ARCHITECTURE.md` — two-runtimes-on-purpose framing + build pipeline + history note
- `proposals/PROPOSAL-3D-TOPO-VUG.md` — Three.js renderer design (Phase E1 shipped, E2 forward-looking)
- `proposals/PROPOSAL-3D-SIMULATION.md` — multi-ring sim design (Phase A shipped, ring count 16 default)

---

## Quick-start for the next agent

```bash
# Pull state
git fetch origin
git checkout main
git pull --ff-only origin main

# Verify build is clean
npm run typecheck && npm run build && npm test

# Pick a priority from the open-scope list above

# After any chemistry tuning:
node tools/gen-js-baseline.mjs
git diff tests-js/baselines/seed42_v64.json | head -100   # eyeball the drift

# After any source change:
npm run build
npm test                                                  # 65/65 should still pass
```

The boss promotes from Syntaxswine → StonePhilosopher (canonical) — never push to canonical directly. `v-python-final` tag is on both remotes as the recovery point for the Python engine retirement (commit `2492eb5`).
