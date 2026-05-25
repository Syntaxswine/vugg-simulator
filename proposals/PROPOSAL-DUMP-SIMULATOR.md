# PROPOSAL — Wasteland Crystals

**Audience:** the AI agent who will start the new repo. You probably haven't seen
vugg-simulator before. This document tells you the concept, what to crib, what
to invent, and the order to read things in.

**Author:** Claude, drafting for the boss (StonePhilosopher) who is starting a
new project derived from vugg-simulator. **Date:** 2026-05-06.

**Working title confirmed:** *Wasteland Crystals*. **Aesthetic direction:**
cyberpunk on real chemistry — see "Aesthetic" below before reading the rest.

---

## TL;DR

A vugg-simulator sibling. Same engine philosophy — chemistry-true crystal
growth, geology emerges from physics, the player learns by watching specimens
form — but the host material is **modern industrial waste**, not natural rock.
A landfill / scrapyard / e-waste pile is a vug. Galvanized steel, copper wire,
lead-acid batteries, drywall, concrete, glass, plastic — these are the host
"rocks." Leachate is the fluid. The crystals that nucleate are real
**anthropogenic minerals**: goslarite on rusted galvanizing, malachite on
copper wire, anglesite on battery posts, struvite on organic-rich slurry, the
whole post-2000 efflorescent mineralogy of the Anthropocene.

The Anthropocene has a real mineralogy. It is recent, it is documented, and
it is genuinely strange. This game makes it visible.

---

## Aesthetic — cyberpunk on real chemistry

The boss has set the visual register: **cyberpunk, grounded in real
anthropogenic mineral chemistry**. The vugg-simulator look already does
half the work — boot the title screen and you're staring at an ASCII
crystal cluster on black with amber-gold accents in monospace; the
panels are dark with terminal-style chrome; the WALL PROFILE viewer
is unapologetically a CRT readout. Carry that forward and lean further.

What this means concretely:

- **Palette is already there** in the minerals themselves. Real
  anthropogenic minerals are saturated and weird in a way that reads
  natively cyberpunk — neon-green malachite, electric-cyan posnjakite,
  acidic-yellow plumbojarosite, ruby-red lepidocrocite, atacamite green
  on copper, white-needle goslarite efflorescence on rust. No tinting
  required. Render their actual class colors and the game looks like a
  Shenzhen night market.

- **Industrial typography stays**. Monospace, all-caps panel labels,
  reading like a field-instrument readout. The collection card is a
  manifest, not a museum plaque.

- **The framing is "field guide for the Anthropocene."** Not horror,
  not solarpunk, not cozy. The mood the boss is reaching for is the
  noir of "this is what we left, and it's growing back into something
  beautiful and wrong." The narrators (vugg-simulator has a per-mineral
  narrator system) get a tonal rewrite — drier, more clinical, more
  Borges-style "and the mineral was thus identified by the surveyor"
  than the wonder-of-nature register vugg-sim uses.

- **The localities are real places** (see Open Design Q7 below). When
  the player loads a scenario, it should say "Fresh Kills, Staten
  Island, 1995-2001" or "Agbogbloshie, Accra, 2018" — actual
  coordinates of the contemporary industrial sublime.

- **Don't invent visual gimmicks the chemistry doesn't justify.** No
  glowing crystals, no neon overlays, no holographic UI flourishes
  beyond what the existing terminal-CRT chrome already implies. The
  real mineralogy IS the cyberpunk; bolting on extra cyberpunk on top
  reads as costume. Same load-bearing-geology principle as
  vugg-simulator (boss memory `feedback_defer_to_geology`): defer to
  what's actually there.

The receiving agent should treat aesthetic decisions the same way they
treat chemistry decisions — by looking at real anthropogenic-mineral
specimens (Mindat, the Hazen 2017 paper's photo plates, mine-waste
photo archives) and translating those colors and textures faithfully.
The game is most cyberpunk when it's most accurate.

---

## Map view — cross-section schematic

The boss has set the canonical map view: **a cross-section schematic**,
like the textbook secure-landfill diagrams (final landfill surface →
soil cap → sealing layer → intermediate layers → waste cell → impervious
liner → leachate detection system → secondary liner → water table; with
monitoring wells flanking each side, gas vents puncturing the cap, and
leachate-collection pipes at the floor of the cell).

This is a CLEAN translation of vugg-simulator's existing vertical-rings
architecture, and arguably more geometrically natural than vugg's
spherical-cavity view. A landfill is stratified by definition; rings
are layers.

```
vugg-simulator                 Wasteland Crystals
─────────────────              ─────────────────
ring index r ∈ [0, 15]         depth layer (top = cap, bottom = liner)
cells_per_ring × ring_count    horizontal cell width × depth layers
ring orientation tag           horizontal-band tag:
  floor / wall / ceiling         soil cap / intermediate / waste cell
                                 / leachate-collection / liner
ring 0 = south pole            bottom layer (oldest, anaerobic,
                                 ~70°C from methanogenesis, leachate-
                                 saturated)
ring 15 = north pole           top layer (recent, aerobic, ambient,
                                 surface vegetation)
ringWaterState                 perched-leachate level inside the cell
                                 (leachate collection pumps from the
                                 bottom; level rises with rain events,
                                 falls with pumping)
basin archetype (top-half      THE archetype for landfill cells —
  collapses, floor_only            a trapezoidal trough, wider at top
  nucleation)                      than bottom, side-slope = angle of
                                   repose (~30°). The Mechanic 5 basin
                                   shape is already 80% of the way
                                   there; just adjust to a flat-floor
                                   trough rather than a sigmoid bowl.
```

### Renderer architecture (recommended)

Two zoom levels, mirroring vugg-simulator's existing tier system:

1. **Schematic 2D cross-section** as the default map view. Clean,
   labeled, fast — looks like the engineering diagram the boss
   referenced. Shows depth layers, substrate-type bands, leachate
   level, gas vents, monitoring wells, and any visible mineral
   crusts at the layer scale. Built on canvas-2D, similar in spirit
   to vugg-simulator's `99b-renderer-topo-2d.ts` (which is a
   ring-strip view) but with horizontal layers instead of a circle.

2. **Three.js detail view** when the player zooms into a specific
   layer or substrate object. Shows individual crystal habits at
   millimeter scale — a goslarite efflorescence on a rusted hubcap,
   a malachite crust on a copper wire — using the existing per-cell
   cavity clip and habit-dispatch primitives. This is where the
   vugg-simulator renderer (`99i-renderer-three.ts`) ports almost
   verbatim — the cavity is now the local pocket around a specific
   buried object, but the geometry math is the same.

Side panels (gas vents, monitoring wells, leachate-collection pipes,
runoff channels) are a renderer-only flourish; they don't affect
chemistry but they make the schematic legible. Optional in v1, but
they're the visual cue that says "this is a landfill, not a cave."

### Why this works for cyberpunk

The cross-section IS the cyberpunk image. A cutaway diagram of a
sealed industrial container with metal liners, monitoring pipes, gas
vents, and a chemistry-active interior reads as a Neuromancer-era
schematic — the kind of thing you'd see on a corporation's quarterly
report, except the report's about which post-natural minerals are
growing in their hazardous-waste cells. Lean in. Use the engineering-
diagram aesthetic for the map and let the player click through to
the microscope view to see what the actual chemistry produced.

### Implementation notes for the receiving agent

- **Layer geometry generator** is a new module replacing
  `22-geometry-wall.ts`'s bubble-merge profile. Trapezoidal cross-
  section, configurable cap thickness / waste-cell depth / liner
  thickness. Per-cell substrate type is the new per-cell field
  (replacing `wall_depth` semantically — wall_depth was about
  dissolution erosion, which doesn't apply; substrate type is the
  meaningful per-voxel state).

- **Side-view projection** replaces `99i-renderer-three.ts`'s
  spherical projection. The cavity geometry build at line ~283
  walks rings × cells and lays out vertices in spherical coords;
  the Wasteland version walks layers × horizontal cells and lays
  out vertices in trapezoidal coords. Same data structure, different
  formula.

- **Per-cell shader clip** ports verbatim — discard fragments past
  the local cell boundary. This is what makes irregular waste
  contents (a buried fridge, a tire pile) render with clean edges
  without leaking past the substrate.

- **Inside / outside view modes** ports verbatim — opaque from
  outside, translucent from inside, with the existing
  hysteresis-based switch.

---

## The concept

Modern landfills and scrapyards are reactors. Rainwater + soil CO₂ + organic
decomposition produces leachate (acidic to alkaline depending on the dump
generation, with metal loadings that exceed any natural ore deposit). That
leachate reacts with the cataloged contents of consumer civilization. What
crystallizes back out is a small zoo of minerals — some natural species
appearing in unnatural settings, some entirely **post-natural** (compounds
that exist on Earth only because we made the substrate).

Real examples (every one of these is documented in the literature; the new
project should never invent chemistry — defer to actual mineralogy, same
principle as vugg-simulator):

| Substrate | Leachate condition | Mineral product | Habit |
|-----------|--------------------|-------------------|-------|
| Galvanized steel (rust + zinc) | acidic, sulfate-bearing | **Goslarite** ZnSO₄·7H₂O | acicular efflorescence |
| | sulfate-rich | **Gunningite** ZnSO₄·H₂O | crusty white |
| | carbonate-rich | **Hydrozincite** Zn₅(CO₃)₂(OH)₆ | white botryoidal |
| Copper wire / pipe | mildly acidic, sulfate | **Posnjakite** Cu₄(SO₄)(OH)₆·H₂O | blue prismatic |
| | acidic + Cl⁻ | **Atacamite / paratacamite** Cu₂Cl(OH)₃ | green prismatic |
| | carbonate-rich | **Malachite** Cu₂(CO₃)(OH)₂ | green botryoidal |
| | acidic + SO₄ | **Brochantite** Cu₄(SO₄)(OH)₆ | green-blue prismatic |
| Lead-acid battery (corroded) | sulfate, low pH | **Anglesite** PbSO₄ | white tabular |
| | carbonate, neutral pH | **Cerussite** PbCO₃ | white pseudo-hexagonal |
| | weathered intermediates | **Plumbojarosite** | yellow-brown |
| Aluminum cans / scrap | acidic, sulfate | **Alunogen** Al₂(SO₄)₃·17H₂O | fibrous efflorescence |
| | low-pH oxidative | **Jurbanite** AlSO₄(OH)·5H₂O | acicular |
| Iron rebar / sheet steel | acidic, oxidizing | **Schwertmannite, jarosite** | yellow ochre crusts |
| | neutral, oxidizing | **Goethite, lepidocrocite** | rust crusts |
| Concrete demolition | alkaline, leached | **Ettringite** Ca₆Al₂(SO₄)₃(OH)₁₂·26H₂O | acicular needles |
| | high pH, sulfate | **Thaumasite** Ca₃Si(OH)₆(SO₄)(CO₃)·12H₂O | white fibers |
| | calcite efflorescence | **Calcite, aragonite** | flowstone, stalactites |
| Drywall (gypsum board) | wet | **Gypsum, basanite** | re-precipitated needles |
| | high-temp degradation | **Anhydrite** | tabular |
| Glass + alkaline | wet, alkaline | **Trona, nahcolite** | crusts |
| Organic slurry (food, manure) | neutral, P-rich | **Struvite** MgNH₄PO₄·6H₂O | white prismatic |
| | seabird/bat-style | **Apatite group** | crusts |
| Tire piles + leachate | sulfate, Zn-rich | **Smithsonite, hydrozincite** | secondary Zn carbonate |
| Solder / electronics | low-pH, complex | **Stannite-group, lead-tin sulfates** | rare metallics |
| | rare earths from magnets | **Bastnäsite-equivalents** | rare-earth phosphates |

**Key reference:** Hazen et al. 2017, *American Mineralogist* — "On the
mineralogy of the 'Anthropocene Epoch'" — catalogs 208 species of
anthropogenic origin or anthropogenic occurrence. That paper is the spine
of the mineral set for this game.

The game's player should be able to look at a corner of a junkyard and
identify what was buried there from the secondary minerals growing on top.
Same epistemic move as vugg-simulator: **the assemblage tells the story**.

---

## Mapping vugg-simulator → dump-sim

The conceptual map is direct enough that 80%+ of vugg-simulator's engine
should fork-and-modify cleanly. The ASCII below is the translation table.

```
vugg-simulator                 dump-sim
─────────────────              ─────────────────
vug (cavity in rock)           pile / object pocket
host rock                      garbage type (battery, can, board)
wall_state.rings[r][c]         pile_state — discrete object inventory
                               (or a voxel-coarse occupancy grid)
fluid (Ca, CO3, S, ...)        leachate (Zn, Cu, Pb, SO4, NH4, P, ...)
temperature                    decomposition heat + ambient
host rock dissolves into       garbage corrodes into
  fluid                          leachate
crystal nucleates on wall      crystal nucleates on substrate object
crystal habit (prismatic, ...) crystal habit (same vocabulary —
                               efflorescent crusts, acicular sprays,
                               flowstone, etc., all real)
paragenesis (calcite-after-    paragenesis (anglesite-after-galena
  fluorite, etc.)                 happens in batteries too)
events (fluid pulse, cooling)  events (rain, fire, leachate dump,
                               compactor pass, decomposition spike)
scenario (a locality's recipe) scenario (a dump's recipe — landfill
                               age, e-waste pile, scrapyard, sewage
                               settling pond)
host_rock architecture         pile_type architecture
  (Mechanic 5, just shipped)     (landfill cell, scrap heap, sludge
                                 pond, demolition pile)
```

The substantive differences are:

1. **Substrate is heterogeneous and discrete, not a uniform wall.** A vug has
   one limestone wall; a junkyard pile has a steel can next to a copper wire
   next to a lead-acid battery. The "host rock" abstraction needs to become
   a per-cell or per-voxel substrate type, not a global one.

2. **Substrate is consumable.** A copper wire actually disappears as it
   corrodes — its mass becomes the malachite. A limestone wall in vugg
   dissolves uniformly; a copper wire dissolves locally. The pile
   restructures over time: collapse, compaction, sloughing.

3. **Time scale is years to decades, not Ma.** Means time-step semantics
   change. Means decomposition heat (which can reach 70°C in a fresh
   landfill) is a real driver, not just ambient.

4. **No deep-Earth temperatures.** The temperature range is ~10 to ~80°C, not
   50 to 600°C. Some vugg engines (porphyry, schneeberg, etc.) port
   meaninglessly — others (sabkha, supergene, the secondary-mineralogy
   ones) port directly.

5. **Visual aesthetic is industrial, not geological.** Rust orange, neon
   green malachite on copper, electric blue anglesite, alkaline white
   efflorescence, pale green struvite — but on rebar, not on host rock.
   The renderer's wall-coloring + substrate-tinting code (which currently
   tints rings as floor/wall/ceiling) needs to tint by *substrate type*.

6. **Scale is different.** A junk pile is meters-scale, not millimeters.
   But the crystals are still mm to cm. Make the pile a "big vug" of 1-10 m
   and let the same crystal sizes work; or rescale `vug_diameter_mm` semantics
   to `pile_diameter_m`. Either works.

7. **Tone.** Vugg-simulator is wonder-oriented (a geode is beautiful).
   Dump-sim has a different emotional valence — partly rust-aesthetic,
   partly horror, partly mordant comedy. Lean into it. The narrators
   (vugg has a per-mineral narrator system) get a tonal rewrite.

---

## What to reuse (fork-and-modify)

vugg-simulator is built on infrastructure that took 60+ SIM_VERSION
iterations to settle. Fork the repo, rename it, and start gutting per the
list below.

### Reuse as-is (renames only)

- **Build pipeline.** `tools/build-all.mjs` + `tools/build.mjs` concatenate
  `js/<NN>-<name>.ts` into `index.html`. The numeric prefix determines order;
  top-level decls stay global (SCRIPT-mode TS). This is a no-build-step
  philosophy: the user opens `index.html` and the game runs. Keep it.

- **Test + baseline pattern.** `tests-js/calibration.test.ts` reads
  `tests-js/baselines/seed42_v<N>.json` and asserts seed-42 sweep parity.
  When you change chemistry, bump SIM_VERSION, run
  `node tools/gen-js-baseline.mjs`, and inspect the diff. This is gold —
  catches regressions instantly. Port verbatim.

- **TypeScript SCRIPT-mode + tsconfig.** The JS port runs under jsdom for
  tests, in browser for game. Same setup works for dump-sim.

- **Renderer architecture.** Three tiers: canvas-2D strip
  (`99b-renderer-topo-2d.ts`), canvas-vector 3D (`99e-renderer-topo-3d.ts`),
  Three.js (`99i-renderer-three.ts`). The Three.js renderer just got a
  per-cell cavity clip via DataTexture (commit 4fb128f) that handles
  irregular host shapes — reuse for irregular pile geometry directly.

- **Habit dispatch + crystal geometry primitives.** `27-geometry-crystal.ts`
  is mineral-agnostic; a crystal is a habit token + c_length + a_width +
  zones. Anthropogenic minerals fit the same vocabulary (acicular for
  efflorescent fibers, botryoidal for malachite blobs, tabular for
  anglesite, etc.).

- **Scenarios.json5 format.** Each scenario declares initial conditions,
  events, expected species. Same schema works.

- **Tutorial system.** Tutorials are scenarios with tagged steps that
  unfold a teaching moment. Port verbatim — write new tutorials for
  "your first goslarite," etc.

- **Per-mineral narrators.** `92*-narrators-*.ts` — one file per
  mineral class, each function describes one mineral as it grows. Tonal
  rewrite obviously, but the mechanic (per-mineral function called per
  step with the crystal) is exactly right.

- **Modular file split.** See `js/README.md` for the full module index.
  Keep the same numbering convention; you'll need most slot ranges.

### Fork and substantially modify

- **`22-geometry-wall.ts`** (vug cavity) → "pile geometry." The bubble-merge
  cavity build is too smooth for a junk pile; you want chaotic
  heterogeneous voxel-or-object placement. Five archetypes (landfill cell,
  scrap heap, sludge pond, demolition pile, e-waste mound) following the
  same pattern as Mechanic 5's host-rock archetypes (see commits 8f1de1e,
  c70371e). Per-cell substrate type, not just per-cell radius.

- **`data/minerals.json`** → anthropogenic minerals. Use the same schema:
  habit, color, density, growth chemistry, twin laws, paragenesis hosts.
  Cite Hazen 2017 and per-mineral references. The schema fields are
  documented in `js/00-mineral-spec.ts` (look for `MINERAL_SPEC_FALLBACK`).

- **`data/locality_chemistry.json`** → leachate-chemistry catalog. Five-ish
  archetypal leachates: young acidic landfill, mature alkaline landfill,
  scrapyard runoff, e-waste acidic, sludge-pond ammonium-rich.

- **`data/scenarios.json5`** → dump scenarios. New scenario set: "Fresh
  Brooklyn landfill, 1995," "Gowanus Canal sludge," "Ship-breaking yard,
  Chittagong," "E-waste pile, Agbogbloshie," "Demolition site,
  postwar Berlin." Each anchored in a real locality with cited chemistry.

- **`80-91-engines-*.ts`** (per-class growth engines) → per-class
  anthropogenic chemistry. Many port directly (sulfates, carbonates,
  oxides) — different mineral set, same chemistry. Some need new classes
  (organic phosphates → struvite, ammonia chemistry).

- **Mineral-class colors.** The vugg renderer color-codes by mineral
  class. Anthropogenic context wants additional class tags: maybe
  "efflorescence," "rust," "battery-derived," "concrete-derived" — for
  visual grouping. Optional.

### Drop entirely

- The pre-2000 mineral set that has no anthropogenic occurrence (e.g.,
  pegmatite-only species like beryl, topaz, columbite, tantalite —
  unless the dump contains rare-earth magnets, which is genuinely a
  thing, in which case keep them).

- Deep-Earth scenarios (porphyry, schneeberg, gem_pegmatite,
  radioactive_pegmatite) — physically impossible at landfill T-P.

- Python-side code (`vugg/`, `tests/`). It's dead in vugg-simulator
  (see boss memory `project_vugg_python_dead`). Don't port it.

---

## Bootstrap path

Recommended sequence for spinning up the new repo:

### 1. Read vugg-simulator architecture (1-2 hours)

In this order:

1. `ARCHITECTURE.md` (167 lines) — short, points at canonical sources.
2. `js/README.md` (330 lines) — module-by-module index. **Critical.**
3. `proposals/BACKLOG.md` — ongoing work + design state.
4. `data/scenarios.json5` — read 2-3 scenarios end to end (e.g.,
   `mvt`, `bisbee`, `sabkha_dolomitization`) to understand the schema.
5. `js/00-mineral-spec.ts` (or `data/minerals.json` for raw schema) —
   one mineral's full spec.
6. `js/15-version.ts` — the SIM_VERSION changelog. **Read the last 15
   versions** to understand the design evolution and what each capability
   means in code terms. v55-v61 covers paragenesis, vug-fill caps,
   per-cell clip, and host-rock architecture — the most recently
   exercised parts of the engine.
7. `proposals/PROPOSAL-HOST-ROCK.md` — Mechanic 5 (the parent proposal
   for this game's substrate model) and what's already shipped (Slice
   A in commit 8f1de1e, Slice B in c70371e).

### 2. Run vugg-simulator end to end (15 minutes)

```bash
cd vugg-simulator
npm install
npm run build         # compile TS → dist/, then concat to index.html
npm test              # 63 tests, ~2s
npm run typecheck
```

Open `index.html` in a browser. Try the `supergene_oxidation` scenario
seed 42 with the Three.js renderer toggled on (the `⬚` button in the
WALL PROFILE panel). You'll see the irregular cavity, crystals, the
per-cell shader clip in action. This is the visual bar dump-sim
inherits.

### 3. Fork the repo

```bash
gh repo create <user>/dump-simulator --public --clone --source=vugg-simulator
cd dump-simulator
# Adjust package.json name, README, etc.
```

Or — clone fresh and copy what you want. The fork is faster but drags in
the full git history (which is fine; it's your reference for "why is this
shaped this way").

Naming options to suggest to the boss:
- **Anthropogenic Mineralogy** (academic, accurate)
- **Wasteland Crystals** (evocative, generic)
- **Slag Garden** (evocative, narrow)
- **Junkscape** (game-y, broad)
- **The New Lithology** (precious but accurate)
- **Rotgarden** (mordant)

### 4. Strip vugg-specific code first, then rebuild

Order matters. Do this:

1. Empty `data/minerals.json` → keep schema, drop entries.
2. Empty `data/scenarios.json5` → keep schema, drop entries.
3. Empty `narratives/` → keep schema, drop content.
4. Strip `js/8?-engines-*.ts` to skeletons (`grow_*` function shells
   that no-op).
5. Strip `js/9?-narrators-*.ts` to skeletons.
6. Rename `WallState` → `PileState`, `vug_diameter_mm` → whatever fits.
7. Run `npm run build && npm test` after each step. Tests should pass
   with empty mineral sets (no scenarios to run).
8. **Then** start adding minerals one at a time, vugg-simulator-style:
   one mineral, one engine function, one narrator, one scenario,
   one tutorial step. Use `proposals/HANDOFF-ADDING-MINERALS.md` as
   a reference checklist for what each mineral needs.

### 5. First mineral: pick goslarite

Goslarite (ZnSO₄·7H₂O) on rusted galvanized steel is the canonical
"hello world" of anthropogenic mineralogy:

- Substrate is universal (steel is in every dump)
- Chemistry is simple (Zn²⁺ + SO₄²⁻ in acidic leachate)
- Habit is visually distinctive (acicular efflorescent fibers)
- Color is unmistakable (snow white)
- Forms in months, not millennia (player sees it grow in real time
  at sim-step granularity)

If you can ship a tutorial that says "place a galvanized steel can
in your sandbox, simulate 6 months of acidic rain, watch goslarite
crystallize" — you have a working game. Everything else is content.

---

## Open design questions

These are the things the boss and the receiving agent should decide
together before serious implementation. Don't pick blindly.

1. **Voxel grid vs. discrete-object pile.** Two ways to model a junk pile:
   (a) a 3D voxel grid where each voxel has a substrate tag and a chemistry
   state, (b) a list of discrete objects (this can, that battery) at
   specific positions, with the pile geometry being the union of object
   shapes. (a) is closer to vugg's per-cell wall model — easier port. (b)
   is more visually meaningful (you SEE the can corroding). Recommendation:
   start with (a) for the engine port, layer (b) on top as a renderer-only
   "object instance" overlay later.

2. **Compaction events.** Real landfills compact. A compactor pass
   restructures the pile — buried becomes deeper, exposed becomes new
   exposed. Is this an event type, a continuous mechanic, or something
   the player triggers? Worth thinking about because compaction
   changes which substrates currently see leachate, which changes which
   minerals currently grow.

3. **Decomposition heat.** Methane fermentation in landfills generates
   real heat (50-70°C in an active cell). This drives mineral kinetics.
   Probably belongs as a per-pile-region temperature field, not a
   single global temperature.

4. **Time scale.** Vugg's `step` represents geological time —
   variable, abstract. Dump-sim could similarly abstract, or could
   peg one step = one month. The latter is more intuitive for a
   modern setting.

5. **Liability / horror angle.** Real garbage piles include things
   players might not want to see modeled (medical waste, asbestos,
   radioactive waste). The chemistry IS the same — they crystallize
   too. Edit charter level: do you want this game to teach about
   contaminated sites? Or stay aesthetic?

6. **Multiplayer / shared dumps.** Probably defer; vugg-simulator is
   single-player. But the pile-as-shared-substrate is a more obvious
   multiplayer fit than vugg-as-cave.

7. **Scenarios as real localities.** Vugg-simulator's scenarios are
   anchored to real geological localities with cited chemistry. The
   strongest version of dump-sim does the same: "Fresno Sanitary
   Landfill, 2003," "Fresh Kills, Staten Island, 1995-2001," "Bay
   of Bengal ship-breaking, 2018." This requires actual research
   on per-site leachate chemistry. Worth doing.

---

## Reading list (priority order)

If you only have time for the top half of this list, that's fine — the
rest is reference material you can pull from later.

| Priority | File | What you'll learn |
|----------|------|-------------------|
| **1** | `vugg-simulator/ARCHITECTURE.md` | Overall structure pointer (167 lines, ~10 min) |
| **2** | `vugg-simulator/js/README.md` | Every js/*.ts file purpose (~30 min) |
| **3** | `vugg-simulator/data/scenarios.json5` (3 scenarios) | Scenario schema (~15 min) |
| **4** | `vugg-simulator/js/15-version.ts` (last 15 versions) | What the engine has learned (~30 min) |
| **5** | `vugg-simulator/proposals/PROPOSAL-HOST-ROCK.md` | The parent design (~20 min) |
| **6** | `vugg-simulator/js/27-geometry-crystal.ts` | Crystal data model (~20 min) |
| **7** | `vugg-simulator/js/22-geometry-wall.ts` | Wall/cavity model — your starting point for piles (~30 min) |
| **8** | `vugg-simulator/js/85-simulator.ts` + `85b-` + `85c-` | The main loop (~30 min) |
| **9** | `vugg-simulator/js/52-engines-carbonate.ts` | A growth engine, end to end (~20 min) |
| **10** | `vugg-simulator/proposals/HANDOFF-ADDING-MINERALS.md` | Per-mineral checklist (~15 min) |
| **11** | `vugg-simulator/js/99i-renderer-three.ts` | The Three.js renderer (long but essential) |
| **12** | `vugg-simulator/proposals/BACKLOG.md` | What's still open in vugg, useful for context |
| 13 | `vugg-simulator/proposals/PROPOSAL-MODULAR-REFACTOR.md` | The module-numbering convention rationale |
| 14 | `vugg-simulator/tests-js/calibration.test.ts` | The baseline pattern (~10 min) |
| 15 | `vugg-simulator/tools/build-all.mjs` | Build pipeline (~10 min) |
| 16 | Hazen et al. 2017, *Am. Mineralogist* — "On the mineralogy of the 'Anthropocene Epoch'" | The mineral set spine |
| 17 | Jambor et al. 2000 — "Mineralogy of mine wastes" | Acid mine drainage mineralogy (carries over) |
| 18 | Nordstrom 2020 — "Hydrogeochemistry of acid mine waters" | Leachate chemistry primer |

---

## A note on principle

vugg-simulator's core design principle, articulated by the boss and saved
in agent memory as **"defer to actual geology"**: when there's tension
between visual cleanness, simulation convenience, and reality — pick
reality. The simulator's value is that the assemblages emerge from real
chemistry, not from coded compromises.

Carry this principle directly into dump-sim. The temptation in a
"man-made-crystals-on-garbage" game is to invent fun-looking crystals
because the setting is unfamiliar. Don't. The real anthropogenic
mineralogy is already weird and beautiful — goslarite fibers on rust,
malachite on a copper Christmas-light socket, ettringite needles in
collapsed concrete. Cite the literature, model the chemistry, let the
visuals follow.

The post-natural is already strange enough. Trust the rocks, even when
the rocks are made of garbage.

---

## What this proposal is and isn't

**Is:** a handoff. A starter map. A pointer at the parts of vugg-simulator
that the new project should crib, with enough mineralogy to know where
to begin.

**Isn't:** a finished design doc. The receiving agent and the boss will
make the real decisions — voxel vs object, time-scale, scenario set,
whether to fork or start fresh, what to call the game. This proposal
just makes sure those decisions are well-informed.

If you're the receiving agent: when you have questions, ask the boss.
The boss prefers anticipatory proposals over open-ended check-ins —
do the homework, present a recommendation, name the tradeoffs. See
boss memory file `feedback_anticipatory_proposals.md` for the
collaboration style.

Welcome to the project. The Anthropocene needs a mineralogist. 🪨🗑️
