<!-- GENERATED — do not edit by hand. Produced by tools/locality-abundance-compare.mjs on 2026-10-21 from: .local-evidence/assemblage-census/runs.jsonl (sha256 1f44838cc156f11d…, SIM 285, 861 runs = 41 scenarios × 21 seeds (1-20 and 42), produced by tools/assemblage-census.mjs at ab79f195) and proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json (sha256 4b648a42907b293a…; market dictionary entries' JSON sha256 5d3556449edfb5f27d55d9f4d880f6e56c504084f15d80d08fa85ad03a61fd35). Deterministic (a fixed bootstrap seed per scenario). Re-run both tools to regenerate. -->

# Sim vs locality abundance — SIM 285, 21 seeds

Thresholds: OVER sim ≥ 10% of visible crystals with photos and listings < 1%; UNDER photos ≥ 10% with sim < 2%; ABSENT sim in ≥ 25% of seeds with no photo and no listing; dust = a headline species (≥ 10% of the voting record, or literature AB) with a median largest crystal < 1 mm.

## Scoreboard
ρ = Spearman between the sim's share of ≥ 1 mm crystals and the real share (mean of photo and listing shares; a source with < 20 observations does not vote), with its 5–95 % bootstrap bands: over the seeds, over the proxies (photographs and listing mentions resampled as multinomial draws) and over both. "Verdict differs" = the share of resamples whose verdict is not the one shown (seeds / proxies / both). Top 3 = largest shares, by value alone; species tied across third place are shown as "n of {…} (tied)", and a verdict that depends on how ties break is TIE-DEPENDENT. Literature marks: (S) snippet-level, (R) recalled.

| scenario | locality | verdict | ρ(sim, real) | band: seeds | band: proxies | band: both | verdict differs | real top 3 | sim top 3 (≥ 1 mm) | overlap | literature: sim top 3 rated rare/undocumented | literature: abundant, no sim crystal ≥ 1 mm |
|---|---|---|---:|---|---|---|---|---|---|---:|---|---|
| amethyst_geode | amethyst_geode | NO VISIBLE CRYSTALS | — | — | — | — | 0 / 0 / 0 % | quartz, chalcedony, calcite |  | 0 |  | quartz, chalcedony, x:celadonite |
| cooling | herkimer | NO VISIBLE CRYSTALS | — | — | — | — | 0 / 0 / 0 % | quartz, x:bitumen, calcite |  | 0 |  | quartz, x:bitumen, dolomite |
| great_salt_plains | great_salt_plains | THIN | — | — | — | — | 0 / 0 / 0 % |  | halite, selenite | 0 |  |  |
| marble_contact_metamorphism | mogok | NO VISIBLE CRYSTALS | — | — | — | — | 0 / 0 / 0 % | x:spinel, ruby, x:painite |  | 0 |  | calcite |
| sulphur_bank | sulphur_bank | THIN | — | — | — | — | 0 / 0 / 0 % |  | cinnabar, pararealgar, orpiment | 0 | pararealgar (S), orpiment (S) | opal |
| bisbee | bisbee | DISAGREES | -0.49 | -0.52 to -0.49 | -0.57 to -0.47 | -0.58 to -0.47 | 0 / 0 / 0 % | malachite, azurite, native_copper | atacamite, chrysocolla, jarosite | 0 |  |  |
| wittichen | wittichen | DISAGREES | -0.48 | -0.49 to -0.48 | -0.54 to -0.45 | -0.53 to -0.46 | 0 / 0 / 0 % | erythrite, zeunerite, ma:heinrichite | haidingerite, native_arsenic, 1 of {nickeline, chalcedony} (tied) | 0 | haidingerite (S), chalcedony | native_silver, safflorite, skutterudite |
| supergene_oxidation | tsumeb | DISAGREES | -0.45 | -0.46 to -0.40 | -0.49 to -0.41 | -0.48 to -0.37 | 0 / 0 / 0 % | smithsonite, cerussite, calcite | ferrimolybdite, brochantite, 1 of {scorodite, pyromorphite} (tied) | 0 | ferrimolybdite (S), scorodite, pyromorphite (S) | calcite, dioptase |
| schneeberg | schneeberg | DISAGREES | -0.36 | -0.41 to -0.34 | -0.40 to -0.27 | -0.43 to -0.27 | 0 / 0 / 0 % | erythrite, x:pucherite, 1 of {ma:eulytine, native_silver} (tied) | chrysocolla, arsenopyrite, 1 of {quartz, uraninite} (tied) | 0 |  | skutterudite, native_bismuth |
| mvt | tri_state_picher | DISAGREES | -0.35 | -0.41 to -0.35 | -0.38 to -0.25 | -0.37 to -0.25 | 0 / 0 / 0 % | galena, sphalerite, calcite | anhydrite, greenockite, 1 of {galena, calcite, fluorite} (tied) | 0–1 | anhydrite, greenockite, fluorite | dolomite |
| porphyry | bingham | DISAGREES | -0.33 | -0.34 to -0.31 | -0.46 to -0.20 | -0.45 to -0.19 | 0 / 0 / 0 % | pyrite, tetrahedrite, ma:faustite | ferrimolybdite, brochantite, acanthite | 0 | ferrimolybdite (S), acanthite | quartz, bornite |
| reactivated_fluorite_vein | north_pennines | DISAGREES | -0.28 | -0.28 to -0.28 | -0.38 to -0.22 | -0.38 to -0.22 | 0 / 0 / 0 % | fluorite, galena, quartz | barite, celestine, acanthite | 0 | celestine, acanthite | quartz |
| colorado_plateau | colorado_plateau | DISAGREES | -0.19 | -0.19 to -0.18 | -0.32 to -0.09 | -0.35 to -0.08 | 0 / 0 / 0 % | x:pascoite, ma:hughesite, 1 of {ma:dickthomssenite, ma:lasalite, ma:magnesiopascoite} (tied) | opal, tyuyamunite, uranophane | 0 | opal, uranophane | carnotite |
| grimsel_alpine_cleft | grimsel | DISAGREES | -0.15 | -0.18 to -0.14 | -0.44 to -0.02 | -0.40 to 0.01 | 0 / 2 / 4 % | quartz, fluorite, 1 of {epidote, rutile} (tied) | apatite, quartz, titanite | 1 | titanite | x:chlorite |
| searles_lake | searles_lake | DISAGREES | -0.13 | -0.40 to -0.13 | -0.18 to -0.02 | -0.42 to -0.02 | 0 / 0 / 0 % | halite, x:hanksite, x:trona | tincalconite, thenardite, halite | 1 | tincalconite (S) | x:hanksite, x:trona |
| naica_geothermal | naica | DISAGREES | -0.10 | -0.10 to -0.10 | -0.11 to -0.09 | -0.10 to -0.09 | 0 / 0 / 0 % | fluorite, selenite, calcite | celestine, selenite | 1 |  | fluorite |
| roughten_gill | roughton_gill | DISAGREES | -0.08 | -0.09 to -0.05 | -0.27 to -0.01 | -0.28 to 0.00 | 0 / 4 / 6 % | pyromorphite, mimetite, quartz | pyromorphite, chrysocolla, galena | 1 |  | quartz |
| tn457_barite_pulses | north_pennines | DISAGREES | -0.02 | -0.02 to -0.02 | -0.23 to 0.09 | -0.23 to 0.14 | 0 / 23 / 30 % | fluorite, galena, quartz | barite, sphalerite | 0 |  | fluorite, galena, quartz |
| sunnyside_american_tunnel | sunnyside | DISAGREES | -0.01 | -0.10 to -0.01 | -0.06 to 0.16 | -0.06 to 0.15 | 0 / 55 / 53 % | rhodochrosite, fluorite, quartz | galena, argentite, quartz | 1 | argentite | sphalerite, x:rhodonite |
| reactive_wall | viburnum | TIE-DEPENDENT (DISAGREES or PARTLY) | 0.00 | 0.00 to 0.00 | -0.05 to 0.12 | -0.05 to 0.12 | 0 / 0 / 0 % | calcite, galena, chalcopyrite | galena, sphalerite, pyrite | 1 |  | dolomite |
| ouro_preto | ouro_preto | PARTLY | 0.03 | 0.03 to 0.03 | -0.23 to 0.17 | -0.23 to 0.17 | 0 / 34 / 40 % | topaz, hematite, x:euclase | topaz, quartz, albite | 1 | albite |  |
| deccan_zeolite | deccan | PARTLY | 0.04 | 0.01 to 0.06 | 0.00 to 0.06 | -0.01 to 0.07 | 0 / 4 / 9 % | apophyllite, stilbite, heulandite | chalcedony, heulandite, quartz | 1 |  | stilbite |
| asbestos_hills_crack_seal | asbestos_hills | DISAGREES | 0.04 | 0.04 to 0.04 | -0.14 to 0.30 | -0.18 to 0.30 | 0 / 0 / 0 % | tigers_eye, crocidolite, x:jasper | opal, crocidolite, tigers_eye | 2 | opal | quartz, magnetite |
| epithermal_telluride | cripple_creek | DISAGREES | 0.09 | 0.09 to 0.10 | 0.04 to 0.21 | 0.03 to 0.21 | 0 / 40 / 39 % | calaverite, native_gold, fluorite | native_silver, native_gold, hessite | 1 | native_silver, hessite | fluorite, dolomite |
| asbestos_hills_surficial_alteration | asbestos_hills | DISAGREES | 0.10 | 0.07 to 0.11 | -0.08 to 0.32 | -0.11 to 0.33 | 0 / 0 / 0 % | tigers_eye, crocidolite, x:jasper | opal, crocidolite, tigers_eye | 2 | opal | quartz, magnetite |
| gem_pegmatite | cruzeiro | TIE-DEPENDENT (DISAGREES or PARTLY) | 0.18 | 0.16 to 0.23 | -0.07 to 0.33 | -0.06 to 0.32 | 0 / 0 / 0 % | tourmaline, quartz, lepidolite | albite, feldspar, quartz | 1 |  | tourmaline |
| jeffrey_mine | jeffrey_mine | PARTLY | 0.20 | 0.15 to 0.23 | 0.08 to 0.32 | 0.07 to 0.28 | 0 / 0 / 0 % | grossular, vesuvianite, diopside | vesuvianite, diopside, grossular | 3 |  |  |
| ultramafic_supergene | marlborough | DISAGREES | 0.22 | 0.22 to 0.22 | 0.22 to 0.46 | 0.22 to 0.46 | 0 / 0 / 0 % | chrysoprase, chalcedony | opal, chrysoprase | 1 | opal | chalcedony, x:magnesite |
| shigar_pegmatite | shigar | PARTLY | 0.34 | 0.34 to 0.34 | 0.24 to 0.40 | 0.24 to 0.42 | 0 / 0 / 0 % | aquamarine, topaz, quartz | tourmaline, quartz, 1 of {albite, feldspar} (tied) | 1 |  | aquamarine |
| elmwood | elmwood | DISAGREES | 0.34 | 0.34 to 0.34 | 0.30 to 0.42 | 0.30 to 0.38 | 0 / 0 / 0 % | fluorite, calcite, sphalerite | celestine, 2 of {fluorite, calcite, sphalerite} (tied) | 2 |  |  |
| tormiq_alpine_cleft | tormiq | PARTLY | 0.35 | 0.31 to 0.35 | 0.15 to 0.43 | 0.14 to 0.45 | 0 / 1 / 2 % | titanite, epidote, quartz | epidote, actinolite, titanite | 2 |  |  |
| sicily_solfifera | sicily | PARTLY | 0.36 | 0.36 to 0.36 | 0.35 to 0.46 | 0.35 to 0.46 | 0 / 0 / 0 % | native_sulfur, aragonite, celestine | celestine, native_sulfur, strontianite | 2 | strontianite (S) | selenite |
| chiastolite_hornfels | chiastolite_hornfels | AGREES | 0.66 | 0.66 to 0.66 | 0.66 to 0.71 | 0.65 to 0.71 | 0 / 0 / 0 % | andalusite, quartz, chalcedony | andalusite | 1 |  |  |

Verdicts: NO VISIBLE CRYSTALS 3, DISAGREES 19, AGREES 1, PARTLY 6, TIE-DEPENDENT 2, THIN 2.

### amethyst_geode  ←  amethyst_geode   (sim 21 seeds; 6 photos — does not vote; 70 listing mentions)
ρ(sim visible-count, real) = — [5–95 % band: seeds —, proxies —, both —; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.81   ρ(sim surviving count, real) = 0.76   ρ(sim ≥ 0.1 mm count, real) = 0.76
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 1.0 | 100% | 29 | 27 | 0 | 99 | 0.84 | 0% | 17 | 56 | AB |
| chalcedony | 2.5 | 100% | 71 | 73 | 0 | 1.3 | 0.15 | 0% | 0 | 23 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 50 | 16 | CO |
| goethite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 4.3 |  |
| x:celadonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.4 | AB |
| ma:cristobalite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 17 | 0 |  |
| selenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 17 | 0 | RA |

Flags: UNDER quartz (photos 17%; sim 0% of visible crystals); UNDER calcite (photos 50%; sim 0% of visible crystals); UNDER ma:cristobalite (photos 17%; sim 0% of visible crystals — NO ENGINE); UNDER selenite (photos 17%; sim 0% of visible crystals)

### asbestos_hills_crack_seal  ←  asbestos_hills   (sim 21 seeds; 25 photos; 29 listing mentions)
ρ(sim visible-count, real) = 0.04 [5–95 % band: seeds 0.04 to 0.04, proxies -0.14 to 0.30, both -0.18 to 0.30; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.21   ρ(sim surviving count, real) = 0.02   ρ(sim ≥ 0.1 mm count, real) = 0.00
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tigers_eye | 3.0 | 100% | 15 | 16 | 17 | 3.2 | 2.8 | 100% | 84 | 79 | CO |
| crocidolite | 3.0 | 100% | 15 | 16 | 19 | 2.3 | 2.4 | 100% | 4.0 | 6.9 | AB |
| x:jasper | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.0 | 6.9 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.0 | 0 |  |
| amosite | 3.0 | 100% | 15 | 16 | 13 | 0.3 | 1.3 | 100% | 0 | 3.4 | ND |
| quartz | 1.0 | 100% | 5.3 | 5.3 | 0 | <0.1 | 0.29 | 0% | 0 | 3.4 | AB |
| opal | 5.0 | 100% | 25 | 26 | 33 | 65 | 6.0 | 100% | 0 | 0 | ND |
| siderite | 1.0 | 100% | 5.1 | 5.3 | 6.6 | 29 | 7.5 | 100% | 0 | 0 | AB |
| goethite | 1.0 | 100% | 5.1 | 5.3 | 6.3 | 0.5 | 2.0 | 95% | 0 | 0 |  |
| hematite | 1.0 | 100% | 5.1 | 5.3 | 4.7 | <0.1 | 1.0 | 71% | 0 | 0 | AB |
| magnetite | 1.7 | 100% | 8.5 | 4.8 | 0 | <0.1 | 0.15 | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 33% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT siderite (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT hematite (sim grows it in 100% of seeds; no photo, no listing); ABSENT magnetite (sim grows it in 100% of seeds; no photo, no listing)

### asbestos_hills_surficial_alteration  ←  asbestos_hills   (sim 21 seeds; 25 photos; 29 listing mentions)
ρ(sim visible-count, real) = 0.10 [5–95 % band: seeds 0.07 to 0.11, proxies -0.08 to 0.32, both -0.11 to 0.33; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.20   ρ(sim surviving count, real) = -0.02   ρ(sim ≥ 0.1 mm count, real) = 0.03
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tigers_eye | 3.0 | 100% | 15 | 15 | 15 | 3.0 | 3.0 | 100% | 84 | 79 | CO |
| crocidolite | 3.0 | 100% | 15 | 15 | 19 | 0.8 | 1.8 | 100% | 4.0 | 6.9 | AB |
| x:jasper | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.0 | 6.9 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.0 | 0 |  |
| amosite | 3.0 | 100% | 15 | 15 | 14 | 0.3 | 1.3 | 100% | 0 | 3.4 | ND |
| quartz | 1.0 | 100% | 4.8 | 5.0 | 0 | <0.1 | 0.29 | 0% | 0 | 3.4 | AB |
| opal | 5.0 | 100% | 24 | 25 | 33 | 72 | 6.6 | 100% | 0 | 0 | ND |
| siderite | 1.0 | 100% | 4.8 | 5.0 | 6.6 | 22 | 7.3 | 100% | 0 | 0 | AB |
| goethite | 1.0 | 100% | 4.8 | 5.0 | 6.3 | 1.6 | 3.1 | 95% | 0 | 0 |  |
| hematite | 1.0 | 100% | 4.8 | 5.0 | 6.0 | 0.3 | 1.7 | 90% | 0 | 0 | AB |
| lepidocrocite | 1.1 | 100% | 5.3 | 4.1 | 0 | <0.1 | 0.13 | 0% | 0 | 0 |  |
| magnetite | 1.5 | 100% | 7.4 | 5.0 | 0 | <0.1 | 0.18 | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 33% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT siderite (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT hematite (sim grows it in 100% of seeds; no photo, no listing); ABSENT lepidocrocite (sim grows it in 100% of seeds; no photo, no listing); ABSENT magnetite (sim grows it in 100% of seeds; no photo, no listing)

### bisbee  ←  bisbee   (sim 21 seeds; 161 photos; 793 listing mentions)
ρ(sim visible-count, real) = -0.49 [5–95 % band: seeds -0.52 to -0.49, proxies -0.57 to -0.47, both -0.58 to -0.47; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.36   ρ(sim surviving count, real) = -0.47   ρ(sim ≥ 0.1 mm count, real) = -0.43
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| malachite | 1.0 | 100% | 0.9 | 1.3 | 2.1 | 43 | 65.4 | 100% | 14 | 24 |  |
| azurite | 4.0 | 100% | 3.6 | 4.4 | 0 | <0.1 | 0.51 | 0% | 14 | 18 |  |
| native_copper | 0.7 | 71% | 0.6 | 0 | 0 | <0.1 | 0.07 | 0% | 15 | 9.3 |  |
| cuprite | 1.1 | 100% | 1.0 | 1.3 | 0 | <0.1 | 0.36 | 0% | 14 | 6.3 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.1 | 8.6 |  |
| turquoise | 3.6 | 100% | 3.2 | 4.3 | 2.2 | <0.1 | 0.60 | 29% | 0 | 7.7 |  |
| chrysocolla | 6.2 | 100% | 5.6 | 7.5 | 9.5 | 1.1 | 6.4 | 100% | 1.2 | 3.5 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.9 | 2.4 |  |
| ma:hetaerolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.7 | 0 |  |
| bornite | 2.9 | 100% | 2.6 | 2.7 | 0 | <0.1 | 0.39 | 0% | 1.9 | 1.6 |  |
| brochantite | 5.0 | 100% | 4.4 | 6.3 | 5.5 | <0.1 | 2.0 | 90% | 1.9 | 1.4 |  |
| cerussite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.9 | 0.6 |  |
| aurichalcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.2 | 1.0 |  |
| goethite | 3.0 | 100% | 2.7 | 3.8 | 4.8 | 0.3 | 5.3 | 100% | 0.6 | 0.8 |  |
| native_gold | 13.0 | 100% | 12 | 5.8 | 1.5 | <0.1 | 0.82 | 29% | 0.6 | 0.6 | UN |
| chalcocite | 3.8 | 100% | 3.4 | 4.6 | 1.4 | <0.1 | 1.0 | 52% | 0 | 1.0 |  |
| opal | 5.7 | 100% | 5.1 | 6.9 | 9.4 | 0.1 | 3.3 | 100% | 0 | 0.1 |  |
| chalcedony | 4.0 | 100% | 3.6 | 5.1 | 8.2 | <0.1 | 4.6 | 100% | 0 | 0.1 |  |
| atacamite | 8.1 | 100% | 7.3 | 10 | 16 | 15 | 14.2 | 100% | 0 | 0 | doc |
| jarosite | 6.0 | 100% | 5.3 | 7.5 | 9.5 | <0.1 | 3.7 | 100% | 0 | 0 |  |
| acanthite | 4.2 | 100% | 3.8 | 5.1 | 7.9 | <0.1 | 3.5 | 100% | 0 | 0 |  |
| covellite | 3.6 | 95% | 3.2 | 4.6 | 4.7 | <0.1 | 2.0 | 76% | 0 | 0 |  |
| albite | 2.0 | 100% | 1.8 | 2.6 | 4.1 | 0.1 | 8.3 | 100% | 0 | 0 |  |
| feldspar | 2.0 | 100% | 1.8 | 2.6 | 3.4 | <0.1 | 3.3 | 100% | 0 | 0 |  |
| lepidocrocite | 14.5 | 100% | 13 | 3.8 | 0.6 | <0.1 | 0.35 | 29% | 0 | 0 | doc |
| dioptase | 4.8 | 100% | 4.3 | 1.5 | 0 | <0.1 | 0.08 | 0% | 0 | 0 | RA |

Flags: UNDER azurite (photos 14%; sim 0% of visible crystals); UNDER native_copper (photos 15%; sim 0% of visible crystals); UNDER cuprite (photos 14%; sim 0% of visible crystals); OVER atacamite (sim 16% of visible crystals; photos 0%, listings 0%); ABSENT atacamite (sim grows it in 100% of seeds; no photo, no listing); ABSENT jarosite (sim grows it in 100% of seeds; no photo, no listing); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); ABSENT covellite (sim grows it in 95% of seeds; no photo, no listing); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT lepidocrocite (sim grows it in 100% of seeds; no photo, no listing); ABSENT dioptase (sim grows it in 100% of seeds; no photo, no listing)

### chiastolite_hornfels  ←  chiastolite_hornfels   (sim 21 seeds; 3 photos — does not vote; 64 listing mentions)
ρ(sim visible-count, real) = 0.66 [5–95 % band: seeds 0.66 to 0.66, proxies 0.66 to 0.71, both 0.65 to 0.71; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.12   ρ(sim surviving count, real) = 0.08   ρ(sim ≥ 0.1 mm count, real) = 0.43
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| andalusite | 5.0 | 100% | 71 | 83 | 100 | 90 | 1.2 | 100% | 100 | 89 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 4.7 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.1 |  |
| feldspar | 1.0 | 100% | 14 | 17 | 0 | 9.9 | 0.69 | 0% | 0 | 1.6 | ND |
| tourmaline | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.6 |  |
| albite | 1.0 | 100% | 14 | 0 | 0 | <0.1 | 0.00 | 0% | 0 | 0 | ND |

Flags: ABSENT albite (sim grows it in 100% of seeds; no photo, no listing)

### colorado_plateau  ←  colorado_plateau   (sim 21 seeds; 81 photos; 18 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.19 [5–95 % band: seeds -0.19 to -0.18, proxies -0.32 to -0.09, both -0.35 to -0.08; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.19   ρ(sim surviving count, real) = -0.19   ρ(sim ≥ 0.1 mm count, real) = -0.19
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| x:pascoite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 11 | 5.6 |  |
| ma:hughesite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.6 | 0 |  |
| ma:dickthomssenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| ma:lasalite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| ma:magnesiopascoite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| x:hewettite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.9 | 0 |  |
| tyuyamunite | 5.0 | 100% | 29 | 29 | 38 | 5.7 | 4.4 | 100% | 3.7 | 0 | CO |
| ma:martyite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.7 | 0 |  |
| ma:metahewettite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:metamunirite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:navajoite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:postite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| carnotite | 4.0 | 100% | 23 | 23 | 0 | <0.1 | 0.81 | 0% | 1.2 | 0 | AB |
| x:hummerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.2 | 22 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.2 | 11 |  |
| opal | 5.0 | 100% | 30 | 30 | 39 | 0.8 | 2.1 | 100% | 0 | 0 | RA |
| uranophane | 3.0 | 100% | 18 | 18 | 23 | 93 | 12.6 | 100% | 0 | 0 | RA |
| x:pintadoite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 17 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 11 |  |
| chalcocite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| covellite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| native_silver | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| x:corvusite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |
| x:roscoelite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |

Flags: UNDER x:pascoite (photos 11%; sim 0% of visible crystals — NO ENGINE); OVER opal (sim 39% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); OVER uranophane (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT uranophane (sim grows it in 100% of seeds; no photo, no listing)

### cooling  ←  herkimer   (sim 21 seeds; 29 photos; 748 listing mentions)
ρ(sim visible-count, real) = — [5–95 % band: seeds —, proxies —, both —; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.55   ρ(sim surviving count, real) = 0.55   ρ(sim ≥ 0.1 mm count, real) = 0.55
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 1.0 | 100% | 100 | 100 | 0 | 100 | 0.57 | 0% | 97 | 92 | AB |
| x:bitumen | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.4 | 4.4 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.9 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.7 | AB |
| barite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.3 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.3 |  |
| apophyllite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.1 |  |
| x:kyanite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.1 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |

Flags: UNDER quartz (photos 97%; sim 0% of visible crystals)

### deccan_zeolite  ←  deccan   (sim 21 seeds; 923 photos; 2351 listing mentions)
ρ(sim visible-count, real) = 0.04 [5–95 % band: seeds 0.01 to 0.06, proxies 0.00 to 0.06, both -0.01 to 0.07; verdict differs in 0 / 4 / 9 % of resamples]   ρ(sim volume, real) = 0.02   ρ(sim surviving count, real) = 0.09   ρ(sim ≥ 0.1 mm count, real) = 0.20
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| apophyllite | 1.0 | 100% | 3.2 | 3.6 | 3.7 | 0.3 | 1.6 | 62% | 20 | 25 | CO |
| stilbite | 4.3 | 100% | 14 | 15 | 0 | 0.1 | 0.88 | 0% | 11 | 26 | AB |
| heulandite | 4.4 | 100% | 14 | 16 | 17 | 7.4 | 3.3 | 100% | 6.5 | 8.7 | AB |
| x:cavansite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 10 | 3.3 |  |
| chalcedony | 4.0 | 100% | 13 | 14 | 20 | 1.4 | 1.7 | 100% | 1.7 | 9.6 | AB |
| calcite | 1.0 | 100% | 3.2 | 3.6 | 5.6 | 0.5 | 1.7 | 95% | 5.7 | 5.2 | CO |
| scolecite | 1.6 | 100% | 5.2 | 3.4 | 5.6 | 0.2 | 1.3 | 95% | 4.4 | 4.1 | CO |
| x:okenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.2 | 3.0 | CO |
| quartz | 3.0 | 100% | 9.7 | 11 | 17 | 78 | 8.0 | 100% | 2.9 | 4.1 | AB |
| x:gyrolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.6 | 1.0 | CO |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.3 | 0.9 |  |
| mesolite | 1.0 | 100% | 3.2 | 1.4 | 0 | <0.1 | 0.03 | 0% | 3.9 | 0.6 | CO |
| x:pentagonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.0 | 0.4 |  |
| prehnite | 1.1 | 100% | 3.7 | 3.6 | 0 | <0.1 | 0.27 | 0% | 2.6 | 1.1 | CO |
| x:laumontite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 0.2 | CO |
| hematite | 1.0 | 100% | 3.2 | 3.6 | 5.9 | 4.2 | 3.7 | 100% | 0 | 0.3 |  |
| goethite | 1.0 | 100% | 3.2 | 3.6 | 5.6 | 0.9 | 2.1 | 95% | 0.1 | 0 | ND |
| albite | 2.3 | 100% | 7.4 | 7.1 | 11 | 7.3 | 4.1 | 100% | 0 | 0 | RA |
| pectolite | 4.0 | 100% | 13 | 14 | 8.2 | 0.4 | 1.3 | 95% | 0 | 0 | ND |
| feldspar | 1.0 | 100% | 3.4 | 0 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |

Flags: UNDER stilbite (photos 11%; sim 0% of visible crystals); UNDER x:cavansite (photos 10%; sim 0% of visible crystals — NO ENGINE); OVER albite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT pectolite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing)

### elmwood  ←  elmwood   (sim 21 seeds; 193 photos; 820 listing mentions)
ρ(sim visible-count, real) = 0.34 [5–95 % band: seeds 0.34 to 0.34, proxies 0.30 to 0.42, both 0.30 to 0.38; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.40   ρ(sim surviving count, real) = 0.16   ρ(sim ≥ 0.1 mm count, real) = 0.29
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 1.0 | 100% | 6.3 | 6.3 | 11 | 17 | 10.3 | 100% | 46 | 22 | CO |
| calcite | 1.0 | 100% | 6.3 | 6.3 | 11 | 45 | 14.2 | 100% | 23 | 28 | AB |
| sphalerite | 1.0 | 100% | 6.3 | 6.3 | 11 | 2.9 | 5.7 | 100% | 20 | 30 | AB |
| barite | 6.0 | 100% | 38 | 38 | 0 | <0.1 | 0.59 | 0% | 3.1 | 6.6 | CO |
| galena | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.7 | 2.7 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.6 | 5.5 | UN |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.5 | 2.6 |  |
| x:bitumen | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 |  |
| marcasite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.2 |  |
| celestine | 6.0 | 100% | 38 | 38 | 66 | 35 | 7.6 | 100% | 0 | 0.1 | UN |
| chalcedony | 1.0 | 100% | 6.3 | 6.0 | 0 | <0.1 | 0.56 | 0% | 0 | 0 | ND |

Flags: OVER celestine (sim 66% of visible crystals; photos 0%, listings 0.1%); ABSENT chalcedony (sim grows it in 100% of seeds; no photo, no listing)

### epithermal_telluride  ←  cripple_creek   (sim 21 seeds; 69 photos; 164 listing mentions)
ρ(sim visible-count, real) = 0.09 [5–95 % band: seeds 0.09 to 0.10, proxies 0.04 to 0.21, both 0.03 to 0.21; verdict differs in 0 / 40 / 39 % of resamples]   ρ(sim volume, real) = 0.07   ρ(sim surviving count, real) = 0.07   ρ(sim ≥ 0.1 mm count, real) = 0.07
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| calaverite | 2.0 | 100% | 7.4 | 8.8 | 10 | 9.5 | 10.1 | 100% | 39 | 24 | AB |
| native_gold | 4.0 | 100% | 15 | 18 | 19 | 0.4 | 3.1 | 100% | 20 | 15 | CO-oxidized |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 13 | 12 | AB |
| sylvanite | 2.0 | 100% | 7.4 | 8.8 | 10 | 9.4 | 10.1 | 100% | 12 | 6.7 | CO |
| quartz | 3.2 | 100% | 12 | 14 | 15 | 1.4 | 4.6 | 100% | 1.4 | 12 | AB |
| turquoise | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 6.1 |  |
| ma:melonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.8 | 0 |  |
| x:laumontite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 5.5 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 5.5 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.4 | 2.4 |  |
| native_tellurium | 3.6 | 100% | 13 | 0 | 0 | <0.1 | 0.03 | 0% | 2.9 | 0.6 | RA |
| x:petzite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.4 | 0.6 |  |
| native_silver | 4.0 | 100% | 15 | 18 | 20 | 5.6 | 7.0 | 100% | 0 | 1.8 | ND |
| x:krennerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.4 | 0 | UN |
| stibnite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.4 | 0 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.6 | CO |
| hessite | 3.0 | 100% | 11 | 13 | 15 | 71 | 17.3 | 100% | 0 | 0 | RA |
| feldspar | 2.0 | 100% | 7.4 | 8.8 | 10 | 2.4 | 7.5 | 100% | 0 | 0 | CO |
| albite | 3.2 | 100% | 12 | 11 | 1.7 | <0.1 | 0.77 | 24% | 0 | 0 | ND |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: UNDER fluorite (photos 13%; sim 0% of visible crystals); OVER hessite (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT hessite (sim grows it in 100% of seeds; no photo, no listing); OVER feldspar (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing)

### gem_pegmatite  ←  cruzeiro   (sim 21 seeds; 58 photos; 153 listing mentions)
ρ(sim visible-count, real) = 0.18 [5–95 % band: seeds 0.16 to 0.23, proxies -0.07 to 0.33, both -0.06 to 0.32; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.18   ρ(sim surviving count, real) = 0.23   ρ(sim ≥ 0.1 mm count, real) = 0.41
Verdict TIE-DEPENDENT: DISAGREES or PARTLY depending on how ties break (sim top three: albite, feldspar, quartz; sim lead: albite = feldspar).
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tourmaline | 3.0 | 100% | 15 | 25 | 0 | <0.1 | 0.37 | 0% | 88 | 78 | AB |
| quartz | 3.0 | 100% | 15 | 25 | 30 | <0.1 | 1.6 | 100% | 6.9 | 8.5 | AB |
| lepidolite | 3.6 | 100% | 18 | 0 | 0 | <0.1 | 0.01 | 0% | 0 | 6.5 | CO |
| x:muscovite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.4 | 1.3 | CO |
| albite | 1.9 | 100% | 9.6 | 19 | 35 | 2.9 | 25.3 | 100% | 0 | 2.6 | AB |
| torbernite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.7 | 0 |  |
| feldspar | 1.9 | 100% | 9.6 | 19 | 35 | 97 | 54.1 | 100% | 0 | 0.7 | AB |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| native_gold | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| cassiterite | 4.5 | 100% | 23 | 0 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | RA |
| spodumene | 1.8 | 100% | 9.1 | 12 | 0 | <0.1 | 0.20 | 0% | 0 | 0 | UN |

Flags: UNDER tourmaline (photos 88%; sim 0% of visible crystals); OVER feldspar (sim 35% of visible crystals; photos 0%, listings 0.7%); ABSENT cassiterite (sim grows it in 100% of seeds; no photo, no listing); ABSENT spodumene (sim grows it in 100% of seeds; no photo, no listing)

### great_salt_plains  ←  great_salt_plains   (sim 21 seeds; 2 photos — does not vote; 13 listing mentions — does not vote)
ρ(sim visible-count, real) = — [5–95 % band: seeds —, proxies —, both —; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —   ρ(sim ≥ 0.1 mm count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| halite | 11.3 | 100% | 85 | 84 | 69 | <0.1 | 3.0 | 100% | 0 | 0 | AB-crust |
| selenite | 2.0 | 100% | 15 | 16 | 31 | 100 | 40.6 | 100% | 100 | 100 | AB |

Flags: OVER halite (sim 69% of visible crystals; photos 0%, listings 0%); ABSENT halite (sim grows it in 100% of seeds; no photo, no listing)

### grimsel_alpine_cleft  ←  grimsel   (sim 21 seeds; 204 photos; 4 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.15 [5–95 % band: seeds -0.18 to -0.14, proxies -0.44 to -0.02, both -0.40 to 0.01; verdict differs in 0 / 2 / 4 % of resamples]   ρ(sim volume, real) = -0.25   ρ(sim surviving count, real) = 0.02   ρ(sim ≥ 0.1 mm count, real) = 0.05
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 3.8 | 100% | 13 | 12 | 16 | 24 | 6.8 | 100% | 50 | 75 | AB |
| fluorite | 1.0 | 100% | 3.5 | 4.0 | 0 | <0.1 | 0.51 | 0% | 30 | 25 | CO |
| epidote | 5.7 | 100% | 20 | 19 | 4.3 | <0.1 | 1.0 | 81% | 2.0 | 0 | UN |
| rutile | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| titanite | 4.0 | 100% | 14 | 13 | 12 | <0.1 | 1.1 | 95% | 1.5 | 0 | RA |
| hematite | 1.4 | 100% | 5.0 | 4.0 | 5.3 | 0.1 | 1.3 | 100% | 1.5 | 0 | CO (S) |
| x:anatase | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| ma:senaite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| feldspar | 2.0 | 100% | 7.0 | 7.9 | 10 | 4.2 | 5.2 | 100% | 1.0 | 0 | CO |
| ma:grimselite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| x:milarite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| x:zircon | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| apatite | 6.0 | 100% | 21 | 24 | 31 | 0.6 | 1.6 | 100% | 0.5 | 0 | UN |
| x:chlorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.5 | 0 | AB |
| albite | 2.0 | 100% | 7.0 | 7.9 | 10 | 7.9 | 6.5 | 100% | 0 | 0 |  |
| calcite | 1.0 | 100% | 3.5 | 4.0 | 5.3 | 62 | 13.0 | 100% | 0 | 0 | CO |
| apophyllite | 1.8 | 100% | 6.1 | 4.0 | 5.1 | 0.3 | 2.2 | 95% | 0 | 0 | RA (S) |

Flags: UNDER fluorite (photos 30%; sim 0% of visible crystals); OVER feldspar (sim 10% of visible crystals; photos 1.0%, listings 0%); OVER apatite (sim 31% of visible crystals; photos 0.5%, listings 0%); OVER albite (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT apophyllite (sim grows it in 100% of seeds; no photo, no listing)

### jeffrey_mine  ←  jeffrey_mine   (sim 21 seeds; 158 photos; 414 listing mentions)
ρ(sim visible-count, real) = 0.20 [5–95 % band: seeds 0.15 to 0.23, proxies 0.08 to 0.32, both 0.07 to 0.28; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.18   ρ(sim surviving count, real) = 0.26   ρ(sim ≥ 0.1 mm count, real) = 0.23
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| grossular | 4.8 | 100% | 12 | 11 | 13 | 1.8 | 6.0 | 100% | 59 | 52 | AB |
| vesuvianite | 4.0 | 100% | 9.7 | 11 | 16 | 20 | 12.6 | 100% | 14 | 26 | CO |
| diopside | 4.0 | 100% | 9.7 | 11 | 16 | 72 | 12.7 | 100% | 7.6 | 8.9 | AB |
| pectolite | 3.7 | 100% | 8.9 | 6.3 | 0.6 | <0.1 | 0.30 | 4.8% | 8.9 | 3.6 | UN |
| prehnite | 4.6 | 100% | 11 | 11 | 10 | 0.7 | 3.6 | 95% | 2.5 | 2.2 | CO |
| x:chlorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.9 | 1.0 | CO |
| apophyllite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.6 | 1.2 |  |
| chrysotile | 1.2 | 100% | 2.9 | 2.8 | 3.4 | <0.1 | 1.9 | 86% | 1.3 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.2 |  |
| brucite | 4.1 | 100% | 9.9 | 10.0 | 5.9 | <0.1 | 1.1 | 81% | 0.6 | 0 |  |
| ma:allanite group | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| ma:alumovesuvianite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| ma:heazlewoodite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| albite | 2.0 | 100% | 4.9 | 5.4 | 8.0 | 5.1 | 11.0 | 100% | 0 | 0.5 |  |
| x:zoisite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0.5 | CO |
| wollastonite | 1.9 | 100% | 4.5 | 2.8 | 0 | <0.1 | 0.43 | 0% | 0 | 0.2 | CO |
| actinolite | 4.0 | 100% | 9.7 | 11 | 11 | 0.6 | 4.4 | 100% | 0 | 0 |  |
| awaruite | 3.0 | 100% | 7.3 | 8.1 | 11 | 0.4 | 3.5 | 100% | 0 | 0 | ND? (S) |
| calcite | 1.0 | 100% | 2.4 | 2.7 | 4.0 | <0.1 | 2.0 | 100% | 0 | 0 |  |
| datolite | 3.0 | 100% | 7.3 | 7.5 | 1.7 | <0.1 | 0.69 | 33% | 0 | 0 | ND? (S) |

Flags: OVER actinolite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT actinolite (sim grows it in 100% of seeds; no photo, no listing); OVER awaruite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT awaruite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT datolite (sim grows it in 100% of seeds; no photo, no listing)

### ultramafic_supergene  ←  marlborough   (sim 21 seeds; 10 photos — does not vote; 25 listing mentions)
ρ(sim visible-count, real) = 0.22 [5–95 % band: seeds 0.22 to 0.22, proxies 0.22 to 0.46, both 0.22 to 0.46; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.11   ρ(sim surviving count, real) = 0.02   ρ(sim ≥ 0.1 mm count, real) = 0.22
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| chrysoprase | 3.0 | 100% | 28 | 38 | 38 | 15 | 5.6 | 100% | 100 | 96 | CO |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 4.0 | AB |
| opal | 5.0 | 100% | 46 | 63 | 63 | 85 | 8.4 | 100% | 0 | 0 | ND |
| calcite | 1.9 | 100% | 17 | 0 | 0 | <0.1 | 0.00 | 0% | 0 | 0 | ND |
| dolomite | 1.0 | 100% | 9.2 | 0 | 0 | 0 | — | 0% | 0 | 0 | ND |
| x:magnesite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 63% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT dolomite (sim grows it in 100% of seeds; no photo, no listing)

### marble_contact_metamorphism  ←  mogok   (sim 21 seeds; 163 photos; 178 listing mentions)
ρ(sim visible-count, real) = — [5–95 % band: seeds —, proxies —, both —; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —   ρ(sim ≥ 0.1 mm count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| x:spinel | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 36 | 21 | CO |
| ruby | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 7.4 | 16 | CO |
| x:painite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 15 | 4.5 |  |
| sapphire | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.6 | 17 |  |
| tourmaline | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.5 | 7.9 |  |
| x:phenakite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.3 | 4.5 |  |
| topaz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.7 | 3.4 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 4.5 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.9 |  |
| aquamarine | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 1.7 |  |
| feldspar | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| corundum | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.2 | 1.1 |  |
| actinolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| ma:petalite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| beryl | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.2 | 0.6 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.1 | AB |

Flags: UNDER x:spinel (photos 36%; sim 0% of visible crystals — NO ENGINE); UNDER x:painite (photos 15%; sim 0% of visible crystals — NO ENGINE)

### mvt  ←  tri_state_picher   (sim 21 seeds; 51 photos; 478 listing mentions)
ρ(sim visible-count, real) = -0.35 [5–95 % band: seeds -0.41 to -0.35, proxies -0.38 to -0.25, both -0.37 to -0.25; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.12   ρ(sim surviving count, real) = -0.48   ρ(sim ≥ 0.1 mm count, real) = -0.31
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| galena | 1.0 | 100% | 1.3 | 5.5 | 7.1 | 2.6 | 11.6 | 100% | 49 | 19 | AB |
| sphalerite | 1.5 | 100% | 2.0 | 7.9 | 4.4 | <0.1 | 1.1 | 62% | 25 | 28 | AB |
| calcite | 1.0 | 100% | 1.3 | 5.5 | 7.1 | 94 | 38.5 | 100% | 7.8 | 16 | AB |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.9 | 14 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.9 | 7.7 | AB |
| marcasite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.9 | 4.0 | CO |
| quartz | 1.2 | 95% | 1.6 | 0.5 | 0 | <0.1 | 0.01 | 0% | 0 | 2.9 | UN |
| barite | 55.6 | 100% | 74 | 0 | 0 | <0.1 | 0.04 | 0% | 2.0 | 0.8 | UN |
| pyrite | 1.1 | 100% | 1.5 | 5.5 | 6.4 | <0.1 | 1.9 | 90% | 0 | 2.7 | CO |
| fluorite | 1.0 | 100% | 1.3 | 5.5 | 7.1 | 3.4 | 12.9 | 100% | 0 | 0.4 | RA |
| anhydrite | 7.6 | 100% | 10 | 41 | 45 | 0.3 | 3.6 | 95% | 0 | 0 | ND |
| greenockite | 5.3 | 100% | 7.1 | 29 | 23 | <0.1 | 2.3 | 100% | 0 | 0 | RA-coating |

Flags: OVER anhydrite (sim 45% of visible crystals; photos 0%, listings 0%); ABSENT anhydrite (sim grows it in 100% of seeds; no photo, no listing); OVER greenockite (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT greenockite (sim grows it in 100% of seeds; no photo, no listing)

### naica_geothermal  ←  naica   (sim 21 seeds; 134 photos; 355 listing mentions)
ρ(sim visible-count, real) = -0.10 [5–95 % band: seeds -0.10 to -0.10, proxies -0.11 to -0.09, both -0.10 to -0.09; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.10   ρ(sim surviving count, real) = -0.10   ρ(sim ≥ 0.1 mm count, real) = -0.10
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 37 | 22 | AB |
| selenite | 1.0 | 100% | 14 | 14 | 14 | 47 | 2.8 | 100% | 16 | 19 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.0 | 14 | CO |
| galena | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.2 | 10 |  |
| sphalerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.7 | 9.6 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.7 | 7.9 |  |
| anhydrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.2 | 3.4 | CO |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 5.9 |  |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 2.8 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 0.3 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.7 | 0 |  |
| celestine | 6.0 | 100% | 86 | 86 | 86 | 53 | 2.2 | 100% | 0 | 0 | UN-crust |

Flags: UNDER fluorite (photos 37%; sim 0% of visible crystals); OVER celestine (sim 86% of visible crystals; photos 0%, listings 0%); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing)

### tn457_barite_pulses  ←  north_pennines   (sim 21 seeds; 391 photos; 418 listing mentions)
ρ(sim visible-count, real) = -0.02 [5–95 % band: seeds -0.02 to -0.02, proxies -0.23 to 0.09, both -0.23 to 0.14; verdict differs in 0 / 23 / 30 % of resamples]   ρ(sim volume, real) = -0.02   ρ(sim surviving count, real) = -0.02   ρ(sim ≥ 0.1 mm count, real) = -0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 56 | 63 | AB |
| galena | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 13 | 6.2 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.6 | 11 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.4 | 5.3 | CO |
| sphalerite | 1.0 | 100% | 14 | 14 | 14 | 13 | 6.0 | 100% | 4.6 | 2.2 | CO |
| witherite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.3 | 1.4 | CO |
| siderite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.3 | 2.2 | CO |
| x:barytocalcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0.7 |  |
| barite | 6.0 | 100% | 86 | 86 | 86 | 87 | 4.2 | 100% | 0.5 | 1.4 | CO |
| erythrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0.5 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 | CO |
| selenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |

Flags: UNDER fluorite (photos 56%; sim 0% of visible crystals); UNDER galena (photos 13%; sim 0% of visible crystals)

### reactivated_fluorite_vein  ←  north_pennines   (sim 21 seeds; 391 photos; 418 listing mentions)
ρ(sim visible-count, real) = -0.28 [5–95 % band: seeds -0.28 to -0.28, proxies -0.38 to -0.22, both -0.38 to -0.22; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.08   ρ(sim surviving count, real) = -0.30   ρ(sim ≥ 0.1 mm count, real) = -0.25
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 1.0 | 100% | 2.8 | 3.0 | 3.9 | 3.5 | 17.6 | 100% | 56 | 63 | AB |
| galena | 1.0 | 100% | 2.8 | 3.0 | 3.9 | 0.4 | 8.5 | 100% | 13 | 6.2 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.6 | 11 | AB |
| calcite | 1.0 | 100% | 2.8 | 3.0 | 3.9 | 96 | 38.6 | 100% | 6.4 | 5.3 | CO |
| sphalerite | 1.7 | 100% | 4.7 | 3.1 | 0 | <0.1 | 0.90 | 0% | 4.6 | 2.2 | CO |
| witherite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.3 | 1.4 | CO |
| siderite | 1.0 | 100% | 2.8 | 3.0 | 3.9 | <0.1 | 1.4 | 100% | 1.3 | 2.2 | CO |
| x:barytocalcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0.7 |  |
| barite | 6.0 | 100% | 17 | 18 | 23 | <0.1 | 1.3 | 100% | 0.5 | 1.4 | CO |
| erythrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0.5 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 | CO |
| selenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| celestine | 6.0 | 100% | 17 | 18 | 22 | <0.1 | 2.2 | 100% | 0 | 0 | ND |
| acanthite | 4.0 | 100% | 11 | 12 | 13 | <0.1 | 2.2 | 100% | 0 | 0 | ND |
| greenockite | 5.0 | 100% | 14 | 15 | 12 | <0.1 | 2.0 | 100% | 0 | 0 | RA-coating |
| anhydrite | 7.5 | 100% | 21 | 20 | 10 | <0.1 | 1.8 | 95% | 0 | 0 | ND |
| rhodochrosite | 1.0 | 100% | 2.8 | 3.0 | 3.9 | <0.1 | 3.7 | 100% | 0 | 0 | ND |
| native_silver | 0.4 | 29% | 1.1 | 0 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |

Flags: OVER celestine (sim 22% of visible crystals; photos 0%, listings 0%); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing); OVER acanthite (sim 13% of visible crystals; photos 0%, listings 0%); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); OVER greenockite (sim 12% of visible crystals; photos 0%, listings 0%); ABSENT greenockite (sim grows it in 100% of seeds; no photo, no listing); OVER anhydrite (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT anhydrite (sim grows it in 100% of seeds; no photo, no listing); ABSENT rhodochrosite (sim grows it in 100% of seeds; no photo, no listing); ABSENT native_silver (sim grows it in 29% of seeds; no photo, no listing)

### ouro_preto  ←  ouro_preto   (sim 21 seeds; 46 photos; 84 listing mentions)
ρ(sim visible-count, real) = 0.03 [5–95 % band: seeds 0.03 to 0.03, proxies -0.23 to 0.17, both -0.23 to 0.17; verdict differs in 0 / 34 / 40 % of resamples]   ρ(sim volume, real) = -0.26   ρ(sim surviving count, real) = 0.03   ρ(sim ≥ 0.1 mm count, real) = 0.03
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| topaz | 6.0 | 100% | 38 | 40 | 45 | 0.4 | 4.6 | 100% | 50 | 79 | CO |
| hematite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 28 | 7.1 | CO |
| x:euclase | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.7 | 8.3 | RA |
| quartz | 5.7 | 100% | 36 | 33 | 25 | 0.4 | 4.6 | 100% | 2.2 | 1.2 | AB |
| native_gold | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 1.2 |  |
| goethite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 2.4 |  |
| ma:gibbsite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| ma:leucosphenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| malachite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| rutile | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.2 |  |
| albite | 2.1 | 100% | 13 | 14 | 15 | 47 | 36.8 | 100% | 0 | 0 | ND |
| feldspar | 2.0 | 100% | 13 | 13 | 15 | 52 | 23.8 | 100% | 0 | 0 | ND |

Flags: UNDER hematite (photos 28%; sim 0% of visible crystals); OVER albite (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); OVER feldspar (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing)

### porphyry  ←  bingham   (sim 21 seeds; 30 photos; 52 listing mentions)
ρ(sim visible-count, real) = -0.33 [5–95 % band: seeds -0.34 to -0.31, proxies -0.46 to -0.20, both -0.45 to -0.19; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.32   ρ(sim surviving count, real) = -0.47   ρ(sim ≥ 0.1 mm count, real) = -0.45
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| pyrite | 1.0 | 100% | 2.2 | 2.2 | 1.7 | <0.1 | 2.4 | 52% | 10 | 27 | AB |
| tetrahedrite | 1.0 | 100% | 2.2 | 0 | 0 | 0 | — | 0% | 10 | 7.7 | CO |
| ma:faustite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 17 | 0 |  |
| galena | 4.0 | 100% | 8.6 | 9.3 | 13 | 2.5 | 11.1 | 100% | 6.7 | 7.7 | CO |
| x:wavellite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 10 | 1.9 |  |
| x:okenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 10 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 5.8 | AB |
| molybdenite | 3.0 | 100% | 6.5 | 7.0 | 9.5 | 76 | 32.2 | 100% | 6.7 | 1.9 | CO |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 7.7 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 3.8 |  |
| ma:arseniosiderite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.7 | 0 |  |
| chalcopyrite | 1.0 | 100% | 2.2 | 2.3 | 3.2 | 0.7 | 9.1 | 100% | 0 | 5.8 | AB |
| x:vivianite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.8 |  |
| enargite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.8 |  |
| brochantite | 4.7 | 100% | 10 | 11 | 14 | 0.2 | 4.0 | 100% | 3.3 | 0 |  |
| albite | 2.0 | 100% | 4.3 | 4.7 | 5.1 | <0.1 | 1.9 | 95% | 3.3 | 0 |  |
| azurite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 0 |  |
| ferrimolybdite | 5.3 | 100% | 11 | 12 | 16 | 16 | 18.9 | 100% | 0 | 0 | RA (S) |
| acanthite | 4.0 | 100% | 8.6 | 9.3 | 13 | 0.1 | 3.4 | 100% | 0 | 0 | ND |
| arsenopyrite | 3.9 | 100% | 8.4 | 9.1 | 12 | 3.4 | 9.6 | 100% | 0 | 0 | RA (S) |
| feldspar | 2.0 | 100% | 4.3 | 4.7 | 6.2 | <0.1 | 2.3 | 100% | 0 | 0 |  |
| goethite | 2.0 | 100% | 4.3 | 4.7 | 3.5 | <0.1 | 1.2 | 95% | 0 | 0 |  |
| bismuthinite | 4.0 | 100% | 8.6 | 9.3 | 3.0 | <0.1 | 1.2 | 95% | 0 | 0 | RA (S) |
| anglesite | 4.0 | 100% | 8.6 | 9.3 | 0 | <0.1 | 0.76 | 0% | 0 | 0 |  |
| stibnite | 1.5 | 100% | 3.3 | 0 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |
| bornite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: UNDER pyrite (photos 10%; sim 1.7% of visible crystals); UNDER tetrahedrite (photos 10%; sim 0% of visible crystals); UNDER ma:faustite (photos 17%; sim 0% of visible crystals — NO ENGINE); UNDER x:wavellite (photos 10%; sim 0% of visible crystals — NO ENGINE); UNDER x:okenite (photos 10%; sim 0% of visible crystals — NO ENGINE); OVER ferrimolybdite (sim 16% of visible crystals; photos 0%, listings 0%); ABSENT ferrimolybdite (sim grows it in 100% of seeds; no photo, no listing); OVER acanthite (sim 13% of visible crystals; photos 0%, listings 0%); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); OVER arsenopyrite (sim 12% of visible crystals; photos 0%, listings 0%); ABSENT arsenopyrite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT bismuthinite (sim grows it in 100% of seeds; no photo, no listing); ABSENT anglesite (sim grows it in 100% of seeds; no photo, no listing); ABSENT stibnite (sim grows it in 100% of seeds; no photo, no listing)

### reactive_wall  ←  viburnum   (sim 21 seeds; 103 photos; 603 listing mentions)
ρ(sim visible-count, real) = 0.00 [5–95 % band: seeds 0.00 to 0.00, proxies -0.05 to 0.12, both -0.05 to 0.12; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.23   ρ(sim surviving count, real) = -0.32   ρ(sim ≥ 0.1 mm count, real) = -0.37
Verdict TIE-DEPENDENT: DISAGREES or PARTLY depending on how ties break (sim top three: galena, sphalerite, pyrite; sim lead: galena = sphalerite).
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 42 | 32 | CO |
| galena | 1.0 | 100% | 9.1 | 14 | 37 | 14 | 4.0 | 100% | 35 | 22 | AB |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 12 | 17 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 11 | AB |
| marcasite | 1.1 | 86% | 10 | 0 | 0 | <0.1 | 0.01 | 0% | 2.9 | 5.6 | CO (S) |
| pyrite | 1.3 | 100% | 12 | 14 | 26 | 4.7 | 2.7 | 71% | 1.9 | 5.8 | CO (S) |
| x:siegenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.9 | 1.8 | UN |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.3 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| sphalerite | 1.0 | 100% | 9.1 | 14 | 37 | 82 | 6.5 | 100% | 0 | 0.7 | UN |
| anhydrite | 6.6 | 100% | 60 | 58 | 0 | <0.1 | 0.19 | 0% | 0 | 0.2 | ND |

Flags: UNDER calcite (photos 42%; sim 0% of visible crystals); UNDER chalcopyrite (photos 12%; sim 0% of visible crystals); OVER sphalerite (sim 37% of visible crystals; photos 0%, listings 0.7%)

### roughten_gill  ←  roughton_gill   (sim 21 seeds; 69 photos; 126 listing mentions)
ρ(sim visible-count, real) = -0.08 [5–95 % band: seeds -0.09 to -0.05, proxies -0.27 to -0.01, both -0.28 to 0.00; verdict differs in 0 / 4 / 6 % of resamples]   ρ(sim volume, real) = -0.16   ρ(sim surviving count, real) = -0.16   ρ(sim ≥ 0.1 mm count, real) = -0.10
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| pyromorphite | 6.0 | 100% | 9.9 | 12 | 16 | 2.2 | 6.0 | 100% | 17 | 22 | AB |
| mimetite | 1.2 | 100% | 2.0 | 0.2 | 0 | <0.1 | 0.05 | 0% | 5.8 | 29 | CO |
| quartz | 1.0 | 100% | 1.7 | 2.0 | 0 | <0.1 | 0.23 | 0% | 0 | 18 | AB |
| hemimorphite | 3.6 | 100% | 5.9 | 6.1 | 8.0 | <0.1 | 1.4 | 100% | 10 | 1.6 | CO |
| cerussite | 4.2 | 100% | 7.0 | 8.1 | 8.4 | <0.1 | 1.4 | 100% | 5.8 | 2.4 | AB |
| plumbogummite | 3.0 | 100% | 4.9 | 5.6 | 2.0 | <0.1 | 1.1 | 57% | 5.8 | 1.6 | CO |
| linarite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.8 | 1.6 | CO |
| caledonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.8 | 0.8 |  |
| leadhillite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.3 | 0.8 |  |
| calcite | 1.0 | 100% | 1.7 | 2.0 | 2.9 | 0.1 | 3.8 | 100% | 1.4 | 3.2 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.9 | 0.8 |  |
| arsenopyrite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.2 |  |
| scheelite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 3.2 |  |
| mottramite | 3.8 | 100% | 6.3 | 7.4 | 6.2 | <0.1 | 1.2 | 90% | 1.4 | 1.6 | ND (S) |
| ma:corkite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.9 | 0 |  |
| rosasite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.9 | 0 |  |
| galena | 4.0 | 100% | 6.6 | 7.9 | 12 | 90 | 23.6 | 100% | 1.4 | 0.8 | AB |
| malachite | 1.0 | 100% | 1.7 | 2.0 | 2.9 | 6.7 | 14.0 | 100% | 1.4 | 0.8 | AB |
| chrysocolla | 5.0 | 100% | 8.3 | 9.8 | 14 | 0.5 | 4.1 | 100% | 1.4 | 0 |  |
| brochantite | 5.9 | 100% | 9.7 | 11 | 11 | <0.1 | 1.9 | 100% | 1.4 | 0 |  |
| sphalerite | 1.0 | 100% | 1.7 | 2.0 | 2.1 | <0.1 | 3.5 | 71% | 1.4 | 0 |  |
| anglesite | 1.7 | 100% | 2.8 | 2.6 | 1.3 | <0.1 | 0.57 | 43% | 1.4 | 0 |  |
| chalcopyrite | 3.3 | 100% | 5.4 | 0 | 0 | <0.1 | 0.01 | 0% | 1.4 | 0 |  |
| alunite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.4 | 0 |  |
| smithsonite | 1.5 | 100% | 2.5 | 1.8 | 0 | <0.1 | 0.24 | 0% | 1.4 | 0 | CO |
| pyrite | 1.0 | 100% | 1.7 | 1.7 | 2.2 | <0.1 | 1.4 | 76% | 0 | 0.8 |  |
| aurichalcite | 3.9 | 100% | 6.4 | 7.1 | 0 | <0.1 | 0.57 | 0% | 0 | 0.8 |  |
| chalcocite | 4.6 | 100% | 7.6 | 8.8 | 11 | <0.1 | 2.0 | 100% | 0 | 0 |  |

Flags: OVER chalcocite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT chalcocite (sim grows it in 100% of seeds; no photo, no listing)

### schneeberg  ←  schneeberg   (sim 21 seeds; 1138 photos; 13 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.36 [5–95 % band: seeds -0.41 to -0.34, proxies -0.40 to -0.27, both -0.43 to -0.27; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.40   ρ(sim surviving count, real) = -0.65   ρ(sim ≥ 0.1 mm count, real) = -0.42
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| erythrite | 1.0 | 100% | 1.4 | 1.9 | 0 | <0.1 | 0.71 | 0% | 9.1 | 7.7 | CO (S) |
| x:pucherite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.1 | 7.7 |  |
| ma:eulytine | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| native_silver | 0.9 | 71% | 1.2 | 0.4 | 0 | <0.1 | 0.04 | 0% | 3.9 | 0 | CO |
| skutterudite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.7 | 7.7 | AB |
| x:walpurgite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.6 | 0 |  |
| x:roselite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 0 |  |
| torbernite | 0.0 | 4.8% | <0.1 | <0.1 | 0 | <0.1 | 0.78 | 0% | 2.9 | 0 |  |
| native_bismuth | 0.4 | 38% | 0.6 | 0 | 0 | <0.1 | 0.06 | 0% | 2.5 | 15 | AB |
| zeunerite | 0.4 | 38% | 0.6 | 0.4 | 0 | <0.1 | 0.12 | 0% | 2.5 | 0 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 15 |  |
| quartz | 3.0 | 100% | 4.2 | 5.6 | 14 | 63 | 24.8 | 100% | 2.1 | 0 |  |
| uraninite | 3.0 | 100% | 4.2 | 5.6 | 14 | 1.8 | 8.0 | 100% | 1.3 | 0 | UN |
| proustite | 1.7 | 100% | 2.4 | 1.7 | 0 | <0.1 | 0.72 | 0% | 1.2 | 7.7 |  |
| x:bismutite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.1 | 7.7 |  |
| acanthite | 3.6 | 100% | 5.0 | 4.5 | 5.9 | <0.1 | 1.1 | 71% | 1.0 | 0 |  |
| nickeline | 3.6 | 100% | 5.1 | 6.7 | 3.7 | <0.1 | 0.92 | 48% | 1.0 | 0 | CO |
| metazeunerite | 3.0 | 100% | 4.2 | 5.6 | 0 | <0.1 | 0.85 | 0% | 0.4 | 0 |  |
| siderite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.4 | 7.7 |  |
| autunite | 3.7 | 100% | 5.2 | 6.7 | 3.9 | <0.1 | 1.1 | 62% | 0.3 | 0 |  |
| pharmacolite | 3.0 | 95% | 4.3 | 3.8 | 0.9 | <0.1 | 0.68 | 14% | 0.3 | 0 |  |
| uranospinite | 3.2 | 100% | 4.5 | 5.5 | 0 | <0.1 | 0.66 | 0% | 0.3 | 0 |  |
| x:schneebergite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.2 | 15 |  |
| chrysocolla | 5.0 | 100% | 7.1 | 9.4 | 21 | 0.2 | 3.4 | 100% | <0.1 | 0 |  |
| arsenopyrite | 3.7 | 100% | 5.2 | 6.8 | 15 | 0.1 | 3.7 | 95% | <0.1 | 0 |  |
| uranophane | 3.0 | 100% | 4.2 | 5.6 | 11 | <0.1 | 2.2 | 100% | 0 | 0 |  |
| feldspar | 2.0 | 100% | 2.8 | 3.8 | 9.6 | 35 | 27.4 | 100% | 0 | 0 |  |
| annabergite | 1.2 | 100% | 1.7 | 1.8 | 0 | <0.1 | 0.27 | 0% | 0 | 0 |  |
| brochantite | 4.5 | 100% | 6.3 | 7.6 | 0 | <0.1 | 0.46 | 0% | 0 | 0 |  |
| topaz | 3.9 | 100% | 5.4 | 0 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | ND (S) |
| cassiterite | 3.3 | 95% | 4.6 | 0 | 0 | <0.1 | 0.04 | 0% | 0 | 0 | ND |

Flags: OVER chrysocolla (sim 21% of visible crystals; photos <0.1%, listings 0%); OVER arsenopyrite (sim 15% of visible crystals; photos <0.1%, listings 0%); OVER uranophane (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT uranophane (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT annabergite (sim grows it in 100% of seeds; no photo, no listing); ABSENT brochantite (sim grows it in 100% of seeds; no photo, no listing); ABSENT topaz (sim grows it in 100% of seeds; no photo, no listing); ABSENT cassiterite (sim grows it in 95% of seeds; no photo, no listing)

### searles_lake  ←  searles_lake   (sim 21 seeds; 48 photos; 134 listing mentions)
ρ(sim visible-count, real) = -0.13 [5–95 % band: seeds -0.40 to -0.13, proxies -0.18 to -0.02, both -0.42 to -0.02; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.39   ρ(sim surviving count, real) = -0.62   ρ(sim ≥ 0.1 mm count, real) = -0.33
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| halite | 5.3 | 100% | 12 | 2.4 | 1.3 | <0.1 | 0.00 | 9.5% | 27 | 49 | AB |
| x:hanksite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 27 | 18 | AB |
| x:trona | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 13 | AB |
| x:sulfohalite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.3 | 6.7 | RA |
| x:burkeite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.3 | 2.2 | UN |
| x:gaylussite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.3 | 3.0 | CO (S) |
| x:pirssonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.3 | 3.0 | UN |
| x:northupite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.3 | 0 |  |
| borax | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 1.5 | CO |
| x:aphthitalite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| ma:galeite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| ma:nahcolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| thenardite | 4.7 | 100% | 10 | 18 | 28 | 95 | 52.8 | 100% | 0 | 0.7 | UN |
| tincalconite | 8.0 | 100% | 18 | 45 | 71 | 4.7 | 7.8 | 100% | 0 | 0 | RA (S) |
| calcite | 10.8 | 100% | 24 | 0 | 0 | <0.1 | 0.01 | 0% | 0 | 0 | RA (S) |
| celestine | 8.9 | 100% | 19 | 34 | 0 | <0.1 | 0.35 | 0% | 0 | 0 | ND |
| mirabilite | 8.0 | 100% | 17 | 0 | 0 | 0 | — | 0% | 0 | 0 | RA (S) |

Flags: UNDER halite (photos 27%; sim 1.3% of visible crystals); UNDER x:hanksite (photos 27%; sim 0% of visible crystals — NO ENGINE); OVER thenardite (sim 28% of visible crystals; photos 0%, listings 0.7%); OVER tincalconite (sim 71% of visible crystals; photos 0%, listings 0%); ABSENT tincalconite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing); ABSENT mirabilite (sim grows it in 100% of seeds; no photo, no listing)

### shigar_pegmatite  ←  shigar   (sim 21 seeds; 300 photos; 1415 listing mentions)
ρ(sim visible-count, real) = 0.34 [5–95 % band: seeds 0.34 to 0.34, proxies 0.24 to 0.40, both 0.24 to 0.42; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.41   ρ(sim surviving count, real) = 0.51   ρ(sim ≥ 0.1 mm count, real) = 0.51
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| aquamarine | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 16 | 36 | AB |
| topaz | 4.5 | 100% | 23 | 21 | 0 | <0.1 | 0.59 | 0% | 15 | 4.6 | CO |
| quartz | 3.0 | 100% | 16 | 16 | 28 | <0.1 | 11.1 | 100% | 6.0 | 10 | AB |
| tourmaline | 7.8 | 100% | 40 | 42 | 35 | <0.1 | 1.8 | 100% | 2.0 | 12 | CO |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 8.3 | 4.9 | CO |
| x:muscovite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.7 | 7.7 | CO |
| epidote | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 7.3 | 0.8 |  |
| albite | 2.0 | 100% | 10 | 11 | 19 | 55 | 268.6 | 100% | 2.7 | 5.4 | AB |
| beryl | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.3 | 2.7 |  |
| x:clinozoisite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.0 | 0.2 |  |
| feldspar | 2.0 | 100% | 10 | 11 | 19 | 45 | 156.2 | 100% | 2.7 | 3.5 | AB |
| vesuvianite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.0 | 0.4 |  |
| titanite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 0.3 |  |
| x:zoisite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 0.3 |  |
| diopside | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.0 | 0.2 |  |
| apatite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.7 | 2.5 | CO |
| actinolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.0 | <0.1 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.3 | 1.4 | CO |

Flags: UNDER aquamarine (photos 16%; sim 0% of visible crystals); UNDER topaz (photos 15%; sim 0% of visible crystals)

### sicily_solfifera  ←  sicily   (sim 21 seeds; 114 photos; 183 listing mentions)
ρ(sim visible-count, real) = 0.36 [5–95 % band: seeds 0.36 to 0.36, proxies 0.35 to 0.46, both 0.35 to 0.46; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = 0.42   ρ(sim surviving count, real) = 0.41   ρ(sim ≥ 0.1 mm count, real) = 0.41
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| native_sulfur | 4.3 | 100% | 27 | 26 | 28 | 12 | 5.0 | 100% | 60 | 51 | AB |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 9.6 | 21 | CO |
| celestine | 6.0 | 100% | 37 | 37 | 43 | 88 | 9.1 | 100% | 18 | 13 | CO |
| calcite | 1.0 | 100% | 6.1 | 6.1 | 4.7 | <0.1 | 1.0 | 67% | 5.3 | 8.2 | AB |
| selenite | 1.0 | 100% | 6.1 | 6.1 | 0 | <0.1 | 0.12 | 0% | 1.8 | 1.6 | AB (S) |
| alunite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| halite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| hematite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| ma:amber | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| ma:kalinite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| x:melanophlogite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| strontianite | 4.0 | 100% | 24 | 25 | 25 | 0.2 | 1.3 | 100% | 0 | 0 | RA (S) |

Flags: OVER strontianite (sim 25% of visible crystals; photos 0%, listings 0%); ABSENT strontianite (sim grows it in 100% of seeds; no photo, no listing)

### sulphur_bank  ←  sulphur_bank   (sim 21 seeds; 2 photos — does not vote; 1 listing mentions — does not vote)
ρ(sim visible-count, real) = — [5–95 % band: seeds —, proxies —, both —; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —   ρ(sim ≥ 0.1 mm count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| cinnabar | 6.3 | 100% | 22 | 23 | 23 | 3.6 | 8.6 | 100% | 0 | 0 | AB |
| pararealgar | 6.0 | 100% | 21 | 22 | 23 | <0.1 | 1.4 | 100% | 0 | 0 | ND? (S) |
| orpiment | 7.0 | 100% | 24 | 23 | 22 | 0.2 | 3.3 | 100% | 0 | 0 | ND? (S) |
| native_sulfur | 4.0 | 100% | 14 | 14 | 15 | 0.6 | 5.1 | 100% | 0 | 100 | AB |
| metacinnabar | 3.0 | 100% | 10 | 11 | 12 | 12 | 16.3 | 100% | 50 | 0 | RA |
| marcasite | 1.0 | 100% | 3.4 | 3.6 | 4.0 | 84 | 39.3 | 100% | 0 | 0 | UN |
| pyrite | 1.9 | 100% | 6.4 | 3.6 | 0 | <0.1 | 0.53 | 0% | 0 | 0 | CO (S) |
| stibnite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 50 | 0 |  |
| opal | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: OVER cinnabar (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT cinnabar (sim grows it in 100% of seeds; no photo, no listing); OVER pararealgar (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT pararealgar (sim grows it in 100% of seeds; no photo, no listing); OVER orpiment (sim 22% of visible crystals; photos 0%, listings 0%); ABSENT orpiment (sim grows it in 100% of seeds; no photo, no listing); ABSENT marcasite (sim grows it in 100% of seeds; no photo, no listing); ABSENT pyrite (sim grows it in 100% of seeds; no photo, no listing); UNDER stibnite (photos 50%; sim 0% of visible crystals)

### sunnyside_american_tunnel  ←  sunnyside   (sim 21 seeds; 51 photos; 216 listing mentions)
ρ(sim visible-count, real) = -0.01 [5–95 % band: seeds -0.10 to -0.01, proxies -0.06 to 0.16, both -0.06 to 0.15; verdict differs in 0 / 55 / 53 % of resamples]   ρ(sim volume, real) = 0.05   ρ(sim surviving count, real) = -0.30   ρ(sim ≥ 0.1 mm count, real) = 0.10
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| rhodochrosite | 1.0 | 100% | 2.7 | 3.9 | 7.1 | <0.1 | 5.1 | 100% | 45 | 27 | AB |
| fluorite | 1.0 | 100% | 2.7 | 3.9 | 6.8 | <0.1 | 1.3 | 95% | 29 | 11 | CO |
| quartz | 3.0 | 100% | 8.1 | 12 | 15 | <0.1 | 1.4 | 100% | 5.9 | 28 | AB |
| native_gold | 4.8 | 100% | 13 | 16 | 0 | <0.1 | 0.83 | 0% | 3.9 | 7.4 | CO |
| wolframite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 4.2 | UN |
| pyrite | 1.0 | 100% | 2.7 | 3.9 | 0 | <0.1 | 0.74 | 0% | 2.0 | 3.2 | CO |
| sphalerite | 1.0 | 100% | 2.7 | 3.9 | 0 | <0.1 | 0.45 | 0% | 0 | 4.2 | AB |
| ma:pyroxmangite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| chalcopyrite | 1.5 | 100% | 4.0 | 3.9 | 0 | <0.1 | 0.24 | 0% | 2.0 | 1.9 | CO |
| x:rhodonite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0.9 | AB |
| calcite | 1.0 | 100% | 2.7 | 3.9 | 7.1 | 92 | 73.5 | 100% | 0 | 2.8 |  |
| selenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0.5 |  |
| galena | 4.0 | 100% | 11 | 15 | 29 | 7.4 | 22.8 | 100% | 0 | 2.3 | AB |
| hessite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| native_silver | 4.0 | 100% | 11 | 0 | 0 | 0 | — | 0% | 0 | 0.9 | ND |
| sylvanite | 2.0 | 100% | 5.3 | 0 | 0 | <0.1 | 0.02 | 0% | 0 | 0.5 |  |
| argentite | 6.4 | 100% | 17 | 15 | 23 | <0.1 | 4.5 | 100% | 0 | 0 | ND |
| tennantite | 1.1 | 100% | 2.9 | 4.0 | 6.8 | <0.1 | 2.5 | 95% | 0 | 0 |  |
| arsenopyrite | 2.9 | 95% | 7.6 | 10 | 6.1 | <0.1 | 1.2 | 62% | 0 | 0 | ND |
| calaverite | 2.0 | 100% | 5.3 | 0 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | RA |

Flags: OVER argentite (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT argentite (sim grows it in 100% of seeds; no photo, no listing); ABSENT tennantite (sim grows it in 100% of seeds; no photo, no listing); ABSENT arsenopyrite (sim grows it in 95% of seeds; no photo, no listing); ABSENT calaverite (sim grows it in 100% of seeds; no photo, no listing)

### tormiq_alpine_cleft  ←  tormiq   (sim 21 seeds; 49 photos; 129 listing mentions)
ρ(sim visible-count, real) = 0.35 [5–95 % band: seeds 0.31 to 0.35, proxies 0.15 to 0.43, both 0.14 to 0.45; verdict differs in 0 / 1 / 2 % of resamples]   ρ(sim volume, real) = 0.41   ρ(sim surviving count, real) = 0.37   ρ(sim ≥ 0.1 mm count, real) = 0.37
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| titanite | 3.0 | 100% | 16 | 16 | 15 | <0.1 | 5.2 | 95% | 24 | 17 | doc (S) |
| epidote | 5.0 | 100% | 26 | 27 | 33 | 11 | 23.9 | 100% | 20 | 12 | AB (S) |
| quartz | 3.3 | 95% | 17 | 12 | 3.1 | <0.1 | 0.20 | 19% | 0 | 22 |  |
| x:clinozoisite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 14 | 0.8 |  |
| x:ilmenite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 14 | 0.8 |  |
| hematite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 14 |  |
| albite | 2.0 | 100% | 10 | 11 | 13 | 76 | 65.4 | 100% | 2.0 | 4.7 |  |
| rutile | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 4.7 |  |
| feldspar | 2.0 | 100% | 10 | 11 | 13 | 12 | 36.8 | 100% | 4.1 | 2.3 |  |
| apatite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 6.2 |  |
| diopside | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.1 | 0 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 2.3 |  |
| x:hedenbergite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 1.6 |  |
| crocidolite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0 | 2.3 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| ma:augite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| actinolite | 4.0 | 100% | 21 | 22 | 24 | <0.1 | 1.4 | 95% | 0 | 1.6 | CO (S) |

Flags: UNDER x:clinozoisite (photos 14%; sim 0% of visible crystals — NO ENGINE); UNDER x:ilmenite (photos 14%; sim 0% of visible crystals — NO ENGINE)

### supergene_oxidation  ←  tsumeb   (sim 21 seeds; 1200 photos; 1488 listing mentions)
ρ(sim visible-count, real) = -0.45 [5–95 % band: seeds -0.46 to -0.40, proxies -0.49 to -0.41, both -0.48 to -0.37; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.20   ρ(sim surviving count, real) = -0.59   ρ(sim ≥ 0.1 mm count, real) = -0.63
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| smithsonite | 1.0 | 100% | 1.0 | 1.1 | 1.7 | <0.1 | 2.7 | 100% | 9.7 | 10 | AB |
| cerussite | 4.1 | 100% | 4.3 | 4.6 | 6.5 | <0.1 | 4.2 | 100% | 8.0 | 9.6 | AB (S) |
| calcite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.8 | 12 | AB (S) |
| azurite | 4.0 | 100% | 4.2 | 4.6 | 5.8 | <0.1 | 3.1 | 100% | 7.4 | 9.3 | AB (S) |
| malachite | 1.0 | 100% | 1.0 | 1.1 | 1.7 | 40 | 41.9 | 100% | 4.2 | 9.3 | AB (S) |
| dioptase | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.3 | 6.5 | AB (S) |
| mimetite | 1.2 | 100% | 1.2 | 1.1 | 1.7 | <0.1 | 3.4 | 100% | 5.5 | 5.3 | CO (S) |
| cuprite | 0.9 | 86% | 0.9 | 0 | 0 | <0.1 | 0.08 | 0% | 5.3 | 3.0 | CO (S) |
| wulfenite | 1.0 | 100% | 1.0 | 1.1 | 1.7 | 1.7 | 15.6 | 100% | 4.6 | 3.0 | CO (S) |
| duftite | 2.4 | 100% | 2.5 | 2.4 | 3.0 | <0.1 | 2.4 | 100% | 2.4 | 4.2 | AB (S) |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.9 | 5.0 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.3 | 2.0 |  |
| mottramite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.2 | 2.4 | CO (S) |
| descloizite | 4.7 | 100% | 4.9 | 2.8 | 0 | <0.1 | 0.30 | 0% | 1.3 | 0.5 | RA (S) |
| anglesite | 4.0 | 100% | 4.2 | 4.6 | 6.5 | 0.1 | 4.2 | 100% | 1.0 | 0.6 | CO (S) |
| conichalcite | 4.0 | 100% | 4.2 | 4.6 | 6.6 | <0.1 | 5.1 | 100% | 0.3 | 0.7 | CO (S) |
| scorodite | 5.9 | 100% | 6.1 | 6.5 | 7.9 | <0.1 | 3.5 | 100% | 0.5 | <0.1 | RA |
| brochantite | 5.0 | 100% | 5.2 | 5.7 | 8.3 | 3.3 | 11.4 | 100% | 0.2 | <0.1 |  |
| pyromorphite | 6.0 | 100% | 6.3 | 6.9 | 7.9 | <0.1 | 1.7 | 100% | <0.1 | 0.1 | VR (S) |
| jarosite | 6.6 | 100% | 6.9 | 6.9 | 0 | <0.1 | 0.87 | 0% | <0.1 | <0.1 | Q (S) |
| aurichalcite | 3.8 | 100% | 4.0 | 4.2 | 5.2 | <0.1 | 2.3 | 95% | <0.1 | 0 |  |
| vanadinite | 6.0 | 100% | 6.3 | 6.9 | 1.8 | <0.1 | 1.2 | 71% | <0.1 | 0 | VR (S) |
| ferrimolybdite | 6.0 | 100% | 6.3 | 6.9 | 9.9 | 40 | 25.3 | 100% | 0 | 0 | ND (S) |
| powellite | 4.0 | 100% | 4.2 | 4.6 | 6.6 | 15 | 20.1 | 100% | 0 | 0 | VR (S) |
| stolzite | 4.7 | 100% | 4.9 | 5.1 | 5.8 | <0.1 | 2.9 | 100% | 0 | 0 | RA (S) |
| plumbogummite | 3.3 | 100% | 3.4 | 3.7 | 4.0 | <0.1 | 1.8 | 100% | 0 | 0 | VR (S) |

Flags: ABSENT ferrimolybdite (sim grows it in 100% of seeds; no photo, no listing); ABSENT powellite (sim grows it in 100% of seeds; no photo, no listing); ABSENT stolzite (sim grows it in 100% of seeds; no photo, no listing); ABSENT plumbogummite (sim grows it in 100% of seeds; no photo, no listing)

### wittichen  ←  wittichen   (sim 21 seeds; 925 photos; 6 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.48 [5–95 % band: seeds -0.49 to -0.48, proxies -0.54 to -0.45, both -0.53 to -0.46; verdict differs in 0 / 0 / 0 % of resamples]   ρ(sim volume, real) = -0.53   ρ(sim surviving count, real) = -0.63   ρ(sim ≥ 0.1 mm count, real) = -0.56
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| erythrite | 1.0 | 100% | 2.6 | 3.2 | 5.3 | 44 | 8.1 | 100% | 15 | 17 | AB |
| zeunerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.6 | 0 |  |
| ma:heinrichite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 6.4 | 0 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 5.1 | 0 | CO |
| ma:atelestite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.9 | 0 |  |
| x:walpurgite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 4.5 | 0 |  |
| native_silver | 3.5 | 100% | 9.0 | 10 | 0 | <0.1 | 0.55 | 0% | 3.9 | 0 | AB |
| x:mixite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| x:bismutite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.5 | 17 |  |
| ma:arseniosiderite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.4 | 0 |  |
| uraninite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.4 | 0 |  |
| x:koritnigite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 2.1 | 17 |  |
| barite | 6.0 | 100% | 15 | 19 | 0.8 | 0.3 | 0.97 | 14% | 1.6 | 0 | AB |
| safflorite | 2.0 | 100% | 5.1 | 1.2 | 0 | <0.1 | 0.01 | 0% | 1.6 | 17 | AB |
| native_bismuth | 1.7 | 95% | 4.3 | 1.2 | 0 | <0.1 | 0.06 | 0% | 1.4 | 0 | UN |
| skutterudite | 2.1 | 100% | 5.4 | 0 | 0 | <0.1 | 0.06 | 0% | 1.4 | 17 | AB |
| pharmacolite | 0.4 | 29% | 1.1 | 1.4 | 2.3 | 1.5 | 3.7 | 29% | 0.4 | 0 | CO |
| nickeline | 4.0 | 100% | 10 | 13 | 20 | 1.3 | 1.8 | 100% | 0.3 | 0 | UN |
| native_arsenic | 4.0 | 100% | 10 | 13 | 21 | 0.7 | 1.5 | 100% | 0.2 | 0 | UN |
| chalcedony | 4.0 | 100% | 10 | 13 | 20 | 1.1 | 1.7 | 100% | 0.1 | 0 | ND |
| annabergite | 1.0 | 100% | 2.6 | 3.2 | 5.3 | 7.3 | 4.6 | 100% | 0.1 | 0 | RA |
| x:kahlerite | 0.0 | 0% | 0 | 0 | 0 | 0 | — | 0% | 0.1 | 17 |  |
| haidingerite | 4.6 | 100% | 12 | 15 | 24 | 44 | 5.1 | 100% | 0 | 0 | RA (S) |
| anhydrite | 4.7 | 100% | 12 | 7.2 | 0 | <0.1 | 0.25 | 0% | 0 | 0 | ND |

Flags: OVER nickeline (sim 20% of visible crystals; photos 0.3%, listings 0%); OVER native_arsenic (sim 21% of visible crystals; photos 0.2%, listings 0%); OVER chalcedony (sim 20% of visible crystals; photos 0.1%, listings 0%); OVER haidingerite (sim 24% of visible crystals; photos 0%, listings 0%); ABSENT haidingerite (sim grows it in 100% of seeds; no photo, no listing); ABSENT anhydrite (sim grows it in 100% of seeds; no photo, no listing)

## The scenarios' own abundance words vs their crystal counts
A species whose own deterministic/statistical reason calls it minor (or subordinate, accessory, trace, rare) and which out-numbers the median headline (expects_species) species in surviving crystals per vug; the last three columns say whether it ALSO out-numbers them in visible crystals and out-weighs them in volume.
| scenario | species | its reason says | crystals per vug | headline median | visible per vug | headline median visible | holds by visible count | volume share | headline median volume share | holds by volume |
|---|---|---|---:|---:|---:|---:|---|---:|---:|---|
| asbestos_hills_crack_seal | opal | "subordinate" (deterministic) | 5.0 | 3.0 | 5.00 | 2.52 | yes | 65 | 2.3 | yes |
| bisbee | atacamite | "accessory" (deterministic) | 8.1 | 4.0 | 7.52 | 1.00 | yes | 15 | 1.1 | yes |
| bisbee | native_gold | "accessory" (deterministic) | 13.0 | 4.0 | 0.71 | 1.00 | no | <0.1 | 1.1 | no |
| bisbee | dioptase | "accessory" (deterministic) | 4.8 | 4.0 | 0.00 | 1.00 | no | <0.1 | 1.1 | no |
| deccan_zeolite | pectolite | "accessory" (deterministic) | 4.0 | 2.3 | 1.38 | 0.98 | yes | 0.4 | 0.8 | no |
| epithermal_telluride | native_silver | "accessory" (deterministic) | 4.0 | 3.0 | 4.00 | 2.00 | yes | 5.6 | 9.4 | no |
| epithermal_telluride | native_gold | "accessory" (deterministic) | 4.0 | 3.0 | 3.76 | 2.00 | yes | 0.4 | 9.4 | no |
| grimsel_alpine_cleft | epidote | "accessory" (deterministic) | 5.7 | 2.0 | 0.81 | 1.95 | no | <0.1 | 0.6 | no |
| jeffrey_mine | actinolite | "accessory" (deterministic) | 4.0 | 3.5 | 2.81 | 2.00 | yes | 0.6 | 0.2 | yes |
| mvt | pyrite | "accessory" (deterministic) | 1.1 | 1.0 | 0.90 | 1.00 | no | <0.1 | 2.6 | no |
| mvt | greenockite | "minor" (deterministic) | 5.3 | 1.0 | 3.24 | 1.00 | yes | <0.1 | 2.6 | no |
| mvt | quartz | "subordinate" (deterministic) | 1.2 | 1.0 | 0.00 | 1.00 | no | <0.1 | 2.6 | no |
| mvt | anhydrite | "trace" (deterministic) | 7.6 | 1.0 | 6.29 | 1.00 | yes | 0.3 | 2.6 | no |
| porphyry | albite | "accessory" (deterministic) | 2.0 | 1.0 | 1.62 | 1.00 | yes | <0.1 | 0.7 | no |
| porphyry | bismuthinite | "accessory" (deterministic) | 4.0 | 1.0 | 0.95 | 1.00 | no | <0.1 | 0.7 | no |
| porphyry | arsenopyrite | "accessory" (deterministic) | 3.9 | 1.0 | 3.81 | 1.00 | yes | 3.4 | 0.7 | yes |
| porphyry | stibnite | "rare" (deterministic) | 1.5 | 1.0 | 0.00 | 1.00 | no | <0.1 | 0.7 | no |
| radioactive_pegmatite | spodumene | "accessory" (deterministic) | 4.2 | 3.0 | 2.43 | 2.00 | yes | <0.1 | 0.3 | no |
| radioactive_pegmatite | tourmaline | "accessory" (deterministic) | 7.7 | 3.0 | 3.38 | 2.00 | yes | <0.1 | 0.3 | no |
| reactivated_fluorite_vein | acanthite | "minor" (deterministic) | 4.0 | 1.0 | 3.33 | 1.00 | yes | <0.1 | 0.4 | no |
| reactivated_fluorite_vein | greenockite | "minor" (deterministic) | 5.0 | 1.0 | 3.24 | 1.00 | yes | <0.1 | 0.4 | no |
| reactivated_fluorite_vein | celestine | "subordinate" (deterministic) | 6.0 | 1.0 | 5.71 | 1.00 | yes | <0.1 | 0.4 | no |
| reactivated_fluorite_vein | anhydrite | "minor" (deterministic) | 7.5 | 1.0 | 2.71 | 1.00 | yes | <0.1 | 0.4 | no |
| reactive_wall | anhydrite | "trace" (deterministic) | 6.6 | 1.1 | 0.00 | 0.86 | no | <0.1 | 9.2 | no |
| roughten_gill | chalcocite | "minor" (deterministic) | 4.6 | 3.3 | 3.76 | 1.00 | yes | <0.1 | <0.1 | yes |
| schneeberg | topaz | "accessory" (deterministic) | 3.9 | 2.2 | 0.00 | 0.00 | no | <0.1 | <0.1 | no |
| searles_lake | calcite | "subordinate" (deterministic) | 10.8 | 5.3 | 0.00 | 0.14 | no | <0.1 | <0.1 | no |
| searles_lake | celestine | "minor" (deterministic) | 8.9 | 5.3 | 0.00 | 0.14 | no | <0.1 | <0.1 | no |
| sicily_solfifera | strontianite | "subordinate" (deterministic) | 4.0 | 2.7 | 3.48 | 2.29 | yes | 0.2 | 6.1 | no |
| sunnyside_american_tunnel | sylvanite | "accessory" (deterministic) | 2.0 | 1.0 | 0.00 | 0.95 | no | <0.1 | <0.1 | no |
| sunnyside_american_tunnel | tennantite | "accessory" (deterministic) | 1.1 | 1.0 | 0.95 | 0.95 | no | <0.1 | <0.1 | yes |
| sunnyside_american_tunnel | calaverite | "minor" (deterministic) | 2.0 | 1.0 | 0.00 | 0.95 | no | <0.1 | <0.1 | no |
| sunnyside_american_tunnel | native_silver | "subordinate" (deterministic) | 4.0 | 1.0 | 0.00 | 0.95 | no | 0 | <0.1 | no |
| supergene_oxidation | lepidocrocite | "minor" (deterministic) | 2.0 | 1.2 | 0.00 | 1.00 | no | <0.1 | <0.1 | no |
| wittichen | chalcedony | "subordinate" (deterministic) | 4.0 | 2.8 | 3.81 | 0.07 | yes | 1.1 | 0.1 | yes |
| wittichen | anhydrite | "trace" (deterministic) | 4.7 | 2.8 | 0.00 | 0.07 | no | <0.1 | 0.1 | no |

36 cases (29 distinct species) out-number the headline median in surviving crystals. Also in visible crystals: 19; also in volume share: 7; both: 6; visible only: 13; volume only: 1; neither: 16. Words: accessory 17, minor 8, subordinate 7, trace 3, rare 1.
Not counted, the word is not about the species' abundance: mottramite at roughten_gill: "trace" describes the scenario's vanadium ("the scenario's trace V is specifically retained for this phase"); quartz at schneeberg: "accessory" is its role in the contract; the same reason calls quartz "fundamental vein and pegmatite gangue".

## Fleet: crystals per vug by nucleation gate (all scenarios, all seeds, vugs where the species survives)
strict            22 species, median 1.17 crystals per vug (median 0.63 ≥ 1 mm)
soft              55 species, median 3.10 crystals per vug (median 1.50 ≥ 1 mm)
active-capped     10 species, median 2.71 crystals per vug (median 1.90 ≥ 1 mm)
cap-only          46 species, median 3.89 crystals per vug (median 2.30 ≥ 1 mm)
transformation     5 species, median 4.57 crystals per vug (median 4.57 ≥ 1 mm)
every species in data/minerals.json (184, formed in this panel or not): strict 24, soft 72, active-capped 22, cap-only 60, transformation 6, unread 0
strict-gated (species, scenario) pairs at ≤ 1.25 surviving crystals per vug (where present): 76 of 99
| species | gate | gate line | the line (or the parent → product) | max_nucleation_count | vugs with it | scenarios | crystals per vug | ≥ 1 mm per vug |
|---|---|---|---|---:|---:|---:|---:|---:|
| HMC | active-capped | js/82-nucleation-carbonate.ts:140 | `if (existing_hmc.length >= 4) return;` | 4 | 21 | 1 | 40.95 | 0.00 |
| barite | cap-only | js/90-nucleation-sulfate.ts:46 | `if (!snowball && rng.random() >= 0.15) return;` | 6 | 105 | 5 | 15.91 | 2.42 |
| halite | cap-only | js/83-nucleation-halide.ts:25 | `if (sigma_hal > MINERAL_GATES_halite.sigma_crit && !sim._atNucleationCap('halite') && rng.random() < 0.15) {` | 12 | 42 | 2 | 8.33 | 2.33 |
| atacamite | cap-only | js/83-nucleation-halide.ts:35 | `if (sigma > MINERAL_GATES_atacamite.sigma_crit && !sim._atNucleationCap('atacamite') && rng.random() < 0.15) {` | 4 | 21 | 1 | 8.10 | 7.52 |
| tincalconite | transformation | js/75-transitions.ts | `borax → tincalconite` | 0 | 21 | 1 | 8.00 | 7.71 |
| mirabilite | cap-only | js/90-nucleation-sulfate.ts:210 | `if (sigma_mirab > MINERAL_GATES_mirabilite.sigma_crit && !sim._atNucleationCap('mirabilite') && rng.random() < 0.13) {` | 8 | 21 | 1 | 7.95 | 0.00 |
| anhydrite | cap-only | js/90-nucleation-sulfate.ts:170 | `if (rng.random() < 0.16) {` | 8 | 105 | 5 | 7.28 | 3.70 |
| native_gold | soft | js/86-nucleation-native.ts:138 | `if (!existing_au.length \|\| (sigma_au > 1.5 && rng.random() < 0.2)) {` | 4 | 63 | 3 | 7.25 | 1.49 |
| orpiment | soft | js/91-nucleation-sulfide.ts:247 | `if (!existing_orp.length \|\| (sigma_orp > 1.8 && rng.random() < 0.2)) {` | 6 | 21 | 1 | 7.05 | 5.62 |
| celestine | cap-only | js/90-nucleation-sulfate.ts:59 | `if (rng.random() < 0.15) {` | 6 | 126 | 6 | 6.48 | 4.94 |
| cinnabar | soft | js/91-nucleation-sulfide.ts:211 | `if (!existing_cb.length \|\| (sigma_cb > 1.8 && rng.random() < 0.2)) {` | 6 | 21 | 1 | 6.29 | 5.86 |
| jarosite | cap-only | js/90-nucleation-sulfate.ts:80 | `if (rng.random() < 0.45) {` | 6 | 42 | 2 | 6.26 | 2.31 |
| tourmaline | soft | js/89-nucleation-silicate.ts:284 | `if (!existing_tml.length \|\| (sigma_tml > 2.0 && rng.random() < 0.25)) {` | 8 | 63 | 3 | 6.19 | 2.38 |
| apatite | cap-only | js/88-nucleation-phosphate.ts:240 | `if (sigma > MINERAL_GATES_apatite.sigma_crit && !sim._atNucleationCap('apatite') && rng.random() < 0.15) {` | 6 | 21 | 1 | 6.05 | 5.90 |
| pyromorphite | soft | js/88-nucleation-phosphate.ts:64 | `if (!existing_pyr.length \|\| (sigma_pyr > 1.8 && rng.random() < 0.3)) {` | 6 | 42 | 2 | 6.00 | 5.12 |
| vanadinite | soft | js/88-nucleation-phosphate.ts:83 | `if (!existing_vnd.length \|\| (sigma_vnd > 1.8 && rng.random() < 0.3)) {` | 6 | 21 | 1 | 6.00 | 1.10 |
| pararealgar | transformation | js/75-transitions.ts | `realgar → pararealgar` | 0 | 21 | 1 | 6.00 | 5.81 |
| lepidocrocite | soft | js/84-nucleation-hydroxide.ts:49 | `if (!existing_lep.length \|\| (sigma_lep > 1.7 && rng.random() < 0.25)) {` | 10 | 63 | 3 | 5.86 | 0.10 |
| scorodite | cap-only | js/80-nucleation-arsenate.ts:16 | `if (rng.random() < 0.20) {` | 5 | 21 | 1 | 5.86 | 4.76 |
| argentite | cap-only | js/91-nucleation-sulfide.ts:284 | `if (rng.random() < 0.18) {` | 4 | 24 | 2 | 5.71 | 2.79 |
| ferrimolybdite | cap-only | js/85-nucleation-molybdate.ts:48 | `if (rng.random() < 0.18) {` | 6 | 42 | 2 | 5.64 | 5.60 |
| chrysocolla | soft | js/89-nucleation-silicate.ts:136 | `if (!existing_chry.length \|\| (sigma_chry > 1.8 && rng.random() < 0.25)) {` | 5 | 63 | 3 | 5.41 | 4.56 |
| epidote | soft | js/89-nucleation-silicate.ts:805 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 5 | 42 | 2 | 5.36 | 2.90 |
| greenockite | cap-only | js/91-nucleation-sulfide.ts:683 | `if (sigma > MINERAL_GATES_greenockite.sigma_crit && !sim._atNucleationCap('greenockite') && rng.random() < 0.18) {` | 5 | 42 | 2 | 5.17 | 3.24 |
| opal | active-capped | js/89-nucleation-silicate.ts:436 | `if (existing.length >= 5) return;` | 6 | 126 | 6 | 5.12 | 4.09 |
| andalusite | soft | js/89-nucleation-silicate.ts:346 | `if (existing.length && !(sigma_and > MINERAL_GATES_andalusite.sigma_crit + 0.5 && rng.random() < 0.25)) return;` | 5 | 21 | 1 | 5.00 | 4.10 |
| tyuyamunite | cap-only | js/88-nucleation-phosphate.ts:219 | `if (rng.random() < 0.20) {` | 5 | 21 | 1 | 5.00 | 4.95 |
| brochantite | cap-only | js/90-nucleation-sulfate.ts:126 | `if (rng.random() < 0.18) {` | 5 | 105 | 5 | 4.99 | 3.17 |
| dioptase | soft | js/89-nucleation-silicate.ts:545 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 21 | 1 | 4.81 | 0.00 |
| grossular | soft | js/89-nucleation-silicate.ts:866 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 21 | 1 | 4.76 | 3.14 |
| descloizite | cap-only | js/88-nucleation-phosphate.ts:16 | `if (rng.random() < 0.18) {` | 4 | 21 | 1 | 4.71 | 0.00 |
| stolzite | cap-only | js/85-nucleation-molybdate.ts:82 | `if (rng.random() < 0.18) {` | 4 | 21 | 1 | 4.67 | 3.52 |
| thenardite | cap-only | js/90-nucleation-sulfate.ts:219 (also made from mirabilite in js/75-transitions.ts) | `if (sigma_then > MINERAL_GATES_thenardite.sigma_crit && !sim._atNucleationCap('thenardite') && rng.random() < 0.13) {` | 10 | 21 | 1 | 4.67 | 3.00 |
| haidingerite | transformation | js/75-transitions.ts | `pharmacolite → haidingerite` | 0 | 21 | 1 | 4.57 | 4.57 |
| cassiterite | cap-only | js/87-nucleation-oxide.ts:107 | `if (rng.random() < 0.18) {` | 4 | 62 | 3 | 4.53 | 0.00 |
| topaz | soft | js/89-nucleation-silicate.ts:315 | `if (!existing_tpz.length \|\| (sigma_tpz > 2.0 && rng.random() < 0.3)) {` | 6 | 84 | 4 | 4.50 | 1.50 |
| heulandite | soft | js/89-nucleation-silicate.ts:1025 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 5 | 21 | 1 | 4.43 | 2.86 |
| stilbite | soft | js/89-nucleation-silicate.ts:998 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 5 | 21 | 1 | 4.33 | 0.00 |
| chalcocite | soft | js/91-nucleation-sulfide.ts:374 | `if (!existing_chc.length \|\| (sigma_chc > 1.7 && rng.random() < 0.25)) {` | 5 | 42 | 2 | 4.19 | 2.21 |
| cerussite | soft | js/82-nucleation-carbonate.ts:278 | `if (!existing_cer.length \|\| (sigma_cer > 1.8 && rng.random() < 0.3)) {` | 4 | 42 | 2 | 4.19 | 3.40 |
| native_sulfur | cap-only | js/86-nucleation-native.ts:54 | `if (rng.random() < 0.18) {` | 4 | 42 | 2 | 4.17 | 3.86 |
| brucite | soft | js/87-nucleation-oxide.ts:289 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.22)) {` | 4 | 21 | 1 | 4.10 | 1.48 |
| actinolite | soft | js/89a-nucleation-amphibole.ts:58 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 42 | 2 | 4.02 | 3.21 |
| conichalcite | cap-only | js/80-nucleation-arsenate.ts:199 | `if (rng.random() < 0.20) {` | 4 | 21 | 1 | 4.00 | 4.00 |
| powellite | cap-only | js/85-nucleation-molybdate.ts:104 | `if (sigma > MINERAL_GATES_powellite.sigma_crit && !sim._atNucleationCap('powellite') && rng.random() < 0.13) {` | 4 | 21 | 1 | 4.00 | 4.00 |
| diopside | soft | js/89-nucleation-silicate.ts:893 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 21 | 1 | 4.00 | 4.00 |
| vesuvianite | soft | js/89-nucleation-silicate.ts:927 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.18)) {` | 4 | 21 | 1 | 4.00 | 4.00 |
| bismuthinite | soft | js/91-nucleation-sulfide.ts:268 | `if (!existing_bmt.length \|\| (sigma_bmt > 1.8 && rng.random() < 0.2)) {` | 4 | 21 | 1 | 4.00 | 0.95 |
| strontianite | cap-only | js/82-nucleation-carbonate.ts:341 | `if (sigma > MINERAL_GATES_strontianite.sigma_crit && !sim._atNucleationCap('strontianite') && rng.random() < 0.15) {` | 4 | 21 | 1 | 4.00 | 3.48 |
| carnotite | cap-only | js/88-nucleation-phosphate.ts:148 | `if (rng.random() < 0.20) {` | 4 | 21 | 1 | 3.95 | 0.00 |
| pectolite | soft | js/89-nucleation-silicate.ts:723 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.22)) {` | 4 | 42 | 2 | 3.86 | 0.76 |
| aurichalcite | cap-only | js/82-nucleation-carbonate.ts:319 | `if (rng.random() < 0.20) {` | 4 | 42 | 2 | 3.83 | 1.57 |
| mottramite | cap-only | js/88-nucleation-phosphate.ts:30 | `if (rng.random() < 0.18) {` | 4 | 21 | 1 | 3.81 | 2.10 |
| nickeline | cap-only | js/91-nucleation-sulfide.ts:298 | `if (rng.random() < 0.18) {` | 4 | 42 | 2 | 3.81 | 2.29 |
| covellite | soft | js/91-nucleation-sulfide.ts:395 | `if (!existing_cov.length \|\| (sigma_cov > 1.7 && rng.random() < 0.2)) {` | 4 | 20 | 1 | 3.80 | 2.40 |
| lepidolite | soft | js/89-nucleation-silicate.ts:371 | `if (!existing_lep.length \|\| (sigma_lep > 2.0 && rng.random() < 0.25)) {` | 3 | 42 | 2 | 3.79 | 0.24 |
| acanthite | cap-only | js/91-nucleation-sulfide.ts:340 (also made from argentite in js/75-transitions.ts) | `if (rng.random() < 0.18) {` | 4 | 96 | 5 | 3.65 | 2.71 |
| native_tellurium | cap-only | js/86-nucleation-native.ts:40 | `if (rng.random() < 0.16) {` | 4 | 21 | 1 | 3.62 | 0.00 |
| hemimorphite | active-capped | js/89-nucleation-silicate.ts:497 | `if (existing.length >= 3) return;` | 3 | 21 | 1 | 3.57 | 2.71 |
| autunite | cap-only | js/88-nucleation-phosphate.ts:171 | `if (rng.random() < 0.20) {` | 5 | 22 | 2 | 3.55 | 0.77 |
| arsenopyrite | cap-only | js/91-nucleation-sulfide.ts:112 | `if (rng.random() < 0.12) {` | 4 | 62 | 3 | 3.53 | 2.66 |
| olivenite | cap-only | js/80-nucleation-arsenate.ts:133 | `if (rng.random() < 0.18) {` | 4 | 21 | 1 | 3.52 | 0.00 |
| titanite | soft | js/89-nucleation-silicate.ts:834 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 3 | 42 | 2 | 3.50 | 2.26 |
| calcite | strict | js/82-nucleation-carbonate.ts:40 | `: !existing_calcite.length;` | 10 | 336 | 16 | 3.32 | 0.66 |
| anglesite | soft | js/90-nucleation-sulfate.ts:248 | `if (!existing_ang.length \|\| (sigma_ang > 1.8 && rng.random() < 0.25)) {` | 4 | 63 | 3 | 3.22 | 1.44 |
| uranospinite | cap-only | js/88-nucleation-phosphate.ts:192 | `if (rng.random() < 0.20) {` | 4 | 21 | 1 | 3.19 | 0.00 |
| chalcedony | soft | js/89-nucleation-silicate.ts:44 | `if (existing.length && !(sigma > 1.8 && rng.random() < 0.22)) return;` | 4 | 105 | 5 | 3.10 | 2.24 |
| native_arsenic | cap-only | js/86-nucleation-native.ts:73 | `if (rng.random() < 0.16) {` | 4 | 41 | 2 | 3.05 | 2.02 |
| turquoise | cap-only | js/88-nucleation-phosphate.ts:248 | `if (sigma > MINERAL_GATES_turquoise.sigma_crit && !sim._atNucleationCap('turquoise') && rng.random() < 0.10) {` | 4 | 36 | 2 | 3.03 | 0.61 |
| azurite | soft | js/82-nucleation-carbonate.ts:264 | `if (!existing_azr.length \|\| (sigma_azr > 2.0 && rng.random() < 0.25)) {` | 4 | 63 | 3 | 3.02 | 1.17 |
| native_silver | cap-only | js/86-nucleation-native.ts:95 | `if (rng.random() < 0.16) {` | 4 | 94 | 6 | 3.00 | 0.89 |
| metazeunerite | transformation | js/75-transitions.ts | `zeunerite → metazeunerite` | 0 | 21 | 1 | 3.00 | 0.00 |
| uraninite | soft | js/87-nucleation-oxide.ts:35 | `if (!existing_urn.length \|\| (sigma_urn > 2.5 && rng.random() < 0.3)) {` | 3 | 42 | 2 | 3.00 | 3.00 |
| uranophane | active-capped | js/89-nucleation-silicate.ts:476 | `if (existing.length >= 3) return;` | 4 | 42 | 2 | 3.00 | 2.67 |
| amosite | soft | js/89a-nucleation-amphibole.ts:101 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 3 | 42 | 2 | 3.00 | 2.05 |
| crocidolite | soft | js/89a-nucleation-amphibole.ts:121 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 3 | 42 | 2 | 3.00 | 2.88 |
| tigers_eye | soft | js/89-nucleation-silicate.ts:670 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.22)) {` | 3 | 42 | 2 | 3.00 | 2.43 |
| hessite | cap-only | js/91-nucleation-sulfide.ts:650 | `if (sigma > MINERAL_GATES_hessite.sigma_crit && !sim._atNucleationCap('hessite') && rng.random() < 0.12) {` | 3 | 21 | 1 | 3.00 | 3.00 |
| awaruite | soft | js/86-nucleation-native.ts:171 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.18)) {` | 3 | 21 | 1 | 3.00 | 2.71 |
| datolite | soft | js/89-nucleation-silicate.ts:968 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 3 | 21 | 1 | 3.00 | 0.43 |
| molybdenite | soft | js/91-nucleation-sulfide.ts:156 | `if (!existing_moly.length \|\| (sigma_moly > 1.5 && rng.random() < 0.25)) {` | 3 | 21 | 1 | 3.00 | 3.00 |
| metacinnabar | active-capped | js/91-nucleation-sulfide.ts:499 | `if (existing.length >= 3) return;` | 4 | 21 | 1 | 3.00 | 3.00 |
| chrysoprase | cap-only | js/89-nucleation-silicate.ts:414 | `if (sigma > MINERAL_GATES_chrysoprase.sigma_crit && !sim._atNucleationCap('chrysoprase') && rng.random() < 0.12) {` | 3 | 21 | 1 | 3.00 | 3.00 |
| plumbogummite | soft | js/88-nucleation-phosphate.ts:304 | `if (!existing.length \|\| (sigma > 1.8 && rng.random() < 0.18)) {` | 3 | 63 | 3 | 2.98 | 1.03 |
| raspite | cap-only | js/85-nucleation-molybdate.ts:76 (via _nuc_stolzite) | `if (rng.random() < 0.16) {` | 4 | 18 | 1 | 2.94 | 1.39 |
| bornite | soft | js/91-nucleation-sulfide.ts:357 | `if (!existing_brn.length \|\| (sigma_brn > 1.7 && rng.random() < 0.2)) {` | 3 | 21 | 1 | 2.90 | 0.00 |
| prehnite | soft | js/89-nucleation-silicate.ts:773 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 42 | 2 | 2.88 | 1.26 |
| pharmacolite | cap-only | js/80-nucleation-arsenate.ts:157 | `if (rng.random() < 0.22) {` | 5 | 26 | 2 | 2.81 | 0.50 |
| dolomite | strict | js/82-nucleation-carbonate.ts:87 | `if (sigma_dol > MINERAL_GATES_dolomite.sigma_crit && !existing_dol.length && !sim._atNucleationCap('dolomite')) {` | 4 | 63 | 3 | 2.71 | 0.00 |
| metatorbernite | transformation | js/75-transitions.ts | `torbernite → metatorbernite` | 0 | 21 | 1 | 2.57 | 0.00 |
| morganite | soft | js/89-nucleation-silicate.ts:221 (via the shared selector loop) | `if (existing_sp.length && !recoveryGeneration && !(sigma_bf > threshold + 0.7 && rng.random() < 0.15)) continue;` | 4 | 42 | 2 | 2.55 | 1.86 |
| galena | soft | js/91-nucleation-sulfide.ts:138 | `if (!existing_gal.length \|\| (sigma_gal > 2.0 && rng.random() < 0.3)) {` | 4 | 126 | 6 | 2.50 | 2.49 |
| cobaltite | cap-only | js/91-nucleation-sulfide.ts:326 | `if (rng.random() < 0.16) {` | 4 | 20 | 1 | 2.50 | 0.00 |
| duftite | active-capped | js/80-nucleation-arsenate.ts:285 | `if (existing.length >= 2) return;` | 3 | 21 | 1 | 2.43 | 1.81 |
| spodumene | soft | js/89-nucleation-silicate.ts:148 | `if (!existing_spd.length \|\| (sigma_spd > 2.5 && rng.random() < 0.15)) {` | 4 | 63 | 3 | 2.35 | 0.81 |
| quartz | soft | js/89-nucleation-silicate.ts:17 | `if (!existing_quartz.length \|\| (sigma_q > 2.0 && rng.random() < 0.3)) {` | 10 | 397 | 19 | 2.32 | 1.35 |
| skutterudite | active-capped | js/91-nucleation-sulfide.ts:425 | `if (existing.length >= 2) return;` | 2 | 21 | 1 | 2.10 | 0.00 |
| albite | soft | js/89-nucleation-silicate.ts:104 | `if (!existing_alb.length \|\| (sigma_alb > 1.5 && rng.random() < 0.25)) {` | 2 | 252 | 12 | 2.04 | 1.64 |
| caledonite | active-capped | js/90-nucleation-sulfate.ts:293 | `if (existing.length >= 2) return;` | 3 | 21 | 1 | 2.00 | 2.00 |
| calaverite | cap-only | js/91-nucleation-sulfide.ts:626 | `if (sigma > MINERAL_GATES_calaverite.sigma_crit && !sim._atNucleationCap('calaverite') && rng.random() < 0.10) {` | 2 | 42 | 2 | 2.00 | 1.00 |
| sylvanite | cap-only | js/91-nucleation-sulfide.ts:639 | `if (sigma > MINERAL_GATES_sylvanite.sigma_crit && !sim._atNucleationCap('sylvanite') && rng.random() < 0.10) {` | 2 | 42 | 2 | 2.00 | 1.00 |
| safflorite | active-capped | js/91-nucleation-sulfide.ts:443 | `if (existing.length >= 2) return;` | 2 | 21 | 1 | 2.00 | 0.00 |
| aragonite | strict | js/82-nucleation-carbonate.ts:60 | `: !existing_arag.length;` | 4 | 63 | 3 | 1.98 | 1.48 |
| wollastonite | soft | js/89-nucleation-silicate.ts:747 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 4 | 21 | 1 | 1.86 | 0.00 |
| feldspar | soft | js/89-nucleation-silicate.ts:81 | `if (!existing_feld.length \|\| (sigma_feld > 1.8 && rng.random() < 0.3)) {` | 2 | 252 | 12 | 1.83 | 1.62 |
| proustite | active-capped | js/91-nucleation-sulfide.ts:522 | `if (existing.length >= 2) return;` | 2 | 21 | 1 | 1.71 | 0.00 |
| chalcopyrite | strict | js/91-nucleation-sulfide.ts:68 | `if (sigma_cp > MINERAL_GATES_chalcopyrite.sigma_crit && !existing_cp.length && !sim._atNucleationCap('chalcopyrite')) {` | 5 | 84 | 4 | 1.70 | 0.50 |
| mimetite | strict | js/80-nucleation-arsenate.ts:65 | `if (sigma_mim > MINERAL_GATES_mimetite.sigma_crit && !existing_mim.length && total_mim < 3 && !sim._atNucleationCap('mimetite')) {` | 3 | 63 | 3 | 1.63 | 0.33 |
| scolecite | soft | js/89-nucleation-silicate.ts:1081 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 5 | 21 | 1 | 1.62 | 0.95 |
| native_bismuth | soft | js/86-nucleation-native.ts:24 | `if (!existing_nbi.length \|\| (sigma_nbi > 2.0 && rng.random() < 0.15)) {` | 3 | 28 | 2 | 1.57 | 0.00 |
| magnetite | soft | js/87-nucleation-oxide.ts:47 | `if (!existing_mag.length \|\| (sigma_mag > 1.7 && rng.random() < 0.2)) {` | 5 | 44 | 3 | 1.57 | 0.00 |
| alunite | cap-only | js/90-nucleation-sulfate.ts:106 | `if (rng.random() < 0.45) {` | 5 | 16 | 1 | 1.56 | 0.00 |
| stibnite | soft | js/91-nucleation-sulfide.ts:184 | `if (!existing_stb.length \|\| (sigma_stb > 1.8 && rng.random() < 0.2)) {` | 4 | 21 | 1 | 1.52 | 0.00 |
| goethite | strict | js/84-nucleation-hydroxide.ts:22 | `const ordinaryBirthAllowed = !existing_goe_active.length;` | 3 | 147 | 7 | 1.51 | 0.90 |
| adamite | strict | js/80-nucleation-arsenate.ts:42 | `if (sigma_adam > MINERAL_GATES_adamite.sigma_crit && !existing_adam.length && total_adam < 4 && !sim._atNucleationCap('adamite')) …` | 4 | 21 | 1 | 1.38 | 1.29 |
| apophyllite | strict | js/89-nucleation-silicate.ts:60 | `if (sigma_ap > MINERAL_GATES_apophyllite.sigma_crit && !existing_ap.length && !sim._atNucleationCap('apophyllite')) {` | 4 | 42 | 2 | 1.38 | 0.79 |
| selenite | soft | js/90-nucleation-sulfate.ts:189 | `if (!existing_sel.length \|\| (sigma_sel > 1.8 && rng.random() < 0.3)) {` | 10 | 84 | 4 | 1.29 | 0.75 |
| smithsonite | strict | js/82-nucleation-carbonate.ts:231 | `if (existing_sm.length \|\| total_sm >= 3 \|\| sim._atNucleationCap('smithsonite')) return;` | 3 | 42 | 2 | 1.26 | 0.50 |
| pyrite | strict | js/91-nucleation-sulfide.ts:34 | `if (sigma_py > MINERAL_GATES_pyrite.sigma_crit && !existing_py.length && !sim._atNucleationCap('pyrite')) {` | 3 | 147 | 7 | 1.20 | 0.56 |
| chrysotile | soft | js/89-nucleation-silicate.ts:695 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.25)) {` | 5 | 21 | 1 | 1.19 | 0.86 |
| sphalerite | strict | js/91-nucleation-sulfide.ts:16 | `if (sigma_s > MINERAL_GATES_sphalerite.sigma_crit && !existing_sph.length && !sim._atNucleationCap('sphalerite')) {` | 5 | 147 | 7 | 1.17 | 0.62 |
| siderite | strict | js/82-nucleation-carbonate.ts:173 | `if (sigma_sid > MINERAL_GATES_siderite.sigma_crit && !existing_sid.length && !sim._atNucleationCap('siderite')) {` | 4 | 126 | 6 | 1.17 | 0.63 |
| zeunerite | cap-only | js/88-nucleation-phosphate.ts:121 | `if (rng.random() < 0.20) {` | 4 | 8 | 1 | 1.13 | 0.00 |
| naumannite | cap-only | js/91-nucleation-sulfide.ts:661 | `if (sigma > MINERAL_GATES_naumannite.sigma_crit && !sim._atNucleationCap('naumannite') && rng.random() < 0.10) {` | 2 | 8 | 1 | 1.13 | 0.00 |
| marcasite | strict | js/91-nucleation-sulfide.ts:49 | `if (sigma_mc > MINERAL_GATES_marcasite.sigma_crit && !existing_mc.length && !sim._atNucleationCap('marcasite')) {` | 4 | 60 | 3 | 1.10 | 0.65 |
| annabergite | strict | js/80-nucleation-arsenate.ts:115 | `if (sigma_ann > MINERAL_GATES_annabergite.sigma_crit && !existing_ann.length && !sim._atNucleationCap('annabergite')) {` | 4 | 63 | 3 | 1.10 | 0.33 |
| hematite | strict | js/87-nucleation-oxide.ts:18 | `if (sigma_hem > MINERAL_GATES_hematite.sigma_crit && !existing_hem.length && total_hem < 3 && !sim._atNucleationCap('hematite')) {` | 3 | 126 | 6 | 1.07 | 0.77 |
| cuprite | soft | js/87-nucleation-oxide.ts:62 | `if (!existing_cpr.length \|\| (sigma_cpr > 1.8 && rng.random() < 0.2)) {` | 4 | 48 | 3 | 1.06 | 0.00 |
| tennantite | strict | js/91-nucleation-sulfide.ts:97 | `if (sigma_tn > MINERAL_GATES_tennantite.sigma_crit && !existing_tn.length && !sim._atNucleationCap('tennantite')) {` | 4 | 105 | 5 | 1.02 | 0.19 |
| erythrite | strict | js/80-nucleation-arsenate.ts:87 | `if (sigma_ery > MINERAL_GATES_erythrite.sigma_crit && !existing_ery.length && !sim._atNucleationCap('erythrite')) {` | 4 | 63 | 3 | 1.02 | 0.33 |
| fluorite | strict | js/83-nucleation-halide.ts:16 | `if (sigma_f > MINERAL_GATES_fluorite.sigma_crit && !existing_fl.length && !sim._atNucleationCap('fluorite')) {` | 5 | 105 | 5 | 1.00 | 0.79 |
| malachite | strict | js/82-nucleation-carbonate.ts:205 | `if (existing_mal.length \|\| total_mal >= 3 \|\| sim._atNucleationCap('malachite')) return;` | 3 | 84 | 4 | 1.00 | 0.75 |
| native_copper | soft | js/86-nucleation-native.ts:118 | `if (!existing_nc_nuc.length \|\| (sigma_nc > 2.2 && rng.random() < 0.15)) {` | 3 | 15 | 1 | 1.00 | 0.00 |
| tetrahedrite | strict | js/91-nucleation-sulfide.ts:82 | `if (sigma_td > MINERAL_GATES_tetrahedrite.sigma_crit && !existing_td.length && !sim._atNucleationCap('tetrahedrite')) {` | 4 | 84 | 4 | 1.00 | 0.00 |
| torbernite | cap-only | js/88-nucleation-phosphate.ts:103 | `if (rng.random() < 0.20) {` | 4 | 1 | 1 | 1.00 | 0.00 |
| wulfenite | strict | js/85-nucleation-molybdate.ts:17 | `if (sigma_wulf > MINERAL_GATES_wulfenite.sigma_crit && !existing_wulf.length && total_wulf < 2 && !sim._atNucleationCap('wulfenite…` | 5 | 21 | 1 | 1.00 | 1.00 |
| mesolite | soft | js/89-nucleation-silicate.ts:1107 | `if (!existing.length \|\| (sigma > 2.0 && rng.random() < 0.20)) {` | 5 | 21 | 1 | 1.00 | 0.00 |
| rhodochrosite | strict | js/82-nucleation-carbonate.ts:188 | `if (sigma_rho > MINERAL_GATES_rhodochrosite.sigma_crit && !existing_rho.length && !sim._atNucleationCap('rhodochrosite')) {` | 4 | 78 | 4 | 1.00 | 0.54 |

## What happens to each real top-three species (species with an engine)
| gate | never forms | dust (median largest < 1 mm) | visible, outside the sim top three | tied across the sim's third place | in the sim top three | total |
|---|---:|---:|---:|---:|---:|---:|
| strict | 11 | 4 | 9 | 4 | 0 | 28 |
| soft | 8 | 11 | 2 | 1 | 20 | 42 |
| cap-only | 1 | 0 | 1 | 0 | 4 | 6 |
| all | 20 | 15 | 12 | 5 | 24 | 76 |
Tied across the real third place, not counted: epidote@grimsel_alpine_cleft (soft; one of 1 open slot for {epidote, rutile}); rutile@grimsel_alpine_cleft (cap-only; one of 1 open slot for {epidote, rutile}); native_silver@schneeberg (cap-only; one of 1 open slot for {ma:eulytine, native_silver}). "In the sim top three" entries whose median largest crystal is < 1 mm: halite@searles_lake.
P(in the sim top three | it forms visible crystals) — "visible" = in or tied for the sim top three, or median largest ≥ 1 mm:
| gate | by visible count | counting ties as in | by volume | counting ties as in |
|---|---:|---:|---:|---:|
| strict | 0/13 | 4/13 | 6/13 | 6/13 |
| soft | 20/23 | 21/23 | 15/23 | 15/23 |
| cap-only | 4/5 | 4/5 | 5/5 | 5/5 |
| all but strict | 24/28 | 25/28 | 20/28 | 20/28 |
sim top-three slots by gate, by visible count: strict 5.7, soft 40.3, active-capped 5, cap-only 30, transformation 3; by volume: strict 20, soft 42, active-capped 6, cap-only 20, transformation 2
real top-three slots by gate (species with an engine): strict 28, soft 42, cap-only 6 (of 76)
Never-forming real top-three species: calcite@amethyst_geode, quartz@chiastolite_hornfels, chalcedony@chiastolite_hornfels, calcite@cooling, fluorite@epithermal_telluride, chalcedony@ultramafic_supergene, ruby@marble_contact_metamorphism, fluorite@naica_geothermal, calcite@naica_geothermal, fluorite@tn457_barite_pulses, galena@tn457_barite_pulses, quartz@tn457_barite_pulses, quartz@reactivated_fluorite_vein, hematite@ouro_preto, calcite@reactive_wall, chalcopyrite@reactive_wall, aquamarine@shigar_pegmatite, aragonite@sicily_solfifera, calcite@supergene_oxidation, zeunerite@wittichen
Tied across the sim's third place: fluorite@elmwood (strict), calcite@elmwood (strict), sphalerite@elmwood (strict), galena@mvt (soft), calcite@mvt (strict)

## Dust — headline species the sim grows with a median largest crystal < 1 mm
| scenario | species | real share (voting sources) | literature | sim crystals per vug | median largest mm | largest in any seed mm | seeds with a ≥ 1 mm crystal |
|---|---|---:|---|---:|---:|---:|---:|
| amethyst_geode | quartz | 56% | AB | 1.0 | 0.84 | 0.87 | 0% |
| amethyst_geode | chalcedony | 23% | AB | 2.5 | 0.15 | 0.16 | 0% |
| asbestos_hills_crack_seal | quartz | 1.7% | AB | 1.0 | 0.29 | 0.30 | 0% |
| asbestos_hills_crack_seal | magnetite | 0% | AB | 1.7 | 0.15 | 0.19 | 0% |
| asbestos_hills_surficial_alteration | quartz | 1.7% | AB | 1.0 | 0.29 | 0.31 | 0% |
| asbestos_hills_surficial_alteration | magnetite | 0% | AB | 1.5 | 0.18 | 0.19 | 0% |
| bisbee | azurite | 16% |  | 4.0 | 0.51 | 0.75 | 0% |
| bisbee | native_copper | 12% |  | 0.7 | 0.07 | 0.10 | 0% |
| colorado_plateau | carnotite | 1.2% | AB | 4.0 | 0.81 | 0.87 | 0% |
| cooling | quartz | 94% | AB | 1.0 | 0.57 | 0.59 | 0% |
| deccan_zeolite | stilbite | 18% | AB | 4.3 | 0.88 | 0.96 | 0% |
| gem_pegmatite | tourmaline | 83% | AB | 3.0 | 0.37 | 0.58 | 0% |
| grimsel_alpine_cleft | fluorite | 30% | CO | 1.0 | 0.51 | 0.52 | 0% |
| roughten_gill | mimetite | 17% | CO | 1.2 | 0.05 | 0.10 | 0% |
| roughten_gill | quartz | 9.1% | AB | 1.0 | 0.23 | 0.24 | 0% |
| schneeberg | native_bismuth | 2.5% | AB | 0.4 | 0.06 | 0.07 | 0% |
| searles_lake | halite | 38% | AB | 5.3 | 0.00 | 3.1 | 9.5% |
| sicily_solfifera | selenite | 1.7% | AB (S) | 1.0 | 0.12 | 0.13 | 0% |
| sunnyside_american_tunnel | sphalerite | 2.1% | AB | 1.0 | 0.45 | 0.52 | 0% |
| tormiq_alpine_cleft | quartz | 11% |  | 3.3 | 0.20 | 4.1 | 19% |
| wittichen | native_silver | 3.9% | AB | 3.5 | 0.55 | 0.90 | 0% |
| wittichen | barite | 1.6% | AB | 6.0 | 0.97 | 1.0 | 14% |
| wittichen | safflorite | 1.6% | AB | 2.0 | 0.01 | 0.60 | 0% |
| wittichen | skutterudite | 1.4% | AB | 2.1 | 0.06 | 0.07 | 0% |

## Robustness of the median ρ to the sim measure
median ρ over 28 scored scenarios — visible count 0.00, surviving count -0.02, ≥ 0.1 mm count 0.02, volume -0.11, seeds with a visible crystal 0.00
volume vs visible count: ρ higher in 10, lower in 16, equal in 2; with |Δρ| > 0.05: higher in 9, lower in 9
bootstrap over seeds: median width of the 5–95 % band 0.02; verdict differs in ≥ 20 % of resamples: none
bootstrap over proxies: median width of the 5–95 % band 0.17; verdict differs in ≥ 20 % of resamples: sunnyside_american_tunnel (55 %), epithermal_telluride (40 %), ouro_preto (34 %), tn457_barite_pulses (23 %)
bootstrap over both: median width of the 5–95 % band 0.20; verdict differs in ≥ 20 % of resamples: sunnyside_american_tunnel (53 %), ouro_preto (40 %), epithermal_telluride (39 %), tn457_barite_pulses (30 %)
(scenario, species) pairs in the scored scenarios with the same count in all 21 seeds: visible 180 of 311, surviving 161 of 311
