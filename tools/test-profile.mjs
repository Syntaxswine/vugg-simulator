#!/usr/bin/env node
/**
 * tools/test-profile.mjs — publish the cold run's time profile.
 *
 * WHY THIS EXISTS. `tools/test-workflow.mjs` has recorded peak RSS for every
 * batch since it was written, and never once recorded how long a batch took.
 * So the repository could say which test file was the hungriest and could not
 * say which was the slowest — and a "9-minute CI" comment survived into a run
 * that measures 2.4 hours, because nothing in the tree could contradict it.
 * Wall time is now carried on each batch record (`wall_ms`); this reads it back.
 *
 * WHAT IT IS NOT. A passive instrument, never a gate. It exits 0 on a suite of
 * any speed. A slow test file is a fact about the suite, not a failure, and a
 * tool that halted on one would make the profile something people avoid running.
 * The only non-zero exit is "I could not measure" — no report, or a report whose
 * schema it does not recognise.
 *
 * REFUSALS. Missing `wall_ms` reads as UNKNOWN, never as zero. A partial record
 * is summarised and labelled partial; percentiles are computed over the measured
 * batches only, and the unmeasured count is printed beside every figure that
 * depends on it. A shard plan is refused outright on partial data — balancing
 * from a distribution with holes in it is how you get shards that look even and
 * are not.
 *
 * Usage:
 *   node tools/test-profile.mjs              # summarise the newest record
 *   node tools/test-profile.mjs --top 25     # deepen the heaviest-file table
 *   node tools/test-profile.mjs --json       # machine-readable, for a planner
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EVIDENCE = path.join(ROOT, '.local-evidence');

const SOURCES = [
  { file: 'test-workflow-last-pass-v2.json', label: 'uninterrupted full-suite pass', partial: false },
  { file: 'test-workflow-last-operator-resume-v2.json', label: 'operator-resume complete', partial: false },
  { file: 'test-workflow-checkpoint-v2.json', label: 'IN-FLIGHT checkpoint', partial: true },
];

function newestRecord() {
  const found = [];
  for (const source of SOURCES) {
    const full = path.join(EVIDENCE, source.file);
    if (!fs.existsSync(full)) continue;
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(full, 'utf8')); }
    catch { continue; }
    if (parsed?.schema !== 2 || !Array.isArray(parsed.batches)) continue;
    found.push({ ...source, path: full, mtimeMs: fs.statSync(full).mtimeMs, record: parsed });
  }
  if (!found.length) return null;
  found.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return found[0];
}

function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))));
  return sorted[index];
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const topIndex = args.indexOf('--top');
const topCount = topIndex >= 0 ? Number(args[topIndex + 1]) || 15 : 15;

const source = newestRecord();
if (!source) {
  console.error('[test-profile] no readable schema-2 record under .local-evidence/ — run `npm test` first');
  process.exit(1);
}

const batches = source.record.batches;
const rows = batches.map((batch, index) => ({
  index,
  files: batch.files || [],
  name: (batch.files || []).map(f => path.basename(f)).join(' + ') || '(empty batch)',
  wallMs: Number.isFinite(batch.wall_ms) ? batch.wall_ms : null,
  peakMb: Number.isFinite(batch.peak_rss_bytes) ? batch.peak_rss_bytes / 1048576 : null,
}));

const measured = rows.filter(row => row.wallMs != null);
const unmeasured = rows.length - measured.length;
const totalSec = measured.reduce((sum, row) => sum + row.wallMs, 0) / 1000;
const sortedSec = measured.map(row => row.wallMs / 1000).sort((a, b) => a - b);
const heaviest = [...measured].sort((a, b) => b.wallMs - a.wallMs);

// How concentrated is the run? The number that decides whether the fix is
// "run fewer things" or "make everything faster".
const concentration = [];
{
  let cumulative = 0;
  for (const [rank, row] of heaviest.entries()) {
    cumulative += row.wallMs / 1000;
    for (const share of [0.5, 0.8, 0.9]) {
      if (!concentration.some(entry => entry.share === share) && cumulative >= totalSec * share) {
        concentration.push({ share, files: rank + 1, sec: cumulative });
      }
    }
  }
}

const summary = {
  source: path.relative(ROOT, source.path),
  kind: source.label,
  partial: source.partial || unmeasured > 0,
  full_suite_pass: source.record.full_suite_pass === true,
  batches: rows.length,
  measured: measured.length,
  unmeasured,
  total_sec: Number(totalSec.toFixed(1)),
  min_sec: quantile(sortedSec, 0),
  p50_sec: quantile(sortedSec, 0.5),
  p90_sec: quantile(sortedSec, 0.9),
  p99_sec: quantile(sortedSec, 0.99),
  max_sec: quantile(sortedSec, 1),
  concentration,
  heaviest: heaviest.slice(0, topCount).map(row => ({
    name: row.name,
    sec: Number((row.wallMs / 1000).toFixed(1)),
    peak_mb: row.peakMb == null ? null : Math.round(row.peakMb),
    share: totalSec ? Number((row.wallMs / 1000 / totalSec * 100).toFixed(1)) : null,
  })),
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.log(`[test-profile] ${summary.kind} — ${summary.source}`);
if (summary.partial) {
  console.log(`[test-profile] PARTIAL: ${unmeasured} of ${rows.length} batches carry no wall time.`);
  console.log('[test-profile] Every figure below is over the measured batches only. A shard plan is refused on this record.');
}
if (!summary.full_suite_pass) {
  console.log('[test-profile] note: this record is not an uninterrupted full-suite pass; timings may span segments.');
}
// A statistic with nothing behind it prints as an em dash. `undefined s` reads
// like a measurement that went wrong; "—" reads like the absence it is.
const sec = value => (value == null ? '—' : `${value.toFixed(1)} s`);

console.log('');
console.log(`  batches measured   ${summary.measured} of ${summary.batches}`);
if (!measured.length) {
  console.log('  total              — nothing in this record was timed');
  console.log('');
  console.log('[test-profile] this record predates wall-time capture; re-run `npm test` to earn a profile.');
  process.exit(0);
}
console.log(`  total              ${(totalSec / 60).toFixed(1)} min (${totalSec.toFixed(0)} s)`);
console.log(`  min / p50          ${sec(summary.min_sec)} / ${sec(summary.p50_sec)}`);
console.log(`  p90 / p99 / max    ${sec(summary.p90_sec)} / ${sec(summary.p99_sec)} / ${sec(summary.max_sec)}`);
for (const entry of concentration) {
  console.log(`  ${(entry.share * 100).toFixed(0)}% of the time      ${entry.files} file(s) — ${(entry.sec / 60).toFixed(1)} min`);
}
console.log('');
console.log(`  heaviest ${topCount}:`);
for (const row of summary.heaviest) {
  console.log(`    ${String(row.sec).padStart(7)}s  ${String(row.share).padStart(4)}%  `
    + `${row.peak_mb == null ? '   ? ' : String(row.peak_mb).padStart(4)} MB  ${row.name}`);
}
console.log('');
console.log('[test-profile] passive instrument — exit 0 regardless of how slow the suite is.');
