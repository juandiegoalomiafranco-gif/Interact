/**
 * Tipos de dominio del dashboard.
 *
 * Deliberadamente independientes de la forma cruda de Airtable: la capa de
 * `lib/airtable/` traduce registros a estos tipos, y `lib/metrics.ts` solo
 * conoce estos. Así los cálculos se pueden escribir y probar sin tocar la API,
 * y un cambio de nombre de campo en Airtable no se propaga a las métricas.
 */

// ─────────────────────────── MIEMBROS ───────────────────────────

export const ESTADOS_MIEMBRO = ['Activo', 'Inactivo', 'Retirado'] as const;
export type EstadoMiembro = (typeof ESTADOS_MIEMBRO)[number];

export interface Miembro {
  id: string;
  nombre: string;
  rol: string | null;
  estado: EstadoMiembro | null;
  fechaIngreso: string | null;
}

// ─────────────────────────── PERIODOS ───────────────────────────

export interface Periodo {
  id: string;
  nombre: string;
  /** El mes del periodo se deriva de aquí, no del texto de `nombre`. */
  fechaInicio: string | null;
  fechaLimitePago: string | null;
  anioRotario: string | null;
  cerrado: boolean;
}

// ──────────────────────────── CUOTAS ────────────────────────────

export const ESTADOS_CUOTA = ['Pendiente', 'Pagado', 'Parcial', 'Exonerado'] as const;
export type EstadoCuota = (typeof ESTADOS_CUOTA)[number];

export interface Cuota {
  id: string;
  miembroId: string | null;
  periodoId: string | null;
  montoEsperado: number | null;
  montoPagado: number | null;
  estado: EstadoCuota | null;
  fechaPago: string | null;
  tieneSoporte: boolean;
}

// ────────────────────────── PROYECTOS ───────────────────────────

export interface Proyecto {
  id: string;
  nombre: string;
  estado: string | null;
  areaDeEnfoque: string | null;
  liderIds: string[];
  presupuestoAprobado: number | null;
  fechaInicio: string | null;
  fechaCierre: string | null;
}

// ─────────────────────────── EVENTOS ────────────────────────────

export interface Evento {
  id: string;
  nombre: string;
  fecha: string | null;
  proyectoIds: string[];
  metaRecaudacion: number | null;
  estado: string | null;
}

// ───────────────────────── MOVIMIENTOS ──────────────────────────

export const TIPOS_MOVIMIENTO = ['Ingreso', 'Egreso'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const ESTADOS_APROBACION = ['Aprobado', 'Pendiente', 'Rechazado'] as const;
export type EstadoAprobacion = (typeof ESTADOS_APROBACION)[number];

export interface Movimiento {
  id: string;
  concepto: string;
  fecha: string | null;
  tipo: TipoMovimiento | null;
  monto: number | null;
  categoria: string | null;
  estadoAprobacion: EstadoAprobacion | null;
  conciliado: boolean;
  tieneSoporte: boolean;
  proyectoIds: string[];
  eventoIds: string[];
}

// ─────────────────── DONANTES Y DONACIONES ──────────────────────

export interface Donante {
  id: string;
  nombre: string;
  tipo: string | null;
}

export const ESTADOS_DONACION = ['Comprometida', 'Recibida', 'Cancelada'] as const;
export type EstadoDonacion = (typeof ESTADOS_DONACION)[number];

export const TIPOS_APORTE = ['Dinero', 'Especie', 'Servicio'] as const;
export type TipoAporte = (typeof TIPOS_APORTE)[number];

export interface Donacion {
  id: string;
  donanteIds: string[];
  monto: number | null;
  estado: EstadoDonacion | null;
  tipoAporte: TipoAporte | null;
  /** Cuándo se prometió. De aquí salen los "días pendientes". */
  fechaCompromiso: string | null;
  /** Cuándo entró de verdad. De aquí sale el año rotario del ranking. */
  fechaRecepcion: string | null;
  proyectoIds: string[];
  eventoIds: string[];
}

// ─────────────────────────── SNAPSHOT ───────────────────────────

/**
 * Todo lo que el dashboard necesita, en una sola lectura.
 * Ningún componente consulta Airtable: todos reciben esto.
 */
export interface Snapshot {
  miembros: Miembro[];
  periodos: Periodo[];
  cuotas: Cuota[];
  proyectos: Proyecto[];
  eventos: Evento[];
  movimientos: Movimiento[];
  donantes: Donante[];
  donaciones: Donacion[];
  /** Timestamp ISO de cuándo se leyó Airtable. Se muestra en la UI. */
  obtenidoEn: string;
  /**
   * Tablas que todavía no existen en la base.
   *
   * Una tabla ausente llega como lista vacía, igual que una tabla vacía de
   * verdad, y las dos cosas no significan lo mismo: sin este campo el panel
   * mostraría un saldo de $0 donde en realidad falta crear MOVIMIENTOS.
   * Las vistas lo usan para decir qué falta en vez de inventar un cero.
   */
  faltantes: string[];
  /** true cuando los datos son de ejemplo (DEMO=1), no de Airtable. */
  esDemo?: boolean;
}
