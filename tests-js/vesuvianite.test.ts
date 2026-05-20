// tests-js/vesuvianite.test.ts — vesuvianite Ca10(Mg,Fe)2Al4(SiO4)5(Si2O7)2(OH)4
// (v111, 2026-05-20).
//
// Second mineral of the Jeffrey Mine rodingite arc. Tetragonal P4/nnc Ca-Mg-Al
// sorosilicate, also called IDOCRASE. Three settings — rodingite + skarn +
// carbonatite — all sharing high-Ca + Mg + Al + Si chemistry under alkaline
// conditions. CYPRINE variety (Cu-bearing sky-blue) is the load-bearing Jeffrey
// Mine cabinet aesthetic per Bernardini 1981 MR 12(5):277. Cu²⁺-O charge
// transfer at 0.5-5 ppm Cu gives sky-blue; > 5 ppm deepens to azure.
//
// Tests verify:
//  - canonical rodingite broth fires (Ca=300, Mg=80, Al=30, SiO2=300, pH=10.5,
//    T=300)
//  - canonical skarn broth fires (Ca=200, Mg=50, Al=20, SiO2=400, pH=9.0,
//    T=400)
//  - Mg=0 blocks (rodingite/skarn both require Mg)
//  - Al=0 blocks (rodingite/skarn both require Al)
//  - pH=7 blocks (neutral — vesuvianite is alkaline-only)
//  - T=600 blocks (above 500 ceiling)
//  - T=120 blocks (below 180 floor)
//  - cyprine Cu=2 ppm dispatch works (existing Cu field, no new infra)
//  - MINERAL_ENGINES.vesuvianite is wired

import { describe, expect, it } from 'vitest';

declare const FluidChemistry: any;
declare const VugConditions: any;

describe('Vesuvianite — Ca10(Mg,Fe)2Al4(SiO4)5(Si2O7)2(OH)4 (v111)', () => {
  describe('supersaturation gate', () => {
    it('canonical Jeffrey rodingite broth gives sigma > 0', () => {
      // Jeffrey Mine rodingite contact: hyperalkaline serpentinization fluid
      // + mafic-dike-derived Ca-Al-Si. T ~300°C, pH ~10.5.
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBeGreaterThan(0);
    });

    it('canonical skarn broth gives sigma > 0', () => {
      // Contact-metamorphic skarn: limestone-derived Ca + Mg-dolomite +
      // pelitic Al + silicate-melt SiO2. T ~400°C, pH ~9.
      const fluid = new FluidChemistry({ Ca: 200, Mg: 50, Al: 20, SiO2: 400, pH: 9.0 });
      const cond = new VugConditions({ temperature: 400, fluid });
      expect(cond.supersaturation_vesuvianite()).toBeGreaterThan(0);
    });

    it('Mg = 0 blocks — rodingite + skarn both require Mg', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 0, Al: 30, SiO2: 300, pH: 10.5 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });

    it('Al = 0 blocks — rodingite + skarn both require Al', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 0, SiO2: 300, pH: 10.5 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });

    it('pH = 7 blocks — vesuvianite is alkaline-only (pH >= 8.5)', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 7.0 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });

    it('T = 600°C blocks — above 500 ceiling (breaks down to grossular + diopside + wollastonite)', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5 });
      const cond = new VugConditions({ temperature: 600, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });

    it('T = 120°C blocks — below 180 floor', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5 });
      const cond = new VugConditions({ temperature: 120, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });

    it('SiO2 = 100 (below 200 threshold) blocks', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 100, pH: 10.5 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBe(0);
    });
  });

  describe('cyprine variety — Cu trace dispatch off existing Cu field', () => {
    it('Cu = 2 ppm (cyprine sky-blue range) does not block sigma', () => {
      // Cu is a color/habit dispatch, NOT a gate — vesuvianite fires
      // with or without Cu. This test asserts that adding Cu trace
      // doesn't shift the sigma below threshold.
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5, Cu: 2 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBeGreaterThan(0);
    });

    it('Cu = 10 ppm (deep-azure cyprine range) does not block sigma', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5, Cu: 10 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBeGreaterThan(0);
    });

    it('Cu = 0 (no chromophore) does not block sigma — vesuvianite still fires as brown idocrase', () => {
      const fluid = new FluidChemistry({ Ca: 300, Mg: 80, Al: 30, SiO2: 300, pH: 10.5, Cu: 0 });
      const cond = new VugConditions({ temperature: 300, fluid });
      expect(cond.supersaturation_vesuvianite()).toBeGreaterThan(0);
    });
  });

  describe('Engine registered in MINERAL_ENGINES', () => {
    it('vesuvianite grow engine is wired', () => {
      const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
      expect(typeof MINERAL_ENGINES.vesuvianite).toBe('function');
    });
  });
});
