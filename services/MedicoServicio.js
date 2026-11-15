const { ErrorNoEncontrado } = require('../models/errores');
const { aEnteroPositivo } = require('../models/validaciones');

/** Cartilla de médicos (consulta pública). */
class MedicoServicio {
  /** @param {import('../repositories/interfaces/IUsuarioRepositorio').IUsuarioRepositorio} usuarioRepositorio */
  constructor(usuarioRepositorio) {
    this.usuarioRepositorio = usuarioRepositorio;
  }

  listarMedicos({ especialidad = null, pagina = 1, limite = 10 } = {}) {
    return this.usuarioRepositorio.listarMedicos({ especialidad, pagina, limite });
  }

  async obtenerMedico(id) {
    const medico = await this.usuarioRepositorio.buscarMedicoPorId(aEnteroPositivo(id, 'id'));
    if (!medico) {
      throw new ErrorNoEncontrado(`No existe un médico activo con id ${id}`);
    }
    return medico;
  }
}

module.exports = { MedicoServicio };
