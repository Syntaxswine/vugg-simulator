# Quartz form observations — persistence increment B

This increment implements [the growth-front audit's B gate](growth-front-audit/04-implementation-gate.md#b--preserve-and-authenticate-those-observations)
on `3751060e94bc9ba8aba9a3b488d454b4f5ec4897`, the accepted
[recorder A](QUARTZ-FORM-OBSERVATIONS-A-2026-09-12.md). It preserves the
observations already recorded by that observer. It does not add face kinetics,
new growth rates, guessed growth events, or a renderer consumer. Increment C
remains the next separately reviewed task.

## Preservation contract

New collections use `crystal-history-v3`. Null, v1 and v2 producers remain
explicitly selectable so existing collection receipts and staged finish journals
can be replayed using their original projection. V2 dated surface history and its
20,000-event allowance continue in v3. The raw zone arrays and old fields are
unchanged. The new ledger lives at `history.crystal._quartzFormHistory`, with
exact optional current form fields to preserve null, absence and deletion.
[Version dispatch, producer and validation](../js/93-ui-collection.ts).

Reconstructed specimens freeze a deep copy of the ledger. Its crystal ID stays
in the original formation's source namespace even when the Library assigns a
different display ID. Reconstruction does not enroll that display object in the
live observer or rewrite source identity. Missing history remains missing.
[Reconstruction](../js/93-ui-collection.ts),
[source-identity and cursor tests](../tests-js/quartz-form-collection.test.ts).

Strips add an optional `quartz_form_testimony` channel with its own schema,
`strip-quartz-form-observations-v1`, inside the existing v4+ testimony section.
Each row carries the source ID, actual simulator capture step, separate sample
index, optional exact nucleation step, accepted zone-index/date witnesses, and
the entire observed ledger. The archive generator preserves it as
`executed_testimony.quartz_form_observations`. The existing
`habit_morphology_testimony` remains its original latest-state channel.
[Dataset and binary codec](../js/85f-strip-dataset.ts),
[capture](../js/85g-strip-recorder.ts),
[IndexedDB codec and verified readback](../js/85h-strip-storage.ts),
[canonical archive projection](../tools/gen-strip-archive.mjs).

The shared export helper never calls the observer. It rejects private first-
attachment failures, mismatched source IDs, invalid ledgers, observations before
a known birth, and open ledgers whose final snapshot disagrees with current
allowed fields. Strip capture additionally requires open coverage to reach the
actual capture step. A closed ledger retains its valid prefix and original
unavailable boundary without requiring later live descriptors to equal its last
accepted state. An absent or null birth date stays unknown.
[`quartzFormHistoryForPersistence` and known-birth check](../js/44e-quartz-form-history.ts).

Captured quartz testimony is deeply frozen. Capture stages its per-source map;
an exception escaping capture, including quartz reads, witness copying,
validation, tensor operations or later capture work, latches an error and
prevents finalization. Existing chip readers retain their handled no-data
fallbacks. The simulator may catch the optional
recorder exception and continue its normal step bookkeeping; it cannot then
publish an earlier sample as a successful final recording.
[Capture/finalization](../js/85g-strip-recorder.ts),
[production bookkeeping fault test](../tests-js/quartz-form-strip.test.ts).

The new channel is bounded by 10,000 rows, 10,000 accepted zone witnesses per
row, 500,000 witnesses in aggregate and 32 MiB of aggregate UTF-8 JSON. The
existing per-ledger snapshot/record/byte limits still apply. Validation counts
each bounded row before serializing the whole channel. These are storage/input
limits, not measured heap usage or frame-time claims.
[Limits and import validation](../js/85f-strip-dataset.ts),
[independent aggregate witness and byte tests](../tests-js/quartz-form-strip.test.ts).

## What authentication means here

| Evidence boundary | What it establishes | What it does not establish |
| --- | --- | --- |
| V3 collection receipt replay | The v3 scientific record equals the v3 producer regenerated from the saved commands at its collection cursor. Altered, removed or self-rehashed v3 observations fail that comparison. | Natural crystal truth, or immutable proof that a particular schema was originally issued. |
| Canonical strip archive and normal evidence receipts | Published artifact bytes are bound to the commissioned runtime and archive producer. | Experimental validation of the morphology classifier. |
| Arbitrary imported strip | Bounded structural/date/source consistency plus stored content integrity; origin remains `imported-file`. | Replayed simulator origin. A plausible invented snapshot with a new self-hash can pass syntax/integrity and still remains an import. |

Collection authentication already rebuilds by the record's declared supported
producer schema. This compatibility policy is preserved. A wholly rewritten,
self-rehashed recipe/receipt using a valid old producer is not prevented by an
independently retained issuance authority; no such authority exists here. The
claim is v3-to-v3 producer agreement, not adversarial anti-downgrade protection.
[Collection receipt/finish replay](../js/93a-ui-saves.ts),
[new v3 tamper and earlier-collection finish tests](../tests-js/quartz-form-collection.test.ts),
[legacy event and pending-finish tests](../tests-js/collection-history-r7.test.ts).

Imported strip files cannot replace the current run's durable recording or
inherit its ephemeral commissioning receipt through the supported import/load
paths. The browser check saves both original and altered imported datasets,
reloads the actual page, reads both from IndexedDB, and checks exact full-channel
bytes, frozen nested values, original receipt agreement, distinct origins and
no receipt creation merely from loading. It uses the unchanged
`tutorial_first_crystal` scenario, seed 42, one finalized step and one angular
sample; this is a bounded storage fixture rather than a visual or geological
experiment. [Owned browser check](../tools/browser-workflow.mjs).

## Review loop and evidence

The first hostile implementation review gave **3/5 HOLD**. Aquinas reproduced
an observation at step 1 being accepted for a crystal known to nucleate at step
8. The correction adds a shared known-birth check for open and closed histories
and failed-first boundaries, carries the exact optional birth witness in strips,
and rejects the same contradiction at collection and binary/storage import.
Unknown birth metadata remains unknown. The focused regressions include these
cases. This chronology correction changes validation, not observation or growth.
Follow-up consistency review also required duplicate collection birth metadata
to agree and removed legacy false/empty/zero defaults when the v3 observation's
current snapshot declares those fields absent.

The evidence tool separately runs the pinned old and current collection/strip
modules in isolated processes. It compares 24 projections: 12 null/v1/v2
collection fixtures and 12 absent-new-channel strip binary/storage fixtures
across formats 1–5, including v4/v5 surface testimony. The comparison uses
UTF-8 byte lengths and SHA-256, omitting only collection ID/time metadata and
fixing the strip's wall-clock recording time. These are controlled compatibility
fixtures; they do not substitute for command-replay authentication tests.
[Reproducible comparison instrument](../tools/quartz-form-persistence-check.mjs).

After the normal rebake, the same instrument checks the exact pinned archive
and card file inventory; all three scientific baselines; every preexisting
field in 41 canonical strip stories; and all JSON/Markdown claim cards, allowing
only each card's corresponding old-to-new strip hash and the authenticated
mechanism-reference propagation described below. It validates the new
channel and compares ledger counts, snapshot counts and serialized ledger
lengths with A's census. **A did not retain per-ledger content hashes:** this last
comparison cannot establish independent equality of A's observation values.
The observation algorithm is unchanged; each capture validates the retained
ledger and, for open histories, its current endpoint before preserving it.
These are distinct pieces of evidence.

The corrected runtime and comparison instrument each earned **4/5 PASS** from
Aquinas. Independent probes rejected pre-birth open, closed and failed-first
histories while preserving unknown birth; the reviewer also compared all 24
old/current fixture results. No blocking code finding remains.

The follow-up collection consistency fixes retained **4/5 PASS** after another
independent review. The final bounded regression run passes **240 tests across
16 files**, including quartz observations, v3 and legacy collections, surface
history, morphology, replay, strip storage/import, player names and save recovery.
The corrected targeted suites and 24-projection compatibility check also passed.

The browser verification fixture initially used a harness-only seed helper;
that run stopped before commissioning a receipt. It now uses the browser's
actual `SeededRandom` assignment. A separate headless Shigar probe did not
reproduce the old browser export and was rejected as evidence for re-pinning.

The owned browser workflow instead tests the actual Shigar production dataset:
its unmodified raw digest must match durable storage, and its gzip digest must
match the file downloaded through the public button. Removing only
`quartz_form_testimony` must restore both pinned A byte identities. It does not
normalize timestamps, manifests or older testimony. The compatibility tool
then permits only the six digest-derived journey fields to change and compares
the rest of the browser journey exactly. The mechanism payload permits only
its verified reference to that browser receipt to change, as described below. This method
received **4/5 code PASS**.

The subsequent owned-browser run passed all **18 checks**, including actual
IndexedDB reload and import isolation. Its three Shigar source IDs were
`[1, 6, 7]`. The byte bridge measured:

| Product | With quartz observations | Removing only the new channel (exact A pin) |
| --- | --- | --- |
| Raw dataset SHA-256 | `abb871cfc10d2a09c17a8a21a56cbd6000c100aaad2f1b3c0d30bbfdecc5267b` | `c4a46da1eb30f98c6bdc36ad7c5c848747fdfb1fcf21602104714d89fce768b2` |
| Downloaded gzip SHA-256 | `81981084b537a888c03990907e443178bd58fb68047fbefe6d3bd0d45c7523ae` | `2b0e98195b3f4a9d0a8cced5c633c363414f6afeb7242fad98c280df86a4230b` |

The complete journey comparison had exactly six differences: before/after
Simulation `run_id`, raw/imported dataset digests, the content-addressed imported
key, and download digest. The simulation fingerprint and all other journey
fields were unchanged. Receipt creation correctly rejected the old pins;
the three expected constants were then updated from these measured bytes in
[the semantic verifier](../tools/guided-tutorial-browser-receipt.mjs). A fresh
normal browser run, including the same exact byte bridge, then commissioned the
receipt under that final verifier; the rejected candidate was not used as a receipt.
The reviewer independently parsed the emitted bridge and complete candidate,
loaded A's receipt from Git, and reproduced all six deltas and both restored
hashes. The executed reconciliation and three pin changes received **4/5 PASS**.

The final owned-browser workflow passes **18 checks**, the normal browser
receipt verifier passes, and its regression suite passes **9 tests**. The
[commissioned receipt](../archive/evidence/guided-tutorial-browser-v285.json)
earned **4/5 PASS** after independent verification of its current identity and
the same six permitted journey deltas.

The completed canonical archive generation received **4/5 PASS** after an
independent read-only comparison against A. All 41 file names and all prior
JSON fields agree after removing only the new channel. Nineteen archives carry
42 quartz ledgers, 573 snapshots and 2,731 zone witnesses, with zero unavailable
histories. The new channels total 352,070 UTF-8 JSON bytes (268,415 bytes for
the ledgers themselves). Every scenario's ledger, snapshot and byte totals
agree with A's census. Source identity, known birth, observation ordering,
capture/sample coordinates and zone-prefix counts also pass. These counts
describe this commissioned fleet, not a universal storage or performance bound.

The normal science rebake passes **55 tests across 7 files**, evidence and
provenance authentication, and the locality audit with zero contract violations.
The release audit and generated-build drift check pass.

The first final comparison correctly stopped on claim-card references that
were outside its original strip-hash allowance. The mechanism evidence embeds
the separately commissioned browser receipt's payload hash at
`payload.guided_tutorial.interaction_products.capable_browser_authority.payload_sha256`.
The six justified browser changes therefore change that one reference and the
mechanism's containing payload hash. All 41 transformation-commissioning card
references and one player-choice card reference then change to that mechanism
hash. The normal producers already implement this dependency:
[browser authority](../tools/gen-mechanism-witnesses.mjs),
[claim-card projection](../tools/review-claim-card.mjs).

The corrected guard runs both normal read-only receipt verifiers, recomputes
old and new canonical payload hashes, binds every old/new reference to its
corresponding receipt, and compares all remaining fields exactly. It permits
only the one nested mechanism reference, its recomputed containing hash, and
the two specific optional card reference paths (preserving null and absence).
Markdown must equal its old text after only the corresponding strip and
mechanism hash replacements. No scientific outcome is exempted, and no receipt
or generated artifact was edited by hand. This independently reproduced
reference-chain reconciliation received **4/5 PASS**.

The [completed comparison](growth-front-audit/evidence/quartz-persistence-comparison.json)
passes: 24 legacy producer/binary projections, all 41 archives and 82 claim-card
files, and all three unchanged scientific baselines. It records the exact
current runtime identities, permitted reference paths and per-scenario census
results. The final instrument and saved artifact received **4/5 PASS** after
independent review of the exact allowances, current receipt verification and
aggregate totals. No load-bearing implementation or evidence finding remains.
Fresh-dependency validation also passes as recorded below.

## Fresh-dependency delivery validation

On 2026-09-13, candidate `3f7f91a5b8cf5b167c37a07d840848a4dad9532e`
passed an isolated detached-checkout run under Windows x64 / Node 24.15.0,
with fresh `npm ci` installs for both the root and `agent-api`:

- Typecheck, build and generated-artifact drift checks.
- The checked-in CI audit sequence: science, evidence, release, locality,
  scenario, narrative, tutorial, accessibility, Creative, BIF and cation checks.
- The `supergene_oxidation` calibration sentinel: one test passed, with the
  six other tests deliberately skipped by the checked-in CI selector.
- All 240 relevant regression tests across 16 memory-bounded file batches.
- The agent API's JSON help smoke test and a clean final checkout.

This is fresh-dependency local CI, not a claim that the entire repository test
suite or a hosted GitHub Actions job ran. It follows
[the checked-in CI workflow](../.github/workflows/ci.yml), adds the relevant
persistence regression set, and performs no rebake in the isolated checkout.
The final delivery gate permits only this report to differ from the tested
candidate, then requires clean build/science/evidence/release identity checks
before publication. Runtime, tests, producers and evidence remain identical to
the candidate that passed the cold run.

Aquinas gave the final increment B delivery review **4/5 PASS**, independently
checking the clean candidate checkout, matching compiled/execution identities,
all 16 successful regression batches and their 240-test total, the targeted
sentinel, both fresh installs, authenticated evidence and the report-only
difference. No blocking finding remains. The candidate-to-final identity guard
must still pass before publication; renderer increment C remains separate.

## Next increment

Implement C only after the route-dependency inventory required by the audit.
Begin with the ordinary, untwinned, fluid-grown R4 quartz prism; use observations
available at the replay cursor for both route choice and stored parameters.
Keep dimensions, chemistry, surface/deformation and enclosure under their own
dated authorities. Unknown coverage and unsupported route inputs need explicit
fallback status. Persistence B alone does not authorize presenting the current
mesh as a historically observed form.

Reproduction after building and commissioning fresh normal evidence:

```powershell
node tools/quartz-form-persistence-check.mjs --legacy-only
node tools/quartz-form-persistence-check.mjs
```
