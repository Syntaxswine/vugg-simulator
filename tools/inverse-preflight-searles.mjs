// The first inverse-design preflight's 16-run reproduction (PR #46 review,
// 2026-11-02): Searles halite as the 2026-10-31 proposal wrote it, against the
// wrapper-only repair (open-system wall plus one final summer bake at step 271).
// About 2 minutes from a built checkout:
//
//   node tools/inverse-preflight-searles.mjs [repo]
//
// Output on e86ba58a, Windows x64, Node 24.15.0: as written, 0-2 free crystals
// of 0.035-0.110 mm; repaired, 9-12 free crystals, all smooth, the largest
// 0.48-0.50 mm at salinity 135, 1.13-1.19 at 145, 1.48-1.56 at 150. The table
// is in proposals/PROPOSAL-INVERSE-DESIGN-OVERNIGHT-PILOT-2026-10-31.md.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(process.argv[2] ?? '.');
const { loadSimBundle } = await import(pathToFileURL(path.join(repo, 'tools/_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed } = await loadSimBundle({ toolName: 'inverse-preflight' });

const LAST_EVENT = 270;
const HOLD = 100;

function run(salinity, seed, repaired) {
  setSeed(seed);
  const s = repaired ? SCENARIOS.searles_lake({ wall: { open_system: true } }) : SCENARIOS.searles_lake();
  s.conditions.fluid.salinity = salinity;
  if (repaired) {
    const bake = s.events.find((e) => e.type === 'searles_summer_bake');
    s.events.push({ ...bake, step: LAST_EVENT + 1, name: 'Final bake (preflight)' });
  }
  const sim = new VugSimulator(s.conditions, s.events);
  for (let i = 0; i < LAST_EVENT + HOLD; i++) sim.run_step();

  const live = sim.crystals.filter((c) => c.mineral === 'halite' && !c.dissolved);
  const free = live.filter((c) => c.active && c.total_growth_um > 0);
  let smooth = 0;
  let all = 0;
  for (const c of live) {
    for (const z of c.zones) {
      const t = z.thickness_um || 0;
      if (t <= 0) continue;
      all += t;
      if (z.morph_regime === 'spiral_smooth') smooth += t;
    }
  }
  return { live: live.length, free: free.length, smooth: all ? smooth / all : 0, largest: Math.max(0, ...live.map((c) => c.c_length_mm)) };
}

console.log('variant     salinity seed  live free smooth largest_mm');
for (const [name, repaired, salinities] of [['as written', false, [145]], ['repaired', true, [135, 145, 150]]]) {
  for (const salinity of salinities) {
    for (const seed of [1, 2, 3, 4]) {
      const r = run(salinity, seed, repaired);
      console.log(`${name.padEnd(11)} ${String(salinity).padStart(8)} ${String(seed).padStart(4)} ${String(r.live).padStart(5)} ${String(r.free).padStart(4)} ${r.smooth.toFixed(2).padStart(6)} ${r.largest.toFixed(3).padStart(10)}`);
    }
  }
}
