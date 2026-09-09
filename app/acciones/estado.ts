import type { ErroresFormulario } from '@/lib/validacion';

/**
 * El estado que va y viene entre el formulario y su Server Action.
 *
 * Vive aparte de `comun.ts` a propósito. `comun.ts` importa `next/cache`,
 * `@/auth` y el cliente de Airtable; un formulario marcado `'use client'`
 * que importara de allí arrastraría todo eso al bundle del navegador, y Next
 * lo rechaza con un error de build. Aquí solo hay tipos y una constante, así
 * que los dos lados pueden importarlo sin arrastrar nada.
 */

export type EstadoAccion =
  | { estado: 'inicial' }
  | { estado: 'ok'; mensaje: string }
  | { estado: 'error'; errores: ErroresFormulario };

export const INICIAL: EstadoAccion = { estado: 'inicial' };

export const fallo = (campos: Record<string, string>, general?: string): EstadoAccion => ({
  estado: 'error',
  errores: general ? { campos, general } : { campos },
});

export const exito = (mensaje: string): EstadoAccion => ({ estado: 'ok', mensaje });
