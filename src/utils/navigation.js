/**
 * Navega hacia atrás de forma segura.
 * Usa replace para evitar el error "GO_BACK was not handled".
 * @param {import('expo-router').Router} router - Router de useRouter()
 * @param {string} [fallback='/(tabs)/home'] - Ruta destino
 */
export function safeBack(router, fallback = "/(tabs)/home") {
  router.replace(fallback);
}
