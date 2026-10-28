// Evidence about individual inclusions, never a replacement fluid recipe.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import data from './source.json' with {type:'json'};
import {canonicalJSON} from '../finite-reservoir-authority/contract.mjs';

const hash=x=>createHash('sha256').update(canonicalJSON(x)).digest('hex');
const clone=x=>JSON.parse(canonicalJSON(x));
const FILES=['source.json','observations.mjs','../finite-reservoir-authority/contract.mjs'];
const sourceBinding=()=>Object.fromEntries(FILES.map(file=>[file,createHash('sha256')
  .update(fs.readFileSync(new URL(file,import.meta.url),'utf8').replaceAll('\r\n','\n')).digest('hex')]));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function exact(x,keys,label){
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.length
    ||keys.some(k=>!Object.hasOwn(x,k)))throw Error(label+': complete exact fields required');
}
const NUMERIC=/^(?:0|[1-9]\d*)(?:\.\d+)?(?:E[+-]\d+)?$/;
export function parseReportedCell(raw){
  if(typeof raw!=='string')throw Error('Original table-cell text required; no implicit zero or unit conversion');
  if(raw==='')return freeze({raw,status:'not-reported',value:null,reportedUpperLimit:null,unit:'reported_ppm'});
  const censored=raw.startsWith('<'),token=censored?raw.slice(1):raw;
  if(!NUMERIC.test(token))throw Error('Unresolved source-cell notation; do not repair or infer a number');
  const n=Number(token);
  if(!Number.isFinite(n)||(n===0&&/[1-9]/.test(token.split('E')[0]))||(censored&&!(n>0)))
    throw Error('Source-cell value is not representable');
  return freeze({raw,status:censored?'reported-upper-limit':'reported-normalized-estimate',
    value:censored?null:n,reportedUpperLimit:censored?n:null,unit:'reported_ppm'});
}

const MISSING=['finite named source parcel amount and causal admission history',
  'commissioned absolute concentration basis and solvent mass fraction',
  'solvent/solution-volume relation and mixed-fluid constitutive law at stated T/P',
  'DIC, alkalinity, Fe, sulfur species and O2 for the required conserved state',
  'physical trapping state, connectivity/sealing and wet-cell/access allocation'];

export function observationIds(){return data.observations.map(o=>o.id);}
export function fluidObservation(id){
  if(typeof id!=='string')throw Error('One recorded inclusion identity required; no composite endmember');
  const row=data.observations.find(o=>o.id===id);if(!row)throw Error('Unknown individual inclusion');
  if(data.schema!=='vugg-mvt-fluid-observations-v1'||data.source.reportedUnit!=='reported_ppm'
    ||data.columns.join(',')!=='Li,Na,Mg,Cl,K,Ca,Mn,Cu,Zn,Br,Sr,Ba,Pb')throw Error('Source schema/column order changed');
  exact(row,['id','sample','inclusion','host','location','hostDescription','pdfPage','printedPage',
    'observedSizeUm','homogenizationC','salinityNaClEquivalentWtPercent','cells'],'source row');
  if(!['quartz','sphalerite'].includes(row.host)||!Array.isArray(row.cells)||row.cells.length!==data.columns.length
    ||!Array.isArray(row.observedSizeUm)||row.observedSizeUm.length!==2
    ||row.observedSizeUm.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<=0)
    ||!Number.isSafeInteger(row.inclusion)||row.inclusion<1)throw Error('Complete individual source row required');
  const elements=Object.fromEntries(data.columns.map((element,i)=>{
    const cell={...parseReportedCell(row.cells[i]),element};
    if(row.host==='sphalerite'&&['Cu','Zn'].includes(element)){
      if(cell.raw!=='')throw Error('Host-interfered source cells must remain unreported');
      cell.status='not-reported-host-interference';
    }else if(element==='Cl'){
      if(cell.status!=='reported-normalized-estimate')throw Error('Expected the reported derived Cl internal standard');
      cell.status='derived-internal-standard';
    }
    return [element,{...cell,dependsOn:cell.raw===''?[]:element==='Cl'
      ?['microthermometry','NaCl-H2O salinity interpretation','Cl internal-standard estimate']
      :['Cl internal-standard normalization','element sensitivity/background analysis']}];
  }));
  const temperature=parseReportedCell(row.homogenizationC),salinity=parseReportedCell(row.salinityNaClEquivalentWtPercent);
  if(temperature.status!=='reported-normalized-estimate'||salinity.status!=='reported-normalized-estimate'
    ||salinity.value>100)throw Error('Explicit reported microthermometry values required');
  const columnsForState={calciumMol:'Ca',dicMolC:null,ironMol:'Fe',zincMol:'Zn',leadMol:'Pb',
    sulfateMol:null,reducedSulfurMol:null,oxygenMol:null,sodiumMol:'Na',chlorideMol:'Cl',alkalinityEq:null};
  const requiredAnalysisSupport=Object.fromEntries(Object.entries(columnsForState).map(([key,element])=>[key,{
    element,status:elements[element]?.status??'not-reported-in-source-table',absoluteMoles:null}]));
  const payload={schema:'vugg-individual-fluid-observation-v1',id,source:clone(data.source),sourceBinding:sourceBinding(),
    locator:{table:2,pdfPage:row.pdfPage,printedPage:row.printedPage,sample:row.sample,inclusion:row.inclusion,
      host:row.host,location:row.location,hostDescription:row.hostDescription},
    microthermometry:{homogenization:{value:temperature.value,unit:'C',authority:'measured-homogenization',trappingTemperatureC:null},
      salinity:{value:salinity.value,unit:'wt_percent_NaCl_equivalent',authority:'microthermometry-model-derived',actualNaClMassFraction:null},
      observedSize:{value:row.observedSizeUm.slice(),unit:'um_in_two_observed_dimensions',fluidVolumeMm3:null}},
    elements,requiredAnalysisSupport,missingRequiredComponents:Object.entries(requiredAnalysisSupport)
      .filter(([,v])=>v.status.startsWith('not-reported')||v.status==='reported-upper-limit').map(([key])=>key),
    missingAuthority:MISSING.slice(),waterKg:null,absoluteComponentMoles:null,solutionDensityKgM3:null,
    prehistorySourceEligible:false,productionMappingAllowed:false,
    interpretation:'source constraints from one inclusion; no group pooling, endmember assignment, speciation or physical inventory inferred'};
  return freeze({...payload,recordDigest:hash(payload)});
}

// Ratios only within ONE recorded inclusion, on its common reported scale.
// Detection limits are censoring statements, not substituted concentrations.
export function reportedMassRatio(id,numerator,denominator){
  const observation=fluidObservation(id);
  if(typeof numerator!=='string'||typeof denominator!=='string'
    ||!Object.hasOwn(observation.elements,numerator)||!Object.hasOwn(observation.elements,denominator))
    throw Error('One pair of reported element columns required');
  const a=observation.elements[numerator],b=observation.elements[denominator];
  const result={schema:'vugg-reported-inclusion-mass-ratio-v1',observationId:id,
    observationDigest:observation.recordDigest,numerator,denominator,unit:'reported_mass_ratio',
    commonNormalization:'same-inclusion Cl scale cancels; sensitivity, censoring and rounding uncertainties remain',
    uncertainty:null,status:'unresolved',value:null,reportedUpperLimit:null};
  if(b.value===null||!(b.value>0))return freeze({...result,reason:'denominator is unreported, censored or zero'});
  const n=a.value??a.reportedUpperLimit;
  if(n===null)return freeze({...result,reason:'numerator is unreported'});
  const ratio=n/b.value;
  if(!Number.isFinite(ratio)||(n!==0&&ratio===0))throw Error('Unrepresentable ratio');
  return freeze({...result,status:a.value===null?'reported-upper-limit':'ratio-of-reported-estimates',
    value:a.value===null?null:ratio,reportedUpperLimit:a.value===null?ratio:null});
}
export function requirePhysicalFluidSource(id){
  const x=fluidObservation(id);
  throw Error('MVT fluid-source authority HOLD for '+x.id+': '+x.missingAuthority.join('; '));
}
export function serializeFluidObservation(observation){
  const expected=fluidObservation(observation?.id);
  if(canonicalJSON(expected)!==canonicalJSON(observation))throw Error('Observation differs from its single source-bound row');
  return JSON.stringify({schema:'vugg-fluid-observation-checkpoint-v1',id:expected.id,
    recordDigest:expected.recordDigest,sourceBinding:expected.sourceBinding});
}
export function restoreFluidObservation(text){
  if(typeof text!=='string')throw Error('Complete checkpoint text required');
  const saved=JSON.parse(text);exact(saved,['schema','id','recordDigest','sourceBinding'],'observation checkpoint');
  const observation=fluidObservation(saved.id);
  if(saved.schema!=='vugg-fluid-observation-checkpoint-v1'||saved.recordDigest!==observation.recordDigest
    ||canonicalJSON(saved.sourceBinding)!==canonicalJSON(observation.sourceBinding))throw Error('Source/row binding changed');
  return observation;
}
