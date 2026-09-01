import { describe, expect, it } from 'vitest';
import {
  bloqueaLogin,
  resumirParaLog,
  revisarConfiguracion,
  type Entorno,
} from '@/lib/config';

/**
 * El caso que originó este módulo: AUTH_SECRET sin cargar en Vercel.
 * Si algún día alguien "simplifica" la comprobación, estos tests lo frenan.
 */

/** Entorno correcto. Cada test rompe solo lo que quiere probar. */
const COMPLETO: Entorno = {
  AUTH_SECRET: 'un-secreto-largo-y-aleatorio',
  AUTH_GOOGLE_ID: 'algo.apps.googleusercontent.com',
  AUTH_GOOGLE_SECRET: 'el-secreto-del-cliente',
  ALLOWED_EMAILS: 'tesorero@club.org, presidente@club.org',
  EDITOR_EMAILS: 'tesorero@club.org',
  AIRTABLE_TOKEN: 'pat...',
  AIRTABLE_BASE_ID: 'app4obzS9ct8HxQQU',
  NODE_ENV: 'production',
};

const sin = (variable: string): Entorno => ({ ...COMPLETO, [variable]: undefined });
const variables = (problemas: { variable: string }[]) => problemas.map((p) => p.variable);

describe('revisarConfiguracion', () => {
  it('no encuentra nada que reportar cuando todo está puesto', () => {
    expect(revisarConfiguracion(COMPLETO)).toEqual([]);
  });

  describe('lo que bloquea el login', () => {
    it('detecta AUTH_SECRET ausente — el fallo real de producción', () => {
      const problemas = revisarConfiguracion(sin('AUTH_SECRET'));
      expect(variables(problemas)).toContain('AUTH_SECRET');
      expect(bloqueaLogin(problemas)).toBe(true);
    });

    it.each(['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'ALLOWED_EMAILS'])(
      'sin %s no se puede entrar',
      (variable) => {
        const problemas = revisarConfiguracion(sin(variable));
        expect(variables(problemas)).toContain(variable);
        expect(bloqueaLogin(problemas)).toBe(true);
      },
    );

    it('trata una variable vacía igual que una ausente', () => {
      expect(bloqueaLogin(revisarConfiguracion({ ...COMPLETO, AUTH_SECRET: '' }))).toBe(true);
    });

    it('trata una variable de solo espacios igual que una ausente', () => {
      expect(bloqueaLogin(revisarConfiguracion({ ...COMPLETO, AUTH_SECRET: '   ' }))).toBe(true);
    });

    it('una lista de correos con solo comas no autoriza a nadie', () => {
      const problemas = revisarConfiguracion({ ...COMPLETO, ALLOWED_EMAILS: ' , ,, ' });
      expect(variables(problemas)).toContain('ALLOWED_EMAILS');
      expect(bloqueaLogin(problemas)).toBe(true);
    });

    it('un entorno completamente vacío reporta las cuatro que bloquean', () => {
      const problemas = revisarConfiguracion({});
      const bloqueantes = problemas.filter((p) => p.gravedad === 'bloquea-login');
      expect(variables(bloqueantes).sort()).toEqual([
        'ALLOWED_EMAILS',
        'AUTH_GOOGLE_ID',
        'AUTH_GOOGLE_SECRET',
        'AUTH_SECRET',
      ]);
    });
  });

  describe('lo que bloquea los datos pero deja entrar', () => {
    it.each(['AIRTABLE_TOKEN', 'AIRTABLE_BASE_ID'])(
      'sin %s se puede entrar, solo que no hay datos',
      (variable) => {
        const problemas = revisarConfiguracion(sin(variable));
        expect(variables(problemas)).toContain(variable);
        // Lo importante: NO tumba el login.
        expect(bloqueaLogin(problemas)).toBe(false);
      },
    );
  });

  describe('avisos', () => {
    it('señala a quien puede escribir pero no entrar', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        EDITOR_EMAILS: 'tesorero@club.org, intruso@otro.com',
      });
      const aviso = problemas.find((p) => p.variable === 'EDITOR_EMAILS');
      expect(aviso?.gravedad).toBe('aviso');
      expect(aviso?.que).toContain('intruso@otro.com');
    });

    it('no se queja si EDITOR_EMAILS es subconjunto, ignorando mayúsculas y espacios', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        EDITOR_EMAILS: '  TESORERO@Club.org ',
      });
      expect(variables(problemas)).not.toContain('EDITOR_EMAILS');
    });

    it('no duplica la queja de EDITOR_EMAILS cuando ALLOWED_EMAILS ya está vacía', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        ALLOWED_EMAILS: '',
        EDITOR_EMAILS: 'alguien@club.org',
      });
      expect(variables(problemas)).toContain('ALLOWED_EMAILS');
      expect(variables(problemas)).not.toContain('EDITOR_EMAILS');
    });

    it('avisa si el caché de desarrollo quedó activo en producción', () => {
      const problemas = revisarConfiguracion({ ...COMPLETO, AIRTABLE_DEV_CACHE: '1' });
      expect(variables(problemas)).toContain('AIRTABLE_DEV_CACHE');
    });

    it('en desarrollo el caché local es normal y no se reporta', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        NODE_ENV: 'development',
        AIRTABLE_DEV_CACHE: '1',
      });
      expect(variables(problemas)).not.toContain('AIRTABLE_DEV_CACHE');
    });

    it('VERCEL_ENV manda sobre NODE_ENV para decidir si es producción', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        AIRTABLE_DEV_CACHE: '1',
      });
      expect(variables(problemas)).not.toContain('AIRTABLE_DEV_CACHE');
    });

    it('detecta AUTH_URL con barra final', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        AUTH_URL: 'https://interact-finanzas.vercel.app/',
      });
      expect(variables(problemas)).toContain('AUTH_URL');
    });

    it('detecta AUTH_URL sin https en producción', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        AUTH_URL: 'http://interact-finanzas.vercel.app',
      });
      expect(variables(problemas)).toContain('AUTH_URL');
    });

    it('acepta AUTH_URL bien formada', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        AUTH_URL: 'https://interact-finanzas.vercel.app',
      });
      expect(variables(problemas)).not.toContain('AUTH_URL');
    });

    it('no exige AUTH_URL: en Vercel se deduce del host', () => {
      expect(variables(revisarConfiguracion(sin('AUTH_URL')))).not.toContain('AUTH_URL');
    });

    it('en localhost, http es correcto y no se reporta', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        NODE_ENV: 'development',
        AUTH_URL: 'http://localhost:3000',
      });
      expect(variables(problemas)).not.toContain('AUTH_URL');
    });
  });

  describe('nunca filtra valores', () => {
    it('ningún mensaje contiene el valor de un secreto', () => {
      const problemas = revisarConfiguracion({
        ...COMPLETO,
        AUTH_SECRET: '',
        EDITOR_EMAILS: 'fuera@x.com',
        AIRTABLE_DEV_CACHE: '1',
        AUTH_URL: 'http://mal/',
      });
      const texto = JSON.stringify(problemas);
      expect(texto).not.toContain('el-secreto-del-cliente');
      expect(texto).not.toContain('algo.apps.googleusercontent.com');
      expect(texto).not.toContain('app4obzS9ct8HxQQU');
    });
  });
});

describe('bloqueaLogin', () => {
  it('es falso sin problemas', () => {
    expect(bloqueaLogin([])).toBe(false);
  });

  it('ignora los que no bloquean el login', () => {
    expect(bloqueaLogin(revisarConfiguracion(sin('AIRTABLE_TOKEN')))).toBe(false);
  });
});

describe('resumirParaLog', () => {
  it('lo dice cuando no hay nada mal', () => {
    expect(resumirParaLog([])).toContain('completa');
  });

  it('nombra cada variable y su gravedad', () => {
    const resumen = resumirParaLog(revisarConfiguracion({}));
    expect(resumen).toContain('AUTH_SECRET');
    expect(resumen).toContain('bloquea-login');
    expect(resumen).toContain('ALLOWED_EMAILS');
  });

  it('incluye los avisos, que en pantalla no se muestran', () => {
    const resumen = resumirParaLog(
      revisarConfiguracion({ ...COMPLETO, AIRTABLE_DEV_CACHE: '1' }),
    );
    expect(resumen).toContain('AIRTABLE_DEV_CACHE');
  });
});
