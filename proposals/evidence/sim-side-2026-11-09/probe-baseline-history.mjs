#!/usr/bin/env node
/**
 * probe-baseline-history.mjs — when did a scenario's headline crystal change size?
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §3.1 and §3.4.)
 *
 * Reads every committed tests-js/baselines/seed42_v<N>.json and prints, for a few (scenario, mineral)
 * pairs, the versions between which the largest crystal changed by more than 1.5× or appeared or
 * vanished; and for gem_pegmatite the largest tourmaline and the smallest feldspar in any baseline.
 * Given a canary stratum (the vugg-canary repository, logs/<date>/v<SIM>) it also prints the same
 * pairs' spread over that stratum's seeds from the committed <scenario>/frequency.json.
 *
 * PASSIVE: runs no simulation, prints to stdout, writes nothing, exits 0. Node builtins only.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-baseline-history.mjs [<vugg-canary>/logs/<date>/v<SIM>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dir = path.join(ROOT, 'tests-js', 'baselines');
const files = fs.readdirSync(dir).map(n => /^seed42_v(\d+)\.json$/.exec(n)).filter(Boolean)
  .map(m => ({ v: Number(m[1]), file: path.join(dir, m[0]) })).sort((a, b) => a.v - b.v);
const B = files.map(f => ({ v: f.v, j: JSON.parse(fs.readFileSync(f.file, 'utf8')) }));
const mm = (um) => (um / 1000).toFixed(um > 0 && um < 10 ? 4 : 2);
console.log(`seed-42 baselines: ${files.length} (v${files[0].v} … v${files[files.length - 1].v})`);

const series = (scenario, mineral) => B.filter(b => b.j[scenario])
  .map(b => ({ v: b.v, um: b.j[scenario][mineral] ? b.j[scenario][mineral].max_um : null }));
function changes(scenario, mineral, factor = 1.5) {
  const s = series(scenario, mineral), out = [];
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1].um, b = s[i].um;
    if ((a == null) !== (b == null) || (a != null && b != null && (Math.max(a, b) + 1) / (Math.min(a, b) + 1) > factor)) {
      out.push(`v${s[i - 1].v} → v${s[i].v}: ${a == null ? 'none' : mm(a) + ' mm'} → ${b == null ? 'none' : mm(b) + ' mm'}`);
    }
  }
  return { first: s[0], last: s[s.length - 1], n: s.length, out };
}

{
  const t = series('gem_pegmatite', 'tourmaline'), f = series('gem_pegmatite', 'feldspar');
  const tv = t.filter(x => x.um != null), fv = f.filter(x => x.um != null);
  const tmax = tv.reduce((a, b) => (b.um > a.um ? b : a)), fmin = fv.reduce((a, b) => (b.um < a.um ? b : a));
  console.log(`\ngem_pegmatite is in ${t.length} baselines (v${t[0].v} … v${t[t.length - 1].v}). Tourmaline is present in ${tv.length}; its largest crystal in any of them is ${mm(tmax.um)} mm (v${tmax.v}). Feldspar is present in ${fv.length}; its smallest largest-crystal is ${mm(fmin.um)} mm (v${fmin.v}).`);
}
const PAIRS = [['naica_geothermal', 'selenite'], ['shigar_pegmatite', 'aquamarine'], ['amethyst_geode', 'quartz'],
  ['gem_pegmatite', 'tourmaline'], ['radioactive_pegmatite', 'plumbogummite'], ['radioactive_pegmatite', 'galena']];
for (const [s, m] of PAIRS) {
  const c = changes(s, m);
  console.log(`\n${s} / ${m}: in ${c.n} baselines (v${c.first.v} … v${c.last.v}); first ${c.first.um == null ? 'none' : mm(c.first.um) + ' mm'}, latest ${c.last.um == null ? 'none' : mm(c.last.um) + ' mm'}; largest crystal changed by more than 1.5×, appeared or vanished at:`);
  for (const line of c.out) console.log('   ' + line);
  if (!c.out.length) console.log('   (never)');
}

const stratum = process.argv[2];
if (stratum) {
  const rd = (s) => JSON.parse(fs.readFileSync(path.join(stratum, s, 'frequency.json'), 'utf8'));
  console.log(`\ncanary stratum ${path.basename(path.dirname(path.resolve(stratum)))}/${path.basename(path.resolve(stratum))} — largest crystal over the stratum's seeds`);
  const CANARY = [['gem_pegmatite', 'tourmaline'], ['gem_pegmatite', 'feldspar'], ['gem_pegmatite', 'topaz'], ['gem_pegmatite', 'beryl'],
    ['naica_geothermal', 'selenite'], ['shigar_pegmatite', 'aquamarine'], ['shigar_pegmatite', 'tourmaline'], ['shigar_pegmatite', 'topaz'],
    ['radioactive_pegmatite', 'plumbogummite'], ['radioactive_pegmatite', 'galena'], ['radioactive_pegmatite', 'autunite']];
  for (const [s, m] of CANARY) {
    const f = rd(s), v = f.species[m];
    console.log(`  ${s} / ${m}: ${v ? `in ${v.seeds_present} of ${f.n_seeds} seeds; min / median / max ${mm(v.size_um.min)} / ${mm(v.size_um.median)} / ${mm(v.size_um.max)} mm` : `absent in all ${f.n_seeds} seeds`}`);
  }
}
