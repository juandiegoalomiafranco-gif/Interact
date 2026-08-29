'use client';

import { useEffect, useState } from 'react';
import { IconoLuna, IconoSistema, IconoSol } from './iconos';

export const TEMAS = ['sistema', 'claro', 'oscuro'] as const;
export type Tema = (typeof TEMAS)[number];

const CLAVE = 'tema';

/**
 * Se inyecta en <head> y corre ANTES del primer pintado.
 *
 * Sin esto, quien tiene el tema oscuro ve un destello blanco en cada carga:
 * el HTML llega sin `data-tema` y React solo lo estampa cuando hidrata, que
 * es varios cuadros después. El try/catch cubre el modo incógnito y los
 * navegadores con el almacenamiento bloqueado, donde `localStorage` lanza.
 */
export function ScriptDeTema() {
  const codigo = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CLAVE)});if(t==='oscuro'||t==='claro'){document.documentElement.dataset.tema=t}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;

  try {
    if (tema === 'sistema') localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, tema);
  } catch {
    // Almacenamiento bloqueado: el tema vale para esta pestaña y ya.
  }
}

function leerTema(): Tema {
  if (typeof document === 'undefined') return 'sistema';
  const t = document.documentElement.dataset.tema;
  return t === 'claro' || t === 'oscuro' ? t : 'sistema';
}

const ETIQUETAS: Record<Tema, string> = {
  sistema: 'Tema del sistema',
  claro: 'Tema claro',
  oscuro: 'Tema oscuro',
};

const ICONOS: Record<Tema, typeof IconoSol> = {
  sistema: IconoSistema,
  claro: IconoSol,
  oscuro: IconoLuna,
};

export function InterruptorDeTema({ className = '' }: { className?: string }) {
  // Arranca en 'sistema' para que servidor y cliente rendericen lo mismo;
  // el valor real se lee tras montar. Sin esto, React se queja de que el
  // HTML del servidor no coincide con el del navegador.
  const [tema, setTema] = useState<Tema>('sistema');
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setTema(leerTema());
    setMontado(true);
  }, []);

  const siguiente = TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length] ?? 'sistema';
  const Icono = ICONOS[tema];

  return (
    <button
      type="button"
      onClick={() => {
        aplicar(siguiente);
        setTema(siguiente);
      }}
      // Antes de montar no sabemos el tema real: el ícono sería mentira.
      suppressHydrationWarning
      aria-label={`${ETIQUETAS[tema]}. Cambiar a ${ETIQUETAS[siguiente].toLowerCase()}`}
      title={ETIQUETAS[tema]}
      className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-borde p-2 text-texto-suave transition-colors duration-200 hover:bg-superficie-2 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:ring-offset-2 focus-visible:ring-offset-superficie focus-visible:outline-none ${className}`}
    >
      <Icono className={montado ? 'size-5 shrink-0' : 'size-5 shrink-0 opacity-0'} />
    </button>
  );
}
