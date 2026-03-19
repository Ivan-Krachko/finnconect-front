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
    const beforeComma = s.slice(0, lastComma);
    const afterComma = s.slice(lastComma + 1);
    // "0,001" = decimal (Argentina). "1,234" = miles (US). Si antes de la coma es 0, es decimal.
    if (
      afterComma.length === 3 &&
      /^\d{3}$/.test(afterComma) &&
      !/^0+$/.test(beforeComma) &&
      beforeComma !== ""
    ) {
      return parseFloat(s.replace(/,/g, "")) || 0;
    }
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (lastPeriod > lastComma) {
    const beforePeriod = s.slice(0, lastPeriod);
    const afterPeriod = s.slice(lastPeriod + 1);
    // "0.001" = decimal (US). "1.234" = miles (Argentina). Si antes del punto es 0, es decimal.
    const beforeIsAllZeros = /^0+$/.test(beforePeriod) || beforePeriod === "";
    if (
      afterPeriod.length === 3 &&
      /^\d{3}$/.test(afterPeriod) &&
      !beforeIsAllZeros
    ) {
      return parseFloat(s.replace(/\./g, "")) || 0;
    }
    return parseFloat(s.replace(/,/g, "")) || 0;
  }
  if (lastComma >= 0 || lastPeriod >= 0) {
    return parseFloat(s.replace(/[,.]/g, "")) || 0;
  }
  return parseFloat(s) || 0;
}
