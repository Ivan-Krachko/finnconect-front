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

export const getPagosServicios = async (token, { page = 1, pageSize = 20, facturaId, cuentaId } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  if (facturaId) params.set("facturaId", facturaId);
  if (cuentaId) params.set("cuentaId", cuentaId);

  const response = await fetch(`${API_HOST}/pagos-servicios?${params}`, {
    method: "GET",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const getPagoServicio = async (token, id) => {
  const response = await fetch(`${API_HOST}/pagos-servicios/${id}`, {
    method: "GET",
    headers: headers(token),
  });
  return parseResponse(response);
};

export const pagarFactura = async (token, facturaId, cuentaId) => {
  const response = await fetch(`${API_HOST}/pagos-servicios`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      facturaId: Number(facturaId),
      cuentaId: Number(cuentaId),
    }),
  });
  return parseResponse(response);
};

export const actualizarPagoServicio = async (token, id, body) => {
  const response = await fetch(`${API_HOST}/pagos-servicios/${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return parseResponse(response);
};

export const eliminarPagoServicio = async (token, id) => {
  const response = await fetch(`${API_HOST}/pagos-servicios/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  return parseResponse(response);
};
