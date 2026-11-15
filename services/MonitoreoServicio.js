const { MetricaIoT } = require('../models/MetricaIoT');
const { ErrorProhibido } = require('../models/errores');
const { aEnteroPositivo } = require('../models/validaciones');

/**
 * Recibe las métricas de los dispositivos IoT, las guarda en la base documental
 * y evalúa las reglas de alerta. Tiene tres dependencias inyectadas:
 * el repositorio (dónde guardar), el notificador (a quién avisar) y las reglas (qué evaluar).
 */
class MonitoreoServicio {
  /**
   * @param {import('../repositories/interfaces/IMetricaRepositorio').IMetricaRepositorio} metricaRepositorio
   * @param {import('../notificadores/INotificador').INotificador} notificador
   * @param {import('../models/reglas/ReglaAlerta').ReglaAlerta[]} reglas
   */
  constructor(metricaRepositorio, notificador, reglas = []) {
    this.metricaRepositorio = metricaRepositorio;
    this.notificador = notificador;
    this.reglas = reglas;
  }

  async evaluarMetrica(datos) {
    const metrica = new MetricaIoT(datos); // valida formato y rangos
    await this.metricaRepositorio.registrarMetrica(metrica);

    const alertas = this.reglas.map((regla) => regla.evaluar(metrica)).filter(Boolean);
    for (const alerta of alertas) {
      await this.metricaRepositorio.registrarAlerta(alerta);
      this.notificador.notificarAlerta(alerta);
    }
    return { metrica, alertas };
  }

  async listarMetricas(usuario, pacienteId, paginacion) {
    const id = aEnteroPositivo(pacienteId, 'pacienteId');
    if (!usuario.puedeVerMetricasDe(id)) {
      throw new ErrorProhibido('No puede ver las métricas de otro paciente');
    }
    return this.metricaRepositorio.listarPorPaciente(id, paginacion);
  }

  async listarAlertas(usuario, { pacienteId = null, pagina = 1, limite = 10 } = {}) {
    if (!usuario.puedeVerAlertas()) {
      throw new ErrorProhibido('Solo los médicos pueden ver las alertas');
    }
    const id = pacienteId ? aEnteroPositivo(pacienteId, 'pacienteId') : null;
    return this.metricaRepositorio.listarAlertas({ pacienteId: id, pagina, limite });
  }
}

module.exports = { MonitoreoServicio };
