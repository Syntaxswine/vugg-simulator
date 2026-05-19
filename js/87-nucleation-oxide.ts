// ============================================================
// js/87-nucleation-oxide.ts — per-mineral nucleation gates (oxide)
// ============================================================
// One `_nuc_<mineral>(sim)` helper per supported oxide-class mineral.
// Each is a pure side-effecting function: reads sim state, conditionally
// calls sim.nucleate(...), and pushes a log line.
//
// VugSimulator.check_nucleation iterates over each class group via
// _nucleateClass_<klass>(sim). See 85-simulator.ts.
//
// Phase B15 of PROPOSAL-MODULAR-REFACTOR.

function _nuc_hematite(sim) {
  const existing_quartz = sim.crystals.filter(c => c.mineral === 'quartz' && c.active);
  const sigma_hem = sim.conditions.supersaturation_hematite();
  const existing_hem = sim.crystals.filter(c => c.mineral === 'hematite' && c.active);
  const total_hem = sim.crystals.filter(c => c.mineral === 'hematite').length;
  if (sigma_hem > 1.2 && !existing_hem.length && total_hem < 3 && !sim._atNucleationCap('hematite')) {
    let pos = 'vug wall';
    if (existing_quartz.length && rng.random() < 0.4) {
      pos = `on quartz #${existing_quartz[0].crystal_id}`;
    }
    const c = sim.nucleate('hematite', pos, sigma_hem);
    sim.log.push(`  ✦ NUCLEATION: Hematite #${c.crystal_id} on ${c.position} (T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma_hem.toFixed(2)})`);
  }

  // Malachite nucleation — needs sigma > 1.0
}
function _nuc_uraninite(sim) {
  const existing_quartz = sim.crystals.filter(c => c.mineral === 'quartz' && c.active);
  const sigma_urn = sim.conditions.supersaturation_uraninite();
  const existing_urn = sim.crystals.filter(c => c.mineral === 'uraninite' && c.active);
  const total_urn = sim.crystals.filter(c => c.mineral === 'uraninite').length;
  if (sigma_urn > 1.5 && existing_urn.length < 3 && total_urn < 5 && !sim._atNucleationCap('uraninite')) {
    if (!existing_urn.length || (sigma_urn > 2.5 && rng.random() < 0.3)) {
      const c = sim.nucleate('uraninite', 'vug wall', sigma_urn);
      sim.log.push(`  ✦ NUCLEATION: ☢️ Uraninite #${c.crystal_id} on ${c.position} (T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma_urn.toFixed(2)}) — radioactive!`);
    }
  }

  // Smithsonite nucleation — needs sigma > 1.0, oxidized Zn environment
}
function _nuc_magnetite(sim) {
  const sigma_mag = sim.conditions.supersaturation_magnetite();
  const existing_mag = sim.crystals.filter(c => c.mineral === 'magnetite' && c.active);
  if (sigma_mag > 1.0 && !sim._atNucleationCap('magnetite')) {
    if (!existing_mag.length || (sigma_mag > 1.7 && rng.random() < 0.2)) {
      let pos = 'vug wall';
      const active_hem_mag = sim.crystals.filter(c => c.mineral === 'hematite' && c.active);
      if (active_hem_mag.length && rng.random() < 0.3) pos = `on hematite #${active_hem_mag[0].crystal_id}`;
      const c = sim.nucleate('magnetite', pos, sigma_mag);
      sim.log.push(`  ✦ NUCLEATION: Magnetite #${c.crystal_id} on ${c.position} (T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma_mag.toFixed(2)}, Fe=${sim.conditions.fluid.Fe.toFixed(0)}, O₂=${sim.conditions.fluid.O2.toFixed(2)})`);
    }
  }

  // Lepidocrocite nucleation — Fe + rapid oxidation at low T.
}
function _nuc_cuprite(sim) {
  const sigma_cpr = sim.conditions.supersaturation_cuprite();
  const existing_cpr = sim.crystals.filter(c => c.mineral === 'cuprite' && c.active);
  if (sigma_cpr > 1.2 && !sim._atNucleationCap('cuprite')) {
    if (!existing_cpr.length || (sigma_cpr > 1.8 && rng.random() < 0.2)) {
      let pos = 'vug wall';
      const active_nc_cpr = sim.crystals.filter(c => c.mineral === 'native_copper' && c.active);
      const active_chc_cpr = sim.crystals.filter(c => c.mineral === 'chalcocite' && c.active);
      if (active_nc_cpr.length && rng.random() < 0.6) pos = `on native_copper #${active_nc_cpr[0].crystal_id}`;
      else if (active_chc_cpr.length && rng.random() < 0.3) pos = `on chalcocite #${active_chc_cpr[0].crystal_id}`;
      const c = sim.nucleate('cuprite', pos, sigma_cpr);
      sim.log.push(`  ✦ NUCLEATION: Cuprite #${c.crystal_id} on ${c.position} (T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma_cpr.toFixed(2)}, Cu=${sim.conditions.fluid.Cu.toFixed(0)}, O₂=${sim.conditions.fluid.O2.toFixed(1)})`);
    }
  }

  // Azurite nucleation — Cu + high CO₃ + O₂ (limestone-hosted Cu deposit).
}

function _nuc_rutile(sim) {
  const sigma = sim.conditions.supersaturation_rutile();
  if (sigma > 1.3 && !sim._atNucleationCap('rutile') && rng.random() < 0.12) {
    let pos = 'vug wall';
    const qz = sim.crystals.filter(c => c.mineral === 'quartz' && c.active);
    // Rutilated quartz — strong substrate preference for growing quartz
    if (qz.length && rng.random() < 0.55) pos = `included in quartz #${qz[0].crystal_id} (rutilated quartz / Venus hair)`;
    const c = sim.nucleate('rutile', pos, sigma);
    sim.log.push(`  ✦ NUCLEATION: 🔴 Rutile #${c.crystal_id} on ${c.position} (Ti ${sim.conditions.fluid.Ti.toFixed(1)} ppm, T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma.toFixed(2)})`);
  }
}

function _nuc_chromite(sim) {
  const sigma = sim.conditions.supersaturation_chromite();
  if (sigma > 1.4 && !sim._atNucleationCap('chromite') && rng.random() < 0.10) {
    const c = sim.nucleate('chromite', 'vug wall', sigma);
    sim.log.push(`  ✦ NUCLEATION: ⚫ Chromite #${c.crystal_id} on ${c.position} (Cr ${sim.conditions.fluid.Cr.toFixed(0)} Fe ${sim.conditions.fluid.Fe.toFixed(0)} ppm at T=${sim.conditions.temperature.toFixed(0)}°C, σ=${sigma.toFixed(2)}) — magmatic spinel`);
  }
}

function _nuc_cassiterite(sim) {
  // SnO₂ — primary tin ore, late-pegmatite to greisen to hydrothermal
  // vein. Per research-cassiterite.md (boss canonical 2026-05).
  // Substrate priority encodes the documented paragenetic ordering
  // (research §Paragenetic Sequence): forms AFTER granite fractionation
  // (Sn concentrates in late melts), BEFORE late sulfides. Typical
  // associations: wolframite, fluorite, topaz, tourmaline, arsenopyrite,
  // quartz. Cassiterite-on-wolframite is the classic Erzgebirge /
  // Cornwall greisen association.
  const sigma_sn = sim.conditions.supersaturation_cassiterite();
  if (sigma_sn > 1.2 && !sim._atNucleationCap('cassiterite')) {
    if (rng.random() < 0.18) {
      let pos = 'vug wall';
      const active_wf_sn   = sim.crystals.filter(c => c.mineral === 'wolframite' && c.active);
      const active_tpz_sn  = sim.crystals.filter(c => c.mineral === 'topaz' && c.active);
      const active_tml_sn  = sim.crystals.filter(c => c.mineral === 'tourmaline' && c.active);
      const active_qtz_sn  = sim.crystals.filter(c => c.mineral === 'quartz' && c.active);
      const active_feld_sn = sim.crystals.filter(c => c.mineral === 'feldspar' && c.active);
      if (active_wf_sn.length && rng.random() < 0.40) {
        pos = `on wolframite #${active_wf_sn[0].crystal_id} (classic Cornish Sn-W greisen pair)`;
      } else if (active_tpz_sn.length && rng.random() < 0.30) {
        pos = `on topaz #${active_tpz_sn[0].crystal_id}`;
      } else if (active_tml_sn.length && rng.random() < 0.25) {
        pos = `on tourmaline #${active_tml_sn[0].crystal_id}`;
      } else if (active_qtz_sn.length && rng.random() < 0.30) {
        pos = `on quartz #${active_qtz_sn[0].crystal_id}`;
      } else if (active_feld_sn.length && rng.random() < 0.20) {
        pos = `on feldspar #${active_feld_sn[0].crystal_id}`;
      }
      const c = sim.nucleate('cassiterite', pos, sigma_sn);
      const f = sim.conditions.fluid;
      const T = sim.conditions.temperature;
      const habit_preview = T > 500 ? 'prismatic dipyramid' : (T >= 300 ? 'equant blocky' : 'wood-tin botryoidal');
      sim.log.push(`  ✦ NUCLEATION: Cassiterite #${c.crystal_id} (${habit_preview}) on ${c.position} (T=${T.toFixed(0)}°C, σ=${sigma_sn.toFixed(2)}, Sn=${f.Sn.toFixed(0)} ppm, Fe=${f.Fe.toFixed(0)})`);
    }
  }
}

function _nucleateClass_oxide(sim) {
  _nuc_hematite(sim);
  _nuc_uraninite(sim);
  _nuc_magnetite(sim);
  _nuc_cuprite(sim);
  _nuc_rutile(sim);
  _nuc_chromite(sim);
  _nuc_cassiterite(sim);
}
