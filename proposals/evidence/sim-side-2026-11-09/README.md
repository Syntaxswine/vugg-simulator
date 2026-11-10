# Evidence for `REVIEW-SIMULATION-SIDE-2026-11-09.md`

Outputs of the review's passive instruments, copied byte for byte from `.local-evidence/`, and four
small probes with their outputs. Runtime: Windows x64, Node 24.15.0. SIM 286. No file under `js/` or
`data/` differs from `origin/main` `e86ba58a`, and `dist/` is built from it. The census input digest
`870a43a4d610…` in the census reports covers the runtime, `dist/`, `js/`, `data/`, the harness, the
lockfile, the seed-42 baseline and the text of the code that produces a census row. The census
reports and the mutation report name the sha256 of `tools/sim-side-census.mjs` as it ran, `6b63cc216f64…`.

Nothing here is a receipt, and no test or gate reads this directory.

| File | Produced by | Supports |
|---|---|---|
| `census-seed-42.{txt,json,md}` | `node tools/sim-side-census.mjs` | §2, §3.3, Appendix A |
| `census-seed-1.{txt,json}`, `census-seed-2.{txt,json}` | `node tools/sim-side-census.mjs --seed 1` (and `2`) | the three-seed tables of §2 |
| `census-mutations.{txt,json}` | `node tools/sim-side-census-mutations.mjs` | §1: each control fails on its mutants |
| `rate-at-saturation.{txt,json}` | `node tools/rate-at-saturation-census.mjs` | §3.2; the shape test of §4 C2 |
| `seed-variety.{txt,json}` | `node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/2026-11-04/v286` | §2.4 |
| `ab-refund-seed-42.{txt,json}` | `node tools/sim-side-ab.mjs --arm refund=1 --seeds 42 amethyst_geode asbestos_hills_crack_seal asbestos_hills_surficial_alteration bisbee chiastolite_hornfels colorado_plateau cooling deccan_zeolite elmwood epithermal_telluride gem_pegmatite great_salt_plains grimsel_alpine_cleft jeffrey_mine marble_contact_metamorphism mvt naica_geothermal ouro_preto porphyry pulse radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill sabkha_dolomitization schneeberg searles_lake shigar_pegmatite sicily_solfifera stalactite_demo sulphur_bank sunnyside_american_tunnel supergene_oxidation tn457_barite_pulses tormiq_alpine_cleft tutorial_first_crystal tutorial_mn_calcite tutorial_travertine ultramafic_supergene wittichen zoned_dripstone_cave` | §2.1: every debit returned to its cell, all 41 scenarios, seed 42 |
| `ab-refund-seed-1.{txt,json}` | `node tools/sim-side-ab.mjs --arm refund=1 --seeds 1 amethyst_geode asbestos_hills_crack_seal asbestos_hills_surficial_alteration bisbee chiastolite_hornfels colorado_plateau cooling deccan_zeolite elmwood epithermal_telluride gem_pegmatite great_salt_plains grimsel_alpine_cleft jeffrey_mine marble_contact_metamorphism mvt naica_geothermal ouro_preto porphyry pulse radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill sabkha_dolomitization schneeberg searles_lake shigar_pegmatite sicily_solfifera stalactite_demo sulphur_bank sunnyside_american_tunnel supergene_oxidation tn457_barite_pulses tormiq_alpine_cleft tutorial_first_crystal tutorial_mn_calcite tutorial_travertine ultramafic_supergene wittichen zoned_dripstone_cave` | §2.1: every debit returned to its cell, all 41 scenarios, seed 1 |
| `ab-refund-seed-2.{txt,json}` | `node tools/sim-side-ab.mjs --arm refund=1 --seeds 2 amethyst_geode asbestos_hills_crack_seal asbestos_hills_surficial_alteration bisbee chiastolite_hornfels colorado_plateau cooling deccan_zeolite elmwood epithermal_telluride gem_pegmatite great_salt_plains grimsel_alpine_cleft jeffrey_mine marble_contact_metamorphism mvt naica_geothermal ouro_preto porphyry pulse radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill sabkha_dolomitization schneeberg searles_lake shigar_pegmatite sicily_solfifera stalactite_demo sulphur_bank sunnyside_american_tunnel supergene_oxidation tn457_barite_pulses tormiq_alpine_cleft tutorial_first_crystal tutorial_mn_calcite tutorial_travertine ultramafic_supergene wittichen zoned_dripstone_cave` | §2.1: every debit returned to its cell, all 41 scenarios, seed 2 |
| `ab-pegmatites-rind-clamp.{txt,json}` | `node tools/sim-side-ab.mjs --arm rind=5000 --arm cap=8 --seeds 42,1,2 gem_pegmatite radioactive_pegmatite shigar_pegmatite` | §3.1 A/B table (rind, clamp); the other two pegmatites |
| `ab-gem-factor-caps-root.{txt,json}` | `node tools/sim-side-ab.mjs --arm fcap=2 --arm root=3 --seeds 42,1,2 gem_pegmatite` | §3.1 A/B table (factor caps, root) |
| `ab-gem-boron.{txt,json}` | `node tools/sim-side-ab.mjs --arm mul=B:10 --arm mul=B:0.5 --arm mul=B:0.25 --arm cap=8,mul=B:10 --arm cap=8,mul=B:0.5 --seeds 42,1,2 gem_pegmatite` | §3.1: tourmaline against the boron, in the plugged pocket and the open one |
| `ab-feldspar-13-scenarios.{txt,json}` | `node tools/sim-side-ab.mjs --arm cap=8 --arm fcap=2 --arm root=3 --seeds 42,1,2 bisbee chiastolite_hornfels deccan_zeolite epithermal_telluride gem_pegmatite grimsel_alpine_cleft jeffrey_mine ouro_preto porphyry radioactive_pegmatite schneeberg shigar_pegmatite tormiq_alpine_cleft` | §4 C1: what each shape moves in the 13 scenarios that grow feldspar or albite |
| `ab-quartz-also-clamped.{txt,json}` | `node tools/sim-side-ab.mjs --arm cap=8 --minerals feldspar,albite,quartz --seeds 42,1,2 radioactive_pegmatite gem_pegmatite` | §3.1: radioactive_pegmatite with quartz bounded as well |
| `ab-radiogenic-lead.{txt,json}` | `node tools/sim-side-ab.mjs --arm pb --arm cap=8,pb --seeds 42,1,2 radioactive_pegmatite schneeberg` | §3.3 A/B table |
| `ab-rate-on-excess.{txt,json}` | `node tools/sim-side-ab.mjs --arm excess=1 --arm excess=3 --minerals galena,molybdenite,uraninite --seeds 42,1,2 mvt porphyry radioactive_pegmatite reactivated_fluorite_vein reactive_wall roughten_gill schneeberg sunnyside_american_tunnel` | §4 C2 preview table |
| `ab-gem-clamp-sensitivity.{txt,json}` | `node tools/sim-side-ab.mjs --arm cap=4 --arm cap=8 --arm cap=12 --arm cap=16 --arm cap=24 --arm cap=48 --seeds 42,1,2 gem_pegmatite` | §4 C1: sensitivity to the clamp value |
| `ab-reactive-wall-trace.{txt,json}` | `node tools/sim-side-ab.mjs --arm excess=1 --minerals galena --trace galena --seeds 42,1,2 reactive_wall` | §4 C2: galena sigma on the bulk handle and on its own cell |
| `probe-sigma-maxima.mjs`, `.txt`, `-naica.txt` | `node proposals/evidence/sim-side-2026-11-09/probe-sigma-maxima.mjs` (and `--minerals selenite,celestine naica_geothermal`) | §3.1 cause; §3.4 Naica |
| `probe-baseline-history.mjs`, `.txt` | `node proposals/evidence/sim-side-2026-11-09/probe-baseline-history.mjs <vugg-canary>/logs/2026-11-04/v286` | §3.1 and §3.4: the baseline history and the canary spreads |
| `probe-nucleation-envelope.mjs`, `.txt`, `-per-vertex.txt` | `node proposals/evidence/sim-side-2026-11-09/probe-nucleation-envelope.mjs` (and `--minerals selenite,celestine,calcite,aragonite,anhydrite naica_geothermal stalactite_demo zoned_dripstone_cave`) | §7: a wrapped supersaturation method governs births too |
| `probe-ab-digest.mjs`, `.txt` | `node proposals/evidence/sim-side-2026-11-09/probe-ab-digest.mjs` (reads the `ab-*.json` files here; runs no simulation) | the counts §2.1, §3.1 and §4 draw from the A/B outputs |

Every simulation run in these files that has a seed-42 baseline to compare with reproduces it, with
the instrument attached; each file says so in its own integrity line.
