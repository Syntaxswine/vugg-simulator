#!/usr/bin/env node
/**
 * tools/sim-side-census-mutations.mjs — does each control of tools/sim-side-census.mjs FAIL when the
 * reading it guards is broken? (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §1.)
 *
 * A control that passes proves little until it has been seen to fail. This tool makes one broken copy
 * of the census per MUTANT below — one line changed, the reading it feeds named beside it — and runs
 * each copy on the scenarios its control needs. The unbroken census is run once, on all of them.
 * Expected: every control PASSES on the census as committed and FAILS on its mutant.
 *
 * The mutants are text replacements. A replacement whose text is not found exactly once stops the
 * tool: when the census source changes, the mutant has to be re-pointed by hand, and the tool says
 * which one.
 *
 * PASSIVE: exits 0 whatever it finds; imports only node builtins; writes only under
 * .local-evidence/sim-side-census-mutations/ (the broken copies live there too, with ROOT spelled
 * out, and are removed in a finally block). Nothing under tools/, js/, data/ or dist/ is written.
 *
 * Usage:
 *   node tools/sim-side-census-mutations.mjs        # seed 42; about 10 min
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CENSUS = path.join(ROOT, 'tools', 'sim-side-census.mjs');
const OUT = path.join(ROOT, '.local-evidence', 'sim-side-census-mutations');
const ROOT_LINE = 'const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));';

const MUTANTS = [
  { id: 'log-read-once', control: ['competition-log', 'positive'], scenarios: ['bisbee', 'porphyry', 'schneeberg'],
    what: 'the step log is scanned on the final step only (run_step resets it every step)',
    from: '    for (const line of log) {', to: '    if (i === steps - 1) for (const line of log) {' },
  { id: 'ration-receipt-ignored', control: ['supply', 'positive'], scenarios: ['epithermal_telluride'],
    what: 'the competition receipt on a zone is not read',
    from: "const rationed = !!(a && typeof a === 'object' && a.scaling < 0.999);", to: 'const rationed = false;' },
  { id: 'voxel-mean-is-bulk', control: ['two-fluids', 'positive'], scenarios: ['radioactive_pegmatite', 'schneeberg'],
    what: 'the voxel mean at run end is read from the bulk handle',
    from: 'voxEnd: sumAll[k] / nVox,', to: 'voxEnd: Number(sim.conditions.fluid[F[k]]) || 0,' },
  { id: 'gap-is-bulk-value', control: ['two-fluids', 'negative'], scenarios: ['mvt'],
    what: 'the gap between the two fluids is computed as the bulk value itself',
    from: 'const d = Math.abs(bulk - mean);', to: 'const d = Math.abs(bulk);' },
  { id: 'fill-reads-zero', control: ['space+end', 'positive'], scenarios: ['gem_pegmatite'],
    what: 'the fill series is recorded as 0',
    from: 'fill.push(Math.round(sim.get_vug_fill() * 1e4) / 1e4);', to: 'fill.push(0);' },
  { id: 'fill-reads-one', control: ['space+end', 'negative'], scenarios: ['mvt'],
    what: 'the fill series is recorded as 1',
    from: 'fill.push(Math.round(sim.get_vug_fill() * 1e4) / 1e4);', to: 'fill.push(1);' },
  { id: 'stop-never-recorded', control: ['space+end', 'positive'], scenarios: ['gem_pegmatite'],
    what: 'the END tracker never notes that a crystal grew, so no stop is ever recorded',
    from: 'if (grewThisStep(c)) { t.grewPrev = true; t.stop = null; }', to: 'if (grewThisStep(c)) { t.stop = null; }' },
  { id: 'pocket-full-never-read', control: ['space+end', 'positive'], scenarios: ['gem_pegmatite'],
    what: 'the END reading never tests the cavity fill, so a full pocket is filed under whatever comes next',
    from: "if (!openSystem && sim.get_vug_fill() >= FULL_FILL) return 'pocket full';", to: '' },
];

if (process.argv.slice(2).some(a => a === '--help' || a === '-h')) {
  console.log('node tools/sim-side-census-mutations.mjs');
  process.exit(0);
}
if (process.argv.length > 2) throw new Error(`unknown argument ${process.argv[2]}`);

const SRC = fs.readFileSync(CENSUS, 'utf8').replace(/\r\n/g, '\n');
const occurrences = (text) => SRC.split(text).length - 1;
if (occurrences(ROOT_LINE) !== 1) throw new Error('the census no longer derives ROOT the way this tool expects');
for (const m of MUTANTS) {
  const n = occurrences(m.from);
  if (n !== 1) throw new Error(`mutant ${m.id}: the line to break occurs ${n} times in tools/sim-side-census.mjs — re-point it`);
}

const T = [];
const say = (s = '') => { T.push(s); console.log(s); };
const runCensus = (script, scenarios, out) => {
  fs.rmSync(out, { recursive: true, force: true });
  execFileSync(process.execPath, [script, ...scenarios, '--seed', '42', '--out', out], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  return JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
};
const verdict = (report, [id, kind]) => {
  const c = report.controls.find(x => x.id === id && x.kind === kind);
  return c ? { verdict: c.pass ? 'PASS' : 'FAIL', detail: c.detail } : { verdict: 'not run', detail: '' };
};

fs.mkdirSync(OUT, { recursive: true });
const results = [];
const made = [];
try {
  const all = [...new Set(MUTANTS.flatMap(m => m.scenarios))].sort();
  say(`sim-side census mutations — ${MUTANTS.length} mutants; the census as committed runs once on ${all.join(', ')} (seed 42)`);
  const ref = runCensus(CENSUS, all, path.join(OUT, 'unmutated'));
  say(`\nthe census as committed${ref.baseline ? ` (${ref.baseline.reproduced} of ${ref.baseline.of} runs reproduce the baseline)` : ''}:`);
  for (const c of ref.controls) say(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.kind} ${c.id} — ${c.detail}`);
  say('\nmutant                    control it should fail      committed  mutant   what was broken');
  for (const m of MUTANTS) {
    const file = path.join(OUT, `mutant-${m.id}.mjs`);
    fs.writeFileSync(file, SRC.replace(ROOT_LINE, `const ROOT = ${JSON.stringify(ROOT)};`).replace(m.from, m.to));
    made.push(file);
    const rep = runCensus(file, m.scenarios, path.join(OUT, `mutant-${m.id}`));
    const a = verdict(ref, m.control), b = verdict(rep, m.control);
    results.push({ mutant: m.id, what: m.what, control: m.control.join(' '), committed: a.verdict, committedDetail: a.detail, mutant_verdict: b.verdict, mutantDetail: b.detail });
    say(`${m.id.padEnd(25)} ${m.control.slice().reverse().join(' ').padEnd(27)} ${a.verdict.padEnd(10)} ${b.verdict.padEnd(8)} ${m.what}`);
    say(`${''.padEnd(25)} ${''.padEnd(27)} committed: ${a.detail}`);
    say(`${''.padEnd(25)} ${''.padEnd(27)} mutant:    ${b.detail}`);
  }
} finally {
  for (const f of made) fs.rmSync(f, { force: true });
}
const ok = results.length === MUTANTS.length && results.every(r => r.committed === 'PASS' && r.mutant_verdict === 'FAIL');
say(ok ? `\nall ${MUTANTS.length} mutants: the control passes on the census as committed and fails on the mutant`
  : '\nNOT every control behaved as expected: see the table');
fs.writeFileSync(path.join(OUT, 'report.txt'), T.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ seed: 42, ok, results }, null, 1) + '\n');
console.log(`\nwrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')}/report.{txt,json}`);
