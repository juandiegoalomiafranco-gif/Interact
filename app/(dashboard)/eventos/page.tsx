import type { Metadata } from 'next';
import { puedeEditar } from '@/app/acciones/comun';
import { AvisoLectura } from '@/components/aviso-lectura';
import { EstadoVacio, TablaFaltante } from '@/components/estado-vacio';
import { BotonEditarEvento, BotonNuevoEvento } from '@/components/formularios/evento';
import { InsigniaEstado } from '@/components/insignia';
import { BarraAvance, CeldaPrincipal, TablaDatos } from '@/components/tabla';
import { Tarjeta } from '@/components/tarjeta';
import { datos } from '@/lib/datos';
import { compararFechas, parseFecha } from '@/lib/fechas';
import { formatCOP, formatFecha, formatPorcentaje } from '@/lib/format';
import { resultadoEvento, type ResultadoEvento } from '@/lib/metrics';

export const metadata: Metadata = { title: 'Eventos · Finanzas Interact' };

/**
 * Qué dejó cada evento.
 *
 * Lo recaudado sale SOLO de los movimientos enlazados al evento. Las
 * donaciones en dinero ya están registradas como ingreso, así que sumarlas
 * aquí contaría la misma plata dos veces; las de especie y servicio se
 * reportan aparte, porque no pasaron por la caja.
 */
export default async function EventosPage() {
  const { snapshot, errorDeLectura } = await datos();
  const editor = await puedeEditar();

  const filas = snapshot.eventos
    .map((e) => resultadoEvento(e, snapshot.movimientos, snapshot.donaciones))
    .sort((a, b) => {
      const fa = parseFecha(a.evento.fecha);
      const fb = parseFecha(b.evento.fecha);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return compararFechas(fb, fa);
    });

  const recaudadoTotal = filas.reduce((a, f) => a + f.recaudado, 0);
  const netoTotal = filas.reduce((a, f) => a + f.neto, 0);
  const enEspecie = filas.reduce((a, f) => a + f.aportesEnEspecie, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">Eventos</h1>
          <p className="mt-1 text-sm text-texto-suave">
            {filas.length} {filas.length === 1 ? 'evento' : 'eventos'} en la base
          </p>
        </div>
        {editor && <BotonNuevoEvento proyectos={snapshot.proyectos} />}
      </div>

      <AvisoLectura mensaje={errorDeLectura} />
      <TablaFaltante tablas={snapshot.faltantes.filter((t) => t === 'MOVIMIENTOS')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Recaudado">
          <p className="text-2xl font-semibold tabular text-texto">
            {formatCOP(recaudadoTotal)}
          </p>
          <p className="mt-1 text-xs text-texto-tenue">Ingresos enlazados a un evento.</p>
        </Tarjeta>

        <Tarjeta titulo="Neto">
          <p
            className={`text-2xl font-semibold tabular ${
              netoTotal < 0 ? 'text-riesgo-texto' : 'text-texto'
            }`}
          >
            {formatCOP(netoTotal)}
          </p>
          <p className="mt-1 text-xs text-texto-tenue">
            Lo recaudado menos lo que costó organizarlos.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Aportes en especie">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(enEspecie)}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Se reportan, no se suman al neto: no pasaron por la caja.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta sinRelleno titulo="Resultado por evento" descripcion="Del más reciente al más viejo">
        <TablaDatos<ResultadoEvento>
          filas={filas}
          claveDe={(f) => f.evento.id}
          vacio={
            <EstadoVacio titulo="Todavía no hay eventos">
              Los eventos salen de la tabla EVENTOS de Airtable. También puedes crear uno desde
              aquí.
            </EstadoVacio>
          }
          columnas={[
            {
              titulo: 'Evento',
              celda: (f) => (
                <CeldaPrincipal
                  titulo={f.evento.nombre}
                  detalle={formatFecha(f.evento.fecha)}
                />
              ),
            },
            {
              titulo: 'Estado',
              soloEscritorio: true,
              celda: (f) => <InsigniaEstado estado={f.evento.estado} />,
            },
            {
              titulo: 'Contra la meta',
              ancho: '11rem',
              celda: (f) => (
                <div className="min-w-28">
                  <p className="mb-1 text-xs tabular text-texto-suave">
                    {f.fraccionMeta === null
                      ? 'Sin meta'
                      : `${formatPorcentaje(f.fraccionMeta)} de ${formatCOP(f.meta)}`}
                  </p>
                  <BarraAvance
                    fraccion={f.fraccionMeta}
                    tono={
                      f.fraccionMeta === null
                        ? 'acento'
                        : f.fraccionMeta >= 1
                          ? 'ok'
                          : f.fraccionMeta >= 0.5
                            ? 'alerta'
                            : 'riesgo'
                    }
                  />
                </div>
              ),
            },
            { titulo: 'Recaudado', numerica: true, celda: (f) => formatCOP(f.recaudado) },
            {
              titulo: 'Costos',
              numerica: true,
              soloEscritorio: true,
              celda: (f) => formatCOP(f.costos),
            },
            {
              titulo: 'Neto',
              numerica: true,
              celda: (f) => (
                <span className={f.neto < 0 ? 'text-riesgo-texto' : 'text-ok-texto'}>
                  {formatCOP(f.neto)}
                </span>
              ),
            },
            ...(editor
              ? [
                  {
                    titulo: <span className="sr-only">Acciones</span>,
                    numerica: true,
                    celda: (f: ResultadoEvento) => (
                      <BotonEditarEvento
                        evento={f.evento}
                        proyectos={snapshot.proyectos}
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
