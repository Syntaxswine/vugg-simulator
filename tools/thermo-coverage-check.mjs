#!/usr/bin/env node
/**
 * tools/thermo-coverage-check.mjs — coverage report for
 * data/thermo-carbonates.json (Phase 1; sulfides + silicates added in
 * follow-ups). Surfaces the database gaps the audit framework was
 * designed to make visible.
 *
 * Usage:
 *   node tools/thermo-coverage-check.mjs            # human report
 *   node tools/thermo-coverage-check.mjs --json     # machine-readable
 *
 * Exit codes:
 *   0  — report generated successfully
 *   1  — file missing or unparseable
 *   2  — any mineral has confidence_tier 'unknown' (= no tier assigned;
 *        means the schema didn't fill in even a 'D' for a deliberate gap)
 *
 * Per PROPOSAL-CARBONATE-GEOCHEM Week 1 deliverable.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE = join(ROOT, 'data', 'thermo-carbonates.json');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

if (!existsSync(FILE)) {
  console.error(`[thermo-coverage] file not found: ${FILE}`);
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error(`[thermo-coverage] parse error: ${e.message}`);
  process.exit(1);
}

const minerals = Object.entries(doc).filter(([k]) => !k.startsWith('_'));

const tierCounts = (axis) => {
  const counts = { A: 0, B: 0, C: 0, D: 0, conflict: 0, unknown: 0 };
  for (const [, entry] of minerals) {
    const block = axis === 'thermo' ? entry.thermodynamics : entry.kinetics;
    const tier = (block && block.confidence_tier) || 'unknown';
    counts[tier] = (counts[tier] || 0) + 1;
  }
  return counts;
};

const tierGroups = (axis) => {
  const groups = { A: [], B: [], C: [], D: [], conflict: [], unknown: [] };
  for (const [name, entry] of minerals) {
    const block = axis === 'thermo' ? entry.thermodynamics : entry.kinetics;
    const tier = (block && block.confidence_tier) || 'unknown';
    if (!groups[tier]) groups[tier] = [];
    groups[tier].push(name);
  }
  for (const g in groups) groups[g].sort();
  return groups;
};

const missing = (axis) => {
  const out = [];
  for (const [name, entry] of minerals) {
    const block = axis === 'thermo' ? entry.thermodynamics : entry.kinetics;
    if (!block) { out.push({ name, missing: ['no_block'] }); continue; }
    const gaps = [];
    if (axis === 'thermo') {
      const Ksp = block.logKsp_25C;
      if (Ksp === null || Ksp === undefined) gaps.push('logKsp_25C');
      if (block.deltaGf_kJ_mol == null) gaps.push('deltaGf');
      if (!Array.isArray(block.sources) || block.sources.length === 0) gaps.push('no_sources');
    } else {
      if (!block.rate_law) gaps.push('rate_law');
      if (!Array.isArray(block.sources) || block.sources.length === 0) gaps.push('no_sources');
    }
    if (gaps.length) out.push({ name, missing: gaps });
  }
  return out;
};

const conflicts = () => {
  const out = [];
  for (const [name, entry] of minerals) {
    const t = entry.thermodynamics;
    if (!t) continue;
    if (t.confidence_tier === 'conflict') {
      out.push({ name, note: t.notes || '(no note)' });
    } else if (t.notes && /conflict|disagree/i.test(t.notes)) {
      out.push({ name, note: t.notes, soft: true });
    }
  }
  return out;
};

const thermoCounts = tierCounts('thermo');
const kineticCounts = tierCounts('kinetic');
const thermoGroups = tierGroups('thermo');
const kineticGroups = tierGroups('kinetic');
const thermoMissing = missing('thermo');
const kineticMissing = missing('kinetic');
const conflictList = conflicts();
const anyUnknown = thermoCounts.unknown > 0 || kineticCounts.unknown > 0;

if (jsonMode) {
  const out = {
    file: FILE,
    minerals_total: minerals.length,
    thermo_tier_counts: thermoCounts,
    kinetic_tier_counts: kineticCounts,
    thermo_tier_groups: thermoGroups,
    kinetic_tier_groups: kineticGroups,
    thermo_missing_data: thermoMissing,
    kinetic_missing_data: kineticMissing,
    conflicts: conflictList,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(anyUnknown ? 2 : 0);
}

// Human-readable report
const bar = (n, max) => '█'.repeat(Math.round((n / Math.max(1, max)) * 30));
const totals = minerals.length;

console.log('');
console.log('THERMODYNAMIC COVERAGE — data/thermo-carbonates.json');
console.log('====================================================');
console.log(`File: ${FILE}`);
console.log(`Minerals covered: ${totals}`);
console.log('');

console.log('THERMO TIER DISTRIBUTION');
console.log('------------------------');
for (const tier of ['A', 'B', 'C', 'D', 'conflict', 'unknown']) {
  const n = thermoCounts[tier] || 0;
  const label = tier === 'unknown' ? '???' : tier;
  console.log(`  ${label.padEnd(8)} ${String(n).padStart(2)}  ${bar(n, totals)}`);
}
console.log('');

console.log('KINETIC TIER DISTRIBUTION');
console.log('-------------------------');
for (const tier of ['A', 'B', 'C', 'D', 'conflict', 'unknown']) {
  const n = kineticCounts[tier] || 0;
  const label = tier === 'unknown' ? '???' : tier;
  console.log(`  ${label.padEnd(8)} ${String(n).padStart(2)}  ${bar(n, totals)}`);
}
console.log('');

console.log('THERMO — MINERALS BY TIER');
console.log('-------------------------');
for (const tier of ['A', 'B', 'C', 'D', 'conflict', 'unknown']) {
  const g = thermoGroups[tier] || [];
  if (!g.length) continue;
  console.log(`  ${tier.padEnd(8)} ${g.join(', ')}`);
}
console.log('');

console.log('KINETIC — MINERALS BY TIER');
console.log('--------------------------');
for (const tier of ['A', 'B', 'C', 'D', 'conflict', 'unknown']) {
  const g = kineticGroups[tier] || [];
  if (!g.length) continue;
  console.log(`  ${tier.padEnd(8)} ${g.join(', ')}`);
}
console.log('');

if (thermoMissing.length) {
  console.log('THERMO DATA GAPS');
  console.log('----------------');
  for (const m of thermoMissing) {
    console.log(`  ${m.name.padEnd(16)} missing: ${m.missing.join(', ')}`);
  }
  console.log('');
}

if (kineticMissing.length) {
  console.log('KINETIC DATA GAPS');
  console.log('-----------------');
  for (const m of kineticMissing) {
    console.log(`  ${m.name.padEnd(16)} missing: ${m.missing.join(', ')}`);
  }
  console.log('');
}

if (conflictList.length) {
  console.log('CONFLICTS / DISAGREEMENTS');
  console.log('-------------------------');
  for (const c of conflictList) {
    const tag = c.soft ? '[note]' : '[CONFLICT TIER]';
    console.log(`  ${c.name.padEnd(16)} ${tag} ${c.note.substring(0, 120)}${c.note.length > 120 ? '...' : ''}`);
  }
  console.log('');
}

console.log('SUMMARY');
console.log('-------');
console.log(`  ${thermoCounts.A + thermoCounts.B}/${totals} minerals have measured thermodynamic data (tier A or B)`);
console.log(`  ${thermoCounts.C + thermoCounts.D}/${totals} minerals depend on estimated or absent data (tier C or D)`);
console.log(`  ${kineticCounts.A + kineticCounts.B}/${totals} minerals have credible rate laws (tier A or B)`);
console.log(`  ${kineticCounts.C + kineticCounts.D}/${totals} minerals use family-analog kinetics (tier C or D)`);
console.log(`  ${conflictList.length} mineral${conflictList.length === 1 ? '' : 's'} flagged for database disagreement`);
console.log('');

if (anyUnknown) {
  console.error('[thermo-coverage] FAIL: some minerals have unknown tier — schema gap');
  process.exit(2);
}
process.exit(0);
