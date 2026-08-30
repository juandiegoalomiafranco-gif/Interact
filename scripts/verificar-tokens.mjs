/**
 * Ningún componente puede usar una primitiva de color directamente.
 *
 * `bg-tinta-50` se ve bien en el tema claro y roto en el oscuro, porque las
 * primitivas no cambian entre temas. Solo las semánticas lo hacen. Este
 * chequeo existe porque el error es fácil de cometer y difícil de ver: solo
 * se nota abriendo el tema que uno no usa mientras desarrolla.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CARPETAS = ['app', 'components'];
const PRIMITIVAS = /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|accent|caret|placeholder)-(?:tinta|interact|dorado)-\d{2,3}\b/g;

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
        hallazgos.push({ ruta, linea: i + 1, clase: m[0] });
      }
    });
  }
}

if (hallazgos.length > 0) {
  console.error(`\n✗ ${hallazgos.length} usos de primitivas de color en componentes:\n`);
  for (const h of hallazgos) console.error(`  ${h.ruta}:${h.linea}  ${h.clase}`);
  console.error('\nUsa los tokens semánticos: bg-superficie, text-texto-suave,');
  console.error('border-borde, text-acento… Las primitivas no cambian con el tema.\n');
  process.exit(1);
}

console.log('✓ Los componentes solo usan tokens semánticos');
