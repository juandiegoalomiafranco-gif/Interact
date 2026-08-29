'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  IconoCuotas,
  IconoDonantes,
  IconoEventos,
  IconoGeneral,
  IconoProyectos,
} from './iconos';

interface Ruta {
  href: string;
  etiqueta: string;
  /** Versión corta para la barra inferior, donde el ancho es de 20 % de pantalla. */
  corta: string;
  Icono: ComponentType<{ className?: string }>;
}

export const RUTAS: Ruta[] = [
  { href: '/', etiqueta: 'General', corta: 'General', Icono: IconoGeneral },
  { href: '/cuotas', etiqueta: 'Cuotas', corta: 'Cuotas', Icono: IconoCuotas },
  { href: '/proyectos', etiqueta: 'Proyectos', corta: 'Proyectos', Icono: IconoProyectos },
  { href: '/eventos', etiqueta: 'Eventos', corta: 'Eventos', Icono: IconoEventos },
  { href: '/donantes', etiqueta: 'Donantes', corta: 'Donantes', Icono: IconoDonantes },
];

function estaActiva(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Navegación lateral, solo en escritorio. */
export function NavLateral() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {RUTAS.map(({ href, etiqueta, Icono }) => {
        const activa = estaActiva(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-[--radius-interno] px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-barra-acento focus-visible:outline-none ${
              activa
                ? 'bg-barra-activo text-barra-acento'
                : 'text-barra-texto-tenue hover:bg-barra-activo hover:text-barra-texto'
            }`}
          >
            <Icono />
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Barra inferior, solo en móvil.
 *
 * El tesorero abre esto desde el celular en mitad de un evento, así que la
 * navegación va donde llega el pulgar. Cada destino ocupa al menos 44 px de
 * alto, el mínimo táctil recomendado.
 */
export function NavInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {RUTAS.map(({ href, corta, etiqueta, Icono }) => {
          const activa = estaActiva(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activa ? 'page' : undefined}
                aria-label={etiqueta}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-anillo focus-visible:ring-inset focus-visible:outline-none ${
                  activa ? 'text-acento' : 'text-texto-tenue'
                }`}
              >
                <Icono />
                <span className="truncate">{corta}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
