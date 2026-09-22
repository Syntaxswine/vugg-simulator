import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {SpecimenRecorder,clone} from './specimen.js';
import {loadPilotModel,kernelFor,controlledInputs} from './capture.mjs';
import {runtimeExecutionDigest} from '../../tools/evidence-runtime.mjs';

const h=await loadPilotModel(),kernel=kernelFor(h),template=controlledInputs(h)[2];
// Explicit synthetic locality of 24 independent pairs, not a scientific run.
// One pair changes per step. The other 46 bodies must stay byte-identical.
const initial={step:3,source:{kind:'authored-zone-fixture',label:'48-body sparse-update benchmark'},crystals:[]};
for(let pair=0;pair<24;pair++)for(let member=0;member<2;member++){
  const c=clone(template.crystals[member]);c.id=pair*2+member+1;c.anchor[0]+=pair*10;initial.crystals.push(c);
}
const inputs=[initial];
for(let step=4;step<=19;step++){
  const frame=clone(inputs.at(-1));frame.step=step;
  // Authored geometry edits, not scientific growth. Both strategies get exact same inputs.
  const c=frame.crystals[(step-4)*2];c.cLengthMm+=.07;c.aWidthMm+=.02;
  inputs.push(frame);
}
function measure(retain){
  const recorder=new SpecimenRecorder(kernel),times=[];let compiled=0,signatures=[];
  const memoryBefore=process.memoryUsage();
  for(const input of inputs){
    const r=retain?recorder:new SpecimenRecorder(kernel),t=performance.now(),f=r.capture(input);
    times.push(performance.now()-t);if(!retain)compiled+=r.compilations;
    signatures.push(JSON.stringify(f.crystals.map(c=>({facts:c.facts,completion:c.completion,authority:c.authority}))));
  }
  const memoryAfter=process.memoryUsage();
  return {strategy:retain?'retained-compilation':'whole-specimen-recompilation',firstCompileMs:times[0],
    laterTotalMs:times.slice(1).reduce((a,b)=>a+b,0),compilations:retain?recorder.compilations:compiled,
    memoryBefore,memoryAfter,signatures};
}
const results=[];
for(const retain of [false,true,true,false])results.push(measure(retain));
for(const r of results)assert.deepEqual(r.signatures,results[0].signatures);
const sourceHashes={};
for(const name of ['specimen.js','capture.mjs','benchmark.mjs'])sourceHashes[name]=createHash('sha256').update(fs.readFileSync(new URL(name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
const receipt={schema:'calcite-pilot-sparse-benchmark-v1',sourceHashes,runtimeDigest:runtimeExecutionDigest(process.cwd()),runtime:process.version,platform:process.platform,
  scope:'Synthetic 48-body sparse changes; compares compiler strategies, NOT full shipped-game performance.',
  events:inputs.length,identicalFactsAndGeometry:true,
  memoryCaveat:'Process samples, affected by GC and harness; not peak or retained-memory measurements. Retained path keeps history; reference recreates frames.',
  results:results.map(({signatures,...r})=>r)};
fs.writeFileSync(new URL('./compiler-receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
