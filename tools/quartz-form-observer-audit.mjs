// Reproduce increment A's seed-42 full-fleet invariance and storage census.
// npm run build; node tools/quartz-form-observer-audit.mjs
// Sequential child processes isolate ON/OFF closures, RNG and browser globals.
// This is diagnostic evidence, not a substitute for authenticated release receipts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadSimBundle } from './_harness.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, 'proposals/growth-front-audit/evidence/quartz-observer-census.json');
const sha = value => createHash('sha256').update(value).digest('hex');
function inputIdentity() {
  const files = fs.readdirSync(path.join(root,'data'),{recursive:true})
    .filter(f=>fs.statSync(path.join(root,'data',f)).isFile()).sort();
  return sha(JSON.stringify(files.map(f=>[f.replaceAll('\\','/'),sha(fs.readFileSync(path.join(root,'data',f)))])));
}
const mode = process.argv[2];
if (mode === '--on' || mode === '--off') {
  let sourceHash, calls = 0, observerMs = 0;
  const dataHash = inputIdentity();
  const api = await loadSimBundle({toolName:'quartz-observer-audit',
    extraExports:['recordQuartzFormObservations','validateQuartzFormHistory','quartzFormObservationAtStep','QUARTZ_FORM_HISTORY_LIMITS'],
    transformBundle(source) {
      sourceHash = sha(source);
      const hook = 'recordQuartzFormObservations(this);';
      if (source.split(hook).length !== 2) throw new Error('Expected exactly one finalized-step hook');
      return source.replace(hook, 'globalThis.__quartzObserverProbe(this);');
    }});
  globalThis.__quartzObserverProbe = sim => {
    calls++;
    if (mode === '--off') return;
    const start = performance.now();
    api.recordQuartzFormObservations(sim);
    observerMs += performance.now() - start;
  };
  const rows = [];
  for (const name of Object.keys(api.SCENARIOS).sort()) {
    api.setSeed(42); calls = 0; observerMs = 0;
    const {conditions,events,defaultSteps} = api.SCENARIOS[name]();
    if (!Number.isSafeInteger(defaultSteps) || defaultSteps <= 0) throw new Error(`Invalid duration: ${name}`);
    const sim = new api.VugSimulator(conditions,events);
    const trace = createHash('sha256');
    let stepMs = 0;
    for (let i = 0; i < defaultSteps; i++) {
      const start = performance.now(); sim.run_step(); stepMs += performance.now() - start;
      // Every finalized cursor: existing scientific projection (including RNG),
      // plus every enumerable crystal/zone/classifier field, not just final counts.
      trace.update(JSON.stringify([sim.step,api.simulationStateFingerprint(sim),sim.crystals]));
    }
    const ledgers = sim.crystals.map(c => c._quartzFormHistory).filter(Boolean);
    const missing = sim.crystals.filter(c=>c.mineral==='quartz' && !c._quartzFormHistory)
      .map(c=>({id:c.crystal_id,...api.quartzFormObservationAtStep(c,sim.step)}));
    if (mode === '--on' && sim.crystals.some(c => c._quartzFormHistory
      && !api.validateQuartzFormHistory(c._quartzFormHistory,c.zones))) throw new Error(`Invalid ledger: ${name}`);
    const records = ledgers.map(h => [h.initial,...h.changes].filter(Boolean));
    const recordBytes = records.map(rs => rs.reduce((n,r)=>n+Buffer.byteLength(JSON.stringify(r)),0));
    rows.push({name,steps:sim.step,crystals:sim.crystals.length,
      quartz:sim.crystals.filter(c=>c.mineral==='quartz').length,trace:trace.digest('hex'),
      calls,stepMs,observerMs,ledgers:ledgers.length,
      records:records.reduce((n,rs)=>n+rs.length,0),maxRecords:Math.max(0,...records.map(rs=>rs.length)),
      recordBytes:recordBytes.reduce((n,b)=>n+b,0),maxRecordBytes:Math.max(0,...recordBytes),
      ledgerJsonBytes:ledgers.reduce((n,h)=>n+Buffer.byteLength(JSON.stringify(h)),0),
      missing,unavailable:ledgers.filter(h=>h.unavailable).map(h=>({id:h.source_crystal_id,...h.unavailable}))});
    console.error(`${mode} ${name}: ${sim.step} steps, ${ledgers.length} ledgers, ${observerMs.toFixed(1)} ms observer`);
  }
  if (dataHash !== inputIdentity()) throw new Error('Runtime data changed during audit');
  fs.writeFileSync(process.argv[3],JSON.stringify({mode,node:process.version,sourceHash,dataHash,limits:api.QUARTZ_FORM_HISTORY_LIMITS,rows},null,2)+'\n');
} else {
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const results = [];
  for (const flag of ['--off','--on']) {
    const temp = path.join(root,'.local-evidence',`quartz-observer-${flag.slice(2)}.json`);
    fs.mkdirSync(path.dirname(temp),{recursive:true});
    const child = spawnSync(process.execPath,[fileURLToPath(import.meta.url),flag,temp],
      {cwd:root,stdio:'inherit',timeout:90*60*1000,windowsHide:true});
    if (child.error || child.status !== 0) throw child.error || new Error(`${flag} failed: ${child.status}`);
    results.push(JSON.parse(fs.readFileSync(temp,'utf8')));
  }
  const [off,on] = results;
  if (off.sourceHash !== on.sourceHash || off.dataHash !== on.dataHash) throw new Error('Source/data changed during control');
  if (off.rows.length !== on.rows.length || !on.rows.length) throw new Error('Scenario coverage differs');
  const mismatches = on.rows.filter((r,i)=>r.name!==off.rows[i]?.name || r.trace!==off.rows[i]?.trace
    || r.steps!==off.rows[i].steps || r.calls!==r.steps || off.rows[i].calls!==off.rows[i].steps || r.missing.length);
  const report = {schema:'quartz-form-observer-audit-v1',basis:'finalized-step simulator descriptors; no face kinetics',
    node:on.node,sourceHash:on.sourceHash,dataHash:on.dataHash,seed:42,scenarios:on.rows.length,
    invariant:mismatches.length===0,mismatches:mismatches.map(r=>r.name),
    comparison:'All finalized-step scientific fingerprints and enumerable crystal/zone fields, with the sole observer hook enabled versus disabled in isolated processes.',
    storage:'Record quotas count UTF-8 JSON record bytes only; ledgerJsonBytes also includes fixed metadata. Neither measures JS heap.',
    timing:'Single serial sample; observer timing excludes diagnostics and trace hashing, includes snapshot/append work. Not a benchmark guarantee.',
    limits:on.limits,rows:on.rows.map((r,i)=>({...r,offStepMs:off.rows[i].stepMs}))};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(`Wrote ${output}; invariance ${report.invariant ? 'PASS' : 'FAIL'}`);
  if (!report.invariant) process.exitCode=1;
}
