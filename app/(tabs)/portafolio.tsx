import { Ionicons } from "@expo/vector-icons";
import { useCallback, useContext, useMemo, useState } from "react";
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
import Svg, { Circle } from "react-native-svg";
import { autenticacionContext } from "../../src/context/AutenticacionContext";
import * as cuentasService from "../../src/Services/cuentas.service";
import * as criptomonedasService from "../../src/Services/criptomonedas.service";
import * as accionesService from "../../src/Services/acciones.service";
import { getConvertRates } from "../../src/Services/currency-conversions.service";
import {
  CRYPTO_DISPLAY,
  CRYPTO_API_TO_CODE,
} from "../../src/constants/criptomonedas";
import { filterCuentasBySupportedFiat } from "../../src/constants/fiat";
import { STOCK_DISPLAY, TIPO_ACCION_TO_SYMBOL } from "../../src/constants/acciones";
import {
  formatArsPesoEsAR,
  formatCryptoQuantityEsAR,
  formatEsAR,
  formatPercentValueEsAR,
  formatStockSharesEsAR,
} from "../../src/utils/formatNumber";

/* ── Types ── */

interface AllocationSlice {
  label: string;
  percentage: number;
  color: string;
}

interface AssetRow {
  id: string;
  name: string;
  type: string;
  amount: string;
  trend: number | null;
  symbol: string;
  color: string;
  valueArs: number;
  category: "fiat" | "cripto" | "acciones";
}

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

const COLORS = {
  fiat: "#8B5CF6",
  cripto: "#1FA774",
  acciones: "#3B82F6",
  otro: "#6B7280",
};

/** Convierte saldo de cuenta a ARS aproximado (tasas desde API). */
async function cuentasSaldoToArs(
  token: string,
  moneda: string,
  saldo: string
): Promise<number> {
  const n = parseFloat(saldo) || 0;
  const m = (moneda || "ARS").toUpperCase();
  if (m === "ARS") return n;
  try {
    const res = await getConvertRates(token, m, n);
    const ars = res?.rates?.ARS;
    if (typeof ars === "number" && !Number.isNaN(ars)) return ars;
  } catch {
    /* fallback */
  }
  if (m === "USD") return n * 1000;
  if (m === "EUR") return n * 1100;
  return n;
}

/* ── Screen ── */

export default function PortafolioScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [hideValue, setHideValue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [totalArs, setTotalArs] = useState(0);

  const loadPortafolio = useCallback(() => {
    if (!token) {
      setLoading(false);
      setError(null);
      setAssets([]);
      setTotalArs(0);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      const [
        cuentasRes,
        cryptoHold,
        cryptoPrices,
        accHold,
        accPrices,
      ] = await Promise.all([
        cuentasService.getCuentas(token, 1, 50),
        criptomonedasService.getCriptomonedas(token),
        criptomonedasService.getPreciosCriptomonedas(token, "ars"),
        accionesService.getAcciones(token),
        accionesService.getPreciosAcciones(token, "ars"),
      ]);

      const cuentasItems = filterCuentasBySupportedFiat(cuentasRes.items || []);
      const rows: AssetRow[] = [];

      let fiatArs = 0;
      let criptoArs = 0;
      let accionesArs = 0;

      const cuentaRows = await Promise.all(
        cuentasItems.map(async (c: Record<string, unknown>) => {
          const saldoNum = parseFloat(String(c.saldo)) || 0;
          if (saldoNum <= 0) return null;
          const moneda = String(c.moneda || "ARS").toUpperCase();
          const arsEq = await cuentasSaldoToArs(token, moneda, String(c.saldo));

          const amountLabel = formatEsAR(saldoNum, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 8,
          });

          return {
            id: `cuenta-${c.id}`,
            name: moneda,
            type: "Caja",
            amount: amountLabel,
            trend: null as number | null,
            symbol:
              moneda === "ARS"
                ? "$"
                : moneda === "USD"
                  ? "US$"
                  : moneda === "EUR"
                    ? "€"
                    : "●",
            color: COLORS.fiat,
            valueArs: arsEq,
            category: "fiat" as const,
          };
        })
      );

      for (const r of cuentaRows) {
        if (!r) continue;
        fiatArs += r.valueArs;
        rows.push(r);
      }

      const priceBySymbol: Record<string, { price: number; pct: number | null }> = {};
      for (const p of cryptoPrices as { symbol: string; price: number; percentChange24h: number | null }[]) {
        priceBySymbol[p.symbol] = { price: p.price, pct: p.percentChange24h };
      }

      for (const h of cryptoHold.items) {
        const code = CRYPTO_API_TO_CODE[h.tipoCriptomoneda as keyof typeof CRYPTO_API_TO_CODE];
        if (!code) continue;
        const qty = parseFloat(String(h.monto)) || 0;
        if (qty <= 0) continue;
        const meta = priceBySymbol[code];
        const price = meta?.price ?? 0;
        const valArs = qty * price;
        criptoArs += valArs;
        const disp = CRYPTO_DISPLAY[code as keyof typeof CRYPTO_DISPLAY] ?? {
          symbol: code.charAt(0),
          color: "#888",
        };
        rows.push({
          id: `cripto-${code}`,
          name: code,
          type: "Criptomoneda",
          amount: formatCryptoQuantityEsAR(parseFloat(qty.toFixed(8))),
          trend: meta?.pct ?? null,
          symbol: disp.symbol,
          color: disp.color,
          valueArs: valArs,
          category: "cripto",
        });
      }

      const accPriceByTipo: Record<string, { price: number; pct: number | null }> = {};
      for (const p of accPrices as { tipo: string; price: number; percentChange24h: number | null }[]) {
        accPriceByTipo[p.tipo] = { price: p.price, pct: p.percentChange24h };
      }

      for (const a of accHold.items) {
        const qty = parseFloat(String(a.monto)) || 0;
        if (qty <= 0) continue;
        const tipo = String(a.tipoAccion);
        const sym = TIPO_ACCION_TO_SYMBOL[tipo as keyof typeof TIPO_ACCION_TO_SYMBOL] || tipo;
        const meta = accPriceByTipo[tipo];
        const price = meta?.price ?? 0;
        const valArs = qty * price;
        accionesArs += valArs;
        const st = STOCK_DISPLAY[sym as keyof typeof STOCK_DISPLAY] ?? {
          letter: sym.slice(0, 1),
          color: "#3B82F6",
        };
        rows.push({
          id: `accion-${tipo}`,
          name: sym,
          type: "Acciones",
          amount: formatStockSharesEsAR(parseFloat(qty.toFixed(6))),
          trend: meta?.pct ?? null,
          symbol: st.letter,
          color: st.color,
          valueArs: valArs,
          category: "acciones",
        });
      }

      const total = fiatArs + criptoArs + accionesArs;
      setTotalArs(total);
      setAssets(rows.sort((a, b) => b.valueArs - a.valueArs));
    })()
      .catch((e) => {
        setError(e?.message || "No se pudo cargar el portafolio");
        setAssets([]);
        setTotalArs(0);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadPortafolio();
    }, [loadPortafolio])
  );

  const allocation = useMemo((): AllocationSlice[] => {
    const fiat = assets.filter((a) => a.category === "fiat").reduce((s, a) => s + a.valueArs, 0);
    const cripto = assets.filter((a) => a.category === "cripto").reduce((s, a) => s + a.valueArs, 0);
    const acc = assets.filter((a) => a.category === "acciones").reduce((s, a) => s + a.valueArs, 0);
    const t = fiat + cripto + acc;
    if (t <= 0) {
      return [
        { label: "Sin datos", percentage: 100, color: COLORS.otro },
      ];
    }
    const p = (x: number) => Math.round((x / t) * 100);
    const slices: AllocationSlice[] = [];
    if (fiat > 0) slices.push({ label: "Monedas", percentage: p(fiat), color: COLORS.fiat });
    if (cripto > 0) slices.push({ label: "Cripto", percentage: p(cripto), color: COLORS.cripto });
    if (acc > 0) slices.push({ label: "Acciones", percentage: p(acc), color: COLORS.acciones });
    if (slices.length === 0) {
      return [{ label: "Total", percentage: 100, color: COLORS.otro }];
    }
    const sum = slices.reduce((s, x) => s + x.percentage, 0);
    if (sum < 100 && slices[0]) slices[0].percentage += 100 - sum;
    return slices;
  }, [assets]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={{ width: 68 }} />
        <Text style={s.headerTitle}>Portafolio</Text>
        <View style={s.headerRight}>
          <View style={s.avatar}>
            <Ionicons name="person" size={14} color="#0B3D2E" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!token && (
          <View style={s.banner}>
            <Text style={s.bannerText}>
              Iniciá sesión para ver tu portafolio y tus activos reales.
            </Text>
          </View>
        )}

        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#1FA774" />
            <Text style={s.loadingText}>Cargando activos…</Text>
          </View>
        )}

        {error && !loading && (
          <View style={s.banner}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

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
              : token
                ? formatArsPesoEsAR(totalArs)
                : "—"}
          </Text>
        </View>

        {/* ── Asset Allocation Card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Asignación de Activos</Text>

          <View style={s.chartRow}>
            <DonutChart data={allocation} size={150} strokeWidth={24} />

            <View style={s.legend}>
              {allocation.map((slice) => (
                <View key={slice.label} style={s.legendItem}>
                  <View
                    style={[s.legendDot, { backgroundColor: slice.color }]}
                  />
                  <Text style={s.legendLabel}>
                    {slice.label}:{" "}
                    <Text style={s.legendPct}>
                      {formatEsAR(slice.percentage, { maximumFractionDigits: 1 })}%
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Assets List ── */}
        <Text style={s.sectionHeading}>Mis Activos</Text>

        {!loading && token && assets.length === 0 && !error && (
          <View style={[s.assetsList, s.emptyWrap]}>
            <Text style={s.emptyText}>
              Todavía no hay activos para mostrar.{"\n"}
              Tus cuentas en pesos/dólares, cripto y acciones aparecerán acá cuando tengas saldo.
            </Text>
          </View>
        )}

        {assets.length > 0 && (
          <View style={s.assetsList}>
            {assets.map((asset, i) => {
              const up = asset.trend !== null && asset.trend >= 0;
              const isEmoji = asset.symbol.length > 1;

              return (
                <View
                  key={asset.id}
                  style={[
                    s.assetRow,
                    i < assets.length - 1 && s.assetRowBorder,
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
                            {formatPercentValueEsAR(asset.trend, 1)}%
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name="remove-outline"
                            size={12}
                            color="rgba(255,255,255,0.25)"
                          />
                          <Text style={s.assetTrendNa}>—</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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

  loadingBox: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 8,
  },
  loadingText: { color: DIM, marginTop: 12, fontSize: 14 },

  banner: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bannerText: { color: DIM, fontSize: 14, lineHeight: 20 },
  errorText: { color: "#F87171", fontSize: 14 },

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
  emptyWrap: { padding: 24 },
  emptyText: {
    color: DIM,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
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
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
    maxWidth: 180,
    textAlign: "right",
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
