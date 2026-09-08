import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any;
declare const pyritePyritohedronNormals: any, sulfideRenderFaces: any, pyriteGrooveGradient: any;
declare const makeSulfideRenderGeometry: any, applyPyriteStriations: any;
declare const wulffPolyhedron: any, _topoSyncCrystalMeshes: any;
declare const _clipConvexGeom: any, transferSulfideGrooves: any;

function stateFor(c: any) {
  const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
  Object.assign(c, { c_length_mm: 8, a_width_mm: 8, total_growth_um: 8000 });
  c.wall_anchor = wall._anchorFromRingCell(6, 12);
  const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
  _topoSyncCrystalMeshes(state, { crystals: [c], step: 100 }, wall);
  return { state, wall };
}

describe('R4b sulfide crystallographic forms', () => {
  it('uses the 12-face Th pyritohedron, with unequal pentagonal edges', () => {
    const ns = pyritePyritohedronNormals();
    expect(ns).toHaveLength(12);
    expect(new Set(ns.map((n: number[]) => n.join(','))).size).toBe(12);
    const poly = wulffPolyhedron(ns.map((n: number[]) => ({ n, d: 1 })));
    expect(poly.vertices).toHaveLength(20); expect(poly.faces).toHaveLength(12);
    for (const f of poly.faces) {
      expect(f.verts).toHaveLength(5);
      const lengths = f.verts.map((v: number, i: number) => new THREE.Vector3(...poly.vertices[v])
        .distanceTo(new THREE.Vector3(...poly.vertices[f.verts[(i + 1) % 5]])));
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.1);
    }
  });
  it('keeps sphalerite positive and negative tetrahedra distinct, with twelve dodecahedral planes', () => {
    const faces = sulfideRenderFaces('sphalerite', 'tetrahedron', 3);
    const pos = faces.filter((f: any) => f.family === '111+'), neg = faces.filter((f: any) => f.family === '111-');
    expect(pos).toHaveLength(4); expect(neg).toHaveLength(4);
    expect(faces.filter((f: any) => f.family === '110')).toHaveLength(12);
    expect(pos[0].d).toBeLessThan(neg[0].d);
    const poly = wulffPolyhedron(faces);
    expect(new Set(poly.faces.map((f: any) => faces[f.plane].family)).size).toBe(3);
  });
  it('retains lattice angles and a closed attachment scar across all form and variant buckets', () => {
    for (const [mineral, tokens] of [['sphalerite', ['tetrahedron', 'rhombic_dodec']],
      ['pyrite', ['cube', 'octahedron', 'dodecahedron']]] as any[]) {
      for (const token of tokens) for (const variant of [0, 3, 7]) for (const attachment of [0, 0.2, 0.5, 0.8]) {
        const geom = makeSulfideRenderGeometry(mineral, token, variant, attachment, false);
        expect(geom).toBeTruthy();
        const faces = sulfideRenderFaces(mineral, token, variant).concat([{ n: [0, -1, 0] }]);
        const p = geom.attributes.position, ns = geom.attributes.normal;
        expect(geom.attributes.sulfideGroove.count).toBe(p.count);
        for (let i = 0; i < p.count; i++) {
          expect(Math.max(Math.abs(p.getX(i)), Math.abs(p.getY(i)), Math.abs(p.getZ(i)))).toBeLessThanOrEqual(0.500001);
          const n = new THREE.Vector3().fromBufferAttribute(ns, i);
          expect(faces.some((f: any) => n.distanceTo(new THREE.Vector3(...f.n)) < 1e-5),
            `${mineral}/${token}/${variant}/${attachment} vertex ${i}: ${n.toArray()}`).toBe(true);
        }
        if (attachment > 0) expect(geom.userData.sulfideR4.families).toContain('scar');
        geom.dispose();
      }
    }
  });
  it('changes striation direction with cyclic face symmetry and leaves scars and octahedra smooth', () => {
    for (const f of sulfideRenderFaces('pyrite', 'cube')) {
      const g = pyriteGrooveGradient(f);
      expect(g.reduce((s: number, v: number, i: number) => s + v * f.n[i], 0)).toBeCloseTo(0, 8);
      expect(Math.hypot(...g)).toBeCloseTo(f.family === '111' ? 0 : 1, 8);
    }
    expect(pyriteGrooveGradient({ family: '100', n: [1, 0, 0] })).toEqual([0, 1, 0]);
    expect(pyriteGrooveGradient({ family: '100', n: [0, 1, 0] })).toEqual([0, 0, 1]);
    expect(pyriteGrooveGradient({ family: 'scar', n: [0, -1, 0] })).toEqual([0, 0, 0]);
    const mat = new THREE.MeshPhysicalMaterial();
    mat.onBeforeCompile = (s: any) => { s.uniforms.clipSentinel = { value: 1 }; };
    mat.customProgramCacheKey = () => 'clip';
    applyPyriteStriations(mat);
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <normal_fragment_maps>' };
    mat.onBeforeCompile(shader);
    expect((shader.uniforms as any).clipSentinel.value).toBe(1);
    expect(shader.vertexShader).toContain('length(modelMatrix[1].xyz)');
    expect(shader.fragmentShader).toContain('fwidth(x)');
    expect(mat.customProgramCacheKey()).toContain('clip|pyrite');
  });
  it('routes ordinary sulfides through the real renderer with uniform scale and cache reuse', () => {
    for (const [mineral, habit] of [['sphalerite', 'tetrahedral'], ['sphalerite', 'dodecahedral'], ['pyrite', 'pyritohedral'], ['pyrite', 'cubic'], ['pyrite', 'octahedral']]) {
      const c = new Crystal({ mineral, habit, crystal_id: 17, nucleation_step: 1 });
      const { state, wall } = stateFor(c);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.sulfideR4);
      expect(bodies.length).toBeGreaterThan(0);
      for (const m of bodies) {
        expect(m.scale.x).toBe(m.scale.y); expect(m.scale.z).toBe(m.scale.y);
        if (mineral === 'pyrite') expect(m.material.userData.pyriteStriations).toBeTruthy();
      }
      const testimony = JSON.stringify({ zones: c.zones, volume: c._volume_mm3, c: c.c_length_mm, a: c.a_width_mm });
      _topoSyncCrystalMeshes(state, { crystals: [c], step: 101 }, wall);
      expect(state.crystals.children.find((m: any) => m.geometry.userData.sulfideR4).geometry).toBe(bodies[0].geometry);
      expect(JSON.stringify({ zones: c.zones, volume: c._volume_mm3, c: c.c_length_mm, a: c.a_width_mm })).toBe(testimony);
    }
  });
  it('keeps striations on surviving growth faces after neighbor clipping, with smooth new contacts', () => {
    const geom = makeSulfideRenderGeometry('pyrite', 'cube', 3, 0, false);
    const result = _clipConvexGeom(geom, [{ n: [1, 0, 0], d: 0.2 }]);
    expect(result.contactTris).toBeGreaterThan(0);
    transferSulfideGrooves(geom, result.geom);
    const attr = result.geom.attributes.sulfideGroove;
    expect(attr.count).toBe(result.geom.attributes.position.count);
    for (const group of result.geom.groups) {
      let sum = 0;
      for (let i = group.start; i < group.start + group.count; i++) sum += Math.hypot(attr.getX(i), attr.getY(i), attr.getZ(i));
      if (group.materialIndex === 1) expect(sum).toBe(0);
      else expect(sum).toBeGreaterThan(0);
    }
    geom.dispose(); result.geom.dispose();
  });
  it('preserves iron-cross twins and recorded skeletal pyrite, including buried skeletal episodes', () => {
    for (const special of [ { twinned: true, twin_law: 'iron_cross' },
      { zones: [{ step: 1, thickness_um: 400, morph_regime: 'hopper_skeletal' }, { step: 2, thickness_um: 600, morph_regime: 'spiral_smooth' }] } ]) {
      const c = new Crystal({ mineral: 'pyrite', habit: 'cubic', crystal_id: 17, nucleation_step: 1 });
      Object.assign(c, special);
      const { state } = stateFor(c);
      expect(state.crystals.children.length).toBeGreaterThan(0);
      expect(state.crystals.children.some((m: any) => m.geometry.userData.sulfideR4)).toBe(false);
    }
  });
});
