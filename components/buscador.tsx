'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconoBuscar, IconoCerrar } from './iconos';

/**
 * Buscador de todo el panel.
 *
 * Recibe un índice plano armado en el servidor, NO el snapshot entero: un
 * miembro son cuatro strings aquí y un objeto con estado, fechas y enlaces
 * allá. Mandar todo al navegador para poder filtrar por nombre engordaría
 * cada carga con datos que la búsqueda no usa.
 */

export interface EntradaIndice {
  id: string;
  titulo: string;
  detalle: string;
  seccion: string;
  href: string;
}

/**
 * Normaliza para comparar: sin tildes y en minúsculas.
 *
 * Media base está escrita con tildes y nadie las teclea al buscar. Sin esto,
 * escribir "recaudacion" no encontraría "Recaudación" y el buscador se
 * sentiría roto sin estarlo.
 */
function plano(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function Buscador({ indice }: { indice: EntradaIndice[] }) {
  const [consulta, setConsulta] = useState('');
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const idLista = useId();

  const resultados = useMemo(() => {
    const q = plano(consulta.trim());
    if (q.length < 2) return [];

    return indice
      .map((e) => {
        const titulo = plano(e.titulo);
        // Lo que empieza igual pesa más que lo que solo contiene el texto:
        // buscando "Ana" importa más la persona que un "Semana de la salud".
        const puntaje = titulo.startsWith(q) ? 0 : titulo.includes(q) ? 1 : plano(e.detalle).includes(q) ? 2 : -1;
        return { e, puntaje };
      })
      .filter((x) => x.puntaje >= 0)
      .sort((a, b) => a.puntaje - b.puntaje)
      .slice(0, 8)
      .map((x) => x.e);
  }, [consulta, indice]);

  // Cerrar al hacer clic afuera y con Escape: sin esto el desplegable se
  // queda tapando la página después de navegar.
  useEffect(() => {
    if (!abierto) return;

    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  const hayQueMostrar = abierto && consulta.trim().length >= 2;

  return (
    <div ref={caja} className="relative w-full max-w-md">
      <div className="relative">
        <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-tenue" />
        <input
          // `text`, no `search`: Chrome le pinta su propia X a los de tipo
          // search, y al lado de la nuestra quedaban dos botones de limpiar
          // pegados, uno de ellos sin etiqueta para el lector de pantalla.
          type="text"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar miembro, proyecto, movimiento…"
          aria-label="Buscar en el panel"
          // Un input de búsqueda es un `searchbox`, y ese rol no admite
          // aria-expanded: hay que declararlo combobox para que la ayuda
          // técnica anuncie que abajo se despliega una lista de resultados.
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hayQueMostrar}
          aria-controls={idLista}
          className="w-full rounded-full border border-borde-control bg-superficie py-2 pr-9 pl-9 text-sm text-texto placeholder:text-texto-tenue focus-visible:border-acento focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
        />
        {consulta !== '' && (
          <button
            type="button"
            onClick={() => {
              setConsulta('');
              setAbierto(false);
            }}
            aria-label="Limpiar la búsqueda"
            className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-texto-tenue hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
          >
            <IconoCerrar className="size-4" />
          </button>
        )}
      </div>

      {hayQueMostrar && (
        <div
          id={idLista}
          role="listbox"
          className="tarjeta absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden border border-borde"
        >
          {resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-texto-suave">
              Nada que coincida con «{consulta.trim()}».
            </p>
          ) : (
            <ul>
              {resultados.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    onClick={() => setAbierto(false)}
                    className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-superficie-2 focus-visible:bg-superficie-2 focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-texto">
                        {r.titulo}
                      </span>
                      <span className="block truncate text-xs text-texto-tenue">{r.detalle}</span>
                    </span>
                    <span className="shrink-0 text-xs text-texto-tenue">{r.seccion}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
