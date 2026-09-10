// R4e metric faces and repeated {110} orientations in the Three.js renderer.
// The legacy 2D primitive remains a schematic; exact hex symmetry is not a
// crystallographic requirement for this orthorhombic pseudohexagonal aggregate.
import { describe, expect, it } from 'vitest';
declare const _resolveCrystalGeomToken: any, _buildHabitGeom: any;
declare const THREE: any, Crystal: any, WallState: any, _topoSyncCrystalMeshes: any;

describe('aragonite-pseudohex-twin (99i) — metric geometry', () => {
  it('uses three adjoining sectors with stepped basal terminations', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin');
    const p = g.attributes.position;
    expect(g.userData.aragoniteR4.members).toHaveLength(3);
    const tops = [];
    for (const m of g.userData.aragoniteR4.members) {
      let lo = Infinity, hi = -Infinity;
      for (let i = m.first; i < m.first + m.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); }
      expect(lo).toBeCloseTo(-0.5, 6); tops.push(hi);
    }
    const height = Math.max(...tops) + 0.5;
    expect(height).toBeGreaterThanOrEqual(0.5);
    expect(height).toBeLessThanOrEqual(0.7);
    const crownFraction = (Math.max(...tops) - Math.min(...tops)) / height;
    expect(crownFraction).toBeGreaterThan(0.03);
    expect(crownFraction).toBeLessThan(0.12); // shallow steps, not a deep central notch
    expect(new Set(tops.map(v => v.toFixed(4))).size).toBe(3);
  });
  it('preserves the reciprocal-metric {110} face angle in every member', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin'), ns = g.attributes.normal;
    const angle = g.userData.aragoniteR4.angle;
    expect(angle * 180 / Math.PI).toBeGreaterThan(63);
    expect(angle * 180 / Math.PI).toBeLessThan(65);
    for (const m of g.userData.aragoniteR4.members) {
      let oblique = 0, roof = 0;
      for (let i = m.first; i < m.first + m.count; i++) {
        const x = ns.getX(i) * Math.cos(m.theta) + ns.getZ(i) * Math.sin(m.theta);
        const z = -ns.getX(i) * Math.sin(m.theta) + ns.getZ(i) * Math.cos(m.theta);
        if (Math.abs(x) > 1e-5 && Math.abs(z) > 1e-5) {
          expect(Math.abs(x / z)).toBeCloseTo(7.9641 / 4.9598, 5); oblique++;
        }
        if (ns.getY(i) > 1e-5 && Math.abs(z) > 1e-5) {
          expect(Math.abs(x)).toBeLessThan(1e-5);
          expect(Math.abs(ns.getY(i) / z)).toBeCloseTo(7.9641 / 5.7379, 5); roof++;
        }
      }
      expect(oblique).toBeGreaterThan(0);
      expect(roof).toBeGreaterThan(0);
    }
  });
  it('has outward winding, unit normals and a shared solid interior', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin'), p = g.attributes.position, ns = g.attributes.normal;
    for (let i = 0; i < p.count; i += 3) {
      const n = [ns.getX(i), ns.getY(i), ns.getZ(i)];
      expect(Math.hypot(...n)).toBeCloseTo(1, 6);
      // A substantial common core, not only a point contact: all four corners
      // of this internal square lie strictly inside every sector.
      const radius = 0.04 * g.userData.aragoniteR4.aspect;
      for (const x of [-radius, radius]) for (const z of [-radius, radius]) {
        expect(n[0]*(p.getX(i)-x)+n[1]*(p.getY(i)+0.25)+n[2]*(p.getZ(i)-z)).toBeGreaterThan(0.02 * g.userData.aragoniteR4.aspect);
      }
      const u = [p.getX(i+1)-p.getX(i),p.getY(i+1)-p.getY(i),p.getZ(i+1)-p.getZ(i)];
      const v = [p.getX(i+2)-p.getX(i),p.getY(i+2)-p.getY(i),p.getZ(i+2)-p.getZ(i)];
      expect((u[1]*v[2]-u[2]*v[1])*n[0]+(u[2]*v[0]-u[0]*v[2])*n[1]+(u[0]*v[1]-u[1]*v[0])*n[2]).toBeGreaterThan(0);
    }
  });
  it('removes faces buried inside another sector', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin'), p = g.attributes.position;
    const domains = g.userData.aragoniteR4.members;
    for (const m of domains) for (let i = m.first; i < m.first + m.count; i += 3) {
      const center = [0, 0, 0];
      for (let j = 0; j < 3; j++) {
        center[0] += p.getX(i+j)/3; center[1] += p.getY(i+j)/3; center[2] += p.getZ(i+j)/3;
      }
      for (const other of domains) if (other !== m) {
        expect(other.planes.some((f: any) => f.n[0]*center[0]+f.n[1]*center[1]+f.n[2]*center[2]-f.d >= -1e-7)).toBe(true);
      }
    }
  });
  it('encloses the union volume without doubled internal or missing basal faces', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin'), p = g.attributes.position;
    let volume = 0;
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i);
      const b = new THREE.Vector3().fromBufferAttribute(p, i+1);
      const c = new THREE.Vector3().fromBufferAttribute(p, i+2);
      volume += a.dot(b.cross(c))/6;
    }
    g.computeBoundingBox();
    const box = g.boundingBox, s = box.getSize(new THREE.Vector3()), steps = 30;
    let inside = 0;
    for (let x = 0; x < steps; x++) for (let y = 0; y < steps; y++) for (let z = 0; z < steps; z++) {
      const point = [box.min.x+s.x*(x+0.5)/steps, box.min.y+s.y*(y+0.5)/steps, box.min.z+s.z*(z+0.5)/steps];
      if (g.userData.aragoniteR4.members.some((m: any) => m.planes.every((f: any) =>
        f.n[0]*point[0]+f.n[1]*point[1]+f.n[2]*point[2] <= f.d))) inside++;
    }
    const sampled = inside * s.x*s.y*s.z / steps**3;
    expect(volume).toBeGreaterThan(0);
    expect(Math.abs(volume-sampled)/sampled).toBeLessThan(0.04);
  });
  it('reads as a compact body at the reviewed 8-by-5 record proportions', () => {
    const g = _buildHabitGeom('aragonite_pseudohex_twin');
    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3());
    const height = size.y, width = Math.max(size.x, size.z);
    expect(height / width).toBeLessThan(1.5);
    expect(height / width).toBeGreaterThan(0.8);
  });
  it('reaches the production mesh at different sizes without changing the scientific record', () => {
    for (const [id, length, width] of [[11, 4, 2], [29, 9, 6]]) {
      const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
      const crystal = new Crystal({ mineral: 'aragonite', habit: 'columnar', crystal_id: id, nucleation_step: 1 });
      Object.assign(crystal, { twinned: true, twin_law: 'cyclic_sextet', growth_environment: 'fluid',
        c_length_mm: length, a_width_mm: width, total_growth_um: length * 1000,
        wall_anchor: wall._anchorFromRingCell(6, 12) });
      const before = JSON.stringify([crystal.zones, crystal.c_length_mm, crystal.a_width_mm, crystal.twin_law]);
      const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
      _topoSyncCrystalMeshes(state, { crystals: [crystal], step: 100 }, wall);
      const bodies = state.crystals.children.filter((m: any) => m.geometry.userData.aragoniteR4);
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        expect(body.scale.x).toBe(body.scale.z);
        expect(body.scale.x).toBe(body.scale.y); // inclined termination faces stay metric too
      }
      expect(JSON.stringify([crystal.zones, crystal.c_length_mm, crystal.a_width_mm, crystal.twin_law])).toBe(before);
    }
  });
});
describe('aragonite-pseudohex-twin (99i) — _resolveCrystalGeomToken dispatch', () => {
  function mkAragonite(opts: Record<string, any> = {}) {
    return {
      crystal_id: 1,
      mineral: 'aragonite',
      habit: 'columnar',
      c_length_mm: 8,
      a_width_mm: 3,
      growth_environment: 'fluid',
      twinned: false,
      twin_law: '',
      ...opts,
    };
  }

  it('twinned aragonite + cyclic_sextet → "aragonite_pseudohex_twin"', () => {
    const c = mkAragonite({ twinned: true, twin_law: 'cyclic_sextet' });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_pseudohex_twin');
  });

  it('untwinned aragonite → canonical token (NOT twin)', () => {
    const c = mkAragonite({ twinned: false });
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_pseudohex_twin');
  });

  it('twinned aragonite with empty twin_law → canonical', () => {
    const c = mkAragonite({ twinned: true, twin_law: '' });
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_pseudohex_twin');
  });

  it('twinned aragonite with "contact" twin_law → canonical (different twin geometry)', () => {
    const c = mkAragonite({ twinned: true, twin_law: 'contact' });
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_pseudohex_twin');
  });

  it('twinned cerussite with cyclic_sextet → NOT aragonite twin (mineral-scoped)', () => {
    const c = { ...mkAragonite({ twinned: true, twin_law: 'cyclic_sextet' }), mineral: 'cerussite' };
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_pseudohex_twin');
  });

  // BUG-aragonite-twin-cave-morphology.md FIX: air-mode aragonite is
  // acicular frostwork REGARDLESS of twin structure. Real cave aragonite
  // (Hill & Forti 1997 §10; Frisia et al. 2002, Grotte de Clamouse)
  // grows as radiating needle sprays; the cyclic-sextet pseudo-hex twin
  // manifests as a 6-fold needle cluster, not a smooth column. The
  // air-mode override now fires above the twin branches and is
  // unconditional on twin state.
  it('twinned aragonite in air-mode cavity → frostwork (cave morphology beats twin column)', () => {
    const c = mkAragonite({
      twinned: true, twin_law: 'cyclic_sextet',
      growth_environment: 'air',
    });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_frostwork');
  });

  it('twinned aragonite in FLUID mode → pseudo-hex twin column (still correct)', () => {
    // Fluid-mode twinned aragonite (metamorphic, sea-floor cement,
    // hydrothermal vent) keeps the smooth pseudo-hex column — only the
    // air (cave) path diverts to frostwork.
    const c = mkAragonite({ twinned: true, twin_law: 'cyclic_sextet', growth_environment: 'fluid' });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_pseudohex_twin');
  });

  it('NON-twinned air-mode aragonite → frostwork (v156)', () => {
    const c = mkAragonite({
      twinned: false,
      growth_environment: 'air',
      habit: 'acicular_needle',
    });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_frostwork');
  });
});
