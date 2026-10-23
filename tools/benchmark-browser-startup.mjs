// Diagnostic-only support for the real detached-Chrome probe. These files,
// reported PIDs and version strings confer no process/termination authority.
import {execFileSync} from 'node:child_process';
import {openSync,closeSync,fstatSync,readSync,readFileSync} from 'node:fs';
import path from 'node:path';

export const PROBE_STARTUP_TIMEOUT_MS=10_000;
export const PROBE_DIAGNOSTIC_WINDOW_MS=20_000;
export const PROBE_STDERR_FILE='chrome-startup-stderr.log';
export const PROBE_LAUNCH_FILE='chrome-startup.json';
export const PROBE_STDERR_LIMIT=64*1024;

export function chromeProbeArguments(profile){
  return ['--headless=new','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',
    '--disable-extensions','--disable-background-networking','--disable-component-update',
    '--disable-sync','--no-sandbox','--mute-audio','about:blank'];
}

// Read native file metadata; never invoke `chrome --version`, which can itself
// launch/detach another browser on Windows. Keep unavailable evidence explicit.
export function probeBrowserFileVersion(executable,{platform=process.platform,runner=execFileSync}={}){
  if(platform!=='win32')return {status:'unavailable',reason:'Windows PE version observation requires Windows'};
  try{
    const stdout=runner('powershell.exe',['-NoProfile','-NonInteractive','-Command',
      "$v=(Get-Item -LiteralPath $env:VUGG_PROBE_VERSION_PATH -ErrorAction Stop).VersionInfo; @{file_version=$v.FileVersion;product_version=$v.ProductVersion} | ConvertTo-Json -Compress"],
      {env:{...process.env,VUGG_PROBE_VERSION_PATH:executable},windowsHide:true,timeout:10_000,maxBuffer:16*1024,encoding:'utf8'});
    const v=JSON.parse(String(stdout).replace(/^\uFEFF/,''));
    if(!v||!['file_version','product_version'].every(k=>typeof v[k]==='string'&&v[k].length>0&&v[k].length<=512))throw Error('Missing or oversized PE version metadata');
    return {status:'recorded',file_version:v.file_version,product_version:v.product_version};
  }catch(error){return {status:'unavailable',reason:String(error.message).slice(0,2048)};}
}

// Retain the bounded tail without reading an arbitrarily large log into RAM.
// A truncated log is never described as complete diagnostic evidence.
export function readProbeStderr(profile){
  let fd;
  try{
    fd=openSync(path.join(profile,PROBE_STDERR_FILE),'r');
    const stat=fstatSync(fd),length=Math.min(stat.size,PROBE_STDERR_LIMIT),bytes=Buffer.alloc(length);
    const count=readSync(fd,bytes,0,length,Math.max(0,stat.size-length));
    return {status:'recorded',file:PROBE_STDERR_FILE,total_bytes:stat.size,captured_bytes:count,
      truncated:stat.size>PROBE_STDERR_LIMIT,selection:'tail',text:bytes.subarray(0,count).toString('utf8')};
  }catch(error){return {status:'unavailable',file:PROBE_STDERR_FILE,error:String(error.message).slice(0,2048)};}
  finally{if(fd!==undefined)closeSync(fd);}
}

export function readProbeStartupEvidence(profile){
  let launch;
  try{
    // Launcher metadata is deliberately small. Refuse oversized/partial files
    // rather than hiding the original startup error behind a parsing failure.
    const file=path.join(profile,PROBE_LAUNCH_FILE),fd=openSync(file,'r');
    try{
      if(fstatSync(fd).size>16*1024)throw Error('Oversized launcher metadata');
      launch=JSON.parse(readFileSync(fd,'utf8'));
    }finally{closeSync(fd);}
    if(!launch||launch.schema!=='vugg-probe-chrome-launch-v1'||!Number.isSafeInteger(launch.spawned_pid)||launch.spawned_pid<=0)throw Error('Invalid launcher metadata');
  }catch(error){launch={status:'unavailable',error:String(error.message).slice(0,2048)};}
  return {authority:'diagnostic-only-not-process-ownership',launch,stderr:readProbeStderr(profile)};
}

// Observe a possible late receipt without converting a failed startup to a
// pass. The caller must still authenticate its nonce and native owner before
// using it even for cleanup. A hung observation is bounded independently.
export async function observeLateProbeStartup(waitForReceipt,{windowMs=PROBE_DIAGNOSTIC_WINDOW_MS}={}){
  if(!Number.isSafeInteger(windowMs)||windowMs<1||windowMs>PROBE_DIAGNOSTIC_WINDOW_MS)throw Error('Invalid diagnostic window');
  const started=performance.now();let timer;
  try{
    const receipt=await Promise.race([waitForReceipt(windowMs),new Promise((_resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('Diagnostic observation deadline exceeded')),windowMs);
    })]);
    return {status:'late-receipt-observed',accept_startup:false,window_ms:windowMs,elapsed_ms:performance.now()-started,receipt};
  }catch(error){return {status:'no-late-receipt-observed',accept_startup:false,window_ms:windowMs,
    elapsed_ms:performance.now()-started,error:String(error.message).slice(0,2048)};}
  finally{clearTimeout(timer);}
}
