let rng = new SeededRandom(Date.now());
// Time compression: each step represents more geological time at higher values.
// 5× = ~50,000 years/step (Simulation/Creative), 1× = ~10,000 years/step (Groove).
// Physics are identical — the clock is different, not the chemistry.
let timeScale = 5.0;

// ============================================================
// MINERAL GROWTH ENGINES
// ============================================================

// Molybdenite (MoS₂) — primary molybdenum sulfide
// Hexagonal platy crystals. Bluish-gray metallic. Soft (H=1-1.5), sectile.
// Forms at high T (300-500°C) in porphyry systems. Mo arrives in separate pulse from Cu.
// Dissolves under oxidizing conditions, releasing MoO₄²⁻ to fluid — essential for wulfenite.
// Ferrimolybdite — Fe₂(MoO₄)₃·nH₂O
// Canary-yellow acicular tufts. The "no-lead branch" of Mo oxidation —
// forms on molybdenite surfaces during supergene weathering when Fe is
// around. Coexists with wulfenite; faster growth, less particular.
// Dehydrates > 150°C or acid-dissolves at pH < 2 (releasing Fe + MoO₄²⁻).
// Scorodite — FeAsO₄·2H₂O
// Pale blue-green pseudo-octahedral dipyramids; the arsenic sequestration
// mineral. Forms from oxidized arsenopyrite. Releases AsO₄³⁻ back to
// fluid above pH 5.5 (feeds higher-pH arsenates) or above 160°C
// (dehydrates to anhydrous FeAsO₄).
// Arsenopyrite — FeAsS
// Mesothermal primary sulfide; striated prismatic crystals with diamond
// cross-section; metallic silver-white. The #1 Au-trapping mineral —
// captures fluid Au as "invisible gold" trace_Au on growth zones,
// competing with grow_native_gold for the fluid Au pool. On supergene
// oxidation (O₂>0.5), the trapped Au is released back to fluid along
// with Fe³⁺ + AsO₄³⁻ + H₂SO₄ — feeds scorodite + supergene-gold pockets.
// Barite — BaSO4
// The Ba sequestration mineral; tabular plates ("desert rose"), bladed
// fans (Cumberland), cockscomb cyclic twins. Acid-resistant, permanent
// at sim T (decomposes only > 1149°C). MVT primary gangue.
// Celestine — SrSO4
// Pale celestial-blue Sr sulfate; isostructural with barite. Madagascar
// geodes, Sicilian sulfur-vug fibrous habit, Lake Erie blue blades.
// Permanent at sim T (decomposes > 1100°C).
// Acanthite — Ag2S (monoclinic, low-T)
// First-class engine for the cold-storage form of Ag2S. Most acanthite in
// nature is paramorphic after cooled argentite (set by apply_paramorph_transitions
// in 8a-2); the engine here covers primary low-T thorn / massive habits.
// Lead-gray to iron-black, Mohs 2-2.5, sectile.
// Argentite — Ag2S (cubic, high-T). Paramorph to acanthite on cooling
// past 173°C — handled in applyParamorphTransitions in run_step.
// Chalcanthite — CuSO4·5H2O (water-soluble Cu sulfate, terminal cascade phase)
// Descloizite — Pb(Zn,Cu)VO4(OH) (Zn end of descloizite-mottramite series)
// Mottramite — Pb(Cu,Zn)VO4(OH) (Cu end of descloizite-mottramite series)
// Raspite — PbWO4 (RARE monoclinic polymorph)
// Stolzite — PbWO4 (common tetragonal polymorph)
// Olivenite — Cu2AsO4(OH) (Cu end of olivenite-adamite series)
// Nickeline — NiAs (high-T pale-copper-red Ni arsenide)
// Millerite — NiS (capillary brass-yellow Ni sulfide)
// Cobaltite — CoAsS (three-element-gate sulfarsenide)
// Native tellurium — Te (metal-telluride-overflow engine)
// Native sulfur — S (synproportionation Eh-window engine)
// Native arsenic — As (residual-overflow native element)
// Native silver — Ag (Kongsberg wire-silver mineral, S-depletion gate)
// Anhydrite — CaSO4
// High-T or saline-low-T Ca sulfate. Sabkha evaporite + Bingham deep brine.
// Rehydrates to gypsum/selenite when T<60 AND salinity<100‰.
// Brochantite — Cu4(SO4)(OH)6
// Wet-supergene Cu sulfate; emerald-green prismatic. Forks with antlerite
// at pH 3.5. Substrate prefers dissolving Cu sulfides (chalcocite/covellite).
// Antlerite — Cu3(SO4)(OH)4
// Dry-acid Cu sulfate; pH 1-3.5 stability. Substrate-prefers dissolving
// brochantite (the direct fork product when acidification arrives).
// Jarosite — KFe³⁺₃(SO4)2(OH)6
// Yellow AMD Fe-sulfate; substrate-prefers dissolving pyrite/marcasite.
// Dissolves above pH 4 → releases K + Fe³⁺ + SO4 (jarosite-to-goethite
// AMN succession when pH neutralizes).
// Alunite — KAl3(SO4)2(OH)6
// Advanced argillic alteration index mineral; substrate-prefers dissolving
// feldspar. Wider T than jarosite (hydrothermal acid-sulfate). Dissolves
// above pH 4 OR above 350°C.
// Feldspar — KAlSi3O8 / NaAlSi3O8
// Temperature determines polymorph: sanidine (>500) → orthoclase (300-500) → microcline (<300)
// Pb in fluid + microcline = amazonite (green)
// The mineral that IS a thermometer
// Round 9a — broth-ratio branching pair: rosasite (Cu-dominant) +
// aurichalcite (Zn-dominant). Mirror of vugg.py grow_rosasite /
// grow_aurichalcite. The supersat methods enforce the ratio gate;
// these grow funcs handle habit selection, color-by-fraction notes,
// fluid depletion, and acid dissolution.
// Round 9b — anion-competition mechanic (torbernite + zeunerite).
// Mirror of vugg.py grow_torbernite / grow_zeunerite. Both are uranyl
// tabular plates flattened on {001}; same habit-selection logic, the
// only difference is which anion (P or As) drives the formula.

// Tincalconite paramorph stub — no growth pathway, only appears via
// applyDehydrationTransitions converting borax in place.
function grow_tincalconite(_crystal, _conditions, _step) { return null; }

// Mirabilite (Na2SO4·10H2O) — Glauber salt, cold-side Na-sulfate
// evaporite. v29 mirror of vugg.py.
// Thenardite (Na2SO4) — anhydrous warm-side Na-sulfate. v29 mirror.
// Borax (Na2[B4O5(OH)4]·8H2O) — alkaline-brine borate evaporite.
// v28. Fast-growing, dehydration-prone. Mirror of grow_borax in
// vugg.py.
// Halite (NaCl) — chloride evaporite. v27. Cubic / hopper habit.
// Bathtub-ring deposit; fires when a vadose-transition concentration
// boost pushes Na × Cl × concentration² into supersaturation. Mirror
// of grow_halite in vugg.py.
// Selenite (gypsum variety) — CaSO4·2H2O
// Forms at low temperature in oxidizing, evaporative environments
// The crystal that grows when everything else is ending
// Goethite (FeO(OH)) — the ghost mineral made real.
// Low-T oxidation product of Fe-sulfides. Botryoidal/mammillary/fibrous.
// Classic pseudomorph after pyrite (Egyptian Prophecy Stones = goethite
// after marcasite). Dehydrates to hematite above 300°C.
// Albite (NaAlSi₃O₈) — Na-feldspar, cleavelandite platy habit in pegmatites.
// Chrysocolla (Cu₂H₂Si₂O₅(OH)₄) — hydrous copper silicate, cyan-blue
// enamel of Cu oxidation zones. Mirrors grow_chrysocolla in vugg.py.
// Native gold (Au) — noble metal. No acid-dissolution path; gold is
// indestructible under sim conditions. See vugg.py grow_native_gold for
// full habit / alloying / σ rationale.
// Shared habit-form list for the beryl family (T-binned).
// Shared HF-only dissolution path for all beryl-family crystals.
// ============================================================
// CORUNDUM FAMILY (Al₂O₃) — first UPPER-gate mineral in the sim
// ============================================================



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

// ============================================================
// MODE SWITCHING
// ============================================================

function showTitleScreen() {
  hideAllMenuAndModePanels();
  document.body.classList.add('title-on');
  const titleScreen = document.getElementById('title-screen');
  if (titleScreen) titleScreen.style.display = 'block';
  idleStop(); // stop any running idle simulation
  if (typeof grooveStop === 'function' && groovePlaying) grooveStop();
  // Going Home tears down any active tutorial overlay + restores
  // hidden Creative-mode controls. No-op if no tutorial running.
  if (typeof endTutorial === 'function') endTutorial();
  currentGameMode = null;
  refreshTitleLoadButton();
}

// ============================================================
// CRYSTAL COLLECTION — per-crystal persistent records
// ============================================================
// Each entry is ONE individual crystal the user chose to collect
// (not a whole run). Stored as an array in localStorage under
// 'vugg-crystals-v1'. The Library shows each species' collection
// directly on its card; the title-screen Load Game button opens
// the Library.
const CRYSTAL_KEY = 'vugg-crystals-v1';

function loadCrystals() {
  try {
    const raw = localStorage.getItem(CRYSTAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('crystal collection parse failed:', e);
    return [];
  }
}
function persistCrystals(items) {
  try { localStorage.setItem(CRYSTAL_KEY, JSON.stringify(items)); return true; }
  catch (e) { console.error('crystal persist failed:', e); return false; }
}
function uniqueCollectedMinerals() {
  const seen = new Set();
  for (const c of loadCrystals()) seen.add(c.mineral);
  return seen;
}
function crystalsOfMineral(mineral) {
  return loadCrystals().filter(c => c.mineral === mineral);
}

// Turn a live Crystal + the run it came from into a persistent record.
// Stores the full zones array so the Record Player can spiral the
// crystal later — without this the Groove would have nothing to draw.
function buildCrystalRecord(crystal, meta) {
  const titleBase = meta.archetype
    ? `${meta.archetype.replace(/_/g, ' ')} vugg`
    : (meta.scenario ? `${meta.scenario} scenario` : meta.mode || 'unknown');
  const defaultName = `${capitalize(crystal.mineral)} from ${titleBase}`;
  const fl = typeof crystal.predict_fluorescence === 'function'
    ? crystal.predict_fluorescence() : null;

  // Serialize zones with the fields the Groove visualization reads.
  // Everything else on a GrowthZone is recomputable or decorative.
  const zones = (crystal.zones || []).map(z => ({
    step: z.step,
    temperature: z.temperature,
    thickness_um: z.thickness_um,
    growth_rate: z.growth_rate,
    trace_Fe: z.trace_Fe || 0,
    trace_Mn: z.trace_Mn || 0,
    trace_Al: z.trace_Al || 0,
    trace_Ti: z.trace_Ti || 0,
    trace_Pb: z.trace_Pb || 0,
    trace_Cu: z.trace_Cu || 0,
    fluid_inclusion: !!z.fluid_inclusion,
    inclusion_type: z.inclusion_type || '',
    note: z.note || '',
    is_phantom: !!z.is_phantom,
  }));

  return {
    id: `cry-${Date.now().toString(36)}-${Math.floor(Math.random() * 46656).toString(36)}`,
    collected_at: new Date().toISOString(),
    name: meta.name || defaultName,
    mineral: crystal.mineral,
    source: {
      mode: meta.mode || 'unknown',
      scenario: meta.scenario || null,
      archetype: meta.archetype || null,
      seed: meta.seed ?? null,
      nucleation_step: crystal.nucleation_step,
      nucleation_temp: +crystal.nucleation_temp.toFixed(1),
    },
    mm: +crystal.c_length_mm.toFixed(3),
    a_mm: +((crystal.a_width_mm || 0).toFixed(3)),
    habit: crystal.habit || '',
    forms: (crystal.dominant_forms || []).slice(),
    twinned: !!crystal.twinned,
    twin_law: crystal.twin_law || null,
    position: crystal.position || '',
    fluorescence: fl,
    zones,
    zone_count: zones.length,
    total_growth_um: +(crystal.total_growth_um || 0).toFixed(1),
    radiation_damage: crystal.radiation_damage || 0,
  };
}

// Build a Crystal-shaped stand-in from a persisted record — enough for the
// Groove visualization and the zone-history modal to treat it like a live
// crystal. Does not connect to a VugSimulator; purely for display.
function reconstructCrystalFromRecord(rec) {
  const zones = (rec.zones || []).map(z => Object.assign({}, z));
  const stand = {
    mineral: rec.mineral,
    crystal_id: `C${(rec.id || '').slice(-4)}`,
    nucleation_step: rec.source?.nucleation_step ?? 0,
    nucleation_temp: rec.source?.nucleation_temp ?? 0,
    position: rec.position || '',
    c_length_mm: rec.mm,
    a_width_mm: rec.a_mm || rec.mm,
    habit: rec.habit || '',
    dominant_forms: (rec.forms || []).slice(),
    twinned: !!rec.twinned,
    twin_law: rec.twin_law || '',
    zones,
    total_growth_um: rec.total_growth_um || 0,
    radiation_damage: rec.radiation_damage || 0,
    active: false,
    dissolved: false,
    enclosed_crystals: [],
    enclosed_at_step: [],
    phantom_surfaces: [],
    phantom_count: zones.filter(z => z.is_phantom).length,
    _fromCollectionRecord: rec,
    predict_fluorescence() {
      return rec.fluorescence || 'non-fluorescent';
    },
    predict_color() {
      return rec.habit && rec.habit.includes('smoky') ? 'smoky' : 'typical for species';
    },
    describe_morphology() {
      const parts = [this.habit || 'massive'];
      if (this.dominant_forms && this.dominant_forms.length) {
        parts.push(`[${this.dominant_forms.slice(0, 2).join(', ')}]`);
      }
      if (this.twinned) parts.push(`⟁ ${this.twin_law}`);
      parts.push(`${this.c_length_mm.toFixed(1)} × ${this.a_width_mm.toFixed(1)} mm`);
      return parts.join(' ');
    },
    describe_latest_zone() {
      const z = this.zones[this.zones.length - 1];
      if (!z) return '';
      return `step ${z.step}, T=${z.temperature.toFixed(1)}°C, +${z.thickness_um.toFixed(1)} µm`;
    },
  };
  return stand;
}

function collectCrystal(crystal, meta) {
  if (!crystal) return false;
  if ((crystal.total_growth_um || 0) < 0.1 && (crystal.zones || []).length === 0) {
    alert('This crystal has no growth zones yet — let it grow first.');
    return false;
  }
  const rec = buildCrystalRecord(crystal, meta);
  const defaultName = rec.name;
  const chosen = prompt(`Name this ${crystal.mineral}:`, defaultName);
  if (chosen === null) return false; // cancelled
  rec.name = chosen.trim() || defaultName;

  const already = uniqueCollectedMinerals();
  const items = loadCrystals();
  items.push(rec);
  if (!persistCrystals(items)) {
    alert('Could not save — localStorage is full or unavailable.');
    return false;
  }
  const isNewSpecies = !already.has(rec.mineral);
  // Update any open Library view and the title-screen Load button.
  if (typeof libraryRender === 'function' && document.getElementById('library-panel') &&
      document.getElementById('library-panel').style.display !== 'none') {
    libraryRender();
  }
  refreshTitleLoadButton();
  // Mark the crystal in the live inventory so the Collect button disables.
  crystal._collectedRecordId = rec.id;
  const newMsg = isNewSpecies ? `\n\n🆕 First ${rec.mineral} in your collection — a species unlocked.` : '';
  alert(`Collected "${rec.name}".${newMsg}`);
  return true;
}

function renameCollectedCrystal(id) {
  const items = loadCrystals();
  const rec = items.find(c => c.id === id);
  if (!rec) return;
  const next = prompt('Rename crystal:', rec.name);
  if (next === null) return;
  rec.name = next.trim() || rec.name;
  persistCrystals(items);
  if (typeof libraryRender === 'function') libraryRender();
}
function deleteCollectedCrystal(id) {
  if (!confirm('Delete this specimen from your collection?')) return;
  const items = loadCrystals().filter(c => c.id !== id);
  persistCrystals(items);
  if (typeof libraryRender === 'function') libraryRender();
  refreshTitleLoadButton();
}

function refreshTitleLoadButton() {
  const btn = document.getElementById('title-btn-load');
  if (!btn) return;
  try {
    const items = loadCrystals();
    const n = items.length;
    btn.disabled = n === 0;
    btn.title = n
      ? `Open Library (${n} collected crystal${n === 1 ? '' : 's'})`
      : 'No crystals collected yet — grow a vugg and tap Collect';
  } catch (e) { /* localStorage unavailable */ }
}

// Called by the per-crystal Collect button in each mode's inventory.
// The button stops propagation so the parent row's click (zone history
// modal) doesn't also fire.
function collectFromLegends(crystalIdx, ev) {
  if (ev) ev.stopPropagation();
  if (!legendsSim) return;
  const crystal = legendsSim.crystals[crystalIdx];
  const scenario = document.getElementById('scenario').value;
  const seedInput = document.getElementById('seed').value;
  if (collectCrystal(crystal, {
    mode: 'simulation',
    scenario,
    seed: seedInput ? parseInt(seedInput, 10) : null,
  })) {
    updateLegendsInventory(legendsSim);
  }
}
function collectFromFortress(crystalIdx, ev) {
  if (ev) ev.stopPropagation();
  if (!fortressSim) return;
  const crystal = fortressSim.crystals[crystalIdx];
  if (collectCrystal(crystal, { mode: 'creative' })) updateFortressInventory();
}
function collectFromRandom(crystalIdx, ev) {
  if (ev) ev.stopPropagation();
  if (!randomSim) return;
  const crystal = randomSim.crystals[crystalIdx];
  if (collectCrystal(crystal, {
    mode: 'random',
    archetype: randomSimArchetype,
    seed: randomSimSeed,
  })) {
    renderRandomInventory();
  }
}

// ============================================================
// MENU PAGES — New Game menu + Scenarios picker
// ============================================================
function hideAllMenuAndModePanels() {
  const ids = [
    'title-screen', 'new-game-panel', 'scenarios-panel',
    'legends-controls', 'output-container',
    'fortress-panel', 'groove-panel', 'idle-panel',
    'library-panel', 'random-panel',
    'topo-panel',
  ];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  const modeToggle = document.getElementById('mode-toggle');
  if (modeToggle) modeToggle.style.display = 'none';
  // Stop any replay timer — the canvas is about to be hidden.
  if (typeof _topoPlaybackTimer !== 'undefined' && _topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    const btn = document.getElementById('topo-replay-btn');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
  }
}

function openNewGameMenu() {
  hideAllMenuAndModePanels();
  document.body.classList.add('title-on');
  const panel = document.getElementById('new-game-panel');
  if (panel) panel.style.display = 'block';
  idleStop();
  refreshTitleLoadButton();
}

function openScenariosPicker() {
  hideAllMenuAndModePanels();
  document.body.classList.add('title-on');
  const panel = document.getElementById('scenarios-panel');
  if (panel) panel.style.display = 'block';
  idleStop();
}

// Router for the New Game menu's non-scenario buttons.
function menuGo(modeName) { switchMode(modeName); }

// Take a SCENARIOS[name] entry and run it inside Creative/Fortress so the
// player steps through it interactively; events fire on their scheduled
// step numbers as the sim advances.
function startScenarioInCreative(scenarioName) {
  const make = SCENARIOS[scenarioName];
  if (!make) { alert('Unknown scenario: ' + scenarioName); return; }
  switchMode('fortress');
  fortressBeginFromScenario(scenarioName);
}

// Take a FLUID_PRESETS[id] starter fluid and run it inside Creative as a
// no-event sim. The starter fluid represents what would naturally leak
// from the host rock; the player perturbs it via in-game actions
// (Heat / Cool / Inject / Tectonic). No scripted events fire.
function startStarterFluidInCreative(presetId) {
  const preset = FLUID_PRESETS[presetId];
  if (!preset) { alert('Unknown starter fluid: ' + presetId); return; }
  switchMode('fortress');
  fortressBeginFromStarterFluid(presetId);
}

// Parallel to fortressBeginFromScenario but uses a FLUID_PRESETS entry
// rather than a full scenario. Defaults T/P/wall to mid-range generics
// since starter fluids don't carry that metadata. Player can intervene
// from step 1.
function fortressBeginFromStarterFluid(presetId) {
  const preset = FLUID_PRESETS[presetId];
  if (!preset) return;

  const fluid = new FluidChemistry(Object.assign({}, preset.fluid));
  // Generic mid-range conditions — see Creative-mode rework backlog item
  // for surfacing T/P/wall as starter-fluid-level controls.
  const wall = new VugWall({
    composition: 'limestone', thickness_mm: 500, vug_diameter_mm: 50,
    wall_Fe_ppm: 2000, wall_Mn_ppm: 500, wall_Mg_ppm: 1000,
    primary_bubbles: 3, secondary_bubbles: 5, shape_seed: Date.now() & 0xff
  });
  const conditions = new VugConditions({
    temperature: 200.0, pressure: 1.0, fluid, wall
  });

  rng = new SeededRandom(Date.now());
  fortressSim = new VugSimulator(conditions, []);
  fortressActive = true;
  fortressLogLines = [];

  document.getElementById('fortress-setup').style.display = 'none';
  document.getElementById('fortress-status').style.display = 'block';
  document.getElementById('fortress-actions').style.display = 'block';
  const main = document.getElementById('fortress-main');
  main.style.display = 'flex';

  const logEl = document.getElementById('fortress-log');
  logEl.innerHTML = '';
  const initLines = [
    `🏰 Creative Mode — Starter Fluid: ${preset.label}`,
    `   Temperature: 200°C | Pressure: 1.00 kbar | pH: ${conditions.fluid.pH.toFixed(1)}`,
    `   Fluid: ${conditions.fluid.describe()}`,
    `   ${preset.desc}`,
    `   No scripted events — only your actions + ambient drift will shape this vug.`,
    '═'.repeat(60), '',
    'Advance with Wait. Intervene with Heat/Cool/Inject/Tectonic/etc. at any time.'
  ];
  initLines.forEach(line => {
    fortressLogLines.push(line);
    appendFortressLine(logEl, line);
  });

  updateFortressStatus();
  updateFortressInventory();
  if (typeof syncBrothSliders === 'function') syncBrothSliders();
}

// Parallel to fortressBegin() but uses a scenario's conditions + events
// instead of the setup sliders. The sim is pre-wired with events so they
// fire automatically on Wait/Heat/Cool/etc. advances.
function fortressBeginFromScenario(scenarioName) {
  const make = SCENARIOS[scenarioName];
  if (!make) return;
  const { conditions, events, defaultSteps } = make();

  rng = new SeededRandom(Date.now());
  fortressSim = new VugSimulator(conditions, events);
  fortressActive = true;
  fortressLogLines = [];

  document.getElementById('fortress-setup').style.display = 'none';
  document.getElementById('fortress-status').style.display = 'block';
  document.getElementById('fortress-actions').style.display = 'block';
  const main = document.getElementById('fortress-main');
  main.style.display = 'flex';

  const prettyName = scenarioName.replace(/_/g, ' ');
  const logEl = document.getElementById('fortress-log');
  logEl.innerHTML = '';
  const initLines = [
    `🏰 Creative Mode — Scenario: ${prettyName}`,
    `   Temperature: ${conditions.temperature.toFixed(0)}°C | Pressure: ${conditions.pressure.toFixed(2)} kbar | pH: ${conditions.fluid.pH.toFixed(1)}`,
    `   Fluid: ${conditions.fluid.describe()}`,
  ];
  if (events && events.length) {
    initLines.push(`   Events scheduled (will fire as you advance steps):`);
    for (const ev of events) {
      initLines.push(`     Step ${ev.step}: ${ev.name}${ev.description ? ' — ' + ev.description : ''}`);
    }
  } else {
    initLines.push(`   No scripted events — only your actions + ambient drift will shape this vug.`);
  }
  initLines.push('═'.repeat(60), '', 'Advance with Wait. Intervene with Heat/Cool/Inject/Tectonic/etc. at any time.');
  initLines.forEach(line => {
    fortressLogLines.push(line);
    appendFortressLine(logEl, line);
  });

  updateFortressStatus();
  updateFortressInventory();
  if (typeof syncBrothSliders === 'function') syncBrothSliders();
}

// Title screen button handlers.
function titleNewGame() {
  // Opens the intermediate menu: Scenarios / Creative / Simulation /
  // Zen Mode / Home.
  openNewGameMenu();
}
function titleQuickPlay() {
  switchMode('random');
  try { runRandomVugg(); } catch (e) { console.error('Quick Play failed to roll:', e); }
}
function titleLoadGame() {
  // Open the Library — that's where the collection lives.
  switchMode('library');
}

// The last "playable" mode the user was in. Used by the Current Game
// nav button so it can return the player to their in-progress vugg
// (or their just-finished narrated result) from Record Player /
// Library. Cleared when the user goes Home.
let currentGameMode = null;
const GAME_MODES = ['legends', 'fortress', 'idle', 'random'];

function switchMode(mode) {
  const titleScreen = document.getElementById('title-screen');
  const modeToggle = document.getElementById('mode-toggle');
  const legendsControls = document.getElementById('legends-controls');
  const outputContainer = document.getElementById('output-container');
  const fortressPanel = document.getElementById('fortress-panel');
  const groovePanel = document.getElementById('groove-panel');
  const idlePanel = document.getElementById('idle-panel');
  const libraryPanel = document.getElementById('library-panel');
  const modeCurrent = document.getElementById('mode-current');
  const modeGroove = document.getElementById('mode-groove');
  const modeLibrary = document.getElementById('mode-library');

  // Pause background activity before leaving it.
  if (mode !== 'idle' && idleRunning && !idlePaused && typeof idleTogglePause === 'function') {
    idleTogglePause();
  }
  if (mode !== 'groove' && groovePlaying && typeof grooveStop === 'function') {
    grooveStop();
  }
  // Switching out of fortress while a tutorial is running tears down
  // the overlay + restores controls. (Tutorials only live in fortress.)
  if (mode !== 'fortress' && typeof endTutorial === 'function') endTutorial();

  // Hide title screen, show mode toggle
  document.body.classList.remove('title-on');
  titleScreen.style.display = 'none';
  modeToggle.style.display = 'flex';

  legendsControls.style.display = 'none';
  outputContainer.style.display = 'none';
  fortressPanel.style.display = 'none';
  groovePanel.style.display = 'none';
  if (idlePanel) idlePanel.style.display = 'none';
  if (libraryPanel) libraryPanel.style.display = 'none';
  const randomPanel = document.getElementById('random-panel');
  if (randomPanel) randomPanel.style.display = 'none';
  const topoPanel = document.getElementById('topo-panel');
  if (topoPanel) topoPanel.style.display = 'none';
  // Stop any topo replay in flight — the canvas is about to be hidden.
  if (_topoPlaybackTimer) {
    clearInterval(_topoPlaybackTimer);
    _topoPlaybackTimer = null;
    const replayBtn = document.getElementById('topo-replay-btn');
    if (replayBtn) { replayBtn.textContent = '▶'; replayBtn.classList.remove('playing'); }
  }
  const newGamePanel = document.getElementById('new-game-panel');
  if (newGamePanel) newGamePanel.style.display = 'none';
  const scenariosPanel = document.getElementById('scenarios-panel');
  if (scenariosPanel) scenariosPanel.style.display = 'none';
  if (modeCurrent) modeCurrent.classList.remove('active');
  if (modeGroove) modeGroove.classList.remove('active');
  if (modeLibrary) modeLibrary.classList.remove('active');

  if (mode === 'legends') {
    legendsControls.style.display = 'flex';
    outputContainer.style.display = 'block';
    timeScale = 5.0; // ~50,000 years per step
  } else if (mode === 'fortress') {
    fortressPanel.style.display = 'block';
    timeScale = 5.0; // ~50,000 years per step
  } else if (mode === 'groove') {
    groovePanel.style.display = 'block';
    if (modeGroove) modeGroove.classList.add('active');
    groovePopulateCrystals();
    timeScale = 1.0; // ~10,000 years per step (real-time geological pace)
  } else if (mode === 'idle') {
    if (idlePanel) idlePanel.style.display = 'block';
    timeScale = 1.0; // ~10,000 years per step
    idleInit();
  } else if (mode === 'library') {
    if (libraryPanel) libraryPanel.style.display = 'flex';
    if (modeLibrary) modeLibrary.classList.add('active');
    libraryInit();
  } else if (mode === 'random') {
    const rp = document.getElementById('random-panel');
    if (rp) rp.style.display = 'block';
    timeScale = 5.0;
  }

  // Remember the active game so the Current Game nav button can
  // return the player here from Record Player / Library.
  if (GAME_MODES.includes(mode)) {
    currentGameMode = mode;
    if (modeCurrent) modeCurrent.classList.add('active');
    if (topoPanel) {
      topoPanel.style.display = 'block';
      topoEnsureWired();
      // Draw whatever the active sim has now (may be empty if no run yet).
      if (typeof onSpecReady === 'function') {
        onSpecReady(() => topoRender());
      } else {
        topoRender();
      }
    }
  }

  // Leaving Groove (or opening any non-groove mode) drops any
  // library-loaded stand-in so live-sim crystals show up again
  // next time the user opens the Record Player.
  if (mode !== 'groove' && typeof clearGrooveCollection === 'function') {
    clearGrooveCollection();
  }
}

// Nav handler: return to the active game, or start a Quick Play
// (Random Vugg) if there isn't one.
function goToCurrentGame() {
  if (currentGameMode && GAME_MODES.includes(currentGameMode)) {
    switchMode(currentGameMode);
    return;
  }
  titleQuickPlay();
}

// ============================================================
// LIBRARY MODE — mineral reference browser (reads MINERAL_SPEC)
// ============================================================
let _libraryInitialized = false;

function libraryInit() {
  // Populate filter dropdowns from MINERAL_SPEC; wait for fetch if needed.
  onSpecReady(() => {
    if (!_libraryInitialized) {
      const classSet = new Set();
      const elementSet = new Set();
      const scenarioSet = new Set();
      for (const m of Object.values(MINERAL_SPEC)) {
        if (m.class) classSet.add(m.class);
        if (m.required_ingredients) Object.keys(m.required_ingredients).forEach(e => elementSet.add(e));
        if (m.trace_ingredients) Object.keys(m.trace_ingredients).forEach(e => elementSet.add(e));
        if (Array.isArray(m.scenarios)) m.scenarios.forEach(s => scenarioSet.add(s));
      }
      const classSel = document.getElementById('lib-class');
      [...classSet].sort().forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; classSel.appendChild(o); });
      const elSel = document.getElementById('lib-element');
      [...elementSet].sort().forEach(e => { const o = document.createElement('option'); o.value = e; o.textContent = e; elSel.appendChild(o); });
      const scSel = document.getElementById('lib-scenario');
      [...scenarioSet].sort().forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; scSel.appendChild(o); });
      _libraryInitialized = true;
    }
    libraryRender();
  });
}

function libraryResetFilters() {
  ['lib-class','lib-fluor','lib-collected','lib-temp','lib-element','lib-scenario'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
  const s = document.getElementById('lib-search'); if (s) s.value = '';
  libraryRender();
}

function libraryMatches(mineral, m, filters) {
  if (filters.cls !== 'all' && m.class !== filters.cls) return false;
  if (filters.fluor === 'yes' && !m.fluorescence) return false;
  if (filters.fluor === 'no'  && m.fluorescence) return false;
  if (filters.collected && filters.collected !== 'all') {
    const isCollected = filters.collectedSet && filters.collectedSet.has(mineral);
    if (filters.collected === 'yes' && !isCollected) return false;
    if (filters.collected === 'no'  && isCollected)  return false;
  }
  if (filters.temp !== 'all') {
    const range = m.T_range_C || [0, 1000];
    const opt = m.T_optimum_C || range;
    const mid = (opt[0] + opt[1]) / 2;
    if (filters.temp === 'low' && mid >= 100) return false;
    if (filters.temp === 'mid' && (mid < 100 || mid > 400)) return false;
    if (filters.temp === 'high' && mid <= 400) return false;
  }
  if (filters.element !== 'all') {
    const reqHas = m.required_ingredients && filters.element in m.required_ingredients;
    const trcHas = m.trace_ingredients && filters.element in m.trace_ingredients;
    if (!reqHas && !trcHas) return false;
  }
  if (filters.scenario !== 'all') {
    if (!Array.isArray(m.scenarios) || !m.scenarios.includes(filters.scenario)) return false;
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!mineral.toLowerCase().includes(q) && !(m.formula || '').toLowerCase().includes(q) && !(m.description || '').toLowerCase().includes(q)) return false;
  }
  return true;
}

function fluorescenceSummary(fl) {
  if (!fl) return null;
  // v12: explicitly-non-fluorescent species (e.g. uraninite) declare
  // {activator: null, color: null}. Treat as no fluorescence.
  if (!fl.activator && !fl.color) return null;
  const color = (fl.color || '').replace(/_/g, ' ');
  const activator = fl.activator || 'intrinsic';
  const q = fl.quencher && fl.quencher.species ? ` (quenched by ${fl.quencher.species})` : '';
  return `${color} — ${activator}${q}`;
}

function isFluorescent(fl) {
  // Helper for the FL badge — explicitly-null activator+color = not fluorescent
  return !!(fl && (fl.activator || fl.color));
}

function renderIngredientChips(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k,v]) => `<span class="mineral-card-badge">${k}${typeof v === 'number' ? ` ≥${v}` : ''}</span>`).join('');
}

function renderCollectedForMineral(name) {
  const items = crystalsOfMineral(name);
  if (!items.length) {
    return `<div class="card-collection empty">📦 Not yet collected — the next ${name} is yours to claim.</div>`;
  }
  const rows = items
    .slice()
    .sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at))
    .map(c => {
      const twin = c.twinned ? ` · ⟁ ${c.twin_law || ''}` : '';
      const src = c.source && (c.source.scenario || c.source.archetype || c.source.mode) || '';
      const seed = c.source && c.source.seed != null ? ` · seed ${c.source.seed}` : '';
      const safeName = (c.name || '').replace(/"/g, '&quot;');
      const zoneCount = Array.isArray(c.zones) ? c.zones.length : (c.zone_count || 0);
      const canPlay = zoneCount > 0;
      const playBtn = canPlay
        ? `<button onclick="playCollectedInGroove('${c.id}')" title="Open this crystal in the Record Player">▶ Play</button>`
        : `<button disabled title="No zone data saved — collect a fresh one">▶ Play</button>`;
      // Zone-viz Phase 1d: bar-graph thumbnail for each collected specimen.
      // crystalThumbHTML is duck-typed — it reads .mineral + .zones, which
      // the serialized record has. For records saved before zone data was
      // persisted (c.zones undefined), falls back to the generic mineral
      // photo/placeholder automatically.
      const thumbHTML = crystalThumbHTML(c, 40);
      return `<div class="collected-row" style="display:flex;gap:0.5rem;align-items:flex-start">
        ${thumbHTML}
        <div style="flex:1;min-width:0">
          <div class="collected-row-head">
            <span class="collected-name" title="${safeName}">${c.name}</span>
            <span class="collected-size">${c.mm.toFixed(2)} mm</span>
          </div>
          <div class="collected-row-meta">${c.habit}${twin} · ${src}${seed} · ${zoneCount} zones</div>
          <div class="collected-row-actions">
            ${playBtn}
            <button onclick="renameCollectedCrystal('${c.id}')">✎ Rename</button>
            <button onclick="deleteCollectedCrystal('${c.id}')" class="danger">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
  return `<div class="card-collection">
    <div class="card-collection-head">📦 Your collection (${items.length})</div>
    ${rows}
  </div>`;
}

function libraryBuildCard(name, m) {
  const Tmin = m.T_range_C ? m.T_range_C[0] : '?';
  const Tmax = m.T_range_C ? m.T_range_C[1] : '?';
  const Topt = m.T_optimum_C ? `${m.T_optimum_C[0]}–${m.T_optimum_C[1]}` : '—';
  const fl = fluorescenceSummary(m.fluorescence);
  const badges = [];
  if (isFluorescent(m.fluorescence)) badges.push('<span class="mineral-card-badge FL">FL</span>');
  if (m.acid_dissolution) badges.push('<span class="mineral-card-badge acid">acid</span>');
  if (Array.isArray(m.twin_laws) && m.twin_laws.length) badges.push('<span class="mineral-card-badge twin">twins</span>');
  const scenarioChips = (m.scenarios || []).map(s => `<span class="scenario-chip">${s}</span>`).join('');
  const twinText = Array.isArray(m.twin_laws) && m.twin_laws.length
    ? m.twin_laws.map(t => t.name + (t.probability ? ` (${(t.probability*100).toFixed(1)}%)` : '')).join(', ')
    : '—';
  const acidText = (() => {
    // Collect pH thresholds from all three possible spec fields:
    //   - acid_dissolution.pH_threshold: the legacy "dissolves below" field
    //   - pH_dissolution_below: newer canonical name for below-threshold
    //   - pH_dissolution_above: inverse — dissolves ABOVE a pH (scorodite,
    //     jarosite, alunite, brochantite, antlerite, adamite, marcasite,
    //     wulfenite — 8 minerals today). The pre-fix card silently showed
    //     '—' for these, which read as "acid-resistant" and was wrong.
    const below = (m.acid_dissolution && m.acid_dissolution.pH_threshold != null)
      ? m.acid_dissolution.pH_threshold
      : (m.pH_dissolution_below != null ? m.pH_dissolution_below : null);
    const above = (m.pH_dissolution_above != null) ? m.pH_dissolution_above : null;
    const parts = [];
    if (below != null) parts.push(`pH &lt; ${below}`);
    if (above != null) parts.push(`pH &gt; ${above}`);
    if (parts.length) return parts.join(', ');
    // acid_dissolution dict exists but no numeric thresholds → HF-only or
    // rehydration-only (beryl/tourmaline/spodumene/anhydrite).
    if (m.acid_dissolution) return 'resistant';
    return '—';
  })();
  const decompText = m.thermal_decomp_C ? `${m.thermal_decomp_C}°C` : '—';
  const collectedCount = crystalsOfMineral(name).length;
  const collectedBadge = collectedCount
    ? `<span class="mineral-card-badge collected">📦 ${collectedCount}</span>`
    : '';

  return `
    <div class="mineral-card" data-mineral="${name}">
      <div class="mineral-card-header">
        <div>
          <div class="mineral-card-name">${name}</div>
          <div class="mineral-card-formula">${m.formula || ''}</div>
        </div>
        <div>${collectedBadge} ${badges.join(' ')} <span class="mineral-card-class">${m.class || '?'}</span></div>
      </div>
      <div class="mineral-card-desc">${m.description || '<em>No description.</em>'}</div>
      <div class="mineral-card-stats">
        <div class="stat-key">Habits</div>
        <div class="stat-val">${(() => {
          // habit_variants entries are objects like {name, wall_spread, ...};
          // plain .join(', ') stringifies them as "[object Object]". Map to
          // the .name field first so the Library shows readable variant names.
          const hv = m.habit_variants;
          if (Array.isArray(hv) && hv.length) {
            return hv.map(v => (v && v.name) || String(v)).join(', ');
          }
          return m.habit || '?';
        })()}</div>
        <div class="stat-key">T window</div>
        <div class="stat-val">${Tmin}–${Tmax}°C (optimum ${Topt})</div>
        <div class="stat-key">Requires</div>
        <div class="stat-val">${renderIngredientChips(m.required_ingredients)}</div>
        <div class="stat-key">Traces</div>
        <div class="stat-val">${renderIngredientChips(m.trace_ingredients)}</div>
        <div class="stat-key">Fluorescence</div>
        <div class="stat-val">${fl || 'non-fluorescent'}</div>
        <div class="stat-key">Twin laws</div>
        <div class="stat-val">${twinText}</div>
        <div class="stat-key">Acid dissolution</div>
        <div class="stat-val">${acidText}</div>
        <div class="stat-key">Thermal decomp</div>
        <div class="stat-val">${decompText}</div>
      </div>
      <div class="mineral-card-scenarios">Grows in: ${scenarioChips || '<em style="color:#5a4a30">no scenarios listed</em>'}</div>
      ${renderCollectedForMineral(name)}
    </div>
  `;
}

function libraryRender() {
  const grid = document.getElementById('library-grid');
  const count = document.getElementById('library-count');
  if (!grid) return;
  if (!MINERAL_SPEC_READY) {
    grid.innerHTML = '<div class="library-empty">Loading spec…</div>';
    return;
  }
  const filters = {
    cls:          document.getElementById('lib-class').value,
    fluor:        document.getElementById('lib-fluor').value,
    collected:    document.getElementById('lib-collected').value,
    temp:         document.getElementById('lib-temp').value,
    element:      document.getElementById('lib-element').value,
    scenario:     document.getElementById('lib-scenario').value,
    search:       document.getElementById('lib-search').value.trim(),
    // Precompute the collected set once per render so libraryMatches
    // doesn't thrash localStorage + JSON.parse for every mineral.
    collectedSet: uniqueCollectedMinerals(),
  };
  const entries = Object.entries(MINERAL_SPEC)
    .filter(([name, m]) => libraryMatches(name, m, filters))
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) {
    grid.innerHTML = '<div class="library-empty">No minerals match these filters.</div>';
  } else {
    grid.innerHTML = entries.map(([n, m]) => libraryBuildCard(n, m)).join('');
  }
  count.textContent = `${entries.length} of ${Object.keys(MINERAL_SPEC).length} minerals`;
}

// ============================================================
// RANDOM VUGG — procedural scenario + discovery narrative
// ============================================================
// Mirrors vugg.py's scenario_random + _narrate_discovery. Each press of
// "Generate Vugg" picks a geological archetype (or uses the forced one)
// and builds realistic-but-random fluid chemistry. The sim runs; the
// narrative layer reads the resulting assemblage like a specimen tag.
const RANDOM_ARCHETYPES = [
  "hydrothermal", "pegmatite", "supergene", "mvt", "porphyry", "evaporite", "mixed"
];
const ARCHETYPE_SETTING = {
  hydrothermal: "a fracture-fed solution cavity in altered country rock",
  pegmatite:    "the cooled core of a granite pegmatite pocket",
  supergene:    "a shallow oxidation-zone pocket just below the water table",
  mvt:          "a karst dissolution cavity in Paleozoic limestone",
  porphyry:     "a late-stage vug in a porphyry copper stockwork",
  evaporite:    "a desiccated Ca-SO₄ crust near an ancient playa margin",
  mixed:        "an overprinted pocket with two generations of fluid",
};
function _rU(a, b) { return a + rng.uniform(0, 1) * (b - a); }
function _rMaybe(prob, val) { return rng.uniform(0, 1) < prob ? val : 0; }
function _sprinkle(fluid, pool) {
  for (const [elem, prob, lo, hi] of pool) {
    if (rng.uniform(0, 1) < prob) fluid[elem] = _rU(lo, hi);
  }
}

function buildRandomScenario(forcedArchetype) {
  const archetype = (forcedArchetype && forcedArchetype !== 'any')
    ? forcedArchetype
    : RANDOM_ARCHETYPES[Math.floor(rng.uniform(0, RANDOM_ARCHETYPES.length))];

  let T, fluid, events = [], steps;
  if (archetype === 'hydrothermal') {
    T = _rU(220, 380);
    fluid = new FluidChemistry({
      SiO2: _rU(350, 850), Ca: _rU(60, 240), CO3: _rU(40, 180),
      Fe: _rU(8, 45), Mn: _rU(1, 10), Al: _rU(2, 6), Ti: _rU(0.3, 1.2),
      Zn: _rMaybe(0.5, _rU(20, 80)), S: _rMaybe(0.6, _rU(30, 90)),
      Cu: _rMaybe(0.4, _rU(10, 50)), Pb: _rMaybe(0.4, _rU(10, 35)),
      F: _rU(4, 20), pH: _rU(5.5, 7.2), O2: _rU(0, 0.6),
    });
    _sprinkle(fluid, [["Ba",0.30,5,40],["Sr",0.25,3,25],["Ag",0.20,0.5,8],["Sb",0.15,1,10]]);
    events = [{ step: Math.floor(_rU(40,60)), name: 'Fluid Pulse', description: 'Fresh hydrothermal fluid', apply_fn: event_fluid_pulse }];
    steps = Math.floor(_rU(100, 140));
  } else if (archetype === 'pegmatite') {
    T = _rU(520, 780);
    fluid = new FluidChemistry({
      SiO2: _rU(4000, 14000), Ca: _rU(20, 100), CO3: _rU(5, 40),
      K: _rU(50, 130), Na: _rU(35, 90), Al: _rU(20, 50),
      Fe: _rU(20, 80), Mn: _rU(3, 15), F: _rU(10, 40),
      Pb: _rMaybe(0.4, _rU(5, 35)), U: _rMaybe(0.35, _rU(30, 180)),
      pH: _rU(6.0, 7.5), O2: _rU(0, 0.2),
    });
    _sprinkle(fluid, [["Be",0.40,5,40],["Li",0.40,10,80],["B",0.35,5,50],["P",0.20,2,15]]);
    events = [{ step: Math.floor(_rU(25,40)), name: 'Crystallization', description: 'Melt differentiates', apply_fn: (c) => { c.temperature = Math.max(c.temperature - 120, 350); c.fluid.SiO2 += 2500; return 'Pegmatite melt differentiates; volatile-rich residual fluid floods the pocket.'; } }];
    steps = Math.floor(_rU(120, 180));
  } else if (archetype === 'supergene') {
    T = _rU(18, 55);
    fluid = new FluidChemistry({
      SiO2: _rU(20, 80), Ca: _rU(80, 200), CO3: _rU(60, 200),
      Fe: _rU(20, 60), Mn: _rU(2, 12),
      Zn: _rMaybe(0.7, _rU(40, 140)), S: _rU(20, 70),
      Cu: _rMaybe(0.6, _rU(10, 60)), Pb: _rMaybe(0.6, _rU(15, 60)),
      Mo: _rMaybe(0.4, _rU(5, 25)), As: _rMaybe(0.5, _rU(3, 18)),
      Cl: _rU(5, 30), F: _rU(1, 8),
      O2: _rU(1.5, 2.3), pH: _rU(5.8, 7.2),
    });
    _sprinkle(fluid, [["V",0.20,1,10],["Cr",0.15,0.5,6],["Co",0.15,0.5,5],["Cd",0.10,0.2,3]]);
    steps = Math.floor(_rU(140, 200));
  } else if (archetype === 'mvt') {
    T = _rU(90, 170);
    fluid = new FluidChemistry({
      SiO2: _rU(60, 180), Ca: _rU(250, 450), CO3: _rU(150, 280),
      Fe: _rU(15, 45), Mn: _rU(4, 12),
      Zn: _rU(100, 200), S: _rU(80, 150), Pb: _rU(20, 60),
      F: _rU(25, 55), pH: _rU(5.5, 7.0), O2: _rU(0, 0.4),
      salinity: _rU(15, 22),
    });
    _sprinkle(fluid, [["Ba",0.45,15,60],["Ag",0.25,1,8],["Cd",0.30,0.5,4]]);
    events = [{ step: Math.floor(_rU(20,35)), name: 'Fluid Mixing', description: 'Brine meets groundwater', apply_fn: event_fluid_mixing }];
    steps = Math.floor(_rU(100, 150));
  } else if (archetype === 'porphyry') {
    T = _rU(350, 520);
    fluid = new FluidChemistry({
      SiO2: _rU(500, 900), Ca: _rU(50, 150), CO3: _rU(30, 80),
      Fe: _rU(30, 80), Mn: _rU(1, 6), S: _rU(50, 120),
      Cu: _rU(60, 180), Mo: _rMaybe(0.7, _rU(10, 60)),
      Pb: _rU(10, 40), F: _rU(2, 12),
      O2: _rU(0, 0.3), pH: _rU(4.5, 6.2),
    });
    _sprinkle(fluid, [["Ag",0.30,1,8],["Au",0.15,0.1,2],["Bi",0.20,0.5,5],["W",0.15,0.5,6]]);
    events = [{ step: Math.floor(_rU(40,70)), name: 'Late Cu Pulse', description: 'Magmatic copper surge', apply_fn: event_copper_injection }];
    steps = Math.floor(_rU(120, 160));
  } else if (archetype === 'evaporite') {
    T = _rU(25, 58);
    fluid = new FluidChemistry({
      SiO2: _rU(15, 60), Ca: _rU(180, 350), CO3: _rU(40, 120),
      Fe: _rU(2, 20), Mn: _rU(0.5, 4), S: _rU(90, 180),
      O2: _rU(0.8, 1.8), pH: _rU(6.8, 7.8),
      salinity: _rU(5, 14),
    });
    _sprinkle(fluid, [["Sr",0.45,10,50],["Mg",0.50,20,80],["Cl",0.55,15,60]]);
    steps = Math.floor(_rU(160, 220));
  } else { // mixed
    T = _rU(280, 420);
    fluid = new FluidChemistry({
      SiO2: _rU(400, 700), Ca: _rU(100, 250), CO3: _rU(50, 180),
      Fe: _rU(20, 60), Mn: _rU(3, 12),
      Zn: _rU(40, 120), S: _rU(50, 120),
      Cu: _rMaybe(0.5, _rU(20, 80)), Pb: _rU(15, 50),
      F: _rU(8, 25), pH: _rU(5.5, 7.0), O2: _rU(0, 0.4),
    });
    _sprinkle(fluid, [["Ba",0.30,5,40],["Sr",0.20,3,20],["As",0.30,3,15],["Ag",0.20,0.5,5]]);
    events = [
      { step: Math.floor(_rU(30,50)), name: 'Primary Pulse', description: 'Metal-bearing fluid', apply_fn: event_fluid_pulse },
      { step: Math.floor(_rU(80,110)), name: 'Oxidizing Overprint', description: 'Meteoric water incursion', apply_fn: event_oxidation },
    ];
    steps = Math.floor(_rU(160, 220));
  }

  const conditions = new VugConditions({ temperature: T, pressure: _rU(0.3, 2.0), fluid });
  conditions._random_archetype = archetype;
  return { conditions, events, defaultSteps: steps, archetype };
}

// Render the pre-growth fluid as a markdown-style stats block.
function renderFluidTable(conditions) {
  const fluid = conditions.fluid;
  const T = conditions.temperature, P = conditions.pressure, pH = fluid.pH;
  const candidates = [
    'SiO2','Ca','CO3','Fe','Mn','Mg','Al','Ti','F','S','Cl',
    'Zn','Cu','Pb','Mo','U','Na','K','Ba','Sr','Cr','P','As',
    'V','W','Ag','Au','Bi','Sb','Ni','Co','B','Li','Be','Te','Se','Ge'
  ];
  const marquee = new Set(['Zn','Mo','Cu','Pb','W','U','Au','Ag','F','S','As']);
  const present = [], absent = [];
  for (const c of candidates) {
    const val = (fluid[c] || 0);
    if (val > 0.1) present.push([c, val]);
    else if (marquee.has(c)) absent.push(c);
  }
  present.sort((a, b) => b[1] - a[1]);
  const rows = ['| Element | ppm |', '|---------|-----|'];
  for (const [e, v] of present) {
    rows.push(`| ${e.padEnd(7)} | ${Math.round(v).toString().padStart(5)} |`);
  }
  const header = `🌡️ ${T.toFixed(0)}°C at ${P.toFixed(1)} kbar | pH ${pH.toFixed(1)}`;
  const abs = absent.length ? '\n\n' + absent.map(a => `No ${a}`).join('. ') + '. The absence is data too. 🪨' : '';
  return header + '\n\n' + rows.join('\n') + abs;
}

// Text-adventure preamble: second-person scene-setting BEFORE the simulation runs.
function narratePreamble(conditions, archetype) {
  const fluid = conditions.fluid;
  const T = conditions.temperature, P = conditions.pressure, pH = fluid.pH;
  const depth_km = Math.max(P * 1.0, 0.1);
  const have = (e, t = 0.5) => (fluid[e] || 0) > t;
  const ppm = (e) => (fluid[e] || 0);
  const paras = [];

  if (archetype === 'pegmatite') {
    paras.push(`You stand at the mouth of a cavity in cooling granite, deep underground. The rock around you bears the weight of ${depth_km.toFixed(1)} kilometers of crust. The air here isn't air — it's supercritical fluid, ${T.toFixed(0)} degrees, thick with dissolved metal.`);
    const dom = [];
    if (have('Fe', 10)) dom.push(`The walls gleam wet. Not with water — with iron-rich brine, ${ppm('Fe').toFixed(0)} parts per million, the color of old blood if you could see it through the heat shimmer.`);
    if (have('Cu', 5) && have('U', 10)) dom.push(`Copper threads through it at ${ppm('Cu').toFixed(0)} ppm, and uranium glows invisibly at ${ppm('U').toFixed(0)}.`);
    else if (have('U', 10)) dom.push(`Uranium glows invisibly at ${ppm('U').toFixed(0)} ppm — the cavity is faintly radioactive even before anything precipitates.`);
    else if (have('Cu', 5)) dom.push(`Copper threads through it at ${ppm('Cu').toFixed(0)} ppm, a warm-blooded metal in a hotter fluid.`);
    dom.push('The rock itself is warm to the touch. Hot, actually. Everything is hot.');
    paras.push(dom.join(' '));
    paras.push("This pocket formed when the granite cracked as it cooled. Magma doesn't shrink quietly — it fractures, and the last gasp of mineral-rich fluid fills every void. That's where you are now: inside that last gasp.");
    const rare = [];
    if (have('Li', 5)) rare.push(`lithium at ${ppm('Li').toFixed(0)} ppm`);
    if (have('Be', 3)) rare.push(`beryllium at ${ppm('Be').toFixed(0)}`);
    if (have('B', 5))  rare.push(`boron at ${ppm('B').toFixed(0)}`);
    if (have('P', 2))  rare.push(`phosphorus at ${ppm('P').toFixed(0)}`);
    if (rare.length) paras.push('The broth carries the signature of a rare-element pegmatite: ' + rare.join(', ') + '. These elements ride the same fluid path and rarely end up here by accident.');
    paras.push('Nothing has crystallized yet. The walls are bare granite, still dissolving at their margins, feeding K and Al and SiO₂ back into the mix. The fluid is oversaturated with possibility but nothing has tipped over the edge.');
    paras.push('The temperature is falling. Slowly, imperceptibly, but falling. And when it crosses the right threshold — when supersaturation finally exceeds nucleation energy — the first crystal will spark into existence on these bare walls.');
  } else if (archetype === 'hydrothermal') {
    paras.push(`You stand inside a vein cavity split open in foliated country rock, roughly ${depth_km.toFixed(1)} kilometers below daylight. The walls are dark — slate and quartzite shot through with older, gray-white quartz ribbons from earlier fluid pulses. The fluid filling this space is ${T.toFixed(0)} degrees; hot enough to sting, not quite to scald.`);
    const metal = [];
    if (have('Fe', 5)) metal.push(`Iron rides at ${ppm('Fe').toFixed(0)} ppm`);
    if (have('Mn', 2)) metal.push(`manganese at ${ppm('Mn').toFixed(0)}`);
    if (have('Zn', 5)) metal.push(`zinc at ${ppm('Zn').toFixed(0)}`);
    if (have('Cu', 5)) metal.push(`copper at ${ppm('Cu').toFixed(0)}`);
    if (have('Pb', 5)) metal.push(`lead at ${ppm('Pb').toFixed(0)}`);
    if (metal.length) paras.push(metal.join(', ') + `. Silica saturates the fluid at roughly ${ppm('SiO2').toFixed(0)} ppm — enough that a degree of cooling will start to crack out quartz.`);
    paras.push("This cavity opened when tectonic stress bent the host rock and a fracture propagated through. Fluid rose from deeper still, following the path of least resistance, and this particular pocket is where the flow eddied long enough to begin depositing. You're standing in a pause in the plumbing.");
    paras.push(`The walls are not idle. Hot fluid at pH ${pH.toFixed(1)} is slowly stripping Ca and CO₃ from carbonate seams in the country rock and feeding them into the broth. The vug is eating its way larger, one millimeter per millennium.`);
    paras.push("Somewhere upstream, the heat source is dying. This fluid has a finite window. When the broth cools below quartz's solubility curve, or pH climbs past calcite's, the cavity will begin to fill.");
  } else if (archetype === 'supergene') {
    paras.push(`You stand inside a cavity maybe ten meters below the ground surface, in the oxidized zone above the water table. The air is cool — ${T.toFixed(0)} degrees, barely warmer than the bedrock. Oxygen-rich rainwater has been percolating through for a long time, finding its way down through soil and fractures.`);
    paras.push(`The walls are stained. Rust-orange where iron oxidized, patchy green where copper lingered, dark where sulfides are still rotting quietly. Everything here has already been something else — the primary ore that made this zone interesting is being rewritten. The fluid carries those rewrites in solution: Zn ${ppm('Zn').toFixed(0)}, Pb ${ppm('Pb').toFixed(0)}, Cu ${ppm('Cu').toFixed(0)}, O₂ ${fluid.O2.toFixed(1)}.`);
    paras.push('This cavity is a negative-space museum. Oxygen-bearing groundwater attacked the softest parts of the primary ore, and the walls retreated. What remains is the argument that the ore is making with the atmosphere.');
    const sec = [];
    if (have('As', 3)) sec.push(`arsenic at ${ppm('As').toFixed(0)} ppm (from arsenopyrite dying somewhere upslope)`);
    if (have('Mo', 2)) sec.push(`molybdenum at ${ppm('Mo').toFixed(0)} (galena + molybdenite both oxidizing — wulfenite weather)`);
    if (have('Cl', 5)) sec.push(`chloride at ${ppm('Cl').toFixed(0)} (rain carrying salt air, or an evaporite signature)`);
    if (sec.length) paras.push('Trace hints: ' + sec.join('; ') + '.');
    paras.push('The fluid does not have to cool to precipitate here. It only has to change: shift its pH, lose its dissolved oxygen, or meet a fresh surface that will let secondary minerals nucleate. Any of those triggers will do.');
  } else if (archetype === 'mvt') {
    paras.push(`You stand inside a limestone dissolution cavity — karst, the geologist's word for rock with holes. The air is dark and faintly briny. ${T.toFixed(0)} degrees. The walls are pale Paleozoic limestone, still retreating wherever the brine touches them.`);
    paras.push(`The fluid here is a dense saline brine, roughly ${fluid.salinity.toFixed(0)}% NaCl, mineralized with base metals. Zinc at ${ppm('Zn').toFixed(0)} ppm, lead at ${ppm('Pb').toFixed(0)}, sulfur at ${ppm('S').toFixed(0)} — which in this environment means H₂S, the smell of rotten eggs if the brine weren't in the way.`);
    paras.push("This cavity was dissolved into limestone by an earlier, lower-pH brine. Then a second fluid arrived — the one you're standing in — bearing metals from a basin possibly hundreds of kilometers away. Two fluids met; this cavity is where they're still mixing.");
    const hints = [];
    if (have('F', 10)) hints.push(`Fluorite is already saturating (${ppm('F').toFixed(0)} ppm F)`);
    if (have('Ba', 10)) hints.push(`Barium at ${ppm('Ba').toFixed(0)} ppm is a barite near-miss`);
    if (have('Ag', 1)) hints.push(`Silver at ${ppm('Ag').toFixed(0)} hints at argentiferous galena to come`);
    if (hints.length) paras.push(hints.join('; ') + '.');
    paras.push("The limestone doesn't fight back. It dissolves peacefully, releasing Ca²⁺ and CO₃²⁻ into the broth. The vug grows slowly larger, and every Ca²⁺ released is a future growth band waiting to happen.");
  } else if (archetype === 'porphyry') {
    paras.push(`You stand inside a vug at the top of an intrusive porphyry stock — a shallow magma body that crystallized into a cupola of ore-bearing granite. Two kilometers of rock above you, daylight; immediately below, the still-magma continues to exhale metal-laden fluid. ${T.toFixed(0)} degrees here, ${P.toFixed(2)} kbar, on the borderline between supercritical and boiling.`);
    paras.push(`The fluid is metal-rich soup. Copper at ${ppm('Cu').toFixed(0)} ppm, iron at ${ppm('Fe').toFixed(0)}, sulfur at ${ppm('S').toFixed(0)}. The walls weep with it. Everything looks brassy and wet, and the whole pocket smells metallic even through the hiss of pressure.`);
    paras.push("This pocket is one of many. Porphyry systems are lacework: fractures, veins, stockwork cavities all feeding off the same cooling intrusion. Each vug is a local eddy where the flow paused long enough to deposit. You're in one of those eddies.");
    const porp = [];
    if (have('Mo', 5)) porp.push(`Molybdenum at ${ppm('Mo').toFixed(0)} ppm — the Mo pulse has already arrived; molybdenite is likely`);
    if (have('Au', 0.1)) porp.push(`gold at ${ppm('Au').toFixed(1)} (invisible in pyrite, traditionally)`);
    if (have('W', 0.3))  porp.push(`tungsten at ${ppm('W').toFixed(1)} (scheelite-adjacent)`);
    if (have('Bi', 0.3)) porp.push(`bismuth at ${ppm('Bi').toFixed(1)}`);
    if (porp.length) paras.push(porp.join('. ') + '.');
    paras.push("The walls are quartz-feldspar porphyry, potassically altered — the intrusion has already stained them pink with K-feldspar metasomatism. That alteration is older than the fluid you're standing in.");
    paras.push('The first sulfides will form within a few degrees of cooling. Pyrite nucleates fastest, then chalcopyrite settles onto it, then — if the late Mo pulse keeps delivering — molybdenite platelets.');
  } else if (archetype === 'evaporite') {
    paras.push(`You stand inside a crust that hasn't been buried deep. Barely below the surface. ${T.toFixed(0)} degrees — the sun warmed the ground this morning; by night it will cool again. The air is dry and still.`);
    paras.push(`The fluid is a brine so concentrated it feels like syrup. Calcium at ${ppm('Ca').toFixed(0)} ppm, sulfate (as S) at ${ppm('S').toFixed(0)}, with a pH of ${pH.toFixed(1)} — the chemistry of drying out. The walls are pale Ca-SO₄ with streaks of iron where earlier water rusted through.`);
    paras.push("A shallow pond sat here once. Inflow slowed, or stopped; evaporation didn't. The water retreated, concentrating its dissolved ions, until the first crystals formed on the sediment surface and the whole thing went from pond to crust. You're inside the crust.");
    const evap = [];
    if (have('Mg', 20)) evap.push(`Magnesium at ${ppm('Mg').toFixed(0)} ppm hints at dolomite-adjacent chemistry, or epsomite if the brine dries further`);
    if (have('Sr', 10)) evap.push(`Strontium at ${ppm('Sr').toFixed(0)} is a celestine near-miss — the missing SrSO₄ is the ghost sulfate`);
    if (have('Cl', 15)) evap.push(`Chloride at ${ppm('Cl').toFixed(0)} is halite-adjacent; one more round of drying and NaCl will crust out alongside the gypsum`);
    if (evap.length) paras.push(evap.join('. ') + '.');
    paras.push('There are no walls to dissolve here. The cavity IS the fluid, and the fluid is shrinking. The only question is how slowly it shrinks, and whether the temperature holds below 60°C long enough for selenite to finish what anhydrite might otherwise interrupt.');
  } else { // mixed
    paras.push(`You stand inside a pocket that has seen two fluids. The older one left behind mineral coatings on the walls — dull sulfides, margins slightly oxidized. The new fluid is different: cooler, more oxidizing. ${T.toFixed(0)} degrees, and the mix is unsettled.`);
    paras.push(`Metal is in solution: ${ppm('Zn').toFixed(0)} ppm Zn, ${ppm('Pb').toFixed(0)} ppm Pb, ${ppm('Fe').toFixed(0)} ppm Fe. O₂ is ${fluid.O2.toFixed(1)} — enough to attack the old sulfide coatings where it touches them.`);
    paras.push('This is an overprint. A pocket that once equilibrated with reducing brine is being re-visited by something newer. Two timescales meet here: the older paragenesis frozen in the walls, and the new one about to begin on top of it.');
    paras.push("The walls are dissolving where the new fluid is undersaturated, and re-precipitating where it's saturated. You can watch both processes happen at once, on different parts of the same crystal — if you have patience measured in centuries.");
    paras.push("What grows next will tell you which fluid won. Secondary minerals on primary — that's the signature of overprint. The vug is writing its second chapter.");
  }

  return paras.join('\n\n') + '\n\n' + renderFluidTable(conditions);
}

function narrateDiscovery(sim, archetype) {
  const grown = sim.crystals.filter(c => c.total_growth_um > 0);
  if (!grown.length) {
    return "*Discovery tag —* The cavity was opened, and nothing had grown. Sometimes that is the whole story: a chamber where the fluid arrived, lingered, and left without leaving a signature.";
  }
  const fluid = sim.conditions.fluid;
  const setting = ARCHETYPE_SETTING[archetype] || "an unnamed cavity";
  const mineralSize = {};
  for (const c of grown) {
    mineralSize[c.mineral] = Math.max(mineralSize[c.mineral] || 0, c.c_length_mm);
  }
  const bySize = Object.entries(mineralSize).sort((a, b) => b[1] - a[1]);
  const assemblage = new Set(bySize.map(([m]) => m));

  const parts = [`*Discovery tag —* This specimen was recovered from ${setting}.`];

  if (bySize.length === 1) {
    const [primary, psize] = bySize[0];
    parts.push(`The pocket is a single-mineral chamber: ${primary} reached ${psize.toFixed(1)} mm and claimed the whole vug.`);
  } else {
    const [primary, psize] = bySize[0];
    const subs = bySize.slice(1, 4).map(([m]) => m).join(', ');
    parts.push(`The dominant mineral is ${primary} (${psize.toFixed(1)} mm), with subordinate ${subs}.`);
  }

  if (assemblage.has('goethite') && sim.crystals.some(c => c.mineral === 'goethite' && c.position.includes('pseudomorph'))) {
    parts.push('Goethite boxwork pseudomorphs after pyrite record a weathering front that moved through the vug long after the primary sulfides formed.');
  }
  if (assemblage.has('wulfenite')) {
    parts.push('The wulfenite is the prize — bright tablets that only formed because both galena and molybdenite oxidized together (Seo et al. 2012).');
  }
  if (assemblage.has('malachite') && assemblage.has('chalcopyrite')) {
    parts.push('A malachite-after-chalcopyrite pathway is evident: the copper walked out of the sulfide and met carbonate on its way to the wall.');
  }
  if (assemblage.has('uraninite') && assemblage.has('quartz')) {
    parts.push('The quartz near the uraninite carries alpha-damage; if this specimen sat in its cradle long enough, the clear crystals darkened into smoky.');
  }
  if (assemblage.has('selenite') && archetype === 'evaporite') {
    parts.push('The selenite blades are the clock: they grew slowly at a steady sub-60°C, the Naica chemistry in miniature.');
  }
  if (assemblage.has('adamite') && assemblage.has('mimetite')) {
    parts.push('Adamite and mimetite together place this pocket near an arsenopyrite weathering body — Zn and Pb fighting over the same arsenate.');
  }

  const traces = [];
  if ((fluid.Ba || 0) > 15) traces.push("The fluid carried enough Ba that barite was a near miss — look in the matrix for the missing sulfate");
  if ((fluid.Sr || 0) > 15) traces.push("Strontium above typical MVT values suggests a celestine-bearing parent brine somewhere upstream");
  if ((fluid.Li || 0) > 20 || (fluid.B || 0) > 20 || (fluid.Be || 0) > 15) traces.push("Trace Li/B/Be hints that the pegmatite parent fluid ran toward the rare-element side of the LCT family");
  if ((fluid.Au || 0) > 0.5) traces.push("Invisible gold in the pyrite is likely — the fluid ran Au-enriched even if no native gold crystallized here");
  if ((fluid.Ag || 0) > 3) traces.push("The galena is argentiferous; a thin-section microprobe traverse would light up with silver");
  if ((fluid.Cr || 0) > 3) traces.push("Chromium in the fluid would have shifted wulfenite toward the classic blood-orange Red Cloud hue");
  if ((fluid.Co || 0) > 1) traces.push("Cobalt traces would pink up any smithsonite that grew here");
  if ((fluid.Mg || 0) > 30 && archetype === 'evaporite') traces.push("High Mg suggests dolomite-adjacent chemistry; epsomite could bloom if the crust evaporated a bit further");
  if (traces.length) {
    parts.push(traces[0] + '.');
    if (traces.length > 1) parts.push('Secondary traces: ' + traces.slice(1, 3).join('; ') + '.');
  }

  let locality = null;
  const has = (...ms) => ms.every(m => assemblage.has(m));
  if (has('adamite','goethite') || has('mimetite','goethite'))  locality = "Ojuela Mine at Mapimí, Durango — the classic oxidation-zone type locality";
  else if (assemblage.has('wulfenite') && assemblage.has('hematite')) locality = "Los Lamentos or Red Cloud Mine — the wulfenite capitals";
  else if (has('sphalerite','galena','fluorite'))              locality = "Cave-in-Rock, Illinois — MVT paragenesis at its textbook best";
  else if (has('chalcopyrite','pyrite','quartz') && archetype === 'porphyry') locality = "Bingham Canyon or Butte — porphyry copper's ground truth";
  else if (has('uraninite','feldspar'))                        locality = "the Bancroft district, Ontario — uraninite-bearing pegmatites";
  else if (has('calcite','sphalerite','galena'))               locality = "the Tri-State district (Joplin, Missouri)";
  if (locality) parts.push(`The assemblage recalls ${locality}.`);

  const closings = [
    "What the rock held, the rock now reveals.",
    "The fluid is long gone; only the crystals remember.",
    "Every face was drawn in slow ink, one layer at a time.",
    "This is what the dark grew when no one was watching.",
    "The cavity is a museum and a letter.",
  ];
  parts.push(closings[Math.floor(rng.uniform(0, closings.length))]);
  return parts.join(' ');
}

let randomSim = null;
let randomSimArchetype = null;
let randomSimSeed = null;

function runRandomVugg() {
  const out = document.getElementById('random-output');
  if (!out) return;
  const seedRaw = document.getElementById('random-seed').value.trim();
  const seed = seedRaw && !isNaN(parseInt(seedRaw, 10)) ? parseInt(seedRaw, 10) : Date.now();
  rng = new SeededRandom(seed);
  const forced = document.getElementById('random-archetype').value;

  const scen = buildRandomScenario(forced);

  // Capture the pre-growth preamble BEFORE the simulation mutates the fluid.
  const preamble = narratePreamble(scen.conditions, scen.archetype);

  const sim = new VugSimulator(scen.conditions, scen.events);
  for (let i = 0; i < scen.defaultSteps; i++) sim.run_step();
  randomSim = sim;
  randomSimArchetype = scen.archetype;
  randomSimSeed = seed;

  const discovery = narrateDiscovery(sim, scen.archetype);
  const full = sim.narrate ? sim.narrate() : '';

  const crystalList = sim.crystals
    .filter(c => c.total_growth_um > 0)
    .sort((a, b) => b.c_length_mm - a.c_length_mm)
    .map(c => `  • ${c.mineral} #${c.crystal_id} — ${c.c_length_mm.toFixed(2)} mm, ${c.habit}${c.twinned ? ', twinned (' + c.twin_law + ')' : ''}`)
    .join('\n');

  const header = `═══ 🎲 Random Vugg — archetype: ${scen.archetype} — seed: ${seed} ═══\n` +
                 `ran ${scen.defaultSteps} steps · events: ${scen.events.length}\n`;
  const rule   = '─'.repeat(70);
  const preambleBlock = `\n┈┈┈┈┈ PREAMBLE ┈┈┈┈┈\n\n${preamble}\n\n${rule}\n`;
  const inventory = crystalList ? `\nCRYSTALS\n${crystalList}\n\n${rule}\n` : `\nCRYSTALS\n  (nothing nucleated)\n\n${rule}\n`;
  const discoveryBlock = `\n${discovery}\n\n${rule}\n`;
  const fullBlock = full ? `\n${full}\n` : '';

  out.textContent = header + preambleBlock + inventory + discoveryBlock + fullBlock;
  out.scrollTop = 0;

  // Build interactive inventory below the text output (per-crystal Collect).
  renderRandomInventory();

  // Final wall state for the topo map.
  if (typeof topoRender === 'function') topoRender();
}

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

// ============================================================
// BROTH CONTROL PANEL
// ============================================================

let brothSnapshots = [];

function toggleBrothPanel() {
  const toggle = document.getElementById('broth-toggle');
  const body = document.getElementById('broth-body');
  toggle.classList.toggle('open');
  body.classList.toggle('open');
}

// Map slider ids to sim state paths
const BROTH_MAP = {
  temp:  { get: () => fortressSim.conditions.temperature,     set: v => fortressSim.conditions.temperature = v,     fmt: v => v.toFixed(0) + ' °C',  parse: v => parseFloat(v) },
  sio2:  { get: () => fortressSim.conditions.fluid.SiO2,      set: v => fortressSim.conditions.fluid.SiO2 = v,      fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ca:    { get: () => fortressSim.conditions.fluid.Ca,         set: v => fortressSim.conditions.fluid.Ca = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  co3:   { get: () => fortressSim.conditions.fluid.CO3,        set: v => fortressSim.conditions.fluid.CO3 = v,        fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ph:    { get: () => fortressSim.conditions.fluid.pH,         set: v => fortressSim.conditions.fluid.pH = v,         fmt: v => v.toFixed(1),           parse: v => parseFloat(v) / 10, toSlider: v => Math.round(v * 10) },
  fe:    { get: () => fortressSim.conditions.fluid.Fe,         set: v => fortressSim.conditions.fluid.Fe = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  mn:    { get: () => fortressSim.conditions.fluid.Mn,         set: v => fortressSim.conditions.fluid.Mn = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  cu:    { get: () => fortressSim.conditions.fluid.Cu,         set: v => fortressSim.conditions.fluid.Cu = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  zn:    { get: () => fortressSim.conditions.fluid.Zn,         set: v => fortressSim.conditions.fluid.Zn = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  s:     { get: () => fortressSim.conditions.fluid.S,          set: v => fortressSim.conditions.fluid.S = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  f:     { get: () => fortressSim.conditions.fluid.F,          set: v => fortressSim.conditions.fluid.F = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  o2:    { get: () => fortressSim.conditions.fluid.O2,         set: v => fortressSim.conditions.fluid.O2 = v,         fmt: v => v.toFixed(1),           parse: v => parseFloat(v) / 10, toSlider: v => Math.round(v * 10) },
  flow:  { get: () => fortressSim.conditions.flow_rate,        set: v => fortressSim.conditions.flow_rate = v,        fmt: v => v.toFixed(1),           parse: v => parseFloat(v) / 10, toSlider: v => Math.round(v * 10) },
  u:     { get: () => fortressSim.conditions.fluid.U,          set: v => fortressSim.conditions.fluid.U = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  pb:    { get: () => fortressSim.conditions.fluid.Pb,         set: v => fortressSim.conditions.fluid.Pb = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  mo:    { get: () => fortressSim.conditions.fluid.Mo,         set: v => fortressSim.conditions.fluid.Mo = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  al:    { get: () => fortressSim.conditions.fluid.Al,         set: v => fortressSim.conditions.fluid.Al = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  k:     { get: () => fortressSim.conditions.fluid.K,          set: v => fortressSim.conditions.fluid.K = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  na:    { get: () => fortressSim.conditions.fluid.Na,         set: v => fortressSim.conditions.fluid.Na = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  mg:    { get: () => fortressSim.conditions.fluid.Mg,         set: v => fortressSim.conditions.fluid.Mg = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ba:    { get: () => fortressSim.conditions.fluid.Ba,         set: v => fortressSim.conditions.fluid.Ba = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  sr:    { get: () => fortressSim.conditions.fluid.Sr,         set: v => fortressSim.conditions.fluid.Sr = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  cr:    { get: () => fortressSim.conditions.fluid.Cr,         set: v => fortressSim.conditions.fluid.Cr = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  p:     { get: () => fortressSim.conditions.fluid.P,          set: v => fortressSim.conditions.fluid.P = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  as:    { get: () => fortressSim.conditions.fluid.As,         set: v => fortressSim.conditions.fluid.As = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  v:     { get: () => fortressSim.conditions.fluid.V,          set: v => fortressSim.conditions.fluid.V = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  w:     { get: () => fortressSim.conditions.fluid.W,          set: v => fortressSim.conditions.fluid.W = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ag:    { get: () => fortressSim.conditions.fluid.Ag,         set: v => fortressSim.conditions.fluid.Ag = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  bi:    { get: () => fortressSim.conditions.fluid.Bi,         set: v => fortressSim.conditions.fluid.Bi = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  sb:    { get: () => fortressSim.conditions.fluid.Sb,         set: v => fortressSim.conditions.fluid.Sb = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ni:    { get: () => fortressSim.conditions.fluid.Ni,         set: v => fortressSim.conditions.fluid.Ni = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  co:    { get: () => fortressSim.conditions.fluid.Co,         set: v => fortressSim.conditions.fluid.Co = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  b:     { get: () => fortressSim.conditions.fluid.B,          set: v => fortressSim.conditions.fluid.B = v,          fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  li:    { get: () => fortressSim.conditions.fluid.Li,         set: v => fortressSim.conditions.fluid.Li = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  be:    { get: () => fortressSim.conditions.fluid.Be,         set: v => fortressSim.conditions.fluid.Be = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  cl:    { get: () => fortressSim.conditions.fluid.Cl,         set: v => fortressSim.conditions.fluid.Cl = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  te:    { get: () => fortressSim.conditions.fluid.Te,         set: v => fortressSim.conditions.fluid.Te = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  se:    { get: () => fortressSim.conditions.fluid.Se,         set: v => fortressSim.conditions.fluid.Se = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
  ge:    { get: () => fortressSim.conditions.fluid.Ge,         set: v => fortressSim.conditions.fluid.Ge = v,         fmt: v => v.toFixed(0) + ' ppm',  parse: v => parseFloat(v) },
};

function setBrothValue(key, sliderVal) {
  if (!fortressSim || !fortressActive) return;
  const m = BROTH_MAP[key];
  const realVal = m.parse(sliderVal);
  m.set(realVal);
  document.getElementById('broth-' + key + '-val').textContent = m.fmt(realVal);
  // Also update the status bar live
  updateFortressStatus();
}

function syncBrothSliders() {
  if (!fortressSim) return;
  for (const [key, m] of Object.entries(BROTH_MAP)) {
    const val = m.get();
    const sliderVal = m.toSlider ? m.toSlider(val) : Math.round(val);
    const slider = document.getElementById('broth-' + key);
    if (slider) {
      // Clamp to slider range
      const clamped = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), sliderVal));
      slider.value = clamped;
    }
    const valEl = document.getElementById('broth-' + key + '-val');
    if (valEl) valEl.textContent = m.fmt(val);
  }
}

function takeBrothSnapshot() {
  if (!fortressSim) return;
  const name = prompt('Name this broth snapshot:', 'Step ' + fortressSim.step);
  if (!name) return;

  const snapshot = { name };
  for (const [key, m] of Object.entries(BROTH_MAP)) {
    snapshot[key] = m.get();
  }
  brothSnapshots.push(snapshot);

  // Add button to snapshot row
  const row = document.getElementById('broth-snapshots');
  const btn = document.createElement('button');
  btn.className = 'broth-preset-btn';
  btn.textContent = name;
  btn.title = 'Restore: ' + name;
  const idx = brothSnapshots.length - 1;
  btn.onclick = () => restoreBrothSnapshot(idx);
  row.appendChild(btn);
}

function restoreBrothSnapshot(idx) {
  if (!fortressSim || !fortressActive) return;
  const snap = brothSnapshots[idx];
  if (!snap) return;
  for (const [key, m] of Object.entries(BROTH_MAP)) {
    if (snap[key] !== undefined) m.set(snap[key]);
  }
  syncBrothSliders();
  updateFortressStatus();
}

// Handle Escape key for zone modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeZoneModal();
});

// ============================================================
// RECORD GROOVE MODE — The Turntable
// ============================================================

let grooveCrystal = null;
let groovePlaying = false;
let grooveAnimFrame = null;
let grooveProgress = 0; // 0..1 (fraction of zones drawn)
let grooveSpeed = 8; // zones per second
let grooveDensity = 10; // steps per revolution
let grooveAmplitude = 40; // max wobble in px
let grooveLastTime = 0;
let groovePoints = []; // precomputed [{x,y,zone,angle,radius}]

// Parameter axes — evenly spaced around 360°
const GROOVE_AXES = [
  { name: 'Temperature', key: 'temperature', color: '#ff8844' },
  { name: 'Growth rate', key: 'thickness_um', color: '#50e0c0' },
  { name: 'Fe', key: 'trace_Fe', color: '#cc6644' },
  { name: 'Mn', key: 'trace_Mn', color: '#ffaa44' },
  { name: 'Al', key: 'trace_Al', color: '#8888cc' },
  { name: 'Ti', key: 'trace_Ti', color: '#88cc88' },
];

// Loaded-from-collection stand-ins, set by playCollectedInGroove. Takes
// priority over live sims when present so the user actually sees the
// crystal they asked for.
let grooveCollectionCrystals = null;

function grooveGetAvailableCrystals() {
  // Collection-loaded crystals take priority — user explicitly requested them.
  if (grooveCollectionCrystals && grooveCollectionCrystals.length) {
    return { crystals: grooveCollectionCrystals, source: 'Library' };
  }
  // Otherwise prefer idle (Zen Mode), then fortress, then legends, then random.
  if (idleSim && idleSim.crystals && idleSim.crystals.length) {
    return { sim: idleSim, crystals: idleSim.crystals, source: 'Zen' };
  }
  if (fortressSim && fortressSim.crystals && fortressSim.crystals.length) {
    return { sim: fortressSim, crystals: fortressSim.crystals, source: 'Creative' };
  }
  if (legendsSim && legendsSim.crystals && legendsSim.crystals.length) {
    return { sim: legendsSim, crystals: legendsSim.crystals, source: 'Simulation' };
  }
  if (randomSim && randomSim.crystals && randomSim.crystals.length) {
    return { sim: randomSim, crystals: randomSim.crystals, source: 'Random Vugg' };
  }
  return null;
}

// Called by the ▶ Play button on each Library collected row.
// Stashes the reconstructed stand-in, switches to Groove, and selects it.
function playCollectedInGroove(id) {
  const rec = loadCrystals().find(c => c.id === id);
  if (!rec) { alert('Collected crystal not found.'); return; }
  if (!rec.zones || !rec.zones.length) {
    alert('This specimen was collected before zone data was saved, so the Record Player has nothing to spiral. Collect a fresh one to play it.');
    return;
  }
  const stand = reconstructCrystalFromRecord(rec);
  stand._libraryName = rec.name;
  grooveCollectionCrystals = [stand];
  grooveCrystal = stand;
  switchMode('groove');
}

// When leaving Groove, drop the collection pointer so live sims show up
// again next time. Called from switchMode.
function clearGrooveCollection() {
  grooveCollectionCrystals = null;
}

function groovePopulateCrystals() {
  const select = document.getElementById('groove-crystal-select');
  const noData = document.getElementById('groove-no-data');
  const canvas = document.getElementById('groove-canvas');
  const info = document.getElementById('groove-crystal-info');

  select.innerHTML = '';
  const data = grooveGetAvailableCrystals();

  if (!data) {
    select.innerHTML = '<option value="">— no crystals —</option>';
    noData.style.display = 'block';
    canvas.style.display = 'none';
    info.style.display = 'none';
    return;
  }

  for (let i = 0; i < data.crystals.length; i++) {
    const c = data.crystals[i];
    const opt = document.createElement('option');
    opt.value = i;
    let label = `${capitalize(c.mineral)} #${c.crystal_id} — ${c.c_length_mm.toFixed(1)}mm, ${c.zones.length} zones`;
    if (c.twinned) label += ' ⟁';
    opt.textContent = label;
    select.appendChild(opt);
  }

  // Auto-select first or the one we came from modal with
  if (grooveCrystal && data.crystals.includes(grooveCrystal)) {
    select.value = data.crystals.indexOf(grooveCrystal);
  } else {
    select.value = 0;
  }
  grooveSelectCrystal();
}

function grooveSelectCrystal() {
  const select = document.getElementById('groove-crystal-select');
  const noData = document.getElementById('groove-no-data');
  const canvas = document.getElementById('groove-canvas');
  const info = document.getElementById('groove-crystal-info');
  const data = grooveGetAvailableCrystals();

  if (!data || select.value === '') {
    noData.style.display = 'block';
    canvas.style.display = 'none';
    info.style.display = 'none';
    return;
  }

  const idx = parseInt(select.value);
  grooveCrystal = data.crystals[idx];
  noData.style.display = 'none';
  canvas.style.display = 'block';

  // Show crystal info
  info.style.display = 'block';
  const libraryName = grooveCrystal._libraryName
    ? `<span class="gci-mineral">“${grooveCrystal._libraryName}”</span><br>`
    : '';
  let infoHtml = libraryName + `<span class="gci-mineral">${grooveCrystal.mineral} #${grooveCrystal.crystal_id}</span>`;
  infoHtml += ` — ${grooveCrystal.describe_morphology()}`;
  infoHtml += `<br>${grooveCrystal.zones.length} growth zones, nucleated step ${grooveCrystal.nucleation_step} at ${grooveCrystal.nucleation_temp.toFixed(0)}°C`;
  if (grooveCrystal.twinned) infoHtml += `<br><span style="color:#bb66ee">⟁ ${grooveCrystal.twin_law}</span>`;
  infoHtml += `<br>Fluorescence: ${grooveCrystal.predict_fluorescence()}`;
  infoHtml += `<br><span style="color:#5a4a30;font-size:0.65rem">Source: ${data.source}${data.source === 'Library' ? ' collection' : ' mode'}</span>`;
  info.innerHTML = infoHtml;

  // Reset playback
  grooveStop();
  grooveProgress = 0;
  grooveComputePoints();
  grooveDraw();
}

function grooveComputePoints() {
  groovePoints = [];
  if (!grooveCrystal || !grooveCrystal.zones.length) return;

  const zones = grooveCrystal.zones;
  const n = zones.length;

  // Compute normalization ranges
  const temps = zones.map(z => z.temperature);
  const thicks = zones.map(z => Math.abs(z.thickness_um));
  const fes = zones.map(z => z.trace_Fe);
  const mns = zones.map(z => z.trace_Mn);
  const als = zones.map(z => z.trace_Al);
  const tis = zones.map(z => z.trace_Ti);

  const norm = (arr) => {
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    const range = mx - mn || 1;
    return arr.map(v => (v - mn) / range);
  };

  const nTemp = norm(temps);
  const nThick = norm(thicks);
  const nFe = norm(fes);
  const nMn = norm(mns);
  const nAl = norm(als);
  const nTi = norm(tis);

  const cx = 320, cy = 320;
  const maxRadius = 280;
  const minRadius = 30;
  const stepsPerRev = grooveDensity;

  for (let i = 0; i < n; i++) {
    const z = zones[i];
    const t = i / Math.max(n - 1, 1); // 0..1 through the crystal
    const baseRadius = minRadius + t * (maxRadius - minRadius);
    const angle = (i / stepsPerRev) * Math.PI * 2;

    // Compute wobble: each parameter modulates radius independently
    // based on which "sector" of the spiral we're in (angle mod axes)
    const nAxes = GROOVE_AXES.length;
    const vals = [nTemp[i], nThick[i], nFe[i], nMn[i], nAl[i], nTi[i]];

    // Method: composite wobble from all parameters
    // Each axis contributes a sine wave at its own frequency,
    // amplitude proportional to that parameter's normalized value.
    // This creates a complex waveform — the "sound" of the crystal.
    let wobbleR = 0;
    for (let a = 0; a < nAxes; a++) {
      // Each axis oscillates at a different frequency along the spiral
      const freq = a + 1; // frequencies 1,2,3,4,5,6
      const phase = (a / nAxes) * Math.PI * 2;
      // Deviation from 0.5 (center) — amplifies CHANGE, not absolute value
      const deviation = (vals[a] - 0.5) * 2; // range -1 to 1
      wobbleR += deviation * Math.sin(angle * freq + phase) * grooveAmplitude * 0.4;
    }
    const wobbleX = wobbleR * Math.cos(angle + Math.PI / 2);
    const wobbleY = wobbleR * Math.sin(angle + Math.PI / 2);

    // Dissolution zones dip inward
    let dissolutionDip = 0;
    if (z.thickness_um < 0) {
      dissolutionDip = -Math.min(Math.abs(z.thickness_um) * 0.5, grooveAmplitude * 0.8);
    }

    const r = baseRadius + dissolutionDip;
    const x = cx + (r * Math.cos(angle)) + wobbleX;
    const y = cy + (r * Math.sin(angle)) + wobbleY;

    groovePoints.push({
      x, y, zone: z, index: i, angle, radius: r,
      baseRadius, t,
      vals,
      isDissolution: z.thickness_um < 0,
      isPhantom: z.is_phantom,
      hasInclusion: z.fluid_inclusion,
      isTwin: !!(z.note && z.note.toLowerCase().includes('twin')),
    });
  }
}

function grooveDraw() {
  const canvas = document.getElementById('groove-canvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  // Clear
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, w, h);

  if (!groovePoints.length) return;

  const drawUpTo = Math.max(1, Math.floor(grooveProgress * groovePoints.length));

  // Draw axis guides (faint)
  const cx = 320, cy = 320;
  ctx.globalAlpha = 0.08;
  for (let a = 0; a < GROOVE_AXES.length; a++) {
    const axisAngle = (a / GROOVE_AXES.length) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 300 * Math.cos(axisAngle), cy + 300 * Math.sin(axisAngle));
    ctx.strokeStyle = GROOVE_AXES[a].color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Draw the groove — Rainbow Mellan: six parallel lanes running side by side
  // along the spiral, each pulsing in width based on its parameter's prominence.
  // No overlap. All six visible simultaneously like a ribbon cable.
  if (drawUpTo >= 2) {
    const nAxes = GROOVE_AXES.length;
    const laneSpacing = 2.5; // px between lane centers
    const totalRibbonWidth = (nAxes - 1) * laneSpacing;
    const maxLineWidth = 4;
    const minLineWidth = 0.3;

    // For each segment, compute the perpendicular direction to offset lanes
    for (let i = 0; i < drawUpTo - 1; i++) {
      const p1 = groovePoints[i];
      const p2 = groovePoints[Math.min(groovePoints.length - 1, i + 1)];

      // Direction vector along the groove
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // Perpendicular (normal) — rotate 90° CCW
      const nx = -dy / len;
      const ny = dx / len;

      // Bezier control points (same Catmull-Rom as before)
      const p0 = groovePoints[Math.max(0, i - 1)];
      const p3 = groovePoints[Math.min(groovePoints.length - 1, i + 2)];
      const tension = 0.3;

      // Draw each lane offset perpendicular to the groove direction
      for (let a = 0; a < nAxes; a++) {
        const laneOffset = (a - (nAxes - 1) / 2) * laneSpacing; // centered ribbon
        const ox = nx * laneOffset;
        const oy = ny * laneOffset;

        const val = p1.vals[a];
        // Cube root curve: quiet parameters stay visible, dominant ones still swell
        const width = minLineWidth + Math.cbrt(val) * (maxLineWidth - minLineWidth);
        if (width < 0.15) continue;

        // Offset all four control points by the same perpendicular
        const s1x = p1.x + ox, s1y = p1.y + oy;
        const s2x = p2.x + ox, s2y = p2.y + oy;
        const cp1x = s1x + (p2.x + ox - (p0.x + ox)) * tension;
        const cp1y = s1y + (p2.y + oy - (p0.y + oy)) * tension;
        const cp2x = s2x - (p3.x + ox - (p1.x + ox)) * tension;
        const cp2y = s2y - (p3.y + oy - (p1.y + oy)) * tension;

        ctx.beginPath();
        ctx.moveTo(s1x, s1y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, s2x, s2y);
        ctx.strokeStyle = GROOVE_AXES[a].color;
        ctx.globalAlpha = 0.4 + val * 0.6;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Draw dissolution segments in red (overlay)
  for (let i = 1; i < drawUpTo; i++) {
    if (groovePoints[i].isDissolution) {
      ctx.beginPath();
      ctx.moveTo(groovePoints[i - 1].x, groovePoints[i - 1].y);
      ctx.lineTo(groovePoints[i].x, groovePoints[i].y);
      ctx.strokeStyle = '#cc4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(204, 68, 68, 0.5)';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // Draw phantom boundaries
  for (let i = 0; i < drawUpTo; i++) {
    if (groovePoints[i].isPhantom) {
      const p = groovePoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90, 74, 48, 0.8)';
      ctx.fill();
      ctx.strokeStyle = '#5a4a30';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Draw fluid inclusions as teal dots
  for (let i = 0; i < drawUpTo; i++) {
    if (groovePoints[i].hasInclusion) {
      const p = groovePoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#50e0c0';
      ctx.shadowColor = 'rgba(80, 224, 192, 0.6)';
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Draw twin events as purple flashes
  for (let i = 0; i < drawUpTo; i++) {
    if (groovePoints[i].isTwin) {
      const p = groovePoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#bb66ee';
      ctx.shadowColor = 'rgba(187, 102, 238, 0.7)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Cross marker
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y);
      ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4);
      ctx.strokeStyle = '#ddaaff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Draw center dot (nucleation point)
  const center = groovePoints[0];
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#f0c050';
  ctx.shadowColor = 'rgba(240, 192, 80, 0.6)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw needle (current position during playback)
  if (groovePlaying || grooveProgress > 0 && grooveProgress < 1) {
    const needleIdx = Math.min(drawUpTo - 1, groovePoints.length - 1);
    if (needleIdx >= 0) {
      const np = groovePoints[needleIdx];
      ctx.beginPath();
      ctx.arc(np.x, np.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#f0c050';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(np.x, np.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c050';
      ctx.fill();
    }
  }

  // Label: zone count / total
  ctx.fillStyle = '#5a4a30';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Zone ${drawUpTo} / ${groovePoints.length}`, w - 10, h - 10);

  // Label nucleation
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7a40';
  ctx.font = '10px monospace';
  ctx.fillText('nucleation', center.x, center.y + 16);
}

function grooveTogglePlay() {
  if (groovePlaying) {
    grooveStop();
  } else {
    groovePlay();
  }
}

function groovePlay() {
  if (!groovePoints.length) return;
  if (grooveProgress >= 1) grooveProgress = 0;
  groovePlaying = true;
  document.getElementById('groove-play-btn').textContent = '⏸ Pause';
  document.getElementById('groove-play-btn').classList.add('groove-playing');
  grooveLastTime = performance.now();
  grooveAnimate();
}

function grooveStop() {
  groovePlaying = false;
  if (grooveAnimFrame) cancelAnimationFrame(grooveAnimFrame);
  grooveAnimFrame = null;
  const btn = document.getElementById('groove-play-btn');
  if (btn) {
    btn.textContent = '▶ Play';
    btn.classList.remove('groove-playing');
  }
}

function grooveReset() {
  grooveStop();
  grooveProgress = 0;
  grooveDraw();
}

function grooveAnimate(now) {
  if (!groovePlaying) return;
  if (!now) now = performance.now();
  const dt = (now - grooveLastTime) / 1000;
  grooveLastTime = now;

  const zonesPerSec = grooveSpeed;
  const increment = (zonesPerSec * dt) / Math.max(groovePoints.length, 1);
  grooveProgress = Math.min(1, grooveProgress + increment);

  grooveDraw();

  if (grooveProgress >= 1) {
    grooveStop();
    return;
  }

  grooveAnimFrame = requestAnimationFrame(grooveAnimate);
}

function grooveUpdateDensity(val) {
  grooveDensity = parseInt(val);
  document.getElementById('groove-density-val').textContent = `1 rev / ${val} steps`;
  grooveComputePoints();
  grooveDraw();
}

function grooveUpdateAmplitude(val) {
  grooveAmplitude = parseInt(val);
  document.getElementById('groove-amplitude-val').textContent = `${val} px`;
  grooveComputePoints();
  grooveDraw();
}

function grooveUpdateSpeed(val) {
  grooveSpeed = parseInt(val);
  document.getElementById('groove-speed-val').textContent = `${val} zones/sec`;
}

function grooveFromModal() {
  if (grooveModalCrystal) {
    grooveCrystal = grooveModalCrystal;
    closeZoneModal();
    switchMode('groove');
  }
}

// ---- Detail Strip: click-to-unroll ----
let detailDragStart = null;
let detailSelectedRange = null;

function findNearestZone(mx, my) {
  const drawUpTo = Math.max(1, Math.floor(grooveProgress * groovePoints.length));
  let bestDist = 25;
  let bestIdx = -1;
  for (let i = 0; i < drawUpTo; i++) {
    const p = groovePoints[i];
    const dx = p.x - mx, dy = p.y - my;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function grooveCanvasCoords(e) {
  const canvas = document.getElementById('groove-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

(function() {
  const canvas = document.getElementById('groove-canvas');

  canvas.addEventListener('mousedown', function(e) {
    const {x, y} = grooveCanvasCoords(e);
    const idx = findNearestZone(x, y);
    if (idx >= 0) {
      detailDragStart = idx;
    }
  });

  canvas.addEventListener('mouseup', function(e) {
    if (detailDragStart === null) return;
    const {x, y} = grooveCanvasCoords(e);
    let endIdx = findNearestZone(x, y);
    if (endIdx < 0) endIdx = detailDragStart;

    const lo = Math.max(0, Math.min(detailDragStart, endIdx) - 2);
    const hi = Math.min(groovePoints.length - 1, Math.max(detailDragStart, endIdx) + 2);

    // If single click (no drag), show ±5 zones around the click
    if (lo === hi || Math.abs(detailDragStart - endIdx) <= 1) {
      const center = detailDragStart;
      const radius = 5;
      detailSelectedRange = [
        Math.max(0, center - radius),
        Math.min(groovePoints.length - 1, center + radius)
      ];
    } else {
      detailSelectedRange = [lo, hi];
    }

    detailDragStart = null;
    renderDetailStrip(detailSelectedRange[0], detailSelectedRange[1]);
  });
})();

// ─────────────────────────────────────────────────────────────────────────
// Shared zone-bar-graph renderer.
//
// Round-7-dialogue Phase 1: paints a horizontal bar graph for a zone array,
// one vertical column per zone, sub-divided into GROOVE_AXES horizontal
// lanes (Temperature, Growth rate, Fe/Mn/Al/Ti trace). Value per lane is
// range-normalized for visual contrast; alpha 0.2 + 0.7×normalized.
//
// Time reads left (nucleation) → right (rim). Lane order follows
// GROOVE_AXES.
//
// Two consumers:
//   1. Record Player's renderDetailStrip — zoomed-in selection bar
//   2. Zone History modal's bar-graph replacement of the text list
//
// Options:
//   height              — canvas height px (default 120)
//   maxWidth            — cap total canvas width (default 800)
//   minZoneWidth        — minimum column width px (default 1 — honest at
//                         high zone counts; can raise to 4+ for wide modal)
//   maxZoneWidth        — maximum column width px (default 60)
//   showLaneLabels      — draw GROOVE_AXES[i].name on each lane (default
//                         true)
//   showFIGlyphs        — overlay fluid-inclusion teal dots (default true)
//
// Event glyphs intentionally limited to fluid_inclusion + dissolution for
// Phase 1 — those are the only zone-level flags on the data today. Twin
// and phantom-boundary are crystal-level, deferred to Phase 1b when we
// decide how to attach them to specific zones.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Chemistry zone bar — the stratigraphic-column view of a crystal.
// Per BRIEF-CHEMISTRY-ZONE-BAR.md (design-tasks repo, commit b50c255).
//
// "A simple horizontal bar that shows the chemistry history of a crystal.
//  Each segment is colored by the dominant chromophore during that growth
//  period. Segment width is proportional to how long that chemical regime
//  lasted." — Professor
//
// Watermelon tourmaline grows green (Fe/Cr) for a long time then shifts
// to pink (Mn) at the end → renders as a wide green segment + thin pink
// segment. The bar IS the growth narrative.
//
// Lives ALONGSIDE the 6-lane chemistry-axis dashboard bar (renderZoneBar
// Canvas), not as a replacement: chem bar shows the story (chromophore →
// visible color), dashboard shows the data (each axis's instrument trace).
// Same color logic the existing crystalColor() uses, just per-zone.
// ─────────────────────────────────────────────────────────────────────────

function zoneColor(zone, mineral, crystal) {
  // Per-zone color via the existing per-mineral crystalColor() switch
  // statement — by building a single-zone fake-crystal and reusing the
  // ~80 lines of mineral-specific color logic. Whole-crystal attributes
  // (radiation_damage, mineral_display, habit) are inherited from the
  // real crystal so e.g. quartz amethyst (Fe + radDmg) renders correctly
  // on each zone with that combination, not just averaged.
  const fake = {
    mineral,
    zones: [zone],
    radiation_damage: (crystal && crystal.radiation_damage) || 0,
    mineral_display: crystal && crystal.mineral_display,
    habit: (crystal && crystal.habit) || zone.habit,
    c_length_mm: (crystal && crystal.c_length_mm) || 0,
  };
  return crystalColor(fake);
}

function groupZonesByChemistry(zones, mineral, crystal) {
  // Walk zones, merge consecutive zones with same color into segments.
  // Dissolution zones (thickness_um < 0) get their own segment regardless
  // — the inward step is a story event the bar should mark.
  if (!zones || !zones.length) return [];
  const segs = [];
  let current = null;
  for (const z of zones) {
    const isDissolution = z.thickness_um < 0;
    const color = zoneColor(z, mineral, crystal);
    const key = isDissolution ? '__dissolution__' : color;
    if (current && current.key === key) {
      current.totalThickness += Math.abs(z.thickness_um || 1);
      current.zones.push(z);
    } else {
      if (current) segs.push(current);
      current = {
        key,
        color,
        isDissolution,
        totalThickness: Math.abs(z.thickness_um || 1),
        zones: [z],
      };
    }
  }
  if (current) segs.push(current);
  return segs;
}

function renderChemistryBar(canvas, crystal, opts = {}) {
  const zones = crystal && crystal.zones;
  if (!zones || !zones.length) return [];
  const { width = 600, height = 36 } = opts;
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, width, height);

  const segs = groupZonesByChemistry(zones, crystal.mineral, crystal);
  const totalT = segs.reduce((s, g) => s + g.totalThickness, 0) || 1;

  let x = 0;
  const segGeom = [];  // for hover tooltip mapping
  for (const seg of segs) {
    const w = Math.max(1, (seg.totalThickness / totalT) * width);
    ctx.fillStyle = seg.color;
    ctx.fillRect(x, 0, w, height);
    if (seg.isDissolution) {
      // Diagonal hash texture so dissolution reads as 'something
      // happened here', not just 'red zone'.
      ctx.strokeStyle = '#882020';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let hx = x - height; hx < x + w; hx += 4) {
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx + height, height);
      }
      ctx.stroke();
    }
    if (x > 0) {
      // Subtle inter-segment separator so adjacent same-hue colors
      // (rare but possible after rounding) still read as boundaries.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    segGeom.push({ x, w, seg });
    x += w;
  }
  return segGeom;
}

// ─────────────────────────────────────────────────────────────────────────
// UV-response zone bar — the "ghost of growth under the lamp" view.
// Same stratigraphic primitive as the chemistry bar, but the segments
// represent fluorescence behavior under shortwave/longwave UV instead of
// visible-light color.
//
// Per-mineral activator/quencher physics:
//  - Calcite: Mn²⁺ activates the Franklin/Sterling-Hill red SW emission;
//    Fe quenches above ~5 ppm (why most calcite outside Franklin is dim)
//  - Ruby/corundum: Cr³⁺ d-d emission at 694 nm; Fe quenches (Mogok =
//    low Fe → bright; Thai basalt-hosted = high Fe → dim)
//  - Fluorite: REE + radiation defects → blue/violet; rare U → green
//  - Adamite: Cu activator → diagnostic apple-green
//  - Scheelite: tungstate intrinsic blue-white (always fluoresces)
//  - Aragonite: organic activators sometimes produce yellow but sim
//    doesn't model organics → inert in this rendering
//  - Most others: inert
//
// First-cut palette is intentionally narrow — the famous fluorescent
// minerals get rules, everything else renders as "lamp on, no emission"
// (dark) which is the honest answer.
// ─────────────────────────────────────────────────────────────────────────

function zoneFluorescence(zone, mineral, crystal) {
  // Returns either a hex color string (the UV emission) or null (inert).
  const Fe = zone.trace_Fe || 0;
  const Mn = zone.trace_Mn || 0;
  const Ti = zone.trace_Ti || 0;
  const Al = zone.trace_Al || 0;
  const radDmg = (crystal && crystal.radiation_damage) || 0;

  switch (mineral) {
    case 'calcite':
      // Franklin red SW: Mn²⁺ activates, Fe quenches.
      if (Mn > 1.0 && Fe < 5.0) return '#ff4040';
      return null;

    case 'aragonite':
      // Some specimens fluoresce yellow from organic activators which
      // we don't model. Honest rendering = inert.
      return null;

    case 'ruby':
    case 'corundum':
    case 'sapphire':
      // Cr³⁺ red SW + LW. Fe quenches strongly above ~10 ppm.
      // Reading trace_Cr: not in the standard zone fields list, so check
      // both the trace_Cr field (if present) and infer from notes.
      const Cr = zone.trace_Cr || 0;
      const noteCr = zone.note && /Cr|chromium|emerald|ruby/i.test(zone.note);
      if ((Cr > 1.0 || (mineral === 'ruby' && noteCr)) && Fe < 10.0) {
        return '#ff5050';
      }
      return null;

    case 'fluorite':
      // Mn or radiation defects → blue/violet emission.
      if (Mn > 0.5 || radDmg > 0.1) return '#5588ff';
      return null;

    case 'scheelite':
      // Tungstate intrinsic — bright blue-white, every zone.
      return '#ddddff';

    case 'adamite':
      // Cu activator → apple-green; diagnostic for cuproadamite.
      if (zone.note && zone.note.includes('cuproadamite')) return '#aaff44';
      // Pure adamite is yellow-green under SW.
      return '#88dd66';

    case 'willemite':
      // Franklin classic — Mn²⁺ → bright green SW. (Sim doesn't ship
      // willemite yet but reserve the rule for when it lands.)
      if (Mn > 0.1) return '#88ff44';
      return null;

    case 'autunite':
    case 'uraninite':
      // Uranyl ion → diagnostic green. Uraninite's color comes from
      // U not radiation, so always-on rather than gated.
      return '#aaff66';

    case 'wulfenite':
      // Some specimens fluoresce orange under SW but most don't reliably.
      return null;

    case 'apophyllite':
      // Variable — Mn-bearing zones fluoresce; clean ones don't.
      if (Mn > 0.3) return '#ffaa66';
      return null;

    // Beryl family — emerald has weak red Cr³⁺ emission; aquamarine/
    // morganite/heliodor are largely inert. Goshenite spec lists null.
    case 'emerald':
      // Cr-bearing → weak red, much dimmer than ruby.
      if (Fe < 5.0) return '#cc4040';  // dimmer red than ruby
      return null;

    default:
      return null;
  }
}

function groupZonesByFluorescence(zones, mineral, crystal) {
  if (!zones || !zones.length) return [];
  const segs = [];
  let current = null;
  for (const z of zones) {
    const color = zoneFluorescence(z, mineral, crystal);
    const key = color || '__inert__';
    if (current && current.key === key) {
      current.totalThickness += Math.abs(z.thickness_um || 1);
      current.zones.push(z);
    } else {
      if (current) segs.push(current);
      current = {
        key,
        color,           // null for inert segments
        totalThickness: Math.abs(z.thickness_um || 1),
        zones: [z],
      };
    }
  }
  if (current) segs.push(current);
  return segs;
}

function renderUVBar(canvas, crystal, opts = {}) {
  const zones = crystal && crystal.zones;
  if (!zones || !zones.length) return [];
  const { width = 600, height = 36 } = opts;
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');

  // Background — deep cool gray suggesting "lamp on, dark room, no
  // emission yet". Inert segments stay this color.
  ctx.fillStyle = '#181822';
  ctx.fillRect(0, 0, width, height);

  const segs = groupZonesByFluorescence(zones, crystal.mineral, crystal);
  const totalT = segs.reduce((s, g) => s + g.totalThickness, 0) || 1;

  let x = 0;
  const segGeom = [];
  for (const seg of segs) {
    const w = Math.max(1, (seg.totalThickness / totalT) * width);
    if (seg.color) {
      // Glow effect — fill + soft halo so emission segments look like
      // they're shining rather than just colored.
      ctx.shadowColor = seg.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = seg.color;
      ctx.fillRect(x, 4, w, height - 8);
      ctx.shadowBlur = 0;
      // Bright inner highlight so the segment reads as hot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(x, 4, w, Math.max(2, (height - 8) * 0.35));
    }
    if (x > 0) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    segGeom.push({ x, w, seg });
    x += w;
  }
  return segGeom;
}

// Lookup of the per-mineral expected fluorescence narrator string from
// the spec's `fluorescence` field — used as the modal header subtitle.
function uvSummary(mineral) {
  const spec = MINERAL_SPEC[mineral];
  if (!spec || !spec.fluorescence) return 'inert under UV';
  return spec.fluorescence;
}

// ─────────────────────────────────────────────────────────────────────────
// Zone-viz Phase 2: habit-shape-aware zone rendering.
//
// Dispatches on the crystal's `vector` (the canonical 5-family habit
// class: projecting / coating / tabular / equant / dendritic). Each
// family gets a shape renderer that conforms the zone bands to the
// mineral's natural habit outline. Families without a shape renderer
// yet fall back to the bar graph.
//
// Phase 2a (this commit): `equant` — corner-view hexagonal silhouette
// with nested rings, internal Y-edge scaffold to suggest 3D cube/rhomb
// faces. Covers fluorite + halite + galena + pyrite + dolomite +
// every mineral with 'massive' / 'cubic' / 'rhomb' / 'octahedral' as
// an equant habit variant.
//
// Zone color (phase 2a first cut): temperature gradient. HSL mapping
// from blue (cool) → red (hot) across the 0–1000°C range. Richer
// chromophore-aware color_from_zone is phase 2c territory when the
// schema bump lands and every variety's chromophore is captured.
// ─────────────────────────────────────────────────────────────────────────

function zoneTemperatureColor(zone) {
  // HSL gradient — blue 220° at 0°C, red 0° at ≥1000°C. Warmer hues
  // also shift brighter so 'hot zone' reads obvious at a glance.
  const T = Math.max(0, Math.min(1000, zone.temperature || 0));
  const t = T / 1000;
  const hue = 220 - 220 * t;
  const light = 32 + 18 * t;
  return `hsl(${hue.toFixed(0)}, 68%, ${light.toFixed(0)}%)`;
}

function getCrystalVector(crystal) {
  // Look up the habit's vector classification from the mineral spec.
  // Each habit variant declares its vector (projecting/coating/tabular/
  // equant/dendritic); fall back to the first variant's vector if the
  // crystal's habit isn't in the list, or null if the mineral has no
  // variants declared yet.
  if (!crystal || !crystal.mineral) return null;
  const spec = MINERAL_SPEC[crystal.mineral];
  if (!spec || !spec.habit_variants) return null;
  const variants = spec.habit_variants.filter(v => v && typeof v === 'object');
  if (!variants.length) return null;
  const current = variants.find(v => v.name === crystal.habit) || variants[0];
  return current.vector || null;
}

function renderZoneShape_equant(canvas, crystal, opts = {}) {
  // Nested hexagonal silhouette with internal Y to suggest corner-view
  // cube/rhomb faces. Each zone is a concentric ring; ring thickness is
  // proportional to the zone's |thickness_um| so a long dissolution
  // event reads as a wide inward step.
  const zones = crystal.zones || [];
  if (!zones.length) return;
  const { size = 240 } = opts;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.45;

  // Flatten y slightly to suggest iso-projection foreshortening (0.866
  // = cos(30°), the iso-projection y-shrink factor).
  const hexVertex = (angleDeg, r) => {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.866];
  };

  // Cumulative thickness normalizes each zone's ring radius. Minimum
  // band width = 1% of maxR so high-zone-count crystals don't produce
  // rings thinner than a pixel.
  const totalT = zones.reduce((s, z) => s + Math.abs(z.thickness_um || 1), 0) || 1;
  const minBandFrac = 0.008;
  let cumT = 0;
  let prevR = 0;

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    cumT += Math.abs(z.thickness_um || 1);
    let outerR = (cumT / totalT) * maxR;
    // Enforce minimum band width so every zone is visible even in a
    // crystal with hundreds of zones.
    if (outerR - prevR < minBandFrac * maxR) {
      outerR = prevR + minBandFrac * maxR;
    }

    // Fill this ring. Draw outer hexagon filled, then punch out inner.
    ctx.fillStyle = zoneTemperatureColor(z);
    ctx.beginPath();
    for (let v = 0; v < 6; v++) {
      const [vx, vy] = hexVertex(v * 60, outerR);
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();

    // Dissolution tint — darken the band by overlaying red at 0.35.
    if (z.thickness_um < 0) {
      ctx.fillStyle = '#cc4444';
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    prevR = outerR;
  }

  // Internal Y scaffold — three low-alpha edges from apex / lower-left /
  // lower-right corner of the OUTER hex to the center, to suggest the
  // three visible cube faces meeting at the front corner of a corner-on
  // isometric cube. Purely poetic — no data in it — but without it the
  // rendering reads as nested hexagons instead of a cube.
  const rimR = prevR;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const apex = hexVertex(0, rimR);
  const ll = hexVertex(240, rimR);
  const lr = hexVertex(120, rimR);
  ctx.moveTo(apex[0], apex[1]); ctx.lineTo(cx, cy);
  ctx.moveTo(ll[0], ll[1]); ctx.lineTo(cx, cy);
  ctx.moveTo(lr[0], lr[1]); ctx.lineTo(cx, cy);
  ctx.stroke();

  // Outer silhouette edge — slightly brighter outline so the crystal
  // outline reads against the dark background.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let v = 0; v < 6; v++) {
    const [vx, vy] = hexVertex(v * 60, rimR);
    if (v === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.stroke();

  // Phantom boundaries — small gray ticks at the ring corresponding to
  // zones with is_phantom true. Rendered as short radial notches on the
  // outer edge of that ring, which reads as 'growth paused here'.
  cumT = 0;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    cumT += Math.abs(z.thickness_um || 1);
    if (!z.is_phantom) continue;
    const r = (cumT / totalT) * maxR;
    ctx.strokeStyle = '#aaaaaa';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Notches on the three visible-face midpoints (60°, 180°, 300°).
    for (const angle of [60, 180, 300]) {
      const [x1, y1] = hexVertex(angle, r - 3);
      const [x2, y2] = hexVertex(angle, r + 3);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Fluid inclusions — teal dots at the midpoint of the zone's ring,
  // placed near the apex angle so multiple FIs stagger.
  cumT = 0;
  let fiCount = 0;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const zT = Math.abs(z.thickness_um || 1);
    const midR = ((cumT + zT * 0.5) / totalT) * maxR;
    cumT += zT;
    if (!z.fluid_inclusion) continue;
    const angle = (fiCount * 37) % 360;  // scatter around the ring
    const [fx, fy] = hexVertex(angle, midR);
    ctx.fillStyle = '#50c0e0';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    fiCount++;
  }
}

function renderZoneShapeCanvas(canvas, crystal, opts = {}) {
  // Dispatcher. Branches on canonical habit vector; falls back to the
  // Phase 1 bar graph for vectors that don't have a shape renderer yet.
  const zones = crystal.zones || [];
  if (!zones.length) return;
  const vector = getCrystalVector(crystal);
  switch (vector) {
    case 'equant':
      return renderZoneShape_equant(canvas, crystal, opts);
    // TODO: projecting (hex prism with c-axis elongation), tabular (flat
    // plate with concentric ring bands), coating (wall-anchored shells),
    // dendritic (branching skeletal)
    default:
      return renderZoneBarCanvas(canvas, zones, opts);
  }
}

function renderZoneBarCanvas(canvas, zones, opts = {}) {
  if (!canvas || !zones || !zones.length) return;
  const {
    height = 120,
    maxWidth = 800,
    minZoneWidth = 1,
    maxZoneWidth = 60,
    showLaneLabels = true,
    showFIGlyphs = true,
  } = opts;

  const nZones = zones.length;
  const zoneW = Math.max(minZoneWidth, Math.min(maxZoneWidth, Math.floor(maxWidth / nZones)));
  const W = zoneW * nZones;
  const H = height;
  canvas.width = W;
  canvas.height = H;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, W, H);

  // Range-normalize each axis within this zone selection for visual
  // contrast. If all values are equal the range collapses to 1 → every
  // value is 0.0 (dim stripe), which is the honest rendering.
  const norm = (arr) => {
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    const range = mx - mn || 1;
    return arr.map(v => (v - mn) / range);
  };
  const allNorm = GROOVE_AXES.map(axis => {
    if (axis.key === 'thickness_um') {
      // Use |thickness| so dissolution rows still rank by magnitude,
      // with direction shown via the dissolution tint below.
      return norm(zones.map(z => Math.abs(z[axis.key] || 0)));
    }
    return norm(zones.map(z => z[axis.key] || 0));
  });
  const laneH = Math.floor(H / GROOVE_AXES.length);

  for (let a = 0; a < GROOVE_AXES.length; a++) {
    const y0 = a * laneH;
    for (let i = 0; i < nZones; i++) {
      const val = allNorm[a][i];
      const x = i * zoneW;
      ctx.fillStyle = GROOVE_AXES[a].color;
      ctx.globalAlpha = 0.2 + val * 0.7;
      const barH = Math.max(1, val * (laneH - 2));
      ctx.fillRect(x + 1, y0 + laneH - barH - 1, Math.max(1, zoneW - 2), barH);
      ctx.globalAlpha = 1;

      // Dissolution tint — overlaid on every lane so a dissolution zone
      // reads as a vertical red stripe through the whole bar graph.
      if (zones[i].thickness_um < 0) {
        ctx.fillStyle = '#cc4444';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y0, zoneW, laneH);
        ctx.globalAlpha = 1;
      }
    }

    if (showLaneLabels && zoneW >= 6) {
      ctx.fillStyle = GROOVE_AXES[a].color;
      ctx.globalAlpha = 0.7;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(GROOVE_AXES[a].name, 3, y0 + 12);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = '#1a1a14';
    ctx.beginPath();
    ctx.moveTo(0, y0 + laneH);
    ctx.lineTo(W, y0 + laneH);
    ctx.stroke();
  }

  // Fluid-inclusion glyph row — small teal dots at the top of each zone
  // column that has fluid_inclusion === true. Positioned at lane 0's top
  // so they don't overlap lane content.
  if (showFIGlyphs) {
    for (let i = 0; i < nZones; i++) {
      if (!zones[i].fluid_inclusion) continue;
      const cx = i * zoneW + zoneW / 2;
      ctx.fillStyle = '#50c0e0';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(cx, 3, Math.max(1.5, Math.min(2.5, zoneW / 3)), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Phase 1b: phantom-boundary tick — a thin gray vertical line through
  // all lanes marking zones where growth paused and resumed, leaving a
  // ghost surface inside the crystal. Semantically correct to overlay
  // every axis since the phantom is a whole-crystal event at that zone,
  // not a lane-specific signal. Uses zone.is_phantom (already captured
  // per-zone by buildCrystalRecord; no schema change needed).
  if (opts.showPhantomTicks !== false) {
    for (let i = 0; i < nZones; i++) {
      if (!zones[i].is_phantom) continue;
      const cx = i * zoneW + Math.floor(zoneW / 2);
      ctx.strokeStyle = '#aaaaaa';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(1, Math.min(2, zoneW * 0.5));
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }
}

function renderDetailStrip(startIdx, endIdx) {
  if (!grooveCrystal || !grooveCrystal.zones.length) return;

  const strip = document.getElementById('groove-detail-strip');
  const label = document.getElementById('detail-range-label');
  const hint = document.getElementById('detail-hint');
  const zonesDiv = document.getElementById('detail-zones');
  const detailCanvas = document.getElementById('detail-canvas');

  strip.style.display = 'block';
  hint.style.display = 'none';
  label.textContent = `Zones ${startIdx + 1}–${endIdx + 1} of ${grooveCrystal.zones.length}`;

  const zones = grooveCrystal.zones.slice(startIdx, endIdx + 1);
  const nZones = zones.length;

  // Render via shared bar-graph canvas — minZoneWidth 12 keeps the
  // Record-Player-zoom UX (dragging to select a range) legible.
  renderZoneBarCanvas(detailCanvas, zones, {
    height: 120,
    maxWidth: 800,
    minZoneWidth: 12,
    maxZoneWidth: 60,
    showLaneLabels: true,
    showFIGlyphs: true,
  });
  // Derive zoneW from the canvas width the renderer committed to (honest
  // under minZoneWidth/maxZoneWidth clamping). Only used by the hover
  // tooltip mapping below.
  const zoneW = detailCanvas.width / nZones;

  // Add hover tooltip to the detail canvas
  detailCanvas.onmousemove = function(e) {
    const rect = detailCanvas.getBoundingClientRect();
    const scaleX = detailCanvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const zoneIdx = Math.floor(mx / zoneW);
    const tooltip = document.getElementById('groove-tooltip');

    if (zoneIdx >= 0 && zoneIdx < nZones) {
      const z = zones[zoneIdx];
      const globalIdx = startIdx + zoneIdx;
      let html = `<b>Zone ${globalIdx + 1}</b> · Step ${z.step}<br>`;
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
    } else {
      tooltip.style.display = 'none';
    }
  };
  detailCanvas.onmouseleave = function() {
    document.getElementById('groove-tooltip').style.display = 'none';
  };

  // Render the number readouts below
  zonesDiv.innerHTML = '';
  for (let i = 0; i < nZones; i++) {
    const z = zones[i];
    const globalIdx = startIdx + i;
    const div = document.createElement('div');
    div.className = 'groove-detail-zone';
    if (z.thickness_um < 0) div.classList.add('dissolution');
    if (z.fluid_inclusion || (z.note && z.note.toLowerCase().includes('twin'))) div.classList.add('has-event');

    // Title tooltip for the whole zone card
    let titleParts = [`Zone ${globalIdx + 1} · Step ${z.step}`, `T: ${z.temperature.toFixed(0)}°C`];
    titleParts.push(z.thickness_um >= 0 ? `Growth: +${z.thickness_um.toFixed(1)} µm` : `Dissolution: ${z.thickness_um.toFixed(1)} µm`);
    if (z.trace_Fe > 0.1) titleParts.push(`Fe: ${z.trace_Fe.toFixed(1)} ppm`);
    if (z.trace_Mn > 0.05) titleParts.push(`Mn: ${z.trace_Mn.toFixed(1)} ppm`);
    if (z.trace_Al > 0.1) titleParts.push(`Al: ${z.trace_Al.toFixed(1)} ppm`);
    if (z.trace_Ti > 0.005) titleParts.push(`Ti: ${z.trace_Ti.toFixed(3)} ppm`);
    if (z.fluid_inclusion) titleParts.push(`Inclusion: ${z.inclusion_type}`);
    if (z.note) titleParts.push(z.note);
    div.title = titleParts.join('\n');

    let html = `<div class="dz-header">Z${globalIdx + 1}</div>`;
    html += `<div class="dz-temp">🌡${z.temperature.toFixed(0)}°</div>`;
    if (z.thickness_um >= 0) {
      html += `<div class="dz-rate">+${z.thickness_um.toFixed(1)}µm</div>`;
    } else {
      html += `<div style="color:#cc4444">${z.thickness_um.toFixed(1)}µm</div>`;
    }
    if (z.trace_Fe > 0.1) html += `<div class="dz-fe">Fe ${z.trace_Fe.toFixed(1)}</div>`;
    if (z.trace_Mn > 0.05) html += `<div class="dz-mn">Mn ${z.trace_Mn.toFixed(1)}</div>`;
    if (z.trace_Al > 0.1) html += `<div class="dz-al">Al ${z.trace_Al.toFixed(1)}</div>`;
    if (z.trace_Ti > 0.005) html += `<div class="dz-ti">Ti ${z.trace_Ti.toFixed(2)}</div>`;
    if (z.fluid_inclusion) html += `<div class="dz-event">💧 ${z.inclusion_type}</div>`;
    if (z.note && z.note.toLowerCase().includes('twin')) html += `<div class="dz-event">⟁ twin</div>`;
    if (z.note && !z.note.toLowerCase().includes('twin')) html += `<div class="dz-note">${z.note}</div>`;

    div.innerHTML = html;
    zonesDiv.appendChild(div);
  }
}

// Tooltip on hover
(function() {
  const canvas = document.getElementById('groove-canvas');
  const tooltip = document.getElementById('groove-tooltip');

  canvas.addEventListener('mousemove', function(e) {
    if (!groovePoints.length) { tooltip.style.display = 'none'; return; }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const drawUpTo = Math.max(1, Math.floor(grooveProgress * groovePoints.length));

    // Find nearest point
    let bestDist = 20; // pixel threshold
    let bestPt = null;
    for (let i = 0; i < drawUpTo; i++) {
      const p = groovePoints[i];
      const dx = p.x - mx, dy = p.y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        bestPt = p;
      }
    }

    if (bestPt) {
      const z = bestPt.zone;
      let html = `<b>Zone ${bestPt.index + 1}</b> · Step ${z.step}<br>`;
      html += `🌡️ ${z.temperature.toFixed(0)}°C<br>`;
      if (z.thickness_um >= 0) {
        html += `📏 +${z.thickness_um.toFixed(1)} µm<br>`;
      } else {
        html += `<span style="color:#cc4444">📏 ${z.thickness_um.toFixed(1)} µm (dissolution)</span><br>`;
      }
      if (z.trace_Fe > 0.5) html += `Fe: ${z.trace_Fe.toFixed(1)} ppm · `;
      if (z.trace_Mn > 0.3) html += `Mn: ${z.trace_Mn.toFixed(1)} · `;
      if (z.trace_Al > 0.5) html += `Al: ${z.trace_Al.toFixed(1)} · `;
      if (z.trace_Ti > 0.01) html += `Ti: ${z.trace_Ti.toFixed(3)} · `;
      html = html.replace(/ · $/, '<br>');
      if (z.fluid_inclusion) html += `💧 ${z.inclusion_type}<br>`;
      if (z.note) html += `<span style="color:#8a7a40">${z.note}</span>`;

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', function() {
    tooltip.style.display = 'none';
  });
})();

// ============================================================
// THE GROOVE — IDLE MODE
// ============================================================

const IDLE_MINERAL_COLORS = {
  quartz: '#e8e8e8', calcite: '#ffd699', fluorite: '#b088dd',
  pyrite: '#c8b830', chalcopyrite: '#c89830', galena: '#a0a0a0',
  hematite: '#b04040', malachite: '#2e8b57', sphalerite: '#cc8844',
  goethite: '#8b6914', uraninite: '#44dd44', smithsonite: '#88bbcc',
  wulfenite: '#ff8833', ferrimolybdite: '#f5dc14', arsenopyrite: '#c8c0b8', scorodite: '#5a9a8a', selenite: '#e8e0d8', barite: '#eb137f', celestine: '#a4c8e0', jarosite: '#dcb43c', alunite: '#f0e0d8', brochantite: '#3a7c4f', antlerite: '#2a6038', anhydrite: '#d8d0c8', feldspar: '#f0d0b0',
  emerald: '#2e8b57', aquamarine: '#7fb8d4', morganite: '#eb6b9e', heliodor: '#eed858',
  corundum: '#c8c8c8', ruby: '#c03030', sapphire: '#304068',
  acanthite: '#404040', argentite: '#303030', native_silver: '#d4d4d4',
  native_arsenic: '#888888', native_sulfur: '#f5d030', native_tellurium: '#b8b8c8',
  nickeline: '#d49080', millerite: '#c8b860', cobaltite: '#d8d4cc',
  descloizite: '#8a3020', mottramite: '#8a9a40',
  raspite: '#d4b840', stolzite: '#d49a30', olivenite: '#5a7030',
  chalcanthite: '#2a40c8',
  rosasite: '#5a8a8e', aurichalcite: '#9ec8c0',  // Round 9a
  torbernite: '#3a8e3a', zeunerite: '#5aa040',   // Round 9b
  carnotite: '#e8d040',                          // Round 9c
  autunite: '#f0e045',                           // Round 9d
  uranospinite: '#e8d850',                       // Round 9e — Ca-As, bright FL
  tyuyamunite: '#e0c838'                         // Round 9e — Ca-V, weak FL
};

const IDLE_SPEED_MAP = [0.5, 1, 2, 5, 10]; // steps per second

// =====================================================================
// Zen Mode (internal name: "idle")
// =====================================================================
// User-visible label is "Zen Mode" (title card + menu button + start
// log line). The `idle*` token is the pre-rename internal name that's
// still spread across DOM IDs (#idle-panel, #idle-chart, #idle-pie,
// #idle-log, #idle-step-counter, #idle-speed-slider), CSS classes
// (.idle-container, .idle-controls), function names (idleTogglePlay,
// idleStep, idleFinish, idleAppendLog, idlePickScenario), and this
// global. Mode switch is `switchMode('idle')` / `menuGo('idle')`. The
// post-game source field also uses 'Zen' (not 'Idle'). Token kept
// stable because the rename happened only at the user-visible surface
// — see commit 467e8c4 and proposals/BACKLOG.md "Internal token
// cleanup" for the deferred thorough rename.
let idleSim = null;
let idleRunning = false;
let idlePaused = false;
let idleAnimFrame = null;
let idleLastTick = 0;
let idleSpeed = 1; // index into IDLE_SPEED_MAP
let idleHistory = []; // array of { step, supersats: { mineral: value }, temp }
let idleMaxHistory = 200;
let idleDrift = { tempTarget: 0, tempRate: 0, driftTimer: 0 };
let idleEvents = []; // active temporary events

function idleInit() {
  // Build legend
  const legendEl = document.getElementById('idle-legend');
  if (legendEl && !legendEl.children.length) {
    for (const [mineral, color] of Object.entries(IDLE_MINERAL_COLORS)) {
      const item = document.createElement('div');
      item.className = 'idle-legend-item';
      item.innerHTML = `<span class="idle-legend-swatch" style="background:${color}"></span>${mineral}`;
      legendEl.appendChild(item);
    }
  }
}

function idleCreateSim(scenarioKey) {
  if (scenarioKey === 'random') {
    const keys = Object.keys(SCENARIOS);
    scenarioKey = keys[Math.floor(Math.random() * keys.length)];
  }
  const scenarioFn = SCENARIOS[scenarioKey];
  if (!scenarioFn) return null;

  // SCENARIOS values are functions — call to get {conditions, events, defaultSteps}
  const scenarioData = scenarioFn();

  rng = new SeededRandom(Date.now());
  // Clone the scenario's conditions for the idle simulation
  const srcCond = scenarioData.conditions;
  const conditions = new VugConditions({
    temperature: srcCond.temperature,
    pressure: srcCond.pressure || 1.0,
    fluid: new FluidChemistry(Object.assign({}, srcCond.fluid)),
    wall: srcCond.wall || new VugWall({ composition: 'limestone', thickness_mm: 500, vug_diameter_mm: 50, wall_Fe_ppm: 2000, wall_Mn_ppm: 500, wall_Mg_ppm: 1000 })
  });

  const sim = new VugSimulator(conditions, []); // no scripted events — drift handles everything
  idleDrift.tempTarget = srcCond.temperature;
  idleDrift.tempRate = 0;
  idleDrift.driftTimer = 0;
  idleHistory = [];
  idleEvents = [];
  return sim;
}

function idleApplyDrift() {
  if (!idleSim) return;
  const c = idleSim.conditions;

  // Temperature: Brownian walk with mean-reversion
  const meanRevStrength = 0.02;
  const noiseScale = 3.0;
  const noise = (rng.random() - 0.5) * noiseScale * 2;
  const revert = (idleDrift.tempTarget - c.temperature) * meanRevStrength;
  c.temperature += noise + revert;
  c.temperature = Math.max(25, Math.min(600, c.temperature));

  // Fluid chemistry: slow drift on major species
  const species = ['SiO2', 'Ca', 'CO3', 'Fe', 'Mn', 'F', 'Zn', 'S', 'Cu'];
  for (const sp of species) {
    if (c.fluid[sp] === undefined || c.fluid[sp] <= 0) continue;
    const drift = (rng.random() - 0.5) * c.fluid[sp] * 0.03;
    c.fluid[sp] = Math.max(0, c.fluid[sp] + drift);
  }

  // pH drift
  c.fluid.pH += (rng.random() - 0.5) * 0.05;
  c.fluid.pH = Math.max(3.0, Math.min(9.0, c.fluid.pH));

  // Random events (2% chance per step)
  if (rng.random() < 0.02) {
    idleFireRandomEvent();
  }

  // Process active temporary events
  for (let i = idleEvents.length - 1; i >= 0; i--) {
    const evt = idleEvents[i];
    evt.remaining--;
    if (evt.type === 'thermal_pulse') {
      c.temperature += evt.decayRate;
    }
    if (evt.remaining <= 0) idleEvents.splice(i, 1);
  }
}

function idleFireRandomEvent() {
  if (!idleSim) return;
  const c = idleSim.conditions;
  const roll = rng.random();
  const logEl = document.getElementById('idle-log');

  if (roll < 0.25) {
    // Thermal pulse
    const spike = 40 + rng.random() * 80;
    c.temperature += spike;
    c.temperature = Math.min(600, c.temperature);
    const duration = 5 + Math.floor(rng.random() * 10);
    idleEvents.push({ type: 'thermal_pulse', remaining: duration, decayRate: -spike / duration });
    idleAppendLog(logEl, `🔥 THERMAL PULSE — Temperature surges +${spike.toFixed(0)}°C to ${c.temperature.toFixed(0)}°C`, 'log-event');
  } else if (roll < 0.50) {
    // Fluid injection — random species spike
    const targets = ['SiO2', 'Ca', 'CO3', 'Fe', 'Mn', 'Cu', 'Zn', 'S', 'F'];
    const target = targets[Math.floor(rng.random() * targets.length)];
    const multiplier = 2 + rng.random() * 4;
    const oldVal = c.fluid[target] || 0;
    c.fluid[target] = Math.max(c.fluid[target] || 0, 10) * multiplier;
    idleAppendLog(logEl, `💧 FLUID INJECTION — ${target} surges ×${multiplier.toFixed(1)} (${oldVal.toFixed(0)} → ${c.fluid[target].toFixed(0)} ppm)`, 'log-event');
  } else if (roll < 0.70) {
    // Tectonic crack — pH shift + pressure change
    const pHShift = (rng.random() - 0.5) * 1.5;
    c.fluid.pH += pHShift;
    c.fluid.pH = Math.max(3.0, Math.min(9.0, c.fluid.pH));
    c.pressure += (rng.random() - 0.5) * 0.5;
    c.pressure = Math.max(0.1, Math.min(5.0, c.pressure));
    idleAppendLog(logEl, `⚡ TECTONIC CRACK — pH shifts to ${c.fluid.pH.toFixed(1)}, pressure ${c.pressure.toFixed(2)} kbar`, 'log-event');
  } else if (roll < 0.85) {
    // Cooling pulse — meteoric water incursion
    const drop = 30 + rng.random() * 50;
    c.temperature -= drop;
    c.temperature = Math.max(25, c.temperature);
    c.fluid.SiO2 *= 0.6;
    idleAppendLog(logEl, `❄️ METEORIC INCURSION — Temperature drops ${drop.toFixed(0)}°C to ${c.temperature.toFixed(0)}°C`, 'log-event');
  } else {
    // Quiet period — reduce drift for a while
    idleDrift.tempRate = 0;
    idleAppendLog(logEl, `🌙 QUIET PERIOD — system reaches temporary equilibrium`, 'log-event');
  }
}

function idleRecordHistory() {
  if (!idleSim) return;
  const c = idleSim.conditions;
  const supersats = {};
  if (typeof c.supersaturation_quartz === 'function') supersats.quartz = c.supersaturation_quartz();
  if (typeof c.supersaturation_calcite === 'function') supersats.calcite = c.supersaturation_calcite();
  if (typeof c.supersaturation_aragonite === 'function') supersats.aragonite = c.supersaturation_aragonite();
  if (typeof c.supersaturation_siderite === 'function') supersats.siderite = c.supersaturation_siderite();
  if (typeof c.supersaturation_rhodochrosite === 'function') supersats.rhodochrosite = c.supersaturation_rhodochrosite();
  if (typeof c.supersaturation_dolomite === 'function') supersats.dolomite = c.supersaturation_dolomite();
  if (typeof c.supersaturation_fluorite === 'function') supersats.fluorite = c.supersaturation_fluorite();
  if (typeof c.supersaturation_pyrite === 'function') supersats.pyrite = c.supersaturation_pyrite();
  if (typeof c.supersaturation_marcasite === 'function') supersats.marcasite = c.supersaturation_marcasite();
  if (typeof c.supersaturation_chalcopyrite === 'function') supersats.chalcopyrite = c.supersaturation_chalcopyrite();
  if (typeof c.supersaturation_hematite === 'function') supersats.hematite = c.supersaturation_hematite();
  if (typeof c.supersaturation_sphalerite === 'function') supersats.sphalerite = c.supersaturation_sphalerite();
  if (typeof c.supersaturation_wurtzite === 'function') supersats.wurtzite = c.supersaturation_wurtzite();
  if (typeof c.supersaturation_galena === 'function') supersats.galena = c.supersaturation_galena();
  // malachite, goethite, smithsonite, wulfenite — check if methods exist
  try { supersats.malachite = c.supersaturation_malachite(); } catch(e) {}
  try { supersats.goethite = c.supersaturation_goethite(); } catch(e) {}
  try { supersats.smithsonite = c.supersaturation_smithsonite(); } catch(e) {}
  try { supersats.wulfenite = c.supersaturation_wulfenite(); } catch(e) {}
  try { supersats.molybdenite = c.supersaturation_molybdenite(); } catch(e) {}
  try { supersats.selenite = c.supersaturation_selenite(); } catch(e) {}
  try { supersats.feldspar = c.supersaturation_feldspar(); } catch(e) {}
  try { supersats.adamite = c.supersaturation_adamite(); } catch(e) {}
  try { supersats.mimetite = c.supersaturation_mimetite(); } catch(e) {}
  try { supersats.erythrite = c.supersaturation_erythrite(); } catch(e) {}
  try { supersats.annabergite = c.supersaturation_annabergite(); } catch(e) {}
  try { supersats.tetrahedrite = c.supersaturation_tetrahedrite(); } catch(e) {}
  try { supersats.tennantite = c.supersaturation_tennantite(); } catch(e) {}
  try { supersats.apophyllite = c.supersaturation_apophyllite(); } catch(e) {}

  idleHistory.push({
    step: idleSim.step,
    supersats,
    temp: c.temperature,
    crystalCount: idleSim.crystals.filter(cr => cr.active).length
  });

  if (idleHistory.length > idleMaxHistory) {
    idleHistory.shift();
  }
}

// ============================================================
// TOPO MAP — unwrapped wall line, canvas renderer
// ============================================================
// The wall-state ring[0] is drawn as a single continuous line, left to
// right, representing the vug's circumference unwrapped. Bare wall is
// amber (#D2691E, reserved — never a mineral class color). Crystal cells
// stroke in the mineral's class_color from MINERAL_SPEC, with stroke
// width proportional to crystal thickness. Hover → tooltip.

const TOPO_WALL_COLOR = '#D2691E';   // warm amber — the wall's color. No mineral touches this hue.
// Phase D: tint wall outlines by ring orientation in 3D mode. Floor
// rings get a slightly cooler amber; ceiling rings a slightly warmer
// reddish amber; wall rings stay TOPO_WALL_COLOR. Subtle enough not
// to scream "different mineral", strong enough to read floor / wall /
// ceiling at a glance once you know what you're looking at.
const TOPO_WALL_COLOR_FLOOR = '#A85820';      // cooler amber
const TOPO_WALL_COLOR_CEILING = '#E8782C';    // warmer amber
const TOPO_CRYSTAL_CAP_FRAC = 0.85;   // crystals can fill at most this fraction of a cell's radius
const TOPO_WALL_STROKE_PX = 2;        // bare wall stroke width
const TOPO_WALL_STROKE_MAX_PX = 10;   // cell stroke width ceiling when a crystal sits on the wall
const TOPO_ZOOM_MIN = 0.3;
const TOPO_ZOOM_MAX = 6.0;
const TOPO_ZOOM_STEP = 1.25;          // one click / wheel tick multiplies by this
let _topoZoom = 1.0;                  // multiplier applied to mmToPx in the renderer
// Pan offsets — added to (cx, cy) so the user can drag the vug
// around the canvas. Set by the pan drag handlers in topoEnsureWired.
let _topoPanX = 0;
let _topoPanY = 0;
// Drag state. Drag starts on mousedown over a non-crystal area and
// ends on mouseup (or mouseleave). Document-level handlers are
// attached only while a drag is in flight so they don't interfere
// with other UI when idle.
let _topoDragging = false;
let _topoDragStartClientX = 0;
let _topoDragStartClientY = 0;
let _topoDragOriginPanX = 0;
let _topoDragOriginPanY = 0;
const TOPO_DRAG_THRESHOLD_PX = 4;     // movement before drag starts (lets clicks still fire)
// Canvas lives inside a stage that's this multiple of the wrap's size.
// The extra area gives 3D-rotated content room to extend past the
// visible window without clipping against the canvas buffer edge.
// MUST match the CSS width/height percentages on .topo-canvas-stage.
const TOPO_STAGE_SCALE = 2;
// Camera drag mode. 'default' = current 2D hit-test-aware behavior
// (drag on non-crystal pans; click on crystal tooltips). 'rotate' =
// drag from anywhere rotates the 3D tilted canvas. 'pan' = drag from
// anywhere pans (ignores hit-test so user can drag even when starting
// over a crystal). Mode buttons are in the .topo-camera-ctrls cluster
// next to the play button; clicking an already-active button returns
// to 'default'.
let _topoDragMode = 'default';
// _topoView3D is derived: true iff _topoDragMode === 'rotate'. Kept
// around as a variable because render/hit-test still read it.
let _topoView3D = false;
// Phase C v1+: 2D mode can show either the aggregate ring (every
// crystal across every ring projected to a single slice — the post-
// scatter default) or one specific ring index. `'aggregate'` ⇄ ints
// 0..ring_count-1. The stepper buttons in `.topo-slice-ctrls` cycle
// through them. Hidden in 3D mode (where every ring is rendered
// stacked anyway) via `body.topo-view-3d` CSS.
let _topoActiveSlice = 'aggregate';
let _topoTiltX = 0;                   // pitch (viewer above/below)
let _topoTiltY = 0;                   // yaw   (viewer left/right of disc)
const TOPO_TILT_X_MAX = Math.PI / 2 - 0.05;   // don't flip past vertical
// Cache of inclusion-dot hitboxes built each render. Hover checks
// this first so the tooltip shows the enclosed crystal instead of
// falling through to the host's wall cell.
const _topoInclusions = [];

// ---- Selective-highlight state (TASK-BRIEF-TOPO-HIGHLIGHT) -----------
// A highlight "target" narrows the map: matching crystals render at
// full opacity, non-matching crystals ghost to 25%, wall and scale
// stay opaque. Target shape is { type: 'mineral' | 'class', value: str }
// or null. Canvas hover sets _topoHoverTarget (transient), legend hover
// sets _topoLegendHoverTarget (transient, lower priority than canvas),
// clicks toggle _topoLockTarget (persistent). Effective target = lock
// if set, else canvas hover, else legend hover. When null → no ghosting.
const TOPO_GHOST_ALPHA = 0.25;
let _topoHoverTarget = null;
let _topoLegendHoverTarget = null;
let _topoLockTarget = null;

function topoEffectiveTarget() {
  return _topoLockTarget || _topoHoverTarget || _topoLegendHoverTarget;
}

// Does the given mineral match the active highlight target?
// With no active target, everything matches (no ghosting).
function topoMineralHighlighted(mineral) {
  const t = topoEffectiveTarget();
  if (!t) return true;
  if (t.type === 'mineral') return t.value === mineral;
  if (t.type === 'class') {
    const spec = MINERAL_SPEC[mineral];
    return !!(spec && spec.class === t.value);
  }
  return false;
}

// Alpha multiplier for a given mineral under the current highlight.
function topoAlphaFor(mineral) {
  return !topoEffectiveTarget() || topoMineralHighlighted(mineral)
    ? 1.0 : TOPO_GHOST_ALPHA;
}

function topoSetHoverTarget(target) {
  if (JSON.stringify(_topoHoverTarget) === JSON.stringify(target)) return;
  _topoHoverTarget = target;
  topoRender();
}
function topoSetLegendHoverTarget(target) {
  if (JSON.stringify(_topoLegendHoverTarget) === JSON.stringify(target)) return;
  _topoLegendHoverTarget = target;
  topoRender();
}
function topoToggleLockTarget(target) {
  // null target → clear lock. Same as current lock → toggle off.
  // Different target → switch lock.
  if (!target) { _topoLockTarget = null; }
  else if (_topoLockTarget
           && _topoLockTarget.type === target.type
           && _topoLockTarget.value === target.value) {
    _topoLockTarget = null;
  } else {
    _topoLockTarget = target;
  }
  topoRender();
}

// The 12-class order from the topo palette in the brief. Used by the
// legend. We render all 12 even if not all present in the current run so
// the color vocabulary is visible.
const TOPO_CLASS_ORDER = [
  'oxide', 'carbonate', 'arsenate', 'sulfide', 'uranium', 'phosphate',
  'hydroxide', 'molybdate', 'silicate', 'halide', 'native', 'sulfate',
];

function topoActiveSim() {
  // Prefer the simulator whose mode is currently on-screen. Without this
  // a stale sim from a previous mode (e.g. randomSim from a Quick Play
  // before switching to Simulation) wins and the topo shows stale data.
  const mode = (typeof currentGameMode === 'string') ? currentGameMode : null;
  if (mode === 'fortress' && typeof fortressSim !== 'undefined' && fortressSim) return fortressSim;
  if (mode === 'idle'     && typeof idleSim     !== 'undefined' && idleSim)     return idleSim;
  if (mode === 'random'   && typeof randomSim   !== 'undefined' && randomSim)   return randomSim;
  if (mode === 'legends'  && typeof legendsSim  !== 'undefined' && legendsSim)  return legendsSim;
  // Fallback: any sim at all.
  if (typeof fortressSim !== 'undefined' && fortressSim) return fortressSim;
  if (typeof idleSim !== 'undefined' && idleSim) return idleSim;
  if (typeof randomSim !== 'undefined' && randomSim) return randomSim;
  if (typeof legendsSim !== 'undefined' && legendsSim) return legendsSim;
  return null;
}

function topoClassColor(mineral) {
  const entry = MINERAL_SPEC[mineral];
  return (entry && entry.class_color) || TOPO_WALL_COLOR;
}

// Legacy `topoBuildLegend()` and `_wireTopoLegendEvents()` lived here.
// They built the class-swatch legend and drove hover/click highlight
// from a separate "classes" details element below the topo strip.
// Removed in favor of the fortress-status sigma panel doing both jobs:
// per-class swatches sit in each group's <summary>, and hover/click
// delegation is wired in `_wireFortressSigmaEvents`. See the post-
// 2026-05 retire-classes-tab commit for the rationale.

// Resize the canvas backing store to match its CSS size so the line is
// crisp on any window width. Called on each render; cheap if unchanged.
//
// IMPORTANT: uses clientWidth/clientHeight (CSS layout box, unaffected
// by CSS transforms) rather than getBoundingClientRect() (which returns
// the transformed visual box). With the 3D tilt feature, using rect.width
// creates a positive-shrink feedback loop: each render reads a smaller
// transformed rect, writes it to canvas.width, flex layout shrinks the
// container, next rect is even smaller. clientWidth breaks that cycle
// because it's the pre-transform layout size.
function _topoResize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { cssW, cssH, dpr };
}

// Cell i maps to an angle around the vug. 0 starts at the top (12 o'clock)
// and increases clockwise so left-right hover motion feels natural.
function _topoAngleFor(i, N) {
  return -Math.PI / 2 + (i / N) * 2 * Math.PI;
}

// ─── Habit-driven edge textures ──────────────────────────────────────
// Maps each crystal habit string to a texture token. Missing entries
// fall through to 'smooth' (the existing Bezier — no visible change).
// Populated incrementally per stage. See
// proposals/PROPOSAL-EDGE-TEXTURES.md.
// Habit-keyed defaults applied to any mineral. Mineral-specific
// overrides go in HABIT_TO_TEXTURE_BY_MINERAL below and take priority.
const HABIT_TO_TEXTURE = {
  // Stage 1 — calcite habits.
  'scalenohedral':       'dogtooth',  // sharp tall triangles (T>200°C; "dog-tooth spar")
  'rhombohedral':        'rhomb',     // broader, shorter triangles (T<200°C, e.g. MVT)
  // Stage 2 — cubic / isometric habits.
  'cubic':               'cube_edge', // pyrite, halite, fluorite, native Cu (galena overridden below)
  'pyritohedral':        'cube_edge', // pyrite alt — pentagonal faces, still blocky
  'cubo-pyritohedral':   'cube_edge', // pyrite mixed
  'pseudo_cubic':        'cube_edge', // chalcopyrite high-T
  // Stage 3 — botryoidal / globular / framboidal (rounded aggregates).
  'botryoidal':          'botryoidal', // chrysocolla, malachite, hematite kidney ore, smithsonite
  'spherulitic':         'botryoidal', // mesolite-style radial bundles read as scalloped on edge
  'framboidal':          'botryoidal', // pyrite microspheres (sweetwater style)
  'reniform_globules':   'botryoidal', // chrysocolla — bigger lobes, same family
  'botryoidal_crust':    'botryoidal', // chrysocolla
  // Stage 4 — acicular / needle / radiating bundles.
  // PLACEHOLDER: dispatches to sawtooth with dogtooth-cloned params
  // pending its own design (true acicular wants a denser, spikier feel).
  'acicular':            'acicular',   // apatite, hemimorphite alt
  'acicular_needle':     'acicular',   // aragonite, bismuthinite low-T
  'acicular sprays':     'acicular',   // (with-space variant)
  'radiating_blade':     'acicular',   // marcasite
  'radiating_columnar':  'acicular',   // hemimorphite
  'radiating_cluster':   'acicular',   // bismuthinite
  'radiating_spray':     'acicular',   // stibnite
  'radiating_fibrous':   'acicular',   // erythrite on cobaltite, etc.
  'cockscomb':           'acicular',   // marcasite — iconic habit name
  'spearhead':           'acicular',   // marcasite
  'elongated_prism_blade': 'acicular', // stibnite Ichinokawa
  'fibrous_acicular':    'acicular',   // chalcedony-style fibrous, also annabergite
  'plumose_rosette':     'acicular',   // erythrite plumose
  // Stage 5 — dolomite habits (THE headline texture: saddle_rhomb).
  'saddle_rhomb':        'saddle_rhomb', // dolomite default — diagnostic curved-face habit
  'coarse_rhomb':        'rhomb',        // dolomite hydrothermal (textbook flat-face rhomb)
};

// Mineral-specific overrides: HABIT_TO_TEXTURE_BY_MINERAL[mineral][habit]
// wins over HABIT_TO_TEXTURE[habit]. Used when one habit string covers
// minerals that should look distinct (e.g. galena's cubic cleavage is
// deeper / more stepped than pyrite's compact cube faces).
const HABIT_TO_TEXTURE_BY_MINERAL = {
  galena: {
    'cubic': 'cube_edge_deep',   // taller V's — stepped cubic cleavage signature
  },
  fluorite: {
    'cubic': 'cube_edge_deep',   // fluorite cube cleavage is similarly bold
  },
};

// Per-texture parameters. amplitude_factor scales tooth height from
// crystal thickness (real scalenohedra are 3:1+ height:base, so factors
// >1 are correct, not exuberant); pitch_mm sets tooth spacing.
//
// max_amplitude_pitch_ratio (optional) caps amplitude at pitch × ratio,
// to enforce a maximum aspect ratio. cube faces want ~90° peaks
// (ratio 0.5) so they don't render as needles on thick crystals;
// scalenohedra are unbounded (cap omitted) so they can elongate fully.
const TEXTURE_PARAMS = {
  dogtooth:       { amplitude_factor: 1.5, pitch_mm: 2.0 },
  rhomb:          { amplitude_factor: 0.7, pitch_mm: 2.0 },
  cube_edge:      { amplitude_factor: 1.0, pitch_mm: 1.5, max_amplitude_pitch_ratio: 0.5 },
  cube_edge_deep: { amplitude_factor: 1.5, pitch_mm: 1.5, max_amplitude_pitch_ratio: 1.0 },
  // Botryoidal: max ratio 0.5 means at saturation each bump is a perfect
  // half-circle (amplitude = pitch/2). Below saturation bumps flatten into
  // gentle scallops — still reads as round, just less plump.
  botryoidal:     { amplitude_factor: 1.0, pitch_mm: 2.5, max_amplitude_pitch_ratio: 0.5 },
  // Acicular PLACEHOLDER — clones dogtooth's params pending its own
  // design. Future polish: denser pitch, taller amplitude, possibly
  // a "needle bundle" function that draws many tightly-packed spikes
  // instead of a sawtooth. Token kept distinct so swap is one line.
  acicular:       { amplitude_factor: 1.5, pitch_mm: 2.0 },
  // Saddle rhomb — dolomite's diagnostic curved-face signature.
  // bulge_factor controls how far each face bows outward in chord
  // direction (0 = straight rhomb, 1 = extreme curl). 0.4 gives a
  // visibly-curved-but-still-rhomb feel matching textbook saddle
  // dolomite cross-sections.
  saddle_rhomb:   { amplitude_factor: 0.7, pitch_mm: 2.5, max_amplitude_pitch_ratio: 0.5, bulge_factor: 0.4 },
};

// Draw the inner (fluid-facing) edge of a wedge from (fromX,fromY) to
// (toX,toY). For 'smooth', emits the existing quadratic Bezier through
// (controlX,controlY) — bit-for-bit identical to the pre-refactor code.
//
// Direction note: the wedge path traverses outer-start → outer-end →
// inner-end → inner-start, so this function draws inner edge END→START.
// Textured polylines must respect that direction or the fill winds wrong.
//
// thicknessMm/cellArcMm bound the texture amplitude; (cx,cy) gives the
// vug center so textures can compute the inward (toward-void) normal.
// `mineral` enables per-mineral overrides where one habit string is
// shared by minerals that should look distinct (e.g. galena vs pyrite,
// both 'cubic').
function drawHabitTexture(ctx, mineral, habit, fromX, fromY, toX, toY, controlX, controlY, thicknessMm, cellArcMm, mmToPx, cx, cy) {
  const texture = _resolveTexture(mineral, habit);
  switch (texture) {
    case 'dogtooth':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.dogtooth);
      return;
    case 'rhomb':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.rhomb);
      return;
    case 'cube_edge':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.cube_edge);
      return;
    case 'cube_edge_deep':
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.cube_edge_deep);
      return;
    case 'botryoidal':
      _texture_botryoidal(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.botryoidal);
      return;
    case 'acicular':
      // PLACEHOLDER: same _texture_sawtooth as dogtooth pending its own
      // design. Swap this line when a real acicular function arrives.
      _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.acicular);
      return;
    case 'saddle_rhomb':
      _texture_saddle_rhomb(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, TEXTURE_PARAMS.saddle_rhomb);
      return;
    case 'smooth':
    default:
      ctx.quadraticCurveTo(controlX, controlY, toX, toY);
      return;
  }
}

// Resolve a (mineral, habit) pair to a texture token. Priority:
//   1. mineral-specific override (HABIT_TO_TEXTURE_BY_MINERAL)
//   2. exact habit match (HABIT_TO_TEXTURE)
//   3. fuzzy substring fallback (catches variant strings like
//      'botryoidal_crust', 'reniform_globules', 'botryoidal/stalactitic'
//      without enumerating every permutation)
//   4. 'smooth' default
function _resolveTexture(mineral, habit) {
  const byMineral = mineral && HABIT_TO_TEXTURE_BY_MINERAL[mineral];
  if (byMineral && byMineral[habit]) return byMineral[habit];
  if (habit && HABIT_TO_TEXTURE[habit]) return HABIT_TO_TEXTURE[habit];
  if (habit) {
    const h = habit.toLowerCase();
    if (h.includes('botryoidal') || h.includes('reniform') || h.includes('globule') || h.includes('framboidal')) return 'botryoidal';
    if (h.includes('acicular') || h.includes('needle') || h.includes('radiating') || h.includes('spray') || h.includes('cockscomb') || h.includes('plumose')) return 'acicular';
  }
  return 'smooth';
}

// Texture amplitude in mm. Primary control is physical (thickness ×
// factor). Optional max_amplitude_pitch_ratio caps amplitude to a
// fixed fraction of the pitch — e.g. cube_edge sets it to 0.5 to
// enforce ≤90° peaks (height ≤ half-base) so thick cubic crystals
// render as blocky-square rather than needle-spike.
function _textureAmplitudeMm(thicknessMm, cellArcMm, params) {
  let amp = thicknessMm * params.amplitude_factor;
  if (params.max_amplitude_pitch_ratio != null) {
    amp = Math.min(amp, params.pitch_mm * params.max_amplitude_pitch_ratio);
  }
  return amp;
}

// Botryoidal — series of smooth half-circle bumps along the chord,
// each pushed inward toward the void. Uses one quadratic Bezier per
// bump with the control point at amplitude × 2 inward (so the curve
// at t=0.5 lands at exactly amplitude inward, giving a clean scallop).
// At amplitude saturation (max_amplitude_pitch_ratio = 0.5) each bump
// is a perfect half-circle ⌒⌒⌒. Below saturation, gentle scallops.
//
// Used by chrysocolla, malachite, hematite kidney ore, framboidal
// pyrite, smithsonite — anywhere the habit string suggests "round
// blobs on the wall" rather than crystalline points or faces.
function _texture_botryoidal(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nBumps = Math.max(1, Math.round(len / pitchPx));
  const bumpLen = len / nBumps;
  // Pen at (fromX,fromY); emit a quadratic Bezier per bump → (toX,toY).
  // Control point at segment midpoint pushed inward by 2×amplitude so
  // the Bezier passes through (chord_mid + amplitude × inward_normal)
  // at t=0.5. (Quadratic at t=0.5 = (start + 2·control + end)/4.)
  for (let i = 0; i < nBumps; i++) {
    const t0 = i * bumpLen;
    const t1 = (i + 1) * bumpLen;
    const startX = fromX + t0 * ux, startY = fromY + t0 * uy;
    const endX   = fromX + t1 * ux, endY   = fromY + t1 * uy;
    const segMidX = (startX + endX) / 2, segMidY = (startY + endY) / 2;
    const cpX = segMidX + nx * amplitudePx * 2;
    const cpY = segMidY + ny * amplitudePx * 2;
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
  }
}

// Saddle rhomb — dolomite's diagnostic curved-face signature. Each
// tooth has the sawtooth tip-pushed-inward geometry of rhomb, but
// each side is a quadratic Bezier with the control point bulged in
// the chord direction AWAY from the tooth's apex. That bows each
// face outward, giving the wider-at-middle / narrower-at-tip "saddle"
// profile you see in real dolomite cross-sections.
//
// bulge_factor (0..1) sets how far the control points are offset in
// chord-space relative to half the tooth length. 0 = straight V
// (degenerate to rhomb); ~0.4 = textbook saddle; ~0.8 = exaggerated
// fish-scale feel.
//
// This is the texture that makes ordered dolomite (Kim 2023 sabkha
// scenario) visibly distinct from straight calcite rhombohedra on
// the wall — the "dolomite problem" reveal in pictorial form.
function _texture_saddle_rhomb(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nTeeth = Math.max(1, Math.round(len / pitchPx));
  const toothLen = len / nTeeth;
  const bulgePx = (params.bulge_factor != null ? params.bulge_factor : 0.4) * (toothLen / 2);
  for (let i = 0; i < nTeeth; i++) {
    const t0 = i * toothLen;
    const tipT = (i + 0.5) * toothLen;
    const t1 = (i + 1) * toothLen;
    const startX = fromX + t0 * ux, startY = fromY + t0 * uy;
    const tipX   = fromX + tipT * ux + nx * amplitudePx;
    const tipY   = fromY + tipT * uy + ny * amplitudePx;
    const endX   = fromX + t1 * ux, endY = fromY + t1 * uy;
    // Side 1 (start → tip): control point at chord-midpoint of (start,tip),
    // pushed in -chord-direction (away from apex, toward t0).
    const cp1X = (startX + tipX) / 2 - ux * bulgePx;
    const cp1Y = (startY + tipY) / 2 - uy * bulgePx;
    ctx.quadraticCurveTo(cp1X, cp1Y, tipX, tipY);
    // Side 2 (tip → end): control point at chord-midpoint of (tip,end),
    // pushed in +chord-direction (away from apex, toward t1).
    const cp2X = (tipX + endX) / 2 + ux * bulgePx;
    const cp2Y = (tipY + endY) / 2 + uy * bulgePx;
    ctx.quadraticCurveTo(cp2X, cp2Y, endX, endY);
  }
}

// Sawtooth — shared by 'dogtooth' (sharp tall, T>200°C scalenohedral
// calcite — "dog-tooth spar") and 'rhomb' (shorter wider, T<200°C
// rhombohedral calcite). Both push triangular teeth inward toward the
// void; only the amplitude_factor and pitch_mm in `params` differ.
function _texture_sawtooth(ctx, fromX, fromY, toX, toY, thicknessMm, cellArcMm, mmToPx, cx, cy, params) {
  const dx = toX - fromX, dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) { ctx.lineTo(toX, toY); return; }
  const ux = dx / len, uy = dy / len;
  // Perpendicular pointing inward (toward vug center). Use chord
  // midpoint → center direction so we don't have to reason about
  // tangent rotation sign in canvas y-down coordinates.
  const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2;
  const inX = cx - midX, inY = cy - midY;
  const inLen = Math.sqrt(inX * inX + inY * inY) || 1;
  const nx = inX / inLen, ny = inY / inLen;
  const amplitudeMm = _textureAmplitudeMm(thicknessMm, cellArcMm, params);
  const amplitudePx = amplitudeMm * mmToPx;
  const pitchPx = params.pitch_mm * mmToPx;
  const nTeeth = Math.max(1, Math.round(len / pitchPx));
  const toothLen = len / nTeeth;
  // Pen is at (fromX,fromY); emit sawtooth → (toX,toY).
  // Each tooth: tip pushed inward by amplitudePx, then valley back on chord.
  for (let i = 0; i < nTeeth; i++) {
    const tipT = (i + 0.5) * toothLen;
    const valleyT = (i + 1) * toothLen;
    const tipX = fromX + tipT * ux + nx * amplitudePx;
    const tipY = fromY + tipT * uy + ny * amplitudePx;
    const valleyX = fromX + valleyT * ux;
    const valleyY = fromY + valleyT * uy;
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(valleyX, valleyY);
  }
}

// Paint a centered placeholder hint into the topo canvas. Used when no
// active sim or no ring data exists yet, so the panel reads as 'waiting'
// rather than showing a 340px-tall void. Kept simple: one or two lines
// of muted text, no decoration. Sized via _topoResize so the rendering
// matches what topoRender uses for real content.
function _topoPaintPlaceholder(canvas, text) {
  const ctx = canvas.getContext('2d');
  const { cssW, cssH, dpr } = _topoResize(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  // The visible window is cssW/STAGE × cssH/STAGE because the canvas is
  // inside a 200%-sized stage; place the placeholder in the centre of
  // that window so it appears centered regardless of the 2× canvas
  // headroom that exists for 3D rotation.
  const visW = cssW / TOPO_STAGE_SCALE;
  const visH = cssH / TOPO_STAGE_SCALE;
  const cx = cssW / 2;
  const cy = cssH / 2;
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#5a4a30';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Wrap the text manually — split on the em-dash if too long for the
  // visible window.
  const maxLineW = visW * 0.85;
  const measure = ctx.measureText(text);
  if (measure.width > maxLineW && text.includes(' — ')) {
    const [a, b] = text.split(' — ');
    ctx.fillText(a, cx, cy - 9);
    ctx.fillText('— ' + b, cx, cy + 9);
  } else {
    ctx.fillText(text, cx, cy);
  }
}

// Phase B (Tier 1.5) — per-vertex 3D projection helper.
// Maps a world-space point (relative to the scene origin) to a screen-
// space point via Yaw → Pitch rotation + perspective. Replaces the
// tier-1 CSS transform: projection done in canvas math instead of GPU
// composite, so per-cell vertices land where the user actually sees
// them (and depth-sorting / multi-ring stacking become possible).
//
//   wx, wy, wz : world-space coords in px (z+ toward camera at zero tilt)
//   tiltX, tiltY : pitch and yaw in radians
//   F : perspective focal length in px (1200 matches tier-1's CSS perspective())
//
// Returns [screenX, screenY, projectedZ] — screenX/Y are offsets from
// the scene origin (caller adds cx/cy). projectedZ is post-rotation z,
// useful for back-to-front depth sorting (smallest first = farthest).
function _topoProject3D(wx, wy, wz, tiltX, tiltY, F) {
  // Yaw around Y first, so x rotates with z.
  const cy_ = Math.cos(tiltY), sy_ = Math.sin(tiltY);
  const x1 = cy_ * wx + sy_ * wz;
  const y1 = wy;
  const z1 = -sy_ * wx + cy_ * wz;
  // Pitch around X next, so y rotates with z.
  const cx_ = Math.cos(tiltX), sx_ = Math.sin(tiltX);
  const x2 = x1;
  const y2 = cx_ * y1 - sx_ * z1;
  const z2 = sx_ * y1 + cx_ * z1;
  // Perspective divide. Clamp denominator so points at/behind the
  // camera don't flip wildly — they'll be pushed off-screen but still
  // produce finite numbers the canvas API accepts.
  const denom = F - z2;
  const scale = F / (denom < 1 ? 1 : denom);
  return [x2 * scale, y2 * scale, z2];
}

// Phase C v1 made crystals scatter across all rings, but the 2D topo
// strip and the hit-test were still reading rings[0] only — which
// after scatter is mostly empty. Result: 2D mode mostly hid crystals,
// and hover-tooltip mostly returned "vugg wall" because the queried
// ring 0 cell was empty. This helper builds a synthetic "aggregate
// ring": for each cell index, the most-prominent crystal across any
// ring is collapsed onto one slot. Geometry (base_radius_mm) is taken
// from rings[0] since that's uniform across rings. Lossy — the 2D
// view can't tell which ring a crystal was on — but it makes
// everything visible and hover-clickable.
function _topoAggregateRing(wall) {
  if (!wall || !wall.rings || !wall.rings.length) return [];
  const ring0 = wall.rings[0];
  const N = ring0.length;
  // Shallow-copy ring 0 so we can overlay other rings without mutating
  // the simulation state.
  const out = ring0.map(c => ({
    wall_depth: c.wall_depth,
    crystal_id: c.crystal_id,
    mineral: c.mineral,
    thickness_um: c.thickness_um,
    base_radius_mm: c.base_radius_mm,
  }));
  // For each cell index, walk rings[1..] and take the thickest
  // crystal seen. Ties go to the lowest ring index (deterministic).
  for (let r = 1; r < wall.rings.length; r++) {
    const ring = wall.rings[r];
    if (!ring || !ring.length) continue;
    for (let i = 0; i < N; i++) {
      const cell = ring[i];
      if (cell.crystal_id == null) continue;
      if (cell.thickness_um > out[i].thickness_um) {
        out[i].crystal_id = cell.crystal_id;
        out[i].mineral = cell.mineral;
        out[i].thickness_um = cell.thickness_um;
      }
    }
  }
  return out;
}

// Slice resolver: returns the ring data the 2D path should display
// based on `_topoActiveSlice`. 'aggregate' → aggregate ring (post-
// scatter default); int N → wall.rings[N] directly. Out-of-range
// indices clamp back to aggregate so the stepper can never wedge
// itself on a stale ring count after a scenario reload.
function _topoActiveRingForRender(wall) {
  if (!wall || !wall.rings || !wall.rings.length) return [];
  if (_topoActiveSlice === 'aggregate') return _topoAggregateRing(wall);
  const idx = _topoActiveSlice | 0;
  if (idx < 0 || idx >= wall.rings.length) {
    _topoActiveSlice = 'aggregate';
    _topoUpdateSliceLabel(wall);
    return _topoAggregateRing(wall);
  }
  return wall.rings[idx];
}

// Cycle through [aggregate, 0, 1, ..., ring_count-1, aggregate, ...]
// in either direction. dir=+1 advances; dir=-1 goes back. Wraps at
// both ends. Re-renders and updates the label after each step.
function topoCycleSlice(dir) {
  const sim = topoActiveSim();
  const wall = sim ? sim.wall_state : null;
  const n = wall ? wall.ring_count : 0;
  if (n <= 1) {
    // Single-ring sim — no stepper to cycle. Stay aggregated.
    _topoActiveSlice = 'aggregate';
    _topoUpdateSliceLabel(wall);
    return;
  }
  // The state space has n + 1 entries: 'aggregate', 0, 1, ..., n-1.
  // Encode as integers 0..n where 0 = 'aggregate'; cycle there, then
  // decode back to either 'aggregate' or an int.
  const cur = (_topoActiveSlice === 'aggregate') ? 0 : (_topoActiveSlice + 1);
  const next = ((cur + dir) % (n + 1) + (n + 1)) % (n + 1);
  _topoActiveSlice = (next === 0) ? 'aggregate' : (next - 1);
  _topoUpdateSliceLabel(wall);
  topoRender();
}

// Repaint the slice-stepper label to match `_topoActiveSlice`.
// Called from topoCycleSlice and from topoRender (so the label stays
// in sync if a scenario reload trims the ring count under us).
function _topoUpdateSliceLabel(wall) {
  const lab = document.getElementById('topo-slice-label');
  if (!lab) return;
  if (_topoActiveSlice === 'aggregate') {
    lab.textContent = 'All slices';
    return;
  }
  const idx = _topoActiveSlice | 0;
  const orient = (wall && wall.ringOrientation)
    ? wall.ringOrientation(idx) : '';
  const total = wall ? wall.ring_count : 0;
  // "5/16 wall" — compact; the orientation tag tells the player
  // they're looking at a floor / wall / ceiling slice without a
  // separate UI element.
  lab.textContent = `${idx + 1}/${total} ${orient}`.trim();
}

function topoRender(optOverrideRing) {
  const canvas = document.getElementById('topo-canvas');
  const panel = document.getElementById('topo-panel');
  if (!canvas || !panel || panel.style.display === 'none') return;

  const sim = topoActiveSim();
  const wall = sim ? sim.wall_state : null;
  // Slice stepper resolves to either the aggregate (default) or a
  // specific ring index. Replay snapshots are already a single ring
  // shape, so optOverrideRing falls through unchanged.
  const ring0 = optOverrideRing || (wall && _topoActiveRingForRender(wall));
  // Keep the stepper label in sync — cheap, runs every render.
  if (wall) _topoUpdateSliceLabel(wall);

  // Empty-state guard: no active sim or no ring data yet (fresh page,
  // pre-first-Grow). Paint a centered placeholder so the panel reads as
  // 'waiting for a vug' rather than a 340px-tall void. Without this the
  // first impression of Current Game is a cavernous empty box, which
  // looks like a render bug.
  if (!sim && !optOverrideRing) {
    _topoPaintPlaceholder(canvas, 'Press Grow to generate a vug — the wall profile will appear here');
    const btn = document.getElementById('topo-replay-btn');
    if (btn) btn.style.display = 'none';
    const sizeLabel = document.getElementById('topo-vug-size');
    if (sizeLabel) sizeLabel.textContent = '';
    return;
  }
  if (!ring0 || !ring0.length) {
    _topoPaintPlaceholder(canvas, 'Vug initialized — waiting for first growth step…');
    return;
  }

  // Only show the Replay button once there's history to play back.
  const btn = document.getElementById('topo-replay-btn');
  if (btn) btn.style.display = (sim && sim.wall_state_history && sim.wall_state_history.length) ? 'flex' : 'none';
  // Legacy `topoBuildLegend()` call lived here. The legend was a
  // class-swatch list; that role moved into the fortress-status sigma
  // panel (each class group's swatch + the per-pill hover-highlight),
  // and the legacy <details class="topo-legend-drop"> element is gone.

  const ctx = canvas.getContext('2d');
  const { cssW, cssH, dpr } = _topoResize(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const N = ring0.length;
  const initR = wall ? wall.initial_radius_mm : 25;

  // Scale monotonically: use max_seen_radius_mm (seeded at 2× initial
  // radius, only grows) so the rendered vug doesn't shrink back when
  // new dissolution doesn't push further than the running max.
  let maxWallR = wall ? wall.max_seen_radius_mm : initR * 2;
  for (const c of ring0) {
    const r = initR + c.wall_depth;
    if (r > maxWallR) maxWallR = r;
  }
  if (wall && maxWallR > wall.max_seen_radius_mm) wall.max_seen_radius_mm = maxWallR;
  const centerPad = 48;  // leave room for the scale bar and legend
  // The canvas lives inside a 2×-sized stage inside the overflow:hidden
  // wrap. cssW/cssH are the CANVAS buffer dimensions (2× the visible
  // window); fit the slice to the VISIBLE window (cssW/STAGE, cssH/STAGE)
  // so it occupies the same on-screen area as before. The extra canvas
  // area becomes "rotation headroom" — slice can tilt freely within the
  // buffer and the wrap's overflow:hidden clips the view to the window.
  const viewW = cssW / TOPO_STAGE_SCALE;
  const viewH = cssH / TOPO_STAGE_SCALE;
  const fit = Math.min(viewW, viewH - centerPad) * 0.82 / 2;
  const mmToPx = (fit / maxWallR) * _topoZoom;

  // Pan offsets let the user drag the vug around the canvas. Hit-test
  // and tooltip code below MUST apply the same offsets or clicks will
  // miss what the user sees on screen.
  const cx = cssW / 2 + _topoPanX;
  const cy = (cssH - centerPad) / 2 + 8 + _topoPanY;

  // Per-cell outer radius in px. Phase 1: each cell has its own
  // base_radius_mm baked from the Fourier profile, so cellR[i] already
  // varies cell-to-cell even on a pristine vug. Dissolution stacks on
  // top via wall_depth. Fallback to initR for snapshots saved before
  // the Phase-1 schema (base_radius_mm=0 by default).
  const cellR = new Array(N);
  for (let i = 0; i < N; i++) {
    const cell = ring0[i];
    const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
    cellR[i] = (baseR + cell.wall_depth) * mmToPx;
  }

  // Boundary radii — average the two adjacent cell radii so each cell's
  // wedge shares its endpoints with its neighbors'. Without this the
  // outline would render as disconnected circular arcs with radial
  // "teeth" at every cell boundary once the bubble-merge profile puts
  // neighbouring cells at different radii.
  const boundaryR = new Array(N);
  for (let i = 0; i < N; i++) {
    const prev = (i - 1 + N) % N;
    boundaryR[i] = (cellR[prev] + cellR[i]) / 2;
  }

  // Find the heaviest crystal on the wall so stroke widths scale to
  // something meaningful (1 big crystal vs. 1 microcrystal).
  let maxT = 0;
  for (const c of ring0) if (c.thickness_um > maxT) maxT = c.thickness_um;
  if (maxT <= 0) maxT = 1;

  const arcStep = 2 * Math.PI / N;

  // Phase B branch — 3D mode renders all rings stacked along a vertical
  // axis using per-vertex projection. Hands off to _topoRenderRings3D
  // and short-circuits the rest of the 2D path. 2D mode falls through
  // unchanged. See PROPOSAL-3D-TOPO-VUG.md ("Tier 1.5") for design.
  if (_topoView3D && wall && wall.rings && wall.rings.length) {
    _topoRenderRings3D(ctx, sim, wall, ring0, cellR, boundaryR, cx, cy,
                       mmToPx, maxT, arcStep, N, viewW, viewH);
    return;
  }

  // Radial wedges: each occupied cell gets a Bezier-bounded wedge.
  // Outer edge arcs from boundary_start → cell_midpoint → boundary_end
  // via quadraticCurveTo (cell midpoint = control point), which matches
  // the next cell's starting boundary and yields a smooth curve through
  // the cell instead of a V-shaped two-segment polyline. Inner edge
  // mirrors the outer with an absolute inward offset.
  //
  // Inner offset is thickness × void_reach in mm, scaled to pixels.
  // Adjacent cells painted by the same crystal share thickness, so they
  // share the inward offset → inner edges line up at shared boundaries
  // and the band stays annular even across dip/bulge neighbours.
  // Inner edge is floored at 15% of each point's outer radius so a
  // very thick crystal in a dip cell still leaves a visible void.
  for (let i = 0; i < N; i++) {
    const cell = ring0[i];
    if (cell.crystal_id == null) continue;
    const a0 = _topoAngleFor(i, N) - arcStep / 2;
    const aMid = _topoAngleFor(i, N);
    const a1 = a0 + arcStep;
    const rStart = boundaryR[i];
    const rMid = cellR[i];
    const rEnd = boundaryR[(i + 1) % N];
    const crystal = sim?.crystals?.find(c => c.crystal_id === cell.crystal_id);
    const voidReach = crystal ? Math.max(crystal.void_reach, 0.05) : 0.5;
    const inwardMm = (cell.thickness_um / 1000.0) * voidReach;
    const inwardPx = Math.max(inwardMm * mmToPx, TOPO_WALL_STROKE_PX + 1);
    const rStartIn = Math.max(rStart - inwardPx, rStart * (1 - TOPO_CRYSTAL_CAP_FRAC));
    const rMidIn = Math.max(rMid - inwardPx, rMid * (1 - TOPO_CRYSTAL_CAP_FRAC));
    const rEndIn = Math.max(rEnd - inwardPx, rEnd * (1 - TOPO_CRYSTAL_CAP_FRAC));
    // The Bezier control point needs to be PLACED so the curve actually
    // passes through (rMid, aMid). For a quadratic Bezier parametrised
    // at t=0.5, the curve point = (start + 2·control + end) / 4. So
    // control = 2·target − (start + end)/2. Applied to each of outer
    // and inner edges.
    const sx = cx + rStart * Math.cos(a0), sy = cy + rStart * Math.sin(a0);
    const mx = cx + rMid * Math.cos(aMid), my = cy + rMid * Math.sin(aMid);
    const ex = cx + rEnd * Math.cos(a1), ey = cy + rEnd * Math.sin(a1);
    const outerCpX = 2 * mx - (sx + ex) / 2;
    const outerCpY = 2 * my - (sy + ey) / 2;
    const sxIn = cx + rStartIn * Math.cos(a0), syIn = cy + rStartIn * Math.sin(a0);
    const mxIn = cx + rMidIn * Math.cos(aMid), myIn = cy + rMidIn * Math.sin(aMid);
    const exIn = cx + rEndIn * Math.cos(a1), eyIn = cy + rEndIn * Math.sin(a1);
    const innerCpX = 2 * mxIn - (sxIn + exIn) / 2;
    const innerCpY = 2 * myIn - (syIn + eyIn) / 2;
    ctx.globalAlpha = topoAlphaFor(cell.mineral);
    ctx.fillStyle = topoClassColor(cell.mineral);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(outerCpX, outerCpY, ex, ey);
    ctx.lineTo(exIn, eyIn);
    // Inner (fluid-facing) edge — dispatched on crystal habit. Unknown
    // habits fall through to 'smooth' (the original Bezier). Each cell
    // draws its own complete teeth on the local chord; for typical 5°
    // arcs the chord/arc difference is <0.5%, visually invisible.
    const thicknessMmForTex = cell.thickness_um / 1000.0;
    const cellArcMmForTex = (rMidIn * arcStep) / mmToPx;
    drawHabitTexture(ctx, cell.mineral, crystal?.habit, exIn, eyIn, sxIn, syIn, innerCpX, innerCpY, thicknessMmForTex, cellArcMmForTex, mmToPx, cx, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Wall outline — one quadratic Bezier per cell, with the cell's
  // midpoint as the de-facto pass-through. Control point is placed so
  // the curve passes exactly through (rMid, aMid) at t=0.5:
  //   control = 2·midpoint − (start + end)/2
  // Adjacent cells share boundary endpoints, so the outline flows as
  // a smooth continuous curve instead of a V-polyline. Bare cells
  // stroke thin amber; occupied cells stroke thicker in the mineral's
  // class_color, scaled to crystal thickness.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < N; i++) {
    const a0 = _topoAngleFor(i, N) - arcStep / 2;
    const aMid = _topoAngleFor(i, N);
    const a1 = a0 + arcStep;
    const rStart = boundaryR[i];
    const rMid = cellR[i];
    const rEnd = boundaryR[(i + 1) % N];
    const cell = ring0[i];
    let stroke, width, alpha;
    if (cell.crystal_id == null) {
      // Bare wall — amber, always fully opaque (wall is the substrate,
      // not a mineral; it shouldn't ghost with the highlight).
      stroke = TOPO_WALL_COLOR;
      width = TOPO_WALL_STROKE_PX;
      alpha = 1;
    } else {
      stroke = topoClassColor(cell.mineral);
      const t = Math.min(cell.thickness_um / maxT, 1);
      width = TOPO_WALL_STROKE_PX + t * (TOPO_WALL_STROKE_MAX_PX - TOPO_WALL_STROKE_PX);
      alpha = topoAlphaFor(cell.mineral);
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    const sx = cx + rStart * Math.cos(a0), sy = cy + rStart * Math.sin(a0);
    const mx = cx + rMid * Math.cos(aMid), my = cy + rMid * Math.sin(aMid);
    const ex = cx + rEnd * Math.cos(a1), ey = cy + rEnd * Math.sin(a1);
    const cpX = 2 * mx - (sx + ex) / 2;
    const cpY = 2 * my - (sy + ey) / 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpX, cpY, ex, ey);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Inclusion dots — render each host's swallowed crystals as small
  // colored circles WITHIN the host's currently-painted wall band.
  //
  // Placement model:
  //   * Find every ring-0 cell the host actually paints (crystal_id
  //     matches). That set IS the host's visible footprint on the topo.
  //   * Spread the inclusions across those cells, one-per-cell until
  //     we run out (then round-robin).
  //   * Each inclusion's radius uses its assigned cell's OWN local wall
  //     radius + the host's band offset at that cell. That way the dot
  //     sits inside the host's painted band at that cell, even when the
  //     bubble-merge profile makes adjacent cells differ by 10×.
  //   * Ghost alpha follows the inclusion's own mineral (highlight
  //     brief: "if you highlight the inclusion's mineral species, those
  //     dots go to 100% everywhere they appear").
  //
  // Why not use enc.wall_center_cell directly? Because that's where the
  // inclusion was anchored BEFORE the host engulfed it — once swallowed,
  // the inclusion moves with the host's spatial extent, and using its
  // old anchor angle puts the dot wherever the inclusion USED to be.
  // On a bubble-merge wall, that's often nowhere near the host's
  // current footprint, and with the old (host-radius × inclusion-angle)
  // combination the dot lands outside the wall entirely.
  _topoInclusions.length = 0;
  if (sim && sim.crystals) {
    for (const host of sim.crystals) {
      if (!host.enclosed_crystals || !host.enclosed_crystals.length) continue;
      if (host.dissolved || host.wall_center_cell == null) continue;

      // Build the host's painted-cell set. Fall back to its center cell
      // if nothing paints (a smaller overlapping crystal may have
      // overwritten its paint — rare but possible).
      const hostPaintedCells = [];
      for (let i = 0; i < N; i++) {
        if (ring0[i].crystal_id === host.crystal_id) hostPaintedCells.push(i);
      }
      if (!hostPaintedCells.length) hostPaintedCells.push(host.wall_center_cell);
      const mCells = hostPaintedCells.length;

      const voidReach = Math.max(host.void_reach, 0.05);
      const allIds = host.enclosed_crystals;
      // Cap visible dots per host — real Sweetwater-style calcite can
      // carry hundreds of pyrite or chalcopyrite inclusions and a
      // pointillist cluster reads as "this crystal is full of them."
      // Still cap high enough to avoid the canvas turning into noise.
      const MAX_PER_HOST = 80;
      const renderedIds = allIds.length > MAX_PER_HOST
        ? allIds.slice(0, MAX_PER_HOST)
        : allIds;
      const n = renderedIds.length;
      for (let k = 0; k < n; k++) {
        const enc = sim.crystals.find(c => c.crystal_id === renderedIds[k]);
        if (!enc) continue;

        // Spread inclusions evenly across painted cells. Floating index
        // gives a sub-cell offset used to fan dots within one cell when
        // more inclusions than cells.
        const cellPos = (k + 0.5) * mCells / n;
        const cellIdx = hostPaintedCells[Math.min(mCells - 1, Math.floor(cellPos))];
        const withinCell = cellPos - Math.floor(cellPos) - 0.5;  // −0.5 .. +0.5
        const cell = ring0[cellIdx];
        const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
        const rOuterCell = (baseR + cell.wall_depth) * mmToPx;
        const inwardMm = (cell.thickness_um / 1000.0) * voidReach;
        const inwardPx = Math.max(inwardMm * mmToPx, TOPO_WALL_STROKE_PX + 1);
        const rInnerCell = Math.max(rOuterCell - inwardPx, rOuterCell * (1 - TOPO_CRYSTAL_CAP_FRAC));
        const rMid = (rOuterCell + rInnerCell) / 2;
        // Cell angular centre, plus a small fan when multiple inclusions
        // land in the same cell (otherwise they'd stack exactly).
        const baseAngle = -Math.PI / 2 + (cellIdx / N) * 2 * Math.PI;
        const angle = baseAngle + withinCell * arcStep * 0.8;

        const x = cx + rMid * Math.cos(angle);
        const y = cy + rMid * Math.sin(angle);
        const dotR = Math.max(2.5, Math.min(5.5, enc.c_length_mm * mmToPx * 0.4));
        ctx.globalAlpha = topoAlphaFor(enc.mineral);
        ctx.fillStyle = topoClassColor(enc.mineral);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10, 10, 8, 0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
        _topoInclusions.push({ x, y, r: dotR + 2, crystal_id: enc.crystal_id, mineral: enc.mineral });
      }
    }
  }
  ctx.globalAlpha = 1;

  // (Removed the dotted initial-radius reference ring — with the
  // bubble-merge profile the wall is already irregular from t=0, so a
  // perfect-circle reference at initial_radius_mm misleads the eye
  // into reading crystals on near-nominal cells as "on the circle"
  // rather than "on the wall.")

  // Scale bar across the bottom: total wall circumference in mm.
  const circMm = wall ? Math.PI * wall.meanDiameterMm() : 0;
  if (circMm > 0) {
    // Scale bar sits at the bottom of the VISIBLE window (wrap), not
    // the bottom of the oversized canvas. Visible window is vertically
    // centered in the canvas; its bottom edge is at cssH/2 + viewH/2
    // = (cssH + viewH)/2.
    const barY = (cssH + viewH) / 2 - 18;
    const tenPx = 10 * mmToPx;
    const barX0 = cssW / 2 - tenPx / 2;
    ctx.strokeStyle = '#5a4a30';
    ctx.fillStyle = '#5a4a30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX0, barY);
    ctx.lineTo(barX0 + tenPx, barY);
    ctx.moveTo(barX0, barY - 3);
    ctx.lineTo(barX0, barY + 3);
    ctx.moveTo(barX0 + tenPx, barY - 3);
    ctx.lineTo(barX0 + tenPx, barY + 3);
    ctx.stroke();
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('10 mm', cssW / 2, barY + 14);
    // Overall diameter readout lives OUTSIDE the canvas — as an HTML
    // overlay on the wrap — so it stays fixed to the background while
    // the slice rotates in 3D mode. It's a description of the slice,
    // not content of the slice.
  }
  const sizeLabel = document.getElementById('topo-vug-size');
  if (sizeLabel) {
    if (wall) sizeLabel.textContent = `Vug ⌀ ${wall.meanDiameterMm().toFixed(1)} mm`;
    else sizeLabel.textContent = '';
  }
}

// ─── Wireframe-crystal primitive library ─────────────────────────────
// Hand-crafted polyhedra for the 3D-mode wireframe-crystal renderer.
// Convention (see proposals/PROPOSAL-WIREFRAME-CRYSTALS.md addendum A):
//   * c-axis = +y, base-anchored at y=-0.1, free tip at y=+1.0.
//   * equatorial extent = roughly ±0.5 (or wider for cube-ish shapes
//     so they read as cubic when c_length ≈ a_width).
//   * Each primitive scales by (a_width, c_length, a_width) at render
//     time and rotates around its c-axis (= inward sphere normal at
//     anchor cell) by a crystal_id-seeded random angle.
const PRIM_CUBE = {
  name: 'cube',
  vertices: [
    [-0.55, -0.1, -0.55], [ 0.55, -0.1, -0.55], [ 0.55, -0.1,  0.55], [-0.55, -0.1,  0.55],
    [-0.55,  1.0, -0.55], [ 0.55,  1.0, -0.55], [ 0.55,  1.0,  0.55], [-0.55,  1.0,  0.55],
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,0],   // base
    [4,5],[5,6],[6,7],[7,4],   // top
    [0,4],[1,5],[2,6],[3,7],   // verticals
  ],
};

const PRIM_OCTAHEDRON = {
  name: 'octahedron',
  vertices: [
    [ 0.0,  1.0,  0.0],   // 0 top apex
    [ 0.0, -0.1,  0.0],   // 1 bottom apex (buried)
    [ 0.55, 0.45, 0.0],   // 2 east
    [-0.55, 0.45, 0.0],   // 3 west
    [ 0.0,  0.45, 0.55],  // 4 north
    [ 0.0,  0.45,-0.55],  // 5 south
  ],
  edges: [
    [0,2],[0,3],[0,4],[0,5],   // top tip → equator
    [1,2],[1,3],[1,4],[1,5],   // bottom tip → equator
    [2,4],[4,3],[3,5],[5,2],   // equator
  ],
};

const PRIM_TETRAHEDRON = {
  name: 'tetrahedron',
  // 4 vertices: 1 apex + 3-cornered base. Slightly oversized so the
  // base sits below y=0 (buried) and the apex points into the cavity.
  vertices: (() => {
    const r = 0.55;
    return [
      [ 0.0,  1.0, 0.0],  // apex
      [ r * Math.cos(0),            -0.1, r * Math.sin(0)],
      [ r * Math.cos(2*Math.PI/3),  -0.1, r * Math.sin(2*Math.PI/3)],
      [ r * Math.cos(4*Math.PI/3),  -0.1, r * Math.sin(4*Math.PI/3)],
    ];
  })(),
  edges: [
    [0,1],[0,2],[0,3],   // apex → base
    [1,2],[2,3],[3,1],   // base triangle
  ],
};

const PRIM_RHOMBOHEDRON = {
  name: 'rhombohedron',
  // Calcite-style rhomb: parallelepiped where all 6 faces are rhombs.
  // Topologically a cube but with the top face rotated 60° around the
  // c-axis relative to the bottom — gives the canonical "tilted" look.
  vertices: (() => {
    const vs = [];
    const r = 0.55;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI / 2) + Math.PI / 4;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);  // base
    }
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI / 2) + Math.PI / 4 + Math.PI / 3;
      vs.push([r * Math.cos(a),  1.0, r * Math.sin(a)]);  // top, rotated 60°
    }
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ],
};

const PRIM_SCALENOHEDRON = {
  name: 'scalenohedron',
  // Calcite "dogtooth": doubly-pointed with a zigzag waist. 8 verts,
  // 12 edges. Three upper-mid vertices alternate with three lower-mid
  // around the equator, giving the characteristic facet zigzag.
  vertices: (() => {
    const vs = [
      [0,  1.0, 0],   // 0 top apex
      [0, -0.1, 0],   // 1 bottom apex (buried)
    ];
    const r = 0.45;
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a), 0.7, r * Math.sin(a)]);   // 2,3,4 upper-mid
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3 + Math.PI / 3;
      vs.push([r * Math.cos(a), 0.2, r * Math.sin(a)]);   // 5,6,7 lower-mid
    }
    return vs;
  })(),
  edges: [
    [0,2],[0,3],[0,4],   // top apex → upper-mid
    [1,5],[1,6],[1,7],   // bot apex → lower-mid
    // zigzag: each upper-mid connects to 2 adjacent lower-mids
    [2,5],[2,7], [3,5],[3,6], [4,6],[4,7],
  ],
};

const PRIM_HEX_PRISM = {
  name: 'hex_prism',
  vertices: (() => {
    const vs = [];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);   // 0..5 base hex
    }
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a),  1.0, r * Math.sin(a)]);   // 6..11 top hex
    }
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
    [6,7],[7,8],[8,9],[9,10],[10,11],[11,6],
    [0,6],[1,7],[2,8],[3,9],[4,10],[5,11],
  ],
};

const PRIM_HEX_PRISM_TERMINATED = {
  name: 'hex_prism_terminated',
  // Quartz: hex prism with a 6-faceted pyramidal cap on the free end.
  // 13 vertices (no buried apex — base hex sits at y=-0.1), 24 edges.
  vertices: (() => {
    const vs = [];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);   // 0..5 base hex
    }
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a),  0.8, r * Math.sin(a)]);   // 6..11 shoulder
    }
    vs.push([0, 1.0, 0]);                                  // 12 apex
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],          // base hex
    [6,7],[7,8],[8,9],[9,10],[10,11],[11,6],      // shoulder hex
    [0,6],[1,7],[2,8],[3,9],[4,10],[5,11],        // verticals
    [12,6],[12,7],[12,8],[12,9],[12,10],[12,11],  // pyramid ridges
  ],
};

const PRIM_DIPYRAMID = {
  name: 'dipyramid',
  // Hex bipyramid (barite, scheelite, anhydrite). Equatorial hex
  // pinching to apex on each end.
  vertices: (() => {
    const vs = [
      [0,  1.0, 0],
      [0, -0.1, 0],
    ];
    const r = 0.5;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      vs.push([r * Math.cos(a), 0.45, r * Math.sin(a)]);
    }
    return vs;
  })(),
  edges: [
    // top apex → equator
    [0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
    // bot apex → equator
    [1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
    // equator
    [2,3],[3,4],[4,5],[5,6],[6,7],[7,2],
  ],
};

const PRIM_PYRITOHEDRON = {
  name: 'pyritohedron',
  // 12 pentagonal faces (one of pyrite's classic forms). Topology:
  // 14 vertices = 8 cube-corners + 6 face-axis points.
  // Edges: 6 cube-edges of one chosen subset + 24 from corners to face
  // points = 30.
  vertices: (() => {
    const vs = [];
    const c = 0.5;
    // 8 cube corners
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      vs.push([c * sx, 0.45 + c * sy, c * sz]);
    }
    // 6 face-axis "stretch" points (offset inward from each cube face)
    const k = 0.7;  // pseudo-pyritohedral stretch
    vs.push([ c*k, 0.45, 0]);     // 8 +x
    vs.push([-c*k, 0.45, 0]);     // 9 -x
    vs.push([0, 0.45 + c*k, 0]);  // 10 +y
    vs.push([0, 0.45 - c*k, 0]);  // 11 -y
    vs.push([0, 0.45,  c*k]);     // 12 +z
    vs.push([0, 0.45, -c*k]);     // 13 -z
    return vs;
  })(),
  edges: [
    // Six "rib" cube-edges (one per face, alternating) — gives the
    // striated-cube look pyritohedrons read as.
    [0,1],[2,3],[4,5],[6,7],[0,4],[3,7],
    // Each face point connects to its 4 adjacent cube corners.
    // +x face (corners with sx=+1: indices 4,5,6,7)
    [8,4],[8,5],[8,6],[8,7],
    // -x face (sx=-1: 0,1,2,3)
    [9,0],[9,1],[9,2],[9,3],
    // +y face (sy=+1: 2,3,6,7)
    [10,2],[10,3],[10,6],[10,7],
    // -y face (sy=-1: 0,1,4,5)
    [11,0],[11,1],[11,4],[11,5],
    // +z face (sz=+1: 1,3,5,7)
    [12,1],[12,3],[12,5],[12,7],
    // -z face (sz=-1: 0,2,4,6)
    [13,0],[13,2],[13,4],[13,6],
  ],
};

const PRIM_TABULAR = {
  name: 'tabular',
  // Flat plate: half-height in the c-axis direction, full width in
  // the equatorial directions. Selenite / mica / wulfenite look.
  vertices: [
    [-0.55, -0.1, -0.55], [ 0.55, -0.1, -0.55], [ 0.55, -0.1,  0.55], [-0.55, -0.1,  0.55],
    [-0.55,  0.4, -0.55], [ 0.55,  0.4, -0.55], [ 0.55,  0.4,  0.55], [-0.55,  0.4,  0.55],
  ],
  edges: [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ],
};

const PRIM_ACICULAR = {
  name: 'acicular',
  // Slender needle: hex cross-section, very short equatorial extent
  // relative to c-length. Stibnite, natrolite, mesolite, sword gypsum.
  vertices: (() => {
    const vs = [];
    const r = 0.18;  // slim
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a), -0.1, r * Math.sin(a)]);
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3;
      vs.push([r * Math.cos(a),  0.95, r * Math.sin(a)]);
    }
    vs.push([0, 1.0, 0]);  // 6 apex
    return vs;
  })(),
  edges: [
    [0,1],[1,2],[2,0],
    [3,4],[4,5],[5,3],
    [0,3],[1,4],[2,5],
    [6,3],[6,4],[6,5],
  ],
};

const PRIM_DRIPSTONE = {
  name: 'dripstone',
  // Cave-mode tapered icicle. Hill & Forti 1997 (Cave Minerals of the
  // World): mature stalactites taper from a wide ceiling-anchored base
  // to a narrow drip tip, aspect ratio ~5-10:1, with vertical surface
  // ridges from streaming water down the flanks. Hexagonal cross-section
  // here is mostly a calcite-symmetry nod — natural dripstone is
  // smooth-circular, but the renderer's 6-fold visible ridges read as
  // the streaming-water grooves and align with calcite's underlying
  // crystallographic symmetry.
  //
  // Anchor at the *base* (y = -0.1, slightly buried) so when air-mode
  // c-axis flips put the crystal pointing world-down, the wide base
  // sits at the substrate (ceiling) and the tip points at the floor.
  // Stalagmite case (floor cell) reuses the same primitive flipped via
  // the renderer's existing fluid/air orientation logic — same taper,
  // opposite gravity vector.
  //
  // Geometry: 4 latitude rings × 6 longitudes + 1 apex. Radii taper
  // 0.55 → 0.42 → 0.27 → 0.13 → 0 (apex). Vertical extent normalized
  // to y=[-0.1, 1.0]; the renderer multiplies y by c_length_mm and
  // x/z by a_width_mm, so the natural 5-10:1 aspect ratio falls out
  // of the crystal's own dimensions when the air-mode habit kicks in.
  vertices: (() => {
    const vs = [];
    const NLON = 6;
    // Slim icicle profile. Crystal c_length_mm/a_width_mm already
    // encodes a partial aspect ratio (prismatic crystals land at ~2-3:1
    // in those dimensions); dropping the primitive's max radius from
    // 0.55 to 0.30 multiplies that to a believable 5-10:1 final aspect
    // for cave dripstone. Taper from base (0.30) → tip (0) over four
    // rings, with non-linear shrinkage (more taper near the base, less
    // near the tip) — matches photos of mature cave stalactites where
    // the lower 60% is nearly cylindrical and the apex acts like a
    // separate "drip nozzle".
    const rings = [
      { y: -0.10, r: 0.30 },   // base (ceiling-anchored)
      { y:  0.30, r: 0.22 },   // upper shoulder
      { y:  0.65, r: 0.13 },   // mid-shaft
      { y:  0.90, r: 0.06 },   // sub-tip neck
    ];
    for (const ring of rings) {
      for (let k = 0; k < NLON; k++) {
        const a = (k * 2 * Math.PI) / NLON;
        vs.push([ring.r * Math.cos(a), ring.y, ring.r * Math.sin(a)]);
      }
    }
    vs.push([0, 1.0, 0]);   // 24: apex (drip tip)
    return vs;
  })(),
  edges: (() => {
    const es = [];
    const NLON = 6;
    const NRINGS = 4;
    // Six longitudinal ridges — each spans ring 0..3 → apex (4 segments).
    for (let k = 0; k < NLON; k++) {
      for (let r = 0; r < NRINGS - 1; r++) {
        es.push([r * NLON + k, (r + 1) * NLON + k]);
      }
      // Ring 3 → apex.
      es.push([(NRINGS - 1) * NLON + k, NRINGS * NLON]);
    }
    // Base hex (anchors the silhouette at the substrate).
    for (let k = 0; k < NLON; k++) {
      es.push([k, (k + 1) % NLON]);
    }
    // Mid-shaft hex (ring 2) — mid-band detail so the silhouette
    // doesn't read as a smooth fanned bundle of single ridges.
    for (let k = 0; k < NLON; k++) {
      es.push([2 * NLON + k, 2 * NLON + ((k + 1) % NLON)]);
    }
    return es;
  })(),
};

const PRIM_BOTRYOIDAL = {
  name: 'botryoidal',
  // Spherulite mechanism (Wertheim et al. 2021; Quartz Page chalcedony):
  // each visible "grape" is a single nucleation point with hundreds-to-
  // thousands of acicular fibers radiating over a hemisphere, fiber-to-
  // fiber misorientation 0–22°. We approximate with ~20 representative
  // fibers fanning over the upper hemisphere from a single anchor at
  // the wall. The convex-hull silhouette is a smooth dome (not a multi-
  // bump cluster — those happen when the engine spawns adjacent
  // botryoidal crystals on neighbouring cells, which already happens
  // naturally because the habit's wall_spread is wide).
  vertices: (() => {
    const vs = [];
    vs.push([0, -0.05, 0]);                   // 0 anchor (slightly buried)
    // Hemisphere of fiber tips. 4 latitude bands × 6 longitudes,
    // skewed so more tips cluster near the apex than near the rim
    // (real spherulites have denser fibers near the perpendicular).
    const NLAT = 4, NLON = 6;
    for (let i = 0; i < NLAT; i++) {
      // Latitude angle from substrate (φ=0 = horizon, φ=π/2 = apex).
      // Bias toward the apex with i^0.7 so tips concentrate up-top.
      const t = (i + 1) / NLAT;
      const phi = (t * t * 0.7 + t * 0.3) * Math.PI / 2;
      const r = 0.5 * Math.cos(phi);
      const y = 1.0 * Math.sin(phi);
      for (let j = 0; j < NLON; j++) {
        // Stagger longitudes per band so adjacent latitude rings don't
        // align radially (more spherulite-like).
        const a = (j + 0.5 * (i % 2)) * 2 * Math.PI / NLON;
        vs.push([r * Math.cos(a), y, r * Math.sin(a)]);
      }
    }
    // One apex tip dead-center at y=1.0 to fix the silhouette top.
    vs.push([0, 1.0, 0]);
    return vs;
  })(),
  edges: (() => {
    const es = [];
    const NLAT = 4, NLON = 6;
    // Each fiber tip connects back to the anchor — that's the visible
    // wireframe radial pattern.
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        es.push([0, 1 + i * NLON + j]);
      }
    }
    es.push([0, 1 + NLAT * NLON]);  // apex fiber
    // Connect adjacent tips in each latitude band → suggests the
    // hemispheric envelope without fully outlining it.
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        const a = 1 + i * NLON + j;
        const b = 1 + i * NLON + ((j + 1) % NLON);
        es.push([a, b]);
      }
    }
    return es;
  })(),
};

// Habit string → primitive lookup. Direct hits checked first; the
// fuzzy-substring fallback in _lookupCrystalPrimitive catches the
// many compound forms in data/minerals.json (e.g. "rhombohedral_or_
// botryoidal", "saddle_rhomb_or_massive").
const HABIT_TO_PRIMITIVE = {
  'cubic':                          PRIM_CUBE,
  'pseudocubic':                    PRIM_CUBE,
  'pseudo_cubic':                   PRIM_CUBE,
  'cubo-pyritohedral':              PRIM_PYRITOHEDRON,
  'cubic_or_pyritohedral':          PRIM_PYRITOHEDRON,
  'cubic_or_octahedral':            PRIM_CUBE,
  'pyritohedral':                   PRIM_PYRITOHEDRON,
  'octahedral':                     PRIM_OCTAHEDRON,
  'tetrahedral':                    PRIM_TETRAHEDRON,
  'tetrahedral_or_massive':         PRIM_TETRAHEDRON,
  'rhombohedral':                   PRIM_RHOMBOHEDRON,
  'saddle_rhomb_or_massive':        PRIM_RHOMBOHEDRON,
  'rhombohedral_or_botryoidal':     PRIM_RHOMBOHEDRON,
  'rhombohedral_or_scalenohedral':  PRIM_RHOMBOHEDRON,
  'rhombohedral_or_tabular_or_botryoidal': PRIM_RHOMBOHEDRON,
  'botryoidal_or_rhombohedral':     PRIM_BOTRYOIDAL,
  'scalenohedral':                  PRIM_SCALENOHEDRON,
  'scalenohedral_or_rhombohedral':  PRIM_SCALENOHEDRON,
  'prismatic':                      PRIM_HEX_PRISM_TERMINATED,
  'short_prismatic':                PRIM_HEX_PRISM,
  'striated_prism':                 PRIM_HEX_PRISM_TERMINATED,
  'hex_prism':                      PRIM_HEX_PRISM_TERMINATED,
  'hex_prism_long':                 PRIM_HEX_PRISM_TERMINATED,
  'hexagonal_prism':                PRIM_HEX_PRISM_TERMINATED,
  'hexagonal_prism_or_botryoidal_campylite': PRIM_HEX_PRISM_TERMINATED,
  'prismatic_hex':                  PRIM_HEX_PRISM_TERMINATED,
  'prismatic_or_blocky':            PRIM_HEX_PRISM_TERMINATED,
  'prismatic_orthorhombic':         PRIM_HEX_PRISM_TERMINATED,
  'prismatic_tabular_pseudo_cubic': PRIM_CUBE,
  'prismatic_or_rosette':           PRIM_HEX_PRISM_TERMINATED,
  'tabular_prism':                  PRIM_HEX_PRISM_TERMINATED,
  'tabular':                        PRIM_TABULAR,
  'tabular_square':                 PRIM_TABULAR,
  'tabular_hex':                    PRIM_TABULAR,
  'hex_plate':                      PRIM_TABULAR,
  'hexagonal_platy':                PRIM_TABULAR,
  'tabular_plates':                 PRIM_TABULAR,
  'tabular_monoclinic':             PRIM_TABULAR,
  'tabular_or_prismatic_or_fibrous': PRIM_TABULAR,
  'platy_scales':                   PRIM_TABULAR,
  'micro_plates':                   PRIM_TABULAR,
  'acicular':                       PRIM_ACICULAR,
  'acicular_tuft':                  PRIM_ACICULAR,
  'tufted_spray':                   PRIM_ACICULAR,
  'elongated_blade':                PRIM_ACICULAR,
  'wire':                           PRIM_ACICULAR,
  'capillary':                      PRIM_ACICULAR,
  'columnar_or_cyclic_twinned':     PRIM_HEX_PRISM_TERMINATED,
  'cockscomb_or_spearhead':         PRIM_DIPYRAMID,
  'dipyramidal':                    PRIM_DIPYRAMID,
  'bipyramidal_alpha':              PRIM_DIPYRAMID,
  'disphenoidal_{112}':             PRIM_DIPYRAMID,
  'stellate_sixling':               PRIM_DIPYRAMID,
  'hexagonal_barrel':               PRIM_HEX_PRISM,
  'barrel':                         PRIM_HEX_PRISM,
  'hemimorphic_hexagonal':          PRIM_HEX_PRISM_TERMINATED,
  'deep_blue_prismatic':            PRIM_HEX_PRISM_TERMINATED,
  'botryoidal':                     PRIM_BOTRYOIDAL,
  'reniform':                       PRIM_BOTRYOIDAL,
  'botryoidal_or_acicular':         PRIM_BOTRYOIDAL,
  'botryoidal_or_mammillary_or_fibrous': PRIM_BOTRYOIDAL,
  'botryoidal_cryptocrystalline':   PRIM_BOTRYOIDAL,
  'cobalt_bloom_or_botryoidal':     PRIM_BOTRYOIDAL,
  'nickel_bloom_or_capillary':      PRIM_BOTRYOIDAL,
  'pitchblende_massive':            PRIM_BOTRYOIDAL,
  'massive_granular':               PRIM_BOTRYOIDAL,
  'earthy_crust':                   PRIM_BOTRYOIDAL,
  'stalactitic':                    PRIM_BOTRYOIDAL,
  'arborescent':                    PRIM_ACICULAR,
  'dendritic':                      PRIM_ACICULAR,
  // v26 polish: runtime-set habits from the engine (silica polymorphs,
  // calcite/aragonite habit pickers, supergene-product engines, etc.)
  // that previously fell through to PRIM_RHOMBOHEDRON. Audited against
  // the full list of crystal.habit assignments in this file.
  'tridymite (thin hexagonal plates)': PRIM_TABULAR,
  'β-quartz bipyramidal (paramorphic)': PRIM_DIPYRAMID,
  'scepter overgrowth possible':    PRIM_HEX_PRISM_TERMINATED,
  'chalcedony (microcrystalline)':  PRIM_BOTRYOIDAL,
  'opal (amorphous silica)':        PRIM_BOTRYOIDAL,
  'silica_gel_hemisphere':          PRIM_BOTRYOIDAL,
  'flos_ferri':                     PRIM_ACICULAR,   // aragonite "iron flowers"
  'acicular_needle':                PRIM_ACICULAR,
  'twinned_cyclic':                 PRIM_DIPYRAMID,  // cyclic-sextet twin → stellate
  'columnar':                       PRIM_HEX_PRISM_TERMINATED,
  'radiating_columnar':             PRIM_HEX_PRISM_TERMINATED,
  'coarse_rhomb':                   PRIM_RHOMBOHEDRON,
  'massive':                        PRIM_BOTRYOIDAL,
  'saddle_rhomb':                   PRIM_RHOMBOHEDRON,
  'spherulitic':                    PRIM_BOTRYOIDAL,
  'banding_agate':                  PRIM_BOTRYOIDAL,
  'fibrous_coating':                PRIM_BOTRYOIDAL,  // fibrous mat reads dome-like
  'hemimorphic_crystal':            PRIM_HEX_PRISM_TERMINATED,
  'platy_massive':                  PRIM_TABULAR,
  'micaceous_book':                 PRIM_TABULAR,    // mica = stacked sheets
  'rosette_radiating':              PRIM_BOTRYOIDAL,
  'rosette_bladed':                 PRIM_TABULAR,    // bladed rosette = thin plates
  'plumose_rosette':                PRIM_BOTRYOIDAL,
  'radiating_blade':                PRIM_TABULAR,
  'radiating_cluster':              PRIM_BOTRYOIDAL,
  'radiating_fibrous':              PRIM_BOTRYOIDAL,
  'radiating_spray':                PRIM_BOTRYOIDAL,
  'globular':                       PRIM_BOTRYOIDAL,
  'nodular':                        PRIM_BOTRYOIDAL,
  'framboidal':                     PRIM_BOTRYOIDAL, // raspberry-like clusters
  'granular':                       PRIM_BOTRYOIDAL,
  'powdery crust':                  PRIM_BOTRYOIDAL,
  'powdery_aggregate':              PRIM_BOTRYOIDAL,
  'powdery_disseminated':           PRIM_BOTRYOIDAL,
  'sublimation_crust':              PRIM_BOTRYOIDAL,
  'iridescent_coating':             PRIM_BOTRYOIDAL,
  'peacock_iridescent':             PRIM_BOTRYOIDAL,
  'specular':                       PRIM_TABULAR,    // specular hematite = basal pinacoid
  'thorn':                          PRIM_ACICULAR,
  'spearhead':                      PRIM_HEX_PRISM_TERMINATED,
  'reticulated':                    PRIM_HEX_PRISM_TERMINATED,
  'trapiche':                       PRIM_DIPYRAMID,  // star-shaped emerald
  'nugget':                         PRIM_BOTRYOIDAL,
  'hopper_growth':                  PRIM_CUBE,       // cubic skeletal
  'pseudomorph':                    PRIM_RHOMBOHEDRON, // shape inherits host; default
  'pseudomorph_after_azurite':      PRIM_TABULAR,    // azurite was tabular
  'pseudomorph_after_sulfide':      PRIM_RHOMBOHEDRON,
  'olive_hex_barrel':               PRIM_HEX_PRISM,
  'yellow_hex_barrel':              PRIM_HEX_PRISM,
  'goshenite':                      PRIM_HEX_PRISM_TERMINATED, // colorless beryl
  'nickel_bloom':                   PRIM_BOTRYOIDAL,
  'cobalt_bloom':                   PRIM_BOTRYOIDAL,    // erythrite efflorescence
  'cottonball':                     PRIM_BOTRYOIDAL,    // borax cottonball aggregate (Death Valley)

  'cabrerite':                      PRIM_TABULAR,       // Mg-bearing annabergite, fibrous-bladed
  'co_bearing':                     PRIM_BOTRYOIDAL,    // chemistry tag fallback (annabergite/erythrite are typically fibrous-massive)
  'cockscomb':                      PRIM_DIPYRAMID,     // marcasite/pyrite cockscomb aggregate
  'disphenoidal':                   PRIM_TETRAHEDRON,   // distorted tetrahedron (sphalerite/chalcopyrite)
  'banded':                         PRIM_BOTRYOIDAL,    // chalcedony/agate-style banding
  'druzy':                          PRIM_BOTRYOIDAL,    // sparkly carpet of micro-crystals
  'arsenolamprite':                 PRIM_BOTRYOIDAL,    // metallic As polymorph, massive
  'chalcotrichite':                 PRIM_ACICULAR,      // capillary cuprite "hair copper"
  'azurite_sun':                    PRIM_BOTRYOIDAL,    // radiating disc rosette
  'enamel_on_cuprite':              PRIM_BOTRYOIDAL,    // thin conformal film
  'endlichite_yellow':              PRIM_HEX_PRISM_TERMINATED,  // hex apatite-group prism
  'asterated':                      PRIM_DIPYRAMID,     // star-shaped (asterism)
  'default_habit':                  PRIM_RHOMBOHEDRON,
};

// Canonical primitives that map to PRIM_DRIPSTONE under air-mode growth.
// Cube / octahedron / tetrahedron / pyritohedron / tabular / dipyramid
// stay as their canonical form: galena cubes don't form icicles,
// barite tabulars stay tabular, marcasite cockscombs (dipyramid) keep
// their distinctive doubly-pointed silhouette. The air-mode override
// is structural — it answers "could this primitive plausibly be a
// hanging drip?" — not "is this habit string in some list".
function _isDripstoneEligibleCanonical(prim) {
  return prim === PRIM_HEX_PRISM_TERMINATED
      || prim === PRIM_HEX_PRISM
      || prim === PRIM_ACICULAR
      || prim === PRIM_RHOMBOHEDRON
      || prim === PRIM_SCALENOHEDRON
      || prim === PRIM_BOTRYOIDAL;
}

function _lookupCrystalPrimitive(crystal) {
  if (!crystal) return PRIM_RHOMBOHEDRON;
  // v24 air-mode override — crystals nucleated in vadose rings get
  // dripstone geometry instead of their canonical habit primitive,
  // when the canonical primitive is structurally compatible with a
  // hanging-drip silhouette. The renderer's existing c-axis flip
  // handles orientation: ceiling cells get c-axis world-down
  // (stalactite hanging), floor cells get c-axis world-up
  // (stalagmite standing).
  const canonical = _canonicalPrimitive(crystal);
  if (crystal.growth_environment === 'air'
      && _isDripstoneEligibleCanonical(canonical)) {
    return PRIM_DRIPSTONE;
  }
  return canonical;
}

// Canonical (fluid-mode) primitive for a crystal, ignoring growth
// environment. Direct table first, then the fuzzy-substring fallback
// catches compound habit strings + runtime-set engine habits.
function _canonicalPrimitive(crystal) {
  if (!crystal) return PRIM_RHOMBOHEDRON;
  const direct = HABIT_TO_PRIMITIVE[crystal.habit];
  if (direct) return direct;
  const h = (crystal.habit || '').toLowerCase();
  // Order matters: hopper checked BEFORE 'cube' since "hopper_growth"
  // doesn't contain "cube" but is cubic; 'opal' before 'plate' since
  // some opal variants get described "platy"; tabular/plate checked
  // before acicular since "tabular_or_prismatic_or_fibrous" should
  // resolve tabular not fibrous.
  if (h.includes('hopper'))                                 return PRIM_CUBE;
  if (h.includes('cube') || h.includes('cubic'))           return PRIM_CUBE;
  if (h.includes('pyritohed'))                              return PRIM_PYRITOHEDRON;
  if (h.includes('octahed'))                                return PRIM_OCTAHEDRON;
  if (h.includes('tetrahed'))                               return PRIM_TETRAHEDRON;
  if (h.includes('scalenohed') || h.includes('dogtooth'))   return PRIM_SCALENOHEDRON;
  if (h.includes('rhomb'))                                  return PRIM_RHOMBOHEDRON;
  if (h.includes('dipyramid') || h.includes('bipyramid')
      || h.includes('trapiche') || h.includes('twinned_cyclic')
      || h.includes('stellate'))                            return PRIM_DIPYRAMID;
  if (h.includes('barrel'))                                 return PRIM_HEX_PRISM;
  if (h.includes('hex_prism') || h.includes('hexagonal'))   return PRIM_HEX_PRISM_TERMINATED;
  if (h.includes('prism') || h.includes('columnar')
      || h.includes('hemimorphic') || h.includes('scepter')
      || h.includes('spearhead') || h.includes('reticulated')
      || h.includes('thorn'))                               return PRIM_HEX_PRISM_TERMINATED;
  if (h.includes('tabular') || h.includes('platy')
      || h.includes('plate') || h.includes('plates')
      || h.includes('micaceous') || h.includes('specular')
      || h.includes('bladed') || h.includes('blade'))       return PRIM_TABULAR;
  if (h.includes('acicular') || h.includes('needle')
      || h.includes('wire') || h.includes('capillary')
      || h.includes('flos_ferri'))                          return PRIM_ACICULAR;
  if (h.includes('botryoidal') || h.includes('reniform')
      || h.includes('mammillary') || h.includes('massive')
      || h.includes('earthy') || h.includes('stalactit')
      || h.includes('opal') || h.includes('chalcedony')
      || h.includes('agate') || h.includes('spherulit')
      || h.includes('globular') || h.includes('nodular')
      || h.includes('framboidal') || h.includes('granular')
      || h.includes('powdery') || h.includes('crust')
      || h.includes('rosette') || h.includes('plumose')
      || h.includes('radiating') || h.includes('iridescent')
      || h.includes('sublimation') || h.includes('coating')
      || h.includes('fibrous') || h.includes('nugget')
      || h.includes('silica_gel'))                          return PRIM_BOTRYOIDAL;
  if (h.includes('arborescent') || h.includes('dendritic')) return PRIM_ACICULAR;
  return PRIM_RHOMBOHEDRON;
}

// Deterministic float in [0, 1) seeded from an integer crystal_id.
// Reuses the same Mulberry32 the wall-state generator uses so the
// rotation around c-axis is reproducible across reloads / replays.
function _seededRand(seed) {
  return _mulberry32(seed | 0)();
}

// Box-Muller: deterministic standard-normal sample seeded from
// (crystal_id, channel). Channel lets a single crystal pull multiple
// independent normals — c-axis tilt-x, tilt-z, and rotation-around-c
// each get their own channel so they don't co-vary. Output is N(0, 1);
// callers multiply by the desired σ. Clamped to ±3σ so a once-in-
// thousand outlier doesn't flip a crystal completely sideways.
function _seededGaussian(seed, channel) {
  const r = _mulberry32(((seed | 0) ^ (channel * 0x9E3779B1)) >>> 0);
  // Standard Box-Muller; r() never returns 0 so log is safe.
  const u1 = Math.max(r(), 1e-9);
  const u2 = r();
  const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(-3, Math.min(3, g));
}

// Build a right-handed basis (perp1, perp2) perpendicular to `axis`,
// rotated by `rotRad` around `axis`. Used to orient a primitive's
// equatorial axes (x, z) in world space for a given anchor.
function _orthonormalBasis(axis, rotRad) {
  const ax = axis[0], ay = axis[1], az = axis[2];
  // Pick a non-parallel helper. World up unless axis ≈ ±y.
  const helper = (Math.abs(ay) < 0.9) ? [0, 1, 0] : [1, 0, 0];
  // p1 = normalize(axis × helper)
  let p1x = ay * helper[2] - az * helper[1];
  let p1y = az * helper[0] - ax * helper[2];
  let p1z = ax * helper[1] - ay * helper[0];
  const p1len = Math.hypot(p1x, p1y, p1z) || 1;
  p1x /= p1len; p1y /= p1len; p1z /= p1len;
  // p2 = axis × p1  (already unit length since axis and p1 are unit + perp)
  const p2x = ay * p1z - az * p1y;
  const p2y = az * p1x - ax * p1z;
  const p2z = ax * p1y - ay * p1x;
  // Rotate the (p1, p2) frame by rotRad around axis.
  const c = Math.cos(rotRad), s = Math.sin(rotRad);
  return [
    [p1x * c + p2x * s, p1y * c + p2y * s, p1z * c + p2z * s],
    [-p1x * s + p2x * c, -p1y * s + p2y * c, -p1z * s + p2z * c],
  ];
}

// Andrew's monotone-chain convex hull of 2D points. Returns the hull
// vertices in CCW order (in screen-y-down coords this looks clockwise
// to a human reader — fine for the canvas fill, which doesn't care).
function _convexHull2D(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Drusy-cluster decision: should this crystal render as one large
// primitive (the default) or as a carpet of N small copies?
//
// Real druses are dense carpets — coarse 5–50 nuclei/cm², fine sugar
// coatings 10²–10⁴ — not the few sparse euhedral crystals the v0
// renderer was producing. Habit strings that signal "this is a carpet
// of small crystals, not one big one" map to a cluster count; a
// size-based fallback gives sub-mm individuals a small cluster too,
// since at typical zoom they otherwise read as ambient noise.
//
// Returns 0 for single-primitive mode, N>0 for cluster of N children.
function _druzyClusterCount(crystal) {
  const h = (crystal.habit || '').toLowerCase();
  // Habit-driven: explicit drusy / massive / earthy carpets.
  if (h.includes('druz'))                                   return 16;
  if (h.includes('crust'))                                  return 12;
  if (h.includes('granular'))                               return 18;
  if (h.includes('earthy'))                                 return 22;
  if (h.includes('arborescent') || h.includes('dendritic')) return 20;
  if (h.includes('massive'))                                return 14;
  if (h.includes('sugar') || h.includes('coating'))         return 14;
  // Size-based: very small crystals get a sparse cluster of 4 mini-
  // copies so they don't render as one near-invisible 3-px primitive.
  if ((crystal.c_length_mm || 0) < 0.4) return 4;
  return 0;
}

// Render one wireframe crystal — single primitive or drusy cluster
// depending on habit/size. The single-instance path lives in
// _renderWireframeInstance; this function dispatches and, when
// clustering, scatters N small offset copies in the substrate's
// tangent plane around the parent's anchor cell.
function _renderCrystalWireframe(ctx, crystal, cellWorld, sphereRadiusPx,
                                  mmToPx, cx, cy, F) {
  const clusterN = _druzyClusterCount(crystal);
  if (clusterN <= 0) {
    _renderWireframeInstance(ctx, crystal, cellWorld, sphereRadiusPx,
                              mmToPx, cx, cy, F, {});
    return;
  }
  // Cluster mode. Each child gets:
  //   * an offset anchor in the substrate's tangent plane (so the
  //     carpet spreads along the wall, not into the cavity)
  //   * its own seeded c-axis scatter (parent_id ^ child_index)
  //   * a fractional size of the parent (0.3–0.7)
  //   * a slightly reduced fill alpha so overlapping children read
  //     as a sparkly carpet rather than a single opaque blob.
  const invR = 1 / (Math.hypot(cellWorld[0], cellWorld[1], cellWorld[2]) || 1);
  const subNormal = [-cellWorld[0] * invR, -cellWorld[1] * invR,
                     -cellWorld[2] * invR];
  const [tA, tB] = _orthonormalBasis(subNormal, 0);
  // Cluster radius in pixels: scaled by the parent's a-width (which
  // encodes the crystal's lateral coverage on the wall) so a small
  // druzy fleck stays compact while a big crustiform sheet spreads
  // across many cells. Capped so a runaway crystal can't blanket the
  // whole vug.
  const widthMm = Math.max(crystal.a_width_mm || 0,
                            crystal.c_length_mm || 0, 1.0);
  const clusterRadiusPx = Math.min(widthMm * 0.9 * mmToPx, 9 * mmToPx);
  const id = crystal.crystal_id | 0;
  for (let i = 1; i <= clusterN; i++) {
    // Scatter offset in tangent plane. Two seeded uniforms with
    // sqrt-radius weighting → uniform area density inside the disc.
    const r = Math.sqrt(_seededRand((id ^ (i * 7919)) >>> 0)) * clusterRadiusPx;
    const a = _seededRand((id ^ (i * 6133)) >>> 0) * 2 * Math.PI;
    const jx = r * Math.cos(a), jy = r * Math.sin(a);
    const anchor = [
      cellWorld[0] + tA[0] * jx + tB[0] * jy,
      cellWorld[1] + tA[1] * jx + tB[1] * jy,
      cellWorld[2] + tA[2] * jx + tB[2] * jy,
    ];
    const sizeMul = 0.3 + 0.4 * _seededRand((id ^ (i * 4111)) >>> 0);
    _renderWireframeInstance(ctx, crystal, anchor, sphereRadiusPx,
                              mmToPx, cx, cy, F, {
      sizeMul,
      seedOffset: i,
      fillAlphaMul: 0.55,
    });
  }
}

// One wireframe primitive: silhouette fill (mineral color, 40% of the
// edge alpha) + edges (mineral color, full edge alpha). Anchor +
// size + seed are passed in so the same helper drives both single-
// crystal and cluster-child rendering. c-axis orientation is
// environment-dependent:
//
//   * 'fluid' (default): perpendicular to substrate (= inward sphere
//     normal at the anchor), with Gaussian scatter that reproduces
//     real druse geometric-selection outcomes (Mathematical
//     Geosciences 1989; mature druse σ ≈ 10–15° around the substrate
//     normal, capped at ±30° before extinction). Epitaxial overgrowths
//     (`enclosed_by != null`) lock tighter at σ ≈ 3° because
//     nucleation is templated by the host's lattice.
//
//   * 'air': gravity-aligned. Stalactite c-axis points world-down
//     regardless of substrate orientation; stalagmite world-up. Wall
//     crystals in air are an edge case with no clean geological
//     analog — fall back to substrate-perpendicular.
//
// Within-crystal jitter is seeded from (crystal_id, seedOffset) with
// separate channels so reloads / replays stay reproducible AND
// cluster children get independent randomness.
function _renderWireframeInstance(ctx, crystal, anchor, sphereRadiusPx,
                                   mmToPx, cx, cy, F, opts) {
  const sizeMul       = opts.sizeMul       != null ? opts.sizeMul       : 1.0;
  const seedOffset    = opts.seedOffset    != null ? opts.seedOffset    : 0;
  const fillAlphaMul  = opts.fillAlphaMul  != null ? opts.fillAlphaMul  : 1.0;
  const prim = _lookupCrystalPrimitive(crystal);
  const cLengthPx = Math.max((crystal.c_length_mm || 0.5) * sizeMul * mmToPx, 3);
  const aWidthPx  = Math.max((crystal.a_width_mm  || 0.5) * sizeMul * mmToPx, 3);
  // Substrate-perpendicular at this anchor (= inward sphere normal).
  const invR = 1 / (Math.hypot(anchor[0], anchor[1], anchor[2]) || 1);
  const subNormal = [-anchor[0] * invR, -anchor[1] * invR, -anchor[2] * invR];
  const env = crystal.growth_environment || 'fluid';
  let cAxis;
  if (env === 'air') {
    // See _topoRenderRings3D's wz convention: south-pole/floor sits at
    // -z, so gravity-down = +z direction. Stalactites at the ceiling
    // point at the floor (always +z); stalagmites at the floor point
    // up (always -z). Wall cells in air fall back to perpendicular.
    if (subNormal[2] > 0.4)       cAxis = [0, 0, 1];
    else if (subNormal[2] < -0.4) cAxis = [0, 0, -1];
    else                          cAxis = subNormal;
  } else {
    const epitaxial = crystal.enclosed_by != null;
    const sigmaRad = (epitaxial ? 3 : 12) * Math.PI / 180;
    const seedId = ((crystal.crystal_id | 0) ^ (seedOffset * 0xA5F00D)) >>> 0;
    const [tA, tB] = _orthonormalBasis(subNormal, 0);
    const gx = _seededGaussian(seedId, 1) * sigmaRad;
    const gy = _seededGaussian(seedId, 2) * sigmaRad;
    const tx = subNormal[0] + tA[0] * gx + tB[0] * gy;
    const ty = subNormal[1] + tA[1] * gx + tB[1] * gy;
    const tz = subNormal[2] + tA[2] * gx + tB[2] * gy;
    const len = Math.hypot(tx, ty, tz) || 1;
    cAxis = [tx / len, ty / len, tz / len];
  }
  const rotSeed = ((crystal.crystal_id | 0) ^ 0xC1B2A305 ^ (seedOffset * 0x5BD1E995)) >>> 0;
  const rotRad = (_seededRand(rotSeed) - 0.5) * 2 * Math.PI;
  const [perp1, perp2] = _orthonormalBasis(cAxis, rotRad);
  const projected = [];
  for (const [px, py, pz] of prim.vertices) {
    const wx = anchor[0] + perp1[0] * px * aWidthPx
                          + cAxis[0] * py * cLengthPx
                          + perp2[0] * pz * aWidthPx;
    const wy = anchor[1] + perp1[1] * px * aWidthPx
                          + cAxis[1] * py * cLengthPx
                          + perp2[1] * pz * aWidthPx;
    const wz = anchor[2] + perp1[2] * px * aWidthPx
                          + cAxis[2] * py * cLengthPx
                          + perp2[2] * pz * aWidthPx;
    const proj = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
    projected.push([cx + proj[0], cy + proj[1]]);
  }
  const edgeAlpha = topoAlphaFor(crystal.mineral);
  const color = topoClassColor(crystal.mineral);
  const hull = _convexHull2D(projected);
  if (hull.length >= 3) {
    ctx.globalAlpha = 0.4 * fillAlphaMul * edgeAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(hull[0][0], hull[0][1]);
    for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i][0], hull[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = edgeAlpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [a, b] of prim.edges) {
    ctx.moveTo(projected[a][0], projected[a][1]);
    ctx.lineTo(projected[b][0], projected[b][1]);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Phase B (Tier 1.5) — 3D multi-ring renderer.
// Called from topoRender when _topoView3D is true. Renders every ring
// in wall.rings stacked along a vertical (Y) axis, using per-vertex
// projection through _topoProject3D. Rings + crystals are interleaved
// in painter's order (back-to-front by post-rotation z) so wireframe
// crystals occlude the cavity rings behind them — see
// proposals/PROPOSAL-WIREFRAME-CRYSTALS.md.
//
// Painter's-order granularity: rings paint atomically (the entire
// 120-cell outline of a ring is one paint unit). A crystal anchored
// on the front of ring k paints AFTER ring k as a whole — including
// the back-side cells of ring k that should logically be behind the
// crystal. Acceptable v0 trade-off; see addendum B for the per-cell
// upgrade path.
//
// What's intentionally simplified for v0:
//   * Habit textures (sawtooth/botryoidal/etc) collapse into the
//     primitive's wireframe — drawHabitTexture's chord math doesn't
//     compose with arbitrary projection.
//   * Inclusion dots are skipped (they live on ring[0] only; tier-1
//     hit-test was already broken in 3D mode).
//   * Scale bar is skipped — its physical-distance reading is
//     ambiguous when the disc is tilted.
function _topoRenderRings3D(ctx, sim, wall, ring0, cellR, boundaryR,
                             cx, cy, mmToPx, maxT, arcStep, N, viewW, viewH) {
  const F = 1200;  // perspective focal length, matches tier-1's CSS perspective(1200px)
  const ringCount = wall.ring_count;
  // Spherical cavity profile (renderer-only for now — the engine's
  // ring data stays uniform until Phase D distributes crystals by
  // orientation). Each ring k sits at a latitude φ_k around a sphere
  // whose center is the canvas center; its radial-radius scales as
  // sin(φ_k) and its vertical offset as -cos(φ_k)·R. Half-step offsets
  // (k+0.5 instead of k) keep the polar rings small but non-zero so
  // the engine math (cell_arc_mm, paint_crystal) — which still reads
  // ring[0] — doesn't divide by zero. With 16 rings the smallest
  // radius is sin(π/32) ≈ 0.098 (the south-pole "cap" ring) and the
  // largest is sin(15.5π/32) ≈ 0.998 (the equator).
  const cavityDiameterPx = wall.meanDiameterMm() * mmToPx;
  const sphereRadiusPx = cavityDiameterPx / 2;

  // Per-ring metadata: world-space z, latitude-derived radius factor,
  // θ twist, and the projected z used for painter's-order sorting.
  // For a ring center at (0,0,wz) the post-rotation z is
  // cos(tiltX)·cos(tiltY)·wz; pulling it from _topoProject3D directly
  // keeps it consistent with crystal sort keys (which use the same
  // function on off-axis points).
  const ringMeta = new Array(ringCount);
  for (let r = 0; r < ringCount; r++) {
    // Ring 0 is the south pole (floor), ring N-1 is the north pole
    // (ceiling). φ runs from π/(2N) at ring 0 to π(2N-1)/(2N) at
    // ring N-1 — full latitude sweep with half-step offsets at each
    // end so neither pole collapses to a point. Cross-axis polar
    // factor adds vertical irregularity.
    const phi = Math.PI * (r + 0.5) / ringCount;
    const polar = wall.polarProfileFactor ? wall.polarProfileFactor(phi) : 1.0;
    const ringRadiusFactor = Math.sin(phi) * polar;
    const wz = -Math.cos(phi) * sphereRadiusPx;
    const twist = wall.ringTwistRadians ? wall.ringTwistRadians(phi) : 0.0;
    const projZ = _topoProject3D(0, 0, wz, _topoTiltX, _topoTiltY, F)[2];
    ringMeta[r] = { ringIdx: r, wz, ringRadiusFactor, twist, projZ };
  }

  // Build the painter's-order item list: rings + crystals interleaved.
  // Rings paint atomically (entire outline in one shot); crystals
  // paint as wireframe primitives anchored to their wall cell. Sort
  // ascending by post-rotation z so far things paint first.
  const paintItems = [];
  for (const meta of ringMeta) {
    paintItems.push({ kind: 'ring', meta, sortZ: meta.projZ });
  }

  // v24 water line. If conditions.fluid_surface_ring is set, the
  // meniscus sits at φ = π·s/ringCount along the polar axis. Build a
  // 64-segment polyline tracing the cavity outline at that latitude,
  // pre-projected to screen, and sort the disc as a single paint item
  // at its centre's projected z. Polar profile + per-cell wall depth
  // are folded in so the water line wobbles with the cavity shape.
  let waterDisc = null;
  if (sim && sim.conditions
      && sim.conditions.fluid_surface_ring != null
      && ringCount > 1) {
    const s = sim.conditions.fluid_surface_ring;
    const sClamped = Math.max(0, Math.min(ringCount, s));
    const phiW = Math.PI * sClamped / ringCount;
    const polarW = wall.polarProfileFactor ? wall.polarProfileFactor(phiW) : 1.0;
    const rrfW = Math.sin(phiW) * polarW;
    const wzW = -Math.cos(phiW) * sphereRadiusPx;
    const twistW = wall.ringTwistRadians ? wall.ringTwistRadians(phiW) : 0.0;
    // Sample N_W points around θ. Use the same per-cell base_radius
    // ring0 carries — without per-ring radius variation in the engine
    // this is the best the renderer has for "what shape is the cavity
    // at this height". Wall_depth on ring0 also folds in.
    const N_W = 64;
    const pts = new Array(N_W);
    for (let j = 0; j < N_W; j++) {
      const theta = (2 * Math.PI * j) / N_W + twistW;
      // Sample ring0's per-cell radius at the matching θ index.
      const cellIdx = Math.floor((j / N_W) * N) % N;
      const cell = ring0[cellIdx];
      const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
      const rPx = (baseR + cell.wall_depth) * mmToPx * rrfW;
      const wx = rPx * Math.cos(theta);
      const wy = rPx * Math.sin(theta);
      pts[j] = [wx, wy, wzW];
    }
    const projZW = _topoProject3D(0, 0, wzW, _topoTiltX, _topoTiltY, F)[2];
    waterDisc = { points: pts, sortZ: projZW };
    paintItems.push({ kind: 'water', disc: waterDisc, sortZ: projZW });
  }
  if (sim && sim.crystals) {
    for (const crystal of sim.crystals) {
      if (crystal.dissolved) continue;
      const ringIdx = crystal.wall_ring_index;
      const cellIdx = crystal.wall_center_cell;
      if (ringIdx == null || cellIdx == null) continue;
      const meta = ringMeta[ringIdx];
      if (!meta) continue;
      const ring = wall.rings[ringIdx];
      if (!ring || !ring.length) continue;
      const aMid = _topoAngleFor(cellIdx, N) + meta.twist;
      const rrf = meta.ringRadiusFactor;
      const cellMidR = cellR[cellIdx] * rrf;
      const cellWx = cellMidR * Math.cos(aMid);
      const cellWy = cellMidR * Math.sin(aMid);
      const cellWz = meta.wz;
      const projected = _topoProject3D(cellWx, cellWy, cellWz,
                                        _topoTiltX, _topoTiltY, F);
      paintItems.push({
        kind: 'crystal',
        crystal,
        cellWorld: [cellWx, cellWy, cellWz],
        sortZ: projected[2],
      });
    }
  }
  paintItems.sort((a, b) => {
    if (a.sortZ !== b.sortZ) return a.sortZ - b.sortZ;
    if (a.kind !== b.kind) return a.kind === 'ring' ? -1 : 1;
    if (a.kind === 'ring') return a.meta.ringIdx - b.meta.ringIdx;
    // Tie-break crystals by id so pseudomorphs / overgrowths (later
    // crystal_id) paint on top of their host — typically correct since
    // overgrowths are later in paragenesis.
    return (a.crystal.crystal_id | 0) - (b.crystal.crystal_id | 0);
  });

  // Project a (canvasX, canvasY) point at this ring's height to screen.
  function projAt(wz) {
    return (canvasX, canvasY) => {
      const wx = canvasX - cx;
      const wy = canvasY - cy;
      const [px, py] = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      return [cx + px, cy + py];
    };
  }

  // Render one ring's wall outline. Replaces the wedge-fill block from
  // pre-wireframe versions — wedges are now wireframe primitives drawn
  // as separate paint items above. The wall stroke still varies width
  // by crystal thickness so a heavily-grown ring reads as "encrusted"
  // through line weight alone.
  function renderRingOutline(meta) {
    const { ringIdx, wz, ringRadiusFactor, twist } = meta;
    const ring = wall.rings[ringIdx];
    if (!ring || !ring.length) return;
    const proj = projAt(wz);
    const rrf = ringRadiusFactor;
    const ringTwist = twist || 0;
    const orient = wall.ringOrientation(ringIdx);
    let bareWallColor = TOPO_WALL_COLOR;
    if (orient === 'floor') bareWallColor = TOPO_WALL_COLOR_FLOOR;
    else if (orient === 'ceiling') bareWallColor = TOPO_WALL_COLOR_CEILING;
    // v24: ring is submerged below the meniscus → after stroking the
    // canonical wall colour for each cell, re-stroke the same path with
    // a thin translucent blue companion line. Reads at-a-glance as
    // "this ring is underwater". Meniscus + vadose rings get no extra
    // line; the meniscus disc itself communicates the surface and the
    // dry rings keep their canonical orange.
    const wstate = (sim && sim.conditions && sim.conditions.ringWaterState)
      ? sim.conditions.ringWaterState(ringIdx, ringCount)
      : 'submerged';
    const isSubmerged = wstate === 'submerged'
      && sim && sim.conditions && sim.conditions.fluid_surface_ring != null;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const a0 = _topoAngleFor(i, N) - arcStep / 2 + ringTwist;
      const aMid = _topoAngleFor(i, N) + ringTwist;
      const a1 = a0 + arcStep;
      const rStart = boundaryR[i] * rrf;
      const rMid = cellR[i] * rrf;
      const rEnd = boundaryR[(i + 1) % N] * rrf;
      const cell = ring[i];
      let stroke, width, alpha;
      if (cell.crystal_id == null) {
        stroke = bareWallColor;
        width = TOPO_WALL_STROKE_PX;
        alpha = 1;
      } else {
        stroke = topoClassColor(cell.mineral);
        const t = Math.min(cell.thickness_um / maxT, 1);
        width = TOPO_WALL_STROKE_PX + t * (TOPO_WALL_STROKE_MAX_PX - TOPO_WALL_STROKE_PX);
        alpha = topoAlphaFor(cell.mineral);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      const sxW = cx + rStart * Math.cos(a0), syW = cy + rStart * Math.sin(a0);
      const mxW = cx + rMid * Math.cos(aMid), myW = cy + rMid * Math.sin(aMid);
      const exW = cx + rEnd * Math.cos(a1),  eyW = cy + rEnd * Math.sin(a1);
      const [psx, psy] = proj(sxW, syW);
      const [pmx, pmy] = proj(mxW, myW);
      const [pex, pey] = proj(exW, eyW);
      const cpX = 2 * pmx - (psx + pex) / 2;
      const cpY = 2 * pmy - (psy + pey) / 2;
      ctx.beginPath();
      ctx.moveTo(psx, psy);
      ctx.quadraticCurveTo(cpX, cpY, pex, pey);
      ctx.stroke();
      if (isSubmerged) {
        // Re-stroke the same path with a thin blue companion line.
        // Lower alpha + lineCap=butt so it reads as a tint along the
        // wall colour, not a competing outline. Width capped at the
        // base wall stroke so heavily-encrusted cells (very thick
        // wall colour) don't drown out the underwater cue.
        const prevCap = ctx.lineCap;
        ctx.lineCap = 'butt';
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = 'rgba(110, 190, 245, 1.0)';
        ctx.lineWidth = Math.min(width, TOPO_WALL_STROKE_PX) * 0.55;
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineCap = prevCap;
      }
    }
    ctx.globalAlpha = 1;
  }

  // v24: render the meniscus disc — translucent blue fill with a
  // brighter outline, projected through the same camera transform as
  // rings/crystals. Painter's order puts the disc at its meniscus
  // latitude's z, so back-half occluded by far rings/crystals and
  // front-half occludes near rings/crystals. Imperfect for objects
  // straddling the disc's z (single sortZ for the whole disc), but
  // reads correctly at typical tilt angles.
  function renderWaterDisc(disc) {
    const proj = projAt(0); // wz baked into points already
    const screen = disc.points.map(([wx, wy, wz]) => {
      const [px, py] = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      return [cx + px, cy + py];
    });
    if (!screen.length) return;
    ctx.beginPath();
    ctx.moveTo(screen[0][0], screen[0][1]);
    for (let j = 1; j < screen.length; j++) {
      ctx.lineTo(screen[j][0], screen[j][1]);
    }
    ctx.closePath();
    ctx.save();
    ctx.fillStyle = 'rgba(86, 170, 240, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  for (const item of paintItems) {
    if (item.kind === 'ring') renderRingOutline(item.meta);
    else if (item.kind === 'water') renderWaterDisc(item.disc);
    else _renderCrystalWireframe(ctx, item.crystal, item.cellWorld,
                                  sphereRadiusPx, mmToPx, cx, cy, F);
  }

  // Vug size readout — same HTML overlay as 2D mode.
  const sizeLabel = document.getElementById('topo-vug-size');
  if (sizeLabel) {
    sizeLabel.textContent = `Vug ⌀ ${wall.meanDiameterMm().toFixed(1)} mm × ${ringCount} rings`;
  }
}

// Hit-test: resolve (mouseX, mouseY) on the canvas into a mineral
// under the cursor. Returns { mineral, isInclusion, cell } or null
// if the cursor is not on a crystal. Called by both the tooltip and
// the highlight hover/click handlers so their geometry stays in sync.
// Reconstruct the (mmToPx, cx, cy) the renderer is using for the
// current canvas + zoom + pan state. Used by both 2D and 3D hit-test
// paths so cursor coords map to the same world the user sees.
function _topoCanvasFrame(rect, wall, ring0) {
  const cssW = rect.width, cssH = rect.height;
  const initR = wall.initial_radius_mm;
  let maxWallR = wall.max_seen_radius_mm || initR * 2;
  for (const c of ring0) {
    const baseR = c.base_radius_mm > 0 ? c.base_radius_mm : initR;
    const r = baseR + c.wall_depth;
    if (r > maxWallR) maxWallR = r;
  }
  const centerPad = 48;
  const viewW = cssW / TOPO_STAGE_SCALE;
  const viewH = cssH / TOPO_STAGE_SCALE;
  const fit = Math.min(viewW, viewH - centerPad) * 0.82 / 2;
  const mmToPx = (fit / maxWallR) * _topoZoom;
  const cx = cssW / 2 + _topoPanX;
  const cy = (cssH - centerPad) / 2 + 8 + _topoPanY;
  return { cssW, cssH, mmToPx, cx, cy, initR, maxWallR };
}

// 3D hit-test. The cavity surface is NOT a true sphere — each ring
// has its own latitude-dependent radius factor (sin(φ)·polar_profile)
// and per-cell base_radius wobble, so it's a stretched-and-bumped
// sphere. Ray-vs-sphere math gives wrong answers when polar pinches
// pull cells far inside the mean sphere.
//
// Brute-force approach: forward-project every cell's anchor center
// to screen, find the cell whose projection is nearest to the cursor.
// This is naturally correct for the bumpy surface AND handles the
// wireframe-occlusion case (both front and back hemispheres visible)
// without explicit hemisphere math — the nearest-projection cell is
// the one the user is hovering over.
//
// Cost: 1 projection + 1 distance² per cell × 16 rings × 120 cells =
// ~2k operations per hit-test. Negligible at hover-event frequency.
//
// Returns { mineral, isInclusion, cell, ringIdx, cellIdx } or null
// (cursor too far from any cell). Crystal-on-cell follows the same
// engine semantic as 2D mode: a cell's crystal_id is the occupant;
// null means bare wall.
function _hitTest3D(ev, sim, rect) {
  const wall = sim.wall_state;
  if (!wall || !wall.rings || wall.rings.length < 2) return null;
  const ringCount = wall.ring_count;
  const ring0 = wall.rings[0];
  const N = ring0.length;
  const F = 1200;  // matches _topoRenderRings3D
  const { mmToPx, cx, cy, initR } = _topoCanvasFrame(rect, wall, ring0);
  const sphereRadiusPx = wall.meanDiameterMm() * mmToPx / 2;

  // Cursor in canvas-relative coords (matches what _topoProject3D's
  // output adds cx/cy back to).
  const ux = (ev.clientX - rect.left) - cx;
  const uy = (ev.clientY - rect.top) - cy;

  // Walk every cell, project its anchor, track the nearest in screen
  // space. Two candidates kept: the absolute nearest, AND the nearest
  // crystal-bearing cell (so a wireframe crystal sitting near a bare
  // cell's projected center wins on user-intent grounds — they almost
  // certainly meant to hover the visible crystal, not its bare-wall
  // neighbor).
  let bestAny = null, bestAnyD2 = Infinity;
  let bestCrystal = null, bestCrystalD2 = Infinity;
  for (let r = 0; r < ringCount; r++) {
    const phi = Math.PI * (r + 0.5) / ringCount;
    const polar = wall.polarProfileFactor ? wall.polarProfileFactor(phi) : 1.0;
    const rrf = Math.sin(phi) * polar;
    const wz = -Math.cos(phi) * sphereRadiusPx;
    const twist = wall.ringTwistRadians ? wall.ringTwistRadians(phi) : 0;
    const ring = wall.rings[r];
    if (!ring || !ring.length) continue;
    for (let i = 0; i < N; i++) {
      const c = ring[i];
      const baseR = c.base_radius_mm > 0 ? c.base_radius_mm : initR;
      const cellOuter = (baseR + c.wall_depth) * mmToPx;
      const aMid = -Math.PI / 2 + (i / N) * 2 * Math.PI + twist;
      const wx = cellOuter * rrf * Math.cos(aMid);
      const wy = cellOuter * rrf * Math.sin(aMid);
      const p = _topoProject3D(wx, wy, wz, _topoTiltX, _topoTiltY, F);
      const dx = ux - p[0], dy = uy - p[1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestAnyD2) {
        bestAnyD2 = d2; bestAny = { ringIdx: r, cellIdx: i, cell: c };
      }
      if (c.crystal_id != null && d2 < bestCrystalD2) {
        bestCrystalD2 = d2; bestCrystal = { ringIdx: r, cellIdx: i, cell: c };
      }
    }
  }
  if (!bestAny) return null;

  // User-intent rule: if a crystal-bearing cell is reasonably close to
  // the cursor (within 14 px, ~2 cells worth of arc at typical scale),
  // prefer it over an even-closer bare-wall cell. Otherwise the bare
  // wall wins. The threshold is small enough that the user has to be
  // visually on a crystal silhouette for this to fire.
  const CRYSTAL_PREFERENCE_PX = 14;
  if (bestCrystal && bestCrystalD2 <= CRYSTAL_PREFERENCE_PX * CRYSTAL_PREFERENCE_PX) {
    const { ringIdx, cellIdx, cell } = bestCrystal;
    return { mineral: cell.mineral, isInclusion: false, cell, ringIdx, cellIdx };
  }
  const { ringIdx, cellIdx, cell } = bestAny;
  if (cell.crystal_id == null) {
    return { mineral: null, isInclusion: false, cell, ringIdx, cellIdx };
  }
  return { mineral: cell.mineral, isInclusion: false, cell, ringIdx, cellIdx };
}

function _topoHitTest(ev) {
  const canvas = document.getElementById('topo-canvas');
  const sim = topoActiveSim();
  if (!canvas || !sim) return null;
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;

  // Inclusion hit-test first — dots take priority over host wall cell.
  // Inclusions are 2D-rendered only (see _topoInclusions populate path);
  // in 3D mode the array stays empty, so the loop is a no-op.
  for (const inc of _topoInclusions) {
    const dx = mx - inc.x, dy = my - inc.y;
    if (dx * dx + dy * dy <= inc.r * inc.r) {
      if (inc.mineral) return { mineral: inc.mineral, isInclusion: true };
      const crystal = sim.crystals.find(c => c.crystal_id === inc.crystal_id);
      if (crystal) return { mineral: crystal.mineral, isInclusion: true };
    }
  }

  // 3D mode: ray-cast against the cavity sphere instead of inverting
  // the 2D polar transform (which ignores tilt + per-ring twist).
  if (_topoView3D && sim.wall_state && sim.wall_state.rings &&
      sim.wall_state.rings.length > 1) {
    return _hitTest3D(ev, sim, rect);
  }

  // 2D path: hit-test reads whatever ring the renderer is currently
  // showing. Aggregate (post-scatter default) → resolves any crystal
  // on any ring at the cursor's angular position. Single-slice mode →
  // resolves only crystals on that specific ring.
  const ring0 = _topoActiveRingForRender(sim.wall_state);
  if (!ring0 || !ring0.length) return null;
  const { mmToPx, cx, cy, initR } = _topoCanvasFrame(rect, sim.wall_state, ring0);
  const N = ring0.length;
  const dx = mx - cx, dy = my - cy;
  const rMouse = Math.hypot(dx, dy);
  let a = Math.atan2(dy, dx) + Math.PI / 2;
  while (a < 0) a += 2 * Math.PI;
  while (a >= 2 * Math.PI) a -= 2 * Math.PI;
  const idx = Math.min(N - 1, Math.max(0, Math.round((a / (2 * Math.PI)) * N) % N));
  const cell = ring0[idx];
  const baseR = cell.base_radius_mm > 0 ? cell.base_radius_mm : initR;
  const cellOuterPx = (baseR + cell.wall_depth) * mmToPx;
  if (rMouse > cellOuterPx + 10 || rMouse < cellOuterPx * 0.15) return null;
  if (cell.crystal_id == null) return { mineral: null, isInclusion: false, cell };
  return { mineral: cell.mineral, isInclusion: false, cell };
}

// Hover: shared 2D + 3D path. _topoHitTest already resolves the cursor
// to either an inclusion, a wall cell on the cavity sphere (3D), or a
// wall cell via 2D polar inversion (2D). We just turn its result into
// tooltip HTML — no duplicated geometry math here. Inclusion hits get
// the "◆ inside host" framing; wall hits get the standard mineral /
// habit / size readout.
function _topoTooltipFromEvent(ev) {
  const canvas = document.getElementById('topo-canvas');
  const tip = document.getElementById('topo-tooltip');
  const sim = topoActiveSim();
  if (!canvas || !tip || !sim) return;
  const hit = _topoHitTest(ev);
  topoSetHoverTarget(
    hit && hit.mineral ? { type: 'mineral', value: hit.mineral } : null
  );
  if (!hit) { tip.style.display = 'none'; return; }

  let html;
  if (hit.isInclusion) {
    const crystal = sim.crystals.find(c => c.mineral === hit.mineral);
    if (!crystal) { tip.style.display = 'none'; return; }
    const host = sim.crystals.find(c => c.crystal_id === crystal.enclosed_by);
    const spec = MINERAL_SPEC[crystal.mineral] || {};
    const color = spec.class_color || TOPO_WALL_COLOR;
    const lines = [];
    lines.push(`<b style="color:${color}">◆ ${crystal.mineral} #${crystal.crystal_id}</b>`);
    lines.push(`${crystal.habit}${crystal.twinned ? ` (${crystal.twin_law} twin)` : ''}`);
    lines.push(`${crystal.c_length_mm.toFixed(2)} mm — inclusion`);
    if (host) lines.push(`inside ${host.mineral} #${host.crystal_id}`);
    html = lines.join('<br>');
  } else {
    const cell = hit.cell;
    if (!cell) { tip.style.display = 'none'; return; }
    if (cell.crystal_id == null) {
      // 3D mode renders the cavity as a wireframe topo map — the user
      // can SEE the bare wall directly, so the "wall · eroded +Xmm"
      // tooltip just adds friction without information. Suppress it.
      // 2D mode keeps the readout because the strip view doesn't make
      // erosion depth obvious from geometry alone.
      if (_topoView3D) { tip.style.display = 'none'; return; }
      const wallDepthMm = cell.wall_depth || 0;
      const depthNote = wallDepthMm > 0.1 ? ` · eroded +${wallDepthMm.toFixed(1)}mm` : '';
      html = `<b style="color:${TOPO_WALL_COLOR}">${sim.conditions.wall.composition || 'wall'}</b><br>` +
             `bare wall${depthNote}`;
    } else {
      const crystal = sim.crystals.find(c => c.crystal_id === cell.crystal_id);
      const spec = MINERAL_SPEC[cell.mineral] || {};
      const color = spec.class_color || TOPO_WALL_COLOR;
      const lines = [];
      lines.push(`<b style="color:${color}">${cell.mineral} #${cell.crystal_id}</b>`);
      if (crystal) {
        lines.push(`${crystal.habit}${crystal.twinned ? ` (${crystal.twin_law} twin)` : ''}`);
        lines.push(`${crystal.c_length_mm.toFixed(2)} mm · vector: ${crystal.vector}`);
      }
      html = lines.join('<br>');
    }
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  // Viewport-relative positioning (CSS is now position:fixed). Don't
  // subtract container offsets — under TOPO_STAGE_SCALE + _topoZoom + pan
  // transforms, that mismatch is what produces the offset bug.
  tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 6, ev.clientX + 12)}px`;
  tip.style.top = `${Math.min(window.innerHeight - 40, ev.clientY - 10)}px`;
}

function _topoHideTooltip() {
  const tip = document.getElementById('topo-tooltip');
  if (tip) tip.style.display = 'none';
  // Canvas hover also stops contributing to the highlight when the
  // cursor leaves — the legend hover (if any) becomes the effective
  // target, or nothing if neither is active.
  topoSetHoverTarget(null);
}

// Canvas click — toggle lock on the crystal under the cursor, or clear
// the lock if clicking empty space. Brief edge case: clicks on the
// legend propagate up to canvas if not stopped; the legend handler
// calls stopPropagation to prevent that crossover.
function _topoClickFromEvent(ev) {
  const hit = _topoHitTest(ev);
  topoToggleLockTarget(
    hit && hit.mineral ? { type: 'mineral', value: hit.mineral } : null
  );
}

// Zoom — multiplies mmToPx in the renderer. `dir` is +1 (in) or -1 (out).
function topoZoom(dir) {
  const factor = dir > 0 ? TOPO_ZOOM_STEP : (1 / TOPO_ZOOM_STEP);
  _topoZoom = Math.max(TOPO_ZOOM_MIN, Math.min(TOPO_ZOOM_MAX, _topoZoom * factor));
  const label = document.getElementById('topo-zoom-label');
  if (label) label.textContent = `${Math.round(_topoZoom * 100)}%`;
  topoRender();
}

// Set the camera drag mode ('rotate' | 'pan') or toggle it off by
// re-clicking the currently-active one. Updates button highlights,
// flips _topoView3D for the renderer, and applies/clears the CSS 3D
// transform on the canvas.
function topoSetDragMode(mode) {
  // Toggle behavior: re-clicking the active mode returns to default.
  if (_topoDragMode === mode) mode = 'default';
  _topoDragMode = mode;
  _topoView3D = (mode === 'rotate');
  const rotateBtn = document.getElementById('topo-rotate-btn');
  const panBtn = document.getElementById('topo-pan-btn');
  if (rotateBtn) rotateBtn.style.color = (mode === 'rotate') ? '#f0c050' : '';
  if (panBtn) panBtn.style.color = (mode === 'pan') ? '#f0c050' : '';
  // Slice stepper hides in 3D mode (every ring is rendered stacked
  // there anyway; the per-slice navigation only makes sense in the
  // top-down 2D view). CSS `body.topo-view-3d .topo-slice-ctrls`
  // does the actual hiding.
  document.body.classList.toggle('topo-view-3d', _topoView3D);
  _topoApplyTransform();
  topoRender();
}

// Reset pan and tilt to zero. Zoom is preserved (user probably wants
// to keep their zoom level when recentering).
function topoRecenter() {
  _topoPanX = 0;
  _topoPanY = 0;
  _topoTiltX = 0;
  _topoTiltY = 0;
  _topoApplyTransform();
  topoRender();
}

// Phase B (Tier 1.5): tilt is now applied per-vertex inside topoRender's
// 3D branch (_topoRenderRings3D), not via a CSS transform on the canvas
// element. This function stays as a no-op + cleanup hook so existing
// callers (topoSetDragMode, topoRecenter) don't need to change. It also
// clears any leftover CSS transform from a tier-1 build whose state
// somehow survived (e.g. cached page) — defensive.
function _topoApplyTransform() {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  if (canvas.style.transform) {
    canvas.style.transform = '';
    canvas.style.transformOrigin = '';
  }
}

// Wire hover + zoom wheel + click-drag pan once — called from the
// panel's first show. Idempotent.
let _topoWired = false;
function topoEnsureWired() {
  if (_topoWired) return;
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  canvas.addEventListener('mousemove', _topoTooltipFromEvent);
  canvas.addEventListener('mouseleave', _topoHideTooltip);
  canvas.addEventListener('click', _topoClickFromEvent);
  // Wheel = zoom. Preventing default so the page doesn't scroll past
  // the canvas while the player is framing the vug.
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    topoZoom(ev.deltaY < 0 ? +1 : -1);
  }, { passive: false });
  // Click-drag pan / rotate. Pointer events handle BOTH mouse and
  // touch from one code path (vs. the old mousedown/mousemove/mouseup
  // which never fired during touch gestures — emulated mouse events
  // only arrive after touchend, too late for drag tracking). Modern
  // browsers (Safari iOS 13+, Chrome, Firefox, Edge) all support
  // Pointer Events; the canvas's `touch-action: none` CSS lets the
  // gesture reach this handler instead of being eaten by browser
  // page-pan defaults.
  canvas.addEventListener('pointerdown', _topoPanMouseDown);
  window.addEventListener('resize', () => topoRender());
  _topoWired = true;
}

// Drag start. Branches on view mode:
//   2D mode: pan, but only if the click wasn't on a crystal
//            (_topoHitTest returns {mineral: 'X'} → tooltip/click wins)
//   3D mode: rotate, from anywhere on the canvas (hit-tests are
//            inaccurate under CSS 3D transform anyway)
// Stores ORIGIN values for whichever mode we're in so mousemove can
// compute deltas against them.
let _topoDragOriginTiltX = 0;
let _topoDragOriginTiltY = 0;
function _topoPanMouseDown(ev) {
  // For pointer events, button=0 is the primary button (left mouse,
  // first touch contact, primary stylus). Right-click / middle-click
  // / secondary touches are skipped.
  if (ev.button !== 0) return;
  // preventDefault on the pointerdown suppresses the browser's
  // emulated mouse events (which would fire after touchend and
  // double-trigger handlers) and any default page-scroll gesture
  // that might still come from a misconfigured touch-action setting.
  ev.preventDefault();
  // In 'default' mode, clicks on a crystal go to tooltip/click, not drag.
  // In 'rotate' or 'pan' modes, drag starts from anywhere on the canvas.
  if (_topoDragMode === 'default') {
    const hit = _topoHitTest(ev);
    if (hit && hit.mineral) return;  // click on a crystal — let tooltip/click win
  }
  _topoDragging = false;          // becomes true once movement exceeds threshold
  _topoDragStartClientX = ev.clientX;
  _topoDragStartClientY = ev.clientY;
  _topoDragOriginPanX = _topoPanX;
  _topoDragOriginPanY = _topoPanY;
  _topoDragOriginTiltX = _topoTiltX;
  _topoDragOriginTiltY = _topoTiltY;
  document.addEventListener('pointermove', _topoPanMouseMove);
  document.addEventListener('pointerup', _topoPanMouseUp);
  // `pointercancel` covers cases where the OS interrupts the gesture
  // (e.g. iOS palm rejection, system-level edge swipe) — without
  // handling it, the document-level listeners can leak.
  document.addEventListener('pointercancel', _topoPanMouseUp);
}

// Document-level mousemove during a candidate drag. Only commits once
// movement exceeds TOPO_DRAG_THRESHOLD_PX, letting short clicks still
// fire the existing click handler unchanged. In 2D mode updates pan;
// in 3D mode updates tilts (rotateX = vertical drag, rotateY = horiz).
const TOPO_DRAG_ROTATE_RAD_PER_PX = 0.5 * Math.PI / 180;  // 0.5° per px
function _topoPanMouseMove(ev) {
  const dx = ev.clientX - _topoDragStartClientX;
  const dy = ev.clientY - _topoDragStartClientY;
  if (!_topoDragging) {
    if (Math.hypot(dx, dy) < TOPO_DRAG_THRESHOLD_PX) return;
    _topoDragging = true;
    const canvas = document.getElementById('topo-canvas');
    if (canvas) canvas.style.cursor = 'grabbing';
  }
  if (_topoDragMode === 'rotate') {
    // Vertical drag → rotateX (pitch); horizontal drag → rotateY (yaw).
    // Negative dy gives intuitive "pull up to tilt toward viewer" feel.
    // Phase B (Tier 1.5): no tilt clamp — per-vertex projection has no
    // geometric edge cases at vertical (the tier-1 ±86° clamp existed
    // only because CSS transform got weird past edge-on).
    _topoTiltX = _topoDragOriginTiltX + (-dy) * TOPO_DRAG_ROTATE_RAD_PER_PX;
    _topoTiltY = _topoDragOriginTiltY + dx * TOPO_DRAG_ROTATE_RAD_PER_PX;
    topoRender();
  } else {
    // 'default' or 'pan' mode — both translate pan offsets.
    _topoPanX = _topoDragOriginPanX + dx;
    _topoPanY = _topoDragOriginPanY + dy;
    topoRender();
  }
}

// Pointerup / pointercancel ends the drag and tears down the
// document-level listeners. If the user never crossed the movement
// threshold, the click event will still fire on the canvas (browser
// default behavior — pointerup on the same target as pointerdown
// without enough motion triggers a synthetic click).
function _topoPanMouseUp() {
  document.removeEventListener('pointermove', _topoPanMouseMove);
  document.removeEventListener('pointerup', _topoPanMouseUp);
  document.removeEventListener('pointercancel', _topoPanMouseUp);
  if (_topoDragging) {
    _topoDragging = false;
    const canvas = document.getElementById('topo-canvas');
    if (canvas) canvas.style.cursor = '';
  }
}

// Replay: walk the per-step ring[0] snapshots captured during the run,
// rendering each one in sequence so the player watches the wall evolve
// from bare rock to the current state. Click again to stop — the live
// view restores automatically.
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

function idleDrawChart() {
  const canvas = document.getElementById('idle-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#070706';
  ctx.fillRect(0, 0, W, H);

  if (idleHistory.length < 2) return;

  const padding = { left: 50, right: 15, top: 15, bottom: 30 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  // Find Y range — supersaturation typically 0 to ~5, but can spike
  let maxSigma = 3.0;
  for (const h of idleHistory) {
    for (const val of Object.values(h.supersats)) {
      if (val > maxSigma) maxSigma = Math.min(val, 15);
    }
  }
  maxSigma = Math.ceil(maxSigma);

  const xScale = chartW / (idleMaxHistory - 1);
  const yScale = chartH / maxSigma;

  // Grid lines
  ctx.strokeStyle = '#1a1a14';
  ctx.lineWidth = 0.5;
  for (let y = 0; y <= maxSigma; y++) {
    const py = padding.top + chartH - y * yScale;
    ctx.beginPath();
    ctx.moveTo(padding.left, py);
    ctx.lineTo(W - padding.right, py);
    ctx.stroke();

    ctx.fillStyle = '#5a4a30';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(y.toString(), padding.left - 5, py + 3);
  }

  // Nucleation threshold line at σ = 1.0
  const threshY = padding.top + chartH - 1.0 * yScale;
  ctx.strokeStyle = '#3a3520';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, threshY);
  ctx.lineTo(W - padding.right, threshY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('σ=1 nucleation', W - padding.right - 80, threshY - 4);

  // X axis labels (step numbers)
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  if (idleHistory.length > 0) {
    const first = idleHistory[0].step;
    const last = idleHistory[idleHistory.length - 1].step;
    ctx.fillText(String(first), padding.left, H - 5);
    ctx.fillText(String(last), W - padding.right, H - 5);
    if (idleHistory.length > 50) {
      const mid = idleHistory[Math.floor(idleHistory.length / 2)].step;
      ctx.fillText(String(mid), padding.left + chartW / 2, H - 5);
    }
  }

  // Y axis label
  ctx.save();
  ctx.fillStyle = '#5a4a30';
  ctx.font = '9px monospace';
  ctx.translate(12, padding.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Supersaturation (σ)', 0, 0);
  ctx.restore();

  // Draw lines for each mineral
  const startIdx = Math.max(0, idleHistory.length - idleMaxHistory);
  for (const [mineral, color] of Object.entries(IDLE_MINERAL_COLORS)) {
    const points = [];
    for (let i = startIdx; i < idleHistory.length; i++) {
      const val = idleHistory[i].supersats[mineral];
      if (val === undefined) continue;
      const x = padding.left + (i - startIdx) * xScale;
      const y = padding.top + chartH - Math.min(val, maxSigma) * yScale;
      points.push({ x, y });
    }
    if (points.length < 2) continue;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Temperature overlay (right side, subtle)
  if (idleHistory.length > 1) {
    let minT = 600, maxT = 25;
    for (const h of idleHistory) {
      if (h.temp < minT) minT = h.temp;
      if (h.temp > maxT) maxT = h.temp;
    }
    const tRange = Math.max(maxT - minT, 10);

    ctx.strokeStyle = '#ff884422';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = startIdx; i < idleHistory.length; i++) {
      const x = padding.left + (i - startIdx) * xScale;
      const y = padding.top + chartH - ((idleHistory[i].temp - minT) / tRange) * chartH;
      if (i === startIdx) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Temperature label
    ctx.fillStyle = '#ff884466';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const lastT = idleHistory[idleHistory.length - 1].temp;
    ctx.fillText(`${lastT.toFixed(0)}°C`, W - padding.right, padding.top + 10);
  }
}

function idleAppendLog(logEl, text, className) {
  if (!logEl) return;
  const line = document.createElement('div');
  line.className = 'idle-log-line' + (className ? ' ' + className : '');
  line.textContent = text;
  // Insert at top — newest first, old text pushes down
  logEl.insertBefore(line, logEl.firstChild);
  // Keep only last 100 lines
  while (logEl.children.length > 100) {
    logEl.removeChild(logEl.lastChild);
  }
}

function idleDrawPie() {
  if (!idleSim) return;
  const canvas = document.getElementById('idle-pie');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, radius = Math.min(cx, cy) - 8;

  ctx.clearRect(0, 0, W, H);

  // Calculate vug volume (sphere) in mm³
  const vugDiam = idleSim.conditions.wall.vug_diameter_mm;
  const vugRadius = vugDiam / 2;
  const vugVolume = (4 / 3) * Math.PI * Math.pow(vugRadius, 3);

  // Estimate crystal volumes — approximate as ellipsoids
  const mineralVolumes = {};
  let totalCrystalVolume = 0;
  for (const crystal of idleSim.crystals) {
    if (!crystal.active) continue;
    const a = crystal.c_length_mm / 2; // semi-major
    const b = crystal.a_width_mm / 2;  // semi-minor
    const vol = (4 / 3) * Math.PI * a * b * b; // prolate ellipsoid
    const mineral = crystal.mineral;
    mineralVolumes[mineral] = (mineralVolumes[mineral] || 0) + vol;
    totalCrystalVolume += vol;
  }

  const rawFillPct = (totalCrystalVolume / vugVolume) * 100;
  const fillPct = Math.min(100, rawFillPct);
  const openPct = Math.max(0, 100 - fillPct);

  // Build slices: minerals + open space
  const slices = [];
  for (const [mineral, vol] of Object.entries(mineralVolumes)) {
    const pct = (vol / vugVolume) * 100;
    const color = MINERAL_GAME_COLORS[mineral] || '#d4a843';
    slices.push({ label: mineral, pct, color });
  }
  // Sort by size descending
  slices.sort((a, b) => b.pct - a.pct);
  // Add open space
  slices.push({ label: 'open', pct: Math.max(0, openPct), color: '#1a1a14' });

  // Draw pie — minimum visible angle for tiny minerals
  const minAngle = 0.05; // ~3 degrees, enough to see a sliver
  let startAngle = -Math.PI / 2;
  for (const slice of slices) {
    if (slice.pct <= 0) continue;
    let sweepAngle = (slice.pct / 100) * 2 * Math.PI;
    // Ensure non-open slices are visible even when tiny
    if (slice.label !== 'open' && sweepAngle < minAngle && sweepAngle > 0) {
      sweepAngle = minAngle;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweepAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    // Border between slices
    ctx.strokeStyle = '#0a0a08';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    startAngle += sweepAngle;
  }

  // Open space ring outline
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#3a3520';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center label
  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${fillPct.toFixed(1)}%`, cx, cy - 6);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#8a7a40';
  ctx.fillText('filled', cx, cy + 10);

  // Update label
  const labelEl = document.getElementById('idle-pie-label');
  if (labelEl) {
    const mineralList = slices
      .filter(s => s.label !== 'open' && s.pct > 0.001)
      .map(s => s.pct >= 0.1 ? `${s.label} ${s.pct.toFixed(1)}%` : `${s.label} microcrystals`)
      .join(' · ');
    labelEl.textContent = mineralList || 'empty vug';
    // Agate detection!
    if (fillPct > 90) {
      const quartzPct = (mineralVolumes['quartz'] || 0) / vugVolume * 100;
      if (quartzPct > fillPct * 0.8) {
        labelEl.textContent = '🪨 AGATE — vug filled with quartz!';
        labelEl.style.color = '#f0c050';
      }
    }
  }
}

function idleUpdateStatus() {
  const el = document.getElementById('idle-step-counter');
  if (!el || !idleSim) return;
  const activeCrystals = idleSim.crystals.filter(c => c.active).length;
  const totalCrystals = idleSim.crystals.length;
  const yearsPerStep = timeScale * 10000;
  const totalYears = idleSim.step * yearsPerStep;
  const timeStr = totalYears >= 1e6 ? `${(totalYears / 1e6).toFixed(1)}My` : `${(totalYears / 1000).toFixed(0)}ky`;
  el.textContent = `Step ${idleSim.step} · ${activeCrystals}/${totalCrystals} crystals · ${idleSim.conditions.temperature.toFixed(0)}°C · ${timeStr}`;
}

function idleTogglePlay() {
  if (idleRunning && !idlePaused) return;

  if (!idleSim) {
    const scenario = document.getElementById('idle-scenario').value;
    idleSim = idleCreateSim(scenario);
    if (!idleSim) return;
    const logEl = document.getElementById('idle-log');
    logEl.innerHTML = '';
    idleAppendLog(logEl, `🌀 Zen Mode — endless crystal growth begins`, 'log-step');
    idleAppendLog(logEl, `   Starting at ${idleSim.conditions.temperature.toFixed(0)}°C, pH ${idleSim.conditions.fluid.pH.toFixed(1)}`, '');
    idleAppendLog(logEl, `   ${idleSim.conditions.fluid.describe()}`, '');
    idleAppendLog(logEl, `${'═'.repeat(60)}`, '');
  }

  idleRunning = true;
  idlePaused = false;
  idleLastTick = performance.now();

  document.getElementById('idle-play-btn').classList.add('active');
  document.getElementById('idle-play-btn').disabled = true;
  document.getElementById('idle-pause-btn').disabled = false;
  document.getElementById('idle-pause-btn').classList.remove('active');
  document.getElementById('idle-finish-btn').disabled = false;
  document.getElementById('idle-scenario').disabled = true;

  idleAnimFrame = requestAnimationFrame(idleTick);
}

function idleTogglePause() {
  if (!idleRunning) return;
  idlePaused = !idlePaused;

  const pauseBtn = document.getElementById('idle-pause-btn');
  const playBtn = document.getElementById('idle-play-btn');

  if (idlePaused) {
    pauseBtn.classList.add('active');
    pauseBtn.textContent = '⏸️ Paused';
    playBtn.disabled = false;
    playBtn.classList.remove('active');
    if (idleAnimFrame) cancelAnimationFrame(idleAnimFrame);
  } else {
    pauseBtn.classList.remove('active');
    pauseBtn.textContent = '⏸️ Pause';
    playBtn.disabled = true;
    playBtn.classList.add('active');
    idleLastTick = performance.now();
    idleAnimFrame = requestAnimationFrame(idleTick);
  }
}

function idleStop() {
  idleRunning = false;
  idlePaused = false;
  if (idleAnimFrame) {
    cancelAnimationFrame(idleAnimFrame);
    idleAnimFrame = null;
  }
}

function idleFinish() {
  idleStop();
  const logEl = document.getElementById('idle-log');

  if (idleSim) {
    idleAppendLog(logEl, '', '');
    idleAppendLog(logEl, `${'═'.repeat(60)}`, '');
    const summary = idleSim.format_summary();
    for (const line of summary.split('\n')) {
      idleAppendLog(logEl, line, '');
    }

    // Make finished game available to Record Player
    if (typeof groovePopulateCrystals === 'function') {
      groovePopulateCrystals();
    }
  }

  // Reset buttons
  document.getElementById('idle-play-btn').classList.remove('active');
  document.getElementById('idle-play-btn').disabled = false;
  document.getElementById('idle-play-btn').textContent = '▶️ New';
  document.getElementById('idle-pause-btn').disabled = true;
  document.getElementById('idle-pause-btn').classList.remove('active');
  document.getElementById('idle-pause-btn').textContent = '⏸️ Pause';
  document.getElementById('idle-finish-btn').disabled = true;
  document.getElementById('idle-scenario').disabled = false;

  idleSim = null;
}

function idleTick(now) {
  if (!idleRunning || idlePaused) return;

  const speed = IDLE_SPEED_MAP[idleSpeed];
  const interval = 1000 / speed;

  if (now - idleLastTick >= interval) {
    idleLastTick = now;
    idleDoStep();
  }

  idleAnimFrame = requestAnimationFrame(idleTick);
}

function idleDoStep() {
  if (!idleSim) return;

  // Apply stochastic drift before physics
  idleApplyDrift();

  // Run the physics step
  const prevCrystalCount = idleSim.crystals.length;
  const log = idleSim.run_step();

  // Record supersaturation history
  idleRecordHistory();

  // Log output
  const logEl = document.getElementById('idle-log');
  if (idleSim.step % 10 === 0 || log.length > 0) {
    if (idleSim.step % 25 === 0) {
      idleAppendLog(logEl, `── Step ${idleSim.step} │ T=${idleSim.conditions.temperature.toFixed(0)}°C │ pH=${idleSim.conditions.fluid.pH.toFixed(1)} │ ${idleSim.crystals.filter(c => c.active).length} crystals`, 'log-step');
    }
    for (const line of log) {
      let cls = '';
      if (line.includes('NUCLEATION')) cls = 'log-nucleation';
      else if (line.includes('DISSOLUTION') || line.includes('⬇')) cls = 'log-dissolution';
      else if (line.includes('▲')) cls = 'log-growth';
      idleAppendLog(logEl, line, cls);
    }
  }

  // Update chart and status
  idleDrawChart();
  idleDrawPie();
  idleUpdateStatus();
  if (typeof topoRender === 'function') topoRender();
}

function idleUpdateSpeed(val) {
  idleSpeed = parseInt(val);
  document.getElementById('idle-speed-val').textContent = IDLE_SPEED_MAP[idleSpeed] + ' step/s';
}

function idlePickScenario(val) {
  // Reset if not running
  if (!idleRunning) {
    idleSim = null;
    idleHistory = [];
    const logEl = document.getElementById('idle-log');
    logEl.innerHTML = '<div style="color:#5a4a30; font-style:italic; text-align:center; padding:1rem;">Press ▶️ Play to start the simulation.</div>';
    document.getElementById('idle-step-counter').textContent = 'Step 0 · 0 crystals · 0°C';
    document.getElementById('idle-play-btn').textContent = '▶️ Play';
    const canvas = document.getElementById('idle-chart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#070706';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// On initial page load, update the title-screen Load Game button state
// based on whether any individual crystals are in the collection.
(function titleInit() {
  try { refreshTitleLoadButton(); } catch (e) { /* ignore */ }
})();

