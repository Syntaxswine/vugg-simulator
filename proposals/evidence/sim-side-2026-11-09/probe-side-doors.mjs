#!/usr/bin/env node
/**
 * probe-side-doors.mjs — what a "side door" on a nucleation function's count gate is made of
 * (proposals/REVIEW-SIMULATION-SIDE-2026-11-09.md §2.3).
 *
 * tools/sim-side-census.mjs reads, in the nucleation files, the functions that refuse a new crystal
 * while one of their species is active, and notes those whose gate keeps a side door: a roll on
 * the gate's own line, `!X.length || (… rng.random() < p)` or `if (X.length && !(… rng.random() …`.
 * The census counts a species-step at such a gate apart, as one that could still have rolled. This
 * probe asks how open that door is. For each side door, with the same function split and the same
 * two forms as the census's staticReadings():
 *
 *   - does the door's own line also compare sigma with a threshold of its own (a number, or a
 *     named constant), so that the roll is taken only past it?
 *   - does the function also keep a hard gate above one on the same list (`X.length < N`, N > 1),
 *     which closes the door once N crystals are active?
 *
 * A door with either is shut on some of the species-steps the census files under it, so that count
 * is an upper bound on the steps that could have rolled.
 *
 * A static reading of the source: it runs no simulation, imports only node builtins, prints to
 * stdout, writes nothing and exits 0. Like the census's own static readings it has no control.
 *
 *   node proposals/evidence/sim-side-2026-11-09/probe-side-doors.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const dir = path.join(ROOT, 'js');
const nucFiles = fs.readdirSync(dir).filter(f => /^(8\d[a-z]?|9[01])-nucleation-.*\.ts$/.test(f)).sort();
let functions = 0, atOne = 0;
const doors = [];
for (const f of nucFiles) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  const re = /^function _nuc_([A-Za-z0-9_]+)\(sim\) \{/gm;
  const starts = [];
  let m;
  while ((m = re.exec(src))) starts.push({ name: m[1], idx: m.index });
  for (let i = 0; i < starts.length; i++) {
    functions++;
    const body = src.slice(starts[i].idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
    const lines = body.split('\n').filter(t => !/^\s*\/\//.test(t));
    const code = lines.join('\n');
    let gateAtOne = false, door = null;
    for (const d of code.matchAll(/const (\w+) = sim\.crystals\.filter\(c => c\.mineral === '([A-Za-z0-9_]+)'([^\n]*)/g)) {
      // the list of this function's own active crystals (a `.length;` on the declaration is a count,
      // which the census reads by its comparisons instead)
      if (d[2] !== starts[i].name || /\)\.length;/.test(d[3]) || !/c\.active/.test(d[3])) continue;
      const X = d[1];
      if (!(new RegExp(`!${X}\\.length\\b`).test(code) || new RegExp(`if \\(${X}\\.length(\\) return|\\s*\\|\\||\\s*&&\\s*!\\()`).test(code))) continue;
      gateAtOne = true;
      const a = lines.find(t => new RegExp(`!${X}\\.length\\s*\\|\\|[^\\n]*rng\\.random\\(\\)`).test(t));
      const b = lines.find(t => new RegExp(`if \\(${X}\\.length\\s*&&\\s*!\\([^\\n]*rng\\.random\\(\\)`).test(t));
      if (!a && !b) continue;
      const text = a ? a.slice(a.indexOf(`!${X}.length`)) : b.slice(b.indexOf(`${X}.length`));
      // a threshold on sigma: a number, or a named constant (andalusite's is its sigma_crit + 0.5)
      const sigma = /sigma\w*\s*(>=|>)\s*[\w.]+/i.test(text);
      const hard = [...code.matchAll(new RegExp(`\\b${X}\\.length\\s*(<=|<|>=|>)\\s*(\\d+)`, 'g'))]
        .map(t => Number(t[2]) + (t[1] === '>' || t[1] === '<=' ? 1 : 0)).filter(n => n > 1);
      door = { name: starts[i].name, file: f, text: text.trim().replace(/\s*\{\s*$/, ''), sigma, hard: hard.length ? Math.min(...hard) : null };
    }
    if (gateAtOne) atOne++;
    if (door) doors.push(door);
  }
}
const withSigma = doors.filter(d => d.sigma), withHard = doors.filter(d => d.hard != null);
console.log(`nucleation functions ${functions}; with a count gate at one active crystal of their own species, in the forms read here, ${atOne}; of those, with a side door on the gate's line ${doors.length}`);
console.log(`  the door's line also compares sigma with a threshold of its own: ${withSigma.length} of ${doors.length}`);
console.log(`  the function also keeps a hard gate above one on the same list: ${withHard.length} of ${doors.length}`);
console.log(`  a bare roll, with neither: ${doors.filter(d => !d.sigma && d.hard == null).length}`);
console.log('');
for (const d of doors) console.log(`  ${d.name.padEnd(22)} ${d.file.padEnd(34)} ${d.text.slice(0, 96)}${d.hard != null ? `   [hard gate at ${d.hard}]` : ''}`);
