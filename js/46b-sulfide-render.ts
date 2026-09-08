// R4b sulfide forms. Handbook of Mineralogy: sphalerite (-43m), pyrite (m-3).
// https://www.handbookofmineralogy.org/pdfs/sphalerite.pdf
// https://www.handbookofmineralogy.org/pdfs/pyrite.pdf
// Fixed cubic lattice normals; central distances are representative render
// choices, not calibrated growth rates. No scientific state or RNG changes.
function pyritePyritohedronNormals(): number[][] {
  const normals: number[][] = [];
  // Th has cyclic permutations, not all permutations: {210} has TWELVE faces.
  // The other twelve in the full cubic orbit belong to the distinct {120} form.
  for (const seed of [[2, 1, 0], [0, 2, 1], [1, 0, 2]]) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      let i = 0;
      normals.push(_wulffNorm(seed.map(v => v === 0 ? 0 : v * (++i === 1 ? a : b))));
    }
  }
  return normals;
}

function sulfideRenderFaces(mineral: string, token: string, variant = 0): any[] {
  const faces: any[] = [];
  const spread = Math.max(0, Math.min(7, variant)) / 7;
  const add = (ns: number[][], d: number, family: string) => {
    for (const n of ns) faces.push({ n, d, family });
  };
  if (mineral === 'sphalerite') {
    const tetra = token === 'tetrahedron';
    const oct = wulffCubicNormals([1, 1, 1]);
    add(oct.filter(n => n[0] * n[1] * n[2] > 0), tetra ? 0.67 + spread * 0.06 : 1.02, '111+');
    add(oct.filter(n => n[0] * n[1] * n[2] < 0), tetra ? 1.08 + spread * 0.08 : 1.12, '111-');
    add(wulffCubicNormals([1, 1, 0]), tetra ? 1.0 : 0.85 + spread * 0.04, '110');
  } else if (mineral === 'pyrite') {
    const cube = token === 'cube', oct = token === 'octahedron';
    add(wulffCubicNormals([1, 0, 0]), cube ? 1 : oct ? 1.45 : 1.04 + spread * 0.04, '100');
    add(pyritePyritohedronNormals(), cube ? 1.27 + spread * 0.03 : oct ? 1.38 : 1, '210');
    add(wulffCubicNormals([1, 1, 1]), cube ? 1.60 : oct ? 1 : 1.23 + spread * 0.03, '111');
  }
  return faces;
}

// Gradient direction across grooves. Their traces on {100} follow the adjacent
// {210} faces; adjacent cube faces therefore change direction with Th symmetry.
function pyriteGrooveGradient(face: any): number[] {
  const n = face.n;
  if (face.family === '100') {
    if (Math.abs(n[0]) > 0.9) return [0, 1, 0];
    if (Math.abs(n[1]) > 0.9) return [0, 0, 1];
    return [1, 0, 0];
  }
  if (face.family === '210') {
    if (Math.abs(n[2]) < 1e-8) return [-n[1], n[0], 0];
    if (Math.abs(n[0]) < 1e-8) return [0, -n[2], n[1]];
    return [n[2], 0, -n[0]];
  }
  return [0, 0, 0]; // octahedral faces and attachment scars stay unstriated
}

function makeSulfideRenderGeometry(mineral: string, token: string, variant: number,
  attachFrac: number, cutAtNucleus: boolean): any {
  const faces = sulfideRenderFaces(mineral, token, variant);
  const full = wulffPolyhedron(faces);
  if (!full || full.vertices.length < 4) return null;
  const extent = Math.max(...full.vertices.flat().map(Math.abs));
  if (!(extent > 1e-9)) return null;
  let poly = full;
  if (attachFrac > 0) {
    const ymin = Math.min(...full.vertices.map((v: number[]) => v[1]));
    const ymax = Math.max(...full.vertices.map((v: number[]) => v[1]));
    const f = Math.max(0.05, Math.min(0.95, attachFrac));
    const cut = cutAtNucleus ? 0 : ymin + f * (ymax - ymin);
    faces.push({ n: [0, -1, 0], d: -cut, family: 'scar' });
    poly = wulffPolyhedron(faces);
  }
  if (!poly || poly.vertices.length < 4) return null;
  const geom = _wulffPolyToGeom(poly, 0.5 / extent);
  if (!geom) return null;
  const grooves: number[] = [], normals: number[] = [];
  for (const f of poly.faces) {
    const g = mineral === 'pyrite' ? pyriteGrooveGradient(faces[f.plane]) : [0, 0, 0];
    for (let i = 0; i < (f.verts.length - 2) * 3; i++) {
      grooves.push(...g);
      // Use the exact plane normal: Float32 cross products lose precision on
      // narrow slivers where an attachment cut almost meets an existing edge.
      normals.push(...faces[f.plane].n);
    }
  }
  geom.setAttribute('sulfideGroove', new THREE.Float32BufferAttribute(grooves, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.userData.sulfideR4 = { mineral, token, variant, attachFrac,
    families: poly.faces.map((f: any) => faces[f.plane].family) };
  return geom;
}

// O2 contact clipping rebuilds triangles and drops custom attributes. Restore
// only surviving growth faces; the contact-material group gets zero relief.
function transferSulfideGrooves(source: any, clipped: any): void {
  const sourceNormals = source.attributes.normal, sourceGrooves = source.attributes.sulfideGroove;
  const targetNormals = clipped.attributes.normal;
  const grooves = new Float32Array(targetNormals.count * 3);
  for (const group of clipped.groups) {
    if (group.materialIndex !== 0) continue;
    for (let i = group.start; i < group.start + group.count; i++) {
      for (let j = 0; j < sourceNormals.count; j += 3) {
        const dot = targetNormals.getX(i) * sourceNormals.getX(j)
          + targetNormals.getY(i) * sourceNormals.getY(j) + targetNormals.getZ(i) * sourceNormals.getZ(j);
        if (dot > 1 - 1e-6) {
          grooves.set([sourceGrooves.getX(j), sourceGrooves.getY(j), sourceGrooves.getZ(j)], i * 3);
          break;
        }
      }
    }
  }
  clipped.setAttribute('sulfideGroove', new THREE.Float32BufferAttribute(grooves, 3));
  clipped.userData.sulfideR4 = source.userData.sulfideR4;
}

function applyPyriteStriations(material: any): void {
  const previous = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => cacheKey() + '|pyrite-striations-r4b';
  material.userData.pyriteStriations = { pitch_mm: 0.08 };
  material.onBeforeCompile = (shader: any) => {
    previous.call(material, shader);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 sulfideGroove;
      varying float vPyriteAcross;
      varying float vPyriteGrooved;`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vPyriteAcross = dot(position, sulfideGroove) * length(modelMatrix[1].xyz);
      vPyriteGrooved = dot(sulfideGroove, sulfideGroove);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying float vPyriteAcross;
      varying float vPyriteGrooved;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (vPyriteGrooved > 0.9) {
        float x = vPyriteAcross;
        float footprint = max(fwidth(x), 0.0001);
        float resolved = 1.0 - smoothstep(0.015, 0.05, footprint);
        float phase = x * 78.539816 + 0.45 * sin(x * 5.3);
        float slope = (0.006 * sin(phase) + 0.0015 * sin(phase * 2.37)) * resolved;
        vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
        vec3 rx = cross(dy, normal), ry = cross(normal, dx);
        float determinant = dot(dx, rx);
        if (abs(determinant) > 1e-12) {
          vec3 gradient = (rx * dFdx(x) + ry * dFdy(x)) / determinant;
          normal = normalize(normal - slope * gradient);
        }
      }`);
  };
}
