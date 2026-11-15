/**
 * Errores de dominio. Cada uno sabe qué código HTTP le corresponde, así el
 * middleware de errores traduce sin que la lógica de negocio conozca HTTP.
 */
class ErrorDeDominio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ErrorValidacion extends ErrorDeDominio {
  constructor(mensaje) {
    super(mensaje, 400);
  }
}

class ErrorNoAutenticado extends ErrorDeDominio {
  constructor(mensaje = 'No autenticado') {
    super(mensaje, 401);
  }
}

class ErrorProhibido extends ErrorDeDominio {
  constructor(mensaje = 'No tiene permisos para realizar esta acción') {
    super(mensaje, 403);
  }
}

class ErrorNoEncontrado extends ErrorDeDominio {
  constructor(mensaje = 'Recurso no encontrado') {
    super(mensaje, 404);
  }
}

class ErrorConflicto extends ErrorDeDominio {
  constructor(mensaje) {
    super(mensaje, 409);
  }
}

module.exports = {
  ErrorDeDominio,
  ErrorValidacion,
  ErrorNoAutenticado,
  ErrorProhibido,
  ErrorNoEncontrado,
  ErrorConflicto,
};
