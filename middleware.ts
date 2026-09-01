import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from 'next/server';
import { auth } from '@/auth';
import { bloqueaLogin, problemasDelEntorno } from '@/lib/config';

/**
 * Ninguna ruta es pública salvo el login y los endpoints de Auth.js.
 * Los datos incluyen quién pagó la cuota en un club con menores de edad.
 */
const PUBLICAS = ['/login'];

function esPublica(pathname: string): boolean {
  return PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * El middleware normal: resuelve la sesión y decide.
 *
 * El tipo se anota a propósito: `auth()` está sobrecargada y, sin la
 * anotación, TypeScript elige la variante de manejador de ruta en vez de la
 * de middleware.
 */
const conSesion: NextMiddleware = auth((req, _evento: NextFetchEvent) => {
  const { pathname } = req.nextUrl;

  if (esPublica(pathname)) {
    // Con sesión activa, el login no tiene nada que ofrecer.
    if (req.auth) return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    return NextResponse.next();
  }

  if (!req.auth) {
    const login = new URL('/login', req.nextUrl.origin);
    // Para volver a donde iba después de entrar.
    if (pathname !== '/') login.searchParams.set('destino', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  /**
   * Sin AUTH_SECRET, Auth.js lanza `MissingSecret` al intentar leer la cookie
   * de sesión. Eso fue lo que rompió el primer despliegue: en el Edge Runtime
   * de Vercel un error aquí es un 500 en TODA ruta — incluido el propio
   * /login, que es justo la página que explica qué falta. El usuario veía
   * "Application error: a client-side exception" y nada más.
   *
   * Por eso se comprueba la configuración ANTES de tocar la sesión. Si no hay
   * con qué autenticar, no se intenta: se manda al login, que sí puede
   * renderizar y decir qué variable cargar.
   *
   * Esto no abre ninguna puerta. Sin sesión resoluble nadie queda autenticado;
   * toda ruta protegida sigue redirigiendo al login, igual que antes.
   */
  if (bloqueaLogin(problemasDelEntorno())) {
    if (esPublica(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  return conSesion(req, event);
}

export const config = {
  /**
   * Cubre TODA ruta menos los endpoints de Auth.js y los estáticos de Next.
   * Una ruta nueva queda protegida por omisión: hay que excluirla a
   * propósito, nunca protegerla a propósito.
   */
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
};
