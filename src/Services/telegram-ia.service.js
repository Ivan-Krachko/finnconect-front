import { API_HOST } from "../config/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "ngrok-skip-browser-warning": "true",
});

/**
 * POST /auth/telegram/code — código de un solo uso (15 min) para enlazar Telegram/IA.
 * @returns {{ code: string, expiresAt: string, ttlMinutes: number }}
 */
export const solicitarCodigoTelegramIa = async (token) => {
  const response = await fetch(`${API_HOST}/auth/telegram/code`, {
    method: "POST",
    headers: headers(token),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || "No se pudo generar el código");
  }
  return data.result;
};
