// Roughten Gill brochantite widened-seed coverage — own file so it can
// run in parallel with sphalerite-seeds (and the rest of the suite).

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

describe('Roughten Gill — brochantite seed coverage', () => {
  // Budget 150 s → 300 s (2026-09-05): 148.3 s in the cold-CI run of 5d746d7b and 146 s alone
  // on 6a82949b, on an idle canonical box — ~98 % of the budget; it TIMED OUT under the 04:00
  // canary sweep that morning (and on untouched canonical, the control). Same reasoning as
  // the sphalerite sibling: the clock, not the coverage claim.
  it('fires brochantite across the seed sample (Cu-SO4 supergene — v109 tune gain)', { timeout: 300000 }, () => {
    let anyHit = 0;
    for (const seed of SEEDS) {
      const s = runScenario('roughten_gill', seed);
      if (s.crystals.some((c: any) => c.mineral === 'brochantite')) anyHit++;
    }
    expect(anyHit,
      `expected at least 1/${SEEDS.length} roughten_gill seeds to fire brochantite; got ${anyHit}/${SEEDS.length}`)
      .toBeGreaterThan(0);
  });
});
