# Locality abundance review — review rounds (2026-10-21)

The review rounds for `REVIEW-LOCALITY-ABUNDANCE-2026-10-21.md`, under the standing rule: one
reviewer per round, up to five rounds, stop at 9/10 or when nothing must be fixed. Each report is
kept in substance — lightly condensed, every finding and number retained; what changed in response is
recorded in the review's §9.

---

## Round 1 of 5 — 6/10 (reviewed commit 69ebf04f)

### Locality-abundance review: round 1 of 5

**Score: 6/10.** The instruments and data hold up, and so does the headline that the ratios don't
match. The causal story behind it (F1/F2), several numbers, and parts of the fix order need
correcting.

No files were modified. The reviewer re-ran `tools/locality-abundance-compare.mjs`; its `compare.md`
and `compare.json` came out byte-identical to the committed appendix.

#### MUST-FIX

1. **F1 claims more than the data shows (§1 item 1, §4.1).** The strict gate can only limit a species
   that actually forms. Of the 28 strictly gated real top-three slots: 11 never form at all (0
   crystals per vug); 4 form only as dust; 11 are one visible crystal, the only cases where the gate is
   the binding cause; 2 are in the sim's top three. Calcite never forms at 5 of its 7 top-three
   localities (Ametista, Herkimer, Naica, Viburnum, Tsumeb). Fluorite never forms at 3 of its 7
   (Cripple Creek, Naica, tn457) and is dust at Grimsel. So "the ratio inverts by construction" and
   "the cause is mostly not chemistry" don't follow. Non-firing engines and dust account for 27 of the
   53 gated slots. The 69 % figure also lumps in soft-gated species (25 of 77 real slots, 26 of the
   sim's 84 — not under-represented); the inversion is strict (36 % of real slots → 6 % of sim slots)
   against cap-only (29 % → 63 %). A cleaner test: P(a real top-three species is also in the sim top
   three | it forms visible crystals) is 2/13 for strict, 10/13 for soft and 15/17 for cap-only.
   Direct evidence also supports the gate: strict species sit at about 1 crystal per vug in 82 of 92
   (species, scenario) pairs.
2. **§4.1 numbers and classes don't match the appendix.** Fleet table gives barite 15.91, anhydrite
   7.28, celestine 6.48 per vug; the doc said 18.4 / 8.1 / 6.6. Lepidocrocite was listed as cap-only
   but is soft-gated (σ > 1.7 and a 25 % roll, `js/84-nucleation-hydroxide.ts:49`). "Twenty-one
   species" was followed by 22 names (wurtzite is strict in code but never survives). "Fluorite at 7
   localities" is 7 scenarios but 6 localities.
3. **Transformation products are treated as nucleating species.** `gateKind()` defaulted every species
   without a `_nuc_` function to "cap-only" — seven species, including tincalconite, haidingerite and
   pararealgar. Searles' tincalconite is borax that dehydrated in place (`js/75-transitions.ts:95`);
   the data file's own note says tincalconite is "common only as an alteration rind on borax".
4. **F2's count includes dust and nuclei that never grew.** 26 % of "surviving" crystals are under
   0.1 mm; at least 580 are zero-size nuclei. Sunnyside's native silver is 4 nuclei with 0 growth
   zones. Counting only visible crystals, 21 of the 38 claims hold; by volume, 8. Six of the 12 table
   rows failed the visible test. "Trace/accessory" normally means volume. The "not promotion …" phrase
   appears only in the mvt reason. The PHREEQC K(T) change is v270 (`js/15-version.ts:12956`), the
   reasons SIM 271, not "SIM 272".
5. **§4.3 "never past 1 mm" is false twice** (Searles halite 2 of 21 seeds, max 3.06 mm; Tormiq quartz
   4 of 21, max 4.07 mm); porphyry tetrahedrite qualifies but was missing; Wittichen and Schneeberg
   entries rested on sources the THIN rule says cannot vote.
6. **Internal contradictions:** Sicily's lead in §1 vs §3/§5.4; "the literature disagrees too" for
   both THIN cases, though Sulphur Bank's literature agrees on cinnabar.
7. **Tsumeb paragraph:** conichalcite is Common, not Extremely rare; vanadinite is 1.8 % of visible
   crystals while cerussite (6.5 %) and azurite (5.8 %) were omitted; ferrimolybdite + powellite is
   54.2 % of volume.
8. **Deccan:** stilbite has 612 listing families, apophyllite 599.
9. **Count vs volume:** "improves in 9, worsens in 9" holds only with an unstated |Δρ| > 0.05 cutoff
   (otherwise 12 / 15 / 2); "the three point the same way" is contradicted by Great Salt Plains, Bisbee
   and Tri-State.
10. **Smaller factual errors:** rhodonite vs manganese ore (Guzman et al. 2024); one Viburnum listing
    names anhydrite; the dictionary hash `5d355644…` is of the entries' JSON, not of the file
    (`d6d8baed…`).

#### SHOULD-FIX

- Verdicts are fragile near ρ = 0 (10 of 28 within ±0.11); Cripple Creek turns on a 0.9 % vs 1 %
  threshold; Bimbowrie cannot reach AGREES with one visible species. The broad mismatch is robust
  (median ρ ≤ 0.08 under volume, visible presence, engine-only species or a top-5 union) — say so and
  report a noise band.
- State why count is the right sim measure; document the actual Spearman union (the tool header was
  out of date); zero-padding makes ρ largely a set-overlap statistic.
- Literature status: snippet-level classes in "lit: rare" unmarked; Bingham brochantite unclassified;
  Elmwood celestine "uncommon" attributed to a paper seen as title only; R-status entries; "mindat
  snippet" classes despite §2's "Mindat was not used"; the "eleven" first-hand checks not enumerated.
- Project history: the dolomite evidence cuts against the July defence — say so and route it; the
  July review already found mvt greenockite outnumbering sphalerite and named the lever (Cd/Ag
  partition into the host sulfide).
- Fix-order traps: step 2 needs a rebuild and rebake (`data/minerals.json` is hashed release content
  and embedded in the `file://` bundle); step 3's single lever doesn't fit transformation products,
  partitioning species or zero-size nuclei; step 5's growth calibration is global; step 4 will re-move
  step 3; non-firing engines (the largest class) were missing.
- Caveats: aggregate habits counted as crystals; five localities sum two Mineralienatlas IDs (nesting
  unchecked); family dedupe merges distinct specimens with generic titles.
- Small fixes: Deccan's no-engine share excludes laumontite (25.8 % with it); KGS 23:4 ≈ 6:1;
  Ametista quartz's maximum 0.87 mm (0.84 is the median); "small amounts" is uranophane, not opal;
  Bastin's tin sentence is about the western Erzgebirge generally; `x:` marks missing on several
  no-engine species; "calcite's fleet median" is a mean, and its highest counts come from enclosure
  turnover, not cave mode.

#### What is solid

- Census: all 41 seed-42 rows match `seed42_v285` (0 mismatches across 351 species entries); 861
  unique rows from one SIM version; every scenario at its authored duration.
- Data totals verified (36 pages / 6,736 photos; 72 queries / 15,190 listings / 9,822 families; 363
  dictionary entries; 63 sources / 278 classes); classifier spot-tests clean.
- §3 scoreboard matches the generated one row for row; about 60 numbers in §5 match the appendix.
- Gate classes correct where read (calcite, aragonite, dolomite, fluorite, sphalerite, malachite
  strict; galena, quartz, cerussite, topaz, tourmaline, lepidocrocite soft; barite, celestine,
  anhydrite cap-only with a 15–16 % roll). F1b confirmed (`minerals.json:14` vs `85b:716`).
- Eight further citations real, with the quoted wording: Teale 1979; García-Ruiz et al. 2007; Bastin
  1914; Weeks & Thompson 1954; Sukheswala et al. 1974; Heaney & Fisher 2003; Eggleton et al. 2011;
  Proust & Fontaine 2007.
- §7's proxy caveats and §8's two "obvious-fix" traps are good.

**Response:** every MUST-FIX and SHOULD-FIX item above is addressed in the revision; the review's §9
lists what changed. Two figures in the revision differ slightly from the reviewer's scratch scripts:
the revised tool gives 10/12 for the soft class's conditional (the reviewer's 10/13), and 72 of 92
strict pairs at ≤ 1.25 crystals per vug (the reviewer's "about 1" band gave 82). The revision quotes the
tool's figures.

---

## Round 2 of 5 — 7/10 (reviewed commit 702f9e43)

### Locality-abundance review: round 2 of 5

**Score: 7/10.** Round 1's must-fix items are fixed in substance, and about 90 numbers re-checked
against the regenerated appendix match. The headline still holds: the ratios don't match, never-firing
engines are the largest failure class, and strict gates pin species counts at about one. Four
problems need fixing before this goes to the boss: the tool's gate taxonomy is misclassified; a
tie-break leaks the real ranking into the simulator's top three and moves two verdicts; the
uncertainty claim overreaches; two F2 counts in §1 are wrong.

The reviewer re-ran `node tools/locality-abundance-compare.mjs`: its `compare.md` equals the appendix
after the header comment, and the header hashes match (runs.jsonl `1f44838c…`, data `5c825fbe…`,
dictionary `5d355644…`). No worktree files were modified.

#### MUST-FIX

1. **`gateKind` files 25 fleet species as "cap-only" when they are gated** (tool:337–339). The regexes
   only match variables named `existing_<suffix>`; 32 `_nuc_` functions use a plain `existing` with
   the same soft gate — e.g. epidote, `if (!existing.length || (sigma > 2.0 && rng.random() < 0.20))`
   (`js/89-nucleation-silicate.ts:805`); also titanite :834, grossular :866, diopside :893,
   vesuvianite :927, stilbite :998, heulandite :1025, andalusite :346, chalcedony :44, tigers_eye
   :670 and the amphiboles (`js/89a:35–121`). Strict gates filed as cap-only: goethite
   (`js/84:22–25`, `ordinaryBirthAllowed = !existing_goe_active.length`) and enargite (`js/91:566`,
   `if (existing.length) return;`). Corrected: fleet species strict / soft / cap-only 22 / 54 / 55
   (tool 21 / 30 / 80); real top-three slots 28 / 41 / 6 (28 / 25 / 22); P(in sim top three |
   visible) soft 21/24 (10/12), cap-only 4/5 (15/17); sim top-three slots soft / cap-only 40 / 36
   (26 / 50). What survives: all 21 tool-strict matches are genuine, so strict stays 2/13 and the
   strict-versus-rest contrast holds. Round 1 missed it because none of its 12 spot-checked species
   uses a plain `existing`.
2. **Sim-side ties are broken by the real ranking.** `top()` (tool:209) stable-sorts rows already
   sorted by real share (tool:206), so species with equal simulator shares keep the record's order.
   Two verdicts depend on it: Viburnum (galena and sphalerite tied at 1.00 visible per vug;
   sphalerite's real share 0.33 %) and Cruzeiro (albite and feldspar tied at 1.90; feldspar 0.33 %).
   With a reverse-alphabetical tie-break both become DISAGREES: 21 disagree / 6 partly instead of
   19 / 8. Both strict "in the sim top three" slots are Elmwood ties (fluorite, calcite and sphalerite
   all at 1.00); counting ties as in, strict is 4/13 against 25/29 for the rest. Fix: a tie-aware
   rule, with the ties disclosed.
3. **"Verdicts are stable … Cruzeiro, the one unstable verdict" overclaims.** The bootstrap resamples
   seeds only. Resampling the photographs and listing mentions too (multinomial, simulator fixed)
   gives a median band of 0.18 against 0.02, and six verdicts flip in at least 28 % of resamples:
   Sunnyside 51 %, Cruzeiro 41 %, Cripple Creek 34 %, Ouro Preto 33 %, tn457 32 %, Viburnum 28 %
   (indicative: each photograph and mention is treated as independent). The seed bands are narrow
   because 183 of 355 (scenario, species) pairs (52 %) have identical counts in all 21 seeds, which
   the document never says; several points sit at the edge of their own band (Searles −0.13
   [−0.40, −0.13]).
4. **F2 counts are wrong in §1, §4.2 and §5.2.** "Twenty-one species … eight also out-weigh them in
   volume" is 21 cases covering 19 species; only 7 of them also hold by volume (the 8th volume case,
   Sunnyside tennantite, fails the visible test). Roughton Gill's mottramite is a false positive: "the
   scenario's trace V is specifically retained for this phase" — the trace is the vanadium. Corrected:
   37 cases, 20 holding by visible count, "trace" 3; §5.2's "'trace' in its own reason" is a misreading.

#### SHOULD-FIX

- Gate definitions (§4.1): soft rolls are 15–30 % at σ 1.4–2.5, not "~30 % at σ > ~2"; most
  "cap-only" functions also cap active crystals (`existing.length >= 2…5`; Wittichen skutterudite and
  safflorite at 2), so "max_nucleation_count is the only bound" is false.
- §8 step 5: quartz is soft-gated, so the "swarm calcite and quartz" trap doesn't apply to it; "21
  strict gates" should be at least 24 functions; "(F1b's mechanism)" collides with F1b, the
  documentation drift.
- §1 "the gate decides its rank" holds for count rank only: by volume strict species reach the sim
  top three 6/13 against 20/29, because the gate concentrates mass in one crystal (Bisbee malachite
  43 %, Tri-State calcite 94 % of volume).
- §4.1(a) says 20 but names 19: quartz in reactivated_fluorite_vein is missing.
- §3 omits two bands that differ from the point value: Colorado −0.19 [−0.19, −0.18], Asbestos
  surficial 0.10 [0.07, 0.11].
- §4.3: Wittichen barite also reaches 1 mm, in 3 of 21 seeds.
- §7 micromount ρ: no committed tool produces these figures; the reviewer's n_01 reproduction gives
  Tsumeb −0.68 (doc −0.63), Schneeberg −0.43 (−0.42), Wittichen −0.56, Roughton −0.10. The direction
  holds; the computation belongs in the tool.
- §2.3 "a few classes … mindat snippet": 46 classes are S and 3 R (18 % of 278); 21 of the S are
  Tsumeb's Harvard ratings, which §5.2 states as fact (only smithsonite and scorodite were read, V);
  §5.2's phrasing also tags anglesite "Extremely rare" by juxtaposition, though its rating is "Common".
- §5.3 Sunnyside: Guzman et al. write "Aikinite, bornite, and tetrahedrite are locally abundant", and
  Burbank 1933 (per the data file) "a little tetrahedrite"; tetrahedrite is the usual silver carrier.
  Reword "no silver mineral is named" to "no argentite/acanthite"; the argentite finding stands.
- Wording: Cruzeiro and Ouro Preto leave out their visible quartz (30 % and 25 % of visible
  crystals); Grimsel's "leaders" are ranked by surviving count while §3 ranks by visible count
  (epidote is 0.81 visible per vug there); Deccan's "78 % of the volume" is quartz alone.

#### Literature spot-checks (none checked in earlier rounds)

- Kane & Kammerling 1992 — real, supported: the quote is verbatim in a map caption, and
  washing-plant production backs it (spinel 8,054 ct against ruby 7,471 ct). Mogok's "calcite AB"
  refers to the host marble, not cavity crystals.
- Keller 1983 — real, supported: "The potassium feldspar is now totally altered to kaolinite"
  (p. 15) and "900 tons … about 9 kg" a day (p. 17) verbatim.
- Ross 1940 (USGS Bull. 922-L) — real, supported: cinnabar "the most abundant metallic mineral in
  both districts" (p. 338; the claim covers the two districts together), the opal replacement and the
  sulphur quarry (p. 340) verbatim; orpiment and realgar absent, as the document says.
- Guzman et al. 2024 — real; both quotes verbatim (see the tetrahedrite note).
- Petersen 1868 (Poggendorff's Ann. 134) — real, supported: "Vorherrschend sind: Speiskobalt …
  Erdkobalt … Gediegen Silber", Kobaltblüthe "sehr häufig", "Pharmakolith nicht selten" and the
  barite vein fill verbatim; Petersen relays Vogelgesang's list.
- Phillips et al. 2005 — real, partly supported: Porter (ed.) 2005, v. 1, pp. 243–257; the abstract
  supports the main-stage list and molybdenite in quartz veins; the ">50 % of the rock" figure could
  not be checked (full text paywalled).
- Laurs et al. 1998 — real, Table 1 not verified: Can. Mineral. 36:1–47, on Stak Nala; the RRUFF copy
  sits behind a human-check page, which the reviewer did not try to bypass.

#### Round 1's must-fix items: status

All ten done: fate table and conditional test (soft / cap-only numbers wrong — MUST-FIX 1); §4.1
numbers and classes (goethite and enargite missing); transformation products; F2 dust (§1 counts off —
MUST-FIX 4); dust criterion; internal contradictions; Tsumeb paragraph; Deccan 612 / 599; count vs
volume; small factual errors.

#### What is solid

- Census: the seed-42 counts independently re-checked against `seed42_v285` (all 351 entries
  match); the 26.2 % under 0.1 mm and the 580 zero-size nuclei check.
- Bootstrap mechanics correct: reimplemented, every band reproduced exactly.
- The §3 rows, the §4.3 dust table and about 60 §5 numbers match `compare.json`.
- Code citations correct: `82:36`, `_AIR_MODE_NUCLEATION_PROB` = 0.06, `75-transitions:95–100` and
  `474`, `15-version:12956`; the `minerals.json:14` vs `85b-simulator-nucleate:716` drift confirmed.
- All 20 never-forming slots genuinely never nucleate (n_total = 0 in every seed) — none is
  nucleate-then-dissolve.
- July-review cross-references accurate (that document's lines 130–132, 140, 175–176, 188–190).
- §8 facts: ludlockite 20 vs anglesite 12 photos, anhydrite cap 8 with a 16 % roll, quartz in 19
  scenarios.

**Response:** every MUST-FIX and SHOULD-FIX item is addressed; the review's §9 lists the changes. Where
the revised tool's figures differ from the reviewer's scratch scripts, the revision quotes the tool,
and the differences have known causes:
- The gate reader now also reads the beryl and corundum selector loops and the Mn-oxide helper (all
  soft) and splits out an active-capped class: the fleet is 22 strict / 55 soft / 10 active-capped /
  46 cap-only / 5 transformation.
- Ties are reported, not broken: Viburnum and Cruzeiro are TIE-DEPENDENT (DISAGREES or PARTLY)
  rather than DISAGREES. The real side's own ties (Grimsel's epidote or rutile, Schneeberg's eulytine
  or native silver) are set aside, so the fate table has 76 slots, and P(top three | visible) is 0/13
  strict, 20/23 soft, 4/5 cap-only and 24/28 for every gate but strict (6/13 against 20/28 by volume).
- The proxy bootstrap gives a median band of 0.17 (proxies alone) and 0.20 (with the seeds). With the
  TIE-DEPENDENT verdicts reported as such, four verdicts change in ≥ 20 % of joint resamples
  (Sunnyside 53 %, Ouro Preto 40 %, Cripple Creek 39 %, tn457 30 %).
- The identical-in-every-seed count is 180 of 311 pairs, counted over the 28 scored scenarios.
- F2 is 36 cases, 19 by visible count: besides mottramite, the author set aside Schneeberg's quartz,
  whose "accessory" is a contract role in a reason that calls it "fundamental vein and pegmatite
  gangue".
- The tool's micromount ρ is Tsumeb −0.63, Schneeberg −0.42, Wittichen −0.56, Roughton −0.10.

---

## Round 3 of 5 — 8/10 (reviewed commit 1eed3de0)

### Locality-abundance review: round 3 of 5

**Score: 8/10.** Round 2's four must-fix items are fixed and hold up under an independent check: the
gate reader matches the code for all 184 species; ties are enumerated, not broken by the record; the
proxy bootstrap is sound and gives the same result under other random seeds; the F2 counts
reproduce. The tool re-runs byte-identically, and about 100 numbers in the document match
`compare.json`. The headline ("the ratios don't match") survives, and so does the strict gate as a
count lever. Three new problems must be fixed before this goes to the boss.

#### MUST-FIX

1. **The cause ranking counts slots the document rules out of scope** (review §1, §4.1, §8). Of the
   20 "never forms" slots, four are ones §5 calls outside the scenario's claim — tn457's fluorite,
   galena and quartz ("a scope question, not an error") and Naica's fluorite ("outside its claim") —
   and two more are Bimbowrie's quartz and chalcedony (item 2). Without these six: never forms 14,
   dust 15, visible but outside the top three 12, tied 5, in the top three 24 — 70 slots. Dust and
   non-firing engines are about equal, so "non-forming engines are the largest failure" does not
   hold. Knock-ons: "fluorite never forms at 3 of its 7 scenarios" has one in-scope case (Cripple
   Creek); §8 step 3 proposes fixing fluorite at Naica, which contradicts §5.4. Unaffected: the
   conditional test (none of the six slots is visible) and the 37 % strict share (26/70). Fix: a
   scope flag per slot in the fate table; restate §1 item 1 and §4.1(a); drop Naica fluorite from
   step 3.
2. **Bimbowrie's AGREES rests on a market-wide search that is never disclosed.** The data file's
   queries are `["bimbowrie","chiastolite"]` and its locality name says "(+ chiastolite market-wide)".
   The 3 photographs do not vote, so the whole real record is titles from a worldwide chiastolite
   search, andalusite by construction (57 of 64 mentions). ρ = 0.66 is not a Bimbowrie measure;
   quartz (3 listing families) and chalcedony (2), with no literature behind them, become "headline"
   slots that never form. The AGREES rule was relaxed after round 1 (min(2, size of the sim's top
   three)) for this one scenario. Fix: disclose it in §1, §3 and §5.6, rest the verdict on Teale 1979,
   and remove Bimbowrie's quartz and chalcedony from §4.1(a).
3. **"Visible" includes crystals enclosed inside other crystals.** From the census `n_encl` bounds,
   965–1,513 of the 11,151 visible crystals in the 33 locality scenarios (8.7–13.6 %) sit inside
   another crystal. A 21-seed probe splitting ≥ 1 mm crystals by `enclosed_by`: Sunnyside argentite
   3.19 → 0.95 exposed per vug (70 % enclosed); porphyry acanthite 4.00 → 2.24, with galena replacing
   it in the sim top three; Jeffrey unchanged. Re-scored with exposed counts, Sunnyside's ρ goes from
   −0.01 to +0.07 and DISAGREES becomes PARTLY (galena, 1.16 % of the record, stays the lead). The
   census bounds put 94–100 % of Bisbee's "visible" jarosite and 47–55 % of its atacamite inside other
   crystals. The Sunnyside sentence fails twice: 6.4 per vug is the surviving count, and most of its
   3.19 visible argentite crystals are enclosed. Fix: an exposed-visible count in the census, or the
   bounds; rewrite the Sunnyside paragraph and its "lit: rare" cell.

#### SHOULD-FIX

- **Slot rule misdescribed.** §1 says the slots are the "three most-recorded species that the
  simulator has an engine for"; the code takes the real top three and drops species with no engine
  (Colorado contributes 0 slots, Mogok and Searles 1 each).
- **Lifetime caps are missing from the gate taxonomy.** Sixteen functions carry hand-coded
  `total_<m>` caps that count every crystal ever made, dissolved and enclosed included. They bind 7
  of the 24 strict species (malachite and smithsonite ≤ 3, `js/82:204–205, 230–231`; mimetite,
  hematite and goethite ≤ 3; adamite ≤ 4; wulfenite ≤ 2) and 10 soft species (galena < 8, feldspar
  < 6, albite and selenite < 4, …). §8 step 5 would still leave those seven strict species at 2–4
  crystals; F1b should note that these totals do count "active + dissolved".
- **Two in-place routes are missed.** `_nuc_todorokite` (`js/87:171–199`) never calls
  `sim.nucleate`; it converts birnessite in place, so todorokite is a seventh pure transformation
  product, filed as cap-only. The selenite ⇄ anhydrite replacement (`js/75-transitions.ts:255–285`)
  is not detected. No effect on the panel: seed-42 runs show every anhydrite and selenite nucleated
  as itself.
- **Provenance hashes don't reproduce.** `b56cf638…` (photos) and `cbb9cb8b…` (listings) don't come
  out of the data file with the documented recipe (about 50 serialisations tried). Commit the snippet
  that made them.
- **Titles are not stored**, so the classifier can't be audited on real data. Synthetic titles show
  three unguarded routes: "copper" before an unlisted word ("Chrysocolla Copper Bisbee" → native
  copper); "Trona" (the town) at the end of a title → x:trona; "Ruby Spinel" → both ruby and spinel.
  Margins these could cross: Bisbee native copper vs cuprite, 12.1 vs 10.1 %; Searles trona vs
  sulfohalite, 7.6 vs 6.5 %. No fate count changes. Commit the family titles.
- **No share floor for "headline" slots.** Five of the 76 are under 5 % of the record: Herkimer
  calcite 0.9 %, Bimbowrie chalcedony 3.1 %, Cruzeiro lepidolite 3.3 %, Marlborough chalcedony 4.0 %,
  Bimbowrie quartz 4.7 %.
- **Citations.** Gratz 1986 is a thesis on the Gordonsville Mine; say so. At Searles, "common only as
  an alteration rind on borax" is the research pass's paraphrase set in quotation marks; Smith &
  Haines say the rind forms after borax is exposed to dry air, i.e. after recovery — which
  strengthens the point that the simulator converts all of its borax.
- **Wording.** Cripple Creek omits the simulator's visible K-feldspar ×2; Bisbee's "cuprite barely
  (median 0.36 mm)" reads as passing 1 mm, which cuprite never does; "72 searches, 15,190 listings,
  9,822 families" include three captures that feed no scenario (Cumbria, Skardu and Haramosh: 2,213
  listings, 1,659 families).
- **State the Monte-Carlo error.** With three other random seeds, the same four scenarios exceed
  20 %: Sunnyside 45–54 %, Ouro Preto 38–44 %, Cripple Creek 30–40 %, tn457 25–32 %. Median bands are
  0.18 (proxies) and 0.19–0.22 (both).

#### Literature spot-checks (none checked by earlier rounds)

- Rowan 1987, USGS OFR 87-675 (scan) — supported: "the abundant hydrothermal gangue dolomite"
  (p. 4), most abundant at Sweetwater and Fletcher, vug-lining crystals 1–8 mm; "Calcite is
  predominantly a late stage mineral" (p. 2, after Roedder 1977); coarse sphalerite is "somewhat
  rare".
- Smith & Haines 1964, USGS Bull. 1181-P — supported: the celestite sentence verbatim; "Primary
  crystals of tincalconite have been reported only twice from Searles Lake"; calcite "much less
  common than aragonite" (that class is S in the data file and can become V).
- Brosius & Sawin 2001, KGS PIC 17 — supported: 23 million tons of zinc against 4 million tons of
  lead concentrates (p. 2) — US tons, so "Mt" is loose; sphalerite five times as abundant as galena
  (p. 3).
- Normand & Williams-Jones 2007 — partly supported: a figure caption calls diopside abundant (AB is
  fine); prehnite, wollastonite, zoisite and chlorite appear only in a list of characteristic
  minerals, so their "CO" is generous.
- Gratz 1986 — real; the abstract matches the data file, but the subject is Gordonsville.
- Rouwendaal et al. 2025 — supported: sulfur dispersed in calcite cement; celestine occasionally fills
  pores.
- Dias et al. 2019 — supported; the statement is about Rio Grande do Sul amethyst, made inside a
  Minas Gerais paper.
- Handbook of Mineralogy, greenockite — supported: mostly earthy coatings; Joplin district, on
  sphalerite.
- GCR vol. 36, ch. 3 — not opened (over the fetch limit; the mirror returned 502).

#### Round 2's must-fix items: status

All four fixed. Gate classifier: every own-list use in js/80–91 dumped for all 184 species, classes
match the code, including the beryl and corundum loops, the Mn helper, raspite, goethite and enargite.
Tie-break leak: `topTie`, `combos` and `same` correct; leads enumerated; Viburnum and Cruzeiro
re-derived. Seed-only bootstrap: multinomial resampling keeps totals (THIN voting unchanged), the
subset rule is correct, three other random seeds reproduce the result. F2: 36 / 29 / 19 / 7 / 6
reproduce; all 36 reasons read; none of the 184 reasons uses "uncommon", "occasional", "sporadic",
"small" or "few".

#### What is solid

- The tool (2.9 s) re-runs byte-identically; the appendix body equals `compare.md` apart from one
  leading blank line; header hashes `1f44838c…`, `4b648a42…` and `5d355644…` match.
- About 100 numbers checked against `compare.json`, all matching except as noted: all 33 scoreboard
  rows, the fate and conditional tables, the fleet gate table, the F2 and dust tables, the §5 values.
- An independent Spearman implementation reproduces ρ exactly (Sunnyside −0.009, porphyry −0.328,
  Jeffrey 0.202).
- Code citations verified: `minerals.json:14`, `85b:716`, `82:28, 36`, `15-version:12956`,
  `75-transitions:95–100, 474`, `BACKLOG.md:276` (celestine 2 → 6).
- Literature and data totals reproduce: 63 source entries; 278 classes (229 V / 46 S / 3 R); 36
  pages; 6,736 photos; 72 searches; 15,190 listings; 9,822 families.
- The strict-gate finding survives every correction above: 0/13 vs 24/28 by count, 6/13 vs 20/28 by
  volume.

**Response:** every MUST-FIX and SHOULD-FIX item is addressed; the review's §9 lists the changes. How
each landed, where the outcome differs from the reviewer's expectation:
- **Enclosed crystals:** fixed at the source rather than by bounds. The census (version 2) records
  exposed counts and the largest exposed crystal; the full 861-run panel was re-run (35.7 min, 12
  workers), and every field it shares with version 1 is identical. 1,089 of 11,151 visible crystals
  (9.8 %) were enclosed, inside the reviewer's 965–1,513 bound. Sunnyside becomes PARTLY (ρ +0.07, as
  the reviewer measured); six simulator top threes change (Bisbee, Ouro Preto, Bingham, Schneeberg,
  Sunnyside, Wittichen). Tsumeb's smithsonite and azurite turn out to be enclosed in every seed, so the
  fate table gains a "sealed inside other crystals" column beside dust.
- **Scope:** the four out-of-claim slots are set aside in the tool with reasons; Bimbowrie no longer
  contributes slots. With the exposed measure the fate table is 69 slots: never forms 14, dust 15,
  sealed 2, visible outside the top three 9, tied 6, in the top three 23 — the reviewer's "about
  equal" holds. The conditional test becomes 0/11 strict (5/11 counting ties) against 23/27 for the
  rest, 6/11 against 19/27 by volume.
- **Bimbowrie:** the data file marks the "chiastolite" search market-wide; listings from it do not
  vote, so Bimbowrie is THIN and its verdict rests on Teale 1979. The verdict tally is 0 AGREES, 7
  PARTLY, 18 DISAGREES, 2 TIE-DEPENDENT, 3 NO VISIBLE CRYSTALS, 3 THIN. The relaxed AGREES rule stays
  (it is the right rule for a one-species top three) but now decides no verdict.
- **Provenance:** the reviewer could not reproduce the hashes because the two raw captures had never
  been committed. Both reproduce exactly from them (`key\npairs\n` over sorted keys for the
  photographs; `JSON.stringify` of the listing summary), so they are now committed and the tool checks
  them, and every data-file count against them, on every run.
- **Titles:** they were classified inside the browser page and never saved, so they cannot be
  committed. The review now says so and gives the reviewer's three unguarded routes and the two margins
  they could cross.
- **Share floor:** applied (5 % of the record, or a literature class of abundant or common). It removes
  nothing: Bimbowrie's two low-share slots are gone with its market-wide record, and Herkimer calcite,
  Cruzeiro lepidolite and Marlborough chalcedony are literature-rated common or abundant.
- **Lifetime caps and in-place routes:** 17 species in 16 functions, as the reviewer counted;
  todorokite is a transformation product (`_nuc_todorokite` has no `sim.nucleate` call), and the
  selenite ⇄ anhydrite replacement is read from `js/75-transitions.ts:262`.
- **Monte-Carlo error:** measured in the tool with three extra bootstrap seeds — median joint band
  0.19–0.22; the same four verdicts stay above 20 % (Sunnyside 40–48 %, Ouro Preto 35–45 %, Cripple
  Creek 34–39 %, the barite cavity 24–34 %), and Roughton Gill reaches 21 % once.
- **F2:** with exposed counts, 20 of the 36 cases hold by visible count (Bingham's bismuthinite joins,
  because the headline median dropped), 7 by volume.

---

## Round 4 of 5 — 8/10 (reviewed commit 0c6babd3)

### Locality-abundance review: round 4 of 5

**Score: 8/10.** Round 3's fixes reproduce as described: the tool re-runs (6.9 s) with byte-identical
output and the appendix from line 3 equals `compare.md`; the header hashes match (86e89c0f…,
4b70e7ed…, 5189d9b7…, 5d355644…); census v1 and v2 agree in every shared field of all 861 runs
(7,346 species entries, 0 mismatches); the committed captures reproduce the hashes recorded since
69ebf04f; about 80 numbers in §1–§7 match `compare.json`. The headline holds: no locality agrees
outright, the strict gate is a count lever (0/11 against 23/27), and minor phases out-number headline
phases. But both of round 3's interpretive fixes added claims that don't survive a look at the code
and the scenario files: "sealed" is not overgrowth — it is the simulator's lateral-footprint flag,
and at Tsumeb and Bingham the "sealing" hosts are the over-grown molybdate crusts 10–35 mm away; and
the scope rule runs one way only — all 14 "never forms" species sit outside their scenario's own
species lists, which is exactly what the four set-asides were removed for. There is also one wrong
citation and three wrong numbers.

#### MUST-FIX

1. **"Sealed inside other crystals" is a lateral-overlap flag, presented as physical overgrowth**
   (review §1, §2.1, §4.1, §4.3, §5.2–§5.4, §8 step 6). `enclosed_by` is set in `_check_enclosure`
   (`js/85c-simulator-state.ts:2433–2696`): an active host that grew this step is more than 3× the
   guest's size; the guest has stalled (under 3 µm over its last three zones); the two are "adjacent" —
   substrate-linked, or the guest's anchor lies inside the host's painted footprint, whose half-width
   is size × wall_spread × 4 / 2 (`js/22-geometry-wall.ts:3015–3026`). No envelopment test exists; the
   code calls the flag "a convenient rendering/topology projection" (`js/21-enclosure-authority.ts:4`),
   and the renderer shows inclusions through translucent hosts (`js/99i-renderer-three.ts:8199–8205`).
   The reviewer's probe (25 runs: porphyry, Sunnyside, Great Salt Plains, Ouro Preto, Roughton Gill,
   Schneeberg, Wittichen at seeds 1, 2, 42; Tsumeb 1, 2, 42; Bisbee 42): 108 of the 111 enclosed
   crystals ≥ 1 mm are `geometric-overlap`; median anchor distance about 21 mm (range 0–76; 80 of 103
   ≥ 10 mm); 72 of the 98 classified hosts are surface-growth aggregates. Tsumeb smithsonite (3 of 3)
   and azurite (12 of 12) are flagged by ferrimolybdite "powdery crust" or powellite
   "pulverulent_crust" 0–34 mm away; Bingham pyrite by a ferrimolybdite powdery crust 22 mm away;
   Sunnyside argentite (6 of 6) by a 73 mm botryoidal manganocalcite crust 15–35 mm away; Great Salt
   Plains halite (10 of 10) by transparent selenite desert roses 12–48 mm away. So both "sealed" fate
   slots and all three sealed dust cases come from the molybdate crusts §5.2 and §8 step 4 already call
   over-produced; "a later crystal overgrows it" is wrong; step 6's open question is answered and
   belongs with step 4; §5.2's "25 mm and 20 mm crystals" are crusts; Sunnyside's PARTLY rests on the
   flag (counting flagged crystals gives DISAGREES, ρ −0.01), and so does the Great Salt Plains "What
   holds" sentence. Fix: describe the flag as the code defines it and name the hosts; report
   Sunnyside as depending on the measure; qualify the Great Salt Plains sentence; fold "sealed" into
   step 4's molybdates; send the enclosure rule's lateral reach to the boss as a simulator finding; add
   the ferrimolybdite and powellite crusts — the simulator's #1 visible species at Bingham and Tsumeb —
   to §7's aggregate caveat.
2. **The scope rule runs only one way, and its wording doesn't tell the set-asides apart from the
   slots it keeps.** None of the 14 "never forms" slots is in its scenario's species lists: 9 are not
   listed at all (calcite at Ametista, Herkimer, Naica and Tsumeb; chalcopyrite at Viburnum; quartz in
   the reactivated vein; aragonite in Sicily; zeunerite at Wittichen; chalcedony at Marlborough) and
   5 are `aspirational_species` with written reasons saying the commissioned seeds produce none
   (Cripple Creek fluorite, Mogok ruby, Ouro Preto hematite, Viburnum calcite — "does not claim discrete
   free-grown crystals of either" — and Shigar aquamarine). All 55 slots that do form are listed (49
   expects, 6 deterministic). What really separates the set-asides is a spatial argument — the record
   comes from another part of the deposit — and the four set-asides are just as unlisted; the argument
   was applied only to failures. Cripple Creek native gold is "CO-oxidized" in the data file, and §5.3's
   own Lindgren & Ransome quote says it is absent from telluride ore except by oxidation, yet it is
   scored "in the sim top three"; tn457 has all three slots set aside yet still counts among the 18
   DISAGREES and the fragile verdicts. Consequences: "never forms 14 ≈ dust 15" depends on an unstated
   rule (applied as worded, never forms is 0 and dust the largest class), and §4.1(a)'s diagnosis
   leaves out that these scenarios never asked for these species. Fix: state the spatial rule and apply
   it both ways (set aside or justify native gold; take tn457 out of the tally, 17 DISAGREES); show each
   never-forming slot's contract status; start step 3 with the boss's per-scenario contract decision —
   the July rule "never edit expects_species to accept the no-show" applies.
3. **Deccan: Ottens et al. 2022 does report goethite** — "goethite as crystals up to 2 mm near
   Sinnar/Mohadari" (p. 26). Pectolite is named only for the Watchung basalts, so "absent from both
   studies" holds for pectolite alone. Fix: goethite RA (documented); reword.
4. **Stale or wrong numbers.** §2.3's "49 … not V — 46 S and 3 R (18 %)" is 47 (17 %) after round 3
   raised two Searles classes; §8 step 5's "6 times in 13" should be 6 in 11; §5.2's "The two 'Very
   common' species the simulator does grow are hidden" — it grows five of the seven (cerussite 3.95 per
   vug, malachite 1.0 and duftite 1.81 are visible): "two of the five".

#### SHOULD-FIX

- Credit the existing locality-frequency contract (`tools/locality-frequency-contract.mjs`,
  `tests-js/baselines/locality_frequency_v285.json`: presence over seeds 1, 2, 42, deciding the
  expects / deterministic / aspirational tiers); §2.1's "one draw" and §8 step 1 should build on it.
- Herkimer calcite "CO" (source H) is generous: three calcite events in the district's sequence, no
  abundance against other species; the slot is 0.94 % of the record and passes FATE_FLOOR only on this
  class. Mark it "doc" (never forms → 13) or say so.
- Tsumeb: raise pyromorphite, descloizite and cerussite from S to V (checked below).
- §8 step 3 lists 9 of the 14 (it omits reactivated-vein quartz, Ouro Preto hematite, zeunerite,
  Marlborough chalcedony, Mogok ruby) and adds dioptase and dolomite, which are not fate slots, without
  saying so.
- "What holds": Tormiq's titanite leads the record but is third in the simulator; "in both top threes"
  is accurate, "lead on both sides" is not.

#### Literature spot-checks (none checked by earlier rounds)

- Proctor 1985, G&G 21(2):86–104, p. 90 — supported: the core-margin pocket zone holds lepidolite,
  milky quartz, microcline and albite, and its pockets frequently yield superb gem tourmaline;
  cassiterite is among the rarer accessories; gem tourmaline goes with albite, not microcline.
- Sauer, Keller & McClure 1996, G&G 32(4):232–241, p. 234 — supported: topaz in kaolinite with quartz,
  mica and specular hematite; sometimes rutile, rarely euclase.
- US FWS 2002 selenite brochure (web archive) — supported: "Exceptional individual crystals measuring
  up to seven inches long"; clusters to 38 lb; the crystals form just below the salt crust.
- Ottens et al. 2022, Minerals 12:444 — contradicts the goethite claim (MUST-FIX 3); fluorapophyllite
  among the most common minerals supports the apophyllite CO class.
- Hoisington, herkimerhistory.com — partly supported: dolomite rhombs the most common feature; calcite
  gets no abundance word.
- Harvard Tsumeb Mineral Notes — supported: pyromorphite TSNB293 "Extremely rare" (Confirmed),
  descloizite TSNB104 "Very rare", cerussite TSNB74 "Very common".
- GCR 36, Roughtongill — not opened (HTTP 502 twice, as in round 3); a search summary words the key
  sentence differently, so the quote in §5.2 is still unverified by anyone.

#### Round 3's must-fix items: status

1. "Visible" included enclosed crystals — implemented (census v2 fields; full re-run, shared fields
   identical; v2 internally consistent, 0 violations; 1,089 of 11,151 reproduces); the meaning of the
   measure is wrong (MUST-FIX 1). 2. Out-of-claim slots — implemented (14/15/2/9/6/23 reproduce); the
   rule runs one way (MUST-FIX 2). 3. Bimbowrie market-wide — done (`market_wide` flag, `useEbay`
   excludes it, THIN, rests on Teale). Should-fixes: lifetime caps (17 species in 16 functions) match a
   grep of every `total_<m>` line; todorokite (`js/87:172`, `js/75:379`) and the CaSO₄ replacement
   (`js/75:262`) confirmed; Monte-Carlo bands 0.19 / 0.22 / 0.21 / 0.22 as stated; literature
   corrections present apart from §2.3's count.

#### What is solid

Tool output, appendix and hashes reproducible; determinism holds; the provenance check works (every
data-file count is checked against the capture). All 33 scoreboard rows match, as do the §4 tables
and the §5 and §7 values (including Roughton Gill chalcocite 80 % flagged, Bisbee jarosite and
acanthite 97 % and 95 %, 26.2 % of crystals under 0.1 mm). Data totals correct (36 pages, 6,736
photographs; 72 searches, 15,190 listings, 9,822 families). Wurtzite and enargite never nucleate, so
"22 form somewhere" holds. The strict-gate finding survives MUST-FIX 1: counting enclosed crystals,
both sealed strict slots become "visible, outside the top three", and strict stays at 0 by count.

**Response:** every MUST-FIX and SHOULD-FIX item is addressed; the review's §9 lists the changes. Where
the outcome differs from the reviewer's expectation:
- **The flag.** Confirmed in the code (`js/85c-simulator-state.ts:2433–2696`; the footprint arc at
  `js/22-geometry-wall.ts:3015`). Recomputed from the probe's saved outputs: 98 flagged crystals ≥ 1 mm,
  95 by footprint overlap, median 21 mm from the host's anchor (0–76), 75 at 10 mm or more, 72 hosts
  surface-growth aggregates (the reviewer's 111 / 103 include runs whose output was not saved). The
  review keeps the unflagged count as its reference — it is the simulator's own state — but works every
  verdict out both ways: Sunnyside is MEASURE-DEPENDENT (PARTLY or DISAGREES) and no other verdict
  changes. The new §4.4 sets out the flag and its hosts, and §8 step 6 puts its sideways reach to the
  boss.
- **Scope, both ways.** The rule is stated and applied to every slot. It sets aside one success —
  Cripple Creek's native gold, which the scenario (a primary telluride vein) does not model where the
  record has it (oxidized ore) — and makes the North Pennines barite cavity OUT OF SCOPE (17
  DISAGREES). With Herkimer calcite lowered to "documented" (the floor now sets it aside), the fate
  table has 67 slots: never forms 13 (8 not listed, 5 aspirational), dust 15, flagged 2, outranked 9,
  tied 6, top three 22. "Never forms ≈ dust" holds under the stated rule, and every slot's contract
  status is shown. The conditional test is 0/11 strict against 22/26 for the rest (6/11 against 19/26
  by volume).
- **Verdict tally:** 0 AGREES, 6 PARTLY, 17 DISAGREES, 2 TIE-DEPENDENT, 1 MEASURE-DEPENDENT, 1 OUT OF
  SCOPE, 3 NO VISIBLE CRYSTALS, 3 THIN. With Sunnyside measure-dependent and the barite cavity out of
  scope, two verdicts change in ≥ 20 % of proxy resamples (Ouro Preto, Cripple Creek), under every
  bootstrap seed.
- **Literature status:** with round 4's three Tsumeb confirmations, 44 of 278 classes are not V (41 S,
  3 R; 16 %).

---

## Round 5 of 5 — 8.5/10 (reviewed commit 133508ea)

### Locality-abundance review: round 5 of 5

**Score: 8.5/10.** Everything reproduces: two runs of the comparison (6 s each) give byte-identical
`compare.md` (e55901a7…) and `compare.json` (0ba1d7ac…); the appendix from line 3 equals `compare.md`;
the header hashes match (runs 86e89c0f…, data c4d386fe…, capture 5189d9b7…) and the capture → data
provenance check passes; five single-seed probes reproduce their census rows exactly (70 species
entries, 0 mismatches); about 150 numbers in §1, §3, §4, §5, §7 and the PR body match `compare.json`.
Round 4's fixes are in and work: `judge`/`compareOne` produce MEASURE-DEPENDENT and OUT OF SCOPE
correctly, OUT OF SCOPE is left out of `scored`, the set-asides now remove a success too (Cripple
Creek's native gold), and §4.4 describes `_check_enclosure` accurately. The headline holds. Below 9:
§8 schedules the flag decision after the count retunes it would undo; three statements are wrong as
written; and three remaining problems all flatter the simulator or overstate a verdict's fragility —
ρ counts mutual absence as agreement, the title classifier turns "gold/silver telluride" into native
metals, and the scope rule is still missed twice.

#### MUST-FIX

1. **§8 puts the flag decision after the count retunes it would undo** (§8 steps 1, 4, 6). The species
   cap skips flagged crystals (`js/85b-simulator-nucleate.ts:716`) and a flagged crystal stops growing
   (`js/85c-simulator-state.ts:2689`), so the flag rule produces counts, not just measures them — §4.1
   says so itself ("Enclosure feeds raw counts"). Searles celestine, named in step 4, is 8.9 per vug
   against a cap of 6: at seed 42, 9 nucleate and 8 are flagged by the thenardite fibrous coating
   7.6–30 mm away. Bisbee native gold (an F2 case, 13.0 per vug, cap 4): at seed 42, 11 nucleate and 10
   are flagged, 7 of them by hosts 1.3–36 mm away. Step 6 asks for the reach only "before any growth
   change" and never says it undoes steps 4–5. Step 1's "passive, optional scenario field" would go
   into `data/scenarios.json5`, which is hashed release content (`tools/release-audit.mjs:47`) and
   bundled (`tools/file-bundle-assets.mjs:18`) — the same rebuild-and-rebake cost step 2 states for
   `minerals.json`. Fix: decide the reach before step 4, or state that it undoes steps 4–5; cost step 1
   like step 2, or put the targets in a side file.
2. **Three statements wrong as written.** (a) The PR body says "46 snippet-level"; the data file has
   41 S (§2.3 says 41). (b) §5.5: "Titanite and epidote lead both sides" — the simulator's visible order
   is epidote 32.7 %, actinolite 23.7 %, titanite 15.0 %; §9 records this round-4 fix as made, but only
   §1 changed. (c) §4.4's Tsumeb row puts all four species under the molybdate crusts at 0–40 mm. At
   seed 42 (in round 4's set; the reviewer's run matches its census row for all 30 species),
   aurichalcite's four flagged crystals ≥ 1 mm are flagged by the banded malachite mass (50.9 mm),
   brochantite drusy crusts (6.7 and 12.8 mm) and wulfenite plates (10.9 mm), and one of the four
   conichalcite by the malachite (31.4 mm); smithsonite (18.1 mm) and azurite (13.3–28.8 mm) are as
   stated.

#### SHOULD-FIX

- **ρ counts mutual absence as agreement** (§2.4; tool lines 316–322). 32 of the 468 rows in the 26
  scored scenarios have no visible simulator crystal and no voting record; they enter through the
  simulator's top 12 by surviving share (dust), the literature's abundant/common list, and the top 8 of
  listing sources that do not vote (Colorado: pintadoite, barite, chalcocite, covellite, native
  silver). Without them the median ρ is −0.04, not 0.02; Deccan goes 0.04 → −0.03 (one PARTLY becomes
  DISAGREES), Cruzeiro 0.18 → 0.00, Colorado −0.19 → −0.43. Fix: drop them (union from voting sources
  only) or report both.
- **Cripple Creek's "fragility" may be a classifier artefact** (§1, §3). Its DISAGREES rests on native
  silver at 0.9 % of the record — 3 listing mentions, none the first species in a title. The
  dictionary maps telluride wording to native metals: "Hessite Silver Telluride" → hessite + native
  silver; "Calaverite Gold Telluride" → calaverite + native gold; "Sylvanite Gold Silver Telluride" →
  all three; 13 of native gold's 25 mentions are not first. Without the 3 mentions native silver is
  0 % and ρ 0.00: DISAGREES under both rules, nothing left to flip (currently 37–40 % of resamples).
  Colour words are guarded only for "ruby red" and "emerald green": "Amethyst Purple Fluorite" →
  quartz; "Sapphire Blue Celestine" → sapphire; "Turquoise Blue Smithsonite" → turquoise; "Silver
  Galena" → native silver. Fix: add these routes to §2.2 beside round 3's three.
- **The scope rule is still missed twice.** (i) Tsumeb dioptase: the Harvard note (TSNB107) says it
  "was extremely rare (or possibly even absent) in the first oxidation zone"; the scenario models the
  "1st-stage gossan" and already excludes köttigite on exactly that zone ground, yet §3 ("lit:
  missing"), §5.2 and §8 step 3 route dioptase to the boss as a no-show. (ii) Naica calcite: its 10.2 %
  of the record (6.0 % of photos, 14.4 % of listings) is mine material, like the fluorite set aside; in
  the cave calcite is a wall crust — the crust §5.4 says the celestine should be — in a scenario that
  calls itself "near-monomineralic". Under the stated rule it goes: never forms 12, calcite never forms
  at 3 of 5 localities instead of 4 of 6. (iii) The tn457 reason says "the orefield's fluorite, galena
  and quartz belong to the central zone"; the data file's GCR note makes galena "the main sulphide ore"
  orefield-wide and quartz "abundant in the Alston Block". The defensible reason: both record pages
  (Weardale, Alston Moor) are central-zone localities. §5.1's heading still says DISAGREES for both.
- **Searles halite counted twice** — "in the sim top three" in §1's table and dust in §1 item 4 and
  §4.3. It is 1.3 % of visible crystals, median largest unflagged 0.00 mm, visible in 2 of 21 seeds;
  the tool's line 705 flags it. Under the table's own dust definition: dust 16, top three 21;
  cap-only 3/4 and every gate but strict 21/25.
- **The flip rate cannot detect anything for the three choice-dependent verdicts.** A resample counts
  as unchanged when its options fall within {DISAGREES, PARTLY} (line 404), and AGREES needs ρ ≥ 0.5,
  so "their resamples stay within the same two verdicts" (line 288) is true by construction; say so.
- **"Never asked for"** (§1 item 1, §4.1(a)) holds only for the 8 unlisted species. The 5 aspirational
  ones were asked for and parked as no-shows — "the documented Shigar showpiece", "the documented
  Mogok target": recorded engine failures.
- **§2.1 overstates the flag's reach** (line 124): "about four times the host's size times its wall
  spread" is the full arc; the reach is half the arc plus the guest's half-arc and one cell
  (`85c:2534–2543`). Tsumeb's 20.7 mm ferrimolybdite (wall spread 0.95) has a 78.7 mm arc and a
  recorded reach of 43.0 mm.
- **The census tool's header still calls the flag physical enclosure**
  (`tools/assemblage-census.mjs:15–16, 21–22, 28–29`).
- **§4.4's figures come from round 4's uncommitted scratch outputs.** Commit a probe that reads
  `enclosure_receipt` (route, anchor distance, host habit). The reviewer's, at seed 42, reproduces the
  Ouro Preto (50.5 and 61.4 mm, from a 39.6 mm prismatic albite), Sunnyside (14.6 mm), Great Salt Plains
  (15.9–38.5 mm) and Bingham (15.4 mm) rows.
- **Small items:** §4.1 line 338 — all 22 top-three slots are expects or deterministic (20 + 2), not
  "20 of the 22". THIN = 20 does not bias the verdicts one way, but four sit on it: at 30 both Asbestos
  Hills scenarios and Marlborough (25–29 observations per voting source) become THIN; at 10 the Great
  Salt Plains (13 listings) is scored.

#### Literature spot-checks (none checked by earlier rounds)

- Harvard *Tsumeb Mineral Notes* — supported; six S classes can become V: azurite TSNB38 "Very common"
  (Keller 1977a: "the fourth most abundant supergene mineral in the first oxidation zone"), malachite
  TSNB225 "Very common" ("by far the most commonly encountered secondary copper mineral"), duftite
  TSNB111 "Very common", calcite TSNB66 "Very common", anglesite TSNB12 "Common", powellite TSNB286
  "extremely rare". Dioptase TSNB107 is "Very common", which supports its class, but the zone point
  above contradicts its use as a first-zone no-show.
- Burbank 1933, Am. Mineral. 18:513 — supported: p. 517 "…sphalerite, galena, and chalcopyrite … and of
  a little tetrahedrite"; p. 514 "large bodies of rhodonite"; no silver mineral named. Partly for
  fluorite's CO: Burbank only says calcite, fluorite, rhodochrosite and huebnerite "have also been
  recognized" (p. 518), so the class rests on Guzman et al.
- Ransome 1935, Am. Mineral. 20:799–805 — supported for calcite ("many of which reached a size of two
  to three feet", p. 801) and galena ("The large crystals of galena common in this district", p. 803);
  chalcopyrite's CO rests on one cave specimen (p. 800).
- Viola 1897, Z. Kryst. 28:225 — supported verbatim: the large aragonite crystals "kommen oft in den
  tieferen Ablagerungen der Schwefelformation … vor", at Racalmuto, Cianciana and Girgenti, with
  celestine and sulfur.
- Handbook of Mineralogy, hessite and dioptase — partly: the omissions are real (no Cripple Creek on
  hessite's US list, no Bisbee on dioptase's), but both sheets say "other localities" / "Many other
  minor localities are known", so "RA (V)" is an inference from absence; Cripple Creek hessite feeds
  §3's "lit: rare" — mark it ND?.
- GCR 36, Roughtongill — still not opened: the site account is in chapter 2, not 3; the JNCC PDF is
  over the 10 MB fetch limit and the GeoGuide mirror returns 502; a search snippet again words the key
  sentence differently. Ten Roughton Gill classes rest on it as V.

#### Round 4's must-fix items: status

1. Enclosure flag — done; the mechanism matches the code (85c:2433–2697, 22:3015, 21:4) and Sunnyside's
   MEASURE-DEPENDENT reproduces (ρ 0.07 without flagged crystals, −0.01 with); the Tsumeb row is wrong
   (MUST-FIX 2c). 2. Scope both ways — done in the fate table, the contract table reproduces; the
   remaining misses are above. 3. Deccan goethite — done (RA, Ottens et al. 2022 p. 26). 4. Numbers —
   done (41 S + 3 R; "6 in 11"; "two of the five"), but the PR body still says 46. Round 4's
   should-fixes are done except Tormiq in §5.5.

#### What is solid

Reproduction, determinism and provenance as above. The §1 tally (6 PARTLY, 17 DISAGREES, 2
TIE-DEPENDENT, 1 MEASURE-DEPENDENT, 3 NO VISIBLE CRYSTALS, 3 THIN, 1 OUT OF SCOPE); median ρ 0.02 /
0.02 / −0.06 / −0.14 / −0.02 / 0.00 across the measures; bootstrap bands 0.02 (seeds), 0.17 (proxies),
0.19 (both), Monte-Carlo 0.19–0.21; verdict flips Ouro Preto 40 % (35–45 %), Cripple Creek 37 %
(34–39 %), Roughton Gill 15–21 %; 178 of 306 pairs identical in every seed; 1,089 of 11,151 crystals
flagged. The fate table by gate (13 / 15 / 2 / 9 / 6 / 22) and the conditional test (0/11, 5/11, 6/11
against 22/26, 23/26, 19/26). 25 of 67 real slots strict (37 %); 6.7 of 84 simulator slots by count,
21 of 90 by volume; 76 of 99 strict pairs at about one crystal per vug; 24 strict gates (22 on species
that form); 17 lifetime caps. F2: 36 cases / 29 species / 20 by visible count / 7 by volume. Dust 27 =
24 + 3. §7's micromount ρ values; about 110 §5 figures; the data totals (72 searches, 15,190 listings,
9,822 families, 36 pages, 6,736 photos, 63 sources, 278 classes: 234 V / 41 S / 3 R). The strict-gate
finding survives everything above: 0/11 against 21/25.

#### To reach 9/10

Fix MUST-FIX 1 and 2; where §1 and §3 give the PARTLY count and the fragile verdicts, state the
zero–zero effect and the telluride route, or re-tally; apply the scope rule to Tsumeb dioptase and
Naica calcite.

**Response:** every MUST-FIX and SHOULD-FIX item is addressed; the review's §9 lists the changes.
Where the outcome differs from the reviewer's expectation:
- **The flag makes counts — more widely than the two examples.** The comparison now lists every
  (scenario, species) pair whose crystals per vug pass `max_nucleation_count` in at least one seed:
  58, 49 of them with more crystals flagged than dissolved. The largest is Tri-State's barite, 55.6
  per vug against a cap of 6 with 50.8 flagged — and at seed 42, 32 of its 33 flagged crystals were
  flagged by the substrate route (barite nucleated on sphalerite, galena and pyrite, then overgrown):
  the inclusion-trail case the cap's rule was written for (`js/85b-simulator-nucleate.ts:654–664`),
  not the sideways reach. So §8's new step 4, before F2 and the strict gate, puts two questions to the
  boss: the footprint reach, and whether the cap should free a slot for a footprint-flagged crystal.
  Step 1 now prefers a side file.
- **ρ without mutual zeros** reproduces the reviewer's figures: median −0.04, Deccan DISAGREES (ρ
  −0.03), Cruzeiro 0.00, Colorado −0.43; the old reading is kept as a sensitivity line (median 0.02,
  Deccan PARTLY). New tally: 0 AGREES, 5 PARTLY, 18 DISAGREES, 2 TIE-DEPENDENT, 1 MEASURE-DEPENDENT, 3 NO
  VISIBLE CRYSTALS, 3 THIN, 1 OUT OF SCOPE.
- **The classifier.** The titles were not saved, so the routes cannot be re-run on them; the
  comparison instead re-runs with each listing counted only for the species its title names first
  (the data file's lead counts), which removes every route except the colour words. Cripple Creek's
  native silver drops to 0 %, and two verdicts the reviewer did not mention change: Cruzeiro and
  Sunnyside become DISAGREES (median ρ −0.15). Cripple Creek is DISAGREES either way.
- **Scope.** Naica's calcite and Tsumeb's dioptase are set aside, with reasons; set-aside species now
  also leave the dust list and the "lit: missing" column. The verdicts still compare each scenario with
  its whole locality record (a re-run with the set-aside species removed changes none of them). The
  tn457 reason now rests on what the record samples — the whole orefield, led by fluorite, with no
  page or search targeting the outer zone — rather than on the zone of each species; Alston Moor also
  has barium-zone species (alstonite), so "both pages are central-zone localities" was not used. Fate
  table: 12 / 16 / 2 / 9 / 6 / 21 = 66; the conditional test 0/11 against 21/25 (6/11 against 18/25 by
  volume).
- **§4.4** now comes from `tools/enclosure-reach-probe.mjs` (27 runs: round 4's set plus Tri-State
  and Searles at seed 42): 112 flagged crystals ≥ 1 mm, 108 by footprint overlap, median 20.8 mm from
  the host's anchor (0–75.6 mm), 87 at 10 mm or more; the longest reach in the set is a 57 mm
  disphenoidal chalcopyrite at Bisbee flagging atacamite 75.6 mm away. It reproduces the reviewer's
  seed-42 figures.
- **Literature:** the reviewer's six Tsumeb ratings and dioptase's are now V (azurite TSNB38 and
  dioptase TSNB107 read first-hand); hessite (Cripple Creek) and dioptase (Bisbee) are ND?; Picher
  chalcopyrite is "documented"; Sunnyside fluorite's note credits Guzman et al. 37 of 278 classes are
  not V (34 S, 3 R; 13 %). GCR 36 returned 502 twice more; §5.2 and the data note now say that ten
  Roughton Gill classes rest on the research pass's reading.
- **Also found while revising:** §7's "the four micromount-heavy localities get worse" no longer holds
  with the new ρ — Wittichen improves slightly (−0.57 → −0.54); the sentence now says three of four.
