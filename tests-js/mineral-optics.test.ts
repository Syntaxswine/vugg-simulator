// tests-js/mineral-optics.test.ts — Depth-A1 data lint for the per-mineral `optics` blocks
// (RESEARCH-optical-realism-2026-07-02.md §4.1; the STANDING GOAL's first data commit).
//
// The optics block is RENDER-LAYER data: diaphaneity category + a clarity scalar (the Depth-A
// consumer) + lustre terms (recorded now, consumed at Depth-B) + notes + source. This lint keeps
// the vocabulary closed and the scalars sane so buildCrystalMaterial (Depth-A2) can trust the
// data unguarded. Species WITHOUT an optics block are fine — the builder falls back to class
// defaults; this test only validates what IS declared, plus the coverage floor (the Wulff
// tenants + prominence tier 1 must be verified, not defaulted).

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DOC = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'minerals.json'), 'utf8'));
const MINERALS: Record<string, any> = DOC.minerals;
const withOptics = Object.entries(MINERALS).filter(([, m]) => m.optics) as [string, any][];

const DIAPHANEITY = new Set([
  'transparent', 'transparent_to_translucent', 'transparent_to_opaque',
  'translucent', 'translucent_to_opaque', 'opaque',
]);
const LUSTRE = new Set([
  'vitreous', 'subvitreous', 'adamantine', 'subadamantine', 'resinous', 'subresinous',
  'metallic', 'submetallic', 'pearly', 'silky', 'greasy', 'waxy', 'dull', 'earthy',
]);

describe('mineral optics blocks (Depth-A1 data lint)', () => {
  it('there ARE optics blocks (the A1 commit landed data, not just schema)', () => {
    expect(withOptics.length).toBeGreaterThanOrEqual(30);
  });

  it('every declared block is complete and in-vocabulary', () => {
    for (const [name, m] of withOptics) {
      const o = m.optics;
      expect(DIAPHANEITY.has(o.diaphaneity), `${name}: diaphaneity "${o.diaphaneity}"`).toBe(true);
      expect(typeof o.clarity, `${name}: clarity type`).toBe('number');
      expect(o.clarity, `${name}: clarity ≥ 0`).toBeGreaterThanOrEqual(0);
      expect(o.clarity, `${name}: clarity ≤ 1`).toBeLessThanOrEqual(1);
      expect(Array.isArray(o.lustre) && o.lustre.length > 0, `${name}: lustre array`).toBe(true);
      for (const t of o.lustre) expect(LUSTRE.has(t), `${name}: lustre term "${t}"`).toBe(true);
      expect(o.notes === null || typeof o.notes === 'string', `${name}: notes`).toBe(true);
      expect(typeof o.source === 'string' && o.source.length > 0, `${name}: source`).toBe(true);
    }
  });

  it('category ↔ scalar coherence: "opaque" species sit at the opaque end (clarity ≤ 0.05)', () => {
    for (const [name, m] of withOptics) {
      if (m.optics.diaphaneity === 'opaque') {
        expect(m.optics.clarity, `${name}: opaque but clarity ${m.optics.clarity}`).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('the goal benchmarks hold: Naica selenite + rock-crystal quartz are near-water-clear; the metallic opaques are 0', () => {
    expect(MINERALS.selenite.optics.clarity).toBeGreaterThanOrEqual(0.90);
    expect(MINERALS.quartz.optics.clarity).toBeGreaterThanOrEqual(0.90);
    for (const name of ['galena', 'pyrite', 'chalcopyrite', 'magnetite', 'stibnite']) {
      expect(MINERALS[name].optics.clarity, name).toBe(0);
    }
  });

  it('coverage floor: all six Wulff tenants + prominence tier 1 carry VERIFIED optics (not class defaults)', () => {
    const mustHave = [
      // the Wulff tenants (the showcase forms deserve verified clarity)
      'fluorite', 'calcite', 'wulfenite', 'barite', 'galena', 'titanite',
      // prominence tier 1 (expects_species count ≥ 4 across the fleet)
      'quartz', 'sphalerite', 'pyrite', 'feldspar', 'selenite', 'chalcopyrite',
    ];
    for (const name of mustHave) {
      expect(MINERALS[name], `${name} exists`).toBeTruthy();
      expect(MINERALS[name].optics, `${name} has optics`).toBeTruthy();
    }
  });

  // R2 (2026-09-06): the transmission tier reads optics.ior — the MEAN principal refractive
  // index (uniaxial (2ω+ε)/3, biaxial (α+β+γ)/3, isotropic n), verified against webmineral's
  // Optical Data line by tools/optics-ior-verify.mjs (three manual Handbook-of-Mineralogy
  // values where webmineral has no line: spodumene, wollastonite, pararealgar).
  it('R2: every species that can transmit (clarity > 0.15) carries a mean refractive index in [1.3, 3.5]', () => {
    for (const [name, m] of withOptics) {
      const o = m.optics;
      if (o.ior !== undefined) {
        expect(typeof o.ior, `${name}: ior type`).toBe('number');
        expect(o.ior, `${name}: ior ≥ 1.3`).toBeGreaterThanOrEqual(1.3);
        expect(o.ior, `${name}: ior ≤ 3.5`).toBeLessThanOrEqual(3.5);
      }
      if (o.clarity > 0.15) {
        expect(typeof o.ior, `${name}: transmissive species without ior (run tools/optics-ior-verify.mjs)`).toBe('number');
      }
    }
  });

  // R2: a metal's F0 is its reflectance at normal incidence — optics.reflectance (per cent,
  // R at 589 nm in air; Handbook of Mineralogy R tables via tools/optics-reflectance-verify.mjs)
  it('R2: every metallic/submetallic block carries a measured reflectance in [3, 100] %', () => {
    for (const [name, m] of withOptics) {
      const o = m.optics;
      if (o.reflectance !== undefined) {
        expect(typeof o.reflectance, `${name}: reflectance type`).toBe('number');
        expect(o.reflectance, `${name}: reflectance ≥ 3`).toBeGreaterThanOrEqual(3);
        expect(o.reflectance, `${name}: reflectance ≤ 100`).toBeLessThanOrEqual(100);
      }
      if (/^(sub)?metallic$/.test(o.lustre[0])) {
        expect(typeof o.reflectance, `${name}: metallic lustre without reflectance (run tools/optics-reflectance-verify.mjs)`).toBe('number');
      }
    }
    // benchmarks — the ore-microscopy numbers everyone knows
    expect(MINERALS.galena.optics.reflectance).toBeGreaterThan(40);
    expect(MINERALS.galena.optics.reflectance).toBeLessThan(46);
    expect(MINERALS.pyrite.optics.reflectance).toBeGreaterThan(50);
    expect(MINERALS.native_silver.optics.reflectance).toBeGreaterThan(85);
  });

  it('R2 benchmarks: quartz 1.547, calcite 1.595, fluorite 1.433, sphalerite 2.40, cerussite 1.984, selenite 1.524', () => {
    expect(MINERALS.quartz.optics.ior).toBeCloseTo(1.547, 3);
    expect(MINERALS.calcite.optics.ior).toBeCloseTo(1.595, 3);     // (2·1.65 + 1.486)/3 — the mean, not ω
    expect(MINERALS.fluorite.optics.ior).toBeCloseTo(1.433, 3);
    expect(MINERALS.sphalerite.optics.ior).toBeCloseTo(2.40, 2);
    expect(MINERALS.cerussite.optics.ior).toBeCloseTo(1.984, 3);
    expect(MINERALS.selenite.optics.ior).toBeCloseTo(1.524, 3);
    // the metallic opaques carry none — they are read by reflectance, not refraction
    for (const name of ['galena', 'pyrite', 'chalcopyrite', 'stibnite', 'native_gold']) {
      expect(MINERALS[name].optics.ior, name).toBeUndefined();
    }
  });

  it('lustre face-notes preserved for the famous cases (Depth-B consumers)', () => {
    expect(MINERALS.apophyllite.optics.notes).toMatch(/pearly on \{001\}/);
    expect(MINERALS.selenite.optics.notes).toMatch(/pearly on \{010\}/);
  });
});
