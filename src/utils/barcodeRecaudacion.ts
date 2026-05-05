/**
 * Decodificación de códigos de barras para recaudación (Argentina + EAN).
 * - **33 dígitos** (p. ej. Edesur): 4 código empresa + 1 tipo venc. + 8 venc. YYYYMMDD
 *   + 10 importe (valor entero en centavos) + 9 referencia + 1 mód.10 (cuerpo 32 + DV).
 * - **50 dígitos**: 4 + 8 + 6 (YYMMDD) + 13 + 18 relleno + 1 mód.10.
 * - Otros: EAN, 48, 44, 56, etc.
 */

import { servicioDesdeCodigosReferencia } from "../db/codigosReferencia";

export type FormatoRecaudacion =
  | "ean13"
  | "ean8"
  | "itf14"
  | "f48_argentina"
  /** 4+1+8+10+9+1 (Edesur y similares) */
  | "f33_argentina"
  /** 4+8+6+13+18+1, estándar común 50-52 (validamos 50, primeros 50 en 51-52) */
  | "f50_argentina"
  | "f44_argentina"
  | "f56_argentina"
  | "longitud_variable"
  | "desconocido";

export interface DecodificadoOk {
  ok: true;
  raw: string;
  digits: string;
  formato: FormatoRecaudacion;
  tipoLectura?: string;
  /** Grupos de 6 dígitos (formato visual común en facturas 48) */
  bloques6?: string[];
  codigoEnte?: string;
  /** Nombre en base `codigos_referencia` (mock); si no hay fila: "Servicio no cargado" */
  nombreEnte?: string;
  identificacionUsuario?: string;
  numeroComprobante?: string;
  /** yyyy-mm-dd cuando se pudo interpretar */
  primerVencimiento?: string;
  importePesos?: number;
  /** centavos enteros si aplica */
  importeCentavos?: number;
  ean?: {
    prefijoPais: string;
    validoLuhn: boolean;
  };
  /** 13 dígitos (formato f50) */
  referencia?: string;
  /** 18 ceros o padding antes del DV (f50) */
  relleno?: string;
  digitoVerificador?: string;
  verificadorMod10Ok?: boolean;
  /** 1 dígito, significado depende del ente (f33) */
  tipoVencimiento?: string;
  nota?: string;
}

export interface DecodificadoErr {
  ok: false;
  error: string;
  raw?: string;
}

export type Decodificado = DecodificadoOk | DecodificadoErr;

export function soloDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

function conServicioReferencia(r: DecodificadoOk): DecodificadoOk {
  return {
    ...r,
    nombreEnte: servicioDesdeCodigosReferencia(r.codigoEnte, r.digits),
  };
}

/** EAN-13 / EAN-8: pesos 1 y 3 alternados desde la izquierda (GS1). */
function eanLuhnValido(treceDigitos: string): boolean {
  if (treceDigitos.length < 2) return false;
  const body = treceDigitos.slice(0, -1);
  const check = parseInt(treceDigitos[treceDigitos.length - 1]!, 10);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = parseInt(body[i]!, 10);
    if (Number.isNaN(n)) return false;
    sum += n * (i % 2 === 0 ? 1 : 3);
  }
  const want = (10 - (sum % 10)) % 10;
  return want === check;
}

/** EAN-13: prefijo país + validación Luhn */
function decodeEan13(d: string): DecodificadoOk {
  const valido = eanLuhnValido(d);
  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "ean13",
    ean: {
      prefijoPais: d.slice(0, 3),
      validoLuhn: valido,
    },
    nota: valido
      ? "EAN-13 con dígito verificador OK (puede ser producto o referencia según ente)."
      : "EAN-13: dígito verificador no coincide; verificá el escaneo.",
  });
}

function decodeEan8(d: string): DecodificadoOk {
  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "ean8",
    ean: { prefijoPais: d.slice(0, 1), validoLuhn: eanLuhnValido(d) },
    nota: "EAN-8 (producto compacto).",
  });
}

function fechaYYMMDDvalida(yy: string, mm: string, dd: string): string | undefined {
  const y = parseInt(`20${yy}`, 10);
  const m = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (m < 1 || m > 12 || day < 1 || day > 31) return undefined;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso;
}

/** Ocho dígitos `YYYYMMDD` (formato 33, ej. 20250430). */
function fechaYYYYMMDD8aIso(yyyymmdd: string): string | undefined {
  if (yyyymmdd.length !== 8) return undefined;
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  const yv = parseInt(y, 10);
  const mv = parseInt(m, 10);
  const dv = parseInt(d, 10);
  if (yv < 1990 || yv > 2100) return undefined;
  if (mv < 1 || mv > 12 || dv < 1 || dv > 31) return undefined;
  return `${y}-${m}-${d}`;
}

/**
 * Módulo 10 recaudación: cuerpo **sin** el dígito verificador (49, 32 u otro largo).
 * Desde la **derecha** del cuerpo: alternar ×2, ×1; si 2d>9 sumar cifras.
 */
export function digitoModulo10RecaudacionAR(cuerpoSinDigitoVerificador: string): number {
  if (cuerpoSinDigitoVerificador.length === 0 || !/^\d+$/.test(cuerpoSinDigitoVerificador)) {
    return NaN;
  }
  let sum = 0;
  let mult2 = true;
  for (let i = cuerpoSinDigitoVerificador.length - 1; i >= 0; i--) {
    let n = parseInt(cuerpoSinDigitoVerificador[i]!, 10);
    if (mult2) {
      n *= 2;
      if (n > 9) n = Math.floor(n / 10) + (n % 10);
    }
    sum += n;
    mult2 = !mult2;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * 4 + 1 + 8 (YYYYMMDD) + 10 (centavos) + 9 (ref) + 1 (DV mód.10), cuerpo 32.
 */
function decodeF33(d: string): DecodificadoOk {
  const codigoEnte = d.slice(0, 4);
  const tipoVencimiento = d.slice(4, 5);
  const vencYmd = d.slice(5, 13);
  const montoStr = d.slice(13, 23);
  const referencia = d.slice(23, 32);
  const digitoVerificador = d.slice(32, 33);
  const cuerpo32 = d.slice(0, 32);
  const dvEsperado = digitoModulo10RecaudacionAR(cuerpo32);
  const dvLeido = parseInt(digitoVerificador, 10);
  const verificadorMod10Ok =
    Number.isFinite(dvEsperado) && !Number.isNaN(dvLeido) && dvEsperado === dvLeido;

  const montoNum = parseInt(montoStr, 10);
  const importePesos = Number.isFinite(montoNum) ? montoNum / 100 : undefined;

  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "f33_argentina",
    codigoEnte,
    tipoVencimiento,
    referencia,
    digitoVerificador,
    verificadorMod10Ok,
    importePesos,
    importeCentavos: importePesos != null ? Math.round(importePesos * 100) : undefined,
    primerVencimiento: fechaYYYYMMDD8aIso(vencYmd),
  });
}

/**
 * Formato 50 dígitos: ente 4, monto 8 (2 dec), venc 6, ref 13, relleno 18, DV mód.10 1.
 * Cuerpo de verificación: primeros 49 dígitos; dígito 50 = verificador.
 */
function decodeF50(d: string, extra?: { truncadoDe?: number }): DecodificadoOk {
  const idEmpresa = d.slice(0, 4);
  const montoStrLegacy = d.slice(4, 12);
  // Variante observada en cupones locales: monto en posiciones 22..31 (1-based), 10 dígitos con 2 decimales.
  const montoStrPos22a31 = d.slice(21, 31);
  const vencStr = d.slice(12, 18);
  const referencia = d.slice(18, 31);
  const relleno = d.slice(31, 49);
  const digitoVerificador = d.slice(49, 50);
  const cuerpo49 = d.slice(0, 49);
  const dvEsperado = digitoModulo10RecaudacionAR(cuerpo49);
  const dvLeido = parseInt(digitoVerificador, 10);
  const verificadorMod10Ok =
    Number.isFinite(dvEsperado) && !Number.isNaN(dvLeido) && dvEsperado === dvLeido;

  const montoNumLegacy = parseInt(montoStrLegacy, 10);
  const montoNumPos22a31 = parseInt(montoStrPos22a31, 10);
  const montoNum = !Number.isNaN(montoNumPos22a31) ? montoNumPos22a31 : montoNumLegacy;
  const importePesos = Number.isFinite(montoNum) ? montoNum / 100 : undefined;
  const importeCentavos = importePesos != null ? Math.round(importePesos * 100) : undefined;

  const vtoIso = vencARaIso(vencStr);
  const nota =
    (extra?.truncadoDe != null
      ? `Se leyeron los primeros 50 de ${extra.truncadoDe} caracteres. `
      : "") +
    (verificadorMod10Ok
      ? "Dígito verificador módulo 10 correcto. "
      : "Dígito verificador módulo 10 no coincide; reescaneá. ") +
    "Venc.: YYMMDD o convención del ente (algunos usan días desde base).";

  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "f50_argentina",
    codigoEnte: idEmpresa,
    referencia,
    relleno,
    digitoVerificador,
    verificadorMod10Ok,
    importePesos,
    importeCentavos,
    primerVencimiento: vtoIso,
    nota,
  });
}

function vencARaIso(v6: string): string | undefined {
  return v6.length === 6 ? vencYYMMDDaIso(v6) : undefined;
}

/** Interpretación común: YY + MM + DD (ej. 041070 → 2004-10-07) */
function vencYYMMDDaIso(v6: string): string | undefined {
  const yy = v6.slice(0, 2);
  const mm = v6.slice(2, 4);
  const dd = v6.slice(4, 6);
  return fechaYYMMDDvalida(yy, mm, dd);
}

/**
 * Formato 48 dígitos muy usado en facturas de servicios (I2of5 / Code128 en papel).
 * Layout aproximado (varía por ente): ente, id usuario, nro comprobante, fecha 1er vto, importe.
 */
function decodeF48(d: string): DecodificadoOk {
  const bloques6: string[] = [];
  for (let i = 0; i < 48; i += 6) {
    bloques6.push(d.slice(i, i + 6));
  }
  const codigoEnte = d.slice(4, 8);
  const identificacionUsuario = d.slice(8, 20);
  const numeroComprobante = d.slice(20, 32);
  const yy = d.slice(32, 34);
  const mm = d.slice(34, 36);
  const dd = d.slice(36, 38);
  const importeStr = d.slice(38, 46);
  const importeCentavos = parseInt(importeStr, 10);
  const importePesos = Number.isFinite(importeCentavos) ? importeCentavos / 100 : undefined;
  const primerVencimiento = fechaYYMMDDvalida(yy, mm, dd);

  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "f48_argentina",
    bloques6,
    codigoEnte,
    identificacionUsuario,
    numeroComprobante,
    primerVencimiento,
    importePesos,
    importeCentavos,
    nota:
      "Formato 48 dígitos (heurística recibo servicios AR). Confirmá monto y vencimiento en el papel; el ente puede usar otro corte de campos.",
  });
}

function decodeF44(d: string): DecodificadoOk {
  const grupos4: string[] = [];
  for (let i = 0; i < 44; i += 4) {
    grupos4.push(d.slice(i, i + 4));
  }
  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "f44_argentina",
    nota: `44 dígitos (grupos de 4): ${grupos4.join(" ")}. Formato de recaudación variable; validá con el cupón.`,
  });
}

function decodeF56(d: string): DecodificadoOk {
  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "f56_argentina",
    nota: "56 dígitos: posible factura multipago o referencia extendida. Validá con el recibo.",
  });
}

function decodeItf14(d: string): DecodificadoOk {
  return conServicioReferencia({
    ok: true,
    raw: d,
    digits: d,
    formato: "itf14",
    nota: "ITF-14 / SSCC (logística). Si era un servicio, reescaneá o probá otro tipo de código en el cupón.",
  });
}

/**
 * Punto de entrada: string leído por la cámara (puede incluir caracteres no numéricos en Code128).
 */
export function decodificarCodigoBarrasRecaudacion(data: string, tipoLectura?: string): Decodificado {
  const trimmed = data?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Código vacío", raw: data };
  }

  const digits = soloDigitos(trimmed);
  if (digits.length === 0) {
    return {
      ok: false,
      error: "No hay dígitos legibles; probá mejor luz o acercate al código.",
      raw: trimmed,
    };
  }

  const len = digits.length;

  if (len === 33) {
    const r = decodeF33(digits);
    return { ...r, tipoLectura };
  }
  if (len === 50) {
    const r = decodeF50(digits);
    return { ...r, tipoLectura };
  }
  if (len === 51 || len === 52) {
    const r = decodeF50(digits.slice(0, 50), { truncadoDe: len });
    return { ...r, digits, raw: trimmed, tipoLectura };
  }
  if (len === 13) {
    const r = decodeEan13(digits);
    return { ...r, tipoLectura };
  }
  if (len === 8) {
    const r = decodeEan8(digits);
    return { ...r, tipoLectura };
  }
  if (len === 14) {
    const r = decodeItf14(digits);
    return { ...r, tipoLectura };
  }
  if (len === 48) {
    const r = decodeF48(digits);
    return { ...r, tipoLectura };
  }
  if (len === 44) {
    const r = decodeF44(digits);
    return { ...r, tipoLectura };
  }
  if (len === 56) {
    const r = decodeF56(digits);
    return { ...r, tipoLectura };
  }
  if (len === 60) {
    return {
      ...conServicioReferencia({
        ok: true,
        raw: trimmed,
        digits,
        formato: "longitud_variable",
        nota: "60 dígitos: posible comprobante extendido. Copiá el valor para la pasarela cuando esté conectada.",
      }),
      tipoLectura,
    };
  }

  return {
    ...conServicioReferencia({
      ok: true,
      raw: trimmed,
      digits,
      formato: "desconocido",
      nota: `Longitud ${len} no estándar. Conservá el código para validación manual o backend.`,
    }),
    tipoLectura,
  };
}

/**
 * Texto amigable para mostrar en UI (1 línea + detalle).
 */
export function resumenDecodificado(d: Decodificado): { titulo: string; detalle: string } {
  if (!d.ok) {
    return { titulo: "No se pudo leer", detalle: d.error };
  }
  if (d.formato === "f33_argentina" && d.importePesos != null) {
    return {
      titulo: "Recibo (33 dígitos)",
      detalle: [
        `Monto: $ ${d.importePesos.toFixed(2).replace(".", ",")} ARS`,
        d.primerVencimiento && `Venc.: ${d.primerVencimiento}`,
        d.nombreEnte
          ? `Empresa: ${d.nombreEnte} (${d.codigoEnte})`
          : d.codigoEnte && `Empresa: ${d.codigoEnte}`,
        d.referencia && `Ref.: ${d.referencia}`,
        d.verificadorMod10Ok === false ? "Mód.10: revisar" : d.verificadorMod10Ok ? "Mód.10: OK" : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  if (d.formato === "f50_argentina" && d.importePesos != null) {
    return {
      titulo: "Recibo (50 dígitos, AR)",
      detalle: [
        `Monto: $ ${d.importePesos.toFixed(2).replace(".", ",")} ARS`,
        d.primerVencimiento && `Venc. (YYMMDD): ${d.primerVencimiento}`,
        d.nombreEnte
          ? `Empresa: ${d.nombreEnte} (${d.codigoEnte})`
          : d.codigoEnte && `ID empresa: ${d.codigoEnte}`,
        d.referencia && `Referencia: ${d.referencia}`,
        d.verificadorMod10Ok === false
          ? "Mód.10: revisar escaneo"
          : d.verificadorMod10Ok === true
            ? "Mód.10: OK"
            : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  if (d.formato === "f48_argentina" && d.importePesos != null) {
    return {
      titulo: "Factura / servicio (48 díg.)",
      detalle: [
        d.primerVencimiento && `Vto: ${d.primerVencimiento}`,
        `~ $ ${d.importePesos.toFixed(2)} ARS (estimado)`,
        d.nombreEnte
          ? `Ente: ${d.nombreEnte} (${d.codigoEnte})`
          : d.codigoEnte && `Ente: ${d.codigoEnte}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  if (d.formato === "ean13") {
    return {
      titulo: "EAN-13",
      detalle: `Prefijo ${d.ean?.prefijoPais ?? ""} · Luhn: ${d.ean?.validoLuhn ? "OK" : "revisar"}`,
    };
  }
  return {
    titulo: "Código leído",
    detalle: d.nota || `${d.digits.length} dígitos · ${d.formato}`,
  };
}
