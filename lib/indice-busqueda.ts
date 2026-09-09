import type { EntradaIndice } from '@/components/buscador';
import { formatCOP, formatFecha } from '@/lib/format';
import type { Snapshot } from '@/types/domain';

/**
 * Arma el índice del buscador desde el snapshot.
 *
 * Se hace en el servidor y a propósito plano: cuatro strings por registro en
 * vez del objeto entero. Mandar el snapshot completo al navegador para poder
 * filtrar por nombre engordaría cada carga con estados, fechas y enlaces que
 * la búsqueda no usa.
 *
 * Los movimientos se limitan a los más recientes: un club con tres años de
 * historia tendría miles, y nadie busca por texto un gasto de hace dos años
 * desde la barra de arriba — para eso está el filtro de la vista.
 */
const TOPE_MOVIMIENTOS = 150;

export function construirIndice(s: Snapshot): EntradaIndice[] {
  const entradas: EntradaIndice[] = [];

  for (const m of s.miembros) {
    entradas.push({
      id: `miembro-${m.id}`,
      titulo: m.nombre,
      detalle: [m.rol, m.estado].filter(Boolean).join(' · ') || 'Miembro del club',
      seccion: 'Cuotas',
      href: '/cuotas',
    });
  }

  for (const p of s.proyectos) {
    entradas.push({
      id: `proyecto-${p.id}`,
      titulo: p.nombre,
      detalle: [p.estado, p.areaDeEnfoque].filter(Boolean).join(' · ') || 'Proyecto',
      seccion: 'Proyectos',
      href: '/proyectos',
    });
  }

  for (const e of s.eventos) {
    entradas.push({
      id: `evento-${e.id}`,
      titulo: e.nombre,
      detalle: [e.estado, formatFecha(e.fecha)].filter(Boolean).join(' · '),
      seccion: 'Eventos',
      href: '/eventos',
    });
  }

  for (const d of s.donantes) {
    entradas.push({
      id: `donante-${d.id}`,
      titulo: d.nombre,
      detalle: d.tipo ?? 'Donante',
      seccion: 'Donantes',
      href: '/donantes',
    });
  }

  const recientes = [...s.movimientos]
    .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
    .slice(0, TOPE_MOVIMIENTOS);

  for (const m of recientes) {
    entradas.push({
      id: `movimiento-${m.id}`,
      titulo: m.concepto,
      detalle: `${m.tipo ?? 'Sin tipo'} · ${formatCOP(m.monto)} · ${formatFecha(m.fecha)}`,
      seccion: 'General',
      href: '/',
    });
  }

  return entradas;
}
