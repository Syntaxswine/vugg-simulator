#!/usr/bin/env node
/**
 * tools/story-pocket-size-evidence.mjs — photographed sizes per locality and species, for the
 * story-pocket size targets (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, revised 2026-10-22).
 *
 * Reads the caption capture (proposals/DATA-STORY-POCKET-SIZES-CAPTURE-2026-10-22.json) and refuses it
 * unless every page payload's hash and the extractor's source hash (tools/mineralienatlas-size-capture.mjs)
 * recompute. Then, per locality:
 *   - each photograph counts once (by image id; overviews and galleries overlap);
 *   - its first-listed mineral maps to a species key exactly as the comparison maps photographs
 *     (the market dictionary, the comparison's MA_ALIASES read from tools/locality-abundance-compare.mjs,
 *     and the data file's locality aliases);
 *   - photographs of one specimen are joined (groupSpecimens, tools/story-pocket-lib.mjs): identical
 *     caption stretches, or the same multi-dimension length stated twice;
 *   - every length a specimen's captions state is classed by parseSizeStatements: crystal, crystal
 *     width, aggregate, specimen, picture width or unclassed. A crystal length is set aside when it names
 *     another mineral, or when, naming none, its line or title is about another mineral. A specimen
 *     contributes its largest length of each kind.
 * Crystal lengths and specimen dimensions stay separate throughout.
 *
 * Writes .local-evidence/locality-abundance/size-evidence.{json,md}: per locality and species, the
 * sample counts and quantiles of each kind, the coverage (photographs in the archive, read, with a
 * stated length, specimens), every crystal and aggregate length used and every join, for audit. With
 * --appendix it also writes the same audit as proposals/DATA-STORY-POCKET-SIZES-2026-10-22.md (the test
 * checks that file against a rebuild). tools/story-pocket-targets.mjs imports buildSizeEvidence().
 *
 * Usage: node tools/story-pocket-size-evidence.mjs [--appendix]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MARKET_TITLE_DICTIONARY, buildMatchers, classifyTitle } from './market-title-dictionary.mjs';
import { photoSizes, groupSpecimens, summarize, MINERAL_STEMS } from './story-pocket-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CAPTURE_FILE = 'proposals/DATA-STORY-POCKET-SIZES-CAPTURE-2026-10-22.json';
export const APPENDIX_FILE = 'proposals/DATA-STORY-POCKET-SIZES-2026-10-22.md';
const DATA_FILE = 'proposals/DATA-LOCALITY-ABUNDANCE-2026-10-21.json';
const KINDS = ['crystal', 'aggregate', 'specimen', 'fov'];
// Varieties that are one mineral, for "does this crystal statement name the photograph's mineral?".
const FAMILY = { aquamarine: 'beryl', heliodor: 'beryl', emerald: 'beryl', morganite: 'beryl', goshenite: 'beryl', ruby: 'corundum', sapphire: 'corundum', chrysoprase: 'chalcedony' };
const fam = (k) => FAMILY[k] || k;
// Materials collected as cut, polished or broken pieces, not crystals: their lengths are piece sizes.
export const PIECE_SPECIES = new Set(['tigers_eye', 'chrysoprase', 'chalcedony', 'x:jasper']);

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// The extractor's source text as the page saw it (Function.prototype.toString of maSizePage: from
// "async function maSizePage(" to its closing brace, the file's last), read from the file rather than
// from the imported function, whose text a test runner's transform may change.
export function extractorSource(root = ROOT) {
  const src = fs.readFileSync(path.join(root, 'tools', 'mineralienatlas-size-capture.mjs'), 'utf8');
  const start = src.indexOf('async function maSizePage(');
  if (start < 0 || src.indexOf('async function maSizePage(', start + 1) >= 0) throw new Error('tools/mineralienatlas-size-capture.mjs must define maSizePage exactly once');
  return src.slice(start, src.lastIndexOf('}') + 1);
}

// The comparison's Mineralienatlas name map, read from its source, so the two tools cannot disagree
// about which species a photograph counts for.
function readMaAliases(root) {
  const src = fs.readFileSync(path.join(root, 'tools', 'locality-abundance-compare.mjs'), 'utf8');
  const block = src.match(/const MA_ALIASES = \{([\s\S]*?)\};/);
  if (!block) throw new Error('MA_ALIASES not found in tools/locality-abundance-compare.mjs');
  const out = Object.fromEntries([...block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
  const declared = (block[1].match(/'[^']+'\s*:/g) || []).length;
  if (Object.keys(out).length !== declared) throw new Error(`MA_ALIASES: read ${Object.keys(out).length} of ${declared} entries`);
  return out;
}

export function buildSizeEvidence(root = ROOT) {
  const raw = fs.readFileSync(path.join(root, CAPTURE_FILE), 'utf8');
  const cap = JSON.parse(raw);
  const data = JSON.parse(fs.readFileSync(path.join(root, DATA_FILE), 'utf8'));
  // 1. Verify the capture: the extractor in the tree is the one that ran, and no payload was edited.
  const fn = sha(extractorSource(root));
  if (fn !== cap.extractor.source_sha256) throw new Error(`extractor source hash ${fn} ≠ the capture's ${cap.extractor.source_sha256}`);
  for (const p of cap.pages) {
    const { sha256, ...rest } = p;
    if (rest.fn !== fn) throw new Error(`page ${p.label}: extractor hash ${rest.fn} ≠ ${fn}`);
    if (sha(JSON.stringify(rest)) !== sha256) throw new Error(`page ${p.label}: payload hash does not recompute`);
  }
  // 2. Names to species keys, as the comparison does it.
  const matchers = buildMatchers(MARKET_TITLE_DICTIONARY);
  const MA_ALIASES = readMaAliases(root);
  const maKey = (name) => {
    if (MA_ALIASES[name]) return MA_ALIASES[name];
    const ids = classifyTitle(name, matchers);
    return ids.length ? ids[0] : `ma:${name.toLowerCase()}`;
  };
  const keyFor = (loc) => (name) => {
    const k = maKey(name);
    return data.localities[loc]?.aliases?.[k]?.to || k;
  };
  const unmappedStems = MINERAL_STEMS.filter(([, name]) => maKey(name).startsWith('ma:')).map(([s, name]) => `${s} → ${name}`);
  // 3. Pages to localities: an overview by its location id, a gallery by the section that links it.
  const locOfLid = {};
  for (const [loc, v] of Object.entries(cap.localities)) for (const id of v.location_ids) locOfLid[id] = loc;
  const locOfGallery = {};
  for (const [lid, secs] of Object.entries(cap.sections)) {
    for (const [, , , g] of secs) {
      if (locOfGallery[g] && locOfGallery[g] !== locOfLid[lid]) throw new Error(`gallery ${g} listed under two localities`);
      locOfGallery[g] = locOfLid[lid];
    }
  }
  const pageLoc = (p) => {
    const q = new URLSearchParams(p.url.split('?')[1] || '');
    const lid = q.get('lokationid'), mid = q.get('mineralid');
    return /LokationMineralBilder/.test(p.url) ? locOfLid[lid] : locOfGallery[`${lid}/${mid}`];
  };
  // 4. Photographs, once each per locality.
  const photos = {};
  const readCounts = {};
  for (const p of cap.pages) {
    const loc = pageLoc(p);
    if (!loc) throw new Error(`page ${p.label} (${p.url}) maps to no locality`);
    for (const [name, [n]] of Object.entries(p.leadCounts)) {
      const k = keyFor(loc)(name);
      ((readCounts[loc] ||= {})[k] ||= 0);
      readCounts[loc][k] += n;
    }
    for (const [id, lead, nmin, windows] of p.rows) {
      const m = (photos[loc] ||= new Map());
      if (!m.has(id)) m.set(id, { lead, nmin, windows });
    }
  }
  // 5. Specimens: join the photographs of one specimen, then class and summarise their lengths.
  const out = {};
  const audit = {};
  const joins = {};
  for (const [loc, m] of Object.entries(photos)) {
    const keyOf = keyFor(loc);
    const list = [...m].map(([id, p]) => ({ id, key: keyOf(p.lead), lead: p.lead, nmin: p.nmin, windows: p.windows }));
    const { groups, links } = groupSpecimens(list);
    joins[loc] = links;
    const acc = {};
    for (const g of groups) {
      const k = g.key;
      const a = (acc[k] ||= { names: new Set(), photos: 0, specimens: 0, multi: 0, values: Object.fromEntries(KINDS.map((x) => [x, []])), other: 0, ambiguous: 0, unclassed: 0, widths: 0, small: 0, statements: [] });
      for (const p of g.photos) a.names.add(p.lead);
      a.photos += g.photos.length;
      a.specimens++;
      if (g.photos.some((p) => p.nmin > 1)) a.multi++;
      const windows = [...new Set(g.photos.flatMap((p) => p.windows))];
      const ps = photoSizes(windows, k, { keyOf, same: (x, y) => fam(x) === fam(y), piece: PIECE_SPECIES.has(k) });
      for (const kind of KINDS) if (ps[kind] != null) a.values[kind].push(ps[kind]);
      if (ps.specimen != null && ps.specimen < 10) a.small++;
      a.other += ps.other;
      a.ambiguous += ps.ambiguous;
      a.unclassed += ps.unclassed;
      a.widths += ps.widths;
      const ids = g.photos.map((p) => p.id).join('+');
      for (const s of ps.statements) if (s.kind === 'crystal' || s.kind === 'aggregate') a.statements.push([ids, s.kind, s.mm, s.cue, windows.join(' | ')]);
    }
    // The archive's photographs of each species: the overview sections, all sub-localities.
    const archive = {};
    for (const id of cap.localities[loc].location_ids) for (const [name, n] of cap.sections[id] || []) archive[keyOf(name)] = (archive[keyOf(name)] || 0) + n;
    out[loc] = {};
    audit[loc] = {};
    for (const [k, a] of Object.entries(acc).sort(([x], [y]) => x.localeCompare(y))) {
      out[loc][k] = {
        names: [...a.names].sort(),
        photos_in_archive: archive[k] ?? null,
        photos_read_upper: readCounts[loc]?.[k] ?? null,
        photos_with_length: a.photos,
        specimens: a.specimens,
        multi_mineral_specimens: a.multi,
        ...Object.fromEntries(KINDS.map((kind) => [kind, summarize(a.values[kind])])),
        specimen_under_10mm: a.small,
        crystal_lengths_of_other_minerals: a.other,
        crystal_lengths_about_other_minerals: a.ambiguous,
        crystal_widths: a.widths,
        unclassed_lengths: a.unclassed,
        piece_material: PIECE_SPECIES.has(k),
      };
      audit[loc][k] = a.statements.sort((x, y) => y[2] - x[2]);
    }
  }
  return {
    capture: { file: CAPTURE_FILE, sha256: sha(raw), pages: cap.pages.length, rows: cap.pages.reduce((s, p) => s + p.rows.length, 0), extractor_sha256: fn },
    unmapped_stems: unmappedStems,
    localities: out,
    audit,
    joins,
  };
}

/** The audit, as markdown: per species the samples of each kind, every crystal length used, every join. */
export function renderSizeEvidenceMd(ev) {
  const r = (x) => (x == null ? '—' : x >= 10 ? x.toFixed(0) : x.toFixed(1));
  const q = (s) => (s.n ? `${s.n}: ${r(s.median)} (${r(s.q25)}–${r(s.q75)})` : '0');
  const all = Object.values(ev.localities).flatMap((sp) => Object.values(sp));
  const sum = (f) => all.reduce((s, e) => s + f(e), 0);
  const md = [];
  md.push(`# Photographed sizes — ${ev.capture.pages} Mineralienatlas pages, ${sum((e) => e.photos_with_length)} photographs with a stated length, ${sum((e) => e.specimens)} specimens`);
  md.push('');
  md.push(`Generated by \`node tools/story-pocket-size-evidence.mjs --appendix\` from \`${ev.capture.file}\` (sha256 ${ev.capture.sha256.slice(0, 16)}…); every page hash and the extractor's source hash (${ev.capture.extractor_sha256.slice(0, 16)}…) recomputed. Lengths in mm.`);
  md.push('');
  md.push('- A photograph counts once. Photographs of one specimen — identical caption stretches, or the same multi-dimension length stated twice — count as one specimen (the joins are listed at the end).');
  md.push('- Each cell: specimens with a length of that kind: median (q25–q75). A specimen contributes its largest length of each kind.');
  md.push('- "crystal" = a crystal of the photograph\'s first-listed mineral; "aggregate" = a named aggregate (sphere, rosette, sheaf); "specimen" = the whole specimen; "width" = the picture\'s width. A crystal length is set aside when it names another mineral, or names none while its line or title is about another mineral. A crystal\'s width or thickness is not a length and is not used. Piece materials (*) count every length as a piece (specimen).');
  md.push('');
  md.push('| locality | species (archive names) | photographs: archive / read / with a length → specimens | crystal | aggregate | specimen (under 10 mm) | picture width | crystal lengths set aside: of another mineral / about another / widths | unclassed |');
  md.push('|---|---|---|---|---|---|---|---|---:|');
  for (const [loc, sp] of Object.entries(ev.localities).sort(([a], [b]) => a.localeCompare(b))) {
    for (const [k, e] of Object.entries(sp)) {
      md.push(`| ${loc} | ${k}${e.piece_material ? ' *' : ''} (${e.names.join(', ')}) | ${e.photos_in_archive ?? '—'} / ${e.photos_read_upper ?? '—'} / ${e.photos_with_length} → ${e.specimens} | ${q(e.crystal)} | ${q(e.aggregate)} | ${q(e.specimen)} (${e.specimen_under_10mm}) | ${q(e.fov)} | ${e.crystal_lengths_of_other_minerals} / ${e.crystal_lengths_about_other_minerals} / ${e.crystal_widths} | ${e.unclassed_lengths} |`);
    }
  }
  md.push('');
  md.push('"read" sums the photographs of the species on every page read, so a photograph on both an overview and a gallery counts twice: an upper bound. "under 10 mm": specimen lengths below 10 mm, mostly micromount captions whose "Größe" gives the crystal or the field; they pull a specimen proxy down.');
  if (ev.unmapped_stems.length) md.push(`Caption stems whose English name the market dictionary does not classify (compared as written): ${ev.unmapped_stems.join('; ')}.`);
  md.push('');
  md.push('## Every crystal and aggregate length used');
  md.push('');
  md.push('Image id(s) (Mineralienatlas; "+" joins one specimen\'s photographs), kind, mm, the words that decided, the caption stretch.');
  for (const [loc, sp] of Object.entries(ev.audit).sort(([a], [b]) => a.localeCompare(b))) {
    for (const [k, rows] of Object.entries(sp)) {
      if (!rows.length) continue;
      md.push('');
      md.push(`**${loc} — ${k}** (${rows.length})`);
      md.push('');
      for (const [id, kind, mm, cue, text] of rows) md.push(`- ${id} · ${kind} · ${mm} · ${cue} · "${text.replace(/\|/g, '/').trim()}"`);
    }
  }
  md.push('');
  md.push('## Photographs joined as one specimen');
  md.push('');
  const joins = Object.entries(ev.joins).flatMap(([loc, links]) => links.map((l) => [loc, l]));
  md.push(`${joins.length} joins: ${joins.filter(([, l]) => l.why === 'caption').length} by identical captions, ${joins.filter(([, l]) => l.why === 'dims').length} by the same multi-dimension length. The dimension joins:`);
  md.push('');
  for (const [loc, l] of joins.filter(([, x]) => x.why === 'dims')) md.push(`- ${loc}: ${l.a} + ${l.b} · ${l.dims.replace(/x/g, ' × ')} mm`);
  return md.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ev = buildSizeEvidence();
  const md = renderSizeEvidenceMd(ev);
  const OUT = path.join(ROOT, '.local-evidence', 'locality-abundance');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'size-evidence.json'), JSON.stringify(ev, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'size-evidence.md'), md);
  if (process.argv.includes('--appendix')) fs.writeFileSync(path.join(ROOT, APPENDIX_FILE), md);
  console.log(md.slice(0, md.indexOf('## Every crystal and aggregate length used')));
}
