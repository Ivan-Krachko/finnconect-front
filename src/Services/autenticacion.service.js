export const login = async (email, password) => {
  if (email && password) {
    return {
      token: "fake-token",
      user: {
        id: 1,
        name: "Ivan",
        email,
      },
    };
  }
  throw new Error("Credenciales inválidas");
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
