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

// ============================================================
// Tranche 2 — Per-vertex Laplacian + propagate-global-delta
// ============================================================

describe('cavity-mesh Phase 4 Tranche 2 — mesh-edge Laplacian', () => {
  it('adjacency builds 4 neighbors for interior vertices, 3 for pole-ring vertices', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const ringCount = 16, N = 120;
    const adj = mesh._buildAdjacency(ringCount, N);
    expect(adj.length).toBe(mesh.numInterior);
    // Interior ring (say ring 5, cell 30): 2 same-ring + 2 adjacent-ring.
    expect(adj[5 * N + 30].length).toBe(4);
    // Top ring (ring 0, cell 0): the up-clamp deduplicates, so 3 neighbors.
    expect(adj[0 * N + 0].length).toBe(3);
    // Bottom ring (ring 15, cell 0): the down-clamp deduplicates, so 3 neighbors.
    expect(adj[15 * N + 0].length).toBe(3);
  });

  it('adjacency wraps theta correctly (same-ring left/right neighbors)', () => {
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const ringCount = 16, N = 120;
    const adj = mesh._buildAdjacency(ringCount, N);
    // Ring 5, cell 0: same-ring neighbors are cell N-1 (left wraps) and cell 1.
    const r5c0Neighbors = new Set(adj[5 * N + 0]);
    expect(r5c0Neighbors.has(5 * N + (N - 1))).toBe(true);  // wrap-left
    expect(r5c0Neighbors.has(5 * N + 1)).toBe(true);         // right
    // Ring 5, cell N-1: same-ring neighbors are N-2 and cell 0 (right wraps).
    const r5cLastNeighbors = new Set(adj[5 * N + (N - 1)]);
    expect(r5cLastNeighbors.has(5 * N + (N - 2))).toBe(true);
    expect(r5cLastNeighbors.has(5 * N + 0)).toBe(true);     // wrap-right
  });

  it('mesh.diffuse on uniform aliased chemistry is a no-op (Laplacian of constant = 0)', () => {
    // Default scenario: every ring starts with identical chemistry.
    // After aliasing (Tranche 1) every cell shares one fluid per ring;
    // those fluids all have the SAME field values (cloned from one
    // initial fluid). Laplacian of a constant = 0, so no field should
    // change after diffuse fires.
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const ca_before = sim.ring_fluids.map((f: any) => f.Ca);
    mesh.diffuse(0.05, ['Ca'], sim.ring_temperatures);
    const ca_after = sim.ring_fluids.map((f: any) => f.Ca);
    expect(ca_after).toEqual(ca_before);
  });

  it('mesh.diffuse with zoned aliased chemistry matches ring-Laplacian', () => {
    // Inject a per-ring gradient: ring 0 has Ca=300, ring 15 has
    // Ca=500, everything else interpolates. Then run mesh.diffuse
    // and confirm the result matches the legacy ring-Laplacian
    // formula, applied once (dedup-by-fluid-identity).
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const n = sim.wall_state.ring_count;
    for (let r = 0; r < n; r++) {
      sim.ring_fluids[r].Ca = 300 + (200 * r) / (n - 1);
    }
    const before = sim.ring_fluids.map((f: any) => f.Ca);
    const rate = 0.05;
    // Compute the expected ring-Laplacian by hand.
    const expected = [];
    for (let k = 0; k < n; k++) {
      const kp = k > 0 ? k - 1 : 0;
      const kn = k < n - 1 ? k + 1 : n - 1;
      expected.push(before[k] + rate * (before[kp] + before[kn] - 2 * before[k]));
    }
    mesh.diffuse(rate, ['Ca'], sim.ring_temperatures);
    const actual = sim.ring_fluids.map((f: any) => f.Ca);
    for (let r = 0; r < n; r++) {
      expect(actual[r]).toBeCloseTo(expected[r], 10);
    }
  });

  it('mesh.propagateDelta hits every non-equator fluid exactly once', () => {
    // Inject a delta: set conditions.fluid.Ca to a new value (the
    // equator-aliased slot already reflects this), then call
    // propagateDelta with the pre-snap fluid. All non-equator rings
    // should receive the delta exactly once (dedup-by-identity).
    const sim = new VugSimulator(makeConditions(), []);
    const mesh = sim.wall_state.meshFor(sim);
    const n = sim.wall_state.ring_count;
    const equator = Math.floor(n / 2);
    const before = sim.ring_fluids.map((f: any) => f.Ca);
    // Snapshot the pre-event state, then mutate the equator-aliased
    // slot (= conditions.fluid).
    const preSnap = new FluidChemistry({ ...sim.conditions.fluid });
    sim.conditions.fluid.Ca += 100;
    mesh.propagateDelta(preSnap, ['Ca'], sim.ring_fluids[equator]);
    // Every non-equator ring should have gained 100 ppm Ca.
    for (let r = 0; r < n; r++) {
      if (r === equator) {
        // Equator is the conditions.fluid alias; already mutated.
        expect(sim.ring_fluids[r].Ca).toBe(before[r] + 100);
      } else {
        expect(sim.ring_fluids[r].Ca).toBe(before[r] + 100);
      }
    }
  });

  it('fluid_surface_height_mm and fluid_surface_ring alias the same storage', () => {
    // Tranche 3 — water-level mechanic migrates to mm-height as
    // canonical; legacy name keeps reading/writing the same slot
    // (numerically identical while ring_spacing_mm = 1.0). Tests pin
    // that both accessors stay in lockstep.
    const c = new VugConditions({
      fluid: new FluidChemistry(), wall: new VugWall(),
    });
    // Default: null on both.
    expect(c.fluid_surface_height_mm).toBeNull();
    expect(c.fluid_surface_ring).toBeNull();
    // Write via legacy name, read via canonical name.
    c.fluid_surface_ring = 4.5;
    expect(c.fluid_surface_height_mm).toBe(4.5);
    // Write via canonical, read via legacy.
    c.fluid_surface_height_mm = 12;
    expect(c.fluid_surface_ring).toBe(12);
    // Sentinel "above ceiling" survives the round trip.
    c.fluid_surface_ring = 1e6;
    expect(c.fluid_surface_height_mm).toBe(1e6);
  });

  it('fluid_surface_height_mm constructor opt overrides legacy name', () => {
    // If both names are provided at construction, the canonical one
    // wins. (This case won't happen in shipping scenarios — they only
    // pass fluid_surface_ring — but it's the right migration semantic
    // for scenarios written after Tranche 3 lands.)
    const c = new VugConditions({
      fluid: new FluidChemistry(), wall: new VugWall(),
      fluid_surface_ring: 4,
      fluid_surface_height_mm: 7,
    });
    expect(c.fluid_surface_height_mm).toBe(7);
    expect(c.fluid_surface_ring).toBe(7);
  });

  it('legacy event handlers still see fluid_surface_ring as the live value', () => {
    // Naica / Searles / sabkha event handlers write
    // conditions.fluid_surface_ring directly. After Tranche 3 the
    // write goes through the setter and lands in _fluidSurfaceMm.
    // Internal classifiers read whichever — must stay coherent.
    const c = new VugConditions({
      fluid: new FluidChemistry(), wall: new VugWall(),
    });
    c.fluid_surface_ring = 0;  // "drain to floor" event
    expect(c.fluid_surface_height_mm).toBe(0);
    // ringWaterState in a 16-ring cavity at surface=0: every ring is
    // vadose (above the floor surface).
    for (let r = 0; r < 16; r++) {
      expect(c.ringWaterState(r, 16)).toBe('vadose');
    }
  });

  it('_diffuseRingState delegates to mesh.diffuse byte-identically', () => {
    // The wrapper in 85c-simulator-state.ts now calls mesh.diffuse
    // instead of running its own ring-Laplacian. Inject a gradient
    // and confirm the wrapper produces the same numbers the raw
    // ring-Laplacian would.
    const sim = new VugSimulator(makeConditions(), []);
    const n = sim.wall_state.ring_count;
    for (let r = 0; r < n; r++) {
      sim.ring_fluids[r].Ca = 100 + 20 * r;
    }
    const rate = sim.inter_ring_diffusion_rate;
    const before = sim.ring_fluids.map((f: any) => f.Ca);
    const expected = [];
    for (let k = 0; k < n; k++) {
      const kp = k > 0 ? k - 1 : 0;
      const kn = k < n - 1 ? k + 1 : n - 1;
      expected.push(before[k] + rate * (before[kp] + before[kn] - 2 * before[k]));
    }
    sim._diffuseRingState();
    const actual = sim.ring_fluids.map((f: any) => f.Ca);
    for (let r = 0; r < n; r++) {
      expect(actual[r]).toBeCloseTo(expected[r], 10);
    }
  });
});
