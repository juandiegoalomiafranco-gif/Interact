# Dashboard financiero · Club Interact

Panel interno y **de solo lectura** para el comité de finanzas y la junta directiva.
La fuente de verdad es Airtable; este proyecto nunca le escribe.

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind 4 · Recharts · Framer Motion
· Auth.js v5 · Vercel

Sin base de datos propia y sin ORM: Airtable es la única fuente.

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # y llena las variables
npm run dev
```

## Variables de entorno

Todas viven en `.env.local`, que está en `.gitignore` desde el primer commit.
**Ninguna lleva el prefijo `NEXT_PUBLIC_`**: el token de Airtable jamás debe llegar
al navegador. Ver `.env.example` para la lista completa y cómo obtener cada una.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción; falla si hay un error de tipos |
| `npm run typecheck` | Solo la revisión de tipos |
| `npm run lint` | ESLint |
| `npm test` | Tests de `lib/metrics.ts` |
| `npm run schema` | Regenera `types/airtable.ts` desde la Metadata API de Airtable |

## Cuota de la API de Airtable

El plan gratuito da **1.000 llamadas al mes**. Un refresco completo del dashboard
cuesta ~15 llamadas (una por tabla, más paginación de a 100 registros).

Por eso el caché es de **12 horas** (`AIRTABLE_REVALIDATE_SECONDS=43200`): son ~2
refrescos al día ≈ 900 llamadas al mes, con margen para el botón "Actualizar ahora".
Bajarlo a una hora agota la cuota en tres días.

Durante desarrollo, `AIRTABLE_DEV_CACHE=1` sirve desde `.cache/` y no gasta llamadas.

## Seguridad

Los datos incluyen quién pagó la cuota y quién no, y buena parte de los miembros del
club son menores de edad.

- El token de Airtable vive solo en variables de entorno del servidor
- Toda consulta pasa por Server Components; el navegador nunca le pega a `api.airtable.com`
- Ninguna ruta es pública: todo va detrás de Auth.js con lista blanca de correos
- Cero analytics y cero scripts de terceros
- Los campos `Teléfono`, `Acudiente` y `Teléfono acudiente` de MIEMBROS no se leen

Si el token se filtra, con los scopes correctos (`data.records:read` y
`schema.bases:read`, sobre una sola base) lo peor que puede pasar es que alguien lea
la base. Nunca le des permisos de escritura.

## Documentación

- `docs/esquema.json` — esquema de la base, referencia del mapa de campos
