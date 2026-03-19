import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
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
import * as movimientosService from "../src/Services/movimientos.service";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type FilterKey = "todas" | "ingresos" | "gastos";

interface Movimiento {
  id: number;
  cuentaId: number;
  tipoOperacion: string;
  sentido: string;
  monto: string;
  descripcion: string | null;
  createdAt: string;
}

const FILTERS: { key: FilterKey; label: string; sentido?: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "ingresos", label: "Ingresos", sentido: "ingreso" },
  { key: "gastos", label: "Gastos", sentido: "egreso" },
];

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.abs(n));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function TransaccionesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [items, setItems] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const sentido = FILTERS.find((f) => f.key === filter)?.sentido;
    movimientosService
      .getMovimientos(token, { page: 1, pageSize: 50, sentido })
      .then((data) => setItems(data.items || []))
      .catch((e) => {
        setError(e.message || "Error al cargar movimientos");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [token, filter]);

  const totalIngresos = items
    .filter((m) => m.sentido === "ingreso")
    .reduce((s, m) => s + parseFloat(m.monto), 0);
  const totalGastos = items
    .filter((m) => m.sentido === "egreso")
    .reduce((s, m) => s + parseFloat(m.monto), 0);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/home")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Transacciones</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={[s.summaryBox, { borderColor: "rgba(74,222,128,0.2)" }]}>
            <View style={s.summaryIcon}>
              <Ionicons name="arrow-down" size={16} color="#4ADE80" />
            </View>
            <Text style={s.summaryLabel}>Ingresos</Text>
            <Text style={[s.summaryValue, { color: "#4ADE80" }]}>+${fmtArs(totalIngresos)}</Text>
          </View>
          <View style={[s.summaryBox, { borderColor: "rgba(239,68,68,0.2)" }]}>
            <View style={[s.summaryIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
              <Ionicons name="arrow-up" size={16} color="#EF4444" />
            </View>
            <Text style={s.summaryLabel}>Gastos</Text>
            <Text style={[s.summaryValue, { color: "#EF4444" }]}>-${fmtArs(totalGastos)}</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[s.filterPill, active && s.filterActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1FA774" />
            <Text style={s.loadingText}>Cargando movimientos...</Text>
          </View>
        ) : error ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle" size={44} color="#EF4444" />
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : (
        <View style={s.listCard}>
          {items.map((t, i) => {
            const isIncome = t.sentido === "ingreso";
            const montoNum = parseFloat(t.monto);
            const { date, time } = formatDate(t.createdAt);
            const label = t.descripcion || `Transferencia ${t.tipoOperacion}`;
            return (
              <View key={t.id} style={[s.row, i < items.length - 1 && s.rowBorder]}>
                <View style={[s.txIcon, { backgroundColor: isIncome ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)" }]}>
                  <Ionicons name="swap-horizontal-outline" size={20} color={isIncome ? "#4ADE80" : "#EF4444"} />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txLabel} numberOfLines={1}>{label}</Text>
                  <Text style={s.txMeta}>{t.tipoOperacion} · {date}, {time}</Text>
                </View>
                <Text style={[s.txAmount, { color: isIncome ? "#4ADE80" : "#EF4444" }]}>
                  {isIncome ? "+" : "-"}${fmtArs(montoNum)}
                </Text>
              </View>
            );
          })}
        </View>
        )}

        {!loading && !error && items.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={44} color="rgba(255,255,255,0.12)" />
            <Text style={s.emptyText}>No hay transacciones para este filtro</Text>
          </View>
        )}
      </ScrollView>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080E0B" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryBox: { flex: 1, backgroundColor: CARD_BG, borderRadius: 18, padding: 16, borderWidth: 1, ...shadow },
  summaryIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(74,222,128,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  summaryLabel: { color: DIM, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 17, fontWeight: "800" },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  filterActive: { backgroundColor: "rgba(31,167,116,0.15)", borderColor: "rgba(31,167,116,0.4)" },
  filterText: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" },
  filterTextActive: { color: "#fff" },

  listCard: { backgroundColor: CARD_BG, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, ...shadow },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txLabel: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 3 },
  txMeta: { color: DIM, fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: "700" },

  loadingBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { color: DIM, fontSize: 14 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: DIM, fontSize: 14 },
});
