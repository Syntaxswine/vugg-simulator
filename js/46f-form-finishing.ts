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
    const key = v.toArray().map((x:number)=>x.toFixed(6)).join(',');
    if (!vertexMap.has(key)) { vertexMap.set(key,vertices.length); vertices.push(v); }
    ids.push(vertexMap.get(key)!);
  }
  for (let i=0;i<p.count;i+=3) {
    const vs = [vertices[ids[i]],vertices[ids[i+1]],vertices[ids[i+2]]];
    const n = vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
    if (n.lengthSq()<1e-16) continue;
    n.normalize(); const d=n.dot(vs[0]);
    let plane=planes.findIndex(f=>n.distanceTo(f.normal)<1e-5 && Math.abs(d-f.d)<1e-5);
    if(plane<0) { plane=planes.length; planes.push({n:n.toArray(),normal:n,d}); }
    triangles.push({index:i,triangle:new THREE.Triangle(...vs),plane});
    for(let j=0;j<3;j++) { const pair=[ids[i+j],ids[i+(j+1)%3]].sort((a,b)=>a-b).join(','); edges.set(pair,(edges.get(pair)||0)+1); }
  }
  const reject = () => { if(raw!==source)raw.dispose(); return source; };
  if(planes.length<4 || planes.length>32 || [...edges.values()].some(n=>n!==2)
      || planes.some(f=>vertices.some(v=>f.normal.dot(v)>f.d+1e-5))) return reject();
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
