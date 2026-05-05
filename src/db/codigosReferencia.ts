/**
 * Base de datos lógica **codigos_referencia** (mock en bundle).
 * Clave: 4 primeros dígitos del ente (recaudación AR) o del código completo
 * si no hay `codigoEnte` en el decodificador.
 * Reemplazable luego por SQLite/API sin cambiar la firma de búsqueda.
 */

export const NOMBRE_BASE_DATOS = "codigos_referencia" as const;

export const SERVICIO_NO_CARGADO = "Servicio no cargado" as const;

/**
 * Registros mock (prefijo 4 dígitos → descripción de servicio / empresa).
 * Incluye el listado de referencia comunitario que dimos y un prefijo extra de prueba.
 */
const REGISTROS: Readonly<Record<string, string>> = Object.freeze({
  // Electricidad
  "9826": "EDESUR (Empresa Distribuidora Sur)",
  "9827": "EDENOR (Empresa Distribuidora Norte)",
  "9828": "EDELAP (La Plata y alrededores)",
  "5368": "EPEC (Córdoba)",
  "9034": "EDES (Bahía Blanca)",
  "9035": "EDEN (Entre Ríos Norte)",
  "9036": "EDES (Buenos Aires Sur)",
  "9800": "EDEA (Mar del Plata)",
  "6450": "ENERSA (Entre Ríos)",
  "5012": "EMSA (Misiones)",
  "5014": "DPEC (Corrientes)",
  "5015": "EPNE (Chaco)",
  "5016": "EPEN (Neuquén)",
  "5017": "EDELAR (La Rioja)",
  "5018": "EDET (Tucumán)",
  "5019": "EPE (Santa Fe)",
  "5020": "ANDE (Salta)",
  "5021": "EJESA (Jujuy)",
  "5022": "EDEMSA (Mendoza)",
  "5023": "EMSE (San Luis)",
  "5024": "DPEJ (San Juan)",
  "5025": "EPEN (Chubut)",
  "5026": "SERCOP (Catamarca)",
  "5027": "AEE (Santiago del Estero)",
  "5028": "CALF (Cooperativa Neuquén)",
  "5029": "ESEBA (Buenos Aires provincia)",
  "5030": "EDESE (San Luis)",
  "5031": "SEC (Santa Cruz)",
  "5032": "SPSE (Santa Cruz)",
  "9830": "Coop. eléctrica Godoy Cruz",
  "9831": "Coop. eléctrica San Francisco",
  "9832": "Luz y Fuerza Mar del Plata",
  // Gas
  "6931": "Metrogas (Buenos Aires)",
  "9999": "Naturgy (ex Gas Natural BAN - Buenos Aires)",
  "5100": "Camuzzi Gas Pampeana",
  "5101": "Camuzzi Gas del Sur",
  "5102": "Gasnor (Noroeste)",
  "5103": "Gasnea (Noreste)",
  "5104": "Litoral Gas (Santa Fe / Entre Ríos)",
  "5105": "Cuyana Gas (Cuyo)",
  "5106": "Distribuidora de Gas del Centro",
  "5107": "Enargas (regulador, no distribuye)",
  // Agua
  "8236": "AySA (Buenos Aires)",
  "5200": "ABSA (Aguas Bonaerenses)",
  "5201": "ACUMAR",
  "5202": "Aysam (Mendoza)",
  "5203": "Aguas de Corrientes",
  "5204": "Aguas de Entre Ríos",
  "5205": "Aguas Provinciales de Santa Fe",
  "5206": "Aguas del Chaco",
  "5207": "Aguas de Salta",
  "5208": "Aguas de Tucumán",
  "5209": "Aguas del Comahue (Neuquén / Río Negro)",
  "5210": "Spar (San Juan)",
  "5211": "Samsa (Santa Cruz)",
  // Telefonía fija
  "7990": "Telecom (Buenos Aires y Litoral)",
  "7991": "Telefónica / Movistar fija (Buenos Aires)",
  "5300": "Telecom interior",
  "5301": "Conetel / Teco Norte",
  "5302": "CNC (interior)",
  /** Regla pedida: prefijo 5304 => Aguas Santafesinas */
  "5304": "Aguas Santafesinas",
  // Telefonía móvil
  "9111": "Movistar",
  "8368": "Claro (ex CTI / AMX)",
  "7900": "Personal (Telecom)",
  "5400": "Tuenti",
  "5401": "Nextel (integrada a Claro)",
  // Internet / TV
  "5925": "DirecTV (satelital)",
  "8500": "Telecentro (Buenos Aires)",
  "8501": "Cablevisión / Fibertel",
  "8502": "Cablevisión Flow",
  "8503": "Cablevisión HFC",
  "5500": "Supercanal (Mendoza)",
  "5501": "Cablehogar",
  "5502": "Red Intercable",
  "5503": "Gigared",
  "5504": "IPlan (empresas)",
  "5505": "Speedy / Arnet (ex Telefónica)",
  "5506": "Cablevisión Norte",
  // Impuestos
  "9001": "AFIP / ARCA",
  "9002": "AGIP (CABA - ingresos brutos)",
  "9003": "ARBA (PBA - rentas)",
  "9004": "Rentas Córdoba",
  "9005": "Rentas Santa Fe",
  "9006": "DGR Mendoza",
  "9007": "DGR Tucumán",
  "9008": "DGR Salta",
  "9009": "Rentas Entre Ríos",
  "9010": "ATER (Entre Ríos)",
  "9011": "Rentas San Juan",
  "9012": "DPR Neuquén",
  "9013": "DPIP Formosa",
  "9014": "Min. de Hacienda Jujuy",
  "9015": "DPIP Chaco",
  "9016": "Rentas Corrientes",
  "9017": "Rentas Misiones",
  "9018": "Rentas San Luis",
  "9019": "Serv. tributarios Chubut",
  "9020": "DGR La Rioja",
  "9021": "DGR Catamarca",
  "9022": "Serv. de Rentas Santiago del Estero",
  "9023": "ATM (Agencia Tributaria Mendoza)",
  "9100": "ANSES (pagos varios)",
  "9101": "PAMI",
  "9102": "APRA (ex ACUMAR - ambiental)",
  // Municipios
  "9200": "Municipalidad de Buenos Aires (GCBA)",
  "9201": "Municipalidad de Córdoba",
  "9202": "Municipalidad de Rosario",
  "9203": "Municipalidad de Mendoza",
  "9204": "Municipalidad de Tucumán",
  "9205": "Municipalidad de Mar del Plata",
  "9206": "Municipalidad de La Plata",
  "9207": "Municipalidad de Salta",
  "9208": "Municipalidad de Santa Fe",
  "9209": "Municipalidad de San Juan",
  "9210": "Municipalidad de Resistencia",
  "9211": "Municipalidad de Corrientes",
  "9212": "Municipalidad de Posadas",
  "9213": "Municipalidad de Neuquén",
  "9214": "Municipalidad de Bahía Blanca",
  "9215": "Municipalidad de San Luis",
  "9216": "Municipalidad de Río Cuarto",
  "9217": "Municipalidad de Comodoro Rivadavia",
  // Tarjetas
  "5600": "Visa Argentina",
  "5601": "Mastercard Argentina",
  "5602": "American Express Argentina",
  "5603": "Cabal",
  "5604": "Naranja X",
  "5605": "Tarjeta Nevada",
  "5606": "Tarjeta Nativa",
  "5607": "Tarjeta Sol",
  "5608": "Mas Card (ex Carrefour)",
  "5609": "Tarjeta Shopping",
  "5610": "Tarjeta Cencosud / Jumbo",
  "5611": "Tarjeta Lider",
  "5612": "CMR Falabella",
  "5613": "Tarjeta Walmart",
  "5614": "Tarjeta Credimas",
  // Bancos
  "5700": "Banco Nación (BNA)",
  "5701": "Banco Provincia (BAPRO)",
  "5702": "Banco Ciudad (Buenos Aires)",
  "5703": "Banco Galicia",
  "5704": "Banco Santander Argentina",
  "5705": "Banco Macro",
  "5706": "BBVA Argentina",
  "5707": "Banco Credicoop",
  "5708": "Banco HSBC Argentina",
  "5709": "Banco Supervielle",
  "5710": "Banco Patagonia",
  "5711": "Banco Hipotecario",
  "5712": "BICE",
  "5713": "Banco Columbia",
  "5714": "Banco Comafi",
  "5715": "Banco de Valores",
  "5716": "Banco Meridian",
  "5717": "Banco Piano",
  "5718": "ICBC",
  "5719": "Banco Itaú Argentina",
  "5720": "Banco Bradesco Argentina",
  "5721": "Brubank",
  "5722": "Naranja X préstamos",
  "5723": "Ualá",
  // Seguros
  "5800": "La Caja Seguros",
  "5801": "SMG Seguros",
  "5802": "Federación Patronal",
  "5803": "Zurich Seguros",
  "5804": "Mapfre Argentina",
  "5805": "Prudential Seguros",
  "5806": "Galicia Seguros",
  "5807": "Provincia Seguros (BAPRO)",
  "5808": "Nación Seguros (BNA)",
  "5809": "Rivadavia Seguros",
  "5810": "Prevención Seguros",
  // Salud
  "5900": "OSDE",
  "5901": "Swiss Medical",
  "5902": "Médicus",
  "5903": "Galeno",
  "5904": "OMINT",
  "5905": "Hospital Italiano (plan de salud)",
  "5906": "Sancor Salud",
  "5907": "OSECAC",
  "5908": "Obra social empleados de comercio",
  "5909": "OSSEG",
  "5910": "Osprera (rurales)",
  "5911": "Ospat",
  "5912": "Ospm (periodistas)",
  "5913": "Ospe (espectáculo público)",
  "5914": "Osuthgra (hoteleros y gastronómicos)",
  // Educación
  "6000": "UBA",
  "6001": "UNC",
  "6002": "UNLP",
  "6003": "UNR",
  "6004": "UADE",
  "6005": "Universidad Austral",
  "6006": "Universidad de Belgrano",
  "6007": "Universidad de Palermo",
  "6008": "Universidad Siglo 21",
  "6009": "CAECE",
  "6010": "UTN",
  "6011": "CONICET",
  // Combustibles / transporte
  "6100": "YPF (débitos / planes)",
  "6101": "Shell / Raizen",
  "6102": "Axion Energy",
  "6103": "Puma Energy",
  "6110": "Autopistas del Sol (Buenos Aires)",
  "6111": "Autopista Ezeiza–Cañuelas",
  "6112": "Grupo Concesionario del Oeste (GCO)",
  "6113": "AUSA",
  "6114": "Caminos del Río Uruguay",
  "6115": "Autopistas y Túneles (Memphis)",
  "6120": "Ferrovías (tren)",
  "6121": "Metrovías (subte CABA)",
  "6122": "Trenes Argentinos",
  // Varios
  "7000": "Expensas consorcio (genérico)",
  "7001": "Administración Bernetti",
  "7002": "Administración Herreros",
  "7100": "Prepago gas envasado",
  "7200": "Correo Argentino",
  "7201": "Andreani",
  "7202": "OCA (encomiendas)",
  "7300": "Coto (débito cuenta corriente)",
  "7301": "Carrefour Argentina",
  "7302": "Disco / Vea",
  "7400": "Movistar Hogar (bundle fijo + móvil)",
});

/**
 * Búsqueda en la tabla mock por clave de 4 dígitos.
 */
export function buscarEnCodigosReferencia(prefijo4: string): string | null {
  const k = String(prefijo4).replace(/\D/g, "").slice(0, 4);
  if (k.length !== 4) return null;
  return REGISTROS[k] ?? null;
}

/**
 * Nombre a mostrar: fila de **codigos_referencia** o `SERVICIO_NO_CARGADO`.
 */
export function servicioDesdeCodigosReferencia(
  codigoEnte: string | undefined,
  digitos: string
): string {
  const d = String(digitos).replace(/\D/g, "");
  const deEnte = codigoEnte && String(codigoEnte).replace(/\D/g, "");
  const prefijo4 =
    deEnte && deEnte.length >= 4 ? deEnte.slice(0, 4) : d.length >= 4 ? d.slice(0, 4) : "";
  if (prefijo4.length !== 4) return SERVICIO_NO_CARGADO;
  return buscarEnCodigosReferencia(prefijo4) ?? SERVICIO_NO_CARGADO;
}

export function contarRegistrosCodigosReferencia(): number {
  return Object.keys(REGISTROS).length;
}
