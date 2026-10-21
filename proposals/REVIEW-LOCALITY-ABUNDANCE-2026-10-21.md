# Locality abundance review — do the crystal ratios match the rocks? (2026-10-21)

**Base:** `origin/main` @ `ab79f195` (SIM 285), the same base as the recipe review of the same day
(`REVIEW-MINERAL-RECIPES-2026-10-21.md`). Canonical `e75bb4c6` is its ancestor; no science file
differs between them.
**Ask (boss):** "science review for vugg simulator. lets double check the ratios of how many of what
type of crystals we find from various areas. where no data is available we may have to create it
with eBay sales or data from similar platforms. if a mineral is common at any of these locations
there should be plenty of photos of it out there."
**Scope:** the 33 scenarios anchored to a real locality (31 localities). The eight generic or
teaching scenarios (`pulse`, `radioactive_pegmatite`, `sabkha_dolomitization`, `stalactite_demo`,
`zoned_dripstone_cave`, three tutorials) have no locality to compare against; they appear only in
the fleet-wide counts of §4.
**Nothing in the simulator was changed.** The deliverable is this document, three read-only
instruments, one data file and one generated appendix (§10). A proposed fix order is in §8 and
waits for the boss.

---

## 1. Verdict

**The simulator's crystal ratios do not match the rocks.** Of the 33 locality scenarios, none
agrees with the real record; 9 agree in part, 19 disagree, 3 grow no crystal a collector could
see, and 2 have too little proxy data to score (the literature decides those, and it disagrees
too). The median rank correlation between the simulator's visible crystals and the locality
record is 0.00.

The cause is mostly not chemistry. Three mechanisms account for nearly every mismatch:

1. **The count is set by the nucleation gate, not by the locality (§4.1).** Twenty-one species may
   only nucleate when no exposed crystal of their own is left; thirty more add a crystal only above
   σ ≈ 2 on a ~30 % roll. Those gated species are exactly the minerals that dominate real vugs —
   calcite is a top-three species at 7 localities and fluorite at 7, and both are strictly gated.
   Ungated species fill their caps instead: **69 % of the real top-three species are gated, while
   63 % of the simulator's top-three visible species are ungated.** The ratio inverts by
   construction.
2. **Phases the scenarios themselves call minor out-number the headline species (§4.2).** In 38
   cases a species whose own written reason says *trace*, *minor*, *subordinate*, *accessory* or
   *rare* has more surviving crystals per vug than the scenario's typical headline species. The
   largest: anhydrite ("a trace Ca-sulfate accessory", 7.6 per Tri-State vug and 45 % of its
   visible crystals, with no photograph, listing or published record at Picher); celestine at
   Searles Lake, Naica and Elmwood; Bisbee's native gold (13 per vug, "discrete grains remain
   accessory").
3. **Headline species exist only as dust (§4.3).** Seventeen times a species that holds ≥ 10 % of a
   locality's photographs or listings is grown by the simulator, but never past 1 mm: Bisbee's
   azurite (median largest crystal 0.51 mm), cuprite (0.36 mm) and copper (0.07 mm); Cruzeiro's
   tourmaline (0.37 mm, 88 % of its photographs); Herkimer quartz (0.57 mm); Ametista amethyst
   (0.84 mm); Grimsel fluorite; Wittichen skutterudite and safflorite.

A fourth, smaller cause is **species debt (§6)**: some headline minerals have no engine at all —
hanksite and trona are 17 and 34 vol % of Searles Lake's Upper Salt (USGS PP 1043, Table 14), and
cavansite, okenite and gyrolite, spinel and magnesite are missing too.

**What holds.** Jeffrey Mine's top three (grossular, vesuvianite, diopside) are the same set in the
simulator and in the record. Tormiq's epidote and titanite, Sicily's sulfur, Ouro Preto's topaz,
Roughton Gill's pyromorphite and Bimbowrie's andalusite lead in both. Elmwood grows the right three
headline species — they are simply outnumbered by celestine. At the Great Salt Plains, selenite
holds 100 % of the crystal volume, as it should; only the count is wrong (halite crusts).

---

## 2. Method

### 2.1 The simulator's side — `tools/assemblage-census.mjs`
Every scenario ran for its authored duration on 21 seeds (1–20 and 42): 861 runs (41 × 21), none
failed. At
the end of each run the census records, per species, the crystals that still exist (dissolved ones
are dropped; crystals enclosed inside another crystal are kept — they are still in the specimen),
how many of them are ≥ 0.1, 1, 5 and 10 mm in their longest dimension, their summed volume and the
largest one. "Visible" below means ≥ 1 mm. Before the full panel ran, the instrument was checked
against the committed seed-42 baseline (`tests-js/baselines/seed42_v285.json`) on four scenarios:
zero mismatches in surviving, dissolved and total counts.

One seed cannot carry a ratio: most species fire zero to six times in a run, and the seed-42
baseline is one draw.

### 2.2 The rocks' side — two independent proxies, captured 2026-10-21
- **Photographs** — Mineralienatlas (Geolitho Stiftung). Its page *LokationMineralBilder* lists,
  for a locality and all its sub-localities, how many photographs each mineral has. 36 locality
  pages, 6,736 photographs. Mindat (the larger archive) sits behind a Cloudflare human check for
  automated browsing and was not used.
- **Market listings** — eBay (ebay.com), category 3213 *Rocks, Fossils & Minerals*, active
  listings only (sold-listing history needs a login). One to seven searches per locality, up to
  1,440 listings each, deduplicated by item. Every title is read for the species it names by
  `tools/market-title-dictionary.mjs` (363 entries, guards for place names that contain mineral
  words — "Copper Queen", "Sulphur Bank", "Silverton" — and for colour words — "ruby red
  sphalerite", "emerald green dioptase"). A seller relisting one lot ×7 counts once (titles are
  grouped into families after stripping weights and numbers). Cabochons, jewellery, slabs, spheres
  and carvings are excluded. 72 searches, 15,190 listings, 9,822 families.

Neither proxy measures tonnage. Both measure what collectors find, keep and sell — which is the
question asked ("how many of what type of crystals we find"). Their biases differ, and §7 lists
them; where the two disagree, the literature decides.

Both captures were verified byte for byte: the dictionary that ran in the browser page and the
committed file hash to the same SHA-256 (`5d355644…`), and the per-locality counts hash identically
in the page and in `proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json` (hashes recorded in its
`sources` block).

### 2.3 The literature
Three research passes (one per locality family) collected published abundance statements —
paragenetic tables, "abundant / common / rare" wording, production figures, volume percentages —
for every locality: 63 sources, 278 species classifications, stored in the data file's
`literature` blocks with a status per claim (V = source opened and wording seen; S = snippet or
low-reliability page). Eleven load-bearing claims were then read first-hand by this review; all
eleven matched (§9).

### 2.4 The comparison — `tools/locality-abundance-compare.mjs`
Shares, not counts: for each scenario, the simulator's share of visible crystals per species beside
the locality's share of photographs and of listings, and the literature class. The real ranking is
the mean of the two shares; a source with fewer than 20 observations does not vote. Spearman ρ is
computed over the union of each side's top species (absent = share 0). Verdicts: **AGREES** (ρ ≥ 0.5
and two of the real top three are in the simulator's top three), **DISAGREES** (ρ < 0, or the
simulator's most numerous visible species is < 1 % of the real record), **PARTLY** otherwise,
**THIN** when neither proxy has 20 observations. The full per-species tables for all 33 scenarios
are in `proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`.

---

## 3. Scoreboard

"Lit: rare" lists the simulator's top-three visible species that the literature rates rare,
very rare or undocumented; "lit: missing" lists species the literature calls abundant that the
simulator never grows to 1 mm. `x:` = a species with no engine.

| scenario | verdict | ρ | real top 3 | sim top 3 (≥ 1 mm) | lit: rare | lit: missing |
|---|---|---:|---|---|---|---|
| bisbee | DISAGREES | −0.49 | malachite, azurite, native copper | atacamite, chrysocolla, jarosite | | |
| wittichen | DISAGREES | −0.48 | erythrite, zeunerite, heinrichite | haidingerite, native arsenic, nickeline | haidingerite | native silver, safflorite, skutterudite |
| supergene_oxidation (Tsumeb) | DISAGREES | −0.45 | smithsonite, cerussite, calcite | ferrimolybdite, brochantite, scorodite | ferrimolybdite, scorodite | dioptase, calcite |
| schneeberg | DISAGREES | −0.36 | erythrite, pucherite, eulytine | chrysocolla, arsenopyrite, quartz | | skutterudite, native bismuth |
| mvt (Tri-State) | DISAGREES | −0.35 | galena, sphalerite, calcite | anhydrite, greenockite, galena | anhydrite, greenockite | dolomite |
| porphyry (Bingham) | DISAGREES | −0.33 | pyrite, tetrahedrite, faustite | ferrimolybdite, brochantite, acanthite | ferrimolybdite, acanthite | quartz, bornite |
| reactivated_fluorite_vein | DISAGREES | −0.28 | fluorite, galena, quartz | barite, celestine, acanthite | celestine, acanthite | quartz |
| colorado_plateau (Uravan) | DISAGREES | −0.19 | pascoite, hughesite, dickthomssenite | opal, tyuyamunite, uranophane | opal, uranophane | carnotite |
| grimsel_alpine_cleft | DISAGREES | −0.15 | quartz, fluorite, epidote | apatite, quartz, titanite | titanite | x:chlorite |
| searles_lake | DISAGREES | −0.13 | halite, x:hanksite, x:trona | tincalconite, thenardite, halite | tincalconite | x:hanksite, x:trona |
| naica_geothermal | DISAGREES | −0.10 | fluorite, selenite, calcite | celestine, selenite | | fluorite |
| roughten_gill | DISAGREES | −0.08 | pyromorphite, mimetite, quartz | pyromorphite, chrysocolla, galena | | quartz |
| tn457_barite_pulses (N. Pennines) | DISAGREES | −0.02 | fluorite, galena, quartz | barite, sphalerite | | fluorite, galena, quartz |
| sunnyside_american_tunnel | DISAGREES | −0.01 | rhodochrosite, fluorite, quartz | galena, argentite, quartz | argentite | x:rhodonite, sphalerite |
| reactive_wall (Viburnum) | PARTLY | 0.00 | calcite, galena, chalcopyrite | galena, sphalerite, pyrite | | dolomite |
| ouro_preto | PARTLY | 0.03 | topaz, hematite, x:euclase | topaz, quartz, albite | albite | |
| deccan_zeolite | PARTLY | 0.04 | apophyllite, stilbite, heulandite | chalcedony, heulandite, quartz | | stilbite |
| asbestos_hills (both) | DISAGREES | 0.04 / 0.10 | tiger's eye, crocidolite, x:jasper | opal, crocidolite, tiger's eye | opal | magnetite, quartz |
| epithermal_telluride (Cripple Creek) | DISAGREES | 0.09 | calaverite, native gold, fluorite | native silver, native gold, hessite | native silver, hessite | fluorite, dolomite |
| gem_pegmatite (Cruzeiro) | PARTLY | 0.18 | tourmaline, quartz, lepidolite | albite, feldspar, quartz | | tourmaline |
| jeffrey_mine | PARTLY | 0.20 | grossular, vesuvianite, diopside | vesuvianite, diopside, grossular | | |
| ultramafic_supergene (Marlborough) | DISAGREES | 0.22 | chrysoprase, chalcedony | opal, chrysoprase | opal | chalcedony, x:magnesite |
| shigar_pegmatite | PARTLY | 0.34 | aquamarine, topaz, quartz | tourmaline, quartz, albite | | aquamarine |
| elmwood | DISAGREES | 0.34 | fluorite, calcite, sphalerite | celestine, fluorite, calcite | | |
| tormiq_alpine_cleft | PARTLY | 0.35 | titanite, epidote, quartz | epidote, actinolite, titanite | | |
| sicily_solfifera | PARTLY | 0.36 | native sulfur, aragonite, celestine | celestine, native sulfur, strontianite | strontianite | selenite |
| chiastolite_hornfels | PARTLY | 0.66 | andalusite, quartz, chalcedony | andalusite | | |
| amethyst_geode | NO VISIBLE CRYSTALS | — | quartz, chalcedony, calcite | — | | quartz, chalcedony, x:celadonite |
| cooling (Herkimer) | NO VISIBLE CRYSTALS | — | quartz, x:bitumen, calcite | — | | quartz, x:bitumen, dolomite |
| marble_contact_metamorphism (Mogok) | NO VISIBLE CRYSTALS | — | x:spinel, ruby, x:painite | — | | calcite |
| great_salt_plains | THIN (literature: inverted) | — | (13 listing families, all selenite) | halite, selenite | | |
| sulphur_bank | THIN | — | (2 photos, 1 listing) | cinnabar, pararealgar, orpiment | pararealgar?, orpiment? | opal |

Count and volume tell the same story: ρ against photographs improves when the simulator is
measured by crystal volume instead of visible count in 9 scenarios and worsens in 9.

---

## 4. Fleet-wide findings

### 4.1 F1 — The count is set by the nucleation gate, not by the locality
Three nucleation idioms decide how many crystals of a species a run can hold (static scan of the
`_nuc_<mineral>` functions, `js/80`–`js/91`; census over all 861 runs, vugs where the species
survives):

| gate | what it does | species | median crystals per vug | median ≥ 1 mm per vug |
|---|---|---:|---:|---:|
| strict | a new crystal only when no exposed crystal of the species is left (`!existing_X.length` in the σ gate) | 21 | 1.17 | 0.62 |
| soft | the first crystal freely; more only when σ > ~2 and a ~30 % roll passes | 30 | 3.12 | 1.47 |
| cap-only | no per-crystal gate; the species' `max_nucleation_count` is the only bound | 87 | 3.62 | 2.10 |

The strict list is the core of every real vug: **calcite, aragonite, dolomite, siderite,
rhodochrosite, malachite, smithsonite, fluorite, sphalerite, wurtzite, pyrite, marcasite,
chalcopyrite, tetrahedrite, tennantite, hematite, apophyllite, wulfenite, adamite, mimetite,
erythrite, annabergite.** The calcite gate is commented as exactly what it is — "Water-mode
(default): legacy serial gate — one active calcite at a time per scenario, matching every
scenario's existing baseline" (`js/82-nucleation-carbonate.ts:36`). Cave scenarios replace it with
a 6 %-per-step Bernoulli roll (`_AIR_MODE_NUCLEATION_PROB`), which is why calcite's fleet median is
higher than the strict class's.

Meanwhile the species that fill the counts are cap-only: barite (18.4 crystals per vug where it
survives; 55.6 per Tri-State vug, all dust at a median largest crystal of 0.04 mm), anhydrite
(8.1), celestine (6.6), greenockite, atacamite, lepidocrocite, scorodite, ferrimolybdite. Across
the 33 locality scenarios, **28 of the 77 real top-three slots held by species the simulator has
an engine for are strictly gated and 25 more are soft-gated (69 %); 53 of the simulator's 84
top-three visible slots go to cap-only species (63 %).** Calcite is a real top-three species at 7
localities and fluorite at 7.

Enclosure feeds the inflation: the cap counts only *exposed* crystals (`js/85b-simulator-nucleate.ts:716`
skips enclosed and dissolved ones), so a species that keeps getting overgrown keeps nucleating. The
code says this is deliberate (dense chalcopyrite inclusion trails in MVT calcite), and for visible
ratios it matters little — the enclosed crystals are mostly dust — but it is why raw counts reach 55.

**Documentation drift (F1b).** `data/minerals.json` describes `max_nucleation_count` as "Counted
across the whole simulation (active + dissolved)". The code counts only exposed crystals and skips
dissolved ones — the opposite on both counts.

### 4.2 F2 — Minor phases out-number headline phases, against the scenarios' own words
Every scenario names its headline species (`expects_species`) and justifies its other delivered
species with a written reason (`deterministic_species`, `statistical_species`). Thirty-eight of
those reasons call the species *accessory* (18), *minor* (8), *subordinate* (7), *trace* (4) or
*rare* (1) — and in all 38 the species has more surviving crystals per vug than the scenario's
median headline species. The full list is in the appendix; the largest:

| scenario | species | its reason says | its crystals per vug | headline median |
|---|---|---|---:|---:|
| mvt | anhydrite | "a trace Ca-sulfate accessory" | 7.6 | 1.0 |
| reactivated_fluorite_vein | anhydrite | "a minor Ca-sulfate phase" | 7.5 | 1.0 |
| reactive_wall | anhydrite | "a trace hot-brine Ca-sulfate accessory" | 6.6 | 1.1 |
| searles_lake | calcite | "a subordinate carbonate" | 10.8 | 5.3 |
| searles_lake | celestine | "a minor Sr-sulfate accessory" | 8.9 | 5.3 |
| bisbee | native_gold | "discrete grains remain accessory" | 13.0 | 4.0 |
| bisbee | atacamite | "retained as an arid chloride accessory" | 8.1 | 4.0 |
| reactivated_fluorite_vein | celestine | "a subordinate Sr-sulfate response" | 6.0 | 1.0 |
| mvt | greenockite | "a minor CdS accessory" | 5.3 | 1.0 |
| wittichen | anhydrite | "a trace Ca-sulfate accessory" | 4.7 | 2.8 |
| sunnyside_american_tunnel | native_silver | "subordinate" | 4.0 | 1.0 |
| sicily_solfifera | strontianite | "subordinate" | 4.0 | 2.7 |

**The anhydrite case** shows how this happens. All four anhydrite reasons say the phase comes from
"the corrected PHREEQC analytical K(T) path" (SIM 272) and that it is "not promotion of anhydrite as
a defining … locality claim". The thermodynamic correction is not in question here. What the label
claims — a trace phase — is a count, and the count is 4.7–7.6 crystals per vug, the most numerous
visible species at Tri-State. At Picher, Sweetwater, the North Pennines and Wittichen the
photographs, the listings and the literature all record no anhydrite (Leach et al. 2010; Rowan 1987;
GCR vol. 36; Petersen 1868), and the boss's Picher mindat list (`data/mindat-species-refs.json5`)
omits it.

### 4.3 F3 — Headline species exist only as dust
Seventeen species hold ≥ 10 % of a locality's photographs or listings, are grown by the simulator,
and never pass 1 mm (median largest crystal in brackets):

| scenario | species | real share | sim crystals per vug (largest) |
|---|---|---:|---|
| cooling (Herkimer) | quartz | 97 % of photos | 1.0 (0.57 mm) |
| gem_pegmatite (Cruzeiro) | tourmaline | 88 % of photos | 3.0 (0.37 mm) |
| amethyst_geode | quartz (amethyst) | 56 % of listings | 1.0 (0.84 mm) |
| searles_lake | halite | 49 % of listings | 5.3 (< 0.01 mm) |
| grimsel_alpine_cleft | fluorite | 30 % of photos | 1.0 (0.51 mm) |
| roughten_gill | mimetite | 29 % of listings | 1.2 (0.05 mm) |
| deccan_zeolite | stilbite | 26 % of listings | 4.3 (0.88 mm) |
| amethyst_geode | chalcedony | 23 % of listings | 2.5 (0.15 mm) |
| tormiq_alpine_cleft | quartz | 22 % of listings | 3.3 (0.21 mm) |
| bisbee | azurite | 18 % of listings | 4.0 (0.51 mm) |
| roughten_gill | quartz | 18 % of listings | 1.0 (0.23 mm) |
| wittichen | safflorite / skutterudite | 17 % of listings each | 2.0 (0.01 mm) / 2.1 (0.06 mm) |
| bisbee | native copper | 15 % of photos | 0.7 (0.07 mm) |
| schneeberg | native bismuth | 15 % of listings | 0.4 (0.06 mm) |
| shigar_pegmatite | topaz | 15 % of photos | 4.5 (0.59 mm) |
| bisbee | cuprite | 14 % of photos | 1.1 (0.36 mm) |

The Herkimer and Ametista cases decide those scenarios' verdicts: each grows the right mineral and
nothing a collector could see — at Ametista, where the geode walls end in "large-sized amethyst
crystals" (Proust & Fontaine 2007).

---

## 5. Locality findings

Numbers are crystals per vug averaged over 21 seeds, "% vis" the share of visible (≥ 1 mm)
crystals; photo and listing shares from the data file; literature classes AB / CO / UN / RA / ND.
Full tables in the appendix.

### 5.1 MVT and fluorite–barite veins

**Tri-State (mvt) — DISAGREES.** The district is a sphalerite district (zinc to lead concentrates
about 5:1, KGS 2001) whose collectible crystals are calcite (2–3 ft scalenohedra), sphalerite,
galena, dolomite and chalcopyrite. The USGS deposit model: "the dominant minerals are sphalerite,
galena, pyrite, marcasite, dolomite, and calcite, whereas barite is typically minor to absent and
fluorite is rare" (Leach et al. 2010). The simulator: barite 55.6 per vug (all dust), anhydrite 7.6
(45 % vis), greenockite 5.3 (23 % vis), and one crystal each of sphalerite, galena, calcite,
fluorite and pyrite. Greenockite is real at Picher but as an earthy coating on sphalerite, not as
2.3 mm crystals (Handbook of Mineralogy). Chalcopyrite (6 % of photos, 14 % of listings), dolomite
and marcasite never survive. *Dolomite note:* the July hostile review defended the dolomite
no-show as correct kinetics (§5 of that review: SI is thermodynamic, nucleation kinetic). This
review does not reopen that verdict; it records new evidence for it — at MVT temperatures the
published abundance lists dolomite among the *dominant* minerals (Leach et al. 2010; Rowan 1987
calls Viburnum's "the abundant hydrothermal gangue dolomite").

**Elmwood — DISAGREES, narrowly.** The right headline species, the wrong count. Fluorite (46 % of
photos), calcite (23 %) and sphalerite (20 %) are the simulator's other three visible species, at
one crystal each (strict gate). Celestine is 6 per vug and 66 % of the visible crystals, against
0 photographs, 1 listing in 466 families, and a literature class of uncommon (barian celestine,
Jensen 1996). The celestine count is not an accident: the S2 celestine tranche (SIM 236) raised it
2 → 6 crystals to render the documented fibrous blanket. That decision was about habit; this review
adds the count it produced. Galena (6 % of photos, documented in Gratz 1986's paragenesis) never
forms.

**Viburnum Trend / Sweetwater (reactive_wall) — PARTLY.** A *lead* district: Zn/(Zn+Pb) "less than
0.1 for the Southeast Missouri district", chalcopyrite "the main source of byproduct copper", and
"Barite has never been reported in the Cambrian-hosted Southeast Missouri Lead districts" (Leach
et al. 2010). The simulator puts 82 % of its crystal volume into sphalerite and grows 6.6 anhydrite
per vug; calcite (42 % of photos), chalcopyrite (12 %) and dolomite ("the abundant hydrothermal
gangue", Rowan 1987) never survive. Galena is right as a visible species but is one crystal.

**North Pennines (tn457_barite_pulses, reactivated_fluorite_vein) — DISAGREES.** The orefield's
record is fluorite first (56 % of photos, 63 % of listings), then galena, quartz and the barium
minerals, zoned: fluorite in the central zone, barium minerals outside it (GCR vol. 36; North
Pennines audit). *tn457* models one barite-on-sphalerite cavity from the outer zone, so its
district mismatch is a scope question, not an error. *reactivated_fluorite_vein* claims the central
fluorite-galena vein type and grows fluorite ×1 and galena ×1 beside barite ×6 (an outer-zone
mineral), celestine ×6, greenockite ×5, acanthite ×4 and anhydrite ×7.5 — none of the last four
recorded in the orefield. (The July review flagged this scenario's witherite-vs-baryte routing as
an objection with "real force"; this is its count side.)

### 5.2 Oxidation zones

**Tsumeb (supergene_oxidation) — DISAGREES.** Harvard's *Tsumeb Mineral Notes* rate every species on
a specimen-availability scale. Their "Very common" species are smithsonite ("the most abundant
secondary mineral at Tsumeb"), cerussite, malachite, azurite, calcite, dioptase and duftite. The
simulator's top visible species are ferrimolybdite (no species entry), brochantite, scorodite
("Very rare"), pyromorphite and vanadinite ("Extremely rare"), conichalcite and powellite
("Extremely rare"). Ferrimolybdite and powellite hold 55 % of the simulator's crystal volume (25 mm
and 20 mm crystals) with no Tsumeb photograph or listing. Smithsonite and malachite are one crystal
each (strict gate). Dioptase (6 % of photos and listings) and calcite never form.

**Bisbee — DISAGREES (ρ −0.49).** The record is malachite, azurite, native copper, cuprite and
calcite. The simulator's visible crystals are atacamite (16 % vis, 8.1 per vug), chrysocolla,
jarosite, opal, chalcedony and acanthite; azurite (4 per vug), cuprite and native copper never pass
1 mm (§4.3); malachite is one crystal, though a 65 mm one holding 43 % of the volume; calcite never
forms. Lepidocrocite (14.5 per vug) and native gold (13.0) are the most numerous species of all.
Dioptase (4.8 per vug at 0.08 mm) was defended for *presence* in July; its count is the new question.
No published abundance ranking for Bisbee was reachable (Graeme's Mineralogical Record articles
were not), so this verdict rests on the two proxies.

**Roughton Gill — DISAGREES, narrowly.** The lead is right: pyromorphite tops both sides. The
Geological Conservation Review account gives "Most abundant are supergene lead and copper
minerals" and names pyromorphite, cerussite and malachite as worked commercially. Mimetite (29 % of
listings) and quartz never pass 1 mm; chalcocite (4.6 per vug) has no photograph or listing and
chrysocolla (5.0) one photograph; mottramite (3.8 per vug, "trace" in its own reason) is recorded from Brandy
Gill rather than Roughton Gill.

### 5.3 Veins and porphyry

**Bingham Canyon (porphyry) — DISAGREES.** Main-stage chalcopyrite, bornite, chalcocite and pyrite;
molybdenite in quartz veins that can make up half the rock (Phillips et al. 2005). The simulator
grows chalcopyrite ×1 and pyrite ×1 beside ferrimolybdite ×5.3, brochantite ×4.7, acanthite ×4,
arsenopyrite ×3.9 and bismuthinite ×4 — arsenopyrite and bismuthinite "accessory" in their own
reasons, and all five rare or undocumented in the record. Quartz and bornite never survive. Bingham's specimen record is thin
(30 photographs; dealers call it "not known as a fine specimen producer"), so the literature
carries this one.

**Sunnyside / American Tunnel — DISAGREES.** The record: rhodochrosite (45 % of photos), fluorite
(29 %), quartz; sphalerite and galena are "the most abundant ore minerals" (Guzman et al. 2024). The
simulator's second most numerous visible species is argentite (6.4 per vug). Its own reason claims
compatibility ("a high-temperature Ag2S precursor compatible with Sunnyside's primary polymetallic
stage"), not a record, and no silver mineral is named in Burbank 1933 or Guzman et al. 2024,
though the mine produced 14.9 Moz of silver. Native silver is documented — the scenario cites wire
silver at the Sunnyside Extension mine (USGS Folio 120) — but as "a subordinate Ag-bearing
accessory", and it grows 4 per vug against a headline median of 1. Rhodochrosite and fluorite are
one crystal each (strict gate).

**Cripple Creek (epithermal_telluride) — DISAGREES.** Read first-hand: gold occurs "chiefly as
calaverite, but partly also as the more argentiferous sylvanite"; "Native gold appears to be absent
from the telluride ores, except as it may be set free by the oxidation of these tellurides"; "The
usual gangue minerals of the ores are quartz, fluorite, and dolomite"; silver runs "about 1 ounce
of silver to 10 ounces of gold" (Lindgren & Ransome 1904, USGS Bull. 254, pp. 20–21). The simulator
grows native silver ×4 (20 % vis), native gold ×4, hessite ×3 (71 % of crystal volume) and
calaverite ×2; fluorite and dolomite never form; the feldspar the record names is potassic, while the
simulator grows albite ×3.2.

**Schneeberg — DISAGREES.** A cobalt-silver-bismuth-uranium vein district: native bismuth and
skutterudite were principal ores, erythrite is the most-photographed species (103 photographs; type
locality). The simulator's visible leaders are chrysocolla, arsenopyrite and quartz; native bismuth
and native silver are dust; skutterudite never forms; topaz ×3.9, cassiterite ×3.3, spodumene and
morganite belong to a different, granite-hosted vein type ("The tin ores are confined to the
granite and its immediate vicinity", Bastin 1914). The Schneeberg verdict is the weakest-sourced
here: no published ranking was found, and the photo archive is micromount-heavy.

**Wittichen — DISAGREES (ρ −0.48).** Petersen 1868 ranks the ores: predominant Speiskobalt
(skutterudite-safflorite), earthy cobalt and native silver; less widespread native bismuth,
wittichenite, native arsenic, nickeline, proustite; erythrite "sehr häufig". The vein fill is mainly
barite. The simulator grows anhydrite ×4.7 and chalcedony ×4 (neither recorded), haidingerite ×4.6
(24 % vis; a snippet-level record only), native arsenic and nickeline ×4 each; skutterudite,
safflorite and native silver are dust; erythrite is one crystal (strict gate).

### 5.4 Evaporites, hot springs and the Naica pool

**Searles Lake — DISAGREES.** The best data in the review, read first-hand: USGS PP 1043 (Smith
1979) Table 14 gives the Upper Salt as halite 43, trona 34, hanksite 17, borax 3.1, mud 2.0,
burkeite 0.3, pirssonite 0.2, thenardite 0.1, aphthitalite 0.03 and sulfohalite 0.01 vol %, with
"Hanksite is the third most abundant mineral, borax the forth." USGS Bull. 1181-P (Smith & Haines
1964, p. P7) says celestite is one of six reported minerals that "almost certainly do not occur
within the deposit in normally detectable quantities". The simulator's most numerous species are
calcite (10.8 per vug, dust), celestine (8.9, dust), tincalconite (8.0, 71 % vis), mirabilite (8.0)
and thenardite (4.7, 95 % of the volume). Trona and hanksite have no engine; halite is 5.3 per vug of
sub-micron crystals; borax never survives. The scenario models seasonal crusts as well as the salt
body, but its own reasons call calcite "subordinate" and celestine "minor".

**Great Salt Plains — THIN, literature says inverted.** The collectible is hourglass selenite
(single crystals and twins to 7 in., clusters to 38 lb); halite occurs as a thin surface crust (US
Fish & Wildlife Service 2002). The simulator: halite 11.3 per vug (69 % vis) to selenite 2.0 —
though selenite takes 100 % of the volume (40.6 mm). The count inverts what is collected; the volume
does not.

**Sicily — PARTLY.** Sulfur and celestine lead both sides; aragonite (the "well-known large
aragonite crystals", Viola 1897; 10 % of photos, 21 % of listings) never forms, and strontianite
(4 per vug, 25 % vis) has no scientific record from these mines that the research pass could
find. Celestine at 6 per vug outnumbers sulfur at 4.3 — "occasionally" present at Monte Palco.

**Sulphur Bank — THIN.** Two photographs and one listing; the literature decides. Cinnabar ("the
most abundant metallic mineral") and native sulfur lead (Ross 1940); "the upper-central part of the
basalt flow at Sulphur Bank has been almost completely replaced by opal" — opal is aspirational in
the scenario and never forms. Orpiment (7 per vug) and pararealgar (6) are not mentioned by the
three sources read; the scenario expects them, and absence from three sources is not proof.
**Boss adjudication needed** before anything changes. Metacinnabar is documented (one Mineralienatlas
photograph), against the research pass's "not documented".

**Naica — DISAGREES, partly a scope question.** The scenario models the giant-gypsum cave pool, so
the ore body's fluorite, galena and sphalerite are outside its claim. Inside it, García-Ruiz et al.
(2007) record the cave walls' crust of calcite and celestine, and the selenite. The simulator grows
celestine ×6 (86 % of visible crystals) to selenite ×1: celestine is real here, but as a wall crust,
not as six free crystals out-numbering the gypsum the cave is named for.

### 5.5 Pegmatites and alpine clefts

**Cruzeiro (gem_pegmatite) — PARTLY.** Tourmaline is 88 % of the photographs and 78 % of the
listings; the pockets "frequently contain superb gem tourmaline crystals" (Proctor 1985). The
simulator's tourmaline stays under 1 mm in every seed (median largest 0.37 mm); its visible
crystals are albite and microcline
(feldspar holds 97 % of the volume). Cassiterite — "rare" in the record — is the most numerous
species (4.5 per vug, dust).

**Shigar Valley — PARTLY.** Aquamarine is the signature product (36 % of listings; a principal
commodity of the Dassu pegmatites, Laurs et al. 1998). The beryl family never nucleates in this
scenario. Topaz is dust (0.59 mm); fluorite, apatite, muscovite and garnet never form.

**Ouro Preto — PARTLY.** Topaz leads both sides. The record has quartz, specular hematite, mica,
rutile and rare euclase with it, and "The potassium feldspar is now totally altered to kaolinite"
(Keller 1983); the simulator's other visible crystals are albite (36.8 mm) and feldspar.

**Grimsel — DISAGREES.** Quartz (mostly smoky) and fluorite (much of it pink) are 80 % of the
area's photographs. Read
first-hand in Koenigsberger (1919): the frequent cleft types in normal Aar granite are quartz–chlorite–
calcite–fluorite (localities I–XX) and quartz–chlorite (I–VII, X–XIV, XXIII), with apatite and
epidote only as bracketed associates; adularia–quartz–titanite–chlorite is the *diorite* type. The
simulator's leaders are apatite (6 per vug, 31 % vis), epidote (5.7) and titanite (4) — the
amphibolite/diorite assemblage — while its fluorite is dust and chlorite has no engine.

**Tormiq — PARTLY.** Titanite and epidote lead both sides; the scenario is close. No peer-reviewed
species list exists; Koenigsberger's type 10 (quartz–epidote–amianth–titanite in epidotized
amphibolite) is the published analogue and matches the simulator's core. Quartz (22 % of
listings) is dust.

### 5.6 Metasomatic, metamorphic and amygdale scenarios

**Jeffrey Mine — PARTLY, the best case.** Grossular, vesuvianite and diopside are the top three on
both sides. Grossular is under-weighted (13 % vis against 59 % of photos); awaruite (3 per vug,
11 % vis) and datolite were not found in the sources read; chlorite and zoisite have no engine.

**Deccan Traps — PARTLY.** "Heulandite and stilbite constitute the major bulk of the zeolites"
(Sukheswala et al. 1974); apophyllite is the most-listed and most-photographed species. The
simulator's apophyllite is one crystal (strict gate), its stilbite is dust, and its visible crystals
are chalcedony, heulandite and quartz (78 % of the volume). Pectolite (4 per vug) and goethite are
absent from both systematic studies (Sukheswala et al. 1974; Ottens et al. 2022) — the scenario
calls pectolite "a documented Deccan cavity Ca-Na silicate accessory" without a source, so this is
a disagreement to resolve, not yet a verdict; albite appears in the record as albitized lava, not as
a cavity crystal. Cavansite,
okenite, gyrolite and pentagonite (24 % of photographs together) have no engine.

**Bimbowrie (chiastolite_hornfels) — PARTLY.** Andalusite (chiastolite) is everything on both
sides. Teale (1979): "The phases plagioclase and paragonite were not detected" — the simulator's
albite and feldspar crystals are unsupported (the July review flagged pure albite at 600 °C as an
objection with "real force").

**Ametista do Sul (amethyst_geode) — NO VISIBLE CRYSTALS.** Quartz (amethyst) leads the record,
then chalcedony and calcite ("Calcita e celadonita, minerais comuns e abundantes", Dias et al. 2019).
The simulator's amethyst never passes 0.84 mm and its chalcedony 0.15 mm; calcite and celadonite
never form.

**Herkimer (cooling) — NO VISIBLE CRYSTALS.** Quartz is 97 % of the photographs; dolomite rhombs and
anthraxolite accompany almost every pocket. The simulator grows one quartz of 0.57 mm.

**Mogok (marble_contact_metamorphism) — NO VISIBLE CRYSTALS.** The scenario produces nothing, by
design for now (ruby and calcite are aspirational). The record is spinel (36 % of photographs, no
engine), painite, ruby and sapphire.

### 5.7 Sediment-hosted and supergene

**Uravan (colorado_plateau) — DISAGREES, with a proxy caveat.** "The most abundant uranium mineral
was carnotite. The ore also contained a smaller amount of tyuyamunite" (Weeks & Thompson 1954). The
simulator's carnotite is dust (0.81 mm) while tyuyamunite (5 per vug), opal (5) and uranophane
(93 % of the volume) are visible; opal and uranophane are "small amounts" in the record. The
photograph archive (rare vanadates) is the clearest case of collector bias in the data set; the
verdict rests on the literature.

**Marlborough (ultramafic_supergene) — DISAGREES.** Chrysoprase is the product; the profile carries
"magnesite and chalcedony veins with rare chrysoprase" (Eggleton et al. 2011). The simulator's most
numerous visible species is opal (5 per vug, 85 % of the volume) — not documented here; magnesite
has no engine; calcite and dolomite are not documented.

**Asbestos Hills (both scenarios) — DISAGREES.** Tiger's eye and crocidolite are the record (84 %
of photographs are tiger's eye). Read first-hand: "the Cape Belt, yielding crocidolite exclusively,
is by far the largest" (Peacock 1928, p. 243) — amosite is the Transvaal belt's. The simulator grows
amosite ×3 — its reason cites a stability field that "permits crocidolite-to-amosite competition",
which the locality record does not show — and opal ×5 (33 % vis, 65 % of the volume), which no
source read records here (Heaney & Fisher 2003 found no chalcedony in South African tiger's eye).
Opal's own reason calls it "subordinate".

---

## 6. Species the simulator cannot make

| locality | species without an engine | its share of the record |
|---|---|---|
| Searles Lake | trona, hanksite (also burkeite, pirssonite, gaylussite, sulfohalite) | 34 and 17 vol % of the Upper Salt |
| Deccan | cavansite, okenite, gyrolite, pentagonite, laumontite | 24 % of photographs together |
| Mogok | spinel, painite | 36 % and 15 % of photographs |
| Grimsel, Jeffrey | chlorite (clinochlore), zoisite | abundant in both frequent Aar-granite cleft types |
| Shigar, Cruzeiro | muscovite, spessartine | common (Laurs et al. 1998; Proctor 1985) |
| Marlborough | magnesite | the carbonate of the profile |
| Ametista, Herkimer | celadonite, anthraxolite | abundant |
| Sunnyside | rhodonite | about half the Washington vein |

And engines that exist but never fire where the record needs them: aquamarine at Shigar, dioptase
and calcite at Tsumeb, aragonite in Sicily, galena at Elmwood, dolomite in the MVT scenarios,
witherite in the North Pennines, skutterudite at Schneeberg.

---

## 7. What the proxies cannot say

- **Photographs follow collector attention, not tonnage.** Rare and type-locality species are
  photographed out of proportion: the Uravan district's 81 photographs are almost all rare
  vanadates (pascoite, hughesite, lasalite…), with one carnotite — the ore mineral. Schneeberg's and
  Wittichen's archives are micromount photography of secondary arsenates. Where this bias decides a
  verdict, the section says so and the literature decides instead.
- **Listings follow what sells.** Lapidary material was removed, but saleable species are still
  over-represented (Bisbee's turquoise nuggets, Sicily's sulfur lots) and common gangue is
  under-represented (dolomite, quartz and calcite matrix are rarely named in a title).
- **Active listings are a stock, not a flow.** Sold history needs an eBay login; with one, the same
  dictionary could re-read sold titles.
- **ebay.com is American.** European localities have few listings (Schneeberg 15, Wittichen 7,
  Grimsel 5); Mineralienatlas carries those.
- **The locality is bigger than the scenario.** A scenario models one cavity type; the locality's
  record holds everything mined there. Naica's record includes the whole Pb-Zn-Ag skarn while the
  scenario models the giant-gypsum pool; `tn457_barite_pulses` models one outer-zone cavity of the
  North Pennines; Tsumeb's record includes primary ore while `supergene_oxidation` models the
  oxidation zone. Those sections judge the scenario against the part of the record it claims.
- **"Visible" is a choice.** The headline comparison uses crystals ≥ 1 mm (hand-lens visible).
  Micromount localities (Tsumeb, Schneeberg, Wittichen, Roughton Gill) can be re-read at ≥ 0.1 mm
  from the census rows; the census keeps every size class.
- **Count is not specimen.** A collector's photograph is of a specimen, which may hold many
  crystals of one species. The simulator's crystal count, visible count and volume are all reported
  so a reader can pick the measure; on this data the three point the same way.

---

## 8. Proposed fix order (awaits the boss)

Nothing below is implemented. Each step is its own decision, census and commit; the order puts the
measurement first and the changes that move every baseline last.

0. **Land the instruments and the data** (this PR). No simulator file changes; no baseline moves.
1. **Pre-register abundance claims.** A passive, optional scenario field (for example the
   locality's top three species by visible crystals, with the source) read by
   `tools/locality-abundance-compare.mjs` — a target for every later step, not a CI gate. The
   literature ranks in the data file are the first draft.
2. **Fix the documentation drift** (F1b): one sentence in `data/minerals.json`. Byte-identical.
3. **The count-word contradictions (F2), one species at a time.** Anhydrite first (four scenarios,
   one cause: a cap of 8 and a 16 %-per-step roll once the PHREEQC path admits it), then celestine
   (Searles, Naica, the reactivated vein; Elmwood's blanket is a separate, boss-ruled habit
   decision), greenockite (a coating, not crystals — a habit/size question as much as a count),
   Bisbee's accessories, Tsumeb's molybdates, opal at the Asbestos Hills and Marlborough, argentite
   and native silver at Sunnyside and Cripple Creek. Each is "presence licensed, count wrong", so
   the lever is the species' nucleation probability or cap, not its σ gate.
4. **The gate itself (F1)** — the root cause and the largest blast radius. Replace the 21 strict
   gates with a σ-dependent per-step nucleation probability bounded by `max_nucleation_count` (the
   air-mode Bernoulli already does this for cave calcite). Two commits: a byte-identical refactor
   that names the idiom, then the change with a census of every scenario. **Trap:** lifting the gate
   alone will swarm calcite and quartz into dust — the reason the caps exist — so the probability
   has to fall with crystal count or with local depletion, and the fill dampener interacts with it.
5. **Dust (F3).** Growth-rate calibration for the seventeen headline species in §4.3, starting with
   the two scenarios whose verdict it decides (Herkimer quartz, Ametista amethyst) and Cruzeiro's
   tourmaline.
6. **Species debt (§6).** Hanksite and trona first (half of Searles Lake's Upper Salt by volume);
   then the zeolite group (cavansite, okenite, gyrolite), spinel, chlorite, magnesite. Then the
   engines that never fire where needed: Shigar aquamarine, Tsumeb dioptase, Sicilian aragonite.

**Two "obvious" fixes that are traps.** (a) *Calibrate to the photograph shares.* The archives
over-weight rarities — Tsumeb's ludlockite has more photographs than its anglesite — so photo
shares are evidence of what collectors find interesting, not targets. Use the literature ranks; use
the proxies only to break ties and to fill gaps. (b) *Delete the over-produced species.* Most are
documented at their locality (celestine at Elmwood and Naica, greenockite at Picher, atacamite and
lepidocrocite at Bisbee); the record licenses them and only the count is wrong. Removing them would
turn a ratio error into a presence error.

---

## 9. Verification and review history

**Instrument checks.**
- Census vs committed baseline: seed 42, four scenarios, surviving/dissolved/total per species —
  0 mismatches.
- Dictionary provenance: the in-page dictionary and the committed file hash to the same SHA-256
  (`5d3556449edfb5f27d55d9f4d880f6e56c504084f15d80d08fa85ad03a61fd35`).
- Capture provenance: the listing counts (`cbb9cb8b…`) and the photograph counts (`b56cf638…`) hash
  identically in the browser page and in the data file. The first photograph transcription dropped
  one Schneeberg row (Lotharmeyerite = 1); the hash mismatch caught it and it was restored.
- Classifier unit checks before capture: "Copper Queen Mine" ≠ native copper; "fool's gold" →
  pyrite; "Sulphur Bank" ≠ sulfur; "ruby silver" → proustite; "Ruby Red Sphalerite" ≠ ruby; "Galena
  Spinel Twin" ≠ spinel; "metatorbernite" ≠ torbernite.

**Literature spot-checks, read first-hand on 2026-10-21 (11 claims, all matched the research
passes):** Smith 1979, USGS PP 1043, p. 59, Table 14 and its text; Smith & Haines 1964, USGS Bull.
1181-P, pp. P1 and P7; Lindgren & Ransome 1904, USGS Bull. 254, pp. 20–21 (four sentences); Peacock
1928, Am. Mineral. 13, p. 243; Leach et al. 2010, USGS SIR 2010-5070-A (four sentences); Harvard
*Tsumeb Mineral Notes* TSNB311 (scorodite, "Very rare") and TSNB324 (smithsonite, "Very common");
Koenigsberger 1919, the Aar-granite association list. One research-pass claim was overturned by the
data: Sulphur Bank metacinnabar is documented (a Mineralienatlas photograph), not "not documented".

**Review rounds.** (filled in as the rounds land)

---

## 10. Reproduce

```
node tools/assemblage-census.mjs --seeds 1-20,42 --workers 4   # .local-evidence/assemblage-census/runs.jsonl
node tools/locality-abundance-compare.mjs                        # .local-evidence/locality-abundance/compare.{md,json}
```
The census resumes from its own rows (keyed by scenario, seed and SIM version), so a stopped run
picks up where it stopped; its default is one worker, per AGENTS.md. Both instruments are passive:
they write only under `.local-evidence/`. The proxy data
(`proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json`) is a dated capture; refreshing it means
re-running the browser capture described in its `sources` block. The generated appendix
(`proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`) is this run's `compare.md`.
