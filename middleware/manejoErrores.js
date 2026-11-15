const { ErrorDeDominio, ErrorNoEncontrado } = require('../models/errores');

function rutaNoEncontrada(req, _res, next) {
  next(new ErrorNoEncontrado(`No existe el endpoint ${req.method} ${req.originalUrl}`));
}

/** Traduce cualquier error a una respuesta JSON con el código HTTP correcto. */
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, _req, res, _next) {
  if (err instanceof ErrorDeDominio) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error('[error no controlado]', err);
  return res.status(500).json({ error: 'Error interno. Intente más tarde.' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
