# MVT fluid observations: validation

Base: `cb1965fcb686ca852a9771303f6bbb1c0b8b3035`, tree
`7548fa96b7c414b80eb4f7dd88c3f5a7c22c3f44`.
Branch: `feature/mvt-fluid-source-evidence`.

Scope is three individual source observations and their permitted uses, not
physical-fluid commissioning. The [handoff](../proposals/HANDOFF-MVT-FLUID-OBSERVATIONS-V1.md),
[source data](../pilots/mvt-fluid-source/source.json) and
[receipt](../pilots/mvt-fluid-source/receipt.json) record that boundary.

## Source and numerical checks

The original Stoffell et al. PDF was retrieved from the institutionally hosted
URL in `source.json`; SHA-256:
`f32d39f552e22b76d6343bddc7000c5161bec6e20d9bd105e3680be2d9c86709`.
The DOI was cross-checked with the coauthor's Imperial College publication
metadata. Methods, table headings, row identities, locality table and relevant
footnotes were read. Poppler rendered pages 10-11; upright views were inspected.

Read-only `pypdf` re-extraction matched all **47 nonblank numerical/censoring
tokens** across the three rows. The retained packet contains original row text,
PDF hash, page and token sequence. Blank-column placement was checked visually
and with regressions; a token-sequence comparison cannot independently prove it.
The original PDF and rendered review images remain local under
`.local-evidence/mvt-fluid-source/`; no complete copyrighted PDF is committed.

Python Decimal, precision 60, independently checked **48 results**: all 39 cell
classifications/values and nine ratio cases, including censored and unresolved
outcomes. Offline CI checks the retained packet and arithmetic. It does not
redownload the PDF, verify a natural brine EOS, or prove full recipe authority.

## Local tests and audits

2026-10-28, Windows x64, Node 24.15.0, V8 13.6.233.17-node.48, ICU 78.2,
en-US. Python 3.12.14. Installed lockfile-backed workspace dependencies reused;
no dependency, lockfile, baseline or production evidence rebake.

| Check | Result |
| --- | --- |
| New fluid observation tests | **30/30 pass** |
| Existing shared-prehistory tests | **38/38 pass** |
| Unique affected tests | **68/68 pass**, no skipped tests |
| Original PDF check | **47/47** nonblank numerical/censoring tokens match |
| New independent Decimal witness | **48/48** results checked |
| Existing prehistory Decimal witness | **99/99** quantities remain consistent |
| Both pilot receipt replays | exact match |
| Typecheck | pass |
| Full build and exact generated build check | pass, 187 modules; game page unchanged |
| Science manifest | pass, 41 scenario declarations current |
| Science evidence | pass, 128 authenticated artifacts; execution and all nine registered producers unchanged |
| Release audit | pass |
| Diff hygiene | pass |

Exact commands, with source PDF path referring to the retained pinned file:

```text
python pilots/mvt-fluid-source/reference.py --source-pdf .local-evidence/mvt-fluid-source/stoffell-2008.pdf --write-source-check
node pilots/mvt-prehistory/receipt.mjs --write
node pilots/mvt-fluid-source/receipt.mjs --write
python pilots/mvt-fluid-source/reference.py --source-pdf .local-evidence/mvt-fluid-source/stoffell-2008.pdf
python pilots/mvt-fluid-source/reference.py
python pilots/mvt-prehistory/reference.py
npm test -- --file tests-js/mvt-fluid-source.test.ts
npm test -- --file tests-js/mvt-prehistory.test.ts
npm run typecheck
npm run build
npm run build:check
npm run audit:science
npm run audit:evidence
npm run audit:release
node pilots/mvt-fluid-source/receipt.mjs --check
node pilots/mvt-prehistory/receipt.mjs --check
git diff --check
```

Tests ran serially with `NODE_OPTIONS=--max-old-space-size=1536`, the existing
one-worker foreman and 2,048 MB RSS watchdog. Highest measured batch RSS was
575 MB. Both initial suites passed. A final source-column guard excluded
inherited object names; the new file was then rerun, **30/30 pass**. This was
validation of an additional input-boundary fix, not a retry of a failed test.

Research-tool limitations: initial Windows stdout encoding could not print
all extracted symbols; extraction was repeated in UTF-8. `fitz` and a
`pdftotext` launcher were unavailable; installed Poppler `pdftoppm` and bundled
`pypdf` supplied rendering and extraction. An initially inverted review image
was corrected before visual inspection. None of these changed source numbers,
test tolerances, simulation behavior or the source PDF. Logs, source and
short-lived command identities are retained locally. No server/browser or
retained helper was started; existing previews were preserved.

## Byte boundary and published checks

Execution digest remains:
`d2171e7e44e1e0b53aa70761511684b68c03a88020bce45f75625ef71b03c93e`.

No production runtime, scenario/data file, renderer, viewer, save protocol,
generated page, registered science producer, baseline or archived artifact
changes. PR #42's receipt has exactly one changed value: its CI-file hash,
regenerated on the commissioned runtime after extending the existing focused
CI command. All its model/source bindings, case digests and numerical results
are otherwise identical. This is source-identity validation, not a fresh
41-scenario growth comparison.

The PR validation section records the exact published head, CI run/attempt,
tested merge tree and browser artifact verification. Existing CI remains on
Windows Node 24.15 and retains viewer/fallback, six real-Chrome cleanup cases,
science/evidence/release audits, calibration sentinel and CLI checks. It adds
the new focused file and offline Python witness to the existing reservoir
step. Local results here do not claim fresh remote CI has completed.

This feature branch does not deploy; Pages publishes `main`. Deployment
validation belongs to a later reviewed merge. Production mapping, reactions
and transport remain disabled. Natural connected/sealed MVT snapshots stay
absent, and all incomplete required physical quantities stay unresolved.
