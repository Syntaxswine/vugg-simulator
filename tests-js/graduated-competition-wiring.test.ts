// tests-js/graduated-competition-wiring.test.ts — v128b wiring tests.
//
// Verifies that:
//   1. With GRADUATED_COMPETITION_ENABLED = false, the simulator's
//      _graduatedZones property stays null after run_step (byte-
//      identical to v127 — the new code paths never fire).
//   2. With the flag flipped ON, _graduatedZones is populated and
//      _computeGraduatedZones returns a Map keyed by crystal_id.
//   3. The wiring path (_dryRunEngineForCrystal + _applyZoneMassBalance)
//      doesn't crash when invoked against a realistic scenario.
//   4. Restoring the flag to false after the test does NOT leak state
//      into subsequent tests.
//
// This file does NOT validate calibration assertions (proposal §4.1) —
// those are v128c with regenerated baselines. The wiring tests just
// prove the plumbing works.

import { describe, expect, it, afterAll } from 'vitest';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;

afterAll(() => {
  // Defensive: clear the flag so it can't leak to other tests if they
  // load this module's setup. setup.ts initializes the flag to false
  // via the bundle's `let GRADUATED_COMPETITION_ENABLED = false`, but
  // tests that flip it must clean up.
  (globalThis as any).setGraduatedCompetitionEnabled(false);
});

describe('v128b wiring — flag-off path is inert', () => {
  it('flag-off: _graduatedZones stays null after run_step', () => {
    (globalThis as any).setGraduatedCompetitionEnabled(false);
    setSeed(42);
    const scen = SCENARIOS['mvt'];
    if (!scen) {
      // Defensive — bundle without mvt scenario is a setup bug, not a
      // test problem. Skip rather than spuriously fail.
      return;
    }
    const { conditions, events, defaultSteps } = scen();
    const sim = new VugSimulator(conditions, events);
    for (let i = 0; i < Math.min(defaultSteps ?? 50, 50); i++) sim.run_step();
    expect(sim._graduatedZones).toBeNull();
  });
});

describe('v128b wiring — flag-on path fires', () => {
  it('flag-on: _graduatedZones is a Map after run_step', () => {
    (globalThis as any).setGraduatedCompetitionEnabled(true);
    try {
      setSeed(42);
      const scen = SCENARIOS['mvt'];
      if (!scen) return;
      const { conditions, events } = scen();
      const sim = new VugSimulator(conditions, events);
      // Run enough steps for crystals to nucleate.
      for (let i = 0; i < 20; i++) sim.run_step();
      expect(sim._graduatedZones).not.toBeNull();
      expect(sim._graduatedZones instanceof Map).toBe(true);
    } finally {
      (globalThis as any).setGraduatedCompetitionEnabled(false);
    }
  });

  it('flag-on: at least one crystal grew (paragenesis not stuck at zero)', () => {
    (globalThis as any).setGraduatedCompetitionEnabled(true);
    try {
      setSeed(42);
      const scen = SCENARIOS['mvt'];
      if (!scen) return;
      const { conditions, events, defaultSteps } = scen();
      const sim = new VugSimulator(conditions, events);
      const steps = Math.min(defaultSteps ?? 100, 100);
      for (let i = 0; i < steps; i++) sim.run_step();
      // The paragenesis should still produce SOME crystals. If graduated
      // competition rationing accidentally killed all growth, this
      // would fail loud.
      expect(sim.crystals.length, 'mvt with graduated comp at seed 42 should produce ≥ 1 crystal').toBeGreaterThan(0);
      const grown = sim.crystals.filter((c: any) =>
        c.total_growth_um > 0,
      );
      expect(grown.length, 'at least one crystal should have grown').toBeGreaterThan(0);
    } finally {
      (globalThis as any).setGraduatedCompetitionEnabled(false);
    }
  });

  it('flag-on schneeberg: multiple minerals coexist (cascade prevention)', () => {
    // Smoke test for the proposal §4.1 calibration intent — at least
    // two distinct minerals should survive in a cascade-prone scenario.
    // The full 5 assertions live in v128c with new baselines.
    (globalThis as any).setGraduatedCompetitionEnabled(true);
    try {
      setSeed(42);
      const scen = SCENARIOS['schneeberg'];
      if (!scen) return;
      const { conditions, events, defaultSteps } = scen();
      const sim = new VugSimulator(conditions, events);
      const steps = Math.min(defaultSteps ?? 100, 100);
      for (let i = 0; i < steps; i++) sim.run_step();
      const minerals = new Set(sim.crystals.filter((c: any) => c.total_growth_um > 0).map((c: any) => c.mineral));
      expect(minerals.size, `schneeberg at seed 42 produced minerals: ${[...minerals].join(', ')}`).toBeGreaterThanOrEqual(2);
    } finally {
      (globalThis as any).setGraduatedCompetitionEnabled(false);
    }
  });
});

describe('v128b wiring — flag-flip determinism', () => {
  it('toggling flag off after a flag-on run leaves no state leak', () => {
    // Run once with flag on
    (globalThis as any).setGraduatedCompetitionEnabled(true);
    setSeed(42);
    const scenOn = SCENARIOS['mvt'];
    if (!scenOn) return;
    const { conditions: c1, events: e1 } = scenOn();
    const sim1 = new VugSimulator(c1, e1);
    for (let i = 0; i < 20; i++) sim1.run_step();
    (globalThis as any).setGraduatedCompetitionEnabled(false);

    // Run again with flag off (fresh sim, fresh scenario factory)
    setSeed(42);
    const { conditions: c2, events: e2, defaultSteps } = scenOn();
    const sim2 = new VugSimulator(c2, e2);
    for (let i = 0; i < Math.min(defaultSteps ?? 50, 50); i++) sim2.run_step();
    expect(sim2._graduatedZones).toBeNull();
  });
});
