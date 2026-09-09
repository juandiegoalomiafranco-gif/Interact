import { revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { escribir } from '@/lib/airtable/cliente';
import {
  EscrituraNoPermitida,
  etiquetasAInvalidar,
  evaluarEscritura,
  listaEditoresDelEntorno,
  type MetodoEscritura,
  type TablaEscribible,
} from '@/lib/airtable/escritura';
import { parsearListaBlanca } from '@/lib/allowlist';
import { fallo, type EstadoAccion } from './estado';

/**
 * Lo que comparten todas las Server Actions del panel.
 *
 * Una acción hace siempre lo mismo, en este orden: mirar quién es, validar lo
 * que llegó, escribir, y refrescar el caché de las tablas afectadas. Tenerlo
 * en un solo sitio evita que la sexta acción se salte el tercer paso.
 *
 * SOLO SERVIDOR. Importa `next/cache`, `@/auth` y el cliente de Airtable, así
 * que un componente `'use client'` no puede importar de aquí: se llevaría
 * todo eso al navegador. Para eso está `estado.ts`, que es solo tipos.
 */

export { exito, fallo, INICIAL, type EstadoAccion } from './estado';

// ─────────────────────────── Quién está pidiendo ───────────────────────────

/** El correo de la sesión, o null. La guarda de escritura lo vuelve a mirar. */
export async function correoDeSesion(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.email ?? null;
}

/**
 * Si quien mira puede registrar información.
 *
 * Las vistas la usan para no pintar botones que van a fallar. NO es la
 * barrera: la barrera es `exigirEscrituraPermitida()` dentro de `escribir()`,
 * que corre en cada escritura. Esconder un botón es cortesía, no seguridad.
 */
export async function puedeEditar(): Promise<boolean> {
  return evaluarEscritura({
    correo: await correoDeSesion(),
    listaEditores: listaEditoresDelEntorno(),
    listaBlanca: parsearListaBlanca(process.env.ALLOWED_EMAILS),
  }).permitido;
}

// ─────────────────────────────── Escribir ───────────────────────────────

/**
 * Escribe y refresca. El único camino que usan las acciones.
 *
 * Invalida solo las etiquetas de las tablas tocadas, no las ocho: con una
 * etiqueta compartida cada registro costaría ~15 llamadas de relectura y la
 * cuota mensual de Airtable no aguantaría.
 */
export async function guardar(params: {
  tabla: TablaEscribible;
  metodo: MetodoEscritura;
  datos: Record<string, unknown>;
  recordId?: string;
}): Promise<{ id: string }> {
  if (process.env.DEMO === '1') {
    throw new EscrituraNoPermitida(
      'Estás viendo datos de ejemplo. Conecta Airtable para registrar de verdad.',
      'modo-demo',
    );
  }

  const creado = await escribir({
    ...params,
    correo: await correoDeSesion(),
  });

  for (const etiqueta of etiquetasAInvalidar(params.tabla)) revalidateTag(etiqueta);

  return { id: creado.id };
}

/**
 * Traduce una excepción a algo que se pueda leer en pantalla.
 *
 * Un `EscrituraNoPermitida` sí se muestra: dice qué regla se tocó y quien lo
 * lee puede arreglarlo. Cualquier otro error se registra en el servidor y
 * afuera sale un mensaje genérico, porque el texto crudo de Airtable puede
 * traer nombres de campo, ids y rutas internas.
 */
export function aMensaje(e: unknown): EstadoAccion {
  if (e instanceof EscrituraNoPermitida) return fallo({}, e.message);

  console.error('[acciones] falló una escritura:', e);
  return fallo({}, 'No se pudo guardar. Vuelve a intentarlo en un momento.');
}
