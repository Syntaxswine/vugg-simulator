import { describe, expect, it } from 'vitest';

declare const crystalColor: any;
declare const crystalDisplayName: any;
declare const fluoriteRecordedColour: any;
declare const resolveBodyColour: any;
declare const zoneColor: any;
declare const renderZoneShape_equant: any;
declare const zoneTemperatureColor: any;
declare const _localCrystalColor: any;
declare const buildCrystalMaterial: any;
declare const MINERAL_SPEC: any;
declare const COLOUR_LEXICON: any;
declare const setSeed: any;
declare const _liveRng: any;

const zone = (colour: string, thickness_um = 10, extra = {}) => ({
  thickness_um, temperature: 132, trace_Fe: 0.9, trace_Mn: 1.25,
  note: `color zone: ${colour}`, ...extra,
});
const fluorite = (zones = [zone('green (Fe-bearing — different mechanism from Y-yttrofluorite green)')], extra = {}) => ({
  mineral: 'fluorite', crystal_id: 2, radiation_damage: 0, zones, ...extra,
});

describe('fluorite appearance reads the existing accepted growth assignment', () => {
  it('closes the MVT contradiction across label, chromophore bar and wall body colour', () => {
    // MVT seed 42 has Mn 1.25 in the solid, but its accepted growth note is
    // green. Previously the UI said purple and the wall defaulted to clear.
    const c = fluorite();
    expect(crystalDisplayName(c)).toBe('fluorite (green)');
    expect(crystalColor(c)).toBe('#44bb88');
    expect(zoneColor(c.zones[0], c.mineral, c)).toBe('#44bb88');
    expect(resolveBodyColour(c, MINERAL_SPEC.fluorite)).toBe('#44bb88');
  });

  it.each([
    ['purple (Mn-bearing)', 'purple', '#b088dd'],
    ['rich grass-green (Y-yttrofluorite; charge-balanced Na+Y)', 'green', '#44bb88'],
    ['pale yellow-green (Y-bearing)', 'pale yellow-green', '#c2d089'],
    ['blue-violet (F-centers, low REE)', 'blue-violet', '#8e8acb'],
    ['colorless (high-T, low trace)', 'colorless', '#edf0f3'],
  ])('preserves %s as recorded, without another chemistry classifier', (note, name, hex) => {
    const c = fluorite([zone(note)]);
    expect(crystalDisplayName(c)).toBe(`fluorite (${name})`);
    expect(crystalColor(c)).toBe(hex);
    expect(resolveBodyColour(c, MINERAL_SPEC.fluorite)).toBe(hex);
  });

  it('summarizes surviving growth length while preserving per-zone colours', () => {
    const c = fluorite([
      zone('purple', 100, { _remaining_solid_um: 1 }),
      zone('green', 10),
      zone('colorless', 500, { _remaining_solid_um: 0 }),
      zone('purple', -50),
    ]);
    expect(crystalColor(c)).toBe('#44bb88');
    expect(zoneColor(c.zones[0], 'fluorite', c)).toBe('#b088dd');
    expect(zoneColor(c.zones[2], 'fluorite', c)).toBe('#edf0f3');
  });

  it('retains the existing radiation override, not just the birth assignment', () => {
    const c = fluorite(undefined, { radiation_damage: 0.2 });
    expect(crystalDisplayName(c)).toBe('fluorite (purple)');
    expect(resolveBodyColour(c, MINERAL_SPEC.fluorite)).toBe('#b088dd');
  });

  it.each(['', 'fluid inclusion trapped', 'color zone: unresolved'])('keeps the legacy fallback for an incomplete record: %s', note => {
    const c = fluorite([{ ...zone('green'), note }]);
    expect(fluoriteRecordedColour(c)).toBeNull();
    expect(crystalColor(c)).toBe('#b088dd');
    expect(resolveBodyColour(c, MINERAL_SPEC.fluorite)).toBe(crystalColor(c));
  });

  it('does not invent observations for seed-only crystals or other species', () => {
    expect(fluoriteRecordedColour(fluorite([]))).toBeNull();
    expect(resolveBodyColour(fluorite([]), MINERAL_SPEC.fluorite)).toBe('#edf0f3');
    expect(fluoriteRecordedColour({ mineral: 'calcite', zones: [zone('green')] })).toBeNull();
    expect(resolveBodyColour({ mineral: 'calcite', zones: [zone('green')] }, MINERAL_SPEC.calcite)).toBe(COLOUR_LEXICON.white);
  });

  it('uses the recorded colour in the specimen preview; other species retain their temperature plot', () => {
    function fills(c: any) {
      const colours: string[] = [];
      const ctx: any = { fillStyle: '', fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
        closePath() {}, stroke() {}, fill() { colours.push(this.fillStyle); } };
      renderZoneShape_equant({ getContext: () => ctx }, c);
      return colours;
    }
    const c = fluorite();
    expect(fills(c)).toEqual(['#44bb88']);
    expect(fills({ ...c, mineral: 'galena' })).toEqual([zoneTemperatureColor(c.zones[0])]);
  });

  it('carries the same hue into the optical material without changing transmission or IOR', () => {
    const c = fluorite();
    const colour = _localCrystalColor(c, MINERAL_SPEC.fluorite);
    expect(colour.g).toBeGreaterThan(colour.r);
    expect(colour.g).toBeGreaterThan(colour.b);
    const material = buildCrystalMaterial(c, MINERAL_SPEC.fluorite, {}, 'transmission');
    const legacy = buildCrystalMaterial(fluorite([zone('purple')]), MINERAL_SPEC.fluorite, {}, 'transmission');
    try {
      expect(material.attenuationColor.g).toBeGreaterThan(material.attenuationColor.r);
      for (const key of ['transmission', 'ior', 'opacity', 'roughness', 'attenuationDistance']) {
        expect(material[key], key).toBe(legacy[key]);
      }
    } finally { material.dispose(); legacy.dispose(); }
  });

  it('is read-only and consumes no growth randomness', () => {
    const c = fluorite();
    const before = JSON.stringify(c);
    setSeed(123); const expected = _liveRng().random();
    setSeed(123);
    for (let i = 0; i < 3; i++) {
      crystalColor(c); crystalDisplayName(c); resolveBodyColour(c, MINERAL_SPEC.fluorite);
    }
    expect(JSON.stringify(c)).toBe(before);
    expect(_liveRng().random()).toBe(expected);
  });
});
