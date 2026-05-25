// tests-js/pectolite-wollastonite-prehnite.test.ts — Ca-silicate trio (v113).
//
// Fourth commit of the Jeffrey Mine rodingite arc. Three late-stage Ca-
// silicates that complete the rodingite + skarn + basalt-amygdale
// assemblage:
//
//   Pectolite NaCa2Si3O8(OH) — radiating-spray Na-Ca inosilicate. Jeffrey
//     cabbage-petal cabinet aesthetic. Cu trace gives Larimar (Filipos
//     & Frantz 1979).
//
//   Wollastonite CaSiO3 — simplest Ca-Si endmember. Skarn workhorse
//     (~700kt/yr industrial ceramic filler).
//
//   Prehnite Ca2Al2Si3O10(OH)2 — Lake Superior + Alpine pale-green
//     botryoidal classic; substrate for datolite + epidote + zeolites
//     (Liou 1971 Am. Min. 56:507).
//
// Refs: Anthony Handbook v.IIA + v.IIB; Deer Howie Zussman v.1B + 2A;
// Liou 1971; Trommsdorff & Connolly 1996; Filipos & Frantz 1979;
// Bernardini 1981 MR 12(5):277; Bornhorst 2017 GSA Memoir 213.

import { describe, expect, it } from 'vitest';

declare const FluidChemistry: any;
declare const VugConditions: any;

describe('Pectolite NaCa2Si3O8(OH) (v113)', () => {
  it('canonical Jeffrey rodingite broth fires (spray-radiating habit)', () => {
    const fluid = new FluidChemistry({ Na: 60, Ca: 200, SiO2: 200, pH: 10.5 });
    const cond = new VugConditions({ temperature: 220, fluid });
    expect(cond.supersaturation_pectolite()).toBeGreaterThan(0);
  });

  it('Na = 0 blocks — pectolite is the Na-Ca silicate of the trio', () => {
    const fluid = new FluidChemistry({ Na: 0, Ca: 200, SiO2: 200, pH: 10.5 });
    const cond = new VugConditions({ temperature: 220, fluid });
    expect(cond.supersaturation_pectolite()).toBe(0);
  });

  it('pH = 7 blocks — alkaline-only (pH >= 8.5)', () => {
    const fluid = new FluidChemistry({ Na: 60, Ca: 200, SiO2: 200, pH: 7.0 });
    const cond = new VugConditions({ temperature: 220, fluid });
    expect(cond.supersaturation_pectolite()).toBe(0);
  });

  it('T = 400°C blocks — above 350 ceiling', () => {
    const fluid = new FluidChemistry({ Na: 60, Ca: 200, SiO2: 200, pH: 10.5 });
    const cond = new VugConditions({ temperature: 400, fluid });
    expect(cond.supersaturation_pectolite()).toBe(0);
  });

  it('Cu = 1 ppm doesn\'t block — Larimar tint dispatch (no gate)', () => {
    const fluid = new FluidChemistry({ Na: 60, Ca: 200, SiO2: 200, pH: 10.5, Cu: 1 });
    const cond = new VugConditions({ temperature: 220, fluid });
    expect(cond.supersaturation_pectolite()).toBeGreaterThan(0);
  });

  it('MINERAL_ENGINES.pectolite is wired', () => {
    const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
    expect(typeof MINERAL_ENGINES.pectolite).toBe('function');
  });
});

describe('Wollastonite CaSiO3 (v113)', () => {
  it('canonical Jeffrey rodingite broth fires', () => {
    const fluid = new FluidChemistry({ Ca: 300, SiO2: 400, pH: 10.5 });
    const cond = new VugConditions({ temperature: 350, fluid });
    expect(cond.supersaturation_wollastonite()).toBeGreaterThan(0);
  });

  it('canonical skarn broth fires (Crestmore-style)', () => {
    const fluid = new FluidChemistry({ Ca: 250, SiO2: 500, pH: 9.0 });
    const cond = new VugConditions({ temperature: 400, fluid });
    expect(cond.supersaturation_wollastonite()).toBeGreaterThan(0);
  });

  it('Ca = 30 blocks — below 80 threshold', () => {
    const fluid = new FluidChemistry({ Ca: 30, SiO2: 400, pH: 10.5 });
    const cond = new VugConditions({ temperature: 350, fluid });
    expect(cond.supersaturation_wollastonite()).toBe(0);
  });

  it('SiO2 = 100 blocks — below 200 threshold', () => {
    const fluid = new FluidChemistry({ Ca: 300, SiO2: 100, pH: 10.5 });
    const cond = new VugConditions({ temperature: 350, fluid });
    expect(cond.supersaturation_wollastonite()).toBe(0);
  });

  it('Mg = 300 marginally suppresses (Mg-rich → diopside wins)', () => {
    const fluid_lowMg = new FluidChemistry({ Ca: 300, SiO2: 400, pH: 10.5, Mg: 0 });
    const fluid_highMg = new FluidChemistry({ Ca: 300, SiO2: 400, pH: 10.5, Mg: 300 });
    const cond_low = new VugConditions({ temperature: 350, fluid: fluid_lowMg });
    const cond_high = new VugConditions({ temperature: 350, fluid: fluid_highMg });
    expect(cond_high.supersaturation_wollastonite()).toBeLessThan(cond_low.supersaturation_wollastonite());
  });

  it('MINERAL_ENGINES.wollastonite is wired', () => {
    const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
    expect(typeof MINERAL_ENGINES.wollastonite).toBe('function');
  });
});

describe('Prehnite Ca2Al2Si3O10(OH)2 (v113)', () => {
  it('canonical Lake Superior amygdale broth fires (pale-green botryoidal)', () => {
    // Keweenaw basalt amygdale: Ca-Al from plagioclase + serpentine
    // contact; T ~200°C, pH ~9, Fe trace for green color.
    const fluid = new FluidChemistry({ Ca: 200, Al: 20, SiO2: 200, pH: 9.0, Fe: 20 });
    const cond = new VugConditions({ temperature: 200, fluid });
    expect(cond.supersaturation_prehnite()).toBeGreaterThan(0);
  });

  it('canonical Jeffrey rodingite broth fires', () => {
    const fluid = new FluidChemistry({ Ca: 250, Al: 30, SiO2: 250, pH: 10.5, Fe: 10 });
    const cond = new VugConditions({ temperature: 250, fluid });
    expect(cond.supersaturation_prehnite()).toBeGreaterThan(0);
  });

  it('Al = 0 blocks — prehnite is the Ca-Al silicate of the trio', () => {
    const fluid = new FluidChemistry({ Ca: 200, Al: 0, SiO2: 200, pH: 9.0 });
    const cond = new VugConditions({ temperature: 200, fluid });
    expect(cond.supersaturation_prehnite()).toBe(0);
  });

  it('pH = 7 blocks — alkaline-only (pH >= 7.5)', () => {
    const fluid = new FluidChemistry({ Ca: 200, Al: 20, SiO2: 200, pH: 7.0 });
    const cond = new VugConditions({ temperature: 200, fluid });
    expect(cond.supersaturation_prehnite()).toBe(0);
  });

  it('T = 400°C blocks — above 350 ceiling (prehnite breaks down to anorthite + wollastonite per Liou 1971)', () => {
    const fluid = new FluidChemistry({ Ca: 200, Al: 20, SiO2: 200, pH: 9.0 });
    const cond = new VugConditions({ temperature: 400, fluid });
    expect(cond.supersaturation_prehnite()).toBe(0);
  });

  it('MINERAL_ENGINES.prehnite is wired', () => {
    const MINERAL_ENGINES = (globalThis as any).MINERAL_ENGINES;
    expect(typeof MINERAL_ENGINES.prehnite).toBe('function');
  });
});
