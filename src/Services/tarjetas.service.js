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

export const getTarjetas = async (token, page = 1, pageSize = 20) => {
  const response = await fetch(
    `${API_HOST}/tarjetas?page=${page}&pageSize=${pageSize}`,
    { method: "GET", headers: headers(token) }
  );
  const data = await parseResponse(response);
  const items = Array.isArray(data)
    ? data
    : data.items ?? data.tarjetas ?? data.data ?? [];
  return { ...data, items };
};

export const getTarjeta = async (token, id) => {
  const response = await fetch(`${API_HOST}/tarjetas/${id}`, {
    method: "GET",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const crearTarjeta = async (token, cuentaId) => {
  const response = await fetch(`${API_HOST}/tarjetas`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ cuentaId: Number(cuentaId) }),
  });
  return parseResponse(response);
};

export const bloquearTarjeta = async (token, id) => {
  const response = await fetch(`${API_HOST}/tarjetas/${id}/bloquear`, {
    method: "POST",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const pararTarjeta = async (token, id) => {
  const response = await fetch(`${API_HOST}/tarjetas/${id}/parar`, {
    method: "POST",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const cancelarTarjeta = async (token, id) => {
  const response = await fetch(`${API_HOST}/tarjetas/${id}/cancelar`, {
    method: "POST",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const eliminarTarjeta = async (token, id) => {
  const response = await fetch(`${API_HOST}/tarjetas/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  return parseResponse(response);
};
