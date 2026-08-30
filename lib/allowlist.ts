/**
 * Lista blanca de correos.
 *
 * Funciones puras, sin lectura de entorno: quien llama pasa la lista ya
 * parseada. Así se pueden probar todos los casos raros sin manipular
 * `process.env`, y el mismo código sirve en el servidor y en el edge.
 *
 * REGLA CENTRAL: una lista vacía no autoriza a nadie.
 *
 * Es el error clásico de las listas blancas — tratar "vacía" como "sin
 * restricciones". Aquí eso significaría que un despliegue al que se le olvidó
 * la variable de entorno queda abierto a cualquiera con una cuenta de Google,
 * mostrando quién pagó y quién no la cuota de un club lleno de menores de
 * edad. Falla cerrado, sin excepciones.
 */

export type MotivoRechazo =
  /** No hay lista configurada. Es un error de despliegue, no del usuario. */
  | 'lista-vacia'
  /** El proveedor no devolvió correo. */
  | 'sin-correo'
  /** Google dice que el correo no está verificado. */
  | 'correo-no-verificado'
  /** El correo es válido pero no está autorizado. */
  | 'fuera-de-lista';

export type ResultadoAcceso =
  | { permitido: true; correo: string }
  | { permitido: false; motivo: MotivoRechazo };

/**
 * Parte 'a@x.com, B@X.com ,,' en ['a@x.com', 'b@x.com'].
 * Recorta espacios, baja a minúsculas y descarta entradas vacías, para que
 * una coma de más o una mayúscula no dejen a nadie afuera por accidente.
 */
export function parsearListaBlanca(valor: string | undefined | null): string[] {
  if (!valor) return [];
  return [
    ...new Set(
      valor
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.length > 0),
    ),
  ];
}

/**
 * Decide si un correo entra. Devuelve el motivo del rechazo para poder
 * registrarlo en el servidor y mostrar un mensaje útil en el login.
 */
export function evaluarAcceso(params: {
  correo: string | null | undefined;
  correoVerificado: boolean | null | undefined;
  listaBlanca: string[];
}): ResultadoAcceso {
  const { correo, correoVerificado, listaBlanca } = params;

  // Primero la lista: sin ella no se autoriza a nadie, venga quien venga.
  if (listaBlanca.length === 0) return { permitido: false, motivo: 'lista-vacia' };

  const normalizado = correo?.trim().toLowerCase();
  if (!normalizado) return { permitido: false, motivo: 'sin-correo' };

  // Un correo sin verificar no prueba que quien entra controle esa dirección.
  if (correoVerificado !== true) return { permitido: false, motivo: 'correo-no-verificado' };

  if (!listaBlanca.includes(normalizado)) return { permitido: false, motivo: 'fuera-de-lista' };

  return { permitido: true, correo: normalizado };
}

/** Lee la lista del entorno. Solo servidor: `ALLOWED_EMAILS` no es pública. */
export function listaBlancaDelEntorno(): string[] {
  return parsearListaBlanca(process.env.ALLOWED_EMAILS);
}
