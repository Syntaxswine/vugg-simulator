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
 *   size         conditional on occurrence and on the cavity holding the species' characteristic
 *                (median photographed) crystal: the median largest unflagged crystal against the
 *                record's quartiles, and the share of those runs in the record's display range — against
 *                crystal lengths where the photographs give enough, a labelled specimen proxy where they
 *                give only specimens, unknown otherwise;
 *   pocket       the cavity (tools/story-pocket-cavities.mjs: longest interior span, extents, equivalent
 *                diameter, size class) against the primary protagonist's characteristic crystal: SMALL
 *                pockets may lack a showcase and leave the story count; in UNCLASSED ones a run without a
 *                story stays open;
 *   story        per run, whether an intended protagonist (primary or alternate) is at its record's
 *                display scale (scoreStory, tools/story-pocket-lib.mjs); per scenario, how often, against
 *                its pre-registered story frequency (scenarioVerdict), what leaves it open, and whether
 *                any run could carry it in the scenario's cavity at all;
 *   robustness   each crystal target without its largest series and at the minimum sample; and every
 *                verdict again under other values of the evidence rules (the targets rebuilt in memory
 *                by buildTargets, tools/story-pocket-targets.mjs) and of the story frequency;
 *   variety      the distinct assemblages across the seeds, the species present in every seed, and how
 *                much each protagonist's size varies;
 *   star         the species of each run's largest unflagged crystal, and how often it is a wanted one;
 *   cast         companions (the literature's common species the record does not want) and showpieces
 *                (wanted rarities), each against its own band; visible clutter as before.
 * The verdict ladder: OUT OF SCOPE, NO ENGINE (no protagonist has an engine), SMALL POCKETS ONLY,
 * STORY / STORY (PROXY) (the story frequency is met, on crystal targets / only with proxies), UNRESOLVED
 * (no frequency, or open runs could still carry it), THIN STORY, NO STORY. The previous rule (every
 * top-three species ≥ 5 mm in half the seeds: SHOWCASE / PARTIAL / MISSING) is computed alongside as
 * "before".
 *
 * PASSIVE: reads the targets sidecar, .local-evidence/locality-abundance/compare.json (record and
 * literature, for clutter and the previous rule; its hash must match the one the targets were built
 * from), .local-evidence/locality-abundance/cavities.json, the size capture (via buildSizeEvidence) and
 * the committed census .local-evidence/assemblage-census/runs.jsonl; runs no simulation. Writes
 * .local-evidence/locality-abundance/showcase.{md,json}.
 *
 * Usage: node tools/showcase-scoreboard.mjs [--splice <markdown file>] [--check-splice <markdown file>]
 *   --splice replaces this tool's <!-- generated:NAME --> blocks in the file; --check-splice exits 1 if
 *   any differs. Every section must appear exactly once (tools/splice-generated.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  assessOccurrence, assessSize, scenarioVerdict, scenarioFrequency, scenarioWp1, cannotFailBeyondNoise, wilson, pocketClass, fits, summarize,
  validateSidecar, protagonistsOf, assemblageVariety, everySeedChance, relativeSpread,
} from './story-pocket-lib.mjs';
import { buildSizeEvidence } from './story-pocket-size-evidence.mjs';
import { buildTargets } from './story-pocket-targets.mjs';
import { spliceGenerated } from './splice-generated.mjs';

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

const targets = JSON.parse(fs.readFileSync(TARGETS, 'utf8'));
const bad = validateSidecar(targets);
if (bad.length) throw new Error(`the targets sidecar fails validation:\n  ${bad.join('\n  ')}`);
const VISIBLE = targets.rules.visible_mm;
// The clutter share reads the census's n_1_exp, taken at exactly 1 mm, so the convention cannot move.
if (VISIBLE !== 1) throw new Error(`rules.visible_mm is ${VISIBLE}, but the census counts visible crystals (n_1_exp) at 1 mm`);
// The lib reads the targets' q25 and q90, so the display range cannot move without it.
const DR = targets.rules.display_range;
if (!(Array.isArray(DR) && DR[0] === 0.25 && DR[1] === 0.9)) throw new Error(`rules.display_range is ${JSON.stringify(DR)}, but the lib reads the targets' q25 and q90`);
const CLUTTER_LIMIT = targets.rules.clutter_limit;
const Z = targets.rules.noise_z;
const STAR_SHARE = targets.rules.star_wanted_share;
const cmpRaw = fs.readFileSync(CMP, 'utf8');
if (crypto.createHash('sha256').update(cmpRaw).digest('hex') !== targets.inputs.record_and_literature_classes.sha256) {
  throw new Error('compare.json is not the one the targets were built from: re-run tools/story-pocket-targets.mjs --write and review the diff');
}
const cmp = JSON.parse(cmpRaw);
if (!cmp.__out_of_claim) throw new Error('compare.json predates the set-aside export; re-run tools/locality-abundance-compare.mjs');
const cav = JSON.parse(fs.readFileSync(CAV, 'utf8'));
const runs = fs.readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ok);
const runsBy = {};
for (const r of runs) (runsBy[r.scenario] ||= []).push(r);
const versions = [...new Set(runs.map((r) => r.sim_version))];
if (versions.length !== 1 || versions[0] !== cav.sim_version) throw new Error(`census SIM_VERSION ${versions.join(', ')} ≠ cavities.json ${cav.sim_version}: re-run tools/story-pocket-cavities.mjs`);

const pct = (x) => (x == null ? '—' : `${Math.round(100 * x)}`);
const mm = (x) => (x == null ? '—' : x === 0 ? '0' : x < 0.01 ? '<0.01' : x.toFixed(x < 10 ? 1 : 0));
// Two lengths that differ, printed so that they read as different (more decimals until they do).
const mmPair = (a, b) => {
  if (a === b || mm(a) !== mm(b)) return [mm(a), mm(b)];
  for (let d = 1; d <= 3; d++) if (a.toFixed(d) !== b.toFixed(d)) return [a.toFixed(d), b.toFixed(d)];
  return [mm(a), mm(b)];
};
const name = (k) => k.replace(/^(x:|ma:)/, '').replace(/_/g, ' ');
const med = (a) => summarize(a).median ?? null;
const isProt = (role) => role === 'primary' || role === 'alternate';
const T_role = (scn, k) => targets.scenarios[scn].species[k]?.role ?? '—';

// ------------------------------------------------------------------ the previous rule ("before")
function legacy(scn, j, rs) {
  const n = rs.length;
  if (j.verdict === 'OUT OF SCOPE') return { status: 'OUT OF SCOPE', facts: [], star: null };
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
  return { status, facts, star: starSig / n };
}

// ------------------------------------------------------------------ the target-driven assessment
const out = {};
const runsInBy = {};
const everySeedSlots = [];
const occurrencePattern = { every: 0, never: 0, between: 0 };
let expectedEvery = 0;
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
  const o = { locality: T.locality, before: before.status, before_facts: before.facts, before_star: before.star, runs: n,
    cavity: { span_mm: C.span_mm, eqd_mm: C.eqd_mm, extents_mm: C.extents_mm, size_class: C.size_class, size_class_basis: C.size_class_basis, all_census_seeds_checked: seedsChecked } };
  if (T.out_of_scope) { out[scn] = { ...o, verdict: 'OUT OF SCOPE', why: T.out_of_scope, flags: [] }; continue; }
  const span = C.span_mm;
  if (T.cavity_span_mm !== span) throw new Error(`${scn}: the targets were built for a ${T.cavity_span_mm} mm span, cavities.json has ${span}: re-run tools/story-pocket-targets.mjs --write`);
  const sp = (r, k) => {
    const v = r.species[k];
    return { occurs: (v?.n_surv ?? 0) > 0, size: v?.max_exp_mm ?? 0, all: v?.max_mm ?? 0 };
  };
  const entries = Object.entries(T.species);
  const primary = entries.find(([, v]) => v.role === 'primary')[0];
  const primaryT = T.species[primary].size;
  o.primary = primary;
  o.pocket = pocketClass(span, primaryT);
  // Per species: occurrence against its band, size conditional on occurrence and on a cavity that holds it.
  o.species = {};
  for (const [k, v] of entries) {
    const per = rs.map((r) => ({ ...sp(r, k), span }));
    const occ = per.filter((x) => x.occurs);
    const when = summarize(occ.map((x) => x.size));
    const t = v.size;
    // A spread needs a size to spread around: not for a species whose typical (median) crystal is dust.
    const visible = occ.length > 0 && when.median >= VISIBLE;
    o.species[k] = {
      role: v.role, engine: v.engine, band: v.occurrence_band,
      occurrence: assessOccurrence(occ.length, n, v.occurrence_band, Z),
      target: t.basis === 'unknown' ? { basis: 'unknown', crystal_n: t.crystal_n, specimen_n: t.specimen_n, crystal: t.crystal }
        : { basis: t.basis, n: t.n, confidence: t.confidence, q25: t.q25, median: t.median, q75: t.q75, q90: t.q90, fits: fits(span, t), crystal: t.crystal },
      when_occurring: when,
      // How much the largest crystal varies across the seeds (not for dust, whose median is a speck).
      spread: { sim: visible ? relativeSpread(when) : null, record: t.basis === 'unknown' ? null : relativeSpread(t) },
      // Dust: no crystal reaches the review's visible size; hidden: some does, but only ones flagged as enclosed.
      dust: occ.length > 0 && Math.max(...occ.map((x) => x.all)) < VISIBLE,
      hidden: occ.length > 0 && Math.max(...occ.map((x) => x.all)) >= VISIBLE && Math.max(...occ.map((x) => x.size)) < VISIBLE,
      size: assessSize(per, t, Z),
    };
    if (v.engine && v.occurrence_band) {
      expectedEvery += v.occurrence_band[1] ** n;
      if (occ.length === n) { occurrencePattern.every++; everySeedSlots.push({ scenario: scn, ceiling: v.occurrence_band[1], n }); }
      else if (occ.length === 0) occurrencePattern.never++;
      else occurrencePattern.between++;
    }
  }
  // The story, run by run, and the verdict (scenarioVerdict): what leaves it open, and whether any run
  // could carry it in this cavity.
  const runsIn = rs.map((r) => ({ span, species: Object.fromEntries(entries.map(([k]) => [k, sp(r, k)])) }));
  runsInBy[scn] = runsIn;
  const V = scenarioVerdict(runsIn, T.species, T.story_frequency, { z: Z });
  const withEngine = protagonistsOf(T.species).filter((p) => p.engine);
  o.story = { ...V.counts, frequency: T.story_frequency, frequency_basis: T.story_frequency_basis, verdict: V.verdict, why: V.why, noise: V.noise, rate: V.rate, ci: V.ci };
  o.open = V.open;
  o.cannot = V.cannot;
  // What the cavity and crystal-first do to the frequency: the setter, and the frequency without the
  // cavity test and with proxies competing.
  const sf = scenarioFrequency(T.species, DR, span);
  o.dropped_setters = sf?.dropped ?? [];
  o.setter = sf?.k ?? null;
  o.frequency_without_cavity = scenarioFrequency(T.species, DR, Infinity)?.frequency ?? null;
  o.frequency_proxies_too = scenarioFrequency(T.species, DR, span, { crystalFirst: false })?.frequency ?? null;
  o.passed_over = sf?.passedOver ?? [];
  o.verdict_proxies_too = scenarioVerdict(runsIn, T.species, o.frequency_proxies_too, { z: Z }).verdict;
  // Robustness: would the verdict hold without a crystal target's largest series (one contributor's
  // photographs), or, where the target has exactly the minimum sample, with its proxy instead?
  const minN = targets.rules.size_min_samples;
  const asTarget = (s, basis) => (s && s.n >= minN ? { basis, n: s.n, q10: s.q10, q25: s.q25, median: s.median, q75: s.q75, q90: s.q90 } : null);
  // The verdict with one protagonist's target changed, its frequency rebuilt by the same rule.
  const verdictWith = (k, target) => {
    const changed = { ...T.species, [k]: { ...T.species[k], size: target ?? { basis: 'unknown' } } };
    return scenarioVerdict(runsIn, changed, scenarioFrequency(changed, DR, span)?.frequency ?? null, { z: Z }).verdict;
  };
  o.robust = [];
  for (const p of withEngine.filter((x) => x.target?.basis === 'crystal' || x.target?.basis === 'specimen-proxy')) {
    const t = p.target;
    const crystal = t.basis === 'crystal';
    if (!crystal && !(t.series?.largest > 1) && t.n !== minN) continue;
    const fallback = crystal ? asTarget(t.specimen, 'specimen-proxy') : null;
    const row = { k: p.k, basis: t.basis, n: t.n, confidence: t.confidence, series: t.series ?? null };
    if (t.series?.largest > 1) row.without_series = { n: t.without_largest_series.n, q25: t.without_largest_series.q25, verdict: verdictWith(p.k, asTarget(t.without_largest_series, t.basis) ?? fallback) };
    if (t.n === minN) row.at_minimum = verdictWith(p.k, fallback);
    o.robust.push(row);
  }
  // Where the captions give a few crystal lengths but no target: how they compare with the simulation,
  // enclosed crystals included (the stricter comparison).
  o.partial = [];
  for (const p of withEngine.filter((x) => x.target?.basis !== 'crystal' && x.target?.crystal?.n)) {
    const sizes = rs.map((r) => sp(r, p.k)).filter((x) => x.occurs).map((x) => x.all);
    if (!sizes.length) continue;
    o.partial.push({ k: p.k, crystal: p.target.crystal, simMax: Math.max(...sizes) });
  }
  // Variety: the assemblages across the seeds.
  o.variety = assemblageVariety(rs.map((r) => Object.entries(r.species).filter(([, v]) => (v.n_surv ?? 0) > 0).map(([m]) => m)));
  o.every_seed = entries.filter(([k, v]) => v.engine && isProt(v.role) && o.species[k].occurrence.k === n).map(([k]) => k);
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
    if (isProt(T.species[star]?.role)) starProt++;
    if (T.species[star]?.role === 'companion') starComp++;
  }
  o.stars = Object.fromEntries(Object.entries(stars).sort((a, b) => b[1] - a[1]).map(([m, cnt]) => [m, cnt / n]));
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
  // The verdict, and WP1's whole target.
  o.verdict = V.verdict;
  o.wp1 = scenarioWp1(runsIn, T.species, V.verdict, { z: Z });
  if (V.verdict === 'NO ENGINE') o.why = `no protagonist has an engine (${protagonistsOf(T.species).map(({ k }) => name(k)).join(', ')})`;
  else if (V.verdict === 'SMALL POCKETS ONLY') o.why = `the cavity's longest span, ${mm(span)} mm, is shorter than ${name(primary)}'s characteristic crystal, ${mm(primaryT.median)} mm (${primaryT.basis}, n ${primaryT.n})`;
  else o.why = V.why;
  // Flags.
  o.flags = [];
  for (const [k, s] of Object.entries(o.species)) {
    if (!s.engine) continue;
    if ((s.occurrence.verdict === 'LOW' || s.occurrence.verdict === 'HIGH') && !s.occurrence.noise) o.flags.push(`${name(k)} (${s.role}) ${s.occurrence.k}/${n} ${s.occurrence.verdict === 'LOW' ? 'below' : 'above'} band`);
    if ((s.size.verdict === 'OVERSIZE' || s.size.verdict === 'LARGE') && !s.size.noise) o.flags.push(`${name(k)} ${s.size.verdict.toLowerCase()} (median ${mm(s.size.sizes.median)} mm; record q75 ${mm(s.target.q75)}, q90 ${mm(s.target.q90)})`);
    const cs = s.target.crystal;
    if (s.target.basis === 'specimen-proxy' && cs?.n && s.when_occurring.n && s.when_occurring.median > cs.max) o.flags.push(`${name(k)} larger than every photographed crystal (median ${mm(s.when_occurring.median)} mm; ${cs.n} crystal length${cs.n > 1 ? 's' : ''}, largest ${mm(cs.max)})`);
    if (isProt(s.role) && s.dust) o.flags.push(`${name(k)} dust (< ${VISIBLE} mm)`);
    if (isProt(s.role) && s.hidden) o.flags.push(`${name(k)} hidden (its crystals of ${VISIBLE} mm or more are all flagged as enclosed)`);
  }
  if (o.every_seed.length) o.flags.push(`in every seed: ${o.every_seed.map(name).join(', ')}`);
  if (o.variety.distinct === 1) o.flags.push('one assemblage in every seed');
  if (o.star_is_wanted < STAR_SHARE) o.flags.push(`star wanted ${Math.round(o.star_is_wanted * n)}/${n}`);
  if (o.cannot) {
    const parts = [];
    if (o.cannot.cavity.length) parts.push(`${o.cannot.cavity.map((k) => `${name(k)} (${T.species[k].size.basis === 'crystal' ? 'crystal' : 'proxy'} display range from ${mm(T.species[k].size.q25)} mm)`).join(', ')} need${o.cannot.cavity.length === 1 ? 's' : ''} more room than the cavity's ${mm(span)} mm span`);
    if (o.cannot.evidence.length) parts.push(`${o.cannot.evidence.map(name).join(', ')} ${o.cannot.evidence.length === 1 ? 'has' : 'have'} no size target`);
    o.flags.push(o.cannot.cavity.length ? `no run can carry the story in this cavity: ${parts.join('; ')}` : `no run can carry the story until a protagonist has a size target (${o.cannot.evidence.map(name).join(', ')})`);
  }
  if (o.clutter_visible_share >= CLUTTER_LIMIT) o.flags.push(`clutter ${pct(o.clutter_visible_share)} %`);
  for (const [m, cnt] of Object.entries(o.longer_than_cavity)) o.flags.push(`${name(m)} longer than the cavity ${cnt}/${n}`);
  out[scn] = o;
}

// ------------------------------------------------------------------ the reasons, generated
// A size verdict as the tables print it, with its noise or too-few-runs mark.
const sizeText = (s) => `${s.verdict}${s.few ? ' (too few runs)' : s.noise ? ' (noise)' : ''}`;
function targetText(t) {
  if (!t || t.basis === 'unknown') return `size unknown (crystal n ${t?.crystal_n ?? 0}, specimen n ${t?.specimen_n ?? 0})`;
  const cs = t.basis !== 'crystal' && t.crystal?.n ? `; ${t.crystal.n === 1 ? `1 crystal length, ${mm(t.crystal.max)} mm` : `${t.crystal.n} crystal lengths ${mm(t.crystal.min)}–${mm(t.crystal.max)}`}` : '';
  return `${t.basis === 'crystal' ? 'crystal' : 'specimen proxy'} q25 ${mm(t.q25)} / median ${mm(t.median)} mm (n ${t.n}, ${t.confidence}${cs})`;
}
function reason(scn, o) {
  if (o.verdict === 'OUT OF SCOPE' || o.verdict === 'NO ENGINE' || o.verdict === 'SMALL POCKETS ONLY') return o.why;
  const s = o.story;
  const carriers = Object.entries(s.by).sort((a, b) => b[1] - a[1]).map(([k, cnt]) => `${name(k)} ${cnt}`).join(', ');
  const f = s.frequency == null ? 'no story frequency' : `target ${pct(s.frequency)} %`;
  const yes = s.yes_crystal + s.yes_proxy;
  const how = yes ? ` (${s.yes_proxy ? `${s.yes_crystal} on crystal targets, ${s.yes_proxy} on specimen proxies` : 'on crystal targets'})` : '';
  const open = s.possible + s.unclassified;
  const head = `story in ${yes}/${s.scored} runs${how}${open ? `, open in ${open} more` : ''}, ${f}`;
  const each = Object.entries(o.species).filter(([, v]) => isProt(v.role) && v.engine).map(([k, v]) => {
    const w = v.when_occurring;
    const grown = w.n ? `median ${mm(w.median)} mm${v.dust ? ' (dust)' : v.hidden ? ' (hidden: flagged as enclosed)' : ''} (${v.occurrence.k}/${o.runs})` : 'never occurs';
    return `${name(k)} ${grown} vs ${targetText(v.target)}`;
  });
  if (o.verdict === 'STORY' || o.verdict === 'STORY (PROXY)') return `${head}; carried by ${carriers}`;
  if (o.verdict === 'UNRESOLVED') return `${head}; open: ${o.open.join(', ')} — ${each.join('; ')}`;
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
  md.push('| scenario (locality) | verdict | before | cavity span mm | pocket vs the primary | runs carrying the story: crystal + proxy (+ open) / runs scored, target | star (share of runs) | star is wanted | clutter | flags |');
  md.push('|---|---|---|---:|---|---|---|---:|---:|---|');
  for (const [scn, o] of sorted) {
    if (o.verdict === 'OUT OF SCOPE') { md.push(`| ${scn} (${o.locality}) | OUT OF SCOPE | ${o.before} | ${mm(o.cavity.span_mm)} | — | — | — | — | — | — |`); continue; }
    const s = o.story;
    const open = s.possible + s.unclassified;
    const storyText = s.scored ? `${s.yes_crystal} + ${s.yes_proxy}${open ? ` (+${open})` : ''} / ${s.scored}, ${s.frequency == null ? 'none' : `${pct(s.frequency)} %`}` : `— (${s.small} small)`;
    const [star] = Object.entries(o.stars);
    md.push(`| ${scn} (${o.locality}) | ${o.verdict}${o.story?.noise ? ' (noise)' : ''} | ${o.before} | ${mm(o.cavity.span_mm)} | ${o.pocket} (${name(o.primary)}) | ${storyText} | ${star ? `${name(star[0])} ${pct(star[1])} %` : '—'} | ${pct(o.star_is_wanted)} % | ${pct(o.clutter_visible_share)} % | ${o.flags.join('; ') || '—'} |`);
  }
  md.push('');
  const unres = Object.entries(out).filter(([, o]) => o.verdict === 'UNRESOLVED');
  const groups = {};
  for (const [scn, o] of unres) (groups[o.open.join(' + ') || 'other'] ||= []).push(scn);
  md.push(`UNRESOLVED (${unres.length}), by what leaves it open: ${Object.entries(groups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([g, l]) => `${g} — ${l.join(', ')}`).join('; ')}. A specimen proxy overstates the crystal, so a crystal short of it is not a verdict; a protagonist with no size target has none to miss; in an unclassed pocket a run without a story may be a small pocket.`);
  const cannot = Object.entries(out).filter(([, o]) => o.cannot);
  const cause = { crystal: [], proxy: [], both: [], evidence: [] };
  for (const [scn, o] of cannot) {
    const { cavity, evidence } = o.cannot;
    cause[!cavity.length ? 'evidence' : evidence.length ? 'both' : cavity.every((k) => targets.scenarios[scn].species[k].size.basis === 'crystal') ? 'crystal' : 'proxy'].push(scn);
  }
  // What dropping them does: no frequency left, none changed (they would not have set it), or a move.
  const effect = (o) => (o.story.frequency == null ? 'no frequency is left'
    : o.frequency_without_cavity === o.story.frequency ? `the frequency is ${o.story.frequency} either way`
    : `the frequency is ${o.story.frequency}, against ${o.frequency_without_cavity} with no cavity test`);
  const droppedAll = Object.entries(out).filter(([, o]) => o.dropped_setters?.length).map(([scn, o]) => `at ${scn}, ${o.dropped_setters.map((d) => `${name(d.k)} (${T_role(scn, d.k)}, display range from ${mmPair(d.from, o.cavity.span_mm)[0]} mm, span ${mmPair(d.from, o.cavity.span_mm)[1]})`).join(' and ')} — ${effect(o)}`);
  md.push(`The cavity decides who can set the story frequency. These protagonists have an engine, a band and a size target, but their display range starts beyond the cavity's span, so they cannot carry a story run there and do not set it: ${droppedAll.join('; ') || 'none'}. The coverage itself is never cut to fit the cavity.`);
  md.push(`No run can carry the story in its scenario's current cavity, whatever grows, in ${cannot.length} of ${scored.length} scored scenarios. The display range of every protagonist with a size target starts beyond the cavity's span — on crystal targets: ${cause.crystal.join(', ') || 'none'}; on specimen proxies, which overstate the crystal: ${cause.proxy.join(', ') || 'none'}; and the other protagonists have no size target: ${cause.both.join(', ') || 'none'}. No protagonist with an engine has a size target: ${cause.evidence.join(', ') || 'none'}. A crystal target beyond the span waits on bigger pockets (WP9); a proxy on bigger pockets or on crystal lengths that bring it within (WP0); a missing target on crystal lengths.`);
  const partial = Object.entries(out).flatMap(([scn, o]) => (o.partial || []).map((p) => [scn, p]));
  const longer = partial.filter(([, p]) => p.crystal.min > p.simMax);
  const lengths = (p) => { const [lo, sim] = mmPair(p.crystal.min, p.simMax); return `${p.crystal.n} length${p.crystal.n > 1 ? 's' : ''} ${lo}${p.crystal.n > 1 ? `–${mm(p.crystal.max)}` : ''} mm; simulated at most ${sim}`; };
  md.push(`Where the captions give a few crystal lengths but too few for a target (${partial.length} protagonists), every photographed crystal is longer than every simulated one, enclosed crystals included, in ${longer.length}: ${longer.map(([scn, p]) => `${name(p.k)} at ${scn} (${lengths(p)})`).join('; ') || 'none'}${partial.length > longer.length ? `; not so for ${partial.filter(([, p]) => p.crystal.min <= p.simMax).map(([scn, p]) => `${name(p.k)} at ${scn}`).join(', ')}` : ''}. Too few to set a target, they lean against the simulator; they do not clear it.`);
  const pockets = {};
  for (const o of scored) pockets[o.pocket] = (pockets[o.pocket] || 0) + 1;
  const smallRuns = scored.reduce((s, o) => s + (o.story?.small ?? 0), 0);
  const seeds = runs.length / Object.keys(runsBy).length;
  const zeroTop = wilson(0, seeds, Z)[1];
  const powerless = scored.filter((o) => cannotFailBeyondNoise(o.story?.frequency, seeds, Z));
  md.push(`Story checks that ${Math.round(seeds)} seeds cannot fail beyond noise — a frequency at or below ${zeroTop.toFixed(3)}, the top of the interval for 0 of them, where even a fleet that never tells the story is within noise: ${Object.entries(out).filter(([, o]) => powerless.includes(o)).map(([scn, o]) => `${scn} (${o.story.frequency})`).join(', ') || 'none'}. Where no protagonist with an engine forms in any seed, the verdict carries no noise mark: the mark says chance in which runs carry the story could explain the shortfall, and no run grew a protagonist to carry it.`);
  const larger = Object.entries(out).flatMap(([scn, o]) => (o.flags || []).filter((x) => x.includes('larger than every photographed crystal')).map((x) => `${x.replace(/ larger than every photographed crystal.*$/, '')} at ${scn}`));
  const longerThan = Object.entries(out).flatMap(([scn, o]) => Object.entries(o.longer_than_cavity || {}).map(([m, cnt]) => `${name(m)} at ${scn} (${cnt}/${o.runs})`));
  md.push(`Simulated crystals larger than every photographed crystal of their species, where the record gives a few lengths beside a proxy: ${larger.join(', ') || 'none'}. Crystals longer than the starting cavity's span: ${longerThan.join(', ') || 'none'}.`);
  // Crystal targets first: where it moves the frequency, and whether any verdict moves with it.
  const firsts = Object.entries(out).filter(([, o]) => o.story && o.story.frequency != null && o.frequency_proxies_too != null && o.frequency_proxies_too !== o.story.frequency);
  const firstMoves = firsts.filter(([, o]) => o.verdict_proxies_too !== o.verdict);
  md.push(`Crystal targets first moves the story frequency where a crystal target sets it over a proxy that would set a higher one — the primary's too (with proxies competing → as registered): ${firsts.map(([scn, o]) => `${scn} (${o.frequency_proxies_too} → ${o.story.frequency}: ${name(o.setter)}, ${T_role(scn, o.setter)}, over the proxies of ${o.passed_over.map((k) => `${name(k)} (${T_role(scn, k)})`).join(', ')})`).join('; ') || 'none'}. There a STORY (PROXY) is judged against the crystal target's expected rate, not a proxy's bar. Verdicts that move with it: ${firstMoves.map(([scn, o]) => `${scn} (${o.verdict_proxies_too} → ${o.verdict})`).join(', ') || 'none'}.`);
  // Protagonists that occur but whose size this cavity cannot judge: each holds WP1's whole target open.
  const UNJUDGED = ['ELIGIBILITY UNKNOWN', 'NO ELIGIBLE POCKET', 'LONGER THAN THE CAVITY'];
  const unheld = Object.entries(out).map(([scn, o]) => [scn, o, Object.entries(o.species || {}).filter(([, s]) => isProt(s.role) && s.engine && UNJUDGED.includes(s.size.verdict))]).filter(([, , l]) => l.length);
  const unheldText = unheld.map(([scn, o, l]) => `${scn} (span ${o.cavity.span_mm.toFixed(1)} mm): ${l.map(([k, s]) => `${name(k)} (${s.size.verdict === 'LONGER THAN THE CAVITY' ? 'every eligible crystal longer than the cavity' : `${s.target.basis === 'crystal' ? 'crystal' : 'proxy'} median ${mm(s.target.median)} mm`})`).join(', ')}`);
  md.push(`Protagonists that occur but whose size this cavity cannot judge — its span is under the target's median (ELIGIBILITY UNKNOWN against a proxy, NO ELIGIBLE POCKET against a crystal target), or every eligible crystal is longer than the cavity — ${unheld.reduce((s, [, , l]) => s + l.length, 0)} at ${unheld.length} scenarios: ${unheldText.join('; ') || 'none'}. Each holds WP1's whole target open there until the pocket grows (WP9) or the evidence brings the target within the span (WP0).`);
  md.push(`Pocket classes against the primary protagonist's characteristic crystal: ${['STORY-SCALE', 'SMALL', 'UNCLASSED'].map((p) => `${p} ${pockets[p] || 0}`).join(', ')} of ${scored.length} scored scenarios; runs in small pockets ${smallRuns} (${scored.reduce((s, o) => s + (o.story?.small_yes ?? 0), 0)} of them with a story, reported apart). Every scenario grows in one cavity in all its seeds (${Object.values(cav.scenarios).reduce((s, v) => s + v.seeds_checked.length, 0)} constructions checked, ${Object.values(cav.scenarios).every((v) => v.identical_across_seeds) ? 'none differ' : 'SOME DIFFER'}), so a scenario's fleet holds a single pocket class: no scenario yet has both small pockets and story-scale ones.`);
  sections.verdicts = md.join('\n');
}
{
  const md = [];
  md.push(`For every protagonist with a crystal target, and every specimen proxy with a series or at the minimum sample: the share of its lengths in its largest series (one wording, each upload less than ${Math.round(targets.rules.series_gap_s / 86400)} days after the one before — a standard caption field or a bare length only among photographs uploaded together: likely one contributor's lot or find), the verdict with that series left out, and — where the target has exactly the minimum of ${targets.rules.size_min_samples} lengths — the verdict with one length fewer (a crystal target falls back to its proxy, a proxy to unknown). Each verdict is scored against the story frequency rebuilt by the same rule.`);
  md.push('');
  md.push('| scenario | verdict | protagonist: target (basis, n, confidence) | largest series | without it: n, q25 → verdict | at the minimum, one length fewer → verdict |');
  md.push('|---|---|---|---|---|---|');
  for (const [scn, o] of sorted) {
    for (const r of o.robust || []) {
      const ws = r.without_series ? `${r.without_series.n}, ${mm(r.without_series.q25)} mm → ${r.without_series.verdict}` : '—';
      md.push(`| ${scn} | ${o.verdict} | ${name(r.k)} (${r.basis === 'crystal' ? 'crystal' : 'proxy'}, n ${r.n}, ${r.confidence}) | ${r.series && r.series.largest > 1 ? `${r.series.largest} of ${r.series.of}` : '—'} | ${ws} | ${r.at_minimum ?? '—'} |`);
    }
  }
  const flips = Object.entries(out).flatMap(([scn, o]) => (o.robust || []).filter((r) => (r.without_series && r.without_series.verdict !== o.verdict) || (r.at_minimum && r.at_minimum !== o.verdict)).map((r) => `${scn} (${name(r.k)})`));
  md.push('');
  md.push(`Verdicts that change under one of these: ${flips.join(', ') || 'none'}.`);
  // The evidence rules and the story frequency, other values: the targets rebuilt from the same capture
  // with one rule changed, and every scenario re-scored against the same runs.
  const R = targets.rules;
  const secs = (x) => (x === Infinity ? 'no limit' : `${x.toLocaleString('en-US')} s (${(x / 86400).toFixed(1)} days)`);
  const variants = [
    ...[0, 5, 20].map((x) => ({ rule: 'specimen floor', label: `${x} mm`, opts: { specimenMinMm: x } })),
    ...[1e5, 1e7, Infinity].map((x) => ({ rule: 'upload window', label: secs(x), opts: { uploadedTogether: x } })),
    ...[4, 6, 8, 10].map((x) => ({ rule: 'minimum sample', label: `${x} specimens`, opts: { sizeMinSamples: x } })),
  ];
  const changed = (verdictOf) => Object.entries(out).filter(([, o]) => o.verdict !== 'OUT OF SCOPE').map(([scn, o]) => [scn, o.verdict, verdictOf(scn)]).filter(([, a, b]) => a !== b);
  for (const v of variants) {
    const VT = buildTargets(ROOT, v.opts);
    v.changes = changed((scn) => scenarioVerdict(runsInBy[scn], VT.scenarios[scn].species, VT.scenarios[scn].story_frequency, { z: Z }).verdict);
  }
  // The earlier story-frequency rules: the largest band floor among the protagonists with an engine
  // (round 2), and that floor × 0.65 whatever the sample (round 3).
  const floorOf = (scn) => {
    const fl = protagonistsOf(targets.scenarios[scn].species).filter((p) => p.engine && targets.scenarios[scn].species[p.k].occurrence_band).map((p) => targets.scenarios[scn].species[p.k].occurrence_band[0]);
    return fl.length ? Math.max(...fl) : null;
  };
  for (const [label, scale] of [['the band floor alone (round 2)', 1], ['the band floor × 0.65, whatever the sample (round 3)', 0.65]]) {
    variants.push({ rule: 'story frequency', label, changes: changed((scn) => scenarioVerdict(runsInBy[scn], targets.scenarios[scn].species, floorOf(scn) == null ? null : floorOf(scn) * scale, { z: Z }).verdict) });
  }
  // The registered rule's own choices: the cavity test for setters (q25, or the median as eligibility
  // uses, or none) and crystal targets first (or proxies too).
  const spanOf = (scn) => cav.scenarios[scn].span_mm;
  for (const [label, room, options] of [
    ['setters must hold their median in the cavity (the eligibility test), not just their range\'s start', (scn) => spanOf(scn), { by: 'median' }],
    ['no cavity test for setters', () => Infinity, {}],
    ['proxies set it too: the largest product over every setter (round 5)', (scn) => spanOf(scn), { crystalFirst: false }],
  ]) {
    variants.push({ rule: 'story frequency', label, changes: changed((scn) => scenarioVerdict(runsInBy[scn], targets.scenarios[scn].species, scenarioFrequency(targets.scenarios[scn].species, DR, room(scn), options)?.frequency ?? null, { z: Z }).verdict) });
  }
  md.push('');
  md.push(`Other values of the evidence rules (registered: specimen floor ${R.specimen_min_mm} mm, upload window ${secs(R.uploaded_together_s)}, minimum sample ${R.size_min_samples} specimens) and of the story frequency (registered: the band floor × the display range's coverage of a record of the target's size): the targets rebuilt from the same capture with one rule changed, every scenario re-scored against the same runs.`);
  md.push('');
  md.push('| rule | value | verdicts that change |');
  md.push('|---|---|---|');
  for (const v of variants) md.push(`| ${v.rule} | ${v.label} | ${v.changes.map(([scn, a, b]) => `${scn}: ${a} → ${b}`).join('; ') || 'none'} |`);
  sections.robustness = md.join('\n');
}
{
  const md = [];
  const moves = {};
  for (const o of Object.values(out)) moves[`${o.before} → ${o.verdict}`] = (moves[`${o.before} → ${o.verdict}`] || 0) + 1;
  md.push(`Before (the previous rule: ${tally('before', BEFORE)}) → after: ${Object.entries(moves).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([m, cnt]) => `${m} ${cnt}`).join('; ')}.`);
  md.push('');
  md.push('| scenario | before | after | why (generated from the targets and the census) |');
  md.push('|---|---|---|---|');
  for (const [scn, o] of Object.entries(out).sort((a, b) => BEFORE.indexOf(a[1].before) - BEFORE.indexOf(b[1].before) || order(a[1]) - order(b[1]) || a[0].localeCompare(b[0]))) {
    const was = o.before_facts.length ? ` — before: ${o.before_facts.map((f) => `${name(f.k)} ${f.status}`).join(', ')}; the star a signature species in ${Math.round(o.before_star * o.runs)}/${o.runs}` : '';
    md.push(`| ${scn} | ${o.before} | ${o.verdict} | ${o.reason}${was} |`);
  }
  sections['before-after'] = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | species | role | occurs (band) | size target | largest unflagged when it occurs: median (q25–q75) | spread: sim / record | holds it | eligible runs in q25–q90 | size verdict |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  const rows = [];
  for (const [scn, o] of sorted) if (o.species) for (const [k, s] of Object.entries(o.species)) if (s.role !== 'companion') rows.push([scn, k, s]);
  const roleOrder = ['primary', 'alternate', 'showpiece', 'unsupported'];
  for (const [scn, k, s] of rows.sort((a, b) => a[0].localeCompare(b[0]) || roleOrder.indexOf(a[2].role) - roleOrder.indexOf(b[2].role) || a[1].localeCompare(b[1]))) {
    const occ = s.engine ? `${s.occurrence.k}/${s.occurrence.n} (${s.band ? `${pct(s.band[0])}–${pct(s.band[1])} %` : 'no band'}) ${s.occurrence.verdict}${s.occurrence.noise ? ' (noise)' : ''}` : 'no engine';
    const w = s.when_occurring;
    const cond = s.engine && w.n ? `${mm(w.median)} (${mm(w.q25)}–${mm(w.q75)})${s.dust ? ' dust' : s.hidden ? ' hidden' : ''}` : '—';
    const spread = s.engine && w.n ? `${s.spread.sim == null ? 'not visible' : `${pct(s.spread.sim)} %`} / ${s.spread.record == null ? '—' : `${pct(s.spread.record)} %`}` : '—';
    const fit = s.target.basis === 'unknown' ? '—' : s.target.fits === true ? 'yes' : s.target.fits === false ? 'no' : 'unknown';
    const elig = s.size.eligible ? `${s.size.inRange}/${s.size.eligible} (${pct(s.size.share)} %)` : '—';
    md.push(`| ${scn} | ${name(k)} | ${s.role} | ${occ} | ${targetText(s.target)} | ${cond} | ${spread} | ${fit} | ${elig} | ${s.engine ? sizeText(s.size) : '—'} |`);
  }
  const prot = rows.filter(([, , s]) => isProt(s.role));
  const basis = {};
  for (const [, , s] of prot) { const b = s.target.basis === 'crystal' ? `crystal (${s.target.confidence})` : s.target.basis; basis[b] = (basis[b] || 0) + 1; }
  const verdicts = {};
  for (const [, , s] of prot) if (s.engine) { const v = sizeText(s.size); verdicts[v] = (verdicts[v] || 0) + 1; }
  md.push('');
  const scoredWp1 = sorted.filter(([, o]) => o.wp1);
  const metWp1 = scoredWp1.filter(([, o]) => o.wp1.met).map(([scn]) => scn);
  const clean = (x) => x.replace(/^(x:|ma:)/, '').replace(/_/g, ' ');
  const storyNotWp1 = scoredWp1.filter(([, o]) => !o.wp1.met && (o.verdict === 'STORY' || o.verdict === 'STORY (PROXY)')).map(([scn, o]) => `${scn} (${[...o.wp1.fails.map(clean), ...o.wp1.open.map((x) => `open: ${clean(x)}`)].join('; ')})`);
  // What holds WP1 open, by cause, across every scored scenario (wp1Target's own wording).
  const CAUSES = [
    ['short of its proxy', /short of its proxy$/], ['a size this cavity cannot judge (the eighth line under §2\'s table)', /(eligibility unknown|no eligible pocket|longer than the cavity)$/],
    ['never occurring where its band cannot fail that', /never occurs, and /], ['neither a band nor a size target', /neither a band nor a size target/],
    ['too few eligible runs to judge its size', /too few eligible runs/], ['a size miss the runs cannot tell from the window', /, within noise$/],
  ];
  const opens = scoredWp1.flatMap(([scn, o]) => o.wp1.open.map((x) => [scn, x]));
  const listed = new Set([2, 3]);
  const causeText = CAUSES.map(([label, re], i) => { const hit = opens.filter(([, x]) => re.test(x)); return `${label} ${hit.length}${listed.has(i) && hit.length ? ` (${hit.map(([scn, x]) => `${clean(x.split(' ')[0])} at ${scn}`).join(', ')})` : ''}`; });
  const other = opens.filter(([, x]) => !CAUSES.some(([, re]) => re.test(x)));
  md.push(`WP1's whole target — the story frequency met; every protagonist with an engine within its band (a miss within noise counts as within); and every protagonist with an engine at the record's size wherever it occurs in a pocket that can hold it (its typical crystal within the record's middle half, or reaching its proxy), whether or not it carries story runs — is met by ${metWp1.length} of ${scoredWp1.length} scored scenarios${metWp1.length ? `: ${metWp1.join(', ')}` : ''}. It is met only on what it could judge, so these leave it open rather than failing it; across the scored scenarios: ${causeText.join('; ')}${other.length ? `; other ${other.length}` : ''}. Where the story verdict passes but the whole target does not: ${storyNotWp1.join('; ') || 'none'}. After a size verdict, "(noise)": the runs cannot tell their median from the target's window; "(too few runs)": so few eligible runs that no miss could be told from it.`);
  md.push('');
  md.push(`Protagonist size targets (${prot.length} primary and alternate slots): ${Object.entries(basis).sort().map(([b, cnt]) => `${b} ${cnt}`).join(', ')}. Size verdicts of protagonists with an engine: ${Object.entries(verdicts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([x, cnt]) => `${x} ${cnt}`).join(', ')}. "spread" = the interquartile range over the median, of the simulated largest crystal across the seeds and of the record's.`);
  sections.protagonists = md.join('\n');
}
{
  const md = [];
  const rows = [];
  for (const [scn, o] of sorted) if (o.species) for (const [k, s] of Object.entries(o.species)) if (isProt(s.role) && s.engine && s.occurrence.k === 0) rows.push(`${name(k)} at ${scn} (${s.role}${s.band ? `, band ${pct(s.band[0])}–${pct(s.band[1])} %` : ''})`);
  md.push(`Protagonists with an engine that never form in any seed (${rows.length}): ${rows.join('; ') || 'none'}.`);
  sections['never-form'] = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | distinct assemblages in the seeds | the commonest one\'s share | protagonists in every seed | protagonists\' size spread, sim / record |');
  md.push('|---|---:|---:|---|---|');
  for (const [scn, o] of sorted) {
    if (!o.species) continue;
    const spreads = Object.entries(o.species).filter(([, s]) => isProt(s.role) && s.engine && s.when_occurring.n).map(([k, s]) => `${name(k)} ${s.spread.sim == null ? 'not visible' : `${pct(s.spread.sim)} %`} / ${s.spread.record == null ? '—' : `${pct(s.spread.record)} %`}`);
    md.push(`| ${scn} | ${o.variety.distinct} of ${o.runs} | ${pct(o.variety.modal_share)} % | ${o.every_seed.map(name).join(', ') || '—'} | ${spreads.join('; ') || '—'} |`);
  }
  const chance = everySeedChance(everySeedSlots);
  const simSpreads = scored.flatMap((o) => Object.values(o.species).filter((s) => isProt(s.role) && s.engine && s.spread.sim != null).map((s) => s.spread.sim));
  const recSpreads = (basis) => scored.flatMap((o) => Object.values(o.species).filter((s) => isProt(s.role) && s.target.basis === basis && s.spread.record != null).map((s) => s.spread.record));
  md.push('');
  md.push(`One assemblage in every seed: ${scored.filter((o) => o.variety.distinct === 1).length} of ${scored.length} scored scenarios. Of the species with an engine and a band (all roles), ${occurrencePattern.every} occur in every seed, ${occurrencePattern.never} in none and ${occurrencePattern.between} in some; at their bands' ceilings about ${Math.round(expectedEvery)} would occur in every seed. If each occurred at its band's ceiling (90–95 % for the common classes), the chance of seeing all of them in every one of their runs would be at most about 10^${Math.round(chance.log10)} — counting each of the ${chance.scenarios} scenarios once, by its least likely such species: species that share a scenario's runs need not be independent, but all of them occur in every run no more often than that one does (treating all ${chance.slots} as independent gives 10^${Math.round(chance.independent_log10)}). The fleet is not a distribution of pockets, whatever the noise on any one species. Median size spread of the protagonists across the seeds whose typical crystal is visible: ${pct(med(simSpreads))} % simulated (${simSpreads.length}), against ${pct(med(recSpreads('crystal')))} % for the record's crystal lengths (${recSpreads('crystal').length}) and ${pct(med(recSpreads('specimen-proxy')))} % for its specimen proxies (${recSpreads('specimen-proxy').length}).`);
  sections.variety = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | star (share of runs) | star is a wanted species / a protagonist / a companion | the star\'s role |');
  md.push('|---|---|---:|---|');
  for (const [scn, o] of sorted) {
    if (!o.stars || o.star_is_wanted >= STAR_SHARE) continue;
    const [top] = Object.entries(o.stars);
    const role = top ? (targets.scenarios[scn].species[top[0]]?.role ?? 'none (not a target)') : '—';
    md.push(`| ${scn} | ${Object.entries(o.stars).slice(0, 2).map(([m, f]) => `${name(m)} ${pct(f)} %`).join(', ') || '—'} | ${pct(o.star_is_wanted)} / ${pct(o.star_is_protagonist)} / ${pct(o.star_is_companion)} % | ${role} |`);
  }
  md.push('');
  md.push(`The star is a wanted species in at least ${pct(STAR_SHARE)} % of the runs (rules.star_wanted_share) in ${scored.filter((o) => o.star_is_wanted >= STAR_SHARE).length} of ${scored.length} scored scenarios; it is a companion — the supporting cast in the star's place — in at least ${pct(STAR_SHARE)} % of the runs in ${scored.filter((o) => o.star_is_companion >= STAR_SHARE).length}.`);
  sections.stars = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | clutter share of visible crystals | species |');
  md.push('|---|---:|---|');
  for (const [scn, o] of Object.entries(out).filter(([, x]) => (x.clutter_visible_share ?? 0) >= CLUTTER_LIMIT).sort((a, b) => b[1].clutter_visible_share - a[1].clutter_visible_share)) {
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
  for (const s of comp) { const v = s.occurrence.verdict + (s.occurrence.noise ? ' (noise)' : ''); cv[v] = (cv[v] || 0) + 1; }
  md.push('');
  md.push(`Companions with an engine and a band (${comp.length}): ${Object.entries(cv).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v, cnt]) => `${v} ${cnt}`).join(', ')}. "~" marks noise: 21 runs cannot tell the rate from the band.`);
  sections.cast = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | species | role | record share | literature |');
  md.push('|---|---|---|---:|---|');
  const rows = [];
  for (const [scn, o] of sorted) if (o.species) for (const [k, s] of Object.entries(o.species)) if (!s.engine && s.role !== 'companion') rows.push([scn, k, s, targets.scenarios[scn].species[k]]);
  for (const [scn, k, s, t] of rows.sort((a, b) => (b[3].record_share ?? 0) - (a[3].record_share ?? 0) || a[0].localeCompare(b[0]))) {
    md.push(`| ${scn} (${out[scn].locality}) | ${name(k)} | ${s.role} | ${t.record_share == null ? '—' : `${(100 * t.record_share).toFixed(t.record_share < 0.1 ? 1 : 0)} %`} | ${t.literature?.class ?? '—'} |`);
  }
  sections['no-engine'] = md.join('\n');
}
{
  const md = [];
  md.push('| scenario | cavity extents x × y × z mm | span mm | equivalent diameter mm | size class | primary protagonist\'s characteristic crystal | pocket |');
  md.push('|---|---|---:|---:|---|---|---|');
  for (const [scn, o] of Object.entries(out).sort((a, b) => a[1].cavity.span_mm - b[1].cavity.span_mm || a[0].localeCompare(b[0]))) {
    const c = o.cavity;
    const t = o.primary ? targets.scenarios[scn].species[o.primary].size : null;
    const char = !t ? '—' : t.basis === 'unknown' ? `${name(o.primary)}: unknown` : `${name(o.primary)}: ${mm(t.median)} mm (${t.basis === 'crystal' ? 'crystal' : 'specimen proxy'}, n ${t.n})`;
    md.push(`| ${scn} | ${c.extents_mm.map(mm).join(' × ')} | ${mm(c.span_mm)} | ${mm(c.eqd_mm)} | ${c.size_class}${c.size_class_basis === 'authored' ? '' : ' (by diameter)'} | ${char} | ${o.pocket ?? '—'} |`);
  }
  md.push('');
  md.push(`Every census seed's cavity was constructed and compared (${Object.values(cav.scenarios).every((v) => v.identical_across_seeds) ? 'all identical' : 'SOME DIFFER'}): the cavity is fixed by the scenario's authored wall, so each scenario's 21 runs share one pocket. The span is the longest distance between two wall vertices: an upper bound on the longest crystal the starting cavity could hold (in a cavity that is not convex the chord can cross the wall), so SMALL is conclusive and STORY-SCALE generous. Dissolution can widen a cavity during a run; the census does not keep the final wall.`);
  sections.cavities = md.join('\n');
}
{
  // The size evidence behind the targets, recomputed from the committed capture.
  const ev = buildSizeEvidence(ROOT);
  if (ev.capture.sha256 !== targets.inputs.size_capture.sha256) throw new Error('the size capture changed since the targets were written: re-run tools/story-pocket-targets.mjs --write');
  const all = Object.values(ev.localities).flatMap((sp) => Object.values(sp));
  const sum = (f) => all.reduce((s, e) => s + f(e), 0);
  const joins = Object.values(ev.joins).flat();
  const md = [];
  md.push(`Capture: ${ev.capture.pages} Mineralienatlas pages; ${sum((e) => e.photos_with_length)} photographs with a stated length, ${sum((e) => e.specimens)} specimens once the photographs of one specimen are joined (${joins.filter((l) => l.why === 'caption').length} by identical captions, ${joins.filter((l) => l.why === 'dims').length} by the same dimensions). Specimens with a length of each kind: crystal ${sum((e) => e.crystal.n)}, aggregate ${sum((e) => e.aggregate.n)}, specimen ${sum((e) => e.specimen.n)}, picture width ${sum((e) => e.fov.n)}. Crystal lengths set aside: ${sum((e) => e.crystal_lengths_of_other_minerals)} named another mineral, ${sum((e) => e.crystal_lengths_about_other_minerals)} were about another mineral, ${sum((e) => e.crystal_widths)} gave a width; ${sum((e) => e.unclassed_lengths)} lengths stayed unclassed. The full audit, every crystal length and every join: \`proposals/DATA-STORY-POCKET-SIZES-2026-10-22.md\`.`);
  const prot = Object.entries(targets.scenarios).flatMap(([scn, s]) => Object.entries(s.species).filter(([, v]) => isProt(v.role)).map(([k, v]) => [scn, k, v]));
  const basis = {};
  for (const [, , v] of prot) { const b = v.size.basis === 'crystal' ? `crystal (${v.size.confidence})` : v.size.basis; basis[b] = (basis[b] || 0) + 1; }
  md.push(`Protagonist size targets (${prot.length}): ${Object.entries(basis).sort().map(([b, cnt]) => `${b} ${cnt}`).join(', ')}.`);
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
  const R = targets.rules;
  sections.rules = `Occurrence bands by literature class: ${Object.entries(R.occurrence_bands).map(([cls, b]) => `${cls} ${pct(b[0])}–${pct(b[1])} %`).join(', ')}; any other class leaves the band unresolved. Size targets: at least ${R.size_min_samples} specimens; confidence low below ${R.size_medium_confidence}, medium below ${R.size_high_confidence}, high from ${R.size_high_confidence}, one step lower when one series holds more than half the lengths (a series: one wording, each upload less than ${Math.round(R.series_gap_s / 86400)} days after the one before; a wording ending in ${R.series_field_labels.map((w) => `"${w}"`).join(', ')}, or a bare length, only among photographs uploaded together); a specimen proxy is always low. Specimen lengths under ${R.specimen_min_mm} mm are set aside; photographs of one specimen are joined when uploaded within ${R.uploaded_together_s.toLocaleString('en-US')} s (${(R.uploaded_together_s / 86400).toFixed(1)} days) of each other. Display range: the record's q${Math.round(100 * R.display_range[0])}–q${Math.round(100 * R.display_range[1])}; a fresh crystal from the record's population lands in it with probability ${(R.display_range[1] - R.display_range[0]).toFixed(2)} × (n − 1) / (n + 1) for a record of n. Story frequency: the largest band floor × that coverage among a scenario's protagonists that can carry a story run — an engine, a band, and a size target whose display range starts within the cavity's span (q25 ≤ span) — crystal targets first, a proxy only where no crystal target can. Noise: the Wilson interval at z ${R.noise_z} — of the rate, for occurrence and the story; for a size verdict, of the share of runs on the target window's side of its near edge, against one half (with ${Math.floor(R.noise_z ** 2)} eligible runs or fewer, too few to tell any miss). Clutter: under ${pct(R.clutter_limit)} % of the visible crystals. The star: a wanted species in at least ${pct(R.star_wanted_share)} % of the runs.`;
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
  const check = process.argv.includes('--check-splice');
  const { changed, names } = spliceGenerated(path.resolve(spliceFile), sections, { check, owner: 'scoreboard' });
  if (check && changed.length) { console.error(`${spliceFile}: generated blocks differ from this run: ${changed.join(', ')}`); process.exit(1); }
  console.log(`${spliceFile}: ${check ? 'all' : 'spliced'} ${names.length} scoreboard blocks${check ? ' match' : ''} (${check ? names.join(', ') : changed.join(', ') || 'none changed'})`);
} else {
  console.log(md.join('\n'));
}
