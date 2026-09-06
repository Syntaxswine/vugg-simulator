#!/usr/bin/env node
// tools/optics-ior-verify.mjs — R2 refractive-index verification (2026-09-06).
//
// The renderer's transmission materials (js/99i buildCrystalMaterial, D1 of the visual-realism
// review) read `optics.ior` per species: the MEAN principal refractive index (uniaxial (2w+e)/3,
// biaxial (a+b+g)/3, isotropic n; range midpoints). This instrument fetches each species' Optical
// Data line from webmineral.com (the machine-readable source the Depth-A optics blocks already
// cite), parses it, and compares with what data/minerals.json declares — so a typed index cannot
// drift from its source unnoticed. Passive: it reports and exits 0 unless --gate is given.
//
//   node tools/optics-ior-verify.mjs                 # every species with an optics block
//   node tools/optics-ior-verify.mjs --all           # every catalog species (proposes values for the tail)
//   node tools/optics-ior-verify.mjs --json FILE     # also write the parsed table (put it in .local-evidence/)
//   node tools/optics-ior-verify.mjs --gate          # exit 1 on any |declared - source| > 0.03
//
// Metallic opaques have no optical line on webmineral (they are read by reflectance, not
// refraction) — reported as "opaque", never as a mismatch. Variety and group names map to the
// species page that carries the optics (selenite -> Gypsum, ruby -> Corundum, feldspar ->
// Orthoclase, ...); the map is printed with each row so the mapping is itself reviewable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const GATE = argv.includes("--gate");
const JSON_OUT = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const TOL = 0.03;

const PAGE = {
  selenite: "Gypsum", ruby: "Corundum", sapphire: "Corundum", chalcedony: "Quartz", chrysoprase: "Quartz",
  tigers_eye: "Quartz", feldspar: "Orthoclase", HMC: "Calcite", native_sulfur: "Sulfur", native_gold: "Gold",
  native_silver: "Silver", native_bismuth: "Bismuth", native_arsenic: "Arsenic", native_copper: "Copper",
  native_tellurium: "Tellurium", emerald: "Beryl", aquamarine: "Beryl", morganite: "Beryl", heliodor: "Beryl",
  amosite: "Grunerite", crocidolite: "Riebeckite", "meta-autunite": "Meta-autunite", tourmaline: "Elbaite",
  apatite: "Fluorapatite", wolframite: "Ferberite", chrysotile: "Clinochrysotile", stilbite: "Stilbite-Ca",
  chabazite: "Chabazite-Ca", heulandite: "Heulandite-Ca", thomsonite: "Thomsonite-Ca", opal: "Opal",
  pitchblende: "Uraninite", tetrahedrite: "Tetrahedrite", tennantite: "Tennantite", acanthite: "Acanthite",
  argentite: "Acanthite", metacinnabar: "Metacinnabar", hawleyite: "Hawleyite", clinobisvanite: "Clinobisvanite",
};
function pageNames(key) {
  const out = [];
  if (PAGE[key]) out.push(PAGE[key]);
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  out.push(cap);
  out.push(cap.replace(/_/g, "-"));
  return [...new Set(out)];
}
function numRange(s) {
  // "1.543-1.545" -> midpoint; "2.37" -> itself; a trailing period ("0.0090.") is tolerated.
  const parts = String(s).split("-").map(p => Number(p.replace(/\.$/, ""))).filter(v => Number.isFinite(v) && v > 0);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : (parts[0] + parts[parts.length - 1]) / 2;
}
function parseOptical(line) {
  // Tokenise "Uniaxial (+), w=1.543-1.545, e=1.552-1.554, bire=0.0090." into {w, e, ...}
  const t = line.replace(/\s+/g, " ").trim();
  const kv = {};
  for (const tok of t.split(/[,;]\s*/)) {
    const m = tok.trim().match(/^([a-z]+)\s*=\s*([0-9][0-9.\-]*)/i);
    if (m) kv[m[1].toLowerCase()] = numRange(m[2]);
  }
  if (/isotropic/i.test(t)) { const n = kv.n; return n == null ? null : { system: "isotropic", n: [n], mean: n }; }
  if (/uniaxial/i.test(t)) { const w = kv.w, e = kv.e; if (w == null || e == null) return null; return { system: "uniaxial", n: [w, e], mean: (2 * w + e) / 3 }; }
  if (/biaxial/i.test(t)) { const a = kv.a, b = kv.b, g = kv.g; if (a == null || b == null || g == null) return null; return { system: "biaxial", n: [a, b, g], mean: (a + b + g) / 3 }; }
  return null;
}
const RE = /<b>Optical Data:\s*<\/b><\/td>\s*<td>([^<]*)</i;
async function fetchOptical(key) {
  for (const name of pageNames(key)) {
    const url = "https://webmineral.com/data/" + name + ".shtml";
    let html;
    try {
      const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (vugg optics-ior-verify)" } });
      if (!r.ok) continue;
      html = await r.text();
    } catch { continue; }
    if (html.length < 2000) continue;               // webmineral's "no such page" stub
    const m = html.match(RE);
    if (!m) return { page: name, line: null, parsed: null, opaque: /opaque/i.test(html) };
    const line = m[1].trim();
    return { page: name, line, parsed: parseOptical(line), opaque: false };
  }
  return { page: null, line: null, parsed: null, opaque: false };
}

const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "minerals.json"), "utf8"));
const MINERALS = DOC.minerals;
const keys = Object.keys(MINERALS).filter(k => ALL || MINERALS[k].optics);
const rows = [];
let mismatches = 0, missing = 0, opaque = 0, proposed = 0, manual = 0;
console.log("species".padEnd(18), "page".padEnd(16), "declared", "source ", "delta ", "line");
for (const key of keys) {
  const spec = MINERALS[key];
  const declared = spec.optics && typeof spec.optics.ior === "number" ? spec.optics.ior : null;
  const r = await fetchOptical(key);
  const src = r.parsed ? +r.parsed.mean.toFixed(3) : null;
  let status;
  if (!r.page) { status = "NO-PAGE"; missing++; }
  else if (!r.line || !r.parsed) {
    if (r.opaque || (spec.optics && spec.optics.clarity === 0)) { status = "opaque"; opaque++; }
    else if (declared != null) { status = "manual " + declared + " (no source line; Handbook of Mineralogy)"; manual++; }
    else { status = "NO-OPTICAL-LINE"; missing++; }
  }
  else if (declared == null) { status = "PROPOSE " + src; proposed++; }
  else if (Math.abs(declared - src) > TOL) { status = "MISMATCH"; mismatches++; }
  else status = "ok";
  rows.push({ key, page: r.page, declared, source_mean: src, source_indices: r.parsed ? r.parsed.n : null, system: r.parsed ? r.parsed.system : null, line: r.line, status });
  console.log(key.padEnd(18), String(r.page || "-").padEnd(16), String(declared ?? "-").padEnd(8), String(src ?? "-").padEnd(7),
    (declared != null && src != null ? (declared - src).toFixed(3) : "-").padEnd(6), status, r.line ? "| " + r.line.slice(0, 70) : "");
  await new Promise(res => setTimeout(res, 120));
}
console.log(`\n${rows.length} species: ${rows.filter(r => r.status === "ok").length} ok, ${mismatches} mismatch, ${proposed} proposed, ${manual} manual, ${opaque} opaque, ${missing} missing (tolerance ${TOL})`);
if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify({ generated: new Date().toISOString(), tolerance: TOL, rows }, null, 2)); console.log("wrote " + JSON_OUT); }
process.exit(GATE && mismatches ? 1 : 0);
