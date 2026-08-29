import { auth, signOut } from '@/auth';
import { IconoSalir } from '@/components/iconos';
import { NavInferior, NavLateral } from '@/components/navegacion';
import { InterruptorDeTema } from '@/components/tema';

/**
 * Shell del panel: barra lateral fija en escritorio, barra inferior en móvil.
 * El login vive en (auth) y no pasa por aquí.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await auth();
  const correo = sesion?.user?.email ?? null;

  return (
    <div className="min-h-dvh md:flex">
      {/* Barra lateral — escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-borde bg-superficie md:flex">
        <div className="border-b border-borde px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-acento uppercase">
            Club Interact
          </p>
          <p className="mt-0.5 text-sm font-semibold text-texto">Finanzas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLateral />
        </div>

        <div className="border-t border-borde p-3">
          {correo && (
            <p className="mb-2 truncate px-3 text-xs text-texto-tenue" title={correo}>
              {correo}
            </p>
          )}
          <div className="flex items-center gap-2">
            <InterruptorDeTema />
            <form
              className="flex-1"
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-borde px-3 py-2 text-sm font-medium text-texto-suave transition-colors duration-200 hover:bg-superficie-2 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:ring-offset-2 focus-visible:ring-offset-superficie focus-visible:outline-none"
              >
                <IconoSalir className="size-4 shrink-0" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Encabezado — móvil */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-borde bg-superficie px-4 py-3 md:hidden">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-acento uppercase">
            Club Interact
          </p>
          <p className="text-sm font-semibold text-texto">Finanzas</p>
        </div>
        <div className="flex items-center gap-2">
          <InterruptorDeTema />
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-borde p-2 text-texto-suave transition-colors duration-200 hover:bg-superficie-2 hover:text-texto focus-visible:ring-2 focus-visible:ring-anillo focus-visible:outline-none"
            >
              <IconoSalir />
            </button>
          </form>
        </div>
      </header>

      {/* pb-20 en móvil deja aire para que la barra inferior no tape el
          último dato de la página. */}
      <main className="min-w-0 flex-1 px-4 pt-5 pb-20 md:px-8 md:py-8">{children}</main>

      <NavInferior />
    </div>
  );
}
