import { parsearListaBlanca } from '@/lib/allowlist';

/**
 * Permisos de escritura hacia Airtable.
 *
 * El brief nació de solo lectura y se amplió a registrar información. El
 * token pasó a tener `data.records:write`, así que las barreras ya no están
 * en el token sino aquí. Este archivo es esa barrera, y es puro a propósito:
 * todo se puede probar sin tocar la API.
 *
 * CUATRO REGLAS, y ninguna es negociable desde una vista nueva:
 *
 *   1. PERIODOS no se escribe nunca.
 *   2. De cada tabla, solo los campos de su lista blanca.
 *   3. Solo POST y PATCH. Nunca DELETE.
 *   4. Solo correos que estén en EDITOR_EMAILS *y* en ALLOWED_EMAILS.
 *
 * Los datos son de un club con menores de edad, y un token con escritura
 * filtrado puede modificar la contabilidad. Estas reglas no detienen a
 * alguien que ya tenga el token —ese pasa por encima del código y va directo
 * a la API— pero sí evitan que un error nuestro convierta una vista nueva en
 * una vía para borrar el libro contable.
 */

// ────────────────────────── Tablas ──────────────────────────

/**
 * Lo que el panel puede escribir.
 *
 * Antes eran tres tablas y las demás estaban cerradas de golpe. El club pidió
 * poder corregir un proyecto, un evento o el rol de un miembro sin abrir
 * Airtable, así que la barrera bajó de nivel tabla a nivel campo: ahora la
 * lista de abajo dice QUÉ tablas, y CAMPOS_ESCRIBIBLES dice qué campos de
 * cada una. Es más fina, no más floja — los datos de contacto de un menor
 * siguen siendo inalcanzables desde la web, que era lo que la regla vieja
 * protegía de verdad.
 */
export const TABLAS_ESCRIBIBLES = [
  'MOVIMIENTOS',
  'CUOTAS',
  'DONACIONES',
  'DONANTES',
  'PROYECTOS',
  'EVENTOS',
  'MIEMBROS',
] as const;
export type TablaEscribible = (typeof TABLAS_ESCRIBIBLES)[number];

/**
 * PERIODOS es la única que queda cerrada, y no por descuido.
 *
 * Un periodo se abre y se cierra en reunión: `Cerrado` es la firma de que un
 * mes contable quedó sellado. Un formulario web que pueda desmarcarlo
 * convierte una decisión de junta en un clic, y reabre meses ya cuadrados.
 */
export const TABLAS_SOLO_LECTURA = ['PERIODOS'] as const;
export type TablaSoloLectura = (typeof TABLAS_SOLO_LECTURA)[number];

export type Tabla = TablaEscribible | TablaSoloLectura;

export function esEscribible(tabla: string): tabla is TablaEscribible {
  return (TABLAS_ESCRIBIBLES as readonly string[]).includes(tabla);
}

// ────────────────────────── Campos ──────────────────────────

/**
 * Qué campos puede tocar el panel, tabla por tabla.
 *
 * Los nombres son los de Airtable, con tildes y todo, porque así viajan en el
 * cuerpo del request.
 *
 * MIEMBROS es la razón de que esta lista exista. Buena parte del club son
 * menores de edad, y `Correo`, `Teléfono`, `Acudiente` y `Teléfono acudiente`
 * NO están aquí: el panel no los lee (ver `lib/airtable/mapeo.ts`) y tampoco
 * los puede escribir. Quien necesite cambiarle el teléfono a un miembro entra
 * a Airtable, donde ese dato está detrás de los permisos de la base y queda
 * en su historial de revisiones.
 *
 * Tampoco están los campos calculados ni los de solo lectura de Airtable
 * (rollups, fórmulas): mandarlos devuelve 422 y el error no dice cuál fue.
 */
export const CAMPOS_ESCRIBIBLES: Record<TablaEscribible, readonly string[]> = {
  MOVIMIENTOS: [
    'Concepto',
    'Fecha',
    'Tipo',
    'Monto',
    'Categoría',
    'Estado de aprobación',
    'Conciliado',
    'Proyecto',
    'Evento',
    'Observación',
  ],
  CUOTAS: [
    'Referencia',
    'Miembro',
    'Periodo',
    'Monto esperado',
    'Monto pagado',
    'Estado',
    'Fecha de pago',
    'Método',
    'Observación',
  ],
  DONACIONES: [
    'Referencia',
    'Donante',
    'Monto',
    'Estado',
    'Tipo de aporte',
    'Fecha de compromiso',
    'Fecha de recepción',
    'Proyecto',
    'Evento',
    'Observación',
  ],
  DONANTES: ['Nombre', 'Tipo', 'Contacto', 'Notas'],
  PROYECTOS: [
    'Proyecto',
    'Tipo',
    'Estado',
    'Área de enfoque',
    'Líder',
    'Fecha inicio',
    'Fecha cierre',
    'Presupuesto aprobado',
    'Fecha de aprobación',
    'Descripción',
  ],
  EVENTOS: ['Evento', 'Fecha', 'Lugar', 'Proyecto', 'Meta de recaudación', 'Responsables', 'Estado'],
  // Sin datos de contacto. Ver el comentario de arriba.
  MIEMBROS: ['Nombre', 'Rol', 'Estado', 'Institución', 'Notas'],
};

/** Los campos de MIEMBROS que jamás salen ni entran por la web. */
export const CAMPOS_PROHIBIDOS_MIEMBROS = [
  'Correo',
  'Teléfono',
  'Acudiente',
  'Teléfono acudiente',
] as const;

export function esCampoEscribible(tabla: TablaEscribible, campo: string): boolean {
  return CAMPOS_ESCRIBIBLES[tabla].includes(campo);
}

/** Los campos de `datos` que la tabla no acepta. Vacío = todo bien. */
export function camposNoPermitidos(tabla: TablaEscribible, datos: object): string[] {
  return Object.keys(datos).filter((campo) => !esCampoEscribible(tabla, campo));
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
  /** Los campos que se van a mandar. Se comprueban contra CAMPOS_ESCRIBIBLES. */
  datos?: object;
  listaEditores?: string[];
  listaBlanca?: string[];
}): { tabla: TablaEscribible; metodo: MetodoEscritura; correo: string } {
  const { tabla, metodo, correo, datos } = params;
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

  // El campo se comprueba ANTES que el permiso de la persona: mandar el
  // teléfono de un menor está mal aunque quien lo mande sea el tesorero.
  if (datos !== undefined) {
    const sobran = camposNoPermitidos(tabla, datos);
    if (sobran.length > 0) {
      throw new EscrituraNoPermitida(
        `El panel no puede escribir ${sobran.join(', ')} en ${tabla}. Campos permitidos: ${CAMPOS_ESCRIBIBLES[tabla].join(', ')}.`,
        'campo-no-escribible',
      );
    }
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
  // Un donante nuevo se crea casi siempre junto con su primera donación.
  if (tabla === 'DONANTES') return [etiquetaDe('DONANTES'), etiquetaDe('DONACIONES')];
  return [etiquetaDe(tabla)];
}
