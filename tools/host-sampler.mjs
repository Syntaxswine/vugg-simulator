#!/usr/bin/env node
/**
 * tools/host-sampler.mjs — record what the MACHINE was doing while a run ran.
 *
 * WHY. The batch census records each test child's peak RSS and its wall time.
 * It does not record host-wide available memory, swap activity, total CPU load,
 * or who else was on the box — so when a 15-minute file appears in the profile,
 * the record cannot distinguish "this file is expensive" from "another process
 * was eating the machine." It cannot rule contention in OR out, which means
 * every outlier is arguable forever. This closes that gap: a timeline the batch
 * profile can be laid against, so a suspicion becomes a receipt.
 *
 * WHAT IT IS NOT. A gate, and not a throttle. It never kills anything, never
 * exits non-zero on a busy machine, and never changes what it observes. If it
 * cannot sample it says so in the record and keeps going, because a telemetry
 * gap must look like a gap and not like a quiet machine.
 *
 * COST. The 1 s sample is in-process only — os.freemem/os.totalmem/os.cpus,
 * no child processes. Competitor identity needs `tasklist.exe`, which is a
 * spawn, so it runs on a slower cadence: the existing RSS watchdog already
 * shells out every second and two consecutive failures kill a batch, so adding
 * a second per-second spawn would make the runner likelier to false-RED a
 * healthy run. Observing harder must not break the thing observed.
 *
 * Usage:
 *   node tools/host-sampler.mjs                   # sample until SIGINT
 *   node tools/host-sampler.mjs --seconds 600     # sample for a fixed window
 *   node tools/host-sampler.mjs --out <path>      # default .local-evidence/host-telemetry.jsonl
 *   node tools/host-sampler.mjs --report <path>   # summarise an existing record
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_OUT = path.join(ROOT, '.local-evidence', 'host-telemetry.jsonl');

export const SAMPLE_INTERVAL_MS = 1000;
export const PROCESS_SCAN_EVERY = 10;   // samples, i.e. every ~10 s
export const TOP_PROCESSES = 6;

/** Aggregate busy fraction between two os.cpus() snapshots. */
export function cpuBusyFraction(previous, current) {
  if (!previous || previous.length !== current.length) return null;
  let idle = 0;
  let total = 0;
  for (let index = 0; index < current.length; index++) {
    const a = previous[index].times;
    const b = current[index].times;
    const deltaIdle = b.idle - a.idle;
    const deltaTotal = (b.user - a.user) + (b.nice - a.nice) + (b.sys - a.sys)
      + deltaIdle + (b.irq - a.irq);
    idle += deltaIdle;
    total += deltaTotal;
  }
  if (total <= 0) return null;
  return Math.max(0, Math.min(1, 1 - idle / total));
}

async function topProcesses(limit = TOP_PROCESSES) {
  if (process.platform !== 'win32') {
    const { stdout } = await execFileAsync('ps', ['-eo', 'rss=,comm='], { encoding: 'utf8' });
    return stdout.trim().split('\n')
      .map(line => line.trim().split(/\s+/))
      .map(([rssKb, ...name]) => ({ name: name.join(' '), rss_mb: Math.round(Number(rssKb) / 1024) }))
      .sort((a, b) => b.rss_mb - a.rss_mb).slice(0, limit);
  }
  const { stdout } = await execFileAsync('tasklist.exe', ['/FO', 'CSV', '/NH'], {
    windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  const rows = [];
  for (const line of stdout.split('\n')) {
    const fields = [...line.matchAll(/"([^"]*)"/g)].map(match => match[1]);
    if (fields.length < 5) continue;
    const rssKb = Number(fields[4].replace(/[^0-9]/g, ''));
    if (!Number.isFinite(rssKb)) continue;
    rows.push({ name: fields[0], pid: Number(fields[1]), rss_mb: Math.round(rssKb / 1024) });
  }
  return rows.sort((a, b) => b.rss_mb - a.rss_mb).slice(0, limit);
}

export async function sampleHost({ previousCpus = null, withProcesses = false } = {}) {
  const cpus = os.cpus();
  const sample = {
    t: new Date().toISOString(),
    free_mb: Math.round(os.freemem() / 1048576),
    total_mb: Math.round(os.totalmem() / 1048576),
    cpu_busy: cpuBusyFraction(previousCpus, cpus),
    load1: os.loadavg()[0] || null,   // always 0 on Windows; recorded as null-ish, never invented
  };
  if (withProcesses) {
    try { sample.top = await topProcesses(); }
    catch (error) {
      // A missed scan is recorded as a MISS. Silently omitting it would make a
      // failed scan indistinguishable from a machine with nothing running on it.
      sample.top_error = error.message;
    }
  }
  return { sample, cpus };
}

function summarise(recordPath) {
  if (!fs.existsSync(recordPath)) {
    console.error(`[host-sampler] no record at ${path.relative(ROOT, recordPath)}`);
    process.exit(1);
  }
  const rows = fs.readFileSync(recordPath, 'utf8').trim().split('\n')
    .filter(Boolean).map(line => JSON.parse(line));
  if (!rows.length) { console.error('[host-sampler] record is empty'); process.exit(1); }
  const free = rows.map(r => r.free_mb).sort((a, b) => a - b);
  const busy = rows.map(r => r.cpu_busy).filter(v => v != null).sort((a, b) => a - b);
  const q = (arr, f) => arr.length ? arr[Math.min(arr.length - 1, Math.round(f * (arr.length - 1)))] : null;
  console.log(`[host-sampler] ${rows.length} samples — ${rows[0].t} .. ${rows[rows.length - 1].t}`);
  console.log(`  total RAM        ${(rows[0].total_mb / 1024).toFixed(1)} GB`);
  console.log(`  free RAM  min/p50/max   ${(q(free, 0) / 1024).toFixed(1)} / ${(q(free, 0.5) / 1024).toFixed(1)} / ${(q(free, 1) / 1024).toFixed(1)} GB`);
  if (busy.length) {
    console.log(`  cpu busy  p50/p90/max   ${(q(busy, 0.5) * 100).toFixed(0)}% / ${(q(busy, 0.9) * 100).toFixed(0)}% / ${(q(busy, 1) * 100).toFixed(0)}%`);
  } else {
    console.log('  cpu busy  — not measured');
  }
  const misses = rows.filter(r => r.top_error).length;
  if (misses) console.log(`  process scans MISSED: ${misses}`);
  const peak = new Map();
  for (const row of rows) for (const p of row.top || []) {
    if (!peak.has(p.name) || peak.get(p.name) < p.rss_mb) peak.set(p.name, p.rss_mb);
  }
  const competitors = [...peak.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (competitors.length) {
    console.log('  peak RSS by process seen in scans:');
    for (const [name, mb] of competitors) console.log(`    ${String(mb).padStart(6)} MB  ${name}`);
  }
  console.log('[host-sampler] passive instrument — exit 0 regardless of what the machine was doing.');
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const flag = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  if (argv.includes('--report')) { summarise(path.resolve(flag('--report') || DEFAULT_OUT)); }
  else {
    const out = path.resolve(flag('--out') || DEFAULT_OUT);
    const seconds = Number(flag('--seconds')) || Infinity;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, '');
    let previousCpus = os.cpus();
    let count = 0;
    console.log(`[host-sampler] sampling every ${SAMPLE_INTERVAL_MS} ms → ${path.relative(ROOT, out)}`);
    const timer = setInterval(async () => {
      const withProcesses = count % PROCESS_SCAN_EVERY === 0;
      const { sample, cpus } = await sampleHost({ previousCpus, withProcesses });
      previousCpus = cpus;
      fs.appendFileSync(out, JSON.stringify(sample) + '\n');
      if (++count >= seconds) { clearInterval(timer); console.log(`[host-sampler] ${count} samples written`); }
    }, SAMPLE_INTERVAL_MS);
    process.on('SIGINT', () => { clearInterval(timer); console.log(`\n[host-sampler] ${count} samples written`); process.exit(0); });
  }
}
