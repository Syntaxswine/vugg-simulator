# HANDOFF — the review, the rebake, and the soundtrack (2026-06-09 → 06-10)

To the next builder: I was handed three words — bugs, accuracy, Steam — and a
codebase at v176 that looked green and wasn't. Two days later it's v179, the
suite is honestly green (1779/1779, 113 files), the game has a soundtrack the
boss accepted by ear, and three catches joined the lineage in CATCHES.md.
This document is what I learned, what I believe, and what you should do next.
Read `HANDOFF-TO-THE-NEXT-BUILDER-2026-06-05.md` first if you're cold — it's
the from-zero orientation; this one is the strata laid since.

---

## What shipped (the session in commits)

| commit | what |
|---|---|
| `81b115b` | fix(build): the stale bundle — CI was RED since c1b161e, hidden by "diff length: 0 chars" (10th catch) |
| `7acbb25` | fix(strip): sulfate SI chips reachable in the selector + `strip-chip-selector-probe.mjs` guard |
| `5e2dce6` | **REVIEW-THREE-METRICS-2026-06-09.md** — the full three-axis review (read it; it's the map this session executed) |
| `51487a4` | v177 — graduated-competition cell key actually per-cell; `graduated-binding-probe.mjs` + `_gradCompStats` telemetry (12th catch: it was LATENT) |
| `61bef7c` | v178 — PWP Ea permutation fixed [k1 14.4, k2 35.4, k3 23.5] + factor re-anchor 5.0e4→1.9e4 (11th catch: the test that loved the bug) |
| `503e228` | v179 — reactivated vein's sealed interval actually quiet; NEW opt-in `wall.cooling_rate` knob |
| `2a0c001` | feat(music): two looping tracks + the ⚙ settings shell (`vugg-settings-v1` root) |
| `e8b84cd` | fix(music): volume rides a GainNode — element.volume is a no-op on iOS |
| `4f7c91f` | tune(music): default volume 0.25 |

Sweep movement across the arc: **stale 8 → 7** (borax recovered at
searles_lake), **dead 35 → 34** (tremolite revived). Boss accepted the music
by ear on the live deploy ("it works well") — channel verified, not just code.

---

## The things I learned (carry these)

**1. Start every cold session with `npm run ci`.** The suite was "green" by
reputation only — build:check had been red for a day behind a same-length
comment edit, and its own diagnostic ("diff length: 0 chars") read as
nothing-to-see. A guard's verdict outranks its summary statistic. Thirty
seconds of cold CI bought the whole review its credibility.

**2. Measure the blast radius before you narrate it.** I called the cell-key
collapse "HIGH — load-bearing." The probe (run both ways, fix stashed and
unstashed) said: latent. Rationing binds in 0.25% of allocations, only in
same-cell stacks, identically under both keys. The fix was still right — it
becomes load-bearing the day budgets tighten — but the severity was narration
ahead of measurement, and the downgrade is recorded in the review doc at the
same prominence as the claim. Build the probe WITH the fix; let it judge both
the bug and your description of the bug.

**3. A physics fix carries its calibration on its back.** The Ea pairing was
objectively wrong; fixing it alone blew up the fleet (70 mm aragonite, mvt
losing sphalerite — identity-mineral damage), because `_PWP_CALIBRATION_FACTOR`
had been tuned UNDER the wrong physics and was silently compensating. Ship
them as one move: the physics correction plus the re-anchor of whatever knob
absorbed the wrongness. And know the knob's response curve — the naive linear
rescale overshot because growth feeds back into the calibration probe's own
sampling regime. Log-interpolate, verify on the criterion that matters (fleet
baseline drift, identity minerals byte-identical), not the proxy.

**4. A green test can be load-bearing for wrong physics.** Week-11's HMC
Arrhenius test had an undersaturated fixture — it was really asserting
"dissolution decelerates with T," backwards, and only the buggy Ea satisfied
it. The corrected physics FAILED the test; that failure was the fixture
confessing. When you fix a test, pin its premise (`expect(r).toBeGreaterThan(0)`)
so it can't silently drift back to testing the wrong regime. The suite can't
tell you which side of an assertion is the bug — only the science can.

**5. Removing a wrong mechanism reveals the missing right one.** Setting
`thermal_pulses:false` on the vein (correct — v162 lesson) exposed that the
pulses had been HOLDING STAGE-1 TEMPERATURE as a side effect: 180 °C brine at
44 °C by the seal. The geologically honest replacement was a per-scenario
`wall.cooling_rate` (an open feeder advects heat; a live vein holds near brine
T until the conduit chokes) — not scripted reheats. This generalizes the v163
native_bismuth catch: when you remove a spurious mechanism, ask what real work
it was quietly doing, and supply the CORRECT mechanism for that work.

**6. Platform truths for the audio stack.** `HTMLMediaElement.volume` is a
silent no-op on iOS/iPadOS — the slider updates everything except the
loudness. Loudness must ride a Web Audio GainNode (MediaElementSource → gain
→ destination). Timing is load-bearing: wire that graph on the FIRST USER
GESTURE, never at load — a context created without a gesture sits suspended
and a MediaElementSource captures the element's output, so wiring early
SILENCES autoplay-allowed playback. Pre-gesture, element.volume carries it
(desktop-fine); post-gesture, gain owns it. `musicDebugState()` shows which
path is live.

**7. The deploy needs a hand sometimes.** Classic Pages usually rebuilds on
push in ~30 s, but this session it sat on the previous commit for 4+ minutes.
`gh api -X POST repos/Syntaxswine/vugg-simulator/pages/builds` kicks it; the
HEAD-match poll (status==built AND commit==HEAD) remains the only honest
definition of "live." Never say "go look" before it matches.

**8. Probes are data too; they rot like data.** The w9 calibration probe's
"pwp_um(x1)" column predates the very tuning it informed — it bakes the live
factor into its printed numbers, and its "recommended factor" lines assume
raw. I documented the trap in 52b rather than fixing the probe (deliberate:
the probe's history is part of the v144 record). If you touch w9, fix the
label and re-derive.

**9. The review method itself is reusable.** Three parallel deep passes (bug
hunt / mineralogical accuracy / product-readiness) + the standing checker
tools, each pass returning evidence-cited findings, then triage into
SIM-NEUTRAL quick fixes vs calibration-coupled arcs vs tune candidates. The
arc that followed executed exactly that triage. When the boss next says
"take a look," this is the shape.

---

## State of the world (v179, 2026-06-10)

- **Suite:** 1779/1779, 113 files. Baselines seed42_v179 + strip_digest_v179.
- **Coverage:** 128 live (+borax, +tremolite), 7 stale, 34 dead.
- **Music:** shipped, boss-accepted by ear. Settings root `vugg-settings-v1`
  exists (music group only — built to grow).
- **Docs:** REVIEW-THREE-METRICS-2026-06-09.md (the map, with FIXED statuses
  inline), CATCHES.md (twelve catches), BACKLOG.md (banners reconciled
  through this session).

---

## Next steps, in the order I would take them

1. **The tune-scenario pass on the 7 stale** (`vugg-tune-scenario` skill).
   Start at roughten_gill — four of the seven live there (linarite,
   leadhillite, mottramite, bayldonite) and its events are literally NAMED for
   two of them. Then: bisbee azurite (verified gate-not-cleared — its
   azurite_peak event fires, the mineral never nucleates; do NOT just add it
   to expects_species), searles mirabilite, schneeberg torbernite (0/10
   seeds; zeunerite thin at 2/10), jeffrey magnetite. Re-run
   `mineral_coverage_check` after each. Tune-watch from the v178 rebake:
   jeffrey lost aragonite+siderite (not in expects), deccan gained a
   1-crystal wollastonite (suspect at zeolite T), vein lost cerussite then
   regained it in v179 — fragile, watch it.
2. **The ehFromO2/o2FromEh asymmetry (20c) — BEFORE Movements Phase 1.** The
   saturation slopes differ 10× above O2=5; an Eh-canonical movement writing
   +800 mV snaps to +530 when its window closes. The movements arc
   (HANDOFF-MOVEMENTS-AND-BACKLOG-2026-06-01.md) is exactly the consumer
   that will trip this.
3. **The ring_fluids decision (review §1.4).** `_propagateGlobalDelta` no
   longer feeds non-equator ring_fluids; stale readers remain
   (open-atmosphere pH, Eh sync, replay snapshots, pole-vertex fallback).
   Retire the store or restore the loop — do not add a third partial mirror.
4. **The narrator/spec one-liner afternoon (review §2.4 table).** ~15
   SIM-NEUTRAL corrections: wurtzite's 95 °C "boundary" myth, flos-ferri is
   aragonite (and the misplaced calcite habit_variant), Statue of Liberty
   patina is brochantite/antlerite, hiddenite is North Carolina, scheelite UV
   prospecting is 1930s, the garbled "Iapetos-age" topaz line, and the rest.
   High reach, zero risk. While there: a literature pass on the five
   unvouched twin-law citations (millerite {30-34}, skutterudite {112},
   enargite {320}, leadhillite {140}, haidingerite {110}).
5. **Carbonate pK(T) slopes (review §2.2, js/20b).** ~5-10× too flat; cold-
   cave vs hot-travertine speciation is muted. Calibration-coupled (like
   v178) — expect a rebake, carry the factor lesson (#3 above).
6. **Steam WP1 (review §3).** The settings shell exists — grow it. Next
   bricks in order: collection export/import (the `.stripview` codec is the
   pattern; the collection is the player's whole investment in one
   localStorage key), then replace the 16 `prompt()/alert()/confirm()` sites
   with the in-game modal (Electron implements none of them — collecting a
   crystal dies in the most likely wrapper).
7. **Strip hygiene trio (review §1.6).** `axes.cells_per_ring` into the
   manifest (viewer + sonifier hardcode 120), the IDB connection leak +
   `getAll()` blob materialization in 85h, the `equilibratePHtoPCO2` pH-2.0
   clamp landmine in 20d. Small, contained, probe-friendly.

## The larger backlog

`proposals/BACKLOG.md` is current through this session — the 2026-06-09/10
banners at the top carry the review, the rebake outcome, and the music; Part
II of `HANDOFF-MOVEMENTS-AND-BACKLOG-2026-06-01.md` still holds the movements
arc's open items (the dark scaffold in 85j is wired and waiting; item 2 above
is its gate). The Steam ladder beyond WP1 (wrapper shell, objectives,
achievements, store assets) is sequenced in REVIEW-THREE-METRICS §3. The
tutorials rework remains its own slated package.

---

## Credit where the velocity came from

Nothing this session moved fast because of me alone. The cold-CI catch was
only possible because build:check EXISTS; the latency measurement because the
stash-and-rebuild loop is cheap and the suite is deterministic; the Ea
re-anchor because w9 was already written and the seed-42 baseline + strip
digest made "13/31 moved, identity minerals byte-identical" a checkable
sentence; the vein fix because v162 had already named the thermal-pulse
failure mode; the music verification because the preview harness could drive
the real DOM. I lived in those cathedrals all session. The probes I leave —
`graduated-binding-probe`, `strip-chip-selector-probe`, `musicDebugState` —
are my stones in the wall.

The rocks sing, the broth is honest about its own activation energies now,
and the next builder starts on bedrock that testifies against itself.
Erosion is the formation mechanism. Build well.
