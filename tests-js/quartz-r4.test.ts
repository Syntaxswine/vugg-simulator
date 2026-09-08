import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any;
declare const quartzFormNormals: any, quartzRenderFaces: any, quartzRenderHistory: any;
declare const makeQuartzRenderGeometry: any, applyQuartzStriations: any;
declare const wulffPolyhedron: any, _topoSyncCrystalMeshes: any, _topoCrystalsSignature: any;

function area(poly: any, face: any) {
  const origin = new THREE.Vector3(...poly.vertices[face.verts[0]]);
  let sum = 0;
  for (let i = 1; i + 1 < face.verts.length; i++) {
    const a = new THREE.Vector3(...poly.vertices[face.verts[i]]).sub(origin);
    const b = new THREE.Vector3(...poly.vertices[face.verts[i + 1]]).sub(origin);
    sum += a.cross(b).length() / 2;
  }
  return sum;
}

describe('R4 quartz fixed planes and differential development', () => {
  it('keeps the two rhombohedra distinct under point group 32', () => {
    const m = quartzFormNormals(1, 0, 0), r = quartzFormNormals(1, 0, 1), z = quartzFormNormals(0, 1, 1);
    expect(m).toHaveLength(6); expect(r).toHaveLength(6); expect(z).toHaveLength(6);
    expect(r.filter((n: number[]) => n[1] > 0)).toHaveLength(3);
    for (const n of r) {
      expect(Math.hypot(...n)).toBeCloseTo(1, 10);
      expect(z.some((v: number[]) => new THREE.Vector3(...n).distanceTo(new THREE.Vector3(...v)) < 1e-6)).toBe(false);
      expect(Math.asin(Math.abs(n[1])) * 180 / Math.PI).toBeCloseTo(38.21, 1);
    }
  });
  it('keeps all six termination faces, larger r areas, a displaced tip, and a flat attached base over live aspect buckets', () => {
    for (const ratio of [0.2, 0.4, 0.7, 1.1]) for (const contrast of [0.12, 0.24]) for (const phase of [0, Math.PI / 3, Math.PI]) {
      const faces = quartzRenderFaces(ratio, contrast, phase), poly = wulffPolyhedron(faces);
      expect(poly.faces).toHaveLength(13);
      const r = poly.faces.filter((f: any) => faces[f.plane].family === 'r');
      const z = poly.faces.filter((f: any) => faces[f.plane].family === 'z');
      expect(r).toHaveLength(3); expect(z).toHaveLength(3);
      expect(Math.min(...r.map((f: any) => area(poly, f)))).toBeGreaterThan(Math.max(...z.map((f: any) => area(poly, f))));
      const tip = poly.vertices.reduce((a: number[], b: number[]) => a[1] > b[1] ? a : b);
      expect(tip[1]).toBeCloseTo(0.5, 8);
      expect(Math.hypot(tip[0], tip[2])).toBeGreaterThan(0.001);
      expect(Math.min(...poly.vertices.map((v: number[]) => v[1]))).toBeCloseTo(-0.5, 8);
      const geom = makeQuartzRenderGeometry(ratio, contrast, phase);
      expect(geom).toBeTruthy();
      const ns = geom.attributes.normal;
      for (let i = 0; i < ns.count; i++) {
        const n = new THREE.Vector3().fromBufferAttribute(ns, i);
        expect(faces.some((f: any) => n.distanceTo(new THREE.Vector3(...f.n)) < 1e-5)).toBe(true);
      }
      geom.dispose();
    }
  });
  it('uses only growth episodes already present at the replay step', () => {
    const crystal = { crystal_id: 17, zones: [{ step: 1, thickness_um: 10 }, { step: 2, thickness_um: 40 }, { step: 3, thickness_um: 2 }] };
    const before = JSON.stringify(crystal);
    const early = quartzRenderHistory(crystal, 1), middle = quartzRenderHistory(crystal, 2), live = quartzRenderHistory(crystal, null);
    expect(early.bands).toHaveLength(0); expect(middle.bands).toHaveLength(1); expect(live.bands).toHaveLength(2);
    expect(middle.growth_um).toBe(50);
    expect(quartzRenderHistory({ ...crystal, zones: crystal.zones.slice(0, 2) }, null)).toEqual(middle);
    expect(JSON.stringify(crystal)).toBe(before);
  });
  it('invalidates live quartz rendering when a thin growth episode leaves rounded length unchanged', () => {
    const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
    const c = new Crystal({ mineral: 'quartz', habit: 'prismatic', crystal_id: 1 });
    c.c_length_mm = 5; c.a_width_mm = 2; c.wall_anchor = wall._anchorFromRingCell(6, 12);
    const sim = { crystals: [c] }, before = _topoCrystalsSignature(sim, wall);
    c.zones.push({ step: 2, thickness_um: 0.01 });
    expect(_topoCrystalsSignature(sim, wall)).not.toBe(before);
  });
  it('composes the striation shader with clipping and fades unresolved lines', () => {
    const mat = new THREE.MeshPhysicalMaterial();
    mat.onBeforeCompile = (shader: any) => { shader.uniforms.clipSentinel = { value: 1 }; };
    mat.customProgramCacheKey = () => 'clip';
    applyQuartzStriations(mat, { bands: [{ at: 0.1, strength: 0.5 }] });
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <normal_fragment_maps>' };
    mat.onBeforeCompile(shader);
    expect((shader.uniforms as any).clipSentinel.value).toBe(1);
    expect(shader.vertexShader).toContain('length(modelMatrix[1].xyz)');
    expect(shader.fragmentShader).toContain('fwidth(y)');
    expect(shader.vertexShader).toContain('abs(normal.y)');
    expect(mat.customProgramCacheKey()).toContain('clip|quartz');
  });
  it('leaves gwindel, sceptre, deformation and twin geometry precedence intact', () => {
    const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
    for (const variant of [{ _gwindel: { twistDeg: 30 } }, { _sceptre: { capFrac: 0.5, boundaryStep: 0 } },
      { _deformation: { kind: 'bend', amount: 0.4, atStep: 0 } }, { twinned: true, twin_law: 'dauphine' }]) {
      const crystal = new Crystal({ mineral: 'quartz', habit: 'prismatic', crystal_id: 17, nucleation_step: 1 });
      Object.assign(crystal, variant, { c_length_mm: 12, a_width_mm: 4, total_growth_um: 12000 });
      crystal.wall_anchor = wall._anchorFromRingCell(6, 12);
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 100 }, wall);
      expect(state.crystals.children.length).toBeGreaterThan(0);
      expect(state.crystals.children.some((m: any) => m.geometry.userData.quartzR4)).toBe(false);
    }
  });
  it('executes quartz through the real renderer with uniform scale, cache reuse, and unchanged growth testimony', () => {
    const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
    const crystal = new Crystal({ mineral: 'quartz', habit: 'prismatic', crystal_id: 17, nucleation_step: 1 });
    crystal.c_length_mm = 12; crystal.a_width_mm = 4; crystal.total_growth_um = 12000;
    crystal.wall_anchor = wall._anchorFromRingCell(6, 12);
    const before = JSON.stringify({ zones: crystal.zones, volume: crystal._volume_mm3, c: crystal.c_length_mm, a: crystal.a_width_mm });
    const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
    _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 100 }, wall);
    const body = state.crystals.children.find((m: any) => m.geometry.userData.quartzR4);
    expect(body).toBeTruthy();
    expect(body.scale.x).toBe(body.scale.y); expect(body.scale.z).toBe(body.scale.y);
    expect(body.material.userData.quartzStriations).toBeTruthy();
    const quartzBodies = state.crystals.children.filter((m: any) => m.geometry.userData.quartzR4);
    expect(quartzBodies.length).toBeGreaterThan(1);
    for (const m of quartzBodies) { expect(m.scale.x).toBe(m.scale.y); expect(m.scale.z).toBe(m.scale.y); }
    const geometry = body.geometry;
    _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 101 }, wall);
    expect(state.crystals.children.find((m: any) => m.geometry.userData.quartzR4).geometry).toBe(geometry);
    expect(JSON.stringify({ zones: crystal.zones, volume: crystal._volume_mm3, c: crystal.c_length_mm, a: crystal.a_width_mm })).toBe(before);
  });
});
