// The pure parts of the inverse-design preflight: the Sobol sequence and G4.
// No simulator, so the known-answer test in
// proposals/evidence/inverse-design-g4-estimator-check.mjs drives the same
// code as tools/inverse-preflight.mjs.

// ---------- Sobol (Joe & Kuo direction numbers, Gray-code order, first point 0) ----------
const JK = [null, [1, 0, [1]], [2, 1, [1, 3]], [3, 1, [1, 3, 1]], [3, 2, [1, 1, 1]], [4, 1, [1, 1, 3, 3]], [4, 4, [1, 3, 5, 13]], [5, 2, [1, 1, 5, 5, 17]]];
export function sobol(n, dim) {
  const BITS = 30;
  const V = [Array.from({ length: BITS }, (_, k) => 2 ** (BITS - 1 - k))];
  for (let d = 1; d < dim; d++) {
    const [s, a, m] = JK[d];
    const v = new Array(BITS);
    for (let k = 0; k < s; k++) v[k] = m[k] * 2 ** (BITS - 1 - k);
    for (let k = s; k < BITS; k++) {
      let x = v[k - s] ^ (v[k - s] >>> s);
      for (let j = 1; j < s; j++) if ((a >>> (s - 1 - j)) & 1) x ^= v[k - j];
      v[k] = x;
    }
    V.push(v);
  }
  const X = new Array(dim).fill(0);
  const out = [new Array(dim).fill(0)];
  for (let i = 1; i < n; i++) {
    let c = 0, w = i - 1;
    while (w & 1) { w >>>= 1; c++; }
    for (let d = 0; d < dim; d++) X[d] ^= V[d][c];
    out.push(X.map((x) => x / 2 ** BITS));
  }
  return out;
}
export function sobolSelfTest() {
  const P = sobol(64, 7);
  for (let d = 0; d < 7; d++) {
    const cells = new Set(P.map((p) => Math.floor(p[d] * 64)));
    if (cells.size !== 64) throw new Error(`Sobol self-test: dim ${d + 1} is not stratified`);
  }
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const cnt = new Map();
    for (const p of P) { const k = `${Math.floor(p[a] * 4)},${Math.floor(p[b] * 4)}`; cnt.set(k, (cnt.get(k) || 0) + 1); }
    if (cnt.size !== 16 || [...cnt.values()].some((v) => v !== 4)) throw new Error(`Sobol self-test: dims ${a + 1},${b + 1} not balanced on a 4x4 grid`);
  }
  const head = sobol(4, 3).map((p) => p.join(','));
  if (head.join(' ') !== '0,0,0 0.5,0.5,0.5 0.75,0.25,0.25 0.25,0.75,0.75') throw new Error(`Sobol self-test: head ${head.join(' ')}`);
}

// ---------- G4: "several inputs matter, with real interactions" ----------
// It measures structure where the good region is, around the best confirmed
// recipe, because a gate that demands a rare good region leaves too few nonzero
// points in a 64-point sample for any estimator built on the sample.
//
//   1. Profiles: each input at 7 even levels, the rest held at the base recipe,
//      on seed A. The base itself is a point of every profile. An input matters
//      if it constrains the good region: leaving its best value costs >= 0.25
//      on at least half of its 7 levels, and seed B, run at that profile's
//      highest and lowest points, moves the score by >= 0.25 the same way. A
//      cliff at one bound (one level of seven) does not count: an input that a
//      random recipe avoids most of the time does not make the search harder.
//   2. Only if >= 3 inputs matter: a 5 x 5 grid of the two inputs that matter
//      most, on seeds A and B. Each axis is 5 even levels with the one nearest
//      the base coordinate moved onto it, so a region narrower than the level
//      spacing still has its base cell on the grid. On the two-seed mean grid,
//      the interaction share is the variance left after an additive (row +
//      column) fit; F compares that residual with the seed noise read from the
//      A - B differences.
//   Pass: >= 3 inputs matter, interaction share >= 0.10 and F >= 2.

export const G4 = {
  PROFILE_LEVELS: 7, GRID_LEVELS: 5,
  MATTER_RANGE: 0.25, MIN_CONSTRAINING_LEVELS: 4, MIN_MATTER: 3,
  MIN_INTERACTION: 0.10, MIN_F: 2,
};

const levels = (n) => Array.from({ length: n }, (_, k) => k / (n - 1));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

export function profilePoints(base, d) {
  return levels(G4.PROFILE_LEVELS).map((x) => base.map((b, e) => (e === d ? x : b)));
}

export function gridAxis(b) {
  const ax = levels(G4.GRID_LEVELS);
  let k = 0;
  for (let i = 1; i < ax.length; i++) if (Math.abs(ax[i] - b) < Math.abs(ax[k] - b)) k = i;
  ax[k] = b;
  return ax;
}

/** Two-way additive fit of a grid: { share, F, ssRes, ssTot, sigma2 } (sigma2 from the A - B differences). */
export function gridInteraction(gridA, gridB) {
  const R = gridA.length, C = gridA[0].length;
  const m = gridA.map((row, i) => row.map((y, j) => (y + gridB[i][j]) / 2));
  const gm = mean(m.flat());
  const rowM = m.map((row) => mean(row));
  const colM = m[0].map((_, j) => mean(m.map((row) => row[j])));
  let ssTot = 0, ssRes = 0, d2 = 0;
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      ssTot += (m[i][j] - gm) ** 2;
      ssRes += (m[i][j] - (rowM[i] + colM[j] - gm)) ** 2;
      d2 += (gridA[i][j] - gridB[i][j]) ** 2;
    }
  }
  const sigma2 = d2 / (2 * R * C);                 // one seed's noise variance
  const msRes = ssRes / ((R - 1) * (C - 1));
  const F = sigma2 > 0 ? msRes / (sigma2 / 2) : (ssRes > 1e-12 ? Infinity : 0);
  return { share: ssTot > 1e-12 ? ssRes / ssTot : 0, F, ssRes, ssTot, sigma2 };
}

/**
 * base: the best confirmed recipe (unit cube), baseA: its seed-A score.
 * evalA / evalB: u -> score on seed A / seed B. names: input names.
 */
export function measureG4(base, baseA, evalA, evalB, names) {
  const D = base.length;
  const profiles = [];
  for (let d = 0; d < D; d++) {
    const pts = profilePoints(base, d);
    const ys = pts.map(evalA);
    const all = [...pts.map((u, k) => ({ u, y: ys[k] })), { u: base, y: baseA }];
    let hi = all[0], lo = all[0];
    for (const p of all) { if (p.y > hi.y) hi = p; if (p.y < lo.y) lo = p; }
    const range = hi.y - lo.y;
    const constraining = ys.filter((y) => y <= hi.y - G4.MATTER_RANGE).length;
    const constrains = constraining >= G4.MIN_CONSTRAINING_LEVELS;
    const rangeB = range >= G4.MATTER_RANGE && constrains ? evalB(hi.u) - evalB(lo.u) : null;
    profiles.push({
      input: names[d], scores: ys, range, constraining_levels: constraining, range_seedB: rangeB,
      matters: constrains && range >= G4.MATTER_RANGE && rangeB >= G4.MATTER_RANGE,
    });
  }
  const matter = profiles.filter((p) => p.matters).map((p) => p.input);
  if (matter.length < G4.MIN_MATTER) {
    return { profiles, matter, grid: null, pass: false, reason: `${matter.length} input(s) matter, ${G4.MIN_MATTER} needed` };
  }
  const order = profiles.map((p, d) => d).filter((d) => profiles[d].matters).sort((a, b) => profiles[b].range - profiles[a].range || a - b);
  const [da, db] = order;
  const axA = gridAxis(base[da]), axB = gridAxis(base[db]);
  const at = (xa, xb) => base.map((b, e) => (e === da ? xa : e === db ? xb : b));
  const gridA = axA.map((xa) => axB.map((xb) => evalA(at(xa, xb))));
  const gridB = axA.map((xa) => axB.map((xb) => evalB(at(xa, xb))));
  const fit = gridInteraction(gridA, gridB);
  const pass = fit.share >= G4.MIN_INTERACTION && fit.F >= G4.MIN_F;
  return {
    profiles, matter,
    grid: { inputs: [names[da], names[db]], axes: [axA, axB], seedA: gridA, seedB: gridB, ...fit },
    pass,
    reason: pass ? 'pass' : `interaction share ${fit.share.toFixed(3)} (>= ${G4.MIN_INTERACTION}), F ${Number.isFinite(fit.F) ? fit.F.toFixed(2) : 'inf'} (>= ${G4.MIN_F})`,
  };
}
