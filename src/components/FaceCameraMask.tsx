import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { FACE_OVAL_H, FACE_OVAL_W, FACE_UI_SURFACE } from "./faceScanConstants";

type Props = {
  /** Vista de cámara (solo se ve dentro del óvalo; debe medir ovalW×ovalH o llenar el clip). */
  camera: ReactNode;
  /** Anillo / estado visual encima del óvalo (no recorta la imagen). */
  ovalBorder: ReactNode;
  ovalW?: number;
  ovalH?: number;
};

/**
 * Fondo blanco alrededor y vista de cámara recortada en forma de cápsula (óvalo vertical),
 * no un rectángulo con borde encima.
 */
export function FaceCameraMask({
  camera,
  ovalBorder,
  ovalW = FACE_OVAL_W,
  ovalH = FACE_OVAL_H,
}: Props) {
  const clipRadius = ovalW / 2;
  return (
    <View style={styles.column}>
      <View style={[styles.fill, styles.veil]} />
      <View style={[styles.midRow, { height: ovalH }]}>
        <View style={[styles.side, styles.veil]} />
        <View style={[styles.ovalWrap, { width: ovalW, height: ovalH }]}>
          <View
            style={[
              styles.ovalClip,
              {
                width: ovalW,
                height: ovalH,
                borderRadius: clipRadius,
              },
            ]}
          >
            {camera}
          </View>
          <View style={styles.ovalBorderOverlay} pointerEvents="none">
            {ovalBorder}
          </View>
        </View>
        <View style={[styles.side, styles.veil]} />
      </View>
      <View style={[styles.fill, styles.veil]} />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, minHeight: 0 },
  fill: { flex: 1, minHeight: 0 },
  side: { flex: 1, minHeight: 0 },
  midRow: { flexDirection: "row", alignItems: "stretch" },
  veil: { backgroundColor: FACE_UI_SURFACE },
  ovalWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ovalClip: {
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  ovalBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
