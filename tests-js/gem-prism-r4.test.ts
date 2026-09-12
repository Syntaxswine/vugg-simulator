import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any, _topoSyncCrystalMeshes: any;
declare const gemPrismNormals: any, gemPrismRenderFaces: any, makeGemPrismRenderGeometry: any;
declare const _topazOpticalPlanes: any, chamferCrystalGeometry: any, _topoOpticsApplyTier: any;

describe('R4f topaz and apatite', () => {
  it('keeps topaz terminal junctions closed and outward-facing after chamfering', () => {
    for (const ratio of [0.4, 1, 1.5, 2]) for (const variant of [0, 1]) {
      const g = chamferCrystalGeometry(makeGemPrismRenderGeometry('topaz', ratio, 0.188, variant, 0.4));
      const p = g.attributes.position, normals = g.attributes.normal, edges = new Map<string, number>();
      const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e5)).join(',');
      for (let i = 0; i < p.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, i);
        const b = new THREE.Vector3().fromBufferAttribute(p, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
        expect(b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3().fromBufferAttribute(normals, i))).toBeGreaterThan(0);
        for (let j = 0; j < 3; j++) {
          const edge = [key(i + j), key(i + (j + 1) % 3)].sort().join('|');
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
      }
      expect([...edges.values()].every(count => count === 2)).toBe(true);
    }
  });
  it('traces positive paths from each entry face to the accepted convex topaz boundary', () => {
    const g = chamferCrystalGeometry(makeGemPrismRenderGeometry('topaz', 1.5, 0.188, 1, 0.4));
    const planes = _topazOpticalPlanes(g), p = g.attributes.position;
    for (const plane of planes) for (let i = 0; i < p.count; i++) {
      expect(plane.n.dot(new THREE.Vector3().fromBufferAttribute(p, i)) - plane.d).toBeLessThan(1e-5);
    }
    for (let i = 0; i < p.count; i += 3) {
      const origin = new THREE.Vector3(), n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i);
      for (let k = 0; k < 3; k++) origin.add(new THREE.Vector3().fromBufferAttribute(p, i+k));
      origin.divideScalar(3);
      const direction = n.negate();
      const distance = Math.min(...planes.filter(f => f.n.dot(direction) > 1e-7)
        .map(f => Math.max(0, (f.d-f.n.dot(origin))/f.n.dot(direction))));
      expect(distance).toBeGreaterThan(0.001);
      expect(distance).toBeLessThan(3);
    }
  });
  it('adds uninterrupted topaz prism length without changing its terminal facets', () => {
    const original = makeGemPrismRenderGeometry('topaz', 1.5, 0.188, 1);
    const extended = makeGemPrismRenderGeometry('topaz', 1.5, 0.188, 1, 0.4);
    const terminalVertices = (g: any, scale: number, shift: number) => {
      const out = new Set<string>(), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) if (n.getY(i) > 1e-5) {
        out.add([p.getX(i)*scale, p.getY(i)*scale-shift, p.getZ(i)*scale]
          .map(v => (Math.abs(v) < 1e-5 ? 0 : v).toFixed(5)).join(','));
      }
      return out;
    };
    expect(terminalVertices(extended, 1.4, 0.2)).toEqual(terminalVertices(original, 1, 0));
    extended.computeBoundingBox();
    expect(extended.boundingBox.min.y).toBeCloseTo(0.188-0.5, 6);
    expect(extended.boundingBox.max.y).toBeCloseTo(0.5, 6);
  });
  it('keeps enlarged tiny topaz intact but retains contact cuts at actual size', () => {
    for (const tiny of [true, false]) {
      const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
      const crystals = [1, 2].map(id => {
        const c = new Crystal({ mineral: 'topaz', habit: 'tabular_broad', crystal_id: id, nucleation_step: 1 });
        Object.assign(c, { c_length_mm: tiny ? 0.6 : 8, a_width_mm: tiny ? 0.3 : 4,
          total_growth_um: tiny ? 600 : 8000, wall_anchor: wall._anchorFromRingCell(6, 11 + id) });
        return c;
      });
      const before = JSON.stringify(crystals);
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals, step: 100 }, wall);
      const body = state.crystals.children.find((m: any) => m.userData.crystal_id === 1 && !m.userData.isSatellite);
      expect(Array.isArray(body.material)).toBe(!tiny);
      if (tiny) {
        expect(body.geometry.userData.gemPrismR4.bodyExtension).toBe(0.4);
        expect(body.scale.y).toBeCloseTo(2.8, 6);
      } else expect(body.scale.y).toBe(8);
      expect(JSON.stringify(crystals)).toBe(before);
    }
  });
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
        wall_anchor: wall._anchorFromRingCell(6, 12), zones: [{step:1,thickness_um:8000,fluid_inclusion:true}] });
      const before = JSON.stringify([c.zones, c.c_length_mm, c.a_width_mm, c.habit]);
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals: [c], step: 100 }, wall);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.gemPrismR4);
      expect(bodies.length).toBeGreaterThan(0);
      for (const m of bodies) { expect(m.scale.x).toBe(m.scale.y); expect(m.scale.z).toBe(m.scale.y); }
      if (mineral === 'topaz') {
        const materials = new Set();
        for (const m of bodies) {
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          materials.add(mat);
          expect(mat.side).toBe(THREE.FrontSide);
          expect(mat.userData.optics.volume_path).toBe('convex-growth-zones');
          m.geometry.computeBoundingBox();
          const dims = m.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(m.scale);
          expect(mat.userData.optics.extent_mm).toBeCloseTo(Math.min(dims.x, dims.y, dims.z), 6);
          const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <transmission_pars_fragment>' };
          mat.onBeforeCompile(shader, null);
          expect((shader.uniforms as any).topazExitPlanes.value.length).toBe(mat.userData.optics.exit_planes);
          expect((shader.uniforms as any).topazBulkRoughness.value).toBe(0.42);
          expect((shader.uniforms as any).topazCloudCenter.value.toArray()).toEqual(m.geometry.boundingBox.getCenter(new THREE.Vector3()).toArray());
          expect((shader.uniforms as any).topazCloudSize.value.toArray()).toEqual(m.geometry.boundingBox.getSize(new THREE.Vector3()).toArray());
          expect(mat.roughness).toBeCloseTo(0.06);
          expect(shader.fragmentShader).toContain('volumeAttenuation( topazPathLength,');
        }
        expect(materials.size).toBe(bodies.length);
        _topoOpticsApplyTier(state, 'alpha', 'test fallback');
        for (const mat of materials as Set<any>) { expect(mat.transmission).toBe(0); expect(mat.transparent).toBe(true); expect(mat.opacity).toBeGreaterThanOrEqual(0.9); }
        _topoOpticsApplyTier(state, 'transmission', 'test restore');
        for (const mat of materials as Set<any>) { expect(mat.transmission).toBe(0.50); expect(mat.opacity).toBe(1); }
      } else {
        expect(bodies[0].material.userData.optics.volume_path).toBe('convex-growth-zones');
        expect(bodies[0].material.userData.optics.specimen_transmission_cap).toBe(0.60);
      }
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
