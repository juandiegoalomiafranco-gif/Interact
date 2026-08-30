import { parsearListaBlanca } from '@/lib/allowlist';

/**
 * Permisos de escritura hacia Airtable.
 *
 * El brief nació de solo lectura y se amplió a registrar información. El
 * token pasó a tener `data.records:write`, así que las barreras ya no están
 * en el token sino aquí. Este archivo es esa barrera, y es puro a propósito:
 * todo se puede probar sin tocar la API.
 *
 * TRES REGLAS, y ninguna es negociable desde una vista nueva:
 *
 *   1. Solo tres tablas se pueden escribir.
 *   2. Solo POST y PATCH. Nunca DELETE.
 *   3. Solo correos que estén en EDITOR_EMAILS *y* en ALLOWED_EMAILS.
 *
 * Los datos son de un club con menores de edad, y un token con escritura
 * filtrado puede modificar la contabilidad. Estas reglas no detienen a
 * alguien que ya tenga el token —ese pasa por encima del código y va directo
 * a la API— pero sí evitan que un error nuestro convierta una vista nueva en
 * una vía para borrar el libro contable.
 */

// ────────────────────────── Tablas ──────────────────────────

/** Transaccionales: se registran a diario y por eso se pueden escribir. */
export const TABLAS_ESCRIBIBLES = ['MOVIMIENTOS', 'CUOTAS', 'DONACIONES'] as const;
export type TablaEscribible = (typeof TABLAS_ESCRIBIBLES)[number];

/**
 * De referencia: la app las lee y nunca las toca.
 *
 * MIEMBROS lleva datos de contacto de menores y sus acudientes. PERIODOS,
 * PROYECTOS y EVENTOS registran actos de gobierno del club —cerrar un mes,
 * aprobar un presupuesto, programar un evento— que se deciden en reunión, no
 * capturando un formulario.
 */
export const TABLAS_SOLO_LECTURA = ['MIEMBROS', 'PERIODOS', 'PROYECTOS', 'EVENTOS'] as const;
export type TablaSoloLectura = (typeof TABLAS_SOLO_LECTURA)[number];

export type Tabla = TablaEscribible | TablaSoloLectura;

export function esEscribible(tabla: string): tabla is TablaEscribible {
  return (TABLAS_ESCRIBIBLES as readonly string[]).includes(tabla);
}

// ────────────────────────── Métodos ──────────────────────────

/**
 * Los únicos verbos permitidos. DELETE no aparece en este tipo a propósito:
 * no es una omisión que alguien deba "completar" más adelante. Corregir un
 * error contable es un asiento nuevo o un PATCH, igual que en contabilidad
 * de papel, donde tampoco se arranca una hoja.
 */
export const METODOS_PERMITIDOS = ['POST', 'PATCH'] as const;
export type MetodoEscritura = (typeof METODOS_PERMITIDOS)[number];

export function esMetodoPermitido(metodo: string): metodo is MetodoEscritura {
  return (METODOS_PERMITIDOS as readonly string[]).includes(metodo);
}

// ──────────────────── Permiso de la persona ────────────────────

export type MotivoRechazoEscritura =
  /** No hay editores configurados. Error de despliegue, no del usuario. */
  | 'sin-editores'
  /** No llegó correo en la sesión. */
  | 'sin-correo'
  /** Puede ver, pero no registrar. */
  | 'no-es-editor'
  /** Está en EDITOR_EMAILS pero no en ALLOWED_EMAILS: configuración incoherente. */
  | 'editor-sin-acceso';

export type PermisoEscritura =
  | { permitido: true; correo: string }
  | { permitido: false; motivo: MotivoRechazoEscritura };

/**
 * Decide si alguien puede registrar información.
 *
 * Exige estar en las DOS listas. Un correo que pueda escribir pero no entrar
 * es una contradicción, y comprobarlo aquí —no solo al arrancar— evita que
 * una variable mal puesta en Vercel abra una puerta que la de sesión cierra.
 */
export function evaluarEscritura(params: {
  correo: string | null | undefined;
  listaEditores: string[];
  listaBlanca: string[];
}): PermisoEscritura {
  const { correo, listaEditores, listaBlanca } = params;

  // Igual que la lista blanca: vacía no autoriza a nadie.
  if (listaEditores.length === 0) return { permitido: false, motivo: 'sin-editores' };

  const normalizado = correo?.trim().toLowerCase();
  if (!normalizado) return { permitido: false, motivo: 'sin-correo' };

  if (!listaEditores.includes(normalizado)) {
    return { permitido: false, motivo: 'no-es-editor' };
  }

  if (!listaBlanca.includes(normalizado)) {
    return { permitido: false, motivo: 'editor-sin-acceso' };
  }

  return { permitido: true, correo: normalizado };
}

export function listaEditoresDelEntorno(): string[] {
  return parsearListaBlanca(process.env.EDITOR_EMAILS);
}

// ───────────────────── Guarda de cada escritura ─────────────────────

export class EscrituraNoPermitida extends Error {
  constructor(
    message: string,
    readonly motivo: string,
  ) {
    super(message);
    this.name = 'EscrituraNoPermitida';
  }
}

/**
 * Se llama antes de CADA escritura. Lanza si algo no cuadra en vez de
 * devolver un booleano: un `if` olvidado sería una puerta abierta, mientras
 * que una excepción no se puede ignorar por descuido.
 */
export function exigirEscrituraPermitida(params: {
  tabla: string;
  metodo: string;
  correo: string | null | undefined;
  listaEditores?: string[];
  listaBlanca?: string[];
}): { tabla: TablaEscribible; metodo: MetodoEscritura; correo: string } {
  const { tabla, metodo, correo } = params;
  const listaEditores = params.listaEditores ?? listaEditoresDelEntorno();
  const listaBlanca = params.listaBlanca ?? parsearListaBlanca(process.env.ALLOWED_EMAILS);

  if (!esEscribible(tabla)) {
    throw new EscrituraNoPermitida(
      `La tabla ${tabla} es de solo lectura. Solo se puede escribir en ${TABLAS_ESCRIBIBLES.join(', ')}.`,
      'tabla-no-escribible',
    );
  }

  if (!esMetodoPermitido(metodo)) {
    throw new EscrituraNoPermitida(
      `El método ${metodo} no está permitido. Solo ${METODOS_PERMITIDOS.join(' y ')}: nada se borra desde el panel.`,
      'metodo-no-permitido',
    );
  }

  const permiso = evaluarEscritura({ correo, listaEditores, listaBlanca });
  if (!permiso.permitido) {
    throw new EscrituraNoPermitida(
      'No tienes permiso para registrar información en el panel.',
      permiso.motivo,
    );
  }

  return { tabla, metodo, correo: permiso.correo };
}

// ──────────────── Etiquetas de caché, una por tabla ────────────────

/**
 * Una etiqueta por tabla, no una sola para todo.
 *
 * Con una etiqueta compartida, guardar un movimiento invalidaría las ocho
 * tablas y la siguiente carga costaría ~15 llamadas. A ~85 registros al mes
 * son ~1.275 llamadas solo en releer, contra una cuota de 1.000. Por tabla,
 * el mismo trabajo cuesta ~255.
 */
export function etiquetaDe(tabla: Tabla): string {
  return `airtable:${tabla.toLowerCase()}`;
}

/** Las tablas que hay que refrescar después de escribir en una de ellas. */
export function etiquetasAInvalidar(tabla: TablaEscribible): string[] {
  // Registrar un pago de cuota toca CUOTAS y crea un MOVIMIENTO, así que
  // invalidar cuotas sin movimientos dejaría el saldo desactualizado.
  if (tabla === 'CUOTAS') return [etiquetaDe('CUOTAS'), etiquetaDe('MOVIMIENTOS')];
  if (tabla === 'DONACIONES') return [etiquetaDe('DONACIONES'), etiquetaDe('MOVIMIENTOS')];
  return [etiquetaDe(tabla)];
}
