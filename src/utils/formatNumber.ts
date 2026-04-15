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

/** Total / montos ARS con prefijo $ y hasta 2 decimales. */
export function formatArsPesoEsAR(n: number): string {
  if (!ok(n)) return "—";
  return `$${formatEsAR(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Fiat según ISO: ARS/BRL con 2 decimales; JPY entero; resto 2 decimales.
 */
export function formatFiatByCurrency(n: number, code: string): string {
  if (!ok(n)) return "—";
  const c = code.toUpperCase();
  if (c === "JPY") return formatIntegerEsAR(Math.round(n));
  if (c === "ARS" || c === "BRL") {
    const r = Math.round(n * 100) / 100;
    return formatDecimalEsAR(r, 2, 2);
  }
  return formatDecimalEsAR(n, 2, 2);
}

/** Saldo con prefijo ($ / US$ / €). */
export function formatMoneyWithSymbol(n: number, currency: string): string {
  const pref =
    currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$";
  return `${pref}${formatFiatByCurrency(n, currency)}`;
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
