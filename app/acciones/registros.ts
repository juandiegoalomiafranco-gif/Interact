'use server';

import {
  AREAS_DE_ENFOQUE,
  CATEGORIAS_MOVIMIENTO,
  ESTADOS_EVENTO,
  ESTADOS_PROYECTO,
  METODOS_PAGO,
  ROLES_MIEMBRO,
  TIPOS_DONANTE,
  TIPOS_PROYECTO,
} from '@/lib/catalogos';
import {
  Recolector,
  fecha,
  fechaOpcional,
  idOpcional,
  idRegistro,
  monto,
  montoOpcional,
  opcion,
  opcionOpcional,
  textoOpcional,
  textoRequerido,
} from '@/lib/validacion';
import {
  ESTADOS_APROBACION,
  ESTADOS_CUOTA,
  ESTADOS_DONACION,
  ESTADOS_MIEMBRO,
  TIPOS_APORTE,
  TIPOS_MOVIMIENTO,
} from '@/types/domain';
import { aMensaje, exito, guardar, type EstadoAccion } from './comun';

/**
 * Lo que el panel puede registrar y corregir.
 *
 * Todas siguen la misma forma —la que espera `useActionState`— y todas
 * validan en el servidor. La validación del navegador es comodidad; ésta es
 * la que cuenta, porque el POST se puede mandar a mano.
 *
 * Ninguna borra nada: un error contable se corrige con un asiento nuevo o con
 * un PATCH, igual que en contabilidad de papel.
 */

/** Un enlace de Airtable es un array de ids, incluso cuando es uno solo. */
const enlace = (id: string | null | undefined) => (id ? [id] : undefined);

/** Quita las llaves en `undefined`: Airtable trata null como "borra el valor". */
function limpiar(datos: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined));
}

// ────────────────────────────── Movimientos ──────────────────────────────

export async function registrarMovimiento(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const concepto = r.campo('concepto', textoRequerido(form.get('concepto'), 'El concepto'));
  const cuando = r.campo('fecha', fecha(form.get('fecha')));
  const tipo = r.campo('tipo', opcion(form.get('tipo'), TIPOS_MOVIMIENTO, 'el tipo'));
  const valor = r.campo('monto', monto(form.get('monto')));
  const categoria = r.campo(
    'categoria',
    opcionOpcional(form.get('categoria'), CATEGORIAS_MOVIMIENTO, 'la categoría'),
  );
  const aprobacion = r.campo(
    'estadoAprobacion',
    opcion(form.get('estadoAprobacion'), ESTADOS_APROBACION, 'el estado de aprobación'),
  );
  const proyectoId = r.campo('proyectoId', idOpcional(form.get('proyectoId'), 'el proyecto'));
  const eventoId = r.campo('eventoId', idOpcional(form.get('eventoId'), 'el evento'));
  const nota = r.campo('observacion', textoOpcional(form.get('observacion')));
  const movimientoId = r.campo('id', idOpcional(form.get('id'), 'el movimiento'));

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  try {
    await guardar({
      tabla: 'MOVIMIENTOS',
      metodo: movimientoId ? 'PATCH' : 'POST',
      recordId: movimientoId ?? undefined,
      datos: limpiar({
        Concepto: concepto,
        Fecha: cuando,
        Tipo: tipo,
        Monto: valor,
        'Categoría': categoria ?? undefined,
        'Estado de aprobación': aprobacion,
        Conciliado: form.get('conciliado') === 'on',
        Proyecto: enlace(proyectoId),
        Evento: enlace(eventoId),
        'Observación': nota ?? undefined,
      }),
    });

    return exito(movimientoId ? 'Movimiento actualizado.' : 'Movimiento registrado.');
  } catch (e) {
    return aMensaje(e);
  }
}

// ─────────────────────────────── Cuotas ───────────────────────────────

/**
 * Registra el pago de una cuota.
 *
 * Hace DOS escrituras cuando entra plata: marca la cuota y crea el
 * movimiento de ingreso. Es la Regla 2 de `lib/metrics.ts` — el saldo sale
 * solo de MOVIMIENTOS, así que una cuota marcada sin su asiento dejaría el
 * saldo atrasado y a nadie le cuadraría la caja.
 *
 * Si la cuota se guarda y el movimiento falla, se avisa explícitamente en vez
 * de decir que todo salió bien: Airtable no tiene transacciones, y callar una
 * escritura a medias en un libro contable es peor que reportarla.
 */
export async function registrarPagoCuota(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const cuotaId = r.campo('cuotaId', idOpcional(form.get('cuotaId'), 'la cuota'));
  const miembroId = r.campo('miembroId', idRegistro(form.get('miembroId'), 'el miembro'));
  const periodoId = r.campo('periodoId', idRegistro(form.get('periodoId'), 'el periodo'));
  const estado = r.campo('estado', opcion(form.get('estado'), ESTADOS_CUOTA, 'el estado'));
  const esperado = r.campo('montoEsperado', montoOpcional(form.get('montoEsperado'), 'El monto esperado'));
  const pagado = r.campo('montoPagado', montoOpcional(form.get('montoPagado'), 'El monto pagado'));
  const cuando = r.campo('fechaPago', fechaOpcional(form.get('fechaPago'), 'La fecha de pago'));
  const metodo = r.campo('metodo', opcionOpcional(form.get('metodo'), METODOS_PAGO, 'el método'));
  const nota = r.campo('observacion', textoOpcional(form.get('observacion')));

  // Un estado 'Pagado' sin monto sería una cuota saldada por cero pesos.
  if ((estado === 'Pagado' || estado === 'Parcial') && (pagado === null || pagado === undefined)) {
    r.errores.montoPagado = 'Para marcar Pagado o Parcial hace falta el monto pagado.';
  }

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  const nombreMiembro = (form.get('nombreMiembro') as string | null)?.trim() || 'Miembro';
  const nombrePeriodo = (form.get('nombrePeriodo') as string | null)?.trim() || 'Periodo';

  try {
    await guardar({
      tabla: 'CUOTAS',
      metodo: cuotaId ? 'PATCH' : 'POST',
      recordId: cuotaId ?? undefined,
      datos: limpiar({
        ...(cuotaId ? {} : { Referencia: `${nombreMiembro} · ${nombrePeriodo}` }),
        ...(cuotaId ? {} : { Miembro: enlace(miembroId), Periodo: enlace(periodoId) }),
        'Monto esperado': esperado ?? undefined,
        'Monto pagado': pagado ?? undefined,
        Estado: estado,
        'Fecha de pago': cuando ?? undefined,
        'Método': metodo ?? undefined,
        'Observación': nota ?? undefined,
      }),
    });
  } catch (e) {
    return aMensaje(e);
  }

  // Sin plata que entre no hay asiento que crear: un Exonerado o un Pendiente
  // cambian el estado de la cuota y no mueven la caja.
  const entraPlata = (estado === 'Pagado' || estado === 'Parcial') && (pagado ?? 0) > 0;
  if (!entraPlata) return exito('Cuota actualizada.');

  try {
    await guardar({
      tabla: 'MOVIMIENTOS',
      metodo: 'POST',
      datos: {
        Concepto: `Cuota ${nombrePeriodo} · ${nombreMiembro}`,
        Fecha: cuando ?? new Date().toISOString().slice(0, 10),
        Tipo: 'Ingreso',
        Monto: pagado,
        'Categoría': 'Cuotas',
        'Estado de aprobación': 'Aprobado',
        Conciliado: false,
      },
    });
  } catch (e) {
    console.error('[acciones] la cuota se guardó pero el movimiento no:', e);
    return {
      estado: 'error',
      errores: {
        campos: {},
        general:
          'La cuota quedó marcada, pero el ingreso no se registró. Regístralo a mano en Movimientos para que el saldo cuadre.',
      },
    };
  }

  return exito('Pago registrado y sumado al saldo.');
}

// ────────────────────────────── Donaciones ──────────────────────────────

export async function guardarDonante(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const nombre = r.campo('nombre', textoRequerido(form.get('nombre'), 'El nombre'));
  const tipo = r.campo('tipo', opcionOpcional(form.get('tipo'), TIPOS_DONANTE, 'el tipo'));
  const contacto = r.campo('contacto', textoOpcional(form.get('contacto'), 200));
  const notas = r.campo('notas', textoOpcional(form.get('notas')));
  const donanteId = r.campo('id', idOpcional(form.get('id'), 'el donante'));

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  try {
    await guardar({
      tabla: 'DONANTES',
      metodo: donanteId ? 'PATCH' : 'POST',
      recordId: donanteId ?? undefined,
      datos: limpiar({
        Nombre: nombre,
        Tipo: tipo ?? undefined,
        Contacto: contacto ?? undefined,
        Notas: notas ?? undefined,
      }),
    });

    return exito(donanteId ? 'Donante actualizado.' : 'Donante agregado.');
  } catch (e) {
    return aMensaje(e);
  }
}

/**
 * Registra una donación.
 *
 * Una donación en dinero YA recibida crea además el movimiento de ingreso,
 * por la misma Regla 2 que las cuotas. Una comprometida no: una promesa no es
 * plata, y sumarla al saldo sería contar con lo que todavía no llegó.
 * Una donación en especie o servicio tampoco toca la caja.
 */
export async function registrarDonacion(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const donanteId = r.campo('donanteId', idRegistro(form.get('donanteId'), 'el donante'));
  const valor = r.campo('monto', monto(form.get('monto')));
  const estado = r.campo('estado', opcion(form.get('estado'), ESTADOS_DONACION, 'el estado'));
  const aporte = r.campo('tipoAporte', opcion(form.get('tipoAporte'), TIPOS_APORTE, 'el tipo de aporte'));
  const compromiso = r.campo('fechaCompromiso', fecha(form.get('fechaCompromiso'), 'La fecha de compromiso'));
  const recepcion = r.campo('fechaRecepcion', fechaOpcional(form.get('fechaRecepcion'), 'La fecha de recepción'));
  const proyectoId = r.campo('proyectoId', idOpcional(form.get('proyectoId'), 'el proyecto'));
  const eventoId = r.campo('eventoId', idOpcional(form.get('eventoId'), 'el evento'));
  const nota = r.campo('observacion', textoOpcional(form.get('observacion')));
  const donacionId = r.campo('id', idOpcional(form.get('id'), 'la donación'));

  if (estado === 'Recibida' && !recepcion) {
    r.errores.fechaRecepcion = 'Una donación recibida necesita su fecha de recepción.';
  }

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  const nombreDonante = (form.get('nombreDonante') as string | null)?.trim() || 'Donante';

  try {
    await guardar({
      tabla: 'DONACIONES',
      metodo: donacionId ? 'PATCH' : 'POST',
      recordId: donacionId ?? undefined,
      datos: limpiar({
        ...(donacionId ? {} : { Referencia: `${nombreDonante} · ${compromiso}` }),
        ...(donacionId ? {} : { Donante: enlace(donanteId) }),
        Monto: valor,
        Estado: estado,
        'Tipo de aporte': aporte,
        'Fecha de compromiso': compromiso,
        'Fecha de recepción': recepcion ?? undefined,
        Proyecto: enlace(proyectoId),
        Evento: enlace(eventoId),
        'Observación': nota ?? undefined,
      }),
    });
  } catch (e) {
    return aMensaje(e);
  }

  const entraPlata = estado === 'Recibida' && aporte === 'Dinero' && !donacionId;
  if (!entraPlata) return exito(donacionId ? 'Donación actualizada.' : 'Donación registrada.');

  try {
    await guardar({
      tabla: 'MOVIMIENTOS',
      metodo: 'POST',
      datos: limpiar({
        Concepto: `Donación · ${nombreDonante}`,
        Fecha: recepcion ?? compromiso,
        Tipo: 'Ingreso',
        Monto: valor,
        'Categoría': 'Donaciones',
        'Estado de aprobación': 'Aprobado',
        Conciliado: false,
        Proyecto: enlace(proyectoId),
        Evento: enlace(eventoId),
      }),
    });
  } catch (e) {
    console.error('[acciones] la donación se guardó pero el movimiento no:', e);
    return {
      estado: 'error',
      errores: {
        campos: {},
        general:
          'La donación quedó registrada, pero el ingreso no. Regístralo a mano en Movimientos para que el saldo cuadre.',
      },
    };
  }

  return exito('Donación registrada y sumada al saldo.');
}

// ────────────────────────────── Proyectos ──────────────────────────────

export async function guardarProyecto(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const nombre = r.campo('nombre', textoRequerido(form.get('nombre'), 'El nombre del proyecto'));
  const tipo = r.campo('tipo', opcionOpcional(form.get('tipo'), TIPOS_PROYECTO, 'el tipo'));
  const estado = r.campo('estado', opcion(form.get('estado'), ESTADOS_PROYECTO, 'el estado'));
  const area = r.campo('area', opcionOpcional(form.get('area'), AREAS_DE_ENFOQUE, 'el área de enfoque'));
  const presupuesto = r.campo(
    'presupuesto',
    montoOpcional(form.get('presupuesto'), 'El presupuesto'),
  );
  const inicio = r.campo('fechaInicio', fechaOpcional(form.get('fechaInicio'), 'La fecha de inicio'));
  const cierre = r.campo('fechaCierre', fechaOpcional(form.get('fechaCierre'), 'La fecha de cierre'));
  const liderId = r.campo('liderId', idOpcional(form.get('liderId'), 'el líder'));
  const descripcion = r.campo('descripcion', textoOpcional(form.get('descripcion')));
  const proyectoId = r.campo('id', idOpcional(form.get('id'), 'el proyecto'));

  if (inicio && cierre && cierre < inicio) {
    r.errores.fechaCierre = 'La fecha de cierre no puede ser anterior a la de inicio.';
  }

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  try {
    await guardar({
      tabla: 'PROYECTOS',
      metodo: proyectoId ? 'PATCH' : 'POST',
      recordId: proyectoId ?? undefined,
      datos: limpiar({
        Proyecto: nombre,
        Tipo: tipo ?? undefined,
        Estado: estado,
        'Área de enfoque': area ?? undefined,
        'Presupuesto aprobado': presupuesto ?? undefined,
        'Fecha inicio': inicio ?? undefined,
        'Fecha cierre': cierre ?? undefined,
        'Líder': enlace(liderId),
        'Descripción': descripcion ?? undefined,
      }),
    });

    return exito(proyectoId ? 'Proyecto actualizado.' : 'Proyecto creado.');
  } catch (e) {
    return aMensaje(e);
  }
}

// ─────────────────────────────── Eventos ───────────────────────────────

export async function guardarEvento(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const nombre = r.campo('nombre', textoRequerido(form.get('nombre'), 'El nombre del evento'));
  const cuando = r.campo('fecha', fechaOpcional(form.get('fecha')));
  const lugar = r.campo('lugar', textoOpcional(form.get('lugar'), 200));
  const meta = r.campo('meta', montoOpcional(form.get('meta'), 'La meta de recaudación'));
  const estado = r.campo('estado', opcion(form.get('estado'), ESTADOS_EVENTO, 'el estado'));
  const proyectoId = r.campo('proyectoId', idOpcional(form.get('proyectoId'), 'el proyecto'));
  const eventoId = r.campo('id', idOpcional(form.get('id'), 'el evento'));

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  try {
    await guardar({
      tabla: 'EVENTOS',
      metodo: eventoId ? 'PATCH' : 'POST',
      recordId: eventoId ?? undefined,
      datos: limpiar({
        Evento: nombre,
        Fecha: cuando ?? undefined,
        Lugar: lugar ?? undefined,
        'Meta de recaudación': meta ?? undefined,
        Estado: estado,
        Proyecto: enlace(proyectoId),
      }),
    });

    return exito(eventoId ? 'Evento actualizado.' : 'Evento creado.');
  } catch (e) {
    return aMensaje(e);
  }
}

// ─────────────────────────────── Miembros ───────────────────────────────

/**
 * Corrige el nombre, el rol o el estado de un miembro.
 *
 * No toca los datos de contacto —los que enumera CAMPOS_PROHIBIDOS_MIEMBROS
 * en lib/airtable/escritura.ts— y no es un olvido: buena parte del club son
 * menores de edad. Esos campos tampoco están en CAMPOS_ESCRIBIBLES, así que
 * mandarlos desde un POST armado a mano no sirve: la guarda lanza antes de
 * llamar a la API. Y `npm run verify:escritura` falla si alguien los nombra
 * siquiera en una vista, para que ni por descuido lleguen al navegador.
 */
export async function guardarMiembro(
  _previo: EstadoAccion,
  form: FormData,
): Promise<EstadoAccion> {
  const r = new Recolector();

  const nombre = r.campo('nombre', textoRequerido(form.get('nombre'), 'El nombre'));
  const rol = r.campo('rol', opcionOpcional(form.get('rol'), ROLES_MIEMBRO, 'el rol'));
  const estado = r.campo('estado', opcion(form.get('estado'), ESTADOS_MIEMBRO, 'el estado'));
  const institucion = r.campo('institucion', textoOpcional(form.get('institucion'), 200));
  const notas = r.campo('notas', textoOpcional(form.get('notas')));
  const miembroId = r.campo('id', idOpcional(form.get('id'), 'el miembro'));

  if (r.hayErrores) return { estado: 'error', errores: r.aFormulario() };

  try {
    await guardar({
      tabla: 'MIEMBROS',
      metodo: miembroId ? 'PATCH' : 'POST',
      recordId: miembroId ?? undefined,
      datos: limpiar({
        Nombre: nombre,
        Rol: rol ?? undefined,
        Estado: estado,
        'Institución': institucion ?? undefined,
        Notas: notas ?? undefined,
      }),
    });

    return exito(miembroId ? 'Miembro actualizado.' : 'Miembro agregado.');
  } catch (e) {
    return aMensaje(e);
  }
}
