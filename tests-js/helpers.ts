// tests-js/helpers.ts — common scenario-running utilities. Tests
// import these instead of poking at VugSimulator directly so the
// per-test boilerplate stays small and the contract is one place.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const CENSUS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;

/**
 * Run a scenario by name under a fixed seed and return the finished
 * VugSimulator instance. Mirrors what `runSimulation()` does in
 * 91-ui-legends.ts, minus the DOM updates.
 *
 * Returns null if the scenario name isn't registered.
 */
export function runScenario(name: string, opts: { seed?: number; steps?: number } = {}): any {
  if (!SCENARIOS || !SCENARIOS[name]) return null;
  const seed = opts.seed ?? 42;
  setSeed(seed);
  const { conditions, events, defaultSteps } = SCENARIOS[name]();
  const steps = opts.steps ?? defaultSteps ?? 100;
  const started = Date.now();
  const sim = new VugSimulator(conditions, events);
  for (let i = 0; i < steps; i++) {
    sim.run_step();
  }
  recordScenarioCensus(name, seed, steps, Date.now() - started);
  return sim;
}

/**
 * Census hook for PROPOSAL-TEST-QUARRY §4 step 2.
 *
 * The question a trajectory cache lives or dies on is whether the suite
 * repeatedly excavates the SAME (scenario, seed, steps) triple, and nothing in
 * the tree could answer it — the claim was an intuition, not a count. Setting
 * `VUGG_SCENARIO_CENSUS=1` appends one JSON line per call so it becomes a
 * count. Unset (every ordinary run, CI included) this is a single env read.
 *
 * The census file lives under `.local-evidence/`, which is the ONE directory
 * `test-workflow.mjs` excludes from its project-identity hash. Writing a
 * census anywhere else would change the repo's identity mid-run and abort the
 * very run being measured — an instrument that destroys its own measurement.
 *
 * Failures are swallowed on purpose: a census is an observer. It must never be
 * the reason a test file goes red.
 */
let censusBroken = false;

function recordScenarioCensus(name: string, seed: number, steps: number, ms: number): void {
  if (!process.env.VUGG_SCENARIO_CENSUS) return;
  try {
    const target = path.resolve(CENSUS_ROOT, '.local-evidence', 'scenario-census.jsonl');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // Attribution is not decoration. The first census could say that
    // `supergene_oxidation|42|200` was excavated twice and could not say by
    // whom — so the single edit that would retire two thirds of a trajectory
    // cache's entire measured benefit was not locatable from the receipt.
    const testPath = expect.getState().testPath;
    fs.appendFileSync(target, JSON.stringify({
      kind: 'scenario',
      file: testPath ? path.relative(CENSUS_ROOT, testPath).replaceAll('\\', '/') : null,
      scenario: name, seed, steps, ms,
    }) + '\n');
  } catch (error) {
    // Never throw — but never go quiet either. A census that fails silently
    // hands back an empty file, and an empty file reads exactly like "the
    // suite never repeats a trajectory", which is the conclusion this
    // measurement exists to test. Say so once, loudly, per process.
    if (!censusBroken) {
      censusBroken = true;
      console.error(`[scenario-census] DISABLED — could not write: ${(error as Error).message}`);
    }
  }
}

/**
 * Reduce a finished sim to the per-mineral counts the
 * tests/baselines/seed42_v*.json files use:
 *   {
 *     [mineral]: {
 *       active: <number not dissolved>,
 *       dissolved: <number dissolved>,
 *       total: <total nucleated>,
 *       max_um: <largest crystal in micrometers>
 *     }
 *   }
 *
 * Same shape across every scenario, so two summaries can diff
 * structurally.
 */
export function summarizeByMineral(sim: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (!sim || !sim.crystals) return out;
  for (const c of sim.crystals) {
    const m = c.mineral;
    if (!out[m]) out[m] = { active: 0, dissolved: 0, total: 0, max_um: 0 };
    out[m].total += 1;
    if (c.dissolved) out[m].dissolved += 1;
    else out[m].active += 1;
    const um = c.total_growth_um || 0;
    if (um > out[m].max_um) out[m].max_um = Math.round(um * 10) / 10;
  }
  return out;
}

/**
 * List of scenario names that should be available after the bundle
 * loads. Tests parameterize over this list to assert per-scenario
 * smoke-runs.
 */
export function scenarioNames(): string[] {
  if (!SCENARIOS) return [];
  return Object.keys(SCENARIOS).sort();
}
