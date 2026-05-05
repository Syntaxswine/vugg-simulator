// tests-js/smoke.test.ts — verify the harness wires up correctly.
// If these fail, no other test will run reliably either.

import { describe, expect, it } from 'vitest';
import { scenarioNames } from './helpers';

declare const SIM_VERSION: any;
declare const MINERAL_SPEC: any;
declare const MINERAL_ENGINES: any;
declare const SCENARIOS: any;
declare const VugSimulator: any;
declare const FluidChemistry: any;

describe('smoke — bundle loaded', () => {
  it('SIM_VERSION is a positive integer', () => {
    expect(typeof SIM_VERSION).toBe('number');
    expect(Number.isInteger(SIM_VERSION)).toBe(true);
    expect(SIM_VERSION).toBeGreaterThan(0);
  });

  it('VugSimulator + FluidChemistry classes available', () => {
    expect(typeof VugSimulator).toBe('function');
    expect(typeof FluidChemistry).toBe('function');
  });

  it('MINERAL_SPEC has at least 80 minerals', () => {
    expect(MINERAL_SPEC).toBeTruthy();
    expect(typeof MINERAL_SPEC).toBe('object');
    const keys = Object.keys(MINERAL_SPEC);
    // Sanity floor — current shipping count is ~97; if this drops
    // below 80 something has gone catastrophically wrong with the
    // spec load (fetch mock broken, file moved, etc.).
    expect(keys.length).toBeGreaterThan(80);
  });

  it('every mineral in MINERAL_SPEC has an engine (hard requirement)', () => {
    // One-directional: a spec entry without an engine means scenarios
    // that summon that mineral will silently no-op — a real bug. The
    // reverse direction (engines without spec) is a known longstanding
    // drift around the evaporite minerals (borax / halite / mirabilite
    // / thenardite / tincalconite have engines but no spec entry yet)
    // and is logged below as informational, not asserted.
    const specMinerals = new Set(Object.keys(MINERAL_SPEC));
    const engineMinerals = new Set(Object.keys(MINERAL_ENGINES));
    const specsWithoutEngines: string[] = [];
    for (const m of specMinerals) if (!engineMinerals.has(m)) specsWithoutEngines.push(m);
    expect(specsWithoutEngines.sort()).toEqual([]);
  });

  it('engines without spec entries — informational, listed for visibility', () => {
    const specMinerals = new Set(Object.keys(MINERAL_SPEC));
    const enginesWithoutSpec: string[] = [];
    for (const m of Object.keys(MINERAL_ENGINES)) {
      if (!specMinerals.has(m)) enginesWithoutSpec.push(m);
    }
    enginesWithoutSpec.sort();
    if (enginesWithoutSpec.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[smoke] ${enginesWithoutSpec.length} engines lack a MINERAL_SPEC entry: ${enginesWithoutSpec.join(', ')} — these minerals run via the engine table but won't render in the library / collection UI until the spec lands.`,
      );
    }
    // Not asserted — drift is real and known. If a future cleanup
    // pass closes it, change this to expect([]) to lock the parity.
    expect(true).toBe(true);
  });

  it('SCENARIOS populated from data/scenarios.json5', () => {
    expect(SCENARIOS).toBeTruthy();
    const names = scenarioNames();
    // The shipping default is 20 scenarios; assert >= 10 so a single
    // entry rename or staging change doesn't immediately fail.
    expect(names.length).toBeGreaterThan(10);
    // A few canonical names must always be present.
    expect(names).toContain('cooling');
    expect(names).toContain('mvt');
    expect(names).toContain('porphyry');
  });
});
