import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { SpecimenRecorder } from './specimen.js';
import { loadPilotModel,kernelFor,controlledInputs,captureLive } from './capture.mjs';
import {assertCommissionedEvidenceRuntime,runtimeExecutionDigest} from '../../tools/evidence-runtime.mjs';

assertCommissionedEvidenceRuntime();
const h=await loadPilotModel(),kernel=kernelFor(h);
const controlled=new SpecimenRecorder(kernel);
for(const input of controlledInputs(h))controlled.capture(input);
const live=new SpecimenRecorder(kernel);
// Explicit existing option, not a new face-growth law. Both comparison runs use it.
function run(capture) {
  h.setSeed(42);
  const scenario=h.SCENARIOS.elmwood(); scenario.conditions.wall.wulff_calcite=true;
  const start=performance.now();
  const sim=new h.VugSimulator(scenario.conditions,scenario.events);
  let growthMs=0,captureMs=0;const stepFingerprints=[];
  for(let i=0;i<16;i++) {
    let t=performance.now(); sim.run_step(); growthMs+=performance.now()-t;
    const beforeCapture=h.simulationStateFingerprint(sim);
    if(capture) {
      t=performance.now();
      live.capture(captureLive(h,sim,{scenario:'elmwood',seed:42,wulffCalcite:true}));
      captureMs+=performance.now()-t;
      if(beforeCapture!==h.simulationStateFingerprint(sim))throw Error(`Capture mutated step ${sim.step}`);
    }
    stepFingerprints.push(beforeCapture);
  }
  return {growthMs,captureMs,totalMs:performance.now()-start,
    fingerprint:h.simulationStateFingerprint(sim),stepFingerprints,crystals:sim.crystals.length};
}
const before=run(false),after=run(true);
if(JSON.stringify(before.stepFingerprints)!==JSON.stringify(after.stepFingerprints))throw Error('Capture changed simulation trajectory');
const hashes={};
for(const name of ['js/27-geometry-crystal.ts','js/45-morphology.ts','js/46-wulff-geometry.ts','js/99i-renderer-three.ts','pilots/calcite/specimen.js','pilots/calcite/capture.mjs','pilots/calcite/build.mjs'])
  hashes[name]=createHash('sha256').update(fs.readFileSync(name,'utf8').replace(/\r\n/g,'\n')).digest('hex');
const result={schema:'calcite-pilot-recording-v1',model:{simVersion:h.SIM_VERSION,modelDigest:h.MODEL_DIGEST,runtimeDigest:runtimeExecutionDigest(process.cwd()),sourceHashes:hashes},
  limitations:['Pilot completion is not a scientific volume authority.','No exact internal zoning, inclusion positions, or dissolution topography is claimed.','No cavity or excluded-mineral contact surfaces are displayed.'],
  controlled:controlled.frames,live:live.frames,
  measurement:{before,after,order:'uncaptured then captured; warm caches may affect times; totalMs includes trajectory fingerprint auditing and is not a gameplay benchmark; no speedup claim',
    scientificParity:before.fingerprint===after.fingerprint,controlledCompilations:controlled.compilations,liveCompilations:live.compilations}};
fs.writeFileSync(new URL('./recording.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({frames:controlled.frames.length+live.frames.length,measurement:result.measurement},null,2));
