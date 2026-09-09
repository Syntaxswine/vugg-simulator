// R4d ordinary barite. Cell uses the existing structural/Wulff convention.
// Habit-dependent plane distances are representative face development, not new
// growth kinetics. HOM: baryte.pdf, {001}, {210}, {101}, {011} and diverse habits.
function bariteRenderFaces(habit: string): any[] {
  const prismatic = habit === 'prismatic';
  const width = habit === 'tabular' ? 0.78 : prismatic ? 0.48 : 0.30;
  const thickness = habit === 'tabular' ? 0.18 : prismatic ? 0.40 : 0.075;
  const faces: any[] = [];
  for (const [hkl, family] of [[[1, 0, 0], '100'], [[0, 1, 0], '010'], [[0, 0, 1], '001'],
    [[2, 1, 0], '210'], [[1, 0, 1], '101'], [[0, 1, 1], '011']] as any[]) {
    for (const raw of wulffOrthorhombicNormals(hkl, 8.879, 5.450, 7.152)) {
      // Plates stand along b; prisms retain c along Y. Both are rigid frames.
      const n = prismatic ? raw : [raw[0], raw[2], raw[1]];
      const support = Math.abs(n[0]) * width / 2 + Math.abs(n[1]) * 0.5 + Math.abs(n[2]) * thickness / 2;
      const bevel = family.length === 3 && hkl.filter((v: number) => v !== 0).length > 1;
      faces.push({ n, d: support * (bevel ? (family === '210' && !prismatic ? 0.87 : 0.94) : 1), family });
    }
  }
  return faces;
}

function makeBariteRenderGeometry(habit: string, attachFrac: number): any {
  const faces = bariteRenderFaces(habit);
  const full = wulffPolyhedron(faces);
  if (!full || full.vertices.length < 4) return null;
  const ymax = Math.max(...full.vertices.map((v: number[]) => v[1]));
  if (attachFrac > 0) faces.push({ n: [0, -1, 0], d: ymax * (1 - 2 * attachFrac), family: 'scar' });
  const poly = attachFrac > 0 ? wulffPolyhedron(faces) : full;
  if (!poly || poly.vertices.length < 4) return null;
  const geom = _wulffPolyToGeom(poly, 0.5 / ymax);
  if (!geom) return null;
  const normals: number[] = [];
  for (const f of poly.faces) for (let i = 0; i < (f.verts.length - 2) * 3; i++) normals.push(...faces[f.plane].n);
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.userData.bariteR4 = { habit, attachFrac, frame: habit === 'prismatic' ? 'c-on-Y' : 'b-on-Y',
    families: poly.faces.map((f: any) => faces[f.plane].family) };
  return geom;
}

function bariteCrestMember(crystalId: number, index: number, count: number): any {
  const rand = _clusterRand(crystalId * 0x45d9f3b + (index + 1) * 0x27d4eb2d);
  const along = (index - (count - 1) / 2);
  return { x: along * 0.11, y: 0.015 + rand() * 0.06,
    scale: 0.75 + rand() * 0.65, lean: along * 0.13 + (rand() - 0.5) * 0.06,
    roll: (rand() - 0.5) * 0.12 };
}
