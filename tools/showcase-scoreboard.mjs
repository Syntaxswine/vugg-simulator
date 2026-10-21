#!/usr/bin/env node
/**
 * tools/showcase-scoreboard.mjs — does each locality scenario grow the pocket worth showing?
 * (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md)
 *
 * Vugg models the pockets where something happened — the ones collectors photograph, keep and sell —
 * not the average pocket (the boss, 2026-10-21). So the locality record (Mineralienatlas photographs
 * and eBay listings) is read here as the TARGET — which species people want to see from the place —
 * and the literature as the constraint: a species its sources place outside the modelled part of the
 * deposit is not a target (the comparison's OUT_OF_CLAIM set-asides). Per scenario, from the committed
 * census and the comparison's output:
 *   signature species  the record's top three (compare.json realTop: photo and listing shares), or,
 *                      where no source votes, the literature's abundant species
 *   showcase size      per seed, the species' largest crystal not flagged as enclosed (max_exp_mm):
 *                      ≥ 10 mm cabinet, ≥ 5 mm thumbnail, ≥ 1 mm visible, smaller = dust
 *   star               per seed, the species of the largest unflagged crystal — what a collector
 *                      photographs first — and how often it is a signature species
 *   signature volume   the share of the unflagged crystal volume that signature species hold
 *   clutter            the share of unflagged ≥ 1 mm crystals belonging to species with no photograph,
 *                      no listing and no literature class beyond "not documented" or "questionable"
 * A scenario is SHOWCASE when every signature species with an engine reaches 5 mm in at least half
 * the seeds and the star is a signature species in at least half; PARTIAL when at least one signature
 * species reaches 1 mm in at least half the seeds; MISSING otherwise.
 *
 * PASSIVE: reads .local-evidence/locality-abundance/compare.json (run
 * tools/locality-abundance-compare.mjs first) and .local-evidence/assemblage-census/runs.jsonl, loads the
 * simulator bundle only to read each scenario's vug diameter (no steps run), and writes
 * .local-evidence/locality-abundance/showcase.{md,json}.
 *
 * Usage: node tools/showcase-scoreboard.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance');
const CMP = path.join(OUT, 'compare.json');
const RUNS = path.join(ROOT, '.local-evidence', 'assemblage-census', 'runs.jsonl');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;
const CABINET = 10, THUMB = 5, VISIBLE = 1;
// Literature classes that put a species on record at the locality (anything else, with no photograph
// and no listing, makes a visible crystal of it clutter).
const ON_RECORD = /^(AB|CO|UN|RA|VR|doc)/;
// "Wanted" = what people come to the locality for, more broadly than the top three: at least this
// share of the record. The literature does not make a species wanted: the record mixes abundance,
// collector grade and desire, and a species can be abundant yet absent from it — not collector grade,
// or a locality nobody asks about (vein quartz, unless it carries gold; the boss, 2026-10-21). An
// abundant species the record ignores is supporting cast: it belongs in the pocket, not as its star.
const WANTED_SHARE = 0.05;
// Where no source votes, the signature is the collectible the sources name, not every abundant phase
// (the Great Salt Plains' halite is abundant as a surface crust, not as a collectible).
const THIN_SIGNATURE = {
  great_salt_plains: { species: ['selenite'], why: 'hourglass selenite is the collectible; halite is a thin surface crust (US FWS 2002)' },
  chiastolite_hornfels: { species: ['andalusite'], why: 'chiastolitic andalusite to 14 cm (Teale 1979)' },
  sulphur_bank: { species: ['cinnabar', 'native_sulfur'], why: 'cinnabar, the "most abundant metallic mineral" (Ross 1940, two districts together), and native sulfur; the opal is a replacement of the basalt, not a crystal collectible' },
};

const cmp = JSON.parse(fs.readFileSync(CMP, 'utf8'));
if (!cmp.__out_of_claim) throw new Error('compare.json predates the set-aside export; re-run tools/locality-abundance-compare.mjs');
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const runsBy = {};
for (const r of runs) (runsBy[r.scenario] ||= []).push(r);

const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed } = await h.loadSimBundle({ toolName: 'showcase-scoreboard' });
const vugDiameter = (scn) => {
  setSeed(42);
  const s = SCENARIOS[scn]();
  return new VugSimulator(s.conditions, s.events).wall_state?.vug_diameter_mm ?? null;
};

const med = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
const pct = (x) => `${Math.round(100 * x)}`;
const mm = (x) => (x == null ? '—' : x === 0 ? '0' : x < 0.01 ? '<0.01' : x.toFixed(x < 10 ? 1 : 0));
const name = (k) => k.replace(/^(x:|ma:)/, '').replace(/_/g, ' ');

const out = {};
const md = [];
for (const [scn, j] of Object.entries(cmp).filter(([k]) => !k.startsWith('__')).sort((a, b) => a[1].locality.localeCompare(b[1].locality) || a[0].localeCompare(b[0]))) {
  const rs = runsBy[scn];
  if (!rs) continue;
  const n = rs.length;
  const outOfScope = j.verdict === 'OUT OF SCOPE';
  const setAside = (k) => !!cmp.__out_of_claim[`${scn}|${k}`];
  // Signature species: the record's top three, or the collectible the sources name where no source votes.
  const thin = j.verdict === 'THIN';
  if (thin && !THIN_SIGNATURE[scn]) throw new Error(`${scn} is THIN but has no THIN_SIGNATURE entry`);
  const basis = thin ? `literature: ${THIN_SIGNATURE[scn].why}` : 'record';
  let sig = thin ? THIN_SIGNATURE[scn].species : [...j.realTop.sure, ...j.realTop.tied];
  sig = sig.filter((k) => !setAside(k));
  const rowOf = (k) => j.rows.find((r) => r.k === k);
  const wanted = new Set([...sig, ...j.rows.filter((r) => !setAside(r.k) && (r.real ?? 0) >= WANTED_SHARE).map((r) => r.k)]);
  const clutterSet = new Set(j.rows.filter((r) => r.photo === 0 && r.ebay === 0 && !ON_RECORD.test(r.lit || '')).map((r) => r.k));
  const species = sig.map((k) => {
    const sizes = rs.map((r) => r.species[k]?.max_exp_mm ?? 0);
    const allSizes = rs.map((r) => r.species[k]?.max_mm ?? 0);
    const formed = rs.filter((r) => (r.species[k]?.n_surv ?? 0) > 0).length / n;
    const share = (t) => sizes.filter((x) => x >= t).length / n;
    let status;
    if (!SPEC[k]) status = 'no engine';
    else if (formed === 0) status = 'never forms';
    else if (share(CABINET) >= 0.5) status = 'cabinet';
    else if (share(THUMB) >= 0.5) status = 'thumbnail';
    else if (share(VISIBLE) >= 0.5) status = 'visible';
    else if (allSizes.filter((x) => x >= VISIBLE).length / n >= 0.5) status = 'flagged';
    else status = 'dust';
    return { k, real: rowOf(k)?.real ?? null, lit: rowOf(k)?.litShown ?? null, engine: !!SPEC[k], formed,
      medLargest: med(sizes), maxLargest: Math.max(...sizes), thumbShare: share(THUMB), cabinetShare: share(CABINET), visibleShare: share(VISIBLE), status };
  });
  // Star, signature volume and clutter, per seed.
  const stars = {};
  let starSig = 0, starWanted = 0, volSig = 0, volAll = 0, visClutter = 0, visAll = 0;
  for (const r of rs) {
    let star = null, best = 0;
    for (const [m, v] of Object.entries(r.species)) {
      if ((v.max_exp_mm ?? 0) > best) { best = v.max_exp_mm; star = m; }
      volAll += v.vol_exp_mm3 ?? 0;
      if (sig.includes(m)) volSig += v.vol_exp_mm3 ?? 0;
      visAll += v.n_1_exp ?? 0;
      if (clutterSet.has(m)) visClutter += v.n_1_exp ?? 0;
    }
    if (star) {
      stars[star] = (stars[star] || 0) + 1;
      if (sig.includes(star)) starSig++;
      if (wanted.has(star)) starWanted++;
    }
  }
  const starRank = Object.entries(stars).sort((a, b) => b[1] - a[1]);
  const engineSig = species.filter((s) => s.engine);
  const status = outOfScope ? 'OUT OF SCOPE'
    : !engineSig.length ? 'NO ENGINE'
    : engineSig.every((s) => s.status === 'thumbnail' || s.status === 'cabinet') && starSig / n >= 0.5 ? 'SHOWCASE'
    : engineSig.some((s) => ['visible', 'thumbnail', 'cabinet'].includes(s.status)) ? 'PARTIAL' : 'MISSING';
  const vug = vugDiameter(scn);
  out[scn] = { locality: j.locality, comparisonVerdict: j.verdict, basis, vugDiameterMm: vug, signature: species, status,
    wanted: [...wanted], stars: Object.fromEntries(starRank.map(([m, c]) => [m, c / n])), starIsSignature: starSig / n, starIsWanted: starWanted / n,
    signatureVolumeShare: volAll > 0 ? volSig / volAll : 0, clutterVisibleShare: visAll > 0 ? visClutter / visAll : 0,
    clutterSpecies: [...clutterSet].filter((m) => rs.some((r) => (r.species[m]?.n_1_exp ?? 0) > 0)) };
}

const STATUSES = ['SHOWCASE', 'PARTIAL', 'MISSING', 'NO ENGINE', 'OUT OF SCOPE'];
const tally = STATUSES.map((s) => `${s} ${Object.values(out).filter((o) => o.status === s).length}`).join(', ');
md.push(`# Showcase scoreboard — ${Object.keys(out).length} locality scenarios, ${runs.length ? [...new Set(runs.map((r) => r.seed))].length : 0} seeds`);
md.push('');
md.push(`Signature species = the record's top three (photographs and listings), or, where no source votes, the collectible the sources name (marked *); set-aside species (outside the scenario's scope) are left out. Wanted = signature species plus any species with ≥ ${WANTED_SHARE * 100} % of the record (the literature makes a species possible, not wanted). Largest = the largest crystal not flagged as enclosed; "≥ 5 mm" / "≥ 10 mm" = share of seeds in which it reaches that size. Star = the species of the largest unflagged crystal in a seed. Clutter = unflagged ≥ 1 mm crystals of species with no photograph, no listing and no literature class beyond ND/Q. Status: ${tally}.`);
md.push('');
md.push('| scenario (locality) | status | vug mm | signature species: status, median largest mm, seeds ≥ 5 mm / ≥ 10 mm | star (share of seeds) | star is a signature / wanted species | signature share of volume | clutter share of visible crystals |');
md.push('|---|---|---:|---|---|---:|---:|---:|');
const order = (o) => STATUSES.indexOf(o.status);
for (const [scn, o] of Object.entries(out).sort((a, b) => order(a[1]) - order(b[1]) || b[1].starIsSignature - a[1].starIsSignature || a[0].localeCompare(b[0]))) {
  const sigText = o.signature.map((s) => `${name(s.k)}: ${s.status}${s.engine && s.status !== 'never forms' ? `, ${mm(s.medLargest)}, ${pct(s.thumbShare)} / ${pct(s.cabinetShare)} %` : ''}`).join('; ') || '—';
  const starText = Object.entries(o.stars).slice(0, 2).map(([m, f]) => `${name(m)} ${pct(f)} %`).join(', ');
  md.push(`| ${scn} (${o.locality}) | ${o.status} | ${o.vugDiameterMm?.toFixed(0) ?? '—'} | ${o.basis === 'record' ? '' : '* '}${sigText} | ${starText} | ${pct(o.starIsSignature)} / ${pct(o.starIsWanted)} % | ${pct(o.signatureVolumeShare)} % | ${pct(o.clutterVisibleShare)} %${o.clutterSpecies.length ? ` (${o.clutterSpecies.map(name).join(', ')})` : ''} |`);
}
// Fleet summary of the signature slots.
const slots = Object.values(out).filter((o) => o.status !== 'OUT OF SCOPE').flatMap((o) => o.signature);
const byStatus = {};
for (const s of slots) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
md.push('');
md.push(`Signature slots (${slots.length}): ${['cabinet', 'thumbnail', 'visible', 'flagged', 'dust', 'never forms', 'no engine'].map((s) => `${s} ${byStatus[s] || 0}`).join(', ')}.`);
const scored = Object.values(out).filter((o) => o.status !== 'OUT OF SCOPE');
md.push(`The star is a signature species in at least half the seeds in ${scored.filter((o) => o.starIsSignature >= 0.5).length} of ${scored.length} scenarios, and a wanted species in ${scored.filter((o) => o.starIsWanted >= 0.5).length}; median signature share of the visible volume ${pct(med(scored.map((o) => o.signatureVolumeShare)))} %; median clutter share of the visible crystals ${pct(med(scored.map((o) => o.clutterVisibleShare)))} %.`);
md.push(`Where no source votes, the signature is the named collectible: ${Object.entries(THIN_SIGNATURE).map(([k, v]) => `${k} — ${v.why}`).join('; ')}.`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'showcase.md'), md.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'showcase.json'), JSON.stringify(out, null, 1));
console.log(md.join('\n'));
