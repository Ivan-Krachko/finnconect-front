/**
 * Host base de la API.
 * - EXPO_PUBLIC_API_HOST: definilo en .env.local o con `npm run api:set -- <URL>`
 * - `npm run mock` arranca Expo apuntando a http://localhost:3000 (backend con MOCK=true)
 */
export const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ||
  "https://e9d5-2803-9800-98c0-7212-157c-7725-14b1-32e5.ngrok-free.app";
