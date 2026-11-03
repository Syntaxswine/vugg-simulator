// Stage B preflight gate for an inverse-design target: does a candidate target
// deserve an overnight optimizer comparison? Serial, one low-priority process,
// about 95 runs a candidate plus about 90 more for one that reaches G4. From a
// built checkout:
//
//   node tools/inverse-preflight.mjs [--candidates file] [--only id,id] [--out dir]
//                                    [--repo dir] [--seeds A,B] [--g4-diagnostic]
//
// --candidates: a dated candidates file, written before any of its runs
//   (default: the 2026-11-03 batch).
// --repo: the built checkout whose simulator runs (default: this checkout).
// --out: default experiments/inverse-design/preflight/<candidates file name>
//   under this tool's checkout (gitignored), so pointing --repo at another
//   checkout never writes into it. runs.jsonl there is a checkpoint: a rerun
//   reuses a logged run only when the batch fingerprint matches, a hash of
//   this tool's source, the lib's, the candidates file's, the --repo's
//   tools/_harness.mjs, data/ and dist/, its jsdom version, SIM_VERSION and
//   the Node version. Any edit to any of them re-runs everything. G0 and
//   errored runs are never reused.
// --seeds: seed A and seed B (default 101,102). A borderline pass is re-run
//   with two new seeds before Stage B is armed.
// --g4-diagnostic: run G4 after a G1 or G5 failure too, labelled; the verdict
//   is FAIL either way.
//
// For each candidate:
//   G0  the scenario's seed-42 row reproduces tests-js/baselines (platform)
//   G1  each input at its low and high bound, the rest authored, traced step
//       by step at each cell where the target grows: alive while it keeps 10%
//       of its starting gap there; it survives if at least half the target's
//       growth (weighted by cell) happens while it is alive. >= 3 must survive.
//   G2  a 64-point Sobol sample of the whole box on seed A, the first 16 also
//       on seed B; every input spans its range and at most 1 run errors
//   G3  the phenotype occurs: >= 1 recipe scores >= 0.5 on both seeds
//   G5  rarity and headroom: <= 10% of the sample scores >= 0.5, and the
//       sample's best is <= 0.75, so a better method has room to show it
//   G4  last, only for a candidate that passed the rest: profiles and a grid
//       around the best confirmed recipe (tools/inverse-preflight-lib.mjs)
// PASS needs all six. The verdict is a report; nothing is blocked or refused.
// The design, its history and the 2026-11-03 results are in
// proposals/PROPOSAL-INVERSE-DESIGN-OVERNIGHT-PILOT-2026-10-31.md.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { G4, measureG4, sobol, sobolSelfTest } from './inverse-preflight-lib.mjs';

const GATE = {
  N: 64, N_REPEAT: 16, TAU: 0.5,
  SURVIVE_FRACTION: 0.10, SURVIVE_GROWTH: 0.50, MIN_SURVIVING: 3,
  MAX_ERRORS: 1,
  MAX_HIT_RATE: 0.10, MAX_BEST: 0.75,
  BINS: 4,
  BORDER: 0.10,            // a passing value within 10% of its threshold is borderline
  G4,
};

// ---------- args ----------
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(arg('--repo', path.join(TOOLS, '..')));
const CANDIDATES_FILE = path.resolve(arg('--candidates', path.join(TOOLS, 'inverse-preflight-candidates-2026-11-03.mjs')));
const OUT = path.resolve(arg('--out', path.join(TOOLS, '..', 'experiments', 'inverse-design', 'preflight', path.basename(CANDIDATES_FILE, '.mjs'))));
const ONLY = arg('--only', null)?.split(',');
const G4_DIAGNOSTIC = argv.includes('--g4-diagnostic');
const [SEED_A, SEED_B] = arg('--seeds', '101,102').split(',').map(Number);
if (!(Number.isInteger(SEED_A) && Number.isInteger(SEED_B) && SEED_A !== SEED_B)) throw new Error('--seeds takes two different integers, e.g. 101,102');
const { CANDIDATES } = await import(pathToFileURL(CANDIDATES_FILE).href);
fs.mkdirSync(OUT, { recursive: true });
try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* best effort */ }

// ---------- the simulator ----------
const { loadSimBundle } = await import(pathToFileURL(path.join(REPO, 'tools/_harness.mjs')).href);
const api = await loadSimBundle({ toolName: 'inverse-preflight' });
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } = api;
const BASELINE = JSON.parse(fs.readFileSync(path.join(REPO, `tests-js/baselines/seed42_v${SIM_VERSION}.json`), 'utf8'));

// A directory tree, hashed path by path and byte by byte.
function treeHash(dir) {
  const h = crypto.createHash('sha256');
  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort(byName)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { h.update(path.relative(dir, p).split(path.sep).join('/')); h.update(fs.readFileSync(p)); }
    }
  };
  walk(dir);
  return h.digest('hex');
}
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
// What a logged run depends on. data/ is read at run time by the harness, not
// compiled into dist/; the harness defines setSeed, the data fetch and which
// dist files load; the candidates file carries its closures' constants
// (SEARLES_LAST_EVENT); the tool and lib carry the run, score and Sobol code.
// Not covered: the rest of node_modules beyond jsdom's version, and the OS.
const jsdomPkg = path.join(REPO, 'node_modules', 'jsdom', 'package.json');
const HASHES = {
  tool: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  lib: sha(fs.readFileSync(path.join(TOOLS, 'inverse-preflight-lib.mjs'))),
  candidates: sha(fs.readFileSync(CANDIDATES_FILE)),
  harness: sha(fs.readFileSync(path.join(REPO, 'tools', '_harness.mjs'))),
  data: fs.existsSync(path.join(REPO, 'data')) ? treeHash(path.join(REPO, 'data')) : 'no-data',
  dist: fs.existsSync(path.join(REPO, 'dist')) ? treeHash(path.join(REPO, 'dist')) : 'no-dist',
  jsdom: fs.existsSync(jsdomPkg) ? JSON.parse(fs.readFileSync(jsdomPkg, 'utf8')).version : 'absent',
  sim_version: String(SIM_VERSION),
  node: process.version,
};
const BATCH_FP = sha(JSON.stringify(HASHES)).slice(0, 12);

// VERBATIM from the canary's src/run.mjs (itself verbatim from gen-js-baseline).
function summarize(sim) {
  const out = {};
  if (!sim || !sim.crystals) return out;
  for (const c of sim.crystals) {
    if (!out[c.mineral]) out[c.mineral] = { active: 0, dissolved: 0, total: 0, max_um: 0 };
    out[c.mineral].total++;
    if (c.dissolved) out[c.mineral].dissolved++;
    else out[c.mineral].active++;
    if (c.total_growth_um > out[c.mineral].max_um) out[c.mineral].max_um = Math.round(c.total_growth_um * 10) / 10;
  }
  const sorted = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted;
}

const fromUnit = (inp, u) => (inp.scale === 'log' ? inp.lo * (inp.hi / inp.lo) ** u : inp.lo + u * (inp.hi - inp.lo));

function buildScenario(cand) {
  return cand.build ? cand.build(SCENARIOS) : SCENARIOS[cand.scenario]();
}
function authoredValues(cand) {
  setSeed(SEED_A);
  const s = buildScenario(cand);
  const v = {};
  for (const inp of cand.inputs) {
    if (cand.authored && inp.name in cand.authored) v[inp.name] = cand.authored[inp.name];
    else if (inp.kind === 'fluid-mult') v[inp.name] = 1.0;
    else if (inp.kind === 'temperature') v[inp.name] = s.conditions.temperature;
    else if (inp.kind === 'fluid-abs') v[inp.name] = s.conditions.fluid[inp.field];
    else throw new Error(`${cand.id}: no authored value for ${inp.name}`);
  }
  return v;
}
function applyInputs(s, cand, v) {
  for (const inp of cand.inputs) {
    const x = v[inp.name];
    if (inp.kind === 'fluid-mult') for (const f of inp.fields) s.conditions.fluid[f] *= x;
    else if (inp.kind === 'fluid-abs') s.conditions.fluid[inp.field] = x;
    else if (inp.kind === 'temperature') s.conditions.temperature = x;
    // 'hold' is a schedule input, read by cand.steps
  }
}

// The mesh cell a crystal's chemistry is read from, or null without a mesh.
function cellOf(sim, c) {
  try {
    const anchor = sim.wall_state?._resolveAnchor?.(c);
    const v = anchor ? sim.wall_state.chemistryVertexForCrystal?.(c) : -1;
    return Number.isInteger(v) && v >= 0 ? v : null;
  } catch { return null; }
}
// The target's positive growth per host cell and step: Map(cell -> [µm by step]).
// A crystal without a cell counts under 'bulk', read from the bulk fluid.
function growthByCell(sim, cand, steps) {
  const g = new Map();
  for (const c of sim.crystals) {
    if (c.mineral !== cand.mineral) continue;
    const v = cellOf(sim, c);
    const key = v == null ? 'bulk' : v;
    if (!g.has(key)) g.set(key, new Array(steps + 1).fill(0));
    const arr = g.get(key);
    for (const z of c.zones || []) {
      const t = Number(z.thickness_um) || 0;
      if (t > 0 && z.step >= 0 && z.step <= steps) arr[z.step] += t;
    }
  }
  return g;
}
function fluidAtCell(sim, key) {
  if (key === 'bulk') return sim.conditions.fluid;
  return sim.wall_state?.meshFor?.(sim)?.cells?.[key]?.fluid ?? null;
}
// The state an input sets, read at each host cell: [cell][field] (NaN if
// unreadable). Temperature is read from the bulk; growth reads the vertex
// temperature (temperatureAtMeshVertex), which equalled the bulk at every host
// cell of the 2026-11-03 batch. A scenario with ring temperatures would need
// the vertex reading.
function readInput(sim, inp, keys) {
  return keys.map((key) => {
    if (inp.kind === 'temperature') return [Number(sim.conditions.temperature)];
    const fl = fluidAtCell(sim, key);
    const fields = inp.kind === 'fluid-mult' ? inp.fields : [inp.field];
    return fields.map((f) => (fl ? Number(fl[f]) : NaN));
  });
}

// The repaired score. Free = still on the wall: not dissolved, not enclosed,
// larger than zero. Useful = free and at least L_min long. A crystal scores
// size x smooth: size rises on a log scale from 0 at L_min to 1 at L_target;
// smooth is the share of the crystal's REMAINING solid (each positive zone's
// _remaining_solid_um, as the simulator's own inventory reads it; its
// thickness if absent) whose layers were classified spiral_smooth.
// Unclassified layers count as not smooth. A run scores its best crystal, so
// dust scores 0 however much of it there is.
function remainingOf(z) {
  const r = Number(z._remaining_solid_um);
  return Number.isFinite(r) ? Math.max(0, r) : Math.max(0, Number(z.thickness_um) || 0);
}
function scoreRun(sim, cand) {
  const all = sim.crystals.filter((c) => c.mineral === cand.mineral);
  const free = all.filter((c) => c.active && !c.dissolved && c.enclosed_by == null && c.total_growth_um > 0);
  let best = null;
  let largest = null;
  for (const c of free) {
    const L = Number(c.c_length_mm) || 0;
    let solid = 0, smooth = 0;
    for (const z of c.zones || []) {
      if (!((Number(z.thickness_um) || 0) > 0)) continue;
      const r = remainingOf(z);
      solid += r;
      if (z.morph_regime === 'spiral_smooth') smooth += r;
    }
    const sm = solid > 0 ? smooth / solid : 0;
    if (!largest || L > largest.L) largest = { L, smooth: sm };
    if (L < cand.L_min) continue;
    const size = Math.min(1, Math.log(L / cand.L_min) / Math.log(cand.L_target / cand.L_min));
    const sc = size * sm;
    if (!best || sc > best.score) best = { score: sc, L, smooth: sm };
  }
  return {
    score: best ? best.score : 0,
    best_L: best ? best.L : 0, best_smooth: best ? best.smooth : 0,
    largest_free_L: largest ? largest.L : 0, largest_free_smooth: largest ? largest.smooth : 0,
    n_total: all.length, n_live: all.filter((c) => !c.dissolved).length, n_free: free.length,
    n_useful: free.filter((c) => (Number(c.c_length_mm) || 0) >= cand.L_min).length,
  };
}

function runOnce(cand, v, seed, { traceKeys = null } = {}) {
  const t0 = process.hrtime.bigint();
  let sim = null, s = null, steps = 0, states = null, error = null;
  try {
    setSeed(seed);
    s = buildScenario(cand);
    applyInputs(s, cand, v);
    steps = cand.steps ? cand.steps(s, v) : (s.defaultSteps ?? 100);
    sim = new VugSimulator(s.conditions, s.events);
    if (traceKeys) states = [cand.inputs.map((inp) => readInput(sim, inp, traceKeys))];
    for (let i = 0; i < steps; i++) {
      sim.run_step();
      if (states) states.push(cand.inputs.map((inp) => readInput(sim, inp, traceKeys)));
    }
  } catch (e) { error = String((e && e.stack) || e).slice(0, 2000); }
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  const r = error ? { score: 0, error } : scoreRun(sim, cand);
  return { ...r, seconds, steps, sim, states, events: s ? s.events : [] };
}

// ---------- checkpointed run log (keys carry BATCH_FP) ----------
const LOG = path.join(OUT, 'runs.jsonl');
const done = new Map();
let unreadable = 0;
if (fs.existsSync(LOG)) {
  for (const line of fs.readFileSync(LOG, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); done.set(r.key, r); } catch { unreadable++; }
  }
}
if (unreadable) console.warn(`[preflight] ${unreadable} unreadable line(s) in ${LOG} (a run cut off mid-write); those runs are redone`);
// A logged run that errored is not reused: an error may be the machine's (out
// of memory), and in G4 a reused error would block a pass for good.
function logged(key, fn, cost) {
  if (done.has(key) && !done.get(key).error) { cost.cached++; return done.get(key); }
  const row = { key, ...fn() };
  fs.appendFileSync(LOG, JSON.stringify(row) + '\n');
  done.set(key, row);
  cost.runs++;
  cost.seconds += row.seconds || 0;
  return row;
}
const strip = ({ sim, states, events, ...rest }) => rest;

// ---------- statistics ----------
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pvar = (a) => { const m = mean(a); return a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length; };
// Binned first-order shares of the sample (the first G4; description only now).
function firstOrderShares(U, y, Vt) {
  const N = y.length, B = GATE.BINS;
  return U[0].map((_, d) => {
    const bins = Array.from({ length: B }, () => []);
    U.forEach((u, i) => bins[Math.min(B - 1, Math.floor(u[d] * B))].push(y[i]));
    const m = mean(y);
    let vb = 0, ss = 0;
    for (const b of bins) { if (!b.length) continue; const mb = mean(b); vb += (b.length / N) * (mb - m) ** 2; ss += b.reduce((x, v) => x + (v - mb) ** 2, 0); }
    const vw = ss / (N - B);
    return Vt > 0 ? Math.max(0, vb - ((B - 1) / N) * vw) / Vt : 0;
  });
}
const near = (value, threshold, above) => (above ? value < threshold * (1 + GATE.BORDER) : value > threshold * (1 - GATE.BORDER));

// ---------- one candidate ----------
function preflight(cand) {
  const t0 = Date.now();
  const P = `${cand.id}#${BATCH_FP}`;
  const cost = { runs: 0, cached: 0, seconds: 0 };
  const direct = (r) => { cost.runs++; cost.seconds += r.seconds; return r; };
  const errors = { g0: 0, g1: 0, sample: 0, g3_confirm: 0, g4: 0 };
  const auth = authoredValues(cand);
  const names = cand.inputs.map((inp) => inp.name);

  // G0: the plain scenario at seed 42 against the committed baseline. Never
  // reused from the log: it is the check that the platform is the one the log
  // was made on.
  const g0 = direct((() => {
    const t = process.hrtime.bigint();
    try {
      setSeed(42);
      const s = SCENARIOS[cand.scenario]();
      const sim = new VugSimulator(s.conditions, s.events);
      for (let i = 0; i < (s.defaultSteps ?? 100); i++) sim.run_step();
      return { match: JSON.stringify(summarize(sim)) === JSON.stringify(BASELINE[cand.scenario]), seconds: Number(process.hrtime.bigint() - t) / 1e9 };
    } catch (e) {
      return { match: false, error: String(e).slice(0, 500), seconds: Number(process.hrtime.bigint() - t) / 1e9 };
    }
  })());
  if (g0.error) errors.g0++;

  // G1: where and when the target grows in the authored run, then each input
  // at its low and high bound, traced at those cells.
  const authRun = direct(runOnce(cand, auth, SEED_A));
  if (authRun.error) errors.g1++;
  const gCells = authRun.error ? new Map() : growthByCell(authRun.sim, cand, authRun.steps);
  const keys = [...gCells.keys()];
  const cellTotal = new Map(keys.map((k) => [k, gCells.get(k).reduce((a, b) => a + b, 0)]));
  const gTotal = [...cellTotal.values()].reduce((a, b) => a + b, 0);
  const evAt = new Map();
  for (const e of authRun.events) { if (!evAt.has(e.step)) evAt.set(e.step, []); evAt.get(e.step).push(e.type); }
  const mainCell = keys.reduce((a, k) => (a == null || cellTotal.get(k) > cellTotal.get(a) ? k : a), null);
  const survival = cand.inputs.map((inp, k) => {
    if (inp.kind === 'hold') return { input: inp.name, kind: 'schedule', survives: true, growth_alive: 1 };
    if (!keys.length) return { input: inp.name, survives: false, growth_alive: 0, note: 'the target never grew in the authored run' };
    const lo = direct(runOnce(cand, { ...auth, [inp.name]: inp.lo }, SEED_A, { traceKeys: keys }));
    const hi = direct(runOnce(cand, { ...auth, [inp.name]: inp.hi }, SEED_A, { traceKeys: keys }));
    if (lo.error || hi.error) { errors.g1++; return { input: inp.name, survives: false, growth_alive: 0, error: lo.error || hi.error }; }
    const n = Math.min(lo.states.length, hi.states.length);
    const nf = lo.states[0][k][0].length;
    const fields = [];
    for (let f = 0; f < nf; f++) {
      let ga = 0;
      const cells = [];
      keys.forEach((key, ci) => {
        const g = gCells.get(key);
        const gap = (t) => Math.abs(hi.states[t][k][ci][f] - lo.states[t][k][ci][f]);
        const d0 = gap(0);
        let aliveGrowth = 0, firstDead = null;
        const cuts = [];
        for (let t = 0; t < n; t++) {
          const d = gap(t);
          const alive = d0 > 0 && d >= GATE.SURVIVE_FRACTION * d0;
          if (alive && t < g.length) aliveGrowth += g[t];
          if (!alive && firstDead == null) firstDead = t;
          if (t > 0 && key === mainCell) {
            const dp = gap(t - 1);
            if (dp > 0 && d < 0.5 * dp) cuts.push({ step: t, kept: +(d / dp).toFixed(3), events: evAt.get(t) || [] });
          }
        }
        ga += aliveGrowth;
        cells.push({ cell: key, growth_share: +(cellTotal.get(key) / gTotal).toFixed(3), alive_share: cellTotal.get(key) > 0 ? +(aliveGrowth / cellTotal.get(key)).toFixed(3) : null, first_dead_step: firstDead, ...(key === mainCell ? { cuts: cuts.slice(0, 6) } : {}) });
      });
      fields.push({ field: inp.fields ? inp.fields[f] : (inp.field || 'T'), growth_alive: gTotal > 0 ? +(ga / gTotal).toFixed(3) : 0, cells });
    }
    const best = fields.reduce((a, b) => (b.growth_alive > a.growth_alive ? b : a));
    return { input: inp.name, survives: best.growth_alive >= GATE.SURVIVE_GROWTH, growth_alive: best.growth_alive, fields, score_low: lo.score, score_high: hi.score };
  });
  const nSurv = survival.filter((s) => s.survives).length;

  // G2: the Sobol sample, seed A for all 64, seed B for the first 16.
  const U = sobol(GATE.N, names.length);
  const recipe = (u) => Object.fromEntries(cand.inputs.map((inp, d) => [inp.name, fromUnit(inp, u[d])]));
  const runAt = (u, seed, tag) => logged(`${P}|${tag}|${seed}`, () => ({ u, v: recipe(u), ...strip(runOnce(cand, recipe(u), seed)) }), cost);
  const runs = U.map((u, i) => runAt(u, SEED_A, `sobol|${i}`));
  const yA = runs.map((r) => r.score);
  const repeats = U.slice(0, GATE.N_REPEAT).map((u, i) => runAt(u, SEED_B, `sobol|${i}`));
  errors.sample = [...runs, ...repeats].filter((r) => r.error).length;

  // G3: every seed-A hit is confirmed on seed B.
  const hitIdx = yA.map((y, i) => (y >= GATE.TAU ? i : -1)).filter((i) => i >= 0);
  const confirmRuns = hitIdx.map((i) => (i < GATE.N_REPEAT ? repeats[i] : runAt(U[i], SEED_B, `sobol|${i}`)));
  errors.g3_confirm = confirmRuns.filter((r, k) => hitIdx[k] >= GATE.N_REPEAT && r.error).length;
  const confirmed = hitIdx.filter((i, k) => confirmRuns[k].score >= GATE.TAU);
  const bestConfirm = confirmed.length ? Math.max(...confirmRuns.filter((r) => r.score >= GATE.TAU).map((r) => r.score)) : null;

  // The sample's variance: seed noise from the repeats, and the binned
  // first-order shares (the first G4; description only).
  const Vt = pvar(yA);
  const vSeed = repeats.reduce((a, r, i) => a + (yA[i] - r.score) ** 2, 0) / (2 * GATE.N_REPEAT);
  const S1 = firstOrderShares(U, yA, Vt);
  const noise = Vt > 0 ? vSeed / Vt : null;
  const hitRate = hitIdx.length / GATE.N;
  const bestA = Math.max(...yA);

  const gates = {
    G0_platform: g0.match === true,
    G1_survival: nSurv >= GATE.MIN_SURVIVING,
    G2_coverage: names.every((_, d) => Math.min(...U.map((u) => u[d])) === 0 && Math.max(...U.map((u) => u[d])) >= 1 - 2 / GATE.N) && errors.sample <= GATE.MAX_ERRORS,
    G3_exists: confirmed.length >= 1,
    G5_rarity: hitRate <= GATE.MAX_HIT_RATE && bestA <= GATE.MAX_BEST,
  };

  // G4, last and only for a candidate still standing. --g4-diagnostic also runs
  // it after a G1 or G5 failure, labelled; it always needs G0, G2 and a confirmed hit.
  const failedOf = (list) => list.filter((g) => !gates[g]);
  const blocking = failedOf(['G0_platform', 'G2_coverage', 'G3_exists']);
  const others = failedOf(['G1_survival', 'G5_rarity']);
  const skip = blocking.length ? blocking : (G4_DIAGNOSTIC ? [] : others);
  let g4 = { run: false, reason: `not run: ${skip.map((g) => g.split('_')[0]).join(', ')} failed` };
  if (!skip.length) {
    const bi = confirmed.reduce((a, i) => (yA[i] > yA[a] ? i : a), confirmed[0]);
    const ukey = (u) => u.map((x) => x.toFixed(6)).join(',');
    const baseKey = ukey(U[bi]);
    // the base recipe was already run in the sample, on both seeds; an errored
    // evaluation scores 0, which G4 would read as a real drop, so any error
    // stops G4 from passing
    const g4Errors = [];
    const evalAt = (seed) => (u) => {
      const r = ukey(u) === baseKey ? runAt(U[bi], seed, `sobol|${bi}`) : runAt(u, seed, `g4|${ukey(u)}`);
      if (r.error) g4Errors.push(`${seed}:${ukey(u)}`);
      return r.score;
    };
    const m = measureG4(U[bi], yA[bi], evalAt(SEED_A), evalAt(SEED_B), names);
    errors.g4 = g4Errors.length;
    if (g4Errors.length) { m.pass = false; m.reason = `${g4Errors.length} errored evaluation(s): G4 cannot pass`; }
    g4 = {
      run: true, ...(others.length ? { diagnostic_only: `${others.map((g) => g.split('_')[0]).join(', ')} already failed` } : {}),
      base_index: bi, base_score: +yA[bi].toFixed(3), base_values: Object.fromEntries(names.map((n) => [n, +runs[bi].v[n].toPrecision(4)])),
      profiles: m.profiles.map((p) => ({ ...p, scores: p.scores.map((s) => +s.toFixed(3)), range: +p.range.toFixed(3), range_seedB: p.range_seedB == null ? null : +p.range_seedB.toFixed(3) })),
      inputs_matter: m.matter,
      grid: m.grid && {
        inputs: m.grid.inputs, axes_unit: m.grid.axes.map((ax) => ax.map((x) => +x.toFixed(4))),
        seedA: m.grid.seedA.map((r) => r.map((s) => +s.toFixed(3))), seedB: m.grid.seedB.map((r) => r.map((s) => +s.toFixed(3))),
        interaction_share: +m.grid.share.toFixed(3), F: Number.isFinite(m.grid.F) ? +m.grid.F.toFixed(2) : 'inf',
      },
      pass: m.pass, reason: m.reason,
    };
  }
  gates.G4_structure = g4.run === true && g4.pass === true;
  const verdict = Object.values(gates).every(Boolean) ? 'PASS' : 'FAIL';

  // Borderline: a passing value within 10% of its threshold, or a count at its minimum.
  const borderline = [];
  if (gates.G1_survival && nSurv === GATE.MIN_SURVIVING) borderline.push(`G1 survivors at the minimum (${nSurv})`);
  for (const s of survival) if (s.survives && s.kind !== 'schedule' && near(s.growth_alive, GATE.SURVIVE_GROWTH, true)) borderline.push(`G1 ${s.input} ${s.growth_alive}`);
  if (gates.G2_coverage && errors.sample === GATE.MAX_ERRORS) borderline.push(`G2 errors at the maximum (${errors.sample})`);
  if (gates.G3_exists && near(bestConfirm, GATE.TAU, true)) borderline.push(`G3 best confirmation ${bestConfirm.toFixed(3)}`);
  if (gates.G5_rarity && hitRate > 0 && near(hitRate, GATE.MAX_HIT_RATE, false)) borderline.push(`G5 hit rate ${hitRate}`);
  if (gates.G5_rarity && near(bestA, GATE.MAX_BEST, false)) borderline.push(`G5 best ${bestA.toFixed(3)}`);
  if (g4.run) {
    // an input counted at the edge is worth knowing whether G4 passed or not:
    // a control's signature can sit on it too
    for (const p of g4.profiles) if (p.matters && p.constraining_levels === G4.MIN_CONSTRAINING_LEVELS) borderline.push(`G4 ${p.input} constrains at exactly ${p.constraining_levels} of ${G4.PROFILE_LEVELS} levels`);
  }
  if (g4.run && g4.pass) {
    const counted = g4.profiles.filter((p) => p.matters);
    if (counted.length === G4.MIN_MATTER) borderline.push(`G4 inputs that matter at the minimum (${counted.length})`);
    const ranges = counted.map((p) => Math.min(p.range, p.range_seedB)).sort((a, b) => b - a);
    if (near(ranges[G4.MIN_MATTER - 1], G4.MATTER_RANGE, true)) borderline.push(`G4 third range ${ranges[G4.MIN_MATTER - 1]}`);
    if (near(g4.grid.interaction_share, G4.MIN_INTERACTION, true)) borderline.push(`G4 share ${g4.grid.interaction_share}`);
    if (g4.grid.F !== 'inf' && near(g4.grid.F, G4.MIN_F, true)) borderline.push(`G4 F ${g4.grid.F}`);
  }

  // A control must fail exactly where its candidates file says, and no earlier.
  // Its G4 inputs must include every must_matter input and nothing outside
  // must_matter + may_matter.
  let control_check = null;
  if (cand.control) {
    const expectFail = cand.control.fails;
    const othersPass = Object.entries(gates).every(([g, ok]) => (g.startsWith(expectFail) ? !ok : ok));
    const must = cand.control.must_matter || [];
    const allowed = new Set([...must, ...(cand.control.may_matter || [])]);
    const matterOk = !g4.run ? must.length === 0
      : must.every((n) => g4.inputs_matter.includes(n)) && g4.inputs_matter.every((n) => allowed.has(n));
    control_check = { ok: othersPass && matterOk, expected: cand.control, got: { failed: Object.keys(gates).filter((g) => !gates[g]), inputs_matter: g4.run ? g4.inputs_matter : null } };
  }

  const order = yA.map((y, i) => i).sort((a, b) => yA[b] - yA[a]);
  const top = order.slice(0, 5).map((i) => ({
    i, score: +yA[i].toFixed(3), best_L: +(runs[i].best_L ?? 0).toFixed(3), smooth: +(runs[i].best_smooth ?? 0).toFixed(2),
    values: Object.fromEntries(names.map((n) => [n, +runs[i].v[n].toPrecision(4)])),
    at_bound: names.filter((n, d) => U[i][d] <= 0.05 || U[i][d] >= 0.95),
  }));
  const summary = {
    id: cand.id, role: cand.role, scenario: cand.scenario, mineral: cand.mineral, fingerprint: BATCH_FP,
    L_min: cand.L_min, L_target: cand.L_target, tau: GATE.TAU, authored: auth,
    authored_score: +authRun.score.toFixed(3), authored_largest_free_mm: +(authRun.largest_free_L ?? 0).toFixed(3),
    traced_at: keys.length ? `${keys.length} host cell(s) of the authored run` : 'nowhere: the target never grew',
    errors,
    survival,
    sample: {
      n: GATE.N, seeds: [SEED_A, SEED_B], score_mean: +mean(yA).toFixed(4), score_max: +bestA.toFixed(3),
      nonzero: yA.filter((y) => y > 0).length, hits_seedA: hitIdx.length, hit_rate: +hitRate.toFixed(3), confirmed_hits: confirmed.length,
      variance: +Vt.toExponential(3), noise_share_descriptive: noise == null ? null : +noise.toFixed(3),
      first_order_binned_descriptive: Object.fromEntries(names.map((n, d) => [n, +S1[d].toFixed(3)])),
    },
    g4, top, gates, verdict, borderline, control_check,
    cost: { runs: cost.runs, cached: cost.cached, cpu_seconds: +cost.seconds.toFixed(1), wall_seconds: Math.round((Date.now() - t0) / 1000) },
  };
  fs.writeFileSync(path.join(OUT, `${cand.id}.json`), JSON.stringify(summary, null, 2) + '\n');
  return summary;
}

// ---------- main ----------
sobolSelfTest();
const meta = {
  batch_fingerprint: BATCH_FP, hashes: HASHES, candidates: path.basename(CANDIDATES_FILE), seeds: [SEED_A, SEED_B],
  g4_diagnostic: G4_DIAGNOSTIC, platform: `${process.platform} ${process.arch}`,
  started: new Date().toISOString(), gate: GATE,
};
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
const results = [];
for (const cand of CANDIDATES) {
  if (ONLY && !ONLY.includes(cand.id)) continue;
  const r = preflight(cand);
  results.push(r);
  const s = r.sample;
  console.log(`\n== ${r.id} (${r.role}) — ${r.verdict}   ${r.cost.runs} runs (+${r.cost.cached} cached), ${r.cost.cpu_seconds} CPU-s`);
  console.log(`   gates: ${Object.entries(r.gates).map(([k, v]) => `${k.split('_')[0]} ${v ? 'pass' : 'FAIL'}`).join(' · ')}`);
  console.log(`   survival: ${r.survival.map((x) => `${x.input} ${x.survives ? 'yes' : 'no'} (${(100 * x.growth_alive).toFixed(0)}%)`).join(', ')}`);
  console.log(`   sample: nonzero ${s.nonzero}/${s.n}, best ${s.score_max}, hits ${s.hits_seedA} (${(100 * s.hit_rate).toFixed(1)}%), confirmed ${s.confirmed_hits}; errors ${JSON.stringify(r.errors)}`);
  if (r.g4.run) {
    console.log(`   G4${r.g4.diagnostic_only ? ` (diagnostic: ${r.g4.diagnostic_only})` : ''} through #${r.g4.base_index} (${r.g4.base_score}): ${r.g4.profiles.map((p) => `${p.input} ${p.range}${p.range_seedB == null ? '' : `/${p.range_seedB}`} [${p.constraining_levels}/${G4.PROFILE_LEVELS}]`).join(', ')} → matter: ${r.g4.inputs_matter.join(', ') || 'none'}; ${r.g4.reason}`);
  } else {
    console.log(`   G4 ${r.g4.reason}`);
  }
  if (r.borderline.length) console.log(`   borderline: ${r.borderline.join('; ')}`);
  if (r.control_check) console.log(`   control: ${r.control_check.ok ? 'failed where it should' : `⚑ OFF ITS SIGNATURE (${JSON.stringify(r.control_check.got)}): this batch decides nothing`}`);
}
meta.finished = new Date().toISOString();
meta.runs = results.reduce((a, r) => a + r.cost.runs, 0);
meta.cached = results.reduce((a, r) => a + r.cost.cached, 0);
meta.cpu_seconds = +results.reduce((a, r) => a + r.cost.cpu_seconds, 0).toFixed(1);
const controls = results.filter((r) => r.control_check);
meta.controls_ok = controls.length ? controls.every((r) => r.control_check.ok) : null;
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
const controlNote = !controls.length ? 'no control in this run' : meta.controls_ok ? 'the control failed where it should' : '⚑ a control is OFF its signature: this batch decides nothing';
console.log(`\nall: ${meta.runs} runs executed (+${meta.cached} cached), ${meta.cpu_seconds} CPU-s; ${controlNote}`);
