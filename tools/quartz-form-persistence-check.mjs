// Increment B evidence: frozen old producer projections and canonical archive
// deltas. This is a verification instrument, never a receipt producer.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {loadSimBundle} from './_harness.mjs';
import {assertCommissionedEvidenceRuntime, browserBundleDigest, runtimeExecutionDigest, producerContractDigest} from './evidence-runtime.mjs';
import {verifyGuidedTutorialBrowserReceipt} from './guided-tutorial-browser-receipt.mjs';
import {verifyMechanismWitnessArtifact} from './gen-mechanism-witnesses.mjs';

assertCommissionedEvidenceRuntime();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '3751060e94bc9ba8aba9a3b488d454b4f5ec4897';
const git = ['-c', 'safe.directory=' + root];
const sha = data => createHash('sha256').update(data).digest('hex');
const before = p => execFileSync('git', [...git, 'show', `${base}:${p}`], {cwd:root,maxBuffer:128*1024*1024});
const json = p => JSON.parse(fs.readFileSync(path.join(root,p), 'utf8'));
const oldJson = p => JSON.parse(before(p));
const outDir = path.join(root,'.local-evidence');
fs.mkdirSync(outDir,{recursive:true});

if (process.argv.includes('--fixture')) {
  const old = process.argv.includes('--old');
  const modules = ['85f-strip-dataset','85g-strip-recorder','85h-strip-storage','93-ui-collection'];
  const config = ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config,ts.sys,root).options;
  const transformBundle = old ? source => {
    for (const name of modules) {
      const current = fs.readFileSync(path.join(root,'dist',name+'.js'),'utf8');
      const original = ts.transpileModule(before(`js/${name}.ts`).toString('utf8'),{compilerOptions:options}).outputText;
      assert.equal(source.split(current).length,2,`exact module replacement: ${name}`);
      source = source.replace(current,original);
    }
    return source;
  } : undefined;
  const api = await loadSimBundle({toolName:'quartz-persistence-legacy-fixture',transformBundle,
    extraExports:['Crystal','GrowthZone','recordQuartzFormObservations','applyFilmDusting',
      'buildCrystalRecord','StripRecorder','stripSerialize','stripDeserialize','stripStoredRecordFromDataset','stripDatasetFromStoredRecord']});
  const results = [];
  for (const kind of ['quartz','quartz-observed','quartz-film','calcite']) {
    const c = new api.Crystal({mineral:kind==='calcite'?'calcite':'quartz',crystal_id:41,habit:'prismatic',nucleation_step:0});
    const z = new api.GrowthZone({step:1,temperature:100,thickness_um:100,growth_rate:1});
    z._time_scaled=true;c.add_zone(z);
    if(kind==='quartz-film')api.applyFilmDusting([c],'chlorite',.3,.6,1);
    const sim={step:1,crystals:[c],wall_state:{ring_count:1,cells_per_ring:1},conditions:{temperature:100,pressure:.001,
      _scenario:{id:'controlled-legacy-persistence',duration_steps:1}}};
    if(kind==='quartz-observed'){
      api.recordQuartzFormObservations(sim);c.twinned=true;c._gwindel=null;sim.step=2;api.recordQuartzFormObservations(sim);
    }
    for(const schema of [null,'crystal-history-v1','crystal-history-v2']){
      const record=api.buildCrystalRecord(c,{mode:'simulation',scenario:'controlled-legacy-persistence',seed:42},schema);
      delete record.id;delete record.collected_at;
      assert.equal(record.history?.crystal?._quartzFormHistory,undefined);
      results.push({kind,schema,bytes:Buffer.byteLength(JSON.stringify(record)),sha256:sha(JSON.stringify(record))});
    }
    if(kind==='quartz-observed')continue; // New channel intentionally absent in this byte-compatibility control.
    const rec=new api.StripRecorder(sim,{angular_indices:1,duration_steps:1});rec.captureStep(sim);
    const ds=rec.finalize();ds.manifest.recorded_at=0;
    assert.equal(ds.quartz_form_testimony,undefined);
    for(const version of [1,2,3,4,5]){
      if(kind==='quartz-film'&&version<4)continue;
      const item={...ds,manifest:{...ds.manifest,format_version:version}};
      const raw=await api.stripSerialize(item,false);
      const stored=api.stripDatasetFromStoredRecord(api.stripStoredRecordFromDataset(await api.stripDeserialize(raw)));
      assert.equal(stored.quartz_form_testimony,undefined);
      assert.deepEqual(await api.stripSerialize(stored,false),raw);
      results.push({kind,strip_version:version,bytes:raw.length,sha256:sha(raw)});
    }
  }
  fs.writeFileSync(path.join(outDir,`quartz-persistence-${old?'old':'current'}-fixtures.json`),JSON.stringify(results,null,2)+'\n');
  process.exit(0);
}

// Isolated processes prevent current globals or caches contaminating old producers.
for(const old of [true,false])execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--fixture',...(old?['--old']:[])],
  {cwd:root,stdio:'pipe',windowsHide:true,maxBuffer:4*1024*1024});
const legacy=json('.local-evidence/quartz-persistence-current-fixtures.json');
assert.deepEqual(legacy,json('.local-evidence/quartz-persistence-old-fixtures.json'),'Pinned old producer bytes changed');
console.log(`${legacy.length} legacy producer/binary projections match ${base}.`);
if(process.argv.includes('--legacy-only'))process.exit(0);

const unchanged=[];
for(const name of ['seed42_v285.json','locality_frequency_v285.json','strip_digest_v285.json']){
  const p=`tests-js/baselines/${name}`;
  assert.equal(fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n'),before(p).toString('utf8').replace(/\r\n/g,'\n'));
  unchanged.push(p);
}
const census=oldJson('proposals/growth-front-audit/evidence/quartz-observer-census.json');
const expected=census.rows.map(r=>r.name).sort();
for(const dir of ['archive/strips/v285','archive/claim-cards/v285']){
  const pinned=execFileSync('git',[...git,'ls-tree','-r','--name-only',base,'--',dir],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).sort();
  const current=fs.readdirSync(path.join(root,dir),{recursive:true})
    .filter(p=>fs.statSync(path.join(root,dir,p)).isFile()).map(p=>`${dir}/${p.replaceAll('\\','/')}`).sort();
  assert.deepEqual(current,pinned,`${dir}: file inventory changed`);
}
const actual=fs.readdirSync(path.join(root,'archive/strips/v285')).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5)).sort();
assert.deepEqual(actual,expected);
const api=await loadSimBundle({toolName:'quartz-persistence-archive-check',extraExports:['stripValidateQuartzFormTestimony']});
const canonicalJson=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)
  ?`[${value.map(canonicalJson).join(',')}]`:`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
const browserPath='archive/evidence/guided-tutorial-browser-v285.json';
const mechanismPath='archive/evidence/mechanism-witnesses-v285.json';
const oldBrowser=oldJson(browserPath),currentBrowser=json(browserPath);
const oldMechanism=oldJson(mechanismPath),currentMechanism=json(mechanismPath);
verifyGuidedTutorialBrowserReceipt(root,currentBrowser,{simVersion:285});
verifyMechanismWitnessArtifact(root,currentMechanism,{simVersion:285});
for(const artifact of [oldBrowser,currentBrowser,oldMechanism,currentMechanism])
  assert.equal(artifact.payload_sha256,sha(canonicalJson(artifact.payload)),'Receipt payload hash must be recomputed');
const receiptReferences={oldBrowserPayload:oldBrowser.payload_sha256,currentBrowserPayload:currentBrowser.payload_sha256,
  oldMechanismPayload:oldMechanism.payload_sha256,currentMechanismPayload:currentMechanism.payload_sha256};
const cardReferenceFields=['transformation_reactivity_commissioning','player_choice_commissioning'];
const rows=[];
for(const name of expected){
  const p=`archive/strips/v285/${name}.json`,story=json(p),old=oldJson(p),a=census.rows.find(r=>r.name===name);
  const testimony=story.executed_testimony.quartz_form_observations;
  if(a.ledgers){assert.ok(testimony,`${name}: missing observed ledger`);api.stripValidateQuartzFormTestimony(testimony,story.steps);}
  else assert.equal(testimony,undefined,`${name}: invented ledger`);
  const records=(testimony||[]).reduce((sum,r)=>sum+(r.history.initial?1:0)+r.history.changes.length,0);
  assert.equal((testimony||[]).length,a.ledgers,`${name}: ledger census changed`);
  assert.equal(records,a.records,`${name}: observation census changed`);
  for(const row of testimony||[]){assert.equal(row.captured_step,story.steps);assert.equal(row.sample_index,story.steps-1);assert.equal(row.history.unavailable,undefined);}
  const ledgerBytes=(testimony||[]).reduce((sum,r)=>sum+Buffer.byteLength(JSON.stringify(r.history)),0);
  assert.equal(ledgerBytes,a.ledgerJsonBytes,`${name}: ledger size changed from A`);
  delete story.executed_testimony.quartz_form_observations;
  assert.deepEqual(story,old,`${name}: preexisting scientific archive changed`);
  rows.push({name,ledgers:(testimony||[]).length,records,ledgerBytes,channelBytes:testimony?Buffer.byteLength(JSON.stringify(testimony)):0});
  const cardPath=`archive/claim-cards/v285/${name}.json`,card=json(cardPath),oldCard=oldJson(cardPath);
  assert.equal(card.strip_sha256,sha(fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n')));
  const markdown=`archive/claim-cards/v285/${name}.md`;
  const oldMarkdown=before(markdown).toString('utf8').replace(/\r\n/g,'\n');
  assert.equal(fs.readFileSync(path.join(root,markdown),'utf8').replace(/\r\n/g,'\n'),
    oldMarkdown.replaceAll(oldCard.strip_sha256,card.strip_sha256)
      .replaceAll(oldMechanism.payload_sha256,currentMechanism.payload_sha256),`${name}: Markdown card changed beyond verified strip/receipt identities`);
  for(const field of cardReferenceFields){
    const previous=oldCard.testimony.executed_science[field],now=card.testimony.executed_science[field];
    if(previous==null){assert.equal(now,previous,`${name}: invented ${field}`);continue;}
    assert.equal(previous.artifact_payload_sha256,oldMechanism.payload_sha256,`${name}: old ${field} reference`);
    assert.equal(now?.artifact_payload_sha256,currentMechanism.payload_sha256,`${name}: current ${field} reference`);
    previous.artifact_payload_sha256=now.artifact_payload_sha256;
  }
  delete card.strip_sha256;delete oldCard.strip_sha256;
  assert.deepEqual(card,oldCard,`${name}: claim card changed beyond verified strip/receipt identities`);
}
const updatedIdentities=[];
for(const [file,kind] of [['mechanism-witnesses-v285.json','mechanism-witnesses'],['guided-tutorial-browser-v285.json','guided-tutorial-browser']]){
  const p=`archive/evidence/${file}`,old=oldJson(p),current=json(p);
  if(kind==='guided-tutorial-browser'){
    verifyGuidedTutorialBrowserReceipt(root,current,{simVersion:285});
    const previous=old.payload.journeys,now=current.payload.journeys;
    const oldStrip=previous.player_surfaces.strip_view,newStrip=now.player_surfaces.strip_view;
    const raw=newStrip.dataset_digest_sha256;
    assert.equal(newStrip.imported_digest_sha256,raw);
    assert.equal(newStrip.imported_key,`imported:${newStrip.production_key}@sha256-${raw}`);
    for(const when of ['before','after']){
      assert.equal(now.simulation.geology_preservation[when].run_id,raw);
      previous.simulation.geology_preservation[when].run_id=raw;
    }
    for(const key of ['download_sha256','dataset_digest_sha256','imported_digest_sha256','imported_key'])oldStrip[key]=newStrip[key];
    // The verifier recomputed this hash. All other journey bytes must agree.
    old.payload_sha256=current.payload_sha256;
  }else{
    // The mechanism payload binds the separately commissioned browser receipt.
    // Only that reference and its recomputed containing hash may move.
    const previous=old.payload.guided_tutorial.interaction_products.capable_browser_authority;
    const now=current.payload.guided_tutorial.interaction_products.capable_browser_authority;
    assert.equal(previous.payload_sha256,oldBrowser.payload_sha256);
    assert.equal(now.payload_sha256,currentBrowser.payload_sha256);
    previous.payload_sha256=now.payload_sha256;
    old.payload_sha256=current.payload_sha256;
  }
  const identities={browser_bundle_sha256:browserBundleDigest(root),execution_set_sha256:runtimeExecutionDigest(root),
    producer_contract_sha256:producerContractDigest(root,kind)};
  for(const [key,value] of Object.entries(identities)){assert.equal(current[key],value,`${p}: ${key}`);delete current[key];delete old[key];}
  assert.deepEqual(current,old,`${p}: outcomes changed beyond declared identities`);
  updatedIdentities.push({file:p,allowedTopLevel:[...Object.keys(identities),'payload_sha256'],
    allowedPayloadChanges:kind==='mechanism-witnesses'?['guided_tutorial.interaction_products.capable_browser_authority.payload_sha256']:[],
    allowedJourneyChanges:kind==='guided-tutorial-browser'
    ? ['simulation.geology_preservation.before.run_id','simulation.geology_preservation.after.run_id',
      ...['download_sha256','dataset_digest_sha256','imported_digest_sha256','imported_key'].map(k=>'player_surfaces.strip_view.'+k)] : []});
}
// These assertions report exactly the current runtime; normal receipt checks
// separately authenticate every generated leaf and its producer contract.
const result={schema:'quartz-form-persistence-b-comparison-v1',base,node:process.version,
  browserBundleSha256:browserBundleDigest(root),executionSetSha256:runtimeExecutionDigest(root),
  legacy,unchanged,rows,updatedIdentities,receiptReferences,
  allowedCardReferenceChanges:cardReferenceFields.map(k=>`testimony.executed_science.${k}.artifact_payload_sha256`),
  censusComparison:'Ledger counts, snapshot counts and serialized ledger lengths agree with A; A did not retain per-ledger hashes, so this is not an independent value/byte comparison of A histories.',
  conclusion:'Old collection and absent-channel strip bytes match pinned producers. All preexisting canonical strip testimony is unchanged; new quartz channels pass structural/date/source validation and the stated aggregate census checks.'};
fs.writeFileSync(path.join(root,'proposals/growth-front-audit/evidence/quartz-persistence-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(`PASS: ${rows.length} canonical archives and claim cards, ${unchanged.length} unchanged scientific baselines.`);
