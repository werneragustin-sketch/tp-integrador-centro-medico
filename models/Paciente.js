const { Usuario } = require('./Usuario');
const { EstadoTurno } = require('./Turno');

class Paciente extends Usuario {
  constructor({ obraSocial = null, historialClinico = null, ...datosUsuario }) {
    super(datosUsuario);
    this.obraSocial = obraSocial;
    this.historialClinico = historialClinico;
  }

  get rol() {
    return 'PACIENTE';
  }

  filtroDeTurnos() {
    return { pacienteId: this.id };
  }

  puedeVerTurno(turno) {
    return turno.pacienteId === this.id;
  }

  /** El paciente solo puede cancelar sus propios turnos. */
  puedeCambiarEstado(turno, nuevoEstado) {
    return this.puedeVerTurno(turno) && nuevoEstado === EstadoTurno.CANCELADO;
  }

  puedeSolicitarTurnos() {
    return true;
  }

  puedeReprogramar(turno) {
    return this.puedeVerTurno(turno);
  }

  puedeVerMetricasDe(pacienteId) {
    return Number(pacienteId) === this.id;
  }

  datosPropios() {
    return { obraSocial: this.obraSocial };
  }
}

module.exports = { Paciente };
