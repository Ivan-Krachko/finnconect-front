import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.container}>Hola, Usuario!</Text>

      {/* Card Saldo */}
      <View style={styles.card}>
        <Text>ARS</Text>
        <Text style={styles.balance}>$150.000,00</Text>
      </View>

      {/* Acciones rápidas */}
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

      <View style={styles.grid}>
        <View style={styles.box}>
          <Pressable
            onPress={() => router.replace("/transferencias")}
            style={styles.btn}
          >
            <Text>Transferir</Text>
          </Pressable>
        </View>
        <View style={styles.box}>
          <Text>Pagar</Text>
        </View>
        <View style={styles.box}>
          <Text>Cripto</Text>
        </View>
        <View style={styles.box}>
          <Text>Tarjetas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 18,
  },
  card: {
    backgroundColor: "#cdeee3",
    padding: 20,
    borderRadius: 16,
  },
  balance: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  box: {
    width: "47%",
    padding: 20,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    alignItems: "center",
  },
  btn: {
    backgroundColor: "#939997",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});
