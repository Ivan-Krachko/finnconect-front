import { Ionicons } from "@expo/vector-icons";
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

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ── Data ── */

type PaymentStatus = "completado" | "pendiente" | "fallido";

interface Payment {
  id: string;
  company: string;
  description: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  icon: IconName;
  color: string;
}

interface QuickAction {
  icon: IconName;
  label: string;
  color: string;
  bg: string;
  route?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "qr-code-outline",
    label: "Pagar con QR",
    color: "#1FA774",
    bg: "rgba(31,167,116,0.15)",
    route: "/pagar-qr",
  },
  {
    icon: "flash",
    label: "Pagar Servicio",
    color: "#1FA774",
    bg: "rgba(31,167,116,0.15)",
  },
  {
    icon: "cube-outline",
    label: "Pagar con NFT",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.15)",
  },
];

const PAYMENTS: Payment[] = [
  {
    id: "1",
    company: "Netflix Inc.",
    description: "Suscripción Mensual",
    amount: 15123.99,
    date: "24 de Octubre",
    status: "completado",
    icon: "play-circle",
    color: "#E50914",
  },
  {
    id: "2",
    company: "Starbucks Coffee",
    description: "Café de la Mañana",
    amount: 4143.5,
    date: "23 de Octubre",
    status: "completado",
    icon: "cafe",
    color: "#00704A",
  },
  {
    id: "3",
    company: "Tienda de Juegos",
    description: "Compra de Activo Digital",
    amount: 85832.0,
    date: "22 de Octubre",
    status: "pendiente",
    icon: "game-controller",
    color: "#3B82F6",
  },
  {
    id: "4",
    company: "Electricidad S.A.",
    description: "Factura de Servicios",
    amount: 17292.3,
    date: "21 de Octubre",
    status: "fallido",
    icon: "flash",
    color: "#F59E0B",
  },
  {
    id: "5",
    company: "Uber Technologies",
    description: "Viaje en Taxi",
    amount: 2244.1,
    date: "20 de Octubre",
    status: "completado",
    icon: "car",
    color: "#6B7280",
  },
];

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  completado: { label: "Completado", bg: "rgba(31,167,116,0.18)", text: "#4ADE80" },
  pendiente: { label: "Pendiente", bg: "rgba(245,158,11,0.18)", text: "#FBBF24" },
  fallido: { label: "Fallido", bg: "rgba(239,68,68,0.18)", text: "#F87171" },
};

function fmtAmount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/* ── Screen ── */

export default function PagosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable hitSlop={8}>
          <Ionicons
            name="grid-outline"
            size={20}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>
        <Text style={s.headerTitle}>Pagos</Text>
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
        {/* ── Quick Access Card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Accesos Directos</Text>
          <View style={s.actionsRow}>
            {QUICK_ACTIONS.map((action, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  s.actionBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => action.route && router.push(action.route as any)}
              >
                <View style={[s.actionIcon, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={s.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Recent Payments ── */}
        <Text style={s.sectionHeading}>Pagos Recientes</Text>

        <View style={s.paymentsList}>
          {PAYMENTS.map((payment, i) => {
            const status = STATUS_CONFIG[payment.status];
            return (
              <View
                key={payment.id}
                style={[
                  s.paymentRow,
                  i < PAYMENTS.length - 1 && s.paymentBorder,
                ]}
              >
                <View
                  style={[
                    s.paymentIcon,
                    { backgroundColor: `${payment.color}18` },
                  ]}
                >
                  <Ionicons
                    name={payment.icon}
                    size={22}
                    color={payment.color}
                  />
                </View>

                <View style={s.paymentInfo}>
                  <Text style={s.paymentCompany} numberOfLines={1}>
                    {payment.company}
                  </Text>
                  <Text style={s.paymentDesc} numberOfLines={1}>
                    {payment.description}
                  </Text>
                </View>

                <View style={s.paymentRight}>
                  <Text style={s.paymentAmount}>
                    - ${fmtAmount(payment.amount)}
                  </Text>
                  <Text style={s.paymentDate}>{payment.date}</Text>
                  <View style={[s.badge, { backgroundColor: status.bg }]}>
                    <Text style={[s.badgeText, { color: status.text }]}>
                      {status.label}
                    </Text>
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

  /* Quick Access Card */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 28,
    ...cardShadow,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  /* Section */
  sectionHeading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },

  /* Payments List */
  paymentsList: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    ...cardShadow,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  paymentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
    marginRight: 8,
  },
  paymentCompany: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  paymentDesc: {
    color: DIM,
    fontSize: 12,
  },
  paymentRight: {
    alignItems: "flex-end",
  },
  paymentAmount: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  paymentDate: {
    color: DIM,
    fontSize: 11,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
