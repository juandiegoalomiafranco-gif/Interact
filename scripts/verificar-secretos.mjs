/**
 * Busca secretos en el bundle que se le sirve al navegador.
 *
 * El criterio de aceptación del proyecto es que un token de Airtable nunca
 * llegue al cliente. Esto lo comprueba una máquina en cada build, en vez de
 * depender de que alguien se acuerde de mirarlo.
 *
 * Correr después de `npm run build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = '.next/static';

/**
 * Un PAT de Airtable es `patXXXXXXXXXXXXXX.<sufijo largo>`. Buscar solo
 * `pat` + 14 caracteres da falsos positivos con los internos de Next
 * (`patchAppRouterAction` y compañía), y una alarma que siempre suena es
 * una alarma que nadie mira.
 */
const PATRONES = [
  { nombre: 'PAT de Airtable', re: /pat[A-Za-z0-9]{14}\.[A-Za-z0-9]{32,}/ },
  { nombre: 'clave de Airtable (formato viejo)', re: /\bkey[A-Za-z0-9]{14}\b/ },
  { nombre: 'nombre de variable de servidor', re: /AIRTABLE_TOKEN|AUTH_SECRET|AUTH_GOOGLE_SECRET|ALLOWED_EMAILS/ },
  { nombre: 'client secret de Google', re: /GOCSPX-[A-Za-z0-9_-]{20,}/ },
];

function* archivos(dir) {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else yield ruta;
  }
}

let revisados = 0;
const hallazgos = [];

try {
  for (const ruta of archivos(RAIZ)) {
    if (!/\.(js|css|json|map)$/.test(ruta)) continue;
    revisados += 1;
    const contenido = readFileSync(ruta, 'utf8');
    for (const { nombre, re } of PATRONES) {
      const m = re.exec(contenido);
      if (m) hallazgos.push({ ruta, nombre, muestra: m[0].slice(0, 24) });
    }
  }
} catch (err) {
  console.error(`No se pudo leer ${RAIZ}. ¿Corriste "npm run build" antes?`);
  console.error(err.message);
  process.exit(2);
}

if (hallazgos.length > 0) {
  console.error(`\n✗ SECRETOS EN EL BUNDLE DEL CLIENTE (${hallazgos.length}):\n`);
  for (const h of hallazgos) console.error(`  ${h.nombre}\n    ${h.ruta}\n    ${h.muestra}…\n`);
  console.error('Estos archivos los descarga cualquiera que abra el panel.\n');
  process.exit(1);
}

console.log(`✓ Sin secretos en ${revisados} archivos de ${RAIZ}`);
