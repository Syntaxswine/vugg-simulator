// tests-js/specimen-view.test.ts — R6 "photograph the specimen" (2026-09-06).
//
// Visual-realism review §5 R6 + decisions D3 (the specimen view BESIDE the process orb)
// and D5 (restrained studio in the specimen view). The pixels are measured live by
// tools/photo-rig.mjs (--view specimen, manifest.gl.specimen). What is testable headless
// is the CONTRACT: the rag noise (bit-exact uint hash, periodic, bounded), the cut in
// world space, the rind built from the cavity surface with its source attribute, the
// fracture band meeting both edges, entry/exit of the view (objects, uniforms, fog, mood,
// wall, culling by anchor, the receipt), the per-frame resync, the wall-display
// composition, the exposure stops, the wider shadow frustum, the post-pass decision and
// the frame renderer's two paths.
import { afterEach, describe, expect, it } from 'vitest';

declare const THREE: any;
declare const SPECIMEN_RAG_FRACTION: number;
declare const SPECIMEN_RAG_LOBES: number;
declare const SPECIMEN_RIND_FRACTION: number;
declare const SPECIMEN_RIND_MIN_MM: number;
declare const SPECIMEN_RIND_MAX_MM: number;
declare const SPECIMEN_RIND_KNOB: number;
declare const SPECIMEN_RIND_WART: number;
declare const SPECIMEN_SHADOW_BOUNDS_R0: number;
declare const SPECIMEN_POSE: any;
declare const SPECIMEN_EV_STOPS: number[];
declare const SPECIMEN_GRAIN: number;
declare const SPECIMEN_VIGNETTE: number;
declare const SPECIMEN_FOG_NEAR_R0: number;
declare const SPECIMEN_FOG_FAR_R0: number;
declare const SPECIMEN_CUT_GLSL_PARS: string;
declare const LIGHTING_MOODS: any;
declare const LIGHTING_SHADOW_BOUNDS_R0: number;
declare const _specimenHash: any;
declare const _specimenRagNoise: any;
declare const _specimenCutFromNormal: any;
declare const _specimenCutSigned: any;
declare const _specimenCutAway: any;
declare const _specimenCutUniforms: any;
declare const _specimenCutInject: any;
declare const _specimenBuildRindGeometry: any;
declare const _specimenBuildFractureGeometry: any;
declare const _specimenRindColour: any;
declare const _topoSpecimenEnter: any;
declare const _topoSpecimenExit: any;
declare const _topoSpecimenSyncFrame: any;
declare const _topoSpecimenPostAllowed: any;
declare const _topoSpecimenPostEnsure: any;
declare const _topoRenderFrame: any;
declare const _topoApplyWallDisplay: any;
declare const _topoLightingExposure: any;
declare const _topoLightingApplyInsideMode: any;
declare const _topoLightingSyncKey: any;
declare const _topoLightingInstallRig: any;
declare const _topoInstallLightingRig: any;
declare const _topoOpticsInstallRig: any;

// ---- fixtures -------------------------------------------------------------------
function fakeRenderer(extra: Record<string, any> = {}) {
  const log: any[] = [];
  return {
    log,
    toneMapping: THREE.NoToneMapping, toneMappingExposure: 1, shadowMap: { enabled: false, type: null },
    capabilities: { isWebGL2: true }, extensions: { has: (_n: string) => true },
    getDrawingBufferSize(v: any) { return v.set(640, 480); },
    setRenderTarget(rt: any) { log.push(['target', rt]); },
    render(scene: any, _camera: any) { log.push(['render', scene]); },
    ...extra,
  };
}
// A closed cavity shaped like the shipped one: positions/normals/uv/colour, indexed.
function sphereCavity(r = 40) {
  const g = new THREE.SphereGeometry(r, 24, 16);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = 0.82; col[i * 3 + 1] = 0.80; col[i * 3 + 2] = 0.74; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function fakeState(overrides: Record<string, any> = {}) {
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const directional = new THREE.DirectionalLight(0xffe6c0, 0.9);
  scene.add(ambient); scene.add(directional); scene.add(directional.target);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
  camera.position.set(0, 0, 600); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const cavity = new THREE.Mesh(sphereCavity(40), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0.40 }));
  scene.add(cavity);
  const crystals = new THREE.Group();
  scene.add(crystals);
  const clipUniforms = { uVugRadius: { value: 1e6 }, ..._specimenCutUniforms() };
  return {
    renderer: fakeRenderer(), scene, camera, cavity, crystals, ambient, directional, clipUniforms,
    insideMode: false, wallDisplay: 0, cavitySig: 'cav-a', crystalsSig: 'cry-a', cameraR0: 40,
    ...overrides,
  };
}
function body(x: number, y: number, z: number, tag: Record<string, any> = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhysicalMaterial());
  m.position.set(x, y, z);
  m.userData = { crystal_id: Math.round(x * 7 + y * 3 + z), mineral: 'quartz', ...tag };
  return m;
}

// The bundle (and THREE) arrive in setup's beforeAll — capture at patch time.
let patchedFrom: any = null;
afterEach(() => { if (patchedFrom) { (globalThis as any).THREE = patchedFrom; patchedFrom = null; } });
function withPmrem() {
  patchedFrom = (globalThis as any).THREE;
  (globalThis as any).THREE = {
    ...patchedFrom,
    PMREMGenerator: class { fromScene() { return { texture: { dispose() {} } }; } dispose() {} },
  };
}

// ---- the rag noise -------------------------------------------------------------
describe('R6 rag noise: one uint hash on both sides', () => {
  it('the JS hash is the uint32 arithmetic the GLSL runs (BigInt reference)', () => {
    const M = 1n << 32n;
    const ref = (i: number, seed: number) => {
      let h = (BigInt(i) * 374761393n + BigInt(seed) * 668265263n) % M;
      h = ((h ^ (h >> 13n)) * 1274126177n) % M;
      h = h ^ (h >> 16n);
      return Number(h & 16777215n) / 16777216;
    };
    for (const [i, seed] of [[0, 0], [1, 42], [23, 7919], [17, 15838], [5, 2147483647], [11, 123456789]] as number[][]) {
      expect(_specimenHash(i, seed)).toBe(ref(i, seed));
    }
  });

  it('is bounded, periodic in θ, continuous, and seed-dependent', () => {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 720; k++) {
      const th = (k / 720) * 2 * Math.PI;
      const v = _specimenRagNoise(th, 42);
      lo = Math.min(lo, v); hi = Math.max(hi, v);
      expect(_specimenRagNoise(th + 2 * Math.PI, 42)).toBeCloseTo(v, 9);
      expect(Math.abs(_specimenRagNoise(th + 1e-4, 42) - v)).toBeLessThan(0.01);
    }
    expect(lo).toBeGreaterThanOrEqual(-1);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.5);   // a real rag, not a flat line
    let differ = 0;
    for (let k = 0; k < 64; k++) if (Math.abs(_specimenRagNoise(k * 0.1, 1) - _specimenRagNoise(k * 0.1, 2)) > 1e-6) differ++;
    expect(differ).toBeGreaterThan(50);
  });

  it('the GLSL carries the same constants as the CPU mirror', () => {
    for (const c of ['374761393u', '668265263u', '1274126177u', '16777215u', `${SPECIMEN_RAG_LOBES} << o`, '7919', 'specimenCutAway']) {
      expect(SPECIMEN_CUT_GLSL_PARS.includes(c), c).toBe(true);
    }
    expect(SPECIMEN_RAG_LOBES).toBe(6);
  });
});

// ---- the cut in world space ----------------------------------------------------
describe('R6 cut: the far half is kept, the rag wanders the edge', () => {
  it('builds an orthonormal frame from the camera direction', () => {
    const cut = _specimenCutFromNormal(0, 0, -1, 5, 42);
    expect(cut.n.length()).toBeCloseTo(1, 9);
    expect(cut.u.dot(cut.n)).toBeCloseTo(0, 9);
    expect(cut.v.dot(cut.n)).toBeCloseTo(0, 9);
    expect(cut.u.dot(cut.v)).toBeCloseTo(0, 9);
    expect(cut.amp).toBe(5);
    expect(cut.seed).toBe(42);
  });

  it('with no rag the near half (toward the camera) is cut away and the far half kept', () => {
    const cut = _specimenCutFromNormal(0, 0, -1, 0, 1);
    expect(_specimenCutAway(cut, 0, 0, 30)).toBe(true);     // toward the camera at +z
    expect(_specimenCutAway(cut, 10, -5, -30)).toBe(false); // the far wall
    expect(_specimenCutSigned(cut, 0, 0, -12)).toBeCloseTo(12, 9);
  });

  it('the rag moves the edge by at most the amplitude, on both sides of the plane', () => {
    const cut = _specimenCutFromNormal(0, 0, -1, 4, 42);
    let away = 0, kept = 0;
    for (let k = 0; k < 360; k++) {
      const th = k * Math.PI / 180;
      const x = 40 * Math.cos(th), y = 40 * Math.sin(th);
      if (_specimenCutAway(cut, x, y, 0)) away++; else kept++;          // on the plane
      expect(_specimenCutAway(cut, x, y, 4.01)).toBe(true);              // beyond the rag: always away
      expect(_specimenCutAway(cut, x, y, -4.01)).toBe(false);            // beyond the rag: always kept
    }
    expect(away).toBeGreaterThan(30);
    expect(kept).toBeGreaterThan(30);
  });
});

// ---- the rind and the fracture face --------------------------------------------
describe('R6 rind: the cavity surface offset outward, discarded by its source point', () => {
  it('offsets every vertex outward by rind·(1 ± knob) and keeps the source position as an attribute', () => {
    const cav = sphereCavity(40);
    const rind = _specimenBuildRindGeometry(cav, 6, 40, 42);
    const pos = rind.geometry.attributes.position, src = rind.geometry.attributes.aSpecimenSrc;
    expect(pos.count).toBe(cav.attributes.position.count);
    expect(rind.geometry.index.count).toBe(cav.index.count);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
      expect(r).toBeGreaterThanOrEqual(40 + 6 * (1 - SPECIMEN_RIND_KNOB - SPECIMEN_RIND_WART) - 1e-6);
      expect(r).toBeLessThanOrEqual(40 + 6 * (1 + SPECIMEN_RIND_KNOB + SPECIMEN_RIND_WART) + 1e-6);
      expect(src.getX(i)).toBeCloseTo(cav.attributes.position.getX(i), 6);
      expect(src.getY(i)).toBeCloseTo(cav.attributes.position.getY(i), 6);
      expect(src.getZ(i)).toBeCloseTo(cav.attributes.position.getZ(i), 6);
    }
    // the knob is a real modulation: not every vertex at the same thickness
    const radii = new Set<number>();
    for (let i = 0; i < pos.count; i += 37) radii.add(+Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)).toFixed(2));
    expect(radii.size).toBeGreaterThan(5);
    expect(rind.geometry.attributes.uv).toBeTruthy();
  });

  it('the fracture band: one quad per crossed triangle, exact at the inner edge, coloured pale→brown', () => {
    const cav = sphereCavity(40);
    const cut = _specimenCutFromNormal(0, 0, -1, 0, 1);   // the plane z = 0
    const rind = _specimenBuildRindGeometry(cav, 6, 40, 42);
    const frac = _specimenBuildFractureGeometry(cav, rind.outer, cut, 6, _specimenRindColour(), 42);
    // independent count of triangles the plane crosses
    const P = cav.attributes.position, I = cav.index;
    let crossing = 0;
    for (let t = 0; t < I.count / 3; t++) {
      // the builder's convention: s = dot(n, p) = −z; a vertex exactly on the cut is KEPT (s → +ε)
      const ss = [0, 1, 2].map(k => (-P.getZ(I.getX(t * 3 + k))) || 1e-9);
      if (!((ss[0] < 0) === (ss[1] < 0) && (ss[1] < 0) === (ss[2] < 0))) crossing++;
    }
    expect(crossing).toBeGreaterThan(10);
    expect(frac.quads).toBe(crossing);
    const fp = frac.geometry.attributes.position, fc = frac.geometry.attributes.color;
    expect(frac.geometry.index.count).toBe(frac.quads * 18);   // 3 rows × 2 triangles × 3 corners
    expect(fp.count).toBeLessThan(frac.quads * 18);              // shared crossing points merged
    // the inner row lies ON the cut and on the wall; the outer row on the rind
    let innerOnPlane = 0, innerOnWall = 0, outerBeyond = 0, innerVerts = 0, outerVerts = 0;
    for (let i = 0; i < fp.count; i++) {
      const r = Math.hypot(fp.getX(i), fp.getY(i), fp.getZ(i));
      // a crossing point lies on a chord of the sphere: within the 24-segment sagitta (0.34 mm) of r
      if (r < 40.05) { innerVerts++; if (Math.abs(fp.getZ(i)) < 1e-4) innerOnPlane++; if (Math.abs(r - 40) < 0.4) innerOnWall++; }
      if (r > 40 + 6 * (1 - SPECIMEN_RIND_KNOB - SPECIMEN_RIND_WART) - 0.05) { outerVerts++; outerBeyond++; }
    }
    expect(innerVerts).toBeGreaterThan(0);
    expect(innerOnPlane).toBe(innerVerts);
    expect(innerOnWall).toBe(innerVerts);
    expect(outerVerts).toBeGreaterThan(0);
    // colour: the innermost vertices are paler (lifted toward white) than the outermost (the rind brown)
    let innerL = 0, innerN = 0, outerL = 0, outerN = 0;
    for (let i = 0; i < fp.count; i++) {
      const r = Math.hypot(fp.getX(i), fp.getY(i), fp.getZ(i));
      const L = 0.2126 * fc.getX(i) + 0.7152 * fc.getY(i) + 0.0722 * fc.getZ(i);
      if (r < 40.05) { innerL += L; innerN++; } else if (r > 44) { outerL += L; outerN++; }
    }
    expect(innerL / innerN).toBeGreaterThan(outerL / outerN + 0.15);
  });

  it('with a rag, the inner edge still satisfies the cut within the linear-interpolation tolerance', () => {
    // triangles ~2.6 mm wide, the shipped 16×120 wall's scale at r0 = 50 (the linear crossing
    // point deviates from the ragged iso-curve by curvature × triangle², so this is a mesh-scale claim)
    const cav = new THREE.SphereGeometry(40, 96, 48);
    const cut = _specimenCutFromNormal(0.2, -0.1, -1, 40 * SPECIMEN_RAG_FRACTION, 42);
    const rind = _specimenBuildRindGeometry(cav, 6, 40, 42);
    const frac = _specimenBuildFractureGeometry(cav, rind.outer, cut, 6, _specimenRindColour(), 42);
    expect(frac.quads).toBeGreaterThan(10);
    const fp = frac.geometry.attributes.position;
    let worst = 0;
    for (let i = 0; i < fp.count; i++) {
      const r = Math.hypot(fp.getX(i), fp.getY(i), fp.getZ(i));
      if (r > 40.05) continue;
      worst = Math.max(worst, Math.abs(_specimenCutSigned(cut, fp.getX(i), fp.getY(i), fp.getZ(i))));
    }
    expect(worst).toBeLessThan(cut.amp * 0.03);
  });
});

// ---- entry, exit, resync ----------------------------------------------------------
describe('R6 specimen view: entry builds the stage, exit restores the process view', () => {
  it('enters: uniforms on, cut faces the camera, objects in the scene, fog, studio mood, opaque wall', () => {
    withPmrem();
    const state = fakeState();
    _topoInstallLightingRig(state, 'cave');
    _topoOpticsInstallRig(state);
    expect(state.opticsRig.active).toBe('alpha');   // the orb's translucent shell: no backdrop
    const sp = _topoSpecimenEnter(state);
    expect(sp).toBe(state.specimen);
    expect(state.clipUniforms.uSpecimenCut.value).toBe(1);
    // camera at +z looks toward −z; the cut pulls toward −y so the half opens upward (851 frame 1)
    const nn = state.clipUniforms.uSpecimenCutN.value;
    expect(nn.z).toBeCloseTo(-1 / Math.hypot(1, 0.8), 6);
    expect(nn.y).toBeCloseTo(-0.8 / Math.hypot(1, 0.8), 6);
    expect(_topoSpecimenEnter(fakeState(), { tilt: 0 }).cut.n.z).toBeCloseTo(-1, 6);
    expect(state.clipUniforms.uSpecimenCutAmp.value).toBeCloseTo(40 * SPECIMEN_RAG_FRACTION, 6);
    expect(sp.rind_mm).toBeCloseTo(Math.max(SPECIMEN_RIND_MIN_MM, Math.min(SPECIMEN_RIND_MAX_MM, 40 * SPECIMEN_RIND_FRACTION)), 6);
    expect(sp.rind && sp.rind.parent).toBe(sp.group);
    expect(sp.fracture && sp.fracture.parent).toBe(sp.group);
    expect(sp.cloth && sp.cloth.parent).toBe(sp.group);
    expect(sp.cyclo && sp.cyclo.parent).toBe(sp.group);
    expect(sp.group.parent).toBe(state.scene);
    expect(sp.rind.castShadow).toBe(true);
    expect(sp.rind.customDepthMaterial).toBeTruthy();
    expect(sp.cloth.receiveShadow).toBe(true);
    expect(sp.cloth.position.y).toBeLessThan(-40);   // under the half
    expect(state.scene.fog).toBeTruthy();
    expect(state.scene.fog.near).toBeCloseTo(40 * SPECIMEN_FOG_NEAR_R0, 6);
    expect(state.scene.fog.far).toBeCloseTo(40 * SPECIMEN_FOG_FAR_R0, 6);
    expect(state.lightingRig.mood).toBe('studio');
    const mat = state.cavity.material;
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.transparent).toBe(false);
    expect(mat.opacity).toBe(1);
    // the opaque wall is the backdrop glass needs (R2): the active tier comes back
    expect(state.opticsRig.backdrop).toBe(true);
    expect(state.opticsRig.active).toBe('transmission');
    expect(state.specimenRig.on).toBe(true);
    expect(state.specimenRig.mood).toBe('studio');
    expect(state.specimenRig.fracture_quads).toBeGreaterThan(0);
  });

  it('culls rim bodies whole by their wall anchor, leaves swaths to the shader (with a depth material), never re-shows what others hid', () => {
    withPmrem();
    const state = fakeState();
    const far = body(5, 3, -30), near = body(-4, 2, 30), hiddenByOthers = body(1, 1, 25);
    hiddenByOthers.visible = false;
    const swath = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 6, 4), new THREE.MeshPhysicalMaterial(), 4);
    swath.userData = { crystal_id: 9, mineral: 'calcite', surfaceGrowth: true };
    const lining = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial());
    lining.position.set(-4, 2, 30); // a body here is culled; a lining must be cut per fragment
    lining.userData = { crystal_id: 10, mineral: 'chalcedony', surfaceGrowth: true, surfaceLining: true };
    state.crystals.add(lining);
    state.crystals.add(far); state.crystals.add(near); state.crystals.add(hiddenByOthers); state.crystals.add(swath);
    const sp = _topoSpecimenEnter(state);
    expect(far.visible).toBe(true);
    expect(near.visible).toBe(false);
    expect(sp.hidden.has(near)).toBe(true);
    expect(sp.hidden.has(hiddenByOthers)).toBe(false);
    expect(swath.visible).toBe(true);
    expect(swath.customDepthMaterial).toBeTruthy();
    expect(lining.visible).toBe(true);
    expect(lining.customDepthMaterial).toBeTruthy();
    expect(state.specimenRig.culled).toBe(1);
    expect(state.specimenRig.kept).toBe(1);
    _topoSpecimenExit(state);
    expect(near.visible).toBe(true);
    expect(hiddenByOthers.visible).toBe(false);
    expect(swath.customDepthMaterial).toBeFalsy();
    expect(lining.customDepthMaterial).toBeFalsy();
  });

  it('exits: objects gone, uniforms off, fog restored, cave mood, the orb\'s translucent shell back', () => {
    withPmrem();
    const state = fakeState();
    _topoInstallLightingRig(state, 'cave');
    _topoOpticsInstallRig(state);
    const sp = _topoSpecimenEnter(state);
    const group = sp.group;
    expect(_topoSpecimenExit(state)).toBe(true);
    expect(state.specimen).toBeNull();
    expect(group.parent).toBeNull();
    expect(state.scene.children.includes(group)).toBe(false);
    expect(state.clipUniforms.uSpecimenCut.value).toBe(0);
    expect(state.scene.fog).toBeNull();
    expect(state.lightingRig.mood).toBe('cave');
    const mat = state.cavity.material;
    expect(mat.side).toBe(THREE.BackSide);
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBe(0.40);
    expect(state.opticsRig.active).toBe('alpha');
    expect(state.specimenRig.on).toBe(false);
    expect(_topoSpecimenExit(state)).toBe(false);   // idempotent
  });

  it('resyncs per frame: a new crystal set is re-culled, a new cavity rebuilds the rind, the water sheet stays off', () => {
    withPmrem();
    const state = fakeState();
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
    water.visible = true; state.waterInterface = water; state.scene.add(water);
    const sp = _topoSpecimenEnter(state);
    expect(water.visible).toBe(false);
    const firstRind = sp.rind;
    const late = body(0, 0, 32);
    state.crystals.add(late);
    _topoSpecimenSyncFrame(state);
    expect(late.visible).toBe(true);            // same crystal signature: nothing re-culled
    state.crystalsSig = 'cry-b';
    water.visible = true;
    _topoSpecimenSyncFrame(state);
    expect(late.visible).toBe(false);
    expect(water.visible).toBe(false);
    expect(sp.rind).toBe(firstRind);
    state.cavitySig = 'cav-b';
    _topoSpecimenSyncFrame(state);
    expect(sp.rind).not.toBe(firstRind);
    expect(sp.rind.parent).toBe(sp.group);
    expect(firstRind.parent).toBeNull();
  });

  it('r0, seed and the cut normal can be supplied (the rig, tests); the pose is a photographer\'s', () => {
    withPmrem();
    const state = fakeState({ cameraR0: undefined });
    const sp = _topoSpecimenEnter(state, { r0: 80, seed: 7, normal: [0, -1, 0] });
    expect(sp.r0).toBe(80);
    expect(sp.cut.seed).toBe(7);
    expect(state.clipUniforms.uSpecimenCutN.value.y).toBeCloseTo(-1, 9);
    expect(sp.rind_mm).toBeCloseTo(Math.min(SPECIMEN_RIND_MAX_MM, 80 * SPECIMEN_RIND_FRACTION), 6);
    expect(SPECIMEN_POSE.tiltX).toBeLessThan(0);     // negative pitch = viewer above the specimen
    expect(SPECIMEN_POSE.zoom).toBeGreaterThan(1);
  });
});

// ---- composition with the wall toggle, exposure, shadows -------------------------
describe('R6 composition: wall toggle, exposure stops, shadow frustum', () => {
  it('the wall is opaque rock in modes 0 and 1; mode 2 hides the wall and the stage together', () => {
    withPmrem();
    const state = fakeState();
    const sp = _topoSpecimenEnter(state);
    for (const mode of [0, 1]) {
      state.wallDisplay = mode;
      _topoApplyWallDisplay(state);
      expect(state.cavity.visible).toBe(true);
      expect(sp.group.visible).toBe(true);
      expect(state.cavity.material.side).toBe(THREE.DoubleSide);
      expect(state.cavity.material.transparent).toBe(false);
    }
    state.wallDisplay = 2;
    _topoApplyWallDisplay(state);
    expect(state.cavity.visible).toBe(false);
    expect(sp.group.visible).toBe(false);
    state.wallDisplay = 0;
    _topoApplyWallDisplay(state);
    expect(state.cavity.visible).toBe(true);
    expect(sp.group.visible).toBe(true);
    // inside the cavity the composition is unchanged: opaque, two-sided
    state.insideMode = true;
    _topoApplyWallDisplay(state);
    expect(state.cavity.material.side).toBe(THREE.DoubleSide);
    expect(state.cavity.material.opacity).toBe(1);
  });

  it('exposure = mood base × inside factor × 2^EV; the stops are ½-EV around zero', () => {
    const spec = LIGHTING_MOODS.studio;
    const state: any = { specimen: { ev: 0 } };
    expect(_topoLightingExposure(state, spec, false)).toBeCloseTo(spec.exposure, 9);
    state.specimen.ev = 1;
    expect(_topoLightingExposure(state, spec, false)).toBeCloseTo(spec.exposure * 2, 9);
    state.specimen.ev = -0.5;
    expect(_topoLightingExposure(state, spec, true)).toBeCloseTo(spec.exposure * spec.insideExposure * Math.SQRT1_2, 9);
    expect(_topoLightingExposure({ specimen: null }, LIGHTING_MOODS.cave, true)).toBeCloseTo(LIGHTING_MOODS.cave.exposure * LIGHTING_MOODS.cave.insideExposure, 9);
    expect(SPECIMEN_EV_STOPS).toEqual([-1, -0.5, 0, 0.5, 1]);
    // the live path: the inside/outside rule re-applies the EV
    withPmrem();
    const live = fakeState();
    _topoInstallLightingRig(live, 'studio');
    live.specimen = { ev: 1 };
    _topoLightingApplyInsideMode(live, false);
    expect(live.renderer.toneMappingExposure).toBeCloseTo(spec.exposure * 2, 9);
    expect(live.lightingRig.exposure).toBeCloseTo(spec.exposure * 2, 9);
  });

  it('the key\'s shadow frustum widens for the cloth while the view is on', () => {
    const state = fakeState();
    state.directional.castShadow = true;
    _topoLightingSyncKey(state, 0, 0, 0, 40);
    expect(state.directional.shadow.camera.right).toBeCloseTo(40 * LIGHTING_SHADOW_BOUNDS_R0, 6);
    state.specimen = { ev: 0 };
    _topoLightingSyncKey(state, 0, 0, 0, 40);
    expect(state.directional.shadow.camera.right).toBeCloseTo(40 * SPECIMEN_SHADOW_BOUNDS_R0, 6);
    expect(SPECIMEN_SHADOW_BOUNDS_R0).toBeGreaterThan(LIGHTING_SHADOW_BOUNDS_R0);
  });
});

// ---- the post pass and the frame renderer -----------------------------------------
describe('R6 post pass: an honest decision and the two draw paths', () => {
  it('refuses without the lighting rig, without WebGL2, without float colour buffers; accepts otherwise', () => {
    const noRig = fakeState();
    expect(_topoSpecimenPostAllowed(noRig).ok).toBe(false);
    expect(_topoSpecimenPostAllowed(noRig).reason).toMatch(/lighting rig/);
    withPmrem();
    const gl1 = fakeState({ renderer: fakeRenderer({ capabilities: { isWebGL2: false } }) });
    _topoInstallLightingRig(gl1, 'studio');
    expect(_topoSpecimenPostAllowed(gl1).reason).toMatch(/WebGL1/);
    const noFloat = fakeState({ renderer: fakeRenderer({ extensions: { has: () => false } }) });
    _topoInstallLightingRig(noFloat, 'studio');
    expect(_topoSpecimenPostAllowed(noFloat).reason).toMatch(/EXT_color_buffer_float/);
    const ok = fakeState();
    _topoInstallLightingRig(ok, 'studio');
    expect(_topoSpecimenPostAllowed(ok)).toEqual({ ok: true, reason: null });
  });

  it('draws directly in the process view; scene → HDR target → post quad in the specimen view; directly when the post is refused', () => {
    withPmrem();
    const state = fakeState();
    _topoInstallLightingRig(state, 'cave');
    _topoRenderFrame(state);
    expect(state.renderer.log).toEqual([['render', state.scene]]);
    state.renderer.log.length = 0;
    const sp = _topoSpecimenEnter(state);
    _topoRenderFrame(state);
    const log = state.renderer.log;
    expect(sp.post.ok).toBe(true);
    expect(sp.post.rt).toBeTruthy();
    expect(sp.post.rt.width).toBe(640);
    expect(sp.post.rt.height).toBe(480);
    expect(sp.post.rt.texture.type).toBe(THREE.HalfFloatType);
    expect(log[0]).toEqual(['target', sp.post.rt]);
    expect(log[1]).toEqual(['render', state.scene]);
    expect(log[2]).toEqual(['target', null]);
    expect(log[3][0]).toBe('render');
    expect(log[3][1]).toBe(sp.post.scene);
    expect(sp.post.material.uniforms.uGrain.value).toBe(SPECIMEN_GRAIN);
    expect(sp.post.material.uniforms.uVignette.value).toBe(SPECIMEN_VIGNETTE);
    expect(sp.post.material.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(sp.post.material.fragmentShader).toContain('#include <colorspace_fragment>');
    expect(state.specimenRig.post).toEqual({ ok: true, reason: null, grain: SPECIMEN_GRAIN, vignette: SPECIMEN_VIGNETTE });
    // the target follows the drawing-buffer size
    state.renderer.getDrawingBufferSize = (v: any) => v.set(320, 200);
    const firstRt = sp.post.rt;
    _topoRenderFrame(state);
    expect(sp.post.rt).not.toBe(firstRt);
    expect(sp.post.rt.width).toBe(320);
    // refused post: one direct draw, recorded honestly
    const plain = fakeState({ renderer: fakeRenderer({ capabilities: { isWebGL2: false } }) });
    _topoInstallLightingRig(plain, 'cave');
    const sp2 = _topoSpecimenEnter(plain);
    plain.renderer.log.length = 0;
    _topoRenderFrame(plain);
    expect(plain.renderer.log).toEqual([['render', plain.scene]]);
    expect(sp2.post.ok).toBe(false);
    expect(plain.specimenRig.post.ok).toBe(false);
    expect(plain.specimenRig.post.reason).toMatch(/WebGL1/);
  });

  it('the shader injection routes the cut through the right position for each material family', () => {
    const uniforms = _specimenCutUniforms();
    const base = () => ({ uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>\n#include <project_vertex>', fragmentShader: '#include <common>\nvoid main() {\n}' });
    const wall = base(); _specimenCutInject(wall, uniforms, 'wall');
    expect(wall.fragmentShader).toContain('if (specimenCutAway(vWallMaterialPos)) discard;');
    expect(wall.uniforms.uSpecimenCutN).toBe(uniforms.uSpecimenCutN);
    const crystal = base(); _specimenCutInject(crystal, uniforms, 'crystal');
    expect(crystal.fragmentShader).toContain('specimenCutAway(vCavityWorldPos)');
    const rind = base(); _specimenCutInject(rind, uniforms, 'attribute');
    expect(rind.vertexShader).toContain('attribute vec3 aSpecimenSrc;');
    expect(rind.vertexShader).toContain('vSpecimenSrc = aSpecimenSrc;');
    expect(rind.fragmentShader).toContain('specimenCutAway(vSpecimenSrc)');
    const world = base(); _specimenCutInject(world, uniforms, 'world');
    expect(world.vertexShader).toContain('instanceMatrix * _specimenW');
    expect(world.vertexShader).toContain('vSpecimenSrc = ( modelMatrix * _specimenW ).xyz;');
  });
});
