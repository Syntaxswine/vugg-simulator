// Controlled audit fixtures, not natural-scenario observations. Node 24.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const baseline = 'f7ca38c4544e1d1224ca57962e212ee86ec2f8ab';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const context = vm.createContext({});
const sources = ['js/27-geometry-crystal.ts', 'js/46-wulff-geometry.ts',
  'js/46a-quartz-render.ts', 'js/46l-replay-history.ts'].map(sourcePath => {
  const source = execFileSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/').replace(/\/$/, '')}`,
    'show', `${baseline}:${sourcePath}`], { cwd: repo, encoding: 'utf8' });
  vm.runInContext(stripTypeScriptTypes(source), context, { timeout: 5000 });
  return { sourcePath, sha256: createHash('sha256').update(source).digest('hex') };
});
const clone = value => JSON.parse(JSON.stringify(value));
const crystal = { crystal_id: 12, mineral: 'quartz', nucleation_step: 0, habit: 'prismatic', zones: [
  { step: 1, thickness_um: 1000, aspect_ratio: 0.4 },
  { step: 2, thickness_um: 2000, aspect_ratio: 0.4 },
  { step: 3, thickness_um: -1500, aspect_ratio: 0.4 },
] };
const before = clone(context.recordedGrowthDimensions(crystal, 1));
const reliefAt2 = clone(context.quartzRenderHistory(crystal, 2));
const reliefAt3 = clone(context.quartzRenderHistory(crystal, 3));
assert.deepEqual(reliefAt3, reliefAt2);
const dimAt3 = clone(context.recordedGrowthDimensions(crystal, 3));
assert.equal(dimAt3.c_length_mm, 1.5);
assert.equal(reliefAt3.growth_um, 3000);
crystal.habit = 'tabular';
crystal._split = { index: 1 };
crystal.zones.push({ step: 4, thickness_um: 5000, aspect_ratio: 1.5 });
const after = clone(context.recordedGrowthDimensions(crystal, 1));
assert.deepEqual(after, before);
assert.deepEqual(clone(context.quartzRenderHistory(crystal, 3)), reliefAt3);
const legacy = clone(context.recordedGrowthDimensions({ nucleation_step: 0,
  habit: 'tabular', zones: [{ step: 1, thickness_um: 1000 }] }, 1));
assert.equal(legacy.aspect_history, 'legacy-neutral-display');
assert.equal(legacy.a_width_mm, 0.5);
const result = { baseline, node: process.version, sources, scope: 'controlled function fixtures; no full renderer or formation run',
  rows: [
    { name: 'earlier dimensions ignore future zones/current habit/split', before, after, pass: true },
    { name: 'positive-only quartz relief ignores retreat', reliefAt2, reliefAt3, dimAt3, pass: true,
      interpretation: 'declared display texture; not surviving physical growth-front history' },
    { name: 'missing aspect remains explicitly unknown', legacy, pass: true },
  ] };
writeFileSync(new URL('history-cursor.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
