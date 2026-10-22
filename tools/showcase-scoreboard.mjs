#!/usr/bin/env node
/**
 * tools/showcase-scoreboard.mjs — does each locality scenario grow pockets that tell its story?
 * (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, revised 2026-10-22)
 *
 * Vugg models the pockets where something happened (the boss, 2026-10-21), and a locality scenario
 * should generate a distribution of possible story pockets, not one ideal assemblage every run (the
 * boss, 2026-10-22). Each scenario is scored against its pre-registered targets
 * (proposals/DATA-STORY-POCKET-TARGETS-2026-10-22.json, written by tools/story-pocket-targets.mjs):
 *   occurrence   per species with a role, the share of runs it occurs in, against the band its
 *                literature class pre-registers (IN / LOW / HIGH, "noise" when the 95 % interval of 21
 *                runs still reaches the band);
 *   size         conditional on occurrence and on the cavity fitting the species' characteristic
 *                (median photographed) crystal: the share of those runs whose largest unflagged crystal
 *                reaches the record's lower quartile — against crystal lengths where the photographs
 *                give enough, a labelled specimen proxy where they give only specimens, unknown otherwise;
 *   pocket       the cavity (tools/story-pocket-cavities.mjs: longest interior span, extents, equivalent
 *                diameter, size class) against the primary protagonist's characteristic crystal: SMALL
 *                pockets may lack a showcase and leave the story count;
 *   story        per run, whether an intended protagonist (primary or alternate) carries the story at
 *                showcase size; per scenario, how often, against its pre-registered story frequency;
 *   star         the species of each run's largest unflagged crystal, and how often it is a wanted one;
 *   cast         companions (the literature's common species the record does not want) and showpieces
 *                (wanted rarities), each against its own band; visible clutter as before.
 * The verdict ladder: OUT OF SCOPE, NO ENGINE (no protagonist has an engine), SMALL POCKETS ONLY,
 * STORY / STORY (PROXY) (the story frequency is met, on crystal targets / only with proxies), UNRESOLVED
 * (no frequency, or protagonists of unknown size could carry it), THIN STORY, NO STORY. The previous
 * rule (every top-three species ≥ 5 mm in half the seeds: SHOWCASE / PARTIAL / MISSING) is computed
 * alongside as "before".
 *
 * PASSIVE: reads the targets sidecar, .local-evidence/locality-abundance/compare.json (record and
 * literature, for clutter and the previous rule), .local-evidence/locality-abundance/cavities.json and the
 * committed census .local-evidence/assemblage-census/runs.jsonl; runs no simulation. Writes
 * .local-evidence/locality-abundance/showcase.{md,json}.
 *
 * Usage: node tools/showcase-scoreboard.mjs [--splice <markdown file>] [--check-splice <markdown file>]
 *   --splice replaces each <!-- generated:NAME --> … <!-- /generated:NAME --> block in the file with the
 *   section of that name; --check-splice exits 1 if any block differs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessOccurrence, assessSize, runStory, storyVerdict, pocketClass, fits, summarize, validateSidecar } from './story-pocket-lib.mjs';
import { buildSizeEvidence } from './story-pocket-size-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance');
const TARGETS = path.join(ROOT, 'proposals', 'DATA-STORY-POCKET-TARGETS-2026-10-22.json');
const CMP = path.join(OUT, 'compare.json');
const CAV = path.join(OUT, 'cavities.json');
const RUNS = path.join(ROOT, '.local-evidence', 'assemblage-census', 'runs.jsonl');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;
// Literature classes that put a species on record at the locality (anything else, with no photograph
// and no listing, makes a visible crystal of it clutter).
const ON_RECORD = /^(AB|CO|UN|RA|VR|doc)/;
const CLUTTER_LIMIT = 0.1;

const targets = JSON.parse(fs.readFileSync(TARGETS, 'utf8'));
const bad = validateSidecar(targets);
if (bad.length) throw new Error(`the targets sidecar fails validation:\n  ${bad.join('\n  ')}`);
const cmp = JSON.parse(fs.readFileSync(CMP, 'utf8'));
if (!cmp.__out_of_claim) throw new Error('compare.json predates the set-aside export; re-run tools/locality-abundance-compare.mjs');
const cav = JSON.parse(fs.readFileSync(CAV, 'utf8'));
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const runsBy = {};
for (const r of runs) (runsBy[r.scenario] ||= []).push(r);
const versions = [...new Set(runs.map((r) => r.sim_version))];
if (versions.length !== 1 || versions[0] !== cav.sim_version) throw new Error(`census SIM_VERSION ${versions.join(', ')} ≠ cavities.json ${cav.sim_version}: re-run tools/story-pocket-cavities.mjs`);

const pct = (x) => (x == null ? '—' : `${Math.round(100 * x)}`);
const mm = (x) => (x == null ? '—' : x === 0 ? '0' : x < 0.01 ? '<0.01' : x.toFixed(x < 10 ? 1 : 0));
const name = (k) => k.replace(/^(x:|ma:)/, '').replace(/_/g, ' ');
const med = (a) => summarize(a).median ?? null;

// ------------------------------------------------------------------ the previous rule ("before")
function legacy(scn, j, rs) {
  const n = rs.length;
  if (j.verdict === 'OUT OF SCOPE') return { status: 'OUT OF SCOPE', facts: [] };
  const setAside = (k) => !!cmp.__out_of_claim[`${scn}|${k}`];
  const named = targets.named_signatures[scn];
  let sig = j.verdict === 'THIN' ? named.species : [...j.realTop.sure, ...j.realTop.tied];
  sig = sig.filter((k) => !setAside(k));
  const facts = sig.map((k) => {
    const sizes = rs.map((r) => r.species[k]?.max_exp_mm ?? 0);
    const allSizes = rs.map((r) => r.species[k]?.max_mm ?? 0);
    const formed = rs.filter((r) => (r.species[k]?.n_surv ?? 0) > 0).length / n;
    const share = (t) => sizes.filter((x) => x >= t).length / n;
    const status = !SPEC[k] ? 'no engine' : formed === 0 ? 'never forms' : share(10) >= 0.5 ? 'cabinet' : share(5) >= 0.5 ? 'thumbnail'
      : share(1) >= 0.5 ? 'visible' : allSizes.filter((x) => x >= 1).length / n >= 0.5 ? 'flagged' : 'dust';
    return { k, engine: !!SPEC[k], status };
  });
  let starSig = 0;
  for (const r of rs) {
    let star = null, best = 0;
    for (const [m, v] of Object.entries(r.species)) if ((v.max_exp_mm ?? 0) > best) { best = v.max_exp_mm; star = m; }
    if (star && sig.includes(star)) starSig++;
  }
  const engineSig = facts.filter((s) => s.engine);
  const status = !engineSig.length ? 'NO ENGINE'
    : engineSig.every((s) => s.status === 'thumbnail' || s.status === 'cabinet') && starSig / n >= 0.5 ? 'SHOWCASE'
    : engineSig.some((s) => ['visible', 'thumbnail', 'cabinet'].includes(s.status)) ? 'PARTIAL' : 'MISSING';
  return { status, facts };
}

// ------------------------------------------------------------------ the target-driven assessment
const out = {};
for (const [scn, T] of Object.entries(targets.scenarios).sort(([a], [b]) => a.localeCompare(b))) {
  const rs = runsBy[scn];
  if (!rs) throw new Error(`${scn} has targets but no census runs`);
  const j = cmp[scn];
  const n = rs.length;
  const C = cav.scenarios[scn];
  if (!C) throw new Error(`${scn} has no cavity in cavities.json`);
  if (!C.identical_across_seeds) throw new Error(`${scn}'s cavity differs across seeds; the scoreboard assumes one cavity per scenario`);
  const censusSeeds = new Set(rs.map((r) => r.seed));
  const seedsChecked = [...censusSeeds].every((s) => C.seeds_checked.includes(s));
  const before = legacy(scn, j, rs);
  const o = { locality: T.locality, before: before.status, before_facts: before.facts, runs: n,
    cavity: { span_mm: C.span_mm, eqd_mm: C.eqd_mm, extents_mm: C.extents_mm, size_class: C.size_class, size_class_basis: C.size_class_basis, all_census_seeds_checked: seedsChecked } };
  if (T.out_of_scope) { out[scn] = { ...o, verdict: 'OUT OF SCOPE', why: T.out_of_scope, flags: [] }; continue; }
  const sp = (r, k) => {
    const v = r.species[k];
    return { occurs: (v?.n_surv ?? 0) > 0, size: v?.max_exp_mm ?? 0, visible: (v?.n_1_exp ?? 0) > 0 };
  };
  const span = C.span_mm;
  const entries = Object.entries(T.species);
  const primary = entries.find(([, v]) => v.role === 'primary')[0];
  const primaryT = T.species[primary].size;
  o.primary = primary;
  o.pocket = pocketClass(span, primaryT);
  // Per species: occurrence against its band, size conditional on occurrence and on a fitting cavity.
  o.species = {};
  for (const [k, v] of entries) {
    const per = rs.map((r) => ({ ...sp(r, k), span }));
    const occ = per.filter((x) => x.occurs);
    o.species[k] = {
      role: v.role, engine: v.engine, band: v.occurrence_band,
      occurrence: assessOccurrence(occ.length, n, v.occurrence_band),
      target: v.size.basis === 'unknown' ? { basis: 'unknown', crystal_n: v.size.crystal_n, specimen_n: v.size.specimen_n }
        : { basis: v.size.basis, n: v.size.n, confidence: v.size.confidence, q25: v.size.q25, median: v.size.median, q90: v.size.q90, fits: fits(span, v.size) },
      when_occurring: summarize(occ.map((x) => x.size)),
      size: assessSize(per, v.size),
    };
  }
  // The story, run by run.
  const protagonists = entries.filter(([, v]) => v.role === 'primary' || v.role === 'alternate').map(([k, v]) => ({ k, target: v.size }));
  const withEngine = protagonists.filter(({ k }) => T.species[k].engine);
  const storyRuns = o.pocket === 'SMALL' ? [] : rs;
  let yesCrystal = 0, yesProxy = 0, possible = 0;
  const by = {};
  for (const r of storyRuns) {
    const s = runStory({ species: Object.fromEntries(protagonists.map(({ k }) => [k, sp(r, k)])) }, protagonists);
    if (s.story === 'YES') { if (s.basis === 'crystal') yesCrystal++; else yesProxy++; by[s.by] = (by[s.by] || 0) + 1; }
    else if (s.story === 'POSSIBLE') possible++;
  }
  o.story = { story_runs: storyRuns.length, small_runs: n - storyRuns.length, yes_crystal: yesCrystal, yes_proxy: yesProxy, possible, by,
    frequency: T.story_frequency, frequency_basis: T.story_frequency_basis,
    ...storyVerdict({ runs: storyRuns.length, yes: yesCrystal + yesProxy, yesCrystal, possible, frequency: T.story_frequency }) };
  // The star, and the cast.
  const wanted = new Set(entries.filter(([, v]) => v.role !== 'companion').map(([k]) => k));
  const stars = {};
  let starWanted = 0, starProt = 0, starComp = 0;
  for (const r of rs) {
    let star = null, best = 0;
    for (const [m, v] of Object.entries(r.species)) if ((v.max_exp_mm ?? 0) > best) { best = v.max_exp_mm; star = m; }
    if (!star) continue;
    stars[star] = (stars[star] || 0) + 1;
    if (wanted.has(star)) starWanted++;
    if (T.species[star]?.role === 'primary' || T.species[star]?.role === 'alternate') starProt++;
    if (T.species[star]?.role === 'companion') starComp++;
  }
  o.stars = Object.fromEntries(Object.entries(stars).sort((a, b) => b[1] - a[1]).map(([m, c]) => [m, c / n]));
  o.star_is_wanted = starWanted / n;
  o.star_is_protagonist = starProt / n;
  o.star_is_companion = starComp / n;
  const clutterSet = new Set(j.rows.filter((r) => r.photo === 0 && r.ebay === 0 && !ON_RECORD.test(r.lit || '')).map((r) => r.k));
  let visAll = 0, visClutter = 0;
  for (const r of rs) for (const [m, v] of Object.entries(r.species)) { visAll += v.n_1_exp ?? 0; if (clutterSet.has(m)) visClutter += v.n_1_exp ?? 0; }
  o.clutter_visible_share = visAll ? visClutter / visAll : 0;
  o.clutter_species = [...clutterSet].filter((m) => rs.some((r) => (r.species[m]?.n_1_exp ?? 0) > 0));
  // Crystals longer than the cavity's longest span: the census sees a crystal the starting cavity cannot hold.
  o.longer_than_cavity = {};
  for (const r of rs) for (const [m, v] of Object.entries(r.species)) if ((v.max_mm ?? 0) > span) o.longer_than_cavity[m] = (o.longer_than_cavity[m] || 0) + 1;
  // Why a run could only be POSSIBLE: a visible protagonist with no size target, or one short of a proxy.
  o.open = [];
  for (const { k, target } of withEngine) {
    const per = rs.map((r) => sp(r, k)).filter((x) => x.occurs && x.visible);
    if (!per.length) continue;
    if (target.basis === 'unknown') o.open.push({ k, why: 'no size target' });
    else if (target.basis !== 'crystal' && per.some((x) => x.size < target.q25)) o.open.push({ k, why: 'short of a specimen proxy' });
  }
  // The verdict.
  if (!withEngine.length) { o.verdict = 'NO ENGINE'; o.why = `no protagonist has an engine (${protagonists.map(({ k }) => name(k)).join(', ')})`; }
  else if (o.pocket === 'SMALL') { o.verdict = 'SMALL POCKETS ONLY'; o.why = `the cavity's longest span, ${mm(span)} mm, is shorter than ${name(primary)}'s characteristic crystal, ${mm(primaryT.median)} mm (${primaryT.basis}, n ${primaryT.n})`; }
  else { o.verdict = o.story.verdict; o.why = o.story.why ?? null; }
  // Flags: occurrence outside the band (not noise), oversize, the star, clutter, crystals the cavity cannot hold.
  o.flags = [];
  for (const [k, s] of Object.entries(o.species)) {
    if (!s.engine) continue;
    if ((s.occurrence.verdict === 'LOW' || s.occurrence.verdict === 'HIGH') && !s.occurrence.noise) o.flags.push(`${name(k)} (${s.role}) ${s.occurrence.k}/${n} ${s.occurrence.verdict === 'LOW' ? 'below' : 'above'} band`);
    if (s.size.verdict === 'OVERSIZE') o.flags.push(`${name(k)} oversize (median ${mm(s.size.sizes.median)} > q90 ${mm(s.target.q90)} mm)`);
  }
  if (o.star_is_wanted < 0.5) o.flags.push(`star wanted ${Math.round(o.star_is_wanted * n)}/${n}`);
  if (o.clutter_visible_share >= CLUTTER_LIMIT) o.flags.push(`clutter ${pct(o.clutter_visible_share)} %`);
  for (const [m, c] of Object.entries(o.longer_than_cavity)) o.flags.push(`${name(m)} longer than the cavity ${c}/${n}`);
  out[scn] = o;
}

// ------------------------------------------------------------------ the reasons, generated
function targetText(t) {
  if (!t || t.basis === 'unknown') return `size unknown (crystal n ${t?.crystal_n ?? 0}, specimen n ${t?.specimen_n ?? 0})`;
  return `${t.basis === 'crystal' ? 'crystal' : 'specimen proxy'} q25 ${mm(t.q25)} / median ${mm(t.median)} mm (n ${t.n}, ${t.confidence})`;
}
function reason(scn, o) {
  if (o.verdict === 'OUT OF SCOPE') return o.why;
  if (o.verdict === 'NO ENGINE' || o.verdict === 'SMALL POCKETS ONLY') return o.why;
  const s = o.story;
  const prot = Object.entries(o.species).filter(([, v]) => v.role === 'primary' || v.role === 'alternate');
  const carriers = Object.entries(s.by).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${name(k)} ${c}`).join(', ');
  const f = s.frequency == null ? 'no story frequency' : `target ${pct(s.frequency)} %`;
  const yes = s.yes_crystal + s.yes_proxy;
  const how = yes ? ` (${s.yes_proxy ? `${s.yes_crystal} on crystal targets, ${s.yes_proxy} on specimen proxies` : 'on crystal targets'})` : '';
  const head = `story in ${yes}/${s.story_runs} runs${how}${s.possible ? `, possible in ${s.possible} more` : ''}, ${f}`;
  // What each protagonist with an engine does, against its target.
  const each = prot.filter(([, v]) => v.engine).map(([k, v]) => {
    const w = v.when_occurring;
    const grown = w.n ? `median ${mm(w.median)} mm (${v.occurrence.k}/${o.runs})` : 'never occurs';
    return `${name(k)} ${grown} vs ${targetText(v.target)}`;
  });
  if (o.verdict === 'STORY' || o.verdict === 'STORY (PROXY)') return `${head}; carried by ${carriers}`;
  if (o.verdict === 'UNRESOLVED') return `${head}; ${o.why}: ${each.join('; ')}`;
  return `${head}${carriers ? `; carried by ${carriers}` : ''}; ${each.join('; ')}`;
}
for (const [scn, o] of Object.entries(out)) o.reason = reason(scn, o);

// ------------------------------------------------------------------ sections
const VERDICTS = ['STORY', 'STORY (PROXY)', 'THIN STORY', 'NO STORY', 'UNRESOLVED', 'SMALL POCKETS ONLY', 'NO ENGINE', 'OUT OF SCOPE'];
const BEFORE = ['SHOWCASE', 'PARTIAL', 'MISSING', 'NO ENGINE', 'OUT OF SCOPE'];
const order = (o) => VERDICTS.indexOf(o.verdict);
const sorted = Object.entries(out).sort((a, b) => order(a[1]) - order(b[1]) || a[0].localeCompare(b[0]));
const scored = Object.values(out).filter((o) => o.verdict !== 'OUT OF SCOPE');
const tally = (key, list) => list.map((v) => `${v} ${Object.values(out).filter((o) => o[key] === v).length}`).join(', ');
const sections = {};

{
  const md = [];
  md.push(`Status (${Object.keys(out).length} locality scenarios, ${runs.length} census runs, ${[...new Set(runs.map((r) => r.seed))].length} seeds each): ${tally('verdict', VERDICTS)}.`);
  md.push('');
  md.push('| scenario (locality) | verdict | before | cavity span mm | pocket vs the primary | runs carrying the story: crystal + proxy (+ possible) / runs scored, target | star (share of runs) | star is wanted | clutter | flags |');
  md.push('|---|---|---|---:|---|---|---|---:|---:|---|');
  for (const [scn, o] of sorted) {
    if (o.verdict === 'OUT OF SCOPE') { md.push(`| ${scn} (${o.locality}) | OUT OF SCOPE | ${o.before} | ${mm(o.cavity.span_mm)} | — | — | — | — | — | — |`); continue; }
    const s = o.story;
    const storyText = s.story_runs ? `${s.yes_crystal} + ${s.yes_proxy}${s.possible ? ` (+${s.possible})` : ''} / ${s.story_runs}, ${s.frequency == null ? 'none' : `${pct(s.frequency)} %`}` : `— (${s.small_runs} small)`;
    const [star] = Object.entries(o.stars);
    md.push(`| ${scn} (${o.locality}) | ${o.verdict}${o.story?.noise && o.verdict !== 'STORY' ? ' (noise)' : ''} | ${o.before} | ${mm(o.cavity.span_mm)} | ${o.pocket} (${name(o.primary)}) | ${storyText} | ${star ? `${name(star[0])} ${pct(star[1])} %` : '—'} | ${pct(o.star_is_wanted)} % | ${pct(o.clutter_visible_share)} % | ${o.flags.join('; ') || '—'} |`);
  }
  const pockets = {};
  for (const o of scored) pockets[o.pocket] = (pockets[o.pocket] || 0) + 1;
  md.push('');
  const unres = Object.entries(out).filter(([, o]) => o.verdict === 'UNRESOLVED');
  const kind = (o) => (o.story.frequency == null ? 'no occurrence band for any protagonist' : [...new Set(o.open.map((x) => x.why))].sort().join(' and ') || 'other');
  const groups = {};
  for (const [scn, o] of unres) (groups[kind(o)] ||= []).push(scn);
  md.push(`UNRESOLVED (${unres.length}), by what leaves it open: ${Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([g, l]) => `${g} ${l.length} (${l.join(', ')})`).join('; ')}. A specimen proxy overstates the crystal, so a crystal short of it is not a verdict; a protagonist with no size target has none to miss.`);
  md.push(`Pocket classes against the primary protagonist's characteristic crystal: ${['STORY-SCALE', 'SMALL', 'UNCLASSED'].map((p) => `${p} ${pockets[p] || 0}`).join(', ')} of ${scored.length} scored scenarios. Every scenario grows in one cavity in all its seeds (${Object.values(cav.scenarios).reduce((s, v) => s + v.seeds_checked.length, 0)} constructions checked, ${Object.values(cav.scenarios).every((v) => v.identical_across_seeds) ? 'none differ' : 'SOME DIFFER'}), so a scenario's fleet holds a single pocket class: no scenario yet has both small pockets and story-scale ones.`);
  md.push(`Size class by the cavity: ${['vug', 'pocket', 'cave'].map((k) => `${k} ${scored.filter((o) => o.cavity.size_class === k).length}`).join(', ')}; median span ${mm(med(scored.map((o) => o.cavity.span_mm)))} mm (${mm(Math.min(...scored.map((o) => o.cavity.span_mm)))}–${mm(Math.max(...scored.map((o) => o.cavity.span_mm)))}).`);
  sections.verdicts = md.join('\n');
}
{
  const md = [];
  const moves = {};
  for (const o of Object.values(out)) moves[`${o.before} → ${o.verdict}`] = (moves[`${o.before} → ${o.verdict}`] || 0) + 1;
  md.push(`Before (the previous rule: ${tally('before', BEFORE)}) → after: ${Object.entries(moves).sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m} ${c}`).join('; ')}.`);
  md.push('');
  md.push('| scenario | before | after | why (generated from the targets and the census) |');
  md.push('|---|---|---|---|');
  for (const [scn, o] of Object.entries(out).sort((a, b) => BEFORE.indexOf(a[1].before) - BEFORE.indexOf(b[1].before) || order(a[1]) - order(b[1]) || a[0].localeCompare(b[0]))) {
    const was = o.before_facts.length ? ` — before: ${o.before_facts.map((f) => `${name(f.k)} ${f.status}`).join(', ')}` : '';
    md.push(`| ${scn} | ${o.before} | ${o.verdict} | ${o.reason}${was} |`);
  }
  sections['before-after'] = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | species | role | occurs (band) | size target | largest unflagged when it occurs: median (q25–q75) | fits the cavity | eligible runs reaching q25 | size verdict |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  const rows = [];
  for (const [scn, o] of sorted) {
    if (!o.species) continue;
    for (const [k, s] of Object.entries(o.species)) {
      if (s.role === 'companion') continue;
      rows.push([scn, k, s]);
    }
  }
  const roleOrder = ['primary', 'alternate', 'showpiece', 'unsupported'];
  for (const [scn, k, s] of rows.sort((a, b) => a[0].localeCompare(b[0]) || roleOrder.indexOf(a[2].role) - roleOrder.indexOf(b[2].role) || a[1].localeCompare(b[1]))) {
    const occ = s.engine ? `${s.occurrence.k}/${s.occurrence.n} (${s.band ? `${pct(s.band[0])}–${pct(s.band[1])} %` : 'no band'}) ${s.occurrence.verdict}${s.occurrence.noise ? ' (noise)' : ''}` : 'no engine';
    const w = s.when_occurring;
    const cond = s.engine && w.n ? `${mm(w.median)} (${mm(w.q25)}–${mm(w.q75)})` : '—';
    const fit = s.target.basis === 'unknown' ? '—' : s.target.fits === true ? 'yes' : s.target.fits === false ? 'no' : 'unknown';
    const elig = s.size.eligible ? `${s.size.meeting}/${s.size.eligible} (${pct(s.size.share)} %)` : '—';
    md.push(`| ${scn} | ${name(k)} | ${s.role} | ${occ} | ${targetText(s.target)} | ${cond} | ${fit} | ${elig} | ${s.engine ? s.size.verdict : '—'} |`);
  }
  const prot = rows.filter(([, , s]) => s.role === 'primary' || s.role === 'alternate');
  const basis = {};
  for (const [, , s] of prot) basis[s.target.basis === 'crystal' ? `crystal (${s.target.confidence})` : s.target.basis] = (basis[s.target.basis === 'crystal' ? `crystal (${s.target.confidence})` : s.target.basis] || 0) + 1;
  md.push('');
  md.push(`Protagonist size targets (${prot.length} primary and alternate slots): ${Object.entries(basis).sort().map(([b, c]) => `${b} ${c}`).join(', ')}. Size verdicts of protagonists with an engine: ${(() => { const v = {}; for (const [, , s] of prot) if (s.engine) v[s.size.verdict] = (v[s.size.verdict] || 0) + 1; return Object.entries(v).sort((a, b) => b[1] - a[1]).map(([x, c]) => `${x} ${c}`).join(', '); })()}.`);
  sections.protagonists = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | star (share of runs) | star is a wanted species / a protagonist / a companion | the star\'s role |');
  md.push('|---|---|---:|---|');
  for (const [scn, o] of sorted) {
    if (!o.stars || o.star_is_wanted >= 0.5) continue;
    const [top] = Object.entries(o.stars);
    const role = top ? (targets.scenarios[scn].species[top[0]]?.role ?? 'none (not a target)') : '—';
    md.push(`| ${scn} | ${Object.entries(o.stars).slice(0, 2).map(([m, f]) => `${name(m)} ${pct(f)} %`).join(', ') || '—'} | ${pct(o.star_is_wanted)} / ${pct(o.star_is_protagonist)} / ${pct(o.star_is_companion)} % | ${role} |`);
  }
  md.push('');
  md.push(`The star is a wanted species in at least half the runs in ${scored.filter((o) => o.star_is_wanted >= 0.5).length} of ${scored.length} scored scenarios; it is a companion — the supporting cast in the star's place — in at least half the runs in ${scored.filter((o) => o.star_is_companion >= 0.5).length}.`);
  sections.stars = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | clutter share of visible crystals | species |');
  md.push('|---|---:|---|');
  for (const [scn, o] of Object.entries(out).filter(([, o]) => (o.clutter_visible_share ?? 0) >= CLUTTER_LIMIT).sort((a, b) => b[1].clutter_visible_share - a[1].clutter_visible_share)) {
    md.push(`| ${scn} (${o.locality}) | ${pct(o.clutter_visible_share)} % | ${o.clutter_species.map(name).join(', ')} |`);
  }
  sections.clutter = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | companions (occurs / band) | showpieces (occurs / band) | unsupported (wanted, contradicted by the literature) |');
  md.push('|---|---|---|---|');
  for (const [scn, o] of sorted) {
    if (!o.species) continue;
    const list = (role) => Object.entries(o.species).filter(([, s]) => s.role === role).map(([k, s]) => s.engine ? `${name(k)} ${s.occurrence.k}/${s.occurrence.n}${s.band ? ` ${s.occurrence.verdict}${s.occurrence.noise ? '~' : ''}` : ''}` : `${name(k)} (no engine)`).join(', ') || '—';
    md.push(`| ${scn} | ${list('companion')} | ${list('showpiece')} | ${list('unsupported')} |`);
  }
  const comp = scored.flatMap((o) => Object.values(o.species).filter((s) => s.role === 'companion' && s.engine && s.band));
  const cv = {};
  for (const s of comp) cv[s.occurrence.verdict + (s.occurrence.noise ? ' (noise)' : '')] = (cv[s.occurrence.verdict + (s.occurrence.noise ? ' (noise)' : '')] || 0) + 1;
  md.push('');
  md.push(`Companions with an engine and a band (${comp.length}): ${Object.entries(cv).sort((a, b) => b[1] - a[1]).map(([v, c]) => `${v} ${c}`).join(', ')}. "~" marks noise: 21 runs cannot tell the rate from the band.`);
  sections.cast = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | species | role | record share | literature |');
  md.push('|---|---|---|---:|---|');
  const rows = [];
  for (const [scn, o] of sorted) if (o.species) for (const [k, s] of Object.entries(o.species)) if (!s.engine && s.role !== 'companion') rows.push([scn, k, s, targets.scenarios[scn].species[k]]);
  for (const [scn, k, s, t] of rows.sort((a, b) => (b[3].record_share ?? 0) - (a[3].record_share ?? 0))) {
    md.push(`| ${scn} (${out[scn].locality}) | ${name(k)} | ${s.role} | ${t.record_share == null ? '—' : `${(100 * t.record_share).toFixed(t.record_share < 0.1 ? 1 : 0)} %`} | ${t.literature?.class ?? '—'} |`);
  }
  sections['no-engine'] = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | cavity extents x × y × z mm | longest span mm | equivalent diameter mm | size class | primary protagonist\'s characteristic crystal | pocket |');
  md.push('|---|---|---:|---:|---|---|---|');
  for (const [scn, o] of Object.entries(out).sort((a, b) => a[1].cavity.span_mm - b[1].cavity.span_mm)) {
    const c = o.cavity;
    const t = o.primary ? targets.scenarios[scn].species[o.primary].size : null;
    const char = !t ? '—' : t.basis === 'unknown' ? `${name(o.primary)}: unknown` : `${name(o.primary)}: ${mm(t.median)} mm (${t.basis === 'crystal' ? 'crystal' : 'specimen proxy'}, n ${t.n})`;
    md.push(`| ${scn} | ${c.extents_mm.map(mm).join(' × ')} | ${mm(c.span_mm)} | ${mm(c.eqd_mm)} | ${c.size_class}${c.size_class_basis === 'authored' ? '' : ' (by diameter)'} | ${char} | ${o.pocket ?? '—'} |`);
  }
  md.push('');
  md.push(`Every census seed's cavity was constructed and compared (${Object.values(cav.scenarios).every((v) => v.identical_across_seeds) ? 'all identical' : 'SOME DIFFER'}): the cavity is fixed by the scenario's authored wall, so each scenario's 21 runs share one pocket. The span is the longest chord between two wall vertices: the longest crystal the starting cavity could hold, end to end. Dissolution can widen a cavity during a run; the census does not keep the final wall.`);
  sections.cavities = md.join('\n');
}
{
  // The size evidence behind the targets, recomputed from the committed capture.
  const ev = buildSizeEvidence(ROOT);
  if (ev.capture.sha256 !== targets.inputs.size_capture.sha256) throw new Error('the size capture changed since the targets were written: re-run tools/story-pocket-targets.mjs --write');
  const all = Object.values(ev.localities).flatMap((sp) => Object.values(sp));
  const sum = (f) => all.reduce((s, e) => s + f(e), 0);
  const md = [];
  md.push(`Capture: ${ev.capture.pages} Mineralienatlas pages, ${ev.capture.rows} photographs with a stated length, ${sum((e) => e.photos_with_length)} specimens once ${sum((e) => e.repeat_captions)} repeat captions are merged. Specimens with a length of each kind: crystal ${sum((e) => e.crystal.n)}, aggregate ${sum((e) => e.aggregate.n)}, specimen ${sum((e) => e.specimen.n)}, picture width ${sum((e) => e.fov.n)}; ${sum((e) => e.crystal_statements_of_other_minerals)} crystal lengths named another mineral and were set aside, ${sum((e) => e.unclassed_statements)} lengths stayed unclassed.`);
  const prot = Object.entries(targets.scenarios).flatMap(([scn, s]) => Object.entries(s.species).filter(([, v]) => v.role === 'primary' || v.role === 'alternate').map(([k, v]) => [scn, k, v]));
  const basis = {};
  for (const [, , v] of prot) { const b = v.size.basis === 'crystal' ? `crystal (${v.size.confidence})` : v.size.basis; basis[b] = (basis[b] || 0) + 1; }
  md.push(`Protagonist size targets (${prot.length}): ${Object.entries(basis).sort().map(([b, c]) => `${b} ${c}`).join(', ')}.`);
  md.push('');
  md.push('| scenario | primary protagonist | crystal lengths: n, median (q25–q75) mm | specimen dimensions: n, median (q25–q75) mm | target |');
  md.push('|---|---|---|---|---|');
  const q = (s) => (s?.n ? `${s.n}, ${mm(s.median)} (${mm(s.q25)}–${mm(s.q75)})` : '0');
  for (const [scn, s] of Object.entries(targets.scenarios).sort(([a], [b]) => a.localeCompare(b))) {
    const p = Object.entries(s.species).find(([, v]) => v.role === 'primary');
    if (!p) continue;
    const [k, v] = p;
    md.push(`| ${scn} | ${name(k)}${v.size.piece_material ? ' (pieces)' : ''} | ${q(v.size.crystal)} | ${q(v.size.specimen)} | ${v.size.basis === 'unknown' ? 'unknown' : `${v.size.basis === 'crystal' ? 'crystal' : 'specimen proxy'}, ${v.size.confidence}`} |`);
  }
  md.push('');
  md.push(`Alternates with a crystal target: ${prot.filter(([, , v]) => v.role === 'alternate' && v.size.basis === 'crystal').map(([scn, k, v]) => `${name(k)} at ${scn} (n ${v.size.n}, median ${mm(v.size.median)} mm)`).join('; ') || 'none'}.`);
  sections['size-evidence'] = md.join('\n');
}
{
  const md = [];
  const rules = targets.rules;
  md.push(`Occurrence bands by literature class: ${Object.entries(rules.occurrence_bands).map(([c, b]) => `${c} ${pct(b[0])}–${pct(b[1])} %`).join(', ')}; any other class leaves the band unresolved. Size targets: at least ${rules.size_min_samples} specimens; confidence low below ${rules.size_medium_confidence}, medium below ${rules.size_high_confidence}, high from ${rules.size_high_confidence}; a specimen proxy is always low.`);
  sections.rules = md.join('\n');
}

const md = ['# Story-pocket scoreboard', '', `Targets: \`${path.relative(ROOT, TARGETS).replace(/\\/g, '/')}\` (${targets.rules.status}). Census: ${runs.length} runs. Cavities: ${path.relative(ROOT, CAV).replace(/\\/g, '/')} (${cav.seeds_mode} seeds).`, ''];
for (const [k, v] of Object.entries(sections)) md.push(`## ${k}`, '', v, '');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'showcase.md'), md.join('\n'));
fs.writeFileSync(path.join(OUT, 'showcase.json'), JSON.stringify({ sections: Object.keys(sections), scenarios: out }, null, 1) + '\n');

// ------------------------------------------------------------------ splice into a document
const spliceArg = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; };
const spliceFile = spliceArg('--splice') || spliceArg('--check-splice');
if (spliceFile) {
  const file = path.resolve(spliceFile);
  const text = fs.readFileSync(file, 'utf8');
  const seen = new Set();
  const next = text.replace(/<!-- generated:([a-z-]+) -->\n[\s\S]*?<!-- \/generated:\1 -->/g, (all, key) => {
    if (!sections[key]) throw new Error(`${spliceFile}: no section named ${key}`);
    seen.add(key);
    return `<!-- generated:${key} -->\n${sections[key]}\n<!-- /generated:${key} -->`;
  });
  if (process.argv.includes('--check-splice')) {
    if (next !== text) { console.error(`${spliceFile}: generated blocks differ from this run (${[...seen].join(', ')})`); process.exit(1); }
    console.log(`${spliceFile}: ${seen.size} generated blocks match (${[...seen].join(', ')})`);
  } else {
    fs.writeFileSync(file, next);
    console.log(`${spliceFile}: spliced ${seen.size} blocks (${[...seen].join(', ')})`);
  }
} else {
  console.log(md.join('\n'));
}
