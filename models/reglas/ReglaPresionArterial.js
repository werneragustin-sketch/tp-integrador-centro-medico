const { ReglaAlerta } = require('./ReglaAlerta');
const { Alerta, NivelAlerta } = require('../Alerta');

class ReglaPresionArterial extends ReglaAlerta {
  constructor({ sistolicaMax = 140, diastolicaMax = 90, sistolicaCritica = 180, diastolicaCritica = 120 } = {}) {
    super();
    this.sistolicaMax = sistolicaMax;
    this.diastolicaMax = diastolicaMax;
    this.sistolicaCritica = sistolicaCritica;
    this.diastolicaCritica = diastolicaCritica;
  }

  evaluar(metrica) {
    const { sistolica, diastolica } = metrica;
    if (sistolica <= this.sistolicaMax && diastolica <= this.diastolicaMax) {
      return null;
    }
    const critica = sistolica >= this.sistolicaCritica || diastolica >= this.diastolicaCritica;
    return new Alerta({
      pacienteId: metrica.pacienteId,
      tipo: 'HIPERTENSION',
      nivel: critica ? NivelAlerta.CRITICA : NivelAlerta.ADVERTENCIA,
      mensaje: `Presión arterial ${metrica.presionArterial} por encima de ${this.sistolicaMax}/${this.diastolicaMax}`,
      valor: metrica.presionArterial,
      metricaTimestamp: metrica.timestamp,
    });
  }
}

module.exports = { ReglaPresionArterial };
