import { API_HOST } from "../config/api";

/**
 * Precios actuales de las acciones soportadas (GET /acciones/prices).
 * @param {string} token
 * @param {string} [convert='ars']
 */
export const getPreciosAcciones = async (token, convert = "ars") => {
  const params = new URLSearchParams();
  if (convert) params.set("convert", convert.toLowerCase());

  const url = `${API_HOST}/acciones/prices${params.toString() ? `?${params.toString()}` : ""}`;
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
      (data && (data.message || data.error)) || "Error al obtener precios de acciones"
    );
  }

  return Array.isArray(data) ? data : [];
};

/**
 * Cajas de acciones del usuario (GET /acciones).
 * @param {string} token
 * @param {{ page?: number, pageSize?: number }} [opts]
 */
export const getAcciones = async (token, { page = 1, pageSize = 50 } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  const response = await fetch(`${API_HOST}/acciones?${params}`, {
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
    throw new Error((data && (data.message || data.error)) || "Error al obtener acciones");
  }

  return {
    items: data.items || [],
    pagination: data.pagination || {},
    total: data.total ?? 0,
  };
};

/**
 * Crea una transacción de acciones (POST /accion-transactions).
 * @param {string} token
 * @param {number} cuentaId
 * @param {string} tipoAccion - apple, microsoft, alphabet, amazon, nvidia
 * @param {string} sentido - egreso (comprar), ingreso (vender)
 * @param {string} cantidad - cantidad de títulos
 */
export const crearTransaccionAccion = async (
  token,
  cuentaId,
  tipoAccion,
  sentido,
  cantidad
) => {
  const response = await fetch(`${API_HOST}/accion-transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      cuentaId: Number(cuentaId),
      tipoAccion: String(tipoAccion).toLowerCase(),
      sentido,
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
      "Error al crear transacción de acciones";
    throw new Error(msg);
  }

  return data;
};
