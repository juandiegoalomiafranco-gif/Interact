import { evaluarEscritura, listaEditoresDelEntorno } from '@/lib/airtable/escritura';
import { parsearListaBlanca } from '@/lib/allowlist';
import { auth } from '@/auth';
import type { Snapshot } from '@/types/domain';

/**
 * Por qué no se puede registrar, cuando no se puede.
 *
 * Antes esto solo se descubría al intentar guardar: llenabas el formulario,
 * dabas a Guardar, y salía un error. Ahora el panel lo dice arriba, ANTES de
 * escribir nada, y con el paso concreto que falta.
 *
 * Cada motivo lo arregla una persona distinta —quien administra Airtable,
 * quien despliega, o quien lleva la lista de editores— así que el mensaje
 * tiene que nombrar cuál es, no decir "no tienes permiso" y ya.
 */

type Motivo =
  | { clase: 'tablas'; faltan: string[] }
  | { clase: 'sin-editores' }
  | { clase: 'no-es-editor'; correo: string }
  | null;

async function diagnosticar(snapshot: Snapshot): Promise<Motivo> {
  const faltan = snapshot.faltantes.filter((t) => t === 'MOVIMIENTOS');
  if (faltan.length > 0) return { clase: 'tablas', faltan: snapshot.faltantes };

  const sesion = await auth();
  const correo = sesion?.user?.email ?? null;

  const permiso = evaluarEscritura({
    correo,
    listaEditores: listaEditoresDelEntorno(),
    listaBlanca: parsearListaBlanca(process.env.ALLOWED_EMAILS),
  });

  if (permiso.permitido) return null;
  if (permiso.motivo === 'sin-editores') return { clase: 'sin-editores' };
  return { clase: 'no-es-editor', correo: correo ?? '' };
}

export async function EstadoEscritura({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.esDemo) return null;

  const motivo = await diagnosticar(snapshot);
  if (motivo === null) return null;

  if (motivo.clase === 'tablas') {
    return (
      <Aviso tono="alerta" titulo="Todavía no se puede registrar nada">
        <p>
          Faltan {motivo.faltan.length === 1 ? 'la tabla' : 'las tablas'}{' '}
          <strong>{motivo.faltan.join(', ')}</strong> en Airtable. Sin ellas no hay dónde
          guardar un gasto, así que el panel no muestra el botón de registrar en vez de
          dejarte llenar un formulario que va a fallar.
        </p>
        <p className="mt-2">
          Se crean de una vez con un token temporal:{' '}
          <code className="rounded bg-superficie/50 px-1.5 py-0.5 font-mono text-xs">
            AIRTABLE_SCHEMA_TOKEN=pat… npm run crear-tablas
          </code>
          . Está explicado paso a paso en el README.
        </p>
      </Aviso>
    );
  }

  if (motivo.clase === 'sin-editores') {
    return (
      <Aviso tono="alerta" titulo="Nadie puede registrar todavía">
        <p>
          La variable <code className="font-mono text-xs">EDITOR_EMAILS</code> está vacía en
          Vercel, y vacía no significa &laquo;todos&raquo;: significa nadie. Ponle los correos
          de quienes lleven las cuentas, separados por coma, y vuelve a desplegar.
        </p>
      </Aviso>
    );
  }

  return (
    <Aviso tono="neutro" titulo="Puedes consultar, pero no registrar">
      <p>
        Tu correo{motivo.correo && ` (${motivo.correo})`} no está en{' '}
        <code className="font-mono text-xs">EDITOR_EMAILS</code>. Puedes ver todo el panel;
        para anotar gastos, pídele a quien administra el despliegue que te agregue.
      </p>
    </Aviso>
  );
}

function Aviso({
  tono,
  titulo,
  children,
}: {
  tono: 'alerta' | 'neutro';
  titulo: string;
  children: React.ReactNode;
}) {
  const clases =
    tono === 'alerta'
      ? 'border-alerta-borde bg-alerta-fondo text-alerta-texto'
      : 'border-borde bg-superficie-2 text-texto-suave';

  return (
    <div role="status" className={`rounded-(--radius-tarjeta) border p-4 text-sm ${clases}`}>
      <p className="font-semibold">{titulo}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
