#!/usr/bin/env node
/**
 * tools/locality-abundance-compare.mjs — sim crystal ratios vs real-world abundance proxies
 * (locality-abundance review, 2026-10-21).
 *
 * Inputs:
 *   .local-evidence/assemblage-census/runs.jsonl        (tools/assemblage-census.mjs)
 *   proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json   (the captured proxies: Mineralienatlas
 *                                                        photo counts, eBay listing titles
 *                                                        classified by tools/market-title-dictionary.mjs)
 *
 * For each scenario anchored to a real locality it prints, per species, the sim's share of
 * surviving crystals, of eye-visible (≥ 1 mm) crystals and of crystal volume (all averaged over
 * the seed panel), beside the locality's share of photographs and of listings. Shares, not raw
 * counts: the photo archive of Tsumeb and the eBay supply of Herkimer quartz differ by orders of
 * magnitude, and only the within-locality ratio is a claim about the rock.
 *
 * Flags (all thresholds are printed with the table so a reader can disagree with them):
 *   OVER   — the sim gives a species ≥ 10 % of its visible crystals while the locality's photo
 *            AND listing shares are both < 1 % (a ratio the specimens never show).
 *   UNDER  — the locality's photo share is ≥ 10 % (a headline species) while the sim gives it
 *            < 2 % of visible crystals; split by whether the sim has an engine for it.
 *   ABSENT — the sim grows a species (any size, ≥ 25 % of seeds) that neither proxy records at
 *            the locality at all.
 *
 * Spearman ρ is computed over the union of the top-12 species of the sim (visible share) and of
 * the photo record, with absent species at share 0 (ties get average ranks).
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
const THIN = 20;  // fewer photos (or listing mentions) than this and the source does not vote
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
function spearman(a, b) {
  if (a.length < 3) return null;
  const ra = ranks(a), rb = ranks(b);
  const n = a.length, ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : null;
}

// ---- sim side
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const simVersions = [...new Set(runs.map((r) => r.sim_version))];
if (simVersions.length !== 1) throw new Error(`runs.jsonl mixes SIM versions ${simVersions.join(',')}`);
const sim = {};
for (const r of runs) {
  const s = (sim[r.scenario] ||= { seeds: new Set(), per: {} });
  s.seeds.add(r.seed);
  for (const [m, v] of Object.entries(r.species)) {
    const p = (s.per[m] ||= { surv: 0, vis: 0, vol: 0, present: 0, visPresent: 0, maxmm: [] });
    p.surv += v.n_surv; p.vis += v.n_1; p.vol += v.vol_mm3;
    if (v.n_surv > 0) p.present++;
    if (v.n_1 > 0) p.visPresent++;
    if (v.n_surv > 0) p.maxmm.push(v.max_mm);
  }
}
function simTable(scn) {
  const s = sim[scn];
  if (!s) return null;
  const n = s.seeds.size;
  const surv = {}, vis = {}, vol = {};
  for (const [m, p] of Object.entries(s.per)) { surv[m] = p.surv / n; vis[m] = p.vis / n; vol[m] = p.vol / n; }
  const median = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  return {
    seeds: n, surv: shares(surv), vis: shares(vis), vol: shares(vol), meanSurv: surv, meanVis: vis,
    present: Object.fromEntries(Object.entries(s.per).map(([m, p]) => [m, p.present / n])),
    visPresent: Object.fromEntries(Object.entries(s.per).map(([m, p]) => [m, p.visPresent / n])),
    medMax: Object.fromEntries(Object.entries(s.per).map(([m, p]) => [m, median(p.maxmm)])),
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

const pct = (x) => (x == null ? '—' : x === 0 ? '0' : x < 0.001 ? '<0.1' : (100 * x).toFixed(x < 0.1 ? 1 : 0));
const lines = [];
const json = {};
for (const [loc, L] of Object.entries(data.localities)) {
  for (const scn of L.scenarios || []) {
    const S = simTable(scn);
    if (!S) continue;
    const R = realTable(loc);
    const keys = new Set([
      ...Object.entries(S.vis.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
      ...Object.entries(S.surv.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
      ...Object.entries(R.photos.out).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
      ...Object.entries(R.ebay.out).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k),
      ...Object.entries(R.lit).filter(([, v]) => /^(AB|CO)/.test(v?.class || '')).map(([k]) => k),
    ]);
    const rows = [...keys].map((k) => ({
      k, engine: !!SPEC[k], simSurv: S.surv.out[k] || 0, simVis: S.vis.out[k] || 0, simVol: S.vol.out[k] || 0,
      meanSurv: S.meanSurv[k] || 0, present: S.present[k] || 0, medMax: S.medMax[k] || 0,
      photo: R.photos.out[k] || 0, ebay: R.ebay.out[k] || 0, lit: R.lit[k]?.class || null,
    })).sort((a, b) => (b.photo - a.photo) || (b.simVis - a.simVis));
    const flags = [];
    for (const r of rows) {
      if (r.simVis >= OVER_SIM && r.photo < OVER_REAL && r.ebay < OVER_REAL) flags.push(`OVER ${r.k} (sim ${pct(r.simVis)}% of visible crystals; photos ${pct(r.photo)}%, listings ${pct(r.ebay)}%)`);
      if (r.photo >= UNDER_REAL && r.simVis < UNDER_SIM) flags.push(`UNDER ${r.k} (photos ${pct(r.photo)}%; sim ${pct(r.simVis)}% of visible crystals${r.engine ? '' : ' — NO ENGINE'})`);
      if (r.present >= ABSENT_SEEDS && r.photo === 0 && r.ebay === 0 && R.photos.tot > 0) flags.push(`ABSENT ${r.k} (sim grows it in ${pct(r.present)}% of seeds; no photo, no listing)`);
    }
    const rhoVis = spearman(rows.map((r) => r.simVis), rows.map((r) => r.photo));
    const rhoVol = spearman(rows.map((r) => r.simVol), rows.map((r) => r.photo));
    const rhoEbay = R.ebay.tot > 0 ? spearman(rows.map((r) => r.simVis), rows.map((r) => r.ebay)) : null;
    // One real ranking from both proxies: the mean of the two shares, each source used only when
    // it holds ≥ THIN observations (a 2-photo locality cannot vote).
    const usePhoto = R.photos.tot >= THIN, useEbay = R.ebay.tot >= THIN;
    for (const r of rows) {
      const parts = [usePhoto ? r.photo : null, useEbay ? r.ebay : null].filter((x) => x != null);
      r.real = parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : null;
    }
    const realOk = usePhoto || useEbay;
    const rhoReal = realOk ? spearman(rows.map((r) => r.simVis), rows.map((r) => r.real)) : null;
    const top = (key, n = 3) => rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, n).map((r) => r.k);
    const realTop = realOk ? top('real') : [], simTop = top('simVis');
    const overlap = realTop.filter((k) => simTop.includes(k)).length;
    const simLead = simTop[0];
    const leadReal = simLead ? (rows.find((r) => r.k === simLead)?.real ?? 0) : null;
    // The literature votes separately: which of the sim's top three visible species does it rate
    // rare or undocumented, and which species does it call abundant that the sim never shows ≥ 1 mm?
    const litLow = simTop.filter((k) => /^(RA|VR|ND|Q)/.test(rows.find((r) => r.k === k)?.lit || ''));
    const litMissing = rows.filter((r) => /^AB/.test(r.lit || '') && r.simVis === 0).map((r) => r.k);
    let verdict;
    if (!realOk) verdict = 'THIN';
    else if (!simTop.length) verdict = 'NO VISIBLE CRYSTALS';
    else if (rhoReal != null && rhoReal >= 0.5 && overlap >= 2) verdict = 'AGREES';
    else if ((rhoReal != null && rhoReal < 0) || leadReal < OVER_REAL) verdict = 'DISAGREES';
    else verdict = 'PARTLY';
    json[scn] = { locality: loc, seeds: S.seeds, photos_total: R.photos.tot, listings_total: R.ebay.tot,
      rhoVis, rhoVol, rhoEbay, rhoReal, realTop, simTop, overlap, verdict, litLow, litMissing, flags, rows };
    lines.push(`\n### ${scn}  ←  ${loc}   (sim ${S.seeds} seeds; ${R.photos.tot} photos; ${R.ebay.tot} listing mentions)`);
    lines.push(`ρ(sim visible-count, photos) = ${rhoVis?.toFixed(2) ?? '—'}   ρ(sim volume, photos) = ${rhoVol?.toFixed(2) ?? '—'}   ρ(sim visible-count, listings) = ${rhoEbay?.toFixed(2) ?? '—'}`);
    lines.push('| species | sim crystals/vug | seeds with it | sim % of crystals | sim % of ≥1 mm | sim % of volume | median max mm | % of photos | % of listings | literature |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
    for (const r of rows) {
      lines.push(`| ${r.k} | ${r.meanSurv.toFixed(1)} | ${pct(r.present)}% | ${pct(r.simSurv)} | ${pct(r.simVis)} | ${pct(r.simVol)} | ${r.medMax ? r.medMax.toFixed(r.medMax < 1 ? 2 : 1) : '—'} | ${pct(r.photo)} | ${pct(r.ebay)} | ${r.lit ?? ''} |`);
    }
    if (flags.length) lines.push(`\nFlags: ${flags.join('; ')}`);
  }
}
// ---- the scenarios' own abundance words vs their own crystal counts
// Every scenario lists the species its evidence seeds deliver (expects_species, and
// deterministic_species / statistical_species with a written reason). When a reason calls a
// species minor, subordinate, accessory, trace or rare, the scenario has made an abundance claim:
// that species should not outnumber the scenario's headline (expects) species.
const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS } = await h.loadSimBundle({ toolName: 'locality-abundance-compare' });
const MINOR_WORDS = /\b(minor|subordinate|accessory|trace|rare|sparse|scarce|small amounts?)\b/i;
lines.push('\n## The scenarios\' own abundance words vs their crystal counts');
lines.push('A species whose own deterministic/statistical reason calls it minor (or subordinate, accessory, trace, rare) while it outnumbers the median headline (expects_species) species in surviving crystals per vug.');
lines.push('| scenario | species | its reason says | its crystals per vug | headline median per vug | headline species |');
lines.push('|---|---|---|---:|---:|---|');
const selfClaims = [];
for (const scn of Object.keys(SCENARIOS).sort()) {
  const spec = SCENARIOS[scn]._json5_spec || {};
  const S = simTable(scn);
  if (!S) continue;
  const expects = (spec.expects_species || []).map((e) => (typeof e === 'string' ? e : e.mineral));
  const headline = expects.map((m) => S.meanSurv[m] || 0);
  const hMed = med(headline);
  for (const field of ['deterministic_species', 'statistical_species']) {
    for (const e of spec[field] || []) {
      if (!e || typeof e !== 'object' || !MINOR_WORDS.test(e.reason || '')) continue;
      const n = S.meanSurv[e.mineral] || 0;
      if (hMed != null && n > hMed && n >= 1) {
        const word = (e.reason.match(MINOR_WORDS) || [''])[0];
        selfClaims.push({ scenario: scn, mineral: e.mineral, word, perVug: n, headlineMedian: hMed });
        lines.push(`| ${scn} | ${e.mineral} | "${word}" (${field.replace('_species', '')}) | ${n.toFixed(1)} | ${hMed.toFixed(1)} | ${expects.join(', ')} |`);
      }
    }
  }
}
json.__self_claims = selfClaims;

// ---- fleet: what sets a species' crystal count?
// Static scan of the nucleation modules for the water-mode "serial gate" (`!existing_<m>.length`:
// a new crystal only when no exposed one is left). Regex-based and reported as such; the beryl
// varieties nucleate through a shared selector and are not classified here.
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
// strict: the σ gate (or calcite/aragonite's water-mode gateClear) requires NO exposed crystal;
// soft: a second+ crystal only when σ > ~2 and a ~30 % roll passes (galena, quartz, …);
// cap-only: neither — the per-species max_nucleation_count is the only count bound.
function gateKind(m) {
  const f = nucFns[m] || '';
  if (/existing_\w+\.length\s*<\s*\d+/.test(f) || /if \(!existing_\w+\.length \|\|/.test(f)) return 'soft';
  if (/if \(sigma[^\n]*!existing_\w+\.length/.test(f) || /:\s*!existing_\w+\.length;/.test(f)
      || /if \(existing_\w+\.length\s*(?:\|\||\))[^\n]*return/.test(f)) return 'strict';
  return 'cap-only';
}
const serial = (m) => gateKind(m) !== 'cap-only';
const fleet = {};
for (const r of runs) {
  for (const [m, v] of Object.entries(r.species)) {
    if (v.n_surv <= 0) continue;
    const f = (fleet[m] ||= { runs: 0, surv: 0, vis: 0, scen: new Set() });
    f.runs++; f.surv += v.n_surv; f.vis += v.n_1; f.scen.add(r.scenario);
  }
}
const idiom = Object.entries(fleet).map(([m, f]) => ({
  m, serial: serial(m), gate: gateKind(m), cap: SPEC[m]?.max_nucleation_count ?? null, runs: f.runs,
  scenarios: f.scen.size, perVug: f.surv / f.runs, visPerVug: f.vis / f.runs,
})).sort((a, b) => b.perVug - a.perVug);
lines.push('\n## Fleet: crystals per vug by nucleation idiom (all scenarios, all seeds, vugs where the species survives)');
for (const kind of ['strict', 'soft', 'cap-only']) {
  const g = idiom.filter((r) => r.gate === kind);
  lines.push(`${kind.padEnd(8)} gate: ${String(g.length).padStart(3)} species, median ${med(g.map((r) => r.perVug))?.toFixed(2)} crystals per vug (median ${med(g.map((r) => r.visPerVug))?.toFixed(2)} ≥ 1 mm)`);
}
lines.push('| species | gate | max_nucleation_count | vugs with it | scenarios | crystals per vug | ≥ 1 mm per vug |');
lines.push('|---|---|---:|---:|---:|---:|---:|');
for (const r of idiom) lines.push(`| ${r.m} | ${r.gate} | ${r.cap ?? '—'} | ${r.runs} | ${r.scenarios} | ${r.perVug.toFixed(2)} | ${r.visPerVug.toFixed(2)} |`);
json.__fleet_idiom = idiom;

fs.mkdirSync(OUT, { recursive: true });
const board = ['\n## Scoreboard', `ρ = Spearman between the sim's share of ≥ 1 mm crystals and the real share (mean of photo and listing shares; a source with < ${THIN} observations does not vote). Top 3 = species with the largest shares.`, '',
  '| scenario | locality | verdict | ρ(sim, real) | real top 3 | sim top 3 (≥ 1 mm) | overlap | literature: sim top 3 rated rare/undocumented | literature: abundant, no sim crystal ≥ 1 mm |', '|---|---|---|---:|---|---|---:|---|---|'];
for (const [scn, j] of Object.entries(json).filter(([k]) => !k.startsWith('__')).sort((a, b) => (a[1].rhoReal ?? -9) - (b[1].rhoReal ?? -9))) {
  board.push(`| ${scn} | ${j.locality} | ${j.verdict} | ${j.rhoReal?.toFixed(2) ?? '—'} | ${j.realTop.join(', ')} | ${j.simTop.join(', ')} | ${j.overlap} | ${j.litLow.join(', ')} | ${j.litMissing.join(', ')} |`);
}
const head = `# Sim vs locality abundance — SIM ${simVersions[0]}, ${[...new Set(runs.map((r) => r.seed))].length} seeds\n\nThresholds: OVER sim ≥ ${OVER_SIM * 100}% of visible crystals with photos and listings < ${OVER_REAL * 100}%; UNDER photos ≥ ${UNDER_REAL * 100}% with sim < ${UNDER_SIM * 100}%; ABSENT sim in ≥ ${ABSENT_SEEDS * 100}% of seeds with no photo and no listing.\n`;
fs.writeFileSync(path.join(OUT, 'compare.md'), head + board.join('\n') + '\n' + lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'compare.json'), JSON.stringify(json, null, 1));
console.log(head + board.join('\n') + '\n' + lines.join('\n'));
