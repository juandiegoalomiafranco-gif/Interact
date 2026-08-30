/**
 * Fechas del dashboard.
 *
 * Dos decisiones que evitan la clase de bug más común aquí:
 *
 * 1. Las fechas de Airtable son fechas de calendario, no instantes. Un pago
 *    del 1 de julio es del 1 de julio, se mire desde donde se mire. Por eso
 *    NO se parsean con `new Date('2026-07-01')`: eso da medianoche UTC, que
 *    en Colombia (UTC-5) es el 30 de junio a las 19:00, y el movimiento se
 *    cuenta en el mes equivocado. Se parsean a un {anio, mes, dia} plano.
 *
 * 2. "Hoy" se calcula en la zona de Bogotá, no en la del servidor. Vercel
 *    corre en UTC: el 31 de agosto a las 23:00 en Bogotá ya es 1 de
 *    septiembre en UTC, y "ingresos del mes en curso" mostraría el mes que
 *    no es durante cinco horas cada noche.
 */

export const ZONA = 'America/Bogota';

/** Fecha de calendario. `mes` va de 1 a 12, no de 0 a 11. */
export interface FechaSimple {
  anio: number;
  mes: number;
  dia: number;
}

export interface AnioRotario {
  /** Año en que arranca. Para 2026-2027, es 2026. */
  anioInicio: number;
  etiqueta: string;
  inicio: FechaSimple;
  fin: FechaSimple;
}

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Acepta 'YYYY-MM-DD' y timestamps ISO completos (se queda con la parte de
 * fecha). Devuelve null ante cualquier cosa que no sea una fecha válida.
 */
export function parseFecha(valor: string | null | undefined): FechaSimple | null {
  if (!valor) return null;
  const m = RE_FECHA.exec(valor);
  if (!m) return null;

  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  // Descarta cosas como 2026-02-31, que pasan la validación de rangos.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return { anio, mes, dia };
}

/** 'YYYY-MM-DD'. Útil para claves y para volver a serializar. */
export function formatearISO(f: FechaSimple): string {
  return `${String(f.anio).padStart(4, '0')}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`;
}

/**
 * Entero que ordena y resta meses sin pelear con años bisiestos.
 * Julio 2026 y agosto 2026 se diferencian en 1.
 */
export function claveMes(f: Pick<FechaSimple, 'anio' | 'mes'>): number {
  return f.anio * 12 + (f.mes - 1);
}

export function mesDesdeClave(clave: number): { anio: number; mes: number } {
  return { anio: Math.floor(clave / 12), mes: (clave % 12) + 1 };
}

export function mismoMes(
  a: Pick<FechaSimple, 'anio' | 'mes'>,
  b: Pick<FechaSimple, 'anio' | 'mes'>,
): boolean {
  return claveMes(a) === claveMes(b);
}

/** Negativo si a < b, 0 si iguales, positivo si a > b. */
export function compararFechas(a: FechaSimple, b: FechaSimple): number {
  if (a.anio !== b.anio) return a.anio - b.anio;
  if (a.mes !== b.mes) return a.mes - b.mes;
  return a.dia - b.dia;
}

/** Días calendario de `desde` a `hasta`. Negativo si `hasta` es anterior. */
export function diasEntre(desde: FechaSimple, hasta: FechaSimple): number {
  const a = Date.UTC(desde.anio, desde.mes - 1, desde.dia);
  const b = Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Hoy en Bogotá, no en la zona del servidor.
 * `en-CA` formatea como YYYY-MM-DD, que es justo lo que necesitamos.
 */
export function hoyEnBogota(ahora: Date = new Date()): FechaSimple {
  const texto = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);

  const f = parseFecha(texto);
  // Intl siempre devuelve una fecha válida con este formato.
  if (!f) throw new Error(`No se pudo interpretar la fecha de Bogotá: ${texto}`);
  return f;
}

/**
 * El año rotario va del 1 de julio al 30 de junio.
 * Julio 2026 → "2026-2027". Marzo 2026 → "2025-2026".
 */
export function anioRotarioDe(f: Pick<FechaSimple, 'anio' | 'mes'>): AnioRotario {
  const anioInicio = f.mes >= 7 ? f.anio : f.anio - 1;
  return {
    anioInicio,
    etiqueta: `${anioInicio}-${anioInicio + 1}`,
    inicio: { anio: anioInicio, mes: 7, dia: 1 },
    fin: { anio: anioInicio + 1, mes: 6, dia: 30 },
  };
}

/** Los doce meses del año rotario, arrancando en julio. Día 1 de cada uno. */
export function mesesDelAnioRotario(a: AnioRotario): FechaSimple[] {
  return Array.from({ length: 12 }, (_, i) => {
    const { anio, mes } = mesDesdeClave(claveMes(a.inicio) + i);
    return { anio, mes, dia: 1 };
  });
}

export function dentroDelAnioRotario(f: FechaSimple, a: AnioRotario): boolean {
  return compararFechas(f, a.inicio) >= 0 && compararFechas(f, a.fin) <= 0;
}

/**
 * Los últimos `n` meses contando el de `hasta`, del más viejo al más nuevo.
 * Para la gráfica de barras de la vista General.
 */
export function ultimosMeses(
  hasta: Pick<FechaSimple, 'anio' | 'mes'>,
  n: number,
): { anio: number; mes: number }[] {
  const fin = claveMes(hasta);
  return Array.from({ length: n }, (_, i) => mesDesdeClave(fin - (n - 1) + i));
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** 'julio' */
export function nombreMes(mes: number): string {
  return MESES_ES[mes - 1] ?? '';
}

/** 'Jul' — para los encabezados de la matriz de cuotas. */
export function mesCorto(mes: number): string {
  const n = nombreMes(mes);
  return n ? n.charAt(0).toUpperCase() + n.slice(1, 3) : '';
}
