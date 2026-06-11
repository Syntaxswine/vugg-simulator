// tests-js/calcite-morphology.test.ts — calcite-morphology arc contracts.
//
// Phase 0/1 (2026-06-11): the growth-regime classifier lives in the engine
// (js/52 classifyCalciteMorphologyStep), tags every calcite zone at END of
// run_step from the POST-STEP σ, and the tags feed the strip chip + zone
// modal. Master doc: proposals/HANDOFF-CALCITE-MORPHOLOGY-2026-06-11.md;
// science oracle: proposals/RESEARCH-calcite-morphology-2026-06-11.md.
//
// The contracts pinned here:
//   1. SUNAGAWA ORDER (17th catch — external peer review): rising σ walks
//      smooth → stepped → hopper → dendritic, never out of order, and the
//      calibrated thresholds hold (spar<2 | mild<8 | STEPPED<50 |
//      hopper<200 | dendrite≥200 on SURFACE σ).
//   2. BOUNDARY-LAYER DAMPING (Wolthers 2022): surface σ → bulk σ at size
//      0, decays toward 1 as the crystal grows (SIZE_HALF_UM=80).
//   3. POST-STEP BASIS (18th catch — instrument-caught): zone tags equal a
//      recompute from the post-step σ, NOT the in-step σ. The in-step
//      basis misbanded the whole dripstone family dendritic (thin-film σ
//      spikes the crystal itself consumes within the step).
//   4. THE VALIDATED FLEET PICTURE survives: stalactite_demo is stepped-
//      dominant, mvt smooth-spar-dominant, and dendritic is never a
//      dominant band at seed 42 (zero stable dendrites — geologically
//      honest; the reviewer's prediction, confirmed by the corrected map).
//   5. THE INSTRUMENTS: per-zone tags carry regime/form/surf_sigma; the
//      calcite_morph strip chip reads the Sunagawa ordinal at the
//      crystal's anchor and null in empty rock.

import { describe, expect, it } from 'vitest';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;
declare const calciteMorphRegime: any;
declare const calciteSurfaceSigma: any;
declare const CALCITE_MORPH_REGIMES: any;
declare const CALCITE_MORPH_TH: any;
declare const _HELIX_CHEM_PARAMS: any;

function runScenario(name: string, seed = 42, steps?: number) {
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  const sim = new VugSimulator(conditions, events);
  const n = steps ?? defaultSteps ?? 100;
  for (let i = 0; i < n; i++) sim.run_step();
  return sim;
}

function regimeMass(sim: any): Record<string, number> {
  const mass: Record<string, number> = {};
  for (const c of sim.crystals) {
    if (!c || c.mineral !== 'calcite' || c.dissolved) continue;
    for (const z of c.zones || []) {
      if (!z.morph_regime || z.thickness_um <= 0) continue;
      mass[z.morph_regime] = (mass[z.morph_regime] || 0) + z.thickness_um;
    }
  }
  return mass;
}

describe('calcite morphology classifier (Phase 0)', () => {

  it('walks the Sunagawa order as σ rises — never out of order', () => {
    expect(CALCITE_MORPH_REGIMES).toEqual([
      'spiral_smooth', 'stepped_mild', 'stepped_macro', 'hopper_skeletal', 'dendritic',
    ]);
    // A rising σ sweep maps to a non-decreasing regime ordinal (§6.1 of
    // the research doc — the dark-observe σ-ramp test).
    let lastIdx = -1;
    for (let sigma = 1.05; sigma < 600; sigma *= 1.18) {
      const idx = CALCITE_MORPH_REGIMES.indexOf(calciteMorphRegime(sigma));
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
    expect(lastIdx).toBe(4);  // the sweep reaches dendritic at the top
  });

  it('calibrated thresholds hold at the band boundaries', () => {
    expect(calciteMorphRegime(1.9)).toBe('spiral_smooth');
    expect(calciteMorphRegime(2.1)).toBe('stepped_mild');
    expect(calciteMorphRegime(7.9)).toBe('stepped_mild');
    expect(calciteMorphRegime(8.1)).toBe('stepped_macro');
    expect(calciteMorphRegime(49)).toBe('stepped_macro');
    expect(calciteMorphRegime(51)).toBe('hopper_skeletal');
    expect(calciteMorphRegime(199)).toBe('hopper_skeletal');
    expect(calciteMorphRegime(201)).toBe('dendritic');
  });

  it('boundary-layer damping: surfσ = bulkσ at size 0, decays toward 1 with size', () => {
    expect(calciteSurfaceSigma(100, 0)).toBeCloseTo(100, 6);
    // At SIZE_HALF_UM the excess halves: 1 + 99/2
    expect(calciteSurfaceSigma(100, CALCITE_MORPH_TH.SIZE_HALF_UM)).toBeCloseTo(50.5, 6);
    // A big crystal at high bulk σ reads spiral — the deccan/jeffrey/
    // marble smooth-spar story.
    expect(calciteSurfaceSigma(100, 16000)).toBeLessThan(2.0);
    // Monotone in size
    let last = Infinity;
    for (const um of [0, 40, 80, 200, 800, 4000]) {
      const s = calciteSurfaceSigma(60, um);
      expect(s).toBeLessThanOrEqual(last);
      last = s;
    }
  });

  it('18th catch: tags are written from the POST-STEP σ (the calibrated basis)', () => {
    setSeed(42);
    const { conditions, events } = SCENARIOS.stalactite_demo();
    const sim = new VugSimulator(conditions, events);
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      sim.run_step();
      let sigmaPost: number;
      try { sigmaPost = sim.conditions.supersaturation_calcite(); } catch (_e) { continue; }
      if (!isFinite(sigmaPost) || sigmaPost < 1.0) continue;
      for (const c of sim.crystals) {
        if (!c || c.mineral !== 'calcite' || c.dissolved || !c.zones.length) continue;
        const z = c.zones[c.zones.length - 1];
        if (z.step !== sim.step || z.thickness_um <= 0) continue;
        const sizeBefore = Math.max(0, c.total_growth_um - z.thickness_um);
        const expected = calciteMorphRegime(calciteSurfaceSigma(sigmaPost, sizeBefore));
        expect(z.morph_regime).toBe(expected);
        expect(c._morphology.regime).toBe(expected);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);  // the contract actually exercised
  });

  it('the validated fleet picture: stalactite stepped-dominant, mvt smooth-spar, no stable dendrite', () => {
    const stal = regimeMass(runScenario('stalactite_demo'));
    const stalTotal = Object.values(stal).reduce((s, x) => s + x, 0);
    expect(stalTotal).toBeGreaterThan(0);
    const stepped = (stal.stepped_macro || 0) + (stal.stepped_mild || 0);
    expect(stepped / stalTotal).toBeGreaterThan(0.5);
    expect((stal.dendritic || 0) / stalTotal).toBeLessThan(0.1);

    const mvt = regimeMass(runScenario('mvt'));
    const mvtTotal = Object.values(mvt).reduce((s, x) => s + x, 0);
    expect(mvtTotal).toBeGreaterThan(0);
    expect((mvt.spiral_smooth || 0) / mvtTotal).toBeGreaterThan(0.9);
  });
});

describe('calcite morphology instruments (Phase 1)', () => {

  it('zone tags carry regime + form + surf_sigma, and ride the collection record', () => {
    const sim = runScenario('stalactite_demo');
    const cal = sim.crystals.find((c: any) => c.mineral === 'calcite' && !c.dissolved && c.zones.some((z: any) => z.morph_regime));
    expect(cal).toBeTruthy();
    const tagged = cal.zones.filter((z: any) => z.morph_regime);
    for (const z of tagged) {
      expect(CALCITE_MORPH_REGIMES).toContain(z.morph_regime);
      expect(['rhombohedral', 'scalenohedral']).toContain(z.morph_form);
      expect(z.morph_surf_sigma).toBeGreaterThan(0);
    }
    // Collection record carries the tags (93-ui-collection whitelist).
    const rec = (globalThis as any).buildCrystalRecord
      ? (globalThis as any).buildCrystalRecord(cal, { mode: 'test', scenario: 'stalactite_demo', seed: 42 })
      : null;
    if (rec) {
      const recTagged = rec.zones.filter((z: any) => z.morph_regime);
      expect(recTagged.length).toBe(tagged.length);
      expect(recTagged[0].morph_surf_sigma).toBeGreaterThan(0);
    }
  });

  it('calcite_morph strip chip: Sunagawa ordinal at the anchor, null in empty rock', () => {
    const chip = _HELIX_CHEM_PARAMS.find((p: any) => p.id === 'calcite_morph');
    expect(chip).toBeTruthy();
    expect(chip.system).toBe('carbonate');
    expect(chip.min).toBe(0);
    expect(chip.max).toBe(4);

    const sim = runScenario('mvt');
    const wall = sim.wall_state || sim.conditions.wall;
    const cal = sim.crystals.find((c: any) => c.mineral === 'calcite' && !c.dissolved && c._morphology);
    expect(cal).toBeTruthy();
    const a = cal.wall_anchor;
    const atAnchor = chip.read(sim, wall, a.ringIdx, a.cellIdx);
    expect(atAnchor).toBe(CALCITE_MORPH_REGIMES.indexOf(cal._morphology.regime));
    // Empty rock: a cell far from any calcite anchor on a different ring.
    const farRing = (a.ringIdx + 7) % (wall.ring_count || 16);
    const hasCalThere = sim.crystals.some((c: any) => c.mineral === 'calcite' && !c.dissolved
      && c.wall_anchor && c.wall_anchor.ringIdx === farRing);
    if (!hasCalThere) {
      expect(chip.read(sim, wall, farRing, 0)).toBeNull();
    }
  });
});
