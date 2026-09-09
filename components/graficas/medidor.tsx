'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatPorcentaje } from '@/lib/format';
import type { Cumplimiento } from '@/lib/metrics';
import { COLOR, useMenosMovimiento } from './comun';

/**
 * El medidor de cumplimiento de cuotas del mes.
 *
 * Un semicírculo, como en la referencia. La fracción NULA no se dibuja como
 * 0 %: cero de cero no es "nadie pagó", es "todavía no hay registros", y
 * pintar una aguja en cero acusaría al club de algo que no pasó.
 *
 * Los que no tienen registro se muestran aparte, sin contarlos como
 * incumplidos: un hueco de datos no es una deuda.
 */
export function MedidorCumplimiento({ cumplimiento }: { cumplimiento: Cumplimiento }) {
  const sinAnimacion = useMenosMovimiento();
  const { fraccion, alDia, conRegistro, sinRegistro } = cumplimiento;

  if (fraccion === null) {
    return (
      <div className="flex h-(--alto-grafica-chica) flex-col items-center justify-center gap-1 text-center">
        <p className="text-2xl font-semibold text-texto-tenue">—</p>
        <p className="max-w-52 text-sm text-texto-suave">
          Todavía no hay cuotas registradas para este mes.
        </p>
      </div>
    );
  }

  const tono =
    fraccion >= 0.8
      ? 'var(--color-ok-texto)'
      : fraccion >= 0.5
        ? 'var(--color-alerta-texto)'
        : 'var(--color-riesgo-texto)';

  const datos = [
    { nombre: 'Al día', valor: fraccion },
    { nombre: 'Pendiente', valor: 1 - fraccion },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-(--alto-grafica-chica) w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              // Semicírculo: de 180° a 0°.
              startAngle={180}
              endAngle={0}
              cy="78%"
              innerRadius="120%"
              outerRadius="165%"
              stroke="none"
              isAnimationActive={!sinAnimacion}
            >
              <Cell fill={tono} />
              <Cell fill={COLOR.superficie2} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
          <p className="text-3xl font-semibold tabular text-texto">{formatPorcentaje(fraccion)}</p>
          <p className="text-xs text-texto-tenue">
            {alDia} de {conRegistro} al día
          </p>
        </div>
      </div>

      {sinRegistro > 0 && (
        <p className="mt-1 text-center text-xs text-texto-tenue">
          {sinRegistro} {sinRegistro === 1 ? 'miembro activo' : 'miembros activos'} sin registro
          este mes. No cuentan como mora.
        </p>
      )}
    </div>
  );
}
