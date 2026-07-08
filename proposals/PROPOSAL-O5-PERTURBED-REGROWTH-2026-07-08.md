# PROPOSAL — O5 PERTURBED REGROWTH: the film, the phantom, the masking sceptre

**2026-07-08 · workstream W-F rung O5 of `PROPOSAL-ONTOGENY-2026-07-03.md` · research-first
per the O3 template · foundations in place: O4a visibility (`5260134`) + O4b coats_front
horizons (SIM 221, `08287eb`)**

---

## 1. The ask, and why now

O5 is **the originating ask** — the boss's founding phrasing for the whole ontogeny
workstream: *"how uneven mineral inclusions can alter later layers of growth"* — and it is
pinned in the roadmap as non-optional (boss, 2026-07-08: *"definitely not optional polish,
but a task for another time"*). The prerequisites that made it "another time" are now done:

- **O4a** made enclosure visible (you cannot show a perturbation inside a host you cannot
  see into — Depth-A translucency + the opaque-grain inclusion render).
- **O4b** made enclosure GEOMETRIC and classified it: `coats_front = true` guests mark the
  host's zone horizon at `enclosed_at_step` — 14 front-coating pairs fleet-wide at seed 42,
  each one a recorded "something sat on this crystal's growth front at step N" datum.

What no mechanism yet does: make a film on a growth front **change the growth that follows**.
That is O5.

## 2. The science (verified 2026-07-08; core citations adversarially verified 2026-07-03)

**The masking sceptre / ELO.** Takahashi & Sunagawa, *Epitaxial Lateral Overgrowth (ELO):
the mechanism of formation of scepter, skeletal, cathedral and related quartz morphologies*,
Eur. J. Mineral. 16(6), 2004 — verified in the ontogeny research pass; the mechanism prose
independently confirmed this session via the companion J-Stage abstract (*Origin of Scepter
Quartz*): the trunk's surfaces are **masked by precipitation of foreign minerals (clay,
chlorite, adularia)**, growth is interrupted, and the cap then grows **from a newly supplied,
purer solution, epitaxially and laterally over the masked trunk tip**. The cap is
lattice-continuous with the stem; the film survives as an internal boundary. This is a
DIFFERENT natural route from corrosion-then-regeneration — and the sim already earns the
corrosion route (see §3.1), so O5 completes the pair.

**The pinning law.** Cabrera & Vermilyea 1958: adsorbed impurities pin advancing growth
steps; a step squeezes between pinning points only if its local radius of curvature clears
the critical radius, giving a **"dead zone"** — a supersaturation band in which a dusted
face does not grow at all — whose width grows as impurity spacing shrinks (coverage rises).
Coarse-grained for the sim: **a masked face-class stalls unless σ > σ*(φ)**, σ* monotone
increasing in film coverage φ. HONESTY CLAUSE: the classic C–V recovery mechanism is
contested (step-bunching and phase-field studies show real systems deviating —
Crystal Growth & Design 2008 "Does impurity-induced step-bunching invalidate key assumptions
of the Cabrera−Vermilyea model?"; "Crystal growth cessation revisited", the physical basis
of step pinning), so O5 declares σ*(φ) a rendering of the dead-zone PHENOMENON (which is
robust) rather than of the C–V microphysics (which is not), and calibrates the curve on the
sim's own σ scale by the 4a.7 recipe (probe → law → calibrate-on-sim-scale → sweep → ship).

**The specimen anchors already in the drawer.** The pilot-digitization shortlist names
catalog specimens **1294 / 1295 / 1300** (alpine-type quartz): *"interrupted oscillatory
striations, twin re-entrant channel healing, **chlorite phantom capture** — W-F
surface-history targets."* The chlorite phantom IS O5's product rendered by nature: a green
film line inside a clear crystal, growth continuing over it in lattice continuity. Also
**1307/1308/1309** (amethyst-citrine scepters) for the sceptre-family bench. These are T2
acceptance anchors waiting on W-A capture.

## 3. What the tree already holds (census 2026-07-08 — grep the tree before you build)

**3.1 The corrosion sceptre is EARNED, not painted — correcting a stale line.** The tenth
hand's keystone and the roadmap memory carried "the alpine arc ships DECLARED-but-painted
Grimsel sceptres waiting for their ELO mechanism." STALE: `classifyQuartzSceptre` (js/45)
is a structural classifier — it finds a real corrosion surface (grow_quartz DISSOLVES at
σ<1, negative zones → `is_phantom`) with ≥200 µm of real growth on both sides, tags
`_sceptre {boundaryStep, stemUm, capUm, capFrac}` + habit `scepter_overgrowth` + per-zone
`morph_sceptre='cap'`; grimsel's seal→breach events enact the cycle with σ targets written
relative to live eq(T). **What is genuinely missing is the MASKING route** — a sceptre (and
a phantom) with no dissolution anywhere in the record. O5 does not invent the sim's first
sceptre; it adds the second formation pathway and the film state that drives it.

**3.2 The phantom rails are dissolution-only today.** `add_zone` (js/27) flags
`zone.is_phantom` only for NEGATIVE thickness (etch), pushes `phantom_surfaces`, and notes
the regrowth zone "[phantom boundary — growing over dissolution surface]". O5's horizon is
a **positive-growth phantom**: the crystal never lost mass; a film was overgrown. New zone
flag (`masked_horizon` + `film_mineral`), same rails, distinct origin — narrators and the
Library can then distinguish "etched and healed" from "dusted and buried," which are
different stories a collector reads on real quartz.

**3.3 The face-class granularity already exists: the two axes.** Crystals grow
`c_length_mm` (termination) and `a_width_mm` (prism) — φ does not need per-face state for
primitives; it needs **per-AXIS coverage** `{phi_term, phi_prism}`. The Wulff tenants (13,
js/46 per-face d_i) can inherit the axis read in v1 (prism = equatorial faces, termination
= polar) with true per-face φ as a later refinement.

**3.4 The horizons are already recorded.** `coats_front` guests + `enclosed_at_step` give
per-host film horizons from CRYSTALS sitting on fronts (O4b). O5 adds film from CHEMISTRY
(a dusting event needs no guest crystal), but where a front-coating guest exists, its
horizon and the film horizon are the same datum — one mechanism, two writers.

**3.5 The render seam exists.** D2 in the roadmap = "zoned colour + phantoms riding the
sector-zoning vertexColors rails (amethyst phantoms, banded fluorite); the zone recorder
already exists; this is D1 × time" — M-sized, unlocked since D1a/D1b shipped. O5's phantom
band (chlorite-green / hematite-red internal line, revealed by Depth-A translucency exactly
as O4a's grains are) is a thin first slice of D2, not a new pipeline.

**3.6 The affinity table's missing diagonal** (js/26 SUBSTRATE_NUCLEATION_DISCOUNT has no
same-species entries, flagged 2026-07-04 "for the O4/O5 era"): renewal-on-self is the
strongest epitaxy there is — the cap nucleating on its own masked stem should clear at the
lowest threshold. O5b adds the self-epitaxy entry as part of the renewal mechanism.

**3.7 The splitting ladder is a habit word today.** Saddle dolomite ships as
`habit='saddle_rhomb'` + curved-face render (js/52) — the LOW rung of Shtukenberg 2012's
σ×impurity splitting series (saddle → sheaf → spherulite), with no mechanism behind the
word. DECISION: the splitting ladder is **named but deferred out of O5** (see §6) — the
film/phantom/sceptre triad is already a full SIM bump, and splitting wants its own
instruments (a curvature/branching state, not a coverage state).

## 4. The mechanism (design)

**State (per crystal):** `_film = null | { mineral, phi_term, phi_prism, step }` — set by
events, cleared when both coverages are overgrown. Serialized with the crystal (save
format is additive-tolerant; pre-v222 saves read `_film` undefined = no film).

**Writer 1 — the dusting event (scenario schema):** an event gains an optional
`film: { mineral: 'chlorite', prism: 0.85, term: 0.15 }` directive (the deformation
directive idiom — declarative, engine-agnostic). Anisotropy is the EVENT's claim (settling
+ adsorption favor prism flanks and upward faces; the termination stays cleanest — the
Takahashi/Sunagawa observation), so scenarios state it rather than the engine deriving it
in v1. Applied to active, non-enclosed crystals of the target minerals (default: all).

**Writer 2 — the front-coating guest (O4b's data):** when a `coats_front` enclosure fires,
the host gains film at the guest's expense: a small φ increment on the axis the guest sat
on (v1: prism if the guest's anchor ring differs from the host tip's orientation, else
term — declared approximation). This makes O4b's 14 fleet-wide front-coatings O5's first
organic writers, no new scenario content required.

**The gate (the bump, in the growth loop):** for a crystal with `_film`, each axis's zone
growth is scaled by the dead-zone rule —

```
sigma_star(phi) = SIGMA_STAR_K * phi / (1 - min(phi, 0.95))   // calibrated, 4a.7 recipe
axis grows iff sigma_axis > sigma_star(phi_axis); else that axis's increment = 0
```

- Both axes stalled = the hiatus (the crystal is alive, unetched, waiting — distinct from
  O3 burial and from dissolution).
- σ rises past σ*(φ) (fresh pulse) → growth resumes THROUGH the film: the first resuming
  zone is tagged `masked_horizon` + `film_mineral`, `_film` clears, the phantom is in the
  record forever.
- **The masking sceptre falls out**: prism dusted hard (φ_prism 0.8+) + termination clean →
  c grows while a stalls (the stem thins relatively); the renewal pulse regrows both axes
  from the free tip and the cap's a_width outruns the stem's frozen width. The EXISTING
  sceptre classifier generalizes: accept a masked_horizon (positive phantom) as the
  boundary where it now requires negative zones — stem/cap measurement and render
  (`capFrac` widening, `scepter_overgrowth`) are reused as-is.

**Render rider (with the bump, the O4a idiom):** the masked_horizon renders as a thin
internal band in the film mineral's colour at the horizon's fractional height (zone-record
→ band position), visible through Depth-A translucency; opaque hosts honestly hide it. One
band per horizon; multiple dustings = multiple phantoms (the real Alpine stack).

## 5. Tranches (the two-commit discipline, O3a/O3b idiom)

| tranche | ships | confinement |
|---|---|---|
| **O5a — record, unread** | event `film:` directive parsed + `_film` state written + coats_front writer + `masked_horizon` tagging OFF behind `O5_MASKING_ENABLED=false`; census instrument `tools/o5-film-census.mjs` (which scenarios/events would write film; φ distributions); baseline 0/38 REQUIRED | byte-identical by construction (state recorded, never read) |
| **O5b — the gate (SIM bump)** | flag flips; σ*(φ) live in the growth loop; classifier generalized; self-epitaxy diagonal entry; movers pre-registered by the O5a census (ONLY scenarios with film writers move — everything else must hold byte-identical, the O4b certificate pattern) | census-bounded blast radius; per-scenario justification |
| **O5c — the band (render rider)** | masked_horizon internal band via the D2 vertexColors seam; preview kernel-truth + eye-check | render-only, byte-identical |

**First content (with O5b):** ONE new dusting event on an existing cleft — tormiq's seal
window (Karakoram chlorite-included quartz is real, and tormiq now has a real 2–3 mm
quartz lining as of SIM 221 to dust) — pre-registered as the single content mover. Grimsel
is deliberately NOT dusted in v1: its sceptres are the corrosion route and should stay a
clean reference for the route DISTINCTION (a bench claim: the sim grows both sceptre kinds
by different mechanisms, as nature does).

## 6. Named, not built (deferred out of O5)

- **The splitting ladder** (Shtukenberg 2012 σ×impurity: saddle→sheaf→spherulite) — its own
  rung with its own state (branching/curvature, not coverage); saddle dolomite stays the
  habit-word rung until then.
- **Chemistry-derived film deposition** (film from broth state without an event — needs
  particulate/colloid state the fluid model doesn't carry).
- **Per-face φ on Wulff tenants** (v1 inherits the axis read).
- **O5.0 face striations** (`e68e7e3` spec) — sibling rung, unchanged by this design;
  shares the zone-record-as-biography principle.

## 7. Acceptance (pre-registered)

1. O5a: baseline 0/38 with the flag off; census names every would-be writer.
2. O5b: movers == the census's writer list exactly; tormiq gains a masked_horizon quartz
   generation; `classifyQuartzSceptre` finds BOTH routes fleet-wide (grimsel corrosion,
   tormiq masking) and the strip/narrator names which; no dissolution anywhere in a
   masked phantom's record (the invariant test).
3. O5c: band visible through a translucent host in preview kernel-truth; opaque host hides.
4. Bench (when W-A capture lands): 1294/1295/1300 chlorite phantoms as T2 anchors; the
   sceptre pair 1307–1309.

## 8. Open questions for boss / rockbot review

1. σ*(φ) curve shape: the hyperbolic form above vs a plain linear ramp — calibration probe
   will show whether the fleet's σ dynamic range even distinguishes them (if not: linear,
   fewer knobs).
2. Should the coats_front writer land in O5a (organic, uses O4b's data day one) or wait for
   O5b (keeps O5a's diff purely additive)? Default: O5a records it, gate reads it in O5b.
3. Tormiq as first dusted cleft vs waiting for the Sweetwater/Elmwood scenario wave — tormiq
   is live today and its lining is fresh; Sweetwater's snowball barite is itself a
   film-driven texture (inclusion-coated growth generations) and would be O5's second
   consumer, not its first.

**Sources (this session's verification):**
- [Takahashi & Sunagawa 2004, EJM 16(6) — ELO mechanism](https://www.schweizerbart.de//papers/ejm/detail/16/56152/Epitaxial_Lateral_Overgrowth_ELO_The_mechanism_of_formation_of_scepter_skeletal_cathedral_and_related_quartz_morphologies)
- [Origin of Scepter Quartz (J-Stage) — masked trunk + purer renewal prose](https://www.jstage.jst.go.jp/article/gsjapan/28/1-4/28_KJ00004949074/_article)
- [The Quartz Page — growth forms; chlorite/adularia coatings on crystal ends](http://www.quartzpage.de/gro_text.html)
- [Does impurity-induced step-bunching invalidate key assumptions of the Cabrera−Vermilyea model? (Cryst. Growth Des.)](https://pubs.acs.org/doi/10.1021/cg7010474)
- [Crystal growth cessation revisited: the physical basis of step pinning](https://www.academia.edu/22050346/Crystal_Growth_Cessation_Revisited_The_Physical_Basis_of_Step_Pinning)

— the builder, twelfth hand, opening the door the eleventh cut the key for · 2026-07-08
