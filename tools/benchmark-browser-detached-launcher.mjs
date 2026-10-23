// Internal child of benchmark-browser-cleanup-probe.mjs. It deliberately exits
// while Chrome survives, reproducing Windows launchers that detach the browser.
import { spawn } from 'node:child_process';
import { readFileSync,openSync,closeSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findOwnedBrowserExecutable,ownedBrowserExecutableIdentity } from './owned-browser-runtime.mjs';
import {chromeProbeArguments,PROBE_STDERR_FILE,PROBE_LAUNCH_FILE} from './benchmark-browser-startup.mjs';

const [profile, runId] = process.argv.slice(2);
if (!profile || path.dirname(profile) !== path.resolve(os.tmpdir())
    || !path.basename(profile).startsWith('vugg-cleanup-probe-')
    || JSON.parse(readFileSync(path.join(profile, 'probe-owner.json'), 'utf8')).runId !== runId) {
  throw new Error('Detached launcher requires its fresh probe-owned profile');
}
const executable=findOwnedBrowserExecutable(),args=chromeProbeArguments(profile);
const requestedUtc=new Date().toISOString();
// The browser inherits this file handle, not the launcher's stderr pipe. It
// can report a startup failure after this intentionally detached launcher exits.
const stderrFd=openSync(path.join(profile,PROBE_STDERR_FILE),'wx');
let child;
try{child=spawn(executable,args,{detached:true,stdio:['ignore','ignore',stderrFd],windowsHide:true});}
finally{closeSync(stderrFd);}
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('spawn', () => {
  writeFileSync(path.join(profile,PROBE_LAUNCH_FILE),JSON.stringify({schema:'vugg-probe-chrome-launch-v1',
    requested_utc:requestedUtc,spawned_utc:new Date().toISOString(),spawned_pid:child.pid,
    executable,executable_identity:ownedBrowserExecutableIdentity(executable),arguments:args,
    authority:'diagnostic-only-not-process-ownership'})+'\n');
  console.log(JSON.stringify({spawned_pid:child.pid}));child.unref();
});
