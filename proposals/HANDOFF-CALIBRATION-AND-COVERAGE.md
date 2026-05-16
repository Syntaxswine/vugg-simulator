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
