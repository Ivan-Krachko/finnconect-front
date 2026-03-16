import { API_HOST } from "../config/api";

export const crearTransferencia = async (token, cuentaOrigenId, cuentaDestinoId, monto) => {
  const response = await fetch(`${API_HOST}/transferencias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      cuentaOrigenId: Number(cuentaOrigenId),
      cuentaDestinoId: Number(cuentaDestinoId),
      monto: String(monto),
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
    throw new Error(data.message || "Error al transferir");
  }

  return data;
};
