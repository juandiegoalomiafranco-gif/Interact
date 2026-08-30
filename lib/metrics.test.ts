import { describe, expect, it } from 'vitest';
import { anioRotarioDe, type FechaSimple } from './fechas';
import {
  alertas,
  donacionesComprometidas,
  egresosDelMes,
  egresosPorCategoria,
  ejecucionProyecto,
  ingresosDelMes,
  ingresosVsEgresos,
  matrizCuotas,
  porcentajeAlDia,
  rankingDonantes,
  resultadoEvento,
  saldoActual,
  ultimosMovimientos,
} from './metrics';
import type {
  Cuota,
  Donacion,
  Donante,
  Evento,
  Miembro,
  Movimiento,
  Periodo,
  Proyecto,
  Snapshot,
} from '@/types/domain';

// ───────────────────────────── Fixtures ─────────────────────────────
// Datos fabricados aquí mismo. Nunca datos reales del club.

const HOY: FechaSimple = { anio: 2026, mes: 8, dia: 29 };
const ANIO = anioRotarioDe(HOY); // 2026-2027

let n = 0;
const id = (p: string) => `${p}${(n += 1)}`;

function miembro(over: Partial<Miembro> = {}): Miembro {
  return {
    id: id('mie'),
    nombre: 'Miembro de prueba',
    rol: 'Miembro',
    estado: 'Activo',
    fechaIngreso: '2026-07-01',
    ...over,
  };
}

function periodo(over: Partial<Periodo> = {}): Periodo {
  return {
    id: id('per'),
    nombre: 'Periodo de prueba',
    fechaInicio: '2026-08-01',
    fechaLimitePago: '2026-08-10',
    anioRotario: '2026-2027',
    cerrado: false,
    ...over,
  };
}

function cuota(over: Partial<Cuota> = {}): Cuota {
  return {
    id: id('cuo'),
    miembroId: null,
    periodoId: null,
    montoEsperado: 20_000,
    montoPagado: 0,
    estado: 'Pendiente',
    fechaPago: null,
    tieneSoporte: false,
    ...over,
  };
}

function mov(over: Partial<Movimiento> = {}): Movimiento {
  return {
    id: id('mov'),
    concepto: 'Movimiento de prueba',
    fecha: '2026-08-15',
    tipo: 'Ingreso',
    monto: 100_000,
    categoria: null,
    estadoAprobacion: 'Aprobado',
    conciliado: true,
    tieneSoporte: true,
    proyectoIds: [],
    eventoIds: [],
    ...over,
  };
}

function proyecto(over: Partial<Proyecto> = {}): Proyecto {
  return {
    id: id('pro'),
    nombre: 'Proyecto de prueba',
    estado: 'En curso',
    areaDeEnfoque: 'Educación',
    liderIds: [],
    presupuestoAprobado: 1_000_000,
    fechaInicio: '2026-07-01',
    fechaCierre: null,
    ...over,
  };
}

function evento(over: Partial<Evento> = {}): Evento {
  return {
    id: id('eve'),
    nombre: 'Evento de prueba',
    fecha: '2026-08-20',
    proyectoIds: [],
    metaRecaudacion: 500_000,
    estado: 'Completado',
    ...over,
  };
}

function donante(over: Partial<Donante> = {}): Donante {
  return { id: id('don'), nombre: 'Donante de prueba', tipo: 'Empresa', ...over };
}

function donacion(over: Partial<Donacion> = {}): Donacion {
  return {
    id: id('dna'),
    donanteIds: [],
    monto: 200_000,
    estado: 'Recibida',
    tipoAporte: 'Dinero',
    fechaCompromiso: '2026-08-01',
    fechaRecepcion: '2026-08-10',
    proyectoIds: [],
    eventoIds: [],
    ...over,
  };
}

function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    miembros: [],
    periodos: [],
    cuotas: [],
    proyectos: [],
    eventos: [],
    movimientos: [],
    donantes: [],
    donaciones: [],
    obtenidoEn: '2026-08-29T12:00:00.000Z',
    ...over,
  };
}

// ─────────────────────────────── Saldo ───────────────────────────────

describe('saldoActual', () => {
  it('resta los egresos de los ingresos', () => {
    expect(
      saldoActual([
        mov({ tipo: 'Ingreso', monto: 500_000 }),
        mov({ tipo: 'Egreso', monto: 200_000 }),
      ]),
    ).toBe(300_000);
  });

  it('excluye los movimientos rechazados', () => {
    // Regla 1: un gasto que el comité negó nunca movió plata. Contarlo
    // desviaría el saldo por el monto de cada negativa.
    expect(
      saldoActual([
        mov({ tipo: 'Ingreso', monto: 500_000 }),
        mov({ tipo: 'Egreso', monto: 200_000, estadoAprobacion: 'Rechazado' }),
      ]),
    ).toBe(500_000);
  });

  it('sí cuenta los egresos pendientes de aprobación', () => {
    // Pendiente no es rechazado: la plata puede haber salido ya.
    expect(
      saldoActual([mov({ tipo: 'Egreso', monto: 200_000, estadoAprobacion: 'Pendiente' })]),
    ).toBe(-200_000);
  });

  it('trata un monto ausente como cero, no como NaN', () => {
    expect(saldoActual([mov({ tipo: 'Ingreso', monto: null })])).toBe(0);
  });

  it('sin movimientos el saldo es cero', () => {
    expect(saldoActual([])).toBe(0);
  });

  it('puede quedar negativo', () => {
    expect(saldoActual([mov({ tipo: 'Egreso', monto: 50_000 })])).toBe(-50_000);
  });
});

// ─────────────────────── Ingresos y egresos del mes ──────────────────

describe('ingresosDelMes y egresosDelMes', () => {
  const movimientos = [
    mov({ tipo: 'Ingreso', monto: 100_000, fecha: '2026-08-01' }),
    mov({ tipo: 'Ingreso', monto: 50_000, fecha: '2026-08-31' }),
    mov({ tipo: 'Ingreso', monto: 999_999, fecha: '2026-07-31' }),
    mov({ tipo: 'Egreso', monto: 30_000, fecha: '2026-08-15' }),
  ];

  it('suma solo el mes pedido, incluidos sus bordes', () => {
    expect(ingresosDelMes(movimientos, HOY)).toBe(150_000);
    expect(egresosDelMes(movimientos, HOY)).toBe(30_000);
  });

  it('un mes sin movimientos da cero', () => {
    expect(ingresosDelMes(movimientos, { anio: 2027, mes: 3 })).toBe(0);
  });

  it('ignora movimientos sin fecha', () => {
    expect(ingresosDelMes([mov({ fecha: null, monto: 700_000 })], HOY)).toBe(0);
  });
});

describe('ingresosVsEgresos', () => {
  it('devuelve seis meses seguidos, incluidos los vacíos', () => {
    const barras = ingresosVsEgresos([mov({ fecha: '2026-08-10', monto: 80_000 })], HOY, 6);

    expect(barras).toHaveLength(6);
    expect(barras[0]).toMatchObject({ anio: 2026, mes: 3 });
    expect(barras[5]).toMatchObject({ anio: 2026, mes: 8, ingresos: 80_000 });
    // Un mes sin datos aparece con cero, no desaparece de la gráfica.
    expect(barras[2]).toMatchObject({ ingresos: 0, egresos: 0 });
  });
});

// ───────────────────────── Egresos por categoría ─────────────────────

describe('egresosPorCategoria', () => {
  it('agrupa, ordena de mayor a menor y calcula la fracción', () => {
    const r = egresosPorCategoria(
      [
        mov({ tipo: 'Egreso', monto: 100_000, categoria: 'Transporte', fecha: '2026-08-01' }),
        mov({ tipo: 'Egreso', monto: 50_000, categoria: 'Transporte', fecha: '2026-09-01' }),
        mov({ tipo: 'Egreso', monto: 200_000, categoria: 'Alimentación', fecha: '2026-08-05' }),
      ],
      ANIO,
    );

    expect(r.map((x) => x.categoria)).toEqual(['Alimentación', 'Transporte']);
    expect(r[0]?.monto).toBe(200_000);
    expect(r[1]?.monto).toBe(150_000);
    expect(r[0]?.fraccion).toBeCloseTo(200_000 / 350_000);
  });

  it('agrupa los que no tienen categoría en vez de perderlos', () => {
    const r = egresosPorCategoria([mov({ tipo: 'Egreso', categoria: null })], ANIO);
    expect(r[0]?.categoria).toBe('Sin categoría');
  });

  it('excluye lo que cae fuera del año rotario', () => {
    // Junio de 2026 pertenece al año rotario anterior.
    expect(
      egresosPorCategoria([mov({ tipo: 'Egreso', fecha: '2026-06-30' })], ANIO),
    ).toHaveLength(0);
  });

  it('no incluye ingresos ni rechazados', () => {
    const r = egresosPorCategoria(
      [
        mov({ tipo: 'Ingreso', monto: 999_999, categoria: 'Donación en dinero' }),
        mov({ tipo: 'Egreso', monto: 999_999, categoria: 'Transporte', estadoAprobacion: 'Rechazado' }),
      ],
      ANIO,
    );
    expect(r).toHaveLength(0);
  });
});

// ───────────────────────── Últimos movimientos ───────────────────────

describe('ultimosMovimientos', () => {
  it('ordena del más reciente al más viejo y respeta el tope', () => {
    const r = ultimosMovimientos(
      [
        mov({ concepto: 'viejo', fecha: '2026-07-01' }),
        mov({ concepto: 'nuevo', fecha: '2026-08-20' }),
        mov({ concepto: 'medio', fecha: '2026-08-01' }),
      ],
      2,
    );
    expect(r.map((m) => m.concepto)).toEqual(['nuevo', 'medio']);
  });

  it('manda al final los que no tienen fecha', () => {
    const r = ultimosMovimientos([
      mov({ concepto: 'sin fecha', fecha: null }),
      mov({ concepto: 'con fecha', fecha: '2026-08-20' }),
    ]);
    expect(r.map((m) => m.concepto)).toEqual(['con fecha', 'sin fecha']);
  });
});

// ──────────────────────────── Cuotas ─────────────────────────────────

describe('porcentajeAlDia', () => {
  it('cuenta Pagado y Exonerado como al día, Parcial y Pendiente no', () => {
    const p = periodo();
    const [a, b, c, d] = [miembro(), miembro(), miembro(), miembro()];
    const r = porcentajeAlDia(
      [a, b, c, d],
      [
        cuota({ miembroId: a.id, periodoId: p.id, estado: 'Pagado' }),
        cuota({ miembroId: b.id, periodoId: p.id, estado: 'Exonerado' }),
        cuota({ miembroId: c.id, periodoId: p.id, estado: 'Parcial' }),
        cuota({ miembroId: d.id, periodoId: p.id, estado: 'Pendiente' }),
      ],
      p.id,
    );

    expect(r.alDia).toBe(2);
    expect(r.conRegistro).toBe(4);
    expect(r.fraccion).toBe(0.5);
  });

  it('no cuenta a los miembros retirados ni inactivos', () => {
    // Alguien que se retiró del club no es un moroso.
    const p = periodo();
    const activo = miembro({ estado: 'Activo' });
    const retirado = miembro({ estado: 'Retirado' });

    const r = porcentajeAlDia(
      [activo, retirado],
      [
        cuota({ miembroId: activo.id, periodoId: p.id, estado: 'Pagado' }),
        cuota({ miembroId: retirado.id, periodoId: p.id, estado: 'Pendiente' }),
      ],
      p.id,
    );

    expect(r.conRegistro).toBe(1);
    expect(r.fraccion).toBe(1);
  });

  it('sin ningún registro devuelve null, no cero', () => {
    // Cero de cero no es 0 %: es "sin datos". Un dashboard financiero tiene
    // que distinguir "nadie ha pagado" de "todavía no se generaron cuotas".
    const r = porcentajeAlDia([miembro(), miembro()], [], 'perX');
    expect(r.fraccion).toBeNull();
    expect(r.sinRegistro).toBe(2);
  });

  it('reporta cuántos activos no tienen registro', () => {
    const p = periodo();
    const a = miembro();
    const r = porcentajeAlDia([a, miembro(), miembro()], [
      cuota({ miembroId: a.id, periodoId: p.id, estado: 'Pagado' }),
    ], p.id);

    expect(r.conRegistro).toBe(1);
    expect(r.sinRegistro).toBe(2);
  });
});

describe('matrizCuotas', () => {
  const jul = periodo({ fechaInicio: '2026-07-01', nombre: 'Julio 2026' });
  const ago = periodo({ fechaInicio: '2026-08-01', nombre: 'Agosto 2026' });
  const dic = periodo({ fechaInicio: '2026-12-01', nombre: 'Diciembre 2026' });

  it('arma doce columnas empezando en julio', () => {
    const m = matrizCuotas([miembro()], [jul, ago], [], ANIO, HOY);

    expect(m.meses).toHaveLength(12);
    expect(m.meses[0]).toMatchObject({ anio: 2026, mes: 7, periodoId: jul.id });
    expect(m.meses[1]).toMatchObject({ anio: 2026, mes: 8, periodoId: ago.id });
    expect(m.meses[11]).toMatchObject({ anio: 2027, mes: 6, periodoId: null });
  });

  it('deja la celda vacía cuando no existe el registro', () => {
    const a = miembro();
    const m = matrizCuotas([a], [jul, ago], [
      cuota({ miembroId: a.id, periodoId: jul.id, estado: 'Pagado' }),
    ], ANIO, HOY);

    expect(m.filas[0]?.celdas[0]).toMatchObject({ estado: 'Pagado' });
    expect(m.filas[0]?.celdas[1]).toBeNull();
  });

  it('cuenta como mora las cuotas Pendiente y Parcial ya vencidas', () => {
    const a = miembro();
    const m = matrizCuotas([a], [jul, ago], [
      cuota({ miembroId: a.id, periodoId: jul.id, estado: 'Pendiente' }),
      cuota({ miembroId: a.id, periodoId: ago.id, estado: 'Parcial' }),
    ], ANIO, HOY);

    expect(m.filas[0]?.mesesEnMora).toBe(2);
  });

  it('no cuenta como mora los meses que aún no llegan', () => {
    // Diciembre todavía no vence en agosto: tener la cuota en Pendiente es
    // lo normal, no una deuda.
    const a = miembro();
    const m = matrizCuotas([a], [dic], [
      cuota({ miembroId: a.id, periodoId: dic.id, estado: 'Pendiente' }),
    ], ANIO, HOY);

    expect(m.filas[0]?.mesesEnMora).toBe(0);
  });

  it('no acusa de deber por una celda vacía', () => {
    // No hay forma de distinguir "el tesorero no generó el registro" de
    // "no pagó". Acusar por un hueco de datos es peor que no contarlo.
    const m = matrizCuotas([miembro()], [jul, ago], [], ANIO, HOY);

    expect(m.filas[0]?.mesesEnMora).toBe(0);
    expect(m.filas[0]?.celdas.every((c) => c === null)).toBe(true);
  });

  it('un miembro sin ninguna cuota da doce celdas vacías', () => {
    const m = matrizCuotas([miembro()], [jul, ago, dic], [], ANIO, HOY);
    expect(m.filas[0]?.celdas).toHaveLength(12);
  });

  it('expone el tooltip completo de cada celda', () => {
    const a = miembro();
    const m = matrizCuotas([a], [jul], [
      cuota({
        miembroId: a.id,
        periodoId: jul.id,
        estado: 'Parcial',
        montoEsperado: 20_000,
        montoPagado: 8_000,
        fechaPago: '2026-07-09',
      }),
    ], ANIO, HOY);

    expect(m.filas[0]?.celdas[0]).toEqual({
      estado: 'Parcial',
      montoEsperado: 20_000,
      montoPagado: 8_000,
      fechaPago: '2026-07-09',
    });
  });
});

// ─────────────────────────── Proyectos ───────────────────────────────

describe('ejecucionProyecto', () => {
  it('suma solo los egresos de ese proyecto', () => {
    const p = proyecto({ presupuestoAprobado: 1_000_000 });
    const otro = proyecto();
    const r = ejecucionProyecto(p, [
      mov({ tipo: 'Egreso', monto: 300_000, proyectoIds: [p.id] }),
      mov({ tipo: 'Egreso', monto: 999_999, proyectoIds: [otro.id] }),
      mov({ tipo: 'Ingreso', monto: 999_999, proyectoIds: [p.id] }),
    ], []);

    expect(r.gastado).toBe(300_000);
    expect(r.saldo).toBe(700_000);
    expect(r.fraccion).toBeCloseTo(0.3);
    expect(r.semaforo).toBe('ok');
  });

  it('no divide por cero cuando no hay presupuesto', () => {
    const p = proyecto({ presupuestoAprobado: null });
    const r = ejecucionProyecto(p, [mov({ tipo: 'Egreso', monto: 50_000, proyectoIds: [p.id] })], []);

    expect(r.gastado).toBe(50_000);
    expect(r.fraccion).toBeNull();
    expect(r.saldo).toBeNull();
    expect(r.semaforo).toBeNull();
  });

  it('tampoco divide por cero con presupuesto en cero', () => {
    const p = proyecto({ presupuestoAprobado: 0 });
    const r = ejecucionProyecto(p, [mov({ tipo: 'Egreso', monto: 10_000, proyectoIds: [p.id] })], []);

    expect(r.fraccion).toBeNull();
    expect(r.semaforo).toBeNull();
    expect(Number.isFinite(r.saldo ?? 0)).toBe(true);
  });

  it('respeta los cortes del semáforo', () => {
    const casos: [number, string][] = [
      [890_000, 'ok'],
      [900_000, 'alerta'],
      [1_000_000, 'alerta'],
      [1_000_001, 'riesgo'],
    ];

    for (const [gasto, esperado] of casos) {
      const p = proyecto({ presupuestoAprobado: 1_000_000 });
      const r = ejecucionProyecto(p, [mov({ tipo: 'Egreso', monto: gasto, proyectoIds: [p.id] })], []);
      expect(r.semaforo, `gasto de ${gasto}`).toBe(esperado);
    }
  });

  it('reporta las donaciones sin mezclarlas con el gasto ni con el saldo', () => {
    // Regla 2: una donación en dinero ya está contada como movimiento.
    // Sumarla otra vez inflaría el proyecto.
    const p = proyecto({ presupuestoAprobado: 1_000_000 });
    const r = ejecucionProyecto(
      p,
      [mov({ tipo: 'Egreso', monto: 200_000, proyectoIds: [p.id] })],
      [donacion({ monto: 500_000, proyectoIds: [p.id] })],
    );

    expect(r.donacionesRecibidas).toBe(500_000);
    expect(r.gastado).toBe(200_000);
    expect(r.saldo).toBe(800_000);
  });

  it('no cuenta donaciones apenas comprometidas', () => {
    const p = proyecto();
    const r = ejecucionProyecto(p, [], [
      donacion({ monto: 500_000, estado: 'Comprometida', proyectoIds: [p.id] }),
    ]);
    expect(r.donacionesRecibidas).toBe(0);
  });
});

// ──────────────────────────── Eventos ────────────────────────────────

describe('resultadoEvento', () => {
  it('calcula el neto como recaudado menos costos', () => {
    const e = evento({ metaRecaudacion: 500_000 });
    const r = resultadoEvento(e, [
      mov({ tipo: 'Ingreso', monto: 400_000, eventoIds: [e.id] }),
      mov({ tipo: 'Egreso', monto: 150_000, eventoIds: [e.id] }),
    ], []);

    expect(r.recaudado).toBe(400_000);
    expect(r.costos).toBe(150_000);
    expect(r.neto).toBe(250_000);
    expect(r.fraccionMeta).toBeCloseTo(0.8);
  });

  it('deja el neto negativo cuando el evento costó más de lo que recaudó', () => {
    // El dato que el brief llama "el que más importa y casi nadie calcula".
    const e = evento();
    const r = resultadoEvento(e, [
      mov({ tipo: 'Ingreso', monto: 100_000, eventoIds: [e.id] }),
      mov({ tipo: 'Egreso', monto: 250_000, eventoIds: [e.id] }),
    ], []);

    expect(r.neto).toBe(-150_000);
  });

  it('no cuenta dos veces una donación en dinero', () => {
    // Regla 2: la donación en dinero ya entró como movimiento de Ingreso.
    // Si se sumara también desde DONACIONES, lo recaudado se duplicaría.
    const e = evento();
    const r = resultadoEvento(
      e,
      [mov({ tipo: 'Ingreso', monto: 300_000, eventoIds: [e.id] })],
      [donacion({ monto: 300_000, tipoAporte: 'Dinero', eventoIds: [e.id] })],
    );

    expect(r.recaudado).toBe(300_000);
    expect(r.neto).toBe(300_000);
  });

  it('reporta los aportes en especie aparte, fuera del neto', () => {
    const e = evento();
    const r = resultadoEvento(
      e,
      [mov({ tipo: 'Ingreso', monto: 100_000, eventoIds: [e.id] })],
      [donacion({ monto: 80_000, tipoAporte: 'Especie', eventoIds: [e.id] })],
    );

    expect(r.aportesEnEspecie).toBe(80_000);
    expect(r.recaudado).toBe(100_000);
    expect(r.neto).toBe(100_000);
  });

  it('no divide por cero cuando el evento no tiene meta', () => {
    const e = evento({ metaRecaudacion: null });
    const r = resultadoEvento(e, [mov({ tipo: 'Ingreso', monto: 100_000, eventoIds: [e.id] })], []);
    expect(r.fraccionMeta).toBeNull();
  });

  it('un evento sin movimientos da ceros, no NaN', () => {
    const r = resultadoEvento(evento(), [], []);
    expect(r).toMatchObject({ recaudado: 0, costos: 0, neto: 0 });
  });
});

// ─────────────────────────── Donantes ────────────────────────────────

describe('rankingDonantes', () => {
  it('ordena por total del año rotario en curso', () => {
    const a = donante({ nombre: 'Panadería' });
    const b = donante({ nombre: 'Ferretería' });

    const r = rankingDonantes([a, b], [
      donacion({ donanteIds: [a.id], monto: 100_000, fechaRecepcion: '2026-08-01' }),
      donacion({ donanteIds: [b.id], monto: 300_000, fechaRecepcion: '2026-09-01' }),
    ], ANIO);

    expect(r.map((f) => f.donante.nombre)).toEqual(['Ferretería', 'Panadería']);
  });

  it('separa el total del año del histórico', () => {
    const a = donante();
    const r = rankingDonantes([a], [
      donacion({ donanteIds: [a.id], monto: 100_000, fechaRecepcion: '2026-08-01' }),
      donacion({ donanteIds: [a.id], monto: 900_000, fechaRecepcion: '2025-08-01' }),
    ], ANIO);

    expect(r[0]?.totalAnio).toBe(100_000);
    expect(r[0]?.totalHistorico).toBe(1_000_000);
    expect(r[0]?.numeroDonaciones).toBe(2);
  });

  it('una promesa no es plata: solo cuenta lo Recibido', () => {
    const a = donante();
    const r = rankingDonantes([a], [
      donacion({ donanteIds: [a.id], monto: 500_000, estado: 'Comprometida' }),
    ], ANIO);

    expect(r[0]?.totalHistorico).toBe(0);
    expect(r[0]?.numeroDonaciones).toBe(0);
  });

  it('toma la donación más reciente como la última', () => {
    const a = donante();
    const r = rankingDonantes([a], [
      donacion({ donanteIds: [a.id], fechaRecepcion: '2026-07-01' }),
      donacion({ donanteIds: [a.id], fechaRecepcion: '2026-08-20' }),
    ], ANIO);

    expect(r[0]?.ultimaDonacion).toBe('2026-08-20');
  });

  it('un donante sin donaciones aparece en ceros, no desaparece', () => {
    const r = rankingDonantes([donante()], [], ANIO);
    expect(r[0]).toMatchObject({ totalAnio: 0, totalHistorico: 0, ultimaDonacion: null });
  });
});

describe('donacionesComprometidas', () => {
  it('cuenta los días pendientes desde la fecha de compromiso', () => {
    const a = donante();
    const r = donacionesComprometidas([
      donacion({ donanteIds: [a.id], estado: 'Comprometida', fechaCompromiso: '2026-08-01' }),
    ], [a], HOY);

    expect(r[0]?.diasPendientes).toBe(28);
    expect(r[0]?.donante?.id).toBe(a.id);
  });

  it('ordena poniendo primero lo que lleva más tiempo esperando', () => {
    const r = donacionesComprometidas([
      donacion({ estado: 'Comprometida', fechaCompromiso: '2026-08-20' }),
      donacion({ estado: 'Comprometida', fechaCompromiso: '2026-07-01' }),
    ], [], HOY);

    expect(r[0]?.diasPendientes).toBe(59);
    expect(r[1]?.diasPendientes).toBe(9);
  });

  it('excluye las ya recibidas y las canceladas', () => {
    const r = donacionesComprometidas([
      donacion({ estado: 'Recibida' }),
      donacion({ estado: 'Cancelada' }),
    ], [], HOY);

    expect(r).toHaveLength(0);
  });

  it('sin fecha de compromiso no inventa un número de días', () => {
    const r = donacionesComprometidas([
      donacion({ estado: 'Comprometida', fechaCompromiso: null }),
    ], [], HOY);

    expect(r[0]?.diasPendientes).toBeNull();
  });
});

// ──────────────────────────── Alertas ────────────────────────────────

describe('alertas', () => {
  it('no reporta nada cuando todo está en orden', () => {
    expect(alertas(snapshot({ movimientos: [mov()] }))).toEqual([]);
  });

  it('señala los egresos sin soporte', () => {
    const a = alertas(
      snapshot({ movimientos: [mov({ tipo: 'Egreso', monto: 90_000, tieneSoporte: false })] }));

    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      tipo: 'egresos-sin-soporte',
      cantidad: 1,
      montoTotal: 90_000,
    });
  });

  it('no señala ingresos sin soporte, solo egresos', () => {
    expect(
      alertas(snapshot({ movimientos: [mov({ tipo: 'Ingreso', tieneSoporte: false })] })),
    ).toEqual([]);
  });

  it('señala los egresos pendientes de aprobación', () => {
    const a = alertas(
      snapshot({ movimientos: [mov({ tipo: 'Egreso', estadoAprobacion: 'Pendiente' })] }));

    expect(a.map((x) => x.tipo)).toContain('aprobacion-pendiente');
    expect(a.find((x) => x.tipo === 'aprobacion-pendiente')?.movimientos).toHaveLength(1);
  });

  it('señala los proyectos por encima del 90 % del presupuesto', () => {
    const p = proyecto({ presupuestoAprobado: 1_000_000 });
    const a = alertas(
      snapshot({
        proyectos: [p],
        movimientos: [mov({ tipo: 'Egreso', monto: 950_000, proyectoIds: [p.id] })],
      }));

    const alerta = a.find((x) => x.tipo === 'presupuesto-comprometido');
    expect(alerta?.cantidad).toBe(1);
    expect(alerta?.proyectos[0]?.semaforo).toBe('alerta');
  });

  it('no señala proyectos sin presupuesto aprobado', () => {
    const p = proyecto({ presupuestoAprobado: null });
    const a = alertas(
      snapshot({
        proyectos: [p],
        movimientos: [mov({ tipo: 'Egreso', monto: 950_000, proyectoIds: [p.id] })],
      }));

    expect(a.map((x) => x.tipo)).not.toContain('presupuesto-comprometido');
  });

  it('señala lo sin conciliar solo si el mes está cerrado', () => {
    const julCerrado = periodo({ fechaInicio: '2026-07-01', cerrado: true });
    const agoAbierto = periodo({ fechaInicio: '2026-08-01', cerrado: false });

    const a = alertas(
      snapshot({
        periodos: [julCerrado, agoAbierto],
        movimientos: [
          mov({ fecha: '2026-07-10', conciliado: false, monto: 40_000 }),
          mov({ fecha: '2026-08-10', conciliado: false, monto: 999_999 }),
        ],
      }));

    const alerta = a.find((x) => x.tipo === 'sin-conciliar');
    expect(alerta?.cantidad).toBe(1);
    expect(alerta?.montoTotal).toBe(40_000);
  });

  it('ignora los movimientos rechazados en todas las alertas', () => {
    const a = alertas(
      snapshot({
        movimientos: [
          mov({ tipo: 'Egreso', tieneSoporte: false, estadoAprobacion: 'Rechazado' }),
        ],
      }));

    expect(a).toEqual([]);
  });
});
