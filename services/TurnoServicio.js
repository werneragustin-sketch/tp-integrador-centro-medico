const { Turno, EstadoTurno } = require('../models/Turno');
const { aEnteroPositivo } = require('../models/validaciones');
const {
  ErrorValidacion,
  ErrorProhibido,
  ErrorNoEncontrado,
  ErrorConflicto,
} = require('../models/errores');

/**
 * Lógica de negocio de turnos. No sabe nada de SQL Server ni de HTTP:
 * recibe sus dependencias por constructor (inyección de dependencias).
 */
class TurnoServicio {
  /**
   * @param {import('../repositories/interfaces/ITurnoRepositorio').ITurnoRepositorio} turnoRepositorio
   * @param {import('../repositories/interfaces/IUsuarioRepositorio').IUsuarioRepositorio} usuarioRepositorio
   * @param {() => Date} reloj se inyecta para poder testear fechas sin depender de "ahora"
   */
  constructor(turnoRepositorio, usuarioRepositorio, reloj = () => new Date()) {
    this.turnoRepositorio = turnoRepositorio;
    this.usuarioRepositorio = usuarioRepositorio;
    this.reloj = reloj;
  }

  async programarTurno(usuario, { medicoId, fechaHora, motivo = null }) {
    if (!usuario.puedeSolicitarTurnos()) {
      throw new ErrorProhibido('Solo los pacientes pueden solicitar turnos');
    }
    const turno = new Turno({ pacienteId: usuario.id, medicoId, fechaHora, motivo });
    this.#validarFechaFutura(turno);

    const medico = await this.usuarioRepositorio.buscarMedicoPorId(turno.medicoId);
    if (!medico) {
      throw new ErrorNoEncontrado(`No existe un médico activo con id ${turno.medicoId}`);
    }
    await this.#validarDisponibilidad(turno);
    return this.turnoRepositorio.guardarTurno(turno);
  }

  async listarTurnos(usuario, { estado = null, pagina = 1, limite = 10 } = {}) {
    if (estado && !Object.values(EstadoTurno).includes(estado)) {
      throw new ErrorValidacion(`estado debe ser uno de: ${Object.values(EstadoTurno).join(', ')}`);
    }
    // Polimorfismo: el paciente filtra por sus turnos, el médico por su agenda.
    return this.turnoRepositorio.listar({ ...usuario.filtroDeTurnos(), estado, pagina, limite });
  }

  async obtenerTurno(usuario, id) {
    const turno = await this.turnoRepositorio.buscarPorId(aEnteroPositivo(id, 'id'));
    if (!turno) {
      throw new ErrorNoEncontrado(`No existe el turno ${id}`);
    }
    if (!usuario.puedeVerTurno(turno)) {
      throw new ErrorProhibido('El turno no le pertenece');
    }
    return turno;
  }

  async cambiarEstado(usuario, id, nuevoEstado) {
    const turno = await this.obtenerTurno(usuario, id);
    if (!usuario.puedeCambiarEstado(turno, nuevoEstado)) {
      throw new ErrorProhibido(`Un ${usuario.rol} no puede pasar el turno a ${nuevoEstado}`);
    }
    const estadoAnterior = turno.estado;
    turno.cambiarEstado(nuevoEstado); // valida la transición de la máquina de estados

    const actualizado = await this.turnoRepositorio.actualizarEstado(turno, estadoAnterior);
    if (!actualizado) {
      throw new ErrorConflicto('El turno fue modificado por otro usuario. Volvé a consultarlo.');
    }
    return turno;
  }

  cancelarTurno(usuario, id) {
    return this.cambiarEstado(usuario, id, EstadoTurno.CANCELADO);
  }

  async reprogramarTurno(usuario, id, { fechaHora }) {
    const turno = await this.obtenerTurno(usuario, id);
    if (!usuario.puedeReprogramar(turno)) {
      throw new ErrorProhibido('Solo el paciente puede reprogramar su turno');
    }
    turno.reprogramar(fechaHora);
    this.#validarFechaFutura(turno);
    await this.#validarDisponibilidad(turno);
    return this.turnoRepositorio.reprogramar(turno);
  }

  #validarFechaFutura(turno) {
    if (!turno.esFuturo(this.reloj())) {
      throw new ErrorValidacion('La fecha del turno debe ser futura');
    }
  }

  /** Regla de negocio: un médico no puede tener dos turnos activos superpuestos. */
  async #validarDisponibilidad(turno) {
    const existentes = await this.turnoRepositorio.buscarPorMedico(turno.medicoId, {
      desde: turno.fechaHora,
      hasta: turno.fechaFin,
    });
    const superpuesto = existentes.find(
      (otro) => otro.id !== turno.id && otro.estaActivo() && otro.seSuperponeCon(turno)
    );
    if (superpuesto) {
      throw new ErrorConflicto(
        `El médico ya tiene un turno ${superpuesto.estado} a las ${superpuesto.fechaHora.toISOString()}`
      );
    }
  }
}

module.exports = { TurnoServicio };
