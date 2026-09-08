// R4c: gypsum/selenite blades and ordinary dolomite rhombs, render-only.
// Gypsum: De Jong/Bouman C2/c morphological setting (a=5.63, b=15.201,
// c=6.23 Å, beta=113.80 deg), as used by Aquilano et al. (2022),
// https://doi.org/10.1039/D2CE00508E . Do not mix these indices with
// the Handbook's alternative I2/a cell. Forms: {010}, {120}, {-111}, {011}.
// Dolomite: -3, a=4.812, c=16.020 Å; {10-14} in the structural hexagonal cell.
// https://www.handbookofmineralogy.org/pdfs/dolomite.pdf
// Distances below are representative habit development, not measured kinetics.

function gypsumRenderNormals(hkl: number[]): number[][] {
  const beta = 113.8 * Math.PI / 180, cb = Math.cos(beta), sb = Math.sin(beta);
  // The generic monoclinic kernel puts b on Y. Rotate rigidly so c is Y
  // and b is -Z: gypsum's long blade points along the renderer's growth axis.
  return wulffMonoclinicNormals(hkl, 5.63, 15.201, 6.23, 113.8).map((n: number[]) =>
    [sb * n[0] - cb * n[2], cb * n[0] + sb * n[2], -n[1]]);
}

function dolomiteRenderNormals(): number[][] {
  // C3 plus inversion only: no calcite C2/mirror operators in dolomite's -3.
  const seed = _wulffNorm([1 / 4.812, 4 / 16.020, 1 / (4.812 * Math.sqrt(3))]);
  const normals: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const angle = i * 2 * Math.PI / 3, c = Math.cos(angle), s = Math.sin(angle);
    const n = [c * seed[0] + s * seed[2], seed[1], -s * seed[0] + c * seed[2]];
    normals.push(n, n.map(v => -v));
  }
  return normals;
}

function bladeRhombRenderFaces(mineral: string, token: string, widthRatio = 0.5): any[] {
  if (mineral === 'dolomite') return dolomiteRenderNormals().map(n => ({ n, d: 1, family: '104' }));
  const width = Math.max(0.25, Math.min(token === 'tablet' ? 0.9 : 0.6, widthRatio));
  const thickness = width * (token === 'tablet' ? 0.22 : 0.40);
  const faces: any[] = [];
  for (const [hkl, family] of [[[0, 1, 0], '010'], [[1, 2, 0], '120'],
    [[-1, 1, 1], '-111'], [[0, 1, 1], '011']] as any[]) {
    for (const n of gypsumRenderNormals(hkl)) {
      const d = family === '010' ? thickness / 2
        : family === '120' ? Math.abs(n[0]) * width / 2 + Math.abs(n[2]) * thickness * 0.15
        : Math.abs(n[1]) * 0.5;
      faces.push({ n, d, family });
    }
  }
  return faces;
}

let _dolomiteR4Radius: number | null = null;
function dolomiteRenderRadius(): number {
  if (_dolomiteR4Radius == null) {
    const poly = wulffPolyhedron(bladeRhombRenderFaces('dolomite', 'rhomb'));
    const ymax = Math.max(...poly.vertices.map((v: number[]) => v[1]));
    _dolomiteR4Radius = Math.max(...poly.vertices.map((v: number[]) => Math.hypot(...v))) * 0.5 / ymax;
  }
  return _dolomiteR4Radius;
}

function makeBladeRhombRenderGeometry(mineral: string, token: string, widthRatio: number,
  attachFrac: number): any {
  const faces = bladeRhombRenderFaces(mineral, token, widthRatio);
  const full = wulffPolyhedron(faces);
  if (!full || full.vertices.length < 4) return null;
  const ymax = Math.max(...full.vertices.map((v: number[]) => v[1]));
  if (!(ymax > 1e-9)) return null;
  // Both forms are centrosymmetric. Normalize by their growth-axis extent,
  // so uniform cLen scaling and the existing anchor offset agree exactly.
  const scale = 0.5 / ymax;
  let poly = full;
  if (attachFrac > 0) {
    const f = Math.max(0.05, Math.min(0.95, attachFrac));
    faces.push({ n: [0, -1, 0], d: ymax * (1 - 2 * f), family: 'scar' });
    poly = wulffPolyhedron(faces);
  }
  if (!poly || poly.vertices.length < 4) return null;
  const geom = _wulffPolyToGeom(poly, scale);
  if (!geom) return null;
  const normals: number[] = [];
  for (const f of poly.faces) for (let i = 0; i < (f.verts.length - 2) * 3; i++) normals.push(...faces[f.plane].n);
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.userData.bladeRhombR4 = { mineral, token, widthRatio, attachFrac,
    families: poly.faces.map((f: any) => faces[f.plane].family) };
  return geom;
}
