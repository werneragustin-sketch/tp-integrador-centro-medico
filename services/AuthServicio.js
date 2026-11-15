const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ErrorValidacion, ErrorConflicto, ErrorNoAutenticado } = require('../models/errores');

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RONDAS_BCRYPT = 10;

class AuthServicio {
  /**
   * @param {import('../repositories/interfaces/IUsuarioRepositorio').IUsuarioRepositorio} usuarioRepositorio
   * @param {{ secreto: string, expiraEn?: string }} opcionesJwt
   */
  constructor(usuarioRepositorio, { secreto, expiraEn = '2h' }) {
    if (!secreto) {
      throw new Error('AuthServicio necesita un secreto para firmar los JWT');
    }
    this.usuarioRepositorio = usuarioRepositorio;
    this.secreto = secreto;
    this.expiraEn = expiraEn;
  }

  async registrarPaciente({ nombre, email, password, obraSocial = null }) {
    if (!nombre || String(nombre).trim().length < 2) {
      throw new ErrorValidacion('nombre es obligatorio');
    }
    if (!email || !FORMATO_EMAIL.test(email)) {
      throw new ErrorValidacion('email inválido');
    }
    if (!password || String(password).length < 8) {
      throw new ErrorValidacion('password debe tener al menos 8 caracteres');
    }
    const emailNormalizado = String(email).trim().toLowerCase();
    if (await this.usuarioRepositorio.buscarPorEmail(emailNormalizado)) {
      throw new ErrorConflicto('Ya existe un usuario con ese email');
    }
    // Nunca se guarda la contraseña plana: bcrypt genera un hash con "salt" aleatorio.
    const passwordHash = await bcrypt.hash(String(password), RONDAS_BCRYPT);
    return this.usuarioRepositorio.crearPaciente({
      nombre: String(nombre).trim(),
      email: emailNormalizado,
      passwordHash,
      obraSocial,
    });
  }

  async login(email, password) {
    const usuario = email ? await this.usuarioRepositorio.buscarPorEmail(String(email).trim().toLowerCase()) : null;
    const passwordOk = usuario && usuario.activo && (await bcrypt.compare(String(password ?? ''), usuario.passwordHash));
    if (!passwordOk) {
      // Mismo mensaje para "no existe" y "clave incorrecta": no se filtra qué emails existen.
      throw new ErrorNoAutenticado('Email o contraseña incorrectos');
    }
    const token = jwt.sign(
      { sub: String(usuario.id), rol: usuario.rol, nombre: usuario.nombre, email: usuario.email },
      this.secreto,
      { expiresIn: this.expiraEn }
    );
    return { token, usuario };
  }

  /** @returns {object} payload del token si es válido */
  verificarToken(token) {
    try {
      return jwt.verify(token, this.secreto);
    } catch {
      throw new ErrorNoAutenticado('Token inválido o vencido');
    }
  }
}

module.exports = { AuthServicio };
