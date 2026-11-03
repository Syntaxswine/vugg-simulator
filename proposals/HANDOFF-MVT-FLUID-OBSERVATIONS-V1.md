# MVT fluid observation authority v1

Base: `cb1965fcb686ca852a9771303f6bbb1c0b8b3035`, approved/merged PR #42.

This tranche replaces no gameplay fluid. It establishes the provenance and
per-property limits of three actual Tri-State fluid-inclusion observations,
before any observation is used to commission a named physical source in the
shared host -> void -> fluid history. The authored PR #42 conservation control
and the natural-MVT physical HOLD remain intact.

## Primary material and selection

Source: Stoffell, Appold, Wilkinson, McClean and Jeffries (2008), *Economic
Geology* 103(7), 1411-1435, [DOI 10.2113/gsecongeo.103.7.1411](https://doi.org/10.2113/gsecongeo.103.7.1411).
The [institutionally hosted PDF](https://eps.mcgill.ca/~courses/c561/Stoffell%20et%20al.%202008.pdf)
has SHA-256 `f32d39f552e22b76d6343bddc7000c5161bec6e20d9bd105e3680be2d9c86709`.
Table 1 supplies locality; Table 2 supplies individual observations. Relevant
methods are on printed pages 1415-1416, and table footnotes on 1422.

Three rows are retained, with all 13 original element cells:

| Inclusion | Source locator | Host/locality | Why retained |
| --- | --- | --- | --- |
| TSCV 1-1 A, 1 | PDF page 10, printed 1420 | Quartz, Carterville | Quantified cells plus reported limits |
| TSPC 1-1 A, 1 | PDF page 10, printed 1420 | Quartz, South Picher | An unexplained blank adjacent to quantified cells |
| TSBS 4-6 A, 3 | PDF page 11, printed 1421 | Sphalerite, Baxter Springs/Picher field | Host interference, blanks and reported metal content |

These rows exercise evidence distinctions; they are not a statistical sample,
regional range, chronological sequence, or selected pair of physical endmembers.
No means or best values are pooled between them.

The method derives a chloride internal standard from microthermometry and uses
it to normalize elemental estimates. The paper's salinity approximation is not
an independent error bar for every element. Its two inclusion dimensions do not
give released-fluid volume. Table footnotes suppress Cu/Zn for sphalerite because
of matrix interference. Unexplained blanks remain unexplained. These statements
are retained as method constraints, not converted into missing concentrations.

## Executable contract

`fluidObservation(id)` returns one deeply immutable source-bound record. It
preserves original strings and distinguishes:

- reported normalized estimates;
- the derived chloride internal standard and its dependencies;
- reported upper limits, with no substituted concentration;
- unexplained unreported cells;
- host-interfered unreported cells.

Each record names sample, inclusion, host, locality, table, page and PDF hash.
It retains homogenization temperature separately from unknown trapping state,
NaCl-equivalent salinity separately from unknown actual salt fraction, and
two observed dimensions separately from unknown fluid volume. `reported_ppm`
is never relabeled as mg/kg solvent. No density, water, component moles,
speciation, sulfur source or physical clock is inferred.

`reportedMassRatio(id, numerator, denominator)` works only within one inclusion
on its common reported mass scale. Common normalization cancels algebraically;
relative sensitivity, censoring and rounding uncertainty remain unquantified.
A detected positive denominator permits a ratio of reported estimates or a
reported upper-limit ratio. A censored/unknown denominator gives no ratio.
Two detection limits never become a concentration ratio. These are neither
molar ratios nor uncertainty-free measurements.

The concrete blank-column safeguard is useful: the Picher quartz row has an
unreported **K** cell and reported **Ca = 1.2E+04**. Collapsing whitespace and
shifting the adjacent number into K would silently change the fluid. Both this
alignment and the sphalerite Cu/Zn blanks have focused regressions.

`requirePhysicalFluidSource(id)` fails closed with the remaining authorities.
The shared-prehistory compiler also rejects these observation objects as
reservoir inputs. Even a row with quantified metals does not establish the
finite source amount, solvent fraction, volume relation or full analytical
state required to initialize water and conserved components.

Checkpoints store source-bound identity and digests. Reconstruction reads that
same row; source changes, forged derived inventories and extra unit aliases
are refused. A digest authenticates record consistency, not the geological
validity of a newly selected endmember.

## Independent evidence and its limit

The locally retained PDF was SHA-checked and pages 10-11 rendered with Poppler.
Rotated table views were inspected for blank alignment. `reference.py` checks
all **47 nonblank numerical/censoring tokens** directly against the original
page text, then retains a three-row `source-check.json` packet. Token sequence
alone cannot prove blank-column alignment; that remains a disclosed visual
review boundary. The packet includes the original row strings and source hash.
The complete copyrighted PDF is retained locally, not redistributed in Git.

The Python standard-library Decimal witness independently checks **39 cells
and nine ratio cases**, including unresolved/censored outcomes. CI replays
this retained packet and arithmetic offline; it does not redownload the PDF or
claim a fresh independent geological measurement. Local source authentication
additionally uses bundled `pypdf` against the original PDF.

The commissioned Node receipt binds this pilot's source, code, packet, witness,
tests and CI command, and verifies the unchanged production execution digest
and all nine registered science-producer contracts. The sole existing receipt
change is PR #42's CI-file hash after adding the focused command. Its model,
inputs, case results, record digests and numerical values remain unchanged.

## Reproduce

On Windows x64 / Node 24.15.0:

```text
node pilots/mvt-fluid-source/receipt.mjs --check
node pilots/mvt-prehistory/receipt.mjs --check
python pilots/mvt-fluid-source/reference.py
python pilots/mvt-fluid-source/reference.py --source-pdf PATH_TO_SHA_PINNED_PDF
npm test -- --file tests-js/mvt-fluid-source.test.ts
npm test -- --file tests-js/mvt-prehistory.test.ts
npm run typecheck
npm run build
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
git diff --check
```

For a deliberate local recommission, generate the source packet with
`reference.py --source-pdf PATH --write-source-check`, then use the two pilot
receipt producers with `--write`. These are not CI bake commands. Existing
production receipts, baseline and generated game bytes need no rebake.

## Scientific boundary after this tranche

The source observations and their reporting dependencies are now auditable.
Selecting a representative natural endmember, assigning missing chemistry, or
choosing a salt-mixture model remains a scientific decision requiring evidence.
This tranche selects none of those. In particular, equivalent salinity cannot
silently choose a pure-NaCl EOS or solvent fraction for a multi-salt fluid.

The complete local inventory still requires DIC, alkalinity, Fe, sulfur and O2
authority, source amounts, constitutive volume relations at the stated T/P,
and causal feeder/wetting/host history. The numerical controls do not fill
those gaps. Natural connected/sealed MVT snapshots stay absent. Production
mapping, buffering, erosion reconciliation, transport and UV kinetics remain
on HOLD. Both viewers, fallback, wall controls and tutorial timing are unchanged.

Validation and retry details are in
`evidence/MVT-FLUID-OBSERVATIONS-V1.md`; published exact-head CI is recorded in
the PR's validation section.
