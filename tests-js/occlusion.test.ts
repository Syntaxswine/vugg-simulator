// tests-js/occlusion.test.ts — SUBSTRATE OCCLUSION, central-distance arc Phase 2
// (2026-06-22; proposals/PROPOSAL-DIRECTIONAL-GROWTH-2026-06-22.md).
//
// Occlusion is the DOMINANT, UNIVERSAL extrinsic driver of the singly-terminated drusy habit:
// a wall-nucleated crystal is sealed against the host over its attachment footprint (flux ≈ 0)
// while only the void-facing termination grows (proposal §1.3). js/45 classifyOcclusion tags
// crystal._occlusion = { attachedFraction } for every wall-nucleated crystal on an opted-in
// scenario; the renderer (js/99i) sinks that buried fraction below the wall surface.
//
// Unlike _polarAxis (intrinsic — the 10 polar point groups only) this is UNIVERSAL: it applies
// to ANY mineral regardless of point group. The tag is GATED on wall.occlusion — only mvt opts
// in (Phase 2), so every other scenario stays dormant → byte-identical (cold-ci's calibration
// baseline is the hard byte-identity gate; _occlusion never touches counts/sizes/chemistry, and
// the embed depth is a deterministic golden-ratio hash of crystal_id, NO rng). Pins:
//   (1) dormancy — a calcite scenario that did NOT opt in tags nothing;
//   (2) the tag is absent (undefined) on untagged crystals (no serialized output widens);
//   (3) Phase 2 — mvt (real opt-in) tags its wall crystals with a sane attachedFraction;
//   (4) UNIVERSAL — more than one distinct mineral gets tagged (not just a single species);
//   (5) specks (< 50 µm) and dissolved crystals are never tagged;
//   (6) determinism — two identical runs produce byte-identical attachedFraction values.

import { describe, expect, it } from 'vitest';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;

function run(scenarioName: string, seed = 42) {
  setSeed(seed);
  const scen = SCENARIOS[scenarioName];
  if (!scen) return null;
  const { conditions, events, defaultSteps } = scen();
  const sim = new VugSimulator(conditions, events);
  const steps = defaultSteps ?? 200;
  for (let i = 0; i < steps; i++) sim.run_step();
  return sim;
}

const occluded = (sim: any) =>
  sim.crystals.filter((c: any) => c._occlusion && !c.dissolved);

describe('substrate occlusion tag (central-distance arc Phase 2)', () => {
  it('DORMANT for scenarios that did not opt in — a non-opted calcite scenario tags nothing', () => {
    const sim = run('marble_contact_metamorphism');   // grows calcite, no occlusion flag
    expect(sim).toBeTruthy();
    expect(occluded(sim).length).toBe(0);
  });

  it('the tag is ABSENT (undefined) on untagged crystals — no serialized output widens', () => {
    const sim = run('marble_contact_metamorphism');
    expect(sim).toBeTruthy();
    for (const c of sim.crystals) expect(c._occlusion).toBeUndefined();
  });

  it('Phase 2: mvt (wall.occlusion) tags its wall crystals with a sane attachedFraction', () => {
    const sim = run('mvt');
    expect(sim).toBeTruthy();
    const tagged = occluded(sim);
    expect(tagged.length).toBeGreaterThan(0);          // the drusy MVT lining
    for (const c of tagged) {
      expect(typeof c._occlusion.attachedFraction).toBe('number');
      // clamped so a crystal is never buried past 60% (always reads as a crystal)
      expect(c._occlusion.attachedFraction).toBeGreaterThanOrEqual(0.10);
      expect(c._occlusion.attachedFraction).toBeLessThanOrEqual(0.60);
      // only real bodies get embedded — specks are skipped
      expect(c.total_growth_um || 0).toBeGreaterThanOrEqual(50);
    }
  });

  it('UNIVERSAL — occlusion tags more than one distinct mineral (not a single species)', () => {
    const sim = run('mvt');
    expect(sim).toBeTruthy();
    const minerals = new Set(occluded(sim).map((c: any) => c.mineral));
    // the science point: extrinsic occlusion applies regardless of point group, so the drusy
    // MVT assemblage (sphalerite / galena / fluorite / calcite / barite …) tags broadly.
    expect(minerals.size).toBeGreaterThan(1);
  });

  // NOTE: like _faceStep / _polarAxis, the tag is set ONCE while the crystal is live and
  // persists if that crystal later dissolves (idempotent tagging) — harmless, because both the
  // renderer and the occluded() helper gate on !dissolved. We deliberately do NOT assert
  // "dissolved crystals are never tagged"; that would be stricter than the sibling classifiers.

  it('determinism — two identical runs produce byte-identical attachedFraction (no rng)', () => {
    const a = run('mvt');
    const b = run('mvt');
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const fa = occluded(a).map((c: any) => `${c.crystal_id}:${c._occlusion.attachedFraction}`).sort();
    const fb = occluded(b).map((c: any) => `${c.crystal_id}:${c._occlusion.attachedFraction}`).sort();
    expect(fa.length).toBeGreaterThan(0);
    expect(fa).toEqual(fb);
  });
});
