import { describe, expect, it } from 'vitest';
import { formatCOP, formatCOPAbreviado, formatFecha, formatPorcentaje } from './format';

/**
 * Intl usa espacios duros (y a veces estrechos) entre el símbolo y el número,
 * y el carácter exacto cambia entre versiones de ICU. Normalizarlo mantiene
 * los tests estables sin aflojar lo que de verdad importa: los separadores de
 * miles, los decimales y el signo.
 */
const norm = (s: string) => s.replace(/[   ]/g, ' ');

describe('formatCOP', () => {
  it('usa punto como separador de miles y no muestra centavos', () => {
    expect(norm(formatCOP(1_200_000))).toBe('$ 1.200.000');
    expect(norm(formatCOP(850_000))).toBe('$ 850.000');
  });

  it('redondea los centavos en vez de mostrarlos', () => {
    expect(norm(formatCOP(1500.7))).toBe('$ 1.501');
  });

  it('muestra los negativos con el signo delante', () => {
    expect(norm(formatCOP(-450_000))).toBe('-$ 450.000');
  });

  it('distingue un cero real de un dato ausente', () => {
    expect(norm(formatCOP(0))).toBe('$ 0');
    expect(formatCOP(null)).toBe('—');
    expect(formatCOP(undefined)).toBe('—');
    expect(formatCOP(Number.NaN)).toBe('—');
  });
});

describe('formatCOPAbreviado', () => {
  it('abrevia a millones con un decimal', () => {
    expect(norm(formatCOPAbreviado(1_200_000))).toBe('$ 1,2 M');
  });

  it('no deja un ",0" colgando en los millones exactos', () => {
    expect(norm(formatCOPAbreviado(3_000_000))).toBe('$ 3 M');
  });

  it('por debajo del millón muestra el valor completo', () => {
    expect(norm(formatCOPAbreviado(850_000))).toBe('$ 850.000');
  });

  it('sigue creciendo en millones en vez de saltar a "billones"', () => {
    // En español un billón es un millón de millones. Confundirlo con el
    // billion inglés en un tablero de plata sale caro.
    expect(norm(formatCOPAbreviado(1_200_000_000))).toBe('$ 1.200 M');
  });

  it('abrevia también los negativos', () => {
    expect(norm(formatCOPAbreviado(-2_500_000))).toBe('-$ 2,5 M');
  });

  it('un dato ausente no se convierte en cero', () => {
    expect(formatCOPAbreviado(null)).toBe('—');
  });
});

describe('formatFecha', () => {
  it('usa día/mes/año', () => {
    expect(formatFecha('2026-07-15')).toBe('15/7/2026');
  });

  it('no corre la fecha un día por zona horaria', () => {
    expect(formatFecha('2026-07-01')).toBe('1/7/2026');
    expect(formatFecha('2026-01-01')).toBe('1/1/2026');
  });

  it('acepta la fecha ya parseada', () => {
    expect(formatFecha({ anio: 2026, mes: 12, dia: 31 })).toBe('31/12/2026');
  });

  it('muestra guion cuando no hay fecha', () => {
    expect(formatFecha(null)).toBe('—');
    expect(formatFecha('vacío')).toBe('—');
  });
});

describe('formatPorcentaje', () => {
  it('recibe la fracción, no el entero', () => {
    expect(norm(formatPorcentaje(0.85))).toBe('85%');
    expect(norm(formatPorcentaje(1))).toBe('100%');
    expect(norm(formatPorcentaje(0))).toBe('0%');
  });

  it('distingue el cero real del dato ausente', () => {
    expect(formatPorcentaje(null)).toBe('—');
  });
});
