import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {chromeProbeArguments,probeBrowserFileVersion,readProbeStderr,readProbeStartupEvidence,
  PROBE_STARTUP_TIMEOUT_MS,PROBE_STDERR_FILE,PROBE_LAUNCH_FILE,PROBE_STDERR_LIMIT,observeLateProbeStartup,PROBE_DIAGNOSTIC_WINDOW_MS} from '../tools/benchmark-browser-startup.mjs';

const profiles:string[]=[];
function profile(){const p=mkdtempSync(path.join(os.tmpdir(),'vugg-startup-test-'));profiles.push(p);return p;}
afterEach(()=>{for(const p of profiles.splice(0)){
  if(path.dirname(p)!==path.resolve(os.tmpdir())||!path.basename(p).startsWith('vugg-startup-test-'))throw Error('Not a disposable test profile');
  rmSync(p,{recursive:true,force:true});
}});

describe('detached Chrome startup evidence',()=>{
  it('keeps the same bounded startup window and forwards a spaced profile as one argument',()=>{
    const p=path.join(os.tmpdir(),'vugg-cleanup-probe-profile with spaces');
    const args=chromeProbeArguments(p);
    expect(PROBE_STARTUP_TIMEOUT_MS).toBe(10_000);
    expect(args.filter(a=>a.startsWith('--user-data-dir='))).toEqual([`--user-data-dir=${p}`]);
    expect(args).toContain('--remote-debugging-port=0');expect(args).toContain('--remote-debugging-address=127.0.0.1');
    expect(args).toContain('--headless=new');expect(args.at(-1)).toBe('about:blank');
    expect(args.some(a=>a.includes('remote-allow-origins'))).toBe(false);
  });

  it('reads PE metadata with a hidden bounded PowerShell read, never a Chrome launch',()=>{
    const p='C:\\Browser with spaces\\chrome.exe';let command:any;
    const r=probeBrowserFileVersion(p,{platform:'win32',runner:((exe:any,args:any,options:any)=>{
      command={exe,args,options};return JSON.stringify({file_version:'155.0.8059.41',product_version:'155.0.8059.41'});
    }) as any});
    expect(r).toEqual({status:'recorded',file_version:'155.0.8059.41',product_version:'155.0.8059.41'});
    expect(command.exe).toBe('powershell.exe');expect(command.options.windowsHide).toBe(true);
    expect(command.options.timeout).toBe(10_000);expect(command.options.env.VUGG_PROBE_VERSION_PATH).toBe(p);
    expect(command.args.join(' ')).not.toContain(p);expect(command.args.join(' ')).toContain('Get-Item -LiteralPath');
  });

  it.each(['{}','not json',JSON.stringify({file_version:'x'.repeat(513),product_version:'155'})])(
    'keeps missing/malformed version metadata explicit: %s',value=>{
      expect(probeBrowserFileVersion('chrome.exe',{platform:'win32',runner:(()=>value) as any}).status).toBe('unavailable');
    });
  it('bounds a version-read failure instead of emitting an unbounded child error',()=>{
    const r=probeBrowserFileVersion('chrome.exe',{platform:'win32',runner:(()=>{throw Error('x'.repeat(20_000));}) as any});
    expect(r.status).toBe('unavailable');expect(r.reason.length).toBeLessThanOrEqual(2048);
  });
  it('does not attempt a Windows observation on an unsupported host',()=>{
    let calls=0;const r=probeBrowserFileVersion('chrome',{platform:'linux',runner:(()=>{calls++;}) as any});
    expect(r.status).toBe('unavailable');expect(calls).toBe(0);
  });
  it.runIf(process.platform==='win32')('can read native executable version without executing that binary',()=>{
    const r=probeBrowserFileVersion(process.execPath);expect(r.status).toBe('recorded');
    expect(r.file_version).toContain('24.15');
  });

  it('retains an empty but successfully opened log distinctly from an unavailable file',()=>{
    const p=profile();expect(readProbeStderr(p).status).toBe('unavailable');
    writeFileSync(path.join(p,PROBE_STDERR_FILE),'');
    expect(readProbeStderr(p)).toMatchObject({status:'recorded',total_bytes:0,captured_bytes:0,truncated:false,text:''});
  });
  it('captures only a bounded tail of large stderr and identifies truncation',()=>{
    const p=profile(),text='x'.repeat(PROBE_STDERR_LIMIT*4)+'last startup error';
    const file=path.join(p,PROBE_STDERR_FILE);writeFileSync(file,text);
    const r=readProbeStderr(p);expect(r.status).toBe('recorded');expect(r.captured_bytes).toBe(PROBE_STDERR_LIMIT);
    expect(r.total_bytes).toBe(Buffer.byteLength(text));expect(r.truncated).toBe(true);
    expect(r.selection).toBe('tail');expect(r.text).toBe(text.slice(-PROBE_STDERR_LIMIT));
    // Retire the disposable log immediately after observation.
    rmSync(file);
  });
  it('preserves useful stderr even when launcher metadata is missing or partial',()=>{
    const p=profile();writeFileSync(path.join(p,PROBE_STDERR_FILE),'fatal browser startup detail');
    writeFileSync(path.join(p,PROBE_LAUNCH_FILE),'{"spawned_pid":');
    const r=readProbeStartupEvidence(p);expect(r.launch.status).toBe('unavailable');
    expect(r.stderr.text).toBe('fatal browser startup detail');
    expect(r.authority).toBe('diagnostic-only-not-process-ownership');
  });
  it('refuses oversized launcher metadata without losing the original stderr',()=>{
    const p=profile();writeFileSync(path.join(p,PROBE_LAUNCH_FILE),' '.repeat(20_000));
    writeFileSync(path.join(p,PROBE_STDERR_FILE),'startup failed');
    const r=readProbeStartupEvidence(p);expect(r.launch.error).toContain('Oversized');expect(r.stderr.text).toBe('startup failed');
  });
  it.each([0,-1,'42',null])('does not accept invalid reported PIDs as even a diagnostic row: %s',pid=>{
    const p=profile();writeFileSync(path.join(p,PROBE_LAUNCH_FILE),JSON.stringify({schema:'vugg-probe-chrome-launch-v1',spawned_pid:pid}));
    expect(readProbeStartupEvidence(p).launch.status).toBe('unavailable');
  });
  it('labels a valid spawn report diagnostic-only and invents no ownership receipt',()=>{
    const p=profile();writeFileSync(path.join(p,PROBE_LAUNCH_FILE),JSON.stringify({schema:'vugg-probe-chrome-launch-v1',spawned_pid:42,arguments:['about:blank']}));
    const r=readProbeStartupEvidence(p);expect(r.launch.spawned_pid).toBe(42);expect(r.authority).toContain('not-process-ownership');
    expect(r).not.toHaveProperty('rootReceipt');expect(r).not.toHaveProperty('receipts');
  });
  it('reports late readiness without accepting it or granting ownership',async()=>{
    const receipt={port:43123,webSocketDebuggerUrl:'ws://127.0.0.1:43123/devtools/browser/exact-nonce'};
    const r=await observeLateProbeStartup(async ms=>{expect(ms).toBe(PROBE_DIAGNOSTIC_WINDOW_MS);return receipt;});
    expect(r).toMatchObject({status:'late-receipt-observed',accept_startup:false,receipt});
    expect(r).not.toHaveProperty('rootReceipt');expect(PROBE_STARTUP_TIMEOUT_MS).toBe(10_000);
  });
  it('bounds a hung diagnostic observation and still refuses startup',async()=>{
    const r=await observeLateProbeStartup(()=>new Promise(()=>{}),{windowMs:10});
    expect(r).toMatchObject({status:'no-late-receipt-observed',accept_startup:false,window_ms:10});
    expect(r.error).toContain('deadline');
  });
  it('preserves an observed failure as diagnostic evidence without changing acceptance',async()=>{
    const r=await observeLateProbeStartup(async()=>{throw Error('browser exited without a receipt');});
    expect(r.accept_startup).toBe(false);expect(r.error).toContain('exited without a receipt');
  });
});
