'use client';

import { useEffect } from 'react';
import type { EstadoAccion } from '@/app/acciones/estado';

/**
 * Cierra el modal cuando la acción terminó bien.
 *
 * Va en un efecto y no dentro de la acción porque la acción corre en el
 * servidor y no sabe que hay un modal abierto. Dejar el modal abierto tras
 * guardar hace que la gente vuelva a darle a Guardar creyendo que no pasó
 * nada, y registra el mismo movimiento dos veces.
 */
export function useCerrarAlGuardar(estado: EstadoAccion, cerrar: () => void): void {
  useEffect(() => {
    if (estado.estado === 'ok') cerrar();
  }, [estado, cerrar]);
}

/** Los errores por campo, o un objeto vacío. */
export function erroresDe(estado: EstadoAccion): Record<string, string> {
  return estado.estado === 'error' ? estado.errores.campos : {};
}

export function generalDe(estado: EstadoAccion): string | undefined {
  return estado.estado === 'error' ? estado.errores.general : undefined;
}

/** La fecha de hoy en formato del input, para prellenar los formularios. */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
