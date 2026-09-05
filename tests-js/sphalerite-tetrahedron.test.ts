import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Visual-realism review 2026-09-04, finding F3: the cubic minerals whose habit strings fell
// to the default 'prism' token rendered as HEXAGONAL prisms — sphalerite 'tetrahedral'
// above all (tn457 / elmwood honey sphalerite drawn as six-sided columns). This pins the
// tetrahedron token, its builder, and the isometric gates it must pass through.

declare const _habitGeomToken: any;
declare const _buildHabitGeom: any;
declare const _GEOM_TOKEN_RATIO: any;
declare const _O2_CONVEX_TOKENS: any;
declare const _CLUSTER_PATTERNS: any;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sphalerite tetrahedron (review 2026-09-04, F3)', () => {
  it('routes the hemihedral-cubic habits to the tetrahedron token', () => {
    for (const h of ['tetrahedral', 'tetrahedral_or_massive', 'disphenoidal_{112}', 'disphenoidal']) {
      expect(_habitGeomToken(h)).toBe('tetrahedron');
    }
  });

  it('routes cubic-named habits to the cube and keeps the pyritohedral family on the dodecahedron', () => {
    for (const h of ['cubic_high_T', 'cubic_galena_structure', 'cubo_octahedral', 'pseudo_cubic', 'cubic_striated']) {
      expect(_habitGeomToken(h)).toBe('cube');
    }
    expect(_habitGeomToken('equant_octahedral')).toBe('octahedron');
    for (const h of ['cubo-pyritohedral', 'cubic_or_pyritohedral', 'pyritohedral']) {
      expect(_habitGeomToken(h)).toBe('dodecahedron');
    }
    // the untouched routes stay put
    expect(_habitGeomToken('cubic')).toBe('cube');
    expect(_habitGeomToken('prismatic')).toBe('prism');
    expect(_habitGeomToken('scalenohedral')).toBe('scalene');
  });

  it('builds a face-attached regular tetrahedron spanning y = -0.5 .. +0.5', () => {
    const geom = _buildHabitGeom('tetrahedron');
    const pos = geom.getAttribute('position');
    expect(pos.count).toBe(12);   // 4 faces × 3 non-indexed vertices (flat shading)
    let minY = Infinity, maxY = -Infinity, maxR = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      maxR = Math.max(maxR, Math.hypot(x, z));
    }
    // Float32 attribute storage: 6 decimals is the honest precision.
    expect(minY).toBeCloseTo(-0.5, 6);
    expect(maxY).toBeCloseTo(0.5, 6);
    expect(maxR).toBeCloseTo(Math.sqrt(2) / 2, 6);   // regular: edge = √1.5 × height
    // every face normal points away from the centroid (outward winding)
    const nrm = geom.getAttribute('normal');
    for (let f = 0; f < 4; f++) {
      const i = f * 3;
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const dot = cx * nrm.getX(i) + cy * nrm.getY(i) + cz * nrm.getZ(i);
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('is isometric to every gate that treats cubes and octahedra uniformly', () => {
    expect(_GEOM_TOKEN_RATIO.tetrahedron).toBe(1.0);
    expect(_O2_CONVEX_TOKENS.has('tetrahedron')).toBe(true);
    expect(_CLUSTER_PATTERNS.tetrahedron).toBeTruthy();
    const source = fs.readFileSync(path.join(ROOT, 'js/99i-renderer-three.ts'), 'utf8');
    // the uniform-scale branch, the satellite scale branch, and the two half-form equant gates
    const gates = source.match(/token === 'octahedron' \|\| token === 'tetrahedron'|geomToken === 'octahedron' \|\| geomToken === 'tetrahedron'/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(4);
  });
});
