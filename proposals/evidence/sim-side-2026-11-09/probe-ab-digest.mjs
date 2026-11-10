#!/usr/bin/env node
/**
 * probe-ab-digest.mjs — the counts the review draws from the A/B outputs in this folder
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.1, §3.1, §3.3, §4).
 *
 * It runs no simulation. It reads the ab-*.json files beside it, which tools/sim-side-ab.mjs wrote,
 * and the three census reports, and prints what the document says about them in one place:
 *
 *   refund    per seed: scenarios moved (the tool's own test: a species' count changed, or its largest
 *             crystal by a factor of more than 1.25 either way, or a species was gained or lost);
 *             scenarios in which a species whose largest crystal is 1 mm or more in either arm changed
 *             that size by such a factor; scenarios whose fill rose by more than ten points; species
 *             lost; pockets that fill, and when; the arm runs whose audits read differently from the
 *             shipped arm's; and, from the census of the same seed, how the scenarios the arm moves
 *             and the ones it leaves alone read in the passive draw-down table.
 *   feldspar  per shape and seed: scenarios moved of 13, species lost, ouro_preto's fill, bisbee's count;
 *             then what the clamp does to the feldspar pair in every scenario it moves, and whether the
 *             clamp on the rate (rclamp=7) differs from the clamp on sigma (cap=8) anywhere.
 *   clamp     per clamp value and seed: gem_pegmatite's fill, tourmaline and topaz, beside the feldspar
 *             pair of the six other scenarios whose sigma passes the clamp.
 *   lead      radiogenic lead removed from the bulk handle (nopb), in the plugged pocket and the open
 *             one: plumbogummite, and how many negative zones the uraninites took.
 *   excess    per constant and seed: species moved other than the three engines' own, and porphyry's fill.
 *   boron     whether ten times the boron is identical to its reference, plugged and open.
 *
 * PASSIVE: prints to stdout, writes nothing, exits 0. Imports only node builtins.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-ab-digest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), 'utf8'));
const SEEDS = [42, 1, 2];
const mm = (um) => (um / 1000).toFixed(um < 1000 ? 3 : 1);
const pct = (x, d = 1) => `${(x * 100).toFixed(d)} %`;
const changed = (b) => b.moved.length > 0 || b.gained.length > 0 || b.lost.length > 0;
const factor = (a, c) => Math.abs(Math.log((c + 1) / (a + 1))) > Math.log(1.25);
const sizeMoved = (A, B) => [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].filter(k => {
  const a = A.species[k]?.max_um || 0, c = B.species[k]?.max_um || 0;
  return Math.max(a, c) >= 1000 && factor(a, c);
});
const size = (sp, m) => (sp[m] ? `${mm(sp[m].max_um)} ×${sp[m].n}` : 'none');

console.log('refund=1 — every positive zone\'s debit returned to its cell (ab-refund-seed-*.json; census-seed-*.json)');
for (const seed of SEEDS) {
  const j = load(`ab-refund-seed-${seed}.json`), census = load(`census-seed-${seed}.json`);
  const arm = 'refund=1';
  const draw = Object.fromEntries(census.draw.scenarios.map(x => [x.scenario, x]));
  const moved = j.runs.filter(r => changed(r.B[arm])), still = j.runs.filter(r => !changed(r.B[arm]));
  const big = j.runs.filter(r => sizeMoved(r.A, r.B[arm]).length > 0);
  const fillUp = j.runs.filter(r => r.B[arm].fill - r.A.fill > 0.10);
  const lost = j.runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${r.B[arm].lost.join(', ')})`);
  const fills = j.runs.filter(r => r.B[arm].full != null && r.B[arm].full !== r.A.full).map(r => `${r.scenario} ${r.A.full ?? 'never'} → ${r.B[arm].full}`);
  const under1 = (r) => draw[r.scenario].stored_mm > 0 && draw[r.scenario].half < 0.01;
  console.log(`  seed ${String(seed).padStart(2)}: ${j.runs.length} scenarios; moved ${moved.length}; a species' largest crystal, 1 mm or more in either arm, changed by a factor of more than 1.25 in ${big.length}; fill rose by more than ten points in ${fillUp.length}`);
  console.log(`           fill, shipped → refund: ${fillUp.map(r => `${r.scenario} ${(r.A.fill * 100).toFixed(0)} → ${(r.B[arm].fill * 100).toFixed(0)} %`).join('; ')}`);
  console.log(`           first step at fill >= 0.999, shipped → refund: ${fills.join('; ') || 'unchanged'}`);
  console.log(`           species lost: ${lost.join('; ') || 'none'}`);
  console.log(`           not moved (${still.length}): ${still.map(r => r.scenario).join(', ')}`);
  console.log(`             of those, store 1 % or more of their thickness on a cell under half the reference's excess: ${still.filter(r => draw[r.scenario].stored_mm > 0 && !under1(r)).map(r => `${r.scenario} ${pct(draw[r.scenario].half)}`).join(', ') || 'none'}; store nothing: ${still.filter(r => !(draw[r.scenario].stored_mm > 0)).map(r => r.scenario).join(', ') || 'none'}`);
  const quiet = moved.filter(under1);
  console.log(`           moved, though under 1 % of the stored thickness is on a cell under half the reference's excess (${quiet.length}):`);
  for (const r of quiet) {
    const d = draw[r.scenario], b = r.B[arm];
    console.log(`             ${r.scenario.padEnd(36)} 0.5–0.9 of the reference's excess: ${pct(d.mid).padStart(6)}; starved crystal-steps ${String(d.starved).padStart(4)}; species moved ${b.moved.length}${sizeMoved(r.A, b).length ? `, ${sizeMoved(r.A, b).length} of them 1 mm or more` : ', none of them 1 mm or more'}${b.gained.length || b.lost.length ? `; gained ${b.gained.join(', ') || 'none'}, lost ${b.lost.join(', ') || 'none'}` : ''}`);
  }
  console.log(`           audits: ${j.auditMoved.length ? 'arm runs that read differently from the shipped arm — ' + j.auditMoved.join('; ') : 'every arm run reads the simulator\'s audits as the shipped arm does'}; self-check on ${j.selfcheck.refundAudit.scenario}: ${j.selfcheck.refundAudit.ok ? 'refund=1 leaves the audits as shipped' : 'REFUND CHANGES THE AUDITS'}`);
}
{
  const j = load('ab-refund-seed-42.json');
  const pick = (s, m) => { const r = j.runs.find(x => x.scenario === s); return `${s} ${m} ${mm(r.A.species[m].max_um)} → ${mm(r.B['refund=1'].species[m].max_um)} mm`; };
  console.log(`  seed 42, largest crystal: ${[pick('mvt', 'greenockite'), pick('colorado_plateau', 'uranophane'), pick('reactive_wall', 'galena'), pick('sunnyside_american_tunnel', 'galena'), pick('tutorial_travertine', 'aragonite')].join('; ')}`);
  const b = j.runs.find(x => x.scenario === 'bisbee').B['refund=1'];
  console.log(`  seed 42, bisbee: ${b.moved.length} of ${b.speciesCount} species moved`);
}

console.log('\nthe feldspar shapes on the 13 scenarios that grow feldspar or albite (ab-feldspar-13-scenarios.json)');
{
  const j = load('ab-feldspar-13-scenarios.json');
  for (const arm of j.arms) for (const seed of SEEDS) {
    const runs = j.runs.filter(r => r.seed === seed);
    const moved = runs.filter(r => changed(r.B[arm]));
    const lost = runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${r.B[arm].lost.map(k => `${k} ${mm(r.A.species[k].max_um)} mm`).join(', ')})`);
    const op = runs.find(r => r.scenario === 'ouro_preto'), bi = runs.find(r => r.scenario === 'bisbee');
    console.log(`  ${arm.padEnd(8)} seed ${String(seed).padStart(2)}: moved ${moved.length} of ${runs.length}${moved.length < runs.length ? ' (' + moved.map(r => r.scenario).join(', ') + ')' : ''}; lost: ${lost.join('; ') || 'none'}; ouro_preto fill ${(op.A.fill * 100).toFixed(1)} → ${(op.B[arm].fill * 100).toFixed(1)} %; bisbee species moved ${bi.B[arm].moved.length}`);
  }
  console.log('  what the clamp does where it acts — largest crystal, mm ×count, shipped → rclamp=7 (the clamp on the rate), seeds 42 / 1 / 2:');
  const scen = [...new Set(j.runs.filter(r => changed(r.B['rclamp=7'])).map(r => r.scenario))];
  for (const s of scen) {
    const runs = SEEDS.map(seed => j.runs.find(r => r.scenario === s && r.seed === seed));
    const col = (m) => (runs.some(r => r.A.species[m]) ? `${m} ${runs.map(r => `${size(r.A.species, m)} → ${size(r.B['rclamp=7'].species, m)}`).join(' / ')}` : null);
    const top = (sp) => Object.entries(sp).sort((a, b) => b[1].max_um - a[1].max_um)[0][0];
    console.log(`    ${s.padEnd(22)} fill ${runs.map(r => `${(r.A.fill * 100).toFixed(1)} → ${(r.B['rclamp=7'].fill * 100).toFixed(1)} %`).join(' / ')}; ${[col('albite'), col('feldspar')].filter(Boolean).join('; ')}; species moved ${runs.map(r => `${r.B['rclamp=7'].moved.length} of ${r.B['rclamp=7'].speciesCount}`).join(' / ')}; largest crystal ${runs.map(r => `${top(r.A.species)} → ${top(r.B['rclamp=7'].species)}`).join(' / ')}`);
  }
  const differ = [];
  for (const r of j.runs) {
    const a = r.B['cap=8'].species, b = r.B['rclamp=7'].species;
    const d = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !a[k] || !b[k] || a[k].n !== b[k].n || factor(a[k].max_um, b[k].max_um));
    if (d.length) differ.push(`${r.scenario} seed ${r.seed} (${d.map(k => `${k} ${size(a, k)} → ${size(b, k)}`).join(', ')})`);
  }
  console.log(`  the clamp on sigma (cap=8) against the clamp on the rate (rclamp=7), by the tool's moved test: ${differ.length ? `${differ.length} of ${j.runs.length} runs differ — ${differ.join('; ')}` : `no species differs in any of the ${j.runs.length} runs`}`);
}

console.log('\nthe clamp value: gem_pegmatite (ab-gem-clamp-sensitivity.json) beside the six other scenarios whose sigma passes the clamp (ab-clamp-collateral.json, ab-clamp-other-pegmatites.json); seeds 42 / 1 / 2');
{
  const g = load('ab-gem-clamp-sensitivity.json');
  const others = [load('ab-clamp-collateral.json'), load('ab-clamp-other-pegmatites.json')];
  const by = (j, s) => SEEDS.map(seed => j.runs.find(r => r.scenario === s && r.seed === seed));
  const gem = by(g, 'gem_pegmatite');
  const t = (sp, m) => (sp[m] ? mm(sp[m].max_um) : 'none');
  const pair = (runs, pick) => ['albite', 'feldspar'].filter(m => runs.some(r => r.A.species[m])).map(m => `${m} ${runs.map(r => t(pick(r).species, m)).join(' / ')} mm`).join('; ');
  console.log(`  shipped: gem_pegmatite fill ${gem.map(r => (r.A.fill * 100).toFixed(0)).join(' / ')} %, full at step ${gem.map(r => r.A.full ?? '—').join(' / ')}, tourmaline ${gem.map(r => t(r.A.species, 'tourmaline')).join(' / ')} mm, topaz ${gem.map(r => t(r.A.species, 'topaz')).join(' / ')}, feldspar ${gem.map(r => t(r.A.species, 'feldspar')).join(' / ')} mm, albite ${gem.map(r => t(r.A.species, 'albite')).join(' / ')} mm`);
  for (const c of others) for (const s of [...new Set(c.runs.map(r => r.scenario))]) {
    const runs = by(c, s);
    console.log(`           ${s}: ${pair(runs, r => r.A)}; fill ${runs.map(r => (r.A.fill * 100).toFixed(1)).join(' / ')} %, full at step ${runs.map(r => r.A.full ?? '—').join(' / ')}`);
  }
  for (const arm of g.arms) {
    console.log(`  ${arm.padEnd(10)} gem_pegmatite fill ${gem.map(r => (r.B[arm].fill * 100).toFixed(0)).join(' / ')} %, full at step ${gem.map(r => r.B[arm].full ?? '—').join(' / ')}, last growth ${gem.map(r => r.B[arm].lastGrowth).join(' / ')}, tourmaline ${gem.map(r => t(r.B[arm].species, 'tourmaline')).join(' / ')} mm, topaz ${gem.map(r => t(r.B[arm].species, 'topaz')).join(' / ')} mm, feldspar ${gem.map(r => t(r.B[arm].species, 'feldspar')).join(' / ')} mm, albite ${gem.map(r => t(r.B[arm].species, 'albite')).join(' / ')} mm`);
    for (const c of others) {
      if (!c.arms.includes(arm)) continue;
      for (const s of [...new Set(c.runs.map(r => r.scenario))]) {
        const runs = by(c, s);
        console.log(`             ${s}: ${pair(runs, r => r.B[arm])}; fill ${runs.map(r => (r.B[arm].fill * 100).toFixed(1)).join(' / ')} %, full at step ${runs.map(r => r.B[arm].full ?? '—').join(' / ')}; species moved ${runs.map(r => r.B[arm].moved.length).join(' / ')}; lost ${runs.map(r => r.B[arm].lost.join('+') || 'none').join(' / ')}`);
      }
    }
  }
}

console.log('\nradiogenic lead taken off the bulk handle (nopb) and carried to the voxels (pb) (ab-radiogenic-lead.json, ab-radiogenic-lead-open-pocket.json); seeds 42 / 1 / 2');
{
  const lead = load('ab-radiogenic-lead.json'), open = load('ab-radiogenic-lead-open-pocket.json');
  const p = (x) => (x.species.plumbogummite ? `×${x.species.plumbogummite.n} @ ${mm(x.species.plumbogummite.max_um)} mm` : 'none');
  const row = (label, runs, pick) => console.log(`  ${label.padEnd(58)} fill ${runs.map(r => (pick(r).fill * 100).toFixed(1)).join(' / ')} %; bulk Pb ${runs.map(r => pick(r).bulkPb.toFixed(1)).join(' / ')}, voxel mean ${runs.map(r => pick(r).voxPb.toFixed(2)).join(' / ')}; plumbogummite ${runs.map(r => p(pick(r))).join(' / ')}; uraninite negative zones ${runs.map(r => pick(r).uraniniteNegativeZones).join(' / ')}`);
  for (const s of ['radioactive_pegmatite', 'schneeberg']) {
    const runs = SEEDS.map(seed => lead.runs.find(r => r.scenario === s && r.seed === seed));
    row(`${s}, shipped`, runs, r => r.A);
    for (const arm of lead.arms) {
      row(`${s}, ${arm}`, runs, r => r.B[arm]);
      console.log(`  ${''.padEnd(58)} against shipped: moved ${runs.map(r => r.B[arm].moved.length).join(' / ')} of ${runs.map(r => r.B[arm].speciesCount).join(' / ')}; lost ${runs.map(r => r.B[arm].lost.join('+') || 'none').join(' / ')}; gained ${runs.map(r => r.B[arm].gained.join('+') || 'none').join(' / ')}`);
    }
  }
  const peg = load('ab-pegmatites-rind-clamp.json');
  const pair = SEEDS.map(seed => peg.runs.find(r => r.scenario === 'radioactive_pegmatite' && r.seed === seed));
  row(`radioactive_pegmatite, rclamp=7 on ${peg.minerals.join(', ')} only`, pair, r => r.B['rclamp=7']);
  const runs = SEEDS.map(seed => open.runs.find(r => r.scenario === 'radioactive_pegmatite' && r.seed === seed));
  for (const arm of open.arms) row(`radioactive_pegmatite, ${arm} on ${open.minerals.join(', ')}`, runs, r => r.B[arm]);
}

console.log('\nk·σ rescaled to m·k·(σ − 1) for galena, molybdenite and uraninite (ab-rate-on-excess.json)');
{
  const j = load('ab-rate-on-excess.json');
  const own = new Set(j.minerals);
  for (const arm of j.arms) for (const seed of SEEDS) {
    const runs = j.runs.filter(r => r.seed === seed);
    const others = runs.map(r => {
      const b = r.B[arm];
      const o = [...b.moved, ...b.gained.map(x => `gained ${x}`), ...b.lost.map(x => `lost ${x}`)].filter(k => !own.has(k));
      return o.length ? `${r.scenario} ${o.length} (${o.slice(0, 4).join(', ')}${o.length > 4 ? ', …' : ''})` : null;
    }).filter(Boolean);
    const p = runs.find(r => r.scenario === 'porphyry');
    console.log(`  ${arm.padEnd(9)} seed ${String(seed).padStart(2)}: other species moved — ${others.join('; ') || 'none'}; porphyry fill ${(p.A.fill * 100).toFixed(0)} → ${(p.B[arm].fill * 100).toFixed(0)} %`);
  }
}

console.log('\nten times the boron in gem_pegmatite (ab-gem-boron.json, ab-pegmatites-rind-clamp.json)');
{
  const boron = load('ab-gem-boron.json'), peg = load('ab-pegmatites-rind-clamp.json');
  for (const seed of SEEDS) {
    const r = boron.runs.find(x => x.seed === seed);
    const open = peg.runs.find(x => x.scenario === 'gem_pegmatite' && x.seed === seed).B['cap=8'].species;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const t = (sp) => (sp.tourmaline ? `${mm(sp.tourmaline.max_um)} mm` : 'none');
    console.log(`  seed ${String(seed).padStart(2)}: mul=B:10 identical to shipped: ${same(r.A.species, r.B['mul=B:10'].species)}; cap=8,mul=B:10 identical to cap=8: ${same(open, r.B['cap=8,mul=B:10'].species)}; tourmaline at half the boron ${t(r.B['mul=B:0.5'].species)} plugged, ${t(r.B['cap=8,mul=B:0.5'].species)} open; at a quarter ${t(r.B['mul=B:0.25'].species)} plugged`);
  }
}

console.log('\nevery A/B file here: arm runs whose audits read differently from the shipped arm\'s (an event paused or refused; a failed carbonate transaction; a ledger violation), and arm runs in which the wall\'s dissolution was withheld as too small to resolve on a different number of steps (a notice, not a failure)');
for (const name of fs.readdirSync(HERE).filter(n => /^ab-.*\.json$/.test(n)).sort()) {
  const j = load(name);
  const w = j.runs.flatMap(r => Object.entries(r.B).filter(([, b]) => b.wallDissolutionWithheld !== r.A.wallDissolutionWithheld)
    .map(([arm, b]) => `${r.scenario} seed ${r.seed} ${arm} ${r.A.wallDissolutionWithheld} → ${b.wallDissolutionWithheld}`));
  console.log(`  ${name.padEnd(42)} audits: ${j.auditMoved.length ? j.auditMoved.join('; ') : 'none differ'}; wall dissolution withheld: ${w.length ? w.join('; ') : 'none differ'}`);
}
