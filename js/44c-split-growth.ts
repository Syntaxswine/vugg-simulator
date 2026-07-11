// ============================================================
// js/44c-split-growth.ts — W-F O5: the SPLITTING ladder (crystal that grew apart)
// ============================================================
// The SPLITTING half of ontogeny rung O5. The masking half shipped (O5a/b/c +
// the masking sceptre, js/44b, SIM 222–224) and DEFERRED this rung to "its own
// state (branching/curvature, not coverage)". Design + science: research-first
// proposal PROPOSAL-O5-SPLITTING-LADDER-2026-07-10.md (two citation-verified
// passes, boss-reviewed §9a — APPROVED FOR S-a).
//
// THE SCIENCE IN ONE NUMBER. Growth splitting is a continuous morphological
// series whose single ordering parameter is CUMULATIVE MISORIENTATION — the sum
// of many small non-crystallographic branching events (Shtukenberg, Punin, Gunn
// & Kahr, "Spherulites," Chem. Rev. 2012, 112(3), 1805–1838). The ladder:
//     none → curved (saddle, Rung 1) → split → sheaf/bowtie → spherulite (Rung 4)
// The sim already PAINTS this ladder as keyword-scored HABIT WORDS (js/07:
// saddle_rhomb / sheaf / spherulitic / radial_spray) and mostly has the render
// primitives (js/99i _makeSaddleRhomb, the hemimorphite fan, rosette sprays) —
// but nothing EARNS a crystal's place on it from growth conditions. This rung
// gives the ladder a driver, exactly as O3 earned the palisade the sim painted.
//
// TWO ROUTES, ONE INDEX — the load-bearing honesty (boss §9a #1: "do not flatten
// A and B into one monotonic 'more σ = more split' law; the opposite-σ gypsum
// fact is load-bearing"). The two routes pull OPPOSITE ways on supersaturation:
//   • A — impurity/additive autodeformation (Shtukenberg–Punin): incorporated
//     mismatch → coherency strain → the lattice bends then splits. IMPURITY is
//     the driver; fires even at LOW σ (Punin & Artamonova 2001: gypsum bending
//     STRENGTHENS at lower supersaturation). Saddle dolomite's low rung lives here.
//   • B — spherulitic crystallisation from HIGH supersaturation / gel (Beck &
//     Andreassen 2010: spherulitic CaCO₃ sets in above SI ≈ 2–3; below → faceted
//     single crystals). Impurity NOT required. The Deccan zeolite sheaves live here.
// Route C (concentric botryoidal / colloform aggregation — malachite, kidney ore)
// is NOT single-crystal splitting and is EXCLUDED (boss §9a #5).
//
// HONESTY CLAUSE (the σ*(φ) discipline, reused). The MICROPHYSICS of branching —
// WHY a lattice splits by small angles — is an OPEN question (the Chem. Rev.
// review says it "is often not addressed"). This rung renders the PHENOMENON and
// its one-index ladder, not a crowned microphysics: a coarse-grained cumulative
// index, the same discipline that let σ*(φ) ship on a threshold-shape without
// choosing between competing branching models.
//
// STAGING (the O3a/O3b · O5a/O5b template — record-unread, then flip):
//   • S-a — THIS FILE ships O5_SPLITTING_ENABLED = false. `_split` is ACCRUED on
//     crystals each growth step (the two-route integral) and the `splitAbility`
//     gate + rung bands EXIST, but NO habit/render path reads `rung`. Byte-
//     identical fleet-wide (0/38): the index is recorded, never read; consumes
//     ZERO shared RNG; touches no fluid / T / zone. tools/o5-split-census.mjs
//     pre-registers the movers + certifies noncollision with the deformation
//     saddle set (boss §9a #4).
//   • S-b — flip the flag TRUE: `rung` drives the habit choice + the existing
//     render params (saddle curvature, sheaf splay, spherulite radial fraction);
//     movers == the S-a census's split set; the deformation-saddle set is left
//     byte-identical (the two-mechanism invariant). SIM bump. First content =
//     extending the existing deccan_zeolite scenario (B-route sheaf→sphere) +
//     a saddle-dolomite scenario (A-route low rung). Calibrate the constants.

// Master switch. S-a ships FALSE (index accrued + recorded, read by NOTHING →
// byte-identical). S-b flips it TRUE in the habit/render consumers. The accrual
// itself is UNCONDITIONAL (the O3a-draw idiom: the writer always runs so the
// census observes a real index; only the CONSUMERS are gated), so this flag is
// defined-but-unread in S-a exactly as GEOMETRIC_SELECTION_ENABLED was in O3a.
let O5_SPLITTING_ENABLED = false;
function setO5SplittingEnabled(v: boolean): void { O5_SPLITTING_ENABLED = !!v; }

// The two route gains + the B-route spherulitic onset σ. PLACEHOLDERS for S-a
// (the index is unread, so their magnitude is cosmetic until S-b). S-b calibrates
// on the sim's own σ scale by the 4a.7 recipe: SPLIT_SIGMA_SPHERULITE is the
// sim-σ image of Beck & Andreassen's SI ≈ 2–3 carbonate onset; SPLIT_K_A/B are
// tuned so a realistic impurity load (A) and a far-from-equilibrium pulse (B)
// each walk a crystal up a rung or two over a full run, not zero and not pinned
// at spherulite instantly. `let` so the S-b calibration sweep rebinds without a
// rebuild (the O3/O5b dial idiom).
let SPLIT_K_A = 1.0;                 // A-route (impurity autodeformation) gain
let SPLIT_K_B = 1.0;                 // B-route (high-σ spherulitic) gain
let SPLIT_SIGMA_SPHERULITE = 2.0;    // B-route onset — sim-σ image of SI ≈ 2–3
function setSplitKA(v: number): void { SPLIT_K_A = +v; }
function setSplitKB(v: number): void { SPLIT_K_B = +v; }
function setSplitSigmaSpherulite(v: number): void { SPLIT_SIGMA_SPHERULITE = +v; }

// ── splitAbility — the structure-specific gate (boss §9a #3: hand-seed for v1) ──
// A per-mineral scalar in [0,1]: how readily this structure grows by splitting.
// Hand-seeded from the literature's "readily splitting" set (carbonates, zeolites,
// fibrous chain/framework silicates, some phosphates HIGH; framework silicates
// ~0), auditable like the fluorescence gates; a structural proxy is named-not-
// built. UNLISTED minerals default to 0 (splitAbilityFor) — the safe byte-
// identical default that honors "don't let O5 eat every radiating thing in the
// cave" (boss §9a #5). Quartz/feldspar carry an EXPLICIT 0 (load-bearing per
// boss §9a #3: "otherwise high σ becomes a nonsense wand") — documented-zero,
// not merely absent, the `_twin_laws_note` convention. Cerussite (snowflake =
// cyclic twinning) and malachite (botryoidal = C aggregation) are EXPLICIT 0 per
// the boss's exclusions (§9a #5).
const SPLIT_ABILITY: Record<string, number> = {
  // ── carbonates — the fleet's core; the calibration anchor class ──
  dolomite: 0.9,        // saddle/baroque dolomite — the A-route low-rung showcase
  aragonite: 0.8,       // flos ferri (Erzberg) — B-route radial
  siderite: 0.8,        // spherulitic / sphaerosiderite — B-route
  calcite: 0.6,         // split calcite; keep < dolomite (less iconic autodeform)
  rhodochrosite: 0.5,   // radial / botryoid interiors are B micro-texture
  magnesite: 0.5,
  smithsonite: 0.4,     // botryoidal crusts are C, but radial interiors split
  strontianite: 0.5,    // radiating acicular sprays
  witherite: 0.4,
  hydrozincite: 0.3,
  // ── sulfates ──
  selenite: 0.9,        // gypsum autodeformation — THE A-route classic (fishtail/ram's-horn)
  barite: 0.5,          // curved barite (Rung 1); the snowball is masking, not this
  celestine: 0.4,
  // ── zeolites + fibrous / chain silicates — the Deccan B-route suite ──
  stilbite: 0.9,        // wheat-sheaf bowties (Rung 3)
  scolecite: 0.9,       // radial sprays
  mesolite: 0.9,        // hair-fine radial sprays
  thomsonite: 0.8,      // radial spheres
  heulandite: 0.6,
  chabazite: 0.3,
  prehnite: 0.8,        // botryoidal-radial spheres (Rung 4)
  pectolite: 0.7,       // radiating acicular ("pectolite spray")
  wollastonite: 0.5,    // fibrous / radiating
  // ── fibrous chain silicates (asbestiform / byssolite) ──
  tremolite: 0.6, actinolite: 0.6, anthophyllite: 0.5,
  chrysotile: 0.5, amosite: 0.5, crocidolite: 0.5,
  // ── phosphates / arsenates — radiating families ──
  erythrite: 0.6,       // radiating_fibrous rosettes
  annabergite: 0.5,     // erythrite sibling
  legrandite: 0.5,      // radiating golden sprays
  pyromorphite: 0.3, mimetite: 0.3,
  // ── hydroxides / oxides — radial fibre (botryoid interiors are B) ──
  goethite: 0.4,        // velvety radial; kidney-ore botryoid macro-form stays C
  millerite: 0.5,       // radiating brass hair
  // ── EXPLICIT ZEROES (documented, load-bearing — not merely absent) ──
  quartz: 0.0,          // framework silica — the gwindel TWIST is a separate mechanism
  feldspar: 0.0, albite: 0.0,   // framework — "high σ must not become a nonsense wand"
  topaz: 0.0, beryl: 0.0, emerald: 0.0, aquamarine: 0.0,   // rigid ring/framework
  fluorite: 0.0,        // isometric — cleaves, does not split-grow
  cerussite: 0.0,       // snowflake = cyclic (110) twinning, NOT splitting (§9a #5)
  malachite: 0.0,       // botryoidal = Class-C aggregation, NOT this rung (§9a #5)
};
function splitAbilityFor(mineral: string): number {
  const v = SPLIT_ABILITY[mineral];
  return typeof v === 'number' ? v : 0;   // unlisted → 0 (safe, byte-identical)
}

// ── impurity_factor mineral hint (boss §9a #2: max of three sources) ──────────
// The A-route needs an impurity signal. v1 draws it from three sources and takes
// the MAX (splitImpurityFactor): (1) the masking half's `_film` φ — wired FIRST,
// it exists and is testable, and ties the two O5 halves (one dusting both masks a
// front AND seeds splitting); (2) a scenario trace proxy (a fluid-load field no
// scenario sets yet — the S-b content hook); (3) this per-mineral hint — the
// INTRINSIC autodeformation propensity a mineral carries with no external film.
// Seeded only where the science names a structural driver: saddle dolomite's
// Mg-excess (Ca-excess dolomite incorporates Mg on the wrong site → the coherency
// strain that bends {104}). Kept minimal; most A-route firing comes from films/
// traces so an unfilmed clean crystal of most species does NOT autodeform.
const SPLIT_IMPURITY_HINT: Record<string, number> = {
  dolomite: 0.3,        // Mg-excess incorporation — the saddle autodeformation seed
};

// The rung bands. PLACEHOLDER cuts for S-a (unread); S-b calibrates them against
// the SPLIT_K_A/B scale so a realistic run distributes crystals sensibly across
// the ladder rather than piling at one rung. Mirrors §4's worked example.
function splitRung(index: number): string {
  if (!(index > 0)) return 'none';
  if (index >= 0.85) return 'spherulite';
  if (index >= 0.55) return 'sheaf';
  if (index >= 0.25) return 'split';
  if (index >= 0.08) return 'curved';   // saddle / bent — Rung 1
  return 'none';
}

// impurity_factor = max(film φ, scenario trace, mineral hint). Pure, DOM-free.
function splitImpurityFactor(crystal: any, conditions: any): number {
  const filmPhi = crystal && crystal._film
    ? Math.max(crystal._film.phi_term || 0, crystal._film.phi_prism || 0) : 0;
  // Scenario trace proxy — a fluid impurity-load field the S-b content hook sets
  // (no fleet scenario sets it yet → 0 today, so this source is dark until S-b).
  const trace = conditions && conditions.wall && typeof conditions.wall.split_trace === 'number'
    ? Math.max(0, Math.min(1, conditions.wall.split_trace)) : 0;
  const hint = (crystal && SPLIT_IMPURITY_HINT[crystal.mineral]) || 0;
  return Math.max(filmPhi, trace, hint);
}

// ── the accrual — the two-route cumulative-misorientation integral ────────────
// Called from the growth loop (js/85) each positive-growth step, right before
// crystal.add_zone. Integrates rateA + rateB over the realized growth increment
// into crystal._split.index, updates the rung + the REQUIRED route provenance
// (boss §9a #1: `_split.route` is not optional narration — a saddle earned by A
// and one reached by B are different records). CONTRACT (the S-a byte-identity
// guarantee): consumes ZERO RNG; reads only the crystal's σ (via its
// supersaturation fn, the js/85 masking-gate pattern) + film/impurity; MUTATES
// ONLY crystal._split. Read by nothing in S-a → the fleet is byte-identical.
//
// Byte-identity of the untouched fleet falls out of the ARITHMETIC, no `if`
// guard: a crystal with splitAbility 0 (quartz, feldspar, everything unlisted),
// OR with impurity 0 AND σ ≤ σ_spherulite*, accrues rate 0 → `_split` is never
// written → serialized output never widens (the `_deformation` idiom). The split
// set is exactly {split-able minerals that are dusted/impure (A) OR far-from-
// equilibrium (B)} — census-bounded, the O4b/O5b certificate pattern.
function accrueSplitIndex(crystal: any, conditions: any, dGrowthUm: number): void {
  if (!crystal || !(dGrowthUm > 0)) return;
  const ability = splitAbilityFor(crystal.mineral);
  if (ability <= 0) return;                       // structure-gate: never splits

  const impurity = splitImpurityFactor(crystal, conditions);

  // σ_local — the crystal's supersaturation for its mineral (the exact source the
  // O5b masking gate reads; S-b may refine to the per-cell C1 σ). Pure calculator;
  // absent fn → 0 (can't measure = can't drive the B route).
  let sig = 0;
  const sfn = conditions && conditions['supersaturation_' + crystal.mineral];
  if (typeof sfn === 'function') {
    try { const v = sfn.call(conditions); if (Number.isFinite(v)) sig = v; } catch (_e) { sig = 0; }
  }

  const rateA = SPLIT_K_A * impurity * ability;                                    // impurity-driven, σ-agnostic
  const rateB = SPLIT_K_B * Math.max(0, sig - SPLIT_SIGMA_SPHERULITE) * ability;   // high-σ spherulitic
  if (rateA <= 0 && rateB <= 0) return;           // nothing accrues → no state churn

  const dGrow = dGrowthUm / 1000;                 // µm → mm, the integral's length scale
  const prev = crystal._split || { index: 0, sumA: 0, sumB: 0 };
  const sumA = (prev.sumA || 0) + rateA * dGrow;
  const sumB = (prev.sumB || 0) + rateB * dGrow;
  const index = Math.max(0, Math.min(1, (prev.index || 0) + (rateA + rateB) * dGrow));
  // route provenance (REQUIRED): which route(s) actually contributed. 'both' when
  // each fired at least once; else the lone route. `dominant` records which
  // supplied more of the accumulation, for S-b narration.
  const route = (sumA > 0 && sumB > 0) ? 'both' : (sumA > 0 ? 'A' : 'B');
  crystal._split = {
    index,
    rung: splitRung(index),
    route,
    dominant: sumA >= sumB ? 'A' : 'B',
    sumA, sumB,
    driver: { sigma: sig, impurity },
  };
}
