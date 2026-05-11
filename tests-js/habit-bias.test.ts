// tests-js/habit-bias.test.ts — Phase D habit-bias (3D Vision plan).
//
// Pins the gravity-aware c-axis helper that the Three.js renderer uses
// for crystals with growth_environment === 'air' (= nucleated in a
// vadose / drained cavity). The wireframe renderer (99d) already had
// this; Phase D ports the logic to the Three.js path.
//
// Contract:
//   * Fluid-mode crystals: c-axis = substrate normal (unchanged from
//     pre-Phase-D behavior).
//   * Air-mode ceiling cells (substrate normal ny < -0.4): c-axis
//     overrides to world-down (0, -1, 0) → stalactite hangs straight
//     down regardless of wall slope.
//   * Air-mode floor cells (substrate normal ny > +0.4): c-axis
//     overrides to world-up (0, 1, 0) → stalagmite stands vertical.
//   * Air-mode wall cells (|ny| ≤ 0.4): no clean geological analog,
//     falls back to substrate normal.

import { describe, expect, it } from 'vitest';

declare const _topoCAxisForCrystal: any;

describe('habit-bias Phase D — gravity-aware c-axis for air crystals', () => {
  it('fluid crystals always follow substrate normal (legacy behavior)', () => {
    const fluid = { growth_environment: 'fluid' };
    // Ceiling-like substrate normal (points down): fluid mode preserves it.
    expect(_topoCAxisForCrystal(fluid, 0, -1, 0)).toEqual([0, -1, 0]);
    // Floor-like substrate normal (points up): fluid mode preserves it.
    expect(_topoCAxisForCrystal(fluid, 0, 1, 0)).toEqual([0, 1, 0]);
    // Wall-like normal (horizontal): fluid mode preserves it.
    expect(_topoCAxisForCrystal(fluid, 1, 0, 0)).toEqual([1, 0, 0]);
    // Tilted normal: fluid mode preserves it bit-for-bit.
    const tilted = _topoCAxisForCrystal(fluid, 0.6, -0.7, 0.3);
    expect(tilted).toEqual([0.6, -0.7, 0.3]);
  });

  it('air crystals on a ceiling cell hang straight down', () => {
    const air = { growth_environment: 'air' };
    // Strict ceiling apex (normal points straight down).
    expect(_topoCAxisForCrystal(air, 0, -1, 0)).toEqual([0, -1, 0]);
    // Tilted ceiling (normal still has ny < -0.4): stalactite is
    // VERTICAL, ignoring the wall tilt.
    expect(_topoCAxisForCrystal(air, 0.6, -0.7, 0.3)).toEqual([0, -1, 0]);
    expect(_topoCAxisForCrystal(air, -0.3, -0.5, 0.8)).toEqual([0, -1, 0]);
  });

  it('air crystals on a floor cell stand straight up', () => {
    const air = { growth_environment: 'air' };
    // Strict floor (normal points straight up).
    expect(_topoCAxisForCrystal(air, 0, 1, 0)).toEqual([0, 1, 0]);
    // Tilted floor (ny > 0.4): stalagmite is VERTICAL.
    expect(_topoCAxisForCrystal(air, 0.5, 0.6, 0.3)).toEqual([0, 1, 0]);
    expect(_topoCAxisForCrystal(air, -0.4, 0.8, 0.2)).toEqual([0, 1, 0]);
  });

  it('air crystals on wall cells fall back to substrate normal', () => {
    const air = { growth_environment: 'air' };
    // Horizontal-wall normal (ny ≈ 0): no gravity override.
    expect(_topoCAxisForCrystal(air, 1, 0, 0)).toEqual([1, 0, 0]);
    expect(_topoCAxisForCrystal(air, 0, 0, 1)).toEqual([0, 0, 1]);
    // Slightly off-horizontal but within ±0.4: still wall-mode.
    expect(_topoCAxisForCrystal(air, 0.9, 0.3, 0.1)).toEqual([0.9, 0.3, 0.1]);
    expect(_topoCAxisForCrystal(air, 0.85, -0.35, 0.4)).toEqual([0.85, -0.35, 0.4]);
  });

  it('threshold edges (ny = ±0.4) stay in wall-mode', () => {
    // Boundary semantics: strictly less than -0.4 OR strictly greater
    // than +0.4 triggers the override. ny = ±0.4 exactly stays radial.
    const air = { growth_environment: 'air' };
    expect(_topoCAxisForCrystal(air, 0.9, -0.4, 0)).toEqual([0.9, -0.4, 0]);
    expect(_topoCAxisForCrystal(air, 0.9, 0.4, 0)).toEqual([0.9, 0.4, 0]);
    // Just past the threshold: override fires.
    expect(_topoCAxisForCrystal(air, 0, -0.41, 0)).toEqual([0, -1, 0]);
    expect(_topoCAxisForCrystal(air, 0, 0.41, 0)).toEqual([0, 1, 0]);
  });

  it('crystal with no growth_environment defaults to fluid (substrate normal)', () => {
    // Loaded-from-old-save case: no growth_environment property → must
    // not crash and must NOT apply gravity bias.
    expect(_topoCAxisForCrystal({}, 0, -1, 0)).toEqual([0, -1, 0]);
    expect(_topoCAxisForCrystal(null, 0, -1, 0)).toEqual([0, -1, 0]);
  });
});
