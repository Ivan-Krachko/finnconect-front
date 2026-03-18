import { Ionicons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../../src/context/AutenticacionContext";
import * as criptomonedasService from "../../src/Services/criptomonedas.service";
import { CRYPTO_DISPLAY } from "../../src/constants/criptomonedas";
import { parseAmount } from "../../src/utils/parseAmount";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type TabKey = "divisas" | "cripto" | "acciones";

/* ── Data ── */

interface Currency {
  code: string;
  name: string;
  flag: string;
  rateToArs: number;
  trend: number;
}

interface Crypto {
  code: string;
  name: string;
  symbol: string;
  color: string;
  priceArs: number;
  trend: number;
}

interface Stock {
  ticker: string;
  name: string;
  letter: string;
  color: string;
  priceArs: number;
  trend: number;
}

const CURRENCIES: Currency[] = [
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷", rateToArs: 1, trend: 0 },
  {
    code: "USD",
    name: "Dólar Estadounidense",
    flag: "🇺🇸",
    rateToArs: 1024,
    trend: 0.45,
  },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rateToArs: 1593, trend: 0.25 },
  {
    code: "JPY",
    name: "Yen Japonés",
    flag: "🇯🇵",
    rateToArs: 9.14,
    trend: -0.12,
  },
  {
    code: "BRL",
    name: "Real Brasileño",
    flag: "🇧🇷",
    rateToArs: 204,
    trend: 0.18,
  },
  {
    code: "GBP",
    name: "Libra Esterlina",
    flag: "🇬🇧",
    rateToArs: 1850,
    trend: 0.32,
  },
];

/** Fallback cuando no hay datos del API */
const CRYPTOS_FALLBACK: Crypto[] = [
  { code: "BTC", name: "Bitcoin", symbol: "₿", color: "#F7931A", priceArs: 0, trend: 0 },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", color: "#627EEA", priceArs: 0, trend: 0 },
];

const STOCKS: Stock[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    letter: "A",
    color: "#A2AAAD",
    priceArs: 225000,
    trend: 0.89,
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    letter: "G",
    color: "#4285F4",
    priceArs: 178000,
    trend: 1.23,
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    letter: "T",
    color: "#CC0000",
    priceArs: 285000,
    trend: -2.15,
  },
  {
    ticker: "AMZN",
    name: "Amazon.com",
    letter: "A",
    color: "#FF9900",
    priceArs: 198000,
    trend: 0.67,
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    letter: "M",
    color: "#00A4EF",
    priceArs: 412000,
    trend: 1.45,
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    letter: "N",
    color: "#76B900",
    priceArs: 890000,
    trend: 3.78,
  },
];

const POPULAR_CURRENCIES = CURRENCIES.filter((c) => c.code !== "ARS");

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "divisas", label: "Divisas", icon: "cash-outline" },
  { key: "cripto", label: "Cripto", icon: "logo-bitcoin" },
  { key: "acciones", label: "Acciones", icon: "analytics-outline" },
];

function fmtArs(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

/** Normaliza input: si el teclado envía punto como decimal, mostramos coma (formato Argentina) */
function normalizeAmountInput(t: string): string {
  const lastPeriod = t.lastIndexOf(".");
  if (lastPeriod < 0) return t;
  const after = t.slice(lastPeriod + 1);
  if (after.length === 3 && /^\d{3}$/.test(after)) return t;
  return t.replace(/\./g, ",");
}

/** Formato cripto con coma como decimal (consistente con formato Argentina en la pantalla) */
function fmtCrypto(n: number): string {
  let s: string;
  if (n >= 1) s = n.toFixed(4);
  else if (n >= 0.001) s = n.toFixed(6);
  else s = n.toFixed(8);
  return s.replace(".", ",");
}




/* ── Component ── */

export default function OperacionesScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [activeTab, setActiveTab] = useState<TabKey>("divisas");

  // Cripto prices from API
  const [cryptos, setCryptos] = useState<Crypto[]>(CRYPTOS_FALLBACK);
  const [cryptosLoading, setCryptosLoading] = useState(true);
  const [cryptosError, setCryptosError] = useState<string | null>(null);

  // Moneda fiat (ARS, USD, EUR, etc.)
  const [cryptoSendCurrency, setCryptoSendCurrency] = useState("ARS");
  // Modo: comprar (fiat→crypto) o vender (crypto→fiat)
  const [cryptoMode, setCryptoMode] = useState<"comprar" | "vender">("comprar");

  const fetchCryptoPrecios = useCallback(() => {
    if (!token) {
      setCryptos(CRYPTOS_FALLBACK);
      setCryptosLoading(false);
      return;
    }
    setCryptosLoading(true);
    setCryptosError(null);
    const convert = cryptoSendCurrency.toLowerCase();
    criptomonedasService
      .getPreciosCriptomonedas(token, convert)
      .then((data: { tipo: string; symbol: string; name: string; price: number; percentChange24h: number | null }[]) => {
        const mapped: Crypto[] = data.map((c) => {
          const display = CRYPTO_DISPLAY[c.symbol as keyof typeof CRYPTO_DISPLAY] ?? {
            symbol: c.symbol.charAt(0),
            color: "#888",
          };
          return {
            code: c.symbol,
            name: c.name,
            symbol: display.symbol,
            color: display.color,
            priceArs: c.price,
            trend: c.percentChange24h ?? 0,
          };
        });
        setCryptos(mapped.length > 0 ? mapped : CRYPTOS_FALLBACK);
      })
      .catch((err) => {
        setCryptosError(err?.message || "Error al cargar precios");
        setCryptos(CRYPTOS_FALLBACK);
      })
      .finally(() => setCryptosLoading(false));
  }, [token, cryptoSendCurrency]);

  useFocusEffect(
    useCallback(() => {
      fetchCryptoPrecios();
    }, [fetchCryptoPrecios])
  );

  // Refetch precios al cambiar la moneda de pago
  useEffect(() => {
    if (activeTab === "cripto" && token) fetchCryptoPrecios();
  }, [cryptoSendCurrency]);

  // Divisas state
  const [fxAmount, setFxAmount] = useState("");
  const sendCurrency = CURRENCIES[0];
  const receiveCurrency = CURRENCIES[2];
  const fxNumeric = parseAmount(fxAmount);
  const fxRate = 1 / receiveCurrency.rateToArs;
  const fxReceive = fxNumeric * fxRate;

  // Cripto state
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const activeCrypto = cryptos[Math.min(selectedCrypto, cryptos.length - 1)] ?? CRYPTOS_FALLBACK[0];

  useEffect(() => {
    if (selectedCrypto >= cryptos.length && cryptos.length > 0) {
      setSelectedCrypto(0);
    }
  }, [cryptos.length, selectedCrypto]);

  // Reset monto al cambiar moneda o modo
  useEffect(() => {
    setCryptoAmount("");
  }, [cryptoSendCurrency, cryptoMode]);

  const cryptoNumeric = parseAmount(cryptoAmount);
  const price = activeCrypto.priceArs;
  const cryptoReceive =
    cryptoMode === "comprar"
      ? price > 0
        ? cryptoNumeric / price
        : 0
      : price > 0
        ? cryptoNumeric * price
        : 0;

  // Acciones state
  const [stockAmount, setStockAmount] = useState("");
  const [selectedStock, setSelectedStock] = useState(0);
  const activeStock = STOCKS[selectedStock];
  const stockNumeric = parseAmount(stockAmount);
  const stockShares = stockNumeric / activeStock.priceArs;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ width: 68 }} />
        <Text style={s.headerTitle}>Operaciones</Text>
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

      {/* ── Sub-tabs ── */}
      <View style={s.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[s.tabPill, active && s.tabPillActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? "#fff" : "rgba(255,255,255,0.4)"}
              />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════ DIVISAS ════════════ */}
        {activeTab === "divisas" && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Intercambiar Divisas</Text>
              <Text style={s.cardSub}>
                Convierte divisas en tiempo real.
              </Text>

              <View style={s.section}>
                <Text style={s.label}>Tú Envías</Text>
                <View style={s.row}>
                  <View style={s.rowLeft}>
                    <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                      <Text style={s.emoji}>{sendCurrency.flag}</Text>
                    </View>
                    <View>
                      <Text style={s.code}>{sendCurrency.code}</Text>
                      <Text style={s.sub}>Dólar{"\n"}Estadounidense</Text>
                    </View>
                  </View>
                  <View style={s.amountBox}>
                    <TextInput
                      style={s.amountInput}
                      value={fxAmount}
                      onChangeText={(t) => setFxAmount(normalizeAmountInput(t))}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                    <Ionicons name="chevron-down" size={16} color={DIM} />
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>Tú Recibes</Text>
                <View style={s.row}>
                  <View style={s.rowLeft}>
                    <View style={[s.circle, { backgroundColor: "#152533" }]}>
                      <Text style={s.emoji}>{receiveCurrency.flag}</Text>
                    </View>
                    <View>
                      <Text style={s.code}>{receiveCurrency.code}</Text>
                      <Text style={s.sub}>{receiveCurrency.name}</Text>
                    </View>
                  </View>
                  <View style={s.amountBox}>
                    <Text style={s.amountValue}>{fxReceive.toFixed(2).replace(".", ",")}</Text>
                    <Ionicons name="chevron-down" size={16} color={DIM} />
                  </View>
                </View>
              </View>

              <Text style={s.rateText}>
                Tasa de cambio:{" "}
                <Text style={s.rateHl}>1 ARS = {fxRate.toFixed(5)} EUR</Text>
              </Text>

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [s.btnGreen, pressed && s.pressed]}
                >
                  <Text style={s.btnTxt}>Comprar EUR</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.btnRed, pressed && s.pressed]}
                >
                  <Text style={s.btnTxt}>Vender ARS</Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.heading}>Divisas Populares</Text>
            <View style={s.grid}>
              {POPULAR_CURRENCIES.map((c) => {
                const up = c.trend >= 0;
                return (
                  <View key={c.code} style={s.gridCard}>
                    <View style={s.gridTop}>
                      <View
                        style={[
                          s.gridIcon,
                          { backgroundColor: up ? "#15332A" : "#331520" },
                        ]}
                      >
                        <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                      </View>
                      <TrendPill value={c.trend} />
                    </View>
                    <Text style={s.gridCode}>{c.code}</Text>
                    <Text style={s.gridName}>{c.name}</Text>
                    <View style={s.gridBottom}>
                      <Text style={s.gridPrice}>{fmtArs(c.rateToArs)} ARS</Text>
                      <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.2)" />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ════════════ CRIPTO ════════════ */}
        {activeTab === "cripto" && (
          <>
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View>
                  <Text style={s.cardTitle}>
                    {cryptoMode === "comprar" ? "Comprar" : "Vender"} Criptomonedas
                  </Text>
                  <Text style={s.cardSub}>
                    {cryptoMode === "comprar"
                      ? "Invertí moneda y recibí cripto."
                      : "Vendé cripto y recibí moneda."}
                  </Text>
                </View>
                {cryptosLoading && (
                  <ActivityIndicator size="small" color="#1FA774" />
                )}
              </View>
              {cryptosError && (
                <Text style={s.cryptoErrorText}>{cryptosError}</Text>
              )}

              {/* Toggle Comprar / Vender */}
              <View style={s.modeToggleRow}>
                <Pressable
                  style={[s.modeToggleBtn, cryptoMode === "comprar" && s.modeToggleBtnActive]}
                  onPress={() => setCryptoMode("comprar")}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={18}
                    color={cryptoMode === "comprar" ? "#fff" : "rgba(255,255,255,0.4)"}
                  />
                  <Text style={[s.modeToggleText, cryptoMode === "comprar" && s.modeToggleTextActive]}>
                    Comprar cripto
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.modeToggleBtn, cryptoMode === "vender" && s.modeToggleBtnActive]}
                  onPress={() => setCryptoMode("vender")}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={18}
                    color={cryptoMode === "vender" ? "#fff" : "rgba(255,255,255,0.4)"}
                  />
                  <Text style={[s.modeToggleText, cryptoMode === "vender" && s.modeToggleTextActive]}>
                    Vender cripto
                  </Text>
                </Pressable>
              </View>

              {/* Crypto selector chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipScroll}
                contentContainerStyle={s.chipRow}
              >
                {cryptos.map((c, i) => (
                  <Pressable
                    key={c.code}
                    style={[
                      s.chip,
                      selectedCrypto === i && {
                        backgroundColor: `${c.color}22`,
                        borderColor: `${c.color}66`,
                      },
                    ]}
                    onPress={() => setSelectedCrypto(i)}
                  >
                    <View
                      style={[
                        s.chipDot,
                        { backgroundColor: c.color },
                      ]}
                    >
                      <Text style={s.chipSymbol}>{c.symbol}</Text>
                    </View>
                    <Text
                      style={[
                        s.chipLabel,
                        selectedCrypto === i && { color: "#fff" },
                      ]}
                    >
                      {c.code}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Selector de moneda para pagar */}
              <View style={s.section}>
                <Text style={s.label}>Pagar con</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.currencyChipScroll}
                  contentContainerStyle={s.currencyChipRow}
                >
                  {CURRENCIES.map((curr) => {
                    const active = cryptoSendCurrency === curr.code;
                    return (
                      <Pressable
                        key={curr.code}
                        style={[s.currencyChip, active && s.currencyChipActive]}
                        onPress={() => setCryptoSendCurrency(curr.code)}
                      >
                        <Text style={s.currencyChipFlag}>{curr.flag}</Text>
                        <Text style={[s.currencyChipCode, active && s.currencyChipCodeActive]}>
                          {curr.code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.section}>
                <Text style={s.label}>Tú Invertís</Text>
                <View style={s.row}>
                  {cryptoMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.code}>{cryptoSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.name ?? "Peso Argentino"}
                          </Text>
                        </View>
                      </View>
                      <View style={s.amountBox}>
                        <TextInput
                          style={s.amountInput}
                          value={cryptoAmount}
                          onChangeText={(t) => setCryptoAmount(normalizeAmountInput(t))}
                          keyboardType="decimal-pad"
                          placeholderTextColor="rgba(255,255,255,0.25)"
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeCrypto.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeCrypto.color }]}>
                            {activeCrypto.symbol}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.code}>{activeCrypto.code}</Text>
                          <Text style={s.sub}>{activeCrypto.name}</Text>
                        </View>
                      </View>
                      <View style={s.amountBox}>
                        <TextInput
                          style={s.amountInput}
                          value={cryptoAmount}
                          onChangeText={(t) => setCryptoAmount(normalizeAmountInput(t))}
                          keyboardType="decimal-pad"
                          placeholderTextColor="rgba(255,255,255,0.25)"
                        />
                      </View>
                    </>
                  )}
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>Tú Recibes</Text>
                <View style={s.row}>
                  {cryptoMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeCrypto.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeCrypto.color }]}>
                            {activeCrypto.symbol}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.code}>{activeCrypto.code}</Text>
                          <Text style={s.sub}>{activeCrypto.name}</Text>
                        </View>
                      </View>
                      <Text style={s.amountValue}>{fmtCrypto(cryptoReceive)}</Text>
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View>
                          <Text style={s.code}>{cryptoSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.name ?? "Peso Argentino"}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.amountValue}>
                        {(cryptoSendCurrency === "ARS" || cryptoSendCurrency === "JPY" || cryptoSendCurrency === "BRL")
                          ? fmtArs(Math.round(cryptoReceive))
                          : cryptoReceive.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        {cryptoSendCurrency}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Text style={s.rateText}>
                Precio:{" "}
                <Text style={s.rateHl}>
                  1 {activeCrypto.code} = {(cryptoSendCurrency === "ARS" || cryptoSendCurrency === "JPY" || cryptoSendCurrency === "BRL") ? fmtArs(Math.round(price)) : price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cryptoSendCurrency}
                </Text>
              </Text>

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [s.btnGreen, pressed && s.pressed]}
                >
                  <Text style={s.btnTxt}>
                    {cryptoMode === "comprar" ? "Comprar" : "Vender"} {activeCrypto.code}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.heading}>Criptomonedas Populares</Text>
            <View style={s.grid}>
              {cryptos.map((c) => {
                const up = c.trend >= 0;
                return (
                  <View key={c.code} style={s.gridCard}>
                    <View style={s.gridTop}>
                      <View
                        style={[
                          s.gridIcon,
                          { backgroundColor: `${c.color}20` },
                        ]}
                      >
                        <Text style={{ fontSize: 16, color: c.color }}>
                          {c.symbol}
                        </Text>
                      </View>
                      <TrendPill value={c.trend} />
                    </View>
                    <Text style={s.gridCode}>{c.code}</Text>
                    <Text style={s.gridName}>{c.name}</Text>
                    <View style={s.gridBottom}>
                      <Text style={s.gridPrice}>
                        {cryptoSendCurrency === "ARS" || cryptoSendCurrency === "JPY" || cryptoSendCurrency === "BRL"
                          ? fmtArs(Math.round(c.priceArs))
                          : c.priceArs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        {cryptoSendCurrency}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.2)" />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ════════════ ACCIONES ════════════ */}
        {activeTab === "acciones" && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Comprar Acciones</Text>
              <Text style={s.cardSub}>
                Invertí en las principales empresas del mundo.
              </Text>

              {/* Stock selector chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipScroll}
                contentContainerStyle={s.chipRow}
              >
                {STOCKS.map((st, i) => (
                  <Pressable
                    key={st.ticker}
                    style={[
                      s.chip,
                      selectedStock === i && {
                        backgroundColor: `${st.color}22`,
                        borderColor: `${st.color}66`,
                      },
                    ]}
                    onPress={() => setSelectedStock(i)}
                  >
                    <View
                      style={[s.chipDot, { backgroundColor: st.color }]}
                    >
                      <Text style={s.chipSymbol}>{st.letter}</Text>
                    </View>
                    <Text
                      style={[
                        s.chipLabel,
                        selectedStock === i && { color: "#fff" },
                      ]}
                    >
                      {st.ticker}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={s.section}>
                <Text style={s.label}>Tú Invertís</Text>
                <View style={s.row}>
                  <View style={s.rowLeft}>
                    <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                      <Text style={s.emoji}>🇦🇷</Text>
                    </View>
                    <View>
                      <Text style={s.code}>ARS</Text>
                      <Text style={s.sub}>Peso Argentino</Text>
                    </View>
                  </View>
                  <View style={s.amountBox}>
                    <TextInput
                      style={s.amountInput}
                      value={stockAmount}
                      onChangeText={(t) => setStockAmount(normalizeAmountInput(t))}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>Cantidad Estimada</Text>
                <View style={s.row}>
                  <View style={s.rowLeft}>
                    <View
                      style={[
                        s.circle,
                        { backgroundColor: `${activeStock.color}20` },
                      ]}
                    >
                      <Text
                        style={[
                          s.symbolText,
                          { color: activeStock.color, fontWeight: "800" },
                        ]}
                      >
                        {activeStock.letter}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.code}>{activeStock.ticker}</Text>
                      <Text style={s.sub}>{activeStock.name}</Text>
                    </View>
                  </View>
                  <Text style={s.amountValue}>
                    {stockShares.toFixed(2)} acc.
                  </Text>
                </View>
              </View>

              <Text style={s.rateText}>
                Precio por acción:{" "}
                <Text style={s.rateHl}>
                  1 {activeStock.ticker} = {fmtArs(activeStock.priceArs)} ARS
                </Text>
              </Text>

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [s.btnGreen, pressed && s.pressed]}
                >
                  <Text style={s.btnTxt}>Comprar {activeStock.ticker}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.btnRed, pressed && s.pressed]}
                >
                  <Text style={s.btnTxt}>Vender {activeStock.ticker}</Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.heading}>Acciones Populares</Text>
            <View style={s.grid}>
              {STOCKS.map((st) => {
                const up = st.trend >= 0;
                return (
                  <View key={st.ticker} style={s.gridCard}>
                    <View style={s.gridTop}>
                      <View
                        style={[
                          s.gridIcon,
                          { backgroundColor: `${st.color}20` },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: st.color,
                          }}
                        >
                          {st.letter}
                        </Text>
                      </View>
                      <TrendPill value={st.trend} />
                    </View>
                    <Text style={s.gridCode}>{st.ticker}</Text>
                    <Text style={s.gridName}>{st.name}</Text>
                    <View style={s.gridBottom}>
                      <Text style={s.gridPrice}>
                        {fmtArs(st.priceArs)} ARS
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.2)" />
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

/* ── Shared tiny component ── */

function TrendPill({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <View
      style={[
        s.trend,
        {
          backgroundColor: up
            ? "rgba(74,222,128,0.12)"
            : "rgba(239,68,68,0.12)",
        },
      ]}
    >
      <Ionicons
        name={up ? "trending-up" : "trending-down"}
        size={12}
        color={up ? "#4ADE80" : "#EF4444"}
      />
      <Text style={[s.trendTxt, { color: up ? "#4ADE80" : "#EF4444" }]}>
        {up ? "+" : ""}
        {value.toFixed(2)}%
      </Text>
    </View>
  );
}

/* ── Styles ── */

const CARD_BG = "#111B16";
const BORDER = "rgba(255,255,255,0.06)";
const DIM = "rgba(255,255,255,0.35)";

const shadow = Platform.select({
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

  /* Tabs */
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 22,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabPillActive: {
    backgroundColor: "rgba(31,167,116,0.15)",
    borderColor: "rgba(31,167,116,0.4)",
  },
  tabLabel: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" },
  tabLabelActive: { color: "#fff" },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  /* Card (shared) */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4, marginBottom: 4 },
  cryptoErrorText: { color: "#EF4444", fontSize: 12, marginBottom: 12 },

  modeToggleRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeToggleBtnActive: {
    backgroundColor: "rgba(31,167,116,0.15)",
    borderColor: "rgba(31,167,116,0.4)",
  },
  modeToggleText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "600" },
  modeToggleTextActive: { color: "#fff" },

  /* Chip selector (cripto & acciones) */
  chipScroll: { marginBottom: 18, marginHorizontal: -22 },
  chipRow: { paddingHorizontal: 22, gap: 8 },

  /* Currency selector (pagar con) */
  currencyChipScroll: { marginBottom: 14, marginHorizontal: -22 },
  currencyChipRow: { paddingHorizontal: 22, gap: 8 },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  currencyChipActive: {
    backgroundColor: "rgba(31,167,116,0.15)",
    borderColor: "rgba(31,167,116,0.4)",
  },
  currencyChipFlag: { fontSize: 18 },
  currencyChipCode: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  currencyChipCodeActive: { color: "#fff" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSymbol: { color: "#fff", fontSize: 11, fontWeight: "800" },
  chipLabel: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "600" },

  /* Sections */
  section: { marginVertical: 6 },
  label: {
    color: DIM,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 24 },
  symbolText: { fontSize: 20, fontWeight: "700" },
  code: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sub: { color: DIM, fontSize: 11, marginTop: 2, lineHeight: 14 },

  amountBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  amountInput: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
    minWidth: 80,
    padding: 0,
  },
  amountValue: { color: "#fff", fontSize: 24, fontWeight: "700" },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  rateText: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 18, marginBottom: 20 },
  rateHl: { color: "rgba(255,255,255,0.65)", fontWeight: "600" },

  /* Buttons */
  btnRow: { flexDirection: "row", gap: 12 },
  btnGreen: {
    flex: 1,
    backgroundColor: "rgba(31,167,116,0.12)",
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.35)",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnRed: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85 },

  /* Section heading */
  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 32,
    marginBottom: 16,
  },

  /* Grid cards (popular items) */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: "48%",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  gridTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  gridIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCode: { color: "#fff", fontSize: 16, fontWeight: "700" },
  gridName: {
    color: DIM,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  gridBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridPrice: { color: "#1FA774", fontSize: 14, fontWeight: "700" },

  /* Trend pill */
  trend: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  trendTxt: { fontSize: 11, fontWeight: "700" },
});
