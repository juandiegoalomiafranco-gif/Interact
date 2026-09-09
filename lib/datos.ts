import { cache } from 'react';
import { obtenerSnapshot, snapshotVacio } from '@/lib/airtable/lectura';
import { hoyEnBogota, type FechaSimple } from '@/lib/fechas';
import type { Snapshot } from '@/types/domain';

/**
 * El snapshot que ven todas las vistas, leído una sola vez por petición.
 *
 * `cache()` de React es lo que hace que el layout —que necesita el índice del
 * buscador y el número de alertas— y la página —que necesita las cifras— no
 * lean Airtable dos veces. Sin esto, cada carga costaría ~30 llamadas contra
 * una cuota de 1.000 al mes, y se agotaría en una semana.
 */

export interface Datos {
  snapshot: Snapshot;
  /** El día de hoy en Bogotá. Entra por parámetro a todo cálculo. */
  hoy: FechaSimple;
  /**
   * Por qué no hay datos, cuando no los hay. Distingue "falta configurar" de
   * "no hay registros": lo primero lo arregla quien despliega, lo segundo
   * quien registra.
   */
  errorDeLectura: string | null;
}

export const datos = cache(async (): Promise<Datos> => {
  const hoy = hoyEnBogota();

  try {
    return { snapshot: await obtenerSnapshot(), hoy, errorDeLectura: null };
  } catch (e) {
    // El mensaje crudo puede traer el cuerpo de error de Airtable, con
    // nombres de campo e ids. Al log completo; a la pantalla, lo justo.
    console.error('[datos] no se pudo leer Airtable:', e);

    const falta = e instanceof Error && e.message.includes('Falta AIRTABLE');
    return {
      snapshot: snapshotVacio(),
      hoy,
      errorDeLectura: falta
        ? 'Falta configurar la conexión con Airtable. Revisa AIRTABLE_TOKEN y AIRTABLE_BASE_ID en las variables de entorno.'
        : 'No se pudo leer Airtable en este momento. Vuelve a cargar en un rato.',
    };
  }
});
