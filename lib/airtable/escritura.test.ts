import { describe, expect, it } from 'vitest';
import {
  EscrituraNoPermitida,
  METODOS_PERMITIDOS,
  TABLAS_ESCRIBIBLES,
  TABLAS_SOLO_LECTURA,
  esEscribible,
  esMetodoPermitido,
  etiquetaDe,
  etiquetasAInvalidar,
  evaluarEscritura,
  exigirEscrituraPermitida,
} from './escritura';

const EDITORES = ['tesorero@colegio.edu.co'];
const BLANCA = ['tesorero@colegio.edu.co', 'presidente@colegio.edu.co'];

const guarda = (over: Record<string, unknown> = {}) =>
  exigirEscrituraPermitida({
    tabla: 'MOVIMIENTOS',
    metodo: 'POST',
    correo: 'tesorero@colegio.edu.co',
    listaEditores: EDITORES,
    listaBlanca: BLANCA,
    ...over,
  });

describe('qué tablas se pueden escribir', () => {
  it('solo las tres transaccionales', () => {
    expect([...TABLAS_ESCRIBIBLES]).toEqual(['MOVIMIENTOS', 'CUOTAS', 'DONACIONES']);
  });

  it('MIEMBROS nunca es escribible', () => {
    // Lleva datos de contacto de menores y de sus acudientes.
    expect(esEscribible('MIEMBROS')).toBe(false);
  });

  it('las tablas de gobierno del club tampoco', () => {
    // Cerrar un mes o aprobar un presupuesto se decide en reunión, no
    // capturando un formulario.
    for (const t of TABLAS_SOLO_LECTURA) {
      expect(esEscribible(t), t).toBe(false);
    }
  });

  it('las dos listas no se solapan', () => {
    const escribibles = new Set<string>(TABLAS_ESCRIBIBLES);
    for (const t of TABLAS_SOLO_LECTURA) expect(escribibles.has(t), t).toBe(false);
  });

  it('una tabla inventada no se cuela', () => {
    expect(esEscribible('MOVIMIENTOS_V2')).toBe(false);
    expect(esEscribible('movimientos')).toBe(false);
    expect(esEscribible('')).toBe(false);
  });
});

describe('qué métodos se permiten', () => {
  it('solo POST y PATCH', () => {
    expect([...METODOS_PERMITIDOS]).toEqual(['POST', 'PATCH']);
  });

  it('DELETE NUNCA se permite', () => {
    // Corregir un error contable es un asiento nuevo o un PATCH. En
    // contabilidad de papel tampoco se arranca una hoja.
    expect(esMetodoPermitido('DELETE')).toBe(false);
    expect(() => guarda({ metodo: 'DELETE' })).toThrow(EscrituraNoPermitida);
  });

  it('PUT tampoco: reemplazaría el registro entero', () => {
    expect(esMetodoPermitido('PUT')).toBe(false);
  });

  it('DELETE no aparece en la lista de permitidos bajo ninguna forma', () => {
    for (const m of METODOS_PERMITIDOS) {
      expect(m.toUpperCase()).not.toContain('DELETE');
    }
  });
});

describe('evaluarEscritura', () => {
  it('deja registrar a quien está en las dos listas', () => {
    const r = evaluarEscritura({
      correo: 'tesorero@colegio.edu.co',
      listaEditores: EDITORES,
      listaBlanca: BLANCA,
    });
    expect(r).toEqual({ permitido: true, correo: 'tesorero@colegio.edu.co' });
  });

  it('SIN EDITORES CONFIGURADOS NO ESCRIBE NADIE', () => {
    // Mismo criterio que la lista blanca: vacía no autoriza. Un despliegue
    // al que se le olvidó la variable no puede quedar abierto.
    const r = evaluarEscritura({
      correo: 'tesorero@colegio.edu.co',
      listaEditores: [],
      listaBlanca: BLANCA,
    });
    expect(r).toEqual({ permitido: false, motivo: 'sin-editores' });
  });

  it('quien solo puede ver, no puede registrar', () => {
    const r = evaluarEscritura({
      correo: 'presidente@colegio.edu.co',
      listaEditores: EDITORES,
      listaBlanca: BLANCA,
    });
    expect(r).toEqual({ permitido: false, motivo: 'no-es-editor' });
  });

  it('estar en EDITOR_EMAILS sin estar en ALLOWED_EMAILS no alcanza', () => {
    // Configuración incoherente: poder escribir sin poder entrar. Se
    // comprueba en cada escritura, no solo al arrancar, por si alguien
    // edita la variable en Vercel y no reinicia.
    const r = evaluarEscritura({
      correo: 'externo@gmail.com',
      listaEditores: ['externo@gmail.com'],
      listaBlanca: BLANCA,
    });
    expect(r).toEqual({ permitido: false, motivo: 'editor-sin-acceso' });
  });

  it('ignora mayúsculas y espacios', () => {
    const r = evaluarEscritura({
      correo: '  Tesorero@Colegio.Edu.Co  ',
      listaEditores: EDITORES,
      listaBlanca: BLANCA,
    });
    expect(r.permitido).toBe(true);
  });

  it('sin correo no escribe', () => {
    for (const correo of [null, undefined, '', '   ']) {
      expect(
        evaluarEscritura({ correo, listaEditores: EDITORES, listaBlanca: BLANCA }).permitido,
      ).toBe(false);
    }
  });
});

describe('exigirEscrituraPermitida', () => {
  it('deja pasar el caso bueno y devuelve el correo normalizado', () => {
    expect(guarda()).toEqual({
      tabla: 'MOVIMIENTOS',
      metodo: 'POST',
      correo: 'tesorero@colegio.edu.co',
    });
  });

  it('lanza, no devuelve false', () => {
    // Un booleano se puede ignorar con un `if` olvidado; una excepción no.
    expect(() => guarda({ tabla: 'MIEMBROS' })).toThrow(EscrituraNoPermitida);
    expect(() => guarda({ correo: 'nadie@gmail.com' })).toThrow(EscrituraNoPermitida);
    expect(() => guarda({ listaEditores: [] })).toThrow(EscrituraNoPermitida);
  });

  it('el error dice qué pasó, para poder registrarlo en el servidor', () => {
    try {
      guarda({ tabla: 'PROYECTOS' });
      expect.unreachable('debió lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(EscrituraNoPermitida);
      expect((e as EscrituraNoPermitida).motivo).toBe('tabla-no-escribible');
    }
  });

  it('comprueba la tabla antes que la persona', () => {
    // Un intento contra una tabla prohibida es un error de programación
    // nuestro, y debe verse como tal aunque el usuario sí sea editor.
    try {
      guarda({ tabla: 'MIEMBROS', correo: 'nadie@gmail.com' });
      expect.unreachable('debió lanzar');
    } catch (e) {
      expect((e as EscrituraNoPermitida).motivo).toBe('tabla-no-escribible');
    }
  });
});

describe('etiquetas de caché', () => {
  it('una por tabla, no una compartida', () => {
    expect(etiquetaDe('MOVIMIENTOS')).toBe('airtable:movimientos');
    expect(etiquetaDe('CUOTAS')).toBe('airtable:cuotas');
    expect(etiquetaDe('MIEMBROS')).toBe('airtable:miembros');
  });

  it('todas las etiquetas son distintas', () => {
    const todas = [...TABLAS_ESCRIBIBLES, ...TABLAS_SOLO_LECTURA].map(etiquetaDe);
    expect(new Set(todas).size).toBe(todas.length);
  });

  it('un movimiento invalida solo movimientos', () => {
    // Si invalidara las ocho, cada registro costaría ~15 llamadas y la
    // cuota mensual no aguantaría.
    expect(etiquetasAInvalidar('MOVIMIENTOS')).toEqual(['airtable:movimientos']);
  });

  it('una cuota invalida también movimientos', () => {
    // Por la Regla 1: marcar la cuota crea un ingreso, y sin refrescar
    // movimientos el saldo quedaría atrasado.
    expect(etiquetasAInvalidar('CUOTAS')).toEqual([
      'airtable:cuotas',
      'airtable:movimientos',
    ]);
  });

  it('una donación en dinero también mueve el saldo', () => {
    expect(etiquetasAInvalidar('DONACIONES')).toEqual([
      'airtable:donaciones',
      'airtable:movimientos',
    ]);
  });

  it('ninguna escritura invalida las ocho tablas', () => {
    for (const t of TABLAS_ESCRIBIBLES) {
      expect(etiquetasAInvalidar(t).length, t).toBeLessThanOrEqual(2);
    }
  });
});
