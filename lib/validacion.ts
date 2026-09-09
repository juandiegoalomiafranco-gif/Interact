/**
 * Validación de lo que se captura en los formularios del panel.
 *
 * Pura y sin dependencias: recibe strings crudos de un `FormData` y devuelve
 * o el valor limpio o un error en español. Se prueba entera sin montar un
 * formulario ni tocar la red.
 *
 * Corre en el servidor, dentro de la Server Action. Validar solo en el
 * navegador no protege nada: cualquiera puede mandar el POST a mano.
 */

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

const bien = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
const mal = (error: string): Resultado<never> => ({ ok: false, error });

/** Lo que devuelve una Server Action cuando algo no cuadra. */
export interface ErroresFormulario {
  /** Mensaje por campo, con el nombre del input como llave. */
  campos: Record<string, string>;
  /** Un problema que no es de un campo en particular. */
  general?: string;
  /**
   * Lo que la persona alcanzó a escribir, para volver a pintarlo.
   *
   * Hace falta porque React 19 resetea el formulario cuando la acción
   * termina, incluso si terminó en error. Sin esto, equivocarse en el monto
   * borra también el concepto, la categoría y la fecha — y quien está
   * registrando tres recibos seguidos abandona a la segunda vez que le pasa.
   */
  valores?: Record<string, string>;
}

// ─────────────────────────────── Texto ───────────────────────────────

export function textoRequerido(valor: unknown, etiqueta: string, maximo = 200): Resultado<string> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return mal(`${etiqueta} no puede quedar vacío.`);
  if (s.length > maximo) return mal(`${etiqueta} no puede pasar de ${maximo} caracteres.`);
  return bien(s);
}

export function textoOpcional(valor: unknown, maximo = 2000): Resultado<string | null> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return bien(null);
  if (s.length > maximo) return mal(`El texto no puede pasar de ${maximo} caracteres.`);
  return bien(s);
}

// ─────────────────────────────── Montos ───────────────────────────────

/**
 * Acepta lo que la gente escribe de verdad: "25.000", "$ 25.000", "25000".
 *
 * En Colombia el punto separa miles, así que se quita antes de convertir. Un
 * `parseFloat('25.000')` daría 25 —veinticinco pesos— y ese error entraría
 * al libro contable sin que nadie lo notara.
 */
export function monto(valor: unknown, etiqueta = 'El monto'): Resultado<number> {
  const crudo = typeof valor === 'string' ? valor.trim() : '';
  if (crudo === '') return mal(`${etiqueta} es obligatorio.`);

  const limpio = crudo.replace(/[$\s.]/g, '').replace(',', '.');
  const n = Number(limpio);

  if (!Number.isFinite(n)) return mal(`${etiqueta} tiene que ser un número.`);
  if (n <= 0) return mal(`${etiqueta} tiene que ser mayor que cero.`);
  // Mil millones de pesos en un club escolar es un dedo de más, no un aporte.
  if (n > 1_000_000_000) return mal(`${etiqueta} se ve demasiado grande. Revísalo.`);

  return bien(Math.round(n));
}

export function montoOpcional(valor: unknown, etiqueta = 'El monto'): Resultado<number | null> {
  const crudo = typeof valor === 'string' ? valor.trim() : '';
  if (crudo === '') return bien(null);
  const r = monto(crudo, etiqueta);
  return r.ok ? bien(r.valor) : r;
}

// ─────────────────────────────── Fechas ───────────────────────────────

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Solo `YYYY-MM-DD`, que es lo que manda un `<input type="date">` y lo que
 * Airtable guarda. Se comprueba que la fecha exista de verdad: `2026-02-31`
 * pasa el regex y no es un día.
 */
export function fecha(valor: unknown, etiqueta = 'La fecha'): Resultado<string> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return mal(`${etiqueta} es obligatoria.`);

  const m = ISO.exec(s);
  if (!m) return mal(`${etiqueta} tiene que venir en formato AAAA-MM-DD.`);

  const [, a, mes, dia] = m;
  const d = new Date(Date.UTC(Number(a), Number(mes) - 1, Number(dia)));
  const existe =
    d.getUTCFullYear() === Number(a) &&
    d.getUTCMonth() === Number(mes) - 1 &&
    d.getUTCDate() === Number(dia);

  if (!existe) return mal(`${etiqueta} no existe en el calendario.`);
  return bien(s);
}

export function fechaOpcional(valor: unknown, etiqueta = 'La fecha'): Resultado<string | null> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return bien(null);
  const r = fecha(s, etiqueta);
  return r.ok ? bien(r.valor) : r;
}

// ────────────────────────────── Opciones ──────────────────────────────

/**
 * Un valor que tiene que estar en la lista.
 *
 * Sin esto, un `<select>` manipulado metería "Traslado" en el campo Tipo de
 * un movimiento, y `lib/metrics.ts` —que compara contra 'Ingreso' y
 * 'Egreso'— lo dejaría fuera del saldo en silencio.
 */
export function opcion<T extends string>(
  valor: unknown,
  validas: readonly T[],
  etiqueta: string,
): Resultado<T> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return mal(`Elige ${etiqueta}.`);
  if (!(validas as readonly string[]).includes(s)) {
    return mal(`${s} no es un valor válido para ${etiqueta}.`);
  }
  return bien(s as T);
}

export function opcionOpcional<T extends string>(
  valor: unknown,
  validas: readonly T[],
  etiqueta: string,
): Resultado<T | null> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return bien(null);
  const r = opcion(s, validas, etiqueta);
  return r.ok ? bien(r.valor) : r;
}

// ────────────────────────── Ids de Airtable ──────────────────────────

const REC = /^rec[A-Za-z0-9]{14}$/;

/**
 * Los ids de registro empiezan por `rec` y traen 14 caracteres más.
 * Comprobarlo evita mandarle a la API un id inventado desde el navegador.
 *
 * Los datos de ejemplo usan ids que no siguen ese formato, así que en modo
 * demo esta comprobación no aplica — y en modo demo tampoco se escribe nada.
 */
export function idRegistro(valor: unknown, etiqueta: string): Resultado<string> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return mal(`Falta ${etiqueta}.`);
  if (!REC.test(s)) return mal(`El identificador de ${etiqueta} no es válido.`);
  return bien(s);
}

export function idOpcional(valor: unknown, etiqueta: string): Resultado<string | null> {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (s === '') return bien(null);
  const r = idRegistro(s, etiqueta);
  return r.ok ? bien(r.valor) : r;
}

// ───────────────────────────── Recolector ─────────────────────────────

/**
 * Junta varias validaciones y devuelve todos los errores de una, no el
 * primero: hacer que alguien reenvíe el formulario cinco veces para
 * enterarse de cinco errores es una forma lenta de perder los datos.
 */
export class Recolector {
  readonly errores: Record<string, string> = {};

  /** Valida un campo. Devuelve el valor, o `undefined` si falló. */
  campo<T>(nombre: string, resultado: Resultado<T>): T | undefined {
    if (resultado.ok) return resultado.valor;
    this.errores[nombre] = resultado.error;
    return undefined;
  }

  get hayErrores(): boolean {
    return Object.keys(this.errores).length > 0;
  }

  aFormulario(valores?: FormData, general?: string): ErroresFormulario {
    return {
      campos: this.errores,
      ...(general ? { general } : {}),
      ...(valores ? { valores: valoresDe(valores) } : {}),
    };
  }
}

/**
 * El FormData como objeto plano de strings.
 *
 * Solo entradas de texto: un `File` no se puede volver a poner en un input
 * por seguridad del navegador, así que se descarta en vez de romper el JSON.
 */
export function valoresDe(form: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of form.entries()) {
    if (typeof valor === 'string') salida[clave] = valor;
  }
  return salida;
}
