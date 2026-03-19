import { API_HOST } from "../config/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "ngrok-skip-browser-warning": "true",
});

async function parseResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || "Error en la operación");
  }
  return data;
}

/**
 * Obtiene tasas de conversión desde una moneda.
 * GET /currencies/convert?from=USD&amount=100
 */
export const getConvertRates = async (token, from = "USD", amount = 1) => {
  const params = new URLSearchParams({ from, amount: String(amount) });
  const response = await fetch(`${API_HOST}/currencies/convert?${params}`, {
    method: "GET",
    headers: headers(token),
  });
  return parseResponse(response);
};

/**
 * Convierte moneda entre cuentas propias (monedas distintas).
 * POST /currency-conversions
 */
export const convertirMoneda = async (
  token,
  cuentaOrigenId,
  cuentaDestinoId,
  montoOrigen
) => {
  const montoStr = String(montoOrigen).replace(",", ".");
  const response = await fetch(`${API_HOST}/currency-conversions`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      cuentaOrigenId: Number(cuentaOrigenId),
      cuentaDestinoId: Number(cuentaDestinoId),
      montoOrigen: montoStr,
    }),
  });
  return parseResponse(response);
};
