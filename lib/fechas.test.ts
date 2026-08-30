import { describe, expect, it } from 'vitest';
import {
  anioRotarioDe,
  claveMes,
  compararFechas,
  dentroDelAnioRotario,
  diasEntre,
  formatearISO,
  hoyEnBogota,
  mesCorto,
  mesesDelAnioRotario,
  parseFecha,
  ultimosMeses,
} from './fechas';

describe('parseFecha', () => {
  it('lee el formato de Airtable', () => {
    expect(parseFecha('2026-07-15')).toEqual({ anio: 2026, mes: 7, dia: 15 });
  });

  it('acepta un timestamp ISO completo y se queda con la fecha', () => {
    expect(parseFecha('2026-07-15T22:30:00.000Z')).toEqual({ anio: 2026, mes: 7, dia: 15 });
  });

  it('devuelve null ante ausencia o basura', () => {
    expect(parseFecha(null)).toBeNull();
    expect(parseFecha(undefined)).toBeNull();
    expect(parseFecha('')).toBeNull();
    expect(parseFecha('15/07/2026')).toBeNull();
    expect(parseFecha('no es fecha')).toBeNull();
  });

  it('rechaza fechas que no existen aunque tengan formato válido', () => {
    expect(parseFecha('2026-02-31')).toBeNull();
    expect(parseFecha('2026-13-01')).toBeNull();
    expect(parseFecha('2026-00-10')).toBeNull();
  });

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(parseFecha('2028-02-29')).toEqual({ anio: 2028, mes: 2, dia: 29 });
    expect(parseFecha('2026-02-29')).toBeNull();
  });

  it('no corre la fecha un día por zona horaria', () => {
    // El bug clásico: new Date('2026-07-01') da medianoche UTC, que en
    // Colombia es el 30 de junio. Aquí el 1 de julio sigue siendo julio.
    const f = parseFecha('2026-07-01');
    expect(f?.mes).toBe(7);
    expect(f?.dia).toBe(1);
  });
});

describe('hoyEnBogota', () => {
  it('usa la zona de Bogotá, no la del servidor', () => {
    // 2026-09-01 03:00 UTC son las 22:00 del 31 de agosto en Bogotá.
    // Un servidor en UTC diría "septiembre" y los indicadores del mes en
    // curso mostrarían el mes equivocado cinco horas cada noche.
    const instante = new Date('2026-09-01T03:00:00.000Z');
    expect(hoyEnBogota(instante)).toEqual({ anio: 2026, mes: 8, dia: 31 });
  });

  it('coincide con UTC cuando la hora no cruza el día', () => {
    expect(hoyEnBogota(new Date('2026-08-29T15:00:00.000Z'))).toEqual({
      anio: 2026,
      mes: 8,
      dia: 29,
    });
  });
});

describe('anioRotarioDe', () => {
  it('julio arranca el año rotario', () => {
    expect(anioRotarioDe({ anio: 2026, mes: 7 }).etiqueta).toBe('2026-2027');
  });

  it('junio todavía pertenece al año anterior', () => {
    expect(anioRotarioDe({ anio: 2026, mes: 6 }).etiqueta).toBe('2025-2026');
  });

  it('agosto de 2026 cae en 2026-2027', () => {
    const a = anioRotarioDe({ anio: 2026, mes: 8 });
    expect(a.anioInicio).toBe(2026);
    expect(a.inicio).toEqual({ anio: 2026, mes: 7, dia: 1 });
    expect(a.fin).toEqual({ anio: 2027, mes: 6, dia: 30 });
  });
});

describe('mesesDelAnioRotario', () => {
  it('da doce meses arrancando en julio y cruzando el año', () => {
    const meses = mesesDelAnioRotario(anioRotarioDe({ anio: 2026, mes: 8 }));
    expect(meses).toHaveLength(12);
    expect(meses[0]).toMatchObject({ anio: 2026, mes: 7 });
    expect(meses[5]).toMatchObject({ anio: 2026, mes: 12 });
    expect(meses[6]).toMatchObject({ anio: 2027, mes: 1 });
    expect(meses[11]).toMatchObject({ anio: 2027, mes: 6 });
  });
});

describe('dentroDelAnioRotario', () => {
  const anio = anioRotarioDe({ anio: 2026, mes: 8 });

  it('incluye los dos extremos', () => {
    expect(dentroDelAnioRotario({ anio: 2026, mes: 7, dia: 1 }, anio)).toBe(true);
    expect(dentroDelAnioRotario({ anio: 2027, mes: 6, dia: 30 }, anio)).toBe(true);
  });

  it('excluye el día anterior y el siguiente', () => {
    expect(dentroDelAnioRotario({ anio: 2026, mes: 6, dia: 30 }, anio)).toBe(false);
    expect(dentroDelAnioRotario({ anio: 2027, mes: 7, dia: 1 }, anio)).toBe(false);
  });
});

describe('diasEntre', () => {
  it('cuenta días calendario', () => {
    expect(diasEntre({ anio: 2026, mes: 8, dia: 1 }, { anio: 2026, mes: 8, dia: 15 })).toBe(14);
  });

  it('cruza meses y años', () => {
    expect(diasEntre({ anio: 2026, mes: 12, dia: 25 }, { anio: 2027, mes: 1, dia: 5 })).toBe(11);
  });

  it('es negativo si la segunda fecha es anterior', () => {
    expect(diasEntre({ anio: 2026, mes: 8, dia: 15 }, { anio: 2026, mes: 8, dia: 1 })).toBe(-14);
  });

  it('cuenta bien a través de un 29 de febrero', () => {
    expect(diasEntre({ anio: 2028, mes: 2, dia: 28 }, { anio: 2028, mes: 3, dia: 1 })).toBe(2);
  });
});

describe('ultimosMeses', () => {
  it('devuelve n meses terminando en el pedido, cruzando el año', () => {
    expect(ultimosMeses({ anio: 2027, mes: 2 }, 6)).toEqual([
      { anio: 2026, mes: 9 },
      { anio: 2026, mes: 10 },
      { anio: 2026, mes: 11 },
      { anio: 2026, mes: 12 },
      { anio: 2027, mes: 1 },
      { anio: 2027, mes: 2 },
    ]);
  });
});

describe('utilidades varias', () => {
  it('claveMes ordena meses consecutivos', () => {
    expect(claveMes({ anio: 2026, mes: 12 }) + 1).toBe(claveMes({ anio: 2027, mes: 1 }));
  });

  it('compararFechas ordena', () => {
    expect(
      compararFechas({ anio: 2026, mes: 7, dia: 1 }, { anio: 2026, mes: 7, dia: 2 }),
    ).toBeLessThan(0);
    expect(compararFechas({ anio: 2026, mes: 7, dia: 1 }, { anio: 2026, mes: 7, dia: 1 })).toBe(0);
  });

  it('formatearISO rellena con ceros', () => {
    expect(formatearISO({ anio: 2026, mes: 7, dia: 5 })).toBe('2026-07-05');
  });

  it('mesCorto da tres letras capitalizadas', () => {
    expect(mesCorto(7)).toBe('Jul');
    expect(mesCorto(12)).toBe('Dic');
  });
});
