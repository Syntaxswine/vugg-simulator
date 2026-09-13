# Part 2 — Quartz physics and the limits of the evidence

Base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`; SIM 285.
Scope: ordinary quartz face advance, notation, dissolution and surface relief.
Review: **4/5 PASS**, Aquinas, 2026-09-12. The reviewer independently checked
the six source entries and reran the geometry probe. Sources inspected 2026-09-12.

## Finding

**Face-dependent quartz growth is supported. A universal m/r/z rate law for this
simulator is not established by the sources inspected here.** A time-resolved
plane model is a defensible research direction, provided its seed geometry,
units, face convention, environmental range and acceptance bookkeeping are
specified. Merely storing today's display planes would not meet that standard.

## Primary-source evidence register

The publisher previews below were inspected through indexed publisher-page
text. Direct publisher opens failed (Nature identity redirect; ScienceDirect
403). They are not represented as full-text reads. The KIT paper was accessible
as a complete PDF; only the sections identified below were examined closely.
Titles and DOI identify papers even where author metadata was absent from the
inspected preview. These are six bounded sources, not a systematic literature
review or an exhaustive list of quartz mechanisms.

| ID / source and inspected material | Supported observation | Applicability limit / audit inference |
| --- | --- | --- |
| Q1 — [*Growth rates anisotropy of synthetic quartz crystals grown on Z-cut hexagonal seeds and computer simulations of growth process* (1998), J. Crystal Growth 187, 481–489; DOI 10.1016/S0022-0248(97)00868-3](https://www.sciencedirect.com/science/article/pii/S0022024897008683). Abstract, introduction and section excerpts. | For Na2CO3-grown, designed Z-cut seeds, the authors infer normal rates R/r/m/Z of 0.017/0.046/0.0016/0.25 mm/day. Initial plane distances and those rates produce time-dependent forms. The excerpt explicitly calls the small m-face estimate less reliable. | A concrete example of anisotropic kinetics and seed-dependent shape prediction. Full temperature, pressure, concentration and uncertainties were not recovered here; **these numbers are not approved game coefficients**. Preserve the authors' R/r labels until the crystallographic setting is mapped. |
| Q2 — [*Asymmetry of growth and dissolution on basal, minor rhombohedral and prism faces of quartz* (2006), J. Crystal Growth 294, 330–338; DOI 10.1016/j.jcrysgro.2006.06.008](https://www.sciencedirect.com/science/article/abs/pii/S0022024806005793). Abstract and introduction. | In silica-presaturated 1 m NaOH at 1 kbar, experiments at 300–360°C and controlled temperature differences compare growth and dissolution. The ratio of absolute dissolution rate to absolute growth rate varies strongly by face, from roughly 0.9 to 9. | Dissolution cannot automatically be the negative of the growth law. This specific alkaline, high-temperature experiment does not supply a dissolution law for every simulated fluid, nor resolve pits, defects or changing roughness in the game. |
| Q3 — [*Hydrothermal growth of quartz crystals in NaCl solution* (1981), J. Crystal Growth 52, 837–842; DOI 10.1016/0022-0248(81)90386-9](https://www.sciencedirect.com/science/article/pii/0022024881903869). Abstract. | Hydrothermal temperature-gradient growth in NaCl differs from alkaline-solution growth in prism striations and relative R/r growth order. | Solution composition can change the habit-producing rate ordering. The abstract does not establish the full experimental range or a quantitative cross-solution interpolation. Do not equate paper R/r labels with code r/z by letter alone. |
| Q4 — [Ihinger & Zink, *Determination of relative growth rates of natural quartz crystals* (2000), Nature 404, 865–869; DOI 10.1038/35009091](https://www.nature.com/articles/35009091). Abstract and figure captions. | Micro-infrared mapping of one natural gem-quality quartz specimen relates hydrogen-bearing impurity distributions to historical face sizes and relative growth rates. | Supports the importance of recorded growth sectors. It does not make the simulator's bulk Al/Ti fields equivalent to measured hydrogen maps, supply an absolute universal clock, or uniquely reconstruct every natural crystal from its final outline. |
| Q5 — [van Praagh & Willis, *Striations on Prism Faces of Quartz* (1952), Nature 169, 623–624; DOI 10.1038/169623b0](https://www.nature.com/articles/169623b0). Abstract. | From natural and synthetic surface topography, the authors attribute studied striations to unequal spreading of growth sheets along/across the c direction, while acknowledging oscillatory face combinations in some crystals. | A striation is not automatically a dated fluid pulse, temperature cycle or inclusion event. Neither this preview nor our stored scalar zones establishes a one-to-one event-to-groove chronology. |
| Q6 — [Wendler, Okamoto & Blum, *Phase-field modeling of epitaxial growth of polycrystalline quartz veins in hydrothermal experiments* (2016), Geofluids 16, 211–230; DOI 10.1111/gfl.12144](https://publikationen.bibliothek.kit.edu/1000057615/20902660). PDF pp. 211–218: abstract, experimental setup, model equations, calibration and Table 2. | Their model separates interface-energy anisotropy from kinetic anisotropy, and calibrates parameters against specific hydrothermal specimens (precipitation at 430°C, 31 MPa). Table 2 identifies both face indices and rate normalization when comparing datasets. | This is evidence for a calibration method, not validation of Vugg's display constants. Equilibrium shape, kinetic shape and instantaneous rendered shape are distinct claims. We have not reproduced their phase-field simulations or transferred their parameters. |

## Conventions required before a quantitative implementation

**Mathematical definition, not a fitted mineral law:** with fixed outward unit
normals in a specified crystal frame, a convex body can be represented by
`P(t) = intersection {x : n_i dot x <= d_i(t)}`. For a face with known normal
velocity and an interval over which the selected law applies,
`d_i(t+dt) = d_i(t) + integral(v_i dt)`. Plane identity, seed offset and physical
length units must be retained. Q1 supports this kind of time-dependent geometric
construction under prescribed conditions; it does not establish its adequacy
for intergrowth, concave etch pits or every quartz habit.

Before using published coefficients, map Miller/Miller–Bravais indices,
crystal setting/handedness, crystal-to-world frame and the paper's rate
normalization. Audit inference: letter-only matching risks swapping the two
rhombohedral families. Q2 names its minor face z; Q6 Table 2 prints explicit
indices for its r and z labels. The current renderer instead generates normals
from its declared reciprocal metric and point group 32, so a mapping should be
checked against those actual vectors, not against a habit string.
[Current quartz convention](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46a-quartz-render.ts#L1-L22).

Relative rates alone do not fix absolute elapsed time or seed size. The current
quartz engine starts with a scalar increment, and the application clock scales
that increment. A separate narrative uses `timeScale * 10000` years per step.
Neither operation is a demonstrated calibration of Q1's mm/day measurements.
Part 3 must keep step ordering distinct from a physical kinetic clock.
[Scalar clock application](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85b-simulator-nucleate.ts#L1380-L1397),
[narrative years](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1440-L1444).

## Verified correction to the older geometry example

The [older proposal](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/proposals/PROPOSAL-DIRECTIONAL-GROWTH-2026-06-22.md#L134)
and [kernel header](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46-wulff-geometry.ts#L8-L17)
state that equal central distances give a cuboctahedron, and shrinking {111}
gives a cube. Those statements are incorrect for the kernel's **unit normals**.
The [existing test](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/tests-js/wulff-geometry.test.ts#L58-L78)
already uses the correct ratio and directions; this is a documentation defect,
not evidence that the intersection kernel is broken.

Independent derivation: set `d100 = 1` and `d111 = t`. The two constraints become
`max(|x|,|y|,|z|) <= 1` and `|x|+|y|+|z| <= sqrt(3)*t`.
The cuboctahedron has vertices at permutations/signs of `(1,1,0)`, so
`t = 2/sqrt(3)`, not 1. Moving {111} outward to `t >= sqrt(3)` leaves the cube;
moving it inward to `t <= 1/sqrt(3)` leaves an octahedron (for positive t).

| Probe, with d100 = 1 | Vertices | Faces by number of corners |
| --- | ---: | --- |
| d111 = 1 | 24 | 6 quadrilaterals, 8 hexagons |
| d111 = 2/sqrt(3) | 12 | 6 squares, 8 triangles |
| d111 = 2 | 8 | 6 squares |
| d111 = 0.5 | 6 | 8 triangles |

The [probe](evidence/cube-octahedron.mjs) reads the pinned Git source directly,
runs only the pure geometry functions, and checks counts plus independent
inequalities. [Recorded output](evidence/cube-octahedron.json) includes the
source SHA-256 and Node 24.15.0 runtime. All four cases passed. This is a
mathematical geometry check, not experimental validation of mineral kinetics.
No historical proposal or runtime file was changed during the audit.

## Decision

Proceed to the history-contract audit. **Hold production face-rate calibration**
until a bounded experimental dataset, explicit face mapping, units and growth/
dissolution applicability are available. Preserve today's quartz morphology as
a declared display model while recording any newly observed simulator history
honestly. Do not infer extra cloud events, growth fronts or scientific chronology
from display relief.
