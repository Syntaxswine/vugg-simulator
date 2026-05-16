# HANDOFF: Tier 1 sweep + Tranche 6 + Tier 2 F + coverage investigation

> **Authored:** 2026-05-16, by Claude (Sonnet 4.5)
> **State:** HEAD = `74aa311` on `origin/main` (Syntaxswine). SIM_VERSION still 69. 177/177 tests green.
> **Audience:** next agent (post-compact or fresh session) AND the boss skimming options.

Successor to `HANDOFF-SIMULATION-UX-AND-BACKLOG.md` (commit `5a52476`). That doc enumerated 10 backlog items A-J. Items A, B, C, F, G are done; D still needs a foreground browser; E, H, I, J are still open.

---

## 1. TL;DR

Ten commits since the previous handoff. Two coherent arcs:

**Arc 1 — Tier 1 polish + per-vertex nucleation unlock:**

| sha | description | tests |
|-----|-------------|-------|
| `8e92d1a` | Tier 1 C — cavity render toggle (`sharp` vs `smooth`) | 140 → 147 |
| `88fb4db` | Tier 1 B — `runSimulation` async-load guard | 147 |
| `5622275` | Tier 1 A — 5 evaporite narrators (halite, mirabilite, thenardite, borax, tincalconite) | 147 → 167 |
| `0cfe18f` | Tier 2 G — per-vertex nucleation + `zoned_dripstone_cave` demo scenario | 167 → 177 |
| `a12774a` | Air-mode nucleation rate-limit + stalactite_demo Tranche 6 unlock | 177 |

**Arc 2 — Tier 2 F twin retune + coverage investigation:**

| sha | description | tests |
|-----|-------------|-------|
| `ba7c648` | Tier 2 F — twin probability retune + `tools/twin_rate_check.mjs` (4 minerals retuned) | 177 |
| `8173aed` | `tools/mineral_coverage_check.mjs` — find stale + dead minerals | 177 |
| `92b9f37` | Telluride engines rescaled to Cripple Creek natural range (calaverite/sylvanite/hessite) | 177 |
| `74aa311` | **Vadose oxidation bug fix** — `ring_fluids[r]` skipped on mesh path | 177 |

The bigger story from arc 2 is the *tool chain*. `tools/twin_rate_check.mjs` + `tools/mineral_coverage_check.mjs` are sister tools that observe the sim from outside, surface calibration drift + coverage gaps, and produced 3 of the 4 commits in arc 2 directly from their findings. Both follow the build-tools-to-test pattern (memory: `feedback_build_tools_to_test`).

---

## 2. Tool chain inventory

Three tools now exist for sim observation:

| tool | signal | runtime |
|------|--------|---------|
| `tools/gen-js-baseline.mjs` | per-scenario crystal counts + sizes at seed 42 | ~30s |
| `tools/twin_rate_check.mjs` | observed twin frequency per mineral vs authored per-roll probability | ~15s (10 seeds × 24 scenarios) |
| `tools/mineral_coverage_check.mjs` | live / stale / dead minerals across the sweep | ~10s |

All three share the same harness (jsdom + bundle eval + fetch mock + DOM stub). All three read authored data directly from `data/minerals.json` (or scenarios.json5) rather than the bundle's `MINERAL_SPEC` global, because the async fetch isn't ready by the time the IIFE returns.

**Why this matters for the next agent:** any time you change engine semantics or mineral data, run all three tools. Twin-rate-check pins per-roll calibration; coverage-check pins the live/stale/dead classification. Together they prevent silent regressions that wouldn't show up in unit tests.

---

## 3. What the night's commits actually shipped

### Arc 1: Per-vertex nucleation + air-mode unlock

**Tranche 6 (`0cfe18f`)** added an opt-in `wall.per_vertex_nucleation` flag. When set, `_assignWallCell` computes per-cell σ for the firing mineral across every (ring, cell) pair and joint-samples the anchor weighted by `(σ-1)²`. The `zoned_dripstone_cave` demo scenario showcases it: aragonite ceiling-only (Mg-rich), calcite floor + wall (Ca-rich), no overlap in the σ landscapes.

**Air-mode nucleation rate-limit (`a12774a`)** dropped the strict `!existing_<mineral>.length` serial gate in air-mode scenarios. Replaced with a 6%/step Bernoulli roll, bounded by `_atNucleationCap`. Before: 1 calcite per stalactite_demo run, on a wall ring. After: 4 calcites + 1 quartz distributed across floor/ceiling speleothem zones. The c-axis world-down/up gravity bias from PROPOSAL-HABIT-BIAS Slice 1 finally has multiple crystals to render.

**Stalactite_demo (`a12774a`) flipped from OPT-OUT to OPT-IN.** A v69 test guard explicitly pinned the absence of zone_chemistry — comment said "future agents don't re-add zone_chemistry without first solving the nucleation-engine plumbing." Tranche 6 + air-mode rate-limit solved exactly that plumbing. The test guard now pins the opt-in (zone_chemistry + per_vertex_nucleation + diffusion=0). The codebase remembers the lesson.

### Arc 2: Calibration + coverage investigation

**Twin retune (`ba7c648`)** bumped 4 minerals' per-roll twin probabilities to match observed-rate-equals-authored intent under the post-Apr-2026 single-roll model. Sphalerite spinel_law 0.015→0.08, siderite polysynthetic 0.02→0.05, selenite swallowtail 0.08→0.18, wurtzite basal_contact 0.008→0.05. Each retune carries an `_retune_note` field in the JSON with the rationale.

**Telluride retune (`92b9f37`)** dropped reference values in calaverite/sylvanite/hessite σ formulas from "well-saturated brine" anchors to Cripple Creek fluid inclusion data (Saunders 2008: Au 0.4-2 ppm, Te 1-30 ppm). The 3 of 4 stale entries in epithermal_telluride's expects_species cleared. native_tellurium is still stale but cascade-dependent (needs hessite to consume Ag below the gate of 5 ppm).

**Vadose bug fix (`74aa311`)** is the deepest finding. When Tranche 4a un-aliased per-cell from per-ring storage, the vadose oxidation override's ring_fluids[r] update fell into an `else` branch that never executes in production (mesh exists in the simulator constructor). Effect: per-cell fluids got `concentration *= 3` boosts; conditions.fluid (= ring_fluids[equator]) stayed at 1.0 forever; engines reading bulk fluid via the equator alias never saw vadose transitions. Fix: update both, not one OR the other.

Bisbee now produces halite/hematite/mimetite/scorodite/sylvite (supergene oxidation pathways were silently blocked). Ultramafic_supergene gains goethite. Searles_lake clears thenardite + tincalconite (was 4 stale, now 2).

---

## 4. The remaining stale list (post-74aa311)

| mineral | scenario | likely root cause |
|---------|----------|-------------------|
| adamite | supergene_oxidation | Cu-Zn arsenate; chemistry gates might want Zn > X or pH band tightened |
| borax | searles_lake | halite fills cavity > 95% before borax's rare-event 12% gate fires (see §5) |
| chrysoprase | ultramafic_supergene | likely Ni-Mg-Si chemistry interaction; needs probe |
| mirabilite | searles_lake | same as borax — late-stage low-T evaporite locked out by halite fill |
| native_tellurium | epithermal_telluride | cascade-dependent: needs hessite consumption to drop Ag<5 within run duration |
| ruby | marble_contact_metamorphism | likely Al-Cr gate; needs probe |

Two clusters:
- **searles_lake (borax, mirabilite)** — needs per-vertex gating in nucleation engines (Tranche 7+) OR a vugFill threshold raise. See §5.
- **everything else** — each needs its own scenario+engine probe to diagnose.

---

## 5. The vugFill cap discovery (Tranche 7 candidate)

The deepest finding the coverage tool surfaced, not yet acted on:

`check_nucleation` is globally gated on `vugFill < 0.95`. When the cavity is 95% full by crystal volume, ALL engines stop firing — including late-evaporite engines that should nucleate in interstices or as efflorescent crusts on top of existing halite.

For searles_lake: halite grows to 6cm hopper cubes within ~48 steps, putting vugFill > 0.95. After that, `check_nucleation` short-circuits. Borax/mirabilite have only ~18 step-windows where their gate is active.

The geologically right fix: **interstitial / efflorescent minerals should be able to nucleate even at high fill**, because they don't displace existing crystals — they grow in pore space or as coatings. Real caves have late borax / mirabilite / sylvite growing on top of halite crusts that have been there for centuries.

Two possible architectures:
- **Per-mineral fill-exemption flag** in MINERAL_SPEC (`fill_exempt: true` for efflorescent crusts). `check_nucleation` skips the global gate for these minerals.
- **Per-mineral fill-threshold** (`fill_threshold: 0.99` for evaporite crusts vs 0.95 default).

Either solution unlocks searles_lake's full evaporite cascade. Both are scoped sweeps — small data edit, single-line code change in `check_nucleation`.

**Why I didn't do it tonight:** the fix changes nucleation semantics for every mineral that doesn't get the exemption — that's a calibration question I'd want to scope deliberately rather than slip in. Worth a focused commit with explicit per-mineral classification.

---

## 6. Open backlog

### Tier 1 D (still open — needs foreground browser)
- stalactite_demo visual verification. Now with 4 calcites distributed across speleothem zones, this should look like an actual cave. Worth a screenshot + orbit check.

### Tier 2 E (still open)
- `MINERAL_DISSOLUTION_RATES` back-fill. ~3 hours, SIM_VERSION 69→70, baseline regen. Centralize the ~120 hand-coded dissolution rates from ~10 engine files into a parallel table like `MINERAL_STOICHIOMETRY`.

### Tier 3 H — Geological-accuracy Phase 3 (still open)
- CO₂ degassing + travertine. ~2 days. Couples with PROPOSAL-VOLATILE-GASES Mechanic 2. New `co2_degas` event type + travertine tutorial scenario. Real geological mechanic that's been on the wish list forever.

### Tier 3 I — Non-lat-long tessellation (still open)
- Icosphere or geodesic mesh. ~2 days. Unblocks Tranche 5 (snapshot schema flatten) and gives uniform cell sizes (no polar pinch, no theta=0 seam).

### Tier 3 J — Brief-19 calibration sweep (still open)
- Per-mineral engine threshold + nucleation σ verification against literature. ~1 day research. The twin retune + telluride retune from tonight prove this kind of work yields concrete fixes.

### New backlog from tonight's investigation

#### K. vugFill cap exemption for efflorescent minerals
**Effort:** ~2 hours. Unblocks searles_lake's borax + mirabilite cascade. See §5.

#### L. Cascade-dependent stale: native_tellurium needs Ag<5 to fire
**Effort:** ~30 min. Either bump hessite's mass-balance Ag consumption (engine-level), extend epithermal_telluride's `duration_steps` 180→250, OR loosen native_tellurium's Ag gate from 5 to e.g. 8. Geologically: Cripple Creek native_tellurium IS rare; the current cascade gate isn't unreasonable, just hard to clear in 180 steps.

#### M. Singleton stales — chrysoprase, ruby, adamite
**Effort:** ~3 hours total. Each needs a sigma probe + chemistry trace + targeted retune. Same shape as the telluride retune.

#### N. Carbonate-rhombohedral generalization of polysynthetic twin retune
**Effort:** ~30 min + baseline regen. The Tier 2 F retune bumped siderite polysynthetic 0.02→0.05 but left dolomite + rhodochrosite at 0.02 (siblings with same twin law, same physics). They produce observed twins at the current authored value already, so the retune was surgical. But the geological argument for 5% applies equally; bumping for consistency is defensible.

---

## 7. State files for the next agent

| file | purpose |
|------|---------|
| `tools/twin_rate_check.mjs` | per-mineral twin observation, flag retune candidates |
| `tools/mineral_coverage_check.mjs` | live / stale / dead classification |
| `tools/gen-js-baseline.mjs` | regen calibration baseline after engine changes |
| `proposals/HANDOFF-SIMULATION-UX-AND-BACKLOG.md` | previous handoff; items A-J taxonomy still valid |
| `proposals/PROPOSAL-CAVITY-MESH.md` | §13 (tranche tracker), §14 (deferred 7+) |
| `data/minerals.json` | spec data with `_retune_note` audit trail on bumped values |
| `data/scenarios.json5` | scenarios with `expects_species` (read by coverage tool) |
| `js/README.md` | "where does X live" map |

---

## 8. Verification harness

- `npm run ci` → typecheck + build:check + 177/177 tests
- `npm test` → vitest only
- `node tools/gen-js-baseline.mjs` → regen calibration baseline at current SIM_VERSION
- `node tools/twin_rate_check.mjs` → twin frequency report
- `node tools/mineral_coverage_check.mjs` → live/stale/dead report

---

## 9. Closing notes

The Arc 2 thread — coverage tool → telluride retune → vadose bug fix — is the clearest example yet of the build-tools-to-test pattern paying off mid-session. Each commit was directly informed by the previous tool's output. Without the coverage tool, the vadose bug would have remained invisible (it doesn't break any test; it just silently zeros out a class of evaporite nucleations).

The lesson worth carrying: when you find one bug in a calibration system, run the broader tool to find the others. Calibration bugs cluster — they share infrastructure, and infrastructure bugs propagate to everything downstream. The Tranche 4a un-aliasing left this single ELSE branch that broke the bulk-fluid view in every scenario; it took until tonight for the right tool to surface it.

Good seat to compact from.
