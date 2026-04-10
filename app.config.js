/**
 * Config dinámica: inyecta apiHost para que la app lo lea en runtime (evita caché de Metro con env).
 * Expo carga .env / .env.local antes de evaluar este archivo.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiHost:
      process.env.EXPO_PUBLIC_API_HOST ||
      "https://759b-2803-9800-98c0-7212-f1bf-e837-1a7-2daf.ngrok-free.app",
  },
});
