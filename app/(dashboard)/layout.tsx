import { auth, signOut } from '@/auth';
import { BarraSuperior } from '@/components/barra-superior';
import { FranjaDemo } from '@/components/aviso-lectura';
import { IconoSalir } from '@/components/iconos';
import { NavInferior, NavLateral } from '@/components/navegacion';
import { datos } from '@/lib/datos';
import { construirIndice } from '@/lib/indice-busqueda';
import { alertas } from '@/lib/metrics';

/**
 * Shell del panel: barra lateral fija en escritorio, barra inferior en móvil,
 * y arriba el buscador con el estado de la cuenta.
 *
 * El layout lee el snapshot igual que las páginas, pero `datos()` está
 * envuelto en `cache()` de React: las dos lecturas de una misma petición son
 * una sola llamada a Airtable.
 *
 * El login vive en (auth) y no pasa por aquí.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await auth();
  const correo = sesion?.user?.email ?? null;

  const { snapshot } = await datos();

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
          <form
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
      </aside>

      {/* Encabezado — móvil. La marca vive aquí porque en móvil no hay
          barra lateral que la sostenga. */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-barra px-4 py-3 md:hidden">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-barra-acento uppercase">
            Club Interact
          </p>
          <p className="text-sm font-semibold text-barra-texto">Finanzas</p>
        </div>
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
      </header>

      {/* pb-20 en móvil deja aire para que la barra inferior no tape el
          último dato de la página. */}
      <main className="min-w-0 flex-1 px-4 pt-3 pb-20 md:px-8 md:pt-4 md:pb-8">
        <BarraSuperior
          correo={correo}
          indice={construirIndice(snapshot)}
          alertas={alertas(snapshot).length}
        />
        <FranjaDemo visible={snapshot.esDemo === true} />
        {children}
      </main>

      <NavInferior />
    </div>
  );
}
