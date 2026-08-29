import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Eventos · Finanzas Interact' };

export default function EventosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-texto">Eventos</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Esta vista llega en la etapa 6, cuando la capa de datos esté conectada.
      </p>
    </div>
  );
}
