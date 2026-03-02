import { Text, View } from "react-native";

export default function TarjetasScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 22 }}>Ver tarjetas</Text>
    </View>
  );
}
