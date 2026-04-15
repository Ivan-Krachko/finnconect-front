/**
 * URLs por defecto (sin .env.local).
 * - official: API “oficial” / producción (override con OFFICIAL_API_HOST).
 * - mock: backend local con MOCK=true (override con MOCK_API_HOST).
 */
module.exports = {
  get official() {
    return (
      process.env.OFFICIAL_API_HOST ||
      "https://5dac-2803-9800-98c0-7212-3018-8ae3-91ef-c0c5.ngrok-free.app"
    ).replace(/\/$/, "");
  },
  get mock() {
    return (process.env.MOCK_API_HOST || "http://127.0.0.1:3000").replace(/\/$/, "");
  },
};
