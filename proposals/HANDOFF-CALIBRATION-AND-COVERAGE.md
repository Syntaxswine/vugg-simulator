# HANDOFF: Tier 1 sweep + Tranche 6 + Tier 2 F + coverage investigation + Backlog K + stale-mineral sweep

> **Authored:** 2026-05-16, by Claude (Sonnet 4.5)
> **State:** SIM_VERSION still 69. **197/197 tests green** (177 + 11 fill-exempt + 9 stale-retune). Backlog K (vugFill cap exemption) shipped (commit `8a0d403`). **Stale-mineral sweep shipped** — all 4 remaining stales (adamite, chrysoprase, native_tellurium, ruby) cleared via tools/stale_mineral_probe.mjs-driven targeted retunes. **Live count: 81 → 89 minerals.** Stale count: 6 → **0**.
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

## 4. The stale list — fully resolved (post-stale-sweep, 2026-05-16)

| mineral | scenario | resolution |
|---------|----------|------------|
| adamite | supergene_oxidation | Scenario broth `As` bumped 12 → 25 (Tsumeb anchor, Pinch & Wilson 1977). Engine σ peaks at 1.40 in 125/600 (seed × step) pairs. |
| chrysoprase | ultramafic_supergene | Engine + spec threshold 1.2 → 1.0; scenario `SiO2` bumped 200 → 300 (Marlborough saprolite, Garnier 2008). Also added chrysoprase entry to MINERAL_STOICHIOMETRY (was a free-energy gift — warning resolved). |
| native_tellurium | epithermal_telluride | Hard `Ag > 5` gate replaced with soft `ag_suppr = max(0, 1 - Ag/75)` matching engine's Pb/Bi pattern (Spry & Thieben 1996; Saunders 2008 Cresson Vug coexistence). Path C un-aliasing made hessite's local Ag consumption invisible at the bulk view; soft suppressor encodes the geological reality. |
| ruby | marble_contact_metamorphism | Engine + spec threshold 1.5 → 1.3 (the corundum-family priority array in 89-nucleation-silicate.ts). Spec ceiling was unreachable: formula `base × min(Cr/5, 2)` peaks at ~1.42 at typical marble-fluid Cr levels. |

**Stale list is empty.** Live count 81 → **89** (across coverage sweep). Coverage tool surfaces zero stale entries; every mineral in any scenario's `expects_species` now nucleates in ≥1 of 10 seeds.

---

## 5. The vugFill cap fix (Backlog K — shipped)

This was the deepest finding from the previous session's coverage investigation; the fix landed as commit `8a0d403`.

**What was broken:** `check_nucleation` was globally gated on `vugFill < 0.95`. When the cavity hit 95% fill, ALL engines stopped firing — including late-evaporite engines that geologically grow as efflorescent crusts on top of existing halite.

For searles_lake specifically: halite grew to 6cm hopper cubes within ~48 steps, putting vugFill > 0.95. After that, `check_nucleation` short-circuited and borax/mirabilite/thenardite/tincalconite never had a chance to fire even at high σ.

**What shipped:**

1. Added `fill_exempt: true` field to 4 minerals in `data/minerals.json`: **borax, mirabilite, thenardite, sylvite**. Each carries a date-stamped `_retune_note_fill_exempt` audit-trail field. Schema documents the field in the `_schema` block.
2. Replaced the global `vugFill >= 0.95 → return` short-circuit in `check_nucleation` with a state cache: `sim._fillCapped = capped`. The legacy short-circuit is preserved when *no* mineral in the spec is fill_exempt (perf parity for synthetic test fixtures).
3. Extended `_atNucleationCap(mineral)` to return `true` when `_fillCapped && !spec.fill_exempt`. Every engine already gates on `_atNucleationCap` before its `rng.random()` roll, so the new gate flows through with zero call-site changes (123 nucleate sites × 0 = 0).
4. Reference-keyed cache on `_anyFillExemptInSpec()` invalidates when the async `_loadSpec()` swaps `MINERAL_SPEC` (the FALLBACK→full JSON transition).

**Verification:**

| signal | before | after |
|--------|--------|-------|
| stale minerals | 6 | 4 |
| live minerals | 81 | 85 |
| searles_lake species | 4 | 9 (+borax, +mirabilite, +thenardite, +tincalconite, +sylvite jumps from 1 to 4) |
| thenardite nucleations across sweep | <50 | 377 (paramorph cycling) |
| tincalconite nucleations | 0 | 281 (paramorph after borax) |
| naica_geothermal | unchanged | +9 thenardite (late efflorescent crust) |
| sabkha_dolomitization | unchanged | +4 sylvite (K-Cl late evaporite) |
| supergene_oxidation | unchanged | small max_um drift only (RNG-state shift) |
| tests | 177/177 | 188/188 (+11 new fill-exempt) |

**Baseline regen:** `tests-js/baselines/seed42_v69.json` regenerated. Drift was only the geologically intentional changes above — no scenario lost minerals it had before.

**Per-mineral max_nucleation_count still applies** — fill_exempt only removes the geometric cap, not the count cap. searles_lake's thenardite count of 31 doesn't violate `max_nucleation_count: 10` because the 31 is *cumulative across the run*; at any moment ≤10 thenardite are exposed (paramorph dehydration converts mirabilite → thenardite in place, freeing cap slots).

**What's not exempted (intentional):**
- **halite** — it IS the bulk evaporite, not a crust. Marking halite fill_exempt would invert the meaning.
- **calcite, gypsum, quartz** — common bulk minerals; their σ-gates are too forgiving.
- **chalcanthite, epsomite, erythrite, annabergite** — also efflorescent but their σ-gates aren't currently firing in problem scenarios. Easy to add later if the coverage tool surfaces a use case.

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

### New backlog from previous investigation

#### K. vugFill cap exemption for efflorescent minerals — **DONE (2026-05-16)**
Shipped. See §5 for the resolution. 4 minerals classified as fill_exempt (borax, mirabilite, thenardite, sylvite); coverage tool confirms borax + mirabilite cleared from stale list. 188/188 tests green.

#### L. Cascade-dependent stale: native_tellurium — **DONE (2026-05-16)**
Resolved. Soft `ag_suppr` replaces the hard gate; see §4 + §10.

#### M. Singleton stales — chrysoprase, ruby, adamite — **DONE (2026-05-16)**
Resolved via tools/stale_mineral_probe.mjs-driven targeted retunes (engine thresholds + scenario broth bumps). See §4 + §10. Also resolved a discovered free-energy bug: chrysoprase had no MINERAL_STOICHIOMETRY entry, so its growth wasn't debiting Si/Ni from the fluid.

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

---

## 10. Principles to carry forward (notes from the session-ending reflection)

Four things worth preserving past compaction, written in the voice they were noticed in:

### Tools-are-fast is a load-bearing property

The Arc 2 cascade was possible because the tool chain runs in 10-30 seconds per invocation:

| tool | runtime |
|------|---------|
| `tools/mineral_coverage_check.mjs` | ~10s |
| `tools/twin_rate_check.mjs` | ~15s |
| `tools/gen-js-baseline.mjs` | ~30s |

If any of those took 5 minutes, I would have used them less, found fewer things, shipped less. The cascade — F retune → coverage tool → telluride retune → vadose bug — was four commits in roughly an hour, each made possible by the previous tool's output. **Protect this property** when adding new sweeps: keep the harness shared (jsdom + bundle eval + fetch mock); keep the per-tool work scoped to "run, aggregate, report"; avoid pulling in dependencies that would slow boot.

### The `_retune_note` audit-trail pattern

Every probability bump introduced this session in `data/minerals.json` carries a date-stamped rationale field:

```json
{
  "name": "spinel_law",
  "probability": 0.08,
  "_retune_note": "Tier 2 F (2026-05): bumped 0.015→0.08. ..."
}
```

The note records (a) what changed, (b) when, (c) the calibration evidence (observed-rate, sample size), (d) the geological justification with at least one citation or specimen reference. The note is metadata, not consumed by the runtime — Python loaders that don't care about it skip it cleanly. Future calibration work should keep the pattern. It's the only way to know later whether a number was tuned-with-evidence or guessed-and-forgotten.

### The stale-comment trap

The instinct that nearly cost time this session: when authored data looks like a missing entry, your reflex is to "fix" it by adding the missing data. Galena's `twin_laws: []` matched the fallback's `spinel_law p=0.008` — looked like a missing entry. It's not. It's a decision. Galena nucleates without per-roll twins, intentionally. The fix would have been new content, not a retune.

**The trap:** in calibration work, the values you find look like errors when they're decisions, and look like decisions when they're errors. Same surface, opposite interpretations.

**The discipline:** when in doubt, surface the gap in the commit body or handoff doc and let someone with more context resolve it. Don't silently fix what might be intentional. Mention it explicitly — boss's "narrative canonical: pick richer" stored-memory principle applies here in reverse: an empty array might be the canonical decision, not a placeholder.

### vugFill cap (backlog K) is the highest-leverage remaining unlock

Of the six items on the post-tonight backlog, K is the one most directly enabled by the night's investigation. The coverage tool surfaced it; the vadose-fix cleared the lower-hanging fruit; what's left is the architectural decision about whether interstitial/efflorescent minerals should respect the global fill cap.

Specifically: `check_nucleation`'s `vugFill < 0.95` guard cuts off ALL engines when the cavity is 95% full by crystal volume. Real caves continue to grow late-evaporite crusts (borax, mirabilite, sylvite, efflorescent halite) on top of existing crystal cover — they don't displace, they coat. The fix is per-mineral classification (e.g., `MINERAL_SPEC[m].fill_exempt: true`) + a one-line guard adjustment in `check_nucleation`.

Estimated effort: ~2 hours. Unlocks searles_lake's full evaporite cascade (the 2 remaining stale entries: borax, mirabilite). Probably ripples to bisbee + supergene_oxidation + ultramafic_supergene, since efflorescent crusts appear there too. Calibration baseline drift expected and acceptable.

**Why I didn't do it tonight:** the per-mineral classification is a calibration question that wants explicit scoping rather than slipping in. Worth a focused commit with the classification table reviewed before merge.

---

## 11. What this session was

Eleven commits without a single test regression. Baseline drift only in directions the geological literature predicted (supergene minerals appearing in supergene scenarios; telluride paragenesis populating in the Cripple Creek anchor; speleothems appearing where speleothems grow). That's not normal for a session this long — usually you get more flailing.

The reason: the underlying chemistry plumbing is tight enough that surgical changes don't ripple. Path C (per-vertex chemistry), Tranche 4a (un-aliased fluids), the mass-balance infrastructure — those are all load-bearing. When the calibration is wrong, it's wrong in one identifiable place, not smeared across the codebase. That's a property the boss earned over many prior sessions; tonight's work just rode on it.

---

## 12. Stale-mineral sweep (2026-05-16, second-half-of-session)

After Backlog K shipped (commit `8a0d403`), the coverage tool surfaced 4 remaining stale entries: adamite, chrysoprase, native_tellurium, ruby. This section documents the diagnostic methodology + the four targeted retunes.

### The probe tool

`tools/stale_mineral_probe.mjs` — joins the trio of `gen-js-baseline.mjs` + `twin_rate_check.mjs` + `mineral_coverage_check.mjs`. For each (mineral, scenario) input pair, runs the scenario across 3 seeds × default-steps and reports:

- σ peak across all (seed, step) pairs + the chemistry snapshot at that step
- σ > 1 occurrence count
- whether nucleation actually happened
- min observed value of each "extras" field across the sweep (the cascade-gate diagnostic — surfaces when a hard-gated ingredient never drops below its threshold)

Each entry on the stale list became a one-line probe invocation. The probe pinned the failing-gate kind in seconds:

| mineral | best σ | σ > 1 count | failure mode |
|---------|--------|-------------|--------------|
| adamite | 0.68 | 0/600 | σ ceiling too low — `(Zn/80) × (As/30)` formula needed more As headroom; broth had As=12, formula tuned for Ojuela-style As=50+ |
| chrysoprase | 1.001 | 1/600 | σ ceiling just at threshold — engine threshold 1.2 above the formula's actual ceiling under ultramafic_supergene's Ni-saprolite broth |
| native_tellurium | 0.0 | 0/540 | hard gate `Ag > 5` structurally unreachable — Path C means hessite consumes Ag locally but bulk view (which the engine reads) stays at scenario init |
| ruby | 1.42 | 120/540 | σ ceiling at 1.42 but engine threshold at 1.5 — formula `base × min(Cr/5, 2)` can't reach 1.5 at typical marble Cr<10 ppm |

### The four targeted retunes

Each was a single surgical change — no engine restructures, no scenario rewrites. Pattern reflects the §10 stale-comment-trap principle: only fix what's been probe-verified as broken, never decisions-disguised-as-bugs.

**ruby:**
- `js/89-nucleation-silicate.ts`: corundum_family_candidates threshold 1.5 → 1.3
- `data/minerals.json`: `ruby.nucleation_sigma` 1.5 → 1.3 + `_retune_note_nucleation_sigma`
- Justification: spec ceiling was unreachable. Corundum-family priority ruby > sapphire > corundum preserved by array order in the loop, not by threshold spacing.

**chrysoprase:**
- `js/89-nucleation-silicate.ts`: `_nuc_chrysoprase` threshold 1.2 → 1.0
- `data/minerals.json`: `chrysoprase.nucleation_sigma` 1.2 → 1.0 + `_retune_note_nucleation_sigma`
- `data/scenarios.json5`: ultramafic_supergene `SiO2` 200 → 300 (Marlborough saprolite anchor, Garnier 2008)
- `js/19-mineral-stoichiometry.ts`: added `chrysoprase: { SiO2: 1, Ni: 0.1 }` (was a free-energy gift — applyMassBalance warning was firing on every growth)

**adamite:**
- `data/scenarios.json5`: supergene_oxidation `As` 12 → 25 (Tsumeb anchor, Pinch & Wilson 1977)
- No engine or spec changes — Tsumeb fluid inclusion data documents As 50-500 ppm in oxidation-zone brines; 12 was undershooting

**native_tellurium:**
- `js/36-supersat-native.ts`: hard `if (this.fluid.Ag > 5.0) return 0` replaced with soft `ag_suppr = max(0, 1 - Ag/75)` matching the engine's existing Pb/Bi suppressor pattern
- Justification combines structural + geological: Path C makes the bulk-view gate unreachable (hessite consumes Ag locally; bulk Ag stays at initial 15 forever), AND Cripple Creek's Cresson Vug bonanza pockets show hessite + native_Te coexistence (Saunders 1991; Spry & Thieben 1996 Mineralium Deposita 31). The strict gate encoded a simplified end-of-cascade story; reality has continuous coexistence as Ag locally drops.
- Denominator 75 tuned to Saunders 2008 fluid inclusion range (Ag 5-50 ppm in bonanza pockets).

### Verification

- 4-way probe: each mineral now ever_nucleated=YES (was all `no`)
- Coverage tool: 4 stale → **0 stale**. Live count 85 → **89**.
- Twin-rate tool: no new regressions (only pre-existing cuprite candidate).
- Calibration baseline regen for 4 drifted scenarios (supergene_oxidation, ultramafic_supergene, marble_contact_metamorphism, epithermal_telluride). All other scenarios byte-identical.
- New regression test: `tests-js/stale-mineral-retunes.test.ts` — 9 cases pinning each retune (authored value + engine-source-code pattern + end-to-end nucleation). 197/197 tests green.

### Discoveries along the way

**The Path C bulk-view problem for cascade gates.** This is a broader architectural finding worth flagging for future stale work. When an engine reads `this.fluid.X` and that X is consumed by another mineral elsewhere, Path C un-aliasing means the consuming mineral only debits its LOCAL cell — never the bulk view that gates the dependent engine. Any cascade-dependent hard gate (`if fluid.X > Y return 0`) becomes structurally unreachable in long-running scenarios.

The fix pattern is the one we used for native_tellurium: replace the hard gate with a soft suppressor factor. This preserves "geologically X-suppresses-Y" semantics while staying numerically reachable. Native_tellurium's `ag_suppr = max(0, 1 - Ag/75)` matches the engine's existing Pb/Bi pattern and the geological coexistence range.

Other potentially-affected engines (worth a future probe): native_gold (`fluid.Te < X` gate likely structurally affected by telluride consumption), native_silver (likely affected by hessite consumption), any engine that gates on a depleting cation. **Search pattern:** `if \(this\.fluid\.\w+ [><]= [\d.]+\) return 0` in supersat-*.ts files — every match is a hard gate that may have the Path C reachability issue.

**Free-energy bug discovered.** chrysoprase had no MINERAL_STOICHIOMETRY entry — its growth wasn't debiting Si/Ni from the fluid. The applyMassBalance() helper was printing a warning ("no stoichiometry for chrysoprase") on every growth step. Now fixed. Worth a sweep: are there other minerals with engines but no stoichiometry?

### What this didn't do

The stale-mineral sweep cleared the symptoms but didn't address the deeper Path C-vs-cascade-gates structural issue. If/when more minerals get hard-gated cascade dependencies (a future engine writes `if (fluid.Au > X) return 0`), they'll inherit the same reachability problem. The right structural fix is one of:

- **(A) Soft-suppressor convention**: code-style enforcement that engines never use hard cation gates, only soft suppressors. Easy lint rule; might be too restrictive for genuinely-need-this-threshold cases.
- **(B) Per-vertex σ check at engine level**: rewrite engines to iterate cells and pick max σ instead of bulk σ. Big refactor; ~10 lines per engine × 100+ engines.
- **(C) Inter-ring diffusion auto-on for cascading scenarios**: scenarios with depletion cascades opt in. Slowly homogenizes Ag/Te/etc across rings so bulk view tracks local depletion.

(C) is cleanest. Worth a focused tranche if a future engine adds another structurally-blocked cascade gate. Until then, the soft-suppressor pattern is the established fix template.
