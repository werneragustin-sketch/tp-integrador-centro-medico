const sql = require('mssql');
const { IUsuarioRepositorio } = require('../interfaces/IUsuarioRepositorio');
const { UsuarioFactory } = require('../../models/UsuarioFactory');
const { traducirErrorSql } = require('./erroresSql');

const SELECT_USUARIO = `
  SELECT u.ID_Usuario     AS id,
         u.Nombre         AS nombre,
         u.Email          AS email,
         u.PasswordHash   AS passwordHash,
         u.Rol            AS rol,
         u.Activo         AS activo,
         p.ObraSocial     AS obraSocial,
         p.HistorialClinico AS historialClinico,
         m.Especialidad   AS especialidad,
         m.Matricula      AS matricula
  FROM dbo.Usuarios u
  LEFT JOIN dbo.Pacientes p ON p.ID_Paciente = u.ID_Usuario
  LEFT JOIN dbo.Medicos   m ON m.ID_Medico   = u.ID_Usuario`;

function aUsuario(fila) {
  return fila ? UsuarioFactory.crear(fila) : null;
}

/** Implementación concreta de IUsuarioRepositorio sobre SQL Server. */
class SqlUsuarioRepositorio extends IUsuarioRepositorio {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async buscarPorEmail(email) {
    const resultado = await this.pool
      .request()
      .input('Email', sql.VarChar(150), email)
      .query(`${SELECT_USUARIO} WHERE u.Email = @Email`);
    return aUsuario(resultado.recordset[0]);
  }

  async buscarPorId(id) {
    const resultado = await this.pool
      .request()
      .input('Id', sql.Int, id)
      .query(`${SELECT_USUARIO} WHERE u.ID_Usuario = @Id`);
    return aUsuario(resultado.recordset[0]);
  }

  /** Alta de Usuario + Paciente en una sola transacción (procedimiento almacenado). */
  async crearPaciente({ nombre, email, passwordHash, obraSocial = null }) {
    try {
      const resultado = await this.pool
        .request()
        .input('Nombre', sql.NVarChar(100), nombre)
        .input('Email', sql.VarChar(150), email)
        .input('PasswordHash', sql.VarChar(100), passwordHash)
        .input('ObraSocial', sql.NVarChar(100), obraSocial)
        .execute('dbo.sp_Paciente_Registrar');
      return aUsuario(resultado.recordset[0]);
    } catch (err) {
      throw traducirErrorSql(err);
    }
  }

  async buscarMedicoPorId(id) {
    const resultado = await this.pool
      .request()
      .input('Id', sql.Int, id)
      .query(`${SELECT_USUARIO} WHERE u.ID_Usuario = @Id AND u.Rol = 'MEDICO' AND u.Activo = 1`);
    return aUsuario(resultado.recordset[0]);
  }

  async listarMedicos({ especialidad = null, pagina = 1, limite = 10 }) {
    const resultado = await this.pool
      .request()
      .input('Especialidad', sql.NVarChar(100), especialidad)
      .input('Offset', sql.Int, (pagina - 1) * limite)
      .input('Limite', sql.Int, limite)
      .query(`
        ${SELECT_USUARIO.replace('SELECT', 'SELECT COUNT(*) OVER () AS total,')}
        WHERE u.Rol = 'MEDICO' AND u.Activo = 1
          AND (@Especialidad IS NULL OR m.Especialidad = @Especialidad)
        ORDER BY u.Nombre
        OFFSET @Offset ROWS FETCH NEXT @Limite ROWS ONLY`);
    const filas = resultado.recordset;
    return {
      items: filas.map(({ total, ...fila }) => aUsuario(fila)),
      // Si la página pedida está vacía no hay filas de donde leer el total: se cuenta aparte.
      total: filas.length ? filas[0].total : await this.#contarMedicos(especialidad),
    };
  }

  async #contarMedicos(especialidad) {
    const resultado = await this.pool
      .request()
      .input('Especialidad', sql.NVarChar(100), especialidad)
      .query(`
        SELECT COUNT(*) AS total
        FROM dbo.Usuarios u
        JOIN dbo.Medicos m ON m.ID_Medico = u.ID_Usuario
        WHERE u.Rol = 'MEDICO' AND u.Activo = 1
          AND (@Especialidad IS NULL OR m.Especialidad = @Especialidad)`);
    return resultado.recordset[0].total;
  }
}

module.exports = { SqlUsuarioRepositorio };
