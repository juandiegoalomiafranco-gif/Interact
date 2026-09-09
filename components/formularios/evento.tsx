'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { guardarEvento } from '@/app/acciones/registros';
import { ESTADOS_EVENTO } from '@/lib/catalogos';
import type { Evento, Proyecto } from '@/types/domain';
import { AvisoError, BotonGuardar, Campo, CampoMonto, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { IconoEditar, IconoMas } from '../iconos';
import { erroresDe, generalDe, useCerrarAlGuardar } from './comun';

function Campos({
  cerrar,
  proyectos,
  evento,
}: {
  cerrar: () => void;
  proyectos: Proyecto[];
  evento?: Evento;
}) {
  const [estado, accion] = useActionState(guardarEvento, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {evento && <input type="hidden" name="id" value={evento.id} />}

      <Campo
        nombre="nombre"
        etiqueta="Nombre del evento"
        requerido
        error={e.nombre}
        marcador="Bazar de agosto"
        valorInicial={evento?.nombre}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="fecha"
          etiqueta="Fecha"
          tipo="date"
          error={e.fecha}
          valorInicial={evento?.fecha}
        />
        <Seleccion
          nombre="estado"
          etiqueta="Estado"
          requerido
          error={e.estado}
          opciones={ESTADOS_EVENTO}
          valorInicial={evento?.estado ?? 'Planeado'}
        />
      </div>

      <Campo nombre="lugar" etiqueta="Lugar" error={e.lugar} marcador="Salón múltiple" />

      <CampoMonto
        nombre="meta"
        etiqueta="Meta de recaudación"
        error={e.meta}
        valorInicial={evento?.metaRecaudacion}
        ayuda="Con qué se compara lo recaudado. Sin meta, el evento solo reporta su neto."
      />

      <Seleccion
        nombre="proyectoId"
        etiqueta="Proyecto"
        error={e.proyectoId}
        opciones={proyectos.map((p) => ({ valor: p.id, texto: p.nombre }))}
        valorInicial={evento?.proyectoIds[0]}
        vacio="Ninguno"
        ayuda="A qué proyecto le entra lo que se recaude."
      />

      <div className="flex justify-end pt-1">
        <BotonGuardar>{evento ? 'Guardar cambios' : 'Crear evento'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoEvento({ proyectos }: { proyectos: Proyecto[] }) {
  return (
    <Dialogo
      etiquetaBoton="Nuevo evento"
      iconoBoton={<IconoMas className="size-4" />}
      titulo="Nuevo evento"
      descripcion="Una actividad del club, con su meta de recaudación."
    >
      {(cerrar) => <Campos cerrar={cerrar} proyectos={proyectos} />}
    </Dialogo>
  );
}

export function BotonEditarEvento({
  evento,
  proyectos,
}: {
  evento: Evento;
  proyectos: Proyecto[];
}) {
  return (
    <Dialogo
      etiquetaBoton="Editar"
      iconoBoton={<IconoEditar className="size-4" />}
      variante="discreto"
      titulo="Editar evento"
      descripcion={evento.nombre}
    >
      {(cerrar) => <Campos cerrar={cerrar} proyectos={proyectos} evento={evento} />}
    </Dialogo>
  );
}
