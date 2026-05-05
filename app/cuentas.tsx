import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
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
import * as Clipboard from "expo-clipboard";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import { safeBack } from "../src/utils/navigation";
import * as cuentasService from "../src/Services/cuentas.service";
import { filterCuentasBySupportedFiat } from "../src/constants/fiat";
import { formatMoneyWithSymbol } from "../src/utils/formatNumber";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  cvu: string;
  alias: string;
  icon: string;
  color: string;
}

const CURRENCY_CONFIG: Record<string, { icon: string; color: string }> = {
  ARS: { icon: "🇦🇷", color: "#1FA774" },
  USD: { icon: "🇺🇸", color: "#3B82F6" },
  EUR: { icon: "🇪🇺", color: "#8B5CF6" },
  BRL: { icon: "🇧🇷", color: "#22C55E" },
};

function mapApiItemToAccount(item: {
  id: number;
  cvu: string;
  alias: string;
  moneda: string;
  saldo: string;
}): Account {
  const cfg = CURRENCY_CONFIG[item.moneda] || { icon: "💳", color: "#64748B" };
  return {
    id: String(item.id),
    name: `Cuenta ${item.moneda}`,
    type: "Caja de Ahorro",
    currency: item.moneda,
    balance: parseFloat(item.saldo) || 0,
    cvu: item.cvu ?? "",
    alias: item.alias,
    icon: cfg.icon,
    color: cfg.color,
  };
}

const RECENT_ACTIVITY = [
  { id: "a1", desc: "Depósito recibido", account: "Cuenta Principal", amount: 350000, currency: "ARS" as const, date: "Hoy, 10:23", type: "in" as const },
  { id: "a2", desc: "Transferencia enviada", account: "Cuenta Principal", amount: -45000, currency: "ARS" as const, date: "Ayer, 16:45", type: "out" as const },
  { id: "a3", desc: "Compra de dólares", account: "Cuenta Dólares", amount: 500, currency: "USD" as const, date: "28 Sept", type: "in" as const },
  { id: "a4", desc: "Débito automático", account: "Cuenta Principal", amount: -12400, currency: "ARS" as const, date: "27 Sept", type: "out" as const },
];

function fmtMoney(n: number, currency: string) {
  return formatMoneyWithSymbol(n, currency);
}

function maskCvu(cvu: string): string {
  const s = String(cvu ?? "").replace(/\s/g, "");
  if (s.length <= 12) return s || "—";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function CuentasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Debés iniciar sesión");
      return;
    }
    cuentasService
      .getCuentas(token)
      .then((data) => {
        setAccounts(filterCuentasBySupportedFiat(data.items || []).map(mapApiItemToAccount));
        setError(null);
      })
      .catch((e) => setError(e.message || "Error al cargar cuentas"))
      .finally(() => setLoading(false));
  }, [token]);

  const copiarAlPortapapeles = async (etiqueta: string, valor: string) => {
    const v = String(valor ?? "").trim();
    if (!v) {
      Alert.alert("Sin datos", `No hay ${etiqueta} para copiar.`);
      return;
    }
    try {
      await Clipboard.setStringAsync(v);
      Alert.alert("Copiado", `${etiqueta} copiado al portapapeles.`);
    } catch {
      Alert.alert("Error", "No se pudo copiar. Probá de nuevo.");
    }
  };

  const saldoPrincipal = accounts
    .filter((a) => a.currency === "ARS")
    .reduce((sum, a) => sum + a.balance, 0);

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1FA774" />
        <Text style={{ color: "#fff", marginTop: 12 }}>Cargando cuentas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.container, { paddingTop: insets.top, flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={{ color: "#fff", marginTop: 16, textAlign: "center" }}>{error}</Text>
        <Pressable onPress={() => safeBack(router, "/(tabs)/home")} style={{ marginTop: 20, padding: 12 }}>
          <Text style={{ color: "#1FA774", fontWeight: "600" }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/home")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Mis Cuentas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Saldo Principal</Text>
          <Text style={s.totalValue}>
            {formatMoneyWithSymbol(saldoPrincipal, "ARS", { showIsoCode: false })}
          </Text>
          <Text style={s.totalSub}>{accounts.length} cuentas activas</Text>
        </View>

        {/* Account cards */}
        {accounts.map((acc) => (
          <View key={acc.id} style={s.accCard}>
            <View style={s.accTop}>
              <View style={s.accLeft}>
                <View style={[s.accIcon, { backgroundColor: `${acc.color}18` }]}>
                  <Text style={{ fontSize: 22 }}>{acc.icon}</Text>
                </View>
                <View>
                  <Text style={s.accName}>{acc.name}</Text>
                  <Text style={s.accType}>{acc.type}</Text>
                </View>
              </View>
              <View style={s.accRight}>
                <Text style={s.accBalance}>{fmtMoney(acc.balance, acc.currency)}</Text>
              </View>
            </View>

            <View style={s.accDivider} />

            <View style={s.accDetail}>
              <View style={s.accDetailRow}>
                <Text style={s.accDetailLabel}>Alias</Text>
                <Pressable
                  style={s.copyRow}
                  onPress={() => void copiarAlPortapapeles("El alias", acc.alias)}
                  accessibilityRole="button"
                  accessibilityLabel="Copiar alias"
                >
                  <Text style={s.accDetailValue} numberOfLines={1} selectable={false}>
                    {acc.alias}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color="#1FA774" />
                </Pressable>
              </View>
              <View style={s.accDetailRow}>
                <Text style={s.accDetailLabel}>CVU</Text>
                <Pressable
                  style={s.copyRow}
                  onPress={() => void copiarAlPortapapeles("El CVU", acc.cvu)}
                  accessibilityRole="button"
                  accessibilityLabel="Copiar CVU"
                >
                  <Text style={s.accDetailValue} numberOfLines={1} selectable={false}>
                    {maskCvu(acc.cvu)}
                  </Text>
                  <Ionicons name="copy-outline" size={16} color="#1FA774" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {/* Activity */}
        <Text style={s.sectionHeading}>Actividad Reciente</Text>
        <View style={s.listCard}>
          {RECENT_ACTIVITY.map((a, i) => {
            const isIn = a.type === "in";
            return (
              <View key={a.id} style={[s.row, i < RECENT_ACTIVITY.length - 1 && s.rowBorder]}>
                <View style={[s.actIcon, { backgroundColor: isIn ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)" }]}>
                  <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? "#4ADE80" : "#EF4444"} />
                </View>
                <View style={s.actInfo}>
                  <Text style={s.actDesc}>{a.desc}</Text>
                  <Text style={s.actMeta}>{a.account} · {a.date}</Text>
                </View>
                <Text style={[s.actAmount, { color: isIn ? "#4ADE80" : "#EF4444" }]}>
                  {isIn ? "+" : "-"}
                  {formatMoneyWithSymbol(Math.abs(a.amount), a.currency)}
                </Text>
              </View>
            );
          })}
        </View>
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

  totalCard: { backgroundColor: CARD_BG, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: "rgba(31,167,116,0.2)", marginBottom: 20, ...shadow },
  totalLabel: { color: DIM, fontSize: 14, marginBottom: 8 },
  totalValue: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  totalSub: { color: "rgba(31,167,116,0.7)", fontSize: 13, fontWeight: "600" },

  accCard: { backgroundColor: CARD_BG, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 12, ...shadow },
  accTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  accIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  accName: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  accType: { color: DIM, fontSize: 12 },
  accRight: { alignItems: "flex-end" },
  accBalance: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 2 },

  accDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 14 },
  accDetail: { gap: 10 },
  accDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accDetailLabel: { color: DIM, fontSize: 12, fontWeight: "600" },
  copyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  accDetailValue: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "500" },

  sectionHeading: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 12, marginBottom: 16 },
  listCard: { backgroundColor: CARD_BG, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, ...shadow },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  actIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  actInfo: { flex: 1 },
  actDesc: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 2 },
  actMeta: { color: DIM, fontSize: 12 },
  actAmount: { fontSize: 15, fontWeight: "700" },
});
