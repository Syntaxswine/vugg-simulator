#!/usr/bin/env node
/**
 * tools/enclosure-reach-probe.mjs — how far, and by which route, does the simulator's enclosure flag
 * reach? (locality-abundance review, 2026-10-21, §4.4 and §8)
 *
 * `_check_enclosure` (js/85c-simulator-state.ts) flags a stalled crystal as enclosed (`enclosed_by`)
 * when a crystal more than three times its size grows in the same step and is linked to it: by
 * substrate (the guest nucleated on the host, `guest-on-host`, or the host on the guest), or by
 * footprint overlap (`geometric-overlap`: the anchors lie within half the host's painted footprint
 * arc plus half the guest's plus one cell — W-F O4b, SIM 221, which replaced a string test that let
 * enclosures fire across the whole cavity). Each flag leaves an enclosure receipt on the guest
 * (schema enclosure-receipt-v1) with the route, the anchor distance and the reach. A flagged crystal
 * stops growing (js/85c-simulator-state.ts:2689), and the species cap counts only crystals that are
 * neither dissolved nor flagged (js/85b-simulator-nucleate.ts:716 — the inclusion-trail design of
 * js/85b:654–664), so the flag also makes counts.
 *
 * The count instrument tools/o4-enclosure-census.mjs lists hosts and guests per scenario at one seed;
 * this probe reads every surviving flagged crystal's receipt, with its size, the host's habit, size
 * and wall spread, and whether the host carries the simulator's _surfaceGrowth surface-fabric
 * descriptor at the end of the run (recomputed every step; not a habit class), and summarizes (a) the
 * flagged crystals a collector could see (≥ 1 mm) and (b) all flagged crystals by guest, host and
 * route, with the hosts sorted by habit into crusts or aggregates and single crystals.
 *
 * PASSIVE: runs each (scenario, seed) in-process, serially, exactly as a plain run (it reads the
 * end state only), writes .local-evidence/enclosure-reach/probe.json and prints a markdown summary.
 * The default runs are review round 4's set — porphyry, sunnyside_american_tunnel, great_salt_plains,
 * ouro_preto, roughten_gill, schneeberg, wittichen and supergene_oxidation at seeds 1, 2 and 42, and
 * bisbee at 42 — plus mvt and searles_lake at 42 (review round 5's cap examples). About 9 minutes on
 * one core, two thirds of it supergene_oxidation.
 *
 * Usage:
 *   node tools/enclosure-reach-probe.mjs
 *   node tools/enclosure-reach-probe.mjs --runs mvt@42,searles_lake@1,searles_lake@42
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.local-evidence', 'enclosure-reach');
const ROUND4 = ['porphyry', 'sunnyside_american_tunnel', 'great_salt_plains', 'ouro_preto', 'roughten_gill',
  'schneeberg', 'wittichen', 'supergene_oxidation'];
const DEFAULT_RUNS = [...ROUND4.flatMap((s) => [1, 2, 42].map((seed) => `${s}@${seed}`)), 'bisbee@42', 'mvt@42', 'searles_lake@42'];

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const runs = (arg('--runs')?.split(',') || DEFAULT_RUNS).map((x) => {
  const [scenario, seed] = x.split('@');
  if (!scenario || !/^\d+$/.test(seed || '')) throw new Error(`bad run "${x}" (want scenario@seed)`);
  return { scenario, seed: Number(seed) };
});

// The census's longest dimension (tools/assemblage-census.mjs longestMm).
const longestMm = (c) => Math.max(Number(c.c_length_mm) || 0, Number(c.a_width_mm) || 0, (Number(c.total_growth_um) || 0) / 1000);
const num = (x, d = 1) => (x == null || !Number.isFinite(Number(x)) ? null : +Number(x).toFixed(d));

const h = await import(pathToFileURL(path.join(ROOT, 'tools', '_harness.mjs')).href);
const { SCENARIOS, VugSimulator, setSeed, SIM_VERSION } = await h.loadSimBundle({ toolName: 'enclosure-reach-probe' });

const out = { tool: 'enclosure-reach-probe', sim_version: SIM_VERSION, runs: [] };
for (const { scenario, seed } of runs) {
  if (!SCENARIOS[scenario]) throw new Error(`no scenario ${scenario}`);
  const t0 = Date.now();
  setSeed(seed);
  const s = SCENARIOS[scenario]();
  const sim = new VugSimulator(s.conditions, s.events);
  const steps = s.defaultSteps ?? 100;
  for (let i = 0; i < steps; i++) sim.run_step();
  const byId = new Map(sim.crystals.map((c) => [c.crystal_id, c]));
  const flagged = [];
  for (const c of sim.crystals) {
    if (c.dissolved || c.enclosed_by == null) continue;
    const host = byId.get(c.enclosed_by);
    const r = c.enclosure_receipt || {};
    flagged.push({
      guest: c.mineral, guest_id: c.crystal_id, guest_mm: num(longestMm(c), 2),
      host: host?.mineral ?? null, host_id: c.enclosed_by, host_habit: host?.habit ?? null,
      host_surface_growth: !!host?._surfaceGrowth, host_mm: host ? num(longestMm(host)) : null,
      host_wall_spread: num(host?.wall_spread, 2), route: r.route ?? null,
      anchor_distance_mm: num(r.anchor_distance_mm), footprint_reach_mm: num(r.footprint_reach_mm),
      step: r.step ?? null,
    });
  }
  out.runs.push({ scenario, seed, steps, ms: Date.now() - t0, crystals: sim.crystals.length, flagged });
  console.error(`${scenario} seed ${seed}: ${Date.now() - t0} ms, ${flagged.length} flagged`);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(out, null, 1));

// ---- summary
// Host habits as the simulator names them, sorted by hand into crusts and aggregates against single
// crystals; a habit in neither list prints as unclassified. (The simulator's _surfaceGrowth descriptor
// is recomputed every step by classifySurfaceGrowth, js/45-morphology.ts, and is not a habit class —
// review round 6 — so it is reported separately, as read at the end of the run.)
const AGGREGATE_HABITS = new Set(['powdery crust', 'pulverulent_crust', 'drusy_crust', 'druzy_coating', 'botryoidal_crust',
  'botryoidal_manganocalcite', 'banded_massive', 'banded_agate', 'desert_rose', 'fibrous_satin_spar', 'fibrous_coating',
  'framboidal', 'fibrous_acicular', 'radiating_stellate', 'radiating_fibrous', 'intergrown_thin_plates', 'massive_granular',
  'enamel_on_cuprite', 'reniform_layer', 'reniform_globules', 'botryoidal/stalactitic', 'fan_sheaves_on_smithsonite',
  'encrusting_pyromorphite', 'azurite_sun']);
const CRYSTAL_HABITS = new Set(['prismatic', 'prismatic_imperial', 'short_prismatic', 'disphenoidal', 'yellow_hex_barrel', 'cubic',
  'hopper_cube', 'tetrahedral', 'octahedral', 'hexagonal platy', 'Tessin', 'striated_cubo_pyritohedral', 'acicular',
  'tabular_monoclinic', 'tabular_tetragonal']);
const habitClass = (h) => (AGGREGATE_HABITS.has(h) ? 'crust or aggregate' : CRYSTAL_HABITS.has(h) ? 'single crystal' : 'unclassified');
const med = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
const range = (a) => (a.length ? `${Math.min(...a).toFixed(1)}–${Math.max(...a).toFixed(1)} mm` : '—');
const all = out.runs.flatMap((r) => r.flagged.map((f) => ({ ...f, scenario: r.scenario, seed: r.seed })));
const vis = all.filter((f) => f.guest_mm >= 1);
const lines = [];
lines.push(`# Enclosure reach — SIM ${SIM_VERSION}, ${out.runs.length} runs (${out.runs.map((r) => `${r.scenario}@${r.seed}`).join(', ')})`);
const describe = (set, label) => {
  const routes = {};
  for (const f of set) routes[f.route] = (routes[f.route] || 0) + 1;
  const d = set.filter((f) => f.route === 'geometric-overlap' && f.anchor_distance_mm != null).map((f) => f.anchor_distance_mm);
  const byClass = {};
  for (const f of set) {
    const c = (byClass[habitClass(f.host_habit)] ||= {});
    c[f.host_habit] = (c[f.host_habit] || 0) + 1;
  }
  const classText = Object.entries(byClass).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([c, hs]) => `${c} ${Object.values(hs).reduce((s, n) => s + n, 0)} (${Object.entries(hs).sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h} ${n}`).join(', ')})`).join('; ');
  lines.push(`\n${label}: ${set.length} — by route ${Object.entries(routes).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}; footprint-overlap anchor distance median ${med(d)?.toFixed(1) ?? '—'} mm (${range(d)}), ${d.filter((x) => x >= 10).length} at 10 mm or more, ${d.filter((x) => x >= 30).length} at 30 mm or more. Hosts by habit: ${classText}. Host carries the simulator's _surfaceGrowth descriptor at the end of the run: ${set.filter((f) => f.host_surface_growth).length}.`);
};
describe(vis, 'Flagged crystals ≥ 1 mm');
describe(all, 'All flagged crystals');
lines.push('\n| scenario | guest | host [habit] | route | flagged ≥ 1 mm | flagged, all sizes | anchor distance | host size | footprint reach |');
lines.push('|---|---|---|---|---:|---:|---|---|---|');
const groups = {};
for (const f of all) {
  const key = `${f.scenario}|${f.guest}|${f.host} [${f.host_habit}${f.host_surface_growth ? ', surface growth' : ''}]|${f.route}`;
  (groups[key] ||= []).push(f);
}
for (const [key, g] of Object.entries(groups).sort((a, b) => a[0].split('|')[0].localeCompare(b[0].split('|')[0]) || b[1].length - a[1].length)) {
  const [scenario, guest, host, route] = key.split('|');
  const d = g.map((f) => f.anchor_distance_mm).filter((x) => x != null);
  const hs = g.map((f) => f.host_mm).filter((x) => x != null);
  const reach = g.map((f) => f.footprint_reach_mm).filter((x) => x != null);
  lines.push(`| ${scenario} | ${guest} | ${host} | ${route} | ${g.filter((f) => f.guest_mm >= 1).length} | ${g.length} | ${range(d)} | ${range(hs)} | ${range(reach)} |`);
}
const text = lines.join('\n') + '\n';
fs.writeFileSync(path.join(OUT, 'summary.md'), text);
console.log(text);
