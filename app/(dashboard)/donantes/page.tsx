import type { Metadata } from 'next';
import { puedeEditar } from '@/app/acciones/comun';
import { AvisoLectura } from '@/components/aviso-lectura';
import { EstadoVacio, TablaFaltante } from '@/components/estado-vacio';
import {
  BotonEditarDonante,
  BotonNuevaDonacion,
  BotonNuevoDonante,
} from '@/components/formularios/donacion';
import { Insignia } from '@/components/insignia';
import { CeldaPrincipal, TablaDatos } from '@/components/tabla';
import { Tarjeta } from '@/components/tarjeta';
import { datos } from '@/lib/datos';
import { anioRotarioDe } from '@/lib/fechas';
import { formatCOP, formatFecha } from '@/lib/format';
import {
  donacionesComprometidas,
  rankingDonantes,
  type Comprometida,
  type FilaDonante,
} from '@/lib/metrics';

export const metadata: Metadata = { title: 'Donantes · Finanzas Interact' };

/** A partir de cuántos días una promesa merece una llamada. */
const DIAS_PARA_INSISTIR = 30;

/**
 * Quién aporta y qué está prometido pero sin llegar.
 *
 * El ranking cuenta SOLO donaciones recibidas: una promesa no es plata. Lo
 * comprometido va en su propia tabla, con los días que lleva esperando, que
 * es el dato que convierte "hay que hacer seguimiento" en "a este hay que
 * llamarlo hoy".
 */
export default async function DonantesPage() {
  const { snapshot, hoy, errorDeLectura } = await datos();
  const editor = await puedeEditar();

  const anio = anioRotarioDe(hoy);
  const ranking = rankingDonantes(snapshot.donantes, snapshot.donaciones, anio);
  const comprometidas = donacionesComprometidas(snapshot.donaciones, snapshot.donantes, hoy);

  const recibidoAnio = ranking.reduce((a, f) => a + f.totalAnio, 0);
  const prometido = comprometidas.reduce((a, c) => a + (c.donacion.monto ?? 0), 0);
  const atrasadas = comprometidas.filter(
    (c) => (c.diasPendientes ?? 0) > DIAS_PARA_INSISTIR,
  ).length;

  const faltanTablas = snapshot.faltantes.filter(
    (t) => t === 'DONANTES' || t === 'DONACIONES',
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">Donantes</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Año rotario {anio.etiqueta} · {snapshot.donantes.length}{' '}
            {snapshot.donantes.length === 1 ? 'donante' : 'donantes'}
          </p>
        </div>
        {editor && faltanTablas.length === 0 && (
          <div className="flex flex-wrap gap-2">
            <BotonNuevoDonante />
            <BotonNuevaDonacion
              donantes={snapshot.donantes}
              proyectos={snapshot.proyectos}
              eventos={snapshot.eventos}
            />
          </div>
        )}
      </div>

      <AvisoLectura mensaje={errorDeLectura} />
      <TablaFaltante tablas={faltanTablas} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Recibido este año">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(recibidoAnio)}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Solo lo que ya entró. Lo prometido no cuenta.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Prometido sin recibir">
          <p className="text-2xl font-semibold tabular text-texto">{formatCOP(prometido)}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            {comprometidas.length}{' '}
            {comprometidas.length === 1 ? 'compromiso abierto' : 'compromisos abiertos'}.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Para llamar">
          <p className="text-2xl font-semibold tabular text-texto">{atrasadas}</p>
          <p className="mt-1 text-xs text-texto-tenue">
            Compromisos con más de {DIAS_PARA_INSISTIR} días esperando.
          </p>
        </Tarjeta>
      </div>

      <Tarjeta
        sinRelleno
        titulo="Ranking de donantes"
        descripcion="Por lo recibido en el año rotario en curso"
      >
        <TablaDatos<FilaDonante>
          filas={ranking}
          claveDe={(f) => f.donante.id}
          vacio={
            <EstadoVacio titulo="Todavía no hay donantes">
              {faltanTablas.length > 0
                ? 'Primero hay que crear las tablas DONANTES y DONACIONES en Airtable.'
                : 'Agrega el primero desde el botón de arriba.'}
            </EstadoVacio>
          }
          columnas={[
            {
              titulo: 'Donante',
              celda: (f) => (
                <CeldaPrincipal titulo={f.donante.nombre} detalle={f.donante.tipo} />
              ),
            },
            {
              titulo: 'Última donación',
              soloEscritorio: true,
              celda: (f) => (
                <span className="text-texto-suave">
                  {f.ultimaDonacion ? formatFecha(f.ultimaDonacion) : 'Todavía ninguna'}
                </span>
              ),
            },
            {
              titulo: 'Aportes',
              numerica: true,
              soloEscritorio: true,
              celda: (f) => f.numeroDonaciones,
            },
            {
              titulo: 'Este año',
              numerica: true,
              celda: (f) => formatCOP(f.totalAnio),
            },
            {
              titulo: 'Histórico',
              numerica: true,
              soloEscritorio: true,
              celda: (f) => <span className="text-texto-suave">{formatCOP(f.totalHistorico)}</span>,
            },
            ...(editor
              ? [
                  {
                    titulo: <span className="sr-only">Acciones</span>,
                    numerica: true,
                    celda: (f: FilaDonante) => <BotonEditarDonante donante={f.donante} />,
                  },
                ]
              : []),
          ]}
        />
      </Tarjeta>

      <Tarjeta
        sinRelleno
        titulo="Prometido y sin recibir"
        descripcion="De la promesa más vieja a la más nueva. Una promesa no es plata."
      >
        <TablaDatos<Comprometida>
          filas={comprometidas}
          claveDe={(c) => c.donacion.id}
          vacio={
            <p className="px-5 pb-5 text-sm text-texto-suave">
              No hay compromisos abiertos: todo lo prometido ya entró o se canceló.
            </p>
          }
          resaltarFila={(c) =>
            (c.diasPendientes ?? 0) > DIAS_PARA_INSISTIR ? 'bg-alerta-fondo/40' : undefined
          }
          columnas={[
            {
              titulo: 'Donante',
              celda: (c) => (
                <CeldaPrincipal
                  titulo={c.donante?.nombre ?? 'Donante sin enlazar'}
                  detalle={c.donacion.tipoAporte}
                />
              ),
            },
            {
              titulo: 'Prometida el',
              soloEscritorio: true,
              celda: (c) => (
                <span className="text-texto-suave">
                  {formatFecha(c.donacion.fechaCompromiso)}
                </span>
              ),
            },
            {
              titulo: 'Esperando',
              celda: (c) =>
                c.diasPendientes === null ? (
                  <span className="text-xs text-texto-tenue">Sin fecha</span>
                ) : (
                  <Insignia tono={c.diasPendientes > DIAS_PARA_INSISTIR ? 'alerta' : 'neutro'}>
                    {c.diasPendientes} {c.diasPendientes === 1 ? 'día' : 'días'}
                  </Insignia>
                ),
            },
            { titulo: 'Monto', numerica: true, celda: (c) => formatCOP(c.donacion.monto) },
          ]}
        />
      </Tarjeta>
    </div>
  );
}
