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
}: Base & { valorInicial?: string | number | null }) {
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

// ─────────────────── Controles del registro rápido ───────────────────

/**
 * Interruptor de dos opciones, del ancho de la tarjeta.
 *
 * Reemplaza un `<select>` de dos valores. Un desplegable para elegir entre
 * gasto e ingreso son tres toques —abrir, buscar, elegir— para la decisión
 * más frecuente del formulario; así es uno solo, y se ve cuál está activo sin
 * abrir nada.
 *
 * Por dentro son radios de verdad, no botones con estado: funcionan con el
 * teclado y con lector de pantalla sin que haya que programarlo.
 */
export function Interruptor({
  nombre,
  etiqueta,
  opciones,
  valorInicial,
  onCambio,
}: {
  nombre: string;
  etiqueta: string;
  opciones: { valor: string; texto: string; icono?: ReactNode }[];
  valorInicial: string;
  onCambio?: (valor: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-texto">{etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2 rounded-(--radius-interno) bg-superficie-2 p-1">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className="relative cursor-pointer text-center"
          >
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              defaultChecked={o.valor === valorInicial}
              onChange={() => onCambio?.(o.valor)}
              className="peer sr-only"
            />
            <span className="flex items-center justify-center gap-1.5 rounded-[calc(var(--radius-interno)-0.25rem)] px-3 py-2 text-sm font-medium text-texto-suave transition-colors duration-200 peer-checked:bg-superficie peer-checked:text-texto peer-checked:shadow-(--sombra-tarjeta) peer-focus-visible:ring-2 peer-focus-visible:ring-anillo">
              {o.icono}
              {o.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * El campo de monto del registro rápido: grande y lo primero que se toca.
 *
 * `autoFocus` porque el monto es el dato que la persona ya tiene en la mano
 * —está mirando el recibo— y todo lo demás lo puede reconstruir después.
 */
export function MontoGrande({
  nombre,
  etiqueta,
  error,
  valorInicial,
  onCambio,
}: {
  nombre: string;
  etiqueta: string;
  error?: string;
  /** Número del registro guardado, o el texto crudo que se acaba de enviar. */
  valorInicial?: string | number | null;
  onCambio?: (valor: string) => void;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <div
        className={`flex items-center gap-1 rounded-(--radius-interno) border bg-superficie px-3 focus-within:ring-2 focus-within:ring-anillo ${borde(error)}`}
      >
        <span aria-hidden="true" className="text-2xl font-semibold text-texto-tenue">
          $
        </span>
        <input
          id={id}
          name={nombre}
          type="text"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          placeholder="25.000"
          defaultValue={valorInicial !== null && valorInicial !== undefined ? String(valorInicial) : ''}
          onChange={(e) => onCambio?.(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent py-2.5 text-2xl font-semibold tabular text-texto placeholder:font-normal placeholder:text-texto-tenue focus-visible:outline-none"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-riesgo-texto">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-texto-tenue">En pesos. Los puntos de miles dan igual.</p>
      )}
    </div>
  );
}

/**
 * Categorías como fichas: se ven todas y se elige con un toque.
 *
 * Un desplegable esconde las opciones hasta que lo abres, y con diez
 * categorías eso obliga a recordarlas. Aquí están a la vista, y la lista se
 * acorta según sea gasto o ingreso: nadie clasifica un gasto como "Cuotas".
 */
export function Fichas({
  nombre,
  etiqueta,
  opciones,
  valorInicial,
  ayuda,
}: {
  nombre: string;
  etiqueta: string;
  opciones: readonly string[];
  valorInicial?: string | null;
  ayuda?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-texto">{etiqueta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <label key={o} className="cursor-pointer">
            <input
              type="radio"
              name={nombre}
              value={o}
              defaultChecked={o === valorInicial}
              className="peer sr-only"
            />
            <span className="inline-block rounded-full border border-borde-control px-3 py-1.5 text-sm text-texto-suave transition-colors duration-200 peer-checked:border-acento peer-checked:bg-acento-suave peer-checked:font-medium peer-checked:text-acento peer-focus-visible:ring-2 peer-focus-visible:ring-anillo">
              {o}
            </span>
          </label>
        ))}
      </div>
      {ayuda && <p className="mt-1.5 text-xs text-texto-tenue">{ayuda}</p>}
    </fieldset>
  );
}

/**
 * Lo que casi nunca hay que tocar, plegado.
 *
 * `<details>` del navegador y no un acordeón a mano: recuerda su estado al
 * abrirlo, funciona con teclado, y el buscador del navegador (Ctrl+F)
 * encuentra lo de adentro aunque esté cerrado.
 */
export function MasOpciones({ children }: { children: ReactNode }) {
  return (
    <details className="group rounded-(--radius-interno) border border-borde">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-texto-suave marker:content-[''] hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none">
        <span className="inline-block transition-transform duration-200 group-open:rotate-90">
          ›
        </span>{' '}
        Más opciones
        <span className="ml-1 font-normal text-texto-tenue">
          — proyecto, evento, aprobación
        </span>
      </summary>
      <div className="space-y-4 border-t border-borde px-3 py-4">{children}</div>
    </details>
  );
}

/**
 * La confirmación que sale al guardar.
 *
 * Antes el modal se cerraba y ya: no había forma de saber si el movimiento
 * había llegado a Airtable o si se había perdido. En un libro contable esa
 * duda hace que la gente registre el mismo gasto dos veces "por si acaso".
 *
 * "Registrar otro" está de primero a propósito: quien abre esto suele venir
 * con tres recibos en la mano, no con uno.
 */
export function Confirmacion({
  mensaje,
  detalle,
  onOtro,
  onListo,
  textoOtro = 'Registrar otro',
}: {
  mensaje: string;
  detalle?: string;
  /** Solo donde se registra en tanda. Un proyecto se crea de a uno. */
  onOtro?: () => void;
  onListo: () => void;
  textoOtro?: string;
}) {
  return (
    <div role="status" className="space-y-4 py-2 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-ok-fondo text-ok-texto">
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </div>

      <div>
        <p className="text-base font-semibold text-texto">{mensaje}</p>
        {detalle && <p className="mt-0.5 text-sm text-texto-suave">{detalle}</p>}
        <p className="mt-1 text-xs text-texto-tenue">Ya quedó guardado en Airtable.</p>
      </div>

      <div className="flex justify-center gap-2">
        {onOtro && (
          <button
            type="button"
            onClick={onOtro}
            className="cursor-pointer rounded-full bg-acento px-4 py-2 text-sm font-medium text-texto-invertido transition-colors duration-200 hover:bg-acento-hover focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
          >
            {textoOtro}
          </button>
        )}
        <button
          type="button"
          onClick={onListo}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none ${
            onOtro
              ? 'border border-borde-control text-texto hover:bg-superficie-2'
              : 'bg-acento text-texto-invertido hover:bg-acento-hover'
          }`}
        >
          Listo
        </button>
      </div>
    </div>
  );
}
