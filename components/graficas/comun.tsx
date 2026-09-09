'use client';

import { useEffect, useState } from 'react';

/**
 * Lo que comparten las gráficas.
 *
 * Recharts pinta en SVG, así que los colores entran como `fill` y `stroke`.
 * Se le pasan como `var(--color-serie-ingreso)` en vez de un hex: así la
 * misma gráfica se repinta sola al cambiar de tema, sin que el componente
 * tenga que enterarse de cuál está activo.
 */

/** Los tokens de las series, tal como se usan en los props de Recharts. */
export const COLOR = {
  ingreso: 'var(--color-serie-ingreso)',
  egreso: 'var(--color-serie-egreso)',
  acento: 'var(--color-acento)',
  borde: 'var(--color-borde)',
  texto: 'var(--color-texto)',
  textoTenue: 'var(--color-texto-tenue)',
  superficie: 'var(--color-superficie)',
  superficie2: 'var(--color-superficie-2)',
} as const;

/** Las ocho categorías de la dona. Se distinguen por tono, no por brillo. */
export const CATEGORIA = Array.from({ length: 8 }, (_, i) => `var(--color-cat-${i + 1})`);

/**
 * Si quien mira pidió menos movimiento.
 *
 * `globals.css` ya apaga las transiciones de CSS, pero Recharts anima desde
 * JavaScript y esa regla no lo alcanza: hay que preguntarle al navegador y
 * pasarle `isAnimationActive={false}`.
 *
 * Arranca en `true` —sin animación— y no al revés: si el primer pintado
 * animara y luego se apagara, quien pidió no ver movimiento ya lo habría
 * visto.
 */
export function useMenosMovimiento(): boolean {
  const [reducido, setReducido] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducido(consulta.matches);

    const alCambiar = (e: MediaQueryListEvent) => setReducido(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return reducido;
}

/**
 * El globo que sale al pasar el mouse.
 *
 * Propio y no el de Recharts porque el de fábrica trae colores fijos que se
 * ven bien en claro y quedan blanco sobre blanco en oscuro.
 */
export function Globo({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { etiqueta: string; valor: string; color?: string }[];
}) {
  return (
    <div className="tarjeta border border-borde px-3 py-2 text-xs">
      <p className="font-semibold text-texto">{titulo}</p>
      <ul className="mt-1 space-y-0.5">
        {filas.map((f) => (
          <li key={f.etiqueta} className="flex items-center gap-2 text-texto-suave">
            {f.color && (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: f.color }}
              />
            )}
            <span>{f.etiqueta}</span>
            <span className="ml-auto font-medium tabular text-texto">{f.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
