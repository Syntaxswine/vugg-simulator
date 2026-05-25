# HANDOFF: Brief-19 minerals + 3D-default + replay-in-3D

**Session ended:** 2026-05-08
**Author:** Claude (Opus 4.7, 1M context)
**Status of campaign:** v62 → v67 shipped & pushed to Syntaxswine `main`. Catalog 97 → 116 minerals; 19 new minerals fire / grow / dissolve / narrate. Three.js renderer is the default. Replay-in-3D is fully honest: cavity geometry, crystal sizes, T/pH/pressure/fluid/σ-pills, paramorph identity, and replay-step overlay all rewind in lockstep. History decimated so 1000-step runs stay ≤ ~14 MB in memory. Six brief-19 minerals had no `MINERAL_STOICHIOMETRY` entry (loud `[mass-balance]` warnings since v62-Cd) — closed in v67 + 8 hygiene back-fills.

> **Brief Section A (replay-in-3D) is DONE** as of commits `c781893` (v65), `c8ae42b` (v66), `26b19cd` (decimation), `7b03623` (v67 mass-balance back-fill). See "Done since this brief was written" below for the closure log; the original Section A plan is preserved unchanged for archaeology. Sections B–H remain open as written.

## Done since this brief was written

| commit    | tag  | what                                                                                                                         |
|-----------|------|------------------------------------------------------------------------------------------------------------------------------|
| `c781893` | v65  | Multi-ring snapshots `{ step, rings: [...] }` + per-crystal historical-size lookup walking `zones[]`. Cavity + crystal sizes rewind honestly. |
| `c8ae42b` | v66  | Conditions snapshot per step (T, pressure, pH, full fluid clone, vug diameter, radiation dose) + paramorph mineral-rewind in renderer + replay-step overlay ("▶ replay step 76 / 150 · 240°C · pH 6.4") + fortress-status panel reads snapshot during replay (σ-pills compute against snapshot fluid). |
| `26b19cd` | —    | Replay-history decimation: stride 1 → 3 → 9 → 27 → 81 with step. 1000-step run = 92 snapshots (~14 MB) instead of 1000 (~150 MB). End-of-replay lag = (stride − 1) at the most recent tier; visually unnoticeable. |
| `7b03623` | v67  | `MINERAL_STOICHIOMETRY` back-fill: 6 warned (atacamite/sylvite/greenockite/hawleyite/powellite/turquoise) + 8 hygiene (apatite + Au-Te trio + Ag-Se duo + scheelite/wolframite). Mass-balance warnings now silent. 6 of 22 scenarios drift; turquoise shrunk 1006→460μm in schneeberg, powellite 67→54μm in porphyry (their ingredients now debit honestly). |

## Open follow-ups not in the original brief

- **Replay scrub bar + pause UX** — boss-flagged 2026-05-08 as "remind me later." Spawn-task chip registered in this session: `Replay scrub bar + pause UX`. The v66 trajectory is honest enough to study, but you can only ▶/⏹ — no pause, no scrub, no frame-step. Picking up the chip in a fresh worktree would add a slider beside the bottom-center overlay + pause/resume on the existing button + scrub-jump that re-renders + re-ticks fortress-status from the dragged snapshot.
- **`MINERAL_DISSOLUTION_RATES` back-fill** (Section C below — still applies). Growth-side debits are now correct; dissolution-side credits aren't.

---

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

### A. Replay-in-3D — make it real (TOP PRIORITY tonight — boss-flagged 2026-05-08)

**The replay button visibly does something now (commit `12c329e`), but the cavity it shows is a vertically-uniform projection of ring[0] and the crystals stay LIVE during playback. That's the placeholder. The honest fix is multi-ring history + per-step crystal sizes — described in detail below as the four-part change. Read this section first.**

The data path today:
- `wall_state_history` snapshots are flat ring[0] arrays per the v60-era schema. Writer at `js/85c-simulator-state.ts:153-164` only stores ring[0].
- `topoReplay()` in `js/99g-renderer-replay.ts:9` cycles `history[idx]` via `topoRender(history[idx])`.
- `topoRender(optOverrideRing)` in `js/99b-renderer-topo-2d.ts:172` forwards the snapshot to `_topoRenderThree(sim, wall, optOverrideRing)`.
- `_topoRenderThree()` in `js/99i-renderer-three.ts:1773` calls `_topoSnapshotWall()` (line 1740) which projects ring[0] across all 16 rings → uniform column. Crystals come from `sim.crystals` LIVE — `_topoSyncCrystalMeshes()` at `js/99i-renderer-three.ts:1312` reads `crystal.c_length_mm` etc. unconditionally.

The four-part fix (do all four; partial fixes leave the replay still mostly-fake):

1. **Multi-ring snapshot writer.** `_snapshotWallState()` (or `_snapshotWall()` — search for the `wall_state_history.push(...)` in `js/85c-simulator-state.ts:164`) needs to iterate all rings, not just `rings[0]`. Replacement shape:
   ```ts
   const snap = {
     step: this.step_number,
     rings: new Array(this.wall_state.ring_count),
   };
   for (let r = 0; r < this.wall_state.ring_count; r++) {
     const ring = this.wall_state.rings[r];
     snap.rings[r] = new Array(ring.length);
     for (let i = 0; i < ring.length; i++) {
       const c = ring[i];
       snap.rings[r][i] = {
         wall_depth: c.wall_depth, crystal_id: c.crystal_id,
         mineral: c.mineral, thickness_um: c.thickness_um,
         base_radius_mm: c.base_radius_mm,
       };
     }
   }
   this.wall_state_history.push(snap);
   ```
   Storage cost: 16× current. A 200-step run grows from ~24 KB → ~384 KB; acceptable. The `step` field is the missing piece for part 3.

2. **Historical crystal-size lookup.** Each Crystal already has `zones[]` where each zone has `step` and `thickness_um`. `_topoSyncCrystalMeshes()` needs to accept an optional `replayStep` parameter:
   - **Skip** crystals where no `zones[k].step <= replayStep` (the crystal hadn't nucleated yet at that step).
   - **Compute historical c_length_mm** = sum of `zones[k].thickness_um / 1000` for `k` where `zones[k].step <= replayStep`. Cap at the live `c_length_mm` so dissolution events later in life don't accidentally inflate the replay size.
   - **Resurrect dissolved crystals** that were active at `replayStep`. `crystal.dissolved && crystal.dissolved_at_step > replayStep` → render as if active. (If you don't have `dissolved_at_step`, the simplest proxy is the last positive-thickness zone's `step` — adjust the writer in `js/27-geometry-crystal.ts` to record this when `crystal.dissolved` flips.)
   - For perimorph-eligible crystals, the existing live path renders them as hollow shells when dissolved — preserve that behavior in replay too.

3. **Replay timer plumbing.** `topoReplay()` already tracks `idx`. Three changes:
   - Pass `idx` through: `topoRender(history[idx], idx)` (or pass the whole snapshot which now carries `.step`).
   - Update `topoRender` signature: `function topoRender(optOverrideSnap?: any, optReplayStep?: number)`. The 2D path is in `js/99b-renderer-topo-2d.ts:172`.
   - Forward to Three: `_topoRenderThree(sim, wall, optOverrideSnap, optReplayStep)`. Inside `_topoRenderThree` pass `replayStep` to `_topoSyncCrystalMeshes`.
   - Update `_topoSnapshotWall()` to consume the new schema shape (`snap.rings[r][i]`) instead of the flat array.

4. **SIM_VERSION bump + baseline regen.** Schema change is baseline-busting (snapshot serialization differs). Bump `SIM_VERSION` 64 → 65 in `js/15-version.ts` with a paragraph in the changelog explaining the multi-ring history schema. Regenerate `tests-js/baselines/seed42_v65.json` via `node tools/gen-js-baseline.mjs`. Old saved games carry the flat schema; add a migration shim in `loadGame()` (search for it; lives in `js/93-ui-collection.ts` or `js/97-ui-fortress.ts`) that wraps a flat snapshot:
   ```ts
   if (Array.isArray(snap)) {
     // legacy flat snapshot → wrap as single-ring multi-ring
     const wrapped = { step: -1, rings: new Array(ringCount).fill(null).map(() => snap) };
     return wrapped;
   }
   ```
   The `-1` step signals "unknown" so historical crystal-size lookup falls back to live size for legacy saves. Acceptable degradation.

**Verification path:**
- `npm run build && npm test` — typecheck + the calibration sweep should still pass after baseline regen.
- Browser preview: spin up `porphyry` for ~150 steps so dissolution + multiple nucleations happen, click replay. Visually verify: cavity expands during playback (ring[1..15] should also evolve, not just ring[0]); crystals appear in growth order (small → larger); dissolved crystals (if any) reappear before their dissolution step.
- The screenshot test: snapshot[0] cavity should be smooth & undeformed; snapshot[last] cavity should show whatever local dissolution happened. Different shape, not just different scale.

**Caveats deliberately left for follow-up (don't try to fix tonight unless the four parts above land cleanly):**
- Fluid-state history (pH/T/etc. trajectories) isn't in the snapshot. The fortress-status panel will keep showing live values during replay. Separate scope.
- Twin events / dissolution events that fire mid-life don't have step-stamps in `zones[]` necessarily — replay's crystal-size accumulation may overshoot real history slightly for twinned crystals. Acceptable approximation; flag if it visibly hurts.

### B. Engine calibration sweep (high priority, estimated 2–4 hours)

The 19 new engines from v64 are MVP — chemistry-faithful but uncalibrated. Each entry's `audit_status` field documents the broth gap that should let it fire; the v63 plumbing pass closed those gaps; v64 wired the engines. But nobody has eyeballed whether the per-scenario counts match the documented mineralogy.

Do this for each of the 9 scenarios that have new firings:

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

1. **Chromite is in the catalog but won't fire in any current scenario.** It's a magmatic >1000°C mineral — no scenario delivers that T. Logged in its `audit_status`. Listed for cataloging completeness; would need a `layered_mafic_intrusion` scenario to actually crystallize.

2. **The Au-Ag-Te trio is currently parked in `gem_pegmatite` + `porphyry` as scenario placeholders.** Both broths now carry Te + Au, but the chemistry niche is properly epithermal — see the new `epithermal_telluride` scenario. The placeholder scenarios will fire calaverite / sylvanite / hessite at low rates; that's geologically plausible (porphyries do carry trace tellurides at the upper levels) but feels off in `gem_pegmatite`. Leave the scenarios listing in the spec unless you want to remove pegmatite from those three minerals' `scenarios` array.

3. **`scheelite` and `wolframite` are classed `molybdate` despite being tungstates.** This matches the existing convention (raspite + stolzite + wulfenite are all classed molybdate). The class enum is misleadingly named but the file structure is consistent. Don't reclass without checking with the boss — class is what drives `js/3x-supersat-<class>.ts` file location.

4. **Three.js renderer Phase E1 only ships cavity wireframe + crystal meshes.** Phase E2 is forward-looking: better lighting (specular highlights on crystal faces), texture-painted habits (botryoidal / saddle-rhomb etc. via shaders), water-line / fluid-surface visualization as a translucent disc, fluorescence under simulated UV (post-process bloom on emissive materials). Not in scope of this campaign; flagged so an agent doesn't redo Phase E1.

> Note: the previous version of this section listed "vertically-uniform cavity during replay" and "crystals stay live during replay" as caveats. Those are NOT caveats — they are the placeholder state shipped in `12c329e`, scheduled for the four-part fix in section A. Promoted out of "intentional" because the boss explicitly wants them addressed (2026-05-08).

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

# Section A is tonight's target. Files to open first:
#   js/85c-simulator-state.ts:153-164  (snapshot writer — 1)
#   js/27-geometry-crystal.ts          (Crystal zones[] schema; maybe add dissolved_at_step — 2)
#   js/99i-renderer-three.ts:1312      (_topoSyncCrystalMeshes — 2)
#   js/99i-renderer-three.ts:1740      (_topoSnapshotWall — needs new schema — 3)
#   js/99i-renderer-three.ts:1773      (_topoRenderThree — accept replayStep — 3)
#   js/99b-renderer-topo-2d.ts:172     (topoRender — accept replayStep — 3)
#   js/99g-renderer-replay.ts:9        (topoReplay — pass step through — 3)
#   js/15-version.ts                   (SIM_VERSION 64 → 65 — 4)
#   tests-js/baselines/seed42_v64.json (regen as v65 — 4)

# After any source change:
npm run build
npm test                                                  # 65/65 should still pass

# After the schema change (section A part 4):
node tools/gen-js-baseline.mjs    # writes seed42_v65.json
git diff tests-js/baselines/seed42_v64.json tests-js/baselines/seed42_v65.json | head
# Drift expected: zero (snapshot serialization changes, but seed-42
# crystal-counts shouldn't shift because no engine reads history).
# If drift IS nonzero, something accidentally tied live state to history.

# Visual verification once parts 1-4 land:
python -m http.server 8000  # or open index.html via your usual preview path
# Spin up porphyry, advance ~150 steps, click replay.
# Check: cavity expands during playback; crystals appear in growth
# order; replay completes and snaps back to live cleanly.
```

The boss promotes from Syntaxswine → StonePhilosopher (canonical) — never push to canonical directly. `v-python-final` tag is on both remotes as the recovery point for the Python engine retirement (commit `2492eb5`).
