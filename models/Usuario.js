/**
 * Clase abstracta Usuario. Paciente y Medico heredan de ella y redefinen los
 * métodos de autorización: así los servicios preguntan "¿este usuario puede...?"
 * sin hacer if/else por rol (polimorfismo).
 */
class Usuario {
  #passwordHash;

  constructor({ id = null, nombre, email, passwordHash = null, activo = true }) {
    if (new.target === Usuario) {
      throw new TypeError('Usuario es una clase abstracta: instanciar Paciente o Medico');
    }
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.activo = activo;
    this.#passwordHash = passwordHash;
  }

  get passwordHash() {
    return this.#passwordHash;
  }

  /** @abstract */
  get rol() {
    throw new Error('rol debe implementarse en la subclase');
  }

  /** @abstract Filtro que se aplica al listar turnos (cada rol ve los suyos). */
  filtroDeTurnos() {
    throw new Error('filtroDeTurnos debe implementarse en la subclase');
  }

  /** @abstract */
  puedeVerTurno(_turno) {
    throw new Error('puedeVerTurno debe implementarse en la subclase');
  }

  /** @abstract */
  puedeCambiarEstado(_turno, _nuevoEstado) {
    throw new Error('puedeCambiarEstado debe implementarse en la subclase');
  }

  puedeSolicitarTurnos() {
    return false;
  }

  puedeReprogramar(_turno) {
    return false;
  }

  puedeVerMetricasDe(_pacienteId) {
    return false;
  }

  puedeVerAlertas() {
    return false;
  }

  /** Datos propios de cada subclase para la respuesta JSON. */
  datosPropios() {
    return {};
  }

  /** Nunca se serializa el hash de la contraseña. */
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      rol: this.rol,
      ...this.datosPropios(),
    };
  }
}

module.exports = { Usuario };
