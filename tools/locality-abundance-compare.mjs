#!/usr/bin/env node
/**
 * tools/locality-abundance-compare.mjs — sim crystal ratios vs real-world abundance proxies
 * (locality-abundance review, 2026-10-21).
 *
 * Inputs:
 *   .local-evidence/assemblage-census/runs.jsonl        (tools/assemblage-census.mjs, census v2)
 *   proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json   (the captured proxies: Mineralienatlas
 *                                                        photo counts, eBay listing titles
 *                                                        classified by tools/market-title-dictionary.mjs,
 *                                                        literature classes)
 *   proposals/DATA-LOCALITY-ABUNDANCE-CAPTURE-2026-10-21.json  (the two raw browser captures; the
 *                                                        tool re-derives their recorded hashes and
 *                                                        checks every data-file count against them
 *                                                        before comparing anything)
 *
 * For each scenario anchored to a real locality it prints, per species, the sim's share of
 * surviving crystals, of crystals ≥ 0.1 mm (micromount size), of eye-visible (≥ 1 mm) crystals
 * and of crystal volume (all averaged over the seed panel), beside the locality's share of
 * photographs, of listings, and the literature class. "Visible" and "micromount" count crystals the
 * simulator does not flag as enclosed (enclosed_by: a footprint projection, not an envelopment test —
 * js/21-enclosure-authority.ts); every verdict is also worked out with the flagged crystals counted,
 * and one that changes is MEASURE-DEPENDENT. Shares, not raw counts: the photo archive of
 * Tsumeb and the eBay supply of Herkimer quartz differ by orders of magnitude, and only the
 * within-locality ratio is a claim about the rock. Units differ on the two sides — the sim counts
 * crystals per cavity, the proxies count specimens people photograph or sell — so only ranks are
 * compared, never values.
 *
 * The real ranking is the mean of the photo and listing shares; a source with fewer than THIN
 * observations does not vote, and nor do listings from a search the data file marks market_wide
 * (not locality-specific). Spearman ρ is computed over the UNION of: the sim's top 12 by visible
 * share, the sim's top 12 by surviving share, the photos' top 12, the listings' top 8, and every
 * species the literature calls abundant or common; a species absent from one side scores 0 there
 * (ties get average ranks). With that zero-padding ρ behaves largely as a set-overlap statistic.
 *
 * Top three: chosen by value alone, never by row order. When species tie across third place
 * (common: strictly gated species sit at exactly 1.00 crystal per vug in every seed) all of them are
 * listed as tied, and the verdict is worked out under every way the ties can break, and under
 * every species tied for the sim's lead. If those disagree, the verdict is TIE-DEPENDENT.
 *
 * Verdicts: AGREES (ρ ≥ 0.5 and at least min(2, |sim top 3|) of the real top three are in the
 * sim's top three), DISAGREES (ρ < 0, or the sim's most numerous visible species is < 1 % of the
 * real record), PARTLY otherwise, THIN when no source votes, NO VISIBLE CRYSTALS when the sim grows
 * nothing ≥ 1 mm, TIE-DEPENDENT as above, MEASURE-DEPENDENT when the verdict changes with whether
 * flagged crystals count as visible, OUT OF SCOPE for a scenario whose whole real record lies outside
 * what it models (SCENARIO_OUT_OF_SCOPE). Bootstrap, BOOT resamples each, three ways: the seeds
 * (the sim's own noise); the photographs and listing mentions as multinomial draws (the proxies'
 * sampling noise, and only a floor on it, since one collector photographs a whole drawer); and both
 * at once. Each gives ρ a 5–95 % band and the fraction of resamples whose verdict differs; the
 * joint bootstrap is rerun under MC_SALTS other seeds to show its own Monte-Carlo spread.
 *
 * Flags (thresholds printed with the tables):
 *   OVER   — the sim gives a species ≥ 10 % of its visible crystals while photos AND listings are < 1 %.
 *   UNDER  — the photo share is ≥ 10 % while the sim gives it < 2 % of visible crystals.
 *   ABSENT — the sim grows a species (any size, ≥ 25 % of seeds) that neither proxy records at all.
 *
 * Fleet sections: the scenarios' own abundance words vs their counts (by surviving count, visible
 * count and volume; reasons whose minor word is not about the species' own abundance are listed,
 * not counted); the nucleation-gate census, read from the code with each gate line printed (strict
 * / soft / active-capped / cap-only / transformation product, plus hand-coded lifetime caps); what
 * happens to each real top-three species (never forms / dust / visible / tied / sim top three) by
 * gate, by count and by volume — leaving out, with reasons, species the scenario does not claim
 * (OUT_OF_CLAIM) and species under FATE_FLOOR of the record that the literature does not call
 * abundant or common; the dust list; robustness of the median ρ to the measure (including the
 * with-enclosed count); how many (scenario, species) pairs have the same count in every seed (why
 * the seed bands are narrow).
 *
 * PASSIVE: reads, prints, writes .local-evidence/locality-abundance/compare.{md,json}, exits 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MARKET_TITLE_DICTIONARY, buildMatchers, classifyTitle } from './market-title-dictionary.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNS = path.join(ROOT, '.local-evidence', 'assemblage-census', 'runs.jsonl');
const DATA = path.join(ROOT, 'proposals', 'DATA-LOCALITY-ABUNDANCE-2026-10-21.json');
const CAPTURE = path.join(ROOT, 'proposals', 'DATA-LOCALITY-ABUNDANCE-CAPTURE-2026-10-21.json');
const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;

const OVER_SIM = 0.10, OVER_REAL = 0.01, UNDER_REAL = 0.10, UNDER_SIM = 0.02, ABSENT_SEEDS = 0.25;
const THIN = 20;    // fewer photos (or listing mentions) than this and the source does not vote
const BOOT = 200;   // seed-bootstrap resamples per scenario
const MC_SALTS = [1, 2, 3];   // extra bootstrap seeds: the Monte-Carlo spread of the joint bootstrap
const DUST_REAL = 0.10;
// A real top-three species counts as a headline slot in the fate table only with at least this
// share of the voting record, or a literature class of abundant or common (Herkimer's third place
// is 0.9 % of a record that is 94 % quartz).
const FATE_FLOOR = 0.05;
// The scope rule, applied to every real top-three species whether the simulator grows it or not: a
// species is set aside when the locality's record of it comes from a part of the deposit the
// scenario does not model, by the scenario's own description and the review's section on it. It
// is listed with the reason. (Whether the scenario's species lists name it is a separate matter,
// reported as each slot's contract status.)
const OUT_OF_CLAIM = {
  'tn457_barite_pulses|fluorite': 'the scenario is one outer-zone barite-on-sphalerite cavity; the orefield\'s fluorite, galena and quartz belong to the central zone (review §5.1)',
  'tn457_barite_pulses|galena': 'the scenario is one outer-zone barite-on-sphalerite cavity (review §5.1)',
  'tn457_barite_pulses|quartz': 'the scenario is one outer-zone barite-on-sphalerite cavity (review §5.1)',
  'naica_geothermal|fluorite': 'the scenario is the giant-gypsum cave pool; the fluorite is the ore body\'s (review §5.4)',
  'epithermal_telluride|native_gold': 'the scenario is the primary telluride vein; the record\'s native gold is "set free by the oxidation of these tellurides" (Lindgren & Ransome 1904; review §5.3)',
};
// A scenario whose whole real record lies outside what it models is not scored at all.
const SCENARIO_OUT_OF_SCOPE = {
  tn457_barite_pulses: 'all three of the orefield\'s top species belong to the central fluorite zone; the scenario is one outer-zone barite cavity (review §5.1)',
};
const matchers = buildMatchers(MARKET_TITLE_DICTIONARY);

// Mineralienatlas names are classified by the same dictionary as listing titles, so "Gypsum",
// "Selenite" and "Desert Rose" land on one key exactly as they do in the market counts. A few
// archive names are German or compound words the title dictionary does not split; they map here,
// not in the dictionary, so the dictionary stays the exact text that produced the listing counts.
const MA_ALIASES = {
  'Apophyllit-Gruppe': 'apophyllite', 'Sphärosiderite': 'siderite', 'Fadenquartz': 'quartz',
  'Eisenkiesel': 'quartz', 'Marmatite': 'sphalerite', 'Nickelskutterudite': 'skutterudite',
  'Romanèchite': 'romanechite', 'Pyrobitumen': 'x:bitumen',
};
function maKey(name) {
  if (MA_ALIASES[name]) return MA_ALIASES[name];
  const ids = classifyTitle(name, matchers);
  return ids.length ? ids[0] : `ma:${name.toLowerCase()}`;
}

function shares(obj) {
  const tot = Object.values(obj).reduce((s, v) => s + v, 0);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = tot > 0 ? v / tot : 0;
  return { out, tot };
}
function ranks(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const r = new Array(values.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function med(a) {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
}
function quantile(a, q) {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.max(0, Math.round(q * (b.length - 1))))];
}
function spearman(a, b) {
  if (a.length < 3) return null;
  const ra = ranks(a), rb = ranks(b);
  const n = a.length, ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}
// Deterministic PRNG for the bootstrap (mulberry32), so the report is reproducible; each scenario
// seeds it from its name (FNV-1a).
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
// A multinomial resample of a count table: each photograph or listing mention is one draw.
function resample(counts, rnd) {
  const keys = Object.keys(counts), cum = [];
  let tot = 0;
  for (const k of keys) { tot += counts[k]; cum.push(tot); }
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (let i = 0; i < tot; i++) {
    const x = rnd() * tot;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > x) hi = mid; else lo = mid + 1; }
    out[keys[lo]]++;
  }
  return out;
}
// Means of integer counts over the same seeds are equal floats when the counts are equal.
const same = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
// All k-element subsets of arr (a tie pool is a handful of species).
function combos(arr, k) {
  if (k <= 0) return [[]];
  if (k >= arr.length) return [arr.slice()];
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}
// The top n by `key`, from the values alone: `sure` are in on value; when species tie across the
// boundary, `tied` holds all of them and `slots` says how many of them the top n has room for.
function topTie(rows, key, n = 3) {
  const pos = rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]);
  if (pos.length <= n) return { sure: pos.map((r) => r.k), tied: [], slots: 0 };
  const cut = pos[n - 1][key];
  const sure = pos.filter((r) => r[key] > cut && !same(r[key], cut)).map((r) => r.k);
  const tied = pos.filter((r) => same(r[key], cut)).map((r) => r.k);
  if (sure.length + tied.length <= n) return { sure: [...sure, ...tied], tied: [], slots: 0 };
  return { sure, tied, slots: n - sure.length };
}
const topText = (t) => [...t.sure, ...(t.tied.length ? [`${t.slots} of {${t.tied.join(', ')}} (tied)`] : [])].join(', ');

// ---- sim side
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const simVersions = [...new Set(runs.map((r) => r.sim_version))];
if (simVersions.length !== 1) throw new Error(`runs.jsonl mixes SIM versions ${simVersions.join(',')}`);
// Census version 2 records exposed (not enclosed) counts; an older file cannot answer the question.
if (runs.some((r) => (r.census ?? 1) < 2)) throw new Error('runs.jsonl has census-version-1 rows (no exposed counts); re-run tools/assemblage-census.mjs');
const runsBy = {};
for (const r of runs) (runsBy[r.scenario] ||= []).push(r);
for (const [scn, rs] of Object.entries(runsBy)) {
  const seen = new Set();
  for (const r of rs) { if (seen.has(r.seed)) throw new Error(`${scn} seed ${r.seed} appears twice`); seen.add(r.seed); }
}
function simTable(scn, sample = null) {
  const rs = sample || runsBy[scn];
  if (!rs || !rs.length) return null;
  const n = rs.length;
  // "Visible" and "micromount" count crystals not flagged as enclosed (the census's _exp fields); the
  // largest-crystal figures are the largest unflagged crystal. visAll keeps the count with flagged
  // crystals, for the second reading of every verdict.
  const per = {};
  for (const r of rs) {
    for (const [m, v] of Object.entries(r.species)) {
      const p = (per[m] ||= { surv: 0, micro: 0, vis: 0, visAll: 0, vol: 0, present: 0, visPresent: 0, maxmm: [], maxmmAll: [] });
      p.surv += v.n_surv; p.micro += v.n_01_exp; p.vis += v.n_1_exp; p.visAll += v.n_1; p.vol += v.vol_mm3;
      if (v.n_surv > 0) { p.present++; p.maxmm.push(v.max_exp_mm); p.maxmmAll.push(v.max_mm); }
      if (v.n_1_exp > 0) p.visPresent++;
    }
  }
  const surv = {}, micro = {}, vis = {}, visAll = {}, vol = {}, visPres = {};
  for (const [m, p] of Object.entries(per)) {
    surv[m] = p.surv / n; micro[m] = p.micro / n; vis[m] = p.vis / n; visAll[m] = p.visAll / n;
    vol[m] = p.vol / n; visPres[m] = p.visPresent / n;
  }
  return {
    seeds: n, surv: shares(surv), micro: shares(micro), vis: shares(vis), visAll: shares(visAll), vol: shares(vol),
    visPres: shares(visPres), meanSurv: surv, meanVis: vis, meanVisAll: visAll, meanVol: vol,
    present: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, p.present / n])),
    visPresent: visPres,
    medMax: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, med(p.maxmm) ?? 0])),
    maxMax: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, p.maxmm.length ? Math.max(...p.maxmm) : 0])),
    medMaxAll: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, med(p.maxmmAll) ?? 0])),
  };
}

// ---- real side
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
// Provenance: the data file's counts must be exactly the two browser captures, and the captures
// must hash to the values the page reported (recorded in the data file's sources block).
{
  const cap = JSON.parse(fs.readFileSync(CAPTURE, 'utf8'));
  const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const recorded = (s) => (String(s).match(/[0-9a-f]{64}/) || [])[0];
  const hMa = sha(Object.keys(cap.mineralienatlas).sort().map((k) => `${k}\n${cap.mineralienatlas[k].p}\n`).join(''));
  const hEb = sha(JSON.stringify(cap.ebay));
  if (hMa !== recorded(data.sources.mineralienatlas.verification)) throw new Error(`photo capture hashes to ${hMa}, not the recorded value`);
  if (hEb !== recorded(data.sources.ebay.verification)) throw new Error(`listing capture hashes to ${hEb}, not the recorded value`);
  const pairs = (s, sep, kv) => Object.fromEntries((s || '').split(sep).filter(Boolean)
    .map((x) => [x.slice(0, x.lastIndexOf(kv)), Number(x.slice(x.lastIndexOf(kv) + 1))]));
  const eq = (a, b) => JSON.stringify(Object.entries(a || {}).sort()) === JSON.stringify(Object.entries(b || {}).sort());
  for (const [loc, L] of Object.entries(data.localities)) {
    const k = cap.keymap[loc];
    if (!k) throw new Error(`no capture key for locality ${loc}`);
    const m = k.mineralienatlas ? cap.mineralienatlas[k.mineralienatlas] : null;
    if (m ? !(eq(pairs(m.p, ';', '='), L.mineralienatlas?.photos) && JSON.stringify(m.ids) === JSON.stringify(L.mineralienatlas?.location_ids))
      : L.mineralienatlas) throw new Error(`${loc}: photo counts differ from the capture`);
    const e = cap.ebay[k.ebay], d = L.ebay || {};
    if (!e || e.q !== (d.queries || []).join('|') || e.L !== d.listings || e.F !== d.families || e.lapF !== d.lapidary_families
      || e.unclF !== d.unclassified_families || !eq(pairs(e.mF, ' ', ':'), d.mention_families) || !eq(pairs(e.lF, ' ', ':'), d.lead_families)) {
      throw new Error(`${loc}: listing counts differ from the capture`);
    }
  }
}
function realTable(loc) {
  const L = data.localities[loc];
  // Locality aliases: a generic market word that means one species at this locality
  // (Jeffrey Mine "garnet" is grossular). Declared in the data file, with the reason.
  const alias = (k) => L.aliases?.[k]?.to || k;
  const photos = {};
  for (const [name, c] of Object.entries(L.mineralienatlas?.photos || {})) {
    const k = alias(maKey(name));
    photos[k] = (photos[k] || 0) + c;
  }
  const ebay = {};
  for (const [k0, c] of Object.entries(L.ebay?.mention_families || {})) {
    const k = alias(k0);
    ebay[k] = (ebay[k] || 0) + c;
  }
  delete ebay['x:fossil'];
  // A search that is not locality-specific (Bimbowrie's "chiastolite" finds chiastolite from any
  // locality) is declared in the data file with its reason; such listings are shown, never voted.
  return realFrom(photos, ebay, L.literature?.species || {}, !!L.ebay?.market_wide);
}
const realFrom = (photos, ebay, lit, marketWide) => ({ photos: shares(photos), ebay: shares(ebay), lit, marketWide, counts: { photos, ebay } });
const litLabel = (e) => (e?.class ? `${e.class}${e.status && e.status !== 'V' ? ` (${e.status})` : ''}` : null);

const pct = (x) => (x == null ? '—' : x === 0 ? '0' : x < 0.001 ? '<0.1' : (100 * x).toFixed(x < 0.1 ? 1 : 0));
const mm = (x) => (x ? x.toFixed(x < 1 ? 2 : 1) : '—');

// The comparison for one scenario, on the full seed panel or a bootstrap sample of it.
function compareOne(scn, loc, R, sample = null) {
  const S = simTable(scn, sample);
  const keys = new Set([
    ...Object.entries(S.vis.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
    ...Object.entries(S.surv.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
    ...Object.entries(R.photos.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
    ...Object.entries(R.ebay.out).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k),
    ...Object.entries(R.lit).filter(([, v]) => /^(AB|CO)/.test(v?.class || '')).map(([k]) => k),
  ]);
  const usePhoto = R.photos.tot >= THIN, useEbay = R.ebay.tot >= THIN && !R.marketWide;
  const rows = [...keys].map((k) => {
    const photo = R.photos.out[k] || 0, ebay = R.ebay.out[k] || 0;
    const parts = [usePhoto ? photo : null, useEbay ? ebay : null].filter((x) => x != null);
    return {
      k, engine: !!SPEC[k], simSurv: S.surv.out[k] || 0, simMicro: S.micro.out[k] || 0, simVis: S.vis.out[k] || 0,
      simVisAll: S.visAll.out[k] || 0, simVol: S.vol.out[k] || 0, simVisPres: S.visPres.out[k] || 0,
      meanSurv: S.meanSurv[k] || 0, meanVis: S.meanVis[k] || 0, meanVisAll: S.meanVisAll[k] || 0,
      present: S.present[k] || 0, visPresent: S.visPresent[k] || 0, medMax: S.medMax[k] || 0, maxMax: S.maxMax[k] || 0, medMaxAll: S.medMaxAll[k] || 0,
      photo, ebay, real: parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : null,
      lit: R.lit[k]?.class || null, litShown: litLabel(R.lit[k]),
    };
  }).sort((a, b) => ((b.real ?? 0) - (a.real ?? 0)) || (b.simVis - a.simVis));   // display order only
  const realOk = usePhoto || useEbay;
  const rho = (key) => (realOk ? spearman(rows.map((r) => r[key]), rows.map((r) => r.real)) : null);
  const realTop = realOk ? topTie(rows, 'real') : { sure: [], tied: [], slots: 0 };
  // The verdict on one simulator measure, under every way the ties can break (third place on both
  // sides, and the sim's lead).
  const judge = (key) => {
    const simTop = topTie(rows, key), rhoReal = rho(key);
    const maxVis = Math.max(0, ...rows.map((r) => r[key]));
    const leaders = maxVis > 0 ? rows.filter((r) => same(r[key], maxVis)).map((r) => r.k) : [null];
    const outcomes = new Set();
    let ovMin = Infinity, ovMax = -Infinity;
    for (const rc of combos(realTop.tied, realTop.slots)) {
      for (const sc of combos(simTop.tied, simTop.slots)) {
        const rt = [...realTop.sure, ...rc], st = [...simTop.sure, ...sc];
        const overlap = rt.filter((k) => st.includes(k)).length;
        ovMin = Math.min(ovMin, overlap); ovMax = Math.max(ovMax, overlap);
        for (const lead of leaders) {
          const leadReal = rows.find((r) => r.k === lead)?.real ?? 0;
          if (!realOk) outcomes.add('THIN');
          else if (!st.length) outcomes.add('NO VISIBLE CRYSTALS');
          else if (rhoReal != null && rhoReal >= 0.5 && overlap >= Math.min(2, st.length)) outcomes.add('AGREES');
          else if ((rhoReal != null && rhoReal < 0) || leadReal < OVER_REAL) outcomes.add('DISAGREES');
          else outcomes.add('PARTLY');
        }
      }
    }
    return { simTop, rhoReal, leaders, overlap: [ovMin, ovMax], verdict: outcomes.size === 1 ? [...outcomes][0] : 'TIE-DEPENDENT',
      verdictOptions: [...outcomes].sort() };
  };
  const J = judge('simVis'), JAll = judge('simVisAll');
  // The simulator's enclosure flag is a footprint projection, not an envelopment test (review §2.1,
  // §4.4), so a verdict must hold whether flagged crystals count as visible or not: one that differs
  // between the two readings is MEASURE-DEPENDENT. TIE-DEPENDENT is kept for variation from ties
  // alone.
  let options = [...new Set([...J.verdictOptions, ...JAll.verdictOptions])].sort();
  let verdict = options.length === 1 ? options[0]
    : options.every((v) => J.verdictOptions.includes(v)) ? J.verdict : 'MEASURE-DEPENDENT';
  if (SCENARIO_OUT_OF_SCOPE[scn]) { verdict = 'OUT OF SCOPE'; options = ['OUT OF SCOPE']; }
  return { S, rows, realOk, usePhoto, useEbay, rhoReal: J.rhoReal, rhoSurv: rho('simSurv'), rhoMicro: rho('simMicro'),
    rhoVol: rho('simVol'), rhoVisPres: rho('simVisPres'), realTop, simTop: J.simTop, simTopVol: topTie(rows, 'simVol'),
    leaders: J.leaders, overlap: J.overlap, verdict, verdictOptions: options, exposedVerdict: J.verdict,
    withEnclosed: { rho: JAll.rhoReal, simTop: JAll.simTop, verdict: JAll.verdict, verdictOptions: JAll.verdictOptions } };
}

const lines = [];
const json = {};
for (const [loc, L] of Object.entries(data.localities)) {
  for (const scn of L.scenarios || []) {
    if (!runsBy[scn]) continue;
    const R = realTable(loc);
    const C = compareOne(scn, loc, R);
    const { rows } = C;
    // Bootstrap three ways: how much of ρ and the verdict is seed noise, proxy sampling noise, both?
    // Salt 0 is the reported run; MC_SALTS rerun the joint bootstrap with other seeds to show its own
    // Monte-Carlo spread.
    const rs = runsBy[scn];
    const bootstrap = (salt, modes) => {
      const rnd = prng(hash(scn) ^ salt);
      const drawSeeds = () => rs.map(() => rs[Math.floor(rnd() * rs.length)]);
      const drawReal = () => realFrom(resample(R.counts.photos, rnd), resample(R.counts.ebay, rnd), R.lit, R.marketWide);
      const runsOf = { seeds: () => compareOne(scn, loc, R, drawSeeds()), proxies: () => compareOne(scn, loc, drawReal()),
        both: () => compareOne(scn, loc, drawReal(), drawSeeds()) };
      const acc = Object.fromEntries(modes.map((m) => [m, { rho: [], flips: 0 }]));
      for (let b = 0; b < BOOT; b++) {
        for (const mode of modes) {
          const B = runsOf[mode]();
          if (B.rhoReal != null) acc[mode].rho.push(B.rhoReal);
          // A TIE-DEPENDENT verdict is matched by any resample whose outcomes lie within its options.
          if (!B.verdictOptions.every((v) => C.verdictOptions.includes(v))) acc[mode].flips++;
        }
      }
      return Object.fromEntries(Object.entries(acc).map(([mode, a]) => [mode, {
        band: a.rho.length ? [quantile(a.rho, 0.05), quantile(a.rho, 0.95)] : null, flips: a.flips / BOOT }]));
    };
    const boot = bootstrap(0, ['seeds', 'proxies', 'both']);
    const mc = MC_SALTS.map((salt) => bootstrap(salt, ['both']).both);
    const flags = [];
    for (const r of rows) {
      if (r.simVis >= OVER_SIM && r.photo < OVER_REAL && r.ebay < OVER_REAL) flags.push(`OVER ${r.k} (sim ${pct(r.simVis)}% of visible crystals; photos ${pct(r.photo)}%, listings ${pct(r.ebay)}%)`);
      if (r.photo >= UNDER_REAL && r.simVis < UNDER_SIM) flags.push(`UNDER ${r.k} (photos ${pct(r.photo)}%; sim ${pct(r.simVis)}% of visible crystals${r.engine ? '' : ' — NO ENGINE'})`);
      if (r.present >= ABSENT_SEEDS && r.photo === 0 && r.ebay === 0 && C.S && R.photos.tot > 0) flags.push(`ABSENT ${r.k} (sim grows it in ${pct(r.present)}% of seeds; no photo, no listing)`);
    }
    // The literature votes separately: which of the sim's top three visible species does it rate
    // rare or undocumented, and which species does it call abundant that the sim never shows ≥ 1 mm?
    const litLow = [...C.simTop.sure, ...C.simTop.tied].filter((k) => /^(RA|VR|ND|Q)/.test(rows.find((r) => r.k === k)?.lit || ''))
      .map((k) => { const r = rows.find((x) => x.k === k); return r.litShown && /\(/.test(r.litShown) ? `${k} (${r.litShown.match(/\((\w+)\)/)[1]})` : k; });
    const litMissing = rows.filter((r) => /^AB/.test(r.lit || '') && r.simVis === 0).map((r) => r.k);
    json[scn] = { locality: loc, seeds: C.S.seeds, photos_total: R.photos.tot, listings_total: R.ebay.tot,
      votes: { photos: C.usePhoto, listings: C.useEbay },
      rhoReal: C.rhoReal, rhoSurv: C.rhoSurv, rhoMicro: C.rhoMicro, rhoVol: C.rhoVol, rhoVisPres: C.rhoVisPres,
      boot, band: boot.both.band, verdictFlips: boot.both.flips, mc,
      realTop: C.realTop, simTop: C.simTop, simTopVol: C.simTopVol, simLeaders: C.leaders, overlap: C.overlap,
      verdict: C.verdict, verdictOptions: C.verdictOptions, exposedVerdict: C.exposedVerdict, withEnclosed: C.withEnclosed,
      litLow, litMissing, flags, rows };
    const bandText = (b) => (b ? `${b[0].toFixed(2)} to ${b[1].toFixed(2)}` : '—');
    const listingNote = R.marketWide ? ' — a market-wide search, does not vote' : C.useEbay ? '' : ' — does not vote';
    lines.push(`\n### ${scn}  ←  ${loc}   (sim ${C.S.seeds} seeds; ${R.photos.tot} photos${C.usePhoto ? '' : ' — does not vote'}; ${R.ebay.tot} listing mentions${listingNote})`);
    const rhoTxt = (x) => x?.toFixed(2) ?? '—';
    lines.push(`ρ(sim visible-count, real) = ${rhoTxt(C.rhoReal)} [5–95 % band: seeds ${bandText(boot.seeds.band)}, proxies ${bandText(boot.proxies.band)}, both ${bandText(boot.both.band)}; verdict differs in ${(100 * boot.seeds.flips).toFixed(0)} / ${(100 * boot.proxies.flips).toFixed(0)} / ${(100 * boot.both.flips).toFixed(0)} % of resamples]   ρ(sim volume, real) = ${rhoTxt(C.rhoVol)}   ρ(sim surviving count, real) = ${rhoTxt(C.rhoSurv)}   ρ(sim ≥ 0.1 mm count, real) = ${rhoTxt(C.rhoMicro)}   ρ(≥ 1 mm counting enclosed crystals, real) = ${rhoTxt(C.withEnclosed.rho)}`);
    if (C.verdict === 'TIE-DEPENDENT') lines.push(`Verdict TIE-DEPENDENT: ${C.verdictOptions.join(' or ')} depending on how ties break (sim top three: ${topText(C.simTop)}; sim lead: ${C.leaders.join(' = ')}).`);
    if (C.verdict === 'MEASURE-DEPENDENT') lines.push(`Verdict MEASURE-DEPENDENT: ${C.exposedVerdict} with flagged crystals left out, ${C.withEnclosed.verdict} with them counted.`);
    if (C.verdict === 'OUT OF SCOPE') lines.push(`Verdict OUT OF SCOPE: ${SCENARIO_OUT_OF_SCOPE[scn]} (on its own measures it would be ${C.exposedVerdict}).`);
    if (C.withEnclosed.verdict !== C.verdict || topText(C.withEnclosed.simTop) !== topText(C.simTop)) {
      lines.push(`Counting enclosed crystals too: verdict ${C.withEnclosed.verdict}${C.withEnclosed.verdict === 'TIE-DEPENDENT' ? ` (${C.withEnclosed.verdictOptions.join(' or ')})` : ''}, sim top three ${topText(C.withEnclosed.simTop)}.`);
    }
    lines.push('Visible = ≥ 1 mm and not flagged as enclosed by the simulator; "with flagged" adds the flagged ≥ 1 mm crystals; the largest crystal is the largest unflagged one.');
    lines.push('| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥0.1 mm | sim % of ≥1 mm | ≥1 mm per vug, unflagged / with flagged | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
    for (const r of rows) {
      lines.push(`| ${r.k} | ${r.meanSurv.toFixed(1)} | ${pct(r.present)}% | ${pct(r.simSurv)} | ${pct(r.simMicro)} | ${pct(r.simVis)} | ${r.meanVis.toFixed(2)} / ${r.meanVisAll.toFixed(2)} | ${pct(r.simVol)} | ${mm(r.medMax)} | ${pct(r.visPresent)}% | ${pct(r.photo)} | ${pct(r.ebay)} | ${r.litShown ?? ''} |`);
    }
    if (flags.length) lines.push(`\nFlags: ${flags.join('; ')}`);
  }
}

// ---- the scenarios' own abundance words vs their own crystal counts
// Every scenario lists the species its evidence seeds deliver (expects_species, and
// deterministic_species / statistical_species with a written reason). When a reason calls a
// species minor, subordinate, accessory, trace or rare, the scenario has made an abundance claim.
// "Trace" and "accessory" usually mean volume, so each case is tested three ways: surviving
// crystals, visible (≥ 1 mm) crystals and volume, each against the median headline species.
const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS } = await h.loadSimBundle({ toolName: 'locality-abundance-compare' });
const MINOR_WORDS = /\b(minor|subordinate|accessory|trace|rare|sparse|scarce|small amounts?)\b/i;
// Read by hand (review round 2): in these reasons the minor word is not about the species' own
// abundance, so they are listed but not counted.
const NOT_AN_ABUNDANCE_CLAIM = {
  'roughten_gill|mottramite': '"trace" describes the scenario\'s vanadium ("the scenario\'s trace V is specifically retained for this phase")',
  'schneeberg|quartz': '"accessory" is its role in the contract; the same reason calls quartz "fundamental vein and pegmatite gangue"',
};
lines.push('\n## The scenarios\' own abundance words vs their crystal counts');
lines.push('A species whose own deterministic/statistical reason calls it minor (or subordinate, accessory, trace, rare) and which out-numbers the median headline (expects_species) species in surviving crystals per vug; the last three columns say whether it ALSO out-numbers them in visible crystals and out-weighs them in volume.');
lines.push('| scenario | species | its reason says | crystals per vug | headline median | visible per vug | headline median visible | holds by visible count | volume share | headline median volume share | holds by volume |');
lines.push('|---|---|---|---:|---:|---:|---:|---|---:|---:|---|');
const selfClaims = [], notClaims = [];
for (const scn of Object.keys(SCENARIOS).sort()) {
  const spec = SCENARIOS[scn]._json5_spec || {};
  const S = simTable(scn);
  if (!S) continue;
  const expects = (spec.expects_species || []).map((e) => (typeof e === 'string' ? e : e.mineral));
  const hSurv = med(expects.map((m) => S.meanSurv[m] || 0));
  const hVis = med(expects.map((m) => S.meanVis[m] || 0));
  const hVol = med(expects.map((m) => S.vol.out[m] || 0));
  for (const field of ['deterministic_species', 'statistical_species']) {
    for (const e of spec[field] || []) {
      if (!e || typeof e !== 'object' || !MINOR_WORDS.test(e.reason || '')) continue;
      const n = S.meanSurv[e.mineral] || 0;
      if (hSurv == null || !(n > hSurv && n >= 1)) continue;
      if (NOT_AN_ABUNDANCE_CLAIM[`${scn}|${e.mineral}`]) { notClaims.push(`${e.mineral} at ${scn}: ${NOT_AN_ABUNDANCE_CLAIM[`${scn}|${e.mineral}`]}`); continue; }
      const word = (e.reason.match(MINOR_WORDS) || [''])[0];
      const nVis = S.meanVis[e.mineral] || 0, v = S.vol.out[e.mineral] || 0;
      const byVis = nVis > hVis && nVis > 0, byVol = v > hVol && v > 0;
      selfClaims.push({ scenario: scn, mineral: e.mineral, word, field, perVug: n, headlineMedian: hSurv,
        visPerVug: nVis, headlineVis: hVis, byVis, volShare: v, headlineVol: hVol, byVol });
      lines.push(`| ${scn} | ${e.mineral} | "${word}" (${field.replace('_species', '')}) | ${n.toFixed(1)} | ${hSurv.toFixed(1)} | ${nVis.toFixed(2)} | ${hVis.toFixed(2)} | ${byVis ? 'yes' : 'no'} | ${pct(v)} | ${pct(hVol)} | ${byVol ? 'yes' : 'no'} |`);
    }
  }
}
{
  const n = (f) => selfClaims.filter(f).length;
  const words = {};
  for (const c of selfClaims) words[c.word.toLowerCase()] = (words[c.word.toLowerCase()] || 0) + 1;
  lines.push(`\n${selfClaims.length} cases (${new Set(selfClaims.map((c) => c.mineral)).size} distinct species) out-number the headline median in surviving crystals. Also in visible crystals: ${n((c) => c.byVis)}; also in volume share: ${n((c) => c.byVol)}; both: ${n((c) => c.byVis && c.byVol)}; visible only: ${n((c) => c.byVis && !c.byVol)}; volume only: ${n((c) => !c.byVis && c.byVol)}; neither: ${n((c) => !c.byVis && !c.byVol)}. Words: ${Object.entries(words).sort((a, b) => b[1] - a[1]).map(([w, k]) => `${w} ${k}`).join(', ')}.`);
  lines.push(`Not counted, the word is not about the species' abundance: ${notClaims.join('; ')}.`);
}
json.__self_claims = selfClaims;
json.__not_claims = notClaims;

// ---- fleet: what sets a species' crystal count?
// Read from the code that nucleates each species, by the lines that test the species' own list of
// ACTIVE (exposed, still growing) crystals, `sim.crystals.filter(c => c.mineral === … && c.active)`:
//   strict        — a new crystal only while none is active: `!existing.length` in the σ gate,
//                   calcite/aragonite's water-mode gateClear, goethite's ordinaryBirthAllowed,
//                   `if (existing.length) return` (enargite), `if (existing.length || …) return`;
//   soft          — the first crystal is free; another needs σ above a second bar (1.4–2.5, or
//                   σ_crit + 0.5 / + 0.7) AND a 15–30 % roll: `!existing.length || (sigma > k &&
//                   rng < p)` or `if (existing.length && !(sigma > k && rng < p)) return`; most also
//                   cap the number of active crystals at 2–5;
//   active-capped — up to N (2–5) active crystals at once, no second bar: `existing.length >= N`;
//   cap-only      — no test on active crystals: a per-step roll (10–45 %) and max_nucleation_count.
// Species without their own _nuc_ function are read where they are made: the beryl and corundum
// varieties in their shared selector loops (js/89), raspite in _nuc_stolzite, the Mn-oxide surface
// phases in _nuc_manganese_surface_phase. A TRANSFORMATION product is not nucleated at all and
// inherits its parent's count: the js/75-transitions.ts parent → product tables (tincalconite from
// borax, pararealgar from realgar, …) and the function-coded in-place routes (birnessite →
// todorokite: _nuc_todorokite has no sim.nucleate call; selenite ⇄ anhydrite, both of which also
// nucleate on their own). Separately from the gate, some functions carry a hand-coded LIFETIME cap
// (`total_<m> >= N` / `< N` over sim.crystals of the species, dissolved and enclosed included).
// The gate line is printed with each species.
const nucRegions = {};
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter((x) => /^(8\d|89a|90|91)-nucleation-.*\.ts$/.test(x))) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  const at = [...src.matchAll(/^function (\w+)\s*\(/gm)].map((m) => [m[1], m.index]);
  at.forEach(([name, i], j) => { nucRegions[name] = { file: f, line: lineAt(i), body: src.slice(i, j + 1 < at.length ? at[j + 1][1] : src.length) }; });
  // A shared selector loop: each candidate is read from its list entry to the loop's break.
  for (const m of src.matchAll(/\['([a-z_]+)', sim\.conditions\.supersaturation_\1\(\)/g)) {
    nucRegions[`_sel_${m[1]}`] = { file: f, line: lineAt(m.index), body: src.slice(m.index, src.indexOf('break;', m.index)) };
  }
}
const transitionsSrc = fs.readFileSync(path.join(ROOT, 'js', '75-transitions.ts'), 'utf8');
const TRANSFORM = {};   // product → parent
const ALSO_FROM = {};   // product → ['parent (js/75-transitions.ts:line)', …]
{
  const lineAt = (i) => transitionsSrc.slice(0, i).split('\n').length;
  const add = (from, to, i) => { TRANSFORM[to] ||= from; (ALSO_FROM[to] ||= []).push(`${from} (js/75-transitions.ts:${lineAt(i)})`); };
  for (const m of transitionsSrc.matchAll(/^\s*([a-z_]+):\s*\['([a-z_-]+)'/gm)) add(m[1], m[2], m.index);
  for (const m of transitionsSrc.matchAll(/const from = '([a-z_]+)';\s*const to = '([a-z_]+)';/g)) add(m[1], m[2], m.index);
  for (const m of transitionsSrc.matchAll(/const to = from === '([a-z_]+)' \? '([a-z_]+)' : '([a-z_]+)';/g)) {
    add(m[1], m[2], m.index);
    add(m[2], m[1], m.index);
  }
}
function gateRegion(m) {
  const own = nucRegions[`_nuc_${m}`];
  if (own) {
    const helper = own.body.match(new RegExp(`(_nuc_\\w+)\\(\\s*sim,\\s*'${m}'`));
    if (helper && nucRegions[helper[1]]) return { ...nucRegions[helper[1]], sel: 'mineral', via: `via ${helper[1]}` };
    return { ...own, sel: `'${m}'` };
  }
  if (nucRegions[`_sel_${m}`]) return { ...nucRegions[`_sel_${m}`], sel: 'species', via: 'via the shared selector loop' };
  const maker = Object.entries(nucRegions).find(([name, r]) => name.startsWith('_nuc_') && r.body.includes(`sim.nucleate('${m}'`));
  return maker ? { ...maker[1], sel: `'${m}'`, via: `via ${maker[0]}` } : null;
}
const gateCache = {};
function gateInfo(m) {
  if (gateCache[m]) return gateCache[m];
  const R = gateRegion(m);
  if (!R && TRANSFORM[m]) return (gateCache[m] = { gate: 'transformation', at: ALSO_FROM[m][0].match(/\((.*)\)/)[1], text: `${TRANSFORM[m]} → ${m}` });
  if (!R) return (gateCache[m] = { gate: 'unread', at: '', text: 'no nucleation code found' });
  // A _nuc_ function that never calls sim.nucleate converts a precursor in place.
  if (!/sim\.nucleate\(/.test(R.body)) {
    return (gateCache[m] = { gate: 'transformation', at: `js/${R.file}:${R.line}`,
      text: `${TRANSFORM[m] || '?'} → ${m} in place: the function has no sim.nucleate call`,
      via: ALSO_FROM[m]?.length ? `the transition: ${ALSO_FROM[m].map((s) => s.match(/\((.*)\)/)[1]).join(', ')}` : undefined });
  }
  const own = [...R.body.matchAll(new RegExp(`const (\\w+) = sim\\.crystals\\.filter\\(c => c\\.mineral === ${R.sel}\\s*&& c\\.active\\)`, 'g'))].map((x) => x[1]);
  const find = (re) => {
    const x = re.exec(R.body);
    if (!x) return null;
    // The whole statement the match sits in, from its line to the first `;` or `{` after it.
    const from = R.body.lastIndexOf('\n', x.index) + 1;
    const end = Math.min(...[';', '{'].map((c) => R.body.indexOf(c, x.index)).filter((i) => i >= 0));
    return { at: `js/${R.file}:${R.line + R.body.slice(0, from).split('\n').length - 1}`, text: R.body.slice(from, end + 1).replace(/\s+/g, ' ').trim() };
  };
  let out = null;
  if (own.length) {
    const v = `(?:${own.join('|')})`;
    const soft = find(new RegExp(`!${v}\\.length \\|\\| \\(sigma`)) || find(new RegExp(`\\b${v}\\.length &&[^;{]*!\\(sigma[^;{]*rng\\.random\\(\\)`));
    const strict = find(new RegExp(`!${v}\\.length\\b(?! \\|\\|)`)) || find(new RegExp(`if \\(${v}\\.length(?:\\)| \\|\\|)`));
    const capped = find(new RegExp(`\\b${v}\\.length\\s*(?:>=|<)\\s*\\d`));
    if (soft) out = { gate: 'soft', ...soft };
    else if (strict) out = { gate: 'strict', ...strict };
    else if (capped) out = { gate: 'active-capped', ...capped };
  }
  if (!out) {
    // Show the per-step roll: the last rng line before the species' nucleate call that is not a
    // substrate pick.
    const at = R.body.search(new RegExp(`sim\\.nucleate\\(${R.sel}`));
    const before = (at >= 0 ? R.body.slice(0, at) : R.body).split('\n');
    let i = before.length - 1;
    while (i >= 0 && !(/rng\.random\(\)\s*(?:<|>=)\s*[\d.]+/.test(before[i]) && !/\.length &&|pos =|^\s*\}/.test(before[i]))) i--;
    out = { gate: 'cap-only', at: `js/${R.file}:${R.line + Math.max(i, 0)}`, text: i >= 0 ? before[i].trim() : '' };
  }
  if (R.via) out.via = R.via;
  if (ALSO_FROM[m]) out.via = [out.via, `also made in place from ${ALSO_FROM[m].join(', ')}`].filter(Boolean).join('; ');
  // A hand-coded lifetime cap: a count of every crystal of the species ever made, compared to N.
  const life = [...R.body.matchAll(new RegExp(`const (\\w+) = sim\\.crystals\\.filter\\(c => c\\.mineral === ${R.sel}\\)\\.length`, 'g'))].map((x) => x[1]);
  if (life.length) {
    const x = new RegExp(`\\b(?:${life.join('|')})\\s*(?:<|>=)\\s*(\\d+)`).exec(R.body);
    if (x) out.life = Number(x[1]);
  }
  return (gateCache[m] = out);
}
const gateKind = (m) => gateInfo(m).gate;
const fleet = {};
const pairs = {};
for (const r of runs) {
  for (const [m, v] of Object.entries(r.species)) {
    if (v.n_surv <= 0) continue;
    const f = (fleet[m] ||= { runs: 0, surv: 0, vis: 0, scen: new Set() });
    f.runs++; f.surv += v.n_surv; f.vis += v.n_1_exp; f.scen.add(r.scenario);
    const p = (pairs[`${m}|${r.scenario}`] ||= { m, scenario: r.scenario, runs: 0, surv: 0 });
    p.runs++; p.surv += v.n_surv;
  }
}
const idiom = Object.entries(fleet).map(([m, f]) => ({
  m, ...gateInfo(m), cap: SPEC[m]?.max_nucleation_count ?? null, runs: f.runs,
  scenarios: f.scen.size, perVug: f.surv / f.runs, visPerVug: f.vis / f.runs,
})).sort((a, b) => b.perVug - a.perVug);
const GATES = ['strict', 'soft', 'active-capped', 'cap-only', 'transformation', 'unread'];
const codeCell = (t) => (t ? `\`${t.slice(0, 130).replace(/\|/g, '\\|')}${t.length > 130 ? '…' : ''}\`` : '');
lines.push('\n## Fleet: crystals per vug by nucleation gate (all scenarios, all seeds, vugs where the species survives)');
for (const kind of GATES) {
  const g = idiom.filter((r) => r.gate === kind);
  if (!g.length) continue;
  lines.push(`${kind.padEnd(16)} ${String(g.length).padStart(3)} species, median ${med(g.map((r) => r.perVug))?.toFixed(2)} crystals per vug (median ${med(g.map((r) => r.visPerVug))?.toFixed(2)} ≥ 1 mm)`);
}
{
  const all = Object.keys(SPEC).map((m) => gateKind(m));
  lines.push(`every species in data/minerals.json (${all.length}, formed in this panel or not): ${GATES.map((g) => `${g} ${all.filter((x) => x === g).length}`).join(', ')}`);
  json.__gates = Object.fromEntries(Object.keys(SPEC).sort().map((m) => [m, gateInfo(m)]));
  const lifed = Object.entries(json.__gates).filter(([, x]) => x.life != null);
  lines.push(`hand-coded lifetime caps (every crystal ever made, dissolved and enclosed included): ${lifed.length} species — ${GATES.filter((g) => lifed.some(([, x]) => x.gate === g)).map((g) => `${g}: ${lifed.filter(([, x]) => x.gate === g).map(([m, x]) => `${m} ${x.life}`).join(', ')}`).join('; ')}`);
}
const strictPairs = Object.values(pairs).filter((p) => gateKind(p.m) === 'strict');
const strictAtOne = strictPairs.filter((p) => p.surv / p.runs <= 1.25);
lines.push(`strict-gated (species, scenario) pairs at ≤ 1.25 surviving crystals per vug (where present): ${strictAtOne.length} of ${strictPairs.length}`);
lines.push('| species | gate | gate line | the line (or the parent → product) | lifetime cap | max_nucleation_count | vugs with it | scenarios | crystals per vug | exposed ≥ 1 mm per vug |');
lines.push('|---|---|---|---|---:|---:|---:|---:|---:|---:|');
for (const r of idiom) lines.push(`| ${r.m} | ${r.gate} | ${r.at}${r.via ? ` (${r.via})` : ''} | ${codeCell(r.text)} | ${r.life ?? '—'} | ${r.cap ?? '—'} | ${r.runs} | ${r.scenarios} | ${r.perVug.toFixed(2)} | ${r.visPerVug.toFixed(2)} |`);

// What happens to each real top-three species, by its gate. Rank against the sim's top three by
// visible count and, separately, by volume; a species tied across the sim's third place is its
// own column. Listed apart, not counted: species tied across the REAL third place, species the
// scenario does not claim (OUT_OF_CLAIM), and species under FATE_FLOOR of the record without a
// literature class of abundant or common.
// A slot's contract status: which of the scenario's own species lists names the species.
const contractOf = (scn, m) => {
  const spec = SCENARIOS[scn]?._json5_spec || {};
  const has = (list) => (list || []).some((e) => (typeof e === 'string' ? e : e?.mineral) === m);
  return has(spec.expects_species) ? 'expects' : has(spec.deterministic_species) ? 'deterministic'
    : has(spec.statistical_species) ? 'statistical' : has(spec.aspirational_species) ? 'aspirational' : 'not listed';
};
const fate = [], fateRealTied = [], fateOutOfClaim = [], fateBelowFloor = [];
for (const [scn, j] of Object.entries(json)) {
  if (scn.startsWith('__')) continue;
  for (const k of j.realTop.tied) if (SPEC[k]) fateRealTied.push(`${k}@${scn} (${gateKind(k)}; one of ${j.realTop.slots} open slot${j.realTop.slots > 1 ? 's' : ''} for {${j.realTop.tied.join(', ')}})`);
  if (SCENARIO_OUT_OF_SCOPE[scn]) continue;   // its whole record is set aside
  for (const k of j.realTop.sure) {
    const r = j.rows.find((x) => x.k === k);
    if (!r || !SPEC[k]) continue;   // no engine: species debt, counted separately
    if (OUT_OF_CLAIM[`${scn}|${k}`]) { fateOutOfClaim.push(`${k}@${scn} (${OUT_OF_CLAIM[`${scn}|${k}`]})`); continue; }
    if ((r.real ?? 0) < FATE_FLOOR && !/^(AB|CO)/.test(r.lit || '')) { fateBelowFloor.push(`${k}@${scn} (${pct(r.real)} % of the record${r.litShown ? `, literature ${r.litShown}` : ''})`); continue; }
    let what;
    if (r.present === 0) what = 'never forms';
    else if (j.simTop.sure.includes(k)) what = 'in the sim top three';
    else if (j.simTop.tied.includes(k)) what = 'tied across the sim\'s third place';
    // No unflagged crystal reaches 1 mm in most seeds: dust if the crystals are small, "flagged" if they
    // grow ≥ 1 mm but end up enclosed in another crystal.
    else if (r.medMax < 1) what = r.medMaxAll >= 1 ? 'flagged as enclosed' : 'dust (median largest < 1 mm)';
    else what = 'visible, outside the sim top three';
    const byVol = j.simTopVol.sure.includes(k) ? 'in' : j.simTopVol.tied.includes(k) ? 'tied' : 'out';
    fate.push({ scenario: scn, k, gate: gateKind(k), what, byVol, contract: contractOf(scn, k), perVug: r.meanSurv, medMax: r.medMax });
  }
}
const FATES = ['never forms', 'dust (median largest < 1 mm)', 'flagged as enclosed', 'visible, outside the sim top three', 'tied across the sim\'s third place', 'in the sim top three'];
lines.push('\n## What happens to each real top-three species (species with an engine)');
lines.push(`| gate | ${FATES.join(' | ')} | total |`);
lines.push(`|---|${FATES.map(() => '---:').join('|')}|---:|`);
for (const kind of GATES) {
  const g = fate.filter((f) => f.gate === kind);
  if (!g.length) continue;
  lines.push(`| ${kind} | ${FATES.map((w) => g.filter((f) => f.what === w).length).join(' | ')} | ${g.length} |`);
}
lines.push(`| all | ${FATES.map((w) => fate.filter((f) => f.what === w).length).join(' | ')} | ${fate.length} |`);
lines.push(`Not counted — tied across the real third place: ${fateRealTied.join('; ') || 'none'}. Outside the scenario's claim: ${fateOutOfClaim.join('; ') || 'none'}. Under ${FATE_FLOOR * 100} % of the record with no literature class of abundant or common: ${fateBelowFloor.join('; ') || 'none'}. Scenarios out of scope: ${Object.entries(SCENARIO_OUT_OF_SCOPE).map(([k, why]) => `${k} (${why})`).join('; ')}.`);
// Contract status: does the scenario's own species list name the species?
{
  const CONTRACTS = ['expects', 'deterministic', 'statistical', 'aspirational', 'not listed'];
  lines.push('\nContract status of each slot (which of the scenario\'s own species lists names it):');
  lines.push(`| fate | ${CONTRACTS.join(' | ')} |`);
  lines.push(`|---|${CONTRACTS.map(() => '---:').join('|')}|`);
  for (const w of FATES) {
    const g = fate.filter((x) => x.what === w);
    if (g.length) lines.push(`| ${w} | ${CONTRACTS.map((c) => g.filter((x) => x.contract === c).length).join(' | ')} |`);
  }
  lines.push('Never-forming slots by contract status: ' + fate.filter((x) => x.what === 'never forms').map((x) => `${x.k}@${x.scenario} (${x.contract})`).join(', '));
}
lines.push(`"In the sim top three" entries whose median largest unflagged crystal is < 1 mm: ${fate.filter((f) => f.what === 'in the sim top three' && f.medMax < 1).map((f) => `${f.k}@${f.scenario}`).join(', ') || 'none'}.`);
json.__fate_set_aside = { realTied: fateRealTied, outOfClaim: fateOutOfClaim, belowFloor: fateBelowFloor };
const VISIBLE = ['visible, outside the sim top three', 'tied across the sim\'s third place', 'in the sim top three'];
lines.push('P(in the sim top three | it forms visible crystals) — "visible" = in or tied for the sim top three, or median largest ≥ 1 mm:');
lines.push('| gate | by visible count | counting ties as in | by volume | counting ties as in |');
lines.push('|---|---:|---:|---:|---:|');
for (const kind of [...GATES.slice(0, 4), 'all but strict']) {
  const vis = fate.filter((f) => (kind === 'all but strict' ? f.gate !== 'strict' : f.gate === kind) && VISIBLE.includes(f.what));
  if (!vis.length) continue;
  const c = (p) => `${vis.filter(p).length}/${vis.length}`;
  lines.push(`| ${kind} | ${c((f) => f.what === 'in the sim top three')} | ${c((f) => f.what !== 'visible, outside the sim top three')} | ${c((f) => f.byVol === 'in')} | ${c((f) => f.byVol !== 'out')} |`);
}
// Slots by gate; a tie across third place shares its open slots evenly among the tied species.
const slotsByGate = (pick) => {
  const out = Object.fromEntries(GATES.map((g) => [g, 0]));
  for (const [k, j] of Object.entries(json)) {
    if (k.startsWith('__')) continue;
    const t = pick(j);
    for (const m of t.sure) out[gateKind(m)] += 1;
    for (const m of t.tied) out[gateKind(m)] += t.slots / t.tied.length;
  }
  return GATES.filter((g) => out[g]).map((g) => `${g} ${+out[g].toFixed(1)}`).join(', ');
};
lines.push(`sim top-three slots by gate, by visible count: ${slotsByGate((j) => j.simTop)}; by volume: ${slotsByGate((j) => j.simTopVol)}`);
lines.push(`real top-three slots by gate (species with an engine): ${GATES.filter((g) => fate.some((f) => f.gate === g)).map((g) => `${g} ${fate.filter((f) => f.gate === g).length}`).join(', ')} (of ${fate.length})`);
lines.push('Never-forming real top-three species: ' + fate.filter((f) => f.what === 'never forms').map((f) => `${f.k}@${f.scenario}`).join(', '));
lines.push('Tied across the sim\'s third place: ' + fate.filter((f) => f.what === 'tied across the sim\'s third place').map((f) => `${f.k}@${f.scenario} (${f.gate})`).join(', '));
json.__fate = fate;

json.__fleet_idiom = idiom;

// ---- dust: a headline species the sim grows but, in most seeds, never past 1 mm.
// Headline = ≥ 10 % of the voting real record, or a literature class of abundant; the largest
// crystal is the largest unflagged one; species outside the scenario's claim are left out.
lines.push('\n## Dust — headline species the sim grows with a median largest unflagged crystal < 1 mm');
lines.push('"flagged" = the crystals do reach 1 mm (median largest, counting flagged ones, ≥ 1 mm) but the simulator flags them as enclosed (a footprint projection, not an envelopment test); otherwise they are small.');
lines.push('| scenario | species | real share (voting sources) | literature | sim crystals per vug | median largest unflagged mm | median largest incl. flagged mm | largest unflagged in any seed mm | seeds with an unflagged ≥ 1 mm crystal | |');
lines.push('|---|---|---:|---|---:|---:|---:|---:|---:|---|');
const dust = [];
for (const [scn, j] of Object.entries(json)) {
  if (scn.startsWith('__')) continue;
  for (const r of j.rows) {
    const headline = (r.real != null && r.real >= DUST_REAL) || /^AB/.test(r.lit || '');
    if (!headline || r.meanSurv <= 0 || r.medMax >= 1 || OUT_OF_CLAIM[`${scn}|${r.k}`]) continue;
    const sealed = r.medMaxAll >= 1;
    dust.push({ scenario: scn, k: r.k, real: r.real, lit: r.litShown, perVug: r.meanSurv, medMax: r.medMax, medMaxAll: r.medMaxAll, maxMax: r.maxMax, visPresent: r.visPresent, sealed });
    lines.push(`| ${scn} | ${r.k} | ${r.real == null ? '—' : pct(r.real) + '%'} | ${r.litShown ?? ''} | ${r.meanSurv.toFixed(1)} | ${mm(r.medMax)} | ${mm(r.medMaxAll)} | ${mm(r.maxMax)} | ${pct(r.visPresent)}% | ${sealed ? 'flagged' : ''} |`);
  }
}
json.__dust = dust;

// ---- robustness: does the broad mismatch depend on the measure?
const scored = Object.entries(json).filter(([k, j]) => !k.startsWith('__') && j.rhoReal != null && j.verdict !== 'OUT OF SCOPE');
const medRho = (key) => {
  const get = typeof key === 'function' ? key : (j) => j[key];
  const x = med(scored.map(([, j]) => get(j)).filter((v) => v != null));
  return x == null ? null : +x.toFixed(2) + 0;
};
let volBetter = 0, volWorse = 0, volEqual = 0, volBetter05 = 0, volWorse05 = 0;
for (const [, j] of scored) {
  if (j.rhoVol == null) continue;
  if (j.rhoVol > j.rhoReal) volBetter++; else if (j.rhoVol < j.rhoReal) volWorse++; else volEqual++;
  if (j.rhoVol > j.rhoReal + 0.05) volBetter05++; else if (j.rhoVol < j.rhoReal - 0.05) volWorse05++;
}
lines.push('\n## Robustness of the median ρ to the sim measure');
lines.push(`median ρ over ${scored.length} scored scenarios — visible count ${medRho('rhoReal')?.toFixed(2)}, surviving count ${medRho('rhoSurv')?.toFixed(2)}, ≥ 0.1 mm count ${medRho('rhoMicro')?.toFixed(2)}, volume ${medRho('rhoVol')?.toFixed(2)}, seeds with a visible crystal ${medRho('rhoVisPres')?.toFixed(2)}`);
lines.push(`volume vs visible count: ρ higher in ${volBetter}, lower in ${volWorse}, equal in ${volEqual}; with |Δρ| > 0.05: higher in ${volBetter05}, lower in ${volWorse05}`);
for (const mode of ['seeds', 'proxies', 'both']) {
  const widths = scored.map(([, j]) => j.boot[mode].band).filter(Boolean).map((b) => b[1] - b[0]);
  lines.push(`bootstrap over ${mode}: median width of the 5–95 % band ${med(widths)?.toFixed(2)}; verdict differs in ≥ 20 % of resamples: ${scored.filter(([, j]) => j.boot[mode].flips >= 0.2).sort((a, b) => b[1].boot[mode].flips - a[1].boot[mode].flips).map(([k, j]) => `${k} (${(100 * j.boot[mode].flips).toFixed(0)} %)`).join(', ') || 'none'}`);
}
// The joint bootstrap's own Monte-Carlo spread: the same resampling under MC_SALTS other seeds.
{
  const widthAt = (pick) => med(scored.map(([, j]) => pick(j)).filter(Boolean).map((b) => b[1] - b[0]));
  const widths = MC_SALTS.map((_, i) => widthAt((j) => j.mc[i].band));
  const flipRange = (j) => { const f = [j.boot.both.flips, ...j.mc.map((x) => x.flips)]; return [Math.min(...f), Math.max(...f)]; };
  const over = scored.filter(([, j]) => flipRange(j)[1] >= 0.2).sort((a, b) => flipRange(b[1])[1] - flipRange(a[1])[1]);
  lines.push(`Monte-Carlo spread of the joint bootstrap (bootstrap seeds 0, ${MC_SALTS.join(', ')}): median band width ${[widthAt((j) => j.boot.both.band), ...widths].map((x) => x?.toFixed(2)).join(' / ')}; verdict differs in ≥ 20 % of resamples under any seed: ${over.map(([k, j]) => `${k} (${flipRange(j).map((x) => (100 * x).toFixed(0)).join('–')} %)`).join(', ') || 'none'}`);
}
// Unflagged vs with-flagged: does counting the crystals the simulator flags as enclosed change a verdict?
{
  const changed = scored.filter(([, j]) => j.withEnclosed.verdict !== j.exposedVerdict);
  const topChanged = scored.filter(([, j]) => topText(j.withEnclosed.simTop) !== topText(j.simTop));
  lines.push(`counting flagged ≥ 1 mm crystals as visible: median ρ ${medRho((j) => j.withEnclosed.rho)?.toFixed(2)}; verdict changes in ${changed.length} (${changed.map(([k, j]) => `${k}: ${j.exposedVerdict} → ${j.withEnclosed.verdict}`).join(', ') || 'none'}); sim top three changes in ${topChanged.length} (${topChanged.map(([k]) => k).join(', ') || 'none'})`);
}
// Why the seed bands are narrow: many (scenario, species) pairs come out the same in every seed.
const sameEverySeed = { pairs: 0, visible: 0, surviving: 0 };
for (const [scn] of scored) {
  const rs = runsBy[scn];
  for (const m of new Set(rs.flatMap((r) => Object.keys(r.species)))) {
    sameEverySeed.pairs++;
    const v = rs.map((r) => r.species[m]?.n_1_exp ?? 0), s = rs.map((r) => r.species[m]?.n_surv ?? 0);
    if (v.every((x) => x === v[0])) sameEverySeed.visible++;
    if (s.every((x) => x === s[0])) sameEverySeed.surviving++;
  }
}
lines.push(`(scenario, species) pairs in the scored scenarios with the same count in all ${runsBy[scored[0][0]].length} seeds: visible ${sameEverySeed.visible} of ${sameEverySeed.pairs}, surviving ${sameEverySeed.surviving} of ${sameEverySeed.pairs}`);
// How many visible crystals sit inside another crystal (locality scenarios, all seeds)?
{
  let all = 0, exposed = 0;
  for (const [scn] of Object.entries(json).filter(([k]) => !k.startsWith('__'))) {
    for (const r of runsBy[scn]) for (const v of Object.values(r.species)) { all += v.n_1; exposed += v.n_1_exp; }
  }
  lines.push(`≥ 1 mm crystals in the locality scenarios, all seeds: ${all}, of which ${all - exposed} (${pct((all - exposed) / all)} %) are flagged as enclosed`);
  json.__enclosed = { visibleAll: all, visibleExposed: exposed };
}
json.__robustness = { medianRho: { visible: medRho('rhoReal'), surviving: medRho('rhoSurv'), micro: medRho('rhoMicro'), volume: medRho('rhoVol'), visiblePresence: medRho('rhoVisPres'), withEnclosed: medRho((j) => j.withEnclosed.rho) },
  volume: { better: volBetter, worse: volWorse, equal: volEqual, better05: volBetter05, worse05: volWorse05 }, sameEverySeed };

fs.mkdirSync(OUT, { recursive: true });
const board = ['\n## Scoreboard', `ρ = Spearman between the sim's share of unflagged ≥ 1 mm crystals and the real share (mean of photo and listing shares; a source with < ${THIN} observations does not vote), with its 5–95 % bootstrap bands: over the seeds, over the proxies (photographs and listing mentions resampled as multinomial draws) and over both. "Verdict differs" = the share of resamples whose verdict is not the one shown (seeds / proxies / both). Top 3 = largest shares, by value alone; species tied across third place are shown as "n of {…} (tied)", and a verdict that depends on how ties break is TIE-DEPENDENT. Literature marks: (S) snippet-level, (R) recalled.`, '',
  '| scenario | locality | verdict | ρ(sim, real) | band: seeds | band: proxies | band: both | verdict differs | real top 3 | sim top 3 (≥ 1 mm) | overlap | literature: sim top 3 rated rare/undocumented | literature: abundant, no sim crystal ≥ 1 mm |', '|---|---|---|---:|---|---|---|---|---|---|---:|---|---|'];
const bandCell = (b) => (b ? `${b[0].toFixed(2)} to ${b[1].toFixed(2)}` : '—');
for (const [scn, j] of Object.entries(json).filter(([k]) => !k.startsWith('__')).sort((a, b) => (a[1].rhoReal ?? -9) - (b[1].rhoReal ?? -9))) {
  const verdictCell = j.verdict === 'TIE-DEPENDENT' || j.verdict === 'MEASURE-DEPENDENT' ? `${j.verdict} (${j.verdictOptions.join(' or ')})`
    : j.verdict === 'OUT OF SCOPE' ? `OUT OF SCOPE (${j.exposedVerdict} on its own measures)` : j.verdict;
  board.push(`| ${scn} | ${j.locality} | ${verdictCell} | ${j.rhoReal?.toFixed(2) ?? '—'} | ${bandCell(j.boot.seeds.band)} | ${bandCell(j.boot.proxies.band)} | ${bandCell(j.boot.both.band)} | ${['seeds', 'proxies', 'both'].map((m) => (100 * j.boot[m].flips).toFixed(0)).join(' / ')} % | ${topText(j.realTop)} | ${topText(j.simTop)} | ${j.overlap[0] === j.overlap[1] ? j.overlap[0] : `${j.overlap[0]}–${j.overlap[1]}`} | ${j.litLow.join(', ')} | ${j.litMissing.join(', ')} |`);
}
const verdicts = {};
for (const [k, j] of Object.entries(json)) if (!k.startsWith('__')) verdicts[j.verdict] = (verdicts[j.verdict] || 0) + 1;
board.push('', `Verdicts: ${Object.entries(verdicts).map(([v, n]) => `${v} ${n}`).join(', ')}.`);
const head = `# Sim vs locality abundance — SIM ${simVersions[0]}, ${[...new Set(runs.map((r) => r.seed))].length} seeds\n\nThresholds: OVER sim ≥ ${OVER_SIM * 100}% of visible crystals with photos and listings < ${OVER_REAL * 100}%; UNDER photos ≥ ${UNDER_REAL * 100}% with sim < ${UNDER_SIM * 100}%; ABSENT sim in ≥ ${ABSENT_SEEDS * 100}% of seeds with no photo and no listing; dust = a headline species (≥ ${DUST_REAL * 100}% of the voting record, or literature AB) with a median largest unflagged crystal < 1 mm. Visible = ≥ 1 mm and not flagged as enclosed by the simulator (a footprint projection; verdicts are also worked out with flagged crystals counted).\n`;
fs.writeFileSync(path.join(OUT, 'compare.md'), head + board.join('\n') + '\n' + lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'compare.json'), JSON.stringify(json, null, 1));
console.log(head + board.join('\n') + '\n' + lines.join('\n'));
