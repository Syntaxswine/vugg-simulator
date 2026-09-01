import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

declare function _topoSyncThreeButtonState(): void;
declare function topoBaseViewSelected(): boolean;
declare function topoSelectThreeRenderer(emitProduct?: boolean): boolean;
declare function topoSetThreeRendererEnabled(enabled: boolean, emitProduct?: boolean): boolean;
declare function topoThreeRendererEnabled(): boolean;
declare function helixOverlayEnabled(): boolean;
declare function helixSetOverlayEnabled(enabled: boolean, emitProduct?: boolean): boolean;

function mountThreeOnlyToolbar() {
  const root = document.createElement('div');
  root.dataset.cavityToolbarTest = 'true';
  root.innerHTML = `
    <div class="topo-camera-ctrls">
      <button id="topo-pan-btn">move</button>
      <button id="topo-rotate-btn">rotate</button>
      <button id="topo-recenter-btn">center</button>
      <button id="topo-three-btn">3D</button>
      <button id="topo-wall-btn">wall</button>
      <button id="helix-overlay-btn">helix</button>
    </div>
    <canvas id="topo-canvas"></canvas>
    <canvas id="topo-canvas-three"></canvas>
    <div id="helix-legend"></div>`;
  document.body.appendChild(root);
  return {
    base: root.querySelector('#topo-three-btn') as HTMLButtonElement,
    helix: root.querySelector('#helix-overlay-btn') as HTMLButtonElement,
  };
}

afterEach(() => {
  helixSetOverlayEnabled(false, false);
  document.querySelectorAll('[data-cavity-toolbar-test]').forEach(node => node.remove());
});

describe('Three-only cavity toolbar', () => {
  it('ships Move, Rotate, Center, 3D, Wall Display, and Helicoid without slices', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const toolbar = html.match(/<div class="topo-camera-ctrls">([\s\S]*?)<\/div>/)?.[1] || '';
    expect([...toolbar.matchAll(/id="([^"]+)"/g)].map(match => match[1])).toEqual([
      'topo-pan-btn', 'topo-rotate-btn', 'topo-recenter-btn',
      'topo-three-btn', 'topo-wall-btn', 'helix-overlay-btn',
    ]);
    expect(toolbar).toContain('onclick="topoToggleWallDisplay()"');
    expect(html).not.toContain('topo-slice-ctrls');
    expect(html).not.toContain('topoCycleSlice(');
    expect(html).not.toContain('cavity-field-cross-section-v1');
  });

  it('keeps Wall Display as an independent Three.js shell control', () => {
    const source = readFileSync(join(process.cwd(), 'js', '99i-renderer-three.ts'), 'utf8');
    expect(source).toContain('function topoToggleWallDisplay()');
    expect(source).toContain('state.wallDisplay = ((state.wallDisplay | 0) + 1) % 3');
    expect(source).toContain('dataset.wallDisplay = label');
  });

  it('refuses a retired 3D-off request instead of opening a flat view', () => {
    const { base } = mountThreeOnlyToolbar();
    _topoSyncThreeButtonState();
    expect(topoThreeRendererEnabled()).toBe(true);
    expect(topoSetThreeRendererEnabled(false, true)).toBe(false);
    expect(topoThreeRendererEnabled()).toBe(true);
    expect(base.getAttribute('aria-pressed')).toBe('true');
  });

  it('treats 3D and Helicoid as mutually exclusive view selectors', () => {
    const { base, helix } = mountThreeOnlyToolbar();
    _topoSyncThreeButtonState();
    expect(topoBaseViewSelected()).toBe(true);
    expect(helixSetOverlayEnabled(true, true)).toBe(true);
    expect(helixOverlayEnabled()).toBe(true);
    expect(topoBaseViewSelected()).toBe(false);
    expect(base.getAttribute('aria-pressed')).toBe('false');
    expect(helix.getAttribute('aria-pressed')).toBe('true');

    const products: any[] = [];
    base.addEventListener('vugg:tutorial-view-state-committed', (event: any) => {
      products.push(event.detail);
    });
    expect(topoSelectThreeRenderer(true)).toBe(true);
    expect(topoBaseViewSelected()).toBe(true);
    expect(helixOverlayEnabled()).toBe(false);
    expect(products).toEqual([{
      schema: 'tutorial-view-state-product-v1',
      control: 'topo-base-view',
      before_enabled: false,
      after_enabled: true,
    }]);
  });

  it('fails closed when Three is unavailable instead of enabling Helicoid', () => {
    const { base } = mountThreeOnlyToolbar();
    const prior = (globalThis as any).THREE;
    try {
      delete (globalThis as any).THREE;
      _topoSyncThreeButtonState();
      expect(base.disabled).toBe(true);
      expect(base.title).toMatch(/unavailable/i);
      expect(helixSetOverlayEnabled(true, true)).toBe(false);
      expect(helixOverlayEnabled()).toBe(false);
    } finally {
      (globalThis as any).THREE = prior;
      _topoSyncThreeButtonState();
    }
  });
});
