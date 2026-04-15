#!/usr/bin/env node
/**
 * Escribe .env.local para backend local con datos mockeados (MOCK=true en finconnect-back).
 *
 * Uso:
 *   npm run mock
 *
 * Emulador Android (localhost del host):
 *   MOCK_API_HOST=http://10.0.2.2:3000 npm run mock
 *
 * Teléfono en la misma red:
 *   MOCK_API_HOST=http://192.168.0.10:3000 npm run mock
 */

const fs = require("fs");
const path = require("path");
const defaults = require("./api-host-defaults.cjs");

const url = defaults.mock;
const envPath = path.join(__dirname, "..", ".env.local");
const content =
  `# Generado por npm run mock — backend local (MOCK=true)\n` +
  `EXPO_PUBLIC_API_HOST=${url}\n` +
  `EXPO_PUBLIC_USE_MOCK=1\n`;

fs.writeFileSync(envPath, content, "utf8");
console.log(`[mock] EXPO_PUBLIC_API_HOST=${url} → .env.local`);
console.log("[mock] Asegurate de tener finconnect-back en ese host con MOCK=true");
console.log("[mock] Android emulador: MOCK_API_HOST=http://10.0.2.2:3000 npm run mock");
console.log("[mock] Teléfono WiFi: MOCK_API_HOST=http://<IP-de-tu-PC>:3000 npm run mock");
