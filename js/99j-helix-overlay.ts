// ============================================================
// js/99j-helix-overlay.ts — Helix Record overlay for the 3D vug
// ============================================================
// Boss model (final, post-v5 feedback):
//
//   "this should be giving data as if it was written on the two
//   dimensional plane of the helicoid… the helicoid is a Cartesian
//   graph."
//
//   - The helicoid surface IS the chart paper. r is one axis
//     (parameter value, radial); θ is the other axis (also Y via the
//     spiral pitch). Dots live ON the surface, not floating at
//     arbitrary heights inside the cavity.
//   - Per parameter ONE trail (not one per ring). The trail snakes
//     along the helicoid surface as the sweep advances.
//   - At each sample step, Y is determined by the sweep angle:
//         Y_helix(θ) = (((θ mod 2πN) / 2πN) − 0.5) · ySpan
//     The chemistry at the ring closest to Y_helix is what gets
//     plotted. The "vertical = vugg height" rule still holds — at
//     each θ, the dot's Y matches a real vugg height, and the data
//     is the chemistry at that vugg height.
//   - Single turn over the full vugg height (N_TURNS = 1) — one
//     revolution of the sweep covers the cavity from bottom to top.
//     1/4 turn visible trail = ¼ of the cavity vertically.
//   - Primary = wall distance (literal mm, per-cell); secondaries =
//     per-ring chemistry, normalized into [0, R]. Both follow the
//     helicoid surface — primary's trail traces the cavity wall as
//     the sweep crosses cells; secondaries are stairstep arcs (one
//     plateau per ring crossed).
//   - Radar fade: trail fades from full opacity at the leading edge
//     to zero exactly 1/4 turn behind. Segments crossing the spiral
//     wrap (Y jumps from top back to bottom) are skipped to avoid
//     a teleport line through the middle of the cavity.

let _helixOverlayEnabled = true;
const _HELIX_N_TURNS = 1;   // one full revolution = bottom to top of cavity

// Parameters drawn as trails on the helicoid surface. `primary` (the
// wall distance) plots at literal world-mm; secondaries are
// per-ring chemistry normalized into [0, R]. `read` gets (sim, wall,
// ringIdx, cellIdx) so the primary can look up per-cell wall radius.
const _HELIX_CHEM_PARAMS: Array<{
  id: string,
  label: string,
  min: number,
  max: number,
  color: number,
  primary?: boolean,
  read: (sim: any, wall: any, ringIdx: number, cellIdx: number) => number | null | undefined,
}> = [
  { id: 'wall', label: 'wall distance', min: 0, max: 0, color: 0xffffff,
    primary: true,
    read: (sim, wall, i, c) => {
      if (!wall || !wall.rings) return null;
      const ring = wall.rings[i];
      if (!ring || !ring.length) return null;
      const cell = ring[c % ring.length];
      if (!cell) return null;
      return (cell.base_radius_mm || 0) + (cell.wall_depth || 0);
    } },
  { id: 'T',   label: 'temperature', min: 50,  max: 250,  color: 0xff5544,
    read: (s, w, i, c) => (s.ring_temperatures || [])[i] },
  { id: 'pH',  label: 'pH',          min: 2,   max: 12,   color: 0x9966ee,
    read: (s, w, i, c) => ((s.ring_fluids || [])[i] || {}).pH },
  { id: 'sal', label: 'salinity',    min: 0,   max: 30,   color: 0x44ccdd,
    read: (s, w, i, c) => ((s.ring_fluids || [])[i] || {}).salinity },
  { id: 'Ca',  label: 'Ca',          min: 0,   max: 1000, color: 0x66cc77,
    read: (s, w, i, c) => ((s.ring_fluids || [])[i] || {}).Ca },
  { id: 'Fe',  label: 'Fe',          min: 0,   max: 200,  color: 0xee9944,
    read: (s, w, i, c) => ((s.ring_fluids || [])[i] || {}).Fe },
  { id: 'Mn',  label: 'Mn',          min: 0,   max: 100,  color: 0xffdd55,
    read: (s, w, i, c) => ((s.ring_fluids || [])[i] || {}).Mn },
];

const _HELIX_FADE_ANGLE = Math.PI / 2;   // 1/4 turn — boss spec
const _HELIX_SAMPLE_STEP = Math.PI / 90;  // sample every 2° of sweep

function _helixDisposeGroup(g: any) {
  if (!g) return;
  g.traverse((obj: any) => {
    if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose && m.dispose());
      else if (obj.material.dispose) obj.material.dispose();
    }
  });
}

function _helixGeometry(wall: any): { R: number, ySpan: number, wallRadius: number } {
  let R: number;
  if (wall && typeof wall.max_seen_radius_mm === 'number' && wall.max_seen_radius_mm > 0) {
    R = wall.max_seen_radius_mm;
  } else if (wall && wall.vug_diameter_mm) {
    R = wall.vug_diameter_mm * 0.5;
  } else {
    R = 25;
  }
  const ySpan = (wall && wall.vug_diameter_mm) ? wall.vug_diameter_mm : 50;
  // wallRadius is used to convert cavity ring index → Y. For an
  // ellipsoidal cavity this is the equatorial radius. Falls back to R
  // when wall_state isn't built yet.
  const wallRadius = (wall && typeof wall.max_seen_radius_mm === 'number' && wall.max_seen_radius_mm > 0)
                   ? wall.max_seen_radius_mm
                   : R;
  return { R, ySpan, wallRadius };
}

// Ring index → world Y for the cavity build.
function _helixRingY(ringIndex: number, ringCount: number, wallRadius: number): number {
  const phiCav = Math.PI * (ringIndex + 0.5) / ringCount;
  return -wallRadius * Math.cos(phiCav);
}

// Inverse: world Y → ring index. Used when a sample on the helicoid
// surface lands at some Y and we need to know which ring's chemistry
// to read. Nearest-ring (no interpolation) for v6 — secondaries will
// stairstep across ring boundaries, which is honest given chemistry
// is per-ring in the current simulator.
function _helixYToRing(y: number, ringCount: number, wallRadius: number): number {
  if (wallRadius <= 0 || !isFinite(wallRadius)) return 0;
  const cosPhi = Math.max(-1, Math.min(1, -y / wallRadius));
  const phiCav = Math.acos(cosPhi);
  const ringFloat = (phiCav / Math.PI) * ringCount - 0.5;
  return Math.max(0, Math.min(ringCount - 1, Math.round(ringFloat)));
}

// ----- Main entry — called by _topoRenderThree once per frame -----

function _topoHelixOverlayDraw(state: any, sim: any, wall: any) {
  if (!state) return;
  if (!_helixOverlayEnabled) {
    if (state.helixGroup) {
      state.scene.remove(state.helixGroup);
      _helixDisposeGroup(state.helixGroup);
      state.helixGroup = null;
      state.helixSig = '';
    }
    if (_helixTrailGroup) {
      state.scene.remove(_helixTrailGroup);
      _helixDisposeGroup(_helixTrailGroup);
      _helixTrailGroup = null;
      _helixTrails = [];
      _helixTrailLines.length = 0;
    }
    state.helixContext = null;
    return;
  }
  if (!sim || !wall || !wall.ring_count) return;

  const { R, ySpan, wallRadius } = _helixGeometry(wall);

  const sig = `${R.toFixed(2)}|${ySpan.toFixed(2)}|${wall.ring_count}`;
  const sigChanged = state.helixSig !== sig;

  if (sigChanged) {
    if (state.helixGroup) {
      state.scene.remove(state.helixGroup);
      _helixDisposeGroup(state.helixGroup);
    }
    const group = new THREE.Group();
    group.name = 'helix-record';
    _helixAddSurface(group, R, ySpan);
    state.scene.add(group);
    state.helixGroup = group;
    state.helixSig = sig;
    _helixClearTrails();
  }

  _helixEnsureTrailInfra(state.scene, _HELIX_CHEM_PARAMS.length);

  state.helixContext = { sim, wall, R, ySpan, wallRadius, ringCount: wall.ring_count };
  _helixStartSpin();
}

// ----- Sub-builders ------------------------------------------------

function _helixAddSurface(group: any, R: number, ySpan: number) {
  const NU = 16;
  const NV = Math.max(120, _HELIX_N_TURNS * 120);
  const surfPositions = new Float32Array((NU + 1) * (NV + 1) * 3);
  const surfIndices: number[] = [];
  for (let i = 0; i <= NU; i++) {
    const ri = (i / NU) * R;
    for (let j = 0; j <= NV; j++) {
      const u = j / NV;
      const phi = u * _HELIX_N_TURNS * Math.PI * 2;
      const y = (u - 0.5) * ySpan;
      const vIdx = (i * (NV + 1) + j) * 3;
      surfPositions[vIdx + 0] = ri * Math.cos(phi);
      surfPositions[vIdx + 1] = y;
      surfPositions[vIdx + 2] = ri * Math.sin(phi);
    }
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (NV + 1) + j;
      const d = c + 1;
      surfIndices.push(a, c, b, b, c, d);
    }
  }
  const surfGeom = new THREE.BufferGeometry();
  surfGeom.setAttribute('position', new THREE.BufferAttribute(surfPositions, 3));
  surfGeom.setIndex(surfIndices);
  surfGeom.computeVertexNormals();
  const surfMat = new THREE.MeshBasicMaterial({
    color: 0xf0d5a0,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(surfGeom, surfMat));
}

// =========== TRAIL STATE (radar sweep + fading trails) ===================
// One buffer per parameter (no per-ring nesting any more — each
// parameter has a single trail that snakes along the helicoid).

let _helixTrails: Array<Array<{ angle: number, r: number, y: number }>> = [];
let _helixTrailGroup: any = null;
const _helixTrailLines: any[] = [];

const _TRAIL_MAX_VERTS_PER_PARAM = 512;   // per-param trail is ~45 samples
                                          // × 2 (line-segment expansion) = ~90;
                                          // budget is huge headroom.

function _helixClearTrails() {
  for (let p = 0; p < _helixTrails.length; p++) _helixTrails[p] = [];
}

function _helixEnsureTrailInfra(scene: any, nParams: number) {
  const sized = _helixTrailGroup && _helixTrails.length === nParams;
  if (sized) return;

  if (_helixTrailGroup) {
    scene.remove(_helixTrailGroup);
    _helixDisposeGroup(_helixTrailGroup);
  }
  _helixTrailGroup = new THREE.Group();
  _helixTrailGroup.name = 'helix-trails';
  scene.add(_helixTrailGroup);

  _helixTrails = [];
  _helixTrailLines.length = 0;

  for (let p = 0; p < nParams; p++) {
    _helixTrails[p] = [];
    const positions = new Float32Array(_TRAIL_MAX_VERTS_PER_PARAM * 3);
    const colors = new Float32Array(_TRAIL_MAX_VERTS_PER_PARAM * 4);
    const geom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(colors, 4);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute('position', posAttr);
    geom.setAttribute('color', colAttr);
    geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(geom, mat);
    _helixTrailGroup.add(lines);
    _helixTrailLines.push(lines);
  }
}

// Per-frame trail update. Single trail per parameter — for each
// parameter, at each sample step, plot one dot on the helicoid
// surface at (r = value, Y = Y_helix(sweep), θ = sweep).
function _helixUpdateTrails(sim: any, wall: any, R: number, ySpan: number, wallRadius: number, ringCount: number) {
  if (!sim || !wall || !ringCount) return;
  const nParams = _HELIX_CHEM_PARAMS.length;
  if (!_helixTrailGroup || _helixTrails.length !== nParams) return;

  const sweep = _helixSweepAngle;
  const TWO_PI = Math.PI * 2;
  const TURN_LEN = TWO_PI * _HELIX_N_TURNS;
  const sweepInTurn = ((sweep % TURN_LEN) + TURN_LEN) % TURN_LEN;
  const yHelix = (sweepInTurn / TURN_LEN - 0.5) * ySpan;
  const sweepWrapped = ((sweep % TWO_PI) + TWO_PI) % TWO_PI;
  const ringIdx = _helixYToRing(yHelix, ringCount, wallRadius);
  const ringArr = (wall.rings && wall.rings[ringIdx]) || null;
  const N = ringArr && ringArr.length ? ringArr.length : 0;
  const cellIdx = N > 0 ? Math.floor(sweepWrapped / (TWO_PI / N)) % N : 0;

  for (let p = 0; p < nParams; p++) {
    const param = _HELIX_CHEM_PARAMS[p];
    const raw = param.read(sim, wall, ringIdx, cellIdx);
    if (typeof raw !== 'number' || isNaN(raw)) continue;
    let r: number;
    if (param.primary) {
      r = raw;
    } else {
      const norm = Math.max(0, Math.min(1, (raw - param.min) / (param.max - param.min)));
      r = norm * R;
    }
    const trail = _helixTrails[p];
    const last = trail[trail.length - 1];
    if (!last || (sweep - last.angle) > _HELIX_SAMPLE_STEP) {
      trail.push({ angle: sweep, r, y: yHelix });
    } else {
      last.r = r;
      last.y = yHelix;
    }
    while (trail.length && (sweep - trail[0].angle) > _HELIX_FADE_ANGLE) {
      trail.shift();
    }

    // Rewrite the LineSegments buffer for this parameter.
    const lines = _helixTrailLines[p];
    if (!lines) continue;
    const posArr = lines.geometry.attributes.position.array as Float32Array;
    const colArr = lines.geometry.attributes.color.array as Float32Array;
    const cr = ((param.color >> 16) & 0xff) / 255;
    const cg = ((param.color >> 8) & 0xff) / 255;
    const cb = (param.color & 0xff) / 255;

    let v = 0;
    for (let k = 0; k < trail.length - 1; k++) {
      if (v + 2 > _TRAIL_MAX_VERTS_PER_PARAM) break;
      const a = trail[k];
      const b = trail[k + 1];
      // Skip segments that cross the helicoid wrap (one turn boundary)
      // — the trail would teleport from Y = +ySpan/2 back down to
      // Y = -ySpan/2 across that segment, which paints an awkward
      // diagonal through the cavity centre. Just drop the segment.
      const turnA = Math.floor(a.angle / TURN_LEN);
      const turnB = Math.floor(b.angle / TURN_LEN);
      if (turnA !== turnB) continue;

      const ageA = (sweep - a.angle) / _HELIX_FADE_ANGLE;
      const ageB = (sweep - b.angle) / _HELIX_FADE_ANGLE;
      const aA = Math.max(0, 1 - ageA);
      const aB = Math.max(0, 1 - ageB);

      posArr[v * 3 + 0] = a.r * Math.cos(a.angle);
      posArr[v * 3 + 1] = a.y;
      posArr[v * 3 + 2] = a.r * Math.sin(a.angle);
      colArr[v * 4 + 0] = cr; colArr[v * 4 + 1] = cg;
      colArr[v * 4 + 2] = cb; colArr[v * 4 + 3] = aA;
      v++;

      posArr[v * 3 + 0] = b.r * Math.cos(b.angle);
      posArr[v * 3 + 1] = b.y;
      posArr[v * 3 + 2] = b.r * Math.sin(b.angle);
      colArr[v * 4 + 0] = cr; colArr[v * 4 + 1] = cg;
      colArr[v * 4 + 2] = cb; colArr[v * 4 + 3] = aB;
      v++;
    }

    lines.geometry.setDrawRange(0, v);
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;
  }
}

// =========== SPINNING ==========================================

let _helixSpinRAF: number | null = null;
let _helixSpinPrevTime = 0;
let _helixSweepAngle = 0;
const _HELIX_RPM = 40;

function _helixStartSpin() {
  if (_helixSpinRAF != null) return;
  _helixSpinPrevTime = performance.now();
  _helixSpinRAF = requestAnimationFrame(_helixSpinTick);
}

function _helixSpinTick(now: number) {
  const state = (typeof _topoThreeState !== 'undefined') ? _topoThreeState : null;
  if (!_helixOverlayEnabled || !state || !state.helixGroup) {
    _helixSpinRAF = null;
    return;
  }
  const c3 = document.getElementById('topo-canvas-three') as HTMLCanvasElement | null;
  const visible = c3 && c3.offsetParent != null && c3.style.display !== 'none';
  if (visible) {
    const dt = Math.max(0, Math.min(0.1, (now - _helixSpinPrevTime) / 1000));
    const omega = (_HELIX_RPM / 60) * 2 * Math.PI;
    _helixSweepAngle += dt * omega;
    if (state.helixContext) {
      const c = state.helixContext;
      _helixUpdateTrails(c.sim, c.wall, c.R, c.ySpan, c.wallRadius, c.ringCount);
    }
    if (state.renderer && state.scene && state.camera) {
      state.renderer.render(state.scene, state.camera);
    }
  }
  _helixSpinPrevTime = now;
  _helixSpinRAF = requestAnimationFrame(_helixSpinTick);
}

function helixOverlayToggle() {
  _helixOverlayEnabled = !_helixOverlayEnabled;
  if (typeof topoRender === 'function') topoRender();
}
