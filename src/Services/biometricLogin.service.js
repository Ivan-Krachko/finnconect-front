import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const FLAG_KEY = "finconnect_bio_login_enabled";
const SECURE_KEY = "finconnect_bio_creds_v1";

export function biometricLoginSupportedPlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/** Hardware + enrolled (huella, Face ID o equivalente). */
export async function isBiometricAuthAvailable() {
  if (!biometricLoginSupportedPlatform()) return false;
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/** Texto corto para el botón (Face ID vs huella vs biométrico). */
export async function getBiometricLoginShortLabel() {
  if (!biometricLoginSupportedPlatform()) return "Biometría";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Huella";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Iris";
    }
  } catch {
    /* ignore */
  }
  return "Biometría";
}

export async function isBiometricLoginConfigured() {
  if (!biometricLoginSupportedPlatform()) return false;
  try {
    const flag = await AsyncStorage.getItem(FLAG_KEY);
    return flag === "1";
  } catch {
    return false;
  }
}

/**
 * Guarda email y contraseña para re-login tras biometría (Keychain / Keystore).
 */
export async function saveCredentialsForBiometricLogin(email, password) {
  if (!biometricLoginSupportedPlatform()) return;
  const payload = JSON.stringify({
    email: String(email || "").trim(),
    password: String(password || ""),
  });
  await SecureStore.setItemAsync(SECURE_KEY, payload, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.setItem(FLAG_KEY, "1");
}

export async function clearBiometricLoginCredentials() {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEY);
  } catch {
    /* ya borrado o no existe */
  }
  try {
    await AsyncStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Pide Face ID / huella / código del dispositivo y devuelve { email, password } guardados.
 */
export async function unlockSavedCredentialsWithBiometrics() {
  if (!biometricLoginSupportedPlatform()) {
    throw new Error("La biometría no está disponible en esta plataforma.");
  }
  const available = await isBiometricAuthAvailable();
  if (!available) {
    throw new Error("No hay biométrica configurada en el dispositivo.");
  }
  const short = await getBiometricLoginShortLabel();
  const auth = await LocalAuthentication.authenticateAsync({
    promptMessage: "Iniciar sesión en FinConnect",
    cancelLabel: "Cancelar",
    fallbackLabel: "Usar código del dispositivo",
    disableDeviceFallback: false,
  });
  if (!auth.success) {
    const msg =
      auth.error === "user_cancel" ||
      auth.error === "system_cancel" ||
      auth.error === "app_cancel"
        ? "Cancelado"
        : auth.warning || auth.error || "No se pudo verificar";
    throw new Error(msg);
  }
  const raw = await SecureStore.getItemAsync(SECURE_KEY);
  if (!raw) {
    await clearBiometricLoginCredentials();
    throw new Error("No hay credenciales guardadas. Ingresá con email y contraseña.");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await clearBiometricLoginCredentials();
    throw new Error("Datos guardados inválidos. Volvé a activar el ingreso biométrico.");
  }
  if (!parsed?.email || !parsed?.password) {
    await clearBiometricLoginCredentials();
    throw new Error("Credenciales incompletas.");
  }
  return { email: parsed.email, password: parsed.password, shortLabel: short };
}
