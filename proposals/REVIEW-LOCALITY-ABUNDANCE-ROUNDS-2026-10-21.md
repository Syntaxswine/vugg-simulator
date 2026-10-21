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
