// Executed renderer census. Controlled fresh records, not simulated specimens.
// Complements the passive default-token audit with actual geometry dispatch.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from './three.module.js';
import {loadSimBundle} from './_harness.mjs';
globalThis.THREE = THREE;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {Crystal, WallState, classifySurfaceGrowth, _topoSyncCrystalMeshes} = await loadSimBundle({
  toolName:'r4-morphology-census', extraExports:['Crystal','WallState','classifySurfaceGrowth','_topoSyncCrystalMeshes']});
const specs = JSON.parse(readFileSync(path.join(root,'data/minerals.json'),'utf8')).minerals;
const wall = new WallState({vug_diameter_mm:70,shape_seed:42}), cache = new Map(), rows=[];
let id=0;
for (const [mineral,spec] of Object.entries(specs)) {
  if (spec._transformation_only || mineral === 'tincalconite') continue;
  const variants = new Map((spec.habit_variants || []).map(v=>[v.name,v]));
  if (!variants.has(spec.habit)) variants.set(spec.habit,{name:spec.habit});
  for (const variant of variants.values()) {
    const c = new Crystal({mineral,habit:variant.name,crystal_id:++id,nucleation_step:1,
      vector:variant.vector || spec.vector || 'projecting', wall_spread:variant.wall_spread ?? 0.2,
      void_reach:variant.void_reach ?? 0.8});
    Object.assign(c,{c_length_mm:6,a_width_mm:2,total_growth_um:6000,_volume_mm3:3,
      wall_anchor:wall._anchorFromRingCell(6,12)});
    const sim={crystals:[c],step:100,wall};
    classifySurfaceGrowth(sim);
    const before=JSON.stringify([c.zones,c.c_length_mm,c.a_width_mm,c._volume_mm3,c.habit]);
    const state={geomCache:cache,crystals:new THREE.Group(),clipUniforms:{uVugRadius:{value:35}}};
    const row={mineral,habit:c.habit,regime:c._surfaceGrowth?.regime || null,meshes:0,chamfered:0,relief:0,geometry:[],errors:[]};
    try {
      _topoSyncCrystalMeshes(state,sim,wall);
      state.crystals.traverse(m=>{
        if(!m.isMesh)return; row.meshes++;
        const p=m.geometry?.attributes.position;
        if(!p?.count || [...p.array].some(v=>!Number.isFinite(v)))row.errors.push('invalid positions');
        if(![...m.position.toArray(),...m.scale.toArray()].every(Number.isFinite))row.errors.push('invalid transform');
        if(m.geometry.userData.chamferR4)row.chamfered++;
        for(const mat of Array.isArray(m.material)?m.material:[m.material]) {
          if(mat?.userData.faceReliefR4)row.relief++;
          mat?.dispose();
        }
        row.geometry.push(...Object.keys(m.geometry.userData));
        if(m.userData.surfaceGrowth)row.surface=true;
      });
      if(!row.meshes)row.errors.push('no visible representation');
      if(before!==JSON.stringify([c.zones,c.c_length_mm,c.a_width_mm,c._volume_mm3,c.habit]))row.errors.push('scientific record changed');
    } catch(e) {row.errors.push(String(e.stack || e));}
    row.geometry=[...new Set(row.geometry)]; rows.push(row);
    console.log(mineral+'/'+c.habit+': '+row.meshes+' meshes'+(row.errors.length?' FAIL '+row.errors.join('; '):' OK'));
  }
}
const report={schema:1,testimony:'controlled fresh records; all authored habit labels; not simulation or visual acceptance',
  exclusions:['transformation-only products require executed parent histories','tincalconite requires its borax precursor'],
  minerals:new Set(rows.map(r=>r.mineral)).size,habits:rows.length,failures:rows.filter(r=>r.errors.length),rows};
mkdirSync(path.join(root,'.local-evidence'),{recursive:true});
writeFileSync(path.join(root,'.local-evidence/r4-morphology-census.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({minerals:report.minerals,habits:report.habits,failures:report.failures.length}));
process.exitCode=report.failures.length?1:0;
