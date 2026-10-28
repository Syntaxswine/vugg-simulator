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
  storyVerdict, storyFrequency, scenarioFrequency, displayCoverage, scenarioVerdict, wp1Target, scenarioWp1, cannotFailBeyondNoise,
  assemblageVariety, everySeedChance, validateSidecar, wilson, largestSeries, isFieldLabel, FIELD_LABELS, UPLOADED_TOGETHER, SERIES_GAP,
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
// A seeded generator (mulberry32) and a lognormal population of median 20 mm, skewed as collectors' sizes
// are; a crystal target from a record drawn from it.
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const lognormal = (r: () => number) => () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.exp(Math.log(20) + 0.6 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); };
const crystalTarget = (record: number[]) => ({ ...sizeTarget({ crystal: summarize(record), specimen: { n: 0 } }, { minSamples: 5, mediumConfidence: 10, highConfidence: 30 }), provenance: 'test' });

// The JSON Schema keywords proposals/SCHEMA-STORY-POCKET-TARGETS.json uses (a draft 2020-12 subset):
// type, const, enum, required, properties, additionalProperties, prefixItems, items, minItems, maxItems,
// minimum, maximum, exclusiveMinimum, exclusiveMaximum, oneOf, if/then, $ref into $defs.
const typeOf = (v: any) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v);
function schemaErrors(s: any, v: any, root: any, at = '$'): string[] {
  if (s.$ref) return schemaErrors(s.$ref.replace(/^#\//, '').split('/').reduce((o: any, k: string) => o[k], root), v, root, at);
  if (s.type) {
    const types = [].concat(s.type), t = typeOf(v);
    if (!types.some((x: string) => x === t || (x === 'number' && t === 'integer'))) return [`${at}: ${t}, not ${types.join(' | ')}`];
  }
  const e: string[] = [];
  if ('const' in s && v !== s.const) e.push(`${at}: not ${s.const}`);
  if (s.enum && !s.enum.includes(v)) e.push(`${at}: ${v} is not one of ${s.enum.join(', ')}`);
  if (typeof v === 'number') {
    if (s.minimum != null && v < s.minimum) e.push(`${at}: below ${s.minimum}`);
    if (s.maximum != null && v > s.maximum) e.push(`${at}: above ${s.maximum}`);
    if (s.exclusiveMinimum != null && v <= s.exclusiveMinimum) e.push(`${at}: not above ${s.exclusiveMinimum}`);
    if (s.exclusiveMaximum != null && v >= s.exclusiveMaximum) e.push(`${at}: not below ${s.exclusiveMaximum}`);
  }
  if (typeOf(v) === 'object') {
    for (const k of s.required || []) if (!(k in v)) e.push(`${at}.${k}: missing`);
    for (const [k, x] of Object.entries(v)) {
      if (s.properties?.[k]) e.push(...schemaErrors(s.properties[k], x, root, `${at}.${k}`));
      else if (s.additionalProperties === false) e.push(`${at}.${k}: not in the schema`);
      else if (s.additionalProperties && typeof s.additionalProperties === 'object') e.push(...schemaErrors(s.additionalProperties, x, root, `${at}.${k}`));
    }
  }
  if (Array.isArray(v)) {
    if (s.minItems != null && v.length < s.minItems) e.push(`${at}: fewer than ${s.minItems} items`);
    if (s.maxItems != null && v.length > s.maxItems) e.push(`${at}: more than ${s.maxItems} items`);
    (s.prefixItems || []).forEach((p: any, i: number) => { if (i < v.length) e.push(...schemaErrors(p, v[i], root, `${at}[${i}]`)); });
    if (s.items) v.slice((s.prefixItems || []).length).forEach((x: any, i: number) => e.push(...schemaErrors(s.items, x, root, `${at}[${i}]`)));
  }
  if (s.oneOf && s.oneOf.filter((o: any) => !schemaErrors(o, v, root, at).length).length !== 1) e.push(`${at}: not exactly one of its oneOf`);
  if (s.if && s.then && !schemaErrors(s.if, v, root, at).length) e.push(...schemaErrors(s.then, v, root, at));
  return e;
}

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
  it('drops lens focal lengths, a vein\'s thickness, and the find\'s largest crystal ("the cleft held crystals to 20 cm")', () => {
    expect(parseSizeStatements('Aufnahme mit Canon EF 100mm Makro')).toEqual([]);
    expect(parseSizeStatements('abgesetzt. Der Gang ist etwa 60 cm mächtig. ;')).toEqual([]);
    expect(parseSizeStatements('ft ; Die Kluft enthält bis zu 20 cm lange, teils d')).toEqual([]);
  });
  it('a width is not a length, a crystal\'s or a specimen\'s', () => {
    expect(kinds('er Kristall, Kristallbreite = 11 mm; Fundort: Dass')).toEqual([['width', 11]]);
    expect(kinds('uchquarz-Doppelender ; Größe: 7 cm breit; Fundort')).toEqual([['width', 70]]);
    expect(kinds('Kleinstufe mit Kristallen ; 6cm breit')).toEqual([['width', 60]]);
  });
  it('"Krisalle" (a typo) is a crystal; a diameter is a width, not a length — but a tabular crystal\'s or a rose\'s is its size', () => {
    expect(kinds('; rhomboedrische Krisalle bis 1cm auf Matrix; Fu')).toEqual([['crystal', 10]]);
    expect(kinds('Calcit auf Fluorit ; Größe: 17 x 14 x 8 cm, Calcit-XX max. 45 mm Durchmesser; F')).toEqual([['specimen', 170], ['width', 45]]);
    expect(kinds('er mit gekrümmten Flächen bis 1 cm Durchmesser; d')).toEqual([['width', 10]]);
    expect(kinds('Calcit-XX bis 45 mm Ø; F')).toEqual([['width', 45]]);
    expect(kinds('calcite crystals to 45 mm diameter; F')).toEqual([['width', 45]]);
    expect(kinds('be tafelige Kristalle bis ca. 2 mm Durchmesser, auf Quarz')).toEqual([['crystal', 2]]);
    expect(kinds('ichen "Eisenrosen" von bis zu 19 mm Durchmesser. F')).toEqual([['aggregate', 19]]);
  });
  it('a size in three dimensions is never the picture\'s ("Ausschnitt" after it marks a detail of the specimen)', () => {
    expect(kinds('Stilbit ; Stilbit 40x35x20 mm Ausschnitt Ind')).toEqual([['specimen', 40]]);
    expect(kinds('Kristalle mit Sphalerit, Bb = 60 mm, Fundort: Elmw')).toEqual([['fov', 60]]);
  });
  it('a rosette cut to "…ette" at the stretch\'s start is an aggregate, and every rounded or tabular form\'s diameter is its size', () => {
    expect(kinds('ette von cyanblauer Farbe und 16 mm Durchmesser au')).toEqual([['aggregate', 16]]);
    // Cut a letter or two earlier ("R|osette", "Ro|sette"), the fragment is the same rosette.
    expect(kinds('sette von cyanblauer Farbe und 16 mm Durchmesser au')).toEqual([['aggregate', 16]]);
    expect(kinds('osetten von cyanblauer Farbe, 16 mm Durchmesser')).toEqual([['aggregate', 16]]);
    for (const form of ['tafelige Kristalle', 'Plättchen', 'tabular crystals', 'Rosetten', 'Eisenrosen', 'Kugeln', 'Sphärolithe', 'spheres', 'Scheiben', 'discs', 'disks']) {
      expect(parseSizeStatements(`${form} bis 5 mm Durchmesser`)[0].kind, form).not.toBe('width');
    }
  });
  it('"(Spinell 4 mm)": one length right after a mineral\'s name in parentheses is its crystal', () => {
    expect(parseSizeStatements('nell ; Mogok, Myanmar Burma - 25 x 2 cm (Spinell 4 mm) ;').map((s: any) => [s.kind, s.mm, s.named])).toEqual([['specimen', 250, null], ['crystal', 4, 'Spinel']]);
    expect(kinds('(Fluorit 5 x 4 cm)')).toEqual([['specimen', 50]]);
    expect(kinds('Calcit (Größe 4 mm)')).toEqual([['specimen', 4]]);
  });
  it('"x, ca. 3 cm hoch" is a crystal; a pseudomorph is the mineral it is made of', () => {
    expect(parseSizeStatements('n Malachit nach Azurit x, ca. 3 cm hoch; Fundort:')[0]).toMatchObject({ kind: 'crystal', mm: 30, named: 'Malachite' });
  });
  it('micromount "Größe" lengths are set aside from the specimen sizes, under a stated minimum', () => {
    expect(photoSizes(['Malachit ; Größe: 4,2 mm; Fundort: Tsum'], 'malachite', { keyOf, minSpecimenMm: 10 })).toMatchObject({ specimen: null, micro: 1 });
    expect(photoSizes(['Malachit ; Größe: 4,2 mm; Fundort: Tsum'], 'malachite', { keyOf })).toMatchObject({ specimen: 4.2, micro: 0 });
    expect(photoSizes(['Malachit ; Größe: 12 mm; Fundort: Tsum'], 'malachite', { keyOf, minSpecimenMm: 10 })).toMatchObject({ specimen: 12 });
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
  it('a stretch cut into "…gkristall" (Bergkristall) names no crystal; a whole word, or a crystal word after it, still does', () => {
    expect(kinds('gkristall-Gwindel; Größe: ca. 3 x 2,5 x 0,9 cm; Fundort: Ober')).toEqual([['specimen', 30]]);
    expect(kinds('gkristall-Doppelender; Größe: 3 x 2 cm')).toEqual([['crystal', 30]]);
    expect(kinds('Einkristall ; Größe: 2 cm')).toEqual([['crystal', 20]]);
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
    // Only a word cut at a stretch's end is read as the start of a stem; a whole word never is.
    expect(mineralOfWord('Bergkri', { cut: true })).toBe('Rock Crystal');
    expect(mineralOfWord('Bergkri')).toBeNull();
    // Five letters at least: "Rauch" is read, "Topa" is not.
    expect(mineralOfWord('Rauch', { cut: true })).toBe('Smoky Quartz');
    expect(mineralOfWord('Topa', { cut: true })).toBeNull();
    expect(mineralOfWord('groß')).toBeNull();
    expect(mineralOfWord('Smith')).toBeNull();
    expect(mineralOfWord('Spinel')).toBe('Spinel');
    expect(mineralOfWord('Fluorapophyllit')).toBe('Apophyllite');
    expect(mineralOfWord('Einzelkristall')).toBeNull();
  });
});

describe('one specimen, one sample', () => {
  const photo = (id: string, windows: string[], key = 'topaz') => ({ id, key, windows });
  it('joins identical captions, or the same size, in photographs uploaded together', () => {
    const { groups, joined } = groupSpecimens([
      photo('1309525108', ['Fluorit ; Größe: 14 x 12 mm']), photo('1309524762', ['Fluorit ; Größe: 14 x 12 mm']),
      photo('1648025549', ['Der rechte Kristall ist 16 mm x 12 mm groß.']), photo('1647884454', ['Topas ; 16 mm x 12 mm großer, rosa-v']),
    ]);
    expect(groups.length).toBe(2);
    expect(joined).toEqual({ caption: 1, dims: 1 });
  });
  it('uploaded apart, only a measured three-dimension size joins: not a generic caption, a round size or a two-dimension one', () => {
    expect(groupSpecimens([photo('1200000000', ['crystal size 5x5x4,8mm']), photo('1500000000', ['Size crystal 5x5x4,8mm; Mogok'])]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1350000000', ['Zeunerit xx, BB 4,5 mm']), photo('1420000000', ['Zeunerit xx, BB 4,5 mm'])]).groups.length).toBe(2);
    expect(groupSpecimens([photo('1352231397', ['Crystal size 5x5x4mm']), photo('1650041301', ['crystal size 5x5x4mm'])]).groups.length).toBe(2);
    expect(groupSpecimens([photo('1520005261', ['Fluorit ; Größe: 50 x 45 mm']), photo('1326453956', ['Fluorit ; Größe 50 x 45 mm'])]).groups.length).toBe(2);
    // Measured, but in two dimensions only.
    expect(groupSpecimens([photo('1200000000', ['Größe: 15,5 x 12 mm']), photo('1500000000', ['Größe: 15,5 x 12 mm; Mogok'])]).groups.length).toBe(2);
  });
  it('an aggregate\'s size joins like a crystal\'s or the specimen\'s', () => {
    expect(groupSpecimens([photo('1300000000', ['Calcit-Rosette 3 x 2 cm'], 'calcite'), photo('1300000500', ['Calcit-Rosette, 3 x 2 cm; Fundort: Elmw'], 'calcite')]).groups.length).toBe(1);
  });
  it('a picture\'s size joins no specimens', () => {
    expect(groupSpecimens([photo('1300000000', ['Bildgröße: 8 x 6 mm; Kristall 5 mm']), photo('1300086400', ['Bildgröße: 8 x 6 mm; Kristall 9 mm'])]).groups.length).toBe(2);
  });
  it('a caption that states only a picture\'s size joins nothing, even uploaded together (round 7: a micromounter\'s batch, Wittichen\'s "BB 4,5mm")', () => {
    const bb = ['Erythrit, BB 4,5mm'];
    expect(groupSpecimens([photo('1300000000', bb, 'erythrite'), photo('1300050000', bb, 'erythrite'), photo('1300090000', bb, 'erythrite')]).groups.length).toBe(3);
    // The same picture width beside a specimen's size: the caption describes the specimen, and joins.
    const both = ['Erythrit, BB 4,5mm; Stufe 3 cm'];
    expect(groupSpecimens([photo('1300000000', both, 'erythrite'), photo('1300050000', both, 'erythrite')])).toMatchObject({ joined: { caption: 1, dims: 0 } });
    // A caption whose only length is dropped (a lens) states no picture size either: it joins as before.
    const lens = ['Fluorit ; Makro 100 mm'];
    expect(parseSizeStatements(lens[0])).toEqual([]);
    expect(groupSpecimens([photo('1300000000', lens, 'fluorite'), photo('1300050000', lens, 'fluorite')]).groups.length).toBe(1);
  });
  it('a size written with a decimal is measured, in centimetres as in millimetres, with a comma or a point', () => {
    expect(groupSpecimens([photo('1200000000', ['crystal size 5x5x4.8mm']), photo('1500000000', ['Size crystal 5x5x4.8mm; Mogok'])]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1264324998', ['pophyllit, Skolezit, Stilbit, 15,9 x 10 x 4,7 cm, Bildbreite ca. 58 mm. Detail von Bi'], 'apophyllite'),
      photo('1246092168', [' Stilbit, Ahmadnagar, Indien, 15,9 x 10 x 4,7 cm. ;'], 'apophyllite')]).groups.length).toBe(1);
  });
  it('the same caption once a cut word, punctuation and "mit", "und", "auf" are dropped', () => {
    expect(groupSpecimens([photo('1298577983', ['it, Gyrolith ; Kristallgröße: 6 mm; Fundort: Mala'], 'calcite'), photo('1298576363', [' mit Gyrolith; Kristallgröße: 6 mm; Fundort: Mala'], 'calcite')]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1298577983', ['Calcit ; Kristallgröße: 6 mm'], 'calcite'), photo('1298576363', ['Calcit ; Kristallgröße: 7 mm'], 'calcite')]).groups.length).toBe(2);
    expect(groupSpecimens([photo('1298577983', ['Calcit und Gyrolith ; Kristallgröße: 6 mm'], 'calcite'), photo('1298576363', ['Calcit, Gyrolith ; Kristallgröße: 6 mm'], 'calcite')]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1298577983', ['Calcit auf Gyrolith ; Kristallgröße: 6 mm'], 'calcite'), photo('1298576363', ['Calcit, Gyrolith ; Kristallgröße: 6 mm'], 'calcite')]).groups.length).toBe(1);
  });
  it('photographs that each name a mineral the other does not are two specimens; the lead counts as named in both', () => {
    expect(groupSpecimens([photo('1671709103', [' mit etwas Limonit, Größe ca. 6 x 4 cm ;'], 'fluorite'), photo('1671708672', [' mit etwas Hämatit, Größe ca. 4 x 6 cm, Fund von 2018'], 'fluorite')]).groups.length).toBe(2);
    const ap = (id: string, w: string) => ({ id, key: 'apophyllite', lead: 'Hydroxyapophyllite-(K)', windows: [w] });
    expect(groupSpecimens([ap('1322115131', 'th, Apophyllit-(KOH) ; Größe: 11 x 10 cm; Fundort: Pash'), ap('1322115071', 'yllit-(KOH), Stilbit ; Größe: 11 x 10 cm; Fundort: Pash')]).groups.length).toBe(1);
    // A mineral's name cut at a stretch's end still counts: smoky quartz against fluorite.
    expect(groupSpecimens([photo('1300000000', ['Calcit ; Größe 5 x 4 cm; Rauchqu'], 'calcite'), photo('1300000100', ['Calcit ; Größe 5 x 4 cm; Fluorit'], 'calcite')]).groups.length).toBe(2);
    // "groß" names no mineral (not grossular), so round 1's Ouro Preto pair still joins.
    expect(groupSpecimens([photo('1648025549', ['lien. Der rechte Kristall ist 16 mm x 12 mm groß. ;']), photo('1647884454', ['Topas ; 16 mm x 12 mm großer, rosa-v'])]).groups.length).toBe(1);
  });
  it('the window is an option (the scoreboard\'s sensitivity table varies it)', () => {
    const cap = ['Zeunerit xx, Stufe 3 cm'];
    expect(groupSpecimens([photo('1300000000', cap), photo('1300050000', cap)]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1300000000', cap), photo('1300050000', cap)], { window: 1e4 }).groups.length).toBe(2);
    expect(groupSpecimens([photo('1300000000', cap), photo('1900000000', cap)], { window: Infinity }).groups.length).toBe(1);
  });
  it('never joins photographs from different finds, or of two species', () => {
    expect(groupSpecimens([photo('1310050913', ['Größe: 12 x 13 x 9,5 cm; Fundort: Grove Rake']), photo('1310050900', ['Größe: 13 x 12 x 9,5 cm; Fundort: Blackdene'])], ).groups.length).toBe(2);
    expect(groupSpecimens([photo('1', ['Größe: 4 x 3 x 2 cm'], 'calcite'), photo('2', ['Größe: 4 x 3 x 2 cm'], 'fluorite')]).groups.length).toBe(2);
  });
  it('a find named in one caption only is no conflict', () => {
    expect(groupSpecimens([photo('1200000000', ['crystal size 5x5x4,8mm; Fundort: Grove Rake']), photo('1500000000', ['Size crystal 5x5x4,8mm'])]).groups.length).toBe(1);
    expect(groupSpecimens([photo('1200000000', ['crystal size 5x5x4,8mm; Fundort: Grove Rake']), photo('1500000000', ['Size crystal 5x5x4,8mm; Fundort: Blackdene'])]).groups.length).toBe(2);
  });
  it('the upload window is exclusive', () => {
    const cap = ['Zeunerit xx, Stufe 3 cm'];
    expect(groupSpecimens([photo('1300000000', cap), photo(String(1300000000 + UPLOADED_TOGETHER), cap)]).groups.length).toBe(2);
    expect(groupSpecimens([photo('1300000000', cap), photo(String(1300000000 + UPLOADED_TOGETHER - 1), cap)]).groups.length).toBe(1);
  });
});

describe('a series: one wording, uploaded in one stretch', () => {
  it('a standard caption field is everyone\'s wording: only photographs uploaded together make a series of it', () => {
    expect([isFieldLabel('pophyllit;Größe:#'), isFieldLabel('Rubin;Größe:#'), isFieldLabel('Kristallgröße:#'), isFieldLabel('Größeca.#')]).toEqual([true, true, true, true]);
    expect([isFieldLabel('Etwa#großer'), isFieldLabel('m,Fluorit-XXmax.#'), isFieldLabel('eineGrößevonetwa#.')]).toEqual([false, false, false]);
    const at = (key: string, days: number) => ({ value: days, key, t: 1.3e9 + days * 86400 });
    const month = [0, 30, 60, 90];
    expect(largestSeries(month.map((d) => at('Rubin;Größe:#', d)), SERIES_GAP, { fieldGap: UPLOADED_TOGETHER }).largest).toBe(1);
    expect(largestSeries(month.map((d) => at('Etwa#großer', d)), SERIES_GAP, { fieldGap: UPLOADED_TOGETHER }).largest).toBe(4);
    // Uploaded the same day, a field label is a batch: Mogok's four rubies.
    expect(largestSeries([0, 0.2, 0.5, 0.9].map((d) => at('Rubin;Größe:#', d)), SERIES_GAP, { fieldGap: UPLOADED_TOGETHER }).largest).toBe(4);
    // A bare length is everyone's wording too (round 7: Tsumeb's mimetite chained 7 of 27 over 70 days).
    expect(largestSeries(month.map((d) => at('#', d)), SERIES_GAP, { fieldGap: UPLOADED_TOGETHER }).largest).toBe(1);
  });
  it('the field labels are registered words, each ending a wording with an optional ":", "=" or "." and "ca." or "etwa" (round 7)', () => {
    expect(FIELD_LABELS).toEqual(['größe', 'grösse', 'groesse', 'size', 'maße', 'masse', 'abmessungen', 'dimension', 'dimensions']);
    // A bare length is any wording with no letters: "#", "#." (round 8), ";#".
    for (const key of ['Größe:#', 'Grösse:#', 'Groesse#', 'Size#', 'Maße:#', 'Masse:#', 'Abmessungen:#', 'Dimension:#', 'Dimensions=#', 'Kristallgröße:ca.#', 'Größe:etwa#', '#', '#.', ';#']) expect(isFieldLabel(key), key).toBe(true);
    for (const key of ['Fluorit-XXmax.#', 'Stufe#', '#Stufe', 'Größenordnung#', 'Massiv#']) expect(isFieldLabel(key), key).toBe(false);
  });
  const day = 86400;
  const it_ = (value: number, key: string, days: number) => ({ value, key, t: 1.3e9 + days * day });
  it('chains a wording\'s uploads while each follows the last by less than the gap', () => {
    const s = largestSeries([it_(10, 'a', 0), it_(11, 'a', 100), it_(12, 'a', 200), it_(13, 'a', 300), it_(20, 'b', 0), it_(21, 'b', 1000)], SERIES_GAP);
    expect(s).toMatchObject({ largest: 4, of: 6, template: 'a', first: 1.3e9, last: 1.3e9 + 300 * day });
    expect(s.rest.sort()).toEqual([20, 21]);
  });
  it('a gap of a year or more splits one wording into two series; the larger counts', () => {
    const s = largestSeries([it_(1, 'a', 0), it_(2, 'a', 10), it_(3, 'a', 400), it_(4, 'a', 410), it_(5, 'a', 420)], SERIES_GAP);
    expect(s).toMatchObject({ largest: 3, first: 1.3e9 + 400 * day });
    expect(s.rest.sort()).toEqual([1, 2]);
    expect(largestSeries([it_(1, 'a', 0), { value: 2, key: 'a', t: 1.3e9 + SERIES_GAP }], SERIES_GAP).largest).toBe(1);
    expect(largestSeries([it_(1, 'a', 0), { value: 2, key: 'a', t: 1.3e9 + SERIES_GAP - 1 }], SERIES_GAP).largest).toBe(2);
    // Chained from upload to upload, not measured from the first: 600 days in all, 300 between each.
    expect(largestSeries([it_(1, 'a', 0), it_(2, 'a', 300), it_(3, 'a', 600)], SERIES_GAP).largest).toBe(3);
  });
  it('ties go to the wording first alphabetically; no lengths, no series', () => {
    expect(largestSeries([it_(1, 'b', 0), it_(2, 'b', 1), it_(3, 'a', 0), it_(4, 'a', 1)], SERIES_GAP).template).toBe('a');
    expect(largestSeries([], SERIES_GAP)).toBeNull();
  });
});

describe('a contributor\'s wording', () => {
  const series = (text: string) => parseSizeStatements(text)[parseSizeStatements(text).length - 1].series;
  it('one wording with the numbers taken out, "bis" or not', () => {
    expect(series('Fluorit ; Größe: 12 x 13 x 9 cm,Fluorit-XX max. 15 mm; Fundort: Grov')).toBe(series('Fluorit auf Limonit ; Größe: 25 x 18 x 8 cm, Fluorit-XX bis max. 17 mm; Fundort: Heig'));
    expect(series('Rauchquarz ; Etwa 31 mm x 19 mm großer Rauchqu')).toBe(series('Quarz ; Etwa 27 mm x 14 mm großer, mattie'));
    expect(series('Fluorit ; Kristallgröße: 10 mm; Fundort: Zing')).not.toBe(series('Rauchquarz ; Etwa 31 mm x 19 mm großer Rauchqu'));
  });
  it('a crystal target dominated by one series is one step less confident, and says so', () => {
    const ev = (largest: number) => ({ crystal: summarize([10, 12, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30]), specimen: { n: 0 }, crystal_series: { largest, of: 12, template: 't' } });
    const opts = { minSamples: 5, mediumConfidence: 10, highConfidence: 30 };
    expect(sizeTarget(ev(6), opts)).toMatchObject({ basis: 'crystal', confidence: 'medium', series: { largest: 6 } });
    expect(sizeTarget(ev(7), opts)).toMatchObject({ basis: 'crystal', confidence: 'low' });
  });
  it('a specimen proxy records its series too (round 5: Mogok\'s ruby), and stays low confidence', () => {
    const ev = { crystal: summarize([10]), specimen: summarize([20, 22, 24, 26, 28, 30]), specimen_series: { largest: 4, of: 6, template: 'Rubin;Größe:#', days: 1 } };
    expect(sizeTarget(ev, { minSamples: 5, mediumConfidence: 10, highConfidence: 30 })).toMatchObject({ basis: 'specimen-proxy', confidence: 'low', series: { largest: 4, of: 6 } });
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
  it('confidence: low below the medium count, medium below the high count, high from it', () => {
    const at = (n: number) => sizeTarget({ crystal: summarize(Array.from({ length: n }, (_, i) => 10 + i)), specimen: { n: 0 } }, { minSamples: 5, mediumConfidence: 10, highConfidence: 30 }).confidence;
    expect([at(5), at(9), at(10), at(29), at(30)]).toEqual(['low', 'low', 'medium', 'medium', 'high']);
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
  it('IN, LOW and HIGH, with noise where 21 runs cannot tell; the band\'s ends are in it', () => {
    expect(assessOccurrence(15, 21, BANDS.AB).verdict).toBe('IN');
    expect(assessOccurrence(19, 20, BANDS.AB).verdict).toBe('IN');
    expect(assessOccurrence(10, 20, BANDS.AB).verdict).toBe('IN');
    expect(assessOccurrence(0, 21, BANDS.CO)).toMatchObject({ verdict: 'LOW', noise: false });
    expect(assessOccurrence(9, 21, BANDS.AB)).toMatchObject({ verdict: 'LOW', noise: true });
    expect(assessOccurrence(21, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: false });
    expect(assessOccurrence(13, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: true });
  });
  it('no band reaches 100 %: a species in every seed is above it, within noise for 21 seeds', () => {
    expect(assessOccurrence(21, 21, BANDS.AB)).toMatchObject({ verdict: 'HIGH', noise: true });
    expect(assessOccurrence(21, 21, BANDS.CO)).toMatchObject({ verdict: 'HIGH', noise: true });
  });
  it('the noise test is the 95 % Wilson interval (10 of 21: 0.2834–0.6763, worked by hand)', () => {
    const [lo, hi] = wilson(10, 21);
    expect(lo).toBeCloseTo(0.2834, 4);
    expect(hi).toBeCloseTo(0.6763, 4);
    expect(wilson(0, 21)[0]).toBe(0);
    expect(wilson(21, 21)[1]).toBeCloseTo(1, 12);
    expect(wilson(0, 0)).toEqual([0, 1]);
    // The interval's z is a registered rule (rules.noise_z): a narrower interval calls fewer misses noise.
    expect(assessOccurrence(9, 21, BANDS.AB, 1.96).noise).toBe(true);
    expect(assessOccurrence(9, 21, BANDS.AB, 0.5).noise).toBe(false);
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
  it('the median decides, not the mean', () => {
    // median 13 < q25 15, mean 34: a skewed sample.
    expect(assessSize([run(true, 10, 300), run(true, 10, 300), run(true, 16, 300), run(true, 100, 300)], crystalT)).toMatchObject({ verdict: 'BELOW', eligible: 4, sizes: { median: 13 } });
  });
  it('the share counts the record\'s display range, q25–q90, both ends in', () => {
    // 15 (= q25) and 45 (between q75 and q90) are in the range; 14 and 51 are not.
    expect(assessSize([run(true, 15), run(true, 45), run(true, 14), run(true, 51)], crystalT)).toMatchObject({ inRange: 2, eligible: 4, share: 0.5 });
    expect(assessSize([run(true, 50)], crystalT)).toMatchObject({ inRange: 1 });
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
  it('a crystal longer than the cavity is left out and counted; one exactly as long as its span is in', () => {
    expect(assessSize([run(true, 95, 90), run(true, 18, 90)], crystalT)).toMatchObject({ verdict: 'MEETS', eligible: 1, beyond: 1 });
    expect(assessSize([run(true, 95, 90)], crystalT)).toMatchObject({ verdict: 'LONGER THAN THE CAVITY', beyond: 1 });
    expect(assessSize([run(true, 18, 18)], crystalT)).toMatchObject({ verdict: 'MEETS', eligible: 1, beyond: 0 });
  });
  it('against a proxy: below it is no verdict, reaching it cannot test oversize, past its 90th percentile is oversize', () => {
    expect(fits(60, proxyT)).toBeNull();
    expect(pocketClass(60, proxyT)).toBe('UNCLASSED');
    expect(assessSize([run(true, 10, 60)], proxyT).verdict).toBe('ELIGIBILITY UNKNOWN');
    expect(assessSize([run(true, 10, 90)], proxyT).verdict).toBe('BELOW PROXY');
    expect(assessSize([run(true, 60, 200)], proxyT).verdict).toBe('REACHES PROXY');
    expect(assessSize([run(true, 100, 200)], proxyT).verdict).toBe('REACHES PROXY');
    expect(assessSize([run(true, 130, 200)], proxyT).verdict).toBe('REACHES PROXY');
    expect(assessSize([run(true, 140, 200)], proxyT).verdict).toBe('OVERSIZE');
  });
  it('a miss its runs cannot tell from the window is noise: a sign test on the runs past its near edge (round 7)', () => {
    // k of 21 runs reach q25 (15 mm), the rest are at 10: the median is below q25 either way.
    const below = (k: number) => Array.from({ length: 21 }, (_, i) => run(true, i < k ? 16 : 10));
    expect(assessSize(below(2), crystalT)).toMatchObject({ verdict: 'BELOW', noise: false });
    expect(assessSize(below(8), crystalT)).toMatchObject({ verdict: 'BELOW', noise: true });
    // One run cannot tell: its interval spans most of 0–1.
    expect(assessSize([run(true, 5)], crystalT)).toMatchObject({ verdict: 'BELOW', noise: true });
    // Above the window, the runs at or under q75 (40 mm); a proxy's oversize against its q90 (130 mm).
    const large = (k: number) => Array.from({ length: 21 }, (_, i) => run(true, i < k ? 30 : 45));
    expect(assessSize(large(2), crystalT)).toMatchObject({ verdict: 'LARGE', noise: false });
    expect(assessSize(large(8), crystalT)).toMatchObject({ verdict: 'LARGE', noise: true });
    expect(assessSize(Array.from({ length: 21 }, () => run(true, 80)), crystalT)).toMatchObject({ verdict: 'OVERSIZE', noise: false });
    expect(assessSize(Array.from({ length: 21 }, (_, i) => run(true, i < 8 ? 45 : 80)), crystalT)).toMatchObject({ verdict: 'OVERSIZE', noise: false });
    expect(assessSize(Array.from({ length: 21 }, (_, i) => run(true, i < 8 ? 30 : 80)), crystalT)).toMatchObject({ verdict: 'OVERSIZE', noise: true });
    expect(assessSize(Array.from({ length: 21 }, (_, i) => run(true, i < 8 ? 120 : 140, 200)), proxyT)).toMatchObject({ verdict: 'OVERSIZE', noise: true });
    expect(assessSize(Array.from({ length: 21 }, (_, i) => run(true, i < 2 ? 120 : 140, 200)), proxyT)).toMatchObject({ verdict: 'OVERSIZE', noise: false });
    // MEETS and REACHES PROXY miss nothing; BELOW PROXY is no verdict: none of them has a noise mark.
    expect(assessSize([run(true, 18)], crystalT)).not.toHaveProperty('noise');
    expect(assessSize([run(true, 100, 200)], proxyT)).not.toHaveProperty('noise');
    expect(assessSize([run(true, 10, 90)], proxyT)).not.toHaveProperty('noise');
    // The interval's z reaches it: at z 1, 8 of 21 runs at scale no longer leave it in doubt.
    expect(assessSize(below(8), crystalT, 1)).toMatchObject({ verdict: 'BELOW', noise: false });
    // A run exactly at q25 reaches the window; an interval that tops out at exactly one half still reaches
    // it (0 of 4 at z 2: 4 / (4 + 4) = 0.5).
    expect(assessSize(Array.from({ length: 21 }, (_, i) => run(true, i < 8 ? 15 : 10)), crystalT)).toMatchObject({ verdict: 'BELOW', noise: true });
    expect(assessSize(Array.from({ length: 4 }, () => run(true, 10)), crystalT, 2)).toMatchObject({ verdict: 'BELOW', noise: true });
  });
  it('three eligible runs or fewer are too few to tell any miss at z 1.96, so too few to judge the size either way (round 8)', () => {
    for (const k of [1, 2, 3]) expect(assessSize(Array.from({ length: k }, () => run(true, 5)), crystalT), `k ${k}`).toMatchObject({ verdict: 'BELOW', noise: true, few: true });
    expect(assessSize(Array.from({ length: 4 }, () => run(true, 5)), crystalT)).toMatchObject({ verdict: 'BELOW', noise: false });
    expect(assessSize(Array.from({ length: 4 }, () => run(true, 5)), crystalT)).not.toHaveProperty('few');
    // A MEETS on three runs is too few as well: runs that could not have failed it cannot confirm it.
    expect(assessSize(Array.from({ length: 3 }, () => run(true, 18)), crystalT)).toMatchObject({ verdict: 'MEETS', few: true });
    // At z 1 only a single run is too few (1 / (1 + 1) = 0.5).
    expect(assessSize([run(true, 5)], crystalT, 1)).toMatchObject({ few: true });
    expect(assessSize([run(true, 5), run(true, 5)], crystalT, 1)).not.toHaveProperty('few');
  });
  it('the noise counts the eligible runs, not every run where the species occurs (round 8)', () => {
    // 8 eligible runs at 10 mm; 13 more at 16 mm in a cavity too small to hold the median (16 < 17).
    const runs = [...Array.from({ length: 8 }, () => run(true, 10, 90)), ...Array.from({ length: 13 }, () => run(true, 16, 16))];
    expect(assessSize(runs, crystalT)).toMatchObject({ verdict: 'BELOW', noise: false, eligible: 8, occurring: 21 });
  });
  it('a small record\'s own middle half often misses its population\'s median, and more runs do not help: the figures §1.3 states (round 8)', () => {
    const r = rng(23), draw = lognormal(r);
    // The record's middle half against the population's median (20 mm): about 38 %, 19 % and 5 % missed.
    for (const [n, lo, hi] of [[5, 0.33, 0.43], [8, 0.15, 0.23], [17, 0.03, 0.07]] as const) {
      let miss = 0;
      for (let t = 0; t < 4000; t++) { const s = summarize(Array.from({ length: n }, draw)); if (s.q25 > 20 || s.q75 < 20) miss++; }
      expect(miss / 4000, `n ${n}`).toBeGreaterThan(lo);
      expect(miss / 4000, `n ${n}`).toBeLessThan(hi);
    }
    // A fleet drawn from the population: met (MEETS), open (a miss within noise), failed (beyond it).
    const shares = (n: number, k: number, trials: number, down = 1) => {
      const c = { met: 0, open: 0, fail: 0 };
      for (let t = 0; t < trials; t++) {
        const s = assessSize(Array.from({ length: k }, () => run(true, draw() / down, 1e6)), crystalTarget(Array.from({ length: n }, draw)));
        c[s.verdict === 'MEETS' ? 'met' : s.noise ? 'open' : 'fail']++;
      }
      return { met: c.met / trials, open: c.open / trials, fail: c.fail / trials };
    };
    // Against five crystals: at 21 runs about 57 % met, 32 % open, 12 % failed; at 1,000 runs about a third failed.
    const n5 = shares(5, 21, 1500), n5many = shares(5, 1000, 300), n17 = shares(17, 21, 1500);
    expect(n5.met).toBeGreaterThan(0.5);
    expect(n5.met).toBeLessThan(0.65);
    expect(n5.fail).toBeLessThan(0.17);
    expect(n5many.fail).toBeGreaterThan(0.22);
    // Against seventeen: about 86 % met at 21 runs, almost none failed.
    expect(n17.met).toBeGreaterThan(0.8);
    expect(n17.fail).toBeLessThan(0.03);
    // A fleet at a tenth of the record's scale is failed outright.
    expect(shares(5, 21, 300, 10).fail).toBeGreaterThan(0.99);
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
  it('wanted from exactly the wanted share up', () => {
    expect(deriveRoles([{ k: 'a', real: 0.5, lit: 'AB' }, { k: 'b', real: 0.05, lit: 'CO' }, { k: 'c', real: 0.0499, lit: 'UN' }], { wantedShare: 0.05 })).toEqual({ a: 'primary', b: 'alternate' });
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
  it('the display range is q25–q90, both ends in: below it no story, past it oversize', () => {
    expect(runStory(at({ fluorite: sp(true, 14) }), prot).story).toBe('NO');
    expect(runStory(at({ fluorite: sp(true, 15) }), prot).story).toBe('YES');
    expect(runStory(at({ fluorite: sp(true, 50) }), prot).story).toBe('YES');
    expect(runStory(at({ fluorite: sp(true, 60) }), prot)).toMatchObject({ story: 'NO', oversize: true });
  });
  it('the run\'s flags do not depend on the order of the protagonists', () => {
    const order1 = runStory(at({ fluorite: sp(true, 16), calcite: sp(true, 200) }), prot);
    const order2 = runStory(at({ fluorite: sp(true, 16), calcite: sp(true, 200) }), [prot[1], prot[0], prot[2]]);
    expect(order1).toEqual({ story: 'YES', basis: 'crystal', by: 'fluorite', oversize: true, beyond: false });
    expect(order2).toEqual(order1);
  });
  it('no size floor: a protagonist of unknown size, or short of a proxy, keeps the run open even as dust', () => {
    expect(runStory(at({ sphalerite: sp(true, 0.4) }), prot).story).toBe('POSSIBLE');
    expect(runStory(at({ calcite: sp(true, 0.5) }), prot).story).toBe('POSSIBLE');
    expect(runStory(at({ fluorite: sp(true, 0.4) }), prot).story).toBe('NO');
  });
  it('a crystal longer than the cavity neither carries the story nor counts against it; one as long as the span fits', () => {
    expect(runStory(at({ fluorite: sp(true, 30) }, 25), prot)).toMatchObject({ story: 'POSSIBLE', beyond: true });
    expect(runStory(at({ fluorite: sp(true, 25) }, 25), prot)).toMatchObject({ story: 'YES', beyond: false });
  });
  it('the story is credited to the first protagonist that carries it, a crystal target before a proxy', () => {
    const two = [{ k: 'a', target: crystalT }, { k: 'b', target: crystalT }];
    expect(runStory(at({ a: sp(true, 16), b: sp(true, 20) }), two).by).toBe('a');
    expect(runStory(at({ a: sp(true, 16), b: sp(true, 20) }), [two[1], two[0]]).by).toBe('b');
    expect(runStory(at({ calcite: sp(true, 60), fluorite: sp(true, 16) }), [prot[1], prot[0]])).toMatchObject({ basis: 'crystal', by: 'fluorite' });
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
  it('counts crystals past the record and longer than the cavity', () => {
    const species = { fluorite: { role: 'primary', engine: true, size: crystalT } };
    const c = scoreStory([run(60, { fluorite: sp(true, 55) }), run(30, { fluorite: sp(true, 45) }), run(300, { fluorite: sp(true, 20) })], species);
    expect(c).toMatchObject({ oversize: 1, beyond: 1, yes_crystal: 1, possible: 1, scored: 3 });
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
    // Crystal targets alone reach the frequency, proxies add to it: STORY.
    expect(v(20, 12, 10, 0, 0.5).verdict).toBe('STORY');
    expect(storyVerdict({ runs: 21, yes: 4, yesCrystal: 4, open: 0, frequency: 0.5, z: 3 }).noise).toBe(true);
    // Open runs might have carried it: the noise test counts them (1 + 4 of 21 against 0.3; 1 alone would not reach).
    expect(v(21, 1, 1, 4, 0.3)).toMatchObject({ verdict: 'THIN STORY', noise: true });
    expect(v(21, 1, 1, 0, 0.3)).toMatchObject({ verdict: 'THIN STORY', noise: false });
    expect(v(20, 9, 9, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: true });
    expect(v(21, 4, 4, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: false });
    expect(v(20, 9, 9, 1, 0.5).verdict).toBe('UNRESOLVED');
    expect(v(21, 0, 0, 0, 0.5).verdict).toBe('NO STORY');
    expect(v(21, 21, 21, 0, null).verdict).toBe('UNRESOLVED');
    expect(v(0, 0, 0, 0, 0.5).verdict).toBe('SMALL POCKETS ONLY');
  });
  it('the scenario\'s verdict keeps unclassed runs open, and says what leaves it open', () => {
    const species = { quartz: { role: 'primary', engine: true, size: unknownT }, calcite: { role: 'alternate', engine: true, size: crystalT } };
    const runs = [run(60, { quartz: sp(false, 0), calcite: sp(true, 2) }), run(60, { quartz: sp(false, 0), calcite: sp(true, 2) })];
    expect(scenarioVerdict(runs, species, 0.5)).toMatchObject({ verdict: 'UNRESOLVED', open: ['unclassed pocket'], counts: { unclassified: 2 } });
    const proxyRuns = [run(300, { calcite: sp(true, 10) }), run(300, { calcite: sp(true, 400) })];
    expect(scenarioVerdict(proxyRuns, { calcite: { role: 'primary', engine: true, size: proxyT } }, 0.5).open).toEqual(['short of a specimen proxy', 'longer than the cavity']);
    expect(scenarioVerdict(runs, { quartz: { role: 'primary', engine: true, size: unknownT } }, null).open).toEqual(['no story frequency', 'unclassed pocket']);
    // A crystal longer than the cavity is "longer than the cavity", not "short of a specimen proxy", even
    // under the proxy's q25.
    expect(scenarioVerdict([run(40, { calcite: sp(true, 45) })], { calcite: { role: 'primary', engine: true, size: proxyT } }, 0.5).open).toEqual(['longer than the cavity']);
  });
  it('a frequency at or below the top of the interval for 0 runs cannot be failed beyond noise, as the story verdict marks it', () => {
    const top = wilson(0, 21)[1];
    expect(cannotFailBeyondNoise(top, 21)).toBe(true);
    expect(storyVerdict({ runs: 21, yes: 0, yesCrystal: 0, open: 0, frequency: top })).toMatchObject({ verdict: 'NO STORY', noise: true });
    expect(cannotFailBeyondNoise(top + 1e-9, 21)).toBe(false);
    expect(storyVerdict({ runs: 21, yes: 0, yesCrystal: 0, open: 0, frequency: top + 1e-9 })).toMatchObject({ verdict: 'NO STORY', noise: false });
    expect(cannotFailBeyondNoise(null, 21)).toBe(false);
    expect(cannotFailBeyondNoise(0.2, 21, 3)).toBe(true);
  });
  it('no noise mark where no protagonist with an engine occurs in any seed', () => {
    const species = { ruby: { role: 'primary', engine: true, size: crystalT } };
    const none = Array.from({ length: 21 }, () => run(300, { ruby: sp(false, 0) }));
    expect(scenarioVerdict(none, species, 0.139)).toMatchObject({ verdict: 'NO STORY', noise: false });
    // The same story count with the species present is within noise.
    const present = Array.from({ length: 21 }, () => run(300, { ruby: sp(true, 2) }));
    expect(scenarioVerdict(present, species, 0.139)).toMatchObject({ verdict: 'NO STORY', noise: true });
  });
  it('the noise interval\'s z reaches the scenario\'s verdict', () => {
    const species = { q: { role: 'primary', engine: true, size: crystalT } };
    const runs = Array.from({ length: 21 }, (_, i) => run(300, { q: sp(true, i < 4 ? 20 : 2) }));
    expect(scenarioVerdict(runs, species, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: false });
    expect(scenarioVerdict(runs, species, 0.5, { z: 3 })).toMatchObject({ verdict: 'THIN STORY', noise: true });
  });
  it('no protagonist with an engine: NO ENGINE; every run small: SMALL POCKETS ONLY', () => {
    const runs = [run(60, { pascoite: sp(false, 0) })];
    expect(scenarioVerdict(runs, { pascoite: { role: 'primary', engine: false, size: unknownT } }, null)).toMatchObject({ verdict: 'NO ENGINE', cannot: null });
    expect(scenarioVerdict([run(16, { fluorite: sp(true, 20) })], { fluorite: { role: 'primary', engine: true, size: crystalT } }, 0.325).verdict).toBe('SMALL POCKETS ONLY');
  });
  it('a scenario no run can decide in its cavity, whatever grows: by the cavity, by the evidence, or both', () => {
    const big = { ...crystalT, q10: 70, q25: 77, median: 90, q75: 120, q90: 200 };
    const runs = [run(60, {})];
    expect(scenarioVerdict(runs, { selenite: { role: 'primary', engine: true, size: big }, anhydrite: { role: 'alternate', engine: true, size: { ...proxyT, q25: 66 } } }, 0.325).cannot)
      .toEqual({ cavity: ['selenite', 'anhydrite'], evidence: [] });
    expect(scenarioVerdict(runs, { sulfur: { role: 'primary', engine: true, size: { ...proxyT, q25: 61 } }, calcite: { role: 'alternate', engine: true, size: unknownT } }, 0.325).cannot)
      .toEqual({ cavity: ['sulfur'], evidence: ['calcite'] });
    expect(scenarioVerdict(runs, { quartz: { role: 'primary', engine: true, size: unknownT } }, 0.325).cannot).toEqual({ cavity: [], evidence: ['quartz'] });
    // A display range that starts at the span can be reached; a bigger cavity decides; a protagonist without an engine does not count.
    expect(scenarioVerdict(runs, { sulfur: { role: 'primary', engine: true, size: { ...proxyT, q25: 60 } } }, 0.325).cannot).toBeNull();
    expect(scenarioVerdict([run(300, {})], { selenite: { role: 'primary', engine: true, size: big } }, 0.325).cannot).toBeNull();
    // Any run's cavity can decide: once seeds draw their own pockets (WP9), the largest is the room.
    expect(scenarioVerdict([run(60, {}), run(300, {})], { selenite: { role: 'primary', engine: true, size: big } }, 0.325).cannot).toBeNull();
    expect(scenarioVerdict(runs, { selenite: { role: 'primary', engine: true, size: big }, x: { role: 'alternate', engine: false, size: crystalT } }, 0.325).cannot).toEqual({ cavity: ['selenite'], evidence: [] });
  });
});

describe('WP1\'s whole target', () => {
  const p = (k: string, occurrence: any, size: any = { verdict: 'MEETS' }, engine = true) => ({ k, engine, occurrence, size });
  it('the story, every protagonist in its band (a miss within noise counts as within), none oversize', () => {
    expect(wp1Target('STORY', [p('a', { verdict: 'IN' }), p('b', { verdict: 'HIGH', noise: true })])).toEqual({ met: true, fails: [], open: [] });
    expect(wp1Target('STORY', [p('a', { verdict: 'IN' }), p('q', { verdict: 'LOW', noise: false })])).toEqual({ met: false, fails: ['q below its band'], open: [] });
    expect(wp1Target('STORY (PROXY)', [p('a', { verdict: 'IN' }, { verdict: 'OVERSIZE' })]).fails).toEqual(['a oversize']);
    expect(wp1Target('UNRESOLVED', [p('a', { verdict: 'IN' }), p('x', { verdict: 'LOW' }, {}, false)]).fails).toEqual(['story UNRESOLVED']);
    expect(wp1Target('THIN STORY', [p('a', { verdict: 'IN' })]).fails).toEqual(['story THIN STORY']);
    expect(wp1Target('STORY', [p('a', { verdict: 'HIGH', noise: false })]).fails).toEqual(['a above its band']);
  });
  it('every protagonist that occurs is judged at the record\'s size, whether or not it carries story runs: too small fails as too large does (contract rule 4)', () => {
    expect(wp1Target('STORY', [p('f', { verdict: 'IN' }, { verdict: 'MEETS' })])).toEqual({ met: true, fails: [], open: [] });
    expect(wp1Target('STORY', [p('f', { verdict: 'IN' }, { verdict: 'BELOW', noise: false })]).fails).toEqual(["f below the record's middle half"]);
    expect(wp1Target('STORY', [p('f', { verdict: 'IN' }, { verdict: 'LARGE', noise: false })]).fails).toEqual(["f above the record's middle half"]);
    expect(wp1Target('STORY', [p('f', { verdict: 'IN' }, { verdict: 'OVERSIZE', noise: false })]).fails).toEqual(['f oversize']);
    // A second protagonist below the record fails the target too, though it never carried a story run.
    expect(wp1Target('STORY', [p('f', { verdict: 'IN' }, { verdict: 'MEETS' }), p('g', { verdict: 'IN' }, { verdict: 'BELOW', noise: false })]).fails).toEqual(["g below the record's middle half"]);
    // A proxy reached passes; short of one is open, not failed, and so is a size this cavity cannot judge.
    expect(wp1Target('STORY (PROXY)', [p('m', { verdict: 'IN' }, { verdict: 'REACHES PROXY' })]).met).toBe(true);
    expect(wp1Target('STORY (PROXY)', [p('m', { verdict: 'IN' }, { verdict: 'BELOW PROXY' })])).toEqual({ met: false, fails: [], open: ['m short of its proxy'] });
    for (const [v, text] of [['ELIGIBILITY UNKNOWN', 'eligibility unknown'], ['NO ELIGIBLE POCKET', 'no eligible pocket'], ['LONGER THAN THE CAVITY', 'longer than the cavity']]) {
      expect(wp1Target('STORY', [p('m', { verdict: 'IN' }, { verdict: v })])).toEqual({ met: false, fails: [], open: [`m ${text}`] });
    }
    // A protagonist with a band but no size target answers to its band alone; one with no engine is not judged.
    expect(wp1Target('STORY', [p('u', { verdict: 'IN', k: 5 }, { verdict: 'UNKNOWN' }), p('x', { verdict: 'LOW' }, { verdict: 'BELOW' }, false)])).toEqual({ met: true, fails: [], open: [] });
  });
  it('the whole target is met only on what it could judge: a size miss within noise, too few runs and a protagonist nothing judges leave it open (round 8)', () => {
    const open1 = (prot: any) => wp1Target('STORY', [prot]);
    // A size miss the runs cannot tell from the window: open, not within.
    expect(open1(p('f', { verdict: 'IN' }, { verdict: 'BELOW', noise: true }))).toEqual({ met: false, fails: [], open: ["f below the record's middle half, within noise"] });
    expect(open1(p('f', { verdict: 'IN' }, { verdict: 'LARGE', noise: true })).open).toEqual(["f above the record's middle half, within noise"]);
    expect(open1(p('f', { verdict: 'IN' }, { verdict: 'OVERSIZE', noise: true })).open).toEqual(['f oversize, within noise']);
    // Runs too few to fail a size cannot confirm it either, whatever their median.
    expect(open1(p('f', { verdict: 'IN' }, { verdict: 'MEETS', few: true, eligible: 3 }))).toEqual({ met: false, fails: [], open: ['f too few eligible runs (3) to judge its size'] });
    expect(open1(p('f', { verdict: 'IN' }, { verdict: 'BELOW', noise: true, few: true, eligible: 2 })).open).toEqual(['f too few eligible runs (2) to judge its size']);
    // Never occurring: failed where the band can tell, open where it cannot (no band, or a floor 0 runs is
    // within noise of), whether or not a size target exists.
    expect(open1(p('n', { verdict: 'LOW', noise: false, k: 0 }, { verdict: 'NEVER OCCURS' }))).toEqual({ met: false, fails: ['n below its band'], open: [] });
    expect(open1(p('n', { verdict: 'LOW', noise: true, k: 0 }, { verdict: 'NEVER OCCURS' }))).toEqual({ met: false, fails: [], open: ['n never occurs, and its band cannot tell that from its floor'] });
    expect(open1(p('n', { verdict: 'UNRESOLVED', k: 0 }, { verdict: 'NEVER OCCURS' })).open).toEqual(['n never occurs, and it has no band to judge that by']);
    expect(open1(p('n', { verdict: 'LOW', noise: true, k: 0 }, { verdict: 'UNKNOWN' })).open).toEqual(['n never occurs, and its band cannot tell that from its floor']);
    // Occurring with neither a band nor a size target: nothing judges it.
    expect(open1(p('q', { verdict: 'UNRESOLVED', k: 20 }, { verdict: 'UNKNOWN' })).open).toEqual(['q has neither a band nor a size target to judge it by']);
  });
  it('keeping a protagonist below display scale never makes the target met: one never at scale is judged as one at scale is, in either order (round 7, on the North Pennines targets)', () => {
    const fl = { basis: 'crystal', n: 17, q10: 13, q25: 15, median: 17, q75: 40, q90: 62.4, confidence: 'low' };
    const ga = { basis: 'crystal', n: 5, q10: 15, q25: 18, median: 20, q75: 20, q90: 27.2, confidence: 'low' };
    const fleet = (galena: (i: number) => number) => Array.from({ length: 21 }, (_, i) => ({ span: 91.93, species: { fluorite: { occurs: true, size: 17 }, galena: { occurs: true, size: galena(i) } } }));
    for (const order of [['fluorite', 'galena'], ['galena', 'fluorite']]) {
      const species: any = Object.fromEntries(order.map((k) => [k, { role: k === order[0] ? 'primary' : 'alternate', engine: true, occurrence_band: BANDS.AB, size: k === 'fluorite' ? fl : ga }]));
      const wp1 = (runs: any) => scenarioWp1(runs, species, scenarioVerdict(runs, species, 0.2889).verdict);
      const at = order.join(' first, then ');
      // Galena as simulated (8.6 mm, never at display scale) fails; one run at 19 mm changes nothing.
      expect(wp1(fleet(() => 8.6)).fails, at).toEqual(["galena below the record's middle half"]);
      expect(wp1(fleet((i) => (i === 0 ? 19 : 8.6))).fails, at).toEqual(["galena below the record's middle half"]);
      // At the record's median the whole target is met; well past its 90th percentile it fails again.
      expect(wp1(fleet(() => 20)), at).toEqual({ met: true, fails: [], open: [] });
      expect(wp1(fleet(() => 40)).fails, at).toEqual(['galena oversize']);
      // Runs on both sides of the window but never in it (13 at 10 mm, 8 at 30 mm): open, not met.
      expect(wp1(fleet((i) => (i < 13 ? 10 : 30))), at).toEqual({ met: false, fails: [], open: ["galena below the record's middle half, within noise"] });
    }
  });
  it('keeping a protagonist rare or absent never makes the target met either (round 8, on the Grimsel and Tormiq targets)', () => {
    // Grimsel: quartz carries the story at its median; fluorite (common band, crystal target) in k of 21 runs.
    const qz = { basis: 'crystal', n: 25, q10: 23, q25: 25, median: 29, q75: 40, q90: 51.4, confidence: 'low' };
    const fl = { basis: 'crystal', n: 9, q10: 9.8, q25: 11, median: 12, q75: 20, q90: 24, confidence: 'low' };
    const grimsel: any = { quartz: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: qz }, fluorite: { role: 'alternate', engine: true, occurrence_band: BANDS.CO, size: fl } };
    const outcome = (fluorite: number, k: number) => {
      const runs = Array.from({ length: 21 }, (_, i) => ({ span: 195.24, species: { quartz: { occurs: true, size: 29 }, fluorite: { occurs: i < k, size: i < k ? fluorite : 0 } } }));
      const w = scenarioWp1(runs, grimsel, scenarioVerdict(runs, grimsel, 0.3).verdict);
      return w.met ? 'met' : w.fails.length ? 'fail' : 'open';
    };
    for (const k of [0, 1, 2, 3, 4, 5, 7, 21]) {
      // As dust or at five times its 90th percentile, fluorite never lets the target be met, however rare.
      expect(outcome(0.5, k), `dust in ${k}`).not.toBe('met');
      expect(outcome(120, k), `120 mm in ${k}`).not.toBe('met');
      // At its median it does, once there are runs enough to judge it (four or more) and its band allows the count.
      expect(outcome(12, k), `median in ${k}`).toBe(k >= 4 ? 'met' : k === 3 ? 'open' : 'fail');
    }
    // Tormiq: titanite (no band, a proxy) at 5 mm, never formed, or reaching its proxy; epidote at its proxy.
    const ti = { basis: 'specimen-proxy', n: 10, q10: 21, q25: 34, median: 47, q75: 53.75, q90: 61.5, confidence: 'low' };
    const ep = { basis: 'specimen-proxy', n: 5, q10: 36.4, q25: 40, median: 45, q75: 67, q90: 71.2, confidence: 'low' };
    const tormiq: any = { titanite: { role: 'primary', engine: true, occurrence_band: null, size: ti }, epidote: { role: 'alternate', engine: true, occurrence_band: BANDS.AB, size: ep } };
    const tor = (titanite: any) => scenarioWp1(Array.from({ length: 21 }, () => ({ span: 194.96, species: { titanite, epidote: { occurs: true, size: 45 } } })), tormiq, 'STORY');
    expect(tor({ occurs: true, size: 5 })).toEqual({ met: false, fails: [], open: ['titanite short of its proxy'] });
    expect(tor({ occurs: false, size: 0 })).toEqual({ met: false, fails: [], open: ['titanite never occurs, and it has no band to judge that by'] });
    expect(tor({ occurs: true, size: 47 })).toEqual({ met: true, fails: [], open: [] });
  });
  it('scenarioWp1 judges the primary and the alternates only, at the noise interval it is given, over the runs\' own cavities and count', () => {
    const fl = { basis: 'crystal', n: 17, q10: 13, q25: 15, median: 17, q75: 40, q90: 62.4, confidence: 'low' };
    const ga = { basis: 'crystal', n: 5, q10: 15, q25: 18, median: 20, q75: 20, q90: 27.2, confidence: 'low' };
    const species: any = { fluorite: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: fl }, galena: { role: 'alternate', engine: true, occurrence_band: BANDS.AB, size: ga } };
    // Galena at scale in 8 of 21 runs, at 10 mm in the rest: below the window, within noise at z 1.96.
    const runs = Array.from({ length: 21 }, (_, i) => ({ span: 91.93, species: { fluorite: { occurs: true, size: 17 }, galena: { occurs: true, size: i < 8 ? 19 : 10 }, euclase: { occurs: true, size: 1 }, barite: { occurs: true, size: 1 } } }));
    expect(scenarioWp1(runs, species, 'STORY')).toEqual({ met: false, fails: [], open: ["galena below the record's middle half, within noise"] });
    // At z 1 neither the every-seed occurrence nor galena's size is within noise any longer.
    expect(scenarioWp1(runs, species, 'STORY', { z: 1 }).fails).toEqual(['fluorite above its band', 'galena above its band', "galena below the record's middle half"]);
    // A showpiece, a companion or an unsupported wish is no protagonist: its size is not WP1's.
    const atScale = runs.map((r) => ({ ...r, species: { ...r.species, galena: { occurs: true, size: 19 }, hessite: { occurs: true, size: 1 } } }));
    const cast: any = { ...species, euclase: { role: 'showpiece', engine: true, occurrence_band: BANDS.RA, size: ga }, barite: { role: 'companion', engine: true, occurrence_band: BANDS.CO, size: ga }, hessite: { role: 'unsupported', engine: true, occurrence_band: null, size: ga } };
    expect(scenarioWp1(atScale, cast, 'STORY')).toEqual({ met: true, fails: [], open: [] });
    // Each run's own cavity: one too small to hold galena's median, or a crystal longer than the cavity.
    expect(scenarioWp1(atScale.map((r) => ({ ...r, span: 19 })), species, 'STORY').open).toEqual(['galena no eligible pocket']);
    expect(scenarioWp1(atScale.map((r) => ({ ...r, span: 20, species: { ...r.species, galena: { occurs: true, size: 25 } } })), species, 'STORY').open).toEqual(['galena longer than the cavity']);
    // The band's denominator is every run: 10 of 60 is below the abundant floor beyond noise.
    const sixty = Array.from({ length: 60 }, (_, i) => ({ span: 91.93, species: { fluorite: { occurs: true, size: 17 }, galena: { occurs: i < 10, size: i < 10 ? 19 : 0 } } }));
    expect(scenarioWp1(sixty, species, 'STORY').fails).toEqual(['galena below its band']);
  });
  it('WP1 grows from failed to met as a protagonist grows toward its record, and back past it (rounds 7 and 8: the reviewer\'s sweep)', () => {
    const fl = { basis: 'crystal', n: 17, q10: 13, q25: 15, median: 17, q75: 40, q90: 62.4, confidence: 'low' };
    const ga = { basis: 'crystal', n: 5, q10: 15, q25: 18, median: 20, q75: 20, q90: 27.2, confidence: 'low' };
    const species: any = { fluorite: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: fl }, galena: { role: 'alternate', engine: true, occurrence_band: BANDS.AB, size: ga } };
    const r = rng(29), draw = lognormal(r);
    const shares = (median: number) => {
      const c = { met: 0, open: 0, fail: 0 };
      for (let t = 0; t < 300; t++) {
        const runs = Array.from({ length: 21 }, () => ({ span: 91.93, species: { fluorite: { occurs: true, size: 17 }, galena: { occurs: true, size: (draw() * median) / 20 } } }));
        const w = scenarioWp1(runs, species, scenarioVerdict(runs, species, 0.2889).verdict);
        c[w.met ? 'met' : w.fails.length ? 'fail' : 'open']++;
      }
      return { met: c.met / 300, fail: c.fail / 300 };
    };
    const [s2, s6, s20, s60] = [2, 6, 20, 60].map(shares);
    // Galena's window is 18–20 mm (a five-crystal record): at its median about a quarter of fleets meet it
    // and the rest are mostly open, rarely failed; far below or past it, failed.
    expect(s2).toEqual({ met: 0, fail: 1 });
    expect(s6).toEqual({ met: 0, fail: 1 });
    expect(s20.met).toBeGreaterThan(0.12);
    expect(s20.fail).toBeLessThan(0.15);
    expect(s60.met).toBe(0);
    expect(s60.fail).toBeGreaterThan(0.95);
  });
  it('a correct fleet is rarely failed: met about two times in three against seventeen-crystal records, a third of the time against five, open most of the rest (round 8: the jointly-satisfiable check)', () => {
    const r = rng(31), draw = lognormal(r);
    const fleet = (n: number) => {
      const c = { met: 0, open: 0, fail: 0 };
      for (let t = 0; t < 500; t++) {
        // Two protagonists in the middle of their bands (abundant 72 %, common 60 %), crystals from one population.
        const species: any = { a: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: crystalTarget(Array.from({ length: n }, draw)) }, b: { role: 'alternate', engine: true, occurrence_band: BANDS.CO, size: crystalTarget(Array.from({ length: n }, draw)) } };
        const f = storyFrequency([{ k: 'a', engine: true, band: BANDS.AB, target: species.a.size }, { k: 'b', engine: true, band: BANDS.CO, target: species.b.size }], [0.25, 0.9])!.frequency;
        const runs = Array.from({ length: 21 }, () => ({ span: 1e6, species: { a: r() < 0.72 ? { occurs: true, size: draw() } : { occurs: false, size: 0 }, b: r() < 0.6 ? { occurs: true, size: draw() } : { occurs: false, size: 0 } } }));
        const w = scenarioWp1(runs, species, scenarioVerdict(runs, species, f).verdict);
        c[w.met ? 'met' : w.fails.length ? 'fail' : 'open']++;
      }
      return { met: c.met / 500, open: c.open / 500, fail: c.fail / 500 };
    };
    const [n17, n5] = [fleet(17), fleet(5)];
    // About 65 % met, 33 % open, 2 % failed at seventeen; 30 %, 55 %, 14 % at five (a 1,000-trial run).
    expect(n17.met).toBeGreaterThan(0.55);
    expect(n17.met).toBeLessThan(0.75);
    expect(n17.fail).toBeLessThan(0.07);
    expect(n5.met).toBeGreaterThan(0.2);
    expect(n5.met).toBeLessThan(0.42);
    expect(n5.fail).toBeLessThan(0.22);
    expect(n5.open).toBeGreaterThan(n5.met);
  });
  it('on the North Pennines fluorite target, 5 of 21 runs at 18 mm tell the story, but the whole target fails if the rest run at 10 mm, as it fails at 70 mm', () => {
    const t = { basis: 'crystal', n: 17, q10: 13, q25: 15, median: 17, q75: 21, q90: 25, confidence: 'low' };
    const species = { fluorite: { role: 'primary', engine: true, occurrence_band: BANDS.CO, size: t } };
    const fleet = (big: number) => Array.from({ length: 21 }, (_, i) => ({ span: 300, species: { fluorite: { occurs: true, size: i < 5 ? 18 : big } } }));
    for (const [big, fail] of [[10, "fluorite below the record's middle half"], [70, 'fluorite oversize']] as const) {
      const runs = fleet(big);
      const V = scenarioVerdict(runs, species, 0.2);
      expect(V.verdict).toBe('STORY');
      expect(scenarioWp1(runs, species, V.verdict).fails).toContain(fail);
    }
  });
});

describe('the story frequency', () => {
  const DR = [0.25, 0.9];
  it('a fresh crystal lands in the display range of a record of n with probability 0.65 (n − 1) / (n + 1): exact for a uniform population, close for a lognormal one', () => {
    expect(displayCoverage(5, DR)).toBeCloseTo(0.4333, 4);
    expect(displayCoverage(17, DR)).toBeCloseTo(0.5778, 4);
    expect(displayCoverage(1, DR)).toBe(0);
    const r = rng(7);
    for (const [name, draw, tol] of [['uniform', () => 10 + 40 * r(), 0.015], ['lognormal', lognormal(r), 0.04]] as const) {
      for (const n of [5, 9, 17]) {
        let hit = 0, tot = 0;
        for (let t = 0; t < 4000; t++) {
          const rec = Array.from({ length: n }, draw).sort((a, b) => a - b);
          const lo = quantile(rec, 0.25), hi = quantile(rec, 0.9);
          for (let j = 0; j < 5; j++) { const x = draw(); if (x >= lo && x <= hi) hit++; tot++; }
        }
        expect(Math.abs(hit / tot - displayCoverage(n, DR)), `${name} n ${n}`).toBeLessThan(tol);
      }
    }
  });
  it('a protagonist whose display range starts beyond the cavity cannot set it; the setter\'s basis is reported', () => {
    const big = { basis: 'specimen-proxy', n: 17, q25: 80 }, fits = { basis: 'specimen-proxy', n: 16, q25: 40 };
    const p = [{ k: 'calcite', engine: true, band: BANDS.AB, target: big }, { k: 'sphalerite', engine: true, band: BANDS.AB, target: fits }];
    expect(storyFrequency(p, DR, 66)!.k).toBe('sphalerite');
    expect(storyFrequency(p, DR)!.k).toBe('calcite');
    expect(storyFrequency(p, DR, 80)!.k).toBe('calcite');
    expect(storyFrequency(p, DR, 39)).toEqual({ frequency: null, dropped: [{ k: 'calcite', from: 80 }, { k: 'sphalerite', from: 40 }], passedOver: [] });
    expect(storyFrequency(p, DR, 66)).toMatchObject({ basis: 'specimen-proxy', dropped: [{ k: 'calcite', from: 80 }] });
    // The eligibility test (the median) as an option, for the sensitivity table.
    const med = [{ k: 'm', engine: true, band: BANDS.AB, target: { basis: 'specimen-proxy', n: 16, q25: 40, median: 70 } }];
    expect(storyFrequency(med, DR, 66)!.frequency).not.toBeNull();
    expect(storyFrequency(med, DR, 66, { by: 'median' })).toMatchObject({ frequency: null, dropped: [{ k: 'm', from: 70 }] });
    // Only the primary and the alternates set it: not a companion's or a showpiece's crystal target.
    expect(scenarioFrequency({ c: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: big }, s: { role: 'alternate', engine: true, occurrence_band: BANDS.AB, size: fits }, x: { role: 'companion', engine: true, occurrence_band: BANDS.AB, size: { basis: 'crystal', n: 30, q25: 1 } }, y: { role: 'showpiece', engine: true, occurrence_band: BANDS.AB, size: { basis: 'crystal', n: 30, q25: 1 } } }, DR, 66)!.k).toBe('s');
  });
  it('crystal targets first: a proxy sets it only where no crystal target can carry a story run (round 6: Deccan, Jeffrey, Tsumeb)', () => {
    const crystal = { basis: 'crystal', n: 8, q25: 18 }, proxy = { basis: 'specimen-proxy', n: 45, q25: 10 };
    const p = [{ k: 'apophyllite', engine: true, band: BANDS.CO, target: crystal }, { k: 'stilbite', engine: true, band: BANDS.AB, target: proxy }];
    expect(storyFrequency(p, DR, 66)).toMatchObject({ k: 'apophyllite', basis: 'crystal', frequency: 0.1517, passedOver: ['stilbite'] });
    expect(storyFrequency(p, DR, 66, { crystalFirst: false })).toMatchObject({ k: 'stilbite', basis: 'specimen-proxy' });
    // A crystal target the cavity drops leaves the proxy to set it.
    expect(storyFrequency(p, DR, 15)).toMatchObject({ k: 'stilbite', dropped: [{ k: 'apophyllite', from: 18 }] });
  });
  it('the protagonist that can carry a story run with the largest floor × coverage sets it; one with no size target cannot', () => {
    const t = (n: number) => ({ basis: 'crystal', n, q25: 10 });
    const p = [{ k: 'a', engine: true, band: BANDS.AB, target: unknownT }, { k: 'b', engine: true, band: BANDS.CO, target: t(17) }, { k: 'c', engine: false, band: BANDS.AB, target: t(25) }, { k: 'd', engine: true, band: null, target: t(25) }];
    expect(storyFrequency(p, DR)).toEqual({ frequency: 0.1733, k: 'b', floor: 0.3, coverage: 0.5778, n: 17, basis: 'crystal', dropped: [], passedOver: [] });
    expect(storyFrequency([{ k: 'x', engine: true, band: BANDS.AB, target: t(5) }, { k: 'y', engine: true, band: BANDS.AB, target: t(25) }], DR)!.k).toBe('y');
    expect(storyFrequency([{ k: 'x', engine: true, band: BANDS.AB, target: t(17) }, { k: 'y', engine: true, band: BANDS.AB, target: t(17) }], DR)!.k).toBe('x');
    expect(storyFrequency([{ k: 'a', engine: true, band: BANDS.AB, target: unknownT }], DR)).toBeNull();
  });
  it('fleets drawn from the record at the band floor, at the committed sample sizes: the frequency is their expected rate, and a clear shortfall is rare', () => {
    const r = rng(11), draw = lognormal(r);
    for (const n of [5, 6, 8, 9, 11, 17, 25]) {
      let story = 0, clear = 0, rate = 0;
      const trials = 600;
      for (let t = 0; t < trials; t++) {
        const target = crystalTarget(Array.from({ length: n }, draw));
        const f = storyFrequency([{ k: 'q', engine: true, band: BANDS.AB, target }], DR)!.frequency;
        // 11 of 21 seeds: the AB band's floor; crystals from the record's population.
        const runs = Array.from({ length: 21 }, (_, i) => ({ span: 1e6, species: { q: i < 11 ? { occurs: true, size: draw() } : { occurs: false, size: 0 } } }));
        const v = scenarioVerdict(runs, { q: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: target } }, f);
        rate += v.counts.yes_crystal / 21;
        if (v.verdict === 'STORY') story++;
        else if (!v.noise) clear++;
      }
      expect(rate / trials, `n ${n}: the mean story rate`).toBeGreaterThan(0.5 * displayCoverage(n, DR) - 0.01);
      expect(story / trials, `n ${n}: STORY`).toBeGreaterThan(0.35);
      // About 5 % at worst (n 6 in a 4,000-trial run), so the bound leaves room.
      expect(clear / trials, `n ${n}: a shortfall beyond noise`).toBeLessThan(0.08);
    }
  });
  it('in a cavity that cuts the display range, crystals longer than it leave the verdict open: a minimal fleet is rarely failed', () => {
    const r = rng(17), draw = lognormal(r);
    let clear = 0;
    for (let t = 0; t < 600; t++) {
      const target = crystalTarget(Array.from({ length: 17 }, draw));
      const span = target.median;
      const f = storyFrequency([{ k: 'q', engine: true, band: BANDS.AB, target }], DR, span)!.frequency;
      const runs = Array.from({ length: 21 }, (_, i) => ({ span, species: { q: i < 11 ? { occurs: true, size: draw() } : { occurs: false, size: 0 } } }));
      const v = scenarioVerdict(runs, { q: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: target } }, f);
      if ((v.verdict === 'THIN STORY' || v.verdict === 'NO STORY') && !v.noise) clear++;
    }
    expect(clear / 600).toBeLessThan(0.08);
  });
  it('a fleet whose crystals run a third of the record\'s size almost never passes', () => {
    const r = rng(13), draw = lognormal(r);
    let story = 0;
    for (let t = 0; t < 600; t++) {
      const target = crystalTarget(Array.from({ length: 17 }, draw));
      const f = storyFrequency([{ k: 'q', engine: true, band: BANDS.AB, target }], DR)!.frequency;
      const runs = Array.from({ length: 21 }, (_, i) => ({ span: 1e6, species: { q: i < 11 ? { occurs: true, size: draw() / 3 } : { occurs: false, size: 0 } } }));
      if (scenarioVerdict(runs, { q: { role: 'primary', engine: true, occurrence_band: BANDS.AB, size: target } }, f).verdict === 'STORY') story++;
    }
    expect(story / 600).toBeLessThan(0.05);
  });
});

describe('the fleet\'s variety', () => {
  it('counts distinct assemblages and the commonest one\'s share', () => {
    expect(assemblageVariety([['a', 'b'], ['b', 'a'], ['a']])).toEqual({ distinct: 2, modal_share: 2 / 3 });
    expect(assemblageVariety([['a'], ['a'], ['a']])).toEqual({ distinct: 1, modal_share: 1 });
  });
  it('the chance of every-seed species at their ceilings: each scenario once, by its least likely species', () => {
    const c = everySeedChance([{ scenario: 's', ceiling: 0.95, n: 21 }, { scenario: 's', ceiling: 0.9, n: 21 }, { scenario: 't', ceiling: 0.9, n: 21 }]);
    expect(c).toMatchObject({ slots: 3, scenarios: 2 });
    expect(c.log10).toBeCloseTo(2 * 21 * Math.log10(0.9), 10);
    expect(everySeedChance([{ scenario: 's', ceiling: 0.9, n: 21 }, { scenario: 's', ceiling: 0.95, n: 21 }]).log10).toBeCloseTo(21 * Math.log10(0.9), 10);
    expect(c.independent_log10).toBeCloseTo(21 * Math.log10(0.95) + 2 * 21 * Math.log10(0.9), 10);
  });
});

describe('the sidecar\'s validation', () => {
  const good = () => ({
    schema: 'vugg-story-pocket-targets-v1',
    rules: { wanted_share: 0.05, occurrence_bands: { AB: [0.5, 0.95] }, size_min_samples: 5, size_medium_confidence: 10, size_high_confidence: 30, visible_mm: 1, specimen_min_mm: 10,
      uploaded_together_s: 1e6, series_field_labels: ['größe'], series_gap_s: 3.15e7, display_range: [0.25, 0.9], clutter_limit: 0.1, star_wanted_share: 0.5, noise_z: 1.96 },
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
    expect(problems((x) => { delete x.rules.size_medium_confidence; })).toMatch(/size_medium_confidence/);
    expect(problems((x) => { x.rules.size_medium_confidence = 31; })).toMatch(/size_medium_confidence/);
    expect(problems((x) => { delete x.rules.series_field_labels; })).toMatch(/series_field_labels/);
    expect(problems((x) => { x.rules.series_field_labels = ['größe', '']; })).toMatch(/series_field_labels/);
    expect(problems((x) => { delete x.rules.clutter_limit; })).toMatch(/clutter_limit/);
    expect(problems((x) => { x.rules.noise_z = 0; })).toMatch(/noise_z/);
    expect(problems((x) => { x.rules.display_range = [0.9, 0.25]; })).toMatch(/display_range/);
    expect(problems((x) => { delete x.rules.series_gap_s; })).toMatch(/series_gap_s/);
    expect(problems((x) => { x.rules.star_wanted_share = 1.5; })).toMatch(/star_wanted_share/);
    expect(problems((x) => { x.rules.visible_mm = 0; })).toMatch(/visible_mm/);
    expect(problems((x) => { delete x.rules.uploaded_together_s; })).toMatch(/uploaded_together_s/);
    expect(problems((x) => { x.rules.specimen_min_mm = -1; })).toMatch(/specimen_min_mm/);
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
  it('the sidecar registers the field labels the series rule uses, word for word', () => {
    expect(sc.rules.series_field_labels).toEqual(['größe', 'grösse', 'groesse', 'size', 'maße', 'masse', 'abmessungen', 'dimension', 'dimensions']);
  });
  it('the sidecar matches its JSON Schema, which documents every field (and the check can fail)', () => {
    const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'proposals', 'SCHEMA-STORY-POCKET-TARGETS.json'), 'utf8'));
    expect(schemaErrors(schema, sc, schema)).toEqual([]);
    const broken = JSON.parse(JSON.stringify(sc));
    broken.rules.unregistered_threshold = 3;
    delete broken.rules.display_range;
    const anySize = Object.values(broken.scenarios as any).flatMap((s: any) => Object.values(s.species)).find((v: any) => v.size.basis === 'crystal') as any;
    anySize.size.confidence = 'certain';
    expect(schemaErrors(schema, broken, schema).sort()).toEqual(expect.arrayContaining([
      '$.rules.unregistered_threshold: not in the schema', '$.rules.display_range: missing', expect.stringMatching(/confidence: certain is not one of/),
    ]));
  });
  it('every story frequency is the largest band floor × display coverage among the protagonists that can carry a story run', () => {
    expect(sc.rules.display_range).toEqual([0.25, 0.9]);
    for (const s of Object.values(sc.scenarios) as any[]) {
      if (s.out_of_scope) continue;
      expect(s.cavity_span_mm).toBeGreaterThan(0);
      const sf = scenarioFrequency(s.species, sc.rules.display_range, s.cavity_span_mm);
      expect(s.story_frequency).toBe(sf ? sf.frequency : null);
      if (sf?.frequency != null) expect(s.story_frequency_basis).toMatch(sf.basis === 'crystal' ? /an expected story rate/ : /a bar for STORY \(PROXY\), not an expected rate/);
      for (const d of sf?.dropped ?? []) expect(s.story_frequency_basis).toContain(d.k);
    }
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
