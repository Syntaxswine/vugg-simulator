# Part 1 — What the model computes and records

Base: `f7ca38c4544e1d1224ca57962e212ee86ec2f8ab`; SIM 285.
Scope: ordinary quartz's growth path plus shared accepted-zone and shape
infrastructure. This is not a fleet-wide validation of every mineral engine.
Review: **4/5 PASS**, Aquinas, 2026-09-12. No load-bearing factual or citation
correction requested; dispatch, O5 and classifier clarifications added below.

## Finding

**The inspected quartz path computes a scalar candidate and records accepted
axial increments. It does not integrate or preserve an identified set of
physical face-normal distances through time.** The existing face geometry is
useful rendering infrastructure, but recording it alone would record a display
model. This conclusion follows from the producer-to-consumer trace below; it
does not depend on a repository-wide search returning no similarly named field.

## Producer-to-record trace

| ID | Executed fact and evidence | Consequence for a face-history extension |
| --- | --- | --- |
| P1 | `grow_quartz` calculates one saturation ratio, a piecewise scalar candidate (`8·excess²` or `4·excess`), a temperature multiplier and an RNG multiplier. The returned zone initially puts the same scalar in `thickness_um` and `growth_rate`. [Engine](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/59-engines-silicate.ts#L12-L16), [rate calculation](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/59-engines-silicate.ts#L75-L93), [returned fields](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/59-engines-silicate.ts#L187-L191). | There are no independent m/r/z velocities in this engine output. These constants are implemented model coefficients; this audit has not validated them as experimental quartz rates. |
| P2 | The dry-run path supplies one crystal's local mesh-cell fluid, falling back to its ring fluid, and a vertex temperature; it invokes the engine inside a transaction. [Local inputs](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85b-simulator-nucleate.ts#L1522-L1547). | A spatial fluid field is available, but this call is not a separate boundary-condition solve at each moving quartz face. |
| P3 | Candidate crystal mutations are staged and restored; accepted mutations are applied after the formula budget. [Transaction](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85b-simulator-nucleate.ts#L66-L103), [budget ordering](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85b-simulator-nucleate.ts#L1576-L1588). | Observations must distinguish a candidate from accepted state; an engine call is not evidence that its proposed growth happened. |
| P4 | Burial throttling, fill damping and cavity capacity modify `thickness_um`; the cited paths do not apply the same change to `growth_rate`. Time finalization scales both, while the formula cap scales the then-current rate by its own acceptance fraction. [Burial](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L818-L825), [fill](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L919-L927), [capacity](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L946-L980), [clock](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85b-simulator-nucleate.ts#L1380-L1396), [formula cap](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/19-mineral-stoichiometry.ts#L1061-L1094). | **Do not use `growth_rate` as an exact accepted displacement or divide it by a guessed duration to obtain a face velocity.** The accepted signed thickness is the actual axial increment in this path. |
| P5 | The main loop finalizes time, applies the budget, discards dry positive candidates, then calls `add_zone`. `add_zone` stores the zone, adds its signed thickness and stamps the then-current habit aspect. Positive volume increments use ellipsoid-shell bookkeeping; negative increments scale the current volume by the cube of the length ratio. [Accepted loop](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1004-L1021), [stored dimensions](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/27-geometry-crystal.ts#L442-L498). | There is usable model length/volume history. It is not the volume of the rendered faceted polyhedron. Replacing it with polyhedron volume would change the simulation's existing fill/accounting contract. |
| P6 | The formula inventory uses a declared calibrated mmol/kg-per-axial-micrometre scale. [Coefficient and disclosure](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/18-constants.ts#L73-L103). | Existing stoichiometric bookkeeping does not itself calibrate the conversion from new face-swept geometric volume to solute inventory. That conversion needs its own explicit design and evidence. |

## Shape channels are different kinds of evidence

The main loop uses an already computed competition candidate when available,
otherwise calls the single-pass engine; it does not rerun the dry-run candidate.
[Dispatch](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L756-L782).
O5 retains separate prism/termination film coverage, but this growth gate uses
their maximum to stall one scalar increment. It does not advance each covered
face independently.
[O5 gate](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L842-L882).

1. **Current habit and selected form descriptions.** The quartz engine mutates
   `habit`, `dominant_forms` and polymorph labels. Its returned zone does not
   contain a full dated habit snapshot. Later classifiers can further relabel
   quartz after accepted growth. An `aspect_ratio` stamp cannot uniquely recover
   the earlier habit. [Engine changes](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/59-engines-silicate.ts#L110-L170),
   [later classifier order](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/85-simulator.ts#L1332-L1347),
   [aspect lookup](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/27-geometry-crystal.ts#L31-L82).
2. **Selected minerals' morphology annotations.** `GrowthZone` supports optional
   regime/form/saturation annotations. That is categorical morphology testimony,
   not a set of continuously advanced face planes. Its presence must be checked
   for the producer in question rather than assumed for every mineral.
   [Schema](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/27-geometry-crystal.ts#L188-L222).
   Quartz is absent from the current `MORPH_TH` registry, so that registry's
   categorical zone annotations are not an ordinary-quartz face-history source.
   [Registry](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/45-morphology.ts#L125-L460),
   [registry-driven dispatch](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/45-morphology.ts#L1596-L1616).
3. **Generic Wulff-style display.** The opted-in classifier currently lists six
   tenants, excluding quartz. It recomputes `growthFrac` from current scalar
   growth. The renderer helper forms dimensionless distances from a seed,
   growth fraction, form constants, bias and exposure; it explicitly declares
   that exposure is applied retrospectively. This is not an accumulated dated
   face trajectory. [Tenants](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/45-morphology.ts#L1422-L1428),
   [growth fraction](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/45-morphology.ts#L1493-L1509),
   [distance construction](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46-wulff-geometry.ts#L390-L456).
4. **Ordinary R4 quartz display.** A dedicated function builds m/r/z planes from
   the crystal's width ratio and display contrast/phase. Contrast comes from
   variation in positive zone thickness; phase and accessory selection depend
   on crystal identity. Negative zones are excluded from this relief-history
   calculation. The planes are calculated afresh, not read from stored face
   history. The existing code clearly labels its distances and relief as display
   choices, not measured velocities. [History and planes](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/46a-quartz-render.ts#L1-L104),
   [production dispatch](https://github.com/Syntaxswine/vugg-simulator/blob/f7ca38c4544e1d1224ca57962e212ee86ec2f8ab/js/99i-renderer-three.ts#L9048-L9065).

## Bounded conclusion and handoff to Part 2

There are two separate possible additions: **record the model's actual habit
transitions**, or **introduce and then record a physical face-advance model**.
The first cannot establish the second. Current scalar growth, width, fluid and
form metadata are candidate inputs, not sufficient evidence of unique historical
face positions or laboratory-calibrated velocities. Part 2 must assess measured
quartz kinetics, face notation, time/length units and dissolution independently.
No runtime repair is made by this audit; the `growth_rate` distinction is a
consumer-contract finding, not a request to change calibrated simulation output.

Verification basis: static producer-to-consumer inspection at the pinned base.
No new numerical rate law or natural-scenario outcome is asserted here.
