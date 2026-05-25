// tests-js/plumbogummite.test.ts — Pb-Al-PO4 alunite-supergroup
// endmember (v108, 2026-05-20). Type-locality mineral for the v107
// Roughten Gill scenario. Second dogfood test of vugg-add-mineral
// skill (v102 pyrolusite was the first).
//
// References:
//   * Hartley J. (1882) MinMag 5:21 — original type description from
//     Roughten Gill, Caldbeck Fells, Cumbria
//   * Förtsch E.B. (1967) MinMag 36:530 — X-ray/IR re-examination of
//     type material; plumbogummite-hinsdalite-hidalgoite mix-crystal
//   * Bridges et al. (2011) JRS 14:3 — modern Roughten Gill paper
//   * Cooper & Stanley (1990) Minerals of the English Lake District:
//     Caldbeck Fells (canonical monograph)

import { describe, expect, it } from 'vitest';

declare const FluidChemistry: any;
declare const VugConditions: any;

describe('Plumbogummite PbAl3(PO4)2(OH)5·H2O — Pb-Al-PO4 (v108)', () => {
  describe('canonical fluid gates', () => {
    it('Pb-Al-PO4 supergene fluid (T 25, Pb 60, Al 8, P 4, pH 5.5, O2 1) gives σ > 0', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBeGreaterThan(0);
    });

    it('Pb < 30 blocks (below supergene Pb threshold)', () => {
      const fluid = new FluidChemistry({
        Pb: 20, Al: 8, P: 4, O2: 1.0, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('Al < 3 blocks (KEY discriminator — non-aluminous host)', () => {
      // Without Al, plumbogummite doesn't form — Pb stays as
      // pyromorphite/mimetite/cerussite/anglesite instead. This is the
      // wallrock-weathering chemistry signature.
      const fluid = new FluidChemistry({
        Pb: 60, Al: 1, P: 4, O2: 1.0, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('P < 2 blocks (no PO4 source)', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 1, O2: 1.0, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('T > 50 blocks (supergene-only)', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 80, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('Low O2 blocks (oxidizing required)', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 0.2, pH: 5.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('Acidic pH < 4 blocks (acid dissolution window)', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 3.0,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });

    it('Alkaline pH > 7.5 blocks', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 8.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_plumbogummite()).toBe(0);
    });
  });

  describe('Cl suppression — favors pyromorphite stability at high Cl', () => {
    it('Low Cl gives full σ', () => {
      const fluid = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 5.5, Cl: 5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      const sigmaLowCl = cond.supersaturation_plumbogummite();
      expect(sigmaLowCl).toBeGreaterThan(0);
    });

    it('High Cl > 30 suppresses σ vs low-Cl baseline (favors pyromorphite)', () => {
      const fluidLow = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 5.5, Cl: 5,
      });
      const fluidHigh = new FluidChemistry({
        Pb: 60, Al: 8, P: 4, O2: 1.0, pH: 5.5, Cl: 80,
      });
      const condLow = new VugConditions({ temperature: 25, fluid: fluidLow });
      const condHigh = new VugConditions({ temperature: 25, fluid: fluidHigh });
      expect(condHigh.supersaturation_plumbogummite())
        .toBeLessThan(condLow.supersaturation_plumbogummite());
    });
  });

  describe('Engine registered in MINERAL_ENGINES', () => {
    it('plumbogummite grow engine is wired', () => {
      const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
      expect(typeof MINERAL_ENGINES.plumbogummite).toBe('function');
    });
  });
});
