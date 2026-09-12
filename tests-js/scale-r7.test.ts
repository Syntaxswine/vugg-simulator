import { describe, expect, it } from 'vitest';
declare const THREE: any, Crystal: any, WallState: any;
declare const _topoSyncCrystalMeshes: any, _o2PlaceBody: any, crystalScaleMode: any, crystalDisplayDimensions: any;

describe('R7 recorded-length macro presentation', () => {
  it('does not enlarge microscopic inclusions in macro or replay', () => {
    expect(crystalDisplayDimensions(.03, .02, .5, 'recorded', true)).toEqual({ cLen: .03, aWid: .02, wasFloored: false });
    expect(crystalDisplayDimensions(.03, .02, .5, 'overview', true)).toEqual({ cLen: .4, aWid: .4, wasFloored: true });
  });
  it('shares macro/replay policy and rebuilds only at a regime crossing', () => {
    const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
    const c = new Crystal({ mineral: 'quartz', habit: 'prismatic', crystal_id: 17, nucleation_step: 1 });
    Object.assign(c, { c_length_mm: .3, a_width_mm: .15, total_growth_um: 300,
      wall_anchor: wall._anchorFromRingCell(6, 12), zones: [{ step: 1, thickness_um: 300 }] });
    const original = JSON.stringify(c);
    const state: any = { geomCache: new Map(), crystals: new THREE.Group(),
      clipUniforms: { uVugRadius: { value: 35 } }, scaleZoomOverride: 3.99 };
    const sim = { crystals: [c], step: 2 };
    const build = (zoom: number) => {
      state.scaleZoomOverride = zoom;
      _topoSyncCrystalMeshes(state, sim, wall);
      return state.crystals.children.find((m: any) => !m.userData.isSatellite);
    };
    const overview = build(3.99), macro = build(4);
    expect(macro).not.toBe(overview);
    expect(build(4.1)).toBe(macro);
    macro.geometry.computeBoundingBox();
    expect((macro.geometry.boundingBox.max.y - macro.geometry.boundingBox.min.y) * macro.scale.y).toBeCloseTo(.3, 2);
    const base = new THREE.Vector3(0, -.5 * macro.scale.y, 0).applyQuaternion(macro.quaternion).add(macro.position);
    expect(base.distanceTo(new THREE.Vector3(...wall.surfacePointForCrystal(c)))).toBeLessThan(1e-6);
    const neighbour = _o2PlaceBody(c, wall, undefined, wall.ring_count, wall.cells_per_ring, 35, 'recorded');
    expect(new THREE.Vector3(neighbour.cx, neighbour.cy, neighbour.cz).distanceTo(macro.position)).toBeLessThan(1e-6);
    expect(neighbour.reach).toBeLessThan(.2);
    const descriptors = state.crystals.children.filter((m: any) => m.userData.populationDisplay).map((m: any) => m.userData.populationDisplay);
    const back = build(3.99);
    expect(back).not.toBe(macro);
    expect(build(3.5)).toBe(back);
    expect(back.scale.toArray()).toEqual(overview.scale.toArray());
    expect(state.crystals.children.filter((m: any) => m.userData.populationDisplay).map((m: any) => m.userData.populationDisplay)).toEqual(descriptors);
    expect(JSON.stringify(c)).toBe(original);
    expect(crystalScaleMode(1, 1)).toBe('recorded');
    _topoSyncCrystalMeshes(state, sim, wall, 0);
    expect(state.crystals.children).toHaveLength(0);
  });
});
