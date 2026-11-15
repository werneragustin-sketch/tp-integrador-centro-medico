const sql = require('mssql');
const { ITurnoRepositorio } = require('../interfaces/ITurnoRepositorio');
const { Turno } = require('../../models/Turno');
const { traducirErrorSql } = require('./erroresSql');

const COLUMNAS = `
  t.ID_Turno    AS id,
  t.ID_Paciente AS pacienteId,
  t.ID_Medico   AS medicoId,
  t.FechaHora   AS fechaHora,
  t.DuracionMin AS duracionMin,
  t.Estado      AS estado,
  t.Motivo      AS motivo`;

function aTurno(fila) {
  return fila ? new Turno(fila) : null;
}

/** Implementación concreta de ITurnoRepositorio sobre SQL Server. */
class SqlTurnoRepositorio extends ITurnoRepositorio {
  /** @param {import('mssql').ConnectionPool} pool */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  /** Alta vía procedimiento almacenado: valida superposición dentro de una transacción. */
  async guardarTurno(turno) {
    try {
      const resultado = await this.pool
        .request()
        .input('IdPaciente', sql.Int, turno.pacienteId)
        .input('IdMedico', sql.Int, turno.medicoId)
        .input('FechaHora', sql.DateTime2(0), turno.fechaHora)
        .input('DuracionMin', sql.SmallInt, turno.duracionMin)
        .input('Motivo', sql.NVarChar(250), turno.motivo)
        .execute('dbo.sp_Turno_Crear');
      return aTurno(resultado.recordset[0]);
    } catch (err) {
      throw traducirErrorSql(err);
    }
  }

  async buscarPorId(id) {
    const resultado = await this.pool
      .request()
      .input('Id', sql.Int, id)
      .query(`SELECT ${COLUMNAS} FROM dbo.Turnos t WHERE t.ID_Turno = @Id`);
    return aTurno(resultado.recordset[0]);
  }

  async buscarPorMedico(medicoId, { desde, hasta }) {
    const resultado = await this.pool
      .request()
      .input('IdMedico', sql.Int, medicoId)
      .input('Desde', sql.DateTime2(0), desde)
      .input('Hasta', sql.DateTime2(0), hasta)
      .query(`
        SELECT ${COLUMNAS}
        FROM dbo.Turnos t
        WHERE t.ID_Medico = @IdMedico
          AND t.Estado IN ('PENDIENTE', 'CONFIRMADO')
          AND t.FechaHora < @Hasta
          AND DATEADD(MINUTE, t.DuracionMin, t.FechaHora) > @Desde
        ORDER BY t.FechaHora`);
    return resultado.recordset.map(aTurno);
  }

  async listar({ pacienteId = null, medicoId = null, estado = null, pagina = 1, limite = 10 }) {
    const resultado = await this.pool
      .request()
      .input('IdPaciente', sql.Int, pacienteId)
      .input('IdMedico', sql.Int, medicoId)
      .input('Estado', sql.VarChar(15), estado)
      .input('Offset', sql.Int, (pagina - 1) * limite)
      .input('Limite', sql.Int, limite)
      .query(`
        SELECT ${COLUMNAS}, COUNT(*) OVER () AS total
        FROM dbo.Turnos t
        WHERE (@IdPaciente IS NULL OR t.ID_Paciente = @IdPaciente)
          AND (@IdMedico   IS NULL OR t.ID_Medico   = @IdMedico)
          AND (@Estado     IS NULL OR t.Estado      = @Estado)
        ORDER BY t.FechaHora DESC
        OFFSET @Offset ROWS FETCH NEXT @Limite ROWS ONLY`);
    const filas = resultado.recordset;
    return {
      items: filas.map(({ total, ...fila }) => aTurno(fila)),
      total: filas.length ? filas[0].total : await this.#contar({ pacienteId, medicoId, estado }),
    };
  }

  async #contar({ pacienteId, medicoId, estado }) {
    const resultado = await this.pool
      .request()
      .input('IdPaciente', sql.Int, pacienteId)
      .input('IdMedico', sql.Int, medicoId)
      .input('Estado', sql.VarChar(15), estado)
      .query(`
        SELECT COUNT(*) AS total FROM dbo.Turnos t
        WHERE (@IdPaciente IS NULL OR t.ID_Paciente = @IdPaciente)
          AND (@IdMedico   IS NULL OR t.ID_Medico   = @IdMedico)
          AND (@Estado     IS NULL OR t.Estado      = @Estado)`);
    return resultado.recordset[0].total;
  }

  async actualizarEstado(turno, estadoAnterior) {
    const resultado = await this.pool
      .request()
      .input('Id', sql.Int, turno.id)
      .input('Estado', sql.VarChar(15), turno.estado)
      .input('EstadoAnterior', sql.VarChar(15), estadoAnterior)
      .query(`
        UPDATE dbo.Turnos
        SET Estado = @Estado, FechaModificacion = SYSUTCDATETIME()
        WHERE ID_Turno = @Id AND Estado = @EstadoAnterior`);
    return resultado.rowsAffected[0] === 1;
  }

  async reprogramar(turno) {
    try {
      const resultado = await this.pool
        .request()
        .input('IdTurno', sql.Int, turno.id)
        .input('FechaHora', sql.DateTime2(0), turno.fechaHora)
        .execute('dbo.sp_Turno_Reprogramar');
      return aTurno(resultado.recordset[0]);
    } catch (err) {
      throw traducirErrorSql(err);
    }
  }
}

module.exports = { SqlTurnoRepositorio };
