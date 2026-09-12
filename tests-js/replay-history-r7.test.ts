import { describe, expect, it } from 'vitest';
declare const Crystal:any, GrowthZone:any, THREE:any, WallState:any;
declare const replayEnclosureCrystals:any, recordedGrowthDimensions:any, _topoSyncCrystalMeshes:any, _o2PlaceBody:any;
declare const _topazOpticalPlanes:any;

const enclosed=(step:number,host=1)=>({schema:'enclosure-receipt-v1',event:'enclosed',step,
  host_crystal_id:host,guest_crystal_id:2,host_mineral:'quartz',guest_mineral:'pyrite',route:'guest-on-host'});
const freed=(step:number,prior:number,host=1)=>({...enclosed(step,host),schema:'liberation-receipt-v1',event:'liberated',enclosure_step:prior});

describe('R7 recorded replay history',()=>{
  it('replays enclosure, liberation and re-enclosure without borrowing current topology',()=>{
    const sim={crystals:[{crystal_id:1,nucleation_step:0},{crystal_id:2,nucleation_step:1,enclosed_by:3},
      {crystal_id:3,nucleation_step:0}],_enclosureReceipts:[enclosed(3),freed(5,3),enclosed(8,3)]};
    const before=JSON.stringify(sim);
    for(const [step,host]of[[2,null],[3,1],[4,1],[5,null],[7,null],[8,3]]){
      const view=replayEnclosureCrystals(sim,step),guest=view[1];
      expect(guest.enclosed_by).toBe(host);
      expect(view.filter((c:any)=>c.enclosed_crystals.includes(2)).map((c:any)=>c.crystal_id)).toEqual(host==null?[]:[host]);
      expect(guest.coats_front).toBe(host==null?null:true);
    }
    expect(JSON.stringify(sim)).toBe(before);
    const prior=JSON.stringify(replayEnclosureCrystals(sim,4));
    sim._enclosureReceipts.push(freed(10,8,3));
    expect(JSON.stringify(replayEnclosureCrystals(sim,4))).toBe(prior);
    expect(replayEnclosureCrystals(sim,null)).toBe(sim.crystals);
  });

  it('withholds missing or invalid relationship history instead of backdating the live link',()=>{
    const c={crystal_id:2,enclosed_by:1,enclosed_crystals:[7],enclosed_at_step:[3],coats_front:true};
    for(const events of [undefined,[freed(5,3)],[{...enclosed(3),step:NaN}]]){
      const view=replayEnclosureCrystals({crystals:[c],_enclosureReceipts:events},6)[0];
      expect(view.enclosed_by).toBeNull();expect(view.enclosed_crystals).toEqual([]);
      expect(view._replayEnclosureHistory).toBe('unavailable');
    }
  });

  it('matches producer volume through changing recorded aspects and dissolution',()=>{
    const c=new Crystal({mineral:'quartz',habit:'prismatic',crystal_id:1,nucleation_step:0});
    for(const [step,thickness,habit]of[[1,2000,'prismatic'],[2,1000,'tabular'],[3,-500,'acicular']]){
      c.habit=habit;c.add_zone(new GrowthZone({step,thickness_um:thickness}));
      const dim=recordedGrowthDimensions(c,step);
      expect(dim.c_length_mm).toBeCloseTo(c.c_length_mm,12);
      expect(dim.a_width_mm).toBeCloseTo(c.a_width_mm,12);
      expect(dim.volume_mm3).toBeCloseTo(c._volume_mm3,12);
    }
    const prior=recordedGrowthDimensions(c,1);
    c.habit='snowball';c._split={index:1};c.add_zone(new GrowthZone({step:4,thickness_um:3000}));
    expect(recordedGrowthDimensions(c,1)).toEqual(prior);
    expect(recordedGrowthDimensions(c,0)).toBeNull();
  });

  it('keeps absent legacy aspects and unrecorded split extent explicit',()=>{
    const c={nucleation_step:1,habit:'acicular',_split:{index:1},zones:[{step:1,thickness_um:1000}]};
    const dim=recordedGrowthDimensions(c,1);
    expect(dim.c_length_mm).toBe(1);expect(dim.a_width_mm).toBeCloseTo(.5,12);
    expect(dim.aspect_history).toBe('legacy-neutral-display');
    c.habit='tabular';expect(recordedGrowthDimensions(c,1)).toEqual(dim);
  });

  it('uses the same historical inclusion projection in actual mesh gates, materials and placement',()=>{
    const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
    const host=new Crystal({mineral:'quartz',habit:'prismatic',crystal_id:1,nucleation_step:0});
    const guest=new Crystal({mineral:'pyrite',habit:'cubic',crystal_id:2,nucleation_step:1});
    for(const [c,ring,cell,um]of[[host,6,12,6000],[guest,6,22,700]]){
      c.wall_anchor=wall._anchorFromRingCell(ring,cell);c.add_zone(new GrowthZone({step:1,thickness_um:um}));
    }
    guest.enclosed_by=null;
    const sim={crystals:[host,guest],step:8,_enclosureReceipts:[enclosed(3),freed(5,3)]};
    const original=JSON.stringify(sim),state:any={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}},scaleZoomOverride:4};
    const build=(step:number)=>{_topoSyncCrystalMeshes(state,sim,wall,step);return state.crystals.children.find((m:any)=>m.userData.crystal_id===2&&!m.userData.isSatellite);};
    const early=build(2),position=early.position.clone();
    const earlyRoughness=(Array.isArray(early.material)?early.material[0]:early.material).roughness;
    expect(state.crystals.children.some((m:any)=>m.userData.crystal_id===2&&m.userData.isSatellite)).toBe(true);
    const buried=build(3);
    expect(buried.position.distanceTo(position)).toBeGreaterThan(1);
    expect(state.crystals.children.some((m:any)=>m.userData.crystal_id===2&&m.userData.isSatellite)).toBe(false);
    expect((Array.isArray(buried.material)?buried.material[0]:buried.material).opacity).toBe(1);
    expect((Array.isArray(buried.material)?buried.material[0]:buried.material).roughness).toBeCloseTo(earlyRoughness+.22,12);
    const liberated=build(5);expect(liberated.position.toArray()).toEqual(position.toArray());
    expect((Array.isArray(liberated.material)?liberated.material[0]:liberated.material).roughness).toBe(earlyRoughness);
    expect(state.crystals.children.some((m:any)=>m.userData.crystal_id===2&&m.userData.isSatellite)).toBe(true);
    sim._enclosureReceipts.push(enclosed(9));
    expect(build(5)).toBe(liberated);
    sim._enclosureReceipts.pop();expect(JSON.stringify(sim)).toBe(original);
  });

  it('does not project a later hollow cast before accepted growth or dissolution',()=>{
    const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
    const c=new Crystal({mineral:'quartz',habit:'prismatic',crystal_id:9,nucleation_step:1});
    Object.assign(c,{wall_anchor:wall._anchorFromRingCell(6,12),perimorph_eligible:true,
      dissolved:true,c_length_mm:0,a_width_mm:0,total_growth_um:0,
      zones:[{step:2,thickness_um:2000,aspect_ratio:.4},{step:4,thickness_um:-2000,aspect_ratio:.4}]});
    const sim={crystals:[c],step:5,_enclosureReceipts:[]},original=JSON.stringify(c);
    const state:any={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}},scaleZoomOverride:4};
    _topoSyncCrystalMeshes(state,sim,wall,1);
    expect(state.crystals.children).toHaveLength(0);
    const empty=replayEnclosureCrystals(sim,1)[0];
    expect(_o2PlaceBody(empty,wall,1,wall.ring_count,wall.cells_per_ring,35,'recorded')).toBeNull();
    _topoSyncCrystalMeshes(state,sim,wall,2);
    const solid=state.crystals.children.find((m:any)=>!m.userData.isSatellite);
    expect(solid).toBeDefined();
    expect((Array.isArray(solid.material)?solid.material[0]:solid.material).userData.optics.perimorph).toBe(false);
    _topoSyncCrystalMeshes(state,sim,wall,4);
    const cast=state.crystals.children.find((m:any)=>!m.userData.isSatellite);
    expect(cast).toBeDefined();
    expect((Array.isArray(cast.material)?cast.material[0]:cast.material).userData.optics.perimorph).toBe(true);
    expect(cast.userData.displayScale.recordedLengthMm).toBe(2);
    expect(JSON.stringify(c)).toBe(original);
  });

  it('places enclosing ancestors before older descendants and restores the released subtree',()=>{
    const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
    const crystals=[['pyrite','cubic',1000],['quartz','prismatic',5000],['fluorite','cubic',14000]].map(([mineral,habit,um],i)=>{
      const c=new Crystal({mineral,habit,crystal_id:i+1,nucleation_step:1});
      c.wall_anchor=wall._anchorFromRingCell(6,12+i*12);c.add_zone(new GrowthZone({step:1,thickness_um:um}));return c;
    });
    const e1={...enclosed(2,2),guest_crystal_id:1,guest_mineral:'pyrite',host_mineral:'quartz'};
    const e2={...enclosed(3,3),guest_mineral:'quartz',host_mineral:'fluorite'};
    const release={...e2,schema:'liberation-receipt-v1',event:'liberated',step:5,enclosure_step:3};
    const sim={crystals,step:6,_enclosureReceipts:[e1,e2,release]},before=JSON.stringify(sim);
    const state:any={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}},scaleZoomOverride:4};
    const build=(step:number)=>{_topoSyncCrystalMeshes(state,sim,wall,step);return new Map(state.crystals.children.filter((m:any)=>!m.userData.isSatellite).map((m:any)=>[m.userData.crystal_id,m]));};
    const early:any=build(2),earlyHost=early.get(2).position.toArray(),earlyGuest=early.get(1).position.toArray();
    const nested:any=build(3);
    for(const [guest,host]of[[1,2],[2,3]]){
      const g=nested.get(guest),h=nested.get(host);h.geometry.computeBoundingSphere();
      const radius=h.geometry.boundingSphere.radius*Math.max(...h.scale.toArray());
      expect(g.position.distanceTo(h.position)).toBeLessThan(radius);
      expect(g.userData.inclusionFit.containment).toBe('all-guest-vertices');
      const planes=_topazOpticalPlanes(h.geometry),p=g.geometry.attributes.position,v=new THREE.Vector3();
      for(let i=0;i<p.count;i++) {
        v.fromBufferAttribute(p,i).multiply(g.scale).applyQuaternion(g.quaternion).add(g.position)
          .sub(h.position).applyQuaternion(h.quaternion.clone().invert()).divide(h.scale);
        for(const plane of planes) expect(plane.n.dot(v)-plane.d).toBeLessThan(1e-5);
      }
    }
    expect(nested.get(2).position.toArray()).not.toEqual(earlyHost);
    const released:any=build(5);
    expect(released.get(2).position.toArray()).toEqual(earlyHost);
    expect(released.get(1).position.toArray()).toEqual(earlyGuest);
    expect(JSON.stringify(sim)).toBe(before);
    // A malformed cycle is never allowed to recurse indefinitely.
    sim._enclosureReceipts=[e1,{...enclosed(3,1),guest_mineral:'quartz',host_mineral:'pyrite'}];
    expect(()=>build(3)).not.toThrow();
    expect(replayEnclosureCrystals(sim,3).every((c:any)=>c.enclosed_by==null&&c._replayEnclosureHistory==='unavailable')).toBe(true);
  });
});
