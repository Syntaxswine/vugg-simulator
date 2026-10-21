#!/usr/bin/env node
/**
 * tools/locality-abundance-compare.mjs — sim crystal ratios vs real-world abundance proxies
 * (locality-abundance review, 2026-10-21).
 *
 * Inputs:
 *   .local-evidence/assemblage-census/runs.jsonl        (tools/assemblage-census.mjs)
 *   proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json   (the captured proxies: Mineralienatlas
 *                                                        photo counts, eBay listing titles
 *                                                        classified by tools/market-title-dictionary.mjs,
 *                                                        literature classes)
 *
 * For each scenario anchored to a real locality it prints, per species, the sim's share of
 * surviving crystals, of eye-visible (≥ 1 mm) crystals and of crystal volume (all averaged over
 * the seed panel), beside the locality's share of photographs, of listings, and the literature
 * class. Shares, not raw counts: the photo archive of Tsumeb and the eBay supply of Herkimer quartz
 * differ by orders of magnitude, and only the within-locality ratio is a claim about the rock.
 * Units differ on the two sides — the sim counts crystals per cavity, the proxies count specimens
 * people photograph or sell — so only ranks are compared, never values.
 *
 * The real ranking is the mean of the photo and listing shares; a source with fewer than THIN
 * observations does not vote. Spearman ρ is computed over the UNION of: the sim's top 12 by visible
 * share, the sim's top 12 by surviving share, the photos' top 12, the listings' top 8, and every
 * species the literature calls abundant or common; a species absent from one side scores 0 there
 * (ties get average ranks). With that zero-padding ρ behaves largely as a set-overlap statistic.
 *
 * Verdicts: AGREES (ρ ≥ 0.5 and at least min(2, |sim top 3|) of the real top three are in the
 * sim's top three), DISAGREES (ρ < 0, or the sim's most numerous visible species is < 1 % of the
 * real record), PARTLY otherwise, THIN when no source votes, NO VISIBLE CRYSTALS when the sim grows
 * nothing ≥ 1 mm. A seed bootstrap (BOOT resamples of the 21 seeds) gives each ρ a 5–95 % band and
 * the fraction of resamples whose verdict differs.
 *
 * Flags (thresholds printed with the tables):
 *   OVER   — the sim gives a species ≥ 10 % of its visible crystals while photos AND listings are < 1 %.
 *   UNDER  — the photo share is ≥ 10 % while the sim gives it < 2 % of visible crystals.
 *   ABSENT — the sim grows a species (any size, ≥ 25 % of seeds) that neither proxy records at all.
 *
 * Fleet sections: the scenarios' own abundance words vs their counts (by surviving count, visible
 * count and volume); the nucleation-gate census (strict / soft / cap-only / transformation product
 * / shared selector); what happens to each real top-three species (never forms / dust / visible /
 * sim top three) by gate; the dust list; robustness of the median ρ to the choice of measure.
 *
 * PASSIVE: reads, prints, writes .local-evidence/locality-abundance/compare.{md,json}, exits 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MARKET_TITLE_DICTIONARY, buildMatchers, classifyTitle } from './market-title-dictionary.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNS = path.join(ROOT, '.local-evidence', 'assemblage-census', 'runs.jsonl');
const DATA = path.join(ROOT, 'proposals', 'DATA-LOCALITY-ABUNDANCE-2026-10-21.json');
const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;

const OVER_SIM = 0.10, OVER_REAL = 0.01, UNDER_REAL = 0.10, UNDER_SIM = 0.02, ABSENT_SEEDS = 0.25;
const THIN = 20;    // fewer photos (or listing mentions) than this and the source does not vote
const BOOT = 200;   // seed-bootstrap resamples per scenario
const DUST_REAL = 0.10;
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
// Deterministic PRNG for the bootstrap (mulberry32), so the report is reproducible.
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

// ---- sim side
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const simVersions = [...new Set(runs.map((r) => r.sim_version))];
if (simVersions.length !== 1) throw new Error(`runs.jsonl mixes SIM versions ${simVersions.join(',')}`);
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
  const per = {};
  for (const r of rs) {
    for (const [m, v] of Object.entries(r.species)) {
      const p = (per[m] ||= { surv: 0, vis: 0, vol: 0, present: 0, visPresent: 0, maxmm: [] });
      p.surv += v.n_surv; p.vis += v.n_1; p.vol += v.vol_mm3;
      if (v.n_surv > 0) { p.present++; p.maxmm.push(v.max_mm); }
      if (v.n_1 > 0) p.visPresent++;
    }
  }
  const surv = {}, vis = {}, vol = {}, visPres = {};
  for (const [m, p] of Object.entries(per)) { surv[m] = p.surv / n; vis[m] = p.vis / n; vol[m] = p.vol / n; visPres[m] = p.visPresent / n; }
  return {
    seeds: n, surv: shares(surv), vis: shares(vis), vol: shares(vol), visPres: shares(visPres),
    meanSurv: surv, meanVis: vis, meanVol: vol,
    present: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, p.present / n])),
    visPresent: visPres,
    medMax: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, med(p.maxmm) ?? 0])),
    maxMax: Object.fromEntries(Object.entries(per).map(([m, p]) => [m, p.maxmm.length ? Math.max(...p.maxmm) : 0])),
  };
}

// ---- real side
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
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
  return { photos: shares(photos), ebay: shares(ebay), lit: L.literature?.species || {} };
}
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
  const usePhoto = R.photos.tot >= THIN, useEbay = R.ebay.tot >= THIN;
  const rows = [...keys].map((k) => {
    const photo = R.photos.out[k] || 0, ebay = R.ebay.out[k] || 0;
    const parts = [usePhoto ? photo : null, useEbay ? ebay : null].filter((x) => x != null);
    return {
      k, engine: !!SPEC[k], simSurv: S.surv.out[k] || 0, simVis: S.vis.out[k] || 0, simVol: S.vol.out[k] || 0,
      simVisPres: S.visPres.out[k] || 0, meanSurv: S.meanSurv[k] || 0, meanVis: S.meanVis[k] || 0,
      present: S.present[k] || 0, visPresent: S.visPresent[k] || 0, medMax: S.medMax[k] || 0, maxMax: S.maxMax[k] || 0,
      photo, ebay, real: parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : null,
      lit: R.lit[k]?.class || null, litShown: litLabel(R.lit[k]),
    };
  }).sort((a, b) => ((b.real ?? 0) - (a.real ?? 0)) || (b.simVis - a.simVis));
  const realOk = usePhoto || useEbay;
  const rho = (key) => (realOk ? spearman(rows.map((r) => r[key]), rows.map((r) => r.real)) : null);
  const top = (key, n = 3) => rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, n).map((r) => r.k);
  const realTop = realOk ? top('real') : [], simTop = top('simVis');
  const overlap = realTop.filter((k) => simTop.includes(k)).length;
  const leadReal = simTop.length ? (rows.find((r) => r.k === simTop[0])?.real ?? 0) : null;
  const rhoReal = rho('simVis');
  let verdict;
  if (!realOk) verdict = 'THIN';
  else if (!simTop.length) verdict = 'NO VISIBLE CRYSTALS';
  else if (rhoReal != null && rhoReal >= 0.5 && overlap >= Math.min(2, simTop.length)) verdict = 'AGREES';
  else if ((rhoReal != null && rhoReal < 0) || leadReal < OVER_REAL) verdict = 'DISAGREES';
  else verdict = 'PARTLY';
  return { S, rows, realOk, usePhoto, useEbay, rhoReal, rhoSurv: rho('simSurv'), rhoVol: rho('simVol'),
    rhoVisPres: rho('simVisPres'), realTop, simTop, overlap, verdict };
}

const lines = [];
const json = {};
for (const [loc, L] of Object.entries(data.localities)) {
  for (const scn of L.scenarios || []) {
    if (!runsBy[scn]) continue;
    const R = realTable(loc);
    const C = compareOne(scn, loc, R);
    const { rows } = C;
    // Seed bootstrap: how much of ρ and the verdict is seed noise?
    const rnd = prng(0x5eed ^ scn.length * 7919);
    const rs = runsBy[scn];
    const boot = [];
    let flips = 0;
    for (let b = 0; b < BOOT; b++) {
      const sample = rs.map(() => rs[Math.floor(rnd() * rs.length)]);
      const B = compareOne(scn, loc, R, sample);
      if (B.rhoReal != null) boot.push(B.rhoReal);
      if (B.verdict !== C.verdict) flips++;
    }
    const band = boot.length ? [quantile(boot, 0.05), quantile(boot, 0.95)] : null;
    const flags = [];
    for (const r of rows) {
      if (r.simVis >= OVER_SIM && r.photo < OVER_REAL && r.ebay < OVER_REAL) flags.push(`OVER ${r.k} (sim ${pct(r.simVis)}% of visible crystals; photos ${pct(r.photo)}%, listings ${pct(r.ebay)}%)`);
      if (r.photo >= UNDER_REAL && r.simVis < UNDER_SIM) flags.push(`UNDER ${r.k} (photos ${pct(r.photo)}%; sim ${pct(r.simVis)}% of visible crystals${r.engine ? '' : ' — NO ENGINE'})`);
      if (r.present >= ABSENT_SEEDS && r.photo === 0 && r.ebay === 0 && C.S && R.photos.tot > 0) flags.push(`ABSENT ${r.k} (sim grows it in ${pct(r.present)}% of seeds; no photo, no listing)`);
    }
    // The literature votes separately: which of the sim's top three visible species does it rate
    // rare or undocumented, and which species does it call abundant that the sim never shows ≥ 1 mm?
    const litLow = C.simTop.filter((k) => /^(RA|VR|ND|Q)/.test(rows.find((r) => r.k === k)?.lit || ''))
      .map((k) => { const r = rows.find((x) => x.k === k); return r.litShown && /\(/.test(r.litShown) ? `${k} (${r.litShown.match(/\((\w+)\)/)[1]})` : k; });
    const litMissing = rows.filter((r) => /^AB/.test(r.lit || '') && r.simVis === 0).map((r) => r.k);
    json[scn] = { locality: loc, seeds: C.S.seeds, photos_total: R.photos.tot, listings_total: R.ebay.tot,
      votes: { photos: C.usePhoto, listings: C.useEbay },
      rhoReal: C.rhoReal, rhoSurv: C.rhoSurv, rhoVol: C.rhoVol, rhoVisPres: C.rhoVisPres, band, verdictFlips: flips / BOOT,
      realTop: C.realTop, simTop: C.simTop, overlap: C.overlap, verdict: C.verdict, litLow, litMissing, flags, rows };
    lines.push(`\n### ${scn}  ←  ${loc}   (sim ${C.S.seeds} seeds; ${R.photos.tot} photos${C.usePhoto ? '' : ' — does not vote'}; ${R.ebay.tot} listing mentions${C.useEbay ? '' : ' — does not vote'})`);
    lines.push(`ρ(sim visible-count, real) = ${C.rhoReal?.toFixed(2) ?? '—'}${band ? ` [seed bootstrap 5–95 %: ${band[0].toFixed(2)} to ${band[1].toFixed(2)}; verdict differs in ${(100 * flips / BOOT).toFixed(0)} % of resamples]` : ''}   ρ(sim volume, real) = ${C.rhoVol?.toFixed(2) ?? '—'}   ρ(sim surviving count, real) = ${C.rhoSurv?.toFixed(2) ?? '—'}`);
    lines.push('| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median largest mm | seeds with a ≥1 mm crystal | % of photos | % of listings | literature |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
    for (const r of rows) {
      lines.push(`| ${r.k} | ${r.meanSurv.toFixed(1)} | ${pct(r.present)}% | ${pct(r.simSurv)} | ${pct(r.simVis)} | ${pct(r.simVol)} | ${mm(r.medMax)} | ${pct(r.visPresent)}% | ${pct(r.photo)} | ${pct(r.ebay)} | ${r.litShown ?? ''} |`);
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
lines.push('\n## The scenarios\' own abundance words vs their crystal counts');
lines.push('A species whose own deterministic/statistical reason calls it minor (or subordinate, accessory, trace, rare) and which out-numbers the median headline (expects_species) species in surviving crystals per vug; the last three columns say whether it ALSO out-numbers them in visible crystals and out-weighs them in volume.');
lines.push('| scenario | species | its reason says | crystals per vug | headline median | visible per vug | headline median visible | holds by visible count | volume share | headline median volume share | holds by volume |');
lines.push('|---|---|---|---:|---:|---:|---:|---|---:|---:|---|');
const selfClaims = [];
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
      const word = (e.reason.match(MINOR_WORDS) || [''])[0];
      const nVis = S.meanVis[e.mineral] || 0, v = S.vol.out[e.mineral] || 0;
      const byVis = nVis > hVis && nVis > 0, byVol = v > hVol && v > 0;
      selfClaims.push({ scenario: scn, mineral: e.mineral, word, field, perVug: n, headlineMedian: hSurv,
        visPerVug: nVis, headlineVis: hVis, byVis, volShare: v, headlineVol: hVol, byVol });
      lines.push(`| ${scn} | ${e.mineral} | "${word}" (${field.replace('_species', '')}) | ${n.toFixed(1)} | ${hSurv.toFixed(1)} | ${nVis.toFixed(2)} | ${hVis.toFixed(2)} | ${byVis ? 'yes' : 'no'} | ${pct(v)} | ${pct(hVol)} | ${byVol ? 'yes' : 'no'} |`);
    }
  }
}
lines.push(`\n${selfClaims.length} cases by surviving count; ${selfClaims.filter((c) => c.byVis).length} also by visible count; ${selfClaims.filter((c) => c.byVol).length} also by volume.`);
json.__self_claims = selfClaims;

// ---- fleet: what sets a species' crystal count?
// Static scan of the nucleation modules. strict: the σ gate (or calcite/aragonite's water-mode
// gateClear) requires NO exposed crystal of the species; soft: a second+ crystal only when σ > ~2
// and a ~30 % roll passes; cap-only: the per-species max_nucleation_count is the only count bound.
// Species with no _nuc_ function are classified from the code instead of defaulting: a
// TRANSFORMATION product (js/75-transitions.ts parent → product tables: tincalconite from borax,
// pararealgar from realgar, …) inherits its parent's count; a SHARED-selector species (the beryl
// and corundum varieties, raspite) is nucleated inside another species' function.
const nucSrc = fs.readdirSync(path.join(ROOT, 'js'))
  .filter((f) => /^(8\d|89a|90|91)-nucleation-.*\.ts$/.test(f))
  .map((f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
const nucFns = {};
{
  const re = /function _nuc_(\w+)\s*\(sim\)\s*\{/g;
  const idx = [];
  let m;
  while ((m = re.exec(nucSrc))) idx.push([m[1], m.index]);
  idx.forEach(([name, at], i) => { nucFns[name] = nucSrc.slice(at, i + 1 < idx.length ? idx[i + 1][1] : nucSrc.length); });
}
const transitionsSrc = fs.readFileSync(path.join(ROOT, 'js', '75-transitions.ts'), 'utf8');
const TRANSFORM = {};
for (const m of transitionsSrc.matchAll(/^\s*([a-z_]+):\s*\['([a-z_-]+)'/gm)) TRANSFORM[m[2]] = m[1];
function gateKind(m) {
  const f = nucFns[m];
  if (!f) {
    if (TRANSFORM[m]) return 'transformation';
    return 'shared-selector';
  }
  if (/existing_\w+\.length\s*<\s*\d+/.test(f) || /if \(!existing_\w+\.length \|\|/.test(f)) return 'soft';
  if (/if \(sigma[^\n]*!existing_\w+\.length/.test(f) || /:\s*!existing_\w+\.length;/.test(f)
      || /if \(existing_\w+\.length\s*(?:\|\||\))[^\n]*return/.test(f)) return 'strict';
  return 'cap-only';
}
const fleet = {};
const pairs = {};
for (const r of runs) {
  for (const [m, v] of Object.entries(r.species)) {
    if (v.n_surv <= 0) continue;
    const f = (fleet[m] ||= { runs: 0, surv: 0, vis: 0, scen: new Set() });
    f.runs++; f.surv += v.n_surv; f.vis += v.n_1; f.scen.add(r.scenario);
    const p = (pairs[`${m}|${r.scenario}`] ||= { m, scenario: r.scenario, runs: 0, surv: 0 });
    p.runs++; p.surv += v.n_surv;
  }
}
const idiom = Object.entries(fleet).map(([m, f]) => ({
  m, gate: gateKind(m), parent: TRANSFORM[m] || null, cap: SPEC[m]?.max_nucleation_count ?? null, runs: f.runs,
  scenarios: f.scen.size, perVug: f.surv / f.runs, visPerVug: f.vis / f.runs,
})).sort((a, b) => b.perVug - a.perVug);
const GATES = ['strict', 'soft', 'cap-only', 'transformation', 'shared-selector'];
lines.push('\n## Fleet: crystals per vug by nucleation gate (all scenarios, all seeds, vugs where the species survives)');
for (const kind of GATES) {
  const g = idiom.filter((r) => r.gate === kind);
  if (!g.length) continue;
  lines.push(`${kind.padEnd(16)} ${String(g.length).padStart(3)} species, median ${med(g.map((r) => r.perVug))?.toFixed(2)} crystals per vug (median ${med(g.map((r) => r.visPerVug))?.toFixed(2)} ≥ 1 mm)`);
}
const strictPairs = Object.values(pairs).filter((p) => gateKind(p.m) === 'strict');
const strictAtOne = strictPairs.filter((p) => p.surv / p.runs <= 1.25);
lines.push(`strict-gated (species, scenario) pairs at ≤ 1.25 surviving crystals per vug (where present): ${strictAtOne.length} of ${strictPairs.length}`);
lines.push('| species | gate | parent | max_nucleation_count | vugs with it | scenarios | crystals per vug | ≥ 1 mm per vug |');
lines.push('|---|---|---|---:|---:|---:|---:|---:|');
for (const r of idiom) lines.push(`| ${r.m} | ${r.gate} | ${r.parent ?? ''} | ${r.cap ?? '—'} | ${r.runs} | ${r.scenarios} | ${r.perVug.toFixed(2)} | ${r.visPerVug.toFixed(2)} |`);

// What happens to each real top-three species, by its gate.
const fate = [];
for (const [scn, j] of Object.entries(json)) {
  if (scn.startsWith('__')) continue;
  for (const k of j.realTop) {
    const r = j.rows.find((x) => x.k === k);
    if (!r || !SPEC[k]) continue;   // no engine: species debt, counted separately
    let what;
    if (r.present === 0) what = 'never forms';
    else if (j.simTop.includes(k)) what = 'in the sim top three';
    else if (r.medMax < 1) what = 'dust (median largest < 1 mm)';
    else what = 'visible, outside the sim top three';
    fate.push({ scenario: scn, k, gate: gateKind(k), what, perVug: r.meanSurv });
  }
}
const FATES = ['never forms', 'dust (median largest < 1 mm)', 'visible, outside the sim top three', 'in the sim top three'];
lines.push('\n## What happens to each real top-three species (species with an engine)');
lines.push(`| gate | ${FATES.join(' | ')} | total |`);
lines.push(`|---|${FATES.map(() => '---:').join('|')}|---:|`);
for (const kind of GATES) {
  const g = fate.filter((f) => f.gate === kind);
  if (!g.length) continue;
  lines.push(`| ${kind} | ${FATES.map((w) => g.filter((f) => f.what === w).length).join(' | ')} | ${g.length} |`);
}
lines.push(`| all | ${FATES.map((w) => fate.filter((f) => f.what === w).length).join(' | ')} | ${fate.length} |`);
for (const kind of ['strict', 'soft', 'cap-only']) {
  const vis = fate.filter((f) => f.gate === kind && (f.what === 'in the sim top three' || f.what === 'visible, outside the sim top three'));
  lines.push(`P(in the sim top three | it forms visible crystals), ${kind}: ${vis.filter((f) => f.what === 'in the sim top three').length}/${vis.length}`);
}
const simTopSlots = Object.entries(json).filter(([k]) => !k.startsWith('__')).flatMap(([, j]) => j.simTop);
lines.push(`sim top-three slots by gate: ${GATES.map((g) => `${g} ${simTopSlots.filter((k) => gateKind(k) === g).length}`).join(', ')} (of ${simTopSlots.length})`);
lines.push(`real top-three slots by gate (species with an engine): ${GATES.map((g) => `${g} ${fate.filter((f) => f.gate === g).length}`).join(', ')} (of ${fate.length})`);
lines.push('Never-forming real top-three species: ' + fate.filter((f) => f.what === 'never forms').map((f) => `${f.k}@${f.scenario}`).join(', '));
json.__fate = fate;

json.__fleet_idiom = idiom;

// ---- dust: a headline species the sim grows but, in most seeds, never past 1 mm.
// Headline = ≥ 10 % of the voting real record, or a literature class of abundant.
lines.push('\n## Dust — headline species the sim grows with a median largest crystal < 1 mm');
lines.push('| scenario | species | real share (voting sources) | literature | sim crystals per vug | median largest mm | largest in any seed mm | seeds with a ≥ 1 mm crystal |');
lines.push('|---|---|---:|---|---:|---:|---:|---:|');
const dust = [];
for (const [scn, j] of Object.entries(json)) {
  if (scn.startsWith('__')) continue;
  for (const r of j.rows) {
    const headline = (r.real != null && r.real >= DUST_REAL) || /^AB/.test(r.lit || '');
    if (!headline || r.meanSurv <= 0 || r.medMax >= 1) continue;
    dust.push({ scenario: scn, k: r.k, real: r.real, lit: r.litShown, perVug: r.meanSurv, medMax: r.medMax, maxMax: r.maxMax, visPresent: r.visPresent });
    lines.push(`| ${scn} | ${r.k} | ${r.real == null ? '—' : pct(r.real) + '%'} | ${r.litShown ?? ''} | ${r.meanSurv.toFixed(1)} | ${mm(r.medMax)} | ${mm(r.maxMax)} | ${pct(r.visPresent)}% |`);
  }
}
json.__dust = dust;

// ---- robustness: does the broad mismatch depend on the measure?
const scored = Object.entries(json).filter(([k, j]) => !k.startsWith('__') && j.rhoReal != null);
const medRho = (key) => med(scored.map(([, j]) => j[key]).filter((x) => x != null));
let volBetter = 0, volWorse = 0, volEqual = 0, volBetter05 = 0, volWorse05 = 0;
for (const [, j] of scored) {
  if (j.rhoVol == null) continue;
  if (j.rhoVol > j.rhoReal) volBetter++; else if (j.rhoVol < j.rhoReal) volWorse++; else volEqual++;
  if (j.rhoVol > j.rhoReal + 0.05) volBetter05++; else if (j.rhoVol < j.rhoReal - 0.05) volWorse05++;
}
lines.push('\n## Robustness of the median ρ to the sim measure');
lines.push(`median ρ over ${scored.length} scored scenarios — visible count ${medRho('rhoReal')?.toFixed(2)}, surviving count ${medRho('rhoSurv')?.toFixed(2)}, volume ${medRho('rhoVol')?.toFixed(2)}, seeds with a visible crystal ${medRho('rhoVisPres')?.toFixed(2)}`);
lines.push(`volume vs visible count: ρ higher in ${volBetter}, lower in ${volWorse}, equal in ${volEqual}; with |Δρ| > 0.05: higher in ${volBetter05}, lower in ${volWorse05}`);
const bands = scored.map(([, j]) => j.band).filter(Boolean);
lines.push(`median width of the 5–95 % seed-bootstrap band: ${med(bands.map((b) => b[1] - b[0]))?.toFixed(2)}; scenarios whose verdict differs in ≥ 20 % of resamples: ${scored.filter(([, j]) => j.verdictFlips >= 0.2).map(([k, j]) => `${k} (${(100 * j.verdictFlips).toFixed(0)} %)`).join(', ') || 'none'}`);
json.__robustness = { medianRho: { visible: medRho('rhoReal'), surviving: medRho('rhoSurv'), volume: medRho('rhoVol'), visiblePresence: medRho('rhoVisPres') },
  volume: { better: volBetter, worse: volWorse, equal: volEqual, better05: volBetter05, worse05: volWorse05 } };

fs.mkdirSync(OUT, { recursive: true });
const board = ['\n## Scoreboard', `ρ = Spearman between the sim's share of ≥ 1 mm crystals and the real share (mean of photo and listing shares; a source with < ${THIN} observations does not vote), with its 5–95 % seed-bootstrap band. Top 3 = species with the largest shares. Literature marks: (S) snippet-level, (R) recalled.`, '',
  '| scenario | locality | verdict | ρ(sim, real) | seed band | verdict differs | real top 3 | sim top 3 (≥ 1 mm) | overlap | literature: sim top 3 rated rare/undocumented | literature: abundant, no sim crystal ≥ 1 mm |', '|---|---|---|---:|---|---:|---|---|---:|---|---|'];
for (const [scn, j] of Object.entries(json).filter(([k]) => !k.startsWith('__')).sort((a, b) => (a[1].rhoReal ?? -9) - (b[1].rhoReal ?? -9))) {
  board.push(`| ${scn} | ${j.locality} | ${j.verdict} | ${j.rhoReal?.toFixed(2) ?? '—'} | ${j.band ? `${j.band[0].toFixed(2)} to ${j.band[1].toFixed(2)}` : '—'} | ${(100 * j.verdictFlips).toFixed(0)} % | ${j.realTop.join(', ')} | ${j.simTop.join(', ')} | ${j.overlap} | ${j.litLow.join(', ')} | ${j.litMissing.join(', ')} |`);
}
const verdicts = {};
for (const [k, j] of Object.entries(json)) if (!k.startsWith('__')) verdicts[j.verdict] = (verdicts[j.verdict] || 0) + 1;
board.push('', `Verdicts: ${Object.entries(verdicts).map(([v, n]) => `${v} ${n}`).join(', ')}.`);
const head = `# Sim vs locality abundance — SIM ${simVersions[0]}, ${[...new Set(runs.map((r) => r.seed))].length} seeds\n\nThresholds: OVER sim ≥ ${OVER_SIM * 100}% of visible crystals with photos and listings < ${OVER_REAL * 100}%; UNDER photos ≥ ${UNDER_REAL * 100}% with sim < ${UNDER_SIM * 100}%; ABSENT sim in ≥ ${ABSENT_SEEDS * 100}% of seeds with no photo and no listing; dust = a headline species (≥ ${DUST_REAL * 100}% of the voting record, or literature AB) with a median largest crystal < 1 mm.\n`;
fs.writeFileSync(path.join(OUT, 'compare.md'), head + board.join('\n') + '\n' + lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'compare.json'), JSON.stringify(json, null, 1));
console.log(head + board.join('\n') + '\n' + lines.join('\n'));
