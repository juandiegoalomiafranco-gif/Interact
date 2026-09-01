'use client';

import { useEffect } from 'react';

/**
 * Frontera de error del panel. Atrapa cualquier fallo de una vista sin
 * tumbar el shell: la navegación lateral sigue ahí y se puede ir a otra
 * sección en vez de quedarse con una pantalla en blanco.
 *
 * Aquí sí se pueden usar los tokens de tema: el layout raíz sobrevive.
 */
export default function ErrorDelPanel({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Al log del navegador, no a la pantalla: el mensaje puede traer rutas
    // internas. Quien depura abre la consola; quien usa el panel, no.
    console.error('[panel] la vista falló:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-(--radius-tarjeta) border border-riesgo-borde bg-riesgo-fondo p-6"
    >
      <h2 className="text-base font-semibold text-riesgo-texto">
        No se pudo cargar esta sección
      </h2>
      <p className="mt-2 max-w-prose text-sm text-texto-suave">
        El resto del panel sigue funcionando: puedes cambiar de sección en el menú. Si
        esta vista falla siempre, seguramente falta conectar los datos de Airtable o hay
        una variable de entorno sin cargar.
      </p>

      {error.digest && (
        <p className="mt-3 text-xs text-texto-tenue">
          Código del error: <code>{error.digest}</code>
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className="mt-5 cursor-pointer rounded-(--radius-interno) border border-borde-control bg-superficie px-4 py-2 text-sm font-medium text-texto transition-colors duration-200 hover:bg-superficie-2 focus-visible:ring-2 focus-visible:ring-anillo focus-visible:ring-offset-2 focus-visible:ring-offset-fondo focus-visible:outline-none"
      >
        Reintentar
      </button>
    </div>
  );
}
