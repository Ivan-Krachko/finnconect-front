import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function TansferenciasScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22 }}>Transferencias</Text>
      <Pressable onPress={() => router.replace("/home")}>
        <Text>Volver</Text>
      </Pressable>
    </View>
  );
}
