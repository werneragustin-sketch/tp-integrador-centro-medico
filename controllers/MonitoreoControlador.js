class MonitoreoControlador {
  /** @param {import('../services/MonitoreoServicio').MonitoreoServicio} monitoreoServicio */
  constructor(monitoreoServicio) {
    this.monitoreoServicio = monitoreoServicio;
  }

  // POST /api/metricas   (lo llama el dispositivo IoT con x-api-key)
  registrarMetrica = async (req, res) => {
    const { metrica, alertas } = await this.monitoreoServicio.evaluarMetrica(req.body || {});
    res.status(201).json({ metrica, alertasGeneradas: alertas.length, alertas });
  };

  // GET /api/pacientes/:pacienteId/metricas?pagina=1&limite=10
  listarMetricas = async (req, res) => {
    const resultado = await this.monitoreoServicio.listarMetricas(
      req.usuario,
      req.params.pacienteId,
      req.paginacion
    );
    res.paginado(resultado);
  };

  // GET /api/alertas?pacienteId=4&pagina=1&limite=10
  listarAlertas = async (req, res) => {
    const resultado = await this.monitoreoServicio.listarAlertas(req.usuario, {
      pacienteId: req.query.pacienteId || null,
      ...req.paginacion,
    });
    res.paginado(resultado);
  };
}

module.exports = { MonitoreoControlador };
