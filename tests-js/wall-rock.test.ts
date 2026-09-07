// tests-js/wall-rock.test.ts — R5 "a wall that is rock" (2026-09-06).
//
// Visual-realism review §5 R5. The pixels are measured live by tools/photo-rig.mjs
// (--probe wallperiod, the wall-only radial power spectrum). What is testable headless is the
// CONTRACT: the orientation palette is decoded into a shade with the water tint preserved and
// unknown colours passed through; every registered lithology has rock parameters and the
// genesis extras clamp; the grain height field is in gamut, periodic and not flat; the material
// configuration puts the wall mesh in object-millimetre triplanar space and writes the rock
// parameters into the material and its uniforms and the receipt; the shader injection carries
// the anti-tiled sampler, the grain octave, the roughness modulation and the stain mask.
import { describe, expect, it } from 'vitest';

declare const THREE: any;
declare const WALL_ROCK_PARAMS: any;
declare const WALL_ROCK_DEFAULT: any;
declare const WALL_ROCK_GENESIS_STAIN: any;
declare const WALL_ROCK_STAIN_MAX: number;
declare const WALL_ROCK_LEGACY_PALETTE: any;
declare const WALL_ROCK_ORIENT_SHADE: any;
declare const WALL_ROCK_WATER_TINT: number[];
declare const WALL_ROCK_WATER_MIX: number;
declare const WALL_ROCK_NORMAL_SCALE: number;
declare const WALL_ROCK_RELIEF_STRENGTH: number;
declare const WALL_ROCK_GRAIN_STRENGTH: number;
declare const WALL_RELIEF_AO_AMT: number;
declare const _MATRIX_SKIN_PAINTERS: any;
declare const wallRockParamsFor: any;
declare const _wallGrainHeight: any;
declare const _wallGrainNormalMap: any;
declare const _topoWallRockTint: any;
declare const _topoConfigureCavityWallMaterial: any;
declare const _applyWallReliefAO: any;
declare const _wallReliefAOMap: any;

const PALETTE: Record<string, number[]> = { floor: [0xA8 / 255, 0x58 / 255, 0x20 / 255], wall: [0xD2 / 255, 0x69 / 255, 0x1E / 255], ceiling: [0xE8 / 255, 0x78 / 255, 0x2C / 255] };
const blend = (c: number[]) => c.map((v, i) => v * (1 - WALL_ROCK_WATER_MIX) + WALL_ROCK_WATER_TINT[i] * WALL_ROCK_WATER_MIX);

describe('R5 palette decode: orientation shade, water tint kept, unknown colours untouched', () => {
  it('maps each palette colour to its shade and a water-blended colour to the shaded blend', () => {
    const src = new Float32Array([...PALETTE.floor, ...PALETTE.wall, ...PALETTE.ceiling, ...blend(PALETTE.wall), ...blend(PALETTE.floor)]);
    const out = _topoWallRockTint(src);
    expect(Array.from(out.slice(0, 3))).toEqual([WALL_ROCK_ORIENT_SHADE.floor, WALL_ROCK_ORIENT_SHADE.floor, WALL_ROCK_ORIENT_SHADE.floor].map(v => Math.fround(v)));
    expect(out[3]).toBeCloseTo(WALL_ROCK_ORIENT_SHADE.wall, 6);
    expect(out[6]).toBeCloseTo(WALL_ROCK_ORIENT_SHADE.ceiling, 6);
    const wb = blend([WALL_ROCK_ORIENT_SHADE.wall, WALL_ROCK_ORIENT_SHADE.wall, WALL_ROCK_ORIENT_SHADE.wall]);
    expect(out[9]).toBeCloseTo(wb[0], 5); expect(out[10]).toBeCloseTo(wb[1], 5); expect(out[11]).toBeCloseTo(wb[2], 5);
    // the water tint survives as a blue shift, not as orange
    expect(out[11]).toBeGreaterThan(out[9]);
    const fb = blend([WALL_ROCK_ORIENT_SHADE.floor, WALL_ROCK_ORIENT_SHADE.floor, WALL_ROCK_ORIENT_SHADE.floor]);
    expect(out[12]).toBeCloseTo(fb[0], 5);
  });

  it('passes an unknown colour through unchanged and tolerates a bad length', () => {
    const src = new Float32Array([0.2, 0.9, 0.3]);
    const out = _topoWallRockTint(src);
    expect(Array.from(out)).toEqual(Array.from(src));
    const bad = new Float32Array([0.5, 0.5]);
    expect(_topoWallRockTint(bad)).toBe(bad);
  });

  it('the shades are a ±8 % legibility cue around white and the palette lists all three orientations', () => {
    for (const v of Object.values(WALL_ROCK_ORIENT_SHADE) as number[]) { expect(v).toBeGreaterThanOrEqual(0.92); expect(v).toBeLessThanOrEqual(1); }
    expect(WALL_ROCK_LEGACY_PALETTE.map((p: any) => p[0]).sort()).toEqual(['ceiling', 'floor', 'wall']);
  });
});

describe('R5 rock parameters per lithology', () => {
  it('every registered skin painter has a row; the default covers the rest', () => {
    for (const litho of Object.keys(_MATRIX_SKIN_PAINTERS)) expect(WALL_ROCK_PARAMS[litho], litho).toBeTruthy();
    for (const [k, p] of Object.entries(WALL_ROCK_PARAMS) as any[]) {
      expect(p.stain, k).toBeGreaterThanOrEqual(0); expect(p.stain, k).toBeLessThanOrEqual(WALL_ROCK_STAIN_MAX);
      expect(p.roughness, k).toBeGreaterThan(0.6); expect(p.roughness, k).toBeLessThanOrEqual(1);
      expect(p.grain, k).toBeGreaterThan(0); expect(p.grain, k).toBeLessThanOrEqual(1);
    }
    expect(wallRockParamsFor('no_such_rock')).toEqual(WALL_ROCK_DEFAULT);
    expect(wallRockParamsFor(null)).toEqual(WALL_ROCK_DEFAULT);
  });

  it('host iron orders the stain (BIF > basalt > limestone > marble) and a supergene genesis adds a gossan film, clamped', () => {
    const s = (l: string, g?: string) => wallRockParamsFor(l, g).stain;
    expect(s('banded_iron_formation')).toBeGreaterThan(s('basalt'));
    expect(s('basalt')).toBeGreaterThan(s('limestone'));
    expect(s('limestone')).toBeGreaterThan(s('marble'));
    expect(s('limestone', 'supergene')).toBeCloseTo(s('limestone') + WALL_ROCK_GENESIS_STAIN.supergene, 9);
    expect(s('banded_iron_formation', 'supergene')).toBe(WALL_ROCK_STAIN_MAX);
    expect(wallRockParamsFor('limestone', 'supergene').roughness).toBe(WALL_ROCK_PARAMS.limestone.roughness);
  });
});

describe('R5 grain: a non-periodic-looking, tileable micro-relief', () => {
  it('is in [0,1], tiles on the unit square, and is not flat', () => {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 400; k++) {
      const x = (k * 0.137) % 1, y = (k * 0.311) % 1;
      const h = _wallGrainHeight(x, y);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
      expect(_wallGrainHeight(x + 1, y)).toBeCloseTo(h, 9);
      expect(_wallGrainHeight(x, y + 1)).toBeCloseTo(h, 9);
    }
    expect(lo).toBeGreaterThanOrEqual(0); expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.3);
  });
  it('the normal-map generator is null-safe headless (no 2-D canvas in jsdom)', () => {
    expect(() => _wallGrainNormalMap()).not.toThrow();
  });
});

function materialWithUniforms() {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04 });
  material.userData.reliefAO = {
    uReliefAO: { value: null }, uReliefAORepeat: { value: new THREE.Vector2(5, 5) }, uReliefAOAmt: { value: 0 },
    uWallMaterialSpaceEnabled: { value: 0 }, uWallMatrixScale: { value: new THREE.Vector2(0.05, 0.05) }, uWallReliefScale: { value: new THREE.Vector2(0.1, 0.1) },
    uWallGrain: { value: null }, uWallGrainScale: { value: new THREE.Vector2(1 / 6, 1 / 6) }, uWallGrainAmt: { value: 0 },
    uWallReliefAmt: { value: 1 }, uWallStainAmt: { value: 0 }, uWallStainScale: { value: 1 / 25 },
  };
  return material;
}

describe('R5 material configuration: triplanar for the wall mesh, rock parameters into material, uniforms, receipt', () => {
  it('writes the lithology roughness, zero metalness, the grain/stain/relief amounts and the receipt', () => {
    const material = materialWithUniforms();
    const state: any = { cavity: { material } };
    const wall = { matrix: 'basalt', composition: 'basalt', architecture: 'pocket', genesis: 'supergene', paleo_flow: null };
    const receipt = _topoConfigureCavityWallMaterial(state, { mode: 'wall-mesh', buffers: { sig: 'w-1' } }, wall);
    const rock = wallRockParamsFor('basalt', 'supergene');
    expect(receipt.mapping).toBe('triplanar-object-millimetres');
    expect(receipt.rock).toEqual({ roughness: rock.roughness, grain: +(rock.grain * WALL_ROCK_GRAIN_STRENGTH).toFixed(3), stain: rock.stain, relief: WALL_ROCK_RELIEF_STRENGTH, normal_scale: WALL_ROCK_NORMAL_SCALE, palette: 'orientation-shade' });
    expect(material.roughness).toBe(rock.roughness);
    expect(material.metalness).toBe(0);
    const u = material.userData.reliefAO;
    expect(u.uWallMaterialSpaceEnabled.value).toBe(1);
    expect(u.uWallStainAmt.value).toBeCloseTo(rock.stain, 9);
    expect(u.uWallGrainAmt.value).toBeCloseTo(rock.grain * WALL_ROCK_GRAIN_STRENGTH, 9);
    expect(u.uWallReliefAmt.value).toBe(WALL_ROCK_RELIEF_STRENGTH);
    expect(WALL_RELIEF_AO_AMT).toBeLessThanOrEqual(0.4);
    expect(WALL_ROCK_NORMAL_SCALE).toBeLessThan(2);
  });

  it('the shader injection carries the anti-tiled sampler, the grain octave, the roughness modulation and the stain', () => {
    const material = materialWithUniforms();
    _applyWallReliefAO(material);
    const shader: any = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>',
    };
    material.onBeforeCompile(shader);
    const f = shader.fragmentShader;
    for (const needle of ['wallTriplanarSampleAT', 'wallNoise3', 'uWallGrain', 'uWallGrainAmt * length(_g)', 'roughnessFactor = clamp(', '_stain', 'vec3(0.86, 0.56, 0.34)', 'uWallReliefAmt', 'physicalScale * 0.37', 'uWallGrainAmt * min(1.0, length(_gs))', 'vec2 wallGrainSlope(vec3 p, vec3 n)', 'vec3 wallReliefWarp(vec3 p)', 'wallReliefWarp(vWallMaterialPos)']) {
      expect(f.includes(needle), needle).toBe(true);
    }
    expect(shader.uniforms.uWallGrain).toBe(material.userData.reliefAO.uWallGrain);
    expect(shader.uniforms.uWallStainAmt).toBe(material.userData.reliefAO.uWallStainAmt);
  });
});
