'use client';

import { useId, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Los campos de los formularios del panel.
 *
 * Tres cosas que se hacen aquí una vez y no en cada formulario:
 *
 * 1. El error va debajo del campo y unido a él con `aria-describedby`. Un
 *    resumen de errores arriba obliga a quien usa lector de pantalla a
 *    recorrer el formulario de memoria buscando cuál falló.
 * 2. El campo con error no se marca solo con el borde rojo: lleva su texto.
 * 3. `aria-invalid` para que la ayuda técnica lo anuncie como inválido.
 */

const CLASES_CONTROL =
  'w-full rounded-(--radius-interno) border bg-superficie px-3 py-2 text-sm text-texto placeholder:text-texto-tenue focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none disabled:opacity-60';

function borde(error?: string): string {
  return error ? 'border-riesgo-borde' : 'border-borde-control';
}

interface Base {
  nombre: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
}

function Envoltura({
  id,
  etiqueta,
  error,
  ayuda,
  requerido,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-texto">
        {etiqueta}
        {requerido && (
          <span className="text-riesgo-texto" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-texto-tenue">{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-riesgo-texto">
          {error}
        </p>
      )}
    </div>
  );
}

export function Campo({
  nombre,
  etiqueta,
  error,
  ayuda,
  requerido,
  tipo = 'text',
  valorInicial,
  marcador,
  inputMode,
}: Base & {
  tipo?: 'text' | 'date' | 'email';
  valorInicial?: string | null;
  marcador?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
}) {
  const id = useId();

  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido}>
      <input
        id={id}
        name={nombre}
        type={tipo}
        inputMode={inputMode}
        defaultValue={valorInicial ?? ''}
        placeholder={marcador}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CONTROL} ${borde(error)}`}
      />
    </Envoltura>
  );
}

/**
 * Campo de plata.
 *
 * `inputMode="numeric"` abre el teclado de números en el celular, que es
 * donde el tesorero registra en mitad de un evento. No es `type="number"`
 * a propósito: ése rechaza "25.000" —el punto de miles colombiano— y además
 * cambia el valor cuando alguien pasa la rueda del mouse por encima.
 */
export function CampoMonto({
  nombre,
  etiqueta,
  error,
  ayuda = 'En pesos. Puedes escribirlo con puntos: 25.000',
  requerido,
  valorInicial,
}: Base & { valorInicial?: number | null }) {
  return (
    <Campo
      nombre={nombre}
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      requerido={requerido}
      inputMode="numeric"
      marcador="25.000"
      valorInicial={valorInicial !== null && valorInicial !== undefined ? String(valorInicial) : ''}
    />
  );
}

export function Seleccion({
  nombre,
  etiqueta,
  error,
  ayuda,
  requerido,
  opciones,
  valorInicial,
  vacio,
}: Base & {
  opciones: readonly string[] | { valor: string; texto: string }[];
  valorInicial?: string | null;
  /** Texto de la opción en blanco. Sin él, el campo es obligatorio de hecho. */
  vacio?: string;
}) {
  const id = useId();

  const normalizadas = opciones.map((o) =>
    typeof o === 'string' ? { valor: o, texto: o } : o,
  );

  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido}>
      <select
        id={id}
        name={nombre}
        defaultValue={valorInicial ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CONTROL} ${borde(error)}`}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {normalizadas.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Envoltura>
  );
}

export function AreaTexto({
  nombre,
  etiqueta,
  error,
  ayuda,
  requerido,
  valorInicial,
  filas = 3,
}: Base & { valorInicial?: string | null; filas?: number }) {
  const id = useId();

  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido}>
      <textarea
        id={id}
        name={nombre}
        rows={filas}
        defaultValue={valorInicial ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CONTROL} ${borde(error)} resize-y`}
      />
    </Envoltura>
  );
}

export function Casilla({
  nombre,
  etiqueta,
  ayuda,
  valorInicial = false,
}: {
  nombre: string;
  etiqueta: string;
  ayuda?: string;
  valorInicial?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        name={nombre}
        type="checkbox"
        defaultChecked={valorInicial}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-borde-control accent-acento focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-texto">
        {etiqueta}
        {ayuda && <span className="block text-xs text-texto-tenue">{ayuda}</span>}
      </label>
    </div>
  );
}

/**
 * El botón de guardar.
 *
 * Se deshabilita solo mientras la acción está en vuelo. Sin eso, un doble
 * clic en una conexión lenta registra el movimiento dos veces — y en un libro
 * contable un asiento duplicado se descubre semanas después, cuadrando caja.
 */
export function BotonGuardar({ children = 'Guardar' }: { children?: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex cursor-pointer items-center justify-center rounded-full bg-acento px-4 py-2 text-sm font-medium text-texto-invertido transition-colors duration-200 hover:bg-acento-hover focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none disabled:cursor-progress disabled:opacity-70"
    >
      {pending ? 'Guardando…' : children}
    </button>
  );
}

/** El aviso de arriba del formulario: lo que falló y no es de un campo. */
export function AvisoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;

  return (
    <p
      role="alert"
      className="rounded-(--radius-interno) border border-riesgo-borde bg-riesgo-fondo px-3 py-2 text-sm text-riesgo-texto"
    >
      {mensaje}
    </p>
  );
}
