const crypto = require('crypto');
const { ErrorNoAutenticado } = require('../models/errores');

/**
 * Los dispositivos IoT no tienen usuario y contraseña: se identifican con una
 * API key en el header "x-api-key". Comparación en tiempo constante.
 */
function crearValidacionDispositivo(apiKeyEsperada) {
  const esperada = Buffer.from(String(apiKeyEsperada || ''));
  return function validarDispositivo(req, _res, next) {
    const recibida = Buffer.from(String(req.headers['x-api-key'] || ''));
    const valida =
      esperada.length > 0 &&
      recibida.length === esperada.length &&
      crypto.timingSafeEqual(recibida, esperada);
    return valida ? next() : next(new ErrorNoAutenticado('API key de dispositivo inválida'));
  };
}

module.exports = { crearValidacionDispositivo };
