#!/usr/bin/env node
/**
 * tools/seed-variety-census.mjs — how much does a scenario's outcome change with the seed?
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.4.)
 *
 * Reads one stratum of the nightly canary (the vugg-canary repository, logs/<date>/v<SIM>/): the
 * committed spine <scenario>/frequency.json — per species the seeds it occurred in, its mean count and
 * the minimum / median / maximum over seeds of its largest crystal — and, where the machine still
 * holds it, the local <scenario>/seeds.json with every seed's per-species summary. It runs no
 * simulation. Reported per scenario:
 *
 *   species, and how many occurred in EVERY seed (from frequency.json);
 *   whether every seed grew one species set (all species at 100 %);
 *   for the species present in every seed whose median largest crystal is >= 1 mm, the median of
 *     (max − min) / median of that largest-crystal size: the size spread a seed buys;
 *   with seeds.json: how many always-present species have the SAME crystal count in every seed, and
 *     how many different species were the largest crystal of a seed.
 *
 * The story-pocket review (PR #26, §2.5) made the same reading at 21 seeds; this is the canary's
 * larger sample. PASSIVE: exits 0, writes only .local-evidence/seed-variety-census/.
 *
 * Usage:
 *   node tools/seed-variety-census.mjs --stratum ../../vugg-canary/logs/2026-11-04/v286
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, '.local-evidence', 'seed-variety-census');
let stratum = null;
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--stratum') stratum = path.resolve(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') { console.log('node tools/seed-variety-census.mjs --stratum <vugg-canary>/logs/<date>/v<SIM>'); process.exit(0); }
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!stratum) throw new Error('give --stratum <vugg-canary>/logs/<date>/v<SIM>');
  if (!fs.existsSync(stratum)) throw new Error(`no such stratum: ${stratum}`);
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const meta = fs.existsSync(path.join(stratum, 'meta.json')) ? readJson(path.join(stratum, 'meta.json')) : {};
const scenarios = fs.readdirSync(stratum).filter(n => fs.existsSync(path.join(stratum, n, 'frequency.json'))).sort();

const T = [];
const say = (s = '') => { T.push(s); console.log(s); };
say(`seed-variety census — canary stratum ${path.basename(path.dirname(stratum))}/${path.basename(stratum)}${meta.sha ? `, vugg ${meta.sha}` : ''}${meta.sim_version ? `, SIM ${meta.sim_version}` : ''}; ${scenarios.length} scenarios`);
say('scenario                               seeds  species  in every seed  one species set  size spread  | same count in every seed  different largest species');
const rows = [];
let pairs = 0, always = 0, oneSet = 0, constCount = 0, constOf = 0, oneStar = 0, starOf = 0;
for (const s of scenarios) {
  const f = readJson(path.join(stratum, s, 'frequency.json'));
  const sp = Object.entries(f.species || {});
  const every = sp.filter(([, v]) => v.seeds_present === f.n_seeds);
  pairs += sp.length; always += every.length;
  const single = every.length === sp.length;
  if (single) oneSet++;
  const spreads = every.filter(([, v]) => v.size_um && v.size_um.median >= 1000)
    .map(([, v]) => (v.size_um.max - v.size_um.min) / v.size_um.median).sort((a, b) => a - b);
  const spread = spreads.length ? spreads[Math.floor(spreads.length / 2)] : null;
  let same = null, stars = null;
  const seedsFile = path.join(stratum, s, 'seeds.json');
  if (fs.existsSync(seedsFile)) {
    const seeds = readJson(seedsFile), ids = Object.keys(seeds);
    same = every.filter(([m]) => new Set(ids.map(id => seeds[id][m]?.total)).size === 1).length;
    constCount += same; constOf += every.length;
    const starSet = new Set();
    for (const id of ids) {
      let star = null, best = -1;
      for (const [m, v] of Object.entries(seeds[id])) if (v.max_um > best) { best = v.max_um; star = m; }
      if (star) starSet.add(star);
    }
    stars = starSet.size;
    if (sp.length) { starOf++; if (stars === 1) oneStar++; }
  }
  rows.push({ scenario: s, seeds: f.n_seeds, species: sp.length, inEverySeed: every.length, oneSpeciesSet: single, sizeSpread: spread, sameCount: same, largestSpecies: stars });
  say(`${s.padEnd(38)} ${String(f.n_seeds).padStart(5)} ${String(sp.length).padStart(8)} ${String(every.length).padStart(14)} ${(single ? 'yes' : 'no').padStart(16)} ${(spread == null ? '—' : (spread * 100).toFixed(0) + ' %').padStart(12)}  | ${String(same ?? '—').padStart(24)} ${String(stars ?? '—').padStart(26)}`);
}
say(`\nscenarios with one species set in every seed: ${oneSet} of ${scenarios.length}`);
say(`(scenario, species) pairs: ${pairs}; present in every seed: ${always} (${(always / Math.max(1, pairs) * 100).toFixed(0)} %)`);
if (constOf) say(`from seeds.json: of the ${constOf} always-present pairs, ${constCount} (${(constCount / constOf * 100).toFixed(0)} %) have the same crystal count in every seed; the same species is the largest crystal of every seed in ${oneStar} of ${starOf} scenarios with crystals`);
else say('seeds.json is not on this machine (it is a local, regenerable tier of the canary): the count and largest-species readings were skipped');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'report.txt'), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ stratum: `${path.basename(path.dirname(stratum))}/${path.basename(stratum)}`, meta: { sha: meta.sha, sim_version: meta.sim_version, n_seeds: meta.n_seeds },
  scenarios: scenarios.length, oneSpeciesSet: oneSet, pairs, inEverySeed: always, sameCount: constOf ? constCount : null, sameCountOf: constOf || null,
  oneLargestSpecies: starOf ? oneStar : null, oneLargestSpeciesOf: starOf || null, rows }, null, 1) + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/report.{txt,json}`);
