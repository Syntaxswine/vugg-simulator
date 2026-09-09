import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any;
declare const bariteRenderFaces: any, makeBariteRenderGeometry: any, _topoSyncCrystalMeshes: any;

function render(habit: string, extra = {}) {
  const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
  const crystal = new Crystal({ mineral: 'barite', habit, crystal_id: 21, nucleation_step: 1 });
  Object.assign(crystal, { c_length_mm: 8, a_width_mm: 4, total_growth_um: 8000 }, extra);
  crystal.wall_anchor = wall._anchorFromRingCell(6, 12);
  const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
  _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 100 }, wall);
  return { crystal, state, wall };
}

describe('R4d barite habit distinction', () => {
  it('keeps orthorhombic mirror partners and metric corner angles', () => {
    for (const habit of ['tabular', 'bladed', 'cockscomb', 'prismatic']) {
      const faces = bariteRenderFaces(habit);
      for (const face of faces) expect(faces.some((f: any) => new THREE.Vector3(...f.n).add(new THREE.Vector3(...face.n)).length() < 1e-8)).toBe(true);
      const n = faces.find((f: any) => f.family === '210').n;
      expect(Math.abs(n[0] / n[habit === 'prismatic' ? 2 : 1])).toBeCloseTo(2 * 5.450 / 8.879, 8);
    }
  });
  it('distinguishes broad tablets, blades and thick prisms without pyramidal needle tips', () => {
    const dims: any = {};
    for (const habit of ['tabular', 'bladed', 'prismatic']) {
      const geom = makeBariteRenderGeometry(habit, 0);
      geom.computeBoundingBox(); dims[habit] = geom.boundingBox.getSize(new THREE.Vector3());
      const ps = geom.attributes.position;
      const tip = new Set();
      for (let i = 0; i < ps.count; i++) if (Math.abs(ps.getY(i) - 0.5) < 1e-6) tip.add(ps.getX(i).toFixed(5) + ',' + ps.getZ(i).toFixed(5));
      expect(tip.size).toBeGreaterThanOrEqual(2); // a dome may leave a chisel ridge
    }
    expect(dims.tabular.x / dims.tabular.y).toBeGreaterThan(dims.bladed.x / dims.bladed.y * 1.4);
    expect(dims.prismatic.z / dims.prismatic.x).toBeGreaterThan(0.7);
    expect(dims.bladed.z / dims.bladed.x).toBeLessThan(0.3);
  });
  it('clips a real attachment scar without changing face normals', () => {
    for (const fraction of [0.2, 0.5, 0.7]) {
      const geom = makeBariteRenderGeometry('bladed', fraction);
      geom.computeBoundingBox(); expect(geom.boundingBox.min.y).toBeCloseTo(fraction - 0.5, 6);
      expect(geom.userData.bariteR4.families).toContain('scar');
    }
  });
  it('restricts the crested arrangement to the cockscomb habit', () => {
    for (const habit of ['tabular', 'bladed', 'prismatic', 'cockscomb']) {
      const { state } = render(habit);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.bariteR4);
      expect(bodies.length).toBeGreaterThan(1);
      expect(bodies.some((m: any) => m.userData.bariteCrest)).toBe(habit === 'cockscomb');
      for (const mesh of bodies) { expect(mesh.scale.x).toBe(mesh.scale.y); expect(mesh.scale.z).toBe(mesh.scale.y); }
    }
  });
  it('keeps crest members connected through shared interiors', () => {
    const { state } = render('cockscomb');
    const bodies = state.crystals.children;
    const inside = (mesh: any, point: any) => {
      mesh.updateMatrixWorld(true);
      const p = mesh.worldToLocal(point.clone()), pos = mesh.geometry.attributes.position, ns = mesh.geometry.attributes.normal;
      for (let i = 0; i < pos.count; i += 3) if (new THREE.Vector3().fromBufferAttribute(ns, i).dot(p.clone().sub(new THREE.Vector3().fromBufferAttribute(pos, i))) >= -1e-5) return false;
      return true;
    };
    for (const body of bodies.filter((m: any) => m.userData.bariteCrest)) {
      body.updateMatrixWorld(true); body.geometry.computeBoundingBox();
      const point = body.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(body.matrixWorld);
      expect(bodies.some((other: any) => other !== body && inside(other, point))).toBe(true);
    }
  });
  it('retains existing Wulff and deformation routes', () => {
    for (const [habit, extra] of [['tabular', { _wulffForm: { biasC: 3, growthFrac: 1 } }],
      ['bladed', { _deformation: { kind: 'bend', amount: 0.4, atStep: 0 } }]] as any[]) {
      const { state } = render(habit, extra);
      expect(state.crystals.children.length).toBeGreaterThan(0);
      expect(state.crystals.children.some((m: any) => m.geometry.userData.bariteR4)).toBe(false);
    }
  });
  it('repairs the cockscomb fallback when its Wulff tag has no matching tablet route', () => {
    const { state } = render('cockscomb', { _wulffForm: { biasC: 3, growthFrac: 1 } });
    expect(state.crystals.children.some((m: any) => m.userData.bariteCrest)).toBe(true);
  });
  it('caches ordinary geometry and preserves scientific records', () => {
    const { crystal, state, wall } = render('cockscomb');
    const geom = state.crystals.children[0].geometry;
    const before = JSON.stringify({ zones: crystal.zones, c: crystal.c_length_mm, a: crystal.a_width_mm, volume: crystal._volume_mm3, twinned: crystal.twinned });
    _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 101 }, wall);
    expect(state.crystals.children[0].geometry).toBe(geom);
    expect(JSON.stringify({ zones: crystal.zones, c: crystal.c_length_mm, a: crystal.a_width_mm, volume: crystal._volume_mm3, twinned: crystal.twinned })).toBe(before);
  });
});
