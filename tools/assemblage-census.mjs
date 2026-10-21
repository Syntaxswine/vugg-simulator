#!/usr/bin/env node
/**
 * tools/assemblage-census.mjs — the multi-seed ASSEMBLAGE census (locality-abundance review,
 * 2026-10-21).
 *
 * The question it answers: "of the crystals a collector would find in this vug, how many are of
 * each species?" — per scenario, averaged over a seed panel, so a ratio is a property of the
 * scenario and not of seed 42. The seed-42 baseline (tests-js/baselines/seed42_v*.json) already
 * counts crystals per species, but one seed cannot carry a ratio: most species fire 0–6 times
 * per run, and one seed's draw is noise at that count.
 *
 * Per (scenario, seed) it runs the scenario for its authored duration and records, per species,
 * the END-STATE inventory:
 *   n_total      every crystal ever nucleated
 *   n_surv       not dissolved (a solid that exists at the end; enclosed crystals count — they
 *                are inside another crystal, still in the specimen)
 *   n_dis        dissolved to nothing
 *   n_encl       surviving but enclosed by another crystal
 *   n_01 n_1 n_5 n_10   surviving with longest dimension ≥ 0.1 / 1 / 5 / 10 mm
 *                (micromount / eye-visible / thumbnail crystal / cabinet crystal)
 *   n_01_exp n_1_exp    the same ≥ 0.1 / 1 mm counts for EXPOSED survivors only (not enclosed
 *                by another crystal) — what a collector can see on the specimen's surface
 *   vol_mm3      summed solid volume of the survivors (Crystal._volume_mm3)
 *   vol_exp_mm3  the same for exposed survivors
 *   max_mm       largest survivor's longest dimension
 *   max_exp_mm   largest exposed survivor's longest dimension
 *
 * Each row carries `census: CENSUS_VERSION`; version 2 added the exposed counts (review round 3
 * found that 9–14 % of the ≥ 1 mm crystals in the locality scenarios sit inside another crystal).
 *
 * The longest dimension is max(c_length_mm, a_width_mm, total_growth_um / 1000): the renderer's
 * c/a and the growth ledger's c-advance can differ by habit, and a collector sees the larger.
 *
 * PASSIVE instrument: reads, writes .local-evidence/assemblage-census/, exits 0. The directory is
 * the one the identity guard excludes, so running it never disturbs a test run's identity hash.
 *
 * Usage:
 *   node tools/assemblage-census.mjs                          # all scenarios, seeds 1-20
 *   node tools/assemblage-census.mjs --seeds 1-5,42 --workers 8
 *   node tools/assemblage-census.mjs --scenarios elmwood,mvt
 *
 * Runs are independent, so the driver forks --workers child processes and hands each
 * (scenario, seed) job to whichever worker is free; a worker loads the bundle once. The default is
 * ONE worker (serial), per AGENTS.md "Workstation safety". A full panel (41 scenarios × 21 seeds,
 * 861 runs) ran on an otherwise idle 16-core box on 2026-10-21: census version 1 with --workers 14
 * (857 runs in one 43-min pass), version 2 with --workers 12 in 35.7 min. Every field the two
 * versions share came out identical in all 861 runs. Serially, budget several hours;
 * supergene_oxidation (≈ 430 s per run under that load), tn457_barite_pulses (≈ 380 s) and bisbee
 * (≈ 150 s) dominate.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, '.local-evidence', 'assemblage-census');
const SIZE_EDGES_MM = [0.1, 1, 5, 10];
const CENSUS_VERSION = 2;

function parseSeeds(text) {
  const seeds = new Set();
  for (const part of String(text).split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`bad --seeds part: ${part}`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let s = a; s <= b; s++) seeds.add(s);
  }
  return [...seeds].sort((x, y) => x - y);
}

function longestMm(c) {
  return Math.max(Number(c.c_length_mm) || 0, Number(c.a_width_mm) || 0,
    (Number(c.total_growth_um) || 0) / 1000);
}

function summarize(sim) {
  const per = {};
  for (const c of sim.crystals || []) {
    const r = (per[c.mineral] ||= { n_total: 0, n_surv: 0, n_dis: 0, n_encl: 0,
      n_01: 0, n_1: 0, n_5: 0, n_10: 0, n_01_exp: 0, n_1_exp: 0,
      vol_mm3: 0, vol_exp_mm3: 0, max_mm: 0, max_exp_mm: 0 });
    r.n_total++;
    if (c.dissolved) { r.n_dis++; continue; }
    r.n_surv++;
    const enclosed = c.enclosed_by != null;
    if (enclosed) r.n_encl++;
    const L = longestMm(c);
    if (L >= SIZE_EDGES_MM[0]) { r.n_01++; if (!enclosed) r.n_01_exp++; }
    if (L >= SIZE_EDGES_MM[1]) { r.n_1++; if (!enclosed) r.n_1_exp++; }
    if (L >= SIZE_EDGES_MM[2]) r.n_5++;
    if (L >= SIZE_EDGES_MM[3]) r.n_10++;
    const v = Number(c._volume_mm3);
    if (Number.isFinite(v) && v > 0) { r.vol_mm3 += v; if (!enclosed) r.vol_exp_mm3 += v; }
    if (L > r.max_mm) r.max_mm = L;
    if (!enclosed && L > r.max_exp_mm) r.max_exp_mm = L;
  }
  for (const r of Object.values(per)) {
    r.vol_mm3 = +r.vol_mm3.toPrecision(6);
    r.vol_exp_mm3 = +r.vol_exp_mm3.toPrecision(6);
    r.max_mm = +r.max_mm.toFixed(4);
    r.max_exp_mm = +r.max_exp_mm.toFixed(4);
  }
  return Object.fromEntries(Object.entries(per).sort(([a], [b]) => a.localeCompare(b)));
}

// ---------------------------------------------------------------- worker
if (process.env.ASSEMBLAGE_CENSUS_WORKER === '1') {
  const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
  const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } =
    await h.loadSimBundle({ toolName: 'assemblage-census' });
  process.on('message', (job) => {
    if (job === 'exit') process.exit(0);
    const t0 = Date.now();
    try {
      setSeed(job.seed);
      const s = SCENARIOS[job.scenario]();
      const sim = new VugSimulator(s.conditions, s.events);
      const steps = s.defaultSteps ?? 100;
      for (let i = 0; i < steps; i++) sim.run_step();
      process.send({ ok: true, ...job, sim_version: SIM_VERSION, census: CENSUS_VERSION, steps,
        ms: Date.now() - t0, species: summarize(sim) });
    } catch (e) {
      // An instrument must refuse rather than guess: report the failure, never a fabricated row.
      process.send({ ok: false, ...job, ms: Date.now() - t0, error: String(e?.stack || e) });
    }
  });
  process.send({ ready: true, scenarios: Object.keys(SCENARIOS), sim_version: SIM_VERSION });
} else {
  // -------------------------------------------------------------- driver
  const args = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : dflt;
  };
  const seeds = parseSeeds(opt('--seeds', '1-20'));
  const workers = Math.max(1, Math.min(os.cpus().length, Number(opt('--workers', 1))));
  const only = opt('--scenarios', '');
  fs.mkdirSync(OUT, { recursive: true });
  const runsPath = path.join(OUT, 'runs.jsonl');

  // Resume: a (scenario, seed, sim_version) row of this census version already on disk is not
  // re-run. A row from an older census version lacks fields, so the file must be moved aside.
  const done = new Set();
  if (fs.existsSync(runsPath)) {
    for (const line of fs.readFileSync(runsPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      if ((r.census ?? 1) !== CENSUS_VERSION) {
        throw new Error(`${path.relative(ROOT, runsPath)} holds census-version ${r.census ?? 1} rows; move it aside before a version-${CENSUS_VERSION} run`);
      }
      if (r.ok) done.add(`${r.scenario}|${r.seed}|${r.sim_version}`);
    }
  }

  const pool = [];
  let scenarioList = null;
  let simVersion = null;
  const jobs = [];
  let next = 0;
  let finished = 0;
  let failed = 0;
  const t0 = Date.now();

  // Long runs first so the tail is short (measured at SIM 285, seed 42: tn457_barite_pulses
  // 251 s, elmwood 27 s, mvt 18 s; bisbee and roughten_gill are the known heavy runs).
  const COST_HINT = { tn457_barite_pulses: 12, bisbee: 10, roughten_gill: 8, schneeberg: 4,
    supergene_oxidation: 4, searles_lake: 3, sabkha_dolomitization: 3, naica_geothermal: 3,
    elmwood: 2 };

  function dispatch(w) {
    if (next >= jobs.length) { w.child.send('exit'); return; }
    const job = jobs[next++];
    w.busy = job;
    w.child.send(job);
  }

  await new Promise((resolve) => {
    let ready = 0;
    for (let i = 0; i < workers; i++) {
      const child = fork(fileURLToPath(import.meta.url), [], {
        env: { ...process.env, ASSEMBLAGE_CENSUS_WORKER: '1' },
        stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      });
      const w = { child, busy: null };
      pool.push(w);
      child.on('message', (msg) => {
        if (msg.ready) {
          if (!scenarioList) {
            scenarioList = msg.scenarios.slice().sort();
            simVersion = msg.sim_version;
            const want = only ? only.split(',').map((x) => x.trim()) : scenarioList;
            for (const sc of want) {
              if (!scenarioList.includes(sc)) throw new Error(`unknown scenario ${sc}`);
              for (const seed of seeds) jobs.push({ scenario: sc, seed });
            }
            jobs.sort((a, b) => (COST_HINT[b.scenario] || 1) - (COST_HINT[a.scenario] || 1));
          }
          ready++;
          if (ready === workers) resolve();
          return;
        }
        fs.appendFileSync(runsPath, JSON.stringify(msg) + '\n');
        finished++;
        if (!msg.ok) failed++;
        if (finished % 25 === 0 || !msg.ok) {
          const el = ((Date.now() - t0) / 60000).toFixed(1);
          console.log(`  ${finished}/${jobs.length} runs (${failed} failed), ${el} min`
            + (msg.ok ? '' : `  FAILED ${msg.scenario}@${msg.seed}: ${msg.error.split('\n')[0]}`));
        }
        dispatch(w);
      });
      child.on('exit', () => { w.exited = true; });
    }
  });

  // Skip rows already on disk for THIS SIM_VERSION (reported by the workers' ready message);
  // a row from another version is stale and runs again.
  const remaining = jobs.filter((j) => !done.has(`${j.scenario}|${j.seed}|${simVersion}`));
  jobs.length = 0;
  jobs.push(...remaining);
  console.log(`assemblage census: ${jobs.length} runs to do (${done.size} on disk), ${workers} workers, seeds ${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length})`);
  for (const w of pool) dispatch(w);
  await new Promise((resolve) => {
    const iv = setInterval(() => {
      if (pool.every((w) => w.exited)) { clearInterval(iv); resolve(); }
    }, 250);
  });
  console.log(`done: ${finished} runs, ${failed} failed, ${((Date.now() - t0) / 60000).toFixed(1)} min → ${path.relative(ROOT, runsPath)}`);
  process.exit(0);
}
