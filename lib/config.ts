import { parsearListaBlanca } from '@/lib/allowlist';

/**
 * Diagnóstico de configuración.
 *
 * Existe por un fallo real en producción. El panel desplegado mostraba
 * "Application error: a client-side exception has occurred" al pulsar
 * "Entrar con Google". En los logs de Vercel la causa era una sola línea:
 *
 *   [auth][error] MissingSecret: Please define a `secret`.
 *
 * Faltaba AUTH_SECRET. Pero el navegador no lo decía, el mensaje estaba en
 * inglés, y había que ir a buscar los logs para enterarse. Dos defectos:
 * la app dejó pulsar un botón cuyo fallo estaba garantizado, y después no
 * tuvo nada útil que mostrar.
 *
 * Estas funciones son puras: reciben el entorno como argumento en vez de
 * leer `process.env` por su cuenta. Así se prueban todos los casos raros sin
 * manipular variables globales.
 */

export type Gravedad =
  /** Sin esto nadie puede entrar. El panel no sirve para nada. */
  | 'bloquea-login'
  /** Se puede entrar, pero no hay datos que mostrar. */
  | 'bloquea-datos'
  /** Funciona, pero hay algo mal puesto que va a doler después. */
  | 'aviso';

export interface Problema {
  /** Nombre de la variable. NUNCA su valor. */
  variable: string;
  gravedad: Gravedad;
  /** Qué está mal, en una frase. */
  que: string;
  /** Qué hacer, concreto. */
  comoArreglar: string;
}

export type Entorno = Record<string, string | undefined>;

/** Sin definir, vacía o solo espacios son el mismo caso: no hay valor. */
function falta(valor: string | undefined): boolean {
  return valor === undefined || valor.trim() === '';
}

/**
 * En Vercel, VERCEL_ENV vale 'production' | 'preview' | 'development'.
 * Fuera de Vercel se cae a NODE_ENV, que es lo que pone `next start`.
 */
function esProduccion(env: Entorno): boolean {
  if (env.VERCEL_ENV !== undefined) return env.VERCEL_ENV === 'production';
  return env.NODE_ENV === 'production';
}

const DONDE_VERCEL = 'En Vercel: Settings → Environment Variables → Production, y redespliega.';

/**
 * Revisa el entorno y devuelve la lista de problemas concretos.
 * Lista vacía = configuración correcta.
 */
export function revisarConfiguracion(env: Entorno): Problema[] {
  const problemas: Problema[] = [];

  // ── Lo que bloquea el login ────────────────────────────────────────────
  // Este primero: es exactamente el error que reventó el despliegue.
  if (falta(env.AUTH_SECRET)) {
    problemas.push({
      variable: 'AUTH_SECRET',
      gravedad: 'bloquea-login',
      que: 'Falta la clave con la que se firman las sesiones.',
      comoArreglar: `Genera una con \`npx auth secret\` y cárgala. ${DONDE_VERCEL}`,
    });
  }

  if (falta(env.AUTH_GOOGLE_ID)) {
    problemas.push({
      variable: 'AUTH_GOOGLE_ID',
      gravedad: 'bloquea-login',
      que: 'Falta el ID del cliente de OAuth de Google.',
      comoArreglar: `Google Cloud → Credenciales → tu cliente OAuth. ${DONDE_VERCEL}`,
    });
  }

  if (falta(env.AUTH_GOOGLE_SECRET)) {
    problemas.push({
      variable: 'AUTH_GOOGLE_SECRET',
      gravedad: 'bloquea-login',
      que: 'Falta el secreto del cliente de OAuth de Google.',
      comoArreglar: `Está en el mismo cliente OAuth que el ID. ${DONDE_VERCEL}`,
    });
  }

  // Vacía no es "sin restricciones": es "no entra nadie". Sin este aviso
  // parece un bug del login en vez de una variable sin llenar.
  const permitidos = parsearListaBlanca(env.ALLOWED_EMAILS);
  if (permitidos.length === 0) {
    problemas.push({
      variable: 'ALLOWED_EMAILS',
      gravedad: 'bloquea-login',
      que: 'No hay ningún correo autorizado, así que nadie puede entrar.',
      comoArreglar: `Pon los correos del comité separados por coma. ${DONDE_VERCEL}`,
    });
  }

  // ── Lo que bloquea los datos, pero deja entrar ─────────────────────────
  if (falta(env.AIRTABLE_TOKEN)) {
    problemas.push({
      variable: 'AIRTABLE_TOKEN',
      gravedad: 'bloquea-datos',
      que: 'Falta el token de Airtable. Se puede entrar, pero no hay datos.',
      comoArreglar: `Créalo en airtable.com/create/tokens. ${DONDE_VERCEL}`,
    });
  }

  if (falta(env.AIRTABLE_BASE_ID)) {
    problemas.push({
      variable: 'AIRTABLE_BASE_ID',
      gravedad: 'bloquea-datos',
      que: 'Falta el ID de la base de Airtable.',
      comoArreglar: `Es el código que empieza por \`app\` en la URL de la base. ${DONDE_VERCEL}`,
    });
  }

  // ── Avisos ─────────────────────────────────────────────────────────────
  // Poder escribir sin poder entrar es una contradicción: el correo que no
  // esté en ambas listas nunca va a poder registrar nada.
  const editores = parsearListaBlanca(env.EDITOR_EMAILS);
  const huerfanos = editores.filter((correo) => !permitidos.includes(correo));
  if (huerfanos.length > 0 && permitidos.length > 0) {
    problemas.push({
      variable: 'EDITOR_EMAILS',
      gravedad: 'aviso',
      que: `${huerfanos.length} correo(s) pueden registrar pero no entrar: ${huerfanos.join(', ')}.`,
      comoArreglar: 'Agrégalos también a ALLOWED_EMAILS, o quítalos de EDITOR_EMAILS.',
    });
  }

  // Con valor en producción, la app leería un archivo local que allá no existe.
  if (esProduccion(env) && !falta(env.AIRTABLE_DEV_CACHE)) {
    problemas.push({
      variable: 'AIRTABLE_DEV_CACHE',
      gravedad: 'aviso',
      que: 'Está activo en producción, donde no hay caché local que leer.',
      comoArreglar: 'Déjalo vacío en producción. Solo sirve en desarrollo.',
    });
  }

  // Opcional en Vercel: `trustHost: true` deduce el origen. Pero si alguien
  // la pone mal, es la causa más común del redirect_uri_mismatch de Google.
  const url = env.AUTH_URL?.trim();
  if (url !== undefined && url !== '') {
    if (esProduccion(env) && !url.startsWith('https://')) {
      problemas.push({
        variable: 'AUTH_URL',
        gravedad: 'aviso',
        que: 'En producción no empieza por https://.',
        comoArreglar: 'Ponla como https://tu-app.vercel.app, o bórrala y deja que se deduzca.',
      });
    }
    if (url.endsWith('/')) {
      problemas.push({
        variable: 'AUTH_URL',
        gravedad: 'aviso',
        que: 'Termina en barra, y eso rompe la URL de retorno de Google.',
        comoArreglar: 'Quítale la barra final.',
      });
    }
  }

  return problemas;
}

/** ¿Hay algo que impida entrar? Decide si el login ofrece el botón o no. */
export function bloqueaLogin(problemas: Problema[]): boolean {
  return problemas.some((p) => p.gravedad === 'bloquea-login');
}

/**
 * Una línea por problema para el log del servidor. Se registra SIEMPRE y
 * completa: en los logs sí van los avisos, porque ahí no hay nadie a quien
 * proteger y sí alguien que necesita el detalle.
 */
export function resumirParaLog(problemas: Problema[]): string {
  if (problemas.length === 0) return '[config] configuración completa';
  return [
    `[config] ${problemas.length} problema(s) de configuración:`,
    ...problemas.map((p) => `  - [${p.gravedad}] ${p.variable}: ${p.que} → ${p.comoArreglar}`),
  ].join('\n');
}

/**
 * Lee el entorno real. Solo servidor: ninguna de estas variables es pública.
 *
 * Se leen UNA POR UNA por su nombre completo, en vez de pasar `process.env`
 * entero. En el Edge Runtime —donde corre el middleware— Next sustituye cada
 * `process.env.LO_QUE_SEA` en tiempo de compilación; el objeto completo llega
 * vacío y la comprobación diría que no falta nada justo cuando falta todo.
 */
export function problemasDelEntorno(): Problema[] {
  return revisarConfiguracion({
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
    EDITOR_EMAILS: process.env.EDITOR_EMAILS,
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_DEV_CACHE: process.env.AIRTABLE_DEV_CACHE,
    AUTH_URL: process.env.AUTH_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
  });
}
