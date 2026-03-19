import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import { safeBack } from "../src/utils/navigation";
import * as cuentasService from "../src/Services/cuentas.service";
import * as transferenciasService from "../src/Services/transferencias.service";

function parseCobrarQr(data: string): { alias: string; monto: string; moneda: string } | null {
  try {
    if (data.startsWith("finconnectapp://cobrar?")) {
      const params = new URLSearchParams(data.replace("finconnectapp://cobrar?", ""));
      const alias = params.get("alias");
      const monto = params.get("monto");
      const moneda = params.get("moneda") || "ARS";
      if (alias && monto) return { alias, monto, moneda };
    }
    return null;
  } catch {
    return null;
  }
}

function fmtAmount(n: number, moneda: string) {
  if (moneda === "ARS" || moneda === "JPY" || moneda === "BRL") {
    return new Intl.NumberFormat("es-AR").format(Math.round(n));
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CuentaDestino {
  id: number;
  alias: string;
  cvu: string;
  moneda: string;
  usuarioNombre?: string;
  usuarioApellido?: string;
}

interface CuentaOrigen {
  id: number;
  alias: string;
  moneda: string;
  saldo?: string;
}

interface ConfirmacionData {
  parsed: { alias: string; monto: string; moneda: string };
  cuentaDestino: CuentaDestino;
  cuentaOrigen: CuentaOrigen;
}

export default function PagarQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionData | null>(null);
  const [errorScan, setErrorScan] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [transferiendo, setTransferiendo] = useState(false);
  const [saldoVisible, setSaldoVisible] = useState(false);
  const [toastExito, setToastExito] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      setErrorScan(null);

      const parsed = parseCobrarQr(data);
      if (!parsed) {
        setErrorScan("Este código QR no es un cobro de FinConnect.");
        return;
      }

      if (!token) return;
      setCargando(true);
      try {
        const [cuentaDestino, { items: cuentas }] = await Promise.all([
          cuentasService.searchCuenta(token, parsed.alias),
          cuentasService.getCuentas(token),
        ]);
        const cuentaOrigen = (cuentas || []).find(
          (c: { id: number; moneda: string }) =>
            c.moneda === parsed.moneda && c.id !== cuentaDestino.id
        ) as CuentaOrigen | undefined;

        if (!cuentaDestino) {
          setErrorScan("No se encontró la cuenta destino.");
          return;
        }
        if (!cuentaOrigen) {
          const tieneCuentaMismaMoneda = (cuentas || []).some(
            (c: { moneda: string }) => c.moneda === parsed.moneda
          );
          setErrorScan(
            tieneCuentaMismaMoneda
              ? "Para transferir entre tus cuentas necesitás al menos dos cuentas en la misma moneda."
              : `No tenés una cuenta en ${parsed.moneda} para realizar esta transferencia.`
          );
          return;
        }

        setConfirmacion({
          parsed,
          cuentaDestino,
          cuentaOrigen,
        });
      } catch (e: any) {
        setErrorScan(e?.message || "Error al obtener los datos del cobro.");
      } finally {
        setCargando(false);
      }
    },
    [scanned, token]
  );

  const handleConfirmar = useCallback(async () => {
    if (!token || !confirmacion) return;
    setTransferiendo(true);
    try {
      const montoStr = String(confirmacion.parsed.monto).replace(",", ".");
      await transferenciasService.crearTransferencia(
        token,
        confirmacion.cuentaOrigen.id,
        confirmacion.cuentaDestino.id,
        montoStr
      );
      setToastExito(true);
    } catch (e: any) {
      const msg = e?.message || "No se pudo completar la transferencia";
      Alert.alert("Error", msg);
    } finally {
      setTransferiendo(false);
    }
  }, [token, confirmacion, router]);

  const handleEscanearOtro = useCallback(() => {
    setScanned(false);
    setConfirmacion(null);
    setErrorScan(null);
    setSaldoVisible(false);
  }, []);

  useEffect(() => {
    if (!toastExito) return;
    Animated.sequence([
      Animated.spring(toastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastExito(false);
      toastAnim.setValue(0);
      safeBack(router, "/(tabs)/pagos");
    });
  }, [toastExito, router]);

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
          <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
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
          <Pressable style={s.cancelBtn} onPress={() => safeBack(router, "/(tabs)/pagos")}>
            <Text style={s.cancelBtnText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Pantalla de confirmación (después de escanear) - ver antes de transferir
  if (confirmacion) {
    const { parsed, cuentaDestino, cuentaOrigen } = confirmacion;
    const montoNum = parseFloat(parsed.monto) || 0;
    const montoFmt = fmtAmount(montoNum, parsed.moneda);
    const simbolo = parsed.moneda === "ARS" ? "$" : "";
    const destinoNombre = [cuentaDestino.usuarioNombre, cuentaDestino.usuarioApellido]
      .filter(Boolean)
      .join(" ") || cuentaDestino.alias;
    const saldoOrigen = cuentaOrigen.saldo ?? "—";

    const toastTranslateY = toastAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 0],
    });
    const toastOpacity = toastAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 1],
    });

    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Pagar</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={s.confirmContent}>
          <View style={s.confirmResumen}>
            <View style={s.confirmRow}>
              <Text style={s.confirmText}>
                De cuenta en {parsed.moneda} con saldo{" "}
                <Text style={s.confirmValue}>
                  {saldoVisible
                    ? `${parsed.moneda === "ARS" ? "$" : ""}${saldoOrigen}${parsed.moneda !== "ARS" ? ` ${parsed.moneda}` : ""}`
                    : "*****"}
                </Text>
              </Text>
              <Pressable
                onPress={() => setSaldoVisible((v) => !v)}
                hitSlop={12}
                style={s.eyeBtn}
              >
                <Ionicons
                  name={saldoVisible ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="rgba(255,255,255,0.6)"
                />
              </Pressable>
            </View>
            <Text style={s.confirmLabel}>A nombre destinatario</Text>
            <Text style={s.confirmValue}>{destinoNombre}</Text>
            <Text style={s.confirmLabel}>Monto</Text>
            <Text style={s.confirmValue}>
              {simbolo}{montoFmt}{parsed.moneda !== "ARS" ? ` ${parsed.moneda}` : ""}
            </Text>
          </View>
          <Pressable
            style={[s.transferBtn, transferiendo && s.btnDisabled]}
            onPress={handleConfirmar}
            disabled={transferiendo}
          >
            {transferiendo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.transferBtnLabel}>Transferir</Text>
            )}
          </Pressable>

          <Pressable style={s.escaneoOtroBtn} onPress={handleEscanearOtro}>
            <Text style={s.escaneoOtroText}>Escanear otro QR</Text>
          </Pressable>
        </View>

        {toastExito && (
          <Animated.View
            style={[
              s.toastOverlay,
              { top: insets.top + 20, opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
            ]}
          >
            <View style={s.toastCard}>
              <View style={s.toastIconWrap}>
                <Ionicons name="checkmark-circle" size={40} color="#1FA774" />
              </View>
              <Text style={s.toastTitle}>¡Transferencia exitosa!</Text>
              <Text style={s.toastSubtitle}>La operación se realizó correctamente</Text>
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // Pantalla de error (QR no válido o sin cuenta)
  if (errorScan) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Pagar con QR</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={s.errorText}>{errorScan}</Text>
          <Pressable style={s.escaneoOtroBtnLarge} onPress={handleEscanearOtro}>
            <Ionicons name="qr-code-outline" size={22} color="#1FA774" />
            <Text style={s.escaneoOtroText}>Escanear otro QR</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
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
        {cargando && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#1FA774" />
            <Text style={s.loadingText}>Obteniendo datos...</Text>
          </View>
        )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  btnDisabled: { opacity: 0.6 },

  /* Confirmación */
  confirmContent: { flex: 1, paddingHorizontal: 20, justifyContent: "center", alignItems: "center" },
  confirmResumen: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  confirmText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  confirmValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  confirmLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  transferBtn: {
    backgroundColor: "#1FA774",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  transferBtnLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  transferBtnAmount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  escaneoOtroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  escaneoOtroBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "rgba(31,167,116,0.15)",
    borderRadius: 14,
  },
  escaneoOtroText: {
    color: "#1FA774",
    fontSize: 16,
    fontWeight: "700",
  },
  errorBox: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },

  /* Toast éxito */
  toastOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 100,
  },
  toastCard: {
    backgroundColor: "#111B16",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  toastIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(31,167,116,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  toastTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  toastSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
});
