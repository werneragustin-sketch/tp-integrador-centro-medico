const { Usuario } = require('../../models/Usuario');
const { Paciente } = require('../../models/Paciente');
const { Medico } = require('../../models/Medico');
const { UsuarioFactory } = require('../../models/UsuarioFactory');
const { Turno } = require('../../models/Turno');
const { MongoMetricaRepositorio } = require('../../repositories/mongo/MongoMetricaRepositorio');
const { ITurnoRepositorio } = require('../../repositories/interfaces/ITurnoRepositorio');

describe('Usuario (clase abstracta) y herencia', () => {
  test('no se puede instanciar Usuario directamente', () => {
    expect(() => new Usuario({ nombre: 'x', email: 'x@test' })).toThrow(TypeError);
  });

  test('Paciente y Medico heredan de Usuario', () => {
    expect(new Paciente({ id: 1, nombre: 'a', email: 'a@test' })).toBeInstanceOf(Usuario);
    expect(new Medico({ id: 2, nombre: 'b', email: 'b@test' })).toBeInstanceOf(Usuario);
  });

  test('el JSON nunca incluye el hash de la contraseña (encapsulamiento)', () => {
    const p = new Paciente({ id: 1, nombre: 'a', email: 'a@test', passwordHash: '$2a$10$xxx' });
    expect(p.passwordHash).toBe('$2a$10$xxx');
    expect(JSON.parse(JSON.stringify(p))).not.toHaveProperty('passwordHash');
  });

  test('polimorfismo: misma pregunta, distinta respuesta según la subclase', () => {
    const turno = new Turno({ pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z' });
    const paciente = new Paciente({ id: 4, nombre: 'a', email: 'a@test' });
    const medico = new Medico({ id: 1, nombre: 'b', email: 'b@test' });

    expect(paciente.puedeCambiarEstado(turno, 'CANCELADO')).toBe(true);
    expect(paciente.puedeCambiarEstado(turno, 'CONFIRMADO')).toBe(false);
    expect(medico.puedeCambiarEstado(turno, 'CONFIRMADO')).toBe(true);
    expect(medico.puedeCambiarEstado(turno, 'CANCELADO')).toBe(false);
  });

  test('UsuarioFactory crea la subclase según el rol', () => {
    expect(UsuarioFactory.crear({ id: 1, rol: 'MEDICO', nombre: 'b', email: 'b@test' })).toBeInstanceOf(Medico);
    expect(UsuarioFactory.desdeToken({ sub: '4', rol: 'PACIENTE' })).toBeInstanceOf(Paciente);
  });
});

describe('Patrones', () => {
  test('MongoMetricaRepositorio es Singleton', () => {
    const a = MongoMetricaRepositorio.getInstancia();
    const b = MongoMetricaRepositorio.getInstancia();
    expect(a).toBe(b);
    expect(() => new MongoMetricaRepositorio()).toThrow(/Singleton/);
  });

  test('las interfaces no se pueden instanciar', () => {
    expect(() => new ITurnoRepositorio()).toThrow(TypeError);
  });
});
