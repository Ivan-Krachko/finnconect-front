/**
 * Formato numérico único en la app: miles con punto, decimales con coma (locale es-AR).
 */

const LOCALE = "es-AR";

function ok(n: number): boolean {
  return Number.isFinite(n);
}

/** Base: cualquier opción de Intl (agrupación y separadores es-AR). */
export function formatEsAR(n: number, options?: Intl.NumberFormatOptions): string {
  if (!ok(n)) return "—";
  return new Intl.NumberFormat(LOCALE, options).format(n);
}

/** Enteros: 1.234.567 */
export function formatIntegerEsAR(n: number): string {
  return formatEsAR(n, { maximumFractionDigits: 0 });
}

/** Decimales fijos: 1.234,56 */
export function formatDecimalEsAR(
  n: number,
  minFractionDigits = 2,
  maxFractionDigits = 2
): string {
  if (!ok(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}

/** Porcentaje sin símbolo % (ej. 12,34 para mostrar "12,34 %"). */
export function formatPercentValueEsAR(n: number, fractionDigits = 2): string {
  return formatDecimalEsAR(n, fractionDigits, fractionDigits);
}

function fiatSymbolPrefix(currency: string): string {
  const c = currency.toUpperCase();
  if (c === "USD") return "US$";
  if (c === "EUR") return "€";
  if (c === "BRL") return "R$";
  return "$";
}

/** Total / montos ARS con símbolo y código ISO (sin ambigüedad con otras monedas). */
export function formatArsPesoEsAR(n: number): string {
  return formatMoneyWithSymbol(n, "ARS");
}

/**
 * Fiat según ISO: ARS/BRL con 2 decimales; resto 2 decimales.
 */
export function formatFiatByCurrency(n: number, code: string): string {
  if (!ok(n)) return "—";
  const c = code.toUpperCase();
  if (c === "ARS" || c === "BRL") {
    const r = Math.round(n * 100) / 100;
    return formatDecimalEsAR(r, 2, 2);
  }
  return formatDecimalEsAR(n, 2, 2);
}

/**
 * Montos en conversión / cotización: si la moneda de destino es mucho más “cara”,
 * el valor puede ser &lt; 0,01 y con 2 decimales se ve 0,00. Subimos decimales según magnitud.
 */
export function formatFiatConversionEsAR(n: number, code: string): string {
  if (!ok(n)) return "—";
  const c = code.toUpperCase();
  const abs = Math.abs(n);
  const maxF = abs === 0 ? 2 : abs < 0.01 ? 8 : abs < 1 ? 6 : 2;

  if (c === "ARS" || c === "BRL") {
    if (abs >= 1) {
      const r = Math.round(n * 100) / 100;
      return formatDecimalEsAR(r, 2, 2);
    }
    return formatEsAR(n, { minimumFractionDigits: 0, maximumFractionDigits: maxF });
  }

  return formatEsAR(n, { minimumFractionDigits: 0, maximumFractionDigits: maxF });
}

/**
 * Monto fiat: símbolo local + número (es-AR); por defecto también el código ISO.
 * Ej.: `$1.234,56 ARS` o, con `showIsoCode: false`, `$1.234,56`.
 */
export function formatMoneyWithSymbol(
  n: number,
  currency: string,
  opts?: { showIsoCode?: boolean }
): string {
  if (!ok(n)) return "—";
  const code = currency.toUpperCase();
  const pref = fiatSymbolPrefix(code);
  const num = formatFiatByCurrency(n, code);
  if (opts?.showIsoCode === false) {
    return `${pref}${num}`;
  }
  return `${pref}${num} ${code}`;
}

/**
 * Como `formatMoneyWithSymbol`, pero con la misma lógica de decimales que
 * `formatFiatConversionEsAR` (valores muy chicos en conversión).
 */
export function formatFiatConversionMoneyEsAR(n: number, currency: string): string {
  if (!ok(n)) return "—";
  const code = currency.toUpperCase();
  const pref = fiatSymbolPrefix(code);
  return `${pref}${formatFiatConversionEsAR(n, code)} ${code}`;
}

/** Cantidades de cripto (hasta 4 / 6 / 8 decimales). */
export function formatCryptoQuantityEsAR(n: number): string {
  if (!ok(n)) return "—";
  const abs = Math.abs(n);
  const maxF = abs >= 1 ? 4 : abs >= 0.001 ? 6 : 8;
  return formatEsAR(n, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxF,
  });
}

/** Cantidad de títulos / fracciones. */
export function formatStockSharesEsAR(n: number): string {
  if (!ok(n) || n === 0) return formatIntegerEsAR(0);
  const abs = Math.abs(n);
  const maxF = abs >= 1 ? 4 : abs >= 0.0001 ? 6 : 8;
  return formatEsAR(n, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxF,
  });
}
