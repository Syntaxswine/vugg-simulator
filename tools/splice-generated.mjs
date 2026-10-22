/**
 * tools/splice-generated.mjs — keeps a document's tables generated: replaces each
 * `<!-- generated:NAME -->` … `<!-- /generated:NAME -->` block whose NAME a tool owns with that tool's
 * fresh section, or checks that every such block already matches. Several tools can share one document:
 * each touches only its own names, and each of its names must appear exactly once, so a block cannot
 * be dropped (and its table typed by hand) without the check failing.
 *
 * Used by tools/showcase-scoreboard.mjs and tools/substrate-census.mjs (--splice / --check-splice).
 */
import fs from 'node:fs';

const BLOCK = /<!-- generated:([a-z0-9-]+) -->\n[\s\S]*?<!-- \/generated:\1 -->/g;

/**
 * sections: { NAME: markdown }; check: compare only. Returns { changed: [names], names }; throws when a
 * name is missing or repeated.
 */
export function spliceGenerated(file, sections, { check = false, owner = 'this tool' } = {}) {
  const text = fs.readFileSync(file, 'utf8');
  const count = Object.fromEntries(Object.keys(sections).map((k) => [k, 0]));
  const changed = [];
  const next = text.replace(BLOCK, (all, name) => {
    if (!(name in sections)) return all;
    count[name]++;
    const fresh = `<!-- generated:${name} -->\n${sections[name]}\n<!-- /generated:${name} -->`;
    if (fresh !== all) changed.push(name);
    return fresh;
  });
  const wrong = Object.entries(count).filter(([, c]) => c !== 1).map(([k, c]) => `${k} (${c} blocks)`);
  if (wrong.length) throw new Error(`${file}: every ${owner} section must appear exactly once — ${wrong.join(', ')}`);
  if (!check && next !== text) fs.writeFileSync(file, next);
  return { changed, names: Object.keys(sections) };
}
