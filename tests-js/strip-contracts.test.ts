// tests-js/strip-contracts.test.ts — "chemistry contract" tests built on the
// strip-view recorder (helicoid-as-recorder) via tests-js/strip-helpers.ts.
//
// WHAT THESE ARE. Each test records a scenario through the strip recorder and
// asserts on the spatiotemporal chemistry trajectory it captures
// ([step][angle][height][depth][chip]). They PIN OBSERVED per-cell behavior —
// they are regression guards on what the simulator actually does, not
// re-derivations of the underlying science.
//
// DATA SOURCE. The recorder reads mesh.cells (and, at depth>0, the
// CavityVoxelGrid interior slices) — the PER-CELL / per-voxel store, NOT the
// ring-bulk `ring_fluids[equator]` that the bespoke Week 7/8 probes sample.
// The two stores legitimately differ (the bulk view isn't debited by mass
// balance; the mesh cells are). So these tests CORROBORATE the validated
// bulk-probe findings on a second instrument — they do not duplicate them,
// and a divergence between strip and bulk is a real signal, not a bug.
//
// SCENARIO PICK. Anchored on the best-grounded carbonate scenarios:
//   - sabkha_dolomitization → Kim et al. 2023 (Science 382:915) cyclic-Ω
//     dolomitization, validated in tests-js/carbonate-week8-* and the
//     calibration sweep.
//   - reactive_wall → PWP (Plummer-Wigley-Parkhurst 1978) kinetics, validated
//     in tests-js/carbonate-week7-reactive-wall.
// The all-scenarios sweep is intentionally a separate effort (each scenario's
// contract needs its data re-checked).
//
// THRESHOLDS are conservative lower/upper bounds well clear of the observed
// values (noted inline), so uint8 quantization granularity (~range/254) and
// minor RNG-cadence shifts don't make them flaky.

import { beforeAll, describe, expect, it } from 'vitest';
import { recordScenario, chipSeries, series } from './strip-helpers';

declare const SCENARIOS: any;

describe('strip chemistry contract — sabkha_dolomitization (Kim 2023)', () => {
  let ds: any;
  beforeAll(() => { ds = recordScenario('sabkha_dolomitization'); }, 60000);

  it('f_ord accumulates toward ordered dolomite (corroborates Week 8 ~0.82)', () => {
    if (!ds) return; // scenario not registered → skip
    const f = chipSeries(ds, 'f_ord', { depth: 'wall' });
    // Observed: first ~0.000, last ~0.819. f_ord = 1 - exp(-N/N0) with N
    // (the dol_cycle_count) monotonically non-decreasing → the trail only
    // rises. Week 8's ordered-dolomite threshold is f_ord ≥ 0.7.
    expect(series.first(f)).toBeLessThan(0.05);
    expect(series.last(f)!).toBeGreaterThan(0.7);
    // Strictly an accumulation, not noise.
    expect(series.last(f)! - series.first(f)!).toBeGreaterThan(0.5);
  });

  it('SI_dolomite cycles (the Kim Ω-modulation) at the wall', () => {
    if (!ds) return;
    const si = chipSeries(ds, 'SI_dolomite', { depth: 'wall' });
    // Observed (wall): oscillates ~0.59 ↔ 3.0 (clamped peak), ~12 cycles.
    // Peak rides the supersaturated clamp; multiple up-crossings of a
    // mid-threshold prove the cycling is real (not a single excursion).
    expect(series.peak(si)).toBeGreaterThan(2.5);
    expect(series.crossings(si, 2.0)).toBeGreaterThanOrEqual(3);
  });

  it('wall stays cycling while the deep interior depletes (v160 diffusion signature)', () => {
    if (!ds) return;
    // Observed late-run: wall SI_dolomite ~+3 (still supersaturated), center
    // ~−3 (depleted). This wall→center gradient is what v160 per-voxel
    // diffusion + the strangulation gate produce; nothing else guards it.
    const wall = chipSeries(ds, 'SI_dolomite', { depth: 'wall' });
    const center = chipSeries(ds, 'SI_dolomite', { depth: 'center' });
    const D = ds.manifest.axes.depth_positions || 1;
    if (D < 2) return; // depth-collapsed recording (no voxel grid) → no gradient to test
    expect(series.last(wall)! - series.last(center)!).toBeGreaterThan(2);
  });
});

describe('strip chemistry contract — reactive_wall (PWP acid pulses)', () => {
  let ds: any;
  beforeAll(() => { ds = recordScenario('reactive_wall'); }, 60000);

  it('acid pulses drive pH down and buffering brings it back (per-cell)', () => {
    if (!ds) return;
    const pH = chipSeries(ds, 'pH', { depth: 'wall' });
    // Observed (per-cell wall): pH min ~4.2 at pulses, recovers to ~7.0
    // between them. The per-cell excursions are SHARPER than the ring-bulk
    // Week 7 probe (which only asserted < 6.5) — the wall cells take the
    // full hit. Assert both the dip and the recovery happen.
    expect(series.min(pH)).toBeLessThan(5.5);
    expect(series.peak(pH)).toBeGreaterThan(6.8);
  });

  it('SI_calcite tracks the pulses below saturation (per-cell)', () => {
    if (!ds) return;
    const si = chipSeries(ds, 'SI_calcite', { depth: 'wall' });
    // Observed: starts ~+0.4 (supersaturated), pulses drive it well below 0.
    expect(series.first(si)!).toBeGreaterThan(0);   // starts supersaturated
    expect(series.min(si)).toBeLessThan(0);         // pulses cross into undersaturation
  });
});
