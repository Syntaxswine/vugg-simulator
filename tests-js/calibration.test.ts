// tests-js/calibration.test.ts — partition + coverage proof for the
// seed-42 calibration sweep.
//
// The per-scenario runs live in calibration-shard-*.test.ts (8 files; the
// slice, the run and the assertions are all in calibration-lib.ts). This
// file is what makes that split safe: a scenario can vanish from every
// shard only by first failing the partition proof here. Adopted from
// Flint's PR #8 shape, re-grounded on the authenticated-evidence loader.
//
// What the sweep catches: any chemistry / engine / RNG ordering change
// that shifts seed-42 output. When SIM_VERSION bumps, the workflow is:
//   1. Bump SIM_VERSION in js/15-version.ts.
//   2. `npm run build`
//   3. `node tools/gen-js-baseline.mjs` → writes
//      tests-js/baselines/seed42_v<N>.json.
//   4. Diff against the previous baseline; commit the new one if the
//      shifts are intentional and within the band you'd defend.
// The shard files authenticate the baseline matching the current built
// SIM_VERSION. Missing, stale, or tampered evidence fails closed.
//
// Mirror of vugg-simulator's old Python tests/baselines/seed42_v*.json
// regression sweep, ported to the JS runtime that actually ships.

import { describe, expect, it } from 'vitest';
import { scenarioNames } from './helpers';
import {
  CALIBRATION_SHARD_COUNT,
  baselineScenarios,
  scenariosForShard,
} from './calibration-lib';

describe('calibration sweep — partition and coverage', () => {
  it('baseline + runtime SCENARIOS cover the same set', () => {
    const live = scenarioNames();
    expect(live.sort()).toEqual(baselineScenarios);
  });

  it('the shards partition the baseline exactly — no scenario lost, none doubled', () => {
    // THE equivalence proof for a repartition: completeness (the union of
    // the slices is the whole baseline) and disjointness (no scenario runs
    // twice and dilutes a timing record). Every shard file registers its
    // slice through the same registerCalibrationShard the lib exports, so
    // set-equality here means run-equality with the old monolith.
    const union: string[] = [];
    for (let shard = 0; shard < CALIBRATION_SHARD_COUNT; shard++) {
      union.push(...scenariosForShard(shard));
    }
    expect([...union].sort()).toEqual(baselineScenarios);
    expect(new Set(union).size).toBe(union.length);
  });
});
