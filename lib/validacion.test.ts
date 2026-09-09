import { describe, expect, it } from 'vitest';
import {
  Recolector,
  fecha,
  fechaOpcional,
  idRegistro,
  monto,
  montoOpcional,
  opcion,
  textoOpcional,
  textoRequerido,
} from './validacion';

const valor = <T>(r: { ok: boolean; valor?: T }) => (r.ok ? r.valor : undefined);
const error = (r: { ok: boolean; error?: string }) => (r.ok ? undefined : r.error);

describe('monto', () => {
  it('acepta el punto de miles colombiano', () => {
    // parseFloat('25.000') daría 25 —veinticinco pesos— y ese error entraría
    // al libro contable sin que nadie lo notara. Es el caso que más importa.
    expect(valor(monto('25.000'))).toBe(25000);
    expect(valor(monto('1.200.000'))).toBe(1200000);
    expect(valor(monto('$ 25.000'))).toBe(25000);
    expect(valor(monto('25000'))).toBe(25000);
  });

  it('la coma es decimal, no de miles', () => {
    expect(valor(monto('25000,50'))).toBe(25001);
  });

  it('rechaza cero y negativos', () => {
    expect(error(monto('0'))).toMatch(/mayor que cero/);
    expect(error(monto('-5000'))).toMatch(/mayor que cero/);
  });

  it('rechaza lo que no es número', () => {
    expect(error(monto('mucha plata'))).toMatch(/número/);
  });

  it('rechaza un vacío, pero montoOpcional lo deja pasar como null', () => {
    expect(error(monto(''))).toMatch(/obligatorio/);
    expect(valor(montoOpcional(''))).toBeNull();
  });

  it('atrapa el dedo de más', () => {
    expect(error(monto('9000000000'))).toMatch(/demasiado grande/);
  });
});

describe('fecha', () => {
  it('acepta el formato del input date', () => {
    expect(valor(fecha('2026-09-09'))).toBe('2026-09-09');
  });

  it('rechaza un día que no existe', () => {
    // Pasa el regex y no es un día. Sin esta comprobación, Airtable lo
    // reinterpreta como 3 de marzo y el asiento queda con otra fecha.
    expect(error(fecha('2026-02-31'))).toMatch(/no existe/);
    expect(error(fecha('2026-13-01'))).toMatch(/no existe|AAAA/);
  });

  it('rechaza otros formatos', () => {
    expect(error(fecha('09/09/2026'))).toMatch(/AAAA-MM-DD/);
  });

  it('vacía es error, salvo con fechaOpcional', () => {
    expect(error(fecha(''))).toMatch(/obligatoria/);
    expect(valor(fechaOpcional(''))).toBeNull();
  });
});

describe('opcion', () => {
  const TIPOS = ['Ingreso', 'Egreso'] as const;

  it('deja pasar lo que está en la lista', () => {
    expect(valor(opcion('Egreso', TIPOS, 'el tipo'))).toBe('Egreso');
  });

  it('rechaza lo que no está', () => {
    // Un <select> manipulado metería 'Traslado' en Tipo, y metrics.ts
    // —que compara contra Ingreso y Egreso— lo dejaría fuera del saldo
    // en silencio.
    expect(error(opcion('Traslado', TIPOS, 'el tipo'))).toMatch(/no es un valor válido/);
  });

  it('distingue mayúsculas', () => {
    expect(error(opcion('egreso', TIPOS, 'el tipo'))).toBeTruthy();
  });
});

describe('texto', () => {
  it('recorta y rechaza el vacío', () => {
    expect(valor(textoRequerido('  Rifa  ', 'El concepto'))).toBe('Rifa');
    expect(error(textoRequerido('   ', 'El concepto'))).toMatch(/vacío/);
  });

  it('el opcional convierte el vacío en null', () => {
    expect(valor(textoOpcional('  '))).toBeNull();
  });

  it('corta por largo', () => {
    expect(error(textoRequerido('x'.repeat(300), 'El concepto'))).toMatch(/200/);
  });
});

describe('idRegistro', () => {
  it('acepta un id de Airtable', () => {
    expect(valor(idRegistro('recABC12345678901', 'el miembro'))).toBe('recABC12345678901');
  });

  it('rechaza uno inventado desde el navegador', () => {
    expect(error(idRegistro('borrar-todo', 'el miembro'))).toMatch(/no es válido/);
    expect(error(idRegistro('rec123', 'el miembro'))).toMatch(/no es válido/);
  });
});

describe('Recolector', () => {
  it('junta todos los errores, no solo el primero', () => {
    // Hacer que alguien reenvíe el formulario cinco veces para enterarse de
    // cinco errores es una forma lenta de perder los datos que ya escribió.
    const r = new Recolector();
    r.campo('concepto', textoRequerido('', 'El concepto'));
    r.campo('monto', monto('abc'));
    r.campo('fecha', fecha('2026-02-31'));

    expect(Object.keys(r.errores).sort()).toEqual(['concepto', 'fecha', 'monto']);
    expect(r.hayErrores).toBe(true);
  });

  it('sin errores devuelve los valores', () => {
    const r = new Recolector();
    const concepto = r.campo('concepto', textoRequerido('Rifa', 'El concepto'));
    const valorMonto = r.campo('monto', monto('25.000'));

    expect(r.hayErrores).toBe(false);
    expect(concepto).toBe('Rifa');
    expect(valorMonto).toBe(25000);
  });

  it('un campo que falla devuelve undefined, para que no se use por accidente', () => {
    const r = new Recolector();
    expect(r.campo('monto', monto('nada'))).toBeUndefined();
  });
});
