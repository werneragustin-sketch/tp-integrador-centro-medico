const { Turno, EstadoTurno } = require('../../models/Turno');
const { ErrorConflicto, ErrorValidacion } = require('../../models/errores');

const base = { pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z' };

describe('Turno - máquina de estados', () => {
  test('un turno nuevo arranca PENDIENTE', () => {
    expect(new Turno(base).estado).toBe(EstadoTurno.PENDIENTE);
  });

  test('PENDIENTE -> CONFIRMADO con confirmarTurno()', () => {
    const turno = new Turno(base);
    turno.confirmarTurno();
    expect(turno.estado).toBe(EstadoTurno.CONFIRMADO);
  });

  test('PENDIENTE -> RECHAZADO con rechazarTurno()', () => {
    const turno = new Turno(base);
    turno.rechazarTurno();
    expect(turno.estado).toBe(EstadoTurno.RECHAZADO);
  });

  test('CONFIRMADO -> CANCELADO está permitido', () => {
    const turno = new Turno({ ...base, estado: EstadoTurno.CONFIRMADO });
    turno.cancelarTurno();
    expect(turno.estado).toBe(EstadoTurno.CANCELADO);
  });

  test.each([
    [EstadoTurno.RECHAZADO, EstadoTurno.CONFIRMADO],
    [EstadoTurno.CANCELADO, EstadoTurno.CONFIRMADO],
    [EstadoTurno.CONFIRMADO, EstadoTurno.RECHAZADO],
    [EstadoTurno.CANCELADO, EstadoTurno.PENDIENTE],
  ])('no se puede pasar de %s a %s', (desde, hacia) => {
    const turno = new Turno({ ...base, estado: desde });
    expect(() => turno.cambiarEstado(hacia)).toThrow(ErrorConflicto);
    expect(turno.estado).toBe(desde);
  });

  test('un estado inexistente es un error de validación', () => {
    expect(() => new Turno(base).cambiarEstado('ARCHIVADO')).toThrow(ErrorValidacion);
  });

  test('solo se reprograma si está PENDIENTE', () => {
    const turno = new Turno({ ...base, estado: EstadoTurno.CONFIRMADO });
    expect(() => turno.reprogramar('2030-01-11T13:00:00Z')).toThrow(ErrorConflicto);
  });
});

describe('Turno - superposición de horarios (turnos de 30 min)', () => {
  const t1000 = new Turno({ ...base, fechaHora: '2030-01-10T10:00:00Z' });

  test.each([
    ['10:00', true],
    ['10:15', true],
    ['09:45', true],
    ['10:30', false], // empieza justo cuando termina el otro
    ['09:30', false], // termina justo cuando empieza el otro
    ['11:00', false],
  ])('turno de las 10:00 vs turno de las %s -> superpone: %s', (hora, esperado) => {
    const otro = new Turno({ ...base, fechaHora: `2030-01-10T${hora}:00Z` });
    expect(t1000.seSuperponeCon(otro)).toBe(esperado);
  });
});

describe('Turno - validaciones', () => {
  test('fecha inválida', () => {
    expect(() => new Turno({ ...base, fechaHora: 'mañana' })).toThrow(ErrorValidacion);
  });

  test('medicoId debe ser entero positivo', () => {
    expect(() => new Turno({ ...base, medicoId: 'abc' })).toThrow(ErrorValidacion);
  });

  test('esFuturo compara contra el reloj recibido', () => {
    const turno = new Turno(base);
    expect(turno.esFuturo(new Date('2030-01-01T00:00:00Z'))).toBe(true);
    expect(turno.esFuturo(new Date('2030-02-01T00:00:00Z'))).toBe(false);
  });
});
