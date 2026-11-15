const { ErrorValidacion } = require('./errores');

const FORMATO_PRESION = /^(\d{2,3})\/(\d{2,3})$/;

/** Lectura biométrica que envía un dispositivo IoT (reloj, tensiómetro, etc.). */
class MetricaIoT {
  constructor({ pacienteId, timestamp = new Date(), frecuenciaCardiaca, presionArterial, dispositivoId = null }) {
    const id = Number(pacienteId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErrorValidacion('pacienteId debe ser un entero positivo');
    }
    const fc = Number(frecuenciaCardiaca);
    if (!Number.isInteger(fc) || fc < 20 || fc > 250) {
      throw new ErrorValidacion('frecuenciaCardiaca debe ser un entero entre 20 y 250');
    }
    if (typeof presionArterial !== 'string' || !FORMATO_PRESION.test(presionArterial)) {
      throw new ErrorValidacion('presionArterial debe tener el formato "120/80"');
    }
    const fecha = new Date(timestamp);
    if (Number.isNaN(fecha.getTime())) {
      throw new ErrorValidacion('timestamp debe ser una fecha válida');
    }

    this.pacienteId = id;
    this.timestamp = fecha;
    this.frecuenciaCardiaca = fc;
    this.presionArterial = presionArterial;
    this.dispositivoId = dispositivoId;
  }

  get sistolica() {
    return Number(this.presionArterial.match(FORMATO_PRESION)[1]);
  }

  get diastolica() {
    return Number(this.presionArterial.match(FORMATO_PRESION)[2]);
  }

  toJSON() {
    return {
      pacienteId: this.pacienteId,
      timestamp: this.timestamp.toISOString(),
      frecuenciaCardiaca: this.frecuenciaCardiaca,
      presionArterial: this.presionArterial,
      dispositivoId: this.dispositivoId,
    };
  }
}

module.exports = { MetricaIoT };
