# BACKLOG — Vugg Simulator

Living list of open work items, captured from session conversations so context survives compaction. Each item has enough detail that someone picking it up cold can act without re-discovering the rationale.

Order is rough priority — top of each section is most-actionable, but explicit user direction reorders freely.

---

## 🐞 Bugs / pending diagnostic

### 3D viewer bug list
**Status:** awaiting user's enumeration.
**Context:** during the 3D viewer work earlier in the project, several specific bugs were noted but never logged with reproduction steps. User has the list; this todo is the placeholder until they share it.

---

## 🎛️ Creative mode — controls expansion

The Creative mode setup panel currently exposes ~30 FluidChemistry sliders + temperature + pressure + new wall reactivity. These items extend the player's control over the rest of the wall + fluid surface.

### Wall porosity slider
**Status:** designed, ready to implement.
**Why:** porosity is geologically distinct from reactivity. Three coupled effects, each with its own engine hook:

| Effect | What it does | Hook |
|---|---|---|
| **(1) Surface area** | Multiplies wall dissolution rate (effective_rate × reactivity × porosity_multiplier) | `VugWall.dissolve()` rate calc |
| **(2) Matrix leaching** | Per-step ion influx from surrounding rock's wall_*_ppm reservoir into vug fluid, gated by porosity. Even at neutral pH, K/Ca/Si/Al migrate in. The Deccan zeolite mechanism — K/Ca/Si/Al arrive via porosity, not direct wall contact. | New per-step `leach_from_matrix()` method on `VugWall`, called alongside `dissolve()` |
| **(3) Residence time** | Controls fluid drainage / refresh. High porosity = fluid replaced often (dilute output). Low porosity = fluid sits, evaporates if exposed (concentrates → evaporites — the sabkha mechanic). | Modulates `flow_rate` and possibly an evaporation-concentration multiplier |

**Slider design sketch:**
- 0% (dense) — only vug-facing wall surface attacked. Default for Herkimer-style massive dolostone.
- 10% (typical limestone) — current implicit behavior baked into reactivity=1.0.
- 30% (chalky / oolitic) — ~3× effective surface area; faster dissolution + ion release.
- 50%+ (vuggy / cavernous) — fluid percolates through; might allow secondary nucleation IN wall pore space rather than only on the vug surface (interesting rendering question).

**Schema work needed for effect (2):** the `wall_*_ppm` fields only cover Fe/Mn/Mg today. Matrix leaching needs at minimum `wall_K_ppm`, `wall_Na_ppm`, `wall_Si_ppm`, `wall_Al_ppm` — and ideally per-composition profiles (limestone vs dolomite vs basalt vs granite vs phyllite each have different ion reservoirs). That naturally pushes toward the wall-composition-picker item below.

### Wall composition picker (Creative mode)
**Status:** queued behind reactivity slider.
**Why:** wall composition is currently hardcoded by FLUID_PRESET in `fortressBegin`. Player can't pick limestone vs dolomite vs silicate. With the reactivity slider live, exposing composition is the natural next wall control. Limestone / dolomite / silicate (with a sub-pick of pegmatite / granite / quartzite / phyllite / basalt) covers all the scenario use cases.

### Creative mode rework — full element-slider exposure
**Status:** flagged but not designed in detail.
**Why:** Creative mode setup exposes ~30 FluidChemistry elements as sliders, but some preset starter fluids contain trace chemistry the user can't see or modify until they're already in-game. Per the user's framing — starter fluids represent "what's in the rocks", so every element they define should be exposed at setup time. Bigger surgery than a single-slider add; needs a full UX pass on the setup panel layout.

---

## 🧪 Schema additions — new FluidChemistry fields + mineral engines

Each item below has the locality chemistry **pre-researched** during the chemistry audit. The work is engineering (add field + mineral engines + minerals.json entry + nucleation block) — no more literature pass needed.

### Cd field + grow_greenockite
**Status:** chemistry pre-researched, engine pending.
**Pre-researched value:** `Cd=2` for Tri-State (sphalerite carries Cd substituting for Zn — typically 1000-5000 ppm Cd in mineral, raw fluid Cd ~1-10 ppm). Greenockite (CdS) is the diagnostic yellow coating on Tri-State sphalerite.
**Source:** Schwartz 2000 (Econ. Geol. 95) on Cd in MVT sphalerite + Tri-State greenockite occurrence in Hagni 1976.
**Engineering needed:**
- `Cd: float = 0.0` field in FluidChemistry (Python @dataclass + JS class)
- `grow_greenockite` (CdS) implementation following the pattern of grow_native_gold (commit `e13d7f1`) — see that as template
- `supersaturation_greenockite` method
- Nucleation block in `check_nucleation` (substrate preference: on sphalerite)
- `MINERAL_GROW_FUNCS` dispatch entry
- `minerals.json` entry — yellow class_color, formula CdS, T tolerance similar to sphalerite
- Optionally: Cd-in-sphalerite trace tracking in `grow_sphalerite` (TitaniQ-analog)
- **Au audit pattern reminder:** when Cd lands, run the gap-check across all 10 anchored localities. Most will be `intentionally_zero`; Tsumeb / supergene scenarios may carry trace Cd (greenockite is reported there too).

**Minerals unlocked:** greenockite, hawleyite, Cd-trace in sphalerite.

### Au-Te coupling — grow_calaverite + grow_sylvanite (Bingham telluride cap)
**Status:** all upstream chemistry already in place; pure engine work.
**Why:** Bingham `scenario_porphyry` already has Au=2 + Te=2 + Ag=8 in init. Currently all the Au precipitates as native_gold; adding Au-Te competition would partition some Au into telluride growth instead. Bingham upper-level epithermal cap hosts these tellurides (Landtwing 2010 + Cook et al. 2009 Au-Ag-Te systematics).
**Engineering needed:**
- `supersaturation_calaverite` (AuTe2) and `supersaturation_sylvanite` ((Au,Ag)Te2) methods
- `grow_calaverite` and `grow_sylvanite` functions
- Nucleation blocks
- `MINERAL_GROW_FUNCS` dispatch entries
- `minerals.json` entries
- Update `grow_native_gold` to compete against tellurides when both Au and Te are present (currently Au always goes native)

**Minerals unlocked:** calaverite, sylvanite, krennerite (potentially).

### Auriferous-chalcocite trace tracking (Bisbee mode)
**Status:** schema mostly in place; modeling work needed.
**Why:** Bisbee's supergene Au literature (Graeme et al. 2019) emphasizes that much of the Au is hosted as a trace within chalcocite rather than as discrete native_gold crystals. Currently all Au in Bisbee precipitates as discrete native_gold instead of partitioning into chalcocite.
**Engineering needed:**
- Add Au-trace tracker on `grow_chalcocite` (parallel to how Mn/Fe traces are tracked in calcite — see `grow_calcite` for pattern)
- Add `trace_Au` field to GrowthZone if not already present
- Update narration / inventory output to surface auriferous-chalcocite vs pure-chalcocite distinction

**Effect:** Bisbee output would record both native gold pockets AND ppm-Au-bearing chalcocite zones — the latter being the more economically significant mode in real Bisbee.

### Ag/Ge mineral engines (Tsumeb downstream)
**Status:** Tsumeb fluid chemistry already populates Ag=8, Ge=5, Sb=5 (commit `684f035`). Mineral engines for the Ag-sulfosalts and Ge-sulfides don't exist yet — those are pure engine work.
**Engineering needed:**
- `grow_proustite` (Ag3AsS3) — ruby silver, As-end
- `grow_pyrargyrite` (Ag3SbS3) — ruby silver, Sb-end
- `grow_native_silver` (Ag) — analog of grow_native_gold
- `grow_chlorargyrite` (AgCl) — supergene Ag halide
- `grow_germanite` (Cu26Fe4Ge4S32) — Tsumeb type-locality Ge mineral
- `grow_renierite` ((Cu,Zn)11(Ge,As)2Fe4S16) — companion Ge mineral
- (Optionally) `grow_briartite` (Cu2(Fe,Zn)GeS4)
- Each needs supersaturation, growth, nucleation, dispatch, minerals.json entry
- **Au audit pattern reminder:** when each lands, run gap-check across all 10 anchored localities for Ag specifically (Bingham Ag=8 and Bisbee Ag=40 already populate; some MVT scenarios may need Ag promoted from "documented but no engine" to active).

---

## 📋 Audit-trail patterns established (reference, not work)

These aren't todos — they're conventions to follow when doing the work above:

- **`pending_schema_additions`** in `data/locality_chemistry.json` — for "value pre-researched, schema/engine not yet there". Includes value, unit, rationale, source, blockers, minerals_unlocked. See bingham_canyon entry as canonical example before Au shipped.
- **`intentionally_zero`** in `data/locality_chemistry.json` — for "we checked and zero is the right answer for this locality". Established in commit `e2048e9` for the Au audit. When any new schema field lands, run the per-locality gap-check and document zero values explicitly so future audits don't re-flag them.
- **Three-place note pattern** — when a new schema element is researched but engine pending, leave cross-referenced notes in: vugg.py scenario comment + web/index.html mirror comment + data/locality_chemistry.json `pending_schema_additions` block. See bingham_canyon Au notes (pre-commit `e13d7f1`) for the reference shape.
- **Per-commit docs/ mirror** — every web/index.html change must be mirrored to docs/index.html in the same commit. ARCHITECTURE.md requirement; user views the live game via GitHub Pages docs/.
- **Push to Syntaxswine origin** — the user's fork is the push target; StonePhilosopher canonical is read-only here, boss promotes from Syntaxswine.

---

## 🎯 SIM_VERSION
Currently **3** (bumped in commit `1c9cd29` for the arsenopyrite/scorodite/ferrimolybdite engine series). Bump to 4 when:
- Cd field shipped → bump to 4 (would shift Tri-State seed-42 output)
- Wall porosity slider shipped → bump to 4 (changes existing scenario dissolution behavior even at default settings if the existing reactivity=1.0 baseline shifts)
- Au-Te coupling lands → bump to 4 (would partition Bingham Au into telluride growth)

Defer the version bump decision to whoever ships those changes.

History:
- v1: pre-audit defaults
- v2: scenario-chemistry audit (Apr 2026; commit `77d999a`)
- v3: arsenate/molybdate supergene cascade engines — arsenopyrite + scorodite + ferrimolybdite (Apr 2026; commits `1c9cd29` → `0cd182f`)

---

## 🧪 Scenario-tune follow-ups (deferred from v3 mineral expansion)

### Tsumeb scorodite pH gap
**Status:** identified during the v3 expansion audit (commit `0cd182f`); fix deferred.
**Evidence:** Tsumeb is the world-class scorodite locality (Gröbner & Becker 1973 — deep blue-green dipyramids to 5+ cm). The current `scenario_supergene_oxidation` represents the late-stage carbonate-buffered phase (pH=6.8), which is **above** scorodite's pH<6 nucleation gate. Geologically, Tsumeb scorodite formed during the early acidic supergene phase BEFORE carbonate buffering raised pH.
**Fix sketch:** add an `event_supergene_acidification` to `scenario_supergene_oxidation` at an early step (~10) that drops pH transiently to 4-5 for ~20 steps (mimicking the H₂SO₄ pulse from sulfide oxidation before host-rock carbonate buffers it). Scorodite would nucleate during the acidic window, then become stable as a passive crystal once pH rises above 5.5 (no acid-side dissolution since scorodite dissolves on alkaline shift, not acid).
**Where the gap is documented:** `data/locality_chemistry.json:tsumeb.mineral_realizations_v3_expansion.scorodite.status = "geologically_documented_but_blocked"` with full citations and `audit_action`.

### Bingham/Bisbee scorodite + ferrimolybdite end-to-end verification
**Status:** engines are wired and chemistry should produce both, but no full-scenario seed-42 run was executed during the v3 expansion (porphyry/Bisbee runtimes are slow). When time permits, run seed-42 porphyry (120 steps) and bisbee (340 steps) and confirm the realization predictions in `mineral_realizations_v3_expansion`:
- Bingham: arsenopyrite forms early, oxidizes after step 85, scorodite + ferrimolybdite nucleate post-oxidation
- Bisbee: arsenopyrite forms strongly (Fe=200 → enormous σ), oxidizes after step 65 ev_uplift_weathering, scorodite nucleates from arsenopyrite oxidation products

Failures would point to either (a) chemistry tuning needed (rare given the audit) or (b) σ thresholds need adjustment.

---

## 🔗 Canonical-only research / proposals (not yet folded into engine work)

These exist on `canonical/main` (StonePhilosopher) but were not merged into Syntaxswine fork during the v3 expansion. Read and either implement, fold into BACKLOG, or merge:

- `proposals/MINERALS-RESEARCH-UNIMPLEMENTED.md` (canonical commit `41183b9`) — **DONE**: arsenopyrite/scorodite/ferrimolybdite engines shipped (commits `1c9cd29`–`0cd182f`). Expanded paragenetic notes on molybdenite + wulfenite from this file are reference-only (no engine changes needed).
- `proposals/Gibbs-Thompson dissolution cycling — crystal quality mechanic` (canonical commit `6577442`) — **NOT YET READ**. Crystal-quality mechanic proposal. Action: read the file and decide whether to implement, scope into BACKLOG, or punt.
