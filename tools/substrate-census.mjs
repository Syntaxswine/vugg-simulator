#!/usr/bin/env node
/**
 * tools/substrate-census.mjs — where do crystals start? (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, WP8)
 *
 * The boss's two theories for why "background" minerals are common in real pockets (2026-10-21):
 * (1) some crystals make a better build surface than the host rock — nucleation is easier on a
 * compatible surface, easiest on the same mineral; (2) taking some chemistry out of the fluid leaves
 * the rest concentrated. This census measures the first as the simulator stands. For every crystal
 * ever nucleated (dissolved ones included) it reads the start surface the simulator recorded —
 * `position`: "vug wall", or a host crystal written "… <mineral> #N", the form parsePositionHost reads
 * in js/26-mineral-paragenesis.ts — and classes it:
 *   wall           the bare cavity wall
 *   other crystal  a crystal of another species; "documented" when the pair is in the simulator's
 *                  SUBSTRATE_NUCLEATION_DISCOUNT table (js/26), which lowers the nucleation threshold,
 *                  otherwise a placement an engine writes itself
 *   own kind       a crystal of the same species
 *   replacement    a pseudomorph after its host
 *   unparsed       anything else (printed, so the classes can be checked)
 * A crystal converted in place (argentite → acanthite) counts as the species it nucleated as
 * (paramorph_origin). Per scenario it also records the wall's rock (`composition`, which the
 * simulator's dissolution chemistry reads, and the render-only `matrix`) and whether the wall's own
 * mineral (limestone → calcite, dolomite → dolomite, sandstone → quartz) ever grows.
 *
 * PASSIVE: runs each (scenario, seed) in-process and serially, reads the end state only, and writes
 * .local-evidence/substrate-census/substrates.{json,md}; --summarize re-reads that JSON (every
 * crystal's raw position string is kept) without running anything. Default: every scenario at seeds
 * 1, 2 and 42. One seed took 13 minutes on a machine other jobs had saturated (bisbee 161 s,
 * tn457_barite_pulses 123 s, supergene_oxidation 107 s), so budget about 40 for the default.
 *
 * Usage:
 *   node tools/substrate-census.mjs
 *   node tools/substrate-census.mjs --scenarios cooling,mvt --seeds 42
 *   node tools/substrate-census.mjs --summarize
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.local-evidence', 'substrate-census');
const JSON_OUT = path.join(OUT, 'substrates.json');
const WALL_MINERAL = { limestone: 'calcite', dolomite: 'dolomite', sandstone: 'quartz' };

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const summarizeOnly = process.argv.includes('--summarize');

let data;
if (summarizeOnly) {
  data = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
} else {
  const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
  const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION, SUBSTRATE_NUCLEATION_DISCOUNT } =
    await h.loadSimBundle({ toolName: 'substrate-census', extraExports: ['SUBSTRATE_NUCLEATION_DISCOUNT'] });
  const scenarios = arg('--scenarios')?.split(',') ?? Object.keys(SCENARIOS).sort();
  const seeds = (arg('--seeds') ?? '1,2,42').split(',').map(Number);
  data = { tool: 'substrate-census', sim_version: SIM_VERSION, table: SUBSTRATE_NUCLEATION_DISCOUNT, runs: [] };
  for (const scenario of scenarios) {
    if (!SCENARIOS[scenario]) throw new Error(`no scenario ${scenario}`);
    for (const seed of seeds) {
      const t0 = Date.now();
      setSeed(seed);
      const s = SCENARIOS[scenario]();
      const sim = new VugSimulator(s.conditions, s.events);
      const steps = s.defaultSteps ?? 100;
      for (let i = 0; i < steps; i++) sim.run_step();
      const w = sim.wall_state || {};
      data.runs.push({
        scenario, seed, steps, ms: Date.now() - t0, composition: w.composition ?? null, matrix: w.matrix ?? null,
        crystals: sim.crystals.map((c) => ({ id: c.crystal_id, mineral: c.mineral, origin: c.paramorph_origin ?? null,
          position: String(c.position ?? ''), step: c.nucleation_step ?? null, dissolved: !!c.dissolved })),
      });
      console.error(`${scenario} seed ${seed}: ${Date.now() - t0} ms, ${sim.crystals.length} crystals`);
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(data, null, 1));
}

// ---- classify
const table = data.table;
function classify(c) {
  const species = c.origin || c.mineral;
  const pos = c.position;
  const m = pos.match(/([a-z_]+)\s+#(\d+)/i);
  if (!m) return { species, kind: /wall/i.test(pos) ? 'wall' : 'unparsed' };
  const host = m[1].toLowerCase();
  if (/pseudomorph|\bafter\b/i.test(pos)) return { species, kind: 'replacement', host };
  if (host === species || host === c.mineral) return { species, kind: 'own kind', host };
  const documented = typeof table[host]?.[species] === 'number' && table[host][species] < 1;
  return { species, kind: 'other crystal', host, documented };
}
const KINDS = ['wall', 'other crystal', 'own kind', 'replacement', 'unparsed'];
const pct = (n, d) => (d ? `${(100 * n / d).toFixed(n / d < 0.1 ? 1 : 0)}` : '—');

const all = [], byScn = {}, unparsed = {};
for (const r of data.runs) {
  const sc = (byScn[r.scenario] ||= { runs: 0, composition: r.composition, matrix: r.matrix, crystals: [], wallMineral: WALL_MINERAL[r.composition] ?? null });
  sc.runs++;
  for (const c of r.crystals) {
    const k = { ...classify(c), scenario: r.scenario, seed: r.seed, position: c.position };
    all.push(k);
    sc.crystals.push(k);
    if (k.kind === 'unparsed') unparsed[c.position] = (unparsed[c.position] || 0) + 1;
  }
}
const count = (arr, f) => arr.filter(f).length;
const md = [];
md.push(`# Substrate census — SIM ${data.sim_version}, ${data.runs.length} runs (${[...new Set(data.runs.map((r) => r.scenario))].length} scenarios × seeds ${[...new Set(data.runs.map((r) => r.seed))].join(', ')})`);
md.push('');
const other = all.filter((k) => k.kind === 'other crystal');
md.push(`Crystals ever nucleated: ${all.length}. Start surface: ${KINDS.map((k) => `${k} ${count(all, (x) => x.kind === k)} (${pct(count(all, (x) => x.kind === k), all.length)} %)`).join(', ')}. Of the starts on another species, ${count(other, (x) => x.documented)} (${pct(count(other, (x) => x.documented), other.length)} %) are pairs in the substrate table (js/26 SUBSTRATE_NUCLEATION_DISCOUNT); the rest are placements engines write themselves.`);
md.push('');
md.push('## By scenario');
md.push('| scenario | wall rock (matrix) | crystals per run | on the wall | on another species | on its own kind | replacement | wall\'s own mineral grows | of those, started on the wall |');
md.push('|---|---|---:|---:|---:|---:|---:|---|---:|');
for (const [scn, sc] of Object.entries(byScn).sort((a, b) => a[0].localeCompare(b[0]))) {
  const n = sc.crystals.length;
  const wm = sc.wallMineral;
  const wmCrystals = wm ? sc.crystals.filter((k) => k.species === wm) : [];
  md.push(`| ${scn} | ${sc.composition ?? '—'}${sc.matrix ? ` (${sc.matrix})` : ''} | ${(n / sc.runs).toFixed(1)} | ${pct(count(sc.crystals, (x) => x.kind === 'wall'), n)} % | ${pct(count(sc.crystals, (x) => x.kind === 'other crystal'), n)} % | ${pct(count(sc.crystals, (x) => x.kind === 'own kind'), n)} % | ${pct(count(sc.crystals, (x) => x.kind === 'replacement'), n)} % | ${wm ? (wmCrystals.length ? `${wm}: ${(wmCrystals.length / sc.runs).toFixed(1)} per run` : `${wm}: never`) : '—'} | ${wm && wmCrystals.length ? `${pct(count(wmCrystals, (x) => x.kind === 'wall'), wmCrystals.length)} %` : '—'} |`);
}
md.push('');
md.push('## By species (20 or more crystals)');
md.push('| species | crystals | on the wall | on another species (documented pair) | on its own kind | commonest hosts |');
md.push('|---|---:|---:|---|---:|---|');
const bySp = {};
for (const k of all) (bySp[k.species] ||= []).push(k);
for (const [sp, ks] of Object.entries(bySp).filter(([, ks]) => ks.length >= 20).sort((a, b) => b[1].length - a[1].length)) {
  const hosts = {};
  for (const k of ks) if (k.host && k.kind !== 'own kind') hosts[k.host] = (hosts[k.host] || 0) + 1;
  const o = ks.filter((x) => x.kind === 'other crystal');
  md.push(`| ${sp} | ${ks.length} | ${pct(count(ks, (x) => x.kind === 'wall'), ks.length)} % | ${pct(o.length, ks.length)} % (${pct(count(o, (x) => x.documented), o.length || 1)} % of them) | ${pct(count(ks, (x) => x.kind === 'own kind'), ks.length)} % | ${Object.entries(hosts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h, n]) => `${h} ${n}`).join(', ')} |`);
}
md.push('');
// The substrate table's pairs, used or not.
const used = {};
for (const k of other.filter((x) => x.documented)) used[`${k.host}>${k.species}`] = (used[`${k.host}>${k.species}`] || 0) + 1;
const pairs = Object.entries(table).flatMap(([h, e]) => Object.keys(e).map((s) => `${h}>${s}`));
md.push(`## The substrate table (js/26): ${pairs.length} host → species pairs`);
md.push(`Used in this census: ${Object.keys(used).length} — ${Object.entries(used).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p.replace('>', ' → ')} ${n}`).join(', ') || 'none'}. Never used: ${pairs.filter((p) => !used[p]).map((p) => p.replace('>', ' → ')).join(', ')}.`);
md.push(`Hosts in the table: ${Object.keys(table).sort().join(', ')}. Same-species entries: ${pairs.filter((p) => p.split('>')[0] === p.split('>')[1]).length}. Dolomite entries: ${pairs.filter((p) => p.split('>').includes('dolomite')).length}.`);
if (Object.keys(unparsed).length) {
  md.push('');
  md.push(`Unparsed start positions: ${Object.entries(unparsed).sort((a, b) => b[1] - a[1]).map(([p, n]) => `"${p}" ${n}`).join('; ')}.`);
}
// The headline figures as data, for documents that quote them.
const summary = {
  sim_version: data.sim_version, runs: data.runs.length,
  scenarios: [...new Set(data.runs.map((r) => r.scenario))].length,
  seeds: [...new Set(data.runs.map((r) => r.seed))],
  crystals: all.length,
  byKind: Object.fromEntries(KINDS.map((k) => [k, count(all, (x) => x.kind === k)])),
  otherDocumented: count(other, (x) => x.documented),
  table: { pairs: pairs.length, hosts: Object.keys(table).length, used: Object.keys(used).length,
    sameSpecies: pairs.filter((p) => p.split('>')[0] === p.split('>')[1]).length,
    dolomite: pairs.filter((p) => p.split('>').includes('dolomite')).length,
    usedPairs: Object.entries(used).sort((a, b) => b[1] - a[1]) },
  walls: Object.entries(byScn).filter(([, sc]) => sc.wallMineral).map(([scn, sc]) => {
    const wm = sc.crystals.filter((k) => k.species === sc.wallMineral);
    return { scenario: scn, composition: sc.composition, matrix: sc.matrix, wallMineral: sc.wallMineral,
      perRun: wm.length / sc.runs, onWall: wm.length ? count(wm, (x) => x.kind === 'wall') / wm.length : null };
  }).sort((a, b) => a.scenario.localeCompare(b.scenario)),
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'substrates.md'), md.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'substrates-summary.json'), JSON.stringify(summary, null, 1));
console.log(md.join('\n'));
