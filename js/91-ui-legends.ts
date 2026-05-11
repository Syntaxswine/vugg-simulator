// ============================================================
// js/91-ui-legends.ts — UI — Legends (Simulation) mode
// ============================================================
// Extracted verbatim from the legacy bundle. SCRIPT-mode TS — top-level
// decls stay global so cross-file references resolve at runtime.
//
// Phase B11 of PROPOSAL-MODULAR-REFACTOR.

// ============================================================
// UI LOGIC — LEGENDS MODE (unchanged)
// ============================================================

let running = false;
// =====================================================================
// Simulation mode (internal name: "legends")
// =====================================================================
// User-visible label is "Simulation" (title card "🔬 Simulation", menu
// button "Simulation."). The `legends*` token is the pre-rename
// internal name still in this global, scenario-list helpers
// (legendsSimSource, etc.), and various comments. Token kept stable
// because the rename happened only at the user-visible surface — see
// commit 467e8c4. The post-game source field uses 'Simulation'.
// See proposals/BACKLOG.md "Internal token cleanup" for the deferred
// thorough rename.
let legendsSim = null;
// =====================================================================
// Record Player (internal name: "groove")
// =====================================================================
// User-visible label is "📀 Record Player" (title card, mode-switcher
// button). The `groove*` token is the pre-rename internal name spread
// across switchMode('groove'), playCollectedInGroove, mode-groove
// button ID, .groove-tooltip / .groove-canvas-wrap CSS classes, and
// the modal stand-in below. NOTE: the term "groove" is genuinely
// correct for the *visualization primitive* inside the Record Player
// — it really is a record's groove, read radially. So even if we
// rename the mode codepath, the rainbow-lane drawing routines stay
// "groove". See proposals/BACKLOG.md "Internal token cleanup".
let grooveModalCrystal = null;

function runSimulation() {
  if (running) return;
  const scenarioName = document.getElementById('scenario').value;
  const seedInput = document.getElementById('seed').value;
  const stepsInput = document.getElementById('steps').value;

  const seed = seedInput ? parseInt(seedInput, 10) : Math.floor(Math.random() * 2147483647);
  rng = new SeededRandom(seed);

  const { conditions, events, defaultSteps } = SCENARIOS[scenarioName]();
  const parsedSteps = stepsInput ? parseInt(stepsInput, 10) : NaN;
  const totalSteps = (parsedSteps && parsedSteps > 0) ? parsedSteps : defaultSteps;

  const allLines = [];
  // Narrative-tempo Phase 1: track which line indices are step-header
  // sync points + their sim step number. displayLines() reads this map
  // and advances the topo cavity to the historical snapshot for that
  // step as the line scrolls in — reading and watching become the same
  // activity instead of "text scrolls while cavity sits frozen at the
  // final state". See proposals/PROPOSAL-NARRATIVE-TEMPO.md.
  const lineToStep: Record<number, number> = {};

  allLines.push(`🪨 Vugg Simulator — ${scenarioName} scenario (seed: ${seed})`);
  allLines.push(`   ${totalSteps} time steps, starting at ${conditions.temperature.toFixed(0)}°C, ${conditions.pressure.toFixed(1)} kbar`);
  allLines.push(`   Initial fluid: ${conditions.fluid.describe()}`);
  allLines.push(`   Events: ${events.length}`);
  for (const e of events) allLines.push(`     Step ${e.step}: ${e.name}`);
  allLines.push('═'.repeat(70));

  const sim = new VugSimulator(conditions, events);
  legendsSim = sim;

  for (let s = 0; s < totalSteps; s++) {
    const log = sim.run_step();
    const show = (s % 5 === 0) || log.some(l => l.includes('EVENT') || l.includes('NUCLEATION') || l.includes('🧱'));
    if (show && log.length) {
      // The line index ABOUT TO BE PUSHED is the header for sim step (s+1).
      // run_step() advances this.step from s to s+1 internally, so the
      // header naturally reads "═══ Step N ═══" where N = s+1.
      lineToStep[allLines.length] = s + 1;
      allLines.push(sim.format_header());
      for (const line of log) allLines.push(line);
    }
  }

  const summaryLines = sim.format_summary();
  allLines.push(...summaryLines);

  displayLines(allLines, lineToStep, sim);

  // Populate Legends Mode inventory panel
  updateLegendsInventory(sim);

  // No topoRender(final) here — displayLines now drives the cavity
  // step-by-step as the narrator scrolls, ending at the live state
  // via the cleanup path inside displayLines.
}

function runRandom() {
  const scenarios = ['cooling', 'pulse', 'mvt', 'porphyry'];
  const pick = scenarios[Math.floor(Math.random() * scenarios.length)];
  document.getElementById('scenario').value = pick;
  const seed = Math.floor(Math.random() * 2147483647);
  document.getElementById('seed').value = seed;
  document.getElementById('steps').value = '';
  document.getElementById('steps').setAttribute('value', '');
  runSimulation();
}

function displayLines(lines, lineToStep?: Record<number, number>, sim?: any) {
  running = true;
  document.getElementById('btn-grow').disabled = true;
  document.getElementById('btn-random').disabled = true;
  const output = document.getElementById('output');
  output.innerHTML = '';

  // Narrative-tempo Phase 1: walk the sim's wall_state_history once
  // to build a step→snapshot index, so addLine() can look up the
  // cavity state for any step in O(1) without re-scanning each tick.
  // History is decimated (v67 _replayStride), so not every step has
  // its own snapshot; the lookup returns the nearest-not-greater snap.
  const snapByStep: Map<number, any> = new Map();
  let stepOrder: number[] = [];
  if (sim && sim.wall_state_history) {
    for (const s of sim.wall_state_history) {
      if (s && s.step != null) {
        snapByStep.set(s.step, s);
        stepOrder.push(s.step);
      }
    }
    stepOrder.sort((a, b) => a - b);
  }
  function snapForStep(target: number): any {
    if (snapByStep.has(target)) return snapByStep.get(target);
    // Decimation gap — find the latest snapshot whose step <= target.
    // stepOrder is short (<100), linear scan from end is faster than
    // bsearch overhead for these sizes.
    for (let k = stepOrder.length - 1; k >= 0; k--) {
      if (stepOrder[k] <= target) return snapByStep.get(stepOrder[k]);
    }
    return null;
  }

  // Render the first snapshot up front so the user sees the initial
  // cavity while the header lines (title / fluid / events list) scroll
  // in, instead of an empty panel. Falls through to live render if
  // history is empty.
  if (sim && stepOrder.length && typeof topoRender === 'function') {
    const firstSnap = snapByStep.get(stepOrder[0]);
    if (typeof _topoReplayActiveSnap !== 'undefined') _topoReplayActiveSnap = firstSnap;
    topoRender(firstSnap);
  }

  let i = 0;
  let inNarrative = false;
  let narrativeEl = null;

  function addLine() {
    if (i >= lines.length) {
      running = false;
      document.getElementById('btn-grow').disabled = false;
      document.getElementById('btn-random').disabled = false;
      // Tempo cleanup: clear the replay-active snap so subsequent
      // renders read live sim state again, then paint the final
      // (live) topo. The user has finished reading; cavity sits on
      // the actual final state, ready for replay or further actions.
      if (typeof _topoReplayActiveSnap !== 'undefined') _topoReplayActiveSnap = null;
      if (typeof topoRender === 'function') topoRender();
      return;
    }

    const line = lines[i];

    // Tempo sync: when the current line is a step header, advance the
    // cavity to that step's snapshot. The header scrolls in alongside
    // the cavity update — reading "═══ Step 30 ═══" and watching the
    // wall expand to its step-30 form happen simultaneously.
    if (lineToStep && lineToStep[i] != null) {
      const snap = snapForStep(lineToStep[i]);
      if (snap) {
        if (typeof _topoReplayActiveSnap !== 'undefined') _topoReplayActiveSnap = snap;
        if (typeof topoRender === 'function') topoRender(snap);
      }
    }

    i++;

    if (line === 'GEOLOGICAL HISTORY') {
      const box = document.createElement('div');
      box.className = 'narrative-box';
      const title = document.createElement('div');
      title.className = 'narrative-title';
      title.textContent = 'GEOLOGICAL HISTORY';
      box.appendChild(title);
      narrativeEl = document.createElement('div');
      box.appendChild(narrativeEl);
      output.appendChild(box);
      inNarrative = true;
      output.scrollTop = output.scrollHeight;
      setTimeout(addLine, 20);
      return;
    }

    if (inNarrative && line.startsWith('═'.repeat(10))) {
      inNarrative = false;
      const span = document.createElement('div');
      span.textContent = line;
      span.className = 'line-header';
      output.appendChild(span);
      output.scrollTop = output.scrollHeight;
      setTimeout(addLine, 20);
      return;
    }

    if (inNarrative && line.startsWith('─'.repeat(10))) {
      setTimeout(addLine, 5);
      return;
    }

    if (inNarrative) {
      const span = document.createElement('div');
      span.textContent = line;
      span.style.marginBottom = line === '' ? '0.5em' : '0';
      narrativeEl.appendChild(span);
      output.scrollTop = output.scrollHeight;
      setTimeout(addLine, 20);
      return;
    }

    const span = document.createElement('div');
    span.textContent = line;

    if (line.includes('🧱')) span.className = 'line-wall';
    else if (line.includes('⚡')) span.className = 'line-event';
    else if (line.includes('✦')) span.className = 'line-nucleation';
    else if (line.includes('═══ Step') || line.startsWith('═')) span.className = 'line-header';
    else if (line.includes('⬇') || line.includes('DISSOLUTION')) span.className = 'line-dissolution';

    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
    setTimeout(addLine, 18);
  }

  addLine();
}

function copyOutput() {
  const output = document.getElementById('output');
  const text = output.innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = document.getElementById('btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

