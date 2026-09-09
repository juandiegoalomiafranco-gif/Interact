'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { guardarProyecto } from '@/app/acciones/registros';
import { AREAS_DE_ENFOQUE, ESTADOS_PROYECTO, TIPOS_PROYECTO } from '@/lib/catalogos';
import type { Miembro, Proyecto } from '@/types/domain';
import { AreaTexto, AvisoError, BotonGuardar, Campo, CampoMonto, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { IconoEditar, IconoMas } from '../iconos';
import { erroresDe, generalDe, useCerrarAlGuardar } from './comun';

function Campos({
  cerrar,
  miembros,
  proyecto,
}: {
  cerrar: () => void;
  miembros: Miembro[];
  proyecto?: Proyecto;
}) {
  const [estado, accion] = useActionState(guardarProyecto, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}

      <Campo
        nombre="nombre"
        etiqueta="Nombre del proyecto"
        requerido
        error={e.nombre}
        marcador="Biblioteca comunitaria"
        valorInicial={proyecto?.nombre}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion
          nombre="estado"
          etiqueta="Estado"
          requerido
          error={e.estado}
          opciones={ESTADOS_PROYECTO}
          valorInicial={proyecto?.estado ?? 'Planeación'}
        />
        <Seleccion
          nombre="tipo"
          etiqueta="Tipo"
          error={e.tipo}
          opciones={TIPOS_PROYECTO}
          vacio="Sin especificar"
        />
      </div>

      <Seleccion
        nombre="area"
        etiqueta="Área de enfoque"
        error={e.area}
        opciones={AREAS_DE_ENFOQUE}
        valorInicial={proyecto?.areaDeEnfoque}
        vacio="Sin especificar"
      />

      <CampoMonto
        nombre="presupuesto"
        etiqueta="Presupuesto aprobado"
        error={e.presupuesto}
        valorInicial={proyecto?.presupuestoAprobado}
        ayuda="Sin presupuesto no hay semáforo: no habría contra qué comparar el gasto."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="fechaInicio"
          etiqueta="Fecha de inicio"
          tipo="date"
          error={e.fechaInicio}
          valorInicial={proyecto?.fechaInicio}
        />
        <Campo
          nombre="fechaCierre"
          etiqueta="Fecha de cierre"
          tipo="date"
          error={e.fechaCierre}
          valorInicial={proyecto?.fechaCierre}
        />
      </div>

      <Seleccion
        nombre="liderId"
        etiqueta="Líder"
        error={e.liderId}
        opciones={miembros.map((m) => ({ valor: m.id, texto: m.nombre }))}
        valorInicial={proyecto?.liderIds[0]}
        vacio="Sin asignar"
      />

      <AreaTexto nombre="descripcion" etiqueta="Descripción" error={e.descripcion} />

      <div className="flex justify-end pt-1">
        <BotonGuardar>{proyecto ? 'Guardar cambios' : 'Crear proyecto'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoProyecto({ miembros }: { miembros: Miembro[] }) {
  return (
    <Dialogo
      etiquetaBoton="Nuevo proyecto"
      iconoBoton={<IconoMas className="size-4" />}
      titulo="Nuevo proyecto"
      descripcion="Lo que el club se comprometió a hacer, y con cuánta plata."
    >
      {(cerrar) => <Campos cerrar={cerrar} miembros={miembros} />}
    </Dialogo>
  );
}

export function BotonEditarProyecto({
  proyecto,
  miembros,
}: {
  proyecto: Proyecto;
  miembros: Miembro[];
}) {
  return (
    <Dialogo
      etiquetaBoton="Editar"
      iconoBoton={<IconoEditar className="size-4" />}
      variante="discreto"
      titulo="Editar proyecto"
      descripcion={proyecto.nombre}
    >
      {(cerrar) => <Campos cerrar={cerrar} miembros={miembros} proyecto={proyecto} />}
    </Dialogo>
  );
}
