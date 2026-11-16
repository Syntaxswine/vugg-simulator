# Fluorite appearance and visible run seeds

Base: Syntaxswine `e86ba58a945f05ac37f0c41d6816e18f1611cbf1` (SIM 286).
Branch: `fix/fluorite-colour-and-run-seed`.
Commissioning host: Windows x64, Node 24.15.0.

The reported MVT fluorite had three incompatible display paths: the title and
chromophore strip used a legacy trace heuristic, the specimen preview used a
temperature palette, and the wall material defaulted to colourless because
fluorite's prose colour-rule triggers cannot be parsed as numeric thresholds.

Seed 42 reproduces the contradiction for crystal #2: born at step 20,
131.4176304865628 C, 12,931.461138859095 um growth, 101 green growth-zone notes.
The old UI called it purple (`#b088dd`) while the wall resolved `#edf0f3`.
All three colour surfaces now interpret the existing recorded assignment.
This corrects the purple label as well as the colourless wall default; it
does not establish an independently validated chemistry-to-colour law.
The user's original random seed was unavailable, so this is a controlled
reproduction of the same contradiction, not a claim to recover that specimen.

The whole-body colour/name is a surviving-growth-length-weighted dominant
palette summary. It is a display approximation, not volume weighting, an
absorption spectrum, or a new solid-composition model. Historical zone strips
retain an accepted zone's original colour even when its material was later
removed. The existing post-growth radiation override remains. Incomplete or
unrecognized legacy notes retain the old display heuristic. Neither growth
classification nor chemistry, RNG, inventories, morphology, dimensions,
transmission, IOR, roughness, or attenuation-distance parameters are changed.
Other minerals retain their current display paths.

A selectable status below the wall-profile heading shows the original growth
seed and resolved shape seed from the displayed simulator's commissioned run
metadata. It does not populate the optional inputs, consume randomness, infer
a missing seed from a later RNG state, or change the next random launch.
Zero is valid. Legacy records without metadata say `not recorded`. The shared
panel serves both the 3D viewer and flat/non-WebGL fallback.
The flat cavity diagram retains its existing class-colour legend; the
specimen-colour correction applies to the label, chromophore bar, specimen
preview and 3D material. This is not a migration of the flat diagram's palette.

## Validation record

The controlled MVT scientific-state fingerprint before and after the fix is
`d99496bad8b56dea01847d16a01dbe109dc1ed7d994b3affd6f2497d69ae0822`.
The accepted notes, quantities, dimensions and nucleation are unchanged;
label, colour strip and body resolver now read green (`#44bb88`).

Local commands and raw outputs are retained in
`.local-evidence/fluorite-seed/`. The browser workflow also includes a durable
regression for blank-input seed generation, MVT fluorite material construction,
viewer-state neutrality, both viewer choices, and failed WebGL acquisition.
The two new focused test files are in ordinary Windows CI.

| Check | Result |
| --- | --- |
| `npm run build` | PASS, 187 modules |
| `npm run typecheck` | PASS |
| `npm run build:check` | PASS |
| Guarded focused run: fluorite-appearance, run-seed-notice, d1-body-colour, local-color, optics-r2-materials, per-zone-color-mn, cavity-field-fallback, agent-interface | PASS, 143 tests in eight serial files |
| `git diff --check` | PASS |
| `npm run gen:browser-receipt` | PASS, 19 public-control/feature checks, owned Chrome 156.0.8078.80 |
| Fresh three-seed locality-frequency sweep | PASS, all 41 scenarios, seeds 1/2/42; baseline byte-identical |
| Fresh seed-42 strip archive | PASS, all 41 stories byte-identical to the base |
| Numerical seed-42 baseline and strip digest | PASS, both regenerated files byte-identical |
| `node tools/science-workflow.mjs --rebake` (`npm run science:rebake`) | PASS, verification included: 55 tests in seven files; 48 min 26 s |
| Fresh calcite census, specimen rebuild and factor report | PASS; all 41 scenario measurements, historical rows and scientific fingerprints unchanged |
| Final guarded feature/receipt regressions | PASS, 225 tests in nine serial files |
| Final typecheck, exact-build drift, science/evidence/release and pilot checks | PASS, 20 serial audit commands |
| GitHub CI | Runs on the published PR head; consult that exact commit's check run |

The durable [validation record](evidence/fluorite-colour-and-run-seeds-validation.json)
contains the source hashes, browser products, exact commissioning/audit commands,
environment, elapsed times, comparison counts and changed receipt paths. Full
commissioning ran for about 57 minutes with each producer child bounded by
`NODE_OPTIONS=--max-old-space-size=1536`; the observed serial scenario producers
were around 550 MiB RSS. The final guarded test group peaked at 606 MiB.

The final guarded command selected these exact files with repeated `--file`
arguments to `npm test --`:

```text
tests-js/fluorite-appearance.test.ts
tests-js/run-seed-notice.test.ts
tests-js/guided-tutorial-browser-receipt.test.ts
tests-js/calcite-solid-authority.test.ts
tests-js/finite-reservoir-authority.test.ts
tests-js/physical-reservoir-mapping.test.ts
tests-js/reservoir-reference-preflight.test.ts
tests-js/mvt-prehistory.test.ts
tests-js/local-state-foundation.test.ts
```

The feature branch does not deploy the main site. This delivery publishes a
reviewable PR; it does not merge the branch or promote unrelated work.

Initial focused-test retry: the material test passed an invalid tier literal
`A`; correcting it to the existing `transmission` tier made the assertion
exercise the actual attenuation-colour path. No optical parameter changed.
The initial browser attempt passed the 18 existing checks, then correctly
failed the new seed check because its fixture had not entered Simulation
mode. The fixture now enters the mode before using its controls. An added
screenshot capture was not in that first process's loaded producer bytes;
that attempt supplies no replacement receipt or final acceptance evidence.
The targeted one-minute MVT probes reached late computation without a browser
exception (one recorded step 119/120); final commissioning uses a bounded
two-minute allowance and computes in the existing flat viewer before checking
both completed views. The isolated diagnostic wrapper inherited the full
suite's three-dialog assertion and thus does not supply full acceptance.

The first complete 19-check run passed its player journeys but receipt formation
correctly rejected the installed Chrome 156 binary against the prior Chrome 155
pin. The new exact executable SHA-256 was recovered through the native-owned
DevTools listener (`46461accbdc87dc88a5bdd6d611be095dd6147db009863d794f742ca90662efa`),
then the full run was repeated successfully. All existing guided-journey payloads
remain byte-identical. No identity comparison or geological assertion was
relaxed. Tests additionally reject a self-rehashed alternative binary hash or
browser version.

The current browser payload hash is a dependency of the mechanism witness;
that witness hash in turn appears in all 41 JSON/Markdown claim-card pairs.
`check-authority-cascade.mjs` verifies that replacing only the previous hash
with the newly generated hash exactly reproduces every card. It also compares
the mechanism payload after substituting only its browser-authority hash:
every other witness value is identical. These are authentication updates,
not new locality outcomes or scientific retuning.

Calcite physical-solid authority, production local reactions/transport, UV
kinetics, and pending unrelated branches remain outside this change.
