import {readFileSync,readdirSync,writeFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {browserBundleDigest,runtimeExecutionDigest,producerContractDigest,assertCommissionedEvidenceRuntime} from './evidence-runtime.mjs';
assertCommissionedEvidenceRuntime();
const sha = value => createHash('sha256').update(value).digest('hex');
const census=JSON.parse(readFileSync('proposals/growth-front-audit/evidence/quartz-observer-census.json','utf8'));
const base='f7ca38c4544e1d1224ca57962e212ee86ec2f8ab';
const git=['-c','safe.directory='+process.cwd()];
const originalBytes=p=>execFileSync('git',[...git,'show',`${base}:${p}`],{maxBuffer:128*1024*1024});
const before=p=>originalBytes(p).toString('utf8').replace(/\r\n/g,'\n');
const after=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const distFiles=readdirSync('dist',{recursive:true}).filter(p=>p.endsWith('.js')
  && p.split(path.sep).every(part=>!part.startsWith('.')))
  .sort((a,b)=>a.replaceAll('\\','/').localeCompare(b.replaceAll('\\','/')));
const sourceHash=sha(distFiles.map(p=>readFileSync(path.join('dist',p),'utf8')).join('\n\n'));
const dataFiles=readdirSync('data',{recursive:true})
  .filter(p=>statSync(path.join('data',p)).isFile()).sort();
// Preserve the census's whole-data-tree identity, including derived metadata.
const dataEntries=dataFiles.map(p=>[p.replaceAll('\\','/'),sha(readFileSync(path.join('data',p)))]);
const dataHash=sha(JSON.stringify(dataEntries));
assert.equal(census.sourceHash,sourceHash,'Final compiled source differs from the controlled census');
let dataIdentityBridge=null;
if(census.dataHash!==dataHash){
  // The no-consumer finding was reviewed for this exact compiled runtime.
  // A later runtime must earn its own dependency review, even with a new census.
  assert.equal(sourceHash,'251dac8565026870cee9623abaf4a6a98d7317825b44cd537dd0118c3c961b6c',
    'Provenance-output bridge requires the independently audited increment A runtime');
  // The normal rebake updates this output's runtime/receipt identities. It is
  // not a simulation input (no js/ consumer, and excluded from offline assets).
  // Reconstruct the ORIGINAL exact census tree using only its pinned old bytes;
  // any other addition, deletion, input edit or byte change still fails closed.
  const relative='generated/science-provenance-manifest.json',file=`data/${relative}`;
  assert.ok(dataEntries.some(([p])=>p===relative),'Generated provenance is missing');
  const oldBytes=originalBytes(file),oldHash=sha(oldBytes),newHash=sha(readFileSync(file));
  const reconstructedHash=sha(JSON.stringify(dataEntries.map(([p,hash])=>[p,p===relative?oldHash:hash])));
  assert.equal(reconstructedHash,census.dataHash,'Data changed beyond the pinned provenance-output rebake');
  const oldManifest=JSON.parse(oldBytes),newManifest=JSON.parse(readFileSync(file,'utf8'));
  const identityFields=['sha256','browser_bundle_sha256','execution_set_sha256','producer_contracts'];
  for(const key of identityFields){delete oldManifest.science_evidence[key];delete newManifest.science_evidence[key];}
  assert.deepEqual(newManifest,oldManifest,'Provenance changed beyond declared evidence identities');
  // Independently recompute the complete new manifest; no hand-authored exception
  // can authorize arbitrary values in the four permitted identity fields.
  execFileSync(process.execPath,['tools/gen-science-provenance-manifest.mjs','--check'],{stdio:'pipe'});
  dataIdentityBridge={file,reason:'Generated provenance output rebaked for the reviewed runtime; no simulation input changed.',
    pinnedBase:base,pinnedFileSha256:oldHash,currentFileSha256:newHash,reconstructedCensusDataHash:reconstructedHash,
    permittedFields:identityFields.map(key=>`science_evidence.${key}`),currentManifestCheck:'PASS'};
}
assert.equal(census.invariant,true,'Census must pass');
assert.equal(census.schema,'quartz-form-observer-audit-v1');
assert.equal(census.seed,42);assert.equal(census.node,process.version);
assert.deepEqual(census.mismatches,[]);
const unchanged=[];
let expectedScenarios=[];
for(const name of ['seed42_v285.json','locality_frequency_v285.json','strip_digest_v285.json']) {
  const p=`tests-js/baselines/${name}`;assert.equal(after(p),before(p),`${p} changed`);unchanged.push(p);
}
for(const dir of ['archive/strips/v285','archive/claim-cards/v285']){
  const expected=execFileSync('git',[...git,'ls-tree','-r','--name-only',base,'--',dir],{encoding:'utf8'})
    .trim().split(/\r?\n/).sort();
  const actual=readdirSync(dir,{recursive:true}).filter(p=>statSync(path.join(dir,p)).isFile())
    .map(p=>`${dir}/${p.replaceAll('\\','/')}`).sort();
  assert.deepEqual(actual,expected,`${dir} inventory changed`);
  if(dir==='archive/strips/v285')expectedScenarios=expected.map(p=>path.posix.basename(p,'.json')).sort();
  for(const p of expected){assert.equal(after(p),before(p),`${p} changed`);unchanged.push(p);}
}
assert.equal(expectedScenarios.length,41,'Pinned calibration fleet changed');
assert.equal(census.scenarios,expectedScenarios.length);
assert.ok(Array.isArray(census.rows));
assert.deepEqual(census.rows.map(r=>r.name).sort(),expectedScenarios,'Census must cover each scenario exactly once');
for(const row of census.rows){
  assert.ok(Number.isSafeInteger(row.steps)&&row.steps>0,`${row.name}: invalid duration`);
  assert.equal(row.calls,row.steps,`${row.name}: missing finalized observer calls`);
  assert.deepEqual(row.missing,[],`${row.name}: missing eligible ledgers`);
  assert.match(row.trace,/^[a-f0-9]{64}$/,`${row.name}: missing trajectory digest`);
}
const updatedIdentities=[];
for(const name of ['mechanism-witnesses-v285.json','guided-tutorial-browser-v285.json']) {
  const p=`archive/evidence/${name}`,a=JSON.parse(before(p)),b=JSON.parse(after(p));
  const expectedIdentities={browser_bundle_sha256:browserBundleDigest(process.cwd()),
    execution_set_sha256:runtimeExecutionDigest(process.cwd()),
    producer_contract_sha256:producerContractDigest(process.cwd(),name.startsWith('mechanism-')?'mechanism-witnesses':'guided-tutorial-browser')};
  const changed=[];
  for(const key of ['browser_bundle_sha256','execution_set_sha256','producer_contract_sha256']){
    assert.equal(b[key],expectedIdentities[key],`${p} ${key} does not bind the current producer/runtime`);
    if(a[key]!==b[key])changed.push(key);delete a[key];delete b[key];
  }
  assert.deepEqual(b,a,`${p} changed beyond exact execution/producer identities`);
  updatedIdentities.push({file:p,changed});
}
const result={base,censusSourceHash:sourceHash,censusDataHash:census.dataHash,currentDataHash:dataHash,
  dataIdentityBridge,unchanged,updatedIdentities,
  conclusion:'Scientific baselines, archived strips, claim cards, mechanism payload and browser journey outcomes remain unchanged.'};
writeFileSync('proposals/growth-front-audit/evidence/quartz-observer-release-comparison.json',JSON.stringify(result,null,2)+'\n');
console.log(`${unchanged.length} baseline/archive/card files unchanged; witness and browser payloads unchanged.`);
