// ============================================================
// js/99g-renderer-replay.ts — Topo replay player (cycles wall-state history at fixed speed)
// ============================================================
// topoReplay + _topoPlaybackTimer module state. Uses sim.wall_state_history snapshots to step the visualization.
// v66: also drives the fortress-status panel via _topoReplayActiveSnap so
// T/pH/pressure/σ-pills rewind alongside the 3D cavity.
//
// Phase B12 of PROPOSAL-MODULAR-REFACTOR — split renderer.

let _topoPlaybackTimer = null;
// v66: the active snapshot for the current replay frame, or null when
// replay isn't running. Read by updateFortressStatus (97-ui-fortress.ts)
// so it can rewind T/pH/pressure/fluid composition + σ pills alongside
// the 3D cavity. Written by topoReplay() per frame; cleared on stop.
let _topoReplayActiveSnap = null;

function topoReplay() {
  const btn = document.getElementById('topo-replay-btn');
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;

  const overlay = document.getElementById('topo-replay-overlay');

  // Toggle: already playing → stop and restore the live view.
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    _topoReplayActiveSnap = null;
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
    if (overlay) overlay.style.display = 'none';
    topoRender();
    if (typeof updateFortressStatus === 'function') updateFortressStatus();
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
  if (overlay) overlay.style.display = '';
  _topoPlaybackTimer = setInterval(() => {
    if (idx >= history.length) {
      clearInterval(_topoPlaybackTimer);
      _topoPlaybackTimer = null;
      _topoReplayActiveSnap = null;
      if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
      if (overlay) overlay.style.display = 'none';
      // Snap back to live so any new growth lands immediately.
      topoRender();
      if (typeof updateFortressStatus === 'function') updateFortressStatus();
      return;
    }
    const snap = history[idx];
    _topoReplayActiveSnap = snap;
    topoRender(snap);
    if (typeof updateFortressStatus === 'function') updateFortressStatus();
    if (overlay) {
      // Compact step badge with T / pH from the snapshot's conditions.
      // Falls back to "step N" if conditions aren't recorded (legacy
      // flat snapshots).
      const cnd = snap && snap.conditions;
      const stepN = (snap && snap.step != null) ? snap.step : (idx + 1);
      let line = `▶ replay step ${stepN} / ${totalSteps}`;
      if (cnd) {
        const tStr = cnd.temperature != null ? `${cnd.temperature.toFixed(0)}°C` : '';
        const phStr = (cnd.fluid && cnd.fluid.pH != null) ? `pH ${cnd.fluid.pH.toFixed(1)}` : '';
        const tail = [tStr, phStr].filter(Boolean).join(' · ');
        if (tail) line += `  ·  ${tail}`;
      }
      overlay.textContent = line;
    }
    idx++;
  }, frameMs);
}
