import { API_HOST } from "../config/api";

export const getMovimientos = async (token, { page = 1, pageSize = 10, sentido } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  if (sentido) params.set("sentido", sentido);

  const response = await fetch(`${API_HOST}/movimientos?${params}`, {
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
    throw new Error(data.message || "Error al obtener movimientos");
  }

  return data;
};
