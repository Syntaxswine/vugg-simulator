# HANDOFF: High-fill physics + size-class cascade (Proposals A+C + Backlog K compose-up)

> **Authored:** 2026-05-18 by Claude (Sonnet 4.5)
> **State:** HEAD = `4b20645` on `origin/main` (Syntaxswine). SIM_VERSION 69. **226/226 tests green.** Coverage tool: 0 stale, 89 live, 27 dead.
> **Continues:** `HANDOFF-CALIBRATION-AND-COVERAGE.md` (terminus `062e6f5`). That doc covers Backlog K + the four-stale sweep up to 2026-05-16; this doc covers what happened next.
> **Audience:** next agent (post-compact or fresh session) AND the boss skimming options.

---

## 1. TL;DR

Five arcs since the previous handoff's terminus, all composing cleanly with each other and with the prior session's work.

| sha | arc | tests |
|-----|-----|-------|
| `bf700ca` | Research doc + probe: high-fill physics survey (no code change) | 197 |
| `b440419` | **Proposal A** — continuous sigmoid dampener replacing the 0.95 + 1.0 cliffs | 197 → 202 |
| `1541f70` | searles_lake basin architecture (fixed an old oversight) | 202 |
| `d2b4973` | Size-class cascade — `vug` / `pocket` / `cave` tiers with Random Mode UI | 202 → 217 |
| `90992df` | Size-class wired into Simulation Mode + Creative Mode | 217 |
| `4b20645` | **Proposal C** — `late_stage_propensity` gradient (20 minerals scored) | 217 → 226 |

Two cleanly composed threads:

**Thread 1 — high-fill physics** (Proposals A + C). The binary `vugFill ≥ 0.95` and `vugFill ≥ 1.0` cliffs from Backlog K became one continuous sigmoid dampener (A), then got per-mineral graduation via `late_stage_propensity: 0–1` (C). The two compose linearly: `D' = D + propensity × (1 − D)`. Twenty minerals scored from the literature anchors documented in `proposals/RESEARCH-GROWTH-AT-HIGH-FILL.md`.

**Thread 2 — size-class cascade** (player-facing). Three tiers (`vug` 5–25mm / `pocket` 25–300mm / `cave` 300–3000mm) anchored to boss's "inches / feet / meters" mental model + standard mineralogy + speleology. UI selectors landed in Random Mode, Simulation Mode, and Creative Mode. Zen Mode inherits. Existing scenarios stay byte-identical (every one sets `vug_diameter_mm` explicitly, which wins over `size_class`).

---

## 2. Tool chain — five probes now

Three new tools this session join the two from the prior:

| tool | signal | runtime |
|------|--------|---------|
| `tools/gen-js-baseline.mjs` | per-scenario crystal counts + sizes at seed 42 | ~30s |
| `tools/twin_rate_check.mjs` | observed twin frequency vs authored per-roll probability | ~15s |
| `tools/mineral_coverage_check.mjs` | live / stale / dead mineral classification | ~10s |
| `tools/stale_mineral_probe.mjs` | per-step σ + chemistry for stale (mineral, scenario) pairs | ~5s |
| `tools/high_fill_probe.mjs` (NEW) | vugFill trajectory + growth-rate bins across all scenarios | ~5s |

All five share the same jsdom + bundle-eval + fetch-mock harness. ~50 lines of setup duplicated across each `tools/*.mjs`. If a 6th tool lands, extract to `tools/_harness.mjs` first — see §8 for the candidate list.

**Run any of these after any data or engine change.** They surface drift that unit tests miss.

---

## 3. What landed, in detail

### 3.1 Proposal A — continuous sigmoid dampener (`b440419`)

The two binary cliffs from Backlog K (nucleation cap at 0.95, growth halt at 1.0) became one continuous sigmoid:

```ts
function _fillDampenerFor(vugFill: number): number {
  if (vugFill <= 0.7) return 1.0;       // 18 of 24 scenarios stay here — zero RNG cost
  if (vugFill >= 1.0) return 0.0;       // preserves geometric ceiling
  return 1.0 / (1.0 + Math.exp(20 * (vugFill - 0.85)));
}
```

Three regions: pure-passthrough below 0.7, sigmoid 1.0 → 0 between 0.7 and 1.0, hard floor at 0.0 ≥ 1.0.

**Anchored to Tenthorey & Cox 1998** (JGR): experimental observation that permeability falls 10× while porosity stays nearly constant, with meaningful flow restriction at 80-85% fill (not 95%). Sigmoid midpoint at vugFill=0.85 matches.

**Verification — probe trajectory across all scenarios at seed 42:**

| vugFill bin | mean zone thickness BEFORE | mean zone thickness AFTER |
|-------------|----------------------------|---------------------------|
| 0.50–0.75 | 223 µm | 216 µm |
| 0.75–0.90 | 162 µm | 118 µm |
| 0.90–0.95 | 70 µm | **34 µm** |
| 0.95–0.99 | 154 µm (n=2 noisy) | **12 µm (n=29)** |
| 0.99–1.00 | (n=0) | **6.4 µm (n=72)** |

Smooth decay from 260 µm peak to 6.4 µm at near-seal. The 0.95+ regime was statistically empty before; now actively sampled. Calibration baseline drift in 6 high-fill scenarios; other 18 byte-identical.

### 3.2 Proposal C — late_stage_propensity gradient (`4b20645`)

Generalizes Backlog K's binary `fill_exempt: true` into a continuous 0–1 per-mineral gradient. The effective dampener becomes:

```
effective = D + propensity × (1 − D)
```

| vugFill | D | bulk p=0 | calcite p=0.4 | lepidocrocite p=0.9 | borax p=1.0 |
|---------|---|----------|---------------|---------------------|--------------|
| 0.85 | 0.50 | 0.50 | 0.70 | 0.95 | 1.00 |
| 0.95 | 0.12 | 0.12 | 0.47 | 0.91 | 1.00 |
| 0.99 | 0.05 | 0.05 | 0.43 | 0.91 | 1.00 |

**Twenty minerals scored** with literature anchors. Tier summary:

| tier | propensity | minerals | rationale |
|------|------------|----------|-----------|
| 1 | 1.0 | borax, mirabilite, thenardite, sylvite, tincalconite | playa efflorescent + paramorph |
| 2 | 0.9 | lepidocrocite | Brazilian amethyst skunk-calcite terminal patina |
| 2 | 0.7–0.8 | chalcanthite, erythrite, annabergite | Cu/Co/Ni "bloom" efflorescent crusts |
| 3 | 0.6 | goethite, chrysocolla, aurichalcite | supergene weathering crusts |
| 4 | 0.3–0.4 | calcite, native_tellurium, malachite, aragonite, azurite | sometimes late, often bulk |
| 5 | 0.2 | quartz, fluorite, barite | drusy / MVT-gangue tails |
| 0 | (no field) | ~96 of 116 minerals | bulk default |

Each entry carries `_late_stage_note` with a date-stamped literature anchor. `fill_exempt: true` still works as the backward-compat alias for `propensity: 1.0`.

**Probe-measured impact:**

| vugFill bin | nuc/step pre-Prop-C | nuc/step post-Prop-C |
|-------------|---------------------|----------------------|
| 0.95–0.99 | 0.172 | **0.333** (2× — druzy crusts firing) |
| 0.99–1.00 | 0.028 | **0.062** (2.2× — terminal patinas) |

Calibration drift in 4 of 24 scenarios (naica_geothermal, radioactive_pegmatite, searles_lake, supergene_oxidation). All in the geologically-predicted direction.

### 3.3 searles_lake basin architecture (`1541f70`)

The canonical evaporite playa scenario (Mojave closed basin, Smith 1979 USGS PP 1043, the 20-mule-team-era borate locality) was using the default `pocket` architecture despite the `basin` archetype (PROPOSAL-HOST-ROCK Mechanic 5) having been built for exactly this case. Sister scenario `sabkha_dolomitization` was already using basin; searles_lake was an oversight.

The basin archetype (`js/22-geometry-wall.ts ARCHETYPE_DEFAULTS.basin`):
- `primary_bubbles: 1, secondary_bubbles: 0` (single round depression)
- `polar_collapse: 1.0` (top hemisphere collapses to ~5% — playas don't have ceilings)
- `nucleation_bias: 'floor_only'` (crystals only fire on the bottom half)

Calibration drift in searles_lake only:
- borax: 2 → 8 active (hits max_nucleation_count cap)
- mirabilite: 5 → 8 (hits cap)
- halite: 4 → 7
- quartz: 0 active / 3 dissolved → 4 active (survives now)
- celestine: max 58 → 83 µm

77 crystals / 9 species after the change. All anchor on the playa floor.

The commit body also documented a broader architecture audit (7 candidate scenarios with arguable mismatches) — leaving those for boss to decide. See `1541f70` body for the table.

### 3.4 Size-class cascade — three tiers, three modes

**Three tiers anchored to "inches / feet / meters":**

| tier | range | reference |
|------|-------|-----------|
| **vug** | 5–25 mm | "smaller than an inch" — specimen-cabinet thumbnail; Klein/Hurlbut textbook |
| **pocket** | 25–300 mm | "inches to feet" — Pala / Himalaya / Tanco pegmatite pockets (Foord 1981); alpine fissures |
| **cave** | 300–3000 mm | "feet to meters" — speleology passable-cavity threshold; Naica chamber ~10m. Capped at 3m where the per-vertex grid stays meaningful |

`js/22-geometry-wall.ts`:
- `SIZE_CLASS_RANGES` table
- `_resolveVugDiameter(opts)` — explicit `vug_diameter_mm` wins, else `size_class` with optional `_size_rng` draws from range, else legacy 50mm default
- `resolveSizeClassToMm(sizeClass, rngDraw?)` — helper for UI callers
- VugWall + WallState both carry `size_class` as informational tag

**Wired into three modes:**

| mode | control | default | behavior |
|------|---------|---------|----------|
| Random (d2b4973) | "Cavity size" select | 🎲 Any size | Uniform draw within tier, seed-reproducible. Tier weighting 25/50/25 (vug/pocket/cave) |
| Simulation (90992df) | "Cavity Size (optional)" select next to Shape Seed | scenario default | Override: scenario's `vug_diameter_mm` replaced with tier midpoint |
| Creative (90992df) | "Cavity size" row above Wall reactivity | preset default | Override: preset's `vug_diameter_mm` replaced with tier midpoint |
| Zen | (no UI — inherits) | — | Reflects whatever Simulation or Random chose |

Every existing scenario stays byte-identical — all set `vug_diameter_mm` explicitly in their JSON5, which wins over `size_class`.

**Architecture × size_class is orthogonal:**

| boss's four categories | maps to |
|------------------------|---------|
| vugs | `size_class: 'vug'` + any architecture |
| pockets | `size_class: 'pocket'` + `architecture: 'pocket'` |
| caves | `size_class: 'cave'` + `architecture: 'irregular'` (the karst archetype) |
| evaporite pools | any size + `architecture: 'basin'` (sabkha + searles already use this) |

A cave-sized basin (km-scale playa) or a vug-sized tabular fracture are both expressible.

---

## 4. State files

| file | purpose |
|------|---------|
| `proposals/RESEARCH-GROWTH-AT-HIGH-FILL.md` | Research + Proposals A/B/C/D/E. §11 has A landing notes; §12 has C landing notes |
| `proposals/HANDOFF-CALIBRATION-AND-COVERAGE.md` | Prior handoff — Backlog K + stale sweep arc. §10 + §12 still load-bearing for principles + Path C caveat |
| `tools/high_fill_probe.mjs` | NEW — vugFill trajectory + growth-rate bins. Run after any high-fill change |
| `tools/stale_mineral_probe.mjs` | Per-step σ + chemistry probe. Run when a coverage stale entry needs diagnosis |
| `data/minerals.json` | Now has `late_stage_propensity` + `_late_stage_note` per scored mineral; schema header documents the field |
| `data/scenarios.json5` | Schema header documents the `size_class` field on `wall:` |
| `js/22-geometry-wall.ts` | `SIZE_CLASS_RANGES`, `_resolveVugDiameter`, `resolveSizeClassToMm`, VugWall + WallState updates |
| `js/85b-simulator-nucleate.ts` | `_atNucleationCap` now has the graduated dampener formula |
| `js/85d-simulator-step.ts` | `_fillDampenerFor` sigmoid, `_fillDampener` state cache in `check_nucleation` |
| `js/96-ui-random.ts` | Size-class draw in `buildRandomScenario` |
| `js/91-ui-legends.ts` | Size-class override in `runSimulation` |
| `js/97-ui-fortress.ts` | Size-class override in `fortressBegin` |
| `tests-js/fill-exempt.test.ts` | Updated to assert on `_fillDampener` API (was `_fillCapped`) + new sigmoid anchor tests |
| `tests-js/size-class.test.ts` | NEW — 15 cases pinning literature ranges + resolver precedence |
| `tests-js/late-stage-propensity.test.ts` | NEW — 9 cases pinning the 20-mineral scoring + resolver math |

---

## 5. Open backlog

### From `proposals/RESEARCH-GROWTH-AT-HIGH-FILL.md`:

| # | proposal | effort | recommended order |
|---|----------|--------|-------------------|
| **B** | habit transitions on fill × σ (hopper / drusy variants gated on local fill, not scenario-explicit "rapid evaporation") | ~3 hours | next — fastest visual win, established literature anchors (Tanaka 2018 hopper paper), composes with A+C |
| **D** | interlocking textures past vugFill ≥ 1.0 (fixes sabkha 2.5× / gem_pegmatite 1.5× single-step overshoots) | ~1 day including renderer | after B — needs habit-variant additions, fixes visible bug |
| **E** | per-cell local fill (Tranche 7-style) | ~3 days | defer — heterogeneous fill is the architectural endgame, but A+B+C+D cover ~95% of the story |

### Other open items:

- **Path C cascade-gate audit** (~half day). §12 of the prior handoff identified the structural issue: any engine with `if (this.fluid.X > Y) return 0` where Y is a depleting species becomes structurally unreachable. Only `native_tellurium` was fixed (soft `ag_suppr`). A focused probe — grep `if \(this\.fluid\.\w+ [><=]+ [\d.]+\) return 0` across `js/3?-supersat-*.ts` — would surface the rest in 10 minutes; ~half day to triage + fix.

- **Cave-size resize of cave-anchored scenarios** (naica_geothermal currently 50mm but anchored to Naica's ~10m chamber; zoned_dripstone_cave + stalactite_demo similar). Wait for Proposal D's interlocking-texture bookkeeping so cave-scale runs don't get pathologically slow at high fill.

- **Architecture audit follow-ups** from `1541f70` commit body:
  - `stalactite_demo` + `zoned_dripstone_cave` use `pocket` despite cave anchors (possibly intentional for demo visual clarity)
  - `supergene_oxidation`, `porphyry`, `schneeberg`, `colorado_plateau` use default `pocket` where their type localities suggest `irregular` or `tabular`
  - Rename of `irregular` → `cave` would match the four-category mental model but is a breaking change

- **Probe-harness extraction**. If a 6th tool lands, extract `tools/_harness.mjs` first.

---

## 6. Verification harness

```bash
npm run ci                                  # typecheck + build:check + 226 tests
npm test                                    # vitest only
node tools/gen-js-baseline.mjs              # regen calibration baseline
node tools/twin_rate_check.mjs              # twin frequency report
node tools/mineral_coverage_check.mjs       # live / stale / dead classification
node tools/stale_mineral_probe.mjs          # per-step σ for stale (mineral, scenario) pairs
node tools/high_fill_probe.mjs [seed]       # vugFill trajectory + growth-rate bins
```

Boot order if you're starting cold: `npm run build` first (the tools eval the bundle from `dist/`). Bundle takes ~5s to compile.

---

## 7. Principles refreshed

The §10 principles from the prior handoff are still load-bearing. Three new ones this session:

### Compose-cleanly architecture

Proposal A defined `_fillDampener` as a probabilistic gate primitive with formula `D' = D + propensity × (1 − D)` where propensity defaults to 0. Proposal C just populated propensity per-mineral. Neither needed to know about the other. The architecture made the second proposal trivial after the first landed — about 3 hours for C versus ~2 hours for A.

**Future high-fill proposals should follow this pattern:** define your mechanism as a multiplier or boost into the existing dampener, not a parallel system. Proposal B (habit transitions on fill × σ) is the next test of whether the pattern holds — gating habit variants on `_fillDampener` rather than introducing a new "fill_phase" state.

### Size-class orthogonal to architecture

The boss's four-category mental model (vugs / pockets / caves / evaporite pools) initially looked like a single axis. The shipped system splits it into two: `size_class` (scale, 3 values) × `architecture` (shape, 5 values). 15 combinations the player can dial in. Both fields are optional, both compose with explicit overrides.

**Carry-forward for future taxonomy work:** when the boss articulates N categories, check whether it's really 1 axis with N values or M orthogonal axes. The latter is usually richer and matches reality better.

### Text-mode bulk edits

The first attempt at the Proposal C JSON insertion used `JSON.parse → JSON.stringify` and generated a 3680-line cosmetic diff (Node's serializer normalizes `1.0` → `1` and `5.0` → `5`). The text-mode rewrite (regex-anchored by mineral name + entry-class_color line) produced a 194-line surgical diff. Both work; the surgical one is reviewable.

**Carry-forward:** for bulk-edit-many-entries-in-one-JSON tasks, use text-mode insertion from the start. The one-shot script can live in `tools/` during the run, get deleted after the commit lands. Pattern in this session's deleted `tools/add_late_stage_propensity.mjs` (referenced in commit `4b20645` body for archaeology).

---

## 8. What this session was

Five commits across two days, 226/226 tests green throughout. Both threads earned their place:

- **Thread 1 (Proposals A + C)** closes the high-fill physics gap that Backlog K opened. The mechanism is geologically honest (sigmoid + per-mineral propensity), the literature anchors are real (Tenthorey & Cox 1998, Proust & Fontan 2007, Tanaka 2018, Spry & Thieben 1996), and the architecture composes cleanly with future work.

- **Thread 2 (size-class cascade)** is a player-facing UI win. Three tiers, three modes wired, four-category mental model preserved as `size_class × architecture`. Random Mode + Simulation Mode + Creative Mode all have selectors; Zen Mode inherits.

The research-doc-first approach (`proposals/RESEARCH-GROWTH-AT-HIGH-FILL.md` landed before any code) earned its keep. The doc has been edited twice (§11 + §12 landing notes) and is now the working reference for Proposals B/D/E if the boss returns to the high-fill thread.

The probe-tool discipline from the prior session (§10) continued paying off. `tools/high_fill_probe.mjs` is the most-used tool this session — every commit body has a before/after table from it. The cost is small (~5s per run) and the discipline catches drift before it ships as a baseline change.

Good seat to compact from.

---

## 9. Closing — what's NOT in this handoff

Things deliberately omitted because the prior handoff already covers them:

- The Backlog K vugFill cap discovery + fix → `HANDOFF-CALIBRATION-AND-COVERAGE.md` §5
- The four stale-mineral retunes (adamite / chrysoprase / ruby / native_tellurium) → `HANDOFF-CALIBRATION-AND-COVERAGE.md` §12
- The Path C bulk-view caveat → `HANDOFF-CALIBRATION-AND-COVERAGE.md` §12 (still load-bearing; the audit hasn't been done)
- The principles from the prior handoff (`fill_exempt` audit-trail pattern, stale-comment trap, vugFill cap leverage analysis) → `HANDOFF-CALIBRATION-AND-COVERAGE.md` §10

Read both handoffs together for a complete picture of the calibration arc from 2026-05-12 through 2026-05-18.
