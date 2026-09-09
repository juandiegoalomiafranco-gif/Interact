import type { Metadata } from 'next';
import { puedeEditar } from '@/app/acciones/comun';
import { AvisoLectura } from '@/components/aviso-lectura';
import { EstadoVacio, TablaFaltante } from '@/components/estado-vacio';
import { BotonEditarProyecto, BotonNuevoProyecto } from '@/components/formularios/proyecto';
import { InsigniaEstado, InsigniaSemaforo } from '@/components/insignia';
import { BarraAvance, CeldaPrincipal, TablaDatos } from '@/components/tabla';
import { Tarjeta } from '@/components/tarjeta';
import { datos } from '@/lib/datos';
import { formatCOP, formatPorcentaje } from '@/lib/format';
import { ejecucionProyecto, type EjecucionProyecto } from '@/lib/metrics';

export const metadata: Metadata = { title: 'Proyectos · Finanzas Interact' };

/**
 * Cuánto se aprobó, cuánto se ha gastado y cuánto queda, por proyecto.
 *
 * Un proyecto sin presupuesto aprobado NO aparece en verde: aparece como
 * "sin presupuesto". Verde diría que va bien, y lo que pasa es que no hay
 * contra qué comparar el gasto.
 *
 * Las donaciones asociadas se reportan aparte y nunca se suman al gastado ni
 * al saldo: una donación en dinero ya está contada como movimiento, y
 * sumarla otra vez contaría la misma plata dos veces.
 */
export default async function ProyectosPage() {
  const { snapshot, errorDeLectura } = await datos();
  const editor = await puedeEditar();

  const filas = snapshot.proyectos
    .map((p) => ejecucionProyecto(p, snapshot.movimientos, snapshot.donaciones))
    .sort((a, b) => (b.fraccion ?? -1) - (a.fraccion ?? -1));

  const conPresupuesto = filas.filter((f) => f.presupuesto !== null);
  const totalAprobado = conPresupuesto.reduce((a, f) => a + (f.presupuesto ?? 0), 0);
  const totalGastado = filas.reduce((a, f) => a + f.gastado, 0);
  const sobregirados = filas.filter((f) => f.semaforo === 'riesgo').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">Proyectos</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {filas.length} {filas.length === 1 ? 'proyecto' : 'proyectos'} ·{' '}
            {conPresupuesto.length} con presupuesto aprobado
          </p>
        </div>
        {editor && <BotonNuevoProyecto miembros={snapshot.miembros} />}
      </div>

      <AvisoLectura mensaje={errorDeLectura} />
      <TablaFaltante tablas={snapshot.faltantes.filter((t) => t === 'MOVIMIENTOS')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Presupuesto aprobado">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(totalAprobado)}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Suma de los {conPresupuesto.length} proyectos que tienen uno.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Ejecutado">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(totalGastado)}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Egresos enlazados a un proyecto. Los rechazados no cuentan.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Sobregirados">
          <p className="text-2xl font-semibold tabular text-texto">{sobregirados}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Proyectos que ya pasaron su presupuesto aprobado.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta
        sinRelleno
        titulo="Ejecución presupuestal"
        descripcion="Las donaciones asociadas se muestran aparte: en dinero ya están contadas como movimiento."
      >
        <TablaDatos<EjecucionProyecto>
          filas={filas}
          claveDe={(f) => f.proyecto.id}
          vacio={
            <EstadoVacio titulo="Todavía no hay proyectos">
              Los proyectos salen de la tabla PROYECTOS de Airtable. También puedes crear uno
              desde aquí.
            </EstadoVacio>
          }
          columnas={[
            {
              titulo: 'Proyecto',
              celda: (f) => (
                <CeldaPrincipal
                  titulo={f.proyecto.nombre}
                  detalle={f.proyecto.areaDeEnfoque}
                />
              ),
            },
            {
              titulo: 'Estado',
              soloEscritorio: true,
              celda: (f) => <InsigniaEstado estado={f.proyecto.estado} />,
            },
            {
              titulo: 'Avance',
              ancho: '11rem',
              celda: (f) => (
                <div className="min-w-28">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    {/* Sin fracción no se repite "sin presupuesto": ya lo dice
                        la insignia de al lado, y repetido parte la columna en
                        dos líneas. */}
                    <span className="tabular text-texto-suave">
                      {f.fraccion === null ? '—' : formatPorcentaje(f.fraccion)}
                    </span>
                    <InsigniaSemaforo semaforo={f.semaforo} />
                  </div>
                  <BarraAvance
                    fraccion={f.fraccion}
                    tono={
                      f.semaforo === 'riesgo'
                        ? 'riesgo'
                        : f.semaforo === 'alerta'
                          ? 'alerta'
                          : 'ok'
                    }
                  />
                </div>
              ),
            },
            {
              titulo: 'Presupuesto',
              numerica: true,
              soloEscritorio: true,
              celda: (f) => formatCOP(f.presupuesto),
            },
            { titulo: 'Gastado', numerica: true, celda: (f) => formatCOP(f.gastado) },
            {
              titulo: 'Saldo',
              numerica: true,
              celda: (f) => (
                <span
                  className={
                    f.saldo !== null && f.saldo < 0 ? 'text-riesgo-texto' : 'text-texto'
                  }
                >
                  {formatCOP(f.saldo)}
                </span>
              ),
            },
            {
              titulo: 'Donaciones',
              numerica: true,
              soloEscritorio: true,
              celda: (f) =>
                f.donacionesRecibidas > 0 ? (
                  <span className="text-texto-suave">{formatCOP(f.donacionesRecibidas)}</span>
                ) : (
                  <span className="text-texto-tenue">—</span>
                ),
            },
            ...(editor
              ? [
                  {
                    titulo: <span className="sr-only">Acciones</span>,
                    numerica: true,
                    celda: (f: EjecucionProyecto) => (
                      <BotonEditarProyecto
                        proyecto={f.proyecto}
                        miembros={snapshot.miembros}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Tarjeta>
    </div>
  );
}
