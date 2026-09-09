/**
 * Crea en Airtable las tres tablas que le faltan a la base: MOVIMIENTOS,
 * DONANTES y DONACIONES.
 *
 * ┌─ POR QUÉ ES UN SCRIPT APARTE Y NO PARTE DE LA APP ─────────────────────┐
 * │ Crear tablas exige el scope `schema.bases:write`. Ese scope no le      │
 * │ sirve de nada a la app —que solo lee y escribe registros— y sí le      │
 * │ daría a un token filtrado el poder de borrar la contabilidad entera.   │
 * │ Por eso vive en AIRTABLE_SCHEMA_TOKEN, una variable distinta, que se   │
 * │ usa una vez y se borra.                                                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   AIRTABLE_SCHEMA_TOKEN=patXXXX npm run crear-tablas
 *
 * Es idempotente: una tabla que ya exista se salta y se informa. Correrlo dos
 * veces no duplica nada. Al terminar regenera docs/esquema.json.
 */
import { writeFileSync } from 'node:fs';

const API = 'https://api.airtable.com/v0/meta/bases';

const token = process.env.AIRTABLE_SCHEMA_TOKEN?.trim();
const baseId = process.env.AIRTABLE_BASE_ID?.trim() || 'app4obzS9ct8HxQQU';

if (!token) {
  console.error(`
✗ Falta AIRTABLE_SCHEMA_TOKEN.

  1. Entra a https://airtable.com/create/tokens
  2. Crea un token con el scope  schema.bases:write  (y schema.bases:read),
     con acceso SOLO a la base de finanzas del club.
  3. Córrelo así:

       AIRTABLE_SCHEMA_TOKEN=patXXXXXXXX npm run crear-tablas

  4. Vuelve a https://airtable.com/create/tokens y BÓRRALO.
     La app nunca necesita permisos de esquema.
`);
  process.exit(1);
}

// ───────────────────────────── Helpers HTTP ─────────────────────────────

async function api(ruta, opciones = {}) {
  const respuesta = await fetch(`${API}/${baseId}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });

  const texto = await respuesta.text();

  if (!respuesta.ok) {
    // El cuerpo de error de Airtable trae el motivo exacto; sin él, depurar
    // un 422 es adivinar.
    throw new Error(`${respuesta.status} ${respuesta.statusText} — ${texto}`);
  }

  return texto ? JSON.parse(texto) : null;
}

// ─────────────────────── Definición de las tablas ───────────────────────

/**
 * El primer campo de cada lista es el campo principal de la tabla. Los
 * nombres y las opciones tienen que coincidir exactamente con lo que espera
 * `lib/airtable/mapeo.ts`: si aquí dice "Estado de aprobación" y allá se lee
 * "Estado", el dashboard muestra todo en null y no avisa.
 */
const texto = (name) => ({ name, type: 'singleLineText' });
const largo = (name) => ({ name, type: 'multilineText' });
const fecha = (name) => ({
  name,
  type: 'date',
  options: { dateFormat: { name: 'iso' } },
});
// Pesos colombianos: sin centavos, como en el resto del panel.
const plata = (name) => ({
  name,
  type: 'currency',
  options: { precision: 0, symbol: '$' },
});
const seleccion = (name, opciones) => ({
  name,
  type: 'singleSelect',
  options: {
    choices: opciones.map((o, i) => ({
      name: o,
      color: ['blueLight2', 'cyanLight2', 'tealLight2', 'greenLight2', 'yellowLight2', 'orangeLight2', 'redLight2'][i % 7],
    })),
  },
});
const casilla = (name) => ({
  name,
  type: 'checkbox',
  options: { icon: 'check', color: 'greenBright' },
});
const adjuntos = (name) => ({ name, type: 'multipleAttachments' });
const enlace = (name, tablaId) => ({
  name,
  type: 'multipleRecordLinks',
  options: { linkedTableId: tablaId },
});

/**
 * Las categorías de gasto. Salen de `egresosPorCategoria()`, que agrupa por
 * este texto: un valor libre por registro haría una dona con veinte tajadas.
 */
const CATEGORIAS = [
  'Cuotas',
  'Donaciones',
  'Recaudación',
  'Proyectos',
  'Eventos',
  'Papelería',
  'Transporte',
  'Refrigerios',
  'Bancos',
  'Otros',
];

function definiciones(idPorNombre) {
  const PROYECTOS = idPorNombre.get('PROYECTOS');
  const EVENTOS = idPorNombre.get('EVENTOS');

  return [
    {
      name: 'MOVIMIENTOS',
      description:
        'Libro contable del club: cada ingreso y cada egreso. Del panel no se borra nada; un error se corrige con un asiento nuevo.',
      fields: [
        texto('Concepto'),
        fecha('Fecha'),
        seleccion('Tipo', ['Ingreso', 'Egreso']),
        plata('Monto'),
        seleccion('Categoría', CATEGORIAS),
        seleccion('Estado de aprobación', ['Aprobado', 'Pendiente', 'Rechazado']),
        casilla('Conciliado'),
        adjuntos('Soporte'),
        ...(PROYECTOS ? [enlace('Proyecto', PROYECTOS)] : []),
        ...(EVENTOS ? [enlace('Evento', EVENTOS)] : []),
        largo('Observación'),
      ],
    },
    {
      name: 'DONANTES',
      description: 'Quién aporta al club. Personas, empresas e instituciones aliadas.',
      fields: [
        texto('Nombre'),
        seleccion('Tipo', ['Persona', 'Empresa', 'Institución', 'Aliado']),
        texto('Contacto'),
        largo('Notas'),
      ],
    },
    {
      name: 'DONACIONES',
      description:
        'Aportes comprometidos y recibidos. Una donación en dinero se registra ADEMÁS como movimiento de ingreso: aquí se reporta, en MOVIMIENTOS se suma.',
      fields: [
        texto('Referencia'),
        seleccion('Estado', ['Comprometida', 'Recibida', 'Cancelada']),
        seleccion('Tipo de aporte', ['Dinero', 'Especie', 'Servicio']),
        plata('Monto'),
        fecha('Fecha de compromiso'),
        fecha('Fecha de recepción'),
        ...(PROYECTOS ? [enlace('Proyecto', PROYECTOS)] : []),
        ...(EVENTOS ? [enlace('Evento', EVENTOS)] : []),
        largo('Observación'),
      ],
    },
  ];
}

// ─────────────────────────────── Ejecución ───────────────────────────────

console.log(`\nBase ${baseId}\n`);

const { tables } = await api('/tables');
const idPorNombre = new Map(tables.map((t) => [t.name, t.id]));

console.log(`Tablas que ya existen: ${tables.map((t) => t.name).join(', ')}\n`);

let creadas = 0;

for (const def of definiciones(idPorNombre)) {
  if (idPorNombre.has(def.name)) {
    console.log(`· ${def.name} ya existe, no se toca`);
    continue;
  }

  const tabla = await api('/tables', { method: 'POST', body: JSON.stringify(def) });
  idPorNombre.set(def.name, tabla.id);
  creadas += 1;
  console.log(`✓ ${def.name} creada (${tabla.id}) con ${def.fields.length} campos`);
}

// DONACIONES enlaza a DONANTES, que puede haberse creado en esta misma
// corrida. Por eso el enlace se agrega después, cuando el id ya existe.
const idDonantes = idPorNombre.get('DONANTES');
const idDonaciones = idPorNombre.get('DONACIONES');

if (idDonantes && idDonaciones) {
  const { tables: actuales } = await api('/tables');
  const donaciones = actuales.find((t) => t.id === idDonaciones);
  const tieneEnlace = donaciones?.fields.some((f) => f.name === 'Donante');

  if (!tieneEnlace) {
    await api(`/tables/${idDonaciones}/fields`, {
      method: 'POST',
      body: JSON.stringify(enlace('Donante', idDonantes)),
    });
    console.log('✓ DONACIONES.Donante enlazado a DONANTES');
  }
}

// El esquema en docs/ es la referencia del mapa de campos: si queda viejo,
// la próxima persona mapea contra campos que ya no son los de la base.
const { tables: finales } = await api('/tables');
writeFileSync(
  new URL('../docs/esquema.json', import.meta.url),
  `${JSON.stringify({ tables: finales }, null, 2)}\n`,
);

console.log(`
${creadas === 0 ? 'No hubo nada que crear.' : `${creadas} tabla(s) creada(s).`}
docs/esquema.json regenerado con ${finales.length} tablas.

Ahora BORRA el token de esquema en https://airtable.com/create/tokens
y deja solo AIRTABLE_TOKEN, que no necesita permisos de esquema.
`);
