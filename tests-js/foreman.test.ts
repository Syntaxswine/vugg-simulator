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
  HEARTBEAT_STALE_MS, TOKEN_ENV, beginRun, endRun, leaseLiveness, postflight,
  readLease, releaseLease, touchLease,
} from '../tools/foreman.mjs';

const REPO = 'C:/Users/baals/Local Storage/AI/vugg/vugg-simulator';
const RIVAL = 'C:/Users/baals/Local Storage/AI/GTP/Vugg-Simulator';
const SELF = 4242;

let leaseDir: string;
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
  runId: 'test-run', leaseDir, repoRoot: REPO, selfPid: SELF,
  telemetry: false, inheritToken: null, ...quiet, ...opts,
});

beforeEach(() => {
  leaseDir = path.join(os.tmpdir(), `vugg-foreman-test-${process.pid}-${Math.random().toString(36).slice(2)}.d`);
});
afterEach(() => { try { fs.rmSync(leaseDir, { recursive: true, force: true }); } catch { /* never held */ } });

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
    expect(readLease({ leaseDir })?.runId).toBe('test-run');
    endRun(run, { leaseDir });
  });

  it('refuses when another checkout is running', async () => {
    await expect(begin({ list: async () => [me(), rivalWorker()] })).rejects.toThrow(/machine busy/);
  });

  it('refuses when a live lease is held by someone else', async () => {
    fs.mkdirSync(leaseDir, { recursive: true });
    fs.writeFileSync(path.join(leaseDir, 'lease.json'), JSON.stringify({
      runId: 'other', owner: 'agent-2', tier: 'full', rootPid: 900,
      rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date().toISOString(),
    }));
    const holder = proc({ pid: 900, startedIso: '2026-08-18T09:00:00.000Z' });
    await expect(begin({ list: async () => [me(), holder] })).rejects.toThrow(/machine busy/);
  });

  it('takes over a STALE lease instead of blocking forever', async () => {
    fs.mkdirSync(leaseDir, { recursive: true });
    fs.writeFileSync(path.join(leaseDir, 'lease.json'), JSON.stringify({
      runId: 'abandoned', owner: 'agent-2', tier: 'full', rootPid: 901,
      rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date(Date.now() - HEARTBEAT_STALE_MS - 60_000).toISOString(),
    }));
    const run = await begin({ list: async () => [me()] });
    expect(run.contaminated).toBe(false);
    expect(readLease({ leaseDir })?.runId).toBe('test-run');
    endRun(run, { leaseDir });
  });

  it('--allow-busy proceeds but stamps the run CONTAMINATED', async () => {
    // The override must never be silent. A busy run that reports clean numbers
    // is the whole failure mode this subsystem exists to prevent.
    const run = await begin({ list: async () => [me(), rivalWorker()], allowBusy: true });
    expect(run.contaminated).toBe(true);
    expect(readLease({ leaseDir })?.contaminated).toBe(true);
    expect(readLease({ leaseDir })?.blockers.length).toBeGreaterThan(0);
    endRun(run, { leaseDir });
  });

  it('releases the lease on endRun so the next agent is not blocked by us', async () => {
    const run = await begin({ list: async () => [me()] });
    endRun(run, { leaseDir });
    expect(readLease({ leaseDir })).toBeNull();
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

describe('foreman — ownership is atomic and release is authenticated', () => {
  it('two racing acquisitions: exactly one wins', async () => {
    // The defect this pins: acquisition was read → decide-it-is-free → write.
    // Both racers read "free", both wrote, and the second silently displaced
    // the first — the precise race the lease exists to prevent, rebuilt inside
    // the lease. `mkdir` is the atomic step; only one caller can return from it.
    const OTHER = 4243;
    const both = [me(), proc({ pid: OTHER, cmd: 'node tools/test-workflow.mjs --fresh' })];
    const results = await Promise.allSettled([
      begin({ runId: 'racer-a', selfPid: SELF, list: async () => both }),
      begin({ runId: 'racer-b', selfPid: OTHER, list: async () => both }),
    ]);
    const won = results.filter(r => r.status === 'fulfilled');
    const lost = results.filter(r => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    // And the survivor is the one the lease names — not merely "someone".
    const winner = (won[0] as PromiseFulfilledResult<any>).value;
    expect(readLease({ leaseDir })?.runId).toBe(winner.runId);
    expect(readLease({ leaseDir })?.token).toBe(winner.token);
    endRun(winner, { leaseDir });
  });

  it('an old handle cannot delete a successor lease', async () => {
    // A displaced or long-finished owner deleting a newer claim would hand the
    // machine to a third party — the original race with extra steps.
    const first = await begin({ runId: 'first', list: async () => [me()] });
    const stolenToken = first.token;
    endRun(first, { leaseDir });

    const second = await begin({ runId: 'second', list: async () => [me()] });
    expect(releaseLease({ leaseDir, token: stolenToken, warn: () => {} })).toBe(false);
    expect(readLease({ leaseDir })?.runId).toBe('second');
    expect(releaseLease({ leaseDir, token: second.token, warn: () => {} })).toBe(true);
    expect(readLease({ leaseDir })).toBeNull();
  });

  it('a displaced holder cannot refresh the heartbeat it no longer owns', async () => {
    const first = await begin({ runId: 'first', list: async () => [me()] });
    const staleToken = first.token;
    endRun(first, { leaseDir });
    const second = await begin({ runId: 'second', list: async () => [me()] });
    expect(touchLease({ leaseDir, token: staleToken })).toBe(false);
    expect(touchLease({ leaseDir, token: second.token })).toBe(true);
    expect(readLease({ leaseDir })?.runId).toBe('second');
    endRun(second, { leaseDir });
  });

  it('a refused run leaves no lease behind', async () => {
    // A refusal that leaked a half-made claim would block the very run that is
    // about to be told to try again.
    await expect(begin({ list: async () => [me(), rivalWorker()] })).rejects.toThrow();
    expect(readLease({ leaseDir })).toBeNull();
  });

  it('a nested run ADOPTS the parent lease and never releases it', async () => {
    // cold-ci holds the claim for the whole wrapper. If the nested workflow
    // took a second lease it would deadlock against its own parent; if it
    // released on exit it would drop the parent's claim mid-run.
    const parent = await begin({ runId: 'cold-ci', tier: 'cold-ci', list: async () => [me()] });
    const child = await begin({
      runId: 'nested', list: async () => [me()], inheritToken: parent.token,
    });
    expect(child.adopted).toBe(true);
    expect(child.token).toBeNull();
    endRun(child, { leaseDir });
    // The parent's claim survives the child's exit — the whole point.
    expect(readLease({ leaseDir })?.runId).toBe('cold-ci');
    endRun(parent, { leaseDir });
    expect(readLease({ leaseDir })).toBeNull();
  });

  it('a nested run inherits the parent CONTAMINATED stamp', async () => {
    const parent = await begin({
      runId: 'cold-ci', tier: 'cold-ci', allowBusy: true,
      list: async () => [me(), rivalWorker()],
    });
    const child = await begin({
      runId: 'nested', list: async () => [me()], inheritToken: parent.token,
    });
    expect(child.contaminated).toBe(true);
    endRun(parent, { leaseDir });
  });

  it('a bogus inherited token does not become a licence to grab the machine', async () => {
    const holder = proc({ pid: 900, startedIso: '2026-08-18T09:00:00.000Z' });
    fs.mkdirSync(leaseDir, { recursive: true });
    fs.writeFileSync(path.join(leaseDir, 'lease.json'), JSON.stringify({
      runId: 'someone-else', owner: 'agent-2', tier: 'full', rootPid: 900,
      token: 'the-real-token', rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date().toISOString(),
    }));
    await expect(begin({
      list: async () => [me(), holder], inheritToken: 'a-token-from-nowhere',
    })).rejects.toThrow(/machine busy/);
    expect(readLease({ leaseDir })?.runId).toBe('someone-else');
  });

  it('will not steal a claim that is mid-acquisition', async () => {
    // The sharpest test of the atomic primitive, and the one a single-file
    // lease cannot pass. The claim DIRECTORY exists but carries no readable
    // lease.json: either a racer between mkdir and write, or a crash in that
    // gap. Read-decide-write sees "no lease" and treats it as free — which is
    // the original defect at millisecond scale. The directory is the claim, so
    // its mere existence must block during the grace window.
    fs.mkdirSync(leaseDir, { recursive: true });
    await expect(begin({ list: async () => [me()] })).rejects.toThrow(/machine busy/);
  });

  it('reclaims a claim directory abandoned before its lease was written', async () => {
    // The negative twin: past the grace window an empty claim is a crash, not
    // a racer, and must not block the machine forever.
    fs.mkdirSync(leaseDir, { recursive: true });
    const old = Date.now() / 1000 - 3600;
    fs.utimesSync(leaseDir, old, old);
    const run = await begin({ list: async () => [me()] });
    expect(run.contaminated).toBe(false);
    expect(readLease({ leaseDir })?.runId).toBe('test-run');
    endRun(run, { leaseDir });
  });

  it('exports the env names the cold-CI handoff depends on', () => {
    // A renamed constant on one side of a process boundary fails silently:
    // the child simply never sees a token and takes its own lease.
    expect(TOKEN_ENV).toBe('VUGG_FOREMAN_LEASE_TOKEN');
  });
});

describe('foreman — refresh and release are atomic too (2026-08-19)', () => {
  // Acquisition got the CAS treatment first; refresh and release had kept the
  // read → decide → write shape. These pin the repair. Reverting touchLease to
  // a whole-record rewrite, or releaseLease to verify-then-rmSync, turns each
  // of these RED.

  it('touchLease refreshes through a token-keyed file, never the claim record', async () => {
    const run = await begin({ list: async () => [me()] });
    const recordBefore = fs.readFileSync(path.join(leaseDir, 'lease.json'), 'utf8');
    expect(touchLease({ leaseDir, token: run.token })).toBe(true);
    // The claim record is immutable for the claim's lifetime — identity and
    // liveness are separate files, so a racing refresh can no longer clobber
    // an identity.
    expect(fs.readFileSync(path.join(leaseDir, 'lease.json'), 'utf8')).toBe(recordBefore);
    const hb = JSON.parse(fs.readFileSync(path.join(leaseDir, `hb-${run.token}.json`), 'utf8'));
    expect(Date.now() - Date.parse(hb.heartbeatIso)).toBeLessThan(10_000);
    // And liveness reads the token-keyed file when given the directory.
    expect(leaseLiveness(readLease({ leaseDir }), [me()], Date.now(), { leaseDir }).live).toBe(true);
    endRun(run, { leaseDir });
  });

  it('a stale holder’s refresh cannot deposit anything into a successor’s claim', async () => {
    const first = await begin({ runId: 'first', list: async () => [me()] });
    const staleToken = first.token as string;
    first.stop();
    // Simulate the takeover happening WITHOUT the first holder noticing: the
    // claim it knew is gone and a successor's stands in the same slot.
    fs.rmSync(leaseDir, { recursive: true, force: true });
    fs.mkdirSync(leaseDir, { recursive: true });
    const successor = JSON.stringify({
      runId: 'successor', owner: 'agent-2', tier: 'full', rootPid: 900,
      token: 'successor-token', rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date().toISOString(),
    });
    fs.writeFileSync(path.join(leaseDir, 'lease.json'), successor);
    expect(touchLease({ leaseDir, token: staleToken })).toBe(false);
    expect(fs.readFileSync(path.join(leaseDir, 'lease.json'), 'utf8')).toBe(successor);
    expect(fs.existsSync(path.join(leaseDir, `hb-${staleToken}.json`))).toBe(false);
  });

  it('release parks, verifies, and hands back a claim it raced', async () => {
    const run = await begin({ list: async () => [me()] });
    const successor = JSON.stringify({
      runId: 'successor', owner: 'agent-2', tier: 'full', rootPid: 900,
      token: 'successor-token', rootStartedIso: '2026-08-18T09:00:00.000Z',
      heartbeatIso: new Date().toISOString(),
    });
    // The seam runs at the only instant the race can be simulated
    // deterministically: with the claim parked. Swapping the parked record for
    // a successor's reproduces "a takeover landed between the token check and
    // the rename".
    const released = releaseLease({
      leaseDir, token: run.token, warn: () => {},
      onParked: (parked: string) => fs.writeFileSync(path.join(parked, 'lease.json'), successor),
    });
    expect(released).toBe(false);
    // The successor's claim is back in the slot, byte-identical — under the
    // old verify-then-rmSync release it was simply destroyed.
    expect(fs.readFileSync(path.join(leaseDir, 'lease.json'), 'utf8')).toBe(successor);
    // And nothing was left parked beside it.
    const parkedLeftovers = fs.readdirSync(path.dirname(leaseDir))
      .filter(name => name.startsWith(`${path.basename(leaseDir)}.release-`));
    expect(parkedLeftovers).toEqual([]);
    run.stop();
  });

  it('the heartbeat advances while the run is awaiting its work', async () => {
    // The cold-CI defect: spawnSync blocked the event loop, so the shared
    // telemetry/heartbeat timer never fired and the wrapper's machine-wide
    // claim read STALE from 90 s into a 3.5-hour run. The wrapper now awaits
    // an async child; this pins the foreman half of that repair — the timer
    // actually touches the lease while the holder is parked on an await.
    const repoRoot = `${leaseDir}.repo`;
    fs.mkdirSync(repoRoot, { recursive: true });
    const run = await begin({
      list: async () => [me()], telemetry: true, repoRoot,
      heartbeatIntervalMs: 30, telemetryIntervalMs: 10,
    });
    try {
      expect(fs.existsSync(path.join(leaseDir, `hb-${run.token}.json`))).toBe(false);
      await new Promise(resolve => setTimeout(resolve, 250));
      const hb = JSON.parse(fs.readFileSync(path.join(leaseDir, `hb-${run.token}.json`), 'utf8'));
      expect(Date.now() - Date.parse(hb.heartbeatIso)).toBeLessThan(1_000);
      expect(run.telemetrySamples()).toBeGreaterThan(0);
    } finally {
      endRun(run, { leaseDir });
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
