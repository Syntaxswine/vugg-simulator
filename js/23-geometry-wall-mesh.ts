// ============================================================
// js/23-geometry-wall-mesh.ts — WallMesh (cavity surface mesh)
// ============================================================
// Phase 2 of PROPOSAL-CAVITY-MESH.
//
// What this is: an engine-side, renderer-agnostic representation of the
// cavity surface as a triangulated mesh. One vertex per surface anchor,
// plus two pole caps; positions, vertex colors, and outward normals are
// recomputed from the underlying WallState whenever the cavity changes
// (dissolution, fluid-level shift, scenario reload).
//
// Why now: the Three.js renderer used to compute these vertices inline
// from `wall.rings[r][c]`. That coupled the renderer to the ring-grid
// model, which Phase 4 of the proposal will retire. Moving the math
// here means Phase 2.5+ can swap in icosphere / geodesic / irregular
// tessellations without touching the renderer at all.
//
// Phase 2 (this file) keeps the default tessellation byte-identical to
// the legacy ring grid: `numInterior = ring_count × cells_per_ring`
// vertices laid out in lat-long order, plus south/north pole caps.
// Per-vertex coloring matches `_topoBuildCavityGeometry`'s palette
// (floor / wall / ceiling × submerged tint). Phase 2.5 will subclass
// the factory to emit different tessellations under archetype control.
//
// Phase 3 will move per-vertex state (wall_depth, crystal_id,
// mineral, thickness_um) off `WallCell` and onto `WallMesh.cells[]`
// indexed by vertex. For Phase 2 the mesh is READ-ONLY: it pulls from
// rings[r][c] each rebuild. The engine still writes to ring cells.

class WallMesh {
  // Dynamic dataclass-style fields — runtime untouched, matches the
  // pattern of WallState / Crystal / WallCell.
  [key: string]: any;

  constructor() {
    // ---- Structure (immutable after construction for a given mesh) ----
    // One entry per non-pole vertex, in row-major (ringIdx, cellIdx)
    // order so the legacy index formula `r * cells_per_ring + c`
    // resolves to the same vertex the renderer used to compute inline.
    // phi/theta are spherical coordinates: phi ∈ [0, π] (south pole
    // 0, north pole π), theta ∈ [0, 2π). orientation is one of
    // 'floor' | 'wall' | 'ceiling' from WallState.ringOrientation —
    // baked into the vertex so future tessellations that don't have a
    // ring concept can still resolve orientation per-vertex.
    this.vertices = [];
    // Total interior vertex count (numInterior); pole vertices live at
    // indices numInterior (south) and numInterior+1 (north).
    this.numInterior = 0;
    this.southIdx = 0;
    this.northIdx = 0;
    // Triangle indices: south-cap fan + inter-ring quads + north-cap
    // fan. Plain number[] so the renderer can decide between Uint16
    // and Uint32 BufferAttribute based on vertex count.
    this.indices = [];

    // ---- Dynamic geometry (recomputed when wall + sim change) ----
    // Flat Float32Arrays — same buffer shape the renderer hands to
    // THREE.BufferAttribute, so the wire-up is a one-shot reference
    // pass with no intermediate copy.
    this.positions = null;  // Float32Array(numVerts * 3)
    this.colors = null;     // Float32Array(numVerts * 3)
    this.normals = null;    // Float32Array(numVerts * 3)  (radial fallback;
                            // renderer calls computeVertexNormals to override)

    // Cavity-state fingerprint. The renderer keys its cache off this,
    // matching the legacy _topoCavitySignature() so cache-hit semantics
    // don't shift.
    this.sig = '';

    // Conservative monotonic radius reference — populated during
    // recompute, mirrors WallState.max_seen_radius_mm so the renderer's
    // clip uniforms have a single source of truth as we migrate.
    this.max_radius_mm = 0;
    // Per-ring max vertex radius — drives the per-fragment clip-radius
    // interpolation in the Three.js shader (so a crystal at a polar
    // latitude is clipped against the hull at THAT latitude, not the
    // equatorial max). One slot per ring; the renderer reads ringCount
    // slots into its uVugRadiiByRing uniform array.
    this.maxRadiusByRing = null;
  }

  // ---- Factory ----
  //
  // Build a WallMesh from the current WallState. Default tessellation
  // is the legacy lat-long grid: ring_count × cells_per_ring interior
  // vertices + south/north pole caps. The vertex *positions* depend
  // on the wall's current dissolution + the sim's water state (for
  // submerged-tint coloring), which is why this factory takes both.
  //
  // Sim is optional — engine-only consumers (tests, snapshot writers)
  // can pass undefined and get default-dry colors.
  static fromWallState(wall, sim?) {
    const mesh = new WallMesh();
    if (!wall || !wall.rings || !wall.rings.length) return mesh;
    const ringCount = wall.ring_count;
    const ring0 = wall.rings[0];
    const N = ring0 ? ring0.length : 0;
    if (!N || ringCount < 1) return mesh;

    // Build the vertex structure once. phi / theta / ringIdx / cellIdx
    // / orientation are immutable for this tessellation; only the
    // dynamic (x,y,z, color) values recompute later.
    mesh.numInterior = ringCount * N;
    mesh.southIdx = mesh.numInterior;
    mesh.northIdx = mesh.numInterior + 1;
    const numVerts = mesh.numInterior + 2;
    mesh.vertices = new Array(numVerts);
    for (let r = 0; r < ringCount; r++) {
      const phi = Math.PI * (r + 0.5) / ringCount;
      const orient = wall.ringOrientation ? wall.ringOrientation(r) : 'wall';
      for (let c = 0; c < N; c++) {
        const idx = r * N + c;
        mesh.vertices[idx] = {
          phi,
          theta: 2 * Math.PI * c / N,
          ringIdx: r,
          cellIdx: c,
          orientation: orient,
          isPole: false,
        };
      }
    }
    mesh.vertices[mesh.southIdx] = {
      phi: 0, theta: 0,
      ringIdx: -1, cellIdx: -1,
      orientation: wall.ringOrientation ? wall.ringOrientation(0) : 'floor',
      isPole: true,
    };
    mesh.vertices[mesh.northIdx] = {
      phi: Math.PI, theta: 0,
      ringIdx: -1, cellIdx: -1,
      orientation: wall.ringOrientation ? wall.ringOrientation(ringCount - 1) : 'ceiling',
      isPole: true,
    };

    // Build the index buffer — south cap fan + inter-ring quads +
    // north cap fan. Same winding the legacy renderer used so
    // outward-facing normals stay outward after migration.
    mesh._buildIndices(ringCount, N);

    // Allocate dynamic buffers + run the first geometry pass.
    mesh.positions = new Float32Array(numVerts * 3);
    mesh.colors = new Float32Array(numVerts * 3);
    mesh.normals = new Float32Array(numVerts * 3);
    mesh.maxRadiusByRing = new Float32Array(ringCount);
    mesh.recompute(wall, sim);
    return mesh;
  }

  // Index-buffer build. Pulled out so subclasses with alternate
  // tessellations can override _buildIndices in isolation while
  // reusing the rest of the structure pass.
  _buildIndices(ringCount, N) {
    const indices: number[] = [];
    // South cap: fan from south pole to ring 0.
    for (let c = 0; c < N; c++) {
      const cNext = (c + 1) % N;
      indices.push(this.southIdx, cNext, c);  // wind outward
    }
    // Inter-ring quads.
    for (let k = 0; k < ringCount - 1; k++) {
      for (let c = 0; c < N; c++) {
        const cNext = (c + 1) % N;
        const a = k * N + c;
        const b = k * N + cNext;
        const c2 = (k + 1) * N + c;
        const d = (k + 1) * N + cNext;
        indices.push(a, b, c2);
        indices.push(b, d, c2);
      }
    }
    // North cap: fan from ring N-1 to north pole.
    for (let c = 0; c < N; c++) {
      const cNext = (c + 1) % N;
      indices.push(this.northIdx, (ringCount - 1) * N + c, (ringCount - 1) * N + cNext);
    }
    this.indices = indices;
  }

  // ---- Cache fingerprint ----
  //
  // Match the legacy _topoCavitySignature in 99i so the renderer's
  // cache-hit/miss timing doesn't change. The signature folds in
  // ring count, cells per ring, a sampled wall_depth checksum (8
  // cells per ring), and the current fluid-surface ring. Cheap to
  // compute; busts whenever a dissolution event or fluid-level
  // change shifts the cavity.
  static _signature(wall, sim) {
    if (!wall || !wall.rings || !wall.rings.length) return '';
    const ring0 = wall.rings[0];
    const N = ring0 ? ring0.length : 0;
    let depthSum = 0;
    for (let r = 0; r < wall.rings.length; r++) {
      const ring = wall.rings[r];
      if (!ring) continue;
      const stride = Math.max(1, Math.floor(N / 8));
      for (let c = 0; c < N; c += stride) {
        const cell = ring[c];
        if (!cell) continue;
        depthSum += (cell.base_radius_mm + cell.wall_depth) * (r * 31 + c);
      }
    }
    const surf = sim && sim.conditions ? sim.conditions.fluid_surface_ring : null;
    return `${wall.ring_count}|${N}|${depthSum.toFixed(2)}|${surf}`;
  }

  // ---- Recompute (cheap when stale, no-op when fresh) ----
  recomputeIfStale(wall, sim?) {
    const sig = WallMesh._signature(wall, sim);
    if (sig === this.sig) return false;
    this.recompute(wall, sim);
    return true;
  }

  // Per-vertex (x, y, z) + per-vertex color, computed from the wall's
  // current state. Math mirrors _topoBuildCavityGeometry from
  // 99i-renderer-three.ts verbatim so the byte-identical claim is
  // line-for-line auditable.
  recompute(wall, sim?) {
    if (!wall || !wall.rings || !wall.rings.length) return;
    const ringCount = wall.ring_count;
    const ring0 = wall.rings[0];
    const N = ring0 ? ring0.length : 0;
    if (!N || ringCount < 1) return;
    const initR = wall.initial_radius_mm || 25;

    // Color palette — must match the renderer's palette exactly.
    const hexToRgb = (hex) => [
      ((hex >> 16) & 0xff) / 255,
      ((hex >> 8) & 0xff) / 255,
      (hex & 0xff) / 255,
    ];
    const wallColors = {
      floor:   hexToRgb(0xA85820),
      wall:    hexToRgb(0xD2691E),
      ceiling: hexToRgb(0xE8782C),
    };
    const submergedTint = [0.43, 0.74, 0.96];
    const mix = (a, b, t) => [
      a[0] * (1 - t) + b[0] * t,
      a[1] * (1 - t) + b[1] * t,
      a[2] * (1 - t) + b[2] * t,
    ];

    const positions = this.positions;
    const colors = this.colors;
    const normals = this.normals;
    let maxR2 = 0;
    if (this.maxRadiusByRing && this.maxRadiusByRing.length !== ringCount) {
      this.maxRadiusByRing = new Float32Array(ringCount);
    } else if (this.maxRadiusByRing) {
      this.maxRadiusByRing.fill(0);
    }

    // Place interior ring × cell vertices.
    for (let r = 0; r < ringCount; r++) {
      const phi = Math.PI * (r + 0.5) / ringCount;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const polar = wall.polarProfileFactor ? wall.polarProfileFactor(phi) : 1.0;
      const twist = wall.ringTwistRadians ? wall.ringTwistRadians(phi) : 0.0;
      const ring = wall.rings[r];
      const orient = wall.ringOrientation ? wall.ringOrientation(r) : 'wall';
      const baseColor = wallColors[orient] || wallColors.wall;
      const wstate = (sim && sim.conditions && sim.conditions.ringWaterState)
        ? sim.conditions.ringWaterState(r, ringCount)
        : 'submerged';
      const isSubmerged = wstate === 'submerged'
        && sim && sim.conditions && sim.conditions.fluid_surface_ring != null;
      const tinted = isSubmerged ? mix(baseColor, submergedTint, 0.35) : baseColor;
      let ringMaxR2 = 0;
      for (let c = 0; c < N; c++) {
        const cell = ring && ring[c];
        const baseR = cell && cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
        const depth = cell ? cell.wall_depth : 0;
        const radiusMm = (baseR + depth) * polar;
        const theta = (2 * Math.PI * c) / N + twist;
        const x = radiusMm * sinPhi * Math.cos(theta);
        const y = -radiusMm * cosPhi;  // south at -y, north at +y
        const z = radiusMm * sinPhi * Math.sin(theta);
        const idx = r * N + c;
        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        colors[idx * 3 + 0] = tinted[0];
        colors[idx * 3 + 1] = tinted[1];
        colors[idx * 3 + 2] = tinted[2];
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        normals[idx * 3 + 0] = x / len;
        normals[idx * 3 + 1] = y / len;
        normals[idx * 3 + 2] = z / len;
        const r2 = x * x + y * y + z * z;
        if (r2 > maxR2) maxR2 = r2;
        if (r2 > ringMaxR2) ringMaxR2 = r2;
      }
      if (this.maxRadiusByRing) this.maxRadiusByRing[r] = Math.sqrt(ringMaxR2);
    }

    // Pole caps — average ring radius at nearest ring, projected to
    // the pole axis. Color borrows the nearest ring's orientation
    // tint directly (close enough at the cap; cheaper than averaging
    // the per-cell colors).
    const meanRingRadius = (rIdx) => {
      const ring = wall.rings[rIdx];
      if (!ring) return initR;
      let sum = 0;
      for (let c = 0; c < N; c++) {
        const cell = ring[c];
        sum += (cell && cell.base_radius_mm > 0 ? cell.base_radius_mm : initR)
               + (cell ? cell.wall_depth : 0);
      }
      return sum / N;
    };
    const southR = meanRingRadius(0) * Math.cos(Math.PI / (2 * ringCount));
    const northR = meanRingRadius(ringCount - 1) * Math.cos(Math.PI / (2 * ringCount));
    positions[this.southIdx * 3 + 0] = 0;
    positions[this.southIdx * 3 + 1] = -southR;
    positions[this.southIdx * 3 + 2] = 0;
    positions[this.northIdx * 3 + 0] = 0;
    positions[this.northIdx * 3 + 1] = +northR;
    positions[this.northIdx * 3 + 2] = 0;
    const southOrient = wall.ringOrientation ? wall.ringOrientation(0) : 'floor';
    const northOrient = wall.ringOrientation ? wall.ringOrientation(ringCount - 1) : 'ceiling';
    const southCol = wallColors[southOrient] || wallColors.floor;
    const northCol = wallColors[northOrient] || wallColors.ceiling;
    colors.set(southCol, this.southIdx * 3);
    colors.set(northCol, this.northIdx * 3);
    normals.set([0, -1, 0], this.southIdx * 3);
    normals.set([0, +1, 0], this.northIdx * 3);
    const southR2 = southR * southR, northR2 = northR * northR;
    if (southR2 > maxR2) maxR2 = southR2;
    if (northR2 > maxR2) maxR2 = northR2;

    this.max_radius_mm = Math.sqrt(maxR2);
    this.sig = WallMesh._signature(wall, sim);
  }
}
