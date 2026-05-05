"""Vugg simulator version + per-bump engine-drift history.

Extracted verbatim from vugg/__init__.py during PROPOSAL-MODULAR-REFACTOR
Phase A2. The SIM_VERSION constant and the running history comment used to
live inline at the top of vugg.py; this module preserves that history in one
place that doesn't bloat the rest of the package.

Future bumps belong here. The constant is re-exported from vugg/__init__.py
so `from vugg import SIM_VERSION` keeps working.
"""

# ============================================================
# SIM VERSION
# ============================================================
# Monotonic version tag bumped by any change that could shift seed-42
# output for any scenario (chemistry retune, engine change, new mineral,
# new event, new mechanic). Used by the scenario-chemistry audit and
# later by the multi-ring 3D simulation (see PROPOSAL-3D-SIMULATION.md)
# to distinguish v1 (pre-audit) from v2 (post-audit) output streams.
#
#   v1 — pre-audit: generic FluidChemistry defaults, Mg=0 in most scenarios
#   v2 — scenario-chemistry audit (Apr 2026): every scenario anchored to a
#        named locality with cited fluid values; locality_chemistry.json
#        is the data-source-of-truth.
#   v3 — supergene/arsenate expansion (Apr 2026): ferrimolybdite
#        (Pb-absent Mo-oxidation fork), arsenopyrite (Au-trapping primary
#        sulfide), and scorodite (arsenate supergene product with
#        pH-gated dissolution) engines added. Shifts Mo distribution
#        wherever O₂/Fe are available (porphyry, bisbee, supergene), and
#        shifts Au distribution in reducing-As scenarios (arsenopyrite
#        now traps a fraction of Au as invisible-gold trace before
#        native_gold can nucleate).
#   v4 — sulfate expansion round 5 (Apr 2026): seven sulfates added —
#        barite + celestine + jarosite + alunite + brochantite +
#        antlerite + anhydrite. Activated Coorong sabkha celestine +
#        anhydrite immediately; Bingham/Bisbee jarosite/alunite/anhydrite
#        post-event; Bisbee brochantite/antlerite supergene Cu sulfate
#        suite. Engine count 55 → 62. Two gaps documented at the time:
#        Tri-State + Sweetwater O2=0.0 blocked barite + celestine, and
#        Tsumeb pH=6.8 blocked scorodite + jarosite + alunite.
#   v5 — gap-fill follow-ups (Apr 2026): bumps Tri-State + Sweetwater
#        scenarios from O2=0.0 (default — strictly reducing) to O2=0.2
#        (mildly reducing, matching real MVT brine where SO₄²⁻ persists
#        alongside galena's H₂S — the chemistry that makes barite +
#        galena coexistence the diagnostic MVT assemblage). Activates
#        the dormant Ba=20/25 + Sr=15/12 pools in both scenarios.
#        Plus (Tsumeb commit, separate): adds early
#        ev_supergene_acidification event at step 5 + bumps Tsumeb Al
#        3→15, opening a 15-step acid window for scorodite + jarosite +
#        alunite to nucleate before ev_meteoric_flush at step 20
#        carbonate-buffers pH back up.
#   v8 — Round 8 mineral expansion (Apr 2026, COMPLETE): 15 new species
#        across 5 sub-rounds, engine count 69 → 84, tests 842 → 1037.
#        Three new mineral-mechanic patterns added to the sim plus
#        five new chemistry-dispatch patterns.
#
#        Silver suite (8a, 3 species):
#          • acanthite (Ag₂S, monoclinic) — first Ag mineral. Hits
#            seed-42 in mvt/reactive_wall/bisbee.
#          • argentite (Ag₂S, cubic) + 173°C PARAMORPH MECHANIC. First
#            non-destructive polymorph in the sim — argentite crystals
#            cooling past 173°C convert in-place to acanthite while
#            preserving habit + dominant_forms + zones. Module-level
#            PARAMORPH_TRANSITIONS dict + apply_paramorph_transitions
#            hook in run_step. Bisbee shows 5 argentite + 2 paramorphic
#            acanthite-after-argentite at seed-42; porphyry stays >173°C
#            with 8 pure argentite.
#          • native_silver (Ag) — S-DEPLETION GATE engine. Fires only
#            when S<2 AND O2<0.3 (inverse of normal supersaturation).
#            Habit variants include the Kongsberg 30-cm wire.
#
#        Native element trio (8b, 3 species):
#          • native_arsenic (As) — S+Fe overflow gates (S>10 → realgar/
#            arsenopyrite; Fe>50 → arsenopyrite).
#          • native_sulfur (S) — synproportionation Eh-window engine
#            (0.1<O2<0.7), the H₂S/SO₄²⁻ boundary chemistry. First Eh-
#            window engine; pH<5 + Fe+Cu+Pb+Zn<100 base-metal-poverty
#            gates.
#          • native_tellurium (Te) — Au+Ag overflow gates (Au>1 →
#            calaverite; Ag>5 → hessite). Au-Te coupling round now
#            unblocked.
#
#        Ni-Co sulfarsenide cascade (8c, 3 species + Bisbee scenario):
#          • nickeline (NiAs) — high-T Ni arsenide.
#          • millerite (NiS) — capillary brass-yellow needles. Mutual-
#            exclusion gate with nickeline (As>30 + T>200 → 0).
#          • cobaltite (CoAsS) — THREE-ELEMENT GATE engine, the first
#            in the sim (Co + As + S all required simultaneously).
#          • Bisbee scenario chemistry: Co=80 + Ni=70 added (citing
#            Graeme et al. 2019). Activates the supergene erythrite +
#            annabergite cascade at seed-42 (1 + 4 crystals in bisbee,
#            18 + 19 in supergene_oxidation).
#          • Erythrite + annabergite narrators refreshed to surface
#            cobaltite/nickeline/millerite as paragenetic parents.
#
#        VTA suite (8d, 5 species + Tsumeb W chemistry):
#          • descloizite (PbZnVO₄(OH)) + mottramite (PbCu(VO₄)(OH)) —
#            Cu/Zn-RATIO FORK dispatcher (Cu>Zn → mottramite, Zn≥Cu →
#            descloizite). The Tsumeb cherry-red / olive-green pair.
#          • raspite (PbWO₄, monoclinic) + stolzite (PbWO₄, tetragonal)
#            — KINETIC-PREFERENCE DISPATCHER (when both gates clear,
#            stolzite wins ~90% of rolls, reflecting natural ~10:1
#            occurrence ratio). First kinetic-preference engine.
#          • olivenite (Cu₂AsO₄(OH)) — Cu/Zn fork with adamite (the
#            existing Zn arsenate). Adamite engine retrofitted with
#            inverse Cu>Zn gate for symmetric dispatch.
#          • supergene_oxidation scenario: W=20 added (Strunz 1959 —
#            Tsumeb deep oxidation hosts minor scheelite + lead-
#            tungstate suite). Pb thresholds tuned 100→40 to match real
#            supergene fluid concentrations.
#          • Vanadinite + adamite narrators refreshed to surface the
#            descloizite/mottramite + olivenite companions.
#          • Seed-42 hits: bisbee olivenite=10, porphyry olivenite=3,
#            supergene_oxidation stolzite=9 (kinetic winner over
#            raspite) + adamite=1 + vanadinite=5.
#
#        Chalcanthite (8e, 1 species + water-solubility mechanic):
#          • chalcanthite (CuSO₄·5H₂O) — bright blue water-soluble
#            terminal Cu-sulfate phase.
#          • WATER-SOLUBILITY METASTABILITY MECHANIC: per-step hook in
#            run_step re-dissolves chalcanthite when fluid.salinity<4
#            OR fluid.pH>5. When growth<0.5µm, asymptotic decay
#            collapses to full dissolution. Distinct from THERMAL_
#            DECOMPOSITION (high-T destruction) and PARAMORPH_
#            TRANSITIONS (in-place mineral conversion). First re-
#            dissolvable mineral.
#
#        Engine count 69 → 84 (+15). Tests 842 → 1037 (+195).
#   v9 — Round 9 supergene-suite mineral expansion (Apr 2026), shipped
#        in sub-rounds:
#        • 9a: rosasite + aurichalcite + the **broth-ratio branching**
#          mechanic. First mineral pair where the *ratio* of fluid
#          elements (Cu vs Zn for the carbonate pair) — not presence/
#          absence — gates nucleation. Same parent broth, opposite
#          outcome.
#        • 9b: torbernite + zeunerite + the **anion-competition**
#          mechanic. The 3-branch generalization of 9a's 2-branch
#          ratio gate, with three uranyl minerals competing for the
#          same U⁶⁺ cation, differentiated by which anion (PO₄³⁻/
#          AsO₄³⁻/VO₄³⁻) dominates. 9b shipped the P + As branches.
#        • 9c: carnotite + completion of the anion-competition trio.
#          V-branch (canary-yellow Colorado Plateau crusts, K-cation
#          instead of Cu, monoclinic instead of tetragonal). Also
#          widens torbernite + zeunerite supersat denominators from
#          P+As to P+As+V so V-rich fluid properly routes to carnotite.
#          The mechanic now properly 3-way competitive.
#        Both mechanics establish patterns reusable for future
#        ratio-driven pairs/trios. Engine count 84 → 89 (+5 across
#        9a + 9b + 9c). No new FluidChemistry fields. First commits
#        to populate test_cases on data/minerals.json (per
#        proposals/TASK-BRIEF-DATA-AS-TRUTH.md item 6).
#   v10 — Twin bug fix (Apr 2026, Round 9 closeout patch). Pre-fix,
#        each grow_*() function rolled twinning probability per growth
#        step, so a crystal with 30 zones at p=0.1 had ~92% cumulative
#        twinning rate instead of the declared per-roll 10%. Post-fix,
#        the roll happens once at nucleation per declared twin_law in
#        data/minerals.json (VugSimulator._roll_spontaneous_twin).
#        Most existing minerals' realized twin rate drops dramatically —
#        from near-certainty over a typical crystal lifetime down to
#        the spec-declared per-roll probability (typically 1-10%).
#        Quartz Dauphiné (thermal_shock trigger) remains in grow_quartz
#        as event-conditional logic. Cuprite spinel-twin habit branch
#        was removed; spinel-twinned cuprite now carries the default
#        octahedral habit plus the twinned flag. Verified by
#        tools/twin_rate_check.py — all 25 spontaneously-twinned
#        minerals match declared probabilities within ±2σ binomial
#        tolerance at n=2000.
#   v11 — Broth-ratio retrofit (Apr 2026), shipped in pair-by-pair commits
#        per proposals/TASK-BRIEF-RETROFIT-BROTH-RATIO.md:
#        • Pair 1 (malachite/azurite): docstring refresh only — existing
#          CO3-threshold split + paramorph already encode Vink 1986.
#        • Pair 2 (adamite/olivenite): Round 8d strict-comparison Cu/Zn
#          dispatch upgraded to the rosasite/aurichalcite 50%-gate +
#          sweet-spot bonus (0.55-0.85) + pure-element damping (>0.95)
#          + recessive-element trace floor (Cu>=0.5 / Zn>=0.5). Per
#          Hawthorne 1976 + Burns 1995 + Chukanov 2008 (zincolivenite).
#        • Pair 3 (descloizite/mottramite): same retrofit as pair 2.
#          Per Schwartz 1942 + Oyman 2003 + Strunz 1959.
#        • Pair 4 (sphalerite/wurtzite): polymorphism, not solid-solution.
#          Keep T-based gates; add low-T metastable wurtzite branch under
#          pH<4 + sigma>=1 + Fe>=5 per Murowchick & Barnes 1986.
#        Each retrofit is its own commit; baselines regenerated per
#        retrofit. Research artifacts at research/research-broth-ratio-
#        <pair>.md.
#   v12 — Uraninite gatekeeper (May 2026, per research-uraninite.md
#        canonical, boss commit 626bb22):
#        • Oxidative dissolution wired into grow_uraninite (all 3 runtimes,
#          mirroring molybdenite). When sigma<1 + O2>0.3 + grown>3µm,
#          uraninite dissolves and releases UO₂²⁺ (uranyl) back to broth.
#          This makes uraninite the realistic feedstock for the secondary
#          uranium family (torbernite/zeunerite/carnotite/future autunite).
#        • Habit dispatch in grow_uraninite (was always cubic):
#          T>500 → octahedral (pegmatitic); else pitchblende_massive
#          (hydrothermal botryoidal at 200-500, cryptocrystalline below).
#        • supersaturation_uraninite reconciled — pre-existing JS drift
#          (eT-only formula, no O2 gate) replaced with the canonical
#          Python form (reducing + U-gated). All 3 runtimes now identical.
#        • Factual fixes per research: fluorescence flipped to non-
#          fluorescent (ABSENCE of fluorescence is what distinguishes
#          uraninite from its glowing secondaries); T_range tightened
#          200-800 → 150-600.
#        • event_radioactive_pegmatite_oxidizing narration updated —
#          uraninite no longer "endures forever"; it begins to weather
#          when meteoric water arrives (true to the new mechanic + the
#          research's central framing).
#   v13 — Supersat drift audit + sulfide O2-gate fixes (May 2026, per
#        tools/supersat_drift_audit.py). The audit found 11 mineral
#        supersat formulas with structural drift between vugg.py and
#        index.html — most cosmetic, but two are real physics bugs:
#        • galena (JS): pre-v13 had no O2 gate, allowing PbS to form
#          under oxidizing conditions. Now matches Python (O2>1.5
#          returns 0; (1.5-O2) factor in formula).
#        • molybdenite (index.html): same bug class — no O2 gate
#          (agent-api/vugg-agent.js already had the correct version).
#        • chalcopyrite (Python): T window was a flat 1.2/0.6 binary;
#          ported the JS 4-tier formulation (Seo et al. 2012 porphyry
#          window: rare<180, viable 180-300, peak 300-500, fades>500).
#          Richer-canonical per the boss's 2026-04-30 rule.
#        Remaining divergences (effectiveTemperature feature gap +
#        feldspar/fluorite/selenite/smithsonite/wulfenite design
#        divergences) filed in BACKLOG.md.
#   v14 — Round 9d: autunite + cation fork on the P-branch (May 2026,
#        per research/research-uraninite.md §164-178 paragenetic chain).
#        New mineral: autunite Ca(UO₂)₂(PO₄)₂·11H₂O — Ca-cation analog
#        of torbernite. Same parent fluid (U + P + supergene-T +
#        oxidizing) but wins when Ca/(Cu+Ca) > 0.5 — the geological
#        default everywhere except actively-mined Cu districts. The
#        defining feature is fluorescence: Ca²⁺ doesn't quench uranyl
#        emission like Cu²⁺ does, so autunite glows intense apple-green
#        under LW UV while torbernite is dead.
#        Mechanic: cation fork on the P-branch. supersaturation_torbernite
#        gains a Cu/(Cu+Ca) > 0.5 gate (was Cu>=5 only); supersaturation_
#        autunite mirrors with Ca/(Cu+Ca) > 0.5. Both also pass through
#        the existing P/(P+As+V) > 0.5 anion fork. Result: torbernite
#        is now properly geographically rare; autunite picks up the
#        common-groundwater case.
#        Engine count 89 → 90 (+1). Same content gap as 9b/9c (no shipped
#        scenario currently routes U + P at supergene T to fire it,
#        though radioactive_pegmatite + a future Schneeberg-style
#        oxidation event could).
#   v15 — Round 9e: tyuyamunite + uranospinite — Ca-cation analogs of
#        carnotite + zeunerite, completing the cation+anion fork
#        mechanic across all three anion branches (May 2026, per
#        research/research-tyuyamunite.md + research/research-uranospinite.md).
#        Two new minerals shipped together — they share the architectural
#        pattern (Ca-cation, autunite-group fork on a non-P anion):
#        - tyuyamunite Ca(UO₂)₂(VO₄)₂·5-8H₂O — V-branch / Ca-cation,
#          orthorhombic instead of carnotite's monoclinic, weakly
#          fluorescent yellow-green LW (vanadate matrix dampens, but
#          slightly cleaner than carnotite). Type: Tyuya-Muyun, Fergana
#          Valley (Nenadkevich 1912).
#        - uranospinite Ca(UO₂)₂(AsO₄)₂·10H₂O — As-branch / Ca-cation,
#          tetragonal autunite-group, strongly fluorescent yellow-green
#          LW (Ca²⁺ doesn't quench like Cu²⁺ does in zeunerite). Type:
#          Walpurgis Flacher vein, Schneeberg, Saxony (Weisbach 1873).
#        Mechanic: cation forks added to zeunerite + carnotite mirroring
#        torbernite's 9d gate. The full autunite-group cation+anion fork
#        is now complete:
#          P-branch: torbernite (Cu) ↔ autunite (Ca)
#          As-branch: zeunerite (Cu) ↔ uranospinite (Ca)
#          V-branch: carnotite (K) ↔ tyuyamunite (Ca)
#        supersaturation_zeunerite gates on Cu/(Cu+Ca) > 0.5;
#        supersaturation_carnotite gates on K/(K+Ca) > 0.5; the new
#        Ca-cation supersats mirror with Ca/(Cu+Ca) > 0.5 and
#        Ca/(K+Ca) > 0.5 respectively. Each pair preserves the anion
#        fork P/(P+As+V) > 0.5 already in place.
#        Engine count 90 → 92.
#   v16 — Round 9e mechanic-coverage scenarios (May 2026): two new
#        shipped scenarios that finally exercise the autunite-group
#        cation+anion fork end-to-end.
#        • schneeberg (Erzgebirge type locality, Saxony) — 6-event
#          U-pegmatite + arsenopyrite oxidation lifecycle. Fires all
#          four P/As-branch uranyls in a single seed-42 run:
#          torbernite=3, zeunerite=3, autunite=3, uranospinite=4.
#          Plus the v12 uraninite gatekeeper chain (3 uraninite grow
#          then weather, releasing UO₂²⁺ to feed the secondaries).
#        • colorado_plateau (Uravan Mineral Belt, Roc Creek type
#          locality) — 5-event sandstone roll-front lifecycle. Fires
#          the V-branch uranyls: carnotite=4, tyuyamunite=5.
#        Together they fire all 6 secondary U species shipped in
#        Rounds 9b/9c/9d/9e — the cation+anion fork mechanic
#        finally has scenarios that exercise it.
#        No engine changes; engine count remains 92.
#   v17 — Supersat reconciliation v2 (May 2026, post-v13 audit follow-up):
#        Resolved the remaining 5 design-divergent supersats from the
#        v13 audit, plus ported effective_temperature + silica_equilibrium
#        to Python. All decisions research-grounded:
#        • effective_temperature property + silica_equilibrium table
#          ported from JS. Python's chalcopyrite/galena/pyrite/molybdenite/
#          quartz now use eT for Mo-flux porphyry boost. Python's quartz
#          uses Fournier & Potter 1982 / Rimstidt 1997 tabulated solubility
#          (was inline 50*exp(0.008*T) which overshoots ~3x at high T).
#        • feldspar — JS K-or-Na fork removed (albite has its own
#          supersat); both runtimes now K-only with 800°C upper cap
#          (sanidine→melt boundary).
#        • fluorite — both runtimes adopt JS 5-tier T window (Richardson
#          & Holland 1979, MVT deposits 50-152°C) + Python's fluoro-
#          complex penalty (Manning 1979, secondary at T<300°C).
#        • selenite — both runtimes adopt Python's T treatment (decay
#          above 60°C, matches gypsum-anhydrite phase boundary at 55-
#          60°C per Naica/Pulpí studies) + JS's T<40 sweet-spot bonus
#          (Pulpí 20°C). Pre-v17 JS hard cap at 80°C was too lenient.
#        • smithsonite — both runtimes adopt JS pH treatment (hard pH<5
#          cutoff, alkaline boost pH>7) plus tightened T cap to 100°C
#          hard with steep decay above 80°C (research: supergene-only,
#          T 10-50°C optimum). Both pre-v17 T caps too generous.
#        • wulfenite — hybrid: Python's T cap (decay above 80°C, matches
#          research <80°C supergene) + Python's graduated pH penalties
#          (3.5-9.0 window, matches research 6-9) + JS's stricter Pb/Mo
#          thresholds (>=10/>=5, matches research's "rare two-parent
#          mineral" framing). Pre-v17 JS T cap at 250°C was way too
#          lenient.
# v22: Crystal.growth_environment field added. Per-crystal record of
#      whether the cavity was fluid- or air-filled at the moment the
#      crystal nucleated — drives the renderer's c-axis orientation
#      branch (substrate-perpendicular under fluid, gravity-driven
#      under air). Default 'fluid' applied retroactively to every
#      crystal in old saves, so chemistry and growth are byte-identical
#      to v21; the only change is a new optional field threaded through
#      Crystal __init__. Renderer-visible only for any future scenario
#      that sets 'air'; current scenarios all stay perpendicular-to-
#      substrate. Companion: c-axis Gaussian scatter in the wireframe
#      renderer (σ ≈ 12° per geometric-selection literature, σ ≈ 3°
#      for epitaxial overgrowths). See PROPOSAL-WIREFRAME-CRYSTALS
#      addendum + supporting research notes.
# v23: Phase D v2 — mineral-specific orientation preferences in
#      _assign_wall_ring. Most species stay area-weighted (spatially
#      neutral in fluid-filled vugs at depth); ~14 species with
#      documented bias get their preferred-ring weights multiplied by
#      a strength factor. Sources: Sangster 1990 (MVT), Garcia-Ruiz
#      et al. 2007 (Naica selenite), Hanor 2000 (Ba-brine density),
#      Hill & Forti 1997 (cave mineralogy). Floor preferences trace
#      to density-driven micro-cluster settling or supergene fluid
#      pooling (galena, malachite, azurite, barite, celestine,
#      goethite, native_gold, native_silver, smithsonite — all 1.5×
#      weight on floor rings). Selenite gypsum gets 3.0× floor weight
#      (subaqueous Naica-style pool growth). Ceiling: hematite 1.5×
#      ("iron rose" rosettes from convective Fe-transport to cooler
#      ceilings). Wall: stibnite, bismuthinite 1.5× (acicular sprays
#      perpendicular to lateral substrate). Engine drift: scenarios
#      with biased minerals will shift their crystal distribution
#      toward preferred rings; total crystal count and species
#      identity unchanged.
# v24: Water-level mechanic — VugConditions.fluid_surface_ring is the
#      meniscus position (float, 0..ring_count). None → fully submerged
#      (legacy default; existing scenarios stay byte-identical). Below
#      the surface = submerged, the surface band = meniscus, above =
#      vadose. Crystal.growth_environment is now derived at nucleation
#      time from the ring's water_state: submerged/meniscus → 'fluid',
#      vadose → 'air'. With fluid_surface_ring=None the every-ring-
#      submerged default keeps the v23 invariant (all crystals grow
#      'fluid') so chemistry, growth, and visuals are unchanged. A
#      scenario that lowers the surface mid-run starts producing 'air'-
#      stamped crystals in the upper rings — the bridge to PROPOSAL-
#      AIR-MODE.md's stalactite renderer. See PROPOSAL-EVAPORITE-WATER-
#      LEVELS.md.
# v26: Host-rock porosity as a water-level drainage sink. New
#      VugConditions.porosity field (default 0.0 = sealed cavity, no
#      drainage) drives a continuous per-step drift:
#      fluid_surface_ring -= porosity × WATER_LEVEL_DRAIN_RATE.
#      Asymmetric — porosity can only drain; filling stays event-
#      driven (tectonic uplift breaches, aquifer recharge, fresh
#      infiltration). A scenario can now set up slow-drain dynamics:
#      seed fluid_surface_ring at full + porosity > 0, the cavity
#      drains over its step budget, vadose rings get the v25 oxidation
#      override automatically as they transition. Two example events
#      added — event_tectonic_uplift_drains (snaps to 0) and
#      event_aquifer_recharge_floods (snaps back to ceiling) — for
#      scenarios that want sudden filling/draining without porosity
#      drift. Engine drift: zero — default porosity=0 means existing
#      scenarios stay byte-identical.
# v25: Vadose-zone oxidation. When a ring transitions wet → vadose,
#      its ring-fluid is forced to oxidizing chemistry (O2 → max(1.8,
#      current); S × 0.3 to model sulfide-oxidation drawdown of solute
#      sulfur). Submerged rings keep scenario chemistry, so the floor
#      stays reducing while the air-exposed ceiling oxidizes — matches
#      real supergene paragenesis (galena → cerussite, chalcopyrite →
#      malachite/azurite, pyrite → limonite, all in the air zone).
#      Existing oxidation-product engines fire naturally because they
#      already read each crystal's ring fluid via Phase C v1 plumbing.
#      `event_supergene_dry_spell` and `event_bisbee_final_drying` now
#      actually drop fluid_surface_ring (to 8 and 0 respectively); they
#      previously only bumped global O2. Engine drift: bisbee gains
#      vadose-zone Cu-oxidation product growth in upper rings; supergene
#      gains vadose-zone sulfate / arsenate growth. See PROPOSAL-AIR-
#      MODE.md Stage B and PROPOSAL-EVAPORITE-WATER-LEVELS.md.
# v27: Evaporite chemistry plumbing — items 3-5 of PROPOSAL-EVAPORITE-
#      WATER-LEVELS.md. New per-ring fluid concentration multiplier
#      (FluidChemistry.concentration, default 1.0) boosted by 3× at
#      every wet → vadose transition. Models the geological reality
#      that water leaving a ring concentrates the remaining solutes —
#      bathtub-ring deposit chemistry. New WATER_STATE_PREFERENCE
#      table biases evaporite minerals (selenite, anhydrite, halite)
#      toward the meniscus ring at nucleation, matching the field
#      observation that bathtub-ring evaporites cluster at the water
#      line. New halite mineral (NaCl) — cubic supergene/evaporite
#      with the canonical hopper-growth habit when supersaturation is
#      high. supersaturation_halite reads concentration so a
#      partially-drained ring (concentration > 1) reaches halite
#      stability with realistic Na + Cl values. Default
#      concentration=1.0 keeps every existing scenario byte-identical
#      to v26.
# v28: Borax + tincalconite + dehydration paramorph mechanic. Adds
#      Na-B-alkaline borate evaporite (borax, Na₂[B₄O₅(OH)₄]·8H₂O)
#      and its dehydration product (tincalconite, Na₂B₄O₇·5H₂O).
#      New DEHYDRATION_TRANSITIONS framework — environment-triggered
#      paramorph (counterpart to PARAMORPH_TRANSITIONS' temperature
#      trigger). Borax in a vadose ring with concentration ≥ 1.5
#      accumulates dry_exposure_steps; once ≥ 25 steps, the crystal
#      pseudomorphs to tincalconite while preserving its external
#      shape. High T (≥ 75°C) fires immediate dehydration regardless
#      of dryness counter. Engine drift: zero — no existing scenario
#      seeds boron, so borax stays dormant in the v27 baseline. The
#      sabkha_dolomitization scenario could later opt into borax by
#      seeding B in its initial fluid.
# v29: Mirabilite + thenardite — completes the Na-sulfate evaporite
#      pair using the v28 dehydration framework. Mirabilite
#      (Na₂SO₄·10H₂O, "Glauber salt") is the cold-side decahydrate
#      stable below the 32.4°C eutectic; thenardite (Na₂SO₄, anhydrous)
#      is the warm-side product. Both gate on Na + S + concentration ≥
#      1.5 (active evaporation only). Mirabilite → thenardite added to
#      DEHYDRATION_TRANSITIONS with T_max=32.4 — heat path fires the
#      transition the moment a warming brine crosses the line. Slow
#      vadose-exposure path also fires (cold dry caves still lose
#      mirabilite over time). Three-mineral paramorph triplet: borax →
#      tincalconite (humidity-only), mirabilite → thenardite (mostly
#      heat, some humidity), and the existing argentite → acanthite
#      (T-falling) covers the cool-side polymorph case. Engine drift:
#      zero — no scenarios seed both Na + S + cool T + concentration
#      boost simultaneously, so mirabilite/thenardite stay dormant in
#      the v28 baseline.
# v30: Two new evaporite-locality scenarios + concentration mechanic
#      cleanup. Naica geothermal (Cueva de los Cristales, Mexico) per
#      Garcia-Ruiz et al. 2007 — slow geothermal cooling at the 54°C
#      gypsum-anhydrite boundary grows giant selenite blades; mining
#      drainage (1985) + recharge (2017) bookend the production.
#      Searles Lake (San Bernardino Co, CA) per Smith 1979 USGS
#      PP 1043 — Mojave closed-basin alkaline-saline brine with
#      seasonal wet/dry cycling that exercises the full v27-29
#      evaporite suite (halite + borax + mirabilite + thenardite,
#      with full borax → tincalconite + mirabilite → thenardite
#      paramorph cascade). Cleanup: removed concentration decrement
#      from grow_halite / grow_borax / grow_mirabilite / grow_thenardite
#      — concentration is an evaporation-history multiplier, NOT a
#      solute mass account; precipitating solutes don't undo
#      evaporation. Engine drift: bisbee halite max-um shifted
#      slightly from this fix; everything else byte-identical to v29.
SIM_VERSION = 30
