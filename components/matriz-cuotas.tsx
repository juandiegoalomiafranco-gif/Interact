'use client';

import { useEffect, useRef, useState } from 'react';
import { CamposCuota } from '@/components/formularios/cuota';
import { mesCorto } from '@/lib/fechas';
import { formatPorcentaje } from '@/lib/format';
import { marcaDe } from '@/lib/marca-cuota';
import type { CeldaCuota, MatrizCuotas as Matriz } from '@/lib/metrics';
import type { Cuota, Miembro, Periodo } from '@/types/domain';
import { IconoCerrar } from './iconos';
import { Insignia } from './insignia';

/**
 * La matriz de cuotas: miembros × los doce meses del año rotario.
 *
 * Es un componente de cliente por una sola razón: un modal compartido. La
 * alternativa era montar un `<dialog>` por celda —quince miembros por doce
 * meses son ciento ochenta— y eso pesa en el navegador sin dar nada a cambio,
 * porque solo uno puede estar abierto a la vez.
 *
 * Lo que se ve en cada celda sale de `lib/marca-cuota.ts`: P, ½, D, E. No
 * depende del color, porque la matriz se imprime en blanco y negro para la
 * reunión y porque tres de los cuatro estados empiezan con P.
 */
export function MatrizCuotas({
  matriz,
  periodos,
  cuotas,
  claveMesActual,
  puedeEditar,
}: {
  matriz: Matriz;
  periodos: Periodo[];
  cuotas: Cuota[];
  /** anio*12 + mes de hoy: los meses futuros no se pueden registrar. */
  claveMesActual: number;
  puedeEditar: boolean;
}) {
  const [edicion, setEdicion] = useState<{
    miembro: Miembro;
    periodo: Periodo;
    cuota?: Cuota;
  } | null>(null);

  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (edicion && !d.open) d.showModal();
    else if (!edicion && d.open) d.close();
  }, [edicion]);

  const periodoPorId = new Map(periodos.map((p) => [p.id, p]));
  const cuotaPorId = new Map(cuotas.map((c) => [`${c.miembroId}|${c.periodoId}`, c]));

  function abrir(miembro: Miembro, periodoId: string | null) {
    if (!puedeEditar || !periodoId) return;
    const periodo = periodoPorId.get(periodoId);
    if (!periodo) return;
    setEdicion({ miembro, periodo, cuota: cuotaPorId.get(`${miembro.id}|${periodoId}`) });
  }

  return (
    <>
      <div className="scroll-x">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-borde">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-superficie px-4 py-2 text-left text-xs font-medium text-texto-tenue"
              >
                Miembro
              </th>
              {matriz.meses.map((m) => (
                <th
                  key={`${m.anio}-${m.mes}`}
                  scope="col"
                  className="px-1 py-2 text-center text-xs font-medium text-texto-tenue"
                >
                  <span className="block">{mesCorto(m.mes)}</span>
                  <span className="block text-[10px] font-normal">
                    {m.cumplimiento.fraccion === null
                      ? '—'
                      : formatPorcentaje(m.cumplimiento.fraccion)}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap text-texto-tenue"
              >
                En mora
              </th>
            </tr>
          </thead>

          <tbody>
            {matriz.filas.map((fila) => (
              <tr key={fila.miembro.id} className="border-b border-borde last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-44 truncate bg-superficie px-4 py-1.5 text-left font-medium text-texto"
                >
                  <span className="block truncate">{fila.miembro.nombre}</span>
                  <span className="block truncate text-xs font-normal text-texto-tenue">
                    {fila.miembro.rol ?? 'Miembro'}
                  </span>
                </th>

                {fila.celdas.map((celda, i) => {
                  const columna = matriz.meses[i]!;
                  const futuro = columna.anio * 12 + columna.mes > claveMesActual;
                  return (
                    <td key={i} className="px-0.5 py-1 text-center">
                      <Celda
                        celda={celda}
                        editable={puedeEditar && !futuro && columna.periodoId !== null}
                        onAbrir={() => abrir(fila.miembro, columna.periodoId)}
                        etiquetaMes={`${mesCorto(columna.mes)} ${columna.anio}`}
                        miembro={fila.miembro.nombre}
                      />
                    </td>
                  );
                })}

                <td className="px-3 py-1.5 text-right">
                  {fila.mesesEnMora > 0 ? (
                    <Insignia tono={fila.mesesEnMora >= 3 ? 'riesgo' : 'alerta'}>
                      {fila.mesesEnMora}
                    </Insignia>
                  ) : (
                    <span className="text-xs text-texto-tenue">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogo}
        aria-label="Registrar cuota"
        onClose={() => setEdicion(null)}
        onClick={(e) => {
          if (e.target === dialogo.current) setEdicion(null);
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-(--radius-tarjeta) bg-superficie p-0 text-texto shadow-(--sombra-flotante)"
      >
        {edicion && (
          <div className="max-h-[85vh] overflow-y-auto">
            <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
              <h2 className="text-base font-semibold text-texto">
                {edicion.cuota ? 'Actualizar cuota' : 'Registrar cuota'}
              </h2>
              <button
                type="button"
                onClick={() => setEdicion(null)}
                aria-label="Cerrar"
                className="cursor-pointer rounded-full p-1.5 text-texto-tenue hover:bg-superficie-2 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
              >
                <IconoCerrar className="size-4" />
              </button>
            </header>
            <div className="px-5 py-4">
              <CamposCuota
                cerrar={() => setEdicion(null)}
                miembro={edicion.miembro}
                periodo={edicion.periodo}
                cuota={edicion.cuota}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

/**
 * Una celda.
 *
 * Vacía significa "no hay registro", que NO es lo mismo que "no pagó": no hay
 * forma de distinguir al que debe del mes que el tesorero todavía no generó,
 * y acusar a alguien de deber por un hueco de datos es peor que no contarlo.
 */
function Celda({
  celda,
  editable,
  onAbrir,
  etiquetaMes,
  miembro,
}: {
  celda: CeldaCuota | null;
  editable: boolean;
  onAbrir: () => void;
  etiquetaMes: string;
  miembro: string;
}) {
  const marca = marcaDe(celda?.estado);
  const titulo = `${miembro} · ${etiquetaMes} · ${marca.etiqueta}`;

  const contenido = (
    <span
      className={`grid size-7 place-items-center rounded-md text-xs font-semibold ${marca.clases}`}
    >
      {marca.letra}
      <span className="sr-only">{marca.etiqueta}</span>
    </span>
  );

  if (!editable) {
    return (
      <span className="inline-block" title={titulo}>
        {contenido}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onAbrir}
      title={`${titulo} — clic para registrar`}
      className="inline-block cursor-pointer rounded-md transition-opacity duration-200 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
    >
      {contenido}
    </button>
  );
}
