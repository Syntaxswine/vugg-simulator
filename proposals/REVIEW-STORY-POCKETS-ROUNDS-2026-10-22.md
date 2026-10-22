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
