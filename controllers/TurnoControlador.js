class TurnoControlador {
  /** @param {import('../services/TurnoServicio').TurnoServicio} turnoServicio */
  constructor(turnoServicio) {
    this.turnoServicio = turnoServicio;
  }

  // GET /api/turnos?estado=PENDIENTE&pagina=1&limite=10
  listar = async (req, res) => {
    const resultado = await this.turnoServicio.listarTurnos(req.usuario, {
      estado: req.query.estado || null,
      ...req.paginacion,
    });
    res.paginado(resultado);
  };

  // GET /api/turnos/:id
  obtener = async (req, res) => {
    const turno = await this.turnoServicio.obtenerTurno(req.usuario, req.params.id);
    res.status(200).json(turno);
  };

  // POST /api/turnos
  crearTurnoHTTP = async (req, res) => {
    const turno = await this.turnoServicio.programarTurno(req.usuario, req.body || {});
    res.status(201).location(`/api/turnos/${turno.id}`).json(turno);
  };

  // PUT /api/turnos/:id   (reprogramar: reemplaza la fecha/hora)
  reprogramar = async (req, res) => {
    const turno = await this.turnoServicio.reprogramarTurno(req.usuario, req.params.id, req.body || {});
    res.status(200).json(turno);
  };

  // PATCH /api/turnos/:id/estado   { "estado": "CONFIRMADO" | "RECHAZADO" | "CANCELADO" }
  cambiarEstado = async (req, res) => {
    const turno = await this.turnoServicio.cambiarEstado(req.usuario, req.params.id, req.body?.estado);
    res.status(200).json(turno);
  };

  // DELETE /api/turnos/:id   (baja lógica: el turno queda CANCELADO, no se borra la fila)
  cancelar = async (req, res) => {
    const turno = await this.turnoServicio.cancelarTurno(req.usuario, req.params.id);
    res.status(200).json(turno);
  };
}

module.exports = { TurnoControlador };
