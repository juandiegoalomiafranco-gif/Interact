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
} from '@/types/domain';

/**
 * Datos de ejemplo, solo con DEMO=1.
 *
 * Existe por una razón práctica: sin token de Airtable no hay forma de mirar
 * cómo quedó una vista, y revisar un rediseño a ciegas termina en un panel
 * bonito que se rompe con datos reales.
 *
 * Va con dos candados, porque un tablero financiero con números inventados
 * que se lean como reales es peor que uno vacío:
 *
 *   1. `esDemo: true` viaja en el snapshot, y el layout pinta una franja fija
 *      que dice "Datos de ejemplo" y no se puede cerrar.
 *   2. `snapshotDemo()` lanza si NODE_ENV es production sin DEMO explícito.
 *
 * Todo es determinista: el mismo generador con la misma semilla da siempre
 * las mismas cifras, así una captura de hoy se puede comparar con una de
 * mañana y la diferencia es el diseño, no el azar.
 */

/** mulberry32: pequeño, determinista y suficiente para datos de ejemplo. */
function generador(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AZAR = () => generador(20262027);

function entre(r: () => number, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

function unoDe<T>(r: () => number, lista: readonly T[]): T {
  return lista[Math.floor(r() * lista.length)]!;
}

/** Redondea a miles: nadie registra un gasto de $127.433. */
const miles = (n: number) => Math.round(n / 1000) * 1000;

const iso = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

// ─────────────────────────── Año rotario ───────────────────────────

/** Julio a junio. El panel entero gira alrededor de este calendario. */
const MESES: { anio: number; mes: number }[] = Array.from({ length: 12 }, (_, i) => {
  const m = 7 + i;
  return m <= 12 ? { anio: 2026, mes: m } : { anio: 2027, mes: m - 12 };
});

/** El "hoy" del ejemplo: septiembre, con dos meses y medio de historia. */
const MES_ACTUAL = 2; // índice 0-based dentro de MESES: 0=julio, 2=septiembre 2026

// ──────────────────────────── Catálogos ────────────────────────────

const NOMBRES = [
  'Valentina Ospina',
  'Samuel Restrepo',
  'Mariana Cardona',
  'Tomás Betancur',
  'Isabella Gómez',
  'Emilio Zapata',
  'Salomé Arango',
  'Martín Quintero',
  'Antonia Vélez',
  'Jerónimo Mesa',
  'Luciana Higuita',
  'Simón Álvarez',
  'Gabriela Muñoz',
  'Daniel Estrada',
  'Sara Pineda',
];

const ROLES = [
  'Presidente',
  'Vicepresidente',
  'Secretario',
  'Tesorero',
  'Comité de finanzas',
  'Director de proyectos',
  'Miembro',
  'Miembro',
  'Miembro',
  'Estudiante',
];

const CATEGORIAS_EGRESO = [
  'Proyectos',
  'Eventos',
  'Papelería',
  'Transporte',
  'Refrigerios',
  'Bancos',
  'Otros',
];

// ─────────────────────────── Construcción ───────────────────────────

function miembros(): Miembro[] {
  return NOMBRES.map((nombre, i) => ({
    id: `demoMiembro${i}`,
    nombre,
    rol: i < ROLES.length ? ROLES[i]! : 'Miembro',
    // Dos inactivos y un retirado: el cumplimiento solo cuenta activos, y sin
    // esta mezcla ese matiz no se ve en la pantalla.
    estado: i === 12 ? 'Inactivo' : i === 13 ? 'Retirado' : 'Activo',
    fechaIngreso: iso(2024 + (i % 3), 1 + (i % 12), 1 + (i % 27)),
  }));
}

function periodos(): Periodo[] {
  return MESES.map(({ anio, mes }, i) => ({
    id: `demoPeriodo${i}`,
    nombre: `${nombreMes(mes)} ${anio}`,
    fechaInicio: iso(anio, mes, 1),
    fechaLimitePago: iso(anio, mes, 15),
    anioRotario: '2026-2027',
    cerrado: i < MES_ACTUAL - 1,
  }));
}

function nombreMes(mes: number): string {
  return [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ][mes - 1]!;
}

const CUOTA_MENSUAL = 25_000;

function cuotas(r: () => number, gente: Miembro[], meses: Periodo[]): Cuota[] {
  const salida: Cuota[] = [];

  for (const [iMes, periodo] of meses.entries()) {
    // Solo se generan registros de los meses ya transcurridos: una cuota de
    // diciembre existiendo en septiembre sería un dato falso.
    if (iMes > MES_ACTUAL) break;

    for (const [iM, miembro] of gente.entries()) {
      if (miembro.estado === 'Retirado') continue;

      // Un hueco de datos a propósito: el tesorero no alcanzó a generar
      // algunos registros del mes en curso, y la matriz debe mostrar celda
      // vacía, no "debe".
      if (iMes === MES_ACTUAL && iM % 5 === 0) continue;

      const dado = r();
      const estado: EstadoCuota =
        iM === 7 ? 'Exonerado' : dado < 0.7 ? 'Pagado' : dado < 0.85 ? 'Parcial' : 'Pendiente';

      const pagado =
        estado === 'Pagado'
          ? CUOTA_MENSUAL
          : estado === 'Parcial'
            ? miles(CUOTA_MENSUAL * (0.3 + r() * 0.4))
            : null;

      salida.push({
        id: `demoCuota${iMes}-${iM}`,
        miembroId: miembro.id,
        periodoId: periodo.id,
        montoEsperado: estado === 'Exonerado' ? null : CUOTA_MENSUAL,
        montoPagado: pagado,
        estado,
        fechaPago: pagado !== null ? periodo.fechaInicio : null,
        tieneSoporte: pagado !== null && r() < 0.6,
      });
    }
  }

  return salida;
}

const PROYECTOS_DEMO: { nombre: string; area: string; estado: string; presupuesto: number | null }[] =
  [
    { nombre: 'Biblioteca comunitaria', area: 'Educación', estado: 'En curso', presupuesto: 4_800_000 },
    { nombre: 'Jornada de salud visual', area: 'Prevención de enfermedades', estado: 'En curso', presupuesto: 3_200_000 },
    // Presupuestos ajustados a propósito para que el semáforo muestre sus
    // tres estados: verde, amarillo por encima del 90 %, y rojo pasado el
    // 100 %. Un ejemplo donde todo sale verde no prueba nada.
    { nombre: 'Huerta escolar', area: 'Medio ambiente', estado: 'En curso', presupuesto: 520_000 },
    { nombre: 'Alfabetización digital', area: 'Transformación digital', estado: 'Planeación', presupuesto: 2_600_000 },
    { nombre: 'Agua limpia vereda El Roble', area: 'Agua y saneamiento', estado: 'En curso', presupuesto: 6_000_000 },
    { nombre: 'Ropero solidario', area: 'Desarrollo económico', estado: 'Cerrado', presupuesto: 420_000 },
    // Sin presupuesto aprobado: el semáforo debe quedar en null, no en verde.
    { nombre: 'Mentoría entre pares', area: 'Educación', estado: 'Planeación', presupuesto: null },
  ];

function proyectos(gente: Miembro[]): Proyecto[] {
  return PROYECTOS_DEMO.map((p, i) => ({
    id: `demoProyecto${i}`,
    nombre: p.nombre,
    estado: p.estado,
    areaDeEnfoque: p.area,
    liderIds: [gente[i % gente.length]!.id],
    presupuestoAprobado: p.presupuesto,
    fechaInicio: iso(2026, 7 + (i % 3), 5),
    fechaCierre: p.estado === 'Cerrado' ? iso(2026, 8, 30) : null,
  }));
}

const EVENTOS_DEMO: { nombre: string; mes: number; anio: number; meta: number | null; estado: string }[] =
  [
    { nombre: 'Bingo de bienvenida', anio: 2026, mes: 7, meta: 1_800_000, estado: 'Completado' },
    { nombre: 'Bazar de agosto', anio: 2026, mes: 8, meta: 2_500_000, estado: 'Completado' },
    { nombre: 'Rifa del asado', anio: 2026, mes: 8, meta: 1_200_000, estado: 'Completado' },
    { nombre: 'Cine al parque', anio: 2026, mes: 9, meta: 800_000, estado: 'En progreso' },
    { nombre: 'Carrera 5K Interact', anio: 2026, mes: 10, meta: 4_000_000, estado: 'Planeado' },
    { nombre: 'Cena de gala', anio: 2026, mes: 11, meta: 6_500_000, estado: 'Planeado' },
  ];

function eventos(lista: Proyecto[]): Evento[] {
  return EVENTOS_DEMO.map((e, i) => ({
    id: `demoEvento${i}`,
    nombre: e.nombre,
    fecha: iso(e.anio, e.mes, 8 + i),
    proyectoIds: [lista[i % lista.length]!.id],
    metaRecaudacion: e.meta,
    estado: e.estado,
  }));
}

function movimientos(r: () => number, lista: Proyecto[], agenda: Evento[]): Movimiento[] {
  const salida: Movimiento[] = [];
  let n = 0;

  const agregar = (m: Omit<Movimiento, 'id'>) => {
    salida.push({ ...m, id: `demoMov${n++}` });
  };

  for (const [iMes, { anio, mes }] of MESES.entries()) {
    if (iMes > MES_ACTUAL) break;

    // Ingresos por cuotas del mes.
    agregar({
      concepto: `Recaudo de cuotas · ${nombreMes(mes)}`,
      fecha: iso(anio, mes, 16),
      tipo: 'Ingreso',
      monto: miles(CUOTA_MENSUAL * entre(r, 9, 13)),
      categoria: 'Cuotas',
      estadoAprobacion: 'Aprobado',
      conciliado: true,
      tieneSoporte: true,
      proyectoIds: [],
      eventoIds: [],
    });

    // Lo recaudado en los eventos de ese mes.
    for (const evento of agenda) {
      if (!evento.fecha?.startsWith(`${anio}-${String(mes).padStart(2, '0')}`)) continue;
      if (evento.estado === 'Planeado') continue;

      agregar({
        concepto: `Recaudación · ${evento.nombre}`,
        fecha: evento.fecha,
        tipo: 'Ingreso',
        monto: miles((evento.metaRecaudacion ?? 1_000_000) * (0.6 + r() * 0.7)),
        categoria: 'Recaudación',
        estadoAprobacion: 'Aprobado',
        conciliado: r() < 0.8,
        tieneSoporte: true,
        proyectoIds: evento.proyectoIds,
        eventoIds: [evento.id],
      });

      agregar({
        concepto: `Logística · ${evento.nombre}`,
        fecha: evento.fecha,
        tipo: 'Egreso',
        monto: miles((evento.metaRecaudacion ?? 1_000_000) * (0.15 + r() * 0.2)),
        categoria: 'Eventos',
        estadoAprobacion: 'Aprobado',
        conciliado: true,
        tieneSoporte: r() < 0.7,
        proyectoIds: evento.proyectoIds,
        eventoIds: [evento.id],
      });
    }

    // Gastos corrientes del mes. Montos de club escolar, no de fundación:
    // con cifras infladas el saldo daría negativo y la pantalla mentiría
    // sobre cómo se ve un club que va bien.
    for (let i = 0; i < entre(r, 2, 4); i += 1) {
      const proyecto = unoDe(r, lista);
      agregar({
        concepto: unoDe(r, [
          'Compra de materiales',
          'Transporte de voluntarios',
          'Refrigerios de la jornada',
          'Impresión de volantes',
          'Comisión bancaria',
          'Alquiler de sonido',
        ]),
        fecha: iso(anio, mes, entre(r, 2, 27)),
        tipo: 'Egreso',
        monto: miles(entre(r, 40, 260) * 1000),
        categoria: unoDe(r, CATEGORIAS_EGRESO),
        // Uno de cada diez queda rechazado: la Regla 1 de metrics.ts dice que
        // no movió plata, y sin ejemplos ese caso nunca se prueba en pantalla.
        estadoAprobacion: r() < 0.1 ? 'Rechazado' : r() < 0.15 ? 'Pendiente' : 'Aprobado',
        conciliado: r() < 0.75,
        tieneSoporte: r() < 0.6,
        proyectoIds: r() < 0.6 ? [proyecto.id] : [],
        eventoIds: [],
      });
    }
  }

  // Una donación en dinero YA es un ingreso: se registra aquí, no se suma
  // aparte. Es la Regla 2 de lib/metrics.ts.
  agregar({
    concepto: 'Donación · Ferretería La Esquina',
    fecha: iso(2026, 8, 20),
    tipo: 'Ingreso',
    monto: 2_000_000,
    categoria: 'Donaciones',
    estadoAprobacion: 'Aprobado',
    conciliado: true,
    tieneSoporte: true,
    proyectoIds: [lista[0]!.id],
    eventoIds: [],
  });

  return salida;
}

const DONANTES_DEMO: { nombre: string; tipo: string }[] = [
  { nombre: 'Ferretería La Esquina', tipo: 'Empresa' },
  { nombre: 'Familia Restrepo Mesa', tipo: 'Persona' },
  { nombre: 'Colegio San Ignacio', tipo: 'Institución' },
  { nombre: 'Rotary Club Padrino', tipo: 'Aliado' },
  { nombre: 'Panadería El Trigal', tipo: 'Empresa' },
  { nombre: 'Droguería Vida', tipo: 'Empresa' },
];

function donantes(): Donante[] {
  return DONANTES_DEMO.map((d, i) => ({ id: `demoDonante${i}`, nombre: d.nombre, tipo: d.tipo }));
}

function donaciones(r: () => number, gente: Donante[], lista: Proyecto[]): Donacion[] {
  return [
    { i: 0, monto: 2_000_000, estado: 'Recibida', aporte: 'Dinero', comp: iso(2026, 8, 5), rec: iso(2026, 8, 20) },
    { i: 1, monto: 500_000, estado: 'Recibida', aporte: 'Dinero', comp: iso(2026, 7, 12), rec: iso(2026, 7, 25) },
    { i: 2, monto: 1_200_000, estado: 'Comprometida', aporte: 'Dinero', comp: iso(2026, 7, 30), rec: null },
    { i: 3, monto: 3_000_000, estado: 'Comprometida', aporte: 'Dinero', comp: iso(2026, 8, 18), rec: null },
    { i: 4, monto: 350_000, estado: 'Recibida', aporte: 'Especie', comp: iso(2026, 8, 2), rec: iso(2026, 8, 9) },
    { i: 5, monto: 800_000, estado: 'Recibida', aporte: 'Especie', comp: iso(2026, 9, 1), rec: iso(2026, 9, 3) },
    { i: 2, monto: 450_000, estado: 'Cancelada', aporte: 'Servicio', comp: iso(2026, 7, 8), rec: null },
  ].map((d, n) => ({
    id: `demoDonacion${n}`,
    donanteIds: [gente[d.i]!.id],
    monto: d.monto,
    estado: d.estado as Donacion['estado'],
    tipoAporte: d.aporte as Donacion['tipoAporte'],
    fechaCompromiso: d.comp,
    fechaRecepcion: d.rec,
    proyectoIds: r() < 0.6 ? [lista[n % lista.length]!.id] : [],
    eventoIds: [],
  }));
}

// ─────────────────────────────── Salida ───────────────────────────────

export function snapshotDemo(): Snapshot {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO !== '1') {
    throw new Error('Los datos de ejemplo no se sirven en producción.');
  }

  const r = AZAR();
  const gente = miembros();
  const meses = periodos();
  const lista = proyectos(gente);
  const agenda = eventos(lista);
  const aportantes = donantes();

  return {
    miembros: gente,
    periodos: meses,
    cuotas: cuotas(r, gente, meses),
    proyectos: lista,
    eventos: agenda,
    movimientos: movimientos(r, lista, agenda),
    donantes: aportantes,
    donaciones: donaciones(r, aportantes, lista),
    obtenidoEn: new Date().toISOString(),
    faltantes: [],
    esDemo: true,
  };
}
