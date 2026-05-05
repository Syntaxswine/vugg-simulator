// ============================================================
// js/97-ui-fortress.ts — UI — Fortress (Creative) mode
// ============================================================
// Extracted verbatim from the legacy bundle. SCRIPT-mode TS — top-level
// decls stay global so cross-file references resolve at runtime.
//
// Phase B11 of PROPOSAL-MODULAR-REFACTOR.

// ============================================================
// FORTRESS MODE
// ============================================================

// FLUID_PRESETS: starting-fluid recipes shown in the Creative-mode setup
// preset bar AND under "Starter Fluids" in the Scenarios picker. Two
// flavors:
//   * Generic test recipes (silica, carbonate, clean, oxidized_cu) — not
//     anchored to any locality; tuned by feel as broad mineral-class
//     starting points. Edit freely.
//   * Synced-to-scenario recipes (mvt, porphyry, radioactive) — these
//     pull their fluid from the corresponding scenario_* function via
//     getter so they cannot drift. Edit the scenario, the preset
//     follows.
//
// Every preset must declare every FluidChemistry field the scenario
// would set, so the Creative-mode setup sliders see them and can
// over-ride. (Sliders that are blank for a preset's missing field still
// inherit the FluidChemistry constructor default, which is 0 for most
// trace elements — that's the "starter-fluid hidden chemistry" issue
// flagged for the Creative-mode rework backlog.)
function _scenarioFluidParams(scenarioName) {
  const f = SCENARIOS[scenarioName]().conditions.fluid;
  // Spread own enumerable properties of the FluidChemistry instance
  // into a plain object that fortressBegin's Object.assign() can copy.
  return Object.assign({}, f);
}

const FLUID_PRESETS = {
  silica: {
    label: 'Silica-rich',
    desc: 'Test recipe — high silica (600 ppm SiO₂), moderate Ca, low metals. Quartz-dominant growth. Generic; not anchored to a locality.',
    fluid: { SiO2: 600, Ca: 150, CO3: 100, Fe: 8, Mn: 3, Ti: 0.8, Al: 4, F: 10, Zn: 0, S: 0, Cu: 0, O2: 0, pH: 6.5, salinity: 5.0 }
  },
  carbonate: {
    label: 'Carbonate',
    desc: 'Test recipe — Ca-CO₃ rich fluid (Ca 300, CO₃ 250 ppm), moderate Mn. Calcite-dominant. Generic; not anchored to a locality.',
    fluid: { SiO2: 80, Ca: 300, CO3: 250, Fe: 10, Mn: 8, Ti: 0.2, Al: 1, F: 5, Zn: 0, S: 0, Cu: 0, O2: 0, pH: 7.0, salinity: 8.0 }
  },
  mvt: {
    label: 'MVT Brine (synced to scenario_mvt)',
    desc: 'Mirrors scenario_mvt. Edit the scenario in vugg.py / index.html to change this preset.',
    get fluid() { return _scenarioFluidParams('mvt'); }
  },
  clean: {
    label: 'Clean/Dilute',
    desc: 'Test recipe — low-concentration fluid. Slow growth, high-purity crystals. Near-equilibrium conditions. Generic; not anchored to a locality.',
    fluid: { SiO2: 200, Ca: 80, CO3: 60, Fe: 2, Mn: 1, Ti: 0.1, Al: 1, F: 3, Zn: 0, S: 0, Cu: 0, O2: 0, pH: 7.0, salinity: 2.0 }
  },
  porphyry: {
    label: 'Copper Porphyry (synced to scenario_porphyry)',
    desc: 'Mirrors scenario_porphyry. Edit the scenario to change this preset.',
    get fluid() { return _scenarioFluidParams('porphyry'); }
  },
  oxidized_cu: {
    label: 'Oxidized Copper',
    desc: 'Test recipe — Cu-bearing oxidized fluid (Cu 60, Fe 40, O₂ 1.5), CO₃-rich. Malachite + hematite potential. Low temperature favored. Generic; not anchored to a locality.',
    fluid: { SiO2: 100, Ca: 150, CO3: 200, Fe: 40, Mn: 3, Ti: 0.2, Al: 1, F: 5, Zn: 0, S: 5, Cu: 60, O2: 1.5, pH: 6.0, salinity: 5.0 }
  },
  radioactive: {
    label: 'Radioactive Pegmatite (synced to scenario_radioactive_pegmatite)',
    desc: 'Mirrors scenario_radioactive_pegmatite. Edit the scenario to change this preset. ☢️',
    get fluid() { return _scenarioFluidParams('radioactive_pegmatite'); }
  }
};

// =====================================================================
// Creative mode (internal name: "fortress")
// =====================================================================
// User-visible label is "Creative" everywhere (title card, panel heading,
// menu button, post-game source field). The `fortress*` token is a
// pre-rename internal name that's still spread across ~199 sites — CSS
// classes (.fortress-log, .fortress-main, .fortress-setup), DOM IDs
// (#fortress-panel, #fortress-status), function names (fortressBegin,
// fortressStep, fortressFinish), and this global. Token kept stable
// because renaming all 199 occurrences for no UX gain isn't worth the
// churn. If you grep here looking for "fortress" — that's why. The user-
// facing rename happened in commit 467e8c4. See proposals/BACKLOG.md
// "Internal token cleanup" for the deferred thorough rename.
let fortressSim = null;
let fortressActive = false;
let fortressLogLines = [];
let selectedPreset = 'silica';

function selectPreset(preset) {
  selectedPreset = preset;
  document.querySelectorAll('#preset-grid .preset-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.preset === preset);
  });
  document.getElementById('preset-desc').textContent = FLUID_PRESETS[preset].desc;
  // Sync ALL element sliders to preset values
  const f = FLUID_PRESETS[preset].fluid;
  const allElements = [
    'Fe','Mn','Cu','S','U','Pb','Mo','Zn','Mg','Na','K','Ba','Sr','Cr',
    'P','As','Cl','V','W','Ag','Bi','Sb','Ni','Co','B','Li','Be','Te','Se','Ge'
  ];
  const idMap = {
    Fe:'f-fe',Mn:'f-mn',Cu:'f-cu',S:'f-s',U:'f-u',Pb:'f-pb',Mo:'f-mo',
    Zn:'f-zn',Mg:'f-mg',Na:'f-na',K:'f-k',Ba:'f-ba',Sr:'f-sr',Cr:'f-cr',
    P:'f-p',As:'f-as',Cl:'f-cl',V:'f-v',W:'f-w',Ag:'f-ag',Bi:'f-bi',
    Sb:'f-sb',Ni:'f-ni',Co:'f-co',B:'f-b',Li:'f-li',Be:'f-be',
    Te:'f-te',Se:'f-se',Ge:'f-ge'
  };
  for (const el of allElements) {
    const val = f[el] || 0;
    const id = idMap[el];
    const slider = document.getElementById(id);
    if (slider) {
      slider.value = val;
      document.getElementById(id + '-val').textContent = val + ' ppm';
    }
  }
  document.getElementById('f-ph').value = Math.round(f.pH * 10);
  document.getElementById('f-ph-val').textContent = f.pH.toFixed(1);
}

function fortressBegin() {
  const temp = parseFloat(document.getElementById('f-temp').value);
  const pressure = parseFloat(document.getElementById('f-pressure').value) / 10;
  const presetData = FLUID_PRESETS[selectedPreset];
  const fluidParams = Object.assign({}, presetData.fluid);
  // Override with slider values
  // Read all setup sliders — hooked and unhooked alike
  const setupSliders = {
    Fe:'f-fe', Mn:'f-mn', Cu:'f-cu', S:'f-s', U:'f-u', Pb:'f-pb', Mo:'f-mo',
    Zn:'f-zn', Mg:'f-mg', Na:'f-na', K:'f-k', Ba:'f-ba', Sr:'f-sr', Cr:'f-cr',
    P:'f-p', As:'f-as', Cl:'f-cl', V:'f-v', W:'f-w', Ag:'f-ag', Bi:'f-bi',
    Sb:'f-sb', Ni:'f-ni', Co:'f-co', B:'f-b', Li:'f-li', Be:'f-be',
    Te:'f-te', Se:'f-se', Ge:'f-ge'
  };
  for (const [prop, id] of Object.entries(setupSliders)) {
    const el = document.getElementById(id);
    if (el) fluidParams[prop] = parseFloat(el.value);
  }
  fluidParams.pH = parseFloat(document.getElementById('f-ph').value) / 10;
  const fluid = new FluidChemistry(fluidParams);

  // Initialize wall based on preset
  let wallOpts = { composition: 'limestone', thickness_mm: 500, vug_diameter_mm: 50, wall_Fe_ppm: 2000, wall_Mn_ppm: 500, wall_Mg_ppm: 1000 };
  if (selectedPreset === 'mvt') {
    wallOpts = { composition: 'limestone', thickness_mm: 500, vug_diameter_mm: 40, wall_Fe_ppm: 3000, wall_Mn_ppm: 800, wall_Mg_ppm: 1000 };
  } else if (selectedPreset === 'carbonate') {
    wallOpts = { composition: 'limestone', thickness_mm: 500, vug_diameter_mm: 30, wall_Fe_ppm: 1500, wall_Mn_ppm: 600, wall_Mg_ppm: 800 };
  }
  // Read the wall-reactivity slider (Creative-mode only). Range 0-20
  // in slider units → 0.0-2.0× multiplier on dissolution rate.
  // See VugWall.dissolve and VugWall constructor for the full table.
  const wallReactivityEl = document.getElementById('f-wall-reactivity');
  if (wallReactivityEl) {
    wallOpts.reactivity = parseFloat(wallReactivityEl.value) / 10;
  }
  const wall = new VugWall(wallOpts);
  const conditions = new VugConditions({ temperature: temp, pressure, fluid, wall });

  rng = new SeededRandom(Date.now());
  fortressSim = new VugSimulator(conditions, []);
  fortressActive = true;
  fortressLogLines = [];

  // Show active panels, hide setup
  document.getElementById('fortress-setup').style.display = 'none';
  document.getElementById('fortress-status').style.display = 'block';
  document.getElementById('fortress-actions').style.display = 'block';
  const main = document.getElementById('fortress-main');
  main.style.display = 'flex';

  // Initial log
  const logEl = document.getElementById('fortress-log');
  logEl.innerHTML = '';
  const initLines = [
    `🏰 Creative Mode — Your Vug Awaits`,
    `   Temperature: ${temp.toFixed(0)}°C | Pressure: ${pressure.toFixed(1)} kbar`,
    `   Fluid: ${presetData.label} — ${fluid.describe()}`,
    `═`.repeat(60),
    ``,
    `Choose an action to advance one step at a time.`,
  ];
  initLines.forEach(line => {
    fortressLogLines.push(line);
    appendFortressLine(logEl, line);
  });

  updateFortressStatus();
  updateFortressInventory();
  syncBrothSliders();
}

function fortressStep(action) {
  if (!fortressSim || !fortressActive) return;

  const c = fortressSim.conditions;
  let actionDesc = '';

  // Apply action modifications BEFORE running the step
  // Apply current broth slider values to sim state before processing
  // (sliders are live-bound, so this is already done via oninput,
  //  but ensure any manual slider changes are captured)
  if (fortressSim) {
    for (const [key, m] of Object.entries(BROTH_MAP)) {
      const slider = document.getElementById('broth-' + key);
      if (slider) m.set(m.parse(slider.value));
    }
  }

  switch (action) {
    case 'wait':
      actionDesc = '⏳ Waiting — ambient cooling';
      break;
    case 'heat':
      c.temperature += 25;
      c.temperature = Math.min(c.temperature, 600);
      actionDesc = '🔥 Heat +25°C → ' + c.temperature.toFixed(0) + '°C';
      break;
    case 'cool':
      c.temperature -= 25;
      c.temperature = Math.max(c.temperature, 25);
      actionDesc = '❄️ Cool −25°C → ' + c.temperature.toFixed(0) + '°C';
      break;
    case 'silica':
      c.fluid.SiO2 += 400;
      c.fluid.Al += 2;
      c.fluid.Ti += 0.3;
      actionDesc = '🔮 Silica injected — SiO₂ +400 ppm (now ' + c.fluid.SiO2.toFixed(0) + ')';
      break;
    case 'metals':
      c.fluid.Fe += 40;
      c.fluid.Mn += 15;
      actionDesc = '⚙️ Metals injected — Fe +40, Mn +15 ppm';
      break;
    case 'brine':
      c.fluid.Zn += 150;
      c.fluid.S += 120;
      c.temperature -= 10;
      actionDesc = '⚗️ Brine mixed — Zn +150, S +120 ppm, T −10°C (mixing)';
      break;
    case 'fluorine':
      c.fluid.F += 25;
      c.fluid.Ca += 80;
      actionDesc = '💎 Fluorine added — F +25, Ca +80 ppm';
      break;
    case 'copper':
      c.fluid.Cu = 120.0;
      c.fluid.Fe += 40;
      c.fluid.S += 80;
      c.fluid.SiO2 += 200;
      c.fluid.O2 = 0.3;
      c.temperature += 30;
      c.temperature = Math.min(c.temperature, 600);
      c.flow_rate = 4.0;
      actionDesc = `🟠 Copper injection — Cu ${c.fluid.Cu.toFixed(0)} ppm, Fe +40, S +80, reducing. T → ${c.temperature.toFixed(0)}°C`;
      break;
    case 'oxidize':
      c.fluid.O2 = 1.8;
      c.fluid.S *= 0.3;
      c.temperature -= 40;
      c.temperature = Math.max(c.temperature, 25);
      actionDesc = `🟡 Oxidation — O₂ → ${c.fluid.O2.toFixed(1)}, sulfur depleted. T → ${c.temperature.toFixed(0)}°C. Sulfides unstable!`;
      break;
    case 'tectonic':
      c.pressure += 0.5;
      c.temperature += 15;
      // Force twinning check on existing crystals
      for (const crystal of fortressSim.crystals) {
        if (!crystal.twinned && crystal.zones.length > 2 && rng.random() < 0.15) {
          crystal.twinned = true;
          if (crystal.mineral === 'quartz') crystal.twin_law = 'Dauphiné';
          else if (crystal.mineral === 'calcite') crystal.twin_law = 'c-twin {001}';
          else if (crystal.mineral === 'sphalerite') crystal.twin_law = 'spinel-law {111}';
          else if (crystal.mineral === 'fluorite') crystal.twin_law = 'penetration twin {111}';
          else if (crystal.mineral === 'pyrite') crystal.twin_law = 'iron cross {110}';
          else if (crystal.mineral === 'chalcopyrite') crystal.twin_law = 'penetration twin {112}';
          else if (crystal.mineral === 'hematite') crystal.twin_law = 'penetration twin {001}';
          // malachite doesn't twin visibly
        }
      }
      actionDesc = '🌋 Tectonic shock — P +0.5 kbar, T +15°C. Crystals stressed!';
      break;
    case 'flood':
      c.flow_rate = 5.0;
      c.fluid.SiO2 *= 0.6;
      c.fluid.Ca *= 1.3;
      c.fluid.CO3 *= 1.2;
      c.fluid.pH += 0.3;
      actionDesc = '🌊 Flood — fresh fluid pulse, silica diluted, carbonates refreshed';
      break;
    case 'acidify':
      actionDesc = '🧪 ' + event_acidify(c);
      break;
    case 'alkalinize':
      actionDesc = '⚗️ ' + event_alkalinize(c);
      break;
  }

  const logEl = document.getElementById('fortress-log');
  const lines = [];

  if (action === 'wait') {
    // ONLY Wait advances time — all other buttons just modify conditions
    const log = fortressSim.run_step();
    lines.push('');
    lines.push(`── ⏳ Step ${fortressSim.step}`);
    lines.push(fortressSim.format_header());
    if (log.length) {
      for (const l of log) lines.push(l);
    } else {
      lines.push('  (no growth or events this step)');
    }
    updateFortressInventory();
  } else {
    // Non-wait actions: modify conditions but DON'T advance time
    // Log what changed so the player can stack multiple changes
    lines.push(`  ⚙️ ${actionDesc}`);
  }

  lines.forEach(line => {
    fortressLogLines.push(line);
    appendFortressLine(logEl, line);
  });

  logEl.scrollTop = logEl.scrollHeight;
  updateFortressStatus();
  syncBrothSliders();
  if (typeof topoRender === 'function') topoRender();
  // Drive the tutorial state machine after each action. Reads
  // fortressSim.step internally — no-op when no tutorial is active.
  if (typeof _maybeAdvanceTutorial === 'function') _maybeAdvanceTutorial();
}

function appendFortressLine(container, line) {
  const span = document.createElement('div');
  span.textContent = line;
  if (line.includes('🧱')) span.className = 'line-wall';
  else if (line.includes('⚡')) span.className = 'line-event';
  else if (line.includes('✦')) span.className = 'line-nucleation';
  else if (line.includes('═══ Step') || (line.startsWith('═') && line.length > 5)) span.className = 'line-header';
  else if (line.includes('⬇') || line.includes('DISSOLUTION')) span.className = 'line-dissolution';
  container.appendChild(span);
}

function updateFortressStatus() {
  if (!fortressSim) return;
  const c = fortressSim.conditions;

  document.getElementById('f-step-num').textContent = fortressSim.step;
  document.getElementById('f-stat-temp').textContent = c.temperature.toFixed(1) + '°C';
  document.getElementById('f-stat-press').textContent = c.pressure.toFixed(2) + ' kbar';
  document.getElementById('f-stat-ph').textContent = c.fluid.pH.toFixed(1);
  document.getElementById('f-stat-flow').textContent = c.flow_rate.toFixed(1);

  // Show vug diameter when dissolution has occurred
  const vugContainer = document.getElementById('f-stat-vug-container');
  if (c.wall.total_dissolved_mm > 0) {
    vugContainer.style.display = '';
    document.getElementById('f-stat-vug').textContent = `${c.wall.vug_diameter_mm.toFixed(0)}mm (+${c.wall.total_dissolved_mm.toFixed(1)})`;
  } else {
    vugContainer.style.display = 'none';
  }

  // Show radiation dose when uraninite present
  const radContainer = document.getElementById('f-stat-radiation-container');
  if (fortressSim.radiation_dose > 0) {
    radContainer.style.display = '';
    document.getElementById('f-stat-radiation').textContent = `☢️ ${fortressSim.radiation_dose.toFixed(2)}`;
  } else {
    radContainer.style.display = 'none';
  }

  // What each mineral needs to thrive
  function mineralNeeds(name, c) {
    const T = c.temperature, f = c.fluid;
    const clean = n => n.replace(/^[^\w]*/, ''); // strip emoji
    switch (clean(name).toLowerCase()) {
      case 'quartz':
        if (f.SiO2 < 200) return 'more SiO₂';
        if (T > 573) return 'lower temperature (<573°C)';
        return 'higher SiO₂ concentration';
      case 'calcite':
        if (f.Ca < 50) return 'more Ca';
        if (f.CO3 < 30) return 'more CO₃';
        if (f.pH < 5.5) return 'higher pH (less acidic)';
        return 'more Ca + CO₃';
      case 'fluorite':
        if (f.Ca < 30) return 'more Ca';
        if (f.F < 5) return 'more F (fluorine)';
        return 'more Ca + F';
      case 'sphalerite':
        if (f.Zn < 20) return 'more Zn';
        if (f.S < 10) return 'more S (sulfur)';
        return 'more Zn + S';
      case 'pyrite':
        if (f.Fe < 5) return 'more Fe';
        if (f.S < 10) return 'more S (sulfur)';
        return 'more Fe + S';
      case 'chalcopyrite':
        if (f.Cu < 5) return 'more Cu';
        if (f.Fe < 5) return 'more Fe';
        if (f.S < 10) return 'more S (sulfur)';
        return 'more Cu + Fe + S';
      case 'hematite':
        if (f.Fe < 10) return 'more Fe';
        if (f.O2 < 0.3) return 'more O₂ (oxidizing conditions)';
        return 'more Fe + O₂';
      case 'malachite':
        if (f.Cu < 10) return 'more Cu';
        if (f.CO3 < 20) return 'more CO₃';
        if (f.O2 < 0.2) return 'more O₂ (oxidizing conditions)';
        return 'Cu + CO₃ + O₂';
      case 'uraninite':
        if (f.U < 20) return 'more U (uranium)';
        if (T < 200) return 'higher temperature';
        return 'more U';
      case 'galena':
        if (f.Pb < 10) return 'more Pb (lead)';
        if (f.S < 10) return 'more S (sulfur)';
        return 'more Pb + S';
      case 'smithsonite':
        if (f.Zn < 10) return 'more Zn';
        if (f.CO3 < 20) return 'more CO₃';
        if (f.O2 < 0.2) return 'O₂ (oxidized Zn environment)';
        return 'Zn + CO₃ + O₂';
      case 'wulfenite':
        if (f.Pb < 10) return 'more Pb (lead)';
        if (f.Mo < 5) return 'more Mo (molybdenum)';
        if (f.O2 < 0.2) return 'more O₂ (oxidizing conditions)';
        if (T > 250) return 'lower temperature (<250°C)';
        return 'Pb + Mo + O₂';
      case 'selenite':
        if (f.Ca < 20) return 'more Ca';
        if (f.S < 10) return 'more S (sulfate)';
        if (f.O2 < 0.3) return 'more O₂ (to convert S²⁻ to SO₄²⁻)';
        if (T > 80) return 'lower temperature (<80°C)';
        return 'Ca + SO₄ + low temperature';
      case 'feldspar':
        if (f.K < 15 && f.Na < 15) return 'more K or Na (alkalis)';
        if (f.Al < 5) return 'more Al (aluminum)';
        if (f.SiO2 < 100) return 'more SiO₂';
        if (T < 150) return 'higher temperature (>150°C)';
        if (T > 800) return 'lower temperature (<800°C)';
        return 'K/Na + Al + SiO₂';
      default:
        return 'different conditions';
    }
  }

  // Supersaturation indicators — auto-derived from MINERAL_SPEC and
  // grouped by mineral class. Every mineral with a
  // `supersaturation_<name>` method on conditions appears under its
  // class's collapsible <details>; classes whose max σ ≥ 1 open
  // automatically so the player sees active supersaturation without
  // clicking. Supersedes the hand-coded 28-mineral list (May 2026):
  // adding a new mineral now auto-populates the panel.
  _renderFortressSigmaGroups(c, document.getElementById('f-sat-bar'));
}

// Display-name overrides preserve the emoji decorations the legacy
// hardcoded list used. Anything not in the map gets `name[0].upper()
// + rest`.
const _SAT_DISPLAY_NAMES = {
  uraninite: '☢️ Uraninite',
  wulfenite: '🟠 Wulfenite',
  selenite: '💎 Selenite',
  feldspar: '🏔️ Feldspar',
  adamite: '💚 Adamite',
  mimetite: '🟡 Mimetite',
};

// Cap the "max σ" badge so the meta line doesn't read as
// "σ max 12345.67". Big σ values are real (Mo can hit double digits
// in Bingham porphyry brines) but past 99 the user just needs to
// know "very super-saturated".
const _SAT_DISPLAY_MAX = 99.99;

// Filter state — both default on. Filters drop pills below the
// nucleation threshold (σ < 1) or above it (σ ≥ 1) from the panel.
// A class group with no surviving pills hides entirely so the panel
// doesn't waste a row on an empty section.
let _satShowNucleating = true;
let _satShowDormant = true;

function _onSatFilterToggle() {
  const a = document.getElementById('sat-filter-nucleating');
  const b = document.getElementById('sat-filter-dormant');
  _satShowNucleating = a ? a.checked : true;
  _satShowDormant = b ? b.checked : true;
  if (typeof fortressSim !== 'undefined' && fortressSim) {
    _renderFortressSigmaGroups(fortressSim.conditions, document.getElementById('f-sat-bar'));
  }
}

function _renderFortressSigmaGroups(c, host) {
  if (!host) return;
  host.innerHTML = '';
  if (typeof MINERAL_SPEC === 'undefined') return;
  // Walk every mineral in the spec; keep those that have a
  // `supersaturation_<name>` method on the conditions object.
  const byClass = {};
  for (const [name, spec] of Object.entries(MINERAL_SPEC)) {
    const fn = c[`supersaturation_${name}`];
    if (typeof fn !== 'function') continue;
    let sigma;
    try { sigma = fn.call(c); } catch (e) { continue; }
    if (typeof sigma !== 'number' || !isFinite(sigma)) continue;
    const cls = spec.class || 'uncategorized';
    const displayName = _SAT_DISPLAY_NAMES[name]
      || (name.charAt(0).toUpperCase() + name.slice(1));
    if (!byClass[cls]) {
      byClass[cls] = {
        entries: [],
        maxSigma: -Infinity,
        color: spec.class_color || '#888',
      };
    }
    byClass[cls].entries.push({ name, displayName, sigma });
    if (sigma > byClass[cls].maxSigma) byClass[cls].maxSigma = sigma;
  }
  // Order: active classes (any σ ≥ 1) first, sorted by max σ
  // descending; then dormant classes by TOPO_CLASS_ORDER, then
  // alphabetically.
  const orderedClasses = Object.keys(byClass).sort((a, b) => {
    const aActive = byClass[a].maxSigma >= 1;
    const bActive = byClass[b].maxSigma >= 1;
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (aActive) return byClass[b].maxSigma - byClass[a].maxSigma;
    const order = (typeof TOPO_CLASS_ORDER !== 'undefined') ? TOPO_CLASS_ORDER : [];
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
  for (const cls of orderedClasses) {
    const group = byClass[cls];
    // Apply filter: drop entries the user is currently hiding.
    const filtered = group.entries.filter(e => {
      const isSuper = e.sigma >= 1.0;
      return isSuper ? _satShowNucleating : _satShowDormant;
    });
    if (!filtered.length) continue;  // class hides entirely if all pills filtered out
    // Sort entries within group by σ descending so the "interesting
    // ones" are visually first.
    filtered.sort((a, b) => b.sigma - a.sigma);
    const isActive = group.maxSigma >= 1;
    const maxLabel = Math.min(group.maxSigma, _SAT_DISPLAY_MAX);
    const meta = isActive
      ? `${filtered.length} · σ max ${maxLabel.toFixed(2)}`
      : `${filtered.length}`;
    const summary = `<summary class="sat-class-summary" data-hl-class="${cls}">`
      + `<span class="sat-class-swatch" style="background:${group.color}"></span>`
      + `<span class="sat-class-name">${cls}</span>`
      + `<span class="sat-class-meta${isActive ? ' is-active' : ''}">${meta}</span>`
      + `</summary>`;
    const pills = filtered.map(e => {
      const isSuper = e.sigma >= 1.0;
      const klass = 'sat-indicator ' + (isSuper ? 'sat-super' : 'sat-under');
      const title = isSuper ? 'Supersaturated — will grow' : `Undersaturated (σ=${e.sigma.toFixed(2)})`;
      // data-hl-mineral lets the panel double as the legend: hover
      // a pill → highlight that mineral on the topo (replaces the
      // legacy classes-tab hover behavior, which only highlighted
      // by class).
      return `<span class="${klass}" data-hl-mineral="${e.name}" title="${title}">${e.displayName} σ=${e.sigma.toFixed(2)}</span>`;
    }).join('');
    // All groups open by default. Filters do the visual reduction
    // now; collapsing groups was the pre-filter solution.
    const groupClass = `sat-class-group${isActive ? ' sat-class-active' : ''}`;
    host.insertAdjacentHTML('beforeend',
      `<details class="${groupClass}" open>${summary}<div class="sat-class-pills">${pills}</div></details>`);
  }
  // One-time wire-up of hover/click delegation on the panel.
  _wireFortressSigmaEvents(host);
}

// Idempotent — wires hover/click on the sigma panel host once. Re-
// rendering replaces innerHTML but keeps the listeners on the
// container. Hover/click on a `.sat-indicator[data-hl-mineral]` or
// `.sat-class-summary[data-hl-class]` drives the topo highlight
// system the same way the legacy classes-tab legend did. Replaces
// `_wireTopoLegendEvents` for the user-facing functionality.
let _satEventsWired = false;
function _wireFortressSigmaEvents(host) {
  if (!host || _satEventsWired) return;
  _satEventsWired = true;
  function targetFromEvent(ev) {
    const pill = ev.target.closest('.sat-indicator[data-hl-mineral]');
    if (pill) return { type: 'mineral', value: pill.dataset.hlMineral };
    const summary = ev.target.closest('.sat-class-summary[data-hl-class]');
    if (summary) return { type: 'class', value: summary.dataset.hlClass };
    return null;
  }
  host.addEventListener('mouseover', (ev) => {
    topoSetLegendHoverTarget(targetFromEvent(ev));
  });
  host.addEventListener('mouseleave', () => {
    topoSetLegendHoverTarget(null);
  });
  host.addEventListener('click', (ev) => {
    const target = targetFromEvent(ev);
    // The `<details>` element handles open/close itself on a click
    // anywhere in <summary>. We add legend-toggle on top, but only
    // for clicks on the summary's interactive children — clicking
    // the disclosure caret area still toggles open/close cleanly.
    if (target) {
      topoToggleLockTarget(target);
      // Don't preventDefault on summary clicks — let <details> do its
      // open/close thing. We still want the lock behavior to apply.
    }
  });
}

// Zone-viz Phase 1c: bar-graph thumbnail for Crystal Inventory specimen
// cards. Falls back to the generic mineral photo/placeholder thumb only
// when the crystal has zero zones recorded (e.g. legacy serialized
// records from before zone data was persisted). A single zone is still
// real history — the moment of nucleation — and renderZoneBarCanvas
// handles it correctly (single dim stripe, per its all-equal-values
// branch). Pre-2026-04-30 this gated on >= 2, which left sub-resolution
// crystals (1 zone, 0.0 mm) showing the generic 💎 placeholder while
// every other species in the inventory had a real bar-graph thumb —
// surfaced as a topaz #6 visual bug in seed-42 ouro_preto.
//
// Implementation note: renderCrystalRow builds its content as an HTML
// string and commits it via el.innerHTML. A live canvas can't be painted
// via innerHTML — it needs a post-insert JS paint. So we render off-
// screen via renderZoneBarCanvas + toDataURL and embed as an <img>.
// The underlying canvas width may exceed the thumbnail display box (e.g.
// 150 zones × 1px-zone = 150px canvas); the <img> CSS stretches/squashes
// it to the display size, which is the right trade-off — the color
// pattern is the message, not pixel-precise zone boundaries.
function crystalThumbHTML(crystal, size) {
  size = size || 56;
  const cColor = crystalColor(crystal);
  // Twin is crystal-level metadata, not zone-level data — by design
  // (Phase 1b boss call). Render as a small ⟁ badge overlaid on the
  // thumbnail corner so twin status reads at a glance in every surface
  // the thumbnail appears (inventory cards + Library collected rows)
  // without polluting the bar graph itself.
  const twinBadge = crystal && crystal.twinned
    ? `<div style="position:absolute;top:1px;right:1px;background:#3a2044;color:#bb66ee;font-size:${Math.max(9, size*0.22)}px;line-height:1;padding:1px 3px;border-radius:2px;pointer-events:none;font-weight:bold" title="Twinned: ${crystal.twin_law || 'yes'}">⟁</div>`
    : '';
  if (crystal && crystal.zones && crystal.zones.length >= 1) {
    const thumbCanvas = document.createElement('canvas');
    renderZoneBarCanvas(thumbCanvas, crystal.zones, {
      height: size,
      maxWidth: size,
      minZoneWidth: 1,
      maxZoneWidth: 4,
      showLaneLabels: false,
      showFIGlyphs: true,
    });
    const dataUrl = thumbCanvas.toDataURL();
    return `<div style="width:${size}px;height:${size}px;border-radius:4px;overflow:hidden;flex-shrink:0;border:1px solid ${cColor}44;background:#070706;position:relative" title="${crystal.mineral} · ${crystal.zones.length} zones">
      <img src="${dataUrl}" style="width:100%;height:100%;display:block;image-rendering:pixelated" alt="${crystal.mineral} growth history">
      ${twinBadge}
    </div>`;
  }
  // Photo/placeholder fallback — also overlay the twin badge. Wrap the
  // returned HTML in a positioned container so the absolute-positioned
  // badge anchors correctly.
  const base = mineralThumbHTML(crystal.mineral, size, crystal);
  if (!twinBadge) return base;
  return `<div style="position:relative;display:inline-block">${base}${twinBadge}</div>`;
}

// Shared renderer — builds the crystal row HTML + wires click-for-zones
// + per-crystal Collect button. `onCollect` takes (index, event) so
// the caller can route to the right mode's collect helper.
function renderCrystalRow(crystal, idx, onCollect) {
  const el = document.createElement('div');
  el.className = 'inv-crystal';
  el.onclick = () => showZoneHistory(crystal);

  const displayName = crystalDisplayName(crystal);
  const cColor = crystalColor(crystal);

  let html = `<div style="display:flex;gap:0.6rem;align-items:flex-start">`;
  html += crystalThumbHTML(crystal, 56);
  html += `<div style="flex:1;min-width:0">`;
  html += `<div class="inv-mineral" style="color:${cColor}">${displayName} #${crystal.crystal_id}</div>`;
  html += `<div class="inv-size">${crystal.c_length_mm.toFixed(1)} × ${crystal.a_width_mm.toFixed(1)} mm</div>`;
  html += `<div class="inv-habit">${crystal.habit}`;
  if (crystal.dominant_forms.length) html += ` [${crystal.dominant_forms[0]}]`;
  html += `</div>`;
  if (crystal.twinned) html += `<div class="inv-twin">⟁ ${crystal.twin_law}</div>`;
  if (crystal.radiation_damage > 0) html += `<div style="color:#50ff50;font-size:0.65rem">☢️ radiation damage: ${crystal.radiation_damage.toFixed(2)}</div>`;
  html += `<div style="color:#5a4a30;font-size:0.65rem;margin-top:0.2rem">${crystal.zones.length} zones · tap for history</div>`;
  html += `</div></div>`;

  // Collect button — disabled if already collected this session, or if nothing grew.
  const already = !!crystal._collectedRecordId;
  const canCollect = (crystal.total_growth_um || 0) > 0.1 || (crystal.zones || []).length > 0;
  const btnLabel = already ? '✓ Collected' : '💎 Collect';
  const btnAttrs = already || !canCollect ? 'disabled' : '';
  const btnTitle = already
    ? 'Already in your collection'
    : (canCollect ? 'Add to your collection' : 'No growth yet');
  html += `<div class="inv-collect-row"><button class="inv-collect-btn" ${btnAttrs} title="${btnTitle}" onclick="${onCollect}(${idx}, event)">${btnLabel}</button></div>`;
  // The Collect button is in .inv-collect-row — we need to swap in handler
  el.innerHTML = html;
  return el;
}

function updateLegendsInventory(sim) {
  const col = document.getElementById('legends-inventory-col');
  const panel = document.getElementById('legends-inventory');
  if (!col || !panel || !sim) return;

  panel.innerHTML = '<h4>💎 Crystal Inventory</h4>';

  if (!sim.crystals.length) {
    const empty = document.createElement('div');
    empty.className = 'inv-empty';
    empty.textContent = 'No crystals grew in this simulation.';
    panel.appendChild(empty);
    col.style.display = 'none';
    return;
  }

  col.style.display = '';
  sim.crystals.forEach((crystal, idx) => {
    panel.appendChild(renderCrystalRow(crystal, idx, 'collectFromLegends'));
  });
}

function updateFortressInventory() {
  if (!fortressSim) return;
  const panel = document.getElementById('fortress-inventory');
  panel.innerHTML = '<h4>💎 Crystal Inventory</h4>';

  if (!fortressSim.crystals.length) {
    const empty = document.createElement('div');
    empty.className = 'inv-empty';
    empty.textContent = 'No crystals yet. Conditions may need to reach supersaturation first.';
    panel.appendChild(empty);
    return;
  }

  fortressSim.crystals.forEach((crystal, idx) => {
    panel.appendChild(renderCrystalRow(crystal, idx, 'collectFromFortress'));
  });
}

function renderRandomInventory() {
  const panel = document.getElementById('random-inventory');
  if (!panel) return;
  panel.innerHTML = '';
  if (!randomSim || !randomSim.crystals.length) return;

  const header = document.createElement('h4');
  header.textContent = '💎 Crystal Inventory';
  header.style.cssText = 'color:#f0c050;margin:0.8rem 0 0.5rem 0;letter-spacing:0.08em';
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'random-inventory-grid';
  randomSim.crystals.forEach((crystal, idx) => {
    if ((crystal.total_growth_um || 0) <= 0) return;
    grid.appendChild(renderCrystalRow(crystal, idx, 'collectFromRandom'));
  });
  panel.appendChild(grid);
}

function showZoneHistory(crystal) {
  const overlay = document.getElementById('zone-overlay');
  const title = document.getElementById('zone-modal-title');
  const body = document.getElementById('zone-modal-body');

  const cColor = crystalColor(crystal);
  title.textContent = `${capitalize(crystalDisplayName(crystal))} #${crystal.crystal_id} — Zone History`;
  title.style.color = cColor;
  body.innerHTML = '';

  // Crystal summary
  const summary = document.createElement('div');
  summary.style.cssText = 'margin-bottom:0.8rem;font-size:0.8rem;color:#c0a848;line-height:1.5';
  summary.innerHTML = `
    <div>Nucleated: step ${crystal.nucleation_step} at ${crystal.nucleation_temp.toFixed(0)}°C</div>
    <div>Morphology: ${crystal.describe_morphology()}</div>
    <div>Total growth: ${crystal.total_growth_um.toFixed(0)} µm (${crystal.c_length_mm.toFixed(1)} mm)</div>
    ${crystal.twinned ? `<div style="color:#bb66ee">Twinned: ${crystal.twin_law}</div>` : ''}
    ${crystal.dissolved ? `<div style="color:#cc4444">Partially dissolved</div>` : ''}
    <div>Fluorescence: ${crystal.predict_fluorescence()}</div>
    ${MINERAL_ASCII[crystal.mineral] ? `<pre style="margin:0.8rem 0;font-size:0.45rem;line-height:1.1;color:${cColor};overflow-x:auto;text-align:center">${MINERAL_ASCII[crystal.mineral]}</pre>` : (MINERAL_THUMBS[crystal.mineral] ? `<div style="margin:0.8rem 0;text-align:center">${mineralThumbHTML(crystal.mineral, 160, crystal)}</div>` : '')}
    <div style="margin-top:0.5rem"><button onclick="grooveFromModal()" style="background:#2a2510;border:1px solid #5a4a20;color:#d4a843;padding:0.3rem 0.8rem;font-size:0.75rem;border-radius:3px;cursor:pointer">📀 Play Record</button></div>
  `;
  grooveModalCrystal = crystal;
  body.appendChild(summary);

  if (!crystal.zones.length) {
    const noZones = document.createElement('div');
    noZones.className = 'inv-empty';
    noZones.textContent = 'No growth zones recorded yet.';
    body.appendChild(noZones);
  } else {
    // ── Zone-viz Phase 1: bar graph replaces the zone-by-zone text list.
    //    Time reads left (nucleation, zone 1) → right (rim, zone N).
    //    Six stacked lanes (Temperature, Growth rate, Fe/Mn/Al/Ti) via
    //    the shared GROOVE_AXES palette — same color language as the
    //    Record Player. Text list moves into a collapsible below for
    //    precise-value lookup.
    // Phase 2a: shape-aware rendering ABOVE the bar graph. For habit
    // vectors with a shape renderer (currently: equant), we paint the
    // crystal-shape nested-zone view first — the poetic "this is what
    // the crystal looks like inside" view. The bar graph below stays as
    // the data-precise companion. For vectors without a shape renderer
    // yet, the dispatcher falls back to the bar graph silently, so the
    // modal just shows one bar (current Phase 1 behavior).
    const hasShapeRender = getCrystalVector(crystal) === 'equant';
    if (hasShapeRender) {
      const shapeHeader = document.createElement('div');
      shapeHeader.style.cssText = 'color:#8a7a40;font-size:0.7rem;border-bottom:1px solid #2a2518;padding-bottom:0.3rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:baseline';
      shapeHeader.innerHTML = `
        <span>The specimen</span>
        <span style="font-size:0.65rem;color:#5a4a30">nucleation → rim outward</span>
      `;
      body.appendChild(shapeHeader);

      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.style.cssText = 'display:block;margin:0 auto 0.8rem auto;max-width:100%;height:auto;background:#070706;border:1px solid #1a1a14;border-radius:3px';
      body.appendChild(shapeCanvas);
      renderZoneShapeCanvas(shapeCanvas, crystal, { size: 240 });
    }

    // Chemistry bar — the "story" view. Each segment is one chromophore
    // regime (dominant trace + the color color_rules produces for it).
    // Watermelon-tourmaline reads at a glance: wide green segment + thin
    // pink segment.
    const chemHeader = document.createElement('div');
    chemHeader.style.cssText = 'color:#8a7a40;font-size:0.7rem;border-bottom:1px solid #2a2518;padding-bottom:0.3rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:baseline';
    chemHeader.innerHTML = `
      <span>By chromophore — visible color</span>
      <span style="font-size:0.65rem;color:#5a4a30">nucleation ← → rim</span>
    `;
    body.appendChild(chemHeader);
    const chemCanvas = document.createElement('canvas');
    chemCanvas.style.cssText = 'display:block;width:100%;max-width:600px;height:auto;background:#070706;border:1px solid #1a1a14;border-radius:3px;margin-bottom:0.8rem';
    body.appendChild(chemCanvas);
    const chemSegs = renderChemistryBar(chemCanvas, crystal, { width: 600, height: 36 });

    // Hover tooltip for chem-bar segments — reuses the Record Player's
    // #groove-tooltip element. Hover shows the chromophore regime + how
    // many zones it spans + cumulative thickness.
    const chemSegW = (canvas) => canvas.width;
    chemCanvas.onmousemove = function(e) {
      const tooltip = document.getElementById('groove-tooltip');
      if (!tooltip) return;
      const rect = chemCanvas.getBoundingClientRect();
      const scaleX = chemCanvas.width / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const hit = chemSegs.find(s => mx >= s.x && mx < s.x + s.w);
      if (!hit) { tooltip.style.display = 'none'; return; }
      const seg = hit.seg;
      const firstZ = seg.zones[0];
      const lastZ = seg.zones[seg.zones.length - 1];
      let html = `<b>${seg.isDissolution ? 'Dissolution event' : 'Chromophore regime'}</b><br>`;
      html += `${seg.zones.length} zone${seg.zones.length > 1 ? 's' : ''} · `;
      html += `step ${firstZ.step}–${lastZ.step}<br>`;
      html += `<span style="display:inline-block;width:10px;height:10px;background:${seg.color};border:1px solid #555;vertical-align:middle"></span> `;
      html += `${seg.color}<br>`;
      html += `±${seg.totalThickness.toFixed(1)} µm cumulative`;
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    };
    chemCanvas.onmouseleave = function() {
      const tooltip = document.getElementById('groove-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    };

    // UV bar — the "ghost under the lamp" view. Same stratigraphic
    // primitive as the chem bar but each segment represents a
    // fluorescence regime instead of a visible-color regime.
    const uvHeader = document.createElement('div');
    uvHeader.style.cssText = 'color:#8a7a40;font-size:0.7rem;border-bottom:1px solid #2a2518;padding-bottom:0.3rem;margin-bottom:0.4rem;display:flex;justify-content:space-between;align-items:baseline';
    uvHeader.innerHTML = `
      <span>Under UV — fluorescence response</span>
      <span style="font-size:0.65rem;color:#5a4a30">${uvSummary(crystal.mineral)}</span>
    `;
    body.appendChild(uvHeader);
    const uvCanvas = document.createElement('canvas');
    uvCanvas.style.cssText = 'display:block;width:100%;max-width:600px;height:auto;background:#181822;border:1px solid #1a1a14;border-radius:3px;margin-bottom:0.8rem';
    body.appendChild(uvCanvas);
    const uvSegs = renderUVBar(uvCanvas, crystal, { width: 600, height: 36 });

    // Hover tooltip for UV-bar segments — shows whether the segment
    // emits, what color, what activator/quencher likely caused it.
    uvCanvas.onmousemove = function(e) {
      const tooltip = document.getElementById('groove-tooltip');
      if (!tooltip) return;
      const rect = uvCanvas.getBoundingClientRect();
      const scaleX = uvCanvas.width / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const hit = uvSegs.find(s => mx >= s.x && mx < s.x + s.w);
      if (!hit) { tooltip.style.display = 'none'; return; }
      const seg = hit.seg;
      const firstZ = seg.zones[0];
      const lastZ = seg.zones[seg.zones.length - 1];
      let html = `<b>${seg.color ? 'Fluorescent regime' : 'Inert under UV'}</b><br>`;
      html += `${seg.zones.length} zone${seg.zones.length > 1 ? 's' : ''} · `;
      html += `step ${firstZ.step}–${lastZ.step}<br>`;
      if (seg.color) {
        html += `<span style="display:inline-block;width:10px;height:10px;background:${seg.color};border:1px solid #555;vertical-align:middle"></span> `;
        html += `emission ${seg.color}<br>`;
      } else {
        html += `<span style="color:#888">no emission — activator below threshold or quencher present</span><br>`;
      }
      html += `±${seg.totalThickness.toFixed(1)} µm cumulative`;
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    };
    uvCanvas.onmouseleave = function() {
      const tooltip = document.getElementById('groove-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    };

    // Dashboard bar — the "data" view. 6 stacked lanes per zone.
    const barHeader = document.createElement('div');
    barHeader.style.cssText = 'color:#8a7a40;font-size:0.7rem;border-bottom:1px solid #2a2518;padding-bottom:0.3rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:baseline';
    barHeader.innerHTML = `
      <span>${crystal.zones.length} growth zone${crystal.zones.length > 1 ? 's' : ''} · by chemistry axis</span>
      <span style="font-size:0.65rem;color:#5a4a30">nucleation ← → rim</span>
    `;
    body.appendChild(barHeader);

    // Canvas sized to the modal's effective content width (~600px after
    // padding on a 650px-max modal).
    const barCanvas = document.createElement('canvas');
    barCanvas.style.cssText = 'width:100%;max-width:600px;height:auto;display:block;margin-bottom:0.3rem;background:#070706;border:1px solid #1a1a14;border-radius:3px';
    body.appendChild(barCanvas);
    renderZoneBarCanvas(barCanvas, crystal.zones, {
      height: 160,
      maxWidth: 600,
      minZoneWidth: 1,
      maxZoneWidth: 30,
      showLaneLabels: true,
      showFIGlyphs: true,
    });

    // Hover tooltip for bar-graph zones — reuses the Record Player's
    // #groove-tooltip element when present, otherwise no-op.
    const nZones = crystal.zones.length;
    const zoneWPx = barCanvas.width / nZones;
    barCanvas.onmousemove = function(e) {
      const tooltip = document.getElementById('groove-tooltip');
      if (!tooltip) return;
      const rect = barCanvas.getBoundingClientRect();
      const scaleX = barCanvas.width / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const zoneIdx = Math.floor(mx / zoneWPx);
      if (zoneIdx < 0 || zoneIdx >= nZones) { tooltip.style.display = 'none'; return; }
      const z = crystal.zones[zoneIdx];
      let html = `<b>Zone ${zoneIdx + 1}</b> · Step ${z.step}<br>`;
      html += `🌡️ ${z.temperature.toFixed(0)}°C<br>`;
      html += z.thickness_um >= 0
        ? `📏 +${z.thickness_um.toFixed(1)} µm<br>`
        : `<span style="color:#cc4444">📏 ${z.thickness_um.toFixed(1)} µm (dissolution)</span><br>`;
      html += `<span style="color:#cc6644">Fe: ${z.trace_Fe.toFixed(1)}</span> · `;
      html += `<span style="color:#ffaa44">Mn: ${z.trace_Mn.toFixed(1)}</span> · `;
      html += `<span style="color:#8888cc">Al: ${z.trace_Al.toFixed(1)}</span> · `;
      html += `<span style="color:#88cc88">Ti: ${z.trace_Ti.toFixed(3)}</span><br>`;
      if (z.fluid_inclusion) html += `💧 ${z.inclusion_type}<br>`;
      if (z.note) html += `<span style="color:#8a7a40">${z.note}</span>`;
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    };
    barCanvas.onmouseleave = function() {
      const tooltip = document.getElementById('groove-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    };

    // Collapsible precise-value list below the bar graph. Kept for
    // players who want to read exact numbers; default closed so the
    // bar graph is the primary narrative.
    const details = document.createElement('details');
    details.style.cssText = 'margin-top:0.6rem';
    const summaryEl = document.createElement('summary');
    summaryEl.style.cssText = 'cursor:pointer;color:#8a7a40;font-size:0.7rem;padding:0.3rem 0';
    summaryEl.textContent = 'Zone-by-zone details';
    details.appendChild(summaryEl);

    for (const z of crystal.zones) {
      const entry = document.createElement('div');
      entry.className = 'zone-entry';
      let html = `<span class="z-step">Step ${z.step}</span> · `;
      html += `<span class="z-temp">${z.temperature.toFixed(0)}°C</span> · `;
      if (z.thickness_um >= 0) {
        html += `<span class="z-thick">+${z.thickness_um.toFixed(1)} µm</span>`;
      } else {
        html += `<span style="color:#cc4444">${z.thickness_um.toFixed(1)} µm (dissolution)</span>`;
      }

      const traces = [];
      if (z.trace_Fe > 0.5) traces.push(`Fe ${z.trace_Fe.toFixed(1)}`);
      if (z.trace_Mn > 0.3) traces.push(`Mn ${z.trace_Mn.toFixed(1)}`);
      if (z.trace_Ti > 0.01) traces.push(`Ti ${z.trace_Ti.toFixed(3)}`);
      if (z.trace_Al > 0.5) traces.push(`Al ${z.trace_Al.toFixed(1)}`);
      if (traces.length) html += ` · <span style="color:#a89040">${traces.join(', ')} ppm</span>`;

      if (z.fluid_inclusion) html += ` · <span class="z-fi">FI: ${z.inclusion_type}</span>`;
      if (z.note) html += `<div class="z-note">${z.note}</div>`;

      entry.innerHTML = html;
      details.appendChild(entry);
    }
    body.appendChild(details);
  }

  overlay.classList.add('visible');
}

function closeZoneModal() {
  document.getElementById('zone-overlay').classList.remove('visible');
}

function fortressFinish() {
  if (!fortressSim) return;

  const logEl = document.getElementById('fortress-log');
  const summaryLines = fortressSim.format_summary();

  fortressLogLines.push('');
  const sep = document.createElement('div');
  sep.innerHTML = '<br>';
  logEl.appendChild(sep);

  // Render summary with narrative box
  let inNarrative = false;
  let narrativeEl = null;

  for (const line of summaryLines) {
    fortressLogLines.push(line);

    if (line === 'GEOLOGICAL HISTORY') {
      const box = document.createElement('div');
      box.className = 'narrative-box';
      const title = document.createElement('div');
      title.className = 'narrative-title';
      title.textContent = 'GEOLOGICAL HISTORY';
      box.appendChild(title);
      narrativeEl = document.createElement('div');
      box.appendChild(narrativeEl);
      logEl.appendChild(box);
      inNarrative = true;
      continue;
    }

    if (inNarrative && line.startsWith('═'.repeat(10))) {
      inNarrative = false;
      appendFortressLine(logEl, line);
      continue;
    }

    if (inNarrative && line.startsWith('─'.repeat(10))) continue;

    if (inNarrative) {
      const span = document.createElement('div');
      span.textContent = line;
      span.style.marginBottom = line === '' ? '0.5em' : '0';
      narrativeEl.appendChild(span);
      continue;
    }

    appendFortressLine(logEl, line);
  }

  logEl.scrollTop = logEl.scrollHeight;

  // Disable action buttons
  fortressActive = false;
  document.querySelectorAll('.action-grid .action-btn').forEach(btn => btn.disabled = true);
}

function fortressReset() {
  fortressSim = null;
  fortressActive = false;
  fortressLogLines = [];
  brothSnapshots = [];

  // Reset broth panel
  const brothToggle = document.getElementById('broth-toggle');
  const brothBody = document.getElementById('broth-body');
  if (brothToggle) brothToggle.classList.remove('open');
  if (brothBody) brothBody.classList.remove('open');
  // Clear snapshot buttons (keep the 📸 button)
  const snapRow = document.getElementById('broth-snapshots');
  if (snapRow) {
    const firstBtn = snapRow.querySelector('.broth-snapshot-btn');
    snapRow.innerHTML = '';
    if (firstBtn) snapRow.appendChild(firstBtn);
  }

  // Reset UI
  document.getElementById('fortress-setup').style.display = 'block';
  document.getElementById('fortress-status').style.display = 'none';
  document.getElementById('fortress-actions').style.display = 'none';
  document.getElementById('fortress-main').style.display = 'none';
  document.getElementById('fortress-log').innerHTML = '';
  document.getElementById('fortress-inventory').innerHTML = '<h4>💎 Crystal Inventory</h4><div class="inv-empty">No crystals yet. Begin and take actions to grow your vug.</div>';

  // Re-enable action buttons
  document.querySelectorAll('.action-grid .action-btn').forEach(btn => btn.disabled = false);

  // Reset sliders
  document.getElementById('f-temp').value = 300;
  document.getElementById('f-temp-val').textContent = '300°C';
  document.getElementById('f-pressure').value = 15;
  document.getElementById('f-pressure-val').textContent = '1.5 kbar';
  document.getElementById('f-ph').value = 65;
  document.getElementById('f-ph-val').textContent = '6.5';
  selectPreset('silica');
}

function copyFortressLog() {
  const text = fortressLogLines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btns = document.querySelectorAll('.end-btns .btn-copy');
    if (btns.length) {
      const btn = btns[0];
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

