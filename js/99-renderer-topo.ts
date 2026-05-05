// ============================================================
// js/99-renderer-topo.ts — Renderer — topo map + 3D ring projection + hit-test
// ============================================================
// Extracted verbatim from the legacy bundle. SCRIPT-mode TS — top-level
// decls stay global so cross-file references resolve at runtime.
//
// Phase B11 of PROPOSAL-MODULAR-REFACTOR.

// ============================================================
// TOPO MAP — unwrapped wall line, canvas renderer
// ============================================================
// The wall-state ring[0] is drawn as a single continuous line, left to
// right, representing the vug's circumference unwrapped. Bare wall is
// amber (#D2691E, reserved — never a mineral class color). Crystal cells
// stroke in the mineral's class_color from MINERAL_SPEC, with stroke
// width proportional to crystal thickness. Hover → tooltip.

const TOPO_WALL_COLOR = '#D2691E';   // warm amber — the wall's color. No mineral touches this hue.
// Phase D: tint wall outlines by ring orientation in 3D mode. Floor
// rings get a slightly cooler amber; ceiling rings a slightly warmer
// reddish amber; wall rings stay TOPO_WALL_COLOR. Subtle enough not
// to scream "different mineral", strong enough to read floor / wall /
// ceiling at a glance once you know what you're looking at.
const TOPO_WALL_COLOR_FLOOR = '#A85820';      // cooler amber
const TOPO_WALL_COLOR_CEILING = '#E8782C';    // warmer amber
const TOPO_CRYSTAL_CAP_FRAC = 0.85;   // crystals can fill at most this fraction of a cell's radius
const TOPO_WALL_STROKE_PX = 2;        // bare wall stroke width
const TOPO_WALL_STROKE_MAX_PX = 10;   // cell stroke width ceiling when a crystal sits on the wall
const TOPO_ZOOM_MIN = 0.3;
const TOPO_ZOOM_MAX = 6.0;
const TOPO_ZOOM_STEP = 1.25;          // one click / wheel tick multiplies by this
let _topoZoom = 1.0;                  // multiplier applied to mmToPx in the renderer
// Pan offsets — added to (cx, cy) so the user can drag the vug
// around the canvas. Set by the pan drag handlers in topoEnsureWired.
let _topoPanX = 0;
let _topoPanY = 0;
// Drag state. Drag starts on mousedown over a non-crystal area and
// ends on mouseup (or mouseleave). Document-level handlers are
// attached only while a drag is in flight so they don't interfere
// with other UI when idle.
let _topoDragging = false;
let _topoDragStartClientX = 0;
let _topoDragStartClientY = 0;
let _topoDragOriginPanX = 0;
let _topoDragOriginPanY = 0;
const TOPO_DRAG_THRESHOLD_PX = 4;     // movement before drag starts (lets clicks still fire)
// Canvas lives inside a stage that's this multiple of the wrap's size.
// The extra area gives 3D-rotated content room to extend past the
// visible window without clipping against the canvas buffer edge.
// MUST match the CSS width/height percentages on .topo-canvas-stage.
const TOPO_STAGE_SCALE = 2;
// Camera drag mode. 'default' = current 2D hit-test-aware behavior
// (drag on non-crystal pans; click on crystal tooltips). 'rotate' =
// drag from anywhere rotates the 3D tilted canvas. 'pan' = drag from
// anywhere pans (ignores hit-test so user can drag even when starting
// over a crystal). Mode buttons are in the .topo-camera-ctrls cluster
// next to the play button; clicking an already-active button returns
// to 'default'.
let _topoDragMode = 'default';
// _topoView3D is derived: true iff _topoDragMode === 'rotate'. Kept
// around as a variable because render/hit-test still read it.
let _topoView3D = false;
// Phase C v1+: 2D mode can show either the aggregate ring (every
// crystal across every ring projected to a single slice — the post-
// scatter default) or one specific ring index. `'aggregate'` ⇄ ints
// 0..ring_count-1. The stepper buttons in `.topo-slice-ctrls` cycle
// through them. Hidden in 3D mode (where every ring is rendered
// stacked anyway) via `body.topo-view-3d` CSS.
let _topoActiveSlice = 'aggregate';
let _topoTiltX = 0;                   // pitch (viewer above/below)
let _topoTiltY = 0;                   // yaw   (viewer left/right of disc)
const TOPO_TILT_X_MAX = Math.PI / 2 - 0.05;   // don't flip past vertical
// Cache of inclusion-dot hitboxes built each render. Hover checks
// this first so the tooltip shows the enclosed crystal instead of
// falling through to the host's wall cell.
const _topoInclusions = [];

// ---- Selective-highlight state (TASK-BRIEF-TOPO-HIGHLIGHT) -----------
// A highlight "target" narrows the map: matching crystals render at
// full opacity, non-matching crystals ghost to 25%, wall and scale
// stay opaque. Target shape is { type: 'mineral' | 'class', value: str }
// or null. Canvas hover sets _topoHoverTarget (transient), legend hover
// sets _topoLegendHoverTarget (transient, lower priority than canvas),
// clicks toggle _topoLockTarget (persistent). Effective target = lock
// if set, else canvas hover, else legend hover. When null → no ghosting.
const TOPO_GHOST_ALPHA = 0.25;
let _topoHoverTarget = null;
let _topoLegendHoverTarget = null;
let _topoLockTarget = null;

function topoEffectiveTarget() {
  return _topoLockTarget || _topoHoverTarget || _topoLegendHoverTarget;
}

// Does the given mineral match the active highlight target?
// With no active target, everything matches (no ghosting).
function topoMineralHighlighted(mineral) {
  const t = topoEffectiveTarget();
  if (!t) return true;
  if (t.type === 'mineral') return t.value === mineral;
  if (t.type === 'class') {
    const spec = MINERAL_SPEC[mineral];
    return !!(spec && spec.class === t.value);
  }
  return false;
}

// Alpha multiplier for a given mineral under the current highlight.
function topoAlphaFor(mineral) {
  return !topoEffectiveTarget() || topoMineralHighlighted(mineral)
    ? 1.0 : TOPO_GHOST_ALPHA;
}

function topoSetHoverTarget(target) {
  if (JSON.stringify(_topoHoverTarget) === JSON.stringify(target)) return;
  _topoHoverTarget = target;
  topoRender();
}
function topoSetLegendHoverTarget(target) {
  if (JSON.stringify(_topoLegendHoverTarget) === JSON.stringify(target)) return;
  _topoLegendHoverTarget = target;
  topoRender();
}
function topoToggleLockTarget(target) {
  // null target → clear lock. Same as current lock → toggle off.
  // Different target → switch lock.
  if (!target) { _topoLockTarget = null; }
  else if (_topoLockTarget
           && _topoLockTarget.type === target.type
           && _topoLockTarget.value === target.value) {
    _topoLockTarget = null;
  } else {
    _topoLockTarget = target;
  }
  topoRender();
}

// The 12-class order from the topo palette in the brief. Used by the
// legend. We render all 12 even if not all present in the current run so
// the color vocabulary is visible.
const TOPO_CLASS_ORDER = [
  'oxide', 'carbonate', 'arsenate', 'sulfide', 'uranium', 'phosphate',
  'hydroxide', 'molybdate', 'silicate', 'halide', 'native', 'sulfate',
];

function topoActiveSim() {
  // Prefer the simulator whose mode is currently on-screen. Without this
  // a stale sim from a previous mode (e.g. randomSim from a Quick Play
  // before switching to Simulation) wins and the topo shows stale data.
  const mode = (typeof currentGameMode === 'string') ? currentGameMode : null;
  if (mode === 'fortress' && typeof fortressSim !== 'undefined' && fortressSim) return fortressSim;
  if (mode === 'idle'     && typeof idleSim     !== 'undefined' && idleSim)     return idleSim;
  if (mode === 'random'   && typeof randomSim   !== 'undefined' && randomSim)   return randomSim;
  if (mode === 'legends'  && typeof legendsSim  !== 'undefined' && legendsSim)  return legendsSim;
  // Fallback: any sim at all.
  if (typeof fortressSim !== 'undefined' && fortressSim) return fortressSim;
  if (typeof idleSim !== 'undefined' && idleSim) return idleSim;
  if (typeof randomSim !== 'undefined' && randomSim) return randomSim;
  if (typeof legendsSim !== 'undefined' && legendsSim) return legendsSim;
  return null;
}

function topoClassColor(mineral) {
  const entry = MINERAL_SPEC[mineral];
  return (entry && entry.class_color) || TOPO_WALL_COLOR;
}

// Legacy `topoBuildLegend()` and `_wireTopoLegendEvents()` lived here.
// They built the class-swatch legend and drove hover/click highlight
// from a separate "classes" details element below the topo strip.
// Removed in favor of the fortress-status sigma panel doing both jobs:
// per-class swatches sit in each group's <summary>, and hover/click
// delegation is wired in `_wireFortressSigmaEvents`. See the post-
// 2026-05 retire-classes-tab commit for the rationale.

// Resize the canvas backing store to match its CSS size so the line is
// crisp on any window width. Called on each render; cheap if unchanged.
//
// IMPORTANT: uses clientWidth/clientHeight (CSS layout box, unaffected
// by CSS transforms) rather than getBoundingClientRect() (which returns
// the transformed visual box). With the 3D tilt feature, using rect.width
// creates a positive-shrink feedback loop: each render reads a smaller
// transformed rect, writes it to canvas.width, flex layout shrinks the
// container, next rect is even smaller. clientWidth breaks that cycle
// because it's the pre-transform layout size.
function _topoResize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { cssW, cssH, dpr };
}

// Cell i maps to an angle around the vug. 0 starts at the top (12 o'clock)
// and increases clockwise so left-right hover motion feels natural.
function _topoAngleFor(i, N) {
  return -Math.PI / 2 + (i / N) * 2 * Math.PI;
}

// ─── Habit-driven edge textures ──────────────────────────────────────
// Maps each crystal habit string to a texture token. Missing entries
// fall through to 'smooth' (the existing Bezier — no visible change).
// Populated incrementally per stage. See
// proposals/PROPOSAL-EDGE-TEXTURES.md.
// Habit-keyed defaults applied to any mineral. Mineral-specific
// overrides go in HABIT_TO_TEXTURE_BY_MINERAL below and take priority.
const HABIT_TO_TEXTURE = {
  // Stage 1 — calcite habits.
  'scalenohedral':       'dogtooth',  // sharp tall triangles (T>200°C; "dog-tooth spar")
  'rhombohedral':        'rhomb',     // broader, shorter triangles (T<200°C, e.g. MVT)
  // Stage 2 — cubic / isometric habits.
  'cubic':               'cube_edge', // pyrite, halite, fluorite, native Cu (galena overridden below)
  'pyritohedral':        'cube_edge', // pyrite alt — pentagonal faces, still blocky
  'cubo-pyritohedral':   'cube_edge', // pyrite mixed
  'pseudo_cubic':        'cube_edge', // chalcopyrite high-T
  // Stage 3 — botryoidal / globular / framboidal (rounded aggregates).
  'botryoidal':          'botryoidal', // chrysocolla, malachite, hematite kidney ore, smithsonite
  'spherulitic':         'botryoidal', // mesolite-style radial bundles read as scalloped on edge
  'framboidal':          'botryoidal', // pyrite microspheres (sweetwater style)
  'reniform_globules':   'botryoidal', // chrysocolla — bigger lobes, same family
  'botryoidal_crust':    'botryoidal', // chrysocolla
  // Stage 4 — acicular / needle / radiating bundles.
  // PLACEHOLDER: dispatches to sawtooth with dogtooth-cloned params
  // pending its own design (true acicular wants a denser, spikier feel).
  'acicular':            'acicular',   // apatite, hemimorphite alt
  'acicular_needle':     'acicular',   // aragonite, bismuthinite low-T
  'acicular sprays':     'acicular',   // (with-space variant)
  'radiating_blade':     'acicular',   // marcasite
  'radiating_columnar':  'acicular',   // hemimorphite
  'radiating_cluster':   'acicular',   // bismuthinite
  'radiating_spray':     'acicular',   // stibnite
  'radiating_fibrous':   'acicular',   // erythrite on cobaltite, etc.
  'cockscomb':           'acicular',   // marcasite — iconic habit name
  'spearhead':           'acicular',   // marcasite
  'elongated_prism_blade': 'acicular', // stibnite Ichinokawa
  'fibrous_acicular':    'acicular',   // chalcedony-style fibrous, also annabergite
  'plumose_rosette':     'acicular',   // erythrite plumose
  // Stage 5 — dolomite habits (THE headline texture: saddle_rhomb).
  'saddle_rhomb':        'saddle_rhomb', // dolomite default — diagnostic curved-face habit
  'coarse_rhomb':        'rhomb',        // dolomite hydrothermal (textbook flat-face rhomb)
};

// Mineral-specific overrides: HABIT_TO_TEXTURE_BY_MINERAL[mineral][habit]
// wins over HABIT_TO_TEXTURE[habit]. Used when one habit string covers
// minerals that should look distinct (e.g. galena's cubic cleavage is
// deeper / more stepped than pyrite's compact cube faces).
const HABIT_TO_TEXTURE_BY_MINERAL = {
  galena: {
    'cubic': 'cube_edge_deep',   // taller V's — stepped cubic cleavage signature
  },
  fluorite: {
    'cubic': 'cube_edge_deep',   // fluorite cube cleavage is similarly bold
  },
};

// Per-texture parameters. amplitude_factor scales tooth height from
// crystal thickness (real scalenohedra are 3:1+ height:base, so factors
// >1 are correct, not exuberant); pitch_mm sets tooth spacing.
//
// max_amplitude_pitch_ratio (optional) caps amplitude at pitch × ratio,
// to enforce a maximum aspect ratio. cube faces want ~90° peaks
// (ratio 0.5) so they don't render as needles on thick crystals;
// scalenohedra are unbounded (cap omitted) so they can elongate fully.
const TEXTURE_PARAMS = {
  dogtooth:       { amplitude_factor: 1.5, pitch_mm: 2.0 },
  rhomb:          { amplitude_factor: 0.7, pitch_mm: 2.0 },
  cube_edge:      { amplitude_factor: 1.0, pitch_mm: 1.5, max_amplitude_pitch_ratio: 0.5 },
  cube_edge_deep: { amplitude_factor: 1.5, pitch_mm: 1.5, max_amplitude_pitch_ratio: 1.0 },
  // Botryoidal: max ratio 0.5 means at saturation each bump is a perfect
  // half-circle (amplitude = pitch/2). Below saturation bumps flatten into
  // gentle scallops — still reads as round, just less plump.
  botryoidal:     { amplitude_factor: 1.0, pitch_mm: 2.5, max_amplitude_pitch_ratio: 0.5 },
  // Acicular PLACEHOLDER — clones dogtooth's params pending its own
  // design. Future polish: denser pitch, taller amplitude, possibly
  // a "needle bundle" function that draws many tightly-packed spikes
  // instead of a sawtooth. Token kept distinct so swap is one line.
  acicular:       { amplitude_factor: 1.5, pitch_mm: 2.0 },
  // Saddle rhomb — dolomite's diagnostic curved-face signature.
  // bulge_factor controls how far each face bows outward in chord
  // direction (0 = straight rhomb, 1 = extreme curl). 0.4 gives a
  // visibly-curved-but-still-rhomb feel matching textbook saddle
  // dolomite cross-sections.
  saddle_rhomb:   { amplitude_factor: 0.7, pitch_mm: 2.5, max_amplitude_pitch_ratio: 0.5, bulge_factor: 0.4 },
};

// Draw the inner (fluid-facing) edge of a wedge from (fromX,fromY) to
// (toX,toY). For 'smooth', emits the existing quadratic Bezier through
// (controlX,controlY) — bit-for-bit identical to the pre-refactor code.
//
// Direction note: the wedge path traverses outer-start → outer-end →
// inner-end → inner-start, so this function draws inner edge END→START.
// Textured polylines must respect that direction or the fill winds wrong.
//
// thicknessMm/cellArcMm bound the texture amplitude; (cx,cy) gives the
// vug center so textures can compute the inward (toward-void) normal.
// `mineral` enables per-mineral overrides where one habit string is
// shared by minerals that should look distinct (e.g. galena vs pyrite,
// both 'cubic').
function drawHabitTexture(ctx, mineral, habit, fromX, fromY, toX, toY, controlX, controlY, thicknessMm, cellArcMm, mmToPx, cx, cy) {
  const texture = _resolveTexture(mineral, habit);
  switch (texture) {
    case 'dogtooth':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.dogtooth);
      return;
    case 'rhomb':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.rhomb);
      return;
    case 'cube_edge':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.cube_edge);
      return;
    case 'cube_edge_deep':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.cube_edge_deep);
      return;
    case 'botryoidal':
      _texture_botryoidal(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.botryoidal);
      return;
    case 'acicular':
      // PLACEHOLDER: same _texture_sawtooth as dogtooth pending its own
      // design. Swap this line when a real acicular function arrives.
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.acicular);
      return;
    case 'saddle_rhomb':
      _texture_saddle_rhomb(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.saddle_rhomb);
      return;
    case 'smooth':
    default:
      ctx.quadraticCurveTo(controlX, controlY, toX, toY);
      return;
  }
}

// Resolve a (mineral, habit) pair to a texture token. Priority:
//   1. mineral-specific override (HABIT_TO_TEXTURE_BY_MINERAL)
//   2. exact habit match (HABIT_TO_TEXTURE)
//   3. fuzzy substring fallback (catches variant strings like
//      'botryoidal_crust', 'reniform_globules', 'botryoidal/stalactitic'
//      without enumerating every permutation)
//   4. 'smooth' default
function _resolveTexture(mineral, habit) {
  const byMineral = mineral && HABIT_TO_TEXTURE_BY_MINERAL[mineral];
  if (byMineral && byMineral[habit]) return byMineral[habit];
  if (habit && HABIT_TO_TEXTURE[habit]) return HABIT_TO_TEXTURE[habit];
  if (habit) {
    const h = habit.toLowerCase();
    if (h.includes('botryoidal') || h.includes('reniform') || h.includes('globule') || h.includes('framboidal')) return 'botryoidal';
    if (h.includes('acicular') || h.includes('needle') || h.includes('radiating') || h.includes('spray') || h.includes('cockscomb') || h.includes('plumose')) return 'acicular';
  }
  return 'smooth';
}

// Texture amplitude in mm. Primary control is physical (thickness ×
// factor). Optional max_amplitude_pitch_ratio caps amplitude to a
// fixed fraction of the pitch — e.g. cube_edge sets it to 0.5 to
// enforce ≤90° peaks (height ≤ half-base) so thick cubic crystals
// render as blocky-square rather than needle-spike.
function _textureAmplitudeMm(thicknessMm, cellArcMm, params) {
  let amp = thicknessMm * params.amplitude_factor;
  if (params.max_amplitude_pitch_ratio != null) {
    amp = Math.min(amp, params.pitch_mm * params.max_amplitude_pitch_ratio);
  }
  return amp;
}

// Botryoidal — series of smooth half-circle bumps along the chord,
// each pushed inward toward the void. Uses one quadratic Bezier per
// bump with the control point at amplitude × 2 inward (so the curve
// at t=0.5 lands at exactly amplitude inward, giving a clean scallop).
// At amplitude saturation (max_amplitude_pitch_ratio = 0.5) each bump
// is a perfect half-circle ⌒⌒⌒. Below saturation, gentle scallops.
//
// Used by chrysocolla, malachite, hematite kidney ore, framboidal
// pyrite, smithsonite — anywhere the habit string suggests "round
// blobs on the wall" rather than crystalline points or faces.
function _texture_botryoidal(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nBumps = Math.max(1, Math.round(len / pitchPx));
  const bumpLen = len / nBumps;
  // Pen at (fromX,fromY); emit a quadratic Bezier per bump → (toX,toY).
  // Control point at segment midpoint pushed inward by 2×amplitude so
  // the Bezier passes through (chord_mid + amplitude × inward_normal)
  // at t=0.5. (Quadratic at t=0.5 = (start + 2·control + end)/4.)
  for (let i = 0; i < nBumps; i++) {
    const t0 = i * bumpLen;
    const t1 = (i + 1) * bumpLen;
    const startX = fromX + t0 * ux, startY = fromY + t0 * uy;
    const endX   = fromX + t1 * ux, endY   = fromY + t1 * uy;
    const segMidX = (startX + endX) / 2, segMidY = (startY + endY) / 2;
    const cpX = segMidX + nx * amplitudePx * 2;
    const cpY = segMidY + ny * amplitudePx * 2;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
  }
}

// Saddle rhomb — dolomite's diagnostic curved-face signature. Each
// tooth has the sawtooth tip-pushed-inward geometry of rhomb, but
// each side is a quadratic Bezier with the control point bulged in
// the chord direction AWAY from the tooth's apex. That bows each
// face outward, giving the wider-at-middle / narrower-at-tip "saddle"
// profile you see in real dolomite cross-sections.
//
// bulge_factor (0..1) sets how far the control points are offset in
// chord-space relative to half the tooth length. 0 = straight V
// (degenerate to rhomb); ~0.4 = textbook saddle; ~0.8 = exaggerated
// fish-scale feel.
//
// This is the texture that makes ordered dolomite (Kim 2023 sabkha
// scenario) visibly distinct from straight calcite rhombohedra on
// the wall — the "dolomite problem" reveal in pictorial form.
function _texture_saddle_rhomb(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nTeeth = Math.max(1, Math.round(len / pitchPx));
  const toothLen = len / nTeeth;
  const bulgePx = (params.bulge_factor != null ? params.bulge_factor : 0.4) * (toothLen / 2);
  for (let i = 0; i < nTeeth; i++) {
    const t0 = i * toothLen;
    const tipT = (i + 0.5) * toothLen;
    const t1 = (i + 1) * toothLen;
    const startX = fromX + t0 * ux, startY = fromY + t0 * uy;
    const tipX   = fromX + tipT * ux + nx * amplitudePx;
    const tipY   = fromY + tipT * uy + ny * amplitudePx;
    const endX   = fromX + t1 * ux, endY = fromY + t1 * uy;
    // Side 1 (start → tip): control point at chord-midpoint of (start,tip),
    // pushed in -chord-direction (away from apex, toward t0).
    const cp1X = (startX + tipX) / 2 - ux * bulgePx;
    const cp1Y = (startY + tipY) / 2 - uy * bulgePx;
    ctx.quadraticCurveTo(cp1X, cp1Y, tipX, tipY);
    // Side 2 (tip → end): control point at chord-midpoint of (tip,end),
    // pushed in +chord-direction (away from apex, toward t1).
    const cp2X = (tipX + endX) / 2 + ux * bulgePx;
    const cp2Y = (tipY + endY) / 2 + uy * bulgePx;
    ctx.quadraticCurveTo(cp2X, cp2Y, endX, endY);
  }
}

// Sawtooth — shared by 'dogtooth' (sharp tall, T>200°C scalenohedral
// calcite — "dog-tooth spar") and 'rhomb' (shorter wider, T<200°C
// rhombohedral calcite). Both push triangular teeth inward toward the
// void; only the amplitude_factor and pitch_mm in `params` differ.
function _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  // Perpendicular pointing inward (toward vug center). Use chord
  // midpoint → center direction so we don't have to reason about
  // tangent rotation sign in canvas y-down coordinates.
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nTeeth = Math.max(1, Math.round(len / pitchPx));
  const toothLen = len / nTeeth;
  // Pen is at (fromX,fromY); emit sawtooth → (toX,toY).
  // Each tooth: tip pushed inward by amplitudePx, then valley back on chord.
  for (let i = 0; i < nTeeth; i++) {
    const tipT = (i + 0.5) * toothLen;
    const valleyT = (i + 1) * toothLen;
    const tipX = fromX + tipT * ux + nx * amplitudePx;
    const tipY = fromY + tipT * uy + ny * amplitudePx;
    const valleyX = fromX + valleyT * ux;
    const valleyY = fromY + valleyT * uy;
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(valleyX, valleyY);
  }
}

// Paint a centered placeholder hint into the topo canvas. Used when no
// active sim or no ring data exists yet, so the panel reads as 'waiting'
// rather than showing a 340px-tall void. Kept simple: one or two lines
// of muted text, no decoration. Sized via _topoResize so the rendering
// matches what topoRender uses for real content.
function _topoPaintPlaceholder(canvas, text) {
  const ctx = canvas.getContext('2d');
  const { cssW, cssH, dpr } = _topoResize(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  // The visible window is cssW/STAGE × cssH/STAGE because the canvas is
  // inside a 200%-sized stage; place the placeholder in the centre of
  // that window so it appears centered regardless of the 2× canvas
  // headroom that exists for 3D rotation.
  const visW = cssW / TOPO_STAGE_SCALE;
  const visH = cssH / TOPO_STAGE_SCALE;
  const cx = cssW / 2;
  const cy = cssH / 2;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#5a4a30';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Wrap the text manually — split on the em-dash if too long for the
  // visible window.
  const maxLineW = visW * 0.85;
  const measure = ctx.measureText(text);
  if (measure.width > maxLineW && text.includes(' — ')) {
    const [a, b] = text.split(' — ');
    ctx.fillText(a, cx, cy - 9);
    ctx.fillText('— ' + b, cx, cy + 9);
  } else {
    ctx.fillText(text, cx, cy);
  }
}

// Phase B (Tier 1.5) — per-vertex 3D projection helper.
// Maps a world-space point (relative to the scene origin) to a screen-
// space point via Yaw → Pitch rotation + perspective. Replaces the
// tier-1 CSS transform: projection done in canvas math instead of GPU
// composite, so per-cell vertices land where the user actually sees
// them (and depth-sorting / multi-ring stacking become possible).
//
//   wx, wy, wz : world-space coords in px (z+ toward camera at zero tilt)
//   tiltX, tiltY : pitch and yaw in radians
//   F : perspective focal length in px (1200 matches tier-1's CSS perspective())
//
// Returns [screenX, screenY, projectedZ] — screenX/Y are offsets from
// the scene origin (caller adds cx/cy). projectedZ is post-rotation z,
// useful for back-to-front depth sorting (smallest first = farthest).
function _topoProject3D(wx, wy, wz, tiltX, tiltY, F) {
  // Yaw around Y first, so x rotates with z.
  const cy_ = Math.cos(tiltY), sy_ = Math.sin(tiltY);
  const x1 = cy_ * wx + sy_ * wz;
  const y1 = wy;
  const z1 = -sy_ * wx + cy_ * wz;
  // Pitch around X next, so y rotates with z.
  const cx_ = Math.cos(tiltX), sx_ = Math.sin(tiltX);
  const x2 = x1;
  const y2 = cx_ * y1 - sx_ * z1;
  const z2 = sx_ * y1 + cx_ * z1;
  // Perspective divide. Clamp denominator so points at/behind the
  // camera don't flip wildly — they'll be pushed off-screen but still
  // produce finite numbers the canvas API accepts.
  const denom = F - z2;
  const scale = F / (denom < 1 ? 1 : denom);
  return [x2 * scale, y2 * scale, z2];
}

// Phase C v1 made crystals scatter across all rings, but the 2D topo
// strip and the hit-test were still reading rings[0] only — which
// after scatter is mostly empty. Result: 2D mode mostly hid crystals,
// and hover-tooltip mostly returned "vugg wall" because the queried
// ring 0 cell was empty. This helper builds a synthetic "aggregate
// ring": for each cell index, the most-prominent crystal across any
// ring is collapsed onto one slot. Geometry (base_radius_mm) is taken
// from rings[0] since that's uniform across rings. Lossy — the 2D
// view can't tell which ring a crystal was on — but it makes
// everything visible and hover-clickable.
function _topoAggregateRing(wall) {
  if (!wall || !wall.rings || !wall.rings.length) return [];
  const ring0 = wall.rings[0];
  const N = ring0.length;
  // Shallow-copy ring 0 so we can overlay other rings without mutating
  // the simulation state.
  const out = ring0.map(c => ({
    wall_depth: c.wall_depth,
    crystal_id: c.crystal_id,
    mineral: c.mineral,
    thickness_um: c.thickness_um,
    base_radius_mm: c.base_radius_mm,
  }));
  // For each cell index, walk rings[1..] and take the thickest
  // crystal seen. Ties go to the lowest ring index (deterministic).
  for (let r = 1; r < wall.rings.length; r++) {
    const ring = wall.rings[r];
    if (!ring || !ring.length) continue;
    for (let i = 0; i < N; i++) {
      const cell = ring[i];
      if (cell.crystal_id == null) continue;
      if (cell.thickness_um > out[i].thickness_um) {
        out[i].crystal_id = cell.crystal_id;
        out[i].mineral = cell.mineral;
        out[i].thickness_um = cell.thickness_um;
      }
    }
  }
  return out;
}

// Slice resolver: returns the ring data the 2D path should display
// based on `_topoActiveSlice`. 'aggregate' → aggregate ring (post-
// scatter default); int N → wall.rings[N] directly. Out-of-range
// indices clamp back to aggregate so the stepper can never wedge
// itself on a stale ring count after a scenario reload.
function _topoActiveRingForRender(wall) {
  if (!wall || !wall.rings || !wall.rings.length) return [];
  if (_topoActiveSlice === 'aggregate') return _topoAggregateRing(wall);
  const idx = _topoActiveSlice | 0;
  if (idx < 0 || idx >= wall.rings.length) {
    _topoActiveSlice = 'aggregate';
    _topoUpdateSliceLabel(wall);
    return _topoAggregateRing(wall);
  }
  return wall.rings[idx];
}

// Cycle through [aggregate, 0, 1, ..., ring_count-1, aggregate, ...]
// in either direction. dir=+1 advances; dir=-1 goes back. Wraps at
// both ends. Re-renders and updates the label after each step.
function topoCycleSlice(dir) {
  const sim = topoActiveSim();
  const wall = sim ? sim.wall_state : null;
  const n = wall ? wall.ring_count : 0;
  if (n <= 1) {
    // Single-ring sim — no stepper to cycle. Stay aggregated.
    _topoActiveSlice = 'aggregate';
    _topoUpdateSliceLabel(wall);
    return;
  }
  // The state space has n + 1 entries: 'aggregate', 0, 1, ..., n-1.
  // Encode as integers 0..n where 0 = 'aggregate'; cycle there, then
  // decode back to either 'aggregate' or an int.
  const cur = (_topoActiveSlice === 'aggregate') ? 0 : (_topoActiveSlice + 1);
  const next = ((cur + dir) % (n + 1) + (n + 1)) % (n + 1);
  _topoActiveSlice = (next === 0) ? 'aggregate' : (next - 1);
  _topoUpdateSliceLabel(wall);
  topoRender();
}

// Repaint the slice-stepper label to match `_topoActiveSlice`.
// Called from topoCycleSlice and from topoRender (so the label stays
// in sync if a scenario reload trims the ring count under us).
function _topoUpdateSliceLabel(wall) {
  const lab = document.getElementById('topo-slice-label');
  if (!lab) return;
  if (_topoActiveSlice === 'aggregate') {
    lab.textContent = 'All slices';
    return;
  }
  const idx = _topoActiveSlice | 0;
  const orient = (wall && wall.ringOrientation)
    ? wall.ringOrientation(idx) : '';
  const total = wall ? wall.ring_count : 0;
  // "5/16 wall" — compact; the orientation tag tells the player
  // they're looking at a floor / wall / ceiling slice without a
  // separate UI element.
  lab.textContent = `${idx + 1}/${total} ${orient}`.trim();
}

function topoRender(optOverrideRing) {
  const canvas = document.getElementById('topo-canvas');
  const panel = document.getElementById('topo-panel');
  if (!canvas || !panel || panel.style.display === 'none') return;

  const sim = topoActiveSim();
  const wall = sim ? sim.wall_state : null;
  // Slice stepper resolves to either the aggregate (default) or a
  // specific ring index. Replay snapshots are already a single ring
  // shape, so optOverrideRing falls through unchanged.
  const ring0 = optOverrideRing || (wall && _topoActiveRingForRender(wall));
  // Keep the stepper label in sync — cheap, runs every render.
  if (wall) _topoUpdateSliceLabel(wall);

  // Empty-state guard: no active sim or no ring data yet (fresh page,
  // pre-first-Grow). Paint a centered placeholder so the panel reads as
  // 'waiting for a vug' rather than a 340px-tall void. Without this the
  // first impression of Current Game is a cavernous empty box, which
  // looks like a render bug.
  if (!sim && !optOverrideRing) {
    _topoPaintPlaceholder(canvas, 'Press Grow to generate a vug — the wall profile will appear here');
    const btn = document.getElementById('topo-replay-btn');
    if (btn) btn.style.display = 'none';
    const sizeLabel = document.getElementById('topo-vug-size');
    if (sizeLabel) sizeLabel.textContent = '';
    return;
  }
  if (!ring0 || !ring0.length) {
    _topoPaintPlaceholder(canvas, 'Vug initialized — waiting for first growth step…');
    return;
  }

  // Only show the Replay button once there's history to play back.
  const btn = document.getElementById('topo-replay-btn');
  if (btn) btn.style.display = (sim && sim.wall_state_history && sim.wall_state_history.length) ? 'flex' : 'none';
  // Legacy `topoBuildLegend()` call lived here. The legend was a
  // class-swatch list; that role moved into the fortress-status sigma
  // panel (each class group's swatch + the per-pill hover-highlight),
  // and the legacy <details class="topo-legend-drop"> element is gone.

  const ctx = canvas.getContext('2d');
  const { cssW, cssH, dpr } = _topoResize(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const N = ring0.length;
  const initR = wall ? wall.initial_radius_mm : 25;

  // Scale monotonically: use max_seen_radius_mm (seeded at 2× initial
  // radius, only grows) so the rendered vug doesn't shrink back when
  // new dissolution doesn't push further than the running max.
  let maxWallR = wall ? wall.max_seen_radius_mm : initR * 2;
  for (const c of ring0) {
    const r = initR + c.wall_depth;
    if (r > maxWallR) maxWallR = r;
  }
  if (wall && maxWallR > wall.max_seen_radius_mm) wall.max_seen_radius_mm = maxWallR;
  const centerPad = 48;  // leave room for the scale bar and legend
  // The canvas lives inside a 2×-sized stage inside the overflow:hidden
  // wrap. cssW/cssH are the CANVAS buffer dimensions (2× the visible
  // window); fit the slice to the VISIBLE window (cssW/STAGE, cssH/STAGE)
  // so it occupies the same on-screen area as before. The extra canvas
  // area becomes "rotation headroom" — slice can tilt freely within the
  // buffer and the wrap's overflow:hidden clips the view to the window.
  const viewW = cssW / TOPO_STAGE_SCALE;
  const viewH = cssH / TOPO_STAGE_SCALE;
  const fit = Math.min(viewW, viewH - centerPad) * 0.82 / 2;
  const mmToPx = (fit / maxWallR) * _topoZoom;

  // Pan offsets let the user drag the vug around the canvas. Hit-test
  // and tooltip code below MUST apply the same offsets or clicks will
  // miss what the user sees on screen.
  const cx = cssW / 2 + _topoPanX;
  const cy = (cssH - centerPad) / 2 + 8 + _topoPanY;

  // Per-cell outer radius in px. Phase 1: each cell has its own
  // base_radius_mm baked from the Fourier profile, so cellR[i] already
  // varies cell-to-cell even on a pristine vug. Dissolution stacks on
  // top via wall_depth. Fallback to initR for snapshots saved before
  // the Phase-1 schema (base_radius_mm=0 by default).
  const cellR = new Array(N);
  for (let i = 0; i < N; i++) {
    const cell = ring0[i];
    const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
    cellR[i] = (baseR + cell.wall_depth) * mmToPx;
  }

  // Boundary radii — average the two adjacent cell radii so each cell's
  // wedge shares its endpoints with its neighbors'. Without this the
  // outline would render as disconnected circular arcs with radial
  // "teeth" at every cell boundary once the bubble-merge profile puts
  // neighbouring cells at different radii.
  const boundaryR = new Array(N);
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    boundaryR[i] = (cellR[prev] + cellR[i]) / 2;
  }

  // Find the heaviest crystal on the wall so stroke widths scale to
  // something meaningful (1 big crystal vs. 1 microcrystal).
  let maxT = 0;
  for (const c of ring0) if (c.thickness_um > maxT) maxT = c.thickness_um;
  if (maxT <= 0) maxT = 1;

  const arcStep = 2 * Math.PI / N;

  // Phase B branch — 3D mode renders all rings stacked along a vertical
  // axis using per-vertex projection. Hands off to _topoRenderRings3D
  // and short-circuits the rest of the 2D path. 2D mode falls through
  // unchanged. See PROPOSAL-3D-TOPO-VUG.md ("Tier 1.5") for design.
  if (_topoView3D && wall && wall.rings && wall.rings.length) {
    _topoRenderRings3D(ctx, sim, wall, ring0, cellR, boundaryR, cx, cy,
                       mmToPx, maxT, arcStep, N, viewW, viewH);
    return;
  }

  // Radial wedges: each occupied cell gets a Bezier-bounded wedge.
  // Outer edge arcs from boundary_start → cell_midpoint → boundary_end
  // via quadraticCurveTo (cell midpoint = control point), which matches
  // the next cell's starting boundary and yields a smooth curve through
  // the cell instead of a V-shaped two-segment polyline. Inner edge
  // mirrors the outer with an absolute inward offset.
  //
  // Inner offset is thickness × void_reach in mm, scaled to pixels.
  // Adjacent cells painted by the same crystal share thickness, so they
  // share the inward offset → inner edges line up at shared boundaries
  // and the band stays annular even across dip/bulge neighbours.
  // Inner edge is floored at 15% of each point's outer radius so a
  // very thick crystal in a dip cell still leaves a visible void.
  for (let i = 0; i < N; i++) {
    const cell = ring0[i];
    if (cell.crystal_id == null) continue;
    const a0 = _topoAngleFor(i, N) - arcStep / 2;
    const aMid = _topoAngleFor(i, N);
    const a1 = a0 + arcStep;
    const rStart = boundaryR[i];
    const rMid = cellR[i];
    const rEnd = boundaryR[(i + 1) % N];
    const crystal = sim?.crystals?.find(c => c.crystal_id === cell.crystal_id);
    const voidReach = crystal ? Math.max(crystal.void_reach, 0.05) : 0.5;
    const inwardMm = (cell.thickness_um / 1000.0) * voidReach;
    const inwardPx = Math.max(inwardMm * mmToPx, TOPO_WALL_STROKE_PX + 1);
    const rStartIn = Math.max(rStart - inwardPx, rStart * (1 - TOPO_CRYSTAL_CAP_FRAC));
    const rMidIn = Math.max(rMid - inwardPx, rMid * (1 - TOPO_CRYSTAL_CAP_FRAC));
    const rEndIn = Math.max(rEnd - inwardPx, rEnd * (1 - TOPO_CRYSTAL_CAP_FRAC));
    // The Bezier control point needs to be PLACED so the curve actually
    // passes through (rMid, aMid). For a quadratic Bezier parametrised
    // at t=0.5, the curve point = (start + 2·control + end) / 4. So
    // control = 2·target − (start + end)/2. Applied to each of outer
    // and inner edges.
    const sx = cx + rStart * Math.cos(a0), sy = cy + rStart * Math.sin(a0);
    const mx = cx + rMid * Math.cos(aMid), my = cy + rMid * Math.sin(aMid);
    const ex = cx + rEnd * Math.cos(a1), ey = cy + rEnd * Math.sin(a1);
    const outerCpX = 2 * mx - (sx + ex) / 2;
    const outerCpY = 2 * my - (sy + ey) / 2;
    const sxIn = cx + rStartIn * Math.cos(a0), syIn = cy + rStartIn * Math.sin(a0);
    const mxIn = cx + rMidIn * Math.cos(aMid), myIn = cy + rMidIn * Math.sin(aMid);
    const exIn = cx + rEndIn * Math.cos(a1), eyIn = cy + rEndIn * Math.sin(a1);
    const innerCpX = 2 * mxIn - (sxIn + exIn) / 2;
    const innerCpY = 2 * myIn - (syIn + eyIn) / 2;
    ctx.globalAlpha = topoAlphaFor(cell.mineral);
    ctx.fillStyle = topoClassColor(cell.mineral);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(outerCpX, outerCpY, ex, ey);
    ctx.lineTo(exIn, eyIn);
    // Inner (fluid-facing) edge — dispatched on crystal habit. Unknown
    // habits fall through to 'smooth' (the original Bezier). Each cell
    // draws its own complete teeth on the local chord; for typical 5°
    // arcs the chord/arc difference is <0.5%, visually invisible.
    const thicknessMmForTex = cell.thickness_um / 1000.0;
    const cellArcMmForTex = (rMidIn * arcStep) / mmToPx;
    drawHabitTexture(ctx, cell.mineral, crystal?.habit, exIn, eyIn, sxIn, syIn, innerCpX, innerCpY, thicknessMmForTex, cellArcMmForTex, mmToPx, cx, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Wall outline — one quadratic Bezier per cell, with the cell's
  // midpoint as the de-facto pass-through. Control point is placed so
  // the curve passes exactly through (rMid, aMid) at t=0.5:
  //   control = 2·midpoint − (start + end)/2
  // Adjacent cells share boundary endpoints, so the outline flows as
  // a smooth continuous curve instead of a V-polyline. Bare cells
  // stroke thin amber; occupied cells stroke thicker in the mineral's
  // class_color, scaled to crystal thickness.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < N; i++) {
    const a0 = _topoAngleFor(i, N) - arcStep / 2;
    const aMid = _topoAngleFor(i, N);
    const a1 = a0 + arcStep;
    const rStart = boundaryR[i];
    const rMid = cellR[i];
    const rEnd = boundaryR[(i + 1) % N];
    const cell = ring0[i];
    let stroke, width, alpha;
    if (cell.crystal_id == null) {
      // Bare wall — amber, always fully opaque (wall is the substrate,
      // not a mineral; it shouldn't ghost with the highlight).
      stroke = TOPO_WALL_COLOR;
      width = TOPO_WALL_STROKE_PX;
      alpha = 1;
    } else {
      stroke = topoClassColor(cell.mineral);
      const t = Math.min(cell.thickness_um / maxT, 1);
      width = TOPO_WALL_STROKE_PX + t * (TOPO_WALL_STROKE_MAX_PX - TOPO_WALL_STROKE_PX);
      alpha = topoAlphaFor(cell.mineral);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    const sx = cx + rStart * Math.cos(a0), sy = cy + rStart * Math.sin(a0);
    const mx = cx + rMid * Math.cos(aMid), my = cy + rMid * Math.sin(aMid);
    const ex = cx + rEnd * Math.cos(a1), ey = cy + rEnd * Math.sin(a1);
    const cpX = 2 * mx - (sx + ex) / 2;
    const cpY = 2 * my - (sy + ey) / 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpX, cpY, ex, ey);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Inclusion dots — render each host's swallowed crystals as small
  // colored circles WITHIN the host's currently-painted wall band.
  //
  // Placement model:
  //   * Find every ring-0 cell the host actually paints (crystal_id
  //     matches). That set IS the host's visible footprint on the topo.
  //   * Spread the inclusions across those cells, one-per-cell until
  //     we run out (then round-robin).
  //   * Each inclusion's radius uses its assigned cell's OWN local wall
  //     radius + the host's band offset at that cell. That way the dot
  //     sits inside the host's painted band at that cell, even when the
  //     bubble-merge profile makes adjacent cells differ by 10×.
  //   * Ghost alpha follows the inclusion's own mineral (highlight
  //     brief: "if you highlight the inclusion's mineral species, those
  //     dots go to 100% everywhere they appear").
  //
  // Why not use enc.wall_center_cell directly? Because that's where the
  // inclusion was anchored BEFORE the host engulfed it — once swallowed,
  // the inclusion moves with the host's spatial extent, and using its
  // old anchor angle puts the dot wherever the inclusion USED to be.
  // On a bubble-merge wall, that's often nowhere near the host's
  // current footprint, and with the old (host-radius × inclusion-angle)
  // combination the dot lands outside the wall entirely.
  _topoInclusions.length = 0;
  if (sim && sim.crystals) {
    for (const host of sim.crystals) {
      if (!host.enclosed_crystals || !host.enclosed_crystals.length) continue;
      if (host.dissolved || host.wall_center_cell == null) continue;

      // Build the host's painted-cell set. Fall back to its center cell
      // if nothing paints (a smaller overlapping crystal may have
      // overwritten its paint — rare but possible).
      const hostPaintedCells = [];
      for (let i = 0; i < N; i++) {
        if (ring0[i].crystal_id === host.crystal_id) hostPaintedCells.push(i);
      }
      if (!hostPaintedCells.length) hostPaintedCells.push(host.wall_center_cell);
      const mCells = hostPaintedCells.length;

      const voidReach = Math.max(host.void_reach, 0.05);
      const allIds = host.enclosed_crystals;
      // Cap visible dots per host — real Sweetwater-style calcite can
      // carry hundreds of pyrite or chalcopyrite inclusions and a
      // pointillist cluster reads as "this crystal is full of them."
      // Still cap high enough to avoid the canvas turning into noise.
      const MAX_PER_HOST = 80;
      const renderedIds = allIds.length > MAX_PER_HOST
        ? allIds.slice(0, MAX_PER_HOST)
        : allIds;
      const n = renderedIds.length;
      for (let k = 0; k < n; k++) {
        const enc = sim.crystals.find(c => c.crystal_id === renderedIds[k]);
        if (!enc) continue;

        // Spread inclusions evenly across painted cells. Floating index
        // gives a sub-cell offset used to fan dots within one cell when
        // more inclusions than cells.
        const cellPos = (k + 0.5) * mCells / n;
        const cellIdx = hostPaintedCells[Math.min(mCells - 1, Math.floor(cellPos))];
        const withinCell = cellPos - Math.floor(cellPos) - 0.5;  // −0.5 .. +0.5
        const cell = ring0[cellIdx];
        const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
        const rOuterCell = (baseR + cell.wall_depth) * mmToPx;
        const inwardMm = (cell.thickness_um / 1000.0) * voidReach;
        const inwardPx = Math.max(inwardMm * mmToPx, TOPO_WALL_STROKE_PX + 1);
        const rInnerCell = Math.max(rOuterCell - inwardPx, rOuterCell * (1 - TOPO_CRYSTAL_CAP_FRAC));
        const rMid = (rOuterCell + rInnerCell) / 2;
        // Cell angular centre, plus a small fan when multiple inclusions
        // land in the same cell (otherwise they'd stack exactly).
        const baseAngle = -Math.PI / 2 + (cellIdx / N) * 2 * Math.PI;
        const angle = baseAngle + withinCell * arcStep * 0.8;

        const x = cx + rMid * Math.cos(angle);
        const y = cy + rMid * Math.sin(angle);
        const dotR = Math.max(2.5, Math.min(5.5, enc.c_length_mm * mmToPx * 0.4));
        ctx.globalAlpha = topoAlphaFor(enc.mineral);
        ctx.fillStyle = topoClassColor(enc.mineral);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10, 10, 8, 0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
        _topoInclusions.push({ x, y, r: dotR + 2, crystal_id: enc.crystal_id, mineral: enc.mineral });
      }
    }
  }
  ctx.globalAlpha = 1;

  // (Removed the dotted initial-radius reference ring — with the
  // bubble-merge profile the wall is already irregular from t=0, so a
  // perfect-circle reference at initial_radius_mm misleads the eye
  // into reading crystals on near-nominal cells as "on the circle"
  // rather than "on the wall.")

  // Scale bar across the bottom: total wall circumference in mm.
  const circMm = wall ? Math.PI * wall.meanDiameterMm() : 0;
  if (circMm > 0) {
    // Scale bar sits at the bottom of the VISIBLE window (wrap), not
    // the bottom of the oversized canvas. Visible window is vertically
    // centered in the canvas; its bottom edge is at cssH/2 + viewH/2
    // = (cssH + viewH)/2.
    const barY = (cssH + viewH) / 2 - 18;
    const tenPx = 10 * mmToPx;
    const barX0 = cssW / 2 - tenPx / 2;
    ctx.strokeStyle = '#5a4a30';
    ctx.fillStyle = '#5a4a30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX0, barY);
    ctx.lineTo(barX0 + tenPx, barY);
    ctx.moveTo(barX0, barY - 3);
    ctx.lineTo(barX0, barY + 3);
    ctx.moveTo(barX0 + tenPx, barY - 3);
    ctx.lineTo(barX0 + tenPx, barY + 3);
    ctx.stroke();
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('10 mm', cssW / 2, barY + 14);
    // Overall diameter readout lives OUTSIDE the canvas — as an HTML
    // overlay on the wrap — so it stays fixed to the background while
    // the slice rotates in 3D mode. It's a description of the slice,
    // not content of the slice.
  }
  const sizeLabel = document.getElementById('topo-vug-size');
  if (sizeLabel) {
    if (wall) sizeLabel.textContent = `Vug ⌀ ${wall.meanDiameterMm().toFixed(1)} mm`;
    else sizeLabel.textContent = '';
  }
}

// ─── Wireframe-crystal primitive library ─────────────────────────────
// Hand-crafted polyhedra for the 3D-mode wireframe-crystal renderer.
// Convention (see proposals/PROPOSAL-WIREFRAME-CRYSTALS.md addendum A):
//   * c-axis = +y, base-anchored at y=-0.1, free tip at y=+1.0.
//   * equatorial extent = roughly ±0.5 (or wider for cube-ish shapes
//     so they read as cubic when c_length ≈ a_width).
//   * Each primitive scales by (a_width, c_length, a_width) at render
//     time and rotates around its c-axis (= inward sphere normal at
//     anchor cell) by a crystal_id-seeded random angle.
const PRIM_CUBE = {
  name: 'cube',
  vertices: [
    [-0.55, -0.1, -0.55], [ 0.55, -0.1, -0.55], [ 0.55, -0.1,  0.55], [-0.55, -0.1,  0.55],
    [-0.55,  1.0, -0.55], [ 0.55,  1.0, -0.55], [ 0.55,  1.0,  0.55], [-0.55,  1.0,  0.55],
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,0],   // base
    [4,5],[5,6],[6,7],[7,4],   // top
    [0,4],[1,5],[2,6],[3,7],   // verticals
  ],
};

const PRIM_OCTAHEDRON = {
  name: 'octahedron',
  vertices: [
    [ 0.0,  1.0,  0.0],   // 0 top apex
    [ 0.0, -0.1,  0.0],   // 1 bottom apex (buried)
    [ 0.55, 0.45, 0.0],   // 2 east
    [-0.55, 0.45, 0.0],   // 3 west
    [ 0.0,  0.45, 0.55],  // 4 north
    [ 0.0,  0.45,-0.55],  // 5 south
  ],
  edges: [
    [0,2],[0,3],[0,4],[0,5],   // top tip → equator
    [1,2],[1,3],[1,4],[1,5],   // bottom tip → equator
    [2,4],[4,3],[3,5],[5,2],   // equator
  ],
};

const PRIM_TETRAHEDRON = {
  name: 'tetrahedron',
  // 4 vertices: 1 apex + 3-cornered base. Slightly oversized so the
  // base sits below y=0 (buried) and the apex points into the cavity.
  vertices: (() => {
    const r = 0.55;
    return [
      [ 0.0,  1.0, 0.0],  // apex
      [ r * Math.cos(0),            -0.1, r * Math.sin(0)],
      [ r * Math.cos(2*Math.PI/3),  -0.1, r * Math.sin(2*Math.PI/3)],
      [ r * Math.cos(4*Math.PI/3),  -0.1, r * Math.sin(4*Math.PI/3)],
    ];
  })(),
  edges: [
    [0,1],[0,2],[0,3],   // apex → base
    [1,2],[2,3],[3,1],   // base triangle
  ],
};

const PRIM_RHOMBOHEDRON = {
  name: 'rhombohedron',
  // Calcite-style rhomb: parallelepiped where all 6 faces are rhombs.
  // Topologically a cube but with the top face rotated 60° around the
  // c-axis relative to the bottom — gives the canonical "tilted" look.
  vertices: (() => {
    const vs = [];
    const r = 0.55;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI / 2) + Math.PI / 4;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);  // base
    }
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI / 2) + Math.PI / 4 + Math.PI / 3;
      vs.push([r * Math.cos(a),  1.0, r * Math.sin(a)]);  // top, rotated 60°
    }
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ],
};

const PRIM_SCALENOHEDRON = {
  name: 'scalenohedron',
  // Calcite "dogtooth": doubly-pointed with a zigzag waist. 8 verts,
  // 12 edges. Three upper-mid vertices alternate with three lower-mid
  // around the equator, giving the characteristic facet zigzag.
  vertices: (() => {
    const vs = [
      [0,  1.0, 0],   // 0 top apex
      [0, -0.1, 0],   // 1 bottom apex (buried)
    ];
    const r = 0.45;
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a), 0.7, r * Math.sin(a)]);   // 2,3,4 upper-mid
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3 + Math.PI / 3;
      vs.push([r * Math.cos(a), 0.2, r * Math.sin(a)]);   // 5,6,7 lower-mid
    }
    return vs;
  })(),
  edges: [
    [0,2],[0,3],[0,4],   // top apex → upper-mid
    [1,5],[1,6],[1,7],   // bot apex → lower-mid
    // zigzag: each upper-mid connects to 2 adjacent lower-mids
    [2,5],[2,7], [3,5],[3,6], [4,6],[4,7],
  ],
};

const PRIM_HEX_PRISM = {
  name: 'hex_prism',
  vertices: (() => {
    const vs = [];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);   // 0..5 base hex
    }
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a),  1.0, r * Math.sin(a)]);   // 6..11 top hex
    }
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
    [6,7],[7,8],[8,9],[9,10],[10,11],[11,6],
    [0,6],[1,7],[2,8],[3,9],[4,10],[5,11],
  ],
};

const PRIM_HEX_PRISM_TERMINATED = {
  name: 'hex_prism_terminated',
  // Quartz: hex prism with a 6-faceted pyramidal cap on the free end.
  // 13 vertices (no buried apex — base hex sits at y=-0.1), 24 edges.
  vertices: (() => {
    const vs = [];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);   // 0..5 base hex
    }
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a),  0.8, r * Math.sin(a)]);   // 6..11 shoulder
    }
    vs.push([0, 1.0, 0]);                                  // 12 apex
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],          // base hex
    [6,7],[7,8],[8,9],[9,10],[10,11],[11,6],      // shoulder hex
    [0,6],[1,7],[2,8],[3,9],[4,10],[5,11],        // verticals
    [12,6],[12,7],[12,8],[12,9],[12,10],[12,11],  // pyramid ridges
  ],
};

const PRIM_DIPYRAMID = {
  name: 'dipyramid',
  // Hex bipyramid (barite, scheelite, anhydrite). Equatorial hex
  // pinching to apex on each end.
  vertices: (() => {
    const vs = [
      [0,  1.0, 0],
      [0, -0.1, 0],
    ];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), 0.45, r * Math.sin(a)]);
    }
    return vs;
  })(),
  edges: [
    // top apex → equator
    [0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
    // bot apex → equator
    [1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
    // equator
    [2,3],[3,4],[4,5],[5,6],[6,7],[7,2],
  ],
};

const PRIM_PYRITOHEDRON = {
  name: 'pyritohedron',
  // 12 pentagonal faces (one of pyrite's classic forms). Topology:
  // 14 vertices = 8 cube-corners + 6 face-axis points.
  // Edges: 6 cube-edges of one chosen subset + 24 from corners to face
  // points = 30.
  vertices: (() => {
    const vs = [];
    const c = 0.5;
    // 8 cube corners
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      vs.push([c * sx, 0.45 + c * sy, c * sz]);
    }
    // 6 face-axis "stretch" points (offset inward from each cube face)
    const k = 0.7;  // pseudo-pyritohedral stretch
    vs.push([ c*k, 0.45, 0]);     // 8 +x
    vs.push([-c*k, 0.45, 0]);     // 9 -x
    vs.push([0, 0.45 + c*k, 0]);  // 10 +y
    vs.push([0, 0.45 - c*k, 0]);  // 11 -y
    vs.push([0, 0.45,  c*k]);     // 12 +z
    vs.push([0, 0.45, -c*k]);     // 13 -z
    return vs;
  })(),
  edges: [
    // Six "rib" cube-edges (one per face, alternating) — gives the
    // striated-cube look pyritohedrons read as.
    [0,1],[2,3],[4,5],[6,7],[0,4],[3,7],
    // Each face point connects to its 4 adjacent cube corners.
    // +x face (corners with sx=+1: indices 4,5,6,7)
    [8,4],[8,5],[8,6],[8,7],
    // -x face (sx=-1: 0,1,2,3)
    [9,0],[9,1],[9,2],[9,3],
    // +y face (sy=+1: 2,3,6,7)
    [10,2],[10,3],[10,6],[10,7],
    // -y face (sy=-1: 0,1,4,5)
    [11,0],[11,1],[11,4],[11,5],
    // +z face (sz=+1: 1,3,5,7)
    [12,1],[12,3],[12,5],[12,7],
    // -z face (sz=-1: 0,2,4,6)
    [13,0],[13,2],[13,4],[13,6],
  ],
};

const PRIM_TABULAR = {
  name: 'tabular',
  // Flat plate: half-height in the c-axis direction, full width in
  // the equatorial directions. Selenite / mica / wulfenite look.
  vertices: [
    [-0.55, -0.1, -0.55], [ 0.55, -0.1, -0.55], [ 0.55, -0.1,  0.55], [-0.55, -0.1,  0.55],
    [-0.55,  0.4, -0.55], [ 0.55,  0.4, -0.55], [ 0.55,  0.4,  0.55], [-0.55,  0.4,  0.55],
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ],
};

const PRIM_ACICULAR = {
  name: 'acicular',
  // Slender needle: hex cross-section, very short equatorial extent
  // relative to c-length. Stibnite, natrolite, mesolite, sword gypsum.
  vertices: (() => {
    const vs = [];
    const r = 0.18;  // slim
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a),  0.95, r * Math.sin(a)]);
    }
    vs.push([0, 1.0, 0]);  // 6 apex
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,0],
    [3,4],[4,5],[5,3],
    [0,3],[1,4],[2,5],
    [6,3],[6,4],[6,5],
  ],
};

const PRIM_DRIPSTONE = {
  name: 'dripstone',
  // Cave-mode tapered icicle. Hill & Forti 1997 (Cave Minerals of the
  // World): mature stalactites taper from a wide ceiling-anchored base
  // to a narrow drip tip, aspect ratio ~5-10:1, with vertical surface
  // ridges from streaming water down the flanks. Hexagonal cross-section
  // here is mostly a calcite-symmetry nod — natural dripstone is
  // smooth-circular, but the renderer's 6-fold visible ridges read as
  // the streaming-water grooves and align with calcite's underlying
  // crystallographic symmetry.
  //
  // Anchor at the *base* (y = -0.1, slightly buried) so when air-mode
  // c-axis flips put the crystal pointing world-down, the wide base
  // sits at the substrate (ceiling) and the tip points at the floor.
  // Stalagmite case (floor cell) reuses the same primitive flipped via
  // the renderer's existing fluid/air orientation logic — same taper,
  // opposite gravity vector.
  //
  // Geometry: 4 latitude rings × 6 longitudes + 1 apex. Radii taper
  // 0.55 → 0.42 → 0.27 → 0.13 → 0 (apex). Vertical extent normalized
  // to y=[-0.1, 1.0]; the renderer multiplies y by c_length_mm and
  // x/z by a_width_mm, so the natural 5-10:1 aspect ratio falls out
  // of the crystal's own dimensions when the air-mode habit kicks in.
  vertices: (() => {
    const vs = [];
    const NLON = 6;
    // Slim icicle profile. Crystal c_length_mm/a_width_mm already
    // encodes a partial aspect ratio (prismatic crystals land at ~2-3:1
    // in those dimensions); dropping the primitive's max radius from
    // 0.55 to 0.30 multiplies that to a believable 5-10:1 final aspect
    // for cave dripstone. Taper from base (0.30) → tip (0) over four
    // rings, with non-linear shrinkage (more taper near the base, less
    // near the tip) — matches photos of mature cave stalactites where
    // the lower 60% is nearly cylindrical and the apex acts like a
    // separate "drip nozzle".
    const rings = [
      { y: -0.10, r: 0.30 },   // base (ceiling-anchored)
      { y:  0.30, r: 0.22 },   // upper shoulder
      { y:  0.65, r: 0.13 },   // mid-shaft
      { y:  0.90, r: 0.06 },   // sub-tip neck
    ];
    for (const ring of rings) {
      for (let k = 0; k < NLON; k++) {
        const a = (k * 2 * Math.PI) / NLON;
        vs.push([ring.r * Math.cos(a), ring.y, ring.r * Math.sin(a)]);
      }
    }
    vs.push([0, 1.0, 0]);   // 24: apex (drip tip)
    return vs;
  })(),
  edges: (() => {
    const es = [];
    const NLON = 6;
    const NRINGS = 4;
    // Six longitudinal ridges — each spans ring 0..3 → apex (4 segments).
    for (let k = 0; k < NLON; k++) {
      for (let r = 0; r < NRINGS - 1; r++) {
        es.push([r * NLON + k, (r + 1) * NLON + k]);
      }
      // Ring 3 → apex.
      es.push([(NRINGS - 1) * NLON + k, NRINGS * NLON]);
    }
    // Base hex (anchors the silhouette at the substrate).
    for (let k = 0; k < NLON; k++) {
      es.push([k, (k + 1) % NLON]);
    }
    // Mid-shaft hex (ring 2) — mid-band detail so the silhouette
    // doesn't read as a smooth fanned bundle of single ridges.
    for (let k = 0; k < NLON; k++) {
      es.push([2 * NLON + k, 2 * NLON + ((k + 1) % NLON)]);
    }
    return es;
  })(),
};

const PRIM_BOTRYOIDAL = {
  name: 'botryoidal',
  // Spherulite mechanism (Wertheim et al. 2021; Quartz Page chalcedony):
  // each visible "grape" is a single nucleation point with hundreds-to-
  // thousands of acicular fibers radiating over a hemisphere, fiber-to-
  // fiber misorientation 0–22°. We approximate with ~20 representative
  // fibers fanning over the upper hemisphere from a single anchor at
  // the wall. The convex-hull silhouette is a smooth dome (not a multi-
  // bump cluster — those happen when the engine spawns adjacent
  // botryoidal crystals on neighbouring cells, which already happens
  // naturally because the habit's wall_spread is wide).
  vertices: (() => {
    const vs = [];
    vs.push([0, -0.05, 0]);                   // 0 anchor (slightly buried)
    // Hemisphere of fiber tips. 4 latitude bands × 6 longitudes,
    // skewed so more tips cluster near the apex than near the rim
    // (real spherulites have denser fibers near the perpendicular).
    const NLAT = 4, NLON = 6;
    for (let i = 0; i < NLAT; i++) {
      // Latitude angle from substrate (φ=0 = horizon, φ=π/2 = apex).
      // Bias toward the apex with i^0.7 so tips concentrate up-top.
      const t = (i + 1) / NLAT;
      const phi = (t * t * 0.7 + t * 0.3) * Math.PI / 2;
      const r = 0.5 * Math.cos(phi);
      const y = 1.0 * Math.sin(phi);
      for (let j = 0; j < NLON; j++) {
        // Stagger longitudes per band so adjacent latitude rings don't
        // align radially (more spherulite-like).
        const a = (j + 0.5 * (i % 2)) * 2 * Math.PI / NLON;
        vs.push([r * Math.cos(a), y, r * Math.sin(a)]);
      }
    }
    // One apex tip dead-center at y=1.0 to fix the silhouette top.
    vs.push([0, 1.0, 0]);
    return vs;
  })(),
  edges: (() => {
    const es = [];
    const NLAT = 4, NLON = 6;
    // Each fiber tip connects back to the anchor — that's the visible
    // wireframe radial pattern.
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        es.push([0, 1 + i * NLON + j]);
      }
    }
    es.push([0, 1 + NLAT * NLON]);  // apex fiber
    // Connect adjacent tips in each latitude band → suggests the
    // hemispheric envelope without fully outlining it.
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        const a = 1 + i * NLON + j;
        const b = 1 + i * NLON + ((j + 1) % NLON);
        es.push([a, b]);
      }
    }
    return es;
  })(),
};

// Habit string → primitive lookup. Direct hits checked first; the
// fuzzy-substring fallback in _lookupCrystalPrimitive catches the
// many compound forms in data/minerals.json (e.g. "rhombohedral_or_
// botryoidal", "saddle_rhomb_or_massive").
const HABIT_TO_PRIMITIVE = {
  'cubic':                          PRIM_CUBE,
  'pseudocubic':                    PRIM_CUBE,
  'pseudo_cubic':                   PRIM_CUBE,
  'cubo-pyritohedral':              PRIM_PYRITOHEDRON,
  'cubic_or_pyritohedral':          PRIM_PYRITOHEDRON,
  'cubic_or_octahedral':            PRIM_CUBE,
  'pyritohedral':                   PRIM_PYRITOHEDRON,
  'octahedral':                     PRIM_OCTAHEDRON,
  'tetrahedral':                    PRIM_TETRAHEDRON,
  'tetrahedral_or_massive':         PRIM_TETRAHEDRON,
  'rhombohedral':                   PRIM_RHOMBOHEDRON,
  'saddle_rhomb_or_massive':        PRIM_RHOMBOHEDRON,
  'rhombohedral_or_botryoidal':     PRIM_RHOMBOHEDRON,
  'rhombohedral_or_scalenohedral':  PRIM_RHOMBOHEDRON,
  'rhombohedral_or_tabular_or_botryoidal': PRIM_RHOMBOHEDRON,
  'botryoidal_or_rhombohedral':     PRIM_BOTRYOIDAL,
  'scalenohedral':                  PRIM_SCALENOHEDRON,
  'scalenohedral_or_rhombohedral':  PRIM_SCALENOHEDRON,
  'prismatic':                      PRIM_HEX_PRISM_TERMINATED,
  'short_prismatic':                PRIM_HEX_PRISM,
  'striated_prism':                 PRIM_HEX_PRISM_TERMINATED,
  'hex_prism':                      PRIM_HEX_PRISM_TERMINATED,
  'hex_prism_long':                 PRIM_HEX_PRISM_TERMINATED,
  'hexagonal_prism':                PRIM_HEX_PRISM_TERMINATED,
  'hexagonal_prism_or_botryoidal_campylite': PRIM_HEX_PRISM_TERMINATED,
  'prismatic_hex':                  PRIM_HEX_PRISM_TERMINATED,
  'prismatic_or_blocky':            PRIM_HEX_PRISM_TERMINATED,
  'prismatic_orthorhombic':         PRIM_HEX_PRISM_TERMINATED,
  'prismatic_tabular_pseudo_cubic': PRIM_CUBE,
  'prismatic_or_rosette':           PRIM_HEX_PRISM_TERMINATED,
  'tabular_prism':                  PRIM_HEX_PRISM_TERMINATED,
  'tabular':                        PRIM_TABULAR,
  'tabular_square':                 PRIM_TABULAR,
  'tabular_hex':                    PRIM_TABULAR,
  'hex_plate':                      PRIM_TABULAR,
  'hexagonal_platy':                PRIM_TABULAR,
  'tabular_plates':                 PRIM_TABULAR,
  'tabular_monoclinic':             PRIM_TABULAR,
  'tabular_or_prismatic_or_fibrous': PRIM_TABULAR,
  'platy_scales':                   PRIM_TABULAR,
  'micro_plates':                   PRIM_TABULAR,
  'acicular':                       PRIM_ACICULAR,
  'acicular_tuft':                  PRIM_ACICULAR,
  'tufted_spray':                   PRIM_ACICULAR,
  'elongated_blade':                PRIM_ACICULAR,
  'wire':                           PRIM_ACICULAR,
  'capillary':                      PRIM_ACICULAR,
  'columnar_or_cyclic_twinned':     PRIM_HEX_PRISM_TERMINATED,
  'cockscomb_or_spearhead':         PRIM_DIPYRAMID,
  'dipyramidal':                    PRIM_DIPYRAMID,
  'bipyramidal_alpha':              PRIM_DIPYRAMID,
  'disphenoidal_{112}':             PRIM_DIPYRAMID,
  'stellate_sixling':               PRIM_DIPYRAMID,
  'hexagonal_barrel':               PRIM_HEX_PRISM,
  'barrel':                         PRIM_HEX_PRISM,
  'hemimorphic_hexagonal':          PRIM_HEX_PRISM_TERMINATED,
  'deep_blue_prismatic':            PRIM_HEX_PRISM_TERMINATED,
  'botryoidal':                     PRIM_BOTRYOIDAL,
  'reniform':                       PRIM_BOTRYOIDAL,
  'botryoidal_or_acicular':         PRIM_BOTRYOIDAL,
  'botryoidal_or_mammillary_or_fibrous': PRIM_BOTRYOIDAL,
  'botryoidal_cryptocrystalline':   PRIM_BOTRYOIDAL,
  'cobalt_bloom_or_botryoidal':     PRIM_BOTRYOIDAL,
  'nickel_bloom_or_capillary':      PRIM_BOTRYOIDAL,
  'pitchblende_massive':            PRIM_BOTRYOIDAL,
  'massive_granular':               PRIM_BOTRYOIDAL,
  'earthy_crust':                   PRIM_BOTRYOIDAL,
  'stalactitic':                    PRIM_BOTRYOIDAL,
  'arborescent':                    PRIM_ACICULAR,
  'dendritic':                      PRIM_ACICULAR,
  // v26 polish: runtime-set habits from the engine (silica polymorphs,
  // calcite/aragonite habit pickers, supergene-product engines, etc.)
  // that previously fell through to PRIM_RHOMBOHEDRON. Audited against
  // the full list of crystal.habit assignments in this file.
  'tridymite (thin hexagonal plates)': PRIM_TABULAR,
  'β-quartz bipyramidal (paramorphic)': PRIM_DIPYRAMID,
  'scepter overgrowth possible':    PRIM_HEX_PRISM_TERMINATED,
  'chalcedony (microcrystalline)':  PRIM_BOTRYOIDAL,
  'opal (amorphous silica)':        PRIM_BOTRYOIDAL,
  'silica_gel_hemisphere':          PRIM_BOTRYOIDAL,
  'flos_ferri':                     PRIM_ACICULAR,   // aragonite "iron flowers"
  'acicular_needle':                PRIM_ACICULAR,
  'twinned_cyclic':                 PRIM_DIPYRAMID,  // cyclic-sextet twin → stellate
  'columnar':                       PRIM_HEX_PRISM_TERMINATED,
  'radiating_columnar':             PRIM_HEX_PRISM_TERMINATED,
  'coarse_rhomb':                   PRIM_RHOMBOHEDRON,
  'massive':                        PRIM_BOTRYOIDAL,
  'saddle_rhomb':                   PRIM_RHOMBOHEDRON,
  'spherulitic':                    PRIM_BOTRYOIDAL,
  'banding_agate':                  PRIM_BOTRYOIDAL,
  'fibrous_coating':                PRIM_BOTRYOIDAL,  // fibrous mat reads dome-like
  'hemimorphic_crystal':            PRIM_HEX_PRISM_TERMINATED,
  'platy_massive':                  PRIM_TABULAR,
  'micaceous_book':                 PRIM_TABULAR,    // mica = stacked sheets
  'rosette_radiating':              PRIM_BOTRYOIDAL,
  'rosette_bladed':                 PRIM_TABULAR,    // bladed rosette = thin plates
  'plumose_rosette':                PRIM_BOTRYOIDAL,
  'radiating_blade':                PRIM_TABULAR,
  'radiating_cluster':              PRIM_BOTRYOIDAL,
  'radiating_fibrous':              PRIM_BOTRYOIDAL,
  'radiating_spray':                PRIM_BOTRYOIDAL,
  'globular':                       PRIM_BOTRYOIDAL,
  'nodular':                        PRIM_BOTRYOIDAL,
  'framboidal':                     PRIM_BOTRYOIDAL, // raspberry-like clusters
  'granular':                       PRIM_BOTRYOIDAL,
  'powdery crust':                  PRIM_BOTRYOIDAL,
  'powdery_aggregate':              PRIM_BOTRYOIDAL,
  'powdery_disseminated':           PRIM_BOTRYOIDAL,
  'sublimation_crust':              PRIM_BOTRYOIDAL,
  'iridescent_coating':             PRIM_BOTRYOIDAL,
  'peacock_iridescent':             PRIM_BOTRYOIDAL,
  'specular':                       PRIM_TABULAR,    // specular hematite = basal pinacoid
  'thorn':                          PRIM_ACICULAR,
  'spearhead':                      PRIM_HEX_PRISM_TERMINATED,
  'reticulated':                    PRIM_HEX_PRISM_TERMINATED,
  'trapiche':                       PRIM_DIPYRAMID,  // star-shaped emerald
  'nugget':                         PRIM_BOTRYOIDAL,
  'hopper_growth':                  PRIM_CUBE,       // cubic skeletal
  'pseudomorph':                    PRIM_RHOMBOHEDRON, // shape inherits host; default
  'pseudomorph_after_azurite':      PRIM_TABULAR,    // azurite was tabular
  'pseudomorph_after_sulfide':      PRIM_RHOMBOHEDRON,
  'olive_hex_barrel':               PRIM_HEX_PRISM,
  'yellow_hex_barrel':              PRIM_HEX_PRISM,
  'goshenite':                      PRIM_HEX_PRISM_TERMINATED, // colorless beryl
  'nickel_bloom':                   PRIM_BOTRYOIDAL,
  'cobalt_bloom':                   PRIM_BOTRYOIDAL,    // erythrite efflorescence
  'cottonball':                     PRIM_BOTRYOIDAL,    // borax cottonball aggregate (Death Valley)

  'cabrerite':                      PRIM_TABULAR,       // Mg-bearing annabergite, fibrous-bladed
  'co_bearing':                     PRIM_BOTRYOIDAL,    // chemistry tag fallback (annabergite/erythrite are typically fibrous-massive)
  'cockscomb':                      PRIM_DIPYRAMID,     // marcasite/pyrite cockscomb aggregate
  'disphenoidal':                   PRIM_TETRAHEDRON,   // distorted tetrahedron (sphalerite/chalcopyrite)
  'banded':                         PRIM_BOTRYOIDAL,    // chalcedony/agate-style banding
  'druzy':                          PRIM_BOTRYOIDAL,    // sparkly carpet of micro-crystals
  'arsenolamprite':                 PRIM_BOTRYOIDAL,    // metallic As polymorph, massive
  'chalcotrichite':                 PRIM_ACICULAR,      // capillary cuprite "hair copper"
  'azurite_sun':                    PRIM_BOTRYOIDAL,    // radiating disc rosette
  'enamel_on_cuprite':              PRIM_BOTRYOIDAL,    // thin conformal film
  'endlichite_yellow':              PRIM_HEX_PRISM_TERMINATED,  // hex apatite-group prism
  'asterated':                      PRIM_DIPYRAMID,     // star-shaped (asterism)
  'default_habit':                  PRIM_RHOMBOHEDRON,
};

// Canonical primitives that map to PRIM_DRIPSTONE under air-mode growth.
// Cube / octahedron / tetrahedron / pyritohedron / tabular / dipyramid
// stay as their canonical form: galena cubes don't form icicles,
// barite tabulars stay tabular, marcasite cockscombs (dipyramid) keep
// their distinctive doubly-pointed silhouette. The air-mode override
// is structural — it answers "could this primitive plausibly be a
// hanging drip?" — not "is this habit string in some list".
function _isDripstoneEligibleCanonical(prim) {
  return prim === PRIM_HEX_PRISM_TERMINATED
      || prim === PRIM_HEX_PRISM
      || prim === PRIM_ACICULAR
      || prim === PRIM_RHOMBOHEDRON
      || prim === PRIM_SCALENOHEDRON
      || prim === PRIM_BOTRYOIDAL;
}

function _lookupCrystalPrimitive(crystal) {
  if (!crystal) return PRIM_RHOMBOHEDRON;
  // v24 air-mode override — crystals nucleated in vadose rings get
  // dripstone geometry instead of their canonical habit primitive,
  // when the canonical primitive is structurally compatible with a
  // hanging-drip silhouette. The renderer's existing c-axis flip
  // handles orientation: ceiling cells get c-axis world-down
  // (stalactite hanging), floor cells get c-axis world-up
  // (stalagmite standing).
  const canonical = _canonicalPrimitive(crystal);
  if (crystal.growth_environment === 'air'
      && _isDripstoneEligibleCanonical(canonical)) {
    return PRIM_DRIPSTONE;
  }
  return canonical;
}

// Canonical (fluid-mode) primitive for a crystal, ignoring growth
// environment. Direct table first, then the fuzzy-substring fallback
// catches compound habit strings + runtime-set engine habits.
function _canonicalPrimitive(crystal) {
  if (!crystal) return PRIM_RHOMBOHEDRON;
  const direct = HABIT_TO_PRIMITIVE[crystal.habit];
  if (direct) return direct;
  const h = (crystal.habit || '').toLowerCase();
  // Order matters: hopper checked BEFORE 'cube' since "hopper_growth"
  // doesn't contain "cube" but is cubic; 'opal' before 'plate' since
  // some opal variants get described "platy"; tabular/plate checked
  // before acicular since "tabular_or_prismatic_or_fibrous" should
  // resolve tabular not fibrous.
  if (h.includes('hopper'))                                 return PRIM_CUBE;
  if (h.includes('cube') || h.includes('cubic'))           return PRIM_CUBE;
  if (h.includes('pyritohed'))                              return PRIM_PYRITOHEDRON;
  if (h.includes('octahed'))                                return PRIM_OCTAHEDRON;
  if (h.includes('tetrahed'))                               return PRIM_TETRAHEDRON;
  if (h.includes('scalenohed') || h.includes('dogtooth'))   return PRIM_SCALENOHEDRON;
  if (h.includes('rhomb'))                                  return PRIM_RHOMBOHEDRON;
  if (h.includes('dipyramid') || h.includes('bipyramid')
      || h.includes('trapiche') || h.includes('twinned_cyclic')
      || h.includes('stellate'))                            return PRIM_DIPYRAMID;
  if (h.includes('barrel'))                                 return PRIM_HEX_PRISM;
  if (h.includes('hex_prism') || h.includes('hexagonal'))   return PRIM_HEX_PRISM_TERMINATED;
  if (h.includes('prism') || h.includes('columnar')
      || h.includes('hemimorphic') || h.includes('scepter')
      || h.includes('spearhead') || h.includes('reticulated')
      || h.includes('thorn'))                               return PRIM_HEX_PRISM_TERMINATED;
  if (h.includes('tabular') || h.includes('platy')
      || h.includes('plate') || h.includes('plates')
      || h.includes('micaceous') || h.includes('specular')
      || h.includes('bladed') || h.includes('blade'))       return PRIM_TABULAR;
  if (h.includes('acicular') || h.includes('needle')
      || h.includes('wire') || h.includes('capillary')
      || h.includes('flos_ferri'))                          return PRIM_ACICULAR;
  if (h.includes('botryoidal') || h.includes('reniform')
      || h.includes('mammillary') || h.includes('massive')
      || h.includes('earthy') || h.includes('stalactit')
      || h.includes('opal') || h.includes('chalcedony')
      || h.includes('agate') || h.includes('spherulit')
      || h.includes('globular') || h.includes('nodular')
      || h.includes('framboidal') || h.includes('granular')
      || h.includes('powdery') || h.includes('crust')
      || h.includes('rosette') || h.includes('plumose')
      || h.includes('radiating') || h.includes('iridescent')
      || h.includes('sublimation') || h.includes('coating')
      || h.includes('fibrous') || h.includes('nugget')
      || h.includes('silica_gel'))                          return PRIM_BOTRYOIDAL;
  if (h.includes('arborescent') || h.includes('dendritic')) return PRIM_ACICULAR;
  return PRIM_RHOMBOHEDRON;
}

// Deterministic float in [0, 1) seeded from an integer crystal_id.
// Reuses the same Mulberry32 the wall-state generator uses so the
// rotation around c-axis is reproducible across reloads / replays.
function _seededRand(seed) {
  return _mulberry32(seed | 0)();
}

// Box-Muller: deterministic standard-normal sample seeded from
// (crystal_id, channel). Channel lets a single crystal pull multiple
// independent normals — c-axis tilt-x, tilt-z, and rotation-around-c
// each get their own channel so they don't co-vary. Output is N(0, 1);
// callers multiply by the desired σ. Clamped to ±3σ so a once-in-
// thousand outlier doesn't flip a crystal completely sideways.
function _seededGaussian(seed, channel) {
  const r = _mulberry32(((seed | 0) ^ (channel * 0x9E3779B1)) >>> 0);
  // Standard Box-Muller; r() never returns 0 so log is safe.
  const u1 = Math.max(r(), 1e-9);
  const u2 = r();
  const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(-3, Math.min(3, g));
}

// Build a right-handed basis (perp1, perp2) perpendicular to `axis`,
// rotated by `rotRad` around `axis`. Used to orient a primitive's
// equatorial axes (x, z) in world space for a given anchor.
function _orthonormalBasis(axis, rotRad) {
  const ax = axis[0], ay = axis[1], az = axis[2];
  // Pick a non-parallel helper. World up unless axis ≈ ±y.
  const helper = (Math.abs(ay) < 0.9) ? [0, 1, 0] : [1, 0, 0];
  // p1 = normalize(axis × helper)
  let p1x = ay * helper[2] - az * helper[1];
  let p1y = az * helper[0] - ax * helper[2];
  let p1z = ax * helper[1] - ay * helper[0];
  const p1len = Math.hypot(p1x, p1y, p1z) || 1;
  p1x /= p1len; p1y /= p1len; p1z /= p1len;
  // p2 = axis × p1  (already unit length since axis and p1 are unit + perp)
  const p2x = ay * p1z - az * p1y;
  const p2y = az * p1x - ax * p1z;
  const p2z = ax * p1y - ay * p1x;
  // Rotate the (p1, p2) frame by rotRad around axis.
  const c = Math.cos(rotRad), s = Math.sin(rotRad);
  return [
    [p1x * c + p2x * s, p1y * c + p2y * s, p1z * c + p2z * s],
    [-p1x * s + p2x * c, -p1y * s + p2y * c, -p1z * s + p2z * c],
  ];
}

// Andrew's monotone-chain convex hull of 2D points. Returns the hull
// vertices in CCW order (in screen-y-down coords this looks clockwise
// to a human reader — fine for the canvas fill, which doesn't care).
function _convexHull2D(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Drusy-cluster decision: should this crystal render as one large
// primitive (the default) or as a carpet of N small copies?
//
// Real druses are dense carpets — coarse 5–50 nuclei/cm², fine sugar
// coatings 10²–10⁴ — not the few sparse euhedral crystals the v0
// renderer was producing. Habit strings that signal "this is a carpet
// of small crystals, not one big one" map to a cluster count; a
// size-based fallback gives sub-mm individuals a small cluster too,
// since at typical zoom they otherwise read as ambient noise.
//
// Returns 0 for single-primitive mode, N>0 for cluster of N children.
function _druzyClusterCount(crystal) {
  const h = (crystal.habit || '').toLowerCase();
  // Habit-driven: explicit drusy / massive / earthy carpets.
  if (h.includes('druz'))                                   return 16;
  if (h.includes('crust'))                                  return 12;
  if (h.includes('granular'))                               return 18;
  if (h.includes('earthy'))                                 return 22;
  if (h.includes('arborescent') || h.includes('dendritic')) return 20;
  if (h.includes('massive'))                                return 14;
  if (h.includes('sugar') || h.includes('coating'))         return 14;
  // Size-based: very small crystals get a sparse cluster of 4 mini-
  // copies so they don't render as one near-invisible 3-px primitive.
  if ((crystal.c_length_mm || 0) < 0.4) return 4;
  return 0;
}

// Render one wireframe crystal — single primitive or drusy cluster
// depending on habit/size. The single-instance path lives in
// _renderWireframeInstance; this function dispatches and, when
// clustering, scatters N small offset copies in the substrate's
// tangent plane around the parent's anchor cell.
function _renderCrystalWireframe(ctx, crystal, cellWorld, sphereRadiusPx,
                                  mmToPx, cx, cy, F) {
  const clusterN = _druzyClusterCount(crystal);
  if (clusterN <= 0) {
    _renderWireframeInstance(ctx, crystal, cellWorld, sphereRadiusPx,
                              mmToPx, cx, cy, F, {});
    return;
  }
  // Cluster mode. Each child gets:
  //   * an offset anchor in the substrate's tangent plane (so the
  //     carpet spreads along the wall, not into the cavity)
  //   * its own seeded c-axis scatter (parent_id ^ child_index)
  //   * a fractional size of the parent (0.3–0.7)
  //   * a slightly reduced fill alpha so overlapping children read
  //     as a sparkly carpet rather than a single opaque blob.
  const invR = 1 / (Math.hypot(cellWorld[0], cellWorld[1], cellWorld[2]) || 1);
  const subNormal = [-cellWorld[0] * invR, -cellWorld[1] * invR,
                     -cellWorld[2] * invR];
  const [tA, tB] = _orthonormalBasis(subNormal, 0);
  // Cluster radius in pixels: scaled by the parent's a-width (which
  // encodes the crystal's lateral coverage on the wall) so a small
  // druzy fleck stays compact while a big crustiform sheet spreads
  // across many cells. Capped so a runaway crystal can't blanket the
  // whole vug.
  const widthMm = Math.max(crystal.a_width_mm || 0,
                            crystal.c_length_mm || 0, 1.0);
  const clusterRadiusPx = Math.min(widthMm * 0.9 * mmToPx, 9 * mmToPx);
  const id = crystal.crystal_id | 0;
  for (let i = 1; i <= clusterN; i++) {
    // Scatter offset in tangent plane. Two seeded uniforms with
    // sqrt-radius weighting → uniform area density inside the disc.
    const r = Math.sqrt(_seededRand((id ^ (i * 7919)) >>> 0)) * clusterRadiusPx;
    const a = _seededRand((id ^ (i * 6133)) >>> 0) * 2 * Math.PI;
    const jx = r * Math.cos(a), jy = r * Math.sin(a);
    const anchor = [
      cellWorld[0] + tA[0] * jx + tB[0] * jy,
      cellWorld[1] + tA[1] * jx + tB[1] * jy,
      cellWorld[2] + tA[2] * jx + tB[2] * jy,
    ];
    const sizeMul = 0.3 + 0.4 * _seededRand((id ^ (i * 4111)) >>> 0);
    _renderWireframeInstance(ctx, crystal, anchor, sphereRadiusPx,
                              mmToPx, cx, cy, F, {
      sizeMul,
      seedOffset: i,
      fillAlphaMul: 0.55,
    });
  }
}

// One wireframe primitive: silhouette fill (mineral color, 40% of the
// edge alpha) + edges (mineral color, full edge alpha). Anchor +
// size + seed are passed in so the same helper drives both single-
// crystal and cluster-child rendering. c-axis orientation is
// environment-dependent:
//
//   * 'fluid' (default): perpendicular to substrate (= inward sphere
//     normal at the anchor), with Gaussian scatter that reproduces
//     real druse geometric-selection outcomes (Mathematical
//     Geosciences 1989; mature druse σ ≈ 10–15° around the substrate
//     normal, capped at ±30° before extinction). Epitaxial overgrowths
//     (`enclosed_by != null`) lock tighter at σ ≈ 3° because
//     nucleation is templated by the host's lattice.
//
//   * 'air': gravity-aligned. Stalactite c-axis points world-down
//     regardless of substrate orientation; stalagmite world-up. Wall
//     crystals in air are an edge case with no clean geological
//     analog — fall back to substrate-perpendicular.
//
// Within-crystal jitter is seeded from (crystal_id, seedOffset) with
// separate channels so reloads / replays stay reproducible AND
// cluster children get independent randomness.
function _renderWireframeInstance(ctx, crystal, anchor, sphereRadiusPx,
                                   mmToPx, cx, cy, F, opts) {
  const sizeMul       = opts.sizeMul       != null ? opts.sizeMul       : 1.0;
  const seedOffset    = opts.seedOffset    != null ? opts.seedOffset    : 0;
  const fillAlphaMul  = opts.fillAlphaMul  != null ? opts.fillAlphaMul  : 1.0;
  const prim = _lookupCrystalPrimitive(crystal);
  const cLengthPx = Math.max((crystal.c_length_mm || 0.5) * sizeMul * mmToPx, 3);
  const aWidthPx  = Math.max((crystal.a_width_mm  || 0.5) * sizeMul * mmToPx, 3);
  // Substrate-perpendicular at this anchor (= inward sphere normal).
  const invR = 1 / (Math.hypot(anchor[0], anchor[1], anchor[2]) || 1);
  const subNormal = [-anchor[0] * invR, -anchor[1] * invR, -anchor[2] * invR];
  const env = crystal.growth_environment || 'fluid';
  let cAxis;
  if (env === 'air') {
    // See _topoRenderRings3D's wz convention: south-pole/floor sits at
    // -z, so gravity-down = +z direction. Stalactites at the ceiling
    // point at the floor (always +z); stalagmites at the floor point
    // up (always -z). Wall cells in air fall back to perpendicular.
    if (subNormal[2] > 0.4)       cAxis = [0, 0, 1];
    else if (subNormal[2] < -0.4) cAxis = [0, 0, -1];
    else                          cAxis = subNormal;
  } else {
    const epitaxial = crystal.enclosed_by != null;
    const sigmaRad = (epitaxial ? 3 : 12) * Math.PI / 180;
    const seedId = ((crystal.crystal_id | 0) ^ (seedOffset * 0xA5F00D)) >>> 0;
    const [tA, tB] = _orthonormalBasis(subNormal, 0);
    const gx = _seededGaussian(seedId, 1) * sigmaRad;
    const gy = _seededGaussian(seedId, 2) * sigmaRad;
    const tx = subNormal[0] + tA[0] * gx + tB[0] * gy;
    const ty = subNormal[1] + tA[1] * gx + tB[1] * gy;
    const tz = subNormal[2] + tA[2] * gx + tB[2] * gy;
    const len = Math.hypot(tx, ty, tz) || 1;
    cAxis = [tx / len, ty / len, tz / len];
  }
  const rotSeed = ((crystal.crystal_id | 0) ^ 0xC1B2A305 ^ (seedOffset * 0x5BD1E995)) >>> 0;
  const rotRad = (_seededRand(rotSeed) - 0.5) * 2 * Math.PI;
  const [perp1, perp2] = _orthonormalBasis(cAxis, rotRad);
  const projected = [];
  for (const [px, py, pz] of prim.vertices) {
    const wx = anchor[0] + perp1[0] * px * aWidthPx
                          + cAxis[0] * py * cLengthPx
                          + perp2[0] * pz * aWidthPx;
    const wy = anchor[1] + perp1[1] * px * aWidthPx
                          + cAxis[1] * py * cLengthPx
                          + perp2[1] * pz * aWidthPx;
    const wz = anchor[2] + perp1[2] * px * aWidthPx
                          + cAxis[2] * py * cLengthPx
                          + perp2[2] * pz * aWidthPx;
    const proj = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
    projected.push([cx + proj[0], cy + proj[1]]);
  }
  const edgeAlpha = topoAlphaFor(crystal.mineral);
  const color = topoClassColor(crystal.mineral);
  const hull = _convexHull2D(projected);
  if (hull.length >= 3) {
    ctx.globalAlpha = 0.4 * fillAlphaMul * edgeAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hull[0][0], hull[0][1]);
    for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i][0], hull[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = edgeAlpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [a, b] of prim.edges) {
    ctx.moveTo(projected[a][0], projected[a][1]);
    ctx.lineTo(projected[b][0], projected[b][1]);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Phase B (Tier 1.5) — 3D multi-ring renderer.
// Called from topoRender when _topoView3D is true. Renders every ring
// in wall.rings stacked along a vertical (Y) axis, using per-vertex
// projection through _topoProject3D. Rings + crystals are interleaved
// in painter's order (back-to-front by post-rotation z) so wireframe
// crystals occlude the cavity rings behind them — see
// proposals/PROPOSAL-WIREFRAME-CRYSTALS.md.
//
// Painter's-order granularity: rings paint atomically (the entire
// 120-cell outline of a ring is one paint unit). A crystal anchored
// on the front of ring k paints AFTER ring k as a whole — including
// the back-side cells of ring k that should logically be behind the
// crystal. Acceptable v0 trade-off; see addendum B for the per-cell
// upgrade path.
//
// What's intentionally simplified for v0:
//   * Habit textures (sawtooth/botryoidal/etc) collapse into the
//     primitive's wireframe — drawHabitTexture's chord math doesn't
//     compose with arbitrary projection.
//   * Inclusion dots are skipped (they live on ring[0] only; tier-1
//     hit-test was already broken in 3D mode).
//   * Scale bar is skipped — its physical-distance reading is
//     ambiguous when the disc is tilted.
function _topoRenderRings3D(ctx, sim, wall, ring0, cellR, boundaryR,
                             cx, cy, mmToPx, maxT, arcStep, N, viewW, viewH) {
  const F = 1200;  // perspective focal length, matches tier-1's CSS perspective(1200px)
  const ringCount = wall.ring_count;
  // Spherical cavity profile (renderer-only for now — the engine's
  // ring data stays uniform until Phase D distributes crystals by
  // orientation). Each ring k sits at a latitude φ_k around a sphere
  // whose center is the canvas center; its radial-radius scales as
  // sin(φ_k) and its vertical offset as -cos(φ_k)·R. Half-step offsets
  // (k+0.5 instead of k) keep the polar rings small but non-zero so
  // the engine math (cell_arc_mm, paint_crystal) — which still reads
  // ring[0] — doesn't divide by zero. With 16 rings the smallest
  // radius is sin(π/32) ≈ 0.098 (the south-pole "cap" ring) and the
  // largest is sin(15.5π/32) ≈ 0.998 (the equator).
  const cavityDiameterPx = wall.meanDiameterMm() * mmToPx;
  const sphereRadiusPx = cavityDiameterPx / 2;

  // Per-ring metadata: world-space z, latitude-derived radius factor,
  // θ twist, and the projected z used for painter's-order sorting.
  // For a ring center at (0,0,wz) the post-rotation z is
  // cos(tiltX)·cos(tiltY)·wz; pulling it from _topoProject3D directly
  // keeps it consistent with crystal sort keys (which use the same
  // function on off-axis points).
  const ringMeta = new Array(ringCount);
  for (let r = 0; r < ringCount; r++) {
    // Ring 0 is the south pole (floor), ring N-1 is the north pole
    // (ceiling). φ runs from π/(2N) at ring 0 to π(2N-1)/(2N) at
    // ring N-1 — full latitude sweep with half-step offsets at each
    // end so neither pole collapses to a point. Cross-axis polar
    // factor adds vertical irregularity.
    const phi = Math.PI * (r + 0.5) / ringCount;
    const polar = wall.polarProfileFactor ? wall.polarProfileFactor(phi) : 1.0;
    const ringRadiusFactor = Math.sin(phi) * polar;
    const wz = -Math.cos(phi) * sphereRadiusPx;
    const twist = wall.ringTwistRadians ? wall.ringTwistRadians(phi) : 0.0;
    const projZ = _topoProject3D(0, 0, wz, _topoTiltX, _topoTiltY, F)[2];
    ringMeta[r] = { ringIdx: r, wz, ringRadiusFactor, twist, projZ };
  }

  // Build the painter's-order item list: rings + crystals interleaved.
  // Rings paint atomically (entire outline in one shot); crystals
  // paint as wireframe primitives anchored to their wall cell. Sort
  // ascending by post-rotation z so far things paint first.
  const paintItems = [];
  for (const meta of ringMeta) {
    paintItems.push({ kind: 'ring', meta, sortZ: meta.projZ });
  }

  // v24 water line. If conditions.fluid_surface_ring is set, the
  // meniscus sits at φ = π·s/ringCount along the polar axis. Build a
  // 64-segment polyline tracing the cavity outline at that latitude,
  // pre-projected to screen, and sort the disc as a single paint item
  // at its centre's projected z. Polar profile + per-cell wall depth
  // are folded in so the water line wobbles with the cavity shape.
  let waterDisc = null;
  if (sim && sim.conditions
      && sim.conditions.fluid_surface_ring != null
      && ringCount > 1) {
    const s = sim.conditions.fluid_surface_ring;
    const sClamped = Math.max(0, Math.min(ringCount, s));
    const phiW = Math.PI * sClamped / ringCount;
    const polarW = wall.polarProfileFactor ? wall.polarProfileFactor(phiW) : 1.0;
    const rrfW = Math.sin(phiW) * polarW;
    const wzW = -Math.cos(phiW) * sphereRadiusPx;
    const twistW = wall.ringTwistRadians ? wall.ringTwistRadians(phiW) : 0.0;
    // Sample N_W points around θ. Use the same per-cell base_radius
    // ring0 carries — without per-ring radius variation in the engine
    // this is the best the renderer has for "what shape is the cavity
    // at this height". Wall_depth on ring0 also folds in.
    const N_W = 64;
    const pts = new Array(N_W);
    for (let j = 0; j < N_W; j++) {
      const theta = (2 * Math.PI * j) / N_W + twistW;
      // Sample ring0's per-cell radius at the matching θ index.
      const cellIdx = Math.floor((j / N_W) * N) % N;
      const cell = ring0[cellIdx];
      const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
      const rPx = (baseR + cell.wall_depth) * mmToPx * rrfW;
      const wx = rPx * Math.cos(theta);
      const wy = rPx * Math.sin(theta);
      pts[j] = [wx, wy, wzW];
    }
    const projZW = _topoProject3D(0, 0, wzW, _topoTiltX, _topoTiltY, F)[2];
    waterDisc = { points: pts, sortZ: projZW };
    paintItems.push({ kind: 'water', disc: waterDisc, sortZ: projZW });
  }
  if (sim && sim.crystals) {
    for (const crystal of sim.crystals) {
      if (crystal.dissolved) continue;
      const ringIdx = crystal.wall_ring_index;
      const cellIdx = crystal.wall_center_cell;
      if (ringIdx == null || cellIdx == null) continue;
      const meta = ringMeta[ringIdx];
      if (!meta) continue;
      const ring = wall.rings[ringIdx];
      if (!ring || !ring.length) continue;
      const aMid = _topoAngleFor(cellIdx, N) + meta.twist;
      const rrf = meta.ringRadiusFactor;
      const cellMidR = cellR[cellIdx] * rrf;
      const cellWx = cellMidR * Math.cos(aMid);
      const cellWy = cellMidR * Math.sin(aMid);
      const cellWz = meta.wz;
      const projected = _topoProject3D(cellWx, cellWy, cellWz,
                                        _topoTiltX, _topoTiltY, F);
      paintItems.push({
        kind: 'crystal',
        crystal,
        cellWorld: [cellWx, cellWy, cellWz],
        sortZ: projected[2],
      });
    }
  }
  paintItems.sort((a, b) => {
    if (a.sortZ !== b.sortZ) return a.sortZ - b.sortZ;
    if (a.kind !== b.kind) return a.kind === 'ring' ? -1 : 1;
    if (a.kind === 'ring') return a.meta.ringIdx - b.meta.ringIdx;
    // Tie-break crystals by id so pseudomorphs / overgrowths (later
    // crystal_id) paint on top of their host — typically correct since
    // overgrowths are later in paragenesis.
    return (a.crystal.crystal_id | 0) - (b.crystal.crystal_id | 0);
  });

  // Project a (canvasX, canvasY) point at this ring's height to screen.
  function projAt(wz) {
    return (canvasX, canvasY) => {
      const wx = canvasX - cx;
      const wy = canvasY - cy;
      const [px, py] = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      return [cx + px, cy + py];
    };
  }

  // Render one ring's wall outline. Replaces the wedge-fill block from
  // pre-wireframe versions — wedges are now wireframe primitives drawn
  // as separate paint items above. The wall stroke still varies width
  // by crystal thickness so a heavily-grown ring reads as "encrusted"
  // through line weight alone.
  function renderRingOutline(meta) {
    const { ringIdx, wz, ringRadiusFactor, twist } = meta;
    const ring = wall.rings[ringIdx];
    if (!ring || !ring.length) return;
    const proj = projAt(wz);
    const rrf = ringRadiusFactor;
    const ringTwist = twist || 0;
    const orient = wall.ringOrientation(ringIdx);
    let bareWallColor = TOPO_WALL_COLOR;
    if (orient === 'floor') bareWallColor = TOPO_WALL_COLOR_FLOOR;
    else if (orient === 'ceiling') bareWallColor = TOPO_WALL_COLOR_CEILING;
    // v24: ring is submerged below the meniscus → after stroking the
    // canonical wall colour for each cell, re-stroke the same path with
    // a thin translucent blue companion line. Reads at-a-glance as
    // "this ring is underwater". Meniscus + vadose rings get no extra
    // line; the meniscus disc itself communicates the surface and the
    // dry rings keep their canonical orange.
    const wstate = (sim && sim.conditions && sim.conditions.ringWaterState)
      ? sim.conditions.ringWaterState(ringIdx, ringCount)
      : 'submerged';
    const isSubmerged = wstate === 'submerged'
      && sim && sim.conditions && sim.conditions.fluid_surface_ring != null;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const a0 = _topoAngleFor(i, N) - arcStep / 2 + ringTwist;
      const aMid = _topoAngleFor(i, N) + ringTwist;
      const a1 = a0 + arcStep;
      const rStart = boundaryR[i] * rrf;
      const rMid = cellR[i] * rrf;
      const rEnd = boundaryR[(i + 1) % N] * rrf;
      const cell = ring[i];
      let stroke, width, alpha;
      if (cell.crystal_id == null) {
        stroke = bareWallColor;
        width = TOPO_WALL_STROKE_PX;
        alpha = 1;
      } else {
        stroke = topoClassColor(cell.mineral);
        const t = Math.min(cell.thickness_um / maxT, 1);
        width = TOPO_WALL_STROKE_PX + t * (TOPO_WALL_STROKE_MAX_PX - TOPO_WALL_STROKE_PX);
        alpha = topoAlphaFor(cell.mineral);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      const sxW = cx + rStart * Math.cos(a0), syW = cy + rStart * Math.sin(a0);
      const mxW = cx + rMid * Math.cos(aMid), myW = cy + rMid * Math.sin(aMid);
      const exW = cx + rEnd * Math.cos(a1),  eyW = cy + rEnd * Math.sin(a1);
      const [psx, psy] = proj(sxW, syW);
      const [pmx, pmy] = proj(mxW, myW);
      const [pex, pey] = proj(exW, eyW);
      const cpX = 2 * pmx - (psx + pex) / 2;
      const cpY = 2 * pmy - (psy + pey) / 2;
      ctx.beginPath();
      ctx.moveTo(psx, psy);
      ctx.quadraticCurveTo(cpX, cpY, pex, pey);
      ctx.stroke();
      if (isSubmerged) {
        // Re-stroke the same path with a thin blue companion line.
        // Lower alpha + lineCap=butt so it reads as a tint along the
        // wall colour, not a competing outline. Width capped at the
        // base wall stroke so heavily-encrusted cells (very thick
        // wall colour) don't drown out the underwater cue.
        const prevCap = ctx.lineCap;
        ctx.lineCap = 'butt';
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = 'rgba(110, 190, 245, 1.0)';
        ctx.lineWidth = Math.min(width, TOPO_WALL_STROKE_PX) * 0.55;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineCap = prevCap;
      }
    }
    ctx.globalAlpha = 1;
  }

  // v24: render the meniscus disc — translucent blue fill with a
  // brighter outline, projected through the same camera transform as
  // rings/crystals. Painter's order puts the disc at its meniscus
  // latitude's z, so back-half occluded by far rings/crystals and
  // front-half occludes near rings/crystals. Imperfect for objects
  // straddling the disc's z (single sortZ for the whole disc), but
  // reads correctly at typical tilt angles.
  function renderWaterDisc(disc) {
    const proj = projAt(0); // wz baked into points already
    const screen = disc.points.map(([wx, wy, wz]) => {
      const [px, py] = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      return [cx + px, cy + py];
    });
    if (!screen.length) return;
    ctx.beginPath();
    ctx.moveTo(screen[0][0], screen[0][1]);
    for (let j = 1; j < screen.length; j++) {
      ctx.lineTo(screen[j][0], screen[j][1]);
    }
    ctx.closePath();
    ctx.save();
    ctx.fillStyle = 'rgba(86, 170, 240, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  for (const item of paintItems) {
    if (item.kind === 'ring') renderRingOutline(item.meta);
    else if (item.kind === 'water') renderWaterDisc(item.disc);
    else _renderCrystalWireframe(ctx, item.crystal, item.cellWorld,
                                  sphereRadiusPx, mmToPx, cx, cy, F);
  }

  // Vug size readout — same HTML overlay as 2D mode.
  const sizeLabel = document.getElementById('topo-vug-size');
  if (sizeLabel) {
    sizeLabel.textContent = `Vug ⌀ ${wall.meanDiameterMm().toFixed(1)} mm × ${ringCount} rings`;
  }
}

// Hit-test: resolve (mouseX, mouseY) on the canvas into a mineral
// under the cursor. Returns { mineral, isInclusion, cell } or null
// if the cursor is not on a crystal. Called by both the tooltip and
// the highlight hover/click handlers so their geometry stays in sync.
// Reconstruct the (mmToPx, cx, cy) the renderer is using for the
// current canvas + zoom + pan state. Used by both 2D and 3D hit-test
// paths so cursor coords map to the same world the user sees.
function _topoCanvasFrame(rect, wall, ring0) {
  const cssW = rect.width, cssH = rect.height;
  const initR = wall.initial_radius_mm;
  let maxWallR = wall.max_seen_radius_mm || initR * 2;
  for (const c of ring0) {
    const baseR = c.base_radius_mm > 0 ? c.base_radius_mm : initR;
    const r = baseR + c.wall_depth;
    if (r > maxWallR) maxWallR = r;
  }
  const centerPad = 48;
  const viewW = cssW / TOPO_STAGE_SCALE;
  const viewH = cssH / TOPO_STAGE_SCALE;
  const fit = Math.min(viewW, viewH - centerPad) * 0.82 / 2;
  const mmToPx = (fit / maxWallR) * _topoZoom;
  const cx = cssW / 2 + _topoPanX;
  const cy = (cssH - centerPad) / 2 + 8 + _topoPanY;
  return { cssW, cssH, mmToPx, cx, cy, initR, maxWallR };
}

// 3D hit-test. The cavity surface is NOT a true sphere — each ring
// has its own latitude-dependent radius factor (sin(φ)·polar_profile)
// and per-cell base_radius wobble, so it's a stretched-and-bumped
// sphere. Ray-vs-sphere math gives wrong answers when polar pinches
// pull cells far inside the mean sphere.
//
// Brute-force approach: forward-project every cell's anchor center
// to screen, find the cell whose projection is nearest to the cursor.
// This is naturally correct for the bumpy surface AND handles the
// wireframe-occlusion case (both front and back hemispheres visible)
// without explicit hemisphere math — the nearest-projection cell is
// the one the user is hovering over.
//
// Cost: 1 projection + 1 distance² per cell × 16 rings × 120 cells =
// ~2k operations per hit-test. Negligible at hover-event frequency.
//
// Returns { mineral, isInclusion, cell, ringIdx, cellIdx } or null
// (cursor too far from any cell). Crystal-on-cell follows the same
// engine semantic as 2D mode: a cell's crystal_id is the occupant;
// null means bare wall.
function _hitTest3D(ev, sim, rect) {
  const wall = sim.wall_state;
  if (!wall || !wall.rings || wall.rings.length < 2) return null;
  const ringCount = wall.ring_count;
  const ring0 = wall.rings[0];
  const N = ring0.length;
  const F = 1200;  // matches _topoRenderRings3D
  const { mmToPx, cx, cy, initR } = _topoCanvasFrame(rect, wall, ring0);
  const sphereRadiusPx = wall.meanDiameterMm() * mmToPx / 2;

  // Cursor in canvas-relative coords (matches what _topoProject3D's
  // output adds cx/cy back to).
  const ux = (ev.clientX - rect.left) - cx;
  const uy = (ev.clientY - rect.top) - cy;

  // Walk every cell, project its anchor, track the nearest in screen
  // space. Two candidates kept: the absolute nearest, AND the nearest
  // crystal-bearing cell (so a wireframe crystal sitting near a bare
  // cell's projected center wins on user-intent grounds — they almost
  // certainly meant to hover the visible crystal, not its bare-wall
  // neighbor).
  let bestAny = null, bestAnyD2 = Infinity;
  let bestCrystal = null, bestCrystalD2 = Infinity;
  for (let r = 0; r < ringCount; r++) {
    const phi = Math.PI * (r + 0.5) / ringCount;
    const polar = wall.polarProfileFactor ? wall.polarProfileFactor(phi) : 1.0;
    const rrf = Math.sin(phi) * polar;
    const wz = -Math.cos(phi) * sphereRadiusPx;
    const twist = wall.ringTwistRadians ? wall.ringTwistRadians(phi) : 0;
    const ring = wall.rings[r];
    if (!ring || !ring.length) continue;
    for (let i = 0; i < N; i++) {
      const c = ring[i];
      const baseR = c.base_radius_mm > 0 ? c.base_radius_mm : initR;
      const cellOuter = (baseR + c.wall_depth) * mmToPx;
      const aMid = -Math.PI / 2 + (i / N) * 2 * Math.PI + twist;
      const wx = cellOuter * rrf * Math.cos(aMid);
      const wy = cellOuter * rrf * Math.sin(aMid);
      const p = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      const dx = ux - p[0], dy = uy - p[1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestAnyD2) {
        bestAnyD2 = d2; bestAny = { ringIdx: r, cellIdx: i, cell: c };
      }
      if (c.crystal_id != null && d2 < bestCrystalD2) {
        bestCrystalD2 = d2; bestCrystal = { ringIdx: r, cellIdx: i, cell: c };
      }
    }
  }
  if (!bestAny) return null;

  // User-intent rule: if a crystal-bearing cell is reasonably close to
  // the cursor (within 14 px, ~2 cells worth of arc at typical scale),
  // prefer it over an even-closer bare-wall cell. Otherwise the bare
  // wall wins. The threshold is small enough that the user has to be
  // visually on a crystal silhouette for this to fire.
  const CRYSTAL_PREFERENCE_PX = 14;
  if (bestCrystal && bestCrystalD2 <= CRYSTAL_PREFERENCE_PX * CRYSTAL_PREFERENCE_PX) {
    const { ringIdx, cellIdx, cell } = bestCrystal;
    return { mineral: cell.mineral, isInclusion: false, cell, ringIdx, cellIdx };
  }
  const { ringIdx, cellIdx, cell } = bestAny;
  if (cell.crystal_id == null) {
    return { mineral: null, isInclusion: false, cell, ringIdx, cellIdx };
  }
  return { mineral: cell.mineral, isInclusion: false, cell, ringIdx, cellIdx };
}

function _topoHitTest(ev) {
  const canvas = document.getElementById('topo-canvas');
  const sim = topoActiveSim();
  if (!canvas || !sim) return null;
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;

  // Inclusion hit-test first — dots take priority over host wall cell.
  // Inclusions are 2D-rendered only (see _topoInclusions populate path);
  // in 3D mode the array stays empty, so the loop is a no-op.
  for (const inc of _topoInclusions) {
    const dx = mx - inc.x, dy = my - inc.y;
    if (dx * dx + dy * dy <= inc.r * inc.r) {
      if (inc.mineral) return { mineral: inc.mineral, isInclusion: true };
      const crystal = sim.crystals.find(c => c.crystal_id === inc.crystal_id);
      if (crystal) return { mineral: crystal.mineral, isInclusion: true };
    }
  }

  // 3D mode: ray-cast against the cavity sphere instead of inverting
  // the 2D polar transform (which ignores tilt + per-ring twist).
  if (_topoView3D && sim.wall_state && sim.wall_state.rings &&
      sim.wall_state.rings.length > 1) {
    return _hitTest3D(ev, sim, rect);
  }

  // 2D path: hit-test reads whatever ring the renderer is currently
  // showing. Aggregate (post-scatter default) → resolves any crystal
  // on any ring at the cursor's angular position. Single-slice mode →
  // resolves only crystals on that specific ring.
  const ring0 = _topoActiveRingForRender(sim.wall_state);
  if (!ring0 || !ring0.length) return null;
  const { mmToPx, cx, cy, initR } = _topoCanvasFrame(rect, sim.wall_state, ring0);
  const N = ring0.length;
  const dx = mx - cx, dy = my - cy;
  const rMouse = Math.hypot(dx, dy);
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  while (a < 0) a += 2 * Math.PI;
  while (a >= 2 * Math.PI) a -= 2 * Math.PI;
  const idx = Math.min(N - 1, Math.max(0, Math.round((a / (2 * Math.PI)) * N) % N));
  const cell = ring0[idx];
  const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
  const cellOuterPx = (baseR + cell.wall_depth) * mmToPx;
  if (rMouse > cellOuterPx + 10 || rMouse < cellOuterPx * 0.15) return null;
  if (cell.crystal_id == null) return { mineral: null, isInclusion: false, cell };
  return { mineral: cell.mineral, isInclusion: false, cell };
}

// Hover: shared 2D + 3D path. _topoHitTest already resolves the cursor
// to either an inclusion, a wall cell on the cavity sphere (3D), or a
// wall cell via 2D polar inversion (2D). We just turn its result into
// tooltip HTML — no duplicated geometry math here. Inclusion hits get
// the "◆ inside host" framing; wall hits get the standard mineral /
// habit / size readout.
function _topoTooltipFromEvent(ev) {
  const canvas = document.getElementById('topo-canvas');
  const tip = document.getElementById('topo-tooltip');
  const sim = topoActiveSim();
  if (!canvas || !tip || !sim) return;
  const hit = _topoHitTest(ev);
  topoSetHoverTarget(
    hit && hit.mineral ? { type: 'mineral', value: hit.mineral } : null
  );
  if (!hit) { tip.style.display = 'none'; return; }

  let html;
  if (hit.isInclusion) {
    const crystal = sim.crystals.find(c => c.mineral === hit.mineral);
    if (!crystal) { tip.style.display = 'none'; return; }
    const host = sim.crystals.find(c => c.crystal_id === crystal.enclosed_by);
    const spec = MINERAL_SPEC[crystal.mineral] || {};
    const color = spec.class_color || TOPO_WALL_COLOR;
    const lines = [];
    lines.push(`<b style="color:${color}">◆ ${crystal.mineral} #${crystal.crystal_id}</b>`);
    lines.push(`${crystal.habit}${crystal.twinned ? ` (${crystal.twin_law} twin)` : ''}`);
    lines.push(`${crystal.c_length_mm.toFixed(2)} mm — inclusion`);
    if (host) lines.push(`inside ${host.mineral} #${host.crystal_id}`);
    html = lines.join('<br>');
  } else {
    const cell = hit.cell;
    if (!cell) { tip.style.display = 'none'; return; }
    if (cell.crystal_id == null) {
      // 3D mode renders the cavity as a wireframe topo map — the user
      // can SEE the bare wall directly, so the "wall · eroded +Xmm"
      // tooltip just adds friction without information. Suppress it.
      // 2D mode keeps the readout because the strip view doesn't make
      // erosion depth obvious from geometry alone.
      if (_topoView3D) { tip.style.display = 'none'; return; }
      const wallDepthMm = cell.wall_depth || 0;
      const depthNote = wallDepthMm > 0.1 ? ` · eroded +${wallDepthMm.toFixed(1)}mm` : '';
      html = `<b style="color:${TOPO_WALL_COLOR}">${sim.conditions.wall.composition || 'wall'}</b><br>` +
             `bare wall${depthNote}`;
    } else {
      const crystal = sim.crystals.find(c => c.crystal_id === cell.crystal_id);
      const spec = MINERAL_SPEC[cell.mineral] || {};
      const color = spec.class_color || TOPO_WALL_COLOR;
      const lines = [];
      lines.push(`<b style="color:${color}">${cell.mineral} #${cell.crystal_id}</b>`);
      if (crystal) {
        lines.push(`${crystal.habit}${crystal.twinned ? ` (${crystal.twin_law} twin)` : ''}`);
        lines.push(`${crystal.c_length_mm.toFixed(2)} mm · vector: ${crystal.vector}`);
      }
      html = lines.join('<br>');
    }
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  // Viewport-relative positioning (CSS is now position:fixed). Don't
  // subtract container offsets — under TOPO_STAGE_SCALE + _topoZoom + pan
  // transforms, that mismatch is what produces the offset bug.
  tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 6, ev.clientX + 12)}px`;
  tip.style.top = `${Math.min(window.innerHeight - 40, ev.clientY - 10)}px`;
}

function _topoHideTooltip() {
  const tip = document.getElementById('topo-tooltip');
  if (tip) tip.style.display = 'none';
  // Canvas hover also stops contributing to the highlight when the
  // cursor leaves — the legend hover (if any) becomes the effective
  // target, or nothing if neither is active.
  topoSetHoverTarget(null);
}

// Canvas click — toggle lock on the crystal under the cursor, or clear
// the lock if clicking empty space. Brief edge case: clicks on the
// legend propagate up to canvas if not stopped; the legend handler
// calls stopPropagation to prevent that crossover.
function _topoClickFromEvent(ev) {
  const hit = _topoHitTest(ev);
  topoToggleLockTarget(
    hit && hit.mineral ? { type: 'mineral', value: hit.mineral } : null
  );
}

// Zoom — multiplies mmToPx in the renderer. `dir` is +1 (in) or -1 (out).
function topoZoom(dir) {
  const factor = dir > 0 ? TOPO_ZOOM_STEP : (1 / TOPO_ZOOM_STEP);
  _topoZoom = Math.max(TOPO_ZOOM_MIN, Math.min(TOPO_ZOOM_MAX, _topoZoom * factor));
  const label = document.getElementById('topo-zoom-label');
  if (label) label.textContent = `${Math.round(_topoZoom * 100)}%`;
  topoRender();
}

// Set the camera drag mode ('rotate' | 'pan') or toggle it off by
// re-clicking the currently-active one. Updates button highlights,
// flips _topoView3D for the renderer, and applies/clears the CSS 3D
// transform on the canvas.
function topoSetDragMode(mode) {
  // Toggle behavior: re-clicking the active mode returns to default.
  if (_topoDragMode === mode) mode = 'default';
  _topoDragMode = mode;
  _topoView3D = (mode === 'rotate');
  const rotateBtn = document.getElementById('topo-rotate-btn');
  const panBtn = document.getElementById('topo-pan-btn');
  if (rotateBtn) rotateBtn.style.color = (mode === 'rotate') ? '#f0c050' : '';
  if (panBtn) panBtn.style.color = (mode === 'pan') ? '#f0c050' : '';
  // Slice stepper hides in 3D mode (every ring is rendered stacked
  // there anyway; the per-slice navigation only makes sense in the
  // top-down 2D view). CSS `body.topo-view-3d .topo-slice-ctrls`
  // does the actual hiding.
  document.body.classList.toggle('topo-view-3d', _topoView3D);
  _topoApplyTransform();
  topoRender();
}

// Reset pan and tilt to zero. Zoom is preserved (user probably wants
// to keep their zoom level when recentering).
function topoRecenter() {
  _topoPanX = 0;
  _topoPanY = 0;
  _topoTiltX = 0;
  _topoTiltY = 0;
  _topoApplyTransform();
  topoRender();
}

// Phase B (Tier 1.5): tilt is now applied per-vertex inside topoRender's
// 3D branch (_topoRenderRings3D), not via a CSS transform on the canvas
// element. This function stays as a no-op + cleanup hook so existing
// callers (topoSetDragMode, topoRecenter) don't need to change. It also
// clears any leftover CSS transform from a tier-1 build whose state
// somehow survived (e.g. cached page) — defensive.
function _topoApplyTransform() {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  if (canvas.style.transform) {
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
  }
}

// Wire hover + zoom wheel + click-drag pan once — called from the
// panel's first show. Idempotent.
let _topoWired = false;
function topoEnsureWired() {
  if (_topoWired) return;
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  canvas.addEventListener('mousemove', _topoTooltipFromEvent);
  canvas.addEventListener('mouseleave', _topoHideTooltip);
  canvas.addEventListener('click', _topoClickFromEvent);
  // Wheel = zoom. Preventing default so the page doesn't scroll past
  // the canvas while the player is framing the vug.
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    topoZoom(ev.deltaY < 0 ? +1 : -1);
  }, { passive: false });
  // Click-drag pan / rotate. Pointer events handle BOTH mouse and
  // touch from one code path (vs. the old mousedown/mousemove/mouseup
  // which never fired during touch gestures — emulated mouse events
  // only arrive after touchend, too late for drag tracking). Modern
  // browsers (Safari iOS 13+, Chrome, Firefox, Edge) all support
  // Pointer Events; the canvas's `touch-action: none` CSS lets the
  // gesture reach this handler instead of being eaten by browser
  // page-pan defaults.
  canvas.addEventListener('pointerdown', _topoPanMouseDown);
  window.addEventListener('resize', () => topoRender());
  _topoWired = true;
}

// Drag start. Branches on view mode:
//   2D mode: pan, but only if the click wasn't on a crystal
//            (_topoHitTest returns {mineral: 'X'} → tooltip/click wins)
//   3D mode: rotate, from anywhere on the canvas (hit-tests are
//            inaccurate under CSS 3D transform anyway)
// Stores ORIGIN values for whichever mode we're in so mousemove can
// compute deltas against them.
let _topoDragOriginTiltX = 0;
let _topoDragOriginTiltY = 0;
function _topoPanMouseDown(ev) {
  // For pointer events, button=0 is the primary button (left mouse,
  // first touch contact, primary stylus). Right-click / middle-click
  // / secondary touches are skipped.
  if (ev.button !== 0) return;
  // preventDefault on the pointerdown suppresses the browser's
  // emulated mouse events (which would fire after touchend and
  // double-trigger handlers) and any default page-scroll gesture
  // that might still come from a misconfigured touch-action setting.
  ev.preventDefault();
  // In 'default' mode, clicks on a crystal go to tooltip/click, not drag.
  // In 'rotate' or 'pan' modes, drag starts from anywhere on the canvas.
  if (_topoDragMode === 'default') {
    const hit = _topoHitTest(ev);
    if (hit && hit.mineral) return;  // click on a crystal — let tooltip/click win
  }
  _topoDragging = false;          // becomes true once movement exceeds threshold
  _topoDragStartClientX = ev.clientX;
  _topoDragStartClientY = ev.clientY;
  _topoDragOriginPanX = _topoPanX;
  _topoDragOriginPanY = _topoPanY;
  _topoDragOriginTiltX = _topoTiltX;
  _topoDragOriginTiltY = _topoTiltY;
  document.addEventListener('pointermove', _topoPanMouseMove);
  document.addEventListener('pointerup', _topoPanMouseUp);
  // `pointercancel` covers cases where the OS interrupts the gesture
  // (e.g. iOS palm rejection, system-level edge swipe) — without
  // handling it, the document-level listeners can leak.
  document.addEventListener('pointercancel', _topoPanMouseUp);
}

// Document-level mousemove during a candidate drag. Only commits once
// movement exceeds TOPO_DRAG_THRESHOLD_PX, letting short clicks still
// fire the existing click handler unchanged. In 2D mode updates pan;
// in 3D mode updates tilts (rotateX = vertical drag, rotateY = horiz).
const TOPO_DRAG_ROTATE_RAD_PER_PX = 0.5 * Math.PI / 180;  // 0.5° per px
function _topoPanMouseMove(ev) {
  const dx = ev.clientX - _topoDragStartClientX;
  const dy = ev.clientY - _topoDragStartClientY;
  if (!_topoDragging) {
    if (Math.hypot(dx, dy) < TOPO_DRAG_THRESHOLD_PX) return;
    _topoDragging = true;
    const canvas = document.getElementById('topo-canvas');
    if (canvas) canvas.style.cursor = 'grabbing';
  }
  if (_topoDragMode === 'rotate') {
    // Vertical drag → rotateX (pitch); horizontal drag → rotateY (yaw).
    // Negative dy gives intuitive "pull up to tilt toward viewer" feel.
    // Phase B (Tier 1.5): no tilt clamp — per-vertex projection has no
    // geometric edge cases at vertical (the tier-1 ±86° clamp existed
    // only because CSS transform got weird past edge-on).
    _topoTiltX = _topoDragOriginTiltX + (-dy) * TOPO_DRAG_ROTATE_RAD_PER_PX;
    _topoTiltY = _topoDragOriginTiltY + dx * TOPO_DRAG_ROTATE_RAD_PER_PX;
    topoRender();
  } else {
    // 'default' or 'pan' mode — both translate pan offsets.
    _topoPanX = _topoDragOriginPanX + dx;
    _topoPanY = _topoDragOriginPanY + dy;
    topoRender();
  }
}

// Pointerup / pointercancel ends the drag and tears down the
// document-level listeners. If the user never crossed the movement
// threshold, the click event will still fire on the canvas (browser
// default behavior — pointerup on the same target as pointerdown
// without enough motion triggers a synthetic click).
function _topoPanMouseUp() {
  document.removeEventListener('pointermove', _topoPanMouseMove);
  document.removeEventListener('pointerup', _topoPanMouseUp);
  document.removeEventListener('pointercancel', _topoPanMouseUp);
  if (_topoDragging) {
    _topoDragging = false;
    const canvas = document.getElementById('topo-canvas');
    if (canvas) canvas.style.cursor = '';
  }
}

// Replay: walk the per-step ring[0] snapshots captured during the run,
// rendering each one in sequence so the player watches the wall evolve
// from bare rock to the current state. Click again to stop — the live
// view restores automatically.
let _topoPlaybackTimer = null;

function topoReplay() {
  const btn = document.getElementById('topo-replay-btn');
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;

  // Toggle: already playing → stop and restore the live view.
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
    topoRender();
    return;
  }

  const history = sim.wall_state_history;
  const totalSteps = history.length;
  // Target ~4s total for long runs, but never slower than 40ms/frame and
  // never faster than 16ms/frame. Scales gracefully from 20-step to
  // 200-step runs without feeling laggy or strobing.
  const frameMs = Math.max(16, Math.min(40, Math.round(4000 / totalSteps)));
  let idx = 0;

  if (btn) { btn.textContent = '⏹'; btn.classList.add('playing'); }
  _topoPlaybackTimer = setInterval(() => {
    if (idx >= history.length) {
      clearInterval(_topoPlaybackTimer);
      _topoPlaybackTimer = null;
      if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
      // Snap back to live so any new growth lands immediately.
      topoRender();
      return;
    }
    topoRender(history[idx]);
    idx++;
  }, frameMs);
}

function idleDrawChart() {
  const canvas = document.getElementById('idle-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, W, H);

  if (idleHistory.length < 2) return;

  const padding = { left: 50, right: 15, top: 15, bottom: 30 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Find Y range — supersaturation typically 0 to ~5, but can spike
  let maxSigma = 3.0;
  for (const h of idleHistory) {
    for (const val of Object.values(h.supersats)) {
      if (val > maxSigma) maxSigma = Math.min(val, 15);
    }
  }
  maxSigma = Math.ceil(maxSigma);

  const xScale = chartW / (idleMaxHistory - 1);
  const yScale = chartH / maxSigma;

  // Grid lines
  ctx.strokeStyle = '#1a1a14';
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= maxSigma; y++) {
    const py = padding.top + chartH - y * yScale;
    ctx.beginPath();
    ctx.moveTo(padding.left, py);
    ctx.lineTo(W - padding.right, py);
    ctx.stroke();

    ctx.fillStyle = '#5a4a30';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(y.toString(), padding.left - 5, py + 3);
  }

  // Nucleation threshold line at σ = 1.0
  const threshY = padding.top + chartH - 1.0 * yScale;
  ctx.strokeStyle = '#3a3520';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, threshY);
  ctx.lineTo(W - padding.right, threshY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('σ=1 nucleation', W - padding.right - 80, threshY - 4);

  // X axis labels (step numbers)
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  if (idleHistory.length > 0) {
    const first = idleHistory[0].step;
    const last = idleHistory[idleHistory.length - 1].step;
    ctx.fillText(String(first), padding.left, H - 5);
    ctx.fillText(String(last), W - padding.right, H - 5);
    if (idleHistory.length > 50) {
      const mid = idleHistory[Math.floor(idleHistory.length / 2)].step;
      ctx.fillText(String(mid), padding.left + chartW / 2, H - 5);
    }
  }

  // Y axis label
  ctx.save();
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.translate(12, padding.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Supersaturation (σ)', 0, 0);
  ctx.restore();

  // Draw lines for each mineral
  const startIdx = Math.max(0, idleHistory.length - idleMaxHistory);
  for (const [mineral, color] of Object.entries(IDLE_MINERAL_COLORS)) {
    const points = [];
    for (let i = startIdx; i < idleHistory.length; i++) {
      const val = idleHistory[i].supersats[mineral];
      if (val === undefined) continue;
      const x = padding.left + (i - startIdx) * xScale;
      const y = padding.top + chartH - Math.min(val, maxSigma) * yScale;
      points.push({ x, y });
    }
    if (points.length < 2) continue;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Temperature overlay (right side, subtle)
  if (idleHistory.length > 1) {
    let minT = 600, maxT = 25;
    for (const h of idleHistory) {
      if (h.temp < minT) minT = h.temp;
      if (h.temp > maxT) maxT = h.temp;
    }
    const tRange = Math.max(maxT - minT, 10);

    ctx.strokeStyle = '#ff884422';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = startIdx; i < idleHistory.length; i++) {
      const x = padding.left + (i - startIdx) * xScale;
      const y = padding.top + chartH - ((idleHistory[i].temp - minT) / tRange) * chartH;
      if (i === startIdx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Temperature label
    ctx.fillStyle = '#ff884466';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const lastT = idleHistory[idleHistory.length - 1].temp;
    ctx.fillText(`${lastT.toFixed(0)}°C`, W - padding.right, padding.top + 10);
  }
}

function idleAppendLog(logEl, text, className) {
  if (!logEl) return;
  const line = document.createElement('div');
  line.className = 'idle-log-line' + (className ? ' ' + className : '');
  line.textContent = text;
  // Insert at top — newest first, old text pushes down
  logEl.insertBefore(line, logEl.firstChild);
  // Keep only last 100 lines
  while (logEl.children.length > 100) {
    logEl.removeChild(logEl.lastChild);
  }
}

function idleDrawPie() {
  if (!idleSim) return;
  const canvas = document.getElementById('idle-pie');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, radius = Math.min(cx, cy) - 8;

  ctx.clearRect(0, 0, W, H);

  // Calculate vug volume (sphere) in mm³
  const vugDiam = idleSim.conditions.wall.vug_diameter_mm;
  const vugRadius = vugDiam / 2;
  const vugVolume = (4 / 3) * Math.PI * Math.pow(vugRadius, 3);

  // Estimate crystal volumes — approximate as ellipsoids
  const mineralVolumes = {};
  let totalCrystalVolume = 0;
  for (const crystal of idleSim.crystals) {
    if (!crystal.active) continue;
    const a = crystal.c_length_mm / 2; // semi-major
    const b = crystal.a_width_mm / 2;  // semi-minor
    const vol = (4 / 3) * Math.PI * a * b * b; // prolate ellipsoid
    const mineral = crystal.mineral;
    mineralVolumes[mineral] = (mineralVolumes[mineral] || 0) + vol;
    totalCrystalVolume += vol;
  }

  const rawFillPct = (totalCrystalVolume / vugVolume) * 100;
  const fillPct = Math.min(100, rawFillPct);
  const openPct = Math.max(0, 100 - fillPct);

  // Build slices: minerals + open space
  const slices = [];
  for (const [mineral, vol] of Object.entries(mineralVolumes)) {
    const pct = (vol / vugVolume) * 100;
    const color = MINERAL_GAME_COLORS[mineral] || '#d4a843';
    slices.push({ label: mineral, pct, color });
  }
  // Sort by size descending
  slices.sort((a, b) => b.pct - a.pct);
  // Add open space
  slices.push({ label: 'open', pct: Math.max(0, openPct), color: '#1a1a14' });

  // Draw pie — minimum visible angle for tiny minerals
  const minAngle = 0.05; // ~3 degrees, enough to see a sliver
  let startAngle = -Math.PI / 2;
  for (const slice of slices) {
    if (slice.pct <= 0) continue;
    let sweepAngle = (slice.pct / 100) * 2 * Math.PI;
    // Ensure non-open slices are visible even when tiny
    if (slice.label !== 'open' && sweepAngle < minAngle && sweepAngle > 0) {
      sweepAngle = minAngle;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweepAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    // Border between slices
    ctx.strokeStyle = '#0a0a08';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    startAngle += sweepAngle;
  }

  // Open space ring outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#3a3520';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center label
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${fillPct.toFixed(1)}%`, cx, cy - 6);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#8a7a40';
  ctx.fillText('filled', cx, cy + 10);

  // Update label
  const labelEl = document.getElementById('idle-pie-label');
  if (labelEl) {
    const mineralList = slices
      .filter(s => s.label !== 'open' && s.pct > 0.001)
      .map(s => s.pct >= 0.1 ? `${s.label} ${s.pct.toFixed(1)}%` : `${s.label} microcrystals`)
      .join(' · ');
    labelEl.textContent = mineralList || 'empty vug';
    // Agate detection!
    if (fillPct > 90) {
      const quartzPct = (mineralVolumes['quartz'] || 0) / vugVolume * 100;
      if (quartzPct > fillPct * 0.8) {
        labelEl.textContent = '🪨 AGATE — vug filled with quartz!';
        labelEl.style.color = '#f0c050';
      }
    }
  }
}

function idleUpdateStatus() {
  const el = document.getElementById('idle-step-counter');
  if (!el || !idleSim) return;
  const activeCrystals = idleSim.crystals.filter(c => c.active).length;
  const totalCrystals = idleSim.crystals.length;
  const yearsPerStep = timeScale * 10000;
  const totalYears = idleSim.step * yearsPerStep;
  const timeStr = totalYears >= 1e6 ? `${(totalYears / 1e6).toFixed(1)}My` : `${(totalYears / 1000).toFixed(0)}ky`;
  el.textContent = `Step ${idleSim.step} · ${activeCrystals}/${totalCrystals} crystals · ${idleSim.conditions.temperature.toFixed(0)}°C · ${timeStr}`;
}

function idleTogglePlay() {
  if (idleRunning && !idlePaused) return;

  if (!idleSim) {
    const scenario = document.getElementById('idle-scenario').value;
    idleSim = idleCreateSim(scenario);
    if (!idleSim) return;
    const logEl = document.getElementById('idle-log');
    logEl.innerHTML = '';
    idleAppendLog(logEl, `🌀 Zen Mode — endless crystal growth begins`, 'log-step');
    idleAppendLog(logEl, `   Starting at ${idleSim.conditions.temperature.toFixed(0)}°C, pH ${idleSim.conditions.fluid.pH.toFixed(1)}`, '');
    idleAppendLog(logEl, `   ${idleSim.conditions.fluid.describe()}`, '');
    idleAppendLog(logEl, `${'═'.repeat(60)}`, '');
  }

  idleRunning = true;
  idlePaused = false;
  idleLastTick = performance.now();

  document.getElementById('idle-play-btn').classList.add('active');
  document.getElementById('idle-play-btn').disabled = true;
  document.getElementById('idle-pause-btn').disabled = false;
  document.getElementById('idle-pause-btn').classList.remove('active');
  document.getElementById('idle-finish-btn').disabled = false;
  document.getElementById('idle-scenario').disabled = true;

  idleAnimFrame = requestAnimationFrame(idleTick);
}

function idleTogglePause() {
  if (!idleRunning) return;
  idlePaused = !idlePaused;

  const pauseBtn = document.getElementById('idle-pause-btn');
  const playBtn = document.getElementById('idle-play-btn');

  if (idlePaused) {
    pauseBtn.classList.add('active');
    pauseBtn.textContent = '⏸️ Paused';
    playBtn.disabled = false;
    playBtn.classList.remove('active');
    if (idleAnimFrame) cancelAnimationFrame(idleAnimFrame);
  } else {
    pauseBtn.classList.remove('active');
    pauseBtn.textContent = '⏸️ Pause';
    playBtn.disabled = true;
    playBtn.classList.add('active');
    idleLastTick = performance.now();
    idleAnimFrame = requestAnimationFrame(idleTick);
  }
}

function idleStop() {
  idleRunning = false;
  idlePaused = false;
  if (idleAnimFrame) {
    cancelAnimationFrame(idleAnimFrame);
    idleAnimFrame = null;
  }
}

function idleFinish() {
  idleStop();
  const logEl = document.getElementById('idle-log');

  if (idleSim) {
    idleAppendLog(logEl, '', '');
    idleAppendLog(logEl, `${'═'.repeat(60)}`, '');
    const summary = idleSim.format_summary();
    for (const line of summary.split('\n')) {
      idleAppendLog(logEl, line, '');
    }

    // Make finished game available to Record Player
    if (typeof groovePopulateCrystals === 'function') {
      groovePopulateCrystals();
    }
  }

  // Reset buttons
  document.getElementById('idle-play-btn').classList.remove('active');
  document.getElementById('idle-play-btn').disabled = false;
  document.getElementById('idle-play-btn').textContent = '▶️ New';
  document.getElementById('idle-pause-btn').disabled = true;
  document.getElementById('idle-pause-btn').classList.remove('active');
  document.getElementById('idle-pause-btn').textContent = '⏸️ Pause';
  document.getElementById('idle-finish-btn').disabled = true;
  document.getElementById('idle-scenario').disabled = false;

  idleSim = null;
}

function idleTick(now) {
  if (!idleRunning || idlePaused) return;

  const speed = IDLE_SPEED_MAP[idleSpeed];
  const interval = 1000 / speed;

  if (now - idleLastTick >= interval) {
    idleLastTick = now;
    idleDoStep();
  }

  idleAnimFrame = requestAnimationFrame(idleTick);
}

function idleDoStep() {
  if (!idleSim) return;

  // Apply stochastic drift before physics
  idleApplyDrift();

  // Run the physics step
  const prevCrystalCount = idleSim.crystals.length;
  const log = idleSim.run_step();

  // Record supersaturation history
  idleRecordHistory();

  // Log output
  const logEl = document.getElementById('idle-log');
  if (idleSim.step % 10 === 0 || log.length > 0) {
    if (idleSim.step % 25 === 0) {
      idleAppendLog(logEl, `── Step ${idleSim.step} │ T=${idleSim.conditions.temperature.toFixed(0)}°C │ pH=${idleSim.conditions.fluid.pH.toFixed(1)} │ ${idleSim.crystals.filter(c => c.active).length} crystals`, 'log-step');
    }
    for (const line of log) {
      let cls = '';
      if (line.includes('NUCLEATION')) cls = 'log-nucleation';
      else if (line.includes('DISSOLUTION') || line.includes('⬇')) cls = 'log-dissolution';
      else if (line.includes('▲')) cls = 'log-growth';
      idleAppendLog(logEl, line, cls);
    }
  }

  // Update chart and status
  idleDrawChart();
  idleDrawPie();
  idleUpdateStatus();
  if (typeof topoRender === 'function') topoRender();
}

function idleUpdateSpeed(val) {
  idleSpeed = parseInt(val);
  document.getElementById('idle-speed-val').textContent = IDLE_SPEED_MAP[idleSpeed] + ' step/s';
}

function idlePickScenario(val) {
  // Reset if not running
  if (!idleRunning) {
    idleSim = null;
    idleHistory = [];
    const logEl = document.getElementById('idle-log');
    logEl.innerHTML = '<div style="color:#5a4a30; font-style:italic; text-align:center; padding:1rem;">Press ▶️ Play to start the simulation.</div>';
    document.getElementById('idle-step-counter').textContent = 'Step 0 · 0 crystals · 0°C';
    document.getElementById('idle-play-btn').textContent = '▶️ Play';
    const canvas = document.getElementById('idle-chart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#070706';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// On initial page load, update the title-screen Load Game button state
// based on whether any individual crystals are in the collection.
(function titleInit() {
  try { refreshTitleLoadButton(); } catch (e) { /* ignore */ }
})();

