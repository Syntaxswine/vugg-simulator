/** One launch-time look at the box before a long test run; never a reservation. */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { CANARY_WORK_KIND, assessProcessSnapshot, captureProcessSnapshot } from './process-census-lib.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const execFileAsync = promisify(execFile);
export const QUIET_BOX_SCHEMA = 'vugg-quiet-box-preflight-v1';
export const QUIET_BOX_TRUST = 'one-launch-observation-not-a-reservation';
export const QUIET_BOX_REFUSED_EXIT_CODE = 3;
export const BUSY_OK_FLAG = '--busy-ok';
// cold-ci sets `cold-ci` for its child, which then skips a second look; an
// operator sets `busy-ok` where no flag reaches the runner (`npm run ci`).
export const QUIET_BOX_ENV = 'VUGG_QUIET_BOX_PREFLIGHT';
export const QUIET_BOX_ENV_VALUES = Object.freeze(['cold-ci', 'busy-ok']);
export const QUIET_BOX_WINDOW_MS = 30000;
// Whole-box CPU over the window, all logical CPUs (it matched Windows' "%
// Processor Time" within 0.3 points). On the commissioning box, runs recorded
// as quiet sat at 0-24 % (two GREEN cold CIs at medians of 14 and 24 %) and
// busy nights at 39-100 %; the most load-sensitive budget, the 70 ms
// marching-cubes warm frame, failed only from about 65 %. So 25 % separates the
// two records and leaves room for load that arrives after the launch.
export const QUIET_BOX_MAX_LOAD_PCT = 25;
// Longest recent full run (3.1 h cold CI on 10-27; PR #41's raw-read runs took
// 2.0 and 2.6 h) plus margin: a canary start inside this would overlap it.
export const FULL_RUN_HORIZON_MS = 3.5 * 60 * 60 * 1000;
export const LOAD_BUCKET_MS = 30000;
export const SCHEDULE_QUERY_TIMEOUT_MS = 15000;
// An advisory diagnostic like the census report: the last look, not a clearance.
export const QUIET_BOX_REPORT_NAME = 'quiet-box-preflight-v1.json';

// Tasks are matched by their action text, so a renamed canary task still counts.
export const WINDOWS_CANARY_TASK_QUERY = `
$ErrorActionPreference = 'Stop'
$rows = @(Get-ScheduledTask | Where-Object {
  @($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -match 'vugg-canary'
} | ForEach-Object {
  $info = $_ | Get-ScheduledTaskInfo
  [pscustomobject]@{
    name = $_.TaskName
    state = [string]$_.State
    next_run_at = if ($info.NextRunTime) { $info.NextRunTime.ToUniversalTime().ToString('o') } else { $null }
  }
})
ConvertTo-Json -InputObject $rows -Depth 3 -Compress
`;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function cpuTimes(cpus = os.cpus) {
  try {
    const list = cpus();
    if (!Array.isArray(list) || !list.length) return null;
    let idle = 0, total = 0;
    for (const cpu of list) {
      const parts = ['user', 'nice', 'sys', 'idle', 'irq'].map(key => cpu?.times?.[key]);
      if (!parts.every(value => Number.isFinite(value) && value >= 0)) return null;
      idle += cpu.times.idle;
      total += parts.reduce((sum, value) => sum + value, 0);
    }
    return { idle, total, count: list.length };
  } catch { return null; }
}

// Busy share of all logical CPUs between two readings, or null when the
// readings cannot say (missing, a CPU appeared or vanished, or no time passed).
export function loadPercent(before, after) {
  if (!before || !after || before.count !== after.count) return null;
  const total = after.total - before.total;
  const idle = after.idle - before.idle;
  if (!(total > 0) || idle < 0 || idle > total) return null;
  return Number((100 * (1 - idle / total)).toFixed(1));
}

export async function sampleBoxLoad({ windowMs = QUIET_BOX_WINDOW_MS, cpus = os.cpus, sleep = delay } = {}) {
  const before = cpuTimes(cpus);
  await sleep(windowMs);
  const after = cpuTimes(cpus);
  const loadPct = loadPercent(before, after);
  return loadPct === null
    ? { status: 'unavailable', reason: 'cpu-times-unavailable', window_ms: windowMs }
    : { status: 'available', load_pct: loadPct, window_ms: windowMs, logical_cpus: after.count };
}

// Measurement only: each batch gets its mean load and full 30 s buckets. A
// failed reading becomes null; nothing here can throw into the batch.
export function startLoadRecorder({
  bucketMs = LOAD_BUCKET_MS, cpus = os.cpus, every = setInterval, cancel = clearInterval,
} = {}) {
  const start = cpuTimes(cpus);
  let mark = start;
  const buckets = [];
  let timer = null;
  try {
    timer = every(() => {
      const now = cpuTimes(cpus);
      buckets.push(loadPercent(mark, now));
      mark = now;
    }, bucketMs);
    timer?.unref?.();
  } catch { timer = null; }
  return {
    stop() {
      try { if (timer) cancel(timer); } catch { /* the reading below still stands */ }
      const meanPct = loadPercent(start, cpuTimes(cpus));
      const known = buckets.filter(value => value !== null);
      return { mean_pct: meanPct, max_pct: known.length ? Math.max(...known) : meanPct,
        bucket_ms: bucketMs, buckets_pct: buckets };
    },
  };
}

const unavailable = reason => ({ status: 'unavailable', reason, tasks: [] });

export function parseCanaryTasks(text) {
  let raw;
  try { raw = JSON.parse(text); }
  catch { return unavailable('malformed-query-output'); }
  if (!Array.isArray(raw)) return unavailable('malformed-query-output');
  const tasks = [];
  for (const row of raw) {
    if (!row || typeof row.name !== 'string' || !row.name || /[\x00-\x1f]/.test(row.name)
        || typeof row.state !== 'string' || !/^[A-Za-z]+$/.test(row.state)
        || (row.next_run_at !== null && !Number.isFinite(Date.parse(row.next_run_at)))) {
      return unavailable('invalid-task-row');
    }
    tasks.push({ name: row.name, state: row.state, next_run_at: row.next_run_at });
  }
  return { status: 'available', tasks };
}

export async function captureCanarySchedule({ platform = process.platform, exec = execFileAsync } = {}) {
  if (platform !== 'win32') return unavailable('unsupported-platform');
  try {
    const { stdout } = await exec('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_CANARY_TASK_QUERY], {
      encoding: 'utf8', windowsHide: true, timeout: SCHEDULE_QUERY_TIMEOUT_MS, maxBuffer: 1024 * 1024,
    });
    return parseCanaryTasks(stdout);
  } catch { return unavailable('schedule-query-failed'); }
}

const hours = milliseconds => `${(milliseconds / 3600000).toFixed(1)} h`;

// Refusal needs positive evidence of a busy box. A signal that cannot be
// observed is listed as an issue and never blocks the run on its own, but the
// verdict says so: `quiet` only when all three signals were read.
export function assessQuietBox({
  load, census, schedule, now = Date.now(), busyOk = false,
  maxLoadPct = QUIET_BOX_MAX_LOAD_PCT, horizonMs = FULL_RUN_HORIZON_MS,
} = {}) {
  const reasons = [];
  const issues = [];
  const observed = [];
  // A census with unclassified processes was only partly read: one of them
  // could be the sweep.
  const censusGaps = census?.issues?.length ? census.issues : census?.reason ? [census.reason] : [];
  const read = { load: load?.status === 'available',
    processes: ['busy', 'no-observed-work'].includes(census?.status) && !censusGaps.length,
    schedule: schedule?.status === 'available' };
  if (read.load) {
    if (load.load_pct >= maxLoadPct) {
      reasons.push(`box load ${load.load_pct} % over ${load.window_ms / 1000} s (quiet is below ${maxLoadPct} %)`);
    }
  } else issues.push(`box load not read (${load?.reason ?? 'no reading'})`);
  for (const row of census?.blockers ?? []) {
    if (row.work_kind === CANARY_WORK_KIND) {
      reasons.push(`vugg-canary sweep running (pid ${row.pid}, started ${row.started_at ?? 'at an unknown time'})`);
    } else observed.push(`${row.work_kind} pid ${row.pid} (${row.checkout_hint})`);
  }
  if (!read.processes) {
    issues.push(`process census ${census?.status ?? 'missing'}${censusGaps.length ? ` (${censusGaps.join(', ')})` : ''}`);
  }
  if (read.schedule) {
    for (const task of schedule.tasks) {
      const due = task.next_run_at === null ? null : Date.parse(task.next_run_at) - now;
      if (task.state === 'Running' || task.state === 'Queued') reasons.push(`scheduled task ${task.name} is ${task.state.toLowerCase()}`);
      else if (task.state !== 'Disabled' && due !== null && due < horizonMs) {
        reasons.push(`scheduled task ${task.name} starts ${due <= 0 ? 'now (overdue)' : `in ${hours(due)}`}, inside a full run (${hours(horizonMs)})`);
      }
    }
  } else issues.push(`canary schedule not read (${schedule?.reason ?? 'no reading'})`);
  const busy = reasons.length > 0;
  const allRead = read.load && read.processes && read.schedule;
  return {
    schema: QUIET_BOX_SCHEMA, trust: QUIET_BOX_TRUST, observed_at: new Date(now).toISOString(),
    verdict: busy ? (busyOk ? 'busy-override' : 'busy') : allRead ? 'quiet' : 'unknown', refused: busy && !busyOk,
    max_load_pct: maxLoadPct, horizon_ms: horizonMs, read, reasons, issues, observed,
    load: load ?? null,
    canary_tasks: read.schedule ? schedule.tasks : [],
  };
}

export function formatQuietBoxReport(report, { retry = 'rerun with --busy-ok' } = {}) {
  const lines = [];
  const load = report.load?.status === 'available' ? `box load ${report.load.load_pct} % over ${report.load.window_ms / 1000} s` : 'box load not read';
  if (report.verdict === 'quiet') {
    lines.push(`[quiet-box] QUIET: ${load}; no canary sweep running or due within ${hours(report.horizon_ms)}`);
  } else if (report.verdict === 'unknown') {
    lines.push(`[quiet-box] PARTLY READ: ${load}; nothing read says busy, so the run starts:`);
  } else if (report.verdict === 'busy') {
    lines.push(`[quiet-box] BUSY. Wait for a quiet box, or ${retry} (or set ${QUIET_BOX_ENV}=busy-ok) to run anyway:`);
  } else {
    lines.push('[quiet-box] BUSY, running anyway on the override; this run shares the box:');
  }
  for (const reason of report.reasons) lines.push(`[quiet-box]   - ${reason}`);
  for (const work of report.observed) lines.push(`[quiet-box]   other recognized work (not refused): ${work}`);
  for (const issue of report.issues) lines.push(`[quiet-box]   not observed: ${issue}`);
  return lines;
}

export async function runQuietBoxPreflight({
  busyOk = false, retry, root = ROOT, selfPid = process.pid, now = Date.now,
  sampleLoad = () => sampleBoxLoad(),
  observeProcesses = async () => assessProcessSnapshot(await captureProcessSnapshot({ root }), { selfPid }),
  observeSchedule = () => captureCanarySchedule(),
  persist = report => {
    const file = path.join(root, '.local-evidence', QUIET_BOX_REPORT_NAME);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  },
  log = console.log,
} = {}) {
  log(`[quiet-box] reading the box for ${QUIET_BOX_WINDOW_MS / 1000} s before a long run…`);
  const settle = async (read, failure) => {
    try { return await read(); }
    catch { return { status: 'unavailable', reason: failure }; }
  };
  const [load, census, schedule] = await Promise.all([
    settle(sampleLoad, 'load-read-failed'),
    settle(observeProcesses, 'process-query-failed'),
    settle(observeSchedule, 'schedule-query-failed'),
  ]);
  const report = assessQuietBox({ load, census, schedule, now: now(), busyOk });
  try { persist(report); }
  catch { report.issues.push('preflight report not saved'); }
  for (const line of formatQuietBoxReport(report, { retry })) log(line);
  return report;
}

// A read-only look for operators: exit 0 quiet, 3 busy, 2 when it cannot run.
export async function runQuietBoxCommand({
  argv = process.argv.slice(2), preflight = options => runQuietBoxPreflight(options),
  log = console.log, error = console.error,
} = {}) {
  const usage = 'node tools/quiet-box.mjs [--json]';
  if (argv.length === 1 && argv[0] === '--help') { log(usage); return 0; }
  if (argv.length > 1 || argv.some(arg => arg !== '--json')) { error(usage); return 2; }
  const json = argv[0] === '--json';
  let report;
  try { report = await preflight({ retry: `start the run with ${BUSY_OK_FLAG}`, log: json ? () => {} : log }); }
  catch (failure) { error(`[quiet-box] cannot read the box: ${failure.message}`); return 2; }
  if (json) log(JSON.stringify(report, null, 2));
  return report.refused ? QUIET_BOX_REFUSED_EXIT_CODE : 0;
}

export class QuietBoxRefusedError extends Error {
  constructor(report) {
    super(`the box is busy: ${report.reasons.join('; ')}`);
    this.name = 'QuietBoxRefusedError';
    this.report = report;
  }
}

// One gate for both entry points. A preflight that crashes is reported and the
// run starts: only positive evidence of a busy box may stop a launch.
export async function quietBoxGate({
  longRun, busyOk = false, env = process.env, retry,
  preflight = options => runQuietBoxPreflight(options), log = console.log,
} = {}) {
  const mode = env[QUIET_BOX_ENV];
  if (mode !== undefined && !QUIET_BOX_ENV_VALUES.includes(mode)) {
    throw new Error(`${QUIET_BOX_ENV} must be one of ${QUIET_BOX_ENV_VALUES.join(', ')} (got ${JSON.stringify(mode)})`);
  }
  if (!longRun) return null;
  if (mode === 'cold-ci') {
    log('[quiet-box] cold-ci already read the box for this run');
    return null;
  }
  let report;
  try { report = await preflight({ busyOk: busyOk || mode === 'busy-ok', retry }); }
  catch (error) {
    log(`[quiet-box] preflight failed (${error.message}); starting without it`);
    return null;
  }
  if (report?.refused) throw new QuietBoxRefusedError(report);
  return report ?? null;
}
