import { API_HOST } from "../config/api";

export const getCuentas = async (token, page = 1, pageSize = 10) => {
  const response = await fetch(
    `${API_HOST}/cuentas?page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    }
  );

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(data.message || "Error al obtener cuentas");
  }

  return data;
};

export const searchCuenta = async (token, search) => {
  const response = await fetch(
    `${API_HOST}/cuentas/search?search=${encodeURIComponent(search)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    }
  );

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(data.message || "Error al buscar cuenta");
  }

  return data;
};
