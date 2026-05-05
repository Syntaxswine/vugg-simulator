// tests-js/determinism.test.ts — same seed → same output.
// Catches RNG ordering bugs and any accidental Math.random() leak in
// engine code; the largest class of "regression I can't reproduce"
// problems lives downstream of breaking determinism.

import { describe, expect, it } from 'vitest';
import { runScenario, summarizeByMineral } from './helpers';

describe('determinism — seed produces stable output', () => {
  // Pick a few scenarios with different mechanics. cooling is the
  // simplest baseline; mvt exercises fluid-mixing; porphyry runs the
  // multi-pulse event path.
  const SCENARIOS_TO_CHECK = ['cooling', 'mvt', 'porphyry'];

  for (const name of SCENARIOS_TO_CHECK) {
    it(`${name} @ seed 42 — two runs match crystal-by-crystal`, () => {
      const sim1 = runScenario(name, { seed: 42 });
      const sim2 = runScenario(name, { seed: 42 });
      expect(sim1).toBeTruthy();
      expect(sim2).toBeTruthy();
      expect(sim1.crystals.length).toBe(sim2.crystals.length);
      // Pair-wise compare — order matters because crystal_id is
      // assigned in nucleation order.
      for (let i = 0; i < sim1.crystals.length; i++) {
        const c1 = sim1.crystals[i];
        const c2 = sim2.crystals[i];
        expect(c2.crystal_id).toBe(c1.crystal_id);
        expect(c2.mineral).toBe(c1.mineral);
        expect(c2.habit).toBe(c1.habit);
        expect(c2.nucleation_step).toBe(c1.nucleation_step);
        expect(c2.dissolved).toBe(c1.dissolved);
        // Float comparison — total_growth_um goes through many adds;
        // tolerate sub-µm drift but flag anything macroscopic. In
        // practice exact match is what we get with deterministic RNG
        // and no Math.random() leaks; the ε is just paranoia.
        expect(Math.abs(c2.total_growth_um - c1.total_growth_um)).toBeLessThan(0.01);
      }
    });
  }

  it('summary diff is empty across two seed-42 runs', () => {
    const a = summarizeByMineral(runScenario('mvt', { seed: 42 }));
    const b = summarizeByMineral(runScenario('mvt', { seed: 42 }));
    expect(b).toEqual(a);
  });

  it('different seeds produce different output (anti-degenerate check)', () => {
    const sim42 = runScenario('mvt', { seed: 42 });
    const sim999 = runScenario('mvt', { seed: 999 });
    // If two unrelated seeds produce identical crystal anchors, the
    // seed isn't reaching the nucleation RNG and the "determinism"
    // claim is vacuous. Compare crystal anchors (ring + cell), which
    // are randomly chosen per-nucleation and so should differ even
    // when the same minerals fire at the same supersat thresholds.
    // mvt is the right comparison vehicle: enough crystals (~25) to
    // give a robust probabilistic differ, fewer scenario gates than
    // cooling (where deterministic chemistry can pick the same
    // mineral set across seeds).
    const anchorsA = sim42.crystals.map((c: any) => `${c.wall_ring_index},${c.wall_center_cell}`).join(';');
    const anchorsB = sim999.crystals.map((c: any) => `${c.wall_ring_index},${c.wall_center_cell}`).join(';');
    expect(anchorsA === anchorsB).toBe(false);
  });
});
