/** "Interfaz" del repositorio de métricas IoT y alertas (base documental). */
class IMetricaRepositorio {
  constructor() {
    if (new.target === IMetricaRepositorio) {
      throw new TypeError('IMetricaRepositorio es una interfaz');
    }
  }

  async registrarMetrica(_metrica) {
    throw new Error('registrarMetrica no implementado');
  }

  /** @returns {Promise<{ items: object[], total: number }>} */
  async listarPorPaciente(_pacienteId, _paginacion) {
    throw new Error('listarPorPaciente no implementado');
  }

  async registrarAlerta(_alerta) {
    throw new Error('registrarAlerta no implementado');
  }

  /** @returns {Promise<{ items: object[], total: number }>} */
  async listarAlertas(_filtro) {
    throw new Error('listarAlertas no implementado');
  }
}

module.exports = { IMetricaRepositorio };
