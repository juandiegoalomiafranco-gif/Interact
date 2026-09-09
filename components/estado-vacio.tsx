import type { ReactNode } from 'react';

/**
 * Lo que se muestra donde no hay datos.
 *
 * Un panel financiero vacío tiene que decir POR QUÉ está vacío. "Sin datos"
 * a secas deja a quien lo lee sin saber si el club no ha gastado nada, si
 * falta conectar algo, o si la página está rota — y las tres cosas piden
 * reacciones distintas.
 */
export function EstadoVacio({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-texto">{titulo}</p>
      {children && <div className="max-w-md text-sm text-texto-suave">{children}</div>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

/**
 * El caso concreto de una tabla que todavía no existe en Airtable.
 *
 * Es distinto de "no hay registros": aquí no hay ni dónde guardarlos, y el
 * paso siguiente es una orden de terminal, no llenar un formulario.
 */
export function TablaFaltante({ tablas }: { tablas: string[] }) {
  if (tablas.length === 0) return null;

  return (
    <div
      role="status"
      className="rounded-(--radius-tarjeta) border border-alerta-borde bg-alerta-fondo p-4"
    >
      <p className="text-sm font-semibold text-alerta-texto">
        {tablas.length === 1
          ? `Falta crear la tabla ${tablas[0]} en Airtable`
          : `Faltan ${tablas.length} tablas en Airtable: ${tablas.join(', ')}`}
      </p>
      <p className="mt-1 text-sm text-alerta-texto">
        Mientras no existan, esta parte del panel no tiene de dónde sacar cifras. No se
        muestra un cero porque un cero se leería como un dato real.
      </p>
      <p className="mt-2 text-sm text-alerta-texto">
        Se crean de una vez con{' '}
        <code className="rounded bg-superficie/50 px-1.5 py-0.5 font-mono text-xs">
          npm run crear-tablas
        </code>
        .
      </p>
    </div>
  );
}
