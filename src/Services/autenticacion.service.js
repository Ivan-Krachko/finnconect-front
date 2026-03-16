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

export const registro = async (data) => {
  return {
    id: 1,
    name: data.name,
    email: data.email,
  };
};

export const getUsuarioActual = async () => {
  return {
    id: 1,
    name: "Ivan",
    email: "ivan@mail.com",
  };
};
