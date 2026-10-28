/**
 * tools/market-title-dictionary.mjs — the listing-title classifier used by the locality-abundance
 * review (2026-10-21) to turn marketplace listing titles into per-species counts.
 *
 * WHY A TITLE CLASSIFIER: where no published abundance table exists for a locality, the review
 * uses what the market carries as a proxy — a mineral that is common at a mine is common in that
 * mine's listings. One search per locality, then every title is read for the species it names,
 * so the proxy is not biased by which species we thought to search for.
 *
 * ENTRY FORMAT: [id, pattern]. `id` is the simulator's species key (data/minerals.json) when the
 * sim has the species, or `x:<name>` when it does not. `pattern` is a regex body matched
 * case-insensitively with letter boundaries on both sides (hyphen and space count as boundaries),
 * so "chalcopyrite" never counts as pyrite and "bismuthinite" never counts as bismuth.
 *
 * Place names that contain a mineral word are guarded by look-arounds ("Copper Queen Mine" is not
 * native copper, "Sulphur Bank" is not sulphur, "fool's gold" is pyrite, "ruby silver" is
 * proustite/pyrargyrite, "ruby jack" is sphalerite).
 *
 * The SAME text is pasted into the browser page that reads the listings (the export keywords
 * stripped), so this file is the exact classifier that produced the counts.
 */
export const MARKET_TITLE_DICTIONARY = [
  // ---- native elements
  ['native_copper', "native\\s+copper|copper(?!\\s+(?:queen|mine|mines|king|country|world|basin|harbou?r|creek|canyon|mountain|city|belt|cliff|falls|flat|range|hill|ridge|splash|slag|ore|ores|penny|coin|wire|bracelet|ring|plated?|tone|pot|kettle))"],
  ['native_silver', "native\\s+silver|(?<!(?:sterling|ruby|german|coin|plated)\\s)silver(?!\\s+(?:mine|mines|king|city|plated?|tone|wire|bezel|setting|pendant|chain|ring|bell|peak|bow|star|cliff|lake|reef|islet|coin|dollar|spoon|leaf|foil|frame|stand|base))"],
  ['native_gold', "native\\s+gold|(?<!(?:fool'?s|fools|rose|white|yellow|14k|18k|10k|24k)\\s)gold(?!\\s+(?:mine|mines|hill|rush|camp|coin|quarry|district|king|leaf|plated?|tone|filled|bar|foil|flake\\s+jewelry|frame|stand|base|sheen|obsidian|coast|country|creek|road|nugget\\s+pendant|calcite|barite|fluorite|colou?r(?:ed)?|flash|lust(?:er|re)|topaz|rutile|quartz|mica|pyrite|chalcopyrite))"],
  ['native_sulfur', "native\\s+sul(?:ph|f)ur|sul(?:ph|f)ur(?!\\s*bank)"],
  ['native_bismuth', "native\\s+bismuth|bismuth"],
  ['native_arsenic', "native\\s+arsenic|arsenic"],
  ['native_tellurium', "native\\s+tellurium|tellurium"],
  // ---- sulfides, sulfosalts, arsenides, tellurides
  ['pyrite', "pyrites?|fool'?s\\s+gold|fools\\s+gold|iron\\s+pyrites?"],
  ['marcasite', "marcasite"],
  ['chalcopyrite', "chalcopyrite|copper\\s+pyrites?"],
  ['sphalerite', "sphalerite|sphaleite|spalerite|spahalerite|sphalerit|zinc\\s*blende|blende|ruby\\s+(?:jack|zinc|blende)|black\\s*jack|cleiophane|schalenblende"],
  ['wurtzite', "wurtzite"],
  ['galena', "galena|galenite"],
  ['bornite', "bornite"],
  ['chalcocite', "chalcocite"],
  ['covellite', "covellite|covelite"],
  ['enargite', "enargite"],
  ['tetrahedrite', "tetrahedrite|fahlore|fahlerz|freibergite"],
  ['tennantite', "tennantite"],
  ['molybdenite', "molybdenite"],
  ['arsenopyrite', "arsenopyrite|mispickel"],
  ['stibnite', "stibnite|antimonite"],
  ['bismuthinite', "bismuthinite"],
  ['cinnabar', "cinnabar|cinnabarite"],
  ['metacinnabar', "metacinnabar"],
  ['realgar', "realgar"],
  ['pararealgar', "pararealgar"],
  ['orpiment', "orpiment"],
  ['acanthite', "acanthite"],
  ['argentite', "argentite"],
  ['proustite', "proustite|(?:light\\s+)?ruby\\s+silver"],
  ['pyrargyrite', "pyrargyrite|dark\\s+ruby\\s+silver"],
  ['greenockite', "greenockite"],
  ['hawleyite', "hawleyite"],
  ['cobaltite', "cobaltite"],
  ['nickeline', "nickeline|niccolite"],
  ['millerite', "millerite"],
  ['skutterudite', "skutterudite|smaltite|chloanthite"],
  ['safflorite', "safflorite"],
  ['rammelsbergite', "rammelsbergite"],
  ['loellingite', "l(?:oe|ö|o)llingite"],
  ['calaverite', "calaverite"],
  ['sylvanite', "sylvanite"],
  ['hessite', "hessite"],
  ['naumannite', "naumannite"],
  ['clausthalite', "clausthalite"],
  ['awaruite', "awaruite|josephinite"],
  ['x:pyrrhotite', "pyrrhotite|magnetic\\s+pyrites"],
  ['x:siegenite', "siegenite"], ['x:pentagonite', "pentagonite"], ['x:poudretteite', "poudretteite"],
  ['x:pucherite', "pucherite"], ['x:bismutite', "bismutite"], ['x:hummerite', "hummerite"],
  ['x:pintadoite', "pintadoite"], ['x:phenakite', "phena(?:k|c)ite"], ['x:beryllonite', "beryllonite"],
  ['x:pargasite', "pargasite"], ['x:vayrynenite', "v(?:a|ä)yrynenite"], ['x:schneebergite', "schneebergite"],
  ['x:davyne', "davyne"], ['x:koritnigite', "(?:cobalt)?koritnigite"], ['x:kahlerite', "(?:meta)?kahlerite"],
  ['x:krennerite', "krennerite"], ['x:petzite', "petzite"], ['x:coloradoite', "coloradoite"],
  ['x:altaite', "altaite"], ['x:bournonite', "bournonite"], ['x:jamesonite', "jamesonite"],
  ['x:boulangerite', "boulangerite"], ['x:germanite', "germanite"], ['x:renierite', "renierite"],
  ['x:alabandite', "alabandite"], ['x:wittichenite', "wittichenite"], ['x:emplectite', "emplectite"],
  ['x:luzonite', "luzonite"], ['x:polybasite', "polybasite"], ['x:stephanite', "stephanite"],
  ['x:ullmannite', "ullmannite"], ['x:gersdorffite', "gersdorffite"], ['x:famatinite', "famatinite"],
  ['x:stromeyerite', "stromeyerite"], ['x:djurleite', "djurleite"], ['x:digenite', "digenite"],
  // ---- oxides, hydroxides
  ['quartz', "quartz|amethysts?|citrine|smok(?:e)?y(?!\\s+(?:topaz|mountain))|herkimer\\s*(?:diamonds?|💎)|rock\\s+crystal|ametrine|prasiolite|morion|sceptre|scepter|cathedral\\s+quartz|jacare|elestial"],
  ['chalcedony', "chalcedony|agates?|carnelian|sardonyx|onyx|enhydro\\s+agate"],
  ['chrysoprase', "chrysoprase|chrysophrase"],
  ['opal', "opals?|hyalite|opalized"],
  ['hematite', "hematite|haematite|specular(?:ite)?|iron\\s+roses?|eisenrose|kidney\\s+ore|martite"],
  ['magnetite', "magnetite|lodestone"],
  ['goethite', "goethite|g(?:oe|ö)thite"],
  ['x:limonite', "limonite"],
  ['lepidocrocite', "lepidocrocite"],
  ['cuprite', "cuprite|chalcotrichite"],
  ['cassiterite', "cassiterite|tin\\s+stone|tinstone"],
  ['uraninite', "uraninite|pitchblende"],
  ['corundum', "corundum"],
  ['ruby', "rub(?:y|ies)(?!\\s+(?:silver|zinc|jack|blende|red|in\\s+zoisite|sphalerite|calcite|fluorite|zincite|mine))"],
  ['sapphire', "sapphires?"],
  ['rutile', "rutile|rutilated"],
  ['chromite', "chromite"],
  ['pyrolusite', "pyrolusite"],
  ['romanechite', "romanechite|psilomelane"],
  ['todorokite', "todorokite"],
  ['birnessite', "birnessite"],
  ['brucite', "brucite"],
  ['x:spinel', "spinels?(?!\\s*-?\\s*(?:twins?|law|twinned))"], ['x:anatase', "anatase"], ['x:brookite', "brookite"],
  ['x:chrysoberyl', "chrysoberyl|alexandrite"], ['x:columbite', "columbite|tantalite|coltan"],
  ['x:microlite', "microlite"], ['x:manganite', "manganite"], ['x:franklinite', "franklinite"],
  ['x:zincite', "zincite"], ['x:tenorite', "tenorite"], ['x:delafossite', "delafossite"],
  ['x:stottite', "stottite"], ['x:ilmenite', "ilmenite"],
  // ---- halides
  ['fluorite', "fluorites?|fluorspar|flourite|fluotite|fluorit|fluorine\\s+crystal"],
  ['halite', "halite|rock\\s+salt"],
  ['sylvite', "sylvite"],
  ['atacamite', "atacamite"],
  ['x:hanksite', "hanksite"], ['x:sulfohalite', "sul(?:ph|f)ohalite"], ['x:boleite', "boleite"],
  ['x:cumengeite', "cumengeite"], ['x:connellite', "connellite"], ['x:chlorargyrite', "chlorargyrite|cerargyrite|horn\\s+silver"],
  ['x:cryolite', "cryolite"],
  // ---- carbonates
  ['calcite', "calcites?|iceland\\s+spar|dog\\s*-?\\s*tooth(?:\\s+spar)?|nail\\s*-?\\s*head\\s+spar|manganocalcite|cobaltocalcite|spartaite"],
  ['aragonite', "aragonite|flos\\s+ferri|sputnik\\s+aragonite"],
  ['dolomite', "dolomite"],
  ['siderite', "siderite|chalybite"],
  ['rhodochrosite', "rh?odoch?rosite|inca\\s+rose"],
  ['smithsonite', "smithsonite"],
  ['cerussite', "cerussite"],
  ['malachite', "malachite|azur-?\\s*malachite"],
  ['azurite', "azurite|azur-?\\s*malachite|chessylite"],
  ['rosasite', "rosasite"],
  ['aurichalcite', "aurichalcite"],
  ['hydrozincite', "hydrozincite"],
  ['strontianite', "strontianite"],
  ['witherite', "witherite"],
  ['x:magnesite', "magnesite"], ['x:ankerite', "ankerite"], ['x:otavite', "otavite"],
  ['x:alstonite', "alstonite"], ['x:barytocalcite', "barytocalcite"], ['x:trona', "trona(?!\\s*[,.]?\\s*(?:california|ca|calif|san\\s+bernardino|sb|co|county))"],
  ['x:pirssonite', "pirssonite"], ['x:gaylussite', "gaylussite"], ['x:northupite', "northupite"],
  ['x:tychite', "tychite"], ['x:leadhillite_like', "susannite|lanarkite"], ['x:phosgenite', "phosgenite"],
  ['x:hydrocerussite', "hydrocerussite"], ['x:mcguinnessite', "mcguinnessite"],
  // ---- sulfates, chromates, molybdates, tungstates
  ['barite', "barite|baryte|barytes|rose\\s+rocks?"],
  ['celestine', "celestine|celestite|coelestine"],
  ['anhydrite', "anhydrite|angelite"],
  ['selenite', "selenite|gypsum|desert\\s+roses?|satin\\s+spar|sand\\s+roses?|hourglass|ram'?s\\s+horn"],
  ['anglesite', "anglesite"],
  ['brochantite', "brochantite"],
  ['antlerite', "antlerite"],
  ['chalcanthite', "chalcanthite"],
  ['linarite', "linarite"],
  ['caledonite', "caledonite"],
  ['leadhillite', "leadhillite"],
  ['jarosite', "jarosite"],
  ['alunite', "alunite"],
  ['mirabilite', "mirabilite"],
  ['thenardite', "th(?:e|é)nardite"],
  ['wulfenite', "wulfenite"],
  ['powellite', "powellite"],
  ['ferrimolybdite', "ferrimolybdite"],
  ['raspite', "raspite"],
  ['stolzite', "stolzite"],
  ['scheelite', "scheelite"],
  ['wolframite', "wolframite|ferberite|h(?:ue|ü|u)bnerite"],
  ['x:crocoite', "crocoite"], ['x:melanterite', "melanterite"], ['x:epsomite', "epsomite"],
  ['x:burkeite', "burkeite"], ['x:aphthitalite', "aphthitalite|glaserite"], ['x:glauberite', "glauberite"],
  ['x:spangolite', "spangolite"], ['x:serpierite', "serpierite"], ['x:devilline', "devilline"],
  ['x:beudantite', "beudantite"], ['x:plumbojarosite', "plumbojarosite"], ['x:copiapite', "copiapite"],
  // ---- phosphates, arsenates, vanadates
  ['pyromorphite', "pyromorphite"],
  ['mimetite', "mimetite|campylite"],
  ['vanadinite', "vanadinite|endlichite"],
  ['descloizite', "descloizite"],
  ['mottramite', "mottramite"],
  ['adamite', "adamite|cuproadamite|cobaltoadamite"],
  ['olivenite', "olivenite"],
  ['conichalcite', "conichalcite"],
  ['austinite', "austinite"],
  ['duftite', "duftite"],
  ['bayldonite', "bayldonite"],
  ['legrandite', "legrandite"],
  ['koettigite', "k(?:oe|ö|o)ttigite"],
  ['scorodite', "scorodite"],
  ['erythrite', "erythrite|cobalt\\s+bloom"],
  ['annabergite', "annabergite|nickel\\s+bloom"],
  ['pharmacolite', "pharmacolite"],
  ['haidingerite', "haidingerite"],
  ['plumbogummite', "plumbogummite"],
  ['turquoise', "turquoise"],
  ['apatite', "apatite|fluorapatite|fluoroapatite|hydroxyl?apatite"],
  ['autunite', "(?<!meta-?)autunite"],
  ['meta-autunite', "meta-?autunite"],
  ['torbernite', "(?<!meta-?)torbernite"],
  ['metatorbernite', "meta-?torbernite"],
  ['zeunerite', "(?<!meta-?)zeunerite"],
  ['metazeunerite', "meta-?zeunerite"],
  ['uranospinite', "uranospinite"],
  ['carnotite', "carnotite"],
  ['tyuyamunite', "(?<!meta-?)tyuyamunite"],
  ['clinobisvanite', "clinobisvanite"],
  ['x:metatyuyamunite', "meta-?tyuyamunite"], ['x:roselite', "roselite"], ['x:walpurgite', "walpurgite"],
  ['x:mixite', "mixite"], ['x:agardite', "agardite"], ['x:pharmacosiderite', "pharmacosiderite"],
  ['x:lavendulan', "lavendulan"], ['x:tsumebite', "tsumebite"], ['x:leiteite', "leiteite"],
  ['x:ludlockite', "ludlockite"], ['x:tsumcorite', "tsumcorite"], ['x:keyite', "keyite"],
  ['x:carminite', "carminite"], ['x:chalcophyllite', "chalcophyllite"], ['x:clinoclase', "clinoclase"],
  ['x:cornwallite', "cornwallite"], ['x:volborthite', "volborthite"], ['x:hewettite', "hewettite"],
  ['x:montroseite', "montroseite"], ['x:roscoelite', "roscoelite"], ['x:pascoite', "pascoite"],
  ['x:vivianite', "vivianite"], ['x:wavellite', "wavellite"], ['x:variscite', "variscite"],
  ['x:herderite', "herderite"], ['x:amblygonite', "amblygonite|montebrasite"], ['x:brazilianite', "brazilianite"],
  ['x:triphylite', "triphylite"], ['x:monazite', "monazite"], ['x:xenotime', "xenotime"],
  ['x:hopeite', "hopeite"], ['x:parahopeite', "parahopeite"], ['x:veszelyite', "veszelyite"],
  // ---- borates
  ['borax', "borax"],
  ['tincalconite', "tincalconite"],
  ['x:colemanite', "colemanite"], ['x:ulexite', "ulexite"], ['x:kernite', "kernite"],
  ['x:searlesite', "searlesite"], ['x:teepleite', "teepleite"], ['x:hambergite', "hambergite"],
  // ---- silicates
  ['feldspar', "feldspars?|k-?\\s*feldspar|microcline|orthoclase|amazonite|amazonstone|adularia|sanidine|perthite|moonstone"],
  ['albite', "albite|cleavelandite|pericline"],
  ['tourmaline', "tourmalines?|schorl|elbaite|rubellite|indicolite|verdelite|dravite|uvite|liddicoatite"],
  ['beryl', "beryl|goshenite"],
  ['aquamarine', "aquamarines?"],
  ['morganite', "morganite"],
  ['heliodor', "heliodor|golden\\s+beryl"],
  ['emerald', "emeralds?(?!\\s*-?\\s*(?:green|colou?r(?:ed)?))"],
  ['spodumene', "spodumene|kunzite|hiddenite|triphane"],
  ['lepidolite', "lepidolite"],
  ['topaz', "topaz(?:es)?"],
  ['epidote', "epidote"],
  ['titanite', "titanite|sphene"],
  ['actinolite', "actinolite|byssolite"],
  ['tremolite', "tremolite|hexagonite"],
  ['anthophyllite', "anthophyllite"],
  ['amosite', "amosite"],
  ['crocidolite', "crocidolite|riebeckite|blue\\s+asbestos"],
  ['tigers_eye', "tiger'?s?\\s*-?\\s*eyes?|tigereye|hawk'?s?\\s*-?\\s*eyes?|falcon'?s?\\s*-?\\s*eyes?|pietersite"],
  ['x:tiger_iron', "tiger\\s*-?\\s*iron"],
  ['x:jasper', "jasper|jaspilite|jasperoid"],
  ['andalusite', "andalusite|chiastolite|cross\\s*stones?"],
  ['grossular', "grossular(?:ite)?|hessonite|tsavorite|raspberry\\s+garnet|rosolite"],
  ['x:garnet', "(?<!raspberry\\s)garnets?|almandine|spessartine|spessartite|pyrope|andradite|demantoid|uvarovite|rhodolite"],
  ['vesuvianite', "vesuvianite|vesuviante|idocrase|californite"],
  ['diopside', "diopside"],
  ['wollastonite', "wollastonite"],
  ['datolite', "datolite"],
  ['prehnite', "prehnite"],
  ['pectolite', "pectolite|larimar"],
  ['chrysotile', "chrysotile"],
  ['apophyllite', "apophyllite|fluorapophyllite|fluoroapophyllite|hydroxyapophyllite"],
  ['stilbite', "stilbite"],
  ['heulandite', "heulandite"],
  ['scolecite', "scolecite"],
  ['mesolite', "mesolite"],
  ['thomsonite', "thomsonite|thompsonite"],
  ['chabazite', "chabazite"],
  ['hemimorphite', "hemimorphite|calamine"],
  ['willemite', "willemite"],
  ['chrysocolla', "chrysocolla|chrysacolla|chrysocola|chrysacola"],
  ['dioptase', "dioptase"],
  ['shattuckite', "shattuckite"],
  ['uranophane', "uranophane|uranotile"],
  ['coffinite', "coffinite"],
  ['x:muscovite', "muscovite|mica"], ['x:biotite', "biotite"], ['x:phlogopite', "phlogopite"],
  ['x:chlorite', "chlorite|clinochlore|chamosite"], ['x:zircon', "zircons?"], ['x:kyanite', "kyanite"],
  ['x:staurolite', "staurolite"], ['x:sillimanite', "sillimanite"], ['x:euclase', "euclase"],
  ['x:pollucite', "pollucite"], ['x:bertrandite', "bertrandite"], ['x:bavenite', "bavenite"],
  ['x:milarite', "milarite"], ['x:danburite', "danburite"], ['x:axinite', "axinite"],
  ['x:zoisite', "zoisite|tanzanite|thulite"], ['x:clinozoisite', "clinozoisite"],
  ['x:okenite', "okenite"], ['x:gyrolite', "gyrolite"], ['x:cavansite', "cav[ae]n[cs]ite|canvansite"],
  ['x:natrolite', "natrolite"], ['x:laumontite', "laumontite"], ['x:mordenite', "mordenite"],
  ['x:stellerite', "stellerite"], ['x:epistilbite', "epistilbite"], ['x:babingtonite', "babingtonite"],
  ['x:celadonite', "celadonite"], ['x:serpentine', "serpentine|antigorite|lizardite"],
  ['x:olivine', "olivine|peridot|forsterite"], ['x:scapolite', "scapolite"], ['x:painite', "painite"],
  ['x:enstatite', "enstatite"], ['x:chondrodite', "chondrodite"], ['x:rhodonite', "rhodonite"],
  ['x:helvite', "helvine|helvite"], ['x:friedelite', "friedelite"], ['x:inesite', "inesite"],
  ['x:hedenbergite', "hedenbergite"], ['x:ilvaite', "ilvaite"], ['x:benitoite', "benitoite"],
  ['x:neptunite', "neptunite"], ['x:kaolinite', "kaolinite"], ['x:plancheite', "planch(?:e|é)ite"],
  ['x:kinoite', "kinoite"], ['x:ajoite', "ajoite"], ['x:papagoite', "papagoite"],
  ['x:melanophlogite', "melanophlogite"], ['x:hornblende', "hornblende"], ['x:sodalite', "sodalite|hackmanite"],
  ['x:lazurite', "lazurite|lapis"], ['x:nephrite', "nephrite|jade"], ['x:unakite', "unakite"],
  // ---- organic / non-mineral but sold as mineral specimens
  ['x:bitumen', "bitumen|anthraxolite|hydrocarbon|asphaltum|petroleum"],
  ['x:fossil', "fossils?|trilobite|ammonite|petrified|brachiopod|crinoid|coral|dinosaur|shark\\s+tooth"],
];

// Listings that are cut, set or worked — the lapidary trade, not crystal specimens.
export const LAPIDARY_PATTERN = "cabochons?|cabs?|beads?|rings?|pendants?|necklaces?|bracelets?|earrings?|jewelry|jewellery|sterling|925|faceted|carat\\s+loose|loose\\s+gem|carving|carved|fetish|sphere|tumbled|polished\\s+(?:stone|slab|free\\s*form)|slabs?|bookends?|wand|palm\\s+stone|worry\\s+stone|bolo|cuff|brooch|tie\\s+(?:tack|clip)|inlay|knife|watch|lamp";

export function buildMatchers(dict = MARKET_TITLE_DICTIONARY) {
  return dict.map(([id, pat]) => [id, new RegExp(`(?<![a-z])(?:${pat})(?![a-z])`, 'i')]);
}

// eBay glues its "New Listing" badge onto the title text ("New ListingHawk Eye ..."), which would
// hide the first word from the letter-boundary match.
export function cleanTitle(title) {
  return String(title).replace(/^\s*new\s*listing/i, ' ');
}

// One seller relisting the same lot ("Wavellite, Chalcocite, Quartz, Bingham Canyon Mine" ×7) is
// one observation, not seven: titles are grouped into families after dropping digits, units and
// punctuation, and the deduplicated counts use one title per family.
export function titleFamily(title) {
  return cleanTitle(title).toLowerCase()
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-zÀ-ɏ]+/g, ' ')
    .replace(/\b(?:g|gr|gram|grams|kg|lb|lbs|oz|ct|cts|carat|carats|cm|mm|in|inch|inches|x|xl|xls|xtl|xtls|pc|pcs|lot|no|sample)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// All species a title names, in the order they first appear (the first is the "lead" species —
// dealers name the specimen's main mineral first).
export function classifyTitle(rawTitle, matchers) {
  const title = cleanTitle(rawTitle);
  const hits = [];
  for (const [id, re] of matchers) {
    const m = re.exec(title);
    if (m) hits.push([m.index, id]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  const seen = new Set();
  const out = [];
  for (const [, id] of hits) if (!seen.has(id)) { seen.add(id); out.push(id); }
  return out;
}
