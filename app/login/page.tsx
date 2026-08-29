import type { Metadata } from 'next';
import { signIn } from '@/auth';

export const metadata: Metadata = { title: 'Entrar · Finanzas Interact' };

/**
 * Única ruta pública del panel.
 *
 * Los mensajes de error dicen qué pasó de verdad. A quien tiene derecho a
 * entrar le hace falta saber a quién pedirle acceso; a quien no lo tiene, el
 * mensaje no le entrega nada que no supiera ya sobre su propio correo.
 */

const MENSAJES: Record<string, { titulo: string; detalle: string }> = {
  AccessDenied: {
    titulo: 'Tu correo no está autorizado',
    detalle:
      'Este panel es solo para el comité de finanzas y la junta directiva. Si crees que deberías tener acceso, pídele al comité que agregue tu correo.',
  },
  Configuration: {
    titulo: 'El panel no está bien configurado',
    detalle:
      'Falta la lista de correos autorizados o las credenciales de Google. Avísale a quien administra el despliegue.',
  },
  Verification: {
    titulo: 'No se pudo verificar tu correo',
    detalle: 'Google no confirmó tu dirección. Intenta de nuevo con una cuenta verificada.',
  },
};

const GENERICO = {
  titulo: 'No se pudo iniciar sesión',
  detalle: 'Vuelve a intentarlo. Si sigue fallando, avísale al comité de finanzas.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; destino?: string }>;
}) {
  const { error, destino } = await searchParams;
  const aviso = error ? (MENSAJES[error] ?? GENERICO) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-tinta-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-interact-600 uppercase">
            Club Interact
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-tinta-900">Finanzas</h1>
          <p className="mt-2 text-sm text-tinta-600">
            Panel del comité. Entra con el correo que registró el club.
          </p>
        </div>

        {aviso && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-riesgo-500/25 bg-riesgo-100 p-4"
          >
            <p className="text-sm font-semibold text-riesgo-500">{aviso.titulo}</p>
            <p className="mt-1 text-sm text-tinta-700">{aviso.detalle}</p>
          </div>
        )}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: destino ?? '/' });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-tinta-200 bg-white px-4 py-3 text-sm font-medium text-tinta-900 shadow-sm transition hover:bg-tinta-50 focus-visible:ring-2 focus-visible:ring-interact-600 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
              />
            </svg>
            Entrar con Google
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-tinta-500">
          El acceso está restringido a una lista de correos. Este panel maneja datos de
          miembros menores de edad y no es público.
        </p>
      </div>
    </main>
  );
}
