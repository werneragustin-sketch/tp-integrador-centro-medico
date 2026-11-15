const { Paciente } = require('./Paciente');
const { Medico } = require('./Medico');
const { ErrorValidacion } = require('./errores');

const CLASES_POR_ROL = {
  PACIENTE: Paciente,
  MEDICO: Medico,
};

/**
 * Patrón Factory: a partir del rol devuelve la subclase concreta de Usuario.
 * Lo usan los repositorios (al leer de la base) y el middleware (al leer el token).
 */
class UsuarioFactory {
  static crear(datos) {
    const Clase = CLASES_POR_ROL[datos.rol];
    if (!Clase) {
      throw new ErrorValidacion(`Rol desconocido: ${datos.rol}`);
    }
    return new Clase(datos);
  }

  /** Reconstruye el usuario con los datos mínimos que viajan en el JWT. */
  static desdeToken(payload) {
    return UsuarioFactory.crear({
      id: Number(payload.sub),
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
    });
  }
}

module.exports = { UsuarioFactory };
