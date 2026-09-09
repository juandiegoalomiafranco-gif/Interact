'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCOP, formatPorcentaje } from '@/lib/format';
import type { RebanadaCategoria } from '@/lib/metrics';
import { CATEGORIA, Globo, useMenosMovimiento } from './comun';

/**
 * En qué se va la plata, por categoría.
 *
 * Dona y no torta: el hueco del centro sirve para el total, que es el dato
 * que primero busca quien mira. Y máximo siete tajadas más "Otras" — una
 * dona con quince tajadas es un arcoíris del que no se lee ninguna.
 *
 * La leyenda va al lado y con el monto escrito, no solo el color. Quien no
 * distingue rojo de verde ve dos tajadas iguales; con el texto al lado, no.
 */
const TOPE_TAJADAS = 7;

export function DonaCategorias({ datos }: { datos: RebanadaCategoria[] }) {
  const sinAnimacion = useMenosMovimiento();

  const visibles = datos.slice(0, TOPE_TAJADAS);
  const resto = datos.slice(TOPE_TAJADAS);

  const tajadas =
    resto.length > 0
      ? [
          ...visibles,
          {
            categoria: `Otras (${resto.length})`,
            monto: resto.reduce((a, b) => a + b.monto, 0),
            fraccion: resto.reduce((a, b) => a + (b.fraccion ?? 0), 0),
          },
        ]
      : visibles;

  const total = tajadas.reduce((a, b) => a + b.monto, 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-(--alto-grafica-chica) w-full shrink-0 sm:w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={tajadas}
              dataKey="monto"
              nameKey="categoria"
              innerRadius="62%"
              outerRadius="98%"
              paddingAngle={1.5}
              stroke="none"
              isAnimationActive={!sinAnimacion}
            >
              {tajadas.map((t, i) => (
                <Cell key={t.categoria} fill={CATEGORIA[i % CATEGORIA.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const t = payload[0]?.payload as (typeof tajadas)[number];
                return (
                  <Globo
                    titulo={t.categoria}
                    filas={[
                      { etiqueta: 'Gastado', valor: formatCOP(t.monto) },
                      { etiqueta: 'Del total', valor: formatPorcentaje(t.fraccion) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* El total en el hueco: es lo que se busca primero. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[10px] tracking-wide text-texto-tenue uppercase">Egresos del año</p>
            <p className="text-base font-semibold tabular text-texto">{formatCOP(total)}</p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {tajadas.map((t, i) => (
          <li key={t.categoria} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: CATEGORIA[i % CATEGORIA.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-texto-suave">{t.categoria}</span>
            <span className="shrink-0 tabular text-texto">{formatCOP(t.monto)}</span>
            <span className="w-10 shrink-0 text-right text-xs tabular text-texto-tenue">
              {formatPorcentaje(t.fraccion)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
