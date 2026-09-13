// Mechanical audit-link validation; it cannot establish semantic support.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseline = 'f7ca38c4544e1d1224ca57962e212ee86ec2f8ab';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const auditDir = path.join(repo, 'proposals/growth-front-audit');
const files = [path.join(repo, 'proposals/GROWTH-FRONT-AUDIT-2026-09-12.md'),
  ...readdirSync(auditDir).filter(f => f.endsWith('.md')).sort().map(f => path.join(auditDir, f))];
const sourceCache = new Map();
const citations = [];
let localLinks = 0;
for (const file of files) {
  const markdown = readFileSync(file, 'utf8');
  const reference = /https:\/\/github\.com\/Syntaxswine\/vugg-simulator\/blob\/([0-9a-f]+)\/([^\s)#]+)#L(\d+)(?:-L(\d+))?/gi;
  for (const match of markdown.matchAll(reference)) {
    const [, commit, sourcePath, startText, endText] = match;
    assert.equal(commit, baseline, `unpinned or wrong base: ${match[0]}`);
    if (!sourceCache.has(sourcePath)) {
      const source = execFileSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/').replace(/\/$/, '')}`,
        'show', `${baseline}:${sourcePath}`], { cwd: repo, encoding: 'utf8' });
      sourceCache.set(sourcePath, { sourcePath, lineCount: source.trimEnd().split('\n').length,
        sha256: createHash('sha256').update(source).digest('hex') });
    }
    const start = Number(startText), end = Number(endText || startText);
    assert(start >= 1 && end >= start && end <= sourceCache.get(sourcePath).lineCount, match[0]);
    citations.push({ document: path.relative(repo, file).replaceAll('\\', '/'), sourcePath, start, end });
  }
  // Only relative links: publisher URLs contain balanced parentheses and are
  // deliberately outside this mechanical local-link parser's scope.
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/i.test(target)) continue;
    const absolute = path.resolve(path.dirname(file), target.split('#')[0]);
    assert(existsSync(absolute), `missing local target ${target} in ${file}`);
    localLinks++;
  }
}
const result = { baseline, node: process.version, scope: 'file existence, pinned commit and line-range bounds only; semantic support reviewed separately',
  documents: files.map(f => path.relative(repo, f).replaceAll('\\', '/')),
  codeCitations: citations.length, localLinks, sources: [...sourceCache.values()], citations, pass: true };
writeFileSync(new URL('citation-check.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ pass: true, documents: files.length, codeCitations: citations.length,
  pinnedFiles: sourceCache.size, localLinks, baseline }, null, 2));
