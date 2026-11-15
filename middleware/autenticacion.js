const { UsuarioFactory } = require('../models/UsuarioFactory');
const { ErrorNoAutenticado, ErrorProhibido } = require('../models/errores');

/**
 * Middleware para ENDPOINTS PRIVADOS: exige "Authorization: Bearer <token>".
 * Si el token es válido deja en req.usuario un Paciente o un Medico (objeto de dominio).
 * Se crea con una fábrica para inyectarle el AuthServicio.
 */
function crearAutenticacion(authServicio) {
  return function autenticar(req, _res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return next(new ErrorNoAutenticado('Falta el header Authorization: Bearer <token>'));
    }
    try {
      const payload = authServicio.verificarToken(token);
      req.usuario = UsuarioFactory.desdeToken(payload);
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/** Restringe un endpoint privado a ciertos roles. Uso: autorizar('MEDICO'). */
function autorizar(...roles) {
  return function verificarRol(req, _res, next) {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorProhibido(`Endpoint solo para: ${roles.join(', ')}`));
    }
    return next();
  };
}

module.exports = { crearAutenticacion, autorizar };
