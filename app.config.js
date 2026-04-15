/**
 * Config dinámica: inyecta apiHost para que la app lo lea en runtime (evita caché de Metro con env).
 * Expo carga .env / .env.local antes de evaluar este archivo.
 */
const { official } = require("./scripts/api-host-defaults.cjs");

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiHost: process.env.EXPO_PUBLIC_API_HOST || official,
    useMock: process.env.EXPO_PUBLIC_USE_MOCK === "1",
  },
});
