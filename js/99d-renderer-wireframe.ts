// ============================================================
// js/99d-renderer-wireframe.ts — Wireframe crystal renderer
// ============================================================
// _seededRand / _seededGaussian / _orthonormalBasis / _convexHull2D / _druzyClusterCount geometry helpers + _renderCrystalWireframe / _renderWireframeInstance painters.
//
// Phase B12 of PROPOSAL-MODULAR-REFACTOR — split renderer.

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
