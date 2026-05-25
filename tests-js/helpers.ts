// tests-js/helpers.ts — common scenario-running utilities. Tests
// import these instead of poking at VugSimulator directly so the
// per-test boilerplate stays small and the contract is one place.

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
  const sim = new VugSimulator(conditions, events);
  for (let i = 0; i < steps; i++) {
    sim.run_step();
  }
  return sim;
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
