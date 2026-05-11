// tests-js/mesh-cells.test.ts — Phase 4 Tranche 1 of PROPOSAL-CAVITY-MESH.
//
// Pins the per-vertex chemistry container that mediates between the
// legacy ring_fluids[] world and the upcoming mesh-resident chemistry.
// Tranche 1 contract:
//   * mesh.cells[i] exists for every interior vertex.
//   * cells[i].fluid IS the SAME OBJECT as ring_fluids[ringIdxOf(i)]
//     (byte-identical aliasing — the chemistry engine reads through
//     either accessor and gets the same storage).
//   * cells[i].temperature_ring caches the ring index for temperature
//     lookups (numbers can't be aliased like objects can).
//   * cellOf(crystal) resolves a crystal's anchor to its cell.
//   * Mutations via cells[i].fluid are visible through ring_fluids[r]
//     and vice versa — same object, two paths.
//
// Tranches 2-5 will (a) un-alias to per-vertex cloned fluids, (b)
// migrate the Laplacian + propagate-global-delta over the mesh,
// (c) move water-level mechanic to mm-height, (d) retire wall.rings.
// Tests here pin Tranche 1 so those follow-ups can edit freely as
// long as the per-vertex contract holds.

import { describe, expect, it } from 'vitest';
import { runScenario } from './helpers';

declare const VugSimulator: any;
declare const VugConditions: any;
declare const VugWall: any;
declare const FluidChemistry: any;

function makeConditions(wallOpts: any = {}) {
  return new VugConditions({
    fluid: new FluidChemistry({
      Ca: 200, CO3: 200, SiO2: 100, Mg: 50, pH: 7,
      salinity: 0, concentration: 1.0,
    }),
    wall: new VugWall(wallOpts),
    temperature: 50,
    pressure_bars: 1,
    depth_m: 0,
    oxygen_fugacity: -50,
  });
}

describe('cavity-mesh Phase 4 Tranche 1 — mesh.cells[] container', () => {
  it('mesh.cells.length matches numInterior (one per interior vertex)', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    expect(mesh).toBeTruthy();
    // ring_count × cells_per_ring = 16 × 120 = 1920 interior vertices.
    expect(mesh.cells.length).toBe(1920);
    expect(mesh.cells.length).toBe(mesh.numInterior);
  });

  it('cells[i].fluid IS the same object as ring_fluids[ringIdxOf(i)]', () => {
    // The load-bearing invariant for Tranche 1: aliasing, not cloning.
    // bindRingChemistry must hand out the same FluidChemistry instance
    // through cells[i].fluid as the legacy ring_fluids[r] reads.
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const N = sim.wall_state.cells_per_ring;
    // Check every ring's worth of vertices.
    for (let i = 0; i < mesh.numInterior; i++) {
      const v = mesh.vertices[i];
      expect(mesh.cells[i].fluid).toBe(sim.ring_fluids[v.ringIdx]);
      expect(mesh.cells[i].temperature_ring).toBe(v.ringIdx);
    }
    // Spot-check at known indices to make the layout legible if this
    // test ever fails.
    expect(mesh.cells[0].fluid).toBe(sim.ring_fluids[0]);                    // ring 0, cell 0
    expect(mesh.cells[N].fluid).toBe(sim.ring_fluids[1]);                    // ring 1, cell 0
    expect(mesh.cells[mesh.numInterior - 1].fluid).toBe(sim.ring_fluids[15]); // ring 15, last cell
  });

  it('mutating cells[i].fluid is visible through ring_fluids[r]', () => {
    // The point of aliasing: mutations through either accessor hit the
    // same FluidChemistry object. Confirm in both directions.
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    // Forward: mutate via cells[i].fluid, read back via ring_fluids[r].
    mesh.cells[0].fluid.Ca = 999;
    expect(sim.ring_fluids[0].Ca).toBe(999);
    // Reverse: mutate via ring_fluids[r], read back via cells[i].fluid.
    sim.ring_fluids[5].SiO2 = 777;
    const N = sim.wall_state.cells_per_ring;
    expect(mesh.cells[5 * N].fluid.SiO2).toBe(777);
  });

  it('mesh.cellOf(crystal) resolves an anchored crystal to its cell', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    // Build a crystal anchored at a known (ring, cell) pair via the
    // Phase 1 anchor helper.
    const c: any = { wall_ring_index: 3, wall_center_cell: 7 };
    c.wall_anchor = sim.wall_state._anchorFromRingCell(3, 7);
    const cell = mesh.cellOf(c, sim.wall_state);
    expect(cell).toBeTruthy();
    expect(cell.fluid).toBe(sim.ring_fluids[3]);
    expect(cell.temperature_ring).toBe(3);
  });

  it('cellOf returns null for an unanchored crystal', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    expect(mesh.cellOf(null, sim.wall_state)).toBeNull();
    expect(mesh.cellOf({}, sim.wall_state)).toBeNull();
  });

  it('per-crystal growth swap reads cell.fluid (end-to-end integration)', () => {
    // Run a real scenario; the per-crystal fluid swap in
    // _runEngineForCrystal now sources from mesh.cellOf(crystal).fluid.
    // Because Tranche 1 aliases cells[i].fluid === ring_fluids[r], the
    // calibration baseline reproduces byte-identical. This test just
    // confirms the scenario produces SOME crystals (the rest of the
    // suite catches drift).
    const sim = runScenario('cooling', { seed: 42, steps: 30 });
    expect(sim).toBeTruthy();
    expect(sim.crystals.length).toBeGreaterThan(0);
  });
});
