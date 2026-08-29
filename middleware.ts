import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Ninguna ruta es pública salvo el login y los endpoints de Auth.js.
 * Los datos incluyen quién pagó la cuota en un club con menores de edad.
 */
const PUBLICAS = ['/login'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
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
