import { describe, expect, it } from 'vitest';
import {
  aCuota,
  aDonacion,
  aDonante,
  aEvento,
  aMiembro,
  aMovimiento,
  aPeriodo,
  aProyecto,
} from './mapeo';
import type { RegistroCrudo } from './cliente';

const reg = (fields: Record<string, unknown>): RegistroCrudo => ({ id: 'recX', fields });

describe('ausencia no es cero', () => {
  it('un monto que nadie llenó es null, no 0', () => {
    // Airtable omite del JSON las celdas vacías. Si esto devolviera 0, un
    // movimiento sin monto bajaría el saldo esperado sin que nadie lo note.
    expect(aMovimiento(reg({ Concepto: 'Rifa' })).monto).toBeNull();
    expect(aCuota(reg({})).montoEsperado).toBeNull();
    expect(aProyecto(reg({ Proyecto: 'X' })).presupuestoAprobado).toBeNull();
  });

  it('un cero de verdad sí es cero', () => {
    expect(aMovimiento(reg({ Monto: 0 })).monto).toBe(0);
  });

  it('un texto en blanco cuenta como ausente', () => {
    expect(aMovimiento(reg({ Categoría: '   ' })).categoria).toBeNull();
  });

  it('una casilla sin marcar es false, porque Airtable no la manda', () => {
    expect(aMovimiento(reg({})).conciliado).toBe(false);
    expect(aPeriodo(reg({})).cerrado).toBe(false);
    expect(aPeriodo(reg({ Cerrado: true })).cerrado).toBe(true);
  });
});

describe('opciones fuera del enum', () => {
  it('una opción que el código no conoce es null, no el texto crudo', () => {
    // Alguien agrega "En revisión" en Airtable. Devolver el texto lo colaría
    // en comparaciones contra el enum; null lo deja fuera y visible.
    expect(aMovimiento(reg({ Tipo: 'Traslado' })).tipo).toBeNull();
    expect(aMovimiento(reg({ 'Estado de aprobación': 'En revisión' })).estadoAprobacion).toBeNull();
    expect(aCuota(reg({ Estado: 'Condonado' })).estado).toBeNull();
    expect(aMiembro(reg({ Estado: 'De licencia' })).estado).toBeNull();
  });

  it('las opciones conocidas sí pasan', () => {
    expect(aMovimiento(reg({ Tipo: 'Egreso' })).tipo).toBe('Egreso');
    expect(aDonacion(reg({ 'Tipo de aporte': 'Especie' })).tipoAporte).toBe('Especie');
    expect(aDonacion(reg({ Estado: 'Recibida' })).estado).toBe('Recibida');
  });
});

describe('los datos de contacto de un miembro no se leen', () => {
  it('el objeto Miembro no los contiene aunque Airtable los mande', () => {
    // Buena parte del club son menores de edad. Este test es el que impide
    // que un `...fields` distraído los meta en el snapshot y en el caché.
    const miembro = aMiembro(
      reg({
        Nombre: 'Ana',
        Correo: 'ana@colegio.edu.co',
        'Teléfono': '3001234567',
        Acudiente: 'María',
        'Teléfono acudiente': '3009876543',
      }),
    );

    expect(Object.keys(miembro).sort()).toEqual(['estado', 'fechaIngreso', 'id', 'nombre', 'rol']);
    expect(JSON.stringify(miembro)).not.toContain('3001234567');
    expect(JSON.stringify(miembro)).not.toContain('ana@colegio.edu.co');
  });
});

describe('enlaces', () => {
  it('un enlace vacío es lista vacía, no null', () => {
    expect(aMovimiento(reg({})).proyectoIds).toEqual([]);
  });

  it('de un enlace de uno se toma el id', () => {
    expect(aCuota(reg({ Miembro: ['recA'] })).miembroId).toBe('recA');
  });

  it('si alguien enlazó dos por error se toma el primero y no revienta', () => {
    expect(aCuota(reg({ Periodo: ['recA', 'recB'] })).periodoId).toBe('recA');
  });

  it('un enlace ausente es null', () => {
    expect(aCuota(reg({})).miembroId).toBeNull();
  });
});

describe('adjuntos', () => {
  it('sin soporte es false; con al menos uno, true', () => {
    expect(aCuota(reg({})).tieneSoporte).toBe(false);
    expect(aCuota(reg({ Soporte: [] })).tieneSoporte).toBe(false);
    expect(aCuota(reg({ Soporte: [{ url: 'x' }] })).tieneSoporte).toBe(true);
  });
});

describe('el campo principal siempre tiene algo que mostrar', () => {
  it('un registro sin nombre no rompe la tabla', () => {
    // Una fila con `undefined` en la primera columna se ve como un bug; con
    // "(sin nombre)" se ve como lo que es: un registro a medio llenar.
    expect(aMiembro(reg({})).nombre).toBe('(sin nombre)');
    expect(aProyecto(reg({})).nombre).toBe('(sin nombre)');
    expect(aEvento(reg({})).nombre).toBe('(sin nombre)');
    expect(aDonante(reg({})).nombre).toBe('(sin nombre)');
  });
});

describe('mapeo completo de un registro real', () => {
  it('movimiento', () => {
    expect(
      aMovimiento({
        id: 'recMov',
        fields: {
          Concepto: 'Compra de refrigerios',
          Fecha: '2026-08-14',
          Tipo: 'Egreso',
          Monto: 120000,
          'Categoría': 'Refrigerios',
          'Estado de aprobación': 'Aprobado',
          Conciliado: true,
          Soporte: [{ url: 'x' }],
          Proyecto: ['recP1'],
          Evento: ['recE1'],
        },
      }),
    ).toEqual({
      id: 'recMov',
      concepto: 'Compra de refrigerios',
      fecha: '2026-08-14',
      tipo: 'Egreso',
      monto: 120000,
      categoria: 'Refrigerios',
      estadoAprobacion: 'Aprobado',
      conciliado: true,
      tieneSoporte: true,
      proyectoIds: ['recP1'],
      eventoIds: ['recE1'],
    });
  });

  it('periodo, con el nombre en su campo propio', () => {
    // El campo principal de PERIODOS se llama "Periodo", no "Nombre".
    expect(aPeriodo(reg({ Periodo: 'Agosto 2026', 'Fecha inicio': '2026-08-01' })).nombre).toBe(
      'Agosto 2026',
    );
  });

  it('proyecto y evento usan su propio campo principal', () => {
    expect(aProyecto(reg({ Proyecto: 'Biblioteca' })).nombre).toBe('Biblioteca');
    expect(aEvento(reg({ Evento: 'Bingo' })).nombre).toBe('Bingo');
  });
});
