import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import * as criptomonedasService from "../src/Services/criptomonedas.service";
import { CRYPTO_DISPLAY, CRYPTO_API_TO_CODE, CONVERT_OPTIONS } from "../src/constants/criptomonedas";

interface CryptoPrice {
  tipo: string;
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number | null;
  lastUpdated: string;
}

interface CryptoDisplay {
  code: string;
  name: string;
  symbol: string;
  color: string;
  price: number;
  holdings: number;
  trend24h: number | null;
}

function fmtNumber(n: number, currency: string) {
  if (currency === "ars" || currency === "jpy" || currency === "brl") {
    return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function CriptomonedasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [cryptos, setCryptos] = useState<CryptoDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convert, setConvert] = useState("ars");

  const fetchPrecios = useCallback(() => {
    if (!token) {
      setLoading(false);
      setError("Debes iniciar sesión para ver los precios");
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      criptomonedasService.getPreciosCriptomonedas(token, convert),
      criptomonedasService.getCriptomonedas(token),
    ])
      .then(([pricesData, holdingsData]) => {
        const holdingsByCode: Record<string, number> = {};
        for (const item of holdingsData.items) {
          const code = CRYPTO_API_TO_CODE[item.tipoCriptomoneda as keyof typeof CRYPTO_API_TO_CODE];
          if (code) {
            holdingsByCode[code] = parseFloat(item.monto) || 0;
          }
        }
        const mapped: CryptoDisplay[] = (pricesData as CryptoPrice[]).map((c) => {
          const display = CRYPTO_DISPLAY[c.symbol as keyof typeof CRYPTO_DISPLAY] ?? {
            symbol: c.symbol.charAt(0),
            color: "#888",
          };
          return {
            code: c.symbol,
            name: c.name,
            symbol: display.symbol,
            color: display.color,
            price: c.price,
            holdings: holdingsByCode[c.symbol] ?? 0,
            trend24h: c.percentChange24h,
          };
        });
        setCryptos(mapped);
      })
      .catch((err) => setError(err?.message || "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [token, convert]);

  useFocusEffect(
    useCallback(() => {
      fetchPrecios();
    }, [fetchPrecios])
  );

  const totalValue = cryptos.reduce((sum, c) => sum + c.price * c.holdings, 0);
  const withTrend = cryptos.filter((c) => c.trend24h !== null);
  const avgTrend24h =
    withTrend.length > 0 ? withTrend.reduce((s, c) => s + (c.trend24h ?? 0), 0) / withTrend.length : 0;

  const currencyLabel = CONVERT_OPTIONS.find((o) => o.code === convert)?.label ?? convert.toUpperCase();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Criptomonedas</Text>
        <Pressable
          style={s.headerAction}
          onPress={() => router.push("/(tabs)/operaciones" as any)}
        >
          <Ionicons name="swap-horizontal" size={20} color="#1FA774" />
          <Text style={s.headerActionText}>Comprar / Vender</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Convert selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.convertScroll}
          contentContainerStyle={s.convertRow}
        >
          {CONVERT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.code}
              style={[s.convertChip, convert === opt.code && s.convertChipActive]}
              onPress={() => setConvert(opt.code)}
            >
              <Text style={[s.convertChipText, convert === opt.code && s.convertChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1FA774" />
            <Text style={s.loadingText}>Cargando...</Text>
          </View>
        ) : error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={s.errorText}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={fetchPrecios}>
              <Text style={s.retryBtnText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Valor Total en Cripto</Text>
              <Text style={s.summaryValue}>
                {currencyLabel === "ARS" ? "$" : ""}{fmtNumber(totalValue, convert)}{currencyLabel === "ARS" ? "" : ` ${currencyLabel}`}
              </Text>
              <View style={s.summaryChips}>
                <View style={s.chipGreen}>
                  <Ionicons name="trending-up" size={13} color="#4ADE80" />
                  <Text style={s.chipGreenText}>
                    24h {avgTrend24h >= 0 ? "+" : ""}{avgTrend24h.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* List */}
            <Text style={s.sectionHeading}>Mis Criptomonedas</Text>
            <View style={s.listCard}>
              {cryptos.filter((c) => c.holdings > 0).map((c, i, arr) => {
                const value = c.price * c.holdings;
                const up24 = c.trend24h !== null && c.trend24h >= 0;
                return (
                  <View key={c.code} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
                    <View style={[s.icon, { backgroundColor: `${c.color}18` }]}>
                      <Text style={[s.iconSymbol, { color: c.color }]}>{c.symbol}</Text>
                    </View>
                    <View style={s.info}>
                      <Text style={s.coinName}>{c.name}</Text>
                      <Text style={s.coinSub}>{c.holdings} {c.code}</Text>
                    </View>
                    <View style={s.right}>
                      <Text style={s.coinValue}>
                        {currencyLabel === "ARS" ? "$" : ""}{fmtNumber(value, convert)}{currencyLabel === "ARS" ? "" : ` ${currencyLabel}`}
                      </Text>
                      <View style={s.trendRow}>
                        {c.trend24h !== null ? (
                          <>
                            <Ionicons name={up24 ? "caret-up" : "caret-down"} size={12} color={up24 ? "#4ADE80" : "#EF4444"} />
                            <Text style={[s.trendText, { color: up24 ? "#4ADE80" : "#EF4444" }]}>
                              {up24 ? "+" : ""}{c.trend24h.toFixed(2)}%
                            </Text>
                          </>
                        ) : (
                          <Text style={s.trendText}>—</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
              {cryptos.filter((c) => c.holdings > 0).length === 0 && (
                <View style={s.emptyRow}>
                  <Text style={s.emptyText}>No tenés criptomonedas en tu portafolio</Text>
                </View>
              )}
            </View>

            {/* Market */}
            <Text style={s.sectionHeading}>Precios del Mercado</Text>
            <View style={s.listCard}>
              {cryptos.map((c, i) => {
                const up = c.trend24h !== null && c.trend24h >= 0;
                return (
                  <View key={c.code} style={[s.row, i < cryptos.length - 1 && s.rowBorder]}>
                    <View style={[s.icon, { backgroundColor: `${c.color}18` }]}>
                      <Text style={[s.iconSymbol, { color: c.color }]}>{c.symbol}</Text>
                    </View>
                    <View style={s.info}>
                      <Text style={s.coinName}>{c.code}</Text>
                      <Text style={s.coinSub}>{c.name}</Text>
                    </View>
                    <View style={s.right}>
                      <Text style={s.coinValue}>
                        {currencyLabel === "ARS" ? "$" : ""}{fmtNumber(c.price, convert)}{currencyLabel === "ARS" ? "" : ` ${currencyLabel}`}
                      </Text>
                      <View style={s.trendRow}>
                        {c.trend24h !== null ? (
                          <Text style={[s.trendText, { color: up ? "#4ADE80" : "#EF4444" }]}>
                            24h {up ? "+" : ""}{c.trend24h.toFixed(1)}%
                          </Text>
                        ) : (
                          <Text style={s.trendText}>—</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
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
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(31,167,116,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerActionText: { color: "#1FA774", fontSize: 13, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  convertScroll: { marginBottom: 16, marginHorizontal: -20 },
  convertRow: { paddingHorizontal: 20, gap: 8 },
  convertChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  convertChipActive: {
    backgroundColor: "rgba(31,167,116,0.2)",
    borderColor: "rgba(31,167,116,0.5)",
  },
  convertChipText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  convertChipTextActive: { color: "#fff" },

  loadingBox: { paddingVertical: 48, alignItems: "center", gap: 12 },
  loadingText: { color: DIM, fontSize: 14 },

  errorBox: { paddingVertical: 48, alignItems: "center", gap: 12 },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  retryBtn: {
    backgroundColor: "rgba(31,167,116,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: { color: "#1FA774", fontSize: 14, fontWeight: "700" },

  emptyRow: { padding: 24, alignItems: "center" },
  emptyText: { color: DIM, fontSize: 14 },

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
