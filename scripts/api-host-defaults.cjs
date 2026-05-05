function normalizeBase(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  return s.replace(/\/+$/, "");
}

/**
 * Valores para scripts (sin importar src/config/api.js — evita dependencia circular).
 * use-official-api solo carga .env antes de leer `official`; no mezcla .env.local en process.env.
 */
module.exports = {
  get official() {
    const o = normalizeBase(process.env.OFFICIAL_API_HOST);
    if (o) return o;
    const e = normalizeBase(process.env.EXPO_PUBLIC_API_HOST);
    if (e) return e;
    return "http://127.0.0.1:3000";
  },
  get mock() {
    const m = normalizeBase(process.env.MOCK_API_HOST);
    if (m) return m;
    return "http://127.0.0.1:3000";
  },
};
