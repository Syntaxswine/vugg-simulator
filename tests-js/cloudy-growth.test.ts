import {describe, it, expect} from 'vitest';
declare const cloudyGrowthHistory:any, cloudyGrowthSignature:any, buildCrystalMaterial:any, MINERALS:any;
declare const THREE:any, makeGemPrismRenderGeometry:any, chamferCrystalGeometry:any, _applyTopazVolumeOptics:any;
declare const Crystal:any, WallState:any, _topoSyncCrystalMeshes:any, _topoCrystalsSignature:any, _buildHabitGeom:any;

describe('cloudy surviving growth zones',()=>{
  it('removes youngest layers on dissolution before placing the surviving shells',()=>{
    const c={crystal_id:7,zones:[{step:1,thickness_um:100,fluid_inclusion:true},
      {step:2,thickness_um:100},{step:3,thickness_um:-50}]};
    const before=JSON.stringify(c),h=cloudyGrowthHistory(c);
    expect(h.total_um).toBe(150);expect(h.inclusion_fraction).toBeCloseTo(2/3);
    expect(h.bins[0]).toBeCloseTo(0.95);expect(h.bins[15]).toBeCloseTo(0);
    expect(h.bins.reduce((s:number,v:number)=>s+v,0)/16).toBeCloseTo((0.95*100+0*50)/150);
    expect(JSON.stringify(c)).toBe(before);
  });
  it('replay excludes future dissolution and future trapped-fluid episodes',()=>{
    const c={zones:[{step:1,thickness_um:10},{step:2,thickness_um:10,fluid_inclusion:true},
      {step:3,thickness_um:-20},{step:4,thickness_um:7}]};
    expect(cloudyGrowthHistory(c,1).inclusion_fraction).toBe(0);
    expect(cloudyGrowthHistory(c,2).inclusion_fraction).toBe(0.5);
    expect(cloudyGrowthHistory(c,3).total_um).toBe(0);
    expect(cloudyGrowthHistory(c).total_um).toBe(7);
  });
  it('keeps thin episodes through bounded area averaging rather than dropping history',()=>{
    const c={zones:Array.from({length:100},(_,i)=>({step:i,thickness_um:1,fluid_inclusion:i%2===0}))};
    const h=cloudyGrowthHistory(c);
    expect(h.bins).toHaveLength(16);expect(h.inclusion_fraction).toBe(0.5);
    expect(h.bins.reduce((s:number,v:number)=>s+v,0)/16).toBeCloseTo(0.475);
  });
  it('ignores invalid thickness and keeps empty histories finite',()=>{
    const h=cloudyGrowthHistory({zones:[{thickness_um:NaN},{thickness_um:Infinity},{thickness_um:-100}]});
    expect(h.total_um).toBe(0);expect(h.bins.every(Number.isFinite)).toBe(true);
  });
  it.each([{}, {zones:[{step:1,thickness_um:20}]},
    {zones:[{step:1,thickness_um:20,fluid_inclusion:true},{step:2,thickness_um:-20}]}])(
    'does not invent clouds without surviving inclusion records', c=>{
      expect(cloudyGrowthHistory(c).bins).toEqual(Array(16).fill(0));
    });
  it('replay restores clear optics before a future inclusion episode',()=>{
    const c={mineral:'topaz',zones:[{step:1,thickness_um:20},{step:2,thickness_um:20,fluid_inclusion:true}]};
    const mat=buildCrystalMaterial(c,{class:'silicate',optics:{ior:1.62,diaphaneity:['transparent']}},{},'transmission');
    expect(mat.transmission).toBe(.5);
    const mesh=new THREE.Mesh(makeGemPrismRenderGeometry('topaz',1.5,.5,1,.4),mat);
    mesh.userData.mineral='topaz';
    _applyTopazVolumeOptics(mat,mesh,cloudyGrowthHistory(c,1));
    expect(mat.transmission).toBe(mat.userData.optics.transmission);
    expect(mat.transmission).toBeGreaterThan(.5);
    expect(mat.userData.optics.specimen_bulk_roughness).toBe(0);
    expect(mat.userData.cloudyGrowth.bins).toEqual(Array(16).fill(0));
  });
  it('invalidates rendering when an existing layer changes without changing size or zone count',()=>{
    const c={mineral:'apatite',zones:[{step:1,thickness_um:5}]};
    const a=cloudyGrowthSignature(c);(c.zones[0] as any).fluid_inclusion=true;
    expect(cloudyGrowthSignature(c)).not.toBe(a);
    expect(cloudyGrowthSignature({mineral:'calcite',zones:c.zones})).toBe('');
    const replay=cloudyGrowthSignature(c,1);
    c.zones.push({step:2,thickness_um:10,fluid_inclusion:true} as any);
    expect(cloudyGrowthSignature(c,1)).toBe(replay);
  });
  it('retains the volume path on narrow Float32 topaz chamfers',()=>{
    const c={mineral:'topaz',crystal_id:13,zones:[{step:1,thickness_um:20,fluid_inclusion:true}]};
    const g=chamferCrystalGeometry(makeGemPrismRenderGeometry('topaz',1.5,0.18826604489967208,1,0.4));
    const mat=buildCrystalMaterial(c,{class:'silicate',optics:{ior:1.62,diaphaneity:['transparent']}},{},'transmission');
    const mesh=new THREE.Mesh(g,mat);mesh.userData.mineral='topaz';
    _applyTopazVolumeOptics(mat,mesh,cloudyGrowthHistory(c));
    expect(mat.userData.optics.volume_path).toBe('convex-growth-zones');
    expect(mat.userData.cloudyGrowth.inclusion_fraction).toBe(1);
    expect(mat.side).toBe(THREE.FrontSide);
  });
  it('does not fill the open gaps of a cyclic twin with a convex cloud volume',()=>{
    const c={mineral:'aragonite',zones:[]};
    const mat=buildCrystalMaterial(c,{class:'carbonate',optics:{ior:1.6,diaphaneity:['transparent']}},{},'transmission');
    _applyTopazVolumeOptics(mat,new THREE.Mesh(_buildHabitGeom('aragonite_pseudohex_twin'),mat),cloudyGrowthHistory(c));
    expect(mat.userData.cloudyGrowth).toBeUndefined();
    expect(mat.userData.optics.volume_path).toBeUndefined();
  });
  it.each([['quartz','prismatic'],['topaz','prismatic'],['apatite','prismatic_hexagonal'],['barite','tabular'],['aragonite','columnar']])(
    'installs surviving history on the production %s body and updates cached interiors', (mineral,habit)=>{
      const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
      const c=new Crystal({mineral,habit,crystal_id:17,nucleation_step:0});
      Object.assign(c,{c_length_mm:8,a_width_mm:5,total_growth_um:8000,wall_anchor:wall._anchorFromRingCell(6,12),
        zones:[{step:1,thickness_um:4000,fluid_inclusion:true},{step:2,thickness_um:4000,fluid_inclusion:false}]});
      const state={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
      const sim={crystals:[c],step:3},before=JSON.stringify(c.zones);
      _topoSyncCrystalMeshes(state,sim,wall);
      const body=state.crystals.children.find((m:any)=>m.material?.userData?.cloudyGrowth);
      expect(body).toBeDefined();
      expect(body.material.userData.cloudyGrowth.inclusion_fraction).toBe(.5);
      const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <transmission_pars_fragment>'};
      body.material.onBeforeCompile(shader,null);
      expect((shader.uniforms as any).growthCloudBins.value).toHaveLength(16);
      expect(shader.fragmentShader).toContain('growthScatter');
      expect(JSON.stringify(c.zones)).toBe(before);
      const signature=_topoCrystalsSignature(sim,wall);
      c.zones[0].fluid_inclusion=false;
      expect(_topoCrystalsSignature(sim,wall)).not.toBe(signature);
      _topoSyncCrystalMeshes(state,sim,wall);
      const updated=state.crystals.children.find((m:any)=>m.material?.userData?.cloudyGrowth);
      expect(updated.material.userData.cloudyGrowth.inclusion_fraction).toBe(0);
      expect(updated.material.userData.cloudyGrowth.bins).toEqual(Array(16).fill(0));
      expect(updated.material.userData.optics.specimen_transmission_cap).toBe(1);
      expect(updated.material.userData.optics.specimen_alpha_floor).toBe(0);
      expect(updated.material.userData.optics.specimen_bulk_roughness).toBe(0);
    });
});
