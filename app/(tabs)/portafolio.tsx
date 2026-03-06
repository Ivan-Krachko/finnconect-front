import { Ionicons } from "@expo/vector-icons";
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
import Svg, { Circle } from "react-native-svg";

/* ── Data ── */

interface AllocationSlice {
  label: string;
  percentage: number;
  color: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  amount: string;
  trend: number | null;
  symbol: string;
  color: string;
}

const ALLOCATION: AllocationSlice[] = [
  { label: "Cripto", percentage: 41, color: "#1FA774" },
  { label: "Acciones", percentage: 20, color: "#3B82F6" },
  { label: "Tarjetas", percentage: 11, color: "#F59E0B" },
  { label: "Monedas", percentage: 28, color: "#8B5CF6" },
];

const ASSETS: Asset[] = [
  {
    id: "eur",
    name: "Euro",
    type: "Moneda",
    amount: "€1,500.00",
    trend: 0.5,
    symbol: "€",
    color: "#3B82F6",
  },
  {
    id: "btc",
    name: "Bitcoin",
    type: "Criptomoneda",
    amount: "0.05 BTC",
    trend: -2.1,
    symbol: "₿",
    color: "#F7931A",
  },
  {
    id: "tsla",
    name: "Tesla Inc.",
    type: "Acciones",
    amount: "$850.50",
    trend: 1.8,
    symbol: "T",
    color: "#CC0000",
  },
  {
    id: "card",
    name: "Tarjeta Débito Virtual",
    type: "Tarjeta",
    amount: "$250.00",
    trend: null,
    symbol: "💳",
    color: "#8B5CF6",
  },
];

const TOTAL_VALUE = 12345.67;
const DAILY_CHANGE = 123.45;
const DAILY_PERCENT = 1.01;

/* ── Donut Chart ── */

function DonutChart({
  data,
  size = 160,
  strokeWidth = 26,
}: {
  data: AllocationSlice[];
  size?: number;
  strokeWidth?: number;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativeAngle = 0;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {data.map((slice, i) => {
        const arcLen = (slice.percentage / 100) * circumference;
        const rotation = cumulativeAngle - 90;
        cumulativeAngle += (slice.percentage / 100) * 360;

        return (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            stroke={slice.color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${arcLen} ${circumference - arcLen}`}
            rotation={rotation}
            origin={`${center}, ${center}`}
          />
        );
      })}
    </Svg>
  );
}

/* ── Screen ── */

export default function PortafolioScreen() {
  const insets = useSafeAreaInsets();
  const [hideValue, setHideValue] = useState(false);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ width: 68 }} />
        <Text style={s.headerTitle}>Portafolio</Text>
        <View style={s.headerRight}>
          <Pressable hitSlop={8}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color="rgba(255,255,255,0.8)"
            />
          </Pressable>
          <View style={s.avatar}>
            <Ionicons name="person" size={14} color="#0B3D2E" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Total Value Card ── */}
        <View style={s.valueCard}>
          <View style={s.valueTop}>
            <Text style={s.valueLabel}>Valor Total del Portafolio</Text>
            <Pressable onPress={() => setHideValue(!hideValue)} hitSlop={12}>
              <Ionicons
                name={hideValue ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="rgba(255,255,255,0.45)"
              />
            </Pressable>
          </View>

          <Text style={s.valueAmount}>
            {hideValue
              ? "••••••••"
              : `$${TOTAL_VALUE.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </Text>

          {!hideValue && (
            <View style={s.changeRow}>
              <Ionicons name="arrow-up" size={14} color="#4ADE80" />
              <Text style={s.changeText}>
                +${DAILY_CHANGE.toFixed(2)} (+{DAILY_PERCENT.toFixed(2)}%)
              </Text>
            </View>
          )}
        </View>

        {/* ── Asset Allocation Card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Asignación de Activos</Text>

          <View style={s.chartRow}>
            <DonutChart data={ALLOCATION} size={150} strokeWidth={24} />

            <View style={s.legend}>
              {ALLOCATION.map((slice) => (
                <View key={slice.label} style={s.legendItem}>
                  <View
                    style={[s.legendDot, { backgroundColor: slice.color }]}
                  />
                  <Text style={s.legendLabel}>
                    {slice.label}:{" "}
                    <Text style={s.legendPct}>{slice.percentage}%</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Assets List ── */}
        <Text style={s.sectionHeading}>Mis Activos</Text>

        <View style={s.assetsList}>
          {ASSETS.map((asset, i) => {
            const up = asset.trend !== null && asset.trend >= 0;
            const isEmoji = asset.symbol.length > 1;

            return (
              <View
                key={asset.id}
                style={[
                  s.assetRow,
                  i < ASSETS.length - 1 && s.assetRowBorder,
                ]}
              >
                <View
                  style={[
                    s.assetIcon,
                    { backgroundColor: `${asset.color}18` },
                  ]}
                >
                  {isEmoji ? (
                    <Text style={{ fontSize: 22 }}>{asset.symbol}</Text>
                  ) : (
                    <Text
                      style={[s.assetSymbol, { color: asset.color }]}
                    >
                      {asset.symbol}
                    </Text>
                  )}
                </View>

                <View style={s.assetInfo}>
                  <Text style={s.assetName}>{asset.name}</Text>
                  <Text style={s.assetType}>{asset.type}</Text>
                </View>

                <View style={s.assetRight}>
                  <Text style={s.assetAmount}>{asset.amount}</Text>
                  <View style={s.assetTrendRow}>
                    {asset.trend !== null ? (
                      <>
                        <Ionicons
                          name={up ? "arrow-up" : "arrow-down"}
                          size={12}
                          color={up ? "#4ADE80" : "#EF4444"}
                        />
                        <Text
                          style={[
                            s.assetTrend,
                            { color: up ? "#4ADE80" : "#EF4444" },
                          ]}
                        >
                          {up ? "+" : ""}
                          {asset.trend.toFixed(1)}%
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="arrow-up"
                          size={12}
                          color="rgba(255,255,255,0.25)"
                        />
                        <Text style={s.assetTrendNa}>N/A</Text>
                      </>
                    )}
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

/* ── Styles ── */

const CARD_BG = "#111B16";
const BORDER = "rgba(255,255,255,0.06)";
const DIM = "rgba(255,255,255,0.35)";

const cardShadow = Platform.select({
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

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: 68,
    justifyContent: "flex-end",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  /* Total Value Card */
  valueCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.2)",
    marginBottom: 16,
    ...cardShadow,
  },
  valueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  valueLabel: {
    color: DIM,
    fontSize: 14,
    fontWeight: "500",
  },
  valueAmount: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  changeText: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Card (shared) */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    ...cardShadow,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  /* Donut Chart Area */
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legend: { flex: 1, marginLeft: 24, gap: 14 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: DIM,
    fontSize: 13,
    fontWeight: "500",
  },
  legendPct: {
    color: "#fff",
    fontWeight: "700",
  },

  /* Assets List */
  sectionHeading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 16,
  },
  assetsList: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    ...cardShadow,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  assetRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  assetSymbol: {
    fontSize: 22,
    fontWeight: "700",
  },
  assetInfo: { flex: 1 },
  assetName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  assetType: {
    color: DIM,
    fontSize: 12,
  },
  assetRight: { alignItems: "flex-end" },
  assetAmount: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  assetTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  assetTrend: {
    fontSize: 12,
    fontWeight: "600",
  },
  assetTrendNa: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    fontWeight: "600",
  },
});
