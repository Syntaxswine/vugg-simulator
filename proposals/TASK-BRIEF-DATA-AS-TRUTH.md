# TASK-BRIEF: data/-as-truth — extract tables from procedural code

**Priority:** Highest-leverage architecture move. No new minerals, no new
scenarios, no new mechanics. Pulls procedural state out of `vugg.py` and
`index.html` into declarative `data/*.json` files that both engines (and
`agent-api/vugg-agent.js`) consume. Every table extracted halves the
per-mineral / per-scenario implementation cost and shrinks the surface
where Python and JS can drift.

**Why now:** the architecture review (2026-04-29) endorsed this as the
single most leveraged refactor available. The pattern already works —
`data/minerals.json` is the single source of truth for 84 mineral specs
across three runtimes — but it's only used for the per-mineral fields.
Scenarios, twin laws, paramorph transitions, metastability rules, and
narrator copy are all still hand-written procedural code in two languages.
That's where the duplicated maintenance lives.

**Why this compounds:** when `vugg.py` is eventually retired (per the
architecture decision in `vugg.py`'s top-of-file docstring — trigger:
~100 minerals or natural workflow cycle), the cost of that retirement is
proportional to how much engine-specific procedural code is left. Every
table moved into `data/` shrinks that cost.

**Out of scope:** the grow_*() functions themselves. They stay procedural
in both engines for now. The bridging work is making the *configuration*
declarative, not the simulation logic.

---

## Five tables to extract (sequenced by dependency / leverage)

### 1. `data/scenarios.json` — initial fluid + event timeline

**Today:** 13 (or 14 — Python has `scenario_random`, JS doesn't) hand-written
`scenario_*` functions in each engine. Each one builds a `FluidChemistry(...)`
initializer and registers an event timeline. Adding a scenario means writing
the same function twice in two languages and remembering to register it in
both `SCENARIOS` registries.

**Schema sketch:**
```json
{
  "$schema_version": "1.0.0",
  "scenarios": {
    "mvt": {
      "anchor": "Tri-State district (Joplin / Picher) — Sr-Pb-Zn",
      "initial": {
        "T_C": 180,
        "P_kbar": 0.3,
        "pH": 7.2,
        "fluid": { "Ca": 300, "Mn": 25, "Pb": 40, "Na": 80, "Sr": 15, "Ba": 20, "O2": 0.25 },
        "wall": { "composition": "limestone", "reactivity": 1.0, "diameter_mm": 30 }
      },
      "duration_steps": 200,
      "events": [
        { "step": 20, "type": "fluid_mixing", "label": "Fluid Mixing",
          "delta": { "Zn": 150, "S": 105, "F": 45 } },
        { "step": 60, "type": "fluid_pulse", "label": "Second Pulse",
          "delta": { "Fe": 25, "Mn": 5 } },
        { "step": 80, "type": "tectonic_shock", "label": "Tectonic" }
      ],
      "sources": [
        "Stoffell 2008 — fluid-inclusion microthermometry",
        "Hagni 1976 — Tri-State paragenesis"
      ]
    }
  }
}
```

**Engineering:**
- New `data/scenarios.json` with all 13 (+ random) scenarios migrated.
- Both engines load and run scenarios from this file. Python: `json.load`
  at module import. JS: `fetch('data/scenarios.json')` at startup, fall
  back to a tiny inline copy if the fetch fails (same pattern as
  `MINERAL_SPEC_FALLBACK`).
- Event types are a small enumerated set; both engines have a handler per
  type (`fluid_mixing`, `fluid_pulse`, `cooling_pulse`, `tectonic_shock`,
  `acid_pulse`, `oxidation`, `flood`, `meteoric_flush`, `supergene_acidification`,
  `chromium_depletion`, `uplift_weathering`). Catalog them in the schema.
- Update `tools/sync-spec.js` with a Check 7 that validates scenarios
  declared in JSON match what each engine has wired up.
- Move `scenario_random` into JSON form so the Python/JS drift on this one
  scenario closes simultaneously.

**Effect:** adding a scenario becomes a one-JSON-entry change. Today's
14×2 = 28 hand-written scenario functions become 0 (replaced by one
generic interpreter per engine).

---

### 2. `data/twin_laws.json` — twin probability + law per mineral

**Today:** twin probabilities and twin-law strings are scattered through
each `grow_<mineral>()` function as inline literals. Adding the iron-cross
twin to pyrite required code edits in three places.

**Schema sketch:**
```json
{
  "twin_laws": {
    "pyrite":      { "probability": 0.25, "law": "iron-cross {110}" },
    "sphalerite":  { "probability": 0.18, "law": "spinel-law {111}" },
    "calcite":     { "probability": 0.10, "law": "polysynthetic {012}" },
    "rhodochrosite": { "probability": 0.10, "law": "polysynthetic {012}" },
    "...": "..."
  }
}
```

**Engineering:**
- One JSON file. Both engines look up `twin_laws[mineral]` at the twin-roll
  point. If absent, no twinning.
- Tectonic-shock event is a single multiplier on the same probability.
- `tools/sync-spec.js` adds a check that twin_laws keys are subset of mineral
  spec keys.

**Effect:** twin laws become a one-row-per-mineral table. New twin laws ship
in JSON, not code.

---

### 3. `data/paramorph_transitions.json` and `data/metastability.json`

**Today:** Round 8 added `PARAMORPH_TRANSITIONS` as a module-level dict in
`vugg.py` (and the JS port). The water-solubility metastability mechanic
(8e — chalcanthite re-dissolves below salinity 4 / above pH 5) is a
hard-coded per-step hook. Both are textbook tables masquerading as code.

**Schema sketches:**
```json
// data/paramorph_transitions.json
{
  "transitions": {
    "argentite": {
      "to": "acanthite",
      "trigger": { "T_below_C": 173 },
      "preserve": ["habit", "dominant_forms", "zones"]
    }
  }
}

// data/metastability.json
{
  "rules": {
    "chalcanthite": {
      "dissolves_when": { "any": [{ "salinity_below": 4 }, { "pH_above": 5 }] }
    }
  }
}
```

**Engineering:**
- Both engines load and interpret. Run-step hooks become generic loops over
  the rules.
- Adding a new paramorph (e.g., aragonite → calcite at low T) is one JSON
  entry, not a code change in two languages plus a regression test. (The
  regression test stays — it's checking that the table is honored.)

**Effect:** mechanics that are textbook tables become tables. Round 9+ work
gets cheaper.

---

### 4. `data/narrators/<mineral>.md` — per-species narrator copy

**Today:** the narrator output is generated by `_narrate_<mineral>()`
methods (Python) and matched JS functions. Each one assembles 1-3
paragraphs of mineral-specific copy. Professor has opinions about how his
minerals read; editing copy means a developer has to hand-merge his prose
back into a Python function and then port to JS.

**This also closes the loop on `TASK-BRIEF-NARRATIVE-READABILITY` item 1.**
The blurb-dedupe rule (full on first occurrence + closing summary, terse on
later) becomes "load the markdown once, render twice with different
templates." The data layer makes the dedupe trivial; today it requires
state-tracking inside the narrator function.

**Layout:**
```
data/
└── narrators/
    ├── acanthite.md
    ├── calcite.md
    ├── ... (84 files)
    └── _shared.md      # phrases reused across species (tarnish, fluorescence templates)
```

**File shape (Markdown frontmatter for the structured bits, prose body for
the narrative):**
```markdown
---
mineral: acanthite
hooks:
  short: "Ag₂S monoclinic silver sulfide; the cold-storage form."
  paramorph_note: "above 173°C the same composition crystallizes as cubic argentite"
templates:
  tarnish: "Tarnish — surface oxidation has darkened the original lead-gray luster..."
  habit_massive: "Massive granular — the dominant economic form."
---

# Full blurb (rendered on first occurrence + closing summary)

Ag₂S — monoclinic silver sulfide, the most important silver ore on
Earth at 87% Ag by weight. The cold-storage form: above 173°C the
same composition crystallizes as cubic argentite, and most acanthite
in nature is paramorphic after cooled argentite, retaining the
cubic external form while the lattice underneath inverts to monoclinic.
[...rest of the existing narrator copy...]
```

**Engineering:**
- Both engines fetch / read the markdown set at startup.
- A shared template renderer per engine (small — string interpolation, no
  full templating engine).
- `_narrate_<mineral>()` functions become "load this mineral's hooks; pick
  the appropriate hook for first/repeat/closing context; substitute size,
  habit, traces."
- Professor can edit `data/narrators/acanthite.md` directly without ever
  opening a `.py` or `.html` file.

**Effect:** narrator copy becomes Professor's territory, not the builder's.
Round 8's "41 expanded-research narrator refresh sweep" (deferred from the
boss's research drop) becomes a markdown-edit pass instead of a 41-times-2
function-port pass.

---

### 5. (later) `data/scenarios_events.json` schema for catalog of event types

**Today:** event handlers are dispatched by string in scenario timelines.
The set of valid event types is implicit in the engine code.

**Engineering:** small JSON declaring the event-type vocabulary, what each
type's `delta` block can contain, and which ones are deterministic vs
stochastic. `tools/sync-spec.js` validates scenario timelines reference
only valid event types.

**Defer:** lower-leverage than items 1-4. Add when item 1 has shipped and
the event-type set is stable enough to be worth schematizing.

---

## Crossing all three runtimes

The same fetch/interpret pattern from `data/minerals.json` extends to all
of these:

| Runtime | Today | After this brief |
|---|---|---|
| `vugg.py` | imports `json`; reads `data/minerals.json` for mineral fields only | Reads scenarios, twin_laws, paramorph_transitions, metastability, narrators from `data/`. |
| `index.html` | fetches `data/minerals.json` at startup; inline `MINERAL_SPEC_FALLBACK` | Fetches all of the above; inline fallbacks for offline/file:// boot. |
| `agent-api/vugg-agent.js` | requires `../data/minerals.json` directly | Same pattern, all new tables. **The intentional lag stays** — agent-api may consume a subset (e.g., scenarios only, no narrators). The point is the lag becomes deliberate per-table opt-in instead of cross-engine drift. |

`tools/sync-spec.js` extends to validate every new table:
- All tables are valid JSON / readable markdown.
- All cross-table references resolve (e.g., `twin_laws` keys exist in `minerals`,
  `paramorph_transitions.to` references valid minerals, etc.).
- Each engine's interpreter is wired up to consume each table.

---

## Sequencing

Five items, but not all are equal-leverage. Suggested order:

1. **Item 1 (scenarios).** Highest leverage. Closes the `scenario_random`
   drift. Establishes the "engines as interpreters of declarative data"
   pattern for compound work — all 13 scenarios at once.
2. **Item 4 (narrators).** Compounds with `TASK-BRIEF-NARRATIVE-READABILITY`
   item 1; ship them together. The dedupe becomes free.
3. **Item 2 (twin laws).** Quick win. ~30 minutes once the pattern is set.
4. **Item 3 (paramorph + metastability).** Round 8-specific tables. Smallest
   set, clearest schema.
5. **Item 5 (event-type catalog).** Defer.

After items 1-4 land, the engine source files are noticeably smaller
(scenarios alone are ~600 lines × 2). Better yet, the per-mineral and
per-scenario delta to add new content is one JSON edit instead of two
function-ports. That's the unit of leverage we're buying here.

---

## Connection to the larger plan

This brief is the **bridging work** between the current "three engines,
duplicated logic" state and the eventual "one engine in JS, vugg.py
retired" end-state described in `vugg.py`'s top-of-file docstring. The
more state lives in `data/`, the cheaper the eventual Python drop becomes
(less procedural code to delete; the JS interpreter already exists).

It also unlocks the option-3 cross-engine baseline tests (per the
architecture review): same scenarios.json + same seed = same output
across runtimes, diffed at finish. Today that test would also need to
diff the scenario *definition* between engines; once scenarios are
declarative JSON, the test only diffs *behavior*. That's what makes the
baseline tests genuinely cheap to add.

---

## Mirror requirement: gone

Per the 2026-04-29 flatten (commit `4950ffa`), `web/` and `docs/` are
collapsed to repo root. No per-commit mirror step. Push to Syntaxswine
origin per usual. Boss promotes to canonical at review time.
