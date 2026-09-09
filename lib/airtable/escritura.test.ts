import { describe, expect, it } from 'vitest';
import {
  CAMPOS_ESCRIBIBLES,
  CAMPOS_PROHIBIDOS_MIEMBROS,
  EscrituraNoPermitida,
  METODOS_PERMITIDOS,
  TABLAS_ESCRIBIBLES,
  TABLAS_SOLO_LECTURA,
  camposNoPermitidos,
  esCampoEscribible,
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
  it('todas menos PERIODOS', () => {
    expect([...TABLAS_ESCRIBIBLES]).toEqual([
      'MOVIMIENTOS',
      'CUOTAS',
      'DONACIONES',
      'DONANTES',
      'PROYECTOS',
      'EVENTOS',
      'MIEMBROS',
    ]);
  });

  it('PERIODOS nunca es escribible', () => {
    // `Cerrado` es la firma de que un mes contable quedó sellado. Un
    // formulario web que lo desmarque reabre meses ya cuadrados.
    expect(esEscribible('PERIODOS')).toBe(false);
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
    expect(() => guarda({ tabla: 'PERIODOS' })).toThrow(EscrituraNoPermitida);
    expect(() => guarda({ correo: 'nadie@gmail.com' })).toThrow(EscrituraNoPermitida);
    expect(() => guarda({ listaEditores: [] })).toThrow(EscrituraNoPermitida);
  });

  it('el error dice qué pasó, para poder registrarlo en el servidor', () => {
    try {
      guarda({ tabla: 'PERIODOS' });
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
      guarda({ tabla: 'PERIODOS', correo: 'nadie@gmail.com' });
      expect.unreachable('debió lanzar');
    } catch (e) {
      expect((e as EscrituraNoPermitida).motivo).toBe('tabla-no-escribible');
    }
  });
});

describe('qué campos se pueden escribir', () => {
  it('los datos de contacto de MIEMBROS no están en ninguna lista', () => {
    // Ésta es la prueba que sostiene la promesa del README. Buena parte del
    // club son menores de edad: su teléfono y el de su acudiente no salen
    // ni entran por la web, aunque la tabla sí se pueda editar.
    for (const campo of CAMPOS_PROHIBIDOS_MIEMBROS) {
      expect(esCampoEscribible('MIEMBROS', campo), campo).toBe(false);
    }
  });

  it('escribir el teléfono de un miembro lanza', () => {
    try {
      guarda({ tabla: 'MIEMBROS', datos: { Nombre: 'Ana', 'Teléfono': '3001234567' } });
      expect.unreachable('debió lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(EscrituraNoPermitida);
      expect((e as EscrituraNoPermitida).motivo).toBe('campo-no-escribible');
      // El mensaje nombra el campo, para que el error se pueda arreglar.
      expect((e as Error).message).toContain('Teléfono');
    }
  });

  it('los campos legítimos de un miembro sí pasan', () => {
    expect(
      guarda({ tabla: 'MIEMBROS', datos: { Nombre: 'Ana', Rol: 'Tesorero' } }),
    ).toMatchObject({ tabla: 'MIEMBROS' });
  });

  it('el campo se comprueba antes que la persona', () => {
    // Mandar el teléfono de un menor está mal aunque quien lo mande sea
    // editor: es un error nuestro, no un intento de intrusión.
    try {
      guarda({
        tabla: 'MIEMBROS',
        datos: { 'Acudiente': 'x' },
        correo: 'nadie@gmail.com',
      });
      expect.unreachable('debió lanzar');
    } catch (e) {
      expect((e as EscrituraNoPermitida).motivo).toBe('campo-no-escribible');
    }
  });

  it('sin `datos` no comprueba campos, para no romper a quien solo valida permisos', () => {
    expect(() => guarda({ tabla: 'MOVIMIENTOS' })).not.toThrow();
  });

  it('camposNoPermitidos nombra todos los que sobran', () => {
    expect(camposNoPermitidos('MOVIMIENTOS', { Concepto: 'a', Inventado: 1, Otro: 2 })).toEqual([
      'Inventado',
      'Otro',
    ]);
    expect(camposNoPermitidos('MOVIMIENTOS', { Concepto: 'a', Monto: 1 })).toEqual([]);
  });

  it('toda tabla escribible tiene su lista de campos, y ninguna vacía', () => {
    // Una lista faltante sería `undefined` y `.includes` reventaría en
    // producción; una vacía haría la tabla inescribible sin decirlo.
    for (const t of TABLAS_ESCRIBIBLES) {
      expect(CAMPOS_ESCRIBIBLES[t], t).toBeDefined();
      expect(CAMPOS_ESCRIBIBLES[t].length, t).toBeGreaterThan(0);
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
