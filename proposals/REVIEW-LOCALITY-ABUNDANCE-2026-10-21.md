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
**Review history:** §9 — round 1 scored the first draft 6/10; its corrections are folded in.

---

## 1. Verdict

**The simulator's crystal ratios do not match the rocks.** Of the 33 locality scenarios, 1 agrees
(Bimbowrie: andalusite is everything on both sides), 8 agree in part, 19 disagree, 3 grow no crystal
a collector could see, and 2 have too little proxy data to score. The median rank correlation
between the simulator's visible crystals and the locality record is 0.00, and it stays at or below
zero whichever simulator measure is used (surviving count −0.02, volume −0.11). The verdicts are
stable under seed resampling (median 5–95 % band width 0.02; one scenario, Cruzeiro, flips in more
than 20 % of resamples).

**Why.** Take each locality's three most-recorded species that the simulator has an engine for —
77 slots across the 33 scenarios:

| what the simulator does with them | slots |
|---|---:|
| never forms the species at all | 20 |
| forms it, but in most seeds no crystal reaches 1 mm (dust) | 15 |
| forms visible crystals, but too few to rank in its own top three | 15 |
| ranks it in its own top three | 27 |

1. **Non-forming engines are the largest failure (§4.1).** Calcite is a top-three species at 7
   localities and never forms at 5 of them (Ametista, Herkimer, Naica, Viburnum, Tsumeb); fluorite
   never forms at 3 of its 7 scenarios (Cripple Creek, Naica, the North Pennines barite cavity). This
   overlaps the July review's "district-diagnostic no-shows", still open.
2. **Where a gated species does form, the gate decides its rank (§4.1).** Twenty-one species may
   only nucleate when no exposed crystal of their own is left, among them calcite, fluorite,
   sphalerite, pyrite, chalcopyrite, dolomite, malachite and smithsonite. When one of a locality's
   headline species forms visible crystals, it reaches the simulator's top three **2 times in 13 if
   strictly gated, 10 in 12 if soft-gated, 15 in 17 if ungated.** The strictly gated species hold
   36 % of the real top-three slots and 6 % of the simulator's.
3. **Minor phases out-number headline phases (§4.2).** Twenty-one species whose own written reason
   calls them *trace*, *minor*, *subordinate*, *accessory* or *rare* out-number the scenario's
   typical headline species in *visible* crystals; eight also out-weigh them in volume. The largest:
   anhydrite at Tri-State ("a trace Ca-sulfate accessory", 6.3 visible crystals per vug against 1.0
   for the headline median — 45 % of the visible crystals, with no photograph, listing or published
   record at Picher).
4. **Headline species are grown only as dust (§4.3)** — 24 cases, including Herkimer quartz (median
   largest 0.57 mm), Ametista amethyst (0.84 mm), Cruzeiro tourmaline (0.37 mm; 83 % of the voting
   record), Bisbee azurite and native copper.

A fifth cause is **species debt (§6)**: trona and hanksite are 34 and 17 vol % of Searles Lake's
Upper Salt (USGS PP 1043, Table 14) and have no engine; nor do spinel, chlorite, magnesite,
cavansite, okenite or gyrolite.

**What holds.** Jeffrey Mine's top three (grossular, vesuvianite, diopside) are the same set in the
simulator and the record. Bimbowrie agrees outright. Tormiq's epidote and titanite, Ouro Preto's
topaz and Roughton Gill's pyromorphite lead on both sides; Sicily's sulfur and celestine are in both
top threes (in opposite order). Elmwood grows the right three headline species — celestine simply
outnumbers them. At the Great Salt Plains selenite holds 100 % of the crystal volume, as it should;
only the count is inverted (halite crusts).

---

## 2. Method

### 2.1 The simulator's side — `tools/assemblage-census.mjs`
Every scenario ran for its authored duration on 21 seeds (1–20 and 42): 861 runs (41 × 21), none
failed. At the end of each run the census records, per species, the crystals that still exist
(dissolved ones are dropped; crystals enclosed inside another crystal are kept — they are still in
the specimen), how many of them are ≥ 0.1, 1, 5 and 10 mm in their longest dimension, their summed
volume and the largest one. "Visible" below means ≥ 1 mm. All 41 seed-42 rows reproduce the
committed baseline (`tests-js/baselines/seed42_v285.json`) exactly — surviving, dissolved and total
counts for 351 (scenario, species) entries (checked by review round 1; the author checked four
scenarios before the full panel ran).

One seed cannot carry a ratio: most species fire zero to six times in a run, and the seed-42
baseline is one draw.

### 2.2 The rocks' side — two independent proxies, captured 2026-10-21
- **Photographs** — Mineralienatlas (Geolitho Stiftung). Its page *LokationMineralBilder* lists,
  for a locality and all its sub-localities, how many photographs each mineral has. 36 locality
  pages, 6,736 photographs. Mindat (the larger archive) sits behind a Cloudflare human check for
  automated browsing and was not used as a data source.
- **Market listings** — eBay (ebay.com), category 3213 *Rocks, Fossils & Minerals*, active
  listings only (sold-listing history needs a login). One to seven searches per locality, up to
  1,440 listings each, deduplicated by item. Every title is read for the species it names by
  `tools/market-title-dictionary.mjs` (363 entries, guards for place names that contain mineral
  words — "Copper Queen", "Sulphur Bank", "Silverton" — and for colour words — "ruby red
  sphalerite", "emerald green dioptase"). A seller relisting one lot ×7 counts once (titles are
  grouped into families after stripping weights and numbers). Cabochons, jewellery, slabs, spheres
  and carvings are excluded. 72 searches, 15,190 listings, 9,822 families.

Both captures were checked byte for byte between the browser page and the committed data file
(SHA-256 of the per-locality counts; hashes in the file's `sources` block). The dictionary's 363
entries hash identically in the page and in the file (`5d355644…`, the hash of
`JSON.stringify(MARKET_TITLE_DICTIONARY)`); the lapidary pattern was injected from the file, and the
title-cleaning and family functions were re-typed identically in the page (not hash-checked).

### 2.3 The literature
Three research passes (one per locality family) collected published abundance statements —
paragenetic tables, "abundant / common / rare" wording, production figures, volume percentages —
for every locality: 63 sources, 278 species classifications, stored in the data file's
`literature` blocks with a status per claim (V = source opened and wording seen; S = search snippet
or low-reliability page; R = recalled). A few classes rest on mindat search-snippet text and are
marked S. The author then read 20 load-bearing statements in 7 sources first-hand, and review round
1 checked 8 more citations; all matched (§9).

### 2.4 The comparison — `tools/locality-abundance-compare.mjs`
**Units.** The two sides do not count the same thing: the simulator counts crystals in one cavity;
a photograph or a listing is one specimen, which may hold many crystals of one species. The boss
asked "how many of what type of crystals", so the simulator side is counted in crystals, and the
comparison is of **ranks** only — which species are most common — never of values. Crystal count,
visible count and volume are all reported, because they rank differently in places (Great Salt
Plains, Bisbee, Tri-State — §7).

**Ranking.** For each scenario, the simulator's share of visible crystals per species beside the
locality's share of photographs and of listings, and the literature class. The real ranking is the
mean of the two shares; a source with fewer than 20 observations does not vote. Spearman ρ is
computed over the union of the simulator's top 12 by visible share, its top 12 by surviving share,
the photographs' top 12, the listings' top 8 and every species the literature calls abundant or
common; a species absent from one side scores 0 there. With that zero padding ρ behaves largely as
a set-overlap statistic.

**Verdicts.** **AGREES**: ρ ≥ 0.5 and at least min(2, size of the simulator's top three) of the real
top three are in it. **DISAGREES**: ρ < 0, or the simulator's most numerous visible species is < 1 %
of the real record. **PARTLY** otherwise. **THIN** when no source votes. **NO VISIBLE CRYSTALS** when
nothing reaches 1 mm. A seed bootstrap (200 resamples of the 21 seeds) gives each ρ a 5–95 % band and
the share of resamples whose verdict differs. The full per-species tables for all 33 scenarios are in
`proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`.

---

## 3. Scoreboard

"Lit: rare" lists the simulator's top-three visible species that the literature rates rare, very
rare or undocumented ((S) = the class rests on snippet-level evidence); "lit: missing" lists species
the literature calls abundant that the simulator never grows to 1 mm. `x:` = no engine; `ma:` = a
Mineralienatlas name with no engine and no dictionary entry.

| scenario | verdict | ρ [seed band] | real top 3 | sim top 3 (≥ 1 mm) | lit: rare | lit: missing |
|---|---|---|---|---|---|---|
| bisbee | DISAGREES | −0.49 [−0.53, −0.48] | malachite, azurite, native copper | atacamite, chrysocolla, jarosite | | |
| wittichen | DISAGREES | −0.48 [−0.49, −0.48] | erythrite, zeunerite, ma:heinrichite | haidingerite, native arsenic, nickeline | haidingerite (S) | native silver, safflorite, skutterudite |
| supergene_oxidation (Tsumeb) | DISAGREES | −0.45 [−0.46, −0.40] | smithsonite, cerussite, calcite | ferrimolybdite, brochantite, scorodite | ferrimolybdite (S), scorodite | calcite, dioptase |
| schneeberg | DISAGREES | −0.36 [−0.41, −0.34] | erythrite, x:pucherite, ma:eulytine | chrysocolla, arsenopyrite, quartz | | skutterudite, native bismuth |
| mvt (Tri-State) | DISAGREES | −0.35 [−0.41, −0.35] | galena, sphalerite, calcite | anhydrite, greenockite, galena | anhydrite, greenockite | dolomite |
| porphyry (Bingham) | DISAGREES | −0.33 [−0.34, −0.31] | pyrite, tetrahedrite, ma:faustite | ferrimolybdite, brochantite, acanthite | ferrimolybdite (S), acanthite | quartz, bornite |
| reactivated_fluorite_vein | DISAGREES | −0.28 | fluorite, galena, quartz | barite, celestine, acanthite | celestine, acanthite | quartz |
| colorado_plateau (Uravan) | DISAGREES | −0.19 | x:pascoite, ma:hughesite, ma:dickthomssenite | opal, tyuyamunite, uranophane | opal, uranophane | carnotite |
| grimsel_alpine_cleft | DISAGREES | −0.15 [−0.18, −0.13] | quartz, fluorite, epidote | apatite, quartz, titanite | titanite | x:chlorite |
| searles_lake | DISAGREES | −0.13 [−0.40, −0.13] | halite, x:hanksite, x:trona | tincalconite, thenardite, halite | tincalconite (S) | x:hanksite, x:trona |
| naica_geothermal | DISAGREES | −0.10 | fluorite, selenite, calcite | celestine, selenite | | fluorite |
| roughten_gill | DISAGREES | −0.08 [−0.09, −0.05] | pyromorphite, mimetite, quartz | pyromorphite, chrysocolla, galena | | quartz |
| tn457_barite_pulses (N. Pennines) | DISAGREES | −0.02 | fluorite, galena, quartz | barite, sphalerite | | fluorite, galena, quartz |
| sunnyside_american_tunnel | DISAGREES | −0.01 [−0.10, −0.01] | rhodochrosite, fluorite, quartz | galena, argentite, quartz | argentite | sphalerite, x:rhodonite |
| reactive_wall (Viburnum) | PARTLY | 0.00 | calcite, galena, chalcopyrite | galena, sphalerite, pyrite | | dolomite |
| ouro_preto | PARTLY | 0.03 | topaz, hematite, x:euclase | topaz, quartz, albite | albite | |
| deccan_zeolite | PARTLY | 0.04 [0.02, 0.06] | apophyllite, stilbite, heulandite | chalcedony, heulandite, quartz | | stilbite |
| asbestos_hills (both) | DISAGREES | 0.04 / 0.10 | tiger's eye, crocidolite, x:jasper | opal, crocidolite, tiger's eye | opal | quartz, magnetite |
| epithermal_telluride (Cripple Creek) | DISAGREES | 0.09 [0.09, 0.10] | calaverite, native gold, fluorite | native silver, native gold, hessite | native silver, hessite | fluorite, dolomite |
| gem_pegmatite (Cruzeiro) | PARTLY | 0.18 [0.16, 0.20] — verdict flips in 37 % of resamples | tourmaline, quartz, lepidolite | albite, feldspar, quartz | | tourmaline |
| jeffrey_mine | PARTLY | 0.20 [0.15, 0.24] | grossular, vesuvianite, diopside | vesuvianite, diopside, grossular | | |
| ultramafic_supergene (Marlborough) | DISAGREES | 0.22 | chrysoprase, chalcedony | opal, chrysoprase | opal | chalcedony, x:magnesite |
| shigar_pegmatite | PARTLY | 0.34 | aquamarine, topaz, quartz | tourmaline, quartz, albite | | aquamarine |
| elmwood | DISAGREES | 0.34 | fluorite, calcite, sphalerite | celestine, fluorite, calcite | | |
| tormiq_alpine_cleft | PARTLY | 0.35 [0.31, 0.35] | titanite, epidote, quartz | epidote, actinolite, titanite | | |
| sicily_solfifera | PARTLY | 0.36 | native sulfur, aragonite, celestine | celestine, native sulfur, strontianite | strontianite (S) | selenite |
| chiastolite_hornfels | AGREES | 0.66 | andalusite, quartz, chalcedony | andalusite | | |
| amethyst_geode | NO VISIBLE CRYSTALS | — | quartz, chalcedony, calcite | — | | quartz, chalcedony, x:celadonite |
| cooling (Herkimer) | NO VISIBLE CRYSTALS | — | quartz, x:bitumen, calcite | — | | quartz, x:bitumen, dolomite |
| marble_contact_metamorphism (Mogok) | NO VISIBLE CRYSTALS | — | x:spinel, ruby, x:painite | — | | calcite |
| great_salt_plains | THIN (literature: count inverted) | — | (13 listing families, all selenite) | halite, selenite | | |
| sulphur_bank | THIN (literature: lead agrees) | — | (2 photos, 1 listing) | cinnabar, pararealgar, orpiment | pararealgar (S), orpiment (S) | opal |

Bands are shown where they differ from the point value. Ten of the 28 scored scenarios sit within
±0.11 of the ρ = 0 line between DISAGREES and PARTLY, so individual verdicts near the line carry
little weight; the aggregate does not depend on them — median ρ is 0.00 by visible count, −0.02 by
surviving count, −0.11 by volume and 0.00 by the share of seeds with a visible crystal. Cripple
Creek is DISAGREES only because its most numerous visible species (native silver) is 0.9 % of the
record against the 1 % threshold.

---

## 4. Fleet-wide findings

### 4.1 F1 — Engines that never fire, and the gate that ranks the ones that do

**What happens to each real top-three species**, by the nucleation gate of its engine (static scan
of the `_nuc_<mineral>` functions, `js/80`–`js/91`, cross-checked by review round 1 for twelve
species):

| gate | never forms | dust | visible, outside the sim top three | in the sim top three | total |
|---|---:|---:|---:|---:|---:|
| strict — a new crystal only when no exposed crystal of the species is left | 11 | 4 | 11 | 2 | 28 |
| soft — more than one only when σ > ~2 and a ~30 % roll passes | 4 | 9 | 2 | 10 | 25 |
| cap-only — `max_nucleation_count` is the only bound | 3 | 2 | 2 | 15 | 22 |
| shared selector (aquamarine, ruby) | 2 | 0 | 0 | 0 | 2 |

Two separate mechanisms are at work.

**(a) Engines that never fire where the record needs them — the largest class (20 of 77).** Calcite
at Ametista, Herkimer, Naica, Viburnum and Tsumeb; fluorite at Cripple Creek, Naica and the North
Pennines barite cavity; galena and quartz in that cavity; chalcopyrite at Viburnum; aquamarine at
Shigar; aragonite in Sicily; hematite at Ouro Preto; zeunerite at Wittichen; quartz and chalcedony at
Bimbowrie; chalcedony at Marlborough; ruby at Mogok. These are σ-gate, broth or event questions, one
scenario at a time — they overlap the July review's "district-diagnostic no-shows" and "missing
ore-forming events" (`PROPOSAL-HOSTILE-REVIEW-2026-07-14.md`, cross-cutting mechanisms table), which
are still open.

**(b) Where a gated species does form, the gate sets its count.** Twenty-one species carry the
strict gate and survive somewhere in the fleet: calcite, aragonite, dolomite, siderite,
rhodochrosite, malachite, smithsonite, fluorite, sphalerite, pyrite, marcasite, chalcopyrite,
tetrahedrite, tennantite, hematite, apophyllite, wulfenite, adamite, mimetite, erythrite and
annabergite (wurtzite carries it too but never survives). The calcite gate is commented as exactly
what it is — "Water-mode (default): legacy serial gate — one active calcite at a time per scenario,
matching every scenario's existing baseline" (`js/82-nucleation-carbonate.ts:36`). Across the fleet,
in vugs where they survive:

| gate | species | median crystals per vug | median ≥ 1 mm per vug |
|---|---:|---:|---:|
| strict | 21 | 1.17 | 0.62 |
| soft | 30 | 3.12 | 1.47 |
| cap-only | 80 | 3.63 | 2.17 |
| transformation product (inherits its parent's count) | 5 | 4.57 | 4.57 |

Strictly gated species sit at ≤ 1.25 crystals per vug in 72 of the 92 (species, scenario) pairs
where they survive; calcite's higher fleet mean (3.3) comes from enclosure turnover in two scenarios
(sabkha, Searles) and from the cave scenarios' 6 %-per-step Bernoulli replacement of the gate
(`_AIR_MODE_NUCLEATION_PROB`). The conditional test is the clean one: a real headline species that
forms visible crystals reaches the simulator's top three 2 times in 13 when strictly gated, 10 in 12
when soft-gated, 15 in 17 when ungated. Strictly gated species hold 28 of the 77 real top-three
slots (36 %) and 5 of the simulator's 84 (6 %); cap-only species hold 22 (29 %) and 50 (60 %).

Two further notes. Enclosure feeds raw counts: the cap counts only *exposed* crystals
(`js/85b-simulator-nucleate.ts:716` skips enclosed and dissolved ones), so an overgrown species keeps
nucleating — barite averages 15.9 crystals per vug where it survives and 55.6 per Tri-State vug, all
dust; the code says this is deliberate (dense chalcopyrite inclusion trails in MVT calcite), and the
enclosed crystals are mostly invisible. And seven species have no `_nuc_` function of their own:
five are transformation products (tincalconite from borax, haidingerite from pharmacolite,
pararealgar from realgar, metazeunerite and the other meta-micas from their parents,
`js/75-transitions.ts:95–100, 474`), whose counts are their parents'; the beryl and corundum
varieties and raspite are nucleated inside another species' function.

**F1b — documentation drift.** `data/minerals.json:14` describes `max_nucleation_count` as "Counted
across the whole simulation (active + dissolved)". The code (`js/85b-simulator-nucleate.ts:716`)
counts only exposed crystals and skips dissolved and enclosed ones.

### 4.2 F2 — Minor phases out-number headline phases, against the scenarios' own words
Every scenario names its headline species (`expects_species`) and justifies its other delivered
species with a written reason (`deterministic_species`, `statistical_species`). Thirty-eight reasons
call the species *accessory* (18), *minor* (8), *subordinate* (7), *trace* (4) or *rare* (1) while
its surviving crystals out-number the scenario's median headline species. Surviving counts include
dust — 26 % of all surviving crystals in the fleet are under 0.1 mm, and at least 580 are zero-size
nuclei that never grew (Sunnyside's 4 native-silver "crystals" per vug are 4 such nuclei; Searles'
mirabilite is 8 per vug at 0 mm). "Trace" and "accessory" usually describe volume. So each case is
tested again by **visible** crystals and by **volume**: **21 of the 38 hold by visible count; 8 hold
by volume.** The full table is in the appendix; the cases that hold by visible count include:

| scenario | species | its reason says | visible per vug | headline median visible | volume share | headline median volume |
|---|---|---|---:|---:|---:|---:|
| mvt | anhydrite | "a trace Ca-sulfate accessory" | 6.29 | 1.00 | 0.3 % | 2.6 % |
| bisbee | atacamite | "retained as an arid chloride accessory" | 7.52 | 1.00 | 15 % | 1.1 % |
| reactivated_fluorite_vein | celestine | "a subordinate Sr-sulfate response" | 5.71 | 1.00 | < 0.1 % | 0.4 % |
| asbestos_hills_crack_seal | opal | "subordinate" | 5.00 | 2.52 | 65 % | 2.3 % |
| epithermal_telluride | native_silver | "a legitimate Ag-Au-Te vein accessory" | 4.00 | 2.00 | 5.6 % | 9.4 % |
| porphyry | arsenopyrite | "a hypogene accessory" | 3.81 | 1.00 | 3.4 % | 0.7 % |
| roughten_gill | chalcocite | "minor" | 3.76 | 1.00 | < 0.1 % | < 0.1 % |
| sicily_solfifera | strontianite | "that subordinate Sr-carbonate sink" | 3.48 | 2.29 | 0.2 % | 6.1 % |
| mvt | greenockite | "a minor CdS accessory" | 3.24 | 1.00 | < 0.1 % | 2.6 % |

Some of the 38 fail the visible test and are dust-count artefacts rather than visible errors:
Searles calcite ("subordinate", 10.8 per vug, none visible) and celestine ("minor", 8.9, none
visible), anhydrite at Sweetwater and Wittichen (0 visible), Sunnyside's native silver (zero-size
nuclei), and Bisbee's native gold (13 per vug but 0.71 visible against 1.00).

**The anhydrite case.** Three of the four anhydrite reasons call it a "trace" accessory and the
fourth "minor"; all four credit "the corrected PHREEQC analytical K(T) path" (the K(T) correction is
v270, `js/15-version.ts:12956`; the reasons were written at SIM 271), and the Tri-State reason adds
that this "is transparent model classification, not promotion of anhydrite as a defining Picher
locality claim". The thermodynamic correction is not in question here. At Tri-State the count is
the question: 6.3 visible crystals per vug, 45 % of the visible crystals, against no photograph, no
listing and no published record (Leach et al. 2010; Kansas Geological Survey), and the boss's
Picher mindat list (`data/mindat-species-refs.json5`) omits it. At Sweetwater, Wittichen and in the
reactivated vein the anhydrite is mostly or entirely dust.

**Greenockite and acanthite were found before.** The July review recorded "greenockite (5 events) +
hawleyite outnumber sphalerite (1) — Cd should ride the ZnS lattice, not out-precipitate its host"
and named the lever — "lattice partition sinks + host-first paragenetic gate" for Cd → ZnS and
Ag → PbS (its cross-cutting mechanisms table). This review measures the same species from the
abundance side and inherits that lever (§8 step 3).

### 4.3 F3 — Headline species grown only as dust
Twenty-four times a headline species — ≥ 10 % of the voting record, or "abundant" in the literature —
is grown by the simulator but its median largest crystal is under 1 mm. In most of them no seed
reaches 1 mm; Searles halite does in 2 of 21 seeds (largest 3.1 mm) and Tormiq quartz in 4 of 21
(largest 4.1 mm). The appendix lists all 24; the ones that matter most:

| scenario | species | real share (voting) / literature | sim per vug | median largest | largest in any seed |
|---|---|---|---:|---:|---:|
| cooling (Herkimer) | quartz | 94 % / AB | 1.0 | 0.57 mm | 0.59 mm |
| gem_pegmatite (Cruzeiro) | tourmaline | 83 % / AB | 3.0 | 0.37 mm | 0.58 mm |
| amethyst_geode | quartz (amethyst) | 56 % / AB | 1.0 | 0.84 mm | 0.87 mm |
| searles_lake | halite | 38 % / AB | 5.3 | < 0.01 mm | 3.1 mm |
| grimsel_alpine_cleft | fluorite | 30 % / CO | 1.0 | 0.51 mm | 0.52 mm |
| amethyst_geode | chalcedony | 23 % / AB | 2.5 | 0.15 mm | 0.16 mm |
| deccan_zeolite | stilbite | 18 % / AB | 4.3 | 0.88 mm | 0.96 mm |
| roughten_gill | mimetite | 17 % / CO | 1.2 | 0.05 mm | 0.10 mm |
| bisbee | azurite | 16 % | 4.0 | 0.51 mm | 0.75 mm |
| bisbee | native copper | 12 % | 0.7 | 0.07 mm | 0.10 mm |
| tormiq_alpine_cleft | quartz | 11 % | 3.3 | 0.20 mm | 4.1 mm |
| wittichen | skutterudite, safflorite, native silver | AB (Petersen 1868) | 2.1, 2.0, 3.5 | 0.06, 0.01, 0.55 mm | 0.07, 0.60, 0.90 mm |
| schneeberg | native bismuth | AB | 0.4 | 0.06 mm | 0.07 mm |
| colorado_plateau | carnotite | AB (Weeks & Thompson 1954) | 4.0 | 0.81 mm | 0.87 mm |

The Herkimer and Ametista cases decide those scenarios' verdicts: each grows the right mineral and
nothing a collector could see — at Ametista, where the geode walls end in "large-sized amethyst
crystals" (Proust & Fontaine 2007).

---

## 5. Locality findings

Numbers are crystals per vug averaged over 21 seeds; "% vis" is the share of visible (≥ 1 mm)
crystals; photo and listing shares come from the data file; literature classes are AB / CO / UN / RA
/ ND. Full tables in the appendix.

### 5.1 MVT and fluorite–barite veins

**Tri-State (mvt) — DISAGREES.** A sphalerite district (zinc to lead concentrates about 6:1, 23 Mt
to 4 Mt; Kansas Geological Survey 2001) whose collectible crystals are calcite (2–3 ft
scalenohedra), sphalerite, galena, dolomite and chalcopyrite. The USGS deposit model: "the dominant
minerals are sphalerite, galena, pyrite, marcasite, dolomite, and calcite, whereas barite is
typically minor to absent and fluorite is rare" (Leach et al. 2010). The simulator: barite 55.6 per
vug (all dust), anhydrite 7.6 (45 % vis), greenockite 5.3 (23 % vis), and one crystal each of
sphalerite, galena, calcite, fluorite and pyrite. Greenockite is real at Picher, but as an earthy
coating on sphalerite, not as 2.3 mm crystals (Handbook of Mineralogy). Chalcopyrite (6 % of photos,
14 % of listings), dolomite and marcasite never survive. *Dolomite:* the July review defended the
dolomite no-show as correct kinetics (its §5: SI is thermodynamic, nucleation kinetic). The abundance
evidence cuts against that defence — at MVT temperatures the published lists put dolomite among the
*dominant* minerals (Leach et al. 2010; Rowan 1987 calls Viburnum's "the abundant hydrothermal gangue
dolomite"). This review does not reopen the verdict; it routes the evidence to the boss.

**Elmwood — DISAGREES, narrowly.** The right headline species, the wrong count. Fluorite (46 % of
photos), calcite (23 %) and sphalerite (20 %) are the simulator's other three visible species, at one
crystal each (strict gate). Celestine is 6 per vug and 66 % of the visible crystals, against 0
photographs and 1 listing family in 466; a dealer write-up after Gaylord 1996 lists barian celestine
as a minor species (Jensen 1996 describes it; only that note's title was seen). The celestine count
is not an accident: the S2 celestine tranche (SIM 236) raised it from 2 to 6 crystals to render the
documented fibrous blanket. That decision was about habit; this review adds the count it produced.
Galena (6 % of photos, documented in Gratz 1986's paragenesis) never forms.

**Viburnum Trend / Sweetwater (reactive_wall) — PARTLY.** A *lead* district: Zn/(Zn+Pb) "is less
than 0.1 for the Southeast Missouri district", chalcopyrite "is the main source of byproduct copper",
and "Barite has never been reported in the Cambrian-hosted Southeast Missouri Lead districts" (Leach
et al. 2010). The simulator puts 82 % of its crystal volume into sphalerite and grows 6.6 anhydrite
per vug (none visible; one listing family in 362 names anhydrite); calcite (42 % of photos),
chalcopyrite (12 %) and dolomite ("the abundant hydrothermal gangue dolomite", Rowan 1987) never
survive. Galena is right as a visible species but is one crystal.

**North Pennines (tn457_barite_pulses, reactivated_fluorite_vein) — DISAGREES.** The orefield's
record is fluorite first (56 % of photos, 63 % of listings), then galena, quartz and the barium
minerals, zoned: fluorite in the central zone, barium minerals outside it (GCR vol. 36; North Pennines
audit). *tn457* models one barite-on-sphalerite cavity from the outer zone, so its district mismatch
is a scope question, not an error. *reactivated_fluorite_vein* claims the central fluorite–galena
vein type and grows fluorite ×1 and galena ×1 beside barite ×6 (an outer-zone mineral), celestine
×6, greenockite ×5, acanthite ×4 and anhydrite ×7.5 — none of the last four recorded in the orefield
(GCR vol. 36 places the silver in argentiferous galena). The July review flagged this scenario's
witherite-vs-baryte routing as an objection with "real force"; this is its count side.

### 5.2 Oxidation zones

**Tsumeb (supergene_oxidation) — DISAGREES.** Harvard's *Tsumeb Mineral Notes* rate every species
on a specimen-availability scale. Their "Very common" species are smithsonite ("the most abundant
secondary mineral at Tsumeb", after Pinch & Wilson 1977), cerussite, malachite, azurite, calcite,
dioptase and duftite. The simulator's most numerous visible species are ferrimolybdite (9.9 % vis;
no species entry), brochantite (8.3 %), scorodite (7.9 %, "Very rare") and pyromorphite (7.9 %,
"Extremely rare"); cerussite (6.5 %) and azurite (5.8 %) are visible too, at the same share as
anglesite and powellite ("Extremely rare"). Ferrimolybdite and powellite hold 54 % of the crystal
volume (25 mm and 20 mm crystals) with no Tsumeb photograph or listing. Smithsonite and malachite are
one crystal each (strict gate); dioptase (6 % of photos and listings) and calcite never form.

**Bisbee — DISAGREES (ρ −0.49).** The record is malachite, azurite, native copper, cuprite and
calcite. The simulator's visible crystals are led by atacamite (16 % vis, 8.1 per vug), chrysocolla,
jarosite, opal, chalcedony and acanthite; azurite (4 per vug) and native copper never pass 1 mm,
cuprite barely (median 0.36 mm); malachite is one crystal, though a 65 mm one holding 43 % of the
volume; calcite never forms. Lepidocrocite (14.5 per vug, almost all dust) and native gold (13.0;
0.7 visible) are the most numerous species. Dioptase (4.8 per vug at 0.08 mm) was defended for
*presence* in July; its count is the new question. No published abundance ranking for Bisbee was
reachable (Graeme's Mineralogical Record articles were not), so this verdict rests on the two proxies.

**Roughton Gill — DISAGREES, narrowly.** The lead is right: pyromorphite tops both sides. The
Geological Conservation Review account: "Most abundant are supergene lead and copper minerals";
pyromorphite, cerussite and malachite "are thought to have been worked commercially". Mimetite (17 % of
the voting record) and quartz never pass 1 mm; chalcocite (4.6 per vug) has no photograph or listing
and chrysocolla (5.0) one photograph; mottramite (3.8 per vug, "trace" in its own reason) is recorded
from Brandy Gill rather than Roughton Gill (snippet-level).

### 5.3 Veins and porphyry

**Bingham Canyon (porphyry) — DISAGREES.** Main-stage chalcopyrite, bornite, chalcocite and pyrite;
molybdenite in quartz veins that can make up half the rock (Phillips et al. 2005). The simulator grows
chalcopyrite ×1 and pyrite ×1 beside ferrimolybdite ×5.3, brochantite ×4.7, acanthite ×4,
arsenopyrite ×3.9 and bismuthinite ×4. Arsenopyrite and bismuthinite are "accessory" in their own
reasons; acanthite is undocumented in Phillips et al. 2005, and ferrimolybdite, arsenopyrite and
bismuthinite are rated rare only on snippet-level evidence; brochantite has no literature class.
Quartz and bornite never survive. Bingham's specimen record is thin (30 photographs; dealers call it
"not known as a fine specimen producer"), so the literature carries this one.

**Sunnyside / American Tunnel — DISAGREES.** The record: rhodochrosite (45 % of photos), fluorite
(29 %), quartz; sphalerite and galena are "the most abundant ore minerals" (Guzman et al. 2024). The
simulator's second most numerous visible species is argentite (6.4 per vug). Its own reason claims
compatibility ("a high-temperature Ag2S precursor compatible with Sunnyside's primary polymetallic
stage"), not a record, and no silver mineral is named in Burbank 1933 or Guzman et al. 2024, though
the mine produced 14.9 Moz of silver. Native silver is documented — the scenario cites wire silver at
the Sunnyside Extension mine (USGS Folio 120) — and its 4 per vug are zero-size nuclei, a count
artefact (§4.2). Rhodochrosite and fluorite are one crystal each (strict gate); sphalerite is dust.

**Cripple Creek (epithermal_telluride) — DISAGREES.** Read first-hand: gold occurs "chiefly as
calaverite, but partly also as the more argentiferous sylvanite"; "Native gold appears to be absent
from the telluride ores, except as it may be set free by the oxidation of these tellurides"; "The
usual gangue minerals of the ores are quartz, fluorite, and dolomite"; silver runs "about 1 ounce of
silver to 10 ounces of gold" (Lindgren & Ransome 1904, USGS Bull. 254, pp. 20–21). The simulator
grows native silver ×4 (20 % vis), native gold ×4, hessite ×3 (71 % of crystal volume) and calaverite
×2; fluorite and dolomite never form; the feldspar the record names is potassic, while the simulator
grows albite ×3.2. (The verdict sits at the 1 % threshold — §3.)

**Schneeberg — DISAGREES.** A cobalt–silver–bismuth–uranium vein district: native bismuth and
skutterudite were principal ores, erythrite is the most-photographed species (103 photographs; type
locality). The simulator's visible leaders are chrysocolla, arsenopyrite and quartz; native bismuth
and native silver are dust; skutterudite never forms; topaz ×3.9, cassiterite ×3.3, spodumene and
morganite belong to the granite-hosted tin type of the western Erzgebirge (Bastin 1914), not to these
veins. The weakest-sourced verdict here: no published ranking was found, and the photo archive is
micromount-heavy.

**Wittichen — DISAGREES (ρ −0.48).** Petersen 1868 ranks the ores: predominant Speiskobalt
(skutterudite–safflorite), earthy cobalt and native silver; less widespread native bismuth,
wittichenite, native arsenic, nickeline, proustite; erythrite "sehr häufig". The vein fill is mainly
barite. The simulator grows chalcedony ×4 (not recorded), native arsenic and nickeline ×4 each, and
haidingerite ×4.6 (24 % vis) — haidingerite is pharmacolite dehydrated in place, and pharmacolite
(type locality, "nicht selten") is the recorded phase. Anhydrite ×4.7 is dust; skutterudite, safflorite
and native silver are dust too; erythrite is one crystal (strict gate).

### 5.4 Evaporites, hot springs and the Naica pool

**Searles Lake — DISAGREES.** The best data in the review, read first-hand: USGS PP 1043 (Smith 1979)
Table 14 gives the Upper Salt as halite 43, trona 34, hanksite 17, borax 3.1, mud 2.0, burkeite 0.3,
pirssonite 0.2, thenardite 0.1, aphthitalite 0.03 and sulfohalite 0.01 vol %, with "Hanksite is the
third most abundant mineral, borax the forth." USGS Bull. 1181-P (Smith & Haines 1964, p. P7) says
celestite is one of six reported minerals that "almost certainly do not occur within the deposit in
normally detectable quantities". The simulator's visible crystals are tincalconite (71 % vis) and
thenardite (95 % of the volume). Its tincalconite is its borax, dehydrated in place
(`js/75-transitions.ts:95`); the record has borax surviving as 3.1 vol % and tincalconite "common
only as an alteration rind on borax" — so the mechanism is real and its completeness is the question:
the simulator converts all of its borax. Calcite (10.8 per vug) and celestine (8.9) are invisible
dust; trona and hanksite have no engine; halite is mostly sub-0.01 mm crusts.

**Great Salt Plains — THIN; the literature says the count is inverted.** The collectible is hourglass
selenite (single crystals and twins to 7 in., clusters to 38 lb); halite occurs as a thin surface
crust (US Fish & Wildlife Service 2002). The simulator: halite 11.3 per vug (69 % vis) to selenite 2.0
— though selenite takes 99.9 % of the volume (40.6 mm crystals). Count inverts what is collected;
volume does not.

**Sicily — PARTLY.** Sulfur and celestine are in both top threes. Aragonite — the "well-known large
aragonite crystals" (Viola 1897; 10 % of photos, 21 % of listings) — never forms, and strontianite (4
per vug, 25 % vis) has no scientific record from these mines that the research pass could find.
Celestine (6 per vug) outnumbers sulfur (4.3); at Monte Palco it is present "occasionally".

**Sulphur Bank — THIN; the literature agrees on the lead.** Two photographs and one listing. Cinnabar
— the simulator's top species — is Ross's (1940) "most abundant metallic mineral", with native sulfur
abundant; "the upper-central part of the basalt flow at Sulphur Bank has been almost completely
replaced by opal" — opal is aspirational in the scenario and never forms. Orpiment (7 per vug) and
pararealgar (6; light-altered realgar) are not mentioned by the three sources read; the scenario
expects them, and absence from three sources is not proof. **Boss adjudication needed** before
anything changes. Metacinnabar is documented (one Mineralienatlas photograph), against the research
pass's "not documented".

**Naica — DISAGREES, partly a scope question.** The scenario models the giant-gypsum cave pool, so the
ore body's fluorite, galena and sphalerite are outside its claim. Inside it, García-Ruiz et al. (2007)
record the cave walls' crust of calcite and celestine, and the selenite. The simulator grows celestine
×6 (86 % of visible crystals) to selenite ×1: celestine is real here, but as a wall crust, not as six
free crystals out-numbering the gypsum the cave is named for.

### 5.5 Pegmatites and alpine clefts

**Cruzeiro (gem_pegmatite) — PARTLY (the one unstable verdict: 37 % of seed resamples differ).**
Tourmaline is 83 % of the voting record; the pockets "frequently contain superb gem tourmaline
crystals" (Proctor 1985). The simulator's tourmaline stays under 1 mm in every seed (median largest
0.37 mm); its visible crystals are albite and microcline (feldspar holds 97 % of the volume).
Cassiterite — "rare" in the record — is the most numerous species (4.5 per vug, dust).

**Shigar Valley — PARTLY.** Aquamarine is the signature product (36 % of listings; a principal
commodity of the Dassu pegmatites, Laurs et al. 1998). The beryl family never nucleates in this
scenario. Topaz is dust (0.59 mm); fluorite, apatite, muscovite and garnet never form.

**Ouro Preto — PARTLY.** Topaz leads both sides. The record has quartz, specular hematite, mica,
rutile and rare euclase with it, and "The potassium feldspar is now totally altered to kaolinite"
(Keller 1983); the simulator's other visible crystals are albite (36.8 mm) and feldspar.

**Grimsel — DISAGREES.** Quartz (mostly smoky) and fluorite (much of it pink) are 80 % of the area's
photographs. Read first-hand in Koenigsberger (1919): the frequent cleft types in normal Aar granite
are quartz–chlorite–calcite–fluorite (localities I–XX) and quartz–chlorite (I–VII, X–XIV, XXIII), with
apatite and epidote only as bracketed associates; adularia–quartz–titanite–chlorite is the *diorite*
type. The simulator's leaders are apatite (6 per vug, 31 % vis), epidote (5.7) and titanite (4) — the
diorite/amphibolite assemblage — while its fluorite is dust and chlorite has no engine.

**Tormiq — PARTLY.** Titanite and epidote lead both sides; the scenario is close. No peer-reviewed
species list exists; Koenigsberger's type 10 (quartz–epidote–amianth–titanite in epidotized
amphibolite) is the published analogue and matches the simulator's core. Quartz (11 % of the voting
record) is dust in most seeds.

### 5.6 Metasomatic, metamorphic and amygdale scenarios

**Jeffrey Mine — PARTLY, the best multi-species case.** Grossular, vesuvianite and diopside are the
top three on both sides. Grossular is under-weighted (13 % vis against 59 % of photos); awaruite (3 per
vug, 11 % vis) and datolite were not found in the sources read; chlorite and zoisite have no engine.

**Deccan Traps — PARTLY.** "Heulandite and stilbite constitute the major bulk of the zeolites"
(Sukheswala et al. 1974); apophyllite is the most-photographed species and the one most often named
first in a listing (stilbite is named in slightly more listings, 612 families to 599). The simulator's
apophyllite is one crystal (strict gate), its stilbite is dust, and its visible crystals are
chalcedony, heulandite and quartz (78 % of the volume). Pectolite (4 per vug) and goethite are absent
from both systematic studies (Sukheswala et al. 1974; Ottens et al. 2022) — the scenario calls
pectolite "a documented Deccan cavity Ca-Na silicate accessory" without a source, so this is a
disagreement to resolve, not yet a verdict; albite appears in the record as albitized lava, not as a
cavity crystal. Cavansite, okenite, gyrolite, pentagonite and laumontite (26 % of photographs
together) have no engine.

**Bimbowrie (chiastolite_hornfels) — AGREES.** Andalusite (chiastolite) is everything on both sides.
Teale (1979): "The phases plagioclase and paragonite were not detected" — the simulator's albite and
feldspar crystals (none visible) are unsupported; the July review flagged pure albite at 600 °C as an
objection with "real force".

**Ametista do Sul (amethyst_geode) — NO VISIBLE CRYSTALS.** Quartz (amethyst) leads the record, then
chalcedony and calcite ("Calcita e celadonita, minerais comuns e abundantes", Dias et al. 2019). The
simulator's amethyst reaches 0.87 mm at most and its chalcedony 0.16 mm; calcite and celadonite never
form.

**Herkimer (cooling) — NO VISIBLE CRYSTALS.** Quartz is 97 % of the photographs; dolomite rhombs and
anthraxolite accompany almost every pocket. The simulator grows one quartz of 0.57 mm.

**Mogok (marble_contact_metamorphism) — NO VISIBLE CRYSTALS.** The scenario produces nothing, by design
for now (ruby and calcite are aspirational). The record is spinel (36 % of photographs, no engine),
painite, ruby and sapphire.

### 5.7 Sediment-hosted and supergene

**Uravan (colorado_plateau) — DISAGREES, with a proxy caveat.** "The most abundant uranium mineral was
carnotite. The ore also contained a smaller amount of tyuyamunite" (Weeks & Thompson 1954). The
simulator's carnotite is dust (0.81 mm) while tyuyamunite (5 per vug), opal (5) and uranophane (93 % of
the volume) are visible; the same source puts uranophane at "small amounts" and uraniferous opal mainly
on outcrops of non-vanadium ore. The photograph archive (rare vanadates) is the clearest case of
collector bias in the data set; the verdict rests on the literature.

**Marlborough (ultramafic_supergene) — DISAGREES.** Chrysoprase is the product; the profile carries
"magnesite and chalcedony veins with rare chrysoprase" (Eggleton et al. 2011). The simulator's most
numerous visible species is opal (5 per vug, 85 % of the volume) — not documented here; magnesite has
no engine; calcite and dolomite are not documented.

**Asbestos Hills (both scenarios) — DISAGREES.** Tiger's eye and crocidolite are the record (84 % of
photographs are tiger's eye). Read first-hand: "the Cape Belt, yielding crocidolite exclusively, is by
far the largest" (Peacock 1928, p. 243) — amosite is the Transvaal belt's. The simulator grows amosite
×3 — its reason cites a stability field that "permits crocidolite-to-amosite competition", which the
locality record does not show — and opal ×5 (33 % vis, 65 % of the volume), which no source read
records here (Heaney & Fisher 2003 found no chalcedony in South African tiger's eye). Opal's own
reason calls it "subordinate".

---

## 6. Species the simulator cannot make

| locality | species without an engine | its share of the record |
|---|---|---|
| Searles Lake | trona, hanksite (also burkeite, pirssonite, gaylussite, sulfohalite) | 34 and 17 vol % of the Upper Salt |
| Deccan | cavansite, okenite, gyrolite, pentagonite, laumontite | 26 % of photographs together |
| Mogok | spinel, painite | 36 % and 15 % of photographs |
| Grimsel, Jeffrey | chlorite (clinochlore), zoisite | in both frequent Aar-granite cleft types |
| Shigar, Cruzeiro | muscovite, spessartine | common (Laurs et al. 1998; Proctor 1985) |
| Marlborough | magnesite | the carbonate of the profile |
| Ametista, Herkimer | celadonite, anthraxolite | abundant |
| Sunnyside | rhodonite | manganese ore (rhodonite or pyroxmangite, rhodochrosite, quartz) is about half the Washington vein |

The July review listed several of these (siegenite, magnesite, spinel) among its "district-diagnostic
no-shows" with the rule "never edit expects_species to accept the no-show"; they are still open.
Engines that exist but never fire where the record needs them are in §4.1(a).

---

## 7. What the proxies cannot say

- **Photographs follow collector attention, not tonnage.** Rare and type-locality species are
  photographed out of proportion: the Uravan district's 81 photographs are almost all rare vanadates
  (pascoite, hughesite, lasalite…), with one carnotite — the ore mineral. Schneeberg's and Wittichen's
  archives are micromount photography of secondary arsenates. Where this bias decides a verdict, the
  section says so and the literature decides instead.
- **Listings follow what sells.** Lapidary material was removed, but saleable species are still
  over-represented (Bisbee's turquoise nuggets, Sicily's sulfur lots) and common gangue is
  under-represented (dolomite, quartz and calcite matrix are rarely named in a title).
- **Family dedupe merges distinct specimens with generic titles.** Herkimer's 1,314 listings become
  779 families and Sicily's 640 become 141; a dealer's twenty different "Herkimer Diamond 1 inch"
  crystals count once. Shares are affected only where one species dominates the generic titles.
- **Active listings are a stock, not a flow.** Sold history needs an eBay login; with one, the same
  dictionary could re-read sold titles.
- **ebay.com is American.** European localities have few listings (Schneeberg 15, Wittichen 7,
  Grimsel 5), which then do not vote; Mineralienatlas carries them.
- **Locality boundaries.** Five localities sum two Mineralienatlas pages (Elmwood + Gordonsville,
  Weardale + Alston Moor, Sunnyside + American Tunnel, the two Sicilian provinces, Griqualand +
  Prieska); each page includes its sub-localities. Whether any sub-locality appears under both was not
  checked; the pairs are sibling places, not parent and child.
- **The locality is bigger than the scenario.** A scenario models one cavity type; the locality's
  record holds everything mined there. Naica's record includes the whole Pb–Zn–Ag skarn while the
  scenario models the giant-gypsum pool; `tn457_barite_pulses` models one outer-zone cavity of the
  North Pennines; Tsumeb's record includes primary ore while `supergene_oxidation` models the
  oxidation zone. Those sections judge the scenario against the part of the record it claims.
- **"Crystal" includes aggregates.** The simulator counts opal, chalcedony, chrysocolla and the
  Elmwood celestine blanket as crystals, where a collector sees a coating or a crust.
- **"Visible" is a choice, and the verdict does not hang on it.** The headline comparison uses
  crystals ≥ 1 mm. Re-read at the micromount size (≥ 0.1 mm), the four micromount-heavy localities get
  worse, not better: Tsumeb ρ −0.45 → −0.63, Schneeberg −0.36 → −0.42, Wittichen −0.48 → −0.56,
  Roughton Gill −0.08 → −0.10.
- **Count, visible count and volume rank differently in places** — Great Salt Plains (halite 69 % of
  visible crystals, selenite 99.9 % of the volume), Bisbee (malachite 2 % of visible crystals, 43 % of
  the volume), Tri-State (anhydrite 45 % of visible crystals, 0.3 % of the volume). Across the 28 scored
  scenarios volume ranks better than visible count in 10 and worse in 16 (9 and 9 if differences under
  0.05 are ignored), and the median ρ is no better by volume (−0.11).

---

## 8. Proposed fix order (awaits the boss)

Nothing below is implemented. Each step is its own decision, census and commit; the order puts the
measurement first and the changes that move every baseline last.

0. **Land the instruments and the data** (this PR). No simulator file changes; no baseline moves.
1. **Pre-register abundance claims.** A passive, optional scenario field (for example the locality's
   top three species by visible crystals, with the source) read by `tools/locality-abundance-compare.mjs`
   — a target for every later step, not a CI gate. The literature ranks in the data file are the first
   draft.
2. **Fix the documentation drift** (F1b): one sentence in `data/minerals.json`. Not free — the file is
   a hashed release content file (`tools/release-audit.mjs`) and is embedded in the `file://` bundle
   (`tools/file-bundle-assets.mjs`), so it needs a rebuild and a receipt rebake, though no simulation
   output moves.
3. **Engines that never fire where the record needs them (§4.1a) — the largest failure class.** One
   scenario at a time, by its own diagnosis (σ gate, broth, missing event): calcite at Ametista,
   Herkimer, Naica, Viburnum and Tsumeb; fluorite at Cripple Creek and Naica; chalcopyrite and
   dolomite in the MVT scenarios (dolomite needs the boss's call on the July kinetic verdict); dioptase
   at Tsumeb; aquamarine at Shigar; aragonite in Sicily. This continues the July review's
   "district-diagnostic no-shows" and "missing ore-forming events" rungs.
4. **The minor-phase counts (F2), one species family at a time, each with its own lever.** Anhydrite
   (four scenarios, cap 8 and a 16 %-per-step roll once the PHREEQC path admits it); greenockite and
   acanthite through the July lever — lattice partition into the host sulfide and a host-first
   paragenetic gate — rather than a cap; transformation products through their parent or their
   transition (Searles tincalconite is a question about how much borax should dehydrate);
   Bisbee's atacamite, Tsumeb's molybdates, opal at the Asbestos Hills and Marlborough, celestine at
   Naica and Searles, strontianite in Sicily, argentite at Sunnyside through each species' nucleation
   probability or cap. Zero-size nuclei (Sunnyside native silver, Searles mirabilite) are a separate
   housekeeping question — they are invisible and only inflate counts. Elmwood's celestine blanket is a
   boss-ruled habit decision and stays out of this step unless the boss reopens it.
5. **The gate itself (F1b's mechanism).** Replace the 21 strict gates with a σ-dependent per-step
   nucleation probability bounded by `max_nucleation_count` (the air-mode Bernoulli already does this
   for cave calcite). Two commits: a byte-identical refactor that names the idiom, then the change with
   a census of every scenario. **Trap:** lifting the gate alone will swarm calcite and quartz into
   dust — the reason the caps exist — so the probability has to fall with crystal count or local
   depletion, and the fill dampener interacts with it. It also re-moves step 4's retunes, because the
   species compete for the same ions — expect to re-measure step 4 after it.
6. **Dust (F3), per scenario first.** Herkimer quartz and Ametista amethyst decide their scenarios'
   verdicts; Cruzeiro tourmaline is next. Diagnose each scenario's growth window before touching a
   growth rate: quartz grows in 19 scenarios and is visible in several, so a global quartz rate change
   moves them all.
7. **Species debt (§6).** Hanksite and trona first (half of Searles Lake's Upper Salt by volume); then
   the zeolite group (cavansite, okenite, gyrolite), spinel, chlorite, magnesite.

**Two "obvious" fixes that are traps.** (a) *Calibrate to the photograph shares.* The archives
over-weight rarities — Tsumeb's ludlockite has more photographs than its anglesite — so photo shares are
evidence of what collectors find interesting, not targets. Use the literature ranks; use the proxies to
break ties and fill gaps. (b) *Delete the over-produced species.* Most are documented at their locality
(celestine at Elmwood and Naica, greenockite at Picher, atacamite and lepidocrocite at Bisbee); the
record licenses them and only the count is wrong. Removing them would turn a ratio error into a
presence error.

---

## 9. Verification and review history

**Instrument checks.**
- Census vs committed baseline: all 41 seed-42 rows, 351 (scenario, species) entries — 0 mismatches.
- Census completeness: 861 rows, all unique (scenario, seed) pairs, one SIM version, every scenario at
  its authored duration.
- Capture provenance: the listing counts (`cbb9cb8b…`) and the photograph counts (`b56cf638…`) hash
  identically in the browser page and in the data file. The first photograph transcription dropped one
  Schneeberg row (Lotharmeyerite = 1); the hash mismatch caught it and it was restored.
- Classifier unit checks before capture: "Copper Queen Mine" ≠ native copper; "fool's gold" → pyrite;
  "Sulphur Bank" ≠ sulfur; "ruby silver" → proustite; "Ruby Red Sphalerite" ≠ ruby; "Galena Spinel
  Twin" ≠ spinel; "metatorbernite" ≠ torbernite.
- The comparison is deterministic (fixed bootstrap seed); round 1 regenerated the appendix
  byte-identically.

**Literature read first-hand by the author (20 statements in 7 sources, all matched the research
passes).** Smith 1979, USGS PP 1043, p. 59 — Table 14 values; "Trona and halite are the major mineral
components"; "Hanksite is the third most abundant mineral, borax the forth". Smith & Haines 1964, USGS
Bull. 1181-P — p. P1 (Upper Salt composition) and p. P7 (celestite). Lindgren & Ransome 1904, USGS Bull.
254, pp. 20–21 — calaverite and sylvanite; native gold absent except by oxidation; gangue quartz,
fluorite, dolomite; celestite never in large amount; secondary K-feldspar; 1 oz silver to 10 oz gold.
Peacock 1928, Am. Mineral. 13, p. 243 — Cape Belt crocidolite exclusively. Leach et al. 2010, USGS SIR
2010-5070-A — dominant MVT minerals (barite minor to absent, fluorite rare); Zn/(Zn+Pb) < 0.1 in
Southeast Missouri; Viburnum chalcopyrite; barite never reported in Southeast Missouri; calcite common in
Central Tennessee. Harvard *Tsumeb Mineral Notes* — TSNB311 (scorodite, "Very rare") and TSNB324
(smithsonite, "Very common"). Koenigsberger 1919 — the Aar-granite cleft types 1, 1′, 1″ and diorite
type 5. **Confirmed independently by review round 1:** Teale 1979; García-Ruiz et al. 2007; Bastin 1914;
Weeks & Thompson 1954; Sukheswala et al. 1974; Heaney & Fisher 2003; Eggleton et al. 2011; Proust &
Fontaine 2007. One research-pass claim was overturned by the data: Sulphur Bank metacinnabar is
documented (a Mineralienatlas photograph).

**Review round 1 of 5 (one reviewer, adversarial): 6/10.** It confirmed the instruments, the data
totals, the scoreboard and about 60 numbers, and found:
- **The causal story was over-stated.** "The count is set by the gate" ignored that 20 of the 77 real
  top-three slots never form and 15 are dust. §1 and §4.1 now lead with the fate table, and the gate
  claim rests on the conditional test (2/13 vs 10/12 vs 15/17), which the reviewer proposed.
- **Seven species without a `_nuc_` function had defaulted to "cap-only".** They are now classified as
  transformation products (tincalconite, haidingerite, pararealgar, the meta-micas) or shared-selector
  species.
- **F2 counted dust and zero-size nuclei.** It is now tested by visible count (21 of 38 hold) and by
  volume (8 hold); misquotes fixed (the "not promotion" phrase is the Tri-State reason's only; the K(T)
  change is v270, the reasons SIM 271).
- **"Never past 1 mm" was false twice** (Searles halite, Tormiq quartz). The criterion is now the median
  largest crystal, with the any-seed maximum and the share of seeds reaching 1 mm shown; real shares that
  rest on sources too thin to vote were replaced by literature classes.
- **Number and wording fixes:** fleet per-vug values; Tsumeb's visible leaders and volume (54 %); Deccan
  listing counts; Sicily and Sulphur Bank in §1; KGS 6:1; Ametista maximum; Weeks & Thompson's "small
  amounts" is uranophane; Bastin's tin sentence; rhodonite vs manganese ore; one Viburnum listing does
  name anhydrite; the dictionary hash describes its entries, not the file.
- **Method additions:** units stated (§2.4); the Spearman union documented in the tool; a seed bootstrap
  with bands and verdict-flip rates; the AGREES rule now allows a one-species top three (Bimbowrie);
  robustness across measures; caveats on family dedupe, locality pages and aggregates; the July review's
  prior findings (greenockite partitioning, no-shows, dolomite) credited and routed.
- **Fix order:** step 2 is not free; non-firing engines added as their own step; step 4 levers matched to
  mechanism; the gate step warned that it re-moves step 4; growth calibration made per scenario.

---

## 10. Reproduce

```
node tools/assemblage-census.mjs --seeds 1-20,42 --workers 4   # .local-evidence/assemblage-census/runs.jsonl
node tools/locality-abundance-compare.mjs                        # .local-evidence/locality-abundance/compare.{md,json}
```
The census resumes from its own rows (keyed by scenario, seed and SIM version), so a stopped run picks
up where it stopped; its default is one worker, per AGENTS.md. Both instruments are passive: they write
only under `.local-evidence/`. The proxy data (`proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json`) is a
dated capture; refreshing it means re-running the browser capture described in its `sources` block. The
generated appendix (`proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`) is this run's `compare.md`.
