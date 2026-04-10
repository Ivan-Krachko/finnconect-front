/**
 * Stub para Expo Go: @tensorflow/tfjs-react-native solo usa RNFS en
 * bundleResourceIO.loadLocalAsset (pesos empaquetados en release). BlazeFace
 * carga por red; el paquete nativo real no aplica en Go.
 */
function notAvailable() {
  throw new Error(
    "react-native-fs no está disponible en este build (p. ej. Expo Go). " +
      "No se usa para BlazeFace por URL; hace falta un dev client con RNFS nativo " +
      "solo si usas bundleResourceIO con pesos locales."
  );
}

module.exports = {
  readFile: notAvailable,
  readFileRes: notAvailable,
};
