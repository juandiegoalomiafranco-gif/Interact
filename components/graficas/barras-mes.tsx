'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mesCorto } from '@/lib/fechas';
import { formatCOP, formatCOPAbreviado } from '@/lib/format';
import type { BarraMes } from '@/lib/metrics';
import { COLOR, Globo, useMenosMovimiento } from './comun';

/**
 * Ingresos contra egresos, mes a mes.
 *
 * Barras y no líneas: son doce valores discretos, uno por mes, y una línea
 * entre dos meses sugiere que hubo algo en el medio. Las dos series van lado
 * a lado, no apiladas — apiladas se compara la suma, y aquí lo que interesa
 * es cuál de las dos fue más grande.
 *
 * Un mes sin datos se dibuja vacío en vez de desaparecer: el hueco de julio
 * es información —el club no había empezado— y saltárselo comprimiría el eje
 * y haría ver el año más corto de lo que es.
 */
export function BarrasIngresosEgresos({ datos }: { datos: BarraMes[] }) {
  const sinAnimacion = useMenosMovimiento();

  const filas = datos.map((d) => ({
    ...d,
    etiqueta: mesCorto(d.mes),
    // El año solo cuando cambia, para que enero se distinga del enero anterior.
    anioCorto: String(d.anio).slice(2),
  }));

  return (
    <div className="h-(--alto-grafica) w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={COLOR.borde} />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tick={{ fill: COLOR.textoTenue, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ fill: COLOR.textoTenue, fontSize: 11 }}
            tickFormatter={(v: number) => formatCOPAbreviado(v)}
          />
          <Tooltip
            cursor={{ fill: COLOR.superficie2 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const fila = payload[0]?.payload as (typeof filas)[number];
              return (
                <Globo
                  titulo={`${label} 20${fila.anioCorto}`}
                  filas={[
                    { etiqueta: 'Ingresos', valor: formatCOP(fila.ingresos), color: COLOR.ingreso },
                    { etiqueta: 'Egresos', valor: formatCOP(fila.egresos), color: COLOR.egreso },
                    { etiqueta: 'Neto', valor: formatCOP(fila.ingresos - fila.egresos) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill={COLOR.ingreso}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!sinAnimacion}
          />
          <Bar
            dataKey="egresos"
            name="Egresos"
            fill={COLOR.egreso}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!sinAnimacion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Leyenda aparte: dentro de la gráfica le quita alto a las barras. */
export function LeyendaIngresosEgresos() {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-xs text-texto-suave">
      {[
        { texto: 'Ingresos', color: COLOR.ingreso },
        { texto: 'Egresos', color: COLOR.egreso },
      ].map((s) => (
        <li key={s.texto} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.texto}
        </li>
      ))}
    </ul>
  );
}
