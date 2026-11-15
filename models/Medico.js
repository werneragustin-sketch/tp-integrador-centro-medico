const { Usuario } = require('./Usuario');
const { EstadoTurno } = require('./Turno');

class Medico extends Usuario {
  constructor({ especialidad = null, matricula = null, ...datosUsuario }) {
    super(datosUsuario);
    this.especialidad = especialidad;
    this.matricula = matricula;
  }

  get rol() {
    return 'MEDICO';
  }

  filtroDeTurnos() {
    return { medicoId: this.id };
  }

  puedeVerTurno(turno) {
    return turno.medicoId === this.id;
  }

  /** El médico confirma o rechaza los turnos que le asignaron. */
  puedeCambiarEstado(turno, nuevoEstado) {
    return (
      this.puedeVerTurno(turno) &&
      [EstadoTurno.CONFIRMADO, EstadoTurno.RECHAZADO].includes(nuevoEstado)
    );
  }

  puedeVerMetricasDe(_pacienteId) {
    return true;
  }

  puedeVerAlertas() {
    return true;
  }

  datosPropios() {
    return { especialidad: this.especialidad, matricula: this.matricula };
  }
}

module.exports = { Medico };
