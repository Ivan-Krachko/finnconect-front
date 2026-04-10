import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  detectFacesFromImageUri,
  ensureTfjsFaceDetectorReady,
  requireExpoFaceDetector,
} from "../src/Services/expoFaceDetector.service";
import type { FaceGuide } from "../src/utils/faceInOval";
import { getFaceGuide, ovalVisualFromGuide } from "../src/utils/faceInOval";

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
  const [faceGuide, setFaceGuide] = useState<FaceGuide | null>(null);
  const [alignProgress, setAlignProgress] = useState(0);
  const [verifyMode, setVerifyMode] = useState<"idle" | "native" | "fallback">("idle");

  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const registrationStartedRef = useRef(false);
  /** Sin esto, las primeras capturas pueden salir vacías / sin foco (docs: esperar onCameraReady). */
  const [cameraReady, setCameraReady] = useState(false);

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
    setCameraReady(false);
    setVerifyMode("idle");
    setAlignProgress(0);
    setFaceHint("");
    setFaceGuide(null);
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

  /** Sin ML no podemos saber si el rostro está en el óvalo: no se auto-completa el registro. */
  const runFallbackVerification = useCallback((customHint?: string) => {
    setFaceHint(
      customHint ??
        "Aquí no hay detector facial disponible (p. ej. web o falló TensorFlow.js). " +
          "No podemos comprobar que tu cara esté en el óvalo. " +
          "Podés usar un build nativo (`npx expo run:ios` / `run:android`) con ML Kit. " +
          "Solo en desarrollo podés continuar con el botón de abajo."
    );
  }, []);

  const startFaceVerification = useCallback(() => {
    registrationStartedRef.current = false;
    setAlignProgress(0);
    setFacePhase("scanning");
    if (Platform.OS === "web") {
      setVerifyMode("fallback");
      runFallbackVerification();
      return;
    }
    setFaceHint("");
    setVerifyMode("native");
  }, [runFallbackVerification]);

  /** Sin segundo botón: al tener permiso de cámara, arranca la biometría enseguida */
  useLayoutEffect(() => {
    if (step !== "face" || !permission?.granted) return;
    if (facePhase !== "preview") return;
    startFaceVerification();
  }, [step, permission?.granted, facePhase, startFaceVerification]);

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
    if (!cameraReady) return;

    let cancelled = false;
    let busy = false;
    let fallbackTriggered = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const triggerFallback = (hint?: string) => {
      if (fallbackTriggered || cancelled) return;
      fallbackTriggered = true;
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      setVerifyMode("fallback");
      runFallbackVerification(hint);
    };

    const tick = async () => {
      if (cancelled || busy) return;
      if (!cameraRef.current) {
        setFaceGuide({
          ready: false,
          rostro: "none",
          distancia: "pending",
          centro: "pending",
          title: "Iniciando cámara…",
          subtitle: "Un momento.",
        });
        return;
      }
      busy = true;
      let uri: string | null = null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.78,
          // false: respeta orientación EXIF; evita bounds de rostro descalados
          skipProcessing: false,
        });
        uri = photo.uri;
        const detection = await detectFacesFromImageUri(uri);
        if (!detection) {
          setFaceGuide({
            ready: false,
            rostro: "none",
            distancia: "pending",
            centro: "pending",
            title: "Sin análisis",
            subtitle: "Seguimos intentando conectar con el detector…",
          });
          return;
        }
        const { faces, image } = detection;
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        uri = null;

        const iw = image.width;
        const ih = image.height;

        const guide = getFaceGuide(faces, iw, ih);
        setFaceGuide(guide);
        if (!guide.ready) {
          setAlignProgress(0);
          return;
        }

        setAlignProgress(1);
        setFaceGuide({
          ...guide,
          title: "Listo",
          subtitle: "Registrando…",
        });
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
        void completeRegistration();
      } catch (e: unknown) {
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
        if (isDetectorUnavailableError(e)) {
          triggerFallback();
          return;
        }
        setAlignProgress(0);
        setFaceGuide({
          ready: false,
          rostro: "none",
          distancia: "pending",
          centro: "pending",
          title: "Error al capturar",
          subtitle: "Seguimos intentando. Mejorá la luz o esperá un momento.",
        });
      } finally {
        busy = false;
      }
    };

    const FaceDetector = requireExpoFaceDetector();
    const setup = async () => {
      if (!FaceDetector) {
        setFaceGuide({
          ready: false,
          rostro: "none",
          distancia: "pending",
          centro: "pending",
          title: "Cargando modelo de IA…",
          subtitle: "TensorFlow.js + BlazeFace (la primera vez puede tardar un poco).",
        });
        await ensureTfjsFaceDetectorReady();
        if (cancelled) return;
      }
      if (cancelled) return;
      intervalId = setInterval(tick, 550);
      void tick();
    };

    void setup();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [facePhase, verifyMode, cameraReady, completeRegistration, runFallbackVerification]);

  const handleBack = () => {
    if (step === "face") {
      if (registering) return;
      setStep("form");
      setFacePhase("preview");
      setVerifyMode("idle");
      setFaceHint("");
      setFaceGuide(null);
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

    const ovalVisual = ovalVisualFromGuide(faceGuide, alignProgress);

    return (
      <View style={s.faceRoot}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mirror
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
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
                  ovalVisual === "neutral" && s.ovalBorderNeutral,
                  ovalVisual === "warn" && s.ovalBorderWarn,
                  ovalVisual === "bad" && s.ovalBorderBad,
                  ovalVisual === "success" && s.ovalBorderSuccess,
                ]}
              />
            </View>
            <View style={s.overlaySide} />
          </View>
          <View style={[s.overlayBottom, { paddingBottom: 0 }]}>
            <ScrollView
              style={s.overlayBottomScroll}
              contentContainerStyle={[
                s.overlayBottomContent,
                { paddingBottom: Math.max(insets.bottom, 12) + 8 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces
            >
              <Pressable
                onPress={handleBack}
                style={s.backRowFace}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </Pressable>

              <Text style={s.faceTitle}>Validación de identidad</Text>
              <Text style={s.faceHint}>
                El óvalo cambia de color con el encuadre. Deslizá hacia abajo si no ves el panel.
              </Text>

              {(facePhase === "preview" || facePhase === "scanning") && (
                <View style={s.scanningBox}>
                {verifyMode === "fallback" ? (
                  <>
                    <Ionicons name="information-circle-outline" size={44} color="rgba(255,255,255,0.95)" />
                    <Text style={s.scanningText}>Sin verificación facial</Text>
                    <Text style={s.scanningSub}>
                      No se pudo usar ni ML Kit ni TensorFlow.js; no validamos el óvalo.
                    </Text>
                    {faceHint ? <Text style={s.hintBanner}>{faceHint}</Text> : null}
                    <Pressable
                      style={s.fallbackBtn}
                      onPress={() => void completeRegistration()}
                      disabled={registering}
                    >
                      <Text style={s.fallbackBtnText}>Continuar registro (solo desarrollo)</Text>
                    </Pressable>
                  </>
                ) : facePhase === "preview" || verifyMode === "idle" ? (
                  <>
                    <ActivityIndicator color="#1FA774" size="large" />
                    <Text style={s.scanningText}>Preparando verificación…</Text>
                  </>
                ) : (
                  <View style={s.guideCard}>
                    <View style={s.chipRow}>
                      <View
                        style={[
                          s.chip,
                          faceGuide?.rostro === "ok"
                            ? s.chipOk
                            : faceGuide?.rostro === "none"
                              ? s.chipBad
                              : faceGuide?.rostro === "multiple"
                                ? s.chipWarn
                                : s.chipIdle,
                        ]}
                      >
                        <Text style={s.chipText}>Rostro</Text>
                      </View>
                      <View
                        style={[
                          s.chip,
                          faceGuide?.distancia === "ok"
                            ? s.chipOk
                            : faceGuide?.distancia === "too_far" || faceGuide?.distancia === "too_close"
                              ? s.chipWarn
                              : s.chipIdle,
                        ]}
                      >
                        <Text style={s.chipText}>Distancia</Text>
                      </View>
                      <View
                        style={[
                          s.chip,
                          faceGuide?.centro === "ok"
                            ? s.chipOk
                            : faceGuide?.centro === "off"
                              ? s.chipWarn
                              : s.chipIdle,
                        ]}
                      >
                        <Text style={s.chipText}>Centro</Text>
                      </View>
                    </View>

                    {faceGuide?.nudge && (faceGuide.nudge.h || faceGuide.nudge.v) ? (
                      <View style={s.nudgeRow}>
                        {faceGuide.nudge.h === "left" ? (
                          <Ionicons name="arrow-back" size={36} color="#FFD60A" />
                        ) : null}
                        {faceGuide.nudge.h === "right" ? (
                          <Ionicons name="arrow-forward" size={36} color="#FFD60A" />
                        ) : null}
                        {faceGuide.nudge.v === "up" ? (
                          <Ionicons name="arrow-up" size={36} color="#FFD60A" />
                        ) : null}
                        {faceGuide.nudge.v === "down" ? (
                          <Ionicons name="arrow-down" size={36} color="#FFD60A" />
                        ) : null}
                      </View>
                    ) : null}

                    {faceGuide ? (
                      <>
                        <Text style={s.guideTitle}>{faceGuide.title}</Text>
                        <Text style={s.guideSubtitle}>{faceGuide.subtitle}</Text>
                      </>
                    ) : (
                      <>
                        <ActivityIndicator color="#1FA774" style={{ marginTop: 8 }} />
                        <Text style={s.guideSubtitle}>Analizando imagen…</Text>
                      </>
                    )}
                  </View>
                )}
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
            </ScrollView>
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
    minHeight: 0,
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
    backgroundColor: "transparent",
  },
  ovalBorderNeutral: {
    borderColor: "rgba(31, 167, 116, 0.95)",
    shadowColor: "#1FA774",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  ovalBorderWarn: {
    borderColor: "rgba(255, 214, 10, 0.98)",
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  ovalBorderBad: {
    borderColor: "rgba(255, 100, 100, 0.98)",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  ovalBorderSuccess: {
    borderColor: "rgba(80, 255, 180, 0.98)",
    shadowColor: "#50FFB4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
  },
  overlayBottom: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayBottomScroll: {
    flex: 1,
    width: "100%",
  },
  overlayBottomContent: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  backRowFace: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    marginBottom: 4,
  },
  faceTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  faceHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scanningBox: { alignItems: "center", marginTop: 8, width: "100%" },
  guideCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  chipOk: {
    backgroundColor: "rgba(31, 167, 116, 0.35)",
    borderColor: "#1FA774",
  },
  chipWarn: {
    backgroundColor: "rgba(255, 214, 10, 0.22)",
    borderColor: "#FFD60A",
  },
  chipBad: {
    backgroundColor: "rgba(211, 47, 47, 0.28)",
    borderColor: "#FF8A8A",
  },
  chipIdle: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.28)",
  },
  nudgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    minHeight: 40,
  },
  guideTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  guideSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
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
  fallbackBtn: {
    marginTop: 18,
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignSelf: "stretch",
    maxWidth: 340,
  },
  fallbackBtnText: {
    color: "#0B3D2E",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
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
