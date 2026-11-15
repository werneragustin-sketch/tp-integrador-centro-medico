/** "Interfaz" para avisar alertas de salud en tiempo real. */
class INotificador {
  constructor() {
    if (new.target === INotificador) {
      throw new TypeError('INotificador es una interfaz');
    }
  }

  /** @param {import('../models/Alerta').Alerta} _alerta */
  notificarAlerta(_alerta) {
    throw new Error('notificarAlerta no implementado');
  }
}

module.exports = { INotificador };
