#!/usr/bin/env node
// tools/photo-rig.mjs — photograph the SHIPPED Three.js crystal render.
//
// The visual-realism review (proposals/PROPOSAL-HOSTILE-REVIEW-VISUAL-REALISM-2026-09-04.md)
// needs pictures of what the player actually sees, not a re-implementation of the
// drawing (feedback: photograph the REAL renderer). This tool runs the built game in a
// headless Chrome that it owns (the tools/browser-workflow.mjs launch recipe), drives the
// real scenario through the real Creative-mode entry point, forces the Three.js path,
// and reads the WebGL framebuffer back as PNG in the same JS task as the draw call
// (preserveDrawingBuffer is false — a screenshot taken a task later reads black).
//
// Three kinds of shot:
//   cavity — the game's own camera rig (tilt/zoom/pan globals → _topoApplyCameraFromTilt).
//   hero   — the N largest crystals (optionally one mineral), each framed 3/4 from its
//            own c-axis; the wall/lighting switch follows the game's inside-cavity rule
//            so the picture is one the player COULD reach by zooming, not a studio set.
//   druse  — the densest patch of crystals, framed from the mean wall normal.
// plus a ROSTER: every crystal mesh's mineral, habit token, material (colour/opacity/
// roughness/metalness) and rendered extent — the material census the review quotes.
//
// Output (default .local-evidence/photos/<scenario>-s<seed>/): PNGs + manifest.json
// (rig, GL renderer string, camera per shot, roster, per-image luminance stats) +
// contact-sheet.html. .local-evidence is the one directory excluded from the identity
// hash, so this never disturbs a running test suite.
//
//   node tools/photo-rig.mjs --scenario elmwood
//   node tools/photo-rig.mjs --scenario mvt --seed 42 --steps 200 --shots cavity,hero,druse
//        --hero-n 3 --mineral calcite --size 1200x900 --wall solid|translucent|hidden
//        --tilt 0.35,0.6 --zoom 1.0 --out DIR --keep-browser
//   node tools/photo-rig.mjs --scenario elmwood --mood studio --exposure 1.2      (R1 lighting rig)
//   node tools/photo-rig.mjs --scenario elmwood --experiment legacylight --label before
//        (ablation: the pre-R1 two-light look on the same build — the before/after pair)
//   node tools/photo-rig.mjs --scenario elmwood --tier alpha --label alpha            (R2 materials)
//        (the Depth-A alpha tier on the same build; default = the rig's own decision,
//        transmission on a desktop viewport — ACTIVE only where the wall is drawn opaque)
//   node tools/photo-rig.mjs --scenario elmwood --experiment legacylustre --label before
//        (ablation: the pre-R2 class heuristics painted over the same scene — R2's before half)
//   node tools/photo-rig.mjs --scenario elmwood --shots hero --probe seethrough
//        (per hero body: silhouette mask, the frame with the wall hidden, and the inside-mask
//        statistics — highlight fraction, mean colour, and how much the wall behind changes
//        the pixels inside the crystal)
//   node tools/photo-rig.mjs --list
//
// Passive instrument: it reports, it never fails a build (feedback_passive_instrument_not_gate).
// Transplanted onto canonical SIM 285 (2026-09-05): process cleanup uses browser-workflow's
// receipt-authenticated descendants API (the profile-path scan it replaced is gone).
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CdpClient,
  captureOwnedBrowserProcessReceiptsForPort,
  fetchWithDeadline,
  runCleanupActions,
  spawnOwned,
  terminateOwned,
  terminateOwnedProcessReceipts,
  waitForDevToolsReceipt,
  waitForHttp,
} from './browser-workflow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------- args
function parseArgs(argv) {
  const out = {
    scenario: null, seed: 42, steps: null, shots: ['cavity', 'hero', 'druse'],
    heroN: 3, mineral: null, size: [1200, 900], wall: 'solid', tilt: [0.35, 0.6],
    zoom: 1.0, out: null, keepBrowser: false, list: false, jpegQuality: null,
    label: null, photoStats: [], experiment: [],
    mood: null, exposure: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--scenario') out.scenario = next();
    else if (a === '--seed') out.seed = Number(next());
    else if (a === '--steps') out.steps = Number(next());
    else if (a === '--shots') out.shots = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--hero-n') out.heroN = Number(next());
    else if (a === '--mineral') out.mineral = next();
    else if (a === '--size') out.size = next().split('x').map(Number);
    else if (a === '--wall') out.wall = next();
    else if (a === '--tilt') out.tilt = next().split(',').map(Number);
    else if (a === '--zoom') out.zoom = Number(next());
    else if (a === '--out') out.out = next();
    else if (a === '--label') out.label = next();
    else if (a === '--keep-browser') out.keepBrowser = true;
    else if (a === '--list') out.list = true;
    else if (a === '--photo-stats') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.photoStats.push(argv[++i]); }
    else if (a === '--experiment') out.experiment = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--mood') out.mood = next();                 // cave | studio (R1 lighting rig)
    else if (a === '--exposure') out.exposure = Number(next()); // toneMappingExposure override
    else if (a === '--tier') out.tier = next();                 // transmission | alpha (R2 optics tier)
    else if (a === '--probe') out.probe = next().split(',').map(s => s.trim()).filter(Boolean);   // seethrough
    else if (a === '--help' || a === '-h') { out.help = true; }
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

// ---------------------------------------------------------------- browser plumbing
function browserCandidates() {
  const env = process.env.VUGG_BROWSER_BIN ? [process.env.VUGG_BROWSER_BIN] : [];
  if (process.platform === 'win32') {
    return [...env,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'];
  }
  if (process.platform === 'darwin') {
    return [...env,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  }
  return [...env, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
}
function findBrowser() {
  const b = browserCandidates().find(c => c && existsSync(c));
  if (!b) throw new Error('No Chrome/Edge/Chromium found. Set VUGG_BROWSER_BIN.');
  return b;
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const delay = ms => new Promise(r => setTimeout(r, ms));

// Flat-session CDP page driver (Target.attachToTarget flatten:true → messages carry
// sessionId; CdpClient.send takes it as the third argument).
class Page {
  constructor(client, sessionId) { this.client = client; this.sessionId = sessionId; this.exceptions = []; }
  send(method, params = {}) { return this.client.send(method, params, this.sessionId); }
  async evaluate(expression, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    // CdpClient.send has its own 20 s timer; long in-page work (a 300-step sim) is
    // done through a polled job so no single request has to wait on it.
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'evaluate failed');
    }
    return r.result?.value;
  }
  // Start an async job in the page and poll it — keeps every CDP request short.
  async job(bodyExpression, { timeoutMs = 600_000, label = 'job' } = {}) {
    const key = `__photoRigJob_${randomUUID().replace(/-/g, '')}`;
    await this.evaluate(`(() => {
      window.${key} = { done: false, error: null, value: null };
      (async () => { try { window.${key}.value = await (${bodyExpression}); }
        catch (e) { window.${key}.error = String(e && e.stack || e); }
        finally { window.${key}.done = true; } })();
      return true; })()`);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      let s = null;
      // A synchronous stretch of page work (a cavity rebuild, a long step loop) can hold
      // the main thread past the client's 20 s request timer; that is not a failure of
      // the job, so a timed-out poll is retried until the job's own deadline.
      try { s = await this.evaluate(`(() => { const j = window.${key}; return j ? { done: j.done, error: j.error } : null; })()`); }
      catch (e) { if (!/timed out/i.test(String(e.message))) throw e; }
      if (s && s.done) {
        if (s.error) throw new Error(`${label}: ${s.error}`);
        const v = await this.evaluate(`window.${key}.value`);
        await this.evaluate(`delete window.${key}; true`);
        return v;
      }
      await delay(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }
  async waitFor(expression, label, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < deadline) {
      try { const v = await this.evaluate(expression); if (v) return v; } catch (e) { last = e; }
      await delay(100);
    }
    throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
  }
}

// ---------------------------------------------------------------- PNG stats (decoder)
// A small PNG reader for 8-bit RGB/RGBA non-interlaced images (what toDataURL emits):
// enough to compute luminance statistics so before/after comparisons carry a number
// beside the picture (feedback_measure_the_artefact). Refuses anything else.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8];
      colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || !(colorType === 2 || colorType === 6)) {
    throw new Error(`unsupported PNG (bitDepth ${bitDepth}, colorType ${colorType}, interlace ${interlace})`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a; else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
    cur.copy(out, y * stride); prev = cur;
  }
  return { width, height, bpp, data: out };
}
function imageStats(png) {
  const { width, height, bpp, data } = png;
  const n = width * height;
  const hist = new Array(16).fill(0);
  let sumL = 0, bright = 0, dark = 0, edges = 0, satSum = 0, subjSum = 0, subjN = 0;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * bpp], g = data[i * bpp + 1], b = data[i * bpp + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[i] = L; sumL += L;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    satSum += mx > 0 ? (mx - mn) / mx : 0;
    hist[Math.min(15, (L / 16) | 0)]++;
    if (L > 235) bright++;
    if (L < 12) dark++; else { subjSum += L; subjN++; }
  }
  // gradient energy — a proxy for edge/texture density (real crystal photos are busy)
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const gx = lum[i + 1] - lum[i - 1], gy = lum[i + width] - lum[i - width];
    if (gx * gx + gy * gy > 900) edges++;
  }
  return {
    width, height,
    mean_luminance: +(sumL / n).toFixed(2),
    // R1 (2026-09-05): the orb view is mostly void, so the frame mean measures orb SIZE;
    // the subject mean (pixels at or above the dark bin) is what lighting actually moves.
    subject_luminance: subjN ? +(subjSum / subjN).toFixed(2) : null,
    mean_saturation: +(satSum / n).toFixed(4),
    highlight_fraction: +(bright / n).toFixed(5),   // pixels > 235 (specular pops)
    dark_fraction: +(dark / n).toFixed(5),           // pixels < 12 (background / shadow)
    edge_fraction: +(edges / n).toFixed(5),          // strong-gradient pixels
    histogram16: hist,
  };
}

// R2 see-through probe (2026-09-06): statistics INSIDE one hero body's silhouette. `mask`
// is the white-on-black silhouette render of that body alone, `other` the same camera
// with the wall hidden. background_delta is the mean |ΔL| inside the mask between the
// two frames — how much of what is seen inside the crystal is the wall behind it (≈ 0 for
// an opaque body); highlight_fraction inside the mask is the Fresnel/lustre pop the whole-
// frame statistic dilutes.
function maskStats(main, mask, other) {
  const n = main.width * main.height;
  if (mask.width !== main.width || mask.height !== main.height || other.width !== main.width || other.height !== main.height) {
    throw new Error('probe frame size mismatch');
  }
  let inside = 0, sumL = 0, bright = 0, dSum = 0, r = 0, g = 0, b = 0, satSum = 0;
  for (let i = 0; i < n; i++) {
    const mL = 0.2126 * mask.data[i * mask.bpp] + 0.7152 * mask.data[i * mask.bpp + 1] + 0.0722 * mask.data[i * mask.bpp + 2];
    if (mL < 128) continue;
    inside++;
    const pr = main.data[i * main.bpp], pg = main.data[i * main.bpp + 1], pb = main.data[i * main.bpp + 2];
    const L = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
    sumL += L; r += pr; g += pg; b += pb;
    const mx = Math.max(pr, pg, pb), mn = Math.min(pr, pg, pb);
    satSum += mx > 0 ? (mx - mn) / mx : 0;
    if (L > 235) bright++;
    const oL = 0.2126 * other.data[i * other.bpp] + 0.7152 * other.data[i * other.bpp + 1] + 0.0722 * other.data[i * other.bpp + 2];
    dSum += Math.abs(L - oL);
  }
  if (!inside) return { mask_fraction: 0 };
  return {
    mask_fraction: +(inside / n).toFixed(5),
    mean_luminance: +(sumL / inside).toFixed(2),
    mean_saturation: +(satSum / inside).toFixed(4),
    highlight_fraction: +(bright / inside).toFixed(5),
    mean_rgb: [r, g, b].map(v => Math.round(v / inside)),
    background_delta: +(dSum / inside).toFixed(2),
  };
}

// ---------------------------------------------------------------- in-page programs
// Everything below runs INSIDE the game page. Bundle-scope `let`/`function` declarations
// (fortressSim, _topoThreeState, topoRender, …) are reachable from Runtime.evaluate because
// the bundle is one classic <script> in global lexical scope.
const PAGE_HELPERS = `
  const RIG = window.__photoRig = window.__photoRig || {};
  RIG.state = () => (typeof _topoThreeState !== 'undefined' ? _topoThreeState : null);
  RIG.sim = () => (typeof fortressSim !== 'undefined' ? fortressSim : null);
  RIG.hex = c => '#' + c.getHexString();
  RIG.glInfo = () => {
    const st = RIG.state(); if (!st || !st.renderer) return null;
    const gl = st.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      webgl2: !!st.renderer.capabilities.isWebGL2,
      three: (typeof THREE !== 'undefined' && THREE.REVISION) || null,
      toneMapping: st.renderer.toneMapping, outputColorSpace: st.renderer.outputColorSpace,
      shadowMap: !!st.renderer.shadowMap.enabled,
      environment: !!st.scene.environment, background: st.scene.background ? String(st.scene.background) : null,
      lights: st.scene.children.filter(o => o.isLight).map(o => ({ type: o.type, intensity: o.intensity, color: RIG.hex(o.color) })),
      pixelRatio: st.renderer.getPixelRatio(),
      // R1 lighting rig receipt (mood, environment, tone mapping, shadow map, step-downs)
      lighting: st.lightingRig || null, exposure: st.renderer.toneMappingExposure,
      // R2 optics rig receipt (tier, reason, material counts)
      optics: st.opticsRig ? { ...st.opticsRig } : null,
    };
  };
  // R2: move the live scene between the transmission and alpha tiers in place (the A/B on
  // one build). No argument → report the current rig.
  RIG.applyTier = tier => {
    const st = RIG.state();
    if (!tier) return st.opticsRig ? { ...st.opticsRig } : null;
    if (typeof _topoOpticsApplyTier !== 'function') return { error: 'no optics rig in this build' };
    const rig = _topoOpticsApplyTier(st, tier, 'photo-rig --tier ' + tier);
    return rig ? { ...rig } : null;
  };
  // R2 see-through probe: the hero body's silhouette (everything else hidden, one white
  // unlit material) and the same frame with the wall hidden. Restores what it touched.
  RIG.seeThroughFrames = (mesh, w, h, wall) => {
    const st = RIG.state();
    const vis = [];
    st.scene.traverse(o => { if (o.isMesh) vis.push([o, o.visible]); });
    for (const [o] of vis) o.visible = (o === mesh);
    const prevOverride = st.scene.overrideMaterial;
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
    st.scene.overrideMaterial = white;
    const mask = RIG.render(w, h);
    st.scene.overrideMaterial = prevOverride;
    for (const [o, v] of vis) o.visible = v;
    white.dispose();
    // Hide the cavity MESH directly — going through _topoApplyWallDisplay would also drop
    // the active optics tier to alpha (no backdrop), and the no-wall frame must be rendered
    // with exactly the materials of the main frame.
    const prevVisible = st.cavity ? st.cavity.visible : null;
    if (st.cavity) st.cavity.visible = false;
    const nowall = RIG.render(w, h);
    if (st.cavity) st.cavity.visible = prevVisible;
    return { mask, nowall };
  };
  // Own-geometry world box (children such as O5c band shells excluded; an InstancedMesh
  // reports the union of its instances, which is the swath's real footprint).
  RIG.bbox = obj => {
    const b = new THREE.Box3();
    if (obj.isInstancedMesh) { b.setFromObject(obj); }
    else { obj.updateWorldMatrix(true, false); if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox(); b.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld); }
    const s = new THREE.Vector3(); b.getSize(s); const c = new THREE.Vector3(); b.getCenter(c); return { b, size: s, center: c };
  };
  RIG.kind = m => m.userData?.surfaceGrowth ? 'swath' : m.userData?.isSatellite ? 'satellite' : m.userData?.o5Band ? 'band' : m.isInstancedMesh ? 'instanced' : 'crystal';
  RIG.isBody = m => m.isMesh && m.userData && m.userData.crystal_id != null && RIG.kind(m) === 'crystal';
  RIG.axis = mesh => new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion())).normalize();
  RIG.roster = () => {
    const st = RIG.state(); const sim = RIG.sim(); if (!st || !sim) return [];
    const byId = new Map((sim.crystals || []).map(c => [c.crystal_id, c]));
    const rows = [];
    for (const m of st.crystals.children) {
      if (!m.isMesh || !m.userData || m.userData.crystal_id == null) continue;
      const cr = byId.get(m.userData.crystal_id);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const mat = mats[0];
      const { size, center } = RIG.bbox(m);
      rows.push({
        crystal_id: m.userData.crystal_id, mineral: m.userData.mineral,
        kind: RIG.kind(m), instances: m.isInstancedMesh ? m.count : 1,
        regime: m.userData.regime || null, coverage_fraction: m.userData.coverage_fraction ?? null,
        habit: cr ? cr.habit : null,
        token: (cr && typeof _habitGeomToken === 'function') ? _habitGeomToken(cr.habit) : null,
        c_length_mm: cr ? +Number(cr.c_length_mm).toFixed(3) : null,
        a_width_mm: cr ? +Number(cr.a_width_mm).toFixed(3) : null,
        rendered_extent_mm: +Math.max(size.x, size.y, size.z).toFixed(3),
        bbox_size: [size.x, size.y, size.z].map(v => +v.toFixed(3)),
        center: [center.x, center.y, center.z].map(v => +v.toFixed(2)),
        vertices: m.geometry?.attributes?.position?.count ?? null,
        material: mat ? { type: mat.type, color: RIG.hex(mat.color), opacity: mat.opacity, transparent: !!mat.transparent,
          roughness: mat.roughness, metalness: mat.metalness, vertexColors: !!mat.vertexColors,
          transmission: mat.transmission ?? null, clearcoat: mat.clearcoat ?? null, ior: mat.ior ?? null,
          flatShading: !!mat.flatShading, side: mat.side, materials: mats.length } : null,
        tags: cr ? Object.keys(cr).filter(k => /^_(sceptre|gwindel|deformation|sectorZoned|split|saddle|etched|film|occlusion|nucTilt)/.test(k) && cr[k]) : [],
        dissolved: !!(cr && cr.dissolved),
      });
    }
    return rows;
  };
  RIG.render = (w, h) => {
    const st = RIG.state();
    st.renderer.setSize(w, h, false);
    st.camera.aspect = w / h; st.camera.updateProjectionMatrix();
    st.renderer.render(st.scene, st.camera);
    const canvas = st.renderer.domElement;
    return canvas.toDataURL('image/png');
  };
  RIG.wallMode = mode => { const st = RIG.state(); st.wallDisplay = ({ solid: 0, translucent: 1, hidden: 2 })[mode] ?? 0; _topoApplyWallDisplay(st); };
  RIG.cavityR0 = () => {
    const sim = RIG.sim(); const wall = sim.wall_state;
    let r0 = wall && wall.meanDiameterMm ? wall.meanDiameterMm() / 2 : 25;
    if (wall && typeof wall.max_seen_radius_mm === 'number') r0 = Math.max(r0, wall.max_seen_radius_mm * 0.6);
    return r0;
  };
  // The game's own inside/outside switch (js/99i _topoApplyCameraFromTilt), applied for a
  // directly-placed camera so a hero shot uses the lighting the player would get.
  RIG.applyInsideRule = (aim) => {
    const st = RIG.state(); const r0 = RIG.cavityR0();
    const radius = st.camera.position.length();
    const inside = radius < r0 * 0.95;
    st.insideMode = inside;
    _topoApplyWallDisplay(st);
    if (typeof _topoLightingApplyInsideMode === 'function' && typeof _topoLightingSyncKey === 'function') {
      // R1 rig: exposure follows inside/outside; the key rides THIS camera and aims at the subject.
      _topoLightingApplyInsideMode(st, inside);
      const a = aim || new THREE.Vector3(0, 0, 0);
      _topoLightingSyncKey(st, a.x, a.y, a.z, r0);
    } else {
      // pre-R1 renderer: the two-light rule of the old _topoApplyCameraFromTilt
      if (st.ambient) st.ambient.intensity = inside ? 0.85 : 0.55;
      if (st.directional) st.directional.intensity = inside ? 1.2 : 0.9;
      const p = st.camera.position;
      if (st.directional) st.directional.position.set(p.x * 0.7 + 50, p.y * 0.7 + 200, p.z * 0.7 + 100);
    }
    return { inside, radius, r0 };
  };
  // Mood (cave|studio) and an exposure override, applied after the inside rule so the
  // override wins. Installs directly (not via _topoApplyLightingMood, whose re-render
  // would put the game camera back over a directly placed one). No-op without the R1 rig.
  RIG.applyLighting = (mood, exposure) => {
    const st = RIG.state();
    if (mood && typeof _topoInstallLightingRig === 'function') _topoInstallLightingRig(st, mood);
    if (exposure != null && Number.isFinite(exposure)) {
      st.renderer.toneMappingExposure = exposure;
      if (st.lightingRig) st.lightingRig.exposure = exposure;
    }
    return st.lightingRig ? { ...st.lightingRig, exposure: st.renderer.toneMappingExposure } : null;
  };
  RIG.placeCamera = (center, size, axis, { offAxisDeg = 35, yawDeg = 25, fill = 0.62, upFromAxis = true } = {}) => {
    const st = RIG.state();
    const extent = Math.max(size.x, size.y, size.z);
    // a stable perpendicular to the axis for the off-axis rotation
    const helper = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(axis, helper).normalize();
    const dir = axis.clone().applyAxisAngle(perp, offAxisDeg * Math.PI / 180).applyAxisAngle(axis, yawDeg * Math.PI / 180).normalize();
    const fovRad = st.camera.fov * Math.PI / 180;
    let dist = (extent * 0.5 / fill) / Math.tan(fovRad / 2) * 1.05;
    // Keep the camera INSIDE the cavity: a wall-hugging subject framed from its own c-axis
    // can put the camera through the far wall, where the opaque interior fills the frame.
    // Solve |center + dir·t| = 0.9·r0 and stop there if it comes first.
    const rMax = RIG.cavityR0() * 0.9;
    const b = 2 * center.dot(dir), c = center.lengthSq() - rMax * rMax;
    const disc = b * b - 4 * c;
    if (disc > 0) { const tWall = (-b + Math.sqrt(disc)) / 2; if (tWall > 0 && tWall < dist) dist = Math.max(extent * 0.8, tWall); }
    // The cavity is lumpy (bubble-merge): a bump can still sit between the subject and the
    // camera. Raycast from the subject toward the camera and stop short of the first wall hit.
    // The subject's centre usually sits AT the wall (half-forms are centred on the anchor), so
    // the ray first crosses the wall outward from the rock side; the wall material is
    // single-sided, so test both sides and skip that near crossing.
    if (st.cavity && st.cavity.visible && st.cavity.geometry && st.cavity.geometry.attributes.position) {
      // The game disables the cavity's raycast (hit-tests are crystal-only) — borrow the
      // prototype's for this one query.
      const mat = st.cavity.material; const side = mat.side; mat.side = THREE.DoubleSide;
      const savedRaycast = st.cavity.raycast; st.cavity.raycast = THREE.Mesh.prototype.raycast;
      const rc = new THREE.Raycaster(center.clone(), dir.clone(), 0, dist);
      let hits = [];
      try { hits = rc.intersectObject(st.cavity, false).sort((p, q) => p.distance - q.distance); }
      finally { st.cavity.raycast = savedRaycast; mat.side = side; }
      const far = hits.find(hh => hh.distance > extent * 0.6);
      if (far) dist = Math.min(dist, Math.max(extent * 0.8, far.distance * 0.85));
    }
    const pos = center.clone().add(dir.multiplyScalar(dist));
    st.camera.position.copy(pos);
    st.camera.up.copy(upFromAxis ? axis : new THREE.Vector3(0, 1, 0));
    st.camera.lookAt(center);
    st.camera.near = Math.max(0.05, dist * 0.02); st.camera.far = Math.max(5000, dist * 50);
    st.camera.updateProjectionMatrix();
    return { position: [pos.x, pos.y, pos.z].map(v => +v.toFixed(2)), target: [center.x, center.y, center.z].map(v => +v.toFixed(2)), dist: +dist.toFixed(2), extent: +extent.toFixed(2), fov: st.camera.fov };
  };
  // ---- PROTOTYPE EXPERIMENTS (the plan's before/after evidence; NOT shipped behaviour) ----
  // Each experiment mutates the live scene after the game's own render pass, then the
  // rig re-renders. They exist so a recommendation can be shown, not argued.
  RIG.IOR = { quartz: 1.55, amethyst: 1.55, calcite: 1.66, dolomite: 1.68, fluorite: 1.43, halite: 1.54, sylvite: 1.49,
    barite: 1.64, celestine: 1.62, anhydrite: 1.57, selenite: 1.52, gypsum: 1.52, sphalerite: 2.37, cerussite: 2.08,
    anglesite: 1.88, wulfenite: 2.30, topaz: 1.62, apatite: 1.63, aragonite: 1.68, smithsonite: 1.85, rhodochrosite: 1.80,
    siderite: 1.87, azurite: 1.76, malachite: 1.87, sulfur: 2.0, native_sulfur: 2.0, cinnabar: 3.0, chalcedony: 1.54 };
  RIG.applyExperiments = (list, opts = {}) => {
    const st = RIG.state(); const sim = RIG.sim(); const applied = [];
    if (!list || !list.length) return applied;
    const r0 = RIG.cavityR0();
    if (list.includes('swathoff')) {   // ablation: how much of the picture is the coin carpet?
      for (const m of st.crystals.children) if (m.userData?.surfaceGrowth) m.visible = false;
      applied.push('swathoff');
    }
    if (list.includes('legacylight')) {
      // ABLATION (R1 before/after on ONE build): the pre-R1 two-light look — no environment,
      // no tone mapping, no shadows, ambient 0.55 / warm key 0.9 parked at the old
      // camera-side offset — so a contact sheet shows the same frame as it shipped before.
      st.scene.environment = null;
      st.renderer.toneMapping = THREE.NoToneMapping; st.renderer.toneMappingExposure = 1;
      st.renderer.shadowMap.enabled = false;
      if (st.ambient) st.ambient.intensity = st.insideMode ? 0.85 : 0.55;
      if (st.directional) {
        st.directional.color.set(0xffe6c0); st.directional.intensity = st.insideMode ? 1.2 : 0.9;
        st.directional.castShadow = false;
        const p = st.camera.position;
        st.directional.position.set(p.x * 0.7 + 50, p.y * 0.7 + 200, p.z * 0.7 + 100);
        if (st.directional.target) { st.directional.target.position.set(0, 0, 0); st.directional.target.updateMatrixWorld(true); }
      }
      st.scene.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) m.needsUpdate = true; } });
      if (st.lightingRig) st.lightingRig = { ...st.lightingRig, environment: false, tone_mapping: 'none', shadows: false, shadow_map: 0, exposure: 1, reason: 'legacylight ablation' };
      applied.push('legacylight');
    }
    if (list.includes('envlight') && typeof _topoInstallLightingRig === 'function') {
      // The prototype shipped as R1. envlight now means the real rig's STUDIO mood (the
      // specimen-view set, the same panels the prototype measured), so the old label keeps
      // producing the old picture on a renderer that carries the rig.
      _topoInstallLightingRig(st, 'studio');
      applied.push('envlight');
    } else if (list.includes('envlight')) {
      // Procedural studio: a dark room with three soft emissive panels (key/fill/rim), baked
      // through PMREMGenerator → scene.environment. Real specular reflections + Fresnel on
      // every PBR material, ACES tone mapping, and a shadow-casting key light.
      const room = new THREE.Scene();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: 0x1a1816, side: THREE.BackSide }));
      room.add(shell);
      const panel = (w, h, c, intensity, pos, look) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(intensity), side: THREE.DoubleSide }));
        mesh.position.set(...pos); mesh.lookAt(...look); room.add(mesh);
      };
      panel(30, 22, 0xfff1dc, 9, [18, 26, 20], [0, 0, 0]);    // warm key, high front-left
      panel(34, 26, 0xdfe9ff, 2.5, [-30, 6, 14], [0, 0, 0]);  // cool fill, low front-right
      panel(24, 12, 0xffffff, 6, [-6, 14, -32], [0, 0, 0]);   // rim/back
      panel(60, 60, 0x2a2622, 1.2, [0, -44, 0], [0, 0, 0]);   // floor bounce
      const pmrem = new THREE.PMREMGenerator(st.renderer);
      const env = pmrem.fromScene(room, 0.04).texture;
      st.scene.environment = env;
      st.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      st.renderer.toneMappingExposure = opts.exposure ?? 1.0;
      if (st.ambient) st.ambient.intensity = 0.12;
      if (st.directional) {
        st.directional.intensity = 1.6;
        st.renderer.shadowMap.enabled = true; st.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        st.directional.castShadow = true;
        st.directional.shadow.mapSize.set(2048, 2048);
        const sc = st.directional.shadow.camera; const R = r0 * 1.6;
        sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.5; sc.far = r0 * 12; sc.updateProjectionMatrix();
        st.directional.shadow.bias = -0.0004; st.directional.shadow.normalBias = 0.02;
      }
      st.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      st.cavity.castShadow = false;
      st.scene.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) { m.envMapIntensity = 1.0; m.needsUpdate = true; } } });
      applied.push('envlight');
    }
    if (list.includes('polish')) {
      // R2 PREVIEW: vitreous faces are smooth. Roughness 0.12 on every crystal body (swaths,
      // bands and satellites untouched) — what the environment has to mirror before a
      // highlight can exist. Not shipped: the lustre consumer (R2) decides this per species.
      let n = 0;
      for (const m of st.crystals.children) {
        if (!m.isMesh || !m.userData || m.userData.crystal_id == null || m.userData.surfaceGrowth || m.userData.o5Band) continue;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) if (mat && 'roughness' in mat) { mat.roughness = 0.12; mat.needsUpdate = true; n++; }
      }
      applied.push('polish:' + n);
    }
    if (list.includes('opaque')) {
      // R2 PREVIEW (D1's other half): alpha off on every crystal body. A 50 % alpha over the
      // wall caps a fully clipped reflection near L 200, so no alpha ghost can ever reach
      // the 235 highlight bin; transmission (R2) keeps opacity 1. Colour and roughness kept.
      let n = 0;
      for (const m of st.crystals.children) {
        if (!m.isMesh || !m.userData || m.userData.crystal_id == null || m.userData.surfaceGrowth || m.userData.o5Band) continue;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) if (mat && mat.transparent) { mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.needsUpdate = true; n++; }
      }
      applied.push('opaque:' + n);
    }
    if (list.includes('mirror')) {
      // DIAGNOSTIC: the largest crystal body becomes a polished white metal ball-bearing.
      // If the environment reaches the materials its panels appear on it (highlight
      // fraction > 0); if it stays dark the PMREM is not being sampled.
      let best = null, bestExt = 0;
      for (const m of st.crystals.children) {
        if (!m.isMesh || !m.userData || m.userData.crystal_id == null || m.userData.surfaceGrowth || m.userData.o5Band) continue;
        const ext = RIG.bbox(m).size.length(); if (ext > bestExt) { bestExt = ext; best = m; }
      }
      if (best) {
        const mat = Array.isArray(best.material) ? best.material[0] : best.material;
        mat.color.setRGB(1, 1, 1); mat.metalness = 1; mat.roughness = 0.05; mat.transparent = false; mat.opacity = 1; mat.depthWrite = true; mat.vertexColors = false; mat.needsUpdate = true;
      }
      applied.push('mirror:' + (best ? best.userData.mineral + '@' + bestExt.toFixed(1) : 'none'));
    }
    if (list.includes('wall2side')) {
      // DIAGNOSTIC: render the cavity wall two-sided and report which way its normals
      // point (mean sign of n·p over the vertices: outward > 0). A hero frame whose
      // background is the clear colour, not rock, is either a culled wall or an unlit one.
      const g = st.cavity.geometry; let dot = 0, n = 0;
      const P = g.attributes.position, N = g.attributes.normal;
      if (P && N) for (let i = 0; i < P.count; i += 7) { dot += P.getX(i) * N.getX(i) + P.getY(i) * N.getY(i) + P.getZ(i) * N.getZ(i); n++; }
      st.cavity.material.side = THREE.DoubleSide; st.cavity.material.needsUpdate = true;
      applied.push('wall2side:' + (n ? (dot / n > 0 ? 'outward' : 'inward') : 'no-normals') + ':' + (st.cavity.visible ? 'visible' : 'hidden') + ':op' + st.cavity.material.opacity);
    }
    if (list.includes('legacylustre')) {
      // R2 ablation on the same build: the pre-R2 class heuristics (roughness 0.42 silicate/
      // oxide else 0.62; metalness 0.45 sulfide/native else 0.08; the lexicon swatch as the
      // colour; Depth-A alpha translucency, no transmission) painted over the resolved
      // materials — the before half of R2's before/after pair.
      let n = 0;
      const seen = new Set();
      for (const m of st.crystals.children) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          if (!mat || seen.has(mat)) continue; seen.add(mat);
          const o = mat.userData && mat.userData.optics; if (!o) continue;
          const spec = MINERAL_SPEC && MINERAL_SPEC[m.userData.mineral];
          const klass = spec && spec.class;
          let rough = (klass === 'silicate' || klass === 'oxide') ? 0.42 : 0.62;
          if (o.roughness > OPTICS_LUSTRE_TABLE[o.lustre].roughness + 0.1) rough = Math.min(1, rough + (o.roughness - OPTICS_LUSTRE_TABLE[o.lustre].roughness));   // keep the state modifiers' matte
          mat.roughness = rough;
          mat.metalness = (klass === 'sulfide' || klass === 'native') ? 0.45 : 0.08;
          if (!o.sector) mat.color.setHex(o.body);
          mat.transmission = 0; mat.sheen = 0; mat.clearcoat = 0; mat.ior = 1.5; mat.specularIntensity = 1;
          if (o.perimorph) { mat.transparent = true; mat.opacity = Math.min(o.alpha_opacity, 0.42); }
          else if (o.clarity > 0) { mat.transparent = true; mat.opacity = o.alpha_opacity; }
          else { mat.transparent = false; mat.opacity = 1; }
          mat.depthWrite = true; mat.needsUpdate = true; n++;
        }
        if (m.userData && mats[0] && mats[0].userData && mats[0].userData.optics) m.userData.naturalOpacity = mats[0].transparent ? mats[0].opacity : 1.0;
      }
      if (st.opticsRig) st.opticsRig = { ...st.opticsRig, tier: 'legacy', active: 'legacy', reason: 'legacylustre ablation' };
      applied.push('legacylustre:' + n);
    }
    if (list.includes('glass')) {
      // Physically based transmission for the transparent species: the alpha ghost becomes
      // refracting glass with Beer–Lambert body colour (attenuation) and the species' IOR.
      const byId = new Map((sim.crystals || []).map(c => [c.crystal_id, c]));
      let n = 0;
      for (const m of st.crystals.children) {
        if (!m.isMesh || !m.userData || m.userData.crystal_id == null || m.userData.surfaceGrowth || m.userData.o5Band) continue;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const mat = mats[0]; if (!mat) continue;
        const natural = m.userData.naturalOpacity ?? mat.opacity;
        const clarity = mat.transparent ? Math.max(0, Math.min(1, (1 - natural) / 0.7)) : 0;
        const spec = MINERAL_SPEC && MINERAL_SPEC[m.userData.mineral];
        const klass = spec && spec.class;
        if (clarity > 0.15) {
          const body = mat.color.clone();
          const ext = Math.max(0.5, RIG.bbox(m).size.length() / 1.7);
          mat.transmission = Math.min(0.98, 0.35 + 0.65 * clarity);
          mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
          mat.ior = RIG.IOR[m.userData.mineral] ?? 1.55;
          mat.thickness = ext * 0.9;
          // pale body colours ride through as attenuation over the crystal's own thickness
          mat.attenuationColor = body; mat.attenuationDistance = ext * (0.6 + 1.4 * clarity);
          mat.color.setRGB(1, 1, 1).lerp(body, 0.35 * (1 - clarity));
          mat.roughness = Math.min(mat.roughness, 0.12 + 0.25 * (1 - clarity));
          mat.metalness = 0; mat.specularIntensity = 1.0;
          if (!mat.side !== THREE.DoubleSide) mat.side = THREE.DoubleSide;
          n++;
        } else if (klass === 'sulfide' || klass === 'native') {
          mat.metalness = 0.9; mat.roughness = Math.min(mat.roughness, 0.35);
        } else {
          mat.roughness = Math.min(mat.roughness, 0.35);
        }
        mat.needsUpdate = true;
      }
      applied.push('glass:' + n);
    }
    if (list.includes('halfcut')) {
      // Present the cavity as a cut geode: clip away the camera-side half so the interior
      // wall and its druse read like a specimen half, not a translucent orb.
      const dir = new THREE.Vector3(); st.camera.getWorldDirection(dir);
      const plane = new THREE.Plane(dir.clone(), 0);   // keeps the far half (dot(dir, p) >= 0)
      st.renderer.localClippingEnabled = true;
      st.scene.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) { m.clippingPlanes = [plane]; m.clipShadows = true; m.needsUpdate = true; } } });
      const cm = st.cavity.material; cm.side = THREE.DoubleSide; cm.opacity = 1; cm.transparent = false; cm.depthWrite = true; cm.needsUpdate = true;
      st.cavity.visible = true;
      applied.push('halfcut');
    }
    return applied;
  };
  RIG.pickHeroes = (n, mineral) => {
    const st = RIG.state();
    const cands = st.crystals.children.filter(m => RIG.isBody(m) && (!mineral || m.userData.mineral === mineral));
    return cands.map(m => { const { size, center } = RIG.bbox(m); return { m, size, center, ext: Math.max(size.x, size.y, size.z) }; })
      .sort((a, b) => b.ext - a.ext).slice(0, n);
  };
  RIG.pickDruse = () => {
    const st = RIG.state();
    const items = st.crystals.children.filter(m => m.isMesh && m.userData && m.userData.crystal_id != null && RIG.kind(m) !== 'swath' && RIG.kind(m) !== 'band')
      .map(m => { const { size, center } = RIG.bbox(m); return { m, size, center }; });
    if (!items.length) return null;
    const R = RIG.cavityR0() * 0.35;
    let best = null;
    for (const it of items) {
      const near = items.filter(o => o.center.distanceTo(it.center) <= R);
      const score = near.length;
      if (!best || score > best.score) best = { it, near, score };
    }
    const box = new THREE.Box3();
    for (const o of best.near) box.expandByObject(o.m);
    const size = new THREE.Vector3(); box.getSize(size); const center = new THREE.Vector3(); box.getCenter(center);
    const axis = new THREE.Vector3();
    for (const o of best.near) axis.add(RIG.axis(o.m));
    if (axis.length() < 1e-6) axis.copy(center).normalize().negate(); else axis.normalize();
    return { size, center, axis, count: best.near.length, ids: [...new Set(best.near.map(o => o.m.userData.crystal_id))] };
  };
  true;
`;

function runProgram(name, seed, steps) {
  return `(async () => {
    ${PAGE_HELPERS}
    if (!SCENARIOS[${JSON.stringify(name)}]) throw new Error('unknown scenario ' + ${JSON.stringify(name)});
    await startScenarioInCreative(${JSON.stringify(name)}, ${seed >>> 0});
    const sim = RIG.sim(); if (!sim) throw new Error('fortressSim not created');
    const { defaultSteps } = SCENARIOS[${JSON.stringify(name)}]();
    const steps = ${steps == null ? 'null' : Number(steps)} ?? defaultSteps ?? 200;
    const t0 = performance.now();
    // Yield every few steps so the debugger poll can run (the page stays responsive).
    for (let i = 0; i < steps; i++) { sim.run_step(); if (i % 8 === 7) await new Promise(r => setTimeout(r, 0)); }
    const simMs = performance.now() - t0;
    if (typeof _topoUseThreeRenderer !== 'undefined' && !_topoUseThreeRenderer) _topoUseThreeRenderer = true;
    _topoSyncThreeCanvasVisibility();
    topoRender();
    const st = RIG.state();
    if (!st || !st.renderer) throw new Error('Three renderer did not initialise (WebGL unavailable?)');
    return { steps, simMs: +simMs.toFixed(0), sim_version: SIM_VERSION, crystals: (sim.crystals || []).length,
      meshes: st.crystals.children.length, gl: RIG.glInfo(), cavity_r0: RIG.cavityR0(),
      roster: RIG.roster() };
  })()`;
}

function cavityShotProgram({ w, h, tilt, zoom, wall, experiment = [], mood = null, exposure = null, tier = null }) {
  return `(async () => {
    const RIG = window.__photoRig;
    _topoTiltX = ${tilt[0]}; _topoTiltY = ${tilt[1]}; _topoZoom = ${zoom}; _topoPanX = 0; _topoPanY = 0;
    topoRender();
    RIG.wallMode(${JSON.stringify(wall)});
    const st = RIG.state();
    const lighting = RIG.applyLighting(${JSON.stringify(mood)}, ${exposure == null ? 'null' : Number(exposure)});
    const optics = RIG.applyTier(${JSON.stringify(tier)});
    const applied = RIG.applyExperiments(${JSON.stringify(experiment)});
    const png = RIG.render(${w}, ${h});
    const p = st.camera.position;
    return { png, camera: { mode: 'game-rig', tilt: [${tilt[0]}, ${tilt[1]}], zoom: ${zoom}, position: [p.x, p.y, p.z].map(v => +v.toFixed(2)), inside: !!st.insideMode, wall: ${JSON.stringify(wall)}, experiments: applied, lighting, optics } };
  })()`;
}

function heroShotProgram({ w, h, index, n, mineral, wall, experiment = [], mood = null, exposure = null, tier = null, probe = [] }) {
  return `(async () => {
    const RIG = window.__photoRig;
    topoRender();
    const heroes = RIG.pickHeroes(${n}, ${JSON.stringify(mineral)});
    const hero = heroes[${index}];
    if (!hero) return null;
    const axis = RIG.axis(hero.m);
    const cam = RIG.placeCamera(hero.center, hero.size, axis, {});
    const rule = RIG.applyInsideRule(hero.center);
    ${wall === 'game' ? '' : `RIG.wallMode(${JSON.stringify(wall)});`}
    const lighting = RIG.applyLighting(${JSON.stringify(mood)}, ${exposure == null ? 'null' : Number(exposure)});
    const optics = RIG.applyTier(${JSON.stringify(tier)});
    const applied = RIG.applyExperiments(${JSON.stringify(experiment)});
    const png = RIG.render(${w}, ${h});
    const frames = ${probe.includes('seethrough') ? `RIG.seeThroughFrames(hero.m, ${w}, ${h}, ${JSON.stringify(wall)})` : 'null'};
    const u = hero.m.userData;
    const mats = Array.isArray(hero.m.material) ? hero.m.material : [hero.m.material];
    const mo = mats[0] && mats[0].userData ? mats[0].userData.optics : null;
    return { png, camera: { mode: 'direct', ...cam, ...rule, wall: ${JSON.stringify(wall)}, experiments: applied, lighting, optics },
      subject: { crystal_id: u.crystal_id, mineral: u.mineral, extent_mm: +hero.ext.toFixed(2),
        material: mats[0] ? { tier: mo ? mo.tier : null, lustre: mo ? mo.lustre : null, transmission: mats[0].transmission ?? null, ior: mats[0].ior ?? null, opacity: mats[0].opacity, transparent: !!mats[0].transparent, roughness: mats[0].roughness, metalness: mats[0].metalness, thickness: mats[0].thickness ?? null, attenuation_distance: mats[0].attenuationDistance ?? null } : null },
      probe_frames: frames };
  })()`;
}

// Same luminance statistics as imageStats(), computed in the page so a JPEG reference
// photograph and a PNG render are measured by one definition (max edge 1200 px so the
// gradient threshold means the same thing at both scales).
function photoStatsProgram(url) {
  return `(async () => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('load failed ' + ${JSON.stringify(url)})); img.src = ${JSON.stringify(url)}; });
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const n = w * h; const lum = new Float32Array(n); const hist = new Array(16).fill(0);
    let sumL = 0, bright = 0, dark = 0, satSum = 0, edges = 0, subjSum = 0, subjN = 0;
    for (let i = 0; i < n; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; lum[i] = L; sumL += L;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); satSum += mx > 0 ? (mx - mn) / mx : 0;
      hist[Math.min(15, (L / 16) | 0)]++; if (L > 235) bright++; if (L < 12) dark++; else { subjSum += L; subjN++; }
    }
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; const gx = lum[i + 1] - lum[i - 1], gy = lum[i + w] - lum[i - w];
      if (gx * gx + gy * gy > 900) edges++;
    }
    return { width: w, height: h, original: [img.naturalWidth, img.naturalHeight],
      mean_luminance: +(sumL / n).toFixed(2), subject_luminance: subjN ? +(subjSum / subjN).toFixed(2) : null,
      mean_saturation: +(satSum / n).toFixed(4),
      highlight_fraction: +(bright / n).toFixed(5), dark_fraction: +(dark / n).toFixed(5),
      edge_fraction: +(edges / n).toFixed(5), histogram16: hist };
  })()`;
}

function druseShotProgram({ w, h, wall, experiment = [], mood = null, exposure = null, tier = null }) {
  return `(async () => {
    const RIG = window.__photoRig;
    topoRender();
    const d = RIG.pickDruse(); if (!d) return null;
    const cam = RIG.placeCamera(d.center, d.size, d.axis, { offAxisDeg: 40, yawDeg: 15, fill: 0.7 });
    const rule = RIG.applyInsideRule(d.center);
    ${wall === 'game' ? '' : `RIG.wallMode(${JSON.stringify(wall)});`}
    const lighting = RIG.applyLighting(${JSON.stringify(mood)}, ${exposure == null ? 'null' : Number(exposure)});
    const optics = RIG.applyTier(${JSON.stringify(tier)});
    const applied = RIG.applyExperiments(${JSON.stringify(experiment)});
    const png = RIG.render(${w}, ${h});
    return { png, camera: { mode: 'direct', ...cam, ...rule, wall: ${JSON.stringify(wall)}, experiments: applied, lighting, optics }, subject: { count: d.count, crystal_ids: d.ids } };
  })()`;
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 30).join('\n')); return; }
  if (!args.list && !args.scenario && !args.photoStats.length) throw new Error('--scenario NAME is required (or --list / --photo-stats FILES)');
  const browserPath = findBrowser();
  const serverPort = await freePort();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'vugg-photo-rig-'));
  const nonce = randomUUID();
  const [W, H] = args.size;
  const cleanup = [];
  let server = null, browser = null, client = null;
  try {
    server = spawnOwned(process.execPath, ['tools/serve-local.mjs', String(serverPort)], {
      cwd: ROOT, env: { ...process.env, VUGG_SERVER_NONCE: nonce }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true,
    });
    // runCleanupActions takes [label, action] pairs and runs them in order; the pipes of
    // an un-terminated child keep this process alive forever, so every owned process
    // gets a labelled terminator here.
    cleanup.push(['server', () => terminateOwned(server)]);
    const base = `http://127.0.0.1:${serverPort}`;
    await waitForHttp(`${base}/?rig=1`, server, { expectedNonce: nonce });

    browser = spawnOwned(browserPath, [
      '--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check',
      '--disable-extensions', '--disable-background-networking', '--disable-component-update',
      '--disable-sync', '--mute-audio', '--hide-scrollbars', `--window-size=${W + 200},${H + 200}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    cleanup.push(['browser-tree', () => terminateOwned(browser, { tree: true })]);
    const devTools = await waitForDevToolsReceipt(profileDir, browser);
    // SIM 285's browser-workflow authenticates the browser's process fleet by the DevTools
    // port's listening owner (a receipt per descendant) instead of scanning command lines
    // for the profile path; the same receipts drive the descendant cleanup below.
    const ownedBrowser = await captureOwnedBrowserProcessReceiptsForPort(devTools.port);
    cleanup.push(['browser-descendants', () => terminateOwnedProcessReceipts(ownedBrowser.receipts)]);
    const version = await fetchWithDeadline(`http://127.0.0.1:${devTools.port}/json/version`, {
      options: { cache: 'no-store' }, consume: r => r.json(),
    });
    client = new CdpClient(version.webSocketDebuggerUrl);
    await client.open();
    cleanup.push(['browser-close', async () => {
      try { await Promise.race([client.send('Browser.close'), delay(3_000)]); } catch { /* the tree kill below is the backstop */ }
      client.close();
    }]);
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
    const page = new Page(client, sessionId);
    await page.send('Page.enable'); await page.send('Runtime.enable');
    client.on('Runtime.exceptionThrown', ev => { page.exceptions.push(ev.exceptionDetails?.exception?.description || ev.exceptionDetails?.text || 'exception'); });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      Object.defineProperty(HTMLMediaElement.prototype, 'play', { value: function () { return Promise.resolve(); }, configurable: true });` });
    await page.send('Page.navigate', { url: `${base}/index.html?rig=${Date.now()}` });
    await page.waitFor(`document.readyState === 'complete' && !!window.vugg && !!window.vugg.SCENARIOS && Object.keys(window.vugg.SCENARIOS).length > 5`, 'vugg boot');

    if (args.list) {
      const names = await page.evaluate('Object.keys(SCENARIOS).sort()');
      console.log(names.join('\n'));
      return;
    }
    if (args.photoStats.length) {
      // Reference photographs measured with the SAME statistic as the renders (in-page
      // canvas readback; the browser decodes the JPEG). Same origin trick: a data: page
      // fetches the file through the local server, which serves only the repo, so the
      // files are copied into .local-evidence/photo-refs first (never committed).
      const refDir = path.join(ROOT, '.local-evidence', 'photo-refs');
      mkdirSync(refDir, { recursive: true });
      const rows = [];
      for (const src of args.photoStats) {
        const name = path.basename(path.dirname(src)) + '-' + path.basename(src);
        const dst = path.join(refDir, name);
        if (!existsSync(dst)) writeFileSync(dst, readFileSync(src));
        const url = `${base}/.local-evidence/photo-refs/${encodeURIComponent(name)}`;
        const stats = await page.job(photoStatsProgram(url), { label: `photo-stats ${name}` });
        rows.push({ source: src, ...stats });
        console.log(JSON.stringify({ source: path.basename(src), ...stats }));
      }
      writeFileSync(path.join(refDir, 'photo-stats.json'), JSON.stringify(rows, null, 2));
      return;
    }

    const outDir = path.resolve(ROOT, args.out || path.join('.local-evidence', 'photos', `${args.scenario}-s${args.seed}${args.label ? '-' + args.label : ''}`));
    mkdirSync(outDir, { recursive: true });

    process.stderr.write(`[photo-rig] running ${args.scenario} seed ${args.seed}…\n`);
    const run = await page.job(runProgram(args.scenario, args.seed, args.steps), { label: 'scenario run', timeoutMs: 900_000 });
    process.stderr.write(`[photo-rig] ${run.steps} steps in ${run.simMs} ms · ${run.crystals} crystals · ${run.meshes} meshes · GL ${run.gl?.renderer}\n`);

    const manifest = {
      schema: 1, tool: 'tools/photo-rig.mjs', generated: new Date().toISOString(),
      scenario: args.scenario, seed: args.seed, steps: run.steps, sim_version: run.sim_version,
      browser: version.Browser, gl: run.gl, size: [W, H], cavity_r0_mm: run.cavity_r0,
      crystals: run.crystals, meshes: run.meshes, roster: run.roster, shots: [], exceptions: page.exceptions,
    };
    const saveShot = (name, result, extra = {}) => {
      if (!result || !result.png) return null;
      const b64 = result.png.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(b64, 'base64');
      const file = `${name}.png`;
      writeFileSync(path.join(outDir, file), buf);
      let stats = null;
      try { stats = imageStats(decodePng(buf)); } catch (e) { stats = { error: e.message }; }
      const shot = { name, file, bytes: buf.length, camera: result.camera, subject: result.subject || null, stats, ...extra };
      manifest.shots.push(shot);
      process.stderr.write(`[photo-rig] ${file} ${buf.length} B · mean L ${stats?.mean_luminance} · highlights ${stats?.highlight_fraction} · edges ${stats?.edge_fraction}\n`);
      return shot;
    };

    // A shot that throws is recorded and skipped — the run's other pictures and the
    // manifest must survive one bad camera (the manifest is written below regardless).
    const attempt = async (label, fn) => {
      try { return await fn(); } catch (e) {
        manifest.shot_errors = manifest.shot_errors || [];
        manifest.shot_errors.push({ shot: label, error: String(e && e.message || e) });
        process.stderr.write(`[photo-rig] ${label} FAILED: ${e && e.message || e}\n`);
        return null;
      }
    };
    for (const shot of args.shots) {
      if (shot === 'cavity') {
        saveShot('cavity', await attempt('cavity', () => page.job(cavityShotProgram({ w: W, h: H, tilt: args.tilt, zoom: args.zoom, wall: args.wall, experiment: args.experiment, mood: args.mood, exposure: args.exposure, tier: args.tier }), { label: 'cavity shot' })));
      } else if (shot === 'hero') {
        for (let i = 0; i < args.heroN; i++) {
          const r = await attempt(`hero ${i + 1}`, () => page.job(heroShotProgram({ w: W, h: H, index: i, n: args.heroN, mineral: args.mineral, wall: args.wall, experiment: args.experiment, mood: args.mood, exposure: args.exposure, tier: args.tier, probe: args.probe }), { label: `hero ${i}` }));
          if (!r) break;
          const name = `hero-${i + 1}-${r.subject.mineral}`;
          const extra = {};
          if (r.probe_frames) {
            // R2 see-through probe: keep the two auxiliary frames beside the shot and fold
            // the inside-silhouette statistics into the manifest.
            const b64 = s => Buffer.from(String(s).replace(/^data:image\/png;base64,/, ''), 'base64');
            const mainBuf = b64(r.png), maskBuf = b64(r.probe_frames.mask), nowallBuf = b64(r.probe_frames.nowall);
            writeFileSync(path.join(outDir, `${name}-mask.png`), maskBuf);
            writeFileSync(path.join(outDir, `${name}-nowall.png`), nowallBuf);
            try { extra.probe = { seethrough: maskStats(decodePng(mainBuf), decodePng(maskBuf), decodePng(nowallBuf)) }; }
            catch (e) { extra.probe = { error: e.message }; }
            const p = extra.probe.seethrough;
            if (p) process.stderr.write(`[photo-rig] ${name} see-through: mask ${p.mask_fraction} · inside L ${p.mean_luminance} · highlights ${p.highlight_fraction} · wall Δ ${p.background_delta}\n`);
            delete r.probe_frames;
          }
          saveShot(name, r, extra);
        }
      } else if (shot === 'druse') {
        saveShot('druse', await attempt('druse', () => page.job(druseShotProgram({ w: W, h: H, wall: args.wall, experiment: args.experiment, mood: args.mood, exposure: args.exposure, tier: args.tier }), { label: 'druse shot' })));
      } else if (shot === 'roster') {
        // roster is always in the manifest; the flag just prints it
        for (const r of run.roster) console.log(`${String(r.crystal_id).padStart(4)} ${r.mineral.padEnd(16)} ${String(r.token).padEnd(12)} c=${r.c_length_mm} a=${r.a_width_mm} ext=${r.rendered_extent_mm} ${r.material?.color} op=${r.material?.opacity} rough=${r.material?.roughness} met=${r.material?.metalness} verts=${r.vertices} ${r.tags.join(',')}`);
      } else throw new Error(`unknown shot ${shot}`);
    }

    // material census for the review (crystal bodies; swaths/satellites counted beside)
    const census = {};
    for (const r of run.roster) {
      const k = r.mineral; census[k] = census[k] || { bodies: 0, satellites: 0, swaths: 0, swath_instances: 0, tokens: {}, regimes: {}, opacity: r.material?.opacity, color: r.material?.color, roughness: r.material?.roughness, metalness: r.material?.metalness, max_extent_mm: 0, vertices: r.vertices };
      const c = census[k];
      if (r.kind === 'crystal') { c.bodies++; c.tokens[r.token] = (c.tokens[r.token] || 0) + 1; c.max_extent_mm = Math.max(c.max_extent_mm, r.rendered_extent_mm); }
      else if (r.kind === 'satellite') c.satellites++;
      else if (r.kind === 'swath') { c.swaths++; c.swath_instances += r.instances; c.regimes[r.regime] = (c.regimes[r.regime] || 0) + 1; }
    }
    manifest.census = census;
    writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(outDir, 'contact-sheet.html'), contactSheet(manifest));
    console.log(outDir);
  } finally {
    if (!args.keepBrowser) {
      try { await runCleanupActions(cleanup.reverse()); } catch (e) { process.stderr.write(`[photo-rig] cleanup: ${e.message}\n`); }
      try { await rm(profileDir, { recursive: true, force: true }); } catch { /* best effort */ }
    } else {
      process.stderr.write(`[photo-rig] --keep-browser: profile ${profileDir}, server port ${serverPort}\n`);
    }
  }
}

function contactSheet(m) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const lightingTag = l => l ? `${l.mood || '?'} · env ${l.environment ? 'on' : 'OFF' + (l.reason ? ` (${l.reason})` : '')} · ${l.tone_mapping} e${Number(l.exposure).toFixed(2)} · ${l.shadows ? `shadows ${l.shadow_map}²` : 'no shadows'}${l.step_downs ? ` · ${l.step_downs} step-down(s)` : ''}` : 'pre-R1 lights';
  const opticsTag = o => o ? `${o.tier} tier, active ${o.active}${o.backdrop === false ? ' (no opaque backdrop)' : ''} (${o.transmissive} glass / ${o.alpha} alpha / ${o.opaque} opaque${o.retiers ? ` · ${o.retiers} retier(s)` : ''})` : 'pre-R2 materials';
  const probeTag = p => p && p.seethrough ? `<br>see-through: mask ${p.seethrough.mask_fraction} · inside L̄ ${p.seethrough.mean_luminance} · inside highlights ${p.seethrough.highlight_fraction} · wall Δ ${p.seethrough.background_delta}` : (p && p.error ? `<br>probe error: ${esc(p.error)}` : '');
  const shots = m.shots.map(s => `<figure><img src="${s.file}" alt="${esc(s.name)}"><figcaption><b>${esc(s.name)}</b> · ${s.camera?.mode} ${s.camera?.inside ? '(inside cavity)' : ''} · ${s.subject ? esc(JSON.stringify(s.subject)) : ''}<br>L̄ ${s.stats?.mean_luminance} · sat ${s.stats?.mean_saturation} · highlights ${s.stats?.highlight_fraction} · edges ${s.stats?.edge_fraction}<br>light: ${esc(lightingTag(s.camera?.lighting))} · optics: ${esc(opticsTag(s.camera?.optics))}${s.camera?.experiments?.length ? ` · experiments ${esc(s.camera.experiments.join('+'))}` : ''}${probeTag(s.probe)}</figcaption></figure>`).join('\n');
  const census = Object.entries(m.census).sort((a, b) => b[1].bodies - a[1].bodies).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.bodies}</td><td>${v.satellites}</td><td>${v.swaths}${v.swaths ? ` (${v.swath_instances} inst; ${esc(Object.keys(v.regimes).join(','))})` : ''}</td><td>${esc(Object.entries(v.tokens).map(([t, c]) => `${t}×${c}`).join(' '))}</td><td><span style="display:inline-block;width:1em;height:1em;background:${v.color};border:1px solid #888"></span> ${v.color}</td><td>${v.opacity}</td><td>${v.roughness}</td><td>${v.metalness}</td><td>${v.max_extent_mm}</td><td>${v.vertices}</td></tr>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><title>photo-rig · ${esc(m.scenario)} s${m.seed}</title>
<style>body{font:13px/1.4 ui-monospace,monospace;background:#111;color:#ddd;margin:16px}figure{display:inline-block;margin:8px;vertical-align:top;max-width:${Math.min(m.size[0], 600)}px}img{max-width:100%;border:1px solid #333}table{border-collapse:collapse}td,th{border:1px solid #333;padding:2px 6px}</style>
<h1>${esc(m.scenario)} · seed ${m.seed} · ${m.steps} steps · SIM ${m.sim_version}</h1>
<p>${esc(m.browser)} · GL ${esc(m.gl?.renderer)} · three r${m.gl?.three} · toneMapping ${m.gl?.toneMapping} · env ${m.gl?.environment} · shadows ${m.gl?.shadowMap} · lights ${esc(JSON.stringify(m.gl?.lights))}</p>
${shots}
<h2>material census (${m.meshes} meshes / ${m.crystals} crystals)</h2>
<table><tr><th>mineral</th><th>bodies</th><th>satellites</th><th>swaths</th><th>tokens</th><th>colour</th><th>opacity</th><th>rough</th><th>metal</th><th>max mm</th><th>verts</th></tr>${census}</table>`;
}

main().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
