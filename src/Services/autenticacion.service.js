import { API_HOST } from "../config/api";
import { getMe } from "./usuarios.service";

/**
 * Mensaje legible ante 400 "Validation failed" (Zod, etc.)
 */
function formatRegisterErrorMessage(json) {
  const raw = json?.message;
  const parts = [];

  const pushIssues = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item) continue;
      const path = Array.isArray(item.path)
        ? item.path.filter(Boolean).join(".")
        : item.field || item.param || "";
      const msg = item.message || item.msg || String(item);
      if (path && msg) parts.push(`${path}: ${msg}`);
      else if (msg) parts.push(msg);
    }
  };

  pushIssues(json.errors);
  pushIssues(json.issues);
  pushIssues(json.error?.issues);
  pushIssues(json.error?.errors);

  if (parts.length > 0) {
    return parts.join(" · ");
  }
  if (raw && raw !== "Validation failed") {
    return raw;
  }
  if (raw === "Validation failed") {
    return "Los datos no cumplen la validación del servidor. Revisá DNI, email y demás campos.";
  }
  return raw || "Error al registrarse";
}

export const login = async (email, password) => {
  const response = await fetch(`${API_HOST}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ email, password }),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "La API no devolvió JSON válido. ¿La URL del host es correcta?"
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Error al iniciar sesión");
  }

  return data.result;
};

/**
 * POST /auth/register
 * @param {{ nombre: string, apellido: string, email: string, dni: string, genero: string, password: string }} data
 */
export const registrar = async (data) => {
  const response = await fetch(`${API_HOST}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      dni: String(data.dni),
      genero: data.genero,
      password: data.password,
    }),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(formatRegisterErrorMessage(json));
  }

  return json.result;
};

/** @deprecated Usar `getMe(token)` desde usuarios.service */
export const getUsuarioActual = async (token) => {
  if (!token) return null;
  return getMe(token);
};
