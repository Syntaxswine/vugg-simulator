// ============================================================
// js/99g-renderer-replay.ts — Topo replay player (cycles wall-state history at fixed speed)
// ============================================================
// topoReplay + _topoPlaybackTimer module state. Uses sim.wall_state_history snapshots to step the visualization.
//
// Phase B12 of PROPOSAL-MODULAR-REFACTOR — split renderer.

let _topoPlaybackTimer = null;

function topoReplay() {
  const btn = document.getElementById('topo-replay-btn');
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;

  // Toggle: already playing → stop and restore the live view.
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
    topoRender();
    return;
  }

  const history = sim.wall_state_history;
  const totalSteps = history.length;
  // Target ~4s total for long runs, but never slower than 40ms/frame and
  // never faster than 16ms/frame. Scales gracefully from 20-step to
  // 200-step runs without feeling laggy or strobing.
  const frameMs = Math.max(16, Math.min(40, Math.round(4000 / totalSteps)));
  let idx = 0;

  if (btn) { btn.textContent = '⏹'; btn.classList.add('playing'); }
  _topoPlaybackTimer = setInterval(() => {
    if (idx >= history.length) {
      clearInterval(_topoPlaybackTimer);
      _topoPlaybackTimer = null;
      if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
      // Snap back to live so any new growth lands immediately.
      topoRender();
      return;
    }
    topoRender(history[idx]);
    idx++;
  }, frameMs);
}
