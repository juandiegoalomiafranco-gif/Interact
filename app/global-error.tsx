'use client';

/**
 * Última red de seguridad de toda la app.
 *
 * Existe porque no había ninguna: cuando el Server Action del login falló en
 * producción, el navegador mostró el texto por defecto de Next —
 * "Application error: a client-side exception has occurred"— en inglés y sin
 * decir qué hacer. Un panel que usa gente de un club de colegio no puede
 * fallar así.
 *
 * `global-error` reemplaza al layout raíz, así que tiene que traer su propio
 * <html> y <body>. Por eso no puede usar las clases de tema: los estilos van
 * en línea, para que la pantalla de error funcione incluso si lo que falló
 * fue la carga del CSS.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-CO">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: '#ece8de',
          color: '#211d16',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            El panel se cayó
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Algo falló al cargar esta página. No se perdió ningún dato: el panel solo lee
            y escribe en Airtable cuando tú lo pides.
          </p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Si vuelve a pasar, lo más probable es que falte una variable de entorno en el
            servidor. El detalle exacto queda en los registros del despliegue.
          </p>

          {/* El digest es lo único que permite encontrar este fallo concreto
              en los logs. El mensaje del error no se muestra: puede contener
              rutas internas o datos del club. */}
          {error.digest && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.7 }}>
              Código del error: <code>{error.digest}</code>
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              cursor: 'pointer',
              borderRadius: '0.5rem',
              border: '1px solid #b8b0a0',
              backgroundColor: '#f7f5f0',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'inherit',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
