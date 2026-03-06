import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  cbu: string;
  alias: string;
  icon: string;
  color: string;
}

const ACCOUNTS: Account[] = [
  { id: "1", name: "Cuenta Principal", type: "Caja de Ahorro", currency: "ARS", balance: 3596000, cbu: "0070999030004123456789", alias: "SOFIA.GARCIA.FC", icon: "🇦🇷", color: "#1FA774" },
  { id: "2", name: "Cuenta Dólares", type: "Caja de Ahorro USD", currency: "USD", balance: 2450, cbu: "0070999030004987654321", alias: "SOFIA.USD.FC", icon: "🇺🇸", color: "#3B82F6" },
  { id: "3", name: "Cuenta Euro", type: "Caja de Ahorro EUR", currency: "EUR", balance: 1500, cbu: "0070999030004111222333", alias: "SOFIA.EUR.FC", icon: "🇪🇺", color: "#8B5CF6" },
];

const RECENT_ACTIVITY = [
  { id: "a1", desc: "Depósito recibido", account: "Cuenta Principal", amount: 350000, date: "Hoy, 10:23", type: "in" as const },
  { id: "a2", desc: "Transferencia enviada", account: "Cuenta Principal", amount: -45000, date: "Ayer, 16:45", type: "out" as const },
  { id: "a3", desc: "Compra de dólares", account: "Cuenta Dólares", amount: 500, date: "28 Sept", type: "in" as const },
  { id: "a4", desc: "Débito automático", account: "Cuenta Principal", amount: -12400, date: "27 Sept", type: "out" as const },
];

function fmtMoney(n: number, currency: string) {
  const prefix = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$";
  return `${prefix}${new Intl.NumberFormat("es-AR").format(n)}`;
}

export default function CuentasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const totalArs = ACCOUNTS.reduce((sum, a) => {
    if (a.currency === "ARS") return sum + a.balance;
    if (a.currency === "USD") return sum + a.balance * 1024;
    if (a.currency === "EUR") return sum + a.balance * 1593;
    return sum;
  }, 0);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Mis Cuentas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Patrimonio Total (en ARS)</Text>
          <Text style={s.totalValue}>${new Intl.NumberFormat("es-AR").format(Math.round(totalArs))}</Text>
          <Text style={s.totalSub}>{ACCOUNTS.length} cuentas activas</Text>
        </View>

        {/* Account cards */}
        {ACCOUNTS.map((acc) => (
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
                <Text style={s.accCurrency}>{acc.currency}</Text>
              </View>
            </View>

            <View style={s.accDivider} />

            <View style={s.accDetail}>
              <View style={s.accDetailRow}>
                <Text style={s.accDetailLabel}>Alias</Text>
                <View style={s.copyRow}>
                  <Text style={s.accDetailValue}>{acc.alias}</Text>
                  <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.3)" />
                </View>
              </View>
              <View style={s.accDetailRow}>
                <Text style={s.accDetailLabel}>CBU</Text>
                <View style={s.copyRow}>
                  <Text style={s.accDetailValue}>{acc.cbu.slice(0, 8)}...{acc.cbu.slice(-4)}</Text>
                  <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.3)" />
                </View>
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
                  {isIn ? "+" : "-"}${new Intl.NumberFormat("es-AR").format(Math.abs(a.amount))}
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
  accCurrency: { color: DIM, fontSize: 12, fontWeight: "600" },

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
