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

## Round 5 of 5 — 8.5/10 (on 44f3ac23)

### The report

> I worked read-only. `git status` is clean. Every `.local-evidence` file is byte-identical after my runs, and re-running the comparison gives the same `compare.json` (8419de06…) and `compare.md`. The only write was the row `npm test` adds to the test-quarry ledger. I ran mutants on a scratch copy (`scratchpad\review5\mut`) with a vitest stand-in that reproduces 88/88. Each mutant also went through the targets check and `--check-splice`.
>
> **MUST-FIX**
>
> 1. **The story frequency's stated basis is true only for the 4 frequencies set by crystal targets. Specimen proxies set the other 20 of 24, and one setter can never carry a run.**
>    - Where: `story-pocket-lib.mjs:695–713` (the filter at :708), `story-pocket-targets.mjs:68` and `:71`, the rules block (PROPOSAL:183), PROPOSAL:261–275.
>    - The basis says it is "the expected story rate of a fleet … with crystals drawn from its record's population". For a proxy, that population is specimen sizes, which the proposal itself says overstate the crystal. Only Herkimer, Grimsel, the North Pennines and Shigar have crystal-set frequencies.
>    - The cavity is ignored. In 15 of the 20 proxy-set scenarios, the setter's q90 is longer than the span, and runs past the span are open, not YES.
>    - At Elmwood the setter is calcite, whose display range starts at 80 mm in a 66 mm cavity. It can never carry a run: round 4's Asbestos Hills defect in another form. Leaving it out gives 0.287 (sphalerite) instead of 0.308.
>    - The fleet tests (`test.ts:586–616`) model only crystal targets, in a 1e6 mm cavity.
>    - No verdict moves today.
>    - Fix: leave out setters whose q25 exceeds the largest span, as `cannot` already does. Say that for a proxy the frequency is how often crystals as large as the specimens would reach it — a bar for STORY (PROXY), not an expected rate. Mark proxy-set frequencies in the basis.
>
> 2. **WP1's whole target fails a crystal that is too large but not one that is too small, so the median — the "central showcase target" — decides nothing.**
>    - Where: `lib:756–766` (`wp1Target`), PROPOSAL:916–925 and :889, against §1.1 rule 4 (PROPOSAL:99–102: "judged against the record's median").
>    - Evidence on the committed North Pennines fluorite target (q25 15 mm, median 17 mm):
>      - Fluorite in 21/21 runs, 7 at 18 mm and 14 at 10 mm, gives STORY with size BELOW. Occurrence is HIGH within noise, so WP1 is **met**.
>      - The mirror fleet, with the 14 runs at 70 mm, is OVERSIZE and fails WP1.
>      - In simulation, a protagonist in every seed at half the record's size reaches STORY in 51 % of trials (n 5) and 42 % (n 17) — as often as a correct fleet at its band floor.
>    - Round 4 (S2) introduced this, and the prose never says BELOW decides nothing.
>    - Fix: require the story-carrying protagonist to be not BELOW (or MEETS). Or state plainly in §1.1, §1.3 and §4 that the median is reported, not required, and why oversize alone fails.
>
> **SHOULD-FIX**
>
> 1. **Mogok reads "NO STORY (noise)" although its ruby never forms, and three story checks cannot fail.**
>    - Where: `lib:681`, PROPOSAL:349.
>    - Mogok's frequency is now 0.139 (0.195 under round 3's rule). That is below 0.155, the top of the Wilson interval for 0/21, so the label says "noise".
>    - Schneeberg and Marlborough (0.152) can never fail beyond noise either. §5 (PROPOSAL:1359–1364) calls the check "weak", not powerless.
>    - Fix: name these three in a generated line. Drop the noise mark when no protagonist with an engine occurs: the seeds are one pocket sampled 21 times (§2.5).
>
> 2. **Series are never checked for proxies, and Mogok's NO STORY rests on one.**
>    - Where: `scoreboard:214` checks series for crystal targets only.
>    - Mogok's frequency comes from a ruby proxy of 6 specimens. Four of them are one wording ("Rubin ; Größe: NNxNN mm", ids 1286832317–1286909219), uploaded within 0.9 days. Without them n = 2, there is no frequency, and the verdict is UNRESOLVED.
>    - Other proxies that set a frequency and are dominated by one wording: Cripple Creek 6/9, Tormiq 3/5, Wittichen 4/7.
>    - Fix: extend §2.6's series rows to these proxies.
>
> 3. **A hand-typed list is stale** (PROPOSAL:417–418). Round 4's diameter rule removed the North Pennines calcite's 45 mm length (1309617819), so the generated table (:345) now flags "calcite larger than every photographed crystal". The list still names only four cases. Generate it.
>
> 4. **"No verdict holds under every check" (PROPOSAL:734) is false.** 24 of the 26 UNRESOLVED verdicts, and NO ENGINE, hold under every §2.6 row. Say "no decided verdict".
>
> 5. **Test gaps in the round-4 code.** Of 39 mutants I wrote, 16 survive the tests, the targets check and all 13 blocks (two are near-equivalent). The survivors:
>    - `wp1Target`: ignoring HIGH beyond noise, failing LARGE, passing THIN STORY.
>    - `validateSidecar`: no check on `star_wanted_share`, `visible_mm`, `uploaded_together_s` or `specimen_min_mm` — 4 of the 8 newly required rules are untested.
>    - Joins and parser: "measured" needing a comma decimal; "und" and "auf" not dropped; the `namedIn` cut flag; "ø" and "diameter" dropped; the cut-word fallback's length set to 4 or 7.
>
>    None changes an output. "21/21 killed" covers only the authors' own mutants.
>
> 6. **The join description is stale.**
>    - `size-evidence.mjs:219` (appendix line 5) still says "measured to a tenth of a millimetre … never with captions that name different finds".
>    - The rule now accepts any decimal ("15,9 cm"), adds the minerals rule, and compares captions without a cut word, punctuation, "mit", "und" and "auf". §5 (PROPOSAL:1343–1345) also omits the minerals rule.
>
> 7. **Latent over-join at `lib:436`: a shared picture size joins two specimens.**
>    - Two photographs a day apart that both state "Bildgröße: 8 x 6 mm", with crystals of 5 and 9 mm, become one specimen (I checked this).
>    - None of the 17 current dimension joins is a picture size. Limit dimension joins to crystal and specimen statements before WP0 reads micromount galleries.
>
> 8. **Minor:**
>    - The robustness rows keep the committed frequency (`scoreboard:212`). For example, Herkimer at the minimum keeps 0.217 where a rebuild gives 0.282. No verdict changes.
>    - A "Durchmesser" of tabular crystals or rosettes is their length (1113123336, 1265104333). No target changes.
>    - The "< 5 %" assertion at `test.ts:603` sits at its edge for n 6 (5.1 % in my 4,000 trials at 11/21).
>    - The new "limonit" stem, which the Wittichen split needs, is not in the response table.
>
> **Verified correct**
>
> - **Guardrails:** nothing under `js/` or `data/` changed in f49c1804~..44f3ac23. The comparison tool last changed in afbe687f. No simulation was run.
> - **Checks:** the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; the appendix reproduces byte for byte; 88/88 tests pass.
> - **M1 holds for crystal targets.** `displayCoverage` is exact for a uniform population. My fleets at 11/21:
>   - reach STORY in 47–62 % of trials;
>   - fall short beyond noise in 0.5–5 %;
>   - at a third of the record's size, pass in 0.2–4 %.
>
>   Fleets drawn at p = 0.5 reach STORY in 43–51 %. The Asbestos Hills frequency is now tiger's eye's, 0.173.
> - **Other round-4 responses:**
>   - S1, S3, S4, S7 and S9 hold.
>   - S2's generated line is correct (but see MUST-FIX 2). S8 is implemented (but see SHOULD-FIX 5).
>   - S5: against round 3, exactly three joins change: the Limonit/Hämatit split, 1264324998+1246092168, and the Malad pair. 117 joins = 100 + 17. The whole-word audit reproduces: "groß" 9×, "Smith" 7×.
>   - S6: 8 of 2,261 caption stretches parse differently from round 3, all of them the diameter and "Krisalle" cases.
> - **Earlier rounds still hold:** no size floor; no unclassed runs outside colorado_plateau; the Ouro Preto duplicate is joined; Bisbee's runs longer than the cavity stay open; the every-seed bound; Tsumeb's floor sensitivity.
> - **Audit:**
>   - All 50 joins that carry a crystal or specimen length are plausible.
>   - The unjoined near-duplicates are within the registered rules: Tri-State galena with an identical caption 14 days apart, and Tsumeb calcite "45x30x30 mm" 139 days apart.
>   - The crystal rows behind 7 targets, and the Tsumeb calcite (45) and Mogok ruby (6) proxies, parse cleanly.
>
> **Ready for the boss?** Not yet. First fix the two must-fixes (mostly wording, plus leaving out setters that cannot reach the cavity) and should-fixes 1, 3 and 4, which are prose and one-line rules. The rest can go to the boss as known limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | the frequency's basis holds only for crystal setters; proxies set most; one setter can never carry a run | A protagonist sets the frequency only if it can carry a story run in the scenario's cavity: an engine, a band, and a size target whose display range starts within the span. The targets tool reads each scenario's span from cavities.json (the authored wall, read before any run), records it as `cavity_span_mm`, and the scoreboard refuses a cavities.json that differs. The rule and every basis now say what the number is: an expected story rate for a crystal target; for a proxy, a bar for STORY (PROXY), the rate at which crystals as large as the specimens would reach the range, not an expected rate. Runs longer than the cavity stay open, so a cavity shorter than the range's top leaves a verdict open. The frequency is never lowered to fit the cavity: that would be the rescaling the contract rules out, so the cavity only removes setters that cannot fit at all. A new test draws fleets in a cavity cut at the record's median. It found that the noise mark counted only the runs that carry the story, so a minimal fleet was failed beyond noise in 10.5 % of trials. Noise now counts the runs that carry or could carry it (yes + open). | Elmwood: sphalerite sets 0.287 (calcite could never fit, from 80 mm in 66 mm). Naica, Searles, Sicily and Marlborough have no frequency now: none of their protagonists can carry a run in the cavity, as their flag already said. 4 crystal-set frequencies, 16 proxy-set, each labelled. No verdict moves. The cut-cavity fleet is failed beyond noise in under 8 % of trials (a test). |
| M2 | WP1 fails too large but not too small, so the median decides nothing | WP1's whole target now requires each protagonist that carries story runs to be at the record's size: its typical crystal within the record's middle half (MEETS, as contract rule 4 says). BELOW and LARGE fail, as OVERSIZE does. A proxy reached passes. A carrier short of its proxy is open, not failed, since a proxy cannot refute (`wp1Target` returns `open`). §1.3, WP1's target and §4 say so. | The reviewer's North Pennines fleets (7 runs at 18 mm with 14 at 10, and the mirror at 70) both tell the story, and both now fail WP1: one below the middle half, one oversize (a test). Today: met by 0 of 32; Tsumeb's malachite is open (short of its proxy). |
| S1 | Mogok's "NO STORY (noise)" though ruby never forms; checks that cannot fail | A generated line names the story checks that 21 seeds cannot fail beyond noise (a frequency at or below 0.155, the top of the interval for 0 of 21). The noise mark is dropped where no protagonist with an engine occurs in any seed: the seeds repeat one pocket, and chance explains nothing. | Mogok (0.139) and Schneeberg (0.152) are listed. Marlborough has no frequency now (M1). Mogok reads NO STORY without the mark. |
| S2 | series never checked for proxies; Mogok rests on one | Specimen lengths get the same series rule as crystal lengths (`specimen_series` in the evidence, a new appendix column, `series` and `without_largest_series` on proxy targets). §2.6 gains a row for every proxy with a series or at the minimum. Every robustness verdict is scored against the frequency rebuilt by the same rule, not the committed one (round 5's minor). | Mogok's ruby: 4 of 6 in one series; without it, 2 → UNRESOLVED (listed among the verdicts that move). Its tourmaline series leaves NO STORY standing. |
| S3 | a stale hand-typed list | Both lists in §2's flags are generated: a line under the table names the crystals larger than every photographed crystal of their species, and the crystals longer than the starting cavity. | It now includes the North Pennines' calcite and Searles' tincalconite. |
| S4 | "No verdict holds under every check" is false | "No decided verdict (STORY, STORY (PROXY), NO STORY) holds under every check"; most UNRESOLVED verdicts hold, being open already. | — |
| S5 | 16 surviving mutants | Tests for each named survivor: WP1 fails a HIGH occurrence beyond noise and a THIN STORY, and a LARGE carrier; `validateSidecar` rejects a bad `star_wanted_share`, `visible_mm`, `uploaded_together_s` and `specimen_min_mm`; a size measured with a decimal point joins as one with a comma does; "und" and "auf" are dropped from captions; a mineral cut at a stretch's end counts in the minerals rule; "Ø" and "diameter" are diameters; the cut-word fallback reads five letters ("Rauch") but not four ("Topa"). The fleet test's bound is 8 %, with room above the reviewer's 5.1 % at n 6. | 95 tests. 12 mutants on this round's code, all killed (one after a test that a proxy target records its series). |
| S6 | the join description is stale | The appendix and §5 describe the rules as they are: the same caption once a cut word, punctuation and "mit", "und", "auf" are dropped; a size written with a decimal; never across two finds, or two captions that each name a mineral the other does not. | — |
| S7 | a shared picture size joins two specimens | Size joins come only from a crystal, aggregate or specimen statement; a picture's size identifies no specimen (a test). | The 17 size joins are unchanged. *[Corrected in round 6: this was false. The filter dropped two Deccan stilbite joins whose "Ausschnitt" after a three-dimension size had been misread as a picture width, leaving 15 joins and 2,102 specimens. Round 6 reads a three-dimension size as never a picture's, which restores the 17 joins and 2,100 specimens.]* |
| S8 | minor | Robustness verdicts rebuild the frequency (S2). A diameter after a tabular or rounded form is its size ("tafelige Kristalle bis 2 mm Durchmesser", "Eisenrosen … 19 mm Durchmesser"; tests); §5 names the rule's limit. The "limonit" stem (round 4) is what lets the minerals rule split the Wittichen pair; round 4's response omitted it. | No target changes. |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged).
WP1's whole target is met by none. Five rounds have run: the standing rule stops here, and a sixth needs the boss's word.

## Round 6 (boss-approved) — 8.5/10 (on c32ed5cc)

The boss approved a sixth round on 2026-10-23, after the standing five.

### The report

> I worked read-only. `git status` is clean. Every `.local-evidence` file is byte-identical after my runs, except the row `npm test` adds to the test-quarry ledger. I ran mutants on a scratch replica (`scratchpad\review6\mut`). Its vitest stand-in reproduces 95/95 tests, the targets check and all 13 blocks.
>
> **MUST-FIX**
>
> 1. **The cavity rule for frequency setters changes frequencies without saying so, and the prose says it never does.**
>    - Where:
>      - PROPOSAL:283–285 and `story-pocket-targets.mjs:74` (also in the committed sidecar's `story_frequency_rule`) both say "the frequency is never lowered to fit the cavity". `story-pocket-lib.mjs:710–711` says the same.
>      - The rule itself is at `lib:719`.
>      - The basis string (`targets.mjs:173`) names only the protagonist that won.
>      - The rules block (`showcase-scoreboard.mjs:580` → PROPOSAL:183) and the list of design numbers (PROPOSAL:313–322) leave the cavity condition out.
>    - Evidence:
>      - The cavity lowered Elmwood's frequency from 0.3079 to 0.2868: calcite's range starts at 80 mm against a 66.0 mm span, so sphalerite sets it. This is the response table's own example. Four scenarios lost their frequency altogether.
>      - Three protagonists are dropped as setters with no trace in any generated output: Elmwood's calcite, Cripple Creek's fluorite (57 vs 56.5 mm), and reactive_wall's **primary**, calcite (57.5 vs 55.2 mm). The `cannot` flag fires only when every protagonist is dropped.
>      - The setter test uses q25, while eligibility everywhere else is the median. So 5 of 20 frequencies come from a protagonist whose median specimen the cavity cannot hold, and whose own size verdict is ELIGIBILITY UNKNOWN:
>        - Deccan heulandite 71 mm in a 66.4 mm span;
>        - Elmwood sphalerite 69.5 in 66.0;
>        - Cripple Creek calaverite 66 in 56.5;
>        - mvt galena 80 in 63.8;
>        - Tsumeb calcite 73 in 64.8.
>      - With a median test the frequencies become: Deccan 0.308 → 0.152; Tsumeb 0.311 → 0.309; Elmwood, Cripple Creek and mvt → none. I re-scored all 32 scenarios with no cavity test and with a median test: no verdict moves under either.
>    - No size target is shrunk, so the contract holds to the letter. But the cavity now moves the bar, and the boss's "never silently rescale" is about exactly that being visible.
>    - Fix:
>      - State what is true: the coverage is never cut to the span, but the cavity removes setters whose range starts beyond it, which can lower the frequency or remove it.
>      - Name the removed protagonists in each basis and in a generated line or flag.
>      - Register the q25 choice among the design numbers and in the rules block, or align it with the median. Add a §2.6 row either way.
>
> 2. **WP1's size rule depends on the order of species in the sidecar.**
>    - Where: `scoreboard:267` passes `Object.keys(V.counts.by)` as the carriers. `by` credits one protagonist per run: the first crystal target, else the first proxy (`lib:637–643`).
>    - Evidence, on the committed North Pennines targets:
>      - Fleet: fluorite 17 mm in 21/21 runs (MEETS); galena 25 mm in 21/21 (LARGE, since q75 is 20 and q90 27.2, and at display scale in every run); quartz in 11/21; calcite 40 mm in 15/21.
>      - The verdict is STORY. In the sidecar's order WP1 is **met**. Put galena first and WP1 **fails**: "galena above the record's middle half". The fleet is the same.
>      - Two protagonists grown to size is the state WP1 tuning aims for.
>    - Fix: a carrier is every protagonist at display scale (q25–q90, within the span) in some scored run. Add a test in both orders.
>
> **SHOULD-FIX**
>
> 1. **A proxy bar also decides STORY on crystal targets** (`lib:685`; label at `targets.mjs:173`).
>    - At Deccan, Jeffrey and Tsumeb the frequency (0.308 / 0.26 / 0.311) comes from a proxy. It is above every crystal target's expected rate there: apophyllite 0.152, grossular 0.232, cerussite 0.217.
>    - A crystal-target protagonist exactly at its record reaches STORY in 3 %, 36 % and 15 % of 21-seed fleets (binomial). Where a crystal target sets the frequency, it is 41–49 %.
>    - That is round 4's must-fix again, in mixed scenarios. The label "a bar for STORY (PROXY)" understates what the number gates.
>    - Fix: judge STORY against the largest crystal-set frequency, or say plainly that the bar applies to both.
>
> 2. **Specimen series chain the site's standard field across years** (round 5's should-fix 2).
>    - 15 of 87 series span more than a year, all of them `Größe:#` specimen series:
>      - Deccan apophyllite 37 of 88 over 1,682 days;
>      - North Pennines fluorite 41 of 84 over 1,427 days;
>      - North Pennines galena 9 of 15 over 1,136 days;
>      - Sicily celestine 10 of 15 over 907 days.
>    - They are labelled "likely one contributor's lot or find" (`scoreboard:375`, appendix:8). That contradicts PROPOSAL:226–227 ("Größe: N mm", recurring years apart, counts as many contributors) and the basis for `series_gap_s`.
>    - No verdict moves: Mogok's ruby series, the one that flips a verdict, spans a single day.
>    - Fix: exclude bare field labels from series keys, or cap a series' total span.
>
> 3. **Round 5's should-fix 7 response is false, and a parser error sits behind it.**
>    - REVIEW:541 says "The 17 size joins are unchanged". The generated blocks say 15, and specimens went from 2,100 to 2,102.
>    - The two lost joins are both Deccan stilbite, each pair uploaded minutes apart:
>      - 1651866866 + 1651866721 ("Stilbit 40x35x20 mm Ausschnitt" / "…Indien");
>      - 1651866343 + 1651866225 (60x40x30 mm).
>    - Cause: `AFTER_FOV` (`lib:80`) reads "Ausschnitt" after a three-dimension size as a picture width. These are the only two three-dimension "picture widths" in the capture. The new kind filter (`lib:440`) then refuses to join them.
>    - No target moves. Fix: a three-dimension length is never a picture width; correct the response table.
>
> 4. **Registered texts are out of date.**
>    - `noise_basis` (`targets.mjs:76`) does not describe the rule the code applies. The code takes the interval of yes + open runs (`lib:687`) and drops the noise mark when no protagonist with an engine occurs (`lib:758–762`). The stated reason for the second, "the seeds repeat one pocket", is not the condition coded.
>    - `rules.series` (`:66`) still says "Crystal lengths".
>    - `specimen_joins` (`:65`) and PROPOSAL:217–220 do not mention that a picture's size joins nothing.
>    - PROPOSAL:155 says the targets come from "three inputs". `cavities.json` is now a fourth, and the sidecar records it without a hash.
>    - The `why` at `lib:684` does not mention the cavity for Naica, Searles, Sicily and Marlborough.
>
> 5. **Minor.**
>    - PROPOSAL:801–802 says "Grimsel's comes closest". The generated block shows Grimsel and the North Pennines each flip under exactly one check.
>    - The diameter exception misses cut words: 1266588159 ("…ette … 16 mm Durchmesser", a cavansite rosette) and 1207917945 are read as widths.
>    - Untested: the "aggregate" kind in size joins (`lib:440`), and 9 of the 11 alternatives in `DIAMETER_IS_SIZE`. My mutants of both survive every test and check.
>
> **Verified and found correct**
>
> - **Guardrails:** nothing under js/ or data/ changed in f49c1804~..c32ed5cc. The comparison tool last changed in afbe687f, an ancestor of the tranche. Re-running it gives a byte-identical `compare.json` (8419de06…) and `compare.md`. No simulation was run.
> - **Checks:** the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; the appendix reproduces byte for byte; 95/95 tests pass.
> - **Round 5's must-fix 1** is in place: the setter rule, `cavity_span_mm`, the span guard and the basis labels. There are 4 crystal-set and 16 proxy-set frequencies; Naica, Searles, Sicily and Marlborough have none. But see MUST-FIX 1.
> - **The noise fix is right.** I replicated the cut-cavity fleet (4,000 trials per sample size). Beyond-noise failures are 6.8–10.4 % when only yes runs count (which confirms the 10.5 %), and 0.1–0.3 % with yes + open.
> - **Round 5's must-fix 2** is in place and tested: BELOW and LARGE fail, REACHES PROXY passes, BELOW PROXY is open. But see MUST-FIX 2.
> - **Round 5's should-fixes:** 1, 3, 4, 6 and 8 hold. 2 holds for Mogok's ruby (4 of 6 within a day). 5: every named survivor now has a test. 7's rule is correct, but its claim is false.
> - **Mutants:** 26 of mine on round 5's code; 19 killed. The survivors are equivalent on the current data, a guard, two exact-equality boundaries, or the gaps in should-fix 5.
> - **Parser:** round 5 changed exactly 2 of 2,261 caption stretches, both the intended diameter cases. Every row behind the 11 crystal targets parses cleanly. In a seeded sample of 60 of the 958 proxy specimen lengths I found no clear error (one is ambiguous, a Searles hanksite with no engine). All 48 joins that carry a length are plausible.
> - **Earlier rounds still hold:** no size floor; the unclassed rule decides nothing; the Ouro Preto duplicate is joined; Bisbee's runs longer than the cavity stay open; the 10^-29 bound; Tsumeb's sensitivities.
> - **Acceptance items:** all present. The proposal is honest about distributions (one assemblage in 21 of 32 scenarios; size spread 2 % against 75 %), about small pockets, and about the 50 mm case (Naica's row at a minimum of 4).
>
> **Ready for the boss?** Not yet, but close. First fix MUST-FIX 1 (wording, a generated list of the protagonists the cavity drops, and the q25 choice registered) and MUST-FIX 2 (carriers taken from every protagonist at display scale, with a test), and correct the should-fix 7 claim. The other should-fixes can go to the boss as known limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | the cavity moves the frequency while the prose says it never does | The prose, the rule, the lib's docstring and the rules block now say what is true. The coverage is never cut to the cavity: runs longer than it stay open, and no size target is shrunk. But the cavity decides who can carry a story run, so dropping a protagonist whose range starts beyond the span can lower the frequency or remove it. Every basis names the protagonists dropped, with where their range starts. A new generated line under the verdicts table lists them all, `storyFrequency` returns them (`dropped`), and the scoreboard keeps them per scenario. The setter test is the range's start (q25 ≤ span), the test a run's YES needs. It is registered in the rule, the rules block and the design numbers. §2.6 gains rows for the median test (the eligibility test), for no cavity test, and for round 5's all-setters rule. | Dropped and listed: Elmwood's calcite (from 80 mm, span 66), Cripple Creek's fluorite (57.0 against 56.5), reactive_wall's primary calcite (57.5 against 55.2), and every protagonist at Naica, Searles, Sicily and Marlborough. The median test, no cavity test, and proxies competing each change no verdict. |
| M2 | WP1's size rule depends on the sidecar's order | The carriers are every protagonist at display scale (q25–q90, within the span) in some scored run. `runStory` returns `atScale` beside the one it credits, and `scoreStory` counts each protagonist's runs at scale (`at_scale`). *[Superseded in round 7: judging only the protagonists at display scale rewarded keeping one small; every protagonist is now judged.]* | The reviewer's North Pennines fleet (fluorite 17 mm MEETS, galena 25 mm LARGE, both at scale in every run) fails WP1 on galena in both orders (a test). The committed result is unchanged: met by 0 of 32. |
| S1 | a proxy's bar also gates STORY on crystal targets | Crystal targets come first. A proxy sets the frequency only where no crystal target can carry a story run, as a size target prefers crystal lengths. *[Round 7: that comparison was loose, since a size target prefers crystal lengths within one species and this rule sets one species' crystal target over another's proxy; the reason and its consequences are restated.]* Each basis names the proxies set aside (`passedOver`). §2.6 shows round 5's all-setters rule. | Deccan 0.308 → 0.152 (apophyllite), Jeffrey 0.26 → 0.232 (grossular), Tsumeb 0.311 → 0.217 (cerussite). 7 crystal-set frequencies, 13 proxy bars, 12 scenarios with none. No verdict moves. Deccan's check now joins those that 21 seeds cannot fail beyond noise (0.152): generated, not hidden. |
| S2 | specimen series chain the site's standard field across years | A standard caption field ("Größe: #", "Kristallgröße: #", "Size #": `isFieldLabel`) is everyone's wording. Only photographs uploaded together (within the join window) make a series of it. An unusual wording keeps the one-year chain. | No series spans more than a year now (15 of 87 did). Deccan apophyllite's largest specimen series is 6 of 88 within 4 days (it was 37 over 1,682), the North Pennines fluorite's 11 of 84 within 27 days. Mogok's ruby (four within a day) and the unusual-wording series stand. |
| S3 | round 5's should-fix 7 response was false; a parser error behind it | A size in three dimensions is never a picture's width ("Stilbit 40x35x20 mm Ausschnitt" is a detail of a 40 mm specimen; a test). Round 5's response row carries a dated correction. | 17 size joins and 2,100 specimens again; the two Deccan stilbite pairs are rejoined. |
| S4 | registered texts out of date | `noise_basis` describes the coded rule (the interval of yes + open runs; no mark where no protagonist with an engine occurs, because chance in which runs carry the story then explains nothing). `rules.series` covers lengths of either kind and the field-label rule. `specimen_joins` and §1.3 say a picture's size joins nothing. §1.3 lists the four inputs, and says the cavities are checked by span, not by hash, since the cavity file records its own run time. The no-frequency `why` names the cavity. | — |
| S5 | minor | §2.6 now says Grimsel's and the North Pennines' verdicts come closest, each moving under one check. A rosette cut to "…ette" at the stretch's start is an aggregate whose diameter is its size (1266588159: 16 mm). The other cut caption (1207917945, "n cyanblauer Farbe und bis zu 11 mm Durchmesser") gives no word to read and stays a width; §5 names it. Tests cover the aggregate kind in size joins and all eleven diameter-is-size forms. | 12 mutants on this round's code, all killed. 101 tests. |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged).
WP1's whole target is met by none. Six rounds have run (five under the standing rule, and a sixth the boss approved); a seventh needs the boss's word.

## Round 7 (boss-approved) — 8.5/10 (on e1cb0d3a)

The boss approved a seventh round on 2026-10-23.

### The report

> Read-only review. `git status` is clean and HEAD is still e1cb0d3a. Every hashed `.local-evidence` file is byte-identical after my runs (the only write is the test-quarry ledger row from `npm test`). Mutants and experiments ran on a scratch replica, whose vitest stand-in reproduces 101/101 tests.
>
> **MUST-FIX**
>
> 1. **WP1's carrier rule (round 6's M2 fix) rewards keeping a protagonist small.**
>    - Where: `story-pocket-lib.mjs:811–825` (`wp1Target`), with carriers taken from `at_scale` (`lib:683`, `showcase-scoreboard.mjs:269`).
>    - The problem: a protagonist that never reaches its display range is exempt from the size test. One that reaches it in a single run becomes a "carrier", and fails unless its median is already MEETS.
>    - Fleets on the committed North Pennines targets, with fluorite MEETS in 21/21 and quartz in band (11/21):
>      - galena as simulated (8.6 mm): **met**;
>      - the same fleet with galena at 19 mm in one run: **fails** ("galena below the record's middle half");
>      - the same fleet with calcite reaching its proxy (65 mm) in one run: no longer met (open).
>    - Sweep, galena lognormal with sd 0.6, 2,000 fleets each. WP1 is met in:
>      - 100 % at a galena median of 2 mm (a tenth of its record);
>      - 54 % at 6 mm;
>      - 3 % at 12 mm;
>      - 24 % at the record's own median, 20 mm.
>      At sd 0.3: 100 % at 2–6 mm, 1 % at 15 mm, 41 % at 20 mm.
>    - Test `test.ts:616` encodes the exemption. The prose still describes a single carrier: PROPOSAL:310–311, the sidecar's `story_frequency_rule`, and §4:1374 ("the carrier's"). None of them states the exemption.
>    - Fix, either of:
>      - judge every protagonist that occurs in an eligible pocket (rule 4 as written);
>      - or require at least one protagonist whose own at-scale runs reach the frequency to be MEETS / REACHES PROXY, and fail the others only on OVERSIZE.
>    - Add a test that one more at-scale run for a non-carrier never turns met into failed, and update the texts. At minimum, state the behaviour plainly so the boss can decide.
>
> **SHOULD-FIX**
>
> 1. **A sentence went stale with crystal-first** (PROPOSAL:428–429).
>    - "Tsumeb's malachite reaches its proxy in just over the story frequency's share of the runs." That was true at 0.311; it is now 8/21 = 38 % against cerussite's 0.217.
>    - This is the same pattern as round 5's false claim. Its "turns on three rules" still holds.
>
> 2. **Round 6's series rule is missing from the generated texts.**
>    - The rules block (`scoreboard:594` → PROPOSAL:186) and the §2.6 header (`scoreboard:379` → PROPOSAL:720) define a series only as "each upload less than 365 days after the one before". So do §1.3:341–342 and §4:1377.
>    - Most §2.6 series are field-label series chained by the 11.6-day window (for example Jeffrey pectolite, 14 of 14 `Größe:#` over 11 d).
>    - `lib:791–792` and the generated noise line still give "the seeds repeat one pocket" as the reason. Round 6 said that is not the coded condition.
>
> 3. **Crystal-first ignores role and band, and its consequences are not stated.**
>    - Any protagonist's crystal target displaces every proxy, the primary's included:
>      - Tsumeb: the alternate cerussite (n 5) sets 0.217, below the primary smithsonite's 0.303.
>      - Deccan: the bar halves to 0.152, under the 0.155 that 21 seeds can fail.
>      - An uncommon-band (UN) alternate with five lengths would set 0.043, so one run in 21 would pass.
>    - In mixed scenarios STORY (PROXY) is now judged against the crystal target's expected rate (Tsumeb's is). PROPOSAL:287–289 implies a proxy bar.
>    - "As a size target prefers crystal lengths" compares across species, which the size rule does not.
>    - §4's decision list omits crystal-first and the q25 setter test.
>    - Fix: state these consequences and list both rules in §4, or restrict crystal-first.
>
> 4. **Test gaps in round 6's code.** Of my 32 mutants, 25 were killed. The 7 survivors are all output-equivalent on today's data:
>    - Reverting the scoreboard's carriers to `V.counts.by` (`scoreboard:269`) passes every test and check. The test (`test.ts:627`) wires `at_scale` itself, so round 6's must-fix is unprotected where it is used.
>    - Counting `at_scale` in SMALL pockets survives.
>    - Also untested: `AGG_FRAGMENT`'s `(?:o?s)?`, FIELD_LABEL's `maße|masse|abmessungen`, the role filter in `scenarioFrequency`, the beyond-cavity exclusion in the "short of a proxy" reason, and the noise line's `<=`.
>    - Fix: have `scenarioVerdict` return the carriers, and test them with a two-protagonist fleet.
>
> 5. **The field-label word list is an unregistered constant** (`lib:351`).
>    - The bare-number wording, key `#` (55 lengths at 14 localities, the least distinctive of all), is not treated as a field label and chains up to a year: Tsumeb mimetite 7 of 27 over 70 d; Tsumeb malachite's largest series is `#`.
>    - No verdict moves. Register the list, and include `#` or say why not.
>
> 6. **Minor.**
>    - The dropped-setters line (PROPOSAL:413) says for all ten that "the frequency falls to the next setter". It moved only at Elmwood (0.308 → 0.287) and in the four scenarios left with none. Cripple Creek's fluorite (0.217 < 0.26) and reactive_wall's calcite (0.184 < 0.303) would not have set it.
>    - 67 of the 117 joins rest on identical captions that state only a field of view (Wittichen "BB 4,5mm" alone gives 35). A micromounter's batch may hold several specimens. No length comes from these joins, so no target moves.
>    - Stale small texts:
>      - the schema's `series` and `without_largest_series` descriptions still say "crystal lengths";
>      - `size_medium_confidence` is neither required by the schema nor validated;
>      - the header of `targets.mjs` (lines 15–17) calls every frequency an expected rate;
>      - "no fleet could fail it beyond noise" (Mogok) sits beside a NO STORY with no noise mark.
>    - Elmwood's sphalerite, Cripple Creek's calaverite and mvt's galena set their scenarios' frequencies but cannot hold their own median. WP1 can therefore never be met through them in these cavities (their size verdict is ELIGIBILITY UNKNOWN). Worth a line.
>
> **Verified correct**
>
> - **Guardrails:** nothing under js/ or data/ changed in f49c1804~..e1cb0d3a. The comparison tool last changed in afbe687f, an ancestor; re-running it gives byte-identical `compare.json` (8419de06…) and `compare.md`. No simulation was run.
> - **Checks:** the targets match a rebuild; 13/13 scoreboard blocks and 2/2 substrate blocks match; 101/101 tests pass.
> - **Round 6, M1:** holds. `dropped` is returned, every basis names the dropped protagonists, and the generated line lists all ten. The q25 test is in the rule, the rules block and the design numbers. The three new §2.6 rows move no verdict.
> - **Round 6, M2:** implemented as specified; it is order-free and tested in both orders. But see MUST-FIX 1.
> - **Round 6, S1:** holds — 7 crystal-set frequencies, 13 proxy bars, 12 scenarios with none; Deccan 0.1517, Jeffrey 0.2321, Tsumeb 0.2167.
> - **Round 6, S2:** reproduced. The round-5 rule gives 87 series, 15 spanning over a year; now 83 and none. Deccan apophyllite 6/88 within 4 d; North Pennines fluorite 11/84 within 27 d.
> - **Round 6, S3:** exactly three caption statements changed between rounds 5 and 6: the two stilbite "Ausschnitt" cases and the cavansite "…ette". That restores 17 size joins and 2,100 specimens, and round 5's response row carries its correction.
> - **Round 6, S4 and S5:** hold, except the leftover "one pocket" reason (SHOULD-FIX 2).
> - **Earlier rounds still hold:** no size floor; unclassed runs stay open; the Ouro Preto and Mogok duplicates are joined; Bisbee's runs longer than the cavity stay open; the 10^-29 bound; the Tsumeb, Herkimer and Mogok sensitivities.
> - **Audit:**
>   - Every crystal row behind the 11 crystal targets is plausible. The boldest is Deccan apophyllite at 170 mm from a cut subject, on a one-mineral photograph.
>   - All 17 dimension joins are plausible (the Mogok spinel join across 9–10 years rests on a measured 5×5×4.8 mm).
>   - Two hand-typed facts check: quartz grows in 19 scenarios, and Herkimer grows one sub-millimetre quartz crystal.
> - **Acceptance items:** all present and honest. The proposal says plainly that the fleet does not give distributions; no band reaches 100 %; the median-centred verdict is labelled as a reading; small pockets are reported apart; the 50 mm case is visible.
>
> **Ready for the boss?** Not yet, but close. First fix MUST-FIX 1, or at least state the exemption and its effect plainly in §1.3, WP1 and §4, and fix SHOULD-FIX 1–2 (stale texts, cheap). The rest can go to the boss as known limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | WP1's carrier rule rewards keeping a protagonist small | WP1 now judges every protagonist with an engine at the record's size wherever it occurs in a pocket that can hold it, as contract rule 4 reads, whether or not it carries story runs. `wp1Target` takes no carriers; `scenarioWp1` assembles each protagonist's occurrence and size from the runs, and the scoreboard calls it. Judging every protagonist by the bare median rule would have failed fleets drawn from the record itself: at 21 runs the record's own crystals miss the middle half of a five-crystal record about two times in five (galena's window at the North Pennines is 18–20 mm). So the size verdict gains the test occurrence has. A miss is noise when the Wilson interval of the share of runs on the window's side of its near edge still reaches one half, and WP1 counts it as within. *[Superseded in round 8: counting a size miss within noise as within let a protagonist seen in three runs or fewer, one whose runs fall on both sides of the window but never in it, and one that never forms where its band cannot see that, pass; such a miss now leaves WP1 open.]* Short of a proxy, or a size the cavity cannot judge, stays open; a protagonist that never occurs answers to its band; one with no size target has none to meet. `atScale` and `at_scale` are gone. Texts: §1.3, WP1's target, §4, §5, the sidecar's `story_frequency_rule`, `size_check` and `noise_basis`, and the generated WP1 line. | The reviewer's sweep, re-run with calcite reaching its proxy (galena sd 0.6): WP1 met at a galena median of 2–8 mm 0 %, 10 mm 4 %, 12 mm 26 %, 15 mm 75 %, 18–20 mm 95–96 %, 25 mm 72 %, 30 mm 33 %, 40 mm 4 % (it was 100 % at 2 mm and 24 % at 20). In the reviewer's own fleet, calcite short of its proxy leaves WP1 open at every galena size. Tests: galena at 8.6 mm fails, and one run at 19 mm changes nothing, in either species order; the met share rises toward the record and falls past it; a fleet drawn from the record passes the size check in more than 85 % of draws at n 5, 8 and 17 (89, 96, 99 % measured), the bare median rule in under 70 % at n 5 (58 %); at half the record's scale 25–60 % pass within noise (the price, stated in §1.3 and §5), at a third under 15 %, at a tenth under 1 %. Committed: still met by 0 of 32. The North Pennines now fails on galena below the middle half as well as quartz below its band, and is open on calcite short of its proxy. No census size verdict carries a noise mark. |
| S1 | a sentence went stale with crystal-first | The Tsumeb sentence says malachite reaches its proxy in more of the runs than the frequency asks, a frequency cerussite's crystal target sets below the proxies' bar, and points to the generated line. | — |
| S2 | round 6's series rule missing from the generated texts; a stale reason for the absent noise mark | The rules block, §2.6's header, §1.3's design numbers and §4 state the field-label rule (with S5's bare length). The noise reason, in the lib, the generated line and `noise_basis`, names the coded condition: the mark says chance in which runs carry the story could explain the shortfall, and where no protagonist with an engine forms in any seed, no run grew one to carry it. | — |
| S3 | crystal-first ignores role and band, and its consequences are unstated | Kept, and stated. The reason is restated without the cross-species comparison: a proxy's product is a bar, a crystal target's an expected rate. §1.3 lists the consequences: any protagonist's crystal target displaces every proxy, the primary's too; a low band or a small record sets a low frequency (an uncommon alternate with five lengths: 0.043), possibly one 21 seeds cannot fail; where crystal targets set it, STORY (PROXY) is judged against their expected rate. §4 lists crystal-first and the q25 setter test among the decisions. A new generated line lists every frequency crystal-first moves and any verdict that moves with it, and the STORY (PROXY) paragraph says a proxy's bar applies only where no crystal target can set the frequency. | The generated line: Deccan 0.3079 → 0.1517 (apophyllite over three proxies), Jeffrey 0.26 → 0.2321 (grossular over three), Tsumeb 0.3109 → 0.2167 (the alternate cerussite over the primary smithsonite's proxy and four others). Verdicts that move with it: none. |
| S4 | test gaps in round 6's code | The carriers are gone, and the wiring the reviewer found unprotected now lives in the lib (`scenarioWp1`), tested with a two-protagonist fleet in both orders. New tests: the cut rosette "sette" and "osetten" (AGG_FRAGMENT's `(?:o?s)?`), every registered field label, a showpiece's crystal target never setting the frequency, a crystal longer than the cavity not counted "short of a specimen proxy", and the noise line's boundary (`cannotFailBeyondNoise`, now in the lib, tested against the story verdict at the top of the 0-run interval). | 42 mutants on this round's code, 39 killed. The three survivors are scoreboard wiring that no output can show under the registered values: the size table at the default z (noise_z is 1.96), a LARGE flag with a noise mark (no census size verdict has one), the noise line at a fixed 21 seeds (every scenario has 21). 109 tests (was 101). |
| S5 | the field-label word list is unregistered; the bare-number wording chains for a year | The list is a lib constant (`FIELD_LABELS`) that the targets file registers (`rules.series_field_labels`, with its basis; the rebuild check catches any change). The rules block prints it, and a test spells it out. A bare length with no words around it (the key "#") is everyone's wording too, so only photographs uploaded together make a series of it. | Tsumeb mimetite's largest specimen series is 5 of 27 within a day (it was 7 over 70 days); Tsumeb malachite's is 7 of 22 within 7 days. No series spans more than 314 days. No verdict moves. |
| S6 | minor | The dropped-setters line says what each drop does: at Elmwood the frequency is 0.2868, against 0.3079 with no cavity test; at Cripple Creek and reactive_wall it is the same either way; Naica, Searles, Sicily and Marlborough are left with none. A caption that states only a picture's size no longer joins photographs, since a micromounter photographs many specimens at one magnification. 67 joins go and 50 remain (33 by caption, 17 by dimensions); specimens go from 2,100 to 2,167, and no target's quantiles move (11 specimen counts and one series change in the targets file). The schema's series descriptions cover both kinds; `size_medium_confidence` and `series_field_labels` are required and validated; the header of `targets.mjs` calls a proxy's frequency a bar; the Mogok sentence says why its verdict has no noise mark. A new generated line names the setters whose median the cavity cannot be shown to hold (Elmwood's sphalerite, Cripple Creek's calaverite, mvt's galena): WP1 cannot be met through them in these cavities. | — |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged).
WP1's whole target is met by none. Seven rounds have run (five under the standing rule, then a sixth and a seventh the boss approved); an eighth needs the boss's word.

## Round 8 (boss-approved) — 8.5/10 (on 9e20f967)

The boss approved an eighth round on 2026-10-23.

### The report

> I worked read-only. `git status` is clean, HEAD is 9e20f967, and every `.local-evidence` hash is unchanged. The comparison tool reran byte-identical (compare.json 8419de06…). Mutants and experiments ran on a scratch replica, which reproduces 109/109 tests and 13/13 splice blocks.
>
> **MUST-FIX**
>
> 1. **Round 7's size-noise rule makes WP1 reward a protagonist that is rare or absent: the round-7 pattern again, from a rule round 7 did not ask for.**
>    - Where: `story-pocket-lib.mjs:643–646` (the noise) and `:841` (a noise miss counts as within). The claim "keeping one small never helps" is at `lib:828–830`, `story-pocket-targets.mjs:77` (the sidecar's `story_frequency_rule`) and PROPOSAL:1054–1056.
>    - Evidence, on the committed targets with the lib as committed:
>      - **Three or fewer eligible runs can never fail on size.** The Wilson top for 0 of 3 is 0.562, which is at least ½. One run at scale among up to 7 also passes (1 of 7 tops at 0.513).
>        - Grimsel, quartz carrying the story, fluorite as dust: WP1 fails at 21/21, 7/21 and 0/21, but is **met** at 3/21. A CO band forgives 3/21.
>        - Fluorite at 120 mm (5× its q90 of 24) in 3/21 is also **met**. Round 6 failed every OVERSIZE; now it passes under noise.
>        - 30 CO-band protagonists pass their band at 3/21. Three of them have crystal targets and so pass at any size: Deccan's primary apophyllite, Deccan's calcite and Grimsel's fluorite.
>      - **The near-edge sign test ignores the far side.** North Pennines galena with 13 runs at 10 mm and 8 at 30 mm (past q90 27.2) is BELOW (noise), with 0/21 runs in the display range. WP1 is **met**.
>      - **Absence beats presence wherever a band cannot see absence** (13 protagonists have no band or a UN band).
>        - Tormiq's primary titanite at 5 mm leaves WP1 open; if it never forms, WP1 is **met**.
>        - Jeffrey's pectolite behaves the same way.
>    - The tests (`test.ts:718–733`) compare only small against at scale.
>    - Fix:
>      - A size verdict whose runs could not have failed it (n ≤ 3 at z 1.96) should be open ("too few runs"), not within.
>      - A BELOW or OVERSIZE noise mark should not count as within when no eligible run lies in the display range.
>      - State that WP1 cannot see the absence of a protagonist with no band or a UN band.
>      - Add tests for rarity and absence.
>      - At minimum, state all of this plainly in §1.3, WP1 and §5, and drop "never helps".
>
> **SHOULD-FIX**
>
> 1. **The size-noise rationale is mostly record noise, which the test does not model** (PROPOSAL:259–265 and 1512–1514; the commit message).
>    - A record's own middle half misses its population's median in 38 % of records at n 5, 19 % at n 8 and 5 % at n 17. That is most of the "~42 %" the rule was added to fix.
>    - The test models only the runs' noise, so it works at 21 runs largely by accident. At n 5, fleets drawn from the record pass 89 % at 21 runs, 82 % at 100 and 68 % at 1,000.
>    - So "More seeds per scenario would sharpen all three" is false for size: more seeds would fail correct fleets more often.
>    - The "half scale, nearly half the time" price holds only for a fleet as spread as the record (sd 0.6). The census fleets spread about 2 %.
>    - Fix: say so, or model the record's uncertainty (for example, an order-statistic interval on its median).
> 2. **The new "setters the cavity cannot hold" line keeps round 6's carrier logic** (`showcase-scoreboard.mjs:391–393` → PROPOSAL:448).
>    - Under round 7's rule, any protagonist that occurs and whose median the cavity cannot be shown to hold keeps WP1 open.
>    - That is 11 scenarios, not 3: Tsumeb (through its primary smithsonite), Deccan, Elmwood, Cripple Creek, mvt, Naica, Searles, Sicily, Sunnyside, Marlborough and Bisbee.
>    - The WP1 line breaks down only the two STORY scenarios.
>    - Fix: generate the list of protagonists whose ELIGIBILITY UNKNOWN or NO ELIGIBLE POCKET verdict holds WP1 open.
> 3. **Two consequences of judging every protagonist are not stated.**
>    - Because "short of a proxy" is open, WP1 can be met only where every proxy protagonist that occurs reaches specimen size. 22 slots are BELOW PROXY.
>      - North Pennines calcite is 39 mm and already flagged "larger than every photographed crystal" (largest 34). It must reach 64 mm.
>      - In my sweep, with calcite as simulated, WP1 is met in 0 % of fleets at every galena size.
>    - The record measures a species where it is the photograph's first-listed subject. An alternate present as an accessory in another protagonist's pocket is still held to its own showcase scale. Rule 2 ("one protagonist") covers presence only.
>    - Put both before the boss in §1.3, WP1 and §4.
> 4. **Test gaps.**
>    - Computing the size noise over the occurring runs instead of the eligible runs (`lib:643`) survives every test and check. This is round 1's must-fix 4 again, in the new code.
>    - Ignoring the span in `scenarioWp1`, and its occurrence denominator, are caught only by the splice check, not by a unit test.
>    - My 35 mutants: 31 killed (6 of them only by the splice check). The survivors are the noise mutant above and three that are output-equivalent under the registered values (the round-7 response named that kind of survivor).
> 5. **Minor.**
>    - A bare length followed by a period (key "#.", 4 lengths) is not treated as a field label (`lib:355`).
>    - The picture-only rule also splits single-find captions that say more than a size. Tsumeb mimetite 1268605242, 1268529856 and 1268438352 ("Fund um 1930 … Bildbreite ca. 4 cm", uploaded within 2 days) count as 3 specimens. No length depends on them.
>    - The identical Tri-State galena caption "10 x 8 cm" (1545994882 and 1544797430, 13.9 days apart) counts twice in mvt's proxy.
>
> **Verified and found correct**
>
> - **Guardrails:** nothing under js/ or data/ changed in f49c1804~..9e20f967. The comparison tool last changed in afbe687f, an ancestor of the tranche.
> - **Checks:** the targets match a rebuild, all 13 scoreboard and 2 substrate blocks match, the appendix reproduces byte for byte, and 109/109 tests pass.
> - **Round 7, M1:** done as described.
>   - `wp1Target` takes no carriers, `scenarioWp1` does the wiring, and `atScale` is gone.
>   - The sweep reproduces: 0, 4.1, 24.5, 75.5, 95–96, 71, 34, 4 %.
>   - Fleets drawn from the record pass 89, 97 and 99 % at n 5, 8 and 17. At half scale, 38–46 % pass.
>   - No census size verdict has a noise mark, and WP1 is met in 0 of 32.
> - **Round 7, S1–S6:** all hold.
>   - The Tsumeb sentence is right (8/21 against 0.2167).
>   - The field-label rule appears in the rules block, the §2.6 header, §1.3 and §4. The noise reason names the coded condition.
>   - Crystal-first's consequences are stated, and the generated line is correct (Deccan, Jeffrey and Tsumeb move; no verdict moves).
>   - `FIELD_LABELS` is registered and validated. Tsumeb mimetite's series is 5/27 within a day, malachite's 7/22 within 7 days, and no series spans more than 314 days.
>   - Joins are 50 (33 by caption, 17 by dimensions) and specimens 2,167. Only specimen counts and one without-series summary changed; no target quantile moved. I read both captions of every join: all are plausible.
>   - The schema, the required rules, the targets header and the Mogok sentence are up to date.
> - **Earlier rounds still hold:** no size floor, unclassed runs stay open, the Ouro Preto and Mogok joins, Bisbee's runs beyond the cavity stay open, the 10^-29 bound, and the robustness table.
> - **Acceptance items:** all present and honest, including distributions, small pockets and the 50 mm case.
>
> **Ready for the boss?** Not yet, but close. First fix MUST-FIX 1, or at least state the few-runs and absence escapes plainly, and fix SHOULD-FIX 1–2 (the noise rationale and the stale generated line). The rest can go to the boss as known limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | round 7's size-noise rule made WP1 reward a rare or absent protagonist | WP1 is now met only on what it could judge. A size miss the runs cannot tell from the window leaves it open, not within. Eligible runs too few to tell any miss (k ≤ z², 3 at z 1.96: `assessSize` returns `few`) leave it open whatever their median, since runs that could not fail a size cannot confirm it. A protagonist that never occurs where its band cannot fail that (no band, or a floor that 0 of 21 is within noise of) leaves it open, and so does one that occurs with neither a band nor a size target. A band miss within noise still counts as within: 21 seeds cannot tell common from guaranteed, and §2.5 tests the fleet for that. "Never helps" is replaced by what the tests now show: kept small, rare or absent, a protagonist never makes the target met. | The reviewer's cases, on the committed targets: Grimsel's fluorite as dust or at 120 mm is failed at 0–2 and at 4–21 of 21 runs and open at 3, never met; at its median it is met from 4 runs. North Pennines galena with 13 runs at 10 mm and 8 at 30 mm: open. Tormiq's titanite at 5 mm: open (short of its proxy); never forming: open; at its proxy: met. The size sweep (galena, sd 0.6): failed in 100 % of fleets at 2–6 mm; met 25 %, open 70 %, failed 5 % at 20 mm; failed 96–100 % at 40–60. A correct fleet (both protagonists mid-band, crystals from their records' populations) is met 65 %, open 33 %, failed 2 % against seventeen-crystal records, and 30 %, 55 %, 14 % against five (tests). Committed: still met by 0 of 32. What holds it open is now generated: 22 short of a proxy, 17 sizes the cavity cannot judge, 6 never-forming protagonists with no band, 1 with neither target. |
| S1 | the size-noise rationale was mostly record noise | Stated as it is, in §1.3, §5, the sidecar's `size_check` and the lib. The interval models the runs' noise only. A record's middle half misses its population's median in about 38 % of five-crystal records, 19 % of eight and 5 % of seventeen. Against five crystals, a fleet drawn from the population is met 57 %, open 32 % and failed 12 % at 21 runs, and failed about a third of the time at 1,000. §5's "more seeds would sharpen all three" now says more seeds sharpen only the fleet's side; more crystal lengths (WP0) firm the record's. §4 names modelling the record's uncertainty (comparing the runs with the record's crystals) as an option for the boss. | Pinned by a test: record misses within 33–43, 15–23 and 3–7 %; failed above 22 % at 1,000 runs. |
| S2 | the "setters the cavity cannot hold" line kept round 6's carrier logic | Replaced by a generated list of every protagonist that occurs but whose size this cavity cannot judge (ELIGIBILITY UNKNOWN, NO ELIGIBLE POCKET, or every eligible crystal longer than the cavity): 17 at 11 scenarios. The WP1 line now counts what holds WP1 open across all scored scenarios, by cause, and names the protagonists nothing judges. | — |
| S3 | two consequences of judging every protagonist unstated | §1.3 states both, and §4 puts them before the boss beside the open-or-within choice. A protagonist known only by a specimen proxy must reach specimen size wherever it occurs: the North Pennines calcite grows to 39 mm, beyond every photographed calcite crystal there, yet short of its proxy's 64 mm. And an alternate is held to its own showcase scale even as another protagonist's accessory. | — |
| S4 | test gaps | New tests: the noise over the eligible runs (not every run where the species occurs); `scenarioWp1`'s per-run cavity (a cavity too small for the median; a crystal longer than the cavity) and its occurrence denominator (10 of 60 below the abundant floor); the too-few rule and its z; never occurring, with and without a size target; nothing judging a protagonist; the Grimsel and Tormiq sweeps; the bimodal fleet; the size sweep's three outcomes; and the correct fleet's shares. | 22 mutants on this round's code, 19 killed: all 16 in the lib, by the tests, among them the reviewer's surviving noise mutant. The three survivors are scoreboard wiring no output can show today: a LONGER THAN THE CAVITY entry in the cavity list (the census has none), the "(too few runs)" mark (no census protagonist occurs in one to three runs), and the rules text's 3 (the floor of 1.96²). 114 tests (was 109). |
| S5 | minor | A key with no letters ("#", "#.") is a bare length; no target moves. The picture-only rule's split of captions that also name the find (three Tsumeb mimetite photographs) and the window's edge (the identical Tri-State galena caption 13.9 days apart, counted twice) are in §5. | — |

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged).
WP1's whole target is met by none. Eight rounds have run (five under the standing rule, then a sixth, a seventh and an eighth the boss approved); a ninth needs the boss's word.

## The boss's decisions of 2026-11-03 (Rock Bot's review of 940ee35c)

After round 8 the boss held the reviews at eight rounds and forwarded Rock Bot's review of the head,
940ee35c, as the answer to the three questions §4 then asked. It is kept as written.

> I took it apart at the exact head 940ee35c. The PR is still open, clean, and mergeable, and round 8 fixed a real loophole—but it also exposed a deeper contradiction in WP1.
>
> **My decisions**
>
> **An indistinguishable size miss stays OPEN.** Do not count it as a pass. Round 7 showed why: uncertainty began laundering rare, absent, or barely sampled protagonists into success. "The runs cannot distinguish this from the target" means inconclusive, not met. Round 8 is right here.
>
> **No: a specimen proxy must not become a required crystal size.** A specimen dimension is only an upper bound on its crystals. Requiring a crystal to reach the specimen's q25/median turns weak evidence into an artificially severe target. If only specimen sizes are known:
> - reaching the proxy is strong positive evidence;
> - falling short is not failure;
> - WP1's crystal-size obligation remains open pending WP0 crystal-length evidence.
>
> So North Pennines calcite should not have to grow to a 64 mm specimen dimension merely because its photographed crystals lack a sufficient sample.
>
> **No: an alternate appearing as an accessory is not held to showcase size in that occurrence.** This is where the current rule conflicts with the proposal's own contract: "one protagonist, not every signature." Size should be role-conditioned per run:
> - the crystal carrying that pocket's story must be at showcase scale;
> - other protagonists may occur as accessories without also becoming showcases;
> - but an alleged alternate protagonist must carry the story at its own scale in some pre-registered share of the fleet. If it never does, it is not functioning as an alternate and should fail that role or be downgraded to companion—not force every accessory occurrence to become enormous.
>
> **The clean conceptual repair.** Separate:
> - candidate role: primary / alternate / companion / showpiece;
> - realized role per pocket: story carrier / accessory / absent.
>
> Then WP1 asks whether the fleet produces enough valid story carriers and whether each claimed alternate actually carries some pockets—not whether every named protagonist has showcase-sized median growth across all occurrences.
>
> So my boss answer is: OPEN / NO / NO, with an alternate-carrier obligation.

### What changed

| decision | what changed | evidence |
|---|---|---|
| OPEN | Kept, in the new form: a protagonist whose carrying falls short of its share within noise (the runs it carries or could carry, against its share) leaves WP1 open; so does a story short within noise or UNRESOLVED, which before failed it. | — |
| NO (proxy) | A protagonist known only by a specimen proxy carries the story in a run when it reaches the proxy's range (strong evidence). Runs short of it are runs it could still be found to carry: they leave the obligation open, never failed, pending crystal lengths. | The North Pennines calcite at 39 mm: open ("could in 21 short of its proxy"), no longer a size it must reach. |
| NO (accessory), with the obligation | `runStory` gives each protagonist's realized role in the run (carrier, accessory, short of a proxy, longer than the cavity, oversize, unsized, absent; several can carry one run), and `scoreStory` counts them over the scored runs. WP1 no longer judges any protagonist's median over every occurrence: each protagonist with an engine must carry the story at its own display scale in at least its **carrier share** of the scored runs — its band's floor × the display range's coverage of a record its size, the product the story frequency already takes the largest of. The targets file records each share (`carrier_share`, with its basis; `rules.carrier_obligation`), and the scoreboard refuses one that is not the rule's. Short of it beyond noise fails; a generated line lists the protagonists that occur but never carry, the candidates for growth or for downgrading to a companion. Open, not failed: no size target (WP0), a display range beyond the cavity (WP9), no band to set a share with no run carried, and a protagonist that never occurs where its band cannot fail that. The size verdicts over every occurrence are still reported, beside each protagonist's carrying and share (a new column). | North Pennines galena dust in 14 runs and at its scale in 7: met (round 8 failed it on its median). As simulated (8.6 mm, never at its scale): failed, 0 of 21 against its share of 0.2167. A correct fleet (mid-band, crystals from the records' populations) is met 74 % of the time against seventeen-crystal records and 62 % against five, failed 0.3 % and 1.1 % (round 8's rule: 65 % and 30 % met, 2 % and 14 % failed). Committed: still met by 0 of 32. |
| Choices of this change, for the boss to confirm | The share itself (floor × coverage); holding the primary to the obligation as well as the alternates (the boss named the alternates); and, per scenario, growing or downgrading a protagonist that never carries. Listed in §4. | — |

Tests 119 (was 114); 28 mutants on the new code, 27 killed, the survivor a recomputation that gives the same counts.

Corrections (round 9, 2026-11-04). Two cells above are wrong, and are kept as written:
- The OPEN row files "a story short within noise or UNRESOLVED, which before failed it" under the boss's
  answer. The boss's OPEN was about size misses. Leaving WP1 open where the story falls short within noise,
  is UNRESOLVED or has small pockets only is this proposal's extension of it, and §4 now lists it as a choice
  for the boss, with what it moves: under round 8's rule WP1 failed all 32 scored scenarios, and a6612fa1 left
  16 open, every one by this choice.
- The accessory row's evidence says round 8 "failed" the North Pennines galena that is dust in 14 runs and at
  its scale in 7. Round 8 left it open: its median was BELOW the record's window within noise (the interval of
  7 of 21 tops at 0.55).

## Round 9 — 7.5/10 (on a6612fa1)

The boss asked for a ninth round on 2026-11-03, after the decisions above. Rounds now run one reviewer at a time, review, fix and re-review, until one reaches 9/10 or finds nothing that must be fixed.

### The report

> a6612fa1 puts the boss's three answers into code faithfully in structure. Every check passes, but the pattern repeats: the new carrier obligation no longer fails overshoot. It also does not apply the boss's "if it never does … fail" wherever a carrier share is ≤ 0.155.
>
> **MUST-FIX**
>
> 1. **WP1 no longer fails a protagonist grown far past its record.**
>    - **Where:**
>      - `story-pocket-lib.mjs:881–912`: WP1 now judges size only through carrying, so an OVERSIZE result has no consequence.
>      - `lib:673` and `lib:904–907`: a crystal longer than the cavity is checked before oversize and is counted as a run that "could still carry".
>      - Prose that says otherwise: PROPOSAL:372–373 ("small or oversize it carries nothing") and PROPOSAL:1105–1106.
>    - **Evidence on the test's North Pennines targets:**
>      - Galena at 45 mm (its record's q90 is 27.2) in 16 runs and 20 mm in 5: round 8 failed it as oversize; now it is **met**.
>      - Galena at 60 mm in all 21 runs fails. At 60 mm in 15 runs and 100 mm (beyond the 92 mm span) in 6, it is **open**: growing six crystals past the cavity rescues it.
>      - Sweep (galena lognormal sd 0.6, 2,000 fleets) at medians 30/40/60/80 mm: met 57/27/1/0 %, failed 0 % at every one. Round 8 failed 68/96/100/100 %.
>      - At sd 0.3 failure falls as galena grows: 42 % at 50 mm, 16 % at 60, 0 % at 80.
>      - The commit's mid-band correct-fleet test scaled to 1.5× and 2× the record is met 67 % and 40 % (round 8: 18 % and 2 %). At 1× it is met 71–75 %; at 0.5×, 10 %.
>    - **Cause:** the display range runs up to q90 (about 2.2× the median of a lognormal record) and the share is low. The boss exempted accessories, which are below their scale; he did not exempt oversize.
>    - **Test gap:** `test.ts:860` ("…and back past it") asserts only `s60.met < 0.05`. At 60 mm, 99 % of fleets are open and none fail.
>    - **Fix:** make an OVERSIZE size verdict beyond noise (and not "too few runs") fail WP1.
>      - My scratch variant fails 95–100 % of fleets at 40–80 mm.
>      - Correct fleets then fail 0.5 % (n 17) and 5.3 % (n 5), against 0.3 % and 1.6 % now and round 8's 2 % and 14 %.
>      - Add sweep assertions that fleets fail at 1.5–4× the record, and state the rule.
>
> 2. **"If it never does … should fail that role" is not implemented where the share is ≤ 0.155.**
>    - **Where:** `lib:908`, with the shares from `lib:850–855`.
>    - Five protagonists with an engine have shares at or below 0.1546, the top of the interval for 0 of 21, so 21 seeds can never fail them:
>      - Deccan: apophyllite (primary, 0.1517) and calcite (0.13);
>      - Jeffrey: pectolite (0.0563);
>      - Mogok: ruby (0.1393);
>      - Schneeberg: erythrite (0.1517).
>    - **Census case:** Deccan's apophyllite is 1.6 mm in 21 of 21 runs against a crystal q25 of 18 mm, and its calcite is similar. Neither ever carries. Round 8 failed both; now both are open "within noise".
>    - The prose contradicts this: PROPOSAL:96 says such a protagonist "fails that role", and the eighth line under §2's table (PROPOSAL:497) calls them "not functioning" while leaving them open.
>    - The noise comes from the band-floor factor in the share, not from the evidence: present in every run and never at scale, against a display coverage of 0.51, is decisive.
>    - **Fix:** fail a protagonist that occurs in judged runs, carries in none and could carry in none, when the Wilson top for 0 of those runs is below its coverage.
>      - In scratch this fails Deccan's two.
>      - With fix 1, correct fleets fail 0.5 % (n 17), 2.4 % (n 8) and 7.0 % (n 5).
>      - At minimum, generate a list of the shares 21 seeds cannot fail, and put this conflict to the boss.
>
> **SHOULD-FIX**
>
> 1. **A false claim** in the commit message, REVIEW:888 and `test.ts:794–795`: "galena dust in 14 runs, at scale in 7 … round 8 failed it". Round 8 left it open (BELOW, within noise; the Wilson top for 7 of 21 is 0.55). Correct it.
>
> 2. **The story choice is credited to the boss and not flagged.**
>    - REVIEW:886 files "a story short within noise or UNRESOLVED, which before failed it" under the boss's OPEN answer, but the boss ruled on size misses.
>    - §4's "Still to confirm" (PROPOSAL:1474–1477) does not list it, nor SMALL POCKETS ONLY → open.
>    - It moved WP1 from failed to open at 16 of 32 scenarios: both Asbestos Hills, Bisbee, Chiastolite, Deccan, Elmwood, Cruzeiro, Great Salt Plains, Bingham, Roughton Gill, Schneeberg, Searles, Sulphur Bank, Sunnyside, Tormiq and Marlborough.
>    - "Met by 0 of 32, as before" hides that move. List the choice in §4 and give WP1's before/after.
>
> 3. **The eighth line overclaims** (scoreboard:401 → PROPOSAL:497).
>    - It calls all 46 "accessories in every run, so not functioning as protagonists".
>    - But 38 are short of a proxy, which the boss said is no failure.
>    - Six of those have a display range that starts beyond the cavity and cannot carry there at all. Four are primaries: Naica's selenite, Searles' halite, Sicily's sulfur and Marlborough's chrysoprase.
>    - Its remedies omit WP9, and its list of open causes omits "a range beyond the cavity". Split the line by cause.
>
> 4. **The generated rules block omits the carrier obligation** (scoreboard:637 → PROPOSAL:197): the share rule, its noise test, and the no-band rule.
>    - The no-band rule, "one carried run meets it", decides verdicts but is registered only in the sidecar; it is not among §1.3's design numbers or in §4.
>    - Under it, Bisbee's four and Tormiq's titanite pass on 1 run in 21; a banded protagonist needs 2–7.
>
> 5. **A band miss below the floor within noise still counts as within** (`lib:893`), so rarity is laundered into a pass.
>    - Grimsel's fluorite in 4–6 of 21 runs, below its 30 % floor, at its median, is **met** (`test.ts:828` asserts this). That makes "rare it carries too few" false.
>    - §2.5's reason covers only a miss above the band.
>    - Treating such a LOW miss as open leaves mid-band fleets unchanged (73 % met, 0.4 % failed); at the floors, met falls from 21 % to 11 %.
>
> 6. **Several protagonists can carry one run** (`lib:675–678`). The boss's text reads as one carrier per pocket, so under this rule an alternate can meet its share only ever beside the primary. List it in §4.
>
> 7. **Test gaps.** I ran 30 mutants on the new code; 24 were killed. Two survivors are equivalent. The real gaps:
>    - an oversize protagonist in an unclassed pocket counted as could-carry (`lib:715`);
>    - `scenarioWp1` with small pockets — the occurrence denominator and the share's denominator (`lib:927–930`);
>    - a null sidecar share is never compared (`lib:926`).
>    - The comment at `test.ts:807` ("stays short beyond noise") is wrong: one run of 21 is within noise (open).
>
> 8. **Minor:** the floor fleets' 9 % failure (`test.ts:900–901`) is missing from PROPOSAL:380–382.
>
> **Verified correct**
>
> - **Read-only:** HEAD is a6612fa1 and the tree is clean. Every `.local-evidence` hash is unchanged; the only write was the test-quarry ledger.
> - **Comparison tool:** reran byte-identical (compare.json 8419de06…). It last changed in afbe687f, an ancestor of the tranche.
> - **Guardrails:** nothing under js/ or data/ changed in f49c1804~..a6612fa1.
> - **Checks:** the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 119/119 tests pass, and also pass on my scratch replica.
> - **Reproduced:**
>   - WP1 failures: story 4, band 15, carrier share 5;
>   - 46 protagonists that never carry, 5 of them failing;
>   - correct fleets met 73.5/62.7 %, failed 0.3/1.3 %;
>   - floor fleets 20/70/9 %.
> - **Boss decisions:**
>   - **NO (proxy):** faithful — runs short of a proxy only hold WP1 open, and the North Pennines calcite at 39 mm is open.
>   - **NO (accessory):** faithful in structure — candidate vs realized role per run is counted, shares are pre-registered with their basis and refused if they differ, and galena at 8.6 mm fails (0 of 21 against 0.2167).
>   - **OPEN:** applied to carrier shortfalls within noise.
>   - Limits: MUST-FIX 1–2, SHOULD-FIX 2 and 5.
> - **Earlier rounds still hold:** no size floor; unclassed runs stay open; 50 joins (33 by caption, 17 by dimensions), 2,167 specimens; the appendix rebuilds byte for byte; I spot-checked the crystal rows behind the targets; the 10^-29 bound; the robustness table; the crystal-first and dropped-setter lines.
> - **Acceptance items:** all present and honest.
>
> **Ready for the boss?** Not yet. First restore an oversize fail (MUST-FIX 1) and fail "never does" where the share cannot (MUST-FIX 2), correct SHOULD-FIX 1, and list the story-open choice in §4. The rest can go to the boss as known limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | WP1 no longer failed a protagonist grown far past its record | An OVERSIZE size verdict fails WP1 where a correct fleet would show so few eligible runs within the record's 90th percentile less often than the noise level (2.5 % at z 1.96), counting the record's noise as well as the runs' (below). A crystal longer than a cavity whose span is itself past q90 is past the display range on its own length and on the span alike, so it is oversize (`runStory`) and counts in the size test (`assessSize`); one longer than a cavity whose span is short of q90 still could be at its scale, and stays open. Once a protagonist fails as oversize its carrying is not tested again. The prose that said "small or oversize it carries nothing" now says what each does (§1.3, WP1's target). | The reviewer's cases on the North Pennines targets: galena at 45 mm in 16 runs and 20 mm in 5 — failed (16 of 21 eligible runs past q90); at 60 mm in 15 and 100 mm (beyond the 92 mm span) in 6 — failed (21 of 21); at 40 mm in every run — failed. The sweep (galena lognormal, 1,500 fleets per median, sd 0.6): failed 11.5 % at 30 mm, 40 % at 35, 70.5 % at 40, 96.7 % at 50, 99.7 % at 60, all at 80–250, past the cavity too; sd 0.3: 26.7 % at 30, 89.8 % at 35, about 100 % from 40. At 1.5 times its median (30 mm, 1.1 times its q90) a fleet is mostly within a five-crystal record's noise; that is stated, and a test pins it (under 25 %). The reviewer's variant (the q75 edge, the runs' noise only) failed more fleets at 30–35 mm, but fell back to 1.3 % at 250 mm, where crystals past the cavity rescued it, and failed correct fleets 6.9 % against five-crystal records. The reviewer's scaled correct fleet (records of 17, 2,000 fleets): met 74 % at the record's scale, 56 % at 1.5 times it, 21 % at 2 times, 0.8 % at 3 times, failed 31, 75 and 99 % (a6612fa1 met 67 and 40 % at 1.5 and 2 times; round 8, 18 and 2 %); against records of 5, met 62, 54, 34 and 7.5 %. The display range runs to the record's 90th percentile, about 2.2 times the median of a record as spread as these, so 1.5 times the record is mostly within it. |
| M2 | "If it never does … fail" not applied where a share is ≤ 0.155 | A protagonist that never carries the story fails where a correct one would have: its judged runs (an accessory or oversize, in a classed pocket), with none carried and none it could still carry (short of a proxy, longer than a cavity short of its q90), all below its display range — or, with some on either side, none in it — where a correct protagonist would show that less often than the noise level. All below: P = B(h + m, n + 1 − h) / B(h, n + 1 − h) at the record's q25, h = 1 + 0.25 (n − 1) — 120 / ((m + 2)(m + 3)(m + 4)(m + 5)) for five crystals, worked by hand in a test; none in it: the beta-binomial with the display range's coverage. It needs no band. Every judged run in an unclassed pocket is left out: it may be small. The eighth line now lists the carrier shares the scored runs cannot fail by the share alone (18 at 21 seeds), where only this test can fail the protagonist. | Deccan's apophyllite and calcite, 21 of 21 below their ranges: failed (a correct one 0.002 % and 0.03 % of the time). The five protagonists round 9 found failing below their shares fail by this test now (cooling's quartz, Grimsel's quartz and fluorite, Jeffrey's grossular, the North Pennines galena). Every one of 5 judged runs below its range fails against five crystals (2.4 %), 4 do not (4.0 %); some on either side, none of 13 (2.5 %). Correct fleets fail 2.1, 2.5 and 3.9 % against records of 17, 8 and 5 (3,000 fleets; the reviewer's Wilson variant: 0.5, 2.4 and 7.0 %). |
| — | the share test's noise (a round-8 lesson, found in measuring M1–M2) | The share test, like the two new ones, now counts the record's noise: it fails where a correct fleet at the protagonist's band's floor, its crystals from its record's population, would carry as few — the runs it could still carry included — less often than the noise level (`carrierTail`). Where a record's quantile p sits in its population is Beta(h, n + 1 − h) at order statistic h = 1 + p (n − 1) (`recordQuantile`, `recordCoverage`): exact for a whole h, and for the interpolated quantiles a test checks it on 20,000 simulated lognormal records of 5, 8 and 17 at 6 and 21 runs, where it errs toward chance. It needs the record's size alone, not its lengths. | Counting the runs' noise alone, a6612fa1's share test failed a correct fleet of 210 runs 14.3 % of the time against five-crystal records and 42.8 % at the bands' floors (1,000 runs: 23.3 % and 59 %). Now: 2.2 % and 8.8 % at 210 runs, 3.3 % and 10.7 % at 1,000 (a test pins the 210-run figures). The cost: at 21 seeds 18 shares cannot be failed by the share alone. |
| S1 | a false claim: round 8 "failed" galena dust in 14 runs, at scale in 7 | Corrected in the test's comment, here (the note under the decisions' table) and in the commit message: round 8 left it open — BELOW within noise, the interval of 7 of 21 topping at 0.55. | — |
| S2 | the story choice credited to the boss, not flagged | The note under the decisions' table corrects the attribution: the boss's OPEN was about size misses; leaving WP1 open where the story falls short within noise, is UNRESOLVED or has small pockets only is this proposal's extension. §4 lists it with the before and after. | Round 8's rule failed WP1 at all 32 scored scenarios; a6612fa1 left 16 open, every one by this choice; this round fails Deccan again, so 15 are open, and with the choice reverted all 32 fail. None is met either way. |
| S3 | the eighth line overclaimed "accessories in every run" | Split by what WP1 makes of each protagonist that occurs but never carries: failing — never carrying where a correct one would have (7); left open — short of a specimen proxy, no failure, so crystal lengths decide (WP0, 27); a display range beyond the cavity, which cannot hold it at its scale (WP9, 6: Elmwood's calcite, Naica's selenite, Searles' halite, Sicily's sulfur and celestine, Marlborough's chrysoprase — four of them primaries); unclassed pockets (1: Tsumeb's cerussite); no band (5: Bisbee's four, Tormiq's titanite). Its parts name a run in an unclassed pocket "not carrying … present or absent". | — |
| S4 | the carrier obligation missing from the generated rules block; the no-band rule unregistered | The rules block gives the carrier share and the record-noise tests. The no-band rule is changed rather than registered: with no band no share can be set, so the obligation stays open whatever the protagonist carries (it had met on one carried run, where a banded one needs 2 to 7); never carrying can still fail it. It is in §1.3, §4, `rules.carrier_obligation` and each such protagonist's `carrier_share_basis`. | Tormiq's titanite at its proxy in every run: open (was met). Bisbee's four and Tormiq's titanite on the census: open, as before (they never carry). |
| S5 | a band miss below the floor within noise counted as within | A rate below the band that the runs cannot tell from it leaves WP1 open; one above it within noise still counts as within (§2.5 tests the fleet for every-seed presence). | Grimsel's fluorite at its median in 4–6 of 21: open (was met); met from 7, where it is within its band; failed at 0–2. Mid-band fleets unchanged; at the floors met falls from 21 % to 10 %. |
| S6 | several protagonists can carry one run | Listed in §4 as a choice of this rule: an alternate's carrying counts beside the primary's. | — |
| S7 | test gaps | The carry counts are now one per run: in an unclassed pocket an accessory, oversize or absent part counts as `unclassed` alone (it had also counted as itself), with a test that an oversize part there is one such run. New tests: `scenarioWp1` with small pockets (the band counts every run, the share only the scored ones: 6 of 21 below the floor beyond noise, 3 of 11 meeting the share); a null sidecar share refused where the rule sets one and accepted where it sets none; the comment at the one-run case says within noise. | — |
| S8 | the floor fleets' failure missing from the prose | Stated with this round's numbers: at the bands' floors about one in ten is met, eight in ten left open, one in ten failed, most of that the bands' own tests at their floors. | — |

Mutation testing: 41 mutants on this round's code — the record-noise functions, the cavity rule, the one-count-per-run carrying, the oversize and never-carries tests, the share's noise, the wiring, the scoreboard's lines and the targets' text — 41 killed: 37 by the tests, 3 by the splice check, 1 by the targets check. Among them the reviewer's own variants (never-carries against the Wilson top, oversize on the runs' noise alone) and a6612fa1's double-counted unclassed runs and one-run no-band rule.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: failed at 17 scored scenarios (the story 4, a band 15, never carrying 7; none oversize), open at 15. Tests 122 (was 119).

## Round 10 — 7.5/10 (on f29c8c8a)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> f29c8c8a puts round 9's two must-fixes in correctly. The record-noise model is sound for the protagonist tests. But the pattern of every round since 5 repeats: the new "never carries" test lets one giant crystal rescue dust. And WP1's story test still counts only the runs' noise, which makes §5's headline claim false.
>
> **MUST-FIX**
>
> 1. **One crystal past q90 rescues a protagonist that never carries. This is new in f29c8c8a.**
>    - **Where:** `story-pocket-lib.mjs:927–932`. `neverCarriesTail` switches from "all below q25" to the much weaker "none in range" as soon as one judged run is oversize. Called from `lib:994–998`. `test.ts:796–797` pins this as intended.
>    - **Evidence** (committed lib, the test's North Pennines targets, galena n=5):
>      - dust (8.6 mm) in 8 runs → FAIL; dust in 7 plus one 40 mm crystal → OPEN;
>      - dust in 12 → FAIL; 11 plus one 40 mm → OPEN;
>      - dust in 10 → FAIL; 5 dust plus 5 at 100 mm → OPEN.
>    - Grimsel fluorite (n=9): dust in 4 → FAIL, 3 plus one 60 mm → OPEN; dust in 6 → FAIL, 5 plus one → OPEN.
>    - With one run past q90, a five-crystal record needs 13 judged runs to fail instead of 5. The share test cannot catch these protagonists: galena is among the 18 shares that 21 seeds cannot fail.
>    - **Same shape through `beyond`:** dust in 21 → FAIL. Dust in 20 plus one 30 mm crystal in a 25 mm cavity (span short of q90) → OPEN, because one run that could carry voids the test.
>    - **Fix:** use one statistic for "never" whatever the mix: P(none of m in range), from `recordCoverage`. A run past q90 then only adds to m. All 7 census never-carriers still fail (p from 9e-3 down to 3e-6). The cost is power at small m (n=5 needs 13 runs). Add "dust plus one giant" and "dust plus one past the cavity" sweeps, and state the `beyond` escape in §1.3.
>
> 2. **"Keeps a correct fleet from failing more often as seeds are added" is false, and the figures behind it do not reproduce.**
>    - **Where:**
>      - PROPOSAL:1652–1655 (§5);
>      - PROPOSAL:395–396, 416–417, 426–427;
>      - `rules.noise_basis` in the targets file and `story-pocket-targets.mjs`;
>      - `lib:952–953`, whose claim follows a list that starts with the story test;
>      - REVIEW:1008, and the commit's table.
>    - **Evidence:** `storyVerdict` (`lib:800`) still uses Wilson on the runs alone, against a frequency built from the record (floor × coverage).
>      - A correct one-protagonist fleet at its floor (n=5) fails WP1 8.1 % at 21 runs, 29.4 % at 210 and 39 % at 1,000. Mid-band it fails 2.1, 12.5 and 14.5 %.
>      - The story test alone fails 1.7–6.3 % at 21 runs and 12–27 % at 210, across n 5–25.
>      - The prose says "about 0.2 % of 21 runs and 7 % of 1,000". That is true only of the tests' two-protagonist fleet.
>      - Even that fleet fails more often with more seeds, and the stated figures are low:
>
>      | n=5 two-protagonist fleet | stated | measured |
>      |---|---|---|
>      | floors, 210 runs | 8.8 % | 10.7 % (6,000 fleets) |
>      | floors, 1,000 runs | 10.7 % | 13.3 % |
>      | mid-band, 210 runs | 2.2 % | 4.0 % (6,000 fleets) |
>      | mid-band, 1,000 runs | 3.3 % | 4.4–4.5 % |
>
>      - `test.ts:1003–1007` pins only < 7 % and < 16 % on 120 fleets.
>    - **Fix:** either model the setter's record in the story noise, with `carrierTail(yes + open, runs, floor, n)` for a crystal setter (this makes Herkimer's NO STORY "within noise", at 4.2 %), or state the growth plainly. In both cases correct the figures and list the choice in §4.
>
> **SHOULD-FIX**
>
> 1. **"Never carries" holds the boss's accessories to the record** (`lib:927–932`, `994–998`; PROPOSAL:367–371 and 1537–1541). Its null treats every occurrence below the range as a draw from the record, including occurrences beside a carrying protagonist, which the boss exempted.
>    - Under the boss's model, a correct alternate that carries its share s per run shows "never" in (1−s)^21 of fleets: 30 % at pectolite's 0.0563, 5.4 % at 0.13.
>    - It is a fair test where no other protagonist carries the pocket, which covers every census failure except North Pennines galena. Galena fails either way (0.6 %), so no census verdict moves.
>    - State this in §1.3 and §4. "At most 2.5 %" holds only under the proposal's own model.
> 2. **"(too few runs)" contradicts an oversize fail.** `lib:707` marks `few` while `lib:985` fails OVERSIZE. Three eligible runs, all past q90, fail at n ≥ 8 (p 0.017 at n=8, 0.006 at n=17); at n=25, two runs fail (0.021). The legend says no miss could be told. Reword it.
> 3. **Unclassed runs are called "could carry"** (`lib:752–757`, `776`, `1001–1004`). An accessory, oversize or absent part can carry in no pocket class; what is unknown is only whether the run counts. "could in 21 in an unclassed pocket" (Tsumeb cerussite) misleads, and the honest bound is c/(N−u).
> 4. **The 18-shares line overclaims.** The scoreboard line (PROPOSAL:539; also §1.3 at 423, §5 at 1656) says that only never carrying can fail these protagonists. For 12 of the 18 nothing in the carrier obligation can: 11 are proxies, whose short runs void the test, and Tsumeb cerussite is unclassed.
> 5. **Test gaps.** I ran 45 mutants on the lib: 37 killed, 5 equivalent or dead code, 3 real survivors:
>    - moving the oversize test after `if (!scored)` survives. `test.ts:844`'s claim "with no scored runs only the story speaks" is false: the band and oversize tests still speak;
>    - letting unclassed runs block the never test survives: there is no case with five or more classed accessories plus unclassed runs;
>    - `scenarioWp1` passing n + 1 survives.
> 6. **The mirror of round 9's cavity fix is missing** (`lib:733`). A crystal longer than a cavity that is itself below q25 is marked `beyond`, though both its length and the span put it below the range. Unreachable with today's census (one cavity per scenario); reachable under WP9.
> 7. **Minor:**
>    - REVIEW:1007 says Deccan apophyllite fails correct fleets 0.002 % of the time; it is 0.003 % (3.3e-5).
>    - §4 does not list the rule that a crystal past a cavity which is itself past q90 counts as oversize.
>    - "18" and the 15 open names are hand-typed outside the generated blocks (correct today).
>
> **Verified correct**
>
> - **Read-only:** HEAD is f29c8c8a and the tree is clean. All 11 `.local-evidence` files are byte-identical after every check; only the test-quarry ledger was written.
> - **Comparison tool:** unchanged since afbe687f (an ancestor); compare.json 8419de06… reproduced. Nothing under js/ or data/ changed in f49c1804~..f29c8c8a.
> - **Checks:** the size evidence runs; the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 122/122 tests pass, also on my scratch harness.
> - **Round 9's M1 holds:**
>   - the 45/20 mm and 60/100 mm cases fail;
>   - the sweep fails 11.8/40.9/69.1/97.1/99.7/100 % at 30–80 mm;
>   - at sd 0.3 it fails 28/88/99.6 %;
>   - scaled correct fleets are met 72.5/58.9/21.4/0.6 % at 1/1.5/2/3× (n=17) and 61.5/54.1/33.6/6.7 % (n=5).
> - **M2 holds:** Deccan fails; the thresholds of 5 vs 4 and 13 vs 12 judged runs reproduce.
> - **S1–S8 hold:**
>   - the never-carry split is 7/27/6/1/5 = 46;
>   - all 15 open scenarios have UNRESOLVED stories, so all would fail if that choice were reverted;
>   - Grimsel fluorite in 4–6 runs is open;
>   - no band is open;
>   - carry counts are one per run;
>   - floor fleets are about 11 % met, 79 % open, 10 % failed.
> - **The record-noise model is right:**
>   - Beta(h, n+1−h) is exact at whole h; for interpolated quantiles its variance exceeds the interpolation's by f(1−f)(n+1)/((n+1)²(n+2)), so it is conservative.
>   - Per test, one correct protagonist at its floor fails oversize ≤ 1.7 %, share ≤ 2.6 % (Monte Carlo noise), never ≤ 0.9 %, across n 5–25, 21 and 210 runs, sd 0.25–1.2.
>   - At 21 runs, correct fleets fail 1.8–2.4, 2.9 and 3.5–3.8 % against records of 17, 8 and 5 (stated 2.1, 2.5, 3.9).
> - **Evidence:** I re-derived the crystal rows and quantiles for six crystal targets; all reproduce. The appendix shows 50 joins (33 by caption, 17 by dimensions) and 2,167 specimens.
> - **No path to MET:** I swept size, count, absence, a crystal past the cavity, no band, no size target and unclassed pockets. Nothing reaches MET by being worse; every escape lands on OPEN.
>
> **Ready for the boss?** Not yet. First stop a giant crystal rescuing dust (MUST-FIX 1), and correct or model the story test's noise and its figures (MUST-FIX 2). The should-fixes can go to the boss as stated limits.

### The response

Both must-fixes sat in machinery round 9's response added: a test of "never" judged on the runs where a
protagonist occurs, a switch to a sharper form of it when every judged run fell below the range, and a model
of the record's own noise. The score fell from 8.5 to 7.5 and stayed there. Rather than patch a third time,
this round cut all three and judges WP1 by the boss's own framing — the pre-registered share, against the
runs' noise — and states what that costs and puts it to the boss.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | one crystal past q90 (or past a small cavity) rescued a protagonist that never carries | The never-carries test is cut. "If it never does" is judged by the share alone, as the boss framed the obligation: a protagonist must carry its pre-registered share of the fleet, and carrying none fails wherever the runs can tell none from that share. A crystal past its display range carries nothing, so it counts against the share like any other run it does not carry. A crystal longer than a cavity whose span is short of its q90 could still be at its scale, so it counts as one run it could carry, weighing as one carried run would. | The North Pennines galena: dust (8.6 mm) in 21 runs — failed; dust in 20 and one 40 mm crystal — failed; dust in 11, one 40 mm, absent in 9 — failed; dust in 20 and one 30 mm crystal past a 25 mm cavity — open within noise (the interval for 1 of 21 tops at 0.227, as for one carried run). The cost: Deccan's apophyllite and calcite (shares 0.1517 and 0.13) are open again, since 21 runs cannot tell none from those shares. With Jeffrey's pectolite, Mogok's ruby and Schneeberg's erythrite they are generated in the eighth line under §2's table, and §4 puts the conflict and its options to the boss. |
| M2 | "keeps a correct fleet from failing more often as seeds are added" was false, and its figures did not reproduce | The record-noise model is cut: every WP1 interval is the runs' again, and the claim is gone. What that does is stated instead — a share is a correct fleet's expected rate at its floor, and a five-crystal record's display range is itself uncertain, so a correct fleet fails more often with more seeds — in §1.3 (a table), §5, `rules.noise_basis` and the WP1 line, with §4's options: more crystal lengths (WP0), a share set below that expected rate, or a record-aware test (and what it would cost on the census). The story test now models the same noise as the rest. | Two protagonists, 6,000, 3,000 and 1,500 fleets at 21, 210 and 1,000 seeds: mid-band against records of 17 failed 0.3, 1.1 and 2.5 %; of 5, 2.5, 17 and 26 %; at the floors 9.5, 27 and 47 %, and 10, 43 and 59 %. One protagonist at 210 seeds against five crystals: 12 % mid-band, 28 % at the floor. The tests pin the 21- and 210-seed figures. |
| S1 | the never test held the boss's accessories to the record | Cut with the test. §4 names this as the cost of judging "never" on the runs where a protagonist occurs, one of the options it lists. | — |
| S2 | "(too few runs)" contradicted an oversize fail | The oversize test is now the runs' sign test against q90, which 3 eligible runs or fewer cannot fail, as `few` says; the legend says "OVERSIZE included". | Three eligible runs, all past q90: not failed; four: failed. |
| S3 | runs in unclassed pockets were called "could carry" | A run in an unclassed pocket where the protagonist is an accessory, oversize or absent carries the story in no pocket class; it may only be a small pocket, out of the count. The share is now judged over the scored runs not in unclassed pockets, and the message says so ("if its N runs in unclassed pockets are small pockets, out of the count"). | 0 carried, 15 accessories and 6 unclassed runs against 0.3: failed (was open within noise); every run unclassed: open. |
| S4 | the 18-shares line overclaimed | Rewritten for the runs' noise: the scored runs cannot fail a share at or below 0.155 at all (five shares), and the line names the conflict for the boss. | — |
| S5 | test gaps | The oversize test before the scored check is pinned: a fleet of small pockets only still fails its band and its size. The test's title is corrected. The other two survivors went with the cut code. | — |
| S6 | the mirror of round 9's cavity rule | A crystal longer than the cavity but itself below q25 is below the range on its length and on the span alike: an accessory, or short of a proxy, not a run left open. The scenario's "short of a specimen proxy" reason counts it so. | Tests: 12 mm in a 10 mm cavity against fluorite's q25 of 15 is an accessory; 30 in 25 against calcite's 56 is short of its proxy; 15 in 10 is still open. |
| S7 | minor | The 0.002 % figure went with the test. §4 lists the past-q90 and below-q25 rules. The list of open scenarios the story choice decides, and the unfailable shares, are generated, so no hand-typed 18 or 15 remains. | — |

Mutation testing: 34 mutants on this round's code — the cavity rule both ways, the one-count-per-run carrying, the scenario's "short of a specimen proxy" reason, the band's two sides within noise, the oversize test and its z, the share's counted runs, could-runs and interval, the wiring, the scoreboard's lines and the targets' text — 34 killed: 30 by the tests, 3 by the splice check, 1 by the targets check. Two (z in the oversize test; the share's interval over the counted runs) survived the first run and are killed by two tests added for them. Among the killed are a6612fa1's rules this round replaced: unclassed runs as runs a protagonist could carry, and a protagonist with no band met on one carried run.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: failed at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0), open at 16 — a6612fa1's outcome, now with an oversize fail, the cavity rules both ways and unclassed runs out of the count. Tests 121 (was 122: the never-carries and record-noise tests went with their code; a test of "if it never does" as the share's own came in).

## Round 11 — 8/10 (on 454adb7a)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> Cutting round 9's machinery was the right call. In 454adb7a the mirror rule is right, leaving unclassed runs out of the share is a sound lenient bound, and every round-10 response holds. Two things must change before the boss reads it:
> - a size miss the runs cannot tell from the target still counts as a pass when it is OVERSIZE;
> - §4 says the boss's own answers conflict, but the conflict comes from this proposal's extension of one of them.
>
> **MUST-FIX**
>
> 1. **An OVERSIZE verdict within noise, or with too few runs, counts as met.** This breaks the boss's first decision ("An indistinguishable size miss stays OPEN. Do not count it as a pass").
>    - **Where:** `story-pocket-lib.mjs:917–927`. An OVERSIZE that does not fail drops through to `carried/scored >= share → continue`.
>    - **Where it is registered:** only in `story-pocket-targets.mjs:75` ("the other verdicts and their noise marks are reported, not required"). It is absent from §4's list of choices.
>    - **Prose that contradicts it:** PROPOSAL:400 says "oversize, it fails", and `rules.noise_basis` says "runs that cannot fail a target cannot confirm it either".
>    - **Evidence** (the tests' North Pennines targets, committed lib):
>      - galena 9 runs × 20 mm + 12 × 40 mm → MET, size verdict OVERSIZE (noise);
>      - 5 × 20 mm + 13 × 1,000 mm (37× its q90, 11× the 92 mm span) + 3 absent → MET;
>      - an uncommon-band galena at 1 × 20 mm + 2 × 60 mm → MET (OVERSIZE, too few runs);
>      - over all 2,024 ways to split 21 runs into carrier / 40 mm / dust / absent, 908 are MET, and 86 of those have most occurrences past q90;
>      - galena sweep: 33 % of fleets at 35 mm and 19 % at 40 mm are MET through OVERSIZE (noise).
>    - **Fix:** leave WP1 open ("oversize within noise") when the verdict is OVERSIZE but not beyond noise. On a scratch copy:
>      - all 121 tests still pass, because no test pins either outcome;
>      - MET splits with most occurrences past q90 fall to 0;
>      - correct fleets at 21 seeds lose 0.5 pp of "met" against 17-crystal records and 4.3 pp against 5.
>    - Add tests, list the rule in §4, and restate the met column of §1.3's table.
>
> 2. **§4 presents the small-share problem as "the conflict between two of the boss's answers" (PROPOSAL:1543–1552).** The same wording is in the generated eighth line (scoreboard:419 → PROPOSAL:544) and in `rules.carrier_obligation` (`story-pocket-targets.mjs:78`).
>    - **The quote is not the boss's words.** "a miss the runs cannot tell from the target stays open" drops the word "size". The boss answered round 8's question about a size miss, open versus counted as within (940ee35c §4).
>    - **Extending OPEN to carrying counts is this proposal's choice.** §4 already says so for the story choice.
>    - **Deccan's apophyllite and calcite have no indistinguishable size miss.** Both are BELOW with no noise mark: 21 of 21 runs at ≤ 1.7 mm against q25s of 17.5 and 11. On the boss's own words, both answers point to failing them.
>    - **The options are costed unevenly:**
>      - "fail any that never carries" omits how often it fails a correct protagonist, (1−s)^21: 3.2 % at 0.1517, 5.4 % at 0.13, 30 % at 0.0563;
>      - round 9's never test is shown only by its two defects, not with the repair round 10 gave (one statistic for any mix, judged only on runs no other protagonist carries).
>    - **Fix:** attribute the extension to the proposal, state that Deccan's size misses are beyond noise, and cost every option, the repaired one included.
>
> **SHOULD-FIX**
>
> 1. **The cavity rule judges only two of the three cases where the crystal's length and the span agree.** PROPOSAL:299 says "Where the two agree it is judged by them", but a crystal and a span both inside q25–q90 stay 'beyond' (open) at `lib:680`.
>    - **Census:** Bisbee's malachite (about 65 mm in the 60.54 mm cavity; proxy range 50.75–138) is reported in 15 runs as "longer than the cavity" and as never carrying.
>    - Four tests pin the current behaviour.
>    - **Fix:** count it as carrying when q25 ≤ span and length ≤ q90, or restate the rule as the two named cases.
>
> 2. **A giant past a cavity whose span is short of q90 escapes the oversize fail entirely** (`lib:680`, `637–639`).
>    - Real targets at 1 m in all 21 runs: Herkimer's quartz (span 59.94 against q90 60.4) and Deccan's apophyllite are open.
>    - The same giants at the North Pennines galena, Jeffrey's grossular and Tsumeb's cerussite fail.
>    - Herkimer is WP1's first target, so an overshoot there cannot fail.
>    - **Fix:** state this, and generate the list of protagonists it affects.
>
> 3. **The list of shares 21 seeds cannot fail overclaims** (scoreboard:388–391 and 419).
>    - Of its five, the 0.155 limit decides only Deccan's two:
>      - Mogok's ruby (never occurs) and Jeffrey's pectolite (21 of 21) already fail on their bands;
>      - pectolite and Schneeberg's erythrite are held open by the proxy rule (the boss's NO).
>    - The list uses scored runs, not the counted runs the test uses; runs in unclassed pockets raise the limit.
>    - Grimsel's fluorite fails at a share of 0.156 against a limit of 0.1546. That knife-edge is worth stating.
>
> 4. **Test gaps.** I ran 27 mutants of my own: 22 killed, 4 equivalent, 1 real survivor.
>    - The survivor: judging "met" on scored − unclassed. Under it, 3 carried, 8 accessory and 10 unclassed runs against a share of 0.2 becomes MET instead of open.
>    - Nothing tests what an OVERSIZE within noise does.
>
> 5. **Hand-typed results outside the generated markers,** all correct today:
>    - §4: "five today" with the names, "16 are open", and "1.6 and 1.7 mm … 27 and 22";
>    - §1.3: "five of them today".
>
>    This goes against the "No result is typed by hand" rule and round 10's S7 response.
>
> **Verified correct**
> - **Read-only:** HEAD is 454adb7a and the tree is clean; only the test-quarry ledger changed.
> - **Guardrails:** nothing under js/ or data/ changed in any of the twelve commits. The comparison tool is unchanged since afbe687f, and compare.json 8419de06… reproduced.
> - **Checks:** the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 121/121 tests pass, also on my scratch harness.
> - **The stated figures reproduce** (6,000 / 3,000 / 1,500 fleets at 21 / 210 / 1,000 seeds; percentages of fleets failed):
>
>   | correct fleet | records of | 21 seeds | 210 | 1,000 |
>   |---|---|---|---|---|
>   | mid-band | 17 | 0.3 % | 1.3 % | 3.1 % |
>   | mid-band | 5 | 2.5 % | 16.1 % | 24.9 % |
>   | at the floors | 17 | 10.0 % | 25.2 % | 47.8 % |
>   | at the floors | 5 | 9.7 % | 42.1 % | 58.5 % |
>
>   - one protagonist at 210 seeds against five crystals: 11.6 % failed mid-band, 27.3 % at the floor;
>   - galena sweep: failed 12.1 / 40.8 / 71.4 / 97.3 / 99.8 / 100 % at 30 / 35 / 40 / 50 / 60 / 80+ mm;
>   - band tests make up 65–70 % of the failures at the floors, matching "two thirds".
> - **Census WP1:** met 0, failed 16 (story 4, band 15, share 5, oversize 0), open 16.
> - **Round-10 responses hold:**
>   - M1: one giant no longer rescues dust. Dust in 21 runs fails; so do 20 dust + one 40 mm and 11 dust + one 40 mm + 9 absent. One run longer than the cavity weighs as one carried run, within noise.
>   - M2: the record-noise machinery is cut, with no stale traces.
>   - S2, S3, S5, S6 and S7 behave as stated; S6's mirror is correct.
> - **Unclassed runs:** leaving them out of the share is a sound lenient bound, and a protagonist cannot escape through its own growth.
> - **Perverse incentives:** across the 2,024 splits, no move away from carrying improves WP1. The only improving moves are absent → present, through the band, which is by design.
> - **Evidence:** the appendix and capture are unchanged since 9e20f967. I spot-checked the crystal rows behind the North Pennines fluorite and galena, Herkimer, Deccan, Jeffrey and Tsumeb targets, and five joins against the raw capture: clean.
> - **Acceptance items:** all present and honest.
>
> **Ready for the boss?** Not yet: first make an indistinguishable OVERSIZE leave WP1 open (MUST-FIX 1), and re-attribute and cost §4's conflict (MUST-FIX 2). The should-fixes can go to the boss as stated limits.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | an OVERSIZE within noise, or with too few runs, counted as met | An OVERSIZE the runs cannot tell from the display range's top now leaves WP1 open ("oversize within noise") — the boss's first answer, an indistinguishable size miss is never a pass, applied to it. The share is still tested and can still fail the protagonist. §4 records it under the boss's decided answers, since it is the boss's rule, not a choice of this proposal. | Round 11's cases on the North Pennines targets: 9 runs at 20 mm and 12 at 40 — open; 5 at 20, 13 at 1,000 and 3 absent — open; an uncommon band at 1 × 20 and 2 × 60 — open. Of every split of 21 runs into carriers, 40 mm crystals, dust and absence (2,024), 802 are met and none with most occurrences past the range (was 86 of 908), and no move away from carrying improves the outcome — a test now. Correct fleets at 21 seeds are met 72.5 and 56.8 % against records of 17 and 5 (was 73.1 and 61.9), failed as before; §1.3's table is restated. The galena sweep is met 22 % at 30 mm, 5 % at 35 and 0.7 % at 40 (was 56, 37 and 19), failed as before. |
| M2 | §4 credited the small-share conflict to the boss and costed its options unevenly | Re-attributed in §4, the generated eighth line and `rules.carrier_obligation`: the boss's OPEN was given for a size miss the runs cannot tell from the target, and leaving a carrying count within noise open is this proposal's extension of it — that is where a share of 0.155 or less meets "if it never does". Where the limit alone holds a protagonist open, its size miss is beyond noise (BELOW, no noise mark), so on the boss's own two answers it would fail. Each option is costed: leave it open (none carried turns beyond noise at 22, 26 and 65 seeds for shares of 0.15, 0.13 and 0.056); fail any protagonist that never carries (a correct one carrying exactly its share fails in (1 − s)²¹ of fleets: 3.2, 5.4 and 30 %); or judge "never" on the runs where it occurs and no other protagonist carries the pocket, as round 10 repaired it (it needs a model the boss's answers do not give, and fails a correct protagonist in about 8 % of fleets at the fewest such runs it can judge against a five-crystal record, under 1 % by 21). | — |
| S1 | the cavity rule judged two of the three cases where length and span agree | All three now (`lengthAndSpanAgree`): past, below or in the display range on its length and the span alike, and in it the crystal carries the story. | Bisbee's malachite, about 65 mm in its 60.54 mm cavity (proxy range 50.75–138), carries the story in 15 runs, on its proxy, with 6 more open. Bisbee's verdict stays UNRESOLVED (it has no story frequency); the never-carry line drops it (45). |
| S2 | a giant past a cavity short of its q90 escapes the oversize fail | Stated in §1.3 and §4, and generated: the sixth line under §2's table lists every protagonist whose 90th percentile is past its cavity's span, where WP1 can never judge it oversize. | Herkimer's quartz (q90 60.4 mm, span 59.9) is among them. |
| S3 | the list of unfailable shares overclaimed | Generated over the runs each share is judged on (the scored runs less those in unclassed pockets), split into those the limit alone holds open (Deccan's apophyllite and calcite) and those other rules decide, each with what decides it, with the nearest share above the limit (Grimsel's fluorite, 0.156 against 0.1546, which fails). | — |
| S4 | test gaps | Tests: an OVERSIZE within noise and one with too few runs (both open); the share failing beside an oversize within noise; met only over every scored run (round 11's surviving mutant: 3 carried, 8 accessories and 10 unclassed runs against 0.2 are open, not met); round 11's met cases on the North Pennines targets; and the 2,024-split property. | — |
| S5 | hand-typed results outside the markers | Removed from §1.3 and §4: the count and names of the unfailable shares, the count of open scenarios and Deccan's sizes. The generated lines and tables carry them. | — |

Mutation testing: 19 mutants on this round's code — the agreement rule (rounds 8, 9 and 10's versions of it among them) and its side boundaries, assessSize's eligibility and beyond count, runStory's use of it, the oversize-within-noise rule four ways, "met" over the counted runs, and the scoreboard's and targets' new text — 18 killed: 14 by the tests, 3 by the splice check, 1 by the targets check. The survivor, the scoreboard counting a protagonist as held open by the limit alone when any of its entries is within noise, gives the same text on the census: no protagonist with an unfailable share pairs a share within noise with another entry.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged; Bisbee's malachite now carries 15 runs, and Bisbee stays UNRESOLVED). WP1's whole target is met by none: failed at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0), open at 16. Tests 122 (was 121).

## Round 12 — 7.5/10 (on 187f5c92)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> 187f5c92's fixes are correct as far as they go, and the tests pin them well. But M1's central claim fails by the cavity path, and §4 costs its third option as a different test from the one it names.
>
> **MUST-FIX**
>
> 1. **A protagonist grown past a cavity that is short of its q90 is MET even when most of its crystals are giants.** This is the same indistinguishable-size pass that M1 closed, reached by another route.
>    - **Where:**
>      - `story-pocket-lib.mjs:645–647`: `assessSize` leaves `beyond` runs out of the size verdict. Since `fits` requires span ≥ median, every such run has its length past q90, so the exclusion only ever biases the verdict toward MEETS.
>      - `lib:924–929`: `wp1Target` never sees those runs.
>    - **Claims this breaks:**
>      - PROPOSAL:407–412: "none with most occurrences past the range is met"; "kept … oversize never makes the target met".
>      - PROPOSAL:1153–1154 and 1169–1170.
>      - `lib:901`.
>      - The sixth line (`scoreboard:404`, "left open").
>    - **Evidence** (committed lib, real targets):
>      - Herkimer's quartz (n 5, q90 60.4, span 59.94): 5 runs at 16 mm and 16 at 1,000 mm give STORY, size MEETS (5 eligible, 16 beyond), and **WP1 MET**. The same fleet in the 92 mm cavity fails as oversize.
>      - Of the 2,024 splits into carrier / 1 m / dust / absent, **91 are MET with most occurrences giants**; with span > q90 there are 0. The NP galena in a 25 mm cavity gives the same 91.
>      - Sweep (lognormal sd 0.6, 2,000 fleets) in Herkimer's own cavity:
>        - median 80 mm (68 % of runs past q90): met 84 %, failed 0 %;
>        - median 120 mm: met 12 %, failed 0 %.
>      - The same fleets in a cavity past q90: met 4 % / failed 49 % at 80 mm, failed 99 % at 120 mm.
>    - The proposal's own premise is that "its length or the span could be the one to judge". These sizes are therefore indistinguishable, and the boss said such a miss is never a pass.
>    - Reachable for the 30 protagonists the sixth line lists, Herkimer (WP1's first target) among them. Round 11's S2 saw only the all-giant case, which is open.
>    - **Fix:** where eligible − within + beyond > (eligible + beyond)/2, leave WP1 open ("oversize unknown").
>      - My scratch variant: mostly-giant met splits fall 91 → 0; Herkimer at 80 mm is met 4.5 % (the rest open); 16–30 mm fleets are unchanged; the census is unchanged.
>      - All 122 tests still pass under it, so nothing pins this either way. Add the split property on Herkimer's real cavity and restate the claims.
>
> 2. **§4's cost for the third option describes a different test from the one it names** (PROPOSAL:1572–1577; REVIEW:1236; the commit message).
>    - **The named test:** "as round 10 repaired" is P(none of m in range) from `recordCoverage` (beta-binomial).
>      - Against five crystals it can first judge at **m = 13** (n 8: m = 8).
>      - It fails a correct protagonist **≤ 2.5 %** by construction: 2.47 % in the model, 1.7 % simulated on a lognormal.
>      - It fails both Deccan protagonists (p 0.11 % and 0.92 % at m = 21).
>    - **What the stated figures fit:** "about 8 % … at the fewest such runs it can judge (6)" is the round-9 reviewer's Wilson variant. The top for 0 of 6 is 0.390 < 0.433, and its simulated false-fail rate at 6 runs is 7.8 %.
>    - So the repaired option, the one round 11 asked to see costed, is made to look three to five times worse than it is.
>    - **Options 2 and 3 are costed on different noise models.** (1−s)²¹ counts the runs' noise only. Counting the record's noise, as option 3's figure does, gives:
>      - Deccan apophyllite 4.6 % (stated 3.2);
>      - Deccan calcite 9.6 % (stated 5.4);
>      - Jeffrey pectolite 30 % (stated 30).
>    - Minor: 3.2 % is the figure for 0.1517; 0.15 gives 3.3 %.
>    - **Fix:** cost the named test correctly, put options 2 and 3 on one model (or state both), and correct REVIEW:1236.
>
> **SHOULD-FIX**
>
> 1. **The registered rule texts contradict S1's third agreement.**
>    - `story-pocket-targets.mjs:77` → targets JSON:83 (`story_frequency_rule`):
>      - a story run's crystal must be in range "and no longer than the cavity";
>      - "runs whose crystal is longer than it stay open" (also PROPOSAL:346).
>    - `:78` → JSON:84 (`carrier_obligation`):
>      - a carrier's crystal is "within the cavity";
>      - the runs it could still carry are "longer than a cavity whose span is short of its q90" (also PROPOSAL:375–376, 400–401, 1163).
>    - Bisbee's malachite carries 15 runs against the registered text. The targets check cannot catch this, because the text is the tool's own.
>
> 2. **PROPOSAL:305–307 is false since S1.** "a crystal grown past the cavity is always such a run": one grown past the span but within q90 carries the story. Bisbee is exactly that case (q90 138, span 61).
>    - PROPOSAL:303–304 also types a census result outside the markers ("now carries in 15 runs"), against round 11's S5.
>
> 3. **PROPOSAL:1562–1564 slightly overstates the boss's part.** "On the boss's own two answers it would fail" holds for Deccan's calcite, an alternate. For the apophyllite, the primary, it rests on this proposal's choice to hold the primary to the obligation.
>
> 4. **`scoreboard:425`'s label "a share the scored runs cannot tell from none carried" catches more than it says.** It matches any never-carrier short within noise, including one held there by beyond or short runs (for example 0 carried, 1 beyond, against 0.2167). No census case today.
>
> 5. **Test gap:** the 2,024-split property uses span 91.93 only (`test.ts:964–982`).
>
> **Verified correct**
>
> - **Read-only:** HEAD is 187f5c92 and the tree is clean.
>   - Only the test-quarry ledger changed; every other `.local-evidence` hash is unchanged.
>   - `compare.json` 8419de06… reproduced; the comparison tool last changed in afbe687f (an ancestor).
>   - Nothing under js/ or data/ changed in f49c1804~..187f5c92.
>   - A scratch `node_modules` junction I used for the mutation harness was removed (link only).
> - **Checks:** the size evidence runs; the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 122/122 tests pass, also on my scratch harness.
> - **M1 holds in its own terms:**
>   - the three met cases are now open;
>   - 802 met and 0 mostly-past of 2,024 in the 92 mm cavity;
>   - no carrier→X move improves in any cavity.
>   - Correct fleets at 21 seeds are met 72.8–72.9 / 56.2–56.9 % (stated 72.5 / 56.8) and failed 0.2–0.3 / 2.6 %.
>   - The floors are unaffected by M1 (same seeds as 454adb7a's lib).
>   - The 210- and 1,000-seed rows reproduce within noise (for example 66 / 15 and 69 / 23 % against five crystals).
>   - Galena sweep: met 23 / 6 / 0.8 %; failed 13 / 38 / 73 / 96 / 99.8 / 100 %.
> - **M2:** the attribution is fixed in §4, the eighth line and `rules.carrier_obligation`. Option 1's 22 / 26 / 65 seeds are exact.
> - **S1:** the code is right. Inside `assessSize` only two of the three agreements can occur, so `size_check`'s text is right.
> - **S2:** the list of 30 is right as "never judged oversize".
> - **S3:** the split is right (Deccan's two are held open by the limit; Grimsel fluorite 0.156 against 0.1546).
> - **S4:** the tests are present. **S5:** the removals are done.
> - **Mutants:** 21 of my own on the lib — the agreement rule five ways, `rangeSide`'s boundaries, the oversize rule four ways, the share's denominators, could-runs, band and story noise, unclassed `beyond`, `fits`, `carrierShare`, `few`. 19 killed. The two survivors are equivalent (`<` → `<=` 0.5) or affect only a reported count (`beyond` taken over every occurring run).
> - **Earlier rounds hold:**
>   - no size floor;
>   - unclassed runs stay out of the count;
>   - one giant does not rescue dust where span > q90;
>   - the appendix rebuilds byte for byte; 50 joins (33 by caption, 17 by dimensions); 2,167 specimens;
>   - spot-checked crystal rows behind Herkimer, Deccan's calcite and apophyllite, and NP galena: clean.
> - **Acceptance items:** present and honest, except as above.
>
> **Ready for the boss?** Not yet. First make crystals longer than a cavity short of q90 hold WP1 open wherever they could make it oversize (MUST-FIX 1), and cost §4's third option as the test it names (MUST-FIX 2). The should-fixes are text.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | a protagonist grown past a cavity short of its q90 was met though most of its crystals were giants | `wp1Target` leaves WP1 open ("may be oversize") where the runs the size verdict leaves out for the cavity (past the range on their length, in it on the span) and the eligible runs past q90 are at least half of the two together. At least half, not the reviewer's more than half: at exactly half the typical crystal may lie between one in the range and one past it, which the oversize test already leaves open on the eligible side. My first version took more than half and still met 20 splits with exactly half giants (6 carriers and 6 giants among them); found before this commit, it is now a mutant the tests kill. A judged OVERSIZE stays the oversize test's alone. Restated: §2.3's pockets bullet, WP1's bullets and target, `size_check` and `carrier_obligation`, the sixth line under §2's table ("can never fail them as oversize", and where such runs are at least as many as the ones judged, open), the generated WP1 line; "may be oversize" is a cause in the open causes and in the never-carry groups. | Herkimer's quartz (the committed target, q90 60.4 mm) in its own 59.94 mm cavity: 5 runs at 16 mm and 16 at 1 m are open (may be oversize, 16 of 21 runs), where they had been met; in a 92 mm cavity they fail as oversize. Of the 2,024 splits of 21 runs into carriers, 1 m giants, dust and absence, 802 are met and none with at least half giants (the reviewer counted 91 met with most occurrences giants); they are exactly the splits met in the 92 mm cavity, the short cavity fails none that one does not, and it leaves open 315 of that one's 414 failures. No move away from carrying improves the outcome. All of this is a test now. Sweep of 2,000 lognormal fleets (sd 0.6) in Herkimer's cavity, met at medians of 16 / 30 / 50 / 80 / 120 mm: 100 / 100 / 88.3 / 4.5 / 0 %, the same as in the 92 mm cavity; failed 0 % at every median (the 92 mm cavity fails 46 % at 80 mm and 99 % at 120). The census is unchanged: no protagonist is may-be-oversize in the 861 runs. |
| M2 | §4 costed its third option as a different test, and options 2 and 3 on different noise models | §4 now costs the named test, round 10's repaired one (the chance that none of m runs lands in the display range, a beta-binomial on the record's coverage): it fails a correct protagonist in at most 2.5 % of fleets (about 1.7 % simulated); it can first judge at 13 such runs against a five-crystal record, 8 against eight, 5 against seventeen; and it would fail both of Deccan's protagonists (0.92 % and 0.11 % at 21 runs). Option 2 is costed on both models: on the runs' noise, (1 − s)²¹ is 3.2 % at a share of 0.152 (the reviewer's minor: 0.15 gives 3.3), 5.4 % at 0.13, 30 % at 0.056; with the record's noise as well, about 5, 9 and 30 %. Round 11's response (M2) cited the wrong test's cost; corrected in the note below. | `fix12/option-costs.mjs`, 40,000 fleets each. Option 2 with the record's noise: modelled 5.8 / 11.1 / 30.7 %, simulated 4.8 / 9.3 / 30.0 %. Option 3, records of 5 / 8 / 17: it first judges at m = 13 / 8 / 5, failing a correct protagonist there in 2.47 / 2.15 / 2.44 % modelled and 1.66 / 1.55 / 2.33 % simulated. |
| S1 | the registered rule texts contradicted the third agreement | `story_frequency_rule`: a run carries the story when a protagonist's crystal is in its display range "on its own length, and, where it is longer than the cavity, on the span as well"; a crystal longer than the cavity "is judged only where its length and the span fall on the same side of the display range". `carrier_obligation`: the carrier's crystal is in its display range "on its length, and on the span too where it is longer than the cavity"; the runs it could still carry are those "longer than the cavity where its length and the span fall on different sides of the display range". `size_check` names all three agreements. | Bisbee's malachite now carries under the registered text as it does under the code. |
| S2 | §2.3 said a crystal grown past the cavity is always a could-carry run, and typed a census count outside the markers | Rewritten: such a crystal either stays within the 90th percentile, and carries, or passes it and is a run the protagonist could still carry. The typed "15 runs" is removed. | — |
| S3 | §4 said "on the boss's own two answers it would fail" of the primary too | §4: for an alternate the boss's two answers fail it; for a primary they do only together with this proposal's choice to hold the primary to the obligation. | — |
| S4 | the never-carry label "a share the scored runs cannot tell from none carried" caught more than it said | Relabelled "short of its share within noise". | — |
| S5 | the split property used a cavity past q90 only | Added on Herkimer's real target in its own cavity (above). Round 11's property is strengthened to "none with at least half past the range is met", which holds because the oversize test leaves exactly half open. A unit test pins the may-be rule: 16 of 21 and 10 of 20 are open, 10 of 21 is met; eligible runs past q90 count with the left-out ones; a judged OVERSIZE stands alone; a protagonist with none judged is still open; the share is judged beside it. | — |

Note on round 11's response (M2): its cost for the third option, "about 8 % … at the fewest such runs it can judge" (six), belongs to the round-9 reviewer's Wilson variant, not to the test round 10 repaired. The repaired test's cost is the one above. Round 11's text stays as it was written.

Mutation testing: 13 mutants on round 12's code, 11 killed: the may-be rule nine ways by the tests (among them more than half, my first version), the listed causes by the splice check, and the registered rule text by the targets check. The two survivors break or drop the may-be label in the scoreboard's open causes and never-carry groups; no protagonist is may-be-oversize in the census, so their output is identical.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist is may-be-oversize. Tests 124 (was 122).

## Round 13 — 8/10 (on 16f045c6)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> 16f045c6's M2 fix is right and complete. The rule texts now match the code's three agreements, and the scoreboard changes are sound. But the may-be rule, round 12's M1 fix, only counts runs in a cavity that holds the protagonist's median. So round 12's own case is MET again one step further down: in a cavity short of the median.
>
> **MUST-FIX**
>
> 1. **A protagonist grown past a cavity short of its median is MET even when most of its crystals are giants.**
>    - **Where:**
>      - `tools/story-pocket-lib.mjs:645–646` counts `beyond` over `fitting` runs only (span ≥ median).
>      - `:935–938`: the may-be rule uses `beyond` and `eligible`. Where span < median both are 0, so the rule cannot fire.
>      - `carrierShare` (q25 ≤ span) and `runStory` still credit the carriers in those runs.
>    - **Evidence** (committed lib, real targets):
>      - **Round 12's own case**, on the test file's NP galena (q25 18, median 20, q90 27.2), 5 × 19 mm and 16 × 1 m:
>        - span 18.5: size NO ELIGIBLE POCKET, **WP1 MET**;
>        - span 25: open (may be oversize, 16 of 21);
>        - span 91.93: failed (oversize).
>      - **Deccan's stilbite** (proxy q25 56, median 73, q90 120) in Deccan's own 66.41 mm cavity, 7 × 60 mm and 14 × 500 mm, the other protagonists carrying:
>        - **MET** in its own cavity; open in an 80 mm one; open in a 130 mm one (oversize within noise).
>        - Sweep (lognormal sd 0.6, 2,000 fleets): at a median of 120 mm it is met in 78 % of fleets in its own cavity, against 47 % in the 80 and 130 mm ones. At 200 mm: 6.8 % against 0.1 %.
>      - **supergene_oxidation's smithsonite, the primary** (UNCLASSED pockets): 7 × 55 mm and 14 × 500 mm in its 64.77 mm cavity is **MET**; in an 80 mm cavity, open.
>    - **Reach:** 12 of the 30 protagonists the sixth line lists have q25 ≤ span < median, all of them proxies, 11 with a band:
>      - Deccan: stilbite, heulandite, chalcedony;
>      - Elmwood: fluorite, sphalerite;
>      - epithermal_telluride: calaverite;
>      - MVT: galena, sphalerite;
>      - Sunnyside: fluorite;
>      - supergene_oxidation: smithsonite, calcite;
>      - Bisbee: malachite.
>    - **Claims this breaks:**
>      - the registered `carrier_obligation` (DATA…json:84, targets.mjs:78): open "where those and the runs past the range are at least half of its occurrences". Here they are 14 of 21, so the code contradicts its registered rule;
>      - PROPOSAL:306–311, 390–393, 417, 421–422 and 1164–1166;
>      - the sixth line (PROPOSAL:564, scoreboard:404), which lists these 12 as held open;
>      - the labels at scoreboard:420 and 540 ("of its occurrences");
>      - lib:906.
>    - **A committed test pins the gap.** test.ts:965 has NP galena at 30 mm in an 18.5 mm cavity (21 of 21 past q90) and expects it open on its share alone, with no may-be entry.
>    - **Fix:**
>      - Run the may-be rule over every occurrence whose cavity reaches q25, judged or left out.
>      - Update test.ts:965, and add the 18.5 mm and Deccan cases.
>    - **My scratch variant** (may be oversize where any run is left out and the median of all those lengths passes q90):
>      - all three cases open;
>      - the census is identical (32/32: 0 met, 16 failed, 16 open);
>      - it breaks only test.ts:965 and the may-be unit test, which builds its own size objects.
>
> **SHOULD-FIX**
>
> 1. **"At least half" is not the oversize test's boundary, so the stated reason and two claimed invariants are false beyond the sizes tested.**
>    - **The claim:** PROPOSAL:310, `size_check` (DATA…json:81) and test.ts:839 say exactly half is something "the oversize test leaves open too". It does so only when the R-7 median (the mean of the middle pair) passes q90.
>    - **Evidence:**
>      - NP galena in the 91.93 mm cavity, 6 × 20 mm and 6 × 28–34.4 mm (q90 27.2), is **MET**.
>      - Round 11's strengthened property (test.ts:984–995; REVIEW:1355, "(it holds)") passes only because its 40 mm crystals average past q90.
>      - Herkimer's 2,024 splits with giants of 61–104 mm (not 1 m): the 92 mm cavity meets 822 and the short one 802, so 20 exactly-half splits differ.
>      - "Exactly the 92 mm cavity's 802" (REVIEW:1349, test.ts:1024, the commit) therefore holds only for giants longer than 2·q90 minus the carrier's length.
>    - **Fix:** use one boundary on both sides, and restate the texts. Add a case just past q90 to both split tests. Either:
>      - the R-7 median of the lengths in the may-be rule. My variant gives 822 = 822 at 61 and 90 mm, and 802 = 802 at 106 and 1,000 mm; or
>      - leave exactly half open on the eligible side too.
>
> 2. **§4 does not list the may-be rule as a choice, and costs the cavity choice incompletely.**
>    - **Stale and unlisted:**
>      - PROPOSAL:1565–1568 still says "WP1 can never judge it oversize there". The sixth line now says it can never fail it, only hold it open.
>      - The at-least-half boundary and its denominator are this proposal's choices, and §4 does not list them.
>    - **The cost the boss should see:** in a cavity short of q90 an overgrown protagonist can never fail WP1 at all. Its giants count as runs it could carry, and at most make it "may be oversize".
>      - Herkimer, WP1's first target, in its own cavity: 0 % of fleets fail at any median from 16 to 120 mm. In the 92 mm cavity, 46 % fail at 80 mm and 99 % at 120 mm; my sweep reproduces the commit's figures.
>      - Turning one dust run into a giant changes a fail to open in 15 of its splits.
>      - Today this is stated only in the commit and in REVIEW.
>
> 3. **Minor text:**
>    - PROPOSAL:1594's "about 1.7 % simulated" is the five-crystal figure. Across records of 5, 8 and 17 it is 1.5–2.3 % (mine 1.8/1.5/2.3; REVIEW's 1.66/1.55/2.33).
>    - "About 5, 9 and 30 %" are the lognormal simulations. The Beta model gives 5.8, 11.1 and 30.7 %; say which.
>    - The response and the commit call the pockets paragraph "§2.3"; it is §1.3 (PROPOSAL:290–311).
>
> **Verified correct**
> - **Read-only state:**
>   - HEAD is 16f045c6 and the tree is clean.
>   - The .local-evidence hashes are unchanged except the test-quarry ledger.
>   - Nothing under js/ or data/, and not the comparison tool, changed in f49c1804^..16f045c6.
>   - compare.json reproduced byte for byte.
> - **Checks:** the size evidence runs; the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 124/124 tests pass.
> - **M2 holds:**
>   - option 1's 22/26/65 seeds;
>   - option 2: 3.16/5.37/29.6 % on the runs' noise (model 5.8/11.1/30.7, simulated 4.7/9.2/30.2);
>   - option 3 first judges at 13/8/5 runs (P 2.47/2.15/2.44 %), and Deccan's two at 0.92 % and 0.11 %;
>   - the note correcting round 11 is present.
> - **M1 holds in its own terms:**
>   - the Herkimer sweep is met in 100/100/88.3/4.3/0 % of fleets in both cavities;
>   - no move away from carrying improves the outcome at 61, 90 or 1,000 mm in either cavity;
>   - the census is unchanged (no may-be).
> - **S1–S5:** S1's texts match the code, except MUST-FIX 1's denominator. S2–S5 are done. Causes are listed by flag, and the never-carry relabel is right.
> - **Mutants:** 18 on a scratch copy of the lib, run under a stand-in harness (the clean copy passes 124/124).
>   - 16 killed. The may-be rule is pinned seven ways.
>   - The 2 survivors are equivalent: `===` → `>=` in lengthAndSpanAgree, and `<` → `<=` 0.5.
> - **Earlier rounds hold:**
>   - there is no size floor;
>   - unclassed runs stay out of the count;
>   - one giant does not rescue dust.
> - **Parser and joins:**
>   - I checked every crystal length (about 60) behind Herkimer, Deccan's apophyllite and calcite, Grimsel's fluorite, Jeffrey's grossular, Mogok's spinel, NP galena, Tsumeb's cerussite and Shigar's aquamarine: none misread.
>   - The joins I sampled are plausible, with no over-join.
>
> **Ready for the boss?** Not yet. First make the may-be rule count every occurrence whose cavity reaches q25 (MUST-FIX 1), and settle the exactly-half boundary and its claims (SHOULD-FIX 1). The rest is text.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | a protagonist grown past a cavity short of its median was met with most of its crystals giants | The may-be test now reads every occurrence at its own length: `assessSize`'s new `atLength`, the median the size verdict would take in a cavity that hid nothing. Where that median is past q90 and the verdict is not OVERSIZE, WP1 is open. It counts every occurrence, not only those in cavities that reach q25 as the reviewer proposed: under that population, giants grown in cavities too small for the display range drop out of the median (6 carriers in 25 mm cavities and 15 metre-long crystals in 10 mm ones were met; open now). Restated: `size_check`, `carrier_obligation`, §1.3's pockets paragraph, WP1's bullets and target, the sixth line under §2's table, the open-cause and never-carry labels, the generated WP1 line and the lib's comments. The test of galena at 30 mm in an 18.5 mm cavity now expects the may-be entry beside its share. | The North Pennines galena (the test file's targets), 5 × 19 mm and 16 × 1 m: met in an 18.5 mm cavity before, open now, and open in 25 mm; failed in 91.93 mm. Deccan's stilbite, 7 × 60 and 14 × 500 mm in its own 66.41 mm cavity, and supergene's smithsonite, the primary, in its unclassed pockets: met before, open now (tests on copies of their targets). Across all 2,024 splits, in cavities short of q90 (Herkimer's own; the galena in 25 mm) and short of the median (the galena in 18.5 mm), WP1 meets exactly the splits a cavity that hides nothing meets, and fails no split that one does not fail. That holds with crystals just past q90 (61 mm for Herkimer, 28 mm for the galena) and at 90/34.4, 106/40 and 1,000 mm: met 822, 822, 802 and 802 in every cavity. It is pinned for two sizes each, with the reviewer's cases. Deccan's stilbite (2,000 lognormal fleets) is met in 84.5 / 47.5 / 0.1 % of fleets at medians of 60 / 120 / 200 mm, in its own cavity and in 80, 130 and 5,000 mm ones alike; the reviewer had 78 % against 47 % at 120 mm. The census is unchanged, and the rule fires nowhere in the 861 runs. |
| S1 | "at least half" was not the oversize test's boundary | The may-be test is now the verdict's own median against its own q90, so one boundary serves both sides. The claims that exactly half is held open are removed from the proposal, `size_check` and the tests. Round 11's split property is back to "none mostly past the range", which holds at any size past q90. Both split tests now include a size just past q90. | The galena, 6 × 20 and 6 × 28 mm: met in the 18.5, 25 and 91.93 mm cavities alike (median 24 mm, in the range). Herkimer, 6 × 16 and 6 × 61 mm: met in both cavities; 6 × 16 and 6 × 1 m: open in its own. |
| S2 | §4 did not list the may-be rule as a choice, nor cost the cavity choice fully | §4 lists it as a choice of this proposal, with its history (round 12's "at least half"; round 13's count over the cavities that hold the median) and its cost. In a cavity short of q90 an overgrown protagonist is open, never failed: Herkimer's quartz in its own cavity fails no fleet at any median from 16 to 120 mm, where a 92 mm cavity fails 46 % at 80 mm and 99 % at 120. A metre-long crystal in place of dust lifts a failing fleet to open in 15 of the moves between its 2,024 splits, and in none in the 92 mm cavity; a test pins both counts. The stale "WP1 can never judge it oversize there" now reads "can never fail it as oversize". | — |
| S3 | minor text | §4: option 3's simulated false-fail rate is 1.5 to 2.3 % across records of five, eight and seventeen crystals. Option 2's "about 5, 9 and 30 %" are marked as simulated, beside the beta model's 5.8, 11.1 and 30.7 %. The pockets paragraph is §1.3, which round 12's response and commit message called §2.3; both are left as written. | — |

Mutation testing: 12 mutants on round 13's code, 11 killed: the may-be rule ten ways by the tests — among them round 12's rule restored, and the reviewer's population (the cavities that reach q25), which the case of giants in cavities too small for the display range kills — and the registered rule text by the targets check. The survivor breaks the may-be label in the scoreboard's open causes; no protagonist is may-be-oversize in the census, so its output is identical.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist is may-be-oversize. Tests 127 (was 124).

## Round 14 — 8/10 (on 8f9985b7)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> 8f9985b7 closes the cavity route. In fleets that grow in one cavity, WP1 no longer meets or fails anything its visible twin would not. The next oversize escape does not go through the cavity: it goes through accessory dust, which offsets giants in the oversize test and in round 13's new may-be test.
>
> **MUST-FIX**
>
> 1. **Accessory dust offsets giants in WP1's oversize test and in round 13's may-be test.**
>    - **Where:**
>      - `tools/story-pocket-lib.mjs:648–649`: `atLength` is taken over every occurrence.
>      - `:657–667`: the verdict's median and `within` count every eligible occurrence, dust included. Dust counts as "within q90".
>      - `:936–943`: `wp1Target`.
>    - **Evidence** (committed lib, scratch scripts):
>      - **Herkimer quartz, 92 mm cavity** (it hides nothing): 5 × 16 mm + 10 × 1 m + 6 × 0.5 mm dust is **MET**. With the six dust runs absent, the same fleet is open (oversize within noise, 10 of 15). Of the 2,024 splits, 55 are met with more giants than carriers.
>      - **NP galena** (the test file's targets, 91.93 mm cavity):
>        - 5 × 20 + 10 × 40 + 6 × 8.6 mm (8.6 mm is the census's own galena dust size) is met; with absences instead of the dust, open.
>        - 5 × 20 + 14 × 40 + 2 dust is open; with 2 absences instead, failed.
>      - **Round 13's own rule:** in Herkimer's own cavity, 5 carriers + 6 giants + 1 dust is "may be oversize". One more dust run makes it met.
>      - **Sweep** (2,000 lognormal fleets in the 92 mm cavity; non-dust median 80 mm, so 68 % of non-dust crystals are past q90):
>        - no dust: met 4.3 %, failed 47 %;
>        - 30 % of runs dust: met 41 %, failed 2.6 %.
>      - 29 absent→dust moves improve the outcome with the band IN on both sides. The tests check only moves away from carrying (test.ts:1008–1013, 1034–1035).
>    - **Why it matters:**
>      - The boss's decision (REVIEW:869–878) conditions size on role. Accessories are exempt, and WP1 is "not whether every named protagonist has showcase-sized median growth across all occurrences". Here the exempt dust votes against oversize.
>      - PROPOSAL:407–408 says one giant does not rescue dust. The mirror is false, so "a protagonist kept … oversize never makes the target met" (PROPOSAL:422, 1188) misleads.
>      - It is the same failure rounds 11–13 fixed — met with more giants than carriers — reached without the cavity. WP1's growth and WP9's per-seed variation will produce exactly these mixed fleets.
>    - **Fix:**
>      - Run WP1's oversize test and `atLength` over the protagonist's non-accessory occurrences only: those at or above q25 at their own length (carriers, giants, beyond). Keep the reported verdict over every occurrence. Alternatively, test the share of occurrences past q90.
>      - The census is unchanged under this: only 3 protagonists reach q25, all within q90.
>      - Add a test that an absent→dust move never improves the outcome.
>      - At minimum, list the dust offset in §4 as a choice, with this cost.
>
> **SHOULD-FIX**
>
> 1. **The visible-twin claim is overstated.**
>    - **Where:** `story-pocket-targets.mjs:75` → targets JSON:81 ("WP1 meets exactly the fleets it would meet in one that hides none"); PROPOSAL:312–314 and 1576–1579; the commit message.
>    - **What holds:** for one cavity, which the scoreboard enforces, "met only if the twin is met; failed only if it fails" survived 20,000 random fleets (1–3 protagonists, crystal and proxy targets, spans 3–253 mm).
>    - **"Exactly" fails** in 92 of those fleets. Each has a cavity short of the primary's median or of a protagonist's q25:
>      - Herkimer at 21 × 16 mm in a 15 mm cavity gives SMALL POCKETS ONLY;
>      - NP galena at 21 × 20 mm in a 17 mm cavity is open (range beyond the cavity);
>      - both twins are met.
>    - **With per-run spans** (the lib's input, test.ts:993 and 1087, and WP9's goal) it fails both ways:
>      - NP galena, 10 × 28 mm in 91.93 mm cavities plus 11 × 20 mm in 19 mm ones, FAILS ("oversize: 10 of 10 eligible"), while its twin is met;
>      - of 20,000 random mixed fleets, 58 fail where the twin does not, and 101 are met where it is not (small pockets leave the denominators).
>    - **Fix:** scope the claim to one cavity and to the size test, and say what WP9 will change.
> 2. **An unknown span is classed SMALL.**
>    - `fits(null)` is false, so `pocketClass` returns SMALL, the "conclusive" class (lib:599–608). Meanwhile `lengthAndSpanAgree` treats a null span as no limit.
>    - This contradicts "UNCLASSED when this cannot be told". It is latent: the scoreboard throws without a cavity.
>    - **Fix:** return null for a non-finite span (or throw), and test it.
> 3. **§4's Herkimer cost rests on a 0.46 mm margin.**
>    - The q90 of 60.4 (lengths 7, 11, 16, 31, 80) is past the 59.94 mm span only because of the single 80 mm crystal.
>    - Any sixth length under about 39.9 mm drops q90 below the span, and the oversize test would then apply in Herkimer's own cavity.
>    - **Fix:** say beside the cost that WP0 can flip it.
> 4. **Minor:**
>    - Typed census results sit outside the markers: PROPOSAL:386 ("8.6 mm in all 21 runs … none of 21 against 0.2167") and :411 ("grown to 39 mm"). This goes against PROPOSAL:38–39; both are correct today.
>    - The scoreboard's may-be labels have no fixture test; round 13's surviving mutant lives there.
>
> **Verified correct**
> - **Read-only state:**
>   - HEAD is 8f9985b7 and the tree is clean.
>   - Only `npm test`'s own outputs changed: the test-quarry ledger and the ignored `dist/.test-bundle.*`.
>   - Nothing under js/ or data/ changed in f49c1804^..8f9985b7.
>   - The comparison tool last changed in afbe687f, an ancestor.
> - **Checks:** the size evidence runs; the targets match a rebuild; 13/13 scoreboard and 2/2 substrate blocks match; 127/127 tests pass; the comparison tool runs.
> - **Round 13's M1 holds:**
>   - `atLength` and its gate are as described, and the share is still tested after it.
>   - All three of the reviewer's cases are now open.
>   - Met counts are 822/822/802/802 in every cavity: Herkimer at 61/90/106/1,000 mm, and NP galena at 28/34.4/40/1,000 mm in 18.5/25/91.93 mm cavities.
>   - The hiding cavities fail 99 splits, against the twin's 414.
>   - The census is unchanged: `atLength` is past q90 nowhere.
> - **Round 13's should-fixes hold:**
>   - No stale "at least half" remains.
>   - In its own cavity Herkimer fails 0 % of fleets at medians of 16–1,000 mm. The 92 mm cavity fails 45.6 % at 80 mm and 98.9 % at 120 mm (2,000 fleets). The 15 lifts are pinned by a test.
>   - §4's text fixes are present.
>   - Deccan's stilbite is met at the same rate in 66.41, 80, 130 and 5,000 mm cavities.
> - **Mutants:** 13 on round 13's code, all killed (population ×5, boundary ×3, the early return, gating ×3, fail vs open). Of 13 elsewhere, 12 were killed; the survivor (`size >= span`) is equivalent. My stand-in harness reproduces 127/127.
> - **Earlier rounds hold:** there is no size floor; unclassed runs stay out of the count; one giant does not rescue dust where the span is past q90.
> - **Parser and joins:** 30 random crystal rows were all read right. The 50 joins (33 by caption, 17 by dimensions) are plausible, with no over-join.
> - **Acceptance items:** present and honest, except as above.
>
> **Ready for the boss?** Not yet. First settle MUST-FIX 1: either change the oversize population, or put the dust offset to the boss in §4 with its cost. Then scope the twin claim (SHOULD-FIX 1). The rest is minor.

### The response

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | accessory dust offset giants in WP1's oversize test and in the may-be test | WP1's oversize test now reads only the crystals at or past the display range's start (`assessSize`'s new `display`). An accessory, which the boss exempted from showcase size, neither passes the test nor offsets a giant; the reported size verdict still reads every eligible occurrence. The reviewer proposed reading every non-accessory occurrence at its own length. Instead, each crystal the cavity hides is read both ways, at its own length and at the span. WP1 fails only where every reading puts the typical crystal at display scale past q90 beyond noise, and is open where any reading does; round 13's at-length rule is now one of the two readings. The cost is measured and stated in §1.3, §4 and the tests. A five-crystal record's 90th percentile can sit low in its own population, and with the dust no longer voting, the crystals at display scale show it. Against five crystals a correct fleet now fails in 6.8 / 25 / 34 % of fleets of 21 / 210 / 1,000 seeds (was 2.5 / 17 / 26), most of it as oversize; against seventeen crystals, in 0.3 / 1.2 / 2.7 % (was 0.3 / 1.1 / 2.5). The galena sweep, whose spread (sd 0.6) is wider than its record's, is met in 39 % of fleets at its record's median (was over 60 %) and fails in 41 % at 30 mm (was 12 %); with a spread like its record's (sd 0.3) it is met in 99 %. I considered reading the lower third of the display-scale crystals instead, which is calibrated to the record, and rejected it: it would meet a protagonist with up to twice as many giants as carriers, which rounds 11–13 found against. | The reviewer's cases. Herkimer in 92 mm, 5 × 16 mm + 10 × 1 m + 6 dust: met before; now open (oversize within noise, 10 of 15), the same as with the dust absent. NP galena, 5 × 20 + 14 × 40 + 2 dust: was open; now failed, the same as with the 2 absent. Herkimer in its own cavity with 1 or 2 dust: open both times. Moves from absent to dust that improve the outcome with the band unchanged: 0 in every cavity (were 20–37 per cavity). A test now asserts that dust in place of absence changes nothing where the band reads the same, and that no split with more giants than carriers is met. Over 2,024 splits, with giants of 61 / 90 / 106 / 1,000 mm (28 / 34.4 / 40 / 1,000 for the galena), Herkimer and the galena are met in 752 / 752 / 711 / 711 splits, the same in every cavity (822 / 802 with the dust voting). The census is unchanged: no protagonist gets a size entry. |
| S1 | the visible-twin claim was overstated | Scoped in `size_check`, §1.3 and §4. A cavity that hid nothing reads every crystal at its length, one of the two readings, so the size test fails a fleet only where such a cavity would fail it and passes one only where such a cavity would pass it. That holds in any fleet, mixed spans included. The whole target is met and failed exactly as such a cavity's only in one cavity that holds the primary's median and reaches each protagonist's display range. Otherwise small pockets, or a range beyond the cavity, hold it open, and with cavities that differ from run to run (WP9) small pockets also leave the share's count. | The reviewer's random search on the new code (20,000 fleets per mode; 1–3 protagonists, crystal and proxy targets, spans 3–253 mm). One cavity: none met where its twin is not, and none failed where it is not. Mixed spans, the size test alone, about 40,000 protagonists: none failed or passed where the twin's was not (the whole target still differs there through small pockets, as stated). The reviewer's mixed fleet, 10 × 28 mm in 91.93 mm cavities and 11 × 20 mm in 19 mm ones, was failed and is now met, like its twin. |
| S2 | an unknown span was classed SMALL | `fits` returns null for a span that is not known, so `pocketClass` gives UNCLASSED; a cavity without limit (Infinity) still fits. Tested. | — |
| S3 | §4's Herkimer cost rests on a 0.46 mm margin | Stated beside the cost. Herkimer's q90, 60.4 mm, passes its 59.94 mm span only because of one 80 mm crystal among five. A sixth length under about 40 mm would bring it inside the span, where the test fails an overgrown quartz again (WP0 can flip it). | — |
| S4 | minor | The typed census results (the galena at 8.6 mm in all 21 runs; the calcite grown to 39 mm) are replaced by general statements that point at the generated lines. The scoreboard's cause tables moved into the lib (`WP1_FAILS`, `WP1_OPENS`, `NEVER_CARRY`, `neverCarryCause`). A test now checks that every entry `wp1Target` writes sorts under exactly one cause, its own, and that a protagonist that never carries sorts under the first cause it has. The label mutant that survived rounds 12 and 13 now dies. | — |

Mutation testing: 19 mutants on round 14's code, 16 killed: the readings eight ways, the gates and the messages three ways, the unknown span, and the cause tables three ways by the tests (among them the label mutant that survived rounds 12 and 13), and the registered rule text by the targets check. The three survivors are equivalent: a guard on the fail that the interval already implies (now removed), '< 0.5' against '<= 0.5', and the oversize fail pattern loosened where fails never carry the open entries' wording.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 128 (was 127).

## Round 15 — 7.5/10 (on fe69538b and 516253c8)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> fe69538b closes round 14's dust route, and the both-ways reading is sound. The `least` and `most` readings bound every per-crystal reading (checked by hand and by random search), and the scoped twin claims hold. But the same change opens two new routes. Both run through votes that the boss's decisions place outside showcase judgement. Both are latent in today's census (no protagonist has a crystal past q90, and there are no small pockets).
>
> **MUST-FIX**
>
> 1. **A proxy protagonist growing at its own crystal scale fails as oversize on a few giants.** New in fe69538b; 516253c8 states it as intended.
>    - **Where:** `tools/story-pocket-lib.mjs:655` (the `size < q25` gate also applies to proxies); PROPOSAL:1605–1608; size_check (targets JSON:81).
>    - **Evidence (committed Deccan targets, 300 mm cavity):** stilbite has a proxy q25 of 56.25 and q90 of 119.7, and its two photographed crystals are 40 and 62 mm. A fleet with 17 runs at 45 mm and 4 at 150 mm **FAILS**: "oversize: past its display range in 4 of its 4 runs". 8 × 150 + 13 × 45 also fails. Meanwhile the size verdict reads BELOW PROXY. 8f9985b7 left the same fleets open, as runs short of the proxy that could still carry.
>    - **Why it is wrong:**
>      - The lib's own taxonomy calls these runs `short`: "a proxy cannot refute", and the share test counts them as runs the protagonist could still carry. The oversize test treats them as accessories.
>      - 516253c8 says they are "no evidence of where the protagonist's crystals at display scale fall". That reverses the boss's proxy answer: these crystals may be exactly those crystals.
>      - It also breaks the rule's own claim that it "fails only where every reading puts it past q90".
>    - **Fix:** read a crystal short of a proxy both ways: within in `least`, no vote in `most`. It can then turn a fail into open, never into met. Rewrite the §4 clause.
>
> 2. **Carriers in small pockets offset giants in the scored pockets.** New in fe69538b; latent until WP9.
>    - **Where:** lib:654–656 (every occurrence votes, whatever its pocket); test.ts:935–936. Also PROPOSAL:432–433 ("none with more giants than carriers is met"), which is true only across all pockets.
>    - **Evidence:**
>      - **Herkimer quartz.** 11 runs in 92 mm cavities: 8 at 80 mm and 3 carriers. Plus 10 SMALL 14 mm pockets with quartz at 12 mm. Result: **MET**, with 8 giants to 3 carriers among the scored pockets. With those 10 runs as dust instead: OPEN. Under 8f9985b7: OPEN.
>      - **Deccan calcite (committed targets).** In 66.41 mm cavities: 9 at 60 mm (past its q90 of 48) and 2 carriers. Plus 10 at 15 mm in 20 mm pockets. Result: **MET**. Under 8f9985b7: FAILED.
>    - **Why it matters:** the boss asked for size "checked conditionally on … the pocket being physically eligible", and said small pockets may lack a showcase. Here small pockets supply one. This is rounds 12–13's cavity route in reverse.
>    - **Fix:** in `most`, give no vote to a crystal at or below q90 that sits in a SMALL pocket (classed against the primary; arguably UNCLASSED too). Keep its within vote in `least`. scenarioWp1 (lib:1017) would pass the pocket class to assessSize. At minimum, state the choice and its cost in §4.
>
>    **Both fixes tested on a scratch copy:** 128/128 tests pass, the census is unchanged, the twin search finds 0 violations, and every case above becomes open.
>
> **SHOULD-FIX**
>
> 1. **The stated cost is incomplete, and §4 offers a strawman alternative.**
>    - §1.3, §4 and noise_basis give 5- and 17-crystal records only. Yet 7 of the 10 crystal targets with engines have 5–9 lengths.
>    - My runs at 1,000 seeds, mid-band, 1,500 fleets:
>
>      | crystals | total failed (before → now) | oversize failed (before → now) |
>      |---|---|---|
>      | 6 | 17.0 → 24.6 % | 3.9 → 16.9 % |
>      | 8 | 11.1 → 14.4 % | 1.2 → 8.0 % |
>      | 9 | 9.1 → 11.5 % | 0.5 → 5.3 % |
>
>      State these rows.
>    - The only alternative §4 rejects is one that meets giants. A design it doesn't consider: "fail where the lower third is past q90 beyond noise, open where the median is". This keeps dust neutral, never meets more giants than carriers, and leaves met rates unchanged.
>      - Against five crystals, correct fleets fail 2.0 / 16 / 23 % (now 6.8 / 25 / 34 %).
>      - Its cost: the overgrown galena fails 4 / 25 / 58 % at 30 / 40 / 50 mm instead of 41 / 85 / 98 %, staying open instead.
>      - Put this to the boss.
>    - The 1,000-seed column and Herkimer's 46 / 99 % are not pinned by any test.
> 2. **The tests don't pin the new gate.**
>    - Mutant `size < q10` survives. With it, dust between q10 and q25 votes again: NP galena 5 × 20 + 10 × 40 + 6 × 16 mm would be met. That reopens round 14's must-fix.
>    - Mutant `median >= q90` also survives.
>    - Add a test for each.
> 3. **`past` is computed on a rounded median.** `reading()` compares a median rounded to 3 decimals with q90, while `within` and runStory use exact lengths (the census records 0.0001 mm). NP galena with 5 × 20 + 16 × 27.2004 mm is **MET**. Compute `past` unrounded.
> 4. **Stale texts.**
>    - §1.1 rule 4 (PROPOSAL:121–125) still defines oversize by the typical crystal over all occurrences. A fleet of 0 carriers, 5 giants and 16 dust now fails as oversize, though its typical crystal is dust.
>    - The generated rules line (scoreboard:652, shown at PROPOSAL:201) still describes WP1's oversize test as "of the share of runs … with 3 eligible runs or fewer".
>    - PROPOSAL:423 still says "may hide from the size verdict".
>    - §1.3, the WP1 line and the registered texts all write "exempt (the boss's answer), so it neither passes…". Excluding accessories from the vote is this proposal's application of the boss's answer, as §4 itself says.
> 5. **Nits.**
>    - §4's "20 to 37 moves per cavity" was really 10–37: 10 with Herkimer giants of 61 or 90 mm, and with galena giants of 28 or 34.4 mm in 18.5 and 25 mm cavities.
>    - The "equivalent" `<` vs `<= 0.5` mutant is not equivalent: `wilson(288, 625)[1] === 0.5` exactly (also 2739/5625 and 4902/10000). The current `<` is correct, and the case can't arise at 21 seeds.
>    - The sixth line omits protagonists whose range starts past the span, which also can never be failed as oversize.
>
> **Verified and correct**
> - **Read-only state:**
>   - HEAD is 516253c8 and the tree is clean; the .local-evidence hashes are unchanged.
>   - Nothing under js/ or data/ changed in f49c1804^..HEAD.
>   - The comparison tool was last changed in afbe687f.
> - **Checks:**
>   - The size evidence runs and the targets match a rebuild.
>   - All 13/13 scoreboard and 2/2 substrate splice blocks match.
>   - Tests pass 128/128 (my stand-in harness also gets 128/128), and the comparison tool runs.
> - **Round 14's responses hold:**
>   - The M1 cases came out as stated: Herkimer met → open, galena open → failed, and Herkimer in its own cavity with 1 or 2 dust runs is open.
>   - Absent→dust moves that improve the outcome: 0 (were 10–37).
>   - Splits met: 752 / 752 / 711 / 711, the same in every cavity.
>   - The correct-fleet table reproduces: 6.8 / 25 / 34, 0.3 / 1.2 / 2.7, floors 12 / 44 / 60, and "was 2.5 / 17 / 26".
>   - The one-protagonist figures reproduce: 16 / 28 %.
>   - The galena sweep reproduces within simulation noise: met 41 % at its median; failed 39 / 84 / 98 % at 30 / 40 / 50 mm; met 98 % at sd 0.3.
>   - Herkimer: 0 % failed in its own cavity, 47 / 99 % in the 92 mm one.
>   - S1's scoped twin: 20,000 random fleets per mode, with 0 violations of the size-test twin, the one-cavity whole-target twin, or "met with more giants than carriers".
>   - S2–S4 are present, and moving the cause tables leaves the generated output unchanged.
> - **Mutants:** 30 on the new code, 26 killed. Two of the survivors are equivalent (`size >= span`, and the loosened fails pattern); the other two are listed above.
> - **Parser:** 25 random crystal rows were all read correctly.
>
> **Ready for the boss?** Not yet. Fix MUST-FIX 1, since the proxy exemption reverses the boss's proxy answer. Fix MUST-FIX 2 or state it in §4. Then add the 6–9-crystal costs and the lower-third-fail option to §4.

### The response

The score fell (8 → 7.5), and both must-fixes sit in round 14's change. I considered cutting back to round 13's rule and putting the dust offset to the boss, the fallback round 14's reviewer offered. I kept round 14's change and generalised it instead, for three reasons. The cut would restore round 14's must-fix (dust rescuing giants) as a known defect. The reviewer found the both-ways reading itself sound. And both new must-fixes are that reading applied to two more kinds of crystal the evidence cannot settle. The rule is now one sentence: each crystal votes by the part it plays, and one whose part is unsettled — hidden by the cavity, short of a proxy, or in a pocket that may not count — is read both ways.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | a proxy protagonist growing at its own crystal scale failed as oversize on a few giants | A crystal short of a specimen proxy's range keeps a vote. A proxy cannot refute it, so it is read both ways: within the 90th percentile in the protagonist's favour, and no vote against it. It can turn a fail into open, never a fleet into met. §4's clause from 516253c8 is rewritten: such a crystal may be exactly the protagonist's crystal at display scale. | Copies of Deccan's targets, 300 mm cavity. Stilbite 17 × 45 mm + 4 × 150: failed before; now open (may be oversize: 4 of the 4 runs that vote, with the 17 read either way read against it). 13 × 45 + 8 × 150: open. Over 1,771 splits of 21 runs into carriers (80 mm), giants (150), shorts (45) and absence: none with more giants than carriers is met, and a short in place of absence never makes the target met where the band reads the same. |
| M2 | carriers in small pockets offset giants in the scored ones | A crystal in a pocket that may not count is read both ways, as counted and as left out. Such a pocket is SMALL (which the boss leaves out of the story's count) or UNCLASSED. In the protagonist's favour a carrier there votes within and a giant has no vote; against it, the reverse. `scenarioWp1` passes `assessSize` each run's pocket class, classed against the primary as `scoreStory` classes it. This goes one step past the reviewer's fix, which kept a small-pocket giant's vote in the favourable reading. The boss's own small-pocket reading is then one of the readings the rule bounds: WP1 fails only where that reading and the cavity-hides-nothing reading both fail, and passes only where both pass. | Herkimer's quartz, 8 × 80 mm + 3 carriers in 92 mm cavities and 10 × 12 mm in 14 mm small pockets: met before, open now (may be oversize, 8 of 11). Deccan's calcite (copies), 9 × 60 + 2 carriers in 66.41 mm cavities and 10 × 15 in 20 mm small pockets: met before, open now. Over 780 Herkimer configurations with small pockets, none is met with more giants than carriers in the scored pockets, and no small-pocket carrier in place of absence makes it met where the band reads the same. Random search found no fleet failed or passed where the other reading disagrees: against the boss's small-pocket reading, 20,000 protagonists (8,120 with small pockets, 5,481 with unclassed); against the cavity that hides nothing, about 40,000 per mode, single and mixed. A seeded 3,000-protagonist version is now a test. |
| S1 | the stated cost was incomplete, and §4 offered a strawman alternative | §1.3's table has rows for records of six, eight and nine crystals, and §4 and `noise_basis` state them before and after. Mid-band failed, at 21 / 210 / 1,000 seeds: 2.6 → 4.2 / 10 → 15 / 17 → 25 % for six; 1.3 → 2.1 / 6.2 → 8.9 / 11 → 14 % for eight; 1.6 → 2.0 / 6.1 → 7.6 / 9.1 → 12 % for nine. §4 now puts the reviewer's design to the boss as an option, with its costs: fail only where the lower third of the voters is past the range beyond noise, and hold open where the median is. It meets the same fleets. Correct fleets against five crystals fail 2.0 / 16 / 23 % instead of 6.8 / 25 / 34 %. The overgrown galena fails 4 / 26 / 58 % at 30 / 40 / 50 mm instead of 39 / 83 / 98 % (in the same fleets). The default stays the median, because the overgrown cases there are protagonists at one and a half to two and a half times their record. The 1,000-seed column is stated as simulation only. Herkimer's sweep is now pinned by a test: no fleet fails in its own cavity, about half fail at 80 mm and nearly all at 120 mm in the 92 mm one. | `fix15/measure.mjs`, run on frozen copies of the 8f9985b7, fe69538b and variant libs (6,000, 3,000 and 1,500 fleets; 2,000 for the sweep). The reviewer's 1,000-seed rows reproduce exactly: 17.0 → 24.6, 11.1 → 14.4, 9.1 → 11.5 %. |
| S2 | the tests did not pin the new gate | New tests: a crystal target's crystal between q10 and q25 has no vote (NP galena with 6 at 16 mm is not met), and a median exactly at q90 is not past it. Both mutants die. | — |
| S3 | `past` was computed on a rounded median | The readings now use the exact R-7 median, not the summary's rounded one. NP galena with 16 at 27.2004 mm fails as oversize (it was met). The reported verdict keeps its rounded summary. | — |
| S4 | stale texts | §1.1 rule 4 separates the reported verdict (the typical crystal over every eligible occurrence) from WP1's oversize test (the typical voting crystal). The generated rules line describes WP1's oversize test as it now is. "May hide from the size verdict" is gone. §1.3, the WP1 line and the registered texts attribute the exemption as this proposal's application of the boss's answer. | — |
| S5 | nits | §4's "20 to 37 moves" now reads "10 to 37". Round 14's response wrongly called the `<` against `<= 0.5` mutant equivalent: `wilson(288, 625)` tops at exactly one half, and a test now pins that this is no fail. The sixth line also lists protagonists whose display range starts past the span; they can never be failed as oversize either. | — |

Mutation testing: 16 mutants on round 15's code, all killed: 14 by the tests (among them round 15's two survivors, the accessory gate at q10 and a median at q90 counted past, the 0.5 boundary, 516253c8's denied proxy vote, the reviewer's own version of the pocket fix, and pockets classed against the protagonist instead of the primary), 1 by the splice check (round 14's sixth-line list), and 1 by the targets check.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 130 (was 128).

## Round 16 — 7.5/10 (on 3808d579)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> Round 15's fixes hold on the round-15 cases. But the change opens a new oversize route in today's committed cavities, and in one combination its "every reading" bound is false. I did not edit, commit or push anything in the repository; scratch files are only in review16\.
>
> **MUST-FIX**
>
> 1. **Unclassed pockets switch off the oversize fail for every protagonist in 17 of 32 scored scenarios. The cost is not stated, and the sixth line is incomplete.**
>    - **Where:**
>      - lib:666 reads UNCLASSED pockets both ways.
>      - lib:1034 classes every protagonist's pocket against the primary.
>      - scoreboard:403: the sixth line lists only protagonists with q90 > span.
>      - PROPOSAL:325–326 says that line "lists the protagonists WP1 can never fail as oversize in their cavity".
>      - Also §4:1602–1612 and size_check (targets JSON:81).
>    - **Evidence:**
>      - In an UNCLASSED pocket every past vote leaves `least`, so `least` can never fail. The generated block says 17 of 32 scored scenarios are UNCLASSED (PROPOSAL:600).
>      - Tsumeb's cerussite: crystal target, q25 23, q90 36. Its 64.77 mm cavity "holds it: yes". The pocket is unclassed only because smithsonite's proxy median (70) exceeds the span.
>      - Set cerussite to 40 or 60 mm in all 21 census runs. fe69538b **fails** it ("oversize: 21 of 21"). 3808d579 holds it open ("may be oversize … with the 21 that could be read either way").
>      - Both readings §4 says the rule is bounded by fail it. The bound test's own "boss's small-pocket reading" counts unclassed pockets (test.ts:500). So reading unclassed pockets as left out is a third hedge that neither reading justifies.
>      - The same crystals in a 70 mm cavity **fail**. So a cavity shorter than the primary's proxy median shields every protagonist, and enlarging it (WP9) can only expose fails.
>      - Cerussite is not on the sixth line, and no text states this cost. Its carrier share was already unfailable there; the oversize part is new in this commit.
>    - **Fix:** settle an unclassed pocket for a protagonist whose own median it holds: `r.pocket === 'SMALL' || (r.pocket === 'UNCLASSED' && fits(r.span, target) !== true)`. On a scratch copy:
>      - cerussite fails again; smithsonite stays open;
>      - both round-15 M2 cases stay open, and the bound search passes;
>      - 129/130 tests pass. Only test.ts:475 fails; it pins today's behaviour.
>
>    If you keep the current reading instead, list every protagonist in an unclassed pocket on the sixth line and state the cost in §4.
>
> 2. **A proxy crystal hidden by a cavity shorter than the proxy's q25 gets no vote in its favour, so `least` does not bound every reading (a false fail).**
>    - **Where:**
>      - lib:665: `else against = r.size; // … an accessory on the span`.
>      - size_check says "(in the range there, or below it, an accessory)". That contradicts §4:1630–1632: "a crystal short of a specimen proxy's range is not an accessory".
>    - **Evidence:**
>      - Naica's selenite proxy (q25 76.5, q90 260): 6 runs at 400 mm in 400 mm cavities, plus 5 at 300 mm in 60 mm cavities.
>      - This **fails**: "oversize: 6 of the 6 runs that vote, with the 5 that could be read either way read in its favour". But those 5 got no vote.
>      - Read at the span they are 60 mm, short of the proxy, and the rule reads such a crystal as within. That gives 5 of 11 within, Wilson top 0.72: open.
>      - The same 5 grown only to 50 mm inside the cavity: open.
>      - This needs mixed spans (WP9). The bound search compares only the at-length and small-pockets-left-out readings, so it cannot see this case.
>    - **Fix:** for a proxy, read the span there as short of the proxy: `fav = r.span`. On the scratch copy this passes all 130 tests (nothing pins this case), so add a test for it.
>
> **SHOULD-FIX**
>
> 1. **Reading SMALL pockets both ways is this proposal's choice, not unsettled evidence.**
>    - §1.3:295 and §5:1812 call SMALL conclusive.
>    - The boss said small pockets "may legitimately lack a showcase crystal", and that size is checked in physically eligible pockets. Leaving them out of the count is this proposal's eligibility rule, yet size_check and §1.3:314 say "which the boss leaves out".
>    - Counting small-pocket carriers in `least` keeps round 15's M2 offset alive as fail→open. Deccan's calcite (9 × 60 mm, 2 carriers, 10 small-pocket carriers) fails beyond noise with small pockets left out (2 of 11 within, Wilson top 0.477), but is only open here.
>    - §1.3:315 and §4:1611 present M2 as fixed.
>    - **Fix:** state this as the proposal's hedge, with that cost and the correct attribution. Put "small pockets out of the vote" to the boss as the alternative (its cost: giants in small pockets never count).
>
> 2. **Stale "the cavity may hide" wording.**
>    - The generated WP1 line still says "none oversize (within noise, or where the cavity may hide it, open)" (scoreboard:531 → PROPOSAL:1164).
>    - Same in the WP1 target prose (PROPOSAL:1211) and lib:938.
>    - §1.1 rule 4 (PROPOSAL:121–127) also leaves out the both-ways open.
>
> 3. **The reported size verdict still uses the rounded median, while WP1 uses the exact one** (lib:687–691 against lib:675).
>    - North Pennines galena, 5 × 20 + 16 × 27.2004 mm: reported LARGE beyond noise, so the flags column says "galena large", while WP1 fails it as oversize.
>    - Computing `m` from the exact quantile passes all 130 tests.
>
> 4. **Figures.**
>    - The galena sweep under the median rule is given as 41/85/98 % in §1.3:416–418 and 39/83/98 % in §4:1651, for the same rule and setup. My 2,000-fleet run gives 41.0/85.0/97.9, and 4.0/25.9/55.5 for the lower-third design (stated as 4/26/58).
>    - §1.3:461 says "the tests pin the 21- and 210-seed figures". The new six-, eight- and nine-crystal rows are not pinned.
>
> **Verified and correct**
> - **State:**
>   - HEAD is 3808d579 and the tree was clean before and after.
>   - The .local-evidence hashes are unchanged after every check. The allowed `npm test` did rewrite its own gitignored test-quarry ledger.
>   - Nothing under js/ or data/ changed in f49c1804^..HEAD.
>   - The comparison tool was last changed in afbe687f, and a rerun gives byte-identical output.
> - **Checks:**
>   - The size evidence runs and targets `--check` matches a rebuild.
>   - All 13/13 scoreboard and 2/2 substrate splice blocks match.
>   - 130/130 tests pass, and my stand-in harness also gets 130/130.
> - **Round 15's responses hold:**
>   - M1: stilbite 17 × 45 + 4 × 150 and 13 × 45 + 8 × 150 are open.
>   - M2: Herkimer (8 of 11) and Deccan's calcite are open.
>   - The S2, S3 and S5 tests are present, including wilson(288, 625) = 0.5.
>   - The S4 texts are restated, except SHOULD-FIX 2.
>   - The 1,000-seed column is labelled as simulation only, and Herkimer's sweep is pinned.
>   - The decision not to cut back is sound. But "the evidence cannot settle" is wrong for SMALL pockets (SHOULD-FIX 1).
> - **Bounds:**
>   - I hand-checked every hidden, short, small and unclassed combination. Only the hidden proxy crystal past q90 breaks the bound (MUST-FIX 2).
>   - There is no route to met: `most` keeps within votes only from settled crystals in story-scale pockets.
>   - Moves to short, hidden, small or unclassed can only turn a fail into open.
>   - None with more giants than carriers in the scored pockets is met.
> - **Costs:**
>   - Mid-band failure reproduces within noise:
>
>     | crystals | 21 seeds, mine (stated) | 210 seeds, mine (stated) |
>     |---|---|---|
>     | 5 | 6.2–6.7 % (6.8) | — |
>     | 6 | 4.8 % (4.2) | 15.0 % (15) |
>     | 8 | 2.3 % (2.1) | 9.1 % (8.9) |
>     | 9 | 2.1–2.2 % (2.0) | 7.2 % (7.6) |
>     | 17 | 0.2 % (0.3) | — |
>
>   - The lower-third design against five crystals at 21 seeds: 2.0 %, as stated.
>   - §4 argues the median default against the lower-third design fairly, with both costs on the same fleets. It never says why the median is the default; that reason is only in the rounds file.
> - **Mutants:**
>   - I ran 20 targeted mutants on round 15's code: the proxy gate, the pocket clauses, the `unsettled` count, the exact median, classing against the protagonist, the hidden-crystal branches, the fail and open gates, the 0.5 boundary and the q10 gate. All were killed.
>   - The fixes proposed above break only the one assertion noted in MUST-FIX 1.
> - **Parser:** 24 random crystal rows and 10 joins, checked against the capture, are all correct.
> - **Earlier rounds:** the cavity, dust and rounding routes stay closed, and the tests bite on them.
>
> **Ready for the boss?** Not yet. Fix MUST-FIX 1, or at minimum list it on the sixth line and cost it in §4. Fix MUST-FIX 2 (one line and a test). The should-fixes are text changes plus one line of code.

### The response

The score held at 7.5, and both must-fixes sit in round 15's change. I did not take the reviewer's fix for M1, which would settle an unclassed pocket for a protagonist whose own median it holds. It would leave SMALL pockets read crystal by crystal, and SMALL is a story class drawn against the primary's median: it says nothing about whether the pocket holds this protagonist's crystal. That is the same mismatch M1 found in UNCLASSED. Instead the story's pocket classes leave the oversize test. Which pockets vote is read two ways, each whole:
- every pocket, as a cavity that hid nothing would count them;
- only the pockets that hold the protagonist's own characteristic crystal, as rule 4 and the boss's size rule would.

A crystal's vote is the same in both readings; only which pockets vote differs. The test fails a protagonist only where the reading most in its favour fails, and holds the target open where either reading puts its typical voter past the range.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | unclassed pockets switched off the oversize fail for every protagonist in 17 of 32 scored scenarios | `assessSize` returns `display.every` (all occurring runs) and `display.eligible` (runs where `fits(span, target)` is true, the protagonist's own median). Each gives `least` and `most`, as before. `wp1Target` fails where the larger of the two `least` intervals tops below one half, and opens where either `most` median is past q90. `scenarioWp1` no longer passes a pocket class, and the round-15 pocket clauses are gone. | Copies of Tsumeb's targets in its 64.77 mm cavity. Cerussite at 40 mm in all 21 runs fails again ("21 of the 21 runs that vote"); round 15 had held it open. Smithsonite carrying in 20 runs with one 500 mm giant is met. Round 15 held it open on that one giant: in its unclassed pockets the carriers had no vote against it, so the giant was the whole reading. Round 15's cases stay open: Herkimer, 8 of 11, and Deccan's calcite and stilbite. Random search found no protagonist failed where either reading passes, or passed where either fails. That held over 20,000 protagonists against the eligible-pocket reading and about 80,000 against the cavity that hides nothing. The seeded test now compares against those two readings: spans of 10⁷, and only the eligible pockets. |
| M2 | a proxy crystal hidden by a cavity below the proxy's q25 got no vote in its favour | Read at the span, it is short of the proxy and votes within (`fav = r.span`, the reviewer's fix). | Naica copies: 6 × 400 mm in 400 mm cavities and 5 × 300 mm in 60 mm ones. Failed before; now open ("may be oversize: 11 of the 11 runs that vote, with the 5 that could be read either way read against it"). A test pins it. |
| S1 | reading small pockets both ways is this proposal's choice, not unsettled evidence | §1.3 and §4 now say that a pocket outside the boss's size rule voting in one reading is this proposal's hedge, and give its cost. Deccan's calcite copy (9 × 60 mm and 2 carriers in its own cavity, 10 carriers in 20 mm pockets) fails with those pockets left out and is open here. §4 puts the other way to the boss: only the eligible pockets vote, which is round 13's rule. Its cost is that giants confined to pockets too small for the characteristic crystal go unjudged: Deccan's stilbite copy, 14 × 500 mm and 7 carriers in its own 66.41 mm cavity, short of its 73 mm median, would be met. Neither text presents round 15's M2 as fixed. The boss is quoted only for "size checked in physically eligible pockets"; reading that as a pocket that holds the protagonist's own characteristic crystal is rule 4's. | Both costs were run on a scratch lib whose every-pocket reading is replaced by the eligible one: calcite fails there, and stilbite is met. |
| S2 | stale "may hide" wording | The generated WP1 line now reads "none oversize (within noise, or in only some reading of what the evidence cannot settle, open)". The WP1 target prose, the lib's comments and §1.1 rule 4 now state the both-ways open. | — |
| S3 | the reported verdict used the rounded median | The verdict's median is the exact R-7 one, as in WP1's test. NP galena, 5 × 20 mm + 16 × 27.2004 mm, is reported OVERSIZE (it was LARGE). A test pins it. | — |
| S4 | figures | Both galena sweeps are quoted from the same fleets: §1.3's construction, 2,000 fleets per median. At 30 / 40 / 50 mm the median rule fails 41 / 85 / 98 % and the lower-third design 4 / 25 / 59 %; both meet 3.8 / 0.1 / 0.0 %. The reviewer's 4.0 / 25.9 / 55.5 is another draw of fleets. §1.3 says the tests pin the 21- and 210-seed figures for records of five and seventeen; the six-, eight- and nine-crystal rows are simulation only. §4 now gives the reason the median is the default: it is rule 4's test, and it fails most fleets grown to twice their record's median or more, where the lower-third design holds three in four of those at twice open. | `fix16/sweep-both.mjs`. |

The fail gate takes the more favourable reading. Where every span is known, that is always the reading of every pocket: the pockets it adds give only votes within the range, or none. A mutant that reads every pocket only therefore differs only where a span is not known. A new test pins that case: the North Pennines galena with 16 of 21 crystals at 40 mm fails in its 91.93 mm cavity and is open with every span unknown, where the boss's rule cannot judge it.

Mutation testing: 25 mutants on round 16's code, all killed by the tests, the splice check or the targets check. They covered the two pocket readings (every pocket counted as eligible, only the eligible pockets in both, a pocket that cannot be told counted as eligible), the fail's reading (the eligible pockets only, every pocket only, the less favourable reading, at one half itself), the open gate (either reading alone, the label quoting the other), the crystal readings (the hidden proxy below its range with no vote, a hidden crystal read at its length both ways, one in the range on its length voting against too, a proxy short with no vote or voting against, the accessory gate at q10), the medians (the display median rounded, a median at q90 past, the reported verdict rounded), the unsettled count (ineligible pockets left out, a crystal target's accessories counted), two labels, the sixth line and the rule text. The every-pocket-only fail survived until the unknown-span test was added.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 131 (was 130).

## Round 17 — 8/10 (on 3b201c9e)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> Round 16's two must-fixes are fixed and hold on the committed targets. But the new "every pocket" reading reads a giant hidden in a pocket that cannot hold the median at the span. Neither anchor reads it that way, and with every span known that reading always decides the fail. I edited nothing in the repository. Scratch files are only in `review17\`.
>
> **MUST-FIX**
>
> 1. **Pockets just short of the median switch off the oversize fail. The stated cost names the wrong mechanism.**
>    - **Where:**
>      - lib:670 (the hidden crystal read at the span), applied to every pocket at lib:679, chosen at lib:973.
>      - test.ts:464 pins this reading.
>      - The cost is stated at PROPOSAL:1619–1622 as "carriers there can turn a fail into open". Also §1.3:314–326 and size_check.
>    - **Evidence (committed targets):**
>      - **Tsumeb cerussite**, 40 mm in all 21 runs (q90 36). In its 64.77 mm cavity it fails. With 7 of the 21 runs in 25 mm pockets (short of its 28 mm median; §1.3:296 calls SMALL conclusive) it is **open**: "may be oversize: past its display range in 21 of the 21 runs that vote". Every crystal is a giant. The boss's rule (14 of 14 past) and a cavity that hid nothing (21 of 21) both fail it.
>      - **Deccan calcite**, all 21 at 60 mm with 7 in 20 mm pockets: open.
>      - **NP galena**, lognormal fleets, 2,000 each, with 7 of 21 runs in 19 mm pockets:
>
>        | median | both anchors fail | code fails |
>        |---|---|---|
>        | 30 mm | 22 % | 0.0 % |
>        | 40 mm | 61 % | 0.6 % |
>        | 50 mm | 88 % | 0.3 % |
>
>        With only 3 such runs at 40 mm: both anchors fail 77 %, the code 41 %.
>    - **Why it is wrong:**
>      - "Every pocket, as a cavity that hid nothing would count them" — but a cavity that hid nothing reads the crystal at its own length.
>      - The boss's rule leaves the pocket out.
>      - Only the incoherent combination votes within: the pocket counts, and the crystal is cut to a span that cannot hold the median.
>      - This is a fourth cavity route. Giants there count as carriers, not just carriers.
>    - **Fix:** for a crystal target in a pocket where `fits(span) === false`, read the crystal at its own length in both readings. Add `|| (!proxy && fits(r.span, target) === false)` to the `lengthAndSpanAgree` branch. On a scratch copy:
>      - 130/131 tests pass; only test.ts:464 fails, and it pins the defect.
>      - The code then fails exactly where both anchors fail in all 12 sweep configurations (0.0 % held open).
>      - The stated cases keep their outcomes: Deccan calcite and stilbite, Herkimer, Naica, and both Tsumeb cases.
>      - Census verdicts cannot move (one span per scenario).
>
>      Proxies can keep the at-span reading: below the proxy's median their eligibility is genuinely unknown. Alternatively, keep the current reading, and state this cost with these figures and put it to the boss.
>
> **SHOULD-FIX**
>
> 1. **The hedge's attribution, and a false claim in the response.**
>    - The rounds file (line 1803) says "§1.3 and §4 now say … hedge … and give its cost". Only §4 does: "hedge" appears once in the tree, at PROPOSAL:1620.
>    - §1.3, size_check (targets JSON:81 / targets.mjs:75) and carrier_obligation present the every-pocket reading beside the boss's rule with no attribution.
>    - §1.3:317 cites round 15's "carriers in small pockets had offset giants" in the past tense. §4 says they still turn a fail into open.
>    - Rule 4 (PROPOSAL:125) and the generated WP1 line (:1172, scoreboard:531) fold the pocket hedge into "what the evidence cannot settle", which is round 16's S1 again.
>    - **Fix:** attribute the hedge in all of these places.
>
> 2. **"Such a crystal in place of absence never makes the target met" (PROPOSAL:451–455) is false.**
>    - Crystal target, q25 10, median 20, q90 40. Four carriers in 100 mm pockets, and 7 giants of 50 mm hidden in 15 mm pockets.
>    - With 2 carriers of 12 mm in those pockets the target is open. One more carrier in place of an absence makes it **MET** (band IN at 13 and at 14 of 21).
>    - The sweep (test.ts:1218–1226) has no giant in a small pocket. Scope the claim to that case, or restate it.
>
> 3. **The bound claims hold only where eligibility is settled** (§1.3:323–325, size_check, §4:1616–1618). Both cases are latent.
>    - **Proxy, mixed spans** (q25 50, median 70, q90 115): 3 carriers in 200 mm pockets, 4 × 300 mm hidden in 65 mm pockets, 5 × 55 mm in 60 mm pockets. Result: **MET**. If the crystal's own median is 62 mm, the boss's rule counts the 65 mm pockets, and that reading's median is 300, past q90.
>    - **Unknown spans, fail side:** 10 giants in 100 mm pockets and 11 in pockets of unknown span → **FAILED**. Yet a reading where the unknown pockets hold the median and hide the giants gives 11 of 21 within.
>    - **Unknown spans, pass side:** 3 eligible carriers, 4 unknown-span giants and 5 small-pocket carriers → passes. The boss's rule with the unknown pockets counted is past.
>    - State the scope.
>
> 4. **In mixed cavities the hidden-crystal cost covers the whole fleet.** Seven galena runs in eligible 25 mm pockets (short of q90): the code and the boss's rule fail 0.3 %, a cavity that hid nothing 40 / 85 / 98 %. §1.3:320 says "never fail … there", and the sixth line (scoreboard:403) tests only the scenario's single span. State this for WP9.
>
> 5. **Labels.**
>    - "may be oversize" is chosen by `unsettled > 0` (lib:976), not by whether every reading is past. A fleet with 2 carriers and 4 giants plus 1 small-pocket carrier is past in every reading and open only on noise, yet labelled "may be".
>    - The WP1_OPENS and NEVER_CARRY labels (lib:1005, :1013) still mention only crystal readings, not pocket readings.
>
> 6. **Figures and nits.**
>    - PROPOSAL:427 says the sd 0.3 galena fleet is met in 99 %. 30,000 fleets give 97.9 %.
>    - PROPOSAL:469 says the tests pin 210 seeds for records of seventeen. They do not.
>    - The "copies" of Deccan at test.ts:1193/1272 differ from the committed targets: apophyllite's q90 is 40 (committed 84.6), and the apophyllite and stilbite bands are swapped. The §4 cases still hold on the committed targets.
>    - The commit message has a typo: "only differs only".
>
> **Verified and correct**
> - **State:**
>   - The tree was clean at 3b201c9e before and after, and the .local-evidence hashes are unchanged.
>   - Nothing under js/ or data/ changed in the nineteen commits.
>   - The comparison tool was last changed in afbe687f, and it runs.
> - **Checks:**
>   - The size evidence runs, and the targets match a rebuild.
>   - All 13/13 scoreboard and 2/2 substrate splice blocks match.
>   - Tests pass 131/131, and my scratch mirror also gets 131/131.
> - **Round-16 responses, rerun on the committed targets:**
>   - Cerussite 21 × 40 mm fails. Smithsonite (20 carriers + 1 × 500 mm) is met.
>   - Naica is open ("11 of 11 … 5").
>   - NP galena at 27.2004 mm is reported OVERSIZE.
>   - Deccan calcite and stilbite are open; with only the eligible pockets voting, calcite fails and stilbite is met.
>   - Herkimer is open.
>   - S2 and S3 hold.
> - **Figures reproduce:**
>   - Galena sweep: median rule fails 39–40 / 84 / 98 %; lower third fails 3.6 / 26 / 56–58 %; met 4 / 0.1 / 0 %.
>   - Correct fleets at 21 seeds fail 6.2 % (five crystals), 4.5 % (six) and 0.5 % (seventeen).
> - **Bounds:** with every span known, the every-pocket reading is always the more favourable for the fail (proved). Nothing with more giants than carriers in the eligible pockets is met.
> - **Mutants:** 30 on the new code, 27 killed. The survivors:
>   - two are cosmetic or equivalent;
>   - the third is a pre-existing gap: the reported verdict's median over `fitting` survives, because no test mixes eligible and beyond runs.
> - **Parser and joins:** 18 random crystal lengths are all correct. The longest-gap joins (Mogok 5×5×4.8 mm, Deccan 159×100×47 mm) follow the registered three-dimension rule and look like one specimen.
> - **Earlier routes:** the cavity, dust, proxy, unclassed and rounding routes stay closed.
>
> **Ready for the boss?** Not yet. Fix MUST-FIX 1 (one line, plus test.ts:464), or state its cost with these figures and put it to the boss. Correct the response's §1.3 claim and the hedge's attribution. The rest is text.

### The response

The score rose (7.5 → 8). I took the reviewer's fix for the must-fix: in a pocket too small for a crystal target's characteristic crystal, that crystal is read at its own length in both readings. A cavity that hid nothing reads it so, and the boss's rule leaves the pocket out, so the at-span reading was the incoherent combination the reviewer named. A proxy's pocket short of its median keeps both readings, because the protagonist's own crystal, smaller than the proxy, may fit it.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | pockets just short of a crystal target's median switched off the oversize fail: a giant hidden there voted within | `assessSize` reads a crystal target's crystal in a pocket where `fits` is false at its own length in both readings (the reviewer's one-line fix). test.ts:464 and :466 now pin that reading. The round-16 response argued that with every span known the every reading is always the more favourable for the fail. That no longer holds: the pockets it adds can now hold giants at their length, so the fail's choice of the more favourable reading now matters. The lib's comment says so. | Committed targets. Tsumeb's cerussite at 40 mm in every run, 7 runs in 25 mm pockets: open before, now failed ("14 of the 14 runs that vote, with the 7 … read in its favour"). Deccan's calcite at 60 mm, 7 runs in 20 mm pockets: open before, now failed. NP galena, lognormal sd 0.6, 2,000 fleets per cell, k of 21 runs in 19 mm pockets, k = 0 / 3 / 7 / 10 at medians of 30 / 40 / 50 mm: the size test now fails exactly the fleets both anchors fail in all 12 cells. At k = 7 it had failed 0.1 / 0.3 / 0.4 %, where both anchors fail 22 / 63 / 89 %. A test pins k = 3 and 7 at 40 mm (300 fleets each). Giants confined to such pockets, with carriers in the cavity, are held open and never failed; that is pinned too, and the every-reading-only mutant now dies there. Random search over 40,000 protagonists (two seeds, mixed known spans) found no fail where either anchor does not fail, and no pass where either does not pass. Census verdicts are unchanged (one span per scenario). |
| S1 | the hedge's attribution, and a false claim in the round-16 response | Rule 4, §1.3, WP1's bullets and target, `size_check`, `carrier_obligation`, the lib's comments and the generated WP1 line now name every-pocket counting as this proposal's hedge on the boss's rule, and list "which pockets vote" apart from "the crystals the evidence cannot settle". §1.3 gives the hedge's cost: carriers there can turn a fail into open, never into met. It restates round 15's case as what it was: those carriers had turned a fleet of giants into met. The round-16 response said "§1.3 and §4 now say … hedge … and give its cost", but only §4 did. That response stays as written; this note corrects it. | — |
| S2 | "such a crystal in place of absence never makes the target met" was false | The claim is now scoped to what the tests sweep: carriers in the small pockets, or crystals short of a proxy. The text also states the reviewer's case and why it is met. One more small-pocket carrier ties the giants there, and with no giant in the pockets that hold the crystal, both anchors would pass the fleet. | Rerun: 4 carriers in 100 mm pockets, with 7 giants and 2 carriers in 15 mm ones, is open. With 3 carriers there it is met. |
| S3 | the bounds hold only where eligibility is settled | §1.3, §4, `size_check` and the lib now give the bound claims' scope. They hold where every span is known and no proxy has pockets of more than one span short of its median, which is every scenario today. A span not known, or a proxy's own crystal median (which only the proxy bounds), could make some pockets eligible and not others. | All three of the reviewer's cases are latent. |
| S4 | in mixed cavities the hidden-crystal cost covers the whole fleet | §1.3 and §4 state this for WP9. The sixth line is described as judged on the scenario's one span; WP9 would judge each run's. | NP galena with 7 of 21 runs in 25 mm pockets, which hold its median but not its q90: the size test and the boss's rule fail 0.1 / 0.3 / 0.4 % of fleets at 30 / 40 / 50 mm, and a cavity that hid nothing fails 41 / 85 / 98 % (2,000 fleets each). |
| S5 | labels | "Oversize within noise" now means past the range in every reading; "may be oversize" means past it in some reading but not in every one. The cause labels name both kinds of reading. The reviewer's case is labelled within noise, and a test pins it. Two expectations moved: a synthetic display past in every reading, and Naica's selenite. The selenite's 6 giants are its typical crystal in every reading, so it is now an oversize within noise ("6 of the 11 runs that vote, with the 5 … read in its favour"). | — |
| S6 | figures and nits | §1.3's sd 0.3 galena is met in 98 % of 30,000 fleets (99 % had been stated), and the test comment now agrees. §1.3 says which rows the tests pin: 21 seeds for records of five and seventeen, 210 seeds for five. The tests' "copies" of Deccan, Tsumeb and Naica now match the committed targets exactly, including bands and story frequencies. Under the committed bands the stilbite sweep's same-band check uses AB, and one share message reads 0.299. The North Pennines fixtures take the committed q10s. The commit message's "only differs only" stays in the history. | — |

The reviewer's surviving mutant, the reported verdict's median taken over every fitting run, now dies: a test mixes eligible runs with runs the cavity hides.

Mutation testing: 33 mutants on round 16's and round 17's code, all killed by the tests, the splice check or the targets check (31 at first: which reading the may-be label quotes when both are past, and a proxy's crystal in its range hidden below the proxy's, were unpinned; two cases now pin them). They covered round 17's reading (reverted, extended to proxies, in its favour only), the label (within noise only where nothing is unsettled, where the every reading alone or either reading is past, quoting the reading against it), the two pocket readings, the fail's reading (eligible only, every only, the less favourable, at one half itself), the open gate, the crystal readings, the medians (the display median rounded, a median at q90 past, the reported verdict rounded or over every fitting run), the unsettled count, two labels, the sixth line and the rule text.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 132 (was 131).

## Round 18 — 8.5/10 (on 8716bd04)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> Round 17's fix is correct on its own cases, and every stated figure reproduces exactly. But the every-pocket reading still mixes the two anchors. Round 17 removed the mix inside a single pocket; it now happens across pockets, and the code calls the result "within noise" for fleets that both anchors fail beyond noise. I edited nothing in the repository. Scratch files are in `review18\`.
>
> **MUST-FIX**
>
> 1. **With mixed cavities, the every-pocket reading holds open fleets that both anchors fail beyond noise, and labels them "oversize within noise".**
>    - **Where:** lib:673 and lib:683. `every = read(occurring)` reads a hidden giant in a pocket that holds the median at the span, while the pockets too small for the median vote at their length. The fail and the label are at lib:980–985; test.ts:464 pins this mixed reading. Text: PROPOSAL:317–341, §4:1633–1648, `size_check`.
>    - **Evidence (committed North Pennines galena):**
>      - Fleet: 5 carriers of 18.5 mm in 19 mm pockets, 3 × 40 mm in 25 mm pockets (hold the median, not q90), 13 × 40 mm in the 91.93 mm cavity.
>      - A cavity that hid nothing: 5 of 21 within, top 0.451 → fails. The boss's rule: 3 of 16 within, top 0.430 → fails.
>      - WP1 says: "galena oversize within noise: past its display range in 13 of the 21 runs that vote, with the 8 … read in its favour". Tsumeb's cerussite behaves the same way.
>      - Lognormal sweep (sd 0.6, 2,000 fleets, 5 runs in 19 mm pockets + 2 in 25 mm): both anchors fail 7.3 / 34.8 / 70.3 % at 30 / 40 / 50 mm; the size test fails 6.4 / 32.6 / 69.5 %. That is 18 / 43 / 16 fleets held open, every one labelled "within noise".
>      - A targeted search held open 73 of the 10,835 fleets both anchors fail.
>    - **Why it is wrong:** the pockets that hold the median get the boss's at-span reading, while the pockets that cannot hold it are counted as a cavity that hid nothing would count them. Neither anchor reads the fleet that way. It is round 17's argument applied across pockets instead of within one. The cost is stated nowhere, and the label is false for these fleets.
>    - **Fix:** for a crystal target, read every crystal at its own length in the every reading: `read(rs, whole)` with `(!proxy && (whole || fits(r.span, target) === false))`. On a scratch copy:
>      - 131/132 tests pass; only test.ts:464 fails, and it pins the mixed reading.
>      - The scoreboard output is byte-identical and 13/13 blocks match (one span per scenario).
>      - The gap drops from 73 to 0, with still no fail or pass outside the anchors in 80,000 random protagonists. The size test becomes exactly "both anchors" for crystal targets with known spans.
>      - Proxies keep the current reading: their every reading is already the boss's rule with the short pocket counted.
>      - Have the messages quote both anchors' counts.
>    - Or keep the reading, state this cost, and label these cases "may be oversize".
>
> **SHOULD-FIX**
>
> 1. **The message endings misdescribe the votes** (lib:981, :985).
>    - "with the N that could be read either way read in its favour" includes crystal-target crystals in pockets too small for the median. Since round 17 those vote at their own length in the every reading.
>    - Example: galena with 1 carrier + 3 giants in the cavity and 5 carriers + 3 giants in 19 mm pockets reads "within noise: … 6 of the 12 …, with the 8 … read in its favour". Three of those 8 vote past.
>    - The "may be" ending "read against it" also lumps together carriers and giants that are simply left out.
> 2. **A label branch has no test.** My mutant `every.least.past && eligible.least.past` → `favour.past` passes all 132 tests. Case: 2 giants in the cavity, 26 carriers and 22 giants in 19 mm pockets. The code says "may be"; the mutant says "within noise". Add this case.
> 3. **Text and code left stale by round 17 (no census case today):**
>    - lib:645–647 still says a crystal target's crystal can be read at a span "below it, where a crystal target's is an accessory". The branches at lib:675–676 are now unreachable for crystal targets.
>    - The sixth line (scoreboard:403, "which WP1 reads both ways") and §1.3:330–332 ("Read at the span…") explain why WP1 can never fail these protagonists as oversize by the at-span reading. A crystal target in a cavity short of its median is now read at its length, and cannot fail only because no pocket is eligible.
> 4. **WP9's section (PROPOSAL:1555–1592) does not state the mixed-cavity costs, and one cost is unstated anywhere.** Pockets short of the median take giants out of the boss's count: the galena at 40 mm fails 85 % with none of them, 77 / 63 / 52 % with 3 / 7 / 10 such runs. §1.3 gives only the 63 %.
> 5. **"The tests pin the 21-seed figures for records of five"** (PROPOSAL:488). The floors-against-five 21-seed row (9 / 12 %) has no test, and the pins are bounds (MID5.fail < 0.1 against a stated 6.8 %). Say "bound".
>
> **Verified and correct**
> - **State:**
>   - HEAD is 8716bd04, and the tree was clean before and after. The .local-evidence hashes are unchanged.
>   - Nothing under js/ or data/ changed in f49c1804^..HEAD.
>   - The comparison tool was last changed in afbe687f; it runs and gives identical output.
> - **Checks:**
>   - The size evidence runs, and the targets `--check` matches a rebuild.
>   - All 13/13 scoreboard and 2/2 substrate splice blocks match.
>   - Tests pass 132/132, and my scratch harness also gets 132/132.
> - **Round 17's responses hold:**
>   - M1: Tsumeb's cerussite fails ("14 of the 14…"), and so does Deccan's calcite with 7 runs in 20 mm pockets.
>   - Giants confined to too-small pockets are held open, never failed.
>   - The galena sweep at k = 0/3/7/10 and 30/40/50 mm: the size test equals both anchors in all 12 cells. With seed 29 it reproduces the commit's table exactly (21.8/62.6/89.0 and 30.9/76.6/95.5).
>   - S1: the hedge is attributed everywhere it should be.
>   - S2: the claim is scoped, and the round-17 tie reproduces.
>   - S3: the stated scope is sufficient. Multiple short spans for a proxy can break only the pass side.
>   - S4: 0.1/0.3/0.4 % against 40.9/84.9/98.3 % reproduces.
>   - S5: the labels hold for Naica and for the galena 2 + 4 + 1 case.
>   - S6: sd 0.3 is met in 97.9 % of 30,000 fleets. The tests' copies of Deccan, Tsumeb, Naica, North Pennines and Herkimer equal the committed targets, bands and frequencies.
> - **Bounds:** no fail or pass outside the two anchors in 2 × 40,000 random protagonists, within the stated scope.
> - **Earlier routes:** the cavity, dust, proxy, unclassed and hidden-proxy routes stay closed and are pinned.
> - **Mutants:** 25 of my own on round 16's and 17's code. 23 were killed, 1 is equivalent (`fits !== true`), and 1 survives on the label (SHOULD-FIX 2).
> - **Parser and joins:** 22 random crystal lengths and 12 joins, checked against the raw capture, are all correct.
> - **Thresholds and attribution:** round 17 adds no new threshold (it uses the registered median eligibility), and each choice is attributed correctly.
> - **Acceptance items:** all present.
>
> **Ready for the boss?** Not yet. Fix MUST-FIX 1 (one line, plus test.ts:464 and the messages), or state its cost and relabel those cases. The rest is text and one test.

### The response

The score rose again (8 → 8.5). I took the reviewer's fix: for a crystal target, every pocket's reading takes each crystal at its own length. That reading is then the cavity that hid nothing, and the eligible reading is the boss's rule. For a crystal target with every span known the size test is exactly the two anchors: failed where both fail, passed where both pass, open otherwise. The bound test now asserts that. A proxy keeps its readings. Its every-pocket reading is the boss's rule with the pockets short of its median counted, since the protagonist's own crystal may fit them.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | with mixed cavities the every-pocket reading mixed the anchors across pockets, holding open, as "within noise", fleets both anchors fail | `assessSize`'s `read` takes `whole`. In every pocket's reading, a crystal target's crystal is read at its own length. That covers round 17's clause for pockets too small for the median, so the clause is gone. The eligible reading is unchanged. The messages now quote both readings' counts (S1). The test's 45 mm case now pins every pocket at its length and the eligible pockets both ways. | NP galena (committed target): 5 carriers of 18.5 mm in 19 mm pockets, 3 × 40 mm in 25 mm ones, 13 × 40 mm in its cavity. It was "within noise"; it now fails ("16 of the 21 runs that vote in every pocket, and in 13 of the 16 runs that vote in the pockets that hold its median, read in its favour"). Lognormal fleets with 5 runs in 19 mm pockets and 2 in 25 mm, 2,000 per median: the size test now fails exactly the fleets both anchors fail, 7.3 / 34.8 / 70.3 % at 30 / 40 / 50 mm. Before, 18 / 43 / 16 of those fleets were held open. A test pins 300 of them at 40 mm. Random search over 40,000 protagonists found no violation of either bound. Among crystal targets, no fleet that both anchors fail is held open (there had been 7). Among proxies, 67 of 16,154 are held open: the proxy hedge, since the protagonist's own crystal may fit a pocket short of the proxy's median. The bound test now asserts the exact verdict for every crystal target among its 3,000. The census is unchanged (one span per scenario); in the generated blocks only two lines' wording moved. |
| S1 | the message endings misdescribed the votes | Each oversize message now names its pockets. Where the two readings differ it quotes both: "past its display range in A of the N runs that vote in every pocket, and in B of the M runs that vote in the pockets that hold its median". It adds ", read in its favour" or ", read against it" where the crystals the evidence cannot settle change a count. A "may be" message quotes the reading against it and the reading in its favour, and says so where no pocket holds the median. "With the U that could be read either way" is gone. | 24 expectations moved. Each was read against its case. |
| S2 | a label branch had no test | The reviewer's case is now a test: 2 giants in the pockets that hold the median, and 26 carriers and 22 giants in 19 mm ones. The favoured reading is past and the every reading is not, so it is "may be oversize". The favoured-reading mutant dies. | — |
| S3 | stale text and unreachable branches | The lib's doc no longer says a crystal target's crystal is read at a span below the range. The two branches that only a proxy's crystal reaches are labelled so, and the unneeded `if (proxy)` is gone. The sixth line and §1.3 now say why WP1 cannot fail those protagonists: where the cavity holds the median, the boss's rule reads a hidden crystal at the span; where it does not, the boss's rule judges nothing. | — |
| S4 | WP9 did not state the mixed-cavity costs | WP9 now has "What it does to WP1's size test", and §1.3 and §4 give both costs. Pockets that hold the median but not q90 shield the fleet: with 7 of 21 galena runs in 25 mm pockets, the size test fails 0.1 / 0.3 / 0.4 % where a cavity that hid nothing fails 41 / 85 / 98 %. Pockets short of the median take their giants out of the boss's count: at 40 mm, 85 % of fleets fail with none of them, and 77 / 63 / 52 % with 3 / 7 / 10 runs in 19 mm pockets. | Rerun on the round-18 code: unchanged. |
| S5 | "the tests pin" overstated | §1.3 now says the tests bound some of the figures. At 21 seeds: the middle of the bands for records of five and seventeen, and the floors for seventeen. At 210 seeds: both rows for five. | — |

Mutation testing: 40 mutants on rounds 16–18's code, 39 killed by the tests, the splice check or the targets check. They covered round 18's reading (rounds 16's and 17's back, a proxy's every pocket at its length, a crystal target's eligible pockets at its length, the every reading called as the eligible one), the messages (never one count, readings alike on their voters alone, the second count's pockets named, either reading quoted first, one reading only in a fail, no word for an empty eligible reading, the way each count reads left out), the label, the two pocket readings, the fail's reading, the open gate, the crystal readings, the medians, the unsettled count, the cause label, the sixth line and the rule text. The survivor, one count where only the favourable readings agree, is equivalent. Two readings with the same number of voters in their favourable reading count the same crystals: each crystal votes there unless it is a crystal target's accessory, which votes in neither. For a proxy the two readings are then the same. For a crystal target, equal counts within the range there mean no crystal is hidden past the range in a pocket that holds the median, so the readings against it agree too.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 133 (was 132).

## Round 19 — 8/10 (on dfd7758c)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> Round 18's must-fix is fixed correctly, and the exactness claim it makes holds. No earlier round's finding has reopened. This round found two new must-fixes and three should-fixes. Both must-fixes only matter once WP9 gives fleets cavities of different sizes; no census case today. I edited nothing in the repo; the tree is clean at dfd7758c and the .local-evidence hashes are unchanged. Scratch files are in `review19\`.
>
> **MUST-FIX**
>
> 1. **For a proxy, every pocket short of its median switches off the oversize fail (a "shield"). This cost is stated nowhere, and the texts describe the reading wrongly.**
>    - **Where (code):** lib:675–678. In a proxy's every-pocket reading, a hidden giant is read at the span.
>    - **Where (texts):** lib:647–652, :928–930; PROPOSAL:319–330 ("Every pocket is counted too, read as a cavity that hid nothing would read it … a proxy's as the boss's rule reads them"; "it keeps giants in pockets too small … from going unjudged"), :433, :1647–1648; the generated WP1 line (scoreboard.mjs:531 → PROPOSAL:1197); `size_check` (targets.mjs:75).
>    - **Costs stated:** WP9's new paragraph (PROPOSAL:1582–1589) and §4:1673–1681 cost crystal targets only. REVIEW:2008 sizes the proxy hedge as "67 of 16,154".
>    - **Why it happens:** a proxy's giant is always longer than a pocket short of its median. There it votes within in the favourable every-pocket reading (in the range, or short of the proxy). With 7 such runs of 21, the Wilson top is 0.546, so the fail is unreachable.
>    - **Case (Deccan stilbite, committed proxy copy):** 21 crystals of 1 m in a 300 mm cavity → failed. Move 7 of them into 45 mm pockets → "stilbite oversize within noise: … 14 of the 21 runs that vote in every pocket, read in its favour, and in 14 of the 14…". The share is also open: "if its 7 runs longer than the cavity carry it". Both a cavity that hid nothing and the boss's rule at the proxy median fail it.
>    - **Sweep (lognormal sd 0.6, 2,000 fleets, seed 29), 7 of 21 runs in 45 or 64.6 mm pockets:**
>      - WP1 fails 0.0 % at 2× and 3× the proxy median, where both anchors fail 14.4 % and 85.3 % (289 and 1,707 fleets held open).
>      - With 3 or 5 such runs, at 3×: WP1 fails 70.0 % and 26.5 %, against 86.5 % and 91.3 %.
>      - Tsumeb smithsonite gives identical figures; Naica selenite fails 0 % against 37.5 %.
>    - **Not new:** 8716bd04 behaves identically.
>    - **Why it matters:** for a crystal target only pockets between its median and q90 shield; for a proxy every small pocket does. 55 of 112 protagonist slots are proxies.
>    - **Fix:** state this beside the at-span cost in WP9, §1.3 and §4, with these figures. Stop calling a proxy's every-pocket reading "a cavity that hid nothing". Correct REVIEW:2008. Offer the boss the alternative (read a proxy's crystal hidden in a pocket short of its median at its own length) with its cost.
>
> 2. **A crystal target's crystal past q90, in a pocket whose span is below q25, counts as a run it "could still carry", though neither reading carries it.**
>    - **Where:** lib:727 (`runStory`: any length/span disagreement → `beyond` → POSSIBLE); lib:1005 (`could` = short + beyond). Registered as "different sides … could still carry" at PROPOSAL:307–309 and in `carrier_obligation` (targets.mjs:78).
>    - **Why it is wrong:** at the span the crystal is an accessory; at its length it is oversize. Under the proposal's own premise (length or span), sides (below, past) give no carrying reading.
>    - **Case (North Pennines galena copy):** 14 dust runs (8.6 mm) in the 91.93 mm cavity, and 7 runs at 40 mm in 17.5 mm pockets. Those pockets are scored (they hold fluorite's 17 mm median) but are below galena's 18 mm q25.
>      - WP1 is open: "may be oversize…" and "could still reach its share 0.2167 if its 7 runs longer than the cavity carry it".
>      - With the giants in the cavity instead, it fails.
>      - Both anchors fail the share: 0 carried, none could carry.
>    - **Second case (Tsumeb cerussite copy):** dust in 80 mm pockets and 60 mm crystals in 20 mm pockets → the same result.
>    - **Effect:** moving giants into pockets below q25 turns a fail into open, both on the share (the boss's "if it never does") and on the story (the run becomes POSSIBLE). Proxies are handled correctly here.
>    - **Fix:** in `runStory`, treat (span below q25, length past q90) for a crystal target as not carrying and not POSSIBLE. Restate the rule texts, and add a test with a pocket below q25.
>
> **SHOULD-FIX**
>
> 1. **Round 18's messages misdescribe the readings (lib:982–995).**
>    - (a) "none of its pockets holds its median" fires when no crystal that votes sits in such pockets. Both must-fix-2 cases print it, though 14 runs sit in pockets that hold the median, as dust.
>    - (b) In one cavity that holds the median, the two readings differ only in how hidden crystals are read, yet the message contrasts sets of pockets. Herkimer in its own 59.94 mm cavity (WP1's first target) prints "16 of the 21 runs that vote in every pocket, and in 0 of the 21 runs that vote in the pockets that hold its median" — the same 21 pockets (test.ts:1181, 1185, 1203). Round 17 printed "16 of the 21 … read against it".
>    - (c) REVIEW:2009 says a "may be" message says so where no pocket holds the median. Deccan's stilbite in its 66.41 mm cavity gets no such clause (test.ts:1370).
>    - **Fix:** count pockets, not voters, and name what actually differs between the readings. Add negative tests: the mutant `d[short].least.n` → `.most.n` survives.
> 2. **Misattribution.** "The boss's rule reads a crystal it hides at the span" appears in the sixth line (scoreboard.mjs:398–405 → PROPOSAL:630), in §1.3:337–340, and in WP9:1584 ("the boss's reading"). Reading a hidden crystal at the span is this proposal's premise (§1.3:302–310), which §4:1641–1645 and :1673 correctly list as this proposal's choice.
> 3. **Minor.**
>    - lib:645–647 and `size_check` say a proxy's hidden crystal can be read "below" the range in an eligible pocket. That is impossible: the span is at least the median, which is at least q25.
>    - `unsettled` (lib:684) is now used by nothing.
>    - Two stated figures have no test: the WP9 shield figure (0.1–0.4 %) and the 10-run row.
>
> **Verified correct**
>
> - **Round-18 responses that hold:**
>   - M1: the round-18 case fails with the stated message.
>   - The sweep matches both anchors exactly (7.3 / 34.8 / 70.3 %, none held open). The round-17 library held open 18 / 43 / 16.
>   - My own search of 40,000 protagonists, with ties at q25, q90, the median and the span, 1–3 spans per fleet, and unknown spans: crystal targets have 0 exactness violations; proxies have no fail or pass outside the anchors where eligibility is settled (46 of 16,030 held open).
>   - The proof that the surviving mutant is equivalent is correct.
>   - S2's test kills the label mutant.
>   - S4's figures reproduce exactly with seed 29 (0.1 / 0.3 / 0.4 vs 40.9 / 84.9 / 98.3; 84.9 / 76.6 / 62.6 / 51.5) and within about 2 points on other seeds. Round 16's 0.3 vs 62.6 reproduces too.
>   - S3 and S5 are done.
>   - Only two generated lines changed, in wording only.
> - **Correct-fleet table, spot-checked on an independent seed (2,000 fleets):** 71.8 / 0.4, 48.9 / 6.8 and 8.8 / 12.8, against the stated 71 / 0.3, 49 / 6.8 and 9 / 12.
> - **Checks:**
>   - Tests: 133 / 133, and 133 / 133 on my scratch harness.
>   - The size evidence runs; the targets match a rebuild.
>   - Splice blocks match: 13 / 13 scoreboard, 2 / 2 substrate.
>   - The comparison tool is unchanged since afbe687f and its output is byte-identical.
>   - Nothing under js/ or data/ changed from f49c1804^ to HEAD.
>   - The WP1 tallies match showcase.json.
> - **Mutants:** 47 of my own; 44 killed. The survivors are the round-18 one (equivalent), `>` → `>=` in `lengthAndSpanAgree` (equivalent), and the message mutant in should-fix 1.
> - **Earlier rounds' routes stay closed:** the cavity routes, dust, proxy short, unclassed pockets, the hidden proxy, and pockets too small for the median.
> - **Parser and joins:** 30 random statements and 14 joins are correct, and the crystal rows behind all 11 crystal targets read clean.
> - **Copies:** the tests' copies of the targets equal the committed ones.
>
> **Ready for the boss?** Not yet. First state the proxy shield (must-fix 1) and close the could-carry route for (span below q25, length past q90) (must-fix 2); the rest is wording in messages and text.

### The response

The score fell (8.5 → 8). Both must-fixes are in code older than round 18, and round 18's fix holds. With the score falling, I kept the changes narrow. The could-carry route is closed in `runStory`. The proxy shield is a cost of this proposal's hedge for proxies, not a slip in the code, so it is stated with its figures and put to the boss beside the other way, not redesigned.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | for a proxy, every pocket short of its median switches off the oversize fail; the cost was stated nowhere, and the texts called that reading "a cavity that hid nothing" | **Kept:** a proxy's every-pocket reading is the boss's rule with its pockets short of its median counted, because the protagonist's own crystal, which the proxy only bounds, may fit them. That reading therefore takes a crystal hidden there at the span. **Stated:** §1.3, WP9, §4, `size_check`, the lib's doc and the WP1 line now say this and give the shield's figures. None of them calls that reading a cavity that hid nothing. **Put to the boss:** §4 offers the other way: read a proxy's crystal hidden in such a pocket at its own length, as for a crystal target, which makes a proxy's size test the two anchors exactly. Its cost is that it would fail those fleets even where the protagonist's own crystal fits the pockets and the span is the one to judge. **Correction:** the round-18 response sized the proxy hedge by a random search ("67 of 16,154"). That counted random fleets; the sweep below shows the shield can hold every fleet open. A test pins the case and the sweep as a stated cost. | **Case:** Deccan's stilbite (committed target), 21 crystals at 1 m in 300 mm, fails. With 7 runs in 45 mm pockets it is open ("oversize within noise"). **Sweep** (lognormal sd 0.6, 2,000 fleets), 7 of 21 runs in 45 mm pockets: none failed at two and three times the proxy's median, where both anchors fail 14.4 and 85.3 %. With 3 and 5 such runs at three times: 70.0 and 26.5 %, against 86.5 and 91.3 %. 64.6 mm pockets give the same, and so does Tsumeb's smithsonite. Naica's selenite: none, against 37.5 %. At the proxy's own median, none fail either way. |
| M2 | a crystal target's crystal below its range on the span and past it on its length counted as a run it could still carry | `runStory`: such a crystal carries in neither reading. It is an accessory at the span and oversize at its length, so it is now 'oversize' and the run is NO, not POSSIBLE. A proxy's crystal, short of the proxy on the span, could still carry, as before. §1.3, §4, WP1's share bullet and target, `carrier_obligation` and the lib's doc now say so. | NP galena copy, 14 dust runs in its cavity and 7 × 40 mm in 17.5 mm pockets: its share now fails ("0 of 21 scored runs, below its share 0.2167"), as both readings would; before, it was open. Tsumeb's cerussite, dust in 80 mm pockets and 60 mm crystals in 20 mm ones: the same. Tests pin `runStory`'s four geometries, the q90 boundary, and the galena case. The census is unchanged. |
| S1 | the messages misdescribed the readings | `display.held` (the protagonist's runs in pockets that hold its median) replaces the unused `unsettled`. The messages now say: **(a)** where no pocket holds the median: "; none of its pockets holds its median", whatever the readings; **(b)** where some do but none of its crystals there is at display scale: "none at its display scale in the H runs in pockets that hold its median"; **(c)** where the same runs vote in both readings (a crystal target with every pocket holding its median): "at their own length" and "read in its favour", not a contrast of pockets. Herkimer now reads "16 of the 21 runs that vote at their own length, and in 0 of the 21, read in its favour". The reviewer's surviving mutant (`least.n` → `most.n`) is equivalent. A reading's favourable count holds every crystal its other count does, and a reading of only proxy shorts is never the one quoted: its favourable count has no crystal past the range, and its other count has none at all. | 8 expectations moved; the galena case pins the new clause. |
| S2 | the at-span reading attributed to the boss | The sixth line, §1.3 and WP9 now say the boss's rule counts such a pocket, and this proposal's premise reads a crystal hidden there at the span. | — |
| S3 | minor | The lib's doc and `size_check` no longer say a hidden crystal can be read below the range in an eligible pocket. `unsettled` is gone. A test bounds the WP9 shield: with 7 runs in 25 mm pockets, under 1 % of 300 fleets fail, against 85 % for a cavity that hid nothing. The round-17 sweep now pins 10 runs too. | — |

Mutation testing: 42 mutants on rounds 16–19's code, 40 killed by the tests, the splice check or the targets check. They covered round 19's could-carry rule (reverted; a proxy's crystal treated as a crystal target's; a crystal exactly at q90 counted past it; the span in the range no longer enough), the messages and `held` (held over every occurring run; never, or always, the same runs; the same runs named as pockets; the second count naming its runs; no word for runs with no crystal at display scale; the empty test on the other reading; never saying no pocket holds the median; the empty eligible reading quoted anyway; never one count; readings alike on their voters alone; either reading quoted first; the way each count reads left out), and rounds 16–18's readings, label, gates, crystal readings, medians, cause label, sixth line and rule text. Both survivors are equivalent. One is round 18's (one count where only the favourable readings agree). The other is the reviewer's (`least.n` → `most.n`): a reading's favourable count holds every crystal its other count does, and a reading of only proxy shorts is never the one quoted. A clause that could never decide anything (`|| !d.held` where a fail needs the eligible pockets' reading) was cut rather than kept.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. Tests 134 (was 133).

## Round 20 — 8.5/10 (on ba0cb2e2)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> ba0cb2e2's code is correct, and I found no new oversize or could-carry route. What remains is text: one false claim in the option §4 puts to the boss, and several smaller wording and test gaps. I edited nothing in the repository. The tree is clean at ba0cb2e2, and the .local-evidence hashes are the same before and after. Scratch files are in `review20\`.
>
> **MUST-FIX**
>
> 1. **§4 describes "the other way" for a proxy wrongly, and its exactness claim is false as worded.**
>    - **Where:** PROPOSAL:1684–1688; the same wording is in REVIEW:2099 and the commit message.
>    - **The claim:** "reading a crystal hidden in such a pocket [short of its median] at its own length, as for a crystal target — would make its size test the two anchors exactly".
>    - **Why it fails:** that narrow reading still reads giants hidden in pockets that hold the median but not q90 at the span. It then counts them beside the pockets short of the median, read at length. That is round 18's mix across pockets, now for proxies.
>    - **Evidence (stilbite copy):** 5 × 1000 mm in 100 mm pockets, 15 × 1000 mm in 300 mm, and 3 × 60 mm in 65 mm pockets.
>      - Both anchors fail it: a cavity that hid nothing has 3 of 23 within; the boss's rule has 5 of 20.
>      - The narrow other way holds it open (8 of 23, top 0.551).
>      - In lognormal sweeps it holds open 7 of 175 and 3 of 597 such fleets that both anchors fail (`otherway2.mjs`).
>    - **The exact version:** reading every one of a proxy's crystals at its own length in the every-pocket reading (`whole` for proxies, as the crystal-target rule does) is exact. It had 0 violations in 60,000 of the tests' random proxy protagonists and passes the case above.
>    - **The tests cannot catch this:** the tests' own generator also finds 0 violations for the narrow version. A future "exact" test built on it would pass a non-exact implementation.
>    - **Fix:** reword the option to the whole version, or drop "exactly". If the boss adopts it, test with pockets between the median and q90 plus carriers in pockets short of the median.
>
> **SHOULD-FIX**
>
> 1. **The registered "could still carry" text no longer matches the code for proxies.**
>    - ba0cb2e2 added "and one of them is in it/the range". That excludes a proxy's crystal short of the proxy on the span and past q90 on its length.
>    - The code counts that crystal as `beyond`, a run it could still carry (lib:731; test `one(45, 1000, st)` gives POSSIBLE).
>    - Affected texts: `carrier_obligation` (targets.mjs:78, JSON:84), PROPOSAL:432–433, 474–475, 1258, and §4:1656–1659.
>    - §1.3:310–311 states the proxy case correctly.
>    - Also, §1.3:312–315 says a crystal past the cavity but within q90 "could still carry" where the span is below q25. That is wrong for a crystal target whose length also stays below q25: it is an accessory.
>
> 2. **The proxy-shield statement is incomplete.**
>    - **State the mechanism, not only the 45 mm sweep:** 7 of 21 runs (a third) in any pocket short of the median make the fail unreachable, at any crystal size and pocket size. Stilbite at 10× its median in 1 mm pockets fails 0 %, where both anchors fail 100 %.
>    - **The label:** these fleets are labelled "oversize within noise", yet the message itself shows the boss's rule failing them beyond noise ("14 of the 14"). Round 18 called that label false for crystal targets. Either relabel them "may be oversize", or say the noise there is the hedge's.
>    - **A misattribution survives:** test.ts:1378 still calls the at-span reading "the boss's reading of a crystal the cavity hides" (round 19's S2).
>
> 3. **Two non-equivalent message mutants survive all 134 tests.**
>    - `held: runs.filter(holds)` (lib:685). Galena as 10 giants in 19 mm pockets, absent from 11 runs in 91.93 mm pockets, then prints "none at its display scale in the 11 runs in pockets that hold its median". It never occurs there.
>    - `same` on the `most` readings (lib:992). A proxy with 14 × 1000 @ 300 mm and 7 × 40 @ 45 mm then prints "at their own length … and in 14 of the 14", though the two readings count different runs.
>    - Add both cases as tests (`survivors.mjs`).
>
> 4. **Nit:** with unknown spans, "; none of its pockets holds its median" (test.ts:1290) asserts something that is unknown. Better: "no pocket is known to hold its median".
>
> **The proxy shield, judged**
>
> Keeping it, stated and put to the boss, is acceptable: below a proxy's median, eligibility really is unknown. But I lean toward the corrected other way as the default:
> - The shield comes only from stacking two of this proposal's own hedges: counting pockets short of the median as eligible, and the at-span premise.
> - The boss's OPEN answer covers misses the runs cannot tell. Here both anchors tell them beyond noise.
> - A proxy is an upper bound on the crystal, so a crystal past its q90 is oversize all the more.
> - Reading a 1 m crystal at 45 mm runs against the spirit of "never silently rescale".
> - 55 of the 112 protagonist slots are proxies, and 22 proxy medians already exceed their scenario's span.
>
> None of this blocks; it is the boss's call.
>
> **Verified and correct**
>
> - **Checks:** the size evidence runs; targets `--check` matches a rebuild; 13/13 scoreboard and 2/2 substrate splice blocks match; tests pass 134/134 (my scratch harness also 134/134). The comparison tool is unchanged since afbe687f and its output is byte-identical. Nothing under js/ or data/ changed in the 22 commits.
> - **Census:** the round-18 lib (dfd7758c) and the round-19 lib give identical verdicts, counts and WP1 results in all 32 scored scenarios. No census run has round-19 M2's geometry; the only hidden protagonist is Bisbee's malachite, a proxy. WP1 is met 0/32, failed 16, open 16, as stated.
> - **M2 fix, complete in every geometry:**
>   - Crystal target, crystal longer than its pocket: carrier when the span and length are both in range; `beyond` when exactly one is; oversize or accessory when neither is (this pair is the only change).
>   - Proxy and unknown spans: unchanged.
>   - The fix makes nothing more lenient, including in unclassed pockets.
>   - NP galena and Tsumeb cerussite move from open to failed (top of the interval 0.2153 against 0.2167).
> - **Shield figures reproduce exactly:** 0.0/0.0 against 14.4/85.3; 70.0/26.5 against 86.5/91.3; 64.6 mm pockets the same; smithsonite within 0.2 points; selenite 0 against 37.5; 0 at the proxy's own median.
> - **Correct-fleet table, independent seed (4,000 fleets):** 71.6/0.6, 49.5/6.1, 60.5/2.2 and 8.8/11.8 %, against the stated 71/0.3, 49/6.8, 61/2.1 and 9/12.
> - **Messages:** 38,947 random oversize messages, checked against their readings, have 0 problems: the counts, the side words, `held`, both new clauses and the labels.
> - **Round-19 responses hold:** S1–S3 and M1's attribution, and the round-18 sizing correction. Both claimed-equivalent survivors (one count on the least readings only; `least.n` to `most.n`) are equivalent; I checked the proofs.
> - **Mutants:** 28 of my own. 22 killed; 3 equivalent; 1 artificial (could-carry below q25/2); the 2 above survive.
> - **Earlier routes stay closed:** rounds 11–19 (cavity, dust, proxy short, unclassed, hidden proxy, too-small pockets, cross-pocket mix), rerun on the committed targets.
> - **Parser and joins:** 28 random crystal rows and 16 joined captions, checked against the raw capture, are correct. One ambiguous row is cavansite, which has no engine. The apparent under-joins are transitive joins, different finds, or round sizes the rule deliberately leaves apart.
> - **Thresholds and attribution:** no new hidden threshold. Choices are attributed correctly apart from the test comment above.
> - **Acceptance items:** all present and honest.
>
> **Ready for the boss?** Not yet. Correct §4's other-way sentence (MUST-FIX 1, one sentence). The should-fixes are wording and two tests.

### The response

The score rose (8 → 8.5), and the reviewer found the code correct, with no new route. I corrected §4's other way and took the should-fixes.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | §4's other way for a proxy was worded as the narrow reading, which is not exact | §4 now offers the whole version: every one of a proxy's crystals is read at its own length in the every-pocket reading, as a crystal target's are. That version is exact. §4 also says why the narrow version is not: it mixes readings across pockets, as round 18 found for crystal targets. It names the test that adopting the whole version would need: pockets between the median and q90, beside carriers in pockets short of the median. The round-19 response and its commit message described the narrow version. This response corrects them; the archive and the history stay unedited. | **Reviewer's case** (stilbite: 5 × 1 m in 100 mm pockets, 15 × 1 m in 300 mm, 3 × 60 mm in 65 mm): both anchors fail it. On scratch libs, the narrow version holds it open and the whole version fails it. **Random search**, 30,000 proxy protagonists: the whole version differs from the two anchors in none, the narrow version in 9, and today's reading in 324; none falls outside the anchors' bounds. **Sweep:** the whole version fails 14.4 / 85.3 %, exactly what both anchors fail. |
| S1 | the could-carry text did not match the code for a proxy | "and one of them is in the range" now reads "and either could carry it (in the range, or, a proxy's, short of the proxy)". This is changed in `carrier_obligation`, WP1's share bullet and target, §1.3's open list and §4. §1.3's bullet on a crystal longer than the cavity is restated. Its sentence on a crystal past the cavity but within q90 was wrong for a crystal target whose length also stays below q25. It is cut, since the general rule now covers that case. | — |
| S2 | the shield statement was incomplete, the label hid whose noise it was, and a test comment misattributed the at-span reading | **Mechanism:** §1.3, WP9, §4, `size_check` and the lib now say that with a third of its runs in pockets short of its median (7 of 21), the reading most in its favour cannot fall below one half, whatever the size of the crystals or the pockets. **Origin:** §4 says the shield stacks two of this proposal's own hedges where both anchors tell the fleets beyond noise, and that the boss's OPEN answer covers only misses the runs cannot tell. **Label:** an oversize within noise now names the reading that alone would fail it beyond noise ("; beyond noise in the pockets that hold its median"), and WP1's bullet says so. **Attribution:** the test comment now attributes the at-span reading to this proposal's premise. **Default kept:** §4 puts the choice to the boss, which the reviewer accepts. | Stilbite at ten times its proxy's median, 7 runs in 1 mm pockets: failed in none of 2,000 fleets, where both anchors fail all of them. With 6 such runs: 98 % failed. Tests pin the 1 mm case and the label. |
| S3 | two message mutants survived | Two tests now pin the cases. The galena absent from the pockets that hold its median must read "; none of its pockets is known to hold its median", which `held` taken over all runs would miss. A proxy whose readings against it count alike, though its favourable readings do not, must name its pockets, which `same` taken on the readings against it would miss. | Both mutants now die. |
| S4 | "none of its pockets holds its median" asserted something unknown | It now reads "none of its pockets is known to hold its median". | — |

Mutation testing: 47 mutants on rounds 16–20's code, 45 killed by the tests, the splice check or the targets check. They covered the new within-noise clause (dropped, naming the other reading, at one half itself), the round-20 reviewer's two message mutants, round 19's could-carry rule, the messages and `held`, rounds 16–18's readings, label and gates, the crystal readings, the medians, the cause label, the sixth line and the rule text. The clause's one-half boundary was unpinned at first; a case now pins it, as the fail gate's is pinned (a reading whose interval tops at exactly one half is not beyond noise). The two survivors are the equivalent ones from rounds 18 and 19.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. No generated block changed. Tests 134 (unchanged; the new cases sit in existing tests).

## Round 21 — 8.5/10 (on 35fe4e1f)

One reviewer, under the standing rule (no cap on rounds; stop at 9/10 or when nothing must be fixed).

### The report

> 35fe4e1f's code is correct and every round-20 response holds. I found no new route that fails or meets a fleet wrongly. There is one must-fix, in the text the boss decides from: §4 describes only one of the two ways a proxy's default reading departs from the two anchors.
>
> I edited nothing in the repository. The tree is clean at 35fe4e1f and the .local-evidence hashes are the same before and after. Scratch files are in `review21\`.
>
> **MUST-FIX**
>
> 1. **The proxy hedge also holds open fleets that both anchors pass, and §4 never says so.**
>    - **Where (code):** lib:679. A proxy's crystal that is in its range on its length, but hidden by a pocket below the proxy's q25, gets no vote against it (at the span it is short of the proxy, so it counts as an accessory). A giant in such a pocket keeps its past vote (lib:677, :680).
>    - **Where (texts):** §4 PROPOSAL:1681–1697 costs the default by the shield alone and says the whole version "fails those fleets". The same one-sided account is in §1.3:333–335, WP9:1600–1601, `size_check` (targets.mjs:75), lib:650–654 and REVIEW:2190 ("today's reading in 324").
>    - **Random proxies** (the tests' generator, 30,000 each, seeds 47 and 5): the default departs from both anchors in 322 and 359 cases. Of those, 216 and 256 — about two-thirds — are open where both anchors pass. The whole version departs in none. (`e7-passside.mjs`)
>    - **Sweep** (`e8-passsweep.mjs`, `e9-wp1met.mjs`): Deccan's stilbite copy at its proxy median, sd 0.6, 2,000 fleets, 7 of 21 runs in 45 mm pockets.
>      - The size test passes 78.5 % of fleets under the default and 89.3 % under the whole version.
>      - 10.8 % of fleets are held open where both anchors pass.
>      - WP1 is met in 49.6 % against 50.5 %; the share's could-carry rule holds most of those fleets open anyway.
>    - **Concrete case** (`e10-case.mjs`): 7 carriers at 100 mm in 300 mm pockets, 6 at 100 mm in 45 mm pockets, 8 at 200 mm in 60 mm pockets, with apophyllite carrying.
>      - Both anchors pass.
>      - The default leaves WP1 open: "stilbite may be oversize: past its display range in 8 of the 15 runs that vote in every pocket, read against it, and in 0 of the 21, read in its favour".
>      - The whole version meets it.
>    - **Single giant:** 20 carriers hidden in 45 mm pockets plus one 1 m crystal gives "may be oversize: … 1 of the 1 runs that vote, read against it". That is the single-giant hold §4 lists as round 16's finding.
>    - **Fix:** state this beside the shield in §4, and briefly in §1.3, `size_check` and the lib, with these figures. Say the whole version passes these fleets as well. While editing, make "Its cost is…" (PROPOSAL:1693) and "adopting it" name the whole version; as written they follow the sentence about the narrow version.
>
> **SHOULD-FIX**
>
> 1. **§1.3 misnames what fails.** PROPOSAL:353 says "where both readings fail all of them". The every-pocket reading is the one that fails none — that is the shield. §4:1685 has it right: "both anchors".
> 2. **"A third" is stated without its run count** (lib:653; `size_check`, targets.mjs:75).
>    - It holds only up to about 35 runs: 12 of 36 tops at 0.497.
>    - At 210 runs a third tops at 0.40, and the shield needs 43 %; at 1,000 runs it needs 47 %. `noise_basis` itself discusses those fleet sizes.
>    - Anchor it with "(7 of 21)", as the proposal does, or say the share needed rises toward one half.
>    - At fewer occurrences, fewer pockets shield: 1 of 7 is enough.
> 3. **The new clause is only half pinned.**
>    - Every test names the eligible reading (test.ts:1286, 1391, 1399).
>    - Two mutants survive all 134 tests: `['every','eligible']` → `['eligible']`, and hard-coding " in the pockets that hold its median".
>    - Both other branches are reachable (`e5-clause.mjs`):
>      - galena, 11 crystals at 40 mm in 300 mm pockets and 10 in 25 mm pockets → "…; beyond noise at their own length";
>      - 8 in 19 mm, 7 in 300 mm and 6 in 25 mm → "…; beyond noise in every pocket".
>    - `d.held ?` → `d.held > 1 ?` (lib:1000) also survives.
>    - Pin all three.
> 4. **Nits:**
>    - `one ? [] :` at lib:1007 is dead code (an equivalent mutant).
>    - The whole version's exactness claim should carry "with every span known", as the crystal-target claim does.
>    - §4 should say that adopting the whole version flips the Naica and shield tests (test.ts:1286, 1391, 1395, 1399).
>    - `story_frequency_rule` (targets.mjs:77) and `storyVerdict`'s `why` (lib:799) omit crystals longer than the cavity as a cause of UNRESOLVED; the §2 legend includes them.
>
> **Verified and correct**
>
> - **Checks:**
>   - The size evidence runs, and targets `--check` matches a rebuild.
>   - Splice blocks match: 13/13 scoreboard, 2/2 substrate.
>   - The comparison tool is unchanged since afbe687f and its output is byte-identical.
>   - Tests pass 134/134 under vitest, and 134/134 in my own harness on a scratch copy of the lib.
>   - Nothing under js/ or data/ changed in f49c1804^..HEAD.
> - **M1:** the whole version reproduces.
>   - It fails 14.4 / 85.3 %, exactly what both anchors fail.
>   - It differs from the anchors in 0 of 60,000 random proxies, including unknown spans, ties and 1–3 spans per fleet.
>   - The narrow version differs in 10 and 5 (stated: 9); today's reading in 332 and 312 (stated: 324).
> - **S1:** I enumerated every length/span disagreement. `carrier_obligation`, WP1's texts, §1.3 and §4 match `runStory`.
> - **S2:** every figure reproduces exactly (seed 29).
>   - 7 of 21 tops at 0.546; 6 of 21 at 0.4996.
>   - At 10× in 1 mm pockets: 0 % against 100 %; with 6 runs, 98 %.
>   - With 3 and 5 runs: 70.0 / 26.5 % against 86.5 / 91.3 %.
>   - Smithsonite 0 % against 85.3 %; selenite 0 % against 37.5 %; at the proxy's own median, 0 % either way.
>   - The at-span reading is now attributed to this proposal.
> - **S3 and S4:** both of round 20's surviving mutants now die, and S4's wording is in.
> - **The new clause:**
>   - It names the right reading in all 1,472 random within-noise entries.
>   - Its boundary at one half is pinned.
> - **Exactness and bounds:**
>   - Crystal targets match both anchors exactly in 29,872 random protagonists (unknown spans, ties, mixed spans).
>   - Proxies never fall outside the anchors' bounds in 30,128.
> - **Mutants:** 46 of my own, 37 killed.
>   - All logic mutants die.
>   - 4 survivors are equivalent, including rounds 18's and 19's.
>   - 2 sit at exact Wilson equality on the old band and share noise gates.
>   - The other 3 are the message mutants in SHOULD-FIX 3.
> - **Earlier routes:** rounds 11–19's routes stay closed.
> - **Census:** verdicts are unchanged. WP1 is met 0/32, failed 16, open 16, with no oversize entry.
> - **Parser and joins:**
>   - 36 random crystal and aggregate rows checked against the raw capture: 35 are clean.
>   - One is ambiguous: "Er hat eine Größe…", credited to fluorite by the documented first-listed-mineral rule.
>   - 7 joins checked: all correct.
> - **Acceptance items:** all present and honest. Attributions are correct apart from the omission in MUST-FIX 1.
> - **The default:** keeping the shield as a stated choice is acceptable. With both of its costs stated, though, the whole version removes both departures, and I lean, as round 20 did, toward making it the default. That is the boss's call.
>
> **Ready for the boss?** Not yet. §4 must state the pass-side cost of the default, and §1.3's "both readings" must be fixed — both text only. The rest is tests and wording.

### The response

The score held at 8.5. Again the reviewer found the code correct, with no new route. I stated the hedge's second cost and took the should-fixes. Two reviewers in a row have leaned toward making the whole version the default for a proxy. I kept the hedge as the default, with both of its costs now stated beside the other way. Both reviewers found keeping it acceptable once stated, and the choice is the boss's. §4 now says the review leaned the other way.

| # | finding | what changed | evidence |
|---|---|---|---|
| M1 | the proxy hedge also holds open fleets that both anchors pass, and §4 never said so | **What the hedge does:** a proxy's crystal can be in its range on its length but hidden by a pocket below the proxy's lower quartile. At the span it is short of the proxy, so it gets no vote against the protagonist there, while a giant keeps its vote. §4, §1.3, `size_check` and the lib now state this pass-side cost beside the shield. **The whole version:** §4 says it passes those fleets, just as it fails the shielded ones. **§4's wording:** "its cost" and "adopting it" now name the whole version. Its exactness claim now carries "where every span is known", and §4 names the tests that adopting it would flip. **Correction:** the round-20 response's "today's reading in 324" counted both kinds of departure as one; this response splits them. | Reproduced on the working tree and on a scratch whole-version lib. **Random proxies** (30,000 each, seeds 47 and 5): the default departs from the anchors in 322 and 359 fleets. Of these, 216 and 256 are held open where both anchors pass, and 106 and 103 where both fail. The whole version departs in none. **Deccan's stilbite** at its proxy's median, 7 of 21 runs in 45 mm pockets, 2,000 fleets: the size test passes 78.5 % under the default and 89.3 % under the whole version, so 10.8 % are held open where both anchors pass. WP1 is met in 49.6 against 50.5 %. **The reviewer's concrete case** (7 carriers at 100 mm in 300 mm pockets, 6 at 100 mm in 45 mm, 8 at 200 mm in 60 mm) is open under the default and met under the whole version. **The single-giant case** is held open under both: in the whole version's boss reading, the giant is the one eligible voter. |
| S1 | §1.3 named the wrong readings | "where both readings fail all of them" now reads "where both anchors fail all of them". | — |
| S2 | "a third" was given without its run count | The texts now give 7 of 21 and say the share needed rises toward one half with more runs. §4 also gives 1 of 7, 13 of 36, 43 % of 210 and 47 % of 1,000. | Computed from the Wilson interval at z 1.96. |
| S3 | the new clause was only half pinned | Tests now pin both other readings. The galena at 40 mm with 11 runs in 300 mm pockets and 10 in 25 mm gives "; beyond noise at their own length". 8 runs in 19 mm, 7 in 300 mm and 6 in 25 mm give "; beyond noise in every pocket". A further test pins that one run in a median-holding pocket is enough to name it. | The reviewer's three surviving mutants now die. |
| S4 | nits | The dead `one ? [] :` is cut. §4's exactness claim says "with every span known". §4 says adopting the whole version would flip the tests that pin the shield and Naica's selenite. `story_frequency_rule` and `storyVerdict`'s reason now list a crystal longer than the cavity among UNRESOLVED's causes. | — |

Mutation testing: 50 mutants on rounds 16–21's code, 48 killed by the tests, the splice check or the targets check, among them the round-21 reviewer's three message mutants (the clause looking at the eligible reading only; the clause always naming the eligible pockets; a single run in a median-holding pocket not enough to name it). The two survivors are the equivalent ones from rounds 18 and 19.

Result: STORY 1, STORY (PROXY) 1, NO STORY 3, UNRESOLVED 26, NO ENGINE 1, OUT OF SCOPE 1 (unchanged). WP1's whole target is met by none: it fails at 16 scored scenarios (by cause: the story 4, a band 15, a carrier share 5, oversize 0) and is open at 16. No protagonist has a size entry. No generated block changed. Tests 134 (unchanged; the new cases sit in existing tests).
