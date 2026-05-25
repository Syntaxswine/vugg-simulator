// Vitest config — JS test harness for vugg-simulator.
//
// The shipped product is the JS bundle in index.html (Python in vugg/
// is dead code). This harness loads the dist/ tsc output (same files
// build.mjs concatenates into the bundle), evals it inside jsdom so
// fetch / DOM globals are available, and exposes the simulator's
// classes for tests to drive scenarios deterministically.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests-js/**/*.test.ts'],
    setupFiles: ['tests-js/setup.ts'],
    // Run bundle setup once per file rather than per test — eval is
    // expensive (~109 module concat + jsdom init).
    isolate: false,
    // Generous default; the calibration sweep test runs 20 scenarios.
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
