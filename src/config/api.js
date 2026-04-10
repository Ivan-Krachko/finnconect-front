import Constants from "expo-constants";

const FALLBACK =
  "https://e9d5-2803-9800-98c0-7212-157c-7725-14b1-32e5.ngrok-free.app";

/**
 * Host base de la API.
 * Prioridad: extra.apiHost (app.config.js, runtime) → EXPO_PUBLIC_* → fallback.
 * `npm run mock` escribe .env.local y `expo start -c` evita bundle viejo.
 */
const extra = Constants.expoConfig?.extra;
const fromExtra =
  extra && typeof extra === "object" && "apiHost" in extra && extra.apiHost
    ? String(extra.apiHost)
    : "";

export const API_HOST =
  fromExtra ||
  process.env.EXPO_PUBLIC_API_HOST ||
  FALLBACK;
