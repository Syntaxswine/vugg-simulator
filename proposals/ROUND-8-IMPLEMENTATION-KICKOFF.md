# Round 8 — Implementation Kickoff

**Self-contained implementation reference.** Pick up here after compaction. Every command below is copy-paste-ready. Five sub-rounds, 15 species, designed to ship across multiple sessions or in parallel tabs.

**Context this doc replaces:** if you don't have prior conversation context, read these in order:
1. `proposals/MINERALS-PROPOSAL-ROUND-8A-SILVER.md` — silver suite
2. `proposals/MINERALS-PROPOSAL-ROUND-8B-NATIVE-ELEMENTS.md` — native As / S / Te
3. `proposals/MINERALS-PROPOSAL-ROUND-8C-NICO-SULFARSENIDES.md` — Ni-Co sulfarsenide cascade
4. `proposals/MINERALS-PROPOSAL-ROUND-8D-VTA.md` — vanadate / tungstate / arsenate
5. `proposals/MINERALS-PROPOSAL-ROUND-8E-CHALCANTHITE.md` — water-solubility mechanic

Source-of-truth chemistry/habits/paragenesis for each species is in `research/research-<name>.md` (the 61-file drop the boss pushed in commit `f2939da`).

---

## Pre-flight (5 minutes, every session)

```bash
cd "C:\Users\baals\Local Storage\AI\vugg\vugg-simulator"
git status                                  # expect clean
git log -1 --oneline                        # confirm where you are
python -m pytest --tb=short -q              # expect 842 passed, 7 skipped (or whatever the baseline is at session start)
node tools/sync-spec.js                     # expect no drift
python -c "import vugg; print('SIM:', vugg.SIM_VERSION, 'engines:', len(vugg.MINERAL_ENGINES))"
                                            # expect SIM=7, engines=69 at session start (will grow as Round 8 ships)
```

If any of these don't pass, stop and diagnose — don't start Round 8 work on a broken baseline.

---

## Workflow per sub-round (template)

Each of the 5 sub-rounds follows the same pattern. The command sequence below is a generic template; specific commands are in §1–§5.

```
1. Run tools/new-mineral.py for each species in the sub-round
   → auto-inserts JSON entry + generates tools/_NEW_<name>.md paste guide

2. Open tools/_NEW_<name>.md and follow the paste instructions:
   - Add supersaturation_<name> to VugConditions (Python + JS)
   - Add grow_<name> function (Python + JS)
   - Register in MINERAL_ENGINES dict (Python + JS)
   - Add nucleation block in check_nucleation (Python + JS)
   - Add _narrate_<name> method (Python + JS)
   - Add MINERAL_SPEC_FALLBACK entry in JS
   - Add IDLE_MINERAL_COLORS entry in JS (TWO occurrences in web/index.html)

3. Customize the JSON entry (the scaffold uses generic placeholders):
   - description (cite research/research-<name>.md)
   - habit_variants (replace generic stub with proper variants)
   - color_rules
   - trace_ingredients

4. Apply any sub-round-specific manual edits (see per-section notes below).

5. Mirror web/index.html → docs/index.html
   cp web/index.html docs/index.html

6. Verify
   node tools/sync-spec.js                 # expect no drift
   python -m pytest --tb=line -q           # expect +9-12 new passing tests per species
   node -e "..."                           # JS parse-check (see template above)

7. Commit + push
   git add -A
   git commit -m "Round 8<X>: <species or pair>"
   git push origin main

8. Delete the scaffold paste-guide file
   rm tools/_NEW_<name>.md
```

The scaffold tool auto-mirrors the JSON to `docs/data/minerals.json`, so steps 3 + 5 cover all 4 runtimes.

---

## §1. Round 8a — Silver Suite

**Three species.** Activates dormant Ag pool at MVT/Tri-State/Bisbee/Tsumeb.

```bash
# 8a-1: Acanthite (Ag₂S monoclinic, low-T)
python tools/new-mineral.py \
  --name acanthite --formula "Ag2S" --class sulfide \
  --required "Ag=0.5,S=5" \
  --scenarios mvt,reactive_wall,supergene_oxidation,bisbee \
  --T-range 50,170 --T-optimum 80,150 \
  --redox reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.3 \
  --idle-color "#404040" --narrate

# 8a-2: Argentite (Ag₂S cubic, >173°C — paramorph mechanic)
python tools/new-mineral.py \
  --name argentite --formula "Ag2S" --class sulfide \
  --required "Ag=0.5,S=5" \
  --scenarios radioactive_pegmatite \
  --T-range 173,400 --T-optimum 200,400 \
  --redox reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 3 --growth-rate-mult 0.4 \
  --idle-color "#303030" --narrate

# 8a-3: Native silver (Ag° wires/dendrites, S-depletion gate)
python tools/new-mineral.py \
  --name native_silver --formula "Ag" --class native \
  --required "Ag=1.0" \
  --scenarios bisbee,supergene_oxidation \
  --T-range 50,300 --T-optimum 100,200 \
  --redox strongly_reducing \
  --nucleation-sigma 1.2 \
  --max-size-cm 30 --growth-rate-mult 0.5 \
  --idle-color "#d4d4d4" --narrate
```

### Manual edits specific to Round 8a

After scaffolding all three, before customizing each `_NEW_<name>.md` paste-guide:

1. **Acanthite gates inverted vs argentite.** Add `if self.temperature > 173: return 0` to `supersaturation_acanthite`. Add the inverse `if self.temperature < 173: return 0` (already there from `--T-range 173,400`) to argentite — but the scaffold sets it as `< 173` window-out, so confirm.

2. **Native silver S-depletion gate.** Add to `supersaturation_native_silver`:
   ```python
   if self.fluid.S > 2.0:
       return 0  # Ag → acanthite preferentially when S is around
   ```

3. **The 173°C paramorph hook** (Round 8a's signature mechanic). Add a new module-level function near `THERMAL_DECOMPOSITION`:
   ```python
   PARAMORPH_TRANSITIONS = {
       # mineral_when_hot → (mineral_when_cool, T_threshold_C)
       "argentite": ("acanthite", 173),
   }

   def apply_paramorph_transitions(crystal, T):
       """Convert a crystal in-place when it crosses a paramorph T threshold.
       Preserves crystal.habit + dominant_forms (the visual). Differs from
       THERMAL_DECOMPOSITION which destroys the crystal."""
       if crystal.mineral in PARAMORPH_TRANSITIONS:
           cool_mineral, T_thresh = PARAMORPH_TRANSITIONS[crystal.mineral]
           if T < T_thresh:
               crystal.mineral = cool_mineral
               crystal.note = (crystal.note or "") + " — paramorph from cooled argentite"
   ```
   Hook into `VugSimulator.step()` after grow phase, before nucleation. Mirror to JS.

4. **Library card render** — the 173°C paramorph means a stored `crystal.mineral` may differ from its nucleation mineral. Verify the inventory + library views read `crystal.mineral` at display time (they should — no fix needed, just confirm).

### Round 8a verification

```bash
# After all 3 commits land:
python -m pytest --tb=short -q
# Expect: ~870 passed (was 842 + ~28 new tests)
# Expect: new test_argentite_to_acanthite_paramorph passing in tests/test_paramorph_transitions.py

python tests/gen_baselines.py     # SIM_VERSION should still be 7 here unless 8a closeout bumped it
# Expect: acanthite appears in seed-42 mvt/reactive_wall/bisbee scenarios
# Expect: argentite likely absent_at_seed_42 (no current scenario reaches >173°C with Ag)
# Expect: native_silver appears in tsumeb (and possibly bisbee)
```

---

## §2. Round 8b — Native Element Trio

**Three species.** No chemistry overlap with 8a — can run in parallel tab.

```bash
# 8b-1: Native sulfur (synproportionation Eh window)
python tools/new-mineral.py \
  --name native_sulfur --formula "S" --class native \
  --required "S=100" \
  --scenarios sabkha_dolomitization,supergene_oxidation \
  --T-range 20,119 --T-optimum 50,90 \
  --redox tolerant_both \
  --pH-below 5 \
  --nucleation-sigma 1.0 \
  --max-size-cm 30 --growth-rate-mult 0.4 \
  --idle-color "#f5d030" --narrate

# 8b-2: Native arsenic (S-Fe depletion gate)
python tools/new-mineral.py \
  --name native_arsenic --formula "As" --class native \
  --required "As=5" \
  --scenarios bisbee,supergene_oxidation \
  --T-range 100,350 --T-optimum 150,300 \
  --redox strongly_reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.3 \
  --idle-color "#888888" --narrate

# 8b-3: Native tellurium (telluride-residue gate)
python tools/new-mineral.py \
  --name native_tellurium --formula "Te" --class native \
  --required "Te=0.5" \
  --scenarios porphyry \
  --T-range 100,400 --T-optimum 150,300 \
  --redox reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.3 \
  --idle-color "#b8b8c8" --narrate
```

### Manual edits specific to Round 8b

1. **Native sulfur synproportionation Eh** — middle-Eh-only gate:
   ```python
   # In supersaturation_native_sulfur
   if self.fluid.O2 < 0.1 or self.fluid.O2 > 0.7:
       return 0  # outside H2S/SO4 boundary
   ```

2. **Native arsenic depletion gates:**
   ```python
   # In supersaturation_native_arsenic
   if self.fluid.S > 10.0:
       return 0  # As → realgar/arsenopyrite/orpiment preferentially
   if self.fluid.Fe > 50.0:
       return 0  # As → arsenopyrite preferentially
   ```

3. **Native tellurium metal-telluride gate:**
   ```python
   # In supersaturation_native_tellurium
   if self.fluid.Au > 1.0 or self.fluid.Ag > 5.0 or self.fluid.Hg > 0.5:
       return 0  # Te → metal tellurides preferentially
   ```

4. **Bingham Te bump** — to enable seed-42 hit for native_tellurium, in `scenario_porphyry` (vugg.py + web/index.html), add `Te=0.05` to FluidChemistry initialization. Pre-positions for the future Au-Te coupling round.

5. **Coorong native_sulfur tweak** — the Coorong scenario already has S=2700 + O2=1.5 (saturated). For native_sulfur to fire, either bump O2 down to ~0.5 in an early scenario phase, or rely on the favorable_fluid test path only. Recommended: leave the scenario alone for now; ship native_sulfur as `absent_at_seed_42` with a note.

### Round 8b verification

```bash
python -m pytest --tb=short -q
# Expect: ~895 passed (was ~870 + ~25 new tests)
# Expect: 2 species-specific tests passing (depletion gates, synproportionation)

python tests/gen_baselines.py
# Expect: native_arsenic appears in bisbee or tsumeb seed-42
# Expect: native_tellurium appears in porphyry seed-42 (after Te bump)
# Expect: native_sulfur likely absent_at_seed_42
```

---

## §3. Round 8c — Ni-Co Sulfarsenide Cascade

**Three species.** Requires scenario-tuning (Bisbee Ni + Co bumps) for seed-42 hits.

```bash
# 8c-1: Nickeline (NiAs)
python tools/new-mineral.py \
  --name nickeline --formula "NiAs" --class sulfide \
  --required "Ni=40,As=40" \
  --scenarios bisbee,supergene_oxidation \
  --T-range 200,500 --T-optimum 300,450 \
  --redox reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.3 \
  --idle-color "#d49080" --narrate

# 8c-2: Millerite (NiS, capillary)
python tools/new-mineral.py \
  --name millerite --formula "NiS" --class sulfide \
  --required "Ni=50,S=30" \
  --scenarios bisbee,supergene_oxidation \
  --T-range 100,400 --T-optimum 200,350 \
  --redox reducing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.4 \
  --idle-color "#c8b860" --narrate

# 8c-3: Cobaltite (CoAsS, three-element gate)
python tools/new-mineral.py \
  --name cobaltite --formula "CoAsS" --class sulfide \
  --required "Co=50,As=100,S=50" \
  --scenarios bisbee \
  --T-range 300,600 --T-optimum 400,500 \
  --redox reducing \
  --nucleation-sigma 1.2 \
  --max-size-cm 3 --growth-rate-mult 0.3 \
  --idle-color "#d8d4cc" --narrate
```

### Manual edits specific to Round 8c

1. **Bisbee scenario Ni + Co bumps** — in `scenario_bisbee` (vugg.py + web/index.html):
   ```python
   # Add to FluidChemistry init:
   Co=80,    # was trace; bump for cobaltite + erythrite chain
   Ni=70,    # was 0; activates dormant Ni → nickeline + millerite + annabergite
   ```
   This is what activates the seed-42 chain. **SIM_VERSION bump from 7 → 8 lands in the closeout commit** because Bisbee seed-42 will shift.

2. **Millerite mutual exclusion with nickeline** — when both Ni and As are present, nickeline takes priority (same fluid feeds both, but NiAs is more reduced). Add:
   ```python
   # In supersaturation_millerite
   if self.fluid.As > 30.0 and self.temperature > 200:
       return 0  # nickeline takes priority in As-bearing fluid
   ```

3. **Refresh existing narrators** — after 8c-3 lands:
   - `_narrate_erythrite` — add a paragraph naming cobaltite as the primary Co source
   - `_narrate_annabergite` — add a paragraph naming nickeline as the primary Ni source

4. **Document `intentionally_zero` Co/Ni** for scenarios that correctly DON'T have these elements — MVT, Cruzeiro, gem_pegmatite, marble_contact_metamorphism. Add to `data/locality_chemistry.json`.

### Round 8c verification

```bash
python -m pytest --tb=short -q
# Expect: ~925 passed (was ~895 + ~30 new tests)
# Expect: test_cobaltite_requires_all_three passing
# Expect: test_bisbee_full_nico_chain passing (cobaltite + nickeline + erythrite + annabergite)

python tests/gen_baselines.py    # SIM_VERSION 7 → 8 here
# Expect: full Bisbee primary→supergene chain visible
```

---

## §4. Round 8d — VTA Suite

**Five species.** Heaviest sub-round. Three pairing patterns.

```bash
# 8d-1a: Descloizite (PbZnVO4(OH))
python tools/new-mineral.py \
  --name descloizite --formula "PbZnVO4(OH)" --class phosphate \
  --required "Pb=100,Zn=50,V=10" \
  --scenarios supergene_oxidation \
  --T-range 20,80 --T-optimum 30,50 \
  --redox oxidizing \
  --nucleation-sigma 1.0 \
  --max-size-cm 3 --growth-rate-mult 0.3 \
  --idle-color "#8a3020" --narrate

# 8d-1b: Mottramite (PbCu(VO4)(OH))
python tools/new-mineral.py \
  --name mottramite --formula "PbCu(VO4)(OH)" --class phosphate \
  --required "Pb=100,Cu=50,V=10" \
  --scenarios supergene_oxidation \
  --T-range 20,80 --T-optimum 30,50 \
  --redox oxidizing \
  --nucleation-sigma 1.0 \
  --max-size-cm 3 --growth-rate-mult 0.3 \
  --idle-color "#8a9a40" --narrate

# 8d-2a: Raspite (PbWO4 monoclinic, rare)
python tools/new-mineral.py \
  --name raspite --formula "PbWO4" --class molybdate \
  --required "Pb=100,W=5" \
  --scenarios supergene_oxidation,bisbee \
  --T-range 10,50 --T-optimum 20,40 \
  --redox oxidizing \
  --nucleation-sigma 1.4 \
  --max-size-cm 1 --growth-rate-mult 0.2 \
  --idle-color "#d4b840" --narrate

# 8d-2b: Stolzite (PbWO4 tetragonal, more common)
python tools/new-mineral.py \
  --name stolzite --formula "PbWO4" --class molybdate \
  --required "Pb=100,W=5" \
  --scenarios supergene_oxidation,bisbee \
  --T-range 10,100 --T-optimum 20,80 \
  --redox oxidizing \
  --nucleation-sigma 1.0 \
  --max-size-cm 2 --growth-rate-mult 0.3 \
  --idle-color "#d49a30" --narrate

# 8d-3: Olivenite (Cu2AsO4(OH))
python tools/new-mineral.py \
  --name olivenite --formula "Cu2AsO4(OH)" --class arsenate \
  --required "Cu=50,As=10" \
  --scenarios supergene_oxidation,bisbee \
  --T-range 10,50 --T-optimum 20,40 \
  --redox oxidizing \
  --nucleation-sigma 1.0 \
  --max-size-cm 5 --growth-rate-mult 0.3 \
  --idle-color "#5a7030" --narrate
```

### Manual edits specific to Round 8d

1. **Descloizite ↔ mottramite Cu/Zn ratio fork:**
   ```python
   # supersaturation_descloizite
   if self.fluid.Cu > self.fluid.Zn:
       return 0  # mottramite takes priority
   # supersaturation_mottramite
   if self.fluid.Zn >= self.fluid.Cu:
       return 0  # descloizite takes priority
   ```

2. **Olivenite ↔ adamite Cu/Zn ratio fork** — adamite is already in sim:
   ```python
   # supersaturation_olivenite
   if self.fluid.Zn > self.fluid.Cu:
       return 0  # adamite takes priority
   # In existing supersaturation_adamite (modify):
   if self.fluid.Cu > self.fluid.Zn:
       return 0  # olivenite takes priority
   ```

3. **Raspite stochastic kinetic preference** — both raspite and stolzite are PbWO₄ but stolzite is more common in nature. After scaffolded supersaturation works, add to `check_nucleation` for the tungstate pair:
   ```python
   # If both raspite AND stolzite gates clear, stolzite wins ~90% of the time
   sigma_rasp = self.conditions.supersaturation_raspite()
   sigma_stol = self.conditions.supersaturation_stolzite()
   if sigma_rasp > 1.4 and sigma_stol > 1.0 and random.random() < 0.9:
       sigma_rasp = 0  # stolzite preferred kinetically
   ```

4. **W bump for tungstate seed-42 hits** — add `W=20` to either `bisbee` or `tsumeb` (recommended: tsumeb, since Strunz 1959 documents minor scheelite there). In `scenario_supergene_oxidation` (vugg.py + web/index.html):
   ```python
   W=20,    # was 0; activates dormant W → raspite/stolzite tungstate suite
   ```

5. **Refresh `_narrate_vanadinite`** — add a paragraph mentioning descloizite + mottramite as paragenetic companions.

6. **Refresh `_narrate_adamite`** — add a paragraph mentioning olivenite as the Cu twin.

### Round 8d verification

```bash
python -m pytest --tb=short -q
# Expect: ~975 passed (was ~925 + ~50 new tests)
# Expect: 3 dispatcher tests passing (descloizite/mottramite/olivenite ratio forks)
# Expect: test_tsumeb_full_vta_assemblage passing

python tests/gen_baselines.py    # SIM_VERSION cumulative; 7→8 if not already taken
# Expect: full Tsumeb supergene encyclopedia chain at seed-42
```

---

## §5. Round 8e — Chalcanthite

**One species + the water-solubility mechanic.** Standalone.

```bash
# 8e-1: Chalcanthite (CuSO4·5H2O)
python tools/new-mineral.py \
  --name chalcanthite --formula "CuSO4·5H2O" --class sulfate \
  --required "Cu=30,S=50" \
  --scenarios bisbee,supergene_oxidation \
  --T-range 10,50 --T-optimum 20,40 \
  --redox oxidizing \
  --pH-below 4 \
  --nucleation-sigma 1.0 \
  --max-size-cm 10 --growth-rate-mult 0.5 \
  --idle-color "#2a40c8" --narrate
```

### Manual edits specific to Round 8e

1. **Salinity gate:**
   ```python
   # supersaturation_chalcanthite
   if self.fluid.salinity < 6.0:
       return 0  # needs concentrated drainage
   ```

2. **The water-solubility mechanic** (Round 8e's signature). Add a per-step hook in `VugSimulator.step()`:
   ```python
   # After grow phase, before nucleation
   for crystal in self.crystals:
       if crystal.mineral != "chalcanthite" or crystal.dissolved:
           continue
       if self.conditions.fluid.salinity < 4.0 or self.conditions.fluid.pH > 5.0:
           dissolved_um = min(5.0, crystal.total_growth_um * 0.4)
           crystal.total_growth_um -= dissolved_um
           self.conditions.fluid.Cu += dissolved_um * 0.5
           self.conditions.fluid.S += dissolved_um * 0.5
           if crystal.total_growth_um <= 0:
               crystal.dissolved = True
               crystal.active = False
   ```
   Mirror to JS.

3. **The metastability narrator** — `_narrate_chalcanthite` should mention dissolution if `c.dissolved`. Template in proposal §8e.

### Round 8e verification

```bash
python -m pytest --tb=short -q
# Expect: ~985 passed (was ~975 + ~10 new tests)
# Expect: test_chalcanthite_requires_high_salinity passing
# Expect: test_chalcanthite_dissolves_in_low_salinity_fluid passing (in tests/test_metastability.py)

python tests/gen_baselines.py    # SIM_VERSION final state
# Expect: chalcanthite appears in bisbee seed-42; possibly absent_at_seed_42 elsewhere
```

---

## Round 8 closeout (after all 5 sub-rounds)

```bash
# Final state verification
python -m pytest --tb=short -q
# Expect: ~985 passed, 7 skipped (unchanged skips from before Round 8)

python -c "import vugg; print('SIM:', vugg.SIM_VERSION, 'engines:', len(vugg.MINERAL_ENGINES))"
# Expect: SIM=8, engines=84

node tools/sync-spec.js
# Expect: no drift across 84 minerals in 4 runtimes

git log --oneline 6ccc2ef..HEAD            # commits since Round 8 proposals landed
```

### Update BACKLOG.md

After Round 8 closes:
- Mark `Backlog: Cd / Ag-Ge / Au-Te / auriferous-chalcocite trace engines` as partially-closed (Ag covered by 8a, Te plumbed by 8b for future Au-Te round; Cd + Ge still pending)
- Move "Round 8" entries to completed history with commit hashes
- Add new pending items from this round:
  - Tarnish clock for native silver / native arsenic / native tellurium / native bismuth (deferred from 8a + 8b)
  - Au-Te coupling round (now unblocked by 8b's native_tellurium + Te plumbing)
  - 41 expanded-research narrator refresh sweep (boss's research drop has richer detail for existing species)

### Update SIM_VERSION history

In both `vugg.py` (line 73, the SIM_VERSION assignment + comment block) and `web/index.html` (line ~3522, same):

```
v8 — Round 8 mineral expansion (Apr 2026): silver suite + native element trio
     + Ni-Co sulfarsenide cascade + vanadate/tungstate/arsenate suite + chalcanthite.
     Engine count 69 → 84. Activates dormant Ag, Co, Ni, V, W, Te pools at
     Bisbee, Tsumeb, MVT, supergene_oxidation. New mechanics: 173°C polymorph
     paramorph (argentite ↔ acanthite), S/metal-depletion overflow gates
     (native_silver, native_arsenic, native_tellurium), synproportionation Eh
     window (native_sulfur), three-element gate (cobaltite), solid-solution
     metal-ratio fork (descloizite/mottramite, olivenite/adamite), polymorph
     kinetic preference (raspite/stolzite), water-solubility metastability
     (chalcanthite).
```

---

## Quick scaffold-command summary (all 15, all in one block for easy copy/paste)

For sessions where the runner wants to scaffold all 15 species up-front and customize them in batches:

```bash
cd "C:\Users\baals\Local Storage\AI\vugg\vugg-simulator"

# Round 8a — Silver
python tools/new-mineral.py --name acanthite --formula "Ag2S" --class sulfide --required "Ag=0.5,S=5" --scenarios mvt,reactive_wall,supergene_oxidation,bisbee --T-range 50,170 --T-optimum 80,150 --redox reducing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.3 --idle-color "#404040" --narrate
python tools/new-mineral.py --name argentite --formula "Ag2S" --class sulfide --required "Ag=0.5,S=5" --scenarios radioactive_pegmatite --T-range 173,400 --T-optimum 200,400 --redox reducing --nucleation-sigma 1.0 --max-size-cm 3 --growth-rate-mult 0.4 --idle-color "#303030" --narrate
python tools/new-mineral.py --name native_silver --formula "Ag" --class native --required "Ag=1.0" --scenarios bisbee,supergene_oxidation --T-range 50,300 --T-optimum 100,200 --redox strongly_reducing --nucleation-sigma 1.2 --max-size-cm 30 --growth-rate-mult 0.5 --idle-color "#d4d4d4" --narrate

# Round 8b — Native elements
python tools/new-mineral.py --name native_sulfur --formula "S" --class native --required "S=100" --scenarios sabkha_dolomitization,supergene_oxidation --T-range 20,119 --T-optimum 50,90 --redox tolerant_both --pH-below 5 --nucleation-sigma 1.0 --max-size-cm 30 --growth-rate-mult 0.4 --idle-color "#f5d030" --narrate
python tools/new-mineral.py --name native_arsenic --formula "As" --class native --required "As=5" --scenarios bisbee,supergene_oxidation --T-range 100,350 --T-optimum 150,300 --redox strongly_reducing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.3 --idle-color "#888888" --narrate
python tools/new-mineral.py --name native_tellurium --formula "Te" --class native --required "Te=0.5" --scenarios porphyry --T-range 100,400 --T-optimum 150,300 --redox reducing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.3 --idle-color "#b8b8c8" --narrate

# Round 8c — Ni-Co sulfarsenides
python tools/new-mineral.py --name nickeline --formula "NiAs" --class sulfide --required "Ni=40,As=40" --scenarios bisbee,supergene_oxidation --T-range 200,500 --T-optimum 300,450 --redox reducing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.3 --idle-color "#d49080" --narrate
python tools/new-mineral.py --name millerite --formula "NiS" --class sulfide --required "Ni=50,S=30" --scenarios bisbee,supergene_oxidation --T-range 100,400 --T-optimum 200,350 --redox reducing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.4 --idle-color "#c8b860" --narrate
python tools/new-mineral.py --name cobaltite --formula "CoAsS" --class sulfide --required "Co=50,As=100,S=50" --scenarios bisbee --T-range 300,600 --T-optimum 400,500 --redox reducing --nucleation-sigma 1.2 --max-size-cm 3 --growth-rate-mult 0.3 --idle-color "#d8d4cc" --narrate

# Round 8d — VTA
python tools/new-mineral.py --name descloizite --formula "PbZnVO4(OH)" --class phosphate --required "Pb=100,Zn=50,V=10" --scenarios supergene_oxidation --T-range 20,80 --T-optimum 30,50 --redox oxidizing --nucleation-sigma 1.0 --max-size-cm 3 --growth-rate-mult 0.3 --idle-color "#8a3020" --narrate
python tools/new-mineral.py --name mottramite --formula "PbCu(VO4)(OH)" --class phosphate --required "Pb=100,Cu=50,V=10" --scenarios supergene_oxidation --T-range 20,80 --T-optimum 30,50 --redox oxidizing --nucleation-sigma 1.0 --max-size-cm 3 --growth-rate-mult 0.3 --idle-color "#8a9a40" --narrate
python tools/new-mineral.py --name raspite --formula "PbWO4" --class molybdate --required "Pb=100,W=5" --scenarios supergene_oxidation,bisbee --T-range 10,50 --T-optimum 20,40 --redox oxidizing --nucleation-sigma 1.4 --max-size-cm 1 --growth-rate-mult 0.2 --idle-color "#d4b840" --narrate
python tools/new-mineral.py --name stolzite --formula "PbWO4" --class molybdate --required "Pb=100,W=5" --scenarios supergene_oxidation,bisbee --T-range 10,100 --T-optimum 20,80 --redox oxidizing --nucleation-sigma 1.0 --max-size-cm 2 --growth-rate-mult 0.3 --idle-color "#d49a30" --narrate
python tools/new-mineral.py --name olivenite --formula "Cu2AsO4(OH)" --class arsenate --required "Cu=50,As=10" --scenarios supergene_oxidation,bisbee --T-range 10,50 --T-optimum 20,40 --redox oxidizing --nucleation-sigma 1.0 --max-size-cm 5 --growth-rate-mult 0.3 --idle-color "#5a7030" --narrate

# Round 8e — Chalcanthite
python tools/new-mineral.py --name chalcanthite --formula "CuSO4·5H2O" --class sulfate --required "Cu=30,S=50" --scenarios bisbee,supergene_oxidation --T-range 10,50 --T-optimum 20,40 --redox oxidizing --pH-below 4 --nucleation-sigma 1.0 --max-size-cm 10 --growth-rate-mult 0.5 --idle-color "#2a40c8" --narrate
```

After running all 15: 15 new entries in `data/minerals.json` + 15 paste-guides in `tools/_NEW_<name>.md`. Customize each per the per-sub-round notes above, then commit per the workflow template.

---

## State at compaction

- **Branch:** main on Syntaxswine origin (`https://github.com/Syntaxswine/vugg-simulator.git`)
- **Push commit:** `6ccc2ef` (5 Round 8 proposals) — this kickoff doc adds one more
- **SIM_VERSION:** 7
- **Engines:** 69
- **Tests:** 842 passed, 7 skipped
- **Outstanding work:** 15 species across 5 sub-rounds (this doc)
- **Other workstreams paused:**
  - Zone-viz Phase 2b (remaining shape families: projecting/coating/tabular/dendritic)
  - Zone-viz Phase 2c (schema bump: zone.fluid_snapshot + zone.twin_start)
  - Apply chem bar to Inventory + Library thumbnails
  - 41 existing-species narrator refresh from boss's research drop
  - Gibbs-Thompson proposal read

When you come back, pre-flight, then pick a sub-round (8a is the recommended first — most visible payoff with the silver wires). One sub-round per session is comfortable. 8a + 8b can run in parallel tabs since they share no chemistry.

🪨
