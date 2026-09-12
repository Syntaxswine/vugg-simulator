import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any, _topoSyncCrystalMeshes: any;
declare const _helixRestoreCrystalOpacity: any, contactRimSweepBlending: any;
declare const _topazOpticalPlanes: any;
declare const contactGrowthAtStep: any, contactBoundaryRimGeometry: any, _clipConvexGeom: any;

describe('R7 contact memory', () => {
  it('uses net signed length at the cursor and never borrows future growth', () => {
    const c = { total_growth_um: 9e3, zones: [
      {step:1,thickness_um:4000}, {step:2,thickness_um:-2500}, {step:3,thickness_um:7500}] };
    expect(contactGrowthAtStep(c, 1)).toBe(4000);
    expect(contactGrowthAtStep(c, 2)).toBe(1500);
    expect(contactGrowthAtStep(c, 3)).toBe(9000);
    expect(contactGrowthAtStep(c)).toBe(9000);
    expect(contactGrowthAtStep({total_growth_um:9000}, 1)).toBe(0);
  });

  it('outlines an actual cut boundary without fan spokes or untouched face edges', () => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    expect(contactBoundaryRimGeometry(box)).toBeNull();
    const clipped = _clipConvexGeom(box, [{n:[1,0,0],d:.2}]);
    const rim = contactBoundaryRimGeometry(clipped.geom);
    // Original box triangulation can subdivide the perimeter; no internal
    // fan edge may contribute to its exact 4-unit perimeter.
    let perimeter = 0;
    for (let i = 0; i < rim.attributes.position.count; i += 6) {
      const a = new THREE.Vector3().fromBufferAttribute(rim.attributes.position, i);
      const b = new THREE.Vector3().fromBufferAttribute(rim.attributes.position, i + 1);
      expect((Math.abs(a.y) === .5 && a.y === b.y) || (Math.abs(a.z) === .5 && a.z === b.z)).toBe(true);
      perimeter += a.distanceTo(b);
    }
    expect(perimeter).toBeCloseTo(4, 5);
    const p = rim.attributes.position;
    for (let i = 0; i < p.count; i++) expect(p.getX(i)).toBeCloseTo(.2, 6);
  });

  it('cancels Float32 triangulation seams on two oblique caps', () => {
    const cut = _clipConvexGeom(new THREE.BoxGeometry(1,1,1), [{n:[.8,.6,0],d:.2},{n:[0,.6,.8],d:.25}]);
    const rim = contactBoundaryRimGeometry(cut.geom), planes = _topazOpticalPlanes(cut.geom);
    for(let i=0;i<rim.attributes.position.count;i+=6) {
      const a = new THREE.Vector3().fromBufferAttribute(rim.attributes.position,i);
      const b = new THREE.Vector3().fromBufferAttribute(rim.attributes.position,i+1);
      const mid = a.add(b).multiplyScalar(.5);
      expect(planes.filter((p: any)=>Math.abs(p.n.dot(mid)-p.d)<1e-4).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('holds an earlier contact cap byte-identical after future growth is appended', () => {
    const wall = new WallState({vug_diameter_mm:70,shape_seed:42});
    // Controlled parallel substrates, two overlapping bodies; no simulation event invented.
    wall.surfacePointForCrystal = (c: any) => [c.crystal_id === 1 ? 0 : 3, 0, 0];
    wall.surfaceNormalForCrystal = () => [0,1,0];
    const resolve = wall._resolveAnchor.bind(wall);
    wall._resolveAnchor = (c: any) => ({...resolve(c),position:wall.surfacePointForCrystal(c),normal:[0,1,0]});
    const crystals = [1,2].map(id => {
      const c = new Crystal({mineral:'fluorite',habit:'cubic',crystal_id:id,nucleation_step:1});
      Object.assign(c,{c_length_mm:8,a_width_mm:4,total_growth_um:8000,
        wall_anchor:wall._anchorFromRingCell(6,id), zones:[{step:1,thickness_um:8000}]});
      return c;
    });
    const render = (step?: number) => {
      const state: any = {geomCache:new Map(),crystals:new THREE.Group(),scaleZoomOverride:4,
        clipUniforms:{uVugRadius:{value:35}}};
      _topoSyncCrystalMeshes(state,{crystals,step:3},wall,step);
      const parent = state.crystals.children.find((m: any)=>m.userData.crystal_id===1&&!m.userData.isSatellite);
      expect(Array.isArray(parent.material)).toBe(true);
      contactRimSweepBlending(parent, true);
      const rim = parent.children.find((m: any) => m.userData.contactBoundaryRim);
      expect(rim.material.transparent).toBe(true);
      expect(rim.material.depthWrite).toBe(false);
      parent.userData.naturalOpacity = .35;
      _helixRestoreCrystalOpacity(state);
      expect(parent.material[1].opacity).toBe(1);
      expect(parent.material[1].transparent).toBe(false);
      expect(parent.material[1].roughness).toBe(.92);
      expect(rim.material.transparent).toBe(false);
      expect(rim.material.depthWrite).toBe(true);
      expect(parent.children.some((m: any)=>m.userData.contactBoundaryRim)).toBe(true);
      return Array.from(parent.geometry.attributes.position.array);
    };
    const earlier = render(1), live = render();
    crystals[1].zones.push({step:2,thickness_um:8000});
    crystals[1].total_growth_um=16000;
    expect(render(1)).toEqual(earlier);
    expect(render()).not.toEqual(live);
  });
});
