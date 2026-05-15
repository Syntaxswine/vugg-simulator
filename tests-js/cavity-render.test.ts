// tests-js/cavity-render.test.ts — Tier 1 C plumbing.
//
// Pins the cavity_render scenario knob:
//   * VugWall defaults cavity_render to 'smooth'.
//   * VugWall accepts cavity_render via opts.
//   * WallState picks up cavity_render at simulator construction from
//     conditions.wall (so the Three.js renderer can read it off
//     sim.wall_state without reaching back to VugWall).
//   * Scenarios that declare cavity_render in initial.wall flow it
//     through scenarioCallable → VugWall → WallState end-to-end. The
//     two demos shipped with this feature (gem_pegmatite,
//     epithermal_telluride — both brittle silicate hosts) are pinned
//     here so a future scenario edit that drops the field gets caught
//     by the suite.
//
// What this is NOT testing: that flatShading actually flips on the
// THREE.MeshStandardMaterial. The renderer path runs inside a real
// WebGL canvas; jsdom doesn't provide one. The test for the renderer
// branch is "this field arrives on wall_state with the right value;
// the renderer reads it from that single field." If the renderer
// later forgets to read wall.cavity_render, that's a separate
// regression visible only in a foreground browser session.

import { describe, expect, it } from 'vitest';

declare const VugSimulator: any;
declare const VugConditions: any;
declare const VugWall: any;
declare const FluidChemistry: any;
declare const SCENARIOS: any;

function makeConditions(wallOpts: any = {}) {
  return new VugConditions({
    fluid: new FluidChemistry({
      Ca: 100, CO3: 100, SiO2: 100, Mg: 50, Fe: 5, pH: 7,
      salinity: 0, concentration: 1.0,
    }),
    wall: new VugWall(wallOpts),
    temperature: 50,
    pressure_bars: 1,
    depth_m: 0,
    oxygen_fugacity: -50,
  });
}

describe('Tier 1 C — cavity_render plumbing', () => {
  it('VugWall defaults cavity_render to "smooth"', () => {
    const wall = new VugWall();
    expect(wall.cavity_render).toBe('smooth');
  });

  it('VugWall accepts cavity_render via opts', () => {
    expect(new VugWall({ cavity_render: 'sharp' }).cavity_render).toBe('sharp');
    expect(new VugWall({ cavity_render: 'smooth' }).cavity_render).toBe('smooth');
  });

  it('WallState defaults cavity_render to "smooth" when simulator constructs it from a default VugWall', () => {
    const sim = new VugSimulator(makeConditions(), []);
    expect(sim.wall_state.cavity_render).toBe('smooth');
  });

  it('WallState picks up cavity_render from VugWall through simulator construction', () => {
    const sim = new VugSimulator(makeConditions({ cavity_render: 'sharp' }), []);
    expect(sim.wall_state.cavity_render).toBe('sharp');
  });

  it('gem_pegmatite scenario declares cavity_render: "sharp" (miarolitic crisp dissolution surfaces)', () => {
    const scen = SCENARIOS.gem_pegmatite;
    expect(scen).toBeDefined();
    // _json5_spec lives on the scenario callable (function), holding the
    // raw scenario JSON5 block.
    const spec = (scen as any)._json5_spec;
    expect(spec).toBeDefined();
    expect(spec.initial?.wall?.cavity_render).toBe('sharp');
    // End-to-end: instantiate the scenario and assert wall_state
    // carries the flag through to where the renderer reads it. The
    // scenario callable returns { conditions, events, defaultSteps }.
    const { conditions, events } = scen();
    const sim = new VugSimulator(conditions, events);
    expect(sim.wall_state.cavity_render).toBe('sharp');
  });

  it('epithermal_telluride scenario declares cavity_render: "sharp" (phonolite vein crispness)', () => {
    const scen = SCENARIOS.epithermal_telluride;
    expect(scen).toBeDefined();
    const spec = (scen as any)._json5_spec;
    expect(spec).toBeDefined();
    expect(spec.initial?.wall?.cavity_render).toBe('sharp');
    const { conditions, events } = scen();
    const sim = new VugSimulator(conditions, events);
    expect(sim.wall_state.cavity_render).toBe('sharp');
  });

  it('scenarios without an explicit cavity_render fall through to "smooth" default', () => {
    // Pick a scenario that does NOT declare cavity_render — sabkha
    // dolomitization is a carbonate-dominant evaporite cavity (smooth
    // is the right call geologically — carbonate weathering rounds
    // dihedral creases).
    const scen = SCENARIOS.sabkha_dolomitization;
    expect(scen).toBeDefined();
    const { conditions, events } = scen();
    const sim = new VugSimulator(conditions, events);
    expect(sim.wall_state.cavity_render).toBe('smooth');
  });
});
