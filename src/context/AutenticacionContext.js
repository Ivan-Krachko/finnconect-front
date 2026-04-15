import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import * as autenticacionService from "../Services/autenticacion.service";

const TOKEN_KEY = "finconnect_auth_token";

export const autenticacionContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  /** false hasta leer AsyncStorage (evita pantallas con token null por carrera). */
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TOKEN_KEY)
      .then((stored) => {
        if (!cancelled && stored) {
          setToken(stored);
        }
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email, password) => {
    const result = await autenticacionService.login(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    return result;
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  const signUp = async (payload) => {
    const result = await autenticacionService.registrar(payload);
    if (result?.token) {
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    }
    return result;
  };

  return (
    <autenticacionContext.Provider
      value={{ token, sessionReady, signIn, signUp, signOut }}
    >
      {children}
    </autenticacionContext.Provider>
  );
}
