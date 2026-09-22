# Calcite specimen-authority pilot

This is an isolated, working prototype of the specimen/display boundary. It does
not replace the shipped renderer or change chemistry, accepted volume, growth
rates, or gameplay. It imports the existing geometry kernel during capture;
the browser loads only serialized records and a disposable rendering adapter.

## Run and reproduce

From the repository root, with the commissioned Node version and `npm ci`:

```powershell
npm run pilot:calcite:build
npm run pilot:calcite:test
npm run pilot:calcite:benchmark
npm run pilot:calcite:browser
node tools/serve-local.mjs 8765
```

Open `http://localhost:8765/pilots/calcite/index.html`. The committed recording
works without rerunning growth. Browser verification launches its own headless
Chrome/Edge profile and closes it afterward; it never connects to a user browser.
Its screenshot and temporary profile live under ignored `.local-evidence/calcite-pilot/`.

## Data and responsibilities

`capture.mjs` reads the current model at the end of a step. It records current
dimensions, zone composition, form inputs and supporting integrals, anchors,
orientation, dissolution receipts, and enclosure relationships. Earlier frames
never consult a later habit or split index.

`specimen.js` compiles a record before rendering. Its half-space kernel is
injected from the existing `js/46-wulff-geometry.ts`. It resolves the existing
Wulff envelope, half-form attachment, O1b scalar neighbor shadow, and O2
growth-weighted contact-plane completion into preserved planes and polygons.
There are no graphics objects, RNG calls, or chemistry writes in this compiler.
Each property carries a source, an authority classification, and relevant limits.
The runtime digest and source hashes in `recording.json` identify the producer
inputs. Hashes establish identity, not independent scientific validation.

`render.js` accepts records alone, triangulates their preserved planar faces, and
manages Three.js resources by crystal. Planar subdivision adds vertices on the
same surfaces. It cannot smooth, exaggerate dimensions, move contacts, place
inclusions, or call growth. Camera and lighting changes only redraw the scene.
Colors distinguish surface roles; they do not assert compositional color or UV
fluorescence. All positions use millimetres without a visibility floor.

The recorder tracks affected neighbors and retains unchanged crystal records.
The adapter compares completed geometry, so a facts-only update does not replace
the mesh. The bounded pilot retains each captured frame; unbounded production
history storage and spatial indexing are future work, not solved here.

## Scientific authority: exposed, not invented

Two recordings serve different purposes:

- **Controlled generations:** five explicitly authored accepted-zone events,
  including younger nucleation, Mn-bearing zones, a real clipped contact face,
  dissolution, and regrowth. It exercises existing `Crystal.add_zone` and form
  classification. Its zones and anchors are fixture inputs, not a chemical
  experiment or evidence of predicted formation. All fixture properties are
  labeled procedural.
- **Elmwood:** 16 actual simulator steps, seed 42, with the existing
  `wall.wulff_calcite` option explicitly enabled in both comparison runs.
  Captured model facts are classified as scientifically resolved *under that
  model*. The completed faces and contacts remain procedural. Other minerals,
  enclosed crystals, twins, and unsupported forms are explicitly excluded from
  this bounded rendering; their identities are listed in the capture metadata.

The interface continually identifies the surface as a geometric completion.
The classifier's calibrated form parameters, deterministic yaw, neighbor
adjustment, and contact placement are not promoted to exact geology merely
because they are reproducible. Missing inclusion positions and surviving
internal zone surfaces remain unresolved; no invented interiors are drawn.
Captured historical envelopes are not claimed to be today's buried zoning.

**Known model decision deferred:** crystal mass accounting integrates an
ellipsoidal volume, while the Wulff/contact completion has a different volume.
Both values are retained and displayed; mesh volume is forbidden as a mass
authority. The pilot does not rescale the surface to force agreement or change
chemistry to agree with the mesh. A production scientific-solid authority needs
an explicit decision about that model, plus face arrest/retreat and surviving
internal-boundary history. That cannot be obtained by moving files alone.

Additional explicit scope limits: no cavity clipping is applied in this isolated
viewer, and contacts are computed only among captured eligible calcites. Unlike
the current renderer, contact completion uses physical dimensions rather than
display visibility floors. This is a labeled alternative completion, not a
claim of pixel parity with the shipped renderer. Isolated half-form geometry,
orientation, and the neighbor scalar are regression-checked against existing
implementations. The compiler does not use rounded geometry-cache keys.

## Separate acceptance criteria

1. **Scientific custody:** per-property classifications and limitations survive
   serialization; chemistry, dimensions, and zones are captured unchanged.
   Elmwood fingerprints agree at every one of the 16 steps with and without
   capture. This proves non-interference, not external geological validity.
   The controlled fixture does not claim conservation or independent chemical
   prediction. Mesh/booked-volume disagreement remains visible.
2. **Rendering independence:** delete every mesh/material and rebuild from JSON;
   positions and material groups match. Browser controls and resource rebuilding
   leave the recording unchanged. Planar subdivision preserves the polyhedral
   volume and bounds. Invalid input, future zones, non-finite facts, unsupported
   forms, and invalid surfaces fail explicitly instead of producing substitute
   geometry. Resource disposal returns the scene to its bounded allocation.
3. **Measured performance:** `compiler-receipt.json` compares whole-record and
   dependency-retained compilation with the same synthetic 48-body sparse
   workload, in alternating order. Geometry and facts must be identical. The
   recorded run reduced compilation count from 816 to 80 (48 initial bodies,
   then 16 changes affecting two bodies each). `browser-receipt.json` measures
   first display, subsequent updates, orbit frame intervals, heap telemetry,
   and GPU resource counts for both adapter strategies. The small two-crystal
   case changes both bodies and showed no compelling speedup. Approximately
   60 fps on the recorded host is not a low-end-device certification.

Growth timing in `recording.json` separates `run_step` from capture/compilation.
The uncaptured run occurs first, so warm caches preclude attributing a timing
difference to the new architecture. Total elapsed time also includes expensive
fingerprint auditing. Node/browser heap samples are noisy process telemetry,
not proof of lower retained or peak memory. This pilot does **not** claim that
the shipped game is faster or that its full renderer has been migrated.

## Evidence and delivery boundary

All new runtime experiments and receipts live here. No shipped `js/`, `data/`,
`index.html`, or existing scientific evidence producer is changed. Therefore
the existing scientific receipts are checked, not rebaked; they still bind the
same runtime and producer bytes. The pilot recording has its own source/runtime
identity and is not inserted into the published science-evidence aggregate.
Production integration must follow the repository's scientific rebake rules.

Next integration gate: resolve the documented scientific-solid model decision,
extend property provenance to the next supported morphology, then connect an
opt-in production renderer consumer with exact scenario parity and full-game
before/after benchmarks. The current pilot is a testable boundary, not a silent
replacement for those decisions.
