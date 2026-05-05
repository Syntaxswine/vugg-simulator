// ============================================================
// js/98-ui-groove.ts — UI — Record Groove mode (the turntable)
// ============================================================
// Extracted verbatim from the legacy bundle. SCRIPT-mode TS — top-level
// decls stay global so cross-file references resolve at runtime.
//
// Phase B11 of PROPOSAL-MODULAR-REFACTOR.

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

