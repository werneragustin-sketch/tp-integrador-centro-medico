const NivelAlerta = Object.freeze({
  ADVERTENCIA: 'ADVERTENCIA',
  CRITICA: 'CRITICA',
});

/** Alerta de salud generada al evaluar una métrica IoT. */
class Alerta {
  constructor({ pacienteId, tipo, nivel, mensaje, valor, metricaTimestamp, creadaEn = new Date() }) {
    this.pacienteId = pacienteId;
    this.tipo = tipo;
    this.nivel = nivel;
    this.mensaje = mensaje;
    this.valor = valor;
    this.metricaTimestamp = new Date(metricaTimestamp);
    this.creadaEn = new Date(creadaEn);
  }

  toJSON() {
    return {
      pacienteId: this.pacienteId,
      tipo: this.tipo,
      nivel: this.nivel,
      mensaje: this.mensaje,
      valor: this.valor,
      metricaTimestamp: this.metricaTimestamp.toISOString(),
      creadaEn: this.creadaEn.toISOString(),
    };
  }
}

module.exports = { Alerta, NivelAlerta };
