// Known-answer tests behind G4 of the inverse-design preflight
// (tools/inverse-preflight.mjs). No simulator; a few seconds.
//
//   node proposals/evidence/inverse-design-g4-estimator-check.mjs
//
// Part 1, why G4 does not use the 64-point sample: two first-order estimators
// on known-answer functions over the gate's own 64-point Sobol design, binned
// (4 bins, bias-corrected; the first G4) and rank (nearest-neighbour), against
// true values computed here by Monte Carlo (Saltelli 2010, 200,000 points).
//
// Part 2, the replacement G4 (tools/inverse-preflight-lib.mjs) on functions
// whose structure is known, its base chosen the way the gate chooses it: the
// best seed-A recipe among those scoring >= 0.5 on both seeds. Noisy cases add
// independent Gaussian noise per recipe and seed, and repeat 200 times.
import { G4, gridInteraction, measureG4, sobol } from '../../tools/inverse-preflight-lib.mjs';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pvar = (a) => { const m = mean(a); return a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length; };
const band = (x, lo, hi) => (x > lo && x < hi ? 1 : 0);
const ishigami = (u) => {
  const [a, b, c] = u.slice(0, 3).map((v) => -Math.PI + 2 * Math.PI * v);
  return Math.sin(a) + 7 * Math.sin(b) ** 2 + 0.1 * c ** 4 * Math.sin(a);
};

// ---------- Part 1 ----------
function binned(U, y, d, B = 4) {
  const N = y.length, Vt = pvar(y), m = mean(y);
  const bins = Array.from({ length: B }, () => []);
  U.forEach((u, i) => bins[Math.min(B - 1, Math.floor(u[d] * B))].push(y[i]));
  let vb = 0, ss = 0;
  for (const b of bins) { const mb = mean(b); vb += (b.length / N) * (mb - m) ** 2; ss += b.reduce((x, v) => x + (v - mb) ** 2, 0); }
  return Vt > 0 ? Math.max(0, vb - ((B - 1) / N) * (ss / (N - B))) / Vt : 0;
}
function rank(x, y) {
  const N = y.length, Vt = pvar(y), m = mean(y);
  if (!(Vt > 0)) return 0;
  const o = [...x.keys()].sort((a, b) => x[a] - x[b]);
  let s = 0;
  for (let j = 0; j < N - 1; j++) s += y[o[j]] * y[o[j + 1]];
  return (s / (N - 1) - m * m) / Vt;
}
function permP(x, y, obs, rnd, P = 999) {
  const yy = [...y];
  let ge = 0;
  for (let k = 0; k < P; k++) {
    for (let i = yy.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [yy[i], yy[j]] = [yy[j], yy[i]]; }
    if (rank(x, yy) >= obs) ge++;
  }
  return (ge + 1) / (P + 1);
}
// True first-order indices by the Saltelli (2010) pick-freeze estimator.
function trueS1(f, D, N = 200000) {
  const rnd = mulberry32(7);
  const A = Array.from({ length: N }, () => Array.from({ length: D }, rnd));
  const B = Array.from({ length: N }, () => Array.from({ length: D }, rnd));
  const fA = A.map(f), fB = B.map(f);
  const V = pvar([...fA, ...fB]);
  return Array.from({ length: D }, (_, i) => {
    let s = 0;
    for (let j = 0; j < N; j++) { const ab = A[j].slice(); ab[i] = B[j][i]; s += fB[j] * (f(ab) - fA[j]); }
    return s / N / V;
  });
}

const U64 = sobol(64, 5);
const PART1 = {
  'narrow band (x1 in 0.40-0.48)': (u) => band(u[0], 0.40, 0.48),
  'band x gate (band(x1) * x2)': (u) => band(u[0], 0.40, 0.48) * u[1],
  'additive (x1 + x2 + x3)': (u) => u[0] + u[1] + u[2],
  'product (x1 * x2 * x3)': (u) => u[0] * u[1] * u[2],
  'Ishigami (x1..x3)': ishigami,
};
console.log('PART 1: first-order shares on the gate\'s 64-point Sobol design (x4, x5 are pure noise inputs)\n');
const prand = mulberry32(12345);
for (const [name, f] of Object.entries(PART1)) {
  const y = U64.map(f);
  const truth = trueS1(f, 5);
  console.log(`${name}: true interaction share ${(1 - truth.reduce((a, b) => a + b, 0)).toFixed(2)}`);
  console.log('        true  binned   rank  rank p');
  for (let d = 0; d < 5; d++) {
    const x = U64.map((u) => u[d]);
    const r = rank(x, y);
    console.log(`  x${d + 1}  ${truth[d].toFixed(2).padStart(5)}  ${binned(U64, y, d).toFixed(2).padStart(6)}  ${r.toFixed(2).padStart(5)}  ${permP(x, y, r, prand).toFixed(3)}`);
  }
}

// ---------- Part 2 ----------
function gaussian(rnd) { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
function noisy(f, sd, trial, seed) {
  if (!sd) return f;
  return (u) => {
    let h = 2166136261 ^ trial * 7919 ^ seed * 104729;
    for (const x of u) h = Math.imul(h ^ Math.round(x * 1e6), 16777619);
    return f(u) + sd * gaussian(mulberry32(h));
  };
}
function gate(f, sd, trial, fBnoiseless = null) {
  const fA = noisy(f, sd, trial, 1), fB = noisy(fBnoiseless || f, sd, trial, 2);
  let best = null;
  for (const u of U64) { const a = fA(u); if (a >= 0.5 && fB(u) >= 0.5 && (!best || a > best.a)) best = { u, a }; }
  if (!best) return { g3: false };
  return { g3: true, ...measureG4(best.u, best.a, fA, fB, ['x1', 'x2', 'x3', 'x4', 'x5']) };
}
const ishN = (u) => (ishigami(u) + 10.75) / 29.5;
const below = (x, t) => (x < t ? 1 : 0);
const peak = (x) => Math.max(0, 1 - Math.abs(x - 0.5) / 0.25);
const same = (a, b) => [...a].sort().join(',') === [...b].sort().join(',');
const ANDx3 = (u) => band(u[0], 0.40, 0.60) * band(u[1], 0.40, 0.60) * (0.2 + 0.8 * u[2]);
// [name, f, expected verdict, the reason it must have (asserted too), optional seed-B function]
const CASES = [
  ['narrow band in x1', (u) => band(u[0], 0.40, 0.48), 'FAIL: 1 input matters', (r) => same(r.matter, ['x1'])],
  ['band(x1) * x2 (the Searles shape)', (u) => band(u[0], 0.40, 0.48) * u[1], 'FAIL: 2 inputs matter', (r) => same(r.matter, ['x1', 'x2'])],
  // round 2 of review: one dominant input plus cliffs at the bounds must fail
  ['band(x1) * [x2 < 0.9] * [x3 < 0.9] * (0.6 + 0.1 x4)', (u) => band(u[0], 0.40, 0.48) * below(u[1], 0.9) * below(u[2], 0.9) * (0.6 + 0.1 * u[3]), 'FAIL: cliffs do not constrain', (r) => same(r.matter, ['x1'])],
  ['band(x1) * [x2 < 0.9] * [x3 < 0.9] * 0.65', (u) => band(u[0], 0.40, 0.48) * below(u[1], 0.9) * below(u[2], 0.9) * 0.65, 'FAIL: cliffs do not constrain', (r) => same(r.matter, ['x1'])],
  ['band(x1 in 0.2-0.6) * [x2 < 0.9] * [x3 < 0.9] * (0.6 + 0.1 x4)', (u) => band(u[0], 0.2, 0.6) * below(u[1], 0.9) * below(u[2], 0.9) * (0.6 + 0.1 * u[3]), 'FAIL: cliffs do not constrain', (r) => same(r.matter, ['x1'])],
  // AND regions in x1 and x2, with x3 constraining too: (0.2 + 0.8 x3) >= 0.5 needs x3 >= 0.375
  ['AND bands 0.30-0.45 x 0.30-0.45, * (0.2 + 0.8 x3)', (u) => band(u[0], 0.30, 0.45) * band(u[1], 0.30, 0.45) * (0.2 + 0.8 * u[2]), 'PASS', (r) => same(r.matter, ['x1', 'x2', 'x3'])],
  ['AND bands 0.40-0.60 x 0.40-0.60, * (0.2 + 0.8 x3)', ANDx3, 'PASS', (r) => same(r.matter, ['x1', 'x2', 'x3'])],
  // round 3 of review: the seed-B confirmation must be what fails this one (x3 matters on seed A only)
  ['the same AND region, x3 acting on seed A only', ANDx3, 'FAIL: seed B does not confirm x3', (r) => same(r.matter, ['x1', 'x2']) && r.profiles[2].range >= G4.MATTER_RANGE, (u) => band(u[0], 0.40, 0.60) * band(u[1], 0.40, 0.60)],
  // the interaction lives only between the two inputs that matter most (x3 adds on its own), so the grid must pick those two
  ['AND(x1, x2) * 0.7 + 0.3 p(x3)', (u) => 0.7 * band(u[0], 0.40, 0.60) * band(u[1], 0.40, 0.60) + 0.3 * peak(u[2]), 'PASS', (r) => !!r.grid && same(r.grid.inputs, ['x1', 'x2'])],
  // round 1's function: x3 never takes the score below 0.5, so it sits on the 4-of-7 edge
  ['AND bands 0.40-0.60 x 0.40-0.60, * (0.5 + 0.5 x3)', (u) => band(u[0], 0.40, 0.60) * band(u[1], 0.40, 0.60) * (0.5 + 0.5 * u[2]), 'reported, not asserted: x3 does not constrain the good region'],
  ['additive (x1 + x2 + x3) / 3', (u) => (u[0] + u[1] + u[2]) / 3, 'FAIL: no input constrains', (r) => r.matter.length === 0],
  ['additive peaks (p(x1) + p(x2) + p(x3)) / 3', (u) => (peak(u[0]) + peak(u[1]) + peak(u[2])) / 3, 'FAIL: no interaction', (r) => !!r.grid && r.grid.share < G4.MIN_INTERACTION],
  // round 3 of review: with no seed noise F is infinite, so the share test alone must fail a weak interaction
  ['additive peaks + 0.15 p(x1) p(x2), no noise', (u) => (peak(u[0]) + peak(u[1]) + peak(u[2])) / 3 + 0.15 * peak(u[0]) * peak(u[1]), 'FAIL: the share test', (r) => !!r.grid && r.grid.share < G4.MIN_INTERACTION && !(r.grid.F < G4.MIN_F)],
  ['product x1 * x2 * x3', (u) => u[0] * u[1] * u[2], 'reported, not asserted: its optimum is a corner'],
  ['Ishigami, rescaled to about 0-1', ishN, 'reported, not asserted: its interaction is x1 x x3'],
];
console.log(`\nPART 2: the final G4 (an input matters if leaving its best value costs >= ${G4.MATTER_RANGE} on >= ${G4.MIN_CONSTRAINING_LEVELS} of ${G4.PROFILE_LEVELS} levels, confirmed on seed B; >= ${G4.MIN_MATTER} must; grid share >= ${G4.MIN_INTERACTION} and F >= ${G4.MIN_F})\n`);
let failures = 0;
for (const [name, f, expect, why, fB] of CASES) {
  const r = gate(f, 0, 0, fB);
  const asserted = expect.startsWith('PASS') || expect.startsWith('FAIL');
  if (!r.g3) {
    // an asserted case must reach G4, or it tests nothing
    if (asserted) failures++;
    console.log(`${name}: no confirmed hit, G4 never ran${asserted ? '  <-- WRONG (an asserted case must reach G4)' : ''}`);
    continue;
  }
  const verdict = r.pass ? 'PASS' : 'FAIL';
  const ok = !asserted ? null : (expect.startsWith('PASS') ? r.pass : !r.pass) && (!why || why(r));
  if (ok === false) failures++;
  const g = r.grid ? `grid ${r.grid.inputs.join(' x ')} share ${r.grid.share.toFixed(3)} F ${Number.isFinite(r.grid.F) ? r.grid.F.toFixed(1) : 'inf'}` : 'grid not run';
  const levels = r.profiles.map((p) => `${p.input}:${p.constraining_levels}`).join(' ');
  console.log(`${name}\n  constraining levels ${levels}  matter [${r.matter.join(', ')}]  ${g}  -> ${verdict}  (expected ${expect})${ok === false ? '  <-- WRONG' : ''}`);
}
// The base-on-axis rule, swept: every AND region of width 0.15 in x1 and x2
// (x3 constraining as above) whose two bands both avoid the fixed grid levels
// 0.25, 0.5 and 0.75. Each one the 64-point design hits must PASS; a region
// with no hit fails G3 first, which is the gate's job, and is only counted.
{
  const starts = Array.from({ length: 17 }, (_, k) => +(0.02 + 0.05 * k).toFixed(2)).filter((s) => s + 0.15 <= 0.98);
  const avoids = (lo) => [0.25, 0.5, 0.75].every((g) => !(g > lo && g < lo + 0.15));
  let reached = 0, passed = 0, noHit = 0;
  for (const a of starts) {
    for (const b of starts) {
      if (!avoids(a) || !avoids(b)) continue;
      const r = gate((u) => band(u[0], a, a + 0.15) * band(u[1], b, b + 0.15) * (0.2 + 0.8 * u[2]), 0, 0);
      if (!r.g3) { noHit++; continue; }
      reached++;
      if (r.pass) passed++;
    }
  }
  const ok = reached >= 30 && passed === reached;
  if (!ok) failures++;
  console.log(`\nAND regions between the grid levels (a 0.05 lattice of positions): ${passed} of ${reached} reached G4 and PASS (${noHit} positions had no hit)${ok ? '' : '  <-- WRONG'}`);
}
// The base-in-profile rule, swept (round 3 of review): AND regions whose bands
// avoid every PROFILE level k/6, so only the base point inside the region can
// show that leaving it costs anything. Each one that reaches G4 must PASS.
{
  const lv = [0, 1, 2, 3, 4, 5, 6].map((k) => k / 6);
  const avoidsProfile = (lo) => lv.every((g) => !(g > lo && g < lo + 0.15));
  let reached = 0, passed = 0, tried = 0;
  for (let i = 1; i + 15 <= 99; i++) {
    for (let j = 1; j + 15 <= 99; j++) {
      const a = i / 100, b = j / 100;
      if (!avoidsProfile(a) || !avoidsProfile(b)) continue;
      tried++;
      const r = gate((u) => band(u[0], a, a + 0.15) * band(u[1], b, b + 0.15) * (0.2 + 0.8 * u[2]), 0, 0);
      if (!r.g3) continue;
      reached++;
      if (r.pass) passed++;
    }
  }
  const ok = reached >= 20 && passed === reached;
  if (!ok) failures++;
  console.log(`AND regions between the profile levels (a 0.01 lattice): ${passed} of ${reached} reached G4 and PASS (${tried} positions tried)${ok ? '' : '  <-- WRONG'}`);
}
// gridInteraction against its definition, on a fixed 5 x 5 pair of grids: the
// interaction share is the residual of a two-way additive fit to the two-seed
// mean, over its total; F is that residual's mean square (16 df) over the
// mean's noise variance, one seed's variance sigma^2 = sum (A - B)^2 / (2 RC)
// halved. No case above has F near 2, so this is what pins F's formula.
{
  const A = [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => i + 2 * j + (i === 2 && j === 2 ? 3 : 0)));
  const B = A.map((row, i) => row.map((y, j) => y + ((i + j) % 2 ? 0.1 : -0.1) + (i === 0 ? 0.05 : 0)));
  const m = A.map((row, i) => row.map((y, j) => (y + B[i][j]) / 2));
  const g = m.flat().reduce((a, b) => a + b, 0) / 25;
  const ri = m.map((row) => row.reduce((a, b) => a + b, 0) / 5);
  const cj = [0, 1, 2, 3, 4].map((j) => m.reduce((a, row) => a + row[j], 0) / 5);
  let ssRes = 0, ssTot = 0, d2 = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    ssRes += (m[i][j] - ri[i] - cj[j] + g) ** 2;
    ssTot += (m[i][j] - g) ** 2;
    d2 += (A[i][j] - B[i][j]) ** 2;
  }
  const sigma2 = d2 / 50;
  const want = { share: ssRes / ssTot, F: (ssRes / 16) / (sigma2 / 2) };
  const got = gridInteraction(A, B);
  const ok = Math.abs(got.share - want.share) < 1e-12 && Math.abs(got.F - want.F) < 1e-9 * want.F;
  if (!ok) failures++;
  console.log(`\ngridInteraction on a fixed grid: share ${got.share.toFixed(6)} (definition ${want.share.toFixed(6)}), F ${got.F.toFixed(4)} (definition ${want.F.toFixed(4)})${ok ? '' : '  <-- WRONG'}`);
}
const rate = (f, sd, n = 200) => { let pass = 0, g3 = 0; for (let t = 1; t <= n; t++) { const r = gate(f, sd, t); if (r.g3) { g3++; if (r.pass) pass++; } } return { pass, g3, n }; };
console.log('\nnoise: of 200 noisy repeats with a confirmed hit, how many PASS');
for (const [name, f, sd, check] of [
  ['additive peaks, noise SD 0.10 (no interaction: <= 10% may pass)', (u) => (peak(u[0]) + peak(u[1]) + peak(u[2])) / 3, 0.10, (r) => r.pass <= 0.10 * r.g3],
  ['additive peaks, noise SD 0.15 (no interaction: <= 10% may pass)', (u) => (peak(u[0]) + peak(u[1]) + peak(u[2])) / 3, 0.15, (r) => r.pass <= 0.10 * r.g3],
  ['AND bands 0.40-0.60 * (0.2 + 0.8 x3), noise SD 0.05 (>= 90% should pass)', (u) => band(u[0], 0.40, 0.60) * band(u[1], 0.40, 0.60) * (0.2 + 0.8 * u[2]), 0.05, (r) => r.pass >= 0.90 * r.g3],
]) {
  const r = rate(f, sd);
  const ok = r.g3 >= 100 && check(r);
  if (!ok) failures++;
  console.log(`  ${name}: ${r.pass}/${r.g3}${ok ? '' : '  <-- WRONG'}`);
}
console.log(failures ? `\n${failures} case(s) WRONG` : '\nall asserted cases as expected');
process.exitCode = failures ? 1 : 0;
