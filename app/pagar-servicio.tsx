import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}

export default function PagarServicioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [facturasRes, cuentasRes] = await Promise.all([
        facturasService.getFacturas(token, { estado: "pendiente" }),
        cuentasService.getCuentas(token),
      ]);
      setFacturas(facturasRes.items || []);
      setCuentas(cuentasRes.items || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePagar = async (factura: Factura, cuentaId: number) => {
    if (!token) return;
    const monto = typeof factura.monto === "string" ? parseFloat(factura.monto) : (factura.monto ?? 0);
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    const saldo = cuenta ? parseFloat(cuenta.saldo) || 0 : 0;
    if (saldo < monto) {
      Alert.alert("Saldo insuficiente", "La cuenta no tiene suficiente saldo para pagar esta factura.");
      return;
    }
    setPagando(factura.id);
    try {
      await pagosServiciosService.pagarFactura(token, factura.id, cuentaId);
      Alert.alert("Listo", "Factura pagada correctamente", [
        { text: "OK", onPress: () => safeBack(router, "/(tabs)/pagos") },
      ]);
      await fetchData();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo pagar la factura");
    } finally {
      setPagando(null);
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
          <Text style={s.sectionTitle}>Facturas pendientes</Text>
          {facturas.map((f) => {
            const monto = typeof f.monto === "string" ? parseFloat(f.monto) : (f.monto ?? 0);
            const desc = f.descripcion || f.nombre || `Factura #${f.id}`;
            const cuentasConSaldo = cuentas.filter(
              (c) => (parseFloat(c.saldo) || 0) >= monto
            );

            return (
              <View key={f.id} style={s.facturaCard}>
                <View style={s.facturaHeader}>
                  <View style={s.facturaIcon}>
                    <Ionicons name="flash" size={24} color="#1FA774" />
                  </View>
                  <View style={s.facturaInfo}>
                    <Text style={s.facturaDesc}>{desc}</Text>
                    <Text style={s.facturaMonto}>${fmtArs(monto)}</Text>
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
                        ${fmtArs(parseFloat(c.saldo) || 0)}
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
