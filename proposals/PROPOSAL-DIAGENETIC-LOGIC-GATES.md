# Diagenetic Logic Gates — a paragenetic constraint solver

*Proposal, 2026-08-17. Requested by the Professor; specified by Rock Bot; scouted against the
existing catalogue before a line was designed.*

---

## The ask

> "if you have a skeletal quartz crystal and a calcite crystal on the same specimen the tool would
> tell you that the calcite had to have come after the quartz was etched because it could not
> survive the acids needed to etch quartz."

Rock Bot's correction to the shape of that ask is the design: **it is a constraint engine over
events, not another collection of mineral-to-mineral arrows.** A specimen carries

```
quartz growth  ->  quartz dissolution  ->  calcite growth
```

and the gate is not "quartz before calcite" but *if an observed alteration event requires
conditions under which mineral B could not persist, and B is intact, B postdates that event.*

## The finding that decides the build

**The catalogue already separates growth from survival.** `data/minerals.json` carries, per
species, two different families of number that must never be conflated:

| family | fields | meaning |
|---|---|---|
| **growth** | `T_range_C`, `T_optimum_C`, `MINERAL_GATES` (`js/18a-mineral-gates-types.ts`) | where a crystal can *form* |
| **survival** | `pH_dissolution_below`, `pH_dissolution_above`, `acid_dissolution`, `thermal_decomp_C` | where a crystal is *destroyed* |

This matters more than anything else in the proposal. A solver built on `T_range_C` would be
reading a growth window as a survival limit and would produce confident, wrong histories — a
mineral that merely *grows* hot is not destroyed when cold. The survival fields exist, they are
separate, and they are what the gates read.

Coverage over 184 species:

| envelope | species | |
|---|---|---|
| fluid / pH | 128 | 70% |
| thermal | 131 | 71% |
| both | 110 | 60% |
| **neither — the solver is mute** | **35** | 19% |

The mute set is geologically coherent (tourmaline, beryl and its varieties, corundum and its
varieties, several native metals) — resistant phases whose destruction is not acid-defined. The
solver must say "I cannot answer for this species", never "it survived".

## The worked example, run against real data

Vugg's quartz record does not say "acid". It says:

```json
"acid_dissolution": { "pH_threshold": 4, "requires": { "F": 20 }, "reaction": "HF etching" }
```

and calcite's says `pH_threshold: 5.5`. So the Professor's specimen resolves — and it resolves for
the *right reason*, not by a universal rule:

```
[REQUIRED] dissolution of quartz  ->  calcite
    calcite dissolves below pH 5.5, and this event ran below pH 4. Intact calcite
    therefore postdates it, and it sits on the altered surface, which fixes the
    order physically.
    cite: data/minerals.json quartz.acid_dissolution
    cite: data/minerals.json calcite.acid_dissolution
```

The gate discriminates rather than agreeing with everything: at the quartz-etch envelope
**73 species could not survive, 46 could, 65 have no datum.** Fluorite's floor sits exactly on the
boundary and returns `ambiguous` rather than a coin-flip.

## The verdict ladder

Never yes/no. Rock Bot's five, in strength order:

| verdict | when |
|---|---|
| `required` | envelope wholly outside the mineral's survival limits **and** physical superposition observed |
| `strongly implied` | envelope wholly outside survival, but only co-presence on the specimen is reported |
| `compatible` | the mineral survives the envelope — no order established, in either direction |
| `ambiguous` | no survival datum, **or** the mineral sits exactly on the envelope boundary |
| `contradicted` | the mineral could not survive, yet is reported as predating (enclosed, included) — one of the two observations is wrong |

`compatible` and `ambiguous` are different answers and must stay different. "It survives, so no
constraint" is knowledge. "The catalogue is silent" is not.

## The three honesty catches, mechanically enforced

1. **Skeletal is not etched.** A dissolution event is only created when the collector supplies a
   *texture observation*. Asserting `{kind: dissolution, of: quartz}` with no texture yields
   `DERIVED EVENTS: none usable` and a caveat naming the confusion. If the texture logged is a
   growth texture (`skeletal`, `hopper`), the event is still built but flagged loudly.
2. **No universal acid rule.** The envelope comes from the *dissolving mineral's own record*, and
   the survival test from the *intact mineral's own record*. Change either datum and the verdict
   changes. There is no hard-coded "acids that etch quartz kill calcite".
3. **Thermal needs duration.** `thermal_decomp_C` is a threshold, not a stopwatch. Every thermal
   event emits a standing caveat that exposure duration, pressure and fluid are unmodelled, and a
   boundary tie returns `ambiguous`.

## Gate families

Supported by data in the repo today:

- **fluid / pH survival** — `acid_dissolution`, `pH_dissolution_below/_above`
- **thermal survival** — `thermal_decomp_C`, `thermal_decomp_reaction`
- **redox** — `redox_requirement` on all 184 species

Supported by *observation* rather than envelope (the collector supplies the relation; the solver
just orders it):

- **coating / overgrowth** — a covered face is a physical `required` order
- **fracture / healing** — fill postdates the crack
- **inclusion** — a true inclusion predates the enclosing zone
- **etch-and-regrow** — dissolution between two growth generations

Needs data the catalogue does not yet carry (do **not** stub these):

- **hydration / dehydration water-activity limits** — partly available via `js/75-transitions.ts`
  `DEHYDRATION_TRANSITIONS`, but as a growth-side transition, not a survival envelope
- **exsolution / phase transition** kinetics
- **mutual incompatibility** requiring separate fluid episodes

## Phasing

- **D0 — the solver core.** Envelope extraction, the survival test, the verdict ladder, the
  partial order, and a CLI that prints a receipt per constraint. *Prototype exists and runs.*
- **D1 — the observation vocabulary.** The collector's checklist (etch textures, superposition,
  enclosure, fracture fill) as a typed input, and the partial-order assembly across several events
  so five observations can pin three events and honestly leave two unordered.
- **D2 — the page.** The "geological detective" panel: tick what you see, read the derived
  constraints with every cite exposed, in the Crystal Neighborhoods design system.
- **D3 — literature envelopes.** Per-claim citations for survival limits that currently rest on
  the catalogue's own numbers, and the disputes layer.

## What it must never do

- Infer dissolution from morphology alone.
- Read a growth range as a survival limit.
- Return yes/no where the ladder has five rungs.
- Treat "no datum" as "survived".
- Assemble one universal build order. The output is a **partial** order, and the unordered pairs
  are part of the answer, not a failure of it.
