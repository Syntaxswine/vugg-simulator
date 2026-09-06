#!/usr/bin/env node
// tools/optics-reflectance-verify.mjs — R2 metallic reflectance verification (2026-09-06).
//
// A metal's F0 IS its reflectance at normal incidence. The renderer (js/99i
// buildCrystalMaterial, metallic/submetallic lustre) scales the colour lexicon's hue to the
// species' measured reflectance `optics.reflectance` (per cent, R at 589 nm in air) — a
// hand-specimen swatch is dark because a metal mirrors a dark surround, and using it as F0
// counts that darkness twice (galena swatch luminance 0.18 vs R 43 %).
//
// Source: the Handbook of Mineralogy's "R:" / "R1–R2:" tables (Anthony et al., via
// rruff.net/doclib/hom/<species>.pdf), read with pdftotext. 589 nm is interpolated between
// the 580 and 600 nm columns; anisotropic pairs (R1–R2) are averaged. Passive: reports and
// exits 0 unless --gate is given.
//
//   node tools/optics-reflectance-verify.mjs            # every species with a metallic/submetallic lustre block
//   node tools/optics-reflectance-verify.mjs --all      # every metallic-class species (proposes values for the tail)
//   node tools/optics-reflectance-verify.mjs --json FILE
//   node tools/optics-reflectance-verify.mjs --gate     # exit 1 on any |declared - source| > 3 (per cent)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const GATE = argv.includes("--gate");
const JSON_OUT = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
const TOL = 3;

const PAGE = {
  native_gold: "gold", native_silver: "silver", native_bismuth: "bismuth", native_arsenic: "arsenic",
  native_copper: "copper", native_tellurium: "tellurium", wolframite: "ferberite", loellingite: "lollingite",
  argentite: "acanthite", pitchblende: "uraninite",
};
function pageName(key) { return PAGE[key] || key.toLowerCase().replace(/_/g, ""); }

function haveTool() {
  try { execFileSync("pdftotext", ["-v"], { stdio: ["ignore", "ignore", "ignore"] }); return true; }
  catch (e) { return /pdftotext/.test(String(e.stderr || e.message)) && e.status != null; }
}

function parseR(text) {
  // "R: (400) 51.9, (420) 50.5, ... (580) 42.8, (600) 42.7 ..." or
  // "R1–R2: (400) 43.1–46.2, ... (580) 30.4–41.1, (600) 30.1–40.3 ..." (any dash)
  // pdftotext emits the Handbook's en dashes as stray non-ASCII bytes; one page (stibnite)
  // has a comma typed for a decimal point ("53,3"). Normalise both before parsing.
  const flat = text.replace(/[^\x00-\x7F]+/g, "-").replace(/(\d),(\d)/g, "$1.$2").replace(/\s+/g, " ");
  const m = flat.match(/\bR(?:1\s*[–-]\s*R2)?\s*:\s*((?:\(\d{3}\)\s*[0-9.]+(?:\s*[–-]\s*[0-9.]+)?[,\s]*)+)/);
  if (!m) return null;
  const at = {};
  for (const e of m[1].matchAll(/\((\d{3})\)\s*([0-9.]+)(?:\s*[–-]\s*([0-9.]+))?/g)) {
    const a = Number(e[2]), b = e[3] != null ? Number(e[3]) : null;
    at[Number(e[1])] = b == null ? a : (a + b) / 2;
  }
  const r580 = at[580], r600 = at[600];
  if (r580 == null && r600 == null) return null;
  const r589 = r580 != null && r600 != null ? r580 + (r600 - r580) * (9 / 20) : (r580 ?? r600);
  return { r589: +r589.toFixed(1), anisotropic: /R1/.test(m[0]), samples: at };
}

async function fetchR(key) {
  const name = pageName(key);
  const url = "https://rruff.net/doclib/hom/" + name + ".pdf";
  let buf;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (vugg optics-reflectance-verify)" }, redirect: "follow" });
    if (!r.ok) return { page: name, url, error: "http " + r.status };
    buf = Buffer.from(await r.arrayBuffer());
  } catch (e) { return { page: name, url, error: e.message }; }
  if (buf.length < 2000) return { page: name, url, error: "stub" };
  const tmp = path.join(os.tmpdir(), "vugg-hom-" + name + ".pdf");
  fs.writeFileSync(tmp, buf);
  let text;
  try { text = execFileSync("pdftotext", ["-layout", tmp, "-"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }); }
  catch (e) { return { page: name, url, error: "pdftotext: " + e.message }; }
  finally { try { fs.unlinkSync(tmp); } catch { /* best effort */ } }
  return { page: name, url, parsed: parseR(text) };
}

if (!haveTool()) { console.log("pdftotext is not on PATH — nothing verified (passive instrument)."); process.exit(0); }

const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "minerals.json"), "utf8"));
const MINERALS = DOC.minerals;
const METAL_CLASSES = new Set(["sulfide", "native", "oxide", "hydroxide"]);
const isMetalLustre = m => m.optics && Array.isArray(m.optics.lustre) && /^(sub)?metallic$/.test(m.optics.lustre[0]);
const keys = Object.keys(MINERALS).filter(k => ALL ? (METAL_CLASSES.has(MINERALS[k].class) && !(MINERALS[k].optics && MINERALS[k].optics.clarity > 0.15)) : isMetalLustre(MINERALS[k]));
const rows = [];
let mismatches = 0, missing = 0, proposed = 0, ok = 0;
console.log("species".padEnd(18), "page".padEnd(14), "declared", "R589  ", "delta ", "status");
for (const key of keys) {
  const spec = MINERALS[key];
  const declared = spec.optics && typeof spec.optics.reflectance === "number" ? spec.optics.reflectance : null;
  const r = await fetchR(key);
  const src = r.parsed ? r.parsed.r589 : null;
  let status;
  if (r.error) { status = "NO-PAGE (" + r.error + ")"; missing++; }
  else if (src == null) { status = "NO-R-TABLE"; missing++; }
  else if (declared == null) { status = "PROPOSE " + src + (r.parsed.anisotropic ? " (R1–R2 mean)" : ""); proposed++; }
  else if (Math.abs(declared - src) > TOL) { status = "MISMATCH"; mismatches++; }
  else { status = "ok"; ok++; }
  rows.push({ key, page: r.page, declared, source_r589: src, anisotropic: r.parsed ? r.parsed.anisotropic : null, samples: r.parsed ? r.parsed.samples : null, status });
  console.log(key.padEnd(18), String(r.page).padEnd(14), String(declared ?? "-").padEnd(8), String(src ?? "-").padEnd(6),
    (declared != null && src != null ? (declared - src).toFixed(1) : "-").padEnd(6), status);
  await new Promise(res => setTimeout(res, 150));
}
console.log(`\n${rows.length} species: ${ok} ok, ${mismatches} mismatch, ${proposed} proposed, ${missing} missing (tolerance ${TOL} %)`);
if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify({ generated: new Date().toISOString(), tolerance: TOL, rows }, null, 2)); console.log("wrote " + JSON_OUT); }
process.exit(GATE && mismatches ? 1 : 0);
