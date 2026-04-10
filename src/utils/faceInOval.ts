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
/** Centro vertical típico del rostro en la foto */
const ELLIPSE_CY = 0.4;
/** Óvalo alineado al marco en pantalla (balance precisión / usable) */
const ELLIPSE_RX = 0.2;
const ELLIPSE_RY = 0.26;

/** Rostro lo suficientemente grande (cerca) para contar como “en el óvalo” */
const MIN_FACE_WIDTH = 0.09;
const MAX_FACE_WIDTH = 0.52;

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

  // Cámara frontal: la imagen puede venir espejada; el centro “real” en pantalla es cx o 1-cx.
  if (!inEllipse(cx, cy) && !inEllipse(1 - cx, cy)) {
    return "off_center";
  }

  return "ok";
}

export type FaceGuide = {
  /** Listo para completar (dentro del óvalo, distancia ok, una cara) */
  ready: boolean;
  rostro: "none" | "multiple" | "ok";
  distancia: "ok" | "too_far" | "too_close" | "pending";
  centro: "ok" | "off" | "pending";
  title: string;
  subtitle: string;
  /** Flechas a mostrar (desde la perspectiva del usuario frente al teléfono) */
  nudge?: { h?: "left" | "right"; v?: "up" | "down" };
};

function inEllipseNorm(nx: number, ny: number): boolean {
  const dx = (nx - ELLIPSE_CX) / ELLIPSE_RX;
  const dy = (ny - ELLIPSE_CY) / ELLIPSE_RY;
  return dx * dx + dy * dy <= 1;
}

/**
 * Guía para la UI: qué está bien, qué falta y hacia dónde corregir.
 */
export function getFaceGuide(
  faces: DetectedFace[],
  imageWidth: number,
  imageHeight: number
): FaceGuide {
  if (faces.length === 0) {
    return {
      ready: false,
      rostro: "none",
      distancia: "pending",
      centro: "pending",
      title: "Sin rostro detectado",
      subtitle: "Enmarcate de frente, con luz frontal. Evitá contraluz.",
    };
  }
  if (faces.length > 1) {
    return {
      ready: false,
      rostro: "multiple",
      distancia: "pending",
      centro: "pending",
      title: "Varias personas",
      subtitle: "Solo tenés que aparecer vos en la cámara.",
    };
  }

  const face = pickLargestFace(faces)!;
  const { origin, size } = face.bounds;
  const wNorm = size.width / imageWidth;
  const cx = (origin.x + size.width / 2) / imageWidth;
  const cy = (origin.y + size.height / 2) / imageHeight;

  if (wNorm < MIN_FACE_WIDTH) {
    return {
      ready: false,
      rostro: "ok",
      distancia: "too_far",
      centro: "pending",
      title: "Acercate",
      subtitle: "El rostro se ve chico. Acerá un poco el teléfono.",
    };
  }
  if (wNorm > MAX_FACE_WIDTH) {
    return {
      ready: false,
      rostro: "ok",
      distancia: "too_close",
      centro: "pending",
      title: "Alejate",
      subtitle: "Alejá el teléfono para que entre bien la cara en el óvalo.",
    };
  }

  const inside = inEllipseNorm(cx, cy) || inEllipseNorm(1 - cx, cy);
  if (inside) {
    return {
      ready: true,
      rostro: "ok",
      distancia: "ok",
      centro: "ok",
      title: "Encuadre correcto",
      subtitle: "Mantené un segundo…",
    };
  }

  const dUn = Math.hypot(
    (cx - ELLIPSE_CX) / ELLIPSE_RX,
    (cy - ELLIPSE_CY) / ELLIPSE_RY
  );
  const dMir = Math.hypot(
    (1 - cx - ELLIPSE_CX) / ELLIPSE_RX,
    (cy - ELLIPSE_CY) / ELLIPSE_RY
  );
  const tcx = dMir < dUn ? 1 - cx : cx;
  const dx = tcx - ELLIPSE_CX;
  const dy = cy - ELLIPSE_CY;
  const step = 0.02;

  let nudge: FaceGuide["nudge"] = {};
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx < -step) nudge = { ...nudge, h: "right" };
    else if (dx > step) nudge = { ...nudge, h: "left" };
  }
  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy < -step) nudge = { ...nudge, v: "down" };
    else if (dy > step) nudge = { ...nudge, v: "up" };
  }
  if (!nudge.h && !nudge.v) {
    nudge = { h: dx < 0 ? "right" : "left" };
  }

  const parts: string[] = [];
  if (nudge.h === "left") parts.push("desplazá un poco la cara a tu izquierda");
  if (nudge.h === "right") parts.push("desplazá un poco la cara a tu derecha");
  if (nudge.v === "up") parts.push("subí un poco el teléfono o bajá la barbilla");
  if (nudge.v === "down") parts.push("bajá un poco el teléfono o levantá la mirada");

  return {
    ready: false,
    rostro: "ok",
    distancia: "ok",
    centro: "off",
    title: "Ajustá el centro",
    subtitle: parts.length ? parts.join(". ") + "." : "Centrá el rostro en el óvalo verde.",
    nudge,
  };
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

/** Color del borde del óvalo según la guía de encuadre */
export type OvalVisual = "neutral" | "warn" | "bad" | "success";

export function ovalVisualFromGuide(g: FaceGuide | null, alignProgress: number): OvalVisual {
  if (alignProgress >= 1) return "success";
  if (!g) return "neutral";
  if (g.rostro === "none" || g.rostro === "multiple") return "bad";
  if (g.ready) return "success";
  if (g.distancia === "too_far" || g.distancia === "too_close") return "warn";
  if (g.centro === "off") return "warn";
  return "neutral";
}
