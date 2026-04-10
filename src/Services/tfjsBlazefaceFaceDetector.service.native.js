/**
 * TensorFlow.js + adaptador oficial React Native (@tensorflow/tfjs-react-native).
 * GPU vía expo-gl (backend registrado como `rn-webgl`). BlazeFace para cajas faciales.
 *
 * Intervalo de detección (~550ms) sigue controlado en registro / probar-reconocimiento.
 */
import "./tfjsRnPolyfill";
import * as tf from "@tensorflow/tfjs";
import { decodeJpeg, fetch as tfFetch } from "@tensorflow/tfjs-react-native";
import * as blazeface from "@tensorflow-models/blazeface";

let _model = null;
let _initPromise = null;

export async function ensureTfjsFaceDetectorReady() {
  if (_model) return;
  if (_initPromise) {
    await _initPromise;
    return;
  }
  _initPromise = loadModel();
  await _initPromise;
}

async function loadModel() {
  await tf.ready();

  let ok = await tf.setBackend("rn-webgl");
  if (!ok) {
    ok = await tf.setBackend("cpu");
    if (!ok) {
      throw new Error(
        `TensorFlow.js: no hay backend rn-webgl ni cpu (actual: ${tf.getBackend() ?? "ninguno"})`
      );
    }
  }

  _model = await blazeface.load({
    maxFaces: 5,
    // Más bajo = más sensibilidad (rostros chicos / poca luz); BlazeFace default es 0.75
    scoreThreshold: 0.32,
    iouThreshold: 0.35,
    // El grafo de TF Hub es fijo [128, 128, 3]
    inputWidth: 128,
    inputHeight: 128,
  });
}

/**
 * JPEG file:// o http(s) → tensor 3D (decodeJpeg del adaptador RN + fetch con arrayBuffer).
 */
async function jpegUriToTensor3d(uri) {
  const response = await tfFetch(uri, {}, { isBinary: true });
  const imageData = new Uint8Array(await response.arrayBuffer());
  return decodeJpeg(imageData, 3);
}

function blazefaceToExpoFaces(predictions) {
  return predictions.map((p) => {
    const [x0, y0] = p.topLeft;
    const [x1, y1] = p.bottomRight;
    return {
      bounds: {
        origin: { x: x0, y: y0 },
        size: { width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) },
      },
    };
  });
}

export async function detectFacesFromImageUriWithTfjs(uri) {
  await ensureTfjsFaceDetectorReady();
  if (!_model) {
    throw new Error("TensorFlow.js: modelo BlazeFace no inicializado");
  }

  let imageTensor = null;
  try {
    imageTensor = await jpegUriToTensor3d(uri);
    const iw = imageTensor.shape[1];
    const ih = imageTensor.shape[0];
    // Primero sin flip de cajas; si no hay detecciones (p. ej. orientación del JPEG), reintentar con flip.
    let predictions = await _model.estimateFaces(imageTensor, false, false);
    if (predictions.length === 0) {
      predictions = await _model.estimateFaces(imageTensor, false, true);
    }
    const faces = blazefaceToExpoFaces(predictions);
    return {
      faces,
      image: { width: iw, height: ih },
    };
  } finally {
    if (imageTensor) imageTensor.dispose();
  }
}
