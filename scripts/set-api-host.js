#!/usr/bin/env node
/**
 * Escribe EXPO_PUBLIC_API_HOST en .env.local para que Expo lo cargue al iniciar.
 *
 * Uso:
 *   npm run api:set -- http://localhost:3000
 *   npm run api:set -- https://xxxx.ngrok-free.app
 *
 * Reiniciá Metro después de cambiar (Ctrl+C y npm start).
 */

const fs = require("fs");
const path = require("path");

const url = process.argv[2];
if (!url || url.startsWith("-")) {
  console.error("Uso: npm run api:set -- <URL_BASE_DE_LA_API>");
  console.error("Ej:  npm run api:set -- http://localhost:3000");
  console.error("Ej:  npm run api:set -- https://abc123.ngrok-free.app");
  process.exit(1);
}

const trimmed = url.replace(/\/$/, "");
const envPath = path.join(__dirname, "..", ".env.local");
const content =
  `# Generado por scripts/set-api-host.js — no commitear (está en .gitignore)\n` +
  `EXPO_PUBLIC_API_HOST=${trimmed}\n` +
  `EXPO_PUBLIC_USE_MOCK=0\n`;

fs.writeFileSync(envPath, content, "utf8");
console.log(`OK: EXPO_PUBLIC_API_HOST=${trimmed}`);
console.log("Archivo: .env.local");
console.log("Reiniciá Metro (Ctrl+C y npm start) para aplicar los cambios.");
