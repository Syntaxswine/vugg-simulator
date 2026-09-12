// R7f consumes recorded events without changing the simulation. This is a
// projection of available history, not a reconstruction of unrecorded faces.
function replayEnclosureCrystals(sim: any, step: number | null): any[] {
  if (step == null) return sim.crystals;
  const events = Array.isArray(sim._enclosureReceipts) ? sim._enclosureReceipts : null;
  const prefix = events?.filter((e: any) => !Number.isFinite(e?.step) || e.step <= step);
  const lifecycle = prefix ? _runtimeEnclosureLifecycleState(prefix) : null;
  const crystals = sim.crystals.map((c: any) => {
    if (!c) return c;
    const growth = recordedGrowthState(c, step);
    const cast = c.perimorph_eligible && !growth.dimensions ? growth.dissolution : null;
    return { ...c,
    dissolved: !growth.dimensions,
    perimorph_eligible: !!cast,
    // Ordinary dimensions are already read through recordedGrowthDimensions by
    // every mesh/pre-pass. Retain live denominators used by surface-fabric
    // maturity; only a cast needs an explicit pre-loss envelope fallback.
    c_length_mm: cast ? cast.dimensions.c_length_mm : c.c_length_mm,
    a_width_mm: cast ? cast.dimensions.a_width_mm : c.a_width_mm,
    _replayCastStep: cast?.step ?? null,
    // Today's link can describe a later enclosure, or erase an earlier one.
    enclosed_by: null, enclosed_crystals: [], enclosed_at_step: [], coats_front: null,
    enclosure_receipt: null, liberation_receipt: null,
    _replayEnclosureHistory: lifecycle ? 'recorded' : 'unavailable',
  }; });
  if (!lifecycle) return crystals;
  // Event shape/order alone does not exclude a logically cyclic enclosure.
  // Such a graph has no enclosing ancestor and cannot describe physical burial.
  const completed = new Set();
  for (const start of lifecycle.keys()) {
    const path = new Set(); let id = start;
    while (lifecycle.has(id) && !completed.has(id)) {
      if (path.has(id)) {
        for (const c of crystals) if (c) c._replayEnclosureHistory = 'unavailable';
        return crystals;
      }
      path.add(id); id = lifecycle.get(id).host_crystal_id;
    }
    for (const seen of path) completed.add(seen);
  }
  const byId = new Map<any, any>(crystals.filter(Boolean).map((c: any) => [c.crystal_id,c]));
  for (const [id, event] of lifecycle) {
    const guest = byId.get(id), host = byId.get(event.host_crystal_id);
    if (!guest || !host || guest.nucleation_step > step || host.nucleation_step > step) continue;
    guest.enclosed_by = host.crystal_id;
    guest.coats_front = event.route === 'guest-on-host';
    guest.enclosure_receipt = event;
    host.enclosed_crystals.push(id); host.enclosed_at_step.push(event.step);
  }
  return crystals;
}

// Mirror the producer's per-zone volume integration. A modern zone stamps its
// a/c aspect when accepted; reinterpreting all prior matter through today's
// habit can change historical volume by orders of magnitude. A legacy gap uses
// a declared neutral 0.5 display ratio rather than a future habit.
function recordedGrowthDimensions(crystal: any, step: number): any {
  return recordedGrowthState(crystal, step).dimensions;
}

function recordedGrowthState(crystal: any, step: number): any {
  if (!crystal || crystal.nucleation_step > step || !Array.isArray(crystal.zones)) return {dimensions:null,dissolution:null};
  let length = 0, volume = 0, known = true;
  let dissolution: any = null;
  const dimensions = () => length > 0 ? { c_length_mm: length,
    a_width_mm: Math.sqrt(6 * volume / (Math.PI * length)), volume_mm3: volume,
    aspect_history: known ? 'recorded' : 'legacy-neutral-display',
    split_extent: 'uncompacted-no-recorded-index-history' } : null;
  for (const z of crystal.zones) {
    if (!Number.isFinite(z.step) || z.step > step || !Number.isFinite(z.thickness_um)) continue;
    const next = Math.max(0, length + z.thickness_um / 1000);
    if (z.thickness_um > 0) {
      dissolution = null;
      const hasAspect = Number.isFinite(z.aspect_ratio) && z.aspect_ratio > 0;
      const aspect = hasAspect ? z.aspect_ratio : .5;
      known = known && hasAspect;
      volume += _habitVolCoeff(aspect) * (next ** 3 - length ** 3);
    } else if (length > 0) {
      if (!next) dissolution = {step:z.step, dimensions:dimensions()};
      volume *= (next / length) ** 3;
      if (!next) known = true;
    }
    length = next;
  }
  // The final split index has no per-step record. Do not apply it backwards.
  return {dimensions:dimensions(),dissolution};
}

const _inclusionHostVolumes = new WeakMap();
// Fits a display representative into a verified convex host. Neither its
// booked dimensions nor its recorded relationship changes. The interior point
// is deterministic placement, not a recovered entrapment coordinate.
function fitInclusionInsideHost(guest: any, host: any): boolean {
  const hp = host.geometry?.attributes?.position, gp = guest.geometry?.attributes?.position;
  if (!hp || !gp || ![...host.scale.toArray(),...guest.scale.toArray()].every(v=>Number.isFinite(v)&&v>0)) return false;
  let volume = _inclusionHostVolumes.get(host.geometry);
  if (volume === undefined) {
    const planes = _topazOpticalPlanes(host.geometry), center = new THREE.Vector3(), v = new THREE.Vector3();
    let convex = planes.length >= 4 && planes.length <= 128;
    for (let i=0;i<hp.count;i++) {
      v.fromBufferAttribute(hp,i);center.add(v);
      if (convex && planes.some(p=>p.n.dot(v)>p.d+1e-4)) convex=false;
    }
    center.divideScalar(hp.count);
    if (planes.some(p=>p.d-p.n.dot(center)<=1e-6)) convex=false;
    volume = convex ? {planes,center} : null;
    _inclusionHostVolumes.set(host.geometry,volume);
  }
  if (!volume) { guest.userData.inclusionFit={model:'bounding-sphere-display',containment:'unavailable-nonconvex-host'};return false; }
  const {planes,center}=volume, inverse=host.quaternion.clone().invert();
  const preferred=guest.position.clone().sub(host.position).applyQuaternion(inverse).divide(host.scale);
  const direction=preferred.sub(center), target=center.clone();
  let fraction=1;
  for(const p of planes) {
    const advance=p.n.dot(direction);
    if(advance>0) fraction=Math.min(fraction,.7*Math.max(0,p.d-p.n.dot(center))/advance);
  }
  target.addScaledVector(direction,fraction);
  const guestCenter=new THREE.Vector3(),v=new THREE.Vector3();
  for(let i=0;i<gp.count;i++) guestCenter.add(v.fromBufferAttribute(gp,i));
  guestCenter.divideScalar(gp.count);
  // Support of the rotated, scaled guest in every host half-space. Uniform
  // reduction preserves its mineral-specific shape and guarantees all vertices
  // (therefore all triangles) stay inside this verified convex volume.
  const supports=planes.map(()=>0);
  for(let i=0;i<gp.count;i++) {
    v.fromBufferAttribute(gp,i).sub(guestCenter).multiply(guest.scale).applyQuaternion(guest.quaternion).applyQuaternion(inverse).divide(host.scale);
    for(let j=0;j<planes.length;j++) supports[j]=Math.max(supports[j],planes[j].n.dot(v));
  }
  let reduction=1;
  for(let j=0;j<planes.length;j++) if(supports[j]>0) reduction=Math.min(reduction,.9*Math.max(0,planes[j].d-planes[j].n.dot(target))/supports[j]);
  guest.scale.multiplyScalar(reduction);
  guest.position.copy(target.multiply(host.scale).applyQuaternion(host.quaternion).add(host.position))
    .sub(guestCenter.multiply(guest.scale).applyQuaternion(guest.quaternion));
  guest.userData.inclusionFit={model:'convex-host-display-fit',containment:'all-guest-vertices',uniformReduction:reduction,measuredPosition:false};
  return true;
}
