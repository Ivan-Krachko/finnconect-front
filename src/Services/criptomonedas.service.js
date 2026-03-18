import { API_HOST } from "../config/api";

/**
 * Obtiene los precios actuales de las criptomonedas soportadas.
 * @param {string} token - JWT de autenticación
 * @param {string} [convert='ars'] - Moneda para expresar precios: ars, eur, usd, jpy, brl, gbp (case insensitive)
 * @returns {Promise<Array>} Lista de criptomonedas con precio, percentChange24h, etc.
 */
export const getPreciosCriptomonedas = async (token, convert = "ars") => {
  const params = new URLSearchParams();
  if (convert) {
    params.set("convert", convert.toLowerCase());
  }

  const url = `${API_HOST}/criptomonedas/prices${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(
      (data && (data.message || data.error)) || "Error al obtener precios de criptomonedas"
    );
  }

  return Array.isArray(data) ? data : [];
};
