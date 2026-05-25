# HANDOFF: Path C session close — pre-compact

> **Authored:** 2026-05-11 by Claude (Sonnet 4.5) at session end, before context compaction.
> **Audience:** the next agent picking up this codebase (post-compact or in a fresh session).
> **Companion docs:** `HANDOFF-PATH-C-PER-VERTEX-CHEMISTRY.md` (campaign retrospective), `PROPOSAL-CAVITY-MESH.md` §13/§14 (tranche tracker + deferred-tranches disposition), `PROPOSAL-HABIT-BIAS.md` (closed campaign).

---

## 1. TL;DR for the next agent

A twelve-commit evening shipped two campaigns end-to-end and left the engine in its most science-grounded state yet:

- **Cavity-mesh Phase 4 (Path C — per-vertex chemistry)** landed. SIM_VERSION 68. Three tranches deferred per §14 of the proposal (snapshot schema flatten, per-vertex nucleation engines, 2D-strip renderer disposition).
- **Habit-bias campaign** fully closed. All five slices shipped — stalactite_demo renders gravity-aware cave-style cavities end-to-end.
- **122/122 tests green**, calibration baseline regenerated at v68, every commit pushed to `origin/main`.

Three living docs in `proposals/` are the load-bearing artifacts. Read those before touching the code.

---

## 2. Tonight's twelve commits

In order of landing:

| sha | proposal | tranche/slice | one-liner |
|-----|----------|---------------|-----------|
| `bada9a4` | cavity-mesh | Phase 1 | Crystal anchor abstraction (`wall_anchor`) |
| `3d32e09` | cavity-mesh | Phase 2 | `WallMesh` class — cavity geometry centralizes |
| `1f9bf99` | cavity-mesh | Phase 3 | Zone chemistry opt-in (floor / wall / ceiling) |
| `27b44af` | habit-bias | Slice 1 | Three.js gravity-aware c-axis for `growth_environment === 'air'` |
| `97dddf9` | habit-bias | Slices 2 + 5 | `air_mode_default` flag + `stalactite_demo` scenario |
| `4ba023b` | habit-bias | Slice 4 | `PRIM_DRIPSTONE` port (wireframe → Three.js) |
| `69191d7` | habit-bias | Slice 3 | Cluster satellite gravity propagation; closes habit-bias campaign |
| `93fcc2d` | cavity-mesh | Phase 4 T1 | `mesh.cells[]` container + growth swap reads cell.fluid |
| `8ef6a40` | cavity-mesh | Phase 4 T2 | Per-vertex Laplacian + propagateDelta (dedup byte-identical) |
| `7a5bb75` | cavity-mesh | Phase 4 T3 | `fluid_surface_height_mm` canonical name + back-compat alias |
| `3987a92` | cavity-mesh | Phase 4 T4a | **Per-vertex chemistry goes live (SIM_VERSION 67→68, baseline regenerated)** |
| `a30d032` | cavity-mesh | Phase 4 T4b | Crystal legacy fields dropped (Phase 1 deprecation closes) |
| `56dd5a3` | cavity-mesh | Phase 4 T4c | Unified storage + dead fallback removal + campaign closure doc |

Every commit message is a dense observational record (per the boss's `feedback_commit_messages_dense` preference) — read them in order to reconstruct the session's reasoning.

---

## 3. State of the code

### What's live

- **Engine model:** per-vertex cavity chemistry. Each cell on the cavity mesh (1920 cells on the default 16×120 lat-long tessellation) carries an independent `FluidChemistry` instance. Diffuses across mesh edges; events propagate through every cell; per-crystal growth swaps to the crystal's own cell.fluid.
- **Storage unification:** `wall.rings[r][c]` and `mesh.cells[r * N + c]` are the same `WallCell` objects. Either access pattern hits the same storage. Legacy ring-grid code keeps working; mesh-flat code is the canonical path going forward.
- **Renderers:** Three.js renderer (`99i`) is the default. Wireframe (`99d`) and canvas-vector 3D (`99e`) are the alt renderers. 2D-strip (`99b`) is the low-power fallback.
- **Habit-bias:** crystals nucleating in air-mode (`growth_environment === 'air'`) render with gravity-aware c-axis — ceiling cells hang as stalactites (with `PRIM_DRIPSTONE` tapered icicles), floor cells stand as stalagmites, wall cells project radially. Cluster satellites inherit the parent's gravity bias per-position.
- **Scenarios:** 23 in total. `stalactite_demo` is the showcase for the habit-bias work; other scenarios are unchanged in chemistry assemblage but shifted slightly in crystal counts due to the per-vertex chemistry shift (Tranche 4a regenerated the baseline).

### What's deferred (NOT done)

Three tranches on the cavity-mesh proposal are deferred. Each has a specific landing condition in `PROPOSAL-CAVITY-MESH.md` §14:

- **Tranche 5** — snapshot schema flatten (`rings: [r][c]` → `cells: [i]`). Defer until Phase 2.5 tessellations need it (current lat-long is faithful via shared refs).
- **Tranche 6** — per-vertex nucleation engines (Phase 3.5 proper). Defer until a zone scenario actually wants engines to weight nucleation by per-cell σ.
- **Tranche 7** — 2D-strip renderer disposition. Policy call (retire 99b or keep as fallback). Default: keep.

### Visual verification gap

I did NOT click through `stalactite_demo` in the browser this session. The tests prove the c-axis math is correct and that crystals route through the dripstone primitive (5 crystals over 100 steps at seed 42 — 4 of 4 air-mode confirmed, 3 of 4 routing through dripstone). The screenshot moment is unverified. **First thing the next agent or boss might want to do: load the scenario, switch to 3D, orbit, confirm the visuals match the test claims.**

---

## 4. Open chips that survived the session

- **Visual verification of stalactite_demo** — see §3 above.
- **Brief-19 Sections B/D/E/F/G** — chemistry-audit campaign mentioned in earlier handoffs. Sections C (MINERAL_DISSOLUTION_RATES growth-side) was addressed during v67 work. The remaining sections (engine calibration sweep, custom event handlers, activity-correction stoichiometry, cosmetic items) are still open. See `HANDOFF-BRIEF-19-AND-3D-DEFAULT.md` if it's still in `proposals/`.
- **Cavity-mesh Tranche 6** — per-vertex nucleation. Tagged as the next-zone-scenario unblocker.
- **Tutorial rework** — per the boss's stored memory, tutorials are slated for their own rework as a separate work package. The `stalactite_demo` scenario could fold in once the tutorial-rework lands.

No URGENT chips. The campaign closed cleanly.

---

## 5. Proposals directory (after tonight)

Read these in order if continuing:

| doc | status | what's in it |
|-----|--------|--------------|
| `PROPOSAL-CAVITY-MESH.md` | Active; Tranches 1-4c landed | §13 tranche tracker (rows for each tranche with commit SHA + byte-identical claim + notes); §14 deferred-tranches disposition with landing conditions |
| `PROPOSAL-HABIT-BIAS.md` | Closed | Five-slice campaign all green. §11/§12 observations + decisions. Cross-renderer drift between wireframe and Three.js fully resolved. |
| `HANDOFF-PATH-C-PER-VERTEX-CHEMISTRY.md` | Campaign retrospective | §3 authoritative-storage map; §4 what-the-next-agent-should-know; §7 seven observations worth carrying forward (math-equivalence as refactor anchor; RNG order fragility; SIM_VERSION bump discipline; etc.) |
| `HANDOFF-PATH-C-SESSION-CLOSE.md` | THIS DOC | Pre-compact session handoff |

Older living docs that are still relevant:
- `PROPOSAL-3D-SIMULATION.md` — Phase 1 + 3 + 5 implicitly delivered (multi-ring scaffolding, orientation habits, per-vertex chemistry); Phase 6 (density convection) remains a future proposal.
- `PROPOSAL-3D-TOPO-VUG.md` — Phase E (Three.js renderer) shipped earlier; Phase F (irregular cavity profile) shipped earlier.
- `PROPOSAL-HOST-ROCK.md` — Mechanic 5 (cavity archetypes) shipped earlier as Slice A + B.

---

## 6. What I'd recommend the next agent NOT do

- **Don't reach for `ring_fluids[r]`** when working on chemistry. It survives as a transitional storage layer (the equator alias to `conditions.fluid` is load-bearing for event propagation), but the per-vertex `cell.fluid` is the canonical model. A future tranche could collapse `ring_fluids[]` entirely if a use case appears.
- **Don't bump SIM_VERSION** for purely cosmetic schema changes. Save the bumps for genuine behavior shifts (like Tranche 4a). Tranche 5 (snapshot rename) deliberately doesn't bump.
- **Don't try to make stalactite_demo "rich"** by tweaking chemistry to produce more crystals before Tranche 6 lands. The 4-crystal seed-42 output is thin but the mechanic is proven; richer demos need per-vertex nucleation routing first.
- **Don't add new tranches to PROPOSAL-CAVITY-MESH §13** without a SHA-pinned ancestor in the table. Every tranche row has a `shipped commits` column; mid-tranche edits are how the living-doc pattern stays honest.

---

## 7. What I'd recommend the next agent DO

If continuing on this proposal:
- **Verify the visual** (stalactite_demo screenshot moment) before declaring habit-bias delivered to anyone external.
- **Consider Tranche 6 (per-vertex nucleation)** if the appetite for a zone-chemistry scenario shows up. The minimum-viable version is ~30 lines of new helper in `_assignWallCell` + a flag on VugWall.
- **Audit Three.js renderer perf** if scenarios scale up. The per-vertex `mesh.cells[]` storage adds memory but the Laplacian is O(N) per step; should be fine but never verified at scale.

If pivoting:
- **Brief-19 backfill** is the most explicit open chip from prior sessions.
- **A new mineral round** is always good content; refer to boss's stored memory for the pipeline (`project_vugg_future_mvt_scenarios` mentions Sweetwater + Elmwood as potential future scenarios).
- **Tutorial rework** is its own work package per the boss's stored memory.

---

## 8. Observations worth carrying forward

(Distinct from the campaign retrospective's seven observations — these are session-level.)

1. **Twelve commits, zero reverts, all green.** The living-doc proposal pattern carries state between tranches. Future multi-tranche campaigns should open with a §N tranche tracker block before any code lands.

2. **Math equivalence proofs let byte-identical refactors ship without fights.** Tranche 2's dedup-by-fluid-identity proof made un-aliasing in Tranche 4a a single-flag flip rather than a behavior-rewrite battle. When a refactor will eventually shift behavior, prove the byte-identical interim AND the math-changes-on-flag — the proof is the migration's safety rail.

3. **RNG order is fragile and worth annotating.** Tranche 4b near-missed a calibration shift from accidentally swapping `_assignWallCell` and `_assignWallRing`. Any RNG-touching refactor needs explicit order-preservation comments at the call site.

4. **Deferred tranches need a landing condition, not a TODO.** `§14 — Tranches 5/6/7 disposition` says explicitly when each deferred tranche should ship. "Defer" without a trigger condition is procrastination; "defer until X" is sequencing.

5. **Cross-renderer drift is silent and audit-worthy.** The wireframe renderer (99d) had air-mode gravity logic since v24; the Three.js renderer (99i) never picked it up until habit-bias Slice 1 this evening. The two are now in sync, but the drift had been live for ~6 months unnoticed.

6. **Auto-mode trust + dense commit messages + living-doc proposals are the recipe for this kind of session.** Without any of the three, the multi-tranche campaign couldn't have shipped in one evening.

7. **The boss's framing matters more than the technical scope.** "The sediment builds" + "foundation based on the science" + "you have the context and permission to make it happen" were the load-bearing inputs. Engineering decisions follow from framing decisions.

---

## 9. State of the auto-push workflow

Per the boss's stored memory:
- All twelve commits pushed to `origin/main` (Syntaxswine).
- The first auto-push attempt hit the "Pushing directly to main bypasses PR review" sandbox guard; the boss explicitly authorized ("pushing to main is how I review things") and subsequent pushes proceeded without prompt.
- Boss promotes Syntaxswine → StonePhilosopher when ready. None of tonight's work has been promoted yet.

---

## 10. Final state

- HEAD: `56dd5a3` (`Cavity-mesh Phase 4 Tranche 4c: unify mesh.cells with wall.rings; close Path C campaign`)
- SIM_VERSION: 68
- Tests: 122/122 green
- Calibration baseline: `tests-js/baselines/seed42_v68.json` (regenerated in commit `3987a92`)
- Pushed to: `origin/main` (Syntaxswine)
- Open campaigns: cavity-mesh (T5/6/7 deferred); narrative-tempo (Phase 5+ deferred from earlier session); Brief-19 backfill (deferred from earlier session)
- Closed campaigns this session: habit-bias (all five slices)

Good seat to compact from.
