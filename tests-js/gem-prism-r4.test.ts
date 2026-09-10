import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any, _topoSyncCrystalMeshes: any;
declare const gemPrismNormals: any, gemPrismRenderFaces: any, makeGemPrismRenderGeometry: any;

describe('R4f topaz and apatite', () => {
  it('uses orthorhombic reciprocal normals for topaz rather than a square pyramid', () => {
    const ns = gemPrismNormals('topaz', [1, 1, 1]);
    expect(ns).toHaveLength(8);
    for (const n of ns) {
      expect(Math.abs(n[0]/n[2])).toBeCloseTo(8.7968/4.6499, 8);
      expect(Math.abs(n[1]/n[2])).toBeCloseTo(8.7968/8.3909, 8);
    }
  });
  it('gives apatite six equivalent prism faces and twelve metric pyramid faces', () => {
    const prism = gemPrismNormals('apatite', [1, 0, 0]);
    const roof = gemPrismNormals('apatite', [1, 0, 1]);
    expect(prism).toHaveLength(6); expect(roof).toHaveLength(12);
    for (const n of roof) expect(Math.abs(n[1])/Math.hypot(n[0], n[2]))
      .toBeCloseTo(Math.sqrt(3)*9.3973/(2*6.8782), 8);
    const g = makeGemPrismRenderGeometry('apatite', 0.6, 0);
    expect(g.userData.gemPrismR4.families.filter((f: string) => f === '100')).toHaveLength(6);
    expect(g.userData.gemPrismR4.families.filter((f: string) => f === '001')).toHaveLength(2);
    expect(g.userData.gemPrismR4.families.filter((f: string) => f === '101')).toHaveLength(12);
  });
  it('retains developed topaz prism and terminal families in both variants', () => {
    for (const variant of [0, 1]) {
      const g = makeGemPrismRenderGeometry('topaz', 0.6, 0, variant);
      for (const family of ['110', '120', '001', '011', '111']) expect(g.userData.gemPrismR4.families).toContain(family);
    }
  });
  it('preserves angles, outward winding, volume and attachment over the live aspect range', () => {
    for (const mineral of ['topaz', 'apatite']) for (const ratio of [0.15, 0.5, 1, 3])
      for (const attach of [0, 0.3, 0.8]) for (const variant of [0, 1]) {
        const g = makeGemPrismRenderGeometry(mineral, ratio, attach, variant);
        const faces = gemPrismRenderFaces(mineral, ratio, variant).concat([{ n: [0, -1, 0] }]);
        const p = g.attributes.position, ns = g.attributes.normal;
        let volume = 0;
        for (let i = 0; i < p.count; i += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(p, i);
          const b = new THREE.Vector3().fromBufferAttribute(p, i+1);
          const c = new THREE.Vector3().fromBufferAttribute(p, i+2);
          const n = new THREE.Vector3().fromBufferAttribute(ns, i);
          expect(n.length()).toBeCloseTo(1, 6);
          expect(faces.some((f: any) => n.distanceTo(new THREE.Vector3(...f.n)) < 1e-6)).toBe(true);
          expect(b.clone().sub(a).cross(c.clone().sub(a)).dot(n)).toBeGreaterThan(0);
          volume += a.dot(b.clone().cross(c))/6;
        }
        expect(volume).toBeGreaterThan(0);
        g.computeBoundingBox();
        expect(g.boundingBox.min.y).toBeCloseTo(attach-0.5, 6);
        expect(g.boundingBox.max.y).toBeCloseTo(0.5, 6);
        if (attach) expect(g.userData.gemPrismR4.families).toContain('scar');
      }
  });
  it('distinguishes tabular apatite from a long prism', () => {
    const slim = makeGemPrismRenderGeometry('apatite', 0.4, 0);
    const tabular = makeGemPrismRenderGeometry('apatite', 2, 0);
    slim.computeBoundingBox(); tabular.computeBoundingBox();
    const a = slim.boundingBox.getSize(new THREE.Vector3()), b = tabular.boundingBox.getSize(new THREE.Vector3());
    expect(a.x/a.y).toBeLessThan(0.6); expect(b.x/b.y).toBeGreaterThan(1.8);
  });
  it('uses uniform production scaling, reuses geometry, and preserves scientific records', () => {
    for (const [mineral, habit, width] of [['topaz', 'prismatic', 4], ['apatite', 'prismatic', 4], ['apatite', 'tabular', 16]] as any[]) {
      const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
      const c = new Crystal({ mineral, habit, crystal_id: 17, nucleation_step: 1 });
      Object.assign(c, { c_length_mm: 8, a_width_mm: width, total_growth_um: 8000,
        wall_anchor: wall._anchorFromRingCell(6, 12) });
      const before = JSON.stringify([c.zones, c.c_length_mm, c.a_width_mm, c.habit]);
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals: [c], step: 100 }, wall);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.gemPrismR4);
      expect(bodies.length).toBeGreaterThan(0);
      for (const m of bodies) { expect(m.scale.x).toBe(m.scale.y); expect(m.scale.z).toBe(m.scale.y); }
      _topoSyncCrystalMeshes(state, { crystals: [c], step: 101 }, wall);
      expect(state.crystals.children.find((m: any) => m.geometry.userData.gemPrismR4).geometry).toBe(bodies[0].geometry);
      expect(JSON.stringify([c.zones, c.c_length_mm, c.a_width_mm, c.habit])).toBe(before);
    }
  });
  it('keeps recorded twins and unrelated minerals out of this route', () => {
    for (const mineral of ['topaz', 'apatite', 'beryl']) {
      const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
      const c = new Crystal({ mineral, habit: 'prismatic', crystal_id: 3, nucleation_step: 1 });
      Object.assign(c, { twinned: mineral !== 'beryl', c_length_mm: 8, a_width_mm: 4,
        total_growth_um: 8000, wall_anchor: wall._anchorFromRingCell(6, 12) });
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals: [c], step: 100 }, wall);
      expect(state.crystals.children.some((m: any) => m.geometry.userData.gemPrismR4)).toBe(false);
    }
  });
});
