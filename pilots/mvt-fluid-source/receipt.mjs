import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import data from './source.json' with {type:'json'};
import {buildSourceAudit} from '../finite-reservoir-authority/audit.mjs';
import {observationIds,fluidObservation,reportedMassRatio,serializeFluidObservation,restoreFluidObservation} from './observations.mjs';

const ROOT='pilots/mvt-fluid-source/';
const hash=file=>createHash('sha256').update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')).digest('hex');
export function buildFluidObservationReceipt(){
  const audit=buildSourceAudit(),counts={};
  const observations=observationIds().map(id=>{
    const x=fluidObservation(id);assert.deepEqual(restoreFluidObservation(serializeFluidObservation(x)),x);
    for(const cell of Object.values(x.elements))counts[cell.status]=(counts[cell.status]??0)+1;
    return {id,recordDigest:x.recordDigest,locator:x.locator,microthermometry:x.microthermometry,
      elements:Object.fromEntries(Object.entries(x.elements).map(([key,v])=>[key,{
        raw:v.raw,status:v.status,value:v.value,reportedUpperLimit:v.reportedUpperLimit,unit:v.unit}])),
      requiredAnalysisSupport:x.requiredAnalysisSupport,missingRequiredComponents:x.missingRequiredComponents,
      missingAuthority:x.missingAuthority,waterKg:x.waterKg,absoluteComponentMoles:x.absoluteComponentMoles,
      prehistorySourceEligible:false,productionMappingAllowed:false};
  });
  const ratios=observationIds().flatMap(id=>[['Ca','Na'],['Zn','Pb'],['Cu','Pb']]
    .map(([a,b])=>reportedMassRatio(id,a,b)));
  const sourceFiles=['source.json','observations.mjs','receipt.mjs','reference.py','source-check.json'].map(f=>ROOT+f);
  return {schema:'vugg-mvt-fluid-observation-receipt-v1',base:'cb1965fcb686ca852a9771303f6bbb1c0b8b3035',
    runtime:audit.runtime,productionExecutionDigest:audit.productionExecutionDigest,
    registeredProducerContractsUnchanged:audit.registeredProducerContractsUnchanged,
    productionSourceHashes:audit.sourceHashes,
    sourceHashes:Object.fromEntries([...sourceFiles,'tests-js/mvt-fluid-source.test.ts','.github/workflows/ci.yml'].map(f=>[f,hash(f)])),
    primarySource:data.source,columns:data.columns,observations,cellStatusCounts:counts,ratios,
    sourceVerification:'Retained SHA-pinned PDF inspected locally and numerical row sequence re-extracted; CI replays the retained source-check packet and arithmetic, not a fresh PDF download. Blank column placement was visually checked.',
    scope:'three individual source constraints; no averaged/composite endmember, fluid EOS, physical inventory, scenario or production change',
    productionMappingAllowed:false,productionReactions:false,transport:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=buildFluidObservationReceipt(),serialized=JSON.stringify(result,null,2)+'\n',output=ROOT+'receipt.json';
  if(process.argv.includes('--write'))fs.writeFileSync(output,serialized);
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(output,'utf8').replaceAll('\r\n','\n'),serialized,'Fluid observation receipt is stale');
  console.log(JSON.stringify({observations:result.observations.length,cellStatusCounts:result.cellStatusCounts,
    ratios:result.ratios.length,productionMappingAllowed:false}));
}
