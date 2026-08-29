import { describe, expect, it } from 'vitest';
import { evaluarAcceso, parsearListaBlanca } from './allowlist';

const LISTA = ['tesorero@colegio.edu.co', 'presidente@colegio.edu.co'];

describe('parsearListaBlanca', () => {
  it('parte por coma', () => {
    expect(parsearListaBlanca('a@x.com,b@x.com')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('recorta espacios y baja a minúsculas', () => {
    expect(parsearListaBlanca('  A@X.com , B@X.COM ')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('descarta entradas vacías por comas de más', () => {
    expect(parsearListaBlanca('a@x.com,,b@x.com,')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('elimina duplicados', () => {
    expect(parsearListaBlanca('a@x.com,A@X.COM')).toEqual(['a@x.com']);
  });

  it('una variable ausente o vacía da lista vacía', () => {
    expect(parsearListaBlanca(undefined)).toEqual([]);
    expect(parsearListaBlanca(null)).toEqual([]);
    expect(parsearListaBlanca('')).toEqual([]);
    expect(parsearListaBlanca('   ')).toEqual([]);
    expect(parsearListaBlanca(',,,')).toEqual([]);
  });
});

describe('evaluarAcceso', () => {
  it('deja entrar a quien está en la lista con el correo verificado', () => {
    const r = evaluarAcceso({
      correo: 'tesorero@colegio.edu.co',
      correoVerificado: true,
      listaBlanca: LISTA,
    });
    expect(r).toEqual({ permitido: true, correo: 'tesorero@colegio.edu.co' });
  });

  it('ignora mayúsculas y espacios del correo que llega', () => {
    const r = evaluarAcceso({
      correo: '  Tesorero@Colegio.Edu.Co ',
      correoVerificado: true,
      listaBlanca: LISTA,
    });
    expect(r.permitido).toBe(true);
  });

  it('rechaza a quien no está en la lista', () => {
    const r = evaluarAcceso({
      correo: 'cualquiera@gmail.com',
      correoVerificado: true,
      listaBlanca: LISTA,
    });
    expect(r).toEqual({ permitido: false, motivo: 'fuera-de-lista' });
  });

  // ── El caso que importa ──────────────────────────────────────────────

  it('CON LA LISTA VACÍA NO ENTRA NADIE', () => {
    // Si esta prueba se cae, un despliegue sin ALLOWED_EMAILS queda abierto
    // a cualquiera con cuenta de Google, mostrando quién pagó la cuota en un
    // club de menores de edad.
    const r = evaluarAcceso({
      correo: 'tesorero@colegio.edu.co',
      correoVerificado: true,
      listaBlanca: [],
    });
    expect(r).toEqual({ permitido: false, motivo: 'lista-vacia' });
  });

  it('la lista vacía niega incluso antes de mirar el correo', () => {
    // El motivo debe ser 'lista-vacia', no 'fuera-de-lista': es un error de
    // configuración y el mensaje del login tiene que decirlo.
    for (const correo of ['tesorero@colegio.edu.co', 'atacante@gmail.com', null]) {
      expect(
        evaluarAcceso({ correo, correoVerificado: true, listaBlanca: [] }),
      ).toEqual({ permitido: false, motivo: 'lista-vacia' });
    }
  });

  // ── Correo ausente o sin verificar ───────────────────────────────────

  it('rechaza cuando el proveedor no manda correo', () => {
    for (const correo of [null, undefined, '', '   ']) {
      expect(
        evaluarAcceso({ correo, correoVerificado: true, listaBlanca: LISTA }),
      ).toEqual({ permitido: false, motivo: 'sin-correo' });
    }
  });

  it('rechaza el correo no verificado aunque esté en la lista', () => {
    for (const verificado of [false, null, undefined]) {
      expect(
        evaluarAcceso({
          correo: 'tesorero@colegio.edu.co',
          correoVerificado: verificado,
          listaBlanca: LISTA,
        }),
      ).toEqual({ permitido: false, motivo: 'correo-no-verificado' });
    }
  });

  it('no acepta un "verificado" que no sea exactamente true', () => {
    // Un proveedor que mande la cadena 'true' o un 1 no debe colarse por
    // la puerta de atrás de la coerción de JavaScript.
    const r = evaluarAcceso({
      correo: 'tesorero@colegio.edu.co',
      correoVerificado: 'true' as unknown as boolean,
      listaBlanca: LISTA,
    });
    expect(r).toEqual({ permitido: false, motivo: 'correo-no-verificado' });
  });

  it('no deja pasar un correo parecido pero distinto', () => {
    for (const correo of [
      'tesorero@colegio.edu.co.attacker.com',
      'tesorero@colegio.edu',
      'xtesorero@colegio.edu.co',
      'tesorero+admin@colegio.edu.co',
    ]) {
      expect(
        evaluarAcceso({ correo, correoVerificado: true, listaBlanca: LISTA }).permitido,
        correo,
      ).toBe(false);
    }
  });
});
