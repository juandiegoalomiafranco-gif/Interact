import { puedeEditar } from '@/app/acciones/comun';
import { BotonNuevoMovimiento } from '@/components/formularios/movimiento';
import type { Snapshot } from '@/types/domain';

/**
 * Registrar un gasto desde cualquier vista, sin volver a General.
 *
 * El tesorero abre esto desde el celular en mitad de un evento, con el recibo
 * en la otra mano. Obligarlo a navegar a la vista correcta antes de poder
 * anotar es justo lo que hace que el gasto se anote "después" y termine sin
 * anotarse.
 *
 * No aparece si falta la tabla MOVIMIENTOS —no habría dónde guardar— ni para
 * quien no está en EDITOR_EMAILS.
 *
 * En modo demo sí aparece, a propósito: así el diseño se puede revisar. Al
 * guardar, la acción responde que son datos de ejemplo y no escribe nada.
 */
export async function BotonFlotanteRegistrar({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.faltantes.includes('MOVIMIENTOS')) return null;
  if (!(await puedeEditar())) return null;

  return (
    <BotonNuevoMovimiento
      variante="flotante"
      etiqueta={<span className="hidden sm:inline">Registrar gasto</span>}
      ariaBoton="Registrar un gasto o un ingreso"
      enlazables={{
        proyectos: snapshot.proyectos.map((p) => ({ id: p.id, nombre: p.nombre })),
        eventos: snapshot.eventos.map((e) => ({ id: e.id, nombre: e.nombre })),
      }}
    />
  );
}
