// ============================================================
// js/99g-renderer-replay.ts — Topo replay player (state machine + scrub bar)
// ============================================================
// State machine: idle → playing ↔ paused → idle. Plus scrub mode that
// can interrupt any of the above and restore the prior play/pause
// state on release. Speed control multiplies the effective frame rate.
//
// v66 added per-frame _topoReplayActiveSnap so the fortress-status panel
// rewinds T/pH/pressure/σ-pills alongside the cavity. v67-scrub (this
// file's pickup of the boss-spawned chip) keeps that hook wired through
// every transition — pause keeps the snap alive (panel stays frozen on
// the paused frame), scrub jumps the snap, stop clears it.
//
// State globals (module-level, read by other modules):
//   _topoPlaybackTimer       — setInterval handle when playing, else null
//   _topoReplayActiveSnap    — snap ref or null. Read by 97-ui-fortress.
//   _topoPlaybackIdx         — current frame index (0..history.length-1)
//   _topoPlaybackSpeed       — 0.5 | 1 | 2 | 4 (frame_ms divisor)
//   _topoScrubResumeAfter    — boolean: was playing when drag started?
//
// Public functions (wired from index.html / 94-ui-menu.ts):
//   topoReplay()             — entry point on the corner ▶ button.
//                              Starts from idx=0 if idle; toggles
//                              pause/resume otherwise. (Backwards
//                              compatible with v66 single-button UX.)
//   topoReplayPlayPause()    — pause/resume (used by the bar's ⏸/▶ btn)
//   topoReplayStop()         — full stop, restore live, hide bar.
//                              Also called from 94-ui-menu on nav-away.
//   topoReplayStep(dir)      — ‹ (dir=-1) or › (dir=+1); pauses if
//                              playing, jumps idx by 1, renders.
//   topoReplayScrubInput(e)  — range input drag. Pauses; sets idx;
//                              renders. Remembers wasPlaying.
//   topoReplayScrubChange(e) — range input release. Resumes if was playing.
//   topoReplaySpeed(s)       — sets _topoPlaybackSpeed; restarts timer
//                              with new frame_ms if currently playing.
//
// Phase B12 of PROPOSAL-MODULAR-REFACTOR — split renderer.

let _topoPlaybackTimer = null;
// v66: the active snapshot for the current replay frame, or null when
// not playing AND not paused/scrubbing. Read by updateFortressStatus
// (97-ui-fortress.ts) so it can rewind T/pH/pressure/fluid composition
// + σ pills alongside the 3D cavity.
let _topoReplayActiveSnap = null;
// v67-scrub: persistent state across pause/scrub/resume cycles.
let _topoPlaybackIdx = 0;
let _topoPlaybackSpeed = 1;
let _topoScrubResumeAfter = false;

// History reference is fetched fresh from topoActiveSim() each tick so
// the user can keep growing crystals after pausing — fresh snapshots
// just extend the array, idx is unchanged. (The decimation policy in
// 85c-simulator-state.ts means the array grows slowly even on long
// runs, so caching the ref isn't worth the staleness risk.)

// Compute frame_ms for the current playback. Targets ~4 s total walk
// at 1× speed; clamped to [16, 40] ms so a 20-step run isn't a strobe
// and a 200-step run still feels paced. Speed multiplier divides the
// frame_ms (0.5× = 80 ms cap, 4× = 4 ms — clamped back to 16 ms floor).
function _topoReplayFrameMs(historyLen: number): number {
  const baseMs = Math.max(16, Math.min(40, Math.round(4000 / Math.max(1, historyLen))));
  const adjusted = baseMs / Math.max(0.0001, _topoPlaybackSpeed);
  // Floor at 8 ms — even at 4×, frames slower than 8 ms strobe and
  // load the renderer's per-frame work too tightly.
  return Math.max(8, adjusted);
}

// Render frame `idx` and update fortress + overlay + scrub thumb. Sets
// _topoReplayActiveSnap so updateFortressStatus picks up the snapshot's
// conditions for the σ-pills + T/pH/pressure swap.
function _topoReplayRenderFrame(idx: number) {
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;
  const history = sim.wall_state_history;
  if (idx < 0) idx = 0;
  if (idx >= history.length) idx = history.length - 1;
  _topoPlaybackIdx = idx;
  const snap = history[idx];
  _topoReplayActiveSnap = snap;
  topoRender(snap);
  if (typeof updateFortressStatus === 'function') updateFortressStatus();
  _topoReplayUpdateOverlay(snap, idx, history.length);
  _topoReplayUpdateScrub(idx, history.length);
}

// Repaint the bottom-center step overlay text from the active snap.
// State-aware glyph + suffix so the user can tell at a glance whether
// the replay is playing, paused mid-history, or has hit the end:
//   playing       →  ▶ step N / total · ...
//   paused mid    →  ⏸ step N / total · ...
//   paused at end →  ⏹ step N / total (end) · ...
// The end state is the post-auto-pause case from `e9f755a` — without
// the "(end)" suffix, the overlay reads identical to mid-replay-paused
// and the user can't tell if they're at the terminal frame.
//
// The denominator is the LAST snapshot's sim step, not the history
// array length. After v67 snapshot decimation (`26b19cd`) those two
// numbers diverge: a 200-step run keeps ~63 snapshots, so
// "step 198 / 63" would have read as nonsense ("198 of 63"). Using
// the last snap's step keeps "N / total-steps-run" as the user's
// mental model.
function _topoReplayUpdateOverlay(snap: any, idx: number, total: number) {
  const overlay = document.getElementById('topo-replay-overlay');
  if (!overlay) return;
  const cnd = snap && snap.conditions;
  const stepN = (snap && snap.step != null) ? snap.step : (idx + 1);
  // Resolve the total-steps denominator from the last snapshot of the
  // current sim's history. Falls back to array length if the history
  // is unavailable for any reason (defensive — should be rare).
  let totalSteps = total;
  const sim = (typeof topoActiveSim === 'function') ? topoActiveSim() : null;
  const hist = sim && sim.wall_state_history;
  if (hist && hist.length) {
    const lastSnap = hist[hist.length - 1];
    if (lastSnap && lastSnap.step != null) totalSteps = lastSnap.step;
  }
  let glyph;
  let suffix = '';
  if (_topoPlaybackTimer) {
    glyph = '▶';
  } else if (idx >= total - 1) {
    glyph = '⏹';
    suffix = ' (end)';
  } else {
    glyph = '⏸';
  }
  let line = `${glyph} step ${stepN} / ${totalSteps}${suffix}`;
  if (cnd) {
    const tStr = cnd.temperature != null ? `${cnd.temperature.toFixed(0)}°C` : '';
    const phStr = (cnd.fluid && cnd.fluid.pH != null) ? `pH ${cnd.fluid.pH.toFixed(1)}` : '';
    const tail = [tStr, phStr].filter(Boolean).join(' · ');
    if (tail) line += `  ·  ${tail}`;
  }
  overlay.textContent = line;
}

// Sync scrub bar thumb to the current idx without firing input events
// (the scrub events would otherwise re-pause and create feedback).
function _topoReplayUpdateScrub(idx: number, total: number) {
  const scrub = document.getElementById('topo-replay-scrub') as HTMLInputElement | null;
  if (!scrub) return;
  if (parseInt(scrub.max, 10) !== total - 1) scrub.max = String(total - 1);
  // Only assign if different — avoids redundant DOM thrash on every tick.
  if (scrub.value !== String(idx)) scrub.value = String(idx);
}

// Show the replay control bar + step overlay (visible only while
// idx-is-valid — i.e. playing, paused, or scrub-frozen). Also flips
// the corner ▶ button into "active" mode.
function _topoReplayShowBar() {
  const overlay = document.getElementById('topo-replay-overlay');
  const bar = document.getElementById('topo-replay-bar');
  const btn = document.getElementById('topo-replay-btn');
  if (overlay) overlay.style.display = '';
  if (bar) bar.style.display = '';
  if (btn) {
    // Hide the corner entry-button while the bar is active — the bar
    // owns the play/pause toggle now.
    btn.style.visibility = 'hidden';
  }
}

// Hide the replay UI; restore the corner entry-button.
function _topoReplayHideBar() {
  const overlay = document.getElementById('topo-replay-overlay');
  const bar = document.getElementById('topo-replay-bar');
  const btn = document.getElementById('topo-replay-btn');
  if (overlay) overlay.style.display = 'none';
  if (bar) bar.style.display = 'none';
  if (btn) {
    btn.textContent = '▶';
    btn.classList.remove('playing');
    btn.style.visibility = '';
  }
}

// Repaint the play/pause button icon based on whether the timer is
// currently running. Title hint matches the keydown handler at the
// bottom of this file (Space toggles).
function _topoReplaySyncPlayPauseIcon() {
  const playPause = document.getElementById('topo-replay-playpause');
  if (!playPause) return;
  playPause.textContent = _topoPlaybackTimer ? '⏸' : '▶';
  playPause.title = _topoPlaybackTimer ? 'Pause (Space)' : 'Resume (Space)';
}

// Highlight the active speed button.
function _topoReplaySyncSpeedButtons() {
  const buttons = document.querySelectorAll('#topo-replay-bar .speed-btn');
  buttons.forEach((b: any) => {
    const v = parseFloat(b.dataset.speed);
    if (v === _topoPlaybackSpeed) b.classList.add('active');
    else b.classList.remove('active');
  });
}

// Internal: kick the timer from a given idx with the current speed.
function _topoReplayStartTimer(fromIdx: number) {
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;
  const history = sim.wall_state_history;
  if (_topoPlaybackTimer) clearInterval(_topoPlaybackTimer);
  _topoPlaybackIdx = Math.max(0, Math.min(fromIdx, history.length - 1));
  const frameMs = _topoReplayFrameMs(history.length);

  // Render the starting frame immediately so the user doesn't see a
  // delay before the first paint.
  _topoReplayRenderFrame(_topoPlaybackIdx);

  _topoPlaybackTimer = setInterval(() => {
    const sim2 = topoActiveSim();
    if (!sim2 || !sim2.wall_state_history) {
      topoReplayStop();
      return;
    }
    const h = sim2.wall_state_history;
    _topoPlaybackIdx++;
    if (_topoPlaybackIdx >= h.length) {
      // Played to the end — auto-PAUSE on the last frame instead of
      // stopping. The bar stays visible so the user can scrub backward
      // to study, or press Space / ▶ to restart from the beginning
      // (topoReplayPlayPause's "if at end, restart from 0" branch
      // handles that). The previous tick already rendered idx =
      // h.length - 1, so we just clamp and freeze the timer.
      _topoPlaybackIdx = h.length - 1;
      clearInterval(_topoPlaybackTimer);
      _topoPlaybackTimer = null;
      _topoReplaySyncPlayPauseIcon();
      // Re-run the overlay text now that we're in the "ended" state so
      // the glyph + (end) suffix appear without a fresh render.
      _topoReplayUpdateOverlay(_topoReplayActiveSnap, _topoPlaybackIdx, h.length);
      return;
    }
    _topoReplayRenderFrame(_topoPlaybackIdx);
  }, frameMs);
  _topoReplaySyncPlayPauseIcon();
}

// Public — entry point on the corner ▶ button. Starts from idx=0 when
// idle. When already active (playing or paused), defers to the bar's
// play/pause behavior — so old call sites that still hit this function
// keep working.
function topoReplay() {
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;

  // If active in any state (playing, paused, scrub-frozen), treat the
  // entry-button click as play/pause toggle.
  if (_topoReplayActiveSnap != null) {
    topoReplayPlayPause();
    return;
  }

  // Cold start.
  _topoPlaybackIdx = 0;
  _topoPlaybackSpeed = 1;
  _topoReplayShowBar();
  _topoReplaySyncSpeedButtons();
  _topoReplayStartTimer(0);
}

// Toggle play/pause from the bar.
function topoReplayPlayPause() {
  if (_topoPlaybackTimer) {
    // Pause: keep idx, keep _topoReplayActiveSnap so fortress panel
    // stays frozen on the paused frame.
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    _topoReplaySyncPlayPauseIcon();
    // Re-run the overlay so the glyph flips ▶ → ⏸ for the paused state.
    const sim = topoActiveSim();
    if (sim && sim.wall_state_history) {
      _topoReplayUpdateOverlay(_topoReplayActiveSnap, _topoPlaybackIdx, sim.wall_state_history.length);
    }
    return;
  }
  // Resume from current idx. If at the end, restart from 0.
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;
  let resumeIdx = _topoPlaybackIdx;
  if (resumeIdx >= sim.wall_state_history.length - 1) resumeIdx = 0;
  _topoReplayShowBar();
  _topoReplayStartTimer(resumeIdx);
}

// Full stop — clears all replay state, restores the live view, hides
// the bar. Also called from 94-ui-menu.ts when navigating away.
function topoReplayStop() {
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
  }
  _topoReplayActiveSnap = null;
  _topoPlaybackIdx = 0;
  _topoScrubResumeAfter = false;
  _topoReplayHideBar();
  topoRender();
  if (typeof updateFortressStatus === 'function') updateFortressStatus();
}

// Single-frame step. dir = -1 or +1. Pauses if playing.
function topoReplayStep(dir: number) {
  const sim = topoActiveSim();
  if (!sim || !sim.wall_state_history || !sim.wall_state_history.length) return;
  // If we're not in any active replay state yet, start from idx=0
  // first so the user can step from the beginning.
  if (_topoReplayActiveSnap == null) {
    _topoPlaybackSpeed = 1;
    _topoReplayShowBar();
    _topoReplaySyncSpeedButtons();
    _topoReplayRenderFrame(0);
    return;
  }
  // Pause the timer if it's running — frame-step is a deliberate
  // single-step action, the user wants to study one frame.
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    _topoReplaySyncPlayPauseIcon();
  }
  const history = sim.wall_state_history;
  const nextIdx = Math.max(0, Math.min(_topoPlaybackIdx + dir, history.length - 1));
  _topoReplayRenderFrame(nextIdx);
}

// Scrub bar `input` event — fires on every drag move. Pauses the
// timer if running (remembers wasPlaying for the release-resume), then
// jumps to the dragged frame.
function topoReplayScrubInput(ev: any) {
  const target = ev && ev.target;
  if (!target) return;
  const idx = parseInt(target.value, 10);
  if (!Number.isFinite(idx)) return;
  // First drag move pauses + remembers state.
  if (_topoPlaybackTimer) {
    _topoScrubResumeAfter = true;
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    _topoReplaySyncPlayPauseIcon();
  }
  // Make sure the bar is visible — scrubbing from idle counts as
  // entering replay mode.
  if (_topoReplayActiveSnap == null) {
    _topoPlaybackSpeed = 1;
    _topoReplayShowBar();
    _topoReplaySyncSpeedButtons();
  }
  _topoReplayRenderFrame(idx);
}

// Scrub bar `change` event — fires on release. Resumes if we were
// playing when the drag began.
function topoReplayScrubChange(_ev: any) {
  if (_topoScrubResumeAfter) {
    _topoScrubResumeAfter = false;
    _topoReplayStartTimer(_topoPlaybackIdx);
  }
}

// Speed selector. Restarts the timer with new frame_ms if currently
// playing. Pause/idle just records the new speed for the next play.
function topoReplaySpeed(speed: number) {
  if (!Number.isFinite(speed) || speed <= 0) return;
  _topoPlaybackSpeed = speed;
  _topoReplaySyncSpeedButtons();
  if (_topoPlaybackTimer) {
    // Restart with new frame_ms.
    _topoReplayStartTimer(_topoPlaybackIdx);
  }
}

// v67-scrub keyboard shortcuts. Wire once at module load (the bundle
// is concatenated into a single script-mode IIFE, so this attaches at
// page parse time). Only intercepts when:
//   1. user isn't typing into an input/textarea/select/contenteditable,
//   2. replay is currently active (_topoReplayActiveSnap != null), and
//   3. the topo panel is visible.
// The bar's title attributes ("Previous frame (←)", "Next frame (→)",
// "Pause (Space)", "Stop and return to live (Esc)") document the
// keymap; this handler delivers on those promises.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('keydown', (ev: any) => {
    // Skip when user is typing — don't hijack inputs.
    const tgt: HTMLElement | null = ev && ev.target as HTMLElement;
    if (tgt) {
      const tag = (tgt.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((tgt as any).isContentEditable) return;
    }
    // Modifier-pressed combos belong to the browser / OS.
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    // Replay must be active for these keys to mean anything.
    if (typeof _topoReplayActiveSnap === 'undefined' || _topoReplayActiveSnap == null) return;
    // Topo panel must be visible.
    const topoPanel = document.getElementById('topo-panel');
    if (!topoPanel || topoPanel.style.display === 'none') return;

    switch (ev.key) {
      case 'ArrowLeft':
        ev.preventDefault();
        topoReplayStep(-1);
        break;
      case 'ArrowRight':
        ev.preventDefault();
        topoReplayStep(1);
        break;
      case ' ':
      case 'Spacebar':  // older Edge / Firefox
        ev.preventDefault();
        topoReplayPlayPause();
        break;
      case 'Escape':
      case 'Esc':       // older Edge
        ev.preventDefault();
        topoReplayStop();
        break;
    }
  });
}
