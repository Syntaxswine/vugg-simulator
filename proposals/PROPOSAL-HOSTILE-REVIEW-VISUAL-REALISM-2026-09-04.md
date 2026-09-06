# HOSTILE REVIEW — how true to life do the rendered crystals look? (2026-09-04)

**Ask (boss):** a hostile review of the simulator judged on one question — could a rendered crystal
pass for a photograph of a real one? 10/10 = indistinguishable from a photograph. Target: **7/10**.
Include an actionable plan; build whatever testing tools are needed; fix bugs on sight.

**Verdict: 2/10 today.** The picture is a schematic of the science, not a photograph of a rock.
Every one of the 40 frames photographed from the shipped renderer contains **zero specular
highlight pixels**, where the boss's own specimen photographs carry a median of one percent.
Transparent minerals are alpha-blended cellophane, sulfides are matte plastic, the wall is a
lathe-turned wooden bowl, and — the finding that changes the priority list — in most scenarios
the largest thing on screen is not a crystal at all but a carpet of 17 mm octagonal "coins"
standing in for coatings. Three of those defects were bugs and are fixed in this commit; the
rest is a render-layer plan whose first two rungs were prototyped live in the review rig and are
shown below with numbers.

**The science is not the problem.** The engine already holds per-face Wulff distances, phantom
horizons, inclusions, sector zoning, trace chemistry, lustre and diaphaneity for 95 species, and
crystallographic systems for 179. The camera simply never sees most of it. Getting to 7/10 is a
rendering programme, and none of it moves a baseline.

Evidence lives under `.local-evidence/photos/` (never committed; regenerate with the commands in
§9). Every claim below names the frame it was read from.

---

## 0. What 10/10, 7/10 and 2/10 mean

| score | reads as | what it needs |
|---|---|---|
| 10 | a photograph of a specimen, at any zoom | path-traced glass, measured BRDFs, micro-geometry, real matrix, lens/sensor model |
| **7 (target)** | obviously a mineral specimen; a careful viewer notices it is CG on close inspection | image-based lighting + shadows, physically-based transmission with body colour, lustre-driven materials, true crystallographic forms for the common species, mm-scale coatings, a rock-textured wall, a photographic camera (exposure, DOF, background) |
| 5 | a good game render of crystals | everything in 7 minus DOF/matrix texture |
| **2 (today)** | a labelled diagram of a geode | — |

Frames were scored against the boss's own catalog photographs (twelve, listed in §3.2) rather
than against literature: the specimen is the terminal verification
(`feedback_terminal_verification_specimens`).

---

## 1. Method — the instrument built for this review

**`tools/photo-rig.mjs`** runs the *built* game in a headless Chrome it owns (the
`browser-workflow.mjs` launch recipe), drives the real Creative-mode entry point
(`startScenarioInCreative` → `run_step` × the scenario's own duration), forces the Three.js path,
and reads the WebGL framebuffer back as PNG in the same task as the draw call. Nothing is
re-implemented; what is photographed is what the player gets (`feedback_photograph_the_real_renderer`).

- **Shots.** `cavity` = the game's own camera rig at a fixed tilt/zoom. `hero` = the N largest
  crystal bodies framed 3/4 from their own c-axis, camera kept inside the cavity, the game's
  inside/outside lighting switch applied. `druse` = the densest patch of crystals.
- **Roster.** Every mesh: kind (crystal body / satellite / coating swath / phantom band),
  mineral, habit → token, material (colour, opacity, roughness, metalness, transmission, IOR),
  rendered extent, instance count. The material census a review can quote.
- **Statistics** on every frame and on reference photographs through one definition (in-page
  canvas readback for JPEGs): mean luminance, mean saturation, **highlight fraction** (pixels
  brighter than 235 — specular pops), dark fraction, **edge fraction** (strong-gradient pixels —
  how busy a surface is), a 16-bin histogram. A picture can be argued with; a number can be
  tracked across rungs (`feedback_measure_the_artefact`).
- **Prototype experiments** (`--experiment envlight,glass,halfcut,swathoff`) mutate the live
  scene after the game's own render pass so a recommendation can be *shown*: an environment
  map with shadows and filmic tone mapping; physically-based transmission with per-species IOR;
  the cut-geode presentation; and an ablation that hides the coating swaths.
- Manifests, contact sheets and PNGs are written to `.local-evidence/photos/<scenario>-s<seed>[-label]/`,
  the one directory the identity hash excludes, so the rig never kills a running test suite.
- **Rig facts:** Chrome 152, ANGLE D3D11 on an RTX 3080, three r163, 1200×900, seed 42,
  scenario-default durations. ~20 s per scenario.

**Rubric** (nine axes, §4) was drawn from what the reference photographs actually contain:
Fresnel highlights and sparkle on every fresh face; transparency with depth (inclusions,
cleavage flashes, deeper colour in thicker parts, the substrate seen *through* the crystal);
face micro-texture (striations, hillocks, frosting, chipped edges); colour variation within one
crystal (zoning, phantoms, iron stain); messy aggregates (size distribution, sub-parallel
groups, interpenetration); a textured matrix; contact shadows; and a camera (exposure, depth
of field, a background).

---

## 2. Findings — what the player sees today, and which code draws it

Each finding: **what the frame shows → why (code) → severity for the 7/10 goal.**
Severity: ★★★ blocks 7/10 on its own · ★★ large · ★ visible.

### F1 ★★★ Coatings render as a carpet of 17 mm octagonal coins — FIXED (three parts)
*Frames:* `elmwood-s42/cavity.png`, `elmwood-s42-hidden/hero-1-fluorite.png`, `mvt-s42/druse.png`,
`deccan_zeolite-s42/cavity.png`, `schneeberg-s42/cavity.png`, `sicily_solfifera-s42/cavity.png`.

The SIM 246 surface-fabric tranche (`4e7e77d` → `2312c33`, 2026-08-06/08) represents every
area-covering aggregate as an `InstancedMesh` of "representative" patches. Three things went
wrong at once, and together they dominated eleven of the twenty-eight scenarios photographed:

1. **Size.** The instance cap was 128 (56 mobile), and each patch's radius was derived from
   *covered area ÷ count*. A 90%-covered 45 mm cavity therefore needs ~17 mm patches to add up,
   and `SphereGeometry(0.5, 8, 5)` flattened to a plate is an octagon. Result: coins.
2. **Classification.** `surfaceGrowthRegimeFor` trusted the nucleation `vector` over the habit.
   The Elmwood **14 mm scalenohedral calcite** — the dogtooth the boss eye-checked on 2026-07-24 —
   carried a stale `vector:'coating'` from its druzy birth, was classed `botryoidal_crust`, had
   its body *suppressed* (`_addCrystalParentRepresentation` returns false for any
   `_surfaceGrowth`) and was painted as 116 cream coins. Stilbite plates, heulandite, pectolite,
   prehnite, greenockite and cassiterite met the same fate.
3. **Mass.** Coverage was `wall_spread × maturity` with no reference to booked volume. A
   **0.008 mm cassiterite grain** in `gem_pegmatite` claimed 23% of the wall (38 coins of 50 mm
   extent); `deccan` carried 17 swaths of 1620 instances.

**Fix (this commit, render-facing only — `_surfaceGrowth` has no simulator consumer, so every
baseline is untouched):**
- `js/45`: a euhedral habit (`prismatic|tabular|bladed|rhombohedral|scalenohedral|cubic|octahedral|
  tetrahedral|dodecahedral|dipyramid|pyramidal|sheaf|bowtie|coffin`) is never a crust; with a
  coating vector it is a *druse* of small individuals below 2 mm and a single body (no swath) at
  or above. The dogtooth is back (`elmwood-s42-fixed2/hero-2-calcite.png`).
- `js/45`: coverage is capped by mass — the booked volume must cover the claimed area at least
  2 µm thick (`SURFACE_GROWTH_MIN_FILM_MM`), else the crystal has no fabric yet. Dust no longer
  paints walls: schneeberg 22 → 4 swaths, deccan 17 → 9, gem_pegmatite 1 → 0.
- `js/99i`: instances are sized at a physical 1.5 mm footprint with caps 1536/384, the lobe is a
  12×8 sphere, and a botryoidal lobe's height is bounded by 3× the record's mean thickness (a
  hemisphere's mean thickness is 2r/3) — a 2 µm blanket is a thin bumpy skin, a thick malachite
  crust grows real lobes. (The first cut of this fix let lobes grow to their footprint and buried
  the dogtooth under balloons — `elmwood-s42-fixed/hero-2-calcite.png` — hence the mass bound.)
- Tests: `tests-js/surface-growth.test.ts` (two new cases, caps re-pinned with the reason),
  `surface-growth-three-integration.test.ts` green.

**Still open under F1 (plan R3):** a laminated lining is a *continuous* shell, not overlapping
tiles; a druse's teeth should be sized from the aggregate's own crystal size; the "representative
instance" idea should give way to wall-conformal displacement + normal maps for thin coatings.

### F2 ★★★ No specular reflection anywhere
*Every frame.* Highlight fraction is **0.0000 in all 40 frames**; the reference photographs run
0.0002–0.036 (median 0.010). Cause: one `AmbientLight(0.55)` + one `DirectionalLight(0.9)`, no
`scene.environment`, `toneMapping = NoToneMapping`, `shadowMap` off (`js/99i _topoInitThree`).
A `MeshPhysicalMaterial` with nothing to reflect is a Lambert surface; the sulfides' `metalness
0.45` merely darkens them. **Prototype `envlight`** (procedural three-panel studio baked through
`PMREMGenerator`, ACES filmic, PCF shadows): highlight fraction 0 → 0.0028 on the elmwood cavity,
edge fraction 0.010 → 0.030, contact shadows appear between crystals
(`elmwood-s42-envlight/cavity.png`). One afternoon of work; render-only.

### F3 ★★ Cubic minerals drawn as hexagonal prisms — FIXED
*Frames:* `tn457_barite_pulses-s42/hero-1-sphalerite.png` (honey sphalerite as six-sided
translucent columns), `elmwood-s42` roster (`sphalerite … token prism`).
`_habitGeomToken` fell to the hexagonal default for `tetrahedral`, `disphenoidal_{112}`,
`cubic_high_T`, `cubic_galena_structure`, `cubo_octahedral`, `pseudo_cubic`, `equant_octahedral`.
**Fix:** a `tetrahedron` token + `_makeTetrahedron()` (regular, face-attached, apex to the void),
wired through every isometric gate (uniform scale, satellites, half-form, O2 convex set, cluster
pattern, aspect table); cubic-named habits route to the cube. `tn457_barite_pulses-s42-sph-solid3/
hero-1-sphalerite.png` shows the amber tetrahedra against the wall (and `-sph-hidden` without it).
Test: `tests-js/sphalerite-tetrahedron.test.ts`.

### F4 ★★ The shape audit was reporting fixed things as broken — FIXED
`tools/morph-fidelity-audit.mjs` listed **75 mis-shaped minerals**; 51 of them had been redirected
to system-aware prisms by `CRYSTAL_SYSTEM` (`js/99i`, 2026-06-23) for ten weeks. The instrument
did not model the gate it audits (`feedback_aid_must_match_the_gate`). It now reads the renderer's
own map from source, reports the redirect, warns when the map disagrees with `structural.json`,
and knows the tetrahedron/cube routes. Honest residue: **21 mis-shaped**, all `spike` tokens
(needle habits of monoclinic/orthorhombic minerals — a hex-pyramid needle is a minor sin) plus 5
cubic-as-prism natives/grains, plus tigers_eye/tincalconite with no sourced system.

### F5 ★★★ Transparency is an alpha ghost, not glass
*Frames:* `tn457_barite_pulses-s42/hero-2-barite.png`, `amethyst_geode-s42/druse.png`,
`elmwood-s42-hidden/hero-1-fluorite.png`. Depth-A maps clarity to `opacity = 1 − 0.70·clarity`
with `transmission 0` — the boss's fixed decision of 2026-07-01 ("NO faked refraction"). Real
transmission is not faked refraction: it *is* refraction, with the species' measured IOR (quartz
1.55, calcite 1.66, fluorite 1.43, sphalerite 2.37, cerussite 2.08…) and Beer–Lambert body colour
over the crystal's own thickness. **Prototype `glass`** applies exactly that to the ten
transparent bodies in elmwood; because the alpha ghosts also wrote depth, overlapping translucent
crystals today read as paper cut-outs (`tn457 … hero-2-barite.png`). **This needs a new boss
decision** (§7-D1); the rest of the plan does not depend on it.

### F6 ★★ Lustre is data, not pixels
94 species carry verified `optics.lustre` (metallic / adamantine / vitreous / pearly / resinous /
silky / dull) that nothing consumes; materials use two class heuristics (`metalness 0.45` for
sulfide/native else 0.08; `roughness 0.42/0.62`). Galena and pyrite are grey and brass matte
lumps (`mvt-s42-fixed2/cavity.png`); cerussite has no fire; selenite has no pearly {010}. Boss
called Depth-B "really low priority" on 2026-07-03 — at a 7/10 target that priority inverts
(§7-D2), and the consumer is ~40 lines in `buildCrystalMaterial`.

### F7 ★★ Bodies are minimal primitives, not crystallographic forms
Only six Wulff tenants (fluorite, galena, calcite, wulfenite, barite, titanite) carry real face
sets. **Quartz** — the most common species in the catalog (179 specimens) and in 13 scenarios —
is a hexagonal prism with a *pyramid* (`_makeHexPrismWithPyramid`): six equal triangles meeting at
a point, not the r/z rhombohedra at 38° with unequal development, no horizontal striations.
Selenite is a beveled octagonal tablet; dolomite a stretched octahedron; halite/fluorite a
`BoxGeometry`. Edges are razor-sharp everywhere; faces are perfectly flat; nothing is chipped.

### F8 ★★ The wall is a lathe-turned bowl with a golf-ball skin
*Frames:* `wittichen-s42/druse.png` (parallel ridges — the ring tessellation), `mvt-s42-fixed2/
druse.png` and `elmwood-s42/druse.png` (honeycomb dimples — the per-cell relief AO). The cavity is
a per-ring/per-cell radial mesh with a normal+AO map tiled by cell; no albedo texture, no
roughness map, no rock. A real vug wall is granular host rock with a drusy micro-crust and iron
stain. Also: `cooling-s42/cavity.png` shows the whole orb honeycombed from outside.

### F9 ★★ Presentation: a translucent orb in a black void
The default view (`wallDisplay 0`: BackSide at 0.40 opacity) reads as a sci-fi sphere, not a
geode. Real geodes are photographed cut open. **Prototype `halfcut`** (a clip plane through the
origin facing the camera, wall opaque) turns the elmwood orb into a bowl with a druse rim
(`elmwood-s42-envlight+glass+halfcut/cavity.png`), and edge fraction rises to the photograph range
(0.04–0.08).

### F10 ★ Cluster and coating artefacts
Satellites share the parent's material and scale (0.25–0.95×) — a druse has no size distribution
tail; the barite tablet rosettes stack into visible moiré (`tn457 … hero-2-barite.png`); the
2 mm/1.5 mm visibility floor turns sub-mm nucleates into uniform pebbles; hopper texture draws as
thin white polygon outlines on halite (`searles_lake-s42/druse.png`).

### F11 ★ Naica reads as grey cardboard boxes
`naica_geothermal-s42/hero-1-selenite.png`: the giant selenite blades are beveled octagonal
tablets at clarity 0.95 → opacity 0.34, grey-beige over a brown wall. No blade taper, no
pearly sheen, no water-clear read (the goal Depth-A named). Halite/selenite in
`great_salt_plains-s42/hero-1-selenite.png`: the frame is filled by the ridged wall.

### F13 ★ (canonical debt) the guided-tutorial receipt binds UI ids to the render's allocation count
Found during the transplant onto SIM 285. Two constants in the guided-tutorial receipt moved;
the simulation-state fingerprint (the science) matched byte for byte.

1. **The simulation run id is the durable strip DATASET digest**, and the strip recorder writes
   each crystal's surface-growth record into that dataset as testimony (`js/85g` line 489,
   `surface_growth: c._surfaceGrowth`). F1 changed that record (euhedral crystals are no longer
   crusts; coverage is mass-floored), so the digest moved. This is the honest consequence of
   correcting recorded testimony, and it sharpens the F1 claim: `_surfaceGrowth` has no
   *simulator* consumer, but it is *recorded* as testimony. The v271 archive had no such field
   (hence the fork-base rebake was byte-identical); the SIM 285 archive does, so the canonical
   rebake moved it — **30 of 41 stories and all 41 claim cards, with every differing leaf under
   `surface_growth`** (regime ×220, whole-record null↔record ×214, coverage/area/thickness ×344,
   stratigraphy lists ×6176) plus the envelope hashes; the seed-42 scenario baseline and the
   12-story chemistry digest came back byte-identical and all four simulation fingerprints in
   the guided receipt are unchanged. Drift from corrected testimony, not from moved science
   (`feedback_accuracy_over_determinism`).
2. **The collection record id draws from the QA-pinned `Math.random` stream**, which three.js
   also consumes for every object UUID it allocates; a render change that allocates a different
   number of geometries or materials before the "Collect topaz" click shifts the suffix
   (`cry-16-33x` → `cry-16-rt2`). That is a position-not-identity coupling
   (`feedback_identity_not_index`): every render rung will re-pin it. The durable fix is to draw
   UI ids from a stream the renderer cannot touch — canonical's call.

Both constants are re-pinned in this branch with the mechanism recorded beside them.

### F14 ★★★ Inside the cavity, the wall was not drawn at all — FIXED (R1, 2026-09-05)

Every hero and druse frame in §3 has a black background. The review read that as F9
(presentation) and moved on; it was a culling bug. `_topoApplyWallDisplay` switched the
cavity material to `FrontSide` whenever the camera crossed inside (the E4 "flythrough"
contract), but the shipped W-K cavity surface (`js/23-geometry-wall-mesh.ts`) builds its
normals **outward** by construction, and the photo rig's `wall2side` probe measured them so
on the live geometry (mean n·p > 0). From inside a closed shell with outward normals every
face is a back face, so FrontSide drew nothing: slivers of wall where the surface folded,
void everywhere else. The proof was in the statistic before it was in the picture — the
hero frame's dark fraction was 0.59123 under the legacy lights and 0.59123 under the R1
rig, identical to five decimals, which no lit surface produces. Two-sided, the same frame
is rock from edge to edge (elmwood s42 hero: mean L 46 → 106, dark fraction 0.59 → 0.00).
`DoubleSide` is winding-agnostic (the legacy ring mesh may wind the other way) and free from
inside a closed shell. Every zoomed-in view the player has reached since the MC wall landed
has been the void; this is the single largest change to what the eye sees in R1.

### F12 ★ Photo-rig limitations found while using it (kept honest)
The hero camera can end up behind a cavity bump, looking at the wall's matrix skin (the tn457
`hero-1-sphalerite` frames in `-s42` and `-s42-fixed2` are that wall). Fixed this session with a
two-sided raycast from the subject toward the camera — which also had to borrow
`THREE.Mesh.prototype.raycast`, because the game disables the cavity's raycast for its own
crystal-only hit tests (`-sph-solid3` is the corrected frame). The druse picker chooses the
densest cluster *including* satellites and often lands on a wall patch. Both are tool debts,
not renderer findings.

---

## 3. Measurements

### 3.1 Renders (seed 42, cavity shot) — before this commit → after
| scenario | swaths before → after | instances before → after | mean L | edge fraction | highlight |
|---|---|---|---|---|---|
| elmwood | 8 → 6 (calcite/chalcedony bodies restored) | 663 → 3750 (thin skin, 1.5 mm lobes) | 23.5 → 21.6 | 0.010 → 0.021 | 0 → 0 |
| mvt | 6 → 4 | 544 → 451 | 18.1 → 14.9 | 0.011 → 0.021 | 0 → 0 |
| deccan_zeolite | 17 → 9 | 1620 → 639 | 16.3 → 8.5 | 0.014 → 0.009 | 0 → 0 |
| schneeberg | 22 → 4 | 1686 → 143 | 18.0 → 12.0 | 0.009 → 0.014 | 0 → 0 |
| gem_pegmatite | 1 → 0 (cassiterite dust) | 38 → 0 | 16.5 → 15.8 | 0.008 → 0.007 | 0 → 0 |
| sicily_solfifera | 4 → 4 | 444 → 1560 | 20.2 → 20.1 | 0.008 → 0.013 | 0 → 0 |
| amethyst_geode | 2 → 0 (chalcedony below the mass floor) | 203 → 0 | 14.6 → 6.8 | 0.019 → 0.0004 | 0 → 0 |
| tn457 / naica | 0 → 0 | — | unchanged | unchanged | 0 |

The amethyst geode going dark is *honest*: the sim books almost no chalcedony there (c 0.08–0.15 mm),
so the agate rind the real geode has is a science gap, not a render one (§8).

### 3.2 Renders vs the boss's photographs (same statistic, same code path)
| set | n | highlight fraction (median, range) | edge fraction (median, range) | mean L (median) |
|---|---|---|---|---|
| shipped renders, all shots | 40 | **0 (0–0)** | 0.009 (0.0003–0.024) | 23 |
| after F1/F3 fixes, cavity | 10 | 0 | 0.013 | 14 |
| + prototype `envlight` (elmwood) | 3 | 0.0028 / 0.0012 / 0 | 0.030 / 0.024 / 0.001 | 27 / 141 / 124 |
| + `envlight,glass,halfcut` (elmwood, fixed build) | 4 | 0 / 0 / 0 / 0 | **0.043 / 0.078 / 0.084 / 0.081** | 22 / 106 / 109 / 119 |
| catalog photographs | 12 | **0.010 (0.0002–0.036)** | **0.081 (0.026–0.243)** | 120 |

Photographs used (catalog ids): 1061 Elmwood calcite on fluorite · 853 Elmwood calcite cluster ·
1135 pink saddle dolomite · 553 Chittenango celestine (microscope) · 1309 amethyst sceptre · 1229
vanadinite on barite (microscope) · 922 Mexican sphalerite · 1079 Kelly smithsonite · 923 Papiol
green fluorite · 907 Carlsbad hopper halite · 858 Cumberland barite · 1342 Guanajuato amethyst.
Caveat: the photographs include mats, boxes and hands; the numbers bracket, they do not certify.
Highlight fraction in the `halfcut` frames is 0 because the cut faces the studio's dark side —
the environment's panels need to face the opening (plan R1 places the key at the cut).

### 3.3 Rubric scored
| axis | today | evidence | 7/10 needs |
|---|---|---|---|
| form / crystallography | 3 | six Wulff tenants; quartz is prism+pyramid; sphalerite was hex (fixed) | Wulff quartz/sphalerite/pyrite/gypsum/dolomite/aragonite/topaz; chamfers |
| aggregate / druse | 2 | coins (fixed to lobes/skin), uniform satellites, no size tail | lognormal sizes, sub-parallel groups, mm coatings as displacement |
| surface micro-texture | 1 | flat faces, razor edges (striations only on pyrite/quartz gwindel) | striation/hillock normal maps per face family, edge wear |
| transparency / interior | 2 | alpha 0.3–0.7, depth-written; phantoms as shells | transmission + IOR + attenuation; inclusions through glass |
| lustre / specular | 0 | highlight fraction 0 everywhere | IBL + shadows (R1); lustre→material (R2) |
| body colour | 6 | D1a/D1b lexicon is right; zoning not visible | per-crystal clarity modulation, zoning bands under glass |
| lighting / shadow | 1 | ambient + one directional, no shadows | three-panel studio env, shadow-casting key, AO |
| wall / matrix | 1 | ridged honeycomb, no albedo | triplanar rock albedo/normal/roughness, drusy micro-crust, stain |
| camera / presentation | 1 | orb in a void, no exposure/DOF | cut-geode, exposure, DOF for macro, background cloth |

---

### 3.4 R1 fleet sweep (2026-09-05) — orb view, every scenario, one build

The R1 cave mood against the pre-R1 lights on the SAME build (`--experiment legacylight`), so only the lighting differs. The orb view is the process view the player opens on: a translucent shell in a black void, so the frame mean tracks orb size and the void-stripped subject mean is the number that lighting moves. Hero/druse pairs for the two gate scenarios are in §5 R1 (elmwood) and below (tn457).

| scenario | void | legacy L | R1 L | legacy subject L | R1 subject L | ratio | legacy edge | R1 edge |
|---|---|---|---|---|---|---|---|---|
| amethyst_geode | 0.91 | 6.8 | 6.3 | 21 | 25 | 1.19 | 0.0004 | 0.0006 |
| asbestos_hills_crack_seal | 0.89 | 15.5 | 15.9 | 96 | 112 | 1.17 | 0.0254 | 0.0455 |
| asbestos_hills_surficial_alteration | 0.82 | 21.0 | 21.8 | 82 | 103 | 1.26 | 0.0368 | 0.0607 |
| bisbee | 0.83 | 17.7 | 17.8 | 70 | 81 | 1.16 | 0.0329 | 0.0512 |
| chiastolite_hornfels | 0.92 | 7.6 | 6.8 | 33 | 33 | 1.00 | 0.0063 | 0.0064 |
| colorado_plateau | 0.86 | 12.2 | 10.9 | 48 | 48 | 1.00 | 0.0169 | 0.0183 |
| cooling | 0.85 | 9.7 | 9.6 | 32 | 38 | 1.19 | 0.0007 | 0.0011 |
| deccan_zeolite | 0.91 | 8.6 | 7.8 | 34 | 40 | 1.18 | 0.0090 | 0.0111 |
| elmwood | 0.86 | 11.8 | 11.0 | 48 | 51 | 1.06 | 0.0065 | 0.0095 |
| epithermal_telluride | 0.89 | 11.3 | 9.4 | 50 | 48 | 0.96 | 0.0088 | 0.0141 |
| gem_pegmatite | 0.84 | 15.8 | 12.5 | 62 | 55 | 0.89 | 0.0070 | 0.0144 |
| great_salt_plains | 0.95 | 8.1 | 7.3 | 54 | 64 | 1.19 | 0.0019 | 0.0024 |
| grimsel_alpine_cleft | 0.98 | 6.6 | 5.6 | 36 | 55 | 1.53 | 0.0025 | 0.0028 |
| jeffrey_mine | 0.85 | 13.3 | 12.4 | 54 | 58 | 1.07 | 0.0348 | 0.0385 |
| marble_contact_metamorphism | 0.84 | 10.9 | 11.2 | 38 | 48 | 1.26 | 0.0012 | 0.0011 |
| mvt | 0.84 | 13.7 | 12.7 | 49 | 55 | 1.12 | 0.0153 | 0.0194 |
| naica_geothermal | 0.87 | 10.1 | 9.8 | 38 | 45 | 1.18 | 0.0049 | 0.0057 |
| ouro_preto | 0.88 | 14.5 | 14.2 | 69 | 88 | 1.28 | 0.0069 | 0.0125 |
| porphyry | 0.83 | 15.3 | 14.8 | 62 | 66 | 1.06 | 0.0232 | 0.0463 |
| pulse | 0.86 | 9.7 | 9.3 | 33 | 39 | 1.18 | 0.0009 | 0.0013 |
| radioactive_pegmatite | 0.81 | 18.8 | 16.0 | 75 | 66 | 0.88 | 0.0070 | 0.0164 |
| reactivated_fluorite_vein | 0.88 | 14.4 | 15.3 | 86 | 97 | 1.13 | 0.0255 | 0.0346 |
| reactive_wall | 0.87 | 9.6 | 9.3 | 35 | 41 | 1.17 | 0.0042 | 0.0049 |
| roughten_gill | 0.78 | 20.0 | 19.4 | 69 | 71 | 1.03 | 0.0148 | 0.0420 |
| sabkha_dolomitization | 0.90 | 16.2 | 15.3 | 115 | 108 | 0.94 | 0.0146 | 0.0369 |
| schneeberg | 0.86 | 11.7 | 10.3 | 45 | 47 | 1.04 | 0.0108 | 0.0203 |
| searles_lake | 0.92 | 14.4 | 14.7 | 121 | 133 | 1.10 | 0.0112 | 0.0267 |
| shigar_pegmatite | 0.88 | 15.9 | 13.7 | 85 | 81 | 0.95 | 0.0040 | 0.0066 |
| sicily_solfifera | 0.85 | 20.1 | 19.2 | 104 | 100 | 0.96 | 0.0131 | 0.0435 |
| stalactite_demo | 0.87 | 9.4 | 9.1 | 33 | 40 | 1.21 | 0.0009 | 0.0013 |
| sulphur_bank | 0.94 | 7.3 | 5.9 | 29 | 30 | 1.03 | 0.0060 | 0.0052 |
| sunnyside_american_tunnel | 0.86 | 15.4 | 15.2 | 68 | 82 | 1.21 | 0.0200 | 0.0297 |
| supergene_oxidation | 0.87 | 13.6 | 11.2 | 56 | 56 | 1.00 | 0.0268 | 0.0340 |
| tn457_barite_pulses | 0.88 | 9.6 | 9.2 | 34 | 42 | 1.24 | 0.0053 | 0.0086 |
| tormiq_alpine_cleft | 0.98 | 6.6 | 6.2 | 78 | 84 | 1.08 | 0.0022 | 0.0032 |
| tutorial_first_crystal | 0.85 | 9.8 | 9.5 | 32 | 39 | 1.22 | 0.0007 | 0.0012 |
| tutorial_mn_calcite | 0.85 | 10.1 | 9.6 | 32 | 38 | 1.19 | 0.0009 | 0.0014 |
| tutorial_travertine | 0.83 | 10.8 | 10.9 | 35 | 42 | 1.20 | 0.0022 | 0.0031 |
| ultramafic_supergene | 0.84 | 21.9 | 20.7 | 112 | 106 | 0.95 | 0.0150 | 0.0469 |
| wittichen | 0.89 | 8.4 | 8.3 | 35 | 40 | 1.14 | 0.0020 | 0.0025 |
| zoned_dripstone_cave | 0.84 | 10.4 | 10.2 | 33 | 40 | 1.21 | 0.0021 | 0.0026 |

n = 41 scenarios (seed 42, cavity/orb view, same build; legacy = `--experiment legacylight`; subject L = mean over non-void pixels, derived as (mean L − void·4.5)/(1 − void) with the clear colour at L 4.5). R1 subject luminance 25–133 (median 55); R1/legacy subject-luminance ratio min 0.88, median 1.14, max 1.53 over 41 pairs; edge fraction higher under R1 on 39/41; frame mean L below 10 on 17 (R1) vs 14 (legacy) — that floor measured orb size, not light. Highlight fraction 0 in every orb frame under both (alpha ghosts behind a translucent shell; see R1's acceptance note). No exceptions and no shadow step-downs in any run.

**tn457_barite_pulses s42, same build (legacy → R1 cave):** hero-1 sphalerite L 96.8 → 102.0, edges 0.023 → 0.033; hero-2 barite 102.9 → 112.7, 0.020 → 0.025; druse 85.8 → 94.7, 0.019 → 0.027; orb 9.6 → 9.2, 0.0053 → 0.0086. Contact sheets: `.local-evidence/photos/{elmwood,tn457_barite_pulses}-s42-r1{,-before}/contact-sheet.html`.

## 4. Fixed in this commit

| id | change | files | tests | baseline |
|---|---|---|---|---|
| F1a | euhedral habit ≠ crust; macro body renders, small = druse | js/45 | surface-growth (+2) | byte-identical (no sim consumer) |
| F1b | coverage mass floor: 2 µm min film, 0.5% min coverage | js/45 | surface-growth | byte-identical |
| F1c | instances at a 1.5 mm footprint, caps 1536/384, 12×8 lobe, lobe height ≤ 3× mean thickness | js/99i | surface-growth, three-integration | render-only |
| F3 | tetrahedron token/builder/gates; cubic-named habits → cube | js/99i | sphalerite-tetrahedron (new) | render-only |
| F4 | shape audit reads the renderer's real system map | tools/morph-fidelity-audit.mjs | — | tool |
| F12 | photo rig: cleanup, tolerant polling, camera inside the cavity + raycast, experiments, photo stats | tools/photo-rig.mjs (new) | — | tool |

Verification run: `npm run typecheck`, `build:check` (bundle current), 28 render/morphology test
files / 310 tests green on the fork base and 319 on the canonical base (`vitest run` on the files
named in §9). Baking: on the fork base (SIM 271) `science:rebake` reproduced every seed-42
artifact byte for byte; on canonical (SIM 285) it moved only the corrected surface-growth
testimony (F13 has the leaf audit) and passed its verify phase. Cold CI was run on the canonical
transplant after that bake; its verdict is recorded in PR #7.

---

## 5. The plan to 7/10 — render rungs

Ordered by (visual gain ÷ cost). Each rung is render-only unless marked, must show a photo-rig
before/after contact sheet, and carries a numeric acceptance on the rig's statistics. R1 and R2
were prototyped in `tools/photo-rig.mjs --experiment` this session; the pictures are in §3.

**Execution order as decided 2026-09-05 (§10): R1 → R2 → R6 → R5 → R3 → R4 → R7.** The rung
numbers below are kept as names; the sequence is the decided one.

### R1 — Light like a photograph (env map, shadows, tone mapping, exposure) · **SHIPPED 2026-09-05**
As planned:
- `scene.environment` from a procedural room baked once through `PMREMGenerator.fromScene`
  (vendored three r163; no CDN, no asset), rebaked on context restore.
- ACES filmic + `toneMappingExposure`; ambient floor 0.10 (the environment supplies ambient).
- Shadow-casting key (PCF-soft 2048² desktop, PCF 1024² on the mobile profile the
  surface-growth budget already recognises; frustum ±1.6·r0), crystals/swaths/satellites cast
  and receive, wall and water receive, phantom bands receive only.
- Inside/outside is an **exposure** change (cave ×1.3 inside); the environment is never removed.

As decided (D4/D5) and as learned building it:
- **Two moods**, `cave` (process view, default) and `studio` (for the specimen view, R6): the
  `LIGHTING_MOODS` table in `js/99i`. A `_topoApplyLightingMood(state, mood)` switch exists for R6.
- **The key rides the camera frame** (`_topoLightingSyncKey`: viewer's upper-left, aimed at the
  orbit target, shadow frustum sized to r0), so pan/zoom keep shadow texels on the subject and a
  hero frame is lit the way the player would see it. The old light was parked at a fixed offset.
- **Small, hot source.** A glass face mirrors ~4 % (F0), so a white highlight needs a source ≥ 25×
  the diffuse white level — a lamp or flash tube, not a softbox. Each mood has one 5–6 mm panel at
  intensity 45–60 beside a large soft one; the PMREM blurs the lamp by roughness on its own, so a
  rough face sees a sheen and a polished face a glint. The environment does not decide lustre;
  R2's materials do.
- **A measured step-down gate** (`_topoLightingNoteRenderTime`): four consecutive renders over
  120 ms halve the shadow map (2048 → 1024 → 512), then drop shadows; recorded in
  `state.lightingRig` and printed by the rig. CPU submission time only — a coarse guard, not the
  D4 frame-time gate proper.
- **Honest fallback**: if the PMREM cannot be baked (no generator, lost context) the rig records
  the reason and restores the pre-R1 two-light look. `tests-js/lighting-rig.test.ts` (15 tests)
  covers the contract; the bake itself is measured live by the rig's `gl.lighting` receipt.
- **F14 fixed on the way** (§2): the interior wall is drawn again from inside the cavity.

Measured (elmwood s42, ONE build; "legacy" = `--experiment legacylight`, the pre-R1 lights on the
same build, so the wall fix is in both columns — the wall's own before/after is in F14):

| frame | legacy L · edge | R1 cave L · edge | R1 studio L · edge | R1 + R2-preview highlights (cave · studio) |
|---|---|---|---|---|
| cavity (orb) | 11.85 · 0.0065 | 10.99 · 0.0095 | 13.82 · 0.0140 | 0.0000 · 0.0001 |
| hero-1 fluorite | 84.8 · 0.0072 | 94.1 · 0.0096 | 129.5 · 0.0099 | **0.0023 · 0.0024** |
| hero-2 calcite | 75.2 · 0.0043 | 93.0 · 0.0056 | 114.3 · 0.0069 | 0 · 0 |
| druse | 83.5 · 0.0073 | 97.3 · 0.0100 | 134.7 · 0.0105 | 0 · 0 |

`R2-preview` = `--experiment opaque,polish` (alpha off, roughness 0.12 on crystal bodies): the
materials R2 will ship. A mirror-ball body (`--experiment mirror`) shows the room's panels at
highlight fraction 0.016, so the environment reaches every material.

**Acceptance, restated honestly.** The planned "cavity highlight ≥ 0.002" cannot be met by
lighting alone and was never going to be: (1) the shipped bodies are 30–70 % alpha over the wall,
and a 50 % alpha caps a fully clipped reflection near L 200 — below the 235 bin; (2) roughness
0.42/0.62 spreads the lamp into a sheen. Under the R2-preview materials the hero frames sit in
the whole-vug photo band (median 0.004, floor 0.0005) in both moods; the orb view stays at
~0.0001 because its translucent shell halves the far wall (by design — D3 keeps the orb as the
process view). So the criterion moves to R2, where it belongs: **R1 is accepted on (a) the
environment reaching the materials (mirror ball), (b) the R2-preview hero highlights ≥ 0.002,
(c) the fleet's orb-view mean luminance within 10–60 (table §3.4), (d) `mineral-optics` green
and the 10 render test files green.**

### R2 — Materials that behave like minerals · 3–5 days · needs D1 (transmission) and D2 (lustre)
- Consume `optics.lustre`: metallic → `metalness 1`, coloured F0 (galena grey, pyrite brass,
  chalcopyrite gold), roughness 0.25–0.4; adamantine → IOR 2.0+, roughness 0.05; vitreous → IOR
  1.5–1.7, roughness 0.05–0.2; pearly → `sheen`/clearcoat on the named face family; resinous 0.3;
  dull/earthy 0.8+. One table, one builder.
- Transparent species (clarity > 0.15): `transmission = f(clarity)`, `ior` per species,
  `thickness` = rendered extent, `attenuationColor` = body colour, `attenuationDistance` ∝ extent
  and clarity; `opacity 1`, depth write on. The alpha path stays as the fallback tier for
  low-end GPUs.
- Etched/frosted/CDR/inclusion modifiers re-expressed in roughness + transmission (they exist
  today as opacity multipliers).
- **Acceptance:** hero shots of quartz/calcite/fluorite/selenite show the substrate *through* the
  crystal (the rig can assert the wall colour is sampled inside the crystal's silhouette); galena
  and pyrite highlight fraction ≥ 0.01 in their hero shots.

### R3 — Coatings at physical scale · 2–4 days · no decision
- `laminated_lining` → a wall-conformal displaced shell (copy of the wall triangles inside the
  patch, offset by mean thickness, with the lining's colour and a fine noise normal map), not tiles.
- `botryoidal_crust` → keep instanced lobes (fixed this session) but draw a lognormal size
  distribution and overlap them; add a normal-mapped skin under the lobes for the thin case.
- `euhedral_druse` → teeth sized from the aggregate's own zone record, thousands of instances
  where the mass allows, orientation jitter ±20°.
- **Acceptance:** no swath instance larger than 5 mm across on any scenario (rig roster check);
  Elmwood dogtooth silhouette visible in its hero shot at ≥ 20% of frame height.

### R4 — Crystallographic forms for the species that matter · 4–6 days · no decision
- Extend the Wulff tenancy (`js/46`) to **quartz** (m {10-10}, r {10-11}, z {01-11} at the real
  38° with r > z, plus optional s/x), **sphalerite** ({111} + {-1-1-1} tetrahedra + {110}),
  **pyrite** (cube/pyritohedron/octahedron with {210} striations), **gypsum** ({010} tabular with
  {120} and {-111}), **dolomite** (rhomb {10-14}), **aragonite** (pseudo-hex trilling), **topaz**,
  **apatite**. The kernel is generic; each tenant is a face table + a calibration sweep at the
  live g-range (`feedback_render_upgrade_visible` — verify at the params the renderer passes).
- Edge chamfer (0.5–2% of extent) on every convex body; per-face vicinal hillock normal map at
  low amplitude (proposal §5 said "only if it reads" — at R1 lighting it will).
- **Acceptance:** `morph-fidelity-audit` mis-shaped count ≤ 10; a quartz hero shot shows six
  alternating termination faces of two sizes (rig can count the distinct face normals).

### R5 — A wall that is rock · 2–3 days · no decision
- Triplanar procedural albedo + roughness + normal for the host lithology (limestone grey-buff,
  basalt dark grey, granite speckle, sandstone tan), driven by the existing `wall.composition`.
- Break the ring/cell ridges: smooth the radial mesh normals across cells, keep the relief map as
  micro-detail only, add an ambient-occlusion term at crystal contacts (R1's shadows do most of it).
- Iron-oxide stain and clay film as a low-frequency mask (the sim already knows Fe and the
  `film:` events).
- **Acceptance:** druse shots no longer show periodic ridges (rig: no dominant spatial frequency
  in the wall's luminance autocorrelation); wall edge fraction 0.02–0.06.

### R6 — Photograph the specimen · 2 days · needs D3 (presentation)
- "Specimen view": cut-geode clip plane facing the camera (prototyped), opaque wall, key light
  at the opening, neutral dark-cloth background gradient, exposure control, optional depth of
  field for hero zoom (a two-pass blur is enough at this scale), 1–2% film grain.
- The existing orb view stays as the "process view" — the rig proves both from one scene.
- **Acceptance:** default-view edge fraction in the photograph band (0.03–0.12); a boss
  eye-check on Pages of the elmwood, tn457 and mvt specimen views.

### R7 — Aggregates with a history · 3–5 days · no decision
- Lognormal satellite sizes with a tail; sub-parallel groups; per-generation tint (older
  generations stained, younger clean); contact facets (O2) rendered matte with a darker rim;
  visibility floor made zoom-aware (a 0.3 mm crystal is 0.3 mm at macro zoom).
- Zoning made visible under glass: the O5c phantom shells and D1b chemistry variants read
  through transmission (R2) — amethyst tips, smoky cores, iron-stained bases.

Rung sum ≈ 17–27 working days; R1+R2+R3 alone (≈ 6–11 days) is my estimate of the 5/10 line;
R4–R6 carry it to 7.

---

## 6. What the rig must gate from now on

- Every render-layer commit runs `node tools/photo-rig.mjs --scenario elmwood --shots cavity,hero,druse`
  and `--scenario tn457_barite_pulses` and links the contact sheet in the commit message.
- The manifest's `census` and `stats` are the numbers the commit quotes (highlight/edge fractions
  before → after). A render change that moves nothing on the rig is a silent no-op
  (`feedback_render_upgrade_visible`).
- Reference statistics are re-measured with `--photo-stats` whenever the photograph set changes.

---

## 7. Decisions for the boss

- **D1 — Transmission.** The 2026-07-01 decision was "plain % translucency, no faked refraction".
  R2 proposes *real* refraction (screen-space transmission with measured IOR and Beer–Lambert
  attenuation). It is the single largest step toward "glass". Yes/no.
- **D2 — Lustre consumer.** Depth-B was deprioritised to "text only" on 2026-07-03. At a 7/10
  target the data must reach the pixels. Yes/no.
- **D3 — Presentation.** Ship a "specimen view" (cut geode, opaque wall, studio key, dark cloth)
  beside the process orb, or replace the orb. My recommendation: beside.
- **D4 — Instance budgets.** 1536 desktop / 384 mobile shipped today under the bug-fix mandate;
  R3 wants up to 4096 desktop for druse teeth. Any mobile-perf floor you want held?
- **D5 — The three-panel studio look.** Warm key / cool fill / rim is a photographer's default;
  the code comments asked for "moonlit cavity, not studio". R1 keeps the mood through exposure;
  say if you want the cave mood as the default instead.

---

## 8. Not done, and honest about it

- **Evidence chain, done twice.** Fork base: rebake byte-identical. Canonical SIM 285: the
  guided-tutorial receipt had to be regenerated first (`npm run gen:browser-receipt`) and four
  of its pinned constants re-pinned — two stream-position ids, the testimony dataset digest, and
  the box's Chrome version (F13) — then the rebake moved the corrected testimony only. Cold CI
  on the canonical transplant: verdict in PR #7.
- The laminated lining still tiles (R3); the druse camera is weak (F12); the `halfcut` prototype
  faces the studio's dark side, so its highlight numbers understate the effect.
- Amethyst geode and deccan chalcedony rinds are *booked* too thin to be fabrics — a science gap
  surfaced by the mass floor, not a render one; it belongs to the scenario-tuning queue.
- The 21 residual `spike` mis-shapes and the five cubic natives (F4) are left for R4.
- No specimen photograph of a *whole* vug interior was in the catalog set; the presentation
  rubric (R6) leans on my reading of geode photography, not on a boss-owned reference.

---

## 10. Decisions taken (2026-09-05, reviewer verdict relayed by the boss)

The review was approved as "the right programme"; the original branch tip was **not** merged
because it was cut from a fork main 103 canonical commits behind, so its rebake authenticated
an old formation. The work was transplanted onto canonical `a9d32a53` (SIM 285) as
`review/visual-realism-canonical`, rebaked there, and put through cold CI (see the commit
that carries this section).

| # | decision | answer |
|---|---|---|
| D1 | transmission | **YES** — real Three.js transmission with measured mineral IOR and Beer–Lambert body colour; the old alpha path stays only as the low-performance fallback. This does not violate the 2026-07-01 ruling, which was against *fake-looking* refraction. |
| D2 | lustre consumer | **YES, emphatically** — metallic, adamantine, vitreous, pearly, resinous, silky and dull must visibly behave differently; load-bearing, not decorative. |
| D3 | presentation | **BESIDE** — the orb stays as the geological/process view; a cut-open, opaque-walled, photographically lit *specimen view* is added. Neither replaces the other. |
| D4 | instance budget | **4096 desktop as a ceiling, not a quota** — adaptive density, distance/zoom culling, a measured frame-time gate; mobile stays at 384 for now. |
| D5 | lighting | **cave mood by default in process view; restrained studio in specimen view.** Warm key / cool fill / rim physically present without the jewellery-advert look; moonlit darkness and readable specular highlights are compatible. |
| 6 | rung order | **R1 → R2 → R6 → R5 → R3 → R4 → R7.** Lighting and mineral materials give the largest immediate gain; specimen presentation lets you see it; the wooden-bowl wall is then the next illusion-breaker; the coating bugs are contained enough that their deeper rewrite need not delay the first convincing specimen image. |
| 7 | integration | **transplant onto current canonical before integration; rebake there; run cold CI; never merge the stale tip.** |

**Reviewer's caution, adopted as method:** highlight fraction and edge fraction are regression
guardrails, not a realism measure — a noisy, over-sharpened render would score wonderfully.
The terminal test is the eye against a **fixed set of whole-vug photographs**. That set now
exists in the catalog snapshot (all boss-owned): 1257 and 1258 (Keokuk-type citrine geodes,
17 + 12 frames — quartz druse sparkle, goethite-after-pyrite, hollow interior in focus),
1256 (druzy quartz vug, 9 frames), 851 (a whole cut geode: brown rind, white druse, orange
calcite — the R6 presentation reference), 946–950 (cut thunder-egg halves: agate lining and
quartz-filled centre), 1096 (septarian), 1098 (calcite geode), 1342–1345 (Guanajuato druzy
amethyst on chalcedony/calcite). Every rung's eye-check compares its specimen-view frame
against these before its numbers are read. Measured through the rig's statistic (nine
frames from that set): highlight fraction median 0.004 (0.0005–0.023), edge fraction median
0.085 (0.006–0.238), mean luminance 100–145 — the same band as the hand-specimen photographs
in §3.2, so the guardrail thresholds stand; the eye does the rest.

**Transplant check (SIM 285, `elmwood-s42-canon`, `tn457_barite_pulses-s42-canon`):** the
fixes hold on canonical — sphalerite renders as tetrahedra, no coating swath exceeds the mass
floor in either scenario, no runtime exceptions; the rig's process cleanup now uses canonical's
receipt-authenticated browser-descendant API. 28 render/morphology test files / 319 tests
green on the canonical base.

## 9. Reproduce

```
node tools/photo-rig.mjs --list
node tools/photo-rig.mjs --scenario elmwood --seed 42 --shots cavity,hero,druse --hero-n 2
node tools/photo-rig.mjs --scenario elmwood --experiment envlight,glass,halfcut --label demo
node tools/photo-rig.mjs --photo-stats "<catalog>/photos/1061/front.jpg" ...
node tools/morph-fidelity-audit.mjs
npx vitest run tests-js/surface-growth.test.ts tests-js/surface-growth-three-integration.test.ts tests-js/sphalerite-tetrahedron.test.ts tests-js/habit-bias.test.ts tests-js/pyrite-morphology.test.ts tests-js/fluorite-morphology.test.ts tests-js/cluster-spec.test.ts tests-js/manganese-surface-family.test.ts tests-js/mineral-optics.test.ts tests-js/twin-cluster-patterns.test.ts tests-js/fan-cluster-pattern.test.ts tests-js/dendrite-tree-render.test.ts tests-js/d1-body-colour.test.ts tests-js/facestep.test.ts tests-js/hopper-texture.test.ts tests-js/cleft-halfform.test.ts tests-js/mesh.test.ts tests-js/cavity-render.test.ts tests-js/matrix-skin.test.ts tests-js/etch-overprint.test.ts tests-js/o5-band-render.test.ts tests-js/o5-split.test.ts tests-js/aragonite-contact-twin-three.test.ts tests-js/galena-spinel-twin-three.test.ts tests-js/fluorite-twin-three.test.ts tests-js/o2-render-wiring.test.ts tests-js/o4-engulfment.test.ts tests-js/local-color.test.ts
```

Evidence index (all under `.local-evidence/photos/`): `<scenario>-s42/` = shipped renderer before
this commit (28 scenarios); `-hidden` = wall hidden; `-fixed` = first cut of F1 (balloons);
`-fixed2` = this commit; `-envlight`, `-envlight+glass`, `-envlight+glass+swathoff`,
`-envlight+glass+halfcut`, `-fixed2-envlight+glass`, `-fixed2-envlight+glass+halfcut` =
prototypes; `photo-refs/photo-stats.json` = the twelve reference photographs' statistics.
