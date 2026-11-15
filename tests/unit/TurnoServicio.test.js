/**
 * Tests unitarios de TurnoServicio con MOCKS (jest.fn()).
 * El servicio recibe los repositorios por constructor, así que en vez de SQL Server
 * le inyectamos objetos falsos y controlamos qué devuelven.
 */
const { TurnoServicio } = require('../../services/TurnoServicio');
const { Turno, EstadoTurno } = require('../../models/Turno');
const { Paciente } = require('../../models/Paciente');
const { Medico } = require('../../models/Medico');
const {
  ErrorConflicto,
  ErrorProhibido,
  ErrorNoEncontrado,
  ErrorValidacion,
} = require('../../models/errores');

const AHORA = new Date('2030-01-01T12:00:00Z');
const paciente = new Paciente({ id: 4, nombre: 'Juan', email: 'juan@test' });
const otroPaciente = new Paciente({ id: 5, nombre: 'María', email: 'maria@test' });
const medico = new Medico({ id: 1, nombre: 'Dra. Gómez', email: 'gomez@test', especialidad: 'Cardiología' });

function crearMocks() {
  const turnoRepo = {
    guardarTurno: jest.fn(async (t) => new Turno({ ...t.toJSON(), id: 99 })),
    buscarPorId: jest.fn(),
    buscarPorMedico: jest.fn(async () => []),
    listar: jest.fn(async () => ({ items: [], total: 0 })),
    actualizarEstado: jest.fn(async () => true),
    reprogramar: jest.fn(async (t) => t),
  };
  const usuarioRepo = {
    buscarMedicoPorId: jest.fn(async (id) => (id === 1 ? medico : null)),
  };
  const servicio = new TurnoServicio(turnoRepo, usuarioRepo, () => AHORA);
  return { turnoRepo, usuarioRepo, servicio };
}

const pedido = { medicoId: 1, fechaHora: '2030-01-10T13:00:00Z', motivo: 'Control' };

describe('TurnoServicio.programarTurno', () => {
  test('crea el turno PENDIENTE cuando el médico está libre', async () => {
    const { servicio, turnoRepo } = crearMocks();

    const turno = await servicio.programarTurno(paciente, pedido);

    expect(turno.id).toBe(99);
    expect(turno.estado).toBe(EstadoTurno.PENDIENTE);
    expect(turno.pacienteId).toBe(paciente.id);
    expect(turnoRepo.guardarTurno).toHaveBeenCalledTimes(1);
  });

  test('rechaza un horario que se superpone con otro turno activo del médico', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorMedico.mockResolvedValue([
      new Turno({ id: 7, pacienteId: 5, medicoId: 1, fechaHora: '2030-01-10T12:45:00Z', estado: 'CONFIRMADO' }),
    ]);

    await expect(servicio.programarTurno(paciente, pedido)).rejects.toThrow(ErrorConflicto);
    expect(turnoRepo.guardarTurno).not.toHaveBeenCalled();
  });

  test('un turno CANCELADO en ese horario no bloquea la agenda', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorMedico.mockResolvedValue([
      new Turno({ id: 7, pacienteId: 5, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z', estado: 'CANCELADO' }),
    ]);

    await expect(servicio.programarTurno(paciente, pedido)).resolves.toBeInstanceOf(Turno);
  });

  test('no permite turnos en el pasado (usa el reloj inyectado)', async () => {
    const { servicio, turnoRepo } = crearMocks();

    await expect(
      servicio.programarTurno(paciente, { ...pedido, fechaHora: '2029-12-31T10:00:00Z' })
    ).rejects.toThrow(ErrorValidacion);
    expect(turnoRepo.buscarPorMedico).not.toHaveBeenCalled();
  });

  test('médico inexistente -> ErrorNoEncontrado', async () => {
    const { servicio } = crearMocks();
    await expect(servicio.programarTurno(paciente, { ...pedido, medicoId: 42 })).rejects.toThrow(ErrorNoEncontrado);
  });

  test('un médico no puede solicitar turnos (polimorfismo de Usuario)', async () => {
    const { servicio } = crearMocks();
    await expect(servicio.programarTurno(medico, pedido)).rejects.toThrow(ErrorProhibido);
  });
});

describe('TurnoServicio.cambiarEstado', () => {
  const turnoPendiente = () =>
    new Turno({ id: 10, pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z' });

  test('el médico confirma un turno suyo', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(turnoPendiente());

    const turno = await servicio.cambiarEstado(medico, 10, EstadoTurno.CONFIRMADO);

    expect(turno.estado).toBe(EstadoTurno.CONFIRMADO);
    expect(turnoRepo.actualizarEstado).toHaveBeenCalledWith(turno, EstadoTurno.PENDIENTE);
  });

  test('el paciente NO puede confirmar su propio turno', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(turnoPendiente());

    await expect(servicio.cambiarEstado(paciente, 10, EstadoTurno.CONFIRMADO)).rejects.toThrow(ErrorProhibido);
    expect(turnoRepo.actualizarEstado).not.toHaveBeenCalled();
  });

  test('el paciente puede cancelar su turno', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(turnoPendiente());

    const turno = await servicio.cancelarTurno(paciente, 10);
    expect(turno.estado).toBe(EstadoTurno.CANCELADO);
  });

  test('otro paciente no puede ver ni tocar el turno', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(turnoPendiente());

    await expect(servicio.cancelarTurno(otroPaciente, 10)).rejects.toThrow(ErrorProhibido);
  });

  test('transición inválida (RECHAZADO -> CONFIRMADO) -> ErrorConflicto', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(
      new Turno({ id: 10, pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z', estado: 'RECHAZADO' })
    );

    await expect(servicio.cambiarEstado(medico, 10, EstadoTurno.CONFIRMADO)).rejects.toThrow(ErrorConflicto);
  });

  test('si otro usuario lo modificó antes (concurrencia optimista) -> ErrorConflicto', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(turnoPendiente());
    turnoRepo.actualizarEstado.mockResolvedValue(false);

    await expect(servicio.cambiarEstado(medico, 10, EstadoTurno.RECHAZADO)).rejects.toThrow(ErrorConflicto);
  });

  test('turno inexistente -> ErrorNoEncontrado', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(null);
    await expect(servicio.cambiarEstado(medico, 123, EstadoTurno.CONFIRMADO)).rejects.toThrow(ErrorNoEncontrado);
  });
});

describe('TurnoServicio.listarTurnos (polimorfismo)', () => {
  test('el paciente lista por pacienteId', async () => {
    const { servicio, turnoRepo } = crearMocks();
    await servicio.listarTurnos(paciente, { pagina: 2, limite: 5 });
    expect(turnoRepo.listar).toHaveBeenCalledWith({ pacienteId: 4, estado: null, pagina: 2, limite: 5 });
  });

  test('el médico lista por medicoId', async () => {
    const { servicio, turnoRepo } = crearMocks();
    await servicio.listarTurnos(medico, { estado: 'PENDIENTE' });
    expect(turnoRepo.listar).toHaveBeenCalledWith({ medicoId: 1, estado: 'PENDIENTE', pagina: 1, limite: 10 });
  });

  test('estado inválido en el filtro -> ErrorValidacion', async () => {
    const { servicio } = crearMocks();
    await expect(servicio.listarTurnos(paciente, { estado: 'XX' })).rejects.toThrow(ErrorValidacion);
  });
});

describe('TurnoServicio.reprogramarTurno', () => {
  test('reprograma un turno PENDIENTE a un horario libre', async () => {
    const { servicio, turnoRepo } = crearMocks();
    turnoRepo.buscarPorId.mockResolvedValue(
      new Turno({ id: 10, pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z' })
    );

    const turno = await servicio.reprogramarTurno(paciente, 10, { fechaHora: '2030-01-11T15:00:00Z' });

    expect(turno.fechaHora.toISOString()).toBe('2030-01-11T15:00:00.000Z');
    expect(turnoRepo.reprogramar).toHaveBeenCalledTimes(1);
  });

  test('al reprogramar, el propio turno no cuenta como superposición', async () => {
    const { servicio, turnoRepo } = crearMocks();
    const original = new Turno({ id: 10, pacienteId: 4, medicoId: 1, fechaHora: '2030-01-10T13:00:00Z' });
    turnoRepo.buscarPorId.mockResolvedValue(original);
    turnoRepo.buscarPorMedico.mockResolvedValue([original]);

    await expect(
      servicio.reprogramarTurno(paciente, 10, { fechaHora: '2030-01-10T13:15:00Z' })
    ).resolves.toBeInstanceOf(Turno);
  });
});
