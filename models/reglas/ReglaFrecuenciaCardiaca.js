const { ReglaAlerta } = require('./ReglaAlerta');
const { Alerta, NivelAlerta } = require('../Alerta');

class ReglaFrecuenciaCardiaca extends ReglaAlerta {
  constructor({ minima = 50, maxima = 120, criticaMinima = 40, criticaMaxima = 150 } = {}) {
    super();
    this.minima = minima;
    this.maxima = maxima;
    this.criticaMinima = criticaMinima;
    this.criticaMaxima = criticaMaxima;
  }

  evaluar(metrica) {
    const fc = metrica.frecuenciaCardiaca;
    if (fc >= this.minima && fc <= this.maxima) {
      return null;
    }
    const critica = fc < this.criticaMinima || fc > this.criticaMaxima;
    const tipo = fc > this.maxima ? 'TAQUICARDIA' : 'BRADICARDIA';
    return new Alerta({
      pacienteId: metrica.pacienteId,
      tipo,
      nivel: critica ? NivelAlerta.CRITICA : NivelAlerta.ADVERTENCIA,
      mensaje: `Frecuencia cardíaca de ${fc} lpm fuera del rango normal (${this.minima}-${this.maxima})`,
      valor: String(fc),
      metricaTimestamp: metrica.timestamp,
    });
  }
}

module.exports = { ReglaFrecuenciaCardiaca };
