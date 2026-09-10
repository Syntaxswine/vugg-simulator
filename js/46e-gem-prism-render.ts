// R4f: ordinary topaz and apatite. Plane distances are display development,
// not growth-rate calibration. c is renderer Y; final scaling must be uniform.
// Topaz cell: Handbook of Mineralogy. Forms: Stern et al. (1986), Am. Min.
// 71:406-427, p.416, https://www.minsocam.org/ammin/AM71/AM71_406.pdf .
// Apatite uses the fluorapatite hexagonal endmember as a declared display
// reference, not a change to the simulation's generic apatite composition:
// https://www.handbookofmineralogy.org/pdfs/fluorapatite.pdf .
function gemPrismNormals(mineral: string, hkl: number[]): number[][] {
  if (mineral === 'topaz') return wulffOrthorhombicNormals(hkl, 4.6499, 8.7968, 8.3909);
  // 6/m: six rotations and horizontal reflection; no quartz r/z alternation.
  const seed = _wulffNorm([hkl[0] / 9.3973, hkl[2] / 6.8782,
    (hkl[0] + 2*hkl[1]) / (Math.sqrt(3)*9.3973)]);
  const out: number[][] = [], seen = new Set<string>();
  for (let k = 0; k < 6; k++) for (const sign of [-1, 1]) {
    const t = k*Math.PI/3, c = Math.cos(t), s = Math.sin(t);
    const n = [c*seed[0]-s*seed[2], sign*seed[1], s*seed[0]+c*seed[2]];
    const key = n.map(x => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(7)).join(',');
    if (!seen.has(key)) { seen.add(key); out.push(n); }
  }
  return out;
}

function gemPrismRenderFaces(mineral: string, ratio: number, variant = 0): any[] {
  const faces: any[] = [];
  const add = (hkl: number[], d: number, family: string) => {
    for (const n of gemPrismNormals(mineral, hkl)) faces.push({ n, d, family });
  };
  add([0, 0, 1], 0.5, '001');
  if (mineral === 'topaz') {
    add([1, 1, 0], 0.43*ratio, '110');
    add([1, 2, 0], 0.50*ratio, '120');
  } else add([1, 0, 0], 0.5*ratio, '100');
  const envelope = wulffPolyhedron(faces);
  const forms: any[] = mineral === 'topaz'
    ? [[[0, 1, 1], '011', variant % 2 === 0 ? 0.23 : 0.42],
      [[0, 2, 1], '021', 0.16], [[1, 1, 1], '111', 0.12]]
    : [[[1, 0, 1], '101', 0.22]];
  for (const [hkl, family, amount] of forms) {
    for (const n of gemPrismNormals(mineral, hkl)) {
      const support = Math.max(...envelope.vertices.map(v => n[0]*v[0]+n[1]*v[1]+n[2]*v[2]));
      // Bevel depth scales with width, with a height cap for tabular records.
      const depth = Math.min(0.36, ratio*amount);
      faces.push({ n, d: support-Math.abs(n[1])*depth, family });
    }
  }
  return faces;
}

function makeGemPrismRenderGeometry(mineral: string, ratio: number, attachFrac: number, variant = 0): any {
  const faces = gemPrismRenderFaces(mineral, ratio, variant);
  if (attachFrac > 0) faces.push({ n: [0, -1, 0],
    d: 0.5-Math.max(0.05, Math.min(0.95, attachFrac)), family: 'scar' });
  const poly = wulffPolyhedron(faces), geom = _wulffPolyToGeom(poly, 1);
  if (!geom) return null;
  const normals: number[] = [];
  for (const f of poly.faces) for (let i = 0; i < (f.verts.length-2)*3; i++) normals.push(...faces[f.plane].n);
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.userData.gemPrismR4 = { mineral, ratio, attachFrac, variant,
    families: poly.faces.map(f => faces[f.plane].family) };
  return geom;
}
