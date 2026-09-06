#!/usr/bin/env node
// tools/optics-audit.mjs — dump every catalog mineral's RESOLVED Depth-A optics (the coverage +
// no-surprise instrument; RESEARCH-optical-realism-2026-07-02.md §5.1). For each of the 180
// species: clarity source (verified block vs class default), the resolved clarity + opacity the
// renderer will actually use (opacity = 1 − 0.70·clarity via the LIVE bundle functions — reads
// opticsClarityFor + OPTICS_TRANSLUCENCY_SPAN through the build, so tool and renderer cannot
// drift). Flags anomalies: clarity out of range, opaque-category blocks with clarity > 0.05,
// verified blocks whose class default would have been badly wrong (the ones worth having).
//
//   node tools/optics-audit.mjs             # summary + anomalies
//   node tools/optics-audit.mjs --all       # every mineral, one line each
//   node tools/optics-audit.mjs --class sulfide   # one class in full
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSimBundle } from './_harness.mjs';
// LOGIC from the live bundle (opticsClarityFor + span — tool and renderer cannot drift);
// DATA from the canonical file directly (the bundle's MINERAL_SPEC export is captured at
// eval time = the pre-fetch compact fallback, not the full 180-species spec).
// R2 (2026-09-06): the same call now also resolves the lustre term, the mean refractive
// index and the transmission-tier decision through the renderer's own pure resolver
// (opticsMaterialParamsFor) — what the desktop tier will build, species by species.
const { opticsClarityFor, OPTICS_TRANSLUCENCY_SPAN, opticsMaterialParamsFor, opticsIorFor, opticsLustreFor } =
  await loadSimBundle({ toolName: 'optics-audit', extraExports: ['opticsClarityFor', 'OPTICS_TRANSLUCENCY_SPAN', 'opticsMaterialParamsFor', 'opticsIorFor', 'opticsLustreFor'] });
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MINERAL_SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'minerals.json'), 'utf8')).minerals;

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const CLASS = argv.includes('--class') ? argv[argv.indexOf('--class') + 1] : null;

const rows = Object.entries(MINERAL_SPEC).map(([name, spec]) => {
  const verified = !!(spec.optics && typeof spec.optics.clarity === 'number');
  const clarity = opticsClarityFor(spec);
  const opacity = clarity > 0 ? +(1 - OPTICS_TRANSLUCENCY_SPAN * clarity).toFixed(3) : 1.0;
  const p = opticsMaterialParamsFor(spec, {}, 'transmission');
  const iorVerified = !!(spec.optics && typeof spec.optics.ior === 'number');
  return { name, klass: spec.class || '(none)', verified, clarity, opacity,
    diaphaneity: verified ? spec.optics.diaphaneity : null,
    lustre: opticsLustreFor(spec), lustreVerified: !!(spec.optics && Array.isArray(spec.optics.lustre)),
    ior: opticsIorFor(spec), iorVerified,
    tier: p.metalness >= 0.5 ? 'metal' : p.transmissive ? `glass ${p.transmission.toFixed(2)}` : 'opaque',
    roughness: p.roughness, metalness: p.metalness };
}).sort((a, b) => a.klass.localeCompare(b.klass) || a.name.localeCompare(b.name));

const anomalies = [];
for (const r of rows) {
  if (r.clarity < 0 || r.clarity > 1) anomalies.push(`${r.name}: clarity ${r.clarity} out of range`);
  if (r.diaphaneity === 'opaque' && r.clarity > 0.05) anomalies.push(`${r.name}: opaque category but clarity ${r.clarity}`);
  // a VERIFIED block that transmits must carry its own index — the class default is for the tail only
  if (r.verified && r.tier.startsWith('glass') && !r.iorVerified) anomalies.push(`${r.name}: transmissive verified block without optics.ior (class default ${r.ior})`);
  if (r.ior < 1.3 || r.ior > 3.5) anomalies.push(`${r.name}: ior ${r.ior} out of range`);
}

console.log(`=== optics audit — ${rows.length} minerals, span ${OPTICS_TRANSLUCENCY_SPAN} ===\n`);
const byClass = {};
for (const r of rows) (byClass[r.klass] = byClass[r.klass] || []).push(r);
console.log('class        n   verified  default  | class-default clarity → the tail renders at');
for (const [k, list] of Object.entries(byClass)) {
  const v = list.filter(r => r.verified).length;
  const tail = list.find(r => !r.verified);
  console.log(`  ${k.padEnd(10)} ${String(list.length).padStart(3)}   ${String(v).padStart(5)}     ${String(list.length - v).padStart(4)}   | ${tail ? `clarity ${tail.clarity} → opacity ${tail.opacity}` : '(fully verified)'}`);
}
const verifiedN = rows.filter(r => r.verified).length;
console.log(`\ncoverage: ${verifiedN}/${rows.length} verified (${(100 * verifiedN / rows.length).toFixed(0)}%); translucent-rendering species (clarity>0): ${rows.filter(r => r.clarity > 0).length}`);
// R2 tiers at the desktop (transmission) tier
const tierCount = {};
for (const r of rows) { const k = r.tier.split(' ')[0]; tierCount[k] = (tierCount[k] || 0) + 1; }
const lustreCount = {};
for (const r of rows) lustreCount[r.lustre] = (lustreCount[r.lustre] || 0) + 1;
console.log(`R2 desktop tier: ${Object.entries(tierCount).map(([k, v]) => `${k} ${v}`).join(' · ')}; ior verified ${rows.filter(r => r.iorVerified).length}/${rows.length}; lustre verified ${rows.filter(r => r.lustreVerified).length}/${rows.length}`);
console.log(`lustre terms in use: ${Object.entries(lustreCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

if (ALL || CLASS) {
  console.log('\nname                        class       src       clarity  opacity  lustre         ior      R2 tier      rough  metal  diaphaneity');
  for (const r of rows) {
    if (CLASS && r.klass !== CLASS) continue;
    console.log(`  ${r.name.padEnd(26)} ${r.klass.padEnd(11)} ${(r.verified ? 'VERIFIED' : 'default').padEnd(9)} ${String(r.clarity).padStart(5)}    ${String(r.opacity).padStart(5)}   ${r.lustre.padEnd(14)} ${(r.ior.toFixed(3) + (r.iorVerified ? '' : '*')).padEnd(8)} ${r.tier.padEnd(12)} ${String(r.roughness).padEnd(6)} ${String(r.metalness).padEnd(6)} ${r.diaphaneity || ''}`);
  }
  console.log('  (* = class-default ior)');
}

console.log(anomalies.length ? `\nANOMALIES:\n  ${anomalies.join('\n  ')}` : '\nno anomalies ✓');
process.exit(anomalies.length ? 1 : 0);
