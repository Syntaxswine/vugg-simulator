<!-- GENERATED — do not edit by hand. Produced by tools/locality-abundance-compare.mjs on 2026-10-21 from: .local-evidence/assemblage-census/runs.jsonl (sha256 1f44838cc156f11d…, SIM 285, 861 runs = 41 scenarios × 21 seeds (1-20 and 42), produced by tools/assemblage-census.mjs at ab79f195) and proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json (sha256 5c825fbeca5d2728…; market dictionary entries' JSON sha256 5d3556449edfb5f27d55d9f4d880f6e56c504084f15d80d08fa85ad03a61fd35). Deterministic (fixed bootstrap seed). Re-run both tools to regenerate. -->

# Sim vs locality abundance — SIM 285, 21 seeds

Thresholds: OVER sim ≥ 10% of visible crystals with photos and listings < 1%; UNDER photos ≥ 10% with sim < 2%; ABSENT sim in ≥ 25% of seeds with no photo and no listing; dust = a headline species (≥ 10% of the voting record, or literature AB) with a median largest crystal < 1 mm.

## Scoreboard
ρ = Spearman between the sim's share of ≥ 1 mm crystals and the real share (mean of photo and listing shares; a source with < 20 observations does not vote), with its 5–95 % seed-bootstrap band. Top 3 = species with the largest shares. Literature marks: (S) snippet-level, (R) recalled.

| scenario | locality | verdict | ρ(sim, real) | seed band | verdict differs | real top 3 | sim top 3 (≥ 1 mm) | overlap | literature: sim top 3 rated rare/undocumented | literature: abundant, no sim crystal ≥ 1 mm |
|---|---|---|---:|---|---:|---|---|---:|---|---|
| amethyst_geode | amethyst_geode | NO VISIBLE CRYSTALS | — | — | 0 % | quartz, chalcedony, calcite |  | 0 |  | quartz, chalcedony, x:celadonite |
| cooling | herkimer | NO VISIBLE CRYSTALS | — | — | 0 % | quartz, x:bitumen, calcite |  | 0 |  | quartz, x:bitumen, dolomite |
| great_salt_plains | great_salt_plains | THIN | — | — | 0 % |  | halite, selenite | 0 |  |  |
| marble_contact_metamorphism | mogok | NO VISIBLE CRYSTALS | — | — | 0 % | x:spinel, ruby, x:painite |  | 0 |  | calcite |
| sulphur_bank | sulphur_bank | THIN | — | — | 0 % |  | cinnabar, pararealgar, orpiment | 0 | pararealgar (S), orpiment (S) | opal |
| bisbee | bisbee | DISAGREES | -0.49 | -0.53 to -0.48 | 0 % | malachite, azurite, native_copper | atacamite, chrysocolla, jarosite | 0 |  |  |
| wittichen | wittichen | DISAGREES | -0.48 | -0.49 to -0.48 | 0 % | erythrite, zeunerite, ma:heinrichite | haidingerite, native_arsenic, nickeline | 0 | haidingerite (S) | native_silver, safflorite, skutterudite |
| supergene_oxidation | tsumeb | DISAGREES | -0.45 | -0.46 to -0.40 | 0 % | smithsonite, cerussite, calcite | ferrimolybdite, brochantite, scorodite | 0 | ferrimolybdite (S), scorodite | calcite, dioptase |
| schneeberg | schneeberg | DISAGREES | -0.36 | -0.41 to -0.34 | 0 % | erythrite, x:pucherite, ma:eulytine | chrysocolla, arsenopyrite, quartz | 0 |  | skutterudite, native_bismuth |
| mvt | tri_state_picher | DISAGREES | -0.35 | -0.41 to -0.35 | 0 % | galena, sphalerite, calcite | anhydrite, greenockite, galena | 1 | anhydrite, greenockite | dolomite |
| porphyry | bingham | DISAGREES | -0.33 | -0.34 to -0.31 | 0 % | pyrite, tetrahedrite, ma:faustite | ferrimolybdite, brochantite, acanthite | 0 | ferrimolybdite (S), acanthite | quartz, bornite |
| reactivated_fluorite_vein | north_pennines | DISAGREES | -0.28 | -0.28 to -0.28 | 0 % | fluorite, galena, quartz | barite, celestine, acanthite | 0 | celestine, acanthite | quartz |
| colorado_plateau | colorado_plateau | DISAGREES | -0.19 | -0.19 to -0.18 | 0 % | x:pascoite, ma:hughesite, ma:dickthomssenite | opal, tyuyamunite, uranophane | 0 | opal, uranophane | carnotite |
| grimsel_alpine_cleft | grimsel | DISAGREES | -0.15 | -0.18 to -0.13 | 0 % | quartz, fluorite, epidote | apatite, quartz, titanite | 1 | titanite | x:chlorite |
| searles_lake | searles_lake | DISAGREES | -0.13 | -0.40 to -0.13 | 0 % | halite, x:hanksite, x:trona | tincalconite, thenardite, halite | 1 | tincalconite (S) | x:hanksite, x:trona |
| naica_geothermal | naica | DISAGREES | -0.10 | -0.10 to -0.10 | 0 % | fluorite, selenite, calcite | celestine, selenite | 1 |  | fluorite |
| roughten_gill | roughton_gill | DISAGREES | -0.08 | -0.09 to -0.05 | 0 % | pyromorphite, mimetite, quartz | pyromorphite, chrysocolla, galena | 1 |  | quartz |
| tn457_barite_pulses | north_pennines | DISAGREES | -0.02 | -0.02 to -0.02 | 0 % | fluorite, galena, quartz | barite, sphalerite | 0 |  | fluorite, galena, quartz |
| sunnyside_american_tunnel | sunnyside | DISAGREES | -0.01 | -0.10 to -0.01 | 0 % | rhodochrosite, fluorite, quartz | galena, argentite, quartz | 1 | argentite | sphalerite, x:rhodonite |
| reactive_wall | viburnum | PARTLY | 0.00 | 0.00 to 0.00 | 0 % | calcite, galena, chalcopyrite | galena, sphalerite, pyrite | 1 |  | dolomite |
| ouro_preto | ouro_preto | PARTLY | 0.03 | 0.03 to 0.03 | 0 % | topaz, hematite, x:euclase | topaz, quartz, albite | 1 | albite |  |
| deccan_zeolite | deccan | PARTLY | 0.04 | 0.02 to 0.06 | 0 % | apophyllite, stilbite, heulandite | chalcedony, heulandite, quartz | 1 |  | stilbite |
| asbestos_hills_crack_seal | asbestos_hills | DISAGREES | 0.04 | 0.04 to 0.04 | 0 % | tigers_eye, crocidolite, x:jasper | opal, crocidolite, tigers_eye | 2 | opal | quartz, magnetite |
| epithermal_telluride | cripple_creek | DISAGREES | 0.09 | 0.09 to 0.10 | 1 % | calaverite, native_gold, fluorite | native_silver, native_gold, hessite | 1 | native_silver, hessite | fluorite, dolomite |
| asbestos_hills_surficial_alteration | asbestos_hills | DISAGREES | 0.10 | 0.07 to 0.11 | 0 % | tigers_eye, crocidolite, x:jasper | opal, crocidolite, tigers_eye | 2 | opal | quartz, magnetite |
| gem_pegmatite | cruzeiro | PARTLY | 0.18 | 0.16 to 0.20 | 37 % | tourmaline, quartz, lepidolite | albite, feldspar, quartz | 1 |  | tourmaline |
| jeffrey_mine | jeffrey_mine | PARTLY | 0.20 | 0.15 to 0.24 | 0 % | grossular, vesuvianite, diopside | vesuvianite, diopside, grossular | 3 |  |  |
| ultramafic_supergene | marlborough | DISAGREES | 0.22 | 0.22 to 0.22 | 0 % | chrysoprase, chalcedony | opal, chrysoprase | 1 | opal | chalcedony, x:magnesite |
| shigar_pegmatite | shigar | PARTLY | 0.34 | 0.34 to 0.34 | 0 % | aquamarine, topaz, quartz | tourmaline, quartz, albite | 1 |  | aquamarine |
| elmwood | elmwood | DISAGREES | 0.34 | 0.34 to 0.34 | 0 % | fluorite, calcite, sphalerite | celestine, fluorite, calcite | 2 |  |  |
| tormiq_alpine_cleft | tormiq | PARTLY | 0.35 | 0.31 to 0.35 | 0 % | titanite, epidote, quartz | epidote, actinolite, titanite | 2 |  |  |
| sicily_solfifera | sicily | PARTLY | 0.36 | 0.36 to 0.36 | 0 % | native_sulfur, aragonite, celestine | celestine, native_sulfur, strontianite | 2 | strontianite (S) | selenite |
| chiastolite_hornfels | chiastolite_hornfels | AGREES | 0.66 | 0.66 to 0.66 | 0 % | andalusite, quartz, chalcedony | andalusite | 1 |  |  |

Verdicts: NO VISIBLE CRYSTALS 3, DISAGREES 19, AGREES 1, PARTLY 8, THIN 2.

### amethyst_geode  ←  amethyst_geode   (sim 21 seeds; 6 photos — does not vote; 70 listing mentions)
ρ(sim visible-count, real) = —   ρ(sim volume, real) = 0.81   ρ(sim surviving count, real) = 0.76
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 1.0 | 100% | 29 | 0 | 99 | 0.84 | 0% | 17 | 56 | AB |
| chalcedony | 2.5 | 100% | 71 | 0 | 1.3 | 0.15 | 0% | 0 | 23 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 50 | 16 | CO |
| goethite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 4.3 |  |
| x:celadonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.4 | AB |
| ma:cristobalite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 17 | 0 |  |
| selenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 17 | 0 | RA |

Flags: UNDER quartz (photos 17%; sim 0% of visible crystals); UNDER calcite (photos 50%; sim 0% of visible crystals); UNDER ma:cristobalite (photos 17%; sim 0% of visible crystals — NO ENGINE); UNDER selenite (photos 17%; sim 0% of visible crystals)

### asbestos_hills_crack_seal  ←  asbestos_hills   (sim 21 seeds; 25 photos; 29 listing mentions)
ρ(sim visible-count, real) = 0.04 [seed bootstrap 5–95 %: 0.04 to 0.04; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.21   ρ(sim surviving count, real) = 0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tigers_eye | 3.0 | 100% | 15 | 17 | 3.2 | 2.8 | 100% | 84 | 79 | CO |
| crocidolite | 3.0 | 100% | 15 | 19 | 2.3 | 2.4 | 100% | 4.0 | 6.9 | AB |
| x:jasper | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.0 | 6.9 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.0 | 0 |  |
| amosite | 3.0 | 100% | 15 | 13 | 0.3 | 1.3 | 100% | 0 | 3.4 | ND |
| quartz | 1.0 | 100% | 5.3 | 0 | <0.1 | 0.29 | 0% | 0 | 3.4 | AB |
| opal | 5.0 | 100% | 25 | 33 | 65 | 6.0 | 100% | 0 | 0 | ND |
| siderite | 1.0 | 100% | 5.1 | 6.6 | 29 | 7.5 | 100% | 0 | 0 | AB |
| goethite | 1.0 | 100% | 5.1 | 6.3 | 0.5 | 2.0 | 95% | 0 | 0 |  |
| hematite | 1.0 | 100% | 5.1 | 4.7 | <0.1 | 1.0 | 71% | 0 | 0 | AB |
| magnetite | 1.7 | 100% | 8.5 | 0 | <0.1 | 0.15 | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 33% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT siderite (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT hematite (sim grows it in 100% of seeds; no photo, no listing); ABSENT magnetite (sim grows it in 100% of seeds; no photo, no listing)

### asbestos_hills_surficial_alteration  ←  asbestos_hills   (sim 21 seeds; 25 photos; 29 listing mentions)
ρ(sim visible-count, real) = 0.10 [seed bootstrap 5–95 %: 0.07 to 0.11; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.20   ρ(sim surviving count, real) = -0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tigers_eye | 3.0 | 100% | 15 | 15 | 3.0 | 3.0 | 100% | 84 | 79 | CO |
| crocidolite | 3.0 | 100% | 15 | 19 | 0.8 | 1.8 | 100% | 4.0 | 6.9 | AB |
| x:jasper | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.0 | 6.9 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.0 | 0 |  |
| amosite | 3.0 | 100% | 15 | 14 | 0.3 | 1.3 | 100% | 0 | 3.4 | ND |
| quartz | 1.0 | 100% | 4.8 | 0 | <0.1 | 0.29 | 0% | 0 | 3.4 | AB |
| opal | 5.0 | 100% | 24 | 33 | 72 | 6.6 | 100% | 0 | 0 | ND |
| siderite | 1.0 | 100% | 4.8 | 6.6 | 22 | 7.3 | 100% | 0 | 0 | AB |
| goethite | 1.0 | 100% | 4.8 | 6.3 | 1.6 | 3.1 | 95% | 0 | 0 |  |
| hematite | 1.0 | 100% | 4.8 | 6.0 | 0.3 | 1.7 | 90% | 0 | 0 | AB |
| lepidocrocite | 1.1 | 100% | 5.3 | 0 | <0.1 | 0.13 | 0% | 0 | 0 |  |
| magnetite | 1.5 | 100% | 7.4 | 0 | <0.1 | 0.18 | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 33% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT siderite (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT hematite (sim grows it in 100% of seeds; no photo, no listing); ABSENT lepidocrocite (sim grows it in 100% of seeds; no photo, no listing); ABSENT magnetite (sim grows it in 100% of seeds; no photo, no listing)

### bisbee  ←  bisbee   (sim 21 seeds; 161 photos; 793 listing mentions)
ρ(sim visible-count, real) = -0.49 [seed bootstrap 5–95 %: -0.53 to -0.48; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.36   ρ(sim surviving count, real) = -0.47
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| malachite | 1.0 | 100% | 0.9 | 2.1 | 43 | 65.4 | 100% | 14 | 24 |  |
| azurite | 4.0 | 100% | 3.6 | 0 | <0.1 | 0.51 | 0% | 14 | 18 |  |
| native_copper | 0.7 | 71% | 0.6 | 0 | <0.1 | 0.07 | 0% | 15 | 9.3 |  |
| cuprite | 1.1 | 100% | 1.0 | 0 | <0.1 | 0.36 | 0% | 14 | 6.3 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.1 | 8.6 |  |
| turquoise | 3.6 | 100% | 3.2 | 2.2 | <0.1 | 0.60 | 29% | 0 | 7.7 |  |
| chrysocolla | 6.2 | 100% | 5.6 | 9.5 | 1.1 | 6.4 | 100% | 1.2 | 3.5 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.9 | 2.4 |  |
| ma:hetaerolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.7 | 0 |  |
| bornite | 2.9 | 100% | 2.6 | 0 | <0.1 | 0.39 | 0% | 1.9 | 1.6 |  |
| brochantite | 5.0 | 100% | 4.4 | 5.5 | <0.1 | 2.0 | 90% | 1.9 | 1.4 |  |
| cerussite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.9 | 0.6 |  |
| aurichalcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.2 | 1.0 |  |
| goethite | 3.0 | 100% | 2.7 | 4.8 | 0.3 | 5.3 | 100% | 0.6 | 0.8 |  |
| native_gold | 13.0 | 100% | 12 | 1.5 | <0.1 | 0.82 | 29% | 0.6 | 0.6 | UN |
| chalcocite | 3.8 | 100% | 3.4 | 1.4 | <0.1 | 1.0 | 52% | 0 | 1.0 |  |
| opal | 5.7 | 100% | 5.1 | 9.4 | 0.1 | 3.3 | 100% | 0 | 0.1 |  |
| chalcedony | 4.0 | 100% | 3.6 | 8.2 | <0.1 | 4.6 | 100% | 0 | 0.1 |  |
| atacamite | 8.1 | 100% | 7.3 | 16 | 15 | 14.2 | 100% | 0 | 0 | doc |
| jarosite | 6.0 | 100% | 5.3 | 9.5 | <0.1 | 3.7 | 100% | 0 | 0 |  |
| acanthite | 4.2 | 100% | 3.8 | 7.9 | <0.1 | 3.5 | 100% | 0 | 0 |  |
| covellite | 3.6 | 95% | 3.2 | 4.7 | <0.1 | 2.0 | 76% | 0 | 0 |  |
| albite | 2.0 | 100% | 1.8 | 4.1 | 0.1 | 8.3 | 100% | 0 | 0 |  |
| feldspar | 2.0 | 100% | 1.8 | 3.4 | <0.1 | 3.3 | 100% | 0 | 0 |  |
| lepidocrocite | 14.5 | 100% | 13 | 0.6 | <0.1 | 0.35 | 29% | 0 | 0 | doc |
| dioptase | 4.8 | 100% | 4.3 | 0 | <0.1 | 0.08 | 0% | 0 | 0 | RA |

Flags: UNDER azurite (photos 14%; sim 0% of visible crystals); UNDER native_copper (photos 15%; sim 0% of visible crystals); UNDER cuprite (photos 14%; sim 0% of visible crystals); OVER atacamite (sim 16% of visible crystals; photos 0%, listings 0%); ABSENT atacamite (sim grows it in 100% of seeds; no photo, no listing); ABSENT jarosite (sim grows it in 100% of seeds; no photo, no listing); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); ABSENT covellite (sim grows it in 95% of seeds; no photo, no listing); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT lepidocrocite (sim grows it in 100% of seeds; no photo, no listing); ABSENT dioptase (sim grows it in 100% of seeds; no photo, no listing)

### chiastolite_hornfels  ←  chiastolite_hornfels   (sim 21 seeds; 3 photos — does not vote; 64 listing mentions)
ρ(sim visible-count, real) = 0.66 [seed bootstrap 5–95 %: 0.66 to 0.66; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.12   ρ(sim surviving count, real) = 0.08
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| andalusite | 5.0 | 100% | 71 | 100 | 90 | 1.2 | 100% | 100 | 89 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 4.7 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.1 |  |
| feldspar | 1.0 | 100% | 14 | 0 | 9.9 | 0.69 | 0% | 0 | 1.6 | ND |
| tourmaline | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.6 |  |
| albite | 1.0 | 100% | 14 | 0 | <0.1 | 0.00 | 0% | 0 | 0 | ND |

Flags: ABSENT albite (sim grows it in 100% of seeds; no photo, no listing)

### colorado_plateau  ←  colorado_plateau   (sim 21 seeds; 81 photos; 18 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.19 [seed bootstrap 5–95 %: -0.19 to -0.18; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.19   ρ(sim surviving count, real) = -0.19
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| x:pascoite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 11 | 5.6 |  |
| ma:hughesite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.6 | 0 |  |
| ma:dickthomssenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| ma:lasalite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| ma:magnesiopascoite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 7.4 | 0 |  |
| x:hewettite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.9 | 0 |  |
| tyuyamunite | 5.0 | 100% | 29 | 38 | 5.7 | 4.4 | 100% | 3.7 | 0 | CO |
| ma:martyite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.7 | 0 |  |
| ma:metahewettite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:metamunirite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:navajoite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| ma:postite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| carnotite | 4.0 | 100% | 23 | 0 | <0.1 | 0.81 | 0% | 1.2 | 0 | AB |
| x:hummerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.2 | 22 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.2 | 11 |  |
| opal | 5.0 | 100% | 30 | 39 | 0.8 | 2.1 | 100% | 0 | 0 | RA |
| uranophane | 3.0 | 100% | 18 | 23 | 93 | 12.6 | 100% | 0 | 0 | RA |
| x:pintadoite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 17 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 11 |  |
| chalcocite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| covellite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| native_silver | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 5.6 |  |
| x:corvusite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |
| x:roscoelite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |

Flags: UNDER x:pascoite (photos 11%; sim 0% of visible crystals — NO ENGINE); OVER opal (sim 39% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); OVER uranophane (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT uranophane (sim grows it in 100% of seeds; no photo, no listing)

### cooling  ←  herkimer   (sim 21 seeds; 29 photos; 748 listing mentions)
ρ(sim visible-count, real) = —   ρ(sim volume, real) = 0.55   ρ(sim surviving count, real) = 0.55
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 1.0 | 100% | 100 | 0 | 100 | 0.57 | 0% | 97 | 92 | AB |
| x:bitumen | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.4 | 4.4 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.9 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.7 | AB |
| barite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.3 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.3 |  |
| apophyllite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.1 |  |
| x:kyanite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.1 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | CO |

Flags: UNDER quartz (photos 97%; sim 0% of visible crystals)

### deccan_zeolite  ←  deccan   (sim 21 seeds; 923 photos; 2351 listing mentions)
ρ(sim visible-count, real) = 0.04 [seed bootstrap 5–95 %: 0.02 to 0.06; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.02   ρ(sim surviving count, real) = 0.09
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| apophyllite | 1.0 | 100% | 3.2 | 3.7 | 0.3 | 1.6 | 62% | 20 | 25 | CO |
| stilbite | 4.3 | 100% | 14 | 0 | 0.1 | 0.88 | 0% | 11 | 26 | AB |
| heulandite | 4.4 | 100% | 14 | 17 | 7.4 | 3.3 | 100% | 6.5 | 8.7 | AB |
| x:cavansite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 10 | 3.3 |  |
| chalcedony | 4.0 | 100% | 13 | 20 | 1.4 | 1.7 | 100% | 1.7 | 9.6 | AB |
| calcite | 1.0 | 100% | 3.2 | 5.6 | 0.5 | 1.7 | 95% | 5.7 | 5.2 | CO |
| scolecite | 1.6 | 100% | 5.2 | 5.6 | 0.2 | 1.3 | 95% | 4.4 | 4.1 | CO |
| x:okenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.2 | 3.0 | CO |
| quartz | 3.0 | 100% | 9.7 | 17 | 78 | 8.0 | 100% | 2.9 | 4.1 | AB |
| x:gyrolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.6 | 1.0 | CO |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.3 | 0.9 |  |
| mesolite | 1.0 | 100% | 3.2 | 0 | <0.1 | 0.03 | 0% | 3.9 | 0.6 | CO |
| x:pentagonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.0 | 0.4 |  |
| prehnite | 1.1 | 100% | 3.7 | 0 | <0.1 | 0.27 | 0% | 2.6 | 1.1 | CO |
| x:laumontite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 0.2 | CO |
| hematite | 1.0 | 100% | 3.2 | 5.9 | 4.2 | 3.7 | 100% | 0 | 0.3 |  |
| goethite | 1.0 | 100% | 3.2 | 5.6 | 0.9 | 2.1 | 95% | 0.1 | 0 | ND |
| albite | 2.3 | 100% | 7.4 | 11 | 7.3 | 4.1 | 100% | 0 | 0 | RA |
| pectolite | 4.0 | 100% | 13 | 8.2 | 0.4 | 1.3 | 95% | 0 | 0 | ND |
| feldspar | 1.0 | 100% | 3.4 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |

Flags: UNDER stilbite (photos 11%; sim 0% of visible crystals); UNDER x:cavansite (photos 10%; sim 0% of visible crystals — NO ENGINE); OVER albite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT pectolite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing)

### elmwood  ←  elmwood   (sim 21 seeds; 193 photos; 820 listing mentions)
ρ(sim visible-count, real) = 0.34 [seed bootstrap 5–95 %: 0.34 to 0.34; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.40   ρ(sim surviving count, real) = 0.16
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 1.0 | 100% | 6.3 | 11 | 17 | 10.3 | 100% | 46 | 22 | CO |
| calcite | 1.0 | 100% | 6.3 | 11 | 45 | 14.2 | 100% | 23 | 28 | AB |
| sphalerite | 1.0 | 100% | 6.3 | 11 | 2.9 | 5.7 | 100% | 20 | 30 | AB |
| barite | 6.0 | 100% | 38 | 0 | <0.1 | 0.59 | 0% | 3.1 | 6.6 | CO |
| galena | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.7 | 2.7 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.6 | 5.5 | UN |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.5 | 2.6 |  |
| x:bitumen | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 |  |
| marcasite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.2 |  |
| celestine | 6.0 | 100% | 38 | 66 | 35 | 7.6 | 100% | 0 | 0.1 | UN |
| chalcedony | 1.0 | 100% | 6.3 | 0 | <0.1 | 0.56 | 0% | 0 | 0 | ND |

Flags: OVER celestine (sim 66% of visible crystals; photos 0%, listings 0.1%); ABSENT chalcedony (sim grows it in 100% of seeds; no photo, no listing)

### epithermal_telluride  ←  cripple_creek   (sim 21 seeds; 69 photos; 164 listing mentions)
ρ(sim visible-count, real) = 0.09 [seed bootstrap 5–95 %: 0.09 to 0.10; verdict differs in 1 % of resamples]   ρ(sim volume, real) = 0.07   ρ(sim surviving count, real) = 0.07
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| calaverite | 2.0 | 100% | 7.4 | 10 | 9.5 | 10.1 | 100% | 39 | 24 | AB |
| native_gold | 4.0 | 100% | 15 | 19 | 0.4 | 3.1 | 100% | 20 | 15 | CO-oxidized |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 13 | 12 | AB |
| sylvanite | 2.0 | 100% | 7.4 | 10 | 9.4 | 10.1 | 100% | 12 | 6.7 | CO |
| quartz | 3.2 | 100% | 12 | 15 | 1.4 | 4.6 | 100% | 1.4 | 12 | AB |
| turquoise | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 6.1 |  |
| ma:melonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.8 | 0 |  |
| x:laumontite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 5.5 |  |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 5.5 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.4 | 2.4 |  |
| native_tellurium | 3.6 | 100% | 13 | 0 | <0.1 | 0.03 | 0% | 2.9 | 0.6 | RA |
| x:petzite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.4 | 0.6 |  |
| native_silver | 4.0 | 100% | 15 | 20 | 5.6 | 7.0 | 100% | 0 | 1.8 | ND |
| x:krennerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.4 | 0 | UN |
| stibnite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.4 | 0 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.6 | CO |
| hessite | 3.0 | 100% | 11 | 15 | 71 | 17.3 | 100% | 0 | 0 | RA |
| feldspar | 2.0 | 100% | 7.4 | 10 | 2.4 | 7.5 | 100% | 0 | 0 | CO |
| albite | 3.2 | 100% | 12 | 1.7 | <0.1 | 0.77 | 24% | 0 | 0 | ND |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: UNDER fluorite (photos 13%; sim 0% of visible crystals); OVER hessite (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT hessite (sim grows it in 100% of seeds; no photo, no listing); OVER feldspar (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing)

### gem_pegmatite  ←  cruzeiro   (sim 21 seeds; 58 photos; 153 listing mentions)
ρ(sim visible-count, real) = 0.18 [seed bootstrap 5–95 %: 0.16 to 0.20; verdict differs in 37 % of resamples]   ρ(sim volume, real) = 0.18   ρ(sim surviving count, real) = 0.23
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| tourmaline | 3.0 | 100% | 15 | 0 | <0.1 | 0.37 | 0% | 88 | 78 | AB |
| quartz | 3.0 | 100% | 15 | 30 | <0.1 | 1.6 | 100% | 6.9 | 8.5 | AB |
| lepidolite | 3.6 | 100% | 18 | 0 | <0.1 | 0.01 | 0% | 0 | 6.5 | CO |
| x:muscovite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.4 | 1.3 | CO |
| albite | 1.9 | 100% | 9.6 | 35 | 2.9 | 25.3 | 100% | 0 | 2.6 | AB |
| torbernite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.7 | 0 |  |
| feldspar | 1.9 | 100% | 9.6 | 35 | 97 | 54.1 | 100% | 0 | 0.7 | AB |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| native_gold | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.7 |  |
| cassiterite | 4.5 | 100% | 23 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | RA |
| spodumene | 1.8 | 100% | 9.1 | 0 | <0.1 | 0.20 | 0% | 0 | 0 | UN |

Flags: UNDER tourmaline (photos 88%; sim 0% of visible crystals); OVER feldspar (sim 35% of visible crystals; photos 0%, listings 0.7%); ABSENT cassiterite (sim grows it in 100% of seeds; no photo, no listing); ABSENT spodumene (sim grows it in 100% of seeds; no photo, no listing)

### great_salt_plains  ←  great_salt_plains   (sim 21 seeds; 2 photos — does not vote; 13 listing mentions — does not vote)
ρ(sim visible-count, real) = —   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| halite | 11.3 | 100% | 85 | 69 | <0.1 | 3.0 | 100% | 0 | 0 | AB-crust |
| selenite | 2.0 | 100% | 15 | 31 | 100 | 40.6 | 100% | 100 | 100 | AB |

Flags: OVER halite (sim 69% of visible crystals; photos 0%, listings 0%); ABSENT halite (sim grows it in 100% of seeds; no photo, no listing)

### grimsel_alpine_cleft  ←  grimsel   (sim 21 seeds; 204 photos; 4 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.15 [seed bootstrap 5–95 %: -0.18 to -0.13; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.25   ρ(sim surviving count, real) = 0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| quartz | 3.8 | 100% | 13 | 16 | 24 | 6.8 | 100% | 50 | 75 | AB |
| fluorite | 1.0 | 100% | 3.5 | 0 | <0.1 | 0.51 | 0% | 30 | 25 | CO |
| epidote | 5.7 | 100% | 20 | 4.3 | <0.1 | 1.0 | 81% | 2.0 | 0 | UN |
| rutile | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| titanite | 4.0 | 100% | 14 | 12 | <0.1 | 1.1 | 95% | 1.5 | 0 | RA |
| hematite | 1.4 | 100% | 5.0 | 5.3 | 0.1 | 1.3 | 100% | 1.5 | 0 | CO (S) |
| x:anatase | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| ma:senaite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| feldspar | 2.0 | 100% | 7.0 | 10 | 4.2 | 5.2 | 100% | 1.0 | 0 | CO |
| ma:grimselite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| x:milarite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| x:zircon | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| apatite | 6.0 | 100% | 21 | 31 | 0.6 | 1.6 | 100% | 0.5 | 0 | UN |
| x:chlorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.5 | 0 | AB |
| albite | 2.0 | 100% | 7.0 | 10 | 7.9 | 6.5 | 100% | 0 | 0 |  |
| calcite | 1.0 | 100% | 3.5 | 5.3 | 62 | 13.0 | 100% | 0 | 0 | CO |
| apophyllite | 1.8 | 100% | 6.1 | 5.1 | 0.3 | 2.2 | 95% | 0 | 0 | RA (S) |

Flags: UNDER fluorite (photos 30%; sim 0% of visible crystals); OVER feldspar (sim 10% of visible crystals; photos 1.0%, listings 0%); OVER apatite (sim 31% of visible crystals; photos 0.5%, listings 0%); OVER albite (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT apophyllite (sim grows it in 100% of seeds; no photo, no listing)

### jeffrey_mine  ←  jeffrey_mine   (sim 21 seeds; 158 photos; 414 listing mentions)
ρ(sim visible-count, real) = 0.20 [seed bootstrap 5–95 %: 0.15 to 0.24; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.18   ρ(sim surviving count, real) = 0.26
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| grossular | 4.8 | 100% | 12 | 13 | 1.8 | 6.0 | 100% | 59 | 52 | AB |
| vesuvianite | 4.0 | 100% | 9.7 | 16 | 20 | 12.6 | 100% | 14 | 26 | CO |
| diopside | 4.0 | 100% | 9.7 | 16 | 72 | 12.7 | 100% | 7.6 | 8.9 | AB |
| pectolite | 3.7 | 100% | 8.9 | 0.6 | <0.1 | 0.30 | 4.8% | 8.9 | 3.6 | UN |
| prehnite | 4.6 | 100% | 11 | 10 | 0.7 | 3.6 | 95% | 2.5 | 2.2 | CO |
| x:chlorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.9 | 1.0 | CO |
| apophyllite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.6 | 1.2 |  |
| chrysotile | 1.2 | 100% | 2.9 | 3.4 | <0.1 | 1.9 | 86% | 1.3 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.2 |  |
| brucite | 4.1 | 100% | 9.9 | 5.9 | <0.1 | 1.1 | 81% | 0.6 | 0 |  |
| ma:allanite group | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| ma:alumovesuvianite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| ma:heazlewoodite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.6 | 0 |  |
| albite | 2.0 | 100% | 4.9 | 8.0 | 5.1 | 11.0 | 100% | 0 | 0.5 |  |
| x:zoisite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0.5 | CO |
| wollastonite | 1.9 | 100% | 4.5 | 0 | <0.1 | 0.43 | 0% | 0 | 0.2 | CO |
| actinolite | 4.0 | 100% | 9.7 | 11 | 0.6 | 4.4 | 100% | 0 | 0 |  |
| awaruite | 3.0 | 100% | 7.3 | 11 | 0.4 | 3.5 | 100% | 0 | 0 | ND? (S) |
| calcite | 1.0 | 100% | 2.4 | 4.0 | <0.1 | 2.0 | 100% | 0 | 0 |  |
| datolite | 3.0 | 100% | 7.3 | 1.7 | <0.1 | 0.69 | 33% | 0 | 0 | ND? (S) |

Flags: OVER actinolite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT actinolite (sim grows it in 100% of seeds; no photo, no listing); OVER awaruite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT awaruite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT datolite (sim grows it in 100% of seeds; no photo, no listing)

### ultramafic_supergene  ←  marlborough   (sim 21 seeds; 10 photos — does not vote; 25 listing mentions)
ρ(sim visible-count, real) = 0.22 [seed bootstrap 5–95 %: 0.22 to 0.22; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.11   ρ(sim surviving count, real) = 0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| chrysoprase | 3.0 | 100% | 28 | 38 | 15 | 5.6 | 100% | 100 | 96 | CO |
| chalcedony | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 4.0 | AB |
| opal | 5.0 | 100% | 46 | 63 | 85 | 8.4 | 100% | 0 | 0 | ND |
| calcite | 1.9 | 100% | 17 | 0 | <0.1 | 0.00 | 0% | 0 | 0 | ND |
| dolomite | 1.0 | 100% | 9.2 | 0 | 0 | — | 0% | 0 | 0 | ND |
| x:magnesite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: OVER opal (sim 63% of visible crystals; photos 0%, listings 0%); ABSENT opal (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT dolomite (sim grows it in 100% of seeds; no photo, no listing)

### marble_contact_metamorphism  ←  mogok   (sim 21 seeds; 163 photos; 178 listing mentions)
ρ(sim visible-count, real) = —   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| x:spinel | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 36 | 21 | CO |
| ruby | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 7.4 | 16 | CO |
| x:painite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 15 | 4.5 |  |
| sapphire | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.6 | 17 |  |
| tourmaline | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.5 | 7.9 |  |
| x:phenakite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.3 | 4.5 |  |
| topaz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.7 | 3.4 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 4.5 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.9 |  |
| aquamarine | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 1.7 |  |
| feldspar | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 0 |  |
| corundum | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.2 | 1.1 |  |
| actinolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| ma:petalite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| beryl | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.2 | 0.6 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.1 | AB |

Flags: UNDER x:spinel (photos 36%; sim 0% of visible crystals — NO ENGINE); UNDER x:painite (photos 15%; sim 0% of visible crystals — NO ENGINE)

### mvt  ←  tri_state_picher   (sim 21 seeds; 51 photos; 478 listing mentions)
ρ(sim visible-count, real) = -0.35 [seed bootstrap 5–95 %: -0.41 to -0.35; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.12   ρ(sim surviving count, real) = -0.48
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| galena | 1.0 | 100% | 1.3 | 7.1 | 2.6 | 11.6 | 100% | 49 | 19 | AB |
| sphalerite | 1.5 | 100% | 2.0 | 4.4 | <0.1 | 1.1 | 62% | 25 | 28 | AB |
| calcite | 1.0 | 100% | 1.3 | 7.1 | 94 | 38.5 | 100% | 7.8 | 16 | AB |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.9 | 14 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.9 | 7.7 | AB |
| marcasite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.9 | 4.0 | CO |
| quartz | 1.2 | 95% | 1.6 | 0 | <0.1 | 0.01 | 0% | 0 | 2.9 | UN |
| barite | 55.6 | 100% | 74 | 0 | <0.1 | 0.04 | 0% | 2.0 | 0.8 | UN |
| pyrite | 1.1 | 100% | 1.5 | 6.4 | <0.1 | 1.9 | 90% | 0 | 2.7 | CO |
| fluorite | 1.0 | 100% | 1.3 | 7.1 | 3.4 | 12.9 | 100% | 0 | 0.4 | RA |
| anhydrite | 7.6 | 100% | 10 | 45 | 0.3 | 3.6 | 95% | 0 | 0 | ND |
| greenockite | 5.3 | 100% | 7.1 | 23 | <0.1 | 2.3 | 100% | 0 | 0 | RA-coating |

Flags: OVER anhydrite (sim 45% of visible crystals; photos 0%, listings 0%); ABSENT anhydrite (sim grows it in 100% of seeds; no photo, no listing); OVER greenockite (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT greenockite (sim grows it in 100% of seeds; no photo, no listing)

### naica_geothermal  ←  naica   (sim 21 seeds; 134 photos; 355 listing mentions)
ρ(sim visible-count, real) = -0.10 [seed bootstrap 5–95 %: -0.10 to -0.10; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.10   ρ(sim surviving count, real) = -0.10
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 37 | 22 | AB |
| selenite | 1.0 | 100% | 14 | 14 | 47 | 2.8 | 100% | 16 | 19 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.0 | 14 | CO |
| galena | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.2 | 10 |  |
| sphalerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.7 | 9.6 |  |
| pyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.7 | 7.9 |  |
| anhydrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.2 | 3.4 | CO |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 5.9 |  |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 2.8 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 0.3 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.7 | 0 |  |
| celestine | 6.0 | 100% | 86 | 86 | 53 | 2.2 | 100% | 0 | 0 | UN-crust |

Flags: UNDER fluorite (photos 37%; sim 0% of visible crystals); OVER celestine (sim 86% of visible crystals; photos 0%, listings 0%); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing)

### tn457_barite_pulses  ←  north_pennines   (sim 21 seeds; 391 photos; 418 listing mentions)
ρ(sim visible-count, real) = -0.02 [seed bootstrap 5–95 %: -0.02 to -0.02; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.02   ρ(sim surviving count, real) = -0.02
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 56 | 63 | AB |
| galena | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 13 | 6.2 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.6 | 11 | AB |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.4 | 5.3 | CO |
| sphalerite | 1.0 | 100% | 14 | 14 | 13 | 6.0 | 100% | 4.6 | 2.2 | CO |
| witherite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.3 | 1.4 | CO |
| siderite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.3 | 2.2 | CO |
| x:barytocalcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0.7 |  |
| barite | 6.0 | 100% | 86 | 86 | 87 | 4.2 | 100% | 0.5 | 1.4 | CO |
| erythrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0.5 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 | CO |
| selenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |

Flags: UNDER fluorite (photos 56%; sim 0% of visible crystals); UNDER galena (photos 13%; sim 0% of visible crystals)

### reactivated_fluorite_vein  ←  north_pennines   (sim 21 seeds; 391 photos; 418 listing mentions)
ρ(sim visible-count, real) = -0.28 [seed bootstrap 5–95 %: -0.28 to -0.28; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.08   ρ(sim surviving count, real) = -0.30
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fluorite | 1.0 | 100% | 2.8 | 3.9 | 3.5 | 17.6 | 100% | 56 | 63 | AB |
| galena | 1.0 | 100% | 2.8 | 3.9 | 0.4 | 8.5 | 100% | 13 | 6.2 | AB |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.6 | 11 | AB |
| calcite | 1.0 | 100% | 2.8 | 3.9 | 96 | 38.6 | 100% | 6.4 | 5.3 | CO |
| sphalerite | 1.7 | 100% | 4.7 | 0 | <0.1 | 0.90 | 0% | 4.6 | 2.2 | CO |
| witherite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.3 | 1.4 | CO |
| siderite | 1.0 | 100% | 2.8 | 3.9 | <0.1 | 1.4 | 100% | 1.3 | 2.2 | CO |
| x:barytocalcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0.7 |  |
| barite | 6.0 | 100% | 17 | 23 | <0.1 | 1.3 | 100% | 0.5 | 1.4 | CO |
| erythrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.5 | 0 |  |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0.5 |  |
| x:ankerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0.2 | CO |
| selenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| celestine | 6.0 | 100% | 17 | 22 | <0.1 | 2.2 | 100% | 0 | 0 | ND |
| acanthite | 4.0 | 100% | 11 | 13 | <0.1 | 2.2 | 100% | 0 | 0 | ND |
| greenockite | 5.0 | 100% | 14 | 12 | <0.1 | 2.0 | 100% | 0 | 0 | RA-coating |
| anhydrite | 7.5 | 100% | 21 | 10 | <0.1 | 1.8 | 95% | 0 | 0 | ND |
| rhodochrosite | 1.0 | 100% | 2.8 | 3.9 | <0.1 | 3.7 | 100% | 0 | 0 | ND |
| native_silver | 0.4 | 29% | 1.1 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |

Flags: OVER celestine (sim 22% of visible crystals; photos 0%, listings 0%); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing); OVER acanthite (sim 13% of visible crystals; photos 0%, listings 0%); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); OVER greenockite (sim 12% of visible crystals; photos 0%, listings 0%); ABSENT greenockite (sim grows it in 100% of seeds; no photo, no listing); OVER anhydrite (sim 10% of visible crystals; photos 0%, listings 0%); ABSENT anhydrite (sim grows it in 100% of seeds; no photo, no listing); ABSENT rhodochrosite (sim grows it in 100% of seeds; no photo, no listing); ABSENT native_silver (sim grows it in 29% of seeds; no photo, no listing)

### ouro_preto  ←  ouro_preto   (sim 21 seeds; 46 photos; 84 listing mentions)
ρ(sim visible-count, real) = 0.03 [seed bootstrap 5–95 %: 0.03 to 0.03; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.26   ρ(sim surviving count, real) = 0.03
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| topaz | 6.0 | 100% | 38 | 45 | 0.4 | 4.6 | 100% | 50 | 79 | CO |
| hematite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 28 | 7.1 | CO |
| x:euclase | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.7 | 8.3 | RA |
| quartz | 5.7 | 100% | 36 | 25 | 0.4 | 4.6 | 100% | 2.2 | 1.2 | AB |
| native_gold | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 1.2 |  |
| goethite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 2.4 |  |
| ma:gibbsite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| ma:leucosphenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| malachite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| rutile | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 0 |  |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.2 |  |
| albite | 2.1 | 100% | 13 | 15 | 47 | 36.8 | 100% | 0 | 0 | ND |
| feldspar | 2.0 | 100% | 13 | 15 | 52 | 23.8 | 100% | 0 | 0 | ND |

Flags: UNDER hematite (photos 28%; sim 0% of visible crystals); OVER albite (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT albite (sim grows it in 100% of seeds; no photo, no listing); OVER feldspar (sim 15% of visible crystals; photos 0%, listings 0%); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing)

### porphyry  ←  bingham   (sim 21 seeds; 30 photos; 52 listing mentions)
ρ(sim visible-count, real) = -0.33 [seed bootstrap 5–95 %: -0.34 to -0.31; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.32   ρ(sim surviving count, real) = -0.47
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| pyrite | 1.0 | 100% | 2.2 | 1.7 | <0.1 | 2.4 | 52% | 10 | 27 | AB |
| tetrahedrite | 1.0 | 100% | 2.2 | 0 | 0 | — | 0% | 10 | 7.7 | CO |
| ma:faustite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 17 | 0 |  |
| galena | 4.0 | 100% | 8.6 | 13 | 2.5 | 11.1 | 100% | 6.7 | 7.7 | CO |
| x:wavellite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 10 | 1.9 |  |
| x:okenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 10 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 5.8 | AB |
| molybdenite | 3.0 | 100% | 6.5 | 9.5 | 76 | 32.2 | 100% | 6.7 | 1.9 | CO |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 7.7 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 3.8 |  |
| ma:arseniosiderite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.7 | 0 |  |
| chalcopyrite | 1.0 | 100% | 2.2 | 3.2 | 0.7 | 9.1 | 100% | 0 | 5.8 | AB |
| x:vivianite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.8 |  |
| enargite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.8 |  |
| brochantite | 4.7 | 100% | 10 | 14 | 0.2 | 4.0 | 100% | 3.3 | 0 |  |
| albite | 2.0 | 100% | 4.3 | 5.1 | <0.1 | 1.9 | 95% | 3.3 | 0 |  |
| azurite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 0 |  |
| ferrimolybdite | 5.3 | 100% | 11 | 16 | 16 | 18.9 | 100% | 0 | 0 | RA (S) |
| acanthite | 4.0 | 100% | 8.6 | 13 | 0.1 | 3.4 | 100% | 0 | 0 | ND |
| arsenopyrite | 3.9 | 100% | 8.4 | 12 | 3.4 | 9.6 | 100% | 0 | 0 | RA (S) |
| feldspar | 2.0 | 100% | 4.3 | 6.2 | <0.1 | 2.3 | 100% | 0 | 0 |  |
| goethite | 2.0 | 100% | 4.3 | 3.5 | <0.1 | 1.2 | 95% | 0 | 0 |  |
| bismuthinite | 4.0 | 100% | 8.6 | 3.0 | <0.1 | 1.2 | 95% | 0 | 0 | RA (S) |
| anglesite | 4.0 | 100% | 8.6 | 0 | <0.1 | 0.76 | 0% | 0 | 0 |  |
| stibnite | 1.5 | 100% | 3.3 | 0 | <0.1 | 0.00 | 0% | 0 | 0 |  |
| bornite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: UNDER pyrite (photos 10%; sim 1.7% of visible crystals); UNDER tetrahedrite (photos 10%; sim 0% of visible crystals); UNDER ma:faustite (photos 17%; sim 0% of visible crystals — NO ENGINE); UNDER x:wavellite (photos 10%; sim 0% of visible crystals — NO ENGINE); UNDER x:okenite (photos 10%; sim 0% of visible crystals — NO ENGINE); OVER ferrimolybdite (sim 16% of visible crystals; photos 0%, listings 0%); ABSENT ferrimolybdite (sim grows it in 100% of seeds; no photo, no listing); OVER acanthite (sim 13% of visible crystals; photos 0%, listings 0%); ABSENT acanthite (sim grows it in 100% of seeds; no photo, no listing); OVER arsenopyrite (sim 12% of visible crystals; photos 0%, listings 0%); ABSENT arsenopyrite (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT goethite (sim grows it in 100% of seeds; no photo, no listing); ABSENT bismuthinite (sim grows it in 100% of seeds; no photo, no listing); ABSENT anglesite (sim grows it in 100% of seeds; no photo, no listing); ABSENT stibnite (sim grows it in 100% of seeds; no photo, no listing)

### reactive_wall  ←  viburnum   (sim 21 seeds; 103 photos; 603 listing mentions)
ρ(sim visible-count, real) = 0.00 [seed bootstrap 5–95 %: 0.00 to 0.00; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.23   ρ(sim surviving count, real) = -0.32
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 42 | 32 | CO |
| galena | 1.0 | 100% | 9.1 | 37 | 14 | 4.0 | 100% | 35 | 22 | AB |
| chalcopyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 12 | 17 | CO |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 11 | AB |
| marcasite | 1.1 | 86% | 10 | 0 | <0.1 | 0.01 | 0% | 2.9 | 5.6 | CO (S) |
| pyrite | 1.3 | 100% | 12 | 26 | 4.7 | 2.7 | 71% | 1.9 | 5.8 | CO (S) |
| x:siegenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.9 | 1.8 | UN |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.3 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.0 | 0 |  |
| sphalerite | 1.0 | 100% | 9.1 | 37 | 82 | 6.5 | 100% | 0 | 0.7 | UN |
| anhydrite | 6.6 | 100% | 60 | 0 | <0.1 | 0.19 | 0% | 0 | 0.2 | ND |

Flags: UNDER calcite (photos 42%; sim 0% of visible crystals); UNDER chalcopyrite (photos 12%; sim 0% of visible crystals); OVER sphalerite (sim 37% of visible crystals; photos 0%, listings 0.7%)

### roughten_gill  ←  roughton_gill   (sim 21 seeds; 69 photos; 126 listing mentions)
ρ(sim visible-count, real) = -0.08 [seed bootstrap 5–95 %: -0.09 to -0.05; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.16   ρ(sim surviving count, real) = -0.16
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| pyromorphite | 6.0 | 100% | 9.9 | 16 | 2.2 | 6.0 | 100% | 17 | 22 | AB |
| mimetite | 1.2 | 100% | 2.0 | 0 | <0.1 | 0.05 | 0% | 5.8 | 29 | CO |
| quartz | 1.0 | 100% | 1.7 | 0 | <0.1 | 0.23 | 0% | 0 | 18 | AB |
| hemimorphite | 3.6 | 100% | 5.9 | 8.0 | <0.1 | 1.4 | 100% | 10 | 1.6 | CO |
| cerussite | 4.2 | 100% | 7.0 | 8.4 | <0.1 | 1.4 | 100% | 5.8 | 2.4 | AB |
| plumbogummite | 3.0 | 100% | 4.9 | 2.0 | <0.1 | 1.1 | 57% | 5.8 | 1.6 | CO |
| linarite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.8 | 1.6 | CO |
| caledonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.8 | 0.8 |  |
| leadhillite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.3 | 0.8 |  |
| calcite | 1.0 | 100% | 1.7 | 2.9 | 0.1 | 3.8 | 100% | 1.4 | 3.2 |  |
| barite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.9 | 0.8 |  |
| arsenopyrite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.2 |  |
| scheelite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 3.2 |  |
| mottramite | 3.8 | 100% | 6.3 | 6.2 | <0.1 | 1.2 | 90% | 1.4 | 1.6 | ND (S) |
| ma:corkite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.9 | 0 |  |
| rosasite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.9 | 0 |  |
| galena | 4.0 | 100% | 6.6 | 12 | 90 | 23.6 | 100% | 1.4 | 0.8 | AB |
| malachite | 1.0 | 100% | 1.7 | 2.9 | 6.7 | 14.0 | 100% | 1.4 | 0.8 | AB |
| chrysocolla | 5.0 | 100% | 8.3 | 14 | 0.5 | 4.1 | 100% | 1.4 | 0 |  |
| brochantite | 5.9 | 100% | 9.7 | 11 | <0.1 | 1.9 | 100% | 1.4 | 0 |  |
| sphalerite | 1.0 | 100% | 1.7 | 2.1 | <0.1 | 3.5 | 71% | 1.4 | 0 |  |
| anglesite | 1.7 | 100% | 2.8 | 1.3 | <0.1 | 0.57 | 43% | 1.4 | 0 |  |
| chalcopyrite | 3.3 | 100% | 5.4 | 0 | <0.1 | 0.01 | 0% | 1.4 | 0 |  |
| alunite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.4 | 0 |  |
| smithsonite | 1.5 | 100% | 2.5 | 0 | <0.1 | 0.24 | 0% | 1.4 | 0 | CO |
| pyrite | 1.0 | 100% | 1.7 | 2.2 | <0.1 | 1.4 | 76% | 0 | 0.8 |  |
| aurichalcite | 3.9 | 100% | 6.4 | 0 | <0.1 | 0.57 | 0% | 0 | 0.8 |  |
| chalcocite | 4.6 | 100% | 7.6 | 11 | <0.1 | 2.0 | 100% | 0 | 0 |  |

Flags: OVER chalcocite (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT chalcocite (sim grows it in 100% of seeds; no photo, no listing)

### schneeberg  ←  schneeberg   (sim 21 seeds; 1138 photos; 13 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.36 [seed bootstrap 5–95 %: -0.41 to -0.34; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.40   ρ(sim surviving count, real) = -0.65
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| erythrite | 1.0 | 100% | 1.4 | 0 | <0.1 | 0.71 | 0% | 9.1 | 7.7 | CO (S) |
| x:pucherite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.1 | 7.7 |  |
| ma:eulytine | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| native_silver | 0.9 | 71% | 1.2 | 0 | <0.1 | 0.04 | 0% | 3.9 | 0 | CO |
| skutterudite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.7 | 7.7 | AB |
| x:walpurgite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.6 | 0 |  |
| x:roselite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 0 |  |
| torbernite | 0.0 | 4.8% | <0.1 | 0 | <0.1 | 0.78 | 0% | 2.9 | 0 |  |
| native_bismuth | 0.4 | 38% | 0.6 | 0 | <0.1 | 0.06 | 0% | 2.5 | 15 | AB |
| zeunerite | 0.4 | 38% | 0.6 | 0 | <0.1 | 0.12 | 0% | 2.5 | 0 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 15 |  |
| quartz | 3.0 | 100% | 4.2 | 14 | 63 | 24.8 | 100% | 2.1 | 0 |  |
| uraninite | 3.0 | 100% | 4.2 | 14 | 1.8 | 8.0 | 100% | 1.3 | 0 | UN |
| proustite | 1.7 | 100% | 2.4 | 0 | <0.1 | 0.72 | 0% | 1.2 | 7.7 |  |
| x:bismutite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.1 | 7.7 |  |
| acanthite | 3.6 | 100% | 5.0 | 5.9 | <0.1 | 1.1 | 71% | 1.0 | 0 |  |
| nickeline | 3.6 | 100% | 5.1 | 3.7 | <0.1 | 0.92 | 48% | 1.0 | 0 | CO |
| metazeunerite | 3.0 | 100% | 4.2 | 0 | <0.1 | 0.85 | 0% | 0.4 | 0 |  |
| siderite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.4 | 7.7 |  |
| autunite | 3.7 | 100% | 5.2 | 3.9 | <0.1 | 1.1 | 62% | 0.3 | 0 |  |
| pharmacolite | 3.0 | 95% | 4.3 | 0.9 | <0.1 | 0.68 | 14% | 0.3 | 0 |  |
| uranospinite | 3.2 | 100% | 4.5 | 0 | <0.1 | 0.66 | 0% | 0.3 | 0 |  |
| x:schneebergite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.2 | 15 |  |
| chrysocolla | 5.0 | 100% | 7.1 | 21 | 0.2 | 3.4 | 100% | <0.1 | 0 |  |
| arsenopyrite | 3.7 | 100% | 5.2 | 15 | 0.1 | 3.7 | 95% | <0.1 | 0 |  |
| uranophane | 3.0 | 100% | 4.2 | 11 | <0.1 | 2.2 | 100% | 0 | 0 |  |
| feldspar | 2.0 | 100% | 2.8 | 9.6 | 35 | 27.4 | 100% | 0 | 0 |  |
| annabergite | 1.2 | 100% | 1.7 | 0 | <0.1 | 0.27 | 0% | 0 | 0 |  |
| brochantite | 4.5 | 100% | 6.3 | 0 | <0.1 | 0.46 | 0% | 0 | 0 |  |
| topaz | 3.9 | 100% | 5.4 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | ND (S) |
| cassiterite | 3.3 | 95% | 4.6 | 0 | <0.1 | 0.04 | 0% | 0 | 0 | ND |

Flags: OVER chrysocolla (sim 21% of visible crystals; photos <0.1%, listings 0%); OVER arsenopyrite (sim 15% of visible crystals; photos <0.1%, listings 0%); OVER uranophane (sim 11% of visible crystals; photos 0%, listings 0%); ABSENT uranophane (sim grows it in 100% of seeds; no photo, no listing); ABSENT feldspar (sim grows it in 100% of seeds; no photo, no listing); ABSENT annabergite (sim grows it in 100% of seeds; no photo, no listing); ABSENT brochantite (sim grows it in 100% of seeds; no photo, no listing); ABSENT topaz (sim grows it in 100% of seeds; no photo, no listing); ABSENT cassiterite (sim grows it in 95% of seeds; no photo, no listing)

### searles_lake  ←  searles_lake   (sim 21 seeds; 48 photos; 134 listing mentions)
ρ(sim visible-count, real) = -0.13 [seed bootstrap 5–95 %: -0.40 to -0.13; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.39   ρ(sim surviving count, real) = -0.62
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| halite | 5.3 | 100% | 12 | 1.3 | <0.1 | 0.00 | 9.5% | 27 | 49 | AB |
| x:hanksite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 27 | 18 | AB |
| x:trona | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 13 | AB |
| x:sulfohalite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.3 | 6.7 | RA |
| x:burkeite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.3 | 2.2 | UN |
| x:gaylussite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.3 | 3.0 | CO (S) |
| x:pirssonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.3 | 3.0 | UN |
| x:northupite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.3 | 0 |  |
| borax | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 1.5 | CO |
| x:aphthitalite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| ma:galeite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| ma:nahcolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 0 |  |
| thenardite | 4.7 | 100% | 10 | 28 | 95 | 52.8 | 100% | 0 | 0.7 | UN |
| tincalconite | 8.0 | 100% | 18 | 71 | 4.7 | 7.8 | 100% | 0 | 0 | RA (S) |
| calcite | 10.8 | 100% | 24 | 0 | <0.1 | 0.01 | 0% | 0 | 0 | RA (S) |
| celestine | 8.9 | 100% | 19 | 0 | <0.1 | 0.35 | 0% | 0 | 0 | ND |
| mirabilite | 8.0 | 100% | 17 | 0 | 0 | — | 0% | 0 | 0 | RA (S) |

Flags: UNDER halite (photos 27%; sim 1.3% of visible crystals); UNDER x:hanksite (photos 27%; sim 0% of visible crystals — NO ENGINE); OVER thenardite (sim 28% of visible crystals; photos 0%, listings 0.7%); OVER tincalconite (sim 71% of visible crystals; photos 0%, listings 0%); ABSENT tincalconite (sim grows it in 100% of seeds; no photo, no listing); ABSENT calcite (sim grows it in 100% of seeds; no photo, no listing); ABSENT celestine (sim grows it in 100% of seeds; no photo, no listing); ABSENT mirabilite (sim grows it in 100% of seeds; no photo, no listing)

### shigar_pegmatite  ←  shigar   (sim 21 seeds; 300 photos; 1415 listing mentions)
ρ(sim visible-count, real) = 0.34 [seed bootstrap 5–95 %: 0.34 to 0.34; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.41   ρ(sim surviving count, real) = 0.51
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| aquamarine | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 16 | 36 | AB |
| topaz | 4.5 | 100% | 23 | 0 | <0.1 | 0.59 | 0% | 15 | 4.6 | CO |
| quartz | 3.0 | 100% | 16 | 28 | <0.1 | 11.1 | 100% | 6.0 | 10 | AB |
| tourmaline | 7.8 | 100% | 40 | 35 | <0.1 | 1.8 | 100% | 2.0 | 12 | CO |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 8.3 | 4.9 | CO |
| x:muscovite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.7 | 7.7 | CO |
| epidote | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 7.3 | 0.8 |  |
| albite | 2.0 | 100% | 10 | 19 | 55 | 268.6 | 100% | 2.7 | 5.4 | AB |
| beryl | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.3 | 2.7 |  |
| x:clinozoisite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.0 | 0.2 |  |
| feldspar | 2.0 | 100% | 10 | 19 | 45 | 156.2 | 100% | 2.7 | 3.5 | AB |
| vesuvianite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.0 | 0.4 |  |
| titanite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 0.3 |  |
| x:zoisite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 0.3 |  |
| diopside | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.0 | 0.2 |  |
| apatite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.7 | 2.5 | CO |
| actinolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.0 | <0.1 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.3 | 1.4 | CO |

Flags: UNDER aquamarine (photos 16%; sim 0% of visible crystals); UNDER topaz (photos 15%; sim 0% of visible crystals)

### sicily_solfifera  ←  sicily   (sim 21 seeds; 114 photos; 183 listing mentions)
ρ(sim visible-count, real) = 0.36 [seed bootstrap 5–95 %: 0.36 to 0.36; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.42   ρ(sim surviving count, real) = 0.41
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| native_sulfur | 4.3 | 100% | 27 | 28 | 12 | 5.0 | 100% | 60 | 51 | AB |
| aragonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 9.6 | 21 | CO |
| celestine | 6.0 | 100% | 37 | 43 | 88 | 9.1 | 100% | 18 | 13 | CO |
| calcite | 1.0 | 100% | 6.1 | 4.7 | <0.1 | 1.0 | 67% | 5.3 | 8.2 | AB |
| selenite | 1.0 | 100% | 6.1 | 0 | <0.1 | 0.12 | 0% | 1.8 | 1.6 | AB (S) |
| alunite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| halite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 1.8 | 0 |  |
| quartz | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| hematite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 1.1 |  |
| ma:amber | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| ma:kalinite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| x:melanophlogite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.9 | 0 |  |
| strontianite | 4.0 | 100% | 24 | 25 | 0.2 | 1.3 | 100% | 0 | 0 | RA (S) |

Flags: OVER strontianite (sim 25% of visible crystals; photos 0%, listings 0%); ABSENT strontianite (sim grows it in 100% of seeds; no photo, no listing)

### sulphur_bank  ←  sulphur_bank   (sim 21 seeds; 2 photos — does not vote; 1 listing mentions — does not vote)
ρ(sim visible-count, real) = —   ρ(sim volume, real) = —   ρ(sim surviving count, real) = —
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| cinnabar | 6.3 | 100% | 22 | 23 | 3.6 | 8.6 | 100% | 0 | 0 | AB |
| pararealgar | 6.0 | 100% | 21 | 23 | <0.1 | 1.4 | 100% | 0 | 0 | ND? (S) |
| orpiment | 7.0 | 100% | 24 | 22 | 0.2 | 3.3 | 100% | 0 | 0 | ND? (S) |
| native_sulfur | 4.0 | 100% | 14 | 15 | 0.6 | 5.1 | 100% | 0 | 100 | AB |
| metacinnabar | 3.0 | 100% | 10 | 12 | 12 | 16.3 | 100% | 50 | 0 | RA |
| marcasite | 1.0 | 100% | 3.4 | 4.0 | 84 | 39.3 | 100% | 0 | 0 | UN |
| pyrite | 1.9 | 100% | 6.4 | 0 | <0.1 | 0.53 | 0% | 0 | 0 | CO (S) |
| stibnite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 50 | 0 |  |
| opal | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 0 | AB |

Flags: OVER cinnabar (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT cinnabar (sim grows it in 100% of seeds; no photo, no listing); OVER pararealgar (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT pararealgar (sim grows it in 100% of seeds; no photo, no listing); OVER orpiment (sim 22% of visible crystals; photos 0%, listings 0%); ABSENT orpiment (sim grows it in 100% of seeds; no photo, no listing); ABSENT marcasite (sim grows it in 100% of seeds; no photo, no listing); ABSENT pyrite (sim grows it in 100% of seeds; no photo, no listing); UNDER stibnite (photos 50%; sim 0% of visible crystals)

### sunnyside_american_tunnel  ←  sunnyside   (sim 21 seeds; 51 photos; 216 listing mentions)
ρ(sim visible-count, real) = -0.01 [seed bootstrap 5–95 %: -0.10 to -0.01; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.05   ρ(sim surviving count, real) = -0.30
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| rhodochrosite | 1.0 | 100% | 2.7 | 7.1 | <0.1 | 5.1 | 100% | 45 | 27 | AB |
| fluorite | 1.0 | 100% | 2.7 | 6.8 | <0.1 | 1.3 | 95% | 29 | 11 | CO |
| quartz | 3.0 | 100% | 8.1 | 15 | <0.1 | 1.4 | 100% | 5.9 | 28 | AB |
| native_gold | 4.8 | 100% | 13 | 0 | <0.1 | 0.83 | 0% | 3.9 | 7.4 | CO |
| wolframite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 4.2 | UN |
| pyrite | 1.0 | 100% | 2.7 | 0 | <0.1 | 0.74 | 0% | 2.0 | 3.2 | CO |
| sphalerite | 1.0 | 100% | 2.7 | 0 | <0.1 | 0.45 | 0% | 0 | 4.2 | AB |
| ma:pyroxmangite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| chalcopyrite | 1.5 | 100% | 4.0 | 0 | <0.1 | 0.24 | 0% | 2.0 | 1.9 | CO |
| x:rhodonite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0.9 | AB |
| calcite | 1.0 | 100% | 2.7 | 7.1 | 92 | 73.5 | 100% | 0 | 2.8 |  |
| selenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0.5 |  |
| galena | 4.0 | 100% | 11 | 29 | 7.4 | 22.8 | 100% | 0 | 2.3 | AB |
| hessite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| native_silver | 4.0 | 100% | 11 | 0 | 0 | — | 0% | 0 | 0.9 | ND |
| sylvanite | 2.0 | 100% | 5.3 | 0 | <0.1 | 0.02 | 0% | 0 | 0.5 |  |
| argentite | 6.4 | 100% | 17 | 23 | <0.1 | 4.5 | 100% | 0 | 0 | ND |
| tennantite | 1.1 | 100% | 2.9 | 6.8 | <0.1 | 2.5 | 95% | 0 | 0 |  |
| arsenopyrite | 2.9 | 95% | 7.6 | 6.1 | <0.1 | 1.2 | 62% | 0 | 0 | ND |
| calaverite | 2.0 | 100% | 5.3 | 0 | <0.1 | 0.02 | 0% | 0 | 0 | RA |

Flags: OVER argentite (sim 23% of visible crystals; photos 0%, listings 0%); ABSENT argentite (sim grows it in 100% of seeds; no photo, no listing); ABSENT tennantite (sim grows it in 100% of seeds; no photo, no listing); ABSENT arsenopyrite (sim grows it in 95% of seeds; no photo, no listing); ABSENT calaverite (sim grows it in 100% of seeds; no photo, no listing)

### tormiq_alpine_cleft  ←  tormiq   (sim 21 seeds; 49 photos; 129 listing mentions)
ρ(sim visible-count, real) = 0.35 [seed bootstrap 5–95 %: 0.31 to 0.35; verdict differs in 0 % of resamples]   ρ(sim volume, real) = 0.41   ρ(sim surviving count, real) = 0.37
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| titanite | 3.0 | 100% | 16 | 15 | <0.1 | 5.2 | 95% | 24 | 17 | doc (S) |
| epidote | 5.0 | 100% | 26 | 33 | 11 | 23.9 | 100% | 20 | 12 | AB (S) |
| quartz | 3.3 | 95% | 17 | 3.1 | <0.1 | 0.20 | 19% | 0 | 22 |  |
| x:clinozoisite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 14 | 0.8 |  |
| x:ilmenite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 14 | 0.8 |  |
| hematite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 14 |  |
| albite | 2.0 | 100% | 10 | 13 | 76 | 65.4 | 100% | 2.0 | 4.7 |  |
| rutile | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 4.7 |  |
| feldspar | 2.0 | 100% | 10 | 13 | 12 | 36.8 | 100% | 4.1 | 2.3 |  |
| apatite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 6.2 |  |
| diopside | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.1 | 0 |  |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 2.3 |  |
| x:hedenbergite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 1.6 |  |
| crocidolite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0 | 2.3 |  |
| x:garnet | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| ma:augite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.0 | 0 |  |
| actinolite | 4.0 | 100% | 21 | 24 | <0.1 | 1.4 | 95% | 0 | 1.6 | CO (S) |

Flags: UNDER x:clinozoisite (photos 14%; sim 0% of visible crystals — NO ENGINE); UNDER x:ilmenite (photos 14%; sim 0% of visible crystals — NO ENGINE)

### supergene_oxidation  ←  tsumeb   (sim 21 seeds; 1200 photos; 1488 listing mentions)
ρ(sim visible-count, real) = -0.45 [seed bootstrap 5–95 %: -0.46 to -0.40; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.20   ρ(sim surviving count, real) = -0.59
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| smithsonite | 1.0 | 100% | 1.0 | 1.7 | <0.1 | 2.7 | 100% | 9.7 | 10 | AB |
| cerussite | 4.1 | 100% | 4.3 | 6.5 | <0.1 | 4.2 | 100% | 8.0 | 9.6 | AB (S) |
| calcite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.8 | 12 | AB (S) |
| azurite | 4.0 | 100% | 4.2 | 5.8 | <0.1 | 3.1 | 100% | 7.4 | 9.3 | AB (S) |
| malachite | 1.0 | 100% | 1.0 | 1.7 | 40 | 41.9 | 100% | 4.2 | 9.3 | AB (S) |
| dioptase | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.3 | 6.5 | AB (S) |
| mimetite | 1.2 | 100% | 1.2 | 1.7 | <0.1 | 3.4 | 100% | 5.5 | 5.3 | CO (S) |
| cuprite | 0.9 | 86% | 0.9 | 0 | <0.1 | 0.08 | 0% | 5.3 | 3.0 | CO (S) |
| wulfenite | 1.0 | 100% | 1.0 | 1.7 | 1.7 | 15.6 | 100% | 4.6 | 3.0 | CO (S) |
| duftite | 2.4 | 100% | 2.5 | 3.0 | <0.1 | 2.4 | 100% | 2.4 | 4.2 | AB (S) |
| dolomite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.9 | 5.0 |  |
| native_copper | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.3 | 2.0 |  |
| mottramite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.2 | 2.4 | CO (S) |
| descloizite | 4.7 | 100% | 4.9 | 0 | <0.1 | 0.30 | 0% | 1.3 | 0.5 | RA (S) |
| anglesite | 4.0 | 100% | 4.2 | 6.5 | 0.1 | 4.2 | 100% | 1.0 | 0.6 | CO (S) |
| conichalcite | 4.0 | 100% | 4.2 | 6.6 | <0.1 | 5.1 | 100% | 0.3 | 0.7 | CO (S) |
| scorodite | 5.9 | 100% | 6.1 | 7.9 | <0.1 | 3.5 | 100% | 0.5 | <0.1 | RA |
| brochantite | 5.0 | 100% | 5.2 | 8.3 | 3.3 | 11.4 | 100% | 0.2 | <0.1 |  |
| pyromorphite | 6.0 | 100% | 6.3 | 7.9 | <0.1 | 1.7 | 100% | <0.1 | 0.1 | VR (S) |
| jarosite | 6.6 | 100% | 6.9 | 0 | <0.1 | 0.87 | 0% | <0.1 | <0.1 | Q (S) |
| aurichalcite | 3.8 | 100% | 4.0 | 5.2 | <0.1 | 2.3 | 95% | <0.1 | 0 |  |
| vanadinite | 6.0 | 100% | 6.3 | 1.8 | <0.1 | 1.2 | 71% | <0.1 | 0 | VR (S) |
| ferrimolybdite | 6.0 | 100% | 6.3 | 9.9 | 40 | 25.3 | 100% | 0 | 0 | ND (S) |
| powellite | 4.0 | 100% | 4.2 | 6.6 | 15 | 20.1 | 100% | 0 | 0 | VR (S) |
| stolzite | 4.7 | 100% | 4.9 | 5.8 | <0.1 | 2.9 | 100% | 0 | 0 | RA (S) |
| plumbogummite | 3.3 | 100% | 3.4 | 4.0 | <0.1 | 1.8 | 100% | 0 | 0 | VR (S) |

Flags: ABSENT ferrimolybdite (sim grows it in 100% of seeds; no photo, no listing); ABSENT powellite (sim grows it in 100% of seeds; no photo, no listing); ABSENT stolzite (sim grows it in 100% of seeds; no photo, no listing); ABSENT plumbogummite (sim grows it in 100% of seeds; no photo, no listing)

### wittichen  ←  wittichen   (sim 21 seeds; 925 photos; 6 listing mentions — does not vote)
ρ(sim visible-count, real) = -0.48 [seed bootstrap 5–95 %: -0.49 to -0.48; verdict differs in 0 % of resamples]   ρ(sim volume, real) = -0.53   ρ(sim surviving count, real) = -0.63
| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| erythrite | 1.0 | 100% | 2.6 | 5.3 | 44 | 8.1 | 100% | 15 | 17 | AB |
| zeunerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.6 | 0 |  |
| ma:heinrichite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 6.4 | 0 |  |
| fluorite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 5.1 | 0 | CO |
| ma:atelestite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.9 | 0 |  |
| x:walpurgite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 4.5 | 0 |  |
| native_silver | 3.5 | 100% | 9.0 | 0 | <0.1 | 0.55 | 0% | 3.9 | 0 | AB |
| x:mixite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 3.9 | 0 |  |
| x:bismutite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.5 | 17 |  |
| ma:arseniosiderite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.4 | 0 |  |
| uraninite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.4 | 0 |  |
| x:koritnigite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 2.1 | 17 |  |
| barite | 6.0 | 100% | 15 | 0.8 | 0.3 | 0.97 | 14% | 1.6 | 0 | AB |
| safflorite | 2.0 | 100% | 5.1 | 0 | <0.1 | 0.01 | 0% | 1.6 | 17 | AB |
| native_bismuth | 1.7 | 95% | 4.3 | 0 | <0.1 | 0.06 | 0% | 1.4 | 0 | UN |
| skutterudite | 2.1 | 100% | 5.4 | 0 | <0.1 | 0.06 | 0% | 1.4 | 17 | AB |
| pharmacolite | 0.4 | 29% | 1.1 | 2.3 | 1.5 | 3.7 | 29% | 0.4 | 0 | CO |
| nickeline | 4.0 | 100% | 10 | 20 | 1.3 | 1.8 | 100% | 0.3 | 0 | UN |
| native_arsenic | 4.0 | 100% | 10 | 21 | 0.7 | 1.5 | 100% | 0.2 | 0 | UN |
| chalcedony | 4.0 | 100% | 10 | 20 | 1.1 | 1.7 | 100% | 0.1 | 0 | ND |
| annabergite | 1.0 | 100% | 2.6 | 5.3 | 7.3 | 4.6 | 100% | 0.1 | 0 | RA |
| x:kahlerite | 0.0 | 0% | 0 | 0 | 0 | — | 0% | 0.1 | 17 |  |
| haidingerite | 4.6 | 100% | 12 | 24 | 44 | 5.1 | 100% | 0 | 0 | RA (S) |
| anhydrite | 4.7 | 100% | 12 | 0 | <0.1 | 0.25 | 0% | 0 | 0 | ND |

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
| roughten_gill | mottramite | "trace" (deterministic) | 3.8 | 3.3 | 2.10 | 1.00 | yes | <0.1 | <0.1 | no |
| schneeberg | quartz | "accessory" (deterministic) | 3.0 | 2.2 | 3.00 | 0.00 | yes | 63 | <0.1 | yes |
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

38 cases by surviving count; 21 also by visible count; 8 also by volume.

## Fleet: crystals per vug by nucleation gate (all scenarios, all seeds, vugs where the species survives)
strict            21 species, median 1.17 crystals per vug (median 0.62 ≥ 1 mm)
soft              30 species, median 3.12 crystals per vug (median 1.47 ≥ 1 mm)
cap-only          80 species, median 3.63 crystals per vug (median 2.17 ≥ 1 mm)
transformation     5 species, median 4.57 crystals per vug (median 4.57 ≥ 1 mm)
shared-selector    2 species, median 2.75 crystals per vug (median 1.62 ≥ 1 mm)
strict-gated (species, scenario) pairs at ≤ 1.25 surviving crystals per vug (where present): 72 of 92
| species | gate | parent | max_nucleation_count | vugs with it | scenarios | crystals per vug | ≥ 1 mm per vug |
|---|---|---|---:|---:|---:|---:|---:|
| HMC | cap-only |  | 4 | 21 | 1 | 40.95 | 0.00 |
| barite | cap-only |  | 6 | 105 | 5 | 15.91 | 2.42 |
| halite | cap-only |  | 12 | 42 | 2 | 8.33 | 2.33 |
| atacamite | cap-only |  | 4 | 21 | 1 | 8.10 | 7.52 |
| tincalconite | transformation | borax | 0 | 21 | 1 | 8.00 | 7.71 |
| mirabilite | cap-only |  | 8 | 21 | 1 | 7.95 | 0.00 |
| anhydrite | cap-only |  | 8 | 105 | 5 | 7.28 | 3.70 |
| native_gold | soft |  | 4 | 63 | 3 | 7.25 | 1.49 |
| orpiment | soft |  | 6 | 21 | 1 | 7.05 | 5.62 |
| celestine | cap-only |  | 6 | 126 | 6 | 6.48 | 4.94 |
| cinnabar | soft |  | 6 | 21 | 1 | 6.29 | 5.86 |
| jarosite | cap-only |  | 6 | 42 | 2 | 6.26 | 2.31 |
| tourmaline | soft |  | 8 | 63 | 3 | 6.19 | 2.38 |
| apatite | cap-only |  | 6 | 21 | 1 | 6.05 | 5.90 |
| pyromorphite | soft |  | 6 | 42 | 2 | 6.00 | 5.12 |
| vanadinite | soft |  | 6 | 21 | 1 | 6.00 | 1.10 |
| pararealgar | transformation | realgar | 0 | 21 | 1 | 6.00 | 5.81 |
| lepidocrocite | soft |  | 10 | 63 | 3 | 5.86 | 0.10 |
| scorodite | cap-only |  | 5 | 21 | 1 | 5.86 | 4.76 |
| argentite | cap-only |  | 4 | 24 | 2 | 5.71 | 2.79 |
| ferrimolybdite | cap-only |  | 6 | 42 | 2 | 5.64 | 5.60 |
| chrysocolla | soft |  | 5 | 63 | 3 | 5.41 | 4.56 |
| epidote | cap-only |  | 5 | 42 | 2 | 5.36 | 2.90 |
| greenockite | cap-only |  | 5 | 42 | 2 | 5.17 | 3.24 |
| opal | cap-only |  | 6 | 126 | 6 | 5.12 | 4.09 |
| andalusite | cap-only |  | 5 | 21 | 1 | 5.00 | 4.10 |
| tyuyamunite | cap-only |  | 5 | 21 | 1 | 5.00 | 4.95 |
| brochantite | cap-only |  | 5 | 105 | 5 | 4.99 | 3.17 |
| dioptase | cap-only |  | 4 | 21 | 1 | 4.81 | 0.00 |
| grossular | cap-only |  | 4 | 21 | 1 | 4.76 | 3.14 |
| descloizite | cap-only |  | 4 | 21 | 1 | 4.71 | 0.00 |
| stolzite | cap-only |  | 4 | 21 | 1 | 4.67 | 3.52 |
| thenardite | cap-only | mirabilite | 10 | 21 | 1 | 4.67 | 3.00 |
| haidingerite | transformation | pharmacolite | 0 | 21 | 1 | 4.57 | 4.57 |
| cassiterite | cap-only |  | 4 | 62 | 3 | 4.53 | 0.00 |
| topaz | soft |  | 6 | 84 | 4 | 4.50 | 1.50 |
| heulandite | cap-only |  | 5 | 21 | 1 | 4.43 | 2.86 |
| stilbite | cap-only |  | 5 | 21 | 1 | 4.33 | 0.00 |
| chalcocite | soft |  | 5 | 42 | 2 | 4.19 | 2.21 |
| cerussite | soft |  | 4 | 42 | 2 | 4.19 | 3.40 |
| native_sulfur | cap-only |  | 4 | 42 | 2 | 4.17 | 3.86 |
| brucite | cap-only |  | 4 | 21 | 1 | 4.10 | 1.48 |
| actinolite | cap-only |  | 4 | 42 | 2 | 4.02 | 3.21 |
| conichalcite | cap-only |  | 4 | 21 | 1 | 4.00 | 4.00 |
| powellite | cap-only |  | 4 | 21 | 1 | 4.00 | 4.00 |
| diopside | cap-only |  | 4 | 21 | 1 | 4.00 | 4.00 |
| vesuvianite | cap-only |  | 4 | 21 | 1 | 4.00 | 4.00 |
| bismuthinite | soft |  | 4 | 21 | 1 | 4.00 | 0.95 |
| strontianite | cap-only |  | 4 | 21 | 1 | 4.00 | 3.48 |
| carnotite | cap-only |  | 4 | 21 | 1 | 3.95 | 0.00 |
| pectolite | cap-only |  | 4 | 42 | 2 | 3.86 | 0.76 |
| aurichalcite | cap-only |  | 4 | 42 | 2 | 3.83 | 1.57 |
| mottramite | cap-only |  | 4 | 21 | 1 | 3.81 | 2.10 |
| nickeline | cap-only |  | 4 | 42 | 2 | 3.81 | 2.29 |
| covellite | soft |  | 4 | 20 | 1 | 3.80 | 2.40 |
| lepidolite | soft |  | 3 | 42 | 2 | 3.79 | 0.24 |
| acanthite | cap-only | argentite | 4 | 96 | 5 | 3.65 | 2.71 |
| native_tellurium | cap-only |  | 4 | 21 | 1 | 3.62 | 0.00 |
| hemimorphite | cap-only |  | 3 | 21 | 1 | 3.57 | 2.71 |
| autunite | cap-only |  | 5 | 22 | 2 | 3.55 | 0.77 |
| arsenopyrite | cap-only |  | 4 | 62 | 3 | 3.53 | 2.66 |
| olivenite | cap-only |  | 4 | 21 | 1 | 3.52 | 0.00 |
| titanite | cap-only |  | 3 | 42 | 2 | 3.50 | 2.26 |
| calcite | strict |  | 10 | 336 | 16 | 3.32 | 0.66 |
| anglesite | soft |  | 4 | 63 | 3 | 3.22 | 1.44 |
| uranospinite | cap-only |  | 4 | 21 | 1 | 3.19 | 0.00 |
| chalcedony | cap-only |  | 4 | 105 | 5 | 3.10 | 2.24 |
| native_arsenic | cap-only |  | 4 | 41 | 2 | 3.05 | 2.02 |
| turquoise | cap-only |  | 4 | 36 | 2 | 3.03 | 0.61 |
| azurite | soft |  | 4 | 63 | 3 | 3.02 | 1.17 |
| native_silver | cap-only |  | 4 | 94 | 6 | 3.00 | 0.89 |
| metazeunerite | transformation | zeunerite | 0 | 21 | 1 | 3.00 | 0.00 |
| uraninite | soft |  | 3 | 42 | 2 | 3.00 | 3.00 |
| uranophane | cap-only |  | 4 | 42 | 2 | 3.00 | 2.67 |
| amosite | cap-only |  | 3 | 42 | 2 | 3.00 | 2.05 |
| crocidolite | cap-only |  | 3 | 42 | 2 | 3.00 | 2.88 |
| tigers_eye | cap-only |  | 3 | 42 | 2 | 3.00 | 2.43 |
| hessite | cap-only |  | 3 | 21 | 1 | 3.00 | 3.00 |
| awaruite | cap-only |  | 3 | 21 | 1 | 3.00 | 2.71 |
| datolite | cap-only |  | 3 | 21 | 1 | 3.00 | 0.43 |
| molybdenite | soft |  | 3 | 21 | 1 | 3.00 | 3.00 |
| metacinnabar | cap-only |  | 4 | 21 | 1 | 3.00 | 3.00 |
| chrysoprase | cap-only |  | 3 | 21 | 1 | 3.00 | 3.00 |
| plumbogummite | cap-only |  | 3 | 63 | 3 | 2.98 | 1.03 |
| raspite | shared-selector |  | 4 | 18 | 1 | 2.94 | 1.39 |
| bornite | soft |  | 3 | 21 | 1 | 2.90 | 0.00 |
| prehnite | cap-only |  | 4 | 42 | 2 | 2.88 | 1.26 |
| pharmacolite | cap-only |  | 5 | 26 | 2 | 2.81 | 0.50 |
| dolomite | strict |  | 4 | 63 | 3 | 2.71 | 0.00 |
| metatorbernite | transformation | torbernite | 0 | 21 | 1 | 2.57 | 0.00 |
| morganite | shared-selector |  | 4 | 42 | 2 | 2.55 | 1.86 |
| galena | soft |  | 4 | 126 | 6 | 2.50 | 2.49 |
| cobaltite | cap-only |  | 4 | 20 | 1 | 2.50 | 0.00 |
| duftite | cap-only |  | 3 | 21 | 1 | 2.43 | 1.81 |
| spodumene | soft |  | 4 | 63 | 3 | 2.35 | 0.81 |
| quartz | soft |  | 10 | 397 | 19 | 2.32 | 1.35 |
| skutterudite | cap-only |  | 2 | 21 | 1 | 2.10 | 0.00 |
| albite | soft |  | 2 | 252 | 12 | 2.04 | 1.64 |
| caledonite | cap-only |  | 3 | 21 | 1 | 2.00 | 2.00 |
| calaverite | cap-only |  | 2 | 42 | 2 | 2.00 | 1.00 |
| sylvanite | cap-only |  | 2 | 42 | 2 | 2.00 | 1.00 |
| safflorite | cap-only |  | 2 | 21 | 1 | 2.00 | 0.00 |
| aragonite | strict |  | 4 | 63 | 3 | 1.98 | 1.48 |
| wollastonite | cap-only |  | 4 | 21 | 1 | 1.86 | 0.00 |
| feldspar | soft |  | 2 | 252 | 12 | 1.83 | 1.62 |
| proustite | cap-only |  | 2 | 21 | 1 | 1.71 | 0.00 |
| chalcopyrite | strict |  | 5 | 84 | 4 | 1.70 | 0.50 |
| mimetite | strict |  | 3 | 63 | 3 | 1.63 | 0.33 |
| scolecite | cap-only |  | 5 | 21 | 1 | 1.62 | 0.95 |
| native_bismuth | soft |  | 3 | 28 | 2 | 1.57 | 0.00 |
| magnetite | soft |  | 5 | 44 | 3 | 1.57 | 0.00 |
| alunite | cap-only |  | 5 | 16 | 1 | 1.56 | 0.00 |
| stibnite | soft |  | 4 | 21 | 1 | 1.52 | 0.00 |
| goethite | cap-only |  | 3 | 147 | 7 | 1.51 | 0.90 |
| adamite | strict |  | 4 | 21 | 1 | 1.38 | 1.29 |
| apophyllite | strict |  | 4 | 42 | 2 | 1.38 | 0.79 |
| selenite | soft |  | 10 | 84 | 4 | 1.29 | 0.75 |
| smithsonite | strict |  | 3 | 42 | 2 | 1.26 | 0.50 |
| pyrite | strict |  | 3 | 147 | 7 | 1.20 | 0.56 |
| chrysotile | cap-only |  | 5 | 21 | 1 | 1.19 | 0.86 |
| sphalerite | strict |  | 5 | 147 | 7 | 1.17 | 0.62 |
| siderite | strict |  | 4 | 126 | 6 | 1.17 | 0.63 |
| zeunerite | cap-only |  | 4 | 8 | 1 | 1.13 | 0.00 |
| naumannite | cap-only |  | 2 | 8 | 1 | 1.13 | 0.00 |
| marcasite | strict |  | 4 | 60 | 3 | 1.10 | 0.65 |
| annabergite | strict |  | 4 | 63 | 3 | 1.10 | 0.33 |
| hematite | strict |  | 3 | 126 | 6 | 1.07 | 0.77 |
| cuprite | soft |  | 4 | 48 | 3 | 1.06 | 0.00 |
| tennantite | strict |  | 4 | 105 | 5 | 1.02 | 0.19 |
| erythrite | strict |  | 4 | 63 | 3 | 1.02 | 0.33 |
| fluorite | strict |  | 5 | 105 | 5 | 1.00 | 0.79 |
| malachite | strict |  | 3 | 84 | 4 | 1.00 | 0.75 |
| native_copper | soft |  | 3 | 15 | 1 | 1.00 | 0.00 |
| tetrahedrite | strict |  | 4 | 84 | 4 | 1.00 | 0.00 |
| torbernite | cap-only |  | 4 | 1 | 1 | 1.00 | 0.00 |
| wulfenite | strict |  | 5 | 21 | 1 | 1.00 | 1.00 |
| mesolite | cap-only |  | 5 | 21 | 1 | 1.00 | 0.00 |
| rhodochrosite | strict |  | 4 | 78 | 4 | 1.00 | 0.54 |

## What happens to each real top-three species (species with an engine)
| gate | never forms | dust (median largest < 1 mm) | visible, outside the sim top three | in the sim top three | total |
|---|---:|---:|---:|---:|---:|
| strict | 11 | 4 | 11 | 2 | 28 |
| soft | 4 | 9 | 2 | 10 | 25 |
| cap-only | 3 | 2 | 2 | 15 | 22 |
| shared-selector | 2 | 0 | 0 | 0 | 2 |
| all | 20 | 15 | 15 | 27 | 77 |
P(in the sim top three | it forms visible crystals), strict: 2/13
P(in the sim top three | it forms visible crystals), soft: 10/12
P(in the sim top three | it forms visible crystals), cap-only: 15/17
sim top-three slots by gate: strict 5, soft 26, cap-only 50, transformation 3, shared-selector 0 (of 84)
real top-three slots by gate (species with an engine): strict 28, soft 25, cap-only 22, transformation 0, shared-selector 2 (of 77)
Never-forming real top-three species: calcite@amethyst_geode, quartz@chiastolite_hornfels, chalcedony@chiastolite_hornfels, calcite@cooling, fluorite@epithermal_telluride, chalcedony@ultramafic_supergene, ruby@marble_contact_metamorphism, fluorite@naica_geothermal, calcite@naica_geothermal, fluorite@tn457_barite_pulses, galena@tn457_barite_pulses, quartz@tn457_barite_pulses, quartz@reactivated_fluorite_vein, hematite@ouro_preto, calcite@reactive_wall, chalcopyrite@reactive_wall, aquamarine@shigar_pegmatite, aragonite@sicily_solfifera, calcite@supergene_oxidation, zeunerite@wittichen

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
median ρ over 28 scored scenarios — visible count -0.00, surviving count -0.02, volume -0.11, seeds with a visible crystal 0.00
volume vs visible count: ρ higher in 10, lower in 16, equal in 2; with |Δρ| > 0.05: higher in 9, lower in 9
median width of the 5–95 % seed-bootstrap band: 0.02; scenarios whose verdict differs in ≥ 20 % of resamples: gem_pegmatite (37 %)
