import type { EstadoCuota } from '@/types/domain';

/**
 * Marca visual de cada estado en la matriz de cuotas.
 *
 * La matriz NO puede depender solo del color: hay que poder leerla en
 * escala de grises. Y las iniciales solas no alcanzan, porque tres de los
 * cuatro estados empiezan con P — Pagado, Parcial y Pendiente.
 *
 *   Pagado    → P   inicial libre
 *   Parcial   → ½   se lee al instante y no depende del idioma
 *   Pendiente → D   de "debe"; natural en uso colombiano y no choca
 *   Exonerado → E   inicial libre
 *   sin dato  → celda vacía; es ausencia de registro, no un estado
 */
export interface MarcaCuota {
  letra: string;
  /** Se lee en voz alta y sale en el tooltip. */
  etiqueta: string;
  /** Clases de Tailwind, siempre sobre tokens semánticos. */
  clases: string;
}

const MARCAS: Record<EstadoCuota, MarcaCuota> = {
  Pagado: {
    letra: 'P',
    etiqueta: 'Pagado',
    clases: 'bg-pagado-fondo text-pagado-texto',
  },
  Parcial: {
    letra: '½',
    etiqueta: 'Pago parcial',
    clases: 'bg-parcial-fondo text-parcial-texto',
  },
  Pendiente: {
    letra: 'D',
    etiqueta: 'Pendiente de pago',
    clases: 'bg-pendiente-fondo text-pendiente-texto',
  },
  Exonerado: {
    letra: 'E',
    etiqueta: 'Exonerado',
    clases: 'bg-exonerado-fondo text-exonerado-texto',
  },
};

const SIN_REGISTRO: MarcaCuota = {
  letra: '',
  etiqueta: 'Sin registro',
  clases: 'bg-superficie-2/40 text-texto-tenue',
};

export function marcaDe(estado: EstadoCuota | null | undefined): MarcaCuota {
  return estado ? MARCAS[estado] : SIN_REGISTRO;
}

/** Para la leyenda de la vista Cuotas. */
export const LEYENDA_CUOTAS: { estado: EstadoCuota; marca: MarcaCuota }[] = (
  Object.keys(MARCAS) as EstadoCuota[]
).map((estado) => ({ estado, marca: MARCAS[estado] }));
