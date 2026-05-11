// tests-js/zones.test.ts — Phase 3 of PROPOSAL-CAVITY-MESH.
//
// Pins the zone-chemistry opt-in:
//   * Default (no zone_chemistry declared) = byte-identical to legacy.
//     Every ring_fluids[r] starts with the same values as conditions.fluid.
//   * Opt-in via wall.zone_chemistry: { floor, wall, ceiling } applies
//     field-by-field overrides per ring orientation.
//   * Opt-in via wall.inter_ring_diffusion_rate: 0 prevents the
//     Laplacian from averaging the differences away.
//   * wall.zoneOf(crystal) returns the orientation tag a narrator can
//     branch on.
//
// What this is NOT testing: that the engine's mineral selection
// shifts under zone chemistry. That's an emergent property — too
// flaky to pin at this layer (engines have many failure modes
// orthogonal to per-ring fluid concentration). Instead we pin the
// substrate the engines read FROM, and trust the chemistry pipeline.

import { describe, expect, it } from 'vitest';

declare const VugSimulator: any;
declare const VugConditions: any;
declare const VugWall: any;
declare const FluidChemistry: any;

// Synthesize a minimal VugConditions object — enough for VugSimulator
// to init without crashing, but no specific scenario semantics. Tests
// here drive ring-fluid state directly to keep assertions focused.
function makeConditions(wallOpts: any = {}) {
  // Use only real FluidChemistry fields (see js/20-chemistry-fluid.ts):
  // SiO2 (not Si), Ca, CO3, Mg, pH, salinity, etc. Tests pin Ca and
  // SiO2 because those are unambiguously named in the codebase.
  return new VugConditions({
    fluid: new FluidChemistry({
      Ca: 100, CO3: 100, SiO2: 100, Mg: 50, Fe: 5, pH: 7,
      salinity: 0, concentration: 1.0,
    }),
    wall: new VugWall(wallOpts),
    temperature: 50,
    pressure_bars: 1,
    depth_m: 0,
    oxygen_fugacity: -50,
  });
}

describe('cavity-mesh Phase 3 — zone chemistry opt-in', () => {
  it('default scenario keeps all ring_fluids identical (byte-identical legacy path)', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const n = sim.wall_state.ring_count;
    expect(n).toBe(16);
    // Every ring_fluids[r] should have the same Ca / Si / CO3 as
    // conditions.fluid. The equator slot is aliased to conditions.fluid;
    // every other slot is a fresh clone but with identical values.
    for (let r = 0; r < n; r++) {
      expect(sim.ring_fluids[r].Ca).toBeCloseTo(100, 6);
      expect(sim.ring_fluids[r].SiO2).toBeCloseTo(100, 6);
      expect(sim.ring_fluids[r].CO3).toBeCloseTo(100, 6);
    }
  });

  it('default diffusion rate falls through to DEFAULT_INTER_RING_DIFFUSION_RATE', () => {
    const sim = new VugSimulator(makeConditions(), []);
    // The constant is 0.05 in 18-constants.ts; we don't import it here,
    // but a positive non-zero value is the legacy invariant.
    expect(sim.inter_ring_diffusion_rate).toBeGreaterThan(0);
    expect(sim.inter_ring_diffusion_rate).toBeCloseTo(0.05, 6);
  });

  it('zone_chemistry overrides per-orientation fluid fields at init', () => {
    const sim = new VugSimulator(makeConditions({
      zone_chemistry: {
        floor: { Ca: 500, SiO2: 10 },
        ceiling: { Ca: 10, SiO2: 500 },
        // wall zone intentionally not declared → falls through to global
      },
    }), []);
    const n = sim.wall_state.ring_count;
    // Floor rings (the bottom quarter): high Ca, low Si.
    for (let r = 0; r < n; r++) {
      const orient = sim.wall_state.ringOrientation(r);
      if (orient !== 'floor') continue;
      expect(sim.ring_fluids[r].Ca).toBe(500);
      expect(sim.ring_fluids[r].SiO2).toBe(10);
    }
    // Ceiling rings (the top quarter): low Ca, high Si.
    for (let r = 0; r < n; r++) {
      const orient = sim.wall_state.ringOrientation(r);
      if (orient !== 'ceiling') continue;
      expect(sim.ring_fluids[r].Ca).toBe(10);
      expect(sim.ring_fluids[r].SiO2).toBe(500);
    }
    // Wall rings (the middle half): unchanged — fall through to global
    // fluid (Ca: 100, SiO2: 100).
    for (let r = 0; r < n; r++) {
      const orient = sim.wall_state.ringOrientation(r);
      if (orient !== 'wall') continue;
      expect(sim.ring_fluids[r].Ca).toBeCloseTo(100, 6);
      expect(sim.ring_fluids[r].SiO2).toBeCloseTo(100, 6);
    }
  });

  it('zone_chemistry overrides survive the equator-alias case', () => {
    // The equator ring (index ring_count/2 = 8 for the default 16
    // rings) is aliased to conditions.fluid. With 16 rings the
    // equator falls inside the 'wall' band (rings 4..11), so a wall
    // override should hit conditions.fluid too — the alias must not
    // hide the zone update.
    const conds = makeConditions({
      zone_chemistry: { wall: { Ca: 999 } },
    });
    const beforeCa = conds.fluid.Ca;
    expect(beforeCa).toBe(100);
    new VugSimulator(conds, []);
    expect(conds.fluid.Ca).toBe(999);
  });

  it('inter_ring_diffusion_rate=0 keeps zone differences across steps', () => {
    const sim = new VugSimulator(makeConditions({
      zone_chemistry: {
        floor: { Ca: 500 },
        ceiling: { Ca: 10 },
      },
      inter_ring_diffusion_rate: 0,
    }), []);
    // Post-Tranche-4a: read per-vertex cell.fluid, not ring_fluids[].
    const mesh = sim.wall_state.meshFor(sim);
    const N = sim.wall_state.cells_per_ring;
    // Run diffusion 50 times — at rate=0 it must be a strict no-op.
    for (let i = 0; i < 50; i++) sim._diffuseRingState();
    // Floor and ceiling cells should be unchanged.
    for (let r = 0; r < sim.wall_state.ring_count; r++) {
      const o = sim.wall_state.ringOrientation(r);
      if (o === 'floor') expect(mesh.cells[r * N].fluid.Ca).toBe(500);
      if (o === 'ceiling') expect(mesh.cells[r * N].fluid.Ca).toBe(10);
    }
  });

  it('default diffusion rate homogenizes zone differences over many steps', () => {
    // With diffusion enabled, the floor:ceiling Ca gradient should
    // shrink as the mesh Laplacian fires. Post-Tranche-4a this
    // operates per-vertex; the floor and ceiling cells (independent
    // FluidChemistry instances) relax toward their mesh neighbors.
    const sim = new VugSimulator(makeConditions({
      zone_chemistry: {
        floor: { Ca: 500 },
        ceiling: { Ca: 10 },
      },
    }), []);
    const mesh = sim.wall_state.meshFor(sim);
    const N = sim.wall_state.cells_per_ring;
    // Sanity: starting gradient is 490 mg/L between floor (ring 0)
    // and ceiling (ring 15) cells.
    const floorCellInitial = mesh.cells[0].fluid.Ca;
    const ceilCellInitial = mesh.cells[15 * N].fluid.Ca;
    expect(floorCellInitial - ceilCellInitial).toBe(490);
    // 200 diffusion steps under rate 0.05.
    for (let i = 0; i < 200; i++) sim._diffuseRingState();
    const gradAfter = mesh.cells[0].fluid.Ca - mesh.cells[15 * N].fluid.Ca;
    expect(gradAfter).toBeLessThan(490);
    expect(gradAfter).toBeGreaterThan(0);  // not converged to flat either
  });

  it('wall.zoneOf returns the orientation tag for an anchored crystal', () => {
    const sim = new VugSimulator(makeConditions(), []);
    // Nucleate a crystal directly into a known floor ring (r=0) and
    // ceiling ring (r=15) via the legacy fields; anchor populates
    // automatically through Phase 1 helpers.
    // Post-Tranche-4b wall_anchor is the sole positional field.
    const floorCrystal: any = { wall_anchor: sim.wall_state._anchorFromRingCell(0, 0) };
    const ceilCrystal: any = { wall_anchor: sim.wall_state._anchorFromRingCell(15, 0) };
    expect(sim.wall_state.zoneOf(floorCrystal)).toBe('floor');
    expect(sim.wall_state.zoneOf(ceilCrystal)).toBe('ceiling');
  });

  it('zoneOf returns null for an unanchored crystal', () => {
    const sim = new VugSimulator(makeConditions(), []);
    expect(sim.wall_state.zoneOf({})).toBeNull();
    expect(sim.wall_state.zoneOf(null)).toBeNull();
  });
});
