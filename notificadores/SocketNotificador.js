const { INotificador } = require('./INotificador');

const SALA_MEDICOS = 'medicos';

/** Envía las alertas por WebSocket (Socket.IO) a todos los médicos conectados. */
class SocketNotificador extends INotificador {
  /** @param {import('socket.io').Server} io */
  constructor(io) {
    super();
    this.io = io;
  }

  notificarAlerta(alerta) {
    this.io.to(SALA_MEDICOS).emit('alerta', alerta.toJSON());
  }
}

module.exports = { SocketNotificador, SALA_MEDICOS };
