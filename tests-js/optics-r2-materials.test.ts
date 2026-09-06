// tests-js/optics-r2-materials.test.ts — R2 "materials that behave like minerals" (2026-09-06).
//
// Visual-realism review §5 R2 + decisions D1 (transmission with measured IOR and
// Beer–Lambert body colour; alpha only as the low-performance fallback) and D2 (the
// lustre data reaches the pixels). The pixels themselves are measured live by
// tools/photo-rig.mjs (manifest.gl.optics, --tier A/B, the see-through probe). What is
// testable headless is the CONTRACT: the lustre table's ordering, refractive-index
// resolution (verified block > class default), the pure per-tier parameter resolution
// with every state modifier, what buildCrystalMaterial actually sets on a
// MeshPhysicalMaterial, the extent → thickness rule, the in-place retier of a live scene
// (the gate's landing and the rig's A/B), the rig install decision, and the step-down
// ladder with the optics rung in it.
import { describe, expect, it } from 'vitest';

declare const THREE: any;
declare const OPTICS_TRANSLUCENCY_SPAN: number;
declare const OPTICS_LUSTRE_TABLE: any;
declare const OPTICS_CLASS_LUSTRE: any;
declare const OPTICS_CLASS_IOR: any;
declare const OPTICS_IOR_DEFAULT: number;
declare const OPTICS_TRANSMISSION_MIN_CLARITY: number;
declare const OPTICS_TRANSMISSION_FLOOR: number;
declare const OPTICS_ATTENUATION_BASE: number;
declare const OPTICS_ATTENUATION_SPAN: number;
declare const OPTICS_THICKNESS_FRACTION: number;
declare const OPTICS_MOBILE_TIER: string;
declare const OPTICS_CLASS_REFLECTANCE: any;
declare const OPTICS_REFLECTANCE_DEFAULT: number;
declare const opticsReflectanceFor: any;
declare const _opticsMetalColour: any;
declare const _topoOpticsSyncView: any;
declare const _topoApplyWallDisplay: any;
declare const opticsIorFor: any;
declare const opticsLustreFor: any;
declare const opticsMaterialParamsFor: any;
declare const buildCrystalMaterial: any;
declare const _opticsApplyExtent: any;
declare const _opticsExtentOfScale: any;
declare const _topoOpticsApplyTier: any;
declare const _topoOpticsInstallRig: any;
declare const _topoLightingNoteRenderTime: any;
declare const LIGHTING_SHADOW_MAP_DESKTOP: number;
declare const LIGHTING_SLOW_RENDER_MS: number;
declare const LIGHTING_SLOW_RENDER_STREAK: number;

// Specs shaped like data/minerals.json entries (the compact test-time MINERAL_SPEC has no
// optics blocks, so the builder is exercised with explicit specs).
const QUARTZ = { class: 'silicate', class_color: '#e8e8e8', optics: { diaphaneity: 'transparent', clarity: 0.92, ior: 1.547, lustre: ['vitreous'], notes: null, source: 't' } };
const GALENA = { class: 'sulfide', class_color: '#7a7a7a', optics: { diaphaneity: 'opaque', clarity: 0, lustre: ['metallic'], reflectance: 42.8, notes: null, source: 't' } };
const MALACHITE = { class: 'carbonate', class_color: '#2e8b57', optics: { diaphaneity: 'translucent_to_opaque', clarity: 0.08, ior: 1.813, lustre: ['adamantine', 'vitreous'], notes: null, source: 't' } };
const CERUSSITE = { class: 'carbonate', class_color: '#f0f0f0', optics: { diaphaneity: 'transparent_to_translucent', clarity: 0.8, ior: 1.984, lustre: ['adamantine'], notes: null, source: 't' } };
const CHALCEDONY = { class: 'silicate', class_color: '#cfd8dc', optics: { diaphaneity: 'translucent_to_opaque', clarity: 0.45, ior: 1.547, lustre: ['waxy', 'dull', 'vitreous'], notes: null, source: 't' } };
const LEPIDOLITE = { class: 'silicate', class_color: '#d8a0d8', optics: { diaphaneity: 'transparent_to_translucent', clarity: 0.45, ior: 1.557, lustre: ['pearly', 'vitreous'], notes: null, source: 't' } };
const TAIL_SILICATE = { class: 'silicate', class_color: '#88aa88' };   // no optics block
const TAIL_SULFIDE = { class: 'sulfide', class_color: '#665544' };
const crystal = (id = 7, mineral = 'quartz') => ({ crystal_id: id, mineral, zones: [] });
const NONE = {};

// The Depth-A1 lint's closed vocabulary (tests-js/mineral-optics.test.ts) — every term
// must have a row, or a verified species would silently fall back to vitreous.
const LUSTRE_VOCAB = ['vitreous', 'subvitreous', 'adamantine', 'subadamantine', 'resinous', 'subresinous',
  'metallic', 'submetallic', 'pearly', 'silky', 'greasy', 'waxy', 'dull', 'earthy'];

describe('R2 lustre table', () => {
  it('covers the whole lint vocabulary and nothing outside it', () => {
    expect(Object.keys(OPTICS_LUSTRE_TABLE).sort()).toEqual([...LUSTRE_VOCAB].sort());
  });

  it('metallic is the only full metal; roughness climbs adamantine < vitreous < resinous < waxy < dull < earthy', () => {
    const T = OPTICS_LUSTRE_TABLE;
    expect(T.metallic.metalness).toBe(1);
    for (const k of LUSTRE_VOCAB) if (k !== 'metallic') expect(T[k].metalness, k).toBeLessThan(1);
    const r = (k: string) => T[k].roughness;
    expect(r('adamantine')).toBeLessThan(r('vitreous'));
    expect(r('vitreous')).toBeLessThan(r('resinous'));
    expect(r('resinous')).toBeLessThan(r('waxy'));
    expect(r('waxy')).toBeLessThan(r('dull'));
    expect(r('dull')).toBeLessThan(r('earthy'));
    // dull/earthy also damp the specular; the bright lustres keep it whole
    expect(T.earthy.specular).toBeLessThan(T.dull.specular);
    expect(T.dull.specular).toBeLessThan(T.vitreous.specular);
    expect(T.vitreous.specular).toBe(1);
    // sheen belongs to the pearly and silky reads only
    for (const k of LUSTRE_VOCAB) expect(!!T[k].sheen, k).toBe(k === 'pearly' || k === 'silky');
  });

  it('class fallbacks name real terms; every class in the IOR table has a lustre default too', () => {
    for (const [klass, term] of Object.entries(OPTICS_CLASS_LUSTRE)) expect(OPTICS_LUSTRE_TABLE[term as string], klass).toBeTruthy();
    for (const klass of Object.keys(OPTICS_CLASS_IOR)) expect(OPTICS_CLASS_LUSTRE[klass], klass).toBeTruthy();
  });
});

describe('R2 resolution: lustre and refractive index', () => {
  it('the FIRST listed term is the characteristic one (chalcedony is waxy, not vitreous)', () => {
    expect(opticsLustreFor(CHALCEDONY)).toBe('waxy');
    expect(opticsLustreFor(MALACHITE)).toBe('adamantine');
    expect(opticsLustreFor(GALENA)).toBe('metallic');
  });

  it('class fallback for the tail; vitreous when even the class is unknown', () => {
    expect(opticsLustreFor(TAIL_SULFIDE)).toBe('metallic');
    expect(opticsLustreFor(TAIL_SILICATE)).toBe('vitreous');
    expect(opticsLustreFor({ class: 'no_such_class' })).toBe('vitreous');
    expect(opticsLustreFor(null)).toBe('vitreous');
  });

  it('a measured reflectance wins (as a fraction); class default for the metal tail; clamped', () => {
    expect(opticsReflectanceFor(GALENA)).toBeCloseTo(0.428, 6);
    expect(opticsReflectanceFor(TAIL_SULFIDE)).toBeCloseTo(OPTICS_CLASS_REFLECTANCE.sulfide / 100, 6);
    expect(opticsReflectanceFor({ class: 'no_such_class' })).toBeCloseTo(OPTICS_REFLECTANCE_DEFAULT / 100, 6);
    expect(opticsReflectanceFor({ class: 'native', optics: { clarity: 0, lustre: ['metallic'], reflectance: 250 } })).toBe(1);
    expect(opticsReflectanceFor({ class: 'native', optics: { clarity: 0, lustre: ['metallic'], reflectance: 0 } })).toBeCloseTo(0.03, 6);
  });

  it('the metal colour keeps the hue and takes the measured reflectance as its linear luminance', () => {
    const body = new THREE.Color(0x73767c);                 // galena's lexicon swatch (luminance ≈ 0.18)
    const f0 = _opticsMetalColour(body, 0.428);
    const y = 0.2126 * f0.r + 0.7152 * f0.g + 0.0722 * f0.b;
    expect(y).toBeCloseTo(0.428, 2);
    expect(f0.b / f0.r).toBeCloseTo(body.b / body.r, 3);    // same hue: channel ratios preserved
    // silver-white at 94 % clips no channel; a saturated brass at a high R clips honestly
    const s = _opticsMetalColour(new THREE.Color(0xd4d2cb), 0.938);
    expect(Math.max(s.r, s.g, s.b)).toBeLessThanOrEqual(1);
  });

  it('a verified ior wins; the class default covers the tail; the default covers the unknown; clamped to [1, 3.5]', () => {
    expect(opticsIorFor(QUARTZ)).toBe(1.547);
    expect(opticsIorFor(TAIL_SILICATE)).toBe(OPTICS_CLASS_IOR.silicate);
    expect(opticsIorFor({ class: 'no_such_class' })).toBe(OPTICS_IOR_DEFAULT);
    expect(opticsIorFor(null)).toBe(OPTICS_IOR_DEFAULT);
    expect(opticsIorFor({ class: 'oxide', optics: { clarity: 0.5, ior: 9, lustre: ['vitreous'] } })).toBe(3.5);
  });
});

describe('R2 parameter resolution (pure, per tier)', () => {
  it('quartz on the transmission tier: transmissive, transmission from clarity, IOR through, vitreous roughness', () => {
    const p = opticsMaterialParamsFor(QUARTZ, NONE, 'transmission');
    expect(p.transmissive).toBe(true);
    expect(p.transmission).toBeCloseTo(OPTICS_TRANSMISSION_FLOOR + (1 - OPTICS_TRANSMISSION_FLOOR) * 0.92, 6);
    expect(p.ior).toBe(1.547);
    expect(p.metalness).toBe(0);
    expect(p.roughness).toBe(OPTICS_LUSTRE_TABLE.vitreous.roughness);
    expect(p.alpha_opacity).toBeCloseTo(1 - OPTICS_TRANSLUCENCY_SPAN * 0.92, 6);
    expect(p.attenuation_span).toBeCloseTo(OPTICS_ATTENUATION_BASE + OPTICS_ATTENUATION_SPAN * 0.92, 6);
  });

  it('quartz on the alpha tier: Depth-A opacity, no transmission — the exact 2026-07-02 number', () => {
    const p = opticsMaterialParamsFor(QUARTZ, NONE, 'alpha');
    expect(p.transmissive).toBe(false);
    expect(p.transmission).toBe(0);
    expect(p.alpha_opacity).toBeCloseTo(1 - 0.70 * 0.92, 6);
  });

  it('galena: full metal on both tiers, never transmissive', () => {
    for (const tier of ['transmission', 'alpha']) {
      const p = opticsMaterialParamsFor(GALENA, NONE, tier);
      expect(p.metalness).toBe(1);
      expect(p.transmissive).toBe(false);
      expect(p.roughness).toBe(OPTICS_LUSTRE_TABLE.metallic.roughness);
    }
  });

  it('a species opaque in hand specimen (malachite 0.08) is opaque on the transmission tier — no 94 % ghost', () => {
    const p = opticsMaterialParamsFor(MALACHITE, NONE, 'transmission');
    expect(p.clarity).toBeLessThanOrEqual(OPTICS_TRANSMISSION_MIN_CLARITY);
    expect(p.transmissive).toBe(false);
    // the alpha tier keeps Depth-A's faint translucency for it
    expect(opticsMaterialParamsFor(MALACHITE, NONE, 'alpha').alpha_opacity).toBeCloseTo(1 - 0.70 * 0.08, 6);
  });

  it('state modifiers stack as before: etched (+0.30 rough, clarity ×0.35), CDR (+0.18, ×0.5), inclusion (opaque), hourglass cap 0.30, perimorph cast never transmits', () => {
    const base = opticsMaterialParamsFor(QUARTZ, NONE, 'transmission');
    const etched = opticsMaterialParamsFor(QUARTZ, { isEtched: true }, 'transmission');
    expect(etched.roughness).toBeCloseTo(base.roughness + 0.30, 6);
    expect(etched.clarity).toBeCloseTo(0.92 * 0.35, 6);
    expect(etched.transmissive).toBe(true);           // 0.32 is still above the floor: a frosted but glassy face
    expect(etched.transmission).toBeLessThan(base.transmission);
    const cdr = opticsMaterialParamsFor(QUARTZ, { isCdrPseudomorph: true }, 'transmission');
    expect(cdr.roughness).toBeCloseTo(base.roughness + 0.18, 6);
    expect(cdr.clarity).toBeCloseTo(0.46, 6);
    const incl = opticsMaterialParamsFor(QUARTZ, { isInclusion: true }, 'transmission');
    expect(incl.clarity).toBe(0);
    expect(incl.transmissive).toBe(false);
    expect(incl.roughness).toBeCloseTo(base.roughness + 0.22, 6);
    const hg = opticsMaterialParamsFor(QUARTZ, { isGypsumHourglass: true }, 'transmission');
    expect(hg.clarity).toBe(0.30);
    const peri = opticsMaterialParamsFor(QUARTZ, { isPerimorphCast: true }, 'transmission');
    expect(peri.transmissive).toBe(false);
    expect(peri.perimorph).toBe(true);
    expect(peri.metalness).toBe(0);
    expect(peri.roughness).toBeCloseTo(base.roughness + 0.25, 6);
  });

  it('pearly lepidolite carries sheen and a thin clearcoat', () => {
    const p = opticsMaterialParamsFor(LEPIDOLITE, NONE, 'transmission');
    expect(p.lustre).toBe('pearly');
    expect(p.sheen).toBeGreaterThan(0);
    expect(p.clearcoat).toBeGreaterThan(0);
  });
});

describe('R2 buildCrystalMaterial (real THREE.MeshPhysicalMaterial)', () => {
  it('transmissive quartz: opacity 1, depth write on, ior set, body colour as attenuation, pale base colour, receipt in userData', () => {
    const mat = buildCrystalMaterial(crystal(), QUARTZ, NONE, 'transmission');
    expect(mat.type).toBe('MeshPhysicalMaterial');
    expect(mat.transmission).toBeGreaterThan(0.9);
    expect(mat.opacity).toBe(1);
    expect(mat.transparent).toBe(false);
    expect(mat.depthWrite).toBe(true);
    expect(mat.ior).toBe(1.547);
    expect(mat.specularIntensity).toBe(1);
    expect(mat.side).toBe(THREE.DoubleSide);
    const o = mat.userData.optics;
    expect(o).toMatchObject({ tier: 'transmission', transmissive: true, lustre: 'vitreous' });
    expect(mat.attenuationColor.getHex()).toBe(o.body);
    // the base colour is lifted toward white so the body colour rides as attenuation
    const body = new THREE.Color(o.body);
    expect(mat.color.r).toBeGreaterThanOrEqual(body.r - 1e-6);
    expect(mat.color.g).toBeGreaterThanOrEqual(body.g - 1e-6);
    expect(mat.color.b).toBeGreaterThanOrEqual(body.b - 1e-6);
    expect(mat.thickness).toBeGreaterThan(0);
    expect(mat.attenuationDistance).toBeGreaterThan(0);
  });

  it('the same quartz on the alpha tier is Depth-A: transparent, opacity 1 − 0.70·clarity, no transmission, body colour on the surface', () => {
    const mat = buildCrystalMaterial(crystal(), QUARTZ, NONE, 'alpha');
    expect(mat.transmission).toBe(0);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBeCloseTo(1 - 0.70 * 0.92, 6);
    expect(mat.depthWrite).toBe(true);
    expect(mat.color.getHex()).toBe(mat.userData.optics.body);
    expect(mat.userData.optics.tier).toBe('alpha');
  });

  it('galena is a metal whose F0 is its measured reflectance in its own hue; cerussite is a dielectric at n 1.98', () => {
    const g = buildCrystalMaterial(crystal(3, 'galena'), GALENA, NONE, 'transmission');
    expect(g.metalness).toBe(1);
    expect(g.transmission).toBe(0);
    expect(g.transparent).toBe(false);
    expect(g.roughness).toBe(OPTICS_LUSTRE_TABLE.metallic.roughness);
    expect(g.userData.optics.reflectance).toBeCloseTo(0.428, 6);
    const y = 0.2126 * g.color.r + 0.7152 * g.color.g + 0.0722 * g.color.b;
    expect(y).toBeCloseTo(0.428, 2);                       // not the swatch's 0.18
    expect(g.color.getHex()).not.toBe(g.userData.optics.body);
    const c = buildCrystalMaterial(crystal(4, 'cerussite'), CERUSSITE, NONE, 'transmission');
    expect(c.metalness).toBe(0);
    expect(c.ior).toBe(1.984);
    expect(c.roughness).toBe(OPTICS_LUSTRE_TABLE.adamantine.roughness);
    expect(c.transmission).toBeGreaterThan(0);
  });

  it('sector-zoned bodies keep white + vertexColors on both tiers (the baked sandglass is absolute)', () => {
    for (const tier of ['transmission', 'alpha']) {
      const mat = buildCrystalMaterial(crystal(), QUARTZ, { isSectorZoned: true, isGypsumHourglass: true }, tier);
      expect(mat.vertexColors).toBe(true);
      expect(mat.color.getHex()).toBe(0xffffff);
    }
  });

  it('a perimorph cast is a translucent shell on both tiers (opacity ≤ 0.42, never transmission)', () => {
    for (const tier of ['transmission', 'alpha']) {
      const mat = buildCrystalMaterial(crystal(), QUARTZ, { isPerimorphCast: true }, tier);
      expect(mat.transmission).toBe(0);
      expect(mat.transparent).toBe(true);
      expect(mat.opacity).toBeLessThanOrEqual(0.42);
    }
  });

  it('the default tier without a Three state is transmission (the desktop default)', () => {
    const mat = buildCrystalMaterial(crystal(), QUARTZ, NONE);
    expect(mat.userData.optics.tier).toBe('transmission');
  });
});

describe('R2 extent → thickness', () => {
  it('thickness and attenuation distance follow the crystal\'s own smallest scaled extent', () => {
    const mat = buildCrystalMaterial(crystal(), QUARTZ, NONE, 'transmission');
    _opticsApplyExtent(mat, 10);
    expect(mat.thickness).toBeCloseTo(10 * OPTICS_THICKNESS_FRACTION, 6);
    expect(mat.attenuationDistance).toBeCloseTo(10 * (OPTICS_ATTENUATION_BASE + OPTICS_ATTENUATION_SPAN * 0.92), 6);
    expect(mat.userData.optics.extent_mm).toBe(10);
    expect(_opticsExtentOfScale({ x: 2, y: 8, z: 2 })).toBe(2);
    expect(_opticsExtentOfScale({ x: 0.01, y: 8, z: 2 })).toBe(0.2);   // floor
    expect(_opticsExtentOfScale(null)).toBe(1);
  });

  it('is a no-op on a material without an optics receipt (a plain band material)', () => {
    const plain = new THREE.MeshStandardMaterial();
    expect(() => _opticsApplyExtent(plain, 10)).not.toThrow();
    expect(plain.thickness).toBeUndefined();
  });
});

function sceneState(tier: string) {
  const crystals = new THREE.Group();
  const q = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), buildCrystalMaterial(crystal(1), QUARTZ, NONE, tier));
  q.userData = { crystal_id: 1, mineral: 'quartz', naturalOpacity: q.material.transparent ? q.material.opacity : 1.0 };
  const g = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), buildCrystalMaterial(crystal(2, 'galena'), GALENA, NONE, tier));
  g.userData = { crystal_id: 2, mineral: 'galena', naturalOpacity: 1.0 };
  const band = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.3 }));
  band.userData = { o5Band: true };
  // an O2-contacted body carries [euhedral, contact]; the contact clone has no optics receipt
  const c = buildCrystalMaterial(crystal(3), QUARTZ, NONE, tier);
  const contact = c.clone(); contact.userData.optics = null; contact.transmission = 0;
  const o2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [c, contact]);
  o2.userData = { crystal_id: 3, mineral: 'quartz', naturalOpacity: c.transparent ? c.opacity : 1.0 };
  crystals.add(q); crystals.add(g); crystals.add(band); crystals.add(o2);
  return { crystals, opticsRig: { tier, active: tier, backdrop: true, reason: 'test', retiers: 0, transmissive: 0, alpha: 0, opaque: 0 }, q, g, band, o2, contact };
}

describe('R2 active tier follows the wall (glass needs an opaque backdrop)', () => {
  it('a translucent orb shell or a hidden wall drops the ACTIVE tier to alpha; an opaque wall brings the glass back; capability untouched', () => {
    const st: any = sceneState('transmission');
    st.cavity = { visible: true, material: { transparent: true } };
    let rig = _topoOpticsSyncView(st);
    expect(rig).toMatchObject({ tier: 'transmission', active: 'alpha', backdrop: false, retiers: 1 });
    expect(st.q.material.transparent).toBe(true);
    expect(st.q.material.transmission).toBe(0);
    st.cavity.material.transparent = false;
    rig = _topoOpticsSyncView(st);
    expect(rig).toMatchObject({ tier: 'transmission', active: 'transmission', backdrop: true, retiers: 2 });
    expect(st.q.material.transmission).toBeGreaterThan(0.9);
    st.cavity.visible = false;
    rig = _topoOpticsSyncView(st);
    expect(rig).toMatchObject({ active: 'alpha', backdrop: false, retiers: 3 });
    // an alpha capability never comes back up, whatever the wall does
    _topoOpticsApplyTier(st, 'alpha', 'gate');
    st.cavity.visible = true;
    expect(_topoOpticsSyncView(st)).toMatchObject({ tier: 'alpha', active: 'alpha', backdrop: true });
  });

  it('_topoApplyWallDisplay drives it: orb view → alpha, inside the cavity → glass, hidden wall → alpha', () => {
    const st: any = sceneState('transmission');
    st.cavity = { visible: true, material: { side: null, opacity: -1, transparent: null, depthWrite: null, needsUpdate: false } };
    st.wallDisplay = 0; st.insideMode = false;
    _topoApplyWallDisplay(st);
    expect(st.opticsRig).toMatchObject({ active: 'alpha', backdrop: false });
    st.insideMode = true;
    _topoApplyWallDisplay(st);
    expect(st.opticsRig).toMatchObject({ active: 'transmission', backdrop: true });
    expect(st.q.material.transmission).toBeGreaterThan(0.9);
    st.wallDisplay = 2;
    _topoApplyWallDisplay(st);
    expect(st.opticsRig).toMatchObject({ active: 'alpha', backdrop: false });
  });

  it('new materials are built on the ACTIVE tier, so a rebuilt mesh matches the scene', () => {
    // buildCrystalMaterial without an override reads the live state's active tier; with no
    // live state (this harness) it falls back to transmission — pinned in the builder tests.
    const p = opticsMaterialParamsFor(QUARTZ, NONE, 'alpha');
    expect(p.transmissive).toBe(false);
  });
});

describe('R2 in-place retier (_topoOpticsApplyTier)', () => {
  it('transmission → alpha lands every transmissive body on Depth-A, leaves metals, bands and contact faces alone, and counts', () => {
    const st = sceneState('transmission');
    const v0 = st.q.material.version;
    const rig = _topoOpticsApplyTier(st, 'alpha', 'test step-down');
    expect(rig).toMatchObject({ tier: 'alpha', active: 'alpha', reason: 'test step-down', retiers: 1, transmissive: 0, alpha: 2, opaque: 1 });
    expect(st.q.material.transmission).toBe(0);
    expect(st.q.material.transparent).toBe(true);
    expect(st.q.material.opacity).toBeCloseTo(1 - 0.70 * 0.92, 6);
    expect(st.q.material.version).toBeGreaterThan(v0);           // needsUpdate: the program must recompile
    expect(st.q.userData.naturalOpacity).toBeCloseTo(1 - 0.70 * 0.92, 6);
    expect(st.g.material.metalness).toBe(1);
    expect(st.g.material.transparent).toBe(false);
    expect(st.band.material.opacity).toBe(0.3);
    expect(st.contact.transmission).toBe(0);
    expect(st.contact.transparent).toBe(false);
    expect(st.o2.material[0].transparent).toBe(true);
  });

  it('alpha → transmission restores the glass and the naturalOpacity of 1', () => {
    const st = sceneState('alpha');
    expect(st.q.material.transparent).toBe(true);
    const rig = _topoOpticsApplyTier(st, 'transmission');
    expect(rig).toMatchObject({ tier: 'transmission', active: 'transmission', backdrop: true, retiers: 1, transmissive: 2, alpha: 0, opaque: 1 });
    expect(st.q.material.transmission).toBeGreaterThan(0.9);
    expect(st.q.material.transparent).toBe(false);
    expect(st.q.material.opacity).toBe(1);
    expect(st.q.userData.naturalOpacity).toBe(1);
    expect(st.q.material.attenuationColor.getHex()).toBe(st.q.material.userData.optics.body);
  });

  it('re-applying the current tier is a count, not a retier', () => {
    const st = sceneState('transmission');
    const v0 = st.q.material.version;
    const rig = _topoOpticsApplyTier(st, 'transmission');
    expect(rig.retiers).toBe(0);
    expect(st.q.material.version).toBe(v0);
  });

  it('null-safe on a bare state', () => {
    expect(_topoOpticsApplyTier(null, 'alpha')).toBeNull();
    expect(_topoOpticsApplyTier({}, 'alpha')).toMatchObject({ tier: 'alpha', transmissive: 0, alpha: 0, opaque: 0 });
  });
});

describe('R2 rig install decision', () => {
  it('a desktop viewport with a live environment starts on transmission', () => {
    const rig = _topoOpticsInstallRig({ lightingRig: { environment: true } });
    expect(rig.tier).toBe('transmission');
    expect(rig.reason).toMatch(/desktop/);
  });

  it('a lighting-rig fallback starts on alpha and says why', () => {
    const rig = _topoOpticsInstallRig({ lightingRig: { environment: false, reason: 'no PMREMGenerator' } });
    expect(rig.tier).toBe('alpha');
    expect(rig.reason).toMatch(/lighting rig fell back/);
    expect(rig.reason).toMatch(/no PMREMGenerator/);
  });

  it('the mobile tier constant is the alpha fallback (decision D1: alpha only as low-performance fallback)', () => {
    expect(OPTICS_MOBILE_TIER).toBe('alpha');
  });
});

describe('R2 step-down ladder', () => {
  const slow = () => LIGHTING_SLOW_RENDER_MS * 2;
  function gatedSceneState() {
    const st: any = sceneState('transmission');
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.castShadow = true;
    directional.shadow.mapSize.set(LIGHTING_SHADOW_MAP_DESKTOP, LIGHTING_SHADOW_MAP_DESKTOP);
    st.directional = directional;
    st.lightingGate = { shadows: true, shadow_map: LIGHTING_SHADOW_MAP_DESKTOP, slow_renders: 0, step_downs: 0, last_render_ms: null };
    st.lightingRig = { mood: 'cave', environment: true, shadows: true, shadow_map: LIGHTING_SHADOW_MAP_DESKTOP, step_downs: 0 };
    return st;
  }

  it('sheds one shadow halving, then transmission, then the rest of the shadow ladder', () => {
    const st = gatedSceneState();
    const ladder: string[] = [];
    let guard = 0;
    while ((st.lightingGate.shadows || st.opticsRig.tier === 'transmission') && guard++ < 20) {
      for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK; i++) _topoLightingNoteRenderTime(st, slow());
      ladder.push(`${st.lightingGate.shadows ? st.lightingGate.shadow_map : 0}:${st.opticsRig.tier}`);
    }
    expect(ladder).toEqual(['1024:transmission', '1024:alpha', '512:alpha', '0:alpha']);
    expect(st.lightingRig.step_downs).toBe(4);
    expect(st.opticsRig.reason).toMatch(/step-down gate/);
    expect(st.q.material.transparent).toBe(true);          // the scene really moved
    // nothing left to shed
    for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK; i++) _topoLightingNoteRenderTime(st, slow());
    expect(st.lightingRig.step_downs).toBe(4);
  });

  it('a scene already on alpha keeps the R1 ladder exactly', () => {
    const st = gatedSceneState();
    _topoOpticsApplyTier(st, 'alpha', 'mobile');
    const ladder: number[] = [];
    let guard = 0;
    while (st.lightingGate.shadows && guard++ < 20) {
      for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK; i++) _topoLightingNoteRenderTime(st, slow());
      ladder.push(st.lightingGate.shadows ? st.lightingGate.shadow_map : 0);
    }
    expect(ladder).toEqual([1024, 512, 0]);
    expect(st.opticsRig.retiers).toBe(1);   // only the explicit one above
  });
});
