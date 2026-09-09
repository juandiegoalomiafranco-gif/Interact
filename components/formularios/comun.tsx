'use client';

import type { EstadoAccion } from '@/app/acciones/estado';

/**
 * Lo que comparten los formularios del panel.
 *
 * Aquí vivía `useCerrarAlGuardar`, que cerraba el modal al guardar bien. Se
 * quitó: cerrar en silencio no dejaba ver si el registro había llegado a
 * Airtable, y en un libro contable esa duda hace que la gente vuelva a
 * registrar lo mismo "por si acaso". Ahora cada formulario muestra su
 * `<Confirmacion>` y quien registra decide si sigue o cierra.
 */

/** Los errores por campo, o un objeto vacío. */
export function erroresDe(estado: EstadoAccion): Record<string, string> {
  return estado.estado === 'error' ? estado.errores.campos : {};
}

export function generalDe(estado: EstadoAccion): string | undefined {
  return estado.estado === 'error' ? estado.errores.general : undefined;
}

/**
 * Lo que la persona escribió, para volver a pintarlo tras un error.
 *
 * React 19 resetea el formulario cuando la acción termina, también cuando
 * termina mal. Sin re-sembrar los `defaultValue`, un error en el monto borra
 * el concepto, la categoría y la fecha que ya estaban bien.
 */
export function valoresDe(estado: EstadoAccion): Record<string, string> {
  return estado.estado === 'error' ? (estado.errores.valores ?? {}) : {};
}

/** La fecha de hoy en formato del input, para prellenar los formularios. */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
