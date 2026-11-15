const mongoose = require('mongoose');

/**
 * Colección de series de tiempo (MongoDB >= 5): pensada para muchas inserciones
 * chicas y consultas por rango de fechas, que es justo el patrón de los dispositivos IoT.
 */
const metricaSchema = new mongoose.Schema(
  {
    pacienteId: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    frecuenciaCardiaca: { type: Number, required: true },
    presionArterial: { type: String, required: true },
    dispositivoId: { type: String, default: null },
  },
  {
    collection: 'metricas',
    versionKey: false,
    timeseries: {
      timeField: 'timestamp',
      metaField: 'pacienteId',
      granularity: 'seconds',
    },
  }
);

const alertaSchema = new mongoose.Schema(
  {
    pacienteId: { type: Number, required: true, index: true },
    tipo: { type: String, required: true },
    nivel: { type: String, required: true, enum: ['ADVERTENCIA', 'CRITICA'] },
    mensaje: { type: String, required: true },
    valor: { type: String },
    metricaTimestamp: { type: Date, required: true },
    creadaEn: { type: Date, required: true, index: true },
  },
  { collection: 'alertas', versionKey: false }
);

const MetricaModelo = mongoose.models.Metrica || mongoose.model('Metrica', metricaSchema);
const AlertaModelo = mongoose.models.Alerta || mongoose.model('Alerta', alertaSchema);

module.exports = { MetricaModelo, AlertaModelo };
