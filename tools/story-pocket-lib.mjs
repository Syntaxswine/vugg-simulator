/**
 * tools/story-pocket-lib.mjs — the pure functions behind the story-pocket targets and scoreboard
 * (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, revised 2026-10-22). No I/O: the tools
 * tools/story-pocket-size-evidence.mjs, tools/story-pocket-targets.mjs and tools/showcase-scoreboard.mjs
 * do the reading and writing, and tests-js/story-pocket-scoreboard.test.ts tests these directly.
 *
 * Three parts:
 *   1. Reading sizes out of photograph captions (Mineralienatlas captions, mostly German): which
 *      length is a crystal, a named aggregate, the whole specimen or the picture's width, and which
 *      mineral a crystal statement names.
 *   2. The pre-registered targets: roles from the record and the literature, occurrence bands from the
 *      literature's abundance class, size targets from the photographed crystal sizes.
 *   3. The assessment of a scenario's runs against those targets: occurrence against its band, size
 *      conditional on occurrence and on the pocket fitting the crystal, and the story frequency.
 */

// ------------------------------------------------------------------ 1. caption sizes

const L = String.raw`\p{L}`;
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const UNIT = String.raw`(?:mm|cm|µm|μm)`;
// Between the dimensions of one expression: x, ×, the Cyrillic х some captions use, *, "mal", "/",
// "bis", "to", or an unspaced hyphen (5-10 mm). A spaced hyphen is a dash ("Namibia - 9 x 6 cm").
const SEP = String.raw`(?:\s*(?:x|×|х|\*|mal|\/|bis|to)\s*(?:ca\.?\s*)?|-)`;
// One length expression: up to three numbers, each with an optional unit, and a closing unit. Meters
// are not read: in captions they are mine depths and vein widths, not specimens.
export const SIZE_EXPR = new RegExp(String.raw`(${NUM})\s*(${UNIT})?((?:${SEP}${NUM}\s*(?:${UNIT})?){0,2})\s*(${UNIT})`, 'giu');
const PART = new RegExp(String.raw`(${NUM})\s*(${UNIT})?`, 'giu');

const toMm = (n, unit) => {
  const v = Number(String(n).replace(',', '.'));
  const u = String(unit).toLowerCase();
  return u === 'cm' ? v * 10 : u === 'mm' ? v : v / 1000;
};

// Cues before a length, within its clause (captions separate title, lines and fields with ";"). The
// cue nearest the number decides, if it ends within GAP characters of it; on a tie (one word that is
// two cues, "Kristallgröße"), the earlier kind in CUE_ORDER wins. No cue: the specimen (dealers write
// "Tsumeb, Namibia - 9,5 x 6,5 x 3,5 cm").
const GAP = 26;
const CUE_ORDER = ['ignore', 'fov', 'crystal', 'aggregate', 'specimen'];
const CUES = {
  // Not about the specimen: camera lenses, depth of field, vein widths, mine levels.
  ignore: new RegExp(String.raw`macro|makro|objektiv|\blens\b|canon|nikon|laowa|tamron|depth of field|deep of field|schärfentiefe|mächtig|teufe|sohle|\blevel\b`, 'giu'),
  // The picture's width or height (field of view).
  fov: new RegExp(String.raw`bildbreite|bildbr\.?|bilbbreite|bildbeite|bildhöhe|bildfeld|bildgr${L}*|bild${L}*ausschnitt${L}*|aus?schnit${L}*|\bbb\b|b-höhe|\bfov\b|field of view|filed of view|largeur d'image|image width|picture width`, 'giu'),
  // A crystal: "Kristall…" (not a crystal group, druse or aggregate), "crystal", "XX", "X =", edge
  // length ("Kantenlänge", "KL"), a form name (cube, octahedron, rhombohedron, doubly terminated, twin).
  crystal: new RegExp(String.raw`[${L}-]*kristall(?!${L}*(?:gruppe|stufe|aggregat|druse|platte|isation|kugel|rasen))${L}*|crystals?\b|\bxx\b|\bxls?\b|\bx\b(?=\s*[=:.]?\s*(?:ca\.?\s*)?$)|kantenl${L}*\.?|\bkl\b|[${L}-]*(?:würfel|oktaeder|rhomboeder|doppelend|zwilling|quader)${L}*|beryllgröße`, 'giu'),
  // A named aggregate of one species: sphere, rosette, sheaf, tuft, "iron rose", "ball".
  aggregate: new RegExp(String.raw`${L}*(?:aggregat|kugel|rosette|garbe|büschel|eisenrose|kristallisation|rasen)${L}*|\bball\b`, 'giu'),
  // The whole specimen (Stufe), piece, group or matrix.
  specimen: new RegExp(String.raw`größe|grösse|groesse|${L}*stufe${L}*|stück${L}*|stüfchen|dimensions?|(?<!crystal\s)size\b|specimen|maße|gesamt${L}*|gruppe|matrix|platte|höhe|\bbreite\b`, 'giu'),
};
// Cues right after a length bind tighter than any before it.
const AFTER_IGNORE = /^\s*(?:macro|makro|objektiv|lens\b|f\/\d)/iu;
const AFTER_FOV = new RegExp(String.raw`^\s*(?:bildbreite|bildbr|bildhöhe|bb\b|breite[rns]?\s+aus|aus?schnitt)`, 'iu');
const AFTER_CRYSTAL = new RegExp(String.raw`^\s*(?:kl\b|kantenl|kristall|crystal\b|(?:hohe|lange|große|grosse)[rns]?\s+kristal)`, 'iu');
// "N mm großer/große/großes <noun>" (or hoher, langer, breiter, dicker): an attributive adjective, so
// the size belongs to the noun after it. Captions are cut 15 characters after the number, so the noun
// is often truncated ("große Kupferst…"); its gender, from the ending or the determiner, then decides.
const AFTER_ADJ = new RegExp(String.raw`^\s*(groß|gross|hoh|lang|breit|dick)(er|es|em|en|e)?(?!${L})\s*(,?)\s*([${L}-]*)`, 'iu');
const DETERMINER = new RegExp(String.raw`(?:^|[^${L}])(dieser|diese|dieses|der|die|das|ein|eine|einen|einem|eines)((?:\s+(?:etwa|ca\.?|circa|rund|knapp|bis|zu|über|fast|nur|gut))*)\s*$`, 'iu');
const UP_TO = /(?:^|\s)bis(?:\s+(?:zu|ca\.?|etwa|knapp|max\.?))*\s*$/iu;
// A massive or fibrous material whose collector unit is a cut or broken piece, not a crystal.
const NOUN_PIECE = /^(tiger|falken|stier|chrysopr|chalced|jaspis|jasper|achat|chiastol|krokyd)/iu;
const NOUN_SPECIMEN = new RegExp(String.raw`(stufe|stuf|stück|stüfchen|gruppe|grupp|druse|platte|matrix|handstu|kleinstu|^${L}{4,}st$)`, 'iu');
const NOUN_AGGREGATE = /(aggregat|kugel|rosette|garbe|büschel|rasen)/iu;
const NOUN_CRYSTAL = /(kristal|krista|^krist|kri$|xx|zwilling|doppelend|doppele|oktaed|prismat|würfel|rhombo|spitze|nadel|säule|tafel|scherbe|zepter|phantom|quader)/iu;

// German (and English) stems of the minerals in the captured sections, to an English name the market
// dictionary classifies (tools/market-title-dictionary.mjs). A stem matches a word that starts with it
// (the longest such stem wins); failing that, a word cut short (5 letters or more) that the stems of
// one mineral alone start with. "=" marks a stem that must be the whole word ("Gold", not "goldgelb";
// "Kupfer", not "Kupferkies").
export const MINERAL_STEMS = [
  ['fluorit', 'Fluorite'], ['rosafluorit', 'Fluorite'], ['calcit', 'Calcite'], ['kalzit', 'Calcite'], ['kalkspat', 'Calcite'],
  ['kobaltocalcit', 'Cobaltocalcite'], ['galenit', 'Galena'], ['bleiglanz', 'Galena'], ['sphalerit', 'Sphalerite'],
  ['zinkblende', 'Sphalerite'], ['quarz', 'Quartz'], ['bergkristall', 'Rock Crystal'], ['rauchquarz', 'Smoky Quartz'],
  ['amethyst', 'Amethyst'], ['zepterquarz', 'Sceptre Quartz'], ['phantomquarz', 'Phantom quartz'], ['herkimer', 'Herkimer Quartz'],
  ['morion', 'Morion'], ['chalcedon', 'Chalcedony'], ['chalkopyrit', 'Chalcopyrite'], ['chalcopyrit', 'Chalcopyrite'],
  ['kupferkies', 'Chalcopyrite'], ['dolomit', 'Dolomite'], ['pyrit', 'Pyrite'], ['markasit', 'Marcasite'], ['azurit', 'Azurite'],
  ['kupferlasur', 'Azurite'], ['malachit', 'Malachite'], ['cerussit', 'Cerussite'], ['smithsonit', 'Smithsonite'],
  ['mimetesit', 'Mimetite'], ['mimetit', 'Mimetite'], ['=kupfer', 'Copper'], ['cuprit', 'Cuprite'], ['chalkotrichit', 'Chalcotrichite'],
  ['erythrin', 'Erythrite'], ['erythrit', 'Erythrite'], ['zeunerit', 'Zeunerite'], ['heinrichit', 'Heinrichite'], ['topas', 'Topaz'],
  ['aquamarin', 'Aquamarine'], ['beryll', 'Beryl'], ['spinell', 'Spinel'], ['rubin', 'Ruby'], ['saphir', 'Sapphire'],
  ['painit', 'Painite'], ['turmalin', 'Tourmaline'], ['elbait', 'Elbaite'], ['rubellit', 'Rubellite'], ['indigolith', 'Indicolite'],
  ['verdelith', 'Verdelite'], ['schörl', 'Schorl'], ['grossular', 'Grossular'], ['hessonit', 'Hessonite'], ['chromgrossular', 'Grossular'],
  ['vesuvian', 'Vesuvianite'], ['diopsid', 'Diopside'], ['pektolith', 'Pectolite'], ['titanit', 'Titanite'], ['epidot', 'Epidote'],
  ['klinozoisit', 'Clinozoisite'], ['ilmenit', 'Ilmenite'], ['apophyllit', 'Apophyllite'], ['fluorapophyllit', 'Apophyllite'],
  ['hydroxyapophyllit', 'Apophyllite'], ['stilbit', 'Stilbite'], ['heulandit', 'Heulandite'], ['cavansit', 'Cavansite'],
  ['coelestin', 'Celestine'], ['cölestin', 'Celestine'], ['celestin', 'Celestine'], ['schwefel', 'Sulphur'], ['aragonit', 'Aragonite'],
  ['halit', 'Halite'], ['steinsalz', 'Halite'], ['hanksit', 'Hanksite'], ['sulfohalit', 'Sulphohalite'], ['gips', 'Gypsum'],
  ['selenit', 'Selenite'], ['marienglas', 'Gypsum'], ['anhydrit', 'Anhydrite'], ['rhodochrosit', 'Rhodochrosite'],
  ['calaverit', 'Calaverite'], ['sylvanit', 'Sylvanite'], ['hämatit', 'Hematite'], ['eisenrose', 'Hematite'], ['euklas', 'Euclase'],
  ['pyromorphit', 'Pyromorphite'], ['hemimorphit', 'Hemimorphite'], ['tetraedrit', 'Tetrahedrite'], ['spessartin', 'Spessartine'],
  ['chiastolith', 'Chiastolite'], ['andalusit', 'Andalusite'], ['tigerauge', 'Tigers Eye'], ['falkenauge', "Falcon's Eye"],
  ['chrysopras', 'Chrysoprase'], ['=gold', 'Gold'], ['baryt', 'Baryte'], ['schwerspat', 'Baryte'], ['witherit', 'Witherite'],
  ['siderit', 'Siderite'], ['ankerit', 'Ankerite'], ['mottramit', 'Mottramite'], ['duftit', 'Duftite'], ['wulfenit', 'Wulfenite'],
  ['dioptas', 'Dioptase'], ['anglesit', 'Anglesite'], ['albit', 'Albite'], ['muskowit', 'Muscovite'], ['lepidolith', 'Lepidolite'],
  ['skolezit', 'Scolecite'], ['mesolith', 'Mesolite'], ['prehnit', 'Prehnite'], ['okenit', 'Okenite'], ['gyrolith', 'Gyrolite'],
  ['konichalcit', 'Conichalcite'], ['tennantit', 'Tennantite'], ['linarit', 'Linarite'], ['=silber', 'Silver'], ['skutterudit', 'Skutterudite'],
  ['zinnober', 'Cinnabar'], ['molybdänit', 'Molybdenite'], ['bornit', 'Bornite'], ['wavellit', 'Wavellite'],
];
const fold = (s) => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const STEMS = MINERAL_STEMS.map(([stem, name]) => ({ exact: stem.startsWith('='), s: fold(stem.replace(/^=/, '')), name }));
/** The mineral a word names (an English name), or null. Hyphenated compounds are read part by part. */
export function mineralOfWord(word) {
  for (const part of String(word || '').split('-')) {
    const w = fold(part);
    if (w.length < 3) continue;
    let best = null;
    for (const { exact, s, name } of STEMS) {
      const hit = exact ? w === s || w.startsWith(`${s}kristall`) : w.startsWith(s);
      if (hit && (!best || s.length > best.s.length)) best = { s, name };
    }
    if (best) return best.name;
    if (w.length >= 5) {
      const cut = new Set(STEMS.filter(({ s }) => s.startsWith(w)).map(({ name }) => name));
      if (cut.size === 1) return [...cut][0];
    }
  }
  return null;
}

// The nearest cue that ends within GAP of the end of `before`.
function nearestCue(before) {
  let best = null;
  for (const kind of CUE_ORDER) {
    for (const m of before.matchAll(CUES[kind])) {
      const end = m.index + m[0].length;
      if (before.length - end > GAP) continue;
      if (!best || end > best.end) best = { kind, end, start: m.index, text: m[0] };
    }
  }
  return best;
}
// The mineral a crystal cue names: the cue's own compound ("Fluoritkristall", "Calcit-XX"), else the
// word right before it ("Galenit Oktaeder", "Cerussit xx").
const PREV_WORD = new RegExp(String.raw`(${L}{4,})[\s-]?$`, 'u');
function cueMineral(before, cue) {
  const own = mineralOfWord(cue.text);
  if (own) return own;
  const prev = before.slice(Math.max(0, cue.start - 30), cue.start).match(PREV_WORD);
  return prev ? mineralOfWord(prev[1]) : null;
}
function genderOf(ending, before) {
  const d = before.match(DETERMINER);
  const det = d ? d[1].toLowerCase() : null;
  const e = (ending || '').toLowerCase();
  // "einem" is masculine or neuter; mineral names are masculine, and a neuter piece ("einem Stück")
  // is caught by its noun first.
  if (det === 'dieser' || det === 'einen' || det === 'einem' || (det === 'ein' && e === 'er') || (det === 'der' && e === 'e')) return 'm';
  if (det === 'dieses' || det === 'das' || (det === 'ein' && e === 'es')) return 'n';
  if (det === 'diese' || det === 'eine' || (det === 'die' && e === 'e')) return 'f';
  if (det) return '?';
  return e === 'er' ? 'm' : e === 'e' ? 'f' : e === 'es' ? 'n' : '?';
}

/**
 * Every length statement in a caption stretch: [{ kind, mm, named, cue, text }], where kind is
 * 'crystal' | 'aggregate' | 'specimen' | 'fov' | 'unclassed', mm the expression's longest dimension,
 * named the mineral a crystal or aggregate statement names itself (an English name, or null), cue the
 * words that decided, and text the expression as written. Lens and vein statements are dropped.
 */
export function parseSizeStatements(text) {
  const out = [];
  const t = String(text);
  for (const m of t.matchAll(SIZE_EXPR)) {
    const before = t.slice(0, m.index).split(';').pop();
    const after = t.slice(m.index + m[0].length);
    const mm = Math.max(...[...m[0].matchAll(PART)].map((p) => toMm(p[1], p[2] || m[4])));
    if (!(mm > 0)) continue;
    const cue = nearestCue(before);
    if (cue?.kind === 'ignore' || AFTER_IGNORE.test(after)) continue;
    const adj = after.match(AFTER_ADJ);
    let kind, named = null, why;
    if (AFTER_FOV.test(after)) { kind = 'fov'; why = after.match(AFTER_FOV)[0].trim(); }
    else if (AFTER_CRYSTAL.test(after)) {
      kind = 'crystal'; why = after.match(AFTER_CRYSTAL)[0].trim();
      if (cue?.kind === 'crystal') named = cueMineral(before, cue);
    } else if (adj && adj[2]) {
      // Attributive: the noun after the adjective decides; its gender where the noun is cut off or hidden.
      const [, , ending, comma, noun] = adj;
      const gender = genderOf(ending, before);
      const upTo = UP_TO.test(before);
      const noun_ = comma ? '' : noun;
      why = adj[0].trim();
      if (noun_ && (NOUN_PIECE.test(noun_) || NOUN_SPECIMEN.test(noun_))) kind = 'specimen';
      else if (noun_ && NOUN_AGGREGATE.test(noun_)) { kind = 'aggregate'; named = mineralOfWord(noun_); }
      else if (noun_ && NOUN_CRYSTAL.test(noun_)) { kind = 'crystal'; named = mineralOfWord(noun_); }
      else { kind = gender === 'm' || upTo ? 'crystal' : 'unclassed'; named = noun_ ? mineralOfWord(noun_) : null; }
    } else if (cue) {
      kind = cue.kind; why = cue.text;
      if (kind === 'crystal' || kind === 'aggregate') named = cueMineral(before, cue);
    } else { kind = 'specimen'; why = '(no cue)'; }
    out.push({ kind, mm: +mm.toFixed(3), named, cue: why, text: m[0] });
  }
  return out;
}

/**
 * One photograph's sizes for its lead species: the largest statement of each kind. A crystal or
 * aggregate statement that names another mineral is not the lead's: it is counted as `other`, not
 * used. keyOf maps an English mineral name to a species key; same(a, b) says two keys are one mineral
 * (a variety and its species); piece = the lead is a massive or fibrous material sold as pieces (tiger's
 * eye, chrysoprase), whose "crystal" statements describe a piece and so count as specimen dimensions.
 */
export function photoSizes(windows, lead, { keyOf = (x) => x, same = (a, b) => a === b, piece = false } = {}) {
  const best = { crystal: null, aggregate: null, specimen: null, fov: null };
  let other = 0, unclassed = 0;
  const used = [];
  for (const w of windows) {
    for (let s of parseSizeStatements(w)) {
      if (s.kind === 'unclassed') { unclassed++; continue; }
      if ((s.kind === 'crystal' || s.kind === 'aggregate') && s.named && !same(keyOf(s.named), lead)) { other++; continue; }
      if (piece && (s.kind === 'crystal' || s.kind === 'aggregate')) s = { ...s, kind: 'specimen', cue: `${s.cue} (a piece)` };
      if (best[s.kind] == null || s.mm > best[s.kind]) best[s.kind] = s.mm;
      used.push(s);
    }
  }
  return { ...best, other, unclassed, statements: used };
}

// ------------------------------------------------------------------ 2. statistics

/** Linear-interpolated quantile of an ascending array (the R-7 / NumPy default). */
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
export function summarize(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { n: 0 };
  const r = (x) => +x.toFixed(3);
  return { n: v.length, min: r(v[0]), q10: r(quantile(v, 0.1)), q25: r(quantile(v, 0.25)), median: r(quantile(v, 0.5)),
    q75: r(quantile(v, 0.75)), q90: r(quantile(v, 0.9)), max: r(v[v.length - 1]) };
}
/** Wilson score interval for k successes in n trials (95 % by default). */
export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 1];
  const p = k / n, z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

// ------------------------------------------------------------------ 3. targets

/** The literature's abundance class without its form suffix ("AB-crust" → "AB"); null when absent. */
export const baseClass = (cls) => (cls ? String(cls).replace(/[-\s].*$/, '') : null);
const CONTRADICTED = new Set(['ND', 'ND?', 'Q']);
const RARE = new Set(['RA', 'VR']);
const COMMON = new Set(['AB', 'CO']);

/**
 * Roles from the record (which species people want from the place) gated by the literature (whether
 * the place has them):
 *   primary     the most-wanted species the literature does not contradict or call rare;
 *   alternate   every other such wanted species — any of them can carry a pocket's story;
 *   showpiece   a wanted species the literature calls rare (RA, VR): an occasional pocket's;
 *   unsupported a wanted species the literature contradicts (ND, ND?, Q): listed, not targeted;
 *   companion   a species the literature calls abundant or common that the record does not want.
 * rows: [{ k, real, lit }] (record share, literature class). wanted = rows with real ≥ wantedShare,
 * or, where the record is too thin to vote, the collectibles the sources name (named).
 */
export function deriveRoles(rows, { wantedShare, setAside = () => false, named = null }) {
  const roles = {};
  const live = rows.filter((r) => !setAside(r.k));
  const wanted = named
    ? named.map((k) => live.find((r) => r.k === k) || { k, real: null, lit: null })
    : live.filter((r) => (r.real ?? 0) >= wantedShare).sort((a, b) => (b.real ?? 0) - (a.real ?? 0) || a.k.localeCompare(b.k));
  let primary = null;
  for (const r of wanted) {
    const cls = baseClass(r.lit);
    if (cls && CONTRADICTED.has(cls)) roles[r.k] = 'unsupported';
    else if (cls && RARE.has(cls)) roles[r.k] = 'showpiece';
    else if (!primary) { primary = r.k; roles[r.k] = 'primary'; }
    else roles[r.k] = 'alternate';
  }
  for (const r of live) {
    if (roles[r.k]) continue;
    const cls = baseClass(r.lit);
    if (cls && COMMON.has(cls)) roles[r.k] = 'companion';
  }
  return roles;
}

/** The occurrence band a literature class pre-registers, or null (unresolved). */
export function bandFor(cls, bands) {
  const b = bands[baseClass(cls)];
  return b ? [b[0], b[1]] : null;
}

/**
 * A size target from a species' photographed sizes: crystal statements when there are enough, else
 * the specimen dimensions as a proxy, else unknown. A specimen is at least as long as its largest
 * crystal, so a proxy is an upper bound: reaching it is conclusive, falling short of it is not.
 * Confidence: high or medium by the crystal sample count; low for a proxy.
 */
export function sizeTarget(ev, { minSamples, highConfidence }) {
  const c = ev?.crystal?.n ?? 0, s = ev?.specimen?.n ?? 0;
  const pick = c >= minSamples ? ['crystal', ev.crystal] : s >= minSamples ? ['specimen-proxy', ev.specimen] : null;
  if (!pick) return { basis: 'unknown', crystal_n: c, specimen_n: s };
  const [basis, d] = pick;
  const confidence = basis === 'crystal' ? (d.n >= highConfidence ? 'high' : 'medium') : 'low';
  return { basis, n: d.n, q10: d.q10, q25: d.q25, median: d.median, q75: d.q75, q90: d.q90, confidence, crystal_n: c, specimen_n: s };
}

// ------------------------------------------------------------------ 4. assessment

/** IN / LOW / HIGH against a band; noise = the 95 % interval still reaches the band. */
export function assessOccurrence(k, n, band) {
  const rate = n ? k / n : null;
  if (!band || !n) return { verdict: 'UNRESOLVED', rate, k, n };
  const ci = wilson(k, n);
  if (rate >= band[0] && rate <= band[1]) return { verdict: 'IN', rate, k, n, ci };
  return { verdict: rate < band[0] ? 'LOW' : 'HIGH', noise: ci[1] >= band[0] && ci[0] <= band[1], rate, k, n, ci };
}

/**
 * Does a crystal of the target's characteristic (median) length fit a cavity whose longest interior
 * span is spanMm? true / false; null when it cannot be told — no target, or a specimen proxy the
 * cavity is smaller than (the crystal itself may be smaller still).
 */
export function fits(spanMm, target) {
  if (!target || target.basis === 'unknown') return null;
  if (spanMm >= target.median) return true;
  return target.basis === 'crystal' ? false : null;
}

/** The pocket's class against the primary protagonist's characteristic crystal. */
export function pocketClass(spanMm, primaryTarget) {
  const f = fits(spanMm, primaryTarget);
  return f === true ? 'STORY-SCALE' : f === false ? 'SMALL' : 'UNCLASSED';
}

/**
 * Size, conditional on occurrence and on the pocket fitting the characteristic crystal: over the runs
 * where the species survives in a cavity that fits its median, the share whose largest unflagged
 * crystal reaches the target's lower quartile. MEETS when at least half do (the conditional median
 * reaches the lower quartile), OVERSIZE when the conditional median passes the record's 90th
 * percentile. Below a proxy is BELOW PROXY: not a verdict, since the proxy overstates the crystal.
 *   runs: [{ occurs, size, span }]
 */
export function assessSize(runs, target) {
  if (!target || target.basis === 'unknown') return { verdict: 'UNKNOWN' };
  const occurring = runs.filter((r) => r.occurs);
  if (!occurring.length) return { verdict: 'NEVER OCCURS', occurring: 0, eligible: 0 };
  const eligible = occurring.filter((r) => fits(r.span, target) === true);
  if (!eligible.length) return { verdict: target.basis === 'crystal' ? 'NO ELIGIBLE POCKET' : 'ELIGIBILITY UNKNOWN', occurring: occurring.length, eligible: 0 };
  const meeting = eligible.filter((r) => r.size >= target.q25).length;
  const share = meeting / eligible.length;
  const sizes = summarize(eligible.map((r) => r.size));
  const verdict = share >= 0.5 ? (sizes.median > target.q90 ? 'OVERSIZE' : 'MEETS') : target.basis === 'crystal' ? 'BELOW' : 'BELOW PROXY';
  return { verdict, share, meeting, eligible: eligible.length, occurring: occurring.length, sizes };
}

/**
 * Does one run carry the story? YES when an intended protagonist occurs and its largest unflagged
 * crystal reaches its target's lower quartile (basis 'crystal', or 'specimen-proxy' when only a proxy
 * target was reached); POSSIBLE when a protagonist is visible (≥ 1 mm unflagged) but its size target is
 * unknown, or it falls short of a proxy (which overstates the crystal); NO otherwise — dust tells no
 * story, whatever the target.
 *   run: { species: { k: { occurs, size, visible } } }; protagonists: [{ k, target }]
 */
export function runStory(run, protagonists) {
  let proxy = null, possible = false;
  for (const { k, target } of protagonists) {
    const s = run.species[k];
    if (!s?.occurs) continue;
    if (!target || target.basis === 'unknown') { if (s.visible) possible = true; continue; }
    if (s.size >= target.q25) {
      if (target.basis === 'crystal') return { story: 'YES', basis: 'crystal', by: k };
      proxy ??= k;
    } else if (target.basis !== 'crystal' && s.visible) possible = true;
  }
  if (proxy) return { story: 'YES', basis: 'specimen-proxy', by: proxy };
  return { story: possible ? 'POSSIBLE' : 'NO' };
}

/**
 * The scenario's story verdict from its story-scale runs (runs whose pocket is not SMALL for the primary
 * protagonist): yes / yesCrystal = runs carrying the story (any basis / on crystal targets), possible =
 * runs that might (unknown-size protagonists), against the pre-registered story frequency.
 */
export function storyVerdict({ runs, yes, yesCrystal, possible, frequency }) {
  if (!runs) return { verdict: 'SMALL POCKETS ONLY' };
  const rate = yes / runs;
  const ci = wilson(yes, runs);
  if (frequency == null) return { verdict: 'UNRESOLVED', why: 'no story frequency (no protagonist with an engine has an occurrence band)', rate, ci };
  if (rate >= frequency) return { verdict: yesCrystal / runs >= frequency ? 'STORY' : 'STORY (PROXY)', rate, ci };
  if ((yes + possible) / runs >= frequency) return { verdict: 'UNRESOLVED', why: 'visible protagonists whose crystal target is not known (no target, or short of a specimen proxy, which overstates the crystal) could carry it', rate, ci };
  return { verdict: yes ? 'THIN STORY' : 'NO STORY', noise: ci[1] >= frequency, rate, ci };
}

// ------------------------------------------------------------------ 5. sidecar schema

const ROLE_SET = new Set(['primary', 'alternate', 'companion', 'showpiece', 'unsupported']);
const BASIS_SET = new Set(['crystal', 'specimen-proxy', 'unknown']);
/**
 * Validate a target sidecar (proposals/DATA-STORY-POCKET-TARGETS-*.json; its JSON Schema is
 * proposals/SCHEMA-STORY-POCKET-TARGETS.json). Returns the problems found; empty when valid. The
 * scoreboard refuses a sidecar with any.
 */
export function validateSidecar(sc) {
  const bad = [];
  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const band = (b, where) => {
    if (b == null) return;
    if (!Array.isArray(b) || b.length !== 2 || !isNum(b[0]) || !isNum(b[1]) || b[0] < 0 || b[1] > 1 || b[0] > b[1]) bad.push(`${where}: a band is [lo, hi] within 0–1 with lo ≤ hi`);
  };
  if (sc?.schema !== 'vugg-story-pocket-targets-v1') bad.push('schema must be vugg-story-pocket-targets-v1');
  const R = sc?.rules;
  if (!R) bad.push('rules missing');
  else {
    if (!isNum(R.wanted_share) || R.wanted_share <= 0 || R.wanted_share >= 1) bad.push('rules.wanted_share must be in (0, 1)');
    for (const [cls, b] of Object.entries(R.occurrence_bands || {})) band(b, `rules.occurrence_bands.${cls}`);
    if (!Number.isInteger(R.size_min_samples) || R.size_min_samples < 1) bad.push('rules.size_min_samples must be a positive integer');
    if (!Number.isInteger(R.size_high_confidence) || R.size_high_confidence < R.size_min_samples) bad.push('rules.size_high_confidence must be an integer ≥ size_min_samples');
  }
  for (const [scn, s] of Object.entries(sc?.scenarios || {})) {
    if (!s.locality) bad.push(`${scn}: locality missing`);
    const entries = Object.entries(s.species || {});
    const primaries = entries.filter(([, v]) => v.role === 'primary').length;
    if (!s.out_of_scope && primaries !== 1) bad.push(`${scn}: needs exactly one primary protagonist (has ${primaries})`);
    for (const [k, v] of entries) {
      if (!ROLE_SET.has(v.role)) bad.push(`${scn}.${k}: unknown role ${v.role}`);
      band(v.occurrence_band, `${scn}.${k}.occurrence_band`);
      if (v.occurrence_band && !v.band_basis) bad.push(`${scn}.${k}: a band needs its basis`);
      if (!v.size) continue;
      if (!BASIS_SET.has(v.size.basis)) bad.push(`${scn}.${k}: unknown size basis ${v.size.basis}`);
      if (v.size.basis === 'unknown') continue;
      for (const q of ['q10', 'q25', 'median', 'q75', 'q90']) if (!isNum(v.size[q])) bad.push(`${scn}.${k}.size.${q} missing`);
      if (!(v.size.q10 <= v.size.q25 && v.size.q25 <= v.size.median && v.size.median <= v.size.q75 && v.size.q75 <= v.size.q90)) bad.push(`${scn}.${k}: size quantiles out of order`);
      if (!Number.isInteger(v.size.n) || v.size.n < 1) bad.push(`${scn}.${k}: size.n must be a positive integer`);
      if (!v.size.provenance) bad.push(`${scn}.${k}: a size target needs its provenance`);
    }
    if (s.story_frequency != null) {
      if (!isNum(s.story_frequency) || s.story_frequency < 0 || s.story_frequency > 1) bad.push(`${scn}: story_frequency must be within 0–1`);
      if (!s.story_frequency_basis) bad.push(`${scn}: story_frequency needs its basis`);
    }
  }
  return bad;
}
