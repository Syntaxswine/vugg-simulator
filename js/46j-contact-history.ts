// R7c: net integrated length available at the displayed cursor, never future growth.
// Missing historical layers use the existing size-only meeting-plane fallback.
function contactGrowthAtStep(crystal: any, step?: number | null): number {
  if (step == null) return Math.max(0, crystal.total_growth_um || 0);
  if (!Array.isArray(crystal.zones)) return 0;
  return crystal.zones.reduce((sum: number, z: any) =>
    Number.isFinite(z.step) && z.step <= step && Number.isFinite(z.thickness_um)
      ? Math.max(0, sum + z.thickness_um) : sum, 0);
}

// Contact material group 1 only. Cancel interior triangle edges per plane, so
// fan triangulation cannot become spurious dark cracks. This rim is a display
// cue for a modeled contact boundary, not a mineral stain or a dated event.
function contactBoundaryRimGeometry(geom: any): any {
  if (geom.groups?.length !== 2 || geom.groups.some((g: any) => g.materialIndex !== 0 && g.materialIndex !== 1)) return null;
  const group = geom.groups?.find((g: any) => g.materialIndex === 1);
  if (!group) return null;
  const flat = geom.index ? geom.toNonIndexed() : geom;
  const pos = flat.attributes.position;
  const planes: any[] = [];
  const key = (v: any) => v.toArray().map((n: number) => Math.round(n * 1e6)).join(',');
  for (let i = group.start; i < group.start + group.count; i += 3) {
    const v = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(pos, i + k));
    const n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    if (n.lengthSq() < .5) continue;
    const d = n.dot(v[0]);
    // Float32 clipping introduces slightly different fitted normals on thin
    // triangles of one cap. Compare planes with a tolerance, not rounded bins.
    let p = planes.find(p => p.normal.dot(n) > 1 - 1e-5 && Math.abs(p.d - d) < 1e-5);
    if (!p) { p = { normal: n, d, edges: new Map(), points: new Map() }; planes.push(p); }
    for (let j = 0; j < 3; j++) {
      const a = v[j], b = v[(j + 1) % 3], ak = key(a), bk = key(b);
      const ek = [ak, bk].sort().join('|');
      if (p.edges.has(ek)) p.edges.delete(ek); else p.edges.set(ek, [a, b]);
      p.points.set(ak, a);
    }
  }
  const out: number[] = [];
  let edges = 0;
  for (const p of planes) {
    const center = new THREE.Vector3();
    for (const v of p.points.values()) center.add(v);
    center.multiplyScalar(1 / p.points.size);
    for (const [a, b] of p.edges.values()) {
      const ai = a.clone().lerp(center, .025), bi = b.clone().lerp(center, .025);
      for (const v of [a, b, bi, a, bi, ai]) out.push(...v.toArray());
      edges++;
    }
  }
  if (flat !== geom) flat.dispose();
  if (!out.length) return null;
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  result.computeVertexNormals();
  result.userData.contactBoundaryEdges = edges;
  return result;
}

function emitContactBoundaryRim(host: any, state: any): void {
  if (!Array.isArray(host.material)) return;
  const geom = contactBoundaryRimGeometry(host.geometry);
  if (!geom) return;
  const mat = new THREE.MeshBasicMaterial({ color: host.material[1].color.clone().multiplyScalar(.18), side: THREE.DoubleSide });
  mat.userData.contactDisplayCue = true;
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
  _applyCavityClip(mat, state.clipUniforms);
  const rim = new THREE.Mesh(geom, mat);
  rim.userData = { contactBoundaryRim: true, ownsGeometry: true, crystal_id: host.userData.crystal_id };
  host.add(rim);
}

// Contact rims share the host's helix skin shader and therefore its blend mode.
function contactRimSweepBlending(mesh: any, active: boolean): void {
  mesh.traverse?.((part: any) => {
    if (!part.userData?.contactBoundaryRim) return;
    if (part.material.transparent !== active) part.material.needsUpdate = true;
    part.material.transparent = active;
    part.material.opacity = 1;
    part.material.depthWrite = !active;
  });
}
