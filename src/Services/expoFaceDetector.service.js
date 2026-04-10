/**
 * Detección facial con **expo-face-detector** (Google ML Kit en iOS/Android).
 * No usar import estático: en Expo Go el nativo `ExpoFaceDetector` no existe y rompe el bundle.
 *
 * En builds nativos (`npx expo run:ios|android` o EAS): `detectFacesFromImageUri` funciona.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

export function canUseNativeFaceDetector() {
  if (Platform.OS === "web") return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  if (Constants.appOwnership === "expo") return false;
  return true;
}

let _faceDetectorModule;
let _faceDetectorTried = false;

/** Carga única de `expo-face-detector` (require perezoso). */
export function requireExpoFaceDetector() {
  if (_faceDetectorTried) return _faceDetectorModule;
  _faceDetectorTried = true;
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
 *          `null` si el módulo no está disponible
 */
export async function detectFacesFromImageUri(uri, options) {
  if (!canUseNativeFaceDetector()) return null;
  const FaceDetector = requireExpoFaceDetector();
  if (!FaceDetector) return null;
  return FaceDetector.detectFacesAsync(uri, {
    mode: FaceDetector.FaceDetectorMode.accurate,
    ...options,
  });
}
