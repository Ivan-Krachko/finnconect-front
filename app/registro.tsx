import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import {
  canUseNativeFaceDetector,
  detectFacesFromImageUri,
  requireExpoFaceDetector,
} from "../src/Services/expoFaceDetector.service";
import {
  evaluateFaceInOval,
  hintForReason,
  pickLargestFace,
} from "../src/utils/faceInOval";

type Step = "form" | "face";

type FormState = {
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  genero: string;
  password: string;
};

const GENEROS = [
  { id: "masculino", label: "Masculino" },
  { id: "femenino", label: "Femenino" },
  { id: "otro", label: "Otro" },
];

export default function RegistroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useContext(autenticacionContext);
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>({
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    genero: "masculino",
    password: "",
  });
  const [error, setError] = useState("");

  const [facePhase, setFacePhase] = useState<"preview" | "scanning" | "done">("preview");
  const [registering, setRegistering] = useState(false);
  const [faceHint, setFaceHint] = useState("");
  const [alignProgress, setAlignProgress] = useState(0);
  const [verifyMode, setVerifyMode] = useState<"idle" | "native" | "fallback">("idle");

  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const registrationStartedRef = useRef(false);

  /** Lecturas seguidas con rostro OK para pasar (evita un frame casual) */
  const CONSECUTIVE_OK = 2;

  const validateForm = (): boolean => {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError("Completá nombre y apellido");
      return false;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Ingresá un email válido");
      return false;
    }
    if (!form.dni.trim()) {
      setError("Ingresá tu DNI");
      return false;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }
    return true;
  };

  const goToFace = () => {
    setError("");
    if (!validateForm()) return;
    registrationStartedRef.current = false;
    setVerifyMode("idle");
    setAlignProgress(0);
    setFaceHint("");
    setStep("face");
    setFacePhase("preview");
  };

  const completeRegistration = useCallback(async () => {
    if (registrationStartedRef.current) return;
    registrationStartedRef.current = true;
    setFacePhase("done");
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
    setRegistering(true);
    setError("");
    try {
      await signUp({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim().toLowerCase(),
        dni: form.dni.trim(),
        genero: form.genero,
        password: form.password,
      });
      router.replace("/home");
    } catch (e: unknown) {
      registrationStartedRef.current = false;
      setError(e instanceof Error ? e.message : "No se pudo completar el registro");
      setStep("form");
      setFacePhase("preview");
    } finally {
      setRegistering(false);
    }
  }, [form, signUp, router]);

  const runFallbackVerification = useCallback(() => {
    setFaceHint(
      "Modo práctica: sin detector facial en este entorno (p. ej. Expo Go o web). " +
        "Generá un development build para usar verificación real."
    );
    setTimeout(() => {
      void completeRegistration();
    }, 2400);
  }, [completeRegistration]);

  const startFaceVerification = () => {
    registrationStartedRef.current = false;
    setAlignProgress(0);
    setFacePhase("scanning");
    if (Platform.OS === "web" || !canUseNativeFaceDetector()) {
      setFaceHint("");
      setVerifyMode("fallback");
      runFallbackVerification();
      return;
    }
    setFaceHint(
      "Tomá el tiempo que necesites. Seguimos intentando hasta reconocer tu rostro bien en el óvalo."
    );
    setVerifyMode("native");
  };

  function isDetectorUnavailableError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      msg.includes("expo-face-detector") ||
      msg.includes("Unavailability") ||
      msg.includes("not available") ||
      msg.includes("development build")
    );
  }

  useEffect(() => {
    if (facePhase !== "scanning" || verifyMode !== "native") return;
    if (Platform.OS === "web") return;

    const FaceDetector = requireExpoFaceDetector();
    if (!FaceDetector) {
      setVerifyMode("fallback");
      runFallbackVerification();
      return;
    }

    let cancelled = false;
    let busy = false;
    let consecutive = 0;
    let fallbackTriggered = false;
    let intervalId: ReturnType<typeof setInterval>;

    const triggerFallback = () => {
      if (fallbackTriggered || cancelled) return;
      fallbackTriggered = true;
      cancelled = true;
      clearInterval(intervalId);
      setVerifyMode("fallback");
      runFallbackVerification();
    };

    const tick = async () => {
      if (cancelled || busy) return;
      if (!cameraRef.current) {
        setFaceHint("Iniciando cámara…");
        return;
      }
      busy = true;
      let uri: string | null = null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          // false: respeta orientación EXIF; evita bounds de rostro descalados
          skipProcessing: false,
        });
        uri = photo.uri;
        const detection = await detectFacesFromImageUri(uri);
        if (!detection) {
          setFaceHint("Seguimos intentando detectar tu rostro…");
          return;
        }
        const { faces, image } = detection;
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        uri = null;

        const iw = image.width;
        const ih = image.height;

        if (faces.length === 0) {
          consecutive = 0;
          setAlignProgress(0);
          setFaceHint(hintForReason("no_face"));
          return;
        }
        if (faces.length > 1) {
          consecutive = 0;
          setAlignProgress(0);
          setFaceHint(hintForReason("multiple"));
          return;
        }
        const face = pickLargestFace(faces)!;
        const r = evaluateFaceInOval(face, iw, ih);
        if (r !== "ok") {
          consecutive = 0;
          setAlignProgress(0);
          setFaceHint(hintForReason(r));
          return;
        }
        consecutive += 1;
        setAlignProgress(consecutive);
        setFaceHint(hintForReason("ok"));
        if (consecutive >= CONSECUTIVE_OK) {
          cancelled = true;
          clearInterval(intervalId);
          void completeRegistration();
        }
      } catch (e: unknown) {
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
        if (isDetectorUnavailableError(e)) {
          triggerFallback();
          return;
        }
        consecutive = 0;
        setAlignProgress(0);
        setFaceHint("Seguimos intentando. Mejorá la luz o esperá un momento.");
      } finally {
        busy = false;
      }
    };

    intervalId = setInterval(tick, 550);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [facePhase, verifyMode, completeRegistration, runFallbackVerification]);

  const handleBack = () => {
    if (step === "face") {
      if (registering) return;
      setStep("form");
      setFacePhase("preview");
      setVerifyMode("idle");
      setFaceHint("");
      setAlignProgress(0);
      setError("");
      return;
    }
    router.back();
  };

  if (step === "face") {
    if (!permission) {
      return (
        <View style={[s.faceRoot, { paddingTop: insets.top }]}>
          <ActivityIndicator color="#1FA774" size="large" />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <LinearGradient colors={["#0B3D2E", "#145A3E", "#1FA774"]} style={s.faceRoot}>
          <View style={[s.permBox, { marginTop: insets.top + 40 }]}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={s.permTitle}>Permiso de cámara</Text>
            <Text style={s.permText}>
              Necesitamos la cámara frontal para validar tu identidad, como en otras billeteras
              virtuales.
            </Text>
            <Pressable style={s.permBtn} onPress={() => requestPermission()}>
              <Text style={s.permBtnText}>Permitir cámara</Text>
            </Pressable>
            <Pressable onPress={handleBack}>
              <Text style={s.linkBack}>Volver</Text>
            </Pressable>
          </View>
        </LinearGradient>
      );
    }

    return (
      <View style={s.faceRoot}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mirror
          mode="picture"
        />

        {/* Oscurece bordes; el centro queda transparente para ver el rostro */}
        <View style={[s.faceOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
          <View style={s.overlayTop} />
          <View style={s.overlayMid}>
            <View style={s.overlaySide} />
            <View style={s.ovalCutout}>
              <View
                style={[
                  s.ovalBorder,
                  alignProgress >= CONSECUTIVE_OK && s.ovalBorderSuccess,
                  alignProgress > 0 && alignProgress < CONSECUTIVE_OK && s.ovalBorderProgress,
                ]}
              />
            </View>
            <View style={s.overlaySide} />
          </View>
          <View style={s.overlayBottom}>
            <Pressable
              onPress={handleBack}
              style={[s.iconBtn, { top: insets.top + 8 }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>

            <Text style={s.faceTitle}>Validación de identidad</Text>
            <Text style={s.faceHint}>
              Centrá tu rostro en el óvalo con buena luz frontal. No avanzamos hasta reconocer bien
              tu rostro varias veces seguidas; las capturas se analizan en el dispositivo y se borran
              del caché.
            </Text>

            {facePhase === "preview" && (
              <Pressable style={s.facePrimary} onPress={startFaceVerification}>
                <Ionicons name="scan-outline" size={22} color="#0B3D2E" />
                <Text style={s.facePrimaryText}> Iniciar verificación biométrica</Text>
              </Pressable>
            )}

            {facePhase === "scanning" && (
              <View style={s.scanningBox}>
                <ActivityIndicator color="#1FA774" size="large" />
                <Text style={s.scanningText}>
                  {verifyMode === "fallback"
                    ? "Finalizando verificación…"
                    : "Esperando reconocimiento facial…"}
                </Text>
                {verifyMode === "native" ? (
                  <Text style={s.scanningSub}>
                    {alignProgress === 0
                      ? `Seguimos hasta ver tu rostro bien en el marco (${CONSECUTIVE_OK} lecturas seguidas).`
                      : `Lectura estable: ${alignProgress} / ${CONSECUTIVE_OK} — mantené la posición.`}
                  </Text>
                ) : null}
                {faceHint ? <Text style={s.hintBanner}>{faceHint}</Text> : null}
              </View>
            )}

            {facePhase === "done" && (
              <View style={s.scanningBox}>
                <Ionicons name="checkmark-circle" size={56} color="#1FA774" />
                <Text style={s.scanningText}>Rostro verificado</Text>
                {registering ? (
                  <>
                    <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
                    <Text style={[s.scanningSub, { marginTop: 10 }]}>Creando tu cuenta…</Text>
                  </>
                ) : (
                  <Text style={s.scanningSub}>Preparando registro…</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0B3D2E", "#145A3E", "#1FA774"]} style={s.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 12, paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={handleBack} style={s.backRow} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={s.backText}>Volver al inicio</Text>
          </Pressable>

          <View style={s.header}>
            <View style={s.logoCircle}>
              <Ionicons name="person-add-outline" size={36} color="#0B3D2E" />
            </View>
            <Text style={s.brand}>Crear cuenta</Text>
            <Text style={s.subtitle}>Completá tus datos para continuar</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Registro</Text>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Field
              label="Nombre"
              value={form.nombre}
              onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
              icon="person-outline"
              autoCapitalize="words"
            />
            <Field
              label="Apellido"
              value={form.apellido}
              onChangeText={(t) => setForm((f) => ({ ...f, apellido: t }))}
              icon="person-outline"
              autoCapitalize="words"
            />
            <Field
              label="Email"
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="DNI"
              value={form.dni}
              onChangeText={(t) => setForm((f) => ({ ...f, dni: t.replace(/\D/g, "") }))}
              icon="card-outline"
              keyboardType="number-pad"
            />

            <Text style={s.label}>Género</Text>
            <View style={s.genRow}>
              {GENEROS.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => setForm((f) => ({ ...f, genero: g.id }))}
                  style={[s.genChip, form.genero === g.id && s.genChipActive]}
                >
                  <Text style={[s.genChipText, form.genero === g.id && s.genChipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Contraseña (mín. 8 caracteres)"
              value={form.password}
              onChangeText={(t) => setForm((f) => ({ ...f, password: t }))}
              icon="lock-closed-outline"
              secure
            />

            <Pressable
              onPress={goToFace}
              style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
            >
              <Ionicons name="camera-outline" size={20} color="#fff" />
              <Text style={s.buttonText}> Continuar con verificación facial</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  icon,
  keyboardType,
  autoCapitalize,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "words";
  secure?: boolean;
}) {
  const [secureText, setSecureText] = useState(true);
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrapper}>
        <Ionicons name={icon} size={20} color="#999" style={s.inputIcon} />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#bbb"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secure ? secureText : false}
        />
        {secure ? (
          <Pressable onPress={() => setSecureText(!secureText)} hitSlop={8}>
            <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={22} color="#999" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const OVAL_W = 280;
const OVAL_H = 360;

const s = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  backText: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600" },
  header: { alignItems: "center", marginBottom: 20 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brand: { fontSize: 26, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a", marginBottom: 18 },
  inputGroup: { marginBottom: 14 },
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
  input: { flex: 1, fontSize: 15, color: "#1a1a1a", height: "100%" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#D32F2F", fontSize: 13, fontWeight: "500", flex: 1 },
  genRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  genChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  genChipActive: {
    backgroundColor: "rgba(31, 167, 116, 0.15)",
    borderColor: "#1FA774",
  },
  genChipText: { fontSize: 14, color: "#555", fontWeight: "600" },
  genChipTextActive: { color: "#0B3D2E" },
  button: {
    flexDirection: "row",
    backgroundColor: "#1FA774",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 6,
  },
  buttonPressed: { opacity: 0.92 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  faceRoot: { flex: 1, backgroundColor: "#000" },
  faceOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayMid: {
    flexDirection: "row",
    height: OVAL_H,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  ovalCutout: {
    width: OVAL_W,
    height: OVAL_H,
    justifyContent: "center",
    alignItems: "center",
  },
  ovalBorder: {
    width: OVAL_W - 8,
    height: OVAL_H - 8,
    borderRadius: (OVAL_W - 8) / 2,
    borderWidth: 3,
    borderColor: "rgba(31, 167, 116, 0.95)",
    backgroundColor: "transparent",
  },
  ovalBorderProgress: {
    borderColor: "rgba(255, 214, 10, 0.95)",
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  ovalBorderSuccess: {
    borderColor: "rgba(80, 255, 180, 0.98)",
    shadowColor: "#50FFB4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 20,
    paddingBottom: 36,
    alignItems: "center",
  },
  iconBtn: {
    position: "absolute",
    left: 12,
    zIndex: 2,
    padding: 4,
  },
  faceTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 28,
  },
  faceHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
    marginBottom: 16,
  },
  facePrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  facePrimaryText: { color: "#0B3D2E", fontSize: 16, fontWeight: "700" },
  scanningBox: { alignItems: "center", marginTop: 8 },
  scanningText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },
  scanningSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 6,
  },
  hintBanner: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  permBox: { paddingHorizontal: 28, alignItems: "center" },
  permTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  permText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  permBtn: {
    marginTop: 28,
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  permBtnText: { color: "#0B3D2E", fontSize: 16, fontWeight: "700" },
  linkBack: { color: "rgba(255,255,255,0.9)", marginTop: 20, fontSize: 15, fontWeight: "600" },
});
