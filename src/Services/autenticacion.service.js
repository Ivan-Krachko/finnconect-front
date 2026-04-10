import { API_HOST } from "../config/api";

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
    const firstErr =
      Array.isArray(json.errors) && json.errors.length > 0
        ? json.errors.map((e) => e?.message).filter(Boolean).join(" ")
        : "";
    throw new Error(json.message || firstErr || "Error al registrarse");
  }

  return json.result;
};

export const getUsuarioActual = async () => {
  return {
    id: 1,
    name: "Ivan",
    email: "ivan@mail.com",
  };
};
