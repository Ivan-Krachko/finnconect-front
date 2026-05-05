import { Ionicons } from "@expo/vector-icons";
import {
  BarcodeScanningResult,
  BarcodeType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import * as cuentasService from "../src/Services/cuentas.service";
import * as pagosServiciosService from "../src/Services/pagos-servicios.service";
import { safeBack } from "../src/utils/navigation";
import { decodificarCodigoBarrasRecaudacion, type Decodificado } from "../src/utils/barcodeRecaudacion";
import { formatMoneyWithSymbol } from "../src/utils/formatNumber";
import { AppToast } from "../src/components/AppToast";
import { filterCuentasBySupportedFiat } from "../src/constants/fiat";

const TIPOS_CODIGO_BARRA: BarcodeType[] = [
  "itf14",
  "code128",
  "code39",
  "code93",
  "codabar",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "datamatrix",
  "pdf417",
];

function datosPagoPantalla(d: Decodificado): {
  monto: number | null;
  venc: string | null;
  ente: string | null;
  /** Base codigos_referencia (mock); si no hay fila: "Servicio no cargado" */
  nombreEnte: string | null;
  referencia: string | null;
} {
  if (!d.ok) {
    return { monto: null, venc: null, ente: null, nombreEnte: null, referencia: null };
  }
  const monto =
    d.importePesos != null && !Number.isNaN(d.importePesos) ? d.importePesos : null;
  let venc: string | null = null;
  if (d.primerVencimiento) {
    const p = d.primerVencimiento;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p);
    if (m) venc = `${m[3]}/${m[2]}/${m[1]}`;
    else venc = p;
  }
  const ente = d.codigoEnte?.trim() || null;
  const nombreEnte = d.nombreEnte?.trim() || null;
  let referencia = d.referencia?.trim() || null;
  if (!referencia && d.formato === "f48_argentina" && d.numeroComprobante) {
    referencia = d.numeroComprobante;
  }
  return { monto, venc, ente, nombreEnte, referencia };
}

type Cuenta = {
  id: number;
  alias: string;
  moneda: string;
  saldo: string;
};

export default function EscanearBarrasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [decodificado, setDecodificado] = useState<Decodificado | null>(null);
  const [linterna, setLinterna] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!decodificado?.ok || !token) return;
    let cancel = false;
    setLoadingCuentas(true);
    cuentasService
      .getCuentas(token, 1, 50)
      .then((data) => {
        if (cancel) return;
        setCuentas(filterCuentasBySupportedFiat(Array.isArray(data?.items) ? data.items : []));
      })
      .catch(() => {
        if (!cancel) setCuentas([]);
      })
      .finally(() => {
        if (!cancel) setLoadingCuentas(false);
      });
    return () => {
      cancel = true;
    };
  }, [decodificado, token]);
  const handleBarCodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      const dec = decodificarCodigoBarrasRecaudacion(
        result.data,
        result.type
      );
      setDecodificado(dec);
      if (dec.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },
    [scanned]
  );

  const handleEscanearOtro = useCallback(() => {
    setScanned(false);
    setDecodificado(null);
    setLinterna(false);
    setPagando(false);
  }, []);

  const pagarEscaneado = useCallback(
    async (f: ReturnType<typeof datosPagoPantalla>) => {
      if (!token) {
        showToast("Iniciá sesión para pagar el servicio.", "error");
        return;
      }
      if (f.monto == null || Number.isNaN(f.monto) || f.monto <= 0) {
        showToast("No se pudo leer el monto del cupón escaneado.", "error");
        return;
      }
      const cuentasArs = cuentas.filter((c) => String(c.moneda).toLowerCase() === "ars");
      if (cuentasArs.length === 0) {
        showToast("Necesitás una cuenta en ARS para pagar servicios.", "error");
        return;
      }
      const candidatas = cuentasArs
        .filter((c) => (parseFloat(c.saldo) || 0) >= f.monto!)
        .sort((a, b) => (parseFloat(b.saldo) || 0) - (parseFloat(a.saldo) || 0));
      const cuenta = candidatas[0];
      if (!cuenta) {
        showToast("No hay cuenta en ARS con saldo suficiente.", "error");
        return;
      }
      setPagando(true);
      try {
        await pagosServiciosService.pagarFactura(token, null, cuenta.id, {
          codigoEnte: f.ente ?? undefined,
          nombreEnte: f.nombreEnte ?? undefined,
          referencia: f.referencia ?? undefined,
          monto: f.monto,
        });
        showToast("Pago exitoso. Se registro en el historial.", "success");
        setTimeout(() => safeBack(router, "/(tabs)/pagos"), 900);
      } catch (e: any) {
        showToast(e?.message || "No se pudo completar el pago.", "error");
      } finally {
        setPagando(false);
      }
    },
    [cuentas, router, showToast, token]
  );

  const toggleLinterna = useCallback(() => {
    setLinterna((v) => !v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
          <Text style={s.headerTitle}>Código de barras</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.permissionBox}>
          <Ionicons name="barcode-outline" size={64} color="#1FA774" />
          <Text style={s.permissionTitle}>Cámara</Text>
          <Text style={s.permissionText}>Necesitamos la cámara para leer el cupón.</Text>
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

  if (decodificado) {
    const f = datosPagoPantalla(decodificado);
    const puedePagar = decodificado.ok;
    const hayDatosPago =
      f.monto != null ||
      f.venc != null ||
      f.ente != null ||
      f.nombreEnte != null ||
      f.referencia != null;

    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Pago</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {decodificado.ok && hayDatosPago ? (
            <View style={s.card}>
              {f.monto != null && (
                <View style={s.montoBlock}>
                  <Text style={s.montoLabel}>Total a pagar</Text>
                  <Text style={s.montoGrande}>
                    {formatMoneyWithSymbol(f.monto, "ARS")}
                  </Text>
                </View>
              )}
              {f.venc != null && (
                <View style={s.filaPago}>
                  <Text style={s.filaLabel}>Vencimiento</Text>
                  <Text style={s.filaValor}>{f.venc}</Text>
                </View>
              )}
              {f.ente != null && (
                <View style={s.filaPago}>
                  <Text style={s.filaLabel}>Empresa</Text>
                  {f.nombreEnte != null ? (
                    <View>
                      <Text style={s.filaValor}>{f.nombreEnte}</Text>
                      <Text style={s.filaCodigoEnte}>Cód. {f.ente}</Text>
                    </View>
                  ) : (
                    <Text style={s.filaValor}>{f.ente}</Text>
                  )}
                </View>
              )}
              {f.referencia != null && (
                <View style={s.filaPago}>
                  <Text style={s.filaLabel}>Referencia</Text>
                  <Text selectable style={s.filaValorMono}>
                    {f.referencia}
                  </Text>
                </View>
              )}
              {(decodificado.formato === "f50_argentina" ||
                decodificado.formato === "f33_argentina") &&
                decodificado.verificadorMod10Ok === false && (
                <Text style={s.avisor}>Revisá el cupón: el código no validó del todo.</Text>
              )}
            </View>
          ) : decodificado.ok && !hayDatosPago ? (
            <Text style={s.sinDatos}>No hay monto ni datos de pago en este código.</Text>
          ) : (
            <View style={s.card}>
              <Text style={s.errorText}>
                {!decodificado.ok ? decodificado.error : "No se pudo interpretar el código."}
              </Text>
            </View>
          )}

          {puedePagar && (
            <View style={s.card}>
              <Text style={s.filaLabel}>Pagar ahora (sin salir de esta pantalla)</Text>
              {!token ? (
                <Text style={s.sinDatos}>Iniciá sesión para poder pagar este servicio.</Text>
              ) : loadingCuentas ? (
                <ActivityIndicator size="small" color="#1FA774" />
              ) : (
                <Pressable
                  style={[s.pagarDirectoBtn, pagando && { opacity: 0.7 }]}
                  onPress={() => void pagarEscaneado(f)}
                  disabled={pagando}
                >
                  <Text style={s.pagarDirectoText}>
                    {pagando ? "Pagando..." : "Pagar en ARS"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable style={s.secondaryBtn} onPress={handleEscanearOtro}>
            <Text style={s.secondaryBtnText}>Escanear otro</Text>
          </Pressable>
        </ScrollView>
        <AppToast visible={!!toast} message={toast?.msg ?? ""} type={toast?.type ?? "info"} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Escanear código de barras</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={linterna}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: TIPOS_CODIGO_BARRA,
          }}
        />
        <View style={s.overlay} pointerEvents="none">
          <View style={s.scanFrameWide} />
          <Text style={s.scanHint}>Enfocá el código de barras</Text>
        </View>
        <View
          style={[s.torchWrap, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[s.torchBtn, linterna && s.torchBtnOn]}
            onPress={toggleLinterna}
            accessibilityRole="button"
            accessibilityLabel={linterna ? "Apagar linterna" : "Prender linterna"}
            hitSlop={12}
          >
            <Ionicons
              name={linterna ? "flashlight" : "flashlight-outline"}
              size={28}
              color="#fff"
            />
            <Text style={s.torchLabel}>{linterna ? "Linterna" : "Luz"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E0B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cameraWrapper: { flex: 1, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  /** Marco alargado para códigos lineales (I2of5, Code 128) */
  scanFrameWide: {
    width: "88%",
    maxWidth: 360,
    height: 120,
    borderWidth: 2,
    borderColor: "#1FA774",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scanHint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 20,
    paddingHorizontal: 28,
    textAlign: "center",
    lineHeight: 22,
  },
  torchWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  torchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  torchBtnOn: {
    backgroundColor: "rgba(31, 167, 116, 0.45)",
    borderColor: "#1FA774",
  },
  torchLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  permissionBox: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 20 },
  permissionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 28,
  },
  permissionBtn: {
    backgroundColor: "#1FA774",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  permissionBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 16, padding: 12 },
  cancelBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#111B16",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 20,
  },
  montoBlock: { marginBottom: 8 },
  montoLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginBottom: 4,
  },
  montoGrande: {
    color: "#1FA774",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  filaPago: { marginTop: 16 },
  filaLabel: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 4 },
  filaValor: { color: "#fff", fontSize: 17, fontWeight: "600" },
  filaCodigoEnte: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  filaValorMono: { color: "#fff", fontSize: 16, fontWeight: "600" },
  avisor: { color: "#FBBF24", fontSize: 13, marginTop: 16 },
  sinDatos: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  errorText: { color: "#F87171", fontSize: 16, lineHeight: 24 },
  cuentaOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cuentaOptionText: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  cuentaOptionSaldo: { color: "#1FA774", fontSize: 13, fontWeight: "700", marginRight: 8 },
  pagarDirectoBtn: {
    marginTop: 10,
    backgroundColor: "#1FA774",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  pagarDirectoText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "600" },
});
