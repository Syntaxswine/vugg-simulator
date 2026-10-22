// The story-pocket scoreboard's pure parts (tools/story-pocket-lib.mjs) and its committed inputs:
// caption sizes, joining one specimen's photographs, size targets, occurrence against a band, size
// conditional on occurrence and on the pocket, roles (alternate protagonists, rare showpieces), unknown
// sizes, small and unclassed pockets, the story run by run and against its frequency, the fleet's
// variety, and the pre-registered sidecar (proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSizeStatements, photoSizes, groupSpecimens, mineralOfWord, summarize, quantile, relativeSpread, deriveRoles,
  protagonistsOf, bandFor, baseClass, sizeTarget, assessOccurrence, fits, pocketClass, assessSize, runStory, scoreStory,
  storyVerdict, assemblageVariety, everySeedChance, validateSidecar,
} from '../tools/story-pocket-lib.mjs';
import { buildSizeEvidence, renderSizeEvidenceMd, APPENDIX_FILE } from '../tools/story-pocket-size-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANDS = { AB: [0.5, 0.95], CO: [0.3, 0.9], UN: [0.1, 0.6], RA: [0.02, 0.3], VR: [0, 0.15] };
const RULES = { minSamples: 5, highConfidence: 30 };
const crystalT = { basis: 'crystal', n: 17, q10: 12, q25: 15, median: 17, q75: 40, q90: 50, confidence: 'medium' };
const proxyT = { basis: 'specimen-proxy', n: 50, q10: 40, q25: 56, median: 76, q75: 95, q90: 130, confidence: 'low' };
const unknownT = { basis: 'unknown', crystal_n: 2, specimen_n: 3 };
const kinds = (text: string) => parseSizeStatements(text).map((s: any) => [s.kind, s.mm]);
const keyOf = (n: string) => ({ 'Tigers Eye': 'tigers_eye', 'Rock Crystal': 'quartz' } as any)[n] ?? n.toLowerCase();

describe('caption sizes (Mineralienatlas wording)', () => {
  it('the nearest cue decides: a crystal of the specimen, a specimen of the crystals', () => {
    expect(kinds('iz. Größe des Kristalles etwa 16 mm x 14 mm. ;')).toEqual([['crystal', 16]]);
    expect(kinds('Kristalle auf Matrix, Größe 5 cm')).toEqual([['specimen', 50]]);
    expect(kinds('Größe: 6 x 3 x 2,5 cm. Der größte Kristall misst etwa 2,5 x 2 cm.')).toEqual([['specimen', 60], ['crystal', 25]]);
    expect(kinds('Calcit ; Kristallgröße: 50 mm; Fundort: Swee')).toEqual([['crystal', 50]]);
    expect(kinds('it XX ; Kalzitkristallgruppe, 17 cm, Elmwood Mine')).toEqual([['specimen', 170]]);
  });
  it('a cue counts only near its number: a crystal edge length does not reach the next specimen', () => {
    expect(kinds('cit xx ; Poona, Indien, links 2,3x1,7x1,4 cm, mitte 4,0x3,1x2,9 cm, Kristalle bis 2,0 cm Kantenlänge, glasklar, rechts mit Calcit 2,4x1,7x1,5 cm, Facettierqual'))
      .toEqual([['specimen', 23], ['specimen', 40], ['crystal', 20], ['specimen', 24]]);
  });
  it('a dealer dimension with no cue is the specimen, labelled ones too; the picture width is neither', () => {
    expect(kinds(', Tsumeb, Oshikoto, Namibia - 9,5 x 6,5 x 3,5 cm ;')).toEqual([['specimen', 95]]);
    expect(kinds('t 150g, Größe = B:57, T:37, H:28mm, Fundort: Ouro')).toEqual([['specimen', 57]]);
    expect(kinds('gion/Tsumeb/Tsumeb Mine, BB = 8,0 mm ;')).toEqual([['fov', 8]]);
    expect(kinds('Heinrichit ; Heinrichit xx, 1,7 mm Bildbr. gelbe')).toEqual([['fov', 1.7]]);
    expect(kinds('Kristalle mit Sphalerit, Bb = 60 mm, Fundort: Elmw')).toEqual([['fov', 60]]);
  });
  it('a cue after the number binds tighter: edge length, crystal height; a crystal group stays a specimen', () => {
    expect(kinds('Fluorit ; Fluorit xx bis 80 mm KL mit Calcitk')).toEqual([['crystal', 80]]);
    expect(kinds('Aquamarin ; ca. 12 cm hoher Kristall')).toEqual([['crystal', 120]]);
    expect(kinds('Calcit ; 8 cm Kristallgruppe')).toEqual([['specimen', 80]]);
  });
  it('drops lens focal lengths, and the find\'s largest crystal ("the cleft held crystals to 20 cm")', () => {
    expect(parseSizeStatements('Aufnahme mit Canon EF 100mm Makro')).toEqual([]);
    expect(parseSizeStatements('ft ; Die Kluft enthält bis zu 20 cm lange, teils d')).toEqual([]);
  });
  it('a crystal\'s width is not its length', () => {
    expect(kinds('er Kristall, Kristallbreite = 11 mm; Fundort: Dass')).toEqual([['width', 11]]);
  });
  it('"hat eine Größe von" takes its subject, also when the caption cut it to a fragment', () => {
    expect(kinds('stall hat eine Größe von etwa 43 mm x 8 mm. ;')).toEqual([['crystal', 43]]);
    expect(kinds('istall hat eine Länge von ca. 17 cm; Indien/Mahara')).toEqual([['crystal', 170]]);
    expect(kinds('z. Er hat eine Größe von etwa 9 mm x 7 mm. ;')).toEqual([['crystal', 9]]);
    expect(kinds('Die Stufe hat eine Größe von etwa 32 mm x 20 mm. ;')).toEqual([['specimen', 32]]);
    // A size noun used as a predicate labels nothing: the cue before it decides.
    expect(kinds('Ein Kristall mit einer Größe von 3 cm')).toEqual([['crystal', 30]]);
    expect(kinds('Eine Stufe mit einer Größe von 5 cm')).toEqual([['specimen', 50]]);
  });
  it('a title naming one crystal makes its "Größe" that crystal\'s — not when it pairs two minerals', () => {
    expect(parseSizeStatements('Gips-Kristall ; Größe: 11 x 6,5 x 12 cm; Fundort: Mina')[0]).toMatchObject({ kind: 'crystal', mm: 120, named: 'Gypsum' });
    expect(kinds('stall mit Endflächen ; Größe: 22.6 x 2.6 x 1.6 cm; Fundort: Naic')).toEqual([['crystal', 226]]);
    expect(kinds('stall und Albit ; Sufengröße: 8x7x4cm; Fundort: Duss')).toEqual([['specimen', 80]]);
    expect(parseSizeStatements('it Quarz-Doppelender ; Größe: 16,8 x 13,6 cm; Fundort: Cruz')[0]).toMatchObject({ kind: 'crystal', named: 'Quartz' });
    expect(kinds('Bergkristall ; Größe: 9 x 7 cm')).toEqual([['specimen', 90]]);
  });
  it('an attributive size goes to its noun; where the noun is cut off, its gender decides', () => {
    expect(kinds('Kupfer ; Etwa 26 mm x 18 mm große Kupferst')).toEqual([['specimen', 26]]);
    expect(kinds('Azurit ; Etwa 40 mm x 17 mm große Stufe mi')).toEqual([['specimen', 40]]);
    expect(parseSizeStatements('Zepterquarz ; Etwa 25 mm x 13 mm großer Zepterq')[0]).toMatchObject({ kind: 'crystal', named: 'Sceptre Quartz' });
    expect(kinds('Beryll ; Dieser etwa 31 mm x 11 mm große prismati')).toEqual([['crystal', 31]]);
    expect(kinds('Rauchquarz ; Diese etwa 78 mm x 56 mm große Rauchqua')).toEqual([['unclassed', 78]]);
    expect(parseSizeStatements('Cerussit ; Bis ca. 30 mm große Cerussit')[0]).toMatchObject({ kind: 'crystal', named: 'Cerussite' });
  });
  it('a crystal length is set aside when it names another mineral, or its line or title is about one', () => {
    expect(parseSizeStatements('luorit ; Galenit Oktaeder bis 1,5 cm Größe auf Quar')[0]).toMatchObject({ kind: 'crystal', mm: 15, named: 'Galena' });
    const calcitePhoto = photoSizes(['und Calcit auf Quarz ; Größe: 17 x 11 x 8 cm, Fluorit-XX max. 15 mm; Fundort: Grov'], 'calcite', { keyOf });
    expect(calcitePhoto).toMatchObject({ crystal: null, specimen: 170, other: 1 });
    const fluoritePhoto = photoSizes(['Fluorit ; Größe: 12 x 13 x 9 cm,Fluorit-XX max. 15 mm; Fundort: Grov'], 'fluorite', { keyOf });
    expect(fluoritePhoto).toMatchObject({ crystal: 15, specimen: 130, other: 0 });
    // A topaz photograph whose title is "Bergkristall": the crystal length is about the quartz.
    expect(photoSizes(['Bergkristall ; Kristallgröße: 22 X 13 X 11 mm; Fundort: Shig'], 'topaz', { keyOf })).toMatchObject({ crystal: null, ambiguous: 1 });
    // "mit Gyrolith" is an associate; a title cut at its start may have lost the subject: the lead keeps it.
    expect(photoSizes(['Calcit mit Gyrolith ; Kristallgröße: 6 mm'], 'calcite', { keyOf })).toMatchObject({ crystal: 6, ambiguous: 0 });
    expect(photoSizes(['it, Gyrolith ; Kristallgröße: 11 mm; Fundort: Mala'], 'calcite', { keyOf })).toMatchObject({ crystal: 11, ambiguous: 0 });
  });
  it('a piece material\'s lengths are pieces, not crystals', () => {
    const p = photoSizes(['Tigerauge, rot gefärbt ; Dieser etwa 13 mm große, rot gef'], 'tigers_eye', { keyOf, piece: true });
    expect(p).toMatchObject({ crystal: null, specimen: 13 });
  });
  it('mineral stems: whole-word stems, compounds, cut-off words', () => {
    expect(mineralOfWord('Goldgelber')).toBeNull();
    expect(mineralOfWord('Gold')).toBe('Gold');
    expect(mineralOfWord('Kupferkies')).toBe('Chalcopyrite');
    expect(mineralOfWord('Kupfer')).toBe('Copper');
    expect(mineralOfWord('Bergkri')).toBe('Rock Crystal');
    expect(mineralOfWord('Fluorapophyllit')).toBe('Apophyllite');
    expect(mineralOfWord('Einzelkristall')).toBeNull();
  });
});

describe('one specimen, one sample', () => {
  const photo = (id: string, windows: string[], key = 'topaz') => ({ id, key, windows });
  it('joins identical captions and the same three-dimension size, whenever uploaded', () => {
    const { groups, joined } = groupSpecimens([
      photo('1000000001', ['Topas ; Größe: 4 x 3 x 2 cm']), photo('1700000000', ['Topas ; Größe: 4 x 3 x 2 cm']),
      photo('1200000000', ['crystal size 5x5x4,8mm']), photo('1500000000', ['Size crystal 5x5x4,8mm; Mogok']),
    ]);
    expect(groups.length).toBe(2);
    expect(joined).toEqual({ caption: 1, dims: 1 });
  });
  it('joins a two-dimension size only in photographs uploaded together', () => {
    const together = groupSpecimens([photo('1648025549', ['Der rechte Kristall ist 16 mm x 12 mm groß.']), photo('1647884454', ['Topas ; 16 mm x 12 mm großer, rosa-v'])]);
    expect(together.groups.length).toBe(1);
    const apart = groupSpecimens([photo('1520005261', ['Fluorit ; Größe: 50 x 45 mm']), photo('1326453956', ['Fluorit ; Größe 50 x 45 mm'])]);
    expect(apart.groups.length).toBe(2);
  });
  it('never joins two species', () => {
    expect(groupSpecimens([photo('1', ['Größe: 4 x 3 x 2 cm'], 'calcite'), photo('2', ['Größe: 4 x 3 x 2 cm'], 'fluorite')]).groups.length).toBe(2);
  });
});

describe('size targets', () => {
  const crystals = summarize([10, 12, 15, 17, 20]);
  const specimens = summarize([40, 50, 60, 70, 80, 90]);
  it('crystal lengths when there are enough', () => {
    expect(sizeTarget({ crystal: crystals, specimen: specimens }, RULES)).toMatchObject({ basis: 'crystal', n: 5, q25: 12, median: 15 });
  });
  it('else the specimen dimensions, labelled a proxy with low confidence', () => {
    expect(sizeTarget({ crystal: summarize([10, 12]), specimen: specimens }, RULES)).toMatchObject({ basis: 'specimen-proxy', n: 6, median: 65, confidence: 'low' });
  });
  it('else unknown — with no number at all, never a default size', () => {
    const t = sizeTarget({ crystal: summarize([10]), specimen: summarize([40]) }, RULES);
    expect(t.basis).toBe('unknown');
    for (const q of ['q10', 'q25', 'median', 'q75', 'q90']) expect(t).not.toHaveProperty(q);
    expect(sizeTarget(undefined, RULES).basis).toBe('unknown');
  });
  it('quantiles interpolate linearly (R-7); spread is the interquartile range over the median', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(summarize([3, 1, 2])).toMatchObject({ n: 3, median: 2, min: 1, max: 3 });
    expect(relativeSpread(summarize([10, 20, 30, 40, 50]))).toBe(20 / 30);
    expect(relativeSpread(summarize([]))).toBeNull();
  });
});

describe('occurrence against its band', () => {
  it('IN, LOW and HIGH, with noise where 21 runs cannot tell', () => {
    expect(assessOccurrence(15, 21, BANDS.AB).verdict).toBe('IN');
    expect(assessOccurrence(0, 21, BANDS.CO)).toMatchObject({ verdict: 'LOW', noise: false });
    expect(assessOccurrence(9, 21, BANDS.AB)).toMatchObject({ verdict: 'LOW', noise: true });
    expect(assessOccurrence(21, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: false });
    expect(assessOccurrence(13, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: true });
  });
  it('no band reaches 100 %: a species in every seed is above it, within noise for 21 seeds', () => {
    expect(assessOccurrence(21, 21, BANDS.AB)).toMatchObject({ verdict: 'HIGH', noise: true });
    expect(assessOccurrence(21, 21, BANDS.CO)).toMatchObject({ verdict: 'HIGH', noise: true });
  });
  it('no band: unresolved, whatever the rate', () => {
    expect(assessOccurrence(21, 21, null).verdict).toBe('UNRESOLVED');
    expect(bandFor('doc', BANDS)).toBeNull();
    expect(bandFor('ND?', BANDS)).toBeNull();
    expect(bandFor('AB-crust', BANDS)).toEqual([0.5, 0.95]);
    expect(baseClass('RA-coating')).toBe('RA');
  });
});

describe('size, conditional on occurrence and on the pocket', () => {
  const run = (occurs: boolean, size: number, span = 90) => ({ occurs, size, span });
  it('judges only the runs where the species occurs', () => {
    expect(assessSize([run(true, 18), run(true, 16), run(false, 0), run(false, 0)], crystalT))
      .toMatchObject({ verdict: 'MEETS', occurring: 2, eligible: 2, inRange: 2, share: 1 });
  });
  it('the median decides, against the record\'s quartiles: BELOW, MEETS, LARGE, OVERSIZE', () => {
    expect(assessSize([run(true, 16), run(true, 10), run(true, 9)], crystalT)).toMatchObject({ verdict: 'BELOW', inRange: 1, eligible: 3 });
    expect(assessSize([run(true, 10), run(true, 15), run(true, 20)], crystalT).verdict).toBe('MEETS');
    expect(assessSize([run(true, 40), run(true, 40)], crystalT).verdict).toBe('MEETS');
    expect(assessSize([run(true, 45), run(true, 45)], crystalT).verdict).toBe('LARGE');
    expect(assessSize([run(true, 50), run(true, 50)], crystalT).verdict).toBe('LARGE');
    expect(assessSize([run(true, 80), run(true, 70)], crystalT)).toMatchObject({ verdict: 'OVERSIZE', inRange: 0 });
  });
  it('a cavity that cannot hold the characteristic crystal is a small pocket, and the target is not shrunk', () => {
    expect(fits(16, crystalT)).toBe(false);
    expect(pocketClass(16, crystalT)).toBe('SMALL');
    expect(pocketClass(17, crystalT)).toBe('STORY-SCALE');
    expect(assessSize([run(true, 5, 16), run(true, 6, 16)], crystalT).verdict).toBe('NO ELIGIBLE POCKET');
    expect(crystalT).toMatchObject({ q25: 15, median: 17 });
  });
  it('the share is of the eligible pockets: small pockets leave both sides of it', () => {
    const r = assessSize([run(true, 5, 16), run(true, 6, 16), run(true, 18, 90), run(true, 20, 90)], crystalT);
    expect(r).toMatchObject({ verdict: 'MEETS', occurring: 4, eligible: 2, inRange: 2, share: 1 });
  });
  it('a crystal longer than the cavity is left out and counted', () => {
    expect(assessSize([run(true, 95, 90), run(true, 18, 90)], crystalT)).toMatchObject({ verdict: 'MEETS', eligible: 1, beyond: 1 });
    expect(assessSize([run(true, 95, 90)], crystalT)).toMatchObject({ verdict: 'LONGER THAN THE CAVITY', beyond: 1 });
  });
  it('against a proxy: below it is no verdict, reaching it cannot test oversize, past its 90th percentile is oversize', () => {
    expect(fits(60, proxyT)).toBeNull();
    expect(pocketClass(60, proxyT)).toBe('UNCLASSED');
    expect(assessSize([run(true, 10, 60)], proxyT).verdict).toBe('ELIGIBILITY UNKNOWN');
    expect(assessSize([run(true, 10, 90)], proxyT).verdict).toBe('BELOW PROXY');
    expect(assessSize([run(true, 60, 200)], proxyT).verdict).toBe('REACHES PROXY');
    expect(assessSize([run(true, 140, 200)], proxyT).verdict).toBe('OVERSIZE');
  });
  it('unknown size: no size verdict and no eligibility', () => {
    expect(assessSize([run(true, 4.9), run(true, 6)], unknownT).verdict).toBe('UNKNOWN');
    expect(fits(300, unknownT)).toBeNull();
    expect(pocketClass(300, unknownT)).toBe('UNCLASSED');
  });
});

describe('roles from the record and the literature', () => {
  const rows = [
    { k: 'fluorite', real: 0.34, lit: 'CO' }, { k: 'calcite', real: 0.26, lit: 'AB' }, { k: 'galena', real: 0.2, lit: 'AB' },
    { k: 'euclase', real: 0.085, lit: 'RA' }, { k: 'hessite', real: 0.08, lit: 'ND?' }, { k: 'barite', real: 0.048, lit: 'CO' },
    { k: 'dolomite', real: 0.01, lit: 'UN' },
  ];
  it('primary, alternates, a rare showpiece, an unsupported wish and the supporting cast', () => {
    expect(deriveRoles(rows, { wantedShare: 0.05 })).toEqual({
      fluorite: 'primary', calcite: 'alternate', galena: 'alternate', euclase: 'showpiece', hessite: 'unsupported', barite: 'companion',
    });
  });
  it('a species set aside as out of scope has no role; the next wanted one leads', () => {
    const r = deriveRoles(rows, { wantedShare: 0.05, setAside: (k: string) => k === 'fluorite' });
    expect(r.fluorite).toBeUndefined();
    expect(r.calcite).toBe('primary');
  });
  it('where the record is thin, the named collectible leads and the rest of the literature is cast', () => {
    expect(deriveRoles([{ k: 'selenite', real: null, lit: 'AB' }, { k: 'halite', real: null, lit: 'AB-crust' }], { wantedShare: 0.05, named: ['selenite'] }))
      .toEqual({ selenite: 'primary', halite: 'companion' });
  });
  it('the protagonists are the primary and the alternates only', () => {
    const roles = deriveRoles(rows, { wantedShare: 0.05 });
    const species = Object.fromEntries(Object.entries(roles).map(([k, role]) => [k, { role, engine: true, size: crystalT }]));
    expect(protagonistsOf(species).map((p: any) => p.k).sort()).toEqual(['calcite', 'fluorite', 'galena']);
  });
  it('a showpiece is held to the rare band, not the protagonists\'', () => {
    expect(bandFor('RA', BANDS)).toEqual([0.02, 0.3]);
    expect(assessOccurrence(3, 21, bandFor('RA', BANDS)).verdict).toBe('IN');
    expect(assessOccurrence(21, 21, bandFor('RA', BANDS))).toMatchObject({ verdict: 'HIGH', noise: false });
  });
});

describe('the story, run by run', () => {
  const sp = (occurs: boolean, size: number) => ({ occurs, size });
  const prot = [{ k: 'fluorite', target: crystalT }, { k: 'calcite', target: proxyT }, { k: 'sphalerite', target: unknownT }];
  const at = (species: any, span = 300) => ({ span, species });
  it('an alternate carries the story when the primary is missing', () => {
    expect(runStory(at({ fluorite: sp(false, 0), calcite: sp(true, 60) }), prot)).toMatchObject({ story: 'YES', basis: 'specimen-proxy', by: 'calcite' });
  });
  it('a crystal target reached outranks a proxy reached', () => {
    expect(runStory(at({ fluorite: sp(true, 16), calcite: sp(true, 60) }), prot)).toMatchObject({ story: 'YES', basis: 'crystal', by: 'fluorite' });
  });
  it('the display range is q25–q90: below it no story, past it oversize', () => {
    expect(runStory(at({ fluorite: sp(true, 14) }), prot).story).toBe('NO');
    expect(runStory(at({ fluorite: sp(true, 50) }), prot).story).toBe('YES');
    expect(runStory(at({ fluorite: sp(true, 60) }), prot)).toMatchObject({ story: 'NO', oversize: true });
  });
  it('no size floor: a protagonist of unknown size, or short of a proxy, keeps the run open even as dust', () => {
    expect(runStory(at({ sphalerite: sp(true, 0.4) }), prot).story).toBe('POSSIBLE');
    expect(runStory(at({ calcite: sp(true, 0.5) }), prot).story).toBe('POSSIBLE');
    expect(runStory(at({ fluorite: sp(true, 0.4) }), prot).story).toBe('NO');
  });
  it('a crystal longer than the cavity neither carries the story nor counts against it', () => {
    expect(runStory(at({ fluorite: sp(true, 30) }, 25), prot)).toMatchObject({ story: 'POSSIBLE', beyond: true });
  });
});

describe('the story of a scenario', () => {
  const run = (span: number, species: any) => ({ span, species });
  const sp = (occurs: boolean, size: number) => ({ occurs, size });
  it('a showpiece never carries it; the same species as an alternate does', () => {
    const base = { fluorite: { role: 'primary', engine: true, size: crystalT } };
    const runs = [run(300, { fluorite: sp(true, 1), euclase: sp(true, 30) })];
    const asShowpiece = scoreStory(runs, { ...base, euclase: { role: 'showpiece', engine: true, size: crystalT } });
    expect(asShowpiece).toMatchObject({ yes_crystal: 0, scored: 1 });
    const asAlternate = scoreStory(runs, { ...base, euclase: { role: 'alternate', engine: true, size: crystalT } });
    expect(asAlternate).toMatchObject({ yes_crystal: 1, by: { euclase: 1 } });
  });
  it('small pockets leave the count; their stories are reported apart', () => {
    const species = { fluorite: { role: 'primary', engine: true, size: crystalT }, calcite: { role: 'alternate', engine: true, size: { ...crystalT, median: 5, q10: 2, q25: 3, q75: 8, q90: 10 } } };
    const c = scoreStory([run(16, { fluorite: sp(true, 2), calcite: sp(true, 6) }), run(16, { fluorite: sp(true, 2), calcite: sp(false, 0) })], species);
    expect(c).toMatchObject({ scored: 0, small: 2, small_yes: 1 });
    expect(storyVerdict({ runs: c.scored, yes: 0, yesCrystal: 0, open: 0, frequency: 0.5 }).verdict).toBe('SMALL POCKETS ONLY');
  });
  it('in an unclassed pocket a run without a story stays open: no NO STORY there', () => {
    const species = { quartz: { role: 'primary', engine: true, size: unknownT }, calcite: { role: 'alternate', engine: true, size: crystalT } };
    const c = scoreStory([run(60, { quartz: sp(false, 0), calcite: sp(true, 2) }), run(60, { quartz: sp(false, 0), calcite: sp(true, 2) })], species);
    expect(c).toMatchObject({ scored: 2, unclassified: 2, pockets: { UNCLASSED: 2 } });
    expect(storyVerdict({ runs: c.scored, yes: 0, yesCrystal: 0, open: c.possible + c.unclassified, frequency: 0.5 }).verdict).toBe('UNRESOLVED');
  });
  it('in a story-scale pocket the same runs are a NO STORY', () => {
    const species = { quartz: { role: 'primary', engine: true, size: crystalT } };
    const c = scoreStory([run(60, { quartz: sp(true, 2) }), run(60, { quartz: sp(true, 2) })], species);
    expect(c).toMatchObject({ scored: 2, unclassified: 0, possible: 0 });
    expect(storyVerdict({ runs: c.scored, yes: 0, yesCrystal: 0, open: 0, frequency: 0.5 }).verdict).toBe('NO STORY');
  });
  it('the verdict against the pre-registered frequency, at its boundaries', () => {
    const v = (runs: number, yes: number, yesCrystal: number, open: number, frequency: number | null) => storyVerdict({ runs, yes, yesCrystal, open, frequency });
    expect(v(20, 10, 10, 0, 0.5).verdict).toBe('STORY');
    expect(v(20, 10, 9, 0, 0.5).verdict).toBe('STORY (PROXY)');
    expect(v(20, 9, 9, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: true });
    expect(v(21, 4, 4, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: false });
    expect(v(20, 9, 9, 1, 0.5).verdict).toBe('UNRESOLVED');
    expect(v(21, 0, 0, 0, 0.5).verdict).toBe('NO STORY');
    expect(v(21, 21, 21, 0, null).verdict).toBe('UNRESOLVED');
    expect(v(0, 0, 0, 0, 0.5).verdict).toBe('SMALL POCKETS ONLY');
  });
});

describe('the fleet\'s variety', () => {
  it('counts distinct assemblages and the commonest one\'s share', () => {
    expect(assemblageVariety([['a', 'b'], ['b', 'a'], ['a']])).toEqual({ distinct: 2, modal_share: 2 / 3 });
    expect(assemblageVariety([['a'], ['a'], ['a']])).toEqual({ distinct: 1, modal_share: 1 });
  });
  it('the chance of every-seed species if each sat at its band\'s ceiling', () => {
    const c = everySeedChance([{ ceiling: 0.95, n: 21 }, { ceiling: 0.9, n: 21 }]);
    expect(c.slots).toBe(2);
    expect(c.log10).toBeCloseTo(21 * Math.log10(0.95) + 21 * Math.log10(0.9), 10);
  });
});

describe('the sidecar\'s validation', () => {
  const good = () => ({
    schema: 'vugg-story-pocket-targets-v1',
    rules: { wanted_share: 0.05, occurrence_bands: { AB: [0.5, 0.95] }, size_min_samples: 5, size_high_confidence: 30 },
    scenarios: { s: { locality: 'l', story_frequency: 0.5, story_frequency_basis: 'rule',
      species: { q: { role: 'primary', occurrence_band: [0.5, 0.95], band_basis: 'AB', size: { ...crystalT, provenance: 'captions' } } } } },
  });
  const problems = (mutate: (x: any) => void) => { const x: any = good(); mutate(x); return validateSidecar(x).join('\n'); };
  it('a good sidecar has no problems', () => expect(validateSidecar(good())).toEqual([]));
  it('names each broken rule', () => {
    expect(problems((x) => { x.schema = 'v0'; })).toMatch(/schema/);
    expect(problems((x) => { x.rules.wanted_share = 1; })).toMatch(/wanted_share/);
    expect(problems((x) => { x.rules.occurrence_bands.AB = [0.6, 0.4]; })).toMatch(/occurrence_bands\.AB/);
    expect(problems((x) => { x.rules.size_high_confidence = 2; })).toMatch(/size_high_confidence/);
    expect(problems((x) => { x.scenarios.s.species.q.role = 'alternate'; })).toMatch(/exactly one primary/);
    expect(problems((x) => { x.scenarios.s.species.q.role = 'hero'; })).toMatch(/unknown role/);
    expect(problems((x) => { delete x.scenarios.s.species.q.band_basis; })).toMatch(/band needs its basis/);
    expect(problems((x) => { x.scenarios.s.species.q.size.basis = 'guess'; })).toMatch(/unknown size basis/);
    expect(problems((x) => { x.scenarios.s.species.q.size.q75 = 1; })).toMatch(/out of order/);
    expect(problems((x) => { x.scenarios.s.species.q.size.n = 1.5; })).toMatch(/size\.n/);
    expect(problems((x) => { delete x.scenarios.s.species.q.size.provenance; })).toMatch(/provenance/);
    expect(problems((x) => { delete x.scenarios.s.story_frequency_basis; })).toMatch(/story_frequency needs its basis/);
    expect(problems((x) => { x.scenarios.s.story_frequency = 2; })).toMatch(/story_frequency must be within/);
  });
});

describe('the committed targets, capture and appendix', () => {
  const sc = JSON.parse(fs.readFileSync(path.join(ROOT, 'proposals', 'DATA-STORY-POCKET-TARGETS-2026-10-22.json'), 'utf8'));
  const species = Object.entries(sc.scenarios).flatMap(([scn, s]: [string, any]) => Object.entries(s.species).map(([k, v]) => ({ scn, loc: s.locality, k, v: v as any })));
  const ev = buildSizeEvidence(ROOT);
  it('the sidecar validates, and no band reaches 100 %', () => {
    expect(validateSidecar(sc)).toEqual([]);
    expect(species.length).toBeGreaterThan(100);
    for (const b of Object.values(sc.rules.occurrence_bands) as number[][]) expect(b[1]).toBeLessThan(1);
  });
  it('every band is the literature class\'s, and no band comes from anywhere else', () => {
    for (const { v } of species) expect(v.occurrence_band).toEqual(v.literature ? bandFor(v.literature.class, sc.rules.occurrence_bands) : null);
  });
  it('every size target is recomputed from the committed capture: sample, quantiles and provenance', () => {
    for (const { loc, k, v } of species) {
      if (v.size.basis === 'unknown') { expect(v.size.median).toBeUndefined(); continue; }
      const t = sizeTarget(ev.localities[loc]?.[k], { minSamples: sc.rules.size_min_samples, highConfidence: sc.rules.size_high_confidence });
      expect({ basis: v.size.basis, n: v.size.n, q25: v.size.q25, median: v.size.median, q90: v.size.q90 }).toEqual({ basis: t.basis, n: t.n, q25: t.q25, median: t.median, q90: t.q90 });
      expect(v.size.n).toBeGreaterThanOrEqual(sc.rules.size_min_samples);
      expect(v.size.provenance).toMatch(/^Mineralienatlas captions/);
    }
  });
  it('the committed size appendix is the audit of the committed capture', () => {
    expect(fs.readFileSync(path.join(ROOT, APPENDIX_FILE), 'utf8')).toBe(renderSizeEvidenceMd(ev));
  });
  it('the photographs round 1 found duplicated count once', () => {
    const joined = (loc: string, a: string, b: string) => ev.joins[loc].some((l: any) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    expect(joined('ouro_preto', '1648025549', '1647884454')).toBe(true);
    expect(joined('mogok', '1729893417', '1437066764')).toBe(true);
  });
});
