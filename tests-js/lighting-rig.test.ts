// tests-js/lighting-rig.test.ts — R1 "light like a photograph" (2026-09-05).
//
// Visual-realism review §5 R1 + decisions D4/D5. The rig itself (PMREM bake,
// shadow map, ACES) needs a GPU and is measured live by tools/photo-rig.mjs
// (manifest.gl.lighting). What is testable here is the CONTRACT around it:
// the wall's side from inside the cavity (the culled-interior bug the probe
// found), the mood table's photographic invariants, the key's placement in
// the camera frame, the inside/outside exposure rule, the shadow step-down
// gate, and the honest fallback when the environment cannot be baked.
import { afterEach, describe, expect, it } from 'vitest';

declare const THREE: any;
declare const LIGHTING_MOODS: any;
declare const LIGHTING_SHADOW_MAP_DESKTOP: number;
declare const LIGHTING_SHADOW_MAP_MOBILE: number;
declare const LIGHTING_SHADOW_MAP_MIN: number;
declare const LIGHTING_SLOW_RENDER_MS: number;
declare const LIGHTING_SLOW_RENDER_STREAK: number;
declare const _topoApplyWallDisplay: any;
declare const _topoInstallLightingRig: any;
declare const _topoLightingSyncKey: any;
declare const _topoLightingNoteRenderTime: any;
declare const _topoLightingApplyInsideMode: any;
declare const _topoLightingTagMesh: any;

function fakeRenderer() {
  return { toneMapping: THREE.NoToneMapping, toneMappingExposure: 1, shadowMap: { enabled: false, type: null } };
}

// A state object shaped like _topoInitThree's, without a WebGL renderer.
function fakeState(overrides: Record<string, any> = {}) {
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const directional = new THREE.DirectionalLight(0xffe6c0, 0.9);
  scene.add(ambient); scene.add(directional); scene.add(directional.target);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
  camera.position.set(0, 0, 600); camera.lookAt(0, 0, 0);
  const cavity = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ side: THREE.BackSide, transparent: true, opacity: 0.40 }),
  );
  scene.add(cavity);
  return {
    renderer: fakeRenderer(), scene, camera, cavity, ambient, directional,
    insideMode: false, wallDisplay: 0, ...overrides,
  };
}

// The bundle (and THREE) arrive in setup's beforeAll, so capture at patch time,
// never at module load — a load-time capture is undefined and restoring it
// would strip THREE from every later test.
let patchedFrom: any = null;
afterEach(() => {
  if (patchedFrom) { (globalThis as any).THREE = patchedFrom; patchedFrom = null; }
});

function withThree(patch: Record<string, any>) {
  patchedFrom = (globalThis as any).THREE;
  (globalThis as any).THREE = { ...patchedFrom, ...patch };
}

describe('wall display from inside the cavity (the culled-interior fix)', () => {
  it('renders the wall two-sided and opaque when the camera is inside', () => {
    // photo-rig `wall2side` probe, elmwood s42: the cavity surface normals point
    // OUTWARD (mean n·p > 0), so from inside every face is a back face. FrontSide
    // drew nothing: hero frames had dark fraction 0.59 under ANY lighting.
    const state = fakeState({ insideMode: true, wallDisplay: 0 });
    _topoApplyWallDisplay(state);
    const mat = state.cavity.material;
    expect(state.cavity.visible).toBe(true);
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.opacity).toBe(1.0);
    expect(mat.transparent).toBe(false);
    expect(mat.depthWrite).toBe(true);
  });

  it('keeps the translucent BackSide shell for the orb view and the portrait view', () => {
    const outside = fakeState({ insideMode: false, wallDisplay: 0 });
    _topoApplyWallDisplay(outside);
    expect(outside.cavity.material.side).toBe(THREE.BackSide);
    expect(outside.cavity.material.opacity).toBeCloseTo(0.40);
    expect(outside.cavity.material.transparent).toBe(true);
    const portrait = fakeState({ insideMode: true, wallDisplay: 1 });
    _topoApplyWallDisplay(portrait);
    expect(portrait.cavity.material.side).toBe(THREE.BackSide);
    expect(portrait.cavity.material.opacity).toBeCloseTo(0.18);
    expect(portrait.cavity.material.depthWrite).toBe(false);
    const hidden = fakeState({ insideMode: true, wallDisplay: 2 });
    _topoApplyWallDisplay(hidden);
    expect(hidden.cavity.visible).toBe(false);
  });
});

describe('mood table — photographic invariants', () => {
  it('each mood carries one small, hot source (a lamp, not a softbox) and a low ambient floor', () => {
    for (const mood of ['cave', 'studio']) {
      const spec = LIGHTING_MOODS[mood];
      expect(spec, mood).toBeTruthy();
      // A glass face mirrors ~4 % (F0): a white highlight needs a source ≥ 25× the
      // diffuse white level. Small so the PMREM keeps it a glint on a polished face.
      const hot = spec.panels.filter((p: any) => p.intensity >= 25);
      expect(hot.length, `${mood}: hot source`).toBeGreaterThanOrEqual(1);
      for (const p of hot) expect(p.w * p.h, `${mood}: hot source area`).toBeLessThanOrEqual(40);
      // A soft, large panel for the broad grey windows on faces.
      expect(spec.panels.some((p: any) => p.w * p.h >= 400 && p.intensity < 25), `${mood}: soft panel`).toBe(true);
      expect(spec.ambient).toBeLessThanOrEqual(0.15);        // the environment supplies the ambient
      expect(spec.insideExposure).toBeGreaterThanOrEqual(1); // inside never darker than outside
      expect(spec.exposure).toBeGreaterThan(0);
    }
    // D5: the process view is a cave, the specimen view a restrained studio.
    expect(LIGHTING_MOODS.cave.room).toBeLessThan(LIGHTING_MOODS.studio.room);
    expect(LIGHTING_MOODS.cave.insideExposure).toBeGreaterThan(LIGHTING_MOODS.studio.insideExposure);
  });

  it('shadow-map ladder is ordered desktop > mobile ≥ min and the gate needs a streak', () => {
    expect(LIGHTING_SHADOW_MAP_DESKTOP).toBeGreaterThan(LIGHTING_SHADOW_MAP_MOBILE);
    expect(LIGHTING_SHADOW_MAP_MOBILE).toBeGreaterThanOrEqual(LIGHTING_SHADOW_MAP_MIN);
    expect(LIGHTING_SLOW_RENDER_STREAK).toBeGreaterThanOrEqual(2);   // one slow frame (shader compile) never steps down
    expect(LIGHTING_SLOW_RENDER_MS).toBeGreaterThanOrEqual(50);
  });
});

describe('installing the rig', () => {
  function fakePmrem(texture: any, calls: { baked: number; disposed: number }) {
    return class {
      constructor(_renderer: any) { /* no GPU here */ }
      fromScene() { calls.baked++; return { texture }; }
      dispose() { calls.disposed++; }
    };
  }

  it('bakes the environment, switches to ACES, lowers the ambient, arms the shadow key (desktop map)', () => {
    const calls = { baked: 0, disposed: 0 };
    const texture = { disposed: 0, dispose() { this.disposed++; } };
    withThree({ PMREMGenerator: fakePmrem(texture, calls) });
    const state = fakeState();
    const rig = _topoInstallLightingRig(state, 'cave');
    expect(rig).toMatchObject({ mood: 'cave', environment: true, reason: null, tone_mapping: 'aces', shadows: true });
    expect(state.scene.environment).toBe(texture);
    expect(calls).toEqual({ baked: 1, disposed: 1 });                 // the generator is freed after the bake
    expect(state.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(state.renderer.toneMappingExposure).toBeCloseTo(LIGHTING_MOODS.cave.exposure);
    expect(state.ambient.intensity).toBeCloseTo(LIGHTING_MOODS.cave.ambient);
    expect(state.directional.intensity).toBeCloseTo(LIGHTING_MOODS.cave.key);
    expect(state.renderer.shadowMap.enabled).toBe(true);
    expect(state.directional.castShadow).toBe(true);
    // jsdom: innerWidth 1024, devicePixelRatio 1 → the desktop profile
    expect(rig.shadow_map).toBe(LIGHTING_SHADOW_MAP_DESKTOP);
    expect(state.directional.shadow.mapSize.x).toBe(LIGHTING_SHADOW_MAP_DESKTOP);
    expect(state.lightingRig).toBe(rig);
    // idempotent for the same mood; a mood switch disposes the old texture and bakes once more
    expect(_topoInstallLightingRig(state, 'cave')).toBe(rig);
    expect(calls.baked).toBe(1);
    const studio = _topoInstallLightingRig(state, 'studio');
    expect(studio.mood).toBe('studio');
    expect(calls.baked).toBe(2);
    expect(texture.disposed).toBe(1);
    expect(state.ambient.intensity).toBeCloseTo(LIGHTING_MOODS.studio.ambient);
  });

  it('inside the cavity the rig opens the exposure and never removes the environment', () => {
    const calls = { baked: 0, disposed: 0 };
    const texture = { dispose() { /* noop */ } };
    withThree({ PMREMGenerator: fakePmrem(texture, calls) });
    const state = fakeState();
    _topoInstallLightingRig(state, 'cave');
    _topoLightingApplyInsideMode(state, true);
    expect(state.renderer.toneMappingExposure).toBeCloseTo(LIGHTING_MOODS.cave.exposure * LIGHTING_MOODS.cave.insideExposure);
    expect(state.scene.environment).toBe(texture);
    expect(state.ambient.intensity).toBeCloseTo(LIGHTING_MOODS.cave.ambient);   // not the legacy 0.85 boost
    _topoLightingApplyInsideMode(state, false);
    expect(state.renderer.toneMappingExposure).toBeCloseTo(LIGHTING_MOODS.cave.exposure);
    expect(state.lightingRig.exposure).toBeCloseTo(LIGHTING_MOODS.cave.exposure);
  });

  it('falls back to the pre-R1 two-light look, and says why, when the environment cannot be baked', () => {
    withThree({ PMREMGenerator: undefined });
    const state = fakeState({ insideMode: false });
    const rig = _topoInstallLightingRig(state, 'cave');
    expect(rig.environment).toBe(false);
    expect(String(rig.reason)).toMatch(/PMREMGenerator/);
    expect(rig.tone_mapping).toBe('none');
    expect(rig.shadows).toBe(false);
    expect(state.scene.environment).toBeNull();
    expect(state.renderer.toneMapping).toBe(THREE.NoToneMapping);
    expect(state.renderer.shadowMap.enabled).toBe(false);
    expect(state.directional.castShadow).toBe(false);
    expect(state.ambient.intensity).toBeCloseTo(0.55);
    expect(state.directional.intensity).toBeCloseTo(0.9);
    // the legacy inside/outside intensity swap survives on the fallback
    _topoLightingApplyInsideMode(state, true);
    expect(state.ambient.intensity).toBeCloseTo(0.85);
    expect(state.directional.intensity).toBeCloseTo(1.2);
    _topoLightingApplyInsideMode(state, false);
    expect(state.ambient.intensity).toBeCloseTo(0.55);
  });

  it('a bake that throws is recorded, not fatal', () => {
    withThree({ PMREMGenerator: class { fromScene() { throw new Error('context lost mid-bake'); } dispose() { /* noop */ } } });
    const state = fakeState();
    const rig = _topoInstallLightingRig(state, 'studio');
    expect(rig.environment).toBe(false);
    expect(rig.reason).toBe('context lost mid-bake');
    expect(state.scene.environment).toBeNull();
    expect(state.renderer.toneMapping).toBe(THREE.NoToneMapping);
  });
});

describe('the key rides the camera frame', () => {
  it('sits upper-left of the viewer, aims at the orbit target, and frames the shadow to the cavity', () => {
    const state = fakeState();
    state.directional.castShadow = true;
    const r0 = 25;
    _topoLightingSyncKey(state, 0, 0, 0, r0);
    const p = state.directional.position;
    // camera at +Z looking at the origin: back = +Z, up = +Y, right = +X
    expect(p.z).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(0);
    expect(p.length()).toBeCloseTo(r0 * 4, 5);
    expect(state.directional.target.position.length()).toBe(0);
    const sc = state.directional.shadow.camera;
    expect(sc.right).toBeCloseTo(r0 * 1.6);
    expect(sc.left).toBeCloseTo(-r0 * 1.6);
    expect(sc.top).toBeCloseTo(r0 * 1.6);
    expect(sc.far).toBeCloseTo(r0 * 4 + r0 * 1.6 * 2);
    expect(sc.near).toBeCloseTo(0.5);
  });

  it('follows a rotated camera and a panned aim', () => {
    const state = fakeState();
    state.camera.position.set(600, 0, 0); state.camera.lookAt(0, 0, 0);
    _topoLightingSyncKey(state, 10, 5, -3, 30);
    const p = state.directional.position;
    const aim = new THREE.Vector3(10, 5, -3);
    expect(state.directional.target.position.distanceTo(aim)).toBeCloseTo(0);
    const d = p.clone().sub(aim);
    expect(d.length()).toBeCloseTo(120, 5);        // 4·r0 from the aim
    expect(d.x).toBeGreaterThan(0);                // camera back = +X
    expect(d.y).toBeGreaterThan(0);                // above
    // camera right for a +X camera looking at the origin is −Z; "left" is +Z
    expect(d.z).toBeGreaterThan(0);
  });

  it('leaves the shadow camera alone when the key does not cast', () => {
    const state = fakeState();
    state.directional.castShadow = false;
    const before = state.directional.shadow.camera.right;
    _topoLightingSyncKey(state, 0, 0, 0, 40);
    expect(state.directional.shadow.camera.right).toBe(before);
  });
});

describe('the shadow step-down gate', () => {
  function gatedState() {
    const state = fakeState();
    state.directional.castShadow = true;
    state.directional.shadow.mapSize.set(LIGHTING_SHADOW_MAP_DESKTOP, LIGHTING_SHADOW_MAP_DESKTOP);
    state.lightingGate = { shadows: true, shadow_map: LIGHTING_SHADOW_MAP_DESKTOP, slow_renders: 0, step_downs: 0, last_render_ms: null };
    state.lightingRig = { mood: 'cave', environment: true, shadows: true, shadow_map: LIGHTING_SHADOW_MAP_DESKTOP, step_downs: 0 };
    return state;
  }
  // Read lazily: the bundle is loaded in setup's beforeAll, after describe bodies run.
  const slow = () => LIGHTING_SLOW_RENDER_MS * 2;

  it('needs a full streak of slow renders; one fast render resets it', () => {
    const state = gatedState();
    for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK - 1; i++) _topoLightingNoteRenderTime(state, slow());
    expect(state.lightingGate.shadow_map).toBe(LIGHTING_SHADOW_MAP_DESKTOP);
    _topoLightingNoteRenderTime(state, 5);
    expect(state.lightingGate.slow_renders).toBe(0);
    for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK - 1; i++) _topoLightingNoteRenderTime(state, slow());
    expect(state.lightingGate.shadow_map).toBe(LIGHTING_SHADOW_MAP_DESKTOP);
  });

  it('halves the map down to the floor, then turns the shadow off, and reports each step', () => {
    const state = gatedState();
    const ladder: number[] = [];
    let guard = 0;
    while (state.lightingGate.shadows && guard++ < 20) {
      for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK; i++) _topoLightingNoteRenderTime(state, slow());
      ladder.push(state.lightingGate.shadows ? state.lightingGate.shadow_map : 0);
    }
    expect(ladder).toEqual([1024, 512, 0]);
    expect(state.directional.castShadow).toBe(false);
    expect(state.lightingRig).toMatchObject({ shadows: false, shadow_map: 0, step_downs: 3 });
    // the map was resized on the way down
    expect(state.directional.shadow.mapSize.x).toBe(LIGHTING_SHADOW_MAP_MIN);
    // a slow render after the floor changes nothing further
    _topoLightingNoteRenderTime(state, slow());
    expect(state.lightingRig.step_downs).toBe(3);
  });

  it('does nothing on the legacy fallback (no environment, no shadows to shed)', () => {
    const state = gatedState();
    state.lightingRig.environment = false;
    for (let i = 0; i < LIGHTING_SLOW_RENDER_STREAK * 2; i++) _topoLightingNoteRenderTime(state, slow());
    expect(state.lightingGate.shadow_map).toBe(LIGHTING_SHADOW_MAP_DESKTOP);
    expect(state.directional.castShadow).toBe(true);
  });
});

describe('shadow flags at mesh birth', () => {
  it('bodies cast and receive; phantom bands receive only', () => {
    const body = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
    _topoLightingTagMesh(body, true);
    expect(body.castShadow).toBe(true);
    expect(body.receiveShadow).toBe(true);
    const band = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
    _topoLightingTagMesh(band, false);
    expect(band.castShadow).toBe(false);
    expect(band.receiveShadow).toBe(true);
  });
});
