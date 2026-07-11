// tests-js/o5-split.test.ts — W-F O5 SPLITTING, the S-a record-unread tranche
// (SIM-neutral, byte-identical).
//
// S-a accrues a two-route cumulative-misorientation index (`_split`, js/44c) on
// crystals in the growth loop, and defines the splitAbility gate + rung bands,
// but NO habit/render path reads `rung` (the consumers are behind
// O5_SPLITTING_ENABLED, false until S-b). So these pins are on the pure gate/law
// + the accrual's recorded state, exactly as the O3a suite pinned
// drawNucleationTilt + _nucTilt and the O5a suite pinned sigmaStarForCoverage
// before their consumers read them.
//
// The load-bearing science pins (boss §9a): (1) two routes stay distinct — A
// (impurity, fires at LOW σ) and B (high-σ), route provenance REQUIRED; (2)
// impurity_factor = max(film φ, scenario trace, mineral hint); (3) splitAbility
// is a hard per-mineral gate with quartz/feldspar == 0 ("else high σ becomes a
// nonsense wand"); (5) exclusions — cerussite (twinning) + malachite (aggregation)
// == 0.

import { beforeEach, describe, expect, it } from 'vitest';

declare const accrueSplitIndex: any;
declare const splitAbilityFor: any;
declare const splitRung: any;
declare const splitImpurityFactor: any;
declare const setSplitKA: any;
declare const setSplitKB: any;
declare const setSplitSigmaSpherulite: any;
declare const O5_SPLITTING_ENABLED: any;

// Reset the calibration constants to their shipped S-a defaults before each test
// so numeric pins are stable regardless of any later rebind (mirrors o5-film's
// beforeEach(setSigmaStarK(1.0))).
beforeEach(() => { setSplitKA(1.0); setSplitKB(1.0); setSplitSigmaSpherulite(2.0); });

const mkCrystal = (mineral: string, over: any = {}) => ({
  crystal_id: over.id ?? 1, mineral,
  _film: over._film ?? null,
  total_growth_um: over.total_growth_um ?? 1000,
});
// A minimal conditions stub: a supersaturation fn for the mineral + a wall (for
// the scenario-trace impurity source).
const mkCond = (mineral: string, sigma: number, wall: any = {}) => ({
  ['supersaturation_' + mineral]: () => sigma,
  wall,
});

describe('W-F O5 SPLITTING — splitAbility gate (hard per-mineral, boss §9a #3+#5)', () => {
  it('quartz + feldspar are HARD ZERO ("else high σ becomes a nonsense wand")', () => {
    expect(splitAbilityFor('quartz')).toBe(0);
    expect(splitAbilityFor('feldspar')).toBe(0);
    expect(splitAbilityFor('albite')).toBe(0);
  });
  it('the boss exclusions are ZERO — cerussite (twinning), malachite (aggregation)', () => {
    expect(splitAbilityFor('cerussite')).toBe(0);
    expect(splitAbilityFor('malachite')).toBe(0);
  });
  it('unlisted minerals default to 0 (safe, byte-identical — do not eat every radiating thing)', () => {
    expect(splitAbilityFor('pyrite')).toBe(0);
    expect(splitAbilityFor('not_a_mineral')).toBe(0);
  });
  it('the readily-splitting set is positive (carbonates / zeolites / gypsum)', () => {
    expect(splitAbilityFor('dolomite')).toBeGreaterThan(0);
    expect(splitAbilityFor('selenite')).toBeGreaterThan(0);   // gypsum autodeformation
    expect(splitAbilityFor('stilbite')).toBeGreaterThan(0);   // zeolite sheaf
    expect(splitAbilityFor('scolecite')).toBeGreaterThan(0);
  });
});

describe('W-F O5 SPLITTING — splitRung bands (unread in S-a)', () => {
  it('bands index → ladder rung, none below the first cut', () => {
    expect(splitRung(0)).toBe('none');
    expect(splitRung(0.05)).toBe('none');
    expect(splitRung(0.08)).toBe('curved');    // Rung 1 (saddle / bent)
    expect(splitRung(0.3)).toBe('split');
    expect(splitRung(0.6)).toBe('sheaf');
    expect(splitRung(0.9)).toBe('spherulite');
  });
  it('is monotone non-decreasing in index', () => {
    const order = ['none', 'curved', 'split', 'sheaf', 'spherulite'];
    let prev = 0;
    for (const x of [0, 0.08, 0.25, 0.55, 0.85, 1.0]) {
      const r = splitRung(x);
      expect(order.indexOf(r)).toBeGreaterThanOrEqual(prev);
      prev = order.indexOf(r);
    }
  });
});

describe('W-F O5 SPLITTING — impurity_factor = max(film φ, scenario trace, mineral hint)', () => {
  it('reads the masking half\'s _film φ (the FIRST source, ties the two O5 halves)', () => {
    const c = mkCrystal('calcite', { _film: { phi_term: 0.2, phi_prism: 0.7, step: 1 } });
    expect(splitImpurityFactor(c, mkCond('calcite', 0))).toBe(0.7);   // most-masked axis
  });
  it('reads the intrinsic mineral hint (saddle dolomite Mg-excess) with no film', () => {
    expect(splitImpurityFactor(mkCrystal('dolomite'), mkCond('dolomite', 0))).toBeCloseTo(0.3, 6);
  });
  it('reads the scenario trace proxy from wall.split_trace', () => {
    const c = mkCrystal('calcite');
    expect(splitImpurityFactor(c, mkCond('calcite', 0, { split_trace: 0.6 }))).toBe(0.6);
  });
  it('takes the MAX across all three sources', () => {
    const c = mkCrystal('dolomite', { _film: { phi_term: 0.5, phi_prism: 0.1, step: 1 } });
    // film 0.5 vs hint 0.3 vs trace 0.4 → 0.5
    expect(splitImpurityFactor(c, mkCond('dolomite', 0, { split_trace: 0.4 }))).toBe(0.5);
  });
  it('is 0 for a clean, hint-less, trace-less crystal', () => {
    expect(splitImpurityFactor(mkCrystal('calcite'), mkCond('calcite', 0))).toBe(0);
  });
});

describe('W-F O5 SPLITTING — accrueSplitIndex two-route accrual (recorded, unread)', () => {
  it('writes NOTHING for a splitAbility-0 mineral, even at huge σ + heavy film', () => {
    const c: any = mkCrystal('quartz', { _film: { phi_term: 0.9, phi_prism: 0.9, step: 1 } });
    accrueSplitIndex(c, mkCond('quartz', 9.0), 1000);
    expect(c._split).toBeUndefined();   // the hard gate: no state written at all
  });

  it('A-route: an impure crystal accrues at LOW σ (below the spherulite onset)', () => {
    const c: any = mkCrystal('dolomite');                 // hint 0.3, no film
    accrueSplitIndex(c, mkCond('dolomite', 0.5), 1000);   // σ 0.5 < 2.0 → B silent
    expect(c._split).toBeTruthy();
    expect(c._split.index).toBeGreaterThan(0);
    expect(c._split.route).toBe('A');                     // impurity drove it, not σ
    expect(c._split.sumB).toBe(0);
  });

  it('B-route: a clean split-able crystal accrues only ABOVE the spherulite onset', () => {
    const lo: any = mkCrystal('calcite');                 // no impurity
    accrueSplitIndex(lo, mkCond('calcite', 1.0), 1000);   // σ 1.0 < 2.0 → nothing
    expect(lo._split).toBeUndefined();

    const hi: any = mkCrystal('calcite');
    accrueSplitIndex(hi, mkCond('calcite', 3.0), 1000);   // σ 3.0 > 2.0 → B fires
    expect(hi._split).toBeTruthy();
    expect(hi._split.route).toBe('B');
    expect(hi._split.sumA).toBe(0);
  });

  it('both routes compose when an impure crystal is ALSO far-from-equilibrium', () => {
    const c: any = mkCrystal('dolomite');                 // hint 0.3
    accrueSplitIndex(c, mkCond('dolomite', 3.0), 300);    // impurity AND σ>2
    expect(c._split.route).toBe('both');
    expect(c._split.sumA).toBeGreaterThan(0);
    expect(c._split.sumB).toBeGreaterThan(0);
    expect(['A', 'B']).toContain(c._split.dominant);      // provenance detail attached
  });

  it('route provenance is ALWAYS attached (boss §9a #1 — required, not optional)', () => {
    const c: any = mkCrystal('dolomite');
    accrueSplitIndex(c, mkCond('dolomite', 0.5), 500);
    expect(['A', 'B', 'both']).toContain(c._split.route);
  });

  it('does not accrue on dissolution / zero growth (splitting is a GROWTH phenomenon)', () => {
    const c: any = mkCrystal('dolomite');
    accrueSplitIndex(c, mkCond('dolomite', 3.0), 0);      // zero
    expect(c._split).toBeUndefined();
    accrueSplitIndex(c, mkCond('dolomite', 3.0), -800);   // dissolution
    expect(c._split).toBeUndefined();
  });

  it('clamps the cumulative index into [0,1]', () => {
    const c: any = mkCrystal('dolomite');
    accrueSplitIndex(c, mkCond('dolomite', 9.0), 1e9);    // absurd growth
    expect(c._split.index).toBe(1);
  });

  it('accumulates across successive steps (a cumulative integral)', () => {
    const c: any = mkCrystal('dolomite');
    accrueSplitIndex(c, mkCond('dolomite', 0.5), 200);
    const first = c._split.index;
    accrueSplitIndex(c, mkCond('dolomite', 0.5), 200);
    expect(c._split.index).toBeGreaterThan(first);
  });

  it('is deterministic (no RNG) and mutates ONLY crystal._split', () => {
    const a: any = mkCrystal('dolomite');
    const b: any = mkCrystal('dolomite');
    accrueSplitIndex(a, mkCond('dolomite', 0.5), 400);
    accrueSplitIndex(b, mkCond('dolomite', 0.5), 400);
    expect(a._split.index).toBe(b._split.index);          // repeatable
    expect(a.total_growth_um).toBe(1000);                 // growth untouched
    expect(a.mineral).toBe('dolomite');                   // nothing else changed
  });
});

describe('W-F O5 SPLITTING — the flag (S-a recorded-unread)', () => {
  it('O5_SPLITTING_ENABLED is FALSE in S-a (index accrued, read by nothing)', () => {
    expect(O5_SPLITTING_ENABLED).toBe(false);
  });
});
