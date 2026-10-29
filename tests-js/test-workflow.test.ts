import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  CHILD_HEAP_LIMIT_MB,
  DEFAULT_TEST_BATCH_SIZE,
  MAX_BATCH_RSS_BYTES,
  MAX_CONSECUTIVE_RSS_FAILURES,
  MONITOR_UNAVAILABLE_EXIT_CODE,
  TEST_INVOCATION_ENV,
  TEST_CHECKPOINT_SCHEMA,
  TEST_CHECKPOINT_TRUST,
  assertTestWorkflowIdentityUnchanged,
  automaticTestRunPlan,
  collectTestIdentityFiles,
  collectTestFiles,
  makeTestCheckpoint,
  makeTestCompletionReport,
  parseArgs,
  partitionTests,
  readTestCheckpoint,
  runTestWorkflow,
  runVitestBatch,
  selectResumeFiles,
  testWorkflowIdentity,
  vitestBatchArgs,
  writeJsonAtomic,
} from '../tools/test-workflow.mjs';

describe('memory-bounded full-test workflow', () => {
  it('discovers every test deterministically and partitions without loss', () => {
    const files = collectTestFiles();
    expect(files.length).toBeGreaterThan(200);
    expect(files).toEqual([...files].sort());
    expect(new Set(files).size).toBe(files.length);
    expect(files.every((file) => file.startsWith('tests-js/') && file.endsWith('.test.ts'))).toBe(true);
    expect(partitionTests(files, 5).flat()).toEqual(files);
    expect(partitionTests(files, 5).every((batch) => batch.length <= 5)).toBe(true);
    expect(DEFAULT_TEST_BATCH_SIZE).toBe(1);
    expect(partitionTests(files).every((batch) => batch.length === 1)).toBe(true);
  });

  it('parses a deterministic sorted-file resume index and rejects unsafe values', () => {
    expect(parseArgs(['--batch-size', '4', '--start-index', '115'])).toEqual({
      help: false,
      batchSize: 4,
      startIndex: 115,
      selectedFiles: [],
      fresh: false,
      busyOk: false,
      chipBase: null,
    });
    expect(parseArgs(['--file', 'tests-js/a.test.ts', '--file', 'tests-js/b.test.ts']))
      .toEqual({
        help: false,
        batchSize: 1,
        startIndex: 0,
        selectedFiles: ['tests-js/a.test.ts', 'tests-js/b.test.ts'],
        fresh: false,
        busyOk: false,
        chipBase: null,
      });
    expect(parseArgs(['--fresh'])).toMatchObject({ fresh: true });
    expect(parseArgs(['--fresh', '--busy-ok'])).toMatchObject({ fresh: true, busyOk: true });
    expect(parseArgs(['--start-index', '3', '--busy-ok'])).toMatchObject({ startIndex: 3, busyOk: true });
    // Selected and chip runs never read the box, so an override there would be a silent no-op.
    expect(() => parseArgs(['--busy-ok', '--file', 'tests-js/a.test.ts'])).toThrow('only to full or resumed runs');
    expect(() => parseArgs(['--chip-base', 'origin/main', '--busy-ok'])).toThrow('only to full or resumed runs');
    expect(() => parseArgs(['--start-index', '-1'])).toThrow('non-negative integer');
    expect(() => parseArgs(['--start-index', '1.5'])).toThrow('non-negative integer');
    expect(() => parseArgs(['--start-index', '1', '--file', 'tests-js/a.test.ts']))
      .toThrow('cannot be combined');
  });

  it('uses a clearly untrusted operator prefix and rejects stale or non-prefix checkpoints', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vugg-test-checkpoint-'));
    try {
      fs.writeFileSync(path.join(directory, 'a.txt'), 'alpha');
      const identity = testWorkflowIdentity({
        root: directory,
        identityFiles: ['a.txt'],
        runtime: { node: 'test', v8: 'test', platform: 'test', arch: 'test' },
      });
      const allFiles = ['tests-js/a.test.ts', 'tests-js/b.test.ts'];
      const checkpointPath = path.join(directory, 'checkpoint.json');
      writeJsonAtomic(checkpointPath, makeTestCheckpoint({
        identity,
        completedFiles: [allFiles[0]],
        batches: [{ files: [allFiles[0]], peak_rss_bytes: 123 }],
      }));
      expect(readTestCheckpoint({ checkpointPath, identity, allFiles }))
        .toMatchObject({
          schema: TEST_CHECKPOINT_SCHEMA,
          trust: TEST_CHECKPOINT_TRUST,
          full_suite_pass: false,
          completed_files: [allFiles[0]],
        });

      fs.writeFileSync(path.join(directory, 'a.txt'), 'changed');
      const staleIdentity = testWorkflowIdentity({
        root: directory,
        identityFiles: ['a.txt'],
        runtime: { node: 'test', v8: 'test', platform: 'test', arch: 'test' },
      });
      expect(readTestCheckpoint({ checkpointPath, identity: staleIdentity, allFiles })).toBeNull();

      writeJsonAtomic(checkpointPath, makeTestCheckpoint({
        identity,
        completedFiles: [allFiles[1]],
        batches: [{ files: [allFiles[1]], peak_rss_bytes: 123 }],
      }));
      expect(readTestCheckpoint({ checkpointPath, identity, allFiles })).toBeNull();
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('binds the complete project input tree, including release docs and CHANGELOG', () => {
    const files = collectTestIdentityFiles();
    expect(files).toContain('CHANGELOG.md');
    expect(files).toContain('docs/external-gate-evidence-template.json');
    expect(files).toContain('docs/RELEASE-MIGRATION-POLICY.md');
    expect(files).toContain('dist/00-mineral-spec.js');
    expect(files.some(file => file.startsWith('node_modules/'))).toBe(false);
    expect(files.some(file => file.startsWith('.local-evidence/'))).toBe(false);
  });

  it('refuses a fabricated complete checkpoint and never turns resume into full-suite PASS', () => {
    const allFiles = ['tests-js/a.test.ts', 'tests-js/b.test.ts'];
    const forgedComplete = makeTestCheckpoint({
      identity: { sha256: 'a'.repeat(64) },
      completedFiles: allFiles,
      batches: allFiles.map(file => ({ files: [file], peak_rss_bytes: 1 })),
    });
    expect(() => automaticTestRunPlan({ allFiles, resumed: forgedComplete }))
      .toThrow('refusing a zero-test PASS');

    const resumed = makeTestCheckpoint({
      identity: { sha256: 'a'.repeat(64) },
      completedFiles: [allFiles[0]],
      batches: [{ files: [allFiles[0]], peak_rss_bytes: 1 }],
    });
    const plan = automaticTestRunPlan({ allFiles, resumed });
    expect(plan).toMatchObject({
      resumeIndex: 1,
      files: [allFiles[1]],
      uninterrupted: false,
    });
    expect(makeTestCompletionReport({
      identity: resumed.identity,
      completedFiles: allFiles,
      batches: resumed.batches,
      uninterrupted: plan.uninterrupted,
    })).toMatchObject({
      status: 'operator-resume-complete',
      full_suite_pass: false,
      trust: TEST_CHECKPOINT_TRUST,
    });
  });

  it('fails closed when any project input changes during a run', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vugg-test-identity-drift-'));
    try {
      const input = path.join(directory, 'CHANGELOG.md');
      fs.writeFileSync(input, 'before');
      const runtime = { node: 'test', v8: 'test', platform: 'test', arch: 'test' };
      const identity = testWorkflowIdentity({ root: directory, runtime });
      expect(assertTestWorkflowIdentityUnchanged(identity, { root: directory, runtime }).sha256)
        .toBe(identity.sha256);

      const batchRunner = vi.fn(async () => {
        fs.writeFileSync(input, 'after');
        return {
          status: 0,
          peakRssBytes: 100,
          exceededRssBytes: null,
          monitorError: null,
          terminationError: null,
        };
      });
      await expect(runTestWorkflow({
        files: ['tests-js/a.test.ts'],
        batchRunner,
        assertStable: () => assertTestWorkflowIdentityUnchanged(identity, {
          root: directory,
          runtime,
        }),
      })).rejects.toThrow('project identity changed during the test run');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an empty resume suffix instead of reporting a false green run', () => {
    const files = ['tests-js/a.test.ts', 'tests-js/b.test.ts'];
    expect(selectResumeFiles(files, 1)).toEqual(['tests-js/b.test.ts']);
    expect(() => selectResumeFiles(files, files.length)).toThrow('outside discovered file range');
    expect(() => selectResumeFiles([], 0)).toThrow('no test files discovered');
  });

  it('pins one worker, threads, file serialization, and concurrency on the command line', () => {
    const args = vitestBatchArgs(['tests-js/a.test.ts']);
    expect(args).toEqual(expect.arrayContaining([
      `--max-old-space-size=${CHILD_HEAP_LIMIT_MB}`,
      '--pool=threads',
      '--maxWorkers=1',
      '--no-file-parallelism',
      '--maxConcurrency=1',
    ]));
    expect(path.basename(args[1])).toBe('vitest.mjs');
  });

  it('monitors total RSS asynchronously and terminates an oversized child', async () => {
    const child = new EventEmitter() as any;
    child.pid = 1234;
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('exit', null, 'SIGTERM'));
      return true;
    });
    const spawn = vi.fn(() => child);
    const rssSampler = vi.fn().mockResolvedValue(MAX_BATCH_RSS_BYTES + 1);
    const result = await runVitestBatch({
      batch: ['tests-js/a.test.ts'],
      spawn,
      rssSampler,
      pollIntervalMs: 1,
    });
    expect(result).toMatchObject({ outcome: 'rss-limit-exceeded', status: 1, exceededRssBytes: MAX_BATCH_RSS_BYTES + 1 });
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it.each([null, 0])('reports monitoring as inconclusive even when the stopped child exits %s', async (exitCode) => {
    const child = new EventEmitter() as any;
    child.pid = 1234;
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.emit('exit', exitCode, exitCode === null ? 'SIGTERM' : null));
      return true;
    });
    const result = await runVitestBatch({
      batch: ['tests-js/a.test.ts'],
      spawn: () => child,
      rssSampler: vi.fn().mockRejectedValue(new Error('sampler denied')),
      pollIntervalMs: 1,
    });
    expect(result).toMatchObject({
      status: MONITOR_UNAVAILABLE_EXIT_CODE, outcome: 'monitor-unavailable',
      exceededRssBytes: null, terminationError: null, exit: { code: exitCode },
    });
    expect(result.monitorError?.message).toContain(
      `RSS sampler failed ${MAX_CONSECUTIVE_RSS_FAILURES} consecutive times: sampler denied`,
    );
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('does not count isolated sampler failures as a monitoring outage', async () => {
    const child = new EventEmitter() as any;
    child.pid = 1234;
    child.kill = vi.fn();
    const rssSampler = vi.fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(123)
      .mockRejectedValueOnce(new Error('temporary again'))
      .mockImplementationOnce(async () => {
        queueMicrotask(() => child.emit('exit', 0, null));
        return 456;
      });
    const result = await runVitestBatch({
      batch: ['tests-js/a.test.ts'], spawn: () => child, rssSampler, pollIntervalMs: 1,
    });
    expect(result).toMatchObject({ outcome: 'pass', status: 0, peakRssBytes: 456, monitorError: null });
    expect(rssSampler).toHaveBeenCalledTimes(4);
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('retains a measured RSS breach when the sampler fails during termination', async () => {
    vi.useFakeTimers();
    try {
      const child = new EventEmitter() as any;
      child.pid = 1234;
      child.kill = vi.fn((signal: string) => {
        if (signal === 'SIGKILL') queueMicrotask(() => child.emit('exit', null, signal));
        return true;
      });
      const resultPromise = runVitestBatch({
        batch: ['tests-js/a.test.ts'], spawn: () => child,
        rssSampler: vi.fn().mockResolvedValueOnce(MAX_BATCH_RSS_BYTES + 1)
          .mockRejectedValue(new Error('sampler denied during shutdown')),
        pollIntervalMs: 100, terminationGraceMs: 500, hardKillGraceMs: 500,
      });
      await vi.advanceTimersByTimeAsync(700);
      const result = await resultPromise;
      expect(result).toMatchObject({ outcome: 'rss-limit-exceeded', status: 1,
        exceededRssBytes: MAX_BATCH_RSS_BYTES + 1 });
      expect(result.monitorError).toBeInstanceOf(Error);
    } finally { vi.useRealTimers(); }
  });

  it('stops on monitor loss without recording that batch as passed or measured', async () => {
    const onBatchPass = vi.fn();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const batchRunner = vi.fn()
        .mockResolvedValueOnce({ status: 0, peakRssBytes: 100 })
        // Even a zero child status must not bypass the failed monitor.
        .mockResolvedValueOnce({ status: 0, peakRssBytes: 0, monitorError: new Error('denied') });
      const status = await runTestWorkflow({
        files: ['tests-js/a.test.ts', 'tests-js/b.test.ts', 'tests-js/c.test.ts'],
        batchRunner, onBatchPass,
      });
      expect(status).toBe(MONITOR_UNAVAILABLE_EXIT_CODE);
      expect(batchRunner).toHaveBeenCalledTimes(2);
      expect(onBatchPass).toHaveBeenCalledTimes(1);
      expect(onBatchPass.mock.calls[0][0].batch).toEqual(['tests-js/a.test.ts']);
      expect(errorLog.mock.calls.flat().join('\n')).toContain('INCONCLUSIVE [monitor-unavailable]');
      expect(errorLog.mock.calls.flat().join('\n')).not.toContain('FAIL');
    } finally { errorLog.mockRestore(); }
  });

  it.each([
    [{ status: 0, monitorError: new Error('sampler lost') }, 'monitor-unavailable', 2],
    [{ status: 0, monitorError: new Error('lost'), exceededRssBytes: MAX_BATCH_RSS_BYTES + 1 }, 'rss-limit-exceeded', 1],
    [{ status: 0, monitorError: new Error('lost'), terminationError: new Error('denied') }, 'termination-failed', 1],
    [{ status: 2 }, 'test-process-failed', 2],
  ])('reports the typed failure to wrappers without advancing progress (%j)', async (result, outcome, status) => {
    const onFailure = vi.fn();
    const onBatchPass = vi.fn();
    const boxLoad = { mean_pct: 61.5, max_pct: 88, bucket_ms: 30000, buckets_pct: [35, 88] };
    const batchRunner = vi.fn(async () => ({ peakRssBytes: 100, ...result }));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await runTestWorkflow({ files: ['tests-js/a.test.ts'], batchRunner, onFailure, onBatchPass,
        loadRecorder: () => ({ stop: () => boxLoad }) })).toBe(status);
      expect(onFailure).toHaveBeenCalledExactlyOnceWith({ outcome, status, batch: ['tests-js/a.test.ts'], boxLoad });
      expect(onBatchPass).not.toHaveBeenCalled();
      // A failure prints the load as it ran, so contention can be told from a regression.
      expect(errorLog.mock.calls.flat().join('\n')).toContain('box load by 30 s while this batch ran: 35 88 %');
    } finally { errorLog.mockRestore(); }
  });

  it.each([
    { terminationError: new Error('child still alive'), label: 'termination-failed' },
    { exceededRssBytes: MAX_BATCH_RSS_BYTES + 1, label: 'rss-limit-exceeded' },
  ])('keeps $label more urgent than monitor loss', async ({ label, ...failure }) => {
    const onBatchPass = vi.fn();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const batchRunner = vi.fn().mockResolvedValue({
        status: 2, peakRssBytes: 0, monitorError: new Error('denied'), ...failure,
      });
      expect(await runTestWorkflow({
        files: ['tests-js/a.test.ts', 'tests-js/b.test.ts'], batchRunner, onBatchPass,
      })).toBe(1);
      expect(batchRunner).toHaveBeenCalledTimes(1);
      expect(onBatchPass).not.toHaveBeenCalled();
      expect(errorLog.mock.calls.flat().join('\n')).toContain(`FAIL [${label}]`);
    } finally { errorLog.mockRestore(); }
  });

  it('continues monitoring and escalates when a child ignores SIGTERM', async () => {
    vi.useFakeTimers();
    try {
      const child = new EventEmitter() as any;
      child.pid = 1234;
      child.kill = vi.fn((signal: string) => {
        if (signal === 'SIGKILL') queueMicrotask(() => child.emit('exit', null, 'SIGKILL'));
        return true;
      });
      const rssSampler = vi.fn().mockResolvedValue(MAX_BATCH_RSS_BYTES + 1);
      const hardKiller = vi.fn();
      const resultPromise = runVitestBatch({
        batch: ['tests-js/a.test.ts'],
        spawn: () => child,
        rssSampler,
        hardKiller,
        pollIntervalMs: 100,
        terminationGraceMs: 500,
        hardKillGraceMs: 500,
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(rssSampler).toHaveBeenCalledTimes(1);
      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');

      // Monitoring remains live while the child ignores SIGTERM. Fake time
      // makes this causal ordering independent of the host timer quantum.
      await vi.advanceTimersByTimeAsync(100);
      expect(rssSampler).toHaveBeenCalledTimes(2);
      expect(child.kill).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(400);
      const result = await resultPromise;
      expect(result.status).toBe(1);
      expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
      expect(hardKiller).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns bounded and unreferences the child if every termination route fails', async () => {
    const child = new EventEmitter() as any;
    child.pid = 1234;
    child.kill = vi.fn(() => false);
    child.unref = vi.fn();
    const started = Date.now();
    const result = await runVitestBatch({
      batch: ['tests-js/a.test.ts'],
      spawn: () => child,
      rssSampler: vi.fn().mockResolvedValue(MAX_BATCH_RSS_BYTES + 1),
      hardKiller: vi.fn().mockRejectedValue(new Error('OS denied hard kill')),
      pollIntervalMs: 1,
      terminationGraceMs: 2,
      hardKillGraceMs: 2,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.status).toBe(1);
    expect(result.terminationError?.message).toContain('OS denied hard kill');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('runs batches serially and stops at the first failing batch', async () => {
    const batchRunner = vi.fn()
      .mockResolvedValueOnce({ status: 0, peakRssBytes: 100, exceededRssBytes: null, monitorError: null, terminationError: null })
      .mockResolvedValueOnce({ status: 7, peakRssBytes: 200, exceededRssBytes: null, monitorError: null, terminationError: null })
      .mockResolvedValueOnce({ status: 0, peakRssBytes: 100, exceededRssBytes: null, monitorError: null, terminationError: null });
    const status = await runTestWorkflow({
      files: ['tests-js/a.test.ts', 'tests-js/b.test.ts', 'tests-js/c.test.ts'],
      batchSize: 1,
      batchRunner,
    });
    expect(status).toBe(7);
    expect(batchRunner).toHaveBeenCalledTimes(2);
    expect(batchRunner.mock.invocationCallOrder[0]).toBeLessThan(batchRunner.mock.invocationCallOrder[1]);
  });

  it('persists progress only after a passing batch', async () => {
    const onBatchPass = vi.fn();
    const batchRunner = vi.fn()
      .mockResolvedValueOnce({ status: 0, peakRssBytes: 100, exceededRssBytes: null, monitorError: null, terminationError: null })
      .mockResolvedValueOnce({ status: 7, peakRssBytes: 200, exceededRssBytes: null, monitorError: null, terminationError: null });
    const status = await runTestWorkflow({
      files: ['tests-js/a.test.ts', 'tests-js/b.test.ts'],
      batchSize: 1,
      batchRunner,
      onBatchPass,
    });
    expect(status).toBe(7);
    expect(onBatchPass).toHaveBeenCalledTimes(1);
    expect(onBatchPass).toHaveBeenCalledWith(expect.objectContaining({
      batch: ['tests-js/a.test.ts'],
      peakRssBytes: 100,
      elapsedMs: expect.any(Number),
    }));
    expect(onBatchPass.mock.calls[0][0].elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('forwards measured elapsed_ms to the Test Quarry ledger hook', async () => {
    const onBatchPass = vi.fn();
    const batchRunner = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
      return {
        status: 0, peakRssBytes: 100, exceededRssBytes: null,
        monitorError: null, terminationError: null,
      };
    });
    const status = await runTestWorkflow({
      files: ['tests-js/a.test.ts'],
      batchSize: 1,
      batchRunner,
      onBatchPass,
    });
    expect(status).toBe(0);
    expect(onBatchPass.mock.calls[0][0].elapsedMs).toBeGreaterThan(0);
  });

  it('annotates each passing batch with the box load it ran under', async () => {
    const loads = [{ mean_pct: 12, max_pct: 30, bucket_ms: 30000, buckets_pct: [30] },
      { mean_pct: null, max_pct: null, bucket_ms: 30000, buckets_pct: [null] }];
    const onBatchPass = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const status = await runTestWorkflow({
        files: ['tests-js/a.test.ts', 'tests-js/b.test.ts'], onBatchPass,
        batchRunner: async () => ({ status: 0, peakRssBytes: 100 }),
        loadRecorder: () => { const load = loads.shift(); return { stop: () => load }; },
      });
      // An unread load is a note on the record, never a failed batch.
      expect(status).toBe(0);
      expect(onBatchPass.mock.calls.map(call => call[0].boxLoad)).toEqual([
        { mean_pct: 12, max_pct: 30, bucket_ms: 30000, buckets_pct: [30] },
        { mean_pct: null, max_pct: null, bucket_ms: 30000, buckets_pct: [null] },
      ]);
      const lines = log.mock.calls.flat().join('\n');
      expect(lines).toContain('batch 1/2 PASS (peak 1 MB RSS');
      expect(lines).toContain('box 12 % mean, 30 % peak)');
      expect(lines).toContain('batch 2/2 PASS (peak 1 MB RSS');
      expect(lines).toContain('box load not read)');
    } finally { log.mockRestore(); }
  });

  it('stops the load recorder even when a batch cannot launch', async () => {
    const stop = vi.fn(() => null);
    await expect(runTestWorkflow({ files: ['tests-js/a.test.ts'], loadRecorder: () => ({ stop }),
      batchRunner: async () => { throw new Error('spawn denied'); } })).rejects.toThrow('spawn denied');
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('keeps each batch load in checkpoint and completion records', () => {
    const boxLoad = { mean_pct: 9, max_pct: 9, bucket_ms: 30000, buckets_pct: [] };
    const identity = { sha256: 'a'.repeat(64) };
    const batches = [{ files: ['tests-js/a.test.ts'], peak_rss_bytes: 1, box_load: boxLoad },
      { files: ['tests-js/b.test.ts'], peak_rss_bytes: 2 }];
    const checkpoint = makeTestCheckpoint({ identity, completedFiles: ['tests-js/a.test.ts', 'tests-js/b.test.ts'], batches });
    expect(checkpoint.batches.map(batch => batch.box_load)).toEqual([boxLoad, null]);
    expect(makeTestCompletionReport({ identity, completedFiles: ['tests-js/a.test.ts', 'tests-js/b.test.ts'],
      batches, uninterrupted: true }).batches[0].box_load).toEqual(boxLoad);
  });
});

describe('quiet-box refusal at the real runner entry point (tiny fixture)', () => {
  // The real coordinator with its real arguments, checkpoint, ledger and
  // invocation result; only the box reading is replaced, by a gate that
  // refuses every long run, and Vitest by a fake that announces itself.
  function fixture(run: (root: string, runner: (args: string[]) => any) => void) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vugg-quiet-refusal-'));
    try {
      fs.mkdirSync(path.join(root, 'tools'));
      for (const file of ['test-workflow.mjs', 'test-quarry-ledger.mjs', 'locality-frequency-contract.mjs',
        'test-chip-check.mjs', 'process-census-lib.mjs']) {
        fs.copyFileSync(path.join(process.cwd(), 'tools', file), path.join(root, 'tools', file));
      }
      fs.copyFileSync(path.join(process.cwd(), 'tools', 'quiet-box-lib.mjs'), path.join(root, 'tools', 'quiet-box-real.mjs'));
      fs.writeFileSync(path.join(root, 'tools', 'quiet-box-lib.mjs'), `
        export * from './quiet-box-real.mjs';
        import { QuietBoxRefusedError } from './quiet-box-real.mjs';
        export async function quietBoxGate({ longRun, busyOk }) {
          if (!longRun || busyOk) return null;
          throw new QuietBoxRefusedError({ reasons: ['fixture box at 80 %'] });
        }
      `);
      fs.mkdirSync(path.join(root, 'tests-js'));
      for (const file of ['a', 'b']) fs.writeFileSync(path.join(root, 'tests-js', `${file}.test.ts`), '// fixture');
      fs.mkdirSync(path.join(root, 'node_modules', 'vitest'), { recursive: true });
      fs.writeFileSync(path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), `
        console.log('fixture executed ' + process.argv.filter(arg => arg.startsWith('tests-js/')).join(','));
      `);
      const env = { ...process.env, [TEST_INVOCATION_ENV]: '00000000-0000-4000-8000-000000000003' };
      delete env.VUGG_QUIET_BOX_PREFLIGHT;
      run(root, args => spawnSync(process.execPath, ['tools/test-workflow.mjs', ...args], {
        cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000, env,
      }));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }

  it('does not start a fresh run on a busy box, and deletes nothing it would have reset', () => fixture((root, runner) => {
    const checkpoint = path.join(root, '.local-evidence', 'test-workflow-checkpoint-v2.json');
    const ledger = path.join(root, '.local-evidence', 'test-quarry-cost-ledger-v1.json');
    fs.mkdirSync(path.dirname(checkpoint), { recursive: true });
    fs.writeFileSync(checkpoint, 'earlier checkpoint bytes');
    fs.writeFileSync(ledger, 'earlier ledger bytes');
    const child = runner(['--fresh']);
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(3);
    expect(child.stderr).toContain('[test-workflow] NOT STARTED: the box is busy: fixture box at 80 %');
    expect(child.stdout).not.toContain('fixture executed');
    expect(fs.readFileSync(checkpoint, 'utf8')).toBe('earlier checkpoint bytes');
    expect(fs.readFileSync(ledger, 'utf8')).toBe('earlier ledger bytes');
    const result = JSON.parse(fs.readFileSync(
      path.join(root, '.local-evidence', 'test-workflow-invocations', '00000000-0000-4000-8000-000000000003.json'), 'utf8'));
    expect(result).toMatchObject({ status: 3, outcome: 'quiet-box-refused', completion: null });
  }));

  it('also guards a manual resume, but never a selected-file run', () => fixture((_root, runner) => {
    expect(runner(['--start-index', '1']).status).toBe(3);
    const selected = runner(['--file', 'tests-js/a.test.ts']);
    expect(selected.status).toBe(0);
    expect(selected.stdout).toContain('fixture executed tests-js/a.test.ts');
  }));

  it('hands --busy-ok to the gate and then runs every file', () => fixture((_root, runner) => {
    const child = runner(['--fresh', '--busy-ok']);
    expect(child.status).toBe(0);
    expect(child.stdout).toContain('fixture executed tests-js/a.test.ts');
    expect(child.stdout).toContain('fixture executed tests-js/b.test.ts');
    expect(child.stdout).toContain('UNINTERRUPTED PASS: 2 files');
  }));
});
