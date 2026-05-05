import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type ToastType = "success" | "error" | "info";

export function AppToast({
  visible,
  message,
  type = "info",
}: {
  visible: boolean;
  message: string;
  type?: ToastType;
}) {
  if (!visible || !message) return null;
  const cfg =
    type === "success"
      ? { icon: "checkmark-circle", bg: "rgba(31,167,116,0.18)", border: "rgba(31,167,116,0.45)", color: "#4ADE80" }
      : type === "error"
        ? { icon: "alert-circle", bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.45)", color: "#F87171" }
        : { icon: "information-circle", bg: "rgba(59,130,246,0.18)", border: "rgba(59,130,246,0.45)", color: "#93C5FD" };

  return (
    <View style={[s.wrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
      <Text style={[s.text, { color: cfg.color }]}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 12,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
});
