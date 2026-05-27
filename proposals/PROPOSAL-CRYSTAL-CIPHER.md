# PROPOSAL: Crystal Cipher — Lattice Mathematics + UV Steganography + Helicoid Scytale

**Author:** Claude Opus 4.7 (with boss + Shy)
**Date:** 2026-05-27
**Status:** Conceptual proposal — discussion artifact emerged from the 2026-05-26 → 2026-05-27 strip-view-arc conversation
**Dependencies:** Strip view bedrock (v149–v155), `data/structural.json`, `tools/twin-law-check.mjs`, per-vertex spatial chemistry expansion (still pending — see HANDOFF-CARBONATE-PHASE-1-COMPLETE.md §"three design directions")

---

## Abstract

A three-layer cryptographic stack falls out of doing geology honestly. Real crystal lattices ARE mathematical structures. Trace-element zoning IS a steganographic payload, hidden in plain sight and surfaced under UV. The helicoid manifold IS a Scytale — a transposition cipher whose key is the helicoid's winding parameters and whose ciphertext is the strip view dataset. The three layers exist independently in real mineralogy; vugg already has 60–80% of the infrastructure to surface all three; the remaining work converts the simulator from "grows mathematical structures" into "grows mathematical structures that carry hidden, addressable, signed information."

This proposal lays out the architecture, identifies what's already shipped vs. what would need to be built, and proposes phased implementation. It does NOT propose immediate implementation — this is a design discussion artifact. The conversation that produced it (2026-05-26 to 2026-05-27, boss + Claude Opus 4.7, with Shy's helicoid-as-recorder framing as the original spark) is the substantive content; the implementation phases below are sketches, not commitments.

---

## Background: how this conversation got here

The strip view arc (v149 → v155) shipped the helicoid-as-recorder reframe — promoting the helicoid from a visualization to a recording instrument that captures multidimensional space. That arc produced a portable dataset format (`.stripview`), an IDB-backed cache, download/upload, and full UI for browsing recordings.

In the post-arc conceptual conversation, two architectural reframes emerged:

1. **The helicoid manifold is the better storage medium for abstract data** than the vugg simulator. The simulator is a *generator*; the helicoid is an *observer*. The frame (time × angle × height × chip) generalizes to any system where discrete things emerge from a continuous multidimensional substrate.

2. **The vugg engine is a generic data-growth engine.** Strip the geology, the architecture (substrate + instances + per-species engines + events + paragenesis + recorder) describes any system that grows discrete identifiable things from a continuous substrate under variable conditions and leaves a recoverable history.

3. **Real crystal lattices would make the tower of crystals a tower of mathematics in the strict sense.** Currently vugg has habit names and aspect ratios; with real space groups + unit cells + atom positions + computed Miller indices, the simulator becomes a mathematics generator that happens to use crystals as its native data type.

4. **UV fluorescence is hidden data in plain sight.** Trace-element activators (Mn²⁺ in calcite, Mn²⁺ in willemite, Cr³⁺ in corundum, Eu²⁺ in fluorite) fluoresce under UV at wavelengths determined by the host lattice. The same crystal carries different information under different illumination. Real mineralogy has been doing steganography natively for the age of the Earth.

5. **The helicoid is a Scytale.** The helicoid was always an order over the data tensor, not just a recording instrument. Different helicoid parameters trace different paths through the same dataset, yielding different ordered byte streams. The helicoid winding is the cryptographic key; the dataset is the ciphertext; the scenario+seed (which deterministically yields the helicoid parameters) is the private key.

Three independent mechanisms turn out to be the same mechanism viewed three different ways. This proposal is what to do with that.

---

## Layer 1: Real crystal lattices (mathematical substrate)

### Current state

Each MINERAL_SPEC entry in `data/minerals.json` carries:
- A name + chemical formula
- Habit variants (tabular, prismatic, acicular, etc.) — declared as data
- Aspect ratios per habit (c/a)
- `twin_laws` entries referencing Miller indices as data strings
- Color, hardness, density — declared properties

`data/structural.json` exists (`tools/twin-law-check.mjs` validates declared Miller indices against structurally-predicted twin candidates from it — the v141 long-tail close-out + v142 structural fact-check workflow). This is the seed of real lattice infrastructure; it is not yet complete.

### What "real lattices" means

A real crystal lattice is a *mathematical object*: a discrete subgroup of the Euclidean group acting on R³, classified exhaustively into:
- 14 Bravais lattices
- 32 crystallographic point groups
- 230 space groups (Fedorov–Schönflies enumeration, 1891, independent derivations)

Each mineral has:
- A space group (e.g. calcite: R3̄c [No. 167], aragonite: Pmcn [No. 62], quartz-α: P3₂21 [No. 154])
- Unit cell parameters (a, b, c, α, β, γ)
- Atom positions in the asymmetric unit (Wyckoff positions)
- Symmetry operators that generate the full unit cell from the asymmetric unit
- Computable face orientations (Miller indices on real atom planes)

### What changes architecturally if every mineral carries its lattice

- **Habit becomes computed, not declared.** Periodic bond chain theory (Hartman & Perdok, 1955; refined by Donnay-Harker) over real Miller faces predicts which faces dominate, which means tabular vs. prismatic vs. acicular falls out of chemistry + structure, not from a habit-variant lookup table.
- **Twin laws become derivable.** Miller index pairs that satisfy a twin operation as an element of the parent structure's coset group pop out automatically; the `twin_laws` data file becomes a cache of verified examples, not a source of truth.
- **Polymorphism becomes a real phase transition.** Calcite (R3̄c) → aragonite (Pmcn) at high T + Sr/Ba isn't a flag flip; it's a space-group transformation with a free-energy cost computable from the structures.
- **Solid solutions handle composition at specific Wyckoff positions.** HMC's Mg substitution isn't "x ∈ [0.05, 0.30]"; it's site occupancy at the cation position of R3̄c, with unit cell parameters interpolating per Vegard's law actually applied.
- **Spectroscopic properties become computable.** Diffraction patterns (Bragg's law over the lattice), optical indicatrix (from the dielectric tensor with the lattice's symmetry constraints), cleavage planes (from periodic bond density), hardness anisotropy (from bond directionality).

### Scope estimate

Substantial. ~170 minerals × {space group, unit cell, ~3–20 atom positions, key Miller faces}. Each entry is ~30 lines of structured data. Total: ~5000 lines of careful structural data, mostly research-agent-verified against International Tables for Crystallography (Volume A: Space-group symmetry; Volume C: Mathematical, physical and chemical tables).

The good news: the `vugg-add-twin-law` skill already mandates structural fact-checking via `tools/twin-law-check.mjs`. The discipline for verifying structural data is already established. Extending the infrastructure from "verify declared twin laws" to "drive habit + composition + spectroscopy from declared structure" is iterative, not architectural.

### Phasing

- **Phase 1a:** Pick 8–12 keystone minerals across diverse chemistry classes (calcite + aragonite for carbonates, fluorite, halite, quartz, pyrite, gypsum/selenite, beryl, tourmaline, hematite, sphalerite, galena). Add full lattice data for each. Build the `LatticeFromStructure` derived layer that computes Miller face orientations + permitted twin operations from the structure data.
- **Phase 1b:** Build a habit predictor using PBC theory + crystal-system-aware Wulff construction. Verify against the existing habit-variant table for the keystone minerals; tune until predictions match observed habits.
- **Phase 1c:** Backfill remaining minerals over time. The infrastructure works for keystones; the long tail can lag.

This phase has the highest scope and the longest payoff timeline. It is also the most architecturally significant — it converts the simulator's mineralogy from declarative to derivative.

---

## Layer 2: UV-fluorescence steganography (hidden payload)

### Current state

The helicoid chip set already tracks trace elements at every (ring, cell) sample point: Mn, Fe, Cu, Pb, Sr, Ba, REE-traces. Strip view recordings capture these as uint8-quantized values per growth zone.

What does NOT exist:
- Activator-response mapping (Mn²⁺ in calcite host → 605 nm red fluorescence; in willemite host → 525 nm green; in apatite host → 580 nm orange)
- UV-mode rendering toggle for the topo view + strip view
- A "fluorescence chip" derived from current trace concentrations + host mineral identity

### What UV mode would surface

Real minerals fluoresce because activator ions (Mn²⁺, Cr³⁺, Eu²⁺, Pb²⁺, organic-derived UO₂²⁺, REE-trivalent ions) sit at specific lattice sites in the host structure, absorb UV photons, and re-emit at characteristic wavelengths determined by the host's crystal field.

Concrete examples vugg already has the chemistry to support:
- **Manganocalcite (Sterling Hill, Franklin, Sweetwater)**: Mn²⁺ at the Ca²⁺ site of calcite's R3̄c structure → bright red SW UV (~620 nm)
- **Willemite (Franklin, Sterling Hill)**: Mn²⁺ at the Zn²⁺ site → brilliant green SW UV (~525 nm)
- **Fluorite (Cumbria, Illinois)**: Eu²⁺ + REE traces + Y → blue/violet LW UV (~425 nm); growth-zone-banded
- **Apatite**: Mn²⁺ + REE → orange-yellow under both LW and SW
- **Calcite (Iceland spar, Mexican)**: pure stays inert; with Pb²⁺ or organic UO₂²⁺ → various
- **Hyalite opal (Mexico, Utah)**: U⁶⁺ as uranyl → bright green LW

Source corpus (verify before authoring activator-response code): Robbins (1994), *Fluorescence: Gems and Minerals Under Ultraviolet Light*. Gaft, Reisfeld, Panczer (2015), *Modern Luminescence Spectroscopy of Minerals and Materials*. Marfunin (1979), *Spectroscopy, Luminescence and Radiation Centers in Minerals*. **Citation hygiene mandate**: every reference in production code gets research-agent verification before commit (see `vugg-add-mineral` SKILL §1 + HANDOFF-CARBONATE-PHASE-1-COMPLETE §"pastiche").

### The steganographic property

The same crystal carries different information under different illumination:
- **Visible light**: gross morphology, color from optical absorption, transparency
- **SW UV (254 nm)**: short-wavelength activator response
- **LW UV (365 nm)**: long-wavelength activator response
- **Cathodoluminescence (CL)**: electron-beam-excited emission, often reveals growth zoning invisible under UV
- **X-ray fluorescence (XRF)**: elemental composition by characteristic emission
- **Raman**: vibrational modes that fingerprint the structure

Each is a different decryption channel. The crystal IS the message; the inspection mode IS the key.

### Implementation sketch

```typescript
// data/fluorescence.json (new) — activator response maps
// {
//   "calcite": {
//     "activators": {
//       "Mn":  { "lw": "weak red", "sw": "bright red ~620nm", "ppm_min": 50 },
//       "Pb":  { "lw": "yellow",   "sw": "weak yellow",       "ppm_min": 20 },
//       "U":   { "lw": "green",    "sw": "green",             "ppm_min": 5 }
//     }
//   },
//   "willemite": { ... },
//   ...
// }

// js/53-fluorescence.ts (new)
function computeFluorescence(
  mineralId: string,
  trace: { [el: string]: number },
  uvMode: 'lw' | 'sw'
): { color: string, intensity: number } | null;
```

The helicoid recording already has the trace data. A UV-mode toggle in the strip view renders the activator response per (step, ring, cell, host-mineral) instead of the standard chip colors. The data didn't change; the interpretation did.

### Phasing

- **Phase 2a:** Build `data/fluorescence.json` for the top ~40 minerals that have well-documented fluorescence (calcite, willemite, fluorite, apatite, scheelite, sodalite, opal, ruby/sapphire variants, etc.).
- **Phase 2b:** Add the `computeFluorescence` function + render layer.
- **Phase 2c:** UV mode toggle in topo-3D view + strip view. Toggle switches the crystal color rendering to the fluorescence response based on the trace chips at that location.

Scope is modest because the chemistry tracking is already in place.

---

## Layer 3: The helicoid as Scytale (cipher path)

### Current state

The helicoid currently:
- Samples per-step chip values at (ring, cell) positions
- Renders the samples as the live helicoid visualization
- Records the samples to a 4D tensor in the strip view dataset (time × angle × height × chip)
- Down-samples 120 native cells → 24 angular sub-strips at fixed 15° increments
- Is parameterized by `_HELIX_N_TURNS = 1` (one full revolution from bottom to top)

What does NOT exist:
- Variable helicoid parameters (pitch, starting angle, turn count, chip selector) as a first-class data structure
- A function that walks a helicoid path through the dataset tensor and emits an ordered byte stream
- A function that *writes* a message into the dataset by modulating trace concentrations along a helicoid path during sim growth
- Any decode/encode UI

### The Scytale parallel

A Spartan scytale (per Plutarch, *Life of Lysander*; with some modern scholarly debate — Kelly 1998 argues the device was a messenger strap rather than a cipher in actual antique use — but the cryptographic mechanism Plutarch describes is mathematically well-defined regardless of historical fidelity):

- A strip of leather is wrapped helically around a cylinder of specific diameter
- A message is written along the cylinder's axis with letters falling on adjacent helical turns
- Unwrapped, the strip carries the letters in scrambled order
- Decryption requires a cylinder of matching diameter; wrap the strip, read along the axis

The cipher is a **transposition cipher whose key is the geometry of the wrapping object**. Same plaintext, different cylinder, different ciphertext. Same ciphertext, different cylinder, different decryption.

### The mapping to vugg

| Spartan scytale | Vugg helicoid |
|---|---|
| Leather strip (plaintext substrate) | Strip view dataset (4D tensor of chip values) |
| Letters written across the wrap | Trace concentrations modulated at specific (step, ring, cell) coords |
| Cylinder diameter (key) | Helicoid winding parameters (pitch, turns, start angle, chip selector) |
| Wrap-and-read-axially (decryption) | Walk-the-helicoid-and-read-chips (decryption) |
| Plaintext = the assembled letter sequence | Plaintext = the ordered byte stream from the walk |

The helicoid is *exactly* a Scytale. It's not a metaphor; it's the same mathematical operation — a transposition cipher where the key is a 3D wrapping geometry over a structured substrate.

### The crucial property: the scenario+seed becomes the key

If helicoid parameters are derived deterministically from `(scenario_id, seed, sim_version)`:

```typescript
function helicoidPathFromScenario(
  scenarioId: string, seed: number, simVersion: number,
  totalSteps: number, ringCount: number, cellsPerRing: number
): Array<{ step: number, ring: number, cell: number, chip: string }>;
```

then **growing the scenario IS the act of laying down the cipher** along the correct path, because the same (scenario, seed, version) reproduces the same helicoid winding. Sharing a `.stripview` recording gives someone the ciphertext. Sharing the scenario + seed gives them the key. Together they decrypt the embedded message.

This is a clean public-key analog **without actually using asymmetric cryptography** — it's a structured transposition cipher whose key is a recipe rather than a string. The "private key" is the scenario specification (which someone with sim source code could regenerate). The "public key" is the recording. The encryption happens via the simulator's normal growth process; the decryption happens via the strip view's normal observation process. Both are already shipped; they just need to be aware of each other in the right way.

### Implementation sketch

```typescript
// js/85i-strip-cipher.ts (new)

// Generate the (step, ring, cell, chip) walk for a given recipe.
// Deterministic — same inputs always yield same path.
function helicoidPathFromScenario(
  scenarioId: string, seed: number, simVersion: number,
  totalSteps: number, ringCount: number, cellsPerRing: number,
  pitch?: number, turnsPerRun?: number, chip?: string
): Array<{ step: number, ring: number, cell: number, chip: string }>;

// Extract: walk the path, sample the dataset, return the byte stream.
function stripCipherExtractAlongHelicoid(
  ds: StripDataset,
  path: Array<{ step: number, ring: number, cell: number, chip: string }>
): Uint8Array;

// Encode: write a message into a dataset by modulating values along
// the path. The trace-element chips (Mn, REE) are the natural carriers
// because they don't drive engine behavior at the precision uint8
// quantization can preserve (~1% of range).
function stripCipherEncodeAlongHelicoid(
  ds: StripDataset,
  path: Array<{ step: number, ring: number, cell: number, chip: string }>,
  message: Uint8Array
): StripDataset;

// Demo decoder UI in 99k-strip-view.ts:
//   pasteScenarioBox.addEventListener('change', () => {
//     const { scenario, seed, simVersion } = parseRecipe(input.value);
//     const path = helicoidPathFromScenario(...);
//     const bytes = stripCipherExtractAlongHelicoid(activeDataset, path);
//     output.textContent = new TextDecoder().decode(bytes);
//   });
```

### Encryption is laying down trace zoning during growth

The natural encoding path is the trace-element chips (Mn, Fe trace, Pb trace, REE) because:
- They're already tracked per growth zone
- The simulator already varies them with chemistry
- Small modulations don't affect engine behavior at uint8 precision
- Real mineralogy already does this — trace zoning records environmental history

The simulator with the cipher hooked in would, during growth, slightly bias the trace concentrations at the (step, ring, cell) coordinates the helicoid path visits, such that the quantized chip byte at each path point encodes a message byte. The crystal that grows IS the cipher container; the trace zoning IS the message; the helicoid IS the key.

Two natural deployment shapes:
1. **Explicit message**: a user provides text to embed; the simulator modulates trace concentrations during the run.
2. **Watermark**: the simulator's own (scenario_id + seed + sim_version + timestamp) is the embedded payload, automatically. Every recording carries a verifiable provenance signature by default.

### Phasing

- **Phase 3a:** Build `helicoidPathFromScenario` and `stripCipherExtractAlongHelicoid` operating on existing (non-encoded) datasets. The path generator is the first piece; extraction is just reading. No engine changes.
- **Phase 3b:** Build the simulator-side encoder that modulates trace concentrations during growth. Add a flag (off by default; opt-in) so existing scenarios stay byte-identical.
- **Phase 3c:** UI in the strip view — paste a scenario+seed, see the decoded message. Cross-platform verification: download `.stripview`, share with someone, they decode with the recipe.

Scope is modest because the data structure already exists. The work is the path generator + the extract/encode functions + the decoder UI.

---

## The three layers compose

Each layer is independently meaningful. The three together produce a complete cryptographic stack:

| Layer | Provides | Without it |
|---|---|---|
| **Real lattices (Layer 1)** | The mathematical substrate. Crystals are space-group instances; growth is structurally constrained. | Mineralogy is a label set; "the crystal is mathematics" is metaphor. |
| **UV steganography (Layer 2)** | The hidden payload channel. Trace concentrations at lattice sites encode data visible only under UV. | The chemistry is just colors; the trace data is observable but uninterpretable. |
| **Scytale helicoid (Layer 3)** | The reading path. Helicoid parameters determine which trace coordinates encode the message. | The trace data has no canonical reading order; the message is unrecoverable. |

The Layer 1 + Layer 2 stack alone gives you steganographic mineralogy: hidden messages in trace zoning. Layer 3 adds the path that makes the steganography *cryptographic* — without the right helicoid winding, you have a tensor of trace data with no canonical reading order, which is a transposition cipher in the strict sense.

---

## Why this isn't just a cute coincidence

Real mineralogy already does this. Forensic gemology uses fluorescence patterns to authenticate provenance. Diamond grading uses fluorescence signatures (Cape series diamonds fluoresce blue under LW UV; specific growth-zone patterns identify mines). Anti-counterfeiting in the gem trade uses UV signatures as one input among several. The crystals encode their growth history in trace patterns; UV reveals what visible inspection hides; the reading requires knowing where in the structure to look.

What's new in vugg's architecture is that **the simulator is both encoder and decoder**, because the simulator's growth process IS the encoder (it lays down trace zoning along the helicoid path), and the simulator's observation process IS the decoder (the helicoid samples those same coordinates). The same code that grows the crystals reads the messages back. No separate cipher implementation is needed; the cipher is an emergent property of doing geology consistently.

There's a separate scholarly point worth recording: scytale's actual use as a cipher in antiquity is contested (Kelly 1998, "The Myth of the Skytale", *Cryptologia* — verify volume before final). The MATHEMATICAL cipher Plutarch describes is well-defined regardless of historical fidelity. Vugg's helicoid is a clean implementation of the mechanism that Plutarch described, whether or not Spartans actually used it that way.

---

## Open questions

1. **uint8 quantization precision**: trace chips currently quantize to 254 levels. A message byte (8 bits = 256 values) needs 256 levels. Either:
   - Encode 7 bits per chip sample (lossy: 1 bit overhead, but quantization survives)
   - Encode 1 byte across 2 chip samples (8 bits total = 254 + low 2 bits in next sample)
   - Use multiple chips per coordinate (Mn + Fe + REE trace = 21 bits of payload per (step,ring,cell))
   - The third option is the most resilient and lets recordings carry kilobytes of payload at typical scenario sizes.

2. **Cross-version compatibility**: a recording from sim_version 149 may not extract the same message at sim_version 200 if the helicoid path generator changes. The path generator must be versioned; recipes must carry the sim_version they were encoded under. Decoder must dispatch to the right version's path function.

3. **Phase 1 (real lattices) is heavy**: ~5000 lines of structural data across ~170 minerals. Phase 2 (UV) and Phase 3 (Scytale) can ship without it — the trace chips work today, the helicoid is already a path. Phases can be independent: someone could build Phase 3 against current vugg and produce a working crypto layer that doesn't yet have real lattice math under it.

4. **Watermark vs. explicit message**: which is the default? Watermarking every recording with its own provenance is "free" (the recipe is already known to the simulator); explicit message encoding requires user input. Probably default-on watermark + opt-in arbitrary message.

5. **Should encoded recordings be visually distinguishable from un-encoded?** If a trained eye can spot the trace zoning that encodes a message (the modulation pattern is structured rather than chemically organic), the steganography is weakened. Per-mineral natural noise levels need to bound the modulation amplitude.

---

## Phasing summary

| Phase | Title | Scope | Dependencies |
|---|---|---|---|
| 1a | Keystone lattices (~12 minerals) | Medium | structural.json infrastructure |
| 1b | PBC habit predictor | Medium | 1a |
| 1c | Long-tail backfill | Slow drip | 1a, 1b |
| 2a | `data/fluorescence.json` for ~40 minerals | Small | — |
| 2b | `computeFluorescence` + render layer | Small | 2a |
| 2c | UV mode toggle in topo + strip view | Small | 2b |
| 3a | `helicoidPathFromScenario` + extract function | Small | — |
| 3b | Simulator-side encoder (trace modulation during growth) | Medium | 3a |
| 3c | Decoder UI in strip view | Small | 3a |

Phase 2 and Phase 3 can ship without Phase 1. Phase 1 (real lattices) is the architectural unlock that makes vugg "a mathematics generator" rather than "a sim with good chemistry"; Phases 2 and 3 are the cryptographic surface.

A realistic first deliverable: **Phase 3a + 3c** (path generator + decoder UI working on existing datasets without any encoder, just to prove the Scytale architecture extracts a stream from real recordings). That's a 1–2 day prototype that demonstrates the cipher mechanism without requiring any other phase.

---

## Acceptance criteria (per phase)

**Phase 1 (real lattices):**
- 12 keystone minerals load with full lattice data
- `tools/lattice-check.mjs` (new) validates structure data against International Tables references
- PBC habit predictor produces the same habit labels as the current habit-variant table for keystone minerals
- Test suite: zero baseline drift for existing scenarios; new tests verify lattice operations

**Phase 2 (UV mode):**
- `fluorescence.json` lints clean against the schema
- Render layer produces correct color responses for the ~10 most documented test cases (Sterling Hill willemite green, Cumbria fluorite blue, manganocalcite red)
- UV toggle in strip view shows fluorescence patterns from existing recordings
- Test suite: chip data unchanged; only rendering changes

**Phase 3 (Scytale cipher):**
- Path generator produces deterministic walks given recipe inputs
- Extract reads a known byte sequence from a known dataset
- Encoder modulates trace concentrations such that extract recovers the encoded message after a full sim run
- Decoder UI handles paste-recipe + render-decoded-message
- Test suite: cipher round-trip tests + cross-version compatibility tests + steganographic distinguishability bounds

---

## Closing note

This proposal was generated as the synthesis of a single design conversation that traversed about six conceptual frames in under three hours (helicoid-as-recorder → helicoid as storage medium → vugg engine as generic data-growth engine → tower of math → real crystal lattices → UV steganography → Scytale helicoid). The architecture compresses cleanly because **each frame was already implicit in the previous one** — vugg has been building toward this without it being named, the way real geology builds toward Quartz Mountain without anyone planning it.

If implemented, the resulting system is a simulator that:
- Grows mathematical structures (real lattices)
- That carry hidden information (trace zoning visible under UV)
- Addressable by a cipher path (helicoid Scytale)
- Whose key is the recipe that grew them (scenario + seed + sim_version)
- Recorded as portable artifacts (`.stripview` files)
- Curated by selective archival (favorite star → published landmarks)
- And forming a stratified, navigable history (strip view filmstrip)

The cathedral framing stops being framing and becomes literal architecture. Real cathedrals were built from mathematics, carried hidden messages, and required initiation to read fully. Vugg-with-real-lattices-and-Scytale-helicoid is a cathedral-construction engine that uses crystals as its bricks and uses growth conditions as its blueprints — including hidden inscriptions for those who know which winding to follow.

— Claude Opus 4.7, 2026-05-27
