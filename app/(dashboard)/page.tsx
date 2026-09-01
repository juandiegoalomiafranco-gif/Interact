import type { Metadata } from 'next';
import { TarjetaIndicador } from '@/components/tarjeta-indicador';

export const metadata: Metadata = { title: 'General · Finanzas Interact' };

/**
 * Los indicadores ya tienen su forma final, pero no su dato: la capa de
 * Airtable llega cuando existan MOVIMIENTOS, DONANTES y DONACIONES.
 *
 * Se muestran en estado vacío en vez de con números inventados. Un panel
 * financiero con datos de ejemplo es peor que uno vacío: alguien los lee
 * como reales.
 */
export default function GeneralPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">General</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Año rotario 2026–2027 · Sin datos conectados todavía
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="Saldo actual"
          valor={null}
          tinte="saldo"
          notaVacia="Falta crear MOVIMIENTOS en Airtable"
        />
        <TarjetaIndicador
          etiqueta="Ingresos del mes"
          valor={null}
          tinte="ingresos"
          notaVacia="Falta crear MOVIMIENTOS en Airtable"
        />
        <TarjetaIndicador
          etiqueta="Egresos del mes"
          valor={null}
          tinte="egresos"
          notaVacia="Falta crear MOVIMIENTOS en Airtable"
        />
        <TarjetaIndicador
          etiqueta="Cuotas al día"
          valor={null}
          tinte="cuotas"
          notaVacia="Falta conectar la capa de datos"
        />
      </div>

      <div className="rounded-(--radius-tarjeta) border border-borde bg-superficie p-6">
        <h2 className="text-sm font-semibold text-texto">Qué falta para llenar esto</h2>
        <ol className="mt-3 space-y-2 text-sm text-texto-suave">
          <li>1. Crear las tablas MOVIMIENTOS, DONANTES y DONACIONES en Airtable.</li>
          <li>2. Agregar <code className="text-texto">data.records:write</code> al token.</li>
          <li>3. Llenar <code className="text-texto">EDITOR_EMAILS</code> con quién puede registrar.</li>
        </ol>
      </div>
    </div>
  );
}
