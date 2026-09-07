import { describe, expect, it } from 'vitest';

declare const THREE: any;
declare const Crystal: any;
declare const WallState: any;
declare const classifySurfaceGrowth: any;
declare const _addCrystalParentRepresentation: any;
declare const _emitSurfaceGrowthSwath: any;
declare const _topoSnapshotWall: any;
declare const _topoCrystalsSignature: any;
declare const _topoSyncCrystalMeshes: any;

function makeAggregate(wall: any, id: number, mineral = 'malachite', habit = 'botryoidal') {
  const crystal = new Crystal({
    mineral,
    habit,
    vector: 'coating',
    wall_spread: 0.72,
    void_reach: 0.12,
    crystal_id: id,
    nucleation_step: id,
  });
  crystal.total_growth_um = 650;
  crystal.c_length_mm = 1.4;
  crystal.a_width_mm = 0.6;
  crystal._volume_mm3 = 18.5;
  crystal.wall_anchor = wall._anchorFromRingCell(6, 12);
  return crystal;
}

function renderState(wall: any) {
  return {
    geomCache: new Map(),
    crystals: new THREE.Group(),
    clipUniforms: { uVugRadius: { value: wall.meanDiameterMm() / 2 } },
  };
}

function emit(state: any, crystal: any, wall: any, sim: any, layers: any[]) {
  const direction = wall.surfaceAnchorDirection(crystal);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7765, roughness: 0.58, metalness: 0,
  });
  return _emitSurfaceGrowthSwath(
    state, crystal, material,
    direction[0], direction[1], direction[2],
    wall, wall.ring_count, wall.cells_per_ring, wall.initial_radius_mm,
    crystal.c_length_mm, sim, layers,
  );
}

describe('SIM 250 executed Three.js surface-fabric contract', () => {
  it('draws a continuous, raycastable lining at physical thickness, invariant across viewport LOD', () => {
    const wall = new WallState({ cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70, shape_seed: 5150 });
    const crystal = makeAggregate(wall, 500, 'chalcedony', 'banded_agate');
    const sim = { step: 900, wall_state: wall, crystals: [crystal] };
    classifySurfaceGrowth(sim);
    const testimony = JSON.stringify(crystal._surfaceGrowth);
    const source = wall.surfaceForCrystal(crystal, sim);
    const sourcePositions = Array.from(source.positions);
    const run = (width: number, layers: any[] = []) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      const state = renderState(wall);
      return { state, mesh: emit(state, crystal, wall, sim, layers), layers };
    };
    const desktop = run(1200), mobile = run(600);
    const mesh = desktop.mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.isInstancedMesh).not.toBe(true);
    expect(desktop.state.crystals.children).toEqual([mesh]);
    expect(mesh.userData.representation).toBe('wall-conformal-lining');
    expect(mesh.geometry.attributes.position.array).toEqual(mobile.mesh.geometry.attributes.position.array);
    expect(mesh.userData.rendered_thickness_mm).toBeCloseTo(crystal._surfaceGrowth.mean_thickness_um / 1000, 12);
    expect(mesh.userData.rendered_thickness_mm).toBeLessThan(0.06);
    const patch = wall.surfacePatchForCrystal(crystal, mesh.userData.coverage_fraction, sim);
    expect(mesh.userData.represented_area_mm2).toBeCloseTo(patch.area_mm2, 8);
    expect(mesh.geometry.attributes.position.count).toBe(patch.triangles.length * 3);
    expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    const t = patch.triangles[0];
    const first = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 0);
    const original = new THREE.Vector3().fromArray(source.positions, t.ia * 3);
    expect(first.distanceTo(original)).toBeCloseTo(mesh.userData.rendered_thickness_mm, 5);
    const target = new THREE.Vector3();
    for (let i = 0; i < 3; i++) target.add(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i));
    target.multiplyScalar(1 / 3);
    const normal = new THREE.Vector3(...t.void_normal);
    mesh.updateMatrixWorld(true);
    const hits = new THREE.Raycaster(target.clone().addScaledVector(normal, 1), normal.clone().negate(), 0, 2)
      .intersectObject(mesh, false);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].object.userData.crystal_id).toBe(crystal.crystal_id);
    const top = run(1200, desktop.layers).mesh;
    const topVertex = new THREE.Vector3().fromBufferAttribute(top.geometry.attributes.position, 0);
    expect(topVertex.distanceTo(first)).toBeCloseTo(mesh.userData.rendered_thickness_mm, 5);
    const wrongSource = run(1200, [{ triangle_keys: new Set(patch.triangle_indices.map((i: number) => `wrong:${i}`)), representative_relief_mm: 7 }]).mesh;
    expect(wrongSource.geometry.attributes.position.array).toEqual(mesh.geometry.attributes.position.array);
    expect(Array.from(source.positions)).toEqual(sourcePositions);
    expect(JSON.stringify(crystal._surfaceGrowth)).toBe(testimony);

    // Dynamic shell geometry must not accumulate in the shared primitive cache.
    let disposed = false;
    mesh.geometry.addEventListener('dispose', () => { disposed = true; });
    _topoSyncCrystalMeshes(desktop.state, { ...sim, crystals: [] }, wall);
    expect(disposed).toBe(true);
  });

  it('clips the final lining triangle to its booked area and rejects a mismatched surface', () => {
    const surface = { sig: 'plane', positions: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]), normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) };
    const patch = { source_signature: 'plane', area_mm2: 0.5, triangle_indices: [0], triangles: [{ ia: 0, ib: 1, ic: 2, triangle_index: 0, area_mm2: 2, weight_mm2: 0.5, void_normal: [0, 0, -1] }] };
    const wall = { rings: [[]], surfacePatchForCrystal: () => patch, surfaceForCrystal: () => surface, surfaceAnchorDirection: () => [0, 0, 1] };
    const crystal = { crystal_id: 1, mineral: 'chalcedony', c_length_mm: 1, _surfaceGrowth: { regime: 'laminated_lining', coverage_fraction: 0.25, mean_thickness_um: 2 } };
    const state = { crystals: new THREE.Group(), geomCache: new Map(), clipUniforms: {} };
    const mesh = emit(state, crystal, wall, {}, []);
    const a = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 0);
    const b = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 1);
    const c = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, 2);
    expect(b.sub(a).cross(c.sub(a)).length() / 2).toBeCloseTo(0.5, 8);
    surface.sig = 'other';
    expect(emit(state, crystal, wall, {}, [])).toBeNull();
  });

  it('emits one raycastable instanced representation with finite matrices and exact overlap relief', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
    const wall = new WallState({
      cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70,
      primary_bubbles: 4, secondary_bubbles: 8, shape_seed: 5150,
    });
    const first = makeAggregate(wall, 501);
    const sim = { step: 900, wall_state: wall, crystals: [first] };
    classifySurfaceGrowth(sim);
    const state = renderState(wall);
    first._surfaceGrowth = { ...first._surfaceGrowth, mean_thickness_um: 300 };
    const parent = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    expect(_addCrystalParentRepresentation(state, first, parent)).toBe(false);
    expect(state.crystals.children).toHaveLength(0);

    const layers: any[] = [];
    const swath = emit(state, first, wall, sim, layers);
    expect(swath).toBeInstanceOf(THREE.InstancedMesh);
    expect(state.crystals.children).toEqual([swath]);
    expect(swath.count).toBeGreaterThan(12);
    expect(layers).toHaveLength(1);

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < swath.count; i++) {
      swath.getMatrixAt(i, matrix);
      expect(matrix.elements.every((value: number) => Number.isFinite(value))).toBe(true);
      expect(Math.abs(matrix.determinant())).toBeGreaterThan(1e-9);
    }

    swath.updateMatrixWorld(true);
    swath.getMatrixAt(0, matrix);
    const target = new THREE.Vector3().setFromMatrixPosition(matrix);
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 0), target.clone().normalize(), 0, 200,
    );
    const hits = raycaster.intersectObject(swath, false);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].instanceId).toBeTypeOf('number');

    // Same anchor/seed gives the same exact samples. The second layer must be
    // displaced only by the first layer's canonical, LOD-independent relief.
    const second = makeAggregate(wall, 501);
    second._surfaceGrowth = {
      ...first._surfaceGrowth,
      stratigraphic_index: 1,
      underlying_surface_crystal_ids: [first.crystal_id],
    };
    const secondSwath = emit(state, second, wall, sim, layers);
    const firstMatrix = new THREE.Matrix4();
    const secondMatrix = new THREE.Matrix4();
    swath.getMatrixAt(0, firstMatrix);
    secondSwath.getMatrixAt(0, secondMatrix);
    const firstPosition = new THREE.Vector3().setFromMatrixPosition(firstMatrix);
    const secondPosition = new THREE.Vector3().setFromMatrixPosition(secondMatrix);
    const patch = wall.sampleSurfacePatchForCrystal(
      first, swath.count, first._surfaceGrowth.coverage_fraction, first.crystal_id, sim,
    );
    const normal = new THREE.Vector3(
      patch.samples[0].nx, patch.samples[0].ny, patch.samples[0].nz,
    );
    const offset = secondPosition.clone().sub(firstPosition).dot(normal);
    // InstancedMatrix stores translations in Float32; compare at its physical
    // precision rather than requiring sub-micrometre Float64 equality.
    expect(offset).toBeCloseTo(layers[0].representative_relief_mm, 5);
  });

  it('keeps physical relief invariant across mobile LOD and executes flattened dendrite matrices', () => {
    const wall = new WallState({
      cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70,
      primary_bubbles: 3, secondary_bubbles: 7, shape_seed: 6161,
    });
    const crystal = makeAggregate(wall, 601);
    const sim = { step: 900, wall_state: wall, crystals: [crystal] };
    classifySurfaceGrowth(sim);
    crystal._surfaceGrowth = { ...crystal._surfaceGrowth, mean_thickness_um: 300 };

    const runAtWidth = (width: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
      const state = renderState(wall);
      const layers: any[] = [];
      const swath = emit(state, crystal, wall, sim, layers);
      return { swath, relief: layers[0].representative_relief_mm };
    };
    const desktop = runAtWidth(1200);
    const mobile = runAtWidth(600);
    expect(desktop.swath.count).toBeGreaterThan(mobile.swath.count);
    expect(desktop.relief).toBeCloseTo(mobile.relief, 12);
    expect(desktop.swath.userData.physical_mean_thickness_um)
      .toBe(mobile.swath.userData.physical_mean_thickness_um);

    const dendrite = makeAggregate(wall, 602, 'romanechite', 'dendritic_surface_film');
    dendrite._surfaceGrowth = {
      ...crystal._surfaceGrowth,
      regime: 'dendritic_film',
      stratigraphic_index: 0,
    };
    const dendriteState = renderState(wall);
    const dendriteSwath = emit(dendriteState, dendrite, wall, sim, []);
    expect(dendriteSwath.geometry.getAttribute('position').count).toBeGreaterThan(30);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < dendriteSwath.count; i++) {
      dendriteSwath.getMatrixAt(i, matrix);
      matrix.decompose(position, quaternion, scale);
      expect(scale.z).toBeLessThanOrEqual(0.100001);
      expect(scale.y).toBeGreaterThan(scale.z * 5);
      expect(matrix.elements.every((value: number) => Number.isFinite(value))).toBe(true);
    }
  });

  it('does not apply renderer underburden from the same triangle number on another surface', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
    const wall = new WallState({
      cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70, shape_seed: 42,
    });
    const crystal = makeAggregate(wall, 650);
    const sim = { step: 900, wall_state: wall, crystals: [crystal] };
    classifySurfaceGrowth(sim);
    crystal._surfaceGrowth = { ...crystal._surfaceGrowth, mean_thickness_um: 300 };

    const referenceState = renderState(wall);
    const reference = emit(referenceState, crystal, wall, sim, []);
    const patch = wall.sampleSurfacePatchForCrystal(
      crystal, reference.count, crystal._surfaceGrowth.coverage_fraction,
      crystal.crystal_id, sim,
    );
    const conflictingNumber = patch.samples[0].triangle_index;
    const wrongSourceLayers = [{
      triangle_keys: new Set([`different-authenticated-surface:${conflictingNumber}`]),
      representative_relief_mm: 7,
    }];
    const candidateState = renderState(wall);
    const candidate = emit(candidateState, crystal, wall, sim, wrongSourceLayers);
    const referenceMatrix = new THREE.Matrix4();
    const candidateMatrix = new THREE.Matrix4();
    reference.getMatrixAt(0, referenceMatrix);
    candidate.getMatrixAt(0, candidateMatrix);
    expect(new THREE.Vector3().setFromMatrixPosition(candidateMatrix).distanceTo(
      new THREE.Vector3().setFromMatrixPosition(referenceMatrix),
    )).toBeCloseTo(0, 12);
  });

  it('replaces micron crust coins with one continuous skin at the recorded thickness', () => {
    const wall = new WallState({ cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70, shape_seed: 42 });
    const crystal = makeAggregate(wall, 680);
    const sim = { step: 900, wall_state: wall, crystals: [crystal] };
    classifySurfaceGrowth(sim);
    crystal._surfaceGrowth = { ...crystal._surfaceGrowth, mean_thickness_um: 2 };
    const testimony = JSON.stringify(crystal._surfaceGrowth);
    const state = renderState(wall), layers: any[] = [];
    const skin = emit(state, crystal, wall, sim, layers);
    expect(state.crystals.children).toEqual([skin]);
    expect(skin.isInstancedMesh).not.toBe(true);
    expect(skin.userData.representation).toBe('wall-conformal-crust-skin');
    expect(skin.userData.rendered_thickness_mm).toBe(0.002);
    expect(layers[0].representative_relief_mm).toBe(0.002);
    expect(JSON.stringify(crystal._surfaceGrowth)).toBe(testimony);
    let disposed = false;
    skin.geometry.addEventListener('dispose', () => { disposed = true; });
    _topoSyncCrystalMeshes(state, { ...sim, crystals: [] }, wall);
    expect(disposed).toBe(true);
  });

  it('bounds a repeatable lobe size tail and replay relief without changing the scientific record', () => {
    const wall = new WallState({ cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70, shape_seed: 42 });
    const crystal = makeAggregate(wall, 681);
    const sim = { step: 900, wall_state: wall, crystals: [crystal] };
    classifySurfaceGrowth(sim);
    crystal._surfaceGrowth = { ...crystal._surfaceGrowth, mean_thickness_um: 300 };
    const testimony = JSON.stringify(crystal._surfaceGrowth);
    const run = (width: number, maturity = 1) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
      const state = renderState(wall);
      const direction = wall.surfaceAnchorDirection(crystal);
      return _emitSurfaceGrowthSwath(state, crystal, new THREE.MeshStandardMaterial(),
        ...direction, wall, wall.ring_count, wall.cells_per_ring, wall.initial_radius_mm,
        crystal.c_length_mm * maturity, sim, []);
    };
    const full = run(1200), again = run(1200), mobile = run(600), replay = run(1200, 0.02);
    expect(full.instanceMatrix.array).toEqual(again.instanceMatrix.array);
    const widths: number[] = [];
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
    for (let i = 0; i < full.count; i++) {
      full.getMatrixAt(i, matrix); scale.setFromMatrixScale(matrix);
      widths.push(scale.x);
      expect(scale.x).toBeLessThanOrEqual(5.000001);
      expect(scale.y).toBeLessThanOrEqual(0.900001);
      if (i < mobile.count) {
        mobile.getMatrixAt(i, matrix);
        expect(new THREE.Vector3().setFromMatrixScale(matrix).x).toBeCloseTo(scale.x, 5);
      }
    }
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(2);
    expect(new Set(widths.map(x => x.toFixed(4))).size).toBeGreaterThan(full.count / 2);
    expect(replay.userData.max_lobe_relief_mm).toBeLessThanOrEqual(0.018001);
    expect(replay.userData.representative_relief_mm).toBeLessThanOrEqual(0.018001);
    expect(JSON.stringify(crystal._surfaceGrowth)).toBe(testimony);
  });

  it('invalidates the crystal renderer signature when wall evolution remaps a birth anchor', () => {
    const wall = new WallState({
      cells_per_ring: 48, ring_count: 12, vug_diameter_mm: 70, shape_seed: 42,
    });
    const crystal = new Crystal({
      mineral: 'quartz', habit: 'prismatic', vector: 'projecting',
      crystal_id: 675, wall_anchor: wall._anchorFromRingCell(6, 12),
    });
    crystal.c_length_mm = 1.2;
    const sim = { step: 4, wall_state: wall, crystals: [crystal] };
    const before = _topoCrystalsSignature(sim, wall);
    wall.rings[6][12].wall_depth += 0.25;
    wall.meshFor(sim);
    const after = _topoCrystalsSignature(sim, wall);
    expect(after).not.toBe(before);
    expect(crystal.wall_anchor.source.signature).not.toBe(
      wall._resolveAnchor(crystal).source.signature,
    );

    const state = renderState(wall);
    state.crystalsSig = null;
    _topoSyncCrystalMeshes(state, sim, wall);
    const firstMesh = state.crystals.children.find(
      (child: any) => child.userData?.crystal_id === crystal.crystal_id,
    );
    expect(firstMesh).toBeTruthy();
    const firstPosition = firstMesh.position.clone();
    for (const ring of wall.rings) for (const cell of ring) cell.wall_depth += 0.25;
    wall.meshFor(sim);
    _topoSyncCrystalMeshes(state, sim, wall);
    const secondMesh = state.crystals.children.find(
      (child: any) => child.userData?.crystal_id === crystal.crystal_id,
    );
    expect(secondMesh).toBeTruthy();
    expect(secondMesh).not.toBe(firstMesh);
    expect(secondMesh.position.distanceTo(firstPosition)).toBeGreaterThan(0.05);
  });

  it('builds replay geometry from each snapshot rather than the live-wall cache', () => {
    const liveWall = new WallState({
      cells_per_ring: 24, ring_count: 8, vug_diameter_mm: 60,
      primary_bubbles: 3, secondary_bubbles: 5, shape_seed: 42,
    });
    const liveMesh = liveWall.meshFor();
    const snapshotA = {
      rings: liveWall.rings.map((ring: any[]) => ring.map((cell: any) => ({
        wall_depth: cell.wall_depth,
        base_radius_mm: cell.base_radius_mm,
      }))),
    };
    const snapshotB = {
      rings: snapshotA.rings.map((ring: any[]) => ring.map((cell: any) => ({ ...cell }))),
    };
    snapshotB.rings[3][1].wall_depth += 4.25;

    const wallA = _topoSnapshotWall(liveWall, snapshotA);
    const wallB = _topoSnapshotWall(liveWall, snapshotB);
    expect(wallA).not.toBe(liveWall);
    expect(wallB).not.toBe(liveWall);
    expect(wallA._geometry_revision).toBeUndefined();
    expect(wallB._geometry_revision).toBeUndefined();
    expect(wallA._mesh).toBeUndefined();
    expect(wallB._mesh).toBeUndefined();

    const meshA = wallA.meshFor();
    const meshB = wallB.meshFor();
    expect(meshA).not.toBe(liveMesh);
    expect(meshB).not.toBe(liveMesh);
    expect(meshA).not.toBe(meshB);
    expect(meshA.sig).not.toBe(meshB.sig);
    const changedVertex = 3 * liveWall.cells_per_ring + 1;
    expect(meshA.positions[changedVertex * 3]).not.toBe(meshB.positions[changedVertex * 3]);
  });
});
