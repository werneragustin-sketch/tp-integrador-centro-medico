const { Server } = require('socket.io');
const { UsuarioFactory } = require('../models/UsuarioFactory');
const { SALA_MEDICOS } = require('../notificadores/SocketNotificador');

/**
 * WebSockets para alertas en tiempo real. El cliente se conecta mandando su JWT:
 *   io('http://localhost:3000', { auth: { token } })
 * Los médicos entran a la sala "medicos" y reciben el evento "alerta".
 */
function crearServidorSocket(servidorHttp, authServicio) {
  const io = new Server(servidorHttp, { cors: { origin: '*' } });

  io.use((socket, next) => {
    try {
      const payload = authServicio.verificarToken(socket.handshake.auth?.token);
      socket.data.usuario = UsuarioFactory.desdeToken(payload);
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket) => {
    const usuario = socket.data.usuario;
    if (usuario.puedeVerAlertas()) {
      socket.join(SALA_MEDICOS);
    }
    console.log(`[ws] conectado ${usuario.rol}#${usuario.id}`);
    socket.on('disconnect', () => console.log(`[ws] desconectado ${usuario.rol}#${usuario.id}`));
  });

  return io;
}

module.exports = { crearServidorSocket };
