/** Forma mínima compatible con la salida de ML Kit / expo-face-detector */
export type DetectedFace = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

export type FaceAlignReason =
  | "ok"
  | "no_face"
  | "multiple"
  | "too_far"
  | "too_close"
  | "off_center";

/**
 * El óvalo en pantalla se aproxima en coordenadas normalizadas de la foto (0–1).
 * Valores algo amplios compensan diferencias de ratio entre preview y captura.
 */
const ELLIPSE_CX = 0.5;
/** El rostro suele quedar en el tercio superior-medio de la foto */
const ELLIPSE_CY = 0.42;
/** Más tolerancia: preview vs foto (ratio / recorte) y cámara frontal */
const ELLIPSE_RX = 0.32;
const ELLIPSE_RY = 0.38;

const MIN_FACE_WIDTH = 0.07;
const MAX_FACE_WIDTH = 0.62;

export function pickLargestFace(faces: DetectedFace[]): DetectedFace | null {
  if (faces.length === 0) return null;
  return faces.reduce((best, f) => {
    const ab = best.bounds.size.width * best.bounds.size.height;
    const af = f.bounds.size.width * f.bounds.size.height;
    return af > ab ? f : best;
  });
}

/**
 * Devuelve si el rostro está razonablemente centrado en el "óvalo" y con tamaño adecuado.
 */
export function evaluateFaceInOval(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): FaceAlignReason {
  const { origin, size } = face.bounds;
  const wNorm = size.width / imageWidth;

  if (wNorm < MIN_FACE_WIDTH) return "too_far";
  if (wNorm > MAX_FACE_WIDTH) return "too_close";

  const cx = (origin.x + size.width / 2) / imageWidth;
  const cy = (origin.y + size.height / 2) / imageHeight;

  const inEllipse = (nx: number, ny: number) => {
    const dx = (nx - ELLIPSE_CX) / ELLIPSE_RX;
    const dy = (ny - ELLIPSE_CY) / ELLIPSE_RY;
    return dx * dx + dy * dy <= 1;
  };

  // Cámara frontal: a veces la foto viene espejada respecto al preview; aceptamos cualquiera de las dos.
  if (!inEllipse(cx, cy) && !inEllipse(1 - cx, cy)) {
    return "off_center";
  }

  return "ok";
}

export function hintForReason(r: FaceAlignReason): string {
  switch (r) {
    case "ok":
      return "Perfecto, mantené un segundo más así…";
    case "no_face":
      return "Seguimos buscando tu rostro… Mirá de frente a la cámara.";
    case "multiple":
      return "Solo debe verse una persona; seguimos esperando el encuadre correcto.";
    case "too_far":
      return "Acercate un poco más; seguimos intentando.";
    case "too_close":
      return "Alejate un poco; seguimos hasta que entre bien en el marco.";
    case "off_center":
      return "Centrá el rostro en el óvalo; seguimos hasta alinearlo.";
    default:
      return "Ajustá la posición; seguimos intentando.";
  }
}
