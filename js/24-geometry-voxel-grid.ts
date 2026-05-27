// ============================================================
// js/24-geometry-voxel-grid.ts — CavityVoxelGrid (interior 3D fluid store)
// ============================================================
// Phase 1 of PROPOSAL-CAVITY-INTERIOR-VOXELS.
//
// What this is: a 3D voxel grid spanning the cavity INTERIOR. Each
// voxel carries its own fluid composition + temperature. Engines couple
// the wall cell to its adjacent boundary-layer voxel (Phase 2+);
// diffusion propagates chemistry through the volume (Phase 2+).
//
// Address scheme — spherical voxels matching the wall mesh address:
//   (r, c, d) where:
//     r ∈ [0, ring_count)        ring index (matches wall mesh)
//     c ∈ [0, cells_per_ring)    cell index (matches wall mesh)
//     d ∈ [0, depth_count)       radial depth, 0 = wall, max = center
//
// Per [FIRM] A: depth_count = 4. Each slice has clean geological
// semantics:
//   d=0  boundary layer (aliased to wall cell; engine mass-balance hits here)
//   d=1  near-wall buffer (depletion halo lives here)
//   d=2  interior bulk (event chemistry target)
//   d=3  center baseline (slowest to equilibrate)
//
// Consumers wanting higher resolution use sampleFluid(r, c, depth, field)
// with fractional depth — linear interpolation across adjacent slices.
// Mirrors the strip recorder's existing 120→24 angular downsample idiom.
//
// PHASE 1 SCOPE (v158)
//
// This commit ships the data model + accessors + a thin diffuse() that
// delegates to wall.mesh.diffuse() for byte-identical baseline:
//   - d=0 voxels SHARE fluid object identity with wall mesh cells (per
//     [FIRM] B alias). A write through either path is visible through
//     the other immediately.
//   - d=1, d=2, d=3 voxels each get an INDEPENDENT clone of the bulk
//     initial fluid; nothing touches them in v158 (engines still read
//     from wall cells, events still mutate conditions.fluid, diffusion
//     still runs on wall slab only). Uniform initial values mean a real
//     Laplacian would be a no-op anyway.
//   - Per-voxel temperature stored but not consumed yet ([FIRM] E).
//     Engines still read ring_temperatures[].
//   - voxelGrid.diffuse() is the CANONICAL diffusion path going forward
//     ([FIRM] H merge); in v158 it just delegates to wall.mesh.diffuse.
//     Phase 2 expands the body to do real per-voxel + radial diffusion.
//
// Net effect of v158: data model exists, accessors work, tests verify
// the structure. Sim chemistry unchanged. Baseline byte-identical.

// Default depth count — boss-firm at 4 slices. Consumers wanting more
// resolution call sampleFluid() with fractional depth.
const _CAVITY_VOXEL_DEPTH_COUNT = 4;

interface CavityVoxelLike {
  ringIdx: number;
  cellIdx: number;
  depthIdx: number;
  // Fluid — aliased to wall mesh cell fluid at d=0; independent clone otherwise.
  fluid: any;
  // Per-voxel temperature. v158: stored, init to bulk T, not consumed.
  // Phase 2+: engines read per-voxel T; Phase 4+ adds thermal convection.
  temperature: number;
}

class CavityVoxelGrid {
  // Dynamic dataclass fields — runtime untouched, matches WallMesh pattern.
  [key: string]: any;

  ring_count: number;
  cells_per_ring: number;
  depth_count: number;

  // Flat storage for tight inner-loop reads. Index formula:
  //   voxels[r * cells_per_ring * depth_count + c * depth_count + d]
  voxels: CavityVoxelLike[];

  constructor(opts: {
    ring_count: number;
    cells_per_ring: number;
    depth_count?: number;
  }) {
    this.ring_count = opts.ring_count | 0;
    this.cells_per_ring = opts.cells_per_ring | 0;
    this.depth_count = (opts.depth_count != null)
      ? (opts.depth_count | 0)
      : _CAVITY_VOXEL_DEPTH_COUNT;
    this.voxels = [];
  }

  // ---- Factory ------------------------------------------------------

  // Build a voxel grid for a sim. Aliases d=0 voxels to the existing
  // wall mesh cell fluid objects (per [FIRM] B); clones the bulk fluid
  // into the rest. Per-voxel temperature initialized to bulk T.
  //
  // The wall mesh MUST be built before this is called (the alias depends
  // on mesh.cells[] existing with fluid objects). The standard call site
  // is the VugSimulator constructor, immediately after the mesh +
  // bindRingChemistry pass.
  //
  // Returns null defensively if dimensions can't be resolved (headless
  // test harnesses that skip wall mesh build).
  static fromWallState(wall: any, sim: any): CavityVoxelGrid | null {
    if (!wall) return null;
    const ringCount = wall.ring_count | 0;
    const cellsPerRing = wall.cells_per_ring | 0;
    if (ringCount < 1 || cellsPerRing < 1) return null;

    const grid = new CavityVoxelGrid({
      ring_count: ringCount,
      cells_per_ring: cellsPerRing,
      depth_count: _CAVITY_VOXEL_DEPTH_COUNT,
    });

    // Resolve the wall mesh — d=0 voxels alias mesh cell fluids.
    const mesh = (wall.meshFor && typeof wall.meshFor === 'function')
      ? wall.meshFor(sim)
      : null;

    // Bulk fluid + temperature for cloning into d≥1 voxels.
    const bulkFluid = (sim && sim.conditions && sim.conditions.fluid)
      ? sim.conditions.fluid
      : null;
    const bulkTemp = (sim && sim.conditions && typeof sim.conditions.temperature === 'number')
      ? sim.conditions.temperature
      : 25;
    const Cloner: any = (typeof _cloneFluid !== 'undefined') ? _cloneFluid : null;

    const total = ringCount * cellsPerRing * grid.depth_count;
    grid.voxels = new Array(total);

    for (let r = 0; r < ringCount; r++) {
      for (let c = 0; c < cellsPerRing; c++) {
        // Resolve the wall mesh cell for this (r, c) — its fluid object
        // becomes the d=0 voxel's fluid (alias). The mesh cell may be
        // missing in headless test harnesses; defensive fallback clones
        // from bulk so the voxel still has SOMETHING to read.
        const meshCell = (mesh && mesh.cells && (r * cellsPerRing + c) < mesh.cells.length)
          ? mesh.cells[r * cellsPerRing + c]
          : null;
        const wallFluid = (meshCell && meshCell.fluid) ? meshCell.fluid : null;

        for (let d = 0; d < grid.depth_count; d++) {
          const idx = r * cellsPerRing * grid.depth_count + c * grid.depth_count + d;
          let voxelFluid: any;
          if (d === 0 && wallFluid) {
            // ALIAS — same object as the wall mesh cell's fluid. Writes
            // through either path are visible through the other.
            voxelFluid = wallFluid;
          } else {
            // INDEPENDENT clone of the bulk fluid (or wall fluid as
            // fallback if bulk is missing). v158 never mutates these
            // (engines still read d=0 only); Phase 2 will.
            voxelFluid = (Cloner && bulkFluid) ? Cloner(bulkFluid)
                       : (Cloner && wallFluid) ? Cloner(wallFluid)
                       : wallFluid || bulkFluid || null;
          }
          grid.voxels[idx] = {
            ringIdx: r,
            cellIdx: c,
            depthIdx: d,
            fluid: voxelFluid,
            temperature: bulkTemp,
          };
        }
      }
    }
    // Stash the mesh reference so diffuse() can delegate to it (v158
    // implementation). Phase 2 retires this when diffuse goes truly
    // per-voxel.
    grid.bindMesh(mesh);
    return grid;
  }

  // ---- Index helpers ------------------------------------------------

  // O(1) flat-array index for (r, c, d). Returns -1 if out of range.
  _index(r: number, c: number, d: number): number {
    if (r < 0 || r >= this.ring_count) return -1;
    if (c < 0 || c >= this.cells_per_ring) return -1;
    if (d < 0 || d >= this.depth_count) return -1;
    return r * this.cells_per_ring * this.depth_count
         + c * this.depth_count
         + d;
  }

  // ---- Accessors ----------------------------------------------------

  // Get the voxel at (r, c, d). Returns null if out of range.
  voxelAt(r: number, c: number, d: number): CavityVoxelLike | null {
    const i = this._index(r, c, d);
    return (i >= 0) ? this.voxels[i] : null;
  }

  // Get the boundary-layer voxel for wall cell (r, c). Convenience for
  // voxelAt(r, c, 0) — the most common engine-side query.
  boundaryVoxel(r: number, c: number): CavityVoxelLike | null {
    return this.voxelAt(r, c, 0);
  }

  // Get the fluid at (r, c, d). Returns null if voxel or fluid is missing.
  fluidAt(r: number, c: number, d: number): any {
    const v = this.voxelAt(r, c, d);
    return v ? v.fluid : null;
  }

  // Sample a fluid field at fractional depth via linear interpolation
  // between adjacent stored slices. Mirrors the strip recorder's
  // 120→24 angular downsample idiom — consumers can render any
  // resolution they want against a 4-slice store.
  //
  //   depth = 0.0 → fluidAt(r, c, 0)
  //   depth = 1.5 → 0.5 × fluidAt(r, c, 1) + 0.5 × fluidAt(r, c, 2)
  //   depth = 3.0 → fluidAt(r, c, 3)
  //
  // Clamps depth to [0, depth_count - 1]. Returns NaN if either bracket
  // voxel is missing.
  sampleFluid(r: number, c: number, depth: number, field: string): number {
    if (!Number.isFinite(depth)) return NaN;
    const maxD = this.depth_count - 1;
    if (depth < 0) depth = 0;
    if (depth > maxD) depth = maxD;
    const d0 = Math.floor(depth);
    const d1 = Math.min(d0 + 1, maxD);
    const t = depth - d0;
    const a = this.fluidAt(r, c, d0);
    const b = this.fluidAt(r, c, d1);
    if (!a || !b) return NaN;
    const va = a[field];
    const vb = b[field];
    if (typeof va !== 'number' || typeof vb !== 'number') return NaN;
    return va * (1 - t) + vb * t;
  }

  // ---- Diffusion ----------------------------------------------------

  // Canonical diffusion entry point (per [FIRM] H merge). Phase 1 (v158):
  // delegates to the wall mesh's existing 2D Laplacian for the d=0 slab;
  // d≥1 slabs are uniform at init and stay uniform throughout v158
  // (nothing writes to them), so their would-be Laplacian is a no-op.
  //
  // Phase 2 (v159) expands this body to do real per-voxel 3D diffusion
  // including radial coupling between adjacent slabs. The call signature
  // is stable — _diffuseRingState already calls grid.diffuse(rate, ...)
  // so engines and events will pick up the expanded behavior without
  // any further wiring.
  diffuse(rate: number, fieldNames: string[], ringTemps?: number[]): void {
    if (!(rate > 0)) return;
    if (!fieldNames || !fieldNames.length) return;
    // Delegate to the wall mesh — the d=0 slab IS the wall, via alias,
    // so this is the correct (and only) chemistry diffusion in v158.
    // sim is needed to resolve the mesh; we don't have it here, so the
    // caller (_diffuseRingState) is expected to have already triggered
    // the meshFor() build. We reach it via the back-reference set in
    // bindMesh().
    const mesh = this._mesh;
    if (mesh && typeof mesh.diffuse === 'function') {
      mesh.diffuse(rate, fieldNames, ringTemps);
    }
  }

  // Back-reference to the wall mesh for the v158 diffuse() delegation.
  // Set once at construction by fromWallState (when the mesh is
  // resolved). Phase 2 will retire this — diffuse() will operate on
  // voxels directly without needing the mesh reference.
  bindMesh(mesh: any): void {
    this._mesh = mesh;
  }
}
