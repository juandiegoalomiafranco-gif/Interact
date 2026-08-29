import { parseFecha, type FechaSimple } from './fechas';

/**
 * Formato de moneda y fechas para Colombia.
 * Los pesos no llevan centavos, así que todo va con 0 decimales.
 */

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** '$1.200.000'. Un valor ausente se muestra como '—', no como '$0'. */
export function formatCOP(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || !Number.isFinite(monto)) return '—';
  return COP.format(monto);
}

const MILLON = 1_000_000;

const ABREVIADO = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * '$1,2 M' para las tarjetas de indicadores, donde el número compite con
 * poco espacio. Por debajo del millón se muestra completo: '$850.000' cabe
 * y es más claro que inventarle una abreviatura.
 *
 * No se abrevia a "mil millones" ni a "B": en español un billón es un millón
 * de millones, y la confusión con el billion inglés es un error caro en un
 * tablero de plata. Un valor grande simplemente sigue creciendo en millones
 * ('$1.200 M' son mil doscientos millones).
 */
export function formatCOPAbreviado(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || !Number.isFinite(monto)) return '—';
  if (Math.abs(monto) < MILLON) return COP.format(monto);
  return `${ABREVIADO.format(monto / MILLON)} M`;
}

const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  // Las fechas son de calendario: se formatean en UTC para que no se corran
  // un día según dónde esté el servidor o quien mira.
  timeZone: 'UTC',
});

/** '15/7/2026'. Acepta la fecha ya parseada o el string crudo de Airtable. */
export function formatFecha(valor: FechaSimple | string | null | undefined): string {
  const f = typeof valor === 'string' || valor === null || valor === undefined
    ? parseFecha(valor)
    : valor;
  if (!f) return '—';
  return FECHA.format(new Date(Date.UTC(f.anio, f.mes - 1, f.dia)));
}

const PORCENTAJE = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** Recibe la fracción (0,85), no el número entero. Devuelve '85%'. */
export function formatPorcentaje(fraccion: number | null | undefined): string {
  if (fraccion === null || fraccion === undefined || !Number.isFinite(fraccion)) return '—';
  return PORCENTAJE.format(fraccion);
}
