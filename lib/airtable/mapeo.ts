import {
  ESTADOS_APROBACION,
  ESTADOS_CUOTA,
  ESTADOS_DONACION,
  ESTADOS_MIEMBRO,
  TIPOS_APORTE,
  TIPOS_MOVIMIENTO,
  type Cuota,
  type Donacion,
  type Donante,
  type Evento,
  type Miembro,
  type Movimiento,
  type Periodo,
  type Proyecto,
} from '@/types/domain';
import type { RegistroCrudo } from './cliente';

/**
 * Traduce el registro crudo de Airtable a los tipos de `types/domain.ts`.
 *
 * Es la frontera del sistema, y por eso es la única parte que conoce los
 * nombres de campo con tilde. De aquí para adentro, `lib/metrics.ts` y las
 * vistas hablan solo de dominio: renombrar "Monto esperado" en Airtable se
 * arregla en este archivo y en ningún otro.
 *
 * DOS REGLAS:
 *
 * 1. Un campo ausente es `null`, jamás `0` ni `''`. Airtable omite las celdas
 *    vacías del JSON, así que "no lo llenaron" y "vale cero" llegan iguales
 *    si uno no tiene cuidado — y en un panel de plata confundirlos es grave.
 *
 * 2. De MIEMBROS no se leen `Correo`, `Teléfono`, `Acudiente` ni `Teléfono
 *    acudiente`. Buena parte del club son menores de edad; ese dato no tiene
 *    por qué viajar al servidor del panel, y menos quedar en un caché.
 */

// ────────────────────────── Lectores de celda ──────────────────────────

function texto(campos: Record<string, unknown>, nombre: string): string | null {
  const v = campos[nombre];
  if (typeof v !== 'string') return null;
  const limpio = v.trim();
  return limpio === '' ? null : limpio;
}

/** Para el campo principal, que siempre debe tener algo que mostrar. */
function textoObligatorio(campos: Record<string, unknown>, nombre: string): string {
  return texto(campos, nombre) ?? '(sin nombre)';
}

function numero(campos: Record<string, unknown>, nombre: string): number | null {
  const v = campos[nombre];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Una casilla sin marcar no viene en el JSON: ausencia es `false`. */
function casilla(campos: Record<string, unknown>, nombre: string): boolean {
  return campos[nombre] === true;
}

/** Los enlaces de Airtable son arrays de ids de registro. */
function enlaces(campos: Record<string, unknown>, nombre: string): string[] {
  const v = campos[nombre];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * El primero de un enlace que en la práctica es uno solo (la cuota pertenece
 * a un miembro). Si alguien enlazó dos por error, se toma el primero y no se
 * revienta: el dashboard sigue mostrando el resto de la fila.
 */
function unEnlace(campos: Record<string, unknown>, nombre: string): string | null {
  return enlaces(campos, nombre)[0] ?? null;
}

/** Un adjunto es un array; lo único que interesa es si hay alguno. */
function hayAdjunto(campos: Record<string, unknown>, nombre: string): boolean {
  const v = campos[nombre];
  return Array.isArray(v) && v.length > 0;
}

/**
 * Un `singleSelect` cuyo valor no está en el enum del dominio devuelve `null`.
 *
 * Pasa de verdad: alguien agrega la opción "En revisión" en Airtable y el
 * código no la conoce. Devolver el texto crudo lo colaría en cálculos que
 * comparan contra el enum; devolver `null` lo deja fuera y visible como
 * "sin dato", que es lo que es.
 */
function opcion<T extends string>(
  campos: Record<string, unknown>,
  nombre: string,
  validas: readonly T[],
): T | null {
  const v = texto(campos, nombre);
  return v !== null && (validas as readonly string[]).includes(v) ? (v as T) : null;
}

// ─────────────────────────────── Tablas ───────────────────────────────

export function aMiembro({ id, fields }: RegistroCrudo): Miembro {
  return {
    id,
    nombre: textoObligatorio(fields, 'Nombre'),
    rol: texto(fields, 'Rol'),
    estado: opcion(fields, 'Estado', ESTADOS_MIEMBRO),
    fechaIngreso: texto(fields, 'Fecha de ingreso'),
    // `Correo`, `Teléfono`, `Acudiente` y `Teléfono acudiente` NO se leen.
  };
}

export function aPeriodo({ id, fields }: RegistroCrudo): Periodo {
  return {
    id,
    nombre: textoObligatorio(fields, 'Periodo'),
    fechaInicio: texto(fields, 'Fecha inicio'),
    fechaLimitePago: texto(fields, 'Fecha límite de pago'),
    anioRotario: texto(fields, 'Año rotario'),
    cerrado: casilla(fields, 'Cerrado'),
  };
}

export function aCuota({ id, fields }: RegistroCrudo): Cuota {
  return {
    id,
    miembroId: unEnlace(fields, 'Miembro'),
    periodoId: unEnlace(fields, 'Periodo'),
    montoEsperado: numero(fields, 'Monto esperado'),
    montoPagado: numero(fields, 'Monto pagado'),
    estado: opcion(fields, 'Estado', ESTADOS_CUOTA),
    fechaPago: texto(fields, 'Fecha de pago'),
    tieneSoporte: hayAdjunto(fields, 'Soporte'),
  };
}

export function aProyecto({ id, fields }: RegistroCrudo): Proyecto {
  return {
    id,
    nombre: textoObligatorio(fields, 'Proyecto'),
    estado: texto(fields, 'Estado'),
    areaDeEnfoque: texto(fields, 'Área de enfoque'),
    liderIds: enlaces(fields, 'Líder'),
    presupuestoAprobado: numero(fields, 'Presupuesto aprobado'),
    fechaInicio: texto(fields, 'Fecha inicio'),
    fechaCierre: texto(fields, 'Fecha cierre'),
  };
}

export function aEvento({ id, fields }: RegistroCrudo): Evento {
  return {
    id,
    nombre: textoObligatorio(fields, 'Evento'),
    fecha: texto(fields, 'Fecha'),
    proyectoIds: enlaces(fields, 'Proyecto'),
    metaRecaudacion: numero(fields, 'Meta de recaudación'),
    estado: texto(fields, 'Estado'),
  };
}

export function aMovimiento({ id, fields }: RegistroCrudo): Movimiento {
  return {
    id,
    concepto: textoObligatorio(fields, 'Concepto'),
    fecha: texto(fields, 'Fecha'),
    tipo: opcion(fields, 'Tipo', TIPOS_MOVIMIENTO),
    monto: numero(fields, 'Monto'),
    categoria: texto(fields, 'Categoría'),
    estadoAprobacion: opcion(fields, 'Estado de aprobación', ESTADOS_APROBACION),
    conciliado: casilla(fields, 'Conciliado'),
    tieneSoporte: hayAdjunto(fields, 'Soporte'),
    proyectoIds: enlaces(fields, 'Proyecto'),
    eventoIds: enlaces(fields, 'Evento'),
  };
}

export function aDonante({ id, fields }: RegistroCrudo): Donante {
  return {
    id,
    nombre: textoObligatorio(fields, 'Nombre'),
    tipo: texto(fields, 'Tipo'),
  };
}

export function aDonacion({ id, fields }: RegistroCrudo): Donacion {
  return {
    id,
    donanteIds: enlaces(fields, 'Donante'),
    monto: numero(fields, 'Monto'),
    estado: opcion(fields, 'Estado', ESTADOS_DONACION),
    tipoAporte: opcion(fields, 'Tipo de aporte', TIPOS_APORTE),
    fechaCompromiso: texto(fields, 'Fecha de compromiso'),
    fechaRecepcion: texto(fields, 'Fecha de recepción'),
    proyectoIds: enlaces(fields, 'Proyecto'),
    eventoIds: enlaces(fields, 'Evento'),
  };
}
