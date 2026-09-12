import { describe, expect, it } from 'vitest';
declare const survivingGrowthLayers:any, colourCrystalAtStep:any, currentSurfaceFilm:any;
declare const chemistryAbsorptionHistory:any;
declare const colourHistorySignature:any, resolveBodyColour:any, MINERAL_SPEC:any, _bodyFieldVal:any;
declare const filmWithOperation:any, filmWithoutOperation:any, _parseBodyTrigger:any;

describe('R7 recorded colour causes', () => {
  it('does not invent interfaces when homogeneous material is split into many zones', () => {
    const one={mineral:'sphalerite',zones:[{step:1,thickness_um:1600,trace_Fe:50000}]};
    const many={mineral:'sphalerite',zones:Array.from({length:16},(_,i)=>({step:i+1,thickness_um:100,trace_Fe:50000}))};
    expect(chemistryAbsorptionHistory(one).bins).toEqual(chemistryAbsorptionHistory(many).bins);
    expect(_bodyFieldVal({zones:[{thickness_um:1,trace_Fe:100000},{thickness_um:99}]},'Fe')).toBeNull();
  });
  it('retains original layers, partially retreats, and never revives a removed chemical shell', () => {
    const c = {mineral:'sphalerite',zones:[{step:1,thickness_um:2000,trace_Fe:40},
      {step:2,thickness_um:3000,trace_Fe:100000},{step:3,thickness_um:-2000},
      {step:4,thickness_um:-2000},{step:5,thickness_um:3000,trace_Fe:40}]};
    expect(survivingGrowthLayers(c,3).map((l:any)=>l.thickness)).toEqual([2000,1000]);
    expect(survivingGrowthLayers(c,3)[1].zone).toBe(c.zones[1]);
    expect(_bodyFieldVal(colourCrystalAtStep(c,3),'Fe')).toBeCloseTo(100080/3,5);
    expect(_bodyFieldVal(c,'Fe')).toBe(40);
    expect(chemistryAbsorptionHistory(c,4).bins).toEqual(chemistryAbsorptionHistory({mineral:'sphalerite',zones:[{step:1,thickness_um:1000,trace_Fe:40}]}).bins);
  });

  it('does not back-project current radiation, invent chromophores, or parse half a cause', () => {
    const crystal = {mineral:'quartz', radiation_damage:.7,zones:[{step:1,thickness_um:2000,trace_Al:2}]};
    const before = resolveBodyColour(colourCrystalAtStep(crystal,1),MINERAL_SPEC.quartz);
    const bare = resolveBodyColour({mineral:'quartz',zones:[]},MINERAL_SPEC.quartz);
    expect(before).toBe(bare);
    expect(resolveBodyColour(crystal,MINERAL_SPEC.quartz)).not.toBe(before);
    expect(resolveBodyColour({...crystal,zones:[]},MINERAL_SPEC.quartz)).toBe(bare);
    expect(_parseBodyTrigger('Fe > 2 and undocumented heat treatment')).toBeNull();
  });

  it('leaves missing or ppm-level Fe pale and creates no zoning for unsupported chemistry', () => {
    const base = {mineral:'sphalerite',zones:[]};
    expect(resolveBodyColour({...base,zones:[{thickness_um:1,trace_Fe:40}]},MINERAL_SPEC.sphalerite))
      .toBe(resolveBodyColour(base,MINERAL_SPEC.sphalerite));
    expect(chemistryAbsorptionHistory({mineral:'quartz',zones:[{step:1,thickness_um:1,trace_Fe:100}]})).toBeNull();
  });

  it('invalidates partial-history colour when an outer known layer changes at equal size', () => {
    const c={mineral:'sphalerite',zones:[{step:1,thickness_um:1000},{step:2,thickness_um:1000,trace_Fe:10000}]};
    const before=colourHistorySignature(c), early=colourHistorySignature(c,1);
    const bins=chemistryAbsorptionHistory(c).bins;
    expect(_bodyFieldVal(c,'Fe')).toBeNull();
    c.zones[1].trace_Fe=120000;
    expect(chemistryAbsorptionHistory(c).bins).not.toEqual(bins);
    expect(colourHistorySignature(c)).not.toBe(before);
    expect(colourHistorySignature(c,1)).toBe(early);
    expect(chemistryAbsorptionHistory(c).known_fraction).toBe(.5);
  });

  it('remembers current film contributors, removes liberated contributions and withholds replay guesses', () => {
    let film = filmWithOperation(null,{kind:'dust-max',source_id:'dust',mineral:'clay',step:1,phi_term:.4,phi_prism:.2});
    film = filmWithOperation(film,{kind:'enclosure-add',source_id:'guest',mineral:'hematite',step:2,phi_term:.2,phi_prism:0});
    const c = {_film:film};
    const current = currentSurfaceFilm(c);
    expect(current.minerals).toEqual(['clay','hematite']);
    expect(current.term).toBeCloseTo(.6,6);
    expect(currentSurfaceFilm(c,1)).toBeNull();
    const removal=filmWithoutOperation(film,'guest');
    expect(currentSurfaceFilm({_film:removal.film}).minerals).toEqual(['clay']);
    expect(currentSurfaceFilm({_film:null})).toBeNull();
    expect(currentSurfaceFilm({_film:filmWithOperation(null,{kind:'dust-max',source_id:'b',mineral:'barite',step:1,phi_term:.3,phi_prism:0})})).toBeNull();
  });
});
