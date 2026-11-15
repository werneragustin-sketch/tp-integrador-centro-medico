/**
 * Patrón Strategy: cada regla sabe evaluar una métrica y devolver una Alerta o null.
 * Para agregar una regla nueva (ej. saturación de oxígeno) se crea otra subclase y se
 * inyecta en MonitoreoServicio, sin tocar el servicio (principio abierto/cerrado).
 */
class ReglaAlerta {
  constructor() {
    if (new.target === ReglaAlerta) {
      throw new TypeError('ReglaAlerta es abstracta');
    }
  }

  /**
   * @abstract
   * @param {import('../MetricaIoT').MetricaIoT} _metrica
   * @returns {import('../Alerta').Alerta | null}
   */
  evaluar(_metrica) {
    throw new Error('evaluar debe implementarse en la subclase');
  }
}

module.exports = { ReglaAlerta };
