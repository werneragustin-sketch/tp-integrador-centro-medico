const { IMetricaRepositorio } = require('../interfaces/IMetricaRepositorio');
const { MetricaModelo, AlertaModelo } = require('./esquemas');

function limpiar({ _id, ...documento }) {
  return documento;
}

/**
 * Implementación de IMetricaRepositorio sobre MongoDB.
 *
 * Patrón Singleton: hay una sola instancia en toda la aplicación (comparte la
 * conexión de mongoose). El constructor queda bloqueado; se obtiene con getInstancia().
 */
class MongoMetricaRepositorio extends IMetricaRepositorio {
  static #instancia = null;
  static #creandoInstancia = false;

  constructor() {
    if (!MongoMetricaRepositorio.#creandoInstancia) {
      throw new Error('MongoMetricaRepositorio es Singleton: usar MongoMetricaRepositorio.getInstancia()');
    }
    super();
  }

  static getInstancia() {
    if (!MongoMetricaRepositorio.#instancia) {
      MongoMetricaRepositorio.#creandoInstancia = true;
      MongoMetricaRepositorio.#instancia = new MongoMetricaRepositorio();
      MongoMetricaRepositorio.#creandoInstancia = false;
    }
    return MongoMetricaRepositorio.#instancia;
  }

  /** Crea las colecciones (la de métricas como time series) e índices si no existen. */
  async inicializar() {
    await Promise.all([MetricaModelo.init(), AlertaModelo.init()]);
  }

  async registrarMetrica(metrica) {
    await MetricaModelo.create(metrica.toJSON());
  }

  async listarPorPaciente(pacienteId, { pagina = 1, limite = 10 }) {
    const filtro = { pacienteId: Number(pacienteId) };
    const [items, total] = await Promise.all([
      MetricaModelo.find(filtro)
        .sort({ timestamp: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
      MetricaModelo.countDocuments(filtro),
    ]);
    return { items: items.map(limpiar), total };
  }

  async registrarAlerta(alerta) {
    await AlertaModelo.create(alerta.toJSON());
  }

  async listarAlertas({ pacienteId = null, pagina = 1, limite = 10 }) {
    const filtro = pacienteId ? { pacienteId: Number(pacienteId) } : {};
    const [items, total] = await Promise.all([
      AlertaModelo.find(filtro)
        .sort({ creadaEn: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
      AlertaModelo.countDocuments(filtro),
    ]);
    return { items: items.map(({ _id, ...a }) => ({ id: String(_id), ...a })), total };
  }
}

module.exports = { MongoMetricaRepositorio };
