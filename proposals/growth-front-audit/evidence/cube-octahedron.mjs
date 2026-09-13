// Audit probe: run with Node 24; reads the pinned source directly from Git.
// It does not load the simulation, modify runtime files, or rebake evidence.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const baseline = 'f7ca38c4544e1d1224ca57962e212ee86ec2f8ab';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const sourcePath = 'js/46-wulff-geometry.ts';
const source = execFileSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/').replace(/\/$/, '')}`,
  'show', `${baseline}:${sourcePath}`], { cwd: repo, encoding: 'utf8' });
const context = vm.createContext({});
vm.runInContext(stripTypeScriptTypes(source), context, { timeout: 5000 });
const rows = [
  { name: 'equal perpendicular distances', cubeD: 1, octD: 1, vertices: 24, histogram: { 4: 6, 6: 8 } },
  { name: 'cuboctahedron', cubeD: 1, octD: 2 / Math.sqrt(3), vertices: 12, histogram: { 3: 8, 4: 6 } },
  { name: 'octahedron planes beyond cube', cubeD: 1, octD: 2, vertices: 8, histogram: { 4: 6 } },
  { name: 'octahedron planes moved inward', cubeD: 1, octD: 0.5, vertices: 6, histogram: { 3: 8 } },
].map(({ name, cubeD, octD, vertices, histogram }) => {
  const faces = [
    ...context.wulffCubicNormals([1, 0, 0]).map(n => ({ n, d: cubeD })),
    ...context.wulffCubicNormals([1, 1, 1]).map(n => ({ n, d: octD })),
  ];
  const poly = context.wulffPolyhedron(faces);
  const actual = {};
  for (const f of poly.faces) actual[f.verts.length] = (actual[f.verts.length] || 0) + 1;
  assert.equal(poly.vertices.length, vertices);
  assert.deepEqual(actual, histogram);
  // Independent half-space inequalities for these unit-normal cubic forms.
  for (const v of poly.vertices) {
    assert(Math.max(...v.map(Math.abs)) <= cubeD + 1e-9);
    assert(v.reduce((sum, x) => sum + Math.abs(x), 0) <= Math.sqrt(3) * octD + 1e-9);
  }
  return { name, cubeD, octD, vertices: poly.vertices.length, faceVertexHistogram: actual, pass: true };
});
const result = { baseline, node: process.version, sourcePath,
  sourceSha256: createHash('sha256').update(source).digest('hex'), rows };
writeFileSync(new URL('cube-octahedron.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
