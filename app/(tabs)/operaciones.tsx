import { Ionicons } from "@expo/vector-icons";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as accionesService from "../../src/Services/acciones.service";
import * as criptomonedasService from "../../src/Services/criptomonedas.service";
import * as cuentasService from "../../src/Services/cuentas.service";
import * as currencyConversionsService from "../../src/Services/currency-conversions.service";
import { STOCK_DISPLAY } from "../../src/constants/acciones";
import { CRYPTO_DISPLAY, CRYPTO_API_MAP } from "../../src/constants/criptomonedas";
import { parseAmount } from "../../src/utils/parseAmount";
import {
  formatCryptoQuantityEsAR,
  formatDecimalEsAR,
  formatFiatByCurrency,
  formatPercentValueEsAR,
  formatStockSharesEsAR,
} from "../../src/utils/formatNumber";

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
  tipoAccion: string;
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

/** Fallback si falla GET /acciones/prices (mismos instrumentos que el backend) */
const STOCKS_FALLBACK: Stock[] = [
  {
    tipoAccion: "apple",
    ticker: "AAPL",
    name: "Apple",
    letter: "A",
    color: "#A2AAAD",
    priceArs: 0,
    trend: 0,
  },
  {
    tipoAccion: "alphabet",
    ticker: "GOOGL",
    name: "Alphabet",
    letter: "G",
    color: "#4285F4",
    priceArs: 0,
    trend: 0,
  },
  {
    tipoAccion: "amazon",
    ticker: "AMZN",
    name: "Amazon",
    letter: "A",
    color: "#FF9900",
    priceArs: 0,
    trend: 0,
  },
  {
    tipoAccion: "microsoft",
    ticker: "MSFT",
    name: "Microsoft",
    letter: "M",
    color: "#00A4EF",
    priceArs: 0,
    trend: 0,
  },
  {
    tipoAccion: "nvidia",
    ticker: "NVDA",
    name: "NVIDIA",
    letter: "N",
    color: "#76B900",
    priceArs: 0,
    trend: 0,
  },
];

const POPULAR_CURRENCIES = CURRENCIES.filter((c) => c.code !== "ARS");

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "divisas", label: "Divisas", icon: "cash-outline" },
  { key: "cripto", label: "Cripto", icon: "logo-bitcoin" },
  { key: "acciones", label: "Acciones", icon: "analytics-outline" },
];

/** Normaliza input: si el teclado envía punto como decimal, mostramos coma (formato Argentina) */
function normalizeAmountInput(t: string): string {
  const lastPeriod = t.lastIndexOf(".");
  if (lastPeriod < 0) return t;
  const after = t.slice(lastPeriod + 1);
  if (after.length === 3 && /^\d{3}$/.test(after)) return t;
  return t.replace(/\./g, ",");
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
  const [fxSendCurrency, setFxSendCurrency] = useState("USD");
  const [fxReceiveCurrency, setFxReceiveCurrency] = useState("EUR");
  const [fxCuentas, setFxCuentas] = useState<{ id: number; moneda: string; alias: string; saldo: string }[]>([]);
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSubmitting, setFxSubmitting] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);

  const fxNumeric = parseAmount(fxAmount);
  const fxReceive = useMemo(() => {
    const code = (fxReceiveCurrency || "").toUpperCase();
    const r = fxRates;
    if (r[code] != null) return r[code];
    const hit = Object.entries(r).find(([k]) => k.toUpperCase() === code);
    return hit ? hit[1] : 0;
  }, [fxRates, fxReceiveCurrency]);
  const fxRate = fxNumeric > 0 ? fxReceive / fxNumeric : 0;
  const cuentaOrigenFx = fxCuentas.find((c) => c.moneda === fxSendCurrency);
  const cuentaDestinoFx = fxCuentas.find((c) => c.moneda === fxReceiveCurrency);
  const saldoOrigen = cuentaOrigenFx ? parseFloat(cuentaOrigenFx.saldo) || 0 : 0;
  const canConvertFx =
    token &&
    cuentaOrigenFx &&
    cuentaDestinoFx &&
    cuentaOrigenFx.id !== cuentaDestinoFx.id &&
    fxNumeric > 0 &&
    saldoOrigen >= fxNumeric;

  useEffect(() => {
    if (!token || activeTab !== "divisas") return;
    cuentasService
      .getCuentas(token)
      .then((data) => {
        const items = data.items ?? data.data ?? [];
        setFxCuentas(items);
        if (items.length >= 2) {
          const moneda0 = items[0].moneda;
          const moneda1 = items.find((c: { moneda: string }) => c.moneda !== moneda0)?.moneda ?? items[1]?.moneda;
          setFxSendCurrency(moneda0);
          setFxReceiveCurrency(moneda1 ?? moneda0);
        } else if (items.length === 1) {
          setFxSendCurrency(items[0].moneda);
        }
      })
      .catch(() => setFxCuentas([]));
  }, [token, activeTab]);

  useEffect(() => {
    if (!token || activeTab !== "divisas" || !fxSendCurrency || fxNumeric <= 0) {
      setFxRates({});
      return;
    }
    setFxLoading(true);
    currencyConversionsService
      .getConvertRates(token, fxSendCurrency, fxNumeric)
      .then((res) => {
        const raw = res.rates ?? {};
        const normalized: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (typeof v === "number" && Number.isFinite(v)) {
            normalized[String(k).toUpperCase()] = v;
          }
        }
        setFxRates(normalized);
      })
      .catch(() => setFxRates({}))
      .finally(() => setFxLoading(false));
  }, [token, activeTab, fxSendCurrency, fxNumeric]);

  const handleConvertirDivisas = async () => {
    if (!token || !canConvertFx || !cuentaOrigenFx || !cuentaDestinoFx) return;
    setFxError(null);
    setFxSubmitting(true);
    try {
      const res = await currencyConversionsService.convertirMoneda(
        token,
        cuentaOrigenFx.id,
        cuentaDestinoFx.id,
        String(fxNumeric)
      );
      setFxAmount("");
      Alert.alert(
        "Conversión exitosa",
        `Recibís ${typeof res.montoDestino === "number" ? formatDecimalEsAR(res.montoDestino, 2, 2) : res.montoDestino} ${fxReceiveCurrency}`
      );
    } catch (e: any) {
      setFxError(e?.message || "No se pudo completar la conversión");
    } finally {
      setFxSubmitting(false);
    }
  };

  // Cripto state
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [cuentas, setCuentas] = useState<{ id: number; moneda: string; alias: string }[]>([]);
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const activeCrypto = cryptos[Math.min(selectedCrypto, cryptos.length - 1)] ?? CRYPTOS_FALLBACK[0];

  useEffect(() => {
    if (!token || (activeTab !== "cripto" && activeTab !== "acciones")) return;
    cuentasService
      .getCuentas(token)
      .then((data) => setCuentas(data.items || []))
      .catch(() => setCuentas([]));
  }, [token, activeTab]);

  useEffect(() => {
    if (selectedCrypto >= cryptos.length && cryptos.length > 0) {
      setSelectedCrypto(0);
    }
  }, [cryptos.length, selectedCrypto]);

  // Reset monto solo al cambiar lo que enviás: en comprar = moneda fiat; en vender = cripto elegida. Al cambiar modo, limpiar.
  useEffect(() => {
    setCryptoAmount("");
  }, [cryptoMode]);

  useEffect(() => {
    if (cryptoMode === "comprar") setCryptoAmount("");
  }, [cryptoSendCurrency, cryptoMode]);

  useEffect(() => {
    if (cryptoMode === "vender") setCryptoAmount("");
  }, [selectedCrypto, cryptoMode]);

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

  const cuentaCrypto = cuentas.find((c) => c.moneda === cryptoSendCurrency) ?? cuentas[0];
  const cantidadCripto = cryptoMode === "comprar" ? cryptoReceive : cryptoNumeric;
  const canConfirmCrypto =
    token &&
    cuentaCrypto &&
    cantidadCripto > 0 &&
    (CRYPTO_API_MAP[activeCrypto.code as keyof typeof CRYPTO_API_MAP] ||
      activeCrypto.code.toLowerCase());

  const handleCryptoConfirm = async () => {
    if (!token || !cuentaCrypto || !canConfirmCrypto || cryptoSubmitting) return;
    const tipoCripto =
      CRYPTO_API_MAP[activeCrypto.code as keyof typeof CRYPTO_API_MAP] ||
      activeCrypto.code.toLowerCase();
    const sentido = cryptoMode === "comprar" ? "egreso" : "ingreso";
    setCryptoSubmitting(true);
    try {
      const cantidadStr =
        cantidadCripto < 1e-6 ? cantidadCripto.toFixed(18) : String(cantidadCripto);
      await criptomonedasService.crearTransaccionCripto(
        token,
        cuentaCrypto.id,
        tipoCripto,
        sentido,
        cantidadStr
      );
      setCryptoAmount("");
      Alert.alert(
        "Operación exitosa",
        `${cryptoMode === "comprar" ? "Compra" : "Venta"} de ${activeCrypto.code} realizada correctamente.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo completar la operación");
    } finally {
      setCryptoSubmitting(false);
    }
  };

  // Acciones: precios API + holdings
  const [stocks, setStocks] = useState<Stock[]>(STOCKS_FALLBACK);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState<string | null>(null);
  const [stockSendCurrency, setStockSendCurrency] = useState("ARS");
  const [stockMode, setStockMode] = useState<"comprar" | "vender">("comprar");
  const [stockHoldings, setStockHoldings] = useState<Record<string, number>>({});
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockAmount, setStockAmount] = useState("");
  const [selectedStock, setSelectedStock] = useState(0);

  const fetchStockPrecios = useCallback(() => {
    if (!token) {
      setStocks(STOCKS_FALLBACK);
      setStocksLoading(false);
      return;
    }
    setStocksLoading(true);
    setStocksError(null);
    const convert = stockSendCurrency.toLowerCase();
    accionesService
      .getPreciosAcciones(token, convert)
      .then(
        (
          data: {
            tipo: string;
            symbol: string;
            name: string;
            price: number;
            percentChange24h: number | null;
          }[]
        ) => {
          const mapped: Stock[] = data.map((c) => {
            const display =
              STOCK_DISPLAY[c.symbol as keyof typeof STOCK_DISPLAY] ?? {
                letter: c.symbol.charAt(0),
                color: "#888",
              };
            return {
              tipoAccion: c.tipo,
              ticker: c.symbol,
              name: c.name,
              letter: display.letter,
              color: display.color,
              priceArs: c.price,
              trend: c.percentChange24h ?? 0,
            };
          });
          setStocks(mapped.length > 0 ? mapped : STOCKS_FALLBACK);
        }
      )
      .catch((err) => {
        setStocksError(err?.message || "Error al cargar precios");
        setStocks(STOCKS_FALLBACK);
      })
      .finally(() => setStocksLoading(false));
  }, [token, stockSendCurrency]);

  const fetchStockHoldings = useCallback(() => {
    if (!token) return;
    accionesService
      .getAcciones(token)
      .then((data) => {
        const map: Record<string, number> = {};
        for (const item of data.items) {
          const t = item.tipoAccion as string;
          if (t) map[t] = parseFloat(item.monto) || 0;
        }
        setStockHoldings(map);
      })
      .catch(() => setStockHoldings({}));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "acciones" || !token) return;
      fetchStockPrecios();
      fetchStockHoldings();
    }, [activeTab, token, fetchStockPrecios, fetchStockHoldings])
  );

  useEffect(() => {
    if (activeTab !== "acciones" || !token) return;
    fetchStockPrecios();
  }, [stockSendCurrency, activeTab, token, fetchStockPrecios]);

  const activeStock =
    stocks[Math.min(selectedStock, Math.max(0, stocks.length - 1))] ?? STOCKS_FALLBACK[0];
  const stockNumeric = parseAmount(stockAmount);
  const priceStock = activeStock.priceArs;
  const stockShares =
    stockMode === "comprar" && priceStock > 0 ? stockNumeric / priceStock : stockNumeric;
  const stockReceiveFiat =
    stockMode === "vender" && priceStock > 0 ? stockNumeric * priceStock : 0;

  useEffect(() => {
    if (selectedStock >= stocks.length && stocks.length > 0) {
      setSelectedStock(0);
    }
  }, [stocks.length, selectedStock]);

  useEffect(() => {
    setStockAmount("");
  }, [stockMode]);

  useEffect(() => {
    if (stockMode === "comprar") setStockAmount("");
  }, [stockSendCurrency, stockMode]);

  useEffect(() => {
    if (stockMode === "vender") setStockAmount("");
  }, [selectedStock, stockMode]);

  const cuentaStock = cuentas.find((c) => c.moneda === stockSendCurrency) ?? cuentas[0];
  const saldoStock = cuentaStock ? parseFloat(String(cuentaStock.saldo)) || 0 : 0;
  const titulosDisponibles = stockHoldings[activeStock.tipoAccion] ?? 0;

  const cantidadTitulosApi =
    stockMode === "comprar"
      ? stockShares
      : stockNumeric;

  const canConfirmStock =
    token &&
    cuentaStock &&
    activeStock.tipoAccion &&
    priceStock > 0 &&
    cantidadTitulosApi > 0 &&
    (stockMode === "comprar"
      ? saldoStock >= stockNumeric
      : titulosDisponibles >= stockNumeric);

  const handleStockConfirm = async () => {
    if (!token || !cuentaStock || !activeStock.tipoAccion || stockSubmitting) return;
    if (!canConfirmStock) return;
    const sentido = stockMode === "comprar" ? "egreso" : "ingreso";
    const qty = cantidadTitulosApi;
    if (qty <= 0) return;

    setStockSubmitting(true);
    try {
      const qtyStr =
        qty < 1e-6 ? qty.toFixed(8) : qty < 1 ? qty.toFixed(6) : String(Number(qty.toFixed(6)));
      await accionesService.crearTransaccionAccion(
        token,
        cuentaStock.id,
        activeStock.tipoAccion,
        sentido,
        qtyStr
      );
      setStockAmount("");
      await fetchStockHoldings();
      Alert.alert(
        "Operación exitosa",
        `${stockMode === "comprar" ? "Compra" : "Venta"} de ${activeStock.ticker} realizada correctamente.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo completar la operación");
    } finally {
      setStockSubmitting(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ width: 68 }} />
        <Text style={s.headerTitle}>Operaciones</Text>
        <View style={s.headerRight}>
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
                Convertí entre tus cuentas en distintas monedas.
              </Text>

              <View style={s.section}>
                <Text style={s.label}>Desde cuenta</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.currencyChipScroll}
                  contentContainerStyle={s.currencyChipRow}
                >
                  {fxCuentas.map((c) => {
                    const active = fxSendCurrency === c.moneda;
                    return (
                      <Pressable
                        key={c.id}
                        style={[s.currencyChip, active && s.currencyChipActive]}
                        onPress={() => {
                          if (c.moneda !== fxSendCurrency) {
                            setFxAmount("");
                          }
                          setFxSendCurrency(c.moneda);
                          if (c.moneda === fxReceiveCurrency) {
                            const otra = fxCuentas.find((x) => x.moneda !== c.moneda);
                            if (otra) setFxReceiveCurrency(otra.moneda);
                          }
                        }}
                      >
                        <Text style={s.currencyChipFlag}>
                          {CURRENCIES.find((x) => x.code === c.moneda)?.flag ?? "💱"}
                        </Text>
                        <Text style={[s.currencyChipCode, active && s.currencyChipCodeActive]}>
                          {c.moneda}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.section}>
                <Text style={s.label}>Tú Envías</Text>
                <View style={[s.row, s.fxAmountRow]}>
                  <View style={[s.rowLeft, s.fxRowLeft]}>
                    <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                      <Text style={s.emoji}>
                        {CURRENCIES.find((x) => x.code === fxSendCurrency)?.flag ?? "💱"}
                      </Text>
                    </View>
                    <View style={s.fxCurrencyMeta}>
                      <Text style={s.code} numberOfLines={1}>
                        {fxSendCurrency}
                      </Text>
                      <Text style={s.sub} numberOfLines={2}>
                        {CURRENCIES.find((x) => x.code === fxSendCurrency)?.name ?? fxSendCurrency}
                      </Text>
                    </View>
                  </View>
                  <View style={s.amountBox}>
                    <TextInput
                      style={s.amountInput}
                      value={fxAmount}
                      onChangeText={(t) => setFxAmount(normalizeAmountInput(t))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.25)"
                    />
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>A cuenta</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.currencyChipScroll}
                  contentContainerStyle={s.currencyChipRow}
                >
                  {fxCuentas
                    .filter((c) => c.moneda !== fxSendCurrency)
                    .map((c) => {
                      const active = fxReceiveCurrency === c.moneda;
                      return (
                        <Pressable
                          key={c.id}
                          style={[s.currencyChip, active && s.currencyChipActive]}
                          onPress={() => setFxReceiveCurrency(c.moneda)}
                        >
                          <Text style={s.currencyChipFlag}>
                            {CURRENCIES.find((x) => x.code === c.moneda)?.flag ?? "💱"}
                          </Text>
                          <Text style={[s.currencyChipCode, active && s.currencyChipCodeActive]}>
                            {c.moneda}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              </View>

              <View style={s.section}>
                <Text style={s.label}>Tú Recibes</Text>
                <View style={[s.row, s.fxAmountRow]}>
                  <View style={[s.rowLeft, s.fxRowLeft]}>
                    <View style={[s.circle, { backgroundColor: "#152533" }]}>
                      <Text style={s.emoji}>
                        {CURRENCIES.find((x) => x.code === fxReceiveCurrency)?.flag ?? "💱"}
                      </Text>
                    </View>
                    <View style={s.fxCurrencyMeta}>
                      <Text style={s.code} numberOfLines={1}>
                        {fxReceiveCurrency}
                      </Text>
                      <Text style={s.sub} numberOfLines={2}>
                        {CURRENCIES.find((x) => x.code === fxReceiveCurrency)?.name ?? fxReceiveCurrency}
                      </Text>
                    </View>
                  </View>
                  <View style={s.amountBox}>
                    {fxLoading ? (
                      <ActivityIndicator size="small" color="#1FA774" />
                    ) : (
                      <Text style={s.amountValue} numberOfLines={1} adjustsFontSizeToFit>
                        {formatFiatByCurrency(fxReceive, fxReceiveCurrency)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {fxNumeric > 0 && fxRate > 0 && (
                <Text style={s.rateText}>
                  Tasa:{" "}
                  <Text style={s.rateHl}>
                    1 {fxSendCurrency} = {formatFiatByCurrency(fxRate, fxReceiveCurrency)} {fxReceiveCurrency}
                  </Text>
                </Text>
              )}

              {fxError && (
                <View style={s.fxErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={s.fxErrorText}>{fxError}</Text>
                </View>
              )}

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [
                    s.btnGreen,
                    pressed && s.pressed,
                    (!canConvertFx || fxSubmitting) && s.btnDisabled,
                  ]}
                  onPress={handleConvertirDivisas}
                  disabled={!canConvertFx || fxSubmitting}
                >
                  {fxSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnTxt}>Convertir</Text>
                  )}
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
                      <Text style={s.gridPrice}>{formatFiatByCurrency(c.rateToArs, "ARS")} ARS</Text>
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
                <View style={s.amountBlock}>
                  {cryptoMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{cryptoSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.name ?? "Peso Argentino"}
                          </Text>
                        </View>
                      </View>
                      <TextInput
                        style={s.amountInputBlock}
                        value={cryptoAmount}
                        onChangeText={(t) => setCryptoAmount(normalizeAmountInput(t))}
                        keyboardType="decimal-pad"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                      />
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeCrypto.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeCrypto.color }]}>
                            {activeCrypto.symbol}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{activeCrypto.code}</Text>
                          <Text style={s.sub}>{activeCrypto.name}</Text>
                        </View>
                      </View>
                      <TextInput
                        style={s.amountInputBlock}
                        value={cryptoAmount}
                        onChangeText={(t) => setCryptoAmount(normalizeAmountInput(t))}
                        keyboardType="decimal-pad"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                      />
                    </>
                  )}
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>Tú Recibes</Text>
                <View style={s.amountBlock}>
                  {cryptoMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeCrypto.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeCrypto.color }]}>
                            {activeCrypto.symbol}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{activeCrypto.code}</Text>
                          <Text style={s.sub}>{activeCrypto.name}</Text>
                        </View>
                      </View>
                      <Text style={s.amountValueBlock}>{formatCryptoQuantityEsAR(cryptoReceive)}</Text>
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{cryptoSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === cryptoSendCurrency)?.name ?? "Peso Argentino"}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.amountValueBlock}>
                        {formatFiatByCurrency(cryptoReceive, cryptoSendCurrency)} {cryptoSendCurrency}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Text style={s.rateText}>
                Precio:{" "}
                <Text style={s.rateHl}>
                  1 {activeCrypto.code} = {formatFiatByCurrency(price, cryptoSendCurrency)} {cryptoSendCurrency}
                </Text>
              </Text>

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [
                    s.btnGreen,
                    pressed && s.pressed,
                    (!canConfirmCrypto || cryptoSubmitting) && s.btnDisabled,
                  ]}
                  onPress={handleCryptoConfirm}
                  disabled={!canConfirmCrypto || cryptoSubmitting}
                >
                  {cryptoSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnTxt}>
                      {cryptoMode === "comprar" ? "Comprar" : "Vender"} {activeCrypto.code}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={s.heading}>Criptomonedas Populares</Text>
            <View style={s.grid}>
              {cryptos.map((c) => {
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
                        {formatFiatByCurrency(c.priceArs, cryptoSendCurrency)} {cryptoSendCurrency}
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
              <View style={s.cardTitleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Acciones</Text>
                  <Text style={s.cardSub}>
                    Cotización vía API; comprá o vendé títulos debitando una cuenta en la moneda elegida.
                  </Text>
                </View>
                {stocksLoading && (
                  <ActivityIndicator size="small" color="#1FA774" style={{ marginTop: 4 }} />
                )}
              </View>
              {stocksError ? <Text style={s.cryptoErrorText}>{stocksError}</Text> : null}

              <View style={s.modeToggleRow}>
                <Pressable
                  style={[s.modeToggleBtn, stockMode === "comprar" && s.modeToggleBtnActive]}
                  onPress={() => setStockMode("comprar")}
                >
                  <Ionicons
                    name="trending-up"
                    size={18}
                    color={stockMode === "comprar" ? "#1FA774" : "rgba(255,255,255,0.35)"}
                  />
                  <Text style={[s.modeToggleText, stockMode === "comprar" && s.modeToggleTextActive]}>
                    Comprar
                  </Text>
                </Pressable>
                <Pressable
                  style={[s.modeToggleBtn, stockMode === "vender" && s.modeToggleBtnActive]}
                  onPress={() => setStockMode("vender")}
                >
                  <Ionicons
                    name="trending-down"
                    size={18}
                    color={stockMode === "vender" ? "#EF4444" : "rgba(255,255,255,0.35)"}
                  />
                  <Text style={[s.modeToggleText, stockMode === "vender" && s.modeToggleTextActive]}>
                    Vender
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipScroll}
                contentContainerStyle={s.chipRow}
              >
                {stocks.map((st, i) => (
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
                    <View style={[s.chipDot, { backgroundColor: st.color }]}>
                      <Text style={s.chipSymbol}>{st.letter}</Text>
                    </View>
                    <Text
                      style={[s.chipLabel, selectedStock === i && { color: "#fff" }]}
                    >
                      {st.ticker}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={s.section}>
                <Text style={s.label}>Cuenta / moneda</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.currencyChipScroll}
                  contentContainerStyle={s.currencyChipRow}
                >
                  {CURRENCIES.map((curr) => {
                    const active = stockSendCurrency === curr.code;
                    return (
                      <Pressable
                        key={curr.code}
                        style={[s.currencyChip, active && s.currencyChipActive]}
                        onPress={() => setStockSendCurrency(curr.code)}
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

              {stockMode === "vender" ? (
                <Text style={[s.rateText, { marginTop: 0, marginBottom: 12 }]}>
                  Títulos disponibles ({activeStock.ticker}):{" "}
                  <Text style={s.rateHl}>{formatStockSharesEsAR(titulosDisponibles)}</Text>
                </Text>
              ) : null}

              <View style={s.section}>
                <Text style={s.label}>{stockMode === "comprar" ? "Tú Invertís" : "Cantidad de títulos"}</Text>
                <View style={s.amountBlock}>
                  {stockMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === stockSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{stockSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === stockSendCurrency)?.name ?? "Moneda"}
                          </Text>
                        </View>
                      </View>
                      <TextInput
                        style={s.amountInputBlock}
                        value={stockAmount}
                        onChangeText={(t) => setStockAmount(normalizeAmountInput(t))}
                        keyboardType="decimal-pad"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                      />
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeStock.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeStock.color }]}>
                            {activeStock.letter}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{activeStock.ticker}</Text>
                          <Text style={s.sub}>{activeStock.name}</Text>
                        </View>
                      </View>
                      <TextInput
                        style={s.amountInputBlock}
                        value={stockAmount}
                        onChangeText={(t) => setStockAmount(normalizeAmountInput(t))}
                        keyboardType="decimal-pad"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                      />
                    </>
                  )}
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <Text style={s.label}>
                  {stockMode === "comprar" ? "Recibís (títulos)" : "Recibís (moneda)"}
                </Text>
                <View style={s.amountBlock}>
                  {stockMode === "comprar" ? (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: `${activeStock.color}20` }]}>
                          <Text style={[s.symbolText, { color: activeStock.color }]}>
                            {activeStock.letter}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{activeStock.ticker}</Text>
                          <Text style={s.sub}>{activeStock.name}</Text>
                        </View>
                      </View>
                      <Text style={s.amountValueBlock}>
                        {formatStockSharesEsAR(stockShares)} títulos
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={s.rowLeft}>
                        <View style={[s.circle, { backgroundColor: "#15332A" }]}>
                          <Text style={s.emoji}>
                            {CURRENCIES.find((c) => c.code === stockSendCurrency)?.flag ?? "🇦🇷"}
                          </Text>
                        </View>
                        <View style={s.currencyTextCol}>
                          <Text style={s.code}>{stockSendCurrency}</Text>
                          <Text style={s.sub}>
                            {CURRENCIES.find((c) => c.code === stockSendCurrency)?.name ?? "Moneda"}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.amountValueBlock}>
                        {formatFiatByCurrency(stockReceiveFiat, stockSendCurrency)} {stockSendCurrency}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Text style={s.rateText}>
                Precio:{" "}
                <Text style={s.rateHl}>
                  1 {activeStock.ticker} ={" "}
                  {formatFiatByCurrency(priceStock, stockSendCurrency)} {stockSendCurrency}
                </Text>
              </Text>

              <View style={s.btnRow}>
                <Pressable
                  style={({ pressed }) => [
                    stockMode === "comprar" ? s.btnGreen : s.btnRed,
                    pressed && s.pressed,
                    (!canConfirmStock || stockSubmitting) && s.btnDisabled,
                  ]}
                  onPress={handleStockConfirm}
                  disabled={!canConfirmStock || stockSubmitting}
                >
                  {stockSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnTxt}>
                      {stockMode === "comprar" ? "Comprar" : "Vender"} {activeStock.ticker}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={s.heading}>Mercado</Text>
            <View style={s.grid}>
              {stocks.map((st) => {
                return (
                  <View key={st.ticker} style={s.gridCard}>
                    <View style={s.gridTop}>
                      <View
                        style={[s.gridIcon, { backgroundColor: `${st.color}20` }]}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "800", color: st.color }}>
                          {st.letter}
                        </Text>
                      </View>
                      <TrendPill value={st.trend} />
                    </View>
                    <Text style={s.gridCode}>{st.ticker}</Text>
                    <Text style={s.gridName}>{st.name}</Text>
                    <View style={s.gridBottom}>
                      <Text style={s.gridPrice}>
                        {formatFiatByCurrency(st.priceArs, stockSendCurrency)} {stockSendCurrency}
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
        {formatPercentValueEsAR(value)}%
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
  fxErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  fxErrorText: { color: "#EF4444", fontSize: 14, fontWeight: "600", flex: 1 },

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
  /** Fila compacta solo en Divisas: moneda a la izquierda, monto a la derecha */
  fxAmountRow: {
    alignItems: "center",
    gap: 8,
  },
  fxRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  fxCurrencyMeta: {
    flex: 1,
    minWidth: 0,
  },
  currencyTextCol: { flex: 1, minWidth: 0 },
  amountBlock: { gap: 12 },
  amountInputBlock: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "right",
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  amountValueBlock: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "right",
    width: "100%",
    paddingVertical: 6,
  },
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

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 0,
    maxWidth: "46%",
  },
  amountInput: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "right",
    minWidth: 96,
    maxWidth: 200,
    padding: 0,
  },
  amountValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "right",
  },

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
  btnDisabled: { opacity: 0.5 },
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
