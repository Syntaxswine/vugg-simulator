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
 *               working copies are two directories and one CPU. It lives beside
 *               the user's temp dir so every checkout on the host shares it.
 *
 *   telemetry   host sampling started and stopped WITH the run, its receipt
 *               keyed to the run's identity hash so a profile and the machine
 *               state behind it can never drift apart. Sampling runs in-process:
 *               a hygiene subsystem that spawns its own long-lived child is one
 *               crash away from being the leak it was built to catch.
 *
 *   postflight  verify the owned tree is gone; kill what remains, because we
 *               own it; re-verify; and report a survivor as a failure. Killing
 *               is scoped to OUR root's descendants and nothing else, ever.
 *
 * STALE LEASES ARE DIAGNOSED, NOT TRUSTED AND NOT BULLDOZED. A lease is live
 * only if its recorded (pid, startedIso) still matches a running process AND
 * its heartbeat is fresh. PIDs are recycled, so the start time is load-bearing:
 * a lease naming only a PID is one reuse away from a stranger vouching for a
 * run that ended hours ago.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, descendantsOf, listJsProcesses } from './process-census.mjs';
import { sampleHost } from './host-sampler.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Machine-wide, deliberately OUTSIDE any checkout. See the header. */
export const LEASE_PATH = path.join(os.tmpdir(), 'vugg-foreman', 'run-lease.json');
/** A heartbeat older than this means the holder is gone or wedged. */
export const HEARTBEAT_STALE_MS = 90_000;
/** Heartbeat cadence. Must be far below HEARTBEAT_STALE_MS, and far below a
 *  single batch's worst case (900 s) — a per-batch heartbeat would make a
 *  healthy 15-minute file look like an abandoned run. */
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const TELEMETRY_INTERVAL_MS = 1000;
export const TELEMETRY_PROCESS_SCAN_EVERY = 10;

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
};

export function readLease({ leasePath = LEASE_PATH } = {}) {
  try { return JSON.parse(fs.readFileSync(leasePath, 'utf8')); }
  catch { return null; }
}

/**
 * Is a lease still held? Returns {live, reason} — never a bare boolean, because
 * "the holder died" and "the holder is working" must be distinguishable in the
 * message a blocked agent reads.
 */
export function leaseLiveness(lease, processes, now = Date.now()) {
  if (!lease) return { live: false, reason: 'no lease' };
  const holder = processes.find(p => p.pid === lease.rootPid);
  if (!holder) return { live: false, reason: `holder pid ${lease.rootPid} is gone` };
  if (lease.rootStartedIso && holder.startedIso && holder.startedIso !== lease.rootStartedIso) {
    // The PID was recycled. Without this check a stranger's process would
    // vouch for a run that ended hours ago and block every future run.
    return { live: false, reason: `pid ${lease.rootPid} was RECYCLED (started ${holder.startedIso}, lease says ${lease.rootStartedIso})` };
  }
  const age = now - Date.parse(lease.heartbeatIso || 0);
  if (!Number.isFinite(age)) return { live: false, reason: 'heartbeat unreadable' };
  if (age > HEARTBEAT_STALE_MS) {
    return { live: false, reason: `heartbeat is ${Math.round(age / 1000)} s old (stale after ${HEARTBEAT_STALE_MS / 1000} s)` };
  }
  return { live: true, reason: `held by ${lease.owner} since ${lease.startedIso}` };
}

/**
 * Preflight + lease acquisition. Returns a run handle.
 * `allowBusy` never silently softens anything: it proceeds AND marks the run
 * contaminated, so the override is visible in every artefact downstream.
 */
export async function beginRun({
  runId, tier = 'full', owner = `pid:${process.pid}`, allowBusy = false,
  leasePath = LEASE_PATH, repoRoot = ROOT, log = console.log, warn = console.error,
  // Injectable so the refusal can be tested without spawning rival suites. A
  // gate nothing can exercise is a gate nobody knows the shape of.
  list = listJsProcesses, selfPid = process.pid, telemetry = true,
} = {}) {
  const processes = classify(await list(), { repoRoot, selfPid });
  const rivals = processes.filter(p => p.kind === 'other-checkout');
  const lease = readLease({ leasePath });
  const liveness = leaseLiveness(lease, processes);

  const blockers = [];
  for (const rival of rivals) blockers.push(`another checkout's worker: pid ${rival.pid} — ${rival.cmd.slice(0, 90)}`);
  if (liveness.live) blockers.push(`machine lease ${liveness.reason} (run ${lease.runId}, tier ${lease.tier})`);
  if (lease && !liveness.live) {
    // Diagnosed out loud, then taken over. Silence here would make a normal
    // takeover indistinguishable from stomping a live run.
    log(`[foreman] stale lease from run ${lease.runId} — ${liveness.reason}; taking over`);
  }

  let contaminated = false;
  if (blockers.length) {
    if (!allowBusy) {
      warn('[foreman] REFUSING to start — the machine is not clear:');
      for (const line of blockers) warn(`  - ${line}`);
      warn('[foreman] A run started now does not report an error, it reports NUMBERS.');
      warn('[foreman] Re-run when clear, or pass --allow-busy to accept a contaminated result.');
      const error = new Error('foreman refused: machine busy');
      error.blockers = blockers;
      throw error;
    }
    contaminated = true;
    warn('[foreman] --allow-busy: starting on a BUSY machine. This run is stamped CONTAMINATED:');
    for (const line of blockers) warn(`  - ${line}`);
  }

  const self = processes.find(p => p.pid === selfPid);
  const startedIso = new Date().toISOString();
  const held = {
    runId, tier, owner, contaminated,
    rootPid: selfPid,
    rootStartedIso: self?.startedIso ?? null,
    checkout: repoRoot,
    startedIso,
    heartbeatIso: startedIso,
    blockers,
  };
  writeJson(leasePath, held);
  log(`[foreman] lease acquired — run ${runId}, tier ${tier}, root pid ${selfPid}`
    + `${contaminated ? ' (CONTAMINATED)' : ''}`);
  if (!telemetry) {
    return {
      runId, tier, contaminated, leasePath, rootPid: selfPid, telemetryPath: null,
      telemetryGaps: () => 0, telemetrySamples: () => 0, stop: () => {},
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
    try {
      const { sample, cpus } = await sampleHost({
        previousCpus, withProcesses: ticks % TELEMETRY_PROCESS_SCAN_EVERY === 0,
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
    ticks++;
    if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = Date.now();
      held.heartbeatIso = new Date().toISOString();
      try { writeJson(leasePath, held); } catch { /* heartbeat is best-effort */ }
    }
  }, TELEMETRY_INTERVAL_MS);
  timer.unref?.();

  return {
    runId, tier, contaminated, telemetryPath, leasePath, rootPid: selfPid,
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

export function endRun(handle, { leasePath = LEASE_PATH } = {}) {
  handle?.stop?.();
  try { fs.unlinkSync(leasePath); } catch { /* already released or never held */ }
}
