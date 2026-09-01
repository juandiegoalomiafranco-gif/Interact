/**
 * Dos reglas sobre cómo los componentes usan los tokens.
 *
 * 1. Ningún componente puede usar una primitiva de color directamente.
 *    `bg-tinta-50` se ve bien en el tema claro y roto en el oscuro, porque
 *    las primitivas no cambian entre temas. Solo las semánticas lo hacen.
 *    Este chequeo existe porque el error es fácil de cometer y difícil de
 *    ver: solo se nota abriendo el tema que uno no usa mientras desarrolla.
 *
 * 2. Ninguna clase puede referirse a una variable CSS con la forma `[--x]`.
 *    En Tailwind 4 eso compila a `border-radius: --radius-tarjeta`, que no
 *    es CSS válido: el navegador descarta la declaración entera y no avisa.
 *    Pasó de verdad — todas las tarjetas del panel salieron con esquinas
 *    cuadradas en producción y nadie lo notó, porque no rompe nada, solo se
 *    ve mal. La forma correcta es `(--x)`, que compila a `var(--x)`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CARPETAS = ['app', 'components'];
const PRIMITIVAS = /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder)-(?:tinta|interact|dorado)-\d{2,3}\b/g;

/** Cualquier utilidad de Tailwind con `[--variable]` dentro. */
const VARIABLE_ROTA = /\b[a-z-]+-\[--[a-zA-Z0-9-]+\]/g;

function* archivos(dir) {
  for (const e of readdirSync(dir)) {
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (/\.(tsx|ts)$/.test(ruta)) yield ruta;
  }
}

const hallazgos = [];

for (const carpeta of CARPETAS) {
  for (const ruta of archivos(carpeta)) {
    const lineas = readFileSync(ruta, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      for (const m of linea.matchAll(PRIMITIVAS)) {
        hallazgos.push({ ruta, linea: i + 1, clase: m[0], tipo: 'primitiva' });
      }
      for (const m of linea.matchAll(VARIABLE_ROTA)) {
        hallazgos.push({ ruta, linea: i + 1, clase: m[0], tipo: 'variable' });
      }
    });
  }
}

const primitivas = hallazgos.filter((h) => h.tipo === 'primitiva');
const variables = hallazgos.filter((h) => h.tipo === 'variable');

if (primitivas.length > 0) {
  console.error(`\n✗ ${primitivas.length} usos de primitivas de color en componentes:\n`);
  for (const h of primitivas) console.error(`  ${h.ruta}:${h.linea}  ${h.clase}`);
  console.error('\nUsa los tokens semánticos: bg-superficie, text-texto-suave,');
  console.error('border-borde, text-acento… Las primitivas no cambian con el tema.\n');
}

if (variables.length > 0) {
  console.error(`\n✗ ${variables.length} clases con la forma [--variable], que no compila:\n`);
  for (const h of variables) console.error(`  ${h.ruta}:${h.linea}  ${h.clase}`);
  console.error('\nEn Tailwind 4 usa paréntesis: rounded-(--radius-tarjeta).');
  console.error('Con corchetes sale `border-radius: --radius-tarjeta`, que el');
  console.error('navegador descarta en silencio.\n');
}

if (hallazgos.length > 0) process.exit(1);

console.log('✓ Los componentes solo usan tokens semánticos');
console.log('✓ Ninguna clase usa la forma [--variable]');
