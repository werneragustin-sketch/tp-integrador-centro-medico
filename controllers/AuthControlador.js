/**
 * Controladores: traducen HTTP <-> servicio. No tienen lógica de negocio.
 * Los métodos son arrow functions para poder pasarlos directo al router sin perder "this".
 */
class AuthControlador {
  /** @param {import('../services/AuthServicio').AuthServicio} authServicio */
  constructor(authServicio) {
    this.authServicio = authServicio;
  }

  // POST /api/auth/registro
  registrar = async (req, res) => {
    const paciente = await this.authServicio.registrarPaciente(req.body || {});
    res.status(201).json(paciente);
  };

  // POST /api/auth/login
  login = async (req, res) => {
    const { email, password } = req.body || {};
    const { token, usuario } = await this.authServicio.login(email, password);
    res.status(200).json({ token, usuario });
  };

  // GET /api/auth/perfil
  perfil = async (req, res) => {
    const usuario = await this.authServicio.obtenerPerfil(req.usuario.id);
    res.status(200).json(usuario);
  };
}

module.exports = { AuthControlador };
