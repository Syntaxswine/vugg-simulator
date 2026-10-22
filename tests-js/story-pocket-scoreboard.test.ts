// The story-pocket scoreboard's pure parts (tools/story-pocket-lib.mjs) and its committed inputs:
// caption sizes, size targets, occurrence against a band, size conditional on occurrence and on the
// pocket, roles (alternate protagonists, rare showpieces), unknown sizes, small pockets, the story
// verdict, and the pre-registered sidecar (proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSizeStatements, photoSizes, mineralOfWord, summarize, quantile, deriveRoles, bandFor, baseClass, sizeTarget,
  assessOccurrence, fits, pocketClass, assessSize, runStory, storyVerdict, validateSidecar,
} from '../tools/story-pocket-lib.mjs';
import { buildSizeEvidence } from '../tools/story-pocket-size-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANDS = { AB: [0.5, 1], CO: [0.3, 1], UN: [0.1, 0.6], RA: [0.02, 0.3], VR: [0, 0.15] };
const RULES = { minSamples: 5, highConfidence: 30 };
const crystalT = { basis: 'crystal', n: 17, q10: 12, q25: 15, median: 17, q75: 40, q90: 50, confidence: 'medium' };
const proxyT = { basis: 'specimen-proxy', n: 50, q10: 40, q25: 56, median: 76, q75: 95, q90: 130, confidence: 'low' };
const unknownT = { basis: 'unknown', crystal_n: 2, specimen_n: 3 };
const kinds = (text: string) => parseSizeStatements(text).map((s: any) => [s.kind, s.mm]);

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
  it('a dealer dimension with no cue is the specimen; the picture width is neither', () => {
    expect(kinds(', Tsumeb, Oshikoto, Namibia - 9,5 x 6,5 x 3,5 cm ;')).toEqual([['specimen', 95]]);
    expect(kinds('gion/Tsumeb/Tsumeb Mine, BB = 8,0 mm ;')).toEqual([['fov', 8]]);
    expect(kinds('Heinrichit ; Heinrichit xx, 1,7 mm Bildbr. gelbe')).toEqual([['fov', 1.7]]);
    expect(kinds('Kristalle mit Sphalerit, Bb = 60 mm, Fundort: Elmw')).toEqual([['fov', 60]]);
  });
  it('a cue after the number binds tighter: edge length, crystal height', () => {
    expect(kinds('Fluorit ; Fluorit xx bis 80 mm KL mit Calcitk')).toEqual([['crystal', 80]]);
    expect(kinds('Aquamarin ; ca. 12 cm hoher Kristall')).toEqual([['crystal', 120]]);
  });
  it('drops lens focal lengths', () => {
    expect(parseSizeStatements('Aufnahme mit Canon EF 100mm Makro')).toEqual([]);
  });
  it('an attributive size goes to its noun; where the noun is cut off, its gender decides', () => {
    expect(kinds('Kupfer ; Etwa 26 mm x 18 mm große Kupferst')).toEqual([['specimen', 26]]);
    expect(kinds('Azurit ; Etwa 40 mm x 17 mm große Stufe mi')).toEqual([['specimen', 40]]);
    expect(parseSizeStatements('Zepterquarz ; Etwa 25 mm x 13 mm großer Zepterq')[0]).toMatchObject({ kind: 'crystal', named: 'Sceptre Quartz' });
    expect(kinds('Beryll ; Dieser etwa 31 mm x 11 mm große prismati')).toEqual([['crystal', 31]]);
    expect(kinds('Rauchquarz ; Diese etwa 78 mm x 56 mm große Rauchqua')).toEqual([['unclassed', 78]]);
    expect(parseSizeStatements('Cerussit ; Bis ca. 30 mm große Cerussit')[0]).toMatchObject({ kind: 'crystal', named: 'Cerussite' });
  });
  it('a crystal statement names its mineral, and another mineral\'s crystal is set aside', () => {
    expect(parseSizeStatements('luorit ; Galenit Oktaeder bis 1,5 cm Größe auf Quar')[0]).toMatchObject({ kind: 'crystal', mm: 15, named: 'Galena' });
    const keyOf = (n: string) => n.toLowerCase();
    const calcitePhoto = photoSizes(['und Calcit auf Quarz ; Größe: 17 x 11 x 8 cm, Fluorit-XX max. 15 mm; Fundort: Grov'], 'calcite', { keyOf });
    expect(calcitePhoto).toMatchObject({ crystal: null, specimen: 170, other: 1 });
    const fluoritePhoto = photoSizes(['Fluorit ; Größe: 12 x 13 x 9 cm,Fluorit-XX max. 15 mm; Fundort: Grov'], 'fluorite', { keyOf });
    expect(fluoritePhoto).toMatchObject({ crystal: 15, specimen: 130, other: 0 });
  });
  it('a piece material\'s lengths are pieces, not crystals', () => {
    const p = photoSizes(['Tigerauge, rot gefärbt ; Dieser etwa 13 mm große, rot gef'], 'tigers_eye', { piece: true });
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

describe('size targets', () => {
  const crystals = summarize([10, 12, 15, 17, 20]);
  const specimens = summarize([40, 50, 60, 70, 80, 90]);
  it('crystal lengths when there are enough', () => {
    expect(sizeTarget({ crystal: crystals, specimen: specimens }, RULES)).toMatchObject({ basis: 'crystal', n: 5, q25: 12, median: 15 });
  });
  it('else the specimen dimensions, labelled a proxy with low confidence', () => {
    expect(sizeTarget({ crystal: summarize([10, 12]), specimen: specimens }, RULES)).toMatchObject({ basis: 'specimen-proxy', n: 6, median: 65, confidence: 'low' });
  });
  it('else unknown — with no number at all, never a default 5 mm', () => {
    const t = sizeTarget({ crystal: summarize([10]), specimen: summarize([40]) }, RULES);
    expect(t.basis).toBe('unknown');
    for (const q of ['q10', 'q25', 'median', 'q75', 'q90']) expect(t).not.toHaveProperty(q);
    expect(sizeTarget(undefined, RULES).basis).toBe('unknown');
  });
  it('quantiles interpolate linearly (R-7)', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(summarize([3, 1, 2])).toMatchObject({ n: 3, median: 2, min: 1, max: 3 });
  });
});

describe('occurrence against its band', () => {
  it('IN, LOW and HIGH, with noise where 21 runs cannot tell', () => {
    expect(assessOccurrence(21, 21, BANDS.AB).verdict).toBe('IN');
    expect(assessOccurrence(0, 21, BANDS.CO)).toMatchObject({ verdict: 'LOW', noise: false });
    expect(assessOccurrence(9, 21, BANDS.AB)).toMatchObject({ verdict: 'LOW', noise: true });
    expect(assessOccurrence(21, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: false });
    expect(assessOccurrence(13, 21, BANDS.UN)).toMatchObject({ verdict: 'HIGH', noise: true });
  });
  it('no band: unresolved, whatever the rate', () => {
    expect(assessOccurrence(21, 21, null).verdict).toBe('UNRESOLVED');
    expect(bandFor('doc', BANDS)).toBeNull();
    expect(bandFor('ND?', BANDS)).toBeNull();
    expect(bandFor('AB-crust', BANDS)).toEqual([0.5, 1]);
    expect(baseClass('RA-coating')).toBe('RA');
  });
});

describe('size, conditional on occurrence and on the pocket', () => {
  const run = (occurs: boolean, size: number, span = 90) => ({ occurs, size, span });
  it('judges only the runs where the species occurs', () => {
    expect(assessSize([run(true, 18), run(true, 16), run(false, 0), run(false, 0)], crystalT))
      .toMatchObject({ verdict: 'MEETS', occurring: 2, eligible: 2, meeting: 2, share: 1 });
  });
  it('BELOW when fewer than half of the eligible runs reach the lower quartile; exactly half meets', () => {
    expect(assessSize([run(true, 16), run(true, 10), run(true, 9)], crystalT)).toMatchObject({ verdict: 'BELOW', meeting: 1, eligible: 3 });
    expect(assessSize([run(true, 15), run(true, 10)], crystalT)).toMatchObject({ verdict: 'MEETS', share: 0.5 });
  });
  it('OVERSIZE when the conditional median passes the record\'s 90th percentile', () => {
    expect(assessSize([run(true, 80), run(true, 70)], crystalT).verdict).toBe('OVERSIZE');
  });
  it('a cavity that cannot hold the characteristic crystal is a small pocket, and the target is not shrunk', () => {
    expect(fits(16, crystalT)).toBe(false);
    expect(pocketClass(16, crystalT)).toBe('SMALL');
    expect(pocketClass(17, crystalT)).toBe('STORY-SCALE');
    expect(assessSize([run(true, 5, 16), run(true, 6, 16)], crystalT).verdict).toBe('NO ELIGIBLE POCKET');
    expect(crystalT).toMatchObject({ q25: 15, median: 17 });
  });
  it('small pockets leave the size count: only the runs in pockets that fit are judged', () => {
    const r = assessSize([run(true, 5, 16), run(true, 6, 16), run(true, 18, 90), run(true, 20, 90)], crystalT);
    expect(r).toMatchObject({ verdict: 'MEETS', occurring: 4, eligible: 2, meeting: 2 });
  });
  it('a cavity smaller than a specimen proxy is unclassed, never small', () => {
    expect(fits(60, proxyT)).toBeNull();
    expect(pocketClass(60, proxyT)).toBe('UNCLASSED');
    expect(assessSize([run(true, 10, 60)], proxyT).verdict).toBe('ELIGIBILITY UNKNOWN');
    expect(assessSize([run(true, 10, 90)], proxyT).verdict).toBe('BELOW PROXY');
    expect(assessSize([run(true, 60, 90)], proxyT).verdict).toBe('MEETS');
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
  it('a showpiece is held to the rare band, not the protagonists\'', () => {
    expect(bandFor('RA', BANDS)).toEqual([0.02, 0.3]);
    expect(assessOccurrence(3, 21, bandFor('RA', BANDS)).verdict).toBe('IN');
    expect(assessOccurrence(21, 21, bandFor('RA', BANDS))).toMatchObject({ verdict: 'HIGH', noise: false });
  });
});

describe('the story', () => {
  const sp = (occurs: boolean, size: number) => ({ occurs, size, visible: occurs && size >= 1 });
  const prot = [{ k: 'fluorite', target: crystalT }, { k: 'calcite', target: proxyT }, { k: 'sphalerite', target: unknownT }];
  it('an alternate carries the story when the primary is missing', () => {
    expect(runStory({ species: { fluorite: sp(false, 0), calcite: sp(true, 60) } }, prot)).toEqual({ story: 'YES', basis: 'specimen-proxy', by: 'calcite' });
  });
  it('a crystal target reached outranks a proxy reached', () => {
    expect(runStory({ species: { fluorite: sp(true, 16), calcite: sp(true, 60) } }, prot)).toEqual({ story: 'YES', basis: 'crystal', by: 'fluorite' });
  });
  it('possible when only unknown-size or short-of-proxy protagonists are visible; dust tells none', () => {
    expect(runStory({ species: { sphalerite: sp(true, 6) } }, prot).story).toBe('POSSIBLE');
    expect(runStory({ species: { calcite: sp(true, 10) } }, prot).story).toBe('POSSIBLE');
    expect(runStory({ species: { fluorite: sp(true, 10), sphalerite: sp(true, 0.4) } }, prot).story).toBe('NO');
  });
  it('a showpiece is not a protagonist: a huge rarity alone carries no story', () => {
    expect(runStory({ species: { euclase: sp(true, 200) } }, prot).story).toBe('NO');
  });
  it('the verdict against the pre-registered frequency', () => {
    const v = (runs: number, yes: number, yesCrystal: number, possible: number, frequency: number | null) => storyVerdict({ runs, yes, yesCrystal, possible, frequency });
    expect(v(21, 21, 21, 0, 0.5).verdict).toBe('STORY');
    expect(v(21, 21, 0, 0, 0.5).verdict).toBe('STORY (PROXY)');
    expect(v(21, 4, 4, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: false });
    expect(v(21, 9, 9, 0, 0.5)).toMatchObject({ verdict: 'THIN STORY', noise: true });
    expect(v(21, 0, 0, 21, 0.5).verdict).toBe('UNRESOLVED');
    expect(v(21, 0, 0, 0, 0.5).verdict).toBe('NO STORY');
    expect(v(21, 21, 21, 0, null).verdict).toBe('UNRESOLVED');
    expect(v(0, 0, 0, 0, 0.5).verdict).toBe('SMALL POCKETS ONLY');
  });
});

describe('the committed targets and capture', () => {
  const sc = JSON.parse(fs.readFileSync(path.join(ROOT, 'proposals', 'DATA-STORY-POCKET-TARGETS-2026-10-22.json'), 'utf8'));
  const species = Object.entries(sc.scenarios).flatMap(([scn, s]: [string, any]) => Object.entries(s.species).map(([k, v]) => ({ scn, loc: s.locality, k, v: v as any })));
  it('the sidecar validates', () => {
    expect(validateSidecar(sc)).toEqual([]);
    expect(species.length).toBeGreaterThan(100);
  });
  it('every band is the literature class\'s, and no band comes from anywhere else', () => {
    for (const { v } of species) {
      const expected = v.literature ? bandFor(v.literature.class, sc.rules.occurrence_bands) : null;
      expect(v.occurrence_band).toEqual(expected);
    }
  });
  it('every size target is recomputed from the committed capture: sample, quantiles and provenance', () => {
    const ev = buildSizeEvidence(ROOT);
    for (const { loc, k, v } of species) {
      if (v.size.basis === 'unknown') {
        expect(v.size.median).toBeUndefined();
        continue;
      }
      const t = sizeTarget(ev.localities[loc]?.[k], { minSamples: sc.rules.size_min_samples, highConfidence: sc.rules.size_high_confidence });
      expect({ basis: v.size.basis, n: v.size.n, q25: v.size.q25, median: v.size.median, q90: v.size.q90 }).toEqual({ basis: t.basis, n: t.n, q25: t.q25, median: t.median, q90: t.q90 });
      expect(v.size.n).toBeGreaterThanOrEqual(sc.rules.size_min_samples);
      expect(v.size.provenance).toMatch(/^Mineralienatlas captions/);
    }
  });
  it('validation refuses a broken sidecar', () => {
    const broken = structuredClone(sc);
    const [scn, s] = Object.entries(broken.scenarios).find(([, x]: [string, any]) => !x.out_of_scope) as [string, any];
    const [pk] = Object.entries(s.species).find(([, v]: [string, any]) => v.role === 'primary') as [string, any];
    s.species[pk].role = 'alternate';
    const [bk] = Object.entries(s.species).find(([, v]: [string, any]) => v.occurrence_band) as [string, any];
    s.species[bk].occurrence_band = [0.6, 0.4];
    const [zk] = Object.entries(s.species).find(([, v]: [string, any]) => v.size.basis !== 'unknown') ?? [];
    if (zk) delete s.species[zk].size.provenance;
    const problems = validateSidecar(broken).join('\n');
    expect(problems).toMatch(new RegExp(`${scn}: needs exactly one primary`));
    expect(problems).toMatch(/band is \[lo, hi\]/);
    if (zk) expect(problems).toMatch(/needs its provenance/);
  });
});
