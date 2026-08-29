import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'General · Finanzas Interact' };

export default function GeneralPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-texto">General</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Los indicadores, las gráficas y el panel de alertas llegan en la etapa 6, cuando
        exista la tabla MOVIMIENTOS en Airtable.
      </p>
    </div>
  );
}
