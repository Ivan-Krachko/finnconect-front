/**
 * Monedas fiat admitidas en la app (alineado al backend).
 * No listar ni operar cuentas en otras divisas aunque el API las devuelva.
 */
export const FIAT_CODES_SUPPORTED = ["ARS", "USD", "EUR", "BRL"];

export function isSupportedFiat(moneda) {
  return FIAT_CODES_SUPPORTED.includes(String(moneda ?? "").toUpperCase());
}

/** Cuentas del usuario filtradas a monedas soportadas. */
export function filterCuentasBySupportedFiat(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((c) => c && isSupportedFiat(c.moneda));
}

/**
 * Metadatos de UI (banderas, nombres, tendencias fallback en Operaciones).
 */
export const FIAT_CURRENCIES_UI = [
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷", rateToArs: 1, trend: 0 },
  {
    code: "USD",
    name: "Dólar Estadounidense",
    flag: "🇺🇸",
    rateToArs: 1024,
    trend: 0.45,
  },
  { code: "EUR", name: "Euro", flag: "🇪🇺", rateToArs: 1593, trend: 0.25 },
  {
    code: "BRL",
    name: "Real Brasileño",
    flag: "🇧🇷",
    rateToArs: 204,
    trend: 0.18,
  },
];
