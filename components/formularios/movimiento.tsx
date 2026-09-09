'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { registrarMovimiento } from '@/app/acciones/registros';
import { CATEGORIAS_MOVIMIENTO } from '@/lib/catalogos';
import { ESTADOS_APROBACION, TIPOS_MOVIMIENTO, type Movimiento } from '@/types/domain';
import { AreaTexto, BotonGuardar, Campo, CampoMonto, Casilla, AvisoError, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { IconoEditar, IconoMas } from '../iconos';
import { erroresDe, generalDe, hoyISO, useCerrarAlGuardar } from './comun';

/** Las listas para enlazar el movimiento con un proyecto o un evento. */
export interface Enlazables {
  proyectos: { id: string; nombre: string }[];
  eventos: { id: string; nombre: string }[];
}

function Campos({
  cerrar,
  enlazables,
  movimiento,
}: {
  cerrar: () => void;
  enlazables: Enlazables;
  movimiento?: Movimiento;
}) {
  const [estado, accion] = useActionState(registrarMovimiento, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {movimiento && <input type="hidden" name="id" value={movimiento.id} />}

      <Campo
        nombre="concepto"
        etiqueta="Concepto"
        requerido
        error={e.concepto}
        marcador="Compra de refrigerios"
        valorInicial={movimiento?.concepto}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion
          nombre="tipo"
          etiqueta="Tipo"
          requerido
          error={e.tipo}
          opciones={TIPOS_MOVIMIENTO}
          valorInicial={movimiento?.tipo ?? 'Egreso'}
        />
        <CampoMonto
          nombre="monto"
          etiqueta="Monto"
          requerido
          error={e.monto}
          valorInicial={movimiento?.monto}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="fecha"
          etiqueta="Fecha"
          tipo="date"
          requerido
          error={e.fecha}
          valorInicial={movimiento?.fecha ?? hoyISO()}
        />
        <Seleccion
          nombre="categoria"
          etiqueta="Categoría"
          error={e.categoria}
          opciones={CATEGORIAS_MOVIMIENTO}
          valorInicial={movimiento?.categoria}
          vacio="Sin categoría"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion
          nombre="proyectoId"
          etiqueta="Proyecto"
          error={e.proyectoId}
          opciones={enlazables.proyectos.map((p) => ({ valor: p.id, texto: p.nombre }))}
          valorInicial={movimiento?.proyectoIds[0]}
          vacio="Ninguno"
          ayuda="Enlazarlo es lo que hace que cuente en la ejecución del proyecto."
        />
        <Seleccion
          nombre="eventoId"
          etiqueta="Evento"
          error={e.eventoId}
          opciones={enlazables.eventos.map((v) => ({ valor: v.id, texto: v.nombre }))}
          valorInicial={movimiento?.eventoIds[0]}
          vacio="Ninguno"
        />
      </div>

      <Seleccion
        nombre="estadoAprobacion"
        etiqueta="Estado de aprobación"
        requerido
        error={e.estadoAprobacion}
        opciones={ESTADOS_APROBACION}
        valorInicial={movimiento?.estadoAprobacion ?? 'Aprobado'}
        ayuda="Un movimiento Rechazado no movió plata: queda registrado y no entra al saldo."
      />

      <Casilla
        nombre="conciliado"
        etiqueta="Ya está conciliado con el extracto"
        valorInicial={movimiento?.conciliado ?? false}
      />

      <AreaTexto
        nombre="observacion"
        etiqueta="Observación"
        error={e.observacion}
        ayuda="Opcional. Sirve para explicar una corrección."
      />

      <div className="flex justify-end gap-2 pt-1">
        <BotonGuardar>{movimiento ? 'Guardar cambios' : 'Registrar'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoMovimiento({ enlazables }: { enlazables: Enlazables }) {
  return (
    <Dialogo
      etiquetaBoton="Registrar movimiento"
      iconoBoton={<IconoMas className="size-4" />}
      titulo="Registrar movimiento"
      descripcion="Un ingreso o un egreso del club. Nada se borra: un error se corrige con otro asiento."
    >
      {(cerrar) => <Campos cerrar={cerrar} enlazables={enlazables} />}
    </Dialogo>
  );
}

export function BotonEditarMovimiento({
  movimiento,
  enlazables,
}: {
  movimiento: Movimiento;
  enlazables: Enlazables;
}) {
  return (
    <Dialogo
      etiquetaBoton="Editar"
      iconoBoton={<IconoEditar className="size-4" />}
      variante="discreto"
      titulo="Editar movimiento"
      descripcion="Corrige los datos del asiento. El registro es el mismo; cambia su contenido."
    >
      {(cerrar) => <Campos cerrar={cerrar} enlazables={enlazables} movimiento={movimiento} />}
    </Dialogo>
  );
}
