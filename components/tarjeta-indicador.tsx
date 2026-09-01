import type { ReactNode } from 'react';

/**
 * Tarjeta de indicador, al estilo de la referencia: tinte propio, etiqueta
 * pequeña, número grande y una chispa con la tendencia.
 *
 * `valor === null` NO significa cero. Significa que todavía no hay datos, y
 * la tarjeta lo dice con todas sus letras. Un saldo de cero porque el club
 * gastó todo y un saldo de cero porque nadie ha registrado nada son cosas
 * distintas, y confundirlas en un panel financiero es grave.
 */

export type Tinte = 'saldo' | 'ingresos' | 'egresos' | 'cuotas';

const TINTES: Record<Tinte, string> = {
  saldo: 'bg-tinte-saldo text-tinte-saldo-texto',
  ingresos: 'bg-tinte-ingresos text-tinte-ingresos-texto',
  egresos: 'bg-tinte-egresos text-tinte-egresos-texto',
  cuotas: 'bg-tinte-cuotas text-tinte-cuotas-texto',
};

/** Chispa de tendencia. Con menos de dos puntos no dibuja nada: una línea
 *  de un solo dato es una raya que sugiere una tendencia que no existe. */
function Chispa({ puntos }: { puntos: number[] }) {
  if (puntos.length < 2) return null;

  const min = Math.min(...puntos);
  const max = Math.max(...puntos);
  const rango = max - min || 1;
  const ancho = 100;
  const alto = 28;

  const d = puntos
    .map((p, i) => {
      const x = (i / (puntos.length - 1)) * ancho;
      const y = alto - ((p - min) / rango) * alto;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      preserveAspectRatio="none"
      className="mt-4 h-8 w-full opacity-70"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface TarjetaIndicadorProps {
  etiqueta: string;
  /** `null` = todavía no hay datos. Nunca se sustituye por 0. */
  valor: string | null;
  /** El valor completo, para el `title`, cuando el mostrado va abreviado. */
  valorCompleto?: string;
  tinte: Tinte;
  icono?: ReactNode;
  /** Variación contra el periodo anterior, ya formateada. */
  variacion?: string | null;
  chispa?: number[];
  /** Qué hacer cuando no hay datos. */
  notaVacia?: string;
}

export function TarjetaIndicador({
  etiqueta,
  valor,
  valorCompleto,
  tinte,
  icono,
  variacion,
  chispa,
  notaVacia = 'Sin datos todavía',
}: TarjetaIndicadorProps) {
  return (
    <div className={`rounded-(--radius-tarjeta) p-5 ${TINTES[tinte]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icono && (
            <span className="grid size-7 place-items-center rounded-lg bg-superficie/45">
              {icono}
            </span>
          )}
          <span className="text-sm font-medium">{etiqueta}</span>
        </div>

        {variacion && (
          <span className="rounded-md bg-superficie/45 px-2 py-0.5 text-xs font-semibold tabular">
            {variacion}
          </span>
        )}
      </div>

      {valor === null ? (
        <>
          <p className="mt-4 text-3xl font-semibold opacity-45">—</p>
          <p className="mt-1 text-xs opacity-75">{notaVacia}</p>
        </>
      ) : (
        <p
          className="mt-4 text-3xl font-semibold tracking-tight tabular"
          {...(valorCompleto ? { title: valorCompleto } : {})}
        >
          {valor}
        </p>
      )}

      {chispa && <Chispa puntos={chispa} />}
    </div>
  );
}
