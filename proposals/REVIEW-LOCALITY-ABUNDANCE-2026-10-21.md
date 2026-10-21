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
**Nothing in the simulator was changed.** The deliverable is this document, four read-only
instruments, one data file with its raw capture, and one generated appendix (§10). A proposed fix
order is in §8 and waits for the boss.
**Review history:** §9 — rounds 1–6 scored the drafts 6/10, 7/10, 8/10, 8/10, 8.5/10 and 8.5/10
(the sixth by the boss's leave); all six rounds' corrections are folded in.

---

## 1. Verdict

**The simulator's crystal ratios do not match the rocks.** Of the 33 locality scenarios, none agrees
outright with its locality's photographs and listings: 5 agree in part, 18 disagree, 3 depend on an
arbitrary choice — Viburnum and Cruzeiro on how a tie breaks, Sunnyside on whether crystals the
simulator flags as enclosed count as visible — 3 grow no crystal a collector could see, 3 have too
little proxy data to score, and 1 is out of scope (the North Pennines barite cavity, whose record is
the whole orefield's). The three that depend on a choice are not even splits: resampling the
photographs, listings and seeds, every reading of them is DISAGREES in 59, 90 and 57 % of draws, and
their PARTLY readings sit on knife-edges — Viburnum's ρ is exactly 0, Cruzeiro's 0.004 with its
lead at 1.3 % of the record, Sunnyside's lead at 1.2 % (§3). One of the thin three is Bimbowrie, which the
first drafts scored as the one agreement: its literature and the simulator both make andalusite
everything, but its listing record came from a worldwide "chiastolite" search, which says nothing
about Bimbowrie. The median rank correlation between the simulator's visible crystals and the
locality record is −0.04, and it stays within 0.17 of zero whichever simulator measure is used
(crystals ≥ 0.1 mm −0.04, surviving count −0.11, volume −0.17, counting flagged crystals −0.06). Seed
noise barely moves it (median 5–95 % band 0.02; 178 of the 306 scored (scenario, species) pairs have
the same visible count in all 21 seeds). The proxies' own sampling noise is larger: resampling the
photographs and listing mentions as well widens the median band to 0.18 (0.17 from the proxies
alone), and that is a floor (§7). It moves two verdicts in at least 20 % of resamples, under every
bootstrap seed tried: Ouro Preto, and Cripple Creek, whose DISAGREES rests on three listing mentions
of native silver that the title classifier may have read from "Silver Telluride" (§2.2). The broad
mismatch depends on none of them, nor on the method's other choices (§2.4): counting the species
absent from both sides as agreement, as rounds 1–4 did, gives a median of 0.02 and turns Deccan to
PARTLY; a vote threshold of 10 or 30 observations instead of 20 scores one more scenario or three
fewer; no choice makes any scenario agree.

"Visible" means ≥ 1 mm and not flagged as enclosed. The simulator's enclosure flag is its own
topology projection, not a test that one crystal surrounds another: a stalled crystal is flagged when
a growing neighbour more than three times its size is its substrate or reaches it with its painted
footprint, which for crusts and aggregates spans tens of millimetres (§4.4). It covers one crystal in
ten that reaches 1 mm in these scenarios (1,089 of 11,151). Every verdict is worked out both ways;
counting the flagged crystals changes one verdict (Sunnyside) and six simulator top threes. The flag
also makes counts: a species' cap skips its flagged crystals, so each one frees a slot for another —
Tri-State's barite reaches 55.6 crystals per vug against a cap of 6 (§4.4).

**Why.** Take each locality's three most-recorded species and keep those the simulator has an engine
for. Set aside, with reasons (§4.1): species whose record comes from a part of the deposit the
scenario does not model, whether the simulator grows them or not (Naica's fluorite and calcite, the
mine's rather than the cave pool's; Cripple Creek's native gold, which the record finds only in
oxidized ore while the scenario is the primary telluride vein; the out-of-scope barite cavity's
three); three that tie for a real third place; and one that is under 5 % of the record without a
literature class of common (Herkimer calcite). That leaves 66 slots.

| what the simulator does with them | slots |
|---|---:|
| never forms the species at all | 12 |
| forms it, but in most seeds no unflagged crystal reaches 1 mm (dust) | 16 |
| grows it to 1 mm and more, but flagged as enclosed | 2 |
| forms visible crystals, but too few to rank in its own top three | 9 |
| ties for its own third place, at exactly one crystal per vug | 6 |
| ranks it in its own top three | 21 |

1. **Dust and species that never form are the two largest failures — 16 and 12 of the 66 slots
   (§4.1, §4.3).** None of the 12 never-forming species is one its scenario delivers: 7 are in none of
   the scenario's species lists — never asked for — and 5 are listed as "aspirational": asked for, and
   recorded by the scenario's authors as no-shows ("the documented Shigar showpiece", "the documented
   Mogok target"; the commissioned seeds grow none). Calcite fills a counted top-three slot at 5
   localities and never forms at 3 of them (Ametista, Viburnum, Tsumeb); fluorite never forms at Cripple
   Creek, aragonite in Sicily, aquamarine at Shigar. The 7 unlisted ones are first a contract question
   for the boss — should the scenario claim the species? — and the 5 aspirational ones are known engine
   failures; both overlap the July review's "district-diagnostic no-shows", still open.
2. **Where a gated species does form, the gate decides its rank by count — not by volume (§4.1).**
   Twenty-four species may only nucleate while no active crystal of their own exists (22 of them form
   somewhere in the panel), among them calcite, fluorite, sphalerite, pyrite, chalcopyrite, dolomite,
   malachite and smithsonite. When one of a locality's headline species forms visible crystals, it
   reaches the simulator's top three by visible count **0 times in 11 if strictly gated** (5 more tie
   for third place, all at exactly one crystal per vug), **against 21 in 25 under every other gate.**
   By volume the gap narrows to 6 in 11 against 18 in 25: the gate limits how many crystals a species
   has, not how large they grow. Strictly gated species hold 36 % of the real top-three slots and 8 %
   of the simulator's by visible count.
3. **Minor phases out-number headline phases (§4.2).** In 36 cases a scenario's own written reason
   calls a species *trace*, *minor*, *subordinate*, *accessory* or *rare* while its surviving
   crystals out-number the scenario's typical headline species. In 20 of them it also out-numbers them
   in *visible* crystals, and in 7 it out-weighs them in volume (6 both ways). The largest: anhydrite at
   Tri-State ("a trace Ca-sulfate accessory", 6.3 visible crystals per vug against 1.0 for the headline
   median — 45 % of the visible crystals, with no photograph, listing or published record at Picher).
   Eight of the 36 nucleate past their own species cap through the slots flagged crystals free — Bisbee's
   native gold and atacamite and Searles' celestine among them (§4.4).
4. **Headline species are grown only as dust (§4.3)** — 24 cases, including Herkimer quartz (median
   largest 0.57 mm), Ametista amethyst (0.84 mm), Cruzeiro tourmaline (0.37 mm; 83 % of the voting
   record), Bisbee azurite and native copper — and 3 more whose crystals do reach 2–3 mm but are flagged
   as enclosed by the over-produced molybdate crusts (Tsumeb's smithsonite and azurite, Bingham's
   pyrite). At micromount size the two quartz scenarios with no visible crystal rank well (ρ 0.78
   Ametista, 0.58 Herkimer, counting crystals ≥ 0.1 mm): the right species, too small.

A fifth cause is **species debt (§6)**: trona and hanksite are 34 and 17 vol % of Searles Lake's
Upper Salt (USGS PP 1043, Table 14) and have no engine; nor do spinel, chlorite, magnesite,
cavansite, okenite or gyrolite.

**What holds.** Jeffrey Mine's top three (grossular, vesuvianite, diopside) are the same set in the
simulator and the record. At Bimbowrie the simulator grows only andalusite, as its literature says.
Ouro Preto's topaz and Roughton Gill's pyromorphite lead on both sides; Tormiq's titanite and
epidote and Sicily's sulfur and celestine are in both top threes (in a different order). Elmwood
grows the right three headline species — celestine simply outnumbers them. At the Great Salt Plains
selenite holds 99.9 % of the crystal volume, as it should; it also leads the visible crystals, but
only because the enclosure flag hides 61 % of the halite ≥ 1 mm under the selenite's footprints —
counting those, halite leads the count as well (halite crusts).

---

## 2. Method

### 2.1 The simulator's side — `tools/assemblage-census.mjs`
Every scenario ran for its authored duration on 21 seeds (1–20 and 42): 861 runs (41 × 21), none
failed. The panel ran twice — the second time to add the unflagged counts below — and every field the
two runs share is identical in all 861 runs (7,346 species entries): the simulator is deterministic
per seed. At the end of each run the census records, per species, the crystals that still exist
(dissolved ones are dropped; crystals the simulator flags as enclosed are kept — they are still in
the specimen), how many of them are ≥ 0.1, 1, 5 and 10 mm in their longest dimension, their summed
volume and the largest one, and the same counts for the crystals that are *not* flagged as enclosed.

The flag (`enclosed_by`, set by `_check_enclosure`, `js/85c-simulator-state.ts:2433`) is, in the
code's own words, "a convenient rendering/topology projection" (`js/21-enclosure-authority.ts:4`),
not a test that one crystal surrounds another. A stalled crystal (under 3 µm of growth over its last
three zones) is flagged when a crystal more than three times its size, growing that step, is its
substrate or reaches it with its painted footprint: the two anchors lie within half the host's
footprint arc plus half the guest's plus one cell, where an arc is four times the crystal's size times
its wall spread (`js/85c-simulator-state.ts:2534–2552`, `js/22-geometry-wall.ts:3015`) — tens of
millimetres for a crust (§4.4). A flagged crystal stops growing, and its species' cap no longer counts
it (§4.4). "Visible" below means ≥ 1 mm and not
flagged — the simulator's own view — and every verdict is also worked out with the flagged crystals
counted; where the two readings disagree, the verdict is reported as **MEASURE-DEPENDENT**. (Review
round 3 asked for the flagged crystals to be left out as hidden; round 4 showed the flag is a
projection; this review reports both.) All 41 seed-42 rows reproduce the committed baseline
(`tests-js/baselines/seed42_v285.json`) exactly — surviving, dissolved and total counts for 351
(scenario, species) entries (checked by review round 1; the author checked four scenarios before the
full panel ran).

One seed cannot carry a ratio: most species fire zero to six times in a run, and the seed-42
baseline is one draw. The repository already records which species each scenario delivers over seeds
1, 2 and 42 — `tools/locality-frequency-contract.mjs`, baseline
`tests-js/baselines/locality_frequency_v285.json` — and sets each scenario's expects /
deterministic / statistical / aspirational tiers from it. That is presence over three seeds; this
census adds counts and sizes over 21.

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
  and carvings are excluded. 72 searches, 15,190 listings, 9,822 families — of which three county-
  or district-level market references (Cumbria, Skardu, Haramosh: 2,213 listings, 1,659 families)
  feed no scenario. One locality's searches are not locality-specific: Bimbowrie's include
  "chiastolite", which finds chiastolite from anywhere, so its listings are shown but do not vote
  (§5.6).

Both captures were hashed in the browser page and again on disk, and the hashes agreed. The two
compact captures themselves are now committed, with their hash recipes
(`proposals/DATA-LOCALITY-ABUNDANCE-CAPTURE-2026-10-21.json`); the comparison tool recomputes both
hashes (`b56cf638…` photographs, `cbb9cb8b…` listings) and checks every count in the data file
against the captures before it compares anything. (Round 3 could not reproduce the hashes from the
data file alone, because the captures had not been committed.) The dictionary's 363 entries hash
identically in the page and in the file (`5d355644…`, the hash of
`JSON.stringify(MARKET_TITLE_DICTIONARY)`); the lapidary pattern was injected from the file, and the
title-cleaning and family functions were re-typed identically in the page (not hash-checked). The
titles themselves were classified inside the page and not saved, so the classifier cannot be
audited on the real titles. Round 3 found three unguarded routes on synthetic titles — "copper"
before an unlisted word ("Chrysocolla Copper Bisbee" → native copper), the town of Trona at the end
of a title, and "Ruby Spinel" counting as both — which could move two close margins (Bisbee native
copper against cuprite, 12.1 against 10.0 % of the combined record; Searles trona against
sulfohalite, 7.4 against 6.5 %) and no fate count. Round 5 found two more families of route in the
dictionary itself. Telluride names: "Hessite Silver Telluride" also counts native silver, "Calaverite
Gold Telluride" native gold, "Sylvanite Gold Silver Telluride" both. Colour words are guarded only for
"ruby red" and "emerald green", so "Amethyst Purple Fluorite" counts quartz, "Sapphire Blue Celestine"
sapphire, "Turquoise Blue Smithsonite" turquoise and "Silver Galena" native silver. Round 6 added a
place name: there is no guard for Galena, Kansas, a Tri-State mining town. The telluride route may
matter at one place: Cripple Creek's native silver is 0.9 % of its record — three listing mentions,
none of them the first species a title names — and its fragile DISAGREES rests on that share (§3).
The titles were not saved, so none of these routes can be measured. The appendix's "lead species
only" line, which counts each listing only for the species its title names first (the data file
records these counts), is a bound, not a test of the routes: it drops every species named after the
first, legitimate associates as well as misread ones. It moves the median ρ to −0.15 and turns Cruzeiro
and Sunnyside into plain DISAGREES — through their associates, not through any route (Cruzeiro's
albite is named in 4 listing families and first in none; Sunnyside's galena in 5, first in 1) — and
takes Cripple Creek's native silver to 0 %, which fits the telluride route without proving it (§2.4).

### 2.3 The literature
Three research passes (one per locality family) collected published abundance statements —
paragenetic tables, "abundant / common / rare" wording, production figures, volume percentages —
for every locality: 63 sources, 278 species classifications, stored in the data file's
`literature` blocks with a status per claim (V = source opened and wording seen; S = search snippet
or low-reliability page; R = recalled). 33 of the 278 classes are not V — 30 S and 3 R (12 %). 7 of
the S classes are Tsumeb's Harvard specimen-availability ratings; sixteen Tsumeb ratings were opened
(smithsonite, scorodite, azurite and dioptase by the author; pyromorphite, descloizite and cerussite
by review round 4; malachite, duftite, calcite, anglesite and powellite by review round 5; jarosite,
mimetite, wulfenite and ferrimolybdite's missing entry by review round 6), and §5.2 marks the rest.
Round 5 also found two inferences from absence — the Handbook of Mineralogy's locality lists omit
Cripple Creek for hessite and Bisbee for dioptase, which the research pass had read as "rare"; both
are now "ND?" (absent from a few sources only) — and a "common" that rested on one cave specimen
(Picher chalcopyrite in Ransome 1935), now "documented"; round 6 found Shigar albite's "abundant"
unsupported by both its sources (now "common", Hu & Lu 2018). The author then read 20
load-bearing statements in 7 sources first-hand, and review round 1 checked 8 more citations; all
matched (§9). Round 2 found
four research-pass notes that over-reached, now corrected in the data file: Phillips et al. 2005
(Bingham) and Laurs et al. 1998 Table 1 (Shigar) were not read first-hand by anyone after the
research pass; Ross's (1940) "most abundant metallic mineral" covers two districts together; and
Guzman et al. 2024 call tetrahedrite, a common silver carrier, locally abundant at Sunnyside.

### 2.4 The comparison — `tools/locality-abundance-compare.mjs`
**Units.** The two sides do not count the same thing: the simulator counts crystals in one cavity;
a photograph or a listing is one specimen, which may hold many crystals of one species. The boss
asked "how many of what type of crystals", so the simulator side is counted in crystals, and the
comparison is of **ranks** only — which species are most common — never of values. Crystal count,
visible count and volume are all reported, because they rank differently in places (Great Salt
Plains, Bisbee, Tri-State — §7).

**Ranking.** For each scenario, the simulator's share of visible crystals per species beside the
locality's share of photographs and of listings, and the literature class. The real ranking is the
mean of the two shares; a source with fewer than 20 observations does not vote, and nor do listings
from a search that is not locality-specific (Bimbowrie's "chiastolite"). Spearman ρ is
computed over the union of the simulator's top 12 by visible share, its top 12 by surviving share,
the photographs' top 12, the listings' top 8 and every species the literature calls abundant or
common; a species absent from one side scores 0 there. With that zero padding ρ behaves largely as
a set-overlap statistic. A species absent from *both* sides is left out: it says nothing about the
ratios, and which such species reach the union depends on the routes above (the simulator's dust,
the literature's list, a source that does not vote). Rounds 1–4 counted them — 32 of the 468 rows in
the scored scenarios — as ties at the bottom of both rankings, which added agreement (review round 5;
the sensitivity below gives that reading).

**Top three and ties.** Each side's top three is chosen by value alone. Strictly gated species often
sit at exactly one crystal per vug in every seed, so ties across third place are common; all the tied
species are shown, and the verdict is worked out under every way the ties can break (and under every
species tied for the simulator's lead). When those disagree, the verdict is **TIE-DEPENDENT**. The
first two drafts broke such ties by the real-world share — a leak in the simulator's favour, found by
review round 2.

**Verdicts.** **AGREES**: ρ ≥ 0.5 and at least min(2, size of the simulator's top three) of the real
top three are in it. **DISAGREES**: ρ < 0, or the simulator's most numerous visible species is < 1 %
of the real record. **PARTLY** otherwise. **THIN** when no source votes. **NO VISIBLE CRYSTALS** when
nothing reaches 1 mm. **TIE-DEPENDENT** as above; **MEASURE-DEPENDENT** when the verdict changes with
whether flagged crystals count as visible (§2.1). **OUT OF SCOPE** when the locality's record does
not sample the part of the deposit the scenario models (one scenario, §5.1).

**Scope and contracts.** A species is set aside — from the fate table in §4.1, the dust list and the
scoreboard's "lit: missing" column — when its sources say it is absent, at most extremely rare, or
present only in another form in the part of the deposit the scenario models, by the scenario's own
description. It is a presence test, not a provenance test: a species that does occur there counts even
when its specimens were collected elsewhere in the deposit — Naica's selenite, the sealed Cave of
Crystals' own mineral, whose specimens come from the mine and the Cave of Swords, and Tsumeb's calcite,
"somewhat less common in the upper levels" (TSNB66), not absent. The rule is applied to every species,
whether the simulator grows it or not, and each set-aside is listed with its reason. The verdicts
compare each scenario with its locality's whole record (§7); removing the set-aside species from the
records changes no verdict (below). Separately, every slot carries its *contract status*: whether the
scenario's own species lists (expects, deterministic, statistical, aspirational) name the species. A
slot also needs 5 % of the voting record or a literature class of abundant or common.

**Noise.** Each ρ gets three 5–95 % bootstrap bands of 200 resamples: over the 21 seeds; over the
proxies, resampling the photographs and listing mentions as multinomial draws; and over both. The
share of resamples whose verdict differs is reported for each. For a TIE- or MEASURE-DEPENDENT verdict
a resample counts as unchanged when its outcomes stay within the verdict's two options, so the rate
can register only a move to a third verdict (AGREES needs ρ ≥ 0.5) and is near zero for those three
scenarios by construction. For them the appendix prints instead how the joint resamples fall between
the two readings and how close each reading sits to its line — ρ = 0 for DISAGREES, a lead at 1 % of
the record (§3). The full per-species tables for all 33 scenarios are in
`proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`.

**Sensitivity.** The appendix re-runs the comparison with one choice changed at a time. Counting the
species absent from both sides, as rounds 1–4 did: median ρ 0.02, and Deccan PARTLY. A source votes
with 10 observations instead of 20: the Great Salt Plains (13 listings) is scored, MEASURE-DEPENDENT
(DISAGREES or PARTLY) — on the lead rule alone, since with two species on its table ρ is undefined.
With 30: both Asbestos Hills scenarios (25 photographs, 29 listings) and Marlborough (25 listings)
become THIN. Lead species only, each listing counted only for the species its title names first — a
bound that also strips legitimate associates (§2.2): median −0.15; Cruzeiro and Sunnyside become
DISAGREES, through their associates. The set-aside species removed from their scenarios' records:
median −0.05, no verdict changes. No choice makes any scenario agree.

---

## 3. Scoreboard

"Lit: rare" lists the simulator's top-three visible species that the literature rates rare, very
rare or undocumented ((S) = the class rests on snippet-level evidence; (ND?) = absent from a few
sources only, the weakest form); "lit: missing" lists species
the literature calls abundant that the simulator never shows as a visible crystal (≥ 1 mm and not
flagged — Tsumeb's smithsonite and azurite do reach 2.7 and 3.1 mm, but flagged). `x:` = no engine; `ma:` = a
Mineralienatlas name with no engine and no dictionary entry.

| scenario | verdict | ρ | band: seeds | band: seeds + proxies | real top 3 | sim top 3 (≥ 1 mm, not flagged) | lit: rare | lit: missing |
|---|---|---:|---|---|---|---|---|---|
| schneeberg | DISAGREES | −0.58 | −0.61 to −0.55 | −0.67 to −0.52 | erythrite, x:pucherite, one of {ma:eulytine, native silver} (tied) | chrysocolla, quartz, uranophane |  | skutterudite, native bismuth |
| wittichen | DISAGREES | −0.57 | −0.57 to −0.57 | −0.65 to −0.55 | erythrite, zeunerite, ma:heinrichite | haidingerite, chalcedony, nickeline | haidingerite (S), chalcedony | native silver, safflorite, skutterudite |
| supergene_oxidation (Tsumeb) | DISAGREES | −0.54 | −0.55 to −0.49 | −0.59 to −0.50 | smithsonite, cerussite, calcite | ferrimolybdite, brochantite, one of {scorodite, pyromorphite} (tied) | ferrimolybdite, scorodite, pyromorphite | smithsonite, calcite, azurite |
| ultramafic_supergene (Marlborough) | DISAGREES | −0.50 | −0.50 to −0.50 | −0.50 to −0.50 | chrysoprase, chalcedony | opal, chrysoprase | opal | chalcedony, x:magnesite |
| porphyry (Bingham) | DISAGREES | −0.49 | −0.50 to −0.49 | −0.61 to −0.34 | pyrite, tetrahedrite, ma:faustite | ferrimolybdite, brochantite, galena | ferrimolybdite (S) | quartz, bornite |
| colorado_plateau (Uravan) | DISAGREES | −0.43 | −0.43 to −0.41 | −0.69 to −0.30 | x:pascoite, ma:hughesite, one of {ma:dickthomssenite, ma:lasalite, ma:magnesiopascoite} (tied) | opal, tyuyamunite, uranophane | opal, uranophane | carnotite |
| bisbee | DISAGREES | −0.39 | −0.46 to −0.39 | −0.51 to −0.37 | malachite, azurite, native copper | chrysocolla, opal, one of {chalcedony, atacamite} (tied) |  |  |
| reactivated_fluorite_vein | DISAGREES | −0.36 | −0.36 to −0.36 | −0.47 to −0.29 | fluorite, galena, quartz | barite, celestine, acanthite | celestine, acanthite | quartz |
| mvt (Tri-State) | DISAGREES | −0.35 | −0.41 to −0.35 | −0.38 to −0.26 | galena, sphalerite, calcite | anhydrite, greenockite, one of {galena, calcite, fluorite} (tied) | anhydrite, greenockite, fluorite | dolomite |
| searles_lake | DISAGREES | −0.32 | −0.61 to −0.32 | −0.61 to −0.24 | halite, x:hanksite, x:trona | tincalconite, thenardite, halite | tincalconite | x:hanksite, x:trona |
| grimsel_alpine_cleft | DISAGREES | −0.15 | −0.18 to −0.15 | −0.44 to −0.04 | quartz, fluorite, one of {epidote, rutile} (tied) | apatite, quartz, titanite | titanite | x:chlorite |
| naica_geothermal | DISAGREES | −0.10 | −0.10 to −0.10 | −0.11 to −0.09 | fluorite, selenite, calcite | celestine, selenite |  |  |
| asbestos_hills_crack_seal | DISAGREES | −0.04 | −0.04 to −0.04 | −0.31 to 0.19 | tiger's eye, crocidolite, x:jasper | opal, crocidolite, tiger's eye | opal | quartz, magnetite |
| asbestos_hills_surficial_alteration | DISAGREES | −0.04 | −0.12 to −0.02 | −0.29 to 0.15 | tiger's eye, crocidolite, x:jasper | opal, crocidolite, tiger's eye | opal | quartz, magnetite |
| deccan_zeolite | DISAGREES | −0.03 | −0.05 to 0.00 | −0.07 to 0.01 | apophyllite, stilbite, heulandite | chalcedony, heulandite, quartz |  | stilbite |
| roughten_gill | DISAGREES | −0.02 | −0.03 to 0.01 | −0.29 to 0.01 | pyromorphite, mimetite, quartz | pyromorphite, chrysocolla, galena |  | quartz |
| tn457_barite_pulses (N. Pennines) | OUT OF SCOPE (DISAGREES on its own measures) | −0.02 | −0.02 to −0.02 | −0.24 to 0.14 | fluorite, galena, quartz | barite, sphalerite |  |  |
| reactive_wall (Viburnum) | TIE-DEPENDENT (DISAGREES or PARTLY) | 0.00 | 0.00 to 0.00 | −0.17 to 0.07 | calcite, galena, chalcopyrite | galena, sphalerite, pyrite |  | dolomite |
| gem_pegmatite (Cruzeiro) | TIE-DEPENDENT (DISAGREES or PARTLY) | 0.00 | −0.02 to 0.08 | −0.45 to 0.13 | tourmaline, quartz, lepidolite | albite, feldspar, quartz |  | tourmaline |
| sunnyside_american_tunnel | MEASURE-DEPENDENT (DISAGREES or PARTLY) | 0.03 | −0.08 to 0.05 | −0.12 to 0.17 | rhodochrosite, fluorite, quartz | galena, quartz, one of {rhodochrosite, calcite} (tied) |  | sphalerite, x:rhodonite |
| ouro_preto | PARTLY | 0.03 | 0.03 to 0.03 | −0.27 to 0.08 | topaz, hematite, x:euclase | topaz, quartz, feldspar | feldspar |  |
| epithermal_telluride (Cripple Creek) | DISAGREES | 0.05 | 0.05 to 0.07 | −0.05 to 0.11 | calaverite, native gold, fluorite | native silver, native gold, hessite | native silver, hessite (ND?) | fluorite, dolomite |
| jeffrey_mine | PARTLY | 0.20 | 0.16 to 0.25 | 0.08 to 0.26 | grossular, vesuvianite, diopside | vesuvianite, diopside, grossular |  |  |
| elmwood | DISAGREES | 0.25 | 0.25 to 0.25 | 0.22 to 0.30 | fluorite, calcite, sphalerite | celestine, two of {fluorite, calcite, sphalerite} (tied) |  |  |
| shigar_pegmatite | PARTLY | 0.34 | 0.34 to 0.34 | 0.24 to 0.42 | aquamarine, topaz, quartz | tourmaline, quartz, one of {albite, feldspar} (tied) |  | aquamarine |
| tormiq_alpine_cleft | PARTLY | 0.35 | 0.31 to 0.35 | 0.10 to 0.44 | titanite, epidote, quartz | epidote, actinolite, titanite |  |  |
| sicily_solfifera | PARTLY | 0.36 | 0.36 to 0.36 | 0.35 to 0.43 | native sulfur, aragonite, celestine | celestine, native sulfur, strontianite | strontianite (S) | selenite |
| amethyst_geode | NO VISIBLE CRYSTALS | — | | | quartz, chalcedony, calcite | — | | quartz, chalcedony, x:celadonite |
| cooling (Herkimer) | NO VISIBLE CRYSTALS | — | | | quartz, x:bitumen, calcite | — | | quartz, x:bitumen, dolomite |
| marble_contact_metamorphism (Mogok) | NO VISIBLE CRYSTALS | — | | | x:spinel, ruby, x:painite | — | | calcite (the host marble) |
| chiastolite_hornfels (Bimbowrie) | THIN (literature: andalusite, as the simulator grows) | — | | | (3 photos; listings from a market-wide "chiastolite" search, not voting) | andalusite | | |
| great_salt_plains | THIN (literature: selenite is the collectible) | — | | | (13 listing families, all selenite) | selenite, halite | | |
| sulphur_bank | THIN (literature: cinnabar leads, in a two-district sentence) | — | | | (2 photos, 1 listing) | cinnabar, pararealgar, orpiment | pararealgar (ND?, S), orpiment (ND?, S) | opal |

Bands are 5–95 % of 200 resamples. Ten of the 26 scored scenarios sit within ±0.11 of the ρ = 0 line
between DISAGREES and PARTLY, so individual verdicts near the line carry little weight. The aggregate
does not depend on them: median ρ is −0.04 by visible count, −0.04 by crystals ≥ 0.1 mm, −0.11 by
surviving count, −0.17 by volume, −0.08 by the share of seeds with a visible crystal and −0.06 when
the crystals the simulator flags as enclosed are counted as visible. Proxy noise changes two verdicts
in at least 20 % of the joint resamples: Ouro Preto (66 %) and Cripple Creek (36 % — its DISAGREES
rests on native silver being 0.9 % of the record, against the 1 % threshold, and that 0.9 % is three
listing mentions the title classifier may have read from "Silver Telluride", §2.2); rerun under three
other bootstrap seeds they stay above 20 % (57–66 % and 33–37 %), and Deccan reaches 16 % once.
Viburnum and Cruzeiro are TIE-DEPENDENT and Sunnyside is MEASURE-DEPENDENT (PARTLY with flagged
crystals left out, DISAGREES with them counted — §4.4). The flip rate cannot register a move between
their two readings (§2.4), so the appendix counts them: in the joint resamples every reading is
DISAGREES in 58.5 % for Viburnum, 90.0 % for Cruzeiro and 57.0 % for Sunnyside, and every reading
PARTLY in 0, 6.5 and 18.5 %. Their PARTLY readings sit on knife-edges: Viburnum's ρ is exactly 0.0000
(DISAGREES needs ρ < 0); Cruzeiro's is 0.0039, and its PARTLY lead, albite, is 1.31 % of the record
(4 listing mentions, none first-named; no photograph); Sunnyside's PARTLY lead, galena, is 1.16 % of
the record (5 of 217 listing mentions; no photograph) — the same 1 % line as Cripple Creek's. Searles'
halite is in its simulator top three on the crystals of the 2 seeds of 21 where it reaches 1 mm; §4.1
counts it as dust. The North Pennines barite cavity is OUT OF SCOPE: its record is the whole
orefield's — the Weardale and Alston Moor pages and searches, led by the central zone's fluorite — and
no page or search targets the outer zone the scenario models (§5.1); on its own measures it would be
DISAGREES.

---

## 4. Fleet-wide findings

### 4.1 F1 — Engines that never fire, and the gate that ranks the ones that do

**The gates.** Each species' gate is read from the code that nucleates it — the lines that test the
species' own list of *active* (still growing) crystals — and the appendix prints that line,
with file and line number, for every species:

- **strict** — a new crystal only while none of the species is active: `!existing.length` inside the
  σ gate, calcite's and aragonite's water-mode `gateClear`, goethite's `ordinaryBirthAllowed`, or
  `if (existing.length) return`;
- **soft** — the first crystal is free; another needs σ above a second bar (1.4–2.5, or σ_crit + 0.5
  or + 0.7) and a 15–30 % roll; most soft functions also cap the active crystals at 2–5;
- **active-capped** — up to 2–5 active crystals at once, with no second bar;
- **cap-only** — no test on active crystals: a 10–45 % roll per step and `max_nucleation_count`.

**What happens to each real top-three species**, by the gate of its engine:

| gate | never forms | dust | flagged as enclosed | visible, outside the sim top three | tied for the sim's third place | in the sim top three | total |
|---|---:|---:|---:|---:|---:|---:|---:|
| strict | 7 | 4 | 2 | 6 | 5 | 0 | 24 |
| soft | 4 | 11 | 0 | 2 | 1 | 18 | 36 |
| cap-only | 1 | 1 | 0 | 1 | 0 | 3 | 6 |
| all | 12 | 16 | 2 | 9 | 6 | 21 | 66 |

A slot whose median largest unflagged crystal is under 1 mm is dust (or flagged) before its rank is
read: Searles halite ranks in the simulator's top three on the 2 seeds of 21 where it reaches 1 mm,
and the drafts before round 5 counted it there. No active-capped species is in a real top three. Set
aside, and listed in the appendix:
- **out of the scenario's scope** — species whose record comes from a part of the deposit the
  scenario does not model, applied to successes and failures alike: Naica's fluorite and calcite (the
  scenario is the cave pool, where calcite is a wall crust; the record's fluorite and calcite crystals
  are the mine's, §5.4), Cripple Creek's native gold (the record finds it only in oxidized ore — "set
  free by the oxidation of these tellurides", Lindgren & Ransome 1904 — while the scenario is the
  primary telluride vein, §5.3; the simulator ranks it second), and the whole North Pennines barite
  cavity, whose record is the orefield's (§5.1). Tsumeb's dioptase, not a top-three species, is set
  aside from the other lists on the same ground: the scenario is the first oxidation zone, where the
  *Tsumeb Mineral Notes* find it "extremely rare (or possibly even absent)" (TSNB107, §5.2). Two
  species stay in by the same rule, because their sources place them in the modeled part: Naica's
  selenite, the sealed Cave of Crystals' own mineral, though its specimens come from the mine and the
  Cave of Swords, and Tsumeb's calcite, "somewhat less common in the upper levels" (TSNB66), not
  absent. Set aside on provenance instead, they would leave 64 slots (never forms 11, in the top three
  20; every gate but strict 20 in 24);
- **ties on the real side** — Grimsel's third place (epidote or rutile) and Schneeberg's (eulytine,
  which has no engine, or native silver);
- **under the floor** — Herkimer calcite, 0.9 % of a record that is 94 % quartz, whose literature
  gives no abundance word.

Bimbowrie contributes no slot, because its listing record is not locality-specific (§5.6). The two
"flagged" slots are crystals of 2–3 mm that the enclosure flag hides: Tsumeb's smithsonite and
Bingham's pyrite, both flagged by the powdery ferrimolybdite crust (§4.4); counting flagged crystals,
both become "visible, outside the sim top three".

**Contract status.** Every slot that forms is in its scenario's species lists (all 21 top-three slots
and all 16 dust slots, as expects or deterministic). Every slot that never forms is not:

| fate | expects | deterministic | aspirational | not listed |
|---|---:|---:|---:|---:|
| never forms | 0 | 0 | 5 | 7 |
| dust | 13 | 3 | 0 | 0 |
| flagged as enclosed | 2 | 0 | 0 | 0 |
| visible, outside the sim top three | 9 | 0 | 0 | 0 |
| tied for the sim's third place | 6 | 0 | 0 | 0 |
| in the sim top three | 19 | 2 | 0 | 0 |

Two separate mechanisms are at work.

**(a) Species the record needs that the scenarios do not deliver — 12 of 66, second to the dust
slots (16).** Not in any of the scenario's species lists — never asked for (7): calcite at Ametista and
Tsumeb; chalcopyrite at Viburnum; quartz in the reactivated fluorite vein; aragonite in Sicily;
zeunerite at Wittichen; chalcedony at Marlborough. Listed as aspirational — asked for, and recorded by
the scenario's authors as no-shows, with reasons saying the commissioned seeds grow none (5): calcite
at Viburnum (the scenario "does not claim discrete free-grown crystals"), fluorite at Cripple Creek,
aquamarine at Shigar ("the documented Shigar showpiece"), hematite at Ouro Preto, ruby at Mogok ("the
documented Mogok target"). So none is a hidden engine failure: seven are species the scenarios'
authors left out and the locality record says belong — first a contract question for the boss (should
the scenario claim the species?) — and five are engine failures the authors already know about. Each
then becomes a σ-gate, broth or event question, one scenario at a time — they overlap the July
review's "district-diagnostic no-shows" and "missing ore-forming events"
(`PROPOSAL-HOSTILE-REVIEW-2026-07-14.md`, cross-cutting mechanisms table), which are still open.

**(b) Where a gated species does form, the gate sets its count — and so its rank by count.**
Twenty-four species carry the strict gate: calcite, aragonite, dolomite, siderite, rhodochrosite,
malachite, smithsonite, fluorite, sphalerite, wurtzite, pyrite, marcasite, chalcopyrite,
tetrahedrite, tennantite, enargite, goethite, hematite, apophyllite, wulfenite, adamite, mimetite,
erythrite and annabergite. Twenty-two of them survive somewhere in the panel (wurtzite and enargite
never do). The calcite gate is commented as exactly what it is — "Water-mode (default): legacy
serial gate — one active calcite at a time per scenario, matching every scenario's existing
baseline" (`js/82-nucleation-carbonate.ts:36`). Across the fleet, in vugs where they survive:

| gate | species | median crystals per vug | median unflagged ≥ 1 mm per vug |
|---|---:|---:|---:|
| strict | 22 | 1.17 | 0.49 |
| soft | 55 | 3.10 | 1.41 |
| active-capped | 10 | 2.71 | 1.90 |
| cap-only | 46 | 3.89 | 1.13 |
| transformation product (inherits its parent's count) | 5 | 4.57 | 4.57 |

Strictly gated species sit at ≤ 1.25 crystals per vug in 76 of the 99 (species, scenario) pairs
where they survive. Calcite's higher fleet mean (3.3) comes from enclosure turnover in two scenarios
(sabkha, Searles) and from the cave scenarios' 6 %-per-step Bernoulli replacement of the gate
(`_AIR_MODE_NUCLEATION_PROB`). The conditional test asks how often a real headline species that
forms visible crystals reaches the simulator's top three:

| gate | by visible count | counting ties for third place | by volume |
|---|---:|---:|---:|
| strict | 0 / 11 | 5 / 11 | 6 / 11 |
| soft | 18 / 21 | 19 / 21 | 14 / 21 |
| cap-only | 3 / 4 | 3 / 4 | 4 / 4 |
| every gate but strict | 21 / 25 | 22 / 25 | 18 / 25 |

The gate decides the rank by count and much less the rank by volume: a single strictly gated crystal
can still be the largest in the cavity (Tri-State's one calcite holds 94 % of the crystal volume). By
visible count, strictly gated species hold 24 of the 66 real top-three slots (36 %) and 6.7 of the
simulator's 84 (8 %; tied species share their slots); by volume they hold 21 of its 90 (23 %).

Three further notes. Enclosure feeds raw counts: the cap counts only crystals that are neither
dissolved nor flagged as enclosed (`js/85b-simulator-nucleate.ts:716`), so a species whose crystals
get flagged keeps nucleating — barite averages 15.9 crystals per vug where it survives and 55.6 per
Tri-State vug against a cap of 6, all dust and 50.8 of them flagged. The code says this is deliberate
(`js/85b-simulator-nucleate.ts:654–664`: inclusion trails — "Real specimens can carry hundreds of
inclusions"); §4.4 counts where it acts and how far the flag reaches, and the flagged crystals are left
out of the visible count, with the alternative reported (§2.1).
Second, species without their own `_nuc_` function are read where they are made: the beryl and
corundum varieties in their shared selector loops (soft — `js/89-nucleation-silicate.ts:221, 266`),
raspite in `_nuc_stolzite` (cap-only), the manganese-oxide surface phases in a shared helper (soft).
Seven species are pure transformation products, whose counts are their parents': tincalconite from
borax, haidingerite from pharmacolite, pararealgar from realgar and three meta-micas
(`js/75-transitions.ts:95–100, 474`), and todorokite, whose `_nuc_todorokite` never calls
`sim.nucleate` but converts birnessite in place (`js/75-transitions.ts:379`). Acanthite, thenardite,
selenite and anhydrite are both: they nucleate on their own and also form in place (from argentite,
mirabilite, and each other — the CaSO₄ replacement at `js/75-transitions.ts:262`). Third, beside
the gate, 16 functions carry a hand-coded **lifetime cap** — a count of every crystal of the species
ever made, dissolved and enclosed ones included (`total_mal >= 3`, …). It sits on 7 of the 24 strict
species (malachite, smithsonite, mimetite, hematite and goethite 3, adamite 4, wulfenite 2) and 10
soft ones (galena 8, feldspar and molybdenite 6, plumbogummite, pyrolusite and uraninite 5, albite,
selenite and the two manganese-oxide phases 4); the appendix's fleet table lists them.

**The first two drafts read the gates wrongly** (review round 2). Their pattern matched the strict and
soft idioms only when the species' crystal list had a suffixed name (`existing_cal`), so the 32 soft
gates written with a plain `existing` — 24 of them on species that form in the panel: epidote,
titanite, grossular, diopside, vesuvianite, the zeolites, the amphiboles, chalcedony, tiger's eye,
andalusite, dioptase… — fell through to "cap-only", and goethite's and enargite's strict gates were
missed. The drafts' "15 in 17 when ungated" was mostly these soft species. The finding about the
strict gate survives the correction and sharpens (2 in 13 became 0 in 13, because the drafts' two
strict "hits" were Elmwood ties broken by the real-world share; round 3's set-asides and the
unflagged-crystal measure make it 0 in 11).

**F1b — documentation drift.** `data/minerals.json:14` describes `max_nucleation_count` as "Counted
across the whole simulation (active + dissolved)". The code (`js/85b-simulator-nucleate.ts:716`)
counts only crystals that are neither dissolved nor flagged as enclosed. The sentence does describe the
hand-coded lifetime caps above, which count every crystal ever made.

### 4.2 F2 — Minor phases out-number headline phases, against the scenarios' own words
Every scenario names its headline species (`expects_species`) and justifies its other delivered
species with a written reason (`deterministic_species`, `statistical_species`). In 36 cases (29
species) the reason calls the species *accessory* (17), *minor* (8), *subordinate* (7), *trace* (3)
or *rare* (1) while its surviving crystals out-number the scenario's median headline species. Two
more reasons were read and set aside because their minor word is not about the species' own
abundance: Roughton Gill's mottramite ("the scenario's trace V is specifically retained for this
phase" — the trace is the vanadium) and Schneeberg's quartz ("Fundamental vein and pegmatite gangue
… retained as an accessory because the headline contract emphasizes ore" — a contract role). Surviving
counts include dust — 26 % of all surviving crystals in the fleet are under 0.1 mm, and at least 580
are zero-size nuclei that never grew (Sunnyside's 4 native-silver "crystals" per vug are 4 such
nuclei; Searles' mirabilite is 8 per vug at 0 mm). "Trace" and "accessory" usually describe volume.
So each case is tested again by **visible** crystals and by **volume**: **20 of the 36 hold by
visible count and 7 by volume** — 6 both ways, 14 by visible count only, 1 by volume only
(Sunnyside's tennantite) and 15 neither. The full table is in the appendix; the cases that hold by
visible count include:

| scenario | species | its reason says | visible per vug | headline median visible | volume share | headline median volume |
|---|---|---|---:|---:|---:|---:|
| mvt | anhydrite | "a trace Ca-sulfate accessory" | 6.29 | 1.00 | 0.3 % | 2.6 % |
| bisbee | atacamite | "retained as an arid chloride accessory" | 3.95 | 1.00 | 15 % | 1.1 % |
| reactivated_fluorite_vein | celestine | "a subordinate Sr-sulfate response" | 5.71 | 1.00 | < 0.1 % | 0.4 % |
| asbestos_hills_crack_seal | opal | "subordinate" | 5.00 | 2.52 | 65 % | 2.3 % |
| epithermal_telluride | native_silver | "a legitimate Ag-Au-Te vein accessory" | 4.00 | 2.00 | 5.6 % | 9.4 % |
| porphyry | arsenopyrite | "a hypogene accessory" | 3.57 | 0.67 | 3.4 % | 0.7 % |
| roughten_gill | chalcocite | "minor" | 0.76 | 0.71 | < 0.1 % | < 0.1 % |
| sicily_solfifera | strontianite | "that subordinate Sr-carbonate sink" | 3.48 | 2.29 | 0.2 % | 6.1 % |
| mvt | greenockite | "a minor CdS accessory" | 3.24 | 1.00 | < 0.1 % | 2.6 % |

Some of the 36 fail the visible test and are dust-count artefacts rather than visible errors:
Searles calcite ("subordinate", 10.8 per vug, none visible) and celestine ("minor", 8.9, none
visible), anhydrite at Sweetwater and Wittichen (0 visible), Sunnyside's native silver (zero-size
nuclei), and Bisbee's native gold (13 per vug but 0.48 visible against 1.00). Visible counts here are
crystals not flagged as enclosed: Bisbee's atacamite has 7.5 crystals ≥ 1 mm per vug, half of them
flagged, and Roughton Gill's chalcocite 3.8, 80 % flagged; both hold by visible count either way.

**Eight of the 36 nucleate past their own species cap**, through the slots that flagged crystals free
(§4.4; the appendix lists every case above a cap): Bisbee's native gold (13.0 per vug against a cap of
4, 10.8 of them flagged), atacamite (8.1 against 4) and dioptase (4.8 against 4), Searles' celestine
(8.9 against 6, 7.3 flagged) and calcite (10.8 against 10, 9.3 flagged) and Grimsel's epidote (5.7
against 5); Tri-State's greenockite and Deccan's pectolite pass theirs by a fraction of a crystal
(pectolite in 1 seed of 21, by one crystal). For the first six the count is set by the enclosure rule
as much as by the species' own probability.

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
abundance side and inherits that lever (§8 step 5).

### 4.3 F3 — Headline species grown only as dust
Twenty-seven times a headline species — ≥ 10 % of the voting record, or "abundant" in the literature
— is grown by the simulator but its median largest unflagged crystal is under 1 mm. In 24 the
crystals are simply small. In 3 they do grow past 1 mm but are flagged as enclosed by the powdery
ferrimolybdite and pulverulent powellite crusts, whose painted footprints reach them 0–34 mm from the
crusts' anchors (§4.4): Tsumeb's smithsonite (median largest 2.7 mm counting flagged crystals) and
azurite (3.1 mm), and Bingham's pyrite (2.4 mm). In most cases no seed has an unflagged crystal of
1 mm; Searles halite does in 2 of 21 seeds (largest 3.1 mm), Wittichen barite in 3 (1.0 mm), Tormiq
quartz in 4 (4.1 mm) and Bingham pyrite in 5 (3.0 mm). The appendix lists all 27; the ones that
matter most:

| scenario | species | real share (voting) / literature | sim per vug | median largest unflagged | largest unflagged in any seed |
|---|---|---|---:|---:|---:|
| cooling (Herkimer) | quartz | 94 % / AB | 1.0 | 0.57 mm | 0.59 mm |
| gem_pegmatite (Cruzeiro) | tourmaline | 83 % / AB | 3.0 | 0.37 mm | 0.58 mm |
| amethyst_geode | quartz (amethyst) | 56 % / AB | 1.0 | 0.84 mm | 0.87 mm |
| searles_lake | halite | 38 % / AB | 5.3 | < 0.01 mm | 3.1 mm |
| grimsel_alpine_cleft | fluorite | 30 % / CO | 1.0 | 0.51 mm | 0.52 mm |
| amethyst_geode | chalcedony | 23 % / AB | 2.5 | 0.15 mm | 0.16 mm |
| porphyry (Bingham) | pyrite — flagged | 18 % / AB | 1.0 | none (2.4 mm counting flagged) | 3.0 mm |
| deccan_zeolite | stilbite | 18 % / AB | 4.3 | 0.88 mm | 0.96 mm |
| roughten_gill | mimetite | 17 % / CO | 1.2 | 0.05 mm | 0.10 mm |
| bisbee | azurite | 16 % | 4.0 | none (0.51 mm counting flagged) | < 0.01 mm |
| bisbee | native copper | 12 % | 0.7 | none (0.07 mm counting flagged) | none |
| tormiq_alpine_cleft | quartz | 11 % | 3.3 | 0.01 mm (0.20 counting flagged) | 4.1 mm |
| supergene_oxidation (Tsumeb) | smithsonite — flagged | 10 % / AB | 1.0 | none (2.7 mm counting flagged) | none |
| supergene_oxidation (Tsumeb) | azurite — flagged | 8 % / AB | 4.0 | none (3.1 mm counting flagged) | none |
| wittichen | skutterudite, safflorite, native silver | AB (Petersen 1868) | 2.1, 2.0, 3.5 | 0.01, 0.01, 0.54 mm | 0.01, 0.02, 0.61 mm |
| schneeberg | native bismuth | AB | 0.4 | none (0.06 mm counting flagged) | none |
| colorado_plateau | carnotite | AB (Weeks & Thompson 1954) | 4.0 | 0.81 mm | 0.87 mm |

The Herkimer and Ametista cases decide those scenarios' verdicts: each grows the right mineral and
nothing a collector could see — at Ametista, where the geode walls end in "large-sized amethyst
crystals" (Proust & Fontaine 2007). Counted at micromount size (≥ 0.1 mm) both rank well against the
record (ρ 0.78 Ametista, 0.58 Herkimer): their failure is size, not species. The flagged cases are a
different matter: the species grows, and the over-produced molybdate crust beside it takes it under
its footprint — at Tsumeb every smithsonite and azurite crystal of 1 mm or more in all 21 seeds. They
belong with the enclosure rule (§4.4, §8 step 4) and the molybdate counts (§8 step 5), not with growth.

### 4.4 F4 — The enclosure flag reaches sideways, and makes counts
The simulator flags a crystal as enclosed (`enclosed_by`) when three things hold in one step
(`_check_enclosure`, `js/85c-simulator-state.ts:2433–2696`): a crystal more than three times the
guest's size grows; the guest has stalled (under 3 µm over its last three zones); and the two are
linked — one is the other's substrate, or their anchors lie within half the host's painted footprint
arc plus half the guest's plus one cell (`js/85c-simulator-state.ts:2534–2552`). An arc is four times
the crystal's size times its wall spread (`js/22-geometry-wall.ts:3015`), so a 22 mm ferrimolybdite
crust with a wall spread of 0.95 reaches about 40 mm along the wall. Nothing tests that the host
surrounds the guest; the code calls the flag "a convenient rendering/topology projection"
(`js/21-enclosure-authority.ts:4`). The footprint rule is itself a repair: W-F O4b (SIM 221) replaced
a string test under which 276 of the fleet's 342 seed-42 enclosures fired at distances no footprint
reached, Wittichen's at 246 mm (`js/85c-simulator-state.ts:2493–2509`).

**How far it reaches.** `tools/enclosure-reach-probe.mjs` reads every flagged crystal's enclosure
receipt (route, anchor distance, reach) with its host's habit and size, in 27 runs: review round 4's
set (Bingham, Sunnyside, the Great Salt Plains, Ouro Preto, Roughton Gill, Schneeberg, Wittichen and
Tsumeb at seeds 1, 2 and 42; Bisbee at 42) and Tri-State and Searles Lake at 42. Of the 112 flagged
crystals of 1 mm or more, 108 were flagged by footprint overlap, a median 20.8 mm from the host's
anchor (0–75.6 mm), 87 of them 10 mm or more away and 30 of them 30 mm or more. By their habit, 82 of
the hosts are crusts or aggregates (powdery and pulverulent crusts, banded masses, desert roses,
botryoids, satin spar, sprays, framboids) and 30 are single crystals — prismatic feldspar (15) and
albite (4), the disphenoidal chalcopyrite (5), pyromorphite barrels (5) and a galena cube (1). (The
simulator's `_surfaceGrowth` descriptor, which earlier drafts used here, is recomputed every step and is
not a habit class: at the end of the run it marks 84 of the hosts, the chalcopyrite and the pyromorphite
among them, and misses 5 of the 7 desert-rose selenites.)

| scenario | flagged crystals ≥ 1 mm | hosts | distance from the host's anchor |
|---|---|---|---|
| Tsumeb | conichalcite 12, azurite 12, aurichalcite 8, smithsonite 3 | powdery ferrimolybdite crusts (26); banded malachite (3), pulverulent powellite crusts (3), brochantite crusts (2), wulfenite plates (1) | 0–51 mm |
| Bisbee (seed 42) | acanthite 4, atacamite 4, jarosite 3, feldspar 2, pyrite 1, siderite 1 | banded malachite (6), a 57 mm disphenoidal chalcopyrite (5), atacamite (2), framboidal pyrite (2) | 9–76 mm |
| Schneeberg | arsenopyrite 5, uraninite 4, nickeline 3, acanthite 3 | prismatic feldspar crystals of 26–28 mm (15) | 1–35 mm |
| Roughton Gill | chalcocite 9, pyrite 2, calcite 2 | banded malachite (8), pyromorphite barrels (5) | 5–21 mm |
| Bingham | acanthite 5, chalcopyrite 2, pyrite, feldspar, arsenopyrite, molybdenite 1 each | powdery ferrimolybdite crusts (11) | 0–45 mm |
| Great Salt Plains | halite 10 | selenite desert roses (7) and satin spar (3) | 12–48 mm |
| Sunnyside | argentite 6 | a 73 mm botryoidal manganocalcite crust | 15–35 mm |
| Ouro Preto | quartz 4 | prismatic albite crystals of 40–41 mm | 37–61 mm |
| Wittichen; Tri-State (seed 42) | native arsenic 2; sphalerite 1 | by substrate: haidingerite; galena | 0 mm |

A crust spreading over the wall can bury the small crystals in its path, so the flag has a physical
reading when the host is a crust; a prismatic albite crystal cannot reach quartz 50 mm away, nor a
disphenoidal chalcopyrite atacamite 76 mm away. At Tsumeb and Bingham most of the flagging is done by
the molybdate crusts that are themselves over-produced (§5.2, §5.3).

**It also makes counts.** A flagged crystal stops growing (`js/85c-simulator-state.ts:2689`), and a
species' cap counts only its crystals that are neither dissolved nor flagged
(`js/85b-simulator-nucleate.ts:716`) — on purpose, so that a host's advancing front can bury a sulfide
and leave bare wall for the next, as in MVT calcite's inclusion trails
(`js/85b-simulator-nucleate.ts:654–664`). So every flagged crystal frees a slot. Across the locality
scenarios 55 (scenario, species) pairs nucleate past their cap in at least one seed, 47 of them with
more crystals flagged than dissolved (the appendix lists them all). The census counts each crystal
under its final species, so a crystal converted in place is added back to its parent (borax's
tincalconite), a parent whose product also nucleates on its own is a lower bound (argentite), and
that product is left out, its count mixing its own nucleations with converted crystals (acanthite,
thenardite, selenite, anhydrite). Round 5's 58 counted Bisbee's and Schneeberg's acanthite, which are
mostly argentite converted in place (round 6):

- Tri-State's barite, 55.6 per vug against a cap of 6, 50.8 of them flagged — at seed 42 by the
  substrate route, 32 of 33 on the sphalerite, galena and pyrite they nucleated on: the inclusion-trail
  case the cap was written for, here multiplying a species the record calls "minor to absent";
- Bisbee's native gold, 13.0 against 4, 10.8 flagged — at seed 42, 8 of 10 by footprint overlap, up to
  36 mm from atacamite, chalcopyrite, pyrite, malachite, opal and goethite hosts, and 2 by substrate;
- Searles' celestine, 8.9 against 6, 7.3 flagged — at seed 42, all 8 by the thenardite coating 7.6–30
  mm away.

Eight of F2's 36 minor-phase cases are among them (§4.2). The flag therefore decides one verdict
(Sunnyside), the three flagged headline cases of §4.1 and §4.3 (Tsumeb's smithsonite and azurite,
Bingham's pyrite) and part of the counts that the F2 and strict-gate steps would retune. Whether its
sideways reach is right — for which host habits, and how far — and whether the cap should free a slot
for a crystal flagged by footprint rather than by substrate, are simulator questions for the boss, to
settle before any count changes (§8 step 4). A substrate-only rule would leave the largest case as it
is: Tri-State's barite is flagged through its substrate.

---

## 5. Locality findings

Numbers are crystals per vug averaged over 21 seeds; "% vis" is the share of visible (unflagged,
≥ 1 mm) crystals; photo and listing shares come from the data file; literature classes are AB / CO /
UN / RA / ND / ND? (absent from a few sources only) / doc (documented, no abundance word). Full tables
in the appendix.

### 5.1 MVT and fluorite–barite veins

**Tri-State (mvt) — DISAGREES.** A sphalerite district (zinc to lead concentrates about 6:1, 23
million to 4 million short tons; sphalerite about five times as abundant as galena — Kansas
Geological Survey 2001, pp. 2–3) whose collectible crystals are calcite (2–3 ft
scalenohedra), sphalerite, galena, dolomite and chalcopyrite. The USGS deposit model: "the dominant
minerals are sphalerite, galena, pyrite, marcasite, dolomite, and calcite, whereas barite is
typically minor to absent and fluorite is rare" (Leach et al. 2010). The simulator: barite 55.6 per
vug (all dust; 50.8 of them flagged as enclosed, which is how the species passes its cap of 6 — §4.4),
anhydrite 7.6 (45 % vis), greenockite 5.3 (23 % vis), and about one crystal each of
galena, calcite, fluorite, pyrite (1.1) and sphalerite (1.5, 0.5 of them visible). Greenockite is
real at Picher, but as an earthy coating on sphalerite, not as 2.3 mm crystals (Handbook of
Mineralogy). Chalcopyrite (6 % of photos,
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
Galena (6 % of photos, documented in the paragenesis of Gratz 1986, a thesis on the neighbouring
Gordonsville mine) never forms.

**Viburnum Trend / Sweetwater (reactive_wall) — TIE-DEPENDENT (DISAGREES or PARTLY).** Galena and
sphalerite tie as the simulator's most numerous visible species at one crystal each; with galena as
the lead the verdict is PARTLY, with sphalerite (0.3 % of the record) DISAGREES. The PARTLY reading
also needs ρ ≥ 0, and ρ is exactly 0.0000; every reading is DISAGREES in 58.5 % of the joint
resamples. This is a *lead*
district: Zn/(Zn+Pb) "is less than 0.1 for the Southeast Missouri district", chalcopyrite "is the
main source of byproduct copper", and "Barite has never been reported in the Cambrian-hosted Southeast
Missouri Lead districts" (Leach et al. 2010). The simulator puts 82 % of its crystal volume into
sphalerite, where Rowan (1987, USGS OFR 87-675) calls coarse sphalerite "somewhat rare", and grows
6.6 anhydrite per vug (none visible; one listing family in 362 names anhydrite); calcite (42 % of
photos), chalcopyrite (12 %) and dolomite ("the abundant hydrothermal gangue dolomite", Rowan 1987)
never survive. Galena is right as a visible species but is one crystal.

**North Pennines (tn457_barite_pulses — OUT OF SCOPE; reactivated_fluorite_vein — DISAGREES).** The
orefield's record is fluorite first (56 % of photos, 63 % of listings), then galena, quartz and the
barium minerals, zoned: fluorite in the central zone, barium minerals outside it (GCR vol. 36; North
Pennines audit — whose outer zone "includes much of the Nent Valley", so the Alston Moor page spans
both zones; search text, as the audit's online copy returned 502). Galena is "the main sulphide ore" and quartz "abundant in the Alston Block" across the
orefield (GCR vol. 36), so not every top species is central-zone (the drafts before round 5 said all
three were). *tn457* models one barite-on-sphalerite cavity from the outer zone, while the record —
the Weardale and Alston Moor pages and searches — is the whole orefield's, led by the central zone's
fluorite, and no page or search targets the outer zone: the mismatch is a scope question, not an
error, and the scenario is not scored. *reactivated_fluorite_vein* claims the central fluorite–galena
vein type and grows fluorite ×1 and galena ×1 beside barite ×6 (an outer-zone mineral), celestine
×6, greenockite ×5, acanthite ×4 and anhydrite ×7.5 — none of the last four recorded in the orefield
(GCR vol. 36 places the silver in argentiferous galena). The July review flagged this scenario's
witherite-vs-baryte routing as an objection with "real force"; this is its count side.

### 5.2 Oxidation zones

**Tsumeb (supergene_oxidation) — DISAGREES.** Harvard's *Tsumeb Mineral Notes* rate every species
on a specimen-availability scale; every rating quoted here was opened by the author or by review
rounds 4 and 5. The "Very common" species are smithsonite ("the most abundant secondary mineral at
Tsumeb", after Pinch & Wilson 1977), cerussite, malachite, azurite (Keller 1977a ranks it the fourth
most abundant supergene mineral of the first oxidation zone), calcite, dioptase and duftite. The
simulator's most numerous visible species are ferrimolybdite (12 % vis; no species entry (S)),
brochantite (10 %), and scorodite ("Very rare") and pyromorphite ("Extremely rare"), tied at 9.8 %.
Cerussite (8.1 %) is visible too, at about the share of anglesite ("Common", 8.0 %) and powellite
("Extremely rare", 8.2 %). Ferrimolybdite and powellite hold 54 % of the crystal volume, as powdery and
pulverulent crusts 25 and 20 mm across, with no Tsumeb photograph or listing. Of the five "Very common"
species the simulator grows, two are hidden: its one smithsonite per vug (strict gate) and its azurite
(3.5 crystals ≥ 1 mm per vug) are flagged as enclosed in every seed, by those same molybdate crusts,
whose footprints reach them 0–34 mm from the crusts' anchors (§4.4). Cerussite (4 per vug), malachite
(one crystal, strict gate) and duftite are visible; calcite never forms, though it is in the scenario's
zone — "Collectable calcites were commonly encountered at depth", "somewhat less common in the upper
levels" (TSNB66), not absent, so it stays in scope (§2.4). Dioptase (6 % of photos and
listings) is set aside: the Notes find it "extremely rare (or possibly even absent) in the first
oxidation zone" — the zone the scenario models — and abundant in the second and third (TSNB107). Other
parts of the Tsumeb record may be second-zone material too; the record was not sorted by zone (§7).

**Bisbee — DISAGREES (ρ −0.39).** The record is malachite, azurite, native copper, cuprite and
calcite. The simulator's visible crystals are led by chrysocolla (16 % vis), opal (15 %), chalcedony
and atacamite (14 % each; atacamite is 8.1 per vug, but half of its crystals ≥ 1 mm are flagged as
enclosed). Jarosite and acanthite, which the first drafts counted among the leaders, are almost all
flagged (97 % and 95 % of their ≥ 1 mm crystals) — at seed 42 mostly under the footprint of the
banded malachite mass. Azurite (4 per vug), native copper and cuprite never reach 1 mm (median largest 0.51, 0.07 and
0.36 mm) and are flagged as well; malachite is one
crystal, though a 65 mm one holding 43 % of the volume; calcite never forms. Lepidocrocite (14.5 per
vug, almost all dust) and native gold (13.0; 0.5 visible) are the most numerous species — native gold
against a cap of 4, through the slots its 10.8 flagged crystals per vug free (§4.4). Dioptase
(4.8 per vug at 0.08 mm) was defended for *presence* in July; its count is the new question. No published abundance ranking for Bisbee was
reachable (Graeme's Mineralogical Record articles were not), so this verdict rests on the two proxies.

**Roughton Gill — DISAGREES, narrowly.** The lead is right: pyromorphite tops both sides. The
Geological Conservation Review account: "Most abundant are supergene lead and copper minerals";
pyromorphite, cerussite and malachite "are thought to have been worked commercially" (both as quoted
by the research pass; the GCR text could not be opened in rounds 3–5 or in the response to round 5,
and a search summary words it differently — ten of Roughton Gill's literature classes rest on the
research pass's reading of it). Mimetite (17 % of
the voting record) and quartz never pass 1 mm; chalcocite (4.6 per vug) has no photograph or listing
and chrysocolla (5.0) one photograph; mottramite (3.8 per vug) is recorded from Brandy Gill rather
than Roughton Gill (snippet-level). (Its reason's "trace" describes the scenario's vanadium, not the
mottramite — §4.2.)

### 5.3 Veins and porphyry

**Bingham Canyon (porphyry) — DISAGREES.** Main-stage chalcopyrite, bornite, chalcocite and pyrite;
molybdenite in quartz veins (Phillips et al. 2005, as summarised by the research pass — the chapter
is paywalled, and its figure of sheeted veins exceeding half the rock was not checked first-hand by
the author or by review round 2). The simulator grows
chalcopyrite ×1 and pyrite ×1 beside ferrimolybdite ×5.3, brochantite ×4.7, acanthite ×4,
arsenopyrite ×3.9 and bismuthinite ×4; its pyrite reaches 2–3 mm but is flagged as enclosed by the
powdery ferrimolybdite crust in most seeds. Its visible leaders are ferrimolybdite — a crust — then
brochantite and galena (acanthite drops out once flagged crystals are left out). Arsenopyrite and bismuthinite are "accessory" in their own
reasons; acanthite is undocumented in Phillips et al. 2005, and ferrimolybdite, arsenopyrite and
bismuthinite are rated rare only on snippet-level evidence; brochantite has no literature class.
Quartz and bornite never survive. Bingham's specimen record is thin (30 photographs; dealers call it
"not known as a fine specimen producer"), so the literature carries this one.

**Sunnyside / American Tunnel — MEASURE-DEPENDENT (PARTLY or DISAGREES).** The record: rhodochrosite (45 % of photos),
fluorite (29 %), quartz; sphalerite and galena are "the most abundant ore minerals" (Guzman et al.
2024). The simulator's visible crystals are led by galena (4 per vug, 34 % vis) and quartz (17 %);
rhodochrosite ties for third place at one crystal per vug (strict gate), with fluorite (0.95, also
strict) just behind; sphalerite is dust. Argentite is 6.4 crystals per vug and 3.2 of them reach
1 mm, but 70 % of those are flagged as enclosed by the scenario's 73 mm botryoidal manganocalcite
crust, whose footprint reaches them 15–35 mm from its anchor (§4.4). Left out, argentite falls to
0.95 visible per vug and the verdict is PARTLY — a reading that rests on the simulator's lead, galena,
at 1.16 % of the record (5 of 217 listing mentions, no photograph), next to the 1 % line; every
reading is DISAGREES in 57 % of the joint resamples. Counted, argentite is the second most numerous visible
species and the verdict is DISAGREES. Argentite's own reason claims compatibility ("a high-temperature Ag2S precursor compatible with Sunnyside's primary polymetallic
stage"), not a record, and neither Burbank 1933 nor Guzman et al. 2024 names argentite or acanthite,
though the mine produced 14.9 Moz of silver. They do name tetrahedrite, a common silver carrier ("a
little", Burbank; "Aikinite, bornite, and tetrahedrite are locally abundant", Guzman et al., as quoted
by review round 2); the simulator grows one tetrahedrite per vug (strict gate), never past 0.5 mm.
Native silver is documented — the scenario cites wire silver at the Sunnyside Extension mine (USGS
Folio 120) — and its 4 per vug are zero-size nuclei, a count artefact (§4.2).

**Cripple Creek (epithermal_telluride) — DISAGREES.** Read first-hand: gold occurs "chiefly as
calaverite, but partly also as the more argentiferous sylvanite"; "Native gold appears to be absent
from the telluride ores, except as it may be set free by the oxidation of these tellurides"; "The
usual gangue minerals of the ores are quartz, fluorite, and dolomite"; silver runs "about 1 ounce of
silver to 10 ounces of gold" (Lindgren & Ransome 1904, USGS Bull. 254, pp. 20–21). The simulator
grows native silver ×4 (20 % vis), native gold ×4, hessite ×3 (71 % of crystal volume), calaverite
×2, sylvanite ×2 and K-feldspar ×2 (all visible); fluorite and dolomite never form. The record's
feldspar is secondary potassic feldspar, which the simulator's K-feldspar matches; its albite (×3.2,
mostly under 1 mm) has no record. The record's native gold is the oxidized ore's, which the scenario
does not model, so its slot is set aside (§4.1) — and the simulator's four native-gold crystals in the
primary vein are themselves at odds with "absent from the telluride ores". The verdict sits at the 1 %
threshold (§3): native silver, the simulator's most numerous visible species, is 0.9 % of the record,
and that 0.9 % is three listing mentions, none naming it first — the title classifier reads "Hessite
Silver Telluride" as hessite and native silver (§2.2). Counted by the species a title names first,
native silver drops out of the record (0 %), and the DISAGREES no longer sits on the threshold.
Hessite's "rare" was an inference from the Handbook of Mineralogy's locality list and is now "ND?"
(§2.3).

**Schneeberg — DISAGREES.** A cobalt–silver–bismuth–uranium vein district: native bismuth and
skutterudite were principal ores, erythrite is the most-photographed species (103 photographs; type
locality). The simulator's visible leaders are chrysocolla, quartz and uranophane (arsenopyrite and
uraninite drop out once flagged crystals are left out — flagged by prismatic feldspar 7–35 mm away); native bismuth and native
silver are dust; skutterudite never forms; topaz ×3.9, cassiterite
×3.3, spodumene and morganite belong to the granite-hosted tin type of the western Erzgebirge (Bastin
1914), not to these veins. The weakest-sourced verdict here: no published ranking was found, and the
photo archive is micromount-heavy.

**Wittichen — DISAGREES (ρ −0.57).** Petersen 1868 ranks the ores: predominant Speiskobalt
(skutterudite–safflorite), earthy cobalt and native silver; less widespread native bismuth,
wittichenite, native arsenic, nickeline, proustite; erythrite "sehr häufig". The vein fill is mainly
barite. The simulator grows chalcedony ×4 (not recorded), native arsenic and nickeline ×4 each, and
haidingerite ×4.6 (26 % vis) — haidingerite is pharmacolite dehydrated in place, and pharmacolite
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
(`js/75-transitions.ts:95`). The record has borax surviving as 3.1 vol %, and "Primary crystals of
tincalconite have been reported only twice from Searles Lake" (Smith & Haines 1964, as quoted by
review round 3); the tincalconite rind forms on borax exposed to dry air, that is, after recovery.
So the mechanism is real but belongs after the cavity is opened, and the simulator converts all of
its borax inside it. (Earlier drafts quoted "common only as an alteration rind on borax", which was
the research pass's paraphrase, not the source's words.) Calcite (10.8 per vug) and celestine (8.9)
are invisible dust, both past their species caps (10 and 6) through the slots their flagged crystals
free — 9.3 and 7.3 per vug end flagged (§4.4); trona and hanksite have no engine; halite is mostly
sub-0.01 mm crusts.

**Great Salt Plains — THIN; the literature makes selenite the collectible.** The collectible is
hourglass selenite (single crystals and twins to 7 in., clusters to 38 lb); halite occurs as a thin
surface crust (US Fish & Wildlife Service 2002). The simulator: halite 11.3 per vug to selenite 2.0,
but most halite is sub-millimetre crust, and 61 % of its ≥ 1 mm crystals are flagged as enclosed by
selenite desert roses and satin spar 12–48 mm away (§4.4). Left out, selenite leads the visible
crystals (53 %); counted, halite does (69 %). Selenite takes 99.9 % of the volume either way (40.6 mm
crystals). The surviving count inverts what is collected; whether the visible count does depends on
the flag. (With a vote threshold of 10 instead of 20, the 13 listings would vote and the verdict would
be MEASURE-DEPENDENT, DISAGREES or PARTLY — §2.4.)

**Sicily — PARTLY.** Sulfur and celestine are in both top threes. Aragonite — the "well-known large
aragonite crystals" (Viola 1897; 10 % of photos, 21 % of listings) — never forms, and strontianite (4
per vug, 25 % vis) has no scientific record from these mines that the research pass could find.
Celestine (6 per vug) outnumbers sulfur (4.3); at Monte Palco it is present "occasionally".

**Sulphur Bank — THIN; the literature probably agrees on the lead.** Two photographs and one listing.
Cinnabar — the simulator's top species — is Ross's (1940, p. 338) "most abundant metallic mineral in
both districts": a claim for two districts together, not Sulphur Bank alone (review round 2); native
sulfur is abundant; "the upper-central part of the basalt flow at Sulphur Bank has been almost completely
replaced by opal" — opal is aspirational in the scenario and never forms. Orpiment (7 per vug) and
pararealgar (6; light-altered realgar) are not mentioned by the three sources read; the scenario
expects them, and absence from three sources is not proof. **Boss adjudication needed** before
anything changes. Metacinnabar is documented (one Mineralienatlas photograph), against the research
pass's "not documented".

**Naica — DISAGREES, partly a scope question.** The scenario models the giant-gypsum cave pool, which
its own text calls "near-monomineralic", so the mine's fluorite, calcite crystals, galena and
sphalerite are outside its claim (the fluorite and calcite were real top-three slots and are set
aside, §4.1). Inside it, García-Ruiz et al. (2007) record the cave walls' crust of calcite and
celestine, and the selenite. The simulator grows celestine
×6 (86 % of visible crystals) to selenite ×1: celestine is real here, but as a wall crust, not as six
free crystals out-numbering the gypsum the cave is named for. The record's selenite comes from the mine
and the Cave of Swords — the Cave of Crystals is sealed — but selenite is the cave's own mineral, so it
stays in scope (§2.4).

### 5.5 Pegmatites and alpine clefts

**Cruzeiro (gem_pegmatite) — TIE-DEPENDENT (DISAGREES or PARTLY).** Albite and microcline
(feldspar) tie as the simulator's most numerous visible species at 1.9 per vug; with albite (1.3 % of
the record) as the lead the verdict is PARTLY, with feldspar (0.3 %) DISAGREES. Both lines are close:
ρ is 0.0039, and albite's 1.3 % is 4 listing mentions, none first-named, with no photograph; every
reading is DISAGREES in 90 % of the joint resamples. (The first draft
called this verdict PARTLY and "the one unstable verdict"; the instability was the tie.) Tourmaline is
83 % of the voting record; the pockets "frequently contain superb gem tourmaline crystals" (Proctor
1985), and Proctor puts the gem tourmaline with albite rather than microcline (p. 90, review round 4). The simulator's tourmaline stays under 1 mm in every seed (median largest 0.37 mm); its visible
crystals are albite, microcline and quartz (30 % of them; feldspar holds 97 % of the volume).
Cassiterite — "rare" in the record — is the most numerous species (4.5 per vug, dust).

**Shigar Valley — PARTLY.** Aquamarine is the signature product (36 % of listings; a principal
commodity of the Dassu pegmatites in Laurs et al. 1998, Table 1, as reported by the research pass —
not read first-hand). The beryl family never nucleates in this scenario. Topaz is dust (0.59 mm);
fluorite, apatite, muscovite and garnet never form.

**Ouro Preto — PARTLY.** Topaz leads both sides. The record has quartz, specular hematite, mica,
rutile and rare euclase with it, and "The potassium feldspar is now totally altered to kaolinite"
(Keller 1983); the simulator's other visible crystals are quartz (19 % of them), feldspar and albite
(36.8 mm). A third of the quartz ≥ 1 mm is flagged as enclosed by prismatic albite crystals 37–61 mm
away — the clearest case of the flag's sideways reach (§4.4). The verdict is
fragile: with proxy noise it changes in 66 % of resamples.

**Grimsel — DISAGREES.** Quartz (mostly smoky) and fluorite (much of it pink) are 80 % of the area's
photographs. Read first-hand in Koenigsberger (1919): the frequent cleft types in normal Aar granite
are quartz–chlorite–calcite–fluorite (localities I–XX) and quartz–chlorite (I–VII, X–XIV, XXIII), with
apatite and epidote only as bracketed associates; adularia–quartz–titanite–chlorite is the *diorite*
type. The simulator's visible leaders are apatite (5.9 visible per vug, 32 % vis), quartz (16 %) and
titanite (12 %); epidote is 5.7 per vug but only 0.76 of them visible. Titanite belongs to the diorite
type and apatite and epidote are only associates in the granite types, while the simulator's fluorite
is dust and chlorite has no engine.

**Tormiq — PARTLY.** Titanite and epidote are in both top threes, in a different order: titanite
leads the record (21 % against epidote's 16 %), epidote the simulator's visible crystals (33 %, then
actinolite 24 % — 0.8 % of the record — and titanite 15 %); the scenario is close. No peer-reviewed
species list exists; Koenigsberger's type 10 (quartz–epidote–amianth–titanite in epidotized
amphibolite) is the published analogue and matches the simulator's core. Quartz (11 % of the voting
record) is dust in most seeds.

### 5.6 Metasomatic, metamorphic and amygdale scenarios

**Jeffrey Mine — PARTLY, the best multi-species case.** Grossular, vesuvianite and diopside are the
top three on both sides. Grossular is under-weighted (13 % vis against 59 % of photos); awaruite (3 per
vug, 11 % vis) and datolite were not found in the sources read; chlorite and zoisite have no engine.
Normand & Williams-Jones (2007) name prehnite, wollastonite, zoisite and chlorite only in a list of
characteristic rodingite minerals, so their earlier "common" class is now "documented" (review round
3).

**Deccan Traps — DISAGREES, narrowly (ρ −0.03).** (PARTLY before round 5, when species absent from
both sides counted as agreement — §2.4.) "Heulandite and stilbite constitute the major bulk of the zeolites"
(Sukheswala et al. 1974); apophyllite is the most-photographed species and the one most often named
first in a listing (stilbite is named in slightly more listings, 612 families to 599). The simulator's
apophyllite is one crystal (strict gate), its stilbite is dust, and its visible crystals are
chalcedony, heulandite and quartz (quartz alone holds 78 % of the volume). Pectolite (4 per vug) is
absent from both systematic studies (Sukheswala et al. 1974; Ottens et al. 2022, which names it only
for the Watchung basalts), while goethite does appear in Ottens et al. 2022 as crystals up to 2 mm near
Sinnar (review round 4; the first drafts said both were absent) — the scenario calls
pectolite "a documented Deccan cavity Ca-Na silicate accessory" without a source, so this is a
disagreement to resolve, not yet a verdict; albite appears in the record as albitized lava, not as a
cavity crystal. Cavansite, okenite, gyrolite, pentagonite and laumontite (26 % of photographs
together) have no engine.

**Bimbowrie (chiastolite_hornfels) — THIN; the literature agrees.** Bimbowrie has three
Mineralienatlas photographs, and its listing record comes from searches that include "chiastolite"
— chiastolite from any locality, andalusite by construction — so neither proxy votes. The first two
drafts scored this as the review's one AGREES (ρ 0.66) without saying where the record came from;
round 3 caught it. The literature carries the scenario: Teale (1979) describes a graphite-rich schist
with chiastolitic andalusite to 14 cm in a matrix of quartz, muscovite and graphite, and the
simulator's only visible crystals are andalusite. "The phases plagioclase and paragonite were not
detected" — the simulator's albite and feldspar crystals (none visible) are unsupported; the July
review flagged pure albite at 600 °C as an objection with "real force".

**Ametista do Sul (amethyst_geode) — NO VISIBLE CRYSTALS.** Quartz (amethyst) leads the record, then
chalcedony and calcite ("Calcita e celadonita, minerais comuns e abundantes", Dias et al. 2019 — a
sentence about the Rio Grande do Sul amethyst in a paper on Minas Gerais material). The
simulator's amethyst reaches 0.87 mm at most and its chalcedony 0.16 mm; calcite and celadonite never
form.

**Herkimer (cooling) — NO VISIBLE CRYSTALS.** Quartz is 97 % of the photographs; dolomite rhombs and
anthraxolite accompany almost every pocket. The simulator grows one quartz of 0.57 mm. Calcite, third
in the record at 0.9 %, has no abundance word in its source and is set aside from the fate table.

**Mogok (marble_contact_metamorphism) — NO VISIBLE CRYSTALS.** The scenario produces nothing, by design
for now (ruby and calcite are aspirational). The record is spinel (36 % of photographs, no engine),
painite, ruby and sapphire. The literature's "abundant" calcite is the host marble, not cavity
crystals, so §3's "lit: missing: calcite" for Mogok carries little weight.

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
| Shigar, Cruzeiro | muscovite, spessartine | common (Laurs et al. 1998, via the research pass; Proctor 1985) |
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
  North Pennines; Tsumeb's record includes primary ore and the second and third oxidation zones while
  `supergene_oxidation` models the first. The species that the sources place only elsewhere are set
  aside (§2.4) — dioptase at Tsumeb among them — while a species that does occur in the modeled part
  stays even where its specimens were collected elsewhere (Naica's selenite, Tsumeb's calcite). Zone by
  zone the Tsumeb record was not sorted, so second-zone material may still weigh in its shares
  (Tsumeb's best wulfenite, for one, came from the second zone — TSNB375). The verdicts use the whole record;
  removing the set-aside species from it changes none of them, and the sections judge each scenario
  against the part of the record it claims.
- **"Crystal" includes aggregates.** The simulator counts opal, chalcedony, chrysocolla, the Elmwood
  celestine blanket, the powdery ferrimolybdite and pulverulent powellite crusts — its most numerous
  visible species at Bingham and Tsumeb — and Sunnyside's 73 mm manganocalcite crust as crystals, where
  a collector sees a coating or a crust. The same crusts do most of the enclosure flagging (§4.4).
- **"Visible" is a choice, and the verdict mostly does not hang on it.** The headline comparison uses
  unflagged crystals ≥ 1 mm. Re-read at the micromount size (unflagged crystals ≥ 0.1 mm; the
  appendix's ρ(sim ≥ 0.1 mm count, real)), three of the four micromount-heavy localities get worse,
  not better — Tsumeb ρ −0.54 → −0.66, Schneeberg −0.58 → −0.63, Roughton Gill −0.02 → −0.08 — and
  Wittichen barely moves (−0.57 → −0.54). The median over the 26 scored scenarios is −0.04 either way.
  Counting the crystals the simulator flags as enclosed moves the median to −0.06 and changes one
  verdict (Sunnyside).
- **The proxies are samples too.** Resampling the photographs and listing mentions as multinomial
  draws widens the median ρ band from 0.02 (seeds alone) to 0.17 (proxies alone) and 0.18 (both), and
  moves two verdicts in ≥ 20 % of draws (§3). That treats every photograph and every listing as an
  independent draw, which they are not — one collector photographs a whole drawer, one dealer lists a
  whole flat — so the true proxy noise is larger than this. The bootstrap's own Monte-Carlo error is
  small: under three other bootstrap seeds the median joint band is 0.17–0.19 and the same two
  verdicts stay above 20 % (§3).
- **The thresholds are choices.** A source votes with 20 observations, a slot needs 5 % of the record,
  and a listing counts every species its title names. §2.4 re-runs the comparison with other choices;
  none makes any scenario agree.
- **Count, visible count and volume rank differently in places** — Great Salt Plains (halite 11.3
  crystals per vug to selenite's 2.0; selenite 99.9 % of the volume, and 53 % of the visible crystals
  with flagged ones left out), Bisbee (malachite 3.5 % of visible crystals, 43 % of the volume),
  Tri-State (anhydrite 45 % of visible crystals, 0.3 % of the volume). Across the 26 scored scenarios
  volume ranks better than visible count in 15 and worse in 10 (11 and 8 if differences under 0.05
  are ignored), but the median ρ is lower by volume (−0.17).

---

## 8. Proposed fix order (awaits the boss)

Nothing below is implemented. Each step is its own decision, census and commit; the order puts the
measurement first and the changes that move every baseline last.

0. **Land the instruments and the data** (this PR). No simulator file changes; no baseline moves.
1. **Pre-register abundance claims.** A passive target per scenario (for example the locality's top
   three species by visible crystals, with the source) read by `tools/locality-abundance-compare.mjs`
   — a target for every later step, not a CI gate. It belongs beside the presence tiers the
   locality-frequency contract already records (`tools/locality-frequency-contract.mjs`, seeds 1, 2
   and 42). The literature ranks in the data file are the first draft. Where it lives has a cost: a
   field in `data/scenarios.json5` costs what step 2 costs, because that file is hashed release content
   (`tools/release-audit.mjs:47`) and is embedded in the `file://` bundle
   (`tools/file-bundle-assets.mjs:18`); a side file read only by the comparison costs nothing and can
   move into the scenarios once the targets settle.
2. **Fix the documentation drift** (F1b): one sentence in `data/minerals.json`. Not free — the file is
   a hashed release content file (`tools/release-audit.mjs`) and is embedded in the `file://` bundle
   (`tools/file-bundle-assets.mjs`), so it needs a rebuild and a receipt rebake, though no simulation
   output moves.
3. **Species the record needs that the scenarios do not deliver (§4.1a) — 12 of the 66 slots.** It
   starts with the boss, scenario by scenario. Seven are not listed at all — calcite at Ametista and
   Tsumeb, chalcopyrite at Viburnum, quartz in the reactivated fluorite vein, aragonite in Sicily,
   zeunerite at Wittichen, chalcedony at Marlborough — so the first question is the contract: should
   the scenario claim the species? Five are aspirational, already claimed and recorded as no-shows —
   calcite at Viburnum, fluorite at Cripple Creek, aquamarine at Shigar, hematite at Ouro Preto, ruby at
   Mogok — so they are engine failures to diagnose. Once a species is claimed, the July rule applies —
   never edit expects_species to accept the no-show — and each gets its own diagnosis (σ gate, broth,
   missing event). One no-show outside the fate table carries the same question: dolomite in the MVT
   scenarios (which also needs the boss's call on the July kinetic verdict). (Tsumeb's dioptase, listed
   here before round 5, is set aside: the scenario is the first oxidation zone, where it is extremely
   rare or absent — §5.2.) This continues the July review's "district-diagnostic no-shows" and "missing
   ore-forming events" rungs. The contract decisions change nothing in the simulator; the diagnoses do
   change counts, so they wait for step 4's answer — and 7 of the 12 species are strictly gated, so
   once they form, step 6 re-moves them too.
4. **The enclosure rule (§4.4) — decide before any count changes.** The flag makes counts as well as
   hiding crystals: a flagged crystal stops growing and its species' cap no longer counts it, so 55
   (scenario, species) pairs nucleate past their caps — Tri-State's barite 55.6 per vug against a cap of
   6, Bisbee's native gold 13.0 against 4, Searles' celestine 8.9 against 6 — and eight of F2's cases
   are among them. Two questions for the boss, in this order. Should a crystal's painted footprint
   enclose a stalled neighbour tens of millimetres away, and for which host habits? For crusts it has a
   physical reading; for a prismatic host it is hard to defend (Ouro Preto's albite flags quartz 37–61
   mm away, Bisbee's disphenoidal chalcopyrite atacamite 76 mm away). And should the cap keep freeing a
   slot for every flagged crystal — the inclusion-trail design (`js/85b-simulator-nucleate.ts:654–664`)
   — or only for one a host has overgrown from its substrate? The second option leaves the largest
   case as it is: at Tri-State's seed 42, 32 of the 33 flagged barite crystals were flagged through
   their substrate, so barite's 55.6 per vug needs its own lever (step 5). Either answer moves counts in
   the scenarios behind most of the F2 cases and decides Sunnyside's verdict and the three flagged
   headline cases, so it comes before steps 5–7, which would otherwise be tuned against counts it is
   about to change.
5. **The minor-phase counts (F2), one species family at a time, each with its own lever** — after
   step 4, which re-moves several of them. Anhydrite (four scenarios, cap 8 and a 16 %-per-step roll
   once the PHREEQC path admits it); greenockite and acanthite through the July lever — lattice
   partition into the host sulfide and a host-first paragenetic gate — rather than a cap;
   transformation products through their parent or their transition (Searles tincalconite is a
   question about how much borax should dehydrate); Tri-State's barite (55.6 per vug against a cap of
   6, all dust, nearly all flagged through its substrate, so step 4's substrate option would not touch
   it); Bisbee's atacamite, Tsumeb's and Bingham's
   molybdates (whose crusts also flag Tsumeb's smithsonite and azurite and Bingham's pyrite as enclosed
   — §4.4), opal at the Asbestos Hills and Marlborough, celestine at Naica and Searles, strontianite in
   Sicily, argentite at Sunnyside through each species' nucleation probability or cap. Zero-size nuclei
   (Sunnyside native silver, Searles mirabilite) are a separate housekeeping question — they are
   invisible and only inflate counts. Elmwood's celestine blanket is a boss-ruled habit decision and
   stays out of this step unless the boss reopens it.
6. **The strict gate itself (§4.1b).** Replace the 24 strict gates (22 on species that form in the
   panel) with a σ-dependent per-step nucleation probability bounded by `max_nucleation_count` (the
   air-mode Bernoulli already does this for cave calcite). Two commits: a byte-identical refactor that
   names the idiom, then the change with a census of every scenario. **Trap:** lifting the gate alone
   will multiply calcite, sphalerite, pyrite and the rest the way the cap-only species already
   multiply (median 3.9 crystals per vug, much of it dust), so the probability has to fall with crystal
   count or local depletion, and the fill dampener interacts with it — and so does the cap: strictly
   gated species seldom reach it today, and once they do, step 4's answer on flagged crystals applies to
   them too. It also re-moves step 5's retunes, because the species
   compete for the same ions — expect to re-measure step 5 after it. It is a count lever only: by
   volume, strictly gated species already reach the top three 6 times in 11. And seven strict species
   also carry a hand-coded lifetime cap that counts every crystal ever made (malachite, smithsonite,
   mimetite, hematite and goethite 3, adamite 4, wulfenite 2 — §4.1), so lifting the gate leaves them
   at 2–4 crystals unless those caps move too.
7. **Dust (F3), per scenario first.** Herkimer quartz and Ametista amethyst decide their scenarios'
   verdicts; Cruzeiro tourmaline is next. Diagnose each scenario's growth window before touching a
   growth rate: quartz grows in 19 scenarios and is visible in several, so a global quartz rate change
   moves them all. The flagged cases (Tsumeb's smithsonite and azurite, Bingham's pyrite) wait on step
   4.
8. **Species debt (§6).** Hanksite and trona first (half of Searles Lake's Upper Salt by volume); then
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
  identically in the browser page and on disk. The first photograph transcription dropped one
  Schneeberg row (Lotharmeyerite = 1); the hash mismatch caught it and it was restored. Since round 3
  the two captures are committed (`proposals/DATA-LOCALITY-ABUNDANCE-CAPTURE-2026-10-21.json`), and the
  comparison tool recomputes both hashes and checks every count in the data file against them on
  every run.
- Census determinism: the 861-run panel was run twice (census versions 1 and 2); every field the two
  share is identical in all 861 runs.
- Classifier unit checks before capture: "Copper Queen Mine" ≠ native copper; "fool's gold" → pyrite;
  "Sulphur Bank" ≠ sulfur; "ruby silver" → proustite; "Ruby Red Sphalerite" ≠ ruby; "Galena Spinel
  Twin" ≠ spinel; "metatorbernite" ≠ torbernite.
- The comparison is deterministic (a fixed bootstrap seed per scenario): round 1 regenerated the first
  appendix byte-identically, and two consecutive runs of the revised tool give byte-identical output.
- Gate classes are read from the code, and the appendix prints each species' gate line (file, line and
  statement), so every class can be checked by eye.
- The enclosure figures in §4.4 come from `tools/enclosure-reach-probe.mjs`, which reads each flagged
  crystal's enclosure receipt; at seed 42 it reproduces the round-5 reviewer's independent probe
  (Searles celestine 8 flagged by the thenardite coating 7.6–30.0 mm away; Tri-State barite 33 flagged,
  32 by substrate; Tsumeb's aurichalcite and conichalcite hosts). Re-run in full in response to round
  6, it gave the same 324 flagged crystals, receipts and hosts in all 27 runs; only the timings differ.

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
(smithsonite, "Very common"); in response to round 5, TSNB38 (azurite, "Very common"; Keller 1977a
ranks it fourth among the first oxidation zone's supergene minerals) and TSNB107 (dioptase, "Very
common", but "extremely rare (or possibly even absent) in the first oxidation zone"). Koenigsberger
1919 — the Aar-granite cleft types 1, 1′, 1″ and diorite type 5. **Confirmed independently by review round 1:** Teale 1979; García-Ruiz et al. 2007; Bastin 1914;
Weeks & Thompson 1954; Sukheswala et al. 1974; Heaney & Fisher 2003; Eggleton et al. 2011; Proust &
Fontaine 2007. One research-pass claim was overturned by the data: Sulphur Bank metacinnabar is
documented (a Mineralienatlas photograph).

Each round's entry below gives the section and step numbers and the figures as they were in that
round; round 5 moved §8's steps 4–7 to 5–8.

**Review round 1 of 5 (one reviewer, adversarial): 6/10.** It confirmed the instruments, the data
totals, the scoreboard and about 60 numbers, and found (the figures in this list are as of round 1;
round 2 revised several of them):
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

**Review round 2 of 5 (one reviewer, adversarial): 7/10.** It confirmed the round-1 corrections and
found four problems that had to be fixed, all now fixed (the figures in this entry are as of round 2;
round 3 revised several):
- **The gate reader missed a plain `existing`.** The drafts recognised the strict and soft idioms only
  when the species' crystal list had a suffixed name, so 32 soft gates written with a plain
  `existing` (24 on species that form in the panel: epidote, titanite, grossular, diopside,
  vesuvianite, the zeolites, the amphiboles, chalcedony, tiger's eye, andalusite, dioptase…) were
  filed as cap-only, and goethite's and enargite's strict gates were missed. The tool now reads each
  species' gate from its own code and prints the line; an active-capped class is split out; the beryl
  and corundum varieties are read in their shared loops.
  P(in the simulator's top three | visible) became 0/13 strict (was 2/13), 20/23 soft (10/12), 4/5
  cap-only (15/17).
- **Ties leaked the answer into the simulator's ranking.** The top three was cut from rows already
  sorted by real share, so species tied at one crystal per vug were ranked by the record they were
  being compared with. Ranks now come from values alone, ties are shown, and a verdict that depends on
  how a tie breaks is TIE-DEPENDENT (Viburnum, Cruzeiro). The drafts' two strict "hits" were Elmwood
  ties broken this way.
- **The bootstrap resampled only the seeds.** The photographs and listing mentions are now resampled
  too: the median band goes from 0.02 to 0.20, and four verdicts change in ≥ 20 % of resamples. The
  narrow seed bands are explained — 180 of 311 pairs have the same visible count in every seed.
- **F2's counts.** "21 species" were 21 cases covering 19 species; Roughton Gill's mottramite was a
  false positive ("trace V"). The author also set aside Schneeberg's quartz (an "accessory" contract
  role in a reason that calls it fundamental gangue). Now 36 cases (29 species): 19 hold by visible
  count, 7 by volume, 6 both ways.

The suggested improvements, all made: gate definitions stated (§4.1); the gate claim limited to rank by
count (by volume 6/13 against 20/28 — §1, §4.1, §8 step 5); step 5 no longer warns of quartz swarms
(quartz is soft) and counts 24 strict gates; quartz in the reactivated vein added to the never-forming
list (now 20 named); every scenario's bands shown, including Colorado's and Asbestos-surficial's;
Wittichen barite reaches 1 mm in 3 of 21 seeds; the micromount ρ moved into the tool, and §7 quotes
it; §2.3 counts the S and R classes, and §5.2 marks Tsumeb's snippet-level ratings (anglesite is
"Common"); Sunnyside's sources name tetrahedrite; wording fixed on Cruzeiro's and Ouro Preto's
quartz, Grimsel's visible leaders and Deccan's quartz volume; Phillips et al. 2005 and Laurs et al.
1998 marked as not read first-hand; Ross's cinnabar sentence covers two districts. One regression in
the revision was caught before commit: acanthite and thenardite nucleate on their own as well as
forming from argentite and mirabilite, and the first version of the new reader filed them as
transformation products; they are cap-only.

**Review round 3 of 5 (one reviewer, adversarial): 8/10.** It confirmed round 2's fixes — the gate
reader matches the code for all 184 species, the tie handling and the proxy bootstrap are sound, and
about 100 numbers match — and found three problems that had to be fixed, all now fixed:
- **"Visible" counted crystals sealed inside other crystals** (as round 3 read the flag; round 4
  showed it is a footprint projection — see below). One crystal in ten that reached 1 mm
  (1,089 of 11,151 in the locality scenarios) was enclosed in another. The census now records exposed
  counts (version 2, re-run in full; every shared field identical), and "visible" means exposed and
  ≥ 1 mm throughout. Sunnyside becomes PARTLY (70 % of its argentite ≥ 1 mm is sealed), six simulator
  top threes change, and Tsumeb's smithsonite and azurite turn out to be sealed in every seed, which
  adds a "sealed" class beside dust.
- **The fate table counted slots the review itself rules out of scope.** Four never-forming slots
  belong to species the scenario does not claim (the North Pennines barite cavity's fluorite, galena
  and quartz; Naica's fluorite); the tool now sets them aside with the reason. With the exposed
  measure, dust (15) and engines that never fire (14) are the two largest classes, about equal — not
  non-firing engines alone.
- **Bimbowrie's AGREES came from a market-wide search.** Its listing record includes "chiastolite"
  from any locality; the data file now marks that search market-wide, so it does not vote, and
  Bimbowrie is THIN with its literature agreeing. No scenario now agrees outright on the proxies.

The suggested improvements, all made: the slot rule described as coded; hand-coded lifetime caps added
to the gate census (17 species in 16 functions — §4.1, §8 step 5, F1b); todorokite read as a pure
transformation product and the selenite ⇄ anhydrite replacement noted; the two raw captures committed
and checked on every run; the unsaved listing titles and the classifier's unguarded routes stated,
with the margins they could cross; a share floor for fate slots stated (it removes nothing — the
low-share slots are literature-rated); Gratz 1986 identified as a Gordonsville thesis; the Searles
tincalconite paraphrase replaced with Smith & Haines's words; Cripple Creek's K-feldspar, Bisbee's
cuprite and the three market-reference captures stated; the bootstrap's Monte-Carlo spread measured
(§3, §7). From its literature checks: Rowan's "somewhat rare" coarse sphalerite added at Viburnum;
Searles calcite and tincalconite now V; the Kansas tonnage given in short tons; four Jeffrey classes
lowered from "common" to "documented"; Dias et al.'s Ametista sentence attributed to the right
deposit.

**Review round 4 of 5 (one reviewer, adversarial): 8/10.** It reproduced round 3's work — tool
output, hashes, census determinism, the provenance check and about 80 numbers — and found that both of
round 3's interpretive fixes claimed too much, plus one wrong citation and three wrong numbers:
- **The enclosure flag is a footprint projection, not overgrowth.** `_check_enclosure` flags a stalled
  crystal when a growing neighbour more than three times its size reaches it with its painted
  footprint; the code calls the flag "a convenient rendering/topology projection". In the reviewer's
  probe, 95 of 98 flagged crystals ≥ 1 mm were flagged by footprint overlap, a median 21 mm from the
  host's anchor; 72 of the hosts were crusts or aggregates (Tsumeb's and Bingham's molybdate crusts,
  Sunnyside's manganocalcite crust, the Great Salt Plains' selenite roses). The review now describes
  the flag as the code defines it, works every verdict out both ways (Sunnyside is MEASURE-DEPENDENT),
  calls the former "sealed" cases "flagged" and folds them into the molybdate counts, qualifies the
  Great Salt Plains sentence, adds the crusts to §7's aggregate caveat, and sends the flag's sideways
  reach to the boss as a simulator finding (§4.4, §8 step 6).
- **The scope rule ran one way.** The set-asides were applied only to failures, and the never-forming
  slots all turned out to be species their scenarios never list (8) or list only as aspirational (5).
  The rule is now stated — set aside a species whose record comes from a part of the deposit the
  scenario does not model — and applied to every slot: Cripple Creek's native gold (oxidized ore;
  the scenario is the primary vein) is set aside although the simulator ranks it second, and the
  North Pennines barite cavity is OUT OF SCOPE instead of a DISAGREES. Every slot now carries its
  contract status, and §8 step 3 starts with the boss's contract decision.
- **Deccan goethite:** Ottens et al. 2022 report it (crystals up to 2 mm near Sinnar); now RA.
- **Numbers:** §2.3's not-V count, §8 step 5's "6 times in 13", and §5.2's "the two 'Very common'
  species" (two of the five).
The suggested improvements, all made: the locality-frequency contract credited (§2.1, §8 step 1);
Herkimer calcite lowered to "documented", so the floor now sets it aside; Tsumeb's pyromorphite,
descloizite and cerussite raised to V; §8 step 3 lists all 13 never-forming slots and names dioptase
and dolomite as no-shows outside the fate table; "What holds" no longer says Tormiq's titanite leads
both sides; the Roughton Gill GCR quote marked as unverified. Its other literature checks (Proctor
1985, Sauer et al. 1996, the US FWS selenite brochure, Hoisington) supported the classes used.

**Review round 5 of 5 (one reviewer, adversarial): 8.5/10.** It reproduced round 4's work — two
byte-identical runs of the comparison, the appendix, the hashes and the provenance check, five
single-seed probes that match their census rows exactly, and about 150 numbers — and found two
problems that had to be fixed, now fixed:
- **§8 scheduled the enclosure decision after the count retunes it would undo.** The species cap skips
  flagged crystals and a flagged crystal stops growing, so the flag makes counts (Searles' celestine 8.9
  per vug against a cap of 6; Bisbee's native gold 13.0 against 4). The comparison now lists every
  (scenario, species) pair above its cap — 58, the largest Tri-State's barite at 55.6 against 6 — §4.4
  says how the flag makes counts, and the enclosure rule is §8 step 4, before F2 and the strict gate.
  Step 1 now states its cost: `data/scenarios.json5` is hashed and bundled, so the targets can start in
  a side file.
- **Three statements were wrong as written:** the PR description's "46 snippet-level" classes (41 at
  the time); §5.5's "Titanite and epidote lead both sides" at Tormiq (the simulator's order is epidote,
  actinolite, titanite); and §4.4's Tsumeb row, which put every flagged species under the molybdate
  crusts — banded malachite, brochantite crusts and wulfenite plates flag some too. §4.4's figures now
  come from a committed probe instead of round 4's scratch outputs, and its reach formula is stated as
  the code computes it (half of each arc plus a cell, not the whole arc).

The suggested improvements, all made. ρ no longer counts species absent from both sides (32 of 468
rows), which had added agreement: the median falls from 0.02 to −0.04 and Deccan becomes DISAGREES,
with the old reading kept as a sensitivity line. The listing classifier's telluride and colour-word
routes are stated (§2.2), and the comparison is re-run counting each listing for its first-named
species only — Cripple Creek's fragile native silver is three mentions, none first-named. The scope
rule now sets aside Naica's calcite (the mine's, like its fluorite) and Tsumeb's dioptase (rare or
absent in the first oxidation zone the scenario models), and the North Pennines reason no longer
claims galena and quartz for the central zone. Searles' halite, which ranked in the simulator's top
three on 2 seeds of 21, now counts as dust (dust 16, top three 21; every gate but strict 21 in 25). The
flip rate's blind spot for TIE- and MEASURE-DEPENDENT verdicts is stated (§2.4). "Never asked for" now
covers only the 7 unlisted species; the 5 aspirational ones are known engine failures. The census
tool's header no longer calls the flag physical enclosure. The vote threshold's sensitivity is
reported (10 scores the Great Salt Plains; 30 makes both Asbestos Hills scenarios and Marlborough
THIN). §4.1 says all 21 top-three slots are contracted. From its literature checks: Tsumeb's
malachite, duftite, calcite, anglesite and powellite are now V, and the author read azurite and
dioptase first-hand; Cripple Creek's hessite and Bisbee's dioptase, inferred from the Handbook's
locality lists, are now ND?; Picher chalcopyrite is "documented" (one cave specimen in Ransome 1935);
Sunnyside's fluorite rests on Guzman et al. (Burbank only "also recognized" it); Burbank 1933, Ransome
1935 and Viola 1897 otherwise supported the classes used. GCR 36 (Roughton Gill) is still unopened by
any review — ten Roughton Gill classes rest on the research pass's reading, as §5.2 and the data file
now say.

**Review round 6 (one reviewer, adversarial; run with the boss's leave after the five-round limit):
8.5/10.** It reproduced round 5's work — byte-identical runs, the appendix, the hashes, the provenance
check, a probe subset matching the committed probe exactly, the seed-42 baseline (351 entries) and
about 180 numbers — and found two statements about how solid the verdicts are that misled, now
fixed:
- **The three choice-dependent verdicts were presented as even splits.** In the joint resamples every
  reading is DISAGREES in 58.5 % (Viburnum), 90.0 % (Cruzeiro) and 57.0 % (Sunnyside), and every reading
  PARTLY in 0, 6.5 and 18.5 %; their PARTLY readings sit on knife-edges — Viburnum's ρ is exactly 0,
  Cruzeiro's 0.0039 with albite at 1.31 % of the record, Sunnyside's lead galena at 1.16 % (5 of 217
  listing mentions, no photograph). The comparison now records every resample's outcome and prints
  these shares and edges; §1, §3 and §5 say so.
- **The "first-named species" line was presented as a test of the title classifier.** It drops every
  second-named species, legitimate associates included, and both verdict changes it reports come from
  associates (Cruzeiro's albite 4 mentions → 0; Sunnyside's galena 5 → 1); only Cripple Creek's native
  silver (3 → 0) bears on a route. It is now "lead species only", a bound; the routes stay unmeasured.

The suggested improvements, all made or answered. The cap table now folds in-place products back
into their parents (borax + tincalconite), marks argentite as a lower bound and leaves out acanthite,
thenardite, selenite and anhydrite, whose census counts mix their own nucleations with converted
crystals: 55 pairs past their cap, 47 with more flagged than dissolved (round 5 said 58 / 49; the
reviewer's estimate was 57 / 47 — the author also left out Roughton Gill's acanthite and Searles'
thenardite on the same rule), and the census header no longer calls `n_total` the nucleation count.
The scope rule is now stated as a presence test, not a provenance test, which keeps Naica's selenite
(the sealed Cave of Crystals' own mineral) and Tsumeb's calcite ("somewhat less common in the upper
levels", TSNB66) in, with the alternative stated (64 slots; every gate but strict 20 in 24). §8 step 3
now says its contract decisions change nothing and its diagnoses wait for step 4, whose
substrate-only option would leave Tri-State's barite as it is — barite now has its place in step 5.
§4.4 classifies hosts by habit instead of by the simulator's `_surfaceGrowth` descriptor, which is
recomputed every step and is not a habit class. Small items: §2.2's round-3 margins are
combined-record shares (12.1 against 10.0 %, 7.4 against 6.5 %); Galena, Kansas added to the
unguarded routes; the Great Salt Plains' threshold-10 verdict rests on the lead rule alone (ρ is
undefined on two rows); §3's legend no longer says "never grows to 1 mm"; pectolite's cap overrun is
one crystal in one seed; Searles' halite is noted in §3 as dust despite its top-three place. From its
literature checks: Tsumeb jarosite (Questionable), mimetite (Common), wulfenite (Common; best from the
second zone) and ferrimolybdite's missing entry are now V; Shigar albite is "common", not "abundant"
(Hu & Lu 2018; Laurs et al. 1998 do not list it); the North Pennines audit puts much of the Nent Valley
in the outer zone, so the Alston Moor page spans both zones.

---

## 10. Reproduce

```
node tools/assemblage-census.mjs --seeds 1-20,42 --workers 4   # .local-evidence/assemblage-census/runs.jsonl
node tools/locality-abundance-compare.mjs                        # .local-evidence/locality-abundance/compare.{md,json}
node tools/enclosure-reach-probe.mjs                             # .local-evidence/enclosure-reach/{probe.json,summary.md}, §4.4
```
The census resumes from its own rows (keyed by scenario, seed and SIM version), so a stopped run picks
up where it stopped; its default is one worker, per AGENTS.md. It refuses a file written by an older
census version (move it aside first). The enclosure probe runs its 27 runs serially in one process
(about 9 minutes, two thirds of it Tsumeb). All three instruments are passive: they write only under
`.local-evidence/`. The proxy data (`proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json`) is a dated
capture; refreshing it means re-running the browser capture described in its `sources` block, and
replacing the raw capture file (`proposals/DATA-LOCALITY-ABUNDANCE-CAPTURE-2026-10-21.json`) that the
comparison checks it against. The generated appendix (`proposals/DATA-LOCALITY-ABUNDANCE-COMPARE-2026-10-21.md`)
is this run's `compare.md`.
