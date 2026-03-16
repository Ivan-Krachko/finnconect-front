import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

interface Card {
  id: string;
  type: "debito" | "credito";
  label: string;
  last4: string;
  balance: number;
  gradient: [string, string];
  network: string;
  status: "activa" | "congelada";
}

const CARDS: Card[] = [
  { id: "1", type: "debito", label: "Tarjeta Principal", last4: "4523", balance: 3596000, gradient: ["#0e4430", "#1FA774"], network: "Visa", status: "activa" },
  { id: "2", type: "credito", label: "Crédito Premium", last4: "8891", balance: 1250000, gradient: ["#1a1a3e", "#3B82F6"], network: "Mastercard", status: "activa" },
  { id: "3", type: "debito", label: "Tarjeta Ahorro", last4: "7102", balance: 480000, gradient: ["#2d1a3e", "#8B5CF6"], network: "Visa", status: "congelada" },
];

const RECENT_MOVEMENTS = [
  { id: "m1", desc: "Mercado Libre", card: "•••• 4523", amount: -45200, date: "Hoy" },
  { id: "m2", desc: "Spotify", card: "•••• 8891", amount: -2499, date: "Ayer" },
  { id: "m3", desc: "Amazon Prime", card: "•••• 8891", amount: -4999, date: "28 Sept" },
  { id: "m4", desc: "Farmacia", card: "•••• 4523", amount: -8750, date: "27 Sept" },
];

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.abs(n));
}

export default function TarjetasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Tarjetas</Text>
        <Pressable hitSlop={8}>
          <Ionicons name="add-circle-outline" size={24} color="#1FA774" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Cards */}
        {CARDS.map((card) => (
          <LinearGradient
            key={card.id}
            colors={card.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cardVisual}
          >
            {card.status === "congelada" && (
              <View style={s.frozenBadge}>
                <Ionicons name="snow" size={12} color="#60A5FA" />
                <Text style={s.frozenText}>Congelada</Text>
              </View>
            )}
            <View style={s.cardTop}>
              <Text style={s.cardLabel}>{card.label}</Text>
              <Text style={s.cardNetwork}>{card.network}</Text>
            </View>
            <Text style={s.cardNumber}>•••• •••• •••• {card.last4}</Text>
            <View style={s.cardBottom}>
              <View>
                <Text style={s.cardBalLabel}>Saldo disponible</Text>
                <Text style={s.cardBal}>${fmtArs(card.balance)}</Text>
              </View>
              <View style={s.cardType}>
                <Text style={s.cardTypeText}>{card.type === "debito" ? "Débito" : "Crédito"}</Text>
              </View>
            </View>
          </LinearGradient>
        ))}

        {/* Quick actions */}
        <View style={s.actionsRow}>
          {(
            [
              { icon: "snow-outline" as const, label: "Congelar" },
              { icon: "settings-outline" as const, label: "Ajustes" },
              { icon: "eye-outline" as const, label: "Detalles" },
              { icon: "copy-outline" as const, label: "Copiar N°" },
            ] as const
          ).map((a) => (
            <Pressable key={a.label} style={s.actionBtn}>
              <View style={s.actionCircle}>
                <Ionicons name={a.icon} size={20} color="#1FA774" />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Movements */}
        <Text style={s.sectionHeading}>Movimientos Recientes</Text>
        <View style={s.listCard}>
          {RECENT_MOVEMENTS.map((m, i) => (
            <View key={m.id} style={[s.row, i < RECENT_MOVEMENTS.length - 1 && s.rowBorder]}>
              <View style={s.movIcon}>
                <Ionicons name="card-outline" size={18} color="#F87171" />
              </View>
              <View style={s.movInfo}>
                <Text style={s.movDesc}>{m.desc}</Text>
                <Text style={s.movCard}>{m.card} · {m.date}</Text>
              </View>
              <Text style={s.movAmount}>-${fmtArs(m.amount)}</Text>
            </View>
          ))}
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

  cardVisual: { borderRadius: 22, padding: 24, marginBottom: 16, minHeight: 180, justifyContent: "space-between", ...shadow },
  frozenBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(96,165,250,0.15)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  frozenText: { color: "#60A5FA", fontSize: 11, fontWeight: "700" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" },
  cardNetwork: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  cardNumber: { color: "#fff", fontSize: 20, fontWeight: "600", letterSpacing: 3, marginBottom: 20 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardBalLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 2 },
  cardBal: { color: "#fff", fontSize: 22, fontWeight: "800" },
  cardType: { backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  cardTypeText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },

  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28, marginTop: 4 },
  actionBtn: { alignItems: "center", flex: 1 },
  actionCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(31,167,116,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  actionLabel: { color: DIM, fontSize: 11, fontWeight: "600" },

  sectionHeading: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  listCard: { backgroundColor: CARD_BG, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, ...shadow },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  movIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(248,113,113,0.1)", alignItems: "center", justifyContent: "center" },
  movInfo: { flex: 1 },
  movDesc: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 2 },
  movCard: { color: DIM, fontSize: 12 },
  movAmount: { color: "#F87171", fontSize: 15, fontWeight: "700" },
});
