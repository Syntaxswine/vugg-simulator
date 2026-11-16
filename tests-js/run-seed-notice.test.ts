import { afterEach, describe, expect, it } from 'vitest';

declare const _topoRunSeedNotice: any;

const roots: HTMLElement[] = [];
function panel() {
  const root = document.createElement('section');
  root.innerHTML = '<div class="topo-header">Wall profile</div><input name="seed" value=""><canvas></canvas>';
  document.body.append(root); roots.push(root);
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) root.remove(); });

describe('visible original run seeds', () => {
  it('shows resolved growth and shape seeds without filling the random input', () => {
    const root = panel();
    _topoRunSeedNotice(root, { _agentRunMeta: { seed: 198532741, shape_seed: 7 }, rng_state: 123 });
    const notice = root.querySelector('[data-run-seeds]')!;
    expect(notice.textContent).toBe('Growth seed: 198532741 · Shape seed: 7');
    expect(root.querySelector('input')!.value).toBe('');
    expect(root.querySelector('.topo-header')!.nextElementSibling).toBe(notice);
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');
  });

  it('keeps seed zero, updates on switching runs, and does not duplicate or replace the unchanged status', () => {
    const root = panel();
    const sim = { _agentRunMeta: { seed: 0, shape_seed: 0 } };
    _topoRunSeedNotice(root, sim);
    const note = root.querySelector('[data-run-seeds]')!;
    expect(note.textContent).toBe('Growth seed: 0 · Shape seed: 0');
    const text = note.firstChild;
    _topoRunSeedNotice(root, sim);
    expect(note.firstChild).toBe(text);
    _topoRunSeedNotice(root, { _agentRunMeta: { seed: 42, shape_seed: 13 } });
    expect(note.textContent).toBe('Growth seed: 42 · Shape seed: 13');
    expect(root.querySelectorAll('[data-run-seeds]').length).toBe(1);
  });

  it('reports unknown legacy seeds honestly, never substituting a current RNG state', () => {
    const root = panel();
    _topoRunSeedNotice(root, { seed: 1, rng_state: 999, wall_state: { shape_seed: 5 } });
    expect(root.querySelector('[data-run-seeds]')!.textContent)
      .toBe('Growth seed: not recorded · Shape seed: not recorded');
    _topoRunSeedNotice(root, { _agentRunMeta: { seed: NaN, shape_seed: '<script>' } });
    expect(root.querySelector('[data-run-seeds]')!.textContent)
      .toBe('Growth seed: not recorded · Shape seed: not recorded');
  });

  it('removes a stale identity when there is no active specimen', () => {
    const root = panel();
    _topoRunSeedNotice(root, { _agentRunMeta: { seed: 42, shape_seed: 7 } });
    _topoRunSeedNotice(root, null);
    expect(root.querySelector('[data-run-seeds]')).toBeNull();
  });
});
