'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconoCerrar } from './iconos';

/**
 * El modal de los formularios.
 *
 * Usa el `<dialog>` del navegador con `showModal()`, no un `div` con
 * posición fija. Eso trae gratis y bien hechas tres cosas que a mano salen
 * mal: la trampa de foco, cerrar con Escape, y esconder el resto de la página
 * de los lectores de pantalla.
 */
export function Dialogo({
  etiquetaBoton,
  titulo,
  descripcion,
  children,
  iconoBoton,
  variante = 'primario',
  abiertoInicial = false,
}: {
  etiquetaBoton: ReactNode;
  titulo: string;
  descripcion?: string;
  /** Recibe `cerrar` para que el formulario se cierre solo al guardar bien. */
  children: (cerrar: () => void) => ReactNode;
  iconoBoton?: ReactNode;
  variante?: 'primario' | 'secundario' | 'discreto';
  abiertoInicial?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(abiertoInicial);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;

    if (abierto && !d.open) d.showModal();
    else if (!abierto && d.open) d.close();
  }, [abierto]);

  const estilos: Record<string, string> = {
    primario:
      'bg-acento text-texto-invertido hover:bg-acento-hover border border-transparent',
    secundario:
      'bg-superficie text-texto border border-borde-control hover:bg-superficie-2',
    discreto: 'bg-transparent text-texto-suave border border-transparent hover:bg-superficie-2',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none ${estilos[variante]}`}
      >
        {iconoBoton}
        {etiquetaBoton}
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        // `close` cubre el Escape y el clic en el fondo, que no pasan por
        // nuestro botón de cerrar; sin esto el estado quedaría desfasado y
        // el modal no volvería a abrir.
        onClose={() => setAbierto(false)}
        onClick={(e) => {
          // Clic en el backdrop: el target es el propio <dialog>.
          if (e.target === dialogo.current) setAbierto(false);
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-(--radius-tarjeta) bg-superficie p-0 text-texto shadow-(--sombra-flotante)"
      >
        {/* El contenido solo se monta con el modal abierto: así el formulario
            arranca en blanco cada vez, en vez de conservar lo que alguien
            escribió y descartó la vez anterior. */}
        {abierto && (
          <div className="max-h-[85vh] overflow-y-auto">
            <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
              <div>
                <h2 id={idTitulo} className="text-base font-semibold text-texto">
                  {titulo}
                </h2>
                {descripcion && <p className="mt-0.5 text-sm text-texto-suave">{descripcion}</p>}
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="shrink-0 cursor-pointer rounded-full p-1.5 text-texto-tenue transition-colors duration-200 hover:bg-superficie-2 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
              >
                <IconoCerrar className="size-4" />
              </button>
            </header>

            <div className="px-5 py-4">{children(() => setAbierto(false))}</div>
          </div>
        )}
      </dialog>
    </>
  );
}
