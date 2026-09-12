import { describe, expect, it, vi } from 'vitest';
declare const populationDisplayMember: any, populationHistorySignature: any, maskedHorizonBands: any;
declare const THREE: any, Crystal: any, WallState: any, _topoSyncCrystalMeshes: any, _topoCrystalsSignature: any;
declare const _topoOpticsApplyTier: any;
declare const _emitClusterSatellites: any, _CLUSTER_PATTERNS: any, _topoCAxisForCrystal: any;

function scene(extra: any = {}, replayStep?: number) {
  const wall = new WallState({ vug_diameter_mm: 70, shape_seed: 42 });
  const c = new Crystal({ mineral: 'quartz', habit: 'prismatic', crystal_id: 17, nucleation_step: 1 });
  Object.assign(c, { c_length_mm: 8, a_width_mm: 5, total_growth_um: 8000,
    wall_anchor: wall._anchorFromRingCell(6, 12), _nucTilt: { theta: .3, azim: .8 },
    zones: [{ step: 1, thickness_um: 4000 }, { step: 2, thickness_um: 4000 }], ...extra });
  const state = { geomCache: new Map(), crystals: new THREE.Group(), clipUniforms: { uVugRadius: { value: 35 } } };
  const sim = { crystals: [c], step: 4 };
  const before = JSON.stringify(c);
  _topoSyncCrystalMeshes(state, sim, wall, replayStep);
  expect(JSON.stringify(c)).toBe(before);
  return { c, state, sim, wall };
}

describe('R7 representative population fidelity', () => {
  it('keeps stable per-member descriptors regardless of requested population count', () => {
    const p = _CLUSTER_PATTERNS.prism;
    const first = Array.from({ length: 9 }, (_, i) => populationDisplayMember(17, i, p));
    expect(Array.from({ length: 3 }, (_, i) => populationDisplayMember(17, i, p))).toEqual(first.slice(0, 3));
    expect(first).not.toEqual(Array.from({ length: 9 }, (_, i) => populationDisplayMember(18, i, p)));
    expect(Math.max(...first.map(m => m.scale)) / Math.min(...first.map(m => m.scale))).toBeGreaterThan(1.5);
    for (const m of first) {
      expect(m.scale).toBeGreaterThanOrEqual(p.scaleMin * .55);
      expect(m.scale).toBeLessThanOrEqual(p.scaleMax);
      expect(m.radiusInParentWidths).toBeLessThanOrEqual(.51 * (1 + m.scale));
      expect(Math.abs(m.tilt)).toBeLessThanOrEqual(p.tiltMax * .35);
    }
  });

  it('tags copies as representatives and preserves parent identity, orientation and scientific counts', () => {
    const { c, state, sim } = scene();
    const copies = state.crystals.children.filter((m: any) => m.userData.populationDisplay);
    expect(copies.length).toBeGreaterThan(3);
    expect(sim.crystals).toHaveLength(1);
    for (const copy of copies) {
      expect(copy.userData.crystal_id).toBe(c.crystal_id);
      expect(copy.userData.populationDisplay).toMatchObject({ parentCrystalId: 17,
        independentNucleation: false, axisSource: 'parent-recorded-tilt-at-local-substrate' });
      expect(copy.userData.populationDisplay).not.toHaveProperty('nucleation_step');
    }
    const parent = state.crystals.children.find((m: any) => !m.userData.isSatellite);
    expect(parent.userData.crystal_id).toBe(17);
    const tilted = scene({ _nucTilt: { theta: .6, azim: .8 } });
    const next = tilted.state.crystals.children.find((m: any) => !m.userData.isSatellite);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(parent.quaternion).angleTo(
      new THREE.Vector3(0, 1, 0).applyQuaternion(next.quaternion))).toBeCloseTo(.3, 5);
  });

  it('keeps surviving production members in place when the display count changes', () => {
    const full = scene().state.crystals.children.filter((m: any) => m.userData.populationDisplay);
    const p = _CLUSTER_PATTERNS.prism, oldCount = p.countScale;
    try {
      p.countScale = .5;
      const reduced = scene().state.crystals.children.filter((m: any) => m.userData.populationDisplay);
      expect(reduced.length).toBeLessThan(full.length);
      for (let i = 0; i < reduced.length; i++) {
        expect(reduced[i].position.toArray()).toEqual(full[i].position.toArray());
        expect(reduced[i].quaternion.toArray()).toEqual(full[i].quaternion.toArray());
        expect(reduced[i].scale.toArray()).toEqual(full[i].scale.toArray());
      }
    } finally { p.countScale = oldCount; }
  });

  it('uses no simulation RNG and labels missing orientation as a display convention', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('randomness'); });
    try { expect(populationDisplayMember(3, 2, _CLUSTER_PATTERNS.prism).scale).toBeGreaterThan(0); }
    finally { random.mockRestore(); }
    const { state } = scene({ _nucTilt: undefined });
    for (const m of state.crystals.children.filter((m: any) => m.userData.populationDisplay)) {
      expect(m.userData.populationDisplay.axisSource).toBe('substrate-display-convention');
    }
  });

  it('packs cubic representatives against rendered width, not the smaller simulation a-width', () => {
    const a = scene({ mineral: 'fluorite', habit: 'cubic', a_width_mm: 4 });
    const b = scene({ mineral: 'fluorite', habit: 'cubic', a_width_mm: 2 });
    const members = (s: any) => s.state.crystals.children.filter((m: any) => m.userData.populationDisplay);
    expect(members(a).length).toBeGreaterThan(3);
    expect(members(a).map((m: any) => m.position.toArray()))
      .toEqual(members(b).map((m: any) => m.position.toArray()));
  });

  it('does not invent independent births or use age to tint representative members', () => {
    expect(scene({}, 0).state.crystals.children).toHaveLength(0);
    const a = scene({ nucleation_step: 1 }), b = scene({ nucleation_step: 0 });
    expect(a.state.crystals.children.map((m: any) => m.material.color.getHex()))
      .toEqual(b.state.crystals.children.map((m: any) => m.material.color.getHex()));
  });

  it('invalidates cached population axes and horizon records without a size change', () => {
    const { c, state, sim, wall } = scene();
    let key = _topoCrystalsSignature(sim, wall);
    c._nucTilt.theta += .2;
    expect(_topoCrystalsSignature(sim, wall)).not.toBe(key);
    key = _topoCrystalsSignature(sim, wall);
    c.zones[1].masked_horizon = true; c.zones[1].film_mineral = 'chlorite';
    expect(_topoCrystalsSignature(sim, wall)).not.toBe(key);
    _topoSyncCrystalMeshes(state, sim, wall);
    expect(state.crystals.children.find((m: any) => !m.userData.isSatellite).children
      .filter((m: any) => m.userData.o5Band)).toHaveLength(1);
  });

  it.each([
    { mineral: 'selenite', habit: 'tabular' },
    { mineral: 'barite', habit: 'cockscomb' },
    { mineral: 'aragonite', habit: 'columnar', twinned: true, twin_law: 'cyclic_sextet' },
  ])('keeps specialized $mineral arrangements outside the generic population route', extra => {
    const { state } = scene(extra);
    expect(state.crystals.children.some((m: any) => m.userData.populationDisplay)).toBe(false);
  });
});

describe('R7 surviving phantom history', () => {
  const zones = [
    { step: 1, thickness_um: 2000 },
    { step: 2, thickness_um: 2000, masked_horizon: true, film_mineral: 'clay' },
    { step: 3, thickness_um: 2000, masked_horizon: true, film_mineral: 'chlorite' },
    { step: 4, thickness_um: -4500 },
    { step: 5, thickness_um: 6500 },
  ];
  it('does not resurrect dissolved film surfaces on later regrowth', () => {
    const c = { c_length_mm: 8, zones };
    expect(maskedHorizonBands(c)).toEqual([]);
    expect(maskedHorizonBands(c, 2)).toEqual([{ frac: .5, mineral: 'clay' }]);
    expect(maskedHorizonBands(c, 4)).toEqual([]);
  });
  it('retains the film when dissolution only removes part of its breakthrough layer', () => {
    const c = { c_length_mm: .4, zones: [{ thickness_um: 300 },
      { thickness_um: 200, masked_horizon: true, film_mineral: 'clay' },
      { thickness_um: 500 }, { thickness_um: -600 }] };
    expect(maskedHorizonBands(c)).toEqual([{ frac: .75, mineral: 'clay' }]);
  });
  it('retains deeper horizons, discards excess loss and never borrows future film identity', () => {
    expect(maskedHorizonBands({ c_length_mm: 5, zones: [zones[0], zones[1], zones[2],
      { step: 4, thickness_um: -2500 }, { step: 5, thickness_um: 1500 }] }))
      .toEqual([{ frac: .4, mineral: 'clay' }]);
    expect(maskedHorizonBands({ c_length_mm: 1, _film_mineral: 'iron oxide', zones: [{ thickness_um: -5000 },
      { thickness_um: 500 }, { thickness_um: 500, masked_horizon: true }] }))
      .toEqual([{ frac: .5, mineral: 'film' }]);
    const c = { c_length_mm: 8, zones: zones.map(z => ({ ...z })) };
    const sig = populationHistorySignature(c, 2);
    c.zones[2].film_mineral = 'iron oxide';
    expect(populationHistorySignature(c, 2)).toBe(sig);
  });
  it('replays surviving shells in parents and representatives without changing records', () => {
    const old = scene({ zones }, 2);
    for (const m of old.state.crystals.children.filter((m: any) => !m.userData.isSatellite || m.userData.populationDisplay)) {
      const bands = m.children.filter((b: any) => b.userData.o5Band);
      expect(bands).toHaveLength(1); expect(bands[0].scale.x).toBeCloseTo(.5);
    }
    const now = scene({ zones }, 5);
    for (const m of now.state.crystals.children) expect(m.children.filter((b: any) => b.userData.o5Band)).toHaveLength(0);
  });
  it('includes buried films in the transmission buffer and preserves alpha fallback', () => {
    const { state } = scene({ zones }, 2);
    const host = state.crystals.children.find((m: any) => !m.userData.isSatellite);
    const band = host.children.find((m: any) => m.userData.o5Band);
    expect(host.material.transmission).toBeGreaterThan(0);
    expect(band.material.transparent).toBe(false);
    expect(band.material.depthWrite).toBe(true);
    _topoOpticsApplyTier(state, 'alpha');
    expect(band.material.transparent).toBe(true); expect(band.material.opacity).toBe(.72);
    expect(band.renderOrder).toBeLessThan(host.renderOrder);
    expect(band.material.depthTest).toBe(true);
    _topoOpticsApplyTier(state, 'transmission');
    expect(band.material.transparent).toBe(false); expect(band.material.opacity).toBe(1);
  });
  it('disposes all descendant band materials on rebuild while retaining shared geometry', () => {
    const { state, sim, wall } = scene({ zones }, 2);
    const mats = new Set<any>(), geoms = new Set<any>();
    state.crystals.traverse((m: any) => { if (m.userData?.o5Band) {
      mats.add(m.material); if (m.customDepthMaterial) mats.add(m.customDepthMaterial); geoms.add(m.geometry);
    } });
    expect(mats.size).toBeGreaterThan(2);
    const materialSpies = [...mats].map(m => vi.spyOn(m, 'dispose'));
    const geometrySpies = [...geoms].map(g => vi.spyOn(g, 'dispose'));
    _topoSyncCrystalMeshes(state, sim, wall, 5);
    for (const spy of materialSpies) expect(spy).toHaveBeenCalledTimes(1);
    for (const spy of geometrySpies) expect(spy).not.toHaveBeenCalled();
  });
});
