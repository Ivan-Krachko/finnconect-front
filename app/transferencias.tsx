import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import * as cuentasService from "../src/Services/cuentas.service";
import * as transferenciasService from "../src/Services/transferencias.service";
import { parseAmount } from "../src/utils/parseAmount";

function normalizeAmountInput(t: string): string {
  const lastPeriod = t.lastIndexOf(".");
  if (lastPeriod < 0) return t;
  const after = t.slice(lastPeriod + 1);
  if (after.length === 3 && /^\d{3}$/.test(after)) return t;
  return t.replace(/\./g, ",");
}

interface CuentaDestino {
  id: number;
  cvu: string;
  alias: string;
  moneda: string;
  saldo: string;
  usuarioId?: number;
  usuarioNombre?: string;
  usuarioApellido?: string;
  usuarioEmail?: string;
  usuarioDni?: string;
  usuarioGenero?: string;
}

interface Cuenta {
  id: number;
  cvu: string;
  alias: string;
  moneda: string;
  saldo: string;
}

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(n);
}

export default function TransferenciasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [step, setStep] = useState(1);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [aliasSearch, setAliasSearch] = useState("");
  const [cuentaDestino, setCuentaDestino] = useState<CuentaDestino | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    cuentasService
      .getCuentas(token)
      .then((data) => setCuentas(data.items || []))
      .catch(() => setCuentas([]));
  }, [token]);

  const cuentaOrigen = cuentaDestino
    ? cuentas.find((c) => c.moneda === cuentaDestino.moneda)
    : null;
  const canConfirm = cuentaOrigen && cuentaDestino && amount.trim();

  const handleSearchAlias = async () => {
    if (!token || !aliasSearch.trim()) return;
    setSearching(true);
    setCuentaDestino(null);
    setError(null);
    try {
      const data = await cuentasService.searchCuenta(token, aliasSearch.trim());
      setCuentaDestino(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Cuenta no encontrada");
      setCuentaDestino(null);
    } finally {
      setSearching(false);
    }
  };

  const handleTransferir = async () => {
    if (!token || !canConfirm || !cuentaOrigen) return;
    setError(null);
    setLoading(true);
    try {
      await transferenciasService.crearTransferencia(
        token,
        cuentaOrigen.id,
        cuentaDestino!.id,
        String(parseAmount(amount)),
      );
      router.back();
    } catch (e: any) {
      setError(e.message || "Error al transferir");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Transferir · Paso {step}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.stepIndicator}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[s.stepDot, step >= n && s.stepDotActive]} />
          ))}
        </View>

        {/* Paso 1: Buscar alias o CVU */}
        {step === 1 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>¿A quién transferís?</Text>
            <Text style={s.cardSubtitle}>Ingresá el alias o CVU de la cuenta destino</Text>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={20} color={DIM} />
              <TextInput
                style={s.searchInput}
                placeholder="Alias o CVU (ej: usuario.51.ars)"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={aliasSearch}
                onChangeText={(t) => {
                  setAliasSearch(t);
                  setCuentaDestino(null);
                  setError(null);
                }}
                onSubmitEditing={handleSearchAlias}
                returnKeyType="search"
                autoCapitalize="none"
              />
              <Pressable onPress={handleSearchAlias} disabled={searching || !aliasSearch.trim()} style={s.searchBtn}>
                {searching ? (
                  <ActivityIndicator size="small" color="#1FA774" />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color={aliasSearch.trim() ? "#1FA774" : DIM} />
                )}
              </Pressable>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[s.primaryBtn, !cuentaDestino && s.primaryBtnDisabled]}
              disabled={!cuentaDestino}
              onPress={() => setStep(2)}
            >
              <Text style={s.primaryBtnText}>Continuar</Text>
            </Pressable>
          </View>
        )}

        {/* Paso 2: Datos del destinatario */}
        {step === 2 && cuentaDestino && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Datos del destinatario</Text>
            <Text style={s.cardSubtitle}>Verificá que sea la cuenta correcta</Text>
            <View style={s.recipientCard}>
              <View style={s.recipientRow}>
                <Ionicons name="person" size={18} color={DIM} />
                <Text style={s.recipientValue}>
                  {[cuentaDestino.usuarioNombre, cuentaDestino.usuarioApellido].filter(Boolean).join(" ") || "—"}
                </Text>
              </View>
              <View style={s.recipientRow}>
                <Ionicons name="mail-outline" size={18} color={DIM} />
                <Text style={s.recipientValue}>{cuentaDestino.usuarioEmail || "—"}</Text>
              </View>
              <View style={s.recipientRow}>
                <Ionicons name="card-outline" size={18} color={DIM} />
                <Text style={s.recipientValue}>DNI {cuentaDestino.usuarioDni || "—"}</Text>
              </View>
              <View style={s.recipientDivider} />
              <View style={s.recipientRow}>
                <Ionicons name="wallet-outline" size={18} color={DIM} />
                <Text style={s.recipientValue}>{cuentaDestino.alias}</Text>
              </View>
              <View style={s.recipientRow}>
                <Ionicons name="key-outline" size={18} color={DIM} />
                <Text style={s.recipientValue}>{cuentaDestino.moneda} · CVU {cuentaDestino.cvu}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setCuentaDestino(null);
                setAliasSearch("");
                setStep(1);
              }}
              style={s.changeBtn}
            >
              <Ionicons name="swap-horizontal" size={14} color="#1FA774" />
              <Text style={s.changeBtnText}>Cambiar destinatario</Text>
            </Pressable>
            <Pressable style={s.primaryBtn} onPress={() => setStep(3)}>
              <Text style={s.primaryBtnText}>Continuar</Text>
            </Pressable>
          </View>
        )}

        {/* Paso 3: Monto */}
        {step === 3 && cuentaDestino && (
            <View style={s.card}>
            <Text style={s.cardTitle}>¿Cuánto transferís?</Text>
            <Text style={s.cardSubtitle}>
              A {[cuentaDestino.usuarioNombre, cuentaDestino.usuarioApellido].filter(Boolean).join(" ")} ({cuentaDestino.alias})
            </Text>
            <View style={s.amountRow}>
              <Text style={s.currency}>{cuentaDestino.moneda}</Text>
              <TextInput
                style={s.amountInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={amount}
                onChangeText={(t) => setAmount(normalizeAmountInput(t))}
                keyboardType="numeric"
              />
            </View>
            <View style={s.quickAmounts}>
              {[5000, 10000, 50000, 100000].map((v) => (
                <Pressable key={v} style={s.quickBtn} onPress={() => setAmount(String(v))}>
                  <Text style={s.quickBtnText}>${fmtArs(v)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[s.primaryBtn, !amount.trim() && s.primaryBtnDisabled]}
              disabled={!amount.trim()}
              onPress={() => setStep(4)}
            >
              <Text style={s.primaryBtnText}>Continuar</Text>
            </Pressable>
          </View>
        )}

        {/* Paso 4: Confirmar */}
        {step === 4 && cuentaDestino && (
          <View style={s.card}>
            {!cuentaOrigen ? (
              <>
                <Text style={s.cardTitle}>No podés transferir</Text>
                <Text style={s.cardSubtitle}>
                  No tenés una cuenta de ahorro en {cuentaDestino.moneda} para realizar esta transferencia.
                </Text>
                <Pressable style={s.primaryBtn} onPress={() => setStep(1)}>
                  <Text style={s.primaryBtnText}>Elegir otro destinatario</Text>
                </Pressable>
              </>
            ) : (
            <>
            <Text style={s.cardTitle}>Confirmar transferencia</Text>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Destinatario</Text>
              <Text style={s.confirmValue}>
                {[cuentaDestino.usuarioNombre, cuentaDestino.usuarioApellido].filter(Boolean).join(" ")} · {cuentaDestino.alias}
              </Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Monto</Text>
              <Text style={s.confirmValue}>
                {cuentaDestino.moneda === "ARS" ? "$" : cuentaDestino.moneda + " "}
                {new Intl.NumberFormat("es-AR").format(parseAmount(amount))}
              </Text>
            </View>
            <View style={s.deductBanner}>
              <Ionicons name="information-circle" size={22} color="#1FA774" />
              <Text style={s.deductText}>
                Se restará de tu cuenta de ahorro en {cuentaDestino.moneda} ({cuentaOrigen.alias})
              </Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                s.sendBtn,
                !canConfirm && s.sendBtnDisabled,
                pressed && canConfirm && !loading ? { opacity: 0.85 } : {},
              ]}
              disabled={!canConfirm || loading}
              onPress={handleTransferir}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={s.sendBtnText}>Confirmar transferencia</Text>
                </>
              )}
            </Pressable>
            </>
            )}
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

  stepIndicator: { flexDirection: "row", gap: 8, marginBottom: 24, justifyContent: "center" },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  stepDotActive: { backgroundColor: "#1FA774", width: 24 },

  card: { backgroundColor: CARD_BG, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: BORDER, marginBottom: 16, ...shadow },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  cardSubtitle: { color: DIM, fontSize: 13, marginBottom: 18 },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1FA774", borderRadius: 14, paddingVertical: 16, marginTop: 20 },
  primaryBtnDisabled: { backgroundColor: "rgba(31,167,116,0.3)" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  confirmRow: { marginBottom: 14 },
  confirmLabel: { color: DIM, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  confirmValue: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deductBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(31,167,116,0.12)", borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 20 },
  deductText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "500", flex: 1 },

  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10 },
  searchInput: { flex: 1, color: "#fff", fontSize: 15 },
  searchBtn: { padding: 4 },
  recipientCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)" },
  recipientTitle: { color: DIM, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  recipientValue: { color: "#fff", fontSize: 14, fontWeight: "500", flex: 1 },
  recipientDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 12 },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, alignSelf: "flex-start" },
  changeBtnText: { color: "#1FA774", fontSize: 13, fontWeight: "600" },

  amountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  currency: { color: DIM, fontSize: 16, fontWeight: "700" },
  amountInput: { flex: 1, color: "#fff", fontSize: 32, fontWeight: "800", padding: 0 },
  quickAmounts: { flexDirection: "row", gap: 8 },
  quickBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  quickBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600", flex: 1 },

  sendBtn: { backgroundColor: "#1FA774", borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sendBtnDisabled: { backgroundColor: "rgba(31,167,116,0.3)" },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
