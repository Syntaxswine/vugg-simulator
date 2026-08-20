// tests-js/calibration-shard-3.test.ts — seed-42 calibration sweep, shard 3/8.
// The scenario slice, the run, and the assertions all live in
// calibration-lib.ts; the partition/coverage proof lives in
// calibration.test.ts. See the lib header for why this is sharded.

import { describe } from 'vitest';
import { CALIBRATION_SHARD_COUNT, registerCalibrationShard, version } from './calibration-lib';

describe(`calibration sweep — seed 42 vs JS baseline v${version} (shard 3/${CALIBRATION_SHARD_COUNT})`, () => {
  registerCalibrationShard(3);
});