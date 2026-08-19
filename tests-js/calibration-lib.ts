// tests-js/calibration-lib.ts — the sharded seed-42 calibration sweep.
//
// One 745 s file was the third-heaviest in the suite (test-quarry census,
// 2026-08-18), and the quarry's sharding floor is set by the longest
// indivisible unit — so the per-scenario runs fan out across
// calibration-shard-*.test.ts (one child each under test-workflow) while
// calibration.test.ts keeps the partition/coverage proof. The shape is
// adopted from Flint's PR #8 (StonePhilosopher/vugg-simulator, commit
// 6369861), re-grounded on this tree: the baseline loads through
// AUTHENTICATED evidence exactly as the monolith did — a missing or
// tampered baseline fails closed, never skips — where the PR's lib
// silently returned null and skipped the sweep.
//
// A scenario's home shard is derived from its NAME, not its position in
// the list: index-striping re-homes every scenario whenever one is added,
// which makes per-shard timing history unreadable. With name-hashing a
// scenario moves only if CALIBRATION_SHARD_COUNT itself changes.
//
// The SIM-bump workflow is unchanged (see calibration.test.ts).

import { expect, it } from 'vitest';
import { currentEvidenceIdentity, loadAuthenticatedEvidenceJson } from './authenticated-evidence';
import { runScenario } from './helpers';

export const CALIBRATION_SHARD_COUNT = 8;

// SIM 264 commissioning measured the heaviest canonical seed-42 locality
// (Tsumeb/supergene_oxidation) at about 570 s on this host. Keep a finite
// hang detector, but size it above a complete authenticated authored
// scenario.
export const CALIBRATION_SCENARIO_TIMEOUT_MS = 900_000;

export const version = currentEvidenceIdentity.simVersion;
export const baseline = loadAuthenticatedEvidenceJson(
  `tests-js/baselines/seed42_v${version}.json`,
  'seed42-baseline',
) as Record<string, any>;

export const baselineScenarios = Object.keys(baseline).sort();

function shardOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % CALIBRATION_SHARD_COUNT;
}

export function scenariosForShard(shard: number): string[] {
  return baselineScenarios.filter(name => shardOf(name) === shard);
}

export function summarize(sim: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (!sim || !sim.crystals) return out;
  for (const c of sim.crystals) {
    if (!out[c.mineral]) {
      out[c.mineral] = { active: 0, dissolved: 0, total: 0, max_um: 0 };
    }
    out[c.mineral].total++;
    if (c.dissolved) out[c.mineral].dissolved++;
    else out[c.mineral].active++;
    if (c.total_growth_um > out[c.mineral].max_um) {
      out[c.mineral].max_um = Math.round(c.total_growth_um * 10) / 10;
    }
  }
  const sorted: Record<string, any> = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted;
}

/** The body every shard file registers: the same runScenario + summarize +
 *  toEqual per scenario the monolith ran, over this shard's slice only. */
export function registerCalibrationShard(shard: number): void {
  const names = scenariosForShard(shard);
  if (names.length === 0) {
    // A test file that registers nothing reads as a broken suite, and an
    // empty branch is one autofix from gone — pin the emptiness on purpose.
    it(`shard ${shard} carries no scenarios at v${version}`, () => {
      expect(scenariosForShard(shard)).toEqual([]);
    });
    return;
  }
  for (const name of names) {
    it(`${name} matches baseline`, { timeout: CALIBRATION_SCENARIO_TIMEOUT_MS }, () => {
      const sim = runScenario(name, { seed: 42 });
      expect(sim).toBeTruthy();  // SCENARIOS must include every baseline name
      const got = summarize(sim);
      expect(got).toEqual(baseline[name]);
    });
  }
}
