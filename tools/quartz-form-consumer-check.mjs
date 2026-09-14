// C changes replay consumers only. After the normal rebake, all scientific
// payloads (including B's complete quartz ledgers) must remain LF-normalized byte-identical.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertCommissionedEvidenceRuntime,browserBundleDigest,runtimeExecutionDigest,producerContractDigest} from './evidence-runtime.mjs';
import {verifyGuidedTutorialBrowserReceipt,guidedTutorialBrowserPayloadDigest} from './guided-tutorial-browser-receipt.mjs';
import {verifyMechanismWitnessArtifact} from './gen-mechanism-witnesses.mjs';
assertCommissionedEvidenceRuntime();
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base='0f0be7f7f94c9f8d5b2f7806504914c818f2da93';
const git=['-c','safe.directory='+root];
const before=p=>execFileSync('git',[...git,'show',`${base}:${p}`],{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024}).replace(/\r\n/g,'\n');
const after=p=>readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
const receiptPaths={browser:'archive/evidence/guided-tutorial-browser-v285.json',mechanism:'archive/evidence/mechanism-witnesses-v285.json'};
const receipts=Object.fromEntries(Object.entries(receiptPaths).map(([key,p])=>[key,{old:JSON.parse(before(p)),current:JSON.parse(after(p))}]));
verifyGuidedTutorialBrowserReceipt(root,receipts.browser.current,{simVersion:285});
verifyMechanismWitnessArtifact(root,receipts.mechanism.current,{simVersion:285});
// Both receipt kinds use the same canonical-JSON SHA-256 payload identity.
for(const pair of Object.values(receipts))for(const artifact of Object.values(pair))
  assert.equal(artifact.payload_sha256,guidedTutorialBrowserPayloadDigest(artifact.payload),'Receipt payload hash must be recomputed');
const receiptReferences=Object.fromEntries(Object.entries(receipts).map(([key,pair])=>[key,{before:pair.old.payload_sha256,after:pair.current.payload_sha256}]));
const unchanged=[];
const referenceOnlyCards=[];
const cardReferenceFields=['transformation_reactivity_commissioning','player_choice_commissioning'];
const storage={runs:0,crystals:0,snapshots:0,channelJsonBytes:0,ledgerJsonBytes:0,
  basis:'UTF-8 JSON bytes; not JavaScript heap; source files checked byte-for-byte against B after LF normalization'};
for(const name of ['seed42_v285.json','locality_frequency_v285.json','strip_digest_v285.json']) {
  const p=`tests-js/baselines/${name}`;assert.equal(after(p),before(p),`${p}: scientific baseline changed`);unchanged.push(p);
}
for(const dir of ['archive/strips/v285','archive/claim-cards/v285']) {
  const old=execFileSync('git',[...git,'ls-tree','-r','--name-only',base,'--',dir],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).sort();
  const current=readdirSync(path.join(root,dir)).map(n=>dir+'/'+n).sort();
  assert.deepEqual(current,old,`${dir}: archive inventory changed`);
  for(const p of current){
    if(dir==='archive/claim-cards/v285') {
      if(p.endsWith('.md')) {
        assert.equal(after(p),before(p).replaceAll(receiptReferences.mechanism.before,receiptReferences.mechanism.after),
          `${p}: Markdown changed beyond the verified mechanism reference`);
      } else {
        const a=JSON.parse(before(p)),b=JSON.parse(after(p));
        for(const field of cardReferenceFields) {
          const prior=a.testimony.executed_science[field],now=b.testimony.executed_science[field];
          if(prior==null){assert.equal(now,prior,`${p}: invented ${field}`);continue;}
          assert.equal(prior.artifact_payload_sha256,receiptReferences.mechanism.before);
          assert.equal(now?.artifact_payload_sha256,receiptReferences.mechanism.after);
          prior.artifact_payload_sha256=now.artifact_payload_sha256;
        }
        assert.deepEqual(b,a,`${p}: claim card changed beyond verified mechanism references`);
      }
      referenceOnlyCards.push(p);
    } else {
      assert.equal(after(p),before(p),`${p}: scientific testimony changed`);unchanged.push(p);
    }
    if(dir==='archive/strips/v285') {
      const rows=JSON.parse(after(p)).executed_testimony?.quartz_form_observations;
      if(rows?.length){
        storage.runs++;storage.crystals+=rows.length;storage.channelJsonBytes+=Buffer.byteLength(JSON.stringify(rows));
        for(const r of rows){storage.snapshots+=(r.history.initial?1:0)+r.history.changes.length;storage.ledgerJsonBytes+=Buffer.byteLength(JSON.stringify(r.history));}
      }
    }
  }
}
const updatedIdentities=[],displayIdChanges=[];
for(const kind of ['mechanism-witnesses','guided-tutorial-browser']) {
  const p=`archive/evidence/${kind}-v285.json`,a=JSON.parse(before(p)),b=JSON.parse(after(p));
  if(kind==='mechanism-witnesses')verifyMechanismWitnessArtifact(root,b,{simVersion:285});
  else verifyGuidedTutorialBrowserReceipt(root,b,{simVersion:285});
  const identities={browser_bundle_sha256:browserBundleDigest(root),execution_set_sha256:runtimeExecutionDigest(root),
    producer_contract_sha256:producerContractDigest(root,kind)};
  for(const [key,value] of Object.entries(identities)){assert.equal(b[key],value,`${p}: wrong ${key}`);delete a[key];delete b[key];}
  if(kind==='guided-tutorial-browser') {
    // F13: the UI suffix shares Math.random with Three.js UUID allocation.
    // Allow only the two exact observed leaves; every other journey value stays pinned.
    assert.equal(a.payload_sha256,guidedTutorialBrowserPayloadDigest(a.payload));
    assert.equal(b.payload_sha256,guidedTutorialBrowserPayloadDigest(b.payload));
    for(const parts of [['simulation','collected'],['player_surfaces','collection_record_groove']]) {
      const prior=a.payload.journeys[parts[0]][parts[1]],current=b.payload.journeys[parts[0]][parts[1]];
      assert.equal(prior.record_id,'cry-16-qte');assert.equal(current.record_id,'cry-16-nmk');
      displayIdChanges.push({path:'payload.journeys.'+parts.join('.')+'.record_id',before:prior.record_id,after:current.record_id});
      prior.record_id=current.record_id;
    }
    // Hashes have been independently checked above before normalizing these leaves.
  } else {
    const prior=a.payload.guided_tutorial.interaction_products.capable_browser_authority;
    const now=b.payload.guided_tutorial.interaction_products.capable_browser_authority;
    assert.equal(prior.payload_sha256,receiptReferences.browser.before);
    assert.equal(now.payload_sha256,receiptReferences.browser.after);
    prior.payload_sha256=now.payload_sha256;
  }
  delete a.payload_sha256;delete b.payload_sha256;
  assert.deepEqual(b,a,`${p}: outcome changed beyond verified execution identities`);
  updatedIdentities.push({file:p,allowedTopLevel:[...Object.keys(identities),'payload_sha256'],
    allowedPayloadChanges:kind==='guided-tutorial-browser'?displayIdChanges.map(r=>r.path):['payload.guided_tutorial.interaction_products.capable_browser_authority.payload_sha256'],
    otherPayloadLeavesUnchanged:true,payloadHashesVerified:true});
}
const visualDirectory='proposals/growth-front-audit/evidence/quartz-consumer';
const visual=JSON.parse(after(visualDirectory+'/summary.json'));
assert.equal(visual.browser_bundle_sha256,browserBundleDigest(root),'Visual captures must bind the delivered browser bundle');
assert.deepEqual(visual.results.map(r=>r.name),[...Array.from({length:6},(_,i)=>'control-'+(i+1)),
  'grimsel-78','grimsel-99','grimsel-153','grimsel-198','grimsel-gwindel-198'],'Required visual inventory');
assert.deepEqual(visual.results.map(r=>[r.scenario,r.fixture ?? null,r.step ?? null,r.id ?? null]),[
  ...Array.from({length:6},(_,i)=>['amethyst_geode','quartz-form-'+(i+1),null,null]),
  ...[78,99,153,198].map(step=>['grimsel_alpine_cleft',null,step,21]),
  ['grimsel_alpine_cleft',null,198,19]],'Required scenario/fixture/cursor/source tuples');
for(const row of visual.results) {
  const bytes=readFileSync(path.join(root,visualDirectory,row.image));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.image_sha256,`${row.name}: image hash`);
  const manifest=JSON.parse(after(visualDirectory+'/'+row.manifest));
  assert.equal(manifest.shots.length,1,`${row.name}: expected one hero capture`);
  for(const shot of manifest.shots)assert.equal(shot.error,undefined,`${row.name}: individual shot error`);
  assert.equal(manifest.scenario,row.scenario,`${row.name}: scenario mismatch`);
  assert.deepEqual(manifest.exceptions,[],`${row.name}: browser exceptions`);
  assert.deepEqual(manifest.shot_errors ?? [],[],`${row.name}: shot errors`);
  assert.deepEqual(manifest.shots[0].subject.quartz_form_selection,row.form,`${row.name}: subject/status mismatch`);
  assert.deepEqual(manifest.mesh_sync_timing,row.mesh_sync_timing,`${row.name}: timing summary mismatch`);
  assert.equal(manifest.render_build_ms,row.render_build_ms,`${row.name}: first-refresh summary mismatch`);
  assert.equal(manifest.render_reuse_ms,row.render_reuse_ms,`${row.name}: repeated-refresh summary mismatch`);
  assert.equal(manifest.mesh_sync_timing.entries_at_cold_start,0,`${row.name}: geometry map must start empty`);
  assert.ok(manifest.mesh_sync_timing.entries_after_cold_rebuild>0,`${row.name}: cold rebuild must populate geometry`);
  for(const value of [manifest.render_reuse_ms,manifest.mesh_sync_timing.state_geometry_cache_cold_ms,
    manifest.mesh_sync_timing.rebuild_ms,manifest.mesh_sync_timing.cached_ms]) assert.ok(Number.isFinite(value)&&value>=0);
  assert.equal(manifest.history_cursor,row.form.cursor_step,`${row.name}: wrong cursor`);
  if(row.fixture) {
    const fixture=manifest.quartz_form_fixture;
    assert.equal(fixture.authored,true);
    assert.deepEqual(fixture.assigned_live_dimensions_mm,{c_length_mm:8,a_width_mm:4});
    assert.deepEqual(fixture.accepted_zone,{step:1,thickness_um:8000,aspect_ratio:.4});
    assert.equal(fixture.replay_dimensions.c_length_mm,8);
    assert.ok(Math.abs(fixture.replay_dimensions.a_width_mm-3.2)<1e-12);
  }
  else {
    assert.equal(manifest.replay_authority.authenticated,true);
    assert.equal(manifest.replay_authority.snapshot_step,row.step);
    assert.equal(row.form.source_crystal_id,row.id);
  }
}
const report={schema:'quartz-form-consumer-c-comparison-v1',base,node:process.version,
  browserBundleSha256:browserBundleDigest(root),executionSetSha256:runtimeExecutionDigest(root),unchanged,referenceOnlyCards,updatedIdentities,displayIdChanges,receiptReferences,storage,
  allowedCardReferenceChanges:cardReferenceFields.map(k=>'testimony.executed_science.'+k+'.artifact_payload_sha256'),
  visual:{captures:visual.results.length,authored:visual.results.filter(r=>r.fixture).length,production:visual.results.filter(r=>!r.fixture).length,browserBundleMatches:true},
  conclusion:'Scientific baselines and complete archived strips including quartz observations are LF-normalized byte-identical. Browser payload differs only in two exact display-ID leaves. Mechanism and claim-card changes are restricted to the verified receipt-reference chain; all scientific outcomes and claim text are unchanged.'};
writeFileSync(path.join(root,'proposals/growth-front-audit/evidence/quartz-consumer-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${unchanged.length} exact baseline/archive files; ${referenceOnlyCards.length} cards differ only in verified receipt references; browser differs only in two verified display-ID leaves.`);
