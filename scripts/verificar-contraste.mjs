/**
 * Contraste WCAG de los tokens semánticos, en los dos temas.
 *
 * Con modo claro y oscuro no son dos combinaciones a revisar sino más de
 * treinta, y el tema que menos se usa durante el desarrollo es justo donde
 * se cuela el texto ilegible. Esto lo comprueba una máquina.
 *
 * Umbrales (WCAG 2.1 AA):
 *   texto normal ................ 4.5:1
 *   texto grande y UI ........... 3.0:1
 *   objetos gráficos ............ 3.0:1
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync('app/globals.css', 'utf8');

/** Saca los `--color-x: #hex` de un bloque delimitado por un selector. */
function tokens(inicio) {
  const i = CSS.indexOf(inicio);
  if (i === -1) throw new Error(`No se encontró el bloque: ${inicio}`);
  let prof = 0, j = CSS.indexOf('{', i), fin = j;
  for (let k = j; k < CSS.length; k += 1) {
    if (CSS[k] === '{') prof += 1;
    else if (CSS[k] === '}') { prof -= 1; if (prof === 0) { fin = k; break; } }
  }
  const mapa = {};
  for (const m of CSS.slice(j, fin).matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    mapa[m[1]] = m[2];
  }
  return mapa;
}

const claro = tokens('@theme static {');
const oscuro = { ...claro, ...tokens(":root[data-tema='oscuro']") };

const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function ratio(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** [frente, fondo, umbral, descripción] */
const PARES = [
  ['texto', 'fondo', 4.5, 'texto principal sobre el fondo'],
  ['texto', 'superficie', 4.5, 'texto principal sobre tarjeta'],
  ['texto-suave', 'superficie', 4.5, 'texto secundario sobre tarjeta'],
  ['texto-tenue', 'superficie', 4.5, 'texto terciario sobre tarjeta'],
  ['texto-suave', 'fondo', 4.5, 'texto secundario sobre el fondo'],
  ['acento', 'superficie', 4.5, 'enlace o acento sobre tarjeta'],
  ['acento', 'fondo', 4.5, 'acento sobre el fondo'],
  ['texto-invertido', 'acento', 4.5, 'texto sobre botón de acento'],
  // `borde` y `borde-fuerte` son decorativos: WCAG 1.4.11 exige 3:1 a los
  // bordes que identifican un control, no a una línea que separa tarjetas.
  ['borde-control', 'superficie', 3.0, 'borde de campo o control'],
  ['borde-control', 'fondo', 3.0, 'borde de control sobre el fondo'],
  ['anillo', 'fondo', 3.0, 'anillo de foco'],

  // La barra lateral es oscura en ambos temas: su texto no puede heredar
  // los tokens de superficie.
  ['barra-texto', 'barra', 4.5, 'texto de la barra lateral'],
  ['barra-texto-tenue', 'barra', 4.5, 'texto secundario de la barra'],
  ['barra-acento', 'barra', 4.5, 'elemento activo del menú'],

  // Tarjetas de indicador: cada métrica lleva su tinte y su texto.
  ['tinte-saldo-texto', 'tinte-saldo', 4.5, 'tarjeta de saldo'],
  ['tinte-ingresos-texto', 'tinte-ingresos', 4.5, 'tarjeta de ingresos'],
  ['tinte-egresos-texto', 'tinte-egresos', 4.5, 'tarjeta de egresos'],
  ['tinte-cuotas-texto', 'tinte-cuotas', 4.5, 'tarjeta de cuotas'],

  ['ok-texto', 'ok-fondo', 4.5, 'estado correcto'],
  ['alerta-texto', 'alerta-fondo', 4.5, 'estado de alerta'],
  ['riesgo-texto', 'riesgo-fondo', 4.5, 'estado de riesgo'],

  ['pagado-texto', 'pagado-fondo', 4.5, 'celda Pagado (P)'],
  ['parcial-texto', 'parcial-fondo', 4.5, 'celda Parcial (½)'],
  ['pendiente-texto', 'pendiente-fondo', 4.5, 'celda Pendiente (D)'],
  ['exonerado-texto', 'exonerado-fondo', 4.5, 'celda Exonerado (E)'],

  ['serie-ingreso', 'superficie', 3.0, 'barra de ingresos'],
  ['serie-egreso', 'superficie', 3.0, 'barra de egresos'],
  ...Array.from({ length: 8 }, (_, i) => [`cat-${i + 1}`, 'superficie', 3.0, `dona, categoría ${i + 1}`]),
];

let fallos = 0;

for (const [nombreTema, tema] of [['CLARO', claro], ['OSCURO', oscuro]]) {
  console.log(`\n── TEMA ${nombreTema} ──`);
  for (const [frente, fondo, umbral, desc] of PARES) {
    const a = tema[frente];
    const b = tema[fondo];
    if (!a || !b) {
      console.log(`  ? ${desc}: falta ${!a ? `--color-${frente}` : `--color-${fondo}`}`);
      fallos += 1;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= umbral;
    if (!ok) fallos += 1;
    console.log(
      `  ${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1  (min ${umbral})  ${desc}` +
        (ok ? '' : `   ${a} sobre ${b}`),
    );
  }
}

console.log(
  fallos === 0
    ? `\n✓ Las ${PARES.length * 2} combinaciones pasan WCAG AA en ambos temas.`
    : `\n✗ ${fallos} combinaciones por debajo del umbral.`,
);
process.exit(fallos === 0 ? 0 : 1);
