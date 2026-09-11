import {describe,it,expect} from 'vitest';
declare const THREE:any, Crystal:any, WallState:any, _topoSyncCrystalMeshes:any;
declare const makeGypsumSplitAggregate:any, makeSplitNeedleGeometry:any;

describe('R4 split aggregates preserve their mineral forms',()=>{
  it('gives every gypsum plate a strict shared interior at several developments',()=>{
    for(const index of [0.3,0.55,0.8,1])for(const rose of [false,true]) {
      const g=makeGypsumSplitAggregate(index,rose);
      const members=g.userData.gypsumSplitR4.members;
      const center=new THREE.Vector3().applyMatrix4(new THREE.Matrix4().fromArray(members[0].matrix));
      // A cube of interior samples proves positive shared solid volume, not
      // just coincident roots, intersecting boxes or overlapping silhouettes.
      for(const m of members) {
        const inverse=new THREE.Matrix4().fromArray(m.matrix).invert();
        for(const x of [-0.0005,0.0005])for(const y of [-0.0005,0.0005])for(const z of [-0.0005,0.0005]) {
          const p=center.clone().add(new THREE.Vector3(x,y,z)).applyMatrix4(inverse);
          for(const f of m.faces)expect(new THREE.Vector3(...f.n).dot(p)).toBeLessThan(f.d-1e-6);
        }
      }
      for(const v of g.attributes.position.array)expect(Number.isFinite(v)).toBe(true);
      g.computeBoundingBox();expect(g.boundingBox.min.y).toBeCloseTo(-0.5,6);
      g.dispose();
    }
  });
  it('uses split maturity to change acicular spread while retaining fine prisms',()=>{
    const narrow=makeSplitNeedleGeometry('orthorhombic',0.3,false);
    const wide=makeSplitNeedleGeometry('orthorhombic',0.8,false);
    for(const g of [narrow,wide]) {
      expect(g.userData.splitNeedleR4.members).toBe(19);
      for(const v of g.attributes.position.array)expect(Number.isFinite(v)).toBe(true);
      g.computeBoundingBox();
    }
    expect(wide.boundingBox.max.x-wide.boundingBox.min.x).toBeGreaterThan(narrow.boundingBox.max.x-narrow.boundingBox.min.x);
    narrow.dispose();wide.dispose();
  });
  it('dispatches recorded gypsum roses and acicular splits without erasing sector or split testimony',()=>{
    for(const mineral of ['selenite','gypsum','mesolite','scolecite']) {
      const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
      const gypsum=['selenite','gypsum'].includes(mineral);
      const c=new Crystal({mineral,habit:gypsum?'desert_rose':'acicular',crystal_id:17,nucleation_step:1});
      Object.assign(c,{c_length_mm:8,a_width_mm:4,total_growth_um:8000,_volume_mm3:4,
        wall_anchor:wall._anchorFromRingCell(6,12),_split:{index:0.95,rung:'spherulite',route:'A'}});
      if(gypsum)c._sectorZoned={kind:'gypsum_hourglass',intensity:0.6,flooded:false,steps:0};
      const before=JSON.stringify([c._split,c._sectorZoned,c.zones,c._volume_mm3,c.c_length_mm,c.a_width_mm]);
      const state={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
      _topoSyncCrystalMeshes(state,{crystals:[c],step:100},wall);
      const bodies=state.crystals.children.filter((m:any)=>m.geometry?.userData[gypsum?'gypsumSplitR4':'splitNeedleR4']);
      expect(bodies).toHaveLength(1); // one composite; no second satellite forest
      expect(bodies[0].scale.x).toBe(bodies[0].scale.y);
      expect(bodies[0].scale.z).toBe(bodies[0].scale.y);
      if(gypsum) {
        expect(bodies[0].material.vertexColors).toBe(true);
        expect(bodies[0].material.userData.gypsumCleavage).toBeTruthy();
        expect(bodies[0].scale.x).toBe(bodies[0].scale.y);
      }
      expect(JSON.stringify([c._split,c._sectorZoned,c.zones,c._volume_mm3,c.c_length_mm,c.a_width_mm])).toBe(before);
    }
  });
  it('honours an authored desert rose without inventing a split record',()=>{
    const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
    const c=new Crystal({mineral:'selenite',habit:'desert_rose',crystal_id:17,nucleation_step:1});
    Object.assign(c,{c_length_mm:8,a_width_mm:4,total_growth_um:8000,wall_anchor:wall._anchorFromRingCell(6,12)});
    const state={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
    const before=c._split;
    _topoSyncCrystalMeshes(state,{crystals:[c],step:100},wall);
    expect(state.crystals.children.some((m:any)=>m.geometry?.userData.gypsumSplitR4?.rose)).toBe(true);
    expect(c._split).toBe(before);
  });
  it('keeps a recorded swallowtail ahead of the split sphere and retains its hourglass',()=>{
    const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
    const c=new Crystal({mineral:'selenite',habit:'desert_rose',crystal_id:18,nucleation_step:1});
    Object.assign(c,{c_length_mm:8,a_width_mm:4,total_growth_um:8000,twinned:true,twin_law:'swallowtail',
      _split:{index:1,rung:'spherulite'},_sectorZoned:{kind:'gypsum_hourglass',intensity:0.7,flooded:false},
      wall_anchor:wall._anchorFromRingCell(6,12)});
    const before=JSON.stringify([c._split,c._sectorZoned,c.twinned,c.twin_law]);
    const state={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
    _topoSyncCrystalMeshes(state,{crystals:[c],step:100},wall);
    const body=state.crystals.children.find((m:any)=>m.geometry?.userData.gypsumTwinR4);
    expect(body).toBeTruthy();expect(body.geometry.userData.gypsumTwinR4.law).toBe('swallowtail');
    expect(body.material.vertexColors).toBe(true);expect(body.scale.x).toBe(body.scale.y);
    expect(body.geometry.attributes.position.count).toBeGreaterThan(72);
    expect(body.geometry.attributes.gypsumHeight).toBeTruthy();
    expect(JSON.stringify([c._split,c._sectorZoned,c.twinned,c.twin_law])).toBe(before);
  });
});
