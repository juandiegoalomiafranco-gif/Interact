'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { registrarPagoCuota } from '@/app/acciones/registros';
import { METODOS_PAGO } from '@/lib/catalogos';
import { ESTADOS_CUOTA, type Cuota, type Miembro, type Periodo } from '@/types/domain';
import { AreaTexto, AvisoError, BotonGuardar, Campo, CampoMonto, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { erroresDe, generalDe, hoyISO, useCerrarAlGuardar } from './comun';

/**
 * Registrar el pago de la cuota de un miembro en un periodo.
 *
 * Cuando entra plata hace dos escrituras: marca la cuota y crea el ingreso.
 * Se dice en el propio formulario, porque quien registra tiene que saber que
 * el movimiento aparece solo y no ir a crearlo otra vez a mano.
 */
export function CamposCuota({
  cerrar,
  miembro,
  periodo,
  cuota,
}: {
  cerrar: () => void;
  miembro: Miembro;
  periodo: Periodo;
  cuota?: Cuota;
}) {
  const [estado, accion] = useActionState(registrarPagoCuota, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />

      {cuota && <input type="hidden" name="cuotaId" value={cuota.id} />}
      <input type="hidden" name="miembroId" value={miembro.id} />
      <input type="hidden" name="periodoId" value={periodo.id} />
      <input type="hidden" name="nombreMiembro" value={miembro.nombre} />
      <input type="hidden" name="nombrePeriodo" value={periodo.nombre} />

      <div className="rounded-(--radius-interno) bg-superficie-2 px-3 py-2 text-sm">
        <p className="font-medium text-texto">{miembro.nombre}</p>
        <p className="text-texto-suave">{periodo.nombre}</p>
      </div>

      <Seleccion
        nombre="estado"
        etiqueta="Estado"
        requerido
        error={e.estado}
        opciones={ESTADOS_CUOTA}
        valorInicial={cuota?.estado ?? 'Pagado'}
        ayuda="Exonerado es una excepción administrativa, no una falta."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoMonto
          nombre="montoEsperado"
          etiqueta="Monto esperado"
          error={e.montoEsperado}
          valorInicial={cuota?.montoEsperado}
          ayuda="Lo que debía pagar este mes."
        />
        <CampoMonto
          nombre="montoPagado"
          etiqueta="Monto pagado"
          error={e.montoPagado}
          valorInicial={cuota?.montoPagado}
          ayuda="Lo que entró de verdad."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="fechaPago"
          etiqueta="Fecha de pago"
          tipo="date"
          error={e.fechaPago}
          valorInicial={cuota?.fechaPago ?? hoyISO()}
        />
        <Seleccion
          nombre="metodo"
          etiqueta="Método"
          error={e.metodo}
          opciones={METODOS_PAGO}
          vacio="Sin especificar"
        />
      </div>

      <AreaTexto nombre="observacion" etiqueta="Observación" error={e.observacion} filas={2} />

      <p className="rounded-(--radius-interno) bg-acento-suave px-3 py-2 text-xs text-acento">
        Si marcas Pagado o Parcial, el ingreso se registra solo en Movimientos. No lo
        agregues a mano o el saldo quedaría contado dos veces.
      </p>

      <div className="flex justify-end pt-1">
        <BotonGuardar>Registrar pago</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonCuota({
  miembro,
  periodo,
  cuota,
  etiqueta,
  variante = 'discreto',
}: {
  miembro: Miembro;
  periodo: Periodo;
  cuota?: Cuota;
  etiqueta: React.ReactNode;
  variante?: 'primario' | 'secundario' | 'discreto';
}) {
  return (
    <Dialogo
      etiquetaBoton={etiqueta}
      variante={variante}
      titulo={cuota ? 'Actualizar cuota' : 'Registrar cuota'}
      descripcion={`${miembro.nombre} · ${periodo.nombre}`}
    >
      {(cerrar) => (
        <CamposCuota cerrar={cerrar} miembro={miembro} periodo={periodo} cuota={cuota} />
      )}
    </Dialogo>
  );
}
