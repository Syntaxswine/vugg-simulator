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
 *   story frequency   per scenario, the share of story-scale pockets that should carry a protagonist at
 *                     showcase size (RULES.story_frequency_rule).
 * Every number is either evidence (a sample, with its count and provenance) or one of the RULES below,
 * which are design choices proposed by Claude on 2026-10-22 and await the boss. Nothing here is fitted to
 * the census: the census is read only by the scoreboard.
 *
 * Inputs: .local-evidence/locality-abundance/compare.json (tools/locality-abundance-compare.mjs: record
 * shares, literature classes, set-asides), proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json (literature
 * sources), the size capture (via buildSizeEvidence).
 *
 * Usage: node tools/story-pocket-targets.mjs           # check: does the committed file match a rebuild?
 *        node tools/story-pocket-targets.mjs --write   # rebuild and write it
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveRoles, bandFor, baseClass, sizeTarget, validateSidecar, UPLOADED_TOGETHER } from './story-pocket-lib.mjs';
import { buildSizeEvidence, PIECE_SPECIES, SPECIMEN_MIN_MM } from './story-pocket-size-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TARGETS_FILE = 'proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json';
const CMP = path.join(ROOT, '.local-evidence', 'locality-abundance', 'compare.json');
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
  uploaded_together_basis: 'Mineralienatlas image ids read as upload times in seconds since 1970: the newest captured id, 1791032939, falls on 2026-10-03, nineteen days before the capture, and the oldest in 2004. 1,000,000 s is about 11.6 days.',
  specimen_joins: 'Two photographs of one species are one specimen when uploaded together (ids within uploaded_together_s) with identical caption stretches or the same multi-dimension length; or, uploaded apart, when they state the same length in three dimensions measured to a tenth of a millimetre; never when their captions name different finds. A generic caption ("BB 4,5 mm") or a round size repeated years apart counts as two specimens. Every join is listed in proposals/DATA-STORY-POCKET-SIZES-2026-10-22.md.',
  series: 'Crystal lengths whose wording is the same once the numbers are taken out (seriesKey, tools/story-pocket-lib.mjs) are one contributor\'s series, not independent samples. When the largest series holds more than half of a crystal target\'s lengths, its confidence drops one step, and the target records its quantiles without that series, so the scoreboard can say whether a verdict rests on it.',
  size_basis: 'Photographed lengths (proposals/DATA-STORY-POCKET-SIZES-CAPTURE-2026-10-22.json, classed by tools/story-pocket-size-evidence.mjs). Photographs of one specimen count once (specimen_joins). Each specimen gives one value per kind: its largest stated crystal of the species. With at least size_min_samples specimens, a crystal target: confidence low below size_medium_confidence, medium below size_high_confidence, high from it, one step lower when one series dominates (series). Otherwise the specimens\' dimensions (none below specimen_min_mm), if at least size_min_samples, as a proxy, confidence low: a specimen is at least as long as its own crystals, so the proxy overstates the crystal — reaching it is strong evidence (not proof: the photographs that state crystal lengths and those that state specimen sizes are different subsets), falling short of it is none. Otherwise unknown. There is no default size. Materials collected as pieces (tiger\'s eye, chrysoprase, chalcedony, jasper) have piece sizes only, so at best a proxy.',
  size_check: 'Per run, the species\' largest crystal not flagged as enclosed (census max_exp_mm). The record\'s median is the characteristic crystal, its quartiles the range: a crystal in q25–q90 is at the record\'s display scale; past q90 it is oversize. Over the runs where the species occurs in a cavity that holds its median, the median of those crystals against the record: BELOW (< q25), MEETS (q25–q75, around the record\'s median), LARGE (q75–q90), OVERSIZE (> q90). Against a proxy: BELOW PROXY (< q25, not a verdict), REACHES PROXY (q25–q90; oversize cannot be tested against a proxy), OVERSIZE (> q90). A crystal longer than the cavity\'s span is left out and flagged: the starting cavity cannot hold it.',
  eligibility: 'A cavity can hold a species\' characteristic crystal when its span — the longest distance between two wall vertices (tools/story-pocket-cavities.mjs) — is at least the target\'s median. The span is an upper bound on the longest crystal the cavity holds (in a cavity that is not convex the chord can cross the wall), so SMALL is conclusive and STORY-SCALE is generous. A pocket is SMALL when it cannot hold the primary protagonist\'s characteristic crystal: it may lack a showcase and is left out of the story frequency (its stories are reported apart). The locality\'s target is never shrunk to fit the cavity. A pocket is UNCLASSED when this cannot be told (the primary\'s size is unknown, or a proxy longer than the cavity): a run without a story there may be a small pocket, so it stays open rather than counting against the story.',
  story_frequency_rule: 'A run carries the story when an intended protagonist (the primary or an alternate) occurs with its largest unflagged crystal in its record\'s display range, q25–q90, and no longer than the cavity. The scenario should carry it in at least the largest lower occurrence bound among its protagonists that have an engine and a band: the most common protagonist should usually tell the story. Unresolved when no such protagonist exists, or when runs whose protagonist has no known crystal target, or whose pocket is unclassed, could still carry it.',
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

export function buildTargets(root = ROOT) {
  const cmpRaw = fs.readFileSync(CMP, 'utf8');
  const cmp = JSON.parse(cmpRaw);
  if (!cmp.__out_of_claim) throw new Error('compare.json predates the set-aside export; re-run tools/locality-abundance-compare.mjs');
  const data = JSON.parse(fs.readFileSync(path.join(root, DATA_FILE), 'utf8'));
  const ev = buildSizeEvidence(root);
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
      const t = sizeTarget(sev, { minSamples: RULES.size_min_samples, mediumConfidence: RULES.size_medium_confidence, highConfidence: RULES.size_high_confidence });
      if (t.basis === 'crystal' && sev.crystal_series?.largest > 1) t.without_largest_series = sev.crystal_without_largest_series;
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
    // Story frequency: the largest lower band among the protagonists that have an engine and a band.
    const prot = Object.entries(species).filter(([, v]) => (v.role === 'primary' || v.role === 'alternate') && v.engine && v.occurrence_band);
    if (prot.length) {
      const [k, v] = prot.reduce((best, cur) => (cur[1].occurrence_band[0] > best[1].occurrence_band[0] ? cur : best));
      entry.story_frequency = v.occurrence_band[0];
      entry.story_frequency_basis = `rules.story_frequency_rule: ${k} (${v.role}, class ${baseClass(v.literature?.class)}) has the largest lower band, ${v.occurrence_band[0]}`;
    } else {
      entry.story_frequency = null;
      entry.story_frequency_basis = 'unresolved: no protagonist with an engine has an occurrence band';
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
    },
    rules: RULES,
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
