const { ErrorValidacion, ErrorConflicto } = require('./errores');
const { aEnteroPositivo, aFecha } = require('./validaciones');

const EstadoTurno = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  CONFIRMADO: 'CONFIRMADO',
  RECHAZADO: 'RECHAZADO',
  CANCELADO: 'CANCELADO',
});

/**
 * Máquina de estados del turno: para cada estado, a cuáles se puede pasar.
 * RECHAZADO y CANCELADO son estados finales (ningún proceso queda inconcluso).
 */
const TRANSICIONES = Object.freeze({
  [EstadoTurno.PENDIENTE]: [EstadoTurno.CONFIRMADO, EstadoTurno.RECHAZADO, EstadoTurno.CANCELADO],
  [EstadoTurno.CONFIRMADO]: [EstadoTurno.CANCELADO],
  [EstadoTurno.RECHAZADO]: [],
  [EstadoTurno.CANCELADO]: [],
});

const DURACION_MINUTOS = 30;
const ESTADOS_ACTIVOS = [EstadoTurno.PENDIENTE, EstadoTurno.CONFIRMADO];

class Turno {
  #estado;

  constructor({
    id = null,
    pacienteId,
    medicoId,
    fechaHora,
    estado = EstadoTurno.PENDIENTE,
    duracionMin = DURACION_MINUTOS,
    motivo = null,
  }) {
    if (!Object.values(EstadoTurno).includes(estado)) {
      throw new ErrorValidacion(`Estado de turno inválido: ${estado}`);
    }
    this.id = id;
    this.pacienteId = aEnteroPositivo(pacienteId, 'pacienteId');
    this.medicoId = aEnteroPositivo(medicoId, 'medicoId');
    this.fechaHora = aFecha(fechaHora, 'fechaHora');
    this.duracionMin = duracionMin;
    this.motivo = motivo;
    this.#estado = estado;
  }

  get estado() {
    return this.#estado;
  }

  get fechaFin() {
    return new Date(this.fechaHora.getTime() + this.duracionMin * 60 * 1000);
  }

  estaActivo() {
    return ESTADOS_ACTIVOS.includes(this.#estado);
  }

  esFuturo(ahora = new Date()) {
    return this.fechaHora.getTime() > ahora.getTime();
  }

  /** Dos turnos se superponen si uno empieza antes de que termine el otro. */
  seSuperponeCon(otro) {
    return this.fechaHora < otro.fechaFin && otro.fechaHora < this.fechaFin;
  }

  puedePasarA(nuevoEstado) {
    return (TRANSICIONES[this.#estado] || []).includes(nuevoEstado);
  }

  cambiarEstado(nuevoEstado) {
    if (!Object.values(EstadoTurno).includes(nuevoEstado)) {
      throw new ErrorValidacion(`Estado de turno inválido: ${nuevoEstado}`);
    }
    if (!this.puedePasarA(nuevoEstado)) {
      throw new ErrorConflicto(
        `No se puede pasar un turno de ${this.#estado} a ${nuevoEstado}`
      );
    }
    this.#estado = nuevoEstado;
  }

  confirmarTurno() {
    this.cambiarEstado(EstadoTurno.CONFIRMADO);
  }

  rechazarTurno() {
    this.cambiarEstado(EstadoTurno.RECHAZADO);
  }

  cancelarTurno() {
    this.cambiarEstado(EstadoTurno.CANCELADO);
  }

  reprogramar(nuevaFechaHora) {
    if (this.#estado !== EstadoTurno.PENDIENTE) {
      throw new ErrorConflicto('Solo se pueden reprogramar turnos PENDIENTES');
    }
    this.fechaHora = aFecha(nuevaFechaHora, 'fechaHora');
  }

  toJSON() {
    return {
      id: this.id,
      pacienteId: this.pacienteId,
      medicoId: this.medicoId,
      fechaHora: this.fechaHora.toISOString(),
      fechaFin: this.fechaFin.toISOString(),
      duracionMin: this.duracionMin,
      estado: this.#estado,
      motivo: this.motivo,
    };
  }
}

module.exports = { Turno, EstadoTurno, TRANSICIONES, DURACION_MINUTOS };
