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
import { autenticacionContext } from "../../src/context/AutenticacionContext";
import * as movimientosService from "../../src/Services/movimientos.service";
import { formatMoneyWithSymbol } from "../../src/utils/formatNumber";

interface MovimientoDetalle {
  id: number;
  cuentaId: number;
  tipoOperacion: string;
  sentido: string;
  monto: string;
  saldoPosterior: string;
  descripcion: string | null;
  referenciaId: number | null;
  createdAt: string;
  updatedAt?: string;
  moneda?: string;
  cuentaAlias?: string;
}

function labelTipoOperacion(t: string): string {
  const m: Record<string, string> = {
    transferencia: "Transferencia",
    cripto: "Criptomonedas",
    accion: "Acciones",
    pagoservicio: "Pago de servicio",
    conversion: "Conversión de moneda",
    otros: "Otros",
  };
  return m[t] ?? t;
}

function labelSentido(s: string): string {
  return s === "ingreso" ? "Ingreso" : s === "egreso" ? "Egreso" : s;
}

function formatFechaCompleta(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const CARD_BG = "#111B16";
const BORDER = "rgba(255,255,255,0.06)";
const DIM = "rgba(255,255,255,0.35)";
const shadow = Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16 },
  android: { elevation: 8 },
  default: {},
});

export default function TransaccionDetalleScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [data, setData] = useState<MovimientoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token || !Number.isFinite(id) || id < 1) {
      setLoading(false);
      setError(!token ? "Iniciá sesión para ver el detalle" : "Movimiento no válido");
      return;
    }
    setLoading(true);
    setError(null);
    movimientosService
      .getMovimientoById(token, id)
      .then((row) => setData(row as unknown as MovimientoDetalle))
      .catch((e: Error) => {
        setError(e.message || "No se pudo cargar el movimiento");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/transacciones");
  };

  const moneda = data?.moneda ?? "ARS";
  const montoNum = data ? parseFloat(data.monto) : 0;
  const saldoPostNum = data ? parseFloat(data.saldoPosterior) : 0;
  const isIncome = data?.sentido === "ingreso";
  const titulo = data?.descripcion?.trim() || labelTipoOperacion(data?.tipoOperacion ?? "");

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Detalle</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#1FA774" />
          <Text style={s.loadingText}>Cargando…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="alert-circle" size={44} color="#EF4444" />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <View
              style={[
                s.heroIcon,
                { backgroundColor: isIncome ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)" },
              ]}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={28}
                color={isIncome ? "#4ADE80" : "#EF4444"}
              />
            </View>
            <Text style={s.heroTitle} numberOfLines={2}>
              {titulo}
            </Text>
            <Text
              style={[s.heroAmount, { color: isIncome ? "#4ADE80" : "#EF4444" }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isIncome ? "+" : "-"}
              {formatMoneyWithSymbol(montoNum, moneda)}
            </Text>
            <Text style={s.heroMeta}>{formatFechaCompleta(data.createdAt)}</Text>
          </View>

          <View style={[s.card, shadow]}>
            <DetailRow label="Tipo" value={labelTipoOperacion(data.tipoOperacion)} />
            <DetailRow label="Movimiento" value={labelSentido(data.sentido)} />
            <DetailRow
              label="Cuenta"
              value={data.cuentaAlias?.trim() || "—"}
            />
            <DetailRow label="Moneda" value={moneda} />
            {data.descripcion ? <DetailRow label="Descripción" value={data.descripcion} /> : null}
            <DetailRow
              label="Saldo en cuenta luego del movimiento"
              value={formatMoneyWithSymbol(saldoPostNum, moneda)}
            />
            <DetailRow
              label="Referencia interna"
              value={data.referenciaId != null ? String(data.referenciaId) : "—"}
            />
          </View>
        </ScrollView>
      ) : null}
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  loadingText: { color: DIM, fontSize: 14 },
  errorText: { color: "#FCA5A5", textAlign: "center", fontSize: 15 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(31,167,116,0.2)",
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.45)",
  },
  retryBtnText: { color: "#1FA774", fontWeight: "700", fontSize: 15 },
  hero: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  heroAmount: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  heroMeta: { color: DIM, fontSize: 13, textAlign: "center", textTransform: "capitalize" },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  rowLabel: { color: DIM, fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" },
  rowValue: { color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 22 },
});
