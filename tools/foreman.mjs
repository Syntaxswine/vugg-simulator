#!/usr/bin/env node
/**
 * tools/foreman.mjs — the wiring. Turns observation into enforcement.
 *
 * `process-census.mjs` and `host-sampler.mjs` were tools in the shed: useful
 * when someone remembered to invoke them, incapable of preventing the next
 * collision by themselves. This module is what a measured run calls, so the
 * refusal happens whether or not anybody remembered.
 *
 * FOUR JOBS.
 *
 *   preflight   refuse to start when another checkout's suite is already
 *               running. `--allow-busy` proceeds, but the run is then stamped
 *               CONTAMINATED and every consumer of its numbers is told so.
 *
 *   lease       a MACHINE-WIDE claim, deliberately not inside the repo. A lease
 *               under `.local-evidence/` cannot see a rival checkout's lease,
 *               which is the exact collision this exists to stop: two Vugg
 *               working copies are two directories and one CPU.
 *
 *   telemetry   host sampling started and stopped WITH the run, its receipt
 *               keyed to the run's identity so a profile and the machine state
 *               behind it can never drift apart. Sampling runs in-process: a
 *               hygiene subsystem that spawns its own long-lived child is one
 *               crash away from being the leak it was built to catch.
 *
 *   postflight  verify the owned tree is gone; kill what remains, because we
 *               own it; re-verify; and report a survivor as a failure. Killing
 *               is scoped to OUR root's descendants and nothing else, ever.
 *
 * ── OWNERSHIP IS ATOMIC, AND RELEASE IS AUTHENTICATED ──────────────────────
 *
 * The first version acquired by read → decide-it-is-free → write. Two agents
 * entering that window both read "free", both wrote, and the second silently
 * displaced the first — the precise race the lease exists to prevent, rebuilt
 * inside the lease. Worse, release deleted unconditionally, so a displaced or
 * long-finished owner could delete a NEWER owner's claim and hand the machine
 * to a third.
 *
 * So: the claim is a DIRECTORY, created with `mkdir`, which is atomic and
 * fails with EEXIST on every platform we run. Exactly one racer creates it;
 * everyone else is told who holds it. Taking over a stale claim is a
 * compare-and-swap — rename the dead directory aside, and only the racer whose
 * rename succeeded may recreate it — never a blind overwrite. Every acquisition
 * mints an unguessable token; heartbeat and release both verify it, so a
 * process holding a stale handle can refresh nothing and delete nothing.
 *
 * STALE LEASES ARE DIAGNOSED, NOT TRUSTED AND NOT BULLDOZED. A lease is live
 * only if its recorded (pid, startedIso) still matches a running process AND
 * its heartbeat is fresh. PIDs are recycled, so the start time is load-bearing:
 * a lease naming only a PID is one reuse away from a stranger vouching for a
 * run that ended hours ago.
 *
 * NESTED RUNS ADOPT, THEY DO NOT RE-ACQUIRE. `cold-ci.mjs` holds the lease for
 * the whole wrapper and passes its token down; `test-workflow.mjs` sees the
 * token, joins the existing claim, and neither re-acquires nor releases it.
 * A nested second lease would either deadlock against its own parent or, worse,
 * release the parent's claim mid-run.
 *
 * ── AND SO ARE REFRESH AND RELEASE (the 2026-08-19 repair) ─────────────────
 *
 * Acquisition got the CAS treatment first; refresh and release had kept the
 * read → decide → write shape. `touchLease` re-wrote lease.json wholesale, so a
 * holder racing a takeover could resurrect its own record on top of the
 * successor's — ownership silently swapped back with no mkdir ever failing.
 * And `releaseLease` verified the token, then `rmSync`'d the live directory:
 * between those two lines a takeover could land, and the delete would destroy
 * the successor's brand-new claim — the exact defect the comment above it
 * warned about, one line lower.
 *
 * The repair keeps every mutation single-winner:
 *   - heartbeats live in a TOKEN-KEYED file (`hb-<token>.json`), so a stale
 *     holder's refresh can at worst deposit an inert orphan in a successor's
 *     claim — it can never overwrite the successor's identity;
 *   - release renames the claim directory ASIDE first (the same single-winner
 *     primitive as takeover), verifies the parked lease is its own, and only
 *     then deletes; a parked successor is renamed straight back.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, descendantsOf, listJsProcesses } from './process-census.mjs';
import { sampleHost } from './host-sampler.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Machine-wide, deliberately OUTSIDE any checkout. A directory, because
 *  `mkdir` is the atomic primitive; the JSON inside is only the description. */
export const LEASE_DIR = path.join(os.tmpdir(), 'vugg-foreman', 'run-lease.d');
export const LEASE_FILE = 'lease.json';
/** Env names by which a parent run hands ownership to a nested one. */
export const TOKEN_ENV = 'VUGG_FOREMAN_LEASE_TOKEN';
export const ALLOW_BUSY_ENV = 'VUGG_FOREMAN_ALLOW_BUSY';
/** A heartbeat older than this means the holder is gone or wedged. */
export const HEARTBEAT_STALE_MS = 90_000;
/** Heartbeat cadence: far below HEARTBEAT_STALE_MS, and far below a single
 *  batch's worst case (900 s) — a per-batch heartbeat would make a healthy
 *  15-minute file look like an abandoned run. */
export const HEARTBEAT_INTERVAL_MS = 15_000;
/** A claim directory with no readable lease.json inside is mid-acquisition,
 *  not abandoned, for this long. Without the grace, one racer's half-written
 *  claim reads as garbage to another and gets stolen a millisecond later. */
export const PARTIAL_CLAIM_GRACE_MS = 5_000;
export const ACQUIRE_ATTEMPTS = 5;
export const TELEMETRY_INTERVAL_MS = 1000;
export const TELEMETRY_PROCESS_SCAN_EVERY = 10;

const leaseFileIn = dir => path.join(dir, LEASE_FILE);

const writeJson = (file, value) => {
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
};

export function readLease({ leaseDir = LEASE_DIR } = {}) {
  try { return JSON.parse(fs.readFileSync(leaseFileIn(leaseDir), 'utf8')); }
  catch { return null; }
}

/**
 * Is a lease still held? Returns {live, reason} — never a bare boolean, because
 * "the holder died" and "the holder is working" must be distinguishable in the
 * message a blocked agent reads.
 */
export function leaseLiveness(lease, processes, now = Date.now(), { leaseDir = null } = {}) {
  if (!lease) return { live: false, reason: 'no lease' };
  const holder = processes.find(p => p.pid === lease.rootPid);
  if (!holder) return { live: false, reason: `holder pid ${lease.rootPid} is gone` };
  if (lease.rootStartedIso && holder.startedIso && holder.startedIso !== lease.rootStartedIso) {
    // The PID was recycled. Without this check a stranger's process would
    // vouch for a run that ended hours ago and block every future run.
    return { live: false, reason: `pid ${lease.rootPid} was RECYCLED (started ${holder.startedIso}, lease says ${lease.rootStartedIso})` };
  }
  // Heartbeats live in a token-keyed file beside lease.json (see the module
  // docstring): the lease record itself is immutable for the claim's lifetime.
  // A lease that predates the split, or that has not been touched yet, is
  // judged by the heartbeatIso it was born with.
  let heartbeatIso = lease.heartbeatIso;
  if (leaseDir && lease.token) {
    try {
      const hb = JSON.parse(fs.readFileSync(path.join(leaseDir, `hb-${lease.token}.json`), 'utf8'));
      if (hb?.heartbeatIso) heartbeatIso = hb.heartbeatIso;
    } catch { /* never touched — the acquisition heartbeat stands */ }
  }
  const age = now - Date.parse(heartbeatIso || 0);
  if (!Number.isFinite(age)) return { live: false, reason: 'heartbeat unreadable' };
  if (age > HEARTBEAT_STALE_MS) {
    return { live: false, reason: `heartbeat is ${Math.round(age / 1000)} s old (stale after ${HEARTBEAT_STALE_MS / 1000} s)` };
  }
  return { live: true, reason: `held by ${lease.owner} since ${lease.startedIso}` };
}

/**
 * Atomic acquisition. Returns {acquired:true, lease} or {acquired:false, lease,
 * liveness}. Never overwrites a live claim, and never takes over a dead one by
 * writing on top of it.
 */
export function acquireLease({
  leaseDir = LEASE_DIR, describe, processes = [], log = console.log,
  attempts = ACQUIRE_ATTEMPTS, now = Date.now,
} = {}) {
  fs.mkdirSync(path.dirname(leaseDir), { recursive: true });
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      // THE atomic step. Exactly one racer's mkdir returns; every other gets
      // EEXIST. Nothing before this line may be trusted as a decision.
      fs.mkdirSync(leaseDir);
      const lease = describe();
      writeJson(leaseFileIn(leaseDir), lease);
      return { acquired: true, lease };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }

    const existing = readLease({ leaseDir });
    if (!existing) {
      // The directory exists but carries no readable description. That is
      // either a racer mid-acquisition or a crash between mkdir and write.
      // Treat it as live during the grace window: stealing a claim that is
      // being written is the same bug in a smaller window.
      let bornMs = 0;
      try { bornMs = fs.statSync(leaseDir).mtimeMs; } catch { bornMs = 0; }
      if (now() - bornMs < PARTIAL_CLAIM_GRACE_MS) {
        return {
          acquired: false, lease: null,
          liveness: { live: true, reason: 'another acquisition is in flight' },
        };
      }
    } else {
      const liveness = leaseLiveness(existing, processes, now(), { leaseDir });
      if (liveness.live) return { acquired: false, lease: existing, liveness };
    }

    // Compare-and-swap takeover: rename the dead claim ASIDE. Rename onto a
    // fresh unique name succeeds for exactly one racer; the losers get ENOENT
    // and loop round to discover whoever won. A blind rmdir-then-mkdir here
    // would let two takers both "succeed".
    const parked = `${leaseDir}.stale-${crypto.randomBytes(6).toString('hex')}`;
    try {
      fs.renameSync(leaseDir, parked);
      log(`[foreman] stale claim taken over${existing ? ` from run ${existing.runId}` : ''}`
        + ` — ${existing ? leaseLiveness(existing, processes, now(), { leaseDir: parked }).reason : 'no readable lease inside'}`);
      try { fs.rmSync(parked, { recursive: true, force: true }); } catch { /* parked out of the way; that is enough */ }
    } catch {
      // Someone else took it over first. Loop; they now hold it and we will be
      // told so on the next pass.
    }
  }
  return {
    acquired: false, lease: readLease({ leaseDir }),
    liveness: { live: true, reason: `could not acquire after ${attempts} attempts` },
  };
}

/** Refresh the heartbeat ONLY if we still own the claim. Returns false if we
 *  were displaced — a holder that lost the lease must stop pretending.
 *
 *  The heartbeat is a TOKEN-KEYED file, never a rewrite of lease.json. The
 *  ownership check above can race a takeover, but the write it authorises is
 *  then inert by construction: `hb-<ourToken>.json` deposited into a
 *  successor's claim is an orphan their liveness never reads (it reads
 *  `hb-<theirToken>.json`), where the old whole-record rewrite would have
 *  resurrected our identity on top of theirs. */
export function touchLease({ leaseDir = LEASE_DIR, token } = {}) {
  const current = readLease({ leaseDir });
  if (!current || current.token !== token) return false;
  try {
    writeJson(path.join(leaseDir, `hb-${token}.json`), { heartbeatIso: new Date().toISOString() });
    return true;
  } catch { return false; }
}

/** Release ONLY our own claim. A displaced or long-finished owner deleting a
 *  successor's lease would hand the machine to a third party — which is the
 *  original race with extra steps.
 *
 *  Deleting the live directory after a token check is that race: the check and
 *  the delete are two steps, and a takeover fits between them. So release uses
 *  the same single-winner primitive as takeover — rename the claim ASIDE,
 *  verify the parked lease is ours, and only then delete it. A parked
 *  successor (we lost the race) is renamed straight back; if the slot has
 *  already been re-claimed by a third party the collision is REPORTED, never
 *  silently eaten. `onParked` is a test seam: it runs with the claim parked,
 *  which is the only instant the race can be simulated deterministically. */
export function releaseLease({ leaseDir = LEASE_DIR, token, warn = console.error, onParked = null } = {}) {
  const current = readLease({ leaseDir });
  if (!current) return false;
  if (current.token !== token) {
    warn(`[foreman] not releasing lease: it now belongs to run ${current.runId}, not to us.`);
    return false;
  }
  const parked = `${leaseDir}.release-${crypto.randomBytes(6).toString('hex')}`;
  try { fs.renameSync(leaseDir, parked); }
  catch { return false; /* raced: someone parked or released it first */ }
  if (onParked) onParked(parked);
  const inside = readLease({ leaseDir: parked });
  if (!inside || inside.token !== token) {
    // We parked a claim that is not (or no longer) ours — a takeover landed
    // between our read and our rename. Hand it straight back.
    try {
      fs.renameSync(parked, leaseDir);
      warn(`[foreman] release raced a takeover; restored run ${inside?.runId ?? '(mid-write)'}'s claim untouched.`);
    } catch {
      warn(`[foreman] release raced TWO takeovers; run ${inside?.runId ?? '(mid-write)'}'s parked claim could not be restored — the machine may be double-booked.`);
      try { fs.rmSync(parked, { recursive: true, force: true }); } catch { /* parked aside; nothing more to do safely */ }
    }
    return false;
  }
  try { fs.rmSync(parked, { recursive: true, force: true }); } catch { /* parked out of the slot; that is a release */ }
  return true;
}

/**
 * Preflight + lease acquisition. Returns a run handle.
 * `allowBusy` never silently softens anything: it proceeds AND marks the run
 * contaminated, so the override is visible in every artefact downstream.
 */
export async function beginRun({
  runId, tier = 'full', owner = `pid:${process.pid}`, allowBusy = false,
  leaseDir = LEASE_DIR, repoRoot = ROOT, log = console.log, warn = console.error,
  // Injectable so the refusal can be tested without spawning rival suites. A
  // gate nothing can exercise is a gate nobody knows the shape of.
  list = listJsProcesses, selfPid = process.pid, telemetry = true,
  // A token inherited from a parent run (cold-ci). Present means: adopt that
  // claim, do not acquire a second one, and do not release it on the way out.
  inheritToken = process.env[TOKEN_ENV] || null,
  // Injectable so a test can watch a heartbeat actually advance while an
  // awaited child runs, without waiting 15 real seconds for the first touch.
  heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS,
  telemetryIntervalMs = TELEMETRY_INTERVAL_MS,
} = {}) {
  const processes = classify(await list(), { repoRoot, selfPid });
  const self = processes.find(p => p.pid === selfPid);

  if (inheritToken) {
    const held = readLease({ leaseDir });
    if (held?.token === inheritToken) {
      log(`[foreman] adopting the parent run's lease (run ${held.runId}, tier ${held.tier})`
        + `${held.contaminated ? ' — CONTAMINATED' : ''}`);
      return {
        runId: held.runId, tier: held.tier, contaminated: held.contaminated === true,
        adopted: true, token: null, leaseDir, rootPid: selfPid, telemetryPath: null,
        telemetryGaps: () => 0, telemetrySamples: () => 0, stop: () => {},
      };
    }
    // An inherited token that matches nothing is a broken handoff, not a
    // licence to grab the machine. Say so and acquire honestly below.
    warn('[foreman] inherited lease token does not match the current lease; acquiring our own.');
  }

  const rivals = processes.filter(p => p.kind === 'other-checkout');
  const token = crypto.randomUUID();
  const startedIso = new Date().toISOString();
  const describe = contaminated => () => ({
    runId, tier, owner, token, contaminated,
    rootPid: selfPid,
    rootStartedIso: self?.startedIso ?? null,
    checkout: repoRoot,
    startedIso,
    heartbeatIso: new Date().toISOString(),
    blockers: [],
  });

  const claim = acquireLease({ leaseDir, describe: describe(false), processes, log });
  const blockers = rivals.map(r => `another checkout's worker: pid ${r.pid} — ${r.cmd.slice(0, 90)}`);
  if (!claim.acquired) {
    blockers.push(`machine lease ${claim.liveness.reason}`
      + `${claim.lease ? ` (run ${claim.lease.runId}, tier ${claim.lease.tier})` : ''}`);
  }

  if (blockers.length && !allowBusy) {
    if (claim.acquired) releaseLease({ leaseDir, token, warn: () => {} });
    warn('[foreman] REFUSING to start — the machine is not clear:');
    for (const line of blockers) warn(`  - ${line}`);
    warn('[foreman] A run started now does not report an error, it reports NUMBERS.');
    warn('[foreman] Re-run when clear, or pass --allow-busy to accept a contaminated result.');
    const error = new Error('foreman refused: machine busy');
    error.blockers = blockers;
    throw error;
  }

  const contaminated = blockers.length > 0;
  if (contaminated) {
    warn('[foreman] --allow-busy: starting on a BUSY machine. This run is stamped CONTAMINATED:');
    for (const line of blockers) warn(`  - ${line}`);
  }
  // Only the holder rewrites the description. If we are running contaminated
  // BECAUSE someone else holds the lease, we never held it and must not write.
  const holding = claim.acquired;
  if (holding) {
    const record = describe(contaminated)();
    record.blockers = blockers;
    writeJson(leaseFileIn(leaseDir), record);
  }
  log(`[foreman] ${holding ? 'lease acquired' : 'running WITHOUT the lease'}`
    + ` — run ${runId}, tier ${tier}, root pid ${selfPid}${contaminated ? ' (CONTAMINATED)' : ''}`);

  const base = {
    runId, tier, contaminated, adopted: false, leaseDir, rootPid: selfPid,
    token: holding ? token : null,
  };
  if (!telemetry) {
    return {
      ...base, telemetryPath: null, telemetryGaps: () => 0, telemetrySamples: () => 0,
      stop: () => {},
    };
  }

  // Telemetry + heartbeat share one timer. Two timers would be two things to
  // forget to stop.
  const telemetryPath = path.join(repoRoot, '.local-evidence', `host-telemetry-${runId}.jsonl`);
  fs.mkdirSync(path.dirname(telemetryPath), { recursive: true });
  fs.writeFileSync(telemetryPath, '');
  let previousCpus = os.cpus();
  let ticks = 0;
  let gaps = 0;
  let lastHeartbeat = Date.now();
  const timer = setInterval(async () => {
    // Heartbeat FIRST, and synchronously: it is the liveness signal, and a
    // liveness signal queued behind an awaited process scan (1–3 s of
    // tasklist on this host) inherits the sampler's latency — the first
    // heartbeat used to arrive only after the first scan came home.
    if (holding && Date.now() - lastHeartbeat >= heartbeatIntervalMs) {
      lastHeartbeat = Date.now();
      if (!touchLease({ leaseDir, token })) {
        warn('[foreman] lost the lease (another run holds it now); this run is no longer clean.');
      }
    }
    // Count at ENTRY, not after the awaited sample: counted-at-completion,
    // every callback dispatched while the first process scan was still in
    // flight saw ticks === 0 and launched ANOTHER full scan — a sampler
    // storm exactly when the machine was already slow to answer.
    const tick = ticks++;
    try {
      const { sample, cpus } = await sampleHost({
        previousCpus, withProcesses: tick % TELEMETRY_PROCESS_SCAN_EVERY === 0,
      });
      previousCpus = cpus;
      if (sample.top_error) gaps++;
      fs.appendFileSync(telemetryPath, JSON.stringify({ ...sample, run: runId }) + '\n');
    } catch (error) {
      // A telemetry gap must LOOK like a gap. Dropping the line entirely would
      // make a failed sampler indistinguishable from an idle machine.
      gaps++;
      try { fs.appendFileSync(telemetryPath, JSON.stringify({ t: new Date().toISOString(), sample_error: error.message, run: runId }) + '\n'); }
      catch { /* the disk is the problem; do not compound it */ }
    }
  }, telemetryIntervalMs);
  timer.unref?.();

  return {
    ...base, telemetryPath,
    telemetryGaps: () => gaps,
    telemetrySamples: () => ticks,
    stop: () => { clearInterval(timer); },
  };
}

/**
 * Postflight: verify the owned tree is gone, kill what is not, re-verify.
 * Returns {clean, survivors, killed}. Never touches a process outside the tree
 * rooted at `rootPid` — a tool that reaps other people's work is a worse defect
 * than the leak it is chasing.
 */
export async function postflight({
  rootPid, kill = true, settleMs = 1500, killer = null, log = console.log, warn = console.error,
  list = listJsProcesses,
} = {}) {
  const scan = async () => descendantsOf(await list(), rootPid);
  await new Promise(resolve => setTimeout(resolve, settleMs));
  let survivors = await scan();
  const killed = [];
  if (survivors.length && kill) {
    warn(`[foreman] ${survivors.length} descendant(s) outlived the run — terminating the OWNED tree:`);
    for (const p of survivors) {
      warn(`  - pid ${p.pid} (ppid ${p.ppid}) ${p.cmd.slice(0, 80)}`);
      try {
        if (killer) await killer(p.pid);
        else process.kill(p.pid, 'SIGKILL');
        killed.push(p.pid);
      } catch (error) {
        warn(`    could not terminate ${p.pid}: ${error.message}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, settleMs));
    survivors = await scan();
  }
  if (!survivors.length) {
    log(`[foreman] postflight clean — no descendant of ${rootPid} survives`
      + `${killed.length ? ` (terminated ${killed.length})` : ''}`);
    return { clean: true, survivors: [], killed };
  }
  warn(`[foreman] POSTFLIGHT FAIL — ${survivors.length} process(es) survived termination:`);
  for (const p of survivors) warn(`  - pid ${p.pid} ${p.cmd.slice(0, 90)}`);
  return { clean: false, survivors, killed };
}

/** Stop telemetry and release the claim — but only the claim we actually hold.
 *  An adopted run releases nothing: its parent owns the lease. */
export function endRun(handle, { leaseDir = handle?.leaseDir || LEASE_DIR, warn } = {}) {
  handle?.stop?.();
  if (!handle?.token) return false;
  return releaseLease({ leaseDir, token: handle.token, ...(warn ? { warn } : {}) });
}
