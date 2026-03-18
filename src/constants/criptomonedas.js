/**
 * Metadatos de visualización para criptomonedas (símbolo emoji, color).
 * Mapea por symbol (BTC, ETH, etc.) para combinar con datos del API.
 */
export const CRYPTO_DISPLAY = {
  BTC: { symbol: "₿", color: "#F7931A" },
  ETH: { symbol: "Ξ", color: "#627EEA" },
  USDT: { symbol: "₮", color: "#26A17B" },
  SOL: { symbol: "◎", color: "#9945FF" },
  ADA: { symbol: "₳", color: "#0033AD" },
  DOT: { symbol: "●", color: "#E6007A" },
  AVAX: { symbol: "▲", color: "#E84142" },
  BNB: { symbol: "◆", color: "#F3BA2F" },
  XRP: { symbol: "✕", color: "#23292F" },
  DOGE: { symbol: "Ð", color: "#C2A633" },
};

/** Monedas soportadas por el endpoint de precios (convert param) */
export const CONVERT_OPTIONS = [
  { code: "ars", label: "ARS" },
  { code: "usd", label: "USD" },
  { code: "eur", label: "EUR" },
  { code: "jpy", label: "JPY" },
  { code: "brl", label: "BRL" },
  { code: "gbp", label: "GBP" },
];
