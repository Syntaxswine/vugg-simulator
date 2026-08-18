// tests-js/foreman.test.ts — the enforcement, not the observation.
//
// process-census.test.ts covers the classifier. This file covers what happens
// with the answer: whether a run is refused, whether a lease is believed, and
// whether a survivor is caught. Each gate is exercised in BOTH directions,
// because the first foreman shipped a detector that could only ever say "fine".
//
// No processes are spawned and nothing on the host is inspected: the process
// lister, the killer and the lease path are all injected. That keeps the file
// in the non-stepping tier and, more importantly, means the refusal path can be
// exercised without arranging a real collision.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  HEARTBEAT_STALE_MS, beginRun, endRun, leaseLiveness, postflight, readLease,
} from '../tools/foreman.mjs';

const REPO = 'C:/Users/baals/Local Storage/AI/vugg/vugg-simulator';
const RIVAL = 'C:/Users/baals/Local Storage/AI/GTP/Vugg-Simulator';
const SELF = 4242;

let leasePath: string;
const quiet = { log: () => {}, warn: () => {} };

const proc = (over: Record<string, any> = {}) => ({
  pid: 100, ppid: 1, ageHours: 0.1, rssMb: 50,
  startedIso: '2026-08-18T10:00:00.000Z', cmd: 'node something.mjs', ...over,
});
const me = () => proc({ pid: SELF, cmd: 'node tools/test-workflow.mjs --fresh' });
const rivalWorker = () => proc({
  pid: 777, cmd: `node ${RIVAL}/node_modules/vitest/vitest.mjs run`,
});

const begin = (opts: Record<string, any> = {}) => beginRun({
  runId: 'test-run', leasePath, repoRoot: REPO, selfPid: SELF,
  telemetry: false, ...quiet, ...opts,
});

beforeEach(() => {
  leasePath = path.join(os.tmpdir(), `vugg-foreman-test-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
});
afterEach(() => { try { fs.unlinkSync(leasePath); } catch { /* never held */ } });

describe('foreman — lease liveness', () => {
  const lease = (over: Record<string, any> = {}) => ({
    runId: 'r1', owner: 'someone', tier: 'full', rootPid: 500,
    rootStartedIso: '2026-08-18T09:00:00.000Z',
    startedIso: '2026-08-18T09:00:00.000Z',
    heartbeatIso: new Date().toISOString(), ...over,
  });

  it('is live while the holder runs and the heartbeat is fresh', () => {
    const held = leaseLiveness(lease(), [proc({ pid: 500, startedIso: '2026-08-18T09:00:00.000Z' })]);
    expect(held.live).toBe(true);
  });

  it('is not live once the holder is gone', () => {
    expect(leaseLiveness(lease(), []).live).toBe(false);
  });

  it('is not live when the PID was RECYCLED', () => {
    // The load-bearing check. Without it a stranger who happened to be handed
    // PID 500 would vouch for a run that ended hours ago, and every future run
    // on this machine would be blocked by a ghost.
    const recycled = leaseLiveness(lease(), [proc({ pid: 500, startedIso: '2026-08-18T14:00:00.000Z' })]);
    expect(recycled.live).toBe(false);
    expect(recycled.reason).toContain('RECYCLED');
  });

  it('is not live when the heartbeat has gone stale', () => {
    const stale = leaseLiveness(
      lease({ heartbeatIso: new Date(Date.now() - HEARTBEAT_STALE_MS - 5000).toISOString() }),
      [proc({ pid: 500, startedIso: '2026-08-18T09:00:00.000Z' })],
    );
    expect(stale.live).toBe(false);
    expect(stale.reason).toContain('stale');
  });

  it('treats an unreadable heartbeat as not-live rather than as fresh', () => {
    const broken = leaseLiveness(
      lease({ heartbeatIso: 'not a date' }),
      [proc({ pid: 500, startedIso: '2026-08-18T09:00:00.000Z' })],
    );
    expect(broken.live).toBe(false);
  });
});

describe('foreman — beginRun refuses, and refuses to refuse', () => {
  it('starts on a clear machine', async () => {
    const run = await begin({ list: async () => [me()] });
    expect(run.contaminated).toBe(false);
    expect(readLease({ leasePath })?.runId).toBe('test-run');
    endRun(run, { leasePath });
  });

  it('refuses when another checkout is running', async () => {
    await expect(begin({ list: async () => [me(), rivalWorker()] })).rejects.toThrow(/machine busy/);
  });

  it('refuses when a live lease is held by someone else', async () => {
    fs.writeFileSync(leasePath, JSON.stringify({
      runId: 'other', owner: 'agent-2', tier: 'full', rootPid: 900,
      rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date().toISOString(),
    }));
    const holder = proc({ pid: 900, startedIso: '2026-08-18T09:00:00.000Z' });
    await expect(begin({ list: async () => [me(), holder] })).rejects.toThrow(/machine busy/);
  });

  it('takes over a STALE lease instead of blocking forever', async () => {
    fs.writeFileSync(leasePath, JSON.stringify({
      runId: 'abandoned', owner: 'agent-2', tier: 'full', rootPid: 901,
      rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date(Date.now() - HEARTBEAT_STALE_MS - 60_000).toISOString(),
    }));
    const run = await begin({ list: async () => [me()] });
    expect(run.contaminated).toBe(false);
    expect(readLease({ leasePath })?.runId).toBe('test-run');
    endRun(run, { leasePath });
  });

  it('--allow-busy proceeds but stamps the run CONTAMINATED', async () => {
    // The override must never be silent. A busy run that reports clean numbers
    // is the whole failure mode this subsystem exists to prevent.
    const run = await begin({ list: async () => [me(), rivalWorker()], allowBusy: true });
    expect(run.contaminated).toBe(true);
    expect(readLease({ leasePath })?.contaminated).toBe(true);
    expect(readLease({ leasePath })?.blockers.length).toBeGreaterThan(0);
    endRun(run, { leasePath });
  });

  it('releases the lease on endRun so the next agent is not blocked by us', async () => {
    const run = await begin({ list: async () => [me()] });
    endRun(run, { leasePath });
    expect(readLease({ leasePath })).toBeNull();
  });
});

describe('foreman — postflight', () => {
  it('reports clean when the tree is gone', async () => {
    const swept = await postflight({
      rootPid: SELF, settleMs: 0, list: async () => [me()], ...quiet,
    });
    expect(swept.clean).toBe(true);
    expect(swept.killed).toEqual([]);
  });

  it('kills survivors of OUR tree and only ours', async () => {
    const killed: number[] = [];
    let swept = 0;
    const swept2 = await postflight({
      rootPid: SELF, settleMs: 0, ...quiet,
      killer: async (pid: number) => { killed.push(pid); },
      list: async () => {
        // First scan finds an orphan plus an unrelated process; second scan
        // (after the kill) finds only the unrelated one.
        swept++;
        const stranger = proc({ pid: 555, ppid: 1, cmd: `node ${RIVAL}/vitest.mjs` });
        return swept === 1
          ? [me(), proc({ pid: 601, ppid: SELF }), stranger]
          : [me(), stranger];
      },
    });
    expect(killed).toEqual([601]);
    // The negative half, and the one that matters: a sweep that reaped a
    // stranger's process would be a worse defect than the leak it chased.
    expect(killed).not.toContain(555);
    expect(swept2.clean).toBe(true);
  });

  it('fails when a survivor outlives termination', async () => {
    const stubborn = await postflight({
      rootPid: SELF, settleMs: 0, ...quiet,
      killer: async () => { /* pretend the kill did nothing */ },
      list: async () => [me(), proc({ pid: 602, ppid: SELF })],
    });
    expect(stubborn.clean).toBe(false);
    expect(stubborn.survivors.map(s => s.pid)).toEqual([602]);
  });
});
