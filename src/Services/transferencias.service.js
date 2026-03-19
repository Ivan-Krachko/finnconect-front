import { API_HOST } from "../config/api";

/**
 * Genera el string para el QR de cobro. Solo datos locales, sin backend.
 * Formato: finconnectapp://cobrar?alias=...&monto=...&moneda=...
 * Al escanear, la app usa searchCuenta + getCuentas + crearTransferencia.
 */
export const generarQrCobro = ({ alias, monto, moneda = "ARS" }) => {
  const params = new URLSearchParams({
    alias: String(alias),
    monto: String(monto),
    moneda: String(moneda),
  });
  return `finconnectapp://cobrar?${params.toString()}`;
};

function parseApiError(data) {
  if (!data) return "Error al transferir";
  if (data.message) return data.message;
  if (data.error) return data.error;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.msg || e.message || e).join(". ");
  }
  if (data.details && Array.isArray(data.details)) {
    return data.details.map((d) => d.message || d.msg || d).join(". ");
  }
  return "Error al transferir";
}

export const crearTransferencia = async (token, cuentaOrigenId, cuentaDestinoId, monto) => {
  const montoStr = String(monto).replace(",", ".");
  const montoNum = parseFloat(montoStr) || 0;

  if (!cuentaOrigenId || !cuentaDestinoId || Number(cuentaOrigenId) === Number(cuentaDestinoId)) {
    throw new Error("Datos de transferencia inválidos");
  }

  const bodies = [
    { cuentaOrigenId: Number(cuentaOrigenId), cuentaDestinoId: Number(cuentaDestinoId), monto: montoStr },
    { cuenta_origen_id: Number(cuentaOrigenId), cuenta_destino_id: Number(cuentaDestinoId), monto: montoStr },
  ];

  const tryRequest = async (body) => {
    const response = await fetch(`${API_HOST}/transferencias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    return { ok: response.ok, data, status: response.status };
  };

  let result = { ok: false, data: {}, status: 0 };
  for (const body of bodies) {
    result = await tryRequest(body);
    if (result.ok) break;
    if (result.status !== 400 && result.status !== 422) break;
  }
  if (!result.ok) {
    throw new Error(parseApiError(result.data));
  }
  return result.data;
};
