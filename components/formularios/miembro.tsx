'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { guardarMiembro } from '@/app/acciones/registros';
import { ROLES_MIEMBRO } from '@/lib/catalogos';
import { ESTADOS_MIEMBRO, type Miembro } from '@/types/domain';
import { AreaTexto, AvisoError, BotonGuardar, Confirmacion, Campo, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { IconoEditar, IconoMas } from '../iconos';
import { erroresDe, generalDe, valoresDe } from './comun';

/**
 * Editar un miembro del club.
 *
 * El formulario NO tiene campos de contacto, y no es que se hayan olvidado:
 * buena parte del club son menores de edad, así que esos datos no se leen ni
 * se escriben desde la web. Se consultan en Airtable, donde están detrás de
 * los permisos de la base y cada cambio queda en el historial.
 *
 * Se dice en pantalla, no solo en un comentario: si no, la primera persona
 * que necesite un teléfono va a creer que el panel está incompleto.
 */
function Campos({ cerrar, miembro }: { cerrar: () => void; miembro?: Miembro }) {
  const [estado, accion] = useActionState(guardarMiembro, INICIAL);
  const e = erroresDe(estado);
  // React 19 resetea el formulario al terminar la acción, también cuando
  // termina mal: sin re-sembrar, un error borra todo lo ya escrito.
  const v = valoresDe(estado);

  // Confirmación visible en vez de cerrar en silencio: sin ella no hay
  // forma de saber si el cambio llegó a Airtable.
  if (estado.estado === 'ok') {
    return <Confirmacion mensaje={estado.mensaje} onListo={cerrar} />;
  }

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {miembro && <input type="hidden" name="id" value={miembro.id} />}

      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        requerido
        error={e.nombre}
        valorInicial={v.nombre ?? miembro?.nombre}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion
          nombre="rol"
          etiqueta="Rol"
          error={e.rol}
          opciones={ROLES_MIEMBRO}
          valorInicial={v.rol ?? miembro?.rol}
          vacio="Sin rol"
        />
        <Seleccion
          nombre="estado"
          etiqueta="Estado"
          requerido
          error={e.estado}
          opciones={ESTADOS_MIEMBRO}
          valorInicial={v.estado ?? miembro?.estado ?? 'Activo'}
          ayuda="El cumplimiento solo cuenta a los Activos."
        />
      </div>

      <Campo
        nombre="institucion"
        etiqueta="Institución"
        error={e.institucion}
        valorInicial={v.institucion ?? null}
        marcador="Colegio San Ignacio"
      />

      <AreaTexto nombre="notas"
        valorInicial={v.notas} etiqueta="Notas" error={e.notas} filas={2} />

      <p className="rounded-(--radius-interno) bg-superficie-2 px-3 py-2 text-xs text-texto-suave">
        Los datos de contacto del miembro y de su acudiente no se editan aquí. Buena parte
        del club son menores de edad: esa información se consulta directamente en Airtable.
      </p>

      <div className="flex justify-end pt-1">
        <BotonGuardar>{miembro ? 'Guardar cambios' : 'Agregar miembro'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoMiembro() {
  return (
    <Dialogo
      etiquetaBoton="Agregar miembro"
      iconoBoton={<IconoMas className="size-4" />}
      variante="secundario"
      titulo="Agregar miembro"
    >
      {(cerrar) => <Campos cerrar={cerrar} />}
    </Dialogo>
  );
}

export function BotonEditarMiembro({ miembro }: { miembro: Miembro }) {
  return (
    <Dialogo
      etiquetaBoton="Editar"
      iconoBoton={<IconoEditar className="size-4" />}
      variante="discreto"
      titulo="Editar miembro"
      descripcion={miembro.nombre}
    >
      {(cerrar) => <Campos cerrar={cerrar} miembro={miembro} />}
    </Dialogo>
  );
}
