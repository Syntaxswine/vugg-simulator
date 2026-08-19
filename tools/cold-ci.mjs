#!/usr/bin/env node
/**
 * tools/cold-ci.mjs — run the full guard and STAMP the verdict.
 *
 * The cold-CI discipline (CATCHES.md, 10th catch): run `npm run ci` at the
 * very start of a session, before touching a single file, to learn whether
 * the inherited tree is actually green rather than assuming it. The 10th
 * catch is why: a comment edit after the final build left the committed
 * bundle stale, the guard's summary statistic lied ("diff length: 0
 * chars"), and the next session started on a red tree without knowing.
 *
 * What this wrapper adds over bare `npm run ci`: a VERDICT THAT PERSISTS.
 * On every run it writes `.ci-stamp.json` (gitignored) at the repo root:
 *
 *   { commit, dirty, verdict: "green"|"red", exitCode,
 *     startedAt, finishedAt, durationSec, node, platform, simVersion }
 *
 * The next session (or the vugg-session-start skill) reads the stamp
 * first: if `commit` matches HEAD, the tree is clean, and the verdict is
 * green, the 9-minute re-run buys nothing — the answer is already known.
 * Any mismatch (new HEAD, dirty tree, red, or no stamp) → run this again.
 *
 * A DIRTY tree is stamped but the stamp records dirty:true — a verdict
 * earned on uncommitted work vouches for that working state only, not for
 * HEAD. (Concurrent-session note: two sessions sharing the repo will race
 * the stamp; the commit field is what keeps a stale stamp from lying.)
 *
 * Usage:
 *   node tools/cold-ci.mjs           # run ci + stamp
 *   node tools/cold-ci.mjs --check   # read the stamp, no run: exits 0 if
 *                                    #   it vouches for HEAD (clean+green),
 *                                    #   1 otherwise (with the reason)
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STAMP = path.join(ROOT, '.ci-stamp.json');

const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim();
const head = () => git('rev-parse HEAD');
const isDirty = () => git('status --porcelain') !== '';

if (process.argv.includes('--check')) {
  if (!fs.existsSync(STAMP)) {
    console.log('[cold-ci] no stamp — run `node tools/cold-ci.mjs`');
    process.exit(1);
  }
  const s = JSON.parse(fs.readFileSync(STAMP, 'utf8'));
  const reasons = [];
  if (s.commit !== head()) reasons.push(`stamp is for ${s.commit.slice(0, 7)}, HEAD is ${head().slice(0, 7)}`);
  if (s.dirty) reasons.push('stamp was earned on a DIRTY tree');
  if (isDirty()) reasons.push('tree is dirty NOW (stamp vouches for HEAD only)');
  if (s.verdict !== 'green') reasons.push(`stamped verdict is ${s.verdict.toUpperCase()}`);
  if (reasons.length) {
    console.log(`[cold-ci] stamp does NOT vouch for this tree:\n  - ${reasons.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`[cold-ci] GREEN — ${s.commit.slice(0, 7)} verified ${s.finishedAt} (${s.durationSec}s, sim v${s.simVersion ?? '?'})`);
  process.exit(0);
}

// Cold CI owns the lease for the WHOLE wrapper, not merely its own preamble.
// A rival-process check before the gates still left two same-checkout cold runs
// free to overlap through the minute of typecheck/build/audits, only for one to
// be refused later at `npm test` — by which point both have burned the minute
// and one of them is waste. Holding the claim across the wrapper closes that
// window, and handing the token down means the nested test workflow ADOPTS this
// lease instead of deadlocking against its own parent.
const allowBusy = process.argv.includes('--allow-busy');
const { beginRun, endRun, postflight, TOKEN_ENV, ALLOW_BUSY_ENV } = await import('./foreman.mjs');
let run;
try {
  run = await beginRun({
    runId: `coldci-${head().slice(0, 8)}`,
    tier: 'cold-ci',
    owner: `cold-ci pid:${process.pid}`,
    allowBusy,
  });
} catch (error) {
  console.error(`[cold-ci] ${error.message} — a 3.5-hour measurement taken now is not a measurement.`);
  process.exit(1);
}

const startedAt = new Date().toISOString();
const t0 = Date.now();
const commit = head();
const dirty = isDirty();

console.log(`[cold-ci] running full guard on ${commit.slice(0, 7)}${dirty ? ' (DIRTY tree)' : ''}…`);
let exitCode = 1;
try {
  // The guard runs as an AWAITED async child, never spawnSync. A synchronous
  // wait blocks this process's event loop — and the event loop is where the
  // foreman's heartbeat and telemetry timer lives. Under spawnSync the lease's
  // heartbeat froze at acquisition and read STALE (>90 s) for the entire
  // 3.5-hour run, every minute of which a rival could legally take the machine
  // over; the host telemetry for the run was likewise never sampled. Owning
  // the whole wrapper means staying awake to assert it.
  exitCode = await new Promise((resolve) => {
    const child = spawn('npm', ['run', 'ci'], {
      cwd: ROOT, stdio: 'inherit', shell: true,
      // The handoff. Without TOKEN_ENV the nested workflow would try to take a
      // second machine-wide lease and be refused by THIS one. Without
      // ALLOW_BUSY_ENV the advertised override evaporates at the npm boundary
      // and a deliberately-contaminated cold run still refuses the moment tests
      // begin — an override that only works for the first minute is not an
      // option, it is a trap.
      env: {
        ...process.env,
        [TOKEN_ENV]: run.token || '',
        ...(allowBusy ? { [ALLOW_BUSY_ENV]: '1' } : {}),
      },
    });
    child.on('error', (error) => {
      console.error(`[cold-ci] npm could not be spawned: ${error.message}`);
      resolve(1);
    });
    child.on('close', code => resolve(code ?? 1));
  });

  let simVersion = null;
  try {
    const m = /const SIM_VERSION = (\d+)/.exec(fs.readFileSync(path.join(ROOT, 'js', '15-version.ts'), 'utf8'));
    if (m) simVersion = Number(m[1]);
  } catch { /* stamp without it */ }

  const stamp = {
    commit,
    dirty,
    verdict: exitCode === 0 ? 'green' : 'red',
    exitCode,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationSec: Math.round((Date.now() - t0) / 1000),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    simVersion,
  };
  // A contaminated run must not leave a stamp that reads GREEN. The stamp is
  // what the next session trusts in place of paying for the run again, so it is
  // the last place a "the machine was busy" caveat may be dropped.
  stamp.contaminated = run.contaminated === true;
  if (run.contaminated && stamp.verdict === 'green') stamp.verdict = 'contaminated';
  fs.writeFileSync(STAMP, JSON.stringify(stamp, null, 2) + '\n');
  console.log(`[cold-ci] ${stamp.verdict.toUpperCase()} in ${stamp.durationSec}s — stamped .ci-stamp.json for ${commit.slice(0, 7)}${dirty ? ' (dirty: vouches for the working state, not HEAD)' : ''}`);
} finally {
  // Postflight + release on EVERY exit path, the failing one included: a crash
  // is when workers are likeliest to be orphaned, and a lease that outlives its
  // run blocks the machine until staleness bails it out. Before this was a
  // finally, a throw anywhere above (a full disk at the stamp write, say)
  // leaked both the process tree and the claim.
  try {
    const swept = await postflight({ rootPid: process.pid });
    if (!swept.clean) console.error('[cold-ci] processes survived this run; see above.');
  } catch (error) {
    console.error(`[cold-ci] postflight could not run: ${error.message}`);
  }
  endRun(run);
}
process.exit(exitCode);
