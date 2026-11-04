#!/usr/bin/env node
/**
 * tools/story-pocket-cavities.mjs — the cavity each census run grew in, for the story-pocket scoreboard
 * (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, revised 2026-10-22).
 *
 * The committed census (.local-evidence/assemblage-census/runs.jsonl) records crystals, not the cavity.
 * The cavity is fixed when the simulator is constructed — from the scenario's authored wall (its
 * diameter or size class and its shape seed) — so this tool constructs each census scenario at each of
 * its census seeds, runs no steps, and reads the wall: the equivalent diameter (wall_state
 * .vug_diameter_mm), the mesh's extents along x, y and z, and its longest interior span (the longest
 * chord between two wall vertices: the longest crystal the cavity could hold, end to end). Every seed
 * after the first is compared with the first by a key of the diameter, the vertex count and a weighted
 * sum of the vertex positions; the output records whether all agreed. The size class (vug / pocket /
 * cave) is the one the scenario authors, or else the class of SIZE_CLASS_RANGES in
 * js/22-geometry-wall.ts that holds the diameter (read from that file, so it cannot drift).
 *
 * Not recorded: wall dissolution can widen the cavity during a run, and the census does not keep the
 * final wall; the dimensions here are the cavity the run started in.
 *
 * Writes .local-evidence/locality-abundance/cavities.json.
 * Usage: node tools/story-pocket-cavities.mjs [--seeds=all|first]   (all: about 9 minutes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, '.local-evidence', 'assemblage-census', 'runs.jsonl');
const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance', 'cavities.json');
const mode = (process.argv.find((a) => a.startsWith('--seeds=')) || '--seeds=all').slice(8);
if (!['all', 'first'].includes(mode)) throw new Error(`--seeds must be all or first, not ${mode}`);

// SIZE_CLASS_RANGES, read from the wall module itself.
const wallSrc = fs.readFileSync(path.join(ROOT, 'js', '22-geometry-wall.ts'), 'utf8');
const block = wallSrc.match(/const SIZE_CLASS_RANGES[^{]*\{([^}]*)\}/);
if (!block) throw new Error('SIZE_CLASS_RANGES not found in js/22-geometry-wall.ts');
const RANGES = Object.fromEntries([...block[1].matchAll(/(\w+):\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
if (!RANGES.vug || !RANGES.pocket || !RANGES.cave) throw new Error(`SIZE_CLASS_RANGES parse incomplete: ${JSON.stringify(RANGES)}`);
const classOf = (d) => Object.entries(RANGES).find(([, [lo, hi]]) => d >= lo && d <= hi)?.[0] ?? (d < RANGES.vug[0] ? 'below vug' : 'above cave');

const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const seedsBy = {};
for (const r of runs) (seedsBy[r.scenario] ||= new Set()).add(r.seed);
const censusVersions = [...new Set(runs.map((r) => r.sim_version))];

const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } = await h.loadSimBundle({ toolName: 'story-pocket-cavities' });
if (censusVersions.length !== 1 || censusVersions[0] !== SIM_VERSION) {
  throw new Error(`the census was run at SIM_VERSION ${censusVersions.join(', ')}, the bundle is ${SIM_VERSION}: rebuild the matching bundle first`);
}

const build = (scn, seed) => {
  setSeed(seed);
  const s = SCENARIOS[scn]();
  return new VugSimulator(s.conditions, s.events);
};
const keyOf = (sim) => {
  const p = sim.wall_state.meshFor(sim).positions;
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += p[i] * (1 + (i % 7));
  return `${sim.wall_state.vug_diameter_mm}|${p.length}|${sum}`;
};
const dims = (sim) => {
  const p = sim.wall_state.meshFor(sim).positions;
  const n = p.length / 3;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = p[3 * i + k]; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
  let span = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const dx = p[3 * i] - p[3 * j], dy = p[3 * i + 1] - p[3 * j + 1], dz = p[3 * i + 2] - p[3 * j + 2];
    const d = dx * dx + dy * dy + dz * dz;
    if (d > span) span = d;
  }
  const eqd = sim.wall_state.vug_diameter_mm;
  const authored = sim.conditions.wall?.size_class ?? null;
  return { eqd_mm: +eqd.toFixed(3), extents_mm: hi.map((v, k) => +(v - lo[k]).toFixed(2)), span_mm: +Math.sqrt(span).toFixed(2),
    size_class: authored ?? classOf(eqd), size_class_basis: authored ? 'authored' : 'diameter in SIZE_CLASS_RANGES',
    architecture: sim.conditions.wall?.architecture ?? null, vertices: n };
};

const t0 = Date.now();
const out = {};
for (const scn of Object.keys(seedsBy).sort()) {
  if (!SCENARIOS[scn]) throw new Error(`census scenario ${scn} is not in the bundle`);
  const seeds = [...seedsBy[scn]].sort((a, b) => a - b);
  const first = build(scn, seeds[0]);
  const d = dims(first);
  const ref = keyOf(first);
  const checked = mode === 'all' ? seeds : [seeds[0]];
  const differ = [];
  for (const seed of checked.slice(1)) if (keyOf(build(scn, seed)) !== ref) differ.push(seed);
  out[scn] = { ...d, seeds_checked: checked, identical_across_seeds: differ.length === 0, ...(differ.length ? { differing_seeds: differ } : {}) };
  process.stderr.write(`${scn}: span ${d.span_mm} mm, eqd ${d.eqd_mm} mm, ${checked.length} seeds${differ.length ? `, ${differ.length} DIFFER` : ''}\n`);
}
const doc = {
  _about: 'Cavity dimensions per census scenario, read from the constructed wall (no steps run) by tools/story-pocket-cavities.mjs. span_mm = the longest chord between two wall vertices; eqd_mm = wall_state.vug_diameter_mm. Dissolution during a run can widen the cavity; these are the starting dimensions.',
  sim_version: SIM_VERSION,
  seeds_mode: mode,
  size_class_ranges_mm: RANGES,
  seconds: Math.round((Date.now() - t0) / 1000),
  scenarios: out,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
const bad = Object.entries(out).filter(([, v]) => !v.identical_across_seeds).map(([k]) => k);
console.log(`${Object.keys(out).length} scenarios, ${Object.values(out).reduce((s, v) => s + v.seeds_checked.length, 0)} constructions, ${bad.length ? `DIFFER: ${bad.join(', ')}` : 'every scenario identical across its checked seeds'}, ${doc.seconds} s → ${path.relative(ROOT, OUT)}`);
