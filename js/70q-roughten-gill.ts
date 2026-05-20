// ============================================================
// js/70q-roughten-gill.ts — events for Roughten Gill Mine
// ============================================================
// Caldbeck Fells, Lake District, Cumbria, England. Polymetallic Pb-Cu
// fissure-vein deposit in the Eycott Volcanic Group + Carrock Fell
// Intrusive Complex (granophyre footwall + gabbro hangingwall; common
// derivative-literature error attributes this to the Borrowdale
// Volcanic Group — that's the wrong unit. Eycott Volcanic Group is
// the actual Ordovician basaltic-andesitic-to-rhyolitic host). Worked
// 1700s-1894 for lead + minor copper; dumps reworked for barite
// post-1894; now a classic specimen-collector locality. Documented
// exhaustively in Cooper M.P. & Stanley C.J. (1990) "Minerals of the
// English Lake District: Caldbeck Fells" (Natural History Museum,
// London) — the canonical multi-volume monograph per mine — and in
// the Russell Society three-part review (Bridges et al. 2011 Part 3
// is the modern definitive paper on Roughten Gill specifically).
//
// TYPE LOCALITY for plumbogummite (PbAl3(PO4)2(OH)5·H2O) — first
// described by Hartley 1882 from material collected here.
// Plumbogummite is NOT yet wired in the simulator; flagged as a
// future add-mineral commit. The scenario documents the type-locality
// status in the notes for now.
//
// HEADLINE PARAGENESIS (Cooper & Stanley 1990; see also Symes &
// Young 2008 "Minerals of Northern England" BGS):
//
//   Primary stage (~150°C, sulfide-buffered acidic, reducing) —
//     galena + sphalerite + chalcopyrite + pyrite + tetrahedrite +
//     tennantite + minor argentiferous galena. Quartz gangue.
//
//   Cooling + initial oxidation (~40°C, neutral → acid) —
//     pyrite oxidizes → SO4 + H+, pH crashes to ~4. Sulfide budget
//     consumed. Cu + Pb mobilized into oxidizing fluid.
//
//   Linarite stage (T ~30°C, pH 5-6, CO3:SO4 << 0.3) —
//     PbCu(SO4)(OH)2 deep azure-blue. THE Roughten Gill collector
//     mineral. Carbonate budget still low (no limestone wallrock to
//     buffer; only meteoric CO2 input).
//
//   Caledonite + brochantite stage (T ~30°C, pH ~6, CO3:SO4 0.3-1) —
//     CO3 rises from atmospheric/meteoric source; Pb5Cu2(CO3)(SO4)3
//     (OH)6 caledonite epitactic on linarite. Brochantite
//     Cu4(SO4)(OH)6 fires alongside as Cu sulfate end-member.
//
//   Leadhillite stage (T ~25°C, pH 6.5-7, CO3:SO4 > 1.5) —
//     Cu depletes (consumed by prior Cu-bearing phases); CO3
//     continues rising; Pb4(SO4)(CO3)2(OH)2 leadhillite caps.
//     Cerussite (PbCO3) + pyromorphite (Pb5(PO4)3Cl) + mimetite
//     (Pb5(AsO4)3Cl) round out the late Pb suite.
//
//   Bayldonite + mottramite accessories — Pb-Cu-As + Pb-Cu-V
//     respectively. Mottramite needs V trace (Borrowdale Volcanic
//     wallrock V content ~10-20 ppm leaches in supergene window).
//
// Refs: Cooper & Stanley 1990; Symes & Young 2008; Russell 1925 +
// 1986 various MinMag papers; Goldring 1991 "Cumbria's Underground
// Heritage"; Hartley 1882 (plumbogummite type description).

function event_roughten_gill_primary_lockup(c) {
  // Stage 1 → Stage 2 transition: T drops 130 → 45°C (Lake District
  // primary stage is cooler than Pennine-Yorkshire 150-250°C — BGS
  // fluid-inclusion T 110-130°C per Earthwise compilation; calibrated
  // to the 130 °C upper bound). Primary sulfides lock in (galena +
  // sphalerite + chalcopyrite + pyrite + tetrahedrite/tennantite),
  // S budget consumed by primary phase, Fe sequestered in pyrite.
  // pH neutralizes slightly as sulfide buffering ends. Salinity drops
  // (15-30 wt% NaCl-eq primary brine → meteoric mixing dilutes).
  c.temperature = Math.max(45, c.temperature - 85);
  c.fluid.S = Math.max(40, c.fluid.S * 0.3);
  c.fluid.Fe = Math.max(2.0, c.fluid.Fe * 0.2);
  c.fluid.pH = Math.min(5.5, c.fluid.pH + 0.5);
  c.fluid.O2 = Math.min(0.3, c.fluid.O2 + 0.15);
  c.fluid.salinity = Math.max(1.5, c.fluid.salinity * 0.5);
  c.flow_rate = 0.3;
  return `Primary stage closes: galena + sphalerite + chalcopyrite + pyrite + tetrahedrite + tennantite lock in. T drops to ${c.temperature.toFixed(0)}°C; S consumed (now ${c.fluid.S.toFixed(0)} ppm); pH neutralizes to ${c.fluid.pH.toFixed(1)}. Caldbeck supergene window opens.`;
}

function event_roughten_gill_pyrite_oxidation(c) {
  // Acid mine drainage pulse: residual pyrite oxidizes to SO4 + H+,
  // pH crashes briefly to ~4, Cu mobilized from chalcopyrite +
  // tetrahedrite breakdown. This is when cerussite + anglesite +
  // mimetite + pyromorphite start nucleating on residual galena.
  c.temperature = Math.max(30, c.temperature - 10);
  c.fluid.S = Math.min(200, c.fluid.S + 120);           // SO4 surge from pyrite breakdown
  c.fluid.Cu = Math.min(60, c.fluid.Cu + 30);           // Cu mobilized from chalcopyrite + tetrahedrite
  c.fluid.Pb = Math.min(80, c.fluid.Pb + 15);           // Pb mobilized from galena
  c.fluid.As = Math.min(20, c.fluid.As + 8);            // As(V) from tetrahedrite-tennantite
  c.fluid.O2 = Math.min(1.4, c.fluid.O2 + 1.0);         // full atmospheric oxidation
  c.fluid.pH = Math.max(4.0, c.fluid.pH - 1.5);         // acid pulse
  c.fluid.CO3 = Math.min(15, c.fluid.CO3 + 8);          // meteoric CO2 starts
  c.flow_rate = 0.4;
  return `Pyrite oxidation pulse — AMD-style acid window. T ${c.temperature.toFixed(0)}°C, pH crashes to ${c.fluid.pH.toFixed(1)}, SO4 surges to ${c.fluid.S.toFixed(0)} ppm. Cu (${c.fluid.Cu.toFixed(0)}) + Pb (${c.fluid.Pb.toFixed(0)}) + As (${c.fluid.As.toFixed(0)}) mobilized. Cerussite + anglesite + mimetite begin precipitation.`;
}

function event_roughten_gill_linarite_stage(c) {
  // Linarite window: pH recovers to 5.5-6 (acid neutralized by minor
  // wallrock dissolution + meteoric mixing), CO3 still low. The
  // Pb-Cu-SO4 chemistry hits the linarite gate (CO3:SO4 < 0.3 +
  // pH 4-7 + Pb ≥ 30 + Cu ≥ 10 + S ≥ 50). The defining Roughten
  // Gill specimen aesthetic — deep azure-blue linarite crystals on
  // residual galena. The simulator's v100 linarite engine fires here.
  c.temperature = Math.max(28, c.temperature - 2);
  c.fluid.pH = Math.min(5.8, c.fluid.pH + 1.5);
  c.fluid.O2 = Math.max(0.8, c.fluid.O2 - 0.3);
  c.flow_rate = 0.2;
  return `Linarite window: T ${c.temperature.toFixed(0)}°C, pH ${c.fluid.pH.toFixed(1)}, CO3:SO4 = ${(c.fluid.CO3 / Math.max(c.fluid.S, 1)).toFixed(2)} (sulfate-dominant). PbCu(SO4)(OH)2 nucleates on galena + anglesite — the Roughten Gill azure-blue cabinet aesthetic.`;
}

function event_roughten_gill_caledonite_transition(c) {
  // Caledonite + brochantite window: CO3 rises (continued atmospheric
  // CO2 + minor calcite from background limestone/lime-stained jointing),
  // pH rises to 6.2, CO3:SO4 enters the 0.3-1.0 caledonite sweet spot.
  // Caledonite epitactic on linarite; brochantite as the Cu sulfate
  // end-member firing alongside.
  c.temperature = Math.max(25, c.temperature - 3);
  c.fluid.CO3 = Math.min(60, c.fluid.CO3 + 35);
  c.fluid.Cu = Math.max(25, c.fluid.Cu - 30);          // Cu consumed by linarite + brochantite
  c.fluid.pH = Math.min(6.3, c.fluid.pH + 0.4);
  c.fluid.S = Math.max(60, c.fluid.S - 50);            // SO4 consumed
  c.flow_rate = 0.15;
  return `Caledonite + brochantite window: T ${c.temperature.toFixed(0)}°C, pH ${c.fluid.pH.toFixed(1)}, CO3 rises to ${c.fluid.CO3.toFixed(0)} ppm (CO3:SO4 = ${(c.fluid.CO3 / Math.max(c.fluid.S, 1)).toFixed(2)}). Caledonite epitactic on linarite + brochantite Cu sulfate end-member.`;
}

function event_roughten_gill_leadhillite_cap(c) {
  // Leadhillite + pyromorphite + late Pb-CO3 cap. Cu has been
  // depleted by linarite + brochantite + caledonite consumption,
  // dropping below the leadhillite Cu < 50 gate (already there).
  // CO3:SO4 climbs past 1.5; Pb4(SO4)(CO3)2(OH)2 leadhillite caps
  // as the terminal Pb-Cu-CO3 phase. Pyromorphite + mimetite fire
  // alongside as Pb-PO4 and Pb-AsO4 phases on whatever P + As is left.
  c.temperature = Math.max(22, c.temperature - 3);
  c.fluid.CO3 = Math.min(110, c.fluid.CO3 + 50);
  c.fluid.S = Math.max(40, c.fluid.S - 20);
  c.fluid.Cu = Math.max(8, c.fluid.Cu * 0.3);          // Cu fully depleted now
  c.fluid.pH = Math.min(7.0, c.fluid.pH + 0.5);
  c.flow_rate = 0.05;
  return `Leadhillite cap: T ${c.temperature.toFixed(0)}°C, pH ${c.fluid.pH.toFixed(1)}, CO3:SO4 = ${(c.fluid.CO3 / Math.max(c.fluid.S, 1)).toFixed(2)} (carbonate-dominant). Cu depleted to ${c.fluid.Cu.toFixed(0)} ppm (leadhillite gate Cu<50 clear). Pb4(SO4)(CO3)2(OH)2 + pyromorphite + cerussite cap the Roughten Gill paragenesis.`;
}
