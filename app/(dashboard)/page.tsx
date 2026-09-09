import type { Metadata } from 'next';
import { puedeEditar } from '@/app/acciones/comun';
import { AvisoLectura } from '@/components/aviso-lectura';
import { TablaFaltante } from '@/components/estado-vacio';
import { BotonEditarMovimiento, BotonNuevoMovimiento } from '@/components/formularios/movimiento';
import { BarrasIngresosEgresos, LeyendaIngresosEgresos } from '@/components/graficas/barras-mes';
import { DonaCategorias } from '@/components/graficas/dona-categorias';
import { MedidorCumplimiento } from '@/components/graficas/medidor';
import { IconoAbajo, IconoArriba, IconoBanco, IconoCuotas } from '@/components/iconos';
import { Insignia } from '@/components/insignia';
import { PanelAlertas } from '@/components/panel-alertas';
import { CeldaPrincipal, TablaDatos } from '@/components/tabla';
import { Tarjeta } from '@/components/tarjeta';
import { TarjetaIndicador } from '@/components/tarjeta-indicador';
import { datos } from '@/lib/datos';
import { nombreMes } from '@/lib/fechas';
import { formatCOP, formatCOPAbreviado, formatFecha, formatPorcentaje } from '@/lib/format';
import { resumenGeneral } from '@/lib/metrics';
import type { Movimiento } from '@/types/domain';

export const metadata: Metadata = { title: 'General · Finanzas Interact' };

/**
 * La vista de entrada: cómo va la plata del club, de un vistazo.
 *
 * Todo sale de `resumenGeneral()`, que es puro y está probado. Esta página no
 * calcula nada: recibe y dibuja.
 *
 * Cuando MOVIMIENTOS todavía no existe en Airtable, las cifras que dependen
 * de ella salen en guión y con la razón escrita, nunca en $0. Un saldo de
 * cero porque el club gastó todo y uno porque nadie ha registrado nada son
 * cosas distintas, y confundirlas en un panel financiero es grave.
 */
export default async function GeneralPage() {
  const { snapshot, hoy, errorDeLectura } = await datos();
  const r = resumenGeneral(snapshot, hoy);
  const editor = await puedeEditar();

  const faltaMovimientos = snapshot.faltantes.includes('MOVIMIENTOS');
  const hayMovimientos = snapshot.movimientos.length > 0;

  /** La chispa de la tarjeta: el neto de cada uno de los últimos meses. */
  const netoPorMes = r.barras.map((b) => b.ingresos - b.egresos);

  const enlazables = {
    proyectos: snapshot.proyectos.map((p) => ({ id: p.id, nombre: p.nombre })),
    eventos: snapshot.eventos.map((e) => ({ id: e.id, nombre: e.nombre })),
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">General</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Año rotario {r.anio.etiqueta} · {nombreMes(hoy.mes)} de {hoy.anio}
          </p>
        </div>
        {editor && <BotonNuevoMovimiento enlazables={enlazables} />}
      </div>

      <AvisoLectura mensaje={errorDeLectura} />
      <TablaFaltante tablas={snapshot.faltantes} />

      {/* ─────────────── Indicadores ─────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaIndicador
          etiqueta="Saldo actual"
          valor={hayMovimientos ? formatCOPAbreviado(r.saldo) : null}
          valorCompleto={formatCOP(r.saldo)}
          tinte="saldo"
          icono={<IconoBanco className="size-4" />}
          chispa={hayMovimientos ? netoPorMes : undefined}
          notaVacia={
            faltaMovimientos ? 'Falta crear MOVIMIENTOS en Airtable' : 'Sin movimientos todavía'
          }
        />
        <TarjetaIndicador
          etiqueta={`Ingresos de ${nombreMes(hoy.mes).toLowerCase()}`}
          valor={hayMovimientos ? formatCOPAbreviado(r.ingresosMes) : null}
          valorCompleto={formatCOP(r.ingresosMes)}
          tinte="ingresos"
          icono={<IconoArriba className="size-4" />}
          chispa={hayMovimientos ? r.barras.map((b) => b.ingresos) : undefined}
          notaVacia={
            faltaMovimientos ? 'Falta crear MOVIMIENTOS en Airtable' : 'Sin movimientos todavía'
          }
        />
        <TarjetaIndicador
          etiqueta={`Egresos de ${nombreMes(hoy.mes).toLowerCase()}`}
          valor={hayMovimientos ? formatCOPAbreviado(r.egresosMes) : null}
          valorCompleto={formatCOP(r.egresosMes)}
          tinte="egresos"
          icono={<IconoAbajo className="size-4" />}
          chispa={hayMovimientos ? r.barras.map((b) => b.egresos) : undefined}
          notaVacia={
            faltaMovimientos ? 'Falta crear MOVIMIENTOS en Airtable' : 'Sin movimientos todavía'
          }
        />
        <TarjetaIndicador
          etiqueta="Cuotas al día"
          valor={
            r.cumplimientoMes.fraccion === null
              ? null
              : formatPorcentaje(r.cumplimientoMes.fraccion)
          }
          tinte="cuotas"
          icono={<IconoCuotas className="size-4" />}
          variacion={
            r.cumplimientoMes.fraccion === null
              ? null
              : `${r.cumplimientoMes.alDia}/${r.cumplimientoMes.conRegistro}`
          }
          notaVacia={
            r.periodoActual === null
              ? 'No hay periodo abierto para este mes'
              : 'Sin cuotas registradas este mes'
          }
        />
      </div>

      {/* ─────────────── Gráfica principal y cumplimiento ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta
          className="lg:col-span-2"
          titulo="Ingresos y egresos"
          descripcion="Últimos seis meses. Un mes vacío es un mes sin movimientos, no un dato que falte."
          accion={<LeyendaIngresosEgresos />}
        >
          {hayMovimientos ? (
            <BarrasIngresosEgresos datos={r.barras} />
          ) : (
            <p className="py-10 text-center text-sm text-texto-suave">
              {faltaMovimientos
                ? 'La gráfica aparece cuando exista la tabla MOVIMIENTOS.'
                : 'Todavía no hay movimientos registrados.'}
            </p>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Cumplimiento de cuotas"
          descripcion={r.periodoActual ? r.periodoActual.nombre : 'Sin periodo abierto'}
        >
          <MedidorCumplimiento cumplimiento={r.cumplimientoMes} />
        </Tarjeta>
      </div>

      {/* ─────────────── Categorías y alertas ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta
          className="lg:col-span-2"
          titulo="En qué se va la plata"
          descripcion={`Egresos del año rotario ${r.anio.etiqueta}, por categoría`}
        >
          {r.categorias.length > 0 ? (
            <DonaCategorias datos={r.categorias} />
          ) : (
            <p className="py-10 text-center text-sm text-texto-suave">
              Sin egresos registrados en este año rotario.
            </p>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Por revisar"
          descripcion="Cuatro comprobaciones sobre los movimientos y los presupuestos"
        >
          <div id="alertas" className="scroll-mt-24">
            <PanelAlertas alertas={r.alertas} />
          </div>
        </Tarjeta>
      </div>

      {/* ─────────────── Últimos movimientos ─────────────── */}
      <Tarjeta
        sinRelleno
        titulo="Últimos movimientos"
        descripcion="Los diez más recientes. Los rechazados no aparecen: no movieron plata."
      >
        <TablaDatos<Movimiento>
          filas={r.recientes}
          claveDe={(m) => m.id}
          vacio={
            <p className="px-5 pb-5 text-sm text-texto-suave">
              {faltaMovimientos
                ? 'Todavía no existe la tabla MOVIMIENTOS en Airtable.'
                : 'Nada registrado todavía.'}
            </p>
          }
          columnas={[
            {
              titulo: 'Concepto',
              celda: (m) => <CeldaPrincipal titulo={m.concepto} detalle={m.categoria} />,
            },
            {
              titulo: 'Fecha',
              soloEscritorio: true,
              celda: (m) => <span className="text-texto-suave">{formatFecha(m.fecha)}</span>,
            },
            {
              titulo: 'Estado',
              soloEscritorio: true,
              celda: (m) =>
                m.estadoAprobacion === 'Pendiente' ? (
                  <Insignia tono="alerta">Por aprobar</Insignia>
                ) : m.conciliado ? (
                  <Insignia tono="ok">Conciliado</Insignia>
                ) : (
                  <Insignia>Sin conciliar</Insignia>
                ),
            },
            {
              titulo: 'Monto',
              numerica: true,
              celda: (m) => (
                <span className={m.tipo === 'Egreso' ? 'text-riesgo-texto' : 'text-ok-texto'}>
                  {m.tipo === 'Egreso' ? '−' : '+'}
                  {formatCOP(m.monto)}
                </span>
              ),
            },
            ...(editor
              ? [
                  {
                    titulo: <span className="sr-only">Acciones</span>,
                    numerica: true,
                    celda: (m: Movimiento) => (
                      <BotonEditarMovimiento movimiento={m} enlazables={enlazables} />
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
