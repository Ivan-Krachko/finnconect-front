import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface Contact {
  id: string;
  name: string;
  alias: string;
  initials: string;
  color: string;
}

const RECENT_CONTACTS: Contact[] = [
  { id: "1", name: "Martín López", alias: "martin.lopez", initials: "ML", color: "#3B82F6" },
  { id: "2", name: "Ana Ruiz", alias: "ana.ruiz.fin", initials: "AR", color: "#8B5CF6" },
  { id: "3", name: "Carlos Díaz", alias: "cdiaz.pay", initials: "CD", color: "#F59E0B" },
  { id: "4", name: "Lucía Fernández", alias: "lu.fernandez", initials: "LF", color: "#EC4899" },
  { id: "5", name: "Pedro Sánchez", alias: "pedro.s", initials: "PS", color: "#1FA774" },
];

const HISTORY = [
  { id: "h1", name: "Martín López", amount: 45000, date: "Hoy, 14:32", type: "out" as const },
  { id: "h2", name: "Ana Ruiz", amount: 12500, date: "Ayer, 09:15", type: "in" as const },
  { id: "h3", name: "Carlos Díaz", amount: 8000, date: "28 Sept, 18:40", type: "out" as const },
  { id: "h4", name: "Lucía Fernández", amount: 150000, date: "25 Sept, 11:22", type: "in" as const },
];

function fmtArs(n: number) {
  return new Intl.NumberFormat("es-AR").format(n);
}

export default function TransferenciasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filtered = search
    ? RECENT_CONTACTS.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.alias.toLowerCase().includes(search.toLowerCase()),
      )
    : RECENT_CONTACTS;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Transferir</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Search / Alias */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Destinatario</Text>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={18} color={DIM} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar por nombre o alias"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <Text style={s.subLabel}>Contactos Recientes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.contactsScroll}>
            {filtered.map((c) => {
              const sel = selectedContact?.id === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[s.contactChip, sel && { borderColor: "#1FA774" }]}
                  onPress={() => setSelectedContact(sel ? null : c)}
                >
                  <View style={[s.contactAvatar, { backgroundColor: `${c.color}25` }]}>
                    <Text style={[s.contactInitials, { color: c.color }]}>{c.initials}</Text>
                  </View>
                  <Text style={s.contactName} numberOfLines={1}>{c.name.split(" ")[0]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedContact && (
            <View style={s.selectedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
              <Text style={s.selectedText}>
                Para: <Text style={{ fontWeight: "700" }}>{selectedContact.name}</Text> ({selectedContact.alias})
              </Text>
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Monto</Text>
          <View style={s.amountRow}>
            <Text style={s.currency}>ARS</Text>
            <TextInput
              style={s.amountInput}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={amount}
              onChangeText={setAmount}
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
        </View>

        {/* Confirm */}
        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            (!selectedContact || !amount) && s.sendBtnDisabled,
            pressed && selectedContact && amount ? { opacity: 0.85 } : {},
          ]}
          disabled={!selectedContact || !amount}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={s.sendBtnText}>Enviar Transferencia</Text>
        </Pressable>

        {/* History */}
        <Text style={s.sectionHeading}>Historial de Transferencias</Text>
        <View style={s.historyCard}>
          {HISTORY.map((h, i) => {
            const isOut = h.type === "out";
            return (
              <View key={h.id} style={[s.historyRow, i < HISTORY.length - 1 && s.historyBorder]}>
                <View style={[s.historyIcon, { backgroundColor: isOut ? "rgba(239,68,68,0.12)" : "rgba(74,222,128,0.12)" }]}>
                  <Ionicons name={isOut ? "arrow-up" : "arrow-down"} size={18} color={isOut ? "#EF4444" : "#4ADE80"} />
                </View>
                <View style={s.historyInfo}>
                  <Text style={s.historyName}>{h.name}</Text>
                  <Text style={s.historyDate}>{h.date}</Text>
                </View>
                <Text style={[s.historyAmount, { color: isOut ? "#EF4444" : "#4ADE80" }]}>
                  {isOut ? "-" : "+"}${fmtArs(h.amount)}
                </Text>
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

  card: { backgroundColor: CARD_BG, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: BORDER, marginBottom: 16, ...shadow },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 },

  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingHorizontal: 14, height: 48, gap: 10, marginBottom: 18 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },

  subLabel: { color: DIM, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  contactsScroll: { marginHorizontal: -22, paddingHorizontal: 22, marginBottom: 4 },
  contactChip: { alignItems: "center", marginRight: 14, borderWidth: 2, borderColor: "transparent", borderRadius: 16, padding: 8, width: 72 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  contactInitials: { fontSize: 15, fontWeight: "800" },
  contactName: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", textAlign: "center" },

  selectedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(74,222,128,0.08)", borderRadius: 12, padding: 12, marginTop: 12 },
  selectedText: { color: "rgba(255,255,255,0.7)", fontSize: 13, flex: 1 },

  amountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  currency: { color: DIM, fontSize: 16, fontWeight: "700" },
  amountInput: { flex: 1, color: "#fff", fontSize: 32, fontWeight: "800", padding: 0 },
  quickAmounts: { flexDirection: "row", gap: 8 },
  quickBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  quickBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },

  sendBtn: { backgroundColor: "#1FA774", borderRadius: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 },
  sendBtnDisabled: { backgroundColor: "rgba(31,167,116,0.3)" },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  sectionHeading: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  historyCard: { backgroundColor: CARD_BG, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, ...shadow },
  historyRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1 },
  historyName: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 2 },
  historyDate: { color: DIM, fontSize: 12 },
  historyAmount: { fontSize: 15, fontWeight: "700" },
});
