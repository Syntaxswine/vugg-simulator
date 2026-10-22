# Story-pocket revision — review rounds (2026-10-22)

The 2026-10-22 revision of `PROPOSAL-STORY-POCKETS-2026-10-21.md` (per-scenario targets in place of the
universal 5 mm rule) is reviewed under the standing rule: one reviewer per round, up to five rounds,
stop at 9/10 or when nothing must be fixed. Each round's report is kept as written, followed by the
response.

## Round 1 of 5 — 6.5/10 (on f49c1804)

### The report

> The instruments are well built. The "before" column reproduces the old rule exactly, the targets can
> be traced to evidence, and nothing under js/ or data/ changed. But four of the seven NO STORY verdicts
> depend on rules or data the boss's criteria rule out, and the model's first principle ("common, not
> guaranteed") is never measured.
>
> **MUST-FIX**
>
> 1. **A universal 1 mm floor decides verdicts, and it is not registered anywhere.** A protagonist with
>    an unknown size, or one short of its proxy, counts as POSSIBLE only if it is at least 1 mm;
>    otherwise the run counts as NO. Re-scored without the floor, three of the seven NO STORY verdicts
>    become UNRESOLVED: amethyst_geode, schneeberg and searles_lake. amethyst_geode's three protagonists
>    all have size "unknown" — exactly the boss's "report unknown" case.
> 2. **UNCLASSED pockets are scored as story-scale.** The scoreboard removes only SMALL pockets from the
>    story count, while assessSize calls the same runs ELIGIBILITY UNKNOWN. So NO STORY is issued in
>    pockets the tool cannot classify (searles_lake, amethyst_geode). Fix: in an UNCLASSED pocket, count
>    the YES runs and treat the NO runs as unresolved.
> 3. **"Common, not guaranteed" is never assessed.** The bands are AB [0.5, 1] and CO [0.3, 1], so a
>    species in 21 of 21 runs is IN its band. In the census, all 80 protagonists that have an engine and a
>    band occur in exactly 0/21 or 21/21 runs; 21 of the 32 scored scenarios grow the same set of
>    surviving species in every seed. Fix: report assemblage variety per scenario, flag protagonists
>    present in every seed, and either propose a band ceiling below 1 or justify 100 %.
> 4. **The tests don't prove two items the boss listed.** A mutant computing the eligible share over the
>    occurring runs passes all 35 tests. The showpiece test passes a protagonist list without the
>    showpiece, so it proves nothing; the real exclusion is in the scoreboard, which no test imports.
>    17 independent mutants: 7 survive (also the storyVerdict frequency boundary, the STORY vs STORY
>    (PROXY) split, the proxy visibility check, OVERSIZE at q75 instead of q90, two validateSidecar
>    rules). Fix: assert `share` where the denominators differ; move protagonist selection and story
>    counting into the lib and test them there.
> 5. **Ouro Preto's NO STORY rests on a probable duplicate.** Its crystal target has exactly n = 5; the
>    two 16 mm entries are image 1648025549 ("Der rechte Kristall ist 16 mm x 12 mm groß") and image
>    1647884454 ("16 mm x 12 mm großer, rosa-v…"), on the same gallery page. Removing one gives n = 4,
>    the specimen proxy, and UNRESOLVED. Fix: a same-species, same-dimensions duplicate check (it would
>    also catch Mogok spinel 1729893417 / 1437066764, both "5x5x4,8mm").
>
> **SHOULD-FIX**
>
> 6. **The proxy "upper bound" is an assumption, and a proxy can never show oversize.** Per-photo
>    dominance does not carry over between different photo subsets: at Viburnum, captioned calcite
>    crystals sit above the specimen proxy. Tsumeb's STORY (PROXY) rests on simulated malachite of
>    37.6–48.9 mm, while the three captioned Tsumeb malachite crystals are 6, 15 and 24 mm. Fix: qualify
>    "conclusive", show the crystal sample next to every proxy verdict, label a proxy MEETS "oversize
>    untestable".
> 7. **Physically impossible crystals carry the story.** All 15 of Bisbee's YES runs have malachite of
>    64–68 mm, longer than the cavity's longest span (60.5 mm).
> 8. **Stale, hand-typed results in the prose.** The "signature species that never form" list is the old
>    top-three list (Marlborough's chalcedony is now a companion, Grimsel's rutile has no role) and leaves
>    out protagonists that never occur. The WP8 table and counts are not spliced, although the header says
>    every results table is.
> 9. **The before/after explanations are incomplete.** sulphur_bank's old PARTIAL came only from the star
>    rule, which its generated reason leaves out; the North Pennines' PARTIAL also failed the star rule.
> 10. **Caption parser accuracy.** All 194 crystal and aggregate rows read: 1 wrong kind
>     ("Kristallbreite = 11 mm", a width), 1 cleft-wide maximum ("Die Kluft enthält bis zu 20 cm lange"),
>     2 probable duplicate pairs, 3 ambiguous attributions (1230990591, 1692476479, 1504731096). 80 random
>     specimen statements: 2 wrong ("…stall hat eine Größe von etwa 43 mm", a crystal; "B:57, T:37,
>     H:28mm" read as 28). More cut-off crystal cues read as specimens (1581430343, 1169407878,
>     1622109030); 42 specimen values under 10 mm. AFTER_CRYSTAL lacks the group/Stufe exclusion.
>     Overall about 1–2 % clear errors in crystal rows and about 2.5 % in specimen rows.
> 11. **The splice check has gaps.** It passes with zero blocks and does not require every section; the
>     scoreboard does not check compare.json against the hash in the sidecar.
> 12. **The median is not the central target, contrary to the boss's wording.** A run passes at ≥ q25 with
>     no upper bound; MEETS means "conditional median ≥ record q25"; OVERSIZE never affects the story. List
>     it in §4 as a departure. Latent: a pocket SMALL for the primary drops all its runs, even when an
>     alternate could carry the story.
>
> Verified correct: guardrails (nothing under js/ or data/; the comparison unchanged, compare.json
> byte-identical on re-run); the "before" column (861 runs; SHOWCASE 3, PARTIAL 22, MISSING 6, NO ENGINE
> 1, OUT OF SCOPE 1, matching the e6f96d4b table); --check-splice, the targets check, 35/35 tests, every
> capture and extractor hash; bands only from the literature class; no default size; proxies labelled;
> every size target recomputes from the capture; the cavity tool builds each scenario as the census does;
> the prose numbers checked.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| 1 | an unregistered 1 mm floor | Removed from the verdicts. A protagonist of unknown size, or short of a proxy, keeps a run open at any size. "Visible" (1 mm, the review's convention) is now a registered rule (`visible_mm`) used only for the clutter share and the dust and hidden flags. | Ametista, Schneeberg and Searles moved from NO STORY to UNRESOLVED. Test "no size floor"; the mutant that restores the floor is killed. |
| 2 | UNCLASSED scored as story-scale | `scoreStory` (now in the lib) counts a run without a story in an UNCLASSED pocket as open (`unclassified`), not against the story; an UNCLASSED scenario reaches STORY or UNRESOLVED, never NO STORY. | Tests "in an unclassed pocket … stays open" and "in a story-scale pocket the same runs are a NO STORY"; mutant killed. |
| 3 | "common, not guaranteed" never assessed | Bands now stop below 100 % (AB 50–95 %, CO 30–90 %), with the reason. New per-scenario variety section: distinct assemblages, protagonists in every seed, size spread (simulated vs the record's), flags "in every seed" and "one assemblage in every seed". A fleet-level test: the chance that every species seen in all its seeds would be, at its band's ceiling. New §2.5 and a widened WP9 (per-seed pockets, occurrence and size). | Of the species with an engine and a band, 120 occur in every seed, 32 in none, 5 in some; 21 of 32 scenarios grow one assemblage; the every-seed chance is about 10^-84; median size spread 3 % simulated against 64 % in the record (the generated variety block). |
| 4 | two boss items untested; 7 surviving mutants | Protagonist selection (`protagonistsOf`) and story counting (`scoreStory`) moved into the lib. New tests: the share where the denominators differ, a showpiece that would carry the story as an alternate, the frequency and PROXY boundaries, the median-centred size verdicts at q25, q75 and q90, every `validateSidecar` rule, the join rule, variety. | 53 tests. 35 mutants of the lib, the reviewer's seven survivors among them (adapted), all killed. |
| 5 | Ouro Preto rests on a duplicate | `groupSpecimens` joins one specimen's photographs: identical captions; the same length in three dimensions; or in two dimensions when uploaded together (image ids within 1,000,000 — a round two-dimension size shared years apart is more likely two specimens). Every join is listed in `DATA-STORY-POCKET-SIZES-2026-10-22.md`. | Both pairs the reviewer named are joined (a test checks them). Ouro Preto's topaz has 4 crystal lengths, so its proxy decides and the verdict is UNRESOLVED. 133 joins: 112 by caption, 21 by dimensions. |
| 6 | the proxy is an assumption; oversize untestable | The proxy is described as strong evidence, not proof, with the Viburnum example. A proxy reached is REACHES PROXY ("oversize cannot be tested"); past its 90th percentile, OVERSIZE. Every proxy target shows its crystal sample, and a flag marks a simulated crystal larger than every photographed crystal of its species. | Tsumeb's malachite, Bisbee's malachite, Cripple Creek's calaverite and Tormiq's epidote are flagged. |
| 7 | impossible crystals carry the story | A crystal longer than the cavity's span neither carries the story nor counts against it (an open run), and the size verdict leaves it out (`beyond`). | Bisbee's 15 malachite runs are open, not YES. Tests; mutants killed. |
| 8 | stale hand-typed prose; WP8 not spliced | The never-form list is now a generated block. WP8's figures are generated by `tools/substrate-census.mjs --summarize --splice`, through a shared `tools/splice-generated.mjs`. | The generated wall table equals the old one byte for byte. Both tools' `--check-splice` pass. |
| 9 | before/after incomplete | Each "before" now gives the star fact (the star a signature species in k/21). The North Pennines prose says the old rule failed it twice. | The before-after block. |
| 10 | parser errors | Fixed every case named: crystal widths are their own kind (not used); "the cleft held crystals to 20 cm" is dropped; "… hat eine Größe von" takes its subject, fragments included ("…stall", "…istall", "Er"); a title naming one crystal makes its "Größe" that crystal's, unless it pairs two minerals; labelled dimensions (B:/T:/H:) are read whole; a crystal length whose line or title is about another mineral is set aside (1230990591); AFTER_CRYSTAL excludes groups and Stufen. 1692476479 and 1504731096 stay with their lead: a title cut at its start may have lost the subject, and a pseudomorph is its material's. Specimen lengths under 10 mm are counted in the appendix and named in the limits. | Each case is a test. Naica's selenite gains two crystal lengths (226 and 120 mm), still too few for a target. |
| 11 | splice gaps; no compare hash check | Each tool's sections must each appear exactly once, or the splice and the check fail. The scoreboard refuses a compare.json whose hash differs from the targets'. | `tools/splice-generated.mjs`. |
| 12 | the median not central | A run is at display scale in the record's q25–q90; the size verdict is the conditional median against the record: BELOW, MEETS (q25–q75, around the median), LARGE, OVERSIZE. §1.3 and §4 name this as the proposal's reading of the boss's wording, for the boss to accept. Small pockets' stories are counted apart (`small_yes`) and reported. | Tests at each boundary; the "no LARGE band" and "q25 inclusive" mutants are killed. |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (was 1, 1, 7, 22,
1, 1).

## Round 2 of 5 — 7.5/10 (on 9f46686b)

### The report

> Most round-1 fixes check out against the code and the outputs. I found two must-fixes: the only STORY (PROXY) verdict depends on crystal sizes the parser misfiled as specimen sizes, and the tests still don't pin the conditional size calculation.
>
> **Read-only:** `git status` is clean. All local evidence files are byte-identical after my runs (the npm test run appended to the test-quarry ledger, as allowed). Mutants ran on a scratch copy only. One slip: I wrote one throwaway file to /tmp and deleted it; nothing touched the repository.
>
> **MUST-FIX**
>
> **1. Tsumeb's STORY (PROXY), the only proxy pass, rests on crystal sizes filed as specimen sizes inside the upper-bound proxy**
> - Code:
>   - `tools/story-pocket-lib.mjs:59`: the "x" crystal cue needs the number right after the x, so "x, ca. 3 cm" is missed.
>   - `:79`: AFTER_ADJ has `hoh-` but not the predicative "hoch".
>   - `:262`: with no cue, a length becomes a specimen.
>   - `tools/story-pocket-size-evidence.mjs:147`: values under 10 mm are counted but still go into the proxy.
> - The malachite proxy (n 25) has q25 = 30.0 mm, and that value is image 1102949738, "Malachit nach Azurit x, ca. 3 cm hoch". That is a 3 cm pseudomorph crystal. The parser's own policy calls 1504731096 ("Malachit psm. Azurit, 1,5 cm großer Kristall") a crystal.
> - The proxy also holds 1231095979 ("Größe: 4,2 mm") and 1107729327 ("-Büschel … Größe: 6 mm"). The appendix's own note says sub-10 mm "Größe" values mostly give the crystal or the field of view.
> - Read the first as a crystal and leave out the other two: q25 = 44.0 mm. Simulated malachite is 37.6–48.9 mm, so 8/21 runs reach it (38 %, below the 50 % target) and 13 are open. Tsumeb becomes UNRESOLVED and the headline goes STORY (PROXY) 1 → 0.
> - This breaks "keep crystal dimensions separate" in reverse, and breaks the premise the proxy YES rests on ("a specimen is at least as long as its crystals").
> - 18 such sub-10 mm values sit in protagonist proxies (Bisbee cuprite 2.71/5.27/7.24, Tsumeb calcite 1.47, Tsumeb azurite 3.83, …).
> - **Fix:** class micromount "Größe" values under 10 mm as unclassed (or exclude them from proxies by a registered rule), and read "x, ca. N cm hoch/lang". Then rewrite the targets, re-score, and state the sensitivity in §2.
>
> **2. The tests still don't prove the conditional size calculation (a named acceptance item)**
> - I ran 35 of my own mutants on a scratch copy; 11 survive. The ones that matter:
>   - `assessSize` using the mean instead of the median (`lib:501`). The test named "the median decides" (`test.ts:179–186`) never has the median and the mean on different sides.
>   - The eligible-share range changed from q25–q90 to q25–q75, or its q25 made exclusive (`lib:499`).
>   - `runStory`'s per-run YES at q25 changed from ≥ to > (`lib:524`).
>   - The proxy REACHES PROXY/OVERSIZE boundary moved from q90 to q75 (`lib:504`).
>   - `scoreStory`'s `beyond` and `oversize` counters (`lib:548–549`); `beyond` drives the "longer than the cavity" open reason.
>   - Confidence always "high" (`lib:444`); the IN-band upper bound; the 5 % wanted-share boundary.
> - The round-1 boundary tests cover only `assessSize`'s verdict thresholds.
> - **Fix:** add a skewed case (e.g. [1, 16, 16, 49]: median 16, mean 20.5), a run exactly at q25, a crystal in (q75, q90] for both the share and the proxy verdict, and assertions on `beyond`, `oversize` and confidence.
>
> **SHOULD-FIX**
>
> **3. Over-joining, introduced by round-1 fix #5** (`lib:334–345`)
> - Caption joins have no upload window: 39 of the 112 are more than a day apart, 30 more than 30 days.
> - 34 of those carry only a picture width. 13 Wittichen zeunerite photos captioned "BB 4,5mm", uploaded over 803 days, become one specimen; so do 11 heinrichite photos.
> - Three-dimension joins span years (Mogok 5×5×4 mm, 9.4 years apart; 12×11×6, 4.9 years). One joins two different mines: 1310050913 "Fundort: Grov…" with 1319903935 "Fundort: Blac…".
> - No target changes, but "2084 specimens", "112 by identical captions" and "one specimen counts once" are overstated.
> - **Fix:** apply the upload window to caption and three-dimension joins, or require a matching Fundort or a crystal/specimen statement.
>
> **4. A prose claim the generated blocks don't support** (PROPOSAL:418–419, "Unclassed pockets stay open. Ametista's and Searles'…")
> - `unclassified` is 0 in every scored scenario; only colorado_plateau (NO ENGINE) has any.
> - The generated breakdown opens Ametista by "no size target" and Searles by "short of a specimen proxy". The unclassed rule decides no current verdict.
>
> **5. "About 10^-84"** (`showcase-scoreboard.mjs:364`, `lib:587`)
> - This treats species that co-occur in the same runs as independent.
> - Allowing any dependence within a scenario, the bound is the product over the 30 scenarios of each one's largest single-species chance: 10^-29.1. Same conclusion; report the defensible number.
>
> **6. Generated values that are wrong or unlabelled**
> - Variety table: Bisbee shows "protagonists in every seed: —", though malachite, azurite and cuprite occur 21/21 (`scoreboard:197` requires a band).
> - The spread guard checks the maximum, not the median (`:157`), giving Tormiq quartz "6960 %" and Searles halite "200 %" from dust medians.
> - The record's "64 %" pools 55 specimen-proxy spreads with 11 crystal spreads (crystal-only: 75 %). Label it.
> - `small_yes` ("reported apart", REVIEW:98) appears in no generated block, only in the JSON.
> - `visible_mm` is registered as the clutter threshold (`targets.mjs:50`), but clutter reads the census's `n_1_exp` (`scoreboard:217`). Changing the rule would not change clutter.
>
> **7. Sample counts overstate independence**
> - 21 of Grimsel's 27 quartz crystal lengths share one caption template ("Etwa N mm x M mm großer…").
> - 9 of the North Pennines' 17 fluorite lengths share another ("Fluorit-XX max. N mm", Feb–Jul 2011). Without that series q25 rises to 18.75 mm, above every simulated fluorite (17.35–17.99) — the only crystal-target STORY.
> - **Fix:** record series concentration in the provenance and let confidence reflect it. Also flag knife-edges: Herkimer's (cooling) NO STORY rests on exactly n = 5, the minimum.
>
> **8. Prose overreach**
> - "the cause is the evidence, not the simulator" (PROPOSAL:350): where partial crystal evidence exists, every length exceeds every simulated crystal:
>   - Ouro Preto: 12–36 mm vs ≤ 5.9 mm
>   - Naica: 44–226 vs ≤ 2.9
>   - Reactive Wall galena: 40–75 vs ≤ 4.1
>   - Elmwood: 20–48 vs ≤ 10.4
> - Hand-typed results sit outside the markers despite "None is typed by hand": 0.57 mm (line 996), 0.4 mm (1094), 94/83/56 % (770–771). They are accurate.
>
> **9. Minor**
> - `UPLOADED_TOGETHER = 1e6` is not in the sidecar's rules, and nothing says image ids are Unix upload times (1e6 s ≈ 11.6 days).
> - `runStory`'s early return on a crystal YES drops the `oversize`/`beyond` flags (`lib:525`), so those counts depend on protagonist order.
> - The "interior" span is the longest vertex-to-vertex chord, never checked to lie inside the cavity (`cavities.mjs:68–73`).
> - The 9f46686b commit message says 2074 specimens; the generated count is 2084.
>
> **Verified correct**
> - **Guardrails:** neither commit touches `js/` or `data/`. The comparison tool last changed in afbe687f, and its re-run gives a byte-identical `compare.json` (sha256 8419de06…). All evidence is at SIM 285.
> - **Checks:**
>   - `story-pocket-targets.mjs` matches a rebuild.
>   - The size-evidence tool reproduces the appendix byte for byte.
>   - Scoreboard `--check-splice`: 12/12 blocks match.
>   - Substrate census `--check-splice`: 2/2.
>   - Tests: 53/53 pass.
>   - `showcase.*` reproduces.
> - **Round-1 responses that hold:**
>   - #1: no size floor; `visible_mm` affects no verdict.
>   - #2: code and tests correct (but see 4).
>   - #3: bands below 100 %, variety section added (see 5).
>   - #5: both duplicate pairs joined; Ouro Preto has 4 crystal lengths → UNRESOLVED (see 3).
>   - #6: wording, REACHES PROXY, crystal sample shown, the flag.
>   - #7: Bisbee's 15 runs longer than the cavity are open.
>   - #8: never-form list and WP8 generated; #9.
>   - #10: every named parser case fixed and tested.
>   - #11: each section exactly once; a mismatched compare hash is refused.
>   - #12: display range q25–q90 and median-centred verdict, named for the boss. Only "small pockets reported" is partial.
> - **Audit:**
>   - I read every crystal row. The targets behind Herkimer's and Grimsel's NO STORY and the North Pennines' STORY are cleanly parsed and distinct specimens.
>   - The 11 set-asides are correct. One width is read as a length (1208191401, "7 cm breit"), affecting only Grimsel's maximum.
>   - A seeded sample of 60 proxy specimen values had 2 errors (3 %).
> - **Present and correct:** `fits`/`pocketClass`/`scoreStory`/`storyVerdict` match their spec; the "before" column is unchanged; every scoreboard column the boss listed is present.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| 1 | Tsumeb's STORY (PROXY) rests on misfiled crystal sizes | Three parser rules. The crystal cue "x" may be followed by a comma ("Malachit nach Azurit x, ca. 3 cm hoch"). A pseudomorph's length goes to the mineral named first, the material ("Malachit nach Azurit" is malachite's, as round 1 decided for "Malachit psm. Azurit"). A predicative "breit" or "dick" makes a width. A registered rule (`specimen_min_mm`, 10 mm) sets specimen lengths under 10 mm aside: on a micromount the "Größe" usually gives the crystal or the field. | Tsumeb's malachite has crystal lengths 6, 15, 24 and 30 mm (n 4, too few for a target); its proxy is n 22, q25 44 mm; 8 of 21 runs reach it and 13 stay open, so UNRESOLVED. STORY (PROXY) 1 → 0. 1208191401 ("7 cm breit") is a width. Each case is a test. |
| 2 | the conditional size calculation not pinned | New tests: a skewed sample whose median and mean fall on different sides; a run exactly at q25 (inclusive); crystals in (q75, q90] for the share and for the proxy verdict; the `beyond` and `oversize` counters; the confidence levels; the band's top end; the 5 % wanted-share boundary. | The ten survivors the reviewer named, adapted, and eleven more on the new rules: 21 of 21 killed. Round 1's 35 mutants re-run on the new code: the 30 that still apply killed; the 5 whose code was rewritten, re-anchored, killed. Two new join mutants survived (a find named on one side only; the window's edge) and now have tests. 65 tests. |
| 3 | over-joining | A join needs the photographs uploaded together (image ids within 1,000,000 s, about 11.6 days), for identical captions as for a shared multi-dimension length. Uploaded apart, only a measured three-dimension size (one dimension to a tenth of a millimetre) joins them, and never when the captions name different finds. The window and its basis (the ids read as upload times; their range runs from 2004 to just before the capture) are a registered rule (`uploaded_together_s`). | 116 joins: 99 by caption, 17 by dimensions; 2,217 photographs → 2,101 specimens. The Wittichen zeunerite "BB 4,5 mm" captions years apart, the Mogok 5×5×4 mm pair and Grove Rake/Blackdene stay apart (tests). |
| 4 | the unclassed claim | §2.1 now says the unclassed rule decides no current verdict. | — |
| 5 | 10^-84 assumes independence | The bound counts each scenario once, by its least likely every-seed species: however species that share runs depend on each other, all of them occur in every run no more often than that one does. The independent figure stands beside it. | 10^-29 over 30 scenarios (the reviewer's 10^-29.1); 10^-84 if independent. A first fix took each scenario's likeliest species (10^-15), a valid but looser bound; corrected before commit. Tests and mutants for both. |
| 6 | wrong or unlabelled generated values | "In every seed" lists protagonists with or without a band. A spread is computed only when the median occurring crystal is visible, and reads "not visible" otherwise. The record's spread is split by basis. The small-pocket count is in the verdicts block. `visible_mm` is asserted equal to the census's fixed 1 mm (`n_1_exp`); the scoreboard refuses any other value. | Bisbee: malachite, azurite, cuprite in every seed. Simulated spread 2 % (51) against 75 % for crystal lengths (11) and 58 % for proxies (55). Tormiq's quartz and Searles' halite read "not visible". |
| 7 | samples overstate independence | A caption's wording with the numbers taken out is its series key. A crystal target whose largest series holds more than half its lengths drops a confidence level, and its provenance records the series and the target without it. A new §2.6 re-scores every crystal-target verdict without its largest series and, at the minimum sample, with its proxy. | The North Pennines' fluorite (9 of 17 in one series) is UNRESOLVED without it; Herkimer's quartz (n 5) is UNRESOLVED either way; Grimsel's NO STORY holds. |
| 8 | prose overreach | "The cause is the evidence" is gone. The verdicts block names, where the captions give a few crystal lengths, the species for which every photographed crystal is longer than every simulated one, enclosed crystals included; §2 says they lean against the simulator and do not clear it. The hand-typed 0.57 mm, 0.4 mm and 94/83/56 % now point to the generated tables. | 20 of 25 such protagonists. |
| 9 | minor | The join window is registered (row 3). `runStory` no longer returns early, so `oversize` and `beyond` count whatever the protagonists' order (a test). The span is called an upper bound (the longest chord between wall vertices, not checked to run inside the cavity) in §1.3 and §5. The 9f46686b message's "2074 specimens" is superseded: 2,101 under the new rules. | — |

Result: STORY 1, STORY (PROXY) 0, NO STORY 3, UNRESOLVED 27, NO ENGINE 1, OUT OF SCOPE 1 (was 1, 1, 3, 26, 1, 1).
The one STORY (reactivated_fluorite_vein) rests on one contributor's series (§2.6).
