/**
 * Íconos en SVG inline.
 *
 * Sin librería de íconos: son trazos sueltos y el brief pide no agregar
 * dependencias pesadas. Nunca emojis — su forma y color dependen del
 * sistema operativo y no se pueden teñir con el token de la marca.
 */
type Props = { className?: string };

const base = 'size-5 shrink-0';
const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * La retícula de cuatro paneles: es lo que hay al otro lado del enlace.
 *
 * Antes era una línea de latido. Se veía bien suelta, pero al lado de los
 * demás íconos —todos contornos de objetos— parecía de otra familia, y una
 * línea de electrocardiograma no dice "resumen" en un panel de plata.
 */
export function IconoGeneral({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function IconoMovimientos({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M4 7h13M14 4l3 3-3 3" />
      <path d="M20 17H7M10 20l-3-3 3-3" />
    </svg>
  );
}

export function IconoCuotas({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11M15 9v11" />
    </svg>
  );
}

export function IconoProyectos({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function IconoEventos({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconoDonantes({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function IconoActualizar({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function IconoSol({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconoLuna({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function IconoSistema({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function IconoSalir({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

// ───────────────── Íconos de la interfaz nueva ─────────────────

export function IconoBuscar({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconoMas({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconoCerrar({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconoEditar({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

export function IconoAlerta({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M12 4 2.5 20h19Z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  );
}

export function IconoArriba({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconoAbajo({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function IconoBanco({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
    </svg>
  );
}

export function IconoRegalo({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...trazo}>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M3 13h18M12 9v11" />
      <path d="M12 9S10.5 4 8 4a2 2 0 0 0 0 5ZM12 9s1.5-5 4-5a2 2 0 0 1 0 5Z" />
    </svg>
  );
}
