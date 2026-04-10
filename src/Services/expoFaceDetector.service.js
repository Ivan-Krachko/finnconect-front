/**
 * Detección facial: primero **expo-face-detector** (ML Kit) en dev build;
 * si no hay módulo nativo (p. ej. Expo Go), **TensorFlow.js + BlazeFace** en JS.
 *
 * Importante: no hacer `require("expo-face-detector")` si el nativo no existe: ese paquete
 * ejecuta `requireNativeModule('ExpoFaceDetector')` al cargar y lanza (Expo Go lo quitó).
 */
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import { detectFacesFromImageUriWithTfjs } from "./tfjsBlazefaceFaceDetector.service";

export { ensureTfjsFaceDetectorReady, detectFacesFromImageUriWithTfjs } from "./tfjsBlazefaceFaceDetector.service";

export function canUseNativeFaceDetector() {
  if (Platform.OS === "web") return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  if (Constants.appOwnership === "expo") return false;
  return true;
}

let _faceDetectorModule;
let _faceDetectorTried = false;

/**
 * Carga única del módulo JS `expo-face-detector` solo si el nativo `ExpoFaceDetector` está registrado.
 */
export function requireExpoFaceDetector() {
  if (_faceDetectorTried) return _faceDetectorModule;
  _faceDetectorTried = true;
  const native = requireOptionalNativeModule("ExpoFaceDetector");
  if (!native) {
    _faceDetectorModule = null;
    return null;
  }
  try {
    _faceDetectorModule = require("expo-face-detector");
  } catch {
    _faceDetectorModule = null;
  }
  return _faceDetectorModule;
}

/**
 * @param {string} uri file:// de la imagen (p. ej. salida de takePictureAsync)
 * @param {import('expo-face-detector').DetectionOptions} [options]
 * @returns {Promise<import('expo-face-detector').DetectionResult | null>}
 */
export async function detectFacesFromImageUri(uri, options) {
  if (canUseNativeFaceDetector()) {
    const FaceDetector = requireExpoFaceDetector();
    if (FaceDetector) {
      try {
        return await FaceDetector.detectFacesAsync(uri, {
          mode: FaceDetector.FaceDetectorMode.accurate,
          ...options,
        });
      } catch {
        /* intentar TF.js */
      }
    }
  }
  return detectFacesFromImageUriWithTfjs(uri);
}
