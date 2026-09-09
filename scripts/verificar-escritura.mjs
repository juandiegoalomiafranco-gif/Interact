/**
 * Guardián estático de la capa de escritura.
 *
 * Los tests unitarios protegen las constantes de `lib/airtable/escritura.ts`,
 * pero no impiden que alguien cree un archivo nuevo que le pegue a la API de
 * Airtable por su cuenta y se salte la guarda. Esto sí.
 *
 * Comprueba cuatro cosas:
 *   1. No hay ningún DELETE contra Airtable en ninguna parte.
 *   2. Solo lib/airtable/ conoce la URL de la API.
 *   3. Todo archivo que escriba pasa por exigirEscrituraPermitida().
 *   4. Ninguna vista ni acción nombra los datos de contacto de un miembro.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CARPETAS = ['app', 'lib', 'components', 'scripts'];
const CAPA_DATOS = 'lib/airtable/';

/** Este mismo archivo: sus patrones y mensajes coinciden con lo que busca. */
const YO = 'scripts/verificar-escritura.mjs';

function* archivos(dir) {
  for (const e of readdirSync(dir)) {
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (/\.(tsx?|mjs)$/.test(ruta) && !/\.test\.tsx?$/.test(ruta)) yield ruta;
  }
}

const problemas = [];

for (const carpeta of CARPETAS) {
  for (const ruta of archivos(carpeta)) {
    const norm = ruta.replace(/\\/g, '/');
    if (norm === YO) continue;
    const src = readFileSync(ruta, 'utf8');

    // 1. Nada de borrar. Ni method: 'DELETE' ni un helper que lo envuelva.
    if (/method\s*:\s*['"`]DELETE['"`]/i.test(src)) {
      problemas.push({
        ruta,
        que: "method: 'DELETE'",
        porque: 'Del panel no se borra nada. Se corrige con un asiento nuevo o un PATCH.',
      });
    }

    const tocaAirtable = /api\.airtable\.com/.test(src);
    const esCapaDatos = norm.startsWith(CAPA_DATOS);

    // 2. Solo la capa de datos conoce la API.
    if (tocaAirtable && !esCapaDatos && !norm.startsWith('scripts/')) {
      problemas.push({
        ruta,
        que: 'referencia directa a api.airtable.com',
        porque: `Toda llamada pasa por ${CAPA_DATOS}, que es donde vive la guarda de permisos.`,
      });
    }

    /**
     * 3. Quien escriba desde la app, que pase por la guarda.
     *
     * `scripts/` queda fuera: son herramientas que una persona corre a mano
     * desde su terminal, con un token distinto y de un solo uso (ver
     * crear-tablas.mjs). No hay sesión que comprobar ahí, y exigirle la
     * guarda obligaría a importar `auth` en un script de línea de comandos.
     * El permiso de esas herramientas es tener el token, y ese sí es el
     * control correcto para una tarea de administración.
     */
    const escribe = /method\s*:\s*['"`](POST|PATCH)['"`]/i.test(src) && tocaAirtable;
    if (escribe && !norm.startsWith('scripts/') && !/exigirEscrituraPermitida/.test(src)) {
      problemas.push({
        ruta,
        que: 'escribe en Airtable sin llamar a exigirEscrituraPermitida()',
        porque: 'Sin la guarda, cualquiera con sesión podría registrar información.',
      });
    }
  }
}

/**
 * 4. Los datos de contacto de un miembro no aparecen en la interfaz.
 *
 * `CAMPOS_ESCRIBIBLES` ya impide escribirlos y `mapeo.ts` ya impide leerlos,
 * pero las dos son barreras de ejecución. Ésta es estática: si alguien pone
 * `Teléfono acudiente` en una vista o en una acción, el build falla antes de
 * que un teléfono de un menor llegue al navegador de nadie.
 *
 * La lista se lee de escritura.ts para que no haya dos copias que se separen.
 */
const fuenteEscritura = readFileSync('lib/airtable/escritura.ts', 'utf8');
const bloque = /CAMPOS_PROHIBIDOS_MIEMBROS\s*=\s*\[([\s\S]*?)\]/.exec(fuenteEscritura);

if (!bloque) {
  console.error('\n✗ No se encontró CAMPOS_PROHIBIDOS_MIEMBROS en lib/airtable/escritura.ts');
  console.error('  Esa lista es la que sostiene la promesa sobre los datos de menores.\n');
  process.exit(1);
}

const PROHIBIDOS = [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

for (const carpeta of ['app', 'components']) {
  for (const ruta of archivos(carpeta)) {
    const src = readFileSync(ruta, 'utf8');
    for (const campo of PROHIBIDOS) {
      if (new RegExp(`['"\`]${campo}['"\`]`).test(src)) {
        problemas.push({
          ruta,
          que: `menciona el campo "${campo}" de MIEMBROS`,
          porque:
            'Buena parte del club son menores de edad. Ese dato no se lee ni se escribe desde la web; se consulta en Airtable.',
        });
      }
    }
  }
}

if (problemas.length > 0) {
  console.error(`\n✗ ${problemas.length} problemas en la capa de escritura:\n`);
  for (const p of problemas) console.error(`  ${p.ruta}\n    ${p.que}\n    ${p.porque}\n`);
  process.exit(1);
}

console.log(
  `✓ Capa de escritura: sin DELETE, sin llamadas sueltas, guarda en su sitio, y sin ${PROHIBIDOS.length} campos de contacto en la interfaz`,
);
