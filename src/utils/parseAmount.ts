/**
 * Parsea monto aceptando ambos formatos:
 * - Argentina/Europeo: punto (.) = miles, coma (,) = decimales → 500.000 o 12,50
 * - US: coma (,) = miles, punto (.) = decimales → 500,000 o 12.50
 */
export function parseAmount(str: string): number {
  const s = String(str || "").trim().replace(/\s/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastPeriod = s.lastIndexOf(".");
  if (lastComma > lastPeriod) {
    const afterComma = s.slice(lastComma + 1);
    if (afterComma.length === 3 && /^\d{3}$/.test(afterComma)) {
      return parseFloat(s.replace(/,/g, "")) || 0;
    }
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (lastPeriod > lastComma) {
    const afterPeriod = s.slice(lastPeriod + 1);
    if (afterPeriod.length === 3 && /^\d{3}$/.test(afterPeriod)) {
      return parseFloat(s.replace(/\./g, "")) || 0;
    }
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  if (lastComma >= 0 || lastPeriod >= 0) {
    return parseFloat(s.replace(/[,.]/g, "")) || 0;
  }
  return parseFloat(s) || 0;
}
