import * as THREE from '../../tools/three.module.js';
import {SpecimenView} from './render.js';
import {freeze,validateFrame} from './specimen.js';

const $=id=>document.getElementById(id);
try {
const response=await fetch('./recording.json');if(!response.ok)throw Error('Generate recording.json with the pilot build command first.');
const recording=freeze(await response.json());
for(const frame of [...recording.controlled,...recording.live])validateFrame(frame);
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x101820);
const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
scene.add(new THREE.AmbientLight(0xc4d8ee,1.0));
const light=new THREE.DirectionalLight(0xffe0b7,1.5);light.position.set(3,6,5);scene.add(light);
const camera=new THREE.PerspectiveCamera(38,1,.001,10000);
const view=new SpecimenView(THREE,group);
let dataset='controlled',index=2,theta=.65,phi=1.05,radius=5,target=new THREE.Vector3(),drag=null;
const frame=()=>recording[dataset][index];
function draw(){
  const width=$('view').clientWidth,height=$('view').clientHeight;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));
  camera.lookAt(target);renderer.render(scene,camera);
}
function fit(){
  const bounds=new THREE.Box3().setFromObject(group,true);
  if(bounds.isEmpty()){target.set(0,0,0);radius=4;return;}
  bounds.getCenter(target);radius=Math.max(.1,bounds.getSize(new THREE.Vector3()).length()*1.9);
}
function text(tag,value,parent,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;parent.append(e);return e;}
function inspect(){
  const c=frame().crystals.find(c=>String(c.id)===$('crystal').value),facts=$('facts'),authority=$('authority');facts.replaceChildren();authority.replaceChildren();
  if(!c){text('p','No supported calcite in this recorded step.',facts);return;}
  text('h3',`${c.facts.habit} · Crystal ${c.id}`,facts);
  text('p',`Model extent: ${c.facts.cLengthMm.toFixed(3)} × ${c.facts.aWidthMm.toFixed(3)} mm`,facts);
  text('p',`Booked solid volume: ${c.facts.bookedVolumeMm3.toFixed(5)} mm³`,facts);
  text('p',`Completed mesh volume: ${c.completion.volumeMm3.toFixed(5)} mm³ — not used for chemistry`,facts,'muted');
  text('p',`Geometry depends on neighbors: ${c.dependencies.join(', ')||'none'}`,facts,'muted');
  text('h3','Recorded zones',facts);
  const table=document.createElement('table');table.innerHTML='<thead><tr><th>Step</th><th>Δ µm</th><th>Mn value</th></tr></thead>';
  const body=document.createElement('tbody');
  for(const z of c.facts.zones){const row=document.createElement('tr');[z.step,z.thickness_um.toFixed(3),z.trace_Mn??'—'].forEach(v=>text('td',String(v),row));body.append(row);}
  table.append(body);facts.append(table);
  text('p','Composition values are preserved as recorded. No spatial zoning or fluorescence is inferred from this table.',facts,'muted');
  for(const [name,a]of Object.entries(c.authority)){
    text('h3',name,authority);text('p',a.classification,authority,'badge');text('p',a.source,authority,'muted');if(a.limitation)text('p',a.limitation,authority,'muted');
  }
}
function show(refit=false){
  const f=frame(),old=$('crystal').value;
  view.sync(f,{subdivision:$('refine').checked?1:0,wireframe:$('wire').checked});
  $('step-label').textContent=String(f.step);$('caption').textContent=f.source.label||`Elmwood · Seed 42 · Step ${f.step}`;
  $('source').textContent=f.source.limitation||`Existing Elmwood model, with its Wulff calcite option enabled. ${f.source.excludedCrystals.length} other/unsupported crystals excluded; their contacts are not represented.`;
  $('crystal').replaceChildren();for(const c of f.crystals){const o=document.createElement('option');o.value=c.id;o.textContent=String(c.id);$('crystal').append(o);}
  if(f.crystals.some(c=>String(c.id)===old))$('crystal').value=old;
  inspect();if(refit)fit();draw();
}
$('identity').textContent=JSON.stringify({model:recording.model,limitations:recording.limitations},null,2);
$('dataset').onchange=()=>{dataset=$('dataset').value;index=recording[dataset].length-1;$('step').max=index;$('step').value=index;show(true);};
$('step').oninput=()=>{index=Number($('step').value);show();};
$('wire').onchange=()=>show();$('refine').onchange=()=>show();$('light').oninput=()=>{light.intensity=Number($('light').value);draw();};$('crystal').onchange=inspect;
function geometryIdentity(){return JSON.stringify(group.children.map(m=>[m.userData.crystalId,[...m.geometry.attributes.position.array],m.geometry.groups]));}
$('rebuild').onclick=()=>{
  const before=geometryIdentity();view.dispose();show();
  const identical=before===geometryIdentity();$('status').textContent=identical?'Rebuilt from specimen data: identical geometry; no growth code loaded.':'Rebuild comparison FAILED';
  if(!identical)throw Error('Rebuild identity failed');
};
$('view').onpointerdown=e=>{drag=[e.clientX,e.clientY];$('view').setPointerCapture(e.pointerId);};
$('view').onpointermove=e=>{if(!drag)return;theta-=(e.clientX-drag[0])*.008;phi=Math.max(.05,Math.min(Math.PI-.05,phi+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];draw();};
$('view').onpointerup=()=>drag=null;$('view').onpointercancel=()=>drag=null;
$('view').addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(.01,Math.min(10000,radius*Math.exp(e.deltaY*.001)));draw();},{passive:false});
new ResizeObserver(draw).observe($('view'));

const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function measure(strategy){
  view.dispose();const createdBefore=view.created,t0=performance.now();view.sync(frame());draw();renderer.getContext().finish();
  const firstMs=performance.now()-t0,updates=[],startHeap=performance.memory?.usedJSHeapSize??null;
  for(let repeat=0;repeat<8;repeat++)for(const f of recording.controlled){
    const t=performance.now();if(strategy==='whole-group')view.dispose();view.sync(f);draw();renderer.getContext().finish();updates.push(performance.now()-t);
  }
  view.sync(frame());fit();
  const samples=[];let last=null;
  for(let i=0;i<61;i++)await new Promise(resolve=>requestAnimationFrame(t=>{if(last!==null)samples.push(t-last);last=t;theta+=.01;draw();resolve();}));
  const memory={...renderer.info.memory,heapBefore:startHeap,heapAfter:performance.memory?.usedJSHeapSize??null};
  return {strategy,firstRenderMs:firstMs,medianUpdateMs:median(updates),orbitMedianFrameMs:median(samples),orbitFps:1000/median(samples),meshConstructions:view.created-createdBefore,memory};
}
async function benchmark(){
  const specimenBefore=JSON.stringify(recording),results=[];
  $('benchmark').disabled=true;
  try {
    // Alternate order to disclose warm-up rather than awarding the second run a win.
    for(const strategy of ['whole-group','retained','retained','whole-group'])results.push(await measure(strategy));
    if(JSON.stringify(recording)!==specimenBefore)throw Error('Display changed recording');
    const result={scope:'Pilot adapter strategies; NOT shipped-game before/after',renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),
      viewport:[$('view').clientWidth,$('view').clientHeight],devicePixelRatio:renderer.getPixelRatio(),
      gpuTiming:'Update timings synchronize via gl.finish; orbit uses requestAnimationFrame.',
      memoryCaveat:'Heap is process telemetry, not retained allocation or peak memory. GPU figures count resources, not bytes.',results};
    $('metrics').textContent=JSON.stringify(result,null,2);return result;
  }finally{$('benchmark').disabled=false;show(true);}
}
$('benchmark').onclick=()=>benchmark().catch(e=>$('status').textContent=e.message);
show(true);
// Local browser verification hook, containing no growth entry points.
window.calcitePilot={benchmark,recording,view,renderer,frame,geometryIdentity,show,
  verify(){const before=JSON.stringify(recording),g=geometryIdentity();view.dispose();show();return {rebuildIdentical:g===geometryIdentity(),recordUnchanged:before===JSON.stringify(recording),resources:renderer.info.memory};}};
}catch(error){$('status').textContent=`Pilot unavailable: ${error.message}`;console.error(error);}
