#!/usr/bin/env node
/**
 * Escribe .env.local para usar la API real (no mock).
 * Se ejecuta antes de `npm start` para no dejar colgado un .env.local de `npm run mock`.
 *
 * Override: OFFICIAL_API_HOST=https://api… npm start
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");

function normalizeBase(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  return s.replace(/\/+$/, "");
}

function readEnvLocalKeys() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return { API_HOST: "", USE_MOCK: "" };
  const raw = fs.readFileSync(envPath, "utf8");
  const out = { API_HOST: "", USE_MOCK: "" };
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (key === "EXPO_PUBLIC_API_HOST") out.API_HOST = val;
    if (key === "EXPO_PUBLIC_USE_MOCK") out.USE_MOCK = val;
  }
  return out;
}

require("dotenv").config({ path: path.join(projectRoot, ".env") });

const defaults = require("./api-host-defaults.cjs");

const local = readEnvLocalKeys();
const wasMock = local.USE_MOCK === "1";

let url;
if (normalizeBase(process.env.OFFICIAL_API_HOST)) {
  url = normalizeBase(process.env.OFFICIAL_API_HOST);
} else if (!wasMock && normalizeBase(local.API_HOST)) {
  url = normalizeBase(local.API_HOST);
} else {
  url = defaults.official;
}

const envPath = path.join(projectRoot, ".env.local");
const content =
  `# Generado por npm start — API oficial\n` +
  `EXPO_PUBLIC_API_HOST=${url}\n` +
  `EXPO_PUBLIC_USE_MOCK=0\n`;

fs.writeFileSync(envPath, content, "utf8");
console.log(`[api] oficial EXPO_PUBLIC_API_HOST=${url} → .env.local`);
console.log("[api] Para otra URL: OFFICIAL_API_HOST=https://... npm start");
