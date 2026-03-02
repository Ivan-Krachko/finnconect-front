import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";

export default function Login() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", textAlign: "center" }}>
        Bienvenido a FinConnect
      </Text>

      <TextInput
        placeholder="Correo electrónico"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 8,
        }}
      />

      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 8,
        }}
      />

      <Pressable
        onPress={() => router.replace("/home")}
        style={{
          backgroundColor: "#1FA774",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Iniciar Sesión
        </Text>
      </Pressable>
    </View>
  );
}
