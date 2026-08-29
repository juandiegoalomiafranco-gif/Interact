/**
 * Cálculos derivados del dashboard.
 *
 * Todas las funciones son puras: reciben datos y devuelven datos. Nada de
 * fetch, nada de fechas implícitas (el "hoy" siempre entra por parámetro para
 * que los tests sean deterministas), y cero dependencia de fórmulas o rollups
 * de Airtable — si alguien los borra por accidente, el dashboard sigue igual.
 *
 * DOS REGLAS CONTABLES que atraviesan todo este archivo:
 *
 * 1. Un movimiento `Rechazado` no movió plata. Se excluye de todo saldo,
 *    total y alerta. Contarlo desviaría el saldo por el monto de cada gasto
 *    que el comité alcanzó a negar.
 *
 * 2. Una donación en dinero YA está registrada como movimiento de tipo
 *    Ingreso (ver las reglas de la etapa 0). Por eso lo recaudado de un
 *    evento o proyecto se calcula SOLO desde MOVIMIENTOS. Sumar además las
 *    donaciones contaría dos veces la misma plata. Las donaciones se reportan
 *    aparte, para verlas, nunca sumadas al neto.
 */

import {
  anioRotarioDe,
  claveMes,
  compararFechas,
  dentroDelAnioRotario,
  diasEntre,
  mesesDelAnioRotario,
  parseFecha,
  ultimosMeses,
  type AnioRotario,
  type FechaSimple,
} from './fechas';
import type {
  Cuota,
  Donacion,
  Donante,
  EstadoCuota,
  Evento,
  Miembro,
  Movimiento,
  Periodo,
  Proyecto,
  Snapshot,
  TipoMovimiento,
} from '@/types/domain';

// ───────────────────────── Utilidades internas ─────────────────────────

/** Regla 1: lo rechazado no cuenta. */
function movio(m: Movimiento): boolean {
  return m.estadoAprobacion !== 'Rechazado';
}

function monto(m: { monto: number | null }): number {
  return m.monto ?? 0;
}

function sumar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

function esDe(ids: string[], id: string): boolean {
  return ids.includes(id);
}

// ─────────────────────────── Vista General ─────────────────────────────

/**
 * Ingresos menos egresos sobre todos los movimientos que efectivamente
 * movieron plata.
 */
export function saldoActual(movimientos: Movimiento[]): number {
  return sumar(
    movimientos.filter(movio).map((m) => (m.tipo === 'Egreso' ? -monto(m) : m.tipo === 'Ingreso' ? monto(m) : 0)),
  );
}

export function totalDelMes(
  movimientos: Movimiento[],
  tipo: TipoMovimiento,
  mes: Pick<FechaSimple, 'anio' | 'mes'>,
): number {
  const objetivo = claveMes(mes);
  return sumar(
    movimientos
      .filter(movio)
      .filter((m) => m.tipo === tipo)
      .filter((m) => {
        const f = parseFecha(m.fecha);
        return f !== null && claveMes(f) === objetivo;
      })
      .map(monto),
  );
}

export function ingresosDelMes(m: Movimiento[], mes: Pick<FechaSimple, 'anio' | 'mes'>): number {
  return totalDelMes(m, 'Ingreso', mes);
}

export function egresosDelMes(m: Movimiento[], mes: Pick<FechaSimple, 'anio' | 'mes'>): number {
  return totalDelMes(m, 'Egreso', mes);
}

export interface BarraMes {
  anio: number;
  mes: number;
  ingresos: number;
  egresos: number;
}

/** Los últimos `n` meses contando el de `hasta`, del más viejo al más nuevo. */
export function ingresosVsEgresos(
  movimientos: Movimiento[],
  hasta: Pick<FechaSimple, 'anio' | 'mes'>,
  n = 6,
): BarraMes[] {
  return ultimosMeses(hasta, n).map((mes) => ({
    ...mes,
    ingresos: ingresosDelMes(movimientos, mes),
    egresos: egresosDelMes(movimientos, mes),
  }));
}

export interface RebanadaCategoria {
  categoria: string;
  monto: number;
  /** Fracción del total de egresos del año. `null` si el total es 0. */
  fraccion: number | null;
}

/** Egresos del año rotario agrupados por categoría, de mayor a menor. */
export function egresosPorCategoria(
  movimientos: Movimiento[],
  anio: AnioRotario,
): RebanadaCategoria[] {
  const porCategoria = new Map<string, number>();

  for (const m of movimientos) {
    if (!movio(m) || m.tipo !== 'Egreso') continue;
    const f = parseFecha(m.fecha);
    if (!f || !dentroDelAnioRotario(f, anio)) continue;

    const cat = m.categoria ?? 'Sin categoría';
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + monto(m));
  }

  const total = sumar([...porCategoria.values()]);

  return [...porCategoria.entries()]
    .map(([categoria, valor]) => ({
      categoria,
      monto: valor,
      fraccion: total === 0 ? null : valor / total,
    }))
    .sort((a, b) => b.monto - a.monto);
}

/**
 * Los `n` movimientos más recientes. Los que no tienen fecha van al final:
 * no se puede afirmar que sean recientes.
 */
export function ultimosMovimientos(movimientos: Movimiento[], n = 10): Movimiento[] {
  return [...movimientos]
    .filter(movio)
    .sort((a, b) => {
      const fa = parseFecha(a.fecha);
      const fb = parseFecha(b.fecha);
      if (!fa && !fb) return 0;
      if (!fa) return 1;
      if (!fb) return -1;
      return compararFechas(fb, fa);
    })
    .slice(0, n);
}

// ──────────────────────────── Vista Cuotas ─────────────────────────────

/** Pagado y Exonerado dejan al miembro al día. Parcial y Pendiente no. */
function alDia(estado: EstadoCuota | null): boolean {
  return estado === 'Pagado' || estado === 'Exonerado';
}

export interface Cumplimiento {
  alDia: number;
  /** Miembros con registro de cuota para ese periodo. */
  conRegistro: number;
  /** Miembros sin ningún registro. Un hueco de datos, no un incumplimiento. */
  sinRegistro: number;
  /** `null` cuando no hay ni un registro: 0 de 0 no es 0 %, es "sin datos". */
  fraccion: number | null;
}

/**
 * Cumplimiento de un periodo. Solo cuenta miembros Activos: alguien retirado
 * del club no es un moroso.
 */
export function porcentajeAlDia(
  miembros: Miembro[],
  cuotas: Cuota[],
  periodoId: string,
): Cumplimiento {
  const activos = miembros.filter((m) => m.estado === 'Activo');
  const idsActivos = new Set(activos.map((m) => m.id));

  const delPeriodo = cuotas.filter(
    (c) => c.periodoId === periodoId && c.miembroId !== null && idsActivos.has(c.miembroId),
  );

  const conRegistro = new Set(delPeriodo.map((c) => c.miembroId)).size;
  const alDiaCount = delPeriodo.filter((c) => alDia(c.estado)).length;

  return {
    alDia: alDiaCount,
    conRegistro,
    sinRegistro: activos.length - conRegistro,
    fraccion: conRegistro === 0 ? null : alDiaCount / conRegistro,
  };
}

export interface CeldaCuota {
  estado: EstadoCuota | null;
  montoEsperado: number | null;
  montoPagado: number | null;
  fechaPago: string | null;
}

export interface FilaMatriz {
  miembro: Miembro;
  /** Doce celdas, de julio a junio. `null` = no existe el registro. */
  celdas: (CeldaCuota | null)[];
  mesesEnMora: number;
}

export interface ColumnaMes {
  anio: number;
  mes: number;
  periodoId: string | null;
  cumplimiento: Cumplimiento;
}

export interface MatrizCuotas {
  meses: ColumnaMes[];
  filas: FilaMatriz[];
}

/**
 * Matriz miembros × doce meses del año rotario, arrancando en julio.
 *
 * El mes de cada cuota sale de `Periodo.fechaInicio`, no del texto de
 * `Periodo.nombre`: el texto lo escribe una persona y se equivoca.
 *
 * `mesesEnMora` cuenta solo cuotas Pendiente o Parcial de meses ya
 * transcurridos. Una celda vacía NO cuenta como mora: no hay forma de
 * distinguir "el tesorero todavía no generó el registro" de "no pagó", y
 * acusar a alguien de deber por un hueco de datos es peor que no contarlo.
 */
export function matrizCuotas(
  miembros: Miembro[],
  periodos: Periodo[],
  cuotas: Cuota[],
  anio: AnioRotario,
  hoy: FechaSimple,
): MatrizCuotas {
  const meses = mesesDelAnioRotario(anio);
  const claveHoy = claveMes(hoy);

  // Mes (clave) → periodo que le corresponde.
  const periodoPorMes = new Map<number, Periodo>();
  for (const p of periodos) {
    const f = parseFecha(p.fechaInicio);
    if (f) periodoPorMes.set(claveMes(f), p);
  }

  // "miembroId|periodoId" → cuota.
  const cuotaPorMiembroPeriodo = new Map<string, Cuota>();
  for (const c of cuotas) {
    if (c.miembroId && c.periodoId) cuotaPorMiembroPeriodo.set(`${c.miembroId}|${c.periodoId}`, c);
  }

  const columnas: ColumnaMes[] = meses.map((m) => {
    const periodo = periodoPorMes.get(claveMes(m)) ?? null;
    return {
      anio: m.anio,
      mes: m.mes,
      periodoId: periodo?.id ?? null,
      cumplimiento: periodo
        ? porcentajeAlDia(miembros, cuotas, periodo.id)
        : { alDia: 0, conRegistro: 0, sinRegistro: 0, fraccion: null },
    };
  });

  const filas: FilaMatriz[] = miembros.map((miembro) => {
    let mesesEnMora = 0;

    const celdas = meses.map((m, i) => {
      const periodoId = columnas[i]?.periodoId ?? null;
      if (!periodoId) return null;

      const cuota = cuotaPorMiembroPeriodo.get(`${miembro.id}|${periodoId}`);
      if (!cuota) return null;

      const yaPaso = claveMes(m) <= claveHoy;
      if (yaPaso && (cuota.estado === 'Pendiente' || cuota.estado === 'Parcial')) {
        mesesEnMora += 1;
      }

      return {
        estado: cuota.estado,
        montoEsperado: cuota.montoEsperado,
        montoPagado: cuota.montoPagado,
        fechaPago: cuota.fechaPago,
      };
    });

    return { miembro, celdas, mesesEnMora };
  });

  return { meses: columnas, filas };
}

// ────────────────────────── Vista Proyectos ────────────────────────────

export type Semaforo = 'ok' | 'alerta' | 'riesgo';

export interface EjecucionProyecto {
  proyecto: Proyecto;
  presupuesto: number | null;
  gastado: number;
  /** `null` cuando no hay presupuesto aprobado contra el cual restar. */
  saldo: number | null;
  /** `null` cuando no hay presupuesto o es 0: no se divide por cero. */
  fraccion: number | null;
  /** `null` cuando no hay presupuesto: sin referencia no hay semáforo. */
  semaforo: Semaforo | null;
  /**
   * Donaciones recibidas asociadas, para mostrar. NO se suma al gastado ni al
   * saldo: las donaciones en dinero ya están contadas como movimientos.
   */
  donacionesRecibidas: number;
}

function semaforoDe(fraccion: number | null): Semaforo | null {
  if (fraccion === null) return null;
  if (fraccion > 1) return 'riesgo';
  if (fraccion >= 0.9) return 'alerta';
  return 'ok';
}

export function ejecucionProyecto(
  proyecto: Proyecto,
  movimientos: Movimiento[],
  donaciones: Donacion[],
): EjecucionProyecto {
  const gastado = sumar(
    movimientos
      .filter(movio)
      .filter((m) => m.tipo === 'Egreso' && esDe(m.proyectoIds, proyecto.id))
      .map(monto),
  );

  const presupuesto = proyecto.presupuestoAprobado;
  const hayPresupuesto = presupuesto !== null && presupuesto !== 0;
  const fraccion = hayPresupuesto ? gastado / presupuesto : null;

  return {
    proyecto,
    presupuesto,
    gastado,
    saldo: presupuesto === null ? null : presupuesto - gastado,
    fraccion,
    semaforo: semaforoDe(fraccion),
    donacionesRecibidas: sumar(
      donaciones
        .filter((d) => d.estado === 'Recibida' && esDe(d.proyectoIds, proyecto.id))
        .map(monto),
    ),
  };
}

// ─────────────────────────── Vista Eventos ─────────────────────────────

export interface ResultadoEvento {
  evento: Evento;
  meta: number | null;
  /** Solo desde MOVIMIENTOS: las donaciones en dinero ya están ahí. */
  recaudado: number;
  costos: number;
  /** Lo que de verdad dejó el evento. */
  neto: number;
  /** `null` cuando no hay meta o es 0. */
  fraccionMeta: number | null;
  /** Aportes en especie o servicio. Se reportan, no se suman al neto. */
  aportesEnEspecie: number;
}

export function resultadoEvento(
  evento: Evento,
  movimientos: Movimiento[],
  donaciones: Donacion[],
): ResultadoEvento {
  const delEvento = movimientos.filter(movio).filter((m) => esDe(m.eventoIds, evento.id));

  const recaudado = sumar(delEvento.filter((m) => m.tipo === 'Ingreso').map(monto));
  const costos = sumar(delEvento.filter((m) => m.tipo === 'Egreso').map(monto));

  const meta = evento.metaRecaudacion;
  const hayMeta = meta !== null && meta !== 0;

  return {
    evento,
    meta,
    recaudado,
    costos,
    neto: recaudado - costos,
    fraccionMeta: hayMeta ? recaudado / meta : null,
    aportesEnEspecie: sumar(
      donaciones
        .filter(
          (d) =>
            d.estado === 'Recibida' &&
            d.tipoAporte !== 'Dinero' &&
            esDe(d.eventoIds, evento.id),
        )
        .map(monto),
    ),
  };
}

// ────────────────────────── Vista Donantes ─────────────────────────────

export interface FilaDonante {
  donante: Donante;
  totalAnio: number;
  totalHistorico: number;
  ultimaDonacion: string | null;
  numeroDonaciones: number;
}

/**
 * Ranking por total donado en el año rotario en curso.
 * Solo cuenta donaciones Recibidas: una promesa no es plata.
 * La fecha que manda es la de recepción, no la de compromiso.
 */
export function rankingDonantes(
  donantes: Donante[],
  donaciones: Donacion[],
  anio: AnioRotario,
): FilaDonante[] {
  return donantes
    .map((donante) => {
      const suyas = donaciones.filter(
        (d) => d.estado === 'Recibida' && esDe(d.donanteIds, donante.id),
      );

      const fechas = suyas
        .map((d) => parseFecha(d.fechaRecepcion))
        .filter((f): f is FechaSimple => f !== null)
        .sort(compararFechas);

      const ultima = fechas.at(-1);

      return {
        donante,
        totalAnio: sumar(
          suyas
            .filter((d) => {
              const f = parseFecha(d.fechaRecepcion);
              return f !== null && dentroDelAnioRotario(f, anio);
            })
            .map(monto),
        ),
        totalHistorico: sumar(suyas.map(monto)),
        ultimaDonacion: ultima
          ? `${ultima.anio}-${String(ultima.mes).padStart(2, '0')}-${String(ultima.dia).padStart(2, '0')}`
          : null,
        numeroDonaciones: suyas.length,
      };
    })
    .sort((a, b) => b.totalAnio - a.totalAnio || b.totalHistorico - a.totalHistorico);
}

export interface Comprometida {
  donacion: Donacion;
  donante: Donante | null;
  /** `null` si no hay fecha de compromiso contra la cual contar. */
  diasPendientes: number | null;
}

/** Donaciones prometidas que todavía no se reciben, de la más vieja a la más nueva. */
export function donacionesComprometidas(
  donaciones: Donacion[],
  donantes: Donante[],
  hoy: FechaSimple,
): Comprometida[] {
  const porId = new Map(donantes.map((d) => [d.id, d]));

  return donaciones
    .filter((d) => d.estado === 'Comprometida')
    .map((donacion) => {
      const f = parseFecha(donacion.fechaCompromiso);
      return {
        donacion,
        donante: porId.get(donacion.donanteIds[0] ?? '') ?? null,
        diasPendientes: f ? diasEntre(f, hoy) : null,
      };
    })
    .sort((a, b) => (b.diasPendientes ?? -1) - (a.diasPendientes ?? -1));
}

// ────────────────────────────── Alertas ────────────────────────────────

export type TipoAlerta =
  | 'egresos-sin-soporte'
  | 'aprobacion-pendiente'
  | 'presupuesto-comprometido'
  | 'sin-conciliar';

export interface Alerta {
  tipo: TipoAlerta;
  titulo: string;
  cantidad: number;
  /** Suma en pesos de lo señalado, para dimensionar el problema. */
  montoTotal: number;
  movimientos: Movimiento[];
  proyectos: EjecucionProyecto[];
}

/**
 * Las cuatro alertas del brief. Devuelve solo las que tienen algo que decir:
 * una lista vacía significa que no hay nada que reportar, y la UI muestra un
 * estado vacío sobrio en vez de un bloque verde de felicitación.
 */
export function alertas(snapshot: Snapshot): Alerta[] {
  const { movimientos, proyectos, donaciones, periodos } = snapshot;
  const vivos = movimientos.filter(movio);
  const salida: Alerta[] = [];

  const sinSoporte = vivos.filter((m) => m.tipo === 'Egreso' && !m.tieneSoporte);
  if (sinSoporte.length > 0) {
    salida.push({
      tipo: 'egresos-sin-soporte',
      titulo: 'Egresos sin archivo de soporte',
      cantidad: sinSoporte.length,
      montoTotal: sumar(sinSoporte.map(monto)),
      movimientos: sinSoporte,
      proyectos: [],
    });
  }

  const pendientes = vivos.filter(
    (m) => m.tipo === 'Egreso' && m.estadoAprobacion === 'Pendiente',
  );
  if (pendientes.length > 0) {
    salida.push({
      tipo: 'aprobacion-pendiente',
      titulo: 'Egresos pendientes de aprobación',
      cantidad: pendientes.length,
      montoTotal: sumar(pendientes.map(monto)),
      movimientos: pendientes,
      proyectos: [],
    });
  }

  const comprometidos = proyectos
    .map((p) => ejecucionProyecto(p, movimientos, donaciones))
    .filter((e) => e.fraccion !== null && e.fraccion > 0.9);
  if (comprometidos.length > 0) {
    salida.push({
      tipo: 'presupuesto-comprometido',
      titulo: 'Proyectos por encima del 90 % del presupuesto',
      cantidad: comprometidos.length,
      montoTotal: sumar(comprometidos.map((e) => e.gastado)),
      movimientos: [],
      proyectos: comprometidos,
    });
  }

  // Meses cerrados según PERIODOS.Cerrado, cruzados por el mes de la fecha.
  const mesesCerrados = new Set<number>();
  for (const p of periodos) {
    if (!p.cerrado) continue;
    const f = parseFecha(p.fechaInicio);
    if (f) mesesCerrados.add(claveMes(f));
  }

  const sinConciliar = vivos.filter((m) => {
    if (m.conciliado) return false;
    const f = parseFecha(m.fecha);
    return f !== null && mesesCerrados.has(claveMes(f));
  });
  if (sinConciliar.length > 0) {
    salida.push({
      tipo: 'sin-conciliar',
      titulo: 'Movimientos sin conciliar de meses ya cerrados',
      cantidad: sinConciliar.length,
      montoTotal: sumar(sinConciliar.map(monto)),
      movimientos: sinConciliar,
      proyectos: [],
    });
  }

  return salida;
}

// ─────────────────────── Atajos para las páginas ───────────────────────

export interface ResumenGeneral {
  saldo: number;
  ingresosMes: number;
  egresosMes: number;
  cumplimientoMes: Cumplimiento;
  periodoActual: Periodo | null;
  barras: BarraMes[];
  categorias: RebanadaCategoria[];
  recientes: Movimiento[];
  alertas: Alerta[];
  anio: AnioRotario;
}

/** Todo lo que necesita la vista General, en una pasada. */
export function resumenGeneral(snapshot: Snapshot, hoy: FechaSimple): ResumenGeneral {
  const anio = anioRotarioDe(hoy);
  const claveHoy = claveMes(hoy);

  const periodoActual =
    snapshot.periodos.find((p) => {
      const f = parseFecha(p.fechaInicio);
      return f !== null && claveMes(f) === claveHoy;
    }) ?? null;

  return {
    saldo: saldoActual(snapshot.movimientos),
    ingresosMes: ingresosDelMes(snapshot.movimientos, hoy),
    egresosMes: egresosDelMes(snapshot.movimientos, hoy),
    cumplimientoMes: periodoActual
      ? porcentajeAlDia(snapshot.miembros, snapshot.cuotas, periodoActual.id)
      : { alDia: 0, conRegistro: 0, sinRegistro: 0, fraccion: null },
    periodoActual,
    barras: ingresosVsEgresos(snapshot.movimientos, hoy, 6),
    categorias: egresosPorCategoria(snapshot.movimientos, anio),
    recientes: ultimosMovimientos(snapshot.movimientos, 10),
    alertas: alertas(snapshot),
    anio,
  };
}
