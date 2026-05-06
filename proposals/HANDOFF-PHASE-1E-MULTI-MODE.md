# HANDOFF: Phase 1e completion — multi-mode dissolution dispatch

**Author:** Claude (Opus 4.7), end of 2026-05-05 session
**Audience:** the next session that picks this up cold
**Status:** infrastructure shipped; 144/185 single-mode sites migrated; 41 multi-mode sites remain

---

## TL;DR

Phase 1e (May 2026) shipped a `MINERAL_DISSOLUTION_RATES` table in
`js/19-mineral-stoichiometry.ts` and extended `applyMassBalance` to
credit fluid for negative-thickness zones via that table. Across 7
batched commits (v37→v45), 144 inline `fluid.X += dissolved_um *
RATE` blocks across all 12 engine classes were removed; behavior is
byte-identical to v37 across all 20 seed-42 scenarios.

The remaining ~41 sites can't migrate without a small design
extension. They fall into three buckets:

1. **Multi-mode dissolution** (~30 sites): one mineral, multiple
   dissolution paths at *different* effective per-µm rates.
2. **Constant credits** (~2 sites): wurtzite "sublimation" — fixed
   thickness, fixed credits, not rate-scaled.
3. **Negative S consumption** (~2 sites): acanthite + cobaltite
   subtract S during oxidation. Currently kept inline because the
   table only supports positive credits.
4. **Zone-data trace credits** (~3 sites): calcite Mn/Fe traces and
   arsenopyrite Au-trap. Computed from `crystal.zones[*].trace_X`,
   not from `dissolved_um × rate`. Genuinely not tablifiable; stay
   inline forever — that's fine.

This handoff covers a path through buckets 1, 2, 3.

---

## Detailed inventory of remaining 41 sites

### Multi-mode (30 sites across 6 minerals)

| Mineral | Mode A | Mode B | Per-µm rate diff |
|---|---|---|---|
| **pyrite** | oxidative: Fe=1.0 S=0.5 | acid (constants @ d=2.0): Fe=1.0 S=0.75 | S |
| **marcasite** | oxidative: Fe=1.0 S=0.5 | acid (constants @ d=2.0): Fe=1.0 S=0.75 | S |
| **aragonite** | polymorph (constants @ d=2.0): Ca=1.0 CO3=0.75 | acid: Ca=0.5 CO3=0.3 | both |
| **rhodochrosite** | acid: Mn=0.4 CO3=0.4 | O2: Mn=0.5 CO3=0.4 | Mn |
| **azurite** | low-CO3: Cu=0.5 CO3=0.4 | acid: Cu=0.5 CO3=0.3 | CO3 |
| **erythrite** | thermal (constants @ d=1.0): Co=0.4 As=0.3 | acid (constants @ d=1.2): Co=0.5 As=0.333 | both |
| **annabergite** | thermal: Ni=0.4 As=0.3 | acid: Ni=0.5 As=0.333 | both |
| **chrysocolla** | path A: Cu=0.4 SiO2=0.4 | path B: Cu=0.3 SiO2=0.3 | both |

(marcasite has a third event at lines 164-165 — `Fe += 1.5; S += 1.2`
with thickness=-?? — needs reading; might be a third mode or a
copy-paste from pyrite.)

### Constants (wurtzite)

```ts
// js/61-engines-sulfide.ts:45-46
conditions.fluid.Zn += 1.5;
conditions.fluid.S += 1.2;
```
Single dissolution event with constant credits, not rate-scaled.
Reading the engine reveals the matching `thickness_um` for the
returned zone — once known, the rates are `1.5/|thickness|` and
`1.2/|thickness|`. Then it's a single-mode table entry like
apophyllite (which had the same constants-with-fixed-thickness
pattern in the silicate batch).

### Negative S consumption (acanthite + cobaltite)

```ts
// acanthite line 438, cobaltite line 595
conditions.fluid.S = Math.max(conditions.fluid.S - dissolved_um * 0.1, 0);
```
The clamp prevents negative S. To migrate, the table would need
to support negative rates, and the wrapper would need to clamp:

```ts
// in applyMassBalance's dissolution branch:
fluid[species] = Math.max(0, fluid[species] + dissolved_um * rates[species]);
```

The clamp doesn't break positive rates (Math.max(0, positive) = positive).
Risk: tiny precision-equivalence concerns since the clamp now applies
universally. Verify byte-identical via the per-scenario JSON
comparison.

### Zone-data traces (3 sites — stay inline forever)

- `js/52-engines-carbonate.ts:26-27`: calcite Mn/Fe trace credits
  from zone history average.
- `js/61-engines-sulfide.ts:360`: arsenopyrite Au-trap from zone
  trace_Au sum.

These are zone-dependent, not rate-scaled. Not migration targets.
The table approach doesn't fit them and shouldn't try.

---

## Recommended Phase 1e completion design

### Step 1: Extend the table to support multi-mode entries

```ts
// js/19-mineral-stoichiometry.ts
const MINERAL_DISSOLUTION_RATES: Record<string, MineralDissolutionEntry> = {
  // Single-mode entry (existing pattern, unchanged):
  fluorite: { Ca: 0.4, F: 0.6 },

  // Multi-mode entry (new — keys are mode names, values are species-rate maps):
  pyrite: {
    oxidative: { Fe: 1.0, S: 0.5 },
    acid:      { Fe: 1.0, S: 0.75 },
  },
  // ...
};
```

Type union: `MineralDissolutionEntry = Record<string, number> |
Record<string, Record<string, number>>`. Detect nested via
`typeof Object.values(entry)[0] === 'object'`.

### Step 2: Engines signal mode via the returned zone

```ts
// engine code
return new GrowthZone({
  step, temperature: conditions.temperature,
  thickness_um: -dissolved_um, growth_rate: -dissolved_um,
  dissolutionMode: 'acid',  // <-- new field
  note: '...',
});
```

### Step 3: Wrapper dispatches on zone.dissolutionMode

```ts
// applyMassBalance dissolution branch
if (zone.thickness_um < 0) {
  const entry = MINERAL_DISSOLUTION_RATES[crystal.mineral];
  if (!entry) return null;
  const isNested = entry[Object.keys(entry)[0]] && typeof entry[Object.keys(entry)[0]] === 'object';
  const rates = isNested
    ? entry[zone.dissolutionMode || Object.keys(entry)[0]]  // default to first mode
    : entry;
  if (!rates) return null;
  const dissolved_um = -zone.thickness_um;
  for (const species in rates) {
    if (typeof conditions.fluid[species] !== 'number') continue;
    conditions.fluid[species] = Math.max(0, conditions.fluid[species] + dissolved_um * rates[species]);
  }
  return null;
}
```

The `Math.max(0, ...)` clamp simultaneously handles step 4 (negative
S consumption — acanthite + cobaltite become single-mode entries
with `S: -0.1` rate).

### Step 4: Migrate the 6 multi-mode minerals + wurtzite + acanthite/cobaltite

- pyrite, marcasite, aragonite, rhodochrosite, azurite, erythrite,
  annabergite, chrysocolla — multi-mode table entries + zone
  `dissolutionMode` tags in engines
- wurtzite — read the thickness_um, compute equivalent rates, single-mode entry
- acanthite, cobaltite — extend existing entries to include `S: -0.1`

Each commit one or two minerals. Verify byte-identical baseline at
each step via the established per-scenario JSON comparison.

### Step 5: After all migrations, simplify

Once Phase 1e is complete, the engines should have NO inline rate-scaled
credits. The wrapper handles 100% of rate-scaled dissolution. Only
zone-data trace credits (calcite, arsenopyrite Au) and pH/activity
adjustments stay inline — those are conceptually different from
mass-balance and shouldn't be tablified.

---

## What's already in place (do not redo)

| Artifact | Path | Notes |
|---|---|---|
| MINERAL_DISSOLUTION_RATES table | `js/19-mineral-stoichiometry.ts` | 69 single-mode entries |
| applyMassBalance dissolution branch | `js/19-mineral-stoichiometry.ts` | empty-entry skip, no clamp yet |
| Per-scenario diff helper | one-liner Node script in commit messages | use this, not file-level diff (CRLF/LF churn) |
| 8 baselines | `tests-js/baselines/seed42_v{38..45}.json` | each version preserves byte-identity |
| 7 migration commits | git log v38..v45 | one batch per class, all green |

`npm test` should be 63/63 green. `node tools/gen-js-baseline.mjs`
followed by per-scenario JSON comparison against the previous
baseline confirms each migration step is bit-identical.

---

## Files to read first (in order)

1. `js/19-mineral-stoichiometry.ts` — current single-mode table + wrapper
2. `js/15-version.ts` lines covering v38–v45 — full migration history
3. `js/61-engines-sulfide.ts` lines 92–192 (pyrite + marcasite) — the
   first multi-mode case to tackle
4. `tests-js/baselines/seed42_v45.json` — the bit-identical reference
5. The Phase 4b sulfate handoff (`HANDOFF-PHASE-4B-SULFATE.md`,
   completed) for the per-class commit pattern

---

## Open questions to surface to user

* Marcasite has THREE credit blocks (lines 164-165 + 181-182 +
  191-192) where pyrite has two. Investigate whether 164-165 is a
  separate (third) dissolution mode or a leftover dead code path.
* The `Math.max(0, ...)` clamp added to the wrapper would also
  apply to positive-rate species. For unmigrated positive-rate
  minerals this should be a no-op (positive rates only add), but
  worth a deliberate verify pass.
* aragonite's polymorph mode is the only place a "dissolution"
  zone is generated for what's really a *phase conversion*, not a
  fluid-recycling event. Ask the user if this should still go
  through applyMassBalance or get its own handler.

---

*This handoff captures one focused next-session entry point. Future-me
should feel free to redirect.*
