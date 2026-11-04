#!/usr/bin/env node
/**
 * tools/story-pocket-targets.mjs — writes or checks the pre-registered story-pocket targets
 * (proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json; schema proposals/SCHEMA-STORY-POCKET-TARGETS.json)
 * that tools/showcase-scoreboard.mjs scores the census against.
 *
 * Per locality scenario and per species with a role:
 *   role              from the record (which species people want) gated by the literature (whether the
 *                     place has them): primary, alternate, showpiece, unsupported, companion
 *                     (deriveRoles in tools/story-pocket-lib.mjs);
 *   occurrence band   the share of story pockets the species should occur in, from the literature's
 *                     abundance class (RULES.occurrence_bands) — never from photograph or listing shares;
 *   size target       from the photographed crystal lengths (tools/story-pocket-size-evidence.mjs), else
 *                     the specimen dimensions as a labelled proxy, else unknown: no default size;
 *   story frequency   per scenario, the share of scored pockets that should carry a protagonist at the
 *                     record's display scale (RULES.story_frequency_rule): for a crystal target, the
 *                     expected story rate of a fleet at its protagonist's band floor with crystals drawn
 *                     from the record; for a specimen proxy, a bar for STORY (PROXY).
 * Every number is either evidence (a sample, with its count and provenance) or one of the RULES below,
 * which are design choices proposed by Claude on 2026-10-22 and await the boss. Nothing here is fitted to
 * the census: the census is read only by the scoreboard.
 *
 * Inputs: .local-evidence/locality-abundance/compare.json (tools/locality-abundance-compare.mjs: record
 * shares, literature classes, set-asides), proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json (literature
 * sources), the size capture (via buildSizeEvidence), and each scenario's cavity span
 * (.local-evidence/locality-abundance/cavities.json, tools/story-pocket-cavities.mjs: the authored wall,
 * read before any run), which decides which protagonists can carry a story run there.
 *
 * Usage: node tools/story-pocket-targets.mjs           # check: does the committed file match a rebuild?
 *        node tools/story-pocket-targets.mjs --write   # rebuild and write it
 * buildTargets(root, evidenceRules) takes buildSizeEvidence's options and sizeMinSamples, so the scoreboard
 * can rebuild the targets under other evidence rules in memory (its sensitivity table); the file uses the
 * registered values.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveRoles, bandFor, baseClass, sizeTarget, scenarioFrequency, carrierShare, displayCoverage, validateSidecar, UPLOADED_TOGETHER, SERIES_GAP, FIELD_LABELS } from './story-pocket-lib.mjs';
import { buildSizeEvidence, PIECE_SPECIES, SPECIMEN_MIN_MM } from './story-pocket-size-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TARGETS_FILE = 'proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json';
const CMP = path.join(ROOT, '.local-evidence', 'locality-abundance', 'compare.json');
const CAV = path.join(ROOT, '.local-evidence', 'locality-abundance', 'cavities.json');
const DATA_FILE = 'proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json';

// The design rules. Each is a proposal (Claude, 2026-10-22) for the boss to accept or change; the
// scoreboard reads them from the written file, not from here.
export const RULES = {
  status: 'PROPOSED by Claude 2026-10-22; awaiting the boss. The rules are design choices; the evidence each target rests on is cited per entry.',
  wanted_share: 0.05,
  wanted_share_basis: 'A species is wanted from a locality when it holds at least 5 % of the locality\'s record (Mineralienatlas photographs and eBay listings, compare.json "real"), as the scoreboard has used since 2026-10-21. Where the record is too thin to vote, the collectibles the sources name (named_signatures).',
  occurrence: 'A run in which at least one crystal of the species survives (census n_surv > 0), at any size.',
  occurrence_bands: { AB: [0.5, 0.95], CO: [0.3, 0.9], UN: [0.1, 0.6], RA: [0.02, 0.3], VR: [0, 0.15] },
  occurrence_bands_basis: 'The literature\'s abundance class for the deposit (proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json, literature), read as the share of story pockets the species occurs in: abundant 50–95 %, common 30–90 %, uncommon 10–60 %, rare 2–30 %, very rare at most 15 %. No class reaches 100 %: signature minerals should be "common, not guaranteed" (the boss, 2026-10-22), and the supporting cast "usually present". The numbers are a design choice, not measured. With 21 seeds one species in every seed is within noise of a 90–95 % ceiling, so the scoreboard also tests the fleet: how many species occur in every seed, against the chance of that if each occurred at its ceiling. A form suffix (-crust, -coating, -oxidized) keeps the class. doc (documented without an abundance word), ND, ND?, Q and no class leave the band unresolved. Photograph and listing shares are never used: they measure collector salience, not geological frequency.',
  visible_mm: 1,
  visible_basis: 'The locality review\'s "visible" (a crystal of at least 1 mm not flagged as enclosed), kept as a reporting convention: the dust and hidden flags use it, and the clutter share reads the census\'s count of such crystals (n_1_exp), which the census takes at exactly 1 mm — so this value cannot change and the scoreboard refuses any other. It decides no verdict and is not a size target.',
  size_min_samples: 5,
  size_medium_confidence: 10,
  size_high_confidence: 30,
  specimen_min_mm: SPECIMEN_MIN_MM,
  specimen_min_basis: 'A specimen length below this is set aside: micromount captions give the crystal or the field of view as "Größe" ("Malachit ; Größe: 4,2 mm"), and a misread crystal would pull a specimen proxy below the crystals it is meant to bound. A cabinet or thumbnail specimen is longer.',
  uploaded_together_s: UPLOADED_TOGETHER,
  // uploaded_together_basis is written by buildTargets from the capture's image ids.
  specimen_joins: 'Two photographs of one species are one specimen when uploaded together (ids within uploaded_together_s) with the same caption stretches (identical once a word cut at the stretch\'s start, punctuation and the words "mit", "und", "auf" are dropped) or the same multi-dimension length of a crystal, an aggregate or the specimen; a picture\'s size identifies no specimen, so neither a caption that states nothing else ("Erythrit, BB 4,5 mm": a micromounter photographs many specimens at one magnification) nor a shared picture size joins any; or, uploaded apart, when they state the same length in three dimensions, one written with a decimal ("5x5x4,8mm", "15,9 x 10 x 4,7 cm"); never when their captions name different finds, or when each names a mineral the other does not ("mit etwas Limonit" against "mit etwas Hämatit"). A round size repeated years apart counts as two specimens. Every join is listed in proposals/DATA-STORY-POCKET-SIZES-2026-10-22.md.',
  series: 'Lengths of one kind (crystal or specimen) in one wording once the numbers are taken out (seriesKey, tools/story-pocket-lib.mjs) whose specimens were uploaded in one stretch — each less than series_gap_s after the one before (largestSeries) — are one series: likely one contributor\'s lot or find, not independent samples. The capture has no uploader names, so the stretch stands in for the contributor. A standard caption field ("Größe: #", "Kristallgröße: #", "Size #": a wording ending in one of series_field_labels) or a bare length with no words around it (a wording with no letters: "#", "#.") is everyone\'s wording, so only photographs uploaded together (within uploaded_together_s) make a series of it (isFieldLabel). When the largest series holds more than half of a crystal target\'s lengths, its confidence drops one step; every target records its quantiles without its largest series, so the scoreboard can say whether a verdict rests on it.',
  series_field_labels: FIELD_LABELS,
  series_field_labels_basis: 'The size words of the site\'s standard caption fields and of dealers\' labels, in German and English, as the capture spells them ("Größe", "Grösse", "Groesse", "Size", "Maße", "Masse", "Abmessungen", "Dimension(s)"): a wording that ends in one of them, then an optional ":", "=" or "." and "ca." or "etwa", is many contributors\' wording, as is a bare length with no words around it, the least distinctive wording of all. Any other wording is taken as one contributor\'s.',
  series_gap_s: SERIES_GAP,
  series_gap_basis: 'A year: longer than the gaps inside the runs of one unusual wording that are plainly one contributor\'s (a lot photographed over months), shorter than the gaps at which standard wordings recur (years). The appendix gives each largest series\' span in days.',
  size_basis: 'Photographed lengths (proposals/DATA-STORY-POCKET-SIZES-CAPTURE-2026-10-22.json, classed by tools/story-pocket-size-evidence.mjs). Photographs of one specimen count once (specimen_joins). Each specimen gives one value per kind: its largest stated crystal of the species. With at least size_min_samples specimens, a crystal target: confidence low below size_medium_confidence, medium below size_high_confidence, high from it, one step lower when one series dominates (series). Otherwise the specimens\' dimensions (none below specimen_min_mm), if at least size_min_samples, as a proxy, confidence low: a specimen is at least as long as its own crystals, so the proxy overstates the crystal — reaching it is strong evidence (not proof: the photographs that state crystal lengths and those that state specimen sizes are different subsets), falling short of it is none. Otherwise unknown. There is no default size. Materials collected as pieces (tiger\'s eye, chrysoprase, chalcedony, jasper) have piece sizes only, so at best a proxy.',
  display_range: [0.25, 0.9],
  display_range_basis: 'The record\'s quantiles that bound its display scale: a crystal from the record\'s lower quartile to its 90th percentile is at the scale the record shows; past the 90th it is oversize. A fresh crystal from the record\'s population lands inside the range of a record of n crystals with probability 0.65 × (n − 1) / (n + 1) (displayCoverage: exact for a uniform population, within about 0.03 and on the low side for lognormal ones): 0.43 at n = 5, 0.58 at n = 17. That coverage enters the story frequency (story_frequency_rule). The scoreboard reads the targets\' q25 and q90 and refuses another range.',
  size_check: 'Per run, the species\' largest crystal not flagged as enclosed (census max_exp_mm). The record\'s median is the characteristic crystal, its quartiles the range: a crystal in the display range (q25–q90) is at the record\'s display scale; past q90 it is oversize. Over the runs where the species occurs in a cavity that holds its median, the median of those crystals against the record: BELOW (< q25), MEETS (q25–q75, around the record\'s median), LARGE (q75–q90), OVERSIZE (> q90). Against a proxy: BELOW PROXY (< q25, not a verdict), REACHES PROXY (q25–q90; oversize cannot be tested against a proxy), OVERSIZE (> q90). A miss is noise when the runs cannot tell their median from the target\'s window: the Wilson interval (noise_z) of the share of those runs on the window\'s side of its near edge (at least q25 for BELOW; at most q75 for LARGE or OVERSIZE, q90 for a proxy\'s OVERSIZE) still reaches one half. With noise_z² eligible runs or fewer (3 at z 1.96) no miss could be told from the window at all: too few runs to judge. The interval models the runs\' noise only. The window is the record\'s own middle half, itself uncertain: it misses its population\'s median in about 38 % of five-crystal records, 19 % of eight and 5 % of seventeen, so a correct fleet can miss a small record\'s window — more often, not less, with more runs. A crystal longer than the cavity\'s span cannot be held by the starting cavity, and its length or the span could be the one to judge: where they fall on the same side of the display range (both below q25, both within it, or both past q90) it is judged so; where they do not it is left out and flagged. WP1\'s whole target asks no protagonist oversize. Its test reads each occurrence by the part it plays: a crystal in the display range votes within q90, one past it past q90, and an accessory (a crystal target\'s crystal below the range) not at all — this proposal\'s application of the boss\'s answer that an accessory is not held to showcase size (carrier_obligation), so it neither passes the test nor offsets a giant. Which pockets vote is read two ways, each whole, whatever the story makes of the pocket: only those that hold the protagonist\'s characteristic crystal — the boss\'s rule that size is checked in pockets physically eligible for it (eligibility; the size verdict\'s own) — and every pocket, as a cavity that hid nothing would count them, this proposal\'s hedge on that rule: carriers in the other pockets can turn a fail into open, never into met. In a pocket too small for its characteristic crystal a crystal target\'s crystal is read at its own length, as a cavity that hid nothing would read it; a proxy\'s pocket short of its median keeps both readings, since the protagonist\'s own crystal may fit it. Within each, a crystal whose part the evidence cannot settle is read both ways: one the cavity hides (longer than the span, the two on different sides of the range) at its own length and at the span (in the range there, or, for a proxy, below it: short of the proxy); and one short of a specimen proxy, which a proxy cannot refute, as at display scale and as an accessory. The test fails a protagonist where every reading puts the median of the voting crystals past q90 and the runs can tell it — the Wilson interval (noise_z) of the share of them within q90 stays below one half, which noise_z² of them or fewer cannot show — and leaves the target open where any reading puts it past q90 but not every one beyond noise, since an indistinguishable size miss is never a pass (carrier_obligation). A cavity that hid nothing reads every crystal one of those ways, and the boss\'s size rule reads the eligible pockets one of them, so the test fails a protagonist only where both would fail it and passes one only where both would pass it — where every pocket\'s eligibility is settled: every span known, and no proxy with pockets of more than one span short of its median. With cavities that differ from run to run (WP9), pockets that hold the median but not q90 hide giants from the whole fleet, not only from themselves. In one cavity that holds each protagonist\'s characteristic crystal the two readings of the pockets are one, and WP1\'s whole target is met exactly where a cavity that hid nothing would meet it, and failed only where that cavity would fail it; a range beyond the cavity holds it open otherwise, and with cavities that differ from run to run (WP9) small pockets also leave the share\'s count. The verdicts above, and their noise marks, are reported, not required.',
  eligibility: 'A cavity can hold a species\' characteristic crystal when its span — the longest distance between two wall vertices (tools/story-pocket-cavities.mjs) — is at least the target\'s median. The span is an upper bound on the longest crystal the cavity holds (in a cavity that is not convex the chord can cross the wall), so SMALL is conclusive and STORY-SCALE is generous. A pocket is SMALL when it cannot hold the primary protagonist\'s characteristic crystal: it may lack a showcase and is left out of the story frequency (its stories are reported apart). The locality\'s target is never shrunk to fit the cavity. A pocket is UNCLASSED when this cannot be told (the primary\'s size is unknown, or a proxy longer than the cavity): a run without a story there may be a small pocket, so it stays open rather than counting against the story.',
  story_frequency_rule: 'A run carries the story when an intended protagonist (the primary or an alternate) occurs with its largest unflagged crystal in its record\'s display range — on its own length, and, where it is longer than the cavity, on the span as well (size_check). The scenario should carry it in at least floor × coverage of its scored runs, for the protagonist that can carry a story run with the largest such product: floor = its band\'s lower bound; coverage = the chance that a crystal drawn from its record\'s population lands in the display range of a record of its size (display_range_basis). A protagonist can carry a story run when it has an engine, a band and a size target whose display range starts within the scenario\'s cavity span (q25 ≤ cavity_span_mm: the same test a run\'s YES needs; the size verdict\'s eligibility uses the median instead, and the scoreboard shows the verdicts under that test too). One with no size target, or a range that starts beyond the span, does not set the frequency. Crystal targets come first: a proxy sets the frequency only where no crystal target can carry a story run, since a proxy\'s product is a bar and a crystal target\'s an expected rate. So any protagonist\'s crystal target displaces every proxy, the primary\'s too; a low band or a small record then sets a low frequency (an uncommon alternate with five crystal lengths would set 0.1 × 0.43 = 0.043), possibly one 21 seeds cannot fail beyond noise; and where crystal targets set it, STORY (PROXY) is judged against their expected rate, not a proxy\'s bar. The scoreboard lists the frequencies this moves and shows the verdicts with proxies setting it too. For a crystal target the frequency is the expected story rate of a fleet whose protagonist occurs at its band\'s floor with crystals drawn from the record: an expectation, not a guarantee — with 21 seeds such a fleet falls short about half the time, and the verdict marks a shortfall its interval cannot tell from the frequency "noise" (noise_z). For a specimen proxy it is a bar for STORY (PROXY), the rate at which crystals as large as the photographed specimens would reach the proxy\'s range — not an expected rate, since the proxy overstates the crystal. The coverage is never cut to the cavity: a run whose crystal is longer than it is judged only where its length and the span fall on the same side of the display range, and otherwise stays open, so a cavity shorter than the range\'s top leaves the verdict open rather than failing it. But the cavity does decide which protagonists can carry a story run, so dropping one whose range starts beyond the span can lower the frequency (Elmwood) or remove it; each basis names the protagonists dropped, and the scoreboard lists them. It asks for no protagonist in every seed or size spread narrower than the record\'s. Unresolved when no protagonist can carry a story run, or when runs whose protagonist has no known crystal target, or whose pocket is unclassed, could still carry it. The story verdict checks this alone. WP1\'s whole target also needs every protagonist with an engine within its band (below it within noise leaves the target open; above it within noise counts as within), none oversize, and each carrying the story at its own scale in at least its carrier share of the scored runs (carrier_obligation). The scoreboard reports both.',
  carrier_obligation: 'The boss\'s answers of 2026-11-03 (Rock Bot\'s review, forwarded by the boss): a size miss the runs cannot tell from the target stays open; a specimen proxy is not a crystal size a protagonist must reach (reaching it is strong evidence, falling short is none: the obligation stays open pending crystal lengths, WP0); and an alternate that is an accessory in another protagonist\'s pocket is not held to showcase size there, but must carry the story at its own scale in a pre-registered share of the fleet — one that never does is not functioning as one. So size is judged by role, run by run: in each scored run a protagonist is the story\'s carrier (its largest unflagged crystal in its own display range, q25–q90 — on its length, and on the span too where it is longer than the cavity), an accessory, or absent; several can carry one run (a choice of this rule). Each protagonist with an engine — the boss named the alternates; the primary is held to the same, a choice of this rule — must carry the story in at least its carrier_share of the scored runs: its band\'s floor × the display range\'s coverage of a record its size, the product story_frequency_rule takes the largest of. That is the one test of "if it never does". It fails where, counting every run it could still carry (short of a proxy, or longer than the cavity where its length and the span fall on different sides of the display range) and leaving out every run in an unclassed pocket (which carries the story in no pocket class but may be small, and so may not count), the Wilson interval (noise_z) of its carrying stays below its share. A share at or below the top of the interval for none of those runs (0.155 for 21) cannot be failed by them even if the protagonist never carries the story. There the boss\'s "if it never does" meets this proposal\'s extension of the boss\'s OPEN — given for a size miss the runs cannot tell from the target — to carrying counts the runs cannot tell from the share; the scoreboard lists such shares and which of them the limit decides, and the proposal\'s §4 costs the options. It also fails where its typical voting crystal is past its display range in every reading — of which pockets vote (the eligible ones, as the boss\'s rule; or every one, this proposal\'s hedge) and of the crystals the evidence cannot settle — and the runs can tell it (size_check); in this proposal\'s application of the exemption, an accessory has no vote there either, so it neither passes that test nor offsets a giant, while a crystal short of a proxy, which may yet carry, is read both ways; where the runs cannot tell it, or only some reading puts it past the range, the oversize leaves the target open. A failing protagonist is not functioning as one in this fleet: a candidate for growth (WP1) or for downgrading to companion (a decision). It meets the obligation by carrying at least its share. Open, not failed: runs it could still carry, or unclassed pockets that may not count, that would make up the share; a shortfall within noise; an oversize within noise (past the range in every reading, not beyond noise), or one only some reading puts past the range (of which pockets vote, or of the crystals that could be read either way); no size target (WP0); a display range beyond the cavity (WP9); and no band — its share cannot be set, whatever it carries. Round 9\'s further tests (a protagonist that never carries judged on the runs where it occurs; a model of the record\'s own noise) were cut in round 10: the first held accessories beside a carrying protagonist to the record, which the boss exempted, and one giant crystal switched it off; the second is listed for the boss as an option.',
  noise_z: 1.96,
  noise_basis: 'The Wilson score interval at z 1.96 (95 %), of the runs. An occurrence rate outside its band is "noise" when its interval still reaches the band. A size verdict\'s miss is noise when the interval of the share of eligible runs on the target window\'s side of its near edge still reaches one half (size_check): the runs cannot tell their median from the window; WP1\'s oversize test asks the same against q90, of the crystals that vote (size_check). A story shortfall is noise when the interval of the runs that carry or could carry the story (yes + open: an open run might have carried it) still reaches the frequency — except where no protagonist with an engine forms in any seed: the mark says chance in which runs carry the story could explain the shortfall, and no run grew a protagonist to carry it, so there is no mark. A carrier-share shortfall is noise when the interval of the runs the protagonist carries or could carry, out of the scored runs not in unclassed pockets, still reaches its share. 21 runs cannot tell a noise miss from the target. Noise marks a verdict; it does not change it. WP1\'s target counts a band miss above the band within noise as within (21 seeds cannot tell common from guaranteed; the fleet is tested for that apart), and leaves a band miss below it, a story shortfall, a carrier-share shortfall and an oversize within noise open: runs that cannot fail a target cannot confirm it either. Every interval models the runs\' noise only. The targets carry noise of their own — a display range read from five crystals can hold a tenth of its population or most of it — so a fleet drawn from a small record\'s own population falls short of its share, and misses its window, more often than the interval allows, and more often with more runs. Against five-crystal records a correct fleet (two protagonists, mid-band) fails WP1 in 6.8 % of fleets of 21 runs, 25 % of 210 and 34 % of 1,000 — most of it as oversize, where a five-crystal record\'s 90th percentile sits low in its own population; against six, eight and nine crystals in 4.2, 15 and 25 %, 2.1, 8.9 and 14 %, and 2.0, 7.6 and 12 %; at the bands\' floors, where the share is the fleet\'s expected rate, against five in 12, 44 and 60 %; against seventeen-crystal records mid-band in 0.3, 1.2 and 2.7 % (6,000, 3,000 and 1,500 simulated fleets). More crystal lengths (WP0), not more seeds, firm the targets.',
  clutter_limit: 0.1,
  clutter_basis: 'WP3\'s target: visible clutter (crystals of species with no photograph, no listing and no literature at the locality) under 10 % of a scenario\'s visible crystals. The scoreboard flags a scenario at or above it and lists it in the clutter table.',
  star_wanted_share: 0.5,
  star_basis: 'WP2\'s target: the star (the species of a run\'s largest unflagged crystal) is a wanted species, any role but companion, in at least half the runs; a companion as the star in half the runs or more is the supporting cast in the star\'s place. The scoreboard flags a scenario below it and counts the scenarios on either side.',
  variety: 'A scenario should give a distribution of pockets, not one assemblage every run (the boss, 2026-10-22). The scoreboard reports, per scenario, the distinct assemblages (sets of surviving species) across its seeds, the protagonists present in every seed, and how much each protagonist\'s largest crystal varies (interquartile range over median, beside the record\'s); and, for the fleet, the chance that every species seen in all its seeds would be if each occurred at its band\'s ceiling.',
  roles: 'From the record, gated by the literature (deriveRoles, tools/story-pocket-lib.mjs): primary = the most-wanted species the literature does not contradict (ND, ND?, Q) or call rare (RA, VR); alternate = every other such wanted species; showpiece = a wanted species the literature calls rare; unsupported = a wanted species the literature contradicts (listed, not targeted); companion = a species the literature calls abundant or common that the record does not want (the supporting cast: it should occur, not be the star). Species the comparison sets aside as outside the scenario\'s scope have no role.',
  companions_and_showpieces: 'Companions are scored on occurrence against their band and on not being the star; showpieces on occurrence against their band and, where a size target exists, on how often they reach it. Neither carries the story.',
};
// Where no source votes (compare.json verdict THIN), the signature is the collectible the sources name.
export const NAMED_SIGNATURES = {
  great_salt_plains: { species: ['selenite'], why: 'hourglass selenite is the collectible; halite is a thin surface crust (US FWS 2002)' },
  chiastolite_hornfels: { species: ['andalusite'], why: 'chiastolitic andalusite to 14 cm (Teale 1979)' },
  sulphur_bank: { species: ['cinnabar', 'native_sulfur'], why: 'cinnabar, the "most abundant metallic mineral" (Ross 1940, two districts together), and native sulfur; the opal is a replacement of the basalt, not a crystal collectible' },
};
// Hand decisions, each with its reason: { scenario: { species: { role?, occurrence_band?, why } }, ... }.
// None yet: every target below follows the rules.
export const OVERRIDES = {};

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);
// The protagonists the cavity drops as setters, with where their display range starts.
const droppedText = (dropped) => dropped.map(({ k, from }) => `${k}, display range from ${+from.toFixed(1)} mm`).join('; ');
// Why image ids read as upload times, from the capture itself: they fall in the archive's years and end
// just before the capture.
function uploadedTogetherBasis(ev) {
  const { n, first, last } = ev.capture.image_ids;
  const before = Math.round((Date.parse(ev.capture.captured) / 1000 - last) / 86400);
  return `Mineralienatlas image ids read as upload times in seconds since 1970: the ${n} captured ids run from ${first} (${day(first)}) to ${last} (${day(last)}), ${before} day${before === 1 ? '' : 's'} before the capture (${ev.capture.captured}). ${UPLOADED_TOGETHER.toLocaleString('en-US')} s is about ${(UPLOADED_TOGETHER / 86400).toFixed(1)} days. The site does not document the ids; this is an inference.`;
}

export function buildTargets(root = ROOT, evidenceRules = {}) {
  const cmpRaw = fs.readFileSync(CMP, 'utf8');
  const cmp = JSON.parse(cmpRaw);
  if (!cmp.__out_of_claim) throw new Error('compare.json predates the set-aside export; re-run tools/locality-abundance-compare.mjs');
  const data = JSON.parse(fs.readFileSync(path.join(root, DATA_FILE), 'utf8'));
  const ev = buildSizeEvidence(root, evidenceRules);
  if (!fs.existsSync(CAV)) throw new Error('cavities.json is missing: run tools/story-pocket-cavities.mjs');
  const cav = JSON.parse(fs.readFileSync(CAV, 'utf8'));
  const minSamples = evidenceRules.sizeMinSamples ?? RULES.size_min_samples;
  const scenarios = {};
  for (const [scn, j] of Object.entries(cmp).filter(([k]) => !k.startsWith('__')).sort(([a], [b]) => a.localeCompare(b))) {
    const loc = j.locality;
    const lit = data.localities[loc]?.literature;
    const setAside = (k) => !!cmp.__out_of_claim[`${scn}|${k}`];
    const outOfScope = cmp.__scenario_out_of_scope?.[scn] ?? null;
    const entry = { locality: loc, out_of_scope: outOfScope, record: j.verdict === 'THIN' ? 'thin: named signatures' : 'votes' };
    if (outOfScope) { entry.species = {}; scenarios[scn] = entry; continue; }
    if (j.verdict === 'THIN' && !NAMED_SIGNATURES[scn]) throw new Error(`${scn}'s record is THIN but it has no named signature`);
    const named = j.verdict === 'THIN' ? NAMED_SIGNATURES[scn].species : null;
    if (named) entry.named_signature_basis = NAMED_SIGNATURES[scn].why;
    const roles = deriveRoles(j.rows.map((r) => ({ k: r.k, real: r.real, lit: r.lit })), { wantedShare: RULES.wanted_share, setAside, named });
    const species = {};
    for (const [k, role] of Object.entries(roles)) {
      const row = j.rows.find((r) => r.k === k);
      const L = lit?.species?.[k] ?? null;
      const cls = row?.lit ?? L?.class ?? null;
      const band = bandFor(cls, RULES.occurrence_bands);
      const sev = ev.localities[loc]?.[k];
      const t = sizeTarget(sev, { minSamples, mediumConfidence: Math.max(minSamples, RULES.size_medium_confidence), highConfidence: Math.max(minSamples, RULES.size_high_confidence) });
      if (t.basis === 'crystal' && sev.crystal_series?.largest > 1) t.without_largest_series = sev.crystal_without_largest_series;
      if (t.basis === 'specimen-proxy' && sev.specimen_series?.largest > 1) t.without_largest_series = sev.specimen_without_largest_series;
      const size = { ...t };
      if (sev) {
        size.photographs_with_length = sev.photos_with_length;
        size.crystal = sev.crystal.n ? { ...sev.crystal } : { n: 0 };
        size.specimen = sev.specimen.n ? { ...sev.specimen } : { n: 0 };
        if (PIECE_SPECIES.has(k)) size.piece_material = true;
        size.specimens = sev.specimens;
        size.provenance = `Mineralienatlas captions (${ev.capture.file}): ${sev.photos_with_length} photograph(s) of ${sev.names.join(' / ')} at ${loc} with a stated length, ${sev.specimens} specimen(s); ${sev.crystal.n} with a crystal length, ${sev.specimen.n} with specimen dimensions, ${sev.aggregate.n} aggregate, ${sev.fov.n} picture width`;
      } else {
        size.provenance = `no photograph of this species with a stated length in the capture (${ev.capture.file})`;
      }
      species[k] = {
        role,
        engine: !!row?.engine,
        record_share: row?.real ?? null,
        literature: L ? { class: L.class, sources: L.src ?? null, status: L.status ?? null } : cls ? { class: cls, sources: null, status: null } : null,
        occurrence_band: band,
        band_basis: band ? `literature class ${cls}${L?.src ? ` (${L.src}; status ${L.status})` : ''} under rules.occurrence_bands` : `unresolved: literature class ${cls ?? 'none'}`,
        size,
      };
      const o = OVERRIDES[scn]?.[k];
      if (o) {
        if (!o.why) throw new Error(`override ${scn}.${k} has no reason`);
        Object.assign(species[k], Object.fromEntries(Object.entries(o).filter(([key]) => key !== 'why')), { override: o.why });
      }
    }
    entry.set_aside = Object.fromEntries(j.rows.filter((r) => setAside(r.k)).map((r) => [r.k, cmp.__out_of_claim[`${scn}|${r.k}`]]));
    entry.species = species;
    // Story frequency: the largest band floor × the display range's coverage of the record, among the
    // protagonists that can carry a story run in the scenario's cavity.
    const C = cav.scenarios[scn];
    if (!C) throw new Error(`${scn} has no cavity in cavities.json`);
    entry.cavity_span_mm = C.span_mm;
    // Each protagonist's carrier share (rules.carrier_obligation): the share of the scored runs it should
    // carry the story in at its own display scale.
    for (const v of Object.values(species).filter((x) => x.role === 'primary' || x.role === 'alternate')) {
      const cs = carrierShare(v.occurrence_band, v.size, RULES.display_range, C.span_mm);
      v.carrier_share = cs.share;
      v.carrier_share_basis = cs.share == null
        ? `none: ${cs.why === 'no size target' ? 'no size target, so its carrying waits on crystal or specimen lengths (WP0)' : cs.why === 'display range beyond the cavity' ? `its display range starts at ${+v.size.q25.toFixed(1)} mm, beyond the cavity's ${C.span_mm} mm span (WP9)` : 'no band, so its share cannot be set: the obligation stays open whatever it carries'}`
        : `rules.carrier_obligation: band floor ${v.occurrence_band[0]} × display coverage ${+displayCoverage(v.size.n, RULES.display_range).toFixed(4)} of a ${v.size.basis === 'crystal' ? 'crystal' : 'specimen-proxy'} record of ${v.size.n} = ${cs.share}`;
    }
    const sf = scenarioFrequency(species, RULES.display_range, C.span_mm);
    if (sf) {
      const v = sf.k ? species[sf.k] : null;
      entry.story_frequency = sf.frequency;
      entry.story_frequency_basis = sf.frequency == null
        ? `unresolved: every protagonist with an engine, a band and a size target has a display range that starts beyond the cavity's ${C.span_mm} mm span (${droppedText(sf.dropped)}), so none can carry a story run`
        : `rules.story_frequency_rule: ${sf.k} (${v.role}, class ${baseClass(v.literature?.class)}, ${v.size.basis} target of ${sf.n}) has the largest floor × coverage: ${sf.floor} × ${sf.coverage} = ${sf.frequency}${sf.basis === 'crystal' ? ', an expected story rate' : ': a bar for STORY (PROXY), not an expected rate (the proxy overstates the crystal)'}${sf.passedOver.length ? `; crystal targets first, so the proxies of ${sf.passedOver.join(', ')} do not set it` : ''}${sf.dropped.length ? `; the cavity drops ${droppedText(sf.dropped)}` : ''}`;
    } else {
      entry.story_frequency = null;
      entry.story_frequency_basis = 'unresolved: no protagonist with an engine and an occurrence band has a size target, so none can carry a story run';
    }
    scenarios[scn] = entry;
  }
  const doc = {
    schema: 'vugg-story-pocket-targets-v1',
    generated_by: 'tools/story-pocket-targets.mjs --write',
    about: 'Pre-registered story-pocket targets per locality scenario: roles, occurrence bands, size targets and story frequencies. Read by tools/showcase-scoreboard.mjs. Generated, not hand-typed: change a rule or an override in tools/story-pocket-targets.mjs and rewrite.',
    inputs: {
      record_and_literature_classes: { file: '.local-evidence/locality-abundance/compare.json', made_by: 'tools/locality-abundance-compare.mjs', sha256: sha(cmpRaw) },
      literature_sources: DATA_FILE,
      size_capture: { file: ev.capture.file, sha256: ev.capture.sha256, extractor_sha256: ev.capture.extractor_sha256 },
      cavities: { file: '.local-evidence/locality-abundance/cavities.json', made_by: 'tools/story-pocket-cavities.mjs', sim_version: cav.sim_version },
    },
    rules: { ...RULES, uploaded_together_basis: uploadedTogetherBasis(ev) },
    named_signatures: NAMED_SIGNATURES,
    overrides: OVERRIDES,
    scenarios,
  };
  const bad = validateSidecar(doc);
  if (bad.length) throw new Error(`the built targets fail validation:\n  ${bad.join('\n  ')}`);
  return doc;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const doc = buildTargets();
  const text = JSON.stringify(doc, null, 1) + '\n';
  const file = path.join(ROOT, TARGETS_FILE);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(file, text);
    const n = Object.values(doc.scenarios);
    const roles = {};
    for (const s of n) for (const v of Object.values(s.species)) roles[v.role] = (roles[v.role] || 0) + 1;
    const basis = {};
    for (const s of n) for (const v of Object.values(s.species)) if (v.role === 'primary' || v.role === 'alternate') basis[v.size.basis] = (basis[v.size.basis] || 0) + 1;
    console.log(`wrote ${TARGETS_FILE}: ${n.length} scenarios; roles ${JSON.stringify(roles)}; protagonist size targets ${JSON.stringify(basis)}`);
  } else {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (cur === text) console.log(`${TARGETS_FILE} matches a rebuild`);
    else { console.error(`${TARGETS_FILE} ${cur == null ? 'is missing' : 'differs from a rebuild'}; run with --write and review the diff`); process.exit(1); }
  }
}
