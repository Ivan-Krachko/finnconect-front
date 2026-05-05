import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
import * as facturasService from "../src/Services/facturas.service";
import * as pagosServiciosService from "../src/Services/pagos-servicios.service";
import { formatMoneyWithSymbol } from "../src/utils/formatNumber";
import { AppToast } from "../src/components/AppToast";
import { filterCuentasBySupportedFiat } from "../src/constants/fiat";

interface Factura {
  id: number;
  descripcion?: string;
  monto?: number | string;
  estado?: string;
  [key: string]: any;
}

interface Cuenta {
  id: number;
  alias: string;
  moneda: string;
  saldo: string;
}

function norm(s: string | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function montoFactura(f: Factura): number {
  return typeof f.monto === "string" ? parseFloat(f.monto) : (f.monto ?? 0);
}

export default function PagarServicioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    monto?: string;
    ente?: string;
    nombreEnte?: string;
    referencia?: string;
  }>();
  const { token } = useContext(autenticacionContext);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState<number | null>(null);
  const [pagandoEscaneo, setPagandoEscaneo] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);
  const montoEscaneado = params.monto ? parseFloat(String(params.monto)) : NaN;
  const nombreEnteEscaneado = norm(params.nombreEnte ? String(params.nombreEnte) : "");
  const refEscaneada = norm(params.referencia ? String(params.referencia) : "");
  const vinoDesdeEscaneo =
    !!nombreEnteEscaneado || Number.isFinite(montoEscaneado) || !!refEscaneada;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [facturasRes, cuentasRes] = await Promise.all([
        facturasService.getFacturas(token, { estado: "pendiente" }),
        cuentasService.getCuentas(token),
      ]);
      setFacturas((facturasRes.items || []) as Factura[]);
      setCuentas(filterCuentasBySupportedFiat(cuentasRes.items || []));
    } catch (e: any) {
      showToast(e?.message || "No se pudieron cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const facturasOrdenadas = [...facturas].sort((a, b) => {
    const aMonto = montoFactura(a);
    const bMonto = montoFactura(b);
    const aNombre = norm(String(a.descripcion || a.nombre || ""));
    const bNombre = norm(String(b.descripcion || b.nombre || ""));
    const aRef = norm(String(a.referencia || ""));
    const bRef = norm(String(b.referencia || ""));
    const aMatchNombre =
      !!nombreEnteEscaneado && (aNombre.includes(nombreEnteEscaneado) || nombreEnteEscaneado.includes(aNombre));
    const bMatchNombre =
      !!nombreEnteEscaneado && (bNombre.includes(nombreEnteEscaneado) || nombreEnteEscaneado.includes(bNombre));
    const aMatchRef = !!refEscaneada && aRef.length > 0 && aRef.includes(refEscaneada);
    const bMatchRef = !!refEscaneada && bRef.length > 0 && bRef.includes(refEscaneada);
    const aMatchMonto = Number.isFinite(montoEscaneado) && Math.abs(aMonto - montoEscaneado) < 0.01;
    const bMatchMonto = Number.isFinite(montoEscaneado) && Math.abs(bMonto - montoEscaneado) < 0.01;
    const aScore = Number(aMatchRef) * 3 + Number(aMatchNombre) * 2 + Number(aMatchMonto);
    const bScore = Number(bMatchRef) * 3 + Number(bMatchNombre) * 2 + Number(bMatchMonto);
    return bScore - aScore;
  });

  const handlePagar = async (factura: Factura, cuentaId: number) => {
    if (!token) return;
    const monto = typeof factura.monto === "string" ? parseFloat(factura.monto) : (factura.monto ?? 0);
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    const saldo = cuenta ? parseFloat(cuenta.saldo) || 0 : 0;
    if (saldo < monto) {
      showToast("La cuenta no tiene saldo suficiente para pagar esta factura.", "error");
      return;
    }
    setPagando(factura.id);
    try {
      await pagosServiciosService.pagarFactura(token, factura.id, cuentaId);
      showToast("Pago exitoso.", "success");
      setTimeout(() => safeBack(router, "/(tabs)/pagos"), 900);
      await fetchData();
    } catch (e: any) {
      showToast(e?.message || "No se pudo pagar la factura", "error");
    } finally {
      setPagando(null);
    }
  };

  const handlePagarEscaneado = async (cuentaId: number) => {
    if (!token) return;
    if (!Number.isFinite(montoEscaneado) || montoEscaneado <= 0) {
      showToast("No se pudo leer un monto válido del código escaneado.", "error");
      return;
    }
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    const saldo = cuenta ? parseFloat(cuenta.saldo) || 0 : 0;
    if (saldo < montoEscaneado) {
      showToast("La cuenta no tiene saldo suficiente para pagar este cupon.", "error");
      return;
    }

    setPagandoEscaneo(true);
    try {
      await pagosServiciosService.pagarFactura(token, null, cuentaId, {
        codigoEnte: params.ente ? String(params.ente) : undefined,
        nombreEnte: params.nombreEnte ? String(params.nombreEnte) : undefined,
        referencia: params.referencia ? String(params.referencia) : undefined,
        monto: montoEscaneado,
      });
      showToast("Pago exitoso del cupon.", "success");
      setTimeout(() => safeBack(router, "/(tabs)/pagos"), 900);
      await fetchData();
    } catch (e: any) {
      showToast(e?.message || "No se pudo pagar el cupón escaneado", "error");
    } finally {
      setPagandoEscaneo(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Pagar Servicio</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#1FA774" />
        </View>
      ) : facturas.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={s.emptyTitle}>No hay facturas pendientes</Text>
          <Text style={s.emptySub}>
            Todas tus facturas están al día o el servicio de facturas no está disponible
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {vinoDesdeEscaneo && (
            <View style={s.scanHintCard}>
              <Text style={s.scanHintTitle}>Datos detectados del código</Text>
              {!!params.nombreEnte && <Text style={s.scanHintText}>Empresa: {String(params.nombreEnte)}</Text>}
              {Number.isFinite(montoEscaneado) && (
                <Text style={s.scanHintText}>Monto: {formatMoneyWithSymbol(montoEscaneado, "ARS")}</Text>
              )}
              {Number.isFinite(montoEscaneado) && cuentas.length > 0 && (
                <View style={s.scanPayWrap}>
                  <Text style={s.cuentaLabel}>Pagar cupón escaneado desde</Text>
                  {cuentas
                    .filter((c) => (parseFloat(c.saldo) || 0) >= montoEscaneado)
                    .map((c) => (
                      <Pressable
                        key={`scan-${c.id}`}
                        style={s.cuentaOption}
                        onPress={() => handlePagarEscaneado(c.id)}
                        disabled={pagandoEscaneo}
                      >
                        <Text style={s.cuentaOptionText}>
                          {c.alias} · {c.moneda}
                        </Text>
                        <Text style={s.cuentaOptionSaldo}>
                          {formatMoneyWithSymbol(parseFloat(c.saldo) || 0, c.moneda)}
                        </Text>
                        {pagandoEscaneo ? (
                          <ActivityIndicator size="small" color="#1FA774" />
                        ) : (
                          <Ionicons name="arrow-forward" size={20} color="#1FA774" />
                        )}
                      </Pressable>
                    ))}
                </View>
              )}
            </View>
          )}
          <Text style={s.sectionTitle}>Facturas pendientes</Text>
          {facturasOrdenadas.map((f) => {
            const monto = montoFactura(f);
            const desc = f.descripcion || f.nombre || `Factura #${f.id}`;
            const cuentasConSaldo = cuentas.filter(
              (c) => (parseFloat(c.saldo) || 0) >= monto
            );
            const matchMonto =
              Number.isFinite(montoEscaneado) && Math.abs(monto - montoEscaneado) < 0.01;
            const matchNombre =
              !!nombreEnteEscaneado &&
              norm(String(desc)).includes(nombreEnteEscaneado);
            const esSugerida = vinoDesdeEscaneo && (matchMonto || matchNombre);

            return (
              <View key={f.id} style={s.facturaCard}>
                <View style={s.facturaHeader}>
                  <View style={s.facturaIcon}>
                    <Ionicons name="flash" size={24} color="#1FA774" />
                  </View>
                  <View style={s.facturaInfo}>
                    <Text style={s.facturaDesc}>{desc}</Text>
                    <Text style={s.facturaMonto}>{formatMoneyWithSymbol(monto, "ARS")}</Text>
                    {esSugerida && <Text style={s.sugerida}>Sugerida por escaneo</Text>}
                  </View>
                </View>
                <Text style={s.cuentaLabel}>Pagar desde</Text>
                {cuentasConSaldo.length === 0 ? (
                  <Text style={s.sinSaldo}>
                    No tenés una cuenta con saldo suficiente
                  </Text>
                ) : (
                  cuentasConSaldo.map((c) => (
                    <Pressable
                      key={c.id}
                      style={s.cuentaOption}
                      onPress={() => handlePagar(f, c.id)}
                      disabled={pagando === f.id}
                    >
                      <Text style={s.cuentaOptionText}>
                        {c.alias} · {c.moneda}
                      </Text>
                      <Text style={s.cuentaOptionSaldo}>
                        {formatMoneyWithSymbol(parseFloat(c.saldo) || 0, c.moneda)}
                      </Text>
                      {pagando === f.id ? (
                        <ActivityIndicator size="small" color="#1FA774" />
                      ) : (
                        <Ionicons name="arrow-forward" size={20} color="#1FA774" />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
      <AppToast visible={!!toast} message={toast?.msg ?? ""} type={toast?.type ?? "info"} />
    </View>
  );
}

const CARD_BG = "#111B16";
const BORDER = "rgba(255,255,255,0.06)";
const DIM = "rgba(255,255,255,0.35)";
const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  android: { elevation: 8 },
  default: {},
});

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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 16 },
  emptySub: {
    color: DIM,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  scanHintCard: {
    backgroundColor: "rgba(31,167,116,0.12)",
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.3)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  scanHintTitle: { color: "#B7F7DD", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  scanHintText: { color: "#E8FFF4", fontSize: 12 },
  scanPayWrap: { marginTop: 10 },
  facturaCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  facturaHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  facturaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(31,167,116,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  facturaInfo: { flex: 1 },
  facturaDesc: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  facturaMonto: { color: "#1FA774", fontSize: 20, fontWeight: "800" },
  sugerida: { color: "#86EFAC", fontSize: 12, fontWeight: "700", marginTop: 4 },
  cuentaLabel: {
    color: DIM,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  sinSaldo: { color: "#F87171", fontSize: 14, fontWeight: "500" },
  cuentaOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cuentaOptionText: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  cuentaOptionSaldo: { color: "#1FA774", fontSize: 14, fontWeight: "700", marginRight: 8 },
});
