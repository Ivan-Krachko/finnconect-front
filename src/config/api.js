import Constants from "expo-constants";

/** Debe coincidir con `scripts/api-host-defaults.cjs` (API oficial). */
const OFFICIAL_FALLBACK =
  "https://5dac-2803-9800-98c0-7212-3018-8ae3-91ef-c0c5.ngrok-free.app";

/**
 * Host base de la API.
 * Prioridad: extra.apiHost (app.config.js) → EXPO_PUBLIC_API_HOST → oficial por defecto.
 * - `npm start` → scripts/use-official-api.js escribe .env.local con la API oficial.
 * - `npm run mock` → use-mock-api.js escribe localhost (backend con MOCK=true).
 */
const extra = Constants.expoConfig?.extra;
const fromExtra =
  extra && typeof extra === "object" && "apiHost" in extra && extra.apiHost
    ? String(extra.apiHost)
    : "";

export const API_HOST =
  fromExtra ||
  process.env.EXPO_PUBLIC_API_HOST ||
  OFFICIAL_FALLBACK;

/** true si arrancaste con `npm run mock` (backend local mockeado). */
export const USE_MOCK =
  extra &&
  typeof extra === "object" &&
  "useMock" in extra &&
  extra.useMock === true;
