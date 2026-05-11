// tests-js/anchor.test.ts — Phase 1 of PROPOSAL-CAVITY-MESH.
//
// Pins the new crystal-anchor abstraction. The Crystal class no longer
// describes its position by ring/cell index directly; consumers go
// through WallState._resolveAnchor → { ringIdx, cellIdx } so that
// Phase 2 can swap the body for a kd-tree lookup over a real mesh
// without touching the call sites.
//
// What we verify here:
//   1. `_anchorFromRingCell` round-trips ring/cell pairs to the same
//      (phi, theta) the renderer uses to place crystal meshes.
//   2. Nucleation populates `wall_anchor` in step with the legacy
//      fields, so the migration shim returns the SAME pair whether
//      it reads wall_anchor or falls back to wall_ring_index /
//      wall_center_cell.
//   3. `_resolveAnchor` falls back to the legacy fields when a
//      crystal predates Phase 1 and lacks `wall_anchor` (pre-Phase-1
//      snapshot replay path).

import { describe, expect, it } from 'vitest';
import { runScenario } from './helpers';

declare const VugSimulator: any;
declare const WallState: any;
declare const Crystal: any;

describe('cavity-mesh Phase 1 — anchor helpers', () => {
  it('_anchorFromRingCell returns the (phi, theta) the renderer uses', () => {
    const wall = new WallState({ cells_per_ring: 120, ring_count: 16 });
    const a = wall._anchorFromRingCell(5, 30);
    // phi = π × (ringIdx + 0.5) / ring_count → π × 5.5 / 16
    expect(a.phi).toBeCloseTo(Math.PI * 5.5 / 16, 10);
    // theta = 2π × cellIdx / cells_per_ring → 2π × 30 / 120 = π/2
    expect(a.theta).toBeCloseTo(Math.PI / 2, 10);
    expect(a.ringIdx).toBe(5);
    expect(a.cellIdx).toBe(30);
  });

  it('_anchorFromRingCell wraps cellIdx into [0, cells_per_ring)', () => {
    const wall = new WallState({ cells_per_ring: 120, ring_count: 16 });
    // Both wrap-positive and wrap-negative resolve to the same canonical
    // angular slot — the renderer cares about the angle, not the raw
    // integer.
    expect(wall._anchorFromRingCell(0, 121).cellIdx).toBe(1);
    expect(wall._anchorFromRingCell(0, -1).cellIdx).toBe(119);
  });

  it('_resolveAnchor of a freshly nucleated crystal matches the assignment', () => {
    // Use the live scenario path so we get a realistic anchor — the
    // unit test would pass against a hand-built crystal too, but the
    // integration here is the actual regression guard.
    const sim = runScenario('cooling', { seed: 42, steps: 30 });
    expect(sim).toBeTruthy();
    expect(sim.crystals.length).toBeGreaterThan(0);
    const wall = sim.wall_state;
    for (const c of sim.crystals) {
      const a = wall._resolveAnchor(c);
      expect(a).not.toBeNull();
      // Anchor must agree with both the cached wall_anchor and the
      // legacy fields — the central invariant Phase 1 preserves.
      expect(a.ringIdx).toBe(c.wall_anchor.ringIdx);
      expect(a.cellIdx).toBe(c.wall_anchor.cellIdx);
      expect(a.ringIdx).toBe(c.wall_ring_index);
      expect(a.cellIdx).toBe(c.wall_center_cell);
    }
  });

  it('_resolveAnchor falls back to legacy fields when wall_anchor is null', () => {
    // Simulates a pre-Phase-1 save being loaded for replay: the
    // crystal has wall_ring_index / wall_center_cell but no
    // wall_anchor. _resolveAnchor must still return the legacy pair.
    const wall = new WallState({ cells_per_ring: 120, ring_count: 16 });
    const legacy = new Crystal({
      mineral: 'calcite',
      crystal_id: 1,
      wall_ring_index: 7,
      wall_center_cell: 42,
      // wall_anchor intentionally omitted → defaults to null
    });
    expect(legacy.wall_anchor).toBeNull();
    const a = wall._resolveAnchor(legacy);
    expect(a).toEqual({ ringIdx: 7, cellIdx: 42 });
  });

  it('_resolveAnchor returns null for an unanchored crystal', () => {
    // A Crystal built without any anchor (e.g. before nucleate()
    // assigns one) must short-circuit cleanly so caller can skip it.
    const wall = new WallState({ cells_per_ring: 120, ring_count: 16 });
    const orphan = new Crystal({ mineral: 'calcite', crystal_id: 99 });
    expect(wall._resolveAnchor(orphan)).toBeNull();
  });
});
