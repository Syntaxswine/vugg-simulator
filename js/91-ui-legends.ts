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
      allLines.push(sim.format_header());
      for (const line of log) allLines.push(line);
    }
  }

  const summaryLines = sim.format_summary();
  allLines.push(...summaryLines);

  displayLines(allLines);

  // Populate Legends Mode inventory panel
  updateLegendsInventory(sim);

  // Topo map — final wall state after the whole run.
  if (typeof topoRender === 'function') topoRender();
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

function displayLines(lines) {
  running = true;
  document.getElementById('btn-grow').disabled = true;
  document.getElementById('btn-random').disabled = true;
  const output = document.getElementById('output');
  output.innerHTML = '';

  let i = 0;
  let inNarrative = false;
  let narrativeEl = null;

  function addLine() {
    if (i >= lines.length) {
      running = false;
      document.getElementById('btn-grow').disabled = false;
      document.getElementById('btn-random').disabled = false;
      return;
    }

    const line = lines[i];
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

