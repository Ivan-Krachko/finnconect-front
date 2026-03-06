import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type FilterKey = "todas" | "ingresos" | "gastos";

interface Transaction {
  id: string;
  label: string;
  category: string;
  icon: IconName;
  iconColor: string;
  amount: number;
  date: string;
  time: string;
}

const TRANSACTIONS: Transaction[] = [
  { id: "1", label: "Compras en Supermercado", category: "Compras", icon: "cart-outline", iconColor: "#F59E0B", amount: -250120, date: "12 Sept", time: "18:34" },
  { id: "2", label: "Depósito de Salario", category: "Ingresos", icon: "arrow-down-circle-outline", iconColor: "#1FA774", amount: 3500000, date: "10 Sept", time: "09:00" },
  { id: "3", label: "Factura de Electricidad", category: "Servicios", icon: "flash-outline", iconColor: "#EF4444", amount: -170292, date: "08 Sept", time: "14:12" },
  { id: "4", label: "Suscripción Streaming", category: "Entretenimiento", icon: "play-circle-outline", iconColor: "#8B5CF6", amount: -150999, date: "05 Sept", time: "00:00" },
  { id: "5", label: "Transferencia Recibida", category: "Transferencia", icon: "swap-horizontal-outline", iconColor: "#3B82F6", amount: 167000, date: "03 Sept", time: "11:45" },
  { id: "6", label: "Restaurante", category: "Gastronomía", icon: "restaurant-outline", iconColor: "#EC4899", amount: -32500, date: "02 Sept", time: "21:10" },
  { id: "7", label: "Pago de Tarjeta", category: "Tarjeta", icon: "card-outline", iconColor: "#6B7280", amount: -890000, date: "01 Sept", time: "10:00" },
  { id: "8", label: "Freelance Diseño", category: "Ingresos", icon: "arrow-down-circle-outline", iconColor: "#1FA774", amount: 450000, date: "28 Ago", time: "15:30" },
  { id: "9", label: "Farmacia", category: "Salud", icon: "medkit-outline", iconColor: "#EF4444", amount: -18700, date: "27 Ago", time: "12:20" },
  { id: "10", label: "Uber", category: "Transporte", icon: "car-outline", iconColor: "#6B7280", amount: -8900, date: "26 Ago", time: "08:45" },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "ingresos", label: "Ingresos" },
  { key: "gastos", label: "Gastos" },
];

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.abs(n));
}

export default function TransaccionesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("todas");

  const filtered = TRANSACTIONS.filter((t) => {
    if (filter === "ingresos") return t.amount > 0;
    if (filter === "gastos") return t.amount < 0;
    return true;
  });

  const totalIngresos = TRANSACTIONS.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalGastos = TRANSACTIONS.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
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
        <View style={s.listCard}>
          {filtered.map((t, i) => {
            const isIncome = t.amount > 0;
            return (
              <View key={t.id} style={[s.row, i < filtered.length - 1 && s.rowBorder]}>
                <View style={[s.txIcon, { backgroundColor: `${t.iconColor}15` }]}>
                  <Ionicons name={t.icon} size={20} color={t.iconColor} />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txLabel} numberOfLines={1}>{t.label}</Text>
                  <Text style={s.txMeta}>{t.category} · {t.date}, {t.time}</Text>
                </View>
                <Text style={[s.txAmount, { color: isIncome ? "#4ADE80" : "#EF4444" }]}>
                  {isIncome ? "+" : "-"}${fmtArs(t.amount)}
                </Text>
              </View>
            );
          })}
        </View>

        {filtered.length === 0 && (
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

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: DIM, fontSize: 14 },
});
