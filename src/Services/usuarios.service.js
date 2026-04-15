import { API_HOST } from "../config/api";

const headers = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "ngrok-skip-browser-warning": "true",
});

function messageFromErrorPayload(data) {
  if (!data || typeof data !== "object") return null;
  if (data.message && data.message !== "Validation failed") {
    return data.message;
  }
  const issues = data.errors ?? data.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0];
    const path = Array.isArray(first.path) ? first.path.filter(Boolean).join(".") : "";
    const msg = first.message || "Dato inválido";
    return path ? `${path}: ${msg}` : msg;
  }
  return data.message || null;
}

async function parseResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const msg =
      messageFromErrorPayload(data) ||
      `Error ${response.status}. Revisá conexión y que el backend tenga PUT/PATCH /usuarios/me.`;
    throw new Error(msg);
  }
  return data;
}

/** GET /usuarios/me — usuario autenticado (sin password). */
export const getMe = async (token) => {
  const response = await fetch(`${API_HOST}/usuarios/me`, {
    method: "GET",
    headers: headers(token),
  });
  return parseResponse(response);
};

/** PUT /usuarios/me — actualizar perfil o contraseña (misma lógica que PATCH en el servidor). */
export const updateMe = async (token, body) => {
  const response = await fetch(`${API_HOST}/usuarios/me`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return parseResponse(response);
};
