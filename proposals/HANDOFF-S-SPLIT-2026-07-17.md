# HANDOFF — the ladder is closed; the bedrock awaits approval (2026-07-17)

For the fresh context that continues after the fix ladder. **ALL NUMBERED RUNGS ARE CLOSED**
(1 F · 2 T-gates · 3 tiger's-eye · 4a–d redox · 5 salinity), through **SIM 234**, cold-CI
stamped GREEN at `05aa5e4`, 2436/2436, deployed. This bridge supersedes
`HANDOFF-RUNG-4D-AND-THE-SULFUR-SPLIT-2026-07-16.md` (historical — both its questions
answered: rung 4 was NOT done → the sibling gates shipped SIM 233; the S-split is no longer
a flag but a proposal).

## The commit trail of this stretch (all pushed, newest first)

- `1bcf54e` docs: **PROPOSAL-FLUID-S-SPLIT-2026-07-17.md** + BACKLOG next-line
- `feaa361` docs: rung-5 banner
- `05aa5e4` sim: **rung 5 — chloride evaporites → real brine strength (SIM 234)** ← the stamp
- `082ebdb` tools: halite-saturation-census (rung-5 instrument)
- `a8725df` docs: rung-4d banner + bridge ANSWERED addendum
- `bed8675` sim: **rung 4d — the sibling gates (SIM 233)**
- `e201ab9` tools: nucleation-eh-census (all-species, the standing rung-4 gate)

## Read first (in this order)

1. `proposals/PROPOSAL-FLUID-S-SPLIT-2026-07-17.md` — THE NEXT ARC, awaiting boss approval.
   Its §5-B is the recommended shape; §9 holds the two open questions (F_min floor value,
   T-taper anchors).
2. `proposals/BACKLOG.md` — the 🗿 rung-5 banner (top) carries the full rung-5 record + the
   residue lists; the rung-4d banner below it carries the sibling-gates record.
3. Keystone lineage: `HANDOFF-FOUNDATIONS-2026-07-03.md`, **twenty-third hand — "the rock's
   own units"** (this stretch's story: close-by-census, indict-the-axis,
   calibration-expiry, withdraw-with-research, disequilibrium-is-content).
4. The fix commits' messages (`bed8675`, `05aa5e4`) — the field notes carry per-species
   numbers and the canary pre-registrations.

## THE NEXT ACTION — S-split Phase S0, gated on boss approval

The boss selected the split ("lets go with the sulfate/sulfide split next"); the proposal is
written and pushed; **the boss has NOT yet approved the recommendation** (the rung-4
precedent: rockbot approved that proposal's direction before any build). On approval:

- **S0 (safe, byte-identical):** build `tools/sulfur-speciation-census.mjs` (per
  scenario × step: Eh/T/S + what each candidate fraction yields; the per-species
  would-it-starve table at recorded operating points) and land
  `sulfurReducedFraction` / `sulfideAvailablePpm` / `sulfateAvailablePpm` in js/20c
  **defined-but-unused**. S0's instrument MEASURES the F_min floor (smallest value that
  keeps every legit consumer fed) instead of accepting the proposal's 0.15 placeholder.
- **Do NOT start S1** (barite's migration, the first baseline-moving commit) until S0's
  table exists — the proposal's §5-B arithmetic ("mvt barite still saturates its s_f cap")
  is an estimate, not a measurement.
- The As-split (js/20c:380–452) is the implementation template — read it before writing a
  line. Note its thioarsenite lock reads total `fluid.S > 50`; re-coupling it to
  sulfideAvailablePpm is sequenced in S2, NOT S0.

## The ritual (unchanged, two standing census gates now)

Session start: `vugg-session-start` (cwd RESETS after /compact; `node tools/cold-ci.mjs
--check` — the stamp vouches for `05aa5e4`; docs-only commits since are provably inert via
`git diff --stat`). Fix flow: census → researched edit → `npm run build` (NEVER bare
build.mjs) → blast vs `seed42_v234.json` → full vitest (diagnose every red BEFORE touching)
→ bump SIM FIRST → gen-js-baseline + gen-strip-digest + gen-strip-archive + baseline-diff +
mineral_coverage_check (stale gate = 1 = magnetite/jeffrey_mine) → explicit staging (never
-A) → `git commit -F <unique tempfile>` → verify title → push (= deploy; pages/builds/latest
commit==HEAD) → cold-ci stamp. **After any redox- or brine-adjacent change, run BOTH:**
`tools/nucleation-eh-census.mjs` (expect flagged 0+0) and `tools/halite-saturation-census.mjs`
(expect zero sub-onset births).

## Traps this stretch paid for (don't pay twice)

- **When values resist tuning, indict the AXIS.** Rung 5's constant was un-tunable because
  the ppm axis itself couldn't carry saturation across deliberately-abstracted broths. The
  fix was brine strength (salinity/35 × concentration, seawater multiples).
- **A σ-currency change expires every calibration priced in it.** The halide MORPH_TH bands
  and five test contracts had to move IN THE SAME COMMIT or hoppers would have silently
  flattened forever. If the S-split changes any engine's effective σ scale, grep MORPH_TH
  tenants and test pins for that mineral BEFORE the bump.
- **Barite's 49 sub-boundary crystals are the MVT diagnostic, not offenders.** Any S-split
  behavior that starves mvt/wittichen/elmwood barite is WRONG by acceptance criteria (§8 of
  the proposal). Same for wittichen's barite+acanthite pair (+74/+75) and sicily's
  native_sulfur (+76, needs BOTH species — the natural S3 test case).
- **The enrichment trio's food source is the S2/S3 hard question.** Chalcocite/covellite/
  bornite at +111..+252 eat sulfide released by dissolving primaries — a transient the
  derived partition may not feed. Their carve-out gates stay until a census proves
  otherwise; do not retire them with the primary-six ceilings.
- **Promise-withdrawal needs research + measurement + a resurrection condition** (the
  tincalconite pattern: mechanism identified, 0-across-8-seeds measured, mechanic retained,
  return condition written).
- Small but real: `Get-Content file | Measure-Object -Line` DROPS BLANK LINES — it will
  tell you a 2,700-line lineage doc is 2,094 lines and make you suspect corruption. Use the
  Read tool's numbering or `(Get-Content file).Count`.

## Carried forward (don't lose these)

- **Boss eye-check — OWED, NINE bumps deep** (SIM 226–234). Richest: **searles_lake**
  (borax blades to 23.6 mm where the salt boulders were; the husk cycle), **tn457**
  (de-salted to 10 honest crystals, one massive sphalerite), supergene_oxidation +
  roughten_gill (the 4d re-deals), plus the older debts (deccan stilbite, sunnyside).
- **TN457 the SPECIMEN**: boss now "fairly certain" it's sphalerite + witherite → England
  rehabilitated. The catalog amendment awaits the boss's note on WHICH test decided
  (record the UV-dark-core objection alongside). Future sim tie-in: a witherite stage on
  tn457_barite_pulses would be the dead witherite engine's FIRST TENANT (the scenario's
  Dunham note already places baryte/witherite in this vug's zone). NO scenario edit until
  the boss finalizes.
- **Scenario candidates now motivated**: a perennial-brine lake (Dead Sea / solar
  saltworks — homes the unoccupied chevron band + persistent hopper rafts); a potash
  scenario (Zechstein/Prairie/Khorat — wakes sylvite); the Precambrian BIF (tiger's-eye +
  willemite); Sunnyside boiling → native gold (boss calibration specimen).
- **4d residue**: the wolframite spurious-gate decision (own census; removal may BIRTH the
  species in the W=5 pegmatites); arsenopyrite 0.8; the 1.5 fahlore/sulfosalts; CdS
  literals; ~22 direct-O2 readers; stale 4b gates tables; redox-gate-census map maintenance.
- **Owner actions**: vugg-canary `node src/schedule.mjs --install` (still unarmed);
  pre-v194 strip saves offer stands.
- **Canary morning-after**: `bed8675` + `05aa5e4` messages carry the pre-registrations
  (expect searles crystals 57→155, tn457 24→10, halite vanished at tn457/travertine,
  sylvite + tincalconite vanished, borax + mirabilite appeared, descloizite appeared at
  roughten_gill). Anything ELSE moving is worth a look.

## Diversions from the Elmwood eye-check (2026-07-23) — habit-rendering fidelity

Surfaced when the boss eye-checked v234-vs-v235 Elmwood renders during S1 (barite settled:
"the barite's ok"). Reference: real Elmwood specimen **#103941** (calcite + galena +
fluorite + celestine). Both are SEPARATE from the S-split (rendering/habit, not chemistry):

- **Elmwood calcite — render the scalenohedral as a real dogtooth.** The 19 mm golden
  crown-jewel calcite is MODEL-correct (`habit: stepped_scalenohedral`, forms `v{211}
  scalenohedron, gentle growth steps | dog-tooth`) but the RENDER doesn't read as a
  dogtooth. It's a Wulff/wireframe GEOMETRY gap (js/45 + the calcite geometry in
  99c/99d/99i), not a habit-assignment one — the classifier already tags dog-tooth. Boss
  wants dogtooth OR the larger blockier dogtooth variants. Verify in-browser (elmwood
  seed 42; the 19 mm calcite is the biggest crystal).
- **Elmwood celestine — druzy blanketing surface-coating habit.** Renders today as tiny
  discrete `tabular {001} plates` at **8–9 µm**. The real specimen's celestine is "fibrous
  and white, seemingly holds the specimen together like a glue" — a large-area DRUZY
  BLANKET / surface coating, more like chalcedony/chrysoprase than discrete crystals. Needs
  BOTH a druzy/surface-coating habit variant (grow_celestine js/60 + morphology registry
  js/45 — study how chalcedony/chrysoprase surface-coating is done) AND for it to actually
  spread as a coating rather than sit at 8 µm. The bigger of the two.

*Twenty-third hand's bridge, 2026-07-17; Elmwood-diversions addendum by the twenty-fourth
hand, 2026-07-23. The keystone for this stretch is in HANDOFF-FOUNDATIONS-2026-07-03.md
("the rock's own units").*
