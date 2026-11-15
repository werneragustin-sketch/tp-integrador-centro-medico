/** Middleware propio de logging: método, ruta, status y duración de cada petición. */
function registroPeticiones(req, res, next) {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    const quien = req.usuario ? `${req.usuario.rol}#${req.usuario.id}` : 'anónimo';
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms) [${quien}]`);
  });
  next();
}

module.exports = { registroPeticiones };
