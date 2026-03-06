import { createContext, useState } from "react";
import * as autenticacionService from "../Services/autenticacion.service";

export const autenticacionContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  const signIn = async (email, password) => {
    const result = await autenticacionService.login(email, password);
    setToken(result.token);
    return result;
  };

  const signOut = () => {
    setToken(null);
  };

  return (
    <autenticacionContext.Provider value={{ token, signIn, signOut }}>
      {children}
    </autenticacionContext.Provider>
  );
}
