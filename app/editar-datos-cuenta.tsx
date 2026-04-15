import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
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
import { getMe, updateMe } from "../src/Services/usuarios.service";
import { safeBack } from "../src/utils/navigation";

const GENERO_OPTIONS = [
  { value: "masculino" as const, label: "Masculino" },
  { value: "femenino" as const, label: "Femenino" },
  { value: "otro" as const, label: "Otro" },
];

export default function EditarDatosCuentaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, sessionReady } = useContext(autenticacionContext);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState<"masculino" | "femenino" | "otro">("otro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMe(token)
      .then((u: {
        nombre?: string;
        apellido?: string;
        email?: string;
        genero?: string;
      }) => {
        setNombre(u.nombre ?? "");
        setApellido(u.apellido ?? "");
        setEmail(u.email ?? "");
        if (u.genero === "masculino" || u.genero === "femenino" || u.genero === "otro") {
          setGenero(u.genero);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, sessionReady]);

  const guardar = async () => {
    if (!sessionReady || !token) {
      Alert.alert("Sesión", "Iniciá sesión para guardar los cambios.");
      return;
    }
    const n = nombre.trim();
    const a = apellido.trim();
    const e = email.trim();
    if (!n || !a || !e) {
      Alert.alert("Datos incompletos", "Completá nombre, apellido y email.");
      return;
    }
    setSaving(true);
    try {
      await updateMe(token, {
        nombre: n,
        apellido: a,
        email: e,
        genero,
      });
      Alert.alert("Listo", "Tus datos se actualizaron.", [
        { text: "OK", onPress: () => safeBack(router, "/(tabs)/perfil") },
      ]);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar.");
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
        <Text style={s.headerTitle}>Datos de la cuenta</Text>
        <View style={{ width: 36 }} />
      </View>

      {!sessionReady || loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#1FA774" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {sessionReady && !token && (
            <Text style={s.hint}>Iniciá sesión para editar tu perfil.</Text>
          )}

          <Text style={s.label}>Nombre</Text>
          <TextInput
            style={s.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="words"
            editable={sessionReady && !!token}
          />

          <Text style={s.label}>Apellido</Text>
          <TextInput
            style={s.input}
            value={apellido}
            onChangeText={setApellido}
            placeholder="Apellido"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="words"
            editable={sessionReady && !!token}
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="rgba(255,255,255,0.35)"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={sessionReady && !!token}
          />

          <Text style={s.label}>Género</Text>
          <View style={s.genRow}>
            {GENERO_OPTIONS.map((opt) => {
              const active = genero === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => sessionReady && token && setGenero(opt.value)}
                  style={[s.genChip, active && s.genChipActive]}
                >
                  <Text style={[s.genChipText, active && s.genChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[s.saveBtn, (!sessionReady || !token || saving) && s.saveBtnDisabled]}
            onPress={guardar}
            disabled={!sessionReady || !token || saving}
          >
            {saving ? (
              <ActivityIndicator color="#080E0B" />
            ) : (
              <Text style={s.saveText}>Guardar cambios</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  hint: { color: "rgba(255,255,255,0.5)", marginBottom: 16, fontSize: 14 },
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
  genRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  genChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  genChipActive: {
    backgroundColor: "rgba(31,167,116,0.2)",
    borderColor: "rgba(31,167,116,0.5)",
  },
  genChipText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600" },
  genChipTextActive: { color: "#4ADE80" },
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
