import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../src/context/AutenticacionContext";
import { safeBack } from "../src/utils/navigation";
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

export default function CobrarQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useContext(autenticacionContext);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [selectedCuenta, setSelectedCuenta] = useState<Cuenta | null>(null);
  const [monto, setMonto] = useState("");
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    cuentasService
      .getCuentas(token)
      .then((data) => {
        const items = data.items || [];
        setCuentas(items);
        if (items.length > 0 && !selectedCuenta) {
          const ars = items.find((c: Cuenta) => c.moneda === "ARS") ?? items[0];
          setSelectedCuenta(ars);
        }
      })
      .catch(() => setCuentas([]));
  }, [token]);

  const montoNum = parseAmount(monto);
  const canGenerate = token && selectedCuenta && montoNum > 0;

  const handleGenerar = useCallback(() => {
    if (!selectedCuenta || !canGenerate) return;
    setError(null);
    const data = transferenciasService.generarQrCobro({
      alias: selectedCuenta.alias,
      monto: String(montoNum),
      moneda: selectedCuenta.moneda,
    });
    setQrData(data);
  }, [selectedCuenta, montoNum, canGenerate]);

  const handleNuevo = useCallback(() => {
    setQrData(null);
    setMonto("");
  }, []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => safeBack(router, "/(tabs)/pagos")} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Cobrar con QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!qrData ? (
          <>
            <Text style={s.subtitle}>
              Generá un código QR para que te transfieran un monto predeterminado
            </Text>

            <Text style={s.label}>Cuenta para recibir</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.cuentasScroll}
              contentContainerStyle={s.cuentasRow}
            >
              {cuentas.map((c) => {
                const active = selectedCuenta?.id === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[s.cuentaChip, active && s.cuentaChipActive]}
                    onPress={() => setSelectedCuenta(c)}
                  >
                    <Text style={[s.cuentaChipText, active && s.cuentaChipTextActive]}>
                      {c.moneda} · {c.alias}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={s.label}>Monto a cobrar</Text>
            <View style={s.inputRow}>
              <Text style={s.currencySymbol}>
                {selectedCuenta?.moneda === "ARS" ? "$" : selectedCuenta?.moneda + " "}
              </Text>
              <TextInput
                style={s.amountInput}
                value={monto}
                onChangeText={(t) => setMonto(normalizeAmountInput(t))}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
              />
            </View>

            {error && <Text style={s.errorText}>{error}</Text>}

            <Pressable
              style={[s.btn, !canGenerate && s.btnDisabled]}
              onPress={handleGenerar}
              disabled={!canGenerate}
            >
              <Text style={s.btnText}>Generar QR</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.qrCard}>
              <View style={s.qrWrapper}>
                <QRCode
                  value={qrData}
                  size={220}
                  color="#000"
                  backgroundColor="#fff"
                  logo={undefined}
                />
              </View>
              <Text style={s.qrAmount}>
                {selectedCuenta?.moneda === "ARS" ? "$" : ""}
                {fmtArs(montoNum)}
                {selectedCuenta?.moneda !== "ARS" ? ` ${selectedCuenta?.moneda}` : ""}
              </Text>
              <Text style={s.qrAlias}>Alias: {selectedCuenta?.alias}</Text>
              <Text style={s.qrHint}>Que alguien escanee este QR para transferirte</Text>
            </View>

            <Pressable style={[s.btn, s.btnSecondary]} onPress={handleNuevo}>
              <Text style={s.btnText}>Generar otro QR</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const CARD_BG = "#111B16";
const BORDER = "rgba(255,255,255,0.06)";

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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  cuentasScroll: { marginHorizontal: -20, marginBottom: 20 },
  cuentasRow: { paddingHorizontal: 20, gap: 10 },
  cuentaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cuentaChipActive: {
    backgroundColor: "rgba(31,167,116,0.2)",
    borderColor: "rgba(31,167,116,0.5)",
  },
  cuentaChipText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" },
  cuentaChipTextActive: { color: "#fff" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: { color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: "600", marginRight: 8 },
  amountInput: {
    flex: 1,
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 16,
  },
  errorText: { color: "#EF4444", fontSize: 14, marginBottom: 12 },
  btn: {
    backgroundColor: "#1FA774",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    backgroundColor: "rgba(31,167,116,0.2)",
    borderWidth: 1,
    borderColor: "rgba(31,167,116,0.5)",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  qrCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
  },
  qrAmount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  qrAlias: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 8,
  },
  qrHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
});
