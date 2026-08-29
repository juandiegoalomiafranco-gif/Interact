import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cuotas · Finanzas Interact' };

export default function CuotasPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-texto">Cuotas</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Esta vista llega en la etapa 6, cuando la capa de datos esté conectada.
      </p>
    </div>
  );
}
