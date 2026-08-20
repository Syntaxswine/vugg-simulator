// tests-js/process-census.test.ts — the foreman's own guard.
//
// This file exists because the first version of process-census.mjs shipped a
// leak detector that could NEVER FIRE: PowerShell's ConvertTo-Json renders a
// CIM date as `/Date(…)/`, `new Date()` returned NaN, and `NaN >= STALE_HOURS`
// is false for every process ever examined. The tool ran, printed a tidy table,
// exited 0, and meant nothing. A gate is only a gate if something proves it can
// say both YES and NO — so each test below asserts the negative case too.
//
// Pure unit tests over the classifier: no processes are spawned, nothing on the
// host is inspected, and the fixtures are synthetic. That keeps this file in
// the non-stepping tier (it never touches VugSimulator), which is where the
// chip check will live.

import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_MARKERS, STALE_HOURS, WORK_MARKERS, classify, descendantsOf,
} from '../tools/process-census.mjs';

const REPO = 'C:/Users/baals/Local Storage/AI/vugg/vugg-simulator';
const RIVAL = 'C:/Users/baals/Local Storage/AI/GTP/Vugg-Simulator';

// ppid defaults to 1 (init). Tests that must NOT be classified as ours pass a
// selfPid of 9999: the first draft passed selfPid 1, which made every fixture a
// child of "self", and two assertions failed for a reason that had nothing to
// do with what they were testing.
const proc = (over: Record<string, any> = {}) => ({
  pid: 100, ppid: 1, ageHours: 0.1, rssMb: 50, cmd: 'node something.mjs', ...over,
});

const only = (rows: any[], pid: number) => rows.find(r => r.pid === pid)!;

describe('process census — ancestry', () => {
  it('collects descendants transitively, not just direct children', () => {
    const rows = [
      proc({ pid: 10, ppid: 1 }), proc({ pid: 11, ppid: 10 }),
      proc({ pid: 12, ppid: 11 }), proc({ pid: 99, ppid: 1 }),
    ];
    const kids = descendantsOf(rows, 10).map(p => p.pid).sort();
    expect(kids).toEqual([11, 12]);
    // The negative half: an unrelated tree must NOT be swept in. A killer built
    // on this would otherwise reap another agent's run.
    expect(kids).not.toContain(99);
  });

  it('does not hang on a parent cycle', () => {
    const rows = [proc({ pid: 20, ppid: 21 }), proc({ pid: 21, ppid: 20 })];
    expect(descendantsOf(rows, 20).map(p => p.pid)).toEqual([21]);
  });
});

describe('process census — staleness can fire AND can decline to fire', () => {
  it('flags an old checkout worker', () => {
    const rows = classify([proc({
      pid: 30, ageHours: STALE_HOURS + 1, cmd: `node ${RIVAL}/node_modules/vitest/vitest.mjs run`,
    })], { selfPid: 9999, repoRoot: REPO });
    expect(only(rows, 30).leakCandidate).toBe(true);
  });

  it('does NOT flag the same worker when it is young', () => {
    const rows = classify([proc({
      pid: 31, ageHours: 0.5, cmd: `node ${RIVAL}/node_modules/vitest/vitest.mjs run`,
    })], { selfPid: 9999, repoRoot: REPO });
    expect(only(rows, 31).leakCandidate).toBe(false);
  });

  it('treats an unreadable start time as UNKNOWN, never as fresh', () => {
    // The original defect, pinned. `ageHours: null` must not silently pass the
    // staleness comparison and must announce itself in the reason string.
    const rows = classify([proc({
      pid: 32, ageHours: null, cmd: `node ${RIVAL}/node_modules/vitest/vitest.mjs run`,
    })], { selfPid: 9999, repoRoot: REPO });
    expect(only(rows, 32).ageKnown).toBe(false);
    expect(only(rows, 32).why).toContain('AGE UNKNOWN');
  });

  it('never flags an anonymous node process by name alone', () => {
    // OpenClaw, MCP servers and language servers look exactly like a leaked
    // worker from outside. Age alone must not be enough to accuse one.
    const rows = classify([proc({
      pid: 33, ageHours: STALE_HOURS * 10, cmd: 'C:/Program Files/nodejs/node.exe',
    })], { selfPid: 9999, repoRoot: REPO });
    expect(only(rows, 33).leakCandidate).toBe(false);
  });
});

describe('process census — whose checkout is it', () => {
  it('separates a rival checkout from this one despite the shared basename', () => {
    // The bug this pins: matching on basename made `GTP/Vugg-Simulator` look
    // like `vugg/vugg-simulator`, so a rival's worker read as our own process
    // and a contended benchmark would have been allowed through as clean.
    const rows = classify([
      proc({ pid: 40, cmd: `node ${RIVAL}/node_modules/vitest/vitest.mjs run` }),
      proc({ pid: 41, cmd: `node ${REPO}/node_modules/vitest/vitest.mjs run` }),
    ], { selfPid: 9999, repoRoot: REPO });
    expect(only(rows, 40).kind).toBe('other-checkout');
    expect(only(rows, 41).kind).toBe('this-checkout');
  });

  it('classifies our own descendants as mine, so we never refuse ourselves', () => {
    const rows = classify([
      proc({ pid: 50, ppid: 1 }),
      proc({ pid: 51, ppid: 50, cmd: `node ${REPO}/node_modules/vitest/vitest.mjs run` }),
    ], { selfPid: 50, repoRoot: REPO });
    expect(only(rows, 51).kind).toBe('mine');
    expect(only(rows, 51).leakCandidate).toBe(false);
  });

  it('keeps the marker lists non-empty', () => {
    // An empty marker list would classify everything as `other` and the
    // preflight would report CLEAR on any machine, forever.
    expect(WORK_MARKERS.length).toBeGreaterThan(0);
    expect(CHECKOUT_MARKERS.length).toBeGreaterThan(0);
    expect(WORK_MARKERS.some(re => re.test('node vitest.mjs run'))).toBe(true);
    expect(CHECKOUT_MARKERS.some(re => re.test('C:/x/vugg-simulator/y'))).toBe(true);
  });
});
