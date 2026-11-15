class MedicoControlador {
  /** @param {import('../services/MedicoServicio').MedicoServicio} medicoServicio */
  constructor(medicoServicio) {
    this.medicoServicio = medicoServicio;
  }

  // GET /api/medicos?especialidad=Cardiología&pagina=1&limite=10
  listar = async (req, res) => {
    const resultado = await this.medicoServicio.listarMedicos({
      especialidad: req.query.especialidad || null,
      ...req.paginacion,
    });
    res.paginado(resultado);
  };

  // GET /api/medicos/:id
  obtener = async (req, res) => {
    const medico = await this.medicoServicio.obtenerMedico(req.params.id);
    res.status(200).json(medico);
  };
}

module.exports = { MedicoControlador };
