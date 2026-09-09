import type { Snapshot } from '@/types/domain';
import { leerTabla, type Lectura, type RegistroCrudo } from './cliente';
import type { Tabla } from './escritura';
import {
  aCuota,
  aDonacion,
  aDonante,
  aEvento,
  aMiembro,
  aMovimiento,
  aPeriodo,
  aProyecto,
} from './mapeo';

/**
 * Una sola lectura de Airtable para todo el panel.
 *
 * Ningún componente consulta Airtable por su cuenta: todos reciben el
 * `Snapshot`. Así una vista nueva no agrega llamadas a una cuota de 1.000 al
 * mes, y `lib/metrics.ts` puede seguir siendo puro.
 */

/**
 * Las ocho tablas van en paralelo. En serie, con ocho viajes de ~200 ms cada
 * uno, la primera carga se sentiría lenta sin ninguna razón: no dependen
 * entre sí.
 */
async function leerTodo(): Promise<Record<Tabla, Lectura>> {
  const tablas: Tabla[] = [
    'MIEMBROS',
    'PERIODOS',
    'CUOTAS',
    'PROYECTOS',
    'EVENTOS',
    'MOVIMIENTOS',
    'DONANTES',
    'DONACIONES',
  ];

  const lecturas = await Promise.all(tablas.map((t) => leerTabla(t)));
  return Object.fromEntries(tablas.map((t, i) => [t, lecturas[i]!])) as Record<Tabla, Lectura>;
}

function mapear<T>(lectura: Lectura, fn: (r: RegistroCrudo) => T): T[] {
  return lectura.registros.map(fn);
}

/**
 * Lee la base entera y la traduce a dominio.
 *
 * Una tabla que todavía no existe (404) NO tumba el panel: queda como lista
 * vacía y su nombre entra en `faltantes`, para que la vista diga "falta crear
 * MOVIMIENTOS" en vez de pintar un saldo de $0. Es la misma regla que ya
 * seguía `TarjetaIndicador`: ausencia de dato no es cero.
 */
export async function obtenerSnapshot(): Promise<Snapshot> {
  if (process.env.DEMO === '1') {
    const { snapshotDemo } = await import('@/lib/demo');
    return snapshotDemo();
  }

  const t = await leerTodo();

  return {
    miembros: mapear(t.MIEMBROS, aMiembro),
    periodos: mapear(t.PERIODOS, aPeriodo),
    cuotas: mapear(t.CUOTAS, aCuota),
    proyectos: mapear(t.PROYECTOS, aProyecto),
    eventos: mapear(t.EVENTOS, aEvento),
    movimientos: mapear(t.MOVIMIENTOS, aMovimiento),
    donantes: mapear(t.DONANTES, aDonante),
    donaciones: mapear(t.DONACIONES, aDonacion),
    obtenidoEn: new Date().toISOString(),
    faltantes: Object.entries(t)
      .filter(([, lectura]) => !lectura.existe)
      .map(([nombre]) => nombre),
  };
}

/** Un snapshot vacío, para cuando la configuración impide leer. */
export function snapshotVacio(faltantes: string[] = []): Snapshot {
  return {
    miembros: [],
    periodos: [],
    cuotas: [],
    proyectos: [],
    eventos: [],
    movimientos: [],
    donantes: [],
    donaciones: [],
    obtenidoEn: new Date().toISOString(),
    faltantes,
  };
}
