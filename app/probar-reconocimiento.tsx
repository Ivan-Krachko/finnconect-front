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
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FaceCameraMask } from "../src/components/FaceCameraMask";
import { FACE_OVAL_H, FACE_OVAL_W, FACE_PRIMARY, FACE_UI_SURFACE } from "../src/components/faceScanConstants";
import {
  detectFacesFromImageUri,
  ensureTfjsFaceDetectorReady,
  requireExpoFaceDetector,
} from "../src/Services/expoFaceDetector.service";
import type { FaceGuide } from "../src/utils/faceInOval";
import { getFaceGuide, ovalVisualFromGuide } from "../src/utils/faceInOval";

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
          title: "Encuadre",
          subtitle: "Ubicá tu cara en el óvalo y tocá continuar.",
        });
        return;
      }
      busy = true;
      let uri: string | null = null;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.78,
          skipProcessing: false,
          shutterSound: false,
        });
        uri = photo.uri;
        const detection = await detectFacesFromImageUri(uri);
        if (!detection) {
          setFaceGuide({
            ready: false,
            rostro: "none",
            distancia: "pending",
            centro: "pending",
            title: "Encuadre",
            subtitle: "Ubicá tu cara en el óvalo y tocá continuar.",
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
          subtitle: "Tocá Continuar para finalizar.",
        });
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
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
          title: "Encuadre",
          subtitle: "Ubicá tu cara en el óvalo y tocá continuar.",
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

  const guidanceLine =
    verifyMode === "fallback"
      ? faceHint || "No hay detección en este entorno."
      : facePhase === "preview" || verifyMode === "idle"
        ? "Ubicá tu cara en el óvalo y tocá continuar"
        : faceGuide
          ? faceGuide.subtitle.trim() || faceGuide.title
          : "Ubicá tu cara en el óvalo y tocá continuar";

  const canTapContinue =
    verifyMode === "fallback"
      ? true
      : Boolean(faceGuide?.ready && facePhase === "scanning");

  const topInsetPad = insets.top + (Platform.OS === "ios" ? 12 : 10);

  return (
    <View style={s.faceRoot}>
      <View style={s.faceChrome} pointerEvents="box-none">
        {facePhase === "done" ? (
          <>
            <View style={[s.topBar, { paddingTop: topInsetPad }]}>
              <View style={s.topBarRow}>
                <Pressable onPress={handleBack} style={s.topBarSide} hitSlop={14}>
                  <Ionicons name="chevron-back" size={24} color="#6B7280" />
                </Pressable>
                <Text style={s.topTitle}>Listo. No se guardó ningún dato.</Text>
                <View style={s.topBarSide} />
              </View>
            </View>
            <View style={[s.fillLight, { paddingBottom: insets.bottom + 8 }]} />
            <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
              <Pressable style={s.continueBtnOutline} onPress={resetPractice}>
                <Text style={s.continueBtnOutlineText}>Probar de nuevo</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={[s.topBar, { paddingTop: topInsetPad }]}>
              <View style={s.topBarRow}>
                <Pressable onPress={handleBack} style={s.topBarSide} hitSlop={14}>
                  <Ionicons name="chevron-back" size={24} color="#6B7280" />
                </Pressable>
                <Text style={s.topTitle}>{guidanceLine}</Text>
                <View style={s.topBarSide} />
              </View>
            </View>
            <View style={s.maskArea}>
              <FaceCameraMask
                ovalW={FACE_OVAL_W}
                ovalH={FACE_OVAL_H}
                camera={
                  <CameraView
                    ref={cameraRef}
                    style={{ width: FACE_OVAL_W, height: FACE_OVAL_H }}
                    facing="front"
                    mirror
                    mode="picture"
                    onCameraReady={() => setCameraReady(true)}
                  />
                }
                ovalBorder={
                  <View
                    style={[
                      s.ovalBorder,
                      ovalVisual === "neutral" && s.ovalBorderNeutral,
                      ovalVisual === "warn" && s.ovalBorderWarn,
                      ovalVisual === "bad" && s.ovalBorderBad,
                      ovalVisual === "success" && s.ovalBorderSuccess,
                    ]}
                  />
                }
              />
            </View>
            <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
              <Pressable
                style={[s.continueBtn, !canTapContinue && s.continueBtnDisabled]}
                disabled={!canTapContinue}
                onPress={() => {
                  if (verifyMode === "fallback") {
                    handleBack();
                  } else {
                    void completePracticeSuccess();
                  }
                }}
              >
                <Text style={s.continueBtnText}>
                  {verifyMode === "fallback" ? "Volver al inicio" : "Continuar"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  faceRoot: { flex: 1, backgroundColor: FACE_UI_SURFACE },
  faceChrome: { flex: 1 },
  topBar: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: FACE_UI_SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  topBarSide: { width: 44, alignItems: "flex-start", justifyContent: "center" },
  topTitle: {
    flex: 1,
    textAlign: "center",
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  maskArea: { flex: 1, minHeight: 0 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: FACE_UI_SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  continueBtn: {
    backgroundColor: FACE_PRIMARY,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: { opacity: 0.45 },
  continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  continueBtnOutline: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(31,167,116,0.45)",
    backgroundColor: FACE_UI_SURFACE,
  },
  continueBtnOutlineText: { color: FACE_PRIMARY, fontSize: 16, fontWeight: "700" },
  fillLight: { flex: 1, backgroundColor: FACE_UI_SURFACE },
  ovalBorder: {
    width: FACE_OVAL_W - 8,
    height: FACE_OVAL_H - 8,
    borderRadius: (FACE_OVAL_W - 8) / 2,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  ovalBorderNeutral: {
    borderColor: FACE_PRIMARY,
    shadowColor: FACE_PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  ovalBorderWarn: {
    borderColor: "rgba(255, 214, 10, 0.98)",
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  ovalBorderBad: {
    borderColor: "rgba(255, 214, 10, 0.95)",
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  ovalBorderSuccess: {
    borderColor: "rgba(80, 255, 180, 0.98)",
    shadowColor: "#50FFB4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
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
