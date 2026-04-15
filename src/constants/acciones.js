/**
 * Metadatos de visualización para acciones (cotización en API: /acciones/prices).
 * Mapea por symbol (AAPL, MSFT, …).
 */
export const STOCK_DISPLAY = {
  AAPL: { letter: "A", color: "#A2AAAD" },
  MSFT: { letter: "M", color: "#00A4EF" },
  GOOGL: { letter: "G", color: "#4285F4" },
  AMZN: { letter: "A", color: "#FF9900" },
  NVDA: { letter: "N", color: "#76B900" },
};

/** Symbol → tipoAccion para POST /accion-transactions */
export const SYMBOL_TO_TIPO_ACCION = {
  AAPL: "apple",
  MSFT: "microsoft",
  GOOGL: "alphabet",
  AMZN: "amazon",
  NVDA: "nvidia",
};

/** tipoAccion (API) → symbol para display */
export const TIPO_ACCION_TO_SYMBOL = {
  apple: "AAPL",
  microsoft: "MSFT",
  alphabet: "GOOGL",
  amazon: "AMZN",
  nvidia: "NVDA",
};
