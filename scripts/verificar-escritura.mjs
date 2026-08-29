/**
 * Guardián estático de la capa de escritura.
 *
 * Los tests unitarios protegen las constantes de `lib/airtable/escritura.ts`,
 * pero no impiden que alguien cree un archivo nuevo que le pegue a la API de
 * Airtable por su cuenta y se salte la guarda. Esto sí.
 *
 * Comprueba tres cosas:
 *   1. No hay ningún DELETE contra Airtable en ninguna parte.
 *   2. Solo lib/airtable/ conoce la URL de la API.
 *   3. Todo archivo que escriba pasa por exigirEscrituraPermitida().
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

    // 3. Quien escriba, que pase por la guarda.
    const escribe = /method\s*:\s*['"`](POST|PATCH)['"`]/i.test(src) && tocaAirtable;
    if (escribe && !/exigirEscrituraPermitida/.test(src)) {
      problemas.push({
        ruta,
        que: 'escribe en Airtable sin llamar a exigirEscrituraPermitida()',
        porque: 'Sin la guarda, cualquiera con sesión podría registrar información.',
      });
    }
  }
}

if (problemas.length > 0) {
  console.error(`\n✗ ${problemas.length} problemas en la capa de escritura:\n`);
  for (const p of problemas) console.error(`  ${p.ruta}\n    ${p.que}\n    ${p.porque}\n`);
  process.exit(1);
}

console.log('✓ Capa de escritura: sin DELETE, sin llamadas sueltas, guarda en su sitio');
