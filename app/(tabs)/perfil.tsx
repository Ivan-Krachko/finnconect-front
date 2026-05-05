import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useContext, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { autenticacionContext } from "../../src/context/AutenticacionContext";
import {
  clearBiometricLoginCredentials,
  getBiometricLoginShortLabel,
  isBiometricLoginConfigured,
} from "../../src/Services/biometricLogin.service";
import { getMe } from "../../src/Services/usuarios.service";
import * as telegramIaService from "../../src/Services/telegram-ia.service";

const TELEGRAM_BOT_USERNAME = "finconnectutn_bot";
/** Formato que espera el bot (placeholders). */
const TELEGRAM_LOGIN_TEMPLATE = "/login {codigo} {dni}";

function buildTelegramPrefill(code: string, dniProfile: string): string | null {
  const dniDigits = dniProfile.replace(/\D/g, "");
  if (!dniDigits || dniProfile === "—") return null;
  return `/login ${code} ${dniDigits}`;
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ── Data ── */

interface SettingRow {
  icon: IconName;
  label: string;
  value?: string;
  type: "nav" | "info";
  /** Ruta Expo Router (sin `app/`) */
  href?: string;
  acerca?: boolean;
  /** Acción especial (no navega) */
  telegramIaCode?: boolean;
  biometricSettings?: boolean;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

const STATIC_SECTIONS: SettingSection[] = [
  {
    title: "Detalles de la Cuenta",
    rows: [
      {
        icon: "person-outline",
        label: "Datos personales",
        value: "",
        type: "nav",
        href: "/editar-datos-cuenta",
      },
      {
        icon: "finger-print-outline",
        label: "DNI",
        value: "",
        type: "info",
      },
    ],
  },
  {
    title: "Ajustes de Seguridad",
    rows: [
      {
        icon: "lock-closed-outline",
        label: "Contraseña",
        value: "Cambiar",
        type: "nav",
        href: "/cambiar-contrasena",
      },
      {
        icon: "finger-print-outline",
        label: "Ingreso con Face ID / huella",
        value: "",
        type: "info",
        biometricSettings: true,
      },
      {
        icon: "time-outline",
        label: "Actividad reciente",
        type: "nav",
        href: "/transacciones",
      },
    ],
  },
  {
    title: "Tarjetas Virtuales",
    rows: [
      {
        icon: "card-outline",
        label: "Administrar Tarjetas",
        type: "nav",
        href: "/tarjetas",
      },
      {
        icon: "add-circle-outline",
        label: "Solicitar Nueva Tarjeta",
        type: "nav",
        href: "/tarjetas",
      },
    ],
  },
  {
    title: "Alias/CBU",
    rows: [
      {
        icon: "document-text-outline",
        label: "Mis Alias/CBU",
        type: "nav",
        href: "/cuentas",
      },
      {
        icon: "add-circle-outline",
        label: "Ver cuentas y CVU",
        type: "nav",
        href: "/cuentas",
      },
    ],
  },
  {
    title: "Información",
    rows: [
      {
        icon: "chatbubble-ellipses-outline",
        label: "Código para Telegram / IA",
        type: "nav",
        telegramIaCode: true,
      },
      {
        icon: "information-circle-outline",
        label: "Acerca de FinConnect",
        type: "nav",
        acerca: true,
      },
    ],
  },
];

/* ── Screen ── */

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, token, sessionReady } = useContext(autenticacionContext);

  const [nombreCompleto, setNombreCompleto] = useState("—");
  const [email, setEmail] = useState("—");
  const [dni, setDni] = useState("—");

  /** Modal código Telegram: más claro que un Alert + copiar al portapapeles */
  const [tgModal, setTgModal] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [tgCopied, setTgCopied] = useState(false);
  const [bioConfigured, setBioConfigured] = useState(false);
  const [bioShort, setBioShort] = useState("Biometría");

  const loadPerfil = useCallback(() => {
    if (!sessionReady) return;
    if (!token) {
      setNombreCompleto("—");
      setEmail("—");
      setDni("—");
      return;
    }
    getMe(token)
      .then(
        (u: {
          nombre?: string;
          apellido?: string;
          email?: string;
          dni?: string;
        }) => {
          const n = [u.nombre, u.apellido].filter(Boolean).join(" ").trim();
          setNombreCompleto(n || "—");
          setEmail(u.email || "—");
          setDni(u.dni || "—");
        }
      )
      .catch(() => {
        setNombreCompleto("—");
        setEmail("—");
        setDni("—");
      });
  }, [token, sessionReady]);

  useFocusEffect(
    useCallback(() => {
      loadPerfil();
      void (async () => {
        try {
          const [c, l] = await Promise.all([
            isBiometricLoginConfigured(),
            getBiometricLoginShortLabel(),
          ]);
          setBioConfigured(c);
          setBioShort(l);
        } catch {
          setBioConfigured(false);
        }
      })();
    }, [loadPerfil])
  );

  const sections = useMemo((): SettingSection[] => {
    const copy = STATIC_SECTIONS.map((sec) => ({
      ...sec,
      rows: sec.rows.map((r) => ({ ...r })),
    }));
    const detalles = copy.find((s) => s.title === "Detalles de la Cuenta");
    if (detalles) {
      for (const row of detalles.rows) {
        if (row.label === "Datos personales") {
          row.value = nombreCompleto !== "—" ? nombreCompleto : email;
        }
        if (row.label === "DNI") row.value = dni;
      }
    }
    const seguridad = copy.find((s) => s.title === "Ajustes de Seguridad");
    if (seguridad) {
      for (const row of seguridad.rows) {
        if (row.biometricSettings) {
          row.value = bioConfigured ? `Activado (${bioShort})` : "Desactivado";
        }
      }
    }
    return copy;
  }, [nombreCompleto, email, dni, bioConfigured, bioShort]);

  const onRowPress = (row: SettingRow) => {
    if (row.biometricSettings) {
      if (!bioConfigured) {
        Alert.alert(
          "Ingreso biométrico",
          "Activá esta opción iniciando sesión con email y contraseña: después del ingreso te vamos a ofrecer usar Face ID o huella."
        );
        return;
      }
      Alert.alert(
        "Quitar ingreso biométrico",
        "Vas a volver a ingresar siempre con la contraseña (podés reactivarlo después).",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Quitar",
            style: "destructive",
            onPress: () => {
              void clearBiometricLoginCredentials().then(() => setBioConfigured(false));
            },
          },
        ]
      );
      return;
    }
    if (row.telegramIaCode) {
      if (!sessionReady || !token) {
        Alert.alert("Sesión", "Iniciá sesión para generar un código.");
        return;
      }
      void (async () => {
        try {
          const r = await telegramIaService.solicitarCodigoTelegramIa(token);
          setTgModal({
            code: r.code,
            expiresAt: r.expiresAt ?? "",
          });
        } catch (e: unknown) {
          Alert.alert(
            "Error",
            e instanceof Error ? e.message : "No se pudo generar el código"
          );
        }
      })();
      return;
    }
    if (row.acerca) {
      Alert.alert(
        "FinConnect",
        "Versión 1.0.0\nApp de banca y operaciones.\n\nLos ajustes de cuenta se sincronizan con el servidor cuando iniciás sesión."
      );
      return;
    }
    if ((!sessionReady || !token) && row.href) {
      Alert.alert("Sesión", "Iniciá sesión para usar esta opción.");
      return;
    }
    if (row.href) {
      router.push(row.href as any);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const copyTelegramCode = async () => {
    if (!tgModal) return;
    const full = buildTelegramPrefill(tgModal.code, dni);
    const toCopy = full ?? tgModal.code;
    await Clipboard.setStringAsync(toCopy);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* sin haptics en web o simulador viejo */
    }
    setTgCopied(true);
    setTimeout(() => setTgCopied(false), 2200);
    if (!full) {
      Alert.alert(
        "Solo código copiado",
        `El mensaje completo es «${TELEGRAM_LOGIN_TEMPLATE}». Cargá tu DNI en datos personales para copiar la línea entera o completá el DNI a mano.`
      );
    }
  };

  const openTelegramLogin = async () => {
    if (!tgModal) return;
    const message = buildTelegramPrefill(tgModal.code, dni);
    if (!message) {
      Alert.alert(
        "Falta el DNI",
        "No pudimos armar /login {codigo} {dni} sin tu DNI. Cargalo en datos personales o copiá el mensaje y completalo a mano en Telegram."
      );
      return;
    }
    const url = `https://t.me/${TELEGRAM_BOT_USERNAME}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Telegram",
        "No se pudo abrir el enlace. Instalá Telegram o copiá el comando y escribí en @finconnectutn_bot:\n" +
          message
      );
    }
  };

  const telegramPrefill = useMemo(() => {
    if (!tgModal) return null;
    return buildTelegramPrefill(tgModal.code, dni);
  }, [tgModal, dni]);

  const tgExpiresLabel = tgModal?.expiresAt
    ? new Date(tgModal.expiresAt).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.profileCard}>
          <View style={s.avatarLarge}>
            <Ionicons name="person" size={36} color="#0B3D2E" />
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{nombreCompleto}</Text>
            <Text style={s.profileEmail}>{email}</Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={s.sectionCard}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.rows.map((row, i) => (
              <Pressable
                key={`${section.title}-${row.label}`}
                style={[s.row, i < section.rows.length - 1 && s.rowBorder]}
                onPress={() => onRowPress(row)}
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

                {(row.type === "nav" || row.type === "info") && row.value ? (
                  <Text style={s.rowValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                ) : null}

                {row.type === "nav" && (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="rgba(255,255,255,0.2)"
                  />
                )}
              </Pressable>
            ))}
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#F87171" />
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </Pressable>

        <Text style={s.version}>FinConnect v1.0.0</Text>
      </ScrollView>

      <Modal
        visible={tgModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setTgModal(null);
          setTgCopied(false);
        }}
      >
        <View style={s.tgOverlay}>
          <View style={s.tgCard}>
            <View style={s.tgCardHeader}>
              <View style={s.tgIconWrap}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#0B3D2E" />
              </View>
              <View style={s.tgHeaderText}>
                <Text style={s.tgTitle}>Telegram / IA</Text>
                <Text style={s.tgSubtitle}>
                  Un solo uso · vence en 15 min
                </Text>
              </View>
            </View>

            {tgModal ? (
              <>
                <Text style={s.tgLabel}>Tu código</Text>
                <View style={s.tgCodeWrap}>
                  <Text style={s.tgCode} selectable>
                    {tgModal.code}
                  </Text>
                </View>

                <Text style={s.tgLabel}>Mensaje predeterminado</Text>
                <View style={s.tgCommandWrap}>
                  <Text style={s.tgCommandMono} selectable>
                    {TELEGRAM_LOGIN_TEMPLATE}
                  </Text>
                </View>

                {telegramPrefill ? (
                  <>
                    <Text style={s.tgLabelSecondary}>Así queda con tus datos</Text>
                    <View style={s.tgCommandWrap}>
                      <Text style={s.tgCommandMonoLive} selectable>
                        {telegramPrefill}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={s.tgCommandWarn}>
                    Cargá tu DNI en datos personales para rellenar{" "}
                    <Text style={s.tgHintMono}>{"{dni}"}</Text> en el mensaje.
                  </Text>
                )}

                {tgExpiresLabel ? (
                  <Text style={s.tgExpiry}>
                    <Text style={s.tgExpiryMuted}>Vence el </Text>
                    {tgExpiresLabel}
                  </Text>
                ) : null}

                <Text style={s.tgHint}>
                  En <Text style={s.tgHintMono}>@{TELEGRAM_BOT_USERNAME}</Text> el
                  bot espera{" "}
                  <Text style={s.tgHintMono}>{TELEGRAM_LOGIN_TEMPLATE}</Text> (código
                  de un solo uso + tu DNI). «Abrir telegram» prepara esa línea para
                  enviar.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    s.tgCopyBtn,
                    pressed && s.tgCopyBtnPressed,
                    tgCopied && s.tgCopyBtnDone,
                  ]}
                  onPress={() => void copyTelegramCode()}
                >
                  <Ionicons
                    name={tgCopied ? "checkmark-circle" : "copy-outline"}
                    size={20}
                    color={tgCopied ? "#34D399" : "#fff"}
                  />
                  <Text
                    style={[s.tgCopyBtnText, tgCopied && s.tgCopyBtnTextDone]}
                  >
                    {tgCopied
                      ? "Copiado al portapapeles"
                      : telegramPrefill
                        ? "Copiar mensaje /login"
                        : "Copiar código"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    s.tgTelegramBtn,
                    pressed && s.tgTelegramBtnPressed,
                  ]}
                  onPress={() => void openTelegramLogin()}
                >
                  <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                  <Text style={s.tgTelegramBtnText}>Abrir telegram</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [s.tgDoneBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    setTgModal(null);
                    setTgCopied(false);
                  }}
                >
                  <Text style={s.tgDoneBtnText}>Listo</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    maxWidth: 120,
    textAlign: "right",
  },

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

  tgOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  tgCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    ...cardShadow,
  },
  tgCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  tgIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  tgHeaderText: { flex: 1 },
  tgTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tgSubtitle: {
    color: DIM,
    fontSize: 13,
    marginTop: 2,
  },
  tgLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  tgLabelSecondary: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  tgCommandWrap: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  tgCommandMono: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    ...(Platform.OS === "ios"
      ? { fontFamily: "Menlo" }
      : { fontFamily: "monospace" }),
  },
  tgCommandMonoLive: {
    color: "#A7F3D0",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    ...(Platform.OS === "ios"
      ? { fontFamily: "Menlo" }
      : { fontFamily: "monospace" }),
  },
  tgCommandWarn: {
    color: "rgba(251,191,36,0.95)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: "center",
  },
  tgCodeWrap: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  tgCode: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
    ...(Platform.OS === "ios"
      ? { fontFamily: "Menlo" }
      : { fontFamily: "monospace" }),
  },
  tgExpiry: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  tgExpiryMuted: {
    color: DIM,
  },
  tgHint: {
    color: DIM,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: "center",
  },
  tgHintMono: {
    color: "rgba(255,255,255,0.65)",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  tgCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0B3D2E",
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tgCopyBtnPressed: {
    opacity: 0.92,
  },
  tgCopyBtnDone: {
    backgroundColor: "rgba(52,211,153,0.12)",
    borderColor: "rgba(52,211,153,0.35)",
  },
  tgCopyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  tgCopyBtnTextDone: {
    color: "#34D399",
  },
  tgTelegramBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0088cc",
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tgTelegramBtnPressed: {
    opacity: 0.9,
  },
  tgTelegramBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  tgDoneBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  tgDoneBtnText: {
    color: DIM,
    fontSize: 15,
    fontWeight: "600",
  },
});
