#!/usr/bin/env node
/**
 * Escribe .env.local para usar la API oficial (no mock).
 * Se ejecuta antes de `npm start` para que no quede colgado un .env.local de `npm run mock`.
 *
 * Override de URL: OFFICIAL_API_HOST=https://api.tuya.com npm start
 */

const fs = require("fs");
const path = require("path");
const defaults = require("./api-host-defaults.cjs");

const url = defaults.official;
const envPath = path.join(__dirname, "..", ".env.local");
const content =
  `# Generado por npm start — API oficial\n` +
  `EXPO_PUBLIC_API_HOST=${url}\n` +
  `EXPO_PUBLIC_USE_MOCK=0\n`;

fs.writeFileSync(envPath, content, "utf8");
console.log(`[api] oficial EXPO_PUBLIC_API_HOST=${url} → .env.local`);
console.log("[api] Para otra URL: OFFICIAL_API_HOST=https://... npm start");
