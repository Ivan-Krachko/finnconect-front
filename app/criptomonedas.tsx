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

interface Crypto {
  code: string;
  name: string;
  symbol: string;
  color: string;
  priceArs: number;
  holdings: number;
  trend24h: number;
  trend7d: number;
}

const CRYPTOS: Crypto[] = [
  { code: "BTC", name: "Bitcoin", symbol: "₿", color: "#F7931A", priceArs: 98500000, holdings: 0.05, trend24h: 2.34, trend7d: 5.12 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", color: "#627EEA", priceArs: 3200000, holdings: 1.2, trend24h: 1.87, trend7d: -0.45 },
  { code: "SOL", name: "Solana", symbol: "◎", color: "#9945FF", priceArs: 185000, holdings: 15, trend24h: -0.92, trend7d: 8.3 },
  { code: "ADA", name: "Cardano", symbol: "₳", color: "#0033AD", priceArs: 780, holdings: 5000, trend24h: 0.45, trend7d: -2.1 },
  { code: "DOT", name: "Polkadot", symbol: "●", color: "#E6007A", priceArs: 8500, holdings: 120, trend24h: -1.23, trend7d: 3.7 },
  { code: "AVAX", name: "Avalanche", symbol: "▲", color: "#E84142", priceArs: 42000, holdings: 25, trend24h: 3.12, trend7d: 12.5 },
];

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(n);
}

export default function CriptomonedasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const totalValue = CRYPTOS.reduce((sum, c) => sum + c.priceArs * c.holdings, 0);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Criptomonedas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Valor Total en Cripto</Text>
          <Text style={s.summaryValue}>${fmtArs(Math.round(totalValue))}</Text>
          <View style={s.summaryChips}>
            <View style={s.chipGreen}>
              <Ionicons name="trending-up" size={13} color="#4ADE80" />
              <Text style={s.chipGreenText}>24h +2.1%</Text>
            </View>
            <View style={s.chipBlue}>
              <Ionicons name="analytics" size={13} color="#60A5FA" />
              <Text style={s.chipBlueText}>7d +4.8%</Text>
            </View>
          </View>
        </View>

        {/* List */}
        <Text style={s.sectionHeading}>Mis Criptomonedas</Text>
        <View style={s.listCard}>
          {CRYPTOS.map((c, i) => {
            const value = c.priceArs * c.holdings;
            const up24 = c.trend24h >= 0;
            return (
              <View key={c.code} style={[s.row, i < CRYPTOS.length - 1 && s.rowBorder]}>
                <View style={[s.icon, { backgroundColor: `${c.color}18` }]}>
                  <Text style={[s.iconSymbol, { color: c.color }]}>{c.symbol}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.coinName}>{c.name}</Text>
                  <Text style={s.coinSub}>{c.holdings} {c.code}</Text>
                </View>
                <View style={s.right}>
                  <Text style={s.coinValue}>${fmtArs(Math.round(value))}</Text>
                  <View style={s.trendRow}>
                    <Ionicons name={up24 ? "caret-up" : "caret-down"} size={12} color={up24 ? "#4ADE80" : "#EF4444"} />
                    <Text style={[s.trendText, { color: up24 ? "#4ADE80" : "#EF4444" }]}>
                      {up24 ? "+" : ""}{c.trend24h.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Market */}
        <Text style={s.sectionHeading}>Precios del Mercado</Text>
        <View style={s.listCard}>
          {CRYPTOS.map((c, i) => {
            const up7 = c.trend7d >= 0;
            return (
              <View key={c.code} style={[s.row, i < CRYPTOS.length - 1 && s.rowBorder]}>
                <View style={[s.icon, { backgroundColor: `${c.color}18` }]}>
                  <Text style={[s.iconSymbol, { color: c.color }]}>{c.symbol}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.coinName}>{c.code}</Text>
                  <Text style={s.coinSub}>{c.name}</Text>
                </View>
                <View style={s.right}>
                  <Text style={s.coinValue}>${fmtArs(c.priceArs)}</Text>
                  <View style={s.trendRow}>
                    <Text style={[s.trendText, { color: up7 ? "#4ADE80" : "#EF4444" }]}>
                      7d {up7 ? "+" : ""}{c.trend7d.toFixed(1)}%
                    </Text>
                  </View>
                </View>
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

  summaryCard: { backgroundColor: CARD_BG, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: "rgba(31,167,116,0.2)", marginBottom: 24, ...shadow },
  summaryLabel: { color: DIM, fontSize: 14, marginBottom: 8 },
  summaryValue: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginBottom: 14 },
  summaryChips: { flexDirection: "row", gap: 10 },
  chipGreen: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,128,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipGreenText: { color: "#4ADE80", fontSize: 12, fontWeight: "700" },
  chipBlue: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(96,165,250,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipBlueText: { color: "#60A5FA", fontSize: 12, fontWeight: "700" },

  sectionHeading: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  listCard: { backgroundColor: CARD_BG, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, marginBottom: 24, ...shadow },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconSymbol: { fontSize: 22, fontWeight: "700" },
  info: { flex: 1 },
  coinName: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  coinSub: { color: DIM, fontSize: 12 },
  right: { alignItems: "flex-end" },
  coinValue: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  trendText: { fontSize: 12, fontWeight: "600" },
});
