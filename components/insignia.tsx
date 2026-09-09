import type { ReactNode } from 'react';
import type { Semaforo } from '@/lib/metrics';

/**
 * Etiquetas de estado.
 *
 * Cada tono lleva SIEMPRE su texto al lado. Un punto de color solo es
 * ilegible para quien no distingue rojo de verde —y en un salón de clase eso
 * es uno de cada doce muchachos— y también para quien imprime el reporte en
 * blanco y negro para la reunión.
 */

export type Tono = 'neutro' | 'ok' | 'alerta' | 'riesgo' | 'acento';

const TONOS: Record<Tono, string> = {
  neutro: 'bg-superficie-2 text-texto-suave',
  ok: 'bg-ok-fondo text-ok-texto',
  alerta: 'bg-alerta-fondo text-alerta-texto',
  riesgo: 'bg-riesgo-fondo text-riesgo-texto',
  acento: 'bg-acento-suave text-acento',
};

export function Insignia({
  tono = 'neutro',
  children,
}: {
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}

const TEXTO_SEMAFORO: Record<Semaforo, { tono: Tono; texto: string }> = {
  ok: { tono: 'ok', texto: 'En presupuesto' },
  alerta: { tono: 'alerta', texto: 'Cerca del tope' },
  riesgo: { tono: 'riesgo', texto: 'Sobregirado' },
};

/**
 * El semáforo de un proyecto, con su significado escrito.
 *
 * Sin presupuesto aprobado no hay semáforo, y eso NO es verde: es que no hay
 * contra qué comparar. Pintarlo de verde diría que el proyecto va bien
 * cuando lo que pasa es que nadie le aprobó plata.
 */
export function InsigniaSemaforo({ semaforo }: { semaforo: Semaforo | null }) {
  if (semaforo === null) return <Insignia tono="neutro">Sin presupuesto</Insignia>;
  const { tono, texto } = TEXTO_SEMAFORO[semaforo];
  return <Insignia tono={tono}>{texto}</Insignia>;
}

/** Estados de texto libre que vienen de Airtable (proyectos, eventos). */
export function InsigniaEstado({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-xs text-texto-tenue">Sin estado</span>;

  const normalizado = estado.toLowerCase();
  const tono: Tono = normalizado.includes('curso') || normalizado.includes('progreso')
    ? 'acento'
    : normalizado.includes('cerrado') || normalizado.includes('complet') || normalizado.includes('finaliz')
      ? 'ok'
      : normalizado.includes('cancel')
        ? 'riesgo'
        : 'neutro';

  return <Insignia tono={tono}>{estado}</Insignia>;
}
