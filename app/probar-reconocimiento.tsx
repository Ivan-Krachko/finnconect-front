import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  detectFacesFromImageUri,
  ensureTfjsFaceDetectorReady,
  requireExpoFaceDetector,
} from "../src/Services/expoFaceDetector.service";
import type { FaceGuide } from "../src/utils/faceInOval";
import { getFaceGuide, ovalVisualFromGuide } from "../src/utils/faceInOval";

const OVAL_W = 280;
const OVAL_H = 360;

export default function ProbarReconocimientoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [facePhase, setFacePhase] = useState<"preview" | "scanning" | "done">("preview");
  const [faceHint, setFaceHint] = useState("");
  const [faceGuide, setFaceGuide] = useState<FaceGuide | null>(null);
  const [alignProgress, setAlignProgress] = useState(0);
  const [verifyMode, setVerifyMode] = useState<"idle" | "native" | "fallback">("idle");

  const cameraRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const completePracticeSuccess = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
    setFacePhase("done");
  }, []);

  const runFallbackVerification = useCallback((customHint?: string) => {
    setFaceHint(
      customHint ??
        "No hay detección disponible (web o no se pudo cargar TensorFlow.js). " +
          "Podés probar con un build nativo: `npx expo run:ios` o `run:android`."
    );
  }, []);

  const startFaceVerification = useCallback(() => {
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

  const resetPractice = useCallback(() => {
    setFacePhase("preview");
    setVerifyMode("idle");
    setFaceHint("");
    setFaceGuide(null);
    setAlignProgress(0);
  }, []);

  useLayoutEffect(() => {
    if (!permission?.granted) return;
    if (facePhase !== "preview") return;
    startFaceVerification();
  }, [permission?.granted, facePhase, startFaceVerification]);

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
          subtitle: "Reconocimiento correcto",
        });
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
        void completePracticeSuccess();
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
  }, [facePhase, verifyMode, cameraReady, completePracticeSuccess, runFallbackVerification]);

  const handleBack = () => {
    router.back();
  };

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
            Necesitamos la cámara frontal para probar el encuadre. No se envía nada al servidor ni se
            crea una cuenta.
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
            <Pressable onPress={handleBack} style={s.backRowFace} hitSlop={12}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>

            <Text style={s.faceTitle}>Probar reconocimiento facial</Text>
            <Text style={s.faceHint}>
              Solo prueba local: no hay registro ni login. El óvalo refleja el encuadre. Deslizá si
              no ves el panel.
            </Text>

            {facePhase === "preview" || facePhase === "scanning" ? (
              <View style={s.scanningBox}>
                {verifyMode === "fallback" ? (
                  <>
                    <Ionicons name="information-circle-outline" size={44} color="rgba(255,255,255,0.95)" />
                    <Text style={s.scanningText}>Sin detección en este entorno</Text>
                    <Text style={s.scanningSub}>
                      En la web no hay cámara JS completa; si falló TensorFlow.js, revisá conexión o
                      probá un build nativo.
                    </Text>
                    {faceHint ? <Text style={s.hintBanner}>{faceHint}</Text> : null}
                    <Pressable style={s.fallbackBtn} onPress={handleBack}>
                      <Text style={s.fallbackBtnText}>Volver al inicio</Text>
                    </Pressable>
                  </>
                ) : facePhase === "preview" || verifyMode === "idle" ? (
                  <>
                    <ActivityIndicator color="#1FA774" size="large" />
                    <Text style={s.scanningText}>Preparando cámara…</Text>
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
            ) : null}

            {facePhase === "done" && (
              <View style={s.scanningBox}>
                <Ionicons name="checkmark-circle" size={56} color="#1FA774" />
                <Text style={s.scanningText}>Reconocimiento correcto</Text>
                <Text style={s.scanningSub}>
                  Ya podés alejarte de la cámara o volver al inicio. No se guardó ningún dato.
                </Text>
                <Pressable style={s.fallbackBtn} onPress={resetPractice}>
                  <Text style={s.fallbackBtnText}>Probar de nuevo</Text>
                </Pressable>
                <Pressable onPress={handleBack}>
                  <Text style={s.linkBack}>Volver al inicio</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
    textAlign: "center",
    paddingHorizontal: 8,
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
