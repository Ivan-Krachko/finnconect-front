import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../../src/context/AutenticacionContext";
import * as cuentasService from "../../src/Services/cuentas.service";
import * as movimientosService from "../../src/Services/movimientos.service";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface QuickAction {
  icon: IconName;
  label: string;
  route: string | null;
  bg: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "swap-horizontal",
    label: "Transferir",
    route: "/transferencias",
    bg: "#E8F8F0",
  },
  {
    icon: "receipt-outline",
    label: "Pagar",
    route: "/pagos",
    bg: "#FFF4E6",
  },
  {
    icon: "logo-bitcoin",
    label: "Cripto",
    route: "/criptomonedas",
    bg: "#F0EEFF",
  },
  {
    icon: "card-outline",
    label: "Tarjetas",
    route: "/tarjetas",
    bg: "#E6F3FF",
  },
  {
    icon: "wallet-outline",
    label: "Cuentas",
    route: "/cuentas",
    bg: "#FFF0F0",
  },
];

const ACTION_ICON_COLORS: Record<string, string> = {
  "swap-horizontal": "#1FA774",
  "receipt-outline": "#F59E0B",
  "logo-bitcoin": "#7C3AED",
  "card-outline": "#3B82F6",
  "wallet-outline": "#EF4444",
  "grid-outline": "#6B7280",
};

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("es-AR").format(abs);
  return `${amount < 0 ? "-" : "+"}$${formatted}`;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [showBalance, setShowBalance] = useState(true);
  const [saldoPrincipal, setSaldoPrincipal] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<
    { id: number; label: string; amount: number; date: string }[]
  >([]);

  const fetchSaldo = useCallback(() => {
    if (!token) return;
    cuentasService
      .getCuentas(token)
      .then((data) => {
        const ars = (data.items || []).find((c: { moneda: string }) => c.moneda === "ARS");
        setSaldoPrincipal(ars ? parseFloat(ars.saldo) || 0 : 0);
      })
      .catch(() => setSaldoPrincipal(0));
  }, [token]);

  const fetchMovimientos = useCallback(() => {
    if (!token) return;
    movimientosService
      .getMovimientos(token, { page: 1, pageSize: 5 })
      .then((data) => {
        const items = (data.items || []).map((m: any) => ({
          id: m.id,
          label: m.descripcion || `Transferencia ${m.tipoOperacion}`,
          amount: m.sentido === "ingreso" ? parseFloat(m.monto) : -parseFloat(m.monto),
          date: new Date(m.createdAt).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
          }),
        }));
        setMovimientos(items);
      })
      .catch(() => setMovimientos([]));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchSaldo();
      fetchMovimientos();
    }, [fetchSaldo, fetchMovimientos])
  );

  const displayBalance =
    saldoPrincipal !== null
      ? new Intl.NumberFormat("es-AR").format(Math.round(saldoPrincipal))
      : "—";

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#072a1e", "#0e4430", "#17694a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: 380 }]}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.logoMini}>
              <Ionicons name="wallet-outline" size={18} color="#0B3D2E" />
            </View>
            <Text style={s.brandText}>FinConnect</Text>
          </View>
          <View style={s.headerRight}>
            <Pressable style={s.headerIconBtn} hitSlop={8}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
              <View style={s.badge} />
            </Pressable>
            <Pressable style={s.avatar}>
              <Ionicons name="person" size={16} color="#0B3D2E" />
            </Pressable>
          </View>
        </View>

        {/* ── Greeting ── */}
        <Text style={s.greeting}>Hola, Usuario</Text>

        {/* ── Balance Card ── */}
        <View style={s.balanceCard}>
          <View style={s.balanceTop}>
            <Text style={s.balanceLabel}>Saldo Principal</Text>
            <Pressable
              onPress={() => setShowBalance(!showBalance)}
              hitSlop={12}
            >
              <Ionicons
                name={showBalance ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="rgba(255,255,255,0.55)"
              />
            </Pressable>
          </View>

          <View style={s.amountRow}>
            <Text style={s.balanceAmount}>
              {showBalance ? `$${displayBalance}` : "••••••••"}
            </Text>
            {showBalance && saldoPrincipal !== null && <Text style={s.balanceCents}>.00</Text>}
          </View>

          <View style={s.trendRow}>
            <View style={s.trendPill}>
              <Ionicons name="trending-up" size={13} color="#4ADE80" />
              <Text style={s.trendValue}>+12.5%</Text>
            </View>
            <Text style={s.trendCaption}>vs. mes anterior</Text>
          </View>
        </View>

        {/* ── Content Sheet ── */}
        <View style={s.sheet}>
          {/* Quick Actions */}
          <Text style={s.sectionTitle}>Acciones Rápidas</Text>

          <View style={s.actionsCard}>
            <View style={s.actionsGrid}>
              {QUICK_ACTIONS.map((action, i) => (
                <Pressable
                  key={i}
                  style={s.actionItem}
                  onPress={() =>
                    action.route && router.push(action.route as any)
                  }
                >
                  <View
                    style={[s.actionCircle, { backgroundColor: action.bg }]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={22}
                      color={ACTION_ICON_COLORS[action.icon] ?? "#1FA774"}
                    />
                  </View>
                  <Text style={s.actionLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Transactions */}
          <View style={s.txHeader}>
            <Text style={s.sectionTitle}>Transacciones Recientes</Text>
            <Pressable hitSlop={8} onPress={() => router.push("/transacciones" as any)}>
              <Text style={s.seeAll}>Ver todas</Text>
            </Pressable>
          </View>

          <View style={s.txCard}>
            {movimientos.map((tx, i) => {
              const isIncome = tx.amount > 0;
              return (
                <View
                  key={tx.id}
                  style={[
                    s.txRow,
                    i < movimientos.length - 1 && s.txRowBorder,
                  ]}
                >
                  <View
                    style={[
                      s.txIconCircle,
                      {
                        backgroundColor: isIncome ? "#E8F8F0" : "#FEF0F0",
                      },
                    ]}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={20}
                      color={isIncome ? "#1FA774" : "#E53935"}
                    />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txName} numberOfLines={1}>
                      {tx.label}
                    </Text>
                    <Text style={s.txDate}>{tx.date}</Text>
                  </View>
                  <Text
                    style={[
                      s.txAmount,
                      { color: isIncome ? "#1FA774" : "#E53935" },
                    ]}
                  >
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  android: { elevation: 4 },
  default: {},
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F4F7" },
  scroll: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerIconBtn: { position: "relative" },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FF5252",
    borderWidth: 2,
    borderColor: "#0e4430",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Greeting ──
  greeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "500",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  // ── Balance Card ──
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontWeight: "500",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  balanceCents: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 20,
    fontWeight: "600",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  trendValue: { color: "#4ADE80", fontSize: 13, fontWeight: "700" },
  trendCaption: { color: "rgba(255,255,255,0.35)", fontSize: 12 },

  // ── Content Sheet ──
  sheet: {
    backgroundColor: "#F2F4F7",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 24,
    paddingTop: 28,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // ── Quick Actions ──
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 4,
    marginTop: 14,
    marginBottom: 28,
    ...SHADOW,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionItem: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 18,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    textAlign: "center",
  },

  // ── Transactions ──
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  seeAll: { color: "#1FA774", fontSize: 14, fontWeight: "600" },
  txCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOW,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: { flex: 1 },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  txDate: { fontSize: 12, color: "#A0A0A0" },
  txAmount: { fontSize: 15, fontWeight: "700" },
});
