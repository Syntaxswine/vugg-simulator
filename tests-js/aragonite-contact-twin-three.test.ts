// tests-js/aragonite-contact-twin-three.test.ts — 99i parity for the
// aragonite contact {110} shared-c-axis variant.

import { describe, expect, it } from 'vitest';

declare const _resolveCrystalGeomToken: any;
declare const _buildHabitGeom: any;
declare const _CLUSTER_PATTERNS: any;

describe('aragonite-contact-twin (99i) — geometry builder', () => {
  it('_buildHabitGeom("aragonite_contact_twin") returns a BufferGeometry', () => {
    const geom = _buildHabitGeom('aragonite_contact_twin');
    expect(geom).toBeTruthy();
    expect(geom.attributes.position).toBeTruthy();
  });

  it('has two adjoining metric domains', () => {
    const geom = _buildHabitGeom('aragonite_contact_twin');
    expect(geom.userData.aragoniteR4.members).toHaveLength(2);
    expect(geom.attributes.position.count).toBeGreaterThan(72);
  });

  it('preserves the rooted compact body and shallow stepped caps', () => {
    const geom = _buildHabitGeom('aragonite_contact_twin');
    const p = geom.attributes.position.array;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < p.length; i += 3) {
      if (p[i] < minY) minY = p[i];
      if (p[i] > maxY) maxY = p[i];
    }
    expect(maxY).toBeCloseTo(0.1, 6);
    expect(minY).toBeCloseTo(-0.5, 6);
  });

  it('uses the repeated {110} orientation about a shared vertical c-axis', () => {
    const geom = _buildHabitGeom('aragonite_contact_twin');
    const p = geom.attributes.position.array;
    let maxAbsZ = 0;
    for (let i = 0; i < p.length; i += 3) {
      if (Math.abs(p[i + 2]) > maxAbsZ) maxAbsZ = Math.abs(p[i + 2]);
    }
    expect(maxAbsZ).toBeGreaterThan(0.1);
    const members = geom.userData.aragoniteR4.members;
    expect(members[1].theta * 180 / Math.PI).toBeCloseTo(116.1732, 3);
    for (const m of members) expect(m.planes.some((f: any) => f.n[1] === 1 && f.n[0] === 0 && f.n[2] === 0)).toBe(true);
  });
});

describe('aragonite-contact-twin (99i) — dispatch + cluster', () => {
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

  it('twinned aragonite + contact → "aragonite_contact_twin"', () => {
    const c = mkAragonite({ twinned: true, twin_law: 'contact' });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_contact_twin');
  });

  it('twinned aragonite + cyclic_sextet → pseudohex token (NOT contact)', () => {
    const c = mkAragonite({ twinned: true, twin_law: 'cyclic_sextet' });
    expect(_resolveCrystalGeomToken(c, c.habit)).toBe('aragonite_pseudohex_twin');
  });

  it('untwinned aragonite → canonical (NOT contact twin)', () => {
    const c = mkAragonite({ twinned: false });
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_contact_twin');
  });

  it('twinned cerussite with contact law → NOT aragonite twin (mineral-scoped)', () => {
    const c = { ...mkAragonite({ twinned: true, twin_law: 'contact' }), mineral: 'cerussite' };
    expect(_resolveCrystalGeomToken(c, c.habit)).not.toBe('aragonite_contact_twin');
  });

  it('cluster pattern → prism (countScale > 0)', () => {
    expect(_CLUSTER_PATTERNS.aragonite_contact_twin).toBe(_CLUSTER_PATTERNS.prism);
    expect(_CLUSTER_PATTERNS.aragonite_contact_twin.countScale).toBeGreaterThan(0);
  });
});
