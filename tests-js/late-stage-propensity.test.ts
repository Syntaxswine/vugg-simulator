// tests-js/late-stage-propensity.test.ts — Proposal C (2026-05).
//
// Generalizes the binary fill_exempt flag (Backlog K) into a continuous
// 0-1 per-mineral gradient. The effective dampener applied to a
// nucleation roll at high fill is:
//
//   D' = D + p × (1 - D)
//
// where D is the global sigmoid dampener (Proposal A) and p is the
// per-mineral late_stage_propensity (0 = vanilla, 1 = legacy fill_exempt).
//
// This suite pins:
//   * Data discipline: the 20 scored minerals carry the expected
//     propensity values + audit-trail notes.
//   * Resolver math: D'(D, p) matches the formula at three (D, p)
//     anchor points.
//   * Backward compat: fill_exempt:true still produces p=1.0 behavior
//     even without an explicit late_stage_propensity field.
//   * End-to-end: in a fixture sim with _fillDampener forced low,
//     high-propensity minerals pass the gate more often than bulk
//     minerals.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

declare const VugSimulator: any;
declare const VugConditions: any;
declare const VugWall: any;
declare const FluidChemistry: any;
declare const setSeed: any;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTHORED_SPEC = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8'),
).minerals;

// The 20 scored minerals + their authored propensity. Source: the
// scoring table in tools/add_late_stage_propensity.mjs (which got
// run once for the initial Proposal C ship and can be safely deleted
// — these values are the source of truth from here on).
const AUTHORED_PROPENSITY: Record<string, number> = {
  borax: 1.0,
  mirabilite: 1.0,
  thenardite: 1.0,
  sylvite: 1.0,
  tincalconite: 1.0,
  lepidocrocite: 0.9,
  chalcanthite: 0.8,
  erythrite: 0.7,
  annabergite: 0.7,
  goethite: 0.6,
  chrysocolla: 0.6,
  aurichalcite: 0.6,
  calcite: 0.4,
  native_tellurium: 0.4,
  malachite: 0.3,
  aragonite: 0.3,
  azurite: 0.3,
  quartz: 0.2,
  fluorite: 0.2,
  barite: 0.2,
};

function makeBareConditions() {
  return new VugConditions({
    fluid: new FluidChemistry({ pH: 7, concentration: 1.0 }),
    wall: new VugWall(),
    temperature: 25,
    pressure_bars: 1,
  });
}

describe('Proposal C — late_stage_propensity gradient', () => {
  describe('data discipline', () => {
    it('every scored mineral carries the authored propensity', () => {
      for (const [m, p] of Object.entries(AUTHORED_PROPENSITY)) {
        const entry = AUTHORED_SPEC[m];
        expect(entry, `${m} should exist in spec`).toBeTruthy();
        expect(entry.late_stage_propensity, `${m} propensity should be ${p}`).toBeCloseTo(p, 3);
      }
    });

    it('every scored mineral carries a _late_stage_note audit trail', () => {
      for (const m of Object.keys(AUTHORED_PROPENSITY)) {
        const note = AUTHORED_SPEC[m]._late_stage_note;
        expect(typeof note, `${m} should have _late_stage_note`).toBe('string');
        expect(note.length, `${m} note should be substantive`).toBeGreaterThan(40);
        expect(note, `${m} note should reference Proposal C / 2026-05`).toMatch(/Proposal C|2026-05/);
      }
    });

    it('bulk minerals (galena, pyrite, sphalerite, magnetite) carry NO propensity', () => {
      // Negative space — confirms the bulk-mineral set wasn't accidentally
      // tagged. If any of these end up with propensity, the late_stage
      // scoring has drifted into bulk minerals.
      for (const m of ['galena', 'pyrite', 'sphalerite', 'magnetite', 'corundum']) {
        const entry = AUTHORED_SPEC[m];
        expect(entry, `${m} should exist`).toBeTruthy();
        expect(entry.late_stage_propensity, `${m} should NOT have propensity`).toBeUndefined();
      }
    });

    it('fill_exempt set also carries propensity:1.0 (alongside fill_exempt:true for backward compat)', () => {
      for (const m of ['borax', 'mirabilite', 'thenardite', 'sylvite']) {
        expect(AUTHORED_SPEC[m].fill_exempt).toBe(true);
        expect(AUTHORED_SPEC[m].late_stage_propensity).toBeCloseTo(1.0, 3);
      }
    });
  });

  describe('resolver math: D + p × (1 - D)', () => {
    it('at dampener=0.5, propensity=0.4 yields effective=0.7 (calcite at mid-fill)', () => {
      setSeed(42);
      const sim = new VugSimulator(makeBareConditions(), []);
      sim._fillDampener = 0.5;
      // 1000 rolls. Expected pass-through rate ≈ 0.7 → blocked ≈ 30%.
      // Calcite has propensity 0.4, so effective = 0.5 + 0.4*0.5 = 0.7.
      let blocked = 0;
      for (let i = 0; i < 1000; i++) {
        if (sim._atNucleationCap('calcite')) blocked++;
      }
      // 30% ± noise band (200-400 blocks out of 1000).
      expect(blocked).toBeGreaterThan(200);
      expect(blocked).toBeLessThan(400);
    });

    it('at dampener=0.2, propensity=0.9 yields effective=0.92 (lepidocrocite at high-fill)', () => {
      setSeed(42);
      const sim = new VugSimulator(makeBareConditions(), []);
      sim._fillDampener = 0.2;
      // effective = 0.2 + 0.9 * 0.8 = 0.92. Blocked ≈ 8%.
      let blocked = 0;
      for (let i = 0; i < 1000; i++) {
        if (sim._atNucleationCap('lepidocrocite')) blocked++;
      }
      // 8% ± noise band (30-150 blocks out of 1000).
      expect(blocked).toBeGreaterThan(30);
      expect(blocked).toBeLessThan(150);
    });

    it('propensity=1.0 minerals always pass (legacy fill_exempt behavior preserved)', () => {
      setSeed(42);
      const sim = new VugSimulator(makeBareConditions(), []);
      sim._fillDampener = 0.0;
      // borax has propensity:1.0 → effective = 1.0 → never blocked.
      let blocked = 0;
      for (let i = 0; i < 100; i++) {
        if (sim._atNucleationCap('borax')) blocked++;
      }
      expect(blocked).toBe(0);
    });
  });

  describe('backward compat: fill_exempt:true without late_stage_propensity field', () => {
    it('engine source has the backward-compat fallback branch', () => {
      // The runtime spec captured at IIFE-return time on globalThis
      // is a separate reference from the engine's internal MINERAL_SPEC,
      // so mocking globalThis.MINERAL_SPEC doesn't reach the engine.
      // Pin the backward-compat branch via source inspection: the
      // _atNucleationCap function should contain the fallback
      // `else if (spec.fill_exempt) { propensity = 1.0 }`.
      setSeed(42);
      const sim = new VugSimulator(makeBareConditions(), []);
      const src = sim._atNucleationCap.toString();
      // Two halves of the branch: the `late_stage_propensity` lookup
      // AND the `fill_exempt` fallback. Both must be present.
      expect(src, '_atNucleationCap should read late_stage_propensity').toMatch(/late_stage_propensity/);
      expect(src, '_atNucleationCap should have fill_exempt backward-compat fallback').toMatch(/fill_exempt/);
    });
  });

  describe('the gradient produces relative ordering at high fill', () => {
    // At a fixed dampener, minerals with higher propensity pass the gate
    // more often than bulk minerals. Pin the relative ordering across a
    // few representative minerals.
    it('lepidocrocite (0.9) passes more often than calcite (0.4) than galena (0)', () => {
      setSeed(42);
      const sim = new VugSimulator(makeBareConditions(), []);
      sim._fillDampener = 0.3;
      const counts: Record<string, number> = { lepidocrocite: 0, calcite: 0, galena: 0 };
      for (let i = 0; i < 1000; i++) {
        for (const m of Object.keys(counts)) {
          if (!sim._atNucleationCap(m)) counts[m]++;
        }
      }
      // Expected effective dampeners:
      //   galena       (p=0):   0.3 + 0 = 0.30 → 30% pass
      //   calcite      (p=0.4): 0.3 + 0.4 * 0.7 = 0.58 → 58% pass
      //   lepidocrocite(p=0.9): 0.3 + 0.9 * 0.7 = 0.93 → 93% pass
      expect(counts.lepidocrocite).toBeGreaterThan(counts.calcite);
      expect(counts.calcite).toBeGreaterThan(counts.galena);
    });
  });
});
