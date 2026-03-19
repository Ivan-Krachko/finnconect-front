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

/**
 * Obtiene los holdings de criptomonedas del usuario (cuánto tiene en cada cripto).
 * @param {string} token - JWT de autenticación
 * @param {Object} [opts] - page, pageSize para paginación
 * @returns {Promise<{ items: Array<{ tipoCriptomoneda: string, monto: string }>, pagination, total }>}
 */
export const getCriptomonedas = async (token, { page = 1, pageSize = 50 } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  const response = await fetch(`${API_HOST}/criptomonedas?${params}`, {
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
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(
      (data && (data.message || data.error)) || "Error al obtener criptomonedas"
    );
  }

  return {
    items: data.items || [],
    pagination: data.pagination || {},
    total: data.total ?? 0,
  };
};

/**
 * Crea una transacción de criptomoneda.
 * @param {string} token - JWT de autenticación
 * @param {number} cuentaId - ID de la cuenta
 * @param {string} tipoCriptomoneda - Tipo en lowercase: bitcoin, ethereum, etc.
 * @param {string} sentido - "egreso" al comprar cripto, "ingreso" al vender
 * @param {string} cantidad - Cantidad de cripto (siempre en cripto)
 * @returns {Promise<Object>}
 */
export const crearTransaccionCripto = async (
  token,
  cuentaId,
  tipoCriptomoneda,
  sentido,
  cantidad
) => {
  const response = await fetch(`${API_HOST}/cripto-transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      cuentaId: Number(cuentaId),
      tipoCriptomoneda: String(tipoCriptomoneda).toLowerCase(),
      sentido: sentido,
      cantidad: String(cantidad),
    }),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors.map((e) => e.msg || e.message || e).join(". ")
        : null) ||
      "Error al crear transacción de cripto";
    throw new Error(msg);
  }

  return data;
};
