import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import {
  biometricLoginSupportedPlatform,
  isBiometricAuthAvailable,
  isBiometricLoginConfigured,
  saveCredentialsForBiometricLogin,
  unlockSavedCredentialsWithBiometrics,
} from "../src/Services/biometricLogin.service";

function offerEnableBiometricAfterPasswordLogin(email: string, password: string) {
  if (!biometricLoginSupportedPlatform()) return;
  void (async () => {
    try {
      const hardwareOk = await isBiometricAuthAvailable();
      if (!hardwareOk) return;
      const already = await isBiometricLoginConfigured();
      if (already) return;
      Alert.alert(
        "Inicio rápido",
        "¿Querés usar el login del celular (huella, Face ID o código) la próxima vez para entrar sin escribir la contraseña de la app?",
        [
          { text: "Ahora no", style: "cancel", onPress: () => {} },
          {
            text: "Sí, activar",
            onPress: async () => {
              try {
                await saveCredentialsForBiometricLogin(email, password);
                Alert.alert(
                  "Listo",
                  "La próxima vez podés tocar «Ingresar con login del celular» en el inicio."
                );
              } catch (e: unknown) {
                Alert.alert(
                  "No se pudo guardar",
                  e instanceof Error ? e.message : "Intentá de nuevo más tarde."
                );
              }
            },
          },
        ]
      );
    } catch {
      /* ignorar: no bloquear ingreso */
    }
  })();
}

export default function Login() {
  const router = useRouter();
  const { signIn } = useContext(autenticacionContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [bioShowButton, setBioShowButton] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS === "web") return;
      try {
        const [avail, configured] = await Promise.all([
          isBiometricAuthAvailable(),
          isBiometricLoginConfigured(),
        ]);
        if (!cancelled) {
          setBioShowButton(Boolean(avail && configured));
        }
      } catch {
        if (!cancelled) setBioShowButton(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completá ambos campos");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.replace("/home");
      offerEnableBiometricAfterPasswordLogin(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { email: e, password: p } = await unlockSavedCredentialsWithBiometrics();
      await signIn(e, p);
      router.replace("/home");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo iniciar sesión";
      if (msg !== "Cancelado") {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0B3D2E", "#145A3E", "#1FA774"]} style={s.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <View style={s.header}>
          <View style={s.logoCircle}>
            <Ionicons name="wallet-outline" size={38} color="#0B3D2E" />
          </View>
          <Text style={s.brand}>FinConnect</Text>
          <Text style={s.subtitle}>Tu billetera inteligente</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar Sesión</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Correo electrónico</Text>
            <View style={s.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#999"
                style={s.inputIcon}
              />
              <TextInput
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#bbb"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                style={s.input}
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#999"
                style={s.inputIcon}
              />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError("");
                }}
                secureTextEntry={secureText}
                style={s.input}
              />
              <Pressable
                onPress={() => setSecureText(!secureText)}
                hitSlop={8}
              >
                <Ionicons
                  name={secureText ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#D32F2F" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {bioShowButton && Platform.OS !== "web" ? (
            <Pressable
              onPress={handleBiometricLogin}
              disabled={loading}
              style={({ pressed }) => [
                s.buttonOutline,
                loading && s.buttonDisabled,
                pressed && !loading && s.buttonOutlinePressed,
              ]}
            >
              <Ionicons name="finger-print-outline" size={22} color="#1FA774" />
              <Text style={s.buttonOutlineText}>Ingresar con login del celular</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              s.button,
              loading && s.buttonDisabled,
              pressed && !loading && s.buttonPressed,
              bioShowButton && Platform.OS !== "web" && { marginTop: 12 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={s.buttonText}>Ingresar</Text>
            )}
          </Pressable>

          <Pressable style={s.forgotBtn}>
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>¿No tenés cuenta? </Text>
          <Pressable onPress={() => router.push("/registro")}>
            <Text style={s.footerLink}>Registrate</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1, justifyContent: "center" },

  header: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brand: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 24,
  },

  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#ECECEC",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    height: "100%",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  buttonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1FA774",
    backgroundColor: "rgba(31,167,116,0.06)",
    marginBottom: 4,
  },
  buttonOutlinePressed: {
    backgroundColor: "rgba(31,167,116,0.12)",
  },
  buttonOutlineText: {
    color: "#1FA774",
    fontSize: 16,
    fontWeight: "700",
  },

  button: {
    backgroundColor: "#1FA774",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#1FA774",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: "#8dd4b4",
    shadowOpacity: 0,
  },
  buttonPressed: {
    backgroundColor: "#178B5F",
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  forgotBtn: { alignItems: "center", marginTop: 16 },
  forgotText: { color: "#1FA774", fontSize: 13, fontWeight: "600" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  footerLink: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
