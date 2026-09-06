// Roughten Gill sphalerite widened-seed coverage — own file so it can
// run in parallel with brochantite-seeds (and the rest of the suite).

import { describe, expect, it } from 'vitest';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;

function runScenario(scenarioName: string, seed = 42) {
  setSeed(seed);
  const scen = SCENARIOS[scenarioName];
  if (!scen) return null;
  const { conditions, events, defaultSteps } = scen();
  const sim = new VugSimulator(conditions, events);
  const steps = defaultSteps ?? 200;
  for (let i = 0; i < steps; i++) sim.run_step();
  return sim;
}

const SEEDS = [42, 1, 7, 13, 99, 2024, 17, 3, 5, 11, 23, 47, 71, 137, 211, 313];

describe('Roughten Gill — sphalerite seed coverage', () => {
  // Budget 150 s → 300 s (2026-09-05). Sixteen full roughten_gill runs measured on the
  // canonical box, idle: 150.07 s on 6a82949b (a PASS by 0.8 s), 155.4 s on the render-only
  // R1 bake 5d746d7b (a cold-CI RED at batch 195 with the science byte-identical), and a
  // TIMEOUT under the 04:00 canary sweep that morning. A gate at 100 % of its budget flips
  // on run-to-run noise; 300 s is the pharmacolite-seeds convention. The seed count and the
  // assertion are unchanged — this is the clock, not the coverage claim.
  it('fires sphalerite as Zn primary across the seed sample', { timeout: 300000 }, () => {
    let anyHit = 0;
    for (const seed of SEEDS) {
      const s = runScenario('roughten_gill', seed);
      if (s.crystals.filter((c: any) => c.mineral === 'sphalerite').length > 0) anyHit++;
    }
    expect(anyHit,
      `expected at least 1/${SEEDS.length} roughten_gill seeds to fire sphalerite; got ${anyHit}/${SEEDS.length}`)
      .toBeGreaterThan(0);
  });
});
