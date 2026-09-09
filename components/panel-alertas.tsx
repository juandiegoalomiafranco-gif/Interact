import { formatCOP } from '@/lib/format';
import type { Alerta } from '@/lib/metrics';
import { IconoAlerta } from './iconos';
import { Insignia } from './insignia';

/**
 * Lo que hay que revisar.
 *
 * Una lista vacía se muestra sobria y no como una felicitación: que hoy no
 * haya nada pendiente no significa que la contabilidad esté bien, solo que
 * estas cuatro comprobaciones no encontraron nada.
 *
 * Cada alerta trae su monto porque tres egresos sin soporte por $30.000 y
 * tres por $3.000.000 piden urgencias muy distintas, y el conteo solo no lo
 * distingue.
 */
export function PanelAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <p className="py-2 text-sm text-texto-suave">
        Nada pendiente de revisar: sin egresos sin soporte, sin aprobaciones en cola, sin
        presupuestos sobregirados y sin movimientos por conciliar.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {alertas.map((a) => (
        <li key={a.tipo} className="flex items-start gap-3">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-alerta-fondo text-alerta-texto">
            <IconoAlerta className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-texto">{a.titulo}</p>
            <p className="text-xs text-texto-suave">
              {a.cantidad} {a.cantidad === 1 ? 'caso' : 'casos'} · {formatCOP(a.montoTotal)}
            </p>
          </div>

          <Insignia tono="alerta">{a.cantidad}</Insignia>
        </li>
      ))}
    </ul>
  );
}
