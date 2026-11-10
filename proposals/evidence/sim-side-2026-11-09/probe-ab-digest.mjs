#!/usr/bin/env node
/**
 * probe-ab-digest.mjs — the counts the review draws from the A/B outputs in this folder
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.1, §3.1, §3.3, §4).
 *
 * It runs no simulation. It reads the ab-*.json files beside it, which tools/sim-side-ab.mjs wrote,
 * and the three census reports, and prints what the document says about them in one place. The
 * words are the tool's: a species is PRESENT when one of its crystals has solid left at run end;
 * LOST is present in the shipped arm and not in the other; MOVED is present in both with the number
 * of crystals holding solid changed, or the largest changed by a factor of more than 1.25 either
 * way; "the baseline differs" is the per-species summary the committed baseline stores, changed.
 *
 *   refund    per seed: scenarios moved (any species moved, gained or lost); scenarios in which a
 *             species whose largest crystal is 1 mm or more in either arm changed that size by such
 *             a factor; scenarios whose fill rose by more than ten points; species lost; pockets that
 *             fill, and when; arm runs whose audits read differently from the shipped arm's; and,
 *             from the census of the same seed, how the scenarios the arm moves and the ones it
 *             leaves alone read in the passive draw-down table.
 *   draw      from the census reports alone: how much of the draw-down table of §2.1 is the feldspar
 *             pair's own growth. Nothing is re-run under a clamp: the pair's drawn-down thickness is
 *             taken out of each scenario's numerator, which is arithmetic on the committed table.
 *             Also where the crystals of 1 mm or more that grew mostly on a drawn-down cell sit, and
 *             the thickness the two "held down by one further field" cases carry.
 *   feldspar  per shape and seed, on the 13 scenarios that grow feldspar or albite: scenarios moved,
 *             scenarios whose baseline would differ, species lost, ouro_preto's fill, bisbee's count;
 *             then whether the clamp on the rate (rclamp=7) differs from the clamp on sigma (cap=8).
 *   clamp     per clamp value and seed, on the same 13: every scenario whose baseline would differ,
 *             with its fill, its feldspar pair and the species it loses; then gem_pegmatite's finer
 *             sweep, on the rate and on sigma.
 *   lead      radiogenic lead carried to the voxels (pb) and kept out of every fluid (nopb), in the
 *             pocket as shipped, with the feldspar pair clamped, and held open: plumbogummite, and
 *             how many negative zones the uraninites took.
 *   excess    per constant and seed: species moved or lost other than the three engines' own, and
 *             porphyry's fill.
 *   boron     whether ten times the boron is identical to its reference, plugged and open.
 *   audits    for every A/B file: arm runs whose audits differ from the shipped arm's.
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
const t = (sp, m) => (sp[m] ? mm(sp[m].max_um) : 'none');
// a species an arm loses, with what it was in the shipped arm
const lostText = (r, b) => b.lost.map(k => `${k} ${mm(r.A.species[k].max_um)} mm ×${r.A.species[k].n}`).join(', ');
const by = (j, s) => SEEDS.map(seed => j.runs.find(r => r.scenario === s && r.seed === seed));

console.log('refund=1 — every positive zone\'s debit returned to its cell (ab-refund-seed-*.json; census-seed-*.json)');
for (const seed of SEEDS) {
  const j = load(`ab-refund-seed-${seed}.json`), census = load(`census-seed-${seed}.json`);
  const arm = 'refund=1';
  const draw = Object.fromEntries(census.draw.scenarios.map(x => [x.scenario, x]));
  const moved = j.runs.filter(r => changed(r.B[arm])), still = j.runs.filter(r => !changed(r.B[arm]));
  const big = j.runs.filter(r => sizeMoved(r.A, r.B[arm]).length > 0);
  const fillUp = j.runs.filter(r => r.B[arm].fill - r.A.fill > 0.10);
  const lost = j.runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${lostText(r, r.B[arm])})`);
  const fills = j.runs.filter(r => r.B[arm].full != null && r.B[arm].full !== r.A.full).map(r => `${r.scenario} ${r.A.full ?? 'never'} → ${r.B[arm].full}`);
  const under1 = (r) => draw[r.scenario].stored_mm > 0 && draw[r.scenario].half < 0.01;
  const band = (r) => draw[r.scenario].stored_mm > 0 && draw[r.scenario].mid >= 0.10;
  console.log(`  seed ${String(seed).padStart(2)}: ${j.runs.length} scenarios; moved ${moved.length}; a species' largest crystal, 1 mm or more in either arm, changed by a factor of more than 1.25 in ${big.length}; fill rose by more than ten points in ${fillUp.length}; the baseline differs in ${j.runs.filter(r => !r.B[arm].sameAsShipped).length}`);
  console.log(`           fill, shipped → refund: ${fillUp.map(r => `${r.scenario} ${(r.A.fill * 100).toFixed(0)} → ${(r.B[arm].fill * 100).toFixed(0)} %`).join('; ')}`);
  console.log(`           first step at fill >= 0.999, shipped → refund: ${fills.join('; ') || 'unchanged'}`);
  console.log(`           species lost: ${lost.join('; ') || 'none'}`);
  console.log(`           not moved (${still.length}): ${still.map(r => r.scenario).join(', ')}`);
  console.log(`             of those, store 1 % or more of their thickness on a cell under half the reference's excess: ${still.filter(r => draw[r.scenario].stored_mm > 0 && !under1(r)).map(r => `${r.scenario} ${pct(draw[r.scenario].half)}`).join(', ') || 'none'}; store nothing: ${still.filter(r => !(draw[r.scenario].stored_mm > 0)).map(r => r.scenario).join(', ') || 'none'}`);
  console.log(`             of those, store a tenth or more between 0.5 and 0.9 of the reference's excess: ${still.filter(band).map(r => `${r.scenario} ${pct(draw[r.scenario].mid)}`).join(', ') || 'none'}`);
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
  const pick = (s, m) => { const r = j.runs.find(x => x.scenario === s); return `${s} ${m} ${t(r.A.species, m)} → ${t(r.B['refund=1'].species, m)} mm`; };
  console.log(`  seed 42, largest crystal: ${[pick('mvt', 'greenockite'), pick('colorado_plateau', 'uranophane'), pick('reactive_wall', 'galena'), pick('sunnyside_american_tunnel', 'galena'), pick('tutorial_travertine', 'aragonite')].join('; ')}`);
  const b = j.runs.find(x => x.scenario === 'bisbee').B['refund=1'];
  console.log(`  seed 42, bisbee: ${b.moved.length} moved, ${b.lost.length} lost, ${b.gained.length} gained, of ${b.speciesCount} species present in either arm`);
}

console.log('\nthe draw-down table of §2.1 and the feldspar pair\'s part of it (census-seed-*.json; arithmetic on the committed table, nothing re-run)');
for (const seed of SEEDS) {
  const d = load(`census-seed-${seed}.json`).draw;
  const pair = {};
  for (const [k, um] of Object.entries(d.drawnDownThrough_um)) {
    const [scenario, rest] = k.split('/');
    if (['feldspar', 'albite'].includes(rest.split(':')[0])) pair[scenario] = (pair[scenario] || 0) + um / 1000;
  }
  const grew = d.scenarios.filter(x => x.stored_mm > 0);
  const without = (x) => Math.max(0, (x.half * x.stored_mm - (pair[x.scenario] || 0)) / x.stored_mm);
  const over = (threshold, share) => grew.filter(x => share(x) > threshold);
  const theirs = grew.filter(x => x.half > 0.10 && (pair[x.scenario] || 0) >= 0.5);
  const at = (s) => d.scenarios.find(x => x.scenario === s);
  const other = (k) => d.underHalfNotThroughIngredients_um[k] || 0;
  console.log(`  seed ${String(seed).padStart(2)}: more than a tenth of the stored thickness was put on at a cell under half the reference's excess in ${over(0.10, x => x.half).length} of ${grew.length} scenarios, and more than half of it in ${over(0.50, x => x.half).length}; with the feldspar pair's part taken out of the numerator, ${over(0.10, without).length} and ${over(0.50, without).length}`);
  for (const x of theirs) console.log(`           ${x.scenario.padEnd(22)} ${pct(x.half).padStart(6)} of ${x.stored_mm.toFixed(0).padStart(3)} mm; through its ingredients ${(x.halfIngredients * x.stored_mm).toFixed(1)} mm, of which feldspar and albite ${pair[x.scenario].toFixed(1)} mm; without them ${pct(without(x))}; crystals of 1 mm or more grown mostly that way ${x.ge1mmMostlyHalf} of ${x.ge1mm}`);
  console.log(`           crystals of 1 mm or more that stored most of their growth that way: ${d.ge1mmMostlyHalf} of ${d.ge1mm}; ${at('supergene_oxidation').ge1mmMostlyHalf} of them in supergene_oxidation and ${at('schneeberg').ge1mmMostlyHalf} in schneeberg, the two scenarios where a further field holds the cell down; ${theirs.reduce((n, x) => n + x.ge1mmMostlyHalf, 0)} in the ${theirs.length} scenarios listed above`);
  console.log(`           held down by one further field: supergene_oxidation's ferrimolybdite through O2, ${other('supergene_oxidation/ferrimolybdite:O2').toFixed(0)} µm (${pct(other('supergene_oxidation/ferrimolybdite:O2') / 1000 / at('supergene_oxidation').stored_mm)} of that scenario's stored thickness; all minerals ${pct(at('supergene_oxidation').halfOtherwise)}); schneeberg's uranophane through pH, ${other('schneeberg/uranophane:pH').toFixed(0)} µm (${pct(other('schneeberg/uranophane:pH') / 1000 / at('schneeberg').stored_mm)})`);
}

console.log('\nthe feldspar shapes on the 13 scenarios that grow feldspar or albite (ab-feldspar-13-scenarios.json)');
{
  const j = load('ab-feldspar-13-scenarios.json');
  for (const arm of j.arms) for (const seed of SEEDS) {
    const runs = j.runs.filter(r => r.seed === seed);
    const moved = runs.filter(r => changed(r.B[arm])), differ = runs.filter(r => !r.B[arm].sameAsShipped);
    const lost = runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${lostText(r, r.B[arm])})`);
    const op = runs.find(r => r.scenario === 'ouro_preto'), bi = runs.find(r => r.scenario === 'bisbee');
    console.log(`  ${arm.padEnd(8)} seed ${String(seed).padStart(2)}: moved ${moved.length} of ${runs.length}${moved.length < runs.length ? ' (' + moved.map(r => r.scenario).join(', ') + ')' : ''}; the baseline differs in ${differ.length}${differ.length < runs.length && differ.length !== moved.length ? ' (' + differ.map(r => r.scenario).join(', ') + ')' : ''}; lost: ${lost.join('; ') || 'none'}; ouro_preto fill ${(op.A.fill * 100).toFixed(1)} → ${(op.B[arm].fill * 100).toFixed(1)} %; bisbee species moved ${bi.B[arm].moved.length}`);
  }
  const differ = [];
  for (const r of j.runs) {
    const a = r.B['cap=8'].species, b = r.B['rclamp=7'].species;
    const d = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !a[k] || !b[k] || a[k].n !== b[k].n || factor(a[k].max_um, b[k].max_um));
    if (d.length) differ.push(`${r.scenario} seed ${r.seed} (${d.map(k => `${k} ${size(a, k)} → ${size(b, k)}`).join(', ')})`);
  }
  console.log(`  the clamp on sigma (cap=8) against the clamp on the rate (rclamp=7), by the tool's moved test: ${differ.length ? `${differ.length} of ${j.runs.length} runs differ — ${differ.join('; ')}` : `no species differs in any of the ${j.runs.length} runs`}`);
}

console.log('\nthe clamp value on the 13 scenarios (rclamp=7 from ab-feldspar-13-scenarios.json; 11, 23 and 47 from ab-clamp-values-13-scenarios.json); seeds 42 / 1 / 2');
{
  const f = load('ab-feldspar-13-scenarios.json'), v = load('ab-clamp-values-13-scenarios.json');
  const scenarios = [...new Set(f.runs.map(r => r.scenario))];
  const arms = [['rclamp=7', f], ...v.arms.map(a => [a, v])];
  const pair = (runs, pick) => ['albite', 'feldspar'].filter(m => runs.some(r => r.A.species[m] || pick(r).species[m])).map(m => `${m} ${runs.map(r => t(pick(r).species, m)).join(' / ')} mm`).join('; ');
  console.log('  shipped:');
  for (const s of scenarios) {
    const runs = by(f, s);
    console.log(`    ${s.padEnd(24)} fill ${runs.map(r => (r.A.fill * 100).toFixed(1)).join(' / ')} %, full at step ${runs.map(r => r.A.full ?? '—').join(' / ')}; ${pair(runs, r => r.A)}`);
  }
  for (const [arm, j] of arms) {
    const touched = scenarios.filter(s => by(j, s).some(r => !r.B[arm].sameAsShipped));
    console.log(`  ${arm}: the baseline differs in ${SEEDS.map(seed => j.runs.filter(r => r.seed === seed && !r.B[arm].sameAsShipped).length).join(' / ')} of ${scenarios.length} scenarios; moved in ${SEEDS.map(seed => j.runs.filter(r => r.seed === seed && changed(r.B[arm])).length).join(' / ')}; unchanged at every seed: ${scenarios.filter(s => !touched.includes(s)).join(', ') || 'none'}`);
    for (const s of touched) {
      const runs = by(j, s);
      console.log(`    ${s.padEnd(24)} fill ${runs.map(r => (r.B[arm].fill * 100).toFixed(1)).join(' / ')} % (largest of the run ${runs.map(r => (r.B[arm].maxFill * 100).toFixed(1)).join(' / ')} %), full at step ${runs.map(r => r.B[arm].full ?? '—').join(' / ')}; ${pair(runs, r => r.B[arm])}; moved ${runs.map(r => r.B[arm].moved.length).join(' / ')}; lost ${runs.map(r => lostText(r, r.B[arm]) || 'none').join(' / ')}`);
    }
  }
  const g = load('ab-gem-clamp-sensitivity.json'), gem = by(g, 'gem_pegmatite');
  console.log('  gem_pegmatite alone, a finer sweep on the rate and on sigma (ab-gem-clamp-sensitivity.json):');
  console.log(`    shipped    fill ${gem.map(r => (r.A.fill * 100).toFixed(0)).join(' / ')} %, full at step ${gem.map(r => r.A.full ?? '—').join(' / ')}, tourmaline ${gem.map(r => t(r.A.species, 'tourmaline')).join(' / ')} mm, topaz ${gem.map(r => t(r.A.species, 'topaz')).join(' / ')}, feldspar ${gem.map(r => t(r.A.species, 'feldspar')).join(' / ')} mm, albite ${gem.map(r => t(r.A.species, 'albite')).join(' / ')} mm`);
  for (const arm of g.arms) console.log(`    ${arm.padEnd(10)} fill ${gem.map(r => (r.B[arm].fill * 100).toFixed(0)).join(' / ')} % (largest of the run ${gem.map(r => (r.B[arm].maxFill * 100).toFixed(1)).join(' / ')} %), full at step ${gem.map(r => r.B[arm].full ?? '—').join(' / ')}, last growth ${gem.map(r => r.B[arm].lastGrowth).join(' / ')}, tourmaline ${gem.map(r => t(r.B[arm].species, 'tourmaline')).join(' / ')} mm, topaz ${gem.map(r => t(r.B[arm].species, 'topaz')).join(' / ')} mm, feldspar ${gem.map(r => t(r.B[arm].species, 'feldspar')).join(' / ')} mm, albite ${gem.map(r => t(r.B[arm].species, 'albite')).join(' / ')} mm`);
}

console.log('\nradiogenic lead carried to the voxels (pb) and kept out of every fluid (nopb) (ab-radiogenic-lead.json, ab-pegmatites-rind-clamp.json, ab-radiogenic-lead-open-pocket.json); seeds 42 / 1 / 2');
{
  const lead = load('ab-radiogenic-lead.json'), open = load('ab-radiogenic-lead-open-pocket.json'), peg = load('ab-pegmatites-rind-clamp.json');
  // plumbogummite with solid, and its records where none holds solid
  const p = (x) => (x.species.plumbogummite ? `×${x.species.plumbogummite.n} @ ${mm(x.species.plumbogummite.max_um)} mm` : x.noSolid.plumbogummite ? `no solid (${x.noSolid.plumbogummite} record${x.noSolid.plumbogummite === 1 ? '' : 's'})` : 'none');
  const row = (label, runs, pick) => console.log(`  ${label.padEnd(60)} fill ${runs.map(r => (pick(r).fill * 100).toFixed(1)).join(' / ')} %; bulk Pb ${runs.map(r => pick(r).bulkPb.toFixed(1)).join(' / ')}, voxel mean ${runs.map(r => pick(r).voxPb.toFixed(2)).join(' / ')}; plumbogummite ${runs.map(r => p(pick(r))).join(' / ')}; uraninite negative zones ${runs.map(r => pick(r).uraniniteNegativeZones).join(' / ')}`);
  for (const s of ['radioactive_pegmatite', 'schneeberg']) {
    const runs = by(lead, s);
    row(`${s}, shipped`, runs, r => r.A);
    for (const arm of lead.arms) {
      row(`${s}, ${arm}`, runs, r => r.B[arm]);
      console.log(`  ${''.padEnd(60)} against shipped: moved ${runs.map(r => r.B[arm].moved.length).join(' / ')}; lost ${runs.map(r => r.B[arm].lost.join('+') || 'none').join(' / ')}; gained ${runs.map(r => r.B[arm].gained.join('+') || 'none').join(' / ')}; the baseline differs ${runs.map(r => (r.B[arm].sameAsShipped ? 'no' : 'yes')).join(' / ')}`);
    }
  }
  row(`radioactive_pegmatite, rclamp=7 on ${peg.minerals.join(', ')} only`, by(peg, 'radioactive_pegmatite'), r => r.B['rclamp=7']);
  const runs = by(open, 'radioactive_pegmatite');
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
      const o = [...b.moved, ...b.gained.map(x => `gained ${x}`), ...b.lost.map(x => `lost ${x} (${mm(r.A.species[x].max_um)} mm)`)].filter(k => !own.has(k));
      return o.length ? `${r.scenario} ${o.length} (${o.slice(0, 5).join(', ')}${o.length > 5 ? ', …' : ''})` : null;
    }).filter(Boolean);
    const lost = runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${lostText(r, r.B[arm])})`);
    const p = runs.find(r => r.scenario === 'porphyry');
    console.log(`  ${arm.padEnd(9)} seed ${String(seed).padStart(2)}: other species moved, gained or lost — ${others.join('; ') || 'none'}; lost: ${lost.join('; ') || 'none'}; porphyry fill ${(p.A.fill * 100).toFixed(0)} → ${(p.B[arm].fill * 100).toFixed(0)} %`);
  }
}

console.log('\nten times the boron in gem_pegmatite (ab-gem-boron.json, ab-pegmatites-rind-clamp.json)');
{
  const boron = load('ab-gem-boron.json'), peg = load('ab-pegmatites-rind-clamp.json');
  for (const seed of SEEDS) {
    const r = boron.runs.find(x => x.seed === seed);
    const open = peg.runs.find(x => x.scenario === 'gem_pegmatite' && x.seed === seed).B['cap=8'].species;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const tm = (sp) => (sp.tourmaline ? `${mm(sp.tourmaline.max_um)} mm` : 'none');
    console.log(`  seed ${String(seed).padStart(2)}: mul=B:10 identical to shipped: ${same(r.A.species, r.B['mul=B:10'].species)}; cap=8,mul=B:10 identical to cap=8: ${same(open, r.B['cap=8,mul=B:10'].species)}; tourmaline at half the boron ${tm(r.B['mul=B:0.5'].species)} plugged, ${tm(r.B['cap=8,mul=B:0.5'].species)} open; at a quarter ${tm(r.B['mul=B:0.25'].species)} plugged`);
  }
}

console.log('\nevery A/B file here: arm runs whose audits read differently from the shipped arm\'s (a CO2 or carbonate event paused or refused; a failed carbonate transaction; a ledger violation), and arm runs in which the wall\'s dissolution was withheld as too small to resolve on a different number of steps (a notice, not a failure)');
for (const name of fs.readdirSync(HERE).filter(n => /^ab-.*\.json$/.test(n)).sort()) {
  const j = load(name);
  const w = j.runs.flatMap(r => Object.entries(r.B).filter(([, b]) => b.wallDissolutionWithheld !== r.A.wallDissolutionWithheld)
    .map(([arm, b]) => `${r.scenario} seed ${r.seed} ${arm} ${r.A.wallDissolutionWithheld} → ${b.wallDissolutionWithheld}`));
  console.log(`  ${name.padEnd(42)} audits: ${j.auditMoved.length ? j.auditMoved.join('; ') : 'none differ'}; wall dissolution withheld: ${w.length ? w.join('; ') : 'none differ'}`);
}
