# Dashboard financiero · Club Interact

Panel interno para el comité de finanzas y la junta directiva del club. Muestra el estado
de la plata y permite registrar movimientos, pagos de cuota y donaciones sin salir de él.
La fuente de verdad es Airtable.

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
| `npm run verify:bundle` | Busca secretos en el bundle del cliente (correr tras `build`) |
| `npm run crear-tablas` | Crea MOVIMIENTOS, DONANTES y DONACIONES en Airtable (una sola vez) |
| `npm run verify:tokens` | Comprueba que ningún componente use primitivas de color |
| `npm run verify:contraste` | Contraste WCAG AA de la paleta, en los dos temas |
| `npm run verify:escritura` | Guardián de la capa de escritura: sin DELETE, sin llamadas sueltas |
| `npm run verify` | Corre typecheck, lint, tests, tokens y contraste |

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

### La lista blanca falla cerrado

Si `ALLOWED_EMAILS` está vacía o sin definir, **no entra nadie**. Tratar una lista vacía
como "sin restricciones" convertiría un despliegue mal configurado en una puerta abierta.

La lista se comprueba dos veces: al iniciar sesión y en cada refresco del token. Por eso
sacar a alguien de `ALLOWED_EMAILS` le corta el acceso enseguida, en vez de dejarle la
sesión viva hasta que expire.

### Comprobar que no se filtró nada

```bash
npm run build && npm run verify:bundle
```

Busca en `.next/static/` tokens de Airtable, client secrets de Google y nombres de
variables de servidor. Sale con código 1 si encuentra algo, así que sirve en CI.

Si el token se filtra, con los scopes correctos (`data.records:read` y
`schema.bases:read`, sobre una sola base) lo peor que puede pasar es que alguien lea
la base. Nunca le des permisos de escritura.

## Las tres tablas que hay que crear una vez

La base nació con cinco tablas: MIEMBROS, PERIODOS, CUOTAS, PROYECTOS y EVENTOS. El panel
necesita tres más —**MOVIMIENTOS, DONANTES y DONACIONES**— y sin MOVIMIENTOS no hay saldo,
ni ingresos, ni egresos, ni gráfica de barras.

```bash
AIRTABLE_SCHEMA_TOKEN=patXXXXXXXX npm run crear-tablas
```

Ese token es **distinto** del de la app y se usa una sola vez:

1. En <https://airtable.com/create/tokens>, crea uno con `schema.bases:write` y
   `schema.bases:read`, con acceso solo a la base de finanzas.
2. Corre el comando. Es idempotente: una tabla que ya exista se salta.
3. **Vuelve y bórralo.** La app nunca necesita permisos de esquema, y un token que sí los
   tenga puede borrar tablas enteras si se filtra.

El script regenera `docs/esquema.json` al terminar.

Mientras las tablas no existan el panel no se rompe: las vistas que dependen de ellas
muestran qué falta, y **nunca un $0**. Un saldo de cero porque el club gastó todo y uno
porque no hay dónde registrar son cosas distintas.

## Revisar el diseño sin token: `DEMO=1`

```bash
DEMO=1 npm run dev
```

Sirve un snapshot de ejemplo determinista en vez de llamar a Airtable, con una franja fija
que dice **"Datos de ejemplo"** y que no se puede cerrar. Es a propósito: un tablero
financiero con números inventados que se lean como reales es peor que uno vacío. En
producción `snapshotDemo()` lanza en vez de servir nada.

## Documentación

- `docs/esquema.json` — esquema de la base, referencia del mapa de campos

## Sistema de diseño

### Los componentes nunca usan primitivas de color

Hay dos capas de tokens en `app/globals.css`:

- **Primitivas** — las rampas `interact-*`, `dorado-*`, `tinta-*`. Iguales en ambos temas.
- **Semánticas** — `fondo`, `superficie`, `borde`, `texto`, `acento`, los estados. Estas
  cambian entre claro y oscuro.

Un componente que escriba `bg-tinta-50` se ve bien en claro y roto en oscuro, porque las
primitivas no cambian con el tema. `npm run verify:tokens` lo detecta.

### Los tokens se emiten con `@theme static`

Sin `static`, Tailwind 4 solo emite los tokens cuyo nombre aparece **escrito literalmente**
en el código. Los colores de las gráficas se arman con `var(--color-cat-${n})`, así que
Tailwind los daba por muertos y los borraba del CSS. El resultado no era un error: era una
dona negra, y solo en el tema claro. `npm run verify:tokens` falla si alguien quita el
`static`.

### El tema tiene tres estados

El sistema decide por defecto; el interruptor manual fuerza claro u oscuro y gana en ambos
sentidos. Un script inline en `<head>` estampa `data-tema` antes del primer pintado, si no
quien usa el tema oscuro ve un destello blanco en cada carga.

### La matriz de cuotas no depende del color

Tres de los cuatro estados empiezan con P, así que la inicial sola no alcanza:

| Estado | Marca |
|---|---|
| Pagado | `P` |
| Parcial | `½` |
| Pendiente | `D` (de *debe*) |
| Exonerado | `E` |
| Sin registro | celda vacía |

## Escritura hacia Airtable

El panel escribe, pero de forma acotada. Tres reglas, cada una con tests:

**Una tabla cerrada, y campos permitidos en las demás.** La barrera está a nivel de campo,
no de tabla: `CAMPOS_ESCRIBIBLES` dice exactamente qué se puede tocar de cada una. De
`MIEMBROS` se pueden corregir nombre, rol, estado, institución y notas — y **nada más**:
`Correo`, `Teléfono`, `Acudiente` y `Teléfono acudiente` no están en la lista, no se leen
(`lib/airtable/mapeo.ts`) y `npm run verify:escritura` falla si alguien los nombra siquiera
en una vista. Buena parte del club son menores de edad.

`PERIODOS` es la única tabla cerrada del todo: `Cerrado` es la firma de que un mes contable
quedó sellado, y un formulario web que lo desmarque reabre meses ya cuadrados.

**Nunca borra.** Solo `POST` y `PATCH`. `DELETE` no existe en el tipo `MetodoEscritura`, y no
es una omisión que alguien deba completar: corregir un error contable es un asiento nuevo o
un `PATCH`, igual que en contabilidad de papel, donde tampoco se arranca una hoja.

**Dos listas.** `ALLOWED_EMAILS` decide quién ve; `EDITOR_EMAILS` decide quién registra. Hay
que estar en las dos, y se comprueba en cada escritura, no solo al arrancar.

**Dos escrituras cuando entra plata.** Registrar un pago de cuota marca la cuota *y* crea el
movimiento de ingreso; una donación en dinero ya recibida, igual. El saldo sale solo de
MOVIMIENTOS, así que sin el asiento no cuadraría la caja. Airtable no tiene transacciones:
si la segunda escritura falla, el panel lo dice con todas sus letras en vez de reportar que
todo salió bien.

`npm run verify:escritura` recorre el código buscando un `DELETE`, una llamada a Airtable
fuera de `lib/airtable/`, una escritura que no pase por `exigirEscrituraPermitida()`, o una
vista que mencione los datos de contacto de un miembro.

### Una etiqueta de caché por tabla

Guardar un movimiento invalida `airtable:movimientos`, no las ocho tablas. Con una etiqueta
compartida, cada registro costaría ~15 llamadas de relectura; a ~85 registros al mes serían
~1.275 contra una cuota de 1.000. Por tabla, el mismo trabajo cuesta ~255.

Registrar un pago de cuota o una donación en dinero también invalida `movimientos`, porque
ambos crean un ingreso y sin eso el saldo quedaría atrasado.
