#!/usr/bin/env node
/**
 * probe-appearance-contract.mjs — would a previewed change trip the repository's locality gate?
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §4.)
 *
 * `npm run audit:localities` (tools/locality-envelope-audit.mjs, a step of `npm run ci`) holds every
 * scenario to its four tiers on a panel of three seeds, 1, 2 and 42
 * (tools/locality-frequency-contract.mjs). A species APPEARS in a run when a crystal of it exists at
 * any step, whether or not it keeps its solid. The rules, from that tool:
 *   deterministic (the scenario's expects_species and deterministic_species)   appears in 3 of 3 seeds
 *   statistical                                                               appears in 1 or 2
 *   aspirational                                                              appears in none
 *   excluded                                                                  appears in none
 * The A/B outputs in this folder were run at exactly those three seeds. For every arm of every
 * ab-*.json this probe counts, per scenario and mineral, the seeds in which the mineral appears in
 * the shipped arm and under the arm, applies the four rules, and prints each clash the arm
 * introduces and each it removes. A scenario run at fewer than the three seeds is skipped.
 *
 * What it cannot see. Appearance is read from the crystal records at run end (the tool's `species`
 * and `noSolid`), so a mineral whose every crystal was transformed into another mineral is missed;
 * the gate reads every step. The gate's first-appearance windows are not checked. And the gate reads
 * the committed claim cards and frequency receipt, which a SIM bump regenerates; this is a preview.
 *
 * It runs no simulation: it loads the bundle only to read each scenario's authored tiers through
 * tools/_harness.mjs. PASSIVE: prints to stdout, writes nothing, exits 0.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-appearance-contract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const harness = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, SIM_VERSION } = await harness.loadSimBundle({ toolName: 'probe-appearance-contract' });
const PANEL = [1, 2, 42];
const names = (entries) => (Array.isArray(entries) ? entries : []).map(e => (typeof e === 'string' ? e : e?.mineral)).filter(Boolean);
const tiersOf = {};
const tiers = (scenario) => {
  if (!tiersOf[scenario]) {
    const s = SCENARIOS[scenario]().conditions._scenario || {};
    tiersOf[scenario] = {
      deterministic: new Set([...names(s.expects_species), ...names(s.deterministic_species)]),
      statistical: new Set(names(s.statistical_species)),
      aspirational: new Set(names(s.aspirational_species)),
      excluded: new Set(Object.keys(s.excluded_species || {})),
    };
  }
  return tiersOf[scenario];
};
const appears = (run) => new Set([...Object.keys(run.species), ...Object.keys(run.noSolid)]);
// the clashes of one scenario under one arm: mineral -> text
function clashes(scenario, perSeed) {
  const t = tiers(scenario), count = {}, out = {};
  for (const set of perSeed) for (const m of set) count[m] = (count[m] || 0) + 1;
  for (const m of t.deterministic) if ((count[m] || 0) !== PANEL.length) out[m] = `deterministic ${m} appears in ${count[m] || 0} of ${PANEL.length} seeds`;
  for (const m of t.statistical) {
    const n = count[m] || 0;
    if (n === 0 || n === PANEL.length) out[m] = `statistical ${m} appears in ${n} of ${PANEL.length} seeds`;
  }
  for (const m of t.aspirational) if (count[m]) out[m] = `aspirational ${m} appears in ${count[m]} of ${PANEL.length} seeds`;
  for (const m of t.excluded) if (count[m]) out[m] = `excluded ${m} appears in ${count[m]} of ${PANEL.length} seeds`;
  return out;
}

console.log(`probe-appearance-contract — SIM ${SIM_VERSION}; the locality gate's four tiers on the seed panel ${PANEL.join(', ')}, read from the A/B outputs in this folder`);
let arms = 0, clean = 0;
const shippedClashes = new Set();
for (const file of fs.readdirSync(HERE).filter(n => /^ab-.*\.json$/.test(n)).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8'));
  const scenarios = [...new Set(j.runs.map(r => r.scenario))];
  const lines = [];
  for (const arm of j.arms) {
    arms++;
    let found = false;
    for (const scenario of scenarios) {
      const runs = PANEL.map(seed => j.runs.find(r => r.scenario === scenario && r.seed === seed));
      if (runs.some(r => !r)) continue;
      const a = clashes(scenario, runs.map(r => appears(r.A))), b = clashes(scenario, runs.map(r => appears(r.B[arm])));
      for (const text of Object.values(a)) shippedClashes.add(`${scenario}: ${text}`);
      const introduced = Object.keys(b).filter(m => !a[m]).map(m => b[m]);
      const changed = Object.keys(b).filter(m => a[m] && a[m] !== b[m]).map(m => `${b[m]} (shipped: ${a[m].replace(/^.* appears in /, '')})`);
      const removed = Object.keys(a).filter(m => !b[m]).map(m => a[m]);
      if (introduced.length || changed.length || removed.length) {
        found = true;
        lines.push(`  ${arm.padEnd(24)} ${scenario.padEnd(24)} ${[introduced.length ? 'introduces: ' + introduced.join('; ') : '', changed.length ? 'changes: ' + changed.join('; ') : '', removed.length ? 'removes: ' + removed.join('; ') : ''].filter(Boolean).join(' | ')}`);
      }
    }
    if (!found) { clean++; lines.push(`  ${arm.padEnd(24)} no tier clash introduced, changed or removed in ${scenarios.length === 1 ? scenarios[0] : 'any of its ' + scenarios.length + ' scenarios'}`); }
  }
  console.log(`\n${file}${j.seeds.length < PANEL.length ? ' — run at one seed: skipped' : ''}`);
  if (j.seeds.length >= PANEL.length) for (const l of lines) console.log(l);
}
console.log(`\narms read: ${arms}; arms that introduce, change or remove no tier clash: ${clean}`);
console.log(`tier clashes this reading finds in the SHIPPED arm (the gate passes today, so each is something a record at run end cannot show): ${[...shippedClashes].sort().join('; ') || 'none'}`);
