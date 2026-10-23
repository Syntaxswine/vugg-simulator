/**
 * tools/story-pocket-lib.mjs — the pure functions behind the story-pocket targets and scoreboard
 * (proposals/PROPOSAL-STORY-POCKETS-2026-10-21.md, revised 2026-10-22). No I/O: the tools
 * tools/story-pocket-size-evidence.mjs, tools/story-pocket-targets.mjs and tools/showcase-scoreboard.mjs
 * do the reading and writing, and tests-js/story-pocket-scoreboard.test.ts tests these directly.
 *
 * Four parts:
 *   1. Reading sizes out of photograph captions (Mineralienatlas captions, mostly German): which
 *      length is a crystal, a crystal's width, a named aggregate, the whole specimen or the picture's
 *      width; which mineral a crystal statement names or is about; and which photographs show one
 *      specimen.
 *   2. The pre-registered targets: roles from the record and the literature, occurrence bands from the
 *      literature's abundance class, size targets from the photographed crystal lengths.
 *   3. The assessment of a scenario's runs against those targets: occurrence against its band, size
 *      conditional on occurrence and on the pocket holding the crystal, the story run by run and
 *      against the scenario's frequency.
 *   4. How much a scenario's fleet varies: its assemblages, and the species present in every seed.
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
// Dealers' labelled dimensions, "B:57, T:37, H:28mm" (width, depth, height), read as one expression.
const LABELLED = new RegExp(String.raw`\b[BLTHD]\s*[:=]\s*(${NUM})\s*(?:${UNIT})?\s*[,/]\s*[BLTHD]\s*[:=]\s*(${NUM})\s*(?:${UNIT})?(?:\s*[,/]\s*[BLTHD]\s*[:=]\s*(${NUM}))?\s*(${UNIT})`, 'giu');

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
const CUE_ORDER = ['ignore', 'fov', 'width', 'crystal', 'aggregate', 'specimen'];
const NOT_ONE_CRYSTAL = String.raw`(?:gruppe|stufe|aggregat|druse|platte|isation|kugel|rasen|breite|dicke|stärke)`;
const CUES = {
  // Not about the specimen: camera lenses, depth of field, vein widths, mine levels, and the find —
  // "Die Kluft enthält bis zu 20 cm lange …" is the cleft's largest crystal, not this specimen's.
  ignore: new RegExp(String.raw`macro|makro|objektiv|\blens\b|canon|nikon|laowa|tamron|depth of field|deep of field|schärfentiefe|mächtig|teufe|sohle|\blevel\b|(?:kluft|tasche|spalte)\s+(?:enthält|enthielt|lieferte|führte)`, 'giu'),
  // The picture's width or height (field of view).
  fov: new RegExp(String.raw`bildbreite|bildbr\.?|bilbbreite|bildbeite|bildhöhe|bildfeld|bildgr${L}*|bild${L}*ausschnitt${L}*|aus?schnit${L}*|\bbb\b|b-höhe|\bfov\b|field of view|filed of view|largeur d'image|image width|picture width`, 'giu'),
  // A crystal's width or thickness: a lower bound on its length, so not used as one.
  width: new RegExp(String.raw`kristall(?:breite|dicke|stärke)${L}*`, 'giu'),
  // A crystal: "Kristall…" (not a crystal group, druse, aggregate or width), "crystal", "XX", "X =",
  // edge length ("Kantenlänge", "KL"), a form name (cube, octahedron, rhombohedron, doubly
  // terminated, twin).
  // "Krisall" is a typo the captions make; "rhomboedrisch" is the form's adjective.
  crystal: new RegExp(String.raw`[${L}-]*kris(?:t)?all(?!${L}*${NOT_ONE_CRYSTAL})${L}*|crystals?\b|\bxx\b|\bxls?\b|\bx\b(?=\s*[=:.,]?\s*(?:ca\.?\s*)?$)|kantenl${L}*\.?|\bkl\b|[${L}-]*(?:würfel|oktaeder|rhomboed|doppelend|zwilling|quader)${L}*|beryllgröße`, 'giu'),
  // A named aggregate of one species: sphere, rosette, sheaf, tuft, "iron rose", "ball".
  aggregate: new RegExp(String.raw`${L}*(?:aggregat|kugel|rosette|garbe|büschel|eisenrose|kristallisation|rasen)${L}*|\bball\b`, 'giu'),
  // The whole specimen (Stufe), piece, group or matrix.
  specimen: new RegExp(String.raw`größe|grösse|groesse|${L}*stufe${L}*|stück${L}*|stüfchen|dimensions?|(?<!crystal\s)size\b|specimen|maße|gesamt${L}*|gruppe|matrix|platte|höhe|\bbreite\b`, 'giu'),
};
// A size noun used as a predicate ("hat eine Größe von 43 mm", "mit einer Größe von") labels nothing:
// the subject does. Such a cue is skipped for the next one.
const PREDICATE_NOUN = /^(?:größe|grösse|groesse|höhe|breite)$/iu;
const PREDICATE = new RegExp(String.raw`([${L}]+)\s+(?:hat|hatte|besitzt)\s+eine[rn]?\s+(?:größe|grösse|länge|höhe)\s+von\s+(?:(?:etwa|ca\.?|rund|knapp)\s*)?$`, 'iu');
// Captions are cut 30 characters before a length, so a clause can start mid-word: "…stall hat eine
// Größe von etwa 43 mm" is "Kristall".
const FRAGMENT = new RegExp(String.raw`^(?:ristall|istall|stall)(?:e|en|es|s|n)?(?!${L})`, 'iu');
// The same for a rosette cut to "…ette": "ette von cyanblauer Farbe und 16 mm Durchmesser" (cavansite).
const AGG_FRAGMENT = new RegExp(String.raw`^(?:o?s)?etten?(?!${L})`, 'iu');
// Cues right after a length bind tighter than any before it.
const AFTER_IGNORE = /^\s*(?:macro|makro|objektiv|lens\b|f\/\d|mächtig)/iu;
// "45 mm Durchmesser": a diameter, read as a width (of a column or a specimen), not a length — except of a
// tabular crystal ("tafelige Kristalle bis 2 mm Durchmesser") or a rounded aggregate ("Eisenrosen von bis
// zu 19 mm Durchmesser"), whose diameter is its size.
const AFTER_DIAMETER = /^\s*(?:durchmesser|diameter|ø)/iu;
const DIAMETER_IS_SIZE = new RegExp(String.raw`tafel|plättch|tabular|rose|rosette|kugel|sphär|sphere|scheibe|disc|disk|^\s*(?:o?s)?etten?(?!${L})`, 'iu');
const AFTER_FOV = new RegExp(String.raw`^\s*(?:bildbreite|bildbr|bildhöhe|bb\b|breite[rns]?\s+aus|aus?schnitt)`, 'iu');
const AFTER_CRYSTAL = new RegExp(String.raw`^\s*(?:kl\b|kantenl|kristall(?!${L}*${NOT_ONE_CRYSTAL})|crystal\b|(?:hohe|lange|große|grosse)[rns]?\s+kristal(?!${L}*${NOT_ONE_CRYSTAL}))`, 'iu');
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
// A title that names one crystal ("Gips-Kristall", "Calcit-Doppelender", "Bergkristall-Scherbe"):
// the size its next line gives as "Größe" is that crystal's. Not a variety name ("Bergkristall"
// alone, or cut to "…gkristall" at the stretch's start: CUT_COMPOUND), not crystals, a group or a
// specimen on matrix.
const ONE_CRYSTAL_TITLE = new RegExp(String.raw`(?:(?<!berg)kristall|doppelender|einzelkristall|scherbe|schwimmer|floater)s?(?!${L})|^\s*(?:ristall|istall|stall)(?!${L})`, 'iu');
// A stretch cut one to three letters into a compound ending in "kristall" ("gkristall-Gwindel" is
// "Bergkristall-Gwindel"): the compound is unknown, so the fragment names no crystal. Lower case only
// (a whole word such as "Einkristall" starts upper case), hence no "i" flag.
const CUT_COMPOUND = /^\s*[a-zäöüß]{1,3}kristall/u;
// "(Spinell 4 mm)": a single length right after a mineral's name in parentheses is its crystal.
const PAREN_MINERAL = new RegExp(String.raw`\(\s*(${L}{4,})\s*$`, 'u');
const MANY_OR_MATRIX = new RegExp(String.raw`kristalle(?:n)?(?!${L})|\bxx\b|stufe|gruppe|druse|matrix|(?:^|\s)auf(?!${L})`, 'iu');
const SIZE_WORD = /^(?:größe|grösse|groesse|size|dimensions?|maße|\(no cue\))$/iu;
// Words before a mineral that make it an associate, not the subject: "Calcit mit Gyrolith".
const ASSOCIATE = /^(?:mit|auf|neben|sowie|with|on|over|über|unter|and|und)$/iu;

// German (and English) stems of the minerals in the captured sections, to an English name the market
// dictionary classifies (tools/market-title-dictionary.mjs). A stem matches a word that starts with it
// (the longest such stem wins); failing that, a word cut short at the end of a caption stretch (5
// letters or more) that the stems of one mineral alone start with. "=" marks a stem that must be the
// whole word ("Gold", not "goldgelb"; "Kupfer", not "Kupferkies").
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
  ['aquamarin', 'Aquamarine'], ['beryll', 'Beryl'], ['spinell', 'Spinel'], ['spinel', 'Spinel'], ['rubin', 'Ruby'], ['saphir', 'Sapphire'],
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
  ['siderit', 'Siderite'], ['limonit', 'Limonite'], ['ankerit', 'Ankerite'], ['mottramit', 'Mottramite'], ['duftit', 'Duftite'], ['wulfenit', 'Wulfenite'],
  ['dioptas', 'Dioptase'], ['anglesit', 'Anglesite'], ['albit', 'Albite'], ['muskowit', 'Muscovite'], ['lepidolith', 'Lepidolite'],
  ['skolezit', 'Scolecite'], ['mesolith', 'Mesolite'], ['prehnit', 'Prehnite'], ['okenit', 'Okenite'], ['gyrolith', 'Gyrolite'],
  ['konichalcit', 'Conichalcite'], ['tennantit', 'Tennantite'], ['linarit', 'Linarite'], ['=silber', 'Silver'], ['skutterudit', 'Skutterudite'],
  ['zinnober', 'Cinnabar'], ['molybdänit', 'Molybdenite'], ['bornit', 'Bornite'], ['wavellit', 'Wavellite'],
];
const fold = (s) => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const STEMS = MINERAL_STEMS.map(([stem, name]) => ({ exact: stem.startsWith('='), s: fold(stem.replace(/^=/, '')), name }));
/**
 * The mineral a word names (an English name), or null. Hyphenated compounds are read part by part. Only a
 * word cut short at the end of a caption stretch (cut: true) may be read as the start of a stem that one
 * mineral alone has ("Bergkri", "Rauchqu"); a whole word never is ("groß" is not grossular, "Smith" in
 * "Smith Co." not smithsonite).
 */
export function mineralOfWord(word, { cut = false } = {}) {
  for (const part of String(word || '').split('-')) {
    const w = fold(part);
    if (w.length < 3) continue;
    let best = null;
    for (const { exact, s, name } of STEMS) {
      const hit = exact ? w === s || w.startsWith(`${s}kristall`) : w.startsWith(s);
      if (hit && (!best || s.length > best.s.length)) best = { s, name };
    }
    if (best) return best.name;
    if (cut && w.length >= 5) {
      const cut = new Set(STEMS.filter(({ s }) => s.startsWith(w)).map(({ name }) => name));
      if (cut.size === 1) return [...cut][0];
    }
  }
  return null;
}

// The nearest cue that ends within GAP of the end of `before`; a size noun used as a predicate is
// skipped for the next. cutStart: the clause begins the stretch, so its first word may be cut.
function nearestCue(before, cutStart) {
  const found = [];
  for (const kind of CUE_ORDER) for (const m of before.matchAll(CUES[kind])) found.push({ kind, start: m.index, end: m.index + m[0].length, text: m[0] });
  const frag = cutStart ? before.match(FRAGMENT) : null;
  if (frag) found.push({ kind: 'crystal', start: 0, end: frag[0].length, text: frag[0] });
  const aggFrag = cutStart ? before.match(AGG_FRAGMENT) : null;
  if (aggFrag) found.push({ kind: 'aggregate', start: 0, end: aggFrag[0].length, text: aggFrag[0] });
  found.sort((a, b) => b.end - a.end || CUE_ORDER.indexOf(a.kind) - CUE_ORDER.indexOf(b.kind));
  for (const c of found) {
    if (before.length - c.end > GAP) break;
    if (c.kind === 'specimen' && PREDICATE_NOUN.test(c.text) && new RegExp(String.raw`(?:^|[^${L}])eine[mnrs]?\s*$`, 'iu').test(before.slice(0, c.start))) continue;
    return c;
  }
  return null;
}
// The mineral a crystal cue names: the cue's own compound ("Fluoritkristall", "Calcit-XX"), else the
// word right before it ("Galenit Oktaeder", "Cerussit xx") — or, for a pseudomorph ("Malachit nach
// Azurit x", "Malachit psm. Azurit"), the mineral it is made of, not the one whose form it keeps.
const PREV_WORD = new RegExp(String.raw`(${L}{4,})[\s-]?$`, 'u');
const PSEUDOMORPH = new RegExp(String.raw`(${L}{4,})\s+(?:nach|psm\.?|pseudomorph(?:ose)?\s+nach|after)\s+${L}{4,}[\s-]?$`, 'iu');
function cueMineral(before, cue) {
  const own = mineralOfWord(cue.text);
  if (own) return own;
  const head = before.slice(Math.max(0, cue.start - 50), cue.start);
  const psm = head.match(PSEUDOMORPH);
  if (psm) return mineralOfWord(psm[1]);
  const prev = head.match(PREV_WORD);
  return prev ? mineralOfWord(prev[1]) : null;
}
// "<subject> hat eine Größe von …": the subject decides.
function predicateKind(word) {
  const w = word.toLowerCase();
  if (w === 'er') return ['crystal', null];
  if (w === 'sie') return ['specimen', null];
  if (w === 'es') return ['unclassed', null];
  if (/(?:kristall|stall|doppelender|zwilling|szepter|zepter|spitze)$/iu.test(w) || w === 'xx') return ['crystal', mineralOfWord(w)];
  if (NOUN_SPECIMEN.test(w)) return ['specimen', null];
  const min = mineralOfWord(w);
  return min ? ['crystal', min] : null;
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
// The mineral a clause is about: the first it names that is not an associate ("mit Gyrolith",
// "auf Dolomit"). A clause cut at its start may have lost its subject: then unknown.
const WORD = new RegExp(String.raw`[${L}][${L}-]*`, 'gu');
function subjectOf(clause, cutStart) {
  const words = [...String(clause).matchAll(WORD)].map((m) => m[0]);
  for (let i = 0; i < words.length; i++) {
    const name = mineralOfWord(words[i]);
    if (i === 0 && cutStart && !name) return { unknown: true };
    if (!name || (i > 0 && ASSOCIATE.test(words[i - 1]))) continue;
    return { name };
  }
  return null;
}

/**
 * Every length statement in a caption stretch: [{ kind, mm, named, subject, dims, cue, text }], where
 *   kind     'crystal' | 'width' (a crystal's width or thickness) | 'aggregate' | 'specimen' | 'fov'
 *            (the picture's width) | 'unclassed';
 *   mm       the expression's longest dimension; dims its dimensions (≥ 2 of them) in mm, longest first;
 *   named    the mineral a crystal or aggregate statement names itself (an English name, or null);
 *   subject  for an unnamed crystal or aggregate: the mineral its clause (or the title before it) is
 *            about, { name } or { unknown: true }, or null when it names none;
 *   cue      the words that decided; text the expression as written.
 * Lens, vein, mine-level and find ("the cleft held crystals to 20 cm") statements are dropped.
 */
export function parseSizeStatements(raw) {
  const out = [];
  const t = String(raw).replace(LABELLED, (all, a, b, c, u) => `${[a, b, c].filter(Boolean).join(' x ')} ${u}`);
  const cutStart = /^[a-zäöüß]/u.test(t);
  for (const m of t.matchAll(SIZE_EXPR)) {
    const clauses = t.slice(0, m.index).split(';');
    const before = clauses[clauses.length - 1];
    const prevClause = clauses.length > 1 ? clauses[clauses.length - 2] : null;
    const firstClause = clauses.length === 1;
    const after = t.slice(m.index + m[0].length);
    const parts = [...m[0].matchAll(PART)].map((p) => toMm(p[1], p[2] || m[4]));
    const mm = Math.max(...parts);
    if (!(mm > 0)) continue;
    const dims = parts.length >= 2 ? parts.map((x) => +x.toFixed(1)).sort((a, b) => b - a) : null;
    const cue = nearestCue(before, firstClause && cutStart);
    if (cue?.kind === 'ignore' || AFTER_IGNORE.test(after)) continue;
    const adj = after.match(AFTER_ADJ);
    const pred = before.match(PREDICATE);
    const predKind = pred ? predicateKind(pred[1]) : null;
    const paren = dims ? null : before.match(PAREN_MINERAL);
    const parenMineral = paren ? mineralOfWord(paren[1]) : null;
    let kind, named = null, why;
    // "7 cm breit", "3 mm dick": a width or thickness, said of whatever the clause names.
    const predicativeWidth = (adj && !adj[2] && /^(?:breit|dick)$/iu.test(adj[1])) || (AFTER_DIAMETER.test(after) && !DIAMETER_IS_SIZE.test(before));
    if (AFTER_FOV.test(after)) { kind = 'fov'; why = after.match(AFTER_FOV)[0].trim(); }
    else if (predicativeWidth) { kind = 'width'; why = (after.match(AFTER_DIAMETER) ?? adj)[0].trim(); }
    else if (AFTER_CRYSTAL.test(after)) {
      kind = 'crystal'; why = after.match(AFTER_CRYSTAL)[0].trim();
      if (cue?.kind === 'crystal') named = cueMineral(before, cue);
    } else if (predKind) { [kind, named] = predKind; why = pred[0].trim(); }
    else if (adj && adj[2]) {
      // Attributive: the noun after the adjective decides; its gender where the noun is cut off or hidden.
      const [, , ending, comma, noun] = adj;
      const gender = genderOf(ending, before);
      const upTo = UP_TO.test(before);
      const noun_ = comma ? '' : noun;
      const nounCut = { cut: adj[0].length === after.length };
      why = adj[0].trim();
      if (noun_ && (NOUN_PIECE.test(noun_) || NOUN_SPECIMEN.test(noun_))) kind = 'specimen';
      else if (noun_ && NOUN_AGGREGATE.test(noun_)) { kind = 'aggregate'; named = mineralOfWord(noun_, nounCut); }
      else if (noun_ && NOUN_CRYSTAL.test(noun_)) { kind = 'crystal'; named = mineralOfWord(noun_, nounCut); }
      else { kind = gender === 'm' || upTo ? 'crystal' : 'unclassed'; named = noun_ ? mineralOfWord(noun_, nounCut) : null; }
    } else if (parenMineral) {
      kind = 'crystal'; named = parenMineral; why = paren[0].trim();
    } else if (cue) {
      kind = cue.kind; why = cue.text;
      if (kind === 'crystal' || kind === 'aggregate') named = cueMineral(before, cue);
    } else { kind = 'specimen'; why = '(no cue)'; }
    // A picture has a width and a height, not a depth: a size in three dimensions is never the picture's
    // ("Stilbit 40x35x20 mm Ausschnitt" is a detail of a 40 mm specimen).
    if (kind === 'fov' && dims && dims.length >= 3) { kind = 'specimen'; why = `${why} (three dimensions: no picture)`; }
    // A title that names one crystal makes its "Größe" that crystal's — of the mineral the title names,
    // if any; not when the title pairs two minerals ("Elbait-Kristall und Albit").
    const title = prevClause != null && clauses.length === 2 && cutStart ? prevClause.replace(CUT_COMPOUND, '') : prevClause;
    if (title != null && ((kind === 'specimen' && SIZE_WORD.test(why)) || kind === 'unclassed')
      && ONE_CRYSTAL_TITLE.test(title) && !MANY_OR_MATRIX.test(title) && !MANY_OR_MATRIX.test(before)) {
      const words = [...prevClause.matchAll(WORD)].map((x) => x[0]);
      const minerals = words.map((w, i) => ({ name: mineralOfWord(w), associate: i > 0 && ASSOCIATE.test(words[i - 1]) })).filter((x) => x.name);
      if (!minerals.some((x) => x.associate)) {
        kind = 'crystal';
        why = `one crystal: ${prevClause.trim()}`;
        named = minerals[0]?.name ?? named;
      }
    }
    let subject = null;
    if ((kind === 'crystal' || kind === 'aggregate') && !named) {
      subject = subjectOf(before, firstClause && cutStart) ?? (prevClause != null ? subjectOf(prevClause, clauses.length === 2 && cutStart) : null);
    }
    out.push({ kind, mm: +mm.toFixed(3), named, subject, dims, cue: why, text: m[0], series: seriesKey(before, after) });
  }
  return out;
}

/**
 * A statement's wording with its numbers taken out: the last 16 characters of its clause before the
 * length and the first word after it, spaces dropped and digits as "#". One contributor's photographs
 * share it ("Etwa # mm x # mm großer …", "Fluorit-XX max. # mm"); so does a standard field label
 * ("Größe: #") across many contributors, so a series also needs its uploads in one stretch
 * (largestSeries).
 */
export function seriesKey(before, after) {
  // "bis" (up to) comes and goes within one contributor's wording ("XX max." / "XX bis max.").
  const squeeze = (s) => String(s).replace(/(^|\s)bis(?=\s)/giu, '$1').replace(/\s+/g, '').replace(/\d+(?:[.,]\d+)?/g, '#');
  const word = String(after).match(new RegExp(String.raw`^\s*([${L}.]*)`, 'u'))[1];
  return `${squeeze(before).slice(-16)}#${squeeze(word)}`;
}

/**
 * The largest series among a species' crystal lengths: lengths in one wording (seriesKey) whose
 * specimens were uploaded in one stretch, each less than gap seconds after the one before (image ids
 * read as upload times). A run of one wording over weeks or months is likely one contributor's lot or
 * find; a standard caption field or a bare length (isFieldLabel) is everyone's, so only photographs
 * uploaded together (fieldGap) make a series of it. The capture has no uploader names, so the stretch
 * stands in for the contributor.
 *   items: [{ value, key, t }] → { largest, of, template, first, last, rest: [the other values] }, or
 *   null for no items; ties go to the wording first alphabetically, then the earlier stretch
 */
export const SERIES_GAP = 365 * 86400;
// Many contributors' wording: a standard caption field ("Größe: #", "Size #", "Kristallgröße: ca. #": a
// key ending in one of FIELD_LABELS, then an optional ":", "=" or "." and "ca." or "etwa"), or a bare length
// with no words around it (the key "#"). Only photographs uploaded together (fieldGap) make a series of
// one; an unusual wording chains uploads less than gap apart. The targets file registers the list
// (rules.series_field_labels).
export const FIELD_LABELS = ['größe', 'grösse', 'groesse', 'size', 'maße', 'masse', 'abmessungen', 'dimension', 'dimensions'];
const FIELD_LABEL = new RegExp(String.raw`(?:${FIELD_LABELS.join('|')})[:=.]?(?:ca\.?|etwa)?$`, 'iu');
export const isFieldLabel = (key) => String(key) === '#' || FIELD_LABEL.test(String(key).slice(0, String(key).lastIndexOf('#')));
export function largestSeries(items, gap = SERIES_GAP, { fieldGap = gap } = {}) {
  if (!items.length) return null;
  const byKey = {};
  for (const it of items) (byKey[it.key] ||= []).push(it);
  const runs = [];
  for (const [key, list] of Object.entries(byKey)) {
    list.sort((a, b) => a.t - b.t);
    const g = isFieldLabel(key) ? fieldGap : gap;
    let run = [list[0]];
    for (let i = 1; i < list.length; i++) {
      if (list[i].t - list[i - 1].t < g) run.push(list[i]);
      else { runs.push({ key, members: run }); run = [list[i]]; }
    }
    runs.push({ key, members: run });
  }
  runs.sort((a, b) => b.members.length - a.members.length || a.key.localeCompare(b.key) || a.members[0].t - b.members[0].t);
  const top = runs[0];
  const inTop = new Set(top.members);
  return { largest: top.members.length, of: items.length, template: top.key, first: top.members[0].t, last: top.members[top.members.length - 1].t, rest: items.filter((x) => !inTop.has(x)).map((x) => x.value) };
}

/**
 * One specimen's sizes for its lead species: the largest statement of each kind over its caption
 * stretches. A crystal or aggregate statement is set aside when it names another mineral (other) or,
 * naming none, its clause or title is about another mineral (ambiguous). keyOf maps an English
 * mineral name to a species key; same(a, b) says two keys are one mineral (a variety and its
 * species); piece = the lead is a massive or fibrous material sold as pieces (tiger's eye,
 * chrysoprase), whose "crystal" statements describe a piece and so count as specimen dimensions;
 * minSpecimenMm = a specimen length below it is set aside (micro): micromount captions give the crystal
 * or the field as "Größe", and a misread one would pull a specimen proxy below the crystals it bounds.
 */
export function photoSizes(windows, lead, { keyOf = (x) => x, same = (a, b) => a === b, piece = false, minSpecimenMm = 0 } = {}) {
  const best = { crystal: null, aggregate: null, specimen: null, fov: null };
  const bestStatement = {};
  let other = 0, ambiguous = 0, unclassed = 0, widths = 0, micro = 0;
  const used = [];
  for (const w of windows) {
    for (let s of parseSizeStatements(w)) {
      if (s.kind === 'unclassed') { unclassed++; continue; }
      if (s.kind === 'width') { widths++; continue; }
      if (s.kind === 'crystal' || s.kind === 'aggregate') {
        if (s.named && !same(keyOf(s.named), lead)) { other++; continue; }
        if (!s.named && s.subject?.name && !same(keyOf(s.subject.name), lead)) { ambiguous++; continue; }
        if (piece) s = { ...s, kind: 'specimen', cue: `${s.cue} (a piece)` };
      }
      if (s.kind === 'specimen' && s.mm < minSpecimenMm) { micro++; continue; }
      if (best[s.kind] == null || s.mm > best[s.kind]) { best[s.kind] = s.mm; bestStatement[s.kind] = s; }
      used.push(s);
    }
  }
  return { ...best, other, ambiguous, unclassed, widths, micro, statements: used, series: bestStatement.crystal?.series ?? null, specimenSeries: bestStatement.specimen?.series ?? null };
}

/**
 * Which photographs show one specimen. One specimen is often photographed several times: the uploader
 * keeps the caption, or states the same dimensions again in a new one. Two photographs of the same
 * species are joined when they were uploaded together (image ids, which read as upload times in
 * seconds, within UPLOADED_TOGETHER) and either their caption stretches are the same (identical once a
 * word cut at the stretch's start, punctuation and the words "mit", "und", "auf" are dropped) or they
 * state the same multi-dimension length of a crystal, an aggregate or the specimen ("16 mm x 12 mm"). A
 * picture's size identifies no specimen: a caption that states nothing else ("Erythrit, BB 4,5 mm")
 * joins nothing, since a micromounter photographs many specimens at one magnification, and neither
 * does a shared picture size. Uploaded apart, only a measured size joins
 * them: the same length in three dimensions, one of them written with a decimal ("5x5x4,8mm",
 * "15,9 x 10 x 4,7 cm"). Never when their captions name different finds ("Fundort: Grove …" against
 * "Fundort: Blackdene …"), or when each names a mineral the other does not ("mit etwas Limonit"
 * against "mit etwas Hämatit": two specimens of one lot). A round size ("4 x 3 x 2 cm") repeated years
 * apart is more likely two specimens.
 *   photos: [{ id, key, windows, lead? }] → { groups: [{ key, photos: [...] }], joined: { caption, dims },
 *   links: [{ a, b, why, dims }] } — every join, for audit; window: "uploaded together", in seconds
 */
export const UPLOADED_TOGETHER = 1e6;
// A caption stretch's core, for "the same caption": a word cut at the stretch's start, punctuation and
// the linking words "mit", "und", "auf" dropped ("…it, Gyrolith ;" and " mit Gyrolith;" are one).
const captionCore = (w) => String(w).replace(/^[a-zäöüß][\p{L}]*/u, '').replace(/[^\p{L}\d]+/gu, ' ').replace(/(^| )(?:mit|und|auf)(?= |$)/giu, ' ').replace(/\s+/g, ' ').trim();
const FIND = new RegExp(String.raw`(?:fundort|f\.\s?o\.|loc\.?)\s*:?\s*([${L}]{4})`, 'iu');
export function groupSpecimens(photos, { window = UPLOADED_TOGETHER } = {}) {
  const parent = new Map(photos.map((p) => [p.id, p.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const joined = { caption: 0, dims: 0 };
  const links = [];
  const seen = new Map();
  const where = new Map(photos.map((p) => [p.id, (p.windows.join(' ').match(FIND)?.[1] || '').toLowerCase()]));
  const together = (a, b) => Math.abs(Number(a) - Number(b)) < window;
  const sameFind = (a, b) => !where.get(a) || !where.get(b) || where.get(a) === where.get(b);
  // The minerals each photograph's captions name; two photographs that each name one the other does not
  // show different specimens.
  const namedIn = (w) => [...w.matchAll(WORD)].map((m) => mineralOfWord(m[0], { cut: m.index + m[0].length === w.length })).filter(Boolean);
  // The lead mineral counts as named in both: a stretch cut through its name must not set two photographs
  // of it apart.
  const named = new Map(photos.map((p) => [p.id, new Set([...p.windows.flatMap(namedIn), ...(p.lead ? [mineralOfWord(p.lead)] : [])].filter(Boolean))]));
  const sameMinerals = (a, b) => { const A = named.get(a), B = named.get(b); return [...A].every((x) => B.has(x)) || [...B].every((x) => A.has(x)); };
  const compatible = (a, b) => sameFind(a, b) && sameMinerals(a, b);
  const join = (a, b, why, dims) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent.set(rb, ra); joined[why]++; links.push({ a, b, why, dims }); }
  };
  for (const p of photos) {
    const statements = p.windows.flatMap((w) => parseSizeStatements(w));
    const pictureOnly = statements.length > 0 && statements.every((s) => s.kind === 'fov');
    const cap = `caption\u0000${p.key}\u0000${p.windows.map(captionCore).join('\u0000')}`;
    const earlierCap = seen.get(cap) || [];
    const capMatch = pictureOnly ? null : earlierCap.find((id) => together(id, p.id) && compatible(id, p.id));
    if (capMatch != null) join(capMatch, p.id, 'caption', null);
    seen.set(cap, [...earlierCap, p.id]);
    const stated = statements.filter((s) => s.dims && (s.kind === 'crystal' || s.kind === 'aggregate' || s.kind === 'specimen'));
    for (const d of new Set(stated.map((s) => s.dims.join('x')))) {
      const sig = `dims\u0000${p.key}\u0000${d}`;
      const earlier = seen.get(sig) || [];
      const measured = stated.some((s) => s.dims.join('x') === d && s.dims.length >= 3 && /\d[.,]\d/.test(s.text));
      const match = earlier.find((id) => compatible(id, p.id) && (measured || together(id, p.id)));
      if (match != null) join(match, p.id, 'dims', d);
      seen.set(sig, [...earlier, p.id]);
    }
  }
  const groups = new Map();
  for (const p of photos) {
    const r = find(p.id);
    if (!groups.has(r)) groups.set(r, { key: p.key, photos: [] });
    groups.get(r).photos.push(p);
  }
  return { groups: [...groups.values()], joined, links };
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
/** The interquartile range relative to the median: how much a size varies (null without a median). */
export const relativeSpread = (s) => (s?.n && s.median > 0 ? (s.q75 - s.q25) / s.median : null);

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
/** The intended protagonists: the primary and the alternates (never a showpiece or a companion). */
export const protagonistsOf = (species) => Object.entries(species).filter(([, v]) => v.role === 'primary' || v.role === 'alternate').map(([k, v]) => ({ k, target: v.size, engine: !!v.engine }));

/** The occurrence band a literature class pre-registers, or null (unresolved). */
export function bandFor(cls, bands) {
  const b = bands[baseClass(cls)];
  return b ? [b[0], b[1]] : null;
}

/**
 * A size target from a species' photographed sizes: crystal statements when there are enough, else
 * the specimen dimensions as a proxy, else unknown. A specimen is at least as long as its own
 * crystals, so a proxy overstates the crystal: a crystal that reaches it very likely reaches the
 * crystal target; one that falls short of it may not. Confidence for crystal lengths: low below
 * mediumConfidence specimens, medium below highConfidence, high from it — one step lower when more
 * than half of them are one series (largestSeries: one wording, uploaded in one stretch;
 * ev.crystal_series); low for a proxy, whose series (ev.specimen_series) is recorded too.
 */
export function sizeTarget(ev, { minSamples, mediumConfidence = minSamples, highConfidence }) {
  const c = ev?.crystal?.n ?? 0, s = ev?.specimen?.n ?? 0;
  const pick = c >= minSamples ? ['crystal', ev.crystal] : s >= minSamples ? ['specimen-proxy', ev.specimen] : null;
  if (!pick) return { basis: 'unknown', crystal_n: c, specimen_n: s };
  const [basis, d] = pick;
  let confidence = 'low';
  let series = null;
  if (basis === 'crystal') {
    const levels = ['low', 'medium', 'high'];
    let level = d.n >= highConfidence ? 2 : d.n >= mediumConfidence ? 1 : 0;
    series = ev.crystal_series ?? null;
    if (series && series.largest > d.n / 2) level = Math.max(0, level - 1);
    confidence = levels[level];
  } else series = ev.specimen_series ?? null;
  return { basis, n: d.n, q10: d.q10, q25: d.q25, median: d.median, q75: d.q75, q90: d.q90, confidence, crystal_n: c, specimen_n: s, ...(series ? { series } : {}) };
}

// ------------------------------------------------------------------ 4. assessment

/** IN / LOW / HIGH against a band; noise = the Wilson interval (z: rules.noise_z, 1.96 = 95 %) still reaches the band. */
export function assessOccurrence(k, n, band, z = 1.96) {
  const rate = n ? k / n : null;
  if (!band || !n) return { verdict: 'UNRESOLVED', rate, k, n };
  const ci = wilson(k, n, z);
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
 * Size, conditional on occurrence and on the pocket holding the characteristic crystal: over the runs
 * where the species survives in a cavity that fits its median — leaving out any whose crystal is
 * longer than the cavity's span, which the starting cavity cannot hold (`beyond`) — the median
 * largest unflagged crystal against the record:
 *   crystal target  BELOW (< q25), MEETS (q25–q75, around the record's median), LARGE (q75–q90),
 *                   OVERSIZE (> q90);
 *   proxy           BELOW PROXY (< q25: not a verdict, the proxy overstates the crystal), REACHES
 *                   PROXY (q25–q90: oversize cannot be tested against a proxy), OVERSIZE (> q90).
 * A miss is noise when the runs cannot tell their median from the target's window: the Wilson interval
 * (z) of the share of eligible runs on the window's side of its near edge — at least q25 for BELOW; at
 * most q75 for LARGE or OVERSIZE, q90 for a proxy's OVERSIZE — still reaches one half (a sign test).
 * BELOW PROXY is no verdict, so it has no noise.
 * share = eligible runs whose crystal lies in the record's display range, q25–q90.
 *   runs: [{ occurs, size, span }]
 */
export function assessSize(runs, target, z = 1.96) {
  if (!target || target.basis === 'unknown') return { verdict: 'UNKNOWN' };
  const occurring = runs.filter((r) => r.occurs);
  if (!occurring.length) return { verdict: 'NEVER OCCURS', occurring: 0, eligible: 0 };
  const fitting = occurring.filter((r) => fits(r.span, target) === true);
  const beyond = fitting.filter((r) => r.size > r.span).length;
  const eligible = fitting.filter((r) => !(r.size > r.span));
  if (!eligible.length) {
    const verdict = fitting.length ? 'LONGER THAN THE CAVITY' : target.basis === 'crystal' ? 'NO ELIGIBLE POCKET' : 'ELIGIBILITY UNKNOWN';
    return { verdict, occurring: occurring.length, eligible: 0, beyond };
  }
  const inRange = eligible.filter((r) => r.size >= target.q25 && r.size <= target.q90).length;
  const sizes = summarize(eligible.map((r) => r.size));
  const m = sizes.median;
  const verdict = target.basis === 'crystal'
    ? (m < target.q25 ? 'BELOW' : m <= target.q75 ? 'MEETS' : m <= target.q90 ? 'LARGE' : 'OVERSIZE')
    : (m < target.q25 ? 'BELOW PROXY' : m <= target.q90 ? 'REACHES PROXY' : 'OVERSIZE');
  const reaches = (inside) => wilson(eligible.filter((r) => inside(r.size)).length, eligible.length, z)[1] >= 0.5;
  const edge = target.basis === 'crystal' ? target.q75 : target.q90;
  const noise = verdict === 'BELOW' ? reaches((s) => s >= target.q25) : verdict === 'LARGE' || verdict === 'OVERSIZE' ? reaches((s) => s <= edge) : null;
  return { verdict, ...(noise == null ? {} : { noise }), share: inRange / eligible.length, inRange, eligible: eligible.length, occurring: occurring.length, beyond, sizes };
}

/**
 * Does one run carry the story? YES when an intended protagonist occurs with its largest unflagged
 * crystal in its record's display range, q25–q90 (basis 'crystal', or 'specimen-proxy' when only a
 * proxy range was reached). POSSIBLE when a protagonist occurs whose crystal target is not known —
 * no target, or short of a proxy — or whose crystal is longer than the cavity's span, which the
 * starting cavity cannot hold (`beyond`). NO otherwise; `oversize` marks a crystal past q90.
 *   run: { span, species: { k: { occurs, size } } }; protagonists: [{ k, target }]
 */
export function runStory(run, protagonists) {
  let crystal = null, proxy = null, possible = false, oversize = false, beyond = false;
  for (const { k, target } of protagonists) {
    const s = run.species[k];
    if (!s?.occurs) continue;
    if (!target || target.basis === 'unknown') { possible = true; continue; }
    if (run.span != null && s.size > run.span) { beyond = true; possible = true; continue; }
    if (s.size > target.q90) { oversize = true; continue; }
    if (s.size >= target.q25) {
      if (target.basis === 'crystal') crystal ??= k;
      else proxy ??= k;
    } else if (target.basis !== 'crystal') possible = true;
  }
  if (crystal) return { story: 'YES', basis: 'crystal', by: crystal, oversize, beyond };
  if (proxy) return { story: 'YES', basis: 'specimen-proxy', by: proxy, oversize, beyond };
  return { story: possible ? 'POSSIBLE' : 'NO', oversize, beyond };
}

/**
 * A scenario's story, run by run: its intended protagonists (protagonistsOf) in each run's cavity,
 * classed against the primary's characteristic crystal. SMALL pockets leave the count (their stories
 * are reported apart); in an UNCLASSED pocket a run without a story may be a small pocket, so it
 * stays open (`unclassified`) rather than counting against the story.
 *   runs: [{ span, species: { k: { occurs, size } } }]; species: the sidecar's entries for the scenario
 */
export function scoreStory(runs, species) {
  const protagonists = protagonistsOf(species);
  const primary = Object.values(species).find((v) => v.role === 'primary');
  const c = { runs: runs.length, scored: 0, small: 0, small_yes: 0, yes_crystal: 0, yes_proxy: 0, possible: 0, unclassified: 0, oversize: 0, beyond: 0, by: {}, pockets: {} };
  for (const run of runs) {
    const pocket = pocketClass(run.span, primary?.size);
    c.pockets[pocket] = (c.pockets[pocket] || 0) + 1;
    const s = runStory(run, protagonists);
    if (s.oversize) c.oversize++;
    if (s.beyond) c.beyond++;
    if (pocket === 'SMALL') { c.small++; if (s.story === 'YES') c.small_yes++; continue; }
    c.scored++;
    if (s.story === 'YES') { if (s.basis === 'crystal') c.yes_crystal++; else c.yes_proxy++; c.by[s.by] = (c.by[s.by] || 0) + 1; }
    else if (s.story === 'POSSIBLE') c.possible++;
    else if (pocket === 'UNCLASSED') c.unclassified++;
  }
  return c;
}

/**
 * The scenario's story verdict from its counted runs (scoreStory): yes / yesCrystal = runs carrying the
 * story (any basis / on crystal targets); open = runs that might (POSSIBLE, or no story in an
 * unclassed pocket); against the pre-registered story frequency; z for the noise interval. A shortfall
 * is noise when the interval of the runs that carry or could carry the story (yes + open) still reaches
 * the frequency: an open run might have carried it.
 */
export function storyVerdict({ runs, yes, yesCrystal, open, frequency, z = 1.96 }) {
  if (!runs) return { verdict: 'SMALL POCKETS ONLY' };
  const rate = yes / runs;
  const ci = wilson(yes, runs, z);
  if (frequency == null) return { verdict: 'UNRESOLVED', why: 'no story frequency: no protagonist with an engine, an occurrence band and a size target whose display range starts within the cavity can carry a story run', rate, ci };
  if (rate >= frequency) return { verdict: yesCrystal / runs >= frequency ? 'STORY' : 'STORY (PROXY)', rate, ci };
  if ((yes + open) / runs >= frequency) return { verdict: 'UNRESOLVED', why: 'runs whose protagonist has no known crystal target, or whose pocket is unclassed, could carry it', rate, ci };
  return { verdict: yes ? 'THIN STORY' : 'NO STORY', noise: wilson(yes + open, runs, z)[1] >= frequency, rate, ci };
}

/**
 * The expected share of fresh crystals from a record's population that land in the record's display
 * range — between its R-7 quantiles at range[0] and range[1] — when the record holds n crystals:
 * (range[1] − range[0]) × (n − 1) / (n + 1). For q25–q90 that is 0.43 at n = 5, 0.58 at n = 17,
 * approaching 0.65. Exact for a uniform population; for skewed ones such as collectors' sizes
 * (lognormal), within about 0.03 and on the low side (the tests simulate both).
 */
export function displayCoverage(n, range) {
  return n > 1 ? ((range[1] - range[0]) * (n - 1)) / (n + 1) : 0;
}

/**
 * The story frequency a scenario's targets imply: floor × displayCoverage(n) for the protagonist that can
 * carry a story run with the largest such product. A protagonist can carry one when it has an engine, a
 * band and a size target whose display range starts within the cavity's span (room) — the test a run's
 * YES itself needs (q25 ≤ span; by: 'median' is the eligibility test, for comparison). Crystal targets
 * come first: a proxy sets the frequency only where no crystal target can carry a story run, since a
 * proxy's product is a bar and a crystal target's an expected rate. So any protagonist's crystal target
 * displaces every proxy, the primary's too, and a low band or a small record sets a low frequency (an
 * uncommon alternate with five lengths: 0.1 × 0.43 = 0.043).
 * For a crystal target it is the expected story rate of a fleet whose protagonist occurs at its band's
 * floor with crystals drawn from its record's population: with 21 seeds such a fleet falls short about
 * half the time, and the verdict marks a shortfall its interval cannot tell from the frequency "noise".
 * For a specimen proxy it is a bar for STORY (PROXY), the rate at which crystals as large as the
 * photographed specimens would reach the proxy's range — not an expected rate, since the proxy
 * overstates the crystal.
 * The coverage is never cut to the cavity (runs longer than it stay open), but the cavity decides who can
 * carry a story run, so dropping a protagonist whose range starts beyond it can lower the frequency or
 * remove it: `dropped` names them.
 *   protagonists: [{ k, engine, band, target }]; range: rules.display_range; room: the largest span
 *   → null when no protagonist has an engine, a band and a size target; else { frequency (null when the
 *   cavity drops them all), k, floor, coverage, n, basis, dropped: [{ k, from }], passedOver: [k] (proxies
 *   a crystal target set aside) }; ties go to the first
 */
export function storyFrequency(protagonists, range, room = Infinity, { crystalFirst = true, by = 'q25' } = {}) {
  const able = [], dropped = [];
  for (const p of protagonists) {
    if (!p.engine || !p.band || !p.target || p.target.basis === 'unknown') continue;
    const from = by === 'median' ? p.target.median : p.target.q25;
    if (from <= room) able.push(p); else dropped.push({ k: p.k, from });
  }
  if (!able.length && !dropped.length) return null;
  const pool = crystalFirst && able.some((p) => p.target.basis === 'crystal') ? able.filter((p) => p.target.basis === 'crystal') : able;
  let best = null;
  for (const p of pool) {
    const coverage = displayCoverage(p.target.n, range);
    if (!best || p.band[0] * coverage > best.rate) best = { k: p.k, floor: p.band[0], coverage, n: p.target.n, basis: p.target.basis, rate: p.band[0] * coverage };
  }
  const passedOver = able.filter((p) => !pool.includes(p)).map((p) => p.k);
  if (!best) return { frequency: null, dropped, passedOver };
  return { frequency: +best.rate.toFixed(4), k: best.k, floor: best.floor, coverage: +best.coverage.toFixed(4), n: best.n, basis: best.basis, dropped, passedOver };
}
/** storyFrequency over a scenario's sidecar entries: its primary and alternates. */
export const scenarioFrequency = (species, range, room, options) => storyFrequency(Object.entries(species)
  .filter(([, v]) => v.role === 'primary' || v.role === 'alternate')
  .map(([k, v]) => ({ k, engine: !!v.engine, band: v.occurrence_band, target: v.size })), range, room, options);

/**
 * A scenario's verdict from its runs and its targets: NO ENGINE when no protagonist has an engine;
 * otherwise the story verdict (storyVerdict) over the runs scoreStory counts — SMALL POCKETS ONLY when
 * every run's pocket is small — with what leaves it open, and `cannot`: the protagonists with an engine
 * when none of them can carry the story in any run's cavity, whatever grows — those whose display range
 * starts beyond every span (cavity) and those with no size target (evidence) — else null.
 *   runs: [{ span, species: { k: { occurs, size } } }]; species: the sidecar's entries for the scenario;
 *   frequency: its story frequency; z: the noise interval's (rules.noise_z)
 */
export function scenarioVerdict(runs, species, frequency, { z = 1.96 } = {}) {
  const withEngine = protagonistsOf(species).filter((p) => p.engine);
  const c = scoreStory(runs, species);
  const story = storyVerdict({ runs: c.scored, yes: c.yes_crystal + c.yes_proxy, yesCrystal: c.yes_crystal, open: c.possible + c.unclassified, frequency, z });
  const open = [];
  if (frequency == null) open.push('no story frequency');
  if (c.unclassified) open.push('unclassed pocket');
  for (const p of withEngine) {
    const occ = runs.filter((r) => r.species[p.k]?.occurs);
    if (!occ.length) continue;
    if (!p.target || p.target.basis === 'unknown') open.push('no size target');
    else if (p.target.basis !== 'crystal' && occ.some((r) => r.species[p.k].size < p.target.q25 && !(r.span != null && r.species[p.k].size > r.span))) open.push('short of a specimen proxy');
  }
  if (c.beyond) open.push('longer than the cavity');
  const spans = runs.map((r) => r.span).filter((x) => x != null);
  const room = spans.length ? Math.max(...spans) : Infinity;
  const sized = withEngine.filter((p) => p.target && p.target.basis !== 'unknown');
  const cannot = !withEngine.length || sized.some((p) => p.target.q25 <= room) ? null
    : { cavity: sized.map((p) => p.k), evidence: withEngine.filter((p) => !sized.includes(p)).map((p) => p.k) };
  // The noise mark says chance in which runs carry the story could explain the shortfall; where no
  // protagonist with an engine forms in any seed, no run grew one to carry it, so there is no mark.
  const occurs = withEngine.some((p) => runs.some((r) => r.species[p.k]?.occurs));
  return {
    counts: c, verdict: withEngine.length ? story.verdict : 'NO ENGINE', why: story.why ?? null, noise: !!story.noise && occurs,
    rate: story.rate ?? null, ci: story.ci ?? null, open: [...new Set(open)], cannot,
  };
}

/**
 * Can a fleet of `runs` fail this story frequency beyond noise at all? Not when the frequency is at or
 * below the top of the interval for 0 runs: storyVerdict marks even a fleet that never tells the story
 * "noise" there.
 */
export const cannotFailBeyondNoise = (frequency, runs, z = 1.96) => frequency != null && frequency <= wilson(0, runs, z)[1];

/**
 * WP1's whole pre-registered target for a scenario: the story frequency met (STORY or STORY (PROXY));
 * every protagonist with an engine and a band within it (a miss its interval cannot tell from the band
 * counts as within); and every protagonist with an engine at the record's size wherever it occurs in a
 * pocket that can hold it (contract rule 4) — its typical crystal within the record's middle half
 * (MEETS), or reaching its proxy (REACHES PROXY: a proxy cannot test more), a miss its runs cannot tell
 * from that (assessSize's noise) counting as within. Too small fails as too large and oversize do. A
 * protagonist that never occurs is judged by its band alone, and one with no size target has none to
 * meet. Open, not failed: short of a proxy (a proxy cannot refute), or a size this cavity cannot judge
 * (no pocket holds the median, or every eligible crystal is longer than the cavity). Every protagonist
 * is judged, not only those that carry story runs: otherwise one kept below display scale would escape
 * the size test that one grown to it faces.
 *   verdict: the scenario's story verdict; protagonists: [{ k, engine, occurrence: { verdict, noise },
 *   size: { verdict, noise } }] → { met, fails: [...], open: [...] }
 */
export function wp1Target(verdict, protagonists) {
  const fails = [], open = [];
  if (verdict !== 'STORY' && verdict !== 'STORY (PROXY)') fails.push(`story ${verdict}`);
  for (const p of protagonists) {
    if (!p.engine) continue;
    const o = p.occurrence, v = p.size?.verdict;
    if ((o?.verdict === 'LOW' || o?.verdict === 'HIGH') && !o.noise) fails.push(`${p.k} ${o.verdict === 'LOW' ? 'below' : 'above'} its band`);
    if (v === 'MEETS' || v === 'REACHES PROXY' || v === 'NEVER OCCURS' || v === 'UNKNOWN' || p.size?.noise) continue;
    if (v === 'OVERSIZE') fails.push(`${p.k} oversize`);
    else if (v === 'BELOW' || v === 'LARGE') fails.push(`${p.k} ${v === 'BELOW' ? 'below' : 'above'} the record's middle half`);
    else open.push(`${p.k} ${v === 'BELOW PROXY' ? 'short of its proxy' : (v || 'unsized').toLowerCase()}`);
  }
  return { met: !fails.length && !open.length, fails, open };
}
/**
 * WP1's whole target from a scenario's runs: each protagonist's occurrence against its band and its size
 * (assessSize) over the runs, then wp1Target. The scoreboard calls this, so the tests reach its wiring.
 *   runs: [{ span, species: { k: { occurs, size } } }]; species: the sidecar's entries; verdict: the
 *   scenario's story verdict; z: rules.noise_z
 */
export function scenarioWp1(runs, species, verdict, { z = 1.96 } = {}) {
  const protagonists = Object.entries(species).filter(([, v]) => v.role === 'primary' || v.role === 'alternate').map(([k, v]) => {
    const per = runs.map((r) => ({ occurs: !!r.species[k]?.occurs, size: r.species[k]?.size ?? 0, span: r.span }));
    return { k, engine: !!v.engine, occurrence: assessOccurrence(per.filter((x) => x.occurs).length, runs.length, v.occurrence_band, z), size: assessSize(per, v.size, z) };
  });
  return wp1Target(verdict, protagonists);
}

// ------------------------------------------------------------------ 5. how much the fleet varies

/** Distinct assemblages (sets of surviving species) over a scenario's runs, and the commonest one's share. */
export function assemblageVariety(sets) {
  const counts = new Map();
  for (const s of sets) { const key = [...s].sort().join(','); counts.set(key, (counts.get(key) || 0) + 1); }
  return { distinct: counts.size, modal_share: sets.length ? Math.max(...counts.values()) / sets.length : null };
}
/**
 * Species that occur in every seed, against their bands' ceilings: if each occurred at its ceiling,
 * the chance that all of them would show up in every one of their runs. Species of one scenario share
 * its runs and need not be independent, but however they depend on each other, all of them show up in
 * every run no more often than the least likely one does: the bound counts each scenario once, by that
 * species (log10 of the product over scenarios). `independent` multiplies every species: smaller, but
 * only if they are independent.
 *   slots: [{ scenario, ceiling, n }] — one per species that occurred in all n runs
 */
export function everySeedChance(slots) {
  const per = {};
  for (const { scenario, ceiling, n } of slots) {
    const l = n * Math.log10(ceiling);
    per[scenario] = per[scenario] == null ? l : Math.min(per[scenario], l);
  }
  return {
    slots: slots.length,
    scenarios: Object.keys(per).length,
    log10: Object.values(per).reduce((s, l) => s + l, 0),
    independent_log10: slots.reduce((s, { ceiling, n }) => s + n * Math.log10(ceiling), 0),
  };
}

// ------------------------------------------------------------------ 6. sidecar schema

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
    if (!Number.isInteger(R.size_medium_confidence) || R.size_medium_confidence < R.size_min_samples || R.size_medium_confidence > R.size_high_confidence) bad.push('rules.size_medium_confidence must be an integer from size_min_samples to size_high_confidence');
    if (!Array.isArray(R.series_field_labels) || !R.series_field_labels.length || R.series_field_labels.some((x) => typeof x !== 'string' || !x)) bad.push('rules.series_field_labels must be a list of words');
    const ranged = { visible_mm: [0, Infinity, true], specimen_min_mm: [0, Infinity], uploaded_together_s: [0, Infinity, true], series_gap_s: [0, Infinity, true], clutter_limit: [0, 1], star_wanted_share: [0, 1], noise_z: [0, Infinity, true] };
    for (const [key, [lo, hi, open]] of Object.entries(ranged)) if (!isNum(R[key]) || R[key] < lo || (open && R[key] === lo) || R[key] > hi) bad.push(`rules.${key} is missing or out of range`);
    const D = R.display_range;
    if (!Array.isArray(D) || D.length !== 2 || !isNum(D[0]) || !isNum(D[1]) || D[0] < 0 || D[0] >= D[1] || D[1] > 1) bad.push('rules.display_range must be [lo, hi] with 0 ≤ lo < hi ≤ 1');
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
