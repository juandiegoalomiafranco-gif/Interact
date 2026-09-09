import type { Metadata } from 'next';
import { puedeEditar } from '@/app/acciones/comun';
import { AvisoLectura } from '@/components/aviso-lectura';
import { EstadoVacio } from '@/components/estado-vacio';
import { BotonEditarMiembro, BotonNuevoMiembro } from '@/components/formularios/miembro';
import { Insignia } from '@/components/insignia';
import { MatrizCuotas } from '@/components/matriz-cuotas';
import { CeldaPrincipal, TablaDatos } from '@/components/tabla';
import { Tarjeta } from '@/components/tarjeta';
import { datos } from '@/lib/datos';
import { anioRotarioDe, claveMes } from '@/lib/fechas';
import { formatCOP, formatPorcentaje } from '@/lib/format';
import { LEYENDA_CUOTAS } from '@/lib/marca-cuota';
import { matrizCuotas, porcentajeAlDia } from '@/lib/metrics';
import type { Miembro } from '@/types/domain';

export const metadata: Metadata = { title: 'Cuotas · Finanzas Interact' };

/**
 * Quién está al día y quién no, mes a mes.
 *
 * Toda la matriz sale de `matrizCuotas()`, que ya decide qué cuenta como mora
 * y qué no. Esta página no vuelve a decidirlo: lo dibuja.
 */
export default async function CuotasPage() {
  const { snapshot, hoy, errorDeLectura } = await datos();
  const editor = await puedeEditar();

  const anio = anioRotarioDe(hoy);
  const matriz = matrizCuotas(snapshot.miembros, snapshot.periodos, snapshot.cuotas, anio, hoy);

  const periodoActual =
    snapshot.periodos.find((p) => p.fechaInicio?.startsWith(
      `${hoy.anio}-${String(hoy.mes).padStart(2, '0')}`,
    )) ?? null;

  const cumplimiento = periodoActual
    ? porcentajeAlDia(snapshot.miembros, snapshot.cuotas, periodoActual.id)
    : null;

  const activos = snapshot.miembros.filter((m) => m.estado === 'Activo');
  const enMora = matriz.filas.filter((f) => f.mesesEnMora > 0);
  const recaudado = snapshot.cuotas.reduce((a, c) => a + (c.montoPagado ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">Cuotas</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Año rotario {anio.etiqueta} · {activos.length} miembros activos
          </p>
        </div>
        {editor && <BotonNuevoMiembro />}
      </div>

      <AvisoLectura mensaje={errorDeLectura} />

      {/* ─────────────── Resumen ─────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Al día este mes">
          <p className="text-2xl font-semibold tabular text-texto">
            {cumplimiento?.fraccion === null || cumplimiento === null
              ? '—'
              : formatPorcentaje(cumplimiento.fraccion)}
          </p>
          <p className="mt-1 text-xs text-texto-tenue">
            {cumplimiento === null
              ? 'No hay periodo abierto para este mes.'
              : `${cumplimiento.alDia} de ${cumplimiento.conRegistro} con registro`}
          </p>
        </Tarjeta>

        <Tarjeta titulo="Miembros en mora">
          <p className="text-2xl font-semibold tabular text-texto">{enMora.length}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Con al menos un mes ya transcurrido en Pendiente o Parcial.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Recaudado en cuotas">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(recaudado)}</p>
          <p className="mt-1 text-xs text-texto-tenue">Suma de todo lo marcado como pagado.</p>
        </Tarjeta>
      </div>

      {/* ─────────────── Matriz ─────────────── */}
      <Tarjeta
        sinRelleno
        titulo="Matriz de cuotas"
        descripcion="Julio a junio. Una celda vacía es un registro que no existe, no una deuda."
        accion={
          <ul className="flex flex-wrap items-center gap-3 text-xs text-texto-suave">
            {LEYENDA_CUOTAS.map(({ estado, marca }) => (
              <li key={estado} className="flex items-center gap-1.5">
                <span
                  className={`grid size-5 place-items-center rounded text-[10px] font-semibold ${marca.clases}`}
                  aria-hidden="true"
                >
                  {marca.letra}
                </span>
                {marca.etiqueta}
              </li>
            ))}
          </ul>
        }
      >
        {matriz.filas.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay miembros">
            La matriz se llena con lo que haya en la tabla MIEMBROS de Airtable.
          </EstadoVacio>
        ) : (
          <MatrizCuotas
            matriz={matriz}
            periodos={snapshot.periodos}
            cuotas={snapshot.cuotas}
            claveMesActual={claveMes(hoy)}
            puedeEditar={editor}
          />
        )}
      </Tarjeta>

      {/* ─────────────── Miembros ─────────────── */}
      <Tarjeta
        sinRelleno
        titulo="Miembros del club"
        descripcion="Los datos de contacto no se editan aquí: se consultan en Airtable."
      >
        <TablaDatos<Miembro>
          filas={snapshot.miembros}
          claveDe={(m) => m.id}
          vacio={
            <p className="px-5 pb-5 text-sm text-texto-suave">
              No hay miembros registrados en Airtable.
            </p>
          }
          columnas={[
            {
              titulo: 'Nombre',
              celda: (m) => <CeldaPrincipal titulo={m.nombre} detalle={m.rol} />,
            },
            {
              titulo: 'Estado',
              celda: (m) => (
                <Insignia
                  tono={
                    m.estado === 'Activo' ? 'ok' : m.estado === 'Retirado' ? 'neutro' : 'alerta'
                  }
                >
                  {m.estado ?? 'Sin estado'}
                </Insignia>
              ),
            },
            {
              titulo: 'Meses en mora',
              numerica: true,
              soloEscritorio: true,
              celda: (m) => {
                const fila = matriz.filas.find((f) => f.miembro.id === m.id);
                return fila && fila.mesesEnMora > 0 ? fila.mesesEnMora : '—';
              },
            },
            ...(editor
              ? [
                  {
                    titulo: <span className="sr-only">Acciones</span>,
                    numerica: true,
                    celda: (m: Miembro) => <BotonEditarMiembro miembro={m} />,
                  },
                ]
              : []),
          ]}
        />
      </Tarjeta>
    </div>
  );
}
