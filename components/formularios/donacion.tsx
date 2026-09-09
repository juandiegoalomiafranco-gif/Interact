'use client';

import { useActionState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { guardarDonante, registrarDonacion } from '@/app/acciones/registros';
import { TIPOS_DONANTE } from '@/lib/catalogos';
import {
  ESTADOS_DONACION,
  TIPOS_APORTE,
  type Donacion,
  type Donante,
  type Evento,
  type Proyecto,
} from '@/types/domain';
import { AreaTexto, AvisoError, BotonGuardar, Campo, CampoMonto, Seleccion } from '../campos';
import { Dialogo } from '../dialogo';
import { IconoEditar, IconoMas, IconoRegalo } from '../iconos';
import { erroresDe, generalDe, hoyISO, useCerrarAlGuardar } from './comun';

function CamposDonacion({
  cerrar,
  donantes,
  proyectos,
  eventos,
  donacion,
}: {
  cerrar: () => void;
  donantes: Donante[];
  proyectos: Proyecto[];
  eventos: Evento[];
  donacion?: Donacion;
}) {
  const [estado, accion] = useActionState(registrarDonacion, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);
  const nombrePorId = new Map(donantes.map((d) => [d.id, d.nombre]));
  const donanteActual = donacion?.donanteIds[0];

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {donacion && <input type="hidden" name="id" value={donacion.id} />}
      <input
        type="hidden"
        name="nombreDonante"
        value={donanteActual ? (nombrePorId.get(donanteActual) ?? '') : (donantes[0]?.nombre ?? '')}
      />

      <Seleccion
        nombre="donanteId"
        etiqueta="Donante"
        requerido
        error={e.donanteId}
        opciones={donantes.map((d) => ({ valor: d.id, texto: d.nombre }))}
        valorInicial={donanteActual}
        vacio={donantes.length === 0 ? 'Primero agrega un donante' : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoMonto
          nombre="monto"
          etiqueta="Monto"
          requerido
          error={e.monto}
          valorInicial={donacion?.monto}
          ayuda="En especie o servicio: lo que vale, para poder reportarlo."
        />
        <Seleccion
          nombre="tipoAporte"
          etiqueta="Tipo de aporte"
          requerido
          error={e.tipoAporte}
          opciones={TIPOS_APORTE}
          valorInicial={donacion?.tipoAporte ?? 'Dinero'}
        />
      </div>

      <Seleccion
        nombre="estado"
        etiqueta="Estado"
        requerido
        error={e.estado}
        opciones={ESTADOS_DONACION}
        valorInicial={donacion?.estado ?? 'Comprometida'}
        ayuda="Una promesa no es plata: solo lo Recibido entra al saldo."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="fechaCompromiso"
          etiqueta="Fecha de compromiso"
          tipo="date"
          requerido
          error={e.fechaCompromiso}
          valorInicial={donacion?.fechaCompromiso ?? hoyISO()}
        />
        <Campo
          nombre="fechaRecepcion"
          etiqueta="Fecha de recepción"
          tipo="date"
          error={e.fechaRecepcion}
          valorInicial={donacion?.fechaRecepcion}
          ayuda="Obligatoria si el estado es Recibida."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion
          nombre="proyectoId"
          etiqueta="Proyecto"
          error={e.proyectoId}
          opciones={proyectos.map((p) => ({ valor: p.id, texto: p.nombre }))}
          valorInicial={donacion?.proyectoIds[0]}
          vacio="Ninguno"
        />
        <Seleccion
          nombre="eventoId"
          etiqueta="Evento"
          error={e.eventoId}
          opciones={eventos.map((v) => ({ valor: v.id, texto: v.nombre }))}
          valorInicial={donacion?.eventoIds[0]}
          vacio="Ninguno"
        />
      </div>

      <AreaTexto nombre="observacion" etiqueta="Observación" error={e.observacion} filas={2} />

      <p className="rounded-(--radius-interno) bg-acento-suave px-3 py-2 text-xs text-acento">
        Una donación en dinero ya Recibida crea sola su ingreso en Movimientos. Las
        comprometidas y las de especie no tocan la caja.
      </p>

      <div className="flex justify-end pt-1">
        <BotonGuardar>{donacion ? 'Guardar cambios' : 'Registrar donación'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevaDonacion({
  donantes,
  proyectos,
  eventos,
}: {
  donantes: Donante[];
  proyectos: Proyecto[];
  eventos: Evento[];
}) {
  return (
    <Dialogo
      etiquetaBoton="Registrar donación"
      iconoBoton={<IconoRegalo className="size-4" />}
      titulo="Registrar donación"
      descripcion="Un aporte comprometido o ya recibido."
    >
      {(cerrar) => (
        <CamposDonacion
          cerrar={cerrar}
          donantes={donantes}
          proyectos={proyectos}
          eventos={eventos}
        />
      )}
    </Dialogo>
  );
}

// ─────────────────────────────── Donantes ───────────────────────────────

function CamposDonante({ cerrar, donante }: { cerrar: () => void; donante?: Donante }) {
  const [estado, accion] = useActionState(guardarDonante, INICIAL);
  useCerrarAlGuardar(estado, cerrar);

  const e = erroresDe(estado);

  return (
    <form action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {donante && <input type="hidden" name="id" value={donante.id} />}

      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        requerido
        error={e.nombre}
        marcador="Ferretería La Esquina"
        valorInicial={donante?.nombre}
      />
      <Seleccion
        nombre="tipo"
        etiqueta="Tipo"
        error={e.tipo}
        opciones={TIPOS_DONANTE}
        valorInicial={donante?.tipo}
        vacio="Sin especificar"
      />
      <Campo
        nombre="contacto"
        etiqueta="Contacto"
        error={e.contacto}
        ayuda="Cómo agradecerle. Opcional."
      />
      <AreaTexto nombre="notas" etiqueta="Notas" error={e.notas} filas={2} />

      <div className="flex justify-end pt-1">
        <BotonGuardar>{donante ? 'Guardar cambios' : 'Agregar donante'}</BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoDonante() {
  return (
    <Dialogo
      etiquetaBoton="Agregar donante"
      iconoBoton={<IconoMas className="size-4" />}
      variante="secundario"
      titulo="Agregar donante"
      descripcion="Una persona, empresa o institución que aporta al club."
    >
      {(cerrar) => <CamposDonante cerrar={cerrar} />}
    </Dialogo>
  );
}

export function BotonEditarDonante({ donante }: { donante: Donante }) {
  return (
    <Dialogo
      etiquetaBoton="Editar"
      iconoBoton={<IconoEditar className="size-4" />}
      variante="discreto"
      titulo="Editar donante"
      descripcion={donante.nombre}
    >
      {(cerrar) => <CamposDonante cerrar={cerrar} donante={donante} />}
    </Dialogo>
  );
}
