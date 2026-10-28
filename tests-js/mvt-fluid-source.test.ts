import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import source from '../pilots/mvt-fluid-source/source.json';
import {parseReportedCell,observationIds,fluidObservation,reportedMassRatio,requirePhysicalFluidSource,
  serializeFluidObservation,restoreFluidObservation} from '../pilots/mvt-fluid-source/observations.mjs';
import {buildFluidObservationReceipt} from '../pilots/mvt-fluid-source/receipt.mjs';
import {compilePrehistory} from '../pilots/mvt-prehistory/history.mjs';
import {controlInput} from '../pilots/mvt-prehistory/control-fixture.mjs';

const CARTERVILLE='TSCV-1-1-A-1',PICHER='TSPC-1-1-A-1',BAXTER='TSBS-4-6-A-3';

describe('original inclusion cells remain evidence with explicit authority',()=>{
  it('distinguishes a reported estimate, a detection limit, an empty cell and an explicit reported zero',()=>{
    expect(parseReportedCell('1.2E+04')).toMatchObject({status:'reported-normalized-estimate',value:12000});
    expect(parseReportedCell('<1.1E+00')).toMatchObject({status:'reported-upper-limit',value:null,reportedUpperLimit:1.1});
    expect(parseReportedCell('')).toMatchObject({status:'not-reported',value:null,reportedUpperLimit:null});
    expect(parseReportedCell('0')).toMatchObject({status:'reported-normalized-estimate',value:0});
  });
  it.each([null,undefined,0,' ','<0','NaN','-1','< 1','1,000','1.5E_03','1E+9999','1E-9999'])('refuses invented or unrepresentable table notation %j',raw=>{
    expect(()=>parseReportedCell(raw)).toThrow();
  });
  it('retains one sample, host, locality and table row per record instead of pooling endmembers',()=>{
    expect(observationIds()).toEqual([CARTERVILLE,PICHER,BAXTER]);
    const a=fluidObservation(CARTERVILLE),b=fluidObservation(BAXTER);
    expect(a.locator).toMatchObject({table:2,pdfPage:10,printedPage:1420,sample:'TSCV 1-1 A',inclusion:1,host:'quartz'});
    expect(b.locator).toMatchObject({pdfPage:11,sample:'TSBS 4-6 A',inclusion:3,host:'sphalerite'});
    expect(a.source.pdfSha256).toBe('f32d39f552e22b76d6343bddc7000c5161bec6e20d9bd105e3680be2d9c86709');
    expect(()=>fluidObservation([CARTERVILLE,BAXTER])).toThrow('One recorded');
    expect(()=>fluidObservation('district-average')).toThrow('Unknown');
  });
  it('binds every quantified element to the shared derived chloride normalization',()=>{
    const x=fluidObservation(CARTERVILLE);
    expect(x.elements.Cl).toMatchObject({status:'derived-internal-standard',value:140000});
    expect(x.elements.Cl.dependsOn).toContain('NaCl-H2O salinity interpretation');
    expect(x.elements.Na.dependsOn).toContain('Cl internal-standard normalization');
    expect(x.source.chlorideNormalization.uncertaintyMeaning).toContain('not a hard bound');
  });
  it('preserves the actual K blank while retaining the adjacent Ca cell in Picher quartz',()=>{
    const x=fluidObservation(PICHER);
    expect(x.elements.K).toMatchObject({raw:'',status:'not-reported',value:null});
    expect(x.elements.Ca).toMatchObject({raw:'1.2E+04',value:12000});
    expect(x.elements.Zn).toMatchObject({value:null,reportedUpperLimit:1.1});
    expect(x.elements.Pb).toMatchObject({value:null,reportedUpperLimit:0.84});
  });
  it('does not turn sphalerite matrix interference into zero aqueous Cu or Zn',()=>{
    const x=fluidObservation(BAXTER);
    for(const element of ['Cu','Zn'])expect(x.elements[element])
      .toMatchObject({raw:'',status:'not-reported-host-interference',value:null,reportedUpperLimit:null});
    expect(x.elements.Pb.value).toBe(95);expect(x.elements.K.value).toBeNull();
    expect(x.missingRequiredComponents).toContain('zincMol');
  });
  it('preserves the difference between homogenization, trapping state, equivalent salinity and physical fluid volume',()=>{
    const x=fluidObservation(PICHER);
    expect(x.microthermometry.homogenization).toMatchObject({value:51,unit:'C',trappingTemperatureC:null});
    expect(x.microthermometry.salinity).toMatchObject({value:16,actualNaClMassFraction:null});
    expect(x.microthermometry.observedSize).toMatchObject({value:[74,45],fluidVolumeMm3:null});
    expect(x.solutionDensityKgM3).toBeNull();expect(x.waterKg).toBeNull();
  });
});

describe('same-inclusion reported ratios preserve censoring',()=>{
  it.each([[CARTERVILLE,14000/81000],[PICHER,12000/55000],[BAXTER,15000/75000]])('computes Ca/Na only on the common reported scale for %s',(id,expected)=>{
    const x=reportedMassRatio(id,'Ca','Na');
    expect(x.status).toBe('ratio-of-reported-estimates');expect(x.value).toBe(expected);
    expect(x.unit).toBe('reported_mass_ratio');expect(x.uncertainty).toBeNull();
    expect(x.commonNormalization).toContain('uncertainties remain');
  });
  it('retains a censored numerator as a reported bound, without substituting a concentration',()=>{
    const x=reportedMassRatio(CARTERVILLE,'Cu','Pb');
    expect(x.status).toBe('reported-upper-limit');expect(x.value).toBeNull();
    expect(x.reportedUpperLimit).toBe(2.6/0.68);
  });
  it('does not divide two detection limits into a fictitious Zn/Pb estimate',()=>{
    const x=reportedMassRatio(PICHER,'Zn','Pb');
    expect(x.status).toBe('unresolved');expect(x.value).toBeNull();expect(x.reportedUpperLimit).toBeNull();
  });
  it('refuses a ratio with an unreported numerator or denominator and unknown column names',()=>{
    expect(reportedMassRatio(BAXTER,'Zn','Pb').status).toBe('unresolved');
    expect(reportedMassRatio(PICHER,'Ca','K').status).toBe('unresolved');
    for(const column of ['Fe','constructor','__proto__','toString']){
      expect(()=>reportedMassRatio(CARTERVILLE,column,'Na')).toThrow('reported element');
      expect(()=>reportedMassRatio(CARTERVILLE,'Ca',column)).toThrow('reported element');
    }
  });
});

describe('source-bound records cannot initialize finite fluid stocks',()=>{
  it.each([CARTERVILLE,PICHER,BAXTER])('keeps %s ineligible despite its reported solutes',id=>{
    const x=fluidObservation(id);
    for(const field of ['dicMolC','alkalinityEq','ironMol','sulfateMol','reducedSulfurMol','oxygenMol'])
      expect(x.requiredAnalysisSupport[field].status).toBe('not-reported-in-source-table');
    expect(x.absoluteComponentMoles).toBeNull();expect(x.prehistorySourceEligible).toBe(false);
    expect(()=>requirePhysicalFluidSource(id)).toThrow('MVT fluid-source authority HOLD');
    const input=controlInput();input.reservoirs=[x];expect(()=>compilePrehistory(input)).toThrow('complete explicit fields');
  });
  it('reconstructs each immutable observation from source-bound identity without replaying growth or adopting edited fields',()=>{
    for(const id of observationIds()){
      const x=fluidObservation(id),saved=serializeFluidObservation(x);
      expect(restoreFluidObservation(saved)).toEqual(x);
      expect(()=>{x.elements.Na.value=1;}).toThrow();
      const fake=JSON.parse(JSON.stringify(x));fake.waterKg=1;
      expect(()=>serializeFluidObservation(fake)).toThrow('single source-bound row');
      for(const key of ['id','recordDigest','sourceBinding']){
        const changed=JSON.parse(saved);changed[key]=key==='sourceBinding'?{}:'changed';
        expect(()=>restoreFluidObservation(JSON.stringify(changed))).toThrow();
      }
      const alias=JSON.parse(saved);alias.mgPerKgSolvent=1;
      expect(()=>restoreFluidObservation(JSON.stringify(alias))).toThrow('exact fields');
    }
  });
  it('retains the PDF token packet and original blank columns without inventing complete chemistry',()=>{
    const check=JSON.parse(fs.readFileSync('pilots/mvt-fluid-source/source-check.json','utf8'));
    expect(check.pdfSha256).toBe(source.source.pdfSha256);expect(check.rows).toHaveLength(3);
    expect(check.rows.map((r:any)=>r.id)).toEqual(observationIds());
    expect(source.observations.map(row=>row.cells.length)).toEqual([13,13,13]);
    expect(source.observations[1].cells[4]).toBe('');expect(source.observations[1].cells[5]).toBe('1.2E+04');
  });
  it('reproduces the commissioned source/runtime receipt with production and registered science producers unchanged',()=>{
    const x=buildFluidObservationReceipt();
    expect(x).toEqual(JSON.parse(fs.readFileSync('pilots/mvt-fluid-source/receipt.json','utf8')));
    expect(x.cellStatusCounts).toEqual({'reported-upper-limit':11,'reported-normalized-estimate':21,
      'derived-internal-standard':3,'not-reported':2,'not-reported-host-interference':2});
    expect(x.registeredProducerContractsUnchanged).toBe(true);
    expect(x.productionMappingAllowed).toBe(false);expect(x.productionReactions).toBe(false);expect(x.transport).toBe(false);
  });
});
