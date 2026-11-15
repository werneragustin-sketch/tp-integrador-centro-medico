/** "Interfaz" del repositorio de usuarios (pacientes y médicos). */
class IUsuarioRepositorio {
  constructor() {
    if (new.target === IUsuarioRepositorio) {
      throw new TypeError('IUsuarioRepositorio es una interfaz');
    }
  }

  /** @returns {Promise<import('../../models/Usuario').Usuario | null>} incluye passwordHash */
  async buscarPorEmail(_email) {
    throw new Error('buscarPorEmail no implementado');
  }

  /** @returns {Promise<import('../../models/Usuario').Usuario | null>} */
  async buscarPorId(_id) {
    throw new Error('buscarPorId no implementado');
  }

  /** @returns {Promise<import('../../models/Paciente').Paciente>} */
  async crearPaciente(_datos) {
    throw new Error('crearPaciente no implementado');
  }

  /** @returns {Promise<import('../../models/Medico').Medico | null>} solo médicos activos */
  async buscarMedicoPorId(_id) {
    throw new Error('buscarMedicoPorId no implementado');
  }

  /** @returns {Promise<{ items: import('../../models/Medico').Medico[], total: number }>} */
  async listarMedicos(_filtro) {
    throw new Error('listarMedicos no implementado');
  }
}

module.exports = { IUsuarioRepositorio };
