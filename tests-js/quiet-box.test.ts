import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  FULL_RUN_HORIZON_MS, LOAD_BUCKET_MS, QUIET_BOX_ENV, QUIET_BOX_MAX_LOAD_PCT, REFUSE_BUSY_FLAG,
  QUIET_BOX_REFUSED_EXIT_CODE, QUIET_BOX_REPORT_NAME, QUIET_BOX_SCHEMA, QuietBoxRefusedError,
  SCHEDULE_QUERY_TIMEOUT_MS, WINDOWS_CANARY_TASK_QUERY, assessQuietBox, captureCanarySchedule,
  cpuTimes, formatQuietBoxReport, loadPercent, parseCanaryTasks, quietBoxGate, runQuietBoxCommand,
  runQuietBoxPreflight, sampleBoxLoad, startLoadRecorder,
} from '../tools/quiet-box-lib.mjs';
import { CANARY_WORK_KIND } from '../tools/process-census-lib.mjs';

// One os.cpus() reading: [busy ms, idle ms] per logical CPU, cumulative.
const reading = (...perCpu: Array<[number, number]>) => perCpu.map(([busy, idle]) => ({
  model: 'fixture', speed: 1, times: { user: busy, nice: 0, sys: 0, idle, irq: 0 },
}));
// Successive os.cpus() calls return the readings in turn, then repeat the last.
const readings = (...list: any[]) => {
  let index = 0;
  return () => list[Math.min(index++, list.length - 1)];
};
const times = (value: any) => cpuTimes(() => value);

describe('box load from os.cpus() readings', () => {
  it.each([
    [[[0, 0], [0, 0]], [[500, 500], [500, 500]], 50],
    [[[0, 0], [0, 0]], [[1000, 0], [0, 1000]], 50],
    [[[100, 100], [100, 100]], [[1000, 200], [1000, 200]], 90],
    [[[0, 0], [0, 0]], [[0, 1000], [0, 1000]], 0],
    [[[0, 0], [0, 0], [0, 0], [0, 0]], [[1000, 0], [0, 1000], [0, 1000], [0, 1000]], 25],
  ])('turns %j then %j into the busy share of every logical CPU (%d %%)', (before, after, expected) => {
    expect(loadPercent(times(reading(...before as any)), times(reading(...after as any)))).toBe(expected);
  });

  it('counts user, nice, sys and irq time as busy', () => {
    const before = [{ times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }];
    const after = [{ times: { user: 100, nice: 100, sys: 100, idle: 600, irq: 100 } }];
    expect(loadPercent(times(before), times(after))).toBe(40);
  });

  it.each([
    ['an empty list', () => []],
    ['a throwing reader', () => { throw new Error('denied'); }],
    ['a missing times block', () => [{ model: 'x' }]],
    ['a non-finite time', () => [{ times: { user: NaN, nice: 0, sys: 0, idle: 0, irq: 0 } }]],
    ['a negative time', () => [{ times: { user: -1, nice: 0, sys: 0, idle: 0, irq: 0 } }]],
  ])('reads %s as no reading', (_label, cpus) => {
    expect(cpuTimes(cpus as any)).toBeNull();
  });

  it('refuses a load it cannot support: no time passed, a CPU appeared, or idle ran backwards', () => {
    const one = times(reading([100, 100]));
    expect(loadPercent(one, one)).toBeNull();
    expect(loadPercent(times(reading([0, 0])), times(reading([100, 100], [100, 100])))).toBeNull();
    expect(loadPercent(times(reading([0, 500])), times(reading([400, 100])))).toBeNull();
    expect(loadPercent(null, one)).toBeNull();
  });

  it('samples one window and reports what it saw', async () => {
    const sleep = vi.fn(async () => {});
    const cpus = readings(reading([0, 0], [0, 0]), reading([300, 700], [100, 900]));
    expect(await sampleBoxLoad({ windowMs: 1234, cpus, sleep }))
      .toEqual({ status: 'available', load_pct: 20, window_ms: 1234, logical_cpus: 2 });
    expect(sleep).toHaveBeenCalledExactlyOnceWith(1234);
    expect(await sampleBoxLoad({ windowMs: 5, cpus: () => { throw new Error('x'); }, sleep }))
      .toEqual({ status: 'unavailable', reason: 'cpu-times-unavailable', window_ms: 5 });
  });

  it('reads the real box: a bounded share of the CPUs Node reports', async () => {
    const sample = await sampleBoxLoad({ windowMs: 200 });
    expect(sample.status).toBe('available');
    expect(sample.logical_cpus).toBe(os.cpus().length);
    expect(sample.load_pct).toBeGreaterThanOrEqual(0);
    expect(sample.load_pct).toBeLessThanOrEqual(100);
  });
});

describe('per-batch load recorder', () => {
  const clock = () => {
    const timers: any[] = [];
    return {
      every: vi.fn((callback: () => void, ms: number) => { const timer = { callback, ms, unref: vi.fn() }; timers.push(timer); return timer; }),
      cancel: vi.fn(),
      tick: () => timers.forEach(timer => timer.callback()),
      timers,
    };
  };

  it('keeps the whole-batch mean and each full bucket, and stops its timer', () => {
    const c = clock();
    const cpus = readings(reading([0, 0], [0, 0]), reading([100, 900], [100, 900]),
      reading([400, 1600], [600, 1400]), reading([450, 1650], [650, 1450]));
    const recorder = startLoadRecorder({ cpus, every: c.every, cancel: c.cancel });
    expect(c.every).toHaveBeenCalledWith(expect.any(Function), LOAD_BUCKET_MS);
    expect(c.timers[0].unref).toHaveBeenCalled();
    c.tick(); c.tick();
    // Buckets 10 % and 40 %; the 50 % tail after the last bucket counts only in the mean.
    expect(recorder.stop()).toEqual({ mean_pct: 26.2, max_pct: 40, bucket_ms: LOAD_BUCKET_MS, buckets_pct: [10, 40] });
    expect(c.cancel).toHaveBeenCalledWith(c.timers[0]);
  });

  it('gives a short batch its mean as the peak', () => {
    const c = clock();
    const recorder = startLoadRecorder({ cpus: readings(reading([0, 0]), reading([100, 900])), every: c.every, cancel: c.cancel });
    expect(recorder.stop()).toEqual({ mean_pct: 10, max_pct: 10, bucket_ms: LOAD_BUCKET_MS, buckets_pct: [] });
  });

  it('never throws into the batch: failed readings are null, a failed timer is skipped', () => {
    const c = clock();
    const broken = startLoadRecorder({ cpus: () => { throw new Error('denied'); }, every: c.every, cancel: c.cancel });
    c.tick();
    expect(broken.stop()).toEqual({ mean_pct: null, max_pct: null, bucket_ms: LOAD_BUCKET_MS, buckets_pct: [null] });
    const timerless = startLoadRecorder({ cpus: readings(reading([0, 0]), reading([500, 500])),
      every: () => { throw new Error('no timers'); }, cancel: () => { throw new Error('unused'); } });
    expect(timerless.stop()).toMatchObject({ mean_pct: 50, buckets_pct: [] });
    const unstoppable = startLoadRecorder({ cpus: readings(reading([0, 0]), reading([500, 500])),
      every: c.every, cancel: () => { throw new Error('cannot cancel'); } });
    expect(unstoppable.stop()).toMatchObject({ mean_pct: 50 });
  });
});

describe('canary schedule observation', () => {
  const row = (overrides: any = {}) => ({ name: 'vugg-canary-nightly', state: 'Ready',
    next_run_at: '2026-10-30T08:00:00.0000000Z', ...overrides });

  it('keeps each task name, state and next start', () => {
    expect(parseCanaryTasks(JSON.stringify([row(), row({ name: 'other', state: 'Running', next_run_at: null })])))
      .toEqual({ status: 'available', tasks: [row(), row({ name: 'other', state: 'Running', next_run_at: null })] });
    expect(parseCanaryTasks('[]')).toEqual({ status: 'available', tasks: [] });
  });

  it.each(['', '{', 'null', '{}', JSON.stringify(row()), '[null]',
    JSON.stringify([row({ name: '' })]), JSON.stringify([row({ name: 'bad\nname' })]),
    JSON.stringify([row({ state: 'Run ning' })]), JSON.stringify([row({ next_run_at: 'soon' })]),
  ])('rejects malformed query output instead of reporting no canary (%j)', text => {
    expect(parseCanaryTasks(text).status).toBe('unavailable');
  });

  it('asks PowerShell for tasks whose action names vugg-canary, bounded and hidden', async () => {
    const exec = vi.fn(async () => ({ stdout: JSON.stringify([row()]) }));
    expect(await captureCanarySchedule({ platform: 'win32', exec })).toEqual({ status: 'available', tasks: [row()] });
    expect(exec).toHaveBeenCalledExactlyOnceWith('powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', WINDOWS_CANARY_TASK_QUERY],
      expect.objectContaining({ windowsHide: true, timeout: SCHEDULE_QUERY_TIMEOUT_MS }));
    expect(WINDOWS_CANARY_TASK_QUERY).toContain("-match 'vugg-canary'");
    expect(WINDOWS_CANARY_TASK_QUERY).toContain('ToUniversalTime()');
  });

  it('reports a failed or unsupported query as unavailable', async () => {
    expect(await captureCanarySchedule({ platform: 'win32', exec: async () => { throw new Error('denied'); } }))
      .toEqual({ status: 'unavailable', reason: 'schedule-query-failed', tasks: [] });
    const exec = vi.fn();
    expect(await captureCanarySchedule({ platform: 'linux', exec }))
      .toEqual({ status: 'unavailable', reason: 'unsupported-platform', tasks: [] });
    expect(exec).not.toHaveBeenCalled();
  });
});

const NOW = Date.parse('2026-10-29T15:00:00.000Z');
const load = (pct: number) => ({ status: 'available', load_pct: pct, window_ms: 30000, logical_cpus: 16 });
const census = (blockers: any[] = []) => ({ status: blockers.length ? 'busy' : 'no-observed-work', blockers, issues: [] });
const canary = { pid: 70796, work_kind: CANARY_WORK_KIND, started_at: '2026-10-29T08:00:01.1234567Z', checkout_hint: 'unresolved' };
const task = (state: string, inMs: number | null) => ({ name: 'vugg-canary-nightly', state,
  next_run_at: inMs === null ? null : new Date(NOW + inMs).toISOString() });
const schedule = (...tasks: any[]) => ({ status: 'available', tasks });
const HOUR = 3600000;
const assess = (overrides: any = {}) => assessQuietBox({
  load: load(10), census: census(), schedule: schedule(task('Ready', 13 * HOUR)), now: NOW, ...overrides,
});

describe('quiet-box decision', () => {
  it('calls a quiet box quiet and keeps what it read', () => {
    expect(assess()).toMatchObject({ schema: QUIET_BOX_SCHEMA, verdict: 'quiet', policy: 'warn', refused: false,
      read: { load: true, processes: true, schedule: true },
      reasons: [], issues: [], observed: [], load: load(10), observed_at: new Date(NOW).toISOString(),
      max_load_pct: QUIET_BOX_MAX_LOAD_PCT, horizon_ms: FULL_RUN_HORIZON_MS });
  });

  it.each([[0, 'quiet'], [QUIET_BOX_MAX_LOAD_PCT - 0.1, 'quiet'], [QUIET_BOX_MAX_LOAD_PCT, 'busy'], [100, 'busy']])(
    'judges a %d %% box %s, and refuses it only under the refuse policy', (pct, verdict) => {
      const report = assess({ load: load(pct) });
      expect(report.verdict).toBe(verdict);
      expect(report.refused).toBe(false);
      expect(assess({ load: load(pct), refuse: true }).refused).toBe(verdict === 'busy');
      if (verdict === 'busy') expect(report.reasons).toEqual([`box load ${pct} % over 30 s (quiet is below ${QUIET_BOX_MAX_LOAD_PCT} %)`]);
    },
  );

  it('calls the box busy while a canary sweep runs, seen as a process or as its running task', () => {
    const seen = assess({ census: census([canary]) });
    expect(seen).toMatchObject({ verdict: 'busy', refused: false });
    expect(assess({ census: census([canary]), refuse: true })).toMatchObject({ verdict: 'busy', refused: true });
    expect(seen.reasons).toEqual([`vugg-canary sweep running (pid 70796, started ${canary.started_at})`]);
    expect(assess({ schedule: schedule(task('Running', 23 * HOUR)) }).reasons)
      .toEqual(['scheduled task vugg-canary-nightly is running']);
    expect(assess({ schedule: schedule(task('Queued', 23 * HOUR)) }).reasons)
      .toEqual(['scheduled task vugg-canary-nightly is queued']);
  });

  it.each([
    ['inside the horizon', 'Ready', FULL_RUN_HORIZON_MS - 60000, true],
    ['just outside it', 'Ready', FULL_RUN_HORIZON_MS + 60000, false],
    ['overdue', 'Ready', -60000, true],
    ['disabled inside it', 'Disabled', HOUR, false],
    ['with no next start', 'Ready', null, false],
  ])('treats a canary start %s accordingly', (_label, state, inMs, busy) => {
    const report = assess({ schedule: schedule(task(state, inMs as any)) });
    expect(report.verdict === 'busy').toBe(busy);
    expect(assess({ schedule: schedule(task(state, inMs as any)), refuse: true }).refused).toBe(busy);
    if (busy) expect(report.reasons[0]).toMatch(/^scheduled task vugg-canary-nightly starts (in \d+\.\d h|now \(overdue\)), inside a full run \(3\.5 h\)$/);
  });

  it('records other recognized work without refusing on it; load decides', () => {
    const report = assess({ census: census([{ pid: 5, work_kind: 'vite', checkout_hint: 'unresolved' }]) });
    expect(report).toMatchObject({ verdict: 'quiet', refused: false, observed: ['vite pid 5 (unresolved)'] });
  });

  it('never refuses on a signal it could not read, and never calls that quiet', () => {
    const report = assess({
      load: { status: 'unavailable', reason: 'cpu-times-unavailable', window_ms: 30000 },
      census: { status: 'unknown', blockers: [], issues: ['process-query-failed'] },
      schedule: { status: 'unavailable', reason: 'schedule-query-failed', tasks: [] },
      refuse: true,
    });
    expect(report).toMatchObject({ verdict: 'unknown', refused: false, reasons: [],
      read: { load: false, processes: false, schedule: false } });
    expect(report.issues).toEqual(['box load not read (cpu-times-unavailable)',
      'process census unknown (process-query-failed)', 'canary schedule not read (schedule-query-failed)']);
    expect(assessQuietBox({ now: NOW })).toMatchObject({ verdict: 'unknown', refused: false, issues: ['box load not read (no reading)',
      'process census missing', 'canary schedule not read (no reading)'] });
    // One signal missing is enough to withhold "quiet"; an unclassified process could be the sweep.
    expect(assess({ schedule: { status: 'unavailable', reason: 'x', tasks: [] } }).verdict).toBe('unknown');
    const partial = assess({ census: { status: 'busy', issues: ['pid 9: command-unavailable'],
      blockers: [{ pid: 5, work_kind: 'vitest', checkout_hint: 'unresolved' }] } });
    expect(partial).toMatchObject({ verdict: 'unknown', refused: false, observed: ['vitest pid 5 (unresolved)'],
      issues: ['process census busy (pid 9: command-unavailable)'] });
  });

  it('still calls the box busy on positive evidence when another signal is missing', () => {
    expect(assess({ load: { status: 'unavailable', reason: 'x', window_ms: 1 }, census: census([canary]), refuse: true }))
      .toMatchObject({ verdict: 'busy', refused: true });
  });

  it('lists every reason; the default warns and the refuse policy refuses', () => {
    const busy = { load: load(80), census: census([canary]), schedule: schedule(task('Running', HOUR)) };
    expect(assess(busy)).toMatchObject({ verdict: 'busy', policy: 'warn', refused: false });
    expect(assess(busy).reasons).toHaveLength(3);
    expect(assess({ ...busy, refuse: true })).toMatchObject({ verdict: 'busy', policy: 'refuse', refused: true });
    expect(assess({ ...busy, refuse: true }).reasons).toHaveLength(3);
  });

  it('says what it did and how to change it', () => {
    const warned = formatQuietBoxReport(assess({ load: load(80) }));
    expect(warned[0]).toBe(`[quiet-box] BUSY, starting anyway: a warning, kept in the record. This run shares the box; ${REFUSE_BUSY_FLAG} (or ${QUIET_BOX_ENV}=refuse) waits for a quiet one instead:`);
    expect(warned[1]).toContain('box load 80 %');
    expect(formatQuietBoxReport(assess({ load: load(80), refuse: true }))[0]).toBe(
      `[quiet-box] BUSY, not started (refusal is on). Wait for a quiet box, or drop ${REFUSE_BUSY_FLAG} and ${QUIET_BOX_ENV}=refuse to start with a warning:`);
    expect(formatQuietBoxReport(assess())).toEqual(['[quiet-box] QUIET: box load 10 % over 30 s; no canary sweep running or due within 3.5 h']);
    // QUIET claims only what was read.
    expect(formatQuietBoxReport(assess({ schedule: { status: 'unavailable', reason: 'denied', tasks: [] } }))).toEqual([
      '[quiet-box] PARTLY READ: box load 10 % over 30 s; nothing read says busy, so the run starts:',
      '[quiet-box]   not observed: canary schedule not read (denied)',
    ]);
  });
});

describe('preflight, gate and command', () => {
  const quiet = () => assess();
  const busy = () => assess({ load: load(80) });

  it('reads all three signals, saves the report as advisory evidence, and logs it', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vugg-quiet-box-'));
    try {
      const log = vi.fn();
      const report = await runQuietBoxPreflight({ root, now: () => NOW, log,
        sampleLoad: async () => load(12), observeProcesses: async () => census(),
        observeSchedule: async () => schedule(task('Ready', 13 * HOUR)) });
      expect(report).toMatchObject({ verdict: 'quiet', load: load(12) });
      expect(JSON.parse(fs.readFileSync(path.join(root, '.local-evidence', QUIET_BOX_REPORT_NAME), 'utf8'))).toEqual(report);
      expect(log.mock.calls.flat().join('\n')).toContain('[quiet-box] QUIET: box load 12 %');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('turns readers that throw into issues and still lets the run start', async () => {
    const report = await runQuietBoxPreflight({ now: () => NOW, log: () => {}, persist: () => { throw new Error('read-only'); },
      sampleLoad: async () => { throw new Error('a'); }, observeProcesses: async () => { throw new Error('b'); },
      observeSchedule: async () => { throw new Error('c'); } });
    expect(report).toMatchObject({ verdict: 'unknown', refused: false });
    expect(report.issues).toEqual(['box load not read (load-read-failed)', 'process census unavailable (process-query-failed)',
      'canary schedule not read (schedule-query-failed)', 'preflight report not saved']);
  });

  it('reads the box only for long runs, and once per cold CI', async () => {
    const preflight = vi.fn(async () => quiet());
    expect(await quietBoxGate({ longRun: false, env: {}, preflight })).toBeNull();
    expect(await quietBoxGate({ longRun: true, env: { [QUIET_BOX_ENV]: 'cold-ci' }, preflight, log: () => {} })).toBeNull();
    expect(preflight).not.toHaveBeenCalled();
    expect(await quietBoxGate({ longRun: true, env: {}, preflight })).toMatchObject({ verdict: 'quiet' });
    expect(preflight).toHaveBeenCalledWith({ refuse: false });
  });

  it('warns on a busy box by default, and refuses only when asked, by flag or by env', async () => {
    const preflight = vi.fn(async ({ refuse }: any) => assess({ load: load(80), refuse }));
    expect(await quietBoxGate({ longRun: true, env: {}, preflight }))
      .toMatchObject({ verdict: 'busy', policy: 'warn', refused: false });
    const byFlag = quietBoxGate({ longRun: true, refuse: true, env: {}, preflight });
    await expect(byFlag).rejects.toBeInstanceOf(QuietBoxRefusedError);
    await expect(byFlag).rejects.toMatchObject({ report: { verdict: 'busy', policy: 'refuse' } });
    await expect(quietBoxGate({ longRun: true, env: { [QUIET_BOX_ENV]: 'refuse' }, preflight }))
      .rejects.toBeInstanceOf(QuietBoxRefusedError);
    // A quiet box starts under either policy.
    expect(await quietBoxGate({ longRun: true, refuse: true, env: {}, preflight: async ({ refuse }: any) => assess({ refuse }) }))
      .toMatchObject({ verdict: 'quiet', refused: false });
  });

  it('starts the run when the preflight itself fails, and rejects an unknown override', async () => {
    const log = vi.fn();
    expect(await quietBoxGate({ longRun: true, env: {}, log, preflight: async () => { throw new Error('boom'); } })).toBeNull();
    expect(log).toHaveBeenCalledWith('[quiet-box] preflight failed (boom); starting without it');
    const preflight = vi.fn();
    // `busy-ok` was the override while refusal was the default; it is no longer a value.
    for (const value of ['yes', 'busy-ok']) {
      await expect(quietBoxGate({ longRun: false, env: { [QUIET_BOX_ENV]: value }, preflight })).rejects.toThrow(QUIET_BOX_ENV);
    }
    expect(preflight).not.toHaveBeenCalled();
  });

  it('answers operators with exit 0 quiet, 3 busy and 2 when it cannot run, whatever a run would do', async () => {
    const quiet0 = await runQuietBoxCommand({ argv: [], preflight: async () => quiet(), log: () => {}, error: () => {} });
    const busy3 = await runQuietBoxCommand({ argv: [], preflight: async () => busy(), log: () => {}, error: () => {} });
    expect([quiet0, busy3]).toEqual([0, QUIET_BOX_REFUSED_EXIT_CODE]);
    const log = vi.fn();
    expect(await runQuietBoxCommand({ argv: ['--json'], preflight: async () => busy(), log, error: () => {} })).toBe(3);
    expect(JSON.parse(log.mock.calls.at(-1)[0])).toMatchObject({ verdict: 'busy' });
    for (const argv of [['--busy'], ['--json', '--json'], [REFUSE_BUSY_FLAG]]) {
      expect(await runQuietBoxCommand({ argv, preflight: async () => quiet(), log: () => {}, error: () => {} })).toBe(2);
    }
    expect(await runQuietBoxCommand({ argv: [], preflight: async () => { throw new Error('x'); }, log: () => {}, error: () => {} })).toBe(2);
  });
});
