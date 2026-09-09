'use client';

import { useActionState, useState } from 'react';
import { INICIAL } from '@/app/acciones/estado';
import { registrarMovimiento } from '@/app/acciones/registros';
import { CATEGORIAS_POR_TIPO } from '@/lib/catalogos';
import { formatCOP, formatFecha } from '@/lib/format';
import { ESTADOS_APROBACION, type Movimiento, type TipoMovimiento } from '@/types/domain';
import {
  AreaTexto,
  AvisoError,
  BotonGuardar,
  Campo,
  Casilla,
  Confirmacion,
  Fichas,
  Interruptor,
  MasOpciones,
  MontoGrande,
  Seleccion,
} from '../campos';
import { Dialogo } from '../dialogo';
import { IconoAbajo, IconoArriba, IconoEditar, IconoMas } from '../iconos';
import { erroresDe, generalDe, hoyISO, valoresDe } from './comun';

/** Las listas para enlazar el movimiento con un proyecto o un evento. */
export interface Enlazables {
  proyectos: { id: string; nombre: string }[];
  eventos: { id: string; nombre: string }[];
}

/**
 * Registrar un gasto o un ingreso.
 *
 * El formulario está ordenado por lo que la persona ya sabe cuando lo abre:
 * está mirando un recibo, así que primero el monto, después en qué fue, y
 * después la categoría. La fecha se asume hoy —que es cierto casi siempre— y
 * lo demás vive plegado.
 *
 * Antes eran diez campos planos, todos al mismo nivel, y anotar un gasto de
 * refrigerios costaba lo mismo que registrar un convenio.
 */
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

  // Lo que se muestra en la confirmación. Se guarda en el cliente porque la
  // acción devuelve solo un mensaje, y "Gasto de $25.000" tranquiliza más
  // que "Movimiento registrado".
  const [tipo, setTipo] = useState<TipoMovimiento>(movimiento?.tipo ?? 'Egreso');
  const [montoCrudo, setMontoCrudo] = useState('');
  const [ronda, setRonda] = useState(0);

  const e = erroresDe(estado);
  // Lo que se envió y no pasó: React 19 resetea el formulario al terminar la
  // acción, así que sin esto un error en el monto borraría también el
  // concepto y la categoría que ya estaban bien.
  const v = valoresDe(estado);
  const esEdicion = movimiento !== undefined;

  if (estado.estado === 'ok') {
    const monto = Number(montoCrudo.replace(/[$\s.]/g, '').replace(',', '.'));
    return (
      <Confirmacion
        mensaje={estado.mensaje}
        detalle={
          Number.isFinite(monto) && monto > 0
            ? `${tipo === 'Egreso' ? 'Gasto' : 'Ingreso'} de ${formatCOP(monto)}`
            : undefined
        }
        // `ronda` cambia la key del formulario: React lo desmonta y lo vuelve
        // a montar en blanco, en vez de dejar los datos del anterior escritos.
        onOtro={() => {
          setMontoCrudo('');
          setRonda((n) => n + 1);
        }}
        onListo={cerrar}
      />
    );
  }

  return (
    <form key={ronda} action={accion} className="space-y-4">
      <AvisoError mensaje={generalDe(estado)} />
      {esEdicion && <input type="hidden" name="id" value={movimiento.id} />}

      <Interruptor
        nombre="tipo"
        etiqueta="¿Qué es?"
        valorInicial={tipo}
        onCambio={(v) => setTipo(v as TipoMovimiento)}
        opciones={[
          { valor: 'Egreso', texto: 'Gasto', icono: <IconoAbajo className="size-4" /> },
          { valor: 'Ingreso', texto: 'Ingreso', icono: <IconoArriba className="size-4" /> },
        ]}
      />

      <MontoGrande
        nombre="monto"
        etiqueta="¿Cuánto?"
        error={e.monto}
        valorInicial={v.monto ?? movimiento?.monto ?? null}
        onCambio={setMontoCrudo}
      />

      <Campo
        nombre="concepto"
        etiqueta={tipo === 'Egreso' ? '¿En qué se gastó?' : '¿De dónde viene?'}
        requerido
        error={e.concepto}
        marcador={tipo === 'Egreso' ? 'Refrigerios de la jornada' : 'Rifa del asado'}
        valorInicial={v.concepto ?? movimiento?.concepto}
      />

      <Fichas
        nombre="categoria"
        etiqueta="Categoría"
        opciones={CATEGORIAS_POR_TIPO[tipo]}
        valorInicial={v.categoria ?? movimiento?.categoria}
        ayuda="Opcional, pero es lo que arma la gráfica de en qué se va la plata."
      />

      <Campo
        nombre="fecha"
        etiqueta="Fecha"
        tipo="date"
        requerido
        error={e.fecha}
        valorInicial={v.fecha ?? movimiento?.fecha ?? hoyISO()}
        ayuda={movimiento ? undefined : `Ya viene en hoy, ${formatFecha(hoyISO())}.`}
      />

      <MasOpciones>
        <div className="grid gap-4 sm:grid-cols-2">
          <Seleccion
            nombre="proyectoId"
            etiqueta="Proyecto"
            error={e.proyectoId}
            opciones={enlazables.proyectos.map((p) => ({ valor: p.id, texto: p.nombre }))}
            valorInicial={v.proyectoId ?? movimiento?.proyectoIds[0]}
            vacio="Ninguno"
            ayuda="Enlazarlo es lo que hace que cuente en la ejecución del proyecto."
          />
          <Seleccion
            nombre="eventoId"
            etiqueta="Evento"
            error={e.eventoId}
            opciones={enlazables.eventos.map((v) => ({ valor: v.id, texto: v.nombre }))}
            valorInicial={v.eventoId ?? movimiento?.eventoIds[0]}
            vacio="Ninguno"
          />
        </div>

        <Seleccion
          nombre="estadoAprobacion"
          etiqueta="Estado de aprobación"
          requerido
          error={e.estadoAprobacion}
          opciones={ESTADOS_APROBACION}
          valorInicial={v.estadoAprobacion ?? movimiento?.estadoAprobacion ?? 'Aprobado'}
          ayuda="Un movimiento Rechazado no movió plata: queda registrado y no entra al saldo."
        />

        <Casilla
          nombre="conciliado"
          etiqueta="Ya está conciliado con el extracto"
          valorInicial={estado.estado === 'error' ? v.conciliado === 'on' : (movimiento?.conciliado ?? false)}
        />

        <AreaTexto
          nombre="observacion"
          etiqueta="Nota"
          error={e.observacion}
          filas={2}
          valorInicial={v.observacion}
          ayuda="Sirve para explicar una corrección."
        />
      </MasOpciones>

      <div className="flex justify-end gap-2 pt-1">
        <BotonGuardar>
          {esEdicion ? 'Guardar cambios' : tipo === 'Egreso' ? 'Guardar gasto' : 'Guardar ingreso'}
        </BotonGuardar>
      </div>
    </form>
  );
}

export function BotonNuevoMovimiento({
  enlazables,
  etiqueta = 'Registrar gasto',
  variante = 'primario',
  ariaBoton,
}: {
  enlazables: Enlazables;
  etiqueta?: React.ReactNode;
  variante?: 'primario' | 'secundario' | 'discreto' | 'flotante';
  /** Para el flotante, donde el texto se esconde en pantallas angostas. */
  ariaBoton?: string;
}) {
  return (
    <Dialogo
      etiquetaBoton={etiqueta}
      iconoBoton={<IconoMas className="size-4" />}
      variante={variante}
      ariaBoton={ariaBoton}
      titulo="Registrar movimiento"
      descripcion="Un gasto o un ingreso del club. Se guarda en Airtable al instante."
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
