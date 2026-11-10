#!/usr/bin/env node
/**
 * probe-ab-digest.mjs — the counts the review draws from the A/B outputs in this folder
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.1, §3.1, §4).
 *
 * It runs no simulation. It reads the ab-*.json files beside it, which tools/sim-side-ab.mjs wrote,
 * and prints what the document says about them in one place:
 *
 *   refund    per seed: scenarios moved (the tool's own test: a species' count changed, or its largest
 *             crystal by more than 25 %, or a species was gained or lost); scenarios in which a crystal
 *             of 1 mm or more changed size by more than 25 %; scenarios whose fill rose by more than
 *             ten points; species lost; pockets that fill, and when.
 *   feldspar  per shape and seed: scenarios moved of 13, species lost, ouro_preto's fill, bisbee's count.
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
const changed = (b) => b.moved.length > 0 || b.gained.length > 0 || b.lost.length > 0;
const sizeMoved = (A, B) => [...new Set([...Object.keys(A.species), ...Object.keys(B.species)])].filter(k => {
  const a = A.species[k]?.max_um || 0, c = B.species[k]?.max_um || 0;
  return Math.max(a, c) >= 1000 && Math.abs(Math.log((c + 1) / (a + 1))) > Math.log(1.25);
});

console.log('refund=1 — every positive zone\'s debit returned to its cell (ab-refund-seed-*.json)');
for (const seed of SEEDS) {
  const j = load(`ab-refund-seed-${seed}.json`);
  const arm = 'refund=1';
  const moved = j.runs.filter(r => changed(r.B[arm]));
  const big = j.runs.filter(r => sizeMoved(r.A, r.B[arm]).length > 0);
  const fillUp = j.runs.filter(r => r.B[arm].fill - r.A.fill > 0.10);
  const lost = j.runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${r.B[arm].lost.join(', ')})`);
  const fills = j.runs.filter(r => r.B[arm].full != null && r.B[arm].full !== r.A.full).map(r => `${r.scenario} ${r.A.full ?? 'never'} → ${r.B[arm].full}`);
  console.log(`  seed ${String(seed).padStart(2)}: ${j.runs.length} scenarios; moved ${moved.length}; a crystal >= 1 mm changed size by more than 25 % in ${big.length}; fill rose by more than ten points in ${fillUp.length}`);
  console.log(`           fill, shipped → refund: ${fillUp.map(r => `${r.scenario} ${(r.A.fill * 100).toFixed(0)} → ${(r.B[arm].fill * 100).toFixed(0)} %`).join('; ')}`);
  console.log(`           first step at fill >= 0.999, shipped → refund: ${fills.join('; ') || 'unchanged'}`);
  console.log(`           species lost: ${lost.join('; ') || 'none'}`);
  console.log(`           not moved: ${j.runs.filter(r => !changed(r.B[arm])).map(r => r.scenario).join(', ')}`);
}
{
  const j = load('ab-refund-seed-42.json');
  const pick = (s, m) => { const r = j.runs.find(x => x.scenario === s); return `${s} ${m} ${mm(r.A.species[m].max_um)} → ${mm(r.B['refund=1'].species[m].max_um)} mm`; };
  console.log(`  seed 42, largest crystal: ${[pick('mvt', 'greenockite'), pick('colorado_plateau', 'uranophane'), pick('reactive_wall', 'galena'), pick('sunnyside_american_tunnel', 'galena')].join('; ')}`);
  const b = j.runs.find(x => x.scenario === 'bisbee').B['refund=1'];
  console.log(`  seed 42, bisbee: ${b.moved.length} of ${b.speciesCount} species moved`);
}

console.log('\nthe three feldspar shapes on the 13 scenarios that grow feldspar or albite (ab-feldspar-13-scenarios.json)');
{
  const j = load('ab-feldspar-13-scenarios.json');
  for (const arm of j.arms) for (const seed of SEEDS) {
    const runs = j.runs.filter(r => r.seed === seed);
    const moved = runs.filter(r => changed(r.B[arm]));
    const lost = runs.filter(r => r.B[arm].lost.length).map(r => `${r.scenario} (${r.B[arm].lost.map(k => `${k} ${mm(r.A.species[k].max_um)} mm`).join(', ')})`);
    const op = runs.find(r => r.scenario === 'ouro_preto'), bi = runs.find(r => r.scenario === 'bisbee');
    console.log(`  ${arm.padEnd(7)} seed ${String(seed).padStart(2)}: moved ${moved.length} of ${runs.length}${moved.length < runs.length ? ' (' + moved.map(r => r.scenario).join(', ') + ')' : ''}; lost: ${lost.join('; ') || 'none'}; ouro_preto fill ${(op.A.fill * 100).toFixed(1)} → ${(op.B[arm].fill * 100).toFixed(1)} %; bisbee species moved ${bi.B[arm].moved.length}`);
  }
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
