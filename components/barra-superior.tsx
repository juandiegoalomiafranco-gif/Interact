import Link from 'next/link';
import { Buscador, type EntradaIndice } from './buscador';
import { IconoAlerta } from './iconos';
import { InterruptorDeTema } from './tema';

/**
 * La barra de arriba: buscar, ver si hay algo que atender, y saber con qué
 * cuenta se está mirando.
 *
 * La campana no es decorativa ni un adorno copiado de una plantilla: muestra
 * el número real de alertas que devuelve `alertas(snapshot)` y lleva a la
 * lista. Un ícono de notificaciones que no notifica nada es ruido.
 */
export function BarraSuperior({
  correo,
  indice,
  alertas,
}: {
  correo: string | null;
  indice: EntradaIndice[];
  alertas: number;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-borde bg-fondo/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center gap-3">
        <Buscador indice={indice} />

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#alertas"
            aria-label={
              alertas === 0
                ? 'No hay alertas'
                : `${alertas} ${alertas === 1 ? 'alerta' : 'alertas'} por revisar`
            }
            className="relative inline-flex cursor-pointer items-center justify-center rounded-full border border-borde bg-superficie p-2 text-texto-suave transition-colors duration-200 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
          >
            <IconoAlerta className="size-4" />
            {alertas > 0 && (
              <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-riesgo-texto px-1 text-[10px] font-semibold text-texto-invertido">
                {alertas > 9 ? '9+' : alertas}
              </span>
            )}
          </Link>

          <InterruptorDeTema />

          {correo && (
            <span
              className="hidden items-center gap-2 rounded-full border border-borde bg-superficie py-1 pr-3 pl-1 sm:inline-flex"
              title={correo}
            >
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-full bg-acento-suave text-xs font-semibold text-acento"
              >
                {correo.slice(0, 2).toUpperCase()}
              </span>
              <span className="max-w-40 truncate text-xs text-texto-suave">{correo}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
