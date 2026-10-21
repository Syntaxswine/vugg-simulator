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
