# HANDOFF: Paragenesis campaign complete (Q1–Q5), what's pending

**Session ended:** 2026-05-06
**Author:** Claude (Opus 4.7)
**Status of campaign:** Q1 (substrate affinity) + Q2 (CDR routes) + Q3a (outline-inheritance render) + Q4 (perimorph cast render) + Q5 (snowball barite) all shipped & pushed to Syntaxswine `main`. Renderer-only Q3b (encrustation shell as separate mesh) remains optional. SIM_VERSION at v58.

---

## What landed (head→origin/main)

```
1abd8c9  Paragenesis Q5: snowball barite habit (v57->v58)
85bc30e  Renderer Q4: perimorph cast — dissolved CDR crystals persist as hollow shells
0a0e0a2  Renderer Q3a: outline-inheritance for CDR pseudomorphs
21ce36a  Paragenesis Q2a: pseudomorph routes table + Crystal CDR fields (v56->v57)
cf9eb88  Paragenesis Q1c: σ-discount wired into 4 nucleation engines (v55->v56)
094de21  Paragenesis Q1b: populate substrate-affinity table (v54->v55)
22c8e74  Paragenesis Q1a: substrate-affinity infrastructure (v53->v54)
```

Plus from earlier in the same session:
```
e6bb0a1  Renderer: cavity-as-natural-slice clip
8d6e84e  Renderer: per-crystal yaw around c-axis
81a7618  Renderer: isometric crystal habits use uniform scale (fluorite cube fix)
+ Phase 1e completion campaign (v45 -> v53, 14 commits)
```

The proposal at [proposals/PROPOSAL-PARAGENESIS-OVERGROWTH-CRUSTIFICATION-PSEUDOMORPHS.md](proposals/PROPOSAL-PARAGENESIS-OVERGROWTH-CRUSTIFICATION-PSEUDOMORPHS.md) has the full design + boss directives + science citations. Read it before continuing this work — it grounds every mechanic in Putnis 2002/2009 / Sangster 1983/1990 / Ramdohr 1980 / Heyl 1968 references.

---

## What's pending — by priority

### A. Visual verification (highest priority, low effort)

I never got to eyeball the paragenesis features in a browser. Math is right, unit tests pass, baselines are consistent, but nobody has SEEN:

- A malachite-after-azurite crystal in bisbee with the azurite cube outline filled in malachite green (Q3a)
- A perimorph cast — a translucent shell of malachite-after-azurite where the malachite later dissolved (Q4)
- A snowball barite as a sphere on a sphalerite seed in mvt (Q5)
- A smithsonite-after-sphalerite with the sphalerite tetrahedron outline in supergene_oxidation

**Action**: load each scenario in the preview server, navigate to 3D view, screenshot. If anything looks geologically wrong, file a bug. The sim has 12+ new visual textures that nobody on the project has confirmed land correctly.

### B. Sim-level cavity-bound cap (real bug, medium effort)

Filed at [proposals/BUG-CRYSTALS-CLIP-VUG-WALL.md](proposals/BUG-CRYSTALS-CLIP-VUG-WALL.md). The renderer cavity-clip (`e6bb0a1`) masks the symptom but the underlying chemistry still allows individual crystals to grow past the cavity wall. `feldspar #7` from the bug report at 91.2% of vug volume is the canonical case.

**Action**: tier-2 fix from the bug report — add per-crystal cap in `_update_dimensions` (or in the engine growth check) that halts zone push when `c_length_mm` or `a_width_mm × 0.5` would exceed `vug_diameter / 2`. SIM_VERSION bump expected; calibration drift will need a sweep.

### C. Q3b — encrustation shell as separate translucent mesh (optional)

The proposal Q3 had two sub-parts. Q3a (outline inheritance) is done. Q3b (encrustation shell as a separate mesh wrapping the host) wasn't shipped — the user paused before authorizing it.

**Action**: when a crystal is a thin encrusting shell (habit like `botryoidal_crust`, `enamel_on_cuprite`, `pseudomorph_after_azurite`), render the host as core + the encrustation as a slightly-larger shell mesh with partial transparency. Fold into the existing `_topoSyncCrystalMeshes` path.

### D. Calibration tuning (after browser verification)

The Q1c discounts are uniform 0.5× / 0.7× per the boss directive ("don't overthink, tune from scenario results"). The drift table from `cf9eb88` and `1abd8c9` shows shifts in 6–7 scenarios per commit. If browser verification shows any scenario drifted into "wrong" territory (e.g. mvt has 12× barite when type specimens have ~3-4 snowballs), tune individual pair discounts in `js/26-mineral-paragenesis.ts` `SUBSTRATE_NUCLEATION_DISCOUNT`.

### E. Other queued work (separate from paragenesis)

- **Phase 4c**: flag flip + EH_DAMPING tuning. Handoff at `HANDOFF-PHASE-4C-FLAG-FLIP.md`.
- **Phase 4d**: pH dynamics infrastructure.
- **Phase 3 follow-up**: per-mineral carbonate equilibrium retuning.
- **Tutorial rework**: pending its own work package.
- **3D Vugg Phase A**: multi-ring scaffolding from the approved plan at `i-have-a-much-soft-stonebraker.md`.

---

## How to read the new state of the codebase

If you're new to this work, the relevant files are:

| File | What it carries |
|---|---|
| `js/26-mineral-paragenesis.ts` | NEW. SUBSTRATE_NUCLEATION_DISCOUNT (~50 pairs), EPITAXY_PAIRS (6 strict — currently unused, awaiting renderer), PSEUDOMORPH_ROUTES (18 CDR routes). Helpers: parsePositionHost, paragenesisDiscount, findPseudomorphRoute, pickSubstrateForMineral. |
| `js/27-geometry-crystal.ts` | Crystal class. Q2a fields: `cdr_replaces_crystal_id`, `perimorph_eligible`. Q5 dispatch: `habit === 'snowball'` → `a_width_mm = c_length_mm` (uniform). |
| `js/85b-simulator-nucleate.ts` | sim methods. New: `_pickSubstrate`, `_sigmaDiscountForPosition`. CDR tagging happens in `nucleate()` post-twin-roll. |
| `js/82-nucleation-carbonate.ts` | Q1c migration: smithsonite, malachite, azurite use `_sigmaDiscountForPosition`. |
| `js/89-nucleation-silicate.ts` | Q1c migration: chrysocolla. |
| `js/90-nucleation-sulfate.ts` | Q5 snowball: `_nuc_barite` picks sulfide hosts + tags `habit:'snowball'`. |
| `js/60-engines-sulfate.ts` | Q5 engine: `grow_barite` preserves `'snowball'` habit. |
| `js/99i-renderer-three.ts` | Q3a outline inheritance, Q4 perimorph cast translucent material, Q5 SphereGeometry primitive. |

---

## Memories saved this session

- `feedback_anticipatory_proposals.md` — when I research+propose on a topic the boss is already chewing on, they value the synthesis; do real homework with citations.
- `project_vugg_future_mvt_scenarios.md` — Sweetwater + Elmwood are planned future MVT scenarios; paragenesis features may have scenario-specific tunings when they land.

Plus pre-existing memories that informed this session: anticipatory curiosity, commit-messages-as-field-notes, keep-going-through-coupled-phases, diagenesis credit, auto-push.

---

## Known unknowns

1. **Snowball barite count in mvt is ~doubled (6→12).** That feels right qualitatively (snowball seeds should be common in MVT) but I haven't seen a Tri-State / Sweetwater type-specimen photo to calibrate against. May need tuning.

2. **Q4 perimorph mechanic untested in any seed-42 scenario** — none of the existing scenarios produce a CDR crystal that LATER dissolves. The mechanic fires correctly per unit tests, but no scenario exercises the full A→B→B-dissolves chain end-to-end.

3. **EPITAXY_PAIRS is scaffolded but unused.** Six pairs documented (sphalerite/marcasite/pyrite triangle). Will become useful once the renderer supports parent-relative orientation — currently a v1 deferral per boss directive.

4. **Sim-level cavity cap not done.** The renderer-clip is a band-aid; chemistry still produces oversized crystals.

---

*If you're picking this up cold — read the proposal first, then this handoff, then run the preview server and look at bisbee + mvt + supergene_oxidation in 3D. The most useful thing you can do next is verify visually that what shipped looks right.*

🪨
