import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any;
declare const gypsumRenderNormals: any, dolomiteRenderNormals: any, bladeRhombRenderFaces: any;
declare const makeBladeRhombRenderGeometry: any, wulffPolyhedron: any;
declare const _topoSyncCrystalMeshes: any, _resolveCrystalGeomToken: any;
declare const _topoCrystalsSignature: any;
declare const _o2PlaceBody: any;
declare const applyGypsumCleavage: any;
declare const _opticsPaintTier: any;
declare const _helixRestoreCrystalOpacity: any;
declare const _helixUpdateCrystalVisibility: any;

function render(mineral: string, habit: string, extra = {}) {
  const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
  const crystal = new Crystal({ mineral, habit, crystal_id: 17, nucleation_step: 1 });
  Object.assign(crystal, { c_length_mm: 8, a_width_mm: 4, total_growth_um: 8000 }, extra);
  crystal.wall_anchor = wall._anchorFromRingCell(6, 12);
  const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
  _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 100 }, wall);
  return { crystal, state, wall };
}

describe('R4c gypsum blades and dolomite rhombs', () => {
  it('uses the monoclinic reciprocal metric in a rigid c-on-Y frame', () => {
    const beta = 113.8 * Math.PI / 180;
    const a = new THREE.Vector3(5.63 * Math.sin(beta), 5.63 * Math.cos(beta), 0);
    const b = new THREE.Vector3(0, 0, -15.201), c = new THREE.Vector3(0, 6.23, 0);
    for (const hkl of [[0, 1, 0], [1, 2, 0], [-1, 1, 1], [0, 1, 1]]) {
      const ns = gypsumRenderNormals(hkl), n = new THREE.Vector3(...ns[0]);
      expect(ns).toHaveLength(hkl[0] === 0 && hkl[2] === 0 ? 2 : 4);
      const dots = [n.dot(a), n.dot(b), n.dot(c)];
      const i = hkl.findIndex(v => v !== 0), factor = dots[i] / hkl[i];
      for (let j = 0; j < 3; j++) expect(dots[j]).toBeCloseTo(hkl[j] * factor, 9);
      for (const normal of ns) expect(Math.hypot(...normal)).toBeCloseTo(1, 10);
    }
    for (const n of gypsumRenderNormals([1, 2, 0])) expect(n[1]).toBeCloseTo(0, 10);
    for (const n of gypsumRenderNormals([0, 1, 0])) expect(Math.abs(n[2])).toBeCloseTo(1, 10);
  });
  it('makes a six-face dolomite rhombohedron using -3 symmetry and the structural 104 metric', () => {
    const ns = dolomiteRenderNormals();
    expect(ns).toHaveLength(6);
    for (const n of ns) expect(ns.some((m: number[]) => new THREE.Vector3(...n).add(new THREE.Vector3(...m)).length() < 1e-8)).toBe(true);
    const poly = wulffPolyhedron(bladeRhombRenderFaces('dolomite', 'rhomb'));
    expect(poly.vertices).toHaveLength(8); expect(poly.faces).toHaveLength(6);
    for (const f of poly.faces) {
      expect(f.verts).toHaveLength(4);
      const lengths = f.verts.map((v: number, i: number) => new THREE.Vector3(...poly.vertices[v])
        .distanceTo(new THREE.Vector3(...poly.vertices[f.verts[(i + 1) % 4]])));
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(1e-8);
    }
    const slope = Math.abs(ns[0][1]) / Math.hypot(ns[0][0], ns[0][2]);
    expect(slope).toBeCloseTo((4 / 16.020) / (2 / (Math.sqrt(3) * 4.812)), 10);
  });
  it('keeps gypsum broad faces, oblique terminations and a thin b-axis across display widths', () => {
    for (const token of ['tablet', 'prism']) for (const width of [0.25, 0.4, 0.6, 0.9]) {
      const faces = bladeRhombRenderFaces('selenite', token, width), poly = wulffPolyhedron(faces);
      expect(new Set(poly.faces.map((f: any) => faces[f.plane].family))).toEqual(new Set(['010', '120', '-111', '011']));
      const span = (axis: number) => Math.max(...poly.vertices.map((v: number[]) => v[axis])) - Math.min(...poly.vertices.map((v: number[]) => v[axis]));
      expect(span(2)).toBeLessThan(span(0) * 0.5);
      expect(span(2) / span(0)).toBeLessThan(0.18);
      expect(span(1) / span(0)).toBeGreaterThan(4.5);
      expect(span(1)).toBeCloseTo(1, 8);
    }
  });
  it('preserves face normals and puts the attachment scar exactly at the declared growth fraction', () => {
    for (const mineral of ['selenite', 'gypsum', 'dolomite']) for (const f of [0, 0.2, 0.5, 0.8]) {
      const token = mineral === 'dolomite' ? 'rhomb' : 'tablet';
      const geom = makeBladeRhombRenderGeometry(mineral, token, 0.5, f);
      expect(geom).toBeTruthy();
      const ns = bladeRhombRenderFaces(mineral, token, 0.5).map((p: any) => p.n).concat([[0, -1, 0]]);
      const normals = geom.attributes.normal, pos = geom.attributes.position;
      for (let i = 0; i < normals.count; i++) expect(ns.some((n: number[]) => new THREE.Vector3(...n)
        .distanceTo(new THREE.Vector3().fromBufferAttribute(normals, i)) < 1e-6)).toBe(true);
      const ys = Array.from({ length: pos.count }, (_, i) => pos.getY(i));
      expect(Math.max(...ys)).toBeCloseTo(0.5, 6);
      expect(Math.min(...ys)).toBeCloseTo(f - 0.5, 6);
      if (f > 0) expect(geom.userData.bladeRhombR4.families).toContain('scar');
      geom.dispose();
    }
  });
  it('routes coarse dolomite without changing other minerals or the air-mode override', () => {
    expect(_resolveCrystalGeomToken({ mineral: 'dolomite' }, 'coarse_rhomb')).toBe('rhomb');
    expect(_resolveCrystalGeomToken({ mineral: 'calcite' }, 'coarse_rhomb')).toBe('prism');
    expect(_resolveCrystalGeomToken({ mineral: 'dolomite', growth_environment: 'air' }, 'coarse_rhomb')).toBe('dripstone');
  });
  it('invalidates a live gypsum blade when its width changes without a length change', () => {
    const { crystal, wall } = render('selenite', 'tabular');
    const sim = { crystals: [crystal] }, before = _topoCrystalsSignature(sim, wall);
    crystal.a_width_mm += 0.1;
    expect(_topoCrystalsSignature(sim, wall)).not.toBe(before);
  });
  it('executes both minerals with uniform parent/satellite scaling and cached geometry', () => {
    for (const [mineral, habit] of [['selenite', 'tabular'], ['selenite', 'prismatic'], ['dolomite', 'coarse_rhomb']]) {
      const { crystal, state, wall } = render(mineral, habit);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.bladeRhombR4);
      expect(bodies.length).toBeGreaterThan(1);
      for (const m of bodies) { expect(m.scale.x).toBe(m.scale.y); expect(m.scale.z).toBe(m.scale.y); }
      const testimony = JSON.stringify({ zones: crystal.zones, volume: crystal._volume_mm3, c: crystal.c_length_mm, a: crystal.a_width_mm });
      _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 101 }, wall);
      expect(state.crystals.children.find((m: any) => m.geometry.userData.bladeRhombR4).geometry).toBe(bodies[0].geometry);
      expect(JSON.stringify({ zones: crystal.zones, volume: crystal._volume_mm3, c: crystal.c_length_mm, a: crystal.a_width_mm })).toBe(testimony);
    }
  });
  it('preserves swallowtail twins, gypsum hourglass sectors, deformations, saddle dolomite and aggregates', () => {
    for (const [mineral, habit, extra] of [
      ['selenite', 'tabular', { twinned: true, twin_law: 'swallowtail' }],
      ['selenite', 'tabular', { _sectorZoned: { kind: 'gypsum_hourglass', sandLoad: 0.4 } }],
      ['selenite', 'prismatic', { _deformation: { kind: 'bend', amount: 0.4, atStep: 0 } }],
      ['dolomite', 'saddle_rhomb', {}], ['dolomite', 'massive', {}],
    ] as any[]) {
      const { state } = render(mineral, habit, extra);
      expect(state.crystals.children.length).toBeGreaterThan(0);
      expect(state.crystals.children.some((m: any) => m.geometry.userData.bladeRhombR4)).toBe(false);
    }
  });
  it('bounds the full dolomite rhomb for neighbor contacts, including enlarged tiny crystals', () => {
    for (const dims of [{ c_length_mm: 8, a_width_mm: 4 }, { c_length_mm: 0.04, a_width_mm: 0.02 }]) {
      const { crystal, state, wall } = render('dolomite', 'coarse_rhomb', dims);
      const mesh = state.crystals.children.find((m: any) => m.geometry.userData.bladeRhombR4);
      const body = _o2PlaceBody(crystal, wall, undefined, 13, 24, 35);
      expect(new THREE.Vector3(body.cx, body.cy, body.cz).distanceTo(mesh.position)).toBeLessThan(1e-6);
      const ps = mesh.geometry.attributes.position;
      for (let i = 0; i < ps.count; i++) expect(new THREE.Vector3().fromBufferAttribute(ps, i).multiply(mesh.scale).length()).toBeLessThanOrEqual(body.reach + 1e-6);
    }
  });
  it('keeps a three-dimensional selenite spray rooted locally with related subgroups', () => {
    const { state } = render('selenite', 'tabular', { _nucTilt: { theta: 0.35, azim: 1.2 } });
    const parent = state.crystals.children.find((m: any) => !m.userData.isSatellite);
    const blades = state.crystals.children.filter((m: any) => m.userData.bladeSpray);
    expect(blades).toHaveLength(9);
    const root = (m: any) => {
      m.updateMatrixWorld(true);
      m.geometry.computeBoundingBox();
      return new THREE.Vector3(0, m.geometry.boundingBox.min.y, 0).applyMatrix4(m.matrixWorld);
    };
    const parentRoot = root(parent);
    const normals = [];
    for (const m of blades) {
      expect(root(m).distanceTo(parentRoot)).toBeLessThan(parent.scale.y * 0.45);
      normals.push(new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion));
      expect(m.userData.crystal_id).toBe(parent.userData.crystal_id);
      if (m.geometry.userData.bladeRhombR4.development === 3) {
        expect(m.material.userData.optics.clarity).toBe(0);
        expect(m.userData.naturalOpacity).toBe(1);
      } else expect(m.material).toBe(parent.material);
    }
    for (let i = 0; i < 6; i += 2) {
      expect(normals[i].angleTo(normals[i + 1])).toBeGreaterThan(0.25);
      expect(normals[i].angleTo(normals[i + 1])).toBeLessThan(1.5);
    }
    expect(normals[0].angleTo(normals[4])).toBeGreaterThan(0.15);
    const sizes = blades.map((m: any) => m.scale.y);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(1.8);
    expect(new Set(blades.map((m: any) => m.geometry)).size).toBeGreaterThan(1);
    expect(blades.filter((m: any) => m.geometry.userData.bladeRhombR4.development === 3)).toHaveLength(3);
    expect(new Set(blades.map((m: any) => m.geometry.userData.bladeRhombR4.attachFrac)).size).toBeGreaterThan(1);
    for (const m of blades) {
      expect(m.geometry.attributes.gypsumHeight.count).toBe(m.geometry.attributes.position.count);
      expect(m.scale.x).toBe(m.scale.y); expect(m.scale.y).toBe(m.scale.z);
    }
    expect(parent.material.userData.gypsumCleavage).toBeTruthy();
    parent.geometry.computeBoundingBox();
    const dims = parent.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(parent.scale);
    expect(parent.material.userData.optics.extent_mm).toBeCloseTo(Math.min(dims.x, dims.y, dims.z), 6);
    const rootOwner = blades.find((m: any) => m.userData.ownsSatelliteMaterial);
    expect(rootOwner).toBeTruthy();
    _helixUpdateCrystalVisibility({ crystals: state.crystals }, 0.5, null, 0, []);
    expect(rootOwner.material.transparent).toBe(true);
    _helixRestoreCrystalOpacity({ crystals: state.crystals });
    expect(rootOwner.material.transparent).toBe(false);
    expect(rootOwner.material.depthWrite).toBe(true);
  });
  it('interpenetrates the parent body with crossing blades rather than only touching at their roots', () => {
    for (const [habit, id, width] of [['tabular', 1, 6], ['tabular', 17, 4], ['prismatic', 42, 1.2]] as const) {
      const { state } = render('selenite', habit, { crystal_id: id, a_width_mm: width, _nucTilt: { theta: 0.35, azim: 1.2 } });
      const parent = state.crystals.children.find((m: any) => !m.userData.isSatellite);
      const blades = state.crystals.children.filter((m: any) => m.userData.bladeSpray
        && m.geometry.userData.bladeRhombR4.development !== 3);
      const inside = (mesh: any, point: any) => {
        mesh.updateMatrixWorld(true);
        const local = mesh.worldToLocal(point.clone());
        const pos = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
        for (let i = 0; i < pos.count; i += 3) {
          const n = new THREE.Vector3().fromBufferAttribute(normals, i);
          const v = new THREE.Vector3().fromBufferAttribute(pos, i);
          if (n.dot(local.clone().sub(v)) >= -1e-5) return false;
        }
        return true;
      };
      parent.updateMatrixWorld(true);
      parent.geometry.computeBoundingBox();
      const bounds = parent.geometry.boundingBox;
      const hits = new Set();
      // Sample the parent's interior; a projected silhouette overlap or a shared
      // root contact cannot satisfy strict containment in both solid geometries.
      for (let j = 1; j < 100; j++) {
        const point = new THREE.Vector3(0, bounds.min.y + (bounds.max.y - bounds.min.y) * j / 100, 0)
          .applyMatrix4(parent.matrixWorld);
        if (inside(parent, point)) for (const blade of blades) if (inside(blade, point)) hits.add(blade);
      }
      expect(hits.size).toBeGreaterThanOrEqual(4);
    }
  });
  it('accumulates alpha layers without disabling depth for opaque or transmission-tier materials', () => {
    for (const transparent of [true, false]) {
      const mat = new THREE.MeshPhysicalMaterial({ transparent, depthWrite: true });
      applyGypsumCleavage(mat);
      expect(mat.depthWrite).toBe(!transparent);
      _opticsPaintTier(mat, { transmissive: false, metalness: 0, tier: 'alpha', clarity: 0.95, alpha_opacity: 0.335 }, new THREE.Color('#f2f4f6'));
      expect(mat.depthWrite).toBe(false);
      _opticsPaintTier(mat, { transmissive: true, transmission: 0.9, clarity: 0.95 }, new THREE.Color('#f2f4f6'));
      expect(mat.depthWrite).toBe(true);
      _helixRestoreCrystalOpacity({ crystals: { children: [{ material: mat, userData: { naturalOpacity: 0.335 } }] } });
      expect(mat.transparent).toBe(true);
      expect(mat.depthWrite).toBe(false);
    }
  });
  it('keeps cleavage optics and spray placement scoped to ordinary gypsum forms', () => {
    for (const [mineral, habit, extra] of [
      ['dolomite', 'coarse_rhomb', {}], ['celestine', 'bladed', {}],
      ['selenite', 'tabular', { twinned: true, twin_law: 'swallowtail' }],
      ['selenite', 'tabular', { _sectorZoned: { kind: 'gypsum_hourglass', sandLoad: 0.4 } }],
    ] as any[]) {
      const { state } = render(mineral, habit, extra);
      for (const m of state.crystals.children) {
        expect(m.userData.bladeSpray).toBeUndefined();
        expect(m.material.userData.gypsumCleavage).toBeUndefined();
      }
    }
  });
});
