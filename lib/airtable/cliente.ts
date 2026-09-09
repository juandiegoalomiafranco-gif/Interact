import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  etiquetaDe,
  exigirEscrituraPermitida,
  type MetodoEscritura,
  type Tabla,
} from './escritura';

/**
 * El único archivo del panel que sabe que Airtable existe.
 *
 * No es una preferencia de estilo: `scripts/verificar-escritura.mjs` falla el
 * build si aparece `api.airtable.com` fuera de `lib/airtable/`. La razón es
 * que la guarda de permisos vive aquí, y una llamada suelta en una vista
 * nueva se la saltaría entera.
 */

const API = 'https://api.airtable.com/v0';

export interface RegistroCrudo {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

/**
 * Una lectura que distingue "la tabla está vacía" de "la tabla no existe".
 *
 * Es la misma regla que ya sigue `TarjetaIndicador`: ausencia no es cero. Si
 * MOVIMIENTOS todavía no está creada, el panel tiene que decir "falta crear
 * la tabla", no mostrar un saldo de $0 que alguien va a leer como real.
 */
export interface Lectura {
  registros: RegistroCrudo[];
  existe: boolean;
}

// ───────────────────────────── Configuración ─────────────────────────────

function token(): string {
  const t = process.env.AIRTABLE_TOKEN?.trim();
  if (!t) throw new Error('Falta AIRTABLE_TOKEN. Sin él no hay datos que mostrar.');
  return t;
}

function baseId(): string {
  const b = process.env.AIRTABLE_BASE_ID?.trim();
  if (!b) throw new Error('Falta AIRTABLE_BASE_ID.');
  return b;
}

/**
 * 12 h por defecto. El plan gratuito da 1.000 llamadas al mes y un refresco
 * completo cuesta ~15; bajarlo a una hora agota la cuota en tres días.
 */
function segundosDeCache(): number {
  const crudo = Number(process.env.AIRTABLE_REVALIDATE_SECONDS);
  return Number.isFinite(crudo) && crudo > 0 ? crudo : 43_200;
}

const usaCacheDeDisco = () => process.env.AIRTABLE_DEV_CACHE === '1';

// ──────────────────── Caché de disco, solo desarrollo ────────────────────

/**
 * Durante desarrollo cada recarga gastaría llamadas de la cuota mensual. Con
 * `AIRTABLE_DEV_CACHE=1` la primera lectura baja a `.cache/` y las siguientes
 * salen de ahí. Nunca se activa en producción: allí manda `revalidate`.
 */
const CARPETA_CACHE = join(process.cwd(), '.cache');

function leerDeDisco(tabla: Tabla): Lectura | null {
  try {
    return JSON.parse(readFileSync(join(CARPETA_CACHE, `${tabla}.json`), 'utf8')) as Lectura;
  } catch {
    return null;
  }
}

function guardarEnDisco(tabla: Tabla, lectura: Lectura): void {
  try {
    mkdirSync(CARPETA_CACHE, { recursive: true });
    writeFileSync(join(CARPETA_CACHE, `${tabla}.json`), JSON.stringify(lectura));
  } catch {
    // Un caché que no se puede escribir es un inconveniente, no un fallo:
    // la próxima lectura simplemente vuelve a pegarle a la API.
  }
}

// ─────────────────────────────── Lectura ───────────────────────────────

/** 429 con espera. Airtable manda `Retry-After` en segundos. */
async function esperar(respuesta: Response, intento: number): Promise<void> {
  const cabecera = Number(respuesta.headers.get('Retry-After'));
  const segundos = Number.isFinite(cabecera) && cabecera > 0 ? cabecera : 2 ** intento;
  await new Promise((listo) => setTimeout(listo, segundos * 1000));
}

/**
 * Trae una tabla entera, paginando de a 100.
 *
 * Un 404 devuelve `existe: false` en vez de lanzar, porque es un estado
 * previsto: las tablas se crean con `npm run crear-tablas` y hasta entonces
 * el panel tiene que seguir funcionando y decir qué falta.
 */
export async function leerTabla(tabla: Tabla): Promise<Lectura> {
  if (usaCacheDeDisco()) {
    const guardado = leerDeDisco(tabla);
    if (guardado) return guardado;
  }

  const registros: RegistroCrudo[] = [];
  let offset: string | undefined;
  let intento = 0;

  do {
    const url = new URL(`${API}/${baseId()}/${encodeURIComponent(tabla)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
      next: { revalidate: segundosDeCache(), tags: [etiquetaDe(tabla)] },
    });

    if (respuesta.status === 404) return { registros: [], existe: false };

    if (respuesta.status === 429 && intento < 3) {
      await esperar(respuesta, intento);
      intento += 1;
      continue;
    }

    if (!respuesta.ok) {
      // El cuerpo puede traer el nombre del campo que falla; el token no.
      const detalle = await respuesta.text();
      throw new Error(`Airtable ${respuesta.status} al leer ${tabla}: ${detalle.slice(0, 300)}`);
    }

    const pagina = (await respuesta.json()) as { records: RegistroCrudo[]; offset?: string };
    registros.push(...pagina.records);
    offset = pagina.offset;
    intento = 0;
  } while (offset);

  const lectura: Lectura = { registros, existe: true };
  if (usaCacheDeDisco()) guardarEnDisco(tabla, lectura);
  return lectura;
}

// ────────────────────────────── Escritura ──────────────────────────────

export interface Escritura {
  tabla: string;
  metodo: MetodoEscritura;
  /** El correo de la sesión. La guarda lo comprueba contra las dos listas. */
  correo: string | null | undefined;
  /** Campos de Airtable. La guarda los comprueba contra CAMPOS_ESCRIBIBLES. */
  datos: Record<string, unknown>;
  /** Solo en PATCH: qué registro se modifica. */
  recordId?: string;
}

/**
 * Crea o modifica un registro.
 *
 * Llama a `exigirEscrituraPermitida()` ANTES de armar el request, y eso es
 * justo lo que el guardián estático busca en todo archivo que haga POST o
 * PATCH contra Airtable. La guarda lanza en vez de devolver un booleano: un
 * `if` olvidado sería una puerta abierta.
 */
export async function escribir({
  tabla,
  metodo,
  correo,
  datos,
  recordId,
}: Escritura): Promise<RegistroCrudo> {
  const permitido = exigirEscrituraPermitida({ tabla, metodo, correo, datos });

  if (metodo === 'PATCH' && !recordId) {
    throw new Error('Un PATCH sin recordId no sabe qué registro modificar.');
  }

  const ruta = recordId
    ? `${API}/${baseId()}/${encodeURIComponent(permitido.tabla)}/${recordId}`
    : `${API}/${baseId()}/${encodeURIComponent(permitido.tabla)}`;

  const respuesta = await fetch(ruta, {
    method: permitido.metodo,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    // typecast: Airtable rechaza un texto donde espera una opción de select,
    // salvo que se le pida crear/emparejar la opción por nombre.
    body: JSON.stringify({ fields: datos, typecast: true }),
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(
      `Airtable ${respuesta.status} al escribir en ${permitido.tabla}: ${detalle.slice(0, 300)}`,
    );
  }

  return (await respuesta.json()) as RegistroCrudo;
}
