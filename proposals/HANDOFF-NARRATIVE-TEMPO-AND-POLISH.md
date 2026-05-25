# HANDOFF: Narrative-Tempo Campaign + Polish (May 2026 session)

> **Session:** 2026-05-09 → 2026-05-11
> **Author:** Claude (Sonnet 4.5)
> **Status:** v67 baseline live; three living documents updated; pushed to Syntaxswine `main` (boss promotes to StonePhilosopher canonical). All tests green (65/65). Three open chips registered.

## TL;DR for the next agent

The session built the narrative-tempo grammar across all three live-play modes (Simulation, Quick Play, Fortress), shipped the replay-in-3D fixes from the prior brief, and authored a forward-looking ring-retirement proposal. The cavity now grows at the speed the text scrolls — at 2 seconds per step by default, 1 second on "fast", 0.2 seconds on "quick". Reading and watching are the same activity.

**To find work:** check the three living documents below (their §1 phase trackers are the truth). For tonight-style quick wins, check the "Open chips" section. For deeper work, the cavity-mesh proposal is the next architectural beat.

---

## 1. What shipped — by thread

### Narrative-Tempo Campaign (7 phases, 13 commits)

The dominant thread. Took the Simulation/Quick Play/Fortress modes from "burst the result text in / cavity sits frozen" to "text and cavity move together at the boss-specified per-step tempo, with reverse-flow layout and a floating speed cluster."

| phase | what                                                | commit     |
|-------|-----------------------------------------------------|------------|
| 1     | Simulation cavity tracks log scroll (step-headers)  | `fad78f2`  |
| 1.5   | Click-to-continue pills at prologue + epilogue      | `19e5064`  |
| 2     | Quick Play (random) mode same pattern               | `a5a0e41`  |
| 2.5   | Reverse-flow layout + speed coupling + cluster UI   | `414a3e8`  |
| 3     | Fortress action results play at narrative tempo     | `6398bdd`  |
| 3.5   | Per-step pacing: 2s default / 1s fast / 0.2s quick  | `6110d6d`  |
| 4     | Shared engine: `_fortressPaceLines` delegates       | `9f1e6cd`  |

See `proposals/PROPOSAL-NARRATIVE-TEMPO.md` §1 phase tracker for full detail.

### Replay-in-3D + chemistry follow-ons

Closure of `proposals/HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` Section A and an opportunistic v67.

| commit    | what                                                                |
|-----------|---------------------------------------------------------------------|
| `c781893` | v65 multi-ring snapshots + historical c_length lookup               |
| `c8ae42b` | v66 conditions trajectory + paramorph rewind + step overlay         |
| `26b19cd` | Snapshot decimation: ~100 snapshots cap regardless of run length    |
| `7b03623` | v67 mass-balance back-fill: 6 warned + 8 hygiene MINERAL_STOICHIOMETRY entries |

### Polish + bugfixes (cross-cutting)

| commit    | what                                                                     |
|-----------|--------------------------------------------------------------------------|
| `1c08f08` | Keyboard shortcuts (←/→/Space/Esc) wired to match replay-bar title hints |
| `e9f755a` | Replay auto-PAUSE at last frame (was auto-stop)                          |
| `58b31b4` | Overlay state-glyph (▶/⏸/⏹) + fixed denominator (was step/array vs step/sim-step) |
| `38297e0` | Stop clears overlay textContent (defensive)                              |
| `ca5d1c1` | Home screen resets the map: removed topoActiveSim cross-mode fallback    |

### Cavity-mesh architecture proposal

| commit    | what                                                          |
|-----------|---------------------------------------------------------------|
| `e3d2127` | Authored `proposals/PROPOSAL-CAVITY-MESH.md` — four-phase plan |

Living document for the eventual ring-retirement migration. **Not started building.** Phase 1 has a chip registered.

---

## 2. Three living documents — current status

### `proposals/PROPOSAL-NARRATIVE-TEMPO.md`
- §1 phase tracker: Phases 1–4 landed; Phase 5+ (replay timer unification) **deferred until use demands**
- §8 observations log: design rationale for per-step pacing, reverse-flow via column-reverse (not insertBefore), body-fixed speed cluster placement, `running` as shared cross-mode lock, deferring replay unification
- §9 decisions log: phased-not-flag-day approach, click handler placement
- **Next pickup if anyone wants it:** Phase 5+ (unify replay's snapshot-iteration timer with the live-play line-iteration engine). Not needed for current UX.

### `proposals/PROPOSAL-CAVITY-MESH.md`
- §1 phase tracker: All four phases unstarted
- §8 observations: layout map of ring-bound code, what's actually grid-vs-orientation
- §9 decisions: phased migration, crystal anchor as `(phi, theta)` not vertex index
- **Next pickup:** Phase 1 (anchor decouple). Chip already registered — see "Open chips" below.

### `proposals/HANDOFF-BRIEF-19-AND-3D-DEFAULT.md`
- Section A (Replay-in-3D): **DONE** — `c781893`, `c8ae42b`, `26b19cd`, `7b03623`
- Section B (engine calibration sweep for the 19 brief minerals): **STILL OPEN**
- Section C (MINERAL_DISSOLUTION_RATES backfill): **PARTIALLY ADDRESSED** by v67's growth-side stoichiometry; dissolution-side still open
- Sections D-H: still open as written

---

## 3. Open chips (spawnable from the harness)

| chip title                          | spawned in commit-era | status | purpose |
|-------------------------------------|-----------------------|--------|---------|
| Cavity-mesh Phase 1: anchor decouple | post-`e3d2127`        | active | Execute Phase 1 of cavity-mesh proposal. ~100-line refactor; byte-identical baseline expected; brief self-contained. |
| Replay scrub bar + pause UX          | post-`fad78f2`        | **stale** — already shipped in `5aa278b` before chip was registered. Dismiss it. |

The cavity-mesh chip is the live one. Self-contained brief inside the chip pointing at `proposals/PROPOSAL-CAVITY-MESH.md` §5.

---

## 4. What's deliberately left open (intentional, not bugs)

1. **Phase 5+ narrative-tempo (replay timer unification)** — `proposals/PROPOSAL-NARRATIVE-TEMPO.md` documents why this was intentionally deferred. Replay iterates snapshots not lines; vocabulary expansion uncertain payoff.

2. **Cavity-mesh Phase 1-4 implementation** — boss directive: each phase its own session, broth-philosophy. The author of the proposal should not be its consumer.

3. **Brief-19 Section B engine calibration sweep** — ~2-4 hours of per-scenario judgment work; punted to future agent with appetite.

4. **Brief-19 Sections D-G** — Custom event handlers / activity-correction stoichiometry / narrate_function cosmetic / class-color cosmetic. All low priority.

5. **Brief-19 Section C (dissolution-side mass balance)** — partially addressed; the growth-side is in v67. The 14 minerals whose `acid_dissolution.products` should credit fluid still need `MINERAL_DISSOLUTION_RATES` entries.

6. **Chromite in catalog but won't fire** — documented in HANDOFF-BRIEF-19. Magmatic mineral; no scenario delivers >1000°C T. Would need a `layered_mafic_intrusion` scenario.

---

## 5. State of the running code

```
SIM_VERSION         = 67
Build               = npm run build  (tsc + tools/build.mjs concatenates 111 modules into index.html)
Tests               = npm test       (vitest, 65/65 green)
Baseline            = tests-js/baselines/seed42_v67.json
Tip on Syntaxswine  = (most recent commit at session end)
Boss promotion path = Syntaxswine main → StonePhilosopher main (canonical, never push directly)
v-python-final tag  = preserved on both remotes (commit a4d50b2)
```

**Test gotcha:** `setSeed` is a test-only helper that doesn't exist in the browser bundle. For browser/preview testing, the seeding pattern is `rng = new SeededRandom(seed)` directly. See `tests-js/setup.ts:284` for the epilogue that installs `setSeed` in test scope.

**`running` flag:** `let running` declared in `js/91-ui-legends.ts` is the shared cross-mode lock used by all three narrative-tempo timers AND consulted by the replay-shortcut keydown listener in `js/99g-renderer-replay.ts` to bail when narrative tempo is in flight. Future agents adding new tempo-aware modes should consult this same flag.

**`_topoPlaybackSpeed` global:** single source of truth for tempo speed. Speed cluster (3 buttons in narrative tempo) and replay bar (4 buttons) both write to it. Interpreted differently per consumer — narrative tempo uses `stepDurationMs = 2000 / speed`; replay timer uses `frameMs / speed`.

---

## 6. File map (where things live)

### Narrative-tempo engine
- `js/91-ui-legends.ts` — `displayLines()` is now the shared engine. Takes options for `clearOutput`, `appendLine`, `onStart`. Also hosts `_showNarrativeSpeedCluster` / `_hideNarrativeSpeedCluster` and the click-to-continue pill renderer.
- `js/96-ui-random.ts` — `runRandomVugg()` calls `displayLines` with `out` element + `onDone: renderRandomInventory`.
- `js/97-ui-fortress.ts` — `_fortressPaceLines()` is now a 30-line wrapper that calls `displayLines` with custom appendLine + action-grid lock callbacks.

### Replay machinery (separate from narrative tempo)
- `js/99g-renderer-replay.ts` — `topoReplay()`, `_topoReplayStartTimer()`, scrub bar handlers, frame-step, play/pause, keyboard shortcuts.
- `js/85c-simulator-state.ts:_repaintWallState` — snapshot writer (multi-ring schema, decimation via `_replayStride`).
- `js/99i-renderer-three.ts` — Three.js renderer; consumes `optOverrideSnap` for replay frames.

### Ring-vs-mesh code (target of future Phase 1 refactor)
- `js/22-geometry-wall.ts` — WallState class with 16×120 ring grid, archetypes, polar/twist profiles
- `js/27-geometry-crystal.ts` — Crystal class with `wall_ring_index` + `wall_center_cell` (the legacy anchor that Phase 1 will phase out)
- `js/99i-renderer-three.ts` — reads per-cell `base_radius_mm` from `wall.rings[r][c]` to build the cavity mesh
- All ~22 read sites of `wall_ring_index` / `wall_center_cell` are listed in `PROPOSAL-CAVITY-MESH.md` §3.3

### Mass-balance (v67 addition)
- `js/19-mineral-stoichiometry.ts` — `MINERAL_STOICHIOMETRY` table; v67 added 14 entries (6 warned + 8 hygiene). Section "C" in the brief.

### Test harness
- `tests-js/calibration.test.ts` — per-scenario seed-42 sweep
- `tests-js/baselines/seed42_v67.json` — current baseline
- `tools/gen-js-baseline.mjs` — regenerator (writes `seed42_v<SIM_VERSION>.json`)

---

## 7. Quick-start for the next agent

```bash
# Pull state
git fetch origin
git checkout main
git pull --ff-only origin main

# Verify build is clean
npm run build && npm test
# Expect: tsc clean, 65/65 tests green, v67 baseline matched

# To work on cavity-mesh Phase 1 — read these first:
#   proposals/PROPOSAL-CAVITY-MESH.md  (especially §5 Phase 1)
#   proposals/HANDOFF-NARRATIVE-TEMPO-AND-POLISH.md  (this doc)

# To play with the running app:
#   python -m http.server 8000  (or open index.html via your preview path)
#   click Quick Play → 🎲 Generate Vugg → watch the cavity grow with the narrator
#   click ½× / 1× / 2× / 4× via the floating speed cluster (top-right)
#   in Creative Mode, click ⏩ Advance 10 to see Fortress's paced action results

# To regen baseline after a SIM_VERSION bump:
node tools/gen-js-baseline.mjs    # writes seed42_v<N>.json
```

---

## 8. Observations worth carrying forward

These are things I noticed during the session that didn't fit anywhere else, parked here for the next agent.

- **The compounding pattern continues to pay off.** Most session-wins fell out cleanly because prior infrastructure made them cheap. v66 conditions snapshot enabled Phase 1's cavity-tracks-log. The `running` flag from Phase 1 enabled the replay-keydown gate in Phase 1.5. Phase 4's engine unification dropped fortress from ~90 lines to ~30 because Phases 1-3 had already converged on the same per-step formula. Keep building this way.

- **The proposal pattern is high-leverage.** PROPOSAL-CAVITY-MESH.md and PROPOSAL-NARRATIVE-TEMPO.md both have phase trackers in §1, observations logs in §8, decision logs in §9. Future agents append rather than rewrite. The boss explicitly called out "context is your broth" — these documents are the broth.

- **Defer to actual geology in chemistry calls.** When v67 added mass-balance entries, the drift in 6 scenarios (turquoise shrinking, powellite shrinking, supergene_oxidation losing 2 minor minerals) was the correct outcome — those minerals were getting a free lunch before. Boss-feedback memory entry "defer to geology" guided the decision to ship the drift rather than tuning around it.

- **Test methodology gotchas surfaced during verification:**
  - `running = false` in eval scope only resets the JS lock; in-flight setTimeout chains keep ticking. Use `location.reload()` between tests if state matters.
  - Polling for pills via `waitFor(predicate)` is more reliable than fixed `setTimeout` waits — narrative tempo timing varies with line count.
  - Fortress mode UI doesn't fully mount from a bare eval (needs walking through New Game → Creative Mode → setup). State machine verification is fine; visual screenshots may need a manual setup pass.

- **The replay-shortcut keydown listener at `js/99g-renderer-replay.ts` has FIVE bail conditions:** typing target, modifier key, no `_topoReplayActiveSnap`, topo panel hidden, `running` flag. The fifth one was added in Phase 1.5 to prevent Space from triggering replay during narrative tempo. If a future change introduces a SIXTH consumer of keyboard shortcuts, document the bail condition here too — the stack is getting tall.

- **The narrative-speed-cluster lives at body level** (position:fixed, top-right). If a future mode adds a new tempo path, mounting more clusters would clutter; consider promoting the cluster to a single always-visible topo-panel-embedded control instead.

- **`_topoReplayActiveSnap` is consulted by both the fortress-status panel** (for replay-aware σ-pill / T / pH display) and **the replay-shortcut keydown listener** (as "are we in some replay-like state"). Phase 1 set it during initial play too, which extended its meaning slightly — it now means "topo is showing a snapshot, not live." Future agents touching this global should be aware it spans both replay and live-play.

---

## 9. Final note

This session sequenced well. The original boss directive — *"the vugg should grow at the speed that the text scrolls"* — became the per-step pacing model, which became the reverse-flow layout grammar, which became Fortress action playback, which dedupe-collapsed into a shared engine. Each step buildable in isolation, each previous step enabling the next. The `proposals/PROPOSAL-NARRATIVE-TEMPO.md` and `proposals/PROPOSAL-CAVITY-MESH.md` living documents are the broth — future agents reading them cold should have what they need.

Good luck. Push to Syntaxswine, never to StonePhilosopher. The boss promotes.
