#!/usr/bin/env node
/**
 * tools/concurrency-probe.mjs — does the serial config cost what it claims to save?
 *
 * `vitest.config.ts` pins `maxWorkers: 1` + `fileParallelism: false`, justified
 * by a comment recording that eight workers "consumed most system RAM". This
 * host has 63.9 GB and 16 logical processors, against a measured worst-case
 * child of 1676 MB — eight of those is 16% of the machine. Either that comment
 * was written for different hardware, or those eight clean workers were sitting
 * on top of abandoned ones. Re-measuring beats re-quoting.
 *
 * RUNS UNDER THE FOREMAN, and that is the point. The first attempt at this
 * experiment was launched while another agent's cold suite had been running for
 * 1.77 hours; it produced a NUMBER rather than an error, and the number was
 * wrong by about 5%. A benchmark that cannot refuse to run is a benchmark that
 * reports contention as physics.
 *
 * Arms are (workers, fileParallelism) pairs over one fixed file set, one child
 * per arm. Same files every arm, so the only variable is concurrency.
 *
 * Usage:
 *   node tools/concurrency-probe.mjs                # 1 / 2 / 4 / 8 workers
 *   node tools/concurrency-probe.mjs --workers 1,4  # a subset
 *   node tools/concurrency-probe.mjs --allow-busy   # deliberately contaminated
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beginRun, endRun, postflight } from './foreman.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VITEST = path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const HEAP_MB = 1536;

// Six mid-weight, simulator-stepping files. Chosen from the measured profile so
// the arm is dominated by real excavation rather than by process startup, and
// held FIXED so this probe stays comparable across runs — including against the
// contaminated 1030.4 s reading taken on 2026-08-18.
export const PROBE_FILES = [
  'tests-js/carbonate-week7-reactive-wall.test.ts',
  'tests-js/native-metal-morphology.test.ts',
  'tests-js/sicily.test.ts',
  'tests-js/nuc-seed-isolation.test.ts',
  'tests-js/cascade-gate-audit.test.ts',
  'tests-js/sulphur-bank.test.ts',
];
/** Sum of these six in the clean 12 193 s profile, one file per child. */
export const PROFILE_BASELINE_SEC = 990.4;

const argv = process.argv.slice(2);
const flag = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const workerCounts = (flag('--workers') || '1,2,4,8').split(',').map(Number).filter(Boolean);

const runArm = (workers) => {
  const args = [
    `--max-old-space-size=${HEAP_MB}`, VITEST, 'run', ...PROBE_FILES,
    '--reporter=dot', '--pool=threads', `--maxWorkers=${workers}`, '--maxConcurrency=1',
    ...(workers === 1 ? ['--no-file-parallelism'] : []),
  ];
  const startedIso = new Date().toISOString();
  const t0 = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  const sec = (Date.now() - t0) / 1000;
  const passed = /Test Files\s+(\d+) passed/.exec(result.stdout || '');
  const failed = /(\d+) failed/.test(result.stdout || '');
  return {
    workers, sec: Number(sec.toFixed(1)), status: result.status,
    filesPassed: passed ? Number(passed[1]) : null, anyFailure: failed,
    startedIso, finishedIso: new Date().toISOString(),
  };
};

const run = await beginRun({
  runId: `concurrency-${Date.now().toString(36)}`,
  tier: 'benchmark',
  owner: `concurrency-probe pid:${process.pid}`,
  allowBusy: argv.includes('--allow-busy'),
});

const arms = [];
try {
  console.log(`[concurrency] ${PROBE_FILES.length} files per arm; workers: ${workerCounts.join(', ')}`);
  console.log(`[concurrency] clean-profile baseline for these six, one file per child: ${PROFILE_BASELINE_SEC}s\n`);
  for (const workers of workerCounts) {
    const arm = runArm(workers);
    arms.push(arm);
    console.log(`  workers=${String(workers).padStart(2)}  ${String(arm.sec).padStart(7)}s`
      + `  exit ${arm.status}  files passed ${arm.filesPassed}${arm.anyFailure ? '  <-- FAILURES' : ''}`);
  }

  const serial = arms.find(a => a.workers === 1);
  console.log('');
  for (const arm of arms) {
    if (!serial || arm.workers === 1 || arm.status !== 0 || serial.status !== 0) continue;
    console.log(`  ${arm.workers} workers: ${(serial.sec / arm.sec).toFixed(2)}x faster than serial`
      + ` (${(serial.sec - arm.sec).toFixed(0)}s saved on this sample)`);
  }
  // An arm that FAILED is reported, never quietly dropped from the speedup
  // table — "8 workers was fastest" means nothing if 8 workers went red.
  const broken = arms.filter(a => a.status !== 0 || a.anyFailure);
  if (broken.length) {
    console.error(`\n[concurrency] ${broken.length} arm(s) did not pass cleanly: `
      + broken.map(a => `workers=${a.workers}`).join(', '));
    console.error('[concurrency] a faster arm that fails is not a faster arm.');
  }
} finally {
  const out = path.join(ROOT, '.local-evidence', `concurrency-probe-${run.runId}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    runId: run.runId,
    contaminated: run.contaminated,
    telemetry: run.telemetryPath ? path.relative(ROOT, run.telemetryPath) : null,
    telemetryGaps: run.telemetryGaps(),
    files: PROBE_FILES,
    profileBaselineSec: PROFILE_BASELINE_SEC,
    arms,
  }, null, 2) + '\n');
  console.log(`\n[concurrency] receipt: ${path.relative(ROOT, out)}`
    + `${run.contaminated ? '  (CONTAMINATED)' : ''}`);
  try {
    const swept = await postflight({ rootPid: process.pid });
    if (!swept.clean) console.error('[concurrency] processes survived this probe.');
  } catch (error) {
    console.error(`[concurrency] postflight could not run: ${error.message}`);
  }
  endRun(run);
}
