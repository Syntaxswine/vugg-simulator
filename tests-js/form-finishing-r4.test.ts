import { describe, expect, it } from 'vitest';
declare const THREE:any, Crystal:any, WallState:any, _topoSyncCrystalMeshes:any;
declare const makeQuartzRenderGeometry:any, makeGemPrismRenderGeometry:any, chamferCrystalGeometry:any;
declare const _buildHabitGeom:any, makeNativeSilverWireGeometry:any;
declare const _resolveCrystalGeomToken:any;

describe('R4 form finishing',()=>{
  it('carries topaz prism faces continuously to its closed root',()=>{
    for(const attach of [0,0.2,0.5]) {
      const g=makeGemPrismRenderGeometry('topaz',1.5,attach,1),p=g.attributes.position,n=g.attributes.normal;
      let base=0;
      for(let i=0;i<p.count;i++)if(n.getY(i)<-1e-5) {
        expect(n.getY(i)).toBeCloseTo(-1,6); expect(p.getY(i)).toBeCloseTo(attach-0.5,6);base++;
      }
      expect(base).toBeGreaterThan(0);
    }
  });
  it('constructs both quartz terminations using point group 32',()=>{
    for(const ratio of [0.2,0.5,1.1]) {
      const g=makeQuartzRenderGeometry(ratio,0.18,0.7,true);
      expect(g).toBeTruthy();expect(g.userData.quartzR4.families).not.toContain('scar');
      const n=g.attributes.normal,up=new Set(),down=new Set();
      for(let i=0;i<n.count;i++) {
        const v=[n.getX(i),n.getY(i),n.getZ(i)];
        const key=(xs:number[])=>xs.map(x=>(Math.abs(x)<1e-5?0:x).toFixed(5)).join(',');
        if(v[1]>0.01)up.add(key(v));
        if(v[1]<-0.01)down.add(key([v[0],-v[1],-v[2]]));
      }
      expect(up.size).toBe(6);expect(down).toEqual(up);
      g.computeBoundingBox();expect(g.boundingBox.min.y).toBeCloseTo(-0.5,5);expect(g.boundingBox.max.y).toBeCloseTo(0.5,5);
    }
  });
  it('chamfers a closed cube but preserves a concave twin',()=>{
    const cube=new THREE.BoxGeometry(1,1,1),g=chamferCrystalGeometry(cube);
    expect(g).not.toBe(cube);expect(g.userData.chamferR4.faces).toBeGreaterThan(6);
    g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1,5);expect(size.y).toBeCloseTo(1,5);
    const twin=_buildHabitGeom('aragonite_pseudohex_twin');expect(chamferCrystalGeometry(twin)).toBe(twin);
  });
  it('interpolates custom vertex attributes on bevels without nonfinite values',()=>{
    const cube=new THREE.BoxGeometry(1,1,1).toNonIndexed();
    cube.setAttribute('testScalar',new THREE.Float32BufferAttribute(Array.from(cube.attributes.position.array as number[]).filter((_,i)=>i%3===1),1));
    const g=chamferCrystalGeometry(cube);
    expect(g.attributes.testScalar.count).toBe(g.attributes.position.count);
    for(let i=0;i<g.attributes.position.count;i++)expect(g.attributes.testScalar.getX(i)).toBeCloseTo(g.attributes.position.getY(i),5);
  });
  it('routes needle systems, cubic defaults, wire and double quartz in production',()=>{
    for(const [mineral,habit,key] of [
      ['rutile','acicular_needle','systemPrism'],['bismuthinite','acicular','systemPrism'],
      ['amosite','fibrous_asbestiform','systemPrism'],['native_silver','wire','nativeWire'],
      ['anthophyllite','fibrous_asbestiform','systemPrism'],['chrysotile','fibrous','systemPrism'],
      ['crocidolite','fibrous_asbestiform','systemPrism'],['annabergite','nickel_bloom_or_capillary','systemPrism'],
      ['pharmacolite','acicular','systemPrism'],['uranophane','radiating_fibrous_puffs','systemPrism'],
      ['austinite','acicular_sprays','systemPrism'],['caledonite','prismatic_acicular','systemPrism'],
      ['ferrimolybdite','acicular_tuft','systemPrism'],['shattuckite','acicular_tuft','systemPrism'],
      ['pectolite','spray_radiating','systemPrism'],['wollastonite','acicular_white','systemPrism'],
      ['quartz','doubly_terminated','quartzR4'],['aragonite','columnar','aragoniteR4']]) {
      const wall=new WallState({vug_diameter_mm:70,shape_seed:42});
      const c=new Crystal({mineral,habit,crystal_id:7,nucleation_step:1});
      Object.assign(c,{c_length_mm:8,a_width_mm:3,total_growth_um:8000,wall_anchor:wall._anchorFromRingCell(6,12)});
      const before=JSON.stringify([c.habit,c.zones,c.c_length_mm,c.a_width_mm]);
      const state={geomCache:new Map(),crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
      _topoSyncCrystalMeshes(state,{crystals:[c],step:100},wall);
      const body=state.crystals.children.find((m:any)=>m.geometry.userData[key]);expect(body,`${mineral}/${habit}`).toBeTruthy();
      if(mineral==='quartz')expect(body.geometry.userData.quartzR4.doubleEnded).toBe(true);
      if(mineral==='anthophyllite')expect(body.geometry.userData.systemPrism).toBe('orthorhombic');
      expect(JSON.stringify([c.habit,c.zones,c.c_length_mm,c.a_width_mm])).toBe(before);
    }
  });
  it('closes both ends of the curved silver wire',()=>{
    const g=makeNativeSilverWireGeometry(),p=g.attributes.position,n=g.attributes.normal;
    expect(p.count).toBe(n.count); expect(g.userData.nativeWire).toBe(true);
    for(const x of p.array)expect(Number.isFinite(x)).toBe(true);
    const endNormals=Array.from(n.array as number[]).slice(-60*3);
    expect(endNormals.length).toBe(180);
    const edges=new Map<string,number>();
    const key=(i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(x=>x.toFixed(5)).join(',');
    for(let i=0;i<p.count;i+=3)for(let j=0;j<3;j++) {
      const edge=[key(i+j),key(i+(j+1)%3)].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
    }
    expect([...edges.values()].every(n=>n===2)).toBe(true);
  });
  it('routes ordinary cubic defaults without turning native-metal aggregates into cubes',()=>{
    for(const [mineral,habit] of [['cobaltite','default_habit'],['awaruite','grains_microscopic']])
      expect(_resolveCrystalGeomToken({mineral,twinned:false},habit)).toBe('cube');
    for(const [mineral,habit] of [['native_gold','dendritic'],['native_copper','arborescent']])
      expect(_resolveCrystalGeomToken({mineral,twinned:false},habit)).toBe('spike');
  });
});
