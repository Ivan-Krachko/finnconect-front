/**
 * @tensorflow/tfjs-react-native registra el backend WebGL solo si
 * `navigator.product === 'ReactNative'`. Aseguramos eso antes de cargar el adaptador.
 */
if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = { product: "ReactNative" };
} else if (!globalThis.navigator.product) {
  globalThis.navigator = Object.assign(globalThis.navigator, { product: "ReactNative" });
}
