import type { ReactNode } from 'react';

/**
 * El marco de todo panel del tablero: título a la izquierda, una acción a la
 * derecha, y el cuerpo debajo.
 *
 * Existe para que doce paneles no repitan doce veces el mismo `div` con el
 * mismo radio y la misma sombra. Cuando la elevación cambie, cambia aquí.
 */
export function Tarjeta({
  titulo,
  descripcion,
  accion,
  children,
  className = '',
  sinRelleno = false,
}: {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  /** Botón o enlace de la esquina superior derecha. */
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Para tablas, que van pegadas al borde de la tarjeta. */
  sinRelleno?: boolean;
}) {
  const hayEncabezado = titulo !== undefined || accion !== undefined;

  return (
    <section className={`tarjeta flex min-w-0 flex-col ${className}`}>
      {hayEncabezado && (
        <header
          className={`flex flex-wrap items-start justify-between gap-3 ${
            sinRelleno ? 'px-5 pt-5 pb-3' : 'px-5 pt-5'
          }`}
        >
          <div className="min-w-0">
            {titulo !== undefined && (
              <h2 className="text-sm font-semibold text-texto">{titulo}</h2>
            )}
            {descripcion !== undefined && (
              <p className="mt-0.5 text-xs text-texto-tenue">{descripcion}</p>
            )}
          </div>
          {accion}
        </header>
      )}

      <div className={sinRelleno ? 'min-w-0 flex-1' : 'min-w-0 flex-1 p-5'}>{children}</div>
    </section>
  );
}
