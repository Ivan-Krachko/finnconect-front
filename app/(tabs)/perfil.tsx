import { Ionicons } from "@expo/vector-icons";
import { useContext, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../../src/context/AutenticacionContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ── Data ── */

interface SettingRow {
  icon: IconName;
  label: string;
  value?: string;
  type: "nav" | "toggle" | "info";
  toggleKey?: string;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

const SECTIONS: SettingSection[] = [
  {
    title: "Detalles de la Cuenta",
    rows: [
      { icon: "person-outline", label: "Nombre Completo", value: "Sofía García", type: "nav" },
      { icon: "call-outline", label: "Número de Teléfono", value: "+34 678 123 456", type: "nav" },
      { icon: "mail-outline", label: "Dirección de Correo Electrónico", value: "sofia.garcia@finconnect.com", type: "nav" },
    ],
  },
  {
    title: "Ajustes de Seguridad",
    rows: [
      { icon: "lock-closed-outline", label: "Contraseña", value: "••••••••", type: "nav" },
      { icon: "shield-checkmark-outline", label: "Autenticación de 2 Factores", type: "toggle", toggleKey: "twoFactor" },
      { icon: "time-outline", label: "Actividad Reciente", type: "nav" },
    ],
  },
  {
    title: "Tarjetas Virtuales",
    rows: [
      { icon: "card-outline", label: "Administrar Tarjetas", type: "nav" },
      { icon: "add-circle-outline", label: "Solicitar Nueva Tarjeta", type: "nav" },
    ],
  },
  {
    title: "Alias/CBU",
    rows: [
      { icon: "document-text-outline", label: "Mis Alias/CBU", type: "nav" },
      { icon: "add-circle-outline", label: "Crear Nuevo Alias", type: "nav" },
    ],
  },
  {
    title: "Notificaciones",
    rows: [
      { icon: "notifications-outline", label: "Alertas de Transacciones", type: "toggle", toggleKey: "txAlerts" },
      { icon: "newspaper-outline", label: "Noticias y Ofertas", type: "toggle", toggleKey: "news" },
      { icon: "alarm-outline", label: "Recordatorios de Pagos", type: "toggle", toggleKey: "payReminders" },
    ],
  },
  {
    title: "Preferencias de la Aplicación",
    rows: [
      { icon: "language-outline", label: "Idioma", value: "Español", type: "nav" },
      { icon: "color-palette-outline", label: "Tema de la Aplicación", value: "Claro", type: "nav" },
      { icon: "information-circle-outline", label: "Acerca de FinConnect", type: "nav" },
    ],
  },
];

/* ── Screen ── */

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useContext(autenticacionContext);

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    twoFactor: true,
    txAlerts: true,
    news: false,
    payReminders: true,
  });

  const flip = (key: string) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = () => {
    signOut();
    router.replace("/");
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarLarge}>
            <Ionicons name="person" size={36} color="#0B3D2E" />
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>Sofía García</Text>
            <Text style={s.profileEmail}>sofia.garcia@finconnect.com</Text>
          </View>
        </View>

        {/* ── Setting Sections ── */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.sectionCard}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.rows.map((row, i) => (
              <Pressable
                key={row.label}
                style={[
                  s.row,
                  i < section.rows.length - 1 && s.rowBorder,
                ]}
              >
                <Ionicons
                  name={row.icon}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                  style={s.rowIcon}
                />
                <View style={s.rowBody}>
                  <Text style={s.rowLabel} numberOfLines={2}>
                    {row.label}
                  </Text>
                </View>

                {row.type === "nav" && row.value && (
                  <Text style={s.rowValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                )}

                {row.type === "nav" && (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(255,255,255,0.2)"
                  />
                )}

                {row.type === "toggle" && row.toggleKey && (
                  <Switch
                    value={toggles[row.toggleKey]}
                    onValueChange={() => flip(row.toggleKey!)}
                    trackColor={{
                      false: "rgba(255,255,255,0.1)",
                      true: "rgba(31,167,116,0.5)",
                    }}
                    thumbColor={
                      toggles[row.toggleKey] ? "#1FA774" : "#666"
                    }
                  />
                )}
              </Pressable>
            ))}
          </View>
        ))}

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#F87171" />
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </Pressable>

        <Text style={s.version}>FinConnect v1.0.0</Text>
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
    alignItems: "center",
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  /* Profile Card */
  profileCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    ...cardShadow,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileEmail: {
    color: DIM,
    fontSize: 13,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: "hidden",
    ...cardShadow,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },

  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  rowIcon: {
    marginRight: 14,
    width: 22,
  },
  rowBody: {
    flex: 1,
    marginRight: 8,
  },
  rowLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rowValue: {
    color: DIM,
    fontSize: 13,
    marginRight: 6,
    maxWidth: 140,
    textAlign: "right",
  },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  logoutText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "700",
  },

  version: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
});
