import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { evaluarAcceso, listaBlancaDelEntorno } from '@/lib/allowlist';

/**
 * Autenticación del panel.
 *
 * Sin base de datos: sesiones en JWT. La lista blanca se comprueba en DOS
 * momentos y eso es deliberado:
 *
 *   signIn → decide si alguien puede entrar.
 *   jwt    → vuelve a decidir en cada refresco del token.
 *
 * Sin la segunda, sacar a alguien de ALLOWED_EMAILS no le quita nada:
 * conserva su sesión hasta que expire. Con ella, el acceso se corta en el
 * siguiente refresco.
 */

/** Google incluye `email_verified`, que el tipo `Profile` genérico no declara. */
interface PerfilGoogle {
  email?: string | null;
  email_verified?: boolean;
}

/** Doce horas: no re-loguear al tesorero a media jornada, pero tampoco dejar
 *  la sesión viva en un celular prestado o perdido. */
const DURACION_SESION = 12 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { scope: 'openid email profile' } },
    }),
  ],

  session: { strategy: 'jwt', maxAge: DURACION_SESION },

  pages: { signIn: '/login', error: '/login' },

  // Vercel sirve tras proxy; sin esto Auth.js no confía en el host entrante.
  trustHost: true,

  callbacks: {
    signIn({ profile }) {
      const perfil = profile as PerfilGoogle | undefined;

      const resultado = evaluarAcceso({
        correo: perfil?.email,
        correoVerificado: perfil?.email_verified,
        listaBlanca: listaBlancaDelEntorno(),
      });

      if (!resultado.permitido) {
        // Solo al log del servidor: el motivo exacto no viaja al navegador.
        console.warn(`[auth] acceso denegado (${resultado.motivo})`);
        return false;
      }
      return true;
    },

    jwt({ token }) {
      const lista = listaBlancaDelEntorno();
      const correo = token.email?.trim().toLowerCase();

      // Devolver null borra la sesión. Cubre tres casos: le quitaron el
      // acceso a alguien, se vació la lista por un despliegue mal
      // configurado, o el token llegó sin correo.
      if (!correo || lista.length === 0 || !lista.includes(correo)) return null;

      return token;
    },

    session({ session, token }) {
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
});
