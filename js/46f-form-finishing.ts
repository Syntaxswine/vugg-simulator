// R4: curved wire is an aggregate habit, not a hexagonal crystal prism.
function makeNativeSilverWireGeometry(): any {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.45, 0), new THREE.Vector3(0.08, -0.15, 0.04),
    new THREE.Vector3(-0.09, 0.12, 0), new THREE.Vector3(0.05, 0.38, -0.03),
    new THREE.Vector3(0.18, 0.34, 0.02),
  ]);
  const tube = new THREE.TubeGeometry(curve, 24, 0.045, 10, false);
  const flat = tube.toNonIndexed();
  const positions = Array.from(flat.attributes.position.array) as number[];
  const normals = Array.from(flat.attributes.normal.array) as number[];
  for (const end of [0, 1]) {
    const center = curve.getPointAt(end), normal = curve.getTangentAt(end).multiplyScalar(end ? 1 : -1);
    const start = end ? 24*11 : 0;
    for (let i = 0; i < 10; i++) {
      let a = new THREE.Vector3().fromBufferAttribute(tube.attributes.position, start+i);
      let b = new THREE.Vector3().fromBufferAttribute(tube.attributes.position, start+i+1);
      if (a.clone().sub(center).cross(b.clone().sub(center)).dot(normal) < 0) [a,b] = [b,a];
      for (const p of [center,a,b]) { positions.push(p.x,p.y,p.z); normals.push(normal.x,normal.y,normal.z); }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.userData.nativeWire = true;
  tube.dispose(); flat.dispose();
  return geom;
}

// A representative fibre bundle has parallel-sided strands and staggered ends.
// The surface-fabric transform supplies its footprint; these display filaments
// are not additional nucleation records or a count of microscopic fibres.
function makeSurfaceFiberBundleGeometry(): any {
  const positions: number[] = [], normals: number[] = [];
  for (let i=0;i<9;i++) {
    const length = 0.78 + 0.22 * ((i * 5) % 9) / 8;
    const indexed = new THREE.CylinderGeometry(0.09,0.09,length,4,1,false);
    const strand = indexed.toNonIndexed();
    const x = (i % 3 - 1) * 0.3, z = (Math.floor(i / 3) - 1) * 0.3;
    for(let j=0;j<strand.attributes.position.count;j++) {
      positions.push(strand.attributes.position.getX(j)+x,
        strand.attributes.position.getY(j),strand.attributes.position.getZ(j)+z);
      normals.push(strand.attributes.normal.getX(j),strand.attributes.normal.getY(j),strand.attributes.normal.getZ(j));
    }
    strand.dispose(); indexed.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.userData.surfaceFiberR4 = { filaments:9, parallelSides:true };
  return geometry;
}

// A split acicular aggregate retains slender prismatic subindividuals. Its
// earned split index controls angular spread, rather than changing needles
// into the broad blades of the former universal hemimorphite fan.
function makeSplitNeedleGeometry(system: string, index: number, radial: boolean): any {
  const raw=_makeSystemPrism(system), source=chamferCrystalGeometry(raw), positions:number[]=[], normals:number[]=[];
  const p=source.attributes.position,n=source.attributes.normal;
  const spread=radial ? 2.5 : 0.12+Math.max(0,Math.min(1,(index-0.25)/0.6))*0.75;
  for(let i=0;i<19;i++) {
    const azimuth=i*2.3999632297, tilt=spread*Math.sqrt(i/18);
    const axis=new THREE.Vector3(Math.sin(tilt)*Math.cos(azimuth),Math.cos(tilt),Math.sin(tilt)*Math.sin(azimuth));
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
    const length=0.65+((i*7)%19)/18*0.35, width=0.025+((i*3)%7)*0.003;
    const matrix=new THREE.Matrix4().compose(axis.clone().multiplyScalar(length*0.18),q,new THREE.Vector3(width,length,width));
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    for(let j=0;j<p.count;j++) {
      positions.push(...new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix).toArray());
      normals.push(...new THREE.Vector3().fromBufferAttribute(n,j).applyMatrix3(normalMatrix).normalize().toArray());
    }
  }
  source.dispose(); if(source!==raw)raw.dispose();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.computeBoundingBox();
  const span=geometry.boundingBox.max.y-geometry.boundingBox.min.y;
  const shift=-0.5-geometry.boundingBox.min.y/span;
  geometry.scale(1/span,1/span,1/span);geometry.translate(0,shift,0);
  geometry.userData.splitNeedleR4={system,index,radial,members:19};
  return geometry;
}

// Low-amplitude vicinal relief on faceted bodies. This is a filtered display
// texture, not a new growth record. No silhouette, picking or volume changes.
function applyCrystalFaceRelief(material: any): void {
  if (material.userData.faceReliefR4) return;
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey();
  material.userData.faceReliefR4 = { amplitude_mm: 0.00035, filtered: true };
  material.customProgramCacheKey = () => previousKey + '|vicinal-faces-r4';
  material.onBeforeCompile = (shader: any, renderer: any) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vR4FacePosition;\nvarying vec3 vR4FaceNormal;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 r4Scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
      vR4FacePosition = position * r4Scale;
      vR4FaceNormal = normalize(normal / max(r4Scale, vec3(0.00001)));`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vR4FacePosition;\nvarying vec3 vR4FaceNormal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 r4n = normalize(vR4FaceNormal);
      vec3 r4u = normalize(cross(r4n, abs(r4n.y) < 0.9 ? vec3(0,1,0) : vec3(1,0,0)));
      vec3 r4v = cross(r4n, r4u);
      vec2 r4p = vec2(dot(vR4FacePosition, r4u), dot(vR4FacePosition, r4v));
      float r4Phase = dot(r4n, vec3(1.73, 2.81, 4.19));
      vec2 r4Offset = r4p - vec2(sin(r4Phase), cos(r4Phase)) * 0.7;
      float r4Radius = max(abs(r4Offset.x * 0.85 + r4Offset.y * 0.15),
        abs(r4Offset.y * 0.65 - r4Offset.x * 0.1));
      float r4Resolved = 1.0 - smoothstep(0.025, 0.10, fwidth(r4Radius));
      // A sparse shallow hillock, not periodic ripples: repeated rings read as
      // machining marks on polished faces even at sub-micron amplitude.
      float r4Height = 0.00035 * exp(-r4Radius * 1.5) * r4Resolved;
      vec3 r4dx = dFdx(-vViewPosition), r4dy = dFdy(-vViewPosition);
      vec3 r4rx = cross(r4dy, normal), r4ry = cross(normal, r4dx);
      float r4det = dot(r4dx, r4rx);
      if (abs(r4det) > 1e-12) normal = normalize(normal -
        (r4rx * dFdx(r4Height) + r4ry * dFdy(r4Height)) / r4det);`);
  };
}

// Small geometric edge faces on closed convex faceted bodies. Concave
// intergrowths and already-curved meshes must keep their own construction.
// Width is 0.5% of the shortest local extent, preserving thin blades.
function chamferCrystalGeometry(source: any): any {
  if (source.userData.chamferR4) return source;
  const raw = source.index ? source.toNonIndexed() : source;
  const p = raw.attributes.position;
  if (!p || p.count > 1200) { if (raw !== source) raw.dispose(); return source; }
  const vertices: any[] = [], ids: number[] = [], vertexMap = new Map<string,number>();
  const edges = new Map<string,number>();
  const planes: any[] = [], triangles: any[] = [];
  for (let i=0;i<p.count;i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p,i);
    const key = v.toArray().map((x:number)=>Math.round(x*1e6)).join(',');
    if (!vertexMap.has(key)) { vertexMap.set(key,vertices.length); vertices.push(v); }
    ids.push(vertexMap.get(key)!);
  }
  const center = vertices.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).divideScalar(vertices.length);
  for (let i=0;i<p.count;i+=3) {
    const vs = [vertices[ids[i]],vertices[ids[i+1]],vertices[ids[i+2]]];
    const n = vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
    if (n.lengthSq()<1e-16) continue;
    n.normalize();
    // Several legacy primitives are closed but wound inward. Orient candidate
    // planes from their interior, then prove convexity before rebuilding them.
    // Concave clusters still fail that proof and retain their own geometry.
    if(n.dot(center.clone().sub(vs[0]))>0)n.negate();
    const d=n.dot(vs[0]);
    let plane=planes.findIndex(f=>n.distanceTo(f.normal)<1e-5 && Math.abs(d-f.d)<1e-5);
    if(plane<0) { plane=planes.length; planes.push({n:n.toArray(),normal:n,d}); }
    triangles.push({index:i,triangle:new THREE.Triangle(...vs),plane});
    for(let j=0;j<3;j++) { const pair=[ids[i+j],ids[i+(j+1)%3]].sort((a,b)=>a-b).join(','); edges.set(pair,(edges.get(pair)||0)+1); }
  }
  const reject = () => { if(raw!==source)raw.dispose(); return source; };
  if(planes.length<4 || planes.length>32 || [...edges.values()].some(n=>n>2)
      || planes.some(f=>vertices.some(v=>f.normal.dot(v)>f.d+1e-5))) return reject();
  const openEdges=[...edges.entries()].filter(([,count])=>count===1);
  if(openEdges.length) {
    // Old wall-rooted primitives omit only their planar bottom. Close that
    // attachment scar before beveling, but never seal arbitrary holes or twins.
    const base=Math.min(...vertices.map(v=>v.y));
    if(openEdges.some(([edge])=>edge.split(',').some(id=>Math.abs(vertices[Number(id)].y-base)>1e-6))) return reject();
    planes.push({n:[0,-1,0],normal:new THREE.Vector3(0,-1,0),d:-base});
  }
  const size = new THREE.Box3().setFromPoints(vertices).getSize(new THREE.Vector3());
  const width = Math.min(size.x,size.y,size.z)*0.005;
  const cuts = [...planes];
  for(let i=0;i<planes.length;i++) for(let j=i+1;j<planes.length;j++) {
    const a=planes[i],b=planes[j];
    // Topaz keeps a sharp, continuous prism-to-cap/root junction. A bevel
    // across that junction produced a dark transverse strip like a fracture.
    if (source.userData.gemPrismR4?.mineral === 'topaz'
        && (Math.abs(a.normal.y) < 1e-5) !== (Math.abs(b.normal.y) < 1e-5)) continue;
    if(vertices.filter(v=>Math.abs(a.normal.dot(v)-a.d)<1e-5 && Math.abs(b.normal.dot(v)-b.d)<1e-5).length<2)continue;
    const sum=a.normal.clone().add(b.normal), length=sum.length();
    if(length<1e-5)continue;
    cuts.push({n:sum.divideScalar(length).toArray(),d:(a.d+b.d)/length-width});
  }
  const poly=wulffPolyhedron(cuts);
  if(!poly?.vertices.length)return reject();
  const geom=_wulffPolyToGeom(poly,1), normals:number[]=[];
  const attrs:any={};
  for(const name of Object.keys(raw.attributes))if(!['position','normal'].includes(name))attrs[name]=[];
  for(const f of poly.faces)for(let k=1;k<f.verts.length-1;k++)for(const vi of [f.verts[0],f.verts[k],f.verts[k+1]]) {
    normals.push(...cuts[f.plane].n);
    if(!Object.keys(attrs).length)continue;
    const point=new THREE.Vector3(...poly.vertices[vi]),closest=new THREE.Vector3();
    let best:any=null,bestPoint:any=null,dist=Infinity;
    for(const t of triangles) {
      t.triangle.closestPointToPoint(point,closest); const ds=closest.distanceToSquared(point);
      if(ds<dist) {dist=ds;best=t;bestPoint=closest.clone();}
    }
    const weights=best.triangle.getBarycoord(bestPoint,new THREE.Vector3()).toArray();
    for(const name of Object.keys(attrs)) {
      const a=raw.attributes[name];
      for(let c=0;c<a.itemSize;c++)attrs[name].push(weights.reduce((s:number,w:number,j:number)=>s+w*a.array[(best.index+j)*a.itemSize+c],0));
    }
  }
  geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  for(const name of Object.keys(attrs))geom.setAttribute(name,new THREE.Float32BufferAttribute(attrs[name],raw.attributes[name].itemSize));
  geom.userData={...source.userData,chamferR4:{width,originalFaces:planes.length,faces:poly.faces.length}};
  if(raw!==source)raw.dispose();
  return geom;
}
