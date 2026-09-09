/**
 * Las opciones de los `singleSelect` de Airtable, en un solo sitio.
 *
 * Los formularios las pintan y las Server Actions las validan contra esta
 * misma lista. Si estuvieran duplicadas, un `<option>` nuevo pasaría la
 * validación de un lado y la reventaría del otro.
 *
 * Tienen que coincidir con lo que hay en la base. `npm run crear-tablas`
 * crea MOVIMIENTOS, DONANTES y DONACIONES con exactamente estos valores.
 */

export const CATEGORIAS_MOVIMIENTO = [
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
] as const;
export type CategoriaMovimiento = (typeof CATEGORIAS_MOVIMIENTO)[number];

export const METODOS_PAGO = [
  'Efectivo',
  'Nequi',
  'Daviplata',
  'Transferencia bancaria',
  'Transferencia',
  'Tarjeta',
] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const TIPOS_DONANTE = ['Persona', 'Empresa', 'Institución', 'Aliado'] as const;

export const ESTADOS_PROYECTO = [
  'Planeación',
  'En curso',
  'Cerrado',
  'Cancelado',
] as const;

export const TIPOS_PROYECTO = [
  'Servicio comunitario',
  'Internacional',
  'Recaudación',
  'Interno del club',
  'Tecnológico',
  'Social',
  'Innovación',
] as const;

export const AREAS_DE_ENFOQUE = [
  'Paz',
  'Prevención de enfermedades',
  'Agua y saneamiento',
  'Salud materno-infantil',
  'Educación',
  'Desarrollo económico',
  'Medio ambiente',
  'Transformación digital',
  'Sostenibilidad',
] as const;

export const ESTADOS_EVENTO = ['Planeado', 'En progreso', 'Completado'] as const;

export const ROLES_MIEMBRO = [
  'Presidente',
  'Vicepresidente',
  'Secretario',
  'Tesorero',
  'Comité de finanzas',
  'Director de proyectos',
  'Miembro',
  'Estudiante',
  'Monitor',
] as const;

/**
 * Qué categorías tienen sentido según el movimiento sea gasto o ingreso.
 *
 * Enseñar las diez siempre es ruido: nadie clasifica un gasto como "Cuotas"
 * ni un ingreso como "Papelería", y una lista larga hace que la gente elija
 * "Otros" por no leerla — con lo que la dona de categorías deja de servir.
 */
export const CATEGORIAS_POR_TIPO: Record<'Ingreso' | 'Egreso', readonly string[]> = {
  Ingreso: ['Cuotas', 'Donaciones', 'Recaudación', 'Otros'],
  Egreso: ['Proyectos', 'Eventos', 'Refrigerios', 'Transporte', 'Papelería', 'Bancos', 'Otros'],
};
