import { useContext } from "react";
import { Button, Text, View } from "react-native";
import { autenticacionContext } from "../../context/AutenticacionContext";

export default function UsuarioActual() {
  const { user, signOut } = useContext(autenticacionContext);

  return (
    <View>
      <Text>Usuario actual:</Text>
      <Text>{user?.name}</Text>
      <Text>{user?.email}</Text>

      <Button title="Cerrar sesión" onPress={signOut} />
    </View>
  );
}
