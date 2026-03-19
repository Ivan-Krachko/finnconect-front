import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PagarQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      // Por ahora mostramos el resultado. Más adelante se integraría con el flujo de pago.
      Alert.alert(
        "QR Escaneado",
        `Datos: ${data.length > 80 ? data.slice(0, 80) + "…" : data}`,
        [
          {
            text: "Pagar",
            onPress: () => {
              // TODO: Integrar con API de pagos
              router.back();
            },
          },
          {
            text: "Escanear otro",
            onPress: () => setScanned(false),
          },
          {
            text: "Cancelar",
            onPress: () => router.back(),
            style: "cancel",
          },
        ]
      );
    },
    [scanned, router]
  );

  if (!permission) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#1FA774" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Pagar con QR</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.permissionBox}>
          <View style={s.permissionIcon}>
            <Ionicons name="camera-outline" size={64} color="#1FA774" />
          </View>
          <Text style={s.permissionTitle}>Acceso a la cámara</Text>
          <Text style={s.permissionText}>
            Necesitamos acceso a tu cámara para escanear códigos QR y realizar pagos.
          </Text>
          <Pressable style={s.permissionBtn} onPress={requestPermission}>
            <Text style={s.permissionBtnText}>Permitir acceso</Text>
          </Pressable>
          <Pressable style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Pagar con QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        <View style={s.overlay}>
          <View style={s.scanFrame} />
          <Text style={s.scanHint}>Apunta la cámara al código QR</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080E0B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#080E0B",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#1FA774",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  scanHint: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 24,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  permissionBox: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(31,167,116,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  permissionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: "#1FA774",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    fontWeight: "600",
  },
});
