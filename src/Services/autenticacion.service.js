const API_URL = "https://0065-2803-9800-98c0-7212-2c4c-f14d-6378-96ed.ngrok-free.app";

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

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
