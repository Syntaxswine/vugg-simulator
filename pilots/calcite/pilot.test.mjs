import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../../tools/three.module.js';
import {SpecimenRecorder,clone,tessellate,validateFrame,geometryVolume} from './specimen.js';
import {SpecimenView} from './render.js';
import {loadPilotModel,kernelFor,controlledInputs,captureLive} from './capture.mjs';
import {runtimeExecutionDigest} from '../../tools/evidence-runtime.mjs';

globalThis.THREE=THREE;
const h=await loadPilotModel(),kernel=kernelFor(h),inputs=controlledInputs(h);
const record=()=>{const r=new SpecimenRecorder(kernel);inputs.forEach(i=>r.capture(i));return r;};
const digestGeometry=group=>JSON.stringify(group.children.map(m=>({positions:[...m.geometry.attributes.position.array],groups:m.geometry.groups})));

test('controlled generations, dissolution and regrowth retain immutable contemporaneous facts',()=>{
  const r=record(),early=JSON.stringify(r.frames[1]);
  assert.equal(r.frames[0].crystals.length,1);
  assert.equal(r.frames[1].crystals[1].facts.nucleationStep,2);
  assert.equal(r.frames[2].crystals[0].facts.zones[2].trace_Mn,.2);
  assert.ok(r.frames[3].crystals[0].facts.cLengthMm<r.frames[2].crystals[0].facts.cLengthMm);
  assert.ok(r.frames[4].crystals[0].facts.cLengthMm>r.frames[3].crystals[0].facts.cLengthMm);
  assert.equal(JSON.stringify(r.frames[1]),early);
  assert.throws(()=>{r.frames[1].crystals[0].facts.habit='scalenohedral';},TypeError);
  const altered=clone(inputs[4]);altered.step=6;altered.crystals[0].habit='scalenohedral';
  r.capture(altered);assert.equal(JSON.stringify(r.frames[1]),early);
});

test('property authority distinguishes captured facts from completed geometry; no volume substitution',()=>{
  for(const f of record().frames)for(const c of f.crystals){
    assert.equal(c.authority.surfaces.classification,'procedurally-completed');
    assert.equal(c.authority.zoneComposition.classification,'procedurally-completed');
    assert.equal(c.completion.volumeIsMassAuthority,false);
    assert.equal(c.facts.bookedVolumeMm3,inputs[f.step-1].crystals.find(x=>x.id===c.id).bookedVolumeMm3);
    assert.ok(Math.abs(c.completion.volumeMm3-c.facts.bookedVolumeMm3)>1e-4);
    assert.ok(c.authority.internalBoundaries.limitation.includes('not proof'));
    assert.ok(c.authority.inclusions.limitation.includes('not drawn'));
  }
});

test('every generated vertex obeys preserved planes; contacts identify the neighbor',()=>{
  let contactFaces=0;
  for(const f of record().frames)for(const c of f.crystals){
    for(const v of c.completion.poly.vertices)for(const p of c.completion.planes)
      assert.ok(v.reduce((s,x,i)=>s+x*p.n[i],0)<=p.d+1.1e-6);
    for(const face of c.completion.poly.faces){
      const p=c.completion.planes[face.plane];
      if(p.kind==='contact'){contactFaces++;assert.ok(c.dependencies.includes(p.neighborId));}
    }
  }
  assert.ok(contactFaces>0,'fixture must actually expose a clipped contact face');
});

test('opposite contact planes describe the same boundary and identify each other',()=>{
  for(const f of record().frames.slice(1)){
    const [a,b]=f.crystals.map(c=>c.completion.planes.find(p=>p.kind==='contact'));
    assert.ok(a&&b);assert.equal(a.neighborId,2);assert.equal(b.neighborId,1);
    for(let i=0;i<3;i++)assert.ok(Math.abs(a.n[i]+b.n[i])<1e-12);
    assert.ok(Math.abs(a.d+b.d)<1e-12);
  }
});

test('isolated physical-scale form agrees with the existing half-form builder',()=>{
  for(const axis of [[0,1,0],[0,-1,0],[.3,.8,.5]]){
  const input=clone(inputs[0]);input.crystals[0].axis=axis;
  const c=input.crystals[0],r=new SpecimenRecorder(kernel).capture(input).crystals[0];
  const legacy=h._makeWulffHalfFormGeom(h.wulffFaceSetForMineral('calcite',c.form.growthFrac,0,c.form.biasC,c.exposureK),c.attachedFraction,c.attachmentAtNucleus);
  const mesh=new THREE.Mesh(legacy);mesh.scale.setScalar(c.cLengthMm);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...c.axis).normalize());
  mesh.rotateY(c.yaw);mesh.position.set(...c.anchor);mesh.updateMatrixWorld(true);
  const expected=new THREE.Box3().setFromObject(mesh,true),got=new THREE.Box3().setFromPoints(r.completion.poly.vertices.map(v=>new THREE.Vector3(...v)));
  for(const side of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(expected[side][axis]-got[side][axis])<1e-6);
  legacy.dispose();mesh.material.dispose();
  }
});

test('capture order does not change completed geometry or invalidate cached bodies',()=>{
  const r=new SpecimenRecorder(kernel),input=clone(inputs[2]),a=r.capture(input),count=r.compilations;
  input.crystals.reverse();const b=r.capture(input);
  assert.deepEqual(a,b);assert.equal(r.compilations,count);
});

test('neighbor scalar uses existing O1b rule without visibility floors',()=>{
  const input=inputs[2],frame=new SpecimenRecorder(kernel).capture(input);
  const bodies=input.crystals.map(c=>({id:c.id,cx:c.anchor[0],cy:c.anchor[1],cz:c.anchor[2],reach:.5*Math.hypot(c.aWidthMm,c.aWidthMm,c.cLengthMm),enclosed:false}));
  for(const c of frame.crystals)assert.equal(c.completion.exposureK,Math.min(.32,c.facts.exposureK+h._o1bNeighborShadow({crystal_id:c.id},bodies)));
});

test('unchanged capture compiles nothing; neighbor changes invalidate dependents, distant crystals stay shared',()=>{
  const input=clone(inputs[2]),far=clone(input.crystals[0]);far.id=9;far.anchor=[50,0,0];input.crystals.push(far);
  const r=new SpecimenRecorder(kernel),a=r.capture(input),count=r.compilations;
  const b=r.capture(input);assert.equal(r.compilations,count);assert.equal(a.crystals[2],b.crystals[2]);
  input.crystals[0].cLengthMm+=.1;
  const c=r.capture(input);assert.equal(r.compilations,count+2);
  assert.equal(c.crystals[2],b.crystals[2]);assert.notEqual(c.crystals[1],b.crystals[1]);
});

test('serialized record renders and rebuilds identically without any growth kernel',()=>{
  const frame=JSON.parse(JSON.stringify(record().frames[4])),before=JSON.stringify(frame);
  const group=new THREE.Group(),view=new SpecimenView(THREE,group);
  view.sync(frame);const first=digestGeometry(group);
  const geometries=group.children.map(m=>m.geometry);let disposed=0;
  geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  view.dispose();assert.equal(group.children.length,0);assert.equal(disposed,2);
  view.sync(frame);assert.equal(digestGeometry(group),first);assert.equal(JSON.stringify(frame),before);
  view.dispose();assert.equal(view.created,view.disposed);
});

test('flat subdivision preserves planes and signed volume; display changes never touch specimen',()=>{
  const f=record().frames[4],before=JSON.stringify(f),group=new THREE.Group(),view=new SpecimenView(THREE,group);
  view.sync(f);const created=view.created;
  for(let i=0;i<5;i++)view.sync(f,{wireframe:!!(i%2)});
  assert.equal(view.created,created);
  for(const c of f.crystals){
    const data=tessellate(c,1),vertices=[];
    for(let i=0;i<data.positions.length;i+=3)vertices.push(data.positions.slice(i,i+3));
    const faces=[];for(let i=0;i<vertices.length;i+=3)faces.push({verts:[i,i+1,i+2]});
    assert.ok(Math.abs(geometryVolume({vertices,faces})-c.completion.volumeMm3)<1e-10);
    assert.equal(data.positions.length,tessellate(c,0).positions.length*4);
  }
  view.sync(f,{subdivision:1});assert.equal(JSON.stringify(f),before);
  assert.throws(()=>view.sync(f,{subdivision:2}),/Unsupported/);view.dispose();
});

test('invalid or unsupported input fails explicitly instead of inventing replacement geology',()=>{
  for(const mutate of [i=>i.crystals[0].twinned=true,i=>i.crystals[0].cLengthMm=NaN,i=>i.crystals[0].axis=[0,0,0],i=>i.crystals[0].zones[0].step=100]){
    const i=clone(inputs[0]);mutate(i);assert.throws(()=>new SpecimenRecorder(kernel).capture(i));
  }
  const frame=clone(record().frames[0]);frame.crystals[0].completion.visibilityScale=2;
  assert.throws(()=>validateFrame(frame),/authority/);
  const badTrace=clone(inputs[0]);badTrace.crystals[0].zones[0].trace_Mn=NaN;
  assert.throws(()=>new SpecimenRecorder(kernel).capture(badTrace),/Non-finite/);
  const badSurface=clone(record().frames[0]);badSurface.crystals[0].completion.poly.vertices[0][0]+=10;
  assert.throws(()=>validateFrame(badSurface),/boundary|plane/);
});

test('live capture is read-only and uses the scientific-fact category only for live model records',()=>{
  h.setSeed(42);const scenario=h.SCENARIOS.elmwood();scenario.conditions.wall.wulff_calcite=true;
  const sim=new h.VugSimulator(scenario.conditions,scenario.events);
  for(let i=0;i<4;i++)sim.run_step();
  const before=h.simulationStateFingerprint(sim),r=new SpecimenRecorder(kernel);
  const frame=r.capture(captureLive(h,sim,{scenario:'elmwood',seed:42}));
  assert.ok(frame.crystals.length>0);assert.equal(h.simulationStateFingerprint(sim),before);
  assert.equal(frame.crystals[0].authority.zoneComposition.classification,'scientifically-resolved');
  assert.equal(frame.crystals[0].authority.contacts.classification,'procedurally-completed');
});

test('published pilot recording validates and has equal captured/uncaptured growth fingerprints',()=>{
  const saved=JSON.parse(fs.readFileSync(new URL('./recording.json',import.meta.url)));
  for(const f of [...saved.controlled,...saved.live])validateFrame(f);
  assert.equal(saved.model.runtimeDigest,runtimeExecutionDigest(process.cwd()));
  assert.equal(saved.measurement.before.fingerprint,saved.measurement.after.fingerprint);
  assert.deepEqual(saved.measurement.before.stepFingerprints,saved.measurement.after.stepFingerprints);
  for(const [name,hash]of Object.entries(saved.model.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(name,'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,`stale recording: ${name}`);
  assert.ok(saved.controlled.some(f=>f.crystals.some(c=>c.facts.zones.some(z=>z.thickness_um<0))));
});

test('performance and browser receipts identify the current pilot bytes',()=>{
  for(const name of ['compiler-receipt.json','browser-receipt.json']){
    const receipt=JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
    for(const [file,hash]of Object.entries(receipt.sourceHashes))assert.equal(
      createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,`stale ${name}: ${file}`);
  }
});
