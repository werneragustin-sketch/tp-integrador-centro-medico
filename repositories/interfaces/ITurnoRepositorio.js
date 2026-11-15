/**
 * "Interfaz" del repositorio de turnos. JavaScript no tiene interfaces, así que se
 * modela como clase abstracta cuyos métodos fallan si la implementación no los redefine.
 *
 * TurnoServicio depende de ESTA abstracción y no de SQL Server (principio DIP):
 * en producción recibe SqlTurnoRepositorio, en los tests un mock o un repo en memoria.
 */
class ITurnoRepositorio {
  constructor() {
    if (new.target === ITurnoRepositorio) {
      throw new TypeError('ITurnoRepositorio es una interfaz');
    }
  }

  /** @returns {Promise<import('../../models/Turno').Turno>} el turno creado, con id */
  async guardarTurno(_turno) {
    throw new Error('guardarTurno no implementado');
  }

  /** @returns {Promise<import('../../models/Turno').Turno | null>} */
  async buscarPorId(_id) {
    throw new Error('buscarPorId no implementado');
  }

  /**
   * Turnos ACTIVOS del médico que caen dentro del rango [desde, hasta).
   * @returns {Promise<import('../../models/Turno').Turno[]>}
   */
  async buscarPorMedico(_medicoId, _rango) {
    throw new Error('buscarPorMedico no implementado');
  }

  /** @returns {Promise<{ items: import('../../models/Turno').Turno[], total: number }>} */
  async listar(_filtro) {
    throw new Error('listar no implementado');
  }

  /**
   * Persiste el nuevo estado solo si en la base sigue en estadoAnterior
   * (control de concurrencia optimista).
   * @returns {Promise<boolean>} false si otro usuario lo modificó antes
   */
  async actualizarEstado(_turno, _estadoAnterior) {
    throw new Error('actualizarEstado no implementado');
  }

  /** @returns {Promise<import('../../models/Turno').Turno>} */
  async reprogramar(_turno) {
    throw new Error('reprogramar no implementado');
  }
}

module.exports = { ITurnoRepositorio };
