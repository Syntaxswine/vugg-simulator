// tests-js/uranyl-supergene.test.ts — coffinite + uranophane pins
// (v99, 2026-05-19).
//
// The U(IV) and U(VI) silicate endmembers — opposite sides of the
// U redox boundary:
//   coffinite   USiO4·nH2O               primary U(IV), reducing 100-300°C
//   uranophane  Ca(UO2)2(SiO3)2(OH)2·5H2O  supergene U(VI), oxidizing <50°C
//
// Refs: Finch & Murakami (1999) RIMG 38:91-179; Burns (2005)
// Can. Mineral. 43:1839; Stieff et al. (1955) Science 121:608
// (coffinite type); Ginderow (1988) Acta Cryst. C44:421 (uranophane
// structure); Handbook of Mineralogy.

import { describe, expect, it } from 'vitest';

declare const FluidChemistry: any;
declare const VugConditions: any;

describe('Uranyl silicates — coffinite + uranophane (v99)', () => {
  describe('Coffinite — U(IV) primary, reducing', () => {
    it('Reducing 200°C fluid with U + SiO2 gives σ > 0', () => {
      const fluid = new FluidChemistry({
        U: 5, SiO2: 100, CO3: 20, P: 0.1, O2: 0.05, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 200, fluid });
      expect(cond.supersaturation_coffinite()).toBeGreaterThan(0);
    });

    it('Oxidizing (O2 > 0.3) blocks coffinite', () => {
      const fluid = new FluidChemistry({
        U: 5, SiO2: 100, CO3: 20, P: 0.1, O2: 1.5, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 200, fluid });
      expect(cond.supersaturation_coffinite()).toBe(0);
    });

    it('High CO3 blocks (uranyl-carbonate complexes mobilize U)', () => {
      const fluid = new FluidChemistry({
        U: 5, SiO2: 100, CO3: 150, P: 0.1, O2: 0.05, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 200, fluid });
      expect(cond.supersaturation_coffinite()).toBe(0);
    });

    it('P > 1 blocks (ningyoite U(IV)-phosphate wins)', () => {
      const fluid = new FluidChemistry({
        U: 5, SiO2: 100, CO3: 20, P: 5, O2: 0.05, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 200, fluid });
      expect(cond.supersaturation_coffinite()).toBe(0);
    });
  });

  describe('Uranophane — U(VI) supergene, oxidizing', () => {
    it('Oxidizing supergene Ca-rich fluid gives σ > 0', () => {
      const fluid = new FluidChemistry({
        U: 3, Ca: 50, SiO2: 60, CO3: 30, S: 100, P: 0.1, O2: 1.0, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_uranophane()).toBeGreaterThan(0);
    });

    it('Reducing fluid blocks uranophane (needs U(VI))', () => {
      const fluid = new FluidChemistry({
        U: 3, Ca: 50, SiO2: 60, O2: 0.1, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_uranophane()).toBe(0);
    });

    it('High SO4 blocks uranophane (johannite/zippeite take precedence)', () => {
      const fluid = new FluidChemistry({
        U: 3, Ca: 50, SiO2: 60, S: 2000, O2: 1.0, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_uranophane()).toBe(0);
    });

    it('Phosphate > 5 blocks uranophane (autunite/torbernite win)', () => {
      const fluid = new FluidChemistry({
        U: 3, Ca: 50, SiO2: 60, P: 10, O2: 1.0, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_uranophane()).toBe(0);
    });

    it('High CO3 blocks (liebigite/andersonite win)', () => {
      const fluid = new FluidChemistry({
        U: 3, Ca: 50, SiO2: 60, CO3: 100, O2: 1.0, pH: 6.5,
      });
      const cond = new VugConditions({ temperature: 25, fluid });
      expect(cond.supersaturation_uranophane()).toBe(0);
    });
  });

  describe('Redox discriminator — opposite sides of the boundary', () => {
    it('Same chemistry, opposite redox: coffinite under reducing, uranophane under oxidizing', () => {
      // Same U + Ca + SiO2 fluid in both cases; only O2 differs.
      // T is shared at the only T window where both could fire (none —
      // they have non-overlapping T ranges). So we test each at its
      // own T range.
      const reducing = new FluidChemistry({
        U: 5, Ca: 50, SiO2: 100, CO3: 20, P: 0.1, O2: 0.05, pH: 6.5,
      });
      const oxidizing = new FluidChemistry({
        U: 5, Ca: 50, SiO2: 100, CO3: 20, P: 0.1, O2: 1.5, pH: 6.5,
      });
      const condReducing = new VugConditions({ temperature: 200, fluid: reducing });
      const condOxidizing = new VugConditions({ temperature: 25, fluid: oxidizing });
      expect(condReducing.supersaturation_coffinite()).toBeGreaterThan(0);
      expect(condReducing.supersaturation_uranophane()).toBe(0);
      expect(condOxidizing.supersaturation_coffinite()).toBe(0);
      expect(condOxidizing.supersaturation_uranophane()).toBeGreaterThan(0);
    });
  });

  describe('Engines registered in MINERAL_ENGINES', () => {
    it('coffinite + uranophane grow engines are wired', () => {
      const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
      expect(typeof MINERAL_ENGINES.coffinite).toBe('function');
      expect(typeof MINERAL_ENGINES.uranophane).toBe('function');
    });
  });
});
