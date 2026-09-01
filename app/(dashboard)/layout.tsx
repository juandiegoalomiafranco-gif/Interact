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
      <aside className="hidden w-64 shrink-0 flex-col bg-barra md:flex">
        <div className="px-5 py-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-barra-acento uppercase">
            Club Interact
          </p>
          <p className="mt-0.5 text-base font-semibold text-barra-texto">Finanzas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLateral />
        </div>

        <div className="p-3">
          {correo && (
            <p className="mb-2 truncate px-3 text-xs text-barra-texto-tenue" title={correo}>
              {correo}
            </p>
          )}
          <div className="flex items-center gap-2">
            <InterruptorDeTema enBarra />
            <form
              className="flex-1"
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius-interno) border border-barra-activo px-3 py-2 text-sm font-medium text-barra-texto-tenue transition-colors duration-200 hover:bg-barra-activo hover:text-barra-texto focus-visible:ring-2 focus-visible:ring-barra-acento focus-visible:outline-none"
              >
                <IconoSalir className="size-4 shrink-0" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Encabezado — móvil */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-barra px-4 py-3 md:hidden">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-barra-acento uppercase">
            Club Interact
          </p>
          <p className="text-sm font-semibold text-barra-texto">Finanzas</p>
        </div>
        <div className="flex items-center gap-2">
          <InterruptorDeTema enBarra />
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="inline-flex cursor-pointer items-center justify-center rounded-(--radius-interno) border border-barra-activo p-2 text-barra-texto-tenue transition-colors duration-200 hover:bg-barra-activo hover:text-barra-texto focus-visible:ring-2 focus-visible:ring-barra-acento focus-visible:outline-none"
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
