# CATCHES — engine bugs surfaced by the strip-as-instrument campaign + adjacent rigor checks

A type-section description for the regression-test bedrock. Each entry below
records a real bug or sourcing error that landed in the simulator, how it was
caught, what the fix was, and the commit hash where the correction shipped.
The accompanying tests (per-mineral SI tests, per-scenario strip contracts,
seed-42 calibration baselines, strip-digest tripwires) are the bedrock; this
file is the type-section that records *why* each band/threshold/sign is what
it is.

Three failure modes recur. Naming them up front makes them easier to spot in
the next instance:

- **Fabricated citation.** A plausible-sounding journal reference that
  doesn't exist or doesn't claim what we attributed to it. Failure mode:
  generative recall produces a confident-sounding citation that has no
  source. Caught by: verification against a primary database / WebFetch.
  Cure: pull the citation, source from a verifiable distribution, add a
  fact-check test if possible.

- **Visualization-surfaced engine bug.** A trajectory in the strip recorder
  reads "wrong" relative to the scenario's geological intent. Failure mode:
  an engine mechanism either misfires (firing where it shouldn't) or fails
  to fire (the chemistry is right but a downstream coupling is broken).
  Caught by: human-with-strip-running pattern recognition. Cure: trace the
  trajectory back to the responsible mechanism; fix at the mechanism level,
  not the symptom.

- **Load-bearing spurious mechanism.** A mechanism that is geologically
  wrong but quietly doing real work that a calibration depends on.
  Removing it breaks the calibration. Failure mode: ad-hoc compensating
  errors stabilize each other. Caught by: trying to remove the spurious
  mechanism and watching what dies. Cure: supply the *correct* mechanism
  for whatever the spurious one was holding up, THEN remove the spurious
  one — both at once, in one carefully-staged commit.

---

## v139 → v142 — adamite fabricated twin_law citation

**Commit:** `eb8a3ce` (v142, adamite twin_law correction)

A `twin_laws` entry on adamite cited a paper that didn't say what was
attributed to it (it didn't predict the Miller indices we used). The
mineral catalog claimed a structural prediction that wasn't there.

**How caught:** the boss noticed during a routine read of the
twin_laws block. The mismatch between cited paper and declared Miller
indices was visible to a domain reader.

**Fix:** pulled the entry; later (post-v141) the `tools/twin-law-check.mjs`
structural fact-check tool was built so this whole class of error gets
caught at commit time. The vugg-add-twin-law skill now hard-requires that
check; declared Miller indices must agree with structural predictions
from `data/structural.json`.

**Lesson canonized in:** the vugg-add-twin-law skill's post-v142
structural-fact-check workflow.

---

## v145 → W11 prep — fabricated Burton 1993 / Wright 1999 on HMC thermo

**Commit:** `68ee988` (carbonate W11 prep — pull fabricated citations)

The HMC (high-Mg calcite) entry in `data/thermo-carbonates.json` cited
"Burton 1993" and "Wright 1999" as sources for the Mg-content-dependent
Ksp formulation. Neither paper exists in the form cited (Burton has work
on calcite kinetics, not the Mg-content Ksp; Wright 1999 was a fabrication).
Also flagged: an author-order inversion in a Bischoff citation that had
landed in the file unverified.

**How caught:** boss noticed during a careful read of the thermo-carbonates
sources block. The citations had the right *shape* (author + year + plausible
journal) but didn't survive verification.

**Fix:** pulled both fabricated citations + corrected the Bischoff author
order. The HMC parametrization itself stayed (the math was correct from
elsewhere), but the sourcing was rewritten honestly. This was the
foundational "fabricated citation" catch — the lesson that lit the
verification-before-source-attribution principle that paid off again
nine versions later at the v164 barite endotherm.

**Lesson canonized in:** the vugg-add-mineral skill's "do not fabricate
citations" rule + the project-wide rigor convention of preferring
"unsourced parameter" over "plausibly-sourced parameter."

---

## v161 — evaporite concentration ratchet (strip-recorder catch #1)

**Commit:** `a1f4249` (v161 evaporite rewetting fix), motivated by `71892a0`
(strip records `concentration`)

`FluidChemistry.concentration` is the scalar ×3-per-drying evaporative
multiplier that gates borax/mirabilite/thenardite nucleation. The
`_applyVadoseOxidationOverride` function in 85c bumped it ×3 when wet→vadose
drying happened, but its early-return branch SKIPPED the inverse case:
when water flooded back (vadose→wet), nothing reset concentration to 1.0.
A one-way ratchet. After the first dry/wet cycle a fluid was stuck at
concentration=3 forever, even when re-flooded.

**How caught:** the strip recorder's `concentration` chip (added at `71892a0`
when probing searles_lake) showed the chip pinning at 3.0 after the first
drying event and never returning to 1.0 across the rest of the run, despite
the fresh_pulse re-flood events firing. The trajectory was visibly a step
function, not the oscillation the geology required.

**Fix:** the rewetting branch in `_applyVadoseOxidationOverride` now handles
both directions — vadose→wet resets concentration to 1.0 (rewetting dilution).
Drift confined: 29/30 scenarios byte-identical, only naica thenardite count
shifted (correctly: reflooding suppresses late evaporite).

**Lesson canonized in:** the MEMORY.md `project_vugg_thermal_pulses` note:
"concentration is the evaporite driver; a reflood resets it to 1.0 — do
NOT re-introduce a one-way ratchet."

---

## v162 — thermal-pulse contamination of supergene scenarios (strip-recorder catch #2)

**Commit:** `5927600` (v162 thermal-pulse opt-out flag)

`ambient_cooling` in 85d had a magmatic thermal-pulse mechanic (4-10%/step
chance, +30-150°C spike, +SiO2/Fe/Mn injection, pH drop) that fired
UNCONDITIONALLY. Geologically correct for cooling hydrothermal systems
(pegmatites, MVT, porphyry, marble); geologically WRONG for supergene /
near-surface oxidation pockets. Ungated, it was reheating bisbee's ~25°C
azurite/malachite cascade toward 357°C.

**How caught:** the strip recorder's T chip on bisbee showed sustained
spikes to ~357°C during what was supposed to be a 25°C surface-oxidation
process. The peak was visibly impossible for the geological setting.

**Fix:** added a `wall.thermal_pulses` opt-out flag (default true; the
last `&&` operand in the pulse gate so non-flagged scenarios stay
byte-identical). Flagged: bisbee, roughten_gill. An automatic regime-T
gate was prototyped and REJECTED — temperature alone can't separate
supergene-cold from cool-groundwater (bisbee 25-35°C vs naica's 30°C
overlap), and the automatic gate broke 9 calibrated tests. Per-scenario
flag is the honest tool. Also exposed in Creative Mode setup as
`f-thermal-pulses` for runtime control.

**Lesson canonized in:** the MEMORY.md `project_vugg_thermal_pulses` note +
the vugg-add-scenario skill's "WHEN ADDING A SUPERGENE SCENARIO: set
thermal_pulses:false."

---

## v163 — schneeberg native_bismuth cooling window (load-bearing spurious mechanism)

**Commit:** `a1bf31b` (v163 schneeberg done properly)

When the v162 thermal-pulse flag was applied to schneeberg, native_bismuth
(plus the Co-Ni-Ag-As arsenide pentet) stopped firing entirely. Investigation
showed σ_max for native_bismuth had dropped to 0.811 (just below the
nucleation threshold) once the pulses stopped. Root cause: schneeberg's
`event_schneeberg_cooling` jumped T from 350°C directly to 30°C, SKIPPING
native_bismuth's `T_factor=1.0` window of [100, 250]°C. The "spurious"
thermal pulses had been the ONLY thing landing rings in the Bi-arsenide
formation window. Same for meta-uranium (torbernite → metatorbernite):
the pulses had been driving the dehydration via the >75°C heat path,
not via the geologically-correct vadose-exhumation path.

**How caught:** post-v162 calibration tests on schneeberg failed (9 tests).
Tracing back showed σ_max=0.811 just below threshold, and the temperature
schedule explained why — the cooling skipped the window.

**Fix (the "properly" half of v162):** supplied the CORRECT mechanisms
for what the pulses were spuriously holding up. (1) Added
`event_schneeberg_vadose_exhumation` at step 110 — meta-uranium now forms
via the honest vadose `dry_exposure_steps` path. (2) Changed
`event_schneeberg_cooling` to land at 180°C (the bismuth-arsenide
Fünfelementformation window per Markl 2016 / Kissin 1992) — native_bismuth
+ the five-element pentet now crystallize in their real T window.
schneeberg gained native_arsenic + native_silver + naumannite (the
Ag-Se) — a more-complete five-element-vein assemblage than before, via
correct mechanisms rather than accidents.

**Lesson canonized in:** the boss's "always ask what a spurious mechanism
is holding up before removing it" principle + the post-v162 handoff doc.

---

## v164 — barite-is-endothermic sign verification

**Commit:** `b1bd092` (v164 sulfate Ksp engine)

While building the sulfate Ksp engine, sourcing thermo values from memory
gave barite a NEGATIVE ΔH_diss (retrograde solubility) like the other
three sulfates being added (gypsum, anhydrite, celestine). Pre-commit
verification via WebFetch against the publicly-distributed PHREEQC
wateq4f.dat (USGS, github.com/usgs-coupled/phreeqc3) caught it: barite is
actually **+26.57 kJ/mol — endothermic (prograde solubility)**. K rises
~5x from 25°C to 100°C, ~50x from 25°C to 200°C. At MVT temperatures
(100°C), my pre-verification value would have made barite SI read
~1 log unit higher than reality.

**How caught:** verification step that ran BEFORE the commit, not after.
Lesson from v145 was on my mind ("don't trust memory on cited values");
WebFetch against the public canonical database was the leverage that
caught the sign before it shipped.

**Fix:** wateq4f-verified ΔH values landed in `data/thermo-sulfates.json`
with full sourcing block; a dedicated unit test asserts barite logKsp
RISES with T (guards against the sign accidentally being negated in any
future edit). All four canonical sulfate logKsp values pinned to 5
decimal places against the wateq4f source.

**Lesson canonized in:** the v164 commit body's explicit "do the
verification step BEFORE the commit, not after" note + post-v165 review
item #7 (extend `tools/thermo-coverage-check.mjs` to fetch + cross-check
cited values automatically, making rigor a tool not a habit).

---

## Pattern summary

| Catch | Mode | Caught by |
|---|---|---|
| v142 adamite twin_laws | Fabricated citation | Boss read |
| v145 HMC Burton/Wright | Fabricated citation | Boss read |
| v161 concentration ratchet | Visualization-surfaced bug | strip recorder (concentration chip) |
| v162 thermal-pulse contamination | Visualization-surfaced bug | strip recorder (T chip on bisbee) |
| v163 native_bismuth window | Load-bearing spurious mechanism | calibration test failure post-v162 |
| v164 barite endotherm sign | Fabricated value (memory) | WebFetch verification BEFORE commit |

Three of six were caught by *looking at trajectories the simulator was
already producing*. Two were caught by *reading carefully*. One was caught
by *trying to remove a mechanism and watching what died*. The pattern is
the same in all three modes: a question gets asked of the existing data
in a slightly different way, and the answer that comes back surprises.
Build the next instrument that asks the next slightly-different question
and the next catch will surface itself.

The bedrock is now laid. The sediment is the next round of work; the truth
is told in time.
