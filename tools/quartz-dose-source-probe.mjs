#!/usr/bin/env node
// tools/quartz-dose-source-probe.mjs — where does a quartz's radiation_damage come
// from, crystal by crystal, and does the narrator say so? PASSIVE: it runs shipped
// scenarios, reports, and exits 0; it gates nothing.
//
// The browser runtime has two writers of crystal.radiation_damage:
//   H  grow_quartz, js/59-engines-silicate.ts — the host rock's dose, clamped at
//      QUARTZ_HOST_DOSE_CEILING with every write;
//   U  the uraninite block of run_step, js/85-simulator.ts — 0.02 x size per active
//      uraninite to every other active crystal, with no ceiling.
// The simulator keeps one number per crystal and does not keep the two apart, so the
// quartz narrator (js/92i) names a source only where that number settles it. This
// probe measures what the narrator cannot: it splits each crystal's damage exactly.
//   - U is replicated at the entry of _check_enclosure, the call that follows the
//     uraninite block in run_step, with the block's own formula; nothing changes a
//     crystal's `active` flag or its size between the two.
//   - H of a step = (damage after the step) - (damage before) - (U of the step).
//     It is negative when the clamp cuts down damage a uraninite took past the ceiling.
// It then prints the narrator's sentence for every quartz past the smoky threshold
// (0.3) and tallies: braces left in the text that are not crystal-form notation (an
// unfilled "{word}", an empty "{}"; the audit's own reading, strayBraces in
// tools/narrative-workflow.mjs), sentences that name a uraninite the crystal got
// nothing from, and sentences that name the host rock likewise.
//
// Booking "the rest" to the host rock would hide a third writer, so the probe also
// counts what the host rock cannot have done: a change of that kind on a crystal
// that is not a quartz (grow_quartz is the only engine with a host dose), and a
// quartz the change left past the ceiling. Both should read zero.
//
// Each scenario runs in its own cavity through the Simulation-mode entry
// (startSimulationCommandRuntime). About seven minutes a seed for all scenarios.
// --random-vugg N runs Random Vugg instead (js/96 buildRandomScenario, the size
// select left at "any"), seeds 1..N of one archetype: its wall is the default
// limestone, so there a quartz has the uraninite and nothing else.
//
// Usage: node tools/quartz-dose-source-probe.mjs [--seeds 42,1,2] [--scenarios a,b] [--full-narrative]
//        node tools/quartz-dose-source-probe.mjs --random-vugg 40 [--archetype pegmatite]

import { loadSimBundle } from './_harness.mjs';
import { strayBraces } from './narrative-workflow.mjs';

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
const RANDOM_VUGG = parseInt(arg('--random-vugg', '0'), 10) || 0;
const ARCHETYPE = arg('--archetype', 'pegmatite');
const SEEDS = RANDOM_VUGG
  ? Array.from({ length: RANDOM_VUGG }, (_, i) => i + 1)
  : String(arg('--seeds', '42')).split(',').map(s => parseInt(s, 10));
const ONLY = arg('--scenarios', '');
const FULL = process.argv.includes('--full-narrative');

const { SIM_VERSION, SCENARIOS, VugSimulator, setSeed, startSimulationCommandRuntime, makeSimulationStartCommand, buildRandomScenario, QUARTZ_HOST_DOSE_CEILING } = await loadSimBundle({
  toolName: 'quartz-dose-source-probe',
  extraExports: ['startSimulationCommandRuntime', 'makeSimulationStartCommand', 'buildRandomScenario', 'QUARTZ_HOST_DOSE_CEILING'],
});
const names = RANDOM_VUGG ? [`random vugg (${ARCHETYPE})`] : (ONLY ? ONLY.split(',') : Object.keys(SCENARIOS).sort());
console.log(`quartz-dose-source-probe — SIM ${SIM_VERSION}; ${names.length} scenario(s); seeds ${SEEDS.join(', ')}`);

// The game's own start for each mode: Simulation's command runtime, or Random Vugg's
// builder under its seeded generator (js/96 runRandomVugg).
function startRun(name, seed) {
  if (!RANDOM_VUGG) {
    const runtime = startSimulationCommandRuntime(makeSimulationStartCommand(name, seed, undefined));
    return { sim: runtime.sim, steps: runtime.scenarioData.defaultSteps ?? 100 };
  }
  setSeed(seed);
  const scenario = buildRandomScenario(ARCHETYPE, 'any');
  return { sim: new VugSimulator(scenario.conditions, scenario.events), steps: scenario.defaultSteps };
}

// Braces left in printed text that are not crystal-form notation: the audit's own reading.
const unfilled = (text) => {
  const stray = new Set(strayBraces(text));
  return (text.match(/\{[^{}]*\}/g) || []).filter(braces => stray.has(braces));
};
const tally = {
  runs: 0, runsWithUraniniteDose: 0, quartzPast: 0, narrated: 0,
  hostOnly: 0, uraniniteOnly: 0, both: 0, neither: 0,
  sentenceHost: 0, sentenceUraninite: 0, sentenceNoSource: 0,
  namesUraniniteFalsely: 0, namesHostFalsely: 0, hostSentenceButUraniniteDosed: 0,
  placeholders: 0, runsWithPlaceholderInNarrative: 0, quartzUndosedInARunWithUraniniteDose: 0,
  changesOffQuartzNotFromUraninite: 0, quartzLeftPastCeilingByHost: 0,
};
const CEILING = QUARTZ_HOST_DOSE_CEILING;   // js/59: the engine's own constant
const quiet = [];

for (const name of names) {
  for (const seed of SEEDS) {
    const t0 = Date.now();
    const { sim, steps } = startRun(name, seed);
    const fromU = new Map(); const hostUp = new Map(); const hostDown = new Map();
    let stepU = new Map();
    const original = sim._check_enclosure;
    sim._check_enclosure = function (...args) {
      stepU = new Map();
      for (const u of this.crystals) {
        if (u.mineral !== 'uraninite' || !u.active) continue;
        const dose = 0.02 * (u.total_growth_um / 1000);
        for (const other of this.crystals) {
          if (other === u || !other.active) continue;
          stepU.set(other, (stepU.get(other) || 0) + dose);
        }
      }
      return original.apply(this, args);
    };
    for (let i = 0; i < steps; i++) {
      const before = new Map(sim.crystals.map(c => [c, c.radiation_damage || 0]));
      stepU = new Map();
      sim.run_step();
      for (const c of sim.crystals) {
        const u = stepU.get(c) || 0;
        const h = (c.radiation_damage || 0) - (before.get(c) || 0) - u;
        if (u) fromU.set(c, (fromU.get(c) || 0) + u);
        if (h > 1e-12) hostUp.set(c, (hostUp.get(c) || 0) + h);
        else if (h < -1e-12) hostDown.set(c, (hostDown.get(c) || 0) + h);
        // What the host rock cannot have done (1e-9: the block sums one dose per uraninite).
        if (c.mineral !== 'quartz' && Math.abs(h) > 1e-9) tally.changesOffQuartzNotFromUraninite += 1;
        if (c.mineral === 'quartz' && h > 1e-9 && !u && c.radiation_damage > CEILING) tally.quartzLeftPastCeilingByHost += 1;
      }
    }
    tally.runs += 1;
    const runDose = sim.radiation_dose || 0;
    if (runDose > 0) tally.runsWithUraniniteDose += 1;
    const wall = sim.conditions.wall || {};
    const uraninites = sim.crystals.filter(c => c.mineral === 'uraninite');
    const firstStep = Math.min(...sim.crystals.map(c => c.nucleation_step));
    const quartz = sim.crystals.filter(c => c.mineral === 'quartz' && (c.radiation_damage || 0) > 0.3);
    const narrative = typeof sim.narrate === 'function' ? sim.narrate() : '';
    const left = unfilled(narrative);
    if (left.length) tally.runsWithPlaceholderInNarrative += 1;
    const head = `${name} seed ${seed}: wall ${wall.composition}${wall.gamma_host ? ` gamma_host ${wall.gamma_host}` : ''}; `
      + `uraninite crystals ${uraninites.length}; run radiation_dose ${runDose.toFixed(3)}; `
      + `quartz past 0.3: ${quartz.length} of ${sim.crystals.filter(c => c.mineral === 'quartz').length}; `
      + `template variables left in the run's narrative: ${left.length ? [...new Set(left)].join(' ') : 'none'} `
      + `(${((Date.now() - t0) / 1000).toFixed(0)} s)`;
    if (quartz.length || left.length || FULL) console.log(`\n${head}`);
    else quiet.push(head);
    for (const c of quartz) {
      tally.quartzPast += 1;
      const u = fromU.get(c) || 0, up = hostUp.get(c) || 0, down = hostDown.get(c) || 0;
      const cls = u > 0 && up > 0 ? 'both' : u > 0 ? 'uraniniteOnly' : up > 0 ? 'hostOnly' : 'neither';
      tally[cls] += 1;
      if (runDose > 0 && !(u > 0)) tally.quartzUndosedInARunWithUraniniteDose += 1;
      // narrate() tells a crystal's story when it is among the first to nucleate or has over 100 um of growth.
      const narrated = c.zones.length > 0 && (c.nucleation_step === firstStep || c.total_growth_um > 100);
      const text = c.zones.length ? sim._narrate_quartz(c) : '';
      const sentence = (text.match(/[^.]*(?:smoky|morion)[^.]*\.(?:[^.]*growth zones[^.]*\.)?/i) || [''])[0].trim();
      const leftHere = unfilled(text);
      if (narrated) {
        tally.narrated += 1;
        tally.placeholders += leftHere.length;
        const namesUraninite = /uraninite/i.test(sentence), namesHost = /host rock/i.test(sentence);
        if (namesUraninite) tally.sentenceUraninite += 1;
        else if (namesHost) tally.sentenceHost += 1;
        else tally.sentenceNoSource += 1;
        if (namesUraninite && !(u > 0)) tally.namesUraniniteFalsely += 1;
        if (namesHost && !(up > 0)) tally.namesHostFalsely += 1;
        if (namesHost && u > 0) tally.hostSentenceButUraniniteDosed += 1;
      }
      console.log(`  quartz #${c.crystal_id} ${(c.total_growth_um / 1000).toFixed(2)} mm, born step ${c.nucleation_step}, `
        + `${c.active ? 'active' : 'inactive'}; damage ${c.radiation_damage.toFixed(3)} = host +${up.toFixed(3)} `
        + `${down ? `(clamp ${down.toFixed(3)}) ` : ''}+ uraninite ${u.toFixed(3)} -> ${cls}; `
        + `${narrated ? 'narrated' : 'not narrated (under 100 um and not first)'}`
        + `${leftHere.length ? `; LEFT ${leftHere.join(' ')}` : ''}`);
      if (sentence) console.log(`      "${sentence}"`);
    }
    if (FULL) console.log(`\n${narrative}\n`);
  }
}
if (quiet.length) {
  console.log('\nRuns with no quartz past 0.3 and no template variable left:');
  for (const row of quiet) console.log(`  ${row}`);
}
console.log(`\nTALLY ${JSON.stringify(tally)}`);
