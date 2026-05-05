import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import { clearBiometricLoginCredentials } from "../src/Services/biometricLogin.service";
import { updateMe } from "../src/Services/usuarios.service";
import { safeBack } from "../src/utils/navigation";

export default function CambiarContrasenaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, sessionReady } = useContext(autenticacionContext);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!sessionReady || !token) {
      Alert.alert("Sesión", "Iniciá sesión para cambiar la contraseña.");
      return;
    }
    if (nueva.length < 8) {
      Alert.alert("Contraseña", "La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== repite) {
      Alert.alert("Contraseña", "La confirmación no coincide.");
      return;
    }
    setSaving(true);
    try {
      await updateMe(token, {
        currentPassword: actual,
        password: nueva,
      });
      await clearBiometricLoginCredentials();
      setActual("");
      setNueva("");
      setRepite("");
      Alert.alert(
        "Listo",
        "Tu contraseña se actualizó. Si usabas Face ID o huella para entrar, activalo de nuevo desde el inicio de sesión.",
        [{ text: "OK", onPress: () => safeBack(router, "/(tabs)/perfil") }]
      );
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          hitSlop={12}
          onPress={() => safeBack(router, "/(tabs)/perfil")}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#1FA774" />
        </Pressable>
        <Text style={s.headerTitle}>Contraseña</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.hint}>
          Ingresá tu contraseña actual y elegí una nueva (mínimo 8 caracteres).
        </Text>

        <Text style={s.label}>Contraseña actual</Text>
        <TextInput
          style={s.input}
          value={actual}
          onChangeText={setActual}
          placeholder="••••••••"
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
            editable={sessionReady && !!token}
        />

        <Text style={s.label}>Nueva contraseña</Text>
        <TextInput
          style={s.input}
          value={nueva}
          onChangeText={setNueva}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
            editable={sessionReady && !!token}
        />

        <Text style={s.label}>Confirmar nueva contraseña</Text>
        <TextInput
          style={s.input}
          value={repite}
          onChangeText={setRepite}
          placeholder="Repetí la nueva contraseña"
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
            editable={sessionReady && !!token}
        />

        <Pressable
          style={[s.saveBtn, (!token || saving) && s.saveBtnDisabled]}
          onPress={guardar}
          disabled={!sessionReady || !token || saving}
        >
          {saving ? (
            <ActivityIndicator color="#080E0B" />
          ) : (
            <Text style={s.saveText}>Actualizar contraseña</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E0B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 20 },
  hint: {
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#111B16",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: "#1FA774",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: "#080E0B", fontSize: 16, fontWeight: "800" },
});
