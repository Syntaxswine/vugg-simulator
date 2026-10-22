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

## Round 3 of 5 — 7.5/10 (on 5f1eed02)

### The report

> All the round-2 fixes are in the code. Two problems remain that need fixing. First, the story frequency that was set in advance contradicts the occurrence bands and size targets that were also set in advance. Second, the explanation of why Tsumeb's verdict changed in round 2 names the wrong cause.
>
> How I worked: everything was read-only, and scratch files went only under scratchpad\review3. `npm test` added a row to the test-quarry ledger, which is allowed. To run vitest on a scratch copy I made a temporary junction to node_modules, and I have removed it. The git tree is clean, and every .local-evidence output is byte-identical to before.
>
> **MUST-FIX**
>
> 1. **The story frequency cannot be met by a fleet that meets every other target.**
>    - Where: tools/story-pocket-targets.mjs:63 and :135-140 set the frequency to the largest lower occurrence band. tools/story-pocket-lib.mjs:559-575 counts a run as YES only when the crystal lies in [q25, q90].
>    - Why it fails: that window holds 65 % of the record's own crystals by construction (North Pennines fluorite: 11 of 17).
>    - Evidence: I ran the repository's lib on the real targets for cooling quartz, Grimsel quartz, reactivated fluorite and Jeffrey grossular. Fleets occurring in 11, 13, 15 and 16 of 21 seeds are all IN band. With sizes taken at the record's own quantiles, the size verdict is MEETS. The story still lands at 7, 9, 10 and 10 of 21, so the verdict is THIN STORY (noise). Only 17 of 21 seeds or more passes.
>    - Effect: the real occurrence floor becomes about 77 % for AB and 46 % for CO. That is close to "guaranteed", which the boss ruled out.
>    - Who it hits: six scored scenarios have only one protagonist with an engine.
>    - It contradicts WP9's own target, "the size spread approaches the record's" (PROPOSAL:1187). A wider spread lowers the story rate.
>    - Targets "never change to fit an output" (PROPOSAL:848), so this would push tuning toward a protagonist in every seed at one narrow size.
>    - No test checks a fleet that meets its own targets.
>    - Fix: make the frequency consistent with the window. For example, use the band floor × 0.65, or judge the story conditional on occurrence. Register the choice, and add a test that a fleet sampled from the record at its band floor passes.
>
> 2. **Tsumeb's STORY (PROXY) → UNRESOLVED comes from the new 10 mm floor, not from the misread caption.**
>    - Where: PROPOSAL:442-443 ("Corrected, the verdict is UNRESOLVED") and the headline of commit 5f1eed02.
>    - Evidence: the "x," and pseudomorph fixes are in place in every variant (4 crystal lengths each). I changed only `SPECIMEN_MIN_MM`:
>
>    | specimen floor | proxy n | q25 | runs carrying the story | verdict |
>    |---|---:|---:|---|---|
>    | 0 mm | 24 | 36.5 mm | 21/21 | STORY (PROXY) |
>    | 5 mm | 23 | 41 mm | 14/21 | STORY (PROXY) |
>    | 10 mm | 22 | 44 mm | 8/21, 13 open | UNRESOLVED |
>
>    - The caption fix alone moves q25 from 30 to 36.5 mm, still below every simulated malachite (37.6 mm and up).
>    - The flip needs a floor above 6 mm (photo 1107729327, "-Büschel … Größe: 6 mm"). The floor is still awaiting the boss.
>    - Round 2 asked for this sensitivity to be stated in §2. It is not.
>    - Fix: correct the attribution. Add floors of 0, 5, 10 and 20 mm with their verdicts to the generated §2.6, and list Tsumeb among the verdicts that move.
>
> **SHOULD-FIX**
>
> 3. **The join window's sensitivity is not reported.** At 1e5 s, Ouro Preto becomes NO STORY: its photo pair 1648025549 + 1647884454 is 1.6 days apart. Windows of 1e7 s or no limit change nothing. Add this to §2.6. Also, `uploaded_together_basis` (targets.mjs:57; sidecar line 54) says "the newest captured id, 1791032939, falls on 2026-10-03". That is false: six ids are newer, and the newest is 1792434360, uploaded 2026-10-19.
>
> 4. **The series key is generic** (lib:298-303). Standard wordings group photographs taken years apart:
>    - Naica "Größe:#" (2007 and 2011);
>    - Ouro Preto "Kristallgröße#." (2011 and 2022);
>    - Jeffrey "Kristallgröße:#" (2010 and 2014);
>    - Herkimer "Etwa#großer" (2023 and 2026). This one changes cooling's verdict in §2.6.
>
>    Calling it "one contributor's series" (targets.mjs:59, appendix line 8, the §2.6 header) overstates it. Either require the photos to be uploaded close together, or call it "one wording".
>
> 5. **Scenarios that can never be decided are not flagged.** In 10 of the 32 scored scenarios, no run can be YES in the current cavity, whatever the simulation does. For four of them — Naica, Searles, Sicily and Marlborough — every protagonist's q25 is longer than the cavity span. That is the substance of the boss's 50 mm concern. The table shows them as UNCLASSED / UNRESOLVED, which reads as "waiting for evidence". The list in §2.3 (PROPOSAL:533) names Elmwood, which can still be decided, and leaves out Sicily and Marlborough. Add a generated flag.
>
> 6. **Test gaps.** I ran 46 mutants of the lib: 40 were killed and 2 change nothing. Real survivors:
>    - the measured join requiring three dimensions changed to two (lib:375, a round-2 rule);
>    - "longer than the cavity" at exact equality (lib:536, :565);
>    - the Wilson z value;
>    - which protagonist is credited when several qualify (`crystal ??=`).
>
>    In the scoreboard, dropping `+ c.unclassified` from `open` (showcase-scoreboard.mjs:185, :204) passes all 65 tests and `--check-splice`. Round 1's must-fix #2 is pinned only by a composition written inside the test. Move the verdict assembly into the lib and test it there.
>
> 7. **The schema is out of date.** SCHEMA-STORY-POCKET-TARGETS.json lacks `rules.specimen_min_mm`, `uploaded_together_s`, `size.series` and `size.without_largest_series`.
>
> 8. **Thresholds outside the sidecar.** CLUTTER_LIMIT 0.1 (scoreboard:67) and the 0.5 star / companion-star threshold (:268, :427) are targets set in advance in WP2 and WP3 (PROPOSAL:922, :954). The 0.5 is also the companion target the boss asked for. Neither is in the sidecar's rules.
>
> 9. **Minor:**
>    - A title cut to "gkristall-Gwindel" gets past the `(?<!berg)` guard (lib:90), so 1571385837 is read as one 30 mm crystal.
>    - "(Spinell 4 mm)" (1552208990) is read as a specimen length.
>    - "Kleinstufe … 6cm breit" (a specimen width) is counted under crystal widths set aside.
>    - A 1,400 mm Tsumeb calcite "specimen" (1207125581, "98 x 140 x 35 cm") goes into a proxy unchecked.
>    - Audit headers count statements, not specimens: Mogok spinel shows "(9)" against n 8.
>    - mvt galena: a 0.19 mm margin prints as "12–30 mm; simulated at most 12", which reads as a tie.
>    - The WP1 target says "story-scale runs", but the denominator also includes unclassed runs.
>
> **Verified correct**
> - **Guardrails:** nothing under js/ or data/ changed in f49c1804..5f1eed02. The comparison tool last changed in afbe687f, and re-running it gives a byte-identical compare.json (sha256 8419de06…). No simulation was run.
> - **Checks:** the targets match a rebuild. All 13 scoreboard blocks and both substrate blocks match. The size-evidence tool reproduces the appendix. 65 of 65 tests pass.
> - **Round-2 responses that hold:**
>   - #1: the parser rules are correct. "x," and the pseudomorph rule each fire on exactly one photo, and "breit" is read as a width. The floor is registered, but see must-fix 2.
>   - #2: round 2's named mutants are killed.
>   - #3: the upload window, the measured join and the Fundort check are implemented, and every join is listed.
>   - #4.
>   - #5: the bound is correct (Fréchet minimum per scenario). I recompute 10^-29.07 over 30 scenarios, 10^-84.5 if independent. At the band ceilings about 37 species would be expected in every seed; 120 are.
>   - #6, #8 (20 of 25, using max_mm) and #9.
>   - #7 is implemented, but see item 4.
> - **Round 1 spot-checks hold:** #1, #2, #5, #7 and #11.
> - **Audit:**
>   - I read every crystal row (about 200); one is debatable (the Gwindel).
>   - All 34 joins that carry a crystal or specimen length are plausible. The other 82 caption joins carry only picture widths.
>   - The 22 values behind the Tsumeb malachite proxy parse cleanly.
> - **Prose numbers outside the markers check out:** quartz grows in 19 scenarios; Herkimer grows one 0.57 mm quartz crystal; Naica grows one selenite against six celestine.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| 1 | the story frequency contradicts the bands and size targets | The frequency is now the most common protagonist's band floor × the display range's coverage of the record (q25–q90 holds 65 % of the record's own crystals): the story rate of a fleet whose protagonist occurs at its band's floor with crystals spread as the record's are. The display range is a registered rule (`display_range`, which the scoreboard requires to be [0.25, 0.9]); `storyFrequency` is in the lib. | A test samples such a fleet (11 of 21 seeds, IN band; crystals at the record's own quantiles, MEETS): STORY under the new rule, THIN STORY under the floor alone. Another test recomputes every committed frequency: 0.325 for an abundant protagonist, 0.195 for a common one. §2.6 lists the verdicts the floor alone would change. |
| 2 | Tsumeb's flip came from the 10 mm floor, not the caption | §2.1 now says so, and that round 2's response had credited the caption. §2.6 gains a generated table: the targets rebuilt in memory from the same capture with one evidence rule changed (specimen floor 0, 5, 20 mm; upload window 1.2 days, 116 days, none), and the story frequency without the coverage; every scenario re-scored against the same runs. | Under the corrected frequency Tsumeb is STORY (PROXY) again (8 of 21 runs reach its proxy). It moves to UNRESOLVED at a 20 mm floor or under the floor-alone frequency; floors of 0 and 5 mm change nothing. |
| 3 | the join window's sensitivity; a false basis | In the same table. `uploaded_together_basis` is now written by the targets tool from the capture's own image ids. | A 1.2-day window makes Ouro Preto NO STORY (its two photographs 1.6 days apart stay apart); 116 days or no limit change nothing. The basis now reads: 2,217 ids from 2004-09-08 to 2026-10-19, 2 days before the capture. |
| 4 | the series key is generic | A series now also needs its uploads in one stretch, each less than a year after the one before (`largestSeries`; `series_gap_s` registered, with its basis). Measured first: within one unusual wording, Grimsel's 18 quartz lengths span 314 days with gaps up to 166 days, and the North Pennines' 9 fluorite lengths 130 days. Standard wordings recur 979–4,225 days apart (Herkimer, Mogok, Jeffrey, Naica, Ouro Preto). The appendix gives each series' span in days. The prose and the limits call it "one wording, uploaded in one stretch", a proxy for one contributor, since the capture has no uploader names. | Herkimer's two "Etwa # mm großer" lengths, 979 days apart, are no longer a series. Its NO STORY still moves at the five-length minimum. The North Pennines and Grimsel series stand. |
| 5 | undecidable scenarios not flagged | `scenarioVerdict` returns `cannot`, the protagonists with an engine when none can carry the story in any run's cavity. A generated flag per scenario and a line under the verdicts table split them by cause. The reviewer's "every protagonist's q25 longer than the span" cases all rest on specimen proxies, which overstate the crystal. So the line and the flag mark proxies: crystal lengths could still bring such a target within the cavity. §2.3's hand-typed list is replaced by a pointer. | 10 of 32 scenarios. Proxies beyond the span: Naica, Searles, the Marlborough chrysoprase (ultramafic_supergene). The same plus protagonists with no size target: Sicily. No size target at all: six. Elmwood is not among them. |
| 6 | test gaps; the verdict assembly untested | The verdict assembly (story counts, open reasons, NO ENGINE, SMALL POCKETS ONLY, `cannot`) moved into the lib as `scenarioVerdict`; the scoreboard and its robustness rows call it. New tests: a measured two-dimension size uploaded apart does not join; a crystal exactly as long as the span fits (runStory and assessSize); the Wilson interval for 10 of 21, worked by hand (0.2834–0.6763); the credited protagonist (the first that qualifies, a crystal target before a proxy); unclassed runs keep the verdict open; any run's cavity can decide. | 21 mutants on the new code, the reviewer's survivors among them: all killed (one needed the two-cavity test, added). 80 tests. |
| 7 | the schema is out of date | The schema documents every field the sidecar writes, and every object in it is closed (`additionalProperties: false`). A test validates the committed sidecar against it, with a control in which it fails: an unregistered rule, a missing one and a bad confidence are each caught. | — |
| 8 | thresholds outside the sidecar | `clutter_limit` (0.1) and `star_wanted_share` (0.5) are registered rules with their bases (WP3's and WP2's targets); the scoreboard reads them. The generated rules block lists every registered number a verdict or flag uses. | — |
| 9 | minor | A stretch cut into "…gkristall" (Bergkristall) names no crystal: 1571385837 is a 30 mm specimen, and Grimsel's quartz crystal sample goes from 26 to 25. "(Spinell 4 mm)" is the spinel's crystal. A width ("Kleinstufe … 6cm breit") is counted as a width, a crystal's or a specimen's. Every specimen length of 300 mm or more is listed for audit and kept as written; the list exposed a parser error the review did not name: "Der Gang ist etwa 60 cm mächtig" (a vein's thickness) had become a 600 mm Schneeberg specimen, now dropped (a test). Audit headers count lengths and specimens. mvt's galena prints 12.0 against 11.8 mm. WP1's target says "scored runs (story-scale and unclassed pockets)". | The verdicts do not change. |

Also added: the variety line now gives the reviewer's expected count. At their bands' ceilings, about 37 species would occur in every seed; 120 do.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (was 1, 0, 3, 27, 1, 1).
Tsumeb's STORY (PROXY) is the most fragile verdict (§2.6).

## Round 4 of 5 — 8/10 (on 80f3b450)

### The report

> I worked read-only. `git status` is clean, and every `.local-evidence` input and output is byte-identical to before; the only write was the row `npm test` appends to the test-quarry ledger. Mutants ran on a scratch copy, using a vitest stand-in that reproduces 80/80.
>
> **MUST-FIX**
>
> 1. **The story frequency is still not consistent with the bands and size targets, and the stated reason for it is false.**
>    - Where: `tools/story-pocket-lib.mjs:662–675` (the claim is at :666), `tools/story-pocket-targets.mjs:67` and `:70`, PROPOSAL:258–267, `showcase-scoreboard.mjs:82`, and the test at `test.ts:513–525`.
>    - **The basis is wrong for most targets.** It says q25–q90 holds "the share of the record's own crystals", 0.65. The committed crystal targets actually hold:
>      - 3/6: Jeffrey's grossular (a primary) and the Deccan calcite;
>      - 3/5: Herkimer's quartz (the primary behind its NO STORY), North Pennines galena and Tsumeb cerussite;
>      - 5/8, 7/11, 11/17, 17/25, 6/9 and 7/9 for the rest.
>      - So 7 of the 11 are below 0.65.
>    - **Round 3's failure persists on a committed primary.** I gave Jeffrey's grossular a fleet made of the record's own six lengths, cycled.
>      - At 11/21 and 13/21 seeds it is IN band and the size verdict is MEETS, yet only 6/21 runs carry the story: THIN STORY (noise).
>      - It needs 15/21 (71 %) to pass — round 3's "about 77 %" problem again.
>    - **Sampled fleets fail too (round 3 asked for this test).** I drew a record of n lengths from a lognormal, then a fleet in 11/21 seeds with crystals from the same population.
>      - It reaches STORY in 31 % of trials at n 5, 33 % at n 6, 51 % at n 17 and 54 % at n 25.
>      - Even when the fleet is IN band and MEETS, it reaches STORY in only 46–59 %.
>      - A fresh crystal lands in [q25, q90] with probability ≈ 0.65(n−1)/(n+1), which is 0.43–0.60 at these n.
>      - The committed test passes by construction: a 40-length record, sizes at its own R-7 quantiles, 7/21 against a needed 6.825.
>    - **MEETS does not guarantee the frequency.** On the committed North Pennines target, 11/21 seeds (IN band) with a median of 15.5 mm (MEETS) give 6/21: THIN STORY.
>    - **It also lets weak fleets pass.**
>      - 7/21 seeds, LOW against the AB band, all at 17 mm: STORY.
>      - Tsumeb's STORY (PROXY) exists only because of the 0.65 factor. All 8 runs that carry it (44.3–48.9 mm) are longer than every photographed Tsumeb malachite crystal (≤ 30 mm); two more runs sit at 43.8 mm against a 44.0 mm threshold. The same malachite's size verdict is BELOW PROXY.
>    - **At both Asbestos Hills scenarios the frequency comes from a species that can never carry the story.** The 0.325 is set by crocidolite, which has no size target. The only possible carrier, tiger's eye (CO), at its band floor implies 0.195.
>    - **Fix:**
>      - Derive the frequency only from protagonists that can carry a story run, using each target's own coverage — or judge the story conditional on occurrence and check the band separately.
>      - Replace "meets it too" with what is true: it is an expected rate, and a fleet at the band floor passes about half the time with 21 seeds.
>      - Test with sampled fleets at the committed sample sizes.
>
> **SHOULD-FIX**
>
> 1. **§2.6 leaves out the minimum sample (5), which moves more verdicts than any rule it shows.**
>    - Where: `showcase-scoreboard.mjs:378–395`, PROPOSAL:373–377 and :694–701.
>    - At a minimum of 4:
>      - Tsumeb STORY (PROXY) → UNRESOLVED: its four crystal lengths (6–30 mm) become a target, and the malachite is OVERSIZE against them.
>      - Ouro Preto → NO STORY.
>      - Naica → SMALL POCKETS ONLY — exactly the boss's 50 mm case.
>    - At 6 and 8, Herkimer → UNRESOLVED; at 10, Grimsel as well.
>    - The prose says Tsumeb "turns on" two rules; it turns on three.
>    - Fix: add these rows (as a buildTargets option) and correct the prose.
>
> 2. **The headline STORY is not WP1's own pre-registered target.**
>    - Where: PROPOSAL:883–888 against `lib:706`.
>    - STORY checks only WP1's first bullet. The North Pennines fails the second: quartz is 0/21, LOW, and not within noise.
>    - It is also the fleet the boss ruled out: fluorite in 21/21 seeds at 17.35–17.99 mm (1 % spread against the record's 147 %), in one cavity.
>    - Fix: add a generated WP1 column (met, or which bullet fails), and say this in "Reading it" (:370–372).
>
> 3. **The noise criterion is not registered.** The 95 % Wilson interval (`lib:450`, `:543`; `scoreboard:267`) decides which occurrence failures get flagged and when THIN STORY carries "(noise)", but it is not among the sidecar's rules.
>
> 4. **Test gaps.** Of my 57 mutants, 47 were killed. Eight of the ten survivors change nothing on the current data, or change only a label. Two are real gaps:
>    - `yesCrystal >= yes` in place of `yesCrystal / runs >= frequency` (`lib:657`): STORY against STORY (PROXY) when a run set mixes crystal and proxy passes is untested.
>    - A series measured from its first upload rather than chained upload to upload (`lib:337`).
>
> 5. **Joins (49 of them carry a length).** No verdict moves.
>    - Over-joined: 1671709103 + 1671708672 at Wittichen. One is "mit etwas Limonit … 6 x 4 cm", the other "mit etwas Hämatit … 4 x 6 cm", 7 minutes apart: two specimens.
>    - Under-joined:
>      - 1264324998 / 1246092168, "15,9 x 10 x 4,7 cm", one captioned as a detail of the other, 211 days apart. The size is given to the millimetre, but `lib:418` does not count it as measured because the decimal is in centimetres.
>      - 1298577983 / 1298576363, both "Kristallgröße: 6 mm" from Malad, 27 minutes apart. They sit in the Deccan calcite's six-length crystal target.
>
> 6. **Parser.** I read 70 seeded specimen values behind the protagonist proxies; one was wrong (≈1.5 %, within §5's stated rate).
>    - 1329063320, "rhomboedrische Krisalle bis 1cm" (a typo for Kristalle), is a crystal length filed as a 10 mm Tsumeb smithsonite specimen.
>    - "Durchmesser" after a number is not handled. 1309617819 ("Calcit-XX max. 45 mm Durchmesser") enters the North Pennines calcite crystal sample; 1112043669 ("…bis 1 cm Durchmesser") becomes a specimen length.
>
> 7. **Prose.** "One contributor's series" (PROPOSAL:371–372) and "a few contributors supply many" (:610–611) state as fact what round 3 accepted is only a proxy: one wording, uploaded in one stretch.
>
> 8. **Runtime validation is thinner than the schema.** `validateSidecar` (`lib:751`) does not require `clutter_limit`, `star_wanted_share`, `specimen_min_mm`, `uploaded_together_s` or `series_gap_s`. A missing `clutter_limit` silently turns off the clutter flag (`>= undefined` is false, `scoreboard:283`); only the schema test catches it.
>
> 9. **Wording of the `cannot` flag.** For scenarios that fail on evidence it reads "no run can carry the story in this cavity: X has no size target" (`scoreboard:280–281`). The cavity is not the cause.
>
> **Verified correct**
>
> - **Guardrails:** nothing under `js/` or `data/` changed in e6f96d4b..80f3b450. The comparison tool last changed in afbe687f, and re-running it gives byte-identical `compare.json` (8419de06…) and `compare.md`. No simulation was run.
> - **Checks:** the targets match a rebuild; all 13 scoreboard blocks and both substrate blocks match; the size-evidence tool reproduces; 80/80 tests pass.
> - **Round-3 responses that hold:**
>   - #2: the attribution is corrected, and every row of the variants table reproduces.
>   - #3: the upload-window basis is generated from the capture (2,217 ids, 2004-09-08 to 2026-10-19).
>   - #4: a series is one wording with each upload under 365 days after the last. Grimsel's 18 lengths span 314 days (largest gap 166); the North Pennines' 9 span 130; standard wordings recur 979–4,225 days apart. Herkimer's two lengths are no longer a series.
>   - #5: 10 of 32 scenarios are flagged as unable to carry the story, and the split by cause is correct.
>   - #6: `scenarioVerdict` is in the lib, and the `+ c.unclassified` mutant is killed.
>   - #7: the closed schema holds, and the test's validator covers every keyword it uses. Only the inner objects under `overrides` are left open.
>   - #8 and #9: all hold; each parser case has a test.
>   - #1: only partly (MUST-FIX 1).
> - **Rounds 1–2 spot-checks hold:**
>   - No size floor: treating fully enclosed protagonists as absent changes only Searles' open count.
>   - The unclassed-pocket rule still decides nothing: only colorado_plateau has unclassed runs.
>   - The Ouro Preto duplicate is joined, longer-than-the-cavity runs stay open, and the every-seed bound is correct.
> - **Audit:** I read every row behind the 11 crystal targets; they are clean. The 22 values behind Tsumeb's malachite proxy parse cleanly (q25 44.0 mm).

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | the story frequency is still inconsistent with the bands and size targets, and its stated reason is false | The coverage is now each target's own: 0.65 × (n − 1) / (n + 1) (`displayCoverage`), the chance that a fresh crystal from the record's population lands in the display range of a record of n. It is exact for a uniform population and within about 0.03 for lognormal ones (simulated first, then in a test). Only a protagonist that can carry a story run (an engine, a band and a size target) sets the frequency. The rule no longer claims that a fleet meeting every target meets it. It says what is true: the frequency is the expected story rate of a fleet at its protagonist's band floor with crystals from the record; with 21 seeds such a fleet falls short about half the time; the verdict marks a shortfall within the 95 % interval "noise", now a registered rule (`noise_z`). The story verdict checks the frequency alone; WP1's whole target is reported apart (S2). | Tests draw fleets from a lognormal record at every committed sample size (5, 6, 8, 9, 11, 17, 25; 600 trials each). The mean story rate reaches the frequency; STORY comes in more than 35 % of trials (about half); a shortfall beyond noise in under 5 %. A fleet whose crystals run a third of the record's size passes in under 5 %. Frequencies now run 0.14–0.31, and 8 scenarios have none. At the Asbestos Hills the frequency is tiger's eye's (0.17), no longer crocidolite's. The reviewer's weak fleet (7 of 21 seeds, all at 17 mm) still passes the story check. 7/21 is within noise of a 50 % floor, so 21 seeds cannot call it weak (§5 now says so), and its single size is what WP9's spread target flags. Tsumeb stays STORY (PROXY): its calcite proxy of 45 sets 0.31, and 8 of 21 runs carry the story. §2 calls it the most fragile verdict, which its four crystal lengths contradict (S1). |
| S1 | §2.6 leaves out the minimum sample | `buildTargets` takes `sizeMinSamples`; the table has rows for 4, 6, 8 and 10. The prose now says Tsumeb turns on three rules, and that the minimum moves the most. | At 4: Tsumeb → UNRESOLVED, Ouro Preto → NO STORY, Naica → SMALL POCKETS ONLY (its four selenite lengths become a crystal target the 50 mm cavity cannot hold). At 6, 8 and 10: Herkimer, then Mogok and Grimsel → UNRESOLVED. |
| S2 | the headline STORY is not WP1's own target | `wp1Target` (lib): the story frequency met, every protagonist with an engine within its band (a miss within noise counts as within), none oversize. A generated line under the WP1 table reports it. §2 says the North Pennines' STORY misses it and is the fleet the contract rules out (fluorite in every seed at one size, in one cavity). | Met by 0 of 32. The North Pennines fails on quartz below its band, Tsumeb on calcite below its band. |
| S3 | the noise criterion is not registered | `noise_z` (1.96) with its basis; `assessOccurrence`, `storyVerdict` and `scenarioVerdict` take z; the scoreboard passes the registered value; the schema and the validation require it. | A test: 9 of 21 against the AB band is noise at z 1.96, not at 0.5; the scenario verdict carries z through. |
| S4 | test gaps | STORY against STORY (PROXY) when crystal targets alone reach the frequency (12 of 20 yes, 10 on crystal, at 0.5: STORY); a series chained upload to upload (0, 300, 600 days: one series of three). | 21 mutants on the new code, all killed (one after a test that z reaches the scenario's verdict). 88 tests. |
| S5 | joins | The three named cases are fixed by rules, not by hand. Two photographs that each name a mineral the other does not are two specimens; the lead counts as named in both, so a stretch cut through its name cannot split a pair. A size written with a decimal is measured, in centimetres as in millimetres. Captions are compared once a cut word, punctuation and "mit", "und", "auf" are dropped. The minerals check exposed a parser bug the review did not name: `mineralOfWord` read "groß" as grossular and "Smith" (Smith Co., Tennessee) as smithsonite through its fallback for cut words. The fallback now reads only a word cut at a stretch's end. An audit of every word in the capture found it had fired on whole words only in those two cases. | Against round 3: Limonit/Hämatit split; 1264324998 + 1246092168 and the Malad pair joined; nothing else moves. 117 joins (100 by caption, 17 by size); 2,217 photographs → 2,100 specimens. No verdict moves. |
| S6 | parser | "Krisalle" (a typo) is a crystal cue, and "rhomboedrisch" a form. A diameter after a number ("45 mm Durchmesser") is a width, not a length. | Tsumeb's 1329063320 is a 10 mm smithsonite crystal; the North Pennines' 45 mm calcite diameter and 1112043669 are set aside as widths. |
| S7 | "one contributor's series" stated as fact | §2 and §2.4 say "one series (one wording, uploaded in one stretch)". | — |
| S8 | runtime validation thinner than the schema | `validateSidecar` requires and range-checks `visible_mm`, `specimen_min_mm`, `uploaded_together_s`, `series_gap_s`, `display_range`, `clutter_limit`, `star_wanted_share` and `noise_z`. A missing `clutter_limit` now stops the scoreboard. | Tests for a missing or invalid rule. |
| S9 | the `cannot` flag blames the cavity | Where only evidence is missing, it reads "no run can carry the story until a protagonist has a size target (…)". | — |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged from round 3).
WP1's whole target is met by none.
