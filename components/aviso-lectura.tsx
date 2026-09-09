/**
 * Los dos avisos que pueden aparecer arriba de cualquier vista.
 *
 * Los dos existen por la misma razón: un panel de plata que no puede mostrar
 * cifras tiene que decir POR QUÉ, porque de eso depende a quién le toca
 * arreglarlo. "Sin datos" a secas deja a todo el mundo esperando a otro.
 */

export function AvisoLectura({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;

  return (
    <div
      role="alert"
      className="rounded-(--radius-tarjeta) border border-riesgo-borde bg-riesgo-fondo p-4"
    >
      <p className="text-sm font-semibold text-riesgo-texto">No se pudieron cargar los datos</p>
      <p className="mt-1 text-sm text-riesgo-texto">{mensaje}</p>
    </div>
  );
}

/**
 * La franja de modo demo.
 *
 * No se puede cerrar, y eso es a propósito. Un tablero financiero con
 * números inventados que se lean como reales es peor que uno vacío: alguien
 * los cita en una reunión y la decisión que sale de ahí está mal.
 */
export function FranjaDemo({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-(--radius-interno) border border-alerta-borde bg-alerta-fondo px-4 py-2 text-sm"
    >
      <span className="font-semibold text-alerta-texto">Datos de ejemplo</span>
      <span className="text-alerta-texto">
        Ninguna cifra de esta pantalla es real. Sirve para revisar el diseño mientras se
        conecta Airtable.
      </span>
    </div>
  );
}
