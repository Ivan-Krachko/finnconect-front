#!/usr/bin/env node
/**
 * Escribe .env.local con el host del API mock (backend en localhost:3000 con MOCK=true).
 * Así Expo carga el mismo valor que si usás api:set (cross-env solo a veces pierde contra .env.local).
 *
 * Uso:
 *   npm run mock
 *
 * En emulador Android, el "localhost" del host es el propio emulador:
 *   MOCK_API_HOST=http://10.0.2.2:3000 npm run mock
 *
 * En teléfono físico, usá la IP de tu PC en la LAN:
 *   MOCK_API_HOST=http://192.168.0.10:3000 npm run mock
 */

const fs = require("fs");
const path = require("path");

const url = (process.env.MOCK_API_HOST || "http://127.0.0.1:3000").replace(/\/$/, "");
const envPath = path.join(__dirname, "..", ".env.local");
const content =
  `# Generado por npm run mock — backend local (MOCK=true)\n` +
  `EXPO_PUBLIC_API_HOST=${url}\n`;

fs.writeFileSync(envPath, content, "utf8");
console.log(`[mock] EXPO_PUBLIC_API_HOST=${url} → .env.local`);
console.log("[mock] Si la app no conecta: emulador Android → MOCK_API_HOST=http://10.0.2.2:3000");
console.log("[mock] Teléfono en la misma WiFi → MOCK_API_HOST=http://<IP-de-tu-PC>:3000");
