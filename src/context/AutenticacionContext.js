import { createContext, useState } from "react";
import * as autenticacionService from "../Services/autenticacion.service";

export const autenticacionContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signIn = async (email, password) => {
    const response = await autenticacionService.login(email, password);
    setUser(response.user);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <autenticacionContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </autenticacionContext.Provider>
  );
}
