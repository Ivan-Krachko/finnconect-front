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
    throw new Error(data.message || "Error al obtener facturas");
  }
  return data;
}

/**
 * Lista facturas del usuario. Soporta filtro por estado (pendiente, pagada).
 * Si el backend no tiene /facturas, devuelve { items: [] }.
 */
export const getFacturas = async (token, { page = 1, pageSize = 20, estado } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  if (estado) params.set("estado", estado);

  const response = await fetch(`${API_HOST}/facturas?${params}`, {
    method: "GET",
    headers: headers(token),
  });

  if (response.status === 404 || response.status === 501) {
    return { items: [], total: 0, pagination: { page: 1, pageSize, total: 0 } };
  }

  return parseResponse(response);
};
