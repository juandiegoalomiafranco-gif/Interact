import type { ReactNode } from 'react';

/**
 * Tabla de datos del panel.
 *
 * Dos decisiones que se ven poco y se sienten mucho:
 *
 * 1. El scroll horizontal vive DENTRO de la tabla, nunca en el `body`. Con
 *    trece columnas —la matriz de cuotas— un celular no da abasto, y una
 *    página que se corre entera en horizontal se siente rota.
 *
 * 2. Las columnas de plata van alineadas a la derecha y con cifras del mismo
 *    ancho (`tabular`). Una columna de montos con anchos distintos no se
 *    puede comparar de un vistazo, que es justo para lo que sirve una tabla
 *    de plata.
 */

export interface Columna<T> {
  /** Encabezado. */
  titulo: ReactNode;
  /** Qué pintar en la celda. */
  celda: (fila: T) => ReactNode;
  /** Montos y cantidades: a la derecha y con cifras de ancho fijo. */
  numerica?: boolean;
  /** Se esconde en pantallas angostas, donde el ancho es el recurso escaso. */
  soloEscritorio?: boolean;
  /** Ancho sugerido, por si la columna se estira de más. */
  ancho?: string;
}

export function TablaDatos<T>({
  columnas,
  filas,
  claveDe,
  vacio,
  resaltarFila,
}: {
  columnas: Columna<T>[];
  filas: T[];
  claveDe: (fila: T) => string;
  /** Qué mostrar cuando no hay ni una fila. */
  vacio?: ReactNode;
  /** Clases extra por fila, para marcar la que necesita atención. */
  resaltarFila?: (fila: T) => string | undefined;
}) {
  if (filas.length === 0 && vacio !== undefined) return <>{vacio}</>;

  return (
    <div className="scroll-x">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-borde">
            {columnas.map((c, i) => (
              <th
                key={i}
                scope="col"
                style={c.ancho ? { width: c.ancho } : undefined}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap text-texto-tenue ${
                  c.numerica ? 'text-right' : 'text-left'
                } ${c.soloEscritorio ? 'hidden sm:table-cell' : ''}`}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.map((fila) => (
            <tr
              key={claveDe(fila)}
              className={`border-b border-borde last:border-0 ${resaltarFila?.(fila) ?? ''}`}
            >
              {columnas.map((c, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 align-middle text-texto ${
                    c.numerica ? 'text-right tabular whitespace-nowrap' : ''
                  } ${c.soloEscritorio ? 'hidden sm:table-cell' : ''}`}
                >
                  {c.celda(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El nombre de la fila, con su dato secundario debajo. */
export function CeldaPrincipal({
  titulo,
  detalle,
}: {
  titulo: ReactNode;
  detalle?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-texto">{titulo}</p>
      {detalle !== undefined && detalle !== null && (
        <p className="truncate text-xs text-texto-tenue">{detalle}</p>
      )}
    </div>
  );
}

/**
 * Barra de avance de una fila.
 *
 * Se pasa del 100 % a propósito cuando algo está sobregirado: recortarla al
 * 100 % escondería justo el caso que hay que ver. El relleno se limita al
 * ancho de la caja, pero el número al lado dice la verdad.
 */
export function BarraAvance({
  fraccion,
  tono = 'acento',
}: {
  fraccion: number | null;
  tono?: 'acento' | 'ok' | 'alerta' | 'riesgo';
}) {
  if (fraccion === null) {
    return <div className="h-1.5 w-full rounded-full bg-superficie-2" aria-hidden="true" />;
  }

  const relleno: Record<string, string> = {
    acento: 'bg-acento',
    ok: 'bg-ok-texto',
    alerta: 'bg-alerta-texto',
    riesgo: 'bg-riesgo-texto',
  };

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-superficie-2" aria-hidden="true">
      <div
        className={`h-full rounded-full ${relleno[tono]}`}
        style={{ width: `${Math.min(Math.max(fraccion, 0), 1) * 100}%` }}
      />
    </div>
  );
}
