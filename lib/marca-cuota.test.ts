import { describe, expect, it } from 'vitest';
import { LEYENDA_CUOTAS, marcaDe } from './marca-cuota';
import { ESTADOS_CUOTA } from '@/types/domain';

describe('marcaDe', () => {
  it('da una marca a cada uno de los cuatro estados', () => {
    for (const estado of ESTADOS_CUOTA) {
      expect(marcaDe(estado).letra, estado).not.toBe('');
    }
  });

  it('las cuatro marcas son distintas entre sí', () => {
    // Si dos estados comparten letra, la matriz deja de ser legible en
    // escala de grises y quien no distingue colores no puede usarla.
    const letras = ESTADOS_CUOTA.map((e) => marcaDe(e).letra);
    expect(new Set(letras).size).toBe(ESTADOS_CUOTA.length);
  });

  it('no usa la inicial en los tres estados que empiezan con P', () => {
    expect(marcaDe('Pagado').letra).toBe('P');
    expect(marcaDe('Parcial').letra).not.toBe('P');
    expect(marcaDe('Pendiente').letra).not.toBe('P');
  });

  it('la ausencia de registro no tiene letra', () => {
    // Una celda vacía significa "no existe el registro", que es distinto
    // de "no pagó". Darle letra la convertiría en un estado que no es.
    expect(marcaDe(null).letra).toBe('');
    expect(marcaDe(undefined).letra).toBe('');
    expect(marcaDe(null).etiqueta).toBe('Sin registro');
  });

  it('cada estado tiene etiqueta para lectores de pantalla', () => {
    for (const estado of ESTADOS_CUOTA) {
      expect(marcaDe(estado).etiqueta.length, estado).toBeGreaterThan(3);
    }
  });

  it('las clases usan tokens semánticos, nunca primitivas', () => {
    // bg-tinta-100 se ve bien en claro y roto en oscuro.
    const prohibido = /\b(bg|text|border)-(tinta|interact|dorado)-\d{2,3}\b/;
    for (const estado of ESTADOS_CUOTA) {
      expect(marcaDe(estado).clases, estado).not.toMatch(prohibido);
    }
    expect(marcaDe(null).clases).not.toMatch(prohibido);
  });

  it('la leyenda cubre los cuatro estados', () => {
    expect(LEYENDA_CUOTAS).toHaveLength(ESTADOS_CUOTA.length);
  });
});
