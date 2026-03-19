import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
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
import { autenticacionContext } from "../src/context/AutenticacionContext";
import { safeBack } from "../src/utils/navigation";
import * as cuentasService from "../src/Services/cuentas.service";
import * as tarjetasService from "../src/Services/tarjetas.service";

interface Tarjeta {
  id: number;
  cuentaId: number;
  ultimos4: string;
  marca: string;
  estado: "activa" | "bloqueada" | "cancelada";
  numeroCompleto?: string;
  numeroEnmascarado?: string;
  [key: string]: any;
}

interface Cuenta {
  id: number;
  alias: string;
  moneda: string;
  saldo: string;
}

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}

const GRADIENTS: [string, string][] = [
  ["#0e4430", "#1FA774"],
  ["#1a1a3e", "#3B82F6"],
  ["#2d1a3e", "#8B5CF6"],
];

export default function TarjetasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useContext(autenticacionContext);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [numeroVisible, setNumeroVisible] = useState<Record<number, boolean>>({});
  const [detalleTarjeta, setDetalleTarjeta] = useState<Record<number, Tarjeta | null>>({});

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tarjetasRes, cuentasRes] = await Promise.all([
        tarjetasService.getTarjetas(token),
        cuentasService.getCuentas(token),
      ]);
      const raw = Array.isArray(tarjetasRes) ? tarjetasRes : (tarjetasRes.items ?? tarjetasRes.tarjetas ?? tarjetasRes.data ?? []);
      const list = (raw || []).map((t: any) => ({
        id: t.id,
        cuentaId: t.cuentaId ?? t.cuenta_id,
        ultimos4: String(t.ultimos4 ?? t.ultimos_4 ?? ""),
        marca: t.marca ?? "mastercard",
        estado: t.estado ?? "activa",
        numeroCompleto: t.numeroCompleto ?? t.numero_completo,
        numeroEnmascarado: t.numeroEnmascarado ?? t.numero_enmascarado,
        ...t,
      }));
      setTarjetas(list);
      setCuentas(cuentasRes.items ?? cuentasRes.data ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudieron cargar las tarjetas");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCuentaByTarjeta = (cuentaId: number) =>
    cuentas.find((c) => c.id === cuentaId);
  const getSaldo = (cuentaId: number) => {
    const c = getCuentaByTarjeta(cuentaId);
    return c ? parseFloat(c.saldo) || 0 : 0;
  };
  const cuentasSinTarjeta = cuentas.filter(
    (c) => !tarjetas.some((t) => t.cuentaId === c.id && t.estado !== "cancelada")
  );

  const handleCrear = async (cuentaId: number) => {
    if (!token) return;
    setCreating(true);
    try {
      await tarjetasService.crearTarjeta(token, cuentaId);
      setShowCreate(false);
      await fetchData();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo crear la tarjeta");
    } finally {
      setCreating(false);
    }
  };

  const toggleNumero = async (card: Tarjeta) => {
    const show = !numeroVisible[card.id];
    setNumeroVisible((v) => ({ ...v, [card.id]: show }));
    if (show && !card.numeroCompleto && token) {
      try {
        const detalle = await tarjetasService.getTarjeta(token, card.id);
        const num = detalle.numeroCompleto ?? detalle.numero_completo;
        if (num) {
          setDetalleTarjeta((d) => ({ ...d, [card.id]: { ...card, numeroCompleto: num } }));
        }
      } catch {
        // no se pudo obtener
      }
    }
  };

  const getNumeroDisplay = (card: Tarjeta) => {
    const full = card.numeroCompleto ?? detalleTarjeta[card.id]?.numeroCompleto;
    if (numeroVisible[card.id] && full) {
      return full.replace(/(\d{4})(?=\d)/g, "$1 ");
    }
    return `**** **** **** ${card.ultimos4}`;
  };

  const [detalleAbierto, setDetalleAbierto] = useState<Tarjeta | null>(null);

  const abrirDetalle = async (card: Tarjeta) => {
    const cached = detalleTarjeta[card.id];
    if (cached) {
      setDetalleAbierto(cached);
      return;
    }
    if (card.numeroCompleto) {
      setDetalleAbierto(card);
      return;
    }
    if (!token) return;
    try {
      const det = await tarjetasService.getTarjeta(token, card.id);
      const full = { ...card, ...det };
      setDetalleTarjeta((d) => ({ ...d, [card.id]: full }));
      setDetalleAbierto(full);
    } catch {
      setDetalleAbierto(card);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/home")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Tarjetas</Text>
        <Pressable
          hitSlop={8}
          onPress={() => setShowCreate(true)}
          disabled={cuentasSinTarjeta.length === 0}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={cuentasSinTarjeta.length > 0 ? "#1FA774" : "rgba(255,255,255,0.3)"}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#1FA774" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {tarjetas.filter((t) => t.estado !== "cancelada").length === 0 && !showCreate ? (
            <View style={s.emptyState}>
              <Ionicons name="card-outline" size={64} color="rgba(255,255,255,0.3)" />
              <Text style={s.emptyTitle}>No tenés tarjetas</Text>
              <Text style={s.emptySub}>
                Creá una tarjeta virtual desde una de tus cuentas
              </Text>
              {cuentasSinTarjeta.length > 0 && (
                <Pressable style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                  <Text style={s.emptyBtnText}>Crear tarjeta</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {tarjetas
                .filter((t) => t.estado !== "cancelada")
                .map((card, idx) => {
                  const gradient = GRADIENTS[idx % GRADIENTS.length];
                  const saldo = getSaldo(card.cuentaId);
                  const isBlocked = card.estado === "bloqueada";

                  return (
                    <LinearGradient
                      key={card.id}
                      colors={gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.cardVisual}
                    >
                      {isBlocked && (
                        <View style={s.frozenBadge}>
                          <Ionicons name="snow" size={12} color="#60A5FA" />
                          <Text style={s.frozenText}>Pausada</Text>
                        </View>
                      )}
                      <View style={s.cardTop}>
                        <Text style={s.cardLabel}>
                          {getCuentaByTarjeta(card.cuentaId)?.moneda || "—"}
                        </Text>
                        <Text style={s.cardNetwork}>
                          {(card.marca || "mastercard").toUpperCase()}
                        </Text>
                      </View>
                      <View style={s.cardNumberRow}>
                        <Text style={s.cardNumber}> {getNumeroDisplay(card)}</Text>
                        <Pressable
                          onPress={() => toggleNumero(card)}
                          hitSlop={12}
                          style={s.eyeBtn}
                        >
                          <Ionicons
                            name={numeroVisible[card.id] ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color="rgba(255,255,255,0.6)"
                          />
                        </Pressable>
                      </View>
                      <View style={s.cardBottom}>
                        <View>
                          <Text style={s.cardBalLabel}>Saldo disponible</Text>
                          <Text style={s.cardBal}>${fmtArs(saldo)}</Text>
                        </View>
                      </View>
                      <Pressable
                        style={s.cardActionBtn}
                        onPress={() => abrirDetalle(card)}
                      >
                        <Ionicons name="information-circle-outline" size={18} color="#fff" />
                        <Text style={s.cardActionText}>Ver datos</Text>
                      </Pressable>
                    </LinearGradient>
                  );
                })}
            </>
          )}
        </ScrollView>
      )}

      {detalleAbierto && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Datos de la tarjeta</Text>
            <View style={s.detalleList}>
              {[
                { key: "Número", val: detalleAbierto.numeroCompleto ?? detalleTarjeta[detalleAbierto.id]?.numeroCompleto ?? "—" },
                { key: "Últimos 4", val: detalleAbierto.ultimos4 },
                { key: "Marca", val: detalleAbierto.marca },
                { key: "Estado", val: detalleAbierto.estado },
                { key: "CVV", val: detalleAbierto.cvv ?? detalleAbierto.CVV ?? "—" },
                { key: "Vencimiento", val: detalleAbierto.vencimiento ?? detalleAbierto.fechaVencimiento ?? detalleAbierto.expiry ?? "—" },
              ].map(({ key, val }) => (
                <View key={key} style={s.detalleRow}>
                  <Text style={s.detalleKey}>{key}</Text>
                  <Text style={s.detalleVal}>{String(val ?? "—")}</Text>
                </View>
              ))}
            </View>
            <Pressable style={s.modalCancel} onPress={() => setDetalleAbierto(null)}>
              <Text style={s.modalCancelText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showCreate && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Crear tarjeta virtual</Text>
            <Text style={s.modalSub}>
              Elegí la cuenta desde la que se debitarán los pagos
            </Text>
            {cuentasSinTarjeta.map((c) => (
              <Pressable
                key={c.id}
                style={s.modalOption}
                onPress={() => handleCrear(c.id)}
                disabled={creating}
              >
                <Text style={s.modalOptionText}>
                  {c.moneda} · {c.alias}
                </Text>
                <Text style={s.modalOptionSaldo}>
                  ${fmtArs(parseFloat(c.saldo) || 0)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={s.modalCancel}
              onPress={() => setShowCreate(false)}
              disabled={creating}
            >
              <Text style={s.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 16 },
  emptySub: {
    color: DIM,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: "#1FA774",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  cardVisual: {
    borderRadius: 22,
    padding: 24,
    marginBottom: 16,
    minHeight: 180,
    justifyContent: "space-between",
    ...shadow,
  },
  frozenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(96,165,250,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  frozenText: { color: "#60A5FA", fontSize: 11, fontWeight: "700" },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" },
  cardNetwork: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cardNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 2,
    flex: 1,
  },
  eyeBtn: { padding: 4 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardBalLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 2 },
  cardBal: { color: "#fff", fontSize: 22, fontWeight: "800" },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  cardActionText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalSub: { color: DIM, fontSize: 14, marginBottom: 20 },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalOptionText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOptionSaldo: { color: "#1FA774", fontSize: 15, fontWeight: "700" },
  modalCancel: { paddingVertical: 16, alignItems: "center" },
  modalCancelText: { color: DIM, fontSize: 16, fontWeight: "600" },

  detalleList: { marginBottom: 20 },
  detalleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  detalleKey: { color: DIM, fontSize: 14, fontWeight: "500" },
  detalleVal: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
