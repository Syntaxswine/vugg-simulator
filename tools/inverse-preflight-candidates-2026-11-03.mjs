// Pre-registered candidates for the Stage B preflight gate (2026-11-03).
//
// Written before any candidate was run. What was known when it was written:
// the census of every scenario's starting state and events, the canary's
// 64-seed sweep of e86ba58a (which minerals grow where, how big, and what a
// run costs), and the supersaturation code of each target mineral. No
// candidate's response to its inputs had been seen.
//
// One rule for every candidate except the control:
//   - target: the largest FREE crystal of one morphology-classified mineral
//     (not dissolved, not enclosed, larger than zero), scored by
//     size x its own smooth share (see scoreRun in inverse-preflight.mjs);
//   - L_min: the authored scenario's median largest crystal over the canary's
//     64 seeds, so the authored recipe scores about 0; L_target: 4 x L_min;
//     the "good region" is a score of at least 0.5, about twice the authored
//     size and fully smooth;
//   - inputs: the target's constituents, one competitor or inhibitor,
//     temperature and pH. Concentrations span 0.5-2x authored on a log scale,
//     temperature authored +-25%, pH authored +-1. Run length stays authored.
//
// The control is the Stage A target, the repaired Searles halite: the
// proposal's own six inputs and bounds, and the 0.5-2 mm scale from the
// first preflight. It is expected to FAIL the gate, because only salinity
// and the hold matter there. If it passes, the gate is broken.
//
// Added after review round 1 (2026-11-03), changing no run: the control's
// signature, written out so the tool checks it. It must pass G0-G3 and G5 and
// fail G4 with salinity mattering, the hold allowed to, and no other input, as
// the PR #46 review (2026-11-02) predicted: "salinity at the top of the
// smooth band and the longest hold". Loosened after review round 3 from
// "exactly salinity and the hold": the hold constrains at exactly 4 of 7
// levels, the minimum, so a near-tied base or new seeds could drop it to 3
// and void a batch on a signature the claim doesn't need.

const mult = (name, fields, lo = 0.5, hi = 2.0) => ({ name, kind: 'fluid-mult', fields, lo, hi, scale: 'log' });
const temp = (lo, hi) => ({ name: 'T', kind: 'temperature', lo, hi, scale: 'lin' });
const ph = (lo, hi) => ({ name: 'pH', kind: 'fluid-abs', field: 'pH', lo, hi, scale: 'lin' });

const SEARLES_LAST_EVENT = 270;

export const CANDIDATES = [
  {
    id: 'searles-halite-repaired',
    role: 'negative control (the Stage A target)',
    control: { fails: 'G4', must_matter: ['salinity'], may_matter: ['hold'] },
    scenario: 'searles_lake',
    mineral: 'halite',
    build(SCENARIOS) {
      // Wrapper-only repair from the first preflight: open-system wall plus one
      // final summer bake right after the authored last event.
      const s = SCENARIOS.searles_lake({ wall: { open_system: true } });
      const bake = s.events.find((e) => e.type === 'searles_summer_bake');
      s.events.push({ ...bake, step: SEARLES_LAST_EVENT + 1, name: 'Final bake (inverse-design wrapper)' });
      return s;
    },
    steps: (_s, v) => SEARLES_LAST_EVENT + Math.round(v.hold),
    inputs: [
      { name: 'salinity', kind: 'fluid-abs', field: 'salinity', lo: 120, hi: 240, scale: 'lin' },
      { name: 'concentration', kind: 'fluid-abs', field: 'concentration', lo: 0.8, hi: 1.6, scale: 'lin' },
      temp(8, 30),
      ph(7.5, 10.0),
      { name: 'competitors', kind: 'fluid-mult', fields: ['Ca', 'S', 'B', 'Mg', 'Sr'], lo: 0.25, hi: 1.5, scale: 'lin' },
      { name: 'hold', kind: 'hold', lo: 20, hi: 100, scale: 'lin' },
    ],
    authored: { salinity: 180, concentration: 1.0, T: 18, pH: 9.5, competitors: 1.0, hold: 30 },
    L_min: 0.5,
    L_target: 2.0,
  },
  {
    id: 'dripstone-calcite',
    role: 'candidate',
    scenario: 'zoned_dripstone_cave',
    mineral: 'calcite',
    inputs: [mult('Ca', ['Ca']), mult('CO3', ['CO3']), mult('Mg', ['Mg']), temp(13.5, 22.5), ph(7.4, 9.4)],
    L_min: 0.583,
    L_target: 2.332,
  },
  {
    id: 'stalactite-calcite',
    role: 'candidate',
    scenario: 'stalactite_demo',
    mineral: 'calcite',
    inputs: [mult('Ca', ['Ca']), mult('CO3', ['CO3']), mult('Mg', ['Mg']), temp(11.25, 18.75), ph(7.3, 9.3)],
    L_min: 0.769,
    L_target: 3.076,
  },
  {
    id: 'mvt-fluorite',
    role: 'candidate',
    scenario: 'mvt',
    mineral: 'fluorite',
    inputs: [mult('Ca', ['Ca']), mult('F', ['F']), mult('CO3', ['CO3']), temp(135, 225), ph(6.2, 8.2)],
    L_min: 13.138,
    L_target: 52.552,
  },
  {
    id: 'epithermal-gold',
    role: 'candidate',
    scenario: 'epithermal_telluride',
    mineral: 'native_gold',
    inputs: [mult('Au', ['Au']), mult('S', ['S']), mult('Te', ['Te']), temp(210, 350), ph(5.5, 7.5)],
    L_min: 3.088,
    L_target: 12.352,
  },
];
