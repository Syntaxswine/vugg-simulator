#!/usr/bin/env node
/**
 * tools/process-census.mjs — the foreman. Who else is on the site, whose tools
 * are these, and did anyone leave theirs behind?
 *
 * WHY. On 2026-08-18 a serial-vs-parallel benchmark was launched on this
 * workstation while ANOTHER agent had been running a full cold suite out of a
 * second Vugg checkout for the previous 1.77 hours. Nothing refused the
 * benchmark, nothing recorded the collision, and the only reason it was caught
 * is that someone thought to look. A benchmark run on a contended machine does
 * not report an error — it reports a NUMBER, and that number goes into a
 * proposal and then into a design decision.
 *
 * Process leakage and test duration are separate defects and this tool keeps
 * them separate: it measures the population, it never blames the suite.
 *
 * THREE MODES, AND ONLY ONE OF THEM REFUSES.
 *
 *   --preflight   inventory JS-runtime processes, classify them, and EXIT 1 if
 *                 an unrelated Vugg/Vitest worker is already running. This is a
 *                 gate ON BENCHMARKING, not on correctness: it protects a
 *                 measurement from being taken in a crowd. `--allow-busy`
 *                 downgrades it to a warning for when you mean it.
 *
 *   --postflight  given a root PID, verify its tree is gone. Reports survivors
 *                 with full attribution. It does NOT kill them: whoever owns a
 *                 tree kills that tree, and a tool that reaps other people's
 *                 processes is a worse defect than the leak.
 *
 *   --hygiene     age-ranked report of long-lived JS processes, grouped by
 *                 command. Never kills, never exits non-zero. Anonymous
 *                 `node.exe` is NOT evidence of anything — OpenClaw, language
 *                 servers, MCP servers and editors all look exactly like a
 *                 leaked worker from the outside. Age plus a command line
 *                 pointing into a repo is evidence; a name is not.
 *
 * WHAT MAKES A LEAK CANDIDATE. Not the name. A process qualifies only when its
 * command line points into a known checkout AND it is older than the threshold
 * AND it is not a descendant of a live run. All three, stated in the output, so
 * a reader can disagree with the classification instead of trusting it.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RECEIPT_DIR = path.join(ROOT, '.local-evidence');

/** Command-line fragments that mark a process as belonging to test/build work. */
export const WORK_MARKERS = [/vitest/i, /vite\b/i, /test-workflow/i, /cold-ci/i, /build-all/i];
/** Fragments that mark a process as belonging to a Vugg checkout, wherever it lives. */
export const CHECKOUT_MARKERS = [/vugg/i];
/** A JS process older than this, still pointing at a checkout, is worth a look. */
export const STALE_HOURS = 6;

export async function listJsProcesses() {
  if (process.platform !== 'win32') {
    const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,ppid=,etimes=,rss=,args='], {
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.trim().split('\n').map(line => {
      const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
      if (!m) return null;
      return {
        pid: Number(m[1]), ppid: Number(m[2]), ageHours: Number(m[3]) / 3600,
        rssMb: Math.round(Number(m[4]) / 1024), cmd: m[5],
      };
    }).filter(Boolean).filter(p => /\bnode\b|\besbuild\b/.test(p.cmd));
  }
  // PowerShell rather than tasklist: only CIM carries CommandLine and
  // CreationDate, and without those this tool can only count anonymous
  // node.exe — which is the thing it must never act on.
  // CreationDate is formatted to a round-trip ISO string INSIDE PowerShell.
  // ConvertTo-Json renders a CIM DateTime as `/Date(…)/`, which `new Date()`
  // parses to NaN — and a NaN age fails every `>= STALE_HOURS` comparison, so
  // the leak detector would run forever and never once fire. A detector that
  // cannot fire looks exactly like a clean machine.
  const script = `Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='esbuild.exe'" |`
    + ` Select-Object ProcessId,ParentProcessId,WorkingSetSize,CommandLine,`
    + `@{n='CreatedIso';e={$_.CreationDate.ToString('o')}} |`
    + ` ConvertTo-Json -Depth 3 -Compress`;
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command', script,
  ], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  const raw = stdout.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const now = Date.now();
  return (Array.isArray(parsed) ? parsed : [parsed]).map(p => {
    const started = Date.parse(p.CreatedIso);
    return {
      pid: p.ProcessId,
      ppid: p.ParentProcessId,
      // The absolute start time, not just the age. A lease identifies its owner
      // by (pid, startedIso) because PIDs are RECYCLED: a lease naming only a
      // PID is one reboot-and-reuse away from a stranger's process vouching for
      // a run that ended hours ago.
      startedIso: Number.isFinite(started) ? new Date(started).toISOString() : null,
      // null, never NaN. Callers must decide what to do about "unknown";
      // arithmetic silently deciding it for them is how this broke.
      ageHours: Number.isFinite(started) ? (now - started) / 3600000 : null,
      rssMb: Math.round((p.WorkingSetSize || 0) / 1048576),
      cmd: p.CommandLine || '(no command line)',
    };
  });
}

/** Every descendant of `rootPid`, transitively, from a process list. */
export function descendantsOf(processes, rootPid) {
  const byParent = new Map();
  for (const p of processes) {
    if (!byParent.has(p.ppid)) byParent.set(p.ppid, []);
    byParent.get(p.ppid).push(p);
  }
  const out = [];
  const stack = [rootPid];
  // Seed with the root so a parent CYCLE cannot walk back around and return the
  // root as its own descendant. PIDs are recycled by the OS, so a cycle is not
  // hypothetical — and a caller terminating "descendants, then the root" would
  // otherwise try the root twice and, worse, count it as a survivor of itself.
  const seen = new Set([rootPid]);
  while (stack.length) {
    const pid = stack.pop();
    for (const child of byParent.get(pid) || []) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      out.push(child);
      stack.push(child.pid);
    }
  }
  return out;
}

export function classify(processes, { selfPid = process.pid, repoRoot = ROOT } = {}) {
  const ownTree = new Set([selfPid, ...descendantsOf(processes, selfPid).map(p => p.pid)]);
  // Match on the FULL checkout path, never the basename. `GTP\Vugg-Simulator`
  // and `vugg\vugg-simulator` share a basename, so a basename test called a
  // rival checkout's worker "this-checkout" — the one classification that would
  // have let a contended benchmark through as if it were our own process.
  const rootLower = repoRoot.toLowerCase().replaceAll('\\', '/');
  return processes.map(p => {
    const cmdLower = p.cmd.toLowerCase().replaceAll('\\', '/');
    const isWork = WORK_MARKERS.some(re => re.test(p.cmd));
    const isCheckout = CHECKOUT_MARKERS.some(re => re.test(p.cmd));
    const thisRepo = cmdLower.includes(rootLower);
    let kind = 'other';
    if (ownTree.has(p.pid)) kind = 'mine';
    else if (isWork && isCheckout) kind = thisRepo ? 'this-checkout' : 'other-checkout';
    else if (isWork) kind = 'work';
    const stale = p.ageHours != null && p.ageHours >= STALE_HOURS;
    return {
      ...p, kind,
      // Stated so a reader can disagree with the verdict rather than trust it.
      leakCandidate: kind !== 'mine' && isCheckout && stale,
      ageKnown: p.ageHours != null,
      why: [isWork && 'test/build command', isCheckout && 'points at a checkout',
        stale && `${p.ageHours.toFixed(1)} h old`,
        p.ageHours == null && 'AGE UNKNOWN — cannot judge staleness'].filter(Boolean).join('; '),
    };
  });
}

function line(p) {
  const cmd = p.cmd.length > 108 ? p.cmd.slice(0, 108) + '…' : p.cmd;
  // '?' where the age is unknown. `NaN h` reads as a broken number a reader
  // skims past; '?' reads as a question the tool is admitting it cannot answer.
  const age = p.ageHours == null ? '      ?' : p.ageHours.toFixed(2).padStart(7);
  return `  ${String(p.pid).padStart(6)}  ppid ${String(p.ppid).padStart(6)}  `
    + `${age} h  ${String(p.rssMb).padStart(5)} MB  ${cmd}`;
}

function writeReceipt(name, payload) {
  try {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
    fs.writeFileSync(path.join(RECEIPT_DIR, name), JSON.stringify(payload, null, 2) + '\n');
  } catch (error) {
    console.error(`[process-census] could not write receipt: ${error.message}`);
  }
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const flag = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const processes = classify(await listJsProcesses());
  const stamp = new Date().toISOString();

  if (argv.includes('--postflight')) {
    const rootPid = Number(flag('--postflight'));
    if (!Number.isInteger(rootPid)) {
      console.error('[process-census] --postflight needs the run\'s root PID');
      process.exit(2);
    }
    const survivors = processes.filter(p => p.pid === rootPid)
      .concat(descendantsOf(processes, rootPid));
    writeReceipt('process-postflight.json', { stamp, rootPid, survivors });
    if (!survivors.length) {
      console.log(`[process-census] clean — no descendant of ${rootPid} survives.`);
      process.exit(0);
    }
    console.error(`[process-census] LEAK — ${survivors.length} process(es) outlived the run rooted at ${rootPid}:`);
    for (const p of survivors) console.error(line(p));
    console.error('[process-census] not killing them: whoever owns a tree kills that tree.');
    process.exit(1);
  }

  if (argv.includes('--hygiene')) {
    const old = processes.filter(p => p.ageHours != null && p.ageHours >= STALE_HOURS)
      .sort((a, b) => b.ageHours - a.ageHours);
    const unknown = processes.filter(p => p.ageHours == null);
    console.log(`[process-census] ${processes.length} JS-runtime process(es); ${old.length} older than ${STALE_HOURS} h`);
    for (const p of old) {
      console.log(line(p));
      console.log(`          ${p.leakCandidate ? 'LEAK CANDIDATE' : 'not a candidate'} — ${p.why || 'no marker matched'}`);
    }
    if (unknown.length) {
      console.log(`[process-census] ${unknown.length} process(es) have NO readable start time — not judged either way:`);
      for (const p of unknown) console.log(line(p));
    }
    console.log('[process-census] report only. An anonymous node.exe is not evidence —');
    console.log('[process-census] OpenClaw, language servers and MCP servers look identical from outside.');
    process.exit(0);
  }

  // --preflight (default)
  const intruders = processes.filter(p => p.kind === 'this-checkout' || p.kind === 'other-checkout');
  writeReceipt('process-preflight.json', { stamp, selfPid: process.pid, processes });
  console.log(`[process-census] preflight ${stamp} — ${processes.length} JS-runtime process(es)`);
  for (const p of processes) console.log(`${line(p)}\n          [${p.kind}]`);
  if (!intruders.length) {
    console.log('[process-census] CLEAR — no unrelated Vugg/Vitest worker is running. Safe to benchmark.');
    process.exit(0);
  }
  console.error('');
  console.error(`[process-census] BUSY — ${intruders.length} unrelated Vugg/Vitest worker(s) are already running:`);
  for (const p of intruders) console.error(line(p));
  console.error('[process-census] A benchmark taken now does not report an error, it reports a NUMBER.');
  if (argv.includes('--allow-busy')) {
    console.error('[process-census] --allow-busy given: proceeding, and the result is not a clean measurement.');
    process.exit(0);
  }
  process.exit(1);
}
