import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ScriptDeTema } from '@/components/tema';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Finanzas · Club Interact',
  description: 'Panel interno del comité de finanzas.',
  // Datos de menores de edad: nunca en buscadores.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e131a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: el script de tema toca data-tema antes de que
    // React hidrate, así que el HTML del servidor y el del navegador difieren
    // en ese atributo a propósito.
    <html lang="es-CO" className={inter.variable} suppressHydrationWarning>
      <head>
        <ScriptDeTema />
      </head>
      <body className="min-h-dvh bg-fondo font-sans text-texto antialiased">{children}</body>
    </html>
  );
}
