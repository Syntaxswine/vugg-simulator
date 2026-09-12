import {describe,it,expect,vi} from 'vitest';
declare const Crystal:any, GrowthZone:any, VugSimulator:any, SCENARIOS:any;
declare const applyFilmDusting:any, _applyAcceptedCrystalMutations:any, surfaceHistoryAtStep:any;
declare const validateSurfaceHistory:any, maskedHorizonBands:any, currentSurfaceFilm:any;
declare const filmWithOperation:any, filmWithoutOperation:any, recordSurfaceFilmOperation:any, recordSurfaceFilmLiberation:any;
declare const surfaceHistoryPanel:any, setSeed:any, _simulationCrystalProjection:any;
declare const THREE:any, _o5EmitMaskedBands:any;
const copy=(v:any)=>JSON.parse(JSON.stringify(v));
function zone(c:any,step:number,thickness:number,burial=false,extra:any={}) {
  const z=new GrowthZone({step,temperature:100,thickness_um:thickness,growth_rate:thickness});
  Object.assign(z,{_time_scaled:true,...extra});
  if(burial) Object.assign(z,{masked_horizon:true,film_mineral:c._film?.mineral,
    originating_film_step:c._film?.step,masked_phi_term:c._film?.phi_term,
    masked_phi_prism:c._film?.phi_prism,_clear_film_on_accept:true});
  _applyAcceptedCrystalMutations(c,z); c.add_zone(z); return z;
}
function crystal() {const c=new Crystal({crystal_id:7,mineral:'quartz',habit:'prismatic',nucleation_step:0});zone(c,1,100);return c;}
function dust(c:any,step:number,mineral='chlorite',term=.3,prism=.6) {applyFilmDusting([c],mineral,term,prism,step);}
function cycle() {const c=crystal();dust(c,2);zone(c,3,100,true);dust(c,4,'hematite',.5,.1);zone(c,5,100,true);return c;}

describe('dated surface observations, not an invented coating survival law',()=>{
  it('replays actual deposition, positive burial and immutable earlier views',()=>{
    const c=cycle(), saved=copy(c._surfaceHistory);
    expect(validateSurfaceHistory(saved,c.zones)).toBe(true);
    expect(surfaceHistoryAtStep(c,1)).toBeNull();
    expect(currentSurfaceFilm(c,2)).toMatchObject({minerals:['chlorite'],term:.3,prism:.6});
    expect(currentSurfaceFilm(c,3)).toBeNull();
    expect(maskedHorizonBands(c,3)).toMatchObject([{frac:.5,mineral:'chlorite',horizon_id:2}]);
    const early=surfaceHistoryAtStep(c,3);
    zone(c,6,-220);
    expect(surfaceHistoryAtStep(c,3)).toEqual(early);
    expect(c._surfaceHistory.events.slice(0,saved.events.length)).toEqual(saved.events);
    const after=surfaceHistoryAtStep(c,6);
    expect(after.horizons.map((h:any)=>h.status)).toEqual(['no-longer-enclosed','no-longer-enclosed']);
    expect(after.horizons.every((h:any)=>h.coating_fate==='unrecorded')).toBe(true);
    expect(c._film).toBeNull(); expect(maskedHorizonBands(c,6)).toEqual([]);
    zone(c,7,400); expect(maskedHorizonBands(c)).toEqual([]);
    expect(currentSurfaceFilm(c,7)).toBeNull();
  });
  it('distinguishes boundary equality, crossing and regrowth without claiming surviving grains',()=>{
    const c=cycle();zone(c,6,-100);
    expect(surfaceHistoryAtStep(c).horizons.map((h:any)=>h.status)).toEqual(['buried','boundary-reached']);
    expect(maskedHorizonBands(c)).toHaveLength(1);
    zone(c,7,50);expect(maskedHorizonBands(c)).toHaveLength(1);
    zone(c,8,-100);
    expect(surfaceHistoryAtStep(c).horizons[1].status).toBe('no-longer-enclosed');
    expect(c._film).toBeNull();
  });
  it('orders repeated same-step source IDs and records zero effective MAX additions',()=>{
    const c=crystal();dust(c,2);dust(c,2,'chlorite',.1,.2);zone(c,2,50,true);dust(c,2,'chlorite',.2,.2);
    const h=surfaceHistoryAtStep(c,2);
    expect(h.events.map((e:any)=>e.seq)).toEqual([1,2,3,4]);
    expect(h.events[0].operation.source_id).toBe(h.events[1].operation.source_id);
    expect(h.events[1].coverage_change).toEqual({term:0,prism:0});
    expect(h.events.map((e:any)=>e.zone_count)).toEqual([1,1,2,2]);
    expect(h.horizons[0].film.operations).toHaveLength(2);
    expect(h.film.phi_term).toBe(.2);
  });
  it('buries all contributors and liberation cannot erase an older buried source',()=>{
    const c=crystal();dust(c,2);
    const op={kind:'enclosure-add',source_id:'guest:8',mineral:'hematite',step:2,phi_term:.15,phi_prism:0};
    const before=c._film;c._film=filmWithOperation(before,op);recordSurfaceFilmOperation(c,op,before);
    const composed=copy(c._film);zone(c,3,100,true);
    const removal=filmWithoutOperation(c._film,op.source_id), pre=c._film;
    c._film=removal.film;recordSurfaceFilmLiberation(c,4,op.source_id,pre,removal);
    expect(surfaceHistoryAtStep(c).horizons[0].film).toEqual(composed);
    expect(surfaceHistoryAtStep(c).events.at(-1)).toMatchObject({event:'liberated',found:false,coverage_change:{term:0,prism:0}});
  });
  it('a zero/state-overprint or rejected candidate cannot clear or bury a coating',()=>{
    const c=crystal();dust(c,2);const film=copy(c._film), ledger=copy(c._surfaceHistory);
    for(const extra of [{},{state_overprint:true}]) {
      const z:any={step:3,thickness_um:0,_clear_film_on_accept:true,...extra};
      _applyAcceptedCrystalMutations(c,z);
      expect(c._film).toEqual(film);expect(z).not.toHaveProperty('_surfaceBurialPending');
    }
    expect(c._surfaceHistory).toEqual(ledger);
    const z=zone(c,4,12,true);expect(z).not.toHaveProperty('_surfaceBurialPending');
    expect(z).not.toHaveProperty('_clear_film_on_accept');
    expect(surfaceHistoryAtStep(c).horizons[0].depth_um).toBe(100);
  });
  it('observes legacy coverage without inventing its deposition date',()=>{
    const c=crystal();c._film={mineral:'clay',phi_term:.1,phi_prism:.2};
    expect(surfaceHistoryAtStep(c,1)).toBeNull();dust(c,8);
    expect(surfaceHistoryAtStep(c,7)).toBeNull();
    expect(c._surfaceHistory.initial).toMatchObject({step:8,film:{mineral:'clay'}});
    expect(c._surfaceHistory.events).toHaveLength(1);
    expect(c._surfaceHistory.events[0].event).toBe('dusting');
  });
  it('withholds chronology after an unobserved mutation and preserves the explicit unknown marker',()=>{
    const c=crystal();dust(c,2);c._film=null;dust(c,3,'hematite');
    expect(c._surfaceHistory.unavailable.reason).toBe('observation-gap');
    expect(validateSurfaceHistory(c._surfaceHistory,c.zones)).toBe(true);
    expect(surfaceHistoryAtStep(c,2)).toBeNull();expect(maskedHorizonBands(c)).toEqual([]);
  });
  it('fails closed at the event bound, retaining a bounded incomplete prefix',()=>{
    const c=crystal();dust(c,2,'chlorite',0,0);
    const e=copy(c._surfaceHistory.events[0]);
    c._surfaceHistory.events=Array.from({length:20_000},(_,i)=>({...copy(e),seq:i+1}));
    dust(c,3);
    expect(c._surfaceHistory.events).toHaveLength(20_000);
    expect(c._surfaceHistory.unavailable.reason).toBe('event-limit');
    expect(validateSurfaceHistory(c._surfaceHistory,c.zones)).toBe(true);
    expect(surfaceHistoryAtStep(c)).toBeNull();
  });
  it('rejects causal tampering, including removed burial/retreat and inconsistent initial coverage',()=>{
    const c=cycle();zone(c,6,-220);zone(c,7,400);
    for(const alter of [
      (h:any)=>h.events.splice(1,1),
      (h:any)=>h.events.splice(4,1),
      (h:any)=>{h.events[1].horizon_um=50;},
      (h:any)=>{h.events[0].step=5;h.events[0].operation.step=5;},
      (h:any)=>{h.events[0].coverage_change.term=.9;},
      (h:any)=>{h.events[1].accepted_zone_index=0;},
      (h:any)=>{h.initial.film={mineral:'clay',phi_term:.5,phi_prism:.5,operations:[]};},
    ]) {
      const h=copy(c._surfaceHistory);alter(h);h.events.forEach((e:any,i:number)=>e.seq=i+1);
      expect(validateSurfaceHistory(h,c.zones)).toBe(false);
      expect(maskedHorizonBands({...c,_surfaceHistory:h})).toEqual([]);
    }
  });
  it('rejects guest liberation that tries to remove a dusting directive',()=>{
    const c=crystal();dust(c,2);
    c._surfaceHistory.events.push({seq:2,step:3,zone_count:1,surface_um:100,event:'liberated',
      source_id:c._surfaceHistory.events[0].operation.source_id,found:true,coverage_change:{term:-.3,prism:-.6}});
    expect(validateSurfaceHistory(c._surfaceHistory,c.zones)).toBe(false);
  });
  it('leaves unsupported clear-mineral coatings unpainted in replay',()=>{
    const c=crystal();dust(c,2,'barite');expect(currentSurfaceFilm(c,2)).toBeNull();
    zone(c,3,50,true);expect(maskedHorizonBands(c)[0].film.mineral).toBe('barite');
  });
  it('records without consuming shared RNG or changing the old scientific projection',()=>{
    const c=crystal(), baseline=_simulationCrystalProjection(c);
    const rng=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Observer consumed RNG');});
    try {dust(c,2);zone(c,3,20,true);surfaceHistoryAtStep(c);}
    finally {rng.mockRestore();}
    const projection=_simulationCrystalProjection(c), stripped=copy(c);delete stripped._surfaceHistory;
    expect(_simulationCrystalProjection(stripped)).toEqual(projection);
    expect(projection).not.toEqual(baseline);
  });
  it('renders recorded class coverage and withholds unknown material without changing host geometry',()=>{
    const c=crystal();dust(c,2,'chlorite',.8,0);zone(c,3,100,true);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshPhysicalMaterial({transmission:.5}));
    const positions=Array.from(mesh.geometry.attributes.position.array);
    _o5EmitMaskedBands(mesh,c,null,3);
    const band=mesh.children[0];expect(band.userData.surfaceHistory.coverage).toMatchObject({term:.8,prism:0});
    expect(band.material.transparent).toBe(false);
    expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(positions);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    band.material.onBeforeCompile(shader);
    expect(shader.uniforms.surfaceHorizonCoverage.value.toArray()).toEqual([0,.8]);
    const unsupported=crystal();dust(unsupported,2,'barite');zone(unsupported,3,100,true);
    const clear=new THREE.Mesh(mesh.geometry,mesh.material);_o5EmitMaskedBands(clear,unsupported,null,3);
    expect(clear.children).toHaveLength(0);
  });
  it('shows honest, text-safe dated testimony in the specimen history panel',()=>{
    const c=cycle();zone(c,6,-220);
    const panel=surfaceHistoryPanel(c);
    expect(panel.textContent).toContain('Step 3');
    expect(panel.textContent).toContain('fate is unrecorded');
    expect(surfaceHistoryPanel(crystal()).textContent).toContain('No dated coating history');
  });
  it('captures real accepted scenario breakthroughs rather than only fixture flags',()=>{
    setSeed(42);const s=SCENARIOS.mvt(),sim=new VugSimulator(s.conditions,s.events),c=sim.nucleate('calcite');
    zone(c,0,500);applyFilmDusting([c],'clay',.01,.01,0);
    for(let i=0;i<30 && !c.zones.some((z:any)=>z.masked_horizon);i++)sim.run_step();
    expect(c.zones.some((z:any)=>z.masked_horizon && z.thickness_um>0)).toBe(true);
    expect(validateSurfaceHistory(c._surfaceHistory,c.zones)).toBe(true);
    expect(c._surfaceHistory.events.some((e:any)=>e.event==='buried')).toBe(true);
    expect(c.zones.every((z:any)=>!Object.hasOwn(z,'_surfaceBurialPending'))).toBe(true);
  });
  it('observes the real enclosure and liberation producers without erasing another contributor',()=>{
    setSeed(42);const s=SCENARIOS.mvt(),sim=new VugSimulator(s.conditions,s.events);
    const ring=Math.floor(sim.wall_state.ring_count/2);
    const place=(c:any,growth:number)=>{
      c.wall_anchor=sim.wall_state._anchorFromRingCell(ring,10);
      c.total_growth_um=growth;c.c_length_mm=growth/1000;
      c.zones=[{step:0,thickness_um:growth-1.5},{step:1,thickness_um:.5},
        {step:2,thickness_um:.5},{step:3,thickness_um:.5}];return c;
    };
    const host=place(sim.nucleate('calcite'),9000);
    const guest=place(sim.nucleate('chalcopyrite',`on calcite #${host.crystal_id}`),100);
    sim.step=4;zone(host,4,1);dust(host,4,'clay',.2,.4);sim._check_enclosure();
    expect(guest.coats_front).toBe(true);
    expect(surfaceHistoryAtStep(host).events.at(-1).event).toBe('front-coating');
    const source=guest.enclosure_receipt.front_film_operation_id;
    sim.step=5;zone(host,5,-5000);sim._check_liberation();
    const h=surfaceHistoryAtStep(host);
    expect(h.events.at(-1)).toMatchObject({event:'liberated',source_id:source,found:true});
    expect(h.film.phi_term).toBe(.2);expect(h.film.phi_prism).toBe(.4);
    expect(h.film.operations.map((op:any)=>op.mineral)).toEqual(['clay']);
  });
});
