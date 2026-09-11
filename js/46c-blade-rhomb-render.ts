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

function bladeRhombRenderFaces(mineral: string, token: string, widthRatio = 0.5, development = 1, endBias = 1): any[] {
  if (mineral === 'dolomite') return dolomiteRenderNormals().map(n => ({ n, d: 1, family: '104' }));
  // Develop an elongated lamella, including the exposed portion of an attached
  // half-form. The old 0.9-wide tablet became an equant block above its scar.
  // Change plane distances, never stretch the finished crystallographic angles.
  const width = Math.max(0.06, Math.min(token === 'tablet' ? 0.14 : 0.10, widthRatio * 0.20)) * development;
  // The basal development is a compact intergrowth of short lamellae, with
  // enough depth for crossing blades to disappear into a common solid center.
  const thickness = width * (token === 'tablet' ? 0.10 : 0.14) * (development >= 3 ? 4 : 1);
  const faces: any[] = [];
  for (const [hkl, family] of [[[0, 1, 0], '010'], [[1, 2, 0], '120'],
    [[-1, 1, 1], '-111'], [[0, 1, 1], '011']] as any[]) {
    for (const n of gypsumRenderNormals(hkl)) {
      const d = family === '010' ? thickness / 2
        : family === '120' ? Math.abs(n[0]) * width / 2 + Math.abs(n[2]) * thickness * 0.15
        : Math.abs(n[1]) * 0.5 * (family === '-111' ? endBias : 1);
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
  attachFrac: number, development = 1, endBias = 1): any {
  const faces = bladeRhombRenderFaces(mineral, token, widthRatio, development, endBias);
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
  geom.userData.bladeRhombR4 = { mineral, token, widthRatio, attachFrac, development, endBias,
    families: poly.faces.map((f: any) => faces[f.plane].family) };
  if (mineral !== 'dolomite') gypsumCleavageHeight(geom, attachFrac);
  return geom;
}

function gypsumCleavageHeight(geom: any, attachFrac: number): void {
  const pos = geom.attributes.position, values = [];
  const root = attachFrac > 0 ? Math.max(0.05, Math.min(0.95, attachFrac)) - 0.5 : -0.5;
  for (let i = 0; i < pos.count; i++) values.push(Math.max(0, Math.min(1, (pos.getY(i) - root) / (0.5 - root))));
  geom.setAttribute('gypsumHeight', new THREE.Float32BufferAttribute(values, 1));
}

// Split gypsum retains tabular subindividuals. A rosette is an arrangement of
// monoclinic plates, not a rounded botryoidal body (Handbook, gypsum.pdf).
// All members cross a shared interior; transforms and sector colours are
// representative display development, not new crystals or growth records.
function makeGypsumSplitAggregate(index: number, rose: boolean, hourglass: any = null): any {
  const positions:number[]=[], normals:number[]=[], colors:number[]=[], heights:number[]=[], members:any[]=[];
  const body=new THREE.Color('#e8e2d4'), sand=new THREE.Color('#c89a5b');
  const intensity=Math.max(0,Math.min(1,Number(hourglass?.intensity)||0));
  const spread=rose ? 1.3 : 0.25 + Math.max(0,Math.min(1,(index-0.25)/0.6))*0.95;
  for(let i=0;i<11;i++) {
    const faces=bladeRhombRenderFaces('gypsum','tablet',0.9,3.2,0.88+(i%3)*0.1);
    // The ordinary development>=3 route thickens the basal join; a rose needs
    // thin exposed petals throughout, while still intersecting at its center.
    for(const f of faces)if(f.family==='010')f.d/=4;
    const poly=wulffPolyhedron(faces);
    const yaw=i*2.3999632297+(i%3)*0.13;
    const tilt=(i===0 ? 0.15 : spread*(0.65+(i%4)*0.12));
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, (i%3-1)*0.18,'YXZ'));
    const scale=0.67+((i*7)%11)*0.032;
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(),q,new THREE.Vector3(scale,scale,scale));
    members.push({matrix:matrix.toArray(),faces:faces.map(f=>({n:f.n,d:f.d}))});
    for(const f of poly.faces)for(let k=1;k<f.verts.length-1;k++)for(const vi of [f.verts[0],f.verts[k],f.verts[k+1]]) {
      const local=new THREE.Vector3(...poly.vertices[vi]);
      positions.push(...local.clone().applyMatrix4(matrix).toArray());
      normals.push(...new THREE.Vector3(...faces[f.plane].n).applyQuaternion(q).toArray());
      heights.push(local.y+0.5);
      const sector=hourglass ? (hourglass.flooded ? 0.8 : Math.max(0,Math.min(1,(Math.abs(local.y)-Math.abs(local.x)*0.65)*4))*intensity) : 0;
      colors.push(...body.clone().lerp(sand,sector).toArray());
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('gypsumHeight',new THREE.Float32BufferAttribute(heights,1));
  geometry.computeBoundingBox();
  const size=geometry.boundingBox.getSize(new THREE.Vector3()), s=1/Math.max(size.x,size.y,size.z);
  const shift=-0.5-geometry.boundingBox.min.y*s;
  geometry.scale(s,s,s);geometry.translate(0,shift,0);
  const normalization=new THREE.Matrix4().makeScale(s,s,s);normalization.setPosition(0,shift,0);
  for(const member of members)member.matrix=normalization.clone().multiply(new THREE.Matrix4().fromArray(member.matrix)).toArray();
  geometry.userData.gypsumSplitR4={index,rose,members,hourglass:!!hourglass};
  return geometry;
}

// A few related subgroups, not a coplanar hand fan or independent random sticks.
// Layout is representative rendering, keyed only by identity; no simulation RNG.
function makeGypsumTwinRenderGeometry(): any {
  // Retain the existing display twin's 60-degree separation, now using the
  // same monoclinic plates as ordinary selenite instead of rectangular boxes.
  const positions:number[]=[],normals:number[]=[],heights:number[]=[];
  const faces=bladeRhombRenderFaces('gypsum','tablet',0.9,3.2);
  for(const f of faces)if(f.family==='010')f.d/=4;
  const poly=wulffPolyhedron(faces);
  for(const sign of [-1,1]) {
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),sign*Math.PI/6);
    for(const f of poly.faces)for(let k=1;k<f.verts.length-1;k++)for(const vi of [f.verts[0],f.verts[k],f.verts[k+1]]) {
      const p=new THREE.Vector3(...poly.vertices[vi]);
      heights.push(p.y+0.5);
      p.y+=0.26;p.applyQuaternion(q);
      positions.push(...p.toArray());
      normals.push(...new THREE.Vector3(...faces[f.plane].n).applyQuaternion(q).toArray());
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('gypsumHeight',new THREE.Float32BufferAttribute(heights,1));
  return g;
}

function gypsumSprayMember(crystalId: number, index: number): any {
  const group = index >= 6 ? (index - 6) % 3 : Math.floor(index / 2);
  const common = _clusterRand(crystalId * 0x45d9f3b + group * 0x9e3779b9);
  const local = _clusterRand(crystalId * 0x27d4eb2d + (index + 1) * 0x85ebca6b);
  return {
    group,
    basal: index >= 6,
    burial: index >= 6 ? 0.5 : 0.38 + local() * 0.24,
    scale: [0.91, 0.53, 0.76, 0.38, 0.64, 0.46][index % 6] * (0.90 + local() * 0.18),
    width: 0.90 + local() * 0.70,
    endBias: Math.round((0.82 + local() * 0.36) * 20) / 20,
    tilt: index >= 6 ? 0.3 + local() * 0.2
      : [0.50, 1.05, 1.35][group] + (index % 2) * 0.35 + (common() - 0.5) * 0.10 + (local() - 0.5) * 0.08,
    azimuth: [0.10, 2.25, 4.50][group] + (index % 2) * 0.65 + (common() - 0.5) * 0.40 + (local() - 0.5) * 0.14,
    root: [(group - 1) * 0.018 + (local() - 0.5) * 0.012,
      -0.018, (local() - 0.5) * 0.014],
  };
}

// Representative optical veils along c, not simulated inclusions or growth
// records. {010} cleavage faces have a pearly lustre (Handbook of Mineralogy).
// Keep the existing optics tier and cavity clipping; edges remain clearer.
function applyGypsumCleavage(material: any): void {
  // Alpha sheets must accumulate through their intergrowth, rather than the
  // first translucent face writing depth and erasing all blades behind it.
  if (material.transparent) material.depthWrite = false;
  const previous = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => cacheKey() + '|gypsum-cleavage-r4c';
  material.userData.gypsumCleavage = { representation: 'lengthwise-optical-veil' };
  material.onBeforeCompile = (shader: any) => {
    previous.call(material, shader);
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float gypsumHeight;\nvarying float vGypsumHeight;\nvarying vec3 vGypsumLocal;\nvarying float vGypsumBroad;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvGypsumHeight = gypsumHeight;\nvGypsumLocal = position;\nvGypsumBroad = step(0.99, abs(normal.z));');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vGypsumHeight;\nvarying vec3 vGypsumLocal;\nvarying float vGypsumBroad;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float gx = vGypsumLocal.x;
      float resolved = 1.0 - smoothstep(0.002, 0.008, fwidth(gx));
      float veil = smoothstep(0.25, 0.85,
        0.5 + 0.27 * sin(gx * 173.0 + 0.8 * sin(vGypsumLocal.y * 5.0))
        + 0.18 * sin(gx * 419.0 + vGypsumLocal.y * 2.0));
      veil *= vGypsumBroad * resolved;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.96, 0.94), veil * 0.12);
      diffuseColor.a *= mix(0.78, 1.0 + veil * 0.18, vGypsumBroad);
      // Subtle representative matrix staining at the roots; no new deposit claim.
      float rootWarmth = exp(-vGypsumHeight * 5.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.46, 0.31, 0.17), rootWarmth * 0.40);
      diffuseColor.a = mix(diffuseColor.a, 0.72, rootWarmth * 0.55);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.34 + veil * 0.12, vGypsumBroad);');
  };
}
